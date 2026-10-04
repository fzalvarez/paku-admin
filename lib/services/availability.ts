// Cupos por día (booking). Espejo de paku-backend: app/modules/booking/api/schemas.py.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export type HoldStatus = "held" | "confirmed" | "cancelled" | "expired";

export interface SlotHold {
  id: string;
  user_id: string;
  pet_id: string;
  service_id: string;
  status: HoldStatus;
  expires_at: string;
  created_at: string;
  date: string | null;
}

// Quién reservó ese día, con el estado de cada reserva (C-15).
export async function getSlotHolds(slotId: string): Promise<SlotHold[]> {
  const res = await apiFetch(`/admin/availability/${slotId}/holds`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}
