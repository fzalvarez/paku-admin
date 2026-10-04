"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";
import { orderStatusLabel } from "@/lib/labels";
import { fmtDateTime, fmtTotal, type Order } from "@/lib/orders";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/PageHeader";

type Groomer = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  role: string;
  is_active: boolean;
};

const groomerName = (g: Groomer) =>
  [g.first_name, g.last_name].filter(Boolean).join(" ") || g.id.slice(0, 8);

const groomerLabel = (g: Groomer) => {
  const contact = g.phone || g.email || "";
  return contact ? `${groomerName(g)} (${contact})` : groomerName(g);
};

// `accepted` no se usa en el flujo (la app Groomer no llama a /accept): una orden
// `created` con groomer ya está asignada.
const assignmentBadge = (o: Order) =>
  o.groomer_id
    ? { text: "Asignada", className: "bg-cyan-100 text-cyan-800" }
    : { text: "Sin asignar", className: "bg-blue-100 text-blue-800" };

export default function AssignmentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Modal state
  const [modalOrder, setModalOrder] = useState<Order | null>(null);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Assignment form
  const [formGroomerId, setFormGroomerId] = useState<string>("");
  const [formScheduledAt, setFormScheduledAt] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  const activeGroomers = groomers.filter((g) => g.is_active);

  const groomerById = (id?: string | null) => (id ? groomers.find((g) => g.id === id) : undefined);
  const currentGroomerText = (id?: string | null) => {
    if (!id) return "-";
    const g = groomerById(id);
    return g ? groomerName(g) : id.slice(0, 8) + "…";
  };

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

  const loadGroomers = async () => {
    const res = await apiFetch("/admin/users?role=groomer");
    if (!res.ok) throw new Error(await parseApiError(res));
    const data = await res.json();
    setGroomers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    (async () => {
      setLoadingInit(true);
      setInitError(null);
      try {
        await Promise.all([loadOrders(), loadGroomers()]);
      } catch (e: unknown) {
        setInitError(e instanceof Error ? e.message : "Error de conexión");
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  const openModal = async (order: Order) => {
    setModalOrder(order);
    setOrderDetail(null);
    setDetailError(null);
    // Si ya tiene groomer activo, se propone el mismo; si no, el primero de la lista.
    const current = groomerById(order.groomer_id);
    setFormGroomerId(current?.is_active ? current.id : activeGroomers[0]?.id ?? "");
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
    } catch {
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
  };

  const submitAssign = async () => {
    if (!modalOrder) return;
    setAssignError(null);
    if (!formGroomerId) { setAssignError("Debes seleccionar un groomer"); return; }
    if (!formScheduledAt) { setAssignError("La fecha programada es requerida"); return; }

    let isoDate: string;
    try {
      isoDate = new Date(formScheduledAt).toISOString();
    } catch {
      setAssignError("Fecha inválida");
      return;
    }

    setAssigning(true);
    try {
      const body: Record<string, string> = {
        groomer_id: formGroomerId,
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
      closeModal();
      setAssignSuccess("Orden asignada correctamente");
      await loadOrders();
    } catch {
      setAssignError("Error de conexión");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Asignación de órdenes" />

      {assignSuccess && (
        <p className="mb-3 rounded-md border border-green-300 bg-green-100 px-3 py-2 text-sm text-green-800">
          {assignSuccess}
        </p>
      )}

      {loadingInit && <p className="text-muted-foreground">Cargando...</p>}
      {initError && <p className="text-destructive">{initError}</p>}

      {!loadingInit && !initError && (
        <>
          {orders.length === 0 ? (
            <p className="text-muted-foreground">No hay órdenes pendientes de asignación</p>
          ) : (
            <Card>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Asignación</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Creada</TableHead>
                      <TableHead>Groomer actual</TableHead>
                      <TableHead>Programada</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => {
                      const badge = assignmentBadge(o);
                      return (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                          <TableCell>
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                              {badge.text}
                            </span>
                          </TableCell>
                          <TableCell>{fmtTotal(o)}</TableCell>
                          <TableCell>{fmtDateTime(o.created_at)}</TableCell>
                          <TableCell>{currentGroomerText(o.groomer_id)}</TableCell>
                          <TableCell>{fmtDateTime(o.scheduled_at)}</TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => openModal(o)}>
                              {o.groomer_id ? "Reasignar" : "Asignar"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Assignment modal */}
      {modalOrder && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-16">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative z-50 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Asignar orden</h2>
              <Button variant="outline" size="sm" onClick={closeModal}>Cerrar</Button>
            </div>

            {/* Order detail */}
            <div className="mb-4 rounded-lg border bg-muted/40 p-3 text-sm text-foreground">
              <p><span className="font-medium">ID:</span> <span className="font-mono">{modalOrder.id.slice(0, 8)}</span></p>
              {detailLoading && <p className="mt-1 text-muted-foreground">Cargando detalle...</p>}
              {detailError && <p className="mt-1 text-destructive">{detailError}</p>}
              {orderDetail && !detailLoading && (
                <>
                  <p><span className="font-medium">Total:</span> {fmtTotal(orderDetail)}</p>
                  <p><span className="font-medium">Estado:</span> {orderStatusLabel(orderDetail.status)}</p>
                  <p><span className="font-medium">Creada:</span> {fmtDateTime(orderDetail.created_at)}</p>
                  <p><span className="font-medium">Groomer actual:</span> {currentGroomerText(orderDetail.groomer_id)}</p>
                  {orderDetail.scheduled_at && (
                    <p><span className="font-medium">Programada:</span> {fmtDateTime(orderDetail.scheduled_at)}</p>
                  )}
                </>
              )}
            </div>

            {/* Assignment form */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Groomer <span className="text-destructive">*</span>
                </label>
                {activeGroomers.length === 0 ? (
                  <p className="text-sm text-destructive">No hay groomers activos disponibles</p>
                ) : (
                  <Select value={formGroomerId} onValueChange={(v) => setFormGroomerId(v)}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="-- Seleccionar groomer --" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeGroomers.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{groomerLabel(g)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Fecha programada <span className="text-destructive">*</span>
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                  value={formScheduledAt}
                  onChange={(e) => setFormScheduledAt(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Notas (opcional)</label>
                <textarea
                  className="w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
            </div>

            {assignError && (
              <p className="mt-3 text-sm text-destructive">{assignError}</p>
            )}

            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={closeModal} disabled={assigning}>Cancelar</Button>
              <Button onClick={submitAssign} disabled={assigning || activeGroomers.length === 0}>{assigning ? "Asignando..." : "Guardar asignación"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
