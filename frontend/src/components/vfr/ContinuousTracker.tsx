// src/components/vfr/ContinuousTracker.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useTryonStore, getActiveGarment } from '@/lib/tryon-store';
import { calculateShoulderPosition, calculateGarmentPosition, isConfidentPose } from '@/lib/pose-utils';
import { PoseLandmark } from '@/types/tryon';
import { OneEuroFilter } from '@/lib/OneEuroFilter';

interface ContinuousTrackerProps {
  landmarks: PoseLandmark[] | null;
  containerWidth: number;
  containerHeight: number;
  videoWidth?: number;
  videoHeight?: number;
}

export function ContinuousTracker({
  landmarks,
  containerWidth,
  containerHeight,
  videoWidth = 1280,
  videoHeight = 720,
}: ContinuousTrackerProps) {
  const { continuousTracking, autoAlignGarment, selectedGarmentId, garments } = useTryonStore();
  const lastUpdateRef = useRef(0);

  // Filter 1€ untuk menghaluskan pusat tubuh dan skala (meredam jitter sensor webcam)
  const filterCenterX = useRef(new OneEuroFilter(30, 1.2, 0.008, 1.0));
  const filterCenterY = useRef(new OneEuroFilter(30, 1.2, 0.008, 1.0));
  const filterScale = useRef(new OneEuroFilter(30, 1.0, 0.005, 1.0));
  const filterRot = useRef(new OneEuroFilter(30, 1.0, 0.008, 1.0));

  const activeGarment = getActiveGarment(garments, selectedGarmentId);
  const aspectRatio = activeGarment && activeGarment.height > 0
    ? activeGarment.width / activeGarment.height
    : 0.92;

  useEffect(() => {
    if (!continuousTracking || !landmarks) return;

    const now = Date.now();
    // Update setiap 33ms (~30 FPS) untuk kelancaran tinggi
    if (now - lastUpdateRef.current < 33) return;

    if (!isConfidentPose(landmarks)) return;

    const shoulderPos = calculateShoulderPosition(
      landmarks,
      containerWidth,
      containerHeight,
      videoWidth,
      videoHeight
    );
    if (!shoulderPos) return;

    const raw = calculateGarmentPosition(shoulderPos, 240, aspectRatio);

    // Filter pergerakan pusat bahu dan ukuran tubuh untuk menghilangkan jitter webcam
    const smoothCenterX = filterCenterX.current.filter(shoulderPos.center.x, now);
    const smoothCenterY = filterCenterY.current.filter(shoulderPos.center.y, now);
    const smoothScale = filterScale.current.filter(raw.scale, now);
    const smoothRot = filterRot.current.filter(raw.rotation, now);

    // Kunci posisi x & y agar 100% presisi terpusat pada bahu pengguna tanpa desync saat skala membesar/mengecil
    const baseWidth = 240;
    const currentW = baseWidth * smoothScale;
    const currentH = currentW / aspectRatio;
    const collarOffsetY = currentH * 0.18;

    const smoothX = smoothCenterX - currentW / 2;
    const smoothY = smoothCenterY - collarOffsetY;

    autoAlignGarment(
      Math.round(smoothX),
      Math.round(smoothY),
      Number(smoothScale.toFixed(3)),
      Math.round(smoothRot)
    );

    lastUpdateRef.current = now;
  }, [
    landmarks,
    containerWidth,
    containerHeight,
    videoWidth,
    videoHeight,
    continuousTracking,
    autoAlignGarment,
    selectedGarmentId,
    aspectRatio,
    garments,
  ]);

  return null; // Side-effect only
}

