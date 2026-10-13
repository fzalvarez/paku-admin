"use client";

// Precios de una categoría de la tienda (feature 0007): tabla por tipo de pelaje × peso para cada
// producto y adicional, comparación entre productos y simulador "¿cuánto paga?".

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PriceComparison } from "@/components/pricing/PriceComparison";
import { PriceMatrixEditor, type PriceTarget } from "@/components/pricing/PriceMatrixEditor";
import { PriceSimulator } from "@/components/pricing/PriceSimulator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getPriceConfig,
  listAddons,
  listCategories,
  listProducts,
  type PriceConfig,
} from "@/lib/services/pricing";
import { cn } from "@/lib/utils";

type Tab = "tabla" | "comparar" | "simular";

const TABS: { key: Tab; label: string }[] = [
  { key: "tabla", label: "Tabla de precios" },
  { key: "comparar", label: "Comparar productos" },
  { key: "simular", label: "Simulador" },
];

export default function CategoryPricesPage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando precios...</p>}>
      <PricesView />
    </Suspense>
  );
}

function PricesView() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryId = params.categoryId as string;

  const [categoryName, setCategoryName] = useState("");
  const [config, setConfig] = useState<PriceConfig | null>(null);
  const [targets, setTargets] = useState<PriceTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const tab = (searchParams.get("tab") as Tab) || "tabla";
  const targetId = searchParams.get("target");

  const setQuery = useCallback(
    (patch: Record<string, string>) => {
      const q = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) q.set(k, v);
      router.replace(`${pathname}?${q}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [cfg, cats, products] = await Promise.all([
          getPriceConfig(),
          listCategories(),
          listProducts(categoryId),
        ]);
        const addons = await Promise.all(products.map((p) => listAddons(p.id)));
        if (cancelled) return;
        setConfig(cfg);
        setCategoryName(cats.find((c) => c.id === categoryId)?.name ?? "");
        setTargets([
          ...products.map((p): PriceTarget => ({ id: p.id, type: "product", name: p.name, group: p.name })),
          ...products.flatMap((p, i) =>
            addons[i].map((a): PriceTarget => ({ id: a.id, type: "addon", name: a.name, group: p.name })),
          ),
        ]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudieron cargar los precios.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const products = useMemo(() => targets.filter((t) => t.type === "product"), [targets]);
  const target = targets.find((t) => t.id === targetId) ?? products[0] ?? targets[0] ?? null;
  const onSaved = useCallback(() => setReloadKey((k) => k + 1), []);

  return (
    <div className="space-y-4">
      <div>
        <button
          onClick={() => router.push(`/dashboard/tienda/${categoryId}`)}
          className="mb-1 text-sm text-muted-foreground hover:underline"
        >
          ← Volver a productos
        </button>
        <PageHeader title={categoryName ? `Precios — ${categoryName}` : "Precios"} className="mb-0" />
      </div>

      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        El precio depende del <strong>tipo de pelaje</strong> de la raza y del <strong>peso</strong>. Las razas
        que no están en el catálogo (mestizos, cruces) pagan la fila <strong>«Mestizo u otra raza»</strong>, que
        también se usa cuando falta el precio de un pelaje. Un producto sin esa fila no se puede comprar para
        esas mascotas.
      </p>

      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setQuery({ tab: t.key })}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading || !config ? (
        !error && <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : targets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay productos en esta categoría.</p>
      ) : tab === "comparar" ? (
        <PriceComparison config={config} products={products} reloadKey={reloadKey} />
      ) : tab === "simular" ? (
        <PriceSimulator categoryId={categoryId} config={config} />
      ) : (
        target && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Editando:</span>
              <Select value={target.id} onValueChange={(id) => setQuery({ target: id })}>
                <SelectTrigger className="w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Productos</SelectLabel>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  {products.map((p) => {
                    const addons = targets.filter((t) => t.type === "addon" && t.group === p.name);
                    if (!addons.length) return null;
                    return (
                      <SelectGroup key={`g-${p.id}`}>
                        <SelectLabel>Adicionales de {p.name}</SelectLabel>
                        {addons.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <PriceMatrixEditor
              key={target.id}
              config={config}
              target={target}
              targets={targets}
              onSaved={onSaved}
            />
          </div>
        )
      )}
    </div>
  );
}
