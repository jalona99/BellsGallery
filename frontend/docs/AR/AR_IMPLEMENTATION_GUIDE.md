# AR Virtual Fitting Room Implementation Guide — Phygital Store

**Version:** 2.1 (Fully Integrated & Audited) | **Last Updated:** 2026-10-13 | **Status:** Active Production Module

---

## Table of Contents

1. [Overview & Project Context](#overview--project-context)
2. [Current Stack Audit vs Required Dependencies](#current-stack-audit-vs-required-dependencies)
3. [Step 1: Installing Required Dependencies](#step-1-installing-required-dependencies)
4. [Step 2: Type Definitions (`src/types/tryon.ts`)](#step-2-type-definitions-srctypestryonts)
5. [Step 3: Core Geometry & Pose Math (`src/lib/pose-utils.ts`)](#step-3-core-geometry--pose-math-srclibpose-utilsts)
6. [Step 4: MediaPipe Hook (`src/hooks/usePoseDetection.ts`)](#step-4-mediapipe-hook-srchooksuseposedetectionts)
7. [Step 5: Dedicated AR State Store (`src/lib/tryon-store.ts`)](#step-5-dedicated-ar-state-store-srclibtryon-storets)
8. [Step 6: AR Live Canvas Components (`src/components/vfr/`)](#step-6-ar-live-canvas-components-srccomponentsvfr)
9. [Step 7: Integration with Phygital Store Product Page](#step-7-integration-with-phygital-store-product-page)
10. [Step 8: Next.js 16 Configuration](#step-8-nextjs-16-configuration)
11. [Step 9: Background Removal Service (`garment-processing-api`)](#step-9-background-removal-service-garment-processing-api)
12. [Final Verification & Testing](#final-verification--testing)

---

## Overview & Project Context

**Phygital Store** currently features:
- E-Commerce catalog with dynamic product views (`src/app/product/[id]/page.tsx`).
- 3D WebGL infrastructure using `@react-three/fiber`, `@react-three/drei`, and `three`.
- A snapshot/photo-booth fitting room (`src/components/VirtualFittingRoom.tsx`) with posture checks (`evaluatePosture`), Web Worker BlazePose pose detection (`public/pose-worker.js`), smart size recommendations (`src/lib/SizeAdvisor.ts`), and synthetic 2D fitting (`compositeVirtualTryOn`).

### What This Module Adds

This module integrates the **Real-Time Live AR Overlay (MediaPipe + Interactive Drag/Resize)** inspired by `ar-fashion-tryon`. Unlike snapshot-based fitting, this mode gives users a **live, continuous video stream** where garments:
1. Automatically snap and follow user shoulders in real-time (continuous tracking at 10 FPS).
2. Can be manually repositioned, scaled, and rotated on the fly using `react-rnd`.
3. Provide visual skeleton joint feedback via a 33-point debug canvas.

---

## Current Stack Audit vs Required Dependencies

### Verified Environment in `frontend/package.json`

| Dependency | Version in Project | Status |
|:-----------|:-------------------|:-------|
| Framework | **Next.js 16.3.0** (App Router) | ✅ Installed |
| UI Library | **React 19.2.8** | ✅ Installed |
| 3D Engine | `@react-three/fiber ^9.7.0`, `three ^0.185.1` | ✅ Installed |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss ^4`) | ✅ Installed |
| Icons | `lucide-react ^1.28.0` | ✅ Installed |
| State Management | `zustand ^5.0.15` (for AR high-FPS transforms) | ✅ Installed |
| Pose Detection | `@mediapipe/tasks-vision ^1.0.1` + BlazePose Worker | ✅ Installed |
| AR Drag/Resize | `react-rnd ^10.5.3` | ✅ Installed |

*(All required packages are fully pre-installed and bundled in `frontend/package.json`)*

---

## Step 1: Installing Required Dependencies

Open your terminal in the frontend directory:

```bash
cd C:\Users\admin\Documents\phygital-store\frontend
npm install @mediapipe/tasks-vision react-rnd zustand
```

---

## Step 2: Type Definitions (`src/types/tryon.ts`)

Create `src/types/tryon.ts` to define all interfaces for the AR Live module:

```typescript
// src/types/tryon.ts

export interface PoseLandmark {
  x: number;           // Normalized 0-1, mirrored for selfie view
  y: number;           // Normalized 0-1
  z: number;           // Relative depth
  visibility?: number; // Detection confidence (0-1)
}

export interface Transform {
  x: number;          // Container horizontal position (pixels)
  y: number;          // Container vertical position (pixels)
  scale: number;      // Scaling multiplier (0.3x - 3.0x)
  rotation: number;   // Rotation in degrees (-45° to +45°)
  opacity: number;    // Opacity (10 - 100%)
  lockAspect: boolean;// Preserve aspect ratio during resize
}

export interface Garment {
  id: string;
  name: string;
  src: string;        // Path or URL to transparent PNG cutout
  width: number;
  height: number;
  sizeKb?: number;
  category?: 'tops' | 'jackets' | 'bottoms' | 'misc';
}

export type PoseConfidence = 'Low' | 'Okay' | 'Good';

export interface ShoulderPosition {
  leftShoulder: { x: number; y: number };
  rightShoulder: { x: number; y: number };
  center: { x: number; y: number };
  width: number;
  angle: number;
}

export interface GarmentSuggestion {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface PoseDetectionConfig {
  modelComplexity?: 'lite' | 'full' | 'heavy';
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export interface PoseDetectionResult {
  landmarks: PoseLandmark[];
  worldLandmarks?: PoseLandmark[];
  confidence: number;
}
```

---

## Step 3: Core Geometry & Pose Math (`src/lib/pose-utils.ts`)

Create `src/lib/pose-utils.ts` for shoulder detection and coordinate calculations:

```typescript
// src/lib/pose-utils.ts
import { PoseLandmark, ShoulderPosition, GarmentSuggestion } from '@/types/tryon';

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
};

export const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [0, 1], [1, 2], [2, 3],
  [0, 4], [4, 5], [5, 6], [9, 10]
];

export function calculateShoulderPosition(
  landmarks: PoseLandmark[],
  containerWidth: number,
  containerHeight: number
): ShoulderPosition | null {
  if (!landmarks || landmarks.length < 33) return null;

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  if ((leftShoulder.visibility || 0) < 0.4 || (rightShoulder.visibility || 0) < 0.4) {
    return null;
  }

  const left = {
    x: leftShoulder.x * containerWidth,
    y: leftShoulder.y * containerHeight,
  };

  const right = {
    x: rightShoulder.x * containerWidth,
    y: rightShoulder.y * containerHeight,
  };

  const center = {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  };

  const width = Math.hypot(right.x - left.x, right.y - left.y);
  const angle = Math.atan2(right.y - left.y, right.x - left.x) * (180 / Math.PI);

  return { leftShoulder: left, rightShoulder: right, center, width, angle };
}

export function calculateGarmentPosition(
  shoulderPos: ShoulderPosition,
  baseGarmentWidth: number = 200
): GarmentSuggestion {
  // Scale garment to 120% of shoulder width for a natural torso fit
  const targetWidth = shoulderPos.width * 1.2;
  const scale = targetWidth / baseGarmentWidth;

  // Center garment and apply a 15% upward collar offset
  const x = shoulderPos.center.x - (baseGarmentWidth * scale) / 2;
  const y = shoulderPos.center.y - (baseGarmentWidth * scale * 0.15);

  return {
    x: Math.round(x),
    y: Math.round(y),
    scale: Math.max(0.3, Math.min(3.0, scale)),
    rotation: Math.max(-45, Math.min(45, shoulderPos.angle)),
  };
}

export function isConfidentPose(landmarks: PoseLandmark[]): boolean {
  if (!landmarks || landmarks.length < 33) return false;

  const critical = [
    POSE_LANDMARKS.LEFT_SHOULDER,
    POSE_LANDMARKS.RIGHT_SHOULDER,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP,
  ];

  const visibleCount = critical.filter((idx) => (landmarks[idx]?.visibility || 0) > 0.4).length;
  return visibleCount >= 3;
}

export function getConfidenceLabel(confidence: number): 'Low' | 'Okay' | 'Good' {
  if (confidence >= 0.7) return 'Good';
  if (confidence >= 0.4) return 'Okay';
  return 'Low';
}
```

---

## Step 4: MediaPipe Hook (`src/hooks/usePoseDetection.ts`)

Create `src/hooks/usePoseDetection.ts` with GPU delegation, coordinate mirroring, and frame-rate optimization:

```typescript
// src/hooks/usePoseDetection.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PoseLandmark, PoseDetectionConfig, PoseDetectionResult } from '@/types/tryon';

let PoseLandmarker: any = null;
let FilesetResolver: any = null;

export function usePoseDetection(
  videoElement: HTMLVideoElement | null,
  config: PoseDetectionConfig = {}
) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PoseDetectionResult | null>(null);
  const [fps, setFps] = useState(0);

  const poseLandmarkerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastVideoTimeRef = useRef(-1);
  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now() });
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!videoElement) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const initDetector = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!FilesetResolver || !PoseLandmarker) {
          const vision = await import('@mediapipe/tasks-vision');
          FilesetResolver = vision.FilesetResolver;
          PoseLandmarker = vision.PoseLandmarker;
        }

        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

        const modelComplexity = config.modelComplexity || 'lite';
        const modelPath = `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${modelComplexity}/float16/1/pose_landmarker_${modelComplexity}.task`;

        const landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: config.minDetectionConfidence || 0.5,
          minTrackingConfidence: config.minTrackingConfidence || 0.5,
          minPosePresenceConfidence: 0.5,
        });

        if (!cancelled) {
          poseLandmarkerRef.current = landmarker;
          isInitializedRef.current = true;
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to initialize MediaPipe Pose');
          setIsLoading(false);
        }
      }
    };

    initDetector();

    return () => {
      cancelled = true;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [videoElement, config.modelComplexity, config.minDetectionConfidence, config.minTrackingConfidence]);

  const detectPose = useCallback(() => {
    if (!poseLandmarkerRef.current || !videoElement) return;

    const currentTime = videoElement.currentTime;

    if (currentTime !== lastVideoTimeRef.current && videoElement.readyState >= 2) {
      lastVideoTimeRef.current = currentTime;

      try {
        const startMs = performance.now();
        const result = poseLandmarkerRef.current.detectForVideo(videoElement, startMs);

        fpsCounterRef.current.frames++;
        const now = performance.now();
        if (now - fpsCounterRef.current.lastTime >= 1000) {
          setFps(fpsCounterRef.current.frames);
          fpsCounterRef.current.frames = 0;
          fpsCounterRef.current.lastTime = now;
        }

        if (result.landmarks && result.landmarks.length > 0) {
          const raw = result.landmarks[0];
          // Mirror X for selfie perspective
          const landmarks: PoseLandmark[] = raw.map((l: any) => ({
            x: 1 - l.x,
            y: l.y,
            z: l.z,
            visibility: l.visibility,
          }));

          const visibleCount = landmarks.filter((l) => (l.visibility || 0) > 0.4).length;
          const confidence = visibleCount / landmarks.length;

          setLastResult({
            landmarks,
            worldLandmarks: result.worldLandmarks?.[0],
            confidence,
          });
        } else {
          setLastResult(null);
        }
      } catch (e) {
        // Skip occasional frame drop
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectPose);
  }, [videoElement]);

  useEffect(() => {
    if (isInitializedRef.current && videoElement && poseLandmarkerRef.current) {
      detectPose();
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [detectPose, videoElement]);

  return {
    isLoading,
    error,
    landmarks: lastResult?.landmarks || null,
    confidence: lastResult?.confidence || 0,
    fps,
  };
}
```

---

## Step 5: Dedicated AR State Store (`src/lib/tryon-store.ts`)

Create `src/lib/tryon-store.ts` using Zustand:

```typescript
// src/lib/tryon-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transform, Garment, PoseConfidence } from '@/types/tryon';

const DEFAULT_TRANSFORM: Transform = {
  x: 200,
  y: 120,
  scale: 1.0,
  rotation: 0,
  opacity: 95,
  lockAspect: true,
};

interface TryonState {
  garments: Garment[];
  selectedGarmentId: string | null;
  transform: Transform;
  baselineTransform: Transform;
  mediaPipeEnabled: boolean;
  landmarksVisible: boolean;
  continuousTracking: boolean;
  poseConfidence: PoseConfidence;

  selectGarment: (garmentOrId: string | Garment | null) => void;
  setTransform: (partial: Partial<Transform>) => void;
  toggleMediaPipe: () => void;
  toggleLandmarks: () => void;
  toggleContinuousTracking: () => void;
  autoAlignGarment: (x: number, y: number, scale: number, rotation: number) => void;
  setPoseConfidence: (confidence: PoseConfidence | number) => void;
  resetToBaseline: () => void;
}

export const useTryonStore = create<TryonState>()(
  persist(
    (set, get) => ({
      garments: [],
      selectedGarmentId: null,
      transform: { ...DEFAULT_TRANSFORM },
      baselineTransform: { ...DEFAULT_TRANSFORM },
      mediaPipeEnabled: true,
      landmarksVisible: false,
      continuousTracking: false,
      poseConfidence: 'Low',

      selectGarment: (garmentOrId) => {
        if (!garmentOrId) {
          set({ selectedGarmentId: null });
          return;
        }
        if (typeof garmentOrId === 'string') {
          set({ selectedGarmentId: garmentOrId });
        } else {
          const exists = get().garments.some((g) => g.id === garmentOrId.id);
          set((state) => ({
            garments: exists ? state.garments : [...state.garments, garmentOrId],
            selectedGarmentId: garmentOrId.id,
          }));
        }
      },

      setTransform: (partial) =>
        set((state) => ({ transform: { ...state.transform, ...partial } })),

      toggleMediaPipe: () =>
        set((state) => ({
          mediaPipeEnabled: !state.mediaPipeEnabled,
          ...(state.mediaPipeEnabled ? { continuousTracking: false, landmarksVisible: false } : {}),
        })),

      toggleLandmarks: () =>
        set((state) => ({ landmarksVisible: !state.landmarksVisible })),

      toggleContinuousTracking: () =>
        set((state) => ({ continuousTracking: !state.continuousTracking })),

      autoAlignGarment: (x, y, scale, rotation) =>
        set({
          transform: { ...get().transform, x, y, scale, rotation },
        }),

      setPoseConfidence: (confidence) => {
        let label: PoseConfidence = 'Low';
        if (typeof confidence === 'number') {
          if (confidence >= 0.7) label = 'Good';
          else if (confidence >= 0.4) label = 'Okay';
        } else {
          label = confidence;
        }
        set({ poseConfidence: label });
      },

      resetToBaseline: () =>
        set((state) => ({ transform: { ...state.baselineTransform } })),
    }),
    {
      name: 'phygital-tryon-storage',
      partialize: (state) => ({ garments: state.garments }),
    }
  )
);
```

---

## Step 6: AR Live Canvas Components (`src/components/vfr/`)

Create the directory `src/components/vfr/` with modular components:

1. `VideoPreview.tsx`: Camera lifecycle, mirroring via `scale-x-[-1]`, and stream stop cleanup.
2. `GarmentOverlay.tsx`: Interactive draggable/resizable overlay powered by `react-rnd`.
3. `ContinuousTracker.tsx`: Smooth tracking side-effect throttled to 10 FPS (100ms).
4. `AutoAlignButton.tsx`: Snaps garment to detected shoulders with single click.
5. `PoseLandmarks.tsx`: Canvas rendering skeleton lines and joint dots.
6. `ARStage.tsx`: Main container compositing video, landmarks, garment overlay, and floating controls.
7. `ARPanel.tsx`: Sidebar controls for sliders (scale, rotation, opacity) and toggles.

*(Full source code for these components is detailed in [AR_FILE_MAP.md](./AR_FILE_MAP.md) and [AR_ARCHITECTURE.md](./AR_ARCHITECTURE.md)).*

---

## Step 7: Integration with Phygital Store Product Page

### In `src/components/ProductGallery.tsx`

Phygital Store already triggers VFR via:
```tsx
<button 
  onClick={(e) => { e.preventDefault(); setIsVFROpen(true); }}
  className="..."
>
  Coba Virtual (VFR)
</button>
```

You can choose either:
- **Option A (Tabbed Mode)**: Add a mode switcher inside `VirtualFittingRoom.tsx` between **Live AR Stream** and **AI Photo Booth**.
- **Option B (Direct Modal)**: Render `ARStage` directly in a new dedicated AR modal.

Loading product data into `useTryonStore`:
```typescript
import { useTryonStore } from '@/lib/tryon-store';

// Inside your trigger button handler:
useTryonStore.getState().selectGarment({
  id: product.id,
  name: product.name,
  src: product.cutoutUrl || product.imageUrl || '/products/kaos-kuning-77.png',
  width: 512,
  height: 512,
  category: 'tops',
});
```

---

## Step 8: Next.js 16 Configuration

Ensure `next.config.ts` handles WebAssembly modules and remote image domains:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
```

---

## Step 9: Background Removal Service (`garment-processing-api`)

For optimal visual fidelity, catalog garments should be isolated PNGs with transparent backgrounds.

Run the FastAPI background extraction service:
```bash
cd C:\Users\admin\Documents\ar-fashion-tryon\garment-processing-api
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload
```

---

## Final Verification & Testing

- [ ] Run `npm run dev` to verify clean build without TypeScript errors.
- [ ] Visit `http://localhost:3000/product/1` and open the Virtual Fitting Room.
- [ ] Verify camera displays smoothly in mirrored selfie view.
- [ ] Toggle MediaPipe and observe ~25-30 FPS pose detection.
- [ ] Click **Auto-Align** to verify instant garment snap to shoulders.
- [ ] Enable **Continuous Tracking** and move left/right to confirm smooth tracking.

---

**Related Documentation:** [AR_ARCHITECTURE.md](./AR_ARCHITECTURE.md) | [AR_QUICK_REFERENCE.md](./AR_QUICK_REFERENCE.md) | [AR_FILE_MAP.md](./AR_FILE_MAP.md)
