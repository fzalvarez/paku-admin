"use client";

// Variable del groomer (DEMO): puntos por servicio completado + bono de calidad. Incluye cómo lo vería el
// groomer en Paku Pro (solo sus números, sin ventas ni montos cobrados de la empresa).

import { useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { downloadCsv, variableGroomers } from "@/lib/mock/finanzas";
import { soles } from "@/lib/mock/inventario";
import {
  ADICIONALES, BONO_CALIDAD_MAX, PUNTOS_ADICIONAL, PUNTOS_SERVICIO, SERVICIOS, VALOR_PUNTO, puntosDe, type ServiceCode,
} from "@/lib/mock/ordenes";

const pct = (n: number) => `${(n * 100).toFixed(0)} %`;

export default function VariableGroomerPage() {
  const data = variableGroomers();
  const [sel, setSel] = useState(data[0]?.groomer ?? "");
  const g = data.find((x) => x.groomer === sel) ?? data[0];

  const exportar = () =>
    downloadCsv("variable-groomer-octubre-2026.csv", [
      ["periodo", "groomer", "programados", "completados", "puntos", "valor_punto", "variable_productividad", "bono_calidad_max", "cumplimiento_calidad", "bono_calidad", "variable_total", "estado"],
      ...data.map((v) => ["2026-10", v.groomer, v.programados, v.completados, v.puntos, VALOR_PUNTO, v.variableProductividad.toFixed(2),
        BONO_CALIDAD_MAX, v.cumplimientoCalidad.toFixed(3), v.bonoCalidad.toFixed(2), v.total.toFixed(2), "Simulación"]),
    ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Variable del groomer"
        description="Octubre 2026 (al 20) · Estado: simulación. Fórmula referencial, por aprobar con datos reales."
        action={<Button variant="outline" onClick={exportar}><Download className="size-4" /> Exportar CSV</Button>}
        className="mb-0"
      />

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Groomer</TableHead>
                <TableHead className="text-right">Programados</TableHead>
                <TableHead className="text-right">Completados</TableHead>
                <TableHead className="text-right">Puntos</TableHead>
                <TableHead className="text-right">Variable productividad</TableHead>
                <TableHead className="text-right">Calidad</TableHead>
                <TableHead className="text-right">Bono calidad</TableHead>
                <TableHead className="text-right">Variable total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((v) => (
                <TableRow
                  key={v.groomer}
                  className={cn("cursor-pointer", v.groomer === g?.groomer && "bg-primary/5")}
                  onClick={() => setSel(v.groomer)}
                >
                  <TableCell className="font-medium">{v.groomer}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.programados}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.completados}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.puntos.toFixed(1)}</TableCell>
                  <TableCell className="text-right tabular-nums">{soles(v.variableProductividad)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(v.cumplimientoCalidad)}</TableCell>
                  <TableCell className="text-right tabular-nums">{soles(v.bonoCalidad)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{soles(v.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="pt-3 text-xs text-muted-foreground">Selecciona un groomer para ver cómo lo vería en su app Paku Pro.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cómo se calcula</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium">1. Puntos por servicio completado</p>
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
                {(Object.keys(PUNTOS_SERVICIO) as ServiceCode[]).map((s) => (
                  <div key={s} className="flex justify-between">
                    <span className="text-muted-foreground">{SERVICIOS[s]}</span>
                    <span className="tabular-nums">{PUNTOS_SERVICIO[s]} pts</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cada adicional</span>
                  <span className="tabular-nums">+{PUNTOS_ADICIONAL} pts</span>
                </div>
              </div>
            </div>
            <p><span className="font-medium">2. Variable de productividad</span> = puntos × S/ {VALOR_PUNTO} por punto.</p>
            <p>
              <span className="font-medium">3. Bono de calidad</span> = hasta {soles(BONO_CALIDAD_MAX)} al mes × % de servicios sin
              reclamo ni observación.
            </p>
            <p className="rounded-md bg-muted/50 p-3 text-muted-foreground">
              Solo cuentan servicios completados y válidos (las órdenes devueltas no suman). El groomer ve únicamente sus propios
              servicios, puntos y variable: nunca la facturación de la empresa ni los costos.
            </p>
          </CardContent>
        </Card>

        {g && <PakuProPreview v={g} />}
      </div>
    </div>
  );
}

function PakuProPreview({ v }: { v: ReturnType<typeof variableGroomers>[number] }) {
  const ultimos = v.ordenes.filter((o) => !o.devuelto).slice(-5).reverse();
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Smartphone className="size-4" /> Vista en Paku Pro · {v.groomer}
      </p>
      <div className="mx-auto w-full max-w-[340px] rounded-[2rem] border-8 border-neutral-800 bg-white text-neutral-900 shadow-lg">
        <div className="rounded-t-[1.4rem] bg-[#0052FF] px-4 pt-5 pb-4 text-white">
          <p className="text-xs opacity-80">Mi variable · octubre</p>
          <p className="text-3xl font-bold tabular-nums">{soles(v.total)}</p>
          <p className="text-xs opacity-80">Estimado al 20 de octubre</p>
        </div>
        <div className="grid grid-cols-3 gap-2 p-3 text-center">
          <Mini label="Servicios" value={String(v.completados)} />
          <Mini label="Puntos" value={v.puntos.toFixed(1)} />
          <Mini label="Calidad" value={pct(v.cumplimientoCalidad)} />
        </div>
        <div className="space-y-1 px-4 text-xs">
          <div className="flex justify-between"><span className="text-neutral-500">Productividad</span><span className="tabular-nums">{soles(v.variableProductividad)}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">Bono de calidad</span><span className="tabular-nums">{soles(v.bonoCalidad)}</span></div>
        </div>
        <div className="p-4">
          <p className="mb-2 text-xs font-semibold text-neutral-500">Últimos servicios</p>
          <ul className="space-y-1.5">
            {ultimos.map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-lg bg-neutral-100 px-3 py-2 text-xs">
                <span>
                  {SERVICIOS[o.serviceCode]}
                  {o.addonCodes.length > 0 && <span className="text-neutral-500"> + {ADICIONALES[o.addonCodes[0]].nombre}</span>}
                  <span className="block text-neutral-500">{o.fecha}</span>
                </span>
                <span className="font-semibold tabular-nums text-[#0052FF]">+{puntosDe(o).toFixed(1)} pts</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-[10px] text-neutral-400">Sin montos cobrados ni ventas de la empresa</p>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-100 py-2">
      <p className="text-base font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-neutral-500">{label}</p>
    </div>
  );
}
