"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

type Service = {
  id: string;
  name: string;
  type: "base" | "addon";
  species: "dog" | "cat";
  allowed_breeds: string[] | null;
  requires: string[] | null;
  is_active: boolean;
};

type PriceRule = {
  id: string;
  service_id: string;
  breed_category: string;
  weight_min: number;
  weight_max: number | null;
  price: number;
  currency: string;
  is_active: boolean;
};

type BreedCatalogItem = {
  id: string;
  name: string;
  species: "dog" | "cat";
  is_active: boolean;
};

/* ─── BreedSelector ──────────────────────────────────────── */

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
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={allSelected || (value && value.length === 0) ? "text-gray-500" : ""}>
          {summary}
        </span>
        <span className="ml-2 text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded shadow-md max-h-60 overflow-y-auto p-1">
          {catalogLoading ? (
            <p className="px-2 py-2 text-xs text-gray-500">Cargando razas…</p>
          ) : (
            <>
              <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer text-sm text-gray-900">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="font-medium">Todas las razas</span>
              </label>
              <div className="my-1 border-t border-gray-200" />
              {activeBreeds.map((b) => (
                <label
                  key={b.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-900 cursor-pointer ${
                    allSelected ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100"
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
              {orphanIds.map((id) => (
                <label
                  key={id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked
                    onChange={(e) => toggleBreed(id, e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-gray-500">(inactiva) {id}</span>
                </label>
              ))}
              {activeBreeds.length === 0 && orphanIds.length === 0 && (
                <p className="px-2 py-2 text-xs text-gray-500">
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

export default function ServiciosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"create" | "edit">("create");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // form state
  const [formId, setFormId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"base" | "addon">("base");
  const [species, setSpecies] = useState<"dog" | "cat">("dog");
  const [allowedBreedsSelected, setAllowedBreedsSelected] = useState<string[] | null>(null);
  const [requiresSelected, setRequiresSelected] = useState<string[]>([]);
  const [requiresText, setRequiresText] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // breeds catalog cache
  const [breedsCatalog, setBreedsCatalog] = useState<Map<string, BreedCatalogItem[]>>(new Map());
  const [breedsLoading, setBreedsLoading] = useState(false);

  async function ensureBreeds(sp: "dog" | "cat") {
    if (breedsCatalog.has(sp)) return;
    setBreedsLoading(true);
    try {
      const res = await apiFetch(`/admin/breeds?species=${sp}`);
      if (res.ok) {
        const data: BreedCatalogItem[] = await res.json();
        setBreedsCatalog((prev) => new Map(prev).set(sp, data));
      }
    } catch { /* ignore */ } finally {
      setBreedsLoading(false);
    }
  }
  // price rules state
  const [priceRulesOpen, setPriceRulesOpen] = useState(false);
  const [priceRulesService, setPriceRulesService] = useState<Service | null>(null);
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [priceRulesLoading, setPriceRulesLoading] = useState(false);
  const [priceRulesError, setPriceRulesError] = useState<string | null>(null);

  // price rule form
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [ruleMode, setRuleMode] = useState<"create" | "edit">("create");
  const [ruleId, setRuleId] = useState<string | null>(null);
  const [breedCategory, setBreedCategory] = useState<string>("mestizo");
  const [breedCustom, setBreedCustom] = useState<string>("");
  const [weightMin, setWeightMin] = useState<string>("0");
  const [weightMax, setWeightMax] = useState<string>("");
  const [rulePrice, setRulePrice] = useState<string>("");
  const [ruleCurrency, setRuleCurrency] = useState<string>("PEN");
  const [ruleSubmitting, setRuleSubmitting] = useState(false);
  const [ruleFormError, setRuleFormError] = useState<string | null>(null);

  // UI filter: species (all/dog/cat)
  const [filterSpecies, setFilterSpecies] = useState<"all" | "dog" | "cat">("all");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch("/admin/services");
        if (!res.ok) {
          // try parse error body
          let errText = res.statusText;
          try {
            const body = await res.json();
            if (body && (body.detail || body.message)) {
              errText = body.detail || body.message;
            }
          } catch (_) {
            // ignore
          }

          if (res.status === 401 || res.status === 403) {
            setError(errText);
          } else {
            setError("Error cargando servicios");
          }
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (!mounted) return;
        // assume API returns array of services
        setServices(Array.isArray(data) ? data : []);
      } catch (err) {
        setError("Error de conexión");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // helper to refetch services
  const loadServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/admin/services");
      if (!res.ok) {
        let errText = res.statusText;
        try {
          const body = await res.json();
          if (body && (body.detail || body.message)) errText = body.detail || body.message;
        } catch (_) {}
        setError(errText);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const parseApiError = async (res: Response) => {
    try {
      const body = await res.json();
      if (body) {
        if (body.detail) {
          if (Array.isArray(body.detail) && body.detail.length > 0) {
            const first = body.detail[0];
            return (first && (first.msg || first.message)) || String(first);
          }
          return String(body.detail);
        }
        if (body.message) return String(body.message);
      }
    } catch (_) {}
    return `Error ${res.status}`;
  };

  // Price rules: load for service
  const loadPriceRules = async (serviceId: string) => {
    setPriceRulesLoading(true);
    setPriceRulesError(null);
    try {
      const res = await apiFetch(`/admin/services/${serviceId}/price-rules`);
      if (!res.ok) {
        const msg = await parseApiError(res);
        setPriceRulesError(msg);
        setPriceRules([]);
        setPriceRulesLoading(false);
        return;
      }
      const data = await res.json();
      setPriceRules(Array.isArray(data) ? data : []);
    } catch (err) {
      setPriceRulesError("Error de conexión");
    } finally {
      setPriceRulesLoading(false);
    }
  };

  const openPriceRulesPanel = async (s: Service) => {
    setPriceRulesService(s);
    setPriceRulesOpen(true);
    await loadPriceRules(s.id);
  };

  const openNewRuleForm = () => {
    setRuleMode("create");
    setRuleId(null);
    setBreedCategory("mestizo");
    setBreedCustom("");
    setWeightMin("0");
    setWeightMax("");
    setRulePrice("");
    setRuleCurrency("PEN");
    setRuleFormError(null);
    setRuleFormOpen(true);
  };

  const openEditRuleForm = (r: PriceRule) => {
    setRuleMode("edit");
    setRuleId(r.id);
    setBreedCategory(["mestizo", "official"].includes(r.breed_category) ? r.breed_category : "otros");
    setBreedCustom(["mestizo", "official"].includes(r.breed_category) ? "" : r.breed_category);
    setWeightMin(String(r.weight_min ?? 0));
    setWeightMax(r.weight_max === null ? "" : String(r.weight_max));
    setRulePrice(String(r.price));
    setRuleCurrency(r.currency || "PEN");
    setRuleFormError(null);
    setRuleFormOpen(true);
  };

  const saveRule = async () => {
    setRuleFormError(null);
    // basic validation
    const wmin = Number(weightMin);
    const wmax = weightMax === "" ? null : Number(weightMax);
    const priceNum = Number(rulePrice);
    if (isNaN(wmin) || wmin < 0) {
      setRuleFormError("weight_min debe ser >= 0");
      return;
    }
    if (wmax !== null && (isNaN(wmax) || wmax <= wmin)) {
      setRuleFormError("weight_max debe ser mayor que weight_min o vacío");
      return;
    }
    if (isNaN(priceNum)) {
      setRuleFormError("price debe ser un número");
      return;
    }
    if (!priceRulesService) return;

    const breed_cat = breedCategory === "otros" ? (breedCustom || "otros") : breedCategory;

    const body: any = {
      service_id: priceRulesService.id,
      species: priceRulesService.species,
      breed_category: breed_cat,
      weight_min: wmin,
      weight_max: wmax,
      price: priceNum,
      currency: ruleCurrency || "PEN",
    };

    setRuleSubmitting(true);
    try {
      if (ruleMode === "create") {
        const res = await apiFetch(`/admin/price-rules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const msg = await parseApiError(res);
          setRuleFormError(msg);
          setRuleSubmitting(false);
          return;
        }
      } else {
        if (!ruleId) return;
        const res = await apiFetch(`/admin/price-rules/${ruleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const msg = await parseApiError(res);
          setRuleFormError(msg);
          setRuleSubmitting(false);
          return;
        }
      }

      // refresh rules
      if (priceRulesService) await loadPriceRules(priceRulesService.id);
      setRuleFormOpen(false);
    } catch (err) {
      setRuleFormError("Error de conexión");
    } finally {
      setRuleSubmitting(false);
    }
  };

  // save service (create or edit)
  const saveService = async () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError("El nombre es obligatorio");
      return;
    }

    const allowed_breeds = allowedBreedsSelected;
    const requires = requiresText.trim() === "" ? null : requiresText.split(",").map((r) => r.trim()).filter(Boolean);

    const body: any = {
      name: name.trim(),
      type,
      species,
      allowed_breeds,
      requires,
      is_active: formIsActive,
    };

    setFormSubmitting(true);
    try {
      let res: Response;
      if (panelMode === "create") {
        res = await apiFetch(`/admin/services`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        if (!formId) return;
        res = await apiFetch(`/admin/services/${formId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const msg = await parseApiError(res);
        setFormError(msg);
        setFormSubmitting(false);
        return;
      }

      // success
      await loadServices();
      setPanelOpen(false);
      setFormSubmitting(false);
    } catch (err) {
      setFormError("Error de conexión");
      setFormSubmitting(false);
    }
  };

  // open create panel
  const openCreatePanel = () => {
    setPanelMode("create");
    setFormId(null);
    setName("");
    setType("base");
    setSpecies("dog");
    setAllowedBreedsSelected(null);
    setRequiresSelected([]);
    setRequiresText("");
    setFormIsActive(true);
    setFormError(null);
    ensureBreeds("dog");
    setPanelOpen(true);
  };

  // open edit panel
  const openEditPanel = (s: Service) => {
    setPanelMode("edit");
    setFormId(s.id);
    setName(s.name);
    setType(s.type);
    setSpecies(s.species);
    setAllowedBreedsSelected(s.allowed_breeds);
    setRequiresSelected(s.requires ? [...s.requires] : []);
    setRequiresText(s.requires ? s.requires.join(", ") : "");
    setFormIsActive(Boolean(s.is_active));
    setFormError(null);
    ensureBreeds(s.species);
    setPanelOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Servicios (Commerce)</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => openCreatePanel()} className="bg-blue-600 text-white">Nuevo servicio</Button>
        </div>
      </div>

      {/* Filters: species */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-gray-700">Especie:</label>
        <Select value={filterSpecies} onValueChange={(v) => setFilterSpecies(v as any)}>
          <SelectTrigger className="px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white w-40" size="sm">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="dog">Perros</SelectItem>
            <SelectItem value="cat">Gatos</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-4 flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600" /> Servicio base
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-600" /> Add-on
          </span>
        </div>
      </div>

      {/* Create / Edit service modal */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20"> 
          <div className="absolute inset-0 bg-black/40" onClick={() => setPanelOpen(false)} />
          <div className="relative bg-white w-full max-w-4xl rounded shadow-lg p-6 z-50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{panelMode === 'create' ? 'Crear servicio' : 'Editar servicio'}</h2>
              <button className="px-2 py-1 text-gray-600" onClick={() => setPanelOpen(false)}>Cerrar</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-900">Nombre</label>
                <input className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm text-gray-900">Tipo</label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger className="w-full mt-1" >
                    <SelectValue placeholder="base" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">base</SelectItem>
                    <SelectItem value="addon">addon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm text-gray-900">Especie</label>
                <Select value={species} onValueChange={(v) => {
                  const s = v as "dog" | "cat";
                  setSpecies(s);
                  setAllowedBreedsSelected(null);
                  ensureBreeds(s);
                }}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="dog" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dog">dog</SelectItem>
                    <SelectItem value="cat">cat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm text-gray-900">Activo</label>
                <div className="mt-1">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
                    <span className="text-sm text-gray-700">Activo</span>
                  </label>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-gray-900">Razas permitidas</label>
                <div className="mt-1">
                  <BreedSelector
                    species={species}
                    catalog={breedsCatalog.get(species) ?? []}
                    catalogLoading={breedsLoading}
                    value={allowedBreedsSelected}
                    onChange={setAllowedBreedsSelected}
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-gray-900">Requires (coma-separadas)</label>
                <input className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={requiresText} onChange={(e) => setRequiresText(e.target.value)} placeholder="ej: item1, item2" />
              </div>
            </div>

            {formError && <p className="text-red-700 mt-3">{formError}</p>}

            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPanelOpen(false)} disabled={formSubmitting}>Cancelar</Button>
              <Button onClick={saveService} disabled={formSubmitting}>{formSubmitting ? 'Guardando...' : (panelMode === 'create' ? 'Crear' : 'Guardar')}</Button>
            </div>
          </div>
        </div>
      )}

      {loading && <p className="text-gray-700">Cargando servicios...</p>}
      {error && <p className="text-red-700">{error}</p>}

      {!loading && !error && (
        <div className="space-y-6">
          {/* compute filtered lists */}
          {(() => {
            const filtered = services.filter((s) => filterSpecies === "all" || s.species === filterSpecies);
            const baseServices = filtered.filter((s) => s.type === "base");
            const addonServices = filtered.filter((s) => s.type === "addon");
            return (
              <>
                <div>
                  <h2 className="text-lg font-semibold mb-2">Servicios base</h2>
                  {baseServices.length === 0 ? (
                    <p className="text-gray-700">No hay servicios base para la especie seleccionada.</p>
                  ) : (
                    <div className="overflow-x-auto bg-white border border-gray-200 rounded">
                      <table className="w-full table-auto">
                        <thead className="bg-gray-100 text-left text-sm text-gray-700">
                          <tr>
                            <th className="px-4 py-3 border-b">Nombre</th>
                            <th className="px-4 py-3 border-b w-20">Especie</th>
                            <th className="px-4 py-3 border-b">Razas</th>
                            <th className="px-4 py-3 border-b w-24">Requires</th>
                            <th className="px-4 py-3 border-b w-16">Activo</th>
                            <th className="px-4 py-3 border-b w-72">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm text-gray-800">
                          {baseServices.map((s, idx) => (
                            <tr key={s.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-4 py-3 border-b min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white flex-none">BASE</span>
                                  <span className="truncate">{s.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 border-b">{s.species}</td>
                              <td className="px-4 py-3 border-b">
                                {s.allowed_breeds === null ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-sm text-gray-700 border border-gray-200">Todas</span>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {s.allowed_breeds.map((b) => (
                                      <span key={b} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">{b}</span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 border-b">{s.requires === null ? "-" : `${s.requires.length} item(s)`}</td>
                              <td className="px-4 py-3 border-b">{s.is_active ? "Sí" : "No"}</td>
                              <td className="px-4 py-3 border-b">
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => openPriceRulesPanel(s)}>Reglas de precio</Button>
                                  <Button variant="outline" size="sm" onClick={() => openEditPanel(s)}>Editar</Button>
                                  <Button
                                    size="sm"
                                    variant={s.is_active ? 'destructive' : 'default'}
                                    onClick={async () => {
                                      try {
                                        const res = await apiFetch(`/admin/services/${s.id}/toggle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !s.is_active }) });
                                        if (!res.ok) { const msg = await parseApiError(res); setError(msg); return; }
                                        await loadServices();
                                      } catch (err) { setError("Error de conexión"); }
                                    }}
                                  >
                                    {s.is_active ? "Desactivar" : "Activar"}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-2">Add-ons</h2>
                  {addonServices.length === 0 ? (
                    <p className="text-gray-700">No hay add-ons para la especie seleccionada.</p>
                  ) : (
                    <div className="overflow-x-auto bg-white border border-gray-200 rounded">
                      <table className="w-full table-auto">
                        <thead className="bg-gray-100 text-left text-sm text-gray-700">
                          <tr>
                            <th className="px-4 py-3 border-b">Nombre</th>
                            <th className="px-4 py-3 border-b w-20">Especie</th>
                            <th className="px-4 py-3 border-b">Razas</th>
                            <th className="px-4 py-3 border-b w-24">Requires</th>
                            <th className="px-4 py-3 border-b w-16">Activo</th>
                            <th className="px-4 py-3 border-b w-72">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm text-gray-800">
                          {addonServices.map((s, idx) => (
                            <tr key={s.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-4 py-3 border-b min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-purple-600 text-white flex-none">ADDON</span>
                                  <span className="truncate">{s.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 border-b">{s.species}</td>
                              <td className="px-4 py-3 border-b">
                                {s.allowed_breeds === null ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-sm text-gray-700 border border-gray-200">Todas</span>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {s.allowed_breeds.map((b) => (
                                      <span key={b} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">{b}</span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 border-b">{s.requires === null ? "-" : `${s.requires.length} item(s)`}</td>
                              <td className="px-4 py-3 border-b">{s.is_active ? "Sí" : "No"}</td>
                              <td className="px-4 py-3 border-b">
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => openPriceRulesPanel(s)}>Reglas de precio</Button>
                                  <Button variant="outline" size="sm" onClick={() => openEditPanel(s)}>Editar</Button>
                                  <Button
                                    size="sm"
                                    variant={s.is_active ? 'destructive' : 'default'}
                                    onClick={async () => {
                                      try {
                                        const res = await apiFetch(`/admin/services/${s.id}/toggle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !s.is_active }) });
                                        if (!res.ok) { const msg = await parseApiError(res); setError(msg); return; }
                                        await loadServices();
                                      } catch (err) { setError("Error de conexión"); }
                                    }}
                                  >
                                    {s.is_active ? "Desactivar" : "Activar"}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* actions: create panel open */}
      <div className="mt-4">
        <Button onClick={() => openCreatePanel()} className="bg-blue-600 text-white">Crear servicio</Button>
      </div>

      {/* Panel modal and logic injected earlier via patch - ensure functions exist */}
      {/* Price Rules Panel */}
      {priceRulesOpen && priceRulesService && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPriceRulesOpen(false)} />
          <div className="relative bg-white w-full max-w-4xl rounded shadow-lg p-6 z-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Reglas de precio — {priceRulesService.name}</h2>
                <p className="text-sm text-gray-600">Especie: {priceRulesService.species}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPriceRulesOpen(false)}>Cerrar</Button>
                <Button onClick={openNewRuleForm}>Nueva regla</Button>
              </div>
            </div>

            {priceRulesLoading && <p className="text-gray-700">Cargando reglas...</p>}
            {priceRulesError && <p className="text-red-700">{priceRulesError}</p>}

            {!priceRulesLoading && !priceRulesError && (
              <div className="overflow-x-auto bg-white border border-gray-200 rounded">
                <table className="w-full table-auto">
                  <thead className="bg-gray-100 text-left text-sm text-gray-700">
                    <tr>
                      <th className="px-4 py-3 border-b">breed_category</th>
                      <th className="px-4 py-3 border-b w-28">weight_min</th>
                      <th className="px-4 py-3 border-b w-28">weight_max</th>
                      <th className="px-4 py-3 border-b w-24">price</th>
                      <th className="px-4 py-3 border-b w-24">currency</th>
                      <th className="px-4 py-3 border-b w-20">is_active</th>
                      <th className="px-4 py-3 border-b w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-gray-800">
                    {priceRules.map((r, i) => (
                      <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-3 border-b">{r.breed_category}</td>
                        <td className="px-4 py-3 border-b">{r.weight_min}</td>
                        <td className="px-4 py-3 border-b">{r.weight_max === null ? "∞" : r.weight_max}</td>
                        <td className="px-4 py-3 border-b">{r.price}</td>
                        <td className="px-4 py-3 border-b">{r.currency}</td>
                        <td className="px-4 py-3 border-b">{r.is_active ? "Sí" : "No"}</td>
                        <td className="px-4 py-3 border-b">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditRuleForm(r)}>Editar</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Rule form modal inside PriceRules panel */}
            {ruleFormOpen && (
                <div className="mt-4 p-4 border-t">
                <h3 className="text-md font-semibold text-gray-900 mb-2">{ruleMode === "create" ? "Crear regla" : "Editar regla"}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-900">breed_category</label>
                    <Select value={breedCategory} onValueChange={(v) => setBreedCategory(v)}>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="mestizo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mestizo">mestizo</SelectItem>
                        <SelectItem value="official">official</SelectItem>
                        <SelectItem value="otros">otros</SelectItem>
                      </SelectContent>
                    </Select>
                    {breedCategory === "otros" && (
                      <input className="w-full mt-2 px-2 py-2 border border-gray-300 rounded text-gray-900" placeholder="Ingrese categoría" value={breedCustom} onChange={(e) => setBreedCustom(e.target.value)} />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-900">weight_min</label>
                    <input type="number" min={0} className="w-full mt-1 px-2 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" value={weightMin} onChange={(e) => setWeightMin(e.target.value)} />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-900">weight_max (vacío = sin límite)</label>
                    <input type="number" min={0} className="w-full mt-1 px-2 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" value={weightMax} onChange={(e) => setWeightMax(e.target.value)} />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-900">price</label>
                    <input type="number" className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={rulePrice} onChange={(e) => setRulePrice(e.target.value)} />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-900">currency</label>
                    <input className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={ruleCurrency} onChange={(e) => setRuleCurrency(e.target.value)} />
                  </div>
                </div>

                {ruleFormError && <p className="text-red-700 mt-2">{ruleFormError}</p>}

                <div className="mt-3 flex gap-2">
                  <Button variant="outline" onClick={() => setRuleFormOpen(false)} disabled={ruleSubmitting}>Cancelar</Button>
                  <Button onClick={saveRule} disabled={ruleSubmitting}>{ruleSubmitting ? 'Guardando...' : 'Guardar'}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
