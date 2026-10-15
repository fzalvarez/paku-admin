"use client";

// Fechas (C-28): el cupo es del DÍA y se comparte entre todos los servicios. Calendario mensual, panel del
// día (cupos, cerrar/reabrir, reservas), selección de varios días y "Abrir días" por rango y días de la semana.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { es } from "react-day-picker/locale";
import { apiFetch } from "@/lib/apiClient";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { HOLD_STATUS_LABELS, holdStatusBadge, label } from "@/lib/labels";
import { fmtYmd } from "@/lib/orders";
import { getUserPets } from "@/lib/services/petRecords";
import {
  getSlotHolds,
  listDays,
  openDays,
  setDayCapacity,
  setDayOpen,
  type DaySlot,
  type SlotHold,
} from "@/lib/services/availability";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre",
  "Octubre", "Noviembre", "Diciembre"];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7; // 0 = lunes

function dayTone(s: DaySlot | undefined) {
  if (!s) return "border-dashed bg-background text-muted-foreground";
  if (!s.is_active) return "bg-muted text-muted-foreground";
  if (s.available <= 0) return "border-red-300 bg-red-50 text-red-900";
  if (s.available <= Math.max(1, Math.ceil(s.capacity * 0.3))) return "border-amber-300 bg-amber-50 text-amber-900";
  return "border-emerald-300 bg-emerald-50 text-emerald-900";
}

export default function FechasPage() {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [slots, setSlots] = useState<Record<string, DaySlot>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openSheet, setOpenSheet] = useState<string | null>(null); // ymd del día abierto
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [openDialog, setOpenDialog] = useState(false);

  // Grilla: de lunes a domingo, 6 semanas
  const gridStart = useMemo(() => addDays(month, -mondayIndex(month)), [month]);
  const cells = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listDays(ymd(gridStart), 42);
      setSlots(Object.fromEntries(list.map((s) => [s.date, s])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los cupos.");
    } finally {
      setLoading(false);
    }
  }, [gridStart]);

  useEffect(() => {
    load();
  }, [load]);

  const monthSlots = Object.values(slots).filter(
    (s) => s.is_active && s.date.startsWith(ymd(month).slice(0, 7)),
  );
  const capacity = monthSlots.reduce((a, s) => a + s.capacity, 0);
  const booked = monthSlots.reduce((a, s) => a + s.booked, 0);

  const clickDay = (key: string) => {
    if (!selecting) return setOpenSheet(key);
    if (!slots[key]) return; // solo días abiertos o cerrados (existentes)
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fechas — Cupos por día"
        action={<Button onClick={() => setOpenDialog(true)}>+ Abrir días</Button>}
        className="mb-0"
      />
      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Cada día tiene <strong>un solo cupo para todos los servicios</strong>: si un día tiene 10 cupos, entre todos
        los baños se pueden reservar 10. Haz clic en un día para cambiar sus cupos, cerrarlo o ver sus reservas.
      </p>

      {/* Resumen del mes */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Cupos del mes" value={capacity} />
        <Stat label="Reservados" value={booked} />
        <Stat label="Ocupación" value={capacity ? `${Math.round((booked / capacity) * 100)} %` : "—"} />
      </div>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
                ←
              </Button>
              <p className="w-40 text-center font-semibold">
                {MONTHS[month.getMonth()]} {month.getFullYear()}
              </p>
              <Button variant="outline" size="sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
                →
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Legend />
              <Button
                variant={selecting ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelecting(!selecting);
                  setSelected([]);
                }}
              >
                {selecting ? "Terminar selección" : "Seleccionar varios días"}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className={cn("grid grid-cols-7 gap-1.5", loading && "opacity-60")}>
            {WEEKDAYS.map((w) => (
              <p key={w} className="pb-1 text-center text-xs font-medium text-muted-foreground">{w}</p>
            ))}
            {cells.map((d) => {
              const key = ymd(d);
              const s = slots[key];
              const inMonth = d.getMonth() === month.getMonth();
              const isSel = selected.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => clickDay(key)}
                  className={cn(
                    "flex min-h-20 flex-col rounded-md border p-1.5 text-left text-xs transition hover:ring-2 hover:ring-primary/40",
                    dayTone(s),
                    !inMonth && "opacity-40",
                    isSel && "ring-2 ring-primary",
                    key === ymd(today) && "outline outline-2 outline-primary/60",
                  )}
                >
                  <span className="text-sm font-semibold">{d.getDate()}</span>
                  <span className="mt-auto leading-tight">
                    {!s ? "Sin abrir" : !s.is_active ? "Cerrado" : `${s.available} de ${s.capacity} libres`}
                  </span>
                </button>
              );
            })}
          </div>

          {selecting && (
            <BulkBar
              selected={selected}
              slots={slots}
              onDone={() => {
                setSelected([]);
                load();
              }}
            />
          )}
        </CardContent>
      </Card>

      <DaySheet
        dayKey={openSheet}
        slot={openSheet ? slots[openSheet] : undefined}
        onClose={() => setOpenSheet(null)}
        onChanged={load}
        onOpenDay={() => setOpenDialog(true)}
      />
      <OpenDaysDialog open={openDialog} onClose={() => setOpenDialog(false)} onDone={load} />
    </div>
  );
}

