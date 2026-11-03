// Facturación electrónica con Nubefact. Espejo de paku-backend: app/modules/invoicing/api/router.py —
// /admin/integrations/nubefact (C-47). El token nunca vuelve completo (`token_mask`); enviarlo vacío conserva el
// guardado. La prueba de conexión consulta una boleta inexistente: no emite nada.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export type InvoicingStatus = "not_configured" | "disabled" | "active" | "error";

export interface InvoicingReadiness {
  /** De Parámetros generales; sin RUC no se puede emitir. */
  company_ruc: string | null;
  company_name: string | null;
  igv_percent: number;
  /** Clientes activos y, de ellos, con DNI registrado. */
  customers: number;
  customers_with_dni: number;
}

export interface NubefactIntegration {
  enabled: boolean;
  /** Tiene ruta, token y serie. */
  configured: boolean;
  api_url: string | null;
  token_mask: string | null;
  boleta_series: string;
  status: InvoicingStatus;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_error: string | null;
  /** false: el servidor no tiene CREDENTIALS_ENCRYPTION_KEY. */
  encryption_ready: boolean;
  updated_at: string | null;
  updated_by: string | null;
  readiness: InvoicingReadiness;
}

export interface NubefactIntegrationInput {
  enabled: boolean;
  api_url: string | null;
  /** Vacío o ausente: se conserva el guardado. */
  token?: string | null;
  boleta_series: string | null;
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<T>;
}

export const getNubefactIntegration = () => getJson<NubefactIntegration>("/admin/integrations/nubefact");

/** Todo o nada: 422 INVOICING_CONFIG_INVALID (con `field`) o 503 ENCRYPTION_UNAVAILABLE no guardan nada. */
export const updateNubefactIntegration = (input: NubefactIntegrationInput) =>
  getJson<NubefactIntegration>("/admin/integrations/nubefact", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

/** No emite nada. 409 INVOICING_NOT_CONFIGURED sin ruta o token. */
export const testNubefactConnection = () =>
  getJson<{ ok: boolean; message: string }>("/admin/integrations/nubefact/test", { method: "POST" });
