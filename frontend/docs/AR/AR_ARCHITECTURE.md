# AR System Architecture — Phygital Store

**Version:** 2.1 (Audited & Aligned) | **Last Updated:** 2026-10-13 | **Status:** Active Production Blueprint

---

## 1. High-Level Architecture Overview

Phygital Store employs a **Dual-Mode Virtual Fitting Architecture**:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                      Phygital Store — Virtual Fitting Room Suite                  │
│                                                                                   │
│  ┌────────────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │   Mode 1: Live Real-Time Web-AR        │  │  Mode 2: AI Photo Booth & 3D    │  │
│  │   (Stream Overlay via MediaPipe)       │  │  (BlazePose + WebGL Mesh + VTON)│  │
│  ├────────────────────────────────────────┤  ├─────────────────────────────────┤  │
│  │ • 33-point Pose Detection (20-30 FPS)  │  │ • Posture Guide & Auto Shutter  │  │
│  │ • Shoulder Auto-Align (Snap to body)   │  │ • Synthetic 2D Composite Try-On │  │
│  │ • Continuous Tracking (10 FPS throttle)│  │ • Smart Size Advisor (Chest cm) │  │
│  │ • Interactive Drag/Resize (react-rnd)  │  │ • 3D Canvas (@react-three/fiber)│  │
│  └───────────────────┬────────────────────┘  └────────────────┬────────────────┘  │
│                      │                                        │                   │
│                      ▼                                        ▼                   │
│           ┌────────────────────────────────────────────────────────┐              │
│           │            E-Commerce Core (Phygital Store)            │              │
│           │  • Product Catalog (`src/app/product/[id]/page.tsx`)   │              │
│           │  • Product Gallery (`src/components/ProductGallery.tsx`)│             │
│           │  • Express Backend API (Port 3001)                     │              │
│           │  • Cart & Auth Contexts (`src/context/`)               │              │
│           └────────────────────────────────────────────────────────┘              │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 5-Layer Modular Architecture for Live AR

