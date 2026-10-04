"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";
import {
  ORDER_STATUSES,
  SERVICE_STEP_LABELS,
  SKIP_REASON_LABELS,
  label,
  orderStatusBadge,
  orderStatusLabel,
  type OrderStatus,
} from "@/lib/labels";
import { fmtDateTime, fmtTotal, type Order } from "@/lib/orders";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { PriceCheckDialog } from "@/components/pet-records/PriceCheckDialog";
import {
  getUserPets,
  createPetRecord,
  type PetSummary,
  type PriceCheckOut,
} from "@/lib/services/petRecords";
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

// Avances que el admin puede hacer con POST /orders/{id}/status (el backend solo acepta
// avanzar). `accepted` no se usa en el flujo: la app Groomer pasa de created a on_the_way.
// Cancelar va por su propio botón; una orden saltada se reprograma desde Asignación.
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  created:    ["on_the_way"],
  accepted:   ["on_the_way"],
  on_the_way: ["in_service"],
  in_service: ["done"],
  done:       [],
  cancelled:  [],
  skipped:    [],
};

const CANCELLABLE: OrderStatus[] = ["created", "accepted", "on_the_way", "skipped"];

// Sin groomer asignado la orden no puede avanzar: primero se asigna en Asignación.
const nextStatuses = (order: Order): OrderStatus[] =>
  order.groomer_id ? NEXT_STATUSES[order.status] ?? [] : [];

const noNextReason = (order: Order) =>
  !order.groomer_id && order.status === "created"
    ? "Asigna un groomer primero (Asignación)"
    : "Sin cambios de estado posibles";

// Cerrar a mano una orden en servicio que el groomer no terminó de recorrer
// (p. ej. se quedó sin batería). El backend lo permite al admin.
const isManualClose = (order: Order, next: OrderStatus | "") =>
  order.status === "in_service" && next === "done" && order.service_step !== "return";

