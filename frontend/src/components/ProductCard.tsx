"use client";

import { ShoppingBag, Camera, Heart, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useState } from "react";
import VirtualFittingRoom from "./VirtualFittingRoom";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

import { useRouter } from "next/navigation";
import { useTryonStore } from "@/lib/tryon-store";
import { useVtonStore } from "@/lib/store/useVtonStore";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  cutoutUrl?: string | null;
  category?: string;
  gender?: string;
  subcategory?: string;
  stock?: number;
}

export default function ProductCard({ 
  id, 
  name, 
  price, 
  imageUrl, 
  cutoutUrl, 
  category,
  gender,
  subcategory,
  stock
}: ProductCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { user, openAuthModal } = useAuth();
  const [isVFROpen, setIsVFROpen] = useState(false);
  const [isWishlisting, setIsWishlisting] = useState(false);

  const handleOpenFitting = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let cutout = cutoutUrl || imageUrl;
    if (!cutoutUrl) {
      if (imageUrl.includes("kaos-kuning-77-wanita")) {
        cutout = "/products/kaos-kuning-77-wanita-cutout.png";
      } else if (imageUrl.includes("kaos-kuning-77")) {
        cutout = "/products/kaos-kuning-77-cutout.png";
      } else if (imageUrl.includes("sweater-candy-cane")) {
        cutout = "/products/sweater-candy-cane.png";
      }
    }

    // 1. Inisialisasi di AR Store
    useTryonStore.getState().selectGarment({
      id: name,
      name: name,
      src: cutout,
      width: 554,
      height: 554,
      category: "tops",
    });

    // 2. Pre-populate di Photo Try-On Store
    if (typeof window !== "undefined") {
      fetch(cutout)
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (blob) {
            const ext = blob.type.includes("png") ? "png" : "jpg";
            const file = new File([blob], `${name}.${ext}`, { type: blob.type });
            useVtonStore.getState().setGarmentFile(file);
          }
        })
        .catch((err) => {
          console.warn("Auto pre-fill VTON garment failed:", err);
        });
    }

    // 3. Langsung arahkan ke Fitting Studio dengan parameter produk
    router.push(
      `/try-on?garment=${encodeURIComponent(imageUrl)}&cutout=${encodeURIComponent(cutout)}&name=${encodeURIComponent(name)}&category=${encodeURIComponent(category || 'kaos')}`
    );
  };

  const handleAddToCart = () => {
    addToCart({
      id,
      name,
      price,
      quantity: 1,
      imageUrl
    });
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    setIsWishlisting(true);
    try {
      const res = await apiFetch("/api/wishlists/toggle", {
        method: "POST",
        body: JSON.stringify({ productId: id })
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message); // Simple alert to show success
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsWishlisting(false);
    }
  };

  const isWanita = gender?.toLowerCase() === 'wanita' || category?.toLowerCase() === 'wanita';
  const isPria = gender?.toLowerCase() === 'pria' || category?.toLowerCase() === 'pria';

  return (
    <>
      <div className="group flex flex-col relative w-full overflow-hidden transition-all duration-300">
        {/* Quick Coba Virtual Badge */}
        <button 
          onClick={handleOpenFitting}
          className="absolute top-2.5 left-2.5 z-10 bg-neutral-950/75 hover:bg-neutral-950/90 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Coba pakaian ini di tubuh Anda secara virtual (Live AR & HD)"
        >
          <Sparkles size={12} className="text-amber-300 animate-pulse" />
          <span>Coba Virtual</span>
        </button>

        {/* Wishlist Button */}
        <button 
          onClick={handleToggleWishlist}
          disabled={isWishlisting}
          className="absolute top-2.5 right-2.5 z-10 bg-white/80 hover:bg-white backdrop-blur-md p-2 rounded-full hover:text-red-500 transition-all shadow-sm opacity-90 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-50"
          title="Add to Wishlist"
        >
          <Heart size={16} className="text-neutral-700 hover:text-red-500 transition-colors" />
        </button>

        <Link href={`/product/${id}`} className="block relative aspect-[3/4] overflow-hidden bg-neutral-100 rounded-2xl">
          <img 
            src={imageUrl} 
            alt={name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-in-out"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
        </Link>
        
        {/* Action Buttons: Sleek overlay on mobile & desktop */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-2 transition-all duration-300 pointer-events-none opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-2 sm:group-hover:translate-y-0 z-10">
          <button 
            onClick={handleOpenFitting}
            className="pointer-events-auto flex-1 bg-white/95 hover:bg-white text-neutral-900 font-bold text-xs py-2.5 px-3 rounded-xl shadow-lg backdrop-blur-md flex items-center justify-center gap-1.5 border border-black/5 active:scale-95 transition-all cursor-pointer"
            title="Coba Virtual Fitting (Live AR & Photo HD)"
          >
            <Sparkles size={13} className="text-purple-600" />
            <span>Fitting AR & HD</span>
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); handleAddToCart(); }}
            className="pointer-events-auto bg-neutral-900/95 hover:bg-black text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
            title="Tambah ke Keranjang"
          >
            <ShoppingBag size={14} />
          </button>
        </div>
        
        <Link href={`/product/${id}`} className="py-3.5 flex flex-col flex-grow">
          {/* Header Tag & Stock */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            {isWanita ? (
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Koleksi Wanita
              </span>
            ) : isPria ? (
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                Koleksi Pria
              </span>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                Koleksi Unisex
              </span>
            )}

            {stock !== undefined && (
              <span className={`text-[10px] font-semibold ${stock <= 5 ? 'text-amber-600 font-bold' : 'text-gray-400'}`}>
                {stock <= 5 ? `Sisa ${stock} pcs!` : `Stok: ${stock}`}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-800 text-sm md:text-base leading-snug mb-1.5 line-clamp-2 group-hover:text-black group-hover:underline transition-colors">
            {name}
          </h3>

          {/* Sizes Tag */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            <span className="text-gray-400 text-[11px] font-medium tracking-wider">S · M · L · XL</span>
          </div>

          <div className="mt-auto flex items-baseline justify-between pt-1 border-t border-gray-100">
            <p className="font-extrabold text-gray-900 text-base md:text-lg">
              Rp {price.toLocaleString('id-ID')}
            </p>
            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              Live AR
            </span>
          </div>
        </Link>
      </div>

      <VirtualFittingRoom 
        isOpen={isVFROpen} 
        onClose={() => setIsVFROpen(false)} 
        productName={name} 
        productImageUrl={imageUrl}
        category={category || "upper"}
      />
    </>
  );
}
