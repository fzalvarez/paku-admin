// Reporte de ventas. Espejo de paku-backend: app/modules/reports/api/router.py — /admin/reports/sales (C-41).
// Una fila por orden de servicio; los cargos extra pagados se suman a su orden. Fechas en hora de Lima.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export type DateBasis = "purchase" | "service";

export interface SaleRow {
  order_id: string;
  purchase_date: string;
  service_date: string | null;
  order_status: string;
  payment_status: string;
  payment_method: string | null;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  pet_name: string | null;
  service_id: string | null;
  service_name: string;
  addon_names: string[];
  subtotal: number;
  discount: number;
  /** Neto de la orden (lo que se cobra). */
  total: number;
  extra_paid: number;
  /** Neto si está pagada + cargos extra pagados. */
  collected: number;
  groomer_id: string | null;
  groomer_name: string | null;
  district_id: string | null;
  district_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
}

export interface GroupTotal {
  key: string | null;
  label: string;
  orders: number;
  total: number;
  collected: number;
}

export interface SalesReport {
  rows: SaleRow[];
  totals: {
    orders: number;
    subtotal: number;
    discount: number;
    total: number;
    extra_paid: number;
    collected: number;
    avg_ticket: number | null;
    cancelled: number;
  };
  by_service: GroupTotal[];
  by_payment_method: GroupTotal[];
  by_order_status: GroupTotal[];
  /** Valores presentes en el rango de fechas, para llenar los filtros. */
  options: Record<"services" | "groomers" | "districts" | "campaigns", { value: string; label: string }[]>;
}

export interface SalesFilters {
  date_from?: string;
  date_to?: string;
  date_basis?: DateBasis;
  order_status?: string;
  payment_status?: string;
  payment_method?: string;
  service_id?: string;
  groomer_id?: string;
  district_id?: string;
  campaign_id?: string;
  q?: string;
}

export async function getSalesReport(filters: SalesFilters): Promise<SalesReport> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) q.set(k, v);
  const res = await apiFetch(`/admin/reports/sales?${q}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<SalesReport>;
}
