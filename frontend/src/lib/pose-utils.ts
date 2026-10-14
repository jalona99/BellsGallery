// src/lib/pose-utils.ts
import { PoseLandmark, ShoulderPosition, GarmentSuggestion } from '@/types/tryon';

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

/**
 * 35 Sambungan Relasi Kerangka Tubuh Lengkap MediaPipe BlazePose:
 * - Wajah & Kepala: 0-1, 1-2, 2-3, 3-7, 0-4, 4-5, 5-6, 6-8, 9-10
 * - Torso: 11-12, 11-23, 12-24, 23-24
 * - Lengan: 11-13, 13-15, 12-14, 14-16
 * - Tangan (Jari Kelingking, Telunjuk, Jempol):
 *   15-17, 15-19, 15-21, 17-19 (Kiri)
 *   16-18, 16-20, 16-22, 18-20 (Kanan)
 * - Kaki (Paha & Betis): 23-25, 25-27, 24-26, 26-28
 * - Telapak Kaki (Tumit & Jari Kaki):
 *   27-29, 29-31, 27-31 (Kiri)
 *   28-30, 30-32, 28-32 (Kanan)
 */
export const POSE_CONNECTIONS: [number, number][] = [
  // Wajah & Kepala
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [0, 9], [0, 10],

  // Torso & Garis Panduan Dada
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 24], [12, 23], // Garis diagonal dada (seperti pada spesifikasi CAD)

  // Lengan Atas & Bawah
  [11, 13], [13, 15],
  [12, 14], [14, 16],

  // Telapak & Jari Tangan Kiri
  [15, 17], [15, 19], [15, 21], [17, 19],

  // Telapak & Jari Tangan Kanan
  [16, 18], [16, 20], [16, 22], [18, 20],

  // Kaki Atas & Bawah
  [23, 25], [25, 27],
  [24, 26], [26, 28],

  // Telapak Kaki Kiri (Mata Kaki, Tumit, Ujung Kaki)
  [27, 29], [29, 31], [27, 31],

  // Telapak Kaki Kanan (Mata Kaki, Tumit, Ujung Kaki)
  [28, 30], [30, 32], [28, 32],
];

export function mapLandmarkToContainer(
  normalizedX: number,
  normalizedY: number,
  containerWidth: number,
  containerHeight: number,
  videoWidth: number = 1280,
  videoHeight: number = 720
): { x: number; y: number } {
  if (!videoWidth || !videoHeight || videoWidth <= 0 || videoHeight <= 0) {
    return { x: normalizedX * containerWidth, y: normalizedY * containerHeight };
  }

  // Menyelaraskan koordinat dengan scaling object-cover kamera
  const scale = Math.max(containerWidth / videoWidth, containerHeight / videoHeight);
  const displayedWidth = videoWidth * scale;
  const displayedHeight = videoHeight * scale;
  const offsetX = (containerWidth - displayedWidth) / 2;
  const offsetY = (containerHeight - displayedHeight) / 2;

  return {
    x: offsetX + normalizedX * displayedWidth,
    y: offsetY + normalizedY * displayedHeight,
  };
}

export function calculateShoulderPosition(
  landmarks: PoseLandmark[],
  containerWidth: number,
  containerHeight: number,
  videoWidth: number = 1280,
  videoHeight: number = 720
): ShoulderPosition | null {
  if (!landmarks || landmarks.length < 33) return null;

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  if ((leftShoulder?.visibility || 0) < 0.35 || (rightShoulder?.visibility || 0) < 0.35) {
    return null;
  }

  const left = mapLandmarkToContainer(
    leftShoulder.x,
    leftShoulder.y,
    containerWidth,
    containerHeight,
    videoWidth,
    videoHeight
  );

  const right = mapLandmarkToContainer(
    rightShoulder.x,
    rightShoulder.y,
    containerWidth,
    containerHeight,
    videoWidth,
    videoHeight
  );

  const center = {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  };

  const width = Math.hypot(right.x - left.x, right.y - left.y);

  // Vektor dari bahu kanan (posisi kiri layar) ke bahu kiri (posisi kanan layar)
  // Pada mode cermin selfie, titik kiri layar selalu memiliki x lebih kecil.
  const pRight = left.x > right.x ? right : left; // Sisi kiri layar
  const pLeft = left.x > right.x ? left : right;  // Sisi kanan layar
  const dx = pLeft.x - pRight.x;
  const dy = pLeft.y - pRight.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return { leftShoulder: left, rightShoulder: right, center, width, angle };
}

