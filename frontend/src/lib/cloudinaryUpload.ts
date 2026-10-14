/**
 * Cloudinary Direct Upload Utility
 * Mengunggah gambar dan file 3D (.glb) langsung ke Cloudinary menggunakan Unsigned Preset
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "xj6onmch";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ar_fashion_unsigned";

export interface CloudinaryResult {
  secureUrl: string;
  publicId: string;
  bytes: number;
  format?: string;
  originalFilename?: string;
}

/**
 * Upload gambar produk (JPG, PNG, WebP) ke Cloudinary
 */
export async function uploadImageToCloudinary(
  file: File,
  folder = "products"
): Promise<CloudinaryResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Konfigurasi Cloudinary belum lengkap di .env");
  }

  // Validasi tipe file
  if (!file.type.startsWith("image/")) {
    throw new Error("File yang dipilih harus berupa gambar (JPG, PNG, WebP)");
  }

  // Maksimal 10 MB untuk gambar
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Ukuran gambar terlalu besar. Maksimal 10 MB");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Gagal mengunggah gambar (${res.status})`);
  }

  const data = await res.json();
  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
    bytes: data.bytes,
    format: data.format,
    originalFilename: data.original_filename,
  };
}

/**
 * Upload Model 3D (.glb / .gltf) ke Cloudinary (menggunakan raw upload)
 */
export async function uploadModel3DToCloudinary(
  file: File,
  folder = "models"
): Promise<CloudinaryResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Konfigurasi Cloudinary belum lengkap di .env");
  }

  const isGlb = file.name.toLowerCase().endsWith(".glb") || file.name.toLowerCase().endsWith(".gltf");
  if (!isGlb) {
    throw new Error("File model 3D harus berekstensi .glb atau .gltf");
  }

  // Maksimal 25 MB untuk model 3D
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("Ukuran model 3D terlalu besar. Maksimal 25 MB");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  // Cloudinary mengharuskan file non-image di-upload via /raw/upload
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Gagal mengunggah model 3D (${res.status})`);
  }

  const data = await res.json();
  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
    bytes: data.bytes,
    format: data.format || "glb",
    originalFilename: data.original_filename,
  };
}
