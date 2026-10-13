// Precios de la tienda (feature 0007). Espejo de paku-backend:
// app/modules/store/api/router.py — /admin/store/price-* (C-25, feature 0004 del backend).
// La categoría de precio de una mascota es el tipo de pelaje de su raza o "mestizo" (respaldo).

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export type Species = "dog" | "cat";
export type TargetType = "product" | "addon";

export interface PriceCategory {
  key: string;
  label: string;
}

export interface WeightTier {
  weight_min: number;
  weight_max: number | null;
}

export interface PriceConfig {
  categories: PriceCategory[];
  fallback_category: string;
  weight_tiers: WeightTier[];
}

export interface PriceRule {
  id: string;
  target_id: string;
  target_type: TargetType;
  species: Species;
  breed_category: string;
  weight_min: number;
  weight_max: number | null;
  price: number; // soles con decimales (85 = S/ 85.00)
  currency: string;
  is_active: boolean;
}

export interface MatrixCell {
  breed_category: string;
  weight_min: number;
  weight_max: number | null;
  price: number;
}

export interface StoreProduct {
  id: string;
  category_id: string;
  name: string;
  species: Species;
  allowed_breeds: string[] | null;
  is_active: boolean;
}

export interface StoreAddon {
  id: string;
  product_id: string;
  name: string;
  species: Species;
  allowed_breeds: string[] | null;
  is_active: boolean;
}

export interface StoreCategory {
  id: string;
  name: string;
}

export interface Breed {
  id: string;
  name: string;
  species: Species;
  is_active: boolean;
}

export interface SimulatedPrice {
  id: string;
  name: string;
  price: number | null;
  category_used: string | null;
  used_fallback: boolean;
}

export interface SimulatedProduct extends SimulatedPrice {
  addons: SimulatedPrice[];
}

export interface PriceSimulation {
  price_category: string;
  price_category_label: string;
  products: SimulatedProduct[];
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<T>;
}

export const getPriceConfig = () => getJson<PriceConfig>("/admin/store/price-config");

export const listCategories = () => getJson<StoreCategory[]>("/admin/store/categories");

export const listProducts = (categoryId: string) =>
  getJson<StoreProduct[]>(`/admin/store/products?category_id=${encodeURIComponent(categoryId)}`);

export const listAddons = (productId: string) =>
  getJson<StoreAddon[]>(`/admin/store/addons?product_id=${encodeURIComponent(productId)}`);

export const listBreeds = (species: Species) =>
  getJson<Breed[]>(`/admin/breeds?species=${species}`);

/** Reglas activas del producto/addon (el backend devuelve también las inactivas). */
export async function listActiveRules(targetId: string): Promise<PriceRule[]> {
  const rules = await getJson<PriceRule[]>(
    `/admin/store/price-rules?target_id=${encodeURIComponent(targetId)}`,
  );
  return rules.filter((r) => r.is_active);
}

/** Reemplaza la tabla completa (las reglas activas anteriores quedan inactivas). */
export const savePriceMatrix = (targetId: string, targetType: TargetType, cells: MatrixCell[]) =>
  getJson<PriceRule[]>(`/admin/store/price-matrix/${encodeURIComponent(targetId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_type: targetType, cells }),
  });

/** Desactiva una regla suelta (p. ej. de una categoría antigua). */
export const deactivateRule = (ruleId: string) =>
  getJson<PriceRule>(`/admin/store/price-rules/${encodeURIComponent(ruleId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active: false }),
  });

export function simulatePrices(params: {
  categoryId: string;
  weight: number;
  species?: Species;
  breedId?: string | null;
}): Promise<PriceSimulation> {
  const q = new URLSearchParams({
    category_id: params.categoryId,
    weight: String(params.weight),
    species: params.species ?? "dog",
  });
  if (params.breedId) q.set("breed_id", params.breedId);
  return getJson<PriceSimulation>(`/admin/store/price-simulation?${q}`);
}

// ─── Tabla: reglas ↔ celdas ────────────────────────────────────────────────

/** Clave de una celda de la tabla (categoría × tramo). */
export const cellKey = (category: string, tierIndex: number) => `${category}|${tierIndex}`;

const same = (a: number | null, b: number | null) =>
  a === b || (a != null && b != null && Math.abs(a - b) < 0.005);

/**
 * Ubica las reglas activas en la tabla (categoría × tramo). Las que no calzan con un tramo o tienen
 * una categoría que ya no se usa quedan aparte, para avisar y poder desactivarlas.
 */
export function rulesToMatrix(rules: PriceRule[], config: PriceConfig) {
  const validCategories = new Set(config.categories.map((c) => c.key));
  const values: Record<string, number> = {};
  const outside: PriceRule[] = [];
  for (const r of rules) {
    const tier = config.weight_tiers.findIndex(
      (t) => same(t.weight_min, r.weight_min) && same(t.weight_max, r.weight_max),
    );
    if (!validCategories.has(r.breed_category) || tier < 0) {
      outside.push(r);
      continue;
    }
    values[cellKey(r.breed_category, tier)] = r.price;
  }
  return { values, outside };
}

export function matrixToCells(values: Record<string, number>, config: PriceConfig): MatrixCell[] {
  const cells: MatrixCell[] = [];
  for (const c of config.categories) {
    config.weight_tiers.forEach((t, i) => {
      const price = values[cellKey(c.key, i)];
      if (price != null && !Number.isNaN(price)) {
        cells.push({ breed_category: c.key, weight_min: t.weight_min, weight_max: t.weight_max, price });
      }
    });
  }
  return cells;
}

export function tierLabel(t: WeightTier): string {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""));
  if (t.weight_max == null) return `Más de ${fmt(Math.floor(t.weight_min))} kg`;
  return t.weight_min === 0 ? `Hasta ${fmt(t.weight_max)} kg` : `${fmt(Math.floor(t.weight_min))}–${fmt(t.weight_max)} kg`;
}
