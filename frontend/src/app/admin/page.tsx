"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import MediaUploader from "@/components/admin/MediaUploader";
import { 
  ShieldCheck, 
  Package, 
  ShoppingCart, 
  Users, 
  Mail, 
  TrendingUp, 
  AlertTriangle, 
  Sparkles, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Search, 
  RefreshCw, 
  Truck, 
  ExternalLink,
  Filter,
  DollarSign,
  ChevronRight,
  Shield,
  ShieldOff,
  UserCheck,
  Banknote,
  Receipt,
  Layers,
  Shirt,
  Printer,
  Download,
  Activity,
  Copy,
  Check,
  Phone,
  MapPin,
  MessageSquare,
  Info
} from "lucide-react";

// Interfaces
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  cutoutUrl?: string | null;
  model3dUrl: string | null;
  category: string;
  subcategory: string;
  inventory: { stock: number; reservedStock?: number } | null;
}

interface OrderItem {
  id: string;
  productId: string;
  product?: { name: string; imageUrl?: string };
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

interface Order {
  id: string;
  userId: string;
  user: { id?: string; name: string; email: string };
  totalAmount: number;
  subtotal?: number;
  shippingCost?: number;
  shippingZone?: string;
  courier?: string;
  courierService?: string;
  recipientName?: string;
  phoneNumber?: string;
  fullAddress?: string;
  city?: string;
  postalCode?: string;
  courierNote?: string | null;
  status: string;
  isGuest?: boolean;
  customerEmail?: string | null;
  createdAt: string;
  snapToken: string | null;
  paymentUrl: string | null;
  items: OrderItem[];
}

interface OrderTracking {
  id: string;
  orderNumber: string;
  customerName: string;
  courier: string;
  awbNumber: string | null;
  status: string;
  updatedAt: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CUSTOMER";
  createdAt: string;
  membership?: {
    tier: string;
    points: number;
    phone: string;
  } | null;
  _count?: {
    transactions: number;
    addresses: number;
    wishlists: number;
  };
}

interface NewsletterSubscriber {
  id: string;
  email: string;
  registeredAt: string;
  isActive: boolean;
}

interface CategoryStockBreakdown {
  category: string;
  subcategory: string;
  totalStock: number;
  productCount: number;
}

interface AdminStats {
  totalRevenue: number;
  cashRevenue: number;
  offlineRevenue?: number;
  onlineRevenue: number;
  offlinePaidOrders?: number;
  onlinePaidOrders?: number;

  guestRevenue?: number;
  memberRevenue?: number;
  guestPaidOrders?: number;
  memberPaidOrders?: number;

  guestOnlineRevenue?: number;
  guestOfflineRevenue?: number;
  guestOnlinePaidOrders?: number;
  guestOfflinePaidOrders?: number;

  memberOnlineRevenue?: number;
  memberOfflineRevenue?: number;
  memberOnlinePaidOrders?: number;
  memberOfflinePaidOrders?: number;

  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
  uniquePayingCustomers: number;
  totalProducts: number;
  totalStockUnits: number;
  menStockUnits: number;
  womenStockUnits: number;
  otherStockUnits: number;
  menProductCount: number;
  womenProductCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  vfrReadyCount: number;
  categoryBreakdown?: CategoryStockBreakdown[];
  totalUsers: number;
  customerCount: number;
  adminCount: number;
  totalMembers: number;
  membershipTiers: {
    bronze: number;
    silver: number;
    gold: number;
  };
  totalSubscribers: number;
}

type AdminTab = "OVERVIEW" | "PRODUCTS" | "ORDERS" | "USERS" | "NEWSLETTER";

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("OVERVIEW");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [trackings, setTrackings] = useState<Record<string, OrderTracking>>({});
  const [users, setUsers] = useState<UserItem[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);

