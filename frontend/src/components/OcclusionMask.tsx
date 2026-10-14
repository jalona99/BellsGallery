"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Komponen Occlusion Mask
 * Menghasilkan silinder transparan yang melacak lengan (Bahu ke Siku, Siku ke Pergelangan).
 * Menulis ke Depth Buffer tanpa Color Buffer, sehingga tangan/lengan yang diangkat
 * ke depan dada akan menutupi baju secara natural tanpa melubangi area dada.
 */
export default function OcclusionMask({ poseData }: { poseData: any }) {
  const lUpperRef = useRef<THREE.Mesh>(null);
  const lLowerRef = useRef<THREE.Mesh>(null);
  const rUpperRef = useRef<THREE.Mesh>(null);
  const rLowerRef = useRef<THREE.Mesh>(null);

  // Material khusus occlusion: Transparan murni tapi menulis kedalaman (Depth Buffer)
  const occlusionMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      colorWrite: false, // Jangan gambar warna
      depthWrite: true,  // Tulis ke depth buffer untuk menutupi objek di belakang
    });
  }, []);

  // Radius disesuaikan dengan proporsi anatomi agar tidak memotong bodi torso
  const upperArmGeo = useMemo(() => new THREE.CylinderGeometry(0.18, 0.15, 1, 16), []);
  const lowerArmGeo = useMemo(() => new THREE.CylinderGeometry(0.15, 0.12, 1, 16), []);

  const connectJoints = (
    mesh: THREE.Mesh,
    p1: any,
    p2: any,
    isUpperArm: boolean = false
  ) => {
    if (!p1 || !p2 || (p1.score ?? 1) < 0.35 || (p2.score ?? 1) < 0.35) {
      mesh.visible = false;
      return;
    }

    // Mapping koordinat kamera (640x480) ke viewport WebGL Three.js
    const mapPos = (p: any) =>
      new THREE.Vector3(
        (p.x / 640) * 10 - 5,
        -((p.y / 480) * 7.5 - 3.75),
        // Lengan atas diberi sedikit bias mundur agar tidak memotong bodi dada baju
        ((p.z || 0) / 640) * 10 - (isUpperArm ? 0.08 : 0.0)
      );

    const v1 = mapPos(p1);
    const v2 = mapPos(p2);

    const distance = v1.distanceTo(v2);
    if (distance < 0.1 || distance > 5) {
      mesh.visible = false;
      return;
    }

    const position = v2.clone().add(v1).divideScalar(2);

    mesh.position.copy(position);
    mesh.scale.set(1, distance, 1);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      v2.clone().sub(v1).normalize()
    );
    mesh.visible = true;
  };

  useFrame(() => {
    if (!poseData || !poseData.pose || !poseData.pose.keypoints) return;
    const { keypoints } = poseData.pose;

    const findKP = (name: string) => keypoints.find((k: any) => k.name === name);

    const ls = findKP("left_shoulder");
    const le = findKP("left_elbow");
    const lw = findKP("left_wrist");

    const rs = findKP("right_shoulder");
    const re = findKP("right_elbow");
    const rw = findKP("right_wrist");

    if (lUpperRef.current) connectJoints(lUpperRef.current, ls, le, true);
    if (lLowerRef.current) connectJoints(lLowerRef.current, le, lw, false);
    if (rUpperRef.current) connectJoints(rUpperRef.current, rs, re, true);
    if (rLowerRef.current) connectJoints(rLowerRef.current, re, rw, false);
  });

  return (
    <group renderOrder={0}>
      <mesh ref={lUpperRef} geometry={upperArmGeo} material={occlusionMaterial} visible={false} />
      <mesh ref={lLowerRef} geometry={lowerArmGeo} material={occlusionMaterial} visible={false} />
      <mesh ref={rUpperRef} geometry={upperArmGeo} material={occlusionMaterial} visible={false} />
      <mesh ref={rLowerRef} geometry={lowerArmGeo} material={occlusionMaterial} visible={false} />
    </group>
  );
}
