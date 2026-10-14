// src/components/vfr/ARStage.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VideoPreview } from './VideoPreview';
import { GarmentOverlay } from './GarmentOverlay';
import { PoseLandmarks } from './PoseLandmarks';
import { AutoAlignButton } from './AutoAlignButton';
import { ContinuousTracker } from './ContinuousTracker';
import { useTryonStore, getActiveGarment } from '@/lib/tryon-store';
import { useVtonStore } from '@/lib/store/useVtonStore';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { Target, X, Ruler, Camera, Sparkles, SwitchCamera, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';

interface ARStageProps {
  onOpenMobilePanel?: () => void;
}

export default function ARStage({ onOpenMobilePanel }: ARStageProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });
  const [videoDimensions, setVideoDimensions] = useState({ width: 1280, height: 720 });
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleCameraFacing = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    toast.info(facingMode === 'user' ? 'Mengalihkan ke kamera belakang...' : 'Mengalihkan ke kamera depan...');
  }, [facingMode]);

  const {
    selectedGarmentId,
    garments,
    mediaPipeEnabled,
    landmarksVisible,
    toggleLandmarks,
    measurementsVisible,
    toggleMeasurements,
    setPoseConfidence,
    poseConfidence,
  } = useTryonStore();

  const selectedGarment = getActiveGarment(garments, selectedGarmentId);

  // MediaPipe pose detection with GPU acceleration & CPU fallback
  const {
    landmarks,
    confidence,
    fps,
    isLoading: mediaPipeLoading,
    error: mediaPipeError,
  } = usePoseDetection(
    mediaPipeEnabled ? videoElement : null,
    {
      modelComplexity: 'lite',
      minDetectionConfidence: 0.45,
      minTrackingConfidence: 0.45,
      isMirrored: facingMode === 'user',
    }
  );

  useEffect(() => {
    if (mediaPipeEnabled) {
      setPoseConfidence(confidence);
    }
  }, [confidence, mediaPipeEnabled, setPoseConfidence]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleStreamReady = useCallback((mediaStream: MediaStream, video: HTMLVideoElement) => {
    setStream(mediaStream);
    setVideoElement(video);
    if (video.videoWidth && video.videoHeight) {
      setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
    }
  }, []);

  const captureAndSwitchToPhoto = useCallback(() => {
    if (!videoElement) {
      toast.error('Kamera belum siap.');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 1280;
      canvas.height = videoElement.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw mirrored video just as user sees on screen
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Gagal mengambil gambar dari kamera.');
          return;
        }

        const file = new File([blob], 'snapshot-body.png', { type: 'image/png' });
        useVtonStore.getState().setBody(file);

        // Switch to photo mode and advance to step GENERATE
        useTryonStore.getState().setMode('photo');
        useVtonStore.getState().setPath('NORMAL');
        useVtonStore.getState().setStep('GENERATE');

        toast.success('Foto berhasil diambil! Membuka Photo Try-On HD...');
      }, 'image/png');
    } catch (err) {
      console.error('Snapshot error:', err);
      toast.error('Gagal mengambil foto dari kamera.');
    }
  }, [videoElement]);

  return (
    <div className="relative w-full h-full min-h-[480px] bg-neutral-950 overflow-hidden select-none">
      <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
        {/* Continuous Tracker loop (side-effect only) */}
        {mediaPipeEnabled && (
          <ContinuousTracker
            landmarks={landmarks}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
            videoWidth={videoDimensions.width}
            videoHeight={videoDimensions.height}
          />
        )}

        {/* Mirrored Webcam Stream */}
        <VideoPreview
          onStreamReady={handleStreamReady}
          facingMode={facingMode}
          className="w-full h-full"
        />

        {/* 33-point Skeleton & CAD Measurement Visualizer */}
        {mediaPipeEnabled && stream && (
          <PoseLandmarks
            landmarks={landmarks}
            width={dimensions.width}
            height={dimensions.height}
            videoWidth={videoDimensions.width}
            videoHeight={videoDimensions.height}
            visible={landmarksVisible}
            measurementsVisible={measurementsVisible}
          />
        )}

        {/* Garment Cutout Overlay (Draggable & Resizable) */}
        {stream && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="relative w-full h-full pointer-events-auto">
              <GarmentOverlay
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
              />
            </div>
          </div>
        )}

        {/* Fashion Viewfinder HUD Framing Brackets */}
        {stream && (
          <div className="absolute inset-4 sm:inset-10 pointer-events-none z-10 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-l-2 border-white/30 rounded-tl-xl" />
              <div className="w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-r-2 border-white/30 rounded-tr-xl" />
            </div>
            <div className="flex justify-between items-end">
              <div className="w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-l-2 border-white/30 rounded-bl-xl" />
              <div className="w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-r-2 border-white/30 rounded-br-xl" />
            </div>
          </div>
        )}

        {/* Floating Guidance / Posture Feedback Pill (Top Center) */}
        {stream && (
          <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-neutral-950/80 backdrop-blur-md border border-white/15 px-3 py-1 sm:py-1.5 rounded-full text-[11px] text-white flex items-center gap-2 shadow-xl">
              {poseConfidence === 'Good' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="font-semibold text-emerald-300">Posisi Pas · Bahu Terdeteksi</span>
                </>
              ) : poseConfidence === 'Okay' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="font-medium text-amber-200">Mendeteksi postur tubuh...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                  <span className="font-medium text-neutral-300">Posisikan tubuh menghadap kamera</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Floating Top Left Badge (Live Status & FPS) */}
        {stream && (
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 flex items-center gap-2 pointer-events-none">
            <div className="bg-neutral-950/80 backdrop-blur-md border border-white/15 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] text-white flex items-center gap-1.5 sm:gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-semibold">Live AR</span>
              {mediaPipeEnabled && fps > 0 && (
                <span className="text-[9px] sm:text-[10px] text-emerald-400 font-mono font-bold">
                  {fps} FPS
                </span>
              )}
            </div>
          </div>
        )}

        {/* Floating Top Right Action Controls */}
        {stream && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-1.5 sm:gap-2">
            {/* Auto-Align Button */}
            {mediaPipeEnabled && selectedGarment && (
              <AutoAlignButton
                landmarks={landmarks}
                containerWidth={dimensions.width}
                containerHeight={dimensions.height}
                videoWidth={videoDimensions.width}
                videoHeight={videoDimensions.height}
                disabled={mediaPipeLoading || Boolean(mediaPipeError)}
              />
            )}

            {/* Flip Camera Button (HP/Mobile) */}
            <button
              onClick={toggleCameraFacing}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border backdrop-blur-md shadow-lg transition-all active:scale-95 cursor-pointer bg-neutral-950/80 hover:bg-neutral-900 text-cyan-300 border-cyan-500/30 hover:border-cyan-400 flex items-center justify-center"
              title={facingMode === 'user' ? 'Ganti ke Kamera Belakang' : 'Ganti ke Kamera Depan (Selfie)'}
            >
              <SwitchCamera size={15} />
            </button>

            {/* CAD Measurements Toggle Button */}
            {mediaPipeEnabled && (
              <button
                onClick={toggleMeasurements}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border backdrop-blur-md shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                  measurementsVisible
                    ? 'bg-emerald-500/80 hover:bg-emerald-500 text-white border-emerald-400/50'
                    : 'bg-neutral-950/80 hover:bg-neutral-900 text-white/70 border-white/20'
                }`}
                title={measurementsVisible ? 'Sembunyikan Garis Ukuran' : 'Tampilkan Garis Ukuran Tubuh'}
              >
                <Ruler size={15} />
              </button>
            )}

            {/* Skeleton Landmarks Toggle Button */}
            {mediaPipeEnabled && (
              <button
                onClick={toggleLandmarks}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border backdrop-blur-md shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                  landmarksVisible
                    ? 'bg-emerald-500/80 hover:bg-emerald-500 text-white border-emerald-400/50'
                    : 'bg-neutral-950/80 hover:bg-neutral-900 text-white/70 border-white/20'
                }`}
                title={landmarksVisible ? 'Sembunyikan Kerangka Postur' : 'Tampilkan Kerangka Postur Tubuh'}
              >
                {landmarksVisible ? <X size={15} /> : <Target size={15} />}
              </button>
            )}
          </div>
        )}

        {/* Bottom Floating Bar: Capture & Mobile Drawer trigger */}
        {stream && (
          <div className="absolute bottom-4 sm:bottom-6 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-30 flex items-center justify-center gap-2.5 sm:gap-4 pointer-events-auto">
            {/* Quick Drawer Trigger (Baju & Kontrol) on Mobile */}
            {onOpenMobilePanel && (
              <button
                onClick={onOpenMobilePanel}
                className="lg:hidden px-4 py-2.5 bg-neutral-950/90 hover:bg-neutral-900 text-white font-semibold text-xs rounded-full border border-white/20 shadow-xl backdrop-blur-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Pilih Pakaian & Pengaturan AR"
              >
                <SlidersHorizontal size={14} className="text-emerald-400" />
                <span>Pilih Baju</span>
              </button>
            )}

            {/* Shutter Capture Button */}
            <button
              onClick={captureAndSwitchToPhoto}
              className="flex-1 sm:flex-initial px-5 sm:px-7 py-3 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-400 hover:via-purple-500 hover:to-pink-400 text-white font-bold text-xs sm:text-sm rounded-full shadow-2xl shadow-purple-600/50 flex items-center justify-center gap-2 border border-white/25 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
              title="Ambil foto saat ini dan langsung proses ke Photo Try-On HD"
            >
              <Camera size={16} />
              <span>Jepret Foto Studio HD</span>
              <Sparkles size={14} className="text-amber-300 animate-pulse" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
