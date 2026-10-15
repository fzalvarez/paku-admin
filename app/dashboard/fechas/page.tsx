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
              const isToday = key === ymd(today);
              return (
                <button
                  key={key}
                  onClick={() => clickDay(key)}
                  disabled={selecting && !s}
                  className={cn(
                    "relative flex min-h-20 flex-col rounded-md border p-1.5 text-left text-xs transition",
                    isSel
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : cn(dayTone(s), "hover:ring-2 hover:ring-primary/30"),
                    !inMonth && !isSel && "opacity-40",
                    selecting && !s && "cursor-not-allowed",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isToday && !isSel && "flex size-6 items-center justify-center rounded-full bg-foreground text-background",
                      )}
                    >
                      {d.getDate()}
                    </span>
                    {isToday && <span className="text-[10px] font-semibold uppercase">Hoy</span>}
                  </span>
                  {isSel && (
                    <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-background text-xs font-bold text-primary">
                      ✓
                    </span>
                  )}
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
              onRemove={(k) => setSelected((p) => p.filter((x) => x !== k))}
              onClear={() => setSelected([])}
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
  onRemove,
  onClear,
  onDone,
}: {
  selected: string[];
  slots: Record<string, DaySlot>;
  onRemove: (key: string) => void;
  onClear: () => void;
  onDone: () => void;
}) {
  const [cap, setCap] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const sorted = [...selected].sort();
  const chosen = sorted.map((k) => slots[k]).filter(Boolean);
  const totalCap = chosen.reduce((a, s) => a + s.capacity, 0);
  const totalBooked = chosen.reduce((a, s) => a + s.booked, 0);
  const closed = chosen.filter((s) => !s.is_active).length;
  const maxBooked = Math.max(0, ...chosen.map((s) => s.booked));

  const apply = async (fn: (s: DaySlot) => Promise<unknown>, done: string) => {
    setBusy(true);
    setMsg("");
    const failed: string[] = [];
    for (const key of sorted) {
      try {
        await fn(slots[key]);
      } catch {
        failed.push(fmtYmd(key));
      }
    }
    setBusy(false);
    setMsg(failed.length ? `No se pudo cambiar: ${failed.join(", ")} (tienen más reservas que esos cupos).` : done);
    onDone();
  };

  return (
    <div className="sticky bottom-2 z-10 space-y-2 rounded-lg border-2 border-primary/40 bg-background p-3 text-sm shadow-lg">
      {selected.length === 0 ? (
        <p className="text-muted-foreground">
          Haz clic en los días del calendario para seleccionarlos (solo días con cupos creados).
          {msg && <span className="ml-2 font-medium text-foreground">{msg}</span>}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>
              <strong>{selected.length} {selected.length === 1 ? "día seleccionado" : "días seleccionados"}</strong>
              <span className="text-muted-foreground">
                {" "}· {totalCap} cupos · {totalBooked} reservados{closed ? ` · ${closed} cerrados` : ""}
              </span>
            </p>
            <button className="text-xs text-muted-foreground underline" onClick={onClear}>
              Quitar selección
            </button>
          </div>
          <div className="flex max-h-20 flex-wrap gap-1 overflow-y-auto">
            {sorted.map((k) => (
              <span key={k} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {fmtYmd(k)}
                <button aria-label={`Quitar ${fmtYmd(k)}`} className="font-bold" onClick={() => onRemove(k)}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t pt-2">
            <span className="text-muted-foreground">Cupos por día:</span>
            <Input className="h-8 w-20" inputMode="numeric" placeholder="10" value={cap} onChange={(e) => setCap(e.target.value)} />
            <Button
              size="sm"
              disabled={busy || !(Number(cap) > 0)}
              onClick={() => apply((s) => setDayCapacity(s.id, Number(cap)), `Cupos actualizados a ${cap}.`)}
            >
              Cambiar cupos
            </Button>
            <span className="mx-1 h-5 w-px bg-border" />
            <Button size="sm" variant="outline" disabled={busy} onClick={() => apply((s) => setDayOpen(s.id, false), "Días cerrados.")}>
              Cerrar días
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => apply((s) => setDayOpen(s.id, true), "Días reabiertos.")}>
              Reabrir días
            </Button>
          </div>
          {maxBooked > 0 && (
            <p className="text-xs text-muted-foreground">El mínimo de cupos es {maxBooked} (lo ya reservado en uno de los días).</p>
          )}
          {msg && <p className="text-xs font-medium text-emerald-700">{msg}</p>}
        </>
      )}
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

/* Abrir días: rango + días de la semana + cupos. Marca los días ya abiertos y separa nuevos de existentes. */
const WEEKDAY_PRESETS: { label: string; days: number[] }[] = [
  { label: "Todos", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Lun a Sáb", days: [0, 1, 2, 3, 4, 5] },
  { label: "Lun a Vie", days: [0, 1, 2, 3, 4] },
];

function OpenDaysDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [range, setRange] = useState<DateRange | undefined>();
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [cap, setCap] = useState("10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [existing, setExisting] = useState<Set<string>>(new Set());

  // Días ya abiertos de los próximos 90 días: se marcan en el calendario y no se tocan
  useEffect(() => {
    if (!open) return;
    listDays(ymd(new Date()), 90)
      .then((l) => setExisting(new Set(l.map((s) => s.date))))
      .catch(() => setExisting(new Set()));
  }, [open, result]);

  const plan = useMemo(() => {
    const out = { fresh: [] as string[], already: 0 };
    if (!range?.from) return out;
    const to = range.to ?? range.from;
    for (let d = range.from; d <= to; d = addDays(d, 1)) {
      if (!days.includes(mondayIndex(d))) continue;
      if (existing.has(ymd(d))) out.already++;
      else out.fresh.push(ymd(d));
    }
    return out;
  }, [range, days, existing]);

  const today = new Date();
  const setPreset = (from: Date, to: Date) => setRange({ from, to });
  const rangePresets: { label: string; apply: () => void }[] = [
    { label: "Lo que queda del mes", apply: () => setPreset(today, new Date(today.getFullYear(), today.getMonth() + 1, 0)) },
    {
      label: "Próximo mes",
      apply: () => setPreset(new Date(today.getFullYear(), today.getMonth() + 1, 1), new Date(today.getFullYear(), today.getMonth() + 2, 0)),
    },
    { label: "Próximas 4 semanas", apply: () => setPreset(today, addDays(today, 27)) },
  ];

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
      setResult(`Listo: se abrieron ${r.created.length} días con ${cap} cupos.`);
      setRange(undefined);
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

  const existingDates = [...existing].map((k) => {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d);
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Abrir días</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Crea los cupos de los días en que habrá servicio. El cupo es para todos los baños juntos.
          </p>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[auto_1fr]">
          {/* 1. Fechas */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">1. Elige las fechas</p>
            <div className="flex flex-wrap gap-1">
              {rangePresets.map((p) => (
                <button key={p.label} type="button" onClick={p.apply} className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted">
                  {p.label}
                </button>
              ))}
            </div>
            <Calendar
              mode="range"
              locale={es}
              weekStartsOn={1}
              selected={range}
              onSelect={setRange}
              disabled={{ before: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }}
              modifiers={{ abierto: existingDates }}
              modifiersClassNames={{ abierto: "underline decoration-emerald-500 decoration-2 underline-offset-4" }}
              className="rounded-md border"
            />
            <p className="text-xs text-muted-foreground">
              Clic en el primer día y luego en el último. <span className="underline decoration-emerald-500 decoration-2 underline-offset-2">Subrayado</span> = ya abierto.
            </p>
          </div>

          {/* 2. Días y cupos */}
          <div className="space-y-4">
            <div className="rounded-md border p-3 text-sm">
              <p className="text-xs text-muted-foreground">Rango</p>
              <p className="font-medium">
                {range?.from ? (
                  <>
                    {fmtYmd(ymd(range.from))} <span className="text-muted-foreground">→</span> {fmtYmd(ymd(range.to ?? range.from))}
                  </>
                ) : (
                  <span className="text-muted-foreground">Sin elegir</span>
                )}
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-semibold">2. ¿Qué días de la semana hay servicio?</p>
              <div className="flex flex-wrap gap-1">
                {WEEKDAYS.map((w, i) => {
                  const on = days.includes(i);
                  return (
                    <button
                      key={w}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDays((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i].sort()))}
                      className={cn(
                        "w-11 rounded-md border py-1 text-sm",
                        on ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground line-through",
                      )}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1">
                {WEEKDAY_PRESETS.map((p) => (
                  <button key={p.label} type="button" onClick={() => setDays(p.days)} className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="open-cap" className="text-sm font-semibold">3. Cupos por día</Label>
              <div className="flex items-center gap-2">
                <Input id="open-cap" className="w-24" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value)} />
                <span className="text-xs text-muted-foreground">para todos los servicios juntos</span>
              </div>
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-sm">
              {!range?.from ? (
                <p className="text-muted-foreground">Elige las fechas para ver el resumen.</p>
              ) : (
                <>
                  <p>
                    Se abrirán <strong>{plan.fresh.length}</strong> {plan.fresh.length === 1 ? "día" : "días"} con{" "}
                    <strong>{Number(cap) > 0 ? cap : "—"}</strong> cupos ({Number(cap) > 0 ? plan.fresh.length * Number(cap) : 0} en total).
                  </p>
                  {plan.already > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {plan.already} {plan.already === 1 ? "día ya está abierto" : "días ya están abiertos"} y no se cambian (edítalos desde el calendario).
                    </p>
                  )}
                </>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {result && <p className="text-sm font-medium text-emerald-700">{result}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close}>
                {result ? "Cerrar" : "Cancelar"}
              </Button>
              <Button disabled={busy || plan.fresh.length === 0 || !(Number(cap) > 0)} onClick={submit}>
                {busy ? "Abriendo…" : `Abrir ${plan.fresh.length || ""} días`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
