// DATOS DE EJEMPLO — finanzas de demostración (Pagos, Variable del groomer, Cierre mensual).
// Se calculan desde las mismas órdenes y consumos de Inventario para que todo cuadre entre pantallas.

import { costoConsumoMes } from "./inventario";
import {
  BONO_CALIDAD_MAX, GROOMERS, ORDENES, OTROS_DIRECTOS_POR_SERVICIO, VALOR_PUNTO, puntosDe, type OrdenDemo,
} from "./ordenes";

export const CENTROS = [
  { code: "CC-PAKU01", name: "Paku Spa – Unidad 01" },
  { code: "CC-SPA-GEN", name: "Paku Spa – General" },
  { code: "CC-PLAT", name: "Plataforma / App" },
  { code: "CC-MKT", name: "Marketing" },
  { code: "CC-ADM", name: "Administración" },
];

export const GASTOS_OCTUBRE = [
  { cc: "CC-PAKU01", concepto: "Seguro vehicular Paku 01", monto: 280 },
  { cc: "CC-PAKU01", concepto: "Cochera y estacionamiento", monto: 350 },
  { cc: "CC-SPA-GEN", concepto: "Uniformes y lavandería", monto: 180 },
  { cc: "CC-PLAT", concepto: "Hosting y servicios en la nube", monto: 420 },
  { cc: "CC-PLAT", concepto: "Licencias (Workspace, Expo)", monto: 150 },
  { cc: "CC-MKT", concepto: "Publicidad Meta / Google", monto: 900 },
  { cc: "CC-MKT", concepto: "Contenido para redes", monto: 400 },
  { cc: "CC-ADM", concepto: "Servicio contable", monto: 500 },
  { cc: "CC-ADM", concepto: "Comisiones bancarias", monto: 35 },
];

// Depreciación gerencial mensual (hoja 07_Activos): costo / vida útil en meses
export const DEPRECIACION = [
  { cc: "CC-PAKU01", activo: "AF-001 Mercedes-Benz Sprinter Paku 01", monto: 120000 / 60 },
  { cc: "CC-PAKU01", activo: "AF-002 Batería Gospower #1", monto: 6000 / 36 },
  { cc: "CC-PAKU01", activo: "AF-003 Secadora profesional", monto: 3600 / 36 },
];

export type Pnl = {
  ventasBrutas: number;
  descuentos: number;
  devoluciones: number;
  ventasNetas: number;
  insumos: number;
  variableGroomer: number;
  comision: number;
  otrosDirectos: number;
  margenContribucion: number;
  gastosOperativos: number;
  ebitda: number;
  depreciacion: number;
  resultado: number;
  servicios: number;
};

function finish(p: Omit<Pnl, "ventasNetas" | "margenContribucion" | "ebitda" | "resultado">): Pnl {
  const ventasNetas = p.ventasBrutas - p.descuentos - p.devoluciones;
  const margenContribucion = ventasNetas - p.insumos - p.variableGroomer - p.comision - p.otrosDirectos;
  const ebitda = margenContribucion - p.gastosOperativos;
  return { ...p, ventasNetas, margenContribucion, ebitda, resultado: ebitda - p.depreciacion };
}

// ─── Variable del groomer ────────────────────────────────────────────────────

export type VariableGroomer = {
  groomer: string;
  programados: number;
  completados: number;
  puntos: number;
  variableProductividad: number;
  cumplimientoCalidad: number; // 0..1
  bonoCalidad: number;
  total: number;
  ordenes: OrdenDemo[];
};

