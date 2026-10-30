// Inventario. Espejo de paku-backend: app/modules/inventory/api/router.py — /admin/inventory/* (C-34).
// Stock = suma de movimientos. Las recetas tienen la forma de la tabla de precios: una por servicio y por
// adicional, filas = tipo de pelaje (+ "mestizo"), columnas = tramos de peso (GET /admin/store/price-config).

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";
import type { TargetType } from "@/lib/services/pricing";

export type SupplyStatus = "ok" | "low" | "out";
export type MovementType = "initial_stock" | "purchase" | "consumption" | "adjustment" | "waste";

export interface CodeLabel {
  code: string;
  label: string;
}

export interface InventoryConfig {
  categories: CodeLabel[];
  consumption_units: string[];
  movement_types: CodeLabel[];
  manual_movement_types: MovementType[];
  locations: string[];
  cost_centers: CodeLabel[];
}

export interface Supply {
  id: string;
  sku: string;
  name: string;
  category: string;
  category_label: string;
  purchase_unit: string;
  purchase_content: number;
  consumption_unit: string;
  purchase_cost: number;
  unit_cost: number;
  min_stock: number;
  tracks_lot: boolean;
  tracks_expiry: boolean;
  is_active: boolean;
  stock: number;
  status: SupplyStatus;
  value: number;
  created_at: string;
  updated_at: string;
}

export interface SupplyInput {
  name: string;
  category: string;
  purchase_unit: string;
  purchase_content: number;
  consumption_unit: string;
  purchase_cost: number;
  min_stock: number;
  tracks_lot?: boolean;
  tracks_expiry?: boolean;
}

export interface Movement {
  id: string;
  code: string;
  occurred_on: string;
  type: MovementType;
  type_label: string;
  supply_id: string;
  sku: string;
  supply_name: string;
  consumption_unit: string;
  quantity: number;
  unit_cost: number;
  cost: number;
  location: string | null;
  cost_center: string | null;
  order_id: string | null;
  recipe_id: string | null;
  reason: string;
  lot: string | null;
  expires_on: string | null;
  created_by: string | null;
  /** null = sistema (consumo automático al terminar la orden). */
  created_by_name: string | null;
  created_at: string;
}

export interface MovementInput {
  type: MovementType;
  supply_id: string;
  /** Siempre positiva; el signo sale del tipo (y de `direction` en ajustes). */
  quantity: number;
  direction?: "in" | "out";
  occurred_on?: string;
  location?: string;
  cost_center?: string;
  reason: string;
}

export interface InventorySummary {
  inventory_value: number;
  supplies_below_min: number;
  consumption_cost: number;
  orders_with_consumption: number;
  avg_cost_per_order: number | null;
}

export interface RecipeLine {
  supply_id: string;
  sku: string;
  supply_name: string;
  consumption_unit: string;
  quantity: number;
  unit_cost: number;
  cost: number;
}

export interface RecipeCell {
  id: string | null;
  breed_category: string;
  weight_min: number;
  weight_max: number | null;
  labor_minutes: number;
  lines: RecipeLine[];
  supplies_cost: number;
  labor_cost: number | null;
  total_cost: number;
  price: number | null;
  margin: number | null;
}

export interface Recipe {
  id: string;
  target_type: TargetType;
  target_id: string;
  target_name: string | null;
  version: number;
  version_label: string;
  is_current: boolean;
  cells: RecipeCell[];
  /** S/ por hora de servicio con que se calculó labor_cost (null si ningún groomer tiene costo). */
  labor_rate: number | null;
  created_at: string;
}

export interface RecipeSummary {
  target_type: TargetType;
  target_id: string;
  target_name: string | null;
  version_label: string;
  cells: number;
  created_at: string;
}

export interface RecipeCellInput {
  breed_category: string;
  weight_min: number;
  weight_max: number | null;
  labor_minutes: number;
  lines: { supply_id: string; quantity: number }[];
}

