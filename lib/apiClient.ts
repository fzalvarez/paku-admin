// Único cliente HTTP del admin. Los tokens viven en cookies (lib/session.ts), que también lee
// proxy.ts para proteger las rutas. Las capas de lib/services/* y lib/api.ts se apoyan en este.

import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "./session";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Una sola renovación a la vez: si varias peticiones reciben 401 juntas, comparten el mismo
// refresh (el backend entrega un refresh token nuevo en cada renovación).
let refreshing: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  refreshing ??= (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) return null;
      const data: { access_token: string; refresh_token?: string } = await res.json();
      saveTokens(data.access_token, data.refresh_token ?? refresh);
      return data.access_token;
    } catch {
      return null;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

function withAuth(options: RequestInit, token?: string): RequestInit {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...options, headers };
}

// fetch contra la API con el token de la sesión. Devuelve la Response tal cual; los errores de
// negocio los interpreta quien llama (lib/apiHelpers.ts → parseApiError).
// Si la petición llevaba token y responde 401, renueva la sesión una vez y reintenta; si no se
// puede renovar, cierra la sesión y manda a /login. Sin token (p. ej. el login) no renueva nada.
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const token = getAccessToken();
  const res = await fetch(url, withAuth(options, token));
  if (res.status !== 401 || !token) return res;

  const fresh = await refreshAccessToken();
  if (fresh) return fetch(url, withAuth(options, fresh));

  clearTokens();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
  return res;
}
