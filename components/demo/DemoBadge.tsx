import { cn } from "@/lib/utils";

// Marca visual de los módulos de demostración (datos de ejemplo, sin backend). Se usa en el menú,
// en el inicio y dentro del módulo, para no confundirlos con los módulos conectados al sistema.
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[9px] leading-none font-bold uppercase tracking-wider text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300",
        className,
      )}
    >
      Demo
    </span>
  );
}
