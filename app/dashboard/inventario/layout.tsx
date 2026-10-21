"use client";

// Módulo de Inventario — DEMOSTRACIÓN con datos de ejemplo (sin backend). Ver lib/mock/inventario.ts.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { DemoInventoryProvider } from "@/components/inventario/DemoInventoryProvider";
import { DemoBadge } from "@/components/inventario/DemoBadge";

const TABS = [
  { href: "/dashboard/inventario", label: "Insumos" },
  { href: "/dashboard/inventario/movimientos", label: "Movimientos" },
  { href: "/dashboard/inventario/recetas", label: "Recetas y costeo" },
];

export default function InventarioLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <DemoInventoryProvider>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
          <FlaskConical className="mt-0.5 size-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">
              Vista de demostración — datos de ejemplo <DemoBadge className="ml-1 align-middle" />
            </p>
            <p className="mt-0.5 opacity-90">
              Este módulo todavía no está conectado al sistema. Muestra cómo se vería el inventario con datos
              ilustrativos; lo que se registre aquí no se guarda y se pierde al recargar la página.
            </p>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Insumos, movimientos de stock y consumo estándar por servicio, con las mismas llaves de Pricing V2.
          </p>
        </div>

        <nav className="flex gap-1 border-b">
          {TABS.map((t) => {
            const active = t.href === "/dashboard/inventario" ? pathname === t.href : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </DemoInventoryProvider>
  );
}
