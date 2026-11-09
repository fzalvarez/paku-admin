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

/** Proveedor de un insumo (lista propia de cada insumo). Solo el nombre es obligatorio. */
export interface Supplier {
  name: string;
  /** Código con que el proveedor conoce el producto (se ingresa a mano). */
  product_code: string | null;
  phone: string | null;
  address: string | null;
  bank_account: string | null;
  /** 11 dígitos. */
  ruc: string | null;
}

export interface Supply {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  description: string | null;
  suppliers: Supplier[];
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
  brand?: string | null;
  description?: string | null;
  /** Reemplaza la lista completa. */
  suppliers?: Supplier[];
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
  /** Cantidad en unidades de compra, si se ingresó así. */
  purchase_quantity: number | null;
  /** S/ por unidad de compra pagado en esta entrada. */
  purchase_price: number | null;
  /** null = vigente. Un anulado no cuenta en el stock. */
  voided_at: string | null;
  voided_by: string | null;
  voided_by_name: string | null;
  void_reason: string | null;
  /** Manual y vigente: se puede anular. */
  can_void: boolean;
}

export interface MovementInput {
  type: MovementType;
  supply_id: string;
  /** En unidad de consumo, siempre positiva; el signo sale del tipo (y de `direction` en ajustes).
   *  Enviar `quantity` o `purchase_quantity`, no ambos. */
  quantity?: number;
  /** En unidades de compra (solo compra y stock inicial). */
  purchase_quantity?: number;
  /** S/ por unidad de compra: obligatorio en compra, opcional en stock inicial. El costo del insumo pasa al
   *  promedio ponderado. */
  purchase_price?: number;
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
  /** Precio con IGV de la misma celda en la tabla de precios. */
  price: number | null;
  /** Precio ÷ (1 + IGV). */
  price_without_igv: number | null;
  /** Precio sin IGV − costo total. */
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
  /** IGV (%) de Parámetros generales con que se quitó el IGV al precio. */
  igv_percent: number;
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
  include_voided?: boolean;
  limit?: number;
} = {}): Promise<Movement[]> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== "") q.set(k, String(v));
  const qs = q.toString();
  return getJson<Movement[]>(`/admin/inventory/movements${qs ? `?${qs}` : ""}`);
}

export const registerMovement = (input: MovementInput) =>
  getJson<Movement>("/admin/inventory/movements", send("POST", input));

/** Anula un movimiento manual: queda en el historial y deja de contar en el stock. 404 MOVEMENT_NOT_FOUND;
 *  409 MOVEMENT_ALREADY_VOIDED / MOVEMENT_NOT_VOIDABLE; 422 VOID_REASON_REQUIRED. */
export const voidMovement = (id: string, reason: string) =>
  getJson<Movement>(`/admin/inventory/movements/${encodeURIComponent(id)}/void`, send("POST", { reason }));

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

// ─── Capturas (C-40): foto fija del stock en una fecha de corte ──────────────

export interface SnapshotSchedule {
  frequency: "weekly" | "semimonthly" | "monthly" | "none";
  frequency_label: string;
  /** Próximo corte; la captura se toma al terminar ese día. null si no hay captura automática. */
  next_cut: string | null;
}

export interface Snapshot {
  id: string;
  cut_date: string;
  kind: "scheduled" | "manual";
  kind_label: string;
  frequency: string | null;
  taken_at: string;
  /** null = sistema (automática). */
  created_by: string | null;
  supplies_count: number;
  total_value: number;
  low_count: number;
  out_count: number;
}

export interface SnapshotLine {
  supply_id: string;
  sku: string;
  name: string;
  category: string;
  consumption_unit: string;
  purchase_unit: string;
  is_active: boolean;
  stock: number;
  min_stock: number;
  unit_cost: number;
  value: number;
  status: SupplyStatus;
}

export interface SnapshotDetail extends Snapshot {
  lines: SnapshotLine[];
}

export function listSnapshots(range: { date_from?: string; date_to?: string } = {}) {
  const q = new URLSearchParams();
  if (range.date_from) q.set("date_from", range.date_from);
  if (range.date_to) q.set("date_to", range.date_to);
  const qs = q.toString();
  return getJson<{ schedule: SnapshotSchedule; items: Snapshot[] }>(`/admin/inventory/snapshots${qs ? `?${qs}` : ""}`);
}

export const getSnapshot = (id: string) =>
  getJson<SnapshotDetail>(`/admin/inventory/snapshots/${encodeURIComponent(id)}`);

/** Captura manual con corte hoy. */
export const takeSnapshot = () => getJson<SnapshotDetail>("/admin/inventory/snapshots", { method: "POST" });

// ─── Simulador de un servicio (C-46) ─────────────────────────────────────

export interface SimulationInput {
  product_id: string;
  addon_ids: string[];
  /** Sin raza: fila «mestizo». */
  breed_id?: string | null;
  weight_kg: number;
  /** Costo por hora de ese groomer; sin valor, el de referencia. */
  groomer_id?: string | null;
}

export interface SimulationLine {
  supply_id: string;
  sku: string;
  supply_name: string;
  consumption_unit: string;
  quantity: number;
  unit_cost: number;
  cost: number;
}

export interface SimulationItem {
  target_type: TargetType;
  target_id: string;
  name: string;
  /** null: sin precio para este pelaje y peso. */
  price: number | null;
  /** null: sin receta o sin celda para este pelaje y peso. */
  recipe_version: string | null;
  category_used: string | null;
  weight_min: number | null;
  weight_max: number | null;
  labor_minutes: number;
  supplies_cost: number;
  lines: SimulationLine[];
}

export interface SimulationSupply extends SimulationLine {
  /** % del costo de insumos del servicio. */
  cost_share_pct: number | null;
  stock: number;
  min_stock: number;
  stock_status: SupplyStatus;
  /** Servicios iguales que alcanzan con el stock de hoy (solo por este insumo). */
  services_with_stock: number | null;
}

export interface Simulation {
  product_id: string;
  product_name: string;
  breed_id: string | null;
  breed_name: string | null;
  breed_category: string;
  breed_category_label: string;
  weight_kg: number;
  weight_code: string | null;
  items: SimulationItem[];
  supplies: SimulationSupply[];
  /** null si algún ítem no tiene precio. */
  price: number | null;
  supplies_cost: number;
  labor_minutes: number;
  labor_rate: number | null;
  labor_rate_source: "groomer" | "reference";
  labor_cost: number | null;
  total_cost: number | null;
  margin: number | null;
  margin_pct: number | null;
  /** El insumo que primero se acaba manda. */
  max_services_with_stock: number | null;
  warnings: string[];
}

/** No registra nada. 404 PRODUCT_NOT_FOUND / ADDON_NOT_FOUND / BREED_NOT_FOUND; 422 ADDON_NOT_IN_SERVICE / WEIGHT_INVALID. */
export const simulateService = (input: SimulationInput) =>
  getJson<Simulation>("/admin/inventory/simulate", send("POST", input));

// ─── Formato ──────────────────────────────────────────────────────────────

export const soles = (n: number | null | undefined) =>
  n == null ? "—" : `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const qty = (n: number) => n.toLocaleString("es-PE", { maximumFractionDigits: 3 });

export const minutesLabel = (n: number | null | undefined) => (n == null ? "—" : `${qty(n)} min`);
