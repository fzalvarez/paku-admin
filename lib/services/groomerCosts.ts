// Costo del groomer. Espejo de paku-backend: app/modules/groomer_costs/api/router.py — /admin/groomer-costs (C-37).
// Costo mensual = sueldo + cargos de la empresa; costo por hora de servicio = costo mensual ÷ (horas al mes −
// bolsón de manejo y reposo). Esa tarifa costea los minutos de las recetas.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export type CostItemKind = "percent" | "amount";

export interface CostItem {
  label: string;
  kind: CostItemKind;
  value: number;
}

export interface CostProfile {
  id: string;
  groomer_id: string;
  effective_from: string;
  base_salary: number;
  items: (CostItem & { monthly_amount: number })[];
  monthly_cost: number;
  monthly_hours: number;
  driving_rest_hours: number;
  service_hours: number;
  cost_per_hour: number;
  cost_per_service_hour: number;
  is_current: boolean;
  notes: string | null;
  created_at: string;
}

export interface GroomerCost {
  groomer_id: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  current: CostProfile | null;
}

export interface GroomerCosts {
  groomers: GroomerCost[];
  /** Costo por hora de servicio con que se estiman las recetas (promedio de los vigentes). */
  reference_rate: number | null;
  suggested_items: CostItem[];
}

export interface CostProfileInput {
  effective_from: string;
  base_salary: number;
  items: CostItem[];
  monthly_hours: number;
  driving_rest_hours: number;
  notes?: string;
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<T>;
}

export const listGroomerCosts = () => getJson<GroomerCosts>("/admin/groomer-costs");

export const getGroomerCostHistory = (groomerId: string) =>
  getJson<CostProfile[]>(`/admin/groomer-costs/${encodeURIComponent(groomerId)}`);

/** Registra el costo desde una fecha; si ya hay uno en esa fecha, lo corrige. */
export const saveGroomerCost = (groomerId: string, input: CostProfileInput) =>
  getJson<CostProfile>(`/admin/groomer-costs/${encodeURIComponent(groomerId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
