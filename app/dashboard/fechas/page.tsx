"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ServicePicker } from "@/components/availability/ServicePicker";
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
import { getSlotHolds, type SlotHold } from "@/lib/services/availability";
import { getUserPets } from "@/lib/services/petRecords";
import { HOLD_STATUS_LABELS, holdStatusBadge, label } from "@/lib/labels";

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Slot {
  id: string;
  service_id: string;
  service_name?: string | null;
  date: string;           // YYYY-MM-DD
  capacity: number;
  booked: number;
  available: number;
  is_active: boolean;
}

interface BulkAvailabilityResult {
  created: Slot[];
  skipped: string[]; // fechas YYYY-MM-DD que ya existían
}

const fmtDateTime = (s: string) => {
  try {
    return new Date(s).toLocaleString("es", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return s;
  }
};

// ── Página principal ───────────────────────────────────────────────────────────

export default function FechasPage() {
  // ── Estado de lista ──────────────────────────────────────────────────────────
  const [slots, setSlots]       = useState<Slot[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const [filterServiceId, setFilterServiceId] = useState("");
  const [filterDateFrom, setFilterDateFrom]   = useState("");
  const [filterDays, setFilterDays]           = useState("30");

  // ── Toggle ───────────────────────────────────────────────────────────────────
  const [togglingId, setTogglingId]   = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // ── Modal crear ──────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen]           = useState(false);
  const [cServiceId, setCServiceId]           = useState("");
  const [cIsRange, setCIsRange]               = useState(false);
  const [cDate, setCDate]                     = useState("");
  const [cDateTo, setCDateTo]                 = useState("");
  const [cCapacity, setCCapacity]             = useState("1");
  const [cIsActive, setCIsActive]             = useState(true);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError]         = useState<string | null>(null);
  const [createResult, setCreateResult]       = useState<BulkAvailabilityResult | null>(null);

  // ── Modal editar capacidad ───────────────────────────────────────────────────
  const [editOpen, setEditOpen]             = useState(false);
  const [editTarget, setEditTarget]         = useState<Slot | null>(null);
  const [eCapacity, setECapacity]           = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError]           = useState<string | null>(null);

  // ── Dialog reservas del día ──────────────────────────────────────────────────
  const [holdsSlot, setHoldsSlot]       = useState<Slot | null>(null);
  const [holds, setHolds]               = useState<SlotHold[]>([]);
  const [holdsLoading, setHoldsLoading] = useState(false);
  const [holdsError, setHoldsError]     = useState<string | null>(null);
  // Nombres de clientes y mascotas: la reserva solo trae ids. Se cachean por página.
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [petNames, setPetNames]   = useState<Record<string, string>>({});

  // ── Cargar slots ─────────────────────────────────────────────────────────────

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterServiceId.trim()) params.set("service_id", filterServiceId.trim());
      if (filterDateFrom.trim())  params.set("date_from",  filterDateFrom.trim());
      if (filterDays.trim())      params.set("days",       filterDays.trim());

      const res = await apiFetch(`/admin/availability?${params.toString()}`);
      if (!res.ok) { setError(await parseApiError(res)); setSlots([]); return; }
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : []);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [filterServiceId, filterDateFrom, filterDays]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  // ── Toggle activo/inactivo ────────────────────────────────────────────────────

  const handleToggle = async (slot: Slot) => {
    setTogglingId(slot.id);
    setToggleError(null);
    try {
      const res = await apiFetch(`/admin/availability/${slot.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !slot.is_active }),
      });
      if (!res.ok) { setToggleError(await parseApiError(res)); return; }
      // Actualización optimista
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, is_active: !s.is_active } : s))
      );
    } catch {
      setToggleError("Error de conexión");
    } finally {
      setTogglingId(null);
    }
  };

  // ── Crear slot ────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setCServiceId("");
    setCIsRange(false);
    setCDate("");
    setCDateTo("");
    setCCapacity("1");
    setCIsActive(true);
    setCreateError(null);
    setCreateResult(null);
    setCreateOpen(true);
  };

  // Siempre llama a /admin/availability/bulk — date_to es opcional y omitirlo
  // equivale a un solo día, así el front no necesita elegir entre dos
  // endpoints (ver doc_booking_disponibilidad_paku-admin.md sección 3). El
  // switch "un día"/"rango" es solo para que la intención quede explícita
  // en la UI; ambos modos pegan al mismo endpoint.
  const submitCreate = async () => {
    setCreateError(null);
    if (!cServiceId.trim()) { setCreateError("Selecciona un servicio"); return; }
    if (!cDate.trim())      { setCreateError("La fecha es requerida"); return; }
    if (cIsRange && !cDateTo.trim()) { setCreateError("La fecha hasta es requerida en modo rango"); return; }
    if (cIsRange && cDateTo < cDate) { setCreateError("La fecha hasta no puede ser anterior a la fecha desde"); return; }
    const cap = parseInt(cCapacity, 10);
    if (isNaN(cap) || cap < 1) { setCreateError("La capacidad debe ser mayor a 0"); return; }

    setCreateSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        service_id: cServiceId.trim(),
        date_from: cDate.trim(),
        capacity: cap,
        is_active: cIsActive,
      };
      if (cIsRange) body.date_to = cDateTo.trim();

      const res = await apiFetch("/admin/availability/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setCreateError(await parseApiError(res)); return; }
      const result: BulkAvailabilityResult = await res.json();
      setCreateResult(result);
      await loadSlots();
    } catch {
      setCreateError("Error de conexión");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ── Editar capacidad ──────────────────────────────────────────────────────────

  const openEdit = (slot: Slot) => {
    setEditTarget(slot);
    setECapacity(String(slot.capacity));
    setEditError(null);
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    setEditError(null);
    const cap = parseInt(eCapacity, 10);
    if (isNaN(cap) || cap < 1) { setEditError("La capacidad debe ser mayor a 0"); return; }
    if (cap < editTarget.booked) {
      setEditError(`Ya hay ${editTarget.booked} cupos reservados; la capacidad no puede ser menor.`);
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await apiFetch(`/admin/availability/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capacity: cap }),
      });
      if (!res.ok) { setEditError(await parseApiError(res)); return; }
      const updated: Slot = await res.json();
      setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditOpen(false);
    } catch {
      setEditError("Error de conexión");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Reservas del día ──────────────────────────────────────────────────────────

  const openHolds = async (slot: Slot) => {
    setHoldsSlot(slot);
    setHolds([]);
    setHoldsError(null);
    setHoldsLoading(true);
    try {
      const data = await getSlotHolds(slot.id);
      setHolds(data);
      await loadNames(data);
    } catch (e) {
      setHoldsError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setHoldsLoading(false);
    }
  };

  const loadNames = async (data: SlotHold[]) => {
    const missingUsers = [...new Set(data.map((h) => h.user_id))].filter((id) => !userNames[id]);
    if (missingUsers.length === 0) return;
    const users: Record<string, string> = {};
    const pets: Record<string, string> = {};
    try {
      const res = await apiFetch("/admin/users?role=user");
      if (res.ok) {
        const list: { id: string; first_name?: string | null; last_name?: string | null; email?: string }[] =
          await res.json();
        for (const u of list) {
          users[u.id] = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || u.id.slice(0, 8);
        }
      }
      await Promise.all(
        missingUsers.map(async (id) => {
          for (const p of await getUserPets(id).catch(() => [])) pets[p.id] = p.name;
        })
      );
    } finally {
      // Si algo falla se muestran los ids cortos: los nombres son ayuda, no bloquean.
      setUserNames((prev) => ({ ...prev, ...users }));
      setPetNames((prev) => ({ ...prev, ...pets }));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      <PageHeader
        title="Fechas — Disponibilidad"
        action={<Button onClick={openCreate}>+ Nuevo día</Button>}
        className="mb-0"
      />

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Servicio</Label>
            <ServicePicker value={filterServiceId} onChange={setFilterServiceId} allowEmpty />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Desde</Label>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Días (máx. 90)</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={filterDays}
              onChange={(e) => setFilterDays(e.target.value)}
              className="w-24"
            />
          </div>
          <Button variant="outline" onClick={loadSlots} disabled={loading}>
            {loading ? "Cargando…" : "Filtrar"}
          </Button>
        </CardContent>
      </Card>

      {/* Mensajes globales */}
      {error       && <p className="text-sm text-destructive">{error}</p>}
      {toggleError && <p className="text-sm text-destructive">{toggleError}</p>}
      {!loading && !error && slots.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay días con cupos para los filtros seleccionados.</p>
      )}

      {/* Tabla */}
      {!loading && slots.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead className="text-center">Capacidad</TableHead>
                  <TableHead className="text-center">Reservados</TableHead>
                  <TableHead className="text-center">Disponibles</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell className="font-semibold tabular-nums">{slot.date}</TableCell>
                    <TableCell className="max-w-50 truncate" title={slot.service_id}>
                      {slot.service_name || (
                        <span className="font-mono text-xs text-muted-foreground">{slot.service_id}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{slot.capacity}</TableCell>
                    <TableCell className="text-center">{slot.booked}</TableCell>
                    <TableCell className="text-center">
                      <span className={slot.available === 0 ? "text-destructive font-semibold" : "text-green-600 font-semibold"}>
                        {slot.available}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={slot.is_active ? "default" : "secondary"}>
                        {slot.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openHolds(slot)}>
                          Reservas
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(slot)}
                        >
                          Editar capacidad
                        </Button>
                        <Button
                          size="sm"
                          variant={slot.is_active ? "destructive" : "secondary"}
                          disabled={togglingId === slot.id}
                          onClick={() => handleToggle(slot)}
                        >
                          {togglingId === slot.id
                            ? "…"
                            : slot.is_active
                            ? "Desactivar"
                            : "Activar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Dialog: Crear slot ───────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo día de disponibilidad</DialogTitle>
          </DialogHeader>

          {createResult ? (
            <div className="space-y-3 py-2">
              <p className="text-sm">
                <span className="font-semibold text-green-600">{createResult.created.length}</span> día(s) creado(s)
                {createResult.skipped.length > 0 && (
                  <>
                    {" "}— <span className="font-semibold text-muted-foreground">{createResult.skipped.length}</span>{" "}
                    ya existían
                  </>
                )}
                .
              </p>
              {createResult.skipped.length > 0 && (
                <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
                  <p className="text-muted-foreground mb-1">Fechas ya existentes (sin duplicar):</p>
                  <p className="font-mono text-xs">{createResult.skipped.join(", ")}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>
                  Servicio <span className="text-destructive">*</span>
                </Label>
                <ServicePicker value={cServiceId} onChange={setCServiceId} />
              </div>

              <div className="flex items-center gap-2">
                <Switch id="c-range" checked={cIsRange} onCheckedChange={setCIsRange} />
                <Label htmlFor="c-range">Crear un rango de días</Label>
              </div>

              <div className="space-y-1">
                <Label htmlFor="c-date">
                  {cIsRange ? "Fecha desde" : "Fecha"} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="c-date"
                  type="date"
                  value={cDate}
                  onChange={(e) => setCDate(e.target.value)}
                />
              </div>

              {cIsRange && (
                <div className="space-y-1">
                  <Label htmlFor="c-date-to">
                    Fecha hasta <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="c-date-to"
                    type="date"
                    min={cDate || undefined}
                    value={cDateTo}
                    onChange={(e) => setCDateTo(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Rango inclusivo en ambos extremos. Tope: 90 días. Las fechas que ya tengan cupos no se
                    duplican.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="c-capacity">
                  Capacidad (cupos) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="c-capacity"
                  type="number"
                  min={1}
                  value={cCapacity}
                  onChange={(e) => setCCapacity(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="c-active"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={cIsActive}
                  onChange={(e) => setCIsActive(e.target.checked)}
                />
                <Label htmlFor="c-active">Activo al crear</Label>
              </div>

              {createError && <p className="text-sm text-destructive">{createError}</p>}
            </div>
          )}

          <DialogFooter>
            {createResult ? (
              <Button onClick={() => setCreateOpen(false)}>Cerrar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>
                  Cancelar
                </Button>
                <Button onClick={submitCreate} disabled={createSubmitting}>
                  {createSubmitting ? "Guardando…" : "Crear"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar capacidad ─────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar capacidad</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editTarget && (
              <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Fecha:</span> <strong>{editTarget.date}</strong></p>
                <p><span className="text-muted-foreground">Reservados:</span> <strong>{editTarget.booked}</strong></p>
                <p className="text-xs text-muted-foreground">
                  La capacidad no puede ser menor que los cupos ya reservados.
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="e-capacity">
                Nueva capacidad <span className="text-destructive">*</span>
              </Label>
              <Input
                id="e-capacity"
                type="number"
                min={Math.max(1, editTarget?.booked ?? 1)}
                value={eCapacity}
                onChange={(e) => setECapacity(e.target.value)}
              />
            </div>

            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSubmitting}>
              Cancelar
            </Button>
            <Button onClick={submitEdit} disabled={editSubmitting}>
              {editSubmitting ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Reservas del día ─────────────────────────────────────────── */}
      <Dialog open={!!holdsSlot} onOpenChange={(v) => !v && setHoldsSlot(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Reservas — {holdsSlot?.date}
              {holdsSlot?.service_name ? ` · ${holdsSlot.service_name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            &quot;En compra&quot; ocupa el cupo mientras el cliente paga y vence con su carrito (2 h).
            &quot;Confirmada&quot; ya es una orden. &quot;Vencida&quot; (el carrito venció) y &quot;Liberada&quot;
            (orden cancelada, parada saltada o servicio quitado del carrito) ya devolvieron el cupo.
          </p>

          {holdsLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {holdsError && <p className="text-sm text-destructive">{holdsError}</p>}
          {!holdsLoading && !holdsError && holds.length === 0 && (
            <p className="text-sm text-muted-foreground">Nadie reservó este día.</p>
          )}
          {holds.length > 0 && (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Mascota</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Reservó</TableHead>
                    <TableHead>Vence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holds.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{userNames[h.user_id] ?? h.user_id.slice(0, 8)}</TableCell>
                      <TableCell>{petNames[h.pet_id] ?? h.pet_id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${holdStatusBadge(h.status)}`}>
                          {label(HOLD_STATUS_LABELS, h.status)}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">{fmtDateTime(h.created_at)}</TableCell>
                      <TableCell className="tabular-nums">
                        {h.status === "held" ? fmtDateTime(h.expires_at) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldsSlot(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
