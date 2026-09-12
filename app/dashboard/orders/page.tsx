"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
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
  payment_status?: string | null;
  items_snapshot?: unknown;
};

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
      await loadOrders(filterStatus, filterAllyId);
    } catch (e) {
      setWeightError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setWeightSubmitting(false);
    }
  };

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
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Ally ID</label>
            <input
              className="w-72 rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
              placeholder="UUID del ally (opcional)"
              value={draftAllyId}
              onChange={(e) => setDraftAllyId(e.target.value)}
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
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Ally</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">
                      {o.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadge(o.status)}`}>
                        {o.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {o.total_snapshot != null
                        ? `${o.total_snapshot} ${o.currency || ""}`.trim()
                        : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {o.ally_id ? o.ally_id.slice(0, 8) + "…" : "-"}
                    </TableCell>
                    <TableCell>{fmtDate(o.scheduled_at)}</TableCell>
                    <TableCell>{fmtDate(o.created_at)}</TableCell>
                    <TableCell>
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
                        {o.payment_status === "paid" && o.status !== "done" && (
                          <Button size="sm" variant="outline" onClick={() => openWeightModal(o)}>
                            Registrar peso
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(statusModalOrder.status)}`}>
                {statusModalOrder.status}
              </span>
            </div>

            {NEXT_STATUSES[statusModalOrder.status].length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Esta orden no admite más cambios de estado.</p>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-1">Nuevo estado</label>
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
                  <p className="text-destructive text-sm mb-3">{statusChangeError}</p>
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

      <PriceCheckDialog
        priceCheck={weightPriceCheck}
        petId={weightPriceCheckPetId}
        onClose={() => setWeightPriceCheck(null)}
      />
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
    default:             return "bg-gray-100 text-muted-foreground";
  }
}
