"use client";

import { Grid } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

function AnimatedGrid() {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.z = (state.clock.elapsedTime * 0.5) % 2;
  });

  return (
    <group ref={ref}>
      <Grid
        args={[42, 42]}
        cellSize={1}
        sectionSize={5}
        cellThickness={0.35}
        sectionThickness={0.9}
        cellColor="#C8F000"
        sectionColor="#C8F000"
        fadeDistance={24}
        fadeStrength={2}
        infiniteGrid
      />
    </group>
  );
}

export function GridPlane() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-30">
      <Canvas camera={{ position: [0, 6, 0], rotation: [-Math.PI / 2.6, 0, 0], fov: 72 }}>
        <AnimatedGrid />
      </Canvas>
    </div>
  );
}
