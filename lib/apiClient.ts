const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function safeGetLocal(key: string) {
  return typeof window !== "undefined" ? localStorage.getItem(key) : null;
}

async function getAuthHeaders() {
  const tokenType = safeGetLocal("token_type");
  const accessToken = safeGetLocal("access_token");
  if (tokenType && accessToken) {
    return { Authorization: `${tokenType} ${accessToken}` };
  }
  return {};
}

async function refreshTokens() {
  const refreshToken = safeGetLocal("refresh_token");
  if (!refreshToken) throw new Error("No refresh token available");

  const res = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("token_type");
    }
    throw new Error("Refresh failed");
  }

  const data = await res.json();
  if (typeof window !== "undefined") {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("token_type", data.token_type);
    if (data.refresh_token) {
      localStorage.setItem("refresh_token", data.refresh_token);
    }
  }
  return data;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${baseUrl}${path}`;

  const authHeaders = await getAuthHeaders();

  // Build Headers instance to satisfy Fetch's HeadersInit types
  const initialHeaders = new Headers(options.headers as HeadersInit | undefined);
  if (authHeaders && (authHeaders as any).Authorization) {
    initialHeaders.set("Authorization", (authHeaders as any).Authorization);
  }

  let response = await fetch(url, {
    ...options,
    headers: initialHeaders,
  });

  if (response.status === 401 && typeof window !== "undefined") {
    // try refresh once
    try {
      await refreshTokens();
      const newAuth = await getAuthHeaders();
      const retryHeaders = new Headers(options.headers as HeadersInit | undefined);
      if (newAuth && (newAuth as any).Authorization) {
        retryHeaders.set("Authorization", (newAuth as any).Authorization);
      }
      response = await fetch(url, {
        ...options,
        headers: retryHeaders,
      });
    } catch (err) {
      // refresh failed: tokens were cleared by refreshTokens
      throw err;
    }
  }

  return response;
}