"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/apiClient";
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

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Slot {
  id: string;
  service_id: string;
  // Optional: el backend en prod aún no despliega este campo (pendiente el
  // mismo deploy que trae /admin/availability/bulk) — mostramos fallback.
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

// ── Helper de errores API ──────────────────────────────────────────────────────

async function parseApiError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.detail) {
      if (Array.isArray(body.detail) && body.detail.length > 0)
        return body.detail[0].msg || String(body.detail[0]);
      return String(body.detail);
    }
    if (body?.message) return String(body.message);
  } catch { /* ignore */ }
  return `Error ${res.status}`;
}

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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      <PageHeader
        title="Fechas — Disponibilidad"
        action={<Button onClick={openCreate}>+ Nuevo slot</Button>}
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
        <p className="text-sm text-muted-foreground">No hay slots para los filtros seleccionados.</p>
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
            <DialogTitle>Nuevo slot de disponibilidad</DialogTitle>
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
                    Rango inclusivo en ambos extremos. Tope: 90 días. Las fechas que ya tengan slot no se
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
                  Si reduces la capacidad por debajo de los reservados, los disponibles quedarán en 0.
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
                min={1}
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

    </div>
  );
}
