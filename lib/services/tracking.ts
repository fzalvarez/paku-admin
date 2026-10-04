// Seguimiento del groomer. Espejo de paku-backend: app/modules/tracking/api/schemas.py.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export interface LocationPoint {
  lat: number;
  lng: number;
  accuracy_m?: number | null;
  recorded_at?: string | null;
}

export interface GroomerLocation {
  order_id: string;
  order_status: string;
  groomer_location: LocationPoint | null; // null si el groomer aún no envió su posición
  destination: LocationPoint;
  staleness_seconds: number | null;
}

// Última ubicación conocida del groomer para una orden en camino o en servicio (admin permitido).
export async function getGroomerLocation(orderId: string): Promise<GroomerLocation> {
  const res = await apiFetch(`/tracking/orders/${orderId}/current`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}
