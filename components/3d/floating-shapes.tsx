"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";

function WireCube({
  position,
  size,
  speed,
}: {
  position: [number, number, number];
  size: number;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x += speed * 0.6;
    ref.current.rotation.y += speed;
    ref.current.position.y =
      position[1] + Math.sin(state.clock.elapsedTime * 0.6 + position[0]) * 0.35;
  });

  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial color="#C8F000" wireframe transparent opacity={0.13} />
    </mesh>
  );
}

function Orb({ position, size }: { position: [number, number, number]; size: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y += 0.004;
    ref.current.position.y =
      position[1] + Math.cos(state.clock.elapsedTime * 0.7 + position[2]) * 0.25;
  });

  return (
    <mesh ref={ref} position={position}>
      <icosahedronGeometry args={[size, 0]} />
      <meshStandardMaterial color="#C8F000" wireframe transparent opacity={0.1} />
    </mesh>
  );
}

export function FloatingShapes() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 9], fov: 55 }}>
        <ambientLight intensity={0.25} />
        <pointLight position={[2, 4, 5]} color="#C8F000" intensity={2.3} />
        <WireCube position={[-4.5, 2.4, -2]} size={1.6} speed={0.005} />
        <WireCube position={[3.8, -1.6, -3]} size={1.1} speed={0.004} />
        <WireCube position={[0.2, 3.8, -4.8]} size={1.8} speed={0.003} />
        <Orb position={[-3.6, -2, -2]} size={0.9} />
        <Orb position={[4.4, 2.2, -4]} size={1.2} />
      </Canvas>
    </div>
  );
}
