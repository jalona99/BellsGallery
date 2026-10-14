"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { 
  Search, 
  ShoppingBag, 
  User, 
  Menu, 
  X, 
  Trash2, 
  LogOut, 
  Sparkles, 
  MapPin, 
  Truck, 
  Store, 
  ArrowLeft, 
  CheckCircle2, 
  ChevronRight,
  ShieldCheck,
  Package
} from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  
  const { cart, removeFromCart, updateQuantity, clearCart, total } = useCart();
  const { user, openAuthModal, logout } = useAuth();
  
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Checkout Step & Address Snapshot State
  const [checkoutStep, setCheckoutStep] = useState<'CART' | 'SHIPPING'>('CART');
  const [shippingZone, setShippingZone] = useState<'STORE_PICKUP' | 'JATIM' | 'JAWA_NON_JATIM' | 'LUAR_JAWA'>('JATIM');
  const [selectedCourier, setSelectedCourier] = useState<'J&T Express' | 'JNE Express' | 'SiCepat Ekspres'>('J&T Express');
  const [saveAddressToBook, setSaveAddressToBook] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'CASH_ON_PICKUP'>('CASH_ON_PICKUP');
  const [recipientName, setRecipientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [courierNote, setCourierNote] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isMenuOpen || isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMenuOpen, isCartOpen]);

  // Reset checkout step when cart drawer closes
  useEffect(() => {
    if (!isCartOpen) {
      setCheckoutStep('CART');
    }
  }, [isCartOpen]);

  // Jika sedang di halaman Fitting Studio, biarkan halaman try-on menggunakan navigasi full-screen sendiri
  if (pathname === '/try-on') return null;

  // Kalkulasi Ongkos Kirim Zonasi Flat Rate
  const getShippingFee = (zone: string, subtotal: number) => {
    switch (zone) {
      case 'STORE_PICKUP':
        return 0;
      case 'JATIM':
        return subtotal >= 200000 ? 0 : 10000;
      case 'JAWA_NON_JATIM':
        return 18000;
      case 'LUAR_JAWA':
        return 35000;
      default:
        return 0;
    }
  };

  const currentShippingFee = getShippingFee(shippingZone, total);
  const isJatimFreePromo = shippingZone === 'JATIM' && total >= 200000;
  const grandTotal = total + currentShippingFee;

  // Menuju ke Step Pengiriman & Ambil Buku Alamat
  const handleProceedToShipping = async () => {
    if (cart.length === 0) return;

    setCheckoutStep('SHIPPING');

    // Ambil alamat tersimpan pengguna jika ada (khusus member login)
    if (user && savedAddresses.length === 0) {
      try {
        setIsLoadingAddresses(true);
        const res = await apiFetch('/api/addresses');
        if (res.ok) {
          const data = await res.json();
          const list = data.addresses || [];
          setSavedAddresses(list);

          // Pasang alamat default jika belum diisi
          const defaultAddr = list.find((a: any) => a.isDefault) || list[0];
          if (defaultAddr && !recipientName && !fullAddress) {
            setRecipientName(defaultAddr.recipientName || user.name || "");
            setPhoneNumber(defaultAddr.phoneNumber || "");
            setFullAddress(defaultAddr.fullAddress || "");
            setCity(defaultAddr.city || "");
            setPostalCode(defaultAddr.postalCode || "");
          } else if (!recipientName) {
            setRecipientName(user.name || "");
          }
        }
      } catch (err) {
        console.error("Gagal mengambil buku alamat:", err);
      } finally {
        setIsLoadingAddresses(false);
      }
    } else if (user) {
      if (!recipientName) setRecipientName(user.name || "");
      if (!customerEmail) setCustomerEmail(user.email || "");
    }
  };

  const handleSelectSavedAddress = (addr: any) => {
    setRecipientName(addr.recipientName || "");
    setPhoneNumber(addr.phoneNumber || "");
    setFullAddress(addr.fullAddress || "");
    setCity(addr.city || "");
    setPostalCode(addr.postalCode || "");
  };

  const handleFinalCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cart.length === 0) return;

    // Validasi data kontak wajib untuk kurir maupun ambil di toko
    if (!recipientName.trim()) {
      alert("Mohon isi Nama Lengkap penerima / pengambil barang.");
      return;
    }

    if (!phoneNumber.trim()) {
      alert("Mohon cantumkan Nomor WhatsApp / Telepon aktif agar galeri atau kurir dapat mengonfirmasi pesanan.");
      return;
    }

    if (shippingZone !== 'STORE_PICKUP') {
      if (!fullAddress.trim() || !city.trim()) {
        alert("Mohon lengkapi Alamat Lengkap dan Kota/Kabupaten untuk pengiriman kurir.");
        return;
      }
    }

    setIsCheckingOut(true);

    // Mencegah user tidak sengaja menutup atau me-refresh browser saat payment gateway sedang memproses
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Transaksi pembayaran sedang diproses oleh Payment Gateway. Mohon jangan refresh halaman.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    try {
      const selectedPaymentMethod = shippingZone === 'STORE_PICKUP' ? paymentMethod : 'ONLINE';

      // Buat atau gunakan Idempotency Key sesi checkout ini untuk proteksi reload/gangguan koneksi
      const checkoutSessionKey = user ? user.id : `guest_${phoneNumber.replace(/\D/g, '') || Date.now()}`;
      let activeIdempotencyKey = sessionStorage.getItem(`checkout_key_${checkoutSessionKey}`);
      if (!activeIdempotencyKey) {
        activeIdempotencyKey = `chk_${user ? user.id.substring(0, 8) : 'gst'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        sessionStorage.setItem(`checkout_key_${checkoutSessionKey}`, activeIdempotencyKey);
      }

      const res = await apiFetch('/api/transactions/checkout', {
        method: 'POST',
        headers: {
          'Idempotency-Key': activeIdempotencyKey
        },
        body: JSON.stringify({
          userId: user?.id,
          customerEmail: customerEmail.trim() || (user ? user.email : undefined),
          idempotencyKey: activeIdempotencyKey,
          shippingZone,
          courier: shippingZone === 'STORE_PICKUP' ? 'AMBIL_DI_TOKO' : selectedCourier,
          courierService: shippingZone === 'STORE_PICKUP' ? 'Ambil Langsung di Galeri' : 'Reguler',
          recipientName: recipientName.trim() || (user?.name || 'Pelanggan Galeri'),
          phoneNumber: phoneNumber.trim(),
          fullAddress: fullAddress.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
          courierNote: courierNote.trim(),
          paymentMethod: selectedPaymentMethod,
          items: cart.map(item => ({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            size: item.size || 'M',
            color: item.color || 'DEFAULT'
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout gagal');

      // Simpan ke buku alamat jika member login mencentang opsi
      if (user && saveAddressToBook && shippingZone !== 'STORE_PICKUP') {
        try {
          await apiFetch('/api/addresses', {
            method: 'POST',
            body: JSON.stringify({
              recipientName: recipientName.trim(),
              phoneNumber: phoneNumber.trim(),
              fullAddress: fullAddress.trim(),
              city: city.trim(),
              postalCode: postalCode.trim(),
              isDefault: false
            })
          });
        } catch (_) {}
      }

      // Bersihkan key setelah transaksi berhasil dibuat / di-resume
      sessionStorage.removeItem(`checkout_key_${checkoutSessionKey}`);

      // Simpan riwayat ID pesanan terakhir untuk pelacakan tamu
      if (!user && data.transactionId) {
        try {
          localStorage.setItem('recent_guest_order', data.transactionId);
        } catch (_) {}
      }

      const targetOrderUrl = user ? '/orders' : `/orders?tracking=${encodeURIComponent(data.transactionId)}`;

      setIsCartOpen(false);
      setCheckoutStep('CART');
      clearCart();

      // Kasus 0: Jika transaksi ternyata sudah lunas sebelumnya
      if (data.isPaid) {
        alert("Pesanan ini sudah tercatat LUNAS. Mengarahkan ke halaman pelacakan pesanan Anda...");
        router.push(targetOrderUrl);
        return;
      }
      
      // Kasus 1: Jika metode Bayar di Kasir Galeri (CASH_ON_PICKUP)
      if (data.paymentMethod === 'CASH_ON_PICKUP') {
        alert(`Pesanan Ambil di Toko Berhasil Dibuat!\nID Pesanan: ${data.transactionId}\nSilakan tunjukkan ID Pesanan ini kepada kasir Galeri Kyabel Bojonegoro saat mengambil barang.`);
        router.push(targetOrderUrl);
        return;
      }

      // Kasus 2: Call Midtrans Snap Popup jika token resmi dari Midtrans (bukan mock)
      if (data.token && !data.token.startsWith('mock-') && typeof (window as any).snap !== 'undefined') {
        (window as any).snap.pay(data.token, {
          onSuccess: async function(result: any){
            try {
              await apiFetch(`/api/transactions/sync/${data.transactionId}`, { method: 'POST' });
            } catch (_) {}
            alert("Pembayaran Berhasil Terverifikasi! Pesanan Anda segera disiapkan.");
            router.push(targetOrderUrl);
          },
          onPending: function(result: any){
            alert(`Menunggu Pembayaran Anda!\nSimpan ID Pesanan Anda: ${data.transactionId}`);
            router.push(targetOrderUrl);
          },
          onError: function(result: any){
            alert("Pembayaran Gagal!");
            router.push(targetOrderUrl);
          },
          onClose: function(){
            router.push(targetOrderUrl);
          }
        });
      } else if (data.paymentUrl) {
        // Fallback jika mode simulasi / akun Midtrans sedang review
        window.location.href = data.paymentUrl;
      } else {
        router.push(targetOrderUrl);
      }
      
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat checkout');
    } finally {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setIsCheckingOut(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMenuOpen(false);
    }
  };

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Mobile Menu & Logo */}
            <div className="flex items-center gap-4">
              <button 
                type="button"
                className="lg:hidden p-2 -ml-2 text-black hover:bg-gray-100 transition-colors rounded-full cursor-pointer"
                onClick={() => setIsMenuOpen(true)}
                aria-label="Buka Menu"
              >
                <Menu size={24} />
              </button>
              <Link href="/" className="text-2xl font-black tracking-tighter uppercase text-black hover:opacity-70 transition-opacity">
                BELLSGALLERY
              </Link>
            </div>

            <nav className="hidden lg:flex items-center gap-8">
              <Link href="/?category=pria" className="text-sm font-bold uppercase tracking-wider text-gray-800 hover:text-black hover:underline underline-offset-8 decoration-2 transition-all">PRIA</Link>
              <Link href="/?category=wanita" className="text-sm font-bold uppercase tracking-wider text-gray-800 hover:text-black hover:underline underline-offset-8 decoration-2 transition-all">WANITA</Link>
              <Link href="/try-on" className="text-sm font-bold uppercase tracking-wider text-purple-600 hover:text-purple-800 flex items-center gap-1.5 transition-all">
                <Sparkles size={15} className="text-purple-500 animate-pulse" />
                <span>Fitting Studio</span>
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              <form onSubmit={handleSearch} className="hidden lg:flex items-center bg-gray-100 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-black transition-all">
                <button type="submit" aria-label="Cari" className="cursor-pointer">
                  <Search size={18} className="text-gray-500 mr-2 hover:text-black transition-colors" />
                </button>
                <input 
                  type="text" 
                  placeholder="Cari produk..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-48 font-medium placeholder-gray-500"
                />
              </form>
              <button 
                type="button"
                className="lg:hidden p-2 text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer" 
                onClick={() => setIsMenuOpen(true)}
                aria-label="Cari Produk"
              >
                <Search size={20} />
              </button>
              
              {user ? (
                <>
                  <div className="hidden md:flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <Link href="/profile" className="text-sm font-bold capitalize hover:underline">Hi, {user.name.split(' ')[0]}</Link>
                      <div className="flex gap-3">
                        <Link href="/profile" className="text-xs text-gray-500 font-medium hover:text-black hover:underline transition-colors">Membership</Link>
                        {user.role === 'ADMIN' && (
                          <Link href="/admin" className="text-xs text-red-500 font-bold hover:text-red-700 hover:underline transition-colors">Admin</Link>
                        )}
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={logout}
                      className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                      title="Keluar"
                      aria-label="Keluar"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                  <Link
                    href="/profile"
                    className="md:hidden p-2 text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                    title={`Hi, ${user.name}`}
                    aria-label="Profil Akun"
                  >
                    <User size={20} />
                  </Link>
                </>
              ) : (
                <button 
                  type="button"
                  className="p-2 text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                  onClick={openAuthModal}
                  title="Masuk / Daftar"
                  aria-label="Masuk atau Daftar"
                >
                  <User size={20} />
                </button>
              )}

              <button 
                type="button"
                className="p-2 text-black hover:bg-gray-100 rounded-full transition-colors relative group cursor-pointer"
                onClick={() => setIsCartOpen(true)}
                aria-label="Buka Keranjang"
              >
                <ShoppingBag size={20} className="group-hover:scale-110 transition-transform" />
                {cartItemCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
                    {cartItemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 ${isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} 
        onClick={() => setIsMenuOpen(false)} 
      />
      
      {/* Mobile Menu Drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-4/5 max-w-sm bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          <span className="text-xl font-black uppercase tracking-tighter">Menu</span>
          <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Mobile User Info */}
        <div className="p-4 border-b border-gray-100 md:hidden flex justify-between items-center bg-gray-50">
          {user ? (
            <div className="flex flex-col gap-1 w-full">
              <span className="font-bold">Hi, {user.name}</span>
              <div className="flex flex-col gap-2 mt-2 w-full">
                <Link href="/profile" onClick={() => setIsMenuOpen(false)} className="text-sm font-bold bg-black text-white px-4 py-2 rounded-sm hover:bg-gray-800 text-center">
                  Membership
                </Link>
                {user.role === 'ADMIN' && (
                  <Link href="/admin" onClick={() => setIsMenuOpen(false)} className="text-sm font-bold bg-red-100 text-red-600 px-4 py-2 rounded-sm hover:bg-red-200 text-center">
                    Admin Panel
                  </Link>
                )}
                <button onClick={logout} className="text-sm font-bold text-red-500 hover:underline text-left mt-2">Keluar</button>
              </div>
            </div>
          ) : (
            <>
              <span className="text-sm text-gray-500">Belum masuk?</span>
              <button 
                onClick={() => { setIsMenuOpen(false); openAuthModal(); }} 
                className="text-sm font-bold bg-black text-white px-4 py-1.5 rounded-sm hover:bg-gray-800"
              >
                Login
              </button>
            </>
          )}
        </div>

        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <form onSubmit={handleSearch} className="flex items-center bg-white border border-gray-300 rounded-sm px-3 py-2 focus-within:border-black transition-colors">
            <Search size={18} className="text-gray-500 mr-2" />
            <input 
              type="text" 
              placeholder="Cari produk..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full font-medium"
            />
          </form>
        </div>
        <nav className="flex flex-col p-4 gap-4 overflow-y-auto pb-20">
          {/* Fitting Studio Highlight */}
          <Link
            href="/try-on"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-900/20 to-emerald-900/20 border border-purple-200 text-black font-bold hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-purple-600 animate-pulse" />
              <div>
                <div className="text-sm font-black uppercase tracking-wide">Fitting Studio</div>
                <div className="text-xs font-medium text-gray-600">Dual-Mode Live AR & Photo HD</div>
              </div>
            </div>
            <span className="text-xs bg-purple-600 text-white font-bold px-2 py-0.5 rounded-full">Baru</span>
          </Link>

          {/* Menu PRIA */}
          <div className="border-b border-gray-200 pb-4">
            <Link href="/?category=pria" onClick={() => setIsMenuOpen(false)} className="block text-xl font-black mb-4 hover:text-gray-600 transition-colors">PRIA</Link>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              <Link href="/?category=pria&sub=kaos" onClick={() => setIsMenuOpen(false)} className="text-sm text-gray-600 hover:text-black font-medium">Kaos (T-shirts)</Link>
              <Link href="/?category=pria&sub=kemeja" onClick={() => setIsMenuOpen(false)} className="text-sm text-gray-600 hover:text-black font-medium">Kemeja</Link>
              <Link href="/?category=pria&sub=jaket" onClick={() => setIsMenuOpen(false)} className="text-sm text-gray-600 hover:text-black font-medium">Jaket & Outer</Link>
              <Link href="/?category=pria&sub=celana" onClick={() => setIsMenuOpen(false)} className="text-sm text-gray-600 hover:text-black font-medium">Celana</Link>
              <Link href="/?category=pria&sub=sepatu" onClick={() => setIsMenuOpen(false)} className="text-sm text-gray-600 hover:text-black font-medium">Sepatu & Sandal</Link>
              <Link href="/?category=pria&sub=topi" onClick={() => setIsMenuOpen(false)} className="text-sm text-gray-600 hover:text-black font-medium">Topi & Aksesoris</Link>
            </div>
          </div>

          {/* Menu WANITA */}
          <div className="border-b border-gray-200 pb-4 mt-2">
            <Link href="/?category=wanita" onClick={() => setIsMenuOpen(false)} className="block text-xl font-black mb-4 hover:text-gray-600 transition-colors">WANITA</Link>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              <Link href="/?category=wanita&sub=kaos" onClick={() => setIsMenuOpen(false)} className="text-sm text-gray-600 hover:text-black font-medium">Kaos (T-shirts)</Link>
              <Link href="/?category=wanita&sub=kemeja" onClick={() => setIsMenuOpen(false)} className="text-sm text-gray-600 hover:text-black font-medium">Kemeja & Blus</Link>
              <Link href="/?category=wanita&sub=jaket" onClick={() => setIsMenuOpen(false)} className="text-sm text-gray-600 hover:text-black font-medium">Jaket & Outer</Link>
              <Link href="/?category=wanita&sub=celana" onClick={() => setIsMenuOpen(false)} className="text-sm text-gray-600 hover:text-black font-medium">Celana & Rok</Link>
              <Link href="/?category=wanita&sub=dress" onClick={() => setIsMenuOpen(false)} className="text-sm text-gray-600 hover:text-black font-medium">Dress (Gaun)</Link>
              <Link href="/?category=wanita&sub=sepatu" onClick={() => setIsMenuOpen(false)} className="text-sm text-gray-600 hover:text-black font-medium">Sepatu & Sandal</Link>
              <Link href="/?category=wanita&sub=tas" onClick={() => setIsMenuOpen(false)} className="text-sm text-gray-600 hover:text-black font-medium">Tas & Aksesoris</Link>
            </div>
          </div>
        </nav>
      </div>

      {/* Cart Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 ${isCartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} 
        onClick={() => setIsCartOpen(false)} 
      />

      {/* Cart Drawer */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isCartOpen ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header Drawer */}
        <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-white">
          {checkoutStep === 'SHIPPING' ? (
            <button 
              onClick={() => setCheckoutStep('CART')}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-black transition-colors"
            >
              <ArrowLeft size={18} />
              <span>Kembali</span>
            </button>
          ) : (
            <span className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
              <ShoppingBag size={22} /> Keranjang ({cartItemCount})
            </span>
          )}

          {checkoutStep === 'SHIPPING' && (
            <span className="text-sm font-black uppercase tracking-tight text-gray-900">
              Pengiriman & Alamat
            </span>
          )}

          <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Step 1: Cart Items List */}
        {checkoutStep === 'CART' ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50/50">
              {/* Promo Banner Info */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-lg p-3 text-xs flex items-center gap-2.5 text-emerald-900">
                <Truck size={18} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Promo Pengiriman Jawa Timur</p>
                  <p className="text-[11px] text-emerald-700">Gratis ongkir se-Jatim untuk belanja di atas Rp 200.000!</p>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="text-center text-gray-500 mt-10 flex flex-col items-center gap-3">
                  <ShoppingBag size={48} className="text-gray-300" />
                  <p className="font-medium text-sm">Keranjang belanja Anda kosong.</p>
                  {user && (
                    <button 
                      onClick={() => { setIsCartOpen(false); router.push('/orders'); }} 
                      className="mt-1 text-xs bg-gray-900 hover:bg-black text-white font-medium px-4 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Package size={14} /> Lihat Riwayat & Status Pesanan
                    </button>
                  )}
                  <button 
                    onClick={() => setIsCartOpen(false)} 
                    className="mt-2 text-xs font-bold underline underline-offset-4 hover:text-gray-600 transition-colors"
                  >
                    Lanjutkan Belanja
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartItemId || item.id} className="flex gap-4 border border-gray-200 bg-white p-3 rounded-md shadow-sm">
                    <div className="w-20 h-24 bg-gray-100 relative shrink-0 rounded-sm overflow-hidden border border-gray-100">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-sm line-clamp-2 leading-snug">{item.name}</h4>
                        
                        {/* Variant Badges (Color & Size) */}
                        {(item.size || item.color) && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {item.color && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                {item.colorHex && (
                                  <span 
                                    className="w-2.5 h-2.5 rounded-full border border-gray-300 shrink-0" 
                                    style={{ backgroundColor: item.colorHex }} 
                                  />
                                )}
                                Warna: {item.color}
                              </span>
                            )}
                            {item.size && (
                              <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                Size: {item.size}
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-sm font-black mt-2 text-gray-900">Rp {item.price.toLocaleString('id-ID')}</p>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-gray-200 rounded bg-gray-50 overflow-hidden shadow-xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.cartItemId || item.id, item.quantity - 1)}
                            className="w-7 h-6 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-200 hover:text-black transition-colors"
                            title="Kurangi kuantitas"
                          >
                            -
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.cartItemId || item.id, item.quantity + 1)}
                            className="w-7 h-6 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-200 hover:text-black transition-colors"
                            title="Tambah kuantitas"
                          >
                            +
                          </button>
                        </div>

                        <button 
                          type="button"
                          onClick={() => removeFromCart(item.cartItemId || item.id)} 
                          className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                          title="Hapus varian ini"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-600 uppercase text-xs tracking-wider">Subtotal Belanja</span>
                  <span className="font-black text-xl text-black">Rp {total.toLocaleString('id-ID')}</span>
                </div>
                <button 
                  onClick={handleProceedToShipping}
                  className="w-full bg-black text-white py-3.5 rounded-sm text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Lanjut ke Pengiriman & Checkout</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          /* Step 2: Shipping Zone & Address Snapshot Form */
          <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white">
            <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-gray-50/50">
              {/* Guest Checkout Notice Banner */}
              {!user && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-3 text-xs flex items-center justify-between gap-3 text-amber-900">
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none">👤</span>
                    <div>
                      <p className="font-bold">Beli Langsung (Guest Checkout)</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Anda dapat checkout tanpa login. Sudah punya akun?
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => openAuthModal()}
                    className="shrink-0 text-[11px] font-black underline hover:text-black uppercase tracking-wider py-1 cursor-pointer"
                  >
                    Login di Sini
                  </button>
                </div>
              )}

              {/* Pilihan Zonasi Pengiriman */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2">
                  1. Pilih Metode Pengiriman
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Ambil di Toko */}
                  <label 
                    onClick={() => setShippingZone('STORE_PICKUP')}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      shippingZone === 'STORE_PICKUP' 
                        ? 'border-black bg-white shadow-xs ring-1 ring-black' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="shippingZone" 
                      checked={shippingZone === 'STORE_PICKUP'} 
                      onChange={() => setShippingZone('STORE_PICKUP')}
                      className="mt-0.5" 
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <Store size={14} className="text-gray-700" />
                          Ambil di Galeri Kyabel Bojonegoro
                        </span>
                        <span className="text-xs font-black text-emerald-600">GRATIS</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">Ambil langsung di toko fisik Jl. Panglima Polim</p>
                    </div>
                  </label>

                  {/* Jawa Timur */}
                  <label 
                    onClick={() => setShippingZone('JATIM')}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      shippingZone === 'JATIM' 
                        ? 'border-black bg-white shadow-xs ring-1 ring-black' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="shippingZone" 
                      checked={shippingZone === 'JATIM'} 
                      onChange={() => setShippingZone('JATIM')}
                      className="mt-0.5" 
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <Truck size={14} className="text-blue-600" />
                          Jawa Timur (Reguler)
                        </span>
                        {isJatimFreePromo ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] line-through text-gray-400">Rp 10.000</span>
                            <span className="text-xs font-black text-emerald-600">Rp 0 (PROMO)</span>
                          </div>
                        ) : (
                          <span className="text-xs font-black text-gray-900">Rp 10.000</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {isJatimFreePromo 
                          ? '🎉 Belanja ≥ Rp 200rb, subsidi ongkir 100% aktif!' 
                          : 'Tarif flat reguler ekspedisi se-Jatim'}
                      </p>
                    </div>
                  </label>

                  {/* Jawa Non Jatim */}
                  <label 
                    onClick={() => setShippingZone('JAWA_NON_JATIM')}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      shippingZone === 'JAWA_NON_JATIM' 
                        ? 'border-black bg-white shadow-xs ring-1 ring-black' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="shippingZone" 
                      checked={shippingZone === 'JAWA_NON_JATIM'} 
                      onChange={() => setShippingZone('JAWA_NON_JATIM')}
                      className="mt-0.5" 
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <Truck size={14} className="text-indigo-600" />
                          Jabar / Jabodetabek / Jateng
                        </span>
                        <span className="text-xs font-black text-gray-900">Rp 18.000</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">Tarif flat reguler seluruh wilayah Pulau Jawa</p>
                    </div>
                  </label>

                  {/* Luar Jawa */}
                  <label 
                    onClick={() => setShippingZone('LUAR_JAWA')}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      shippingZone === 'LUAR_JAWA' 
                        ? 'border-black bg-white shadow-xs ring-1 ring-black' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="shippingZone" 
                      checked={shippingZone === 'LUAR_JAWA'} 
                      onChange={() => setShippingZone('LUAR_JAWA')}
                      className="mt-0.5" 
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <Truck size={14} className="text-purple-600" />
                          Luar Pulau Jawa
                        </span>
                        <span className="text-xs font-black text-gray-900">Rp 35.000</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">Tarif flat reguler ekspedisi antar pulau ke seluruh Indonesia</p>
                    </div>
                  </label>
                </div>

                {/* Pilihan Partner Kurir Ekspedisi */}
                {shippingZone !== 'STORE_PICKUP' && (
                  <div className="mt-3.5 pt-3 border-t border-gray-100">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                      Partner Ekspedisi Kurir
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'J&T Express', label: 'J&T Express', desc: '1-2 Hari' },
                        { id: 'JNE Express', label: 'JNE Reguler', desc: '2-3 Hari' },
                        { id: 'SiCepat Ekspres', label: 'SiCepat', desc: '1-3 Hari' },
                      ].map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setSelectedCourier(c.id as any)}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            selectedCourier === c.id
                              ? 'border-black bg-white ring-1 ring-black shadow-xs'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <span className="text-[11px] font-bold text-gray-900 block truncate">{c.label}</span>
                          <span className="text-[10px] text-gray-500 block mt-0.5">{c.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Data Alamat Snapshot */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-700">
                    {shippingZone === 'STORE_PICKUP' ? '2. Data Verifikasi Pengambil' : '2. Alamat Penerima (Snapshot)'}
                  </label>

                  {/* Selector Alamat Tersimpan jika ada */}
                  {savedAddresses.length > 0 && shippingZone !== 'STORE_PICKUP' && (
                    <div className="relative">
                      <select 
                        onChange={(e) => {
                          const chosen = savedAddresses.find((a: any) => a.id === e.target.value);
                          if (chosen) handleSelectSavedAddress(chosen);
                        }}
                        className="text-[11px] bg-white border border-gray-300 rounded px-2 py-1 text-gray-700 font-bold focus:outline-none"
                      >
                        <option value="">Gunakan Alamat Tersimpan...</option>
                        {savedAddresses.map((addr: any) => (
                          <option key={addr.id} value={addr.id}>
                            {addr.recipientName} ({addr.city}) {addr.isDefault ? '★' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {shippingZone === 'STORE_PICKUP' ? (
                  <div className="space-y-3 bg-white p-3.5 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-2 bg-gray-50 p-2.5 rounded text-[11px] text-gray-600 border border-gray-100">
                      <MapPin size={16} className="text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-gray-800">Galeri Kyabel Bojonegoro</p>
                        <p>Jl. Panglima Polim, Sukorejo, Bojonegoro, Jawa Timur 62111</p>
                        <p className="text-gray-500 mt-0.5">Buka Setiap Hari: 10.00 - 21.00 WIB</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Nama Lengkap Pengambil</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Nama pengambil barang"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:outline-none focus:border-black font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">No. WhatsApp / HP *</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="Contoh: 081234567890"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:outline-none focus:border-black font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">
                        Email {user ? '' : '(Opsional - Untuk Nota & Resi Digital)'}
                      </label>
                      <input 
                        type="email" 
                        placeholder="nama@email.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:outline-none focus:border-black font-medium"
                      />
                    </div>

                    {/* Opsi Metode Pembayaran Ambil di Galeri */}
                    <div className="pt-2 border-t border-gray-100">
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Metode Pembayaran Ambil di Toko</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label 
                          onClick={() => setPaymentMethod('CASH_ON_PICKUP')}
                          className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition-all ${
                            paymentMethod === 'CASH_ON_PICKUP' 
                              ? 'border-black bg-gray-50 ring-1 ring-black' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="storePaymentMethod" 
                            checked={paymentMethod === 'CASH_ON_PICKUP'}
                            onChange={() => setPaymentMethod('CASH_ON_PICKUP')}
                            className="mt-0.5 accent-black"
                          />
                          <div>
                            <p className="text-xs font-bold text-gray-900">💵 Bayar di Galeri</p>
                            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Bayar tunai/QRIS di kasir saat mengambil pakaian</p>
                          </div>
                        </label>

                        <label 
                          onClick={() => setPaymentMethod('ONLINE')}
                          className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition-all ${
                            paymentMethod === 'ONLINE' 
                              ? 'border-black bg-gray-50 ring-1 ring-black' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="storePaymentMethod" 
                            checked={paymentMethod === 'ONLINE'}
                            onChange={() => setPaymentMethod('ONLINE')}
                            className="mt-0.5 accent-black"
                          />
                          <div>
                            <p className="text-xs font-bold text-gray-900">🌐 Bayar Online</p>
                            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Transfer Bank / QRIS via Midtrans</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-white p-3.5 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Nama Penerima *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Nama lengkap"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:outline-none focus:border-black font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">No. WhatsApp *</label>
                        <input 
                          type="tel" 
                          required
                          placeholder="08xxxxxxxxxx"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:outline-none focus:border-black font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Kota / Kabupaten *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Contoh: Surabaya / Bojonegoro"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:outline-none focus:border-black font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Kode Pos</label>
                        <input 
                          type="text" 
                          placeholder="62111"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:outline-none focus:border-black font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Alamat Lengkap *</label>
                      <textarea 
                        required
                        rows={2}
                        placeholder="Nama Jalan, No. Rumah, RT/RW, Kecamatan, Kelurahan, Patokan"
                        value={fullAddress}
                        onChange={(e) => setFullAddress(e.target.value)}
                        className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:outline-none focus:border-black font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">
                        Email {user ? '' : '(Opsional - Untuk Nota & Resi Digital)'}
                      </label>
                      <input 
                        type="email" 
                        placeholder="nama@email.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:outline-none focus:border-black font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Catatan Kurir (Opsional)</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: Rumah pagar hitam / Titip security"
                        value={courierNote}
                        onChange={(e) => setCourierNote(e.target.value)}
                        className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded focus:bg-white focus:outline-none focus:border-black font-medium"
                      />
                    </div>

                    {user && (
                      <label className="flex items-center gap-2 pt-1 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={saveAddressToBook} 
                          onChange={(e) => setSaveAddressToBook(e.target.checked)}
                          className="rounded text-black focus:ring-black h-3.5 w-3.5 accent-black"
                        />
                        <span className="text-[11px] font-medium text-gray-700">Simpan alamat ini ke buku alamat profil saya</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2 Footer: Ringkasan Rinci & Tombol Bayar */}
            <div className="p-4 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="space-y-1.5 mb-3 text-xs">
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Subtotal Produk</span>
                  <span>Rp {total.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Ongkos Kirim ({shippingZone === 'STORE_PICKUP' ? 'Ambil Toko' : `${selectedCourier}`})</span>
                  {currentShippingFee === 0 ? (
                    <span className="font-bold text-emerald-600">
                      {shippingZone === 'STORE_PICKUP' ? 'Rp 0' : 'GRATIS (Promo)'}
                    </span>
                  ) : (
                    <span>Rp {currentShippingFee.toLocaleString('id-ID')}</span>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="font-black uppercase tracking-wider text-gray-900 text-xs">Total Pembayaran</span>
                  <span className="font-black text-lg text-red-600">Rp {grandTotal.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <button 
                onClick={handleFinalCheckout}
                disabled={isCheckingOut}
                className="w-full bg-red-600 text-white py-3.5 rounded-sm text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck size={16} />
                <span>
                  {isCheckingOut 
                    ? 'Memproses Pesanan...' 
                    : (shippingZone === 'STORE_PICKUP' && paymentMethod === 'CASH_ON_PICKUP')
                      ? `Pesan & Ambil di Toko (Rp ${grandTotal.toLocaleString('id-ID')})`
                      : `Bayar Sekarang (Rp ${grandTotal.toLocaleString('id-ID')})`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
