# AR File Map & Dependency Guide — Phygital Store

**Version:** 2.1 (Audited & Aligned) | **Last Updated:** 2026-10-13

This document maps all files in the Phygital Store repository related to virtual try-on, distinguishing existing components from newly added Live AR modules.

---

## Complete File Tree Mapping

```
src/
├── app/
│   └── product/
│       └── [id]/
│           ├── page.tsx              ← (Existing) Product detail page
│           └── AddToCartButton.tsx   ← (Existing) Cart action
├── components/
│   ├── ProductGallery.tsx            ← (Existing) Product image gallery & VFR trigger
│   ├── VirtualFittingRoom.tsx        ← (Existing) 3D + Photo-Booth Virtual Fitting Room
│   ├── Garment3D.tsx                 ← (Existing) WebGL 3D Garment Mesh (@react-three/fiber)
│   ├── BodyOccluder.tsx              ← (Existing) 3D Body depth mask
│   ├── OcclusionMask.tsx             ← (Existing) Depth-aware occlusion renderer
│   │
│   └── vfr/                          ← [NEW] Modular Live Real-Time Web-AR Layer
│       ├── ARStage.tsx               ← Main camera & overlay orchestrator
│       ├── VideoPreview.tsx          ← Mirrored WebRTC webcam feed
│       ├── GarmentOverlay.tsx        ← Interactive draggable/resizable cutout (react-rnd)
│       ├── ContinuousTracker.tsx     ← 10 FPS throttled body follower
│       ├── AutoAlignButton.tsx       ← One-click shoulder snapping button
│       ├── PoseLandmarks.tsx         ← 33-joint skeleton visualizer canvas
│       └── ARPanel.tsx               ← Controls, sliders, and garment picker
│
├── context/
│   ├── CartContext.tsx               ← (Existing) Shopping cart state
│   └── AuthContext.tsx               ← (Existing) User auth state
│
├── hooks/
│   └── usePoseDetection.ts           ← [NEW] MediaPipe Tasks-Vision GPU hook
│
├── lib/
│   ├── OneEuroFilter.ts              ← (Existing) Jitter filter for pose smoothing
│   ├── ProceduralGarment.ts          ← (Existing) Dynamic 3D geometry generator
│   ├── SizeAdvisor.ts                ← (Existing) Chest cm to S/M/L/XL sizing engine
│   ├── SkinnedGarmentBuilder.ts      ← (Existing) Rigged 3D cloth builder
│   ├── TextureSwapper.ts             ← (Existing) Dynamic texture loader
│   ├── api.ts                        ← (Existing) Backend API client
│   ├── pose-utils.ts                 ← [NEW] Geometric alignment & shoulder math
│   └── tryon-store.ts                ← [NEW] Isolated Zustand store for high-FPS transforms
│
└── types/
    └── tryon.ts                      ← [NEW] Type interfaces for AR try-on
```

---

## File Specifications & Roles

### 1. `src/types/tryon.ts` [NEW]
- **Responsibility**: Houses `PoseLandmark`, `Transform`, `Garment`, `ShoulderPosition`, and configuration types.
- **Dependencies**: None.

### 2. `src/lib/pose-utils.ts` [NEW]
- **Responsibility**: Computes shoulder vector distance, center midpoint, tilt angle, and 120% garment scaling.
- **Dependencies**: `@/types/tryon`.

### 3. `src/lib/tryon-store.ts` [NEW]
- **Responsibility**: Isolated Zustand store managing `transform` (`x, y, scale, rotation, opacity`) and active garment selection without triggering global React Context re-renders.
- **Dependencies**: `zustand`, `@/types/tryon`.

### 4. `src/hooks/usePoseDetection.ts` [NEW]
- **Responsibility**: Loads MediaPipe Tasks-Vision (`pose_landmarker_lite`), binds to webcam feed, handles GPU acceleration, coordinate mirroring, and computes real-time FPS.
- **Dependencies**: `@mediapipe/tasks-vision`, `@/types/tryon`.

### 5. `src/components/vfr/` Module [NEW]
- **`ARStage.tsx`**: Orchestrates video feed, skeleton canvas, garment overlay, and floating controls.
- **`VideoPreview.tsx`**: Manages WebRTC camera stream, error handling, and track cleanup.
- **`GarmentOverlay.tsx`**: Draggable and resizable box powered by `react-rnd` with aspect-ratio lock and keyboard nudge shortcuts.
- **`ContinuousTracker.tsx`**: Background side-effect component running at 10 FPS (100ms throttle) to track shoulder movements hands-free.
- **`AutoAlignButton.tsx`**: One-click action button with 300ms feedback spinner and visual green confirmation state.
- **`PoseLandmarks.tsx`**: HTML5 Canvas rendering 33 colored joint dots and skeleton connector lines.
- **`ARPanel.tsx`**: Precision sliders for scale, rotation, opacity, and toggle switches for MediaPipe features.

---

## Incremental Implementation Order

```
Phase 1: Foundation
  1. src/types/tryon.ts
  2. src/lib/pose-utils.ts
  3. src/lib/tryon-store.ts

Phase 2: Vision Hook
  4. src/hooks/usePoseDetection.ts

Phase 3: Visual Components
  5. src/components/vfr/VideoPreview.tsx
  6. src/components/vfr/PoseLandmarks.tsx
  7. src/components/vfr/GarmentOverlay.tsx
  8. src/components/vfr/ContinuousTracker.tsx
  9. src/components/vfr/AutoAlignButton.tsx
  10. src/components/vfr/ARPanel.tsx
  11. src/components/vfr/ARStage.tsx

Phase 4: Integration
  12. Integrate ARStage into src/components/VirtualFittingRoom.tsx or src/components/ProductGallery.tsx
```

---

**Related Documentation:** [AR_IMPLEMENTATION_GUIDE.md](./AR_IMPLEMENTATION_GUIDE.md) | [AR_PRODUCT_INTEGRATION.md](./AR_PRODUCT_INTEGRATION.md)
