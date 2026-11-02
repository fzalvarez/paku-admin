"use client";

// Inventario · Capturas (paku-backend C-40): foto fija del stock en cada fecha de corte. Las automáticas se toman
// solas según la frecuencia de Parámetros generales; las manuales, con "Tomar captura ahora". No se editan.

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Camera, Download, Search } from "lucide-react";
import { DateRangeFilter, useDateRange } from "@/components/dashboard/DateRangeFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import { SUPPLY_STATUS_LABELS, label } from "@/lib/labels";
import { fmtDateTime, fmtYmd } from "@/lib/orders";
import {
  getInventoryConfig,
  getSnapshot,
  listSnapshots,
  qty,
  soles,
  takeSnapshot,
  type InventoryConfig,
  type Snapshot,
  type SnapshotDetail,
  type SnapshotSchedule,
  type SupplyStatus,
} from "@/lib/services/inventory";
import { cn } from "@/lib/utils";

const STATUS_CLS: Record<SupplyStatus, string> = {
  ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  low: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  out: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};
const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

export default function CapturasPage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando capturas...</p>}>
      <Capturas />
    </Suspense>
  );
}

function Capturas() {
  const range = useDateRange();
  const [schedule, setSchedule] = useState<SnapshotSchedule | null>(null);
  const [items, setItems] = useState<Snapshot[]>([]);
  const [config, setConfig] = useState<InventoryConfig | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [taking, setTaking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getInventoryConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await listSnapshots({ date_from: range.desde, date_to: range.hasta });
      setSchedule(res.schedule);
      setItems(res.items);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las capturas.");
    } finally {
      setLoading(false);
    }
  }, [range.desde, range.hasta]);

  useEffect(() => {
    load();
  }, [load]);

  async function tomar() {
    setTaking(true);
    try {
      const snap = await takeSnapshot();
      await load();
      setSelected(snap.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo tomar la captura.");
    } finally {
      setTaking(false);
    }
  }

  const exportar = () =>
    downloadCsv("capturas-inventario-paku.csv", [
      ["corte", "tipo", "tomada", "insumos", "valor", "bajo_minimo", "agotados"],
      ...items.map((s) => [s.cut_date, s.kind_label, s.taken_at, s.supplies_count, s.total_value.toFixed(2), s.low_count, s.out_count]),
    ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <DateRangeFilter range={range} />
          <p className="flex-1 text-xs text-muted-foreground">
            {schedule
              ? schedule.frequency === "none"
                ? "Sin captura automática."
                : `Captura automática: ${schedule.frequency_label.toLowerCase()}${schedule.next_cut ? ` · próximo corte ${fmtYmd(schedule.next_cut)} (se guarda al terminar el día)` : ""}.`
              : ""}{" "}
            <Link href="/dashboard/configuracion/parametros" className="underline">Cambiar en Parámetros generales</Link>.
            Las fechas filtran el día de corte.
          </p>
          <Button variant="outline" onClick={exportar} disabled={!items.length}>
            <Download className="size-4" /> Exportar CSV
          </Button>
          <Button onClick={tomar} disabled={taking}>
            <Camera className="size-4" /> {taking ? "Tomando…" : "Tomar captura ahora"}
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Corte</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tomada</TableHead>
                <TableHead className="text-right">Insumos</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Bajo mínimo</TableHead>
                <TableHead className="text-right">Agotados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id} className={cn("cursor-pointer", selected === s.id && "bg-muted")} onClick={() => setSelected(s.id)}>
                  <TableCell className="whitespace-nowrap font-medium">{fmtYmd(s.cut_date)}</TableCell>
                  <TableCell>{s.kind_label}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(s.taken_at)}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.supplies_count}</TableCell>
                  <TableCell className="text-right tabular-nums">{soles(s.total_value)}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.low_count}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.out_count}</TableCell>
                </TableRow>
              ))}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Todavía no hay capturas en este rango.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && <SnapshotView key={selected} id={selected} config={config} />}
    </div>
  );
}

function SnapshotView({ id, config }: { id: string; config: InventoryConfig | null }) {
  const [snap, setSnap] = useState<SnapshotDetail | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [est, setEst] = useState("");

  useEffect(() => {
    getSnapshot(id).then(setSnap).catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar la captura."));
  }, [id]);

  const catLabel = (code: string) => config?.categories.find((c) => c.code === code)?.label ?? code;
  const rows = useMemo(
    () =>
      (snap?.lines ?? []).filter(
        (x) =>
          (!q || `${x.sku} ${x.name}`.toLowerCase().includes(q.toLowerCase())) &&
          (!cat || x.category === cat) &&
          (!est || x.status === est),
      ),
    [snap, q, cat, est],
  );

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!snap) return <p className="text-sm text-muted-foreground">Cargando captura…</p>;

  const exportar = () =>
    downloadCsv(`captura-inventario-${snap.cut_date}.csv`, [
      ["corte", "codigo", "insumo", "categoria", "unidad_consumo", "stock", "minimo", "costo_unidad", "valor", "estado", "activo"],
      ...rows.map((x) => [snap.cut_date, x.sku, x.name, catLabel(x.category), x.consumption_unit, x.stock, x.min_stock,
        x.unit_cost.toFixed(6), x.value.toFixed(2), label(SUPPLY_STATUS_LABELS, x.status), x.is_active ? "sí" : "no"]),
    ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Captura al {fmtYmd(snap.cut_date)} · {snap.kind_label}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Stock con los movimientos hasta el día de corte, incluido. Tomada el {fmtDateTime(snap.taken_at)}. Valor total{" "}
          {soles(snap.total_value)}. No cambia aunque después se registren movimientos con fecha anterior.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar por código o nombre" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={selectCls} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {config?.categories.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <select className={selectCls} value={est} onChange={(e) => setEst(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(SUPPLY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Button variant="outline" onClick={exportar} disabled={!rows.length}>
            <Download className="size-4" /> Exportar CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
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
              {rows.map((x) => (
                <TableRow key={x.supply_id} className={cn(!x.is_active && "opacity-60")}>
                  <TableCell className="font-mono text-xs">{x.sku}</TableCell>
                  <TableCell className="font-medium">
                    {x.name}
                    {!x.is_active && <span className="ml-1 text-xs text-muted-foreground">(desactivado)</span>}
                  </TableCell>
                  <TableCell>{catLabel(x.category)}</TableCell>
                  <TableCell className="text-right tabular-nums">{qty(x.stock)} {x.consumption_unit}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{qty(x.min_stock)}</TableCell>
                  <TableCell className="text-right tabular-nums">S/ {x.unit_cost.toFixed(4)} / {x.consumption_unit}</TableCell>
                  <TableCell className="text-right tabular-nums">{soles(x.value)}</TableCell>
                  <TableCell>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_CLS[x.status])}>
                      {label(SUPPLY_STATUS_LABELS, x.status)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">Sin resultados.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
