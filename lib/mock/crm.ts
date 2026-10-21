// DATOS DE EJEMPLO — CRM de demostración (Clientes, Fidelización, Campañas, Recordatorios, Integraciones).
// Los clientes salen de las mismas órdenes de octubre (lib/mock/ordenes.ts) más un historial previo
// (junio a septiembre) generado de forma determinista, para que gasto, frecuencia y segmentos cuadren con
// Pagos y Cierre. Los campos imitan los reales de paku-backend: usuario (nombre, teléfono, distrito, fecha
// de alta) y mascota (especie, raza, nacimiento, grooming_frequency, receive_reminders,
// antiparasitic_interval). Nombres, teléfonos y correos son ficticios.

import { ADICIONALES, ORDENES, PRECIOS, rng, type ServiceCode, type WeightCode } from "./ordenes";

export const HOY = "2026-10-20";

// Distritos activos de paku-backend (app/modules/geo/infra/districts_data.py)
export const DISTRITOS = [
  "Barranco", "Breña", "Jesús María", "La Molina", "La Victoria", "Lima", "Lince", "Magdalena del Mar",
  "Miraflores", "Pueblo Libre", "San Borja", "San Isidro", "San Miguel", "Santiago de Surco", "Surquillo",
];

// Valores de grooming_frequency que guarda la app (lib/labels.ts → GROOMING_FREQUENCY_LABELS)
export type GroomingFrequency = "every_15_days" | "monthly" | "occasional";
export const FRECUENCIA_DIAS: Record<GroomingFrequency, number> = { every_15_days: 15, monthly: 30, occasional: 45 };
export type Antiparasitario = "monthly" | "trimestral";
export const ANTIPARASITARIO_DIAS: Record<Antiparasitario, number> = { monthly: 30, trimestral: 90 };

export type MascotaCrm = {
  id: string;
  nombre: string;
  especie: "dog" | "cat";
  raza: string;
  weightCode: WeightCode;
  nacimiento: string; // YYYY-MM-DD
  groomingFrequency: GroomingFrequency;
  recibeRecordatorios: boolean;
  antiparasitario: Antiparasitario | null;
  ultimoAntiparasitario?: string;
};

export type VisitaCrm = {
  orden: string;
  fecha: string;
  mascotaId: string;
  serviceCode: ServiceCode;
  addonCodes: string[];
  total: number;
  descuento: number;
  motivoDescuento?: string;
  devuelto: boolean;
};

export type Segmento = "vip" | "recurrente" | "nuevo" | "sin_recompra" | "en_riesgo" | "inactivo";

