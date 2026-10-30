"use client";

// Receta de un servicio o adicional (paku-backend C-34): la misma tabla que los precios — filas = tipo de
// pelaje (+ "Mestizo u otra raza"), columnas = tramos de peso. Cada celda tiene minutos de groomer y la
// cantidad de cada insumo. Se edita por capas (minutos, un insumo a la vez) y se guarda completa como la
// versión siguiente (PUT /admin/inventory/recipes/{id}). Costos, precio y margen los calcula el backend.

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  cellKey,
  listActiveRules,
  rulesToMatrix,
  tierLabel,
  type PriceConfig,
} from "@/lib/services/pricing";
import {
  getRecipe,
  minutesLabel,
  saveRecipe,
  soles,
  type Recipe,
  type RecipeCell,
  type RecipeCellInput,
  type Supply,
} from "@/lib/services/inventory";
import type { PriceTarget } from "@/components/pricing/PriceMatrixEditor";
import { cn } from "@/lib/utils";

/** Celda en edición: minutos y cantidad por insumo, como texto (lo que escribe el admin). */
type DraftCell = { labor: string; lines: Record<string, string> };
type Draft = Record<string, DraftCell>;

const LABOR = "labor";
const COST = "cost";

const num = (s: string | undefined) => (s == null || s.trim() === "" ? null : Number(s.replace(",", ".")));
const same = (a: number | null, b: number | null) =>
  a === b || (a != null && b != null && Math.abs(a - b) < 0.005);

function recipeToDraft(recipe: Recipe | null, config: PriceConfig): { draft: Draft; outside: RecipeCell[] } {
  const draft: Draft = {};
  const outside: RecipeCell[] = [];
  for (const c of recipe?.cells ?? []) {
    const tier = config.weight_tiers.findIndex((t) => same(t.weight_min, c.weight_min) && same(t.weight_max, c.weight_max));
    if (tier < 0 || !config.categories.some((k) => k.key === c.breed_category)) {
      outside.push(c);
      continue;
    }
    draft[cellKey(c.breed_category, tier)] = {
      labor: c.labor_minutes ? String(c.labor_minutes) : "",
      lines: Object.fromEntries(c.lines.map((l) => [l.supply_id, String(l.quantity)])),
    };
  }
  return { draft, outside };
}

function draftToCells(draft: Draft, config: PriceConfig): RecipeCellInput[] {
  const cells: RecipeCellInput[] = [];
  for (const c of config.categories) {
    config.weight_tiers.forEach((t, i) => {
      const d = draft[cellKey(c.key, i)];
      if (!d) return;
      const labor = num(d.labor) ?? 0;
      const lines = Object.entries(d.lines)
        .map(([supply_id, v]) => ({ supply_id, quantity: num(v) ?? 0 }))
        .filter((l) => l.quantity > 0);
      if (labor > 0 || lines.length > 0) {
        cells.push({ breed_category: c.key, weight_min: t.weight_min, weight_max: t.weight_max, labor_minutes: labor, lines });
      }
    });
  }
  return cells;
}

const signature = (draft: Draft, config: PriceConfig) => JSON.stringify(draftToCells(draft, config));

interface Props {
  config: PriceConfig;
  target: PriceTarget;
  targets: PriceTarget[];
  supplies: Supply[];
}

