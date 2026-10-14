import * as THREE from "three";

export interface UniversalBones {
  hips: THREE.Bone;
  spine: THREE.Bone;
  chest: THREE.Bone;
  neck?: THREE.Bone;
  leftShoulder?: THREE.Bone;
  leftArm: THREE.Bone;
  leftForeArm?: THREE.Bone;
  rightShoulder?: THREE.Bone;
  rightArm: THREE.Bone;
  rightForeArm?: THREE.Bone;
}

export interface UniversalGarmentResult {
  mesh: THREE.SkinnedMesh;
  skeleton: THREE.Skeleton;
  bones: UniversalBones;
  category: "tshirt" | "sweater" | "hoodie" | "custom";
}

// ─── HELPER TEKSTUR & MATERIAL PBR ───
const textureLoader = new THREE.TextureLoader();

function createGarmentMaterial(
  category: "tshirt" | "sweater" | "hoodie" | "custom",
  textureUrl?: string,
  normalMapUrl?: string
) {
  let texture: THREE.Texture | null = null;
  if (textureUrl) {
    texture = textureLoader.load(textureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
  }

  let normalMap: THREE.Texture | null = null;
  if (normalMapUrl) {
    normalMap = textureLoader.load(normalMapUrl);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    const repeat = category === "sweater" ? 5 : category === "hoodie" ? 4 : 3;
    normalMap.repeat.set(repeat, repeat);
  }

  // Parameter PBR disesuaikan dengan jenis bahan kain
  if (category === "sweater") {
    return new THREE.MeshPhysicalMaterial({
      map: texture,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(1.6, 1.6),
      roughness: 0.85,
      metalness: 0.01,
      sheen: 0.95,
      sheenRoughness: 0.45,
      sheenColor: new THREE.Color("#4ade80"),
      side: THREE.DoubleSide,
    });
  } else if (category === "hoodie") {
    return new THREE.MeshPhysicalMaterial({
      map: texture,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughness: 0.88,
      metalness: 0.02,
      sheen: 0.80,
      sheenRoughness: 0.50,
      sheenColor: new THREE.Color("#f1f5f9"),
      side: THREE.DoubleSide,
    });
  } else {
    // Kaos Katun (T-Shirt)
    return new THREE.MeshPhysicalMaterial({
      map: texture,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughness: 0.70,
      metalness: 0.01,
      clearcoat: 0.05,
      clearcoatRoughness: 0.20,
      sheen: 0.65,
      sheenRoughness: 0.35,
      sheenColor: new THREE.Color("#ffecb3"),
      side: THREE.DoubleSide,
    });
  }
}

// ─── 1. TEMPLATE MASTER: KAOS (T-SHIRT) ───
export function buildRiggedTShirt(
  sourceGeometry: THREE.BufferGeometry,
  textureUrl: string = "/products/shirt-77-texture.png",
  normalMapUrl: string = "/products/shirt-cotton-normal.png"
): UniversalGarmentResult {
  const geo = sourceGeometry.clone();
  geo.computeVertexNormals();
  const pos = geo.attributes.position;

  const skinIndices: number[] = [];
  const skinWeights: number[] = [];

  // Bone Setup terkalibrasi ke Shoulder Line Y=+0.20, Span X=0.44
  // 0: Hips (y = -0.35)
  // 1: Spine (world y = -0.13)
  // 2: Chest (world y = +0.10)
  // 3: LeftArm (world x = -0.16, y = +0.14)
  // 4: RightArm (world x = +0.16, y = +0.14)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    if (x < -0.14 && y > -0.12) {
      const w = Math.min(1.0, Math.max(0, (-x - 0.14) / 0.04));
      skinIndices.push(2, 3, 0, 0);
      skinWeights.push(1 - w, w, 0, 0);
    } else if (x > 0.14 && y > -0.12) {
      const w = Math.min(1.0, Math.max(0, (x - 0.14) / 0.04));
      skinIndices.push(2, 4, 0, 0);
      skinWeights.push(1 - w, w, 0, 0);
    } else if (y < -0.13) {
      const t = Math.min(1.0, Math.max(0, (y + 0.35) / 0.22));
      skinIndices.push(0, 1, 0, 0);
      skinWeights.push(1 - t, t, 0, 0);
    } else if (y <= 0.10) {
      const t = Math.min(1.0, Math.max(0, (y + 0.13) / 0.23));
      skinIndices.push(1, 2, 0, 0);
      skinWeights.push(1 - t, t, 0, 0);
    } else {
      skinIndices.push(2, 0, 0, 0);
      skinWeights.push(1.0, 0, 0, 0);
    }
  }

  geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));

  const hips = new THREE.Bone();
  hips.name = "Hips";
  hips.position.set(0, -0.35, 0);

  const spine = new THREE.Bone();
  spine.name = "Spine";
  spine.position.set(0, 0.22, 0);
  hips.add(spine);

  const chest = new THREE.Bone();
  chest.name = "Chest";
  chest.position.set(0, 0.23, 0);
  spine.add(chest);

  const leftArm = new THREE.Bone();
  leftArm.name = "LeftArm";
  leftArm.position.set(-0.16, 0.04, 0);
  chest.add(leftArm);

  const rightArm = new THREE.Bone();
  rightArm.name = "RightArm";
  rightArm.position.set(0.16, 0.04, 0);
  chest.add(rightArm);

  hips.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton([hips, spine, chest, leftArm, rightArm]);

  const mat = createGarmentMaterial("tshirt", textureUrl, normalMapUrl);
  const skinnedMesh = new THREE.SkinnedMesh(geo, mat);
  skinnedMesh.add(hips);
  skinnedMesh.bind(skeleton);
  skinnedMesh.castShadow = true;
  skinnedMesh.receiveShadow = true;
  skinnedMesh.renderOrder = 1;

  return {
    mesh: skinnedMesh,
    skeleton,
    bones: { hips, spine, chest, leftArm, rightArm },
    category: "tshirt",
  };
}

