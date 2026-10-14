"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Decal } from "@react-three/drei";
import * as THREE from "three";
import { OneEuroFilter } from "@/lib/OneEuroFilter";

interface Garment3DProps {
  poseData: { pose: any; timestamp: number } | null;
  imageUrl?: string;
  category?: string;
  model3dUrl?: string | null;
}

/**
 * Komponen Model Baju 3D Asli (.glb)
 * Menggunakan model T-shirt mesh 3D fotorealistik lengkap dengan lekukan kain,
 * kerah, dan lengan, serta mengaplikasikan warna kain & logo sablon dada.
 */
function RealShirtModel({ logoUrl }: { logoUrl?: string }) {
  const { nodes, materials } = useGLTF("/models/shirt.glb") as any;
  const [logoTex, setLogoTex] = useState<THREE.Texture | null>(null);

  // Muat tekstur logo transparan
  useEffect(() => {
    let currentTex: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    const targetUrl = logoUrl || "/products/logo-77-transparent.png";
    loader.load(targetUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      currentTex = tex;
      setLogoTex(tex);
    });

    return () => {
      if (currentTex) {
        (currentTex as THREE.Texture).dispose();
      }
    };
  }, [logoUrl]);

  // Material kain PBR warna kuning emas (sesuai foto kaos 77)
  const shirtMaterial = useMemo(() => {
    const baseMat = (materials?.lambert1 as THREE.MeshStandardMaterial) || new THREE.MeshStandardMaterial();
    const mat = baseMat.clone();
    mat.color = new THREE.Color("#faad23"); // Kuning cerah khas kaos 77
    mat.roughness = 0.82;
    mat.metalness = 0.05;
    mat.side = THREE.DoubleSide;
    return mat;
  }, [materials]);

  useEffect(() => {
    return () => {
      if (shirtMaterial) shirtMaterial.dispose();
    };
  }, [shirtMaterial]);

  return (
    <mesh
      geometry={nodes?.T_Shirt_male?.geometry}
      material={shirtMaterial}
      dispose={null}
    >
      {logoTex && (
        <Decal
          position={[0, 0.04, 0.145]}
          rotation={[0, 0, 0]}
          scale={[0.18, 0.18, 0.18]}
          map={logoTex}
        />
      )}
    </mesh>
  );
}

// Preload model agar instan saat VFR dibuka
useGLTF.preload("/models/shirt.glb");

/**
 * Komponen Utama Garment3D:
 * Melacak 33 titik MediaPipe, menyaring jitter dengan OneEuroFilter,
 * dan memposisikan model 3D baju secara proporsional di badan pengguna.
 */
