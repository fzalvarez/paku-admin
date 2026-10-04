// Usuarios desde el admin. Espejo de paku-backend: app/modules/iam/api/router.py.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export interface ClientName {
  id: string;
  name: string;
}

// Nombres de todos los clientes (rol user). GET /admin/users no pagina: hoy son pocos.
export async function listClients(): Promise<ClientName[]> {
  const res = await apiFetch("/admin/users?role=user");
  if (!res.ok) throw new Error(await parseApiError(res));
  const data: { id: string; first_name?: string | null; last_name?: string | null; email?: string | null }[] =
    await res.json();
  return (Array.isArray(data) ? data : []).map((u) => ({
    id: u.id,
    name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || u.id.slice(0, 8),
  }));
}