The Live Web-AR module is structured into 5 isolated layers to maximize responsiveness and minimize CPU/GPU load:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Live AR Architecture Layers                       │
├─────────────────────────────────────────────────────────────────────────┤
│ [Layer 1] Camera & Stream     : VideoPreview (WebRTC getUserMedia)      │
│ [Layer 2] Pose Landmarker     : usePoseDetection (@mediapipe GPU WASM) │
│ [Layer 3] Positioning Math    : pose-utils.ts (Shoulder & Torso Math)   │
│ [Layer 4] State Management    : tryon-store.ts (Isolated Zustand Store) │
│ [Layer 5] Canvas & Overlay    : ARStage, GarmentOverlay (react-rnd)     │
└─────────────────────────────────────────────────────────────────────────┘
```

| Layer | Path in Phygital Store | Technology | Responsibility |
|:------|:-----------------------|:-----------|:---------------|
| 1 | `src/components/vfr/VideoPreview.tsx` | getUserMedia API | Camera lifecycle, permission prompts, selfie mirroring (`scale-x-[-1]`) |
| 2 | `src/hooks/usePoseDetection.ts` | @mediapipe/tasks-vision | Real-time 33-point body landmark estimation at 20-30 FPS |
| 3 | `src/lib/pose-utils.ts` | Pure TypeScript | Shoulder vector math, scale calculations, and tilt rotation clamp |
| 4 | `src/lib/tryon-store.ts` | Zustand | High-frequency transform state (`x, y, scale, rotation`) isolated from React Context |
| 5 | `src/components/vfr/*.tsx` | React 19 + react-rnd | Overlay rendering, draggable visual handles, and toggle controls |

---

## 3. Component Hierarchy

```
ProductPage (src/app/product/[id]/page.tsx)
└── ProductGallery (src/components/ProductGallery.tsx)
    └── VirtualFittingRoom Modal (src/components/VirtualFittingRoom.tsx)
        │
        ├── [Existing] Photo Booth & 3D VFR Engine
        │   ├── Posture Alignment Indicator (evaluatePosture)
        │   ├── 3-Second Auto-Countdown Shutter
        │   ├── BlazePose Worker (public/pose-worker.js)
        │   ├── Smart Size Advisor (recommendSize in SizeAdvisor.ts)
        │   └── 3D Model Renderer (@react-three/fiber, Garment3D.tsx)
        │
        └── [Live AR Engine] Live AR Canvas (src/components/vfr/ARStage.tsx)
            ├── VideoPreview (Layer 0: background video)
            │   └── Mirrored camera stream
            │
            ├── PoseLandmarks (Layer 2: z-20, debug canvas)
            │   ├── 33 color-coded joint dots
            │   └── Cyan skeleton connector lines
            │
            ├── GarmentOverlay (Layer 1: z-10, react-rnd)
            │   ├── Interactive drag/resize box
            │   ├── Transparent garment PNG
            │   └── Keyboard nudge listeners (Arrows, +/-)
            │
            ├── ContinuousTracker (no UI, side-effect only)
            │   └── 10 FPS throttled body-following loop
            │
            ├── AutoAlignButton (floating, z-30)
            │   └── One-shot shoulder snapping trigger
            │
            └── ARPanel (sidebar controls)
                ├── Scale, Rotation, Opacity sliders
                └── Feature toggle switches
```

---

## 4. Live AR Data Flow

### 4.1 MediaPipe Continuous Detection Loop

```
Live Webcam Video (30 FPS)
         │
         ▼
requestAnimationFrame()
         │
         ▼
poseLandmarker.detectForVideo(video, timestamp)
         │
         ▼
Mirror X Coordinate (Selfie View: x' = 1 - x)
         │
         ▼
Calculate Confidence (Visible Landmarks / Total)
         │
         ├───────────────────────────────┬───────────────────────────────┐
         ▼                               ▼                               ▼
PoseLandmarks (Canvas)        ContinuousTracker (10 FPS)       Status Displays (UI)
Draws joint dots & lines     Computes shoulder midpoint &      Updates FPS & Confidence
                             updates Zustand transform store   Badge indicators
```

### 4.2 Positioning Algorithm Formula

Given detected landmarks for left shoulder ($L$) and right shoulder ($R$):

1. **Center Midpoint**:
   $$\text{center}_x = \frac{L_x + R_x}{2}, \quad \text{center}_y = \frac{L_y + R_y}{2}$$

2. **Shoulder Distance & Tilt Angle**:
   $$W_{\text{shoulder}} = \sqrt{(R_x - L_x)^2 + (R_y - L_y)^2}$$
   $$\theta = \text{atan2}(R_y - L_y, R_x - L_x) \times \frac{180}{\pi}$$

3. **Garment Dimensions & Placement**:
   $$\text{targetWidth} = W_{\text{shoulder}} \times 1.2$$
   $$\text{scale} = \frac{\text{targetWidth}}{\text{baseWidth}}$$
   $$X = \text{center}_x - \frac{\text{scaledWidth}}{2}$$
   $$Y = \text{center}_y - (\text{scaledWidth} \times 0.15)$$
   $$\text{Rotation} = \text{clamp}(\theta, -45^\circ, 45^\circ)$$

---

## 5. Z-Index Layer Stacking Strategy

```
Top (z-50)
  ├── Modal Dialog Window (`VirtualFittingRoom`)
  │
  ├── (z-30) Floating Actions & Indicators
  │          ├── AutoAlignButton
  │          ├── FPS & Confidence Badges
  │          └── Sidebar Controls (`ARPanel`)
  │
  ├── (z-20) Skeleton Visualization Canvas (`PoseLandmarks`)
  │          └── 33 joint dots + connecting lines (`mixBlendMode: 'screen'`)
  │
  ├── (z-10) Interactive Garment Layer (`GarmentOverlay`)
  │          ├── Transparent Garment Cutout
  │          ├── Active Selection Border
  │          └── 4 Corner Resize Handles (`react-rnd`)
  │
  └── (z-0)  Webcam Feed (`VideoPreview`)
             └── `<video>` element with `scale-x-[-1]`
Bottom
```

---

## 6. Performance Benchmarks

| Metric | Target | Notes |
|:-------|:-------|:------|
| MediaPipe Frame Rate | 20-30 FPS | GPU delegate via WebGL |
| Continuous Tracking Rate | 10 FPS | Throttled to prevent CPU overheating |
| Model Memory Footprint | ~3 MB | Lite Float16 variant |
| Detection Latency | 30-50 ms | Per-frame GPU inference |
| Garment Overlay CPU Usage | < 5% | Hardware-accelerated CSS transforms |

---

**Related Documentation:** [AR_IMPLEMENTATION_GUIDE.md](./AR_IMPLEMENTATION_GUIDE.md) | [AR_QUICK_REFERENCE.md](./AR_QUICK_REFERENCE.md) | [AR_FILE_MAP.md](./AR_FILE_MAP.md)
