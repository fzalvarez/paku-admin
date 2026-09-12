import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  // Por defecto trae su propio mb-6. Pasa "mb-0" cuando el padre ya
  // controla el espaciado (ej. un wrapper con space-y-*) para evitar
  // doble margen.
  className?: string;
}

// Reemplaza el <h1> repetido a mano en cada página del dashboard.
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-center justify-between gap-3", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
