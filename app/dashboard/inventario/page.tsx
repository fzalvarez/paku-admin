"use client";

// Inventario · Insumos (paku-backend C-34): maestro de insumos con stock (suma de movimientos), estado y valor.

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, PackageMinus, Plus, Receipt, Search } from "lucide-react";
import { DateRangeFilter, useDateRange } from "@/components/dashboard/DateRangeFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SUPPLY_STATUS_LABELS, label } from "@/lib/labels";
import {
  createSupply,
  getInventoryConfig,
  getInventorySummary,
  listMovements,
  listSupplies,
  qty,
  soles,
  updateSupply,
  type InventoryConfig,
  type InventorySummary,
  type Movement,
  type Supply,
  type SupplyInput,
  type SupplyStatus,
} from "@/lib/services/inventory";
import { cn } from "@/lib/utils";

const STATUS_CLS: Record<SupplyStatus, string> = {
  ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  low: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  out: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};
const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

export default function InsumosPage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando insumos...</p>}>
      <Insumos />
    </Suspense>
  );
}

function Insumos() {
  const [config, setConfig] = useState<InventoryConfig | null>(null);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [est, setEst] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [detail, setDetail] = useState<Supply | null>(null);
  const [editing, setEditing] = useState<Supply | "new" | null>(null);
  const range = useDateRange();

  const load = useCallback(async () => {
    setError("");
    try {
      const [cfg, list] = await Promise.all([getInventoryConfig(), listSupplies()]);
      setConfig(cfg);
      setSupplies(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los insumos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // El resumen del consumo depende de las fechas; el valor y el stock son al día de hoy.
  useEffect(() => {
    getInventorySummary({ date_from: range.desde, date_to: range.hasta })
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [range.desde, range.hasta, supplies]);

  const rows = useMemo(
    () =>
      supplies.filter(
        (s) =>
          (showInactive || s.is_active) &&
          (!q || `${s.sku} ${s.name}`.toLowerCase().includes(q.toLowerCase())) &&
          (!cat || s.category === cat) &&
          (!est || s.status === est),
      ),
    [supplies, q, cat, est, showInactive],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <DateRangeFilter range={range} />
          <p className="text-xs text-muted-foreground">
            Las fechas aplican al consumo. El stock y el valor del inventario son al día de hoy.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Boxes} label="Valor del inventario" value={soles(summary?.inventory_value)} />
        <Stat
          icon={AlertTriangle}
          label="Bajo mínimo o agotados"
          value={summary ? String(summary.supplies_below_min) : "—"}
          tone={summary && summary.supplies_below_min > 0 ? "warn" : undefined}
        />
        <Stat
          icon={PackageMinus}
          label={range.active ? "Consumo del período" : "Consumo total"}
          value={soles(summary?.consumption_cost)}
        />
        <Stat
          icon={Receipt}
          label={`Insumos por servicio (prom. de ${summary?.orders_with_consumption ?? 0})`}
          value={soles(summary?.avg_cost_per_order)}
        />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar por código o nombre" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={selectCls} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {config?.categories.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <select className={selectCls} value={est} onChange={(e) => setEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(SUPPLY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Ver desactivados
          </label>
          <Button onClick={() => setEditing("new")} disabled={!config}>
            <Plus className="size-4" /> Nuevo insumo
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Insumo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Costo / unidad</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id} className={cn("cursor-pointer", !s.is_active && "opacity-60")} onClick={() => setDetail(s)}>
                  <TableCell className="font-mono text-xs">{s.sku}</TableCell>
                  <TableCell className="font-medium">
                    {s.name}
                    {!s.is_active && <span className="ml-1 text-xs text-muted-foreground">(desactivado)</span>}
                  </TableCell>
                  <TableCell>{s.category_label}</TableCell>
                  <TableCell className="text-right tabular-nums">{qty(s.stock)} {s.consumption_unit}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{qty(s.min_stock)}</TableCell>
                  <TableCell className="text-right tabular-nums">S/ {s.unit_cost.toFixed(4)} / {s.consumption_unit}</TableCell>
                  <TableCell className="text-right tabular-nums">{soles(s.value)}</TableCell>
                  <TableCell>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_CLS[s.status])}>
                      {label(SUPPLY_STATUS_LABELS, s.status)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                    {supplies.length === 0 ? "Todavía no hay insumos. Crea el primero." : "Sin resultados."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {loading && <p className="py-4 text-center text-sm text-muted-foreground">Cargando…</p>}
        </CardContent>
      </Card>

      <DetailSheet
        supply={detail}
        onClose={() => setDetail(null)}
        onEdit={(s) => {
          setDetail(null);
          setEditing(s);
        }}
      />
      {editing && config && (
        <SupplyDialog
          key={editing === "new" ? "new" : editing.id}
          config={config}
          supply={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Boxes; label: string; value: string; tone?: "warn" }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-4">
        <div className={cn("flex size-10 items-center justify-center rounded-lg", tone === "warn" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-primary/10 text-primary")}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailSheet({ supply, onClose, onEdit }: { supply: Supply | null; onClose: () => void; onEdit: (s: Supply) => void }) {
  if (!supply) return null;
  return <DetailBody key={supply.id} supply={supply} onClose={onClose} onEdit={onEdit} />;
}

function DetailBody({ supply, onClose, onEdit }: { supply: Supply; onClose: () => void; onEdit: (s: Supply) => void }) {
  const [movs, setMovs] = useState<Movement[] | null>(null);
  useEffect(() => {
    listMovements({ supply_id: supply.id, limit: 200 }).then(setMovs).catch(() => setMovs([]));
  }, [supply.id]);
  const ficha: [string, string][] = [
    ["Categoría", supply.category_label],
    ["Compra", `${supply.purchase_unit} de ${qty(supply.purchase_content)} ${supply.consumption_unit} a ${soles(supply.purchase_cost)}`],
    ["Costo por unidad de consumo", `S/ ${supply.unit_cost.toFixed(4)} / ${supply.consumption_unit}`],
    ["Stock actual", `${qty(supply.stock)} ${supply.consumption_unit}`],
    ["Stock mínimo", `${qty(supply.min_stock)} ${supply.consumption_unit}`],
    ["Control de lote", supply.tracks_lot ? "Sí" : "No"],
    ["Control de vencimiento", supply.tracks_expiry ? "Sí" : "No"],
  ];
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{supply.name}</SheetTitle>
          <p className="font-mono text-xs text-muted-foreground">{supply.sku}</p>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-6">
          <dl className="space-y-1.5 text-sm">
            {ficha.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <Button variant="outline" size="sm" onClick={() => onEdit(supply)}>Editar insumo</Button>
          <div>
            <p className="mb-2 text-sm font-semibold">Movimientos</p>
            {movs === null ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : movs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin movimientos.</p>
            ) : (
              <ul className="space-y-2">
                {movs.map((m) => (
                  <li key={m.id} className="rounded-md border p-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{m.type_label}</span>
                      <span className={cn("tabular-nums font-semibold", m.quantity < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                        {m.quantity > 0 ? "+" : ""}{qty(m.quantity)} {supply.consumption_unit}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.occurred_on}{m.order_id ? ` · orden ${m.order_id.slice(0, 8)}` : ""} · {m.reason}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Crear (sin `supply`) o editar un insumo. Cambiar el costo no cambia el de lo ya registrado. */
function SupplyDialog({
  config, supply, onClose, onSaved,
}: { config: InventoryConfig; supply: Supply | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: supply?.name ?? "",
    category: supply?.category ?? config.categories[0]?.code ?? "",
    purchase_unit: supply?.purchase_unit ?? "",
    purchase_content: supply ? String(supply.purchase_content) : "",
    consumption_unit: supply?.consumption_unit ?? config.consumption_units[0] ?? "ml",
    purchase_cost: supply ? String(supply.purchase_cost) : "",
    min_stock: supply ? String(supply.min_stock) : "",
    is_active: supply?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const n = (s: string) => Number(s.replace(",", "."));
  const valid = f.name.trim() && f.purchase_unit.trim() && n(f.purchase_content) > 0 && f.purchase_cost !== "" && n(f.purchase_cost) >= 0;

  async function save() {
    setSaving(true);
    setError("");
    const body: SupplyInput = {
      name: f.name.trim(), category: f.category, purchase_unit: f.purchase_unit.trim(),
      purchase_content: n(f.purchase_content), consumption_unit: f.consumption_unit,
      purchase_cost: n(f.purchase_cost), min_stock: n(f.min_stock) || 0,
    };
    try {
      if (supply) await updateSupply(supply.id, { ...body, is_active: f.is_active });
      else await createSupply(body);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el insumo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{supply ? `Editar ${supply.sku}` : "Nuevo insumo"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Código"><Input value={supply?.sku ?? "Lo asigna el sistema"} disabled /></Field>
          <Field label="Categoría">
            <select className={cn(selectCls, "w-full")} value={f.category} onChange={set("category")}>
              {config.categories.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Nombre" className="sm:col-span-2"><Input value={f.name} onChange={set("name")} placeholder="Ej. Shampoo blanqueador" /></Field>
          <Field label="Unidad de compra"><Input value={f.purchase_unit} onChange={set("purchase_unit")} placeholder="Galón, caja, botella…" /></Field>
          <Field label="Contenido por unidad"><Input inputMode="decimal" value={f.purchase_content} onChange={set("purchase_content")} placeholder="3785" /></Field>
          <Field label="Unidad de consumo">
            <select className={cn(selectCls, "w-full")} value={f.consumption_unit} onChange={set("consumption_unit")}>
              {config.consumption_units.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Costo de compra (S/)"><Input inputMode="decimal" value={f.purchase_cost} onChange={set("purchase_cost")} placeholder="185.00" /></Field>
          <Field label="Stock mínimo"><Input inputMode="decimal" value={f.min_stock} onChange={set("min_stock")} placeholder="1000" /></Field>
          {supply && (
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" checked={f.is_active} onChange={(e) => setF((p) => ({ ...p, is_active: e.target.checked }))} />
              Activo
            </label>
          )}
        </div>
        {supply && (
          <p className="text-xs text-muted-foreground">Cambiar el costo no cambia el costo de los movimientos ya registrados.</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!valid || saving} onClick={save}>{saving ? "Guardando…" : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
