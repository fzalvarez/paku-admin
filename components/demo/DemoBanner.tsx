import { FlaskConical } from "lucide-react";
import { DemoBadge } from "./DemoBadge";

// Aviso fijo de los módulos de demostración: datos de ejemplo, sin conexión al sistema.
export function DemoBanner({ what = "este módulo" }: { what?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
      <FlaskConical className="mt-0.5 size-5 shrink-0" />
      <div className="text-sm">
        <p className="font-semibold">
          Vista de demostración — datos de ejemplo <DemoBadge className="ml-1 align-middle" />
        </p>
        <p className="mt-0.5 opacity-90">
          Este módulo todavía no está conectado al sistema. Muestra cómo se vería {what} con datos ilustrativos; lo
          que se registre aquí no se guarda y se pierde al recargar la página.
        </p>
      </div>
    </div>
  );
}
