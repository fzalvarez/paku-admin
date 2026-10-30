"use client";

// Inventario · Recetas y costeo (paku-backend C-34 y C-37). Una receta por servicio y por adicional, con la
// misma tabla que los precios (pelaje × peso); cada celda tiene insumos y minutos de groomer. El costeo de
// una orden suma insumos y mano de obra (estimada con la receta y real con los tiempos registrados).

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RecipeMatrixEditor } from "@/components/inventory/RecipeMatrixEditor";
import type { PriceTarget } from "@/components/pricing/PriceMatrixEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDateTime } from "@/lib/orders";
import type { Order } from "@/lib/orders";
import { listOrders } from "@/lib/services/orders";
import {
  consumeOrder,
  getOrderCost,
  listRecipes,
  listSupplies,
  minutesLabel,
  qty,
  soles,
  type OrderCost,
  type RecipeSummary,
  type Supply,
} from "@/lib/services/inventory";
import {
  getPriceConfig,
  listAddons,
  listCategories,
  listProducts,
  tierLabel,
  type PriceConfig,
  type StoreCategory,
} from "@/lib/services/pricing";
import { cn } from "@/lib/utils";

type Tab = "receta" | "costeo";
const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

export default function RecetasPage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando recetas...</p>}>
      <Recetas />
    </Suspense>
  );
}

function Recetas() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab) || "receta";

  const setQuery = useCallback(
    (patch: Record<string, string>) => {
      const q = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) if (v) q.set(k, v); else q.delete(k);
      router.replace(`${pathname}?${q}`, { scroll: false });
    },
    [router, pathname, params],
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        {([["receta", "Tabla de receta"], ["costeo", "Costeo de una orden"]] as [Tab, string][]).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setQuery({ tab: k })}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              tab === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "costeo" ? <OrderCosting orderId={params.get("orden")} onOrder={(id) => setQuery({ orden: id })} /> : (
        <RecipeTab categoryId={params.get("categoria")} targetId={params.get("target")} setQuery={setQuery} />
      )}
    </div>
  );
}

// ─── Tabla de receta ─────────────────────────────────────────────────────

