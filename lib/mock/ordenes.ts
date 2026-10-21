// DATOS DE EJEMPLO — órdenes de octubre 2026 que alimentan todas las vistas de demostración
// (Inventario, Pagos y conciliación, Variable del groomer y Cierre mensual), para que los números cuadren
// entre pantallas. Generadas de forma determinista; no son órdenes reales.

export type ServiceCode = "Clasico" | "Medicado" | "Premium" | "Seco";
export type WeightCode = "W01" | "W02" | "W03" | "W04" | "W05" | "W06";
export type MedioPago = "Tarjeta" | "Yape";
export type EstadoConciliacion = "conciliado" | "pendiente" | "diferencia" | "devuelto";

export type OrdenDemo = {
  id: string;
  fecha: string; // YYYY-MM-DD
  cliente: string; // ID anónimo
  serviceCode: ServiceCode;
  weightCode: WeightCode;
  coatSegment: string;
  addonCodes: string[];
  base: number;
  adicionales: number;
  descuento: number;
  motivoDescuento?: string;
  total: number;
  groomer: string;
  centroCosto: string;
  pricingVersion: string;
  // Pago
  medio: MedioPago;
  transaccion: string;
  comision: number;
  netoEsperado: number;
  fechaLiquidacion?: string;
  liquidado?: number;
  conciliacion: EstadoConciliacion;
  devuelto: boolean;
  calidadOk: boolean; // pasó el control de calidad (sin reclamo)
};

export const SERVICIOS: Record<ServiceCode, string> = {
  Clasico: "Fresco y Limpio",
  Medicado: "Cuidado Especial",
  Premium: "Spa Deluxe",
  Seco: "Express sin agua",
};

export const PRECIOS: Record<ServiceCode, Partial<Record<WeightCode, number>>> = {
  Clasico: { W01: 75, W02: 85, W03: 89, W04: 105, W05: 135, W06: 175 },
  Medicado: { W01: 95, W02: 109, W03: 119, W04: 139, W05: 175, W06: 219 },
  Premium: { W01: 109, W02: 125, W03: 135, W04: 165, W05: 209, W06: 265 },
  Seco: { W01: 65, W02: 75 },
};

export const ADICIONALES: Record<string, { nombre: string; precio: number }> = {
  ADD_DESLANADO_INT: { nombre: "Deslanado intensivo", precio: 25 },
  ADD_DESMOTADO_LOC: { nombre: "Desmotado localizado", precio: 20 },
  ADD_CORTE_EST: { nombre: "Corte estético", precio: 30 },
  ADD_RETOQUE: { nombre: "Retoque Paku", precio: 25 },
};

export const GROOMERS = ["Carlos Ríos", "Lucía Torres"];

// Comisión referencial de la pasarela (sin IGV) por medio de pago; se cobra + IGV.
export const COMISION_PCT: Record<MedioPago, number> = { Tarjeta: 0.0344, Yape: 0.025 };
export const IGV = 0.18;

const r2 = (n: number) => Math.round(n * 100) / 100;

// PRNG determinista (mulberry32) para que la demo muestre siempre lo mismo
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build(): OrdenDemo[] {
  const rand = rng(20261020);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const out: OrdenDemo[] = [];
  let n = 1001;
  for (let day = 1; day <= 20; day++) {
    const perDay = day % 7 === 0 ? 2 : 3 + Math.floor(rand() * 2); // 2 a 4 servicios por día
    for (let k = 0; k < perDay; k++, n++) {
      const id = `ORD-${n}`;
      let serviceCode = pick<ServiceCode>(["Clasico", "Clasico", "Clasico", "Premium", "Premium", "Medicado", "Seco"]);
      let weightCode = serviceCode === "Seco" ? pick<WeightCode>(["W01", "W02"]) : pick<WeightCode>(["W01", "W02", "W02", "W03", "W03", "W04", "W05", "W06"]);
      let coatSegment = pick(["S1", "S2", "S3", "S4", "S5", "S6"]);
      let addonCodes = rand() < 0.35 ? [pick(Object.keys(ADICIONALES))] : [];
      // Orden del ejemplo de costeo (pantalla Recetas): Premium + W03 + S5 + ADD_DESLANADO_INT = S/ 160
      if (id === "ORD-1034") {
        serviceCode = "Premium"; weightCode = "W03"; coatSegment = "S5"; addonCodes = ["ADD_DESLANADO_INT"];
      }
      const base = PRECIOS[serviceCode][weightCode]!;
      const adicionales = addonCodes.reduce((a, c) => a + ADICIONALES[c].precio, 0);
      const cupon = id !== "ORD-1034" && rand() < 0.12;
      const descuento = cupon ? r2((base + adicionales) * 0.1) : 0;
      const total = r2(base + adicionales - descuento);
      const medio: MedioPago = rand() < 0.7 ? "Tarjeta" : "Yape";
      const comision = r2(total * COMISION_PCT[medio] * (1 + IGV));
      const netoEsperado = r2(total - comision);
      const fecha = `2026-10-${String(day).padStart(2, "0")}`;
      const liquida = day <= 17; // Culqi liquida a los pocos días: lo más reciente sigue pendiente
      const devuelto = id === "ORD-1052";
      const diferencia = id === "ORD-1027" || id === "ORD-1066";
      const liqDay = Math.min(day + 3, 20);
      out.push({
        id, fecha, cliente: `CLI-${String(200 + Math.floor(rand() * 60)).padStart(4, "0")}`,
        serviceCode, weightCode, coatSegment, addonCodes, base, adicionales, descuento,
        motivoDescuento: cupon ? "Cupón bienvenida 10 %" : undefined,
        total, groomer: GROOMERS[n % 2],
        centroCosto: "CC-PAKU01", pricingVersion: "PV2",
        medio, transaccion: `chr_live_${(n * 7919).toString(36)}${k}`,
        comision, netoEsperado,
        fechaLiquidacion: liquida ? `2026-10-${String(liqDay).padStart(2, "0")}` : undefined,
        liquidado: devuelto ? 0 : liquida ? r2(netoEsperado - (diferencia ? 1.5 : 0)) : undefined,
        conciliacion: devuelto ? "devuelto" : !liquida ? "pendiente" : diferencia ? "diferencia" : "conciliado",
        devuelto,
        calidadOk: !(id === "ORD-1041" || id === "ORD-1063"),
      });
    }
  }
  return out;
}

export const ORDENES: OrdenDemo[] = build();
export const ordenPorId = (id: string) => ORDENES.find((o) => o.id === id);

// Variable del groomer (hoja 12): puntos por servicio completado; fórmula referencial por aprobar.
export const PUNTOS_SERVICIO: Record<ServiceCode, number> = { Clasico: 1, Medicado: 1.2, Premium: 1.5, Seco: 0.7 };
export const PUNTOS_ADICIONAL = 0.3;
export const VALOR_PUNTO = 6; // S/ por punto
export const BONO_CALIDAD_MAX = 200; // S/ al mes con 100 % de cumplimiento
export const OTROS_DIRECTOS_POR_SERVICIO = 8; // combustible y traslado prorrateado

export const puntosDe = (o: OrdenDemo) =>
  o.devuelto ? 0 : PUNTOS_SERVICIO[o.serviceCode] + o.addonCodes.length * PUNTOS_ADICIONAL;
