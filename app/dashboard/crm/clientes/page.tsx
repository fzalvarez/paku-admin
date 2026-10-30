"use client";

// Clientes (paku-backend C-36): dueños con al menos un servicio, con gasto, frecuencia, última visita y
// segmento calculados por el backend desde sus órdenes.

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";
import { DateRangeFilter, useDateRange } from "@/components/dashboard/DateRangeFilter";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClienteSheet } from "@/components/crm/ClienteSheet";
import { SegmentBadge, Stat, selectCls } from "@/components/crm/CrmUi";
import { downloadCsv } from "@/lib/csv";
import { CUSTOMER_SEGMENT_LABELS, label } from "@/lib/labels";
import { fmtYmd } from "@/lib/orders";
import {
  fullName,
  getCustomerStats,
  listCustomers,
  type CustomerSort,
  type CustomerStats,
  type CustomerSummary,
} from "@/lib/services/customers";
import { listDistricts, type District } from "@/lib/services/geo";
import { soles } from "@/lib/services/inventory";
import { cn } from "@/lib/utils";

export default function ClientesPage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando clientes...</p>}>
      <Clientes />
    </Suspense>
  );
}

function Clientes() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // q con espera, para no consultar en cada tecla
  const [segmento, setSegmento] = useState(params.get("segmento") ?? "");
  const [distrito, setDistrito] = useState("");
  const [orden, setOrden] = useState<CustomerSort>("spend");
  const [rows, setRows] = useState<CustomerSummary[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const range = useDateRange();
  const abierto = params.get("ver");

  // Conserva desde/hasta al abrir o cerrar la ficha.
  const ver = (id: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("ver", id);
    else next.delete("ver");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    getCustomerStats().then(setStats).catch(() => setStats(null));
    listDistricts().then(setDistricts);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listCustomers({
      segment: segmento, district_id: distrito, q: query, sort: orden,
      last_visit_from: range.desde, last_visit_to: range.hasta,
    })
      .then((list) => !cancelled && (setRows(list), setError("")))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "No se pudieron cargar los clientes."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [segmento, distrito, query, orden, range.desde, range.hasta]);

  const exportar = () =>
    downloadCsv("clientes-paku.csv", [
      ["cliente", "nombre", "telefono", "email", "distrito", "alta", "mascotas", "servicios", "gasto_acumulado", "ticket_promedio", "primera_visita", "ultima_visita", "dias_sin_venir", "frecuencia_dias", "segmento"],
      ...rows.map((c) => [c.id, fullName(c), c.phone ?? "", c.email, c.district_name ?? "", c.registered_at.slice(0, 10),
        c.pets.map((m) => m.name).join(" / "), c.services, c.spend.toFixed(2), c.avg_ticket.toFixed(2), c.first_visit ?? "",
        c.last_visit ?? "", c.days_since_last_visit ?? "", c.avg_interval_days ?? "", label(CUSTOMER_SEGMENT_LABELS, c.segment)]),
    ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Dueños con al menos un servicio terminado · Gasto (lo pagado), frecuencia y última visita calculados desde sus órdenes."
        action={<Button variant="outline" onClick={exportar} disabled={!rows.length}><Download className="size-4" /> Exportar CSV</Button>}
        className="mb-0"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clientes" value={stats ? String(stats.customers) : "—"} sub={stats ? `${stats.pets} mascotas` : undefined} />
        <Stat label="Activos (últimos 45 días)" value={stats ? String(stats.active) : "—"} sub={stats?.active_pct != null ? `${Math.round(stats.active_pct)} % del total` : undefined} />
        <Stat label="Volvieron a comprar" value={stats?.repurchase_pct != null ? `${Math.round(stats.repurchase_pct)} %` : "—"} sub={stats ? `${stats.with_repurchase} con 2 o más servicios` : undefined} />
        <Stat label="Gasto promedio por cliente" value={soles(stats?.avg_spend)} sub={stats ? `${soles(stats.total_spend)} en total` : undefined} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <DateRangeFilter range={range} />
          <div className="relative w-full sm:w-72">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Nombre, correo, teléfono o mascota" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={selectCls} value={segmento} onChange={(e) => setSegmento(e.target.value)}>
            <option value="">Todos los segmentos</option>
            {Object.entries(CUSTOMER_SEGMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={selectCls} value={distrito} onChange={(e) => setDistrito(e.target.value)}>
            <option value="">Todos los distritos</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className={selectCls} value={orden} onChange={(e) => setOrden(e.target.value as CustomerSort)}>
            <option value="spend">Mayor gasto</option>
            <option value="last_visit">Visita más reciente</option>
            <option value="services">Más servicios</option>
          </select>
          <p className="text-xs text-muted-foreground">{loading ? "Cargando…" : `${rows.length} clientes`} · las fechas filtran la última visita</p>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Mascotas</TableHead>
                <TableHead>Distrito</TableHead>
                <TableHead className="text-right">Servicios</TableHead>
                <TableHead className="text-right">Gasto acumulado</TableHead>
                <TableHead>Última visita</TableHead>
                <TableHead className="text-right">Frecuencia</TableHead>
                <TableHead>Segmento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => ver(c.id)}>
                  <TableCell>
                    <p className="font-medium">{fullName(c)}</p>
                    <p className="text-xs text-muted-foreground">{c.phone ?? c.email}</p>
                  </TableCell>
                  <TableCell>{c.pets.map((m) => m.name).join(", ") || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.district_name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.services}</TableCell>
                  <TableCell className="text-right tabular-nums">{soles(c.spend)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {fmtYmd(c.last_visit)}
                    {c.days_since_last_visit != null && (
                      <span className={cn("block text-xs", c.days_since_last_visit > 45 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                        {c.days_since_last_visit === 0 ? "hoy" : `hace ${c.days_since_last_visit} días`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{c.avg_interval_days ? `${c.avg_interval_days} d` : "—"}</TableCell>
                  <TableCell><SegmentBadge segmento={c.segment} /></TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">Sin clientes con esos filtros.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {stats && (
        <Card className="border-dashed">
          <CardContent className="grid gap-x-6 gap-y-1 pt-4 text-xs text-muted-foreground sm:grid-cols-2">
            {stats.segments.map((s) => (
              <p key={s.code}>
                <SegmentBadge segmento={s.code} /> <span className="tabular-nums">{s.count}</span> · {s.rule}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <ClienteSheet userId={abierto} onClose={() => ver(null)} />
    </div>
  );
}