  // Filter States
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productStockFilter, setProductStockFilter] = useState("all");

  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderChannelFilter, setOrderChannelFilter] = useState("ALL");

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormData, setProductFormData] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    cutoutUrl: "",
    model3dUrl: "",
    category: "pria",
    subcategory: "kaos",
    stock: "0"
  });

  // Tracking Modal State
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingFormData, setTrackingFormData] = useState({
    orderNumber: "",
    customerName: "",
    courier: "JNE",
    awbNumber: "",
    status: "DIPROSES"
  });

  // Cash POS Modal State
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashCustomerName, setCashCustomerName] = useState("");
  const [cashCustomerEmail, setCashCustomerEmail] = useState("");
  const [cashItems, setCashItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: "", quantity: 1 }
  ]);
  const [cashReceivedInput, setCashReceivedInput] = useState("");
  const [isProcessingCash, setIsProcessingCash] = useState(false);
  const [cashSuccessReceipt, setCashSuccessReceipt] = useState<{
    orderId: string;
    totalAmount: number;
    cashReceived: number;
    change: number;
    items: { name: string; qty: number; price: number }[];
  } | null>(null);

  // Order Detail & Problem Diagnostic Modal State
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
  const [isSyncingMidtrans, setIsSyncingMidtrans] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Dynamic POS Calculation
  const cashTotalAmount = useMemo(() => {
    return cashItems.reduce((acc, item) => {
      const p = products.find(prod => prod.id === item.productId);
      if (!p) return acc;
      return acc + (p.price * (item.quantity || 1));
    }, 0);
  }, [cashItems, products]);

  const cashChangeAmount = useMemo(() => {
    const received = parseFloat(cashReceivedInput) || 0;
    return Math.max(0, received - cashTotalAmount);
  }, [cashReceivedInput, cashTotalAmount]);

  const handleOpenCashModal = () => {
    setCashCustomerName("");
    setCashCustomerEmail("");
    setCashItems([{ productId: products[0]?.id || "", quantity: 1 }]);
    setCashReceivedInput("");
    setCashSuccessReceipt(null);
    setIsCashModalOpen(true);
  };

  const handleAddCashItem = () => {
    const availableProduct = products.find(p => !cashItems.some(ci => ci.productId === p.id));
    setCashItems(prev => [...prev, { productId: availableProduct?.id || products[0]?.id || "", quantity: 1 }]);
  };

  const handleRemoveCashItem = (index: number) => {
    if (cashItems.length <= 1) return;
    setCashItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCashItemChange = (index: number, field: "productId" | "quantity", value: any) => {
    setCashItems(prev => {
      const updated = [...prev];
      if (field === "productId") {
        updated[index] = { ...updated[index], productId: value };
      } else {
        updated[index] = { ...updated[index], quantity: Math.max(1, parseInt(value) || 1) };
      }
      return updated;
    });
  };

  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = cashItems.filter(ci => ci.productId);
    if (validItems.length === 0) {
      alert("Silakan pilih minimal 1 produk baju.");
      return;
    }

    const received = parseFloat(cashReceivedInput) || cashTotalAmount;
    if (received < cashTotalAmount) {
      alert(`Uang tunai diterima (Rp ${received.toLocaleString("id-ID")}) kurang dari total belanja (Rp ${cashTotalAmount.toLocaleString("id-ID")})!`);
      return;
    }

    setIsProcessingCash(true);
    try {
      const res = await apiFetch("/api/transactions/cash", {
        method: "POST",
        body: JSON.stringify({
          items: validItems,
          customerName: cashCustomerName.trim() || undefined,
          customerEmail: cashCustomerEmail.trim() || undefined,
          cashReceived: received
        })
      });
      const data = await res.json();
      if (res.ok) {
        fetchStats();
        fetchOrders();
        fetchProducts();
        
        const receiptItems = validItems.map(ci => {
          const prod = products.find(p => p.id === ci.productId);
          return {
            name: prod?.name || "Produk Baju",
            qty: ci.quantity,
            price: prod?.price || 0
          };
        });

        setCashSuccessReceipt({
          orderId: data.transaction.id,
          totalAmount: data.totalAmount,
          cashReceived: data.cashReceived,
          change: data.change,
          items: receiptItems
        });
      } else {
        alert(data.error || "Gagal memproses transaksi tunai.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat memproses transaksi tunai.");
    } finally {
      setIsProcessingCash(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== "ADMIN") {
      setIsLoading(false);
      return;
    }

    fetchInitialData();
  }, [user, authLoading]);

  // Refetch when tab changes if needed
  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    if (activeTab === "PRODUCTS") fetchProducts();
    if (activeTab === "ORDERS") { fetchOrders(); fetchTrackings(); }
    if (activeTab === "USERS") fetchUsers();
    if (activeTab === "NEWSLETTER") fetchSubscribers();
    if (activeTab === "OVERVIEW") fetchStats();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchStats(),
      fetchProducts(),
      fetchOrders(),
      fetchTrackings()
    ]);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeTab === "OVERVIEW") await fetchStats();
    if (activeTab === "PRODUCTS") await fetchProducts();
    if (activeTab === "ORDERS") { await fetchOrders(); await fetchTrackings(); }
    if (activeTab === "USERS") await fetchUsers();
    if (activeTab === "NEWSLETTER") await fetchSubscribers();
    setIsRefreshing(false);
  };

  const fetchStats = async () => {
    try {
      const res = await apiFetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.overview);
        setRecentOrders(data.recentOrders || []);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiFetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await apiFetch("/api/transactions/all");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    }
  };

  const fetchTrackings = async () => {
    try {
      const res = await apiFetch("/api/transactions/tracking/all");
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, OrderTracking> = {};
        (data.trackings || []).forEach((t: OrderTracking) => {
          map[t.orderNumber] = t;
        });
        setTrackings(map);
      }
    } catch (err) {
      console.error("Failed to fetch trackings:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiFetch("/api/users/all");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const res = await apiFetch("/api/newsletter");
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data.subscribers || []);
      }
    } catch (err) {
      console.error("Failed to fetch subscribers:", err);
    }
  };

  // Product Actions
  const handleOpenProductModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setProductFormData({
        name: product.name,
        description: product.description || "",
        price: product.price.toString(),
        imageUrl: product.imageUrl,
        cutoutUrl: product.cutoutUrl || "",
        model3dUrl: product.model3dUrl || "",
        category: product.category || "pria",
        subcategory: product.subcategory || "kaos",
        stock: product.inventory?.stock.toString() || "0"
      });
    } else {
      setEditingProduct(null);
      setProductFormData({
        name: "",
        description: "",
        price: "",
        imageUrl: "",
        cutoutUrl: "",
        model3dUrl: "",
        category: "pria",
        subcategory: "kaos",
        stock: "0"
      });
    }
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";
      
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          ...productFormData,
          price: Number(productFormData.price),
          stock: Number(productFormData.stock)
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsProductModalOpen(false);
        fetchProducts();
        fetchStats();
      } else {
        alert(data.error || "Gagal menyimpan produk.");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan sistem saat menyimpan produk.");
    }
  };

  const handleProductDelete = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus produk ini?")) return;
    try {
      const res = await apiFetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        fetchProducts();
        fetchStats();
      } else {
        alert(data.error || "Gagal menghapus produk.");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat menghapus produk.");
    }
  };

  // Order Status Update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: "PAID" | "PENDING" | "FAILED") => {
    if (!window.confirm(`Ubah status transaksi menjadi ${newStatus}?`)) return;
    try {
      const res = await apiFetch(`/api/transactions/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchOrders();
        await fetchStats();
        if (selectedOrderForDetail && selectedOrderForDetail.id === orderId) {
          setSelectedOrderForDetail(prev => prev ? { ...prev, status: newStatus } : null);
        }
      } else {
        alert(data.error || "Gagal mengubah status transaksi.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mengubah status transaksi.");
    }
  };

  // Dual-Channel Midtrans Status Sync (Reconciliation)
  const handleSyncMidtrans = async (orderId: string) => {
    setIsSyncingMidtrans(true);
    try {
      const res = await apiFetch(`/api/transactions/sync/${orderId}`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Hasil Sinkronisasi Midtrans:\n${data.message || 'Status berhasil diperiksa'}`);
        await fetchOrders();
        await fetchStats();
        if (data.transaction) {
          setSelectedOrderForDetail(data.transaction);
        }
      } else {
        alert(data.error || "Gagal menyinkronkan status dengan Midtrans.");
      }
    } catch (err) {
      console.error("Sync error:", err);
      alert("Terjadi kesalahan sistem saat menghubungi gateway Midtrans.");
    } finally {
      setIsSyncingMidtrans(false);
    }
  };

  const handleCopyOrderId = (orderId: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(orderId);
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    }
  };

  // Tracking Actions
  const handleOpenTrackingModal = (order: Order) => {
    const existing = trackings[order.id];
    setTrackingFormData({
      orderNumber: order.id,
      customerName: order.recipientName || order.user?.name || "Customer",
      courier: existing?.courier || order.courier || "J&T Express",
      awbNumber: existing?.awbNumber || "",
      status: existing?.status || "DIPROSES"
    });
    setIsTrackingModalOpen(true);
  };

  const handleTrackingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/transactions/tracking", {
        method: "POST",
        body: JSON.stringify(trackingFormData)
      });
      const data = await res.json();
      if (res.ok) {
        setIsTrackingModalOpen(false);
        fetchTrackings();
        alert("Informasi resi pengiriman berhasil disimpan!");
      } else {
        alert(data.error || "Gagal menyimpan data pelacakan.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menyimpan pelacakan.");
    }
  };

  // User Role & Management Actions
  const handlePromoteUserRole = async (targetUser: UserItem) => {
    if (!window.confirm(`Promosikan ${targetUser.name} (${targetUser.email}) menjadi Administrator?\n\nPengguna ini akan memiliki hak akses penuh ke Admin Dashboard.`)) return;

    try {
      const res = await apiFetch(`/api/users/${targetUser.id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: "ADMIN" })
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
        fetchStats();
      } else {
        alert(data.error || "Gagal mengubah role pengguna.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat mempromosikan role.");
    }
  };

  const handleRemoveUserRole = async (targetUser: UserItem) => {
    if (!window.confirm(`Hapus role Admin dari ${targetUser.name} (${targetUser.email})?\n\nHak akses Administrator akan dicabut dan akun akan dikembalikan menjadi CUSTOMER biasa.`)) return;

    try {
      const res = await apiFetch(`/api/users/${targetUser.id}/role`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
        fetchStats();
      } else {
        alert(data.error || "Gagal menghapus role pengguna.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat menghapus role.");
    }
  };

  const handleDeleteUser = async (targetUser: UserItem) => {
    if (!window.confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus akun ${targetUser.name} (${targetUser.email}) secara permanen?\n\nSemua riwayat transaksi dan data terkait akun ini akan dihapus.`)) return;

    try {
      const res = await apiFetch(`/api/users/${targetUser.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
        fetchStats();
      } else {
        alert(data.error || "Gagal menghapus pengguna.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat menghapus pengguna.");
    }
  };

  // Cetak Struk Belanja Kasir (POS Thermal Printer Friendly)
  const handlePrintReceipt = (receipt: {
    orderId: string;
    totalAmount: number;
    cashReceived: number;
    change: number;
    items: { name: string; qty: number; price: number; size?: string; color?: string }[];
    date?: string;
  }) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      window.print();
      return;
    }

    const itemsHtml = receipt.items.map(it => `
      <div style="display:flex; justify-content:space-between; margin:4px 0;">
        <span>${it.name}${it.size ? ` [${it.size}]` : ''}${it.color && it.color !== 'DEFAULT' ? ` (${it.color})` : ''} x${it.qty}</span>
        <span style="font-weight:bold;">Rp ${(it.price * it.qty).toLocaleString("id-ID")}</span>
      </div>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk Pembayaran - ${receipt.orderId.substring(0, 8)}</title>
          <style>
            @media print {
              @page { margin: 5mm; size: 80mm auto; }
              body { margin: 0; }
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 280px;
              margin: 0 auto;
              padding: 10px;
              font-size: 12px;
              color: #000;
            }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .bold { font-weight: bold; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2 style="margin:0; font-size:16px;">PHYGITAL STORE</h2>
            <p style="margin:2px 0; font-size:10px;">Offline Store & Smart AR Studio</p>
            <p style="margin:2px 0; font-size:9px;">${receipt.date || new Date().toLocaleString("id-ID")}</p>
          </div>
          <div class="divider"></div>
          <div style="font-size:10px; margin-bottom:4px;">
            <div>Order: #${receipt.orderId.substring(0, 12)}</div>
            <div>Metode: TUNAI (CASH)</div>
          </div>
          <div class="divider"></div>
          ${itemsHtml}
          <div class="divider"></div>
          <div class="row bold">
            <span>TOTAL:</span>
            <span>Rp ${receipt.totalAmount.toLocaleString("id-ID")}</span>
          </div>
          <div class="row">
            <span>Diterima:</span>
            <span>Rp ${receipt.cashReceived.toLocaleString("id-ID")}</span>
          </div>
          <div class="row bold">
            <span>Kembalian:</span>
            <span>Rp ${receipt.change.toLocaleString("id-ID")}</span>
          </div>
          <div class="divider"></div>
          <div class="center" style="font-size:10px; margin-top:10px;">
            <p style="margin:0;">Terima Kasih Atas Kunjungan Anda!</p>
            <p style="margin:2px 0;">Coba Virtual Try-On di:</p>
            <p style="margin:0; font-weight:bold;">phygital.store</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export Laporan Pesanan ke CSV
  const handleExportOrdersCSV = () => {
    if (filteredOrders.length === 0) {
      alert("Tidak ada data pesanan untuk diekspor.");
      return;
    }

    const headers = [
      "ID Pesanan", 
      "Tanggal", 
      "Tipe Pembeli", 
      "Nama Pelanggan", 
      "No WhatsApp", 
      "Email", 
      "Status Pembayaran", 
      "Metode Pembayaran", 
      "Alamat / Pengambilan", 
      "Total (Rp)", 
      "Jumlah Item", 
      "Rincian Item (Size & Warna)", 
      "Kurir", 
      "No Resi"
    ];
    const rows = filteredOrders.map(o => {
      const tracking = trackings[o.id];
      const isGuestBuyer = o.isGuest || o.user?.email?.includes('guest.') || o.user?.email?.includes('walkin.');
      const itemsSummary = o.items.map(it => 
        `${it.product?.name || 'Produk'} [${it.size || 'M'}${it.color && it.color !== 'DEFAULT' ? `/${it.color}` : ''}] (${it.quantity}x)`
      ).join("; ");
      const paymentMethod = o.snapToken === "CASH" 
        ? "TUNAI (POS)" 
        : o.snapToken === "CASH_ON_PICKUP" 
        ? "KASIR (Ambil Toko)" 
        : "ONLINE (Midtrans)";
      const dateStr = new Date(o.createdAt).toLocaleString("id-ID");
      const destination = o.fullAddress ? `${o.city || ''} - ${o.fullAddress}` : "Ambil di Galeri Bojonegoro";

      return [
        `"${o.id}"`,
        `"${dateStr}"`,
        `"${isGuestBuyer ? 'GUEST / TAMU' : 'MEMBER'}"`,
        `"${o.recipientName || o.user?.name || 'Pelanggan'}"`,
        `"${o.phoneNumber || '-'}"`,
        `"${o.customerEmail || o.user?.email || '-'}"`,
        `"${o.status}"`,
        `"${paymentMethod}"`,
        `"${destination.replace(/"/g, '""')}"`,
        o.totalAmount,
        o.items.length,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        `"${o.courier || tracking?.courier || '-'}"`,
        `"${tracking?.awbNumber || '-'}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `phygital-orders-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Data Produk ke CSV
  const handleExportProductsCSV = () => {
    if (filteredProducts.length === 0) {
      alert("Tidak ada data produk untuk diekspor.");
      return;
    }

    const headers = ["ID Produk", "Nama Produk", "Kategori", "Subkategori", "Harga (Rp)", "Stok Tersedia", "Cutout AR Siap", "Model 3D"];
    const rows = filteredProducts.map(p => {
      const stock = p.inventory?.stock ?? 0;
      const hasCutout = p.cutoutUrl ? "YA" : "TIDAK";
      const has3D = p.model3dUrl ? "YA" : "TIDAK";

      return [
        `"${p.id}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        `"${p.subcategory || 'kaos'}"`,
        p.price,
        stock,
        `"${hasCutout}"`,
        `"${has3D}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `phygital-products-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Lists
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                          p.description?.toLowerCase().includes(productSearch.toLowerCase());
      const matchCategory = productCategoryFilter === "all" || p.category === productCategoryFilter;
      
      let matchStock = true;
      const stock = p.inventory?.stock ?? 0;
      if (productStockFilter === "in_stock") matchStock = stock > 5;
      else if (productStockFilter === "low_stock") matchStock = stock > 0 && stock <= 5;
      else if (productStockFilter === "out_of_stock") matchStock = stock === 0;

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, productSearch, productCategoryFilter, productStockFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const q = orderSearch.toLowerCase();
      const matchSearch = o.id.toLowerCase().includes(q) ||
                          (o.user?.name && o.user.name.toLowerCase().includes(q)) ||
                          (o.user?.email && o.user.email.toLowerCase().includes(q)) ||
                          (o.recipientName && o.recipientName.toLowerCase().includes(q)) ||
                          (o.phoneNumber && o.phoneNumber.includes(orderSearch));
      const matchStatus = orderStatusFilter === "ALL" || o.status === orderStatusFilter;

      const isGuestBuyer = o.isGuest || o.user?.email?.includes('guest.') || o.user?.email?.includes('walkin.');
      const isOfflinePayment = o.snapToken === 'CASH' || o.snapToken === 'CASH_ON_PICKUP';

      let matchChannel = true;
      if (orderChannelFilter === "ONLINE") {
        matchChannel = !isOfflinePayment;
      } else if (orderChannelFilter === "OFFLINE") {
        matchChannel = isOfflinePayment;
      } else if (orderChannelFilter === "GUEST") {
        matchChannel = isGuestBuyer;
      } else if (orderChannelFilter === "MEMBER") {
        matchChannel = !isGuestBuyer;
      }

      return matchSearch && matchStatus && matchChannel;
    });
  }, [orders, orderSearch, orderStatusFilter, orderChannelFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [users, userSearch, userRoleFilter]);

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "PAID": 
        return <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-xs font-bold"><CheckCircle size={12} /> LUNAS</span>;
      case "PENDING": 
        return <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2.5 py-0.5 rounded-full text-xs font-bold"><Clock size={12} /> MENUNGGU</span>;
      case "FAILED": 
      case "EXPIRED": 
      case "CANCELLED": 
        return <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-bold"><XCircle size={12} /> DIBATALKAN</span>;
      default: 
        return <span className="bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const getTrackingBadge = (tracking?: OrderTracking) => {
    if (!tracking || !tracking.awbNumber) {
      return <span className="text-xs text-gray-400 font-medium">Belum ada resi</span>;
    }
    return (
      <div className="flex flex-col">
        <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
          <Truck size={12} className="text-blue-600" /> {tracking.courier} - {tracking.awbNumber}
        </span>
        <span className="text-[10px] text-blue-700 font-semibold uppercase">{tracking.status}</span>
      </div>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="py-24 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-gray-700">Memuat Admin Hub...</p>
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="py-20 flex flex-col justify-center items-center p-6 text-center">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <ShieldCheck size={48} />
        </div>
        <h1 className="text-3xl font-black mb-2 tracking-tight">Akses Khusus Administrator</h1>
        <p className="text-gray-600 max-w-md mb-8 text-sm">
          Halaman ini dilindungi oleh Role-Based Access Control (RBAC). Akun Anda saat ini memiliki role: <span className="font-bold uppercase text-black">{user?.role || "GUEST"}</span>.
        </p>
        <Link 
          href="/" 
          className="bg-black text-white px-6 py-3 rounded-md font-bold text-sm hover:bg-gray-800 transition-colors shadow"
        >
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 lg:px-8 py-8">
        
        {/* Top Title Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center shadow-md">
              <Shield size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-gray-950">Admin Command Center</h1>
                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-wider uppercase">ADMIN</span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Kelola katalog BELLSGALLERY, inventaris, transaksi, pelacakan pesanan, dan akun pengguna.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              title="Perbarui Data"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              <span>{isRefreshing ? "Menyinkronkan..." : "Perbarui Data"}</span>
            </button>
            <button 
              onClick={handleOpenCashModal}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
              title="Input Transaksi Kasir Tunai / Toko Fisik"
            >
              <Banknote size={15} />
              <span>Input Transaksi Kasir (CASH)</span>
            </button>
            <button 
              onClick={() => handleOpenProductModal()}
              className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <Plus size={15} />
              <span>Tambah Produk Baru</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-2 p-1.5 mb-8 bg-gray-100/90 rounded-xl border border-gray-200 text-sm font-bold">
          <button 
            onClick={() => setActiveTab("OVERVIEW")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
              activeTab === "OVERVIEW" 
                ? "bg-white text-black shadow-sm" 
                : "text-gray-600 hover:text-black hover:bg-white/50"
            }`}
          >
            <TrendingUp size={16} />
            <span>Overview & Analitik</span>
          </button>
          <button 
            onClick={() => setActiveTab("PRODUCTS")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
              activeTab === "PRODUCTS" 
                ? "bg-white text-black shadow-sm" 
                : "text-gray-600 hover:text-black hover:bg-white/50"
            }`}
          >
            <Package size={16} />
            <span>Katalog & Inventaris</span>
            <span className="bg-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-black">
              {products.length}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab("ORDERS")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
              activeTab === "ORDERS" 
                ? "bg-white text-black shadow-sm" 
                : "text-gray-600 hover:text-black hover:bg-white/50"
            }`}
          >
            <ShoppingCart size={16} />
            <span>Pesanan & Pengiriman</span>
            <span className="bg-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-black">
              {orders.length}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab("USERS")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
              activeTab === "USERS" 
                ? "bg-white text-black shadow-sm" 
                : "text-gray-600 hover:text-black hover:bg-white/50"
            }`}
          >
            <Users size={16} />
            <span>Pengguna & Member</span>
            <span className="bg-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-black">
              {users.length || stats?.totalUsers || 0}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab("NEWSLETTER")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
              activeTab === "NEWSLETTER" 
                ? "bg-white text-black shadow-sm" 
                : "text-gray-600 hover:text-black hover:bg-white/50"
            }`}
          >
            <Mail size={16} />
            <span>Newsletter</span>
            <span className="bg-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-black">
              {subscribers.length || stats?.totalSubscribers || 0}
            </span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === "OVERVIEW" && stats && (
          <div className="space-y-8 animate-fade-in">
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Total Revenue */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Pemasukan</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign size={18} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    Rp {stats.totalRevenue.toLocaleString("id-ID")}
                  </h3>
                  <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex flex-col gap-1 text-[11px]">
                    <div className="flex justify-between items-center text-blue-700 font-bold">
                      <span className="flex items-center gap-1">🌐 Online (Midtrans):</span>
                      <span>Rp {(stats.onlineRevenue || 0).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-700 font-bold">
                      <span className="flex items-center gap-1">🏪 Offline (Kasir):</span>
                      <span>Rp {((stats.offlineRevenue ?? stats.cashRevenue ?? 0)).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between items-center text-amber-700 font-semibold pt-1 border-t border-dashed border-gray-100">
                      <span className="flex items-center gap-1">👤 Tamu:</span>
                      <span>Rp {(stats.guestRevenue || 0).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between items-center text-indigo-700 font-semibold">
                      <span className="flex items-center gap-1">⭐ Member:</span>
                      <span>Rp {(stats.memberRevenue || 0).toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1.5 flex items-center gap-1">
                    <CheckCircle size={11} className="text-emerald-500" /> Dari {stats.paidOrders} pesanan lunas
                  </p>
                </div>
              </div>

              {/* Physical Clothing Stock Units */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Stok Baju</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Shirt size={18} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    {(stats.totalStockUnits || 0).toLocaleString("id-ID")} <span className="text-sm font-bold text-gray-500">Pcs</span>
                  </h3>
                  <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex flex-col gap-1 text-[11px] font-semibold">
                    <div className="flex justify-between items-center text-blue-800">
                      <span>👔 Pria:</span>
                      <span className="font-bold">{(stats.menStockUnits || 0).toLocaleString("id-ID")} pcs <span className="text-gray-400 font-normal">({stats.menProductCount || 0} model)</span></span>
                    </div>
                    <div className="flex justify-between items-center text-pink-700">
                      <span>👗 Wanita:</span>
                      <span className="font-bold">{(stats.womenStockUnits || 0).toLocaleString("id-ID")} pcs <span className="text-gray-400 font-normal">({stats.womenProductCount || 0} model)</span></span>
                    </div>
                  </div>
                  <div className="text-[10px] font-semibold mt-1.5 flex items-center gap-1.5">
                    {stats.lowStockCount > 0 ? (
                      <span className="text-amber-600 flex items-center gap-1">
                        <AlertTriangle size={11} /> {stats.lowStockCount} model menipis
                      </span>
                    ) : (
                      <span className="text-emerald-600">Semua model aman</span>
                    )}
                    {stats.outOfStockCount > 0 && (
                      <span className="text-red-600 font-bold">({stats.outOfStockCount} habis)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Paying Customers Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Pelanggan Pembeli</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Users size={18} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    {stats.uniquePayingCustomers || 0} <span className="text-sm font-bold text-gray-500">Pembeli</span>
                  </h3>
                  <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex flex-col gap-1 text-[11px]">
                    <div className="flex justify-between items-center text-gray-600 font-semibold">
                      <span>Total Akun:</span>
                      <span className="font-bold text-gray-900">{stats.totalUsers} User</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-500">
                      <span>Customer / Admin:</span>
                      <span>{stats.customerCount} / {stats.adminCount}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-indigo-600 font-bold mt-1.5">
                    {Math.round(((stats.uniquePayingCustomers || 0) / Math.max(stats.customerCount || 1, 1)) * 100)}% tingkat konversi pembeli aktif
                  </p>
                </div>
              </div>

              {/* Orders Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Pesanan</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ShoppingCart size={18} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    {stats.totalOrders} <span className="text-sm font-bold text-gray-500">Transaksi</span>
                  </h3>
                  <div className="flex flex-col gap-1 text-[11px] font-semibold mt-2.5 pt-2.5 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Lunas:</span>
                      <span className="font-bold text-green-700">{stats.paidOrders}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-amber-700">Menunggu:</span>
                      <span className="font-bold text-amber-700">{stats.pendingOrders}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-600">Gagal:</span>
                      <span className="font-bold text-red-600">{stats.failedOrders}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Multi-Channel & Customer Segmentation Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Channel: Online vs Offline (Kasir Galeri) */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-gray-900">Kanal Penjualan (Online vs Offline)</h4>
                        <p className="text-[11px] text-gray-500">Akumulasi transaksi Midtrans (Online) & Kasir Galeri Bojonegoro</p>
                      </div>
                    </div>
                  </div>

                  {/* Proportion Visual Bar */}
                  <div className="my-4">
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-blue-700 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                        Online: {Math.round(((stats.onlineRevenue || 0) / Math.max(stats.totalRevenue || 1, 1)) * 100)}%
                      </span>
                      <span className="text-emerald-700 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                        Offline: {Math.round(((stats.offlineRevenue ?? stats.cashRevenue ?? 0) / Math.max(stats.totalRevenue || 1, 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-500"
                        style={{ width: `${Math.round(((stats.onlineRevenue || 0) / Math.max(stats.totalRevenue || 1, 1)) * 100)}%` }}
                        title={`Online: Rp ${(stats.onlineRevenue || 0).toLocaleString("id-ID")}`}
                      />
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${Math.round(((stats.offlineRevenue ?? stats.cashRevenue ?? 0) / Math.max(stats.totalRevenue || 1, 1)) * 100)}%` }}
                        title={`Offline: Rp ${((stats.offlineRevenue ?? stats.cashRevenue ?? 0)).toLocaleString("id-ID")}`}
                      />
                    </div>
                  </div>

                  {/* Detailed Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {/* Online Box */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                      <div className="flex items-center justify-between text-xs font-bold text-blue-900 mb-1">
                        <span className="flex items-center gap-1">🌐 Online (Midtrans)</span>
                        <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-black">
                          {stats.onlinePaidOrders || 0} Lunas
                        </span>
                      </div>
                      <p className="text-lg font-black text-gray-900 mt-1">
                        Rp {(stats.onlineRevenue || 0).toLocaleString("id-ID")}
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-blue-200/60 space-y-1 text-[11px]">
                        <div className="flex justify-between text-gray-600">
                          <span>👤 Dari Tamu:</span>
                          <span className="font-bold text-gray-900">
                            Rp {(stats.guestOnlineRevenue || 0).toLocaleString("id-ID")}
                            <span className="text-gray-400 font-normal ml-1">({stats.guestOnlinePaidOrders || 0}x)</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>⭐ Dari Member:</span>
                          <span className="font-bold text-gray-900">
                            Rp {(stats.memberOnlineRevenue || 0).toLocaleString("id-ID")}
                            <span className="text-gray-400 font-normal ml-1">({stats.memberOnlinePaidOrders || 0}x)</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Offline Box */}
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-1">
                        <span className="flex items-center gap-1">🏪 Kasir Galeri (Offline)</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-black">
                          {stats.offlinePaidOrders || 0} Lunas
                        </span>
                      </div>
                      <p className="text-lg font-black text-gray-900 mt-1">
                        Rp {((stats.offlineRevenue ?? stats.cashRevenue ?? 0)).toLocaleString("id-ID")}
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-emerald-200/60 space-y-1 text-[11px]">
                        <div className="flex justify-between text-gray-600">
                          <span>👤 Tamu / Walk-in:</span>
                          <span className="font-bold text-gray-900">
                            Rp {(stats.guestOfflineRevenue || 0).toLocaleString("id-ID")}
                            <span className="text-gray-400 font-normal ml-1">({stats.guestOfflinePaidOrders || 0}x)</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>⭐ Member di Galeri:</span>
                          <span className="font-bold text-gray-900">
                            Rp {(stats.memberOfflineRevenue || 0).toLocaleString("id-ID")}
                            <span className="text-gray-400 font-normal ml-1">({stats.memberOfflinePaidOrders || 0}x)</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Segment: Guest vs Member */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Users size={18} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-gray-900">Segmentasi Pembeli (Tamu vs Member)</h4>
                        <p className="text-[11px] text-gray-500">Akumulasi pembeli checkout tanpa login vs akun member terdaftar</p>
                      </div>
                    </div>
                  </div>

                  {/* Proportion Visual Bar */}
                  <div className="my-4">
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-amber-700 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                        Tamu (Guest): {Math.round(((stats.guestRevenue || 0) / Math.max(stats.totalRevenue || 1, 1)) * 100)}%
                      </span>
                      <span className="text-indigo-700 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                        Member: {Math.round(((stats.memberRevenue || 0) / Math.max(stats.totalRevenue || 1, 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                      <div 
                        className="bg-amber-500 h-full transition-all duration-500"
                        style={{ width: `${Math.round(((stats.guestRevenue || 0) / Math.max(stats.totalRevenue || 1, 1)) * 100)}%` }}
                        title={`Tamu: Rp ${(stats.guestRevenue || 0).toLocaleString("id-ID")}`}
                      />
                      <div 
                        className="bg-indigo-600 h-full transition-all duration-500"
                        style={{ width: `${Math.round(((stats.memberRevenue || 0) / Math.max(stats.totalRevenue || 1, 1)) * 100)}%` }}
                        title={`Member: Rp ${(stats.memberRevenue || 0).toLocaleString("id-ID")}`}
                      />
                    </div>
                  </div>

                  {/* Detailed Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {/* Guest Box */}
                    <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-1">
                        <span className="flex items-center gap-1">👤 Pembeli Tamu (Guest)</span>
                        <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-black">
                          {stats.guestPaidOrders || 0} Lunas
                        </span>
                      </div>
                      <p className="text-lg font-black text-gray-900 mt-1">
                        Rp {(stats.guestRevenue || 0).toLocaleString("id-ID")}
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-amber-200/60 space-y-1 text-[11px]">
                        <div className="flex justify-between text-gray-600">
                          <span>🌐 Bayar Online:</span>
                          <span className="font-bold text-gray-900">
                            Rp {(stats.guestOnlineRevenue || 0).toLocaleString("id-ID")}
                            <span className="text-gray-400 font-normal ml-1">({stats.guestOnlinePaidOrders || 0}x)</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>💵 Bayar Cash:</span>
                          <span className="font-bold text-gray-900">
                            Rp {(stats.guestOfflineRevenue || 0).toLocaleString("id-ID")}
                            <span className="text-gray-400 font-normal ml-1">({stats.guestOfflinePaidOrders || 0}x)</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Member Box */}
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-900 mb-1">
                        <span className="flex items-center gap-1">⭐ Member Terdaftar</span>
                        <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.5 rounded font-black">
                          {stats.memberPaidOrders || 0} Lunas
                        </span>
                      </div>
                      <p className="text-lg font-black text-gray-900 mt-1">
                        Rp {(stats.memberRevenue || 0).toLocaleString("id-ID")}
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-indigo-200/60 space-y-1 text-[11px]">
                        <div className="flex justify-between text-gray-600">
                          <span>🌐 Bayar Online:</span>
                          <span className="font-bold text-gray-900">
                            Rp {(stats.memberOnlineRevenue || 0).toLocaleString("id-ID")}
                            <span className="text-gray-400 font-normal ml-1">({stats.memberOnlinePaidOrders || 0}x)</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>💵 Bayar Cash:</span>
                          <span className="font-bold text-gray-900">
                            Rp {(stats.memberOfflineRevenue || 0).toLocaleString("id-ID")}
                            <span className="text-gray-400 font-normal ml-1">({stats.memberOfflinePaidOrders || 0}x)</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Analisis Stok Berdasarkan Kategori & Subkategori */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-gray-900" />
                    <h4 className="text-base font-bold text-gray-900">Analisis Stok Baju Berdasarkan Kategori</h4>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Perbandingan volume stok fisik baju antara koleksi Pria dan Wanita beserta rincian subkategori.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-blue-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                    Pria: {(stats.menStockUnits || 0).toLocaleString("id-ID")} pcs ({Math.round(((stats.menStockUnits || 0) / Math.max(stats.totalStockUnits || 1, 1)) * 100)}%)
                  </span>
                  <span className="flex items-center gap-1.5 text-pink-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block"></span>
                    Wanita: {(stats.womenStockUnits || 0).toLocaleString("id-ID")} pcs ({Math.round(((stats.womenStockUnits || 0) / Math.max(stats.totalStockUnits || 1, 1)) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Visual Proportion Bar */}
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex mb-6 shadow-inner">
                <div 
                  className="bg-blue-600 h-full transition-all duration-500"
                  style={{ width: `${Math.round(((stats.menStockUnits || 0) / Math.max(stats.totalStockUnits || 1, 1)) * 100)}%` }}
                  title={`Pria: ${stats.menStockUnits || 0} pcs`}
                />
                <div 
                  className="bg-pink-500 h-full transition-all duration-500"
                  style={{ width: `${Math.round(((stats.womenStockUnits || 0) / Math.max(stats.totalStockUnits || 1, 1)) * 100)}%` }}
                  title={`Wanita: ${stats.womenStockUnits || 0} pcs`}
                />
              </div>

              {/* Subcategories Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(stats.categoryBreakdown && stats.categoryBreakdown.length > 0) ? (
                  stats.categoryBreakdown.map((item, idx) => {
                    const isMen = item.category.toLowerCase() === "pria";
                    return (
                      <div key={idx} className={`p-4 rounded-xl border ${isMen ? "bg-blue-50/40 border-blue-100" : "bg-pink-50/40 border-pink-100"}`}>
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className={`uppercase tracking-wider ${isMen ? "text-blue-900 font-black" : "text-pink-900 font-black"}`}>
                            {item.category} • {item.subcategory}
                          </span>
                          <span className="text-[11px] text-gray-500 font-medium">
                            {item.productCount} model
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-xl font-black text-gray-900">
                            {item.totalStock.toLocaleString("id-ID")}
                          </span>
                          <span className="text-xs font-bold text-gray-500">Pcs Fisik</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-4 text-center text-xs text-gray-400">
                    Belum ada data stok subkategori baju.
                  </div>
                )}
              </div>
            </div>

            {/* VFR & Features Banner */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-black text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-purple-400 animate-pulse" />
                  <span className="text-xs font-black tracking-widest uppercase text-purple-300">Web-AR Fitting Studio Readiness</span>
                </div>
                <h4 className="text-xl font-black">
                  {stats.vfrReadyCount} dari {stats.totalProducts} Produk Mendukung Virtual Try-On 3D
                </h4>
                <p className="text-xs text-gray-300 max-w-xl">
                  Produk yang telah dilengkapi model 3D (.glb) dapat langsung dicoba secara interaktif oleh pelanggan menggunakan AI Pose Detection melalui kamera browser.
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button 
                  onClick={() => setActiveTab("PRODUCTS")}
                  className="bg-white text-black px-4 py-2 rounded-lg font-bold text-xs hover:bg-gray-100 transition-colors"
                >
                  Kelola Model 3D
                </button>
                <Link
                  href="/try-on"
                  target="_blank"
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <span>Buka Fitting Studio</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>

            {/* Recent Orders Section */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Transaksi Terbaru</h3>
                  <p className="text-xs text-gray-500">5 pesanan terakhir yang masuk ke toko</p>
                </div>
                <button 
                  onClick={() => setActiveTab("ORDERS")}
                  className="text-xs font-bold text-black hover:underline flex items-center gap-1"
                >
                  <span>Lihat Semua Pesanan</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                      <th className="py-3 px-4 font-bold">Waktu</th>
                      <th className="py-3 px-4 font-bold">Customer</th>
                      <th className="py-3 px-4 font-bold">Item Produk</th>
                      <th className="py-3 px-4 font-bold">Total</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Diagnosa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">Belum ada transaksi</td>
                      </tr>
                    ) : (
                      recentOrders.map(o => (
                        <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 px-4 text-xs text-gray-500 font-medium">
                            {new Date(o.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-xs text-gray-900">{o.user?.name || "Customer"}</p>
                            <p className="text-[11px] text-gray-400">{o.user?.email || "-"}</p>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-600">
                            {o.items?.map((item, idx) => (
                              <div key={idx} className="truncate max-w-xs">
                                • {item.product?.name || "Produk"} <span className="text-gray-400">(x{item.quantity})</span>
                              </div>
                            ))}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-xs text-gray-900">
                            Rp {o.totalAmount.toLocaleString("id-ID")}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              {getStatusBadge(o.status)}
                              {o.snapToken === "CASH" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  💵 Tunai (POS)
                                </span>
                              ) : o.snapToken === "CASH_ON_PICKUP" ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                                  💵 Kasir (Ambil Toko)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                  🌐 Online
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button 
                              onClick={() => setSelectedOrderForDetail(o)}
                              className="px-2.5 py-1 bg-black text-white hover:bg-gray-800 rounded text-[11px] font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                              title="Diagnosa & Detail Transaksi"
                            >
                              <Activity size={12} className="text-emerald-400" />
                              <span>Detail</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: PRODUCTS MANAGEMENT */}
        {activeTab === "PRODUCTS" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header & Filter Controls */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-1 w-full md:w-auto items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Cari nama produk atau deskripsi..." 
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                
                {/* Category Dropdown Filter */}
                <select 
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="pria">Pria</option>
                  <option value="wanita">Wanita</option>
                </select>

                {/* Stock Dropdown Filter */}
                <select 
                  value={productStockFilter}
                  onChange={(e) => setProductStockFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="all">Semua Stok</option>
                  <option value="in_stock">Tersedia (&gt; 5)</option>
                  <option value="low_stock">Menipis (1 - 5)</option>
                  <option value="out_of_stock">Habis (0)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button 
                  onClick={handleExportProductsCSV}
                  className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0"
                  title="Unduh katalog produk dalam format CSV"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
                <button 
                  onClick={() => handleOpenProductModal()}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm shrink-0"
                >
                  <Plus size={15} />
                  <span>Tambah Produk</span>
                </button>
              </div>
            </div>

            {/* Product Table */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
                      <th className="py-3.5 px-4 font-bold">Produk</th>
                      <th className="py-3.5 px-4 font-bold">Kategori</th>
                      <th className="py-3.5 px-4 font-bold">Subkategori</th>
                      <th className="py-3.5 px-4 font-bold">Harga</th>
                      <th className="py-3.5 px-4 font-bold">Stok</th>
                      <th className="py-3.5 px-4 font-bold">Fitting 3D</th>
                      <th className="py-3.5 px-4 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400 text-xs">
                          Tidak ada produk yang cocok dengan pencarian / filter.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(p => {
                        const stock = p.inventory?.stock ?? 0;
                        return (
                          <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={p.imageUrl || "/window.svg"} 
                                  alt={p.name} 
                                  className="w-12 h-12 rounded-lg object-cover border border-gray-200 bg-gray-50 shrink-0" 
                                />
                                <div>
                                  <Link href={`/product/${p.id}`} target="_blank" className="font-bold text-xs text-gray-900 hover:underline flex items-center gap-1">
                                    <span>{p.name}</span>
                                    <ExternalLink size={11} className="text-gray-400" />
                                  </Link>
                                  <p className="text-[11px] text-gray-400 truncate max-w-[220px]">{p.description || "Tidak ada deskripsi"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="capitalize font-bold text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                                {p.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-medium text-gray-600 capitalize">
                              {p.subcategory || "kaos"}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-xs text-gray-900">
                              Rp {p.price.toLocaleString("id-ID")}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                stock === 0 
                                  ? "bg-red-100 text-red-700" 
                                  : stock <= 5 
                                  ? "bg-amber-100 text-amber-800" 
                                  : "bg-green-100 text-green-700"
                              }`}>
                                {stock === 0 ? "Habis (0)" : `${stock} unit`}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                {p.cutoutUrl ? (
                                  <Link 
                                    href={`/try-on?garment=${encodeURIComponent(p.imageUrl)}&cutout=${encodeURIComponent(p.cutoutUrl)}&name=${encodeURIComponent(p.name)}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                                    title="Klik untuk coba langsung di Virtual Fitting Studio"
                                  >
                                    <Sparkles size={10} />
                                    <span>Cutout AR Siap</span>
                                  </Link>
                                ) : (
                                  <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                    Foto Asli
                                  </span>
                                )}

                                {p.model3dUrl && (
                                  <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                    Model 3D (.glb)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => handleOpenProductModal(p)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Edit Produk"
                                >
                                  <Edit size={15} />
                                </button>
                                <button 
                                  onClick={() => handleProductDelete(p.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  title="Hapus Produk"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS & SHIPPING MANAGEMENT */}
        {activeTab === "ORDERS" && (
          <div className="space-y-6 animate-fade-in">
            {/* Filter Bar */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Cari ID transaksi, nama pembeli, email..." 
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter size={15} className="text-gray-400" />
                <select 
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="PAID">PAID (Lunas)</option>
                  <option value="PENDING">PENDING (Menunggu)</option>
                  <option value="FAILED">FAILED (Gagal)</option>
                </select>
                <select 
                  value={orderChannelFilter}
                  onChange={(e) => setOrderChannelFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="ALL">Semua Kanal & Tipe</option>
                  <option value="ONLINE">🌐 Online (Midtrans)</option>
                  <option value="OFFLINE">🏪 Offline (Kasir Galeri)</option>
                  <option value="GUEST">👤 Pembeli Tamu (Guest)</option>
                  <option value="MEMBER">⭐ Member Terdaftar</option>
                </select>
                <button 
                  onClick={handleExportOrdersCSV}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
                  title="Unduh data pesanan dalam format CSV/Excel"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
                      <th className="py-3.5 px-4 font-bold">ID & Waktu</th>
                      <th className="py-3.5 px-4 font-bold">Customer</th>
                      <th className="py-3.5 px-4 font-bold">Rincian Pembelian</th>
                      <th className="py-3.5 px-4 font-bold">Total</th>
                      <th className="py-3.5 px-4 font-bold">Status Bayar</th>
                      <th className="py-3.5 px-4 font-bold">Pelacakan Resi</th>
                      <th className="py-3.5 px-4 font-bold text-right">Aksi Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400 text-xs">
                          Tidak ada transaksi yang cocok.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(o => {
                        const tracking = trackings[o.id];
                        return (
                          <tr key={o.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <button
                                onClick={() => setSelectedOrderForDetail(o)}
                                className="text-left group cursor-pointer"
                                title="Klik untuk membuka Diagnosa Masalah & Rincian Pesanan"
                              >
                                <p className="font-mono text-xs font-bold text-gray-900 group-hover:text-blue-600 group-hover:underline flex items-center gap-1">
                                  <span>{o.id.substring(0, 8)}...</span>
                                  <ExternalLink size={10} className="text-gray-400 group-hover:text-blue-600" />
                                </p>
                                <p className="text-[11px] text-gray-400">
                                  {new Date(o.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </button>
                            </td>
                            <td className="py-3.5 px-4">
                              {/* Guest vs Member Badge */}
                              <div className="mb-1">
                                {o.isGuest || o.user?.email?.includes('guest.') || o.user?.email?.includes('walkin.') ? (
                                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-300">
                                    👤 TAMU (GUEST)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                                    ⭐ MEMBER
                                  </span>
                                )}
                              </div>
                              <p className="font-bold text-xs text-gray-900">{o.recipientName || o.user?.name || "Pelanggan"}</p>
                              
                              {/* WhatsApp 1-Click Link */}
                              {o.phoneNumber && o.phoneNumber !== '-' ? (
                                <a 
                                  href={`https://wa.me/${o.phoneNumber.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(`Halo Kak ${o.recipientName || ''}, kami dari Admin Bells Gallery terkait pesanan Anda #${o.id.substring(0, 8)}...`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline mt-0.5"
                                  title="Chat WhatsApp Pembeli"
                                >
                                  <span>📱 {o.phoneNumber}</span>
                                  <ExternalLink size={10} />
                                </a>
                              ) : null}

                              {/* Email info jika ada */}
                              {(o.customerEmail || (o.user?.email && !o.user.email.includes('guest.') && !o.user.email.includes('walkin.'))) && (
                                <p className="text-[10px] text-gray-500 font-medium truncate max-w-[190px]">
                                  ✉️ {o.customerEmail || o.user?.email}
                                </p>
                              )}

                              {o.fullAddress ? (
                                <p className="text-[10px] text-gray-500 truncate max-w-[200px] mt-0.5" title={`${o.fullAddress}, ${o.city || ''} ${o.postalCode || ''}`}>
                                  📍 {o.city ? `${o.city}: ` : ''}{o.fullAddress}
                                </p>
                              ) : (
                                <span className="text-[10px] text-purple-700 font-bold italic mt-0.5 block">
                                  🏬 Ambil di Galeri Bojonegoro
                                </span>
                              )}

                              {o.courierNote && (
                                <p className="text-[10px] text-amber-700 italic truncate max-w-[190px]" title={o.courierNote}>
                                  📝 Note: "{o.courierNote}"
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-gray-700">
                              {o.items?.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 flex-wrap py-0.5">
                                  <span className="font-semibold text-gray-900 truncate max-w-[130px]">{item.product?.name || "Produk"}</span>
                                  <span className="bg-black text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">
                                    {item.size || 'M'}
                                  </span>
                                  {item.color && item.color !== 'DEFAULT' && (
                                    <span className="bg-gray-100 text-gray-700 border border-gray-200 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0">
                                      {item.color}
                                    </span>
                                  )}
                                  <span className="text-gray-400 font-bold text-[11px]">(x{item.quantity})</span>
                                </div>
                              ))}
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-black text-xs text-gray-900">Rp {o.totalAmount.toLocaleString("id-ID")}</p>
                              <p className="text-[10px] text-gray-500 font-medium">
                                Ongkir: {o.shippingCost ? `Rp ${o.shippingCost.toLocaleString("id-ID")}` : 'Rp 0 (Free)'}
                              </p>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                {getStatusBadge(o.status)}
                                {o.shippingZone === 'STORE_PICKUP' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                                    🏬 Pickup Toko
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                    🚚 {o.courier || (o.shippingZone === 'JATIM' ? 'Jatim' : o.shippingZone === 'JAWA_NON_JATIM' ? 'Jawa Reg' : 'Luar Jawa')}
                                  </span>
                                )}
                                {o.snapToken === "CASH" ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                    💵 Tunai (POS)
                                  </span>
                                ) : o.snapToken === "CASH_ON_PICKUP" ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                                    💵 Kasir (Ambil Toko)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                                    🌐 Midtrans
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {getTrackingBadge(tracking)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => setSelectedOrderForDetail(o)}
                                  className="px-2 py-1 bg-black text-white hover:bg-gray-800 rounded text-[11px] font-bold transition-colors flex items-center gap-1 shadow-2xs"
                                  title="Buka Diagnosa Masalah & Rincian Pesanan Lengkap"
                                >
                                  <Activity size={12} className="text-emerald-400" />
                                  <span>Diagnosa</span>
                                </button>

                                {o.snapToken === "CASH" && (
                                  <button 
                                    onClick={() => handlePrintReceipt({
                                      orderId: o.id,
                                      totalAmount: o.totalAmount,
                                      cashReceived: o.totalAmount,
                                      change: 0,
                                      items: o.items.map(it => ({
                                        name: it.product?.name || "Produk",
                                        qty: it.quantity,
                                        price: it.price,
                                        size: it.size,
                                        color: it.color
                                      })),
                                      date: new Date(o.createdAt).toLocaleString("id-ID")
                                    })}
                                    className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-bold transition-colors flex items-center gap-1"
                                    title="Cetak Struk Fisik Thermal"
                                  >
                                    <Printer size={12} />
                                    <span>Struk</span>
                                  </button>
                                )}

                                <button 
                                  onClick={() => handleOpenTrackingModal(o)}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-bold transition-colors flex items-center gap-1"
                                  title="Kelola Nomor Resi & Kurir"
                                >
                                  <Truck size={12} />
                                  <span>Resi</span>
                                </button>

                                {o.status === "PENDING" && (
                                  <button 
                                    onClick={() => handleUpdateOrderStatus(o.id, "PAID")}
                                    className="px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-[11px] font-bold transition-colors"
                                    title="Tandai Sudah Dibayar (Manual / Offline)"
                                  >
                                    Set Lunas
                                  </button>
                                )}

                                {o.status !== "FAILED" && (
                                  <button 
                                    onClick={() => handleUpdateOrderStatus(o.id, "FAILED")}
                                    className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[11px] font-bold transition-colors"
                                    title="Batalkan Transaksi & Rollback Stok"
                                  >
                                    Batal
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: USERS & MEMBERSHIP MANAGEMENT */}
        {activeTab === "USERS" && (
          <div className="space-y-6 animate-fade-in">
            {/* Filter Bar */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Cari nama pengguna atau email..." 
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter size={15} className="text-gray-400" />
                <select 
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-xs font-bold rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="ALL">Semua Role</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="CUSTOMER">CUSTOMER</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
                      <th className="py-3.5 px-4 font-bold">Pengguna</th>
                      <th className="py-3.5 px-4 font-bold">Role</th>
                      <th className="py-3.5 px-4 font-bold">Terdaftar Pada</th>
                      <th className="py-3.5 px-4 font-bold">Membership & Poin</th>
                      <th className="py-3.5 px-4 font-bold">Transaksi</th>
                      <th className="py-3.5 px-4 font-bold text-right">Aksi & Kelola Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                          Tidak ada pengguna ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-xs text-gray-900">{u.name}</p>
                            <p className="text-[11px] text-gray-400">{u.email}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            {u.role === "ADMIN" ? (
                              <span className="inline-flex items-center gap-1 bg-black text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                <ShieldCheck size={11} className="text-red-400" /> ADMIN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                <UserCheck size={11} /> CUSTOMER
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-500">
                            {new Date(u.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                          </td>
                          <td className="py-3.5 px-4">
                            {u.membership ? (
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                  u.membership.tier === "GOLD" ? "bg-amber-100 text-amber-800" :
                                  u.membership.tier === "SILVER" ? "bg-gray-200 text-gray-800" :
                                  "bg-orange-100 text-orange-800"
                                }`}>
                                  {u.membership.tier}
                                </span>
                                <span className="text-xs font-bold text-gray-700">{u.membership.points} Pts</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Regular</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-bold text-gray-700">
                            {u._count?.transactions || 0} pesanan
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {u.id !== user?.id ? (
                              <div className="flex items-center justify-end gap-2">
                                {u.role === "ADMIN" ? (
                                  <button 
                                    onClick={() => handleRemoveUserRole(u)}
                                    title="Hapus / Cabut Hak Role Admin"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80 transition-colors shadow-2xs"
                                  >
                                    <ShieldOff size={13} className="text-amber-600" />
                                    <span>Hapus Role Admin</span>
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => handlePromoteUserRole(u)}
                                    title="Promosikan Menjadi Admin"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-800 hover:bg-black hover:text-white border border-gray-200 transition-colors shadow-2xs"
                                  >
                                    <ShieldCheck size={13} className="text-gray-600 group-hover:text-white" />
                                    <span>Jadikan Admin</span>
                                  </button>
                                )}

                                <button 
                                  onClick={() => handleDeleteUser(u)}
                                  title="Hapus Akun Pengguna Secara Permanen"
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-gray-400 italic bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200/60">
                                Akun Anda
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: NEWSLETTER SUBSCRIBERS */}
        {activeTab === "NEWSLETTER" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Pelanggan Newsletter BELLSGALLERY</h3>
                <p className="text-xs text-gray-500">Email pengunjung yang mendaftar update promo dan koleksi baru.</p>
              </div>
              <span className="text-xs font-bold bg-gray-100 px-3 py-1 rounded-full text-gray-700">
                Total: {subscribers.length} Pelanggan
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
                      <th className="py-3.5 px-4 font-bold">Email</th>
                      <th className="py-3.5 px-4 font-bold">Tanggal Berlangganan</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {subscribers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-gray-400 text-xs">
                          Belum ada subscriber terdaftar.
                        </td>
                      </tr>
                    ) : (
                      subscribers.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-xs text-gray-900">
                            {s.email}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-gray-500">
                            {new Date(s.registeredAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              AKTIF
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {/* Product Add/Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 animate-fade-in-up">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-black" />
                <h3 className="font-black text-sm tracking-tight text-gray-900">
                  {editingProduct ? "Edit Informasi Produk" : "Tambah Produk Baru"}
                </h3>
              </div>
              <button 
                onClick={() => setIsProductModalOpen(false)} 
                className="text-gray-400 hover:text-black transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Produk *</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Contoh: Kemeja Linen Santai Putih"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-black outline-none" 
                  value={productFormData.name} 
                  onChange={e => setProductFormData({...productFormData, name: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kategori Utama *</label>
                  <select 
                    value={productFormData.category}
                    onChange={e => setProductFormData({...productFormData, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-black outline-none bg-white"
                  >
                    <option value="pria">Pria</option>
                    <option value="wanita">Wanita</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Subkategori *</label>
                  <select 
                    value={productFormData.subcategory}
                    onChange={e => setProductFormData({...productFormData, subcategory: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-black outline-none bg-white"
                  >
                    <option value="kaos">Kaos (T-Shirt)</option>
                    <option value="kemeja">Kemeja & Blus</option>
                    <option value="jaket">Jaket & Outerwear</option>
                    <option value="celana">Celana & Bawahan</option>
                    <option value="dress">Dress (Wanita)</option>
                    <option value="sepatu">Sepatu & Sandal</option>
                    <option value="topi">Topi & Aksesoris</option>
                    <option value="tas">Tas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Deskripsi Produk</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-black outline-none" 
                  rows={2} 
                  placeholder="Rincian bahan, ukuran, karakteristik pakaian..."
                  value={productFormData.description} 
                  onChange={e => setProductFormData({...productFormData, description: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Harga (Rp) *</label>
                  <input 
                    required 
                    type="number" 
                    placeholder="149000"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-black outline-none" 
                    value={productFormData.price} 
                    onChange={e => setProductFormData({...productFormData, price: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Stok Tersedia *</label>
                  <input 
                    required 
                    type="number" 
                    placeholder="50"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-black outline-none" 
                    value={productFormData.stock} 
                    onChange={e => setProductFormData({...productFormData, stock: e.target.value})} 
                  />
                </div>
              </div>

              <MediaUploader
                label="Foto Produk"
                type="image"
                required
                value={productFormData.imageUrl}
                onChange={(url) => setProductFormData(prev => ({ ...prev, imageUrl: url }))}
                cutoutValue={productFormData.cutoutUrl}
                onCutoutChange={(url) => setProductFormData(prev => ({ ...prev, cutoutUrl: url }))}
                enableAutoCutout={true}
                helperText="Upload foto pakaian. AI otomatis memotong background transparan (cutout) langsung di browser Anda untuk keperluan Virtual Try-On AR."
              />

              <MediaUploader
                label="Model 3D (.glb) - Opsional untuk Web-AR"
                type="model3d"
                value={productFormData.model3dUrl}
                onChange={(url) => setProductFormData({ ...productFormData, model3dUrl: url })}
                helperText="Opsional. Jika kosong, pengunjung tetap bisa mencoba produk menggunakan Photo Try-On AI (CatVTON)."
              />

              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsProductModalOpen(false)} 
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg text-xs hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 bg-black text-white font-bold rounded-lg text-xs hover:bg-gray-800 transition-colors shadow-sm"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Tracking Modal */}
      {isTrackingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 animate-fade-in-up">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-blue-600" />
                <h3 className="font-black text-sm tracking-tight text-gray-900">Kelola Resi Pengiriman</h3>
              </div>
              <button 
                onClick={() => setIsTrackingModalOpen(false)} 
                className="text-gray-400 hover:text-black transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleTrackingSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nomor Order / ID Transaksi</label>
                <input 
                  disabled
                  type="text" 
                  className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2.5 text-xs font-mono font-bold text-gray-600" 
                  value={trackingFormData.orderNumber} 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Penerima *</label>
                <input 
                  required
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-black outline-none" 
                  value={trackingFormData.customerName} 
                  onChange={e => setTrackingFormData({...trackingFormData, customerName: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kurir Pengiriman *</label>
                  <select 
                    value={trackingFormData.courier}
                    onChange={e => setTrackingFormData({...trackingFormData, courier: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-black outline-none bg-white"
                  >
                    <option value="JNE">JNE</option>
                    <option value="J&T Express">J&T Express</option>
                    <option value="SiCepat">SiCepat</option>
                    <option value="GoSend">GoSend (Instant)</option>
                    <option value="GrabExpress">GrabExpress</option>
                    <option value="Anteraja">Anteraja</option>
                    <option value="POS Indonesia">POS Indonesia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Status Pengiriman</label>
                  <select 
                    value={trackingFormData.status}
                    onChange={e => setTrackingFormData({...trackingFormData, status: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-black outline-none bg-white"
                  >
                    <option value="DIPROSES">Diproses Toko</option>
                    <option value="DIKIRIM">Sedang Dikirim</option>
                    <option value="SELESAI">Terkirim / Selesai</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nomor Resi (AWB)</label>
                <input 
                  type="text" 
                  placeholder="Contoh: JNE8829103810"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-black outline-none" 
                  value={trackingFormData.awbNumber} 
                  onChange={e => setTrackingFormData({...trackingFormData, awbNumber: e.target.value})} 
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsTrackingModalOpen(false)} 
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg text-xs hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 bg-black text-white font-bold rounded-lg text-xs hover:bg-gray-800 transition-colors shadow-sm"
                >
                  Simpan Resi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash POS (Point of Sale) Modal */}
      {isCashModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-fade-in-up">
            
            {/* Header Modal */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Banknote size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight text-gray-900">
                    Kasir Toko Fisik (Input Transaksi Tunai / Cash)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Mencatat pembelian langsung di toko, otomatis potong stok & tambah omset.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCashModalOpen(false)} 
                className="text-gray-400 hover:text-black transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Modal Body */}
            {cashSuccessReceipt ? (
              /* Receipt Screen */
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="text-center py-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                    <CheckCircle size={28} />
                  </div>
                  <h4 className="text-lg font-black text-emerald-900">Pembayaran Tunai Berhasil!</h4>
                  <p className="text-xs text-emerald-700">Transaksi telah dicatat dan berstatus LUNAS.</p>
                </div>

                {/* Struk Rincian */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-xs space-y-3 font-mono">
                  <div className="flex justify-between text-gray-500 pb-2 border-b border-gray-200">
                    <span>ID Transaksi:</span>
                    <span className="font-bold text-gray-900">{cashSuccessReceipt.orderId.substring(0, 13)}...</span>
                  </div>

                  <div className="space-y-1.5 py-1">
                    {cashSuccessReceipt.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-gray-800">{it.name} x{it.qty}</span>
                        <span className="font-bold">Rp {(it.price * it.qty).toLocaleString("id-ID")}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-gray-200 space-y-1">
                    <div className="flex justify-between text-sm font-bold text-gray-900">
                      <span>Total Belanja:</span>
                      <span>Rp {cashSuccessReceipt.totalAmount.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Tunai Diterima:</span>
                      <span>Rp {cashSuccessReceipt.cashReceived.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-emerald-600 pt-1 border-t border-dashed border-gray-200">
                      <span>Kembalian:</span>
                      <span>Rp {cashSuccessReceipt.change.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => handlePrintReceipt(cashSuccessReceipt)} 
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Printer size={15} />
                    <span>Cetak Struk Fisik</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={handleOpenCashModal} 
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-colors"
                  >
                    Transaksi Baru
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsCashModalOpen(false)} 
                    className="flex-1 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Selesai & Tutup
                  </button>
                </div>
              </div>
            ) : (
              /* Input Form */
              <form onSubmit={handleCashSubmit} className="p-6 overflow-y-auto space-y-5">
                
                {/* Info Pelanggan (Opsional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Nama Customer (Opsional)</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Budi Santoso / Walk-in" 
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-black outline-none" 
                      value={cashCustomerName} 
                      onChange={e => setCashCustomerName(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Email Customer (Opsional)</label>
                    <input 
                      type="email" 
                      placeholder="Jika memiliki akun toko" 
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-black outline-none" 
                      value={cashCustomerEmail} 
                      onChange={e => setCashCustomerEmail(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Daftar Produk Baju yang Dibeli */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Shirt size={14} className="text-purple-600" />
                      <span>Produk Baju yang Dibeli *</span>
                    </label>
                    <button 
                      type="button" 
                      onClick={handleAddCashItem} 
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Tambah Item Baju</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {cashItems.map((item, idx) => {
                      const selectedProduct = products.find(p => p.id === item.productId);
                      const maxStock = selectedProduct?.inventory?.stock ?? 0;
                      return (
                        <div key={idx} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                          <select 
                            required
                            value={item.productId} 
                            onChange={e => handleCashItemChange(idx, "productId", e.target.value)}
                            className="flex-1 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-black outline-none"
                          >
                            <option value="">-- Pilih Baju --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id} disabled={(p.inventory?.stock ?? 0) <= 0}>
                                [{p.category.toUpperCase()}] {p.name} - Rp {p.price.toLocaleString("id-ID")} (Sisa: {p.inventory?.stock ?? 0} pcs)
                              </option>
                            ))}
                          </select>

                          <div className="flex items-center gap-1 w-24">
                            <input 
                              type="number" 
                              min="1" 
                              max={maxStock > 0 ? maxStock : 99}
                              value={item.quantity} 
                              onChange={e => handleCashItemChange(idx, "quantity", e.target.value)}
                              className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:ring-2 focus:ring-black outline-none" 
                            />
                            <span className="text-[10px] text-gray-500 font-bold">pcs</span>
                          </div>

                          <div className="text-right w-24">
                            <p className="text-xs font-black text-gray-900">
                              Rp {((selectedProduct?.price || 0) * (item.quantity || 1)).toLocaleString("id-ID")}
                            </p>
                          </div>

                          {cashItems.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => handleRemoveCashItem(idx)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ringkasan & Pembayaran Tunai */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Total Belanja:</span>
                    <span className="text-2xl font-black text-emerald-950">
                      Rp {cashTotalAmount.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      Uang Tunai Diterima (Rp) *
                    </label>
                    <input 
                      type="number" 
                      placeholder={`Contoh: ${cashTotalAmount}`}
                      value={cashReceivedInput} 
                      onChange={e => setCashReceivedInput(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-lg p-2.5 text-sm font-black text-gray-900 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />

                    {/* Shortcut Tombol Uang Cepat */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button 
                        type="button" 
                        onClick={() => setCashReceivedInput(cashTotalAmount.toString())}
                        className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold"
                      >
                        Uang Pas
                      </button>
                      {[50000, 100000, 200000, 500000].map(val => (
                        <button 
                          key={val}
                          type="button" 
                          onClick={() => setCashReceivedInput(val.toString())}
                          className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold"
                        >
                          Rp {val.toLocaleString("id-ID")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kembalian */}
                  <div className="pt-2 border-t border-emerald-200/60 flex justify-between items-center text-sm font-black">
                    <span className="text-emerald-900">Uang Kembalian:</span>
                    <span className="text-lg text-emerald-700">
                      Rp {cashChangeAmount.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="pt-2 flex gap-3 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setIsCashModalOpen(false)} 
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg text-xs hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={isProcessingCash || cashTotalAmount <= 0}
                    className="flex-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Banknote size={15} />
                    <span>{isProcessingCash ? "Memproses..." : "Selesaikan Pembayaran Tunai (LUNAS)"}</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Order Detail & Problem Diagnostic Modal */}
      {selectedOrderForDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-fade-in-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
                  <Activity size={18} className="text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm tracking-tight text-gray-900">
                      Diagnosa & Detail Transaksi
                    </h3>
                    <button
                      onClick={() => handleCopyOrderId(selectedOrderForDetail.id)}
                      className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-gray-500 hover:text-black bg-gray-200/70 hover:bg-gray-200 px-2 py-0.5 rounded transition-colors"
                      title="Salin ID Pesanan Lengkap"
                    >
                      <span>#{selectedOrderForDetail.id.substring(0, 12)}...</span>
                      {copiedOrderId ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                    </button>
                    {copiedOrderId && (
                      <span className="text-[10px] text-emerald-600 font-bold">Tersalin!</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Dibuat pada {new Date(selectedOrderForDetail.createdAt).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "medium" })}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOrderForDetail(null)} 
                className="text-gray-400 hover:text-black transition-colors"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="p-6 overflow-y-auto space-y-6">

              {/* Status & Segment Badges Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500">Status Pembayaran:</span>
                  {getStatusBadge(selectedOrderForDetail.status)}

                  <span className="text-gray-300">|</span>

                  <span className="text-[11px] font-bold text-gray-500">Kanal Transaksi:</span>
                  {selectedOrderForDetail.snapToken === "CASH" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      💵 Kasir Fisik (Tunai POS)
                    </span>
                  ) : selectedOrderForDetail.snapToken === "CASH_ON_PICKUP" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                      🏬 Kasir Fisik (Ambil di Toko Galeri)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      🌐 Pembayaran Online (Midtrans)
                    </span>
                  )}

                  <span className="text-gray-300">|</span>

                  <span className="text-[11px] font-bold text-gray-500">Tipe Pelanggan:</span>
                  {selectedOrderForDetail.isGuest || selectedOrderForDetail.user?.email?.includes('guest.') || selectedOrderForDetail.user?.email?.includes('walkin.') ? (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded border border-amber-300">
                      👤 Tamu (Checkout Tanpa Akun)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                      ⭐ Member Terdaftar
                    </span>
                  )}
                </div>
              </div>

              {/* SECTION 1: DETEKSI & DIAGNOSA MASALAH REALTIME (SMART PROBLEM DETECTOR) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Activity size={14} className="text-blue-600" />
                    <span>Diagnosa Kondisi & Panduan Tindak Lanjut</span>
                  </h4>
                  {selectedOrderForDetail.snapToken !== "CASH" && selectedOrderForDetail.snapToken !== "CASH_ON_PICKUP" && (
                    <button
                      onClick={() => handleSyncMidtrans(selectedOrderForDetail.id)}
                      disabled={isSyncingMidtrans}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1 transition-colors disabled:opacity-50"
                      title="Sinkronkan status langsung ke server Midtrans"
                    >
                      <RefreshCw size={11} className={isSyncingMidtrans ? "animate-spin" : ""} />
                      <span>{isSyncingMidtrans ? "Memeriksa Gateway..." : "Cek Status Midtrans"}</span>
                    </button>
                  )}
                </div>

                {/* Problem Condition Card 1: PENDING Online */}
                {selectedOrderForDetail.status === "PENDING" && selectedOrderForDetail.snapToken !== "CASH" && selectedOrderForDetail.snapToken !== "CASH_ON_PICKUP" && (
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5 text-xs text-amber-900">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-amber-950">Status: Menunggu Pembayaran Midtrans (Virtual Account / QRIS / GoPay / Kartu)</p>
                        <p className="text-[11px] leading-relaxed text-amber-800">
                          <strong>Kemungkinan Masalah Pelanggan:</strong>
                          <br />• Pelanggan belum menyelesaikan transfer atau scan barcode QRIS di aplikasi mobile banking.
                          <br />• Pelanggan sudah membayar tetapi menutup browser sebelum notifikasi webhook selesai diproses.
                          <br />• Virtual Account kedaluwarsa setelah 24 jam belum dibayar.
                        </p>
                        <p className="text-[11px] leading-relaxed font-semibold text-amber-950 pt-1">
                          👉 <strong>Solusi Admin:</strong> Tekan tombol <strong>"Cek Status Midtrans"</strong> di atas untuk rekonsiliasi data secara realtime ke server payment gateway. Jika pembeli melapor transfer manual ke rekening galeri, Anda dapat menekan tombol <strong>"Tandai Lunas"</strong> di bawah.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Problem Condition Card 2: PENDING Kasir Ambil di Toko */}
                {selectedOrderForDetail.status === "PENDING" && selectedOrderForDetail.snapToken === "CASH_ON_PICKUP" && (
                  <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2.5 text-xs text-purple-900">
                    <div className="flex items-start gap-2.5">
                      <Clock size={18} className="text-purple-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-purple-950">Status: Menunggu Pengambilan & Pembayaran Kasir di Galeri Bojonegoro</p>
                        <p className="text-[11px] leading-relaxed text-purple-800">
                          <strong>Kemungkinan Masalah Pelanggan:</strong>
                          <br />• Pelanggan memesan dari rumah untuk diambil di Galeri Kyabel Bojonegoro dan akan membayar di kasir galeri.
                          <br />• Pelanggan lupa membawa struk / ID transaksi saat datang ke toko.
                        </p>
                        <p className="text-[11px] leading-relaxed font-semibold text-purple-950 pt-1">
                          👉 <strong>Solusi Admin / Kasir:</strong> Cari nama pelanggan atau nomor WhatsApp di dashboard. Serahkan baju sesuai ukuran & varian di bawah, terima uang tunai/QRIS kasir, lalu klik tombol <strong>"Tandai Lunas"</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Problem Condition Card 3: PAID (Lunas) */}
                {selectedOrderForDetail.status === "PAID" && (
                  <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2.5 text-xs text-emerald-900">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-emerald-950">Status: Pembayaran Terverifikasi Lunas (PAID)</p>
                        <p className="text-[11px] leading-relaxed text-emerald-800">
                          <strong>Kondisi Transaksi:</strong>
                          <br />• Dana telah masuk dan tercatat di kas toko.
                          {selectedOrderForDetail.shippingZone === "STORE_PICKUP" ? (
                            <span><br />• Barang siap diserahkan kepada pelanggan saat tiba di Galeri Kyabel Bojonegoro.</span>
                          ) : (
                            <span>
                              <br />• Siapkan baju sesuai varian ukuran dan warna. Setelah paket diserahkan ke kurir ({selectedOrderForDetail.courier || 'Ekspedisi'}), masukkan Nomor Resi (AWB) agar pembeli dapat melacak paketnya.
                            </span>
                          )}
                        </p>
                        {selectedOrderForDetail.shippingZone !== "STORE_PICKUP" && !trackings[selectedOrderForDetail.id]?.awbNumber && (
                          <p className="text-[11px] text-emerald-950 font-bold pt-0.5">
                            👉 Resi pengiriman belum diinput. Klik tombol "Kelola Resi" di bawah untuk menginput nomor AWB.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Problem Condition Card 4: FAILED */}
                {selectedOrderForDetail.status === "FAILED" && (
                  <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl space-y-2.5 text-xs text-red-900">
                    <div className="flex items-start gap-2.5">
                      <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-red-950">Status: Transaksi Dibatalkan atau Kedaluwarsa (FAILED)</p>
                        <p className="text-[11px] leading-relaxed text-red-800">
                          <strong>Kondisi Stok Toko:</strong>
                          <br />• Transaksi ini dibatalkan atau batas waktu pembayaran habis (expired).
                          <br />• Sistem telah otomatis melakukan <strong>Rollback Stok Pakaian</strong> ke etalase toko sehingga stok barang fisik tetap sesuai dengan data digital.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: IDENTITAS PEMBELI & PENGIRIMAN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Box Kiri: Profil Pembeli & Kontak 1-Klik */}
                <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                      <Users size={14} className="text-blue-600" />
                      <span>Data Pembeli</span>
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      {selectedOrderForDetail.isGuest ? "Tamu" : "Member"}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-gray-400 text-[11px] block">Nama Penerima / Pemesan:</span>
                      <p className="font-bold text-gray-900 text-sm">
                        {selectedOrderForDetail.recipientName || selectedOrderForDetail.user?.name || "Pelanggan Toko"}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-400 text-[11px] block">WhatsApp / Telepon:</span>
                      {selectedOrderForDetail.phoneNumber && selectedOrderForDetail.phoneNumber !== '-' ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="font-bold text-gray-900">{selectedOrderForDetail.phoneNumber}</p>
                          <a 
                            href={`https://wa.me/${selectedOrderForDetail.phoneNumber.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(`Halo Kak ${selectedOrderForDetail.recipientName || ''}, kami dari Admin Bells Gallery terkait pesanan Anda #${selectedOrderForDetail.id.substring(0, 8)}...`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded transition-colors shadow-2xs"
                            title="Buka Chat WhatsApp Langsung"
                          >
                            <MessageSquare size={10} />
                            <span>Chat WhatsApp</span>
                          </a>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-[11px]">Tidak mencantumkan nomor telepon</p>
                      )}
                    </div>

                    <div>
                      <span className="text-gray-400 text-[11px] block">Email:</span>
                      {selectedOrderForDetail.customerEmail || (selectedOrderForDetail.user?.email && !selectedOrderForDetail.user.email.includes('guest.') && !selectedOrderForDetail.user.email.includes('walkin.')) ? (
                        <a 
                          href={`mailto:${selectedOrderForDetail.customerEmail || selectedOrderForDetail.user?.email}?subject=${encodeURIComponent(`Konfirmasi Pesanan #${selectedOrderForDetail.id.substring(0, 8)} - Bells Gallery`)}`}
                          className="font-medium text-blue-600 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <Mail size={11} />
                          <span>{selectedOrderForDetail.customerEmail || selectedOrderForDetail.user?.email}</span>
                        </a>
                      ) : (
                        <p className="text-gray-400 italic text-[11px]">Beli tanpa email (Guest Checkout)</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Box Kanan: Alamat & Ekspedisi Pengiriman */}
                <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                      <MapPin size={14} className="text-purple-600" />
                      <span>Alamat & Opsi Pengiriman</span>
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      {selectedOrderForDetail.shippingZone === "STORE_PICKUP" ? "Pickup Galeri" : "Kurir Ekspedisi"}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-gray-400 text-[11px] block">Metode Pengiriman:</span>
                      {selectedOrderForDetail.shippingZone === "STORE_PICKUP" ? (
                        <p className="font-bold text-purple-700">
                          🏬 Ambil Langsung di Galeri Kyabel Bojonegoro (Gratis Ongkir)
                        </p>
                      ) : (
                        <p className="font-bold text-gray-900">
                          🚚 {selectedOrderForDetail.courier || "J&T Express"} <span className="text-gray-500 font-normal">({selectedOrderForDetail.courierService || "Reguler"})</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <span className="text-gray-400 text-[11px] block">Alamat Lengkap:</span>
                      <p className="font-medium text-gray-800 leading-relaxed text-[11px]">
                        {selectedOrderForDetail.fullAddress || "Galeri Kyabel Bojonegoro (Ambil di Toko Fisik)"}
                      </p>
                      {(selectedOrderForDetail.city || selectedOrderForDetail.postalCode) && (
                        <p className="text-gray-500 text-[11px] mt-0.5">
                          Kota/Kab: <strong>{selectedOrderForDetail.city || "-"}</strong> {selectedOrderForDetail.postalCode ? `(Kode Pos: ${selectedOrderForDetail.postalCode})` : ""}
                        </p>
                      )}
                    </div>

                    {selectedOrderForDetail.courierNote && (
                      <div className="p-2 bg-amber-50 border border-amber-200/80 rounded-lg">
                        <span className="text-amber-800 font-bold text-[10px] block">Catatan Khusus Pembeli:</span>
                        <p className="text-amber-950 italic text-[11px]">"{selectedOrderForDetail.courierNote}"</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* SECTION 3: RINCIAN PAKAIAN & VARIAN UKURAN / WARNA */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Shirt size={14} className="text-purple-600" />
                    <span>Daftar Pakaian yang Dipesan & Varian Ukuran (Size Checklist)</span>
                  </h4>
                  <span className="text-xs font-bold text-gray-500">
                    {selectedOrderForDetail.items?.length || 0} Model Pakaian
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100/80 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500">
                        <th className="py-2.5 px-3 font-bold">Produk Pakaian</th>
                        <th className="py-2.5 px-3 font-bold text-center">Ukuran (Size)</th>
                        <th className="py-2.5 px-3 font-bold text-center">Warna</th>
                        <th className="py-2.5 px-3 font-bold text-center">Qty</th>
                        <th className="py-2.5 px-3 font-bold text-right">Harga Satuan</th>
                        <th className="py-2.5 px-3 font-bold text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {selectedOrderForDetail.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/60">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              {item.product?.imageUrl ? (
                                <img 
                                  src={item.product.imageUrl} 
                                  alt={item.product.name} 
                                  className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0" 
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                                  <Shirt size={14} className="text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-900 text-xs">{item.product?.name || "Pakaian"}</p>
                                <p className="text-[10px] text-gray-400 font-mono">ID: {item.productId.substring(0, 10)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block bg-black text-white text-[11px] font-black px-2 py-0.5 rounded uppercase shadow-2xs">
                              {item.size || "M"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.color && item.color !== "DEFAULT" ? (
                              <span className="inline-block bg-gray-100 text-gray-800 border border-gray-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                {item.color}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-gray-800">
                            {item.quantity} pcs
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-gray-600">
                            Rp {item.price.toLocaleString("id-ID")}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-gray-900">
                            Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Ringkasan Biaya Transaksi */}
                  <div className="p-3.5 bg-gray-50 border-t border-gray-200 space-y-1 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal Pakaian:</span>
                      <span className="font-semibold text-gray-800">
                        Rp {(selectedOrderForDetail.subtotal || selectedOrderForDetail.items?.reduce((a, b) => a + (b.price * b.quantity), 0) || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Ongkos Kirim ({selectedOrderForDetail.courier || (selectedOrderForDetail.shippingZone === 'STORE_PICKUP' ? 'Ambil di Toko' : 'Ekspedisi')}):</span>
                      <span className="font-semibold text-gray-800">
                        {selectedOrderForDetail.shippingCost ? `Rp ${selectedOrderForDetail.shippingCost.toLocaleString("id-ID")}` : "Rp 0 (Gratis Ongkir)"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-gray-900 pt-1.5 border-t border-dashed border-gray-300">
                      <span>Total Pembayaran:</span>
                      <span className="text-base text-gray-950 font-black">
                        Rp {selectedOrderForDetail.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: PELACAKAN RESI & GATEWAY SNAP TOKEN */}
              <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    Status Pelacakan Resi (AWB)
                  </span>
                  <div className="flex items-center gap-2">
                    {getTrackingBadge(trackings[selectedOrderForDetail.id])}
                    {trackings[selectedOrderForDetail.id]?.awbNumber && (
                      <span className="font-mono text-xs font-bold text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">
                        Resi: {trackings[selectedOrderForDetail.id]?.awbNumber}
                      </span>
                    )}
                  </div>
                  {trackings[selectedOrderForDetail.id]?.courier && (
                    <p className="text-[11px] text-gray-400">
                      Kurir Rekanan: {trackings[selectedOrderForDetail.id].courier}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleOpenTrackingModal(selectedOrderForDetail);
                    }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                    title="Input atau Perbarui Nomor Resi"
                  >
                    <Truck size={13} />
                    <span>Kelola Resi Pengiriman</span>
                  </button>
                  {selectedOrderForDetail.paymentUrl && (
                    <a
                      href={selectedOrderForDetail.paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                      title="Buka Link Pembayaran"
                    >
                      <ExternalLink size={13} />
                      <span>Buka Pembayaran</span>
                    </a>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer Quick Actions */}
            <div className="p-5 border-t border-gray-100 bg-gray-50/90 flex flex-wrap items-center justify-between gap-3">
              <button 
                type="button" 
                onClick={() => setSelectedOrderForDetail(null)} 
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg text-xs transition-colors"
              >
                Tutup
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {selectedOrderForDetail.snapToken === "CASH" && (
                  <button 
                    onClick={() => handlePrintReceipt({
                      orderId: selectedOrderForDetail.id,
                      totalAmount: selectedOrderForDetail.totalAmount,
                      cashReceived: selectedOrderForDetail.totalAmount,
                      change: 0,
                      items: selectedOrderForDetail.items.map(it => ({
                        name: it.product?.name || "Produk",
                        qty: it.quantity,
                        price: it.price,
                        size: it.size,
                        color: it.color
                      })),
                      date: new Date(selectedOrderForDetail.createdAt).toLocaleString("id-ID")
                    })}
                    className="px-3 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                    title="Cetak Struk Fisik Thermal"
                  >
                    <Printer size={13} />
                    <span>Cetak Struk Thermal</span>
                  </button>
                )}

                {selectedOrderForDetail.status === "PENDING" && (
                  <button 
                    onClick={() => handleUpdateOrderStatus(selectedOrderForDetail.id, "PAID")}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                    title="Tandai Sudah Dibayar (Manual / Offline)"
                  >
                    <CheckCircle size={13} />
                    <span>Tandai Lunas</span>
                  </button>
                )}

                {selectedOrderForDetail.status !== "FAILED" && (
                  <button 
                    onClick={() => handleUpdateOrderStatus(selectedOrderForDetail.id, "FAILED")}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                    title="Batalkan Transaksi & Kembalikan (Rollback) Stok Pakaian"
                  >
                    <XCircle size={13} />
                    <span>Batalkan & Rollback Stok</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
