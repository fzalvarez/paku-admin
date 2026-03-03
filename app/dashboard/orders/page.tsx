"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

type OrderStatus =
  | "created"
  | "accepted"
  | "on_the_way"
  | "in_service"
  | "done"
  | "cancelled";

const ALL_STATUSES: OrderStatus[] = [
  "created",
  "accepted",
  "on_the_way",
  "in_service",
  "done",
  "cancelled",
];

// Valid forward-only transitions + cancellable states
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  created:    ["accepted", "cancelled"],
  accepted:   ["on_the_way", "cancelled"],
  on_the_way: ["in_service", "cancelled"],
  in_service: ["done"],
  done:       [],
  cancelled:  [],
};

const CANCELLABLE: OrderStatus[] = ["created", "accepted", "on_the_way"];

type Order = {
  id: string;
  user_id?: string;
  status: OrderStatus;
  total_snapshot?: number | null;
  currency?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  ally_id?: string | null;
  scheduled_at?: string | null;
};

const parseApiError = async (res: Response): Promise<string> => {
  try {
    const body = await res.json();
    if (body?.detail) {
      if (Array.isArray(body.detail) && body.detail.length > 0) {
        return body.detail[0].msg || String(body.detail[0]);
      }
      return String(body.detail);
    }
    if (body?.message) return String(body.message);
  } catch (_) {}
  return `Error ${res.status}`;
};

