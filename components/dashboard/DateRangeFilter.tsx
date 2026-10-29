"use client";

// Filtro de fechas desde/hasta guardado en la URL (?desde=&hasta=), como en Órdenes: se comparte el enlace
// y sobrevive a recargar. Con `month` las fechas son meses (YYYY-MM). La página que lo use necesita un
// Suspense alrededor (useSearchParams en Next 16).

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isYmd, limaDate } from "@/lib/dates";

const isYm = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}$/.test(s);

export type DateRange = {
  desde: string;
  hasta: string;
  /** Hay al menos un límite elegido. */
  active: boolean;
  setRange: (changes: { desde?: string; hasta?: string }) => void;
  /** ¿La fecha (YYYY-MM-DD, YYYY-MM o ISO con hora, que se pasa a día de Lima) cae en el rango? Sin fecha, solo pasa si no hay filtro. */
  inRange: (fecha?: string | null) => boolean;
  /** ¿El período [inicio, fin] se cruza con el rango? Sin `fin`, el período sigue abierto. */
  overlaps: (inicio: string, fin?: string | null) => boolean;
};

export function useDateRange({ month = false, defaults }: { month?: boolean; defaults?: { desde?: string; hasta?: string } } = {}): DateRange {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const valid = month ? isYm : isYmd;
  const read = (key: "desde" | "hasta") => {
    const v = params.get(key);
    if (v === "todo") return "";
    return valid(v) ? v : defaults?.[key] ?? "";
  };
  const desde = read("desde");
  const hasta = read("hasta");

  // Cambia la URL sin agregar historial ni mover el scroll; conserva los demás parámetros. "" borra el límite.
  const setRange = (changes: { desde?: string; hasta?: string }) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else if (defaults?.[key as "desde" | "hasta"]) next.set(key, "todo"); // "todo" no es fecha: anula el valor por defecto
      else next.delete(key);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const norm = (f: string) => {
    if (/^\d{4}-\d{2}(-\d{2})?$/.test(f)) return f;
    return limaDate(f) ?? "";
  };
  // Compara al nivel del rango: por mes si el filtro es mensual.
  const cut = (f: string) => (month ? f.slice(0, 7) : f.slice(0, 10));

  const inRange = (fecha?: string | null) => {
    if (!desde && !hasta) return true;
    const f = fecha ? cut(norm(fecha)) : "";
    if (!f) return false;
    return (!desde || f >= desde) && (!hasta || f <= hasta);
  };
  const overlaps = (inicio: string, fin?: string | null) =>
    (!hasta || cut(norm(inicio)) <= hasta) && (!desde || !fin || cut(norm(fin)) >= desde);

  return { desde, hasta, active: !!(desde || hasta), setRange, inRange, overlaps };
}

export function DateRangeFilter({ range, month = false }: { range: DateRange; month?: boolean }) {
  const type = month ? "month" : "date";
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label className="text-xs">Desde</Label>
        <Input
          type={type}
          aria-label="Desde"
          className="w-auto"
          max={range.hasta || undefined}
          value={range.desde}
          onChange={(e) => range.setRange({ desde: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Hasta</Label>
        <Input
          type={type}
          aria-label="Hasta"
          className="w-auto"
          min={range.desde || undefined}
          value={range.hasta}
          onChange={(e) => range.setRange({ hasta: e.target.value })}
        />
      </div>
      {range.active && (
        <Button variant="ghost" size="sm" className="mb-0.5" onClick={() => range.setRange({ desde: "", hasta: "" })}>
          <X className="size-4" /> Quitar fechas
        </Button>
      )}
    </div>
  );
}
