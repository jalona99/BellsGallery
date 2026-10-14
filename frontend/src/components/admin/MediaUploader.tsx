"use client";

import React, { useState, useRef } from "react";
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Image as ImageIcon, 
  Box, 
  Trash2, 
  Link as LinkIcon, 
  ExternalLink,
  Sparkles,
  Scissors
} from "lucide-react";
import { uploadImageToCloudinary, uploadModel3DToCloudinary } from "@/lib/cloudinaryUpload";
import { removeImageBackground } from "@/lib/autoCutout";

interface MediaUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  type: "image" | "model3d";
  required?: boolean;
  helperText?: string;
  placeholder?: string;
  enableAutoCutout?: boolean;
  cutoutValue?: string;
  onCutoutChange?: (url: string) => void;
}

export default function MediaUploader({
  label,
  value,
  onChange,
  type,
  required = false,
  helperText,
  placeholder = type === "image" ? "/products/... atau https://..." : "https://.../model.glb",
  enableAutoCutout = true,
  cutoutValue = "",
  onCutoutChange,
}: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState<"upload" | "url">("upload");
  const [autoCutoutEnabled, setAutoCutoutEnabled] = useState(true);
  const [cutoutStatus, setCutoutStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCloudinaryUrl = value.includes("cloudinary.com");
  const hasValue = Boolean(value && value.trim() !== "");
  const hasCutout = Boolean(cutoutValue && cutoutValue.trim() !== "");

  const handleFileChange = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    setCutoutStatus(null);

    try {
      if (type === "image") {
        let finalCutoutUrl = "";

        // 1. Jalankan In-Browser AI Auto-Cutout jika diaktifkan
        if (enableAutoCutout && onCutoutChange && autoCutoutEnabled) {
          try {
            setCutoutStatus("AI sedang memotong background baju...");
            const { file: cutoutFile } = await removeImageBackground(file, {
              onProgress: (pct, stage) => {
                setCutoutStatus(`${stage} (${pct}%)`);
              }
            });

            setCutoutStatus("Mengunggah versi transparan ke Cloud...");
            const cutoutUpload = await uploadImageToCloudinary(cutoutFile, "products/cutouts");
            finalCutoutUrl = cutoutUpload.secureUrl;
            onCutoutChange(finalCutoutUrl);
          } catch (cutoutErr: any) {
            console.warn("AI Cutout warning (falling back to original):", cutoutErr);
            setCutoutStatus("Catatan: Cutout AI terlewat, foto utama tetap tersimpan.");
          }
        }

        // 2. Unggah Foto Utama
        setCutoutStatus("Mengunggah foto katalog utama...");
        const result = await uploadImageToCloudinary(file, "products");
        onChange(result.secureUrl);

        // Jika cutout tidak dibuat, samakan dengan foto utama sebagai fallback
        if (onCutoutChange && !finalCutoutUrl && !hasCutout) {
          onCutoutChange(result.secureUrl);
        }
      } else {
        const result = await uploadModel3DToCloudinary(file, "models");
        onChange(result.secureUrl);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Gagal mengunggah file ke Cloudinary.");
    } finally {
      setIsUploading(false);
      setCutoutStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClear = () => {
    onChange("");
    if (onCutoutChange) onCutoutChange("");
    setUploadError(null);
    setCutoutStatus(null);
  };

  // Fungsi untuk memproses background removal secara manual dari gambar yang sudah ada
  const handleManualCutout = async () => {
    if (!value || !onCutoutChange) return;
    setIsUploading(true);
    setUploadError(null);
    setCutoutStatus("Mengunduh gambar untuk dipotong...");

    try {
      const response = await fetch(value);
      if (!response.ok) throw new Error("Gagal mengunduh gambar sumber");
      const blob = await response.blob();
      const file = new File([blob], "garment.png", { type: blob.type || "image/png" });

      setCutoutStatus("AI sedang memproses siluet pakaian...");
      const { file: cutoutFile } = await removeImageBackground(file, {
        onProgress: (pct, stage) => setCutoutStatus(`${stage} (${pct}%)`)
      });

      setCutoutStatus("Mengunggah hasil transparan...");
      const cutoutUpload = await uploadImageToCloudinary(cutoutFile, "products/cutouts");
      onCutoutChange(cutoutUpload.secureUrl);
    } catch (err: any) {
      console.error("Manual cutout error:", err);
      setUploadError(err.message || "Gagal membuat cutout transparan.");
    } finally {
      setIsUploading(false);
      setCutoutStatus(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
          {type === "image" ? (
            <ImageIcon size={14} className="text-indigo-600" />
          ) : (
            <Box size={14} className="text-purple-600" />
          )}
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </label>

        {/* Toggle mode Upload vs URL */}
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-md text-[10px]">
          <button
            type="button"
            onClick={() => setInputMode("upload")}
            className={`px-2 py-0.5 rounded font-medium transition-all ${
              inputMode === "upload"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setInputMode("url")}
            className={`px-2 py-0.5 rounded font-medium transition-all ${
              inputMode === "url"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Tulis URL
          </button>
        </div>
      </div>

      {/* Checkbox Auto-Cutout AI (Hanya untuk image) */}
      {type === "image" && enableAutoCutout && onCutoutChange && (
        <div className="flex items-center justify-between bg-indigo-50/60 border border-indigo-100 px-3 py-1.5 rounded-lg text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none text-indigo-950 font-medium">
            <input
              type="checkbox"
              checked={autoCutoutEnabled}
              onChange={(e) => setAutoCutoutEnabled(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
            />
            <span className="flex items-center gap-1 text-[11px]">
              <Sparkles size={12} className="text-indigo-600" />
              <strong>AI Auto-Cutout</strong>: Otomatis hapus background untuk AR Fitting
            </span>
          </label>
          <span className="text-[10px] text-indigo-600/80 font-bold bg-indigo-100/70 px-2 py-0.5 rounded-full">
            100% Gratis (Rp 0)
          </span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={type === "image" ? "image/png,image/jpeg,image/webp,image/avif" : ".glb,.gltf"}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileChange(e.target.files[0]);
          }
        }}
      />

      {inputMode === "upload" ? (
        <div className="space-y-2">
          {/* Preview Container */}
          {hasValue ? (
            <div className="space-y-2">
              <div className="relative border border-emerald-200 bg-emerald-50/40 rounded-xl p-3 flex items-center gap-3">
                {/* 1. Preview Foto Katalog */}
                {type === "image" ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-emerald-200 shrink-0 shadow-xs relative group">
                    <img
                      src={value}
                      alt="Preview Katalog"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/products/kaos-kuning-77.png";
                      }}
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center py-0.5 font-bold uppercase">
                      Katalog
                    </span>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Box size={24} />
                  </div>
                )}

                {/* Info Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span className="truncate">
                      {isCloudinaryUrl ? "Tersimpan di Cloudinary CDN" : "File URL Terhubung"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 truncate font-mono mt-0.5">{value}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="text-[11px] font-bold text-gray-700 hover:text-black underline cursor-pointer"
                    >
                      Ganti File
                    </button>
                    <a
                      href={value}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-gray-500 hover:text-indigo-600 flex items-center gap-0.5"
                    >
                      <ExternalLink size={10} />
                      <span>Lihat</span>
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Hapus file"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* 2. Preview Versi Cutout Transparan (Jika ada) */}
              {type === "image" && onCutoutChange && (
                <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-3 flex items-center gap-3">
                  <div 
                    className="w-16 h-16 rounded-lg overflow-hidden border border-indigo-200 shrink-0 shadow-xs relative flex items-center justify-center"
                    style={{
                      backgroundColor: "#18181b", // Gelap seperti gambar yang diunggah user
                      backgroundImage: `repeating-conic-gradient(#27272a 0% 25%, #18181b 0% 50%) 50% / 12px 12px`
                    }}
                  >
                    {hasCutout ? (
                      <img
                        src={cutoutValue}
                        alt="Preview Cutout AR"
                        className="w-full h-full object-contain p-1 drop-shadow-md"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = value;
                        }}
                      />
                    ) : (
                      <div className="text-[9px] text-gray-400 text-center px-1 font-bold">
                        Belum Ada Cutout
                      </div>
                    )}
                    <span className="absolute bottom-0 inset-x-0 bg-indigo-900/80 text-[8px] text-indigo-100 text-center py-0.5 font-bold uppercase">
                      AR Fitting
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950">
                      <Scissors size={12} className="text-indigo-600 shrink-0" />
                      <span>Siluet Transparan (Virtual Try-On)</span>
                    </div>
                    <p className="text-[10px] text-gray-500 truncate font-mono mt-0.5">
                      {hasCutout ? cutoutValue : "Menggunakan foto utama (background belum dipotong)"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {hasCutout ? (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                          ✓ Siap dicoba di kamera AR
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleManualCutout}
                          disabled={isUploading}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles size={11} /> Potong Otomatis Sekarang
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Dropzone saat belum ada file */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50/50 scale-[1.01]"
                  : "border-gray-200 hover:border-gray-400 bg-gray-50/50 hover:bg-gray-50"
              }`}
            >
              {isUploading ? (
                <div className="py-2 flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                  <span className="text-xs font-medium text-gray-700">
                    {cutoutStatus || "Mengunggah ke Cloudinary CDN..."}
                  </span>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-gray-600 mb-0.5">
                    <UploadCloud size={20} className="text-indigo-600" />
                  </div>
                  <div className="text-xs font-semibold text-gray-800">
                    Klik untuk pilih file <span className="text-gray-400 font-normal">atau seret ke sini</span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {type === "image"
                      ? "Format PNG, JPG, WebP (AI otomatis memotong background untuk AR)"
                      : "Format .glb atau .gltf (Maks. 25 MB)"}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Manual URL input fallback */
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
              <LinkIcon size={13} />
            </div>
            <input
              type="text"
              required={required && !hasValue}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-black outline-none"
            />
          </div>

          {/* URL Cutout Input */}
          {type === "image" && onCutoutChange && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-indigo-500">
                <Scissors size={13} />
              </div>
              <input
                type="text"
                placeholder="URL Versi Cutout Transparan (Opsional / untuk AR Fitting)"
                value={cutoutValue}
                onChange={(e) => onCutoutChange(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-indigo-200 bg-indigo-50/20 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>
          )}
        </div>
      )}

      {/* Upload Error Alert */}
      {uploadError && (
        <div className="flex items-center gap-1 text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
          <AlertCircle size={13} className="shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Helper text */}
      {helperText && <p className="text-[10px] text-gray-400 mt-0.5">{helperText}</p>}
    </div>
  );
}
