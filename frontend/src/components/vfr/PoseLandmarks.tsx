// src/components/vfr/PoseLandmarks.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { PoseLandmark } from '@/types/tryon';
import { POSE_CONNECTIONS, calculateBodyMeasurements, mapLandmarkToContainer } from '@/lib/pose-utils';

interface PoseLandmarksProps {
  landmarks: PoseLandmark[] | null;
  width: number;
  height: number;
  videoWidth?: number;
  videoHeight?: number;
  visible?: boolean;
  measurementsVisible?: boolean;
}

const SHOULDER_LANDMARKS = [11, 12];
const FACE_LANDMARKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ARM_LANDMARKS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const TORSO_LANDMARKS = [23, 24];
const LEG_LANDMARKS = [25, 26, 27, 28, 29, 30, 31, 32];

function drawBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bgColor: string = 'rgba(10, 15, 30, 0.88)',
  borderColor: string = '#34d399',
  textColor: string = '#ffffff'
) {
  ctx.save();
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  const paddingX = 7;
  const paddingY = 3;
  const textMetrics = ctx.measureText(text);
  const badgeWidth = textMetrics.width + paddingX * 2;
  const badgeHeight = 18;
  const rx = x - badgeWidth / 2;
  const ry = y - badgeHeight / 2;

  // Background box with rounded corners
  ctx.fillStyle = bgColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(rx, ry, badgeWidth, badgeHeight, 5);
  } else {
    ctx.rect(rx, ry, badgeWidth, badgeHeight);
  }
  ctx.fill();
  ctx.stroke();

  // Badge Text
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawCADDimension(
  ctx: CanvasRenderingContext2D,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  offsetDistance: number,
  label: string,
  color: string = '#34d399'
) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 10) return;

  // Perpendicular unit vector
  const nx = -dy / dist;
  const ny = dx / dist;

  // Offset points along perpendicular vector
  const o1 = { x: p1.x + nx * offsetDistance, y: p1.y + ny * offsetDistance };
  const o2 = { x: p2.x + nx * offsetDistance, y: p2.y + ny * offsetDistance };

  ctx.save();

  // 1. Extension lines (dashed lines from anatomy points to dimension line)
  ctx.strokeStyle = `${color}55`;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(o1.x, o1.y);
  ctx.moveTo(p2.x, p2.y);
  ctx.lineTo(o2.x, o2.y);
  ctx.stroke();

  // 2. Main dimension line (solid)
  ctx.setLineDash([]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(o1.x, o1.y);
  ctx.lineTo(o2.x, o2.y);
  ctx.stroke();

  // 3. End tick marks
  const tickLen = 4;
  [o1, o2].forEach((pt) => {
    ctx.beginPath();
    ctx.moveTo(pt.x + nx * tickLen, pt.y + ny * tickLen);
    ctx.lineTo(pt.x - nx * tickLen, pt.y - ny * tickLen);
    ctx.stroke();
  });

  // 4. Center badge label
  const midX = (o1.x + o2.x) / 2;
  const midY = (o1.y + o2.y) / 2;
  drawBadge(ctx, label, midX, midY, 'rgba(10, 15, 30, 0.92)', color, '#ffffff');

  ctx.restore();
}

