// Órdenes desde el admin. Espejo de paku-backend: app/modules/orders/api/router.py.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";
import type { OrderStatus } from "@/lib/labels";
import type { Order, StopDetail } from "@/lib/orders";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

// El backend filtra un solo estado por llamada.
export async function listOrders(status: OrderStatus): Promise<Order[]> {
  const data = await json<unknown>(await apiFetch(`/admin/orders?status=${encodeURIComponent(status)}`));
  return Array.isArray(data) ? (data as Order[]) : [];
}

// Mascota, cliente y servicio de la orden (C-10). Admin permitido.
export async function getStopDetail(orderId: string): Promise<StopDetail> {
  return json(await apiFetch(`/orders/my-assignments/${orderId}`));
}

export interface AssignOrderIn {
  groomer_id: string;
  scheduled_at: string; // ISO-8601
  notes?: string;
}

// Asigna la orden. Sobre una orden saltada la reprograma: vuelve a "created", reinicia el
// proceso del servicio, conserva skip_* como historial y no toma cupo de la fecha nueva.
export async function assignOrder(orderId: string, body: AssignOrderIn): Promise<void> {
  await json(
    await apiFetch(`/admin/orders/${orderId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

// Cancela la orden (también una saltada). No devuelve el cobro; libera el cupo del día (C-15).
export async function cancelOrder(orderId: string): Promise<Order> {
  return json(await apiFetch(`/admin/orders/${orderId}/cancel`, { method: "POST" }));
}
