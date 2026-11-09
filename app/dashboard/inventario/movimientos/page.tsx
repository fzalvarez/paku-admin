"use client";

// Inventario · Movimientos (paku-backend C-34, C-48, C-50). Nada se borra: un movimiento manual se puede editar (con
// historial) o anular (queda en el historial y deja de contar). La compra se registra con la cantidad real y el
// total pagado; el costo del insumo pasa al promedio ponderado.

import { Suspense, useCallback, useEffect, useState } from "react";
import { Ban, Download, History, Pencil, Plus } from "lucide-react";
import { DateRangeFilter, useDateRange } from "@/components/dashboard/DateRangeFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import { limaToday } from "@/lib/dates";
import { MOVEMENT_TYPE_LABELS } from "@/lib/labels";
import {
  getInventoryConfig,
  listMovements,
  listSupplies,
  qty,
  editMovement,
  listMovementEdits,
  registerMovement,
  soles,
  voidMovement,
  type MovementEdit,
  type InventoryConfig,
  type Movement,
  type MovementInput,
  type MovementPatch,
  type MovementType,
  type Supply,
} from "@/lib/services/inventory";
import { cn } from "@/lib/utils";

const TIPO_CLS: Record<MovementType, string> = {
  initial_stock: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  purchase: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  consumption: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  adjustment: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  waste: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};
const selectCls = "h-9 w-full rounded-md border bg-background px-2 text-sm";

// Opciones del formulario: el ajuste se separa en entrada y salida (el backend lo recibe con `direction`).
const OPCIONES: { key: string; label: string; type: MovementType; direction?: "in" | "out"; entra: boolean }[] = [
  { key: "purchase", label: "Compra (entrada)", type: "purchase", entra: true },
  { key: "adjustment_in", label: "Ajuste (entrada)", type: "adjustment", direction: "in", entra: true },
  { key: "adjustment_out", label: "Ajuste (salida)", type: "adjustment", direction: "out", entra: false },
  { key: "waste", label: "Merma (salida)", type: "waste", entra: false },
  { key: "consumption", label: "Consumo manual (salida)", type: "consumption", entra: false },
  { key: "initial_stock", label: "Stock inicial (entrada)", type: "initial_stock", entra: true },
];

export default function MovimientosPage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando movimientos...</p>}>
      <Movimientos />
    </Suspense>
  );
}

