"use client";

import { SignIn } from "@clerk/nextjs";

export function AuthEntry({ clerkEnabled }: { clerkEnabled: boolean }) {
  if (clerkEnabled) {
    return (
      <SignIn
        fallbackRedirectUrl="/dashboard"
        appearance={{
          variables: {
            colorBackground: "#141414",
            colorText: "#FFFFFF",
            colorPrimary: "#C8F000",
            colorTextSecondary: "#A0A0A0",
            colorInputBackground: "#1C1C1C",
            colorInputText: "#FFFFFF",
            borderRadius: "16px",
          },
        }}
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            Work email
          </span>
          <input
            defaultValue="review@invisionu.kz"
            className="w-full rounded-2xl border border-white/6 bg-bg-elevated px-4 py-3 text-white outline-none transition-colors focus:border-brand-green/30"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            Access key
          </span>
          <input
            defaultValue="committee-demo"
            className="w-full rounded-2xl border border-white/6 bg-bg-elevated px-4 py-3 text-white outline-none transition-colors focus:border-brand-green/30"
          />
        </label>
      </div>
    </>
  );
}
