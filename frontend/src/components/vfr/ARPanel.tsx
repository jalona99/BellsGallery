'use client';

import React, { useRef, useState } from 'react';
import { useTryonStore } from '@/lib/tryon-store';
import { useVtonStore } from '@/lib/store/useVtonStore';
import { removeImageBackground } from '@/lib/autoCutout';
import { toast } from 'sonner';
import {
  Sparkles,
  RotateCcw,
  Eye,
  EyeOff,
  Activity,
  Sliders,
  Ruler,
  Shirt,
  Check,
  Upload,
  Loader2,
  Trash2,
} from 'lucide-react';

const CATALOG_GARMENTS = [
  {
    id: "T-Shirt Casual Kuning 77 (Wanita)",
    name: "T-Shirt Casual Kuning 77 (Wanita)",
    src: "/products/kaos-kuning-77-cutout.png",
    thumb: "/products/kaos-kuning-77.png",
    width: 554,
    height: 554,
    category: "tops" as const,
  },
  {
    id: "Kaos Kuning Graphic 77",
    name: "Kaos Kuning Graphic 77 (Pria)",
    src: "/products/kaos-kuning-77-cutout.png",
    thumb: "/products/kaos-kuning-77.png",
    width: 554,
    height: 554,
    category: "tops" as const,
  },
  {
    id: "Sweater Candy Cane",
    name: "Sweater Candy Cane",
    src: "/products/sweater-candy-cane.png",
    thumb: "/products/sweater-candy-cane.png",
    width: 554,
    height: 554,
    category: "tops" as const,
  },
];

