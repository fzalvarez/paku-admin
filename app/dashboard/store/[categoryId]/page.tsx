"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ─── Types ─────────────────────────────────────────────── */

type Species = "dog" | "cat";

type BreedCategory = "mestizo" | "official" | "otros";

interface Category {
  id: string;
  name: string;
  slug?: string;
  species: Species | null;
  is_active: boolean;
}

interface Product {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  species: Species;
  allowed_breeds: string[] | null;
  is_active: boolean;
  price?: null;
  currency?: string;
}

interface Addon {
  id: string;
  product_id: string;
  name: string;
  description?: string | null;
  species: Species;
  allowed_breeds: string[] | null;
  is_active: boolean;
  price?: null;
  currency?: string;
}

interface PriceRule {
  id: string;
  target_id: string;
  target_type: "product" | "addon";
  species: Species;
  breed_category: BreedCategory;
  weight_min: number;
  weight_max: number | null;
  price: number; // céntimos
  currency: string;
  is_active: boolean;
}

interface BreedCatalogItem {
  id: string;
  name: string;
  species: Species;
  is_active: boolean;
}

/* ─── Helpers ────────────────────────────────────────────── */

const parseApiError = async (res: Response): Promise<string> => {
  try {
    const body = await res.json();
    if (body?.detail) {
      if (Array.isArray(body.detail) && body.detail.length > 0)
        return body.detail[0].msg || String(body.detail[0]);
      return String(body.detail);
    }
  } catch {
    /* ignore */
  }
  return `Error ${res.status}`;
};

function centsToPen(cents: number): string {
  return (cents / 100).toFixed(2);
}

function penToCents(val: string): number {
  return Math.round(parseFloat(val) * 100);
}

function breedCategoryLabel(cat: BreedCategory): string {
  switch (cat) {
    case "mestizo":
      return "Mestizo";
    case "official":
      return "Raza pura (official)";
    case "otros":
      return "Otros";
    default:
      return cat;
  }
}

/* ─── BreedSelector ──────────────────────────────────────── */
/**
 * Multi-select de razas con checkbox "Todas las razas".
 * - allBreeds: catálogo activo para la especie
 * - selected: ids seleccionados ([] cuando "Todas")
 * - allSelected: true => allowed_breeds = null al guardar
 * - onChange: (ids: string[] | null) => void
 *   null = todas, string[] = específicas
 */
interface BreedSelectorProps {
  species: "dog" | "cat";
  catalog: BreedCatalogItem[];
  catalogLoading: boolean;
  value: string[] | null; // null = todas
  onChange: (val: string[] | null) => void;
}

