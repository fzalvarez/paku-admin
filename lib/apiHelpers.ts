// Mensajes de error de la API en español. Único parser para todas las páginas.
//
// Formas de `detail` que devuelve paku-backend:
//   - string:  "Order not found", "assign_invalid: no se puede asignar…"
//   - objeto:  { code: "SKIP_NOT_ALLOWED", message?: "…", … }
//   - lista:   errores de validación [{ msg, loc }]

const CODE_MESSAGES: Record<string, string> = {
  EMAIL_ALREADY_REGISTERED: "El email ya está registrado",
  SERVICE_STEPS_PENDING: "El groomer aún no termina los pasos del servicio",
  SKIP_NOT_ALLOWED: "La parada no se puede saltar en este estado",
  DELAY_NOT_ALLOWED: "No se puede avisar demora en este estado",
  STEP_MISMATCH: "El paso del servicio cambió; recarga la orden",
  LAST_STEP: "La orden ya está en el último paso",
  INITIAL_PHOTO_REQUIRED: "Falta la foto inicial",
  ADDONS_PENDING: "Hay complementos sin realizar",
  NOT_IN_SERVICE: "La orden no está en servicio",
  ADDON_NOT_ALLOWED_NOW: "No se pueden marcar complementos en este paso",
  PRICE_CHANGED: "Los precios cambiaron",
};

const TEXT_MESSAGES: Record<string, string> = {
  email_already_registered: "El email ya está registrado",
  "Order not found": "Orden no encontrada",
  order_not_found: "Orden no encontrada",
  "Pet not found": "Mascota no encontrada",
  "User not found": "Usuario no encontrado",
  "Record not found": "Registro no encontrado",
  "Breed not found": "Raza no encontrada",
  "Product not found": "Producto no encontrado",
  "Slot not found": "Fecha no encontrada",
  "Not authorized": "No tienes permiso para esta acción",
  Forbidden: "No tienes permiso para esta acción",
  "Insufficient permissions": "No tienes permiso para esta acción",
  "Invalid status transition": "Cambio de estado no permitido",
  "Invalid token": "Sesión inválida, vuelve a iniciar sesión",
  "Token expired": "La sesión expiró, vuelve a iniciar sesión",
  "User is inactive": "El usuario está inactivo",
  "Invalid credentials": "Email o contraseña incorrectos",
  internal_error: "Error interno del servidor",
  "Not Found": "No encontrado (¿el backend tiene esta función desplegada?)",
};

function translateText(text: string): string {
  if (TEXT_MESSAGES[text]) return TEXT_MESSAGES[text];
  if (/^Cannot transition from \w+ to \w+$/.test(text)) return "Cambio de estado no permitido";
  // "codigo_snake: texto en español" → solo el texto
  const prefixed = /^[a-z_]+: (.+)$/.exec(text);
  if (prefixed) return prefixed[1];
  return text;
}

// Errores de validación de FastAPI/pydantic: [{ msg, loc: ["body", "campo"] }]
function validationMessage(item: { msg?: string; loc?: unknown[] }): string {
  const field = Array.isArray(item.loc) ? String(item.loc[item.loc.length - 1] ?? "") : "";
  const msg = item.msg ?? "";
  const where = field ? ` (${field})` : "";
  if (msg === "Field required") return `Falta un campo obligatorio${where}`;
  if (msg.startsWith("Input should be")) return `Valor no válido${where}`;
  if (msg.startsWith("Value error, ")) return translateText(msg.slice("Value error, ".length));
  return msg ? `${msg}${where}` : "Datos inválidos";
}

export function apiErrorMessage(body: unknown, status: number): string {
  const b = body as { detail?: unknown; message?: unknown } | null;
  const detail = b?.detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string; loc?: unknown[] } | string;
    return typeof first === "string" ? translateText(first) : validationMessage(first);
  }
  if (detail && typeof detail === "object") {
    const d = detail as { code?: unknown; message?: unknown };
    const code = typeof d.code === "string" ? d.code : "";
    if (CODE_MESSAGES[code]) return CODE_MESSAGES[code];
    if (typeof d.message === "string") return translateText(d.message);
    if (code) return code;
  }
  if (typeof detail === "string" && detail) return translateText(detail);
  if (typeof b?.message === "string") return translateText(b.message);
  return `Error ${status}`;
}

export async function parseApiError(res: Response): Promise<string> {
  try {
    return apiErrorMessage(await res.json(), res.status);
  } catch {
    return `Error ${res.status}`;
  }
}
