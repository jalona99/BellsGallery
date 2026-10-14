"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, SlidersHorizontal, Sparkles, Video, Maximize2 } from "lucide-react";
import ARStage from "@/components/vfr/ARStage";
import { ARPanel } from "@/components/vfr/ARPanel";
import PhotoWizard from "@/components/tryon/PhotoWizard";
import { useTryonStore } from "@/lib/tryon-store";
import { useVtonStore } from "@/lib/store/useVtonStore";
import { Toaster } from "@/components/ui/sonner";

interface VirtualFittingRoomProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  model3dUrl?: string | null;
  productImageUrl?: string;
  category?: string;
}

/**
 * KOMPONEN DUAL-MODE: VirtualFittingRoom
 * Mendukung 2 Mode Fitting:
 * 1. Live Web-AR Preview (MediaPipe BlazePose 33 titik + CAD measurements + bahu auto-fit 30 FPS)
 * 2. Photo Try-On HD (CatVTON AI via FastAPI + Gradio Space)
 */
export default function VirtualFittingRoom({
  isOpen,
  onClose,
  productName,
  productImageUrl = "/products/kaos-kuning-77.png",
  category = "Kaos",
}: VirtualFittingRoomProps) {
  const { activeMode, setMode } = useTryonStore();
  const { setGarmentFile, garment } = useVtonStore();
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  // Inisialisasi baju di Zustand store saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      let cutout = productImageUrl;
      if (productImageUrl.includes("kaos-kuning-77") || productName.toLowerCase().includes("kuning")) {
        cutout = "/products/kaos-kuning-77-cutout.png";
      } else if (productImageUrl.includes("sweater-candy-cane")) {
        cutout = "/products/sweater-candy-cane.png";
      }

      // 1. Inisialisasi di AR Store
      useTryonStore.getState().selectGarment({
        id: productName,
        name: productName,
        src: cutout,
        width: 554,
        height: 554,
        category: "tops",
      });

      // 2. Pre-populate di Photo Try-On Store
      if (typeof window !== "undefined") {
        fetch(cutout)
          .then((res) => {
            if (res.ok) return res.blob();
            throw new Error("Failed to fetch product image for VTON");
          })
          .then((blob) => {
            const ext = blob.type.includes("png") ? "png" : "jpg";
            const file = new File([blob], `${productName}.${ext}`, { type: blob.type });
            useVtonStore.getState().setPath("NORMAL");
            setGarmentFile(file);
          })
          .catch((err) => {
            console.warn("Auto pre-fill VTON garment failed:", err);
          });
      }
    }
  }, [isOpen, productName, productImageUrl, setGarmentFile]);

  if (!isOpen) return null;

  const studioUrl = `/try-on?garment=${encodeURIComponent(productImageUrl)}&name=${encodeURIComponent(productName)}`;

  return (
    <div className="dark fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 text-white">
      <div className="relative w-full max-w-6xl h-[94vh] max-h-[880px] bg-neutral-950 border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-neutral-100">
        {/* ─── LUXURY HEADER BAR ─── */}
        <div className="h-14 sm:h-16 px-4 bg-neutral-950/85 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between shrink-0 z-20 shadow-md">
          {/* Mode Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-neutral-900/90 p-1 rounded-full border border-white/10 shadow-inner">
              <button
                onClick={() => setMode("ar")}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeMode === "ar"
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/25 font-bold"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Video size={13} className={activeMode === "ar" ? "text-black" : "text-emerald-400"} />
                <span>Live AR</span>
              </button>

              <button
                onClick={() => setMode("photo")}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activeMode === "photo"
                    ? "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 font-bold border border-purple-400/30"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Sparkles size={13} className={activeMode === "photo" ? "text-amber-300" : "text-purple-400"} />
                <span>Foto Studio HD</span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs text-white/70">
              <span className="text-white/20">•</span>
              <span className="font-semibold text-white truncate max-w-[220px]">
                {productName}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Open Fullscreen Studio Link */}
            <Link
              href={studioUrl}
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 transition-colors"
              title="Buka studio di tab penuh"
            >
              <Maximize2 size={13} />
              <span>Layar Penuh</span>
            </Link>

            {/* Mobile Panel Toggle (only for AR mode) */}
            {activeMode === "ar" && (
              <button
                onClick={() => setMobilePanelOpen(!mobilePanelOpen)}
                className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Pengaturan AR"
              >
                <SlidersHorizontal size={14} className="text-emerald-400" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer"
              aria-label="Tutup Kamar Pas"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ─── MAIN DUAL-MODE CONTENT ─── */}
        {activeMode === "ar" ? (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] overflow-hidden relative">
            {/* Main Camera & AR Stage */}
            <div className="relative w-full h-full min-h-0 bg-black">
              <ARStage onOpenMobilePanel={() => setMobilePanelOpen(true)} />
            </div>

            {/* Sidebar AR Control Panel (Desktop) */}
            <div className="hidden lg:block h-full overflow-hidden border-l border-white/10 bg-neutral-900/95">
              <ARPanel />
            </div>

            {/* Backdrop for Mobile Drawer */}
            {mobilePanelOpen && (
              <div
                onClick={() => setMobilePanelOpen(false)}
                className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-35"
                aria-hidden="true"
              />
            )}

            {/* Drawer AR Control Panel (Mobile) */}
            <div
              className={`lg:hidden fixed inset-x-0 bottom-0 max-h-[82dvh] bg-neutral-900/98 backdrop-blur-2xl border-t border-white/20 rounded-t-3xl z-40 p-4 pb-8 overflow-y-auto shadow-2xl transition-transform duration-300 ease-out ${
                mobilePanelOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
              }`}
            >
              <div
                className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mb-3 cursor-pointer"
                onClick={() => setMobilePanelOpen(false)}
              />
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Pengaturan Live AR & Pakaian
                </span>
                <button
                  onClick={() => setMobilePanelOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <ARPanel />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden p-2 sm:p-5 bg-neutral-950 relative selection:bg-purple-500/30 flex flex-col min-h-0">
            {/* Subtle Studio Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-purple-600/10 blur-[130px] pointer-events-none -z-0" />
            <div className="relative z-10 max-w-5xl mx-auto h-full w-full flex flex-col min-h-0">
              <PhotoWizard />
            </div>
          </div>
        )}

        <Toaster />
      </div>
    </div>
  );
}
