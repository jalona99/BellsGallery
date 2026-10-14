import * as THREE from "three";

/**
 * TextureSwapper: Mengelola pemuatan tekstur gambar produk 2D (Cloudinary/Lokal)
 * dan memetakan tekstur ke permukaan mesh 3D secara modular & efisien.
 */
export class TextureSwapper {
  private static loader = new THREE.TextureLoader();

  /**
   * Menerapkan URL gambar sebagai tekstur ke semua mesh dalam objek 3D.
   * Mendukung CORS anonymous untuk CDN Cloudinary / Cloudflare R2.
   */
  static applyTexture(
    object: THREE.Object3D,
    imageUrl: string,
    onComplete?: () => void
  ): void {
    if (!imageUrl) return;

    this.loader.setCrossOrigin("anonymous");
    this.loader.load(
      imageUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;

        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const oldMat = child.material;
            let newMat: THREE.MeshStandardMaterial;

            if (Array.isArray(oldMat)) {
              newMat = (oldMat[0] as THREE.MeshStandardMaterial).clone();
            } else if (oldMat instanceof THREE.MeshStandardMaterial) {
              newMat = oldMat.clone();
            } else {
              newMat = new THREE.MeshStandardMaterial({
                roughness: 0.85,
                metalness: 0.0,
                side: THREE.DoubleSide,
              });
            }

            if (newMat.map) {
              newMat.map.dispose();
            }

            newMat.map = texture;
            newMat.transparent = true;
            newMat.alphaTest = 0.05; // Memotong pinggiran transparan dengan rapi
            newMat.side = THREE.DoubleSide;
            newMat.roughness = 0.85;
            newMat.metalness = 0.0;
            newMat.needsUpdate = true;

            child.material = newMat;
          }
        });

        onComplete?.();
      },
      undefined,
      (err) => {
        console.error("[TextureSwapper] Gagal memuat tekstur:", imageUrl, err);
      }
    );
  }

  /**
   * Membersihkan geometri dan tekstur dari GPU (VRAM) saat komponen ditutup.
   */
  static disposeGroup(group: THREE.Group | THREE.Object3D): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m) {
            if (m.map) m.map.dispose();
            m.dispose();
          }
        });
      }
    });
  }
}

/**
 * Backward compatibility wrapper untuk kode yang memanggil applyProductTexture langsung.
 */
export function applyProductTexture(scene: THREE.Group | THREE.Object3D, imageUrl: string): void {
  TextureSwapper.applyTexture(scene, imageUrl);
}
