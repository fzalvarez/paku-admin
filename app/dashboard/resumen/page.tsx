"use client";

// Resumen gerencial (paku-backend C-39): mes al día vs. el mismo corte del mes anterior. El backend calcula todas
// las cifras y dice si cada una es real, estimada (recetas y tarifas) o sin datos; aquí solo se muestran.

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtYmd } from "@/lib/orders";
import { getDashboard, type Dashboard, type DashboardMetric, type MetricQuality } from "@/lib/services/dashboard";
import { qty, soles } from "@/lib/services/inventory";
import { cn } from "@/lib/utils";

const SECTIONS: { title: string; keys: string[] }[] = [
  { title: "Ventas", keys: ["services_done", "avg_ticket", "receivable", "cancellations"] },
  { title: "Contribución", keys: ["contribution", "contribution_pct"] },
  { title: "Clientes", keys: ["new_customers", "returning_customers"] },
  { title: "Operación", keys: ["occupancy", "avg_travel_minutes", "avg_service_minutes", "avg_arrival_offset_minutes", "delay_reports"] },
];

// Si subir es bueno (verde), malo (rojo) o neutro. Por defecto, bueno.
const LOWER_IS_BETTER = new Set(["receivable", "cancellations", "avg_travel_minutes", "avg_arrival_offset_minutes", "delay_reports"]);
const NEUTRAL = new Set(["avg_service_minutes"]);

const QUALITY: Record<MetricQuality, { label: string; cls: string }> = {
  real: { label: "Real", cls: "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" },
  estimated: { label: "Estimado", cls: "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400" },
  no_data: { label: "Sin datos", cls: "text-muted-foreground" },
};

function fmtValue(m: Pick<DashboardMetric, "unit">, v: number | null): string {
  if (v == null) return "—";
  if (m.unit === "money") return soles(v);
  if (m.unit === "pct") return `${v.toLocaleString("es-PE", { maximumFractionDigits: 1 })} %`;
  if (m.unit === "minutes") return `${qty(v)} min`;
  return v.toLocaleString("es-PE");
}

function fmtDelta(m: DashboardMetric): string {
  const d = m.delta as number;
  const sign = d > 0 ? "+" : d < 0 ? "−" : "";
  const abs = Math.abs(d);
  const base = m.unit === "money" ? soles(abs) : m.unit === "pct" ? `${qty(abs)} pts` : m.unit === "minutes" ? `${qty(abs)} min` : abs.toLocaleString("es-PE");
  const pct = (m.unit === "money" || m.unit === "count") && m.delta_pct != null ? ` (${m.delta_pct > 0 ? "+" : ""}${qty(m.delta_pct)} %)` : "";
  return `${sign}${base}${pct}`;
}

function QualityBadge({ q }: { q: MetricQuality }) {
  return <Badge variant="outline" className={QUALITY[q].cls}>{QUALITY[q].label}</Badge>;
}

function Delta({ m }: { m: DashboardMetric }) {
  if (m.delta == null) return <span className="text-muted-foreground">Sin comparación</span>;
  const tone = m.delta === 0 || NEUTRAL.has(m.key) ? 0 : (m.delta > 0) !== LOWER_IS_BETTER.has(m.key) ? 1 : -1;
  const Icon = m.delta > 0 ? ArrowUpRight : m.delta < 0 ? ArrowDownRight : Minus;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium",
      tone > 0 && "text-emerald-700 dark:text-emerald-400", tone < 0 && "text-red-700 dark:text-red-400",
      tone === 0 && "text-muted-foreground")}>
      <Icon className="size-3.5" /> {fmtDelta(m)}
    </span>
  );
}

function MetricTile({ m }: { m: DashboardMetric }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-4">
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {m.label}
            <span title={m.description} aria-label={m.description}><Info className="size-3.5" /></span>
          </p>
          <QualityBadge q={m.quality} />
        </div>
        <p className="text-2xl font-semibold">{fmtValue(m, m.value)}</p>
        {m.total != null && m.with_data != null && m.total > 0 && m.with_data < m.total && (
          <p className="text-xs text-muted-foreground">Con datos: {m.with_data} de {m.total} servicios</p>
        )}
        <p className="text-xs"><Delta m={m} /></p>
        <p className="text-xs text-muted-foreground">
          Mes anterior: {m.previous_quality === "no_data" ? "sin datos" : fmtValue(m, m.previous)}
        </p>
      </CardContent>
    </Card>
  );
}

