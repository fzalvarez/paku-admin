"use client";

// "¿Cuánto paga?": raza + peso → precio de cada producto y addon con la misma lógica que la
// cotización real (GET /admin/store/price-simulation).

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listBreeds,
  simulatePrices,
  type Breed,
  type PriceConfig,
  type PriceSimulation,
} from "@/lib/services/pricing";
import { cn } from "@/lib/utils";

const OTHER = "__other__";

export function PriceSimulator({ categoryId, config }: { categoryId: string; config: PriceConfig }) {
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [breedId, setBreedId] = useState<string>(OTHER);
  const [weight, setWeight] = useState("10");
  const [result, setResult] = useState<PriceSimulation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listBreeds("dog")
      .then((b) => setBreeds(b.filter((x) => x.is_active && !x.id.endsWith("_mixed"))))
      .catch(() => setBreeds([]));
  }, []);

  const label = (key: string | null) =>
    key ? config.categories.find((c) => c.key === key)?.label ?? key : "—";

  async function run() {
    const w = Number(weight.replace(",", "."));
    if (!w || w <= 0) {
      setError("Ingresa un peso mayor que 0.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(
        await simulatePrices({ categoryId, weight: w, breedId: breedId === OTHER ? null : breedId }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo simular.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Raza</p>
          <Select value={breedId} onValueChange={setBreedId}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={OTHER}>Mestizo u otra raza</SelectItem>
              {breeds.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Peso (kg)</p>
          <Input className="w-24" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <Button onClick={run} disabled={loading}>
          {loading ? "Calculando…" : "Ver precios"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="space-y-2">
          <p className="text-sm">
            Categoría de precio: <strong>{result.price_category_label}</strong>
          </p>
          <div className="overflow-x-auto rounded-lg border bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Producto / adicional</th>
                  <th className="px-3 py-2 text-right font-medium">Precio</th>
                  <th className="px-3 py-2 text-left font-medium">Fila usada</th>
                </tr>
              </thead>
              <tbody>
                {result.products.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-muted-foreground">
                      Ningún producto de esta categoría está disponible para esa raza.
                    </td>
                  </tr>
                )}
                {result.products.flatMap((p) => [
                  <Row key={p.id} name={p.name} price={p.price} used={label(p.category_used)} fallback={p.used_fallback} />,
                  ...p.addons.map((a) => (
                    <Row
                      key={`${p.id}-${a.id}`}
                      name={a.name}
                      price={a.price}
                      used={label(a.category_used)}
                      fallback={a.used_fallback}
                      addon
                    />
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  name,
  price,
  used,
  fallback,
  addon = false,
}: {
  name: string;
  price: number | null;
  used: string;
  fallback: boolean;
  addon?: boolean;
}) {
  return (
    <tr className="border-b last:border-0">
      <td className={cn("px-3 py-1.5", addon ? "pl-8 text-muted-foreground" : "font-medium")}>
        {addon ? `+ ${name}` : name}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">
        {price == null ? <span className="text-destructive">Sin precio · no se puede comprar</span> : `S/ ${price.toFixed(2)}`}
      </td>
      <td className="px-3 py-1.5">
        {used}
        {fallback && (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">respaldo</span>
        )}
      </td>
    </tr>
  );
}
