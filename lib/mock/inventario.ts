// DATOS DE EJEMPLO — módulo de Inventario de demostración (sin backend).
// Basado en PAKU_Backend_Inventario_Finanzas_V2_Alineado_Pricing.xlsx (hojas 03, 05, 09, 10 y 18).
// Costos y cantidades son ilustrativos; no representan operación real.

import { ORDENES, OTROS_DIRECTOS_POR_SERVICIO, VALOR_PUNTO, puntosDe, type OrdenDemo } from "./ordenes";

export type MovementType = "stock_inicial" | "compra" | "consumo" | "ajuste" | "merma";

export type Insumo = {
  sku: string;
  nombre: string;
  categoria: string;
  unidadCompra: string;
  contenidoCompra: number; // en unidad de consumo
  unidadConsumo: string;
  costoCompra: number; // S/ por unidad de compra
  stockMinimo: number; // en unidad de consumo
  controlLote: boolean;
  controlVencimiento: boolean;
};

export type Movimiento = {
  id: string;
  fecha: string; // YYYY-MM-DD
  tipo: MovementType;
  sku: string;
  cantidad: number; // + entra, − sale (unidad de consumo)
  origen: string;
  destino: string;
  orden?: string;
  centroCosto: string;
  usuario: string;
  motivo: string;
};

export type RecetaLinea = { sku: string; cantidad: number };
export type Receta = {
  id: string;
  serviceCode: string;
  servicio: string;
  weightCode: string;
  rangoPeso: string;
  coatSegment: string;
  addonCode?: string;
  version: string;
  lineas: RecetaLinea[];
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  stock_inicial: "Stock inicial",
  compra: "Compra",
  consumo: "Consumo servicio",
  ajuste: "Ajuste",
  merma: "Merma",
};

export const CATEGORIAS = ["Cosmético", "Higiene", "Consumible", "Limpieza", "Repuesto"];
export const UBICACIONES = ["Almacén central", "Paku 01"];
export const CENTROS_COSTO = [
  { code: "CC-PAKU01", name: "Paku Spa – Unidad 01" },
  { code: "CC-SPA-GEN", name: "Paku Spa – General" },
  { code: "CC-ADM", name: "Administración" },
];

export const INSUMOS: Insumo[] = [
  { sku: "INS-001", nombre: "Shampoo hipoalergénico", categoria: "Cosmético", unidadCompra: "Galón", contenidoCompra: 3785, unidadConsumo: "ml", costoCompra: 185, stockMinimo: 1000, controlLote: true, controlVencimiento: true },
  { sku: "INS-002", nombre: "Acondicionador hipoalergénico", categoria: "Cosmético", unidadCompra: "Galón", contenidoCompra: 3785, unidadConsumo: "ml", costoCompra: 195, stockMinimo: 800, controlLote: true, controlVencimiento: true },
  { sku: "INS-003", nombre: "Limpiador de oídos", categoria: "Higiene", unidadCompra: "Botella", contenidoCompra: 500, unidadConsumo: "ml", costoCompra: 65, stockMinimo: 100, controlLote: true, controlVencimiento: true },
  { sku: "INS-004", nombre: "Perfume hipoalergénico", categoria: "Cosmético", unidadCompra: "Botella", contenidoCompra: 500, unidadConsumo: "ml", costoCompra: 90, stockMinimo: 100, controlLote: true, controlVencimiento: true },
  { sku: "INS-005", nombre: "Guantes de nitrilo", categoria: "Consumible", unidadCompra: "Caja", contenidoCompra: 100, unidadConsumo: "unidad", costoCompra: 32, stockMinimo: 20, controlLote: false, controlVencimiento: false },
  { sku: "INS-006", nombre: "Shampoo medicado (clorhexidina)", categoria: "Cosmético", unidadCompra: "Galón", contenidoCompra: 3785, unidadConsumo: "ml", costoCompra: 260, stockMinimo: 800, controlLote: true, controlVencimiento: true },
  { sku: "INS-007", nombre: "Shampoo para cachorros", categoria: "Cosmético", unidadCompra: "Botella", contenidoCompra: 1000, unidadConsumo: "ml", costoCompra: 70, stockMinimo: 300, controlLote: true, controlVencimiento: true },
  { sku: "INS-008", nombre: "Toallas desechables", categoria: "Consumible", unidadCompra: "Paquete", contenidoCompra: 50, unidadConsumo: "unidad", costoCompra: 45, stockMinimo: 30, controlLote: false, controlVencimiento: false },
  { sku: "INS-009", nombre: "Desinfectante de superficies", categoria: "Limpieza", unidadCompra: "Galón", contenidoCompra: 3785, unidadConsumo: "ml", costoCompra: 48, stockMinimo: 1000, controlLote: false, controlVencimiento: true },
  { sku: "INS-010", nombre: "Cuchilla de corte #10", categoria: "Repuesto", unidadCompra: "Unidad", contenidoCompra: 1, unidadConsumo: "unidad", costoCompra: 95, stockMinimo: 1, controlLote: false, controlVencimiento: false },
];

