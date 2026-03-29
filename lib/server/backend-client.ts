import { env } from "@/lib/env";

function getBackendBaseUrl() {
  const baseUrl = env.BACKEND_API_URL || env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("Backend API URL is not configured.");
  }
  return baseUrl.replace(/\/$/, "");
}

export async function backendFetch<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${getBackendBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "detail" in payload
        ? String(payload.detail)
        : typeof payload === "object" && payload && "error" in payload
          ? String(payload.error)
          : "Backend request failed";
    throw new Error(message);
  }

  return payload as T;
}
