"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

interface WishlistItem {
  id: string;
  product: Product;
}

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart } = useCart();

  const fetchWishlist = async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch('/api/wishlists');
      if (res.ok) {
        const data = await res.json();
        setWishlist(data.wishlist);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (productId: string) => {
    try {
      const res = await apiFetch('/api/wishlists/toggle', {
        method: 'POST',
        body: JSON.stringify({ productId })
      });
      if (res.ok) {
        fetchWishlist();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-3xl font-black mb-6 flex items-center gap-2"><Heart size={28} /> Wish list</h1>
      
      {isLoading ? (
        <p className="text-sm">Loading wishlist...</p>
      ) : wishlist.length === 0 ? (
        <div className="border-t border-gray-200 pt-8 text-gray-500">
          <p>Your wish list is empty.</p>
          <Link href="/" className="inline-block mt-4 border-b border-black text-black font-bold text-sm">
            CONTINUE SHOPPING
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 border-t border-gray-200 pt-8">
          {wishlist.map((item) => (
            <div key={item.id} className="group relative">
              <Link href={`/product/${item.product.id}`}>
                <div className="aspect-[3/4] bg-gray-100 overflow-hidden relative rounded-sm">
                  <img 
                    src={item.product.imageUrl} 
                    alt={item.product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </Link>
              
              <button 
                onClick={() => handleRemove(item.product.id)}
                className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm"
                title="Remove from wishlist"
              >
                <Trash2 size={16} />
              </button>

              <div className="mt-3">
                <Link href={`/product/${item.product.id}`}>
                  <h3 className="font-semibold text-sm line-clamp-1">{item.product.name}</h3>
                </Link>
                <p className="font-black text-sm mt-1">Rp {item.product.price.toLocaleString('id-ID')}</p>
                <button 
                  onClick={() => addToCart({
                    id: item.product.id,
                    name: item.product.name,
                    price: item.product.price,
                    quantity: 1,
                    imageUrl: item.product.imageUrl
                  })}
                  className="w-full mt-3 border border-black text-xs font-bold py-2 uppercase hover:bg-black hover:text-white transition-colors rounded-sm"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
