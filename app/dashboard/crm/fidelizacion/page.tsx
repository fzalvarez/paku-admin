"use client";

// Fidelización (DEMO): frecuencia de compra, clientes inactivos y segmentos de clientes.

import Link from "next/link";
import { Megaphone, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FuenteDatos, SegmentBadge, Stat } from "@/components/crm/CrmUi";
import { cn } from "@/lib/utils";
import { CLIENTES, SEGMENTOS, fechaCorta, porSegmento, type Segmento } from "@/lib/mock/crm";
import { soles } from "@/lib/mock/inventario";

const MESES = [
  { key: "2026-06", label: "Jun" },
  { key: "2026-07", label: "Jul" },
  { key: "2026-08", label: "Ago" },
  { key: "2026-09", label: "Sep" },
  { key: "2026-10", label: "Oct*" },
];

export default function FidelizacionPage() {
  const seg = porSegmento();
  const total = CLIENTES.length;
  const conRecompra = CLIENTES.filter((c) => c.servicios > 1);
  const intervalos = conRecompra.map((c) => c.intervaloPromedio!).filter(Boolean);
  const frecuenciaMedia = intervalos.reduce((a, n) => a + n, 0) / intervalos.length;
  const alerta = [...seg.en_riesgo, ...seg.inactivo].sort((a, b) => b.gasto - a.gasto);
  // Venta mensual que se deja de recibir: ticket promedio × visitas al mes según su frecuencia habitual
  const ventaEnRiesgo = alerta.reduce((a, c) => a + c.ticketPromedio * (c.intervaloPromedio ? Math.min(2, 30 / c.intervaloPromedio) : 0.5), 0);

  // Frecuencia de compra: días promedio entre servicios
  const rangos = [
    { label: "Hasta 20 días", n: intervalos.filter((d) => d <= 20).length },
    { label: "21 a 35 días", n: intervalos.filter((d) => d > 20 && d <= 35).length },
    { label: "36 a 50 días", n: intervalos.filter((d) => d > 35 && d <= 50).length },
    { label: "Más de 50 días", n: intervalos.filter((d) => d > 50).length },
    { label: "Un solo servicio", n: total - conRecompra.length },
  ];
  const maxRango = Math.max(...rangos.map((r) => r.n));

  // Clientes atendidos por mes: nuevos (primer servicio ese mes) vs. que vuelven
  const porMes = MESES.map((m) => {
    const atendidos = CLIENTES.filter((c) => c.visitas.some((v) => !v.devuelto && v.fecha.startsWith(m.key)));
    const nuevos = atendidos.filter((c) => c.primeraVisita.startsWith(m.key)).length;
    return { ...m, nuevos, vuelven: atendidos.length - nuevos };
  });
  const maxMes = Math.max(...porMes.map((m) => m.nuevos + m.vuelven));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fidelización"
        description="Con qué frecuencia vuelven los clientes, quiénes dejaron de venir y en qué segmento está cada uno."
        className="mb-0"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tasa de recompra" value={`${Math.round((conRecompra.length / total) * 100)} %`} sub={`${conRecompra.length} de ${total} clientes volvieron`} />
        <Stat label="Frecuencia promedio" value={`${Math.round(frecuenciaMedia)} días`} sub="Entre un servicio y el siguiente" />
        <Stat label="En riesgo + inactivos" value={String(alerta.length)} sub={`${Math.round((alerta.length / total) * 100)} % de la base`} warn={alerta.length > 0} />
        <Stat label="Venta mensual en riesgo" value={soles(ventaEnRiesgo)} sub="Ticket × frecuencia de quienes no vuelven" warn />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Segmentos de clientes</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(SEGMENTOS) as Segmento[]).map((s) => {
            const lista = seg[s];
            const gasto = lista.reduce((a, c) => a + c.gasto, 0);
            return (
              <Card key={s}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-center justify-between">
                    <SegmentBadge segmento={s} />
                    <span className="text-xs text-muted-foreground">{Math.round((lista.length / total) * 100)} %</span>
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">{lista.length} <span className="text-sm font-normal text-muted-foreground">clientes</span></p>
                  <p className="text-xs text-muted-foreground">{SEGMENTOS[s].regla}</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Gasto acumulado</span>
                    <span className="tabular-nums">{soles(gasto)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Ticket promedio</span>
                    <span className="tabular-nums">{lista.length ? soles(gasto / lista.reduce((a, c) => a + c.servicios, 0)) : "—"}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href={`/dashboard/crm/clientes?segmento=${s}`}><Users className="size-4" /> Ver clientes</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href={`/dashboard/crm/campanas?nueva=${s}`}><Megaphone className="size-4" /> Campaña</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Frecuencia de compra</CardTitle>
            <p className="text-xs text-muted-foreground">Clientes según los días promedio entre sus servicios.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {rangos.map((r) => (
              <div key={r.label} className="grid grid-cols-[120px_1fr_32px] items-center gap-2 text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <div className="h-5 rounded bg-muted">
                  <div className="h-5 rounded bg-primary" style={{ width: `${(r.n / maxRango) * 100}%` }} />
                </div>
                <span className="text-right tabular-nums">{r.n}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clientes atendidos por mes</CardTitle>
            <p className="text-xs text-muted-foreground">Nuevos (primer servicio ese mes) y clientes que vuelven. *Octubre al 20.</p>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-4">
              {porMes.map((m) => (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs tabular-nums">{m.nuevos + m.vuelven}</span>
                  <div className="flex w-full max-w-12 flex-col justify-end gap-0.5" style={{ height: `${((m.nuevos + m.vuelven) / maxMes) * 112}px` }}>
                    <div className="rounded-t bg-sky-400 dark:bg-sky-600" style={{ flexGrow: m.nuevos }} title={`${m.nuevos} nuevos`} />
                    <div className="rounded-b bg-primary" style={{ flexGrow: m.vuelven }} title={`${m.vuelven} vuelven`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-sky-400 dark:bg-sky-600" /> Nuevos</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" /> Vuelven</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Clientes inactivos y en riesgo</CardTitle>
            <p className="text-xs text-muted-foreground">Ordenados por gasto acumulado: los primeros son los que más conviene recuperar.</p>
          </div>
          <Button asChild size="sm">
            <Link href="/dashboard/crm/campanas?nueva=inactivo"><Megaphone className="size-4" /> Campaña de reactivación</Link>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Mascotas</TableHead>
                <TableHead>Última visita</TableHead>
                <TableHead className="text-right">Días sin venir</TableHead>
                <TableHead className="text-right">Frecuencia habitual</TableHead>
                <TableHead className="text-right">Gasto acumulado</TableHead>
                <TableHead>Segmento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerta.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/dashboard/crm/clientes?ver=${c.id}`} className="font-medium hover:underline">{c.nombre}</Link>
                    <p className="text-xs text-muted-foreground">{c.telefono}</p>
                  </TableCell>
                  <TableCell>{c.mascotas.map((m) => m.nombre).join(", ")}</TableCell>
                  <TableCell className="whitespace-nowrap">{fechaCorta(c.ultimaVisita)}</TableCell>
                  <TableCell className={cn("text-right font-semibold tabular-nums", c.segmento === "inactivo" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
                    {c.diasSinVenir}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{c.intervaloPromedio ? `cada ${c.intervaloPromedio} días` : "1 servicio"}</TableCell>
                  <TableCell className="text-right tabular-nums">{soles(c.gasto)}</TableCell>
                  <TableCell><SegmentBadge segmento={c.segmento} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FuenteDatos
        existe={[
          "Fechas y montos de todas las órdenes de cada cliente (base para frecuencia y recompra)",
          "Frecuencia de grooming que el dueño declaró por mascota",
        ]}
        falta={[
          "Definir con el owner los cortes de cada segmento (días de inactividad, mínimo para VIP)",
          "Cálculo de segmentos en el backend (job diario) para usarlo en campañas y recordatorios",
        ]}
      />
    </div>
  );
}