export const SEGMENTOS: Record<Segmento, { label: string; regla: string; cls: string }> = {
  vip: {
    label: "VIP",
    regla: "5 o más servicios en los últimos 6 meses y vino hace poco",
    cls: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  },
  recurrente: {
    label: "Recurrente",
    regla: "2 o más servicios y viene dentro de su frecuencia habitual",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  nuevo: {
    label: "Nuevo",
    regla: "Primer servicio en los últimos 30 días",
    cls: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  sin_recompra: {
    label: "Sin recompra",
    regla: "Un solo servicio hace más de 30 días y no volvió",
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  en_riesgo: {
    label: "En riesgo",
    regla: "Pasó 1,5 veces su frecuencia habitual (mín. 45 días) sin volver",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  inactivo: {
    label: "Inactivo",
    regla: "Más de 75 días sin un servicio",
    cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
};

export type ClienteCrm = {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  distrito: string;
  alta: string; // fecha de registro en la app
  mascotas: MascotaCrm[];
  visitas: VisitaCrm[]; // de la más antigua a la más reciente
  gasto: number; // gasto acumulado (sin órdenes devueltas)
  servicios: number;
  ticketPromedio: number;
  primeraVisita: string;
  ultimaVisita: string;
  diasSinVenir: number;
  intervaloPromedio: number | null; // días promedio entre servicios
  segmento: Segmento;
};

// ─── Fechas ──────────────────────────────────────────────────────────────────
const toDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const toYmd = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (ymd: string, n: number) => toYmd(new Date(toDate(ymd).getTime() + n * 86400000));
export const diffDays = (a: string, b: string) => Math.round((toDate(a).getTime() - toDate(b).getTime()) / 86400000);
export const fechaCorta = (ymd: string) =>
  toDate(ymd).toLocaleDateString("es-PE", { day: "numeric", month: "short", timeZone: "UTC" });

// ─── Generación ──────────────────────────────────────────────────────────────
const NOMBRES = [
  "María", "José", "Lucía", "Carlos", "Andrea", "Diego", "Valeria", "Jorge", "Camila", "Luis", "Daniela", "Miguel",
  "Fernanda", "Ricardo", "Gabriela", "Renzo", "Alessandra", "Sebastián", "Claudia", "Gonzalo", "Mariana", "Álvaro",
  "Paola", "Rodrigo", "Ximena", "Martín", "Natalia", "Joaquín", "Rosa", "Piero",
];
const APELLIDOS = [
  "Quispe", "Flores", "Rodríguez", "García", "Sánchez", "Rojas", "Vargas", "Mendoza", "Torres", "Chávez", "Castillo",
  "Ramírez", "Gutiérrez", "Paredes", "Salazar", "Romero", "Herrera", "Cárdenas", "Delgado", "Aguilar", "Medina",
  "Vásquez", "Navarro", "Cabrera", "Espinoza", "Benavides", "Zapata", "Palacios", "Montoya", "Valdivia",
];
const NOMBRES_MASCOTA = [
  "Luna", "Max", "Toby", "Coco", "Rocky", "Lola", "Bruno", "Kira", "Simba", "Nala", "Milo", "Canela", "Thor", "Maya",
  "Chispa", "Oreo", "Mía", "Zeus", "Bimba", "Peluchín", "Frida", "Copito", "Duque", "Tita", "Panchito", "Olivia",
];
const RAZAS_PERRO: Record<WeightCode, string[]> = {
  W01: ["Yorkshire Terrier", "Chihuahua", "Shih Tzu", "Poodle Toy"],
  W02: ["Shih Tzu", "Maltés", "Poodle", "Schnauzer Miniatura", "Pomerania"],
  W03: ["Schnauzer", "Cocker Spaniel", "Bulldog Francés", "Beagle", "Mestizo"],
  W04: ["Border Collie", "Mestizo", "Shar Pei"],
  W05: ["Labrador Retriever", "Golden Retriever", "Mestizo"],
  W06: ["Golden Retriever", "Pastor Alemán", "Husky Siberiano"],
};
const RAZAS_GATO = ["Persa", "Mestizo", "Siamés"];

const r2 = (n: number) => Math.round(n * 100) / 100;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function build(): ClienteCrm[] {
  const rand = rng(20261021);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));

  // Órdenes de octubre agrupadas por cliente
  const octubre = new Map<string, typeof ORDENES>();
  for (const o of ORDENES) octubre.set(o.cliente, [...(octubre.get(o.cliente) ?? []), o]);

  // 18 clientes que no compraron en octubre (para inactivos, en riesgo y sin recompra)
  const ids = [...octubre.keys()].sort();
  const sinOctubre = Array.from({ length: 18 }, (_, i) => `CLI-${String(260 + i).padStart(4, "0")}`);

  type Borrador = Omit<ClienteCrm, "gasto" | "servicios" | "ticketPromedio" | "primeraVisita" | "ultimaVisita" | "diasSinVenir" | "intervaloPromedio" | "segmento">;
  const borradores: Borrador[] = [];
  const previas: (Omit<VisitaCrm, "orden"> & { cliente: string })[] = [];
  let petN = 1;

  const nuevaMascota = (weightCode: WeightCode): MascotaCrm => {
    const gato = (weightCode === "W01" || weightCode === "W02") && rand() < 0.2;
    const anti = rand();
    const antiparasitario: Antiparasitario | null = anti < 0.45 ? "monthly" : anti < 0.75 ? "trimestral" : null;
    const freq = rand();
    return {
      id: `PET-${String(petN++).padStart(4, "0")}`,
      nombre: pick(NOMBRES_MASCOTA),
      especie: gato ? "cat" : "dog",
      raza: gato ? pick(RAZAS_GATO) : pick(RAZAS_PERRO[weightCode]),
      weightCode,
      nacimiento: `${between(2014, 2024)}-${String(between(1, 12)).padStart(2, "0")}-${String(between(1, 28)).padStart(2, "0")}`,
      groomingFrequency: freq < 0.25 ? "every_15_days" : freq < 0.8 ? "monthly" : "occasional",
      recibeRecordatorios: rand() < 0.78,
      antiparasitario,
      ultimoAntiparasitario: antiparasitario ? addDays(HOY, -between(5, ANTIPARASITARIO_DIAS[antiparasitario] + 10)) : undefined,
    };
  };

  const servicioPara = (m: MascotaCrm): ServiceCode => {
    if (m.especie === "cat") return pick<ServiceCode>(["Seco", "Seco", "Clasico"]);
    const s = pick<ServiceCode>(["Clasico", "Clasico", "Clasico", "Premium", "Premium", "Medicado", "Seco"]);
    return s === "Seco" && m.weightCode !== "W01" && m.weightCode !== "W02" ? "Clasico" : s;
  };

  // Visitas previas de una mascota: hacia atrás desde `antesDe`, según su frecuencia, desde junio
  const historialPrevio = (cliente: string, m: MascotaCrm, antesDe: string, max: number) => {
    const paso = FRECUENCIA_DIAS[m.groomingFrequency];
    let fecha = addDays(antesDe, -(paso + between(-3, 6)));
    for (let k = 0; k < max && fecha >= "2026-06-01"; k++) {
      const serviceCode = servicioPara(m);
      const addonCodes = rand() < 0.3 ? [pick(Object.keys(ADICIONALES))] : [];
      const total = (PRECIOS[serviceCode][m.weightCode] ?? PRECIOS.Clasico[m.weightCode]!) +
        addonCodes.reduce((a, c) => a + ADICIONALES[c].precio, 0);
      previas.push({ cliente, fecha, mascotaId: m.id, serviceCode, addonCodes, total, descuento: 0, devuelto: false });
      fecha = addDays(fecha, -(paso + between(-3, 8)));
    }
  };

  const persona = (id: string, i: number) => {
    const nombre = NOMBRES[(i * 7) % NOMBRES.length];
    const apellido = APELLIDOS[(i * 11 + Math.floor(i / NOMBRES.length) * 7 + 3) % APELLIDOS.length];
    return {
      id,
      nombre: `${nombre} ${apellido}`,
      telefono: `+51 9${between(10, 99)} ${between(100, 999)} ${between(100, 999)}`,
      email: `${norm(nombre)}.${norm(apellido)}${between(1, 99)}@correo.pe`,
      distrito: pick(DISTRITOS),
    };
  };

  ids.forEach((id, i) => {
    const ordenes = octubre.get(id)!;
    const mascotas: MascotaCrm[] = [];
    for (const o of ordenes) if (!mascotas.some((m) => m.weightCode === o.weightCode)) mascotas.push(nuevaMascota(o.weightCode));
    const primeraOct = ordenes.map((o) => o.fecha).sort()[0];
    const perfil = rand();
    let alta: string;
    if (perfil < 0.25) {
      alta = addDays(primeraOct, -between(0, 6)); // cliente nuevo de octubre
    } else {
      for (const m of mascotas) {
        const primeraMascota = ordenes.filter((o) => o.weightCode === m.weightCode).map((o) => o.fecha).sort()[0];
        historialPrevio(id, m, primeraMascota, perfil < 0.4 ? 1 : 8);
      }
      alta = addDays("2026-06-01", -between(10, 200));
    }
    borradores.push({ ...persona(id, i), alta, mascotas, visitas: [] });
  });

  sinOctubre.forEach((id, j) => {
    const m = nuevaMascota(pick<WeightCode>(["W01", "W02", "W02", "W03", "W03", "W04", "W05"]));
    // Última visita entre junio y septiembre
    const ultima = `2026-${pick(["06", "07", "08", "08", "08", "09", "09", "09"])}-${String(between(1, 28)).padStart(2, "0")}`;
    const una = rand() < 0.35; // vino una sola vez
    previas.push({ cliente: id, fecha: ultima, mascotaId: m.id, serviceCode: servicioPara(m), addonCodes: [],
      total: PRECIOS.Clasico[m.weightCode]!, descuento: 0, devuelto: false });
    if (!una) historialPrevio(id, m, ultima, 4);
    borradores.push({ ...persona(id, ids.length + j), alta: addDays(una ? ultima : "2026-06-01", -between(0, 90)), mascotas: [m], visitas: [] });
  });

  // Numeración de las órdenes previas: correlativa por fecha, termina en ORD-1000 (octubre empieza en ORD-1001)
  previas.sort((a, b) => a.fecha.localeCompare(b.fecha));
  const inicio = 1001 - previas.length;
  const porCliente = new Map(borradores.map((b) => [b.id, b]));
  previas.forEach(({ cliente, ...v }, k) =>
    porCliente.get(cliente)!.visitas.push({ ...v, orden: `ORD-${String(inicio + k).padStart(4, "0")}` }));
  for (const o of ORDENES) {
    const b = porCliente.get(o.cliente)!;
    b.visitas.push({
      orden: o.id, fecha: o.fecha, mascotaId: b.mascotas.find((m) => m.weightCode === o.weightCode)!.id,
      serviceCode: o.serviceCode, addonCodes: o.addonCodes, total: o.total, descuento: o.descuento,
      motivoDescuento: o.motivoDescuento, devuelto: o.devuelto,
    });
  }

  return borradores.map((b) => {
    const visitas = b.visitas.sort((x, y) => x.fecha.localeCompare(y.fecha) || x.orden.localeCompare(y.orden));
    const validas = visitas.filter((v) => !v.devuelto);
    const gasto = r2(validas.reduce((a, v) => a + v.total, 0));
    const fechas = [...new Set(validas.map((v) => v.fecha))];
    const primeraVisita = fechas[0];
    const ultimaVisita = fechas[fechas.length - 1];
    const diasSinVenir = diffDays(HOY, ultimaVisita);
    const intervaloPromedio = fechas.length > 1 ? Math.round(diffDays(ultimaVisita, primeraVisita) / (fechas.length - 1)) : null;
    const ult6m = validas.filter((v) => diffDays(HOY, v.fecha) <= 180).length;
    let segmento: Segmento;
    if (diasSinVenir > 75) segmento = "inactivo";
    else if (intervaloPromedio && diasSinVenir > Math.max(45, intervaloPromedio * 1.5)) segmento = "en_riesgo";
    else if (validas.length === 1) segmento = diffDays(HOY, primeraVisita) <= 30 ? "nuevo" : "sin_recompra";
    else if (ult6m >= 5) segmento = "vip";
    else segmento = "recurrente";
    return {
      ...b, visitas, gasto, servicios: validas.length, ticketPromedio: validas.length ? r2(gasto / validas.length) : 0,
      primeraVisita, ultimaVisita, diasSinVenir, intervaloPromedio, segmento,
    };
  });
}

export const CLIENTES: ClienteCrm[] = build();
export const clientePorId = (id: string) => CLIENTES.find((c) => c.id === id);
export const mascotaDe = (c: ClienteCrm, id: string) => c.mascotas.find((m) => m.id === id);

export function porSegmento() {
  const out = Object.fromEntries(Object.keys(SEGMENTOS).map((k) => [k, [] as ClienteCrm[]])) as Record<Segmento, ClienteCrm[]>;
  for (const c of CLIENTES) out[c.segmento].push(c);
  return out;
}

// ─── Campañas y promociones ──────────────────────────────────────────────────
export type EstadoCampana = "activa" | "programada" | "borrador" | "finalizada";
export type TipoBeneficio = "porcentaje" | "monto" | "adicional_gratis";
export type Canal = "push" | "whatsapp" | "email";

export type Campana = {
  id: string;
  nombre: string;
  objetivo: string;
  segmento: Segmento | "todos" | "cumpleanos";
  beneficio: TipoBeneficio;
  valor: number; // % o S/; para adicional_gratis, el precio del adicional
  addonCode?: string;
  codigo: string;
  canales: Canal[];
  inicio: string;
  fin?: string;
  estado: EstadoCampana;
  automatica: boolean;
  // Resultados (solo la campaña de bienvenida tiene datos: sale de los descuentos de las órdenes de octubre)
  usos?: number;
  descuentoOtorgado?: number;
  ventasAtribuidas?: number;
};

export const CANALES: Record<Canal, string> = { push: "Push en la app", whatsapp: "WhatsApp", email: "Correo" };

const bienvenida = ORDENES.filter((o) => o.motivoDescuento === "Cupón bienvenida 10 %");

export const CAMPANAS: Campana[] = [
  {
    id: "CMP-001", nombre: "Cupón de bienvenida 10 %", objetivo: "Convertir el primer servicio de clientes nuevos",
    segmento: "nuevo", beneficio: "porcentaje", valor: 10, codigo: "BIENVENIDA10", canales: ["push"],
    inicio: "2026-10-01", estado: "activa", automatica: true,
    usos: bienvenida.length,
    descuentoOtorgado: r2(bienvenida.reduce((a, o) => a + o.descuento, 0)),
    ventasAtribuidas: r2(bienvenida.reduce((a, o) => a + o.total, 0)),
  },
  {
    id: "CMP-002", nombre: "Te extrañamos: 15 % en tu próximo baño", objetivo: "Reactivar clientes inactivos",
    segmento: "inactivo", beneficio: "porcentaje", valor: 15, codigo: "VUELVE15", canales: ["push", "whatsapp"],
    inicio: "2026-10-27", fin: "2026-11-30", estado: "programada", automatica: false,
  },
  {
    id: "CMP-003", nombre: "Segundo servicio con Retoque Paku gratis", objetivo: "Que el cliente nuevo vuelva por segunda vez",
    segmento: "sin_recompra", beneficio: "adicional_gratis", valor: ADICIONALES.ADD_RETOQUE.precio, addonCode: "ADD_RETOQUE",
    codigo: "SEGUNDO", canales: ["push"], inicio: "2026-11-01", estado: "borrador", automatica: true,
  },
  {
    id: "CMP-004", nombre: "Cumpleaños de la mascota: Corte estético gratis", objetivo: "Fidelizar con un detalle en su mes",
    segmento: "cumpleanos", beneficio: "adicional_gratis", valor: ADICIONALES.ADD_CORTE_EST.precio, addonCode: "ADD_CORTE_EST",
    codigo: "CUMPLEPAKU", canales: ["push"], inicio: "2026-11-01", estado: "borrador", automatica: true,
  },
  {
    id: "CMP-005", nombre: "Clientes en riesgo: S/ 15 de descuento", objetivo: "Recuperar antes de que pasen a inactivos",
    segmento: "en_riesgo", beneficio: "monto", valor: 15, codigo: "PAKU15", canales: ["push"],
    inicio: "2026-09-01", fin: "2026-09-30", estado: "finalizada", automatica: false,
  },
];

export const ESTADO_CAMPANA: Record<EstadoCampana, { label: string; cls: string }> = {
  activa: { label: "Activa", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  programada: { label: "Programada", cls: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  borrador: { label: "Borrador", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  finalizada: { label: "Finalizada", cls: "bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400" },
};

export const beneficioTexto = (c: Pick<Campana, "beneficio" | "valor" | "addonCode">) =>
  c.beneficio === "porcentaje" ? `${c.valor} % de descuento`
    : c.beneficio === "monto" ? `S/ ${c.valor} de descuento`
      : `${ADICIONALES[c.addonCode ?? ""]?.nombre ?? "Adicional"} gratis`;

// Mascotas que cumplen años en los próximos `dias` días
export function cumpleanosProximos(dias = 30) {
  const out: { cliente: ClienteCrm; mascota: MascotaCrm; fecha: string; edad: number }[] = [];
  for (const c of CLIENTES) for (const m of c.mascotas) {
    const [y, mm, dd] = m.nacimiento.split("-");
    let fecha = `${HOY.slice(0, 4)}-${mm}-${dd}`;
    if (fecha < HOY) fecha = `${Number(HOY.slice(0, 4)) + 1}-${mm}-${dd}`;
    if (diffDays(fecha, HOY) <= dias) out.push({ cliente: c, mascota: m, fecha, edad: Number(fecha.slice(0, 4)) - Number(y) });
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function audiencia(segmento: Campana["segmento"]): number {
  if (segmento === "todos") return CLIENTES.length;
  if (segmento === "cumpleanos") return cumpleanosProximos(30).length;
  return CLIENTES.filter((c) => c.segmento === segmento).length;
}

// ─── Recordatorios ───────────────────────────────────────────────────────────
export type TipoRecordatorio = "bano" | "antiparasitario" | "cumpleanos";
export type EstadoRecordatorio = "vencido" | "esta_semana" | "proximo";

export const TIPOS_RECORDATORIO: Record<TipoRecordatorio, { label: string; descripcion: string }> = {
  bano: { label: "Próximo baño", descripcion: "Último servicio de la mascota + su frecuencia de grooming" },
  antiparasitario: { label: "Antiparasitario", descripcion: "Según el intervalo que indicó el dueño (mensual o trimestral)" },
  cumpleanos: { label: "Cumpleaños", descripcion: "Fecha de nacimiento de la mascota" },
};

export type Recordatorio = {
  id: string;
  tipo: TipoRecordatorio;
  cliente: ClienteCrm;
  mascota: MascotaCrm;
  fecha: string; // fecha objetivo
  estado: EstadoRecordatorio;
  detalle: string;
};

const FRECUENCIA_LABEL: Record<GroomingFrequency, string> = {
  every_15_days: "cada 15 días", monthly: "1 vez al mes", occasional: "ocasional (~45 días)",
};

// Recordatorios pendientes: solo mascotas con "Recibir recordatorios" activo (receive_reminders).
export function recordatoriosPendientes(): Recordatorio[] {
  const out: Recordatorio[] = [];
  const estado = (fecha: string): EstadoRecordatorio => {
    const d = diffDays(fecha, HOY);
    return d < 0 ? "vencido" : d <= 7 ? "esta_semana" : "proximo";
  };
  for (const c of CLIENTES) for (const m of c.mascotas) {
    if (!m.recibeRecordatorios) continue;
    const ultima = c.visitas.filter((v) => v.mascotaId === m.id && !v.devuelto).at(-1);
    if (ultima) {
      const fecha = addDays(ultima.fecha, FRECUENCIA_DIAS[m.groomingFrequency]);
      const d = diffDays(fecha, HOY);
      if (d >= -21 && d <= 21)
        out.push({ id: `REC-B-${m.id}`, tipo: "bano", cliente: c, mascota: m, fecha, estado: estado(fecha),
          detalle: `Último baño ${fechaCorta(ultima.fecha)} · ${FRECUENCIA_LABEL[m.groomingFrequency]}` });
    }
    if (m.antiparasitario && m.ultimoAntiparasitario) {
      const fecha = addDays(m.ultimoAntiparasitario, ANTIPARASITARIO_DIAS[m.antiparasitario]);
      const d = diffDays(fecha, HOY);
      if (d >= -7 && d <= 14)
        out.push({ id: `REC-A-${m.id}`, tipo: "antiparasitario", cliente: c, mascota: m, fecha, estado: estado(fecha),
          detalle: `${m.antiparasitario === "monthly" ? "Mensual" : "Trimestral"} · última dosis ${fechaCorta(m.ultimoAntiparasitario)}` });
    }
  }
  for (const b of cumpleanosProximos(21)) {
    if (!b.mascota.recibeRecordatorios) continue;
    out.push({ id: `REC-C-${b.mascota.id}`, tipo: "cumpleanos", cliente: b.cliente, mascota: b.mascota, fecha: b.fecha,
      estado: estado(b.fecha), detalle: `Cumple ${b.edad} ${b.edad === 1 ? "año" : "años"}` });
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Efectividad de los recordatorios de baño de octubre: se habrían enviado 3 días antes de la fecha objetivo;
// cuenta como "volvió" si la mascota tuvo un servicio hasta 10 días después del aviso.
export function efectividadOctubre() {
  let enviados = 0;
  let volvieron = 0;
  for (const c of CLIENTES) for (const m of c.mascotas) {
    if (!m.recibeRecordatorios) continue;
    const visitas = c.visitas.filter((v) => v.mascotaId === m.id && !v.devuelto);
    for (const v of visitas) {
      const aviso = addDays(v.fecha, FRECUENCIA_DIAS[m.groomingFrequency] - 3);
      if (aviso < "2026-10-01" || aviso > HOY) continue;
      enviados++;
      if (visitas.some((w) => w.fecha > v.fecha && diffDays(w.fecha, aviso) <= 10)) volvieron++;
    }
  }
  return { enviados, volvieron };
}

export const PLANTILLAS: Record<TipoRecordatorio, { titulo: string; cuerpo: string; anticipacion: number }> = {
  bano: {
    titulo: "¡{mascota} ya está para su baño! 🛁",
    cuerpo: "Han pasado {dias} días desde su último servicio. Reserva tu día en Paku y lo atendemos en la puerta de tu casa.",
    anticipacion: 3,
  },
  antiparasitario: {
    titulo: "Recordatorio de antiparasitario",
    cuerpo: "Según lo que nos contaste, a {mascota} le toca su antiparasitario. Consulta con tu veterinario.",
    anticipacion: 2,
  },
  cumpleanos: {
    titulo: "¡Feliz cumpleaños, {mascota}! 🎂",
    cuerpo: "Para celebrarlo, su próximo baño incluye un Corte estético gratis. Válido todo su mes.",
    anticipacion: 0,
  },
};

export const rellenar = (texto: string, r: Recordatorio) =>
  texto
    .replaceAll("{mascota}", r.mascota.nombre)
    .replaceAll("{cliente}", r.cliente.nombre.split(" ")[0])
    .replaceAll("{dias}", String(diffDays(HOY, r.cliente.visitas.filter((v) => v.mascotaId === r.mascota.id).at(-1)?.fecha ?? HOY)));
