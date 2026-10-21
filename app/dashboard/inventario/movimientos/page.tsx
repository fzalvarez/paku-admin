"use client";

// Inventario (DEMO): movimientos de stock. Nada se borra; las correcciones son movimientos de ajuste.

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDemoInventory } from "@/components/inventario/DemoInventoryProvider";
import { cn } from "@/lib/utils";
import { CENTROS_COSTO, MOVEMENT_LABELS, UBICACIONES, cantidad, type MovementType } from "@/lib/mock/inventario";

const TIPO_CLS: Record<MovementType, string> = {
  stock_inicial: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  compra: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  consumo: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  ajuste: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  merma: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};
const selectCls = "h-9 w-full rounded-md border bg-background px-2 text-sm";

export default function MovimientosPage() {
  const { movimientos, insumos } = useDemoInventory();
  const [tipo, setTipo] = useState("");
  const [sku, setSku] = useState("");
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(50);

  const rows = movimientos
    .filter((m) => (!tipo || m.tipo === tipo) && (!sku || m.sku === sku))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
  const unidad = (s: string) => insumos.find((i) => i.sku === s)?.unidadConsumo ?? "";
  const nombre = (s: string) => insumos.find((i) => i.sku === s)?.nombre ?? s;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <select className={cn(selectCls, "w-auto")} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(MOVEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={cn(selectCls, "w-auto")} value={sku} onChange={(e) => setSku(e.target.value)}>
            <option value="">Todos los insumos</option>
            {insumos.map((i) => <option key={i.sku} value={i.sku}>{i.sku} · {i.nombre}</option>)}
          </select>
          <p className="flex-1 text-xs text-muted-foreground">
            El stock de cada insumo es la suma de sus movimientos. Nada se elimina: los errores se corrigen con un ajuste.
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Registrar movimiento
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Insumo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Origen → Destino</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Centro de costo</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, limit).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.id}</TableCell>
                  <TableCell className="whitespace-nowrap">{m.fecha}</TableCell>
                  <TableCell>
                    <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", TIPO_CLS[m.tipo])}>
                      {MOVEMENT_LABELS[m.tipo]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">{m.sku}</span> {nombre(m.sku)}
                  </TableCell>
                  <TableCell className={cn("text-right font-semibold tabular-nums whitespace-nowrap", m.cantidad < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                    {m.cantidad > 0 ? "+" : ""}{cantidad(m.cantidad)} {unidad(m.sku)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{m.origen} → {m.destino}</TableCell>
                  <TableCell className="font-mono text-xs">{m.orden ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{m.centroCosto}</TableCell>
                  <TableCell className="whitespace-nowrap">{m.usuario}</TableCell>
                  <TableCell className="text-muted-foreground">{m.motivo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between gap-3 pt-3 text-sm text-muted-foreground">
            <span>Mostrando {Math.min(limit, rows.length)} de {rows.length} movimientos</span>
            {rows.length > limit && (
              <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 100)}>Ver más</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <NewMovementDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function NewMovementDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { insumos, addMovimiento } = useDemoInventory();
  const empty = { tipo: "compra" as MovementType, sku: insumos[0]?.sku ?? "", cantidad: "", ubicacion: UBICACIONES[1], centroCosto: CENTROS_COSTO[0].code, motivo: "" };
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const close = () => { setF(empty); onClose(); };
  const n = Number(f.cantidad);
  const entra = f.tipo === "compra";
  const valid = n > 0 && f.motivo.trim().length > 0;
  const unidad = insumos.find((i) => i.sku === f.sku)?.unidadConsumo ?? "";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>Los consumos por servicio se generan solos al terminar cada orden.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <select className={selectCls} value={f.tipo} onChange={set("tipo")}>
              <option value="compra">Compra (entrada)</option>
              <option value="ajuste">Ajuste (salida)</option>
              <option value="merma">Merma (salida)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Insumo</Label>
            <select className={selectCls} value={f.sku} onChange={set("sku")}>
              {insumos.map((i) => <option key={i.sku} value={i.sku}>{i.sku} · {i.nombre}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cantidad ({unidad})</Label>
            <Input type="number" min={0} value={f.cantidad} onChange={set("cantidad")} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ubicación</Label>
            <select className={selectCls} value={f.ubicacion} onChange={set("ubicacion")}>
              {UBICACIONES.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Centro de costo</Label>
            <select className={selectCls} value={f.centroCosto} onChange={set("centroCosto")}>
              {CENTROS_COSTO.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Motivo / comprobante *</Label>
            <Input value={f.motivo} onChange={set("motivo")} placeholder={entra ? "Factura F001-1234" : "Conteo físico, derrame, vencimiento…"} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancelar</Button>
          <Button
            disabled={!valid}
            onClick={() => {
              addMovimiento({
                fecha: new Date().toISOString().slice(0, 10),
                tipo: f.tipo,
                sku: f.sku,
                cantidad: entra ? n : -n,
                origen: entra ? "Proveedor" : f.ubicacion,
                destino: entra ? f.ubicacion : MOVEMENT_LABELS[f.tipo],
                centroCosto: f.centroCosto,
                usuario: "Admin Paku",
                motivo: f.motivo.trim(),
              });
              close();
            }}
          >
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