export function calculateGarmentPosition(
  shoulderPos: ShoulderPosition,
  baseGarmentWidth: number = 240,
  aspectRatio: number = 0.92
): GarmentSuggestion {
  // Lebar jahitan bahu kaos (~seam-to-seam) adalah ~58% (0.58) dari total lebar gambar baju
  // (berdasarkan rasio cutout produk asli 325px seam / 554px canvas).
  // Menjamin jahitan baju presisi menempel di titik #11 dan #12:
  const seamRatio = 0.58;
  const desiredWidth = shoulderPos.width / seamRatio;
  const rawScale = desiredWidth / baseGarmentWidth;

  // Rentang skala dinamis (0.4x hingga 5.5x) agar baju otomatis membesar saat dekat
  // dan mengecil saat menjauh dari kamera
  const scale = Math.max(0.4, Math.min(5.5, rawScale));

  // Hitung dimensi aktual yang dirender oleh transform.scale
  const actualWidth = baseGarmentWidth * scale;
  const actualHeight = actualWidth / (aspectRatio || 0.92);

  // Jahitan kerah/bahu kaos berada di sekitar 18% dari puncak atas gambar baju
  const collarOffsetY = actualHeight * 0.18;

  // Letakkan titik tengah bahu baju tepat di titik tengah bahu tubuh pengguna:
  // x = shoulderPos.center.x - actualWidth / 2 menjamin baju 100% tepat di tengah badan
  const x = shoulderPos.center.x - actualWidth / 2;
  const y = shoulderPos.center.y - collarOffsetY;

  return {
    x: Math.round(x),
    y: Math.round(y),
    scale: Number(scale.toFixed(3)),
    rotation: Math.max(-45, Math.min(45, shoulderPos.angle)),
  };
}

export function isConfidentPose(landmarks: PoseLandmark[]): boolean {
  if (!landmarks || landmarks.length < 33) return false;

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  // Untuk pemasangan baju (atasan/tops), kedua bahu #11 & #12 adalah kunci utama
  return Boolean(
    leftShoulder &&
    rightShoulder &&
    (leftShoulder.visibility || 0) > 0.35 &&
    (rightShoulder.visibility || 0) > 0.35
  );
}

export function getConfidenceLabel(confidence: number): 'Low' | 'Okay' | 'Good' {
  if (confidence >= 0.7) return 'Good';
  if (confidence >= 0.4) return 'Okay';
  return 'Low';
}

export interface BodyMeasurements {
  pixelsPerCm: number;
  ipd: {
    visible: boolean;
    pixels: number;
    cm: number;
    p1: { x: number; y: number };
    p2: { x: number; y: number };
  };
  shoulder: {
    visible: boolean;
    pixels: number;
    cm: number;
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    center: { x: number; y: number };
    recommendedSize: 'S' | 'M' | 'L' | 'XL';
  };
  torso: {
    visible: boolean;
    pixels: number;
    cm: number;
    top: { x: number; y: number };
    bottom: { x: number; y: number };
  };
  hip: {
    visible: boolean;
    pixels: number;
    cm: number;
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    center: { x: number; y: number };
  };
  leftArm: {
    visible: boolean;
    cm: number;
    shoulder: { x: number; y: number };
    elbow: { x: number; y: number };
    wrist: { x: number; y: number };
  };
  rightArm: {
    visible: boolean;
    cm: number;
    shoulder: { x: number; y: number };
    elbow: { x: number; y: number };
    wrist: { x: number; y: number };
  };
  leftLeg: {
    visible: boolean;
    cm: number;
    hip: { x: number; y: number };
    knee: { x: number; y: number };
    ankle: { x: number; y: number };
  };
  rightLeg: {
    visible: boolean;
    cm: number;
    hip: { x: number; y: number };
    knee: { x: number; y: number };
    ankle: { x: number; y: number };
  };
}

/**
 * Menghitung dimensi tubuh dalam satuan centimeter (cm) terkalibrasi secara real-time
 * menggunakan standar biometrik IPD manusia (6.3 cm) sesuai KEYPOINT_INTEGRATION_COMPLETE.md & SizeAdvisor.ts
 */
