"use client";

// Simulador de un servicio (paku-backend C-46): servicio + adicionales + raza + peso → qué celda de cada receta se
// usa, cuánto consume de cada insumo frente al stock de hoy, minutos, mano de obra, precio y margen. No registra nada.

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Stat } from "@/components/crm/CrmUi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SUPPLY_STATUS_LABELS, label } from "@/lib/labels";
import { listGroomerCosts, type GroomerCost } from "@/lib/services/groomerCosts";
import {
  minutesLabel,
  qty,
  simulateService,
  soles,
  type Simulation,
  type SupplyStatus,
} from "@/lib/services/inventory";
import {
  listAddons,
  listBreeds,
  listCategories,
  listProducts,
  type Breed,
  type StoreAddon,
  type StoreCategory,
  type StoreProduct,
} from "@/lib/services/pricing";
import { cn } from "@/lib/utils";

const selectCls = "h-9 w-full rounded-md border bg-background px-2 text-sm";

const STATUS_CLS: Record<SupplyStatus, string> = {
  ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  low: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  out: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const tramo = (min: number | null, max: number | null) =>
  min == null ? "—" : max == null ? `más de ${qty(min)} kg` : `${qty(min)} – ${qty(max)} kg`;

export function ServiceSimulator() {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [groomers, setGroomers] = useState<GroomerCost[]>([]);
  const [addons, setAddons] = useState<StoreAddon[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);

  const [productId, setProductId] = useState("");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [breedId, setBreedId] = useState("");
  const [weight, setWeight] = useState("8");
  const [groomerId, setGroomerId] = useState("");

  const [sim, setSim] = useState<Simulation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cats = await listCategories();
        const lists = await Promise.all(cats.map((c) => listProducts(c.id)));
        setCategories(cats);
        const all = lists.flat();
        setProducts(all);
        setProductId((p) => p || all.find((x) => x.is_active)?.id || all[0]?.id || "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudieron cargar los servicios.");
      }
      // Sin costos de groomer se usa el de referencia; no bloquea el simulador
      listGroomerCosts().then((g) => setGroomers(g.groomers.filter((x) => x.current))).catch(() => setGroomers([]));
    })();
  }, []);

  const product = products.find((p) => p.id === productId) ?? null;

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    setAddonIds([]);
    Promise.all([listAddons(product.id), listBreeds(product.species)])
      .then(([a, b]) => {
        if (cancelled) return;
        setAddons(a);
        setBreeds(b.filter((x) => x.is_active).sort((x, y) => x.name.localeCompare(y.name, "es")));
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "No se pudieron cargar adicionales y razas."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const weightKg = Number(weight.replace(",", "."));
  const validWeight = Number.isFinite(weightKg) && weightKg > 0 && weightKg <= 150;

  useEffect(() => {
    if (!productId || !validWeight) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const r = await simulateService({
          product_id: productId, addon_ids: addonIds, breed_id: breedId || null, weight_kg: weightKg,
          groomer_id: groomerId || null,
        });
        if (!cancelled) setSim(r);
      } catch (e) {
        if (!cancelled) {
          setSim(null);
          setError(e instanceof Error ? e.message : "No se pudo simular el servicio.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [productId, addonIds, breedId, weightKg, validWeight, groomerId]);

  const byCategory = useMemo(
    () => categories.map((c) => ({ c, items: products.filter((p) => p.category_id === c.id) })).filter((g) => g.items.length),
    [categories, products],
  );

  const toggleAddon = (id: string) =>
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="space-y-4">
      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Elige un servicio, sus adicionales, la raza y el peso para ver qué celda de cada receta se usaría, cuánto se
        consume de cada insumo, la mano de obra y el margen. Usa las recetas, precios y costos de hoy; no registra nada.
      </p>

      <Card>
        <CardContent className="grid gap-4 pt-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="sim-product">Servicio</Label>
            <select id="sim-product" className={selectCls} value={productId} onChange={(e) => setProductId(e.target.value)}>
              {byCategory.map(({ c, items }) => (
                <optgroup key={c.id} label={c.name}>
                  {items.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.is_active ? "" : " (inactivo)"}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sim-breed">Raza</Label>
            <select id="sim-breed" className={selectCls} value={breedId} onChange={(e) => setBreedId(e.target.value)}>
              <option value="">Sin raza (mestizo u otra)</option>
              {breeds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sim-weight">Peso (kg)</Label>
            <Input
              id="sim-weight"
              inputMode="decimal"
              value={weight}
              className={cn(!validWeight && "border-destructive")}
              onChange={(e) => setWeight(e.target.value)}
            />
            {!validWeight && <p className="text-xs text-destructive">Ingresa un peso entre 0 y 150 kg.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sim-groomer">Mano de obra</Label>
            <select id="sim-groomer" className={selectCls} value={groomerId} onChange={(e) => setGroomerId(e.target.value)}>
              <option value="">Costo de referencia (promedio)</option>
              {groomers.map((g) => (
                <option key={g.groomer_id} value={g.groomer_id}>{g.first_name} {g.last_name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2 xl:col-span-4">
            <Label>Adicionales</Label>
            {addons.length === 0 ? (
              <p className="text-sm text-muted-foreground">Este servicio no tiene adicionales.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {addons.map((a) => {
                  const on = addonIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAddon(a.id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                        !a.is_active && "opacity-60",
                      )}
                    >
                      {a.name}{a.is_active ? "" : " (inactivo)"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && !sim && <p className="text-sm text-muted-foreground">Calculando…</p>}

      {sim && (
        <div className={cn("space-y-4 transition-opacity", loading && "opacity-60")}>
          <p className="text-sm text-muted-foreground">
            {sim.breed_name ?? "Sin raza"} → fila <strong>{sim.breed_category_label}</strong> · {qty(sim.weight_kg)} kg
            {sim.weight_code ? ` (${sim.weight_code})` : ""} · mano de obra a{" "}
            {sim.labor_rate != null ? `${soles(sim.labor_rate)}/h` : "—"}{" "}
            ({sim.labor_rate_source === "groomer" ? "del groomer elegido" : "referencia"})
          </p>

          {sim.warnings.length > 0 && (
            <div className="space-y-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              {sim.warnings.map((w) => (
                <p key={w} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{w}</p>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Stat label="Precio de venta" value={soles(sim.price)} sub={sim.price == null ? "Falta algún precio" : "Servicio + adicionales"} warn={sim.price == null} />
            <Stat label="Insumos" value={soles(sim.supplies_cost)} sub={`${sim.supplies.length} insumos`} />
            <Stat label="Mano de obra" value={soles(sim.labor_cost)} sub={minutesLabel(sim.labor_minutes)} warn={sim.labor_cost == null} />
            <Stat label="Costo total" value={soles(sim.total_cost)} />
            <Stat
              label="Margen"
              value={soles(sim.margin)}
              sub={sim.margin_pct != null ? `${qty(sim.margin_pct)} % del precio` : undefined}
              warn={sim.margin != null && sim.margin < 0}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consumo de insumos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Lo que se descontaría del stock al terminar este servicio.
                {sim.max_services_with_stock != null && (
                  <> Con el stock de hoy alcanza para <strong>{sim.max_services_with_stock}</strong> servicios iguales.</>
                )}
              </p>
            </CardHeader>
            <CardContent>
              {sim.supplies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No consume insumos (sin receta para este pelaje y peso).</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insumo</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Costo unit.</TableHead>
                        <TableHead className="text-right">Costo</TableHead>
                        <TableHead className="text-right">% insumos</TableHead>
                        <TableHead className="text-right">Stock hoy</TableHead>
                        <TableHead className="text-right">Alcanza para</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sim.supplies.map((s) => (
                        <TableRow key={s.supply_id}>
                          <TableCell>
                            <p className="font-medium">{s.supply_name}</p>
                            <p className="text-xs text-muted-foreground">{s.sku}</p>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{qty(s.quantity)} {s.consumption_unit}</TableCell>
                          <TableCell className="text-right tabular-nums">{soles(s.unit_cost)}</TableCell>
                          <TableCell className="text-right tabular-nums">{soles(s.cost)}</TableCell>
                          <TableCell className="text-right tabular-nums">{s.cost_share_pct != null ? `${qty(s.cost_share_pct)} %` : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{qty(s.stock)} {s.consumption_unit}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.services_with_stock != null ? `${s.services_with_stock} servicios` : "—"}
                          </TableCell>
                          <TableCell>
                            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_CLS[s.stock_status])}>
                              {label(SUPPLY_STATUS_LABELS, s.stock_status)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalle por servicio y adicional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sim.items.map((i) => (
                <div key={i.target_id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">
                      {i.name} <span className="text-xs font-normal text-muted-foreground">{i.target_type === "product" ? "Servicio" : "Adicional"}</span>
                    </p>
                    <p className="text-sm tabular-nums">
                      Precio {soles(i.price)} · Insumos {soles(i.supplies_cost)} · {minutesLabel(i.labor_minutes)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {i.recipe_version
                      ? `Receta ${i.recipe_version} · fila ${i.category_used === sim.breed_category ? sim.breed_category_label : "Mestizo (respaldo)"} · tramo ${tramo(i.weight_min, i.weight_max)}`
                      : "Sin receta para este pelaje y peso"}
                  </p>
                  {i.lines.length > 0 && (
                    <ul className="mt-2 grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
                      {i.lines.map((l) => (
                        <li key={l.supply_id} className="flex justify-between gap-2">
                          <span>{l.supply_name}</span>
                          <span className="tabular-nums text-muted-foreground">{qty(l.quantity)} {l.consumption_unit} · {soles(l.cost)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
