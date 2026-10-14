# Project Roadmap: BellsGallery

This roadmap tracks the development milestones and feature releases of the BellsGallery omnichannel platform. Completed milestones are marked with `[x]`, while future targets are marked with `[ ]`.

---

## Phase 1: Foundation & Infrastructure `[x]`
- `[x]` Modern Monorepo initialization (Next.js 16.3 Frontend & Express 5.2 TypeScript Backend).
- `[x]` PostgreSQL database modeling & Prisma schema design (`User`, `Product`, `Transaction`, `TransactionItem`, `Inventory`, `Address`, `Wishlist`, `Membership`, `OrderTracking`, `NewsletterSubscriber`).
- `[x]` Secure authentication system based on JWT stored in HttpOnly cookies with CSRF defense.
- `[x]` Core REST API scaffolding (Products, Categories, Authentication, Profiles).

## Phase 2: E-Commerce Engine & Omnichannel Payments `[x]`
- `[x]` Responsive product catalog UI with dynamic category and subcategory filtering.
- `[x]` Global client-side cart state management via React Context (`CartContext`).
- `[x]` Online checkout integrated with Midtrans Snap API.
- `[x]` Cryptographically verified Midtrans Webhook handler (SHA-512 Signature & anti-spoofing).
- `[x]` **Idempotency Protection**: Replay-attack prevention on duplicate payment webhook notifications.
- `[x]` **Automated Inventory Rollback**: Atomic stock restoration upon transaction cancellation or expiration (`cancel`/`expire`/`deny`).
- `[x]` **Chaos Defense & Concurrency Control**:
  - Redis Atomic Mutex Lock (`lock:checkout:${userId}`) preventing rapid double-click race conditions.
  - PostgreSQL Pessimistic Locking (`SELECT stock FROM "Inventory" WHERE "productId" = $1 FOR UPDATE`) preventing negative inventory during flash sales.
- `[x]` **Anti-Price Tampering**: Absolute price verification against official database records, ignoring client-side payload values.
- `[x]` **In-Store POS Cash Processing**: Dedicated cashier endpoint (`POST /api/transactions/cash`) for walk-in retail purchases with instant stock deduction and `PAID` state.
- `[x]` **Guest Checkout Engine**: Frictionless purchase flow without mandatory login/registration, creating shadow users with cryptographic keys and capturing static recipient contact snapshots.
- `[x]` **Regional Flat Shipping & Courier Partnering**: Courier calculation with zoned flat tariffs (Bojonegoro Store Pickup Free, Jatim Flat Rp 10.000 / Free >= 200k, Jawa Non-Jatim Rp 18.000, Luar Jawa Rp 35.000) and partner integrations (J&T Express, JNE Express, SiCepat).
- `[x]` **Physical Garment Variants (Size & Color)**: Complete persistence of size (S/M/L/XL) and color attributes on line items, cart drawer, and Midtrans Snap parameter disambiguation.
- `[x]` **Database Performance Optimization**: Composite B-tree indexes across `Transaction`, `TransactionItem`, `Product`, `Address`, and `OrderTracking`.

## Phase 3: Web-VFR (Virtual Fitting Room) Core `[x]`
- `[x]` Real-time skeletal landmark tracking via `@mediapipe/tasks-vision` (BlazePose 33 points) in an isolated Web Worker (`public/pose-worker.js`).
- `[x]` High-performance WebGL 3D Canvas built with React Three Fiber (`@react-three/fiber`) and Three.js `0.185`.
- `[x]` 2D-to-3D projection algorithms (Euler Rotation Roll/Pitch/Yaw, CAD shoulder scaling, and XYZ translation).
- `[x]` Anti-jitter coordinate smoothing using the *One Euro Filter* algorithm.
- `[x]` **Dual-Mode VFR Architecture**:
  - Mode 1: Live Web-AR video feed for webcam-enabled devices.
  - Mode 2: Studio Simulation Mode generating a 30 FPS virtual mannequin loop for devices with blocked or unavailable cameras.
  - Mode 3: Photo Try-On HD integrating Generative AI (CatVTON) for high-definition still try-on.

