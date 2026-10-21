"use client";

// Inventario (DEMO): maestro de insumos con stock calculado desde los movimientos.

import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, PackageMinus, Plus, Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDemoInventory } from "@/components/inventario/DemoInventoryProvider";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS, MOVEMENT_LABELS, cantidad, costoUnitario, estadoDe, soles, stockDe,
  type EstadoStock, type Insumo,
} from "@/lib/mock/inventario";

const ESTADO: Record<EstadoStock, { label: string; cls: string }> = {
  ok: { label: "OK", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  bajo: { label: "Bajo mínimo", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  agotado: { label: "Agotado", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
};
const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

export default function InsumosPage() {
  const { insumos, movimientos, addInsumo } = useDemoInventory();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [est, setEst] = useState("");
  const [detail, setDetail] = useState<Insumo | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(
    () =>
      insumos.map((i) => {
        const stock = stockDe(i.sku, movimientos);
        return { i, stock, estado: estadoDe(stock, i.stockMinimo), valor: Math.max(stock, 0) * costoUnitario(i) };
      }),
    [insumos, movimientos],
  );
  const filtered = rows.filter(
    (r) =>
      (!q || `${r.i.sku} ${r.i.nombre}`.toLowerCase().includes(q.toLowerCase())) &&
      (!cat || r.i.categoria === cat) &&
      (!est || r.estado === est),
  );

  const consumos = movimientos.filter((m) => m.tipo === "consumo" && m.fecha.startsWith("2026-10"));
  const costoConsumo = consumos.reduce((a, m) => {
    const i = insumos.find((x) => x.sku === m.sku);
    return a + (i ? -m.cantidad * costoUnitario(i) : 0);
  }, 0);
  const ordenes = new Set(consumos.map((m) => m.orden).filter(Boolean)).size;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Boxes} label="Valor del inventario" value={soles(rows.reduce((a, r) => a + r.valor, 0))} />
        <Stat
          icon={AlertTriangle}
          label="Bajo mínimo o agotados"
          value={String(rows.filter((r) => r.estado !== "ok").length)}
          tone={rows.some((r) => r.estado !== "ok") ? "warn" : undefined}
        />
        <Stat icon={PackageMinus} label="Consumo de octubre" value={soles(costoConsumo)} />
        <Stat icon={Receipt} label="Insumos por servicio (prom.)" value={ordenes ? soles(costoConsumo / ordenes) : "—"} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar por código o nombre" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={selectCls} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className={selectCls} value={est} onChange={(e) => setEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Nuevo insumo
          </Button>
        </CardContent>
      </Card>

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
              {filtered.map(({ i, stock, estado, valor }) => (
                <TableRow key={i.sku} className="cursor-pointer" onClick={() => setDetail(i)}>
                  <TableCell className="font-mono text-xs">{i.sku}</TableCell>
                  <TableCell className="font-medium">{i.nombre}</TableCell>
                  <TableCell>{i.categoria}</TableCell>
                  <TableCell className="text-right tabular-nums">{cantidad(stock)} {i.unidadConsumo}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{cantidad(i.stockMinimo)}</TableCell>
                  <TableCell className="text-right tabular-nums">S/ {costoUnitario(i).toFixed(4)} / {i.unidadConsumo}</TableCell>
                  <TableCell className="text-right tabular-nums">{soles(valor)}</TableCell>
                  <TableCell>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", ESTADO[estado].cls)}>
                      {ESTADO[estado].label}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">Sin resultados.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DetailSheet insumo={detail} onClose={() => setDetail(null)} />
      <NewInsumoDialog
        open={creating}
        onClose={() => setCreating(false)}
        nextSku={`INS-${String(insumos.length + 1).padStart(3, "0")}`}
        onSave={(i) => {
          addInsumo(i);
          setCreating(false);
        }}
      />
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

function DetailSheet({ insumo, onClose }: { insumo: Insumo | null; onClose: () => void }) {
  const { movimientos } = useDemoInventory();
  if (!insumo) return null;
  const movs = movimientos.filter((m) => m.sku === insumo.sku).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
  const stock = stockDe(insumo.sku, movimientos);
  const ficha: [string, string][] = [
    ["Categoría", insumo.categoria],
    ["Compra", `${insumo.unidadCompra} de ${cantidad(insumo.contenidoCompra)} ${insumo.unidadConsumo} a ${soles(insumo.costoCompra)}`],
    ["Costo por unidad de consumo", `S/ ${costoUnitario(insumo).toFixed(4)} / ${insumo.unidadConsumo}`],
    ["Stock actual", `${cantidad(stock)} ${insumo.unidadConsumo}`],
    ["Stock mínimo", `${cantidad(insumo.stockMinimo)} ${insumo.unidadConsumo}`],
    ["Control de lote", insumo.controlLote ? "Sí" : "No"],
    ["Control de vencimiento", insumo.controlVencimiento ? "Sí" : "No"],
  ];
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{insumo.nombre}</SheetTitle>
          <p className="font-mono text-xs text-muted-foreground">{insumo.sku}</p>
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
          <div>
            <p className="mb-2 text-sm font-semibold">Movimientos</p>
            <ul className="space-y-2">
              {movs.map((m) => (
                <li key={m.id} className="rounded-md border p-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{MOVEMENT_LABELS[m.tipo]}</span>
                    <span className={cn("tabular-nums font-semibold", m.cantidad < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                      {m.cantidad > 0 ? "+" : ""}{cantidad(m.cantidad)} {insumo.unidadConsumo}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {m.fecha}{m.orden ? ` · ${m.orden}` : ""} · {m.motivo}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NewInsumoDialog({
  open, onClose, onSave, nextSku,
}: { open: boolean; onClose: () => void; onSave: (i: Insumo) => void; nextSku: string }) {
  const empty = { nombre: "", categoria: CATEGORIAS[0], unidadCompra: "", contenidoCompra: "", unidadConsumo: "ml", costoCompra: "", stockMinimo: "" };
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const valid = f.nombre.trim() && f.unidadCompra.trim() && Number(f.contenidoCompra) > 0 && Number(f.costoCompra) >= 0;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setF(empty); onClose(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo insumo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Código"><Input value={nextSku} disabled /></Field>
          <Field label="Categoría">
            <select className={cn(selectCls, "w-full")} value={f.categoria} onChange={set("categoria")}>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Nombre" className="sm:col-span-2"><Input value={f.nombre} onChange={set("nombre")} placeholder="Ej. Shampoo blanqueador" /></Field>
          <Field label="Unidad de compra"><Input value={f.unidadCompra} onChange={set("unidadCompra")} placeholder="Galón, caja, botella…" /></Field>
          <Field label="Contenido por unidad"><Input type="number" value={f.contenidoCompra} onChange={set("contenidoCompra")} placeholder="3785" /></Field>
          <Field label="Unidad de consumo">
            <select className={cn(selectCls, "w-full")} value={f.unidadConsumo} onChange={set("unidadConsumo")}>
              <option>ml</option><option>unidad</option><option>g</option>
            </select>
          </Field>
          <Field label="Costo de compra (S/)"><Input type="number" value={f.costoCompra} onChange={set("costoCompra")} placeholder="185.00" /></Field>
          <Field label="Stock mínimo"><Input type="number" value={f.stockMinimo} onChange={set("stockMinimo")} placeholder="1000" /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setF(empty); onClose(); }}>Cancelar</Button>
          <Button
            disabled={!valid}
            onClick={() => {
              onSave({
                sku: nextSku, nombre: f.nombre.trim(), categoria: f.categoria, unidadCompra: f.unidadCompra.trim(),
                contenidoCompra: Number(f.contenidoCompra), unidadConsumo: f.unidadConsumo, costoCompra: Number(f.costoCompra),
                stockMinimo: Number(f.stockMinimo) || 0, controlLote: false, controlVencimiento: false,
              });
              setF(empty);
            }}
          >
            Guardar
          </Button>
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