function RecipeTab({
  categoryId, targetId, setQuery,
}: { categoryId: string | null; targetId: string | null; setQuery: (p: Record<string, string>) => void }) {
  const [config, setConfig] = useState<PriceConfig | null>(null);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [targets, setTargets] = useState<PriceTarget[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [summaries, setSummaries] = useState<RecipeSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPriceConfig(), listCategories(), listSupplies(), listRecipes()])
      .then(([cfg, cats, sup, recs]) => {
        setConfig(cfg);
        setCategories(cats);
        setSupplies(sup);
        setSummaries(recs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar la configuración."))
      .finally(() => setLoading(false));
  }, []);

  const category = categoryId ?? categories[0]?.id ?? null;

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    (async () => {
      try {
        const products = await listProducts(category);
        const addons = await Promise.all(products.map((p) => listAddons(p.id)));
        if (cancelled) return;
        setTargets([
          ...products.map((p): PriceTarget => ({ id: p.id, type: "product", name: p.name, group: p.name })),
          ...products.flatMap((p, i) => addons[i].map((a): PriceTarget => ({ id: a.id, type: "addon", name: a.name, group: p.name }))),
        ]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudieron cargar los servicios.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category]);

  const products = useMemo(() => targets.filter((t) => t.type === "product"), [targets]);
  const target = targets.find((t) => t.id === targetId) ?? products[0] ?? null;
  const versionOf = (id: string) => summaries.find((s) => s.target_id === id)?.version_label;

  if (loading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-3">
      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        La receta se elige igual que el precio: fila del <strong>tipo de pelaje</strong> de la raza (o «Mestizo u otra
        raza» si esa celda falta) y columna del <strong>peso registrado</strong> por el groomer. Al terminar la orden se
        descuentan sus insumos del stock; los minutos se costean con el costo por hora de servicio del groomer.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {supplies.length === 0 && (
        <p className="text-sm text-amber-700">Primero crea los insumos (pestaña Insumos) para poder armar recetas.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select className={selectCls} value={category ?? ""} onChange={(e) => setQuery({ categoria: e.target.value, target: "" })}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={cn(selectCls, "w-80")} value={target?.id ?? ""} onChange={(e) => setQuery({ target: e.target.value })}>
          <optgroup label="Servicios">
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{versionOf(p.id) ? ` · ${versionOf(p.id)}` : " · sin receta"}</option>
            ))}
          </optgroup>
          {products.map((p) => {
            const addons = targets.filter((t) => t.type === "addon" && t.group === p.name);
            if (!addons.length) return null;
            return (
              <optgroup key={`g-${p.id}`} label={`Adicionales de ${p.name}`}>
                {addons.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}{versionOf(a.id) ? ` · ${versionOf(a.id)}` : " · sin receta"}</option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </div>
      {config && target ? (
        <RecipeMatrixEditor key={target.id} config={config} target={target} targets={targets} supplies={supplies} />
      ) : (
        <p className="text-sm text-muted-foreground">No hay servicios en esta categoría.</p>
      )}
    </div>
  );
}

// ─── Costeo de una orden ─────────────────────────────────────────────────

function OrderCosting({ orderId, onOrder }: { orderId: string | null; onOrder: (id: string) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [cost, setCost] = useState<OrderCost | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listOrders("done")
      .then((list) => setOrders(list.filter((o) => !o.parent_order_id)))
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar las órdenes."));
  }, []);

  const load = useCallback(async (id: string) => {
    setError("");
    setCost(null);
    try {
      setCost(await getOrderCost(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo calcular el costo.");
    }
  }, []);

  useEffect(() => {
    if (orderId) load(orderId);
  }, [orderId, load]);

  async function handleConsume() {
    if (!orderId) return;
    setBusy(true);
    try {
      await consumeOrder(orderId);
      await load(orderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el consumo.");
    } finally {
      setBusy(false);
    }
  }

  const c = cost;
  const lines: [string, number | null][] = c
    ? [
        [`Insumos (${c.registered ? "registrados" : "estimados con la receta"})`, c.supplies_cost],
        [`Mano de obra estimada (${minutesLabel(c.estimated_minutes)} × ${soles(c.labor_rate)}/h)`, c.labor_cost_estimated],
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className={cn(selectCls, "w-96")} value={orderId ?? ""} onChange={(e) => onOrder(e.target.value)}>
          <option value="">Elige una orden terminada…</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.id.slice(0, 8)} · {fmtDateTime(o.completed_at ?? o.updated_at)} · {soles(o.total_snapshot ?? 0)}
            </option>
          ))}
        </select>
        {orders.length === 0 && !error && <span className="text-sm text-muted-foreground">No hay órdenes terminadas.</span>}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {c && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Margen del servicio · orden {c.order_id.slice(0, 8)}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fila {c.breed_category} · {c.weight_kg != null ? `${qty(c.weight_kg)} kg` : "sin peso"} ·{" "}
              {c.cells.map((x) => `${x.name} ${x.recipe_version} (${tierLabel({ weight_min: x.weight_min, weight_max: x.weight_max })})`).join(" + ") || "sin receta"}
            </p>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between font-semibold">
                <dt>Venta</dt>
                <dd className="tabular-nums">{soles(c.sale_total)}</dd>
              </div>
              {lines.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 text-muted-foreground">
                  <dt>(−) {k}</dt>
                  <dd className="tabular-nums">{soles(v)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <dt>Margen estimado</dt>
                <dd className={cn("tabular-nums", (c.margin_estimated ?? 0) < 0 ? "text-red-600" : "text-emerald-600 dark:text-emerald-400")}>
                  {soles(c.margin_estimated)}{c.margin_estimated_pct != null && ` · ${c.margin_estimated_pct} %`}
                </dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Con el tiempo real ({minutesLabel(c.real_service_minutes)})</dt>
                <dd className="tabular-nums">{soles(c.margin_real)}</dd>
              </div>
              <p className="pt-1 text-xs text-muted-foreground">
                Comisión de pasarela, variable del groomer y otros costos directos todavía no están en el sistema.
                {c.labor_rate_source === "reference" && " La mano de obra usa el costo de referencia (este groomer no tiene registro)."}
              </p>
            </dl>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <Mini label="Minutos estimados" value={minutesLabel(c.estimated_minutes)} />
                <Mini
                  label="Servicio real"
                  value={minutesLabel(c.real_service_minutes)}
                  warn={c.real_service_minutes != null && c.real_service_minutes > c.estimated_minutes * 1.15}
                />
                <Mini label="Traslado real" value={minutesLabel(c.real_travel_minutes)} />
              </div>
              {c.missing_recipes.length > 0 && (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
                  Sin receta para: {c.missing_recipes.map((m) => m.name).join(", ")}.
                </p>
              )}
              {!c.registered && c.status === "done" && c.lines.length > 0 && (
                <Button variant="outline" size="sm" disabled={busy} onClick={handleConsume}>
                  {busy ? "Registrando…" : "Registrar el consumo de esta orden"}
                </Button>
              )}
            </div>
            {c.lines.length > 0 && (
              <div className="md:col-span-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.lines.map((l, i) => (
                      <TableRow key={`${l.supply_id}-${i}`}>
                        <TableCell><span className="font-mono text-xs text-muted-foreground">{l.sku}</span> {l.supply_name}</TableCell>
                        <TableCell className="text-right tabular-nums">{qty(l.quantity)} {l.consumption_unit}</TableCell>
                        <TableCell className="text-right tabular-nums">{soles(l.cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Mini({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-2", warn && "border-amber-300 bg-amber-50")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
