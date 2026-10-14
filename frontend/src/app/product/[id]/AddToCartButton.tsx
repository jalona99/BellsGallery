"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Heart, Upload, ChevronDown } from "lucide-react";
import { apiFetch } from "@/lib/api";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const COLORS = [
  { id: "18", name: "WINE", hex: "#6c2b3d" },
  { id: "00", name: "WHITE", hex: "#ffffff" },
  { id: "03", name: "GRAY", hex: "#d3d3d3" },
  { id: "09", name: "BLACK", hex: "#1a1a1a" },
  { id: "32", name: "BEIGE", hex: "#d4b895" },
  { id: "38", name: "DARK BROWN", hex: "#4a3525" },
  { id: "53", name: "GREEN", hex: "#f0f2c4" },
  { id: "69", name: "NAVY", hex: "#3b4f6b" },
];

export default function AddToCartButton({ product }: { product: any }) {
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [quantity, setQuantity] = useState(1);
  const [isAddingWishlist, setIsAddingWishlist] = useState(false);

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert("Silakan pilih ukuran terlebih dahulu.");
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      imageUrl: product.imageUrl,
      size: selectedSize,
      color: selectedColor.name,
      colorHex: selectedColor.hex,
    });
    alert(`Ditambahkan: ${quantity}x ${product.name} (Warna: ${selectedColor.name}, Ukuran: ${selectedSize})`);
  };

  const handleAddToWishlist = async () => {
    setIsAddingWishlist(true);
    try {
      const res = await apiFetch("/api/wishlists", {
        method: "POST",
        body: JSON.stringify({ productId: product.id }),
      });
      if (res.ok) {
        alert("Berhasil ditambahkan ke Wishlist!");
      } else if (res.status === 401) {
        alert("Silakan login terlebih dahulu untuk menyimpan ke Wishlist.");
      } else {
        alert("Gagal menambahkan ke Wishlist.");
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    } finally {
      setIsAddingWishlist(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Color Selector */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-gray-500 uppercase">Colour:</span>
          <span className="text-xs font-bold text-gray-900">{selectedColor.id} {selectedColor.name}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <button
              key={color.id}
              onClick={() => setSelectedColor(color)}
              style={{ backgroundColor: color.hex }}
              className={`w-9 h-9 rounded-sm border-2 shadow-sm transition-all ${
                selectedColor.id === color.id
                  ? "border-black outline outline-2 outline-offset-1 outline-gray-300"
                  : "border-gray-200 hover:border-gray-400"
              }`}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Size Selector */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase">Size:</span>
            <span className="text-xs font-bold text-gray-900">{selectedSize ? `Men ${selectedSize}` : "Belum dipilih"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SIZES.map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`min-w-[3rem] h-[3rem] flex items-center justify-center border text-sm font-semibold transition-all ${
                selectedSize === size
                  ? "border-black bg-black text-white"
                  : "border-gray-300 text-gray-700 hover:border-black bg-white"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <a href="#" className="text-xs font-medium text-gray-600 hover:underline flex items-center gap-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            Sizing
          </a>
        </div>
      </div>

      <div className="border-t border-gray-200"></div>

      {/* Action Row: Quantity & Add to Cart */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-medium text-gray-500">In stock</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center border border-gray-300 rounded-sm bg-gray-50/50">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-4 py-3 text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
            >
              -
            </button>
            <span className="w-8 text-center text-sm font-semibold bg-transparent">{quantity}</span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
              className="px-4 py-3 text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
            >
              +
            </button>
          </div>
          
          <button 
            onClick={handleAddToCart}
            className="flex-1 bg-black text-white py-3.5 px-6 rounded-sm text-sm font-bold tracking-widest hover:bg-gray-800 transition-all shadow-md active:translate-y-0.5"
          >
            ADD TO CART
          </button>
        </div>

        {/* Share & Wishlist Row */}
        <div className="flex gap-4 mt-2">
          <button className="w-12 h-12 flex items-center justify-center border border-gray-300 rounded-full hover:bg-gray-50 text-gray-700 transition-colors shrink-0">
            <Upload size={18} />
          </button>
          <button 
            onClick={handleAddToWishlist}
            disabled={isAddingWishlist}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-300 rounded-full hover:bg-gray-50 text-sm font-semibold text-gray-800 transition-colors disabled:opacity-50"
          >
            <Heart size={18} className="text-gray-600" />
            {isAddingWishlist ? "Menyimpan..." : "ADD TO WISHLIST"}
          </button>
        </div>

        <p className="text-xs text-blue-600 hover:underline cursor-pointer flex items-center gap-2 mt-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Use your coupon before it expires on 09/09/2026
        </p>
      </div>

    </div>
  );
}
