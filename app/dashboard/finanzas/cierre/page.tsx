"use client";

// Cierre mensual y P&L gerencial (DEMO). Suma lo que muestran Inventario, Pagos y Variable del groomer.
// El período se elige por meses (desde/hasta) y se compara con los mismos meses inmediatamente anteriores.

import { Suspense, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleDashed, Download } from "lucide-react";
import { DateRangeFilter, useDateRange } from "@/components/dashboard/DateRangeFilter";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CENTROS, DEPRECIACION, GASTOS_OCTUBRE, MESES_DEMO, downloadCsv, pnlMes, sumarPnl, type Pnl } from "@/lib/mock/finanzas";
import { soles } from "@/lib/mock/inventario";
import { ORDENES } from "@/lib/mock/ordenes";

type Linea = { key: keyof Pnl; label: string; signo?: "-"; total?: boolean; fuente?: { href: string; label: string } };
const LINEAS: Linea[] = [
  { key: "ventasBrutas", label: "Ventas brutas" },
  { key: "descuentos", label: "Descuentos", signo: "-" },
  { key: "devoluciones", label: "Devoluciones", signo: "-", fuente: { href: "/dashboard/finanzas/pagos", label: "Pagos" } },
  { key: "ventasNetas", label: "Ventas netas", total: true },
  { key: "insumos", label: "Insumos consumidos", signo: "-", fuente: { href: "/dashboard/inventario", label: "Inventario" } },
  { key: "variableGroomer", label: "Variable groomer", signo: "-", fuente: { href: "/dashboard/finanzas/variable-groomer", label: "Variable" } },
  { key: "comision", label: "Comisión pasarela", signo: "-", fuente: { href: "/dashboard/finanzas/pagos", label: "Pagos" } },
  { key: "otrosDirectos", label: "Otros costos directos (combustible, traslado)", signo: "-" },
  { key: "margenContribucion", label: "Margen de contribución", total: true },
  { key: "gastosOperativos", label: "Gastos operativos", signo: "-" },
  { key: "ebitda", label: "EBITDA gerencial", total: true },
  { key: "depreciacion", label: "Depreciación gerencial", signo: "-" },
  { key: "resultado", label: "Resultado operativo", total: true },
];

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MES_EN_CURSO = "2026-10"; // la demo está al 20 de octubre

const shiftMes = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const mesesEntre = (desde: string, hasta: string) => {
  const out: string[] = [];
  for (let m = desde; m <= hasta && out.length < 36; m = shiftMes(m, 1)) out.push(m);
  return out;
};
const mesLabel = (ym: string, corto = false) => {
  const nombre = MESES[Number(ym.slice(5, 7)) - 1];
  return `${corto ? nombre.slice(0, 3) + "." : nombre} ${ym.slice(0, 4)}${ym === MES_EN_CURSO ? " (al 20)" : ""}`;
};
const periodoLabel = (meses: string[], corto = false) =>
  meses.length === 1 ? mesLabel(meses[0], corto) : `${mesLabel(meses[0], true)} – ${mesLabel(meses[meses.length - 1], true)}`;

export default function CierrePage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando cierre...</p>}>
      <Cierre />
    </Suspense>
  );
}