export function PoseLandmarks({
  landmarks,
  width,
  height,
  videoWidth = 1280,
  videoHeight = 720,
  visible = true,
  measurementsVisible = true,
}: PoseLandmarksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if ((!visible && !measurementsVisible) || !landmarks || landmarks.length === 0) return;

    // --- 0. CAD BACKGROUND GRID & CENTER CROSSHAIRS ---
    if (visible || measurementsVisible) {
      ctx.save();
      // Subtle background grid
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.14)';
      ctx.lineWidth = 1;
      const gridSize = 45;
      for (let gx = 0; gx < width; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      // Blue Center Alignment Crosshairs (through shoulder center)
      const p11 = landmarks[11];
      const p12 = landmarks[12];
      if (p11 && p12 && (p11.visibility || 0) > 0.35 && (p12.visibility || 0) > 0.35) {
        const pt11 = mapLandmarkToContainer(p11.x, p11.y, width, height, videoWidth, videoHeight);
        const pt12 = mapLandmarkToContainer(p12.x, p12.y, width, height, videoWidth, videoHeight);
        const centerX = (pt11.x + pt12.x) / 2;
        const centerY = (pt11.y + pt12.y) / 2;

        ctx.strokeStyle = 'rgba(59, 130, 246, 0.65)'; // Crisp blue crosshair
        ctx.lineWidth = 1.2;

        // Vertical centerline
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.stroke();

        // Horizontal shoulderline
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Neck connection line from mouth center to shoulder center
        const p9 = landmarks[9];
        const p10 = landmarks[10];
        if (p9 && p10 && (p9.visibility || 0) > 0.35 && (p10.visibility || 0) > 0.35) {
          const pt9 = mapLandmarkToContainer(p9.x, p9.y, width, height, videoWidth, videoHeight);
          const pt10 = mapLandmarkToContainer(p10.x, p10.y, width, height, videoWidth, videoHeight);
          const mouthCenterX = (pt9.x + pt10.x) / 2;
          const mouthCenterY = (pt9.y + pt10.y) / 2;

          ctx.strokeStyle = 'rgba(0, 255, 255, 0.75)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(mouthCenterX, mouthCenterY);
          ctx.lineTo(centerX, centerY);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // --- 1. SKELETON CONNECTIONS & JOINTS ---
    if (visible) {
      // Draw connection lines - Cyan neon as per documentation
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.75)';

      POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];

        if (start && end && (start.visibility || 0) > 0.35 && (end.visibility || 0) > 0.35) {
          const pStart = mapLandmarkToContainer(start.x, start.y, width, height, videoWidth, videoHeight);
          const pEnd = mapLandmarkToContainer(end.x, end.y, width, height, videoWidth, videoHeight);
          ctx.beginPath();
          ctx.moveTo(pStart.x, pStart.y);
          ctx.lineTo(pEnd.x, pEnd.y);
          ctx.stroke();
        }
      });

      // Draw joint dots with color coding per body region
      landmarks.forEach((landmark, index) => {
        if ((landmark.visibility || 0) < 0.35) return;

        const pt = mapLandmarkToContainer(landmark.x, landmark.y, width, height, videoWidth, videoHeight);
        const x = pt.x;
        const y = pt.y;

        let color = '#ffffff';
        let size = 3.5;

        if (SHOULDER_LANDMARKS.includes(index)) {
          color = '#00ff00'; // Pure Green for shoulders #11 & #12 (Anchor)
          size = 7.0;
        } else if (FACE_LANDMARKS.includes(index)) {
          color = '#ff00ff'; // Magenta for face (0-10)
          size = 3.2;
        } else if (ARM_LANDMARKS.includes(index)) {
          color = '#ffff00'; // Yellow for arms & hands (13-22)
          size = 4.0;
        } else if (TORSO_LANDMARKS.includes(index)) {
          color = '#00ffff'; // Cyan for torso / hips (23-24)
          size = 5.0;
        } else if (LEG_LANDMARKS.includes(index)) {
          color = '#ff8800'; // Orange for legs & feet (25-32)
          size = 4.0;
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, 2 * Math.PI);
        ctx.fill();

        // Subtle dark outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Titik Kunci Jangkar Baju (#11 Bahu Kiri & #12 Bahu Kanan)
        if (index === 11 || index === 12) {
          ctx.save();
          // Cincin target glowing
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(x, y, 11, 0, 2 * Math.PI);
          ctx.stroke();

          // Label text "#11" / "#12"
          ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = index === 11 ? 'right' : 'left';
          ctx.textBaseline = 'middle';
          const textOffset = index === 11 ? -14 : 14;
          ctx.fillText(`#${index}`, x + textOffset, y);
          ctx.restore();
        }
      });
    }

    // --- 2. CAD MEASUREMENT LINES & CALLOUT DIMENSIONS ---
    if (measurementsVisible) {
      const measurements = calculateBodyMeasurements(landmarks, width, height, videoWidth, videoHeight);

      if (measurements) {
        // A. Bahu (Shoulder Width) - Dimensi horizontal berstandar CAD
        if (measurements.shoulder.visible) {
          drawCADDimension(
            ctx,
            measurements.shoulder.p1,
            measurements.shoulder.p2,
            -34,
            `📏 Lebar Bahu: ${measurements.shoulder.cm} cm (${measurements.shoulder.recommendedSize})`,
            '#00ff00'
          );
        }

        // B. Wajah / IPD (Inter-Pupillary Distance) - Kalibrasi biometrik
        if (measurements.ipd.visible) {
          drawCADDimension(
            ctx,
            measurements.ipd.p1,
            measurements.ipd.p2,
            -20,
            `👁️ IPD: 6.3 cm (Ref)`,
            '#38bdf8'
          );
        }

        // C. Torso (Panjang Torso dari Bahu ke Pinggul)
        if (measurements.torso.visible) {
          drawCADDimension(
            ctx,
            measurements.torso.top,
            measurements.torso.bottom,
            38,
            `📐 Panjang Torso: ${measurements.torso.cm} cm`,
            '#00ffff'
          );
        }

        // D. Pinggul (Lebar Pinggul / Hip Width)
        if (measurements.hip?.visible) {
          drawCADDimension(
            ctx,
            measurements.hip.p1,
            measurements.hip.p2,
            24,
            `📏 Lebar Pinggul: ${measurements.hip.cm} cm`,
            '#00ffff'
          );
        }

        // E. Lengan Kiri (Bahu -> Pergelangan)
        if (measurements.leftArm.visible) {
          drawCADDimension(
            ctx,
            measurements.leftArm.shoulder,
            measurements.leftArm.wrist,
            22,
            `💪 Lengan Kiri: ${measurements.leftArm.cm} cm`,
            '#ffff00'
          );
        }

        // F. Lengan Kanan (Bahu -> Pergelangan)
        if (measurements.rightArm.visible) {
          drawCADDimension(
            ctx,
            measurements.rightArm.shoulder,
            measurements.rightArm.wrist,
            -22,
            `💪 Lengan Kanan: ${measurements.rightArm.cm} cm`,
            '#ffff00'
          );
        }

        // G. Kaki Kiri (Pinggul -> Mata Kaki)
        if (measurements.leftLeg.visible) {
          drawCADDimension(
            ctx,
            measurements.leftLeg.hip,
            measurements.leftLeg.ankle,
            26,
            `🦵 Kaki Kiri: ${measurements.leftLeg.cm} cm`,
            '#ff8800'
          );
        }

        // H. Kaki Kanan (Pinggul -> Mata Kaki)
        if (measurements.rightLeg.visible) {
          drawCADDimension(
            ctx,
            measurements.rightLeg.hip,
            measurements.rightLeg.ankle,
            -26,
            `🦵 Kaki Kanan: ${measurements.rightLeg.cm} cm`,
            '#ff8800'
          );
        }
      }
    }
  }, [landmarks, width, height, videoWidth, videoHeight, visible, measurementsVisible]);

  if (!visible && !measurementsVisible) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-20"
    />
  );
}

