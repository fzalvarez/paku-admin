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
  payment_method?: string | null;
  parent_order_id?: string | null; // presente solo en órdenes de ajuste (cargo extra por peso)
  hold_id?: string | null;
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

// Detalle de una parada: GET /orders/my-assignments/{id} (C-10). Lo usa el groomer y también
// acepta admin. Cualquiera de los tres bloques puede venir null si falta el dato.
export type StopPet = {
  id: string;
  name: string;
  species: string;
  breed_name?: string | null;
  weight_kg?: number | null;
  photo_url?: string | null;
  notes?: string | null;
  skin_sensitivity?: boolean | null;
  bath_behavior?: string | null;
  tolerates_drying?: boolean | null;
  tolerates_nail_clipping?: boolean | null;
  special_shampoo?: boolean | null;
};

// Línea de items_snapshot (copia del carrito al crear la orden).
export type OrderItem = {
  id: string;
  kind: "service_base" | "service_addon" | string;
  ref_id: string;
  name?: string | null;
  qty: number;
  unit_price: number;
  meta?: Record<string, unknown> | null;
};

// delivery_address_snapshot (copia de la dirección al crear la orden).
export type DeliveryAddress = {
  district_id?: string | null;
  address_line?: string | null;
  building_number?: string | null;
  apartment_number?: string | null;
  reference?: string | null;
  label?: string | null;
  lat?: number | null;
  lng?: number | null;
};

// GET /orders/{id}/photos (C-12). read_url es una URL firmada que vence.
export type OrderPhoto = {
  id: string;
  kind: "initial" | "final" | "incident" | string;
  read_url?: string | null;
  note?: string | null;
  created_at: string;
};

// GET /orders/{id}/delay-reports (C-14).
export type DelayReport = {
  id: string;
  order_id: string;
  groomer_id: string;
  delay_minutes: number;
  note?: string | null;
  created_at: string;
};

export type StopClient = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
};

export type StopService = {
  name?: string | null;
  addons: { id: string; name?: string | null }[];
};

export type StopDetail = Order & {
  pet: StopPet | null;
  client: StopClient | null;
  service: StopService | null;
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
