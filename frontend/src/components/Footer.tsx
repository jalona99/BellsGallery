"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { 
  ShieldCheck, 
  Phone, 
  Mail, 
  Clock, 
  ExternalLink, 
  ShoppingBag, 
  MapPin, 
  PackageSearch,
  Ruler,
  RotateCcw,
  HelpCircle,
  Sparkles
} from "lucide-react";

export default function Footer() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  if (pathname === '/try-on') return null;

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await apiFetch("/api/newsletter", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Terjadi kesalahan");

      setStatus("success");
      setMessage(data.message || "Terima kasih telah mendaftar!");
      setEmail("");
      setTimeout(() => {
        setMessage("");
        setStatus("idle");
      }, 5000);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Gagal mendaftar newsletter");
      setTimeout(() => {
        setMessage("");
        setStatus("idle");
      }, 5000);
    }
  };

  return (
    <footer className="footer-container bg-[#0f0f11] text-gray-300 border-t border-neutral-800 font-sans mt-auto">
      {/* Toast Notification */}
      <div 
        className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 z-[9999] shadow-2xl flex items-center gap-2 ${
          message ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'
        } ${status === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
      >
        <span>{message}</span>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 lg:py-16">
        
        {/* Main 3 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12 pb-12 border-b border-neutral-800/80">
          
          {/* [ Kolom 1: Profil & Legal ] */}
          <div className="flex flex-col space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-widest text-white uppercase">
                  BellsGallery
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                  Original 98%
                </span>
              </div>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=Galeri+Kyabel,+Sugihwaras,+Kapas,+Bojonegoro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neutral-400 hover:text-white mt-1 flex items-center gap-1 transition-colors group cursor-pointer inline-flex"
                title="Buka petunjuk arah di Google Maps"
              >
                <MapPin className="w-3.5 h-3.5 text-neutral-500 group-hover:text-red-400 transition-colors shrink-0" />
                <span className="group-hover:underline">Galeri Kyabel, Sugihwaras, Kapas, Bojonegoro</span>
              </a>

              {/* Embedded Interactive Google Map */}
              <div className="mt-3 overflow-hidden rounded-xl border border-neutral-800/90 bg-neutral-950 shadow-lg relative group">
                <div className="relative h-44 sm:h-48 w-full">
                  <iframe
                    title="Peta Lokasi Google Maps BellsGallery (Galeri Kyabel)"
                    src="https://maps.google.com/maps?q=Galeri+Kyabel,+Sugihwaras,+Kapas,+Bojonegoro&t=&z=16&ie=UTF8&iwloc=&output=embed"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <span className="bg-black/85 backdrop-blur-md text-[10px] font-medium text-neutral-200 px-2 py-1 rounded border border-neutral-700/80 shadow flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Galeri Kyabel (Toko Fisik)</span>
                    </span>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=Galeri+Kyabel,+Sugihwaras,+Kapas,+Bojonegoro"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pointer-events-auto bg-white/95 hover:bg-white text-black text-[10px] font-bold px-2.5 py-1 rounded shadow flex items-center gap-1 hover:scale-105 active:scale-95 transition-all"
                    >
                      <span>Buka Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-neutral-400 leading-relaxed">
              Butik rumahan independen yang menghadirkan koleksi pakaian <em>original</em> pilihan terkurasi dengan kondisi 98% seperti baru dengan harga bersahabat dan mengedepankan nilai kejujuran bagi pelanggan.
            </p>

            <div className="pt-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2.5">
                Legalitas & Kebijakan
              </h5>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link 
                    href="/info/kebijakan-privasi" 
                    className="text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Kebijakan Privasi</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/info/syarat-dan-ketentuan" 
                    className="text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Syarat & Ketentuan</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/info/informasi-perusahaan" 
                    className="text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Informasi Perusahaan</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/info/lokasi-toko" 
                    className="text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Lokasi Toko Fisik</span>
                  </Link>
                </li>
              </ul>
            </div>

            <div className="pt-2 text-xs text-neutral-500 font-medium">
              Hak Cipta &copy; 2026 BellsGallery. All rights reserved.
            </div>
          </div>

          {/* [ Kolom 2: Bantuan & FAQ ] */}
          <div className="flex flex-col space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white border-b border-neutral-800 pb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-neutral-400" />
              <span>Bantuan & FAQ</span>
            </h4>
            
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link 
                  href="/info/cara-pemesanan" 
                  className="text-neutral-300 hover:text-white transition-colors flex items-center justify-between group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Cara Pemesanan</span>
                  <span className="text-[11px] text-neutral-500 group-hover:text-neutral-300">Web / WA / Shopee</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/info/panduan-ukuran" 
                  className="text-neutral-300 hover:text-white transition-colors flex items-center justify-between group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Panduan Ukuran (Size Guide)</span>
                  <span className="text-[11px] text-neutral-500 group-hover:text-neutral-300">Fisik & AR Try-On</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/info/kebijakan-pengembalian" 
                  className="text-neutral-300 hover:text-white transition-colors flex items-center justify-between group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Kebijakan Pengembalian & Garansi</span>
                  <span className="text-[11px] text-neutral-500 group-hover:text-neutral-300">1x24 Jam Unboxing</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/orders" 
                  className="text-neutral-300 hover:text-white transition-colors flex items-center justify-between group"
                >
                  <span className="group-hover:translate-x-1 transition-transform font-medium text-emerald-400 flex items-center gap-1.5">
                    <PackageSearch className="w-3.5 h-3.5" />
                    <span>Lacak Pesanan (Cek Status)</span>
                  </span>
                  <span className="text-[11px] text-emerald-500/80 group-hover:text-emerald-400">Order ID Web</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/info/faq" 
                  className="text-neutral-300 hover:text-white transition-colors flex items-center justify-between group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Tanya Jawab (FAQ)</span>
                  <span className="text-[11px] text-neutral-500 group-hover:text-neutral-300">Sisa Pabrik 98%</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/info/virtual-fitting-room" 
                  className="text-neutral-300 hover:text-white transition-colors flex items-center justify-between group"
                >
                  <span className="group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Virtual Fitting Room</span>
                  </span>
                  <span className="text-[11px] text-neutral-500 group-hover:text-neutral-300">Web-AR Kamera</span>
                </Link>
              </li>
            </ul>

            {/* Shopee Integration Card */}
            <div className="mt-2 p-3.5 rounded-lg bg-gradient-to-br from-[#ee4d2d]/10 via-[#ee4d2d]/5 to-transparent border border-[#ee4d2d]/30 text-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <ShoppingBag className="w-4 h-4 text-[#ee4d2d]" />
                <span className="font-bold text-white tracking-wide">
                  Official Store Shopee
                </span>
                <span className="ml-auto text-[10px] bg-[#ee4d2d] text-white px-1.5 py-0.5 rounded font-semibold uppercase">
                  Lebih Aman
                </span>
              </div>
              <p className="text-neutral-400 leading-relaxed mb-2.5">
                Ingin belanja lebih terjamin dengan proteksi retur otomatis, diskon voucher, gratis ongkir, dan pelacakan kurir live? Belanja aman via Shopee BellsGallery.
              </p>
              <a 
                href="https://shopee.co.id" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1.5 font-bold text-[#ee4d2d] hover:text-[#ff6544] transition-colors"
              >
                <span>Buka Shopee BellsGallery (Toko Segera Hadir)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* [ Kolom 3: Layanan Pengaduan Konsumen ] */}
          <div className="flex flex-col space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white border-b border-neutral-800 pb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Layanan Pengaduan Konsumen</span>
            </h4>

            {/* Customer Service Internal */}
            <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-lg space-y-2">
              <div className="text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Customer Service BellsGallery</span>
              </div>
              <div className="space-y-1.5 text-xs text-neutral-300">
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>WhatsApp: <strong className="text-white">+62 8xx-xxxx-xxxx</strong> <span className="text-[10px] text-neutral-500">(Nanti diupdate)</span></span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Email: <a href="mailto:belssgalleryku@gmail.com" className="text-white hover:underline font-medium">belssgalleryku@gmail.com</a></span>
                </p>
                <p className="flex items-center gap-2 text-neutral-400">
                  <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span>Jam Layanan: <strong>Senin - Jumat, 09:00 - 17:00 WIB</strong></span>
                </p>
              </div>
            </div>

            {/* Direktorat Jenderal PKTN Kemendag RI */}
            <div className="bg-neutral-900/70 border border-neutral-800/80 p-4 rounded-lg space-y-2">
              <div className="text-white font-semibold text-xs leading-snug">
                Direktorat Jenderal Perlindungan Konsumen dan Tertib Niaga (Ditjen PKTN)
              </div>
              <p className="text-[11px] text-neutral-400">
                Kementerian Perdagangan Republik Indonesia
              </p>
              <div className="pt-1 text-xs">
                <p className="flex items-center gap-2 text-neutral-300">
                  <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>WhatsApp Resmi: <strong className="text-white">0853-1111-1010</strong></span>
                </p>
              </div>
              <p className="text-[10px] text-neutral-500 leading-relaxed pt-1.5 border-t border-neutral-800/70">
                *Pencantuman informasi ini sesuai mandat UU No. 8 Tahun 1999 tentang Perlindungan Konsumen &amp; Permendag RI No. 31 Tahun 2023.
              </p>
            </div>
          </div>

        </div>

        {/* Newsletter & Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="w-full md:w-auto">
            <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Newsletter &amp; Update Stok
            </h5>
            <p className="text-xs text-neutral-400">
              Dapatkan info rilisan pakaian original pilihan terkurasi dan promo eksklusif.
            </p>
          </div>

          <form onSubmit={handleNewsletterSubmit} className="flex w-full md:w-auto max-w-md gap-2">
            <input 
              type="email" 
              placeholder="Alamat Email Anda" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 min-w-[200px] px-3.5 py-2 bg-neutral-900 border border-neutral-700 rounded text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
              disabled={status === "loading"}
            />
            <button 
              type="submit" 
              disabled={status === "loading"}
              className="px-4 py-2 bg-white text-black text-xs font-bold rounded hover:bg-neutral-200 transition-colors disabled:opacity-50 shrink-0"
            >
              {status === "loading" ? "..." : "Daftar"}
            </button>
          </form>
        </div>

        {/* Sub-Footer Copyright & Links */}
        <div className="pt-6 mt-6 border-t border-neutral-900 flex flex-col sm:flex-row justify-between items-center text-xs text-neutral-500 gap-3">
          <p>Hak Cipta &copy; 2026 BellsGallery. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/info/kebijakan-privasi" className="hover:text-neutral-300 transition-colors">Kebijakan Privasi</Link>
            <span>&bull;</span>
            <Link href="/info/syarat-dan-ketentuan" className="hover:text-neutral-300 transition-colors">Syarat &amp; Ketentuan</Link>
            <span>&bull;</span>
            <Link href="/info/kebijakan-pengembalian" className="hover:text-neutral-300 transition-colors">Kebijakan Pengembalian</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
