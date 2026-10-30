// Clientes (CRM). Espejo de paku-backend: app/modules/crm/api/router.py — /admin/customers (C-36).
// Servicio = orden terminada sin orden padre; gasto = lo pagado (orden + cargos extra pagados).

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export type CustomerSort = "spend" | "last_visit" | "services";

export interface CustomerSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  district_id: string | null;
  district_name: string | null;
  registered_at: string;
  pets: { id: string; name: string; species: string }[];
  services: number;
  spend: number;
  avg_ticket: number;
  first_visit: string | null;
  last_visit: string | null;
  days_since_last_visit: number | null;
  avg_interval_days: number | null;
  segment: string | null;
}

export interface CustomerPet {
  id: string;
  name: string;
  species: string;
  breed_id: string | null;
  breed_name: string | null;
  weight_kg: number | null;
  weight_code: string | null;
  birth_date: string | null;
  grooming_frequency: string | null;
  receive_reminders: boolean | null;
  antiparasitic: boolean | null;
  antiparasitic_interval: string | null;
  services: number;
}

export interface CustomerVisit {
  order_id: string;
  date: string;
  pet_id: string | null;
  pet_name: string | null;
  service_name: string;
  addon_names: string[];
  amount: number;
  paid: boolean;
}

export interface CustomerDetail extends CustomerSummary {
  pets_detail: CustomerPet[];
  /** De la más reciente a la más antigua. */
  visits: CustomerVisit[];
}

export interface CustomerStats {
  customers: number;
  pets: number;
  active: number;
  active_pct: number | null;
  with_repurchase: number;
  repurchase_pct: number | null;
  total_spend: number;
  avg_spend: number | null;
  segments: { code: string; label: string; rule: string; count: number }[];
}

async function getJson<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<T>;
}

export function listCustomers(filters: {
  segment?: string;
  district_id?: string;
  q?: string;
  last_visit_from?: string;
  last_visit_to?: string;
  sort?: CustomerSort;
} = {}): Promise<CustomerSummary[]> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) q.set(k, v);
  const qs = q.toString();
  return getJson<CustomerSummary[]>(`/admin/customers${qs ? `?${qs}` : ""}`);
}

export const getCustomerStats = () => getJson<CustomerStats>("/admin/customers/stats");

export const getCustomer = (userId: string) => getJson<CustomerDetail>(`/admin/customers/${encodeURIComponent(userId)}`);

export const fullName = (c: Pick<CustomerSummary, "first_name" | "last_name" | "email">) =>
  [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email;