export interface OrderCost {
  order_id: string;
  status: string;
  sale_total: number;
  breed_category: string;
  weight_kg: number | null;
  registered: boolean;
  lines: (RecipeLine & { recipe_id: string | null; recipe_version: string | null })[];
  cells: {
    target_type: TargetType;
    ref_id: string;
    name: string;
    recipe_id: string;
    recipe_version: string;
    breed_category: string;
    weight_min: number;
    weight_max: number | null;
    labor_minutes: number;
  }[];
  missing_recipes: { target_type: TargetType; ref_id: string; name: string }[];
  supplies_cost: number;
  labor_rate: number | null;
  labor_rate_source: "groomer" | "reference";
  estimated_minutes: number;
  labor_cost_estimated: number | null;
  real_travel_minutes: number | null;
  real_service_minutes: number | null;
  labor_cost_real: number | null;
  total_cost_estimated: number | null;
  margin_estimated: number | null;
  margin_estimated_pct: number | null;
  total_cost_real: number | null;
  margin_real: number | null;
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<T>;
}

const send = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const getInventoryConfig = () => getJson<InventoryConfig>("/admin/inventory/config");

export const listSupplies = () => getJson<Supply[]>("/admin/inventory/supplies");

export const createSupply = (input: SupplyInput) => getJson<Supply>("/admin/inventory/supplies", send("POST", input));

export const updateSupply = (id: string, patch: Partial<SupplyInput> & { is_active?: boolean }) =>
  getJson<Supply>(`/admin/inventory/supplies/${encodeURIComponent(id)}`, send("PATCH", patch));

export function listMovements(filters: {
  type?: string;
  supply_id?: string;
  order_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
} = {}): Promise<Movement[]> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== "") q.set(k, String(v));
  const qs = q.toString();
  return getJson<Movement[]>(`/admin/inventory/movements${qs ? `?${qs}` : ""}`);
}

export const registerMovement = (input: MovementInput) =>
  getJson<Movement>("/admin/inventory/movements", send("POST", input));

export function getInventorySummary(range: { date_from?: string; date_to?: string }): Promise<InventorySummary> {
  const q = new URLSearchParams();
  if (range.date_from) q.set("date_from", range.date_from);
  if (range.date_to) q.set("date_to", range.date_to);
  const qs = q.toString();
  return getJson<InventorySummary>(`/admin/inventory/summary${qs ? `?${qs}` : ""}`);
}

export const listRecipes = () => getJson<RecipeSummary[]>("/admin/inventory/recipes");

/** Tabla vigente del servicio o adicional; null si todavía no tiene receta. */
export const getRecipe = (targetId: string) =>
  getJson<Recipe | null>(`/admin/inventory/recipes/${encodeURIComponent(targetId)}`);

export const listRecipeVersions = (targetId: string) =>
  getJson<Recipe[]>(`/admin/inventory/recipes/${encodeURIComponent(targetId)}/versions`);

/** Guarda la tabla completa como la versión siguiente (R1 → R2). */
export const saveRecipe = (targetId: string, targetType: TargetType, cells: RecipeCellInput[]) =>
  getJson<Recipe>(`/admin/inventory/recipes/${encodeURIComponent(targetId)}`, send("PUT", { target_type: targetType, cells }));

export const getOrderCost = (orderId: string) =>
  getJson<OrderCost>(`/admin/inventory/orders/${encodeURIComponent(orderId)}/cost`);

export const consumeOrder = (orderId: string) =>
  getJson<Movement[]>(`/admin/inventory/orders/${encodeURIComponent(orderId)}/consume`, { method: "POST" });

// ─── Formato ──────────────────────────────────────────────────────────────

export const soles = (n: number | null | undefined) =>
  n == null ? "—" : `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const qty = (n: number) => n.toLocaleString("es-PE", { maximumFractionDigits: 3 });

export const minutesLabel = (n: number | null | undefined) => (n == null ? "—" : `${qty(n)} min`);
