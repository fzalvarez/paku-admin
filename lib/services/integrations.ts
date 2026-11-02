// Integraciones de envío. Espejo de paku-backend: app/modules/messaging/api/router.py — /admin/integrations/email (C-44).
// La API key nunca vuelve completa: solo `api_key_mask` (p. ej. "re_12…9aXz"). Enviarla vacía conserva la guardada.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export type EmailStatus = "not_configured" | "disabled" | "active" | "error";

export interface EmailIntegration {
  provider: string;
  providers: { value: string; label: string }[];
  enabled: boolean;
  /** Tiene API key y remitente. */
  configured: boolean;
  api_key_mask: string | null;
  from_email: string | null;
  from_name: string | null;
  reply_to: string | null;
  /** `error`: está activo y falló la última prueba. */
  status: EmailStatus;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_error: string | null;
  /** false: el servidor no tiene CREDENTIALS_ENCRYPTION_KEY y no se puede guardar la key. */
  encryption_ready: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

export interface EmailIntegrationInput {
  provider: string;
  enabled: boolean;
  /** Vacía o ausente: se conserva la guardada. */
  api_key?: string | null;
  from_email: string | null;
  from_name: string | null;
  reply_to: string | null;
}

export interface TestEmailResult {
  ok: boolean;
  to: string;
  provider_message_id: string | null;
  error: string | null;
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const getEmailIntegration = () => getJson<EmailIntegration>("/admin/integrations/email");

/** Todo o nada: 422 EMAIL_CONFIG_INVALID (con `field`) o 503 ENCRYPTION_UNAVAILABLE no guardan nada. */
export const updateEmailIntegration = (input: EmailIntegrationInput) =>
  getJson<EmailIntegration>("/admin/integrations/email", json("PUT", input));

/** Usa lo guardado, aunque esté desactivado. Sin `to`, va al correo del admin. Rechazo del proveedor: `ok: false`. */
export const sendTestEmail = (to?: string) =>
  getJson<TestEmailResult>("/admin/integrations/email/test", json("POST", { to: to || null }));