function Stat({ label: text, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{text}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["bg-emerald-100 border-emerald-300", "Con cupo"],
    ["bg-amber-100 border-amber-300", "Pocos"],
    ["bg-red-100 border-red-300", "Lleno"],
    ["bg-muted", "Cerrado"],
  ];
  return (
    <div className="hidden items-center gap-3 text-xs text-muted-foreground md:flex">
      {items.map(([c, t]) => (
        <span key={t} className="flex items-center gap-1">
          <span className={cn("size-3 rounded border", c)} /> {t}
        </span>
      ))}
    </div>
  );
}

/* Acciones sobre varios días seleccionados */
function BulkBar({
  selected,
  slots,
  onDone,
}: {
  selected: string[];
  slots: Record<string, DaySlot>;
  onDone: () => void;
}) {
  const [cap, setCap] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const apply = async (fn: (s: DaySlot) => Promise<unknown>) => {
    setBusy(true);
    setMsg("");
    const failed: string[] = [];
    for (const key of selected) {
      try {
        await fn(slots[key]);
      } catch {
        failed.push(fmtYmd(key));
      }
    }
    setBusy(false);
    setMsg(failed.length ? `No se pudo cambiar: ${failed.join(", ")} (¿más reservas que cupos?)` : "Listo.");
    onDone();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm">
      <span className="font-medium">{selected.length} días seleccionados</span>
      <Input className="h-8 w-24" inputMode="numeric" placeholder="Cupos" value={cap} onChange={(e) => setCap(e.target.value)} />
      <Button
        size="sm"
        disabled={busy || !selected.length || !(Number(cap) > 0)}
        onClick={() => apply((s) => setDayCapacity(s.id, Number(cap)))}
      >
        Cambiar cupos
      </Button>
      <Button size="sm" variant="outline" disabled={busy || !selected.length} onClick={() => apply((s) => setDayOpen(s.id, false))}>
        Cerrar días
      </Button>
      <Button size="sm" variant="outline" disabled={busy || !selected.length} onClick={() => apply((s) => setDayOpen(s.id, true))}>
        Reabrir días
      </Button>
      {msg && <span className="text-muted-foreground">{msg}</span>}
    </div>
  );
}

