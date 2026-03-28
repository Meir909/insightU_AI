"use client";

import dynamic from "next/dynamic";

const FloatingShapes = dynamic(
  () => import("@/components/3d/floating-shapes").then((mod) => mod.FloatingShapes),
  { ssr: false },
);
const GridPlane = dynamic(
  () => import("@/components/3d/grid-plane").then((mod) => mod.GridPlane),
  { ssr: false },
);

export function SignInScene() {
  return (
    <>
      <GridPlane />
      <FloatingShapes />
    </>
  );
}