function Hero({ m, d }: { m: DashboardMetric; d: Dashboard }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-end justify-between gap-4 pt-4">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {m.label} <QualityBadge q={m.quality} />
          </p>
          <p className="text-5xl font-semibold tracking-tight">{fmtValue(m, m.value)}</p>
          <p className="text-sm"><Delta m={m} /> <span className="text-muted-foreground">vs. {fmtValue(m, m.previous)} del mes anterior</span></p>
        </div>
        <p className="max-w-sm text-xs text-muted-foreground">
          {m.description} Cuenta el día del servicio, no el del cobro.
          {" "}Del {fmtYmd(d.period.date_from)} al {fmtYmd(d.period.date_to)}.
        </p>
      </CardContent>
    </Card>
  );
}

function OccupancyMeter({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-primary/15" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="tabular-nums">{qty(pct)} %</span>
    </div>
  );
}

export default function ResumenPage() {
  const [cut, setCut] = useState("");
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDashboard(cut || undefined)
      .then((d) => !cancelled && (setData(d), setError("")))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "No se pudo cargar el resumen."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cut]);

  const byKey = new Map(data?.metrics.map((m) => [m.key, m]) ?? []);
  const revenue = byKey.get("revenue");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resumen gerencial"
        description={data
          ? `Mes al día: ${fmtYmd(data.period.date_from)} – ${fmtYmd(data.period.date_to)} · comparado con ${fmtYmd(data.previous_period.date_from)} – ${fmtYmd(data.previous_period.date_to)}`
          : "Mes al día comparado con el mismo corte del mes anterior."}
        action={
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Día de corte
            <Input type="date" className="w-auto" value={cut || data?.cut || ""} onChange={(e) => { setLoading(true); setCut(e.target.value); }} />
          </label>
        }
        className="mb-0"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && !data && <p className="text-muted-foreground">Cargando resumen…</p>}

      {data && (
        <>
          {revenue && <Hero m={revenue} d={data} />}

          {SECTIONS.map((s) => (
            <section key={s.title} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{s.title}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {s.keys.map((k) => byKey.get(k)).filter((m): m is DashboardMetric => !!m).map((m) => <MetricTile key={m.key} m={m} />)}
                {s.title === "Operación" && (
                  <Card>
                    <CardContent className="space-y-1 pt-4">
                      <p className="text-xs text-muted-foreground">Programados hasta fin de mes</p>
                      <p className="text-2xl font-semibold">{data.scheduled_rest_of_month}</p>
                      <p className="text-xs text-muted-foreground">Servicios pagados o en verificación, desde el corte</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Próximos 7 días</CardTitle>
              <p className="text-xs text-muted-foreground">Cupos tomados incluye carritos vigentes (2 h), como en Fechas.</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Día</TableHead>
                    <TableHead className="text-right">Capacidad</TableHead>
                    <TableHead className="text-right">Cupos tomados</TableHead>
                    <TableHead>Ocupación</TableHead>
                    <TableHead className="text-right">Servicios programados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.next_days.map((x) => (
                    <TableRow key={x.date}>
                      <TableCell>{fmtYmd(x.date)}</TableCell>
                      <TableCell className="text-right tabular-nums">{x.capacity ?? <span className="text-muted-foreground">Sin cupos</span>}</TableCell>
                      <TableCell className="text-right tabular-nums">{x.booked ?? "—"}</TableCell>
                      <TableCell><OccupancyMeter pct={x.occupancy_pct} /></TableCell>
                      <TableCell className="text-right tabular-nums">{x.scheduled}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            <strong>Real:</strong> sale directo de los registros. <strong>Estimado:</strong> usa recetas y costo por
            hora del groomer. <strong>Sin datos:</strong> no hay qué medir (no se muestra 0). Pasa el cursor por el
            ícono de cada cifra para ver cómo se calcula.
          </p>
        </>
      )}
    </div>
  );
}