export const RECETAS: Receta[] = [
  { id: "REC-001", serviceCode: "Clasico", servicio: "Fresco y Limpio", weightCode: "W02", rangoPeso: ">5 a ≤15 kg", coatSegment: "S1", version: "R1",
    lineas: [{ sku: "INS-001", cantidad: 25 }, { sku: "INS-002", cantidad: 20 }, { sku: "INS-003", cantidad: 5 }, { sku: "INS-004", cantidad: 3 }, { sku: "INS-005", cantidad: 2 }, { sku: "INS-008", cantidad: 2 }] },
  { id: "REC-002", serviceCode: "Medicado", servicio: "Cuidado Especial", weightCode: "W02", rangoPeso: ">5 a ≤15 kg", coatSegment: "S2", version: "R1",
    lineas: [{ sku: "INS-006", cantidad: 40 }, { sku: "INS-002", cantidad: 20 }, { sku: "INS-003", cantidad: 5 }, { sku: "INS-005", cantidad: 2 }, { sku: "INS-008", cantidad: 2 }] },
  { id: "REC-003", serviceCode: "Premium", servicio: "Spa Deluxe", weightCode: "W03", rangoPeso: ">15 a ≤25 kg", coatSegment: "S5", version: "R1",
    lineas: [{ sku: "INS-001", cantidad: 60 }, { sku: "INS-002", cantidad: 50 }, { sku: "INS-003", cantidad: 8 }, { sku: "INS-004", cantidad: 6 }, { sku: "INS-005", cantidad: 2 }, { sku: "INS-008", cantidad: 3 }, { sku: "INS-009", cantidad: 30 }] },
  { id: "REC-004", serviceCode: "Seco", servicio: "Express sin agua", weightCode: "W01", rangoPeso: "≤5 kg", coatSegment: "S1", version: "R1",
    lineas: [{ sku: "INS-007", cantidad: 15 }, { sku: "INS-004", cantidad: 2 }, { sku: "INS-008", cantidad: 1 }] },
  { id: "REC-ADD-001", serviceCode: "Adicional", servicio: "Deslanado intensivo", weightCode: "—", rangoPeso: "Cualquiera", coatSegment: "S4 | S5", addonCode: "ADD_DESLANADO_INT", version: "R1",
    lineas: [{ sku: "INS-002", cantidad: 30 }, { sku: "INS-010", cantidad: 0.02 }] },
];

// ─── Movimientos ─────────────────────────────────────────────────────────────
// Los consumos se generan desde las órdenes de octubre (lib/mock/ordenes.ts) con la receta del servicio,
// escalada por peso, más la del adicional. El resto (stock inicial, compras, merma, ajuste) es manual.

