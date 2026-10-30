"use client";

// Inventario · Movimientos (paku-backend C-34). Nada se borra: las correcciones son movimientos de ajuste.

import { Suspense, useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { DateRangeFilter, useDateRange } from "@/components/dashboard/DateRangeFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { limaToday } from "@/lib/dates";
import { MOVEMENT_TYPE_LABELS } from "@/lib/labels";
import {
  getInventoryConfig,
  listMovements,
  listSupplies,
  qty,
  registerMovement,
  type InventoryConfig,
  type Movement,
  type MovementInput,
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
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los movimientos.");
    } finally {
      setLoading(false);
    }
  }, [tipo, supplyId, range.desde, range.hasta, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const costCenter = (code: string | null) => config?.cost_centers.find((c) => c.code === code)?.label ?? code ?? "—";

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
          <p className="flex-1 text-xs text-muted-foreground">
            El stock de cada insumo es la suma de sus movimientos. Nada se elimina: los errores se corrigen con un ajuste.
            Los consumos por servicio se registran solos al terminar cada orden.
          </p>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.code}</TableCell>
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
                    {m.quantity > 0 ? "+" : ""}{qty(m.quantity)} {m.consumption_unit}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{m.location ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{m.order_id ? m.order_id.slice(0, 8) : "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{costCenter(m.cost_center)}</TableCell>
                  <TableCell className="whitespace-nowrap">{m.created_by_name ?? (m.created_by ? "—" : "Sistema")}</TableCell>
                  <TableCell className="text-muted-foreground">{m.reason}</TableCell>
                </TableRow>
              ))}
              {!loading && movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">Sin movimientos.</TableCell>
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

      {open && config && (
        <NewMovementDialog
          config={config}
          supplies={supplies.filter((s) => s.is_active)}
          onClose={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function NewMovementDialog({
  config, supplies, onClose, onSaved,
}: { config: InventoryConfig; supplies: Supply[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    opcion: OPCIONES[0].key,
    supply_id: supplies[0]?.id ?? "",
    quantity: "",
    occurred_on: limaToday(),
    location: config.locations.includes("Paku 01") ? "Paku 01" : config.locations[0] ?? "",
    cost_center: config.cost_centers[0]?.code ?? "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const opcion = OPCIONES.find((o) => o.key === f.opcion) ?? OPCIONES[0];
  const n = Number(f.quantity.replace(",", "."));
  const valid = n > 0 && f.reason.trim().length > 0 && f.supply_id;
  const unit = supplies.find((s) => s.id === f.supply_id)?.consumption_unit ?? "";

  async function save() {
    setSaving(true);
    setError("");
    const body: MovementInput = {
      type: opcion.type, direction: opcion.direction, supply_id: f.supply_id, quantity: n, occurred_on: f.occurred_on,
      location: f.location || undefined, cost_center: f.cost_center || undefined, reason: f.reason.trim(),
    };
    try {
      await registerMovement(body);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el movimiento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>Los consumos por servicio se generan solos al terminar cada orden.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <select className={selectCls} value={f.opcion} onChange={set("opcion")}>
              {OPCIONES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Insumo</Label>
            <select className={selectCls} value={f.supply_id} onChange={set("supply_id")}>
              {supplies.map((s) => <option key={s.id} value={s.id}>{s.sku} · {s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cantidad ({unit})</Label>
            <Input inputMode="decimal" value={f.quantity} onChange={set("quantity")} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fecha</Label>
            <Input type="date" max={limaToday()} value={f.occurred_on} onChange={set("occurred_on")} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ubicación</Label>
            <select className={selectCls} value={f.location} onChange={set("location")}>
              {config.locations.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Centro de costo</Label>
            <select className={selectCls} value={f.cost_center} onChange={set("cost_center")}>
              {config.cost_centers.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Motivo / comprobante *</Label>
            <Input value={f.reason} onChange={set("reason")} placeholder={opcion.entra ? "Factura F001-1234, conteo físico…" : "Conteo físico, derrame, vencimiento…"} />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!valid || saving} onClick={save}>{saving ? "Registrando…" : "Registrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
