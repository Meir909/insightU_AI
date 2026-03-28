"use client";

import { MeshDistortMaterial, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";

function Sphere({ score }: { score: number }) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.y += 0.006;
      sphereRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.45) * 0.08;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += 0.008;
      ringRef.current.rotation.x =
        Math.PI / 2 + Math.sin(state.clock.elapsedTime * 0.3) * 0.12;
    }
  });

  return (
    <>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <MeshDistortMaterial
          color="#C8F000"
          transparent
          opacity={0.13}
          distort={0.25}
          speed={1.2}
          roughness={0.25}
          metalness={0.85}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.56, 20, 20]} />
        <meshStandardMaterial color="#C8F000" wireframe transparent opacity={0.08} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.05, 0.026, 16, 120]} />
        <meshStandardMaterial
          color="#C8F000"
          transparent
          opacity={0.36}
          emissive="#C8F000"
          emissiveIntensity={0.45}
        />
      </mesh>
      <Text fontSize={0.82} color="#C8F000" anchorX="center" anchorY="middle">
        {score}
      </Text>
      <Text
        fontSize={0.2}
        color="#888888"
        anchorX="center"
        anchorY="middle"
        position={[0, -0.62, 0]}
      >
        / 100
      </Text>
    </>
  );
}

export function ScoreSphere({ score }: { score: number }) {
  return (
    <div style={{ width: 220, height: 220 }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.35} />
        <pointLight position={[3, 3, 3]} color="#C8F000" intensity={3.2} />
        <pointLight position={[-3, -2, 3]} color="#ffffff" intensity={0.6} />
        <Sphere score={score} />
      </Canvas>
    </div>
  );
}
