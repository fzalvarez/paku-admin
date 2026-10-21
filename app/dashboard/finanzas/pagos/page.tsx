"use client";

// Pagos y conciliación (DEMO): venta vs. comisión de la pasarela vs. liquidación recibida.

import { useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/mock/finanzas";
import { soles } from "@/lib/mock/inventario";
import { ORDENES, type EstadoConciliacion } from "@/lib/mock/ordenes";

const ESTADO: Record<EstadoConciliacion, { label: string; cls: string }> = {
  conciliado: { label: "Conciliado", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  pendiente: { label: "Por liquidar", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  diferencia: { label: "Con diferencia", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  devuelto: { label: "Devuelto", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
};
const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

export default function PagosPage() {
  const [estado, setEstado] = useState("");
  const [medio, setMedio] = useState("");
  const rows = ORDENES.filter((o) => (!estado || o.conciliacion === estado) && (!medio || o.medio === medio))
    .slice()
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));

  const sum = (f: (o: (typeof ORDENES)[number]) => number) => ORDENES.reduce((a, o) => a + f(o), 0);
  const bruto = sum((o) => o.total);
  const comision = sum((o) => o.comision);
  const liquidado = sum((o) => o.liquidado ?? 0);
  const porLiquidar = sum((o) => (o.conciliacion === "pendiente" ? o.netoEsperado : 0));
  const conDif = ORDENES.filter((o) => o.conciliacion === "diferencia");
  const dif = conDif.reduce((a, o) => a + (o.netoEsperado - (o.liquidado ?? 0)), 0);

  const exportar = () =>
    downloadCsv("pagos-conciliacion-octubre-2026.csv", [
      ["orden", "fecha", "medio", "transaccion", "bruto", "comision", "neto_esperado", "fecha_liquidacion", "liquidado", "diferencia", "estado", "centro_costo"],
      ...rows.map((o) => [o.id, o.fecha, o.medio, o.transaccion, o.total, o.comision, o.netoEsperado, o.fechaLiquidacion ?? "",
        o.liquidado ?? "", o.liquidado != null && !o.devuelto ? (o.netoEsperado - o.liquidado).toFixed(2) : "", ESTADO[o.conciliacion].label, o.centroCosto]),
    ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pagos y conciliación"
        description="Octubre 2026 (al 20) · Venta, comisión de la pasarela y monto realmente liquidado por Culqi."
        action={<Button variant="outline" onClick={exportar}><Download className="size-4" /> Exportar CSV</Button>}
        className="mb-0"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Cobrado (bruto)" value={soles(bruto)} sub={`${ORDENES.length} pagos`} />
        <Stat label="Comisión pasarela" value={soles(comision)} sub={`${((comision / bruto) * 100).toFixed(2)} % del bruto`} />
        <Stat label="Liquidado al banco" value={soles(liquidado)} />
        <Stat label="Por liquidar" value={soles(porLiquidar)} sub="Pagos de los últimos días" />
        <Stat label="Diferencias" value={soles(dif)} sub={`${conDif.length} pagos por revisar`} warn={conDif.length > 0} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-4">
          <select className={selectCls} value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className={selectCls} value={medio} onChange={(e) => setMedio(e.target.value)}>
            <option value="">Todos los medios</option>
            <option>Tarjeta</option>
            <option>Yape</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Comisiones referenciales: tarjeta 3,44 % + IGV · Yape 2,5 % + IGV. El neto esperado se compara con lo que liquida la pasarela.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Medio</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Comisión</TableHead>
                <TableHead className="text-right">Neto esperado</TableHead>
                <TableHead>Liquidación</TableHead>
                <TableHead className="text-right">Liquidado</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => {
                const d = o.liquidado != null && !o.devuelto ? o.netoEsperado - o.liquidado : null;
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id}</TableCell>
                    <TableCell className="whitespace-nowrap">{o.fecha}</TableCell>
                    <TableCell>{o.medio}</TableCell>
                    <TableCell className="text-right tabular-nums">{soles(o.total)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">−{soles(o.comision)}</TableCell>
                    <TableCell className="text-right tabular-nums">{soles(o.netoEsperado)}</TableCell>
                    <TableCell className="whitespace-nowrap">{o.fechaLiquidacion ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{o.liquidado != null ? soles(o.liquidado) : "—"}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", d ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                      {d ? soles(d) : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", ESTADO[o.conciliacion].cls)}>
                        {ESTADO[o.conciliacion].label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <Card className={cn(warn && "border-amber-300 dark:border-amber-800")}>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-semibold tabular-nums", warn && "text-amber-700 dark:text-amber-400")}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
