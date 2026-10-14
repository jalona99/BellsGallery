"use client";

import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { useAuth } from "@/context/AuthContext";

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const url = user?.id 
          ? `http://127.0.0.1:3001/api/products/recommendations?userId=${user.id}`
          : `http://127.0.0.1:3001/api/products/recommendations`;
          
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setRecommendations(data);
        }
      } catch (err) {
        console.error("Error fetching recommendations", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [user?.id]);

  if (loading) {
    return (
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="text-2xl font-black mb-8 uppercase tracking-tighter">Rekomendasi Spesial Untuk Anda</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 h-64 rounded-sm"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <section className="py-12 bg-gray-50 border-b border-gray-200">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-black">
            Rekomendasi Spesial Untuk Anda
          </h2>
          <span className="text-xs font-bold bg-black text-white px-2 py-1 rounded-sm uppercase tracking-widest hidden md:inline-block">
            Berdasarkan Riwayat Anda
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {recommendations.map((product: any) => (
            <ProductCard 
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              imageUrl={product.imageUrl}
              cutoutUrl={product.cutoutUrl}
              category={product.subcategory || product.category || "upper"}
              gender={product.category}
              subcategory={product.subcategory}
              stock={product.inventory?.stock}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
