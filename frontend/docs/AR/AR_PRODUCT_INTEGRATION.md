# AR Product Catalog Integration Guide — Phygital Store

**Version:** 2.1 (Fully Integrated) | **Last Updated:** 2026-10-13

This guide details how to integrate the Live AR Virtual Fitting Room with Phygital Store's existing product detail page and gallery components.

---

## 1. Integration Architecture in Phygital Store

In Phygital Store:
1. `src/app/product/[id]/page.tsx` fetches product data from the backend API:
   ```typescript
   const product = await getProduct(id); // GET http://127.0.0.1:3001/api/products/${id}
   ```
2. The product object is passed to `src/components/ProductGallery.tsx`.
3. `ProductGallery.tsx` renders a grid of product views and manages the modal trigger state:
   ```tsx
   const [isVFROpen, setIsVFROpen] = useState(false);
   ```
4. Clicking the "Coba Virtual (VFR)" button opens `<VirtualFittingRoom />`.

---

## 2. Integration Strategies

You have two clean integration options:

### Strategy A: Dual-Mode Tabs inside `VirtualFittingRoom.tsx` (Recommended)

Add a mode switcher at the top of the existing `VirtualFittingRoom.tsx` modal:
- **Tab 1: Live Real-Time AR** (MediaPipe 2D Smart Overlay stream with continuous tracking and manual drag/resize).
- **Tab 2: AI Photo Booth & 3D** (Existing snapshot capture, posture guide, SizeAdvisor, and 3D glTF mesh renderer).

```tsx
// Inside src/components/VirtualFittingRoom.tsx
import ARStage from '@/components/vfr/ARStage';
import ARPanel from '@/components/vfr/ARPanel';

export default function VirtualFittingRoom({ isOpen, onClose, product }: Props) {
  const [vfrMode, setVfrMode] = useState<'live-ar' | 'photo-booth'>('live-ar');

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="relative w-full max-w-5xl h-[85vh] bg-gray-950 rounded-2xl overflow-hidden flex flex-col">
        {/* Header with Mode Switcher */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVfrMode('live-ar')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                vfrMode === 'live-ar'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              📹 Live Web-AR Stream
            </button>
            <button
              onClick={() => setVfrMode('photo-booth')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                vfrMode === 'photo-booth'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              📸 AI Photo Booth & 3D
            </button>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {vfrMode === 'live-ar' ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] h-full">
              <ARStage />
              <div className="hidden lg:block border-l border-gray-800">
                <ARPanel />
              </div>
            </div>
          ) : (
            <PhotoBoothView product={product} /> // Existing photo-booth JSX
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### Strategy B: Direct Trigger Button in `ProductGallery.tsx`

Add an independent "Live AR Stream" trigger directly next to the existing button in `src/components/ProductGallery.tsx`:

```tsx
// Inside src/components/ProductGallery.tsx
import { useTryonStore } from '@/lib/tryon-store';

export default function ProductGallery({ product }: { product: any }) {
  const [isLiveAROpen, setIsLiveAROpen] = useState(false);
  const selectGarment = useTryonStore((s) => s.selectGarment);

  const handleOpenLiveAR = (e: React.MouseEvent) => {
    e.preventDefault();
    selectGarment({
      id: product.id,
      name: product.name,
      src: product.cutoutUrl || product.imageUrl || '/products/kaos-kuning-77.png',
      width: 512,
      height: 512,
      category: product.category || 'tops',
    });
    setIsLiveAROpen(true);
  };

  return (
    <>
      {/* Existing gallery JSX with added button */}
      <button 
        onClick={handleOpenLiveAR}
        className="px-4 py-2 bg-indigo-600 text-white font-semibold uppercase text-xs tracking-wider rounded-sm shadow-md hover:bg-indigo-500"
      >
        Live AR Try-On 📹
      </button>

      {/* Live AR Modal Dialog */}
      {isLiveAROpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl h-[85vh] bg-gray-950 rounded-2xl overflow-hidden">
            <button 
              onClick={() => setIsLiveAROpen(false)}
              className="absolute top-4 right-4 z-50 bg-black/60 text-white p-2 rounded-full"
            >
              ✕
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] h-full">
              <ARStage />
              <div className="hidden lg:block border-l border-gray-800">
                <ARPanel />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## 3. Garment Asset Cutout Handling

For realistic overlay blending, catalog garments require transparent backgrounds.

### Automated Workflow with `garment-processing-api`:

```
Catalog Product Image (.png / .jpg)
                │
                ▼
POST http://127.0.0.1:5001/api/process-garment
(FastAPI microservice executing `rembg` background extraction)
                │
                ▼
Transparent Cutout Asset Generated (/processed/cutout_xxxx.png)
                │
                ▼
Loaded into `useTryonStore.selectGarment({ src: cutoutUrl })`
```

### Graceful Fallback:
If an isolated cutout has not yet been processed, the system seamlessly falls back to `product.imageUrl` or `/products/kaos-kuning-77.png`.

---

**Related Documentation:** [AR_IMPLEMENTATION_GUIDE.md](./AR_IMPLEMENTATION_GUIDE.md) | [AR_ARCHITECTURE.md](./AR_ARCHITECTURE.md)
