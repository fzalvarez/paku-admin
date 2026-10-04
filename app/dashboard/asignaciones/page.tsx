"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";
import { SKIP_REASON_LABELS, SPECIES_LABELS, label, orderStatusLabel } from "@/lib/labels";
import { fmtDateTime, fmtTotal, type Order, type StopDetail } from "@/lib/orders";
import { assignOrder, cancelOrder, getStopDetail, listOrders } from "@/lib/services/orders";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { OrderDetailSheet } from "@/components/orders/OrderDetailSheet";

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

// Valor para <input type="datetime-local"> con la hora local actual.
const nowLocalInputValue = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const byNewest = (field: "created_at" | "skipped_at") => (a: Order, b: Order) =>
  new Date(b[field] ?? 0).getTime() - new Date(a[field] ?? 0).getTime();

export default function AssignmentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [skipped, setSkipped] = useState<Order[]>([]);
  // Mascota y cliente de cada saltada; null = no se pudo cargar (la fila se muestra igual).
  const [stops, setStops] = useState<Record<string, StopDetail | null>>({});
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const activeGroomers = groomers.filter((g) => g.is_active);
  const isReprogram = modalOrder?.status === "skipped";

  const groomerById = (id?: string | null) => (id ? groomers.find((g) => g.id === id) : undefined);
  const currentGroomerText = (id?: string | null) => {
    if (!id) return "-";
    const g = groomerById(id);
    return g ? groomerName(g) : id.slice(0, 8) + "…";
  };

  const loadOrders = async () => {
    const [created, accepted, skippedList] = await Promise.all([
      listOrders("created"),
      listOrders("accepted"),
      listOrders("skipped"),
    ]);
    const pendingList = [...created, ...accepted].sort(byNewest("created_at"));
    setOrders(pendingList);
    setSkipped(skippedList.sort(byNewest("skipped_at")));
    // Detalle solo de las saltadas (pocas), sin bloquear la pantalla.
    const pending = skippedList.filter((o) => !(o.id in stops));
    void Promise.all(
      pending.map(async (o) => {
        const detail = await getStopDetail(o.id).catch(() => null);
        setStops((prev) => ({ ...prev, [o.id]: detail }));
      })
    );
    return [...skippedList, ...pendingList];
  };

  const loadGroomers = async () => {
    const res = await apiFetch("/admin/users?role=groomer");
    if (!res.ok) throw new Error(await parseApiError(res));
    const data = await res.json();
    const list: Groomer[] = Array.isArray(data) ? data : [];
    setGroomers(list);
    return list;
  };

  // Abrir directo el formulario: /dashboard/asignaciones?reprogramar=<id>. Desde Órdenes (saltadas)
  // reprograma; desde Ruta del día (pendientes) abre Reasignar para cambiar la hora.
  const deepLinkHandled = useRef(false);

  useEffect(() => {
    (async () => {
      setLoadingInit(true);
      setInitError(null);
      try {
        const [listed, groomerList] = await Promise.all([loadOrders(), loadGroomers()]);
        if (!deepLinkHandled.current) {
          deepLinkHandled.current = true;
          const id = new URLSearchParams(window.location.search).get("reprogramar");
          const target = id ? listed.find((o) => o.id === id) : undefined;
          if (target) openModal(target, groomerList);
          if (id) window.history.replaceState(null, "", window.location.pathname);
        }
      } catch (e: unknown) {
        setInitError(e instanceof Error ? e.message : "Error de conexión");
      } finally {
        setLoadingInit(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial única
  }, []);

  const openModal = async (order: Order, groomerList: Groomer[] = groomers) => {
    setModalOrder(order);
    setOrderDetail(null);
    setDetailError(null);
    // Se propone el groomer que ya tenía la orden; si no, el primero activo.
    const current = groomerList.find((g) => g.id === order.groomer_id);
    const firstActive = groomerList.find((g) => g.is_active);
    setFormGroomerId(current?.is_active ? current.id : firstActive?.id ?? "");
    setFormScheduledAt("");
    setFormNotes("");
    setAssignError(null);
    setNotice(null);

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

    const scheduled = new Date(formScheduledAt);
    if (Number.isNaN(scheduled.getTime())) { setAssignError("Fecha inválida"); return; }
    if (scheduled.getTime() <= Date.now()) {
      setAssignError("La fecha ya pasó: elige una fecha y hora futuras");
      return;
    }

    setAssigning(true);
    try {
      await assignOrder(modalOrder.id, {
        groomer_id: formGroomerId,
        scheduled_at: scheduled.toISOString(),
        ...(formNotes.trim() ? { notes: formNotes.trim() } : {}),
      });
      const reprogrammed = isReprogram;
      closeModal();
      setNotice(reprogrammed ? "Parada reprogramada" : "Orden asignada correctamente");
      await loadOrders();
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setAssigning(false);
    }
  };

  const handleCancelSkipped = async (order: Order) => {
    const ok = confirm(
      `¿Cancelar la orden ${order.id.slice(0, 8)}?\n\n` +
        "El cobro no se devuelve. Si el cliente quiere el servicio, mejor reprográmala."
    );
    if (!ok) return;
    setCancellingId(order.id);
    setActionError(null);
    setNotice(null);
    try {
      await cancelOrder(order.id);
      setNotice("Orden cancelada");
      await loadOrders();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Asignación de órdenes" />

      {notice && (
        <p className="mb-3 rounded-md border border-green-300 bg-green-100 px-3 py-2 text-sm text-green-800">
          {notice}
        </p>
      )}
      {actionError && <p className="mb-3 text-sm text-destructive">{actionError}</p>}

      {loadingInit && <p className="text-muted-foreground">Cargando...</p>}
      {initError && <p className="text-destructive">{initError}</p>}

      {!loadingInit && !initError && (
        <>
          {skipped.length > 0 && (
            <SkippedGroup
              orders={skipped}
              stops={stops}
              groomerText={currentGroomerText}
              cancellingId={cancellingId}
              onReprogram={(o) => openModal(o)}
              onCancel={handleCancelSkipped}
              onOpenDetail={setDetailId}
            />
          )}

          <h2 className="mb-2 text-base font-semibold text-foreground">Pendientes</h2>
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
                          <TableCell>
                            <IdButton id={o.id} onOpen={setDetailId} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                                {badge.text}
                              </span>
                              {o.skip_reason && (
                                <span
                                  className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800"
                                  title={`Motivo: ${label(SKIP_REASON_LABELS, o.skip_reason)}${o.skip_note ? ` — ${o.skip_note}` : ""}`}
                                >
                                  Saltada antes
                                </span>
                              )}
                            </div>
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

      <OrderDetailSheet orderId={detailId} onClose={() => setDetailId(null)} />

      {/* Assignment / reprogram modal */}
      <Dialog open={!!modalOrder} onOpenChange={(v) => !v && closeModal()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isReprogram ? "Reprogramar parada" : "Asignar orden"}</DialogTitle>
          </DialogHeader>
          {modalOrder && (
          <div>

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
                  {orderDetail.skip_reason && (
                    <p>
                      <span className="font-medium">Saltada:</span>{" "}
                      {label(SKIP_REASON_LABELS, orderDetail.skip_reason)} · {fmtDateTime(orderDetail.skipped_at)}
                      {orderDetail.skip_note ? ` — “${orderDetail.skip_note}”` : ""}
                    </p>
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
                  {isReprogram ? "Nueva fecha y hora" : "Fecha programada"} <span className="text-destructive">*</span>
                </label>
                <input
                  type="datetime-local"
                  min={nowLocalInputValue()}
                  className="w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                  value={formScheduledAt}
                  onChange={(e) => setFormScheduledAt(e.target.value)}
                />
                {isReprogram && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reprogramar no toma un cupo de la fecha nueva. Si ese día ya está lleno, revísalo en Fechas.
                  </p>
                )}
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
              <Button onClick={submitAssign} disabled={assigning || activeGroomers.length === 0}>
                {assigning
                  ? isReprogram ? "Reprogramando..." : "Asignando..."
                  : isReprogram ? "Reprogramar" : "Guardar asignación"}
              </Button>
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Grupo de paradas saltadas: el groomer no pudo hacer el servicio y el admin decide.
function SkippedGroup({
  orders,
  stops,
  groomerText,
  cancellingId,
  onReprogram,
  onCancel,
  onOpenDetail,
}: {
  orders: Order[];
  stops: Record<string, StopDetail | null>;
  groomerText: (id?: string | null) => string;
  cancellingId: string | null;
  onReprogram: (o: Order) => void;
  onCancel: (o: Order) => void;
  onOpenDetail: (id: string) => void;
}) {
  return (
    <section className="mb-6">
      <h2 className="text-base font-semibold text-foreground">Saltadas ({orders.length})</h2>
      <p className="mb-2 text-sm text-muted-foreground">
        El groomer no pudo hacer el servicio. Coordina con el cliente y reprográmala.
      </p>
      <div className="space-y-3">
        {orders.map((o) => {
          const stop = stops[o.id];
          const client = stop?.client;
          const clientName = [client?.first_name, client?.last_name].filter(Boolean).join(" ");
          return (
            <Card key={o.id} className="border-purple-300">
              <CardContent className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {stop?.pet?.name ?? (stop === undefined ? "Cargando…" : "Mascota")}
                    </span>
                    {stop?.pet && (
                      <span className="text-muted-foreground">
                        {label(SPECIES_LABELS, stop.pet.species)}
                        {stop.pet.breed_name ? ` · ${stop.pet.breed_name}` : ""}
                      </span>
                    )}
                    <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                      {label(SKIP_REASON_LABELS, o.skip_reason)}
                    </span>
                    <IdButton id={o.id} onOpen={onOpenDetail} />
                  </div>
                  {o.skip_note && <p className="italic text-foreground">“{o.skip_note}”</p>}
                  <p className="text-muted-foreground">
                    Saltada {fmtDateTime(o.skipped_at)} por {groomerText(o.groomer_id)} · estaba para{" "}
                    {fmtDateTime(o.scheduled_at)} · {fmtTotal(o)}
                    {stop?.service?.name ? ` · ${stop.service.name}` : ""}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Cliente: </span>
                    {clientName || "-"}
                    {client?.phone && (
                      <>
                        {" · "}
                        <a href={`tel:${client.phone}`} className="text-primary underline-offset-4 hover:underline">
                          {client.phone}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onReprogram(o)}>Reprogramar</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={cancellingId === o.id}
                    onClick={() => onCancel(o)}
                  >
                    {cancellingId === o.id ? "Cancelando…" : "Cancelar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

// ID corto que abre el detalle de la orden.
function IdButton({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      className="font-mono text-xs text-primary underline-offset-4 hover:underline"
      title="Ver detalle"
    >
      {id.slice(0, 8)}
    </button>
  );
}
