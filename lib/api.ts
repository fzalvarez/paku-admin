// Cliente HTTP con refresh automático y ApiError tipado.
// Coexiste con lib/apiClient.ts para no romper el código existente.

import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from "./session";
import { apiErrorMessage } from "./apiHelpers";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

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

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  saveTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

function parseDetail(body: Record<string, unknown>, status: number): { code: string; message: string } {
  const detail = body?.detail;
  const message = apiErrorMessage(body, status);
  if (!detail) return { code: "API_ERROR", message };
  if (Array.isArray(detail)) return { code: "VALIDATION_ERROR", message };
  if (typeof detail === "object") {
    return { code: String((detail as Record<string, unknown>).code ?? "API_ERROR"), message };
  }
  return { code: String(detail), message };
}

export async function apiCall<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getAccessToken();

  const doRequest = (t?: string) =>
    fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
    });

  let res = await doRequest(token);

  if (res.status === 401) {
    token = (await refreshAccessToken()) ?? undefined;
    if (token) {
      res = await doRequest(token);
    } else {
      clearTokens();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError(401, "UNAUTHORIZED", "Sesión expirada");
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const { code, message } = parseDetail(body, res.status);
    throw new ApiError(res.status, code, message);
  }

  return res.json() as Promise<T>;
}
