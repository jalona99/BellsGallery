import Link from 'next/link';
import AddToCartButton from './AddToCartButton';
import { Star, Sparkles } from 'lucide-react';
import ProductGallery from '@/components/ProductGallery';

async function getProduct(id: string) {
  try {
    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
    const res = await fetch(`${apiUrl}/api/products/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return <div className="container mx-auto p-8 text-center text-xl">Produk tidak ditemukan.</div>;
  }

  return (
    <div className="container mx-auto px-4 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
        
        {/* Kolom Kiri: Grid Gambar VFR & Galeri */}
        <div className="w-full lg:w-[60%]">
          <ProductGallery product={product} />
        </div>

        {/* Kolom Kanan: Info Produk & Transaksi */}
        <div className="w-full lg:w-[40%] flex flex-col pt-2 pb-12 sticky top-24 h-max">
          <div className="mb-4">
            {product.category === 'wanita' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 mb-3">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Koleksi Wanita
              </span>
            ) : product.category === 'pria' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200 mb-3">
                <span className="w-2 h-2 rounded-full bg-slate-700" />
                Koleksi Pria
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 mb-3">
                Koleksi Unisex
              </span>
            )}

            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-1">{product.name}</h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">PRODUCT ID: {product.id.split('-')[0].toUpperCase()}</p>
            
            <p className="text-3xl font-black text-gray-900">Rp {product.price.toLocaleString('id-ID')}</p>
          </div>
          
          <div className="prose prose-sm text-gray-600 mb-6 border-t border-gray-200 pt-4">
            <p>{product.description}</p>
          </div>

          <div className="space-y-3">
            <AddToCartButton product={product} />
            <Link
              href={`/try-on?garment=${encodeURIComponent(product.imageUrl)}&name=${encodeURIComponent(product.name)}&category=${encodeURIComponent(product.subcategory || product.category || 'tops')}`}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md border border-purple-500/30 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-purple-800 font-bold text-sm tracking-wide transition-all shadow-sm"
            >
              <Sparkles size={16} className="text-purple-600 animate-pulse" />
              <span>Coba di Fitting Studio (Live AR & AI HD)</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