// Extrae los pet_id únicos de items_snapshot[].meta.pet_id (ver
// paku-backend app/modules/orders/app/use_cases.py:_extract_pet_ids —
// una orden puede cubrir servicios de más de una mascota).
function extractPetIdsFromItemsSnapshot(itemsSnapshot: unknown): string[] {
  if (!Array.isArray(itemsSnapshot)) return [];
  const ids = new Set<string>();
  for (const item of itemsSnapshot) {
    const petId = (item as { meta?: { pet_id?: unknown } })?.meta?.pet_id;
    if (typeof petId === "string") ids.add(petId);
  }
  return Array.from(ids);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filter state
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGroomerId, setFilterGroomerId] = useState<string>("");

  // draft (what user is currently editing in the filter bar before clicking Apply)
  const [draftStatus, setDraftStatus] = useState<string>("all");
  const [draftGroomerId, setDraftGroomerId] = useState<string>("");

  const buildPath = (status: string, groomerId: string) => {
    const params: string[] = [];
    if (status !== "all") params.push(`status=${encodeURIComponent(status)}`);
    if (groomerId.trim()) params.push(`groomer_id=${encodeURIComponent(groomerId.trim())}`);
    return `/admin/orders${params.length ? `?${params.join("&")}` : ""}`;
  };

  const loadOrders = async (status: string, groomerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(buildPath(status, groomerId));
      if (!res.ok) {
        setError(await parseApiError(res));
        setOrders([]);
        return;
      }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(filterStatus, filterGroomerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => {
    setFilterStatus(draftStatus);
    setFilterGroomerId(draftGroomerId);
    loadOrders(draftStatus, draftGroomerId);
  };

  const handleClear = () => {
    setDraftStatus("all");
    setDraftGroomerId("");
    setFilterStatus("all");
    setFilterGroomerId("");
    loadOrders("all", "");
  };

  // ── Detalle (panel lateral) ──────────────────────────────────────
  const [detailId, setDetailId] = useState<string | null>(null);

  // ── Status change modal ──────────────────────────────────────────
  const [statusModalOrder, setStatusModalOrder] = useState<Order | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<OrderStatus | "">("");
  const [statusChanging, setStatusChanging] = useState(false);
  const [statusChangeError, setStatusChangeError] = useState<string | null>(null);

  const openStatusModal = (order: Order) => {
    const next = nextStatuses(order);
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
        setStatusChangeError(await parseApiError(res));
        setStatusChanging(false);
        return;
      }
      closeStatusModal();
      await loadOrders(filterStatus, filterGroomerId);
    } catch {
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
    const paid = order.payment_status === "paid" ? " El cobro no se devuelve automáticamente." : "";
    if (!confirm(`¿Cancelar la orden ${order.id.slice(0, 8)}? Se libera su cupo del día.${paid}`)) return;
    setCancellingId(order.id);
    setCancelError(null);
    try {
      const res = await apiFetch(`/admin/orders/${order.id}/cancel`, { method: "POST" });
      if (!res.ok) {
        setCancelError(await parseApiError(res));
        setCancellingId(null);
        return;
      }
      setCancellingId(null);
      await loadOrders(filterStatus, filterGroomerId);
    } catch {
      setCancelError("Error de conexión");
      setCancellingId(null);
    }
  };

  // ── Registrar peso real (atajo hacia el recálculo de precio) ──────
  // Ver doc_fase4_recalculo_precio_por_peso.md: solo aplica si
  // payment_status=paid y status != done; el backend igual re-valida todo.
  const [weightModalOrder, setWeightModalOrder] = useState<Order | null>(null);
  const [weightModalPets, setWeightModalPets] = useState<PetSummary[]>([]);
  const [weightModalPetsLoading, setWeightModalPetsLoading] = useState(false);
  const [weightModalPetsError, setWeightModalPetsError] = useState<string | null>(null);
  const [weightPetId, setWeightPetId] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [weightSubmitting, setWeightSubmitting] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [weightPriceCheck, setWeightPriceCheck] = useState<PriceCheckOut | null>(null);
  const [weightPriceCheckPetId, setWeightPriceCheckPetId] = useState<string>("");

  const openWeightModal = async (order: Order) => {
    setWeightModalOrder(order);
    setWeightKg("");
    setWeightError(null);
    setWeightModalPets([]);
    setWeightPetId("");
    setWeightModalPetsError(null);

    const petIds = extractPetIdsFromItemsSnapshot(order.items_snapshot);
    if (petIds.length === 0 || !order.user_id) {
      setWeightModalPetsError("No se pudo determinar la mascota de esta orden");
      return;
    }
    setWeightModalPetsLoading(true);
    try {
      const ownerPets = await getUserPets(order.user_id);
      const matched = ownerPets.filter((p) => petIds.includes(p.id));
      setWeightModalPets(matched);
      if (matched.length === 1) setWeightPetId(matched[0].id);
      if (matched.length === 0) setWeightModalPetsError("No se encontraron las mascotas de esta orden");
    } catch (e) {
      setWeightModalPetsError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setWeightModalPetsLoading(false);
    }
  };

  const closeWeightModal = () => {
    setWeightModalOrder(null);
    setWeightModalPets([]);
    setWeightPetId("");
    setWeightError(null);
  };

  const submitWeight = async () => {
    if (!weightPetId) {
      setWeightError("Selecciona una mascota");
      return;
    }
    const n = Number(weightKg);
    if (!weightKg || Number.isNaN(n) || n <= 0) {
      setWeightError("Peso inválido");
      return;
    }

    const petId = weightPetId;
    setWeightSubmitting(true);
    setWeightError(null);
    try {
      const result = await createPetRecord(petId, {
        type: "weight_record",
        occurred_at: new Date().toISOString(),
        data: { weight_kg: n },
      });
      closeWeightModal();
      if (result.price_check) {
        setWeightPriceCheckPetId(petId);
        setWeightPriceCheck(result.price_check);
      }
      await loadOrders(filterStatus, filterGroomerId);
    } catch (e) {
      setWeightError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setWeightSubmitting(false);
    }
  };

  const manualClose = statusModalOrder ? isManualClose(statusModalOrder, selectedNewStatus) : false;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Órdenes" />

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Estado</label>
            <Select value={draftStatus} onValueChange={(v) => setDraftStatus(v)}>
              <SelectTrigger className="w-48" size="sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{orderStatusLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">ID del groomer</label>
            <input
              className="w-72 rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
              placeholder="UUID del groomer (opcional)"
              value={draftGroomerId}
              onChange={(e) => setDraftGroomerId(e.target.value)}
            />
          </div>

          <Button onClick={handleApply} disabled={loading}>Aplicar</Button>
          <Button variant="outline" onClick={handleClear} disabled={loading}>Limpiar</Button>
        </CardContent>
      </Card>

      {/* State messages */}
      {loading && <p className="mb-2 text-muted-foreground">Cargando órdenes...</p>}
      {error && <p className="mb-2 text-destructive">{error}</p>}
      {cancelError && <p className="mb-2 text-destructive">{cancelError}</p>}
      {!loading && !error && orders.length === 0 && (
        <p className="mb-2 text-muted-foreground">No hay órdenes</p>
      )}

      {/* Table */}
      {!loading && !error && orders.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Groomer</TableHead>
                  <TableHead>Programada</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const next = nextStatuses(o);
                  const cancellable = CANCELLABLE.includes(o.status);
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">
                        {o.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${orderStatusBadge(o.status)}`}>
                          {orderStatusLabel(o.status)}
                        </span>
                        {o.status === "skipped" && (
                          <p className="mt-1 text-xs text-muted-foreground" title={o.skip_note ?? undefined}>
                            {label(SKIP_REASON_LABELS, o.skip_reason)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{fmtTotal(o)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {o.groomer_id ? o.groomer_id.slice(0, 8) + "…" : "-"}
                      </TableCell>
                      <TableCell>{fmtDateTime(o.scheduled_at)}</TableCell>
                      <TableCell>{fmtDateTime(o.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setDetailId(o.id)}>
                            Ver
                          </Button>
                          {o.status === "skipped" && (
                            <Button size="sm" asChild>
                              <Link href={`/dashboard/asignaciones?reprogramar=${o.id}`}>Reprogramar</Link>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openStatusModal(o)}
                            disabled={next.length === 0}
                            title={next.length === 0 ? noNextReason(o) : ""}
                          >
                            Cambiar estado
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancel(o)}
                            disabled={!cancellable || cancellingId === o.id}
                            title={!cancellable ? "No se puede cancelar en este estado" : ""}
                          >
                            {cancellingId === o.id ? "Cancelando…" : "Cancelar"}
                          </Button>
                          {o.payment_status === "paid" && !["done", "cancelled"].includes(o.status) && (
                            <Button size="sm" variant="outline" onClick={() => openWeightModal(o)}>
                              Registrar peso
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Status change modal */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeStatusModal} />
          <div className="relative z-50 w-full max-w-3xl rounded-xl bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground mb-4">Cambiar estado</h2>

            <div className="mb-3">
              <span className="text-sm text-muted-foreground">Orden: </span>
              <span className="font-mono text-sm text-foreground">{statusModalOrder.id.slice(0, 8)}</span>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Estado actual:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${orderStatusBadge(statusModalOrder.status)}`}>
                {orderStatusLabel(statusModalOrder.status)}
              </span>
              {statusModalOrder.status === "in_service" && (
                <span className="text-sm text-muted-foreground">
                  · Paso: {label(SERVICE_STEP_LABELS, statusModalOrder.service_step)}
                </span>
              )}
            </div>

            {nextStatuses(statusModalOrder).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Esta orden no admite más cambios de estado.</p>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-1">Nuevo estado</label>
                  <Select value={selectedNewStatus} onValueChange={(v) => setSelectedNewStatus(v as OrderStatus)}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {nextStatuses(statusModalOrder).map((s) => (
                        <SelectItem key={s} value={s}>{orderStatusLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {manualClose && (
                  <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    El groomer no completó los pasos del servicio
                    {statusModalOrder.service_step
                      ? ` (va en "${label(SERVICE_STEP_LABELS, statusModalOrder.service_step)}")`
                      : ""}
                    . Al guardar, la orden se cierra a mano como terminada.
                  </p>
                )}

                {statusChangeError && (
                  <p className="text-destructive text-sm mb-3">{statusChangeError}</p>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={closeStatusModal} disabled={statusChanging}>Cancelar</Button>
                  <Button onClick={submitStatusChange} disabled={statusChanging || !selectedNewStatus}>
                    {statusChanging ? "Guardando…" : manualClose ? "Cerrar a mano" : "Guardar"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Registrar peso real modal */}
      {weightModalOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeWeightModal} />
          <div className="relative z-50 w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground mb-4">Registrar peso real</h2>

            <div className="mb-3">
              <span className="text-sm text-muted-foreground">Orden: </span>
              <span className="font-mono text-sm text-foreground">{weightModalOrder.id.slice(0, 8)}</span>
            </div>

            {weightModalPetsLoading && <p className="text-sm text-muted-foreground mb-3">Cargando mascotas…</p>}
            {weightModalPetsError && <p className="text-sm text-destructive mb-3">{weightModalPetsError}</p>}

            {!weightModalPetsLoading && weightModalPets.length > 0 && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-foreground mb-1">Mascota</label>
                <Select value={weightPetId} onValueChange={(v) => setWeightPetId(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="-- Seleccionar mascota --" />
                  </SelectTrigger>
                  <SelectContent>
                    {weightModalPets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="mb-3">
              <label className="block text-sm font-medium text-foreground mb-1">Peso real (kg)</label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>

            {weightError && <p className="text-destructive text-sm mb-3">{weightError}</p>}

            <div className="flex gap-2">
              <Button variant="outline" onClick={closeWeightModal} disabled={weightSubmitting}>
                Cancelar
              </Button>
              <Button
                onClick={submitWeight}
                disabled={weightSubmitting || weightModalPetsLoading || weightModalPets.length === 0}
              >
                {weightSubmitting ? "Registrando…" : "Registrar y verificar precio"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <OrderDetailSheet orderId={detailId} onClose={() => setDetailId(null)} />

      <PriceCheckDialog
        priceCheck={weightPriceCheck}
        petId={weightPriceCheckPetId}
        onClose={() => setWeightPriceCheck(null)}
      />
    </div>
  );
}
