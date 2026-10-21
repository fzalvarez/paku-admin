// DATOS DE EJEMPLO — módulo de Inventario de demostración (sin backend).
// Basado en PAKU_Backend_Inventario_Finanzas_V2_Alineado_Pricing.xlsx (hojas 03, 05, 09, 10 y 18).
// Costos y cantidades son ilustrativos; no representan operación real.

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

const ini = (sku: string, cantidad: number, n: number): Movimiento => ({
  id: `MOV-${String(n).padStart(4, "0")}`, fecha: "2026-10-01", tipo: "stock_inicial", sku, cantidad,
  origen: "Externo", destino: "Paku 01", centroCosto: "CC-PAKU01", usuario: "Admin Paku", motivo: "Carga inicial",
});
const con = (n: number, fecha: string, orden: string, sku: string, cantidad: number): Movimiento => ({
  id: `MOV-${String(n).padStart(4, "0")}`, fecha, tipo: "consumo", sku, cantidad: -cantidad,
  origen: "Paku 01", destino: "Consumo", orden, centroCosto: "CC-PAKU01", usuario: "Sistema", motivo: "Descarga automática por receta",
});

export const MOVIMIENTOS: Movimiento[] = [
  ini("INS-001", 7570, 1), ini("INS-002", 3785, 2), ini("INS-003", 500, 3), ini("INS-004", 500, 4),
  ini("INS-005", 100, 5), ini("INS-006", 1000, 6), ini("INS-007", 1000, 7), ini("INS-008", 100, 8),
  ini("INS-009", 3785, 9), ini("INS-010", 2, 10),
  con(11, "2026-10-04", "ORD-1021", "INS-001", 25), con(12, "2026-10-04", "ORD-1021", "INS-002", 20), con(13, "2026-10-04", "ORD-1021", "INS-008", 2),
  con(14, "2026-10-06", "ORD-1034", "INS-001", 60), con(15, "2026-10-06", "ORD-1034", "INS-002", 80), con(16, "2026-10-06", "ORD-1034", "INS-004", 6),
  { id: "MOV-0017", fecha: "2026-10-08", tipo: "merma", sku: "INS-006", cantidad: -350, origen: "Paku 01", destino: "Merma", centroCosto: "CC-PAKU01", usuario: "Groomer Paku 01", motivo: "Derrame durante traslado" },
  con(18, "2026-10-09", "ORD-1047", "INS-006", 40), con(19, "2026-10-09", "ORD-1047", "INS-003", 5),
  { id: "MOV-0020", fecha: "2026-10-10", tipo: "compra", sku: "INS-001", cantidad: 3785, origen: "PROV-001", destino: "Paku 01", centroCosto: "CC-PAKU01", usuario: "Admin Paku", motivo: "Factura F001-2381" },
  { id: "MOV-0021", fecha: "2026-10-10", tipo: "compra", sku: "INS-008", cantidad: 50, origen: "PROV-001", destino: "Paku 01", centroCosto: "CC-PAKU01", usuario: "Admin Paku", motivo: "Factura F001-2381" },
  con(22, "2026-10-13", "ORD-1062", "INS-007", 15), con(23, "2026-10-13", "ORD-1062", "INS-004", 2),
  { id: "MOV-0024", fecha: "2026-10-14", tipo: "consumo", sku: "INS-010", cantidad: -2, origen: "Paku 01", destino: "Consumo", centroCosto: "CC-PAKU01", usuario: "Groomer Paku 01", motivo: "Cuchillas desgastadas, reemplazo" },
  con(25, "2026-10-16", "ORD-1078", "INS-001", 60), con(26, "2026-10-16", "ORD-1078", "INS-002", 80), con(27, "2026-10-16", "ORD-1078", "INS-005", 2),
  { id: "MOV-0028", fecha: "2026-10-18", tipo: "ajuste", sku: "INS-003", cantidad: -60, origen: "Paku 01", destino: "Ajuste", centroCosto: "CC-PAKU01", usuario: "Admin Paku", motivo: "Conteo físico: diferencia vs. teórico" },
  con(29, "2026-10-19", "ORD-1085", "INS-006", 40), con(30, "2026-10-19", "ORD-1085", "INS-009", 30),
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

// Ejemplo de costeo de una orden (hoja 10_Costeo_Orden): Premium + W03 + S5 + ADD_DESLANADO_INT
export const COSTEO_EJEMPLO = {
  orden: "ORD-1034",
  llave: ["Premium", "W03", "S5", "ADD_DESLANADO_INT"],
  pricingVersion: "PV2",
  recetas: ["REC-003", "REC-ADD-001"],
  venta: 160,
  comisionPct: 0.0344 * 1.18, // Culqi 3.44 % + IGV (referencial)
  variableGroomer: 25,
  otrosDirectos: 8, // combustible y traslado prorrateado
};

// ─── Cálculos ────────────────────────────────────────────────────────────────

export const costoUnitario = (i: Insumo) => i.costoCompra / i.contenidoCompra;

export function stockDe(sku: string, movs: Movimiento[]) {
  return movs.filter((m) => m.sku === sku).reduce((a, m) => a + m.cantidad, 0);
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
