import * as THREE from "three";

export type GarmentCategory = "upper" | "lower" | "skirt" | "dress" | "overall";

export interface GarmentDimensions {
  shoulderWidth?: number;
  torsoHeight?: number;
  torsoDepth?: number;
  sleeveLength?: number;
  sleeveRadius?: number;
}

/**
 * Generate procedural 3D garment mesh based on category.
 * Menghasilkan THREE.Group berisi mesh bervolume dengan PBR material kain.
 */
export function createProceduralGarment(
  category: GarmentCategory = "upper",
  dims?: GarmentDimensions
): THREE.Group {
  const group = new THREE.Group();
  group.name = `procedural-garment-${category}`;

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  switch (category) {
    case "upper":
      buildUpperBody(group, baseMaterial, dims);
      break;
    case "lower":
      buildLowerBody(group, baseMaterial, dims);
      break;
    case "skirt":
      buildSkirt(group, baseMaterial, dims);
      break;
    case "dress":
      buildDress(group, baseMaterial, dims);
      break;
    case "overall":
      buildOverall(group, baseMaterial, dims);
      break;
    default:
      buildUpperBody(group, baseMaterial, dims);
  }

  return group;
}

/**
 * Upper Body: T-Shirt / Kemeja
 * Torso dengan volume ketebalan dada + 2 silinder lengan baju
 */
function buildUpperBody(
  group: THREE.Group,
  mat: THREE.MeshStandardMaterial,
  dims?: GarmentDimensions
) {
  const width = dims?.shoulderWidth ?? 1.4;
  const height = dims?.torsoHeight ?? 1.8;
  const depth = dims?.torsoDepth ?? 0.45;
  const sleeveLen = dims?.sleeveLength ?? 0.75;
  const sleeveRad = dims?.sleeveRadius ?? 0.22;

  // 1. Torso: Box dengan subdivisi untuk lengkungan organik bodi
  const torsoGeo = new THREE.BoxGeometry(width, height, depth, 12, 12, 4);
  applyOrganicTorsoCurvature(torsoGeo, 0.1);
  setupTorsoUV(torsoGeo);

  const torsoMesh = new THREE.Mesh(torsoGeo, mat.clone());
  torsoMesh.position.set(0, -0.1, 0);
  torsoMesh.name = "garment-torso";
  group.add(torsoMesh);

  // 2. Lengan Kiri (Left Sleeve)
  const leftSleeveGeo = new THREE.CylinderGeometry(
    sleeveRad * 1.05,
    sleeveRad * 0.95,
    sleeveLen,
    16,
    1,
    true
  );
  setupSleeveUV(leftSleeveGeo);
  const leftSleeveMesh = new THREE.Mesh(leftSleeveGeo, mat.clone());
  leftSleeveMesh.position.set(-(width * 0.55 + sleeveLen * 0.35), 0.45, 0);
  leftSleeveMesh.rotation.z = Math.PI / 4.5;
  leftSleeveMesh.name = "garment-left-sleeve";
  group.add(leftSleeveMesh);

  // 3. Lengan Kanan (Right Sleeve)
  const rightSleeveGeo = new THREE.CylinderGeometry(
    sleeveRad * 1.05,
    sleeveRad * 0.95,
    sleeveLen,
    16,
    1,
    true
  );
  setupSleeveUV(rightSleeveGeo);
  const rightSleeveMesh = new THREE.Mesh(rightSleeveGeo, mat.clone());
  rightSleeveMesh.position.set(width * 0.55 + sleeveLen * 0.35, 0.45, 0);
  rightSleeveMesh.rotation.z = -Math.PI / 4.5;
  rightSleeveMesh.name = "garment-right-sleeve";
  group.add(rightSleeveMesh);

  // 4. Kerah Leher (Neck Collar)
  const collarGeo = new THREE.TorusGeometry(0.28, 0.04, 8, 24);
  const collarMesh = new THREE.Mesh(collarGeo, mat.clone());
  collarMesh.rotation.x = Math.PI / 2;
  collarMesh.position.set(0, height * 0.45, 0);
  collarMesh.name = "garment-collar";
  group.add(collarMesh);
}

/**
 * Lower Body: Celana Panjang / Jeans
 */