function BreedSelector({
  species,
  catalog,
  catalogLoading,
  value,
  onChange,
}: BreedSelectorProps) {
  const allSelected = value === null;
  const activeBreeds = catalog.filter(
    (b) => b.species === species && b.is_active
  );

  // ids in value that are NOT in catalog (inactive/deleted)
  const orphanIds =
    value !== null
      ? value.filter((id) => !catalog.some((b) => b.id === id))
      : [];

  function toggleAll(checked: boolean) {
    onChange(checked ? null : []);
  }

  function toggleBreed(id: string, checked: boolean) {
    if (allSelected) return;
    const current = value ?? [];
    if (checked) {
      onChange([...current, id]);
    } else {
      const next = current.filter((v) => v !== id);
      onChange(next.length === 0 ? null : next);
    }
  }

  const summary = allSelected
    ? "Todas las razas"
    : value && value.length > 0
    ? `${value.length} seleccionada${value.length > 1 ? "s" : ""}`
    : "Todas las razas";

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      >
        <span className={allSelected || (value && value.length === 0) ? "text-muted-foreground" : ""}>
          {summary}
        </span>
        <span className="ml-2 text-muted-foreground">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-60 overflow-y-auto p-1">
          {catalogLoading ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">Cargando razas…</p>
          ) : (
            <>
              {/* Todas */}
              <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="font-medium">Todas las razas</span>
              </label>
              <div className="my-1 border-t border-border" />
              {/* Activas del catálogo */}
              {activeBreeds.map((b) => (
                <label
                  key={b.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer ${
                    allSelected ? "opacity-40 cursor-not-allowed" : "hover:bg-accent"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={allSelected}
                    checked={!allSelected && (value ?? []).includes(b.id)}
                    onChange={(e) => toggleBreed(b.id, e.target.checked)}
                    className="h-4 w-4"
                  />
                  {b.name}
                </label>
              ))}
              {/* Huérfanas (inactivas/no en catálogo) */}
              {orphanIds.map((id) => (
                <label
                  key={id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked
                    onChange={(e) => toggleBreed(id, e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-muted-foreground">(inactiva) {id}</span>
                </label>
              ))}
              {activeBreeds.length === 0 && orphanIds.length === 0 && (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  Sin razas en catálogo para esta especie.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PRICE RULES PANEL
   ════════════════════════════════════════════════════════════ */

interface PriceRulesPanelProps {
  targetId: string;
  targetType: "product" | "addon";
  species: "dog" | "cat";
  title: string;
  onClose: () => void;
}

function PriceRulesPanel({
  targetId,
  targetType,
  species,
  title,
  onClose,
}: PriceRulesPanelProps) {
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ── Create ── */
  const [showCreate, setShowCreate] = useState(false);
  const [cBreedCat, setCBreedCat] = useState<BreedCategory>("mestizo");
  const [cWeightMin, setCWeightMin] = useState("0");
  const [cWeightMax, setCWeightMax] = useState("");
  const [cPrice, setCPrice] = useState("");
  const [cError, setCError] = useState("");
  const [creating, setCreating] = useState(false);

  /* ── Edit ── */
  const [editRule, setEditRule] = useState<PriceRule | null>(null);
  const [eWeightMin, setEWeightMin] = useState("");
  const [eWeightMax, setEWeightMax] = useState("");
  const [ePrice, setEPrice] = useState("");
  const [eIsActive, setEIsActive] = useState(true);
  const [eError, setEError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  async function loadRules() {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/admin/store/price-rules?target_id=${targetId}`);
      if (!res.ok) {
        setError(await parseApiError(res));
      } else {
        setRules(await res.json());
      }
    } catch {
      setError("Error de red al cargar reglas.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setCBreedCat("mestizo");
    setCWeightMin("0");
    setCWeightMax("");
    setCPrice("");
    setCError("");
    setShowCreate(true);
  }

  async function handleCreate() {
    const priceVal = parseFloat(cPrice);
    if (!cPrice || isNaN(priceVal) || priceVal < 0) {
      setCError("Precio inválido.");
      return;
    }
    setCreating(true);
    setCError("");
    try {
      const payload = {
        target_id: targetId,
        target_type: targetType,
        species,
        breed_category: cBreedCat,
        weight_min: parseFloat(cWeightMin) || 0,
        weight_max: cWeightMax.trim() ? parseFloat(cWeightMax) : null,
        price: penToCents(cPrice),
        currency: "PEN",
      };
      const res = await apiFetch("/admin/store/price-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setCError(await parseApiError(res));
      } else {
        const created: PriceRule = await res.json();
        setRules((prev) => [...prev, created]);
        setShowCreate(false);
      }
    } catch {
      setCError("Error de red al crear regla.");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(rule: PriceRule) {
    setEditRule(rule);
    setEWeightMin(String(rule.weight_min));
    setEWeightMax(rule.weight_max !== null ? String(rule.weight_max) : "");
    setEPrice(centsToPen(rule.price));
    setEIsActive(rule.is_active);
    setEError("");
  }

  async function handleSaveEdit() {
    if (!editRule) return;
    const priceVal = parseFloat(ePrice);
    if (!ePrice || isNaN(priceVal) || priceVal < 0) {
      setEError("Precio inválido.");
      return;
    }
    setSaving(true);
    setEError("");
    try {
      const payload = {
        weight_min: parseFloat(eWeightMin) || 0,
        weight_max: eWeightMax.trim() ? parseFloat(eWeightMax) : null,
        price: penToCents(ePrice),
        is_active: eIsActive,
      };
      const res = await apiFetch(`/admin/store/price-rules/${editRule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setEError(await parseApiError(res));
      } else {
        const updated: PriceRule = await res.json();
        setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        setEditRule(null);
      }
    } catch {
      setEError("Error de red al guardar regla.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {targetType === "product" ? "Producto" : "Addon"} · especie:{" "}
            {species === "dog" ? "Perro" : "Gato"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={openCreate}>
            + Nueva regla
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            ✕ Cerrar
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando reglas…</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin reglas de precio.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Categoría raza</th>
                <th className="px-3 py-2 text-left font-medium">Peso mín</th>
                <th className="px-3 py-2 text-left font-medium">Peso máx</th>
                <th className="px-3 py-2 text-left font-medium">Precio</th>
                <th className="px-3 py-2 text-left font-medium">Estado</th>
                <th className="px-3 py-2 text-left font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2">{breedCategoryLabel(rule.breed_category)}</td>
                  <td className="px-3 py-2">{rule.weight_min} kg</td>
                  <td className="px-3 py-2">
                    {rule.weight_max !== null ? `${rule.weight_max} kg` : "∞"}
                  </td>
                  <td className="px-3 py-2">
                    S/ {centsToPen(rule.price)}{" "}
                    <span className="text-muted-foreground">{rule.currency}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={rule.is_active ? "default" : "secondary"}>
                      {rule.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(rule)}
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create price rule dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva regla de precio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Categoría de raza</Label>
              <Select
                value={cBreedCat}
                onValueChange={(v) => setCBreedCat(v as BreedCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mestizo">Mestizo</SelectItem>
                  <SelectItem value="official">Raza pura (official)</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Peso mín (kg)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={cWeightMin}
                  onChange={(e) => setCWeightMin(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Peso máx (kg){" "}
                  <span className="text-muted-foreground text-xs">(vacío=∞)</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={cWeightMax}
                  onChange={(e) => setCWeightMax(e.target.value)}
                  placeholder="∞"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Precio (S/)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={cPrice}
                onChange={(e) => setCPrice(e.target.value)}
                placeholder="Ej: 45.00"
              />
            </div>
            {cError && <p className="text-sm text-destructive">{cError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit price rule dialog */}
      <Dialog
        open={!!editRule}
        onOpenChange={(open) => {
          if (!open) setEditRule(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar regla de precio</DialogTitle>
          </DialogHeader>
          {editRule && (
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">
                Categoría:{" "}
                <span className="capitalize">
                  {breedCategoryLabel(editRule.breed_category)}
                </span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Peso mín (kg)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={eWeightMin}
                    onChange={(e) => setEWeightMin(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>
                    Peso máx (kg){" "}
                    <span className="text-muted-foreground text-xs">(vacío=∞)</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={eWeightMax}
                    onChange={(e) => setEWeightMax(e.target.value)}
                    placeholder="∞"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Precio (S/)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ePrice}
                  onChange={(e) => setEPrice(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="erule-active"
                  type="checkbox"
                  checked={eIsActive}
                  onChange={(e) => setEIsActive(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="erule-active">Activo</Label>
              </div>
              {eError && <p className="text-sm text-destructive">{eError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditRule(null)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ADDONS PANEL
   ════════════════════════════════════════════════════════════ */

interface AddonsPanelProps {
  product: Product;
  breedsCatalog: Map<string, BreedCatalogItem[]>;
  setBreedsCache: (species: Species, items: BreedCatalogItem[]) => void;
  onClose: () => void;
}

function AddonsPanel({ product, breedsCatalog, setBreedsCache, onClose }: AddonsPanelProps) {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  /* ── Breeds catalog for this species ── */
  const catalogKey = product.species;
  const catalogItems = breedsCatalog.get(catalogKey) ?? [];
  const [catalogLoading, setCatalogLoading] = useState(false);

  async function ensureBreeds() {
    if (breedsCatalog.has(catalogKey)) return;
    setCatalogLoading(true);
    try {
      const res = await apiFetch(`/admin/breeds?species=${catalogKey}`);
      if (res.ok) {
        const data: BreedCatalogItem[] = await res.json();
        setBreedsCache(catalogKey, data);
      }
    } catch { /* ignore */ } finally {
      setCatalogLoading(false);
    }
  }

  /* ── Create ── */
  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cDescription, setCDescription] = useState("");
  const [cBreeds, setCBreeds] = useState<string[] | null>(null);
  const [cActive, setCActive] = useState(true);
  const [cError, setCError] = useState("");
  const [creating, setCreating] = useState(false);

  /* ── Edit ── */
  const [editAddon, setEditAddon] = useState<Addon | null>(null);
  const [eName, setEName] = useState("");
  const [eDescription, setEDescription] = useState("");
  const [eBreeds, setEBreeds] = useState<string[] | null>(null);
  const [eError, setEError] = useState("");
  const [saving, setSaving] = useState(false);

  /* ── Price rules for addon ── */
  const [priceAddon, setPriceAddon] = useState<Addon | null>(null);

  useEffect(() => {
    loadAddons();
    ensureBreeds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  async function loadAddons() {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(
        `/admin/store/addons?product_id=${product.id}`
      );
      if (!res.ok) {
        setError(await parseApiError(res));
      } else {
        setAddons(await res.json());
      }
    } catch {
      setError("Error de red al cargar addons.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(addon: Addon) {
    setTogglingId(addon.id);
    try {
      const res = await apiFetch(`/admin/store/addons/${addon.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !addon.is_active }),
      });
      if (!res.ok) {
        setError(await parseApiError(res));
      } else {
        setAddons((prev) =>
          prev.map((a) =>
            a.id === addon.id ? { ...a, is_active: !a.is_active } : a
          )
        );
      }
    } catch {
      setError("Error de red al cambiar estado.");
    } finally {
      setTogglingId(null);
    }
  }

  function openCreate() {
    setCName("");
    setCDescription("");
    setCBreeds(null);
    setCActive(true);
    setCError("");
    ensureBreeds();
    setShowCreate(true);
  }

  async function handleCreate() {
    if (!cName.trim()) {
      setCError("El nombre es requerido.");
      return;
    }
    setCreating(true);
    setCError("");
    try {
      const payload = {
        product_id: product.id,
        name: cName.trim(),
        description: cDescription.trim() ? cDescription.trim() : null,
        species: product.species,
        allowed_breeds: cBreeds,
        is_active: cActive,
      };
      const res = await apiFetch("/admin/store/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setCError(await parseApiError(res));
      } else {
        const created: Addon = await res.json();
        setAddons((prev) => [...prev, created]);
        setShowCreate(false);
      }
    } catch {
      setCError("Error de red al crear addon.");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(addon: Addon) {
    setEditAddon(addon);
    setEName(addon.name);
    setEDescription(addon.description ?? "");
    setEBreeds(addon.allowed_breeds);
    setEError("");
    ensureBreeds();
  }

  async function handleSaveEdit() {
    if (!editAddon) return;
    if (!eName.trim()) {
      setEError("El nombre es requerido.");
      return;
    }
    setSaving(true);
    setEError("");
    try {
      const payload = {
        name: eName.trim(),
        description: eDescription.trim() ? eDescription.trim() : null,
        allowed_breeds: eBreeds,
      };
      const res = await apiFetch(`/admin/store/addons/${editAddon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setEError(await parseApiError(res));
      } else {
        const updated: Addon = await res.json();
        setAddons((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a))
        );
        setEditAddon(null);
      }
    } catch {
      setEError("Error de red al guardar addon.");
    } finally {
      setSaving(false);
    }
  }

  /* Si hay un addon con panel de precios abierto, mostramos ese panel en su lugar */
  if (priceAddon) {
    return (
      <PriceRulesPanel
        targetId={priceAddon.id}
        targetType="addon"
        species={priceAddon.species}
        title={`Precios — Addon: ${priceAddon.name}`}
        onClose={() => setPriceAddon(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">
            Addons — {product.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            Especie: {product.species === "dog" ? "Perro" : "Gato"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={openCreate}>
            + Nuevo addon
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            ✕ Cerrar
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando addons…</p>
      ) : addons.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin addons.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Nombre</th>
                <th className="px-3 py-2 text-left font-medium">Razas</th>
                <th className="px-3 py-2 text-left font-medium">Estado</th>
                <th className="px-3 py-2 text-left font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {addons.map((addon) => (
                <tr key={addon.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{addon.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {addon.allowed_breeds === null
                      ? "Todas"
                      : addon.allowed_breeds.join(", ")}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={addon.is_active ? "default" : "secondary"}
                    >
                      {addon.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(addon)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant={addon.is_active ? "destructive" : "secondary"}
                        disabled={togglingId === addon.id}
                        onClick={() => handleToggle(addon)}
                      >
                        {togglingId === addon.id
                          ? "..."
                          : addon.is_active
                          ? "Desactivar"
                          : "Activar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPriceAddon(addon)}
                      >
                        Precios
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create addon dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo addon</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                placeholder="Ej: Corte de uñas"
              />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input
                value={cDescription}
                onChange={(e) => setCDescription(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-1">
              <Label>Razas permitidas</Label>
              <BreedSelector
                species={product.species}
                catalog={catalogItems}
                catalogLoading={catalogLoading}
                value={cBreeds}
                onChange={setCBreeds}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="ca-active"
                type="checkbox"
                checked={cActive}
                onChange={(e) => setCActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="ca-active">Activo</Label>
            </div>
            {cError && <p className="text-sm text-destructive">{cError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit addon dialog */}
      <Dialog
        open={!!editAddon}
        onOpenChange={(open) => {
          if (!open) setEditAddon(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar addon</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={eName} onChange={(e) => setEName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input value={eDescription} onChange={(e) => setEDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Razas permitidas</Label>
              <BreedSelector
                species={product.species}
                catalog={catalogItems}
                catalogLoading={catalogLoading}
                value={eBreeds}
                onChange={setEBreeds}
              />
            </div>
            {eError && <p className="text-sm text-destructive">{eError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditAddon(null)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════ */

export default function CategoryProductsPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.categoryId as string;

  const [categoryName, setCategoryName] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  /* ── Breeds catalog cache: Map<species, items[]> ── */
  const [breedsCatalog, setBreedsCatalog] = useState<Map<string, BreedCatalogItem[]>>(
    new Map()
  );
  const [breedsLoading, setBreedsLoading] = useState(false);

  function setBreedsCache(species: Species, items: BreedCatalogItem[]) {
    setBreedsCatalog((prev) => new Map(prev).set(species, items));
  }

  async function ensureBreeds(species: Species) {
    if (breedsCatalog.has(species)) return;
    setBreedsLoading(true);
    try {
      const res = await apiFetch(`/admin/breeds?species=${species}`);
      if (res.ok) {
        const data: BreedCatalogItem[] = await res.json();
        setBreedsCache(species, data);
      }
    } catch { /* ignore */ } finally {
      setBreedsLoading(false);
    }
  }

  /* ── Panel state: which product's addons / prices is open ── */
  const [addonsProduct, setAddonsProduct] = useState<Product | null>(null);
  const [pricesProduct, setPricesProduct] = useState<Product | null>(null);

  /* ── Create modal ── */
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createSpecies, setCreateSpecies] = useState<Species>("dog");
  const [createBreeds, setCreateBreeds] = useState<string[] | null>(null);
  const [createActive, setCreateActive] = useState(true);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  /* ── Edit modal ── */
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBreeds, setEditBreeds] = useState<string[] | null>(null);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  /* ─── Load data ─────────────────────────────────────────── */

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setGlobalError("");
      try {
        const [catRes, prodRes] = await Promise.all([
          apiFetch("/admin/store/categories"),
          apiFetch(`/admin/store/products?category_id=${categoryId}`),
        ]);

        if (catRes.ok) {
          const cats: Category[] = await catRes.json();
          const found = cats.find((c) => c.id === categoryId);
          setCategoryName(found?.name ?? categoryId);
        }

        if (!prodRes.ok) {
          const msg = await parseApiError(prodRes);
          setGlobalError(msg);
        } else {
          const data: Product[] = await prodRes.json();
          setProducts(data);
        }
      } catch {
        setGlobalError("Error de red al cargar productos.");
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [categoryId]);

  /* ─── Toggle product ─────────────────────────────────────── */

  async function handleToggle(product: Product) {
    setTogglingId(product.id);
    try {
      const res = await apiFetch(`/admin/store/products/${product.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !product.is_active }),
      });
      if (!res.ok) {
        const msg = await parseApiError(res);
        setGlobalError(msg);
      } else {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, is_active: !p.is_active } : p
          )
        );
      }
    } catch {
      setGlobalError("Error de red al cambiar estado.");
    } finally {
      setTogglingId(null);
    }
  }

  /* ─── Create product ─────────────────────────────────────── */

  function openCreate() {
    setCreateName("");
    setCreateDescription("");
    setCreateSpecies("dog");
    setCreateBreeds(null);
    setCreateActive(true);
    setCreateError("");
    ensureBreeds("dog");
    setShowCreate(true);
  }

  async function handleCreate() {
    if (!createName.trim()) {
      setCreateError("El nombre es requerido.");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const payload = {
        category_id: categoryId,
        name: createName.trim(),
        description: createDescription.trim() ? createDescription.trim() : null,
        species: createSpecies,
        allowed_breeds: createBreeds,
        is_active: createActive,
      };
      const res = await apiFetch("/admin/store/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await parseApiError(res);
        setCreateError(msg);
      } else {
        const created: Product = await res.json();
        setProducts((prev) => [...prev, created]);
        setShowCreate(false);
      }
    } catch {
      setCreateError("Error de red al crear producto.");
    } finally {
      setCreating(false);
    }
  }

  /* ─── Edit product ───────────────────────────────────────── */

  function openEdit(product: Product) {
    setEditProduct(product);
    setEditName(product.name);
    setEditDescription(product.description ?? "");
    setEditBreeds(product.allowed_breeds);
    setEditError("");
    ensureBreeds(product.species);
  }

  async function handleSaveEdit() {
    if (!editProduct) return;
    if (!editName.trim()) {
      setEditError("El nombre es requerido.");
      return;
    }
    setSaving(true);
    setEditError("");
    try {
      const payload: Record<string, unknown> = {
        name: editName.trim(),
        description: editDescription.trim() ? editDescription.trim() : null,
        allowed_breeds: editBreeds,
      };
      const res = await apiFetch(`/admin/store/products/${editProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await parseApiError(res);
        setEditError(msg);
      } else {
        const updated: Product = await res.json();
        setProducts((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        setEditProduct(null);
      }
    } catch {
      setEditError("Error de red al guardar cambios.");
    } finally {
      setSaving(false);
    }
  }

  /* ─── Render ─────────────────────────────────────────────── */

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/dashboard/store")}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Volver a categorías
          </button>
          <h1 className="text-2xl font-bold">
            Store — Productos
            {categoryName && (
              <span className="text-muted-foreground font-normal text-lg ml-2">
                / {categoryName}
              </span>
            )}
          </h1>
        </div>
        <Button onClick={openCreate}>+ Nuevo producto</Button>
      </div>

      {globalError && (
        <p className="text-sm text-destructive">{globalError}</p>
      )}

      {/* ── Addons panel (inline) ── */}
      {addonsProduct && (
        <div className="rounded-md border p-4 bg-muted/20">
          <AddonsPanel
            product={addonsProduct}
            breedsCatalog={breedsCatalog}
            setBreedsCache={setBreedsCache}
            onClose={() => setAddonsProduct(null)}
          />
        </div>
      )}

      {/* ── Price rules panel for product (inline) ── */}
      {pricesProduct && (
        <div className="rounded-md border p-4 bg-muted/20">
          <PriceRulesPanel
            targetId={pricesProduct.id}
            targetType="product"
            species={pricesProduct.species}
            title={`Precios — Producto: ${pricesProduct.name}`}
            onClose={() => setPricesProduct(null)}
          />
        </div>
      )}

      {/* Products Table */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando productos…</p>
      ) : products.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No hay productos en esta categoría.
        </p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Especie</th>
                <th className="px-4 py-3 text-left font-medium">Razas</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-left font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 capitalize">{product.species}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {product.allowed_breeds === null
                      ? "Todas"
                      : product.allowed_breeds.join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(product)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant={product.is_active ? "destructive" : "secondary"}
                        disabled={togglingId === product.id}
                        onClick={() => handleToggle(product)}
                      >
                        {togglingId === product.id
                          ? "..."
                          : product.is_active
                          ? "Desactivar"
                          : "Activar"}
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          addonsProduct?.id === product.id
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          setAddonsProduct(
                            addonsProduct?.id === product.id ? null : product
                          )
                        }
                      >
                        Addons
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          pricesProduct?.id === product.id
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          setPricesProduct(
                            pricesProduct?.id === product.id ? null : product
                          )
                        }
                      >
                        Precios
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create product Dialog ───────────────────────────── */}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="create-name">Nombre</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ej: Clásico"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-description">Descripción</Label>
              <Input
                id="create-description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-species">Especie</Label>
              <Select
                value={createSpecies}
                onValueChange={(v) => {
                  const s = v as "dog" | "cat";
                  setCreateSpecies(s);
                  setCreateBreeds(null);
                  ensureBreeds(s);
                }}
              >
                <SelectTrigger id="create-species">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dog">Perro</SelectItem>
                  <SelectItem value="cat">Gato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Razas permitidas</Label>
              <BreedSelector
                species={createSpecies}
                catalog={breedsCatalog.get(createSpecies) ?? []}
                catalogLoading={breedsLoading}
                value={createBreeds}
                onChange={setCreateBreeds}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="create-active"
                type="checkbox"
                checked={createActive}
                onChange={(e) => setCreateActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="create-active">Activo</Label>
            </div>

            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editProduct}
        onOpenChange={(open) => {
          if (!open) setEditProduct(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-description">Descripción</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            {editProduct && (
              <div className="space-y-1">
                <Label>Especie</Label>
                <p className="text-sm text-muted-foreground capitalize px-1">
                  {editProduct.species === "dog" ? "Perro" : "Gato"}{" "}
                  <span className="text-xs">(no editable)</span>
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label>Razas permitidas</Label>
              {editProduct && (
                <BreedSelector
                  species={editProduct.species}
                  catalog={breedsCatalog.get(editProduct.species) ?? []}
                  catalogLoading={breedsLoading}
                  value={editBreeds}
                  onChange={setEditBreeds}
                />
              )}
            </div>

            {editError && (
              <p className="text-sm text-destructive">{editError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditProduct(null)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
