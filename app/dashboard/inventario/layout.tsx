"use client";

// Módulo de Inventario — DEMOSTRACIÓN con datos de ejemplo (sin backend). Ver lib/mock/inventario.ts.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DemoInventoryProvider } from "@/components/inventario/DemoInventoryProvider";
import { DemoBanner } from "@/components/demo/DemoBanner";

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
        <DemoBanner what="el inventario" />

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
