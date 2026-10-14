# AR Testing & QA Checklist — Phygital Store

**Version:** 2.1 (Audited & Aligned) | **Last Updated:** 2026-10-13

Comprehensive Quality Assurance checklist to test both the **Live Real-Time AR Stream** and the **AI Photo Booth VFR** in Phygital Store.

---

## 1. Environment & Setup Verification

- [ ] Node dependencies installed: `@mediapipe/tasks-vision`, `react-rnd`, `zustand`
- [ ] `npm run dev` builds cleanly on Next.js 16.3 and React 19.2
- [ ] Tested on Chrome / Edge with active webcam hardware
- [ ] Tested on `http://localhost:3000` or HTTPS production domain (WebRTC requirement)

---

## 2. Live Web-AR Camera & Stream

### 2.1 Permissions & Mirroring
- [ ] Opening the AR modal prompts for browser webcam access.
- [ ] Granting permission displays the live video stream immediately.
- [ ] Video feed is horizontally mirrored (`scale-x-[-1]`) to simulate a natural mirror view.
- [ ] Denying permission displays a user-friendly error message with a "Retry" button.

### 2.2 Stream Teardown & Resource Cleanup
- [ ] Closing the modal immediately stops all webcam tracks.
- [ ] The hardware camera indicator light turns off.
- [ ] No residual background frame loops or animation frames continue running.

---

## 3. MediaPipe Pose Estimation

### 3.1 Model Initialization
- [ ] Enabling "Pose Detection" downloads the ~3MB `pose_landmarker_lite` model from Google Storage via CDN.
- [ ] Model initialization completes within 2-4 seconds.
- [ ] Active FPS counter shows 20-30 FPS on desktop (15-20 FPS on mobile).

### 3.2 Skeleton Joints (`PoseLandmarks`)
- [ ] Toggling "Show Skeleton" renders 33 colored joint dots over the user's body.
- [ ] Shoulders (Landmarks 11 and 12) are highlighted in green (8px radius).
- [ ] Cyan connector lines map the torso and arms accurately.
- [ ] Joint positions mirror correctly with physical movement.

---

## 4. Garment Positioning & Interaction

### 4.1 One-Shot Auto-Align
- [ ] Facing the camera with both shoulders visible turns the confidence badge green ("Good").
- [ ] Clicking "Auto-Align" triggers a brief 300ms spinner.
- [ ] The garment centers directly between the user's shoulders.
- [ ] Garment scale resizes to 120% of detected shoulder width.
- [ ] Garment tilts to match shoulder rotation angle.
- [ ] Button turns green ("Aligned!") for 2 seconds with a confirmation toast.

### 4.2 Continuous Tracking
- [ ] Enabling "Continuous Tracking" engages the 10 FPS throttled follower loop.
- [ ] Walking left or right causes the garment to track user movement smoothly.
- [ ] Stepping toward or away from the camera scales the garment up or down.
- [ ] Turning around freezes the garment at its last confident position without glitching.
- [ ] Turning back resumes tracking immediately.

### 4.3 Manual Drag & Resize (`react-rnd`)
- [ ] Mouse drag moves the garment anywhere within video bounds.
- [ ] Dragging corner handles scales the garment while preserving aspect ratio.
- [ ] Keyboard arrows nudge garment position by 1px (or 10px with `Shift`).
- [ ] `+` and `-` keys scale the garment by 5%.

---

## 5. Control Panel Sliders

- [ ] **Scale Slider** adjusts garment between 0.3x and 3.0x.
- [ ] **Rotation Slider** tilts garment between -45° and +45°.
- [ ] **Opacity Slider** modifies transparency between 10% and 100%.
- [ ] **Reset Button** restores initial coordinates and scale.

---

## 6. Dual-Mode Integration Verification

- [ ] Navigating to `/product/1` displays the product page properly.
- [ ] Clicking "Coba Virtual (VFR)" opens the fitting room modal.
- [ ] Switching between Live AR Mode and AI Photo Booth Mode preserves application stability.
- [ ] Closing the modal and clicking "Add to Cart" retains normal e-commerce cart functionality.

---

## Quality Assurance Summary

| Feature Area | Result (PASS / FAIL) | Tester Notes |
|:-------------|:--------------------:|:-------------|
| WebRTC Camera Stream & Cleanup | [ ] | |
| MediaPipe 33-Point Pose Detection | [ ] | |
| One-Shot Shoulder Auto-Align | [ ] | |
| Continuous Tracking (10 FPS) | [ ] | |
| Manual Drag / Resize (react-rnd) | [ ] | |
| Product Gallery Modal Integration | [ ] | |

---

**Related Documentation:** [AR_IMPLEMENTATION_GUIDE.md](./AR_IMPLEMENTATION_GUIDE.md) | [AR_PRODUCT_INTEGRATION.md](./AR_PRODUCT_INTEGRATION.md)
