"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";
import {
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
  SERVICE_STEP_LABELS,
  SKIP_REASON_LABELS,
  label,
  orderStatusBadge,
  orderStatusLabel,
  paymentStatusBadge,
  type OrderStatus,
} from "@/lib/labels";
import { fmtDateTime, fmtTotal, type Order } from "@/lib/orders";
import { addDays, isYmd, limaDate, limaToday, weekRange } from "@/lib/dates";
import { listGroomers, listOrdersFiltered, type GroomerSummary } from "@/lib/services/orders";
import { listClients } from "@/lib/services/users";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// ── Filtros en la URL (spec 0003) ──────────────────────────────────
// estado, groomer: los filtra el backend. fecha/desde/hasta, pago, q: se filtran aquí.
type DateFilter = "" | "hoy" | "manana" | "semana" | "rango";

const DATE_FILTERS: { value: DateFilter; text: string }[] = [
  { value: "", text: "Todas" },
  { value: "hoy", text: "Hoy" },
  { value: "manana", text: "Mañana" },
  { value: "semana", text: "Esta semana" },
  { value: "rango", text: "Rango" },
];

const PAYMENT_FILTERS = Object.keys(PAYMENT_STATUS_LABELS);

const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | "" =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : "";

// Rango de días (YYYY-MM-DD, hora de Lima) del filtro de fecha; null = sin filtro.
function dateRange(fecha: DateFilter, desde: string, hasta: string): { from?: string; to?: string } | null {
  const today = limaToday();
  switch (fecha) {
    case "hoy":
      return { from: today, to: today };
    case "manana":
      return { from: addDays(today, 1), to: addDays(today, 1) };
    case "semana":
      return weekRange(today);
    case "rango":
      return desde || hasta ? { from: desde || undefined, to: hasta || undefined } : null;
    default:
      return null;
  }
}

export default function OrdersPage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando órdenes...</p>}>
      <OrdersView />
    </Suspense>
  );
}

