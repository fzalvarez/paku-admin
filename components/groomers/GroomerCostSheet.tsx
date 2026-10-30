"use client";

// Costo del groomer (paku-backend C-37): sueldo + cargos de la empresa, horas al mes y bolsón de manejo y
// reposo → costo por hora de servicio, que costea los minutos de las recetas. Cada registro rige desde una
// fecha; guardar en una fecha que ya tiene registro lo corrige.

import { useEffect, useState } from "react";
import { Info, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { limaToday } from "@/lib/dates";
import { COST_ITEM_KIND_LABELS } from "@/lib/labels";
import { fmtYmd } from "@/lib/orders";
import {
  getGroomerCostHistory,
  saveGroomerCost,
  type CostItem,
  type CostItemKind,
  type CostProfile,
} from "@/lib/services/groomerCosts";
import { soles } from "@/lib/services/inventory";
import { cn } from "@/lib/utils";

type ItemForm = { label: string; kind: CostItemKind; value: string };

const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";
const num = (s: string) => Number(s.replace(",", "."));

interface Props {
  groomer: { id: string; name: string } | null;
  suggestedItems: CostItem[];
  onClose: () => void;
  onSaved: () => void;
}

export function GroomerCostSheet({ groomer, suggestedItems, onClose, onSaved }: Props) {
  return (
    <Sheet open={!!groomer} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        {groomer && <CostPanel key={groomer.id} groomer={groomer} suggestedItems={suggestedItems} onSaved={onSaved} />}
      </SheetContent>
    </Sheet>
  );
}

function CostPanel({ groomer, suggestedItems, onSaved }: Omit<Props, "groomer" | "onClose"> & { groomer: { id: string; name: string } }) {
  const [history, setHistory] = useState<CostProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const [from, setFrom] = useState(limaToday());
  const [salary, setSalary] = useState("");
  const [items, setItems] = useState<ItemForm[]>([]);
  const [hours, setHours] = useState("192");
  const [driving, setDriving] = useState("0");
  const [notes, setNotes] = useState("");

  // Parte del último registro (o de los cargos sugeridos si es el primero)
  const fill = (h: CostProfile[]) => {
    const base = h.find((p) => p.is_current) ?? h[0];
    setSalary(base ? String(base.base_salary) : "");
    setItems((base ? base.items : suggestedItems).map((i) => ({ label: i.label, kind: i.kind, value: String(i.value) })));
    setHours(base ? String(base.monthly_hours) : "192");
    setDriving(base ? String(base.driving_rest_hours) : "0");
    setNotes("");
  };

  async function load() {
    setLoading(true);
    setError("");
    try {
      const h = await getGroomerCostHistory(groomer.id);
      setHistory(h);
      fill(h);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el costo del groomer.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groomer.id]);

  const current = history.find((p) => p.is_current) ?? null;
  const replaces = history.find((p) => p.effective_from === from);
  const valid =
    !!from && num(salary) > 0 && num(hours) > 0 && num(driving) >= 0 && num(driving) < num(hours) &&
    items.every((i) => i.label.trim() && i.value.trim() !== "" && num(i.value) >= 0);

  async function handleSave() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await saveGroomerCost(groomer.id, {
        effective_from: from,
        base_salary: num(salary),
        items: items.map((i) => ({ label: i.label.trim(), kind: i.kind, value: num(i.value) })),
        monthly_hours: num(hours),
        driving_rest_hours: num(driving),
        notes: notes.trim() || undefined,
      });
      setNotice(replaces ? "Registro corregido." : "Registro guardado.");
      await load();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  const setItem = (idx: number, patch: Partial<ItemForm>) =>
    setItems((prev) => prev.map((it, k) => (k === idx ? { ...it, ...patch } : it)));

  return (
    <>
      <SheetHeader>
        <SheetTitle>Costo de {groomer.name}</SheetTitle>
        <SheetDescription>Cuánto le cuesta a Paku una hora de servicio de este groomer.</SheetDescription>
      </SheetHeader>

      <div className="space-y-5 px-4 pb-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <>
            {current ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Kpi label="Costo mensual" value={soles(current.monthly_cost)} sub={`Sueldo ${soles(current.base_salary)}`} />
                <Kpi label="Horas de servicio" value={`${current.service_hours} h`} sub={`de ${current.monthly_hours} h al mes`} />
                <Kpi label="Costo por hora de servicio" value={soles(current.cost_per_service_hour)} strong />
                <Kpi label="Rige desde" value={fmtYmd(current.effective_from)} />
              </div>
            ) : (
              <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Sin registro de costo: las recetas usan la tarifa de los otros groomers (o ninguna si nadie tiene).
              </p>
            )}

            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Info className="size-4" /> ¿Por qué no se usa solo el sueldo?
              </p>
              <p>
                Además del sueldo, la empresa paga cargos propios: <strong>EsSalud</strong> (9 % sobre el sueldo, lo
                pone la empresa, no se descuenta al groomer), <strong>vacaciones</strong> y, según el régimen,
                gratificaciones o CTS. El costo por hora usa todo lo que la empresa paga al mes.
              </p>
              <p>
                El <strong>bolsón de manejo y reposo</strong> son las horas del mes en que no atiende (trasladarse entre
                casas, descansar). Se restan de las horas de servicio: así su costo queda repartido en cada hora de
                servicio, y los minutos de las recetas se costean con <em>costo mensual ÷ horas de servicio</em>.
              </p>
              <p>
                Los cargos dependen del régimen laboral de la empresa (micro o pequeña empresa del REMYPE); el régimen
                MYPE tributario es de impuestos. Confirma los porcentajes con el contador.
              </p>
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">
                {current ? "Nuevo registro (cambio de sueldo u horas)" : "Primer registro"}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Rige desde">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="Sueldo mensual (S/)">
                  <Input inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="2400" />
                </Field>
                <Field label="Horas de trabajo al mes">
                  <Input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
                </Field>
                <Field label="Bolsón de manejo y reposo (h al mes)">
                  <Input inputMode="decimal" value={driving} onChange={(e) => setDriving(e.target.value)} />
                </Field>
              </div>
              {replaces && (
                <p className="text-xs text-amber-700">Ya hay un registro desde esa fecha: al guardar se corrige.</p>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Cargos de la empresa</p>
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_9rem_6rem_auto] items-center gap-2">
                    <Input aria-label="Cargo" value={it.label} onChange={(e) => setItem(idx, { label: e.target.value })} />
                    <select
                      aria-label="Tipo de cargo"
                      className={selectCls}
                      value={it.kind}
                      onChange={(e) => setItem(idx, { kind: e.target.value as CostItemKind })}
                    >
                      {Object.entries(COST_ITEM_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <Input aria-label="Valor" inputMode="decimal" value={it.value} onChange={(e) => setItem(idx, { value: e.target.value })} />
                    <Button size="icon" variant="ghost" aria-label="Quitar cargo" onClick={() => setItems((p) => p.filter((_, k) => k !== idx))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setItems((p) => [...p, { label: "", kind: "percent", value: "" }])}>
                  <Plus className="size-4" /> Agregar cargo
                </Button>
              </div>

              <Field label="Nota (opcional)">
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Aumento de octubre" />
              </Field>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {notice && !error && <p className="text-sm text-muted-foreground">{notice}</p>}
              <Button onClick={handleSave} disabled={!valid || saving}>
                {saving ? "Guardando…" : replaces ? "Corregir registro" : "Guardar registro"}
              </Button>
            </section>

            {history.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Historial</h3>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Desde</TableHead>
                        <TableHead className="text-right">Sueldo</TableHead>
                        <TableHead className="text-right">Cargos</TableHead>
                        <TableHead className="text-right">Costo mensual</TableHead>
                        <TableHead className="text-right">H. servicio</TableHead>
                        <TableHead className="text-right">S/ / h servicio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((p) => (
                        <TableRow key={p.id} className={cn(p.is_current && "bg-primary/5 font-medium")}>
                          <TableCell className="whitespace-nowrap">
                            {fmtYmd(p.effective_from)}
                            {p.is_current && <span className="ml-1 text-xs text-primary">vigente</span>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{soles(p.base_salary)}</TableCell>
                          <TableCell className="text-right tabular-nums" title={p.items.map((i) => `${i.label}: ${soles(i.monthly_amount)}`).join("\n")}>
                            {soles(p.monthly_cost - p.base_salary)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{soles(p.monthly_cost)}</TableCell>
                          <TableCell className="text-right tabular-nums">{p.service_hours}</TableCell>
                          <TableCell className="text-right tabular-nums">{soles(p.cost_per_service_hour)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Kpi({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-3", strong && "border-primary/40 bg-primary/5")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
