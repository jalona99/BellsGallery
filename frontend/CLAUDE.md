# CLAUDE.md — BellsGallery Frontend Guidance

This file provides architecture guidance and command conventions for developers and AI assistants working in `BellsGallery/frontend`.

---

## 1. Project Overview

**BellsGallery** is an innovative e-commerce platform inspired by clean, minimalist aesthetic that bridges physical and online shopping through a **Web-VFR (Virtual Fitting Room)**.

- **Frontend:** Next.js 16.3.0 (App Router), React 19.2.8, Tailwind CSS v4, TypeScript 5.
- **3D & AR Graphics:** Three.js (`^0.185.1`), React Three Fiber (`@react-three/fiber ^9.7.0`), `@react-three/drei (^10.7.8)`.
- **Pose Detection & AI:** On-device MediaPipe Pose & TensorFlow.js BlazePose via Web Worker (`public/pose-worker.js`).
- **Backend API:** Express.js + Prisma ORM (PostgreSQL) running on `http://127.0.0.1:3001`.
- **Payments:** Midtrans Snap & Webhooks.

---

## 2. Development Commands

This project uses **npm** (do not use pnpm or yarn unless explicitly requested).

```bash
# Development server (Turbopack)
npm run dev

# Production build
npm run build

# Production server
npm run start

# Linting
npm run lint
```

- **Frontend Dev URL:** `http://localhost:3000`
- **Backend Dev URL:** `http://localhost:3001/api`

---

## 3. Architecture & Directory Structure

```
src/
├── app/
│   ├── page.tsx                      # Catalog home page (video hero, categories, products)
│   ├── layout.tsx                    # Root layout with Auth & Cart providers
│   ├── product/[id]/page.tsx         # Product detail page (fetches from port 3001)
│   ├── orders/page.tsx               # Order history & transaction statuses
│   ├── profile/                      # User profile, address, wishlist, settings
│   └── admin/page.tsx                # Admin management dashboard
│
├── components/
│   ├── Header.tsx                    # Navigation bar with search and cart indicator
│   ├── Footer.tsx                    # Minimalist footer
│   ├── ProductCard.tsx               # Product card in catalog grid
│   ├── ProductGallery.tsx            # Multi-angle photo gallery & "Coba Virtual" trigger
│   ├── VirtualFittingRoom.tsx        # Comprehensive VFR (3D mesh, Photo Booth, SizeAdvisor)
│   ├── Garment3D.tsx                 # Three.js 3D Garment Mesh (@react-three/fiber)
│   ├── BodyOccluder.tsx              # Depth-aware 3D body occluder
│   ├── OcclusionMask.tsx             # Silhouette masking component
│   │
│   └── vfr/                          # [LIVE AR] 2D MediaPipe live video stream layer
│       ├── ARStage.tsx               # Main live AR canvas orchestrator
│       ├── VideoPreview.tsx          # Mirrored camera stream
│       ├── GarmentOverlay.tsx        # Draggable & resizable cutout (react-rnd)
│       ├── ContinuousTracker.tsx     # 10 FPS hands-free shoulder follower
│       ├── AutoAlignButton.tsx       # One-click shoulder snapping button
│       ├── PoseLandmarks.tsx         # 33-point skeleton debug canvas
│       └── ARPanel.tsx               # Control sliders & toggle switches
│
├── context/
│   ├── CartContext.tsx               # Shopping cart state (synchronized with localStorage)
│   └── AuthContext.tsx               # User authentication session state (JWT Cookies)
│
├── hooks/
│   └── usePoseDetection.ts           # MediaPipe Tasks-Vision GPU hook for live video
│
├── lib/
│   ├── OneEuroFilter.ts              # Anti-jitter filter for smooth tracking
│   ├── SizeAdvisor.ts                # Smart sizing engine (shoulder/chest cm -> S/M/L/XL)
│   ├── ProceduralGarment.ts          # 3D procedural cloth geometry
│   ├── TextureSwapper.ts             # Dynamic texture swapping with VRAM cleanup
│   ├── SkinnedGarmentBuilder.ts      # Rigged 3D cloth model builder
│   ├── api.ts                        # Axios/Fetch API client for backend
│   ├── pose-utils.ts                 # 2D Euclidean geometry & shoulder placement math
│   └── tryon-store.ts                # Isolated Zustand store for high-frequency AR transforms
│
└── types/
    └── tryon.ts                      # Type definitions for AR try-on
```

---

## 4. Virtual Fitting Room (VFR) Dual-Mode System

Phygital Store features two complementary fitting room experiences:

1. **Mode 1: Live Real-Time Web-AR (MediaPipe 2D Stream)**:
   - High frame rate (20-30 FPS) continuous stream.
   - Snaps transparent garment cutouts to user shoulders in real-time.
   - Interactive repositioning, scaling, and rotation via `react-rnd`.
   - 33-point skeleton joint visualization for posture feedback.

2. **Mode 2: AI Photo Booth & 3D WebGL (BlazePose + R3F)**:
   - Guided posture silhouette with auto-countdown shutter (3s).
   - Smart Size Advisor calculating real-world body dimensions in centimeters.
   - PBR 3D cloth simulation with studio three-point lighting and Fresnel Fuzz shader.
   - Synthetic 2D composite photo generation.

---

## 5. Coding & Performance Conventions

1. **Memory Management in 3D/Canvas**:
   - Always call `dispose()` on geometries, materials, and textures when unmounting to prevent VRAM memory leaks on mobile GPUs.
2. **On-Device AI & Privacy**:
   - User camera video frames **must never** be sent to remote servers. All computer vision (MediaPipe / BlazePose) runs strictly client-side on-device.
3. **High-Frequency Transforms**:
   - Do not store 30 FPS video transform coordinates in React Context. Use `useRef` or the isolated Zustand store (`useTryonStore`) to avoid re-rendering unrelated UI trees.
