"use client";

import { useState } from "react";
import VirtualFittingRoom from "./VirtualFittingRoom";

export default function ProductGallery({ product }: { product: any }) {
  const [isVFROpen, setIsVFROpen] = useState(false);

  const galleryImages = [
    product.imageUrl,
    product.imageUrl,
    product.imageUrl,
    product.imageUrl,
    product.imageUrl,
    product.imageUrl
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-1 md:gap-2">
        {galleryImages.map((img, idx) => (
          <div key={idx} className="relative aspect-[3/4] bg-gray-100 flex items-center justify-center group overflow-hidden">
            {/* VFR Placeholder Button on Hover / Touch */}
            <div className="absolute inset-0 z-10 flex items-center justify-center opacity-100 md:opacity-0 md:hover:opacity-100 bg-black/10 transition-opacity duration-300">
              <button 
                onClick={(e) => { e.preventDefault(); setIsVFROpen(true); }}
                className="px-4 md:px-6 py-2 bg-white/90 backdrop-blur-sm text-black font-semibold uppercase text-xs tracking-wider shadow-md hover:bg-white rounded-sm"
              >
                Coba Virtual (VFR)
              </button>
            </div>
            {/* Hanger Icon */}
            <div className="absolute bottom-4 left-4 z-10 w-8 h-8 bg-black/80 rounded-full flex items-center justify-center text-white pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 16l-4-4 4-4"/><path d="M18 8l4 4-4 4"/><path d="M12 2v20"/></svg>
            </div>
            {/* Model Info Text */}
            <div className="absolute bottom-4 right-4 z-10 text-[10px] text-right text-gray-500 font-medium pointer-events-none">
              Model is 172 cm<br/>Wearing size: M
            </div>
            <img 
              src={img} 
              alt={`${product.name} View ${idx + 1}`} 
              className="object-cover w-full h-full mix-blend-multiply pointer-events-none"
            />
          </div>
        ))}
      </div>

      <VirtualFittingRoom 
        isOpen={isVFROpen} 
        onClose={() => setIsVFROpen(false)} 
        productName={product.name} 
        productImageUrl={product.imageUrl}
        category={product.subcategory || product.category || "upper"}
        model3dUrl={product.model3dUrl || null}
      />
    </>
  );
}
