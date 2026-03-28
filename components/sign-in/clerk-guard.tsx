"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";

export function ClerkGuard({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  if (!enabled) {
    return <>{children}</>;
  }

  return <ClerkGuardInner>{children}</ClerkGuardInner>;
}

function ClerkGuardInner({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();

  if (!userId) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-text-muted">
          Candidate Access
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
          Sign in to continue the AI interview
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
          Interview sessions are tied to authenticated users so that message history, progress and scoring stay isolated.
        </p>
        <div className="mt-8">
          <SignInButton mode="modal">
            <button className="rounded-2xl bg-brand-green px-6 py-3 font-semibold text-black transition-colors hover:bg-brand-dim">
              Sign in with Clerk
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <UserButton />
      </div>
      {children}
    </>
  );
}