export function ARPanel() {
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    transform,
    setTransform,
    mediaPipeEnabled,
    toggleMediaPipe,
    landmarksVisible,
    toggleLandmarks,
    measurementsVisible,
    toggleMeasurements,
    continuousTracking,
    toggleContinuousTracking,
    poseConfidence,
    resetToBaseline,
    garments,
    selectedGarmentId,
    selectGarment,
    removeGarment,
    clearCustomGarments,
  } = useTryonStore();

  const [deletedGarmentIds, setDeletedGarmentIds] = useState<string[]>([]);

  // Filter pakaian kustom & katalog (kecualikan item yang dihapus oleh user)
  const customGarments = garments.filter(
    (g) => !CATALOG_GARMENTS.some((cg) => cg.id === g.id || cg.src === g.src) && !deletedGarmentIds.includes(g.id)
  );

  const displayGarments = [
    ...CATALOG_GARMENTS.filter((cg) => !deletedGarmentIds.includes(cg.id)),
    ...customGarments.map((cg) => ({
      id: cg.id,
      name: cg.name,
      src: cg.src,
      thumb: cg.src,
      width: cg.width,
      height: cg.height,
      category: (cg.category || "tops") as "tops",
      isCustom: true,
    })),
  ];

  const selectedGarment = garments.find((g) => g.id === selectedGarmentId) ||
    displayGarments.find((g) => g.id === selectedGarmentId || g.name === selectedGarmentId);

  const handleDeleteGarment = (item: typeof displayGarments[0]) => {
    // 1. Masukkan ke daftar ID yang dihapus
    setDeletedGarmentIds((prev) => [...prev, item.id]);

    // 2. Hapus dari persistent storage tryon store
    removeGarment(item.id);

    // 3. Jika pakaian yang dihapus adalah pakaian yang sedang dipakai, alihkan ke pakaian pertama yang tersisa
    const remaining = displayGarments.filter((g) => g.id !== item.id);
    if (selectedGarmentId === item.id || selectedGarment?.name === item.name) {
      if (remaining.length > 0) {
        selectGarment(remaining[0]);
      } else {
        selectGarment(null);
      }
    }

    toast.success(`Pakaian "${item.name}" berhasil dihapus dari daftar.`);
  };

  const handleClearAllCustomGarments = () => {
    clearCustomGarments();
    setDeletedGarmentIds([]);
    toast.success('Semua riwayat pakaian yang pernah dicoba berhasil dibersihkan.');
  };

  const handleSelectCatalogGarment = (item: typeof displayGarments[0]) => {
    selectGarment(item);

    // Synchronize into Photo Try-On Store
    if (typeof window !== "undefined") {
      fetch(item.src)
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (blob) {
            const ext = blob.type.includes("png") ? "png" : "jpg";
            const file = new File([blob], `${item.name}.${ext}`, { type: blob.type });
            useVtonStore.getState().setGarmentFile(file);
          }
        })
        .catch((err) => {
          console.warn("Failed to sync garment to VTON store:", err);
        });
    }

    toast.success(`Pakaian terpilih: ${item.name}`);
  };

  const handleUploadGarment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRemovingBg(true);
    const toastId = toast.loading('Memproses foto baju Anda dengan AI Auto Cutout (In-Browser WASM)...');

    try {
      // 1. Potong background secara instan menggunakan In-Browser WebAssembly AI (@imgly/background-removal)
      const { file: cutoutFile, objectUrl } = await removeImageBackground(file, {
        onProgress: (pct, stage) => {
          toast.loading(`${stage} (${pct}%)`, { id: toastId });
        }
      });

      // 2. Baca dimensi gambar transparan
      const img = new window.Image();
      img.src = objectUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const newGarment = {
        id: `custom-${Date.now()}`,
        name: cleanName || 'Baju Kustom Anda',
        src: objectUrl,
        thumb: objectUrl,
        width: img.naturalWidth || 554,
        height: img.naturalHeight || 554,
        category: 'tops' as const,
      };

      // 3. Langsung terpasang di kamera Live AR!
      selectGarment(newGarment);

      // 4. Sinkronkan juga ke Photo Try-On Store
      useVtonStore.getState().setGarmentFile(cutoutFile);

      toast.success(
        `✨ AI Berhasil: Background foto "${cleanName}" berhasil dipotong dan langsung dipakai!`,
        { id: toastId }
      );
    } catch (err: any) {
      console.error('AI Cutout error:', err);
      toast.error(err.message || 'Gagal memotong background baju. Coba gunakan foto pakaian dengan pencahayaan jelas.', {
        id: toastId,
      });
    } finally {
      setIsRemovingBg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [showAdvanced, setShowAdvanced] = useState(false);

  const adjustScale = (delta: number) => {
    setTransform({
      scale: Math.max(0.4, Math.min(5.0, Number((transform.scale + delta).toFixed(2)))),
    });
  };

  const getConfidenceBadge = () => {
    switch (poseConfidence) {
      case 'Good':
        return (
          <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Posisi Tubuh Pas ✨
          </span>
        );
      case 'Okay':
        return (
          <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Posisi Cukup Baik
          </span>
        );
      default:
        return (
          <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            Arahkan Kamera ke Tubuh
          </span>
        );
    }
  };

  return (
    <div className="w-full h-full bg-neutral-900/95 lg:bg-transparent text-white p-3.5 sm:p-5 flex flex-col justify-between overflow-y-auto lg:border-l border-white/10 text-xs selection:bg-emerald-500/30 space-y-4">
      <div className="space-y-4">
        {/* Header & Status */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Shirt size={14} />
            </span>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-white">Fitting Studio AR</h3>
              <p className="text-[10px] text-white/50">Coba pakaian virtual real-time</p>
            </div>
          </div>
          {getConfidenceBadge()}
        </div>

        {/* Selected Garment Card */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Pakaian yang Sedang Dipakai
            </label>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <Check size={12} className="text-emerald-400" /> Aktif di Kamera
            </span>
          </div>
          <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/15 p-3 sm:p-3.5 rounded-2xl flex items-center gap-3.5 shadow-xl">
            <div className="w-14 h-14 bg-black/50 rounded-xl p-1.5 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
              <img
                src={selectedGarment?.src || "/products/kaos-kuning-77-cutout.png"}
                alt={selectedGarment?.name || "Pakaian Terpilih"}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate text-xs sm:text-sm">
                {selectedGarment?.name || "T-Shirt Casual Kuning 77"}
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Presisi Real-Time AR · Otomatis Pas Bahu
              </p>
            </div>
          </div>
        </div>

        {/* Quick Fit Controls (Thumb-friendly & intuitive) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
              Penyesuaian Cepat Ukuran
            </label>
            <span className="text-[10px] text-neutral-400">
              Skala: {Math.round(transform.scale * 100)}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => adjustScale(-0.15)}
              className="py-2.5 px-2 bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 border border-white/10 rounded-xl text-neutral-200 hover:text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              title="Perkecil ukuran baju"
            >
              <span>➖ Perkecil</span>
            </button>
            <button
              type="button"
              onClick={() => adjustScale(0.15)}
              className="py-2.5 px-2 bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 border border-white/10 rounded-xl text-neutral-200 hover:text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              title="Perbesar ukuran baju"
            >
              <span>➕ Perbesar</span>
            </button>
            <button
              type="button"
              onClick={resetToBaseline}
              className="py-2.5 px-2 bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 border border-emerald-500/35 rounded-xl text-emerald-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              title="Kembalikan ke ukuran standar pas badan"
            >
              <RotateCcw size={12} />
              <span>Pas Badan</span>
            </button>
          </div>
        </div>

        {/* Garment Switcher & Upload */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Pilihan Pakaian Lain
            </label>
            <div className="flex items-center gap-2">
              {customGarments.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllCustomGarments}
                  className="text-[10px] text-red-400 hover:text-red-300 font-semibold hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  title="Hapus semua baju yang pernah dicoba/diunggah dari daftar"
                >
                  <Trash2 size={10} />
                  <span>Hapus Riwayat</span>
                </button>
              )}
              <span className="text-[10px] text-purple-300 font-semibold">{displayGarments.length} Pilihan</span>
            </div>
          </div>

          {/* AI Auto-Cutout Uploader */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadGarment}
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="hidden"
          />
          <button
            type="button"
            disabled={isRemovingBg}
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-purple-500/40 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 hover:from-purple-500/20 hover:to-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-purple-300 font-semibold cursor-pointer disabled:opacity-60 shadow-sm"
          >
            {isRemovingBg ? (
              <>
                <Loader2 size={14} className="animate-spin text-purple-400" />
                <span className="text-[11px]">AI Sedang Memotong Latar Baju...</span>
              </>
            ) : (
              <>
                <Upload size={13} className="text-purple-400" />
                <span className="text-[11px]">Unggah Foto Baju Sendiri (Auto AI Cutout)</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-1 gap-2 max-h-[190px] overflow-y-auto pr-0.5 scrollbar-thin">
            {displayGarments.map((item) => {
              const isCurrent =
                selectedGarment?.id === item.id ||
                selectedGarment?.name === item.name ||
                selectedGarmentId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectCatalogGarment(item)}
                  role="button"
                  tabIndex={0}
                  className={`group relative w-full p-2.5 rounded-2xl border flex items-center gap-3 transition-all text-left cursor-pointer select-none ${
                    isCurrent
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-white shadow-md ring-1 ring-emerald-500/40'
                      : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-neutral-300'
                  }`}
                >
                  <img
                    src={item.thumb}
                    alt={item.name}
                    className="w-10 h-10 rounded-xl object-contain bg-black/40 shrink-0 p-1 border border-white/10 shadow-inner"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-white">{item.name}</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      {'isCustom' in item ? 'Baju Kustom Anda' : 'Koleksi Resmi BELLSGALLERY'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isCurrent ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/40">
                        <Check size={10} /> Dipakai
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-400 group-hover:text-white px-2 py-1 rounded-full bg-white/5 group-hover:bg-white/10">
                        Pilih
                      </span>
                    )}

                    {/* Tombol Hapus Baju dari Daftar */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGarment(item);
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/20 active:scale-90 transition-all cursor-pointer"
                      title={`Hapus "${item.name}" agar tidak memenuhi daftar`}
                      aria-label={`Hapus ${item.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Smart Guided Helpers */}
        <div className="space-y-2 pt-1 border-t border-white/10">
          <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block pt-2">
            Panduan & Bantuan Cerdas
          </label>

          {/* Continuous Tracking */}
          <div className="flex items-center justify-between bg-white/5 border border-white/10 px-3 py-2.5 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Activity size={14} className={continuousTracking ? 'text-emerald-400' : 'text-white/40'} />
              <div>
                <p className="font-bold text-[11px]">Ikuti Gerakan Bahu</p>
                <p className="text-[9px] text-white/50">Baju otomatis bergerak mengikuti tubuh Anda</p>
              </div>
            </div>
            <button
              onClick={toggleContinuousTracking}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                continuousTracking ? 'bg-emerald-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  continuousTracking ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Skeleton Landmarks */}
          <div className="flex items-center justify-between bg-white/5 border border-white/10 px-3 py-2.5 rounded-xl">
            <div className="flex items-center gap-2.5">
              {landmarksVisible ? (
                <Eye size={14} className="text-emerald-400" />
              ) : (
                <EyeOff size={14} className="text-white/40" />
              )}
              <div>
                <p className="font-bold text-[11px]">Garis Rangka Tubuh</p>
                <p className="text-[9px] text-white/50">Tampilkan titik sensor postur tubuh</p>
              </div>
            </div>
            <button
              onClick={toggleLandmarks}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                landmarksVisible ? 'bg-emerald-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  landmarksVisible ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Measurements */}
          <div className="flex items-center justify-between bg-white/5 border border-white/10 px-3 py-2.5 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Ruler size={14} className={measurementsVisible ? 'text-emerald-400' : 'text-white/40'} />
              <div>
                <p className="font-bold text-[11px]">Garis Ukuran Tubuh (cm)</p>
                <p className="text-[9px] text-white/50">Tampilkan estimasi lebar bahu & dada</p>
              </div>
            </div>
            <button
              onClick={toggleMeasurements}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                measurementsVisible ? 'bg-emerald-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  measurementsVisible ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Sliders (Kept clean for laypeople) */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-neutral-300 hover:text-white font-medium text-[11px] flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sliders size={13} className="text-purple-400" />
              <span>Pengaturan Lanjutan (Manual)</span>
            </div>
            <span className="text-[10px] text-neutral-400">
              {showAdvanced ? 'Tutup ▲' : 'Buka ▼'}
            </span>
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-3 p-3 mt-2 rounded-xl bg-black/40 border border-white/10">
              {/* Scale Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/70">Skala Presisi</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {Math.round(transform.scale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="5.5"
                  step="0.05"
                  value={transform.scale}
                  onChange={(e) => setTransform({ scale: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-400 bg-white/10 rounded-lg h-2 cursor-pointer touch-none"
                />
              </div>

              {/* Rotation Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/70">Kemiringan / Sudut</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {Math.round(transform.rotation)}°
                  </span>
                </div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="1"
                  value={transform.rotation}
                  onChange={(e) => setTransform({ rotation: parseInt(e.target.value, 10) })}
                  className="w-full accent-emerald-400 bg-white/10 rounded-lg h-2 cursor-pointer touch-none"
                />
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-white/70">Opasitas Kain</span>
                  <span className="font-mono text-emerald-400 font-bold">{transform.opacity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={transform.opacity}
                  onChange={(e) => setTransform({ opacity: parseInt(e.target.value, 10) })}
                  className="w-full accent-emerald-400 bg-white/10 rounded-lg h-2 cursor-pointer touch-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Reset Action */}
      <div className="pt-3 border-t border-white/10">
        <button
          onClick={resetToBaseline}
          className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/15 text-white/90 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer border border-white/10 shadow-sm"
        >
          <RotateCcw size={13} />
          <span>Kembalikan Posisi Semula</span>
        </button>
      </div>
    </div>
  );
}
