# AR Quick Reference Guide — Phygital Store

**For Developers** | Last Updated: 2026-10-13

---

## 🚀 Quick Start Commands

```bash
# 1. Navigate to frontend root
cd C:\Users\admin\Documents\phygital-store\frontend

# 2. Dependencies are pre-installed; start development server (Next.js 16)
npm run dev

# 3. Open in browser
# http://localhost:3000 -> Browse products or open /try-on for direct studio
```

---

## 📁 Key File Locations in Phygital Store

| Purpose | File Path |
|:--------|:----------|
| **Product Detail Page** | `src/app/product/[id]/page.tsx` |
| **Product Gallery Trigger** | `src/components/ProductGallery.tsx` |
| **Existing VFR Component** | `src/components/VirtualFittingRoom.tsx` |
| **Live AR Orchestrator** | `src/components/vfr/ARStage.tsx` |
| **Camera View Component** | `src/components/vfr/VideoPreview.tsx` |
| **Interactive Overlay** | `src/components/vfr/GarmentOverlay.tsx` |
| **Auto-Align Trigger** | `src/components/vfr/AutoAlignButton.tsx` |
| **Continuous Tracker** | `src/components/vfr/ContinuousTracker.tsx` |
| **Debug Skeleton Canvas** | `src/components/vfr/PoseLandmarks.tsx` |
| **MediaPipe Vision Hook** | `src/hooks/usePoseDetection.ts` |
| **Pose Math Utilities** | `src/lib/pose-utils.ts` |
| **Isolated AR State Store** | `src/lib/tryon-store.ts` |
| **Type Definitions** | `src/types/tryon.ts` |
| **Smart Size Advisor** | `src/lib/SizeAdvisor.ts` |
| **3D Garment Renderers** | `src/components/Garment3D.tsx`, `src/lib/ProceduralGarment.ts` |

---

## 🔧 Core Configuration Parameters

```typescript
// MediaPipe Detection Configuration (src/hooks/usePoseDetection.ts)
const modelComplexity = 'lite';     // 'lite' (~3MB, 30 FPS) | 'full' (6MB) | 'heavy' (12MB)
const minDetectionConfidence = 0.5; // Detection threshold (0.0 to 1.0)
const minTrackingConfidence = 0.5;  // Landmark tracking threshold

// Continuous Tracking Throttle (src/components/vfr/ContinuousTracker.tsx)
const THROTTLE_MS = 100;            // 10 FPS updates to avoid UI lag and thermal throttle

// Placement Multipliers (src/lib/pose-utils.ts)
const shoulderWidthMultiplier = 1.2;// 120% of shoulder distance for upper body fit
const verticalCollarOffset = 0.15;  // 15% upward offset relative to scaled height
```

---

## 🎯 Positioning Functions

```typescript
import { calculateShoulderPosition, calculateGarmentPosition, isConfidentPose } from '@/lib/pose-utils';

// 1. Calculate shoulder metrics from 33 MediaPipe landmarks
const shoulderPos = calculateShoulderPosition(landmarks, containerWidth, containerHeight);
// Returns: { leftShoulder: {x,y}, rightShoulder: {x,y}, center: {x,y}, width, angle }

// 2. Compute garment position, scale factor, and tilt rotation
const garmentPos = calculateGarmentPosition(shoulderPos, 200);
// Returns: { x: number, y: number, scale: number (0.3-3.0), rotation: number (-45 to 45) }

// 3. Pose confidence check (ensures at least 3 out of 4 critical landmarks are visible)
const isConfident = isConfidentPose(landmarks);
```

---

## 📊 Zustand AR State Access

```typescript
import { useTryonStore } from '@/lib/tryon-store';

// Accessing state
const selectedGarmentId = useTryonStore((state) => state.selectedGarmentId);
const transform = useTryonStore((state) => state.transform);

// Invoking actions
const selectGarment = useTryonStore((state) => state.selectGarment);
const setTransform = useTryonStore((state) => state.setTransform);
const autoAlignGarment = useTryonStore((state) => state.autoAlignGarment);

// Quick programmatical align
autoAlignGarment(garmentPos.x, garmentPos.y, garmentPos.scale, garmentPos.rotation);
```

---

## ⌨️ Interactive Keyboard Shortcuts

| Shortcut | Effect | With `Shift` Held |
|:---------|:-------|:------------------|
| `↑` / `↓` | Nudge garment vertically by 1px | Nudge by 10px |
| `←` / `→` | Nudge garment horizontally by 1px | Nudge by 10px |
| `+` or `=` | Scale up by 5% | — |
| `-` | Scale down by 5% | — |

---

## 🐛 Troubleshooting Quick Reference

| Issue | Root Cause | Solution |
|:------|:-----------|:---------|
| **Black Video Screen** | Camera permission blocked or missing HTTPS context | Allow camera permissions in browser; run on `http://localhost:3000` or via HTTPS. |
| **MediaPipe Fails to Initialize** | Network blocking CDN WASM assets | Verify internet access to `cdn.jsdelivr.net` and `storage.googleapis.com`. |
| **Garment Flips Inverted** | Coordinate mismatch with mirrored webcam | Ensure `usePoseDetection.ts` uses `1 - l.x` for selfie mirroring. |
| **Auto-Align Snaps Off-Center** | Bad lighting causing landmark occlusion | Stand directly in front of the camera with both shoulders clearly visible. |

---

**Related Documentation:** [AR_IMPLEMENTATION_GUIDE.md](./AR_IMPLEMENTATION_GUIDE.md) | [AR_ARCHITECTURE.md](./AR_ARCHITECTURE.md)