## Phase 4: Visual Realism, Memory Management & AI Cutout `[x]`
- `[x]` **VRAM GPU Leak Prevention**: Systematic GPU asset deallocation via `TextureSwapper.disposeGroup()`.
- `[x]` **Camera Stream Teardown**: Explicit camera hardware disconnection (`track.stop()`) on component unmount.
- `[x]` **Studio Lighting Setup**: Three-point studio lighting (Key, Fill, Rim) for realistic clothing rendering.
- `[x]` **Custom Fabric Shader**: Fresnel fuzz shader injection for realistic garment textures and microfibers.
- `[x]` **Parallel Initialization**: Non-blocking camera launch while MediaPipe AI models download asynchronously in the background.
- `[x]` **In-Browser AI Auto-Cutout**: Client-side background removal powered by WebAssembly (`@imgly/background-removal`) producing transparent PNGs in 2–3 seconds with zero server GPU cost.
- `[x]` **Customer In-Studio Auto AI Cutout**: Direct garment photo upload from mobile/desktop gallery with on-device background removal.
- `[x]` **Studio Garment Lifecycle & Delete Controls**: Per-item garment deletion (`Trash2`) and bulk history clearing to eliminate UI clutter and unbounded `localStorage` growth.
- `[x]` **Offline Resilience & Heuristic AI**: Fast client-side categorization (`heuristicGarmentType`) completely eliminating legacy external Python/Flask port 5000 dependencies.
- `[x]` **React 19 & Next.js 16 Rules of Hooks Hardening**: Unconditional hook rendering in `RootLayout` / `Header.tsx` during `/try-on` route transitions.

## Phase 5: O2O (Online-to-Offline) Phygital Experience `[ ]`
- `[ ]` **In-Store QR Code Labels**: Garment hangtag QR codes allowing walk-in customers to immediately launch Web-VFR on their own smartphones.
- `[ ]` **PWA & In-Store Kiosk Mode**: Progressive Web App installation for physical fitting room tablet kiosks.
- `[ ]` **Barcode Scanner Integration**: Handheld barcode scanning support for cashier checkout.

## Phase 6: Admin Dashboard, Operations & Governance `[x]`
- `[x]` Secure Role-Based Access Control (RBAC) protecting `/admin` routes.
- `[x]` Product Catalog CRUD with stock editing and category classification.
- `[x]` Integrated Client-Side AI Auto-Cutout in the Product Creation/Edit modal with dual-preview (Original vs Cutout).
- `[x]` Store Performance Analytics (`GET /api/admin/stats`):
  - Total revenue split (Cash POS vs Online Midtrans).
  - Multi-Channel & Segmented matrices (Online vs Offline, Guest vs Member revenue and paid order counts).
  - Paid vs pending vs failed transaction ratios.
  - Low stock warning badges and subcategory inventory unit distribution.
  - Virtual Try-On readiness index (cutout and 3D asset coverage).
- `[x]` Order Management with search, status filters, channel filters, and courier tracking (AWB) updates.
- `[x]` **Order Problem Diagnostic Inspector (`OrderDetailModal`)**:
  - Automated root-cause detection for pending online payments, store pickups, guest orders, and cancellations.
  - Dual-Channel Active Midtrans Reconciliation (`POST /api/transactions/sync/:id`) for sub-second status verification.
  - One-click WhatsApp customer care button with auto-formatted phone numbers and pre-filled transaction templates.
  - Physical garment variant checklist (Size S/M/L/XL & Color) for error-free fulfillment.
- `[x]` **Thermal Receipt Printing**: Instant print generation (`window.print()`) formatted for 80mm/58mm POS thermal printers.
- `[x]` **Data Reporting & Export**: Instant UTF-8 CSV/Excel export for Orders and Catalog items.
- `[x]` **User & Role Governance**:
  - Role promotion (`PUT /api/users/:id/role`) and role revocation back to Customer (`DELETE /api/users/:id/role`).
  - Permanent account deletion with isolated cascade cleanups (`DELETE /api/users/:id`).
  - Active admin self-protection and last-admin safeguards.
- `[x]` **Dual-Transport Resilient SMTP**:
  - Corporate Meta-styled HTML OTP emails via Brevo SMTP relay (`noreply@bellsgallery.web.id`).
  - Automatic sub-second failover to Gmail SMTP upon network partition or IP restrictions.
- `[x]` Newsletter subscriber monitoring and CSV-ready subscriber lists.

## Phase 7: Production Deployment & CI/CD `[ ]`
- `[ ]` Production `docker-compose.yml` orchestration for PostgreSQL, Redis, Backend, and Frontend.
- `[ ]` Automated load testing with k6 (simulating 1,000 req/sec flash sale scenarios).
- `[ ]` Custom production domain setup with automated Let's Encrypt SSL and CDN edge caching.
- `[ ]` GitHub Actions CI/CD pipeline (Lint, Type Check, Container Build, and Zero-Downtime Deploy).
