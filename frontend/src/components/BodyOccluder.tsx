"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface BodyOccluderProps {
  poseData: { pose: any; timestamp: number } | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

/**
 * KOMPONEN BODY OCCLUDER (Invisible Digital Mannequin):
 * Menghasilkan siluet 3D leher, kepala, dan lengan tak kasat mata (colorWrite: false, depthWrite: true).
 * 
 * EFEK AJAIB:
 * 1. Leher pengguna di video webcam otomatis masuk MENEMBUS lubang kerah baju 3D.
 *    Kerah depan tetap jatuh di dada, tetapi kerah belakang TERPOTONG oleh leher occluder di Z-buffer.
 * 2. Lengan dan tangan pengguna yang diangkat ke depan dada otomatis berada DI DEPAN kain baju,
 *    bukan tertelan oleh baju 3D!
 */
export default function BodyOccluder({ poseData, videoRef }: BodyOccluderProps) {
  const neckRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const lUpperRef = useRef<THREE.Mesh>(null);
  const lLowerRef = useRef<THREE.Mesh>(null);
  const rUpperRef = useRef<THREE.Mesh>(null);
  const rLowerRef = useRef<THREE.Mesh>(null);

  // Material khusus occlusion: Transparan murni (tanpa warna), tetapi menulis ke Depth Buffer
  const occlusionMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      colorWrite: false, // Jangan gambar warna ke layar
      depthWrite: true,  // Tulis ke depth buffer untuk menutupi geometri di belakangnya
      side: THREE.FrontSide,
    });
  }, []);

  // Geometri terkalibrasi anatomi tubuh
  const neckGeo = useMemo(() => new THREE.CylinderGeometry(0.09, 0.11, 0.35, 24), []);
  const headGeo = useMemo(() => new THREE.SphereGeometry(0.14, 24, 16), []);
  const upperArmGeo = useMemo(() => new THREE.CylinderGeometry(0.08, 0.07, 1, 16), []);
  const lowerArmGeo = useMemo(() => new THREE.CylinderGeometry(0.07, 0.06, 1, 16), []);

  useFrame(() => {
    if (!poseData?.pose?.keypoints) {
      if (neckRef.current) neckRef.current.visible = false;
      if (headRef.current) headRef.current.visible = false;
      if (lUpperRef.current) lUpperRef.current.visible = false;
      if (lLowerRef.current) lLowerRef.current.visible = false;
      if (rUpperRef.current) rUpperRef.current.visible = false;
      if (rLowerRef.current) rLowerRef.current.visible = false;
      return;
    }

    const { keypoints } = poseData.pose;
    const findKP = (name: string) => keypoints.find((k: any) => k.name === name);

    const ls = findKP("left_shoulder");
    const rs = findKP("right_shoulder");
    const nose = findKP("nose");
    const le = findKP("left_elbow");
    const lw = findKP("left_wrist");
    const re = findKP("right_elbow");
    const rw = findKP("right_wrist");

    if (!ls || !rs || (ls.score ?? 0) < 0.20 || (rs.score ?? 0) < 0.20) {
      if (neckRef.current) neckRef.current.visible = false;
      return;
    }

    // Hitung proyeksi koordinat 9:16 yang presisi
    const vw = videoRef.current?.videoWidth || 640;
    const vh = videoRef.current?.videoHeight || 480;
    const containerAspect = 9 / 16;
    const videoAspect = vw / vh;

    let visibleWidth = vw;
    let cropLeft = 0;
    let visibleHeight = vh;
    let cropTop = 0;

    if (videoAspect > containerAspect) {
      visibleWidth = vh * containerAspect;
      cropLeft = (vw - visibleWidth) / 2;
    } else {
      visibleHeight = vw / containerAspect;
      cropTop = (vh - visibleHeight) / 2;
    }

    const visH = 8.9008;
    const visW = 5.0067;

    const to3D = (raw: any, defaultZ = 0) => {
      const normX = (raw.x - cropLeft) / visibleWidth;
      const screenNormX = 1.0 - normX; // Mirrored selfie
      const screenNormY = (raw.y - cropTop) / visibleHeight;
      const zVal = typeof raw.z === "number" ? -raw.z * 1.2 : defaultZ;
      return new THREE.Vector3(
        (screenNormX - 0.5) * visW,
        (0.5 - screenNormY) * visH,
        zVal
      );
    };

    const ls3D = to3D(ls);
    const rs3D = to3D(rs);
    const midShoulder = new THREE.Vector3().addVectors(ls3D, rs3D).multiplyScalar(0.5);

    // Hitung skala tubuh pengguna
    const shoulderDist = ls3D.distanceTo(rs3D);
    const bodyScale = shoulderDist / 0.44;

    // 1. LEHER OCCLUDER (Memotong kerah belakang baju di Z-buffer)
    if (neckRef.current) {
      let targetNeckPos = midShoulder.clone();
      targetNeckPos.y += 0.12 * bodyScale;
      targetNeckPos.z += 0.01; // Pas di rongga kerah

      if (nose && (nose.score ?? 0) > 0.25) {
        const nose3D = to3D(nose);
        // Leher berada di antara bahu dan hidung
        targetNeckPos.lerp(nose3D, 0.45);
      }

      neckRef.current.position.copy(targetNeckPos);
      neckRef.current.scale.set(bodyScale, bodyScale, bodyScale);
      neckRef.current.visible = true;
    }

    // 2. KEPALA OCCLUDER (Mencegah kerah belakang atau tudung hoodie tampak di depan wajah)
    if (headRef.current && nose && (nose.score ?? 0) > 0.25) {
      const nose3D = to3D(nose);
      headRef.current.position.set(nose3D.x, nose3D.y + 0.05 * bodyScale, nose3D.z - 0.02);
      headRef.current.scale.set(bodyScale * 1.1, bodyScale * 1.2, bodyScale * 1.1);
      headRef.current.visible = true;
    }

    // 3. HELPER PENGHUBUNG SENDI LENGAN (Shoulder -> Elbow -> Wrist)
    const orientLimb = (mesh: THREE.Mesh | null, p1: THREE.Vector3, p2: THREE.Vector3, scaleRadius: number) => {
      if (!mesh) return;
      const dist = p1.distanceTo(p2);
      if (dist < 0.08 || dist > 4.0) {
        mesh.visible = false;
        return;
      }
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      mesh.position.copy(mid);
      mesh.scale.set(scaleRadius * bodyScale, dist, scaleRadius * bodyScale);
      
      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      mesh.visible = true;
    };

    // Lengan Kiri (Left Arm)
    if (le && (le.score ?? 0) > 0.20) {
      const le3D = to3D(le);
      orientLimb(lUpperRef.current, ls3D, le3D, 1.0);

      if (lw && (lw.score ?? 0) > 0.20) {
        const lw3D = to3D(lw);
        orientLimb(lLowerRef.current, le3D, lw3D, 0.9);
      } else if (lLowerRef.current) {
        lLowerRef.current.visible = false;
      }
    } else {
      if (lUpperRef.current) lUpperRef.current.visible = false;
      if (lLowerRef.current) lLowerRef.current.visible = false;
    }

    // Lengan Kanan (Right Arm)
    if (re && (re.score ?? 0) > 0.20) {
      const re3D = to3D(re);
      orientLimb(rUpperRef.current, rs3D, re3D, 1.0);

      if (rw && (rw.score ?? 0) > 0.20) {
        const rw3D = to3D(rw);
        orientLimb(rLowerRef.current, re3D, rw3D, 0.9);
      } else if (rLowerRef.current) {
        rLowerRef.current.visible = false;
      }
    } else {
      if (rUpperRef.current) rUpperRef.current.visible = false;
      if (rLowerRef.current) rLowerRef.current.visible = false;
    }
  });

  return (
    <group renderOrder={0}>
      {/* Leher Invisible Occluder */}
      <mesh ref={neckRef} geometry={neckGeo} material={occlusionMaterial} visible={false} />
      {/* Kepala Invisible Occluder */}
      <mesh ref={headRef} geometry={headGeo} material={occlusionMaterial} visible={false} />
      {/* Lengan Kiri */}
      <mesh ref={lUpperRef} geometry={upperArmGeo} material={occlusionMaterial} visible={false} />
      <mesh ref={lLowerRef} geometry={lowerArmGeo} material={occlusionMaterial} visible={false} />
      {/* Lengan Kanan */}
      <mesh ref={rUpperRef} geometry={upperArmGeo} material={occlusionMaterial} visible={false} />
      <mesh ref={rLowerRef} geometry={lowerArmGeo} material={occlusionMaterial} visible={false} />
    </group>
  );
}
