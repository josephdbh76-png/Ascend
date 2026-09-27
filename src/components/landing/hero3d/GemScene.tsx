"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshTransmissionMaterial, Environment, Lightformer } from "@react-three/drei";
import { useMotionValueEvent, type MotionValue } from "framer-motion";
import * as THREE from "three";

const GOLD = "#d6a84f";
const GOLD_LIGHT = "#e8c875";

// Upper-right of the hero, clear of both the headline and the founder
// card below it. Kept separate from the group's transform so the
// scroll-driven offset in useFrame can add to it instead of replacing it.
const BASE_POSITION: [number, number, number] = [2.7, 1.4, -1];

/**
 * The scroll progress (0→1 over the hero's own height) is read from a
 * plain ref, not React state — useFrame runs every rendered frame
 * outside React's render cycle, so feeding it through state would
 * re-render the whole tree 60 times a second for nothing.
 */
function Gem({ scrollRef }: { scrollRef: React.RefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const edgesGeometry = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.05, 0)), []);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.16;
      meshRef.current.rotation.x += delta * 0.04;
    }
    if (groupRef.current) {
      const progress = scrollRef.current ?? 0;
      // Scroll adds a deliberate extra spin + gentle rise on top of the
      // idle rotation above — additive to the base position, never
      // overwriting it (progress is 0 at page load, so overwriting would
      // reset the gem to y≈0 regardless of where it was actually placed).
      groupRef.current.rotation.y = progress * Math.PI * 0.9;
      groupRef.current.position.y = BASE_POSITION[1] + progress * 0.6;
    }
  });

  return (
    <group ref={groupRef} position={BASE_POSITION}>
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
        {/* A small glowing core visible through the glass shell — reads
            as a warm light source inside the gem rather than a flat
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
    </group>
  );
}

export default function GemScene({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const scrollRef = useRef(0);

  useMotionValueEvent(scrollProgress, "change", (v) => {
    scrollRef.current = v;
  });

  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 42 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} color={GOLD_LIGHT} />
      <pointLight position={[-4, -2, -3]} intensity={0.6} color={GOLD} />
      {/* Procedural (no external HDRI fetch) — a transmissive/glass
          material is defined almost entirely by what it refracts, so it
          needs a real environment to look like anything at all. */}
      <Environment resolution={128}>
        <Lightformer intensity={4} color={GOLD_LIGHT} position={[0, 3, 2]} scale={[5, 5, 1]} />
        <Lightformer intensity={2.5} color={GOLD} position={[-3, -1, -2]} scale={[3, 3, 1]} />
        <Lightformer intensity={2} color="#ffffff" position={[3, -2, 3]} scale={[2, 2, 1]} />
        <Lightformer intensity={1.5} color="#ffffff" position={[0, -3, -3]} scale={[4, 4, 1]} />
      </Environment>
      <Gem scrollRef={scrollRef} />
    </Canvas>
  );
}
