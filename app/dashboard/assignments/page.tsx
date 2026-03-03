"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

type Order = {
  id: string;
  status: string;
  total_snapshot?: number | null;
  currency?: string | null;
  created_at?: string | null;
  ally_id?: string | null;
  scheduled_at?: string | null;
  user_id?: string | null;
  items_snapshot?: unknown;
  delivery_address_snapshot?: unknown;
};

type Ally = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  role: string;
  is_active: boolean;
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

const allyLabel = (a: Ally) => {
  const name = [a.first_name, a.last_name].filter(Boolean).join(" ") || a.id.slice(0, 8);
  const contact = a.phone || a.email || "";
  return contact ? `${name} (${contact})` : name;
};

export default function AssignmentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [allies, setAllies] = useState<Ally[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Modal state
  const [modalOrder, setModalOrder] = useState<Order | null>(null);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Assignment form
  const [formAllyId, setFormAllyId] = useState<string>("");
  const [formScheduledAt, setFormScheduledAt] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  const activeAllies = allies.filter((a) => a.is_active);

  const loadOrders = async () => {
    // Fetch created and accepted in parallel — backend only supports single status per call
    const [resCreated, resAccepted] = await Promise.all([
      apiFetch("/admin/orders?status=created"),
      apiFetch("/admin/orders?status=accepted"),
    ]);
    if (!resCreated.ok) throw new Error(await parseApiError(resCreated));
    if (!resAccepted.ok) throw new Error(await parseApiError(resAccepted));
    const [dataCreated, dataAccepted] = await Promise.all([
      resCreated.json(),
      resAccepted.json(),
    ]);
    const merged: Order[] = [
      ...(Array.isArray(dataCreated) ? dataCreated : []),
      ...(Array.isArray(dataAccepted) ? dataAccepted : []),
    ];
    // sort newest first
    merged.sort((a, b) =>
      new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    );
    setOrders(merged);
  };

  const loadAllies = async () => {
    const res = await apiFetch("/admin/users?role=ally");
    if (!res.ok) throw new Error(await parseApiError(res));
    const data = await res.json();
    setAllies(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    (async () => {
      setLoadingInit(true);
      setInitError(null);
      try {
        await Promise.all([loadOrders(), loadAllies()]);
      } catch (e: unknown) {
        setInitError(e instanceof Error ? e.message : "Error de conexión");
      } finally {
        setLoadingInit(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = async (order: Order) => {
    setModalOrder(order);
    setOrderDetail(null);
    setDetailError(null);
    setFormAllyId(activeAllies[0]?.id ?? "");
    setFormScheduledAt("");
    setFormNotes("");
    setAssignError(null);
    setAssignSuccess(null);

    setDetailLoading(true);
    try {
      const res = await apiFetch(`/admin/orders/${order.id}`);
      if (!res.ok) {
        setDetailError(await parseApiError(res));
      } else {
        setOrderDetail(await res.json());
      }
    } catch (_) {
      setDetailError("Error de conexión");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setModalOrder(null);
    setOrderDetail(null);
    setDetailError(null);
    setAssignError(null);
    setAssignSuccess(null);
  };

  const submitAssign = async () => {
    if (!modalOrder) return;
    setAssignError(null);
    if (!formAllyId) { setAssignError("Debes seleccionar un ally"); return; }
    if (!formScheduledAt) { setAssignError("La fecha programada es requerida"); return; }

    let isoDate: string;
    try {
      isoDate = new Date(formScheduledAt).toISOString();
    } catch (_) {
      setAssignError("Fecha inválida");
      return;
    }

    setAssigning(true);
    try {
      const body: Record<string, string> = {
        ally_id: formAllyId,
        scheduled_at: isoDate,
      };
      if (formNotes.trim()) body.notes = formNotes.trim();

      const res = await apiFetch(`/admin/orders/${modalOrder.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setAssignError(await parseApiError(res));
        setAssigning(false);
        return;
      }
      setAssignSuccess("Orden asignada correctamente");
      closeModal();
      // Refresh orders list (assigned order should disappear from "created")
      await loadOrders();
    } catch (_) {
      setAssignError("Error de conexión");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Asignación de Órdenes</h1>
      </div>

      {assignSuccess && (
        <p className="text-green-800 bg-green-100 border border-green-300 rounded px-3 py-2 mb-3 text-sm">
          {assignSuccess}
        </p>
      )}

      {loadingInit && <p className="text-gray-700">Cargando...</p>}
      {initError && <p className="text-red-700">{initError}</p>}

      {!loadingInit && !initError && (
        <>
          {orders.length === 0 ? (
            <p className="text-gray-700">No hay órdenes pendientes de asignación</p>
          ) : (
            <div className="overflow-x-auto bg-white border border-gray-200 rounded">
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '18%' }} />
                </colgroup>
                <thead className="bg-gray-100 text-left text-sm text-gray-700">
                  <tr>
                    <th className="px-4 py-3 border-b">ID</th>
                    <th className="px-4 py-3 border-b">Status</th>
                    <th className="px-4 py-3 border-b">Total</th>
                    <th className="px-4 py-3 border-b">Creada</th>
                    <th className="px-4 py-3 border-b">Ally actual</th>
                    <th className="px-4 py-3 border-b">Scheduled</th>
                    <th className="px-4 py-3 border-b">Acción</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-800">
                  {orders.map((o, i) => (
                    <tr key={o.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-3 border-b font-mono text-xs">{o.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 border-b">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          o.status === "created"  ? "bg-blue-100 text-blue-800" :
                          o.status === "accepted" ? "bg-cyan-100 text-cyan-800" :
                          "bg-gray-100 text-gray-700"
                        }`}>{o.status}</span>
                      </td>
                      <td className="px-4 py-3 border-b">
                        {o.total_snapshot != null ? `${o.total_snapshot} ${o.currency ?? ""}`.trim() : "-"}
                      </td>
                      <td className="px-4 py-3 border-b">{fmtDate(o.created_at)}</td>
                      <td className="px-4 py-3 border-b font-mono text-xs">
                        {o.ally_id ? o.ally_id.slice(0, 8) + "…" : "-"}
                      </td>
                      <td className="px-4 py-3 border-b">{fmtDate(o.scheduled_at)}</td>
                      <td className="px-4 py-3 border-b">
                        <Button size="sm" className="bg-blue-600 text-white" onClick={() => openModal(o)}>Asignar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Assignment modal */}
      {modalOrder && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-16">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white w-full max-w-4xl rounded shadow-lg p-6 z-50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Asignar orden</h2>
              <Button variant="outline" size="sm" onClick={closeModal}>Cerrar</Button>
            </div>

            {/* Order detail */}
            <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4 text-sm text-gray-800">
              <p><span className="font-medium">ID:</span> <span className="font-mono">{modalOrder.id.slice(0, 8)}</span></p>
              {detailLoading && <p className="text-gray-500 mt-1">Cargando detalle...</p>}
              {detailError && <p className="text-red-700 mt-1">{detailError}</p>}
              {orderDetail && !detailLoading && (
                <>
                  <p><span className="font-medium">Total:</span> {orderDetail.total_snapshot != null ? `${orderDetail.total_snapshot} ${orderDetail.currency ?? ""}`.trim() : "-"}</p>
                  <p><span className="font-medium">Estado:</span> {orderDetail.status}</p>
                  <p><span className="font-medium">Creada:</span> {fmtDate(orderDetail.created_at)}</p>
                  <p><span className="font-medium">Ally actual:</span> {orderDetail.ally_id ?? "-"}</p>
                  {orderDetail.scheduled_at && (
                    <p><span className="font-medium">Scheduled:</span> {fmtDate(orderDetail.scheduled_at)}</p>
                  )}
                </>
              )}
            </div>

            {/* Assignment form */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Ally <span className="text-red-600">*</span>
                </label>
                {activeAllies.length === 0 ? (
                  <p className="text-red-700 text-sm">No hay allies activos disponibles</p>
                ) : (
                  <Select value={formAllyId} onValueChange={(v) => setFormAllyId(v)}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="-- Seleccionar ally --" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAllies.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{allyLabel(a)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Fecha programada <span className="text-red-600">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-2 py-2 border border-gray-300 rounded text-gray-900"
                  value={formScheduledAt}
                  onChange={(e) => setFormScheduledAt(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Notas (opcional)</label>
                <textarea
                  className="w-full px-2 py-2 border border-gray-300 rounded text-gray-900"
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
            </div>

            {assignError && (
              <p className="text-red-700 mt-3 text-sm">{assignError}</p>
            )}

            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={closeModal} disabled={assigning}>Cancelar</Button>
              <Button onClick={submitAssign} disabled={assigning || activeAllies.length === 0}>{assigning ? 'Asignando...' : 'Guardar asignación'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