/* Panel lateral de un día */
function DaySheet({
  dayKey,
  slot,
  onClose,
  onChanged,
  onOpenDay,
}: {
  dayKey: string | null;
  slot?: DaySlot;
  onClose: () => void;
  onChanged: () => void;
  onOpenDay: () => void;
}) {
  const [cap, setCap] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [holds, setHolds] = useState<SlotHold[] | null>(null);
  const [names, setNames] = useState<{ users: Record<string, string>; pets: Record<string, string> }>({
    users: {},
    pets: {},
  });

  useEffect(() => {
    setError("");
    setHolds(null);
    if (!slot) return;
    setCap(String(slot.capacity));
    let cancelled = false;
    (async () => {
      const list = await getSlotHolds(slot.id).catch(() => []);
      if (cancelled) return;
      setHolds(list);
      const users: Record<string, string> = {};
      const pets: Record<string, string> = {};
      try {
        const res = await apiFetch("/admin/users?role=user");
        if (res.ok) {
          for (const u of (await res.json()) as { id: string; first_name?: string; last_name?: string; email?: string }[]) {
            users[u.id] = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || u.id.slice(0, 8);
          }
        }
        await Promise.all(
          [...new Set(list.map((h) => h.user_id))].map(async (id) => {
            for (const p of await getUserPets(id).catch(() => [])) pets[p.id] = p.name;
          }),
        );
      } finally {
        if (!cancelled) setNames({ users, pets });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slot]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!dayKey} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{dayKey ? fmtYmd(dayKey) : ""}</SheetTitle>
          <SheetDescription>Cupo compartido por todos los servicios.</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          {!slot ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">Este día todavía no tiene cupos.</p>
              <Button
                onClick={() => {
                  onClose();
                  onOpenDay();
                }}
              >
                Abrir días
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Mini label="Cupos" value={slot.capacity} />
                <Mini label="Reservados" value={slot.booked} />
                <Mini label="Libres" value={slot.is_active ? slot.available : "Cerrado"} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="day-cap">Cupos del día</Label>
                <div className="flex gap-2">
                  <Input id="day-cap" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} />
                  <Button
                    disabled={busy || !(Number(cap) > 0) || Number(cap) === slot.capacity}
                    onClick={() => run(() => setDayCapacity(slot.id, Number(cap)))}
                  >
                    Guardar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">No puede ser menor que los ya reservados ({slot.booked}).</p>
              </div>

              <Button
                variant={slot.is_active ? "outline" : "default"}
                disabled={busy}
                onClick={() => run(() => setDayOpen(slot.id, !slot.is_active))}
              >
                {slot.is_active ? "Cerrar este día" : "Reabrir este día"}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="space-y-2">
                <p className="text-sm font-semibold">Reservas del día</p>
                {holds === null ? (
                  <p className="text-sm text-muted-foreground">Cargando…</p>
                ) : holds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin reservas.</p>
                ) : (
                  holds.map((h) => (
                    <div key={h.id} className="rounded-md border p-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{h.service_name ?? "Servicio"}</span>
                        <span className={cn("rounded px-2 py-0.5 text-xs font-medium", holdStatusBadge(h.status))}>
                          {label(HOLD_STATUS_LABELS, h.status)}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        {names.pets[h.pet_id] ?? "Mascota"} · {names.users[h.user_id] ?? h.user_id.slice(0, 8)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Mini({ label: text, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{text}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/* Abrir días: rango + días de la semana + cupos */
function OpenDaysDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [range, setRange] = useState<DateRange | undefined>();
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [cap, setCap] = useState("10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const count = useMemo(() => {
    if (!range?.from) return 0;
    const to = range.to ?? range.from;
    let n = 0;
    for (let d = range.from; d <= to; d = addDays(d, 1)) if (days.includes(mondayIndex(d))) n++;
    return n;
  }, [range, days]);

  const submit = async () => {
    if (!range?.from) return;
    setBusy(true);
    setError("");
    try {
      const r = await openDays({
        date_from: ymd(range.from),
        date_to: ymd(range.to ?? range.from),
        weekdays: days,
        capacity: Number(cap),
      });
      setResult(
        `Se abrieron ${r.created.length} días` + (r.skipped.length ? `; ${r.skipped.length} ya estaban abiertos (no se cambiaron).` : "."),
      );
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron abrir los días.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setResult("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir días</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Desde – hasta</Label>
            <Calendar
              mode="range"
              locale={es}
              weekStartsOn={1}
              selected={range}
              onSelect={setRange}
              disabled={{ before: new Date() }}
              className="mx-auto rounded-md border"
            />
            <p className="mt-1 text-center text-xs text-muted-foreground">
              {range?.from ? `${fmtYmd(ymd(range.from))} → ${fmtYmd(ymd(range.to ?? range.from))}` : "Elige el primer y el último día"}
            </p>
          </div>

          <div>
            <Label>Días de la semana</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {WEEKDAYS.map((w, i) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setDays((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i].sort()))}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-sm",
                    days.includes(i) ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="open-cap">Cupos por día (todos los servicios)</Label>
            <Input id="open-cap" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} />
          </div>

          <p className="rounded-md bg-muted/40 px-3 py-2 text-sm">
            Se abrirán <strong>{count}</strong> días con <strong>{Number(cap) > 0 ? cap : "—"}</strong> cupos cada uno.
            Los días que ya estén abiertos no se cambian.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {result && <p className="text-sm text-emerald-700">{result}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close}>
              {result ? "Cerrar" : "Cancelar"}
            </Button>
            {!result && (
              <Button disabled={busy || count === 0 || !(Number(cap) > 0)} onClick={submit}>
                {busy ? "Abriendo…" : "Abrir días"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
