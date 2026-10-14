# Phygital Store — Documentation Hub

Welcome to the comprehensive documentation index for the **Phygital Store** frontend. This hub organizes all architectural specifications, implementation guides, and technical references.

## 📌 [AUDIT & MIGRATION REPORT](./AUDIT_AND_MIGRATION_ANALYSIS.md)
> **New Developer? Read the [Complete Documentation Audit & Migration Analysis](./AUDIT_AND_MIGRATION_ANALYSIS.md)** to see the exact breakdown of which documents are production-ready, which are microservices, and which are historical references.

---

## 📚 Quick Navigation by Topic

```
docs/
├── AUDIT_AND_MIGRATION_ANALYSIS.md   # [AUDIT] Complete classification of all 30+ docs
├── AR/                               # [PRIMARY] Production-ready Live AR & VFR Guides
│   ├── AR_IMPLEMENTATION_GUIDE.md    # Complete step-by-step setup & integration
│   ├── AR_ARCHITECTURE.md            # 5-Layer system architecture & data flows
│   ├── AR_QUICK_REFERENCE.md         # Developer cheat-sheet & shortcuts
│   ├── AR_FILE_MAP.md                # Codebase file mapping & build order
│   ├── AR_PRODUCT_INTEGRATION.md     # Product page & gallery modal integration
│   └── AR_TESTING_CHECKLIST.md       # Quality assurance verification checklist
│
├── ar-mediapipe-docs/                # [DEEP DIVE] MediaPipe Pose Computer Vision Specs
│   ├── 01-system-architecture.md     # BlazePose topology & principles
│   ├── 02-mediapipe-integration.md   # GPU delegation & WebAssembly integration
│   ├── 03-position-algorithms.md     # Euclidean shoulder math & tilt rotation
│   ├── 04-component-architecture.md  # Detailed component lifecycle & interactions
│   ├── 05-development-guide.md       # DevTools debugging & profiling
│   └── README.md                     # Overview of the MediaPipe research documentation
│
└── backend-and-tools/                # Supporting Services & Utility References
    ├── GARMENT_EXTRACTION_COMPLETE.md# Rembg background removal pipeline
    ├── FASTAPI_SETUP.md              # Python FastAPI microservice setup
    ├── BACKEND_URL_ENDPOINT.md       # Express API endpoint configuration
    ├── CORS_FIX.md                   # Cross-Origin Resource Sharing handling
    ├── WEBP_CONVERSION.md            # Client-side image format processing
    └── CLOUDINARY_SETUP.md           # Cloud image hosting & CDN delivery
```

---

## 🚀 1. Live AR & Virtual Fitting Room (Core)

Use these documents when implementing or modifying the Virtual Fitting Room experience in Phygital Store:

| Guide | Description | Target Reader |
|:------|:------------|:--------------|
| **[AR Implementation Guide](./AR/AR_IMPLEMENTATION_GUIDE.md)** | Step-by-step guide from installing `@mediapipe/tasks-vision`, `react-rnd`, and `zustand` to running the live canvas. | Developers implementing AR |
| **[AR System Architecture](./AR/AR_ARCHITECTURE.md)** | Architectural blueprints showing how Live AR coexists with the existing 3D WebGL and AI Photo Booth engines. | System Architects / Leads |
| **[AR Quick Reference](./AR/AR_QUICK_REFERENCE.md)** | Cheat-sheet of npm commands, file locations, placement formulas, and keyboard shortcuts. | Daily Coding Reference |
| **[AR File Map](./AR/AR_FILE_MAP.md)** | Complete file dependency graph and directory breakdown. | Code Reviewers / Devs |
| **[AR Product Integration](./AR/AR_PRODUCT_INTEGRATION.md)** | Integrating with `src/app/product/[id]/page.tsx` and `ProductGallery.tsx`. | Frontend Engineers |
| **[AR Testing Checklist](./AR/AR_TESTING_CHECKLIST.md)** | Exhaustive QA checklist for camera permissions, auto-align snapping, and continuous tracking. | QA Testers / Engineers |

---

## 🔬 2. MediaPipe Pose Deep-Dive Research

In-depth technical papers on the computer vision layer powered by Google's MediaPipe BlazePose:

- **[01 - System Architecture](./ar-mediapipe-docs/01-system-architecture.md)**: Mathematical principles, hybrid control strategy, and high-level pipeline.
- **[02 - MediaPipe Integration](./ar-mediapipe-docs/02-mediapipe-integration.md)**: WebAssembly runtime, GPU delegates, and frame skipping mechanics.
- **[03 - Position Algorithms](./ar-mediapipe-docs/03-position-algorithms.md)**: Trigonometric alignment, scale ratios (120% shoulder width), and clamp limits.
- **[04 - Component Architecture](./ar-mediapipe-docs/04-component-architecture.md)**: Detailed breakdown of the video preview and interactive overlay layers.
- **[05 - Development Guide](./ar-mediapipe-docs/05-development-guide.md)**: Performance profiling with Chrome DevTools and debugging tools.

---

## 🛠️ 3. Backend & Utility Services

Documentation for supporting services that enhance the Virtual Fitting Room:

- **Background Removal (Modern In-Browser WASM)**: Garment cutouts are now generated directly inside the browser using `@imgly/background-removal` (WebAssembly ONNX) at zero infrastructure cost. Refer to [docs/AI_AUTO_CUTOUT_AND_GARMENT_WORKFLOW.md](../../docs/AI_AUTO_CUTOUT_AND_GARMENT_WORKFLOW.md) for current production architecture. *(Historical FastAPI + rembg documentation preserved in [GARMENT_EXTRACTION_COMPLETE.md](./GARMENT_EXTRACTION_COMPLETE.md))*.
- **API & Network Configuration**: Refer to [BACKEND_URL_ENDPOINT.md](./BACKEND_URL_ENDPOINT.md) and [CORS_FIX.md](./CORS_FIX.md) for communication between Next.js and the Express backend.
- **Asset Optimization**: Check [WEBP_CONVERSION.md](./WEBP_CONVERSION.md) and [CLOUDINARY_SETUP.md](./CLOUDINARY_SETUP.md) for client-side asset optimization.

---

## 💻 Tech Stack Quick Reference

- **Frontend**: Next.js 16.3.0, React 19.2.8, Tailwind CSS v4, Lucide React
- **3D & WebGL**: `@react-three/fiber`, `@react-three/drei`, `three`
- **Vision & AR**: `@mediapipe/tasks-vision`, `react-rnd`, `zustand`
- **In-Browser Segmentation**: `@imgly/background-removal` (WASM)
- **Backend**: Node.js Express (Port 3001), PostgreSQL (Prisma ORM), Redis

---

*Last Updated: 2026-10-10 | Maintained by the Phygital Store Engineering Team*
*Master Documentation: [docs/DOCUMENTATION.md](../../docs/DOCUMENTATION.md)*
