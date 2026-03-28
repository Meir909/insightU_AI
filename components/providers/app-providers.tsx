"use client";

import { Toaster } from "react-hot-toast";
import type { ReactNode } from "react";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#141414",
            color: "#FFFFFF",
            border: "1px solid rgba(255,255,255,0.08)",
          },
        }}
      />
    </>
  );
}