const FACTOR_PESO: Record<string, number> = { W01: 0.6, W02: 1, W03: 1.4, W04: 1.8, W05: 2.3, W06: 2.8 };
const RECETA_BASE: Record<string, string> = { Clasico: "REC-001", Medicado: "REC-002", Premium: "REC-003", Seco: "REC-004" };
const RECETA_ADICIONAL: Record<string, string> = { ADD_DESLANADO_INT: "REC-ADD-001" };
const POR_UNIDAD = new Set(["INS-005", "INS-010"]); // guantes y cuchilla no escalan con el peso

/** Consumo estándar de una orden: [sku, cantidad] según sus recetas. */
export function consumoDeOrden(o: OrdenDemo): RecetaLinea[] {
  const out: RecetaLinea[] = [];
  const base = RECETAS.find((r) => r.id === RECETA_BASE[o.serviceCode])!;
  const f = (FACTOR_PESO[o.weightCode] ?? 1) / (FACTOR_PESO[base.weightCode] ?? 1);
  for (const l of base.lineas) {
    const q = POR_UNIDAD.has(l.sku) ? l.cantidad : l.cantidad * f;
    out.push({ sku: l.sku, cantidad: INSUMOS.find((i) => i.sku === l.sku)?.unidadConsumo === "unidad" ? Math.max(1, Math.round(q)) : Math.round(q) });
  }
  for (const code of o.addonCodes) {
    const r = RECETAS.find((x) => x.id === RECETA_ADICIONAL[code]);
    r?.lineas.forEach((l) => out.push({ sku: l.sku, cantidad: l.cantidad }));
  }
  return out;
}

type MovSinId = Omit<Movimiento, "id">;
const manual = (fecha: string, tipo: MovementType, sku: string, cantidad: number, motivo: string, extra: Partial<MovSinId> = {}): MovSinId => ({
  fecha, tipo, sku, cantidad,
  origen: tipo === "compra" || tipo === "stock_inicial" ? (tipo === "compra" ? "PROV-001" : "Externo") : "Paku 01",
  destino: tipo === "compra" || tipo === "stock_inicial" ? "Paku 01" : MOVEMENT_LABELS[tipo],
  centroCosto: "CC-PAKU01", usuario: "Admin Paku", motivo, ...extra,
});

function buildMovimientos(): Movimiento[] {
  const consumos: MovSinId[] = ORDENES.filter((o) => !o.devuelto).flatMap((o) =>
    consumoDeOrden(o).map((l) => ({
      fecha: o.fecha, tipo: "consumo" as const, sku: l.sku, cantidad: -l.cantidad, origen: "Paku 01", destino: "Consumo",
      orden: o.id, centroCosto: o.centroCosto, usuario: "Sistema", motivo: "Descarga automática por receta",
    })),
  );
  const usado = (sku: string) => -consumos.filter((m) => m.sku === sku).reduce((a, m) => a + m.cantidad, 0);
  const inicial: Record<string, number> = {
    "INS-001": 3785, "INS-002": 3785, "INS-003": 1000, "INS-004": 1000, "INS-005": 200,
    "INS-006": 2000, "INS-007": 2000, "INS-008": 200, "INS-009": 3785, "INS-010": 2,
  };
  const otros: MovSinId[] = [
    ...Object.entries(inicial).map(([sku, q]) => manual("2026-10-01", "stock_inicial", sku, q, "Carga inicial")),
    manual("2026-10-08", "merma", "INS-006", -900, "Derrame durante traslado", { usuario: "Carlos Ríos" }),
    manual("2026-10-10", "compra", "INS-001", 3785, "Factura F001-2381"),
    manual("2026-10-10", "compra", "INS-008", 150, "Factura F001-2381"),
    manual("2026-10-12", "compra", "INS-002", 3785, "Factura F001-2412"),
    manual("2026-10-18", "ajuste", "INS-003", -60, "Conteo físico: diferencia vs. teórico"),
    // Cuchillas: las dos se desgastaron (el resto lo descontó la receta del deslanado)
    manual("2026-10-19", "consumo", "INS-010", -Math.round((2 - usado("INS-010")) * 100) / 100, "Cuchillas desgastadas, reemplazo", { usuario: "Lucía Torres" }),
  ];
  return [...otros, ...consumos]
    .sort((x, y) => x.fecha.localeCompare(y.fecha) || (x.tipo === "stock_inicial" ? -1 : 0) - (y.tipo === "stock_inicial" ? -1 : 0))
    .map((m, i) => ({ ...m, id: `MOV-${String(i + 1).padStart(4, "0")}` }));
}

