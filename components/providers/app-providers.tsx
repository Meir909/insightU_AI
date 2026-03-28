"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import type { ReactNode } from "react";

type AppProvidersProps = {
  children: ReactNode;
  clerkPublishableKey?: string;
};

export function AppProviders({
  children,
  clerkPublishableKey,
}: AppProvidersProps) {
  const content = (
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

  if (!clerkPublishableKey) {
    return content;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      {content}
    </ClerkProvider>
  );
}
