"use client";

// Tabla de precios de un producto o addon: filas = tipo de pelaje (+ "Mestizo u otra raza"),
// columnas = tramos de peso. Se guarda completa (PUT /admin/store/price-matrix).

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  cellKey,
  deactivateRule,
  listActiveRules,
  matrixToCells,
  rulesToMatrix,
  savePriceMatrix,
  tierLabel,
  type PriceConfig,
  type PriceRule,
  type TargetType,
} from "@/lib/services/pricing";
import { cn } from "@/lib/utils";

export interface PriceTarget {
  id: string;
  type: TargetType;
  name: string;
  /** Producto al que pertenece el addon (para agrupar en el selector). */
  group: string;
}

interface Props {
  config: PriceConfig;
  target: PriceTarget;
  /** Todos los productos y addons de la categoría (para "copiar de…"). */
  targets: PriceTarget[];
  /** Avisa que cambiaron las reglas (la comparación se recalcula). */
  onSaved: () => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function PriceMatrixEditor({ config, target, targets, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [outside, setOutside] = useState<PriceRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [busyRule, setBusyRule] = useState<string | null>(null);

  // Herramientas
  const [copyFrom, setCopyFrom] = useState("");
  const [copyPct, setCopyPct] = useState("0");
  const [adjustPct, setAdjustPct] = useState("");

  const fallback = config.fallback_category;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const rules = await listActiveRules(target.id);
      const { values, outside: out } = rulesToMatrix(rules, config);
      setSaved(values);
      setDraft(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])));
      setOutside(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los precios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setNotice("");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id]);

  const values = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(draft)) {
      const n = Number(v.replace(",", "."));
      if (v.trim() !== "" && !Number.isNaN(n)) out[k] = n;
    }
    return out;
  }, [draft]);

  const dirty = useMemo(() => {
    const keys = new Set([...Object.keys(values), ...Object.keys(saved)]);
    for (const k of keys) if (values[k] !== saved[k]) return true;
    return false;
  }, [values, saved]);

  const invalidCells = Object.entries(draft).filter(([, v]) => {
    const n = Number(v.replace(",", "."));
    return v.trim() !== "" && (Number.isNaN(n) || n < 0);
  }).length;

  // Alertas de celdas vacías
  const missingFallback = config.weight_tiers
    .map((t, i) => ({ t, i }))
    .filter(({ i }) => values[cellKey(fallback, i)] == null);
  const missingCoats = config.categories
    .filter((c) => c.key !== fallback)
    .reduce(
      (n, c) => n + config.weight_tiers.filter((_, i) => values[cellKey(c.key, i)] == null).length,
      0,
    );

  async function handleSave() {
    if (outside.length > 0) {
      const ok = window.confirm(
        `Al guardar, ${outside.length} regla(s) que no calzan en la tabla se desactivarán. ¿Continuar?`,
      );
      if (!ok) return;
    }
    setSaving(true);
    setError("");
    try {
      await savePriceMatrix(target.id, target.type, matrixToCells(values, config));
      setNotice("Tabla guardada.");
      await load();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la tabla.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(rule: PriceRule) {
    setBusyRule(rule.id);
    try {
      await deactivateRule(rule.id);
      setOutside((prev) => prev.filter((r) => r.id !== rule.id));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo desactivar la regla.");
    } finally {
      setBusyRule(null);
    }
  }

  async function handleCopy() {
    const source = targets.find((t) => t.id === copyFrom);
    if (!source) return;
    const pct = Number(copyPct.replace(",", ".")) || 0;
    try {
      const { values: src } = rulesToMatrix(await listActiveRules(source.id), config);
      if (Object.keys(src).length === 0) {
        setError(`«${source.name}» no tiene precios en la tabla para copiar.`);
        return;
      }
      setDraft(Object.fromEntries(Object.entries(src).map(([k, v]) => [k, String(round2(v * (1 + pct / 100)))])));
      setNotice(`Copiado de «${source.name}»${pct ? ` con ${pct > 0 ? "+" : ""}${pct} %` : ""}. Revisa y guarda.`);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo copiar.");
    }
  }

  function applyAdjust(category?: string) {
    const pct = Number(adjustPct.replace(",", "."));
    if (!pct) return;
    setDraft((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(values)) {
        if (category && !k.startsWith(`${category}|`)) continue;
        next[k] = String(round2(v * (1 + pct / 100)));
      }
      return next;
    });
    setNotice(`Ajuste de ${pct > 0 ? "+" : ""}${pct} % aplicado${category ? " a la fila" : ""}. Revisa y guarda.`);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando precios…</p>;

  const groups = Array.from(new Set(targets.map((t) => t.group)));

  return (
    <div className="space-y-4">
      {/* ── Alertas ───────────────────────────────────────────── */}
      {(missingFallback.length > 0 || missingCoats > 0 || outside.length > 0) && (
        <div className="space-y-2">
          {missingFallback.length > 0 && (
            <Alert tone="danger">
              Sin precio en «Mestizo u otra raza» para{" "}
              {missingFallback.map(({ t }) => tierLabel(t)).join(", ")}: en esos pesos los mestizos no pueden
              comprar, y tampoco las razas cuyo pelaje no tenga precio.
            </Alert>
          )}
          {missingCoats > 0 && (
            <Alert tone="warning">
              {missingCoats} celda(s) de pelaje sin precio: esas mascotas pagan el precio de «Mestizo u otra
              raza» del mismo peso (se muestra en gris).
            </Alert>
          )}
          {outside.length > 0 && (
            <Alert tone="warning">
              <p className="mb-2">
                {outside.length} regla(s) activas no se usan en esta tabla (categoría antigua o tramo distinto).
                Se desactivan al guardar o una por una:
              </p>
              <ul className="space-y-1">
                {outside.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">
                      {r.breed_category} · {r.weight_min}–{r.weight_max ?? "∞"} kg · S/ {r.price.toFixed(2)}
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={busyRule === r.id}
                      onClick={() => handleDeactivate(r)}
                    >
                      {busyRule === r.id ? "Desactivando…" : "Desactivar"}
                    </Button>
                  </li>
                ))}
              </ul>
            </Alert>
          )}
        </div>
      )}

      {/* ── Herramientas ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-background p-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Copiar tabla de</p>
          <div className="flex items-center gap-2">
            <Select value={copyFrom} onValueChange={setCopyFrom}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Elige producto o addon" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectGroup key={g}>
                    <SelectLabel>{g}</SelectLabel>
                    {targets
                      .filter((t) => t.group === g && t.id !== target.id)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="w-20"
              value={copyPct}
              onChange={(e) => setCopyPct(e.target.value)}
              aria-label="Ajuste al copiar en %"
            />
            <span className="text-sm text-muted-foreground">%</span>
            <Button variant="outline" onClick={handleCopy} disabled={!copyFrom}>
              Copiar
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Ajustar toda la tabla</p>
          <div className="flex items-center gap-2">
            <Input
              className="w-20"
              placeholder="+10"
              value={adjustPct}
              onChange={(e) => setAdjustPct(e.target.value)}
              aria-label="Ajuste en %"
            />
            <span className="text-sm text-muted-foreground">%</span>
            <Button variant="outline" onClick={() => applyAdjust()} disabled={!Number(adjustPct)}>
              Aplicar
            </Button>
          </div>
        </div>
      </div>

      {/* ── Tabla ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Tipo de pelaje</th>
              {config.weight_tiers.map((t, i) => (
                <th key={i} className="px-2 py-2 text-left font-medium whitespace-nowrap">
                  {tierLabel(t)}
                </th>
              ))}
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {config.categories.map((c) => {
              const isFallback = c.key === fallback;
              return (
                <tr key={c.key} className={cn("border-b last:border-0", isFallback && "bg-muted/30")}>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    {c.label}
                    {isFallback && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        Mestizos, razas no listadas y respaldo
                      </span>
                    )}
                  </td>
                  {config.weight_tiers.map((_, i) => {
                    const k = cellKey(c.key, i);
                    const changed = values[k] !== saved[k];
                    const fb = values[cellKey(fallback, i)];
                    const raw = draft[k] ?? "";
                    const bad = raw.trim() !== "" && (Number.isNaN(Number(raw.replace(",", "."))) || Number(raw.replace(",", ".")) < 0);
                    return (
                      <td key={i} className="px-2 py-1.5">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            S/
                          </span>
                          <Input
                            inputMode="decimal"
                            className={cn(
                              "h-8 w-24 pl-7 tabular-nums",
                              changed && "border-amber-500 bg-amber-50",
                              bad && "border-destructive",
                            )}
                            placeholder={!isFallback && fb != null ? String(fb) : "—"}
                            value={raw}
                            onChange={(e) => setDraft((prev) => ({ ...prev, [k]: e.target.value }))}
                            aria-label={`${c.label}, ${tierLabel(config.weight_tiers[i])}`}
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5">
                    <Button
                      size="xs"
                      variant="ghost"
                      title="Aplicar el % de «Ajustar toda la tabla» solo a esta fila"
                      disabled={!Number(adjustPct)}
                      onClick={() => applyAdjust(c.key)}
                    >
                      % fila
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && !error && <p className="text-sm text-muted-foreground">{notice}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSave} disabled={saving || (!dirty && outside.length === 0) || invalidCells > 0}>
          {saving ? "Guardando…" : "Guardar tabla"}
        </Button>
        <Button
          variant="outline"
          disabled={!dirty || saving}
          onClick={() => {
            setDraft(Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, String(v)])));
            setNotice("");
          }}
        >
          Descartar cambios
        </Button>
        {invalidCells > 0 && (
          <span className="text-sm text-destructive">Hay precios no válidos.</span>
        )}
        {dirty && invalidCells === 0 && (
          <span className="text-sm text-amber-700">Hay cambios sin guardar (celdas en amarillo).</span>
        )}
      </div>
    </div>
  );
}

function Alert({ tone, children }: { tone: "danger" | "warning"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "danger"
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : "border-amber-300 bg-amber-50 text-amber-900",
      )}
    >
      {children}
    </div>
  );
}