export const MOVIMIENTOS: Movimiento[] = buildMovimientos();

// Ejemplo de costeo (hoja 10_Costeo_Orden): la orden ORD-1034, Premium + W03 + S5 + ADD_DESLANADO_INT
const ORDEN_EJEMPLO = ORDENES.find((o) => o.id === "ORD-1034")!;
export const COSTEO_EJEMPLO = {
  orden: ORDEN_EJEMPLO.id,
  llave: [ORDEN_EJEMPLO.serviceCode, ORDEN_EJEMPLO.weightCode, ORDEN_EJEMPLO.coatSegment, ...ORDEN_EJEMPLO.addonCodes],
  pricingVersion: ORDEN_EJEMPLO.pricingVersion,
  recetas: ["REC-003", "REC-ADD-001"],
  venta: ORDEN_EJEMPLO.total,
  comision: ORDEN_EJEMPLO.comision,
  medio: ORDEN_EJEMPLO.medio,
  puntos: puntosDe(ORDEN_EJEMPLO),
  variableGroomer: puntosDe(ORDEN_EJEMPLO) * VALOR_PUNTO,
  otrosDirectos: OTROS_DIRECTOS_POR_SERVICIO,
};

// ─── Cálculos ────────────────────────────────────────────────────────────────

export const costoUnitario = (i: Insumo) => i.costoCompra / i.contenidoCompra;

export function stockDe(sku: string, movs: Movimiento[]) {
  // Redondeo a centésimas (las recetas usan fracciones, p. ej. 0,02 de cuchilla); "+ 0" evita mostrar -0
  return Math.round(movs.filter((m) => m.sku === sku).reduce((a, m) => a + m.cantidad, 0) * 100) / 100 + 0;
}

export type EstadoStock = "ok" | "bajo" | "agotado";
export function estadoDe(stock: number, minimo: number): EstadoStock {
  if (stock <= 0) return "agotado";
  return stock < minimo ? "bajo" : "ok";
}

export function costoReceta(r: Receta, insumos: Insumo[]) {
  return r.lineas.reduce((a, l) => {
    const i = insumos.find((x) => x.sku === l.sku);
    return a + (i ? costoUnitario(i) * l.cantidad : 0);
  }, 0);
}

export const soles = (n: number) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const cantidad = (n: number) => n.toLocaleString("es-PE", { maximumFractionDigits: 2 });

/** Costo de insumos estándar de una orden, según sus recetas. */
export function costoInsumosOrden(o: OrdenDemo, insumos: Insumo[] = INSUMOS) {
  return consumoDeOrden(o).reduce((a, l) => {
    const i = insumos.find((x) => x.sku === l.sku);
    return a + (i ? costoUnitario(i) * l.cantidad : 0);
  }, 0);
}

/** Costo de los consumos de insumos registrados en un mes (YYYY-MM). */
export function costoConsumoMes(mes: string, movs: Movimiento[] = MOVIMIENTOS, insumos: Insumo[] = INSUMOS) {
  return movs
    .filter((m) => m.tipo === "consumo" && m.fecha.startsWith(mes))
    .reduce((a, m) => {
      const i = insumos.find((x) => x.sku === m.sku);
      return a + (i ? -m.cantidad * costoUnitario(i) : 0);
    }, 0);
}
