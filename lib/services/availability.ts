// Cupos por día (booking). Espejo de paku-backend: app/modules/booking/api/schemas.py.
// Desde C-28 el cupo es del DÍA, compartido por todos los servicios: no se envía service_id.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export type HoldStatus = "held" | "confirmed" | "cancelled" | "expired";

export interface SlotHold {
  id: string;
  user_id: string;
  pet_id: string;
  service_id: string;
  service_name?: string | null;
  status: HoldStatus;
  expires_at: string;
  created_at: string;
  date: string | null;
}

export interface DaySlot {
  id: string;
  date: string; // YYYY-MM-DD
  capacity: number;
  booked: number;
  available: number;
  is_active: boolean;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<T>;
}

const send = (path: string, method: string, body: unknown) =>
  apiFetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// Quién reservó ese día, con el servicio y el estado de cada reserva.
export const getSlotHolds = (slotId: string) =>
  apiFetch(`/admin/availability/${slotId}/holds`).then((r) => json<SlotHold[]>(r));

export const listDays = (dateFrom: string, days: number) =>
  apiFetch(`/admin/availability?date_from=${dateFrom}&days=${days}`).then((r) => json<DaySlot[]>(r));

/** Abre los días del rango (solo los días de la semana indicados: 0 = lunes … 6 = domingo). */
export const openDays = (body: { date_from: string; date_to: string; weekdays: number[]; capacity: number }) =>
  send("/admin/availability/bulk", "POST", { ...body, is_active: true }).then((r) =>
    json<{ created: DaySlot[]; skipped: string[] }>(r),
  );

export const setDayCapacity = (slotId: string, capacity: number) =>
  send(`/admin/availability/${slotId}`, "PATCH", { capacity }).then((r) => json<DaySlot>(r));

export const setDayOpen = (slotId: string, isActive: boolean) =>
  send(`/admin/availability/${slotId}/toggle`, "POST", { is_active: isActive }).then((r) => json<DaySlot>(r));
