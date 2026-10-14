// src/lib/tryon-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Transform, Garment, PoseConfidence } from '@/types/tryon';

export const DEFAULT_GARMENTS: Garment[] = [
  {
    id: "kaos-kuning-77",
    name: "T-Shirt Casual Kuning 77",
    src: "/products/kaos-kuning-77-cutout.png",
    width: 554,
    height: 554,
    category: "tops",
  },
  {
    id: "sweater-candy-cane",
    name: "Sweater Candy Cane",
    src: "/products/sweater-candy-cane.png",
    width: 554,
    height: 554,
    category: "tops",
  },
];

export function getActiveGarment(garments: Garment[], selectedGarmentId: string | null): Garment {
  if (selectedGarmentId) {
    const found = garments.find(
      (g) => g.id === selectedGarmentId || g.name === selectedGarmentId
    );
    if (found) return found;
    const defaultFound = DEFAULT_GARMENTS.find(
      (g) => g.id === selectedGarmentId || g.name === selectedGarmentId
    );
    if (defaultFound) return defaultFound;
  }
  return garments[0] || DEFAULT_GARMENTS[0];
}

const DEFAULT_TRANSFORM: Transform = {
  x: 200,
  y: 120,
  scale: 1.0,
  rotation: 0,
  opacity: 85,
  lockAspect: true,
};

export type TryOnMode = 'ar' | 'photo';

interface TryonState {
  activeMode: TryOnMode;
  garments: Garment[];
  selectedGarmentId: string | null;
  transform: Transform;
  baselineTransform: Transform;
  mediaPipeEnabled: boolean;
  landmarksVisible: boolean;
  measurementsVisible: boolean;
  continuousTracking: boolean;
  poseConfidence: PoseConfidence;

  // Onboarding & Modals
  photoOnboardingOpen: boolean;
  arOnboardingOpen: boolean;

  setMode: (mode: TryOnMode) => void;
  selectGarment: (garmentOrId: string | Garment | null) => void;
  removeGarment: (id: string) => void;
  clearCustomGarments: () => void;
  setTransform: (partial: Partial<Transform>) => void;
  toggleMediaPipe: () => void;
  toggleLandmarks: () => void;
  toggleMeasurements: () => void;
  toggleContinuousTracking: () => void;
  autoAlignGarment: (x: number, y: number, scale: number, rotation: number) => void;
  setPoseConfidence: (confidence: PoseConfidence | number) => void;
  resetToBaseline: () => void;

  openPhotoOnboarding: () => void;
  closePhotoOnboarding: () => void;
  openAROnboarding: () => void;
  closeAROnboarding: () => void;
}

export const useTryonStore = create<TryonState>()(
  persist(
    (set, get) => ({
      activeMode: 'ar',
      garments: DEFAULT_GARMENTS,
      selectedGarmentId: 'kaos-kuning-77',
      transform: { ...DEFAULT_TRANSFORM },
      baselineTransform: { ...DEFAULT_TRANSFORM },
      mediaPipeEnabled: true,
      landmarksVisible: true,
      measurementsVisible: true,
      continuousTracking: true,
      poseConfidence: 'Low',
      photoOnboardingOpen: false,
      arOnboardingOpen: false,

      setMode: (mode) => set({ activeMode: mode }),

      selectGarment: (garmentOrId) => {
        if (!garmentOrId) {
          set({ selectedGarmentId: null });
          return;
        }
        if (typeof garmentOrId === 'string') {
          set({ selectedGarmentId: garmentOrId });
        } else {
          const exists = get().garments.some((g) => g.id === garmentOrId.id);
          set((state) => ({
            garments: exists ? state.garments : [...state.garments, garmentOrId],
            selectedGarmentId: garmentOrId.id,
          }));
        }
      },

      removeGarment: (garmentId) => {
        const state = get();
        const updated = state.garments.filter(
          (g) => g.id !== garmentId && g.name !== garmentId
        );
        let nextSelectedId = state.selectedGarmentId;
        if (state.selectedGarmentId === garmentId) {
          nextSelectedId = updated[0]?.id || DEFAULT_GARMENTS[0].id;
        }
        set({
          garments: updated.length > 0 ? updated : DEFAULT_GARMENTS,
          selectedGarmentId: nextSelectedId,
        });
      },

      clearCustomGarments: () => {
        set({
          garments: DEFAULT_GARMENTS,
          selectedGarmentId: DEFAULT_GARMENTS[0].id,
        });
      },

      setTransform: (partial) =>
        set((state) => ({ transform: { ...state.transform, ...partial } })),

      toggleMediaPipe: () =>
        set((state) => ({
          mediaPipeEnabled: !state.mediaPipeEnabled,
          ...(state.mediaPipeEnabled ? { continuousTracking: false, landmarksVisible: false } : {}),
        })),

      toggleLandmarks: () =>
        set((state) => ({ landmarksVisible: !state.landmarksVisible })),

      toggleMeasurements: () =>
        set((state) => ({ measurementsVisible: !state.measurementsVisible })),

      toggleContinuousTracking: () =>
        set((state) => ({ continuousTracking: !state.continuousTracking })),

      autoAlignGarment: (x, y, scale, rotation) =>
        set({
          transform: { ...get().transform, x, y, scale, rotation },
        }),

      setPoseConfidence: (confidence) => {
        let label: PoseConfidence = 'Low';
        if (typeof confidence === 'number') {
          if (confidence >= 0.7) label = 'Good';
          else if (confidence >= 0.4) label = 'Okay';
        } else {
          label = confidence;
        }
        set({ poseConfidence: label });
      },

      resetToBaseline: () =>
        set((state) => ({ transform: { ...state.baselineTransform } })),

      openPhotoOnboarding: () => set({ photoOnboardingOpen: true }),
      closePhotoOnboarding: () => set({ photoOnboardingOpen: false }),
      openAROnboarding: () => set({ arOnboardingOpen: true }),
      closeAROnboarding: () => set({ arOnboardingOpen: false }),
    }),
    {
      name: 'bellsgallery-tryon-storage',
      partialize: (state) => ({
        garments: state.garments,
        selectedGarmentId: state.selectedGarmentId,
        activeMode: state.activeMode,
      }),
    }
  )
);