const fmtDate = (s?: string | null) => {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleString("es", { dateStyle: "short", timeStyle: "short" });
  } catch (_) {
    return s;
  }
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filter state
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAllyId, setFilterAllyId] = useState<string>("");

  // draft (what user is currently editing in the filter bar before clicking Apply)
  const [draftStatus, setDraftStatus] = useState<string>("all");
  const [draftAllyId, setDraftAllyId] = useState<string>("");

  const buildPath = (status: string, allyId: string) => {
    const params: string[] = [];
    if (status !== "all") params.push(`status=${encodeURIComponent(status)}`);
    if (allyId.trim()) params.push(`ally_id=${encodeURIComponent(allyId.trim())}`);
    return `/admin/orders${params.length ? `?${params.join("&")}` : ""}`;
  };

  const loadOrders = async (status: string, allyId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(buildPath(status, allyId));
      if (!res.ok) {
        const msg = await parseApiError(res);
        setError(msg);
        setOrders([]);
        return;
      }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (_) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(filterStatus, filterAllyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => {
    setFilterStatus(draftStatus);
    setFilterAllyId(draftAllyId);
    loadOrders(draftStatus, draftAllyId);
  };

  const handleClear = () => {
    setDraftStatus("all");
    setDraftAllyId("");
    setFilterStatus("all");
    setFilterAllyId("");
    loadOrders("all", "");
  };

  // ── Status change modal ──────────────────────────────────────────
  const [statusModalOrder, setStatusModalOrder] = useState<Order | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<OrderStatus | "">("");
  const [statusChanging, setStatusChanging] = useState(false);
  const [statusChangeError, setStatusChangeError] = useState<string | null>(null);

  const openStatusModal = (order: Order) => {
    const next = NEXT_STATUSES[order.status];
    setStatusModalOrder(order);
    setSelectedNewStatus(next.length > 0 ? next[0] : "");
    setStatusChangeError(null);
  };

  const closeStatusModal = () => {
    setStatusModalOrder(null);
    setSelectedNewStatus("");
    setStatusChangeError(null);
  };

  const submitStatusChange = async () => {
    if (!statusModalOrder || !selectedNewStatus) return;
    setStatusChanging(true);
    setStatusChangeError(null);
    try {
      const res = await apiFetch(`/orders/${statusModalOrder.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedNewStatus }),
      });
      if (!res.ok) {
        const msg = await parseApiError(res);
        setStatusChangeError(msg);
        setStatusChanging(false);
        return;
      }
      closeStatusModal();
      await loadOrders(filterStatus, filterAllyId);
    } catch (_) {
      setStatusChangeError("Error de conexión");
    } finally {
      setStatusChanging(false);
    }
  };

  // ── Cancel order ─────────────────────────────────────────────────
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancel = async (order: Order) => {
    if (!CANCELLABLE.includes(order.status)) return;
    if (!confirm(`¿Cancelar la orden ${order.id.slice(0, 8)}?`)) return;
    setCancellingId(order.id);
    setCancelError(null);
    try {
      const res = await apiFetch(`/admin/orders/${order.id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const msg = await parseApiError(res);
        setCancelError(msg);
        setCancellingId(null);
        return;
      }
      setCancellingId(null);
      await loadOrders(filterStatus, filterAllyId);
    } catch (_) {
      setCancelError("Error de conexión");
      setCancellingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Órdenes</h1>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Estado</label>
          <Select value={draftStatus} onValueChange={(v) => setDraftStatus(v)}>
            <SelectTrigger className="px-2 py-2 border border-gray-300 rounded text-gray-900 bg-white w-48" size="sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Ally ID</label>
          <input
            className="px-2 py-2 border border-gray-300 rounded text-gray-900 w-72"
            placeholder="UUID del ally (opcional)"
            value={draftAllyId}
            onChange={(e) => setDraftAllyId(e.target.value)}
          />
        </div>

        <Button onClick={handleApply} disabled={loading}>Aplicar</Button>
        <Button variant="outline" onClick={handleClear} disabled={loading}>Limpiar</Button>
      </div>

      {/* State messages */}
      {loading && <p className="text-gray-700 mb-2">Cargando órdenes...</p>}
      {error && <p className="text-red-700 mb-2">{error}</p>}
      {cancelError && <p className="text-red-700 mb-2">{cancelError}</p>}
      {!loading && !error && orders.length === 0 && (
        <p className="text-gray-700 mb-2">No hay órdenes</p>
      )}

      {/* Table */}
      {!loading && !error && orders.length > 0 && (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '28%' }} />
            </colgroup>
            <thead className="bg-gray-100 text-left text-sm text-gray-700">
              <tr>
                <th className="px-4 py-3 border-b">ID</th>
                <th className="px-4 py-3 border-b">Status</th>
                <th className="px-4 py-3 border-b">Total</th>
                <th className="px-4 py-3 border-b">Ally</th>
                <th className="px-4 py-3 border-b">Scheduled</th>
                <th className="px-4 py-3 border-b">Creada</th>
                <th className="px-4 py-3 border-b">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-800">
              {orders.map((o, i) => (
                <tr key={o.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3 border-b font-mono text-xs">
                    {o.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 border-b">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b">
                    {o.total_snapshot != null
                      ? `${o.total_snapshot} ${o.currency || ""}`.trim()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 border-b font-mono text-xs">
                    {o.ally_id ? o.ally_id.slice(0, 8) + "…" : "-"}
                  </td>
                  <td className="px-4 py-3 border-b">{fmtDate(o.scheduled_at)}</td>
                  <td className="px-4 py-3 border-b">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3 border-b">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openStatusModal(o)}
                        disabled={NEXT_STATUSES[o.status].length === 0}
                        title={NEXT_STATUSES[o.status].length === 0 ? "Sin transiciones posibles" : ""}
                      >
                        Cambiar estado
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCancel(o)}
                        disabled={!CANCELLABLE.includes(o.status) || cancellingId === o.id}
                        title={!CANCELLABLE.includes(o.status) ? "No se puede cancelar en este estado" : ""}
                      >
                        {cancellingId === o.id ? "Cancelando…" : "Cancelar"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Status change modal */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeStatusModal} />
          <div className="relative bg-white w-full max-w-3xl rounded shadow-lg p-6 z-50">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cambiar estado</h2>

            <div className="mb-3">
              <span className="text-sm text-gray-700">Orden: </span>
              <span className="font-mono text-sm text-gray-900">{statusModalOrder.id.slice(0, 8)}</span>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm text-gray-700">Estado actual:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(statusModalOrder.status)}`}>
                {statusModalOrder.status}
              </span>
            </div>

            {NEXT_STATUSES[statusModalOrder.status].length === 0 ? (
              <p className="text-sm text-gray-600 italic">Esta orden no admite más cambios de estado.</p>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-1">Nuevo estado</label>
                  <Select value={selectedNewStatus} onValueChange={(v) => setSelectedNewStatus(v as OrderStatus)}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder={NEXT_STATUSES[statusModalOrder.status][0] ?? "Seleccionar"} />
                    </SelectTrigger>
                    <SelectContent>
                      {NEXT_STATUSES[statusModalOrder.status].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {statusChangeError && (
                  <p className="text-red-700 text-sm mb-3">{statusChangeError}</p>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={closeStatusModal} disabled={statusChanging}>Cancelar</Button>
                  <Button onClick={submitStatusChange} disabled={statusChanging || !selectedNewStatus}>{statusChanging ? 'Guardando…' : 'Guardar'}</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function statusBadge(status: OrderStatus): string {
  switch (status) {
    case "created":      return "bg-blue-100 text-blue-800";
    case "accepted":     return "bg-cyan-100 text-cyan-800";
    case "on_the_way":   return "bg-yellow-100 text-yellow-800";
    case "in_service":   return "bg-orange-100 text-orange-800";
    case "done":         return "bg-green-100 text-green-800";
    case "cancelled":    return "bg-red-100 text-red-800";
    default:             return "bg-gray-100 text-gray-700";
  }
}
