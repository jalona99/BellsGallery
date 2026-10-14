import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import { ArrowUpDown } from 'lucide-react';

async function getProducts() {
  try {
    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
    const res = await fetch(`${apiUrl}/api/products`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sub?: string; sort?: string }>;
}) {
  const resolvedParams = await searchParams;
  const rawProducts = await getProducts();

  const query = resolvedParams.q?.toLowerCase();
  // Default to 'all' if no category is selected
  const activeCategory = resolvedParams.category?.toLowerCase() || 'all';
  const sub = resolvedParams.sub?.toLowerCase() || '';
  const sort = resolvedParams.sort?.toLowerCase() || 'latest';

  const isSearch = !!query;

  // Total counts across entire catalog for badges
  const totalCount = rawProducts.length;
  const priaCount = rawProducts.filter((p: any) => p.category?.toLowerCase() === 'pria').length;
  const wanitaCount = rawProducts.filter((p: any) => p.category?.toLowerCase() === 'wanita').length;

  // Filter products
  let products = [...rawProducts];

  if (isSearch) {
    products = products.filter((p: any) => 
      p.name.toLowerCase().includes(query) || 
      p.description?.toLowerCase().includes(query)
    );
  } else if (activeCategory !== 'all') {
    products = products.filter((p: any) => p.category?.toLowerCase() === activeCategory);
  }

  // Subcategory filter
  if (sub && sub !== 'all') {
    products = products.filter((p: any) => p.subcategory?.toLowerCase() === sub);
  }

  // Sorting
  if (sort === 'price-low') {
    products.sort((a: any, b: any) => Number(a.price) - Number(b.price));
  } else if (sort === 'price-high') {
    products.sort((a: any, b: any) => Number(b.price) - Number(a.price));
  } else {
    // Latest / default
    products.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // --- UI DATA ---
  const videoUrls = {
    all: {
      src: "",
      poster: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
      youtubeId: "zI_sjJY5aro" // Generic shopping/lifestyle stock footage
    },
    wanita: {
      src: "https://videos.pexels.com/video-files/5825700/5825700-uhd_2560_1440_25fps.mp4", 
      poster: "https://images.unsplash.com/photo-1483985988355-763728e1935b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
      youtubeId: "7BGn_5FaHJk"
    },
    pria: {
      src: "https://videos.pexels.com/video-files/2909914/2909914-hd_1920_1080_24fps.mp4",
      poster: "https://images.unsplash.com/photo-1617137968427-85924c800a22?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
      youtubeId: "MbrE3VIfSsM"
    }
  };

  const currentMedia = activeCategory === 'pria' ? videoUrls.pria : (activeCategory === 'wanita' ? videoUrls.wanita : videoUrls.all);

  const priaTabs = [
    { label: 'Kaos', value: 'kaos', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop' },
    { label: 'Kemeja', value: 'kemeja', image: 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=100&h=100&fit=crop' },
    { label: 'Outerwear', value: 'jaket', image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=100&h=100&fit=crop' },
    { label: 'Celana', value: 'celana', image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=100&h=100&fit=crop' },
    { label: 'Sepatu', value: 'sepatu', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=100&h=100&fit=crop' },
    { label: 'Aksesoris', value: 'topi', image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=100&h=100&fit=crop' },
  ];
  
  const wanitaTabs = [
    { label: 'Kaos', value: 'kaos', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=100&h=100&fit=crop' },
    { label: 'Kemeja & Blus', value: 'kemeja', image: 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=100&h=100&fit=crop' },
    { label: 'Dress', value: 'dress', image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=100&h=100&fit=crop' },
    { label: 'Bawahan', value: 'celana', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=100&h=100&fit=crop' },
    { label: 'Outerwear', value: 'jaket', image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=100&h=100&fit=crop' },
    { label: 'Tas', value: 'tas', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=100&h=100&fit=crop' },
  ];

  const allTabs = [
    { label: 'Kaos', value: 'kaos', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop' },
    { label: 'Kemeja', value: 'kemeja', image: 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=100&h=100&fit=crop' },
    { label: 'Outerwear', value: 'jaket', image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=100&h=100&fit=crop' },
    { label: 'Celana', value: 'celana', image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=100&h=100&fit=crop' },
    { label: 'Dress', value: 'dress', image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=100&h=100&fit=crop' },
    { label: 'Aksesoris', value: 'topi', image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=100&h=100&fit=crop' },
  ];

  const currentTabs = activeCategory === 'pria' ? priaTabs : (activeCategory === 'wanita' ? wanitaTabs : allTabs);

  // Helper to construct query strings cleanly
  const buildUrl = (newParams: { category?: string; sub?: string; sort?: string }) => {
    const params = new URLSearchParams();
    const cat = newParams.category !== undefined ? newParams.category : activeCategory;
    const s = newParams.sub !== undefined ? newParams.sub : sub;
    const so = newParams.sort !== undefined ? newParams.sort : sort;

    if (cat && cat !== 'all') params.set('category', cat);
    if (s && s !== 'all') params.set('sub', s);
    if (so && so !== 'latest') params.set('sort', so);
    if (query) params.set('q', query);

    const str = params.toString();
    return str ? `/?${str}` : '/';
  };

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* 1. HERO VIDEO SECTION (Hidden if searching) */}
      {!isSearch && (
        <section className="relative w-full h-[55vh] md:h-[75vh] bg-black overflow-hidden group animate-fade-in pointer-events-none">
          <iframe 
            src={`https://www.youtube.com/embed/${currentMedia.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${currentMedia.youtubeId}&start=25&controls=0&showinfo=0&autohide=1&modestbranding=1&playsinline=1`}
            allow="autoplay; encrypted-media" 
            className="absolute top-1/2 left-1/2 w-[150vw] h-[150vw] min-h-[100vh] min-w-[177vh] -translate-x-1/2 -translate-y-1/2 opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          
          <div className="absolute bottom-10 left-6 md:left-12 text-white animate-fade-in-up">
            <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-tight drop-shadow-xl text-white">
              {activeCategory === 'all' 
                ? 'Koleksi BELLSGALLERY' 
                : (activeCategory === 'pria' ? 'Gaya Kasual Pria' : 'Pesona Elegan Wanita')}
            </h1>
            <p className="text-sm md:text-base font-medium drop-shadow max-w-lg text-gray-200 leading-relaxed">
              Koleksi pakaian terkurasi dengan potongan presisi gender, siluet elegan, dan dukungan fitur fitting virtual Live AR & AI HD.
            </p>
          </div>
        </section>
      )}

      {/* 2. CATEGORY THUMBNAILS (Horizontal Scroll / Grid) */}
      {!isSearch && (
        <section className="w-full bg-white border-b border-gray-100 py-8 md:py-10">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-gray-500">
                Telusuri Berdasarkan Kategori
              </h3>
              {sub && (
                <Link href={buildUrl({ sub: '' })} scroll={false} className="text-xs text-rose-600 font-semibold hover:underline">
                  Reset Kategori (Lihat Semua)
                </Link>
              )}
            </div>
            
            <div 
              className="flex overflow-x-auto hide-scrollbar no-scrollbar gap-6 md:gap-8 justify-start md:justify-center items-start px-2 pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* "All" bubble */}
              <Link href={buildUrl({ sub: '' })} scroll={false} className="flex flex-col items-center gap-2.5 group min-w-fit shrink-0">
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border transition-all ${!sub ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2 shadow-md' : 'border-gray-200 group-hover:border-gray-400'}`}>
                  <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-700 text-white flex items-center justify-center font-extrabold text-xs tracking-widest">
                    ALL
                  </div>
                </div>
                <span className={`text-xs md:text-sm font-semibold transition-colors ${!sub ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-900'}`}>
                  Semua
                </span>
              </Link>

              {currentTabs.map((tab) => {
                const isActive = sub === tab.value;
                return (
                  <Link href={buildUrl({ sub: tab.value })} scroll={false} key={tab.value} className="flex flex-col items-center gap-2.5 group min-w-fit shrink-0">
                    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border transition-all ${isActive ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2 shadow-md' : 'border-gray-200 group-hover:border-gray-400'}`}>
                      <img src={tab.image} alt={tab.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    </div>
                    <span className={`text-xs md:text-sm font-semibold transition-colors ${isActive ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-900'}`}>
                      {tab.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 3. PRODUCT GRID SECTION */}
      <section className="w-full max-w-[1440px] px-4 py-8 md:py-14 lg:px-8 mx-auto">
        
        {/* SECTION HEADER & GENDER SEGMENTED TABS */}
        <div className="flex flex-col gap-6 mb-8 border-b border-gray-100 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-black"></span>
                <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Pilihan Teratas</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-black tracking-tight text-gray-900">
                {isSearch 
                  ? `Hasil Pencarian: "${query}"` 
                  : (activeCategory === 'all' 
                      ? 'Top Produk' 
                      : (activeCategory === 'pria' ? 'Koleksi Pria' : 'Koleksi Wanita'))}
              </h2>
            </div>

            {/* GENDER FILTER PILLS (Top Produk, Pria, Wanita) */}
            <div className="flex items-center bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200/80 shadow-inner w-full md:w-auto">
              <Link 
                href={buildUrl({ category: 'all' })}
                scroll={false}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === 'all' 
                    ? 'bg-black text-white shadow-md' 
                    : 'text-gray-600 hover:text-black hover:bg-white/60'
                }`}
              >
                <span>Top Produk</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {totalCount}
                </span>
              </Link>

              <Link 
                href={buildUrl({ category: 'pria' })}
                scroll={false}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === 'pria' 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'text-gray-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>Pria</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeCategory === 'pria' ? 'bg-cyan-400 text-slate-900 font-extrabold' : 'bg-gray-200 text-gray-700'}`}>
                  {priaCount}
                </span>
              </Link>

              <Link 
                href={buildUrl({ category: 'wanita' })}
                scroll={false}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === 'wanita' 
                    ? 'bg-rose-600 text-white shadow-md' 
                    : 'text-gray-600 hover:text-rose-600 hover:bg-white/60'
                }`}
              >
                <span>Wanita</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeCategory === 'wanita' ? 'bg-white text-rose-700 font-extrabold' : 'bg-gray-200 text-gray-700'}`}>
                  {wanitaCount}
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Result Counter & Sorting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 text-sm text-gray-500">
          <div className="flex items-center gap-3">
            <span>Menampilkan <strong className="text-gray-900">{products.length}</strong> produk</span>
            {activeCategory !== 'all' && (
              <Link href={buildUrl({ category: 'all' })} scroll={false} className="text-xs text-black font-semibold hover:underline">
                Hapus Filter Gender ✕
              </Link>
            )}
          </div>

          {/* Sorting Chips */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown size={12} />
              Urutan:
            </span>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-semibold">
              <Link 
                href={buildUrl({ sort: 'latest' })}
                scroll={false}
                className={`px-2.5 py-1 rounded-md transition-all ${sort === 'latest' ? 'bg-white text-black shadow-xs font-bold' : 'text-gray-500 hover:text-black'}`}
              >
                Terbaru
              </Link>
              <Link 
                href={buildUrl({ sort: 'price-low' })}
                scroll={false}
                className={`px-2.5 py-1 rounded-md transition-all ${sort === 'price-low' ? 'bg-white text-black shadow-xs font-bold' : 'text-gray-500 hover:text-black'}`}
              >
                Harga Rendah
              </Link>
              <Link 
                href={buildUrl({ sort: 'price-high' })}
                scroll={false}
                className={`px-2.5 py-1 rounded-md transition-all ${sort === 'price-high' ? 'bg-white text-black shadow-xs font-bold' : 'text-gray-500 hover:text-black'}`}
              >
                Harga Tinggi
              </Link>
            </div>
          </div>
        </div>
        
        {products.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200">
            <p className="text-gray-500 text-lg mb-4 font-semibold">Produk tidak ditemukan pada filter ini.</p>
            <p className="text-sm text-gray-400 mb-6">Coba ganti kategori, subkategori, atau kata kunci pencarian Anda.</p>
            <Link 
              href="/" 
              className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors inline-block rounded-xl shadow-md"
            >
              Reset Semua Filter
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14">
            {products.map((product: any) => (
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
        )}
      </section>

    </div>
  );
}

