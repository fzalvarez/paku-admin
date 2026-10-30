// Dashboard gerencial. Espejo de paku-backend: app/modules/dashboard/api/router.py — /admin/dashboard (C-39).
// Mes al día (del 1 al corte) vs. el mismo corte del mes anterior. Cada cifra trae su calidad: real, estimada
// (recetas y tarifas) o sin datos (valor null, nunca 0). Las reglas están en `description`.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export type MetricUnit = "count" | "money" | "pct" | "minutes";
export type MetricQuality = "real" | "estimated" | "no_data";

export interface DashboardMetric {
  key: string;
  label: string;
  unit: MetricUnit;
  description: string;
  value: number | null;
  quality: MetricQuality;
  /** En las cifras parciales: órdenes medidas o estimadas de `total`. */
  with_data: number | null;
  total: number | null;
  previous: number | null;
  previous_quality: MetricQuality;
  delta: number | null;
  delta_pct: number | null;
}

export interface DayOutlook {
  date: string;
  /** null: el día no tiene cupos. */
  capacity: number | null;
  booked: number | null;
  occupancy_pct: number | null;
  scheduled: number;
}

export interface Dashboard {
  cut: string;
  period: { date_from: string; date_to: string };
  previous_period: { date_from: string; date_to: string };
  metrics: DashboardMetric[];
  scheduled_rest_of_month: number;
  next_days: DayOutlook[];
}

export async function getDashboard(cut?: string): Promise<Dashboard> {
  const res = await apiFetch(cut ? `/admin/dashboard?date=${encodeURIComponent(cut)}` : "/admin/dashboard");
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<Dashboard>;
}
