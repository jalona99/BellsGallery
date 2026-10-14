/**
 * Utilitas Otomatisasi Cutout (Background Removal) Berbasis In-Browser WebAssembly/AI
 * Menggunakan @imgly/background-removal langsung di browser client (tanpa biaya API/kredit).
 */

export interface AutoCutoutOptions {
  onProgress?: (progress: number, stage: string) => void;
}

/**
 * Memotong background dari sebuah File atau URL gambar secara otomatis
 * Menghasilkan Blob PNG transparan
 */
export async function removeImageBackground(
  imageSource: File | Blob | string,
  options: AutoCutoutOptions = {}
): Promise<{ blob: Blob; file: File; objectUrl: string }> {
  const { removeBackground } = await import('@imgly/background-removal');

  const blob = await removeBackground(imageSource, {
    progress: (key: string, current: number, total: number) => {
      if (options.onProgress && total > 0) {
        const pct = Math.round((current / total) * 100);
        let stageName = "Mengunduh model AI...";
        if (key.includes("fetch")) stageName = "Mengunduh modul segmentasi...";
        else if (key.includes("compute")) stageName = "Memproses siluet pakaian...";
        options.onProgress(pct, stageName);
      }
    },
    output: {
      format: 'image/png',
      quality: 0.95
    }
  });

  const fileName = (imageSource instanceof File) 
    ? `${imageSource.name.replace(/\.[^/.]+$/, '')}-cutout.png` 
    : 'garment-cutout.png';

  const file = new File([blob], fileName, { type: 'image/png' });
  const objectUrl = URL.createObjectURL(blob);

  return { blob, file, objectUrl };
}
