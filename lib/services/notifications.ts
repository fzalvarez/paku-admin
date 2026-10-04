// Avisos del usuario (admin). Espejo de paku-backend: app/modules/notifications/api/router.py.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiFetch("/notifications/unread-count");
  if (!res.ok) throw new Error(await parseApiError(res));
  const data: { unread_count?: number } = await res.json();
  return data.unread_count ?? 0;
}

export async function listNotifications(limit = 20): Promise<AdminNotification[]> {
  const res = await apiFetch(`/notifications?limit=${limit}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function markRead(id: string): Promise<void> {
  const res = await apiFetch(`/notifications/${id}/read`, { method: "POST" });
  if (!res.ok) throw new Error(await parseApiError(res));
}

// El backend no tiene "marcar todos" (pedido en status.md): se marcan de a uno los no leídos.
export async function markAllRead(items: AdminNotification[]): Promise<void> {
  await Promise.all(items.filter((n) => !n.is_read).map((n) => markRead(n.id)));
}

// A dónde lleva un aviso. Todos llegan con type "order_status"; se distinguen por sus datos.
export function noticeTarget(n: AdminNotification): string | null {
  const data = n.data ?? {};
  const orderId = typeof data.order_id === "string" ? data.order_id : null;
  if (data.skip_reason || data.status === "skipped") return "/dashboard/asignaciones";
  if (orderId) return `/dashboard/ordenes?ver=${orderId}`;
  return null;
}