function OrdersView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const estado = oneOf(searchParams.get("estado"), ORDER_STATUSES);
  const groomer = searchParams.get("groomer") ?? "";
  const fecha = oneOf(searchParams.get("fecha"), ["hoy", "manana", "semana", "rango"] as const);
  const desde = isYmd(searchParams.get("desde")) ? searchParams.get("desde")! : "";
  const hasta = isYmd(searchParams.get("hasta")) ? searchParams.get("hasta")! : "";
  const pago = oneOf(searchParams.get("pago"), PAYMENT_FILTERS);
  const q = searchParams.get("q") ?? "";
  const hasFilters = !!(estado || groomer || fecha || pago || q);

  // Cambia filtros en la URL sin agregar historial ni mover el scroll. "" borra el parámetro.
  const setParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // La búsqueda espera a que el admin deje de escribir.
  const [qInput, setQInput] = useState(q);
  useEffect(() => {
    const handle = setTimeout(() => {
      if (qInput.trim() !== q) setParams({ q: qInput.trim() });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reacciona a lo que se escribe
  }, [qInput]);

  const clearFilters = () => {
    setQInput("");
    router.replace(pathname, { scroll: false });
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await listOrdersFiltered({ status: estado || undefined, groomer_id: groomer || undefined }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [estado, groomer]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Nombres de clientes y groomers (una carga por página).
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [groomers, setGroomers] = useState<GroomerSummary[]>([]);
  useEffect(() => {
    listClients()
      .then((list) => setClientNames(Object.fromEntries(list.map((c) => [c.id, c.name]))))
      .catch(() => {});
    listGroomers().then(setGroomers).catch(() => {});
  }, []);

  const groomerName = (id?: string | null) => {
    if (!id) return "-";
    const g = groomers.find((x) => x.id === id);
    return g ? [g.first_name, g.last_name].filter(Boolean).join(" ") || id.slice(0, 8) : id.slice(0, 8) + "…";
  };
  const clientName = (id?: string | null) => (id ? clientNames[id] ?? id.slice(0, 8) + "…" : "-");

  const range = dateRange(fecha, desde, hasta);
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = orders.filter((o) => {
      if (pago && o.payment_status !== pago) return false;
      if (range) {
        const day = limaDate(o.scheduled_at);
        if (!day) return false;
        if (range.from && day < range.from) return false;
        if (range.to && day > range.to) return false;
      }
      if (term) {
        const name = (o.user_id && clientNames[o.user_id]) || "";
        if (!o.id.toLowerCase().includes(term) && !name.toLowerCase().includes(term)) return false;
      }
      return true;
    });
    // Con filtro de fecha: por hora programada (la primera del día arriba).
    if (range) {
      list.sort((a, b) => new Date(a.scheduled_at ?? 0).getTime() - new Date(b.scheduled_at ?? 0).getTime());
    }
    return list;
    // range se deriva de fecha/desde/hasta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, pago, fecha, desde, hasta, q, clientNames]);

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
      await loadOrders();
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
      await loadOrders();
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
      await loadOrders();
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
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Estado</label>
              <Select value={estado || "all"} onValueChange={(v) => setParams({ estado: v === "all" ? "" : v })}>
                <SelectTrigger className="w-44" size="sm">
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
              <label className="mb-1 block text-sm font-medium text-foreground">Groomer</label>
              <Select value={groomer || "all"} onValueChange={(v) => setParams({ groomer: v === "all" ? "" : v })}>
                <SelectTrigger className="w-44" size="sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {groomers.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{groomerName(g.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Pago</label>
              <Select value={pago || "all"} onValueChange={(v) => setParams({ pago: v === "all" ? "" : v })}>
                <SelectTrigger className="w-40" size="sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {PAYMENT_FILTERS.map((p) => (
                    <SelectItem key={p} value={p}>{PAYMENT_STATUS_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Buscar</label>
              <input
                className="h-8 w-60 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                placeholder="Cliente o ID"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">Programada:</span>
            {DATE_FILTERS.map((f) => (
              <Button
                key={f.value || "todas"}
                size="sm"
                variant={fecha === f.value ? "default" : "outline"}
                onClick={() =>
                  setParams(f.value === "rango" ? { fecha: "rango" } : { fecha: f.value, desde: "", hasta: "" })
                }
              >
                {f.text}
              </Button>
            ))}
            {fecha === "rango" && (
              <>
                <input
                  type="date"
                  aria-label="Desde"
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                  value={desde}
                  onChange={(e) => setParams({ desde: e.target.value })}
                />
                <span className="text-sm text-muted-foreground">a</span>
                <input
                  type="date"
                  aria-label="Hasta"
                  min={desde || undefined}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                  value={hasta}
                  onChange={(e) => setParams({ hasta: e.target.value })}
                />
              </>
            )}
            {range?.from && fecha !== "rango" && (
              <span className="text-xs text-muted-foreground">
                {range.from === range.to ? range.from : `${range.from} a ${range.to}`}
              </span>
            )}
            {hasFilters && (
              <Button size="sm" variant="ghost" className="ml-auto" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* State messages */}
      {loading && <p className="mb-2 text-muted-foreground">Cargando órdenes...</p>}
      {error && <p className="mb-2 text-destructive">{error}</p>}
      {cancelError && <p className="mb-2 text-destructive">{cancelError}</p>}
      {!loading && !error && (
        <p className="mb-2 text-sm text-muted-foreground">
          {visible.length} {visible.length === 1 ? "orden" : "órdenes"}
        </p>
      )}
      {!loading && !error && visible.length === 0 && (
        <div className="mb-2 flex items-center gap-3 text-muted-foreground">
          {hasFilters ? (
            <>
              <span>No hay órdenes con estos filtros.</span>
              <Button size="sm" variant="outline" onClick={clearFilters}>Limpiar filtros</Button>
            </>
          ) : (
            <span>No hay órdenes</span>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && !error && visible.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Groomer</TableHead>
                  <TableHead>Programada</TableHead>
                  <TableHead className="hidden 2xl:table-cell">Creada</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((o) => {
                  const next = nextStatuses(o);
                  const cancellable = CANCELLABLE.includes(o.status);
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">
                        {o.id.slice(0, 8)}
                        {o.parent_order_id && (
                          <span
                            className="mt-1 block w-fit rounded bg-indigo-100 px-1.5 py-0.5 font-sans text-[10px] font-medium text-indigo-800"
                            title={`Cargo extra por peso de la orden ${o.parent_order_id.slice(0, 8)}`}
                          >
                            Cargo extra
                          </span>
                        )}
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
                      <TableCell>
                        <span className="block max-w-40 truncate" title={clientName(o.user_id)}>
                          {clientName(o.user_id)}
                        </span>
                      </TableCell>
                      <TableCell>{fmtTotal(o)}</TableCell>
                      <TableCell>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${paymentStatusBadge(o.payment_status)}`}>
                          {label(PAYMENT_STATUS_LABELS, o.payment_status)}
                        </span>
                      </TableCell>
                      <TableCell>{groomerName(o.groomer_id)}</TableCell>
                      <TableCell>{fmtDateTime(o.scheduled_at)}</TableCell>
                      <TableCell className="hidden 2xl:table-cell">{fmtDateTime(o.created_at)}</TableCell>
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
                          {/* Acciones menos frecuentes en un menú, para que la fila quepa. */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={cancellingId === o.id}
                                aria-label="Más acciones"
                                title="Más acciones"
                              >
                                {cancellingId === o.id ? "…" : <MoreHorizontal className="size-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem disabled={next.length === 0} onSelect={() => openStatusModal(o)}>
                                Cambiar estado
                                {next.length === 0 && (
                                  <span className="ml-auto pl-3 text-xs text-muted-foreground">{noNextReason(o)}</span>
                                )}
                              </DropdownMenuItem>
                              {o.payment_status === "paid" && !["done", "cancelled"].includes(o.status) && (
                                <DropdownMenuItem onSelect={() => openWeightModal(o)}>Registrar peso</DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={!cancellable}
                                onSelect={() => handleCancel(o)}
                              >
                                Cancelar orden
                                {!cancellable && (
                                  <span className="ml-auto pl-3 text-xs text-muted-foreground">No en este estado</span>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