function buildLowerBody(
  group: THREE.Group,
  mat: THREE.MeshStandardMaterial,
  _dims?: GarmentDimensions
) {
  // Pinggul / Waist
  const waistGeo = new THREE.CylinderGeometry(0.48, 0.52, 0.45, 20, 2, true);
  const waistMesh = new THREE.Mesh(waistGeo, mat.clone());
  waistMesh.position.set(0, 0.2, 0);
  waistMesh.name = "garment-waist";
  group.add(waistMesh);

  // Kaki Kiri
  const leftLegGeo = new THREE.CylinderGeometry(0.26, 0.21, 1.8, 16, 2, true);
  const leftLegMesh = new THREE.Mesh(leftLegGeo, mat.clone());
  leftLegMesh.position.set(-0.28, -0.85, 0);
  leftLegMesh.name = "garment-left-leg";
  group.add(leftLegMesh);

  // Kaki Kanan
  const rightLegGeo = new THREE.CylinderGeometry(0.26, 0.21, 1.8, 16, 2, true);
  const rightLegMesh = new THREE.Mesh(rightLegGeo, mat.clone());
  rightLegMesh.position.set(0.28, -0.85, 0);
  rightLegMesh.name = "garment-right-leg";
  group.add(rightLegMesh);
}

/**
 * Skirt: Rok Mengembang (Flared)
 */
function buildSkirt(
  group: THREE.Group,
  mat: THREE.MeshStandardMaterial,
  _dims?: GarmentDimensions
) {
  // Ikat Pinggang
  const bandGeo = new THREE.CylinderGeometry(0.42, 0.44, 0.15, 24);
  const bandMesh = new THREE.Mesh(bandGeo, mat.clone());
  bandMesh.position.set(0, 0.35, 0);
  bandMesh.name = "garment-skirt-band";
  group.add(bandMesh);

  // Rok Flared A-line
  const skirtGeo = new THREE.CylinderGeometry(0.44, 1.05, 1.4, 32, 4, true);
  const skirtMesh = new THREE.Mesh(skirtGeo, mat.clone());
  skirtMesh.position.set(0, -0.4, 0);
  skirtMesh.name = "garment-skirt-body";
  group.add(skirtMesh);
}

/**
 * Dress: Gaun Terusan (Upper + Skirt)
 */
function buildDress(
  group: THREE.Group,
  mat: THREE.MeshStandardMaterial,
  dims?: GarmentDimensions
) {
  const upper = new THREE.Group();
  buildUpperBody(upper, mat, { ...dims, torsoHeight: 1.3 });
  upper.position.set(0, 0.65, 0);
  group.add(upper);

  const skirt = new THREE.Group();
  buildSkirt(skirt, mat, dims);
  skirt.position.set(0, -0.2, 0);
  group.add(skirt);
}

/**
 * Overall: Jumpsuit / Baju Terusan Full Body
 */
function buildOverall(
  group: THREE.Group,
  mat: THREE.MeshStandardMaterial,
  dims?: GarmentDimensions
) {
  const upper = new THREE.Group();
  buildUpperBody(upper, mat, dims);
  upper.position.set(0, 0.5, 0);
  group.add(upper);

  const lower = new THREE.Group();
  buildLowerBody(lower, mat, dims);
  lower.position.set(0, -0.4, 0);
  group.add(lower);
}

/**
 * Memberikan kelengkungan organik pada bodi baju agar mengikuti bentuk dada manusia
 */
function applyOrganicTorsoCurvature(geo: THREE.BufferGeometry, intensity: number) {
  const pos = geo.attributes.position;
  const center = new THREE.Vector3();
  geo.computeBoundingBox();
  if (geo.boundingBox) {
    geo.boundingBox.getCenter(center);
  }

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // Bodi melengkung keluar sedikit di tengah dada (Z+ untuk dada)
    const normX = (x - center.x);
    const zPush = (1.0 - Math.min(1.0, Math.abs(normX) * 1.2)) * intensity;
    
    // Sedikit pinggang mengecil (tapering)
    const waistTaper = Math.cos(y * 1.8) * 0.05;

    pos.setX(i, x + (x > 0 ? waistTaper : -waistTaper));
    pos.setZ(i, z + zPush);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

/**
 * Menyelaraskan UV koordinat torso agar foto depan (dada) pas di tengah
 */
function setupTorsoUV(geo: THREE.BufferGeometry) {
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  if (!uv || !pos) return;

  // Planar projection dari depan (X, Y) untuk area dada depan
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    if (z > 0) {
      // Sisi depan: mapping normal 0-1
      const x = pos.getX(i);
      const y = pos.getY(i);
      uv.setXY(i, (x / 1.4) + 0.5, (y / 1.8) + 0.5);
    }
  }
  uv.needsUpdate = true;
}

/**
 * UV mapping sederhana untuk lengan baju
 */
function setupSleeveUV(geo: THREE.BufferGeometry) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  // Memastikan tekstur tidak terdistorsi di silinder lengan
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, u * 0.5 + 0.25, v * 0.5 + 0.25);
  }
  uv.needsUpdate = true;
}
