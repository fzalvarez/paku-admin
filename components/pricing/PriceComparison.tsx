"use client";

// Comparar productos celda por celda (pelaje × peso), con el precio que paga realmente el cliente
// (si falta el del pelaje, el de «Mestizo u otra raza»). Marca los precios cruzados: casos en que
// un producto más caro en promedio cuesta menos que otro más barato en promedio.

import { useEffect, useMemo, useState } from "react";
import {
  cellKey,
  listActiveRules,
  rulesToMatrix,
  tierLabel,
  type PriceConfig,
} from "@/lib/services/pricing";
import { cn } from "@/lib/utils";
import type { PriceTarget } from "./PriceMatrixEditor";

interface Props {
  config: PriceConfig;
  products: PriceTarget[];
  /** Cambia cuando se guarda una tabla (recargar). */
  reloadKey: number;
}

interface Effective {
  price: number | null;
  fromFallback: boolean;
}

export function PriceComparison({ config, products, reloadKey }: Props) {
  const [matrices, setMatrices] = useState<Record<string, Record<string, number>> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all(products.map(async (p) => [p.id, rulesToMatrix(await listActiveRules(p.id), config).values] as const))
      .then((entries) => !cancelled && setMatrices(Object.fromEntries(entries)))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "No se pudo cargar la comparación."));
    return () => {
      cancelled = true;
    };
  }, [products, config, reloadKey]);

  const data = useMemo(() => {
    if (!matrices) return null;
    const fallback = config.fallback_category;
    const eff = (pid: string, cat: string, tier: number): Effective => {
      const m = matrices[pid] ?? {};
      const own = m[cellKey(cat, tier)];
      if (own != null) return { price: own, fromFallback: false };
      const fb = m[cellKey(fallback, tier)];
      return { price: fb ?? null, fromFallback: fb != null && cat !== fallback };
    };

    // Orden de productos por precio promedio (lo que el cliente paga en promedio)
    const avg = (pid: string) => {
      const prices: number[] = [];
      for (const c of config.categories)
        config.weight_tiers.forEach((_, i) => {
          const p = eff(pid, c.key, i).price;
          if (p != null) prices.push(p);
        });
      return prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : Infinity;
    };
    const ordered = [...products].sort((a, b) => avg(a.id) - avg(b.id));

    const rows = config.categories.flatMap((c) =>
      config.weight_tiers.map((t, i) => {
        const cells = ordered.map((p) => eff(p.id, c.key, i));
        // Cruce: un producto más caro en promedio (a la derecha) cuesta menos que uno a su izquierda
        let crossed = false;
        for (let a = 0; a < cells.length; a++)
          for (let b = a + 1; b < cells.length; b++) {
            const pa = cells[a].price;
            const pb = cells[b].price;
            if (pa != null && pb != null && pb < pa) crossed = true;
          }
        const missing = cells.some((x) => x.price == null);
        return { category: c, tier: t, tierIndex: i, cells, crossed, missing };
      }),
    );
    return { ordered, rows, avg };
  }, [matrices, config, products]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Cargando comparación…</p>;
  if (products.length < 2) return <p className="text-sm text-muted-foreground">Hace falta más de un producto para comparar.</p>;

  const crossedCount = data.rows.filter((r) => r.crossed).length;
  const missingCount = data.rows.filter((r) => r.missing).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-md border bg-background px-3 py-1.5">
          Orden por precio promedio:{" "}
          <strong>{data.ordered.map((p) => p.name).join(" < ")}</strong>
        </span>
        <span
          className={cn(
            "rounded-md border px-3 py-1.5",
            crossedCount ? "border-destructive/40 bg-destructive/5 text-destructive" : "bg-background",
          )}
        >
          {crossedCount
            ? `${crossedCount} caso(s) con precios cruzados (en rojo)`
            : "Sin precios cruzados"}
        </span>
        {missingCount > 0 && (
          <span className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-900">
            {missingCount} caso(s) donde algún producto no tiene precio (no se puede comprar)
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Tipo de pelaje</th>
              <th className="px-3 py-2 text-left font-medium">Peso</th>
              {data.ordered.map((p) => (
                <th key={p.id} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr
                key={`${r.category.key}-${r.tierIndex}`}
                className={cn("border-b last:border-0", r.crossed && "bg-destructive/5")}
              >
                <td className="px-3 py-1.5 whitespace-nowrap">
                  {r.tierIndex === 0 ? <strong>{r.category.label}</strong> : null}
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{tierLabel(r.tier)}</td>
                {r.cells.map((cell, i) => (
                  <td
                    key={i}
                    className={cn(
                      "px-3 py-1.5 text-right tabular-nums whitespace-nowrap",
                      r.crossed && "text-destructive",
                      cell.fromFallback && "italic text-muted-foreground",
                    )}
                    title={cell.fromFallback ? "Sin precio para este pelaje: usa «Mestizo u otra raza»" : undefined}
                  >
                    {cell.price == null ? <span className="text-amber-700">Sin precio</span> : `S/ ${cell.price.toFixed(2)}`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        En cursiva: el producto no tiene precio para ese pelaje y cobra el de «Mestizo u otra raza».
      </p>
    </div>
  );
}