export function RecipeMatrixEditor({ config, target, targets, supplies }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [saved, setSaved] = useState<Draft>({});
  const [draft, setDraft] = useState<Draft>({});
  const [outside, setOutside] = useState<RecipeCell[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [layers, setLayers] = useState<string[]>([]); // insumos de la receta (capas)
  const [layer, setLayer] = useState<string>(COST);
  const [addSupply, setAddSupply] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [saving, setSaving] = useState(false);

  const supplyById = useMemo(() => Object.fromEntries(supplies.map((s) => [s.id, s])), [supplies]);
  const fallback = config.fallback_category;

  function apply(r: Recipe | null) {
    const { draft: d, outside: out } = recipeToDraft(r, config);
    setRecipe(r);
    setSaved(d);
    setDraft(d);
    setOutside(out);
    setLayers(Array.from(new Set(Object.values(d).flatMap((c) => Object.keys(c.lines)))));
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [r, rules] = await Promise.all([getRecipe(target.id), listActiveRules(target.id)]);
      apply(r);
      setPrices(rulesToMatrix(rules, config).values);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la receta.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setNotice("");
    setLayer(COST);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id]);

  const dirty = signature(draft, config) !== signature(saved, config);
  const invalid = Object.values(draft).some(
    (c) => [c.labor, ...Object.values(c.lines)].some((v) => { const n = num(v); return n != null && (Number.isNaN(n) || n < 0); }),
  );

  const valueOf = (k: string) => (layer === LABOR ? draft[k]?.labor : draft[k]?.lines[layer]) ?? "";
  const setValue = (k: string, v: string) =>
    setDraft((prev) => {
      const cell = prev[k] ?? { labor: "", lines: {} };
      return {
        ...prev,
        [k]: layer === LABOR ? { ...cell, labor: v } : { ...cell, lines: { ...cell.lines, [layer]: v } },
      };
    });

  // Copia el primer valor de la fila a las celdas vacías de esa fila (p. ej. el deslanado: mismo tiempo en todos los pesos)
  function fillRow(category: string) {
    const ks = config.weight_tiers.map((_, i) => cellKey(category, i));
    const first = ks.map(valueOf).find((v) => v.trim() !== "");
    if (!first) return;
    for (const k of ks) if (valueOf(k).trim() === "") setValue(k, first);
  }

  async function handleCopy() {
    const source = targets.find((t) => t.id === copyFrom);
    if (!source) return;
    try {
      const r = await getRecipe(source.id);
      if (!r || r.cells.length === 0) {
        setError(`«${source.name}» no tiene receta para copiar.`);
        return;
      }
      const { draft: d } = recipeToDraft(r, config);
      setDraft(d);
      setLayers(Array.from(new Set(Object.values(d).flatMap((c) => Object.keys(c.lines)))));
      setNotice(`Copiado de «${source.name}». Revisa y guarda.`);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo copiar.");
    }
  }

  function removeLayer(supplyId: string) {
    setDraft((prev) =>
      Object.fromEntries(Object.entries(prev).map(([k, c]) => {
        const lines = { ...c.lines };
        delete lines[supplyId];
        return [k, { ...c, lines }];
      })),
    );
    setLayers((p) => p.filter((id) => id !== supplyId));
    setLayer(LABOR);
  }

  async function handleSave() {
    if (outside.length > 0 && !window.confirm(`${outside.length} celda(s) con tramos que ya no están en la tabla se quitarán al guardar. ¿Continuar?`)) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const r = await saveRecipe(target.id, target.type, draftToCells(draft, config));
      apply(r);
      setNotice(`Receta guardada como ${r.version_label}.`);
      setLayer(COST);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la receta.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando receta…</p>;

  const savedCells: Record<string, RecipeCell> = {};
  for (const c of recipe?.cells ?? []) {
    const i = config.weight_tiers.findIndex((t) => same(t.weight_min, c.weight_min) && same(t.weight_max, c.weight_max));
    if (i >= 0) savedCells[cellKey(c.breed_category, i)] = c;
  }
  const pricedWithoutRecipe = Object.keys(prices).filter((k) => !savedCells[k]).length;
  const available = supplies.filter((s) => s.is_active && !layers.includes(s.id));
  const groups = Array.from(new Set(targets.map((t) => t.group)));
  const layerSupply = layer !== LABOR && layer !== COST ? supplyById[layer] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{recipe ? `Versión vigente ${recipe.version_label}` : "Todavía no tiene receta"}</span>
        {recipe?.labor_rate != null ? (
          <span>· mano de obra a {soles(recipe.labor_rate)} por hora de servicio</span>
        ) : (
          <span className="text-amber-700">· sin costo de groomer registrado: la mano de obra no se costea (ver Groomers)</span>
        )}
      </div>

      {outside.length > 0 && (
        <Alert>{outside.length} celda(s) de la receta usan tramos de peso que ya no están en la tabla de precios; se quitan al guardar.</Alert>
      )}

      {/* ── Capas ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 border-b">
        <LayerTab active={layer === COST} onClick={() => setLayer(COST)}>Costo y margen</LayerTab>
        <LayerTab active={layer === LABOR} onClick={() => setLayer(LABOR)}>Minutos de groomer</LayerTab>
        {layers.map((id) => (
          <LayerTab key={id} active={layer === id} onClick={() => setLayer(id)}>
            {supplyById[id]?.name ?? "Insumo"} <span className="text-xs text-muted-foreground">({supplyById[id]?.consumption_unit})</span>
          </LayerTab>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-1">
          <select className="h-8 rounded-md border bg-background px-2 text-sm" value={addSupply} onChange={(e) => setAddSupply(e.target.value)}>
            <option value="">Agregar insumo…</option>
            {available.map((s) => <option key={s.id} value={s.id}>{s.sku} · {s.name}</option>)}
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={!addSupply}
            onClick={() => {
              setLayers((p) => [...p, addSupply]);
              setLayer(addSupply);
              setAddSupply("");
            }}
          >
            <Plus className="size-4" /> Agregar
          </Button>
        </div>
      </div>

      {layer === COST ? (
        <CostGrid config={config} cells={savedCells} prices={prices} fallback={fallback} pricedWithoutRecipe={pricedWithoutRecipe} dirty={dirty} />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-background p-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Copiar receta de</p>
              <div className="flex items-center gap-2">
                <select className="h-9 w-64 rounded-md border bg-background px-2 text-sm" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
                  <option value="">Elige servicio o adicional</option>
                  {groups.map((g) => (
                    <optgroup key={g} label={g}>
                      {targets.filter((t) => t.group === g && t.id !== target.id).map((t) => (
                        <option key={t.id} value={t.id}>{t.type === "addon" ? `${t.name} (adicional)` : t.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <Button variant="outline" onClick={handleCopy} disabled={!copyFrom}>Copiar</Button>
              </div>
            </div>
            {layerSupply && (
              <Button variant="ghost" size="sm" onClick={() => removeLayer(layerSupply.id)}>
                <Trash2 className="size-4" /> Quitar {layerSupply.name} de la receta
              </Button>
            )}
            <p className="flex-1 text-xs text-muted-foreground">
              {layer === LABOR
                ? "Minutos que el groomer dedica al servicio en cada celda (estimado; se compara con el tiempo real)."
                : `Cantidad de ${layerSupply?.name ?? "insumo"} en ${layerSupply?.consumption_unit ?? "su unidad"} por servicio.`}{" "}
              Las celdas en gris no tienen precio en la tabla de precios.
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Tipo de pelaje</th>
                  {config.weight_tiers.map((t, i) => (
                    <th key={i} className="px-2 py-2 text-left font-medium whitespace-nowrap">{tierLabel(t)}</th>
                  ))}
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {config.categories.map((c) => (
                  <tr key={c.key} className={cn("border-b last:border-0", c.key === fallback && "bg-muted/30")}>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">
                      {c.label}
                      {c.key === fallback && (
                        <span className="block text-xs font-normal text-muted-foreground">Mestizos, razas no listadas y respaldo</span>
                      )}
                    </td>
                    {config.weight_tiers.map((_, i) => {
                      const k = cellKey(c.key, i);
                      const v = valueOf(k);
                      const savedV = (layer === LABOR ? saved[k]?.labor : saved[k]?.lines[layer]) ?? "";
                      const n = num(v);
                      return (
                        <td key={i} className="px-2 py-1.5">
                          <Input
                            inputMode="decimal"
                            className={cn(
                              "h-8 w-20 tabular-nums",
                              prices[k] == null && "bg-muted/60",
                              num(v) !== num(savedV) && "border-amber-500 bg-amber-50",
                              n != null && (Number.isNaN(n) || n < 0) && "border-destructive",
                            )}
                            placeholder="—"
                            title={prices[k] == null ? "Sin precio en la tabla de precios" : `Precio ${soles(prices[k])}`}
                            value={v}
                            onChange={(e) => setValue(k, e.target.value)}
                            aria-label={`${c.label}, ${tierLabel(config.weight_tiers[i])}`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5">
                      <Button size="xs" variant="ghost" title="Copiar el primer valor de la fila a las celdas vacías" onClick={() => fillRow(c.key)}>
                        → fila
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && !error && <p className="text-sm text-muted-foreground">{notice}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSave} disabled={saving || (!dirty && outside.length === 0) || invalid}>
          {saving ? "Guardando…" : `Guardar como ${recipe ? `R${recipe.version + 1}` : "R1"}`}
        </Button>
        <Button variant="outline" disabled={!dirty || saving} onClick={() => apply(recipe)}>Descartar cambios</Button>
        {invalid && <span className="text-sm text-destructive">Hay valores no válidos.</span>}
        {dirty && !invalid && <span className="text-sm text-amber-700">Hay cambios sin guardar (celdas en amarillo).</span>}
      </div>
    </div>
  );
}

function CostGrid({
  config, cells, prices, fallback, pricedWithoutRecipe, dirty,
}: {
  config: PriceConfig;
  cells: Record<string, RecipeCell>;
  prices: Record<string, number>;
  fallback: string;
  pricedWithoutRecipe: number;
  dirty: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Costo por servicio = insumos + minutos × costo por hora de servicio; margen = precio de la misma celda − costo.
        {dirty && " Muestra la versión guardada: guarda para recalcular."}
      </p>
      {pricedWithoutRecipe > 0 && (
        <Alert>
          {pricedWithoutRecipe} celda(s) tienen precio pero no receta: si la orden cae ahí no se descuentan insumos ni se costea la
          mano de obra (salvo que la fila «Mestizo u otra raza» tenga esa celda).
        </Alert>
      )}
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Tipo de pelaje</th>
              {config.weight_tiers.map((t, i) => (
                <th key={i} className="px-2 py-2 text-left font-medium whitespace-nowrap">{tierLabel(t)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {config.categories.map((c) => (
              <tr key={c.key} className={cn("border-b last:border-0", c.key === fallback && "bg-muted/30")}>
                <td className="px-3 py-2 font-medium whitespace-nowrap">{c.label}</td>
                {config.weight_tiers.map((_, i) => {
                  const k = cellKey(c.key, i);
                  const cell = cells[k];
                  const price = prices[k];
                  if (!cell) {
                    return (
                      <td key={i} className={cn("px-2 py-1.5 text-xs", price != null ? "text-amber-700" : "text-muted-foreground")}>
                        {price != null ? `Sin receta · ${soles(price)}` : "—"}
                      </td>
                    );
                  }
                  return (
                    <td key={i} className="px-2 py-1.5 align-top text-xs">
                      <p className="text-sm font-semibold tabular-nums">{soles(cell.total_cost)}</p>
                      <p className="text-muted-foreground tabular-nums">
                        {soles(cell.supplies_cost)} ins. · {minutesLabel(cell.labor_minutes)}
                      </p>
                      {cell.margin != null ? (
                        <p className={cn("tabular-nums", cell.margin < 0 ? "text-red-600" : "text-emerald-700")}>
                          Margen {soles(cell.margin)}
                        </p>
                      ) : (
                        <p className="text-muted-foreground">Sin precio</p>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LayerTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap",
        active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{children}</div>;
}
