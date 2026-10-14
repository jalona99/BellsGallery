// src/components/vfr/AutoAlignButton.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Target, Loader2, CheckCircle2 } from 'lucide-react';
import { useTryonStore, getActiveGarment } from '@/lib/tryon-store';
import { calculateShoulderPosition, calculateGarmentPosition, isConfidentPose } from '@/lib/pose-utils';
import { PoseLandmark } from '@/types/tryon';

interface AutoAlignButtonProps {
  landmarks: PoseLandmark[] | null;
  containerWidth: number;
  containerHeight: number;
  videoWidth?: number;
  videoHeight?: number;
  disabled?: boolean;
}

export function AutoAlignButton({
  landmarks,
  containerWidth,
  containerHeight,
  videoWidth = 1280,
  videoHeight = 720,
  disabled,
}: AutoAlignButtonProps) {
  const { autoAlignGarment, selectedGarmentId, garments } = useTryonStore();
  const [isAligning, setIsAligning] = useState(false);
  const [justAligned, setJustAligned] = useState(false);

  const selectedGarment = getActiveGarment(garments, selectedGarmentId);
  const aspectRatio = selectedGarment && selectedGarment.height > 0
    ? selectedGarment.width / selectedGarment.height
    : 0.92;

  const canAutoAlign = Boolean(landmarks && isConfidentPose(landmarks) && selectedGarment);

  const handleAutoAlign = () => {
    if (!landmarks || !canAutoAlign) return;

    setIsAligning(true);

    setTimeout(() => {
      const shoulderPos = calculateShoulderPosition(
        landmarks,
        containerWidth,
        containerHeight,
        videoWidth,
        videoHeight
      );

      if (!shoulderPos) {
        setIsAligning(false);
        return;
      }

      const garmentSuggestion = calculateGarmentPosition(shoulderPos, 240, aspectRatio);

      autoAlignGarment(
        garmentSuggestion.x,
        garmentSuggestion.y,
        garmentSuggestion.scale,
        garmentSuggestion.rotation
      );

      setIsAligning(false);
      setJustAligned(true);
    }, 150);
  };

  useEffect(() => {
    if (justAligned) {
      const timer = setTimeout(() => setJustAligned(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [justAligned]);

  return (
    <button
      onClick={handleAutoAlign}
      disabled={disabled || !canAutoAlign || isAligning}
      className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold backdrop-blur-md border flex items-center gap-1.5 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
        justAligned
          ? 'bg-emerald-500/90 border-emerald-400 text-black shadow-emerald-500/30'
          : canAutoAlign
          ? 'bg-black/75 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 ring-1 ring-emerald-500/30'
          : 'bg-black/60 border-white/20 text-white/60'
      }`}
    >
      {isAligning ? (
        <>
          <Loader2 size={13} className="animate-spin text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">Menyelaraskan...</span>
          <span className="sm:hidden">Align...</span>
        </>
      ) : justAligned ? (
        <>
          <CheckCircle2 size={13} className="text-black shrink-0" />
          <span className="hidden sm:inline">Bahu Terpasang!</span>
          <span className="sm:hidden">Pas!</span>
        </>
      ) : (
        <>
          <Target size={13} className={`${canAutoAlign ? 'text-emerald-400' : 'text-white/60'} shrink-0`} />
          <span className="hidden sm:inline">Auto-Align Bahu</span>
          <span className="sm:hidden">Auto Align</span>
        </>
      )}
    </button>
  );
}
