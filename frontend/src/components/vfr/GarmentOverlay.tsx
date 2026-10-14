// src/components/vfr/GarmentOverlay.tsx
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Rnd, DraggableData, ResizableDelta } from 'react-rnd';
import { Move } from 'lucide-react';
import { useTryonStore, getActiveGarment } from '@/lib/tryon-store';

interface GarmentOverlayProps {
  containerWidth: number;
  containerHeight: number;
  shoulderY?: number;
}

export function GarmentOverlay({
  containerWidth,
  containerHeight,
  shoulderY,
}: GarmentOverlayProps) {
  const {
    selectedGarmentId,
    garments,
    transform,
    setTransform,
  } = useTryonStore();

  const selectedGarment = getActiveGarment(garments, selectedGarmentId);
  const [aspectRatio, setAspectRatio] = useState<number>(0.92);
  const imageRef = useRef<HTMLImageElement>(null);
  const SNAP_THRESHOLD = 15;

  // Ukur aspek rasio gambar sekali saja saat ganti baju (menghindari lag di 30 FPS)
  useEffect(() => {
    if (!selectedGarment) return;
    if (selectedGarment.width > 0 && selectedGarment.height > 0) {
      setAspectRatio(selectedGarment.width / selectedGarment.height);
      return;
    }
    const img = new Image();
    img.src = selectedGarment.src;
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
  }, [selectedGarment?.id, selectedGarment?.src, selectedGarment?.width, selectedGarment?.height]);

  const baseWidth = 240;
  const currentWidth = Math.round(baseWidth * transform.scale);
  const currentHeight = Math.round(currentWidth / (aspectRatio || 0.92));

  // Keyboard nudge controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedGarment) return;

      const step = e.shiftKey ? 15 : 5;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setTransform({ y: transform.y - step });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setTransform({ y: transform.y + step });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setTransform({ x: transform.x - step });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setTransform({ x: transform.x + step });
          break;
        case '+':
        case '=':
          e.preventDefault();
          setTransform({ scale: Math.min(5.5, transform.scale + 0.05) });
          break;
        case '-':
        case '_':
          e.preventDefault();
          setTransform({ scale: Math.max(0.3, transform.scale - 0.05) });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedGarment, transform, setTransform]);

  if (!selectedGarment) return null;

  const handleDragStop = (_e: unknown, d: DraggableData) => {
    let finalX = d.x;
    let finalY = d.y;

    // Magnetic snapping to shoulder line if available
    if (shoulderY && Math.abs(d.y - shoulderY) < SNAP_THRESHOLD) {
      finalY = shoulderY;
    }

    // Magnetic snapping to horizontal center
    const centerX = containerWidth / 2 - currentWidth / 2;
    if (Math.abs(d.x - centerX) < SNAP_THRESHOLD) {
      finalX = centerX;
    }

    setTransform({ x: finalX, y: finalY });
  };

  const handleResizeStop = (
    _e: unknown,
    _direction: unknown,
    ref: HTMLElement,
    _delta: ResizableDelta,
    position: { x: number; y: number }
  ) => {
    const newWidth = parseInt(ref.style.width, 10);
    const newScale = newWidth / baseWidth;

    setTransform({
      x: position.x,
      y: position.y,
      scale: Math.max(0.3, Math.min(5.5, newScale)),
    });
  };

  return (
    <Rnd
      size={{
        width: currentWidth,
        height: currentHeight,
      }}
      position={{
        x: transform.x,
        y: transform.y,
      }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      lockAspectRatio={transform.lockAspect}
      className="z-10"
      enableResizing={{
        top: false,
        right: true,
        bottom: true,
        left: false,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
    >
      <div
        className="w-full h-full relative cursor-grab active:cursor-grabbing group touch-none select-none"
        style={{
          opacity: transform.opacity / 100,
          transform: `rotate(${transform.rotation}deg)`,
          transformOrigin: '50% 16%',
        }}
      >
        {/* Garment Cutout Image */}
        <img
          ref={imageRef}
          src={selectedGarment.src}
          alt={selectedGarment.name}
          className="w-full h-full object-contain pointer-events-none select-none drop-shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
          draggable={false}
        />

        {/* CAD Blue Bounding Frame (sesuai spesifikasi Fine Tune) */}
        <div className="absolute inset-0 border border-blue-500/70 rounded-xs pointer-events-none" />

        {/* Fine Tune Badge (sudut kanan atas frame) */}
        <div className="absolute -top-3 -right-2 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1 pointer-events-none select-none">
          Fine Tune
        </div>

        {/* 4 Corner Blue Handles with touch hit-area */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-500 rounded-full border border-white shadow pointer-events-none" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-full border border-white shadow pointer-events-none" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-500 rounded-full border border-white shadow pointer-events-none" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-full border border-white shadow pointer-events-none" />

        {/* 4-way Move Cursor Icon in Center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/35 p-1.5 rounded-full backdrop-blur-xs">
            <Move size={22} className="text-white drop-shadow-md" />
          </div>
        </div>
      </div>
    </Rnd>
  );
}
