"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTryonStore } from "@/lib/tryon-store";
import { useVtonStore } from "@/lib/store/useVtonStore";
import ARStage from "@/components/vfr/ARStage";
import { ARPanel } from "@/components/vfr/ARPanel";
import PhotoWizard from "@/components/tryon/PhotoWizard";
import {
  Sparkles,
  Video,
  ArrowLeft,
  SlidersHorizontal,
  Shirt,
  Layers,
  HelpCircle,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

function TryOnContent() {
  const searchParams = useSearchParams();
  const { activeMode, setMode } = useTryonStore();
  const { setGarmentFile, garment } = useVtonStore();
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  // Read URL params and pre-populate garment if available (fallback to catalog garment)
  useEffect(() => {
    const rawGarmentUrl = searchParams.get("garment") || searchParams.get("image");
    const rawCutoutUrl = searchParams.get("cutout");
    const rawName = searchParams.get("name");

    const garmentUrl = rawGarmentUrl || "/products/kaos-kuning-77.png";
    const name = rawName || "T-Shirt Casual Kuning 77";

    let cutout = rawCutoutUrl || garmentUrl;
    let isKnownCutout = Boolean(rawCutoutUrl);

    if (!isKnownCutout) {
      if (garmentUrl.includes("kaos-kuning-77") || name.toLowerCase().includes("kuning")) {
        cutout = "/products/kaos-kuning-77-cutout.png";
        isKnownCutout = true;
      } else if (garmentUrl.includes("sweater-candy-cane")) {
        cutout = "/products/sweater-candy-cane.png";
        isKnownCutout = true;
      } else if (garmentUrl.includes("cutout")) {
        cutout = garmentUrl;
        isKnownCutout = true;
      }
    }

    // 1. Set initial into AR Store
    useTryonStore.getState().selectGarment({
      id: name,
      name: name,
      src: cutout,
      width: 554,
      height: 554,
      category: "tops",
    });

    // 2. If the garment does not have a transparent cutout, automatically invoke In-Browser AI background removal!
    if (!isKnownCutout && typeof window !== "undefined") {
      import("@/lib/autoCutout")
        .then(({ removeImageBackground }) => removeImageBackground(garmentUrl))
        .then(({ objectUrl, file }) => {
          useTryonStore.getState().selectGarment({
            id: name,
            name: name,
            src: objectUrl,
            width: 554,
            height: 554,
            category: "tops",
          });
          useVtonStore.getState().setPath("NORMAL");
          setGarmentFile(file);
        })
        .catch((err) => {
          console.warn("Auto AI cutout for catalog garment failed, falling back to original:", err);
        });
    } else if (typeof window !== "undefined") {
      fetch(cutout)
        .then((res) => {
          if (res.ok) return res.blob();
          throw new Error("Failed to load catalog image");
        })
        .then((blob) => {
          const ext = blob.type.includes("png") ? "png" : "jpg";
          const file = new File([blob], `${name}.${ext}`, { type: blob.type });
          // Ensure Photo Try-on path is NORMAL and at BODY upload step
          useVtonStore.getState().setPath("NORMAL");
          setGarmentFile(file);
        })
        .catch((err) => {
          console.warn("Could not pre-populate photo try-on file:", err);
        });
    }
  }, [searchParams, setGarmentFile]);

  return (
    <div className="dark fixed inset-0 z-40 bg-neutral-950 text-white flex flex-col selection:bg-purple-500/30">
      {/* ─── LUXURY STUDIO HEADER NAVIGATION ─── */}
      <header className="h-14 sm:h-16 border-b border-white/[0.08] bg-neutral-950/85 backdrop-blur-xl px-3 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-lg">
        {/* Left: Back button & Brand Title */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium text-neutral-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-all active:scale-95 shrink-0 shadow-xs"
            title="Kembali ke Katalog Belanja"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Katalog</span>
            <span className="sm:hidden text-[11px] font-semibold">Toko</span>
          </Link>

          <div className="hidden md:flex flex-col pl-3 border-l border-white/10">
            <span className="font-extrabold text-xs tracking-[0.2em] uppercase bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              BELLSGALLERY Studio
            </span>
            <span className="text-[10px] text-neutral-400 font-medium tracking-wider">
              Virtual Fitting Experience
            </span>
          </div>
        </div>

        {/* Center: Luxury Segmented Mode Switcher */}
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
            <span className="text-[11px] sm:text-xs">Live AR</span>
            <span className="hidden md:inline text-xs font-normal opacity-80">(Kamera)</span>
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
            <span className="text-[11px] sm:text-xs">Foto Studio HD</span>
            <span className="hidden md:inline text-xs font-normal opacity-80">(AI)</span>
          </button>
        </div>

        {/* Right: Quick Drawer Trigger on Mobile */}
        <div className="flex items-center gap-2">
          {activeMode === "ar" && (
            <button
              onClick={() => setMobilePanelOpen(!mobilePanelOpen)}
              className={`lg:hidden px-2.5 sm:px-3 py-1.5 rounded-full transition-all text-xs font-semibold flex items-center gap-1.5 shrink-0 border cursor-pointer ${
                mobilePanelOpen
                  ? "bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/30 border-emerald-400"
                  : "bg-white/[0.07] hover:bg-white/[0.14] text-white border-white/10"
              }`}
              title="Ganti Pakaian & Pengaturan AR"
            >
              <SlidersHorizontal size={13} className={mobilePanelOpen ? "text-black" : "text-emerald-400"} />
              <span className="text-[11px]">Pakaian</span>
            </button>
          )}
        </div>
      </header>

      {/* ─── MAIN CONTENT AREA ─── */}
      <main className="flex-1 overflow-hidden relative">
        {/* MODE 1: LIVE AR PREVIEW */}
        {activeMode === "ar" && (
          <div className="h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] flex flex-col lg:flex-row overflow-hidden">
            {/* Camera Stage */}
            <div className="flex-1 min-h-[360px] relative bg-black">
              <ARStage onOpenMobilePanel={() => setMobilePanelOpen(true)} />
            </div>

            {/* AR Control Panel (Desktop Side-rail) */}
            <div className="hidden lg:block w-80 xl:w-96 border-l border-white/[0.08] bg-neutral-900/95 overflow-y-auto">
              <ARPanel />
            </div>

            {/* Mobile Drawer Backdrop Overlay */}
            {mobilePanelOpen && (
              <div
                onClick={() => setMobilePanelOpen(false)}
                className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-xs z-40 transition-opacity animate-in fade-in duration-200"
                aria-hidden="true"
              />
            )}

            {/* Mobile Bottom Sheet Drawer */}
            <div
              className={`lg:hidden fixed inset-x-0 bottom-0 max-h-[82dvh] bg-neutral-950/98 backdrop-blur-2xl border-t border-white/15 rounded-t-[32px] z-50 p-4 pb-8 overflow-y-auto shadow-2xl transition-transform duration-300 ease-out ${
                mobilePanelOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
              }`}
            >
              {/* Touch Drag Handle Pill */}
              <div
                className="w-12 h-1.5 bg-white/25 hover:bg-white/40 rounded-full mx-auto mb-3 cursor-pointer active:scale-95 transition-all"
                onClick={() => setMobilePanelOpen(false)}
              />

              <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Pilihan Baju & Pengaturan AR
                  </span>
                </div>
                <button
                  onClick={() => setMobilePanelOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <ARPanel />
            </div>
          </div>
        )}

        {/* MODE 2: PHOTO TRY-ON HD */}
        {activeMode === "photo" && (
          <div className="h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] overflow-hidden bg-neutral-950 p-2 sm:p-5 relative flex flex-col">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-purple-600/10 blur-[140px] pointer-events-none -z-0" />
            <div className="relative z-10 max-w-5xl mx-auto h-full w-full flex flex-col min-h-0">
              <PhotoWizard />
            </div>
          </div>
        )}
      </main>

      <Toaster />
    </div>
  );
}

export default function TryOnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white text-sm">
          Memuat Fitting Studio...
        </div>
      }
    >
      <TryOnContent />
    </Suspense>
  );
}
