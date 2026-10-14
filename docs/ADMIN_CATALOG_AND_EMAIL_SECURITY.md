# Technical Guide: Catalog Management, Admin Governance, & Email Security

**Document Version:** 2.1 | **Status:** Active Operational Reference | **Language:** English

This guide documents administrative operations, catalog media workflows, server-level user and role governance, physical POS cashier operations, and corporate-grade dual-transport transactional email infrastructure for the **Phygital Store** platform.

---

## 1. Product Catalog & Media Architecture (Go-Public Deployment)

### A. Media Asset Storage Locations
* **Local Development Storage:**
  Default static placeholder images reside in:
  `frontend/public/products/`
  * `kaos-kuning-77.png` &rarr; Showcase catalog garment image.
  * `kaos-kuning-77-cutout.png` &rarr; Transparent silhouette PNG used by the **Virtual Fitting Room (Web-AR)**.
* **Cloud Storage (Production & Go-Public Standard):**
  For production deployment, media is managed via **Cloudinary CDN** using the `MediaUploader.tsx` component.
  * Assets are uploaded directly from the admin browser to Cloudinary via *Unsigned Upload Presets*.
  * The PostgreSQL database stores the permanent HTTPS URL (`https://res.cloudinary.com/...`).
  * **Architectural Advantage:** No container rebuilds are required when new garments are introduced, and assets remain persistent across container restarts.

### B. Adding a New Product
1. Open the Admin Dashboard: `http://localhost:3000/admin`.
2. Navigate to the **Products** tab &rarr; Click **+ Add Product**.
3. Fill in attributes: Name, Category (`pria`/`wanita`), Subcategory (`kaos`, `kemeja`, etc.), Price, and Available Stock.
4. Upload the primary product photo via drag-and-drop (automatically sent to Cloudinary) or input an image URL.
5. Toggle **AI Auto-Cutout** to generate a transparent PNG silhouette on-the-fly for Web-AR try-on.
6. Click **Save Product**. The item is immediately live in the customer-facing catalog.

---

## 2. Administrator Governance & Role-Based Access Control (RBAC)

### A. Security Philosophy: Super Admin vs Customer Accounts
* **Regular Customers:** Rely on self-service password recovery via 6-digit email OTP verification.
* **Super Administrators:** Do not rely on public password recovery forms to eliminate brute-force vector risks. Root-level administration is managed through privileged server CLI utilities or the protected Admin Dashboard.

### B. Command-Line Administration Scripts
Command-line utilities are provided in `backend/src/scripts/`:

#### 1. Creating or Resetting an Admin Password (`createAdmin.ts`)
To provision a new administrator or reset an existing admin's password:
```bash
cd backend
npx tsx src/scripts/createAdmin.ts <email> "<new_password>" "<admin_name>"
```
*If the email already exists in the database, the script updates the password with a newly generated Bcrypt salt hash.*

#### 2. Clean User Account Purge (`deleteUser.ts`)
Purges a user account and cleanly clears foreign-key dependencies (wishlist, address, membership, orders) within an atomic database transaction:
```bash
cd backend
npx tsx src/scripts/deleteUser.ts <email_to_delete>
```

#### 3. Visual Database Management via Prisma Studio
```bash
npx prisma studio
# Accessible at: http://localhost:5555
```

---

### C. Visual User & Role Management via Admin Dashboard

Administrators have full administrative control directly from the Admin Dashboard (`/admin` Users tab):

1. **Promote User to Admin**:
   - Click the **"Make Admin"** button (`ShieldCheck` icon) on any `CUSTOMER` row.
   - Dispatches `PUT /api/users/:id/role` with `{ role: "ADMIN" }`.
2. **Revoke Admin Role**:
   - Click the **"Revoke Admin"** button (`ShieldOff` icon) on an `ADMIN` row.
   - Dispatches `DELETE /api/users/:id/role`. The user's administrative privileges are revoked and their role reverts to `CUSTOMER`.
3. **Permanently Delete User Account**:
   - Click the **"Delete User"** button (`Trash2` icon).
   - Dispatches `DELETE /api/users/:id`. The account and all related database records are purged within an isolated transaction.
4. **Security Safeguards (Self-Protection & Last-Admin Guard)**:
   - **Self-Account Lock**: The currently authenticated administrator is labeled `(Your Account)` and action buttons are disabled to prevent accidental self-deletion or self-demotion.
   - **Last-Admin Safeguard**: The backend strictly blocks role revocation or deletion if the target user is the sole remaining administrator in the database.

---

## 3. Physical Point of Sale (POS), Thermal Receipts & CSV Export

### A. Physical POS Cashier Operations
* Walk-in customers at physical retail locations can purchase products via cash payments without creating an online account.
* Located at the top of the Admin Dashboard: click **"Kasir Toko Fisik (POS Tunai)"**.
* Select products, set quantities, enter cash received, and view the auto-computed change amount.
* Submits `POST /api/transactions/cash`, atomically deducting inventory stock and creating a verified `PAID` transaction.

### B. Thermal Receipt Printing (80mm / 58mm Standard)
* Following a successful cash transaction or via the **Struk** button on any cash order row:
* Triggers `handlePrintReceipt(...)`, rendering a lightweight, zero-dependency printable HTML invoice with monospace formatting and `@page { margin: 5mm; size: 80mm auto; }`.
* Automatically triggers the browser print dialog (`window.print()`), compatible with standard POS receipt hardware.

### C. CSV / Excel Data Reporting
* **Orders Export**: Click **Export CSV** in the Orders tab to download all filtered sales records, complete with customer details, item quantities, courier info, and tracking numbers.
* **Products Export**: Click **Export CSV** in the Products tab to export the full inventory ledger, stock levels, pricing, and AR asset readiness flags.

---

## 4. Transactional Email Infrastructure (Dual-Transport Resilient SMTP)

### A. Zero-Downtime Dual-Transport Architecture
The email utility (`backend/src/utils/email.ts`) features an automated sub-second failover engine:
1. **Primary Transport (Brevo Corporate Relay)**:
   - Dispatches via `smtp-relay.brevo.com` using the official sender `Bells Gallery <noreply@bellsgallery.web.id>`.
   - Authenticated with DNS DKIM, SPF, and DMARC records.
2. **Automated Fallback Transport (Gmail SMTP)**:
   - If Brevo encounters network timeouts or IP restrictions, the system **instantly shifts delivery to Gmail SMTP** within milliseconds.
   - Ensures 100% password reset OTP delivery without client-facing HTTP 500 errors.

### B. Meta-Styled HTML Email Template (`emailTemplates.ts`)
* Responsive table layout tested across major mobile and desktop email clients.
* Subject line contains the 6-digit OTP code directly for instant mobile notification preview.
* Features the **PHYGITAL** brand header, large letter-spaced OTP highlight container (`#f0f2f5`), security advisory box, and anti-phishing warnings.
