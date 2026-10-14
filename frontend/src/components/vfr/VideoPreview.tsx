// src/components/vfr/VideoPreview.tsx
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, AlertCircle, RefreshCw, Sparkles, UserCheck, ArrowRight, Video } from 'lucide-react';
import { useTryonStore } from '@/lib/tryon-store';
import { useVtonStore } from '@/lib/store/useVtonStore';
import { toast } from 'sonner';

interface VideoPreviewProps {
  onStreamReady?: (stream: MediaStream, video: HTMLVideoElement) => void;
  className?: string;
  facingMode?: 'user' | 'environment';
  onToggleFacingMode?: () => void;
}

// Module-level singletons to prevent React 18 StrictMode concurrent getUserMedia deadlocks
let globalActiveStream: MediaStream | null = null;
let globalStreamPromise: Promise<MediaStream> | null = null;
let globalStopSimulation: (() => void) | null = null;

/**
 * Creates an interactive 30 FPS studio simulation stream with a lifelike fashion mannequin.
 * Enables live AR fitting, MediaPipe pose tracking, CAD measurements, and photo snapshots
 * even on desktop PCs without a webcam or when camera permissions are blocked.
 */
function createStudioSimulationStream(): { stream: MediaStream; stop: () => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');

  let animId: number;
  let isStopped = false;

  const render = (time: number) => {
    if (isStopped || !ctx) return;

    // Natural subtle breathing / idle sway
    const swayY = Math.sin(time * 0.0018) * 5;
    const swayHead = Math.sin(time * 0.0012) * 2;

    // 1. Studio Backdrop (Modern dark luxury studio)
    const bgGrad = ctx.createRadialGradient(640, 360, 50, 640, 360, 700);
    bgGrad.addColorStop(0, '#1a1d24');
    bgGrad.addColorStop(0.5, '#101217');
    bgGrad.addColorStop(1, '#08090c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1280, 720);

    // Studio Spotlight from above
    const spotGrad = ctx.createRadialGradient(640, 0, 20, 640, 360, 480);
    spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.09)');
    spotGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.03)');
    spotGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 0, 1280, 720);

    // Studio Floor Grid Perspective
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let x = 120; x < 1280; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 560);
      ctx.lineTo(640 + (x - 640) * 1.8, 720);
      ctx.stroke();
    }
    for (let y = 560; y < 720; y += 35) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(1220, y);
      ctx.stroke();
    }

    // Studio Platform Shadow
    ctx.beginPath();
    ctx.ellipse(640, 640, 230, 36, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();

    // 2. Avatar / Mannequin Figure
    const cx = 640;
    const baseY = 160 + swayY;

    // Head
    ctx.fillStyle = '#dfc4b0';
    ctx.beginPath();
    ctx.ellipse(cx, baseY + swayHead, 46, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Minimalist Hair Silhouette
    ctx.fillStyle = '#1e2127';
    ctx.beginPath();
    ctx.arc(cx, baseY - 10 + swayHead, 48, Math.PI, 0, false);
    ctx.fill();

    // Neck
    ctx.fillStyle = '#ccaf9c';
    ctx.fillRect(cx - 18, baseY + 45 + swayHead, 36, 42);

    // Shoulders, Torso & Arms
    // Left shoulder ~ (540, 245 + swayY), Right shoulder ~ (740, 245 + swayY)
    const shoulderLeftX = cx - 100;
    const shoulderRightX = cx + 100;
    const shoulderY = baseY + 85;

    ctx.fillStyle = '#d5b6a1';
    ctx.beginPath();
    // Shoulder contour
    ctx.moveTo(shoulderLeftX - 25, shoulderY + 25);
    ctx.quadraticCurveTo(shoulderLeftX, shoulderY, cx - 25, shoulderY - 10);
    ctx.lineTo(cx + 25, shoulderY - 10);
    ctx.quadraticCurveTo(shoulderRightX, shoulderY, shoulderRightX + 25, shoulderY + 25);
    // Arms down
    ctx.lineTo(shoulderRightX + 20, shoulderY + 160);
    ctx.lineTo(shoulderRightX - 10, shoulderY + 160);
    // Waist
    ctx.lineTo(cx + 55, shoulderY + 240);
    // Hips
    ctx.lineTo(cx + 65, shoulderY + 340);
    ctx.lineTo(cx - 65, shoulderY + 340);
    ctx.lineTo(cx - 55, shoulderY + 240);
    ctx.lineTo(shoulderLeftX + 10, shoulderY + 160);
    ctx.lineTo(shoulderLeftX - 20, shoulderY + 160);
    ctx.closePath();
    ctx.fill();

    // Mannequin pants / lower styling
    ctx.fillStyle = '#1e2430';
    ctx.beginPath();
    ctx.moveTo(cx - 55, shoulderY + 235);
    ctx.lineTo(cx + 55, shoulderY + 235);
    ctx.lineTo(cx + 65, shoulderY + 340);
    ctx.lineTo(cx - 65, shoulderY + 340);
    ctx.closePath();
    ctx.fill();

    // Subtle anatomical lines for MediaPipe pose contrast
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 20, shoulderY + 5);
    ctx.lineTo(shoulderLeftX + 15, shoulderY + 8);
    ctx.moveTo(cx + 20, shoulderY + 5);
    ctx.lineTo(shoulderRightX - 15, shoulderY + 8);
    ctx.stroke();

    animId = requestAnimationFrame(render);
  };

  animId = requestAnimationFrame(render);

  const anyCanvas = canvas as any;
  const stream: MediaStream = anyCanvas.captureStream
    ? anyCanvas.captureStream(30)
    : anyCanvas.mozCaptureStream(30);

  const stop = () => {
    isStopped = true;
    cancelAnimationFrame(animId);
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
    }
  };

  return { stream, stop };
}