// ─── 2. TEMPLATE MASTER: SWEATER RAJUT LENGAN PANJANG PENUH (360°) ───
export function buildSkinnedSweater(
  textureUrl: string = "/products/sweater-tiktok-texture.png",
  normalMapUrl: string = "/products/sweater-knit-normal.png"
): UniversalGarmentResult {
  // Hierarki 10 Tulang Humanoid Terkalibrasi (Shoulder Line Y=+0.20, Span X=0.44)
  const root = new THREE.Bone();
  root.name = "Hips";
  root.position.set(0, -0.35, 0);

  const spine = new THREE.Bone();
  spine.name = "Spine";
  spine.position.set(0, 0.20, 0); // World: (0, -0.15, 0)
  root.add(spine);

  const chest = new THREE.Bone();
  chest.name = "Chest";
  chest.position.set(0, 0.23, 0); // World: (0, +0.08, 0)
  spine.add(chest);

  const neck = new THREE.Bone();
  neck.name = "Neck";
  neck.position.set(0, 0.14, 0); // World: (0, +0.22, 0)
  chest.add(neck);

  const leftShoulder = new THREE.Bone();
  leftShoulder.name = "LeftShoulder";
  leftShoulder.position.set(-0.14, 0.12, 0); // World: (-0.14, +0.20, 0)
  chest.add(leftShoulder);

  const leftArm = new THREE.Bone();
  leftArm.name = "LeftArm";
  leftArm.position.set(-0.08, 0.0, 0); // World: (-0.22, +0.20, 0)
  leftShoulder.add(leftArm);

  const leftForeArm = new THREE.Bone();
  leftForeArm.name = "LeftForeArm";
  leftForeArm.position.set(-0.14, -0.16, 0); // World: (-0.36, +0.04, 0)
  leftArm.add(leftForeArm);

  const rightShoulder = new THREE.Bone();
  rightShoulder.name = "RightShoulder";
  rightShoulder.position.set(0.14, 0.12, 0); // World: (+0.14, +0.20, 0)
  chest.add(rightShoulder);

  const rightArm = new THREE.Bone();
  rightArm.name = "RightArm";
  rightArm.position.set(0.08, 0.0, 0); // World: (+0.22, +0.20, 0)
  rightShoulder.add(rightArm);

  const rightForeArm = new THREE.Bone();
  rightForeArm.name = "RightForeArm";
  rightForeArm.position.set(0.14, -0.16, 0); // World: (+0.36, +0.04, 0)
  rightArm.add(rightForeArm);

  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton([
    root, spine, chest, neck,
    leftShoulder, leftArm, leftForeArm,
    rightShoulder, rightArm, rightForeArm,
  ]);

  // Geometri 360 Torso & Lengan Panjang Penuh
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];

  let vertOffset = 0;
  const torsoRings = 22;
  const torsoSlices = 32;

  // Torso
  for (let r = 0; r <= torsoRings; r++) {
    const t = r / torsoRings;
    const y = -0.35 + t * 0.58; // dari keliman bawah (-0.35) ke kerah (+0.23)

    const waistFactor = 1.0 - 0.14 * Math.sin(t * Math.PI);
    const radiusX = 0.22 * waistFactor;
    const radiusZ = 0.12 * waistFactor;
    const chestBulge = t > 0.35 && t < 0.85 ? 0.035 * Math.sin(((t - 0.35) / 0.5) * Math.PI) : 0;

    for (let s = 0; s <= torsoSlices; s++) {
      const u = s / torsoSlices;
      const angle = (u - 0.5) * Math.PI * 2;
      const isFront = Math.cos(angle) > 0;
      const x = Math.sin(angle) * radiusX;
      const z = Math.cos(angle) * radiusZ + (isFront ? chestBulge : -0.01);

      positions.push(x, y, z);
      uvs.push(u, t);

      if (t < 0.35) {
        const w = t / 0.35;
        skinIndices.push(0, 1, 0, 0); // Hips & Spine
        skinWeights.push(1 - w, w, 0, 0);
      } else if (t < 0.8) {
        const w = (t - 0.35) / 0.45;
        skinIndices.push(1, 2, 0, 0); // Spine & Chest
        skinWeights.push(1 - w, w, 0, 0);
      } else {
        const w = (t - 0.8) / 0.2;
        skinIndices.push(2, 3, 0, 0); // Chest & Neck
        skinWeights.push(1 - w, w, 0, 0);
      }
    }
  }

  for (let r = 0; r < torsoRings; r++) {
    for (let s = 0; s < torsoSlices; s++) {
      const a = r * (torsoSlices + 1) + s;
      const b = (r + 1) * (torsoSlices + 1) + s;
      const c = (r + 1) * (torsoSlices + 1) + (s + 1);
      const d = r * (torsoSlices + 1) + (s + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  vertOffset = (torsoRings + 1) * (torsoSlices + 1);

  // Helper Limb Lengan Panjang Penuh (Bahu -> Siku -> Pergelangan Tangan)
  const buildLimb = (
    points: THREE.Vector3[],
    radius: number,
    boneShoulder: number,
    boneArm: number,
    boneForeArm: number
  ) => {
    const rings = points.length - 1;
    const slices = 20;
    const limbStart = vertOffset;

    for (let r = 0; r <= rings; r++) {
      const p = points[r];
      const t = r / rings;
      const currentRadius = radius * (1.1 - t * 0.30);

      for (let s = 0; s <= slices; s++) {
        const angle = (s / slices) * Math.PI * 2;
        const x = p.x + Math.sin(angle) * currentRadius * 0.95;
        const y = p.y + Math.cos(angle) * currentRadius;
        const z = p.z + Math.cos(angle) * currentRadius * 0.95;

        positions.push(x, y, z);
        uvs.push(0.05 + (s / slices) * 0.2, t);

        if (t < 0.25) {
          const w = t / 0.25;
          skinIndices.push(boneShoulder, boneArm, 0, 0);
          skinWeights.push(1 - w, w, 0, 0);
        } else if (t < 0.65) {
          const w = (t - 0.25) / 0.4;
          skinIndices.push(boneArm, boneForeArm, 0, 0);
          skinWeights.push(1 - w, w, 0, 0);
        } else {
          skinIndices.push(boneForeArm, 0, 0, 0);
          skinWeights.push(1.0, 0, 0, 0);
        }
      }
    }

    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < slices; s++) {
        const a = limbStart + r * (slices + 1) + s;
        const b = limbStart + (r + 1) * (slices + 1) + s;
        const c = limbStart + (r + 1) * (slices + 1) + (s + 1);
        const d = limbStart + r * (slices + 1) + (s + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    vertOffset = limbStart + (rings + 1) * (slices + 1);
  };

  // Lengan Kiri (Left Arm) - Membentang sampai pergelangan tangan
  const leftArmPoints = [
    new THREE.Vector3(-0.22, 0.20, 0.0),  // Pangkal bahu
    new THREE.Vector3(-0.29, 0.13, 0.0),
    new THREE.Vector3(-0.36, 0.04, 0.0),  // Siku kiri
    new THREE.Vector3(-0.43, -0.07, 0.0),
    new THREE.Vector3(-0.50, -0.20, 0.0), // Pergelangan tangan kiri
  ];
  buildLimb(leftArmPoints, 0.08, 4, 5, 6);

  // Lengan Kanan (Right Arm) - Membentang sampai pergelangan tangan
  const rightArmPoints = [
    new THREE.Vector3(0.22, 0.20, 0.0),   // Pangkal bahu
    new THREE.Vector3(0.29, 0.13, 0.0),
    new THREE.Vector3(0.36, 0.04, 0.0),   // Siku kanan
    new THREE.Vector3(0.43, -0.07, 0.0),
    new THREE.Vector3(0.50, -0.20, 0.0),  // Pergelangan tangan kanan
  ];
  buildLimb(rightArmPoints, 0.08, 7, 8, 9);

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = createGarmentMaterial("sweater", textureUrl, normalMapUrl);
  const skinnedMesh = new THREE.SkinnedMesh(geo, mat);
  skinnedMesh.add(root);
  skinnedMesh.bind(skeleton);
  skinnedMesh.castShadow = true;
  skinnedMesh.receiveShadow = true;
  skinnedMesh.renderOrder = 1;

  return {
    mesh: skinnedMesh,
    skeleton,
    bones: {
      hips: root,
      spine,
      chest,
      neck,
      leftShoulder,
      leftArm,
      leftForeArm,
      rightShoulder,
      rightArm,
      rightForeArm,
    },
    category: "sweater",
  };
}

// ─── 3. TEMPLATE MASTER: HOODIE STREETWEAR (LENGAN PANJANG + TUDUNG KEPALA) ───
export function buildSkinnedHoodie(
  textureUrl: string = "/products/sweater-tiktok-texture.png",
  normalMapUrl: string = "/products/shirt-cotton-normal.png"
): UniversalGarmentResult {
  // Ambil basis dari sweater (torso + long sleeves)
  const sweaterResult = buildSkinnedSweater(textureUrl, normalMapUrl);
  const { mesh, skeleton, bones } = sweaterResult;

  // Tambahkan Tudung Kepala 3D (Hood) di pangkal kerah belakang
  const hoodGeo = new THREE.SphereGeometry(0.16, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.7);
  hoodGeo.rotateX(Math.PI * 0.15);
  hoodGeo.scale(0.9, 1.15, 1.1);

  const hoodMat = createGarmentMaterial("hoodie", textureUrl, normalMapUrl);
  const hoodMesh = new THREE.Mesh(hoodGeo, hoodMat);
  hoodMesh.position.set(0, 0.10, -0.08); // Bertengger di belakang leher
  hoodMesh.castShadow = true;

  // Tambahkan Saku Depan Kanguru (Kangaroo Pocket)
  const pocketGeo = new THREE.PlaneGeometry(0.20, 0.12, 8, 4);
  const pocketMat = hoodMat.clone();
  const pocketMesh = new THREE.Mesh(pocketGeo, pocketMat);
  pocketMesh.position.set(0, -0.16, 0.128); // Di depan perut
  pocketMesh.rotation.y = 0;

  // Kaitkan tudung dan saku ke tulang Chest agar bergerak selaras dengan dada
  bones.chest.add(hoodMesh);
  bones.spine.add(pocketMesh);

  return {
    mesh,
    skeleton,
    bones,
    category: "hoodie",
  };
}

// ─── 4. UNIVERSAL GARMENT FACTORY ───
export function buildUniversalGarment(
  category: "tshirt" | "sweater" | "hoodie" | "custom",
  sourceGeometry?: THREE.BufferGeometry,
  textureUrl?: string,
  normalMapUrl?: string
): UniversalGarmentResult {
  if (category === "hoodie") {
    return buildSkinnedHoodie(textureUrl, normalMapUrl);
  }
  if (category === "sweater") {
    return buildSkinnedSweater(textureUrl, normalMapUrl);
  }
  // Default: T-Shirt
  if (sourceGeometry) {
    return buildRiggedTShirt(sourceGeometry, textureUrl, normalMapUrl);
  }
  // Fallback jika tidak ada source geometry
  return buildSkinnedSweater(textureUrl, normalMapUrl);
}

// Backwards compatibility alias
export const buildRiggedShirtFromGeometry = buildRiggedTShirt;
export const buildSkinnedGarment = buildSkinnedSweater;
export type RiggedShirtResult = UniversalGarmentResult;
export type SkinnedGarmentResult = UniversalGarmentResult;
