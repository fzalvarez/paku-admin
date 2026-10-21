import type { ReactNode } from "react";
import { Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SEGMENTOS, type Segmento } from "@/lib/mock/crm";

// Piezas comunes de las vistas del CRM de demostración.

export function SegmentBadge({ segmento, className }: { segmento: Segmento; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", SEGMENTOS[segmento].cls, className)}>
      {SEGMENTOS[segmento].label}
    </span>
  );
}

export function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <Card className={cn(warn && "border-amber-300 dark:border-amber-800")}>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-semibold tabular-nums", warn && "text-amber-700 dark:text-amber-400")}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// Qué datos ya existen en el sistema y qué falta para que la vista deje de ser demo.
export function FuenteDatos({ existe, falta }: { existe: ReactNode[]; falta: ReactNode[] }) {
  return (
    <Card className="border-dashed">
      <CardContent className="grid gap-4 pt-4 text-sm sm:grid-cols-2">
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 font-medium">
            <Database className="size-4 text-emerald-600" /> Ya existe en Paku
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
            {existe.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 font-medium">
            <Database className="size-4 text-amber-600" /> Faltaría para hacerlo real
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
            {falta.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";