export function VideoPreview({
  onStreamReady,
  className = '',
  facingMode = 'user',
  onToggleFacingMode,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [slowNotice, setSlowNotice] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);

  const stopCurrentStream = () => {
    if (globalStopSimulation) {
      globalStopSimulation();
      globalStopSimulation = null;
    }

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      activeStreamRef.current = null;
    }
    globalActiveStream = null;
    globalStreamPromise = null;
  };

  /**
   * Activates the Studio Simulation Stream instantly.
   * Works on any machine without webcam, bypassing hardware/OS permissions.
   */
  const startSimulation = useCallback(() => {
    stopCurrentStream();
    setIsLoading(true);
    setError(null);
    setSlowNotice(false);

    try {
      const { stream: simStream, stop } = createStudioSimulationStream();
      globalStopSimulation = stop;
      activeStreamRef.current = simStream;
      globalActiveStream = simStream;

      setStream(simStream);
      setIsSimulated(true);

      const video = videoRef.current;
      if (video) {
        video.srcObject = simStream;
        video.play().catch(() => {});
        setIsLoading(false);
        if (onStreamReady) {
          onStreamReady(simStream, video);
        }
      }

      toast.success('Mode Simulasi Studio diaktifkan (Virtual Model)', {
        description: 'Anda dapat mencoba AR dan menjepret foto untuk Try-On HD.',
      });
    } catch (err: any) {
      console.error('Failed to create simulation stream:', err);
      setError('Gagal memulai simulasi studio.');
      setIsLoading(false);
    }
  }, [onStreamReady]);

  /**
   * Request physical camera access with strict timeout & singleton deduplication.
   */
  const startCamera = async (forceRetry = false) => {
    setIsLoading(true);
    setError(null);
    setSlowNotice(false);

    if (globalStopSimulation) {
      globalStopSimulation();
      globalStopSimulation = null;
    }

    // Reuse existing live stream if available and not explicitly retrying
    if (!forceRetry && globalActiveStream && globalActiveStream.getVideoTracks().some((t) => t.readyState === 'live')) {
      activeStreamRef.current = globalActiveStream;
      setStream(globalActiveStream);
      setIsSimulated(false);
      const video = videoRef.current;
      if (video) {
        video.srcObject = globalActiveStream;
        video.play().catch(() => {});
        setIsLoading(false);
        onStreamReady?.(globalActiveStream, video);
      }
      return;
    }

    // Stop active stream before requesting new one
    stopCurrentStream();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Browser tidak mendukung akses kamera WebRTC.');
      setIsLoading(false);
      return;
    }

    // Show simulation offer if camera takes longer than 3 seconds
    const slowTimer = setTimeout(() => {
      setSlowNotice(true);
    }, 3000);

    const getUserMediaWithTimeout = (constraints: MediaStreamConstraints, timeoutMs = 5000): Promise<MediaStream> => {
      let timer: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const timeoutErr = new Error('Kamera tidak merespon dalam 5 detik.');
          timeoutErr.name = 'TimeoutError';
          reject(timeoutErr);
        }, timeoutMs);
      });

      return Promise.race([
        navigator.mediaDevices.getUserMedia(constraints),
        timeoutPromise,
      ]).finally(() => clearTimeout(timer));
    };

    const constraintList: MediaStreamConstraints[] = [
      { video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode }, audio: false },
      { video: true, audio: false },
    ];

    let mediaStream: MediaStream | null = null;
    let lastErr: any = null;

    try {
      // Use singleton promise to prevent concurrent Media Foundation driver lock
      if (!globalStreamPromise || forceRetry) {
        globalStreamPromise = (async () => {
          for (const constraints of constraintList) {
            try {
              const s = await getUserMediaWithTimeout(constraints, 4500);
              if (s) return s;
            } catch (err: any) {
              lastErr = err;
              if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                break; // User explicitly clicked block
              }
            }
          }
          if (lastErr) throw lastErr;
          throw new Error('Kamera tidak ditemukan.');
        })();
      }

      mediaStream = await globalStreamPromise;
    } catch (err: any) {
      lastErr = err;
    } finally {
      globalStreamPromise = null;
      clearTimeout(slowTimer);
    }

    if (!mediaStream) {
      console.warn('Physical camera unavailable:', lastErr);
      const msg =
        lastErr?.name === 'NotAllowedError' || lastErr?.name === 'PermissionDeniedError'
          ? 'Izin kamera ditolak di peramban Anda. Silakan klik ikon izin di bilah alamat atau gunakan Mode Simulasi Studio.'
          : lastErr?.name === 'NotFoundError' || lastErr?.name === 'DevicesNotFoundError'
          ? 'Perangkat webcam tidak terdeteksi pada komputer/laptop ini.'
          : lastErr?.name === 'NotReadableError' || lastErr?.name === 'TrackStartError'
          ? 'Kamera sedang digunakan oleh aplikasi lain (Zoom/Teams).'
          : lastErr?.name === 'TimeoutError'
          ? 'Kamera tidak merespon dalam 5 detik (perangkat offline atau diblokir sistem).'
          : 'Kamera tidak dapat dihubungkan saat ini.';

      setError(msg);
      setIsLoading(false);
      return;
    }

    activeStreamRef.current = mediaStream;
    globalActiveStream = mediaStream;
    setStream(mediaStream);
    setIsSimulated(false);

    const video = videoRef.current;
    if (video) {
      video.srcObject = mediaStream;

      let isReady = false;
      const markReady = () => {
        if (isReady) return;
        isReady = true;
        setIsLoading(false);
        setSlowNotice(false);

        video.play().catch((playErr) => {
          console.warn('Video play warning:', playErr);
        });

        if (onStreamReady && activeStreamRef.current) {
          onStreamReady(activeStreamRef.current, video);
        }
      };

      video.onloadedmetadata = () => markReady();
      video.onloadeddata = () => markReady();
      video.oncanplay = () => markReady();
      video.onplaying = () => markReady();

      if (video.readyState >= 1) {
        markReady();
      }

      video.play().then(() => markReady()).catch(() => {});
    }
  };

  useEffect(() => {
    let isMounted = true;

    startCamera(true).catch((err) => {
      if (isMounted) {
        console.warn('Camera start/switch notice:', err);
      }
    });

    return () => {
      isMounted = false;
      stopCurrentStream();
    };
  }, [facingMode]);

  const handleSwitchToPhotoTryon = () => {
    useTryonStore.getState().setMode('photo');
    useVtonStore.getState().setPath('NORMAL');
  };

  return (
    <div className={`relative w-full h-full bg-neutral-950 flex items-center justify-center overflow-hidden ${className}`}>
      {/* Video element - mirrored for selfie view, non-mirrored for back environment camera */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => {
          if (videoRef.current && activeStreamRef.current) {
            setIsLoading(false);
            onStreamReady?.(activeStreamRef.current, videoRef.current);
          }
        }}
        className={`w-full h-full object-cover transform ${facingMode === 'user' ? '-scale-x-100' : 'scale-x-100'}`}
      />

      {/* Mode Indicator Overlay (Webcam vs Studio Simulation) */}
      {!isLoading && !error && stream && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          {isSimulated ? (
            <div className="flex items-center gap-2 bg-purple-950/80 backdrop-blur-md border border-purple-500/40 px-3 py-1.5 rounded-full text-xs text-purple-200 shadow-xl">
              <Sparkles size={13} className="text-amber-300 animate-pulse" />
              <span className="font-semibold">Simulasi Studio (Virtual Avatar)</span>
              <button
                onClick={() => startCamera(true)}
                className="ml-2 pl-2 border-l border-purple-400/30 hover:text-white flex items-center gap-1 text-[11px] text-purple-300 transition-colors cursor-pointer"
                title="Coba hubungkan webcam fisik Anda"
              >
                <Camera size={11} />
                <span>Pakai Kamera</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-neutral-900/80 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-xs text-white shadow-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">Webcam Aktif</span>
              <button
                onClick={startSimulation}
                className="ml-2 pl-2 border-l border-white/20 hover:text-emerald-300 flex items-center gap-1 text-[11px] text-neutral-300 transition-colors cursor-pointer"
                title="Beralih ke model simulasi virtual studio"
              >
                <Sparkles size={11} className="text-amber-300" />
                <span>Mode Simulasi</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading state with proactive simulation fallback */}
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center text-white z-20 p-6 text-center">
          <div className="relative mb-4">
            <RefreshCw className="animate-spin text-emerald-400" size={38} />
            <div className="absolute inset-0 blur-md bg-emerald-500/20 rounded-full -z-10" />
          </div>
          <p className="text-sm font-bold tracking-wider uppercase text-white mb-1">
            Menghubungkan Kamera...
          </p>
          <p className="text-xs text-neutral-400 max-w-sm mb-4">
            {slowNotice
              ? 'Sensor webcam belum merespon atau menunggu izin peramban Anda.'
              : 'Menyiapkan sensor video webcam Anda...'}
          </p>

          {/* If slow, immediately offer Simulation & Photo Try-On */}
          {slowNotice && (
            <div className="flex flex-col sm:flex-row items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <button
                onClick={startSimulation}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles size={14} className="text-amber-300" />
                <span>Gunakan Mode Simulasi Studio</span>
              </button>

              <button
                onClick={() => startCamera(true)}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/15 rounded-xl text-xs font-medium transition-all cursor-pointer"
              >
                Ulangi Deteksi Kamera
              </button>
            </div>
          )}
        </div>
      )}

      {/* Actionable Error State with 3 Immediate Paths */}
      {error && (
        <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center z-30">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3">
            <AlertCircle className="text-amber-400" size={30} />
          </div>
          <h3 className="font-bold text-base mb-1 text-white">Kamera Belum Terhubung</h3>
          <p className="text-xs text-neutral-300 max-w-md mb-6 leading-relaxed">
            {error}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
            {/* 1. Primary Action: Studio Simulation */}
            <button
              onClick={startSimulation}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              <Sparkles size={15} />
              <span>Gunakan Mode Simulasi Studio</span>
            </button>

            {/* 2. Secondary Action: Switch to Photo Try-On HD */}
            <button
              onClick={handleSwitchToPhotoTryon}
              className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 cursor-pointer"
            >
              <UserCheck size={14} />
              <span>Beralih ke Photo Try-On HD</span>
            </button>
          </div>

          {/* 3. Tertiary: Retry physical camera */}
          <button
            onClick={() => startCamera(true)}
            className="mt-4 text-neutral-400 hover:text-white text-xs underline underline-offset-4 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Camera size={13} />
            <span>Coba hubungkan webcam fisik lagi</span>
          </button>
        </div>
      )}
    </div>
  );
}
