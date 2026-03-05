import { signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { apiCall, ApiError } from "./api";
import { saveTokens, clearTokens } from "./session";

export interface AuthResult {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  is_new_user?: boolean;
}

// ── Email / Password (flujo principal para admins) ──────────────────────────

export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const data = await apiCall<AuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveTokens(data.access_token, data.refresh_token);
  return data;
}

// ── Google Sign-In (solo para admins de cuenta social pura) ─────────────────

export async function loginWithGoogle(): Promise<AuthResult> {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();

  const data = await apiCall<AuthResult>("/auth/social", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
  saveTokens(data.access_token, data.refresh_token);
  return data;
}

// ── Logout ───────────────────────────────────────────────────────────────────

export async function logout() {
  try {
    await firebaseSignOut(auth);
  } catch {
    // silenciar: puede que no haya sesión Firebase activa
  }
  clearTokens();
}

export { ApiError };
