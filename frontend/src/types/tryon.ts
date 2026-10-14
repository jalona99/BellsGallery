// src/types/tryon.ts
export * from '@/lib/types';

export interface PoseLandmark {
  x: number;           // Normalized 0-1, mirrored for selfie view
  y: number;           // Normalized 0-1
  z: number;           // Relative depth
  visibility?: number; // Detection confidence (0-1)
}

export interface ShoulderPosition {
  leftShoulder: { x: number; y: number };
  rightShoulder: { x: number; y: number };
  center: { x: number; y: number };
  width: number;
  angle: number;
}

export interface GarmentSuggestion {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface PoseDetectionConfig {
  modelComplexity?: 'lite' | 'full' | 'heavy';
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  isMirrored?: boolean;
}

export interface PoseDetectionResult {
  landmarks: PoseLandmark[];
  worldLandmarks?: PoseLandmark[];
  confidence: number;
}