function Movimientos() {
  const [config, setConfig] = useState<InventoryConfig | null>(null);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tipo, setTipo] = useState("");
  const [supplyId, setSupplyId] = useState("");
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(500);
  const [showVoided, setShowVoided] = useState(false);
  const [voiding, setVoiding] = useState<Movement | null>(null);
  const [editing, setEditing] = useState<Movement | null>(null);
  const [history, setHistory] = useState<Movement | null>(null);
  const range = useDateRange();

  useEffect(() => {
    Promise.all([getInventoryConfig(), listSupplies()])
      .then(([cfg, list]) => {
        setConfig(cfg);
        setSupplies(list);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el inventario."));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setMovements(await listMovements({
        type: tipo, supply_id: supplyId, date_from: range.desde, date_to: range.hasta, limit,
        include_voided: showVoided || undefined,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los movimientos.");
    } finally {
      setLoading(false);
    }
  }, [tipo, supplyId, range.desde, range.hasta, limit, showVoided]);

  useEffect(() => {
    load();
  }, [load]);

  const costCenter = (code: string | null) => config?.cost_centers.find((c) => c.code === code)?.label ?? code ?? "—";

  // Exporta lo cargado con los filtros actuales (si hay más, "Ver más" antes de exportar).
  const exportar = () =>
    downloadCsv(`movimientos-paku-${limaToday()}.csv`, [
      ["numero", "fecha", "tipo", "codigo", "insumo", "cantidad", "unidad", "total_pagado", "costo_unidad", "costo", "ubicacion", "orden", "centro_costo", "lote", "vence", "usuario", "motivo", "estado", "anulado_por", "motivo_anulacion", "ultima_edicion", "editado_por"],
      ...movements.map((m) => [m.code, m.occurred_on,
        m.type === "adjustment" ? `Ajuste (${m.quantity >= 0 ? "entrada" : "salida"})` : m.type_label,
        m.sku, m.supply_name, m.quantity, m.consumption_unit,
        m.purchase_total == null ? "" : m.purchase_total.toFixed(2), m.unit_cost.toFixed(6), m.cost.toFixed(2),
        m.location ?? "", m.order_id ?? "", costCenter(m.cost_center), m.lot ?? "", m.expires_on ?? "",
        m.created_by_name ?? (m.created_by ? "" : "Sistema"), m.reason, m.voided_at ? "anulado" : "vigente",
        m.voided_by_name ?? "", m.void_reason ?? "", m.edited_at?.slice(0, 10) ?? "", m.edited_by_name ?? ""]),
    ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <DateRangeFilter range={range} />
          <select className={cn(selectCls, "w-auto")} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(MOVEMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={cn(selectCls, "w-auto")} value={supplyId} onChange={(e) => setSupplyId(e.target.value)}>
            <option value="">Todos los insumos</option>
            {supplies.map((s) => <option key={s.id} value={s.id}>{s.sku} · {s.name}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input type="checkbox" checked={showVoided} onChange={(e) => setShowVoided(e.target.checked)} />
            Ver anulados
          </label>
          <p className="flex-1 text-xs text-muted-foreground">
            El stock de cada insumo es la suma de sus movimientos vigentes. Un movimiento manual se puede editar (queda el
            historial de cambios) o anular (queda en el historial y deja de contar). Los consumos por servicio se registran
            solos al terminar cada orden y no se editan ni se anulan.
          </p>
          <Button variant="outline" onClick={exportar} disabled={!movements.length}>
            <Download className="size-4" /> Exportar CSV
          </Button>
          <Button onClick={() => setOpen(true)} disabled={!config || supplies.length === 0}>
            <Plus className="size-4" /> Registrar movimiento
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N.º</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Insumo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Centro de costo</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id} className={cn(m.voided_at && "opacity-60")}>
                  <TableCell className={cn("font-mono text-xs", m.voided_at && "line-through")}>{m.code}</TableCell>
                  <TableCell className="whitespace-nowrap">{m.occurred_on}</TableCell>
                  <TableCell>
                    <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", TIPO_CLS[m.type])}>
                      {m.type === "adjustment" ? `Ajuste (${m.quantity >= 0 ? "entrada" : "salida"})` : m.type_label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">{m.sku}</span> {m.supply_name}
                  </TableCell>
                  <TableCell className={cn("text-right font-semibold tabular-nums whitespace-nowrap", m.quantity < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                    <span className={cn(m.voided_at && "line-through")}>
                      {m.quantity > 0 ? "+" : ""}{qty(m.quantity)} {m.consumption_unit}
                    </span>
                    {m.purchase_total != null && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {soles(m.purchase_total)} pagado · S/ {m.unit_cost.toFixed(4)}/{m.consumption_unit}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{m.location ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{m.order_id ? m.order_id.slice(0, 8) : "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{costCenter(m.cost_center)}</TableCell>
                  <TableCell className="whitespace-nowrap">{m.created_by_name ?? (m.created_by ? "—" : "Sistema")}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.reason}
                    {m.voided_at && (
                      <span className="mt-0.5 block text-xs text-red-600 dark:text-red-400">
                        Anulado{m.voided_by_name ? ` por ${m.voided_by_name}` : ""} el {m.voided_at.slice(0, 10)}: {m.void_reason}
                      </span>
                    )}
                    {m.edited_at && (
                      <button type="button" className="mt-0.5 block text-xs text-primary hover:underline" onClick={() => setHistory(m)}>
                        Editado{m.edited_by_name ? ` por ${m.edited_by_name}` : ""} el {m.edited_at.slice(0, 10)} · ver cambios
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {m.can_edit && config && (
                        <Button variant="ghost" size="sm" onClick={() => setEditing(m)}>
                          <Pencil className="size-4" /> Editar
                        </Button>
                      )}
                      {m.can_void && (
                        <Button variant="ghost" size="sm" onClick={() => setVoiding(m)}>
                          <Ban className="size-4" /> Anular
                        </Button>
                      )}
                      {m.edited_at && !m.can_edit && (
                        <Button variant="ghost" size="sm" onClick={() => setHistory(m)} aria-label="Ver cambios">
                          <History className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-6 text-center text-muted-foreground">Sin movimientos.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between gap-3 pt-3 text-sm text-muted-foreground">
            <span>{loading ? "Cargando…" : `${movements.length} movimientos`}</span>
            {movements.length >= limit && (
              <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 500)}>Ver más</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {voiding && (
        <VoidMovementDialog
          movement={voiding}
          onClose={() => setVoiding(null)}
          onVoided={async () => {
            setVoiding(null);
            await load();
          }}
        />
      )}
      {open && config && (
        <MovementDialog
          config={config}
          supplies={supplies}
          onClose={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false);
            await load();
          }}
        />
      )}
      {editing && config && (
        <MovementDialog
          key={editing.id}
          config={config}
          supplies={supplies}
          movement={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
      {history && (
        <EditsDialog movement={history} supplies={supplies} config={config} onClose={() => setHistory(null)} />
      )}
    </div>
  );
}

/** Registrar (sin `movement`) o editar un movimiento manual. En la edición el tipo no cambia (salvo entrada/salida
 *  de un ajuste) y se pide el motivo de la edición. */
function MovementDialog({
  config, supplies, movement, onClose, onSaved,
}: { config: InventoryConfig; supplies: Supply[]; movement?: Movement; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!movement;
  const initialOpcion = movement
    ? OPCIONES.find((o) => o.type === movement.type && (o.type !== "adjustment" || o.direction === (movement.quantity >= 0 ? "in" : "out")))?.key ?? OPCIONES[0].key
    : OPCIONES[0].key;
  const active = supplies.filter((s) => s.is_active || s.id === movement?.supply_id);
  const [f, setF] = useState({
    opcion: initialOpcion,
    supply_id: movement?.supply_id ?? active[0]?.id ?? "",
    quantity: movement ? String(Math.abs(movement.quantity)) : "",
    total: movement?.purchase_total != null ? String(movement.purchase_total) : "",
    occurred_on: movement?.occurred_on ?? limaToday(),
    location: movement ? movement.location ?? "" : config.locations.includes("Paku 01") ? "Paku 01" : config.locations[0] ?? "",
    cost_center: movement ? movement.cost_center ?? "" : config.cost_centers[0]?.code ?? "",
    reason: movement?.reason ?? "",
    edit_reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const opcion = OPCIONES.find((o) => o.key === f.opcion) ?? OPCIONES[0];
  // En la edición solo se puede cambiar entre entrada y salida de un ajuste
  const opciones = isEdit ? OPCIONES.filter((o) => o.type === movement.type) : OPCIONES;
  const num = (v: string) => Number(v.replace(",", "."));
  const n = num(f.quantity);
  const supply = supplies.find((s) => s.id === f.supply_id);
  const unit = supply?.consumption_unit ?? "";
  // Compra: total pagado obligatorio. Stock inicial: opcional.
  const isPurchase = opcion.type === "purchase";
  const priced = isPurchase || opcion.type === "initial_stock";
  const total = f.total.trim() === "" ? null : num(f.total);
  const totalOk = total === null ? !isPurchase : Number.isFinite(total) && total >= 0;
  const valid = n > 0 && f.reason.trim().length > 0 && f.supply_id && totalOk && (!isEdit || f.edit_reason.trim());
  const unitCost = priced && total !== null && totalOk && n > 0 ? total / n : null;
  // Vista previa del promedio ponderado (solo al registrar; al editar lo recalcula el backend con todo el historial)
  const preview = (() => {
    if (isEdit || !supply || unitCost === null) return null;
    const stock = Math.max(supply.stock, 0);
    const avg = (stock * supply.unit_cost + n * unitCost) / (stock + n);
    return avg * supply.purchase_content;
  })();

  async function save() {
    setSaving(true);
    setError("");
    try {
      if (movement) {
        const patch: MovementPatch = { edit_reason: f.edit_reason.trim() };
        if (f.occurred_on !== movement.occurred_on) patch.occurred_on = f.occurred_on;
        if (f.supply_id !== movement.supply_id) patch.supply_id = f.supply_id;
        if (n !== Math.abs(movement.quantity)) patch.quantity = n;
        if (priced && total !== movement.purchase_total) patch.purchase_total = total;
        if (opcion.direction && opcion.direction !== (movement.quantity >= 0 ? "in" : "out")) patch.direction = opcion.direction;
        if (f.reason.trim() !== movement.reason) patch.reason = f.reason.trim();
        if ((f.location || null) !== movement.location) patch.location = f.location || null;
        if ((f.cost_center || null) !== movement.cost_center) patch.cost_center = f.cost_center || null;
        await editMovement(movement.id, patch);
      } else {
        const body: MovementInput = {
          type: opcion.type, direction: opcion.direction, supply_id: f.supply_id, quantity: n, occurred_on: f.occurred_on,
          ...(priced && total !== null ? { purchase_total: total } : {}),
          location: f.location || undefined, cost_center: f.cost_center || undefined, reason: f.reason.trim(),
        };
        await registerMovement(body);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el movimiento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{movement ? `Editar ${movement.code}` : "Registrar movimiento"}</DialogTitle>
          <DialogDescription>
            {movement
              ? "Los cambios quedan en el historial del movimiento. El stock se recalcula y, si es una entrada, también el costo promedio del insumo."
              : "Los consumos por servicio se generan solos al terminar cada orden."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <select className={selectCls} value={f.opcion} onChange={set("opcion")} disabled={opciones.length < 2}>
              {opciones.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Insumo</Label>
            <select className={selectCls} value={f.supply_id} onChange={set("supply_id")}>
              {active.map((s) => <option key={s.id} value={s.id}>{s.sku} · {s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cantidad ({unit})</Label>
            <Input inputMode="decimal" value={f.quantity} onChange={set("quantity")} placeholder={unit === "L" ? "100" : ""} />
          </div>
          {priced && (
            <div className="space-y-1">
              <Label className="text-xs">Total pagado (S/){isPurchase ? " *" : " (opcional)"}</Label>
              <Input inputMode="decimal" value={f.total} onChange={set("total")} placeholder="50.00" />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Fecha</Label>
            <Input type="date" max={limaToday()} value={f.occurred_on} onChange={set("occurred_on")} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ubicación</Label>
            <select className={selectCls} value={f.location} onChange={set("location")}>
              {isEdit && <option value="">—</option>}
              {config.locations.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Centro de costo</Label>
            <select className={selectCls} value={f.cost_center} onChange={set("cost_center")}>
              {isEdit && <option value="">—</option>}
              {config.cost_centers.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Motivo / comprobante *</Label>
            <Input value={f.reason} onChange={set("reason")} placeholder={opcion.entra ? "Factura F001-1234, conteo físico…" : "Conteo físico, derrame, vencimiento…"} />
          </div>
          {isEdit && (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Motivo de la edición *</Label>
              <Input value={f.edit_reason} onChange={set("edit_reason")} placeholder="Error de tipeo, comprobante equivocado…" />
            </div>
          )}
        </div>
        {priced && supply && (
          <p className="text-xs text-muted-foreground">
            {unitCost !== null
              ? `Costo: S/ ${unitCost.toFixed(4)} por ${unit}.` +
                (preview !== null
                  ? ` El costo del insumo pasa de ${soles(supply.purchase_cost)} a ${soles(preview)} por ${supply.purchase_unit} (promedio ponderado con el stock actual).`
                  : "")
              : isPurchase
                ? `Ingresa la cantidad real que entra (en ${unit}) y el total pagado según el comprobante.`
                : `Sin total se usa el costo actual: S/ ${supply.unit_cost.toFixed(4)} por ${unit}.`}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!valid || saving} onClick={save}>
            {saving ? "Guardando…" : movement ? "Guardar cambios" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CAMPOS: Record<string, string> = {
  occurred_on: "Fecha", supply_id: "Insumo", quantity: "Cantidad", unit_cost: "Costo por unidad",
  purchase_total: "Total pagado", reason: "Motivo / comprobante", location: "Ubicación", cost_center: "Centro de costo",
  lot: "Lote", expires_on: "Vence",
};

/** Historial de ediciones de un movimiento: quién, cuándo, por qué y cada valor antes y después. */
function EditsDialog({
  movement, supplies, config, onClose,
}: { movement: Movement; supplies: Supply[]; config: InventoryConfig | null; onClose: () => void }) {
  const [edits, setEdits] = useState<MovementEdit[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    listMovementEdits(movement.id)
      .then(setEdits)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el historial."));
  }, [movement.id]);
  const show = (field: string, v: unknown) => {
    if (v == null || v === "") return "—";
    if (field === "supply_id") {
      const s = supplies.find((x) => x.id === v);
      return s ? `${s.sku} · ${s.name}` : String(v);
    }
    if (field === "cost_center") return config?.cost_centers.find((c) => c.code === v)?.label ?? String(v);
    if (field === "purchase_total") return soles(Number(v));
    if (field === "unit_cost") return `S/ ${Number(v).toFixed(4)}`;
    if (field === "quantity") return qty(Number(v));
    return String(v);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cambios de {movement.code}</DialogTitle>
          <DialogDescription>{movement.type_label} · {movement.supply_name}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {edits === null && !error && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {edits?.length === 0 && <p className="text-sm text-muted-foreground">Sin ediciones.</p>}
        <ul className="space-y-3">
          {edits?.map((e) => (
            <li key={e.id} className="rounded-md border p-2 text-sm">
              <p className="font-medium">
                {e.edited_at.slice(0, 16).replace("T", " ")} · {e.edited_by_name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">Motivo: {e.reason}</p>
              <dl className="mt-1.5 space-y-0.5 text-xs">
                {Object.entries(e.changes).map(([k, c]) => (
                  <div key={k} className="flex flex-wrap gap-x-1.5">
                    <dt className="text-muted-foreground">{CAMPOS[k] ?? k}:</dt>
                    <dd>
                      <span className="line-through">{show(k, c.before)}</span> → <span className="font-medium">{show(k, c.after)}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function VoidMovementDialog({
  movement, onClose, onVoided,
}: { movement: Movement; onClose: () => void; onVoided: () => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setSaving(true);
    setError("");
    try {
      await voidMovement(movement.id, reason.trim());
      onVoided();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo anular el movimiento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anular {movement.code}</DialogTitle>
          <DialogDescription>
            {movement.type_label} de {qty(Math.abs(movement.quantity))} {movement.consumption_unit} · {movement.supply_name}
            {" "}({movement.occurred_on}). Queda en el historial como anulado y deja de contar en el stock.
            {movement.quantity > 0 && " El costo promedio del insumo se recalcula sin esta entrada."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label className="text-xs">Motivo de la anulación *</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Registro duplicado, cantidad equivocada…" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={!reason.trim() || saving} onClick={confirm}>
            {saving ? "Anulando…" : "Anular movimiento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
