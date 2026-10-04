// Orden tal como la devuelve paku-backend (OrderOut). Ver
// paku-backend/app/modules/orders/api/schemas.py.

import type { OrderStatus } from "./labels";

export type Order = {
  id: string;
  user_id?: string | null;
  status: OrderStatus;
  total_snapshot?: number | null;
  currency?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  groomer_id?: string | null;
  scheduled_at?: string | null;
  payment_status?: string | null;
  items_snapshot?: unknown;
  delivery_address_snapshot?: unknown;
  // Proceso del servicio (solo con status=in_service)
  service_step?: string | null;
  service_steps_log?: { step: string; started_at: string }[];
  addons_done?: { addon_id: string; done_at: string }[];
  // Parada saltada (status=skipped); se conserva si el admin la reprograma
  skip_reason?: string | null;
  skip_note?: string | null;
  skipped_at?: string | null;
};

export const fmtDateTime = (s?: string | null) => {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleString("es", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return s;
  }
};

export const fmtTotal = (o: Pick<Order, "total_snapshot" | "currency">) =>
  o.total_snapshot != null ? `${o.total_snapshot} ${o.currency ?? ""}`.trim() : "-";
