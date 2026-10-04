// Órdenes desde el admin. Espejo de paku-backend: app/modules/orders/api/router.py.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";
import type { OrderStatus } from "@/lib/labels";
import type { DelayReport, Order, OrderPhoto, StopDetail } from "@/lib/orders";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

const asList = <T>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

export async function getOrder(orderId: string): Promise<Order> {
  return json(await apiFetch(`/admin/orders/${orderId}`));
}

// Todas las órdenes (sin filtro). Se usa para encontrar los ajustes de una orden
// (parent_order_id); si crece, pedir al backend un filtro ?parent_order_id=.
export async function listAllOrders(): Promise<Order[]> {
  return asList<Order>(await json<unknown>(await apiFetch("/admin/orders")));
}

export async function getOrderPhotos(orderId: string): Promise<OrderPhoto[]> {
  return asList<OrderPhoto>(await json<unknown>(await apiFetch(`/orders/${orderId}/photos`)));
}

export async function getDelayReports(orderId: string): Promise<DelayReport[]> {
  return asList<DelayReport>(await json<unknown>(await apiFetch(`/orders/${orderId}/delay-reports`)));
}

export interface GroomerSummary {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
}

export async function listGroomers(): Promise<GroomerSummary[]> {
  return asList<GroomerSummary>(await json<unknown>(await apiFetch("/admin/users?role=groomer")));
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
