# Unified Technical Documentation: BellsGallery

**Document Version:** 2.3 | **Last Updated:** October 14, 2026 | **Status:** Master Technical Reference

This document serves as the central engineering reference for the BellsGallery omnichannel platform, detailing the backend services, relational database schemas, cybersecurity hardening, omnichannel point-of-sale (POS) processing, and the on-device Web-AR Virtual Fitting Room engine.

> 📖 **Companion Technical Documents:**
> - [System Architecture & PRD (System Design, Economics, & Specifications)](file:///C:/Users/admin/Documents/phygital-store/ProjectSpecification.md)
> - [Business Plan: Omnichannel Economics & Profit Retention](file:///C:/Users/admin/Documents/phygital-store/docs/BUSINESS_PLAN_OMNICHANNEL_ECONOMICS.md)
> - [PRD & Architecture: Midtrans QRIS Engine (Ready-to-Use)](file:///C:/Users/admin/Documents/phygital-store/docs/QRIS_MIDTRANS_STANDAR_PRD_AND_ARCHITECTURE.md)
> - [AI Auto-Cutout & Virtual Try-On Pipeline](file:///C:/Users/admin/Documents/phygital-store/docs/AI_AUTO_CUTOUT_AND_GARMENT_WORKFLOW.md)
> - [Admin Operations, Catalog Management & Email Security](file:///C:/Users/admin/Documents/phygital-store/docs/ADMIN_CATALOG_AND_EMAIL_SECURITY.md)
> - [Chaos Engineering & Payment Defense Specification](file:///C:/Users/admin/Documents/phygital-store/docs/CHAOS_AND_SECURITY_PAYMENT_SPEC.md)
> - [Payment Idempotency & Network Resilience Guide](file:///C:/Users/admin/Documents/phygital-store/docs/PAYMENT_IDEMPOTENCY_AND_NETWORK_RESILIENCE.md)

---

## 1. Backend Architecture (Express 5 + Prisma 7 + PostgreSQL + Redis)

The backend runs on **Node.js** with **Express 5.2**, using **Prisma ORM 7.9** to interact with **PostgreSQL 16+**, alongside **Redis 6.2** for distributed mutex locks, idempotency control, and session caching.

### 1.1. Database Schema, Relations & Indexing Strategy (Prisma)

- **User**: Stores authentication credentials, Role-Based Access Control (`ADMIN`, `CUSTOMER`), Bcrypt hashes (10 rounds), 6-digit password reset OTP tokens, and cascade relations to addresses, transactions, and wishlists.
- **Product**: Catalog records including pricing, descriptions, primary images (`imageUrl`), transparent silhouette cutouts for AR fitting (`cutoutUrl`), and optional 3D models (`model3dUrl`). Indexed with `@@index([category, subcategory])`.
- **Inventory**: Stock availability tracker (`stock`, `reservedStock`) protected by PostgreSQL *Pessimistic Locking* (`SELECT ... FOR UPDATE`).
- **Transaction**: Records omnichannel orders with statuses (`PENDING`, `PAID`, `FAILED`), Midtrans Snap tokens, and payment channels (`CASH` for in-store POS, `CASH_ON_PICKUP` for in-store pickup, and `ONLINE` for Midtrans payment gateway). Now includes comprehensive recipient snapshots (`recipientName`, `phoneNumber`, `fullAddress`, `city`, `postalCode`, `courierNote`), shipping configuration (`shippingZone`, `courier`, `courierService`, `shippingCost`, `subtotal`), and guest checkout tracking (`isGuest`, `customerEmail`). Indexed with `@@index([userId])`, `@@index([status])`, and `@@index([createdAt])`.
- **TransactionItem**: Line items for orders, including quantities, price snapshots, product relations, and physical garment variant attributes (`size` e.g. S/M/L/XL, `color`). Indexed with `@@index([transactionId])` and `@@index([productId])`.
- **Address & Wishlist**: Shipping destinations and customer favorite lists indexed on `userId` and `productId`.
- **Membership**: Gamified loyalty tier tracking (`BRONZE`, `SILVER`, `GOLD`) and points accumulator.
- **NewsletterSubscriber**: Promotional email subscriber directory.
- **OrderTracking**: Courier dispatch records, tracking numbers (AWB), and shipment statuses (`MENUNGGU PEMBAYARAN`, `MENUNGGU PENGAMBILAN`, `DIPROSES`, `DIKIRIM`, `SELESAI`) indexed on `status`.

---

### 1.2. Complete REST API Catalog

#### A. Authentication (`/api/auth`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Account registration (validates name, email, strong password) |
| `POST` | `/api/auth/login` | Public | Authenticates credentials and issues 24-hour HttpOnly JWT cookie |
| `POST` | `/api/auth/google` | Public | Google Identity OAuth 2.0 token verification with auto-registration |
| `GET` | `/api/auth/me` | Authenticated | Verifies active JWT session and returns current user details |
| `POST` | `/api/auth/logout` | Authenticated | Clears the HttpOnly authentication cookie |

#### B. User Profile & Password Recovery (`/api/users`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/users/profile` | User | Retrieves profile information for the active user |
| `PUT` | `/api/users/profile` | User | Updates customer name and contact details |
| `PUT` | `/api/users/password` | User | Updates password for authenticated user |
| `POST` | `/api/users/forgot-password` | Public | Dispatches 6-digit OTP via Dual-Transport SMTP |
| `POST` | `/api/users/reset-password` | Public | Validates OTP and updates password |

#### C. User Governance & Role Management (`/api/users`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/users/all` | **ADMIN** | Returns all registered users with spend totals and order counts |
| `PUT` | `/api/users/:id/role` | **ADMIN** | Promotes a user to the `ADMIN` role |
| `DELETE` | `/api/users/:id/role` | **ADMIN** | **Revokes `ADMIN` role**, returning account to `CUSTOMER` status |
| `DELETE` | `/api/users/:id` | **ADMIN** | **Permanently deletes user account** and cleanly cascades related data |

#### D. Product Catalog (`/api/products`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/products` | Public | Fetches catalog with category, subcategory, and keyword filters |
| `GET` | `/api/products/:id` | Public | Fetches complete detail for a single product |
| `GET` | `/api/products/recommendations` | Public | Content-based filtering product recommendations |
| `POST` | `/api/products` | **ADMIN** | Creates a new product (including `cutoutUrl` and stock quantity) |
| `PUT` | `/api/products/:id` | **ADMIN** | Updates product attributes, pricing, cutout, or inventory stock |
| `DELETE` | `/api/products/:id` | **ADMIN** | Deletes a product from the catalog |

#### E. Omnichannel Transactions & Point of Sale (`/api/transactions`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/transactions/shipping-rates` | Public | Regional flat shipping tariffs (Bojonegoro pickup free, Jatim promo, Jawa non-Jatim, Luar Jawa) and partner couriers (J&T, JNE, SiCepat) |
| `POST` | `/api/transactions/checkout` | Public / Guest / User | **Omnichannel Checkout (Member & Guest Checkout)**: Enterprise Idempotency (`Idempotency-Key` + Redis 30m Cache + In-Flight Polling + Pessimistic DB Lock). Supports Midtrans Snap Online and Galeri Bojonegoro Store Pickup (`CASH_ON_PICKUP`). Automatically captures variant size/color, recipient address snapshots, and creates shadow users for guests. |
| `POST` | `/api/transactions/webhook` | Midtrans | Server-to-server webhook (SHA-512 Signature & Idempotent Stock Rollback on cancel/expire) |
| `POST` | `/api/transactions/sync/:id` | Guest / User / **ADMIN** | **Dual-Channel Reconciliation**: On-demand payment verification directly with Midtrans Core API, resolving delayed webhooks or closed browser tabs. |
| `POST` | `/api/transactions/:id/cancel` | User / **ADMIN** | Cancels pending order and atomically rolls back reserved inventory |
| `GET` | `/api/transactions/history` | User | Retrieves order history for the active customer |
| `GET` | `/api/transactions/all` | **ADMIN** | Retrieves all transactions across all channels (Online, POS Cash, Store Pickup, Guest, Member) |
| `POST` | `/api/transactions/cash` | **ADMIN** | **Physical In-Store POS Checkout**: atomic stock deduction, instant `PAID` state, thermal receipt printing |
| `PUT` | `/api/transactions/:id/status` | **ADMIN** | Manual status override with automatic stock sync/rollback |
| `GET` | `/api/transactions/tracking/all` | **ADMIN** | Retrieves all courier shipment trackings |
| `GET` | `/api/transactions/tracking/:orderNumber` | Public | Fetches tracking details and courier status for an order (accessible to guest buyers via Order ID) |
| `POST` | `/api/transactions/tracking` | **ADMIN** | Updates courier name, tracking status (`DIPROSES`, `DIKIRIM`, `SELESAI`), and AWB number |

#### F. Store Analytics Dashboard (`/api/admin`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/admin/stats` | **ADMIN** | **Multi-Channel & Multi-Segment Analytics**: Raw SQL aggregation computing total revenue, Online (Midtrans) vs Offline (Kasir Galeri), Guest vs Member revenue matrices, low stock alerts, conversion rates, and Web-AR fitting readiness. |

#### G. Shipping Addresses (`/api/addresses`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/addresses` | User | Retrieves saved shipping addresses |
| `POST` | `/api/addresses` | User | Adds a new delivery address |
| `DELETE` | `/api/addresses/:id` | User | Removes a saved address |

#### H. Customer Wishlist (`/api/wishlist`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/wishlist` | User | Retrieves user's favorited products |
| `POST` | `/api/wishlist/toggle` | User | Adds or removes an item from the wishlist |

#### I. Promotional Newsletter (`/api/newsletter`)
| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `POST` | `/api/newsletter/subscribe` | Public | Subscribes an email address to newsletters |
| `GET` | `/api/newsletter` | **ADMIN** | Retrieves all active email subscribers |

---

## 2. Security Architecture & Chaos Defense

### 2.1. Concurrency Control & Flash-Sale Protection
1. **Redis Atomic Mutex Locking**: An atomic 5-second lock key `lock:checkout:${userId}` blocks duplicate checkout submissions within milliseconds, eliminating double-billing and race condition attacks.
2. **Pessimistic Row Locking**: SQL queries execute `SELECT stock FROM "Inventory" WHERE "productId" = $1 FOR UPDATE` to exclusively lock stock rows during transactional operations, guaranteeing sequential, atomic deductions.
3. **Anti-Price Tampering**: All item prices are verified directly against database records (`officialProduct.price`), neutralizing tampered client payloads.

### 2.2. Midtrans Webhook Security & Automated Rollback
1. **SHA-512 Cryptographic Signature**: Validates authenticity via: `SHA-512(order_id + status_code + gross_amount + server_key)`.
2. **Idempotency Verification**: Automatically ignores duplicate webhook notifications if an order is already marked `PAID`.
3. **Automated Inventory Rollback**: Atomically restores reserved stock to inventory if transactions are canceled, expired, or denied (`cancel`, `expire`, `deny`).

### 2.3. Dual-Transport Resilient SMTP (Zero-Downtime Email)
- **Primary Transport**: Brevo corporate relay (`smtp-relay.brevo.com`) with SPF, DKIM, and DMARC authentication (`noreply@bellsgallery.web.id`).
- **Automated Fallback Transport**: Sub-second failover to Gmail SMTP upon connection timeouts or IP network partitions, guaranteeing OTP delivery without user-facing HTTP 500 errors.

### 2.4. Omnichannel Multi-Variant Integrity & Midtrans Snap Disambiguation
1. **Multi-Variant Collision Prevention**: Identifies variants using composite keys (`cartItemId = ${productId}__sz_${size}__col_${color}`) preventing unintentional cart merge or mass-deletion.
2. **Midtrans Item Details Disambiguation**: To comply with Midtrans API constraints requiring unique `item_details[].id`, line items are formatted with deterministic sequential indices (`${item.productId.substring(0, 40)}-${idx + 1}`).
3. **Pessimistic Sequential Inventory Locking**: In transactions purchasing multiple variants of the same product, stock is deducted atomically in a row-locked transaction loop (`SELECT ... FOR UPDATE`), preventing race conditions and overselling.

### 2.5. Individual Customer Problem Diagnosis & Dual-Channel Reconciliation
1. **Dual-Channel Active Synchronization (`POST /api/transactions/sync/:id`)**: Solves delayed webhook issues or prematurely closed browser tabs by querying the Midtrans Core Engine directly. If settled, orders update to `PAID` instantly; if expired, inventory automatically rolls back.
2. **Individual Diagnostic Inspector Modal (`OrderDetailModal`)**: Allows store operators to inspect individual order health with root-cause identification:
   - *Pending Online Payment*: Detects unpaid Virtual Account / QRIS and provides 1-click active gateway verification.
   - *Store Pickup (Galeri Bojonegoro)*: Provides physical pickup verification, item variant checklist (Size/Color), and in-store cash/QRIS settlement.
   - *Guest Buyer Support*: Identifies guest checkouts, displays recipient contact snapshots, and provides a 1-click WhatsApp button with pre-filled order status templates.
   - *Shipping & Logistics*: Displays courier details, recipient address snapshots, courier notes, and provides courier AWB tracking management.
3. **Automated Stock Rollback Protection**: When an order is manually canceled or marked `FAILED`, the inventory quantity is restored atomically via Prisma transactions.

---

## 3. Frontend Architecture & Web-VFR Engine (Next.js 16 + React 19)

Built with **Next.js 16.3 (App Router)**, **React 19.2**, **Tailwind CSS v4**, and **Zustand State Management**.

### 3.1. Virtual Fitting Room (Web-VFR)
1. **Mode 1: Live Web-AR (MediaPipe BlazePose 33 Landmarks)**
   - Computes skeletal landmarks at 30+ FPS inside an isolated Web Worker (`public/pose-worker.js`).
   - Anti-jitter stabilization powered by the *One Euro Filter* algorithm.
   - Euclidean CAD shoulder distance scaling between Left Shoulder (11) and Right Shoulder (12).
2. **Mode 2: Studio Simulation Mode (Webcam Bypass)**
   - 30 FPS virtual mannequin loop dynamically generated on an HTML5 canvas for environments without physical webcams or when permissions are blocked.
3. **Mode 3: Photo Try-On HD (Generative AI)**
   - High-definition still image evaluation powered by CatVTON AI generation.

### 3.2. GPU & VRAM Memory Management
- `TextureSwapper.disposeGroup()` actively purges WebGL geometries, textures, and materials to prevent browser crashes.
- All hardware camera tracks are explicitly severed (`track.stop()`) when modals unmount.
- Mathematical instances (`THREE.Vector3`, `THREE.Euler`) are memoized to avoid allocations inside the 60 FPS animation loop.

### 3.3. Shopping Cart Architecture & Variant Lifecycle (CartContext)
1. **Granular Variant Modeling**: Supports distinct SKU attributes (`size`, `color`, `colorHex`) with dedicated badges in the cart drawer.
2. **Hydration-Safe LocalStorage Synchronization**: Avoids React 19 SSR hydration mismatches by deferring localStorage state initialization to client-side mount hooks.
3. **Granular Line-Item Controls**: Provides localized quantity steppers (`+` / `-`) and atomic variant deletion without bleeding into other variants of the same base product.

### 3.4. VFR Garment Lifecycle & Customer Auto-Cutout Engine
1. **Customer Gallery AI Cutout**: Shoppers can upload arbitrary garment photos from their device gallery directly in the fitting studio. Segmented into transparent silhouettes within 2–3s via In-Browser WebAssembly (`@imgly/background-removal`) at zero server cost.
2. **Interactive Garment Switcher**: Seamlessly switch between catalog garments and custom uploads without leaving the camera stage.
3. **Garment List Lifecycle & Deletion**: Dedicated deletion controls (`Trash2`) on each garment and a bulk "Hapus Riwayat" action prevent persistent `localStorage` accumulation and UI clutter.
4. **Client-Side Heuristic Classification (`heuristicGarmentType`)**: Classifies clothing types (*upper*, *lower*, *full*) instantly based on file metadata and keywords, guaranteeing fail-safe operation with zero external Python/Flask server dependencies.
5. **Strict React 19 Rules of Hooks Compliance**: Unconditional execution of all layout and header hooks across route transitions (`/try-on` vs catalog).

---

## 4. In-Browser AI Auto-Cutout & POS Operations

1. **Client-Side Background Removal**: Powered by `@imgly/background-removal` via WebAssembly (ONNX) in both Admin intake (`MediaUploader.tsx`) and Customer fitting studio (`ARPanel.tsx`). Garment photos are segmented into transparent PNGs within 2–3 seconds at zero server cost.
2. **Dual-Asset Data Model**: The catalog retains both `imageUrl` (showcase catalog presentation) and `cutoutUrl` (transparent AR silhouette).
3. **Thermal Receipt Printing**: Instant physical receipt generation formatted with monospace fonts and `@page { size: 80mm auto; }` for standard POS thermal printers.
4. **Data Reporting**: Instant UTF-8 BOM CSV exports for orders and inventory records.
