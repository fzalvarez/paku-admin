// Gestión de tokens via cookies (sin dependencia externa, Web Cookie API).
// Usamos document.cookie para lectura/escritura en cliente y las mismas
// cookies son leídas por el middleware de Next.js en el servidor.

const ACCESS_KEY = "paku_access";
const REFRESH_KEY = "paku_refresh";

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : undefined;
}

function removeCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

export function saveTokens(access: string, refresh: string) {
  setCookie(ACCESS_KEY, access, 1);   // 1 día
  setCookie(REFRESH_KEY, refresh, 30); // 30 días
  // Mantener compatibilidad con el apiClient.ts original (localStorage)
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("access_token", access);
    localStorage.setItem("token_type", "Bearer");
    localStorage.setItem("refresh_token", refresh);
  }
}

export function getAccessToken(): string | undefined {
  return getCookie(ACCESS_KEY);
}

export function getRefreshToken(): string | undefined {
  return getCookie(REFRESH_KEY);
}

export function clearTokens() {
  removeCookie(ACCESS_KEY);
  removeCookie(REFRESH_KEY);
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token_type");
  }
}
