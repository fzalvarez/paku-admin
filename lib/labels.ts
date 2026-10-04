// Textos en español para los valores que devuelve la API.
// Los valores (status, role, species…) los define paku-backend y se quedan en inglés;
// la interfaz solo muestra lo que hay aquí. Agregar aquí cualquier valor nuevo.

export type OrderStatus =
  | "created"
  | "accepted"
  | "on_the_way"
  | "in_service"
  | "done"
  | "cancelled"
  | "skipped";

export const ORDER_STATUSES: OrderStatus[] = [
  "created",
  "accepted",
  "on_the_way",
  "in_service",
  "done",
  "skipped",
  "cancelled",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  created: "Creada",
  accepted: "Aceptada",
  on_the_way: "En camino",
  in_service: "En servicio",
  done: "Terminada",
  cancelled: "Cancelada",
  skipped: "Saltada",
};

const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  created: "bg-blue-100 text-blue-800",
  accepted: "bg-cyan-100 text-cyan-800",
  on_the_way: "bg-yellow-100 text-yellow-800",
  in_service: "bg-orange-100 text-orange-800",
  done: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  skipped: "bg-purple-100 text-purple-800",
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

export function orderStatusBadge(status: string): string {
  return ORDER_STATUS_BADGE[status as OrderStatus] ?? "bg-muted text-muted-foreground";
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  verifying: "Verificando",
  paid: "Pagado",
  failed: "Fallido",
};

export const SERVICE_STEPS = ["reception", "bath", "drying", "finishing", "return"] as const;

export const SERVICE_STEP_LABELS: Record<string, string> = {
  reception: "Recepción y recojo",
  bath: "Baño",
  drying: "Secado",
  finishing: "Corte y acabado",
  return: "Devolución al domicilio",
};

export const SKIP_REASON_LABELS: Record<string, string> = {
  pet_not_present: "La mascota no estaba",
  tutor_not_present: "El tutor no estaba",
  other: "Otro motivo",
};

// Reserva de cupo (C-15): "held" mientras el cliente compra (vence con el carrito, 2 h);
// "confirmed" al crear la orden; "expired" si venció el carrito; "cancelled" si se liberó
// (orden cancelada, parada saltada o servicio quitado del carrito).
export const HOLD_STATUS_LABELS: Record<string, string> = {
  held: "En compra",
  confirmed: "Confirmada",
  cancelled: "Liberada",
  expired: "Vencida",
};

const HOLD_STATUS_BADGE: Record<string, string> = {
  held: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

export function holdStatusBadge(status: string): string {
  return HOLD_STATUS_BADGE[status] ?? "bg-muted text-muted-foreground";
}

export type UserRole = "user" | "groomer" | "admin";

export const USER_ROLES: UserRole[] = ["user", "groomer", "admin"];

export const ROLE_LABELS: Record<UserRole, string> = {
  user: "Cliente",
  groomer: "Groomer",
  admin: "Admin",
};

export const RECORD_ROLE_LABELS: Record<string, string> = {
  owner: "Dueño",
  groomer: "Groomer",
  admin: "Admin",
  system: "Sistema",
};

export const SPECIES_LABELS: Record<string, string> = {
  dog: "Perro",
  cat: "Gato",
};

export const SEX_LABELS: Record<string, string> = {
  male: "Macho",
  female: "Hembra",
};

// Sexo de una persona (usuarios y groomers).
export const PERSON_SEX_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
};

export const SIZE_LABELS: Record<string, string> = {
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
};

export const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const COAT_TYPE_LABELS: Record<string, string> = {
  short: "Corto",
  medium: "Medio",
  long: "Largo",
};

export const BATH_BEHAVIOR_LABELS: Record<string, string> = {
  calm: "Tranquilo",
  fearful: "Miedoso",
  anxious: "Ansioso",
};

// Valores que envía la app (paku-vet-dev, add-pet-step4); el backend lo guarda como texto libre.
export const GROOMING_FREQUENCY_LABELS: Record<string, string> = {
  every_15_days: "Cada 15 días",
  monthly: "1 vez al mes",
  occasional: "Ocasional",
};

export const ANTIPARASITIC_INTERVAL_LABELS: Record<string, string> = {
  monthly: "Mensual",
  trimestral: "Trimestral",
};

// Texto para un valor de un mapa; si no está, muestra el valor tal cual (o "-").
export function label(map: Record<string, string>, value?: string | null): string {
  if (!value) return "-";
  return map[value] ?? value;
}

export function yesNo(value?: boolean | null): string {
  return value === true ? "Sí" : value === false ? "No" : "-";
}