export default function Garment3D({ poseData }: Garment3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetScale = useMemo(() => new THREE.Vector3(), []);
  const currentRot = useMemo(() => new THREE.Euler(), []);

  // Filter OneEuro untuk stabilisasi koordinat bahu dan pinggul
  const filters = useMemo(() => {
    const createFilter = () => new OneEuroFilter(30, 1.2, 0.008, 1.0);
    return {
      ls: { x: createFilter(), y: createFilter(), z: createFilter() },
      rs: { x: createFilter(), y: createFilter(), z: createFilter() },
      lh: { x: createFilter(), y: createFilter(), z: createFilter() },
      rh: { x: createFilter(), y: createFilter(), z: createFilter() },
    };
  }, []);

  useFrame(() => {
    if (!groupRef.current || !poseData || !poseData.pose || !poseData.pose.keypoints) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }

    const { pose, timestamp } = poseData;
    const findKP = (name: string) => pose.keypoints.find((k: any) => k.name === name);

    const rawLs = findKP("left_shoulder");
    const rawRs = findKP("right_shoulder");
    const rawLh = findKP("left_hip");
    const rawRh = findKP("right_hip");

    if (rawLs?.score > 0.35 && rawRs?.score > 0.35) {
      // 1. Koordinat terfilter (OneEuroFilter)
      const ls = {
        x: filters.ls.x.filter(rawLs.x, timestamp),
        y: filters.ls.y.filter(rawLs.y, timestamp),
        z: filters.ls.z.filter(rawLs.z || 0, timestamp),
      };
      const rs = {
        x: filters.rs.x.filter(rawRs.x, timestamp),
        y: filters.rs.y.filter(rawRs.y, timestamp),
        z: filters.rs.z.filter(rawRs.z || 0, timestamp),
      };

      let lh = ls;
      let rh = rs;
      if (rawLh?.score > 0.35 && rawRh?.score > 0.35) {
        lh = {
          x: filters.lh.x.filter(rawLh.x, timestamp),
          y: filters.lh.y.filter(rawLh.y, timestamp),
          z: filters.lh.z.filter(rawLh.z || 0, timestamp),
        };
        rh = {
          x: filters.rh.x.filter(rawRh.x, timestamp),
          y: filters.rh.y.filter(rawRh.y, timestamp),
          z: filters.rh.z.filter(rawRh.z || 0, timestamp),
        };
      }

      // 2. Hitung pusat bahu dan pinggul
      const shoulderCenterX = (ls.x + rs.x) / 2;
      const shoulderCenterY = (ls.y + rs.y) / 2;
      const shoulderCenterZ = (ls.z + rs.z) / 2;

      const hipCenterY = (lh.y + rh.y) / 2;
      const hipCenterZ = (lh.z + rh.z) / 2;

      const shoulderWidth = Math.hypot(ls.x - rs.x, ls.y - rs.y);

      // Titik dada (kira-kira 30% dari bahu menuju pinggul)
      const chestY = shoulderCenterY + Math.max(20, (hipCenterY - shoulderCenterY) * 0.28);
      const chestZ = (shoulderCenterZ * 2 + hipCenterZ) / 3;

      // 3. Pemetaan Posisi (640x480 Kamera -> Three.js Viewport pada Z=0)
      // Viewport Three.js pada Z=0 dengan FOV 45 & camera Z=10 adalah width: 11.04, height: 8.28
      const mappedX = (shoulderCenterX / 640) * 11.04 - 5.52;
      const mappedY = -((chestY / 480) * 8.28 - 4.14);
      const mappedZ = (chestZ / 640) * 5.0 + 0.12; // Z-bias ke depan agar kain di depan bodi

      targetPos.set(mappedX, mappedY, mappedZ);
      groupRef.current.position.copy(targetPos);

      // 4. Pemetaan Skala
      // Model shirt.glb memiliki lebar bahu alami 0.55 unit
      // Lebar bahu di viewport adalah (shoulderWidth / 640) * 11.04
      const targetWidthInScene = (shoulderWidth / 640) * 11.04;
      const scale = (targetWidthInScene / 0.55) * 1.05; // Sedikit kelonggaran baju (oversize fit)
      targetScale.set(scale, scale, scale);
      groupRef.current.scale.copy(targetScale);

      // 5. Pemetaan Rotasi (Roll, Pitch, Yaw)
      // dx harus leftShoulder - rightShoulder (positif ~240px saat berdiri tegak)
      // Ini menyelesaikan bug rotasi terbalik 180 derajat
      const dx = ls.x - rs.x;
      const dy = ls.y - rs.y;
      const roll = Math.atan2(dy, dx);

      const torsoHeight = Math.max(50, Math.abs(hipCenterY - shoulderCenterY));
      const pitch = Math.atan2(shoulderCenterZ - hipCenterZ, torsoHeight);
      const yaw = Math.asin(Math.max(-1, Math.min(1, (rs.z - ls.z) / (shoulderWidth || 1)))) || 0;

      // Rotasi yang stabil dan alami
      currentRot.set(pitch * 0.5, yaw * 0.6, -roll);
      groupRef.current.rotation.copy(currentRot);
      groupRef.current.visible = true;
    } else {
      groupRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef} visible={false} renderOrder={1}>
      <React.Suspense fallback={null}>
        <RealShirtModel logoUrl="/products/logo-77-transparent.png" />
      </React.Suspense>
    </group>
  );
}
