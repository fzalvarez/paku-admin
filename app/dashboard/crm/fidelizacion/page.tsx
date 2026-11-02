"use client";

// Fidelización (paku-backend C-36 y C-43): frecuencia de compra, clientes inactivos y segmentos, con los clientes
// reales de /admin/customers. Las reglas de segmento y los atendidos por mes los calcula el backend.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Users } from "lucide-react";
import { DateRangeFilter, useDateRange } from "@/components/dashboard/DateRangeFilter";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SegmentBadge, Stat } from "@/components/crm/CrmUi";
import { cn } from "@/lib/utils";
import { fmtYmd } from "@/lib/orders";
import { limaToday } from "@/lib/dates";
import { fullName, getCustomerStats, listCustomers, type CustomerStats, type CustomerSummary } from "@/lib/services/customers";
import { soles } from "@/lib/services/inventory";

const MES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function FidelizacionPage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando fidelización...</p>}>
      <Fidelizacion />
    </Suspense>
  );
}

const pct = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)} %` : "—");

function Fidelizacion() {
  const range = useDateRange();
  const [clientes, setClientes] = useState<CustomerSummary[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listCustomers({ sort: "spend" }), getCustomerStats()])
      .then(([c, s]) => {
        setClientes(c);
        setStats(s);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar los clientes."))
      .finally(() => setLoading(false));
  }, []);

  const total = clientes.length;
  const intervalos = clientes.map((c) => c.avg_interval_days).filter((d): d is number => d != null);
  const frecuenciaMedia = intervalos.length ? intervalos.reduce((a, n) => a + n, 0) / intervalos.length : null;
  // Ya vienen de mayor a menor gasto
  const alerta = clientes.filter((c) => c.segment === "en_riesgo" || c.segment === "inactivo");
  const gastoAlerta = alerta.reduce((a, c) => a + c.spend, 0);
  const serviciosAlerta = alerta.reduce((a, c) => a + c.services, 0);
  const visibles = alerta.filter((c) => !range.active || (c.last_visit != null && range.inRange(c.last_visit)));

  // Frecuencia de compra: días promedio entre servicios
  const rangos = [
    { label: "Hasta 20 días", n: intervalos.filter((d) => d <= 20).length },
    { label: "21 a 35 días", n: intervalos.filter((d) => d > 20 && d <= 35).length },
    { label: "36 a 50 días", n: intervalos.filter((d) => d > 35 && d <= 50).length },
    { label: "Más de 50 días", n: intervalos.filter((d) => d > 50).length },
    { label: "Un solo servicio", n: clientes.filter((c) => c.services === 1).length },
  ];
  const maxRango = Math.max(1, ...rangos.map((r) => r.n));

  const today = limaToday();
  const porMes = (stats?.by_month ?? []).map((m) => ({
    ...m,
    label: MES[Number(m.month.slice(5, 7)) - 1] + (m.month === today.slice(0, 7) ? "*" : ""),
  }));
  const maxMes = Math.max(1, ...porMes.map((m) => m.attended));

  if (loading) return <p className="text-muted-foreground">Cargando fidelización...</p>;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fidelización"
        description="Con qué frecuencia vuelven los clientes, quiénes dejaron de venir y en qué segmento está cada uno."
        className="mb-0"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Tasa de recompra"
          value={stats?.repurchase_pct != null ? `${Math.round(stats.repurchase_pct)} %` : "—"}
          sub={`${stats?.with_repurchase ?? 0} de ${total} clientes volvieron`}
        />
        <Stat
          label="Frecuencia promedio"
          value={frecuenciaMedia != null ? `${Math.round(frecuenciaMedia)} días` : "—"}
          sub="Entre un servicio y el siguiente"
        />
        <Stat label="En riesgo + inactivos" value={String(alerta.length)} sub={`${pct(alerta.length, total)} de la base`} warn={alerta.length > 0} />
        <Stat
          label="Gasto de quienes no vuelven"
          value={soles(gastoAlerta)}
          sub={serviciosAlerta ? `Acumulado · ticket ${soles(gastoAlerta / serviciosAlerta)}` : "Acumulado de en riesgo + inactivos"}
          warn={alerta.length > 0}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Segmentos de clientes</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(stats?.segments ?? []).map((s) => {
            const lista = clientes.filter((c) => c.segment === s.code);
            const gasto = lista.reduce((a, c) => a + c.spend, 0);
            const servicios = lista.reduce((a, c) => a + c.services, 0);
            return (
              <Card key={s.code}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-center justify-between">
                    <SegmentBadge segmento={s.code} />
                    <span className="text-xs text-muted-foreground">{pct(s.count, total)}</span>
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">{s.count} <span className="text-sm font-normal text-muted-foreground">clientes</span></p>
                  <p className="text-xs text-muted-foreground">{s.rule}</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Gasto acumulado</span>
                    <span className="tabular-nums">{soles(gasto)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Ticket promedio</span>
                    <span className="tabular-nums">{servicios ? soles(gasto / servicios) : "—"}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href={`/dashboard/crm/clientes?segmento=${s.code}`}><Users className="size-4" /> Ver clientes</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href={`/dashboard/crm/campanas?nueva=${s.code}`}><Megaphone className="size-4" /> Campaña</Link>
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
            <p className="text-xs text-muted-foreground">
              Nuevos (primer servicio ese mes) y clientes que vuelven. *{MES[Number(today.slice(5, 7)) - 1]} al {Number(today.slice(8, 10))}.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-4">
              {porMes.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs tabular-nums">{m.attended}</span>
                  <div className="flex w-full max-w-12 flex-col justify-end gap-0.5" style={{ height: `${(m.attended / maxMes) * 112}px` }}>
                    <div className="rounded-t bg-sky-400 dark:bg-sky-600" style={{ flexGrow: m.new }} title={`${m.new} nuevos`} />
                    <div className="rounded-b bg-primary" style={{ flexGrow: m.returning }} title={`${m.returning} vuelven`} />
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
        <CardHeader className="flex-row flex-wrap items-end justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Clientes inactivos y en riesgo</CardTitle>
            <p className="text-xs text-muted-foreground">
              Ordenados por gasto acumulado: los primeros son los que más conviene recuperar. El período filtra por la última visita.
            </p>
          </div>
          <DateRangeFilter range={range} />
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
              {visibles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    {alerta.length ? "Nadie tuvo su última visita en ese período." : "No hay clientes en riesgo ni inactivos."}
                  </TableCell>
                </TableRow>
              )}
              {visibles.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/dashboard/crm/clientes?ver=${c.id}`} className="font-medium hover:underline">{fullName(c)}</Link>
                    <p className="text-xs text-muted-foreground">{c.phone ?? c.email}</p>
                  </TableCell>
                  <TableCell>{c.pets.map((m) => m.name).join(", ") || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtYmd(c.last_visit)}</TableCell>
                  <TableCell className={cn("text-right font-semibold tabular-nums", c.segment === "inactivo" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
                    {c.days_since_last_visit ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {c.avg_interval_days ? `cada ${c.avg_interval_days} días` : "1 servicio"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{soles(c.spend)}</TableCell>
                  <TableCell><SegmentBadge segmento={c.segment} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
