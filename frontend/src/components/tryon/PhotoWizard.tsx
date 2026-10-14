'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { LoadingDots } from '@/components/ui/loading-spinner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useVtonStore } from '@/lib/store/useVtonStore';
import { useTryonStore } from '@/lib/tryon-store';
import {
  AlertCircle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  RefreshCw,
  Shirt,
  Sparkles,
  Upload,
  User,
  X,
  SwitchCamera,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { downloadBase64ImageSmart } from '@/lib/services/gradioApi';
import QualityTipsCard from './QualityTipsCard';
import ClassificationChip from './ClassificationChip';
import ClothTypeSelector from './ClothTypeSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { ProcessingOverlay } from './ProcessingOverlay';
import Webcam from 'react-webcam';

export default function PhotoWizard() {
  const bodyFileInputRef = useRef<HTMLInputElement>(null);
  const garmentFileInputRef = useRef<HTMLInputElement>(null);
  const upperFileInputRef = useRef<HTMLInputElement>(null);
  const lowerFileInputRef = useRef<HTMLInputElement>(null);
  const bodyWebcamRef = useRef<Webcam>(null);
  const garmentWebcamRef = useRef<Webcam>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Tryon Store (for onboarding)
  const { openPhotoOnboarding } = useTryonStore();

  // VTON Store
  const {
    tryOnPath,
    step,
    setPath,
    setStep,
    body,
    garment,
    upperGarment,
    lowerGarment,
    outfit,
    options,
    setBody,
    setGarmentFile,
    setUpperGarment,
    setLowerGarment,
    constructOutfitPreview,
    setOptions,
    status,
    error,
    resultUrl,
    tryOn,
    reset,
    getAvailableClothTypes,
    getDisabledClothTypes,
    getPreselectState,
    getPreflightChecks,
    canProceedToGenerate,
  } = useVtonStore();

  const [progress, setProgress] = useState(0);
  const [showBodyCamera, setShowBodyCamera] = useState(false);
  const [showGarmentCamera, setShowGarmentCamera] = useState(false);
  const [bodyFacingMode, setBodyFacingMode] = useState<'user' | 'environment'>('environment');
  const [garmentFacingMode, setGarmentFacingMode] = useState<'user' | 'environment'>('environment');
  const [resultViewMode, setResultViewMode] = useState<'result' | 'original' | 'garment'>('result');

  // Progress tracking
  useEffect(() => {
    if (status === 'classifying') {
      setProgress(20);
    } else if (status === 'constructing') {
      setProgress(40);
    } else if (status === 'uploading') {
      setProgress(50);
    } else if (status === 'processing') {
      setProgress(60);
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 2 : prev));
      }, 1000);
      return () => clearInterval(interval);
    } else if (status === 'done') {
      setProgress(100);
    } else {
      setProgress(0);
    }
  }, [status]);

  // Camera toggle functions
  const toggleBodyCamera = useCallback(() => {
    setBodyFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    toast.info(bodyFacingMode === 'user' ? 'Switched to back camera' : 'Switched to front camera');
  }, [bodyFacingMode]);

  const toggleGarmentCamera = useCallback(() => {
    setGarmentFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    toast.info(garmentFacingMode === 'user' ? 'Switched to back camera' : 'Switched to front camera');
  }, [garmentFacingMode]);

  // Body Camera functions
  const captureBodyPhoto = useCallback(async () => {
    const imageSrc = bodyWebcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast.error('Failed to capture photo. Please try again.');
      return;
    }

    // Convert base64 to File
    const response = await fetch(imageSrc);
    const blob = await response.blob();
    const file = new File([blob], `body-${Date.now()}.jpg`, { type: 'image/jpeg' });

    // Stop camera before processing
    setShowBodyCamera(false);

    // Set body photo
    await setBody(file);
    toast.success('Body photo captured successfully');
  }, [setBody]);

  const handleBodyCameraError = useCallback((error: string | DOMException) => {
    console.error('Body camera error:', error);
    setShowBodyCamera(false);

    let errorMessage = 'Failed to access camera';
    if (typeof error === 'object' && error.name) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application.';
      }
    }

    toast.error(errorMessage, { duration: 5000 });
  }, []);

  // Garment Camera functions
  const captureGarmentPhoto = useCallback(async () => {
    const imageSrc = garmentWebcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast.error('Failed to capture photo. Please try again.');
      return;
    }

    // Convert base64 to File
    const response = await fetch(imageSrc);
    const blob = await response.blob();
    const file = new File([blob], `garment-${Date.now()}.jpg`, { type: 'image/jpeg' });

    // Stop camera before processing
    setShowGarmentCamera(false);

    const toastId = 'garment-capture';
    toast.loading('Processing captured image...', { id: toastId });

    const skipClassification = tryOnPath === 'REFERENCE';
    const { ok, message } = await setGarmentFile(file, skipClassification);

    if (ok) {
      toast.success('Garment captured successfully', { id: toastId });
    } else {
      toast.error(message || 'Capture failed', { id: toastId });
    }
  }, [setGarmentFile, tryOnPath]);

  const handleGarmentCameraError = useCallback((error: string | DOMException) => {
    console.error('Garment camera error:', error);
    setShowGarmentCamera(false);

    let errorMessage = 'Failed to access camera';
    if (typeof error === 'object' && error.name) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application.';
      }
    }

    toast.error(errorMessage, { duration: 5000 });
  }, []);

  // Upload handlers
  const handleBodyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setBody(file);
    toast.success('Body photo uploaded');
  };

  const handleGarmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please upload an image file');
    if (file.size > 10 * 1024 * 1024) return toast.error('File size must be less than 10MB');

    const toastId = 'garment-upload';
    toast.loading('Uploading garment...', { id: toastId });

    const skipClassification = tryOnPath === 'REFERENCE';
    const { ok, message } = await setGarmentFile(file, skipClassification);

    if (ok) toast.success('Garment uploaded', { id: toastId });
    else toast.error(message || 'Garment upload failed', { id: toastId });
  };

  const handleUpperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please upload an image file');
    if (file.size > 10 * 1024 * 1024) return toast.error('File size must be less than 10MB');

    const toastId = 'upper-upload';
    toast.loading('Uploading upper garment...', { id: toastId });

    const { ok, message } = await setUpperGarment(file);

    if (ok) toast.success('Upper garment uploaded', { id: toastId });
    else toast.error(message || 'Upload failed', { id: toastId });
  };

  const handleLowerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please upload an image file');
    if (file.size > 10 * 1024 * 1024) return toast.error('File size must be less than 10MB');

    const toastId = 'lower-upload';
    toast.loading('Uploading lower garment...', { id: toastId });

    const { ok, message } = await setLowerGarment(file);

    if (ok) toast.success('Lower garment uploaded', { id: toastId });
    else toast.error(message || 'Upload failed', { id: toastId });
  };

  const handleConstructOutfit = async () => {
    toast.loading('Constructing outfit...', { id: 'construct' });
    await constructOutfitPreview();
    if (error) {
      toast.error(error, { id: 'construct' });
    } else {
      toast.success('Outfit constructed successfully', { id: 'construct' });
    }
  };

  const handleGenerate = async () => {
    setProgress(0);
    await tryOn();
    if (error) {
      toast.error(error);
      setProgress(0);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    downloadBase64ImageSmart(resultUrl, 'photo-tryon');
  };

  const handleNewTryOn = () => {
    setShowBodyCamera(false);
    setShowGarmentCamera(false);
    setProgress(0);
    reset();
    toast.info('Starting new try-on');
  };

  return (
    <div className="w-full h-full flex flex-col text-neutral-100">
      {/* Progress Indicator - Studio Theme */}
      {step !== 'PATH_SELECT' && step !== 'RESULT' && (
        <div className="sticky top-0 z-10 bg-neutral-900/90 backdrop-blur-md border-b border-white/10 p-3 sm:p-4 shadow-md">
          <div className="flex items-center justify-between text-xs sm:text-sm mb-2 max-w-2xl mx-auto">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              {tryOnPath === 'FULL'
                ? 'Full Outfit Studio'
                : tryOnPath === 'REFERENCE'
                  ? 'Reference Style Studio'
                  : 'Single Garment Studio'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
              Langkah{' '}
              {step === 'BODY'
                ? '1 / 3: Foto Tubuh'
                : step === 'GARMENT' || step === 'UPPER'
                  ? '2 / 3: Pakaian'
                  : step === 'LOWER'
                    ? '2b / 3: Bawahan'
                    : step === 'PREVIEW'
                      ? 'Pre-render'
                      : '3 / 3: Generate'}
            </span>
          </div>
          <AnimatePresence mode="wait">
            {(status === 'classifying' || status === 'constructing' || status === 'processing') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-1.5 max-w-2xl mx-auto pt-1"
              >
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-500 rounded-full"
                    style={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>
                <motion.p
                  key={status}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-purple-300 text-center flex items-center justify-center gap-1.5 font-medium"
                >
                  <motion.span
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    {status === 'classifying' && '🔍'}
                    {status === 'constructing' && '🎨'}
                    {status === 'processing' && '✨'}
                  </motion.span>
                  {status === 'classifying' && 'Menganalisis jenis pakaian...'}
                  {status === 'constructing' && 'Menyusun set outfit...'}
                  {status === 'processing' && `Menghasilkan try-on fotorealistik (${progress}%)...`}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Content Area */}
      <div ref={contentScrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
        {/* PATH SELECTION */}
        {step === 'PATH_SELECT' && (
          <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
            {/* Header with Studio Badge */}
            <div className="text-center space-y-3 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/15 via-indigo-500/20 to-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold shadow-inner">
                <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                <span>AI VIRTUAL FITTING STUDIO</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Pilih Mode Try-On
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                Pilih cara Anda ingin mencoba pakaian virtual berkualitas HD fotorealistik menggunakan AI
              </p>
            </div>

            {/* Quick Tour Button */}
            <button
              type="button"
              onClick={openPhotoOnboarding}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-all text-xs font-medium cursor-pointer shadow-sm group"
            >
              <HelpCircle className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
              <span>Lihat Panduan Singkat (Tour)</span>
            </button>

            {/* Mode Cards */}
            <div className="grid gap-3.5 sm:gap-4">
              {/* NORMAL Path */}
              <div
                className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.07] to-white/[0.02] hover:from-white/[0.12] hover:to-white/[0.05] border border-white/10 hover:border-blue-500/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-blue-500/10 active:scale-[0.99]"
                onClick={() => setPath('NORMAL')}
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
                <div className="flex items-start gap-4 sm:gap-5 relative z-10">
                  <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all">
                    <Shirt className="h-6 w-6 sm:h-7 sm:w-7 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-blue-300 transition-colors">
                        Single Garment
                      </h3>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        Rekomendasi
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-400 mb-3 leading-relaxed">
                      Coba 1 pakaian (baju kaos, kemeja, celana, atau gaun) langsung ke tubuh Anda dengan cepat.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300">⚡ Cepat (1 Foto)</span>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300">🎯 Presisi Tinggi</span>
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 group-hover:text-white group-hover:bg-blue-500/20 group-hover:border-blue-500/40 group-hover:translate-x-1 transition-all shrink-0 mt-1">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* FULL Path */}
              <div
                className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.07] to-white/[0.02] hover:from-white/[0.12] hover:to-white/[0.05] border border-white/10 hover:border-purple-500/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-purple-500/10 active:scale-[0.99]"
                onClick={() => setPath('FULL')}
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
                <div className="flex items-start gap-4 sm:gap-5 relative z-10">
                  <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
                    <Layers className="h-6 w-6 sm:h-7 sm:w-7 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-purple-300 transition-colors">
                        Complete Outfit
                      </h3>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        Kombinasi Penuh
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-400 mb-3 leading-relaxed">
                      Kombinasikan atasan dan bawahan sekaligus untuk melihat keserasian gaya setelan lengkap.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300">👔 Atasan + Bawahan</span>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300">🎨 Mix & Match</span>
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 group-hover:text-white group-hover:bg-purple-500/20 group-hover:border-purple-500/40 group-hover:translate-x-1 transition-all shrink-0 mt-1">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* REFERENCE Path */}
              <div
                className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.07] to-white/[0.02] hover:from-white/[0.12] hover:to-white/[0.05] border border-white/10 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-emerald-500/10 active:scale-[0.99]"
                onClick={() => setPath('REFERENCE')}
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
                <div className="flex items-start gap-4 sm:gap-5 relative z-10">
                  <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
                    <User className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-emerald-300 transition-colors">
                        Full Reference
                      </h3>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Referensi Model
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-400 mb-3 leading-relaxed">
                      Gunakan foto orang mengenakan busana lengkap sebagai referensi gaya dan pose AI.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300">📸 Foto Full Body</span>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300">✨ Style Transfer</span>
                    </div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 group-hover:text-white group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 group-hover:translate-x-1 transition-all shrink-0 mt-1">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: BODY PHOTO */}
        {step === 'BODY' && (
          <div className="py-2 sm:py-4 px-3 sm:px-4 space-y-3.5 sm:space-y-4 max-w-xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Foto Diri Anda
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
                Ambil selfie / foto setengah badan menghadap lurus ke depan untuk dicocokkan dengan pakaian pilihan Anda
              </p>
            </div>

            {/* Quality Tips */}
            {!body.file && (
              <QualityTipsCard
                title="Tips Agar Pakaian Pas Sempurna"
                tips={[
                  'Hadap lurus ke kamera; kedua bahu terlihat jelas',
                  'Gunakan pencahayaan yang terang dan merata di depan Anda',
                  'Latar belakang polos akan memberikan hasil fitting paling rapi',
                  'Posisi tubuh rileks dengan tangan di samping tubuh',
                ]}
              />
            )}

            {!body.file && !showBodyCamera ? (
              <div className="space-y-3 max-w-md mx-auto">
                {/* Primary Action: Camera Shutter Button */}
                <button
                  type="button"
                  onClick={() => setShowBodyCamera(true)}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 text-white flex items-center justify-center gap-2.5 font-bold text-sm transition-all cursor-pointer shadow-lg shadow-purple-600/25 border border-purple-400/25 active:scale-[0.98] group"
                >
                  <Camera className="h-4.5 w-4.5 text-white group-hover:scale-110 transition-transform" />
                  <span>Ambil Foto Langsung (Kamera HP)</span>
                  <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                </button>

                <div className="relative py-0.5">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-neutral-950 px-3 text-neutral-500 font-semibold tracking-wider">Atau Pilih dari Galeri</span>
                  </div>
                </div>

                {/* Secondary Action: File / Gallery Picker Card */}
                <div
                  className="group relative overflow-hidden rounded-2xl border border-white/10 hover:border-purple-500/40 bg-white/[0.02] hover:bg-purple-500/[0.04] p-4 sm:p-5 text-center cursor-pointer transition-all duration-200 active:scale-[0.99] shadow-sm"
                  onClick={() => bodyFileInputRef.current?.click()}
                >
                  <div className="flex justify-center mb-2">
                    <div className="h-11 w-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 group-hover:scale-105 group-hover:bg-purple-500/25 transition-all">
                      <Upload className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-xs sm:text-sm text-neutral-100 group-hover:text-purple-300 transition-colors">
                      Pilih dari Galeri Foto / File
                    </p>
                    <p className="text-[11px] text-neutral-400">Format foto JPG atau PNG (Maks 10MB)</p>
                  </div>
                </div>
              </div>
            ) : showBodyCamera ? (
              <div className="space-y-3 sm:space-y-4 pb-4">
                {/* Camera Preview with Guide Overlay */}
                <div className="relative w-full aspect-[3/4] sm:max-w-lg mx-auto rounded-2xl overflow-hidden border-2 border-purple-500/50 bg-black shadow-2xl">
                  <Webcam
                    ref={bodyWebcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      facingMode: bodyFacingMode,
                      width: { ideal: 1280 },
                      height: { ideal: 720 },
                    }}
                    onUserMediaError={handleBodyCameraError}
                    className="w-full h-full object-cover"
                    mirrored={bodyFacingMode === 'user'}
                  />

                  {/* Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Center Guide Frame */}
                    <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-10">
                      <div className="w-full h-full border-2 border-dashed border-white/40 rounded-2xl" />
                    </div>

                    {/* Instructions */}
                    <div className="absolute top-3 sm:top-4 left-0 right-0 text-center px-3">
                      <div className="inline-block bg-black/80 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg border border-white/10">
                        <p className="text-white text-xs sm:text-sm font-medium">Posisikan tubuh Anda di dalam bingkai</p>
                      </div>
                    </div>

                    {/* Camera Status Badge */}
                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                      <div className="flex items-center gap-1.5 sm:gap-2 bg-red-500/90 backdrop-blur-sm px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-[10px] sm:text-xs font-bold tracking-wide">LIVE</span>
                      </div>
                    </div>

                    {/* Camera Switch Button */}
                    <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-neutral-900/90 text-white border border-white/20 hover:bg-neutral-800 shadow-xl pointer-events-auto transition-all hover:scale-110"
                        onClick={toggleBodyCamera}
                      >
                        <SwitchCamera className="h-5 w-5 text-neutral-200" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Camera Controls */}
                <div className="flex gap-2 sm:gap-3 px-2 sm:px-0 sm:max-w-lg mx-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowBodyCamera(false)}
                    className="flex-1 h-12 sm:h-14 text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-xl"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    <span>Batal</span>
                  </Button>
                  <Button
                    size="lg"
                    onClick={captureBodyPhoto}
                    className="flex-[2] h-12 sm:h-14 text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25 transition-all rounded-xl cursor-pointer"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Ambil Foto
                  </Button>
                </div>

                {/* Tips */}
                <div className="mx-2 sm:mx-0 sm:max-w-lg sm:mx-auto p-3 sm:p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 backdrop-blur-sm">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                    <div className="space-y-1 flex-1 text-xs text-neutral-300">
                      <p className="font-semibold text-purple-300">Tips Pengambilan Foto</p>
                      <ul className="space-y-1 text-neutral-400">
                        <li>• Berdirilah sekitar 1–1.5 meter dari kamera</li>
                        <li>• Pastikan pencahayaan cukup terang dan merata</li>
                        <li>• Usahakan kedua bahu terlihat jelas</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-[3/4] max-w-md mx-auto rounded-2xl overflow-hidden border border-white/10 bg-neutral-900 shadow-xl">
                  <Image src={body.previewUrl!} alt="Body photo" fill className="object-contain" />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-3 right-3 rounded-full shadow-lg"
                    onClick={() => setBody(undefined)}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  {/* Quality badge */}
                  {body.quality && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/70 backdrop-blur-md text-emerald-300 border border-emerald-500/30">
                      Kualitas Foto: {body.quality}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={() => bodyFileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-all"
                  >
                    <Upload className="h-4 w-4 text-purple-400" />
                    <span>Ganti Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBodyCamera(true)}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-all"
                  >
                    <Camera className="h-4 w-4 text-purple-400" />
                    <span>Ambil Ulang</span>
                  </button>
                </div>
              </div>
            )}

            <input
              ref={bodyFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleBodyUpload}
              className="hidden"
            />
          </div>
        )}

        {/* STEP 2: GARMENT UPLOAD (NORMAL & REFERENCE) */}
        {step === 'GARMENT' && (tryOnPath === 'NORMAL' || tryOnPath === 'REFERENCE') && (
          <div className="p-4 space-y-5 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {tryOnPath === 'REFERENCE' ? 'Unggah Foto Referensi Model' : 'Pilih Pakaian (Garment)'}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
                {tryOnPath === 'REFERENCE'
                  ? 'Gunakan foto tubuh penuh model atau gaya pakaian yang ingin Anda jadikan referensi'
                  : 'Gunakan produk yang sedang dilihat atau unggah foto pakaian lain yang ingin Anda coba'}
              </p>
            </div>

            {/* Quality Tips */}
            {!garment.file && (
              <QualityTipsCard
                title={
                  tryOnPath === 'REFERENCE'
                    ? 'Panduan Foto Referensi Gaya'
                    : 'Panduan Foto Pakaian Terbaik'
                }
                tips={
                  tryOnPath === 'REFERENCE'
                    ? [
                        'Seluruh tubuh terlihat jelas dari depan tanpa halangan',
                        'Detail pakaian terlihat tajam, hindari filter yang terlalu tebal',
                        'Pencahayaan serupa dengan foto tubuh akan memberi hasil optimal',
                      ]
                    : [
                        'Foto pakaian dari depan, diletakkan rata atau digantung',
                        'Latar belakang polos atau transparan (PNG direkomendasikan)',
                        'Pakaian tepat di tengah, tidak kusut berlebihan',
                        'Resolusi lebar gambar minimal 1024 px',
                      ]
                }
              />
            )}

            {!garment.file && !showGarmentCamera ? (
              <div className="space-y-4">
                <div
                  className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-white/15 hover:border-purple-500/50 bg-white/[0.02] hover:bg-white/[0.05] p-8 sm:p-10 text-center cursor-pointer transition-all duration-200"
                  onClick={() => garmentFileInputRef.current?.click()}
                >
                  <div className="flex justify-center mb-3">
                    <div className="h-16 w-16 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 group-hover:bg-purple-500/25 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
                      <Upload className="h-7 w-7" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                      Pilih atau Seret Foto Pakaian
                    </p>
                    <p className="text-xs text-neutral-400">Mendukung format PNG (transparan disarankan) & JPEG</p>
                  </div>
                </div>

                {tryOnPath !== 'REFERENCE' && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-neutral-950 px-3 text-neutral-500 font-semibold tracking-wider">Atau</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowGarmentCamera(true)}
                      className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white flex items-center justify-center gap-2 font-medium text-sm transition-all cursor-pointer shadow-sm group"
                    >
                      <Camera className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
                      <span>Ambil Foto Baju (Kamera)</span>
                    </button>
                  </>
                )}
              </div>
            ) : showGarmentCamera ? (
              <div className="space-y-3 sm:space-y-4 pb-4">
                {/* Camera Preview with Guide Overlay */}
                <div className="relative w-full aspect-square sm:max-w-lg mx-auto rounded-2xl overflow-hidden border-2 border-purple-500/50 bg-black shadow-2xl">
                  <Webcam
                    ref={garmentWebcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      facingMode: garmentFacingMode,
                      width: { ideal: 1280 },
                      height: { ideal: 720 },
                    }}
                    onUserMediaError={handleGarmentCameraError}
                    className="w-full h-full object-cover"
                    mirrored={garmentFacingMode === 'user'}
                  />

                  {/* Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Center Guide Frame */}
                    <div className="absolute inset-0 flex items-center justify-center p-8 sm:p-14">
                      <div className="w-full h-full border-2 border-dashed border-white/40 rounded-2xl" />
                    </div>

                    {/* Instructions */}
                    <div className="absolute top-3 sm:top-4 left-0 right-0 text-center px-3">
                      <div className="inline-block bg-black/80 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg border border-white/10">
                        <p className="text-white text-xs sm:text-sm font-medium">
                          {tryOnPath === 'REFERENCE' ? 'Posisikan model di tengah bingkai' : 'Posisikan pakaian di tengah bingkai'}
                        </p>
                      </div>
                    </div>

                    {/* Camera Status Badge */}
                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                      <div className="flex items-center gap-1.5 sm:gap-2 bg-red-500/90 backdrop-blur-sm px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-[10px] sm:text-xs font-bold tracking-wide">LIVE</span>
                      </div>
                    </div>

                    {/* Camera Switch Button */}
                    <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-neutral-900/90 text-white border border-white/20 hover:bg-neutral-800 shadow-xl pointer-events-auto transition-all hover:scale-110"
                        onClick={toggleGarmentCamera}
                      >
                        <SwitchCamera className="h-5 w-5 text-neutral-200" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Camera Controls */}
                <div className="flex gap-2 sm:gap-3 px-2 sm:px-0 sm:max-w-lg mx-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowGarmentCamera(false)}
                    className="flex-1 h-12 sm:h-14 text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-xl"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    <span>Batal</span>
                  </Button>
                  <Button
                    size="lg"
                    onClick={captureGarmentPhoto}
                    className="flex-[2] h-12 sm:h-14 text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25 transition-all rounded-xl cursor-pointer"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Ambil Foto
                  </Button>
                </div>

                {/* Tips */}
                <div className="mx-2 sm:mx-0 sm:max-w-lg sm:mx-auto p-3 sm:p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 backdrop-blur-sm">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                    <div className="space-y-1 flex-1 text-xs text-neutral-300">
                      <p className="font-semibold text-purple-300">
                        {tryOnPath === 'REFERENCE' ? 'Tips Foto Referensi' : 'Tips Foto Pakaian'}
                      </p>
                      <ul className="space-y-1 text-neutral-400">
                        {tryOnPath === 'REFERENCE' ? (
                          <>
                            <li>• Seluruh tubuh terlihat dari depan</li>
                            <li>• Pencahayaan merata tanpa bayangan kuat</li>
                            <li>• Busana dan lekuk pakaian terlihat jelas</li>
                          </>
                        ) : (
                          <>
                            <li>• Letakkan pakaian mendatar atau digantung</li>
                            <li>• Gunakan latar polos yang kontras dengan baju</li>
                            <li>• Ratakan lipatan dan kerutan pada kain</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-md mx-auto">
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-neutral-900/90 shadow-xl p-4 flex items-center justify-center">
                  <Image
                    src={garment.previewUrl!}
                    alt="Garment"
                    fill
                    className="object-contain p-4"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-3 right-3 rounded-full shadow-lg"
                    onClick={() => setGarmentFile(undefined)}
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 backdrop-blur-md">
                    Pakaian Terpilih
                  </span>
                </div>

                {garment.classification && tryOnPath === 'NORMAL' && (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-300">Tipe Pakaian Terdeteksi</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        {garment.classification.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span>Tingkat Kepastian (Confidence)</span>
                      <span className="font-semibold text-white">
                        {(garment.classification.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                {status === 'classifying' && (
                  <div className="flex items-center justify-center gap-2 text-xs text-purple-300 font-medium">
                    <LoadingDots size="md" variant="primary" />
                    <span>Menganalisis jenis pakaian...</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => garmentFileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-all cursor-pointer"
                  >
                    <Upload className="h-4 w-4 text-purple-400" />
                    <span>Ganti Pakaian</span>
                  </button>
                  {tryOnPath !== 'REFERENCE' && (
                    <button
                      type="button"
                      onClick={() => setShowGarmentCamera(true)}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-all cursor-pointer"
                    >
                      <Camera className="h-4 w-4 text-purple-400" />
                      <span>Foto Baru</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <input
              ref={garmentFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleGarmentUpload}
              className="hidden"
            />
          </div>
        )}

        {/* STEP 2: UPPER GARMENT (FULL MODE) */}
        {step === 'UPPER' && tryOnPath === 'FULL' && (
          <div className="p-4 space-y-5 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Unggah Pakaian Atasan (Upper Garment)
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
                Baju kaos, kemeja, blazer, jaket, atau atasan lainnya
              </p>
            </div>

            {!upperGarment.file ? (
              <div
                className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-white/15 hover:border-blue-500/50 bg-white/[0.02] hover:bg-white/[0.05] p-8 sm:p-10 text-center cursor-pointer transition-all duration-200"
                onClick={() => upperFileInputRef.current?.click()}
              >
                <div className="flex justify-center mb-3">
                  <div className="h-16 w-16 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 group-hover:bg-blue-500/25 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all">
                    <Shirt className="h-7 w-7" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                    Pilih Foto Baju Atasan
                  </p>
                  <p className="text-xs text-neutral-400">PNG atau JPEG hingga 10MB</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-md mx-auto">
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-neutral-900/90 shadow-xl p-4 flex items-center justify-center">
                  <Image
                    src={upperGarment.previewUrl!}
                    alt="Upper garment"
                    fill
                    className="object-contain p-4"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-3 right-3 rounded-full shadow-lg"
                    onClick={() => setUpperGarment(undefined)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40 backdrop-blur-md">
                    Atasan Terpilih
                  </span>
                </div>

                {upperGarment.classification && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-300">Tipe Terdeteksi</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      {upperGarment.classification.label}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => upperFileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-all cursor-pointer"
                >
                  Ganti Baju Atasan
                </button>
              </div>
            )}

            <input
              ref={upperFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpperUpload}
              className="hidden"
            />
          </div>
        )}

        {/* STEP 3: LOWER GARMENT (FULL MODE) */}
        {step === 'LOWER' && tryOnPath === 'FULL' && (
          <div className="p-4 space-y-5 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Unggah Pakaian Bawahan (Lower Garment)
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
                Celana panjang, jeans, rok, atau celana pendek
              </p>
            </div>

            {!lowerGarment.file ? (
              <div
                className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-white/15 hover:border-purple-500/50 bg-white/[0.02] hover:bg-white/[0.05] p-8 sm:p-10 text-center cursor-pointer transition-all duration-200"
                onClick={() => lowerFileInputRef.current?.click()}
              >
                <div className="flex justify-center mb-3">
                  <div className="h-16 w-16 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 group-hover:bg-purple-500/25 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
                    <Layers className="h-7 w-7" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                    Pilih Foto Baju Bawahan
                  </p>
                  <p className="text-xs text-neutral-400">PNG atau JPEG hingga 10MB</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-md mx-auto">
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-neutral-900/90 shadow-xl p-4 flex items-center justify-center">
                  <Image
                    src={lowerGarment.previewUrl!}
                    alt="Lower garment"
                    fill
                    className="object-contain p-4"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-3 right-3 rounded-full shadow-lg"
                    onClick={() => setLowerGarment(undefined)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 backdrop-blur-md">
                    Bawahan Terpilih
                  </span>
                </div>

                {lowerGarment.classification && (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-300">Tipe Terdeteksi</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      {lowerGarment.classification.label}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => lowerFileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-all cursor-pointer"
                >
                  Ganti Baju Bawahan
                </button>
              </div>
            )}

            <input
              ref={lowerFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLowerUpload}
              className="hidden"
            />
          </div>
        )}

        {/* STEP 4: OUTFIT PREVIEW (FULL MODE) */}
        {step === 'PREVIEW' && tryOnPath === 'FULL' && (
          <div className="p-4 space-y-5 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Preview Set Outfit
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
                Kombinasi atasan dan bawahan Anda siap untuk diproses
              </p>
            </div>

            {outfit.url && (
              <div className="space-y-4 max-w-md mx-auto">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-neutral-900/90 shadow-xl">
                  <Image
                    src={outfit.url}
                    alt="Constructed outfit"
                    fill
                    className="object-contain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <p className="text-[11px] text-neutral-400">Atasan</p>
                    <p className="text-sm font-semibold text-white">{outfit.upperLabel}</p>
                    <p className="text-[11px] text-purple-300">
                      {(outfit.upperConfidence! * 100).toFixed(0)}% match
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <p className="text-[11px] text-neutral-400">Bawahan</p>
                    <p className="text-sm font-semibold text-white">{outfit.lowerLabel}</p>
                    <p className="text-[11px] text-purple-300">
                      {(outfit.lowerConfidence! * 100).toFixed(0)}% match
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GENERATE STEP - 3-Rail Pro Canvas Layout */}
        {step === 'GENERATE' && !resultUrl && (
          <div className="w-full px-4 sm:px-8 py-6">
            {/* Desktop: 3-Rail Layout (≥1440px) */}
            <div className="mx-auto max-w-[1600px]">
              {/* Mobile/Tablet: Stacked Layout (< 1280px) */}
              <div className="block xl:hidden space-y-5">
                {/* Title - Mobile Only */}
                <div className="text-center space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-semibold">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                    <span>Langkah Terakhir</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Siap Fitting Virtual HD</h2>
                  <p className="text-xs text-neutral-400">Pastikan foto Anda dan pakaian sudah sesuai sebelum diproses</p>
                </div>

                {/* Detection + Cloth Type */}
                {garment.classification && tryOnPath === 'NORMAL' && (
                  <div className="flex items-center gap-2 text-xs text-neutral-300">
                    <span>Tipe Baju Otomatis:</span>
                    <ClassificationChip
                      label={garment.classification.label}
                      confidence={garment.classification.confidence}
                      size="sm"
                    />
                  </div>
                )}

                <ClothTypeSelector
                  value={options.clothType || 'upper'}
                  onChange={(value) => setOptions({ clothType: value })}
                  availableTypes={getAvailableClothTypes()}
                  disabledTypes={getDisabledClothTypes()}
                  preselectState={getPreselectState()}
                  detectedLabel={garment.classification?.label}
                  confidence={garment.classification?.confidence}
                />

                {/* Previews */}
                <ProcessingOverlay
                  isProcessing={status === 'processing' || status === 'classifying' || status === 'constructing'}
                  lockMessage="Preview locked"
                  showPulse={false}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-neutral-900/90 border border-white/10 space-y-2">
                      <p className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                        <span>👤 Foto Anda</span>
                      </p>
                      {body.previewUrl && (
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-black/40">
                          <Image src={body.previewUrl} alt="Body" fill className="object-contain" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 rounded-2xl bg-neutral-900/90 border border-white/10 space-y-2">
                      <p className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                        <span>👔 Pakaian</span>
                      </p>
                      {(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl) && (
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-black/40">
                          <Image
                            src={(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl)!}
                            alt="Garment"
                            fill
                            className="object-contain p-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </ProcessingOverlay>

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canProceedToGenerate() || status === 'processing'}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm sm:text-base shadow-2xl shadow-purple-600/35 border border-purple-400/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
                  <span>{status === 'processing' ? `Sedang Memproses Fitting (${progress}%)...` : 'Mulai Fitting Sekarang (HD AI)'}</span>
                </button>

                {/* Progress Bar - Mobile */}
                <AnimatePresence mode="wait">
                  {status === 'processing' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                    >
                      <div className="p-4 rounded-2xl space-y-3 relative overflow-hidden bg-purple-500/10 border border-purple-500/30">
                        {/* Animated background gradient */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"
                          animate={{
                            x: ['-100%', '100%'],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                        />

                        <div className="relative space-y-3">
                          {/* Processing header with animated dots */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <motion.div
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [0.5, 1, 0.5],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                }}
                                className="h-2 w-2 rounded-full bg-purple-400"
                              />
                              <span className="text-sm font-semibold text-white">Memproses Render HD</span>
                            </div>
                            <motion.span
                              key={progress}
                              initial={{ scale: 1.2, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.2 }}
                              className="text-sm font-bold text-purple-300"
                            >
                              {progress}%
                            </motion.span>
                          </div>

                          {/* Progress bar */}
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-500 rounded-full"
                              style={{ width: `${progress}%` }}
                              transition={{ ease: "easeOut" }}
                            />
                          </div>

                          {/* Info text with pulsing icon */}
                          <div className="flex items-center justify-center gap-2 text-xs text-neutral-300">
                            <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                            <span>Proses membutuhkan waktu sekitar 20-40 detik...</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Advanced - Collapsed on Mobile */}
                <ProcessingOverlay
                  isProcessing={status === 'processing' || status === 'classifying' || status === 'constructing'}
                  lockMessage="Settings locked"
                >
                  <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="options" className="border-white/10">
                    <AccordionTrigger className="text-sm text-neutral-300 hover:text-white">Pengaturan Lanjutan</AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-neutral-300">Inference Steps</Label>
                          <span className="text-xs text-purple-300 font-semibold">
                            {options.numInferenceSteps ?? 50}
                          </span>
                        </div>
                        <Slider
                          value={[options.numInferenceSteps ?? 50]}
                          onValueChange={([value]) => setOptions({ numInferenceSteps: value })}
                          min={20}
                          max={100}
                          step={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-neutral-300">Guidance Scale</Label>
                          <span className="text-xs text-purple-300 font-semibold">
                            {(options.guidanceScale ?? 2.5).toFixed(1)}
                          </span>
                        </div>
                        <Slider
                          value={[options.guidanceScale ?? 2.5]}
                          onValueChange={([value]) => setOptions({ guidanceScale: value })}
                          min={1.0}
                          max={10.0}
                          step={0.5}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  </Accordion>
                </ProcessingOverlay>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Desktop: 3-Rail Grid (≥ 1280px) */}
              <div className="hidden xl:grid xl:grid-cols-12 xl:gap-6">
                {/* LEFT RAIL - Controls (3 cols, sticky) */}
                <div className="col-span-3 space-y-4 sticky top-20 self-start">
                  <ProcessingOverlay
                    isProcessing={status === 'processing' || status === 'classifying' || status === 'constructing'}
                    lockMessage="Options locked during processing"
                  >
                    <div className="rounded-2xl bg-neutral-900/90 border border-white/10 p-5 space-y-4 shadow-xl text-white">
                      <h3 className="text-base font-bold text-white">Opsi Pakaian</h3>

                    {/* Inline Detection + Cloth Type */}
                    {garment.classification && tryOnPath === 'NORMAL' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-neutral-300">
                          <span>Auto-selected:</span>
                          <ClassificationChip
                            label={garment.classification.label}
                            confidence={garment.classification.confidence}
                            size="sm"
                          />
                        </div>
                      </div>
                    )}

                    <ClothTypeSelector
                      value={options.clothType || 'upper'}
                      onChange={(value) => setOptions({ clothType: value })}
                      availableTypes={getAvailableClothTypes()}
                      disabledTypes={getDisabledClothTypes()}
                      preselectState={getPreselectState()}
                      detectedLabel={garment.classification?.label}
                      confidence={garment.classification?.confidence}
                    />

                    {/* Mini Preflight Checklist */}
                    {(() => {
                      const preflight = getPreflightChecks();
                      if (tryOnPath === 'FULL' && !preflight.outfitReady) return null;

                      return (
                        <div className="space-y-2 text-xs pt-2 border-t border-white/10">
                          <p className="font-semibold text-neutral-300">Pemeriksaan Kesiapan</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              {preflight.resolutionOK ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                              )}
                              <span className={preflight.resolutionOK ? 'text-neutral-300' : 'text-amber-300'}>
                                Resolusi Gambar
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {preflight.brightnessOK ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                              )}
                              <span className={preflight.brightnessOK ? 'text-neutral-300' : 'text-amber-300'}>
                                Pencahayaan
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {preflight.clothTypeSelected ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <X className="h-3.5 w-3.5 text-rose-400" />
                              )}
                              <span className={preflight.clothTypeSelected ? 'text-neutral-300' : 'text-rose-300'}>
                                Tipe Pakaian
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    </div>
                  </ProcessingOverlay>
                </div>

                {/* CENTER RAIL - Preview Stage (6 cols) */}
                <div className="col-span-6">
                  <ProcessingOverlay
                    isProcessing={status === 'processing' || status === 'classifying' || status === 'constructing'}
                    lockMessage="Preview locked during processing"
                    showPulse={false}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      {/* Body Preview Frame */}
                      <div className="rounded-2xl bg-neutral-900/90 border border-white/10 p-4 space-y-3 shadow-xl">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-neutral-300">Foto Tubuh</p>
                          {body.quality && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {body.quality}
                            </span>
                          )}
                        </div>
                        {body.previewUrl && (
                          <div
                            className="relative rounded-xl overflow-hidden border border-white/10 bg-black/50"
                            style={{ height: 'clamp(420px, 56vh, 680px)' }}
                          >
                            <Image src={body.previewUrl} alt="Body" fill className="object-contain" />
                          </div>
                        )}
                      </div>

                      {/* Garment Preview Frame */}
                      <div className="rounded-2xl bg-neutral-900/90 border border-white/10 p-4 space-y-3 shadow-xl">
                        <p className="text-xs font-semibold text-neutral-300">
                          {tryOnPath === 'FULL'
                            ? 'Set Outfit'
                            : tryOnPath === 'REFERENCE'
                              ? 'Foto Referensi'
                              : 'Pakaian Terpilih'}
                        </p>
                        {(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl) && (
                          <div
                            className="relative rounded-xl overflow-hidden border border-white/10 bg-black/50"
                            style={{ height: 'clamp(420px, 56vh, 680px)' }}
                          >
                            <Image
                              src={(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl)!}
                              alt="Garment"
                              fill
                              className="object-contain p-4"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </ProcessingOverlay>
                </div>

                {/* RIGHT RAIL - Actions (3 cols, sticky) */}
                <div className="col-span-3 space-y-4 sticky top-20 self-start">
                  <div className="rounded-2xl bg-neutral-900/90 border border-white/10 p-5 space-y-4 shadow-xl text-white">
                    {/* Generate Button */}
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={!canProceedToGenerate() || status === 'processing'}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center gap-2 cursor-pointer border border-purple-400/20"
                    >
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      <span>{status === 'processing' ? 'Sedang Memproses...' : 'Generate Try-On HD'}</span>
                    </button>

                    {/* Inline Progress */}
                    <AnimatePresence mode="wait">
                      {status === 'processing' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                          className="relative overflow-hidden rounded-xl border border-purple-500/30 bg-purple-500/10 p-3.5"
                        >
                          {/* Animated shimmer effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"
                            animate={{
                              x: ['-200%', '200%'],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: 'linear',
                            }}
                          />

                          <div className="relative space-y-2.5">
                            {/* Processing header */}
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <motion.div
                                  animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.4, 1, 0.4],
                                  }}
                                  transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                  }}
                                  className="h-2 w-2 rounded-full bg-purple-400"
                                />
                                <span className="font-semibold text-white">Memproses AI</span>
                              </div>
                              <motion.span
                                key={progress}
                                initial={{ scale: 1.1, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className="font-bold text-purple-300"
                              >
                                {progress}%
                              </motion.span>
                            </div>

                            {/* Progress bar */}
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-500 rounded-full"
                                style={{ width: `${progress}%` }}
                                transition={{ ease: "easeOut" }}
                              />
                            </div>

                            {/* Info text */}
                            <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                              <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                              <span>Waktu proses ± 20-40 detik</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {/* Advanced Settings */}
                    <ProcessingOverlay
                      isProcessing={status === 'processing' || status === 'classifying' || status === 'constructing'}
                      lockMessage="Options locked during processing"
                    >
                      <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="options" className="border-white/10">
                        <AccordionTrigger className="text-xs text-neutral-300 hover:text-white">Pengaturan Lanjutan</AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-neutral-300" title="Number of diffusion steps">
                                Inference Steps
                              </Label>
                              <span className="text-xs text-purple-300 font-semibold">
                                {options.numInferenceSteps ?? 50}
                              </span>
                            </div>
                            <Slider
                              value={[options.numInferenceSteps ?? 50]}
                              onValueChange={([value]) => setOptions({ numInferenceSteps: value })}
                              min={20}
                              max={100}
                              step={5}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-neutral-300" title="Guidance strength">
                                Guidance Scale
                              </Label>
                              <span className="text-xs text-purple-300 font-semibold">
                                {(options.guidanceScale ?? 2.5).toFixed(1)}
                              </span>
                            </div>
                            <Slider
                              value={[options.guidanceScale ?? 2.5]}
                              onValueChange={([value]) => setOptions({ guidanceScale: value })}
                              min={1.0}
                              max={10.0}
                              step={0.5}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      </Accordion>
                    </ProcessingOverlay>

                    {/* Info Box */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-neutral-400 leading-relaxed">
                      Pemrosesan menggunakan GPU server virtual AI. Hasil sintesis disesuaikan dengan proporsi tubuh Anda.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESULT VIEW - MOBILE-FIRST ERGONOMIC REDESIGN */}
        {step === 'RESULT' && resultUrl && (
          <div className="flex flex-col min-h-full pb-28 sm:pb-8 max-w-xl mx-auto px-3 sm:px-4 space-y-3 sm:space-y-4">
            {/* Top Compact Status & Title */}
            <div className="text-center pt-1 sm:pt-2 space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Try-On HD Fotorealistik Selesai</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Hasil Fitting Virtual Anda
              </h2>
            </div>

            {/* Main Interactive Canvas with View Switcher */}
            <div className="relative w-full rounded-2xl sm:rounded-3xl border border-white/15 bg-neutral-900 shadow-2xl overflow-hidden aspect-[3/4] max-h-[58vh] sm:max-h-[520px] mx-auto select-none">
              {/* Floating Glassmorphic View Switcher Pills */}
              <div className="absolute top-2.5 inset-x-2.5 z-20 flex items-center justify-center">
                <div className="bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/15 flex items-center gap-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => setResultViewMode('result')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      resultViewMode === 'result'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    ✨ Hasil HD
                  </button>
                  {body.previewUrl && (
                    <button
                      type="button"
                      onClick={() => setResultViewMode('original')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        resultViewMode === 'original'
                          ? 'bg-white/20 text-white shadow-md'
                          : 'text-neutral-300 hover:text-white'
                      }`}
                    >
                      👤 Foto Asli
                    </button>
                  )}
                  {(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl) && (
                    <button
                      type="button"
                      onClick={() => setResultViewMode('garment')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        resultViewMode === 'garment'
                          ? 'bg-white/20 text-white shadow-md'
                          : 'text-neutral-300 hover:text-white'
                      }`}
                    >
                      👔 Pakaian
                    </button>
                  )}
                </div>
              </div>

              {/* View Rendering based on active tab */}
              {resultViewMode === 'result' && (
                <Image
                  src={resultUrl}
                  alt="Try-on result"
                  fill
                  className="object-contain"
                  unoptimized
                  priority
                />
              )}
              {resultViewMode === 'original' && body.previewUrl && (
                <Image
                  src={body.previewUrl}
                  alt="Foto tubuh asli"
                  fill
                  className="object-contain"
                  unoptimized
                  priority
                />
              )}
              {resultViewMode === 'garment' && (
                <Image
                  src={(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl)!}
                  alt="Pakaian"
                  fill
                  className="object-contain p-4 bg-black/40"
                  unoptimized
                  priority
                />
              )}

              {/* Floating Bottom Left Badge */}
              <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
                <span className="bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg text-[10px] text-white/90 font-medium flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  AI Diffusion · 1024px
                </span>
              </div>
            </div>

            {/* Compact Comparison Ribbon */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {body.previewUrl && (
                <button
                  type="button"
                  onClick={() => setResultViewMode('original')}
                  className={`flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border transition-all cursor-pointer ${
                    resultViewMode === 'original'
                      ? 'bg-purple-500/20 border-purple-500/60 shadow-sm'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  title="Lihat Foto Asli"
                >
                  <div className="relative w-7 h-9 rounded-lg overflow-hidden bg-black/40 shrink-0">
                    <Image src={body.previewUrl} alt="Foto Asli" fill className="object-cover" />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-neutral-400 leading-none">Foto</p>
                    <p className="text-[11px] font-semibold text-white mt-0.5">Tubuh</p>
                  </div>
                </button>
              )}

              <span className="text-neutral-500 text-xs font-bold">+</span>

              {(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl) && (
                <button
                  type="button"
                  onClick={() => setResultViewMode('garment')}
                  className={`flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border transition-all cursor-pointer ${
                    resultViewMode === 'garment'
                      ? 'bg-purple-500/20 border-purple-500/60 shadow-sm'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  title="Lihat Pakaian"
                >
                  <div className="relative w-7 h-9 rounded-lg overflow-hidden bg-black/40 shrink-0">
                    <Image
                      src={(tryOnPath === 'FULL' ? outfit.url : garment.previewUrl)!}
                      alt="Pakaian"
                      fill
                      className="object-contain p-0.5"
                    />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-neutral-400 leading-none">Model</p>
                    <p className="text-[11px] font-semibold text-white mt-0.5">Baju</p>
                  </div>
                </button>
              )}

              <span className="text-neutral-500 text-xs font-bold">=</span>

              <button
                type="button"
                onClick={() => setResultViewMode('result')}
                className={`flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border transition-all cursor-pointer ${
                  resultViewMode === 'result'
                    ? 'bg-emerald-500/20 border-emerald-500/60 shadow-sm'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                title="Lihat Hasil AI"
              >
                <div className="relative w-7 h-9 rounded-lg overflow-hidden bg-black/40 shrink-0 border border-emerald-500/40">
                  <Image src={resultUrl} alt="Hasil AI" fill className="object-cover" unoptimized />
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-emerald-400 font-semibold leading-none">Hasil AI</p>
                  <p className="text-[11px] font-bold text-white mt-0.5">Try-On</p>
                </div>
              </button>
            </div>

            {/* Success Message Card (Compact) */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-white max-w-xl mx-auto w-full">
              <div className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <p className="text-xs text-neutral-300">
                  <span className="font-semibold text-emerald-300">Selesai: </span>
                  Pencahayaan dan kerutan pakaian telah diselaraskan fotorealistik ke tubuh Anda.
                </p>
              </div>
            </div>

            {/* Mobile Thumb-Zone Floating Action Dock */}
            <div className="fixed sm:static bottom-0 inset-x-0 z-40 bg-neutral-900/95 sm:bg-transparent backdrop-blur-xl sm:backdrop-blur-none border-t border-white/10 sm:border-0 p-3 pb-6 sm:p-0 sm:pt-2 shadow-2xl sm:shadow-none">
              <div className="flex items-center gap-2.5 max-w-xl mx-auto w-full">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-purple-500/25 border border-purple-400/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Unduh Gambar HD</span>
                </button>

                <button
                  type="button"
                  onClick={handleNewTryOn}
                  className="h-12 px-4 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-[0.98] border border-white/15 text-white font-semibold text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                  title="Coba Pakaian Lain"
                >
                  <RefreshCw className="h-4 w-4 text-purple-400" />
                  <span className="hidden xs:inline text-xs">Coba Lain</span>
                </button>

                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (resultUrl.startsWith('data:')) {
                          const blob = await (await fetch(resultUrl)).blob();
                          const file = new File([blob], 'tryon-result.png', { type: 'image/png' });
                          if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({ files: [file], title: 'Hasil Fitting Virtual Saya' });
                            return;
                          }
                        }
                        await navigator.share({
                          title: 'Hasil Fitting Virtual Saya',
                          text: 'Lihat pakaian ini di tubuh saya via BELLSGALLERY Fitting Studio!',
                          url: window.location.href,
                        });
                      } catch (e) {
                        console.warn('Share canceled or failed', e);
                      }
                    }}
                    className="h-12 w-12 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-[0.98] border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                    title="Bagikan ke Media Sosial / Teman"
                  >
                    <Share2 className="h-4 w-4 text-emerald-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer - Studio Theme */}
      {step !== 'PATH_SELECT' && step !== 'RESULT' && (
        <div className="sticky bottom-0 bg-neutral-900/95 backdrop-blur-md border-t border-white/10 p-3 sm:p-4 z-20 shadow-2xl">
          <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => {
                if (step === 'BODY') {
                  setStep('PATH_SELECT');
                } else if (step === 'GARMENT' || step === 'UPPER') {
                  setStep('BODY');
                } else if (step === 'LOWER') {
                  setStep('UPPER');
                } else if (step === 'PREVIEW') {
                  setStep('LOWER');
                } else if (step === 'GENERATE') {
                  if (tryOnPath === 'FULL') setStep('PREVIEW');
                  else setStep('GARMENT');
                }
              }}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-neutral-300 hover:text-white transition-all text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Kembali</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (step === 'BODY' && body.file) {
                  if (tryOnPath === 'FULL') setStep('UPPER');
                  else setStep('GARMENT');
                } else if (step === 'GARMENT' && garment.file) {
                  setStep('GENERATE');
                } else if (step === 'UPPER' && upperGarment.file) {
                  setStep('LOWER');
                } else if (step === 'LOWER' && lowerGarment.file) {
                  handleConstructOutfit();
                } else if (step === 'PREVIEW' && outfit.url) {
                  setStep('GENERATE');
                }
              }}
              disabled={
                (step === 'BODY' && !body.file) ||
                (step === 'GARMENT' && !garment.file) ||
                (step === 'UPPER' && !upperGarment.file) ||
                (step === 'LOWER' && !lowerGarment.file) ||
                (step === 'PREVIEW' && !outfit.url) ||
                step === 'GENERATE'
              }
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all text-xs font-bold shadow-md shadow-purple-500/20 disabled:opacity-30 disabled:hover:from-violet-600 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Lanjutkan</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
