/**
 * Pipeline Size Advisor:
 * 1. Menghitung Inter-pupillary distance (IPD) dalam piksel dari koordinat mata.
 * 2. Menggunakan konstanta biologis IPD manusia rata-rata (6.3 cm) untuk mendapatkan pixels_per_cm.
 * 3. Menghitung lebar bahu dalam piksel, lalu dikonversi ke cm.
 * 4. Memetakan hasil cm ke ukuran standar (S, M, L, XL).
 */
export function recommendSize(
  pose: any
): { size: 'S' | 'M' | 'L' | 'XL' | null; cm: number } {
  if (!pose || !pose.keypoints) return { size: null, cm: 0 };

  const findKP = (name: string) => pose.keypoints.find((k: any) => k.name === name);
  const leftEye = findKP("left_eye");
  const rightEye = findKP("right_eye");
  const leftShoulder = findKP("left_shoulder");
  const rightShoulder = findKP("right_shoulder");

  if (leftShoulder?.score > 0.4 && rightShoulder?.score > 0.4) {
    let pixelsPerCm = 11.2; // Fallback rata-rata asumsi jarak kamera HP ke badan

    // Jika mata terlihat, gunakan IPD (lebih akurat)
    if (leftEye?.score > 0.5 && rightEye?.score > 0.5) {
      const ipdPixels = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y);
      if (ipdPixels > 0) {
        pixelsPerCm = ipdPixels / 6.3;
      }
    }

    const shoulderPixels = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y);
    const shoulderCm = shoulderPixels / pixelsPerCm;

    let size: 'S' | 'M' | 'L' | 'XL' = 'M';
    if (shoulderCm < 40) size = 'S';
    else if (shoulderCm < 44) size = 'M';
    else if (shoulderCm < 48) size = 'L';
    else size = 'XL';

    return { size, cm: Math.round(shoulderCm) };
  }

  return { size: null, cm: 0 };
}
