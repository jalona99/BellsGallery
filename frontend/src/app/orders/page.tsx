"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Truck, 
  MapPin, 
  Search, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  User,
  ShoppingBag
} from "lucide-react";

interface OrderItem {
  id: string;
  product: {
    name: string;
    imageUrl: string;
  };
  quantity: number;
  price: number;
  size?: string;
  color?: string;
}

interface Order {
  id: string;
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
  courierNote?: string;
  status: string;
  isGuest?: boolean;
  snapToken: string | null;
  paymentUrl: string | null;
  createdAt: string;
  items: OrderItem[];
}

interface TrackedOrderData {
  tracking: {
    id?: string;
    orderNumber: string;
    customerName: string;
    courier: string;
    awbNumber: string | null;
    status: string;
    updatedAt: string;
  } | null;
  transaction: Order | null;
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, openAuthModal } = useAuth();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // State Pelacakan Pesanan Publik / Tamu
  const [searchTrackingInput, setSearchTrackingInput] = useState("");
  const [isSearchingTracking, setIsSearchingTracking] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrderData | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Ambil riwayat transaksi akun jika login
  const fetchOrders = async () => {
    try {
      const res = await apiFetch("/api/transactions/history");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi Lookup Pelacakan Publik (Bisa diakses siapapun tanpa login)
  const handleLookupOrder = async (orderIdToLookup: string) => {
    const cleanId = orderIdToLookup.trim();
    if (!cleanId) return;

    setIsSearchingTracking(true);
    setTrackingError(null);

    try {
      const res = await apiFetch(`/api/transactions/tracking/${encodeURIComponent(cleanId)}`);
      const data = await res.json();
      if (res.ok) {
        setTrackedOrder(data);
      } else {
        setTrackedOrder(null);
        setTrackingError(data.error || "Pesanan tidak ditemukan. Mohon periksa kembali nomor Order ID Anda.");
      }
    } catch (err) {
      console.error("Lookup order tracking error:", err);
      setTrackingError("Terjadi kendala jaringan saat melacak pesanan. Silakan coba kembali.");
    } finally {
      setIsSearchingTracking(false);
    }
  };

  // Handle URL query parameter ?tracking=... atau localStorage pesanan tamu terakhir
  useEffect(() => {
    const urlTracking = searchParams.get("tracking");
    if (urlTracking) {
      setSearchTrackingInput(urlTracking);
      handleLookupOrder(urlTracking);
    } else if (typeof window !== "undefined") {
      const lastGuestOrder = localStorage.getItem("recent_guest_order");
      if (lastGuestOrder && !user) {
        setSearchTrackingInput(lastGuestOrder);
        handleLookupOrder(lastGuestOrder);
      }
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchOrders();
  }, [user, authLoading]);

  const handleCancelOrder = async (orderId: string) => {
    const confirmCancel = window.confirm(
      "Apakah Anda yakin ingin membatalkan pesanan ini? Stok produk akan otomatis dikembalikan ke toko."
    );
    if (!confirmCancel) return;

    try {
      setCancellingOrderId(orderId);
      const res = await apiFetch(`/api/transactions/${orderId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("Pesanan berhasil dibatalkan dan stok produk telah dikembalikan.");
        if (user) await fetchOrders();
        if (trackedOrder && trackedOrder.transaction?.id === orderId) {
          handleLookupOrder(orderId);
        }
      } else {
        alert(data.error || "Gagal membatalkan pesanan.");
      }
    } catch (err: any) {
      console.error("Cancel error:", err);
      alert("Terjadi kendala jaringan saat membatalkan pesanan.");
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleSyncOrder = async (orderId: string) => {
    try {
      setSyncingOrderId(orderId);
      const res = await apiFetch(`/api/transactions/sync/${orderId}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (data.status === "PAID") {
          alert("Pembayaran Terverifikasi! Status pesanan kini LUNAS.");
        } else if (data.status === "FAILED") {
          alert("Status pesanan: GAGAL / KEDALUWARSA.");
        } else {
          alert(data.message || "Menunggu penyelesaian pembayaran oleh pembeli.");
        }
        if (user) await fetchOrders();
        if (trackedOrder && trackedOrder.transaction?.id === orderId) {
          handleLookupOrder(orderId);
        }
      } else {
        alert(data.error || "Gagal menyinkronkan status pesanan.");
      }
    } catch (err) {
      console.error("Sync error:", err);
      alert("Terjadi kendala jaringan saat menghubungi server pembayaran.");
    } finally {
      setSyncingOrderId(null);
    }
  };

  const handlePayNow = (orderId: string, snapToken: string, paymentUrl: string | null) => {
    if (typeof (window as any).snap !== "undefined" && snapToken && !snapToken.startsWith("mock-")) {
      (window as any).snap.pay(snapToken, {
        onSuccess: async function () {
          try {
            await apiFetch(`/api/transactions/sync/${orderId}`, { method: "POST" });
          } catch (_) {}
          alert("Pembayaran Berhasil Terverifikasi!");
          if (user) fetchOrders();
          handleLookupOrder(orderId);
        },
        onPending: async function () {
          try {
            await apiFetch(`/api/transactions/sync/${orderId}`, { method: "POST" });
          } catch (_) {}
          alert("Menunggu Pembayaran Anda!");
          if (user) fetchOrders();
          handleLookupOrder(orderId);
        },
        onError: function () {
          alert("Pembayaran Gagal!");
        },
        onClose: async function () {
          try {
            await apiFetch(`/api/transactions/sync/${orderId}`, { method: "POST" });
            if (user) fetchOrders();
            handleLookupOrder(orderId);
          } catch (_) {}
        },
      });
    } else if (paymentUrl) {
      window.open(paymentUrl, "_blank");
    } else {
      alert("Tautan pembayaran tidak tersedia.");
    }
  };

  const getStatusBadge = (status: string, snapToken?: string | null) => {
    switch (status.toUpperCase()) {
      case "PAID":
        return <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold"><CheckCircle size={14}/> LUNAS</span>;
      case "PENDING":
        if (snapToken === "CASH_ON_PICKUP") {
          return <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold"><Clock size={14}/> MENUNGGU PENGAMBILAN DI TOKO</span>;
        }
        return <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold"><Clock size={14}/> MENUNGGU PEMBAYARAN</span>;
      case "FAILED":
      case "EXPIRED":
      case "CANCELLED":
        return <span className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold"><XCircle size={14}/> DIBATALKAN</span>;
      default:
        return <span className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const getTrackingBadge = (trackingStatus?: string | null) => {
    const st = trackingStatus?.toUpperCase() || "DIPROSES";
    switch (st) {
      case "SELESAI":
        return <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-[11px] font-bold px-2 py-0.5 rounded-full"><CheckCircle size={12}/> Pesanan Selesai</span>;
      case "DIKIRIM":
        return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full"><Truck size={12}/> Sedang Dikirim</span>;
      case "DIPROSES":
        return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full"><Package size={12}/> Sedang Dikemas Toko</span>;
      case "DIBATALKAN":
        return <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[11px] font-bold px-2 py-0.5 rounded-full"><XCircle size={12}/> Pengiriman Dibatalkan</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 text-[11px] font-bold px-2 py-0.5 rounded-full">{st}</span>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Package size={28} className="text-black" />
          <h1 className="text-3xl font-black uppercase tracking-tighter">Status & Pelacakan Pesanan</h1>
        </div>

        {!user && (
          <button
            type="button"
            onClick={() => openAuthModal()}
            className="self-start md:self-auto text-xs bg-black text-white hover:bg-gray-800 font-bold px-4 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <User size={14} />
            <span>Login Akun Member</span>
          </button>
        )}
      </div>

      {/* Box Pelacakan Publik (Untuk Pembeli Tamu / Siapapun dengan Order ID) */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200/90 shadow-sm mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Truck size={20} className="text-black" />
          <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">
            Lacak Pesanan Publik & Tamu (Guest Tracking)
          </h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Masukkan <strong>Order ID</strong> untuk mengecek status pesanan, verifikasi pembayaran, nomor resi kurir, atau konfirmasi ambil di galeri.
        </p>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleLookupOrder(searchTrackingInput);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Contoh: order-1723... atau UUID Pesanan"
              value={searchTrackingInput}
              onChange={(e) => setSearchTrackingInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <button
            type="submit"
            disabled={isSearchingTracking || !searchTrackingInput.trim()}
            className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {isSearchingTracking ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Melacak...</span>
              </>
            ) : (
              <span>Lacak Pesanan</span>
            )}
          </button>
        </form>

        {trackingError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <XCircle size={16} className="shrink-0" />
            <span>{trackingError}</span>
          </div>
        )}
      </div>

      {/* Hasil Pelacakan Spesifik (Tracked Order Card) */}
      {trackedOrder && trackedOrder.transaction && (
        <div className="mb-10 bg-white rounded-2xl shadow-md border-2 border-black overflow-hidden animate-fade-in">
          <div className="bg-black text-white p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-white/20 font-bold px-2 py-0.5 rounded text-white tracking-widest uppercase">
                  Hasil Pelacakan
                </span>
                {trackedOrder.transaction.isGuest && (
                  <span className="text-[10px] bg-amber-400 font-black px-2 py-0.5 rounded text-black tracking-widest uppercase">
                    Pembeli Tamu (Guest)
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-300 mt-1 font-mono">
                Order ID: <span className="text-white font-bold">{trackedOrder.transaction.id}</span>
              </p>
              <p className="text-[11px] text-gray-400">
                Waktu: {new Date(trackedOrder.transaction.createdAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
              </p>
            </div>
            <div className="flex flex-col sm:items-end gap-1">
              {getStatusBadge(trackedOrder.transaction.status, trackedOrder.transaction.snapToken)}
              {getTrackingBadge(trackedOrder.tracking?.status)}
            </div>
          </div>

          {/* Resi & Logistik Kurir Card */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Truck size={15} className="text-blue-600" />
                <span>
                  {trackedOrder.transaction.shippingZone === 'STORE_PICKUP' 
                    ? 'Pengambilan Fisik di Galeri Bojonegoro' 
                    : `Ekspedisi: ${trackedOrder.tracking?.courier || trackedOrder.transaction.courier || 'Kurir Reguler'}`}
                </span>
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5 font-mono">
                {trackedOrder.transaction.shippingZone === 'STORE_PICKUP' ? (
                  <span className="font-semibold text-purple-700">Toko Fisik: Jl. Panglima Polim, Bojonegoro</span>
                ) : trackedOrder.tracking?.awbNumber ? (
                  <span>No. Resi Pengiriman: <strong className="text-gray-900 bg-white px-1.5 py-0.5 border border-gray-200 rounded">{trackedOrder.tracking.awbNumber}</strong></span>
                ) : (
                  <span className="text-gray-400 italic">Nomor resi sedang disiapkan oleh admin toko</span>
                )}
              </p>
            </div>
            {trackedOrder.tracking?.updatedAt && (
              <span className="text-[10px] text-gray-400">
                Pembaruan: {new Date(trackedOrder.tracking.updatedAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
              </span>
            )}
          </div>

          {/* Rincian Produk dengan Ukuran & Warna */}
          <div className="p-4 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">Daftar Produk</h3>
            {trackedOrder.transaction.items?.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <img 
                  src={item.product?.imageUrl || "/window.svg"} 
                  alt={item.product?.name} 
                  className="w-14 h-14 rounded-lg object-cover bg-gray-100 border border-gray-200 shrink-0" 
                />
                <div className="flex-1">
                  <h4 className="font-bold text-xs text-gray-900">{item.product?.name || "Produk Pakaian"}</h4>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {item.size && (
                      <span className="inline-flex items-center text-[10px] font-black text-white bg-black px-1.5 py-0.5 rounded">
                        Size: {item.size}
                      </span>
                    )}
                    {item.color && item.color !== 'DEFAULT' && (
                      <span className="inline-flex items-center text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                        Warna: {item.color}
                      </span>
                    )}
                    <span className="text-gray-500 text-xs font-medium">x {item.quantity}</span>
                  </div>
                  <p className="text-xs font-bold text-gray-900 mt-1">Rp {item.price.toLocaleString('id-ID')}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Snapshot Penerima & Alamat */}
          {trackedOrder.transaction.recipientName && (
            <div className="bg-gray-50 p-4 border-t border-gray-200 text-xs space-y-1">
              <p><span className="font-bold text-gray-700">Penerima / Pengambil:</span> {trackedOrder.transaction.recipientName} {trackedOrder.transaction.phoneNumber ? `(${trackedOrder.transaction.phoneNumber})` : ''}</p>
              {trackedOrder.transaction.fullAddress && (
                <p><span className="font-bold text-gray-700">Alamat Kirim:</span> {trackedOrder.transaction.fullAddress}, {trackedOrder.transaction.city || ''}</p>
              )}
            </div>
          )}

          {/* Total & Tombol Aksi */}
          <div className="p-4 bg-gray-100/70 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-xs text-gray-500">
                Subtotal: Rp {(trackedOrder.transaction.subtotal || Math.max(0, trackedOrder.transaction.totalAmount - (trackedOrder.transaction.shippingCost || 0))).toLocaleString('id-ID')} + Ongkir: Rp {(trackedOrder.transaction.shippingCost || 0).toLocaleString('id-ID')}
              </p>
              <p className="text-lg font-black text-red-600">
                Total Pembayaran: Rp {trackedOrder.transaction.totalAmount.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {trackedOrder.transaction.status === "PENDING" && (
                <>
                  {trackedOrder.transaction.snapToken !== "CASH_ON_PICKUP" && (
                    <button
                      onClick={() => handleSyncOrder(trackedOrder.transaction!.id)}
                      disabled={syncingOrderId === trackedOrder.transaction.id}
                      className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Sinkronisasi status transaksi langsung ke Midtrans"
                    >
                      <RefreshCw size={13} className={syncingOrderId === trackedOrder.transaction.id ? "animate-spin" : ""} />
                      <span>{syncingOrderId === trackedOrder.transaction.id ? "Memeriksa..." : "Cek Status"}</span>
                    </button>
                  )}

                  {trackedOrder.transaction.snapToken && trackedOrder.transaction.snapToken !== "CASH_ON_PICKUP" && (
                    <button
                      onClick={() => handlePayNow(trackedOrder.transaction!.id, trackedOrder.transaction!.snapToken!, trackedOrder.transaction!.paymentUrl)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                    >
                      Bayar Sekarang
                    </button>
                  )}

                  {trackedOrder.transaction.snapToken === "CASH_ON_PICKUP" && (
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg">
                      💵 Bayar Langsung di Kasir Galeri
                    </span>
                  )}
                </>
              )}

              <button
                onClick={() => setTrackedOrder(null)}
                className="text-xs text-gray-500 hover:text-black font-bold underline px-2 cursor-pointer"
              >
                Tutup Pelacakan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Riwayat Pesanan Akun Member */}
      {user ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">
              Riwayat Pesanan Akun Saya ({orders.length})
            </h2>
            <button 
              onClick={fetchOrders}
              className="text-xs text-gray-600 hover:text-black font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoading || authLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <RefreshCw className="animate-spin mb-3" size={28} />
              <p className="font-bold text-xs uppercase tracking-wider">Memuat Pesanan...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center bg-white p-12 rounded-xl shadow-xs border border-gray-200">
              <ShoppingBag size={44} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-base font-bold text-gray-900 mb-1">Belum Ada Transaksi</h3>
              <p className="text-xs text-gray-500">Anda belum pernah melakukan pemesanan menggunakan akun ini.</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                      {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-xs font-mono text-gray-800 font-bold">Order ID: {order.id}</p>
                  </div>
                  <div>
                    {getStatusBadge(order.status, order.snapToken)}
                  </div>
                </div>
                
                <div className="p-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
                      <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden shrink-0 border border-gray-200">
                        <img src={item.product?.imageUrl || "/window.svg"} alt={item.product?.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-gray-900">{item.product?.name || "Produk Dihapus"}</h4>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {item.size && (
                            <span className="inline-flex items-center text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                              Size: {item.size}
                            </span>
                          )}
                          {item.color && item.color !== 'DEFAULT' && (
                            <span className="inline-flex items-center text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                              Warna: {item.color}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-1">Rp {item.price.toLocaleString('id-ID')} x {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping & Recipient Snapshot */}
                <div className="bg-gray-50/80 p-3.5 mx-4 mb-3 rounded-lg border border-gray-100 text-xs">
                  <div className="flex items-center justify-between font-bold text-gray-800 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Truck size={14} className="text-gray-600" />
                      {order.shippingZone === 'STORE_PICKUP' 
                        ? 'Ambil di Galeri Kyabel Bojonegoro' 
                        : `${order.courier || 'Ekspedisi'}${order.courierService ? ` (${order.courierService})` : ''} • ${
                            order.shippingZone === 'JATIM' 
                              ? 'Jawa Timur' 
                              : order.shippingZone === 'JAWA_NON_JATIM' 
                              ? 'Jawa Non-Jatim' 
                              : order.shippingZone === 'LUAR_JAWA'
                              ? 'Luar Pulau Jawa'
                              : 'Reguler'
                          }`}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500">
                      Ongkir: {order.shippingCost === 0 ? 'Rp 0 (Gratis/Toko)' : `Rp ${(order.shippingCost || 0).toLocaleString('id-ID')}`}
                    </span>
                  </div>

                  {order.recipientName && (
                    <div className="text-gray-600 space-y-0.5 text-[11px] pt-1 border-t border-gray-200/50">
                      <p><span className="font-semibold text-gray-700">Penerima:</span> {order.recipientName} {order.phoneNumber && order.phoneNumber !== '-' ? `(${order.phoneNumber})` : ''}</p>
                      {order.fullAddress && (
                        <p className="line-clamp-2"><span className="font-semibold text-gray-700">Alamat:</span> {order.fullAddress}, {order.city || ''} {order.postalCode || ''}</p>
                      )}
                      {order.courierNote && (
                        <p className="italic text-gray-500">Catatan Kurir: "{order.courierNote}"</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-100">
                  <div>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Subtotal: Rp {(order.subtotal || Math.max(0, order.totalAmount - (order.shippingCost || 0))).toLocaleString('id-ID')} + Ongkir: Rp {(order.shippingCost || 0).toLocaleString('id-ID')}
                    </p>
                    <p className="text-lg font-black text-red-600">Total: Rp {order.totalAmount.toLocaleString('id-ID')}</p>
                  </div>
                  
                  {order.status === "PENDING" && (
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {order.snapToken !== "CASH_ON_PICKUP" && (
                        <button
                          onClick={() => handleSyncOrder(order.id)}
                          disabled={syncingOrderId === order.id}
                          className="flex-1 sm:flex-initial bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-3 py-2 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Cek konfirmasi pembayaran langsung ke Midtrans"
                        >
                          <RefreshCw size={13} className={syncingOrderId === order.id ? "animate-spin" : ""} />
                          {syncingOrderId === order.id ? "Memeriksa..." : "Cek Status"}
                        </button>
                      )}

                      {order.snapToken && order.snapToken !== "CASH_ON_PICKUP" && (
                        <button 
                          onClick={() => handlePayNow(order.id, order.snapToken!, order.paymentUrl)}
                          className="flex-1 sm:flex-initial bg-black text-white px-5 py-2 rounded-sm text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                          Bayar Sekarang
                        </button>
                      )}

                      {order.snapToken === "CASH_ON_PICKUP" && (
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded">
                          💵 Bayar Tunai di Kasir Galeri
                        </span>
                      )}

                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancellingOrderId === order.id}
                        className="flex-1 sm:flex-initial bg-white border border-red-300 hover:bg-red-50 text-red-600 px-3.5 py-2 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Batalkan pesanan ini dan kembalikan stok produk"
                      >
                        <XCircle size={13} />
                        {cancellingOrderId === order.id ? "Membatalkan..." : "Batalkan Pesanan"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        !trackedOrder && (
          <div className="text-center bg-white p-10 rounded-2xl shadow-xs border border-gray-200 mt-6">
            <User size={40} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-base font-bold text-gray-900 mb-1">Melihat Riwayat Akun?</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-5">
              Jika Anda memesan sebagai tamu, Anda dapat melacak status pesanan Anda menggunakan formulir pencarian di atas. Untuk melihat seluruh riwayat pembelian akun member, silakan login.
            </p>
            <button
              onClick={() => openAuthModal()}
              className="bg-black hover:bg-gray-800 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-full transition-all cursor-pointer shadow-sm"
            >
              Masuk / Buat Akun
            </button>
          </div>
        )
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-gray-500">
        <RefreshCw className="animate-spin mb-3" size={28} />
        <p className="text-xs font-bold uppercase tracking-wider">Memuat Halaman Pesanan...</p>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}
