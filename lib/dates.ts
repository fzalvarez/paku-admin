// Fechas de calendario en hora de Lima, como "YYYY-MM-DD". Paku opera en Lima: el día de una
// orden se calcula en esa zona aunque el navegador esté en otra.

const LIMA_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Día (YYYY-MM-DD) en Lima de una fecha ISO; null si no hay fecha o es inválida.
export function limaDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : LIMA_DAY.format(d);
}

export function limaToday(): string {
  return LIMA_DAY.format(new Date());
}

// Suma días a un YYYY-MM-DD (aritmética de calendario, sin zona horaria).
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

// Lunes a domingo de la semana que contiene `ymd`.
export function weekRange(ymd: string): { from: string; to: string } {
  const [y, m, d] = ymd.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  const fromMonday = (weekday + 6) % 7;
  const from = addDays(ymd, -fromMonday);
  return { from, to: addDays(from, 6) };
}

export const isYmd = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