export function calculateBodyMeasurements(
  landmarks: PoseLandmark[],
  width: number,
  height: number,
  videoWidth: number = 1280,
  videoHeight: number = 720
): BodyMeasurements | null {
  if (!landmarks || landmarks.length < 33) return null;

  const getPt = (idx: number) => {
    const lm = landmarks[idx];
    if (!lm || (lm.visibility || 0) < 0.35) return null;
    const mapped = mapLandmarkToContainer(lm.x, lm.y, width, height, videoWidth, videoHeight);
    return { x: mapped.x, y: mapped.y, score: lm.visibility || 0 };
  };

  const leftEye = getPt(POSE_LANDMARKS.LEFT_EYE);
  const rightEye = getPt(POSE_LANDMARKS.RIGHT_EYE);
  const leftShoulder = getPt(POSE_LANDMARKS.LEFT_SHOULDER);
  const rightShoulder = getPt(POSE_LANDMARKS.RIGHT_SHOULDER);
  const leftElbow = getPt(POSE_LANDMARKS.LEFT_ELBOW);
  const rightElbow = getPt(POSE_LANDMARKS.RIGHT_ELBOW);
  const leftWrist = getPt(POSE_LANDMARKS.LEFT_WRIST);
  const rightWrist = getPt(POSE_LANDMARKS.RIGHT_WRIST);
  const leftHip = getPt(POSE_LANDMARKS.LEFT_HIP);
  const rightHip = getPt(POSE_LANDMARKS.RIGHT_HIP);
  const leftKnee = getPt(POSE_LANDMARKS.LEFT_KNEE);
  const rightKnee = getPt(POSE_LANDMARKS.RIGHT_KNEE);
  const leftAnkle = getPt(POSE_LANDMARKS.LEFT_ANKLE);
  const rightAnkle = getPt(POSE_LANDMARKS.RIGHT_ANKLE);

  // Kalibrasi piksel per cm dari IPD mata (jarak rata-rata pupil manusia: 6.3 cm)
  let pixelsPerCm = 11.2; // Fallback rata-rata asumsi rasio webcam laptop
  let ipdVisible = false;
  let ipdPixels = 0;

  if (leftEye && rightEye) {
    ipdPixels = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y);
    if (ipdPixels > 10) {
      pixelsPerCm = ipdPixels / 6.3;
      ipdVisible = true;
    }
  }

  // Pengukuran Bahu
  let shoulderVisible = false;
  let shoulderPixels = 0;
  let shoulderCm = 0;
  let recommendedSize: 'S' | 'M' | 'L' | 'XL' = 'M';
  let shoulderCenter = { x: 0, y: 0 };

  if (leftShoulder && rightShoulder) {
    shoulderVisible = true;
    shoulderPixels = Math.hypot(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y);
    shoulderCm = Math.round(shoulderPixels / pixelsPerCm);
    shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };

    if (shoulderCm < 40) recommendedSize = 'S';
    else if (shoulderCm < 44) recommendedSize = 'M';
    else if (shoulderCm < 48) recommendedSize = 'L';
    else recommendedSize = 'XL';
  }

  // Pengukuran Torso (Pusat Bahu -> Pusat Pinggul)
  let torsoVisible = false;
  let torsoPixels = 0;
  let torsoCm = 0;
  let hipCenter = { x: 0, y: 0 };

  if (shoulderVisible && leftHip && rightHip) {
    torsoVisible = true;
    hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };
    torsoPixels = Math.hypot(hipCenter.x - shoulderCenter.x, hipCenter.y - shoulderCenter.y);
    torsoCm = Math.round(torsoPixels / pixelsPerCm);
  }

  // Lengan Kiri (Bahu -> Siku -> Pergelangan)
  const leftArmVisible = Boolean(leftShoulder && leftElbow && leftWrist);
  let leftArmCm = 0;
  if (leftArmVisible && leftShoulder && leftElbow && leftWrist) {
    const d1 = Math.hypot(leftElbow.x - leftShoulder.x, leftElbow.y - leftShoulder.y);
    const d2 = Math.hypot(leftWrist.x - leftElbow.x, leftWrist.y - leftElbow.y);
    leftArmCm = Math.round((d1 + d2) / pixelsPerCm);
  }

  // Lengan Kanan (Bahu -> Siku -> Pergelangan)
  const rightArmVisible = Boolean(rightShoulder && rightElbow && rightWrist);
  let rightArmCm = 0;
  if (rightArmVisible && rightShoulder && rightElbow && rightWrist) {
    const d1 = Math.hypot(rightElbow.x - rightShoulder.x, rightElbow.y - rightShoulder.y);
    const d2 = Math.hypot(rightWrist.x - rightElbow.x, rightWrist.y - rightElbow.y);
    rightArmCm = Math.round((d1 + d2) / pixelsPerCm);
  }

  // Kaki Kiri (Pinggul -> Lutut -> Mata Kaki)
  const leftLegVisible = Boolean(leftHip && leftKnee && leftAnkle);
  let leftLegCm = 0;
  if (leftLegVisible && leftHip && leftKnee && leftAnkle) {
    const d1 = Math.hypot(leftKnee.x - leftHip.x, leftKnee.y - leftHip.y);
    const d2 = Math.hypot(leftAnkle.x - leftKnee.x, leftAnkle.y - leftKnee.y);
    leftLegCm = Math.round((d1 + d2) / pixelsPerCm);
  }

  // Kaki Kanan (Pinggul -> Lutut -> Mata Kaki)
  const rightLegVisible = Boolean(rightHip && rightKnee && rightAnkle);
  let rightLegCm = 0;
  if (rightLegVisible && rightHip && rightKnee && rightAnkle) {
    const d1 = Math.hypot(rightKnee.x - rightHip.x, rightKnee.y - rightHip.y);
    const d2 = Math.hypot(rightAnkle.x - rightKnee.x, rightAnkle.y - rightKnee.y);
    rightLegCm = Math.round((d1 + d2) / pixelsPerCm);
  }

  return {
    pixelsPerCm,
    ipd: {
      visible: ipdVisible,
      pixels: ipdPixels,
      cm: 6.3,
      p1: leftEye || { x: 0, y: 0 },
      p2: rightEye || { x: 0, y: 0 },
    },
    shoulder: {
      visible: shoulderVisible,
      pixels: shoulderPixels,
      cm: shoulderCm,
      p1: leftShoulder || { x: 0, y: 0 },
      p2: rightShoulder || { x: 0, y: 0 },
      center: shoulderCenter,
      recommendedSize,
    },
    torso: {
      visible: torsoVisible,
      pixels: torsoPixels,
      cm: torsoCm,
      top: shoulderCenter,
      bottom: hipCenter,
    },
    hip: {
      visible: Boolean(leftHip && rightHip),
      pixels: leftHip && rightHip ? Math.hypot(rightHip.x - leftHip.x, rightHip.y - leftHip.y) : 0,
      cm: leftHip && rightHip ? Math.round(Math.hypot(rightHip.x - leftHip.x, rightHip.y - leftHip.y) / pixelsPerCm) : 0,
      p1: leftHip || { x: 0, y: 0 },
      p2: rightHip || { x: 0, y: 0 },
      center: hipCenter,
    },
    leftArm: {
      visible: leftArmVisible,
      cm: leftArmCm,
      shoulder: leftShoulder || { x: 0, y: 0 },
      elbow: leftElbow || { x: 0, y: 0 },
      wrist: leftWrist || { x: 0, y: 0 },
    },
    rightArm: {
      visible: rightArmVisible,
      cm: rightArmCm,
      shoulder: rightShoulder || { x: 0, y: 0 },
      elbow: rightElbow || { x: 0, y: 0 },
      wrist: rightWrist || { x: 0, y: 0 },
    },
    leftLeg: {
      visible: leftLegVisible,
      cm: leftLegCm,
      hip: leftHip || { x: 0, y: 0 },
      knee: leftKnee || { x: 0, y: 0 },
      ankle: leftAnkle || { x: 0, y: 0 },
    },
    rightLeg: {
      visible: rightLegVisible,
      cm: rightLegCm,
      hip: rightHip || { x: 0, y: 0 },
      knee: rightKnee || { x: 0, y: 0 },
      ankle: rightAnkle || { x: 0, y: 0 },
    },
  };
}
