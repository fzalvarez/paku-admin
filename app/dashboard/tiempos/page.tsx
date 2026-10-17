"use client";

// Tiempos de atención del groomer (C-32, observaciones 2026-10-16): duración real de traslado, de cada
// paso y total por servicio terminado. Sirve para calibrar la agenda por duración (documento de precios).

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SERVICE_STEPS, SERVICE_STEP_LABELS } from "@/lib/labels";
import { type Order, type OrderItem } from "@/lib/orders";
import { listAllOrders, listGroomers, type GroomerSummary } from "@/lib/services/orders";

type Row = {
  order: Order;
  date: string; // YYYY-MM-DD (Lima)
  groomer: string;
  service: string;
  weight: number | null;
  addons: number;
  travel: number | null; // minutos
  steps: (number | null)[]; // minutos por paso, en el orden de SERVICE_STEPS
  service_total: number | null;
};

const minutes = (a?: string | null, b?: string | null) =>
  a && b ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)) : null;
const limaDate = (iso: string) =>
  new Date(new Date(iso).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);
const fmtMin = (m: number | null) => (m == null ? "—" : m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);
const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
};

function toRow(o: Order, groomers: GroomerSummary[]): Row | null {
  if (o.status !== "done" || !o.completed_at) return null;
  const log = o.service_steps_log ?? [];
  const startOf = (step: string) => log.find((e) => e.step === step)?.started_at ?? null;
  const starts = SERVICE_STEPS.map((s) => startOf(s));
  const steps = starts.map((st, i) => minutes(st, starts[i + 1] ?? o.completed_at));
  const items = (Array.isArray(o.items_snapshot) ? o.items_snapshot : []) as OrderItem[];
  const g = groomers.find((x) => x.id === o.groomer_id);
  return {
    order: o,
    date: limaDate(o.completed_at),
    groomer: g ? [g.first_name, g.last_name].filter(Boolean).join(" ") || "—" : "—",
    service: items.find((i) => i.kind === "service_base")?.name ?? "—",
    weight: o.measured_weight_kg ?? o.declared_weight_kg ?? null,
    addons: items.filter((i) => i.kind === "service_addon").length,
    travel: minutes(o.departed_at, starts[0]),
    steps,
    service_total: minutes(starts[0], o.completed_at),
  };
}

export default function TiemposPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [groomers, setGroomers] = useState<GroomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [groomerId, setGroomerId] = useState("");

  useEffect(() => {
    Promise.all([listAllOrders(), listGroomers()])
      .then(([o, g]) => {
        setOrders(o);
        setGroomers(g);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar las órdenes."))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(
    () =>
      orders
        .map((o) => toRow(o, groomers))
        .filter((r): r is Row => !!r)
        .filter((r) => (!from || r.date >= from) && (!to || r.date <= to))
        .filter((r) => !groomerId || r.order.groomer_id === groomerId)
        .sort((a, b) => b.order.completed_at!.localeCompare(a.order.completed_at!)),
    [orders, groomers, from, to, groomerId],
  );

  const summary = {
    travel: avg(rows.map((r) => r.travel)),
    total: avg(rows.map((r) => r.service_total)),
    steps: SERVICE_STEPS.map((_, i) => avg(rows.map((r) => r.steps[i]))),
  };

  const exportCsv = () => {
    const head = ["fecha", "orden", "groomer", "servicio", "peso_kg", "adicionales", "traslado_min",
      ...SERVICE_STEPS.map((s) => `${s}_min`), "servicio_total_min"];
    const lines = rows.map((r) => [r.date, r.order.id, r.groomer, r.service, r.weight ?? "", r.addons, r.travel ?? "",
      ...r.steps.map((m) => m ?? ""), r.service_total ?? ""]);
    const csv = [head, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tiempos-paku-${from || "inicio"}-${to || "hoy"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tiempos de atención"
        action={<Button variant="outline" onClick={exportCsv} disabled={!rows.length}>Exportar CSV</Button>}
        className="mb-0"
      />
      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Duración real de cada servicio terminado: traslado (salida → llegada), cada paso del servicio y total en
        el domicilio. Se registra solo desde que el groomer usa la app (las órdenes antiguas no tienen salida ni fin).
      </p>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <div className="space-y-1">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Groomer</Label>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={groomerId}
              onChange={(e) => setGroomerId(e.target.value)}
            >
              <option value="">Todos</option>
              {groomers.map((g) => (
                <option key={g.id} value={g.id}>
                  {[g.first_name, g.last_name].filter(Boolean).join(" ") || g.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Servicios medidos" value={String(rows.length)} />
        <Stat label="Traslado promedio" value={fmtMin(summary.travel)} />
        <Stat label="En domicilio (promedio)" value={fmtMin(summary.total)} />
        <Card>
          <CardContent className="space-y-1 pt-4 text-sm">
            <p className="text-xs text-muted-foreground">Promedio por paso</p>
            {SERVICE_STEPS.map((s, i) => (
              <div key={s} className="flex justify-between gap-2">
                <span>{SERVICE_STEP_LABELS[s]}</span>
                <span className="tabular-nums">{fmtMin(summary.steps[i])}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay servicios terminados con tiempos registrados.</p>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Groomer</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead className="text-right">Adic.</TableHead>
                  <TableHead className="text-right">Traslado</TableHead>
                  {SERVICE_STEPS.map((s) => (
                    <TableHead key={s} className="text-right">{SERVICE_STEP_LABELS[s]}</TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.order.id}>
                    <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                    <TableCell>{r.groomer}</TableCell>
                    <TableCell>{r.service}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.weight != null ? `${r.weight} kg` : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.addons}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMin(r.travel)}</TableCell>
                    {r.steps.map((m, i) => (
                      <TableCell key={i} className="text-right tabular-nums">{fmtMin(m)}</TableCell>
                    ))}
                    <TableCell className="text-right font-medium tabular-nums">{fmtMin(r.service_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
