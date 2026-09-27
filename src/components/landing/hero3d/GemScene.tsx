"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshTransmissionMaterial, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";

const GOLD = "#d6a84f";
const GOLD_LIGHT = "#e8c875";

/**
 * Centered in its own small canvas — the wrapper (PersistentGem) handles
 * where that canvas sits and how big it is on the page, so this scene
 * never needs to know about scroll or layout, just idle motion.
 */
function Gem() {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.05, 0)), []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.22;
      meshRef.current.rotation.x += delta * 0.06;
    }
  });

  return (
    <Float speed={1.3} rotationIntensity={0.25} floatIntensity={0.5}>
      <mesh ref={meshRef}>
        {/* detail 0 keeps the raw 20 flat triangular faces of an
            icosahedron — a real cut-gem silhouette, rather than the
            rounder, smoothed shape higher detail levels produce. */}
        <icosahedronGeometry args={[1.05, 0]} />
        <MeshTransmissionMaterial
          color={GOLD_LIGHT}
          thickness={1.4}
          roughness={0.06}
          transmission={1}
          ior={1.3}
          chromaticAberration={0.04}
          anisotropy={0.15}
          distortion={0.1}
          distortionScale={0.2}
          temporalDistortion={0.05}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>
      {/* A small glowing core visible through the glass shell — reads as
          a warm light source inside the gem rather than a flat
          transparent shape. */}
      <mesh scale={0.42}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={GOLD} toneMapped={false} />
      </mesh>
      {/* Crisp edge lines so the facets read clearly at a glance. */}
      <lineSegments scale={1.001} geometry={edgesGeometry}>
        <lineBasicMaterial color={GOLD_LIGHT} transparent opacity={0.4} />
      </lineSegments>
    </Float>
  );
}

export default function GemScene() {
  return (
    <Canvas camera={{ position: [0, 0, 4.2], fov: 42 }} dpr={[1, 1.25]} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} color={GOLD_LIGHT} />
      <pointLight position={[-4, -2, -3]} intensity={0.6} color={GOLD} />
      {/* Procedural (no external HDRI fetch) — a transmissive/glass
          material is defined almost entirely by what it refracts, so it
          needs a real environment to look like anything at all. */}
      <Environment resolution={96}>
        <Lightformer intensity={4} color={GOLD_LIGHT} position={[0, 3, 2]} scale={[5, 5, 1]} />
        <Lightformer intensity={2.5} color={GOLD} position={[-3, -1, -2]} scale={[3, 3, 1]} />
        <Lightformer intensity={2} color="#ffffff" position={[3, -2, 3]} scale={[2, 2, 1]} />
        <Lightformer intensity={1.5} color="#ffffff" position={[0, -3, -3]} scale={[4, 4, 1]} />
      </Environment>
      <Gem />
    </Canvas>
  );
}
