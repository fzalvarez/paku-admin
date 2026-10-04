// apiCall: JSON tipado sobre apiFetch (lib/apiClient.ts). Lanza ApiError con el mensaje en
// español (lib/apiHelpers.ts). Lo usan el login y la sesión (lib/auth.ts, lib/me.ts).

import { apiFetch } from "./apiClient";
import { apiErrorMessage } from "./apiHelpers";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function errorCode(body: Record<string, unknown>): string {
  const detail = body?.detail;
  if (!detail) return "API_ERROR";
  if (Array.isArray(detail)) return "VALIDATION_ERROR";
  if (typeof detail === "object") return String((detail as Record<string, unknown>).code ?? "API_ERROR");
  return String(detail);
}

export async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await apiFetch(path, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errorCode(body), apiErrorMessage(body, res.status));
  }
  return res.json() as Promise<T>;
}
