"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Environment, Lightformer } from "@react-three/drei";
import { useMotionValueEvent, type MotionValue } from "framer-motion";
import type * as THREE from "three";

const GOLD = "#d6a84f";
const GOLD_LIGHT = "#e8c875";

// Upper-right of the hero, clear of both the headline and the founder
// card below it. Kept separate from the group's transform so the
// scroll-driven offset in useFrame can add to it instead of replacing it.
const BASE_POSITION: [number, number, number] = [2.6, 1.65, -1];

/**
 * The scroll progress (0→1 over the hero's own height) is read from a
 * plain ref, not React state — useFrame runs every rendered frame
 * outside React's render cycle, so feeding it through state would
 * re-render the whole tree 60 times a second for nothing.
 */
function Gem({ scrollRef }: { scrollRef: React.RefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.18;
      meshRef.current.rotation.x += delta * 0.05;
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
      <Float speed={1.4} rotationIntensity={0.3} floatIntensity={0.4}>
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[0.75, 1]} />
          <MeshDistortMaterial
            color={GOLD}
            emissive={GOLD}
            emissiveIntensity={0.35}
            roughness={0.25}
            metalness={0.55}
            distort={0.18}
            speed={1.5}
          />
        </mesh>
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
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} color={GOLD_LIGHT} />
      <pointLight position={[-4, -2, -3]} intensity={0.8} color={GOLD} />
      {/* Procedural (no external HDRI fetch) — gives the metallic
          material something to reflect, since PBR metals are lit almost
          entirely by environment reflections rather than direct lights. */}
      <Environment resolution={64}>
        <Lightformer intensity={3} color={GOLD_LIGHT} position={[0, 3, 2]} scale={[4, 4, 1]} />
        <Lightformer intensity={2} color={GOLD} position={[-3, -1, -2]} scale={[3, 3, 1]} />
        <Lightformer intensity={1.5} color="#ffffff" position={[3, -2, 3]} scale={[2, 2, 1]} />
      </Environment>
      <Gem scrollRef={scrollRef} />
    </Canvas>
  );
}