function Cierre() {
  const [cc, setCc] = useState("");
  const range = useDateRange({ month: true, defaults: { desde: MES_EN_CURSO, hasta: MES_EN_CURSO } });
  const desde = range.desde || MESES_DEMO[0];
  const hasta = range.hasta || MESES_DEMO[MESES_DEMO.length - 1];
  const meses = desde <= hasta ? mesesEntre(desde, hasta) : [];
  const anteriores = meses.map((m) => shiftMes(m, -meses.length));

  const actuales = meses.map((m) => pnlMes(m, cc)).filter((p): p is Pnl => !!p);
  const previos = anteriores.map((m) => pnlMes(m, cc));
  const oct = actuales.length ? sumarPnl(actuales) : null;
  // Solo se compara si la demo tiene todos los meses del período anterior.
  const sep = previos.length && previos.every(Boolean) ? sumarPnl(previos as Pnl[]) : null;
  const incluyeEnCurso = meses.includes(MES_EN_CURSO);
  const periodo = meses.length ? periodoLabel(meses) : "—";
  const periodoAnt = anteriores.length ? periodoLabel(anteriores) : "—";
  const conDif = ORDENES.filter((o) => o.conciliacion === "diferencia").length;
  const porLiquidar = ORDENES.filter((o) => o.conciliacion === "pendiente").length;

  const checklist: { label: string; ok: boolean; nota: string }[] = [
    { label: "Órdenes del mes cerradas / anulaciones revisadas", ok: true, nota: `${ORDENES.length} órdenes, 1 devolución` },
    { label: "Pagos conciliados con pasarela / banco", ok: false, nota: `${conDif} con diferencia · ${porLiquidar} por liquidar` },
    { label: "Compras y gastos del mes cargados", ok: true, nota: `${GASTOS_OCTUBRE.length} comprobantes` },
    { label: "Inventario físico vs. teórico conciliado", ok: true, nota: "Ajuste INS-003 registrado" },
    { label: "Mermas / ajustes aprobados", ok: false, nota: "Merma INS-006 pendiente de aprobación" },
    { label: "Variable groomer validado", ok: false, nota: "En simulación hasta fin de mes" },
    { label: "Mantenimientos y gastos extraordinarios cargados", ok: true, nota: "Sin extraordinarios" },
    { label: "Exportación contable entregada al contador", ok: false, nota: "Se genera al cerrar el mes" },
  ];

  const exportar = () =>
    oct &&
    downloadCsv(`pyl-${desde}-a-${hasta}${cc ? "-" + cc : ""}.csv`, [
      ["concepto", `${desde}_a_${hasta}`, sep ? `${anteriores[0]}_a_${anteriores[anteriores.length - 1]}` : "periodo_anterior", "variacion_soles", "variacion_pct"],
      ...LINEAS.map((l) => {
        const a = oct[l.key], b = sep?.[l.key];
        return [l.label, a.toFixed(2), b != null ? b.toFixed(2) : "", b != null ? (a - b).toFixed(2) : "", b ? (((a - b) / Math.abs(b)) * 100).toFixed(1) : ""];
      }),
    ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cierre mensual y P&L"
        description={`${periodo} frente a ${periodoAnt}. P&L gerencial, no contable. Datos de demo: septiembre (mes piloto, cerrado) y octubre (al 20).`}
        action={
          <>
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={cc} onChange={(e) => setCc(e.target.value)}>
              <option value="">Todos los centros de costo</option>
              {CENTROS.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
            </select>
            <Button variant="outline" onClick={exportar} disabled={!oct}><Download className="size-4" /> Exportar CSV</Button>
          </>
        }
        className="mb-0"
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <DateRangeFilter range={range} month />
          <p className="text-xs text-muted-foreground">
            Por meses: gastos y depreciación son mensuales. Se compara con el período anterior de la misma duración.
          </p>
        </CardContent>
      </Card>

      {!oct ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Sin datos para ese período. La demo tiene septiembre y octubre de 2026.
          </CardContent>
        </Card>
      ) : (
      <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Ventas netas" value={oct.ventasNetas} prev={sep?.ventasNetas} prevLabel={periodoAnt} />
        <Kpi label="Margen de contribución" value={oct.margenContribucion} prev={sep?.margenContribucion} prevLabel={periodoAnt} pctOf={oct.ventasNetas} />
        <Kpi label="EBITDA gerencial" value={oct.ebitda} prev={sep?.ebitda} prevLabel={periodoAnt} />
        <Kpi label="Servicios realizados" value={oct.servicios} prev={sep?.servicios} prevLabel={periodoAnt} count />
      </div>

      <div className={cn("grid gap-4", incluyeEnCurso && "xl:grid-cols-[1fr_380px]")}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">P&L gerencial {cc && <span className="font-mono text-sm text-muted-foreground">· {cc}</span>}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right whitespace-nowrap">{periodoLabel(meses, true)}</TableHead>
                  <TableHead className="text-right whitespace-nowrap">{periodoLabel(anteriores, true)}</TableHead>
                  <TableHead className="text-right">Var. S/</TableHead>
                  <TableHead className="text-right">Var. %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LINEAS.map((l) => {
                  const a = oct[l.key], b = sep?.[l.key], d = b != null ? a - b : null;
                  return (
                    <TableRow key={l.key} className={cn(l.total && "bg-muted/40 font-semibold")}>
                      <TableCell>
                        {l.signo ? "(−) " : ""}{l.label}
                        {l.fuente && (
                          <Link href={l.fuente.href} className="ml-2 text-xs font-normal text-primary hover:underline">
                            ver {l.fuente.label}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums", a < 0 && "text-red-600 dark:text-red-400")}>{soles(a)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{b != null ? soles(b) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{d != null ? soles(d) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{b && d != null ? `${((d / Math.abs(b)) * 100).toFixed(1)} %` : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <p className="pt-3 text-xs text-muted-foreground">
              {!sep && "Sin datos del período anterior para comparar. "}
              {incluyeEnCurso && "Octubre está en curso (al día 20); al cerrar el mes las cifras se congelan y los cambios posteriores quedan como ajustes."}
            </p>
          </CardContent>
        </Card>

        {incluyeEnCurso && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Checklist de cierre · octubre 2026</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {checklist.map((c) => (
                <div key={c.label} className="flex gap-2.5 text-sm">
                  {c.ok ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <CircleDashed className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  )}
                  <div>
                    <p className={cn(!c.ok && "font-medium")}>{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.nota}</p>
                  </div>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">
                {checklist.filter((c) => c.ok).length} de {checklist.length} completos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gastos operativos y depreciación · octubre</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {[...GASTOS_OCTUBRE.map((g) => ({ cc: g.cc, label: g.concepto, monto: g.monto })),
                ...DEPRECIACION.map((d) => ({ cc: d.cc, label: `Depreciación ${d.activo}`, monto: d.monto }))]
                .filter((g) => !cc || g.cc === cc)
                .map((g) => (
                  <div key={g.label} className="flex justify-between gap-3">
                    <span>
                      <span className="font-mono text-[10px] text-muted-foreground">{g.cc}</span> {g.label}
                    </span>
                    <span className="tabular-nums">{soles(g.monto)}</span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}

function Kpi({
  label, value, prev, prevLabel, pctOf, count,
}: { label: string; value: number; prev?: number; prevLabel: string; pctOf?: number; count?: boolean }) {
  const d = prev ? ((value - prev) / Math.abs(prev)) * 100 : null;
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-semibold tabular-nums", value < 0 && "text-red-600 dark:text-red-400")}>
          {count ? value : soles(value)}
        </p>
        <p className="text-xs text-muted-foreground">
          {pctOf ? `${((value / pctOf) * 100).toFixed(1)} % de ventas · ` : ""}
          {d != null ? `${d >= 0 ? "+" : ""}${d.toFixed(1)} % vs. ${prevLabel}` : "sin comparación"}
        </p>
      </CardContent>
    </Card>
  );
}