/** Variable de cada groomer sobre `base` (por defecto, todas las órdenes de octubre). */
export function variableGroomers(base: OrdenDemo[] = ORDENES): VariableGroomer[] {
  return GROOMERS.map((g) => {
    const ordenes = base.filter((o) => o.groomer === g);
    const completadas = ordenes.filter((o) => !o.devuelto);
    const puntos = Math.round(completadas.reduce((a, o) => a + puntosDe(o), 0) * 10) / 10;
    const cumplimiento = completadas.length ? completadas.filter((o) => o.calidadOk).length / completadas.length : 0;
    const variableProductividad = puntos * VALOR_PUNTO;
    const bonoCalidad = Math.round(BONO_CALIDAD_MAX * cumplimiento * 100) / 100;
    return {
      groomer: g, programados: ordenes.length, completados: completadas.length, puntos,
      variableProductividad, cumplimientoCalidad: cumplimiento, bonoCalidad,
      total: variableProductividad + bonoCalidad, ordenes,
    };
  });
}

// ─── P&L ─────────────────────────────────────────────────────────────────────

/** P&L de octubre (al 20); cc = "" para todos los centros de costo. */
export function pnlOctubre(cc = ""): Pnl {
  const conOrdenes = !cc || cc === "CC-PAKU01"; // todas las órdenes son de Paku 01
  const ordenes = conOrdenes ? ORDENES : [];
  const completadas = ordenes.filter((o) => !o.devuelto);
  return finish({
    ventasBrutas: ordenes.reduce((a, o) => a + o.base + o.adicionales, 0),
    descuentos: ordenes.reduce((a, o) => a + o.descuento, 0),
    devoluciones: ordenes.filter((o) => o.devuelto).reduce((a, o) => a + o.total, 0),
    insumos: conOrdenes ? costoConsumoMes("2026-10") : 0,
    variableGroomer: conOrdenes ? variableGroomers().reduce((a, v) => a + v.total, 0) : 0,
    comision: ordenes.reduce((a, o) => a + o.comision, 0),
    otrosDirectos: completadas.length * OTROS_DIRECTOS_POR_SERVICIO,
    gastosOperativos: GASTOS_OCTUBRE.filter((g) => !cc || g.cc === cc).reduce((a, g) => a + g.monto, 0),
    depreciacion: DEPRECIACION.filter((d) => !cc || d.cc === cc).reduce((a, d) => a + d.monto, 0),
    servicios: completadas.length,
  });
}

/** Septiembre (mes piloto, cerrado): cifras de referencia para comparar. */
export function pnlSeptiembre(cc = ""): Pnl {
  const conOrdenes = !cc || cc === "CC-PAKU01";
  const base = {
    ventasBrutas: conOrdenes ? 6120 : 0, descuentos: conOrdenes ? 310 : 0, devoluciones: conOrdenes ? 89 : 0,
    insumos: conOrdenes ? 596.4 : 0, variableGroomer: conOrdenes ? 512.6 : 0, comision: conOrdenes ? 231.8 : 0,
    otrosDirectos: conOrdenes ? 376 : 0, servicios: conOrdenes ? 47 : 0,
  };
  const gastosSep: Record<string, number> = { "CC-PAKU01": 630, "CC-SPA-GEN": 120, "CC-PLAT": 570, "CC-MKT": 1500, "CC-ADM": 535 };
  return finish({
    ...base,
    gastosOperativos: cc ? gastosSep[cc] ?? 0 : Object.values(gastosSep).reduce((a, n) => a + n, 0),
    depreciacion: DEPRECIACION.filter((d) => !cc || d.cc === cc).reduce((a, d) => a + d.monto, 0),
  });
}

/** Meses con datos de demo, del más antiguo al más reciente. */
export const MESES_DEMO = ["2026-09", "2026-10"];

/** P&L de un mes (YYYY-MM) o null si la demo no tiene datos de ese mes. */
export function pnlMes(mes: string, cc = ""): Pnl | null {
  if (mes === "2026-10") return pnlOctubre(cc);
  if (mes === "2026-09") return pnlSeptiembre(cc);
  return null;
}

/** Suma de los P&L de varios meses (todas las líneas son sumables). */
export function sumarPnl(pnls: Pnl[]): Pnl {
  const out = {} as Pnl;
  for (const k of Object.keys(pnls[0]) as (keyof Pnl)[]) out[k] = pnls.reduce((a, p) => a + p[k], 0);
  return out;
}

// ─── Exportación CSV ─────────────────────────────────────────────────────────

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
