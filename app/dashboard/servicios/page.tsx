"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

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

export default function ServiciosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"create" | "edit">("create");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // form state
  const [formId, setFormId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"base" | "addon">("base");
  const [species, setSpecies] = useState<"dog" | "cat">("dog");
  const [allowedBreedsText, setAllowedBreedsText] = useState("");
  const [requiresSelected, setRequiresSelected] = useState<string[]>([]);
  const [requiresText, setRequiresText] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
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

    const allowed_breeds = allowedBreedsText.trim() === "" ? null : allowedBreedsText.split(",").map((b) => b.trim()).filter(Boolean);
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
    setAllowedBreedsText("");
    setRequiresSelected([]);
    setRequiresText("");
    setFormIsActive(true);
    setFormError(null);
    setPanelOpen(true);
  };

  // open edit panel
  const openEditPanel = (s: Service) => {
    setPanelMode("edit");
    setFormId(s.id);
    setName(s.name);
    setType(s.type);
    setSpecies(s.species);
    setAllowedBreedsText(s.allowed_breeds ? s.allowed_breeds.join(", ") : "");
    setRequiresSelected(s.requires ? [...s.requires] : []);
    setRequiresText(s.requires ? s.requires.join(", ") : "");
    setFormIsActive(Boolean(s.is_active));
    setFormError(null);
    setPanelOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Servicios (Commerce)</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenNew((s) => !s)}
            className="px-3 py-2 bg-blue-600 text-white rounded"
          >
            Nuevo servicio
          </button>
        </div>
      </div>

      {/* Filters: species */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-gray-700">Especie:</label>
        <select
          className="px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white"
          value={filterSpecies}
          onChange={(e) => setFilterSpecies(e.target.value as any)}
        >
          <option value="all">Todas</option>
          <option value="dog">Perros</option>
          <option value="cat">Gatos</option>
        </select>

        <div className="ml-4 flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600" /> Servicio base
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-600" /> Add-on
          </span>
        </div>
      </div>

      {openNew && (
        <div className="mb-4 p-4 bg-white border border-gray-200 rounded">
          <p className="text-sm text-gray-700">Panel simple para crear servicio (placeholder).</p>
        </div>
      )}

      {/* Create / Edit service modal */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPanelOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded shadow-lg p-6 z-50">
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
                <select className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option value="base">base</option>
                  <option value="addon">addon</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-900">Especie</label>
                <select className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={species} onChange={(e) => setSpecies(e.target.value as any)}>
                  <option value="dog">dog</option>
                  <option value="cat">cat</option>
                </select>
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
                <label className="block text-sm text-gray-900">Razas permitidas (coma-separadas, vacío = todas)</label>
                <input className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={allowedBreedsText} onChange={(e) => setAllowedBreedsText(e.target.value)} placeholder="ej: pastor alemán, labrador" />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-gray-900">Requires (coma-separadas)</label>
                <input className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={requiresText} onChange={(e) => setRequiresText(e.target.value)} placeholder="ej: item1, item2" />
              </div>
            </div>

            {formError && <p className="text-red-700 mt-3">{formError}</p>}

            <div className="mt-4 flex gap-2 justify-end">
              <button className="px-3 py-2 bg-gray-300 text-gray-900 rounded" onClick={() => setPanelOpen(false)} disabled={formSubmitting}>Cancelar</button>
              <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={saveService} disabled={formSubmitting}>{formSubmitting ? 'Guardando...' : (panelMode === 'create' ? 'Crear' : 'Guardar')}</button>
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
                            <th className="px-4 py-3 border-b w-24">Especie</th>
                            <th className="px-4 py-3 border-b w-1/3">Razas</th>
                            <th className="px-4 py-3 border-b w-32">Requires</th>
                            <th className="px-4 py-3 border-b w-20">Activo</th>
                            <th className="px-4 py-3 border-b w-48">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm text-gray-800">
                          {baseServices.map((s, idx) => (
                            <tr key={s.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-4 py-3 border-b min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white flex-none">BASE</span>
                                  <span className="truncate block" style={{ maxWidth: 'min(40ch, 45%)' }}>{s.name}</span>
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
                                  <button onClick={() => openPriceRulesPanel(s)} className="px-2 py-1 border rounded text-gray-800">Reglas de precio</button>
                                  <button onClick={() => openEditPanel(s)} className="px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white">Editar</button>
                                  <button onClick={async () => {
                                    try {
                                      const res = await apiFetch(`/admin/services/${s.id}/toggle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !s.is_active }) });
                                      if (!res.ok) { const msg = await parseApiError(res); setError(msg); return; }
                                      await loadServices();
                                    } catch (err) { setError("Error de conexión"); }
                                  }} className={`px-2 py-1 rounded text-white ${s.is_active ? "bg-red-600" : "bg-green-600"}`}>
                                    {s.is_active ? "Desactivar" : "Activar"}
                                  </button>
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
                            <th className="px-4 py-3 border-b w-24">Especie</th>
                            <th className="px-4 py-3 border-b w-1/3">Razas</th>
                            <th className="px-4 py-3 border-b w-32">Requires</th>
                            <th className="px-4 py-3 border-b w-20">Activo</th>
                            <th className="px-4 py-3 border-b w-48">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm text-gray-800">
                          {addonServices.map((s, idx) => (
                            <tr key={s.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-4 py-3 border-b min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-purple-600 text-white flex-none">ADDON</span>
                                  <span className="truncate block" style={{ maxWidth: 'min(40ch, 45%)' }}>{s.name}</span>
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
                                  <button onClick={() => openPriceRulesPanel(s)} className="px-2 py-1 border rounded text-gray-800">Reglas de precio</button>
                                  <button onClick={() => openEditPanel(s)} className="px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white">Editar</button>
                                  <button onClick={async () => {
                                    try {
                                      const res = await apiFetch(`/admin/services/${s.id}/toggle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !s.is_active }) });
                                      if (!res.ok) { const msg = await parseApiError(res); setError(msg); return; }
                                      await loadServices();
                                    } catch (err) { setError("Error de conexión"); }
                                  }} className={`px-2 py-1 rounded text-white ${s.is_active ? "bg-red-600" : "bg-green-600"}`}>
                                    {s.is_active ? "Desactivar" : "Activar"}
                                  </button>
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
        <button
          onClick={() => openCreatePanel()}
          className="px-3 py-2 bg-blue-600 text-white rounded"
        >
          Crear servicio
        </button>
      </div>

      {/* Panel modal and logic injected earlier via patch - ensure functions exist */}
      {/* Price Rules Panel */}
      {priceRulesOpen && priceRulesService && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPriceRulesOpen(false)} />
          <div className="relative bg-white w-full max-w-3xl rounded shadow-lg p-6 z-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Reglas de precio — {priceRulesService.name}</h2>
                <p className="text-sm text-gray-600">Especie: {priceRulesService.species}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-2 bg-gray-300 text-gray-900 rounded border border-gray-300" onClick={() => setPriceRulesOpen(false)}>Cerrar</button>
                <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={openNewRuleForm}>Nueva regla</button>
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
                      <th className="px-4 py-3 border-b">weight_min</th>
                      <th className="px-4 py-3 border-b">weight_max</th>
                      <th className="px-4 py-3 border-b">price</th>
                      <th className="px-4 py-3 border-b">currency</th>
                      <th className="px-4 py-3 border-b">is_active</th>
                      <th className="px-4 py-3 border-b">Acciones</th>
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
                            <button className="px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white" onClick={() => openEditRuleForm(r)}>Editar</button>
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
                    <select className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={breedCategory} onChange={(e) => setBreedCategory(e.target.value)}>
                      <option value="mestizo">mestizo</option>
                      <option value="official">official</option>
                      <option value="otros">otros</option>
                    </select>
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
                  <button className="px-3 py-2 bg-gray-300 text-gray-900 rounded border border-gray-300" onClick={() => setRuleFormOpen(false)} disabled={ruleSubmitting}>Cancelar</button>
                  <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={saveRule} disabled={ruleSubmitting}>{ruleSubmitting ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
