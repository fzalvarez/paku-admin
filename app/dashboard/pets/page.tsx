"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";

type Pet = {
  id: string;
  owner_id?: string;
  name: string;
  species: string;
  breed?: string | null;
  sex?: string | null;
  birth_date?: string | null;
  notes?: string | null;
  photo_url?: string | null;
  weight_kg?: number | null;
  created_at?: string;
  updated_at?: string;
};

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);

  // form state (create / edit)
  const emptyForm = {
    name: "",
    species: "dog",
    breed: "",
    sex: "male",
    birth_date: "",
    notes: "",
    photo_url: "",
    weight_kg: "",
    // Grooming optional fields (undefined/empty = no change)
    sterilized: undefined as boolean | undefined,
    size: "" as "" | "small" | "medium" | "large",
    activity_level: "" as "" | "low" | "medium" | "high",
    coat_type: "" as "" | "short" | "medium" | "long",
    skin_sensitivity: undefined as boolean | undefined,
    bath_behavior: "" as "" | "calm" | "fearful" | "anxious",
    tolerates_drying: undefined as boolean | undefined,
    tolerates_nail_clipping: undefined as boolean | undefined,
    vaccines_up_to_date: undefined as boolean | undefined,
    grooming_frequency: "",
    receive_reminders: undefined as boolean | undefined,
    antiparasitic: undefined as boolean | undefined,
    antiparasitic_interval: "" as "" | "monthly" | "trimestral",
    special_shampoo: undefined as boolean | undefined,
  };
  const [form, setForm] = useState<any>(emptyForm);

  useEffect(() => {
    loadPets();
  }, []);

  const parseApiError = async (res: Response) => {
    try {
      const body = await res.json();
      if (body) {
        if (body.detail) {
          if (Array.isArray(body.detail) && body.detail.length > 0) {
            return body.detail[0].msg || String(body.detail[0]);
          }
          return String(body.detail);
        }
        if (body.message) return String(body.message);
      }
    } catch (_) {}
    return `Error ${res.status}`;
  };

  const loadPets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/pets");
      if (!res.ok) {
        const msg = await parseApiError(res);
        setError(msg);
        setPets([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(emptyForm);
    setCreateError(null);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setCreateError(null);
    if (!form.name || !form.name.trim()) {
      setCreateError("El nombre es requerido");
      return;
    }
    setCreateSubmitting(true);
    try {
      const body: any = {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed || null,
        sex: form.sex || null,
        birth_date: form.birth_date || null,
        notes: form.notes || null,
        photo_url: form.photo_url || null,
      };
      if (form.weight_kg !== "") body.weight_kg = Number(form.weight_kg);

      const res = await apiFetch("/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await parseApiError(res);
        setCreateError(msg);
        setCreateSubmitting(false);
        return;
      }
      setCreateOpen(false);
      await loadPets();
    } catch (err) {
      setCreateError("Error de conexión");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openEdit = async (id: string) => {
    setEditError(null);
    setEditLoading(true);
    setEditingPetId(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/pets/${id}`);
      // GET /pets/{id} does not require token per spec
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try {
          const body = await res.json();
          if (body && body.detail) {
            msg = Array.isArray(body.detail) ? (body.detail[0].msg || String(body.detail[0])) : String(body.detail);
          }
        } catch (_) {}
        setEditError(msg);
        setEditLoading(false);
        return;
      }
      const data = await res.json();
      // populate form with allowed PUT fields
      setForm({
        name: data.name || "",
        breed: data.breed || "",
        sex: data.sex || "male",
        birth_date: data.birth_date || "",
        notes: data.notes || "",
        photo_url: data.photo_url || "",
        weight_kg: data.weight_kg == null ? "" : String(data.weight_kg),
        species: data.species || "dog",
        // populate grooming fields if available on Pet
        sterilized: data.sterilized === undefined ? undefined : Boolean(data.sterilized),
        size: data.size || "",
        activity_level: data.activity_level || "",
        coat_type: data.coat_type || "",
        skin_sensitivity: data.skin_sensitivity === undefined ? undefined : Boolean(data.skin_sensitivity),
        bath_behavior: data.bath_behavior || "",
        tolerates_drying: data.tolerates_drying === undefined ? undefined : Boolean(data.tolerates_drying),
        tolerates_nail_clipping: data.tolerates_nail_clipping === undefined ? undefined : Boolean(data.tolerates_nail_clipping),
        vaccines_up_to_date: data.vaccines_up_to_date === undefined ? undefined : Boolean(data.vaccines_up_to_date),
        grooming_frequency: data.grooming_frequency || "",
        receive_reminders: data.receive_reminders === undefined ? undefined : Boolean(data.receive_reminders),
        antiparasitic: data.antiparasitic === undefined ? undefined : Boolean(data.antiparasitic),
        antiparasitic_interval: data.antiparasitic_interval || "",
        special_shampoo: data.special_shampoo === undefined ? undefined : Boolean(data.special_shampoo),
      });
      setEditOpen(true);
    } catch (err) {
      setEditError("Error de conexión");
    } finally {
      setEditLoading(false);
    }
  };

  const submitEdit = async () => {
    if (!editingPetId) return;
    setEditError(null);
    if (!form.name || !form.name.trim()) {
      setEditError("El nombre es requerido");
      return;
    }
    setEditSubmitting(true);
    try {
      const body: any = {
        name: form.name.trim(),
        breed: form.breed || null,
        sex: form.sex || null,
        birth_date: form.birth_date || null,
        notes: form.notes || null,
        photo_url: form.photo_url || null,
      };

      const res = await apiFetch(`/pets/${editingPetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await parseApiError(res);
        setEditError(msg);
        setEditSubmitting(false);
        return;
      }
      setEditOpen(false);
      setEditingPetId(null);
      await loadPets();
    } catch (err) {
      setEditError("Error de conexión");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Grooming & weight history states
  const [groomingSubmitting, setGroomingSubmitting] = useState(false);
  const [groomingError, setGroomingError] = useState<string | null>(null);

  const [weightHistory, setWeightHistory] = useState<any[] | null>(null);
  const [weightHistoryLoading, setWeightHistoryLoading] = useState(false);
  const [weightHistoryError, setWeightHistoryError] = useState<string | null>(null);

  const submitGrooming = async () => {
    if (!editingPetId) return;
    setGroomingError(null);
    // Build body including only present fields (booleans included if defined)
    const body: any = {};

    // weight_kg (number) - allow sending if provided
    if (form.weight_kg !== "") {
      const n = Number(form.weight_kg);
      if (!Number.isNaN(n)) body.weight_kg = n;
    }

    // string/select fields
    const stringFields = [
      "size",
      "activity_level",
      "coat_type",
      "bath_behavior",
      "grooming_frequency",
      "antiparasitic_interval",
    ];
    for (const k of stringFields) {
      if (form[k] !== undefined && form[k] !== null && String(form[k]) !== "") {
        body[k] = form[k];
      }
    }

    // boolean fields
    const boolFields = [
      "sterilized",
      "skin_sensitivity",
      "tolerates_drying",
      "tolerates_nail_clipping",
      "vaccines_up_to_date",
      "receive_reminders",
      "antiparasitic",
      "special_shampoo",
    ];
    for (const k of boolFields) {
      if (form[k] !== undefined && form[k] !== null) {
        body[k] = Boolean(form[k]);
      }
    }

    // nothing to send?
    if (Object.keys(body).length === 0) {
      setGroomingError("No hay campos para guardar");
      return;
    }

    setGroomingSubmitting(true);
    try {
      const res = await apiFetch(`/pets/${editingPetId}/optional`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await parseApiError(res);
        setGroomingError(msg);
        setGroomingSubmitting(false);
        return;
      }
      const updated = await res.json();
      // update form with returned pet
      setForm((prev: any) => ({ ...prev, ...updated, weight_kg: updated.weight_kg == null ? "" : String(updated.weight_kg) }));
      // refresh list so table shows latest
      await loadPets();
    } catch (err) {
      setGroomingError("Error de conexión");
    } finally {
      setGroomingSubmitting(false);
    }
  };

  const loadWeightHistory = async () => {
    if (!editingPetId) return;
    setWeightHistoryLoading(true);
    setWeightHistoryError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/pets/${editingPetId}/weight-history`);
      if (!res.ok) {
        const msg = await parseApiError(res);
        setWeightHistoryError(msg);
        setWeightHistory(null);
        setWeightHistoryLoading(false);
        return;
      }
      const data = await res.json();
      setWeightHistory(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setWeightHistoryError("Error de conexión");
    } finally {
      setWeightHistoryLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Pets</h1>
        <div>
          <Button onClick={openCreate}>Nuevo Pet</Button>
        </div>
      </div>

      {loading && <p className="text-gray-700">Cargando pets...</p>}
      {error && <p className="text-red-700">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '28%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead className="bg-gray-100 text-left text-sm text-gray-700">
              <tr>
                <th className="px-4 py-3 border-b">Nombre</th>
                <th className="px-4 py-3 border-b">Especie</th>
                <th className="px-4 py-3 border-b">Raza</th>
                <th className="px-4 py-3 border-b">Sexo</th>
                <th className="px-4 py-3 border-b">Peso (kg)</th>
                <th className="px-4 py-3 border-b">Updated</th>
                <th className="px-4 py-3 border-b">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-800">
              {pets.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3 border-b">{p.name}</td>
                  <td className="px-4 py-3 border-b">{p.species}</td>
                  <td className="px-4 py-3 border-b">{p.breed || "-"}</td>
                  <td className="px-4 py-3 border-b">{p.sex || "-"}</td>
                  <td className="px-4 py-3 border-b">{p.weight_kg == null ? "-" : p.weight_kg}</td>
                  <td className="px-4 py-3 border-b">{p.updated_at || "-"}</td>
                  <td className="px-4 py-3 border-b">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p.id)}>Ver / Editar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative bg-white w-full max-w-4xl rounded shadow-lg p-6 z-50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Crear mascota</h2>
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cerrar</Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-900">Nombre</label>
                <input className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm text-gray-900">Especie</label>
                <select className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })}>
                  <option value="dog">dog</option>
                  <option value="cat">cat</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-900">Raza</label>
                <input className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm text-gray-900">Sexo</label>
                <select className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                  <option value="male">male</option>
                  <option value="female">female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-900">Birth date</label>
                <input type="date" className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm text-gray-900">Peso (kg)</label>
                <input type="number" className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-gray-900">Notes</label>
                <textarea className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-gray-900">Photo URL</label>
                <input className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
              </div>
            </div>

            {createError && <p className="text-red-700 mt-2">{createError}</p>}

            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>Cancelar</Button>
              <Button onClick={submitCreate} disabled={createSubmitting}>{createSubmitting ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative bg-white w-full max-w-4xl rounded shadow-lg p-6 z-50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Ver / Editar Pet</h2>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cerrar</Button>
            </div>

            {editLoading ? (
              <p className="text-gray-700">Cargando...</p>
            ) : (
              <>
                {editError && <p className="text-red-700">{editError}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-900">Nombre</label>
                    <input className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-900">Raza</label>
                    <input className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-900">Sexo</label>
                    <select className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                      <option value="male">male</option>
                      <option value="female">female</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-900">Birth date</label>
                    <input type="date" className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm text-gray-900">Notes</label>
                    <textarea className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm text-gray-900">Photo URL</label>
                    <input className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
                  </div>
                </div>

                {/* Grooming profile (optional) */}
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-md font-medium text-gray-900 mb-2">Perfil Grooming (opcional)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!form.sterilized} onChange={(e) => setForm({ ...form, sterilized: e.target.checked })} />
                      <label className="text-sm text-gray-900">Sterilized</label>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-900">Size</label>
                      <select className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.size || ""} onChange={(e) => setForm({ ...form, size: e.target.value })}>
                        <option value="">(no cambiar)</option>
                        <option value="small">small</option>
                        <option value="medium">medium</option>
                        <option value="large">large</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-900">Peso (kg)</label>
                      <input type="number" className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-900">Activity level</label>
                      <select className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.activity_level || ""} onChange={(e) => setForm({ ...form, activity_level: e.target.value })}>
                        <option value="">(no cambiar)</option>
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-900">Coat type</label>
                      <select className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.coat_type || ""} onChange={(e) => setForm({ ...form, coat_type: e.target.value })}>
                        <option value="">(no cambiar)</option>
                        <option value="short">short</option>
                        <option value="medium">medium</option>
                        <option value="long">long</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!form.skin_sensitivity} onChange={(e) => setForm({ ...form, skin_sensitivity: e.target.checked })} />
                      <label className="text-sm text-gray-900">Skin sensitivity</label>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-900">Bath behavior</label>
                      <select className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.bath_behavior || ""} onChange={(e) => setForm({ ...form, bath_behavior: e.target.value })}>
                        <option value="">(no cambiar)</option>
                        <option value="calm">calm</option>
                        <option value="fearful">fearful</option>
                        <option value="anxious">anxious</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!form.tolerates_drying} onChange={(e) => setForm({ ...form, tolerates_drying: e.target.checked })} />
                      <label className="text-sm text-gray-900">Tolerates drying</label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!form.tolerates_nail_clipping} onChange={(e) => setForm({ ...form, tolerates_nail_clipping: e.target.checked })} />
                      <label className="text-sm text-gray-900">Tolerates nail clipping</label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!form.vaccines_up_to_date} onChange={(e) => setForm({ ...form, vaccines_up_to_date: e.target.checked })} />
                      <label className="text-sm text-gray-900">Vaccines up to date</label>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-900">Grooming frequency</label>
                      <input className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.grooming_frequency || ""} onChange={(e) => setForm({ ...form, grooming_frequency: e.target.value })} />
                    </div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!form.receive_reminders} onChange={(e) => setForm({ ...form, receive_reminders: e.target.checked })} />
                      <label className="text-sm text-gray-900">Receive reminders</label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!form.antiparasitic} onChange={(e) => setForm({ ...form, antiparasitic: e.target.checked })} />
                      <label className="text-sm text-gray-900">Antiparasitic</label>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-900">Antiparasitic interval</label>
                      <select className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900" value={form.antiparasitic_interval || ""} onChange={(e) => setForm({ ...form, antiparasitic_interval: e.target.value })}>
                        <option value="">(no cambiar)</option>
                        <option value="monthly">monthly</option>
                        <option value="trimestral">trimestral</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!form.special_shampoo} onChange={(e) => setForm({ ...form, special_shampoo: e.target.checked })} />
                      <label className="text-sm text-gray-900">Special shampoo</label>
                    </div>
                  </div>

                  {groomingError && <p className="text-red-700 mt-2">{groomingError}</p>}
                  <div className="mt-3 flex gap-2">
                    <button className="px-3 py-2 bg-gray-300 text-gray-900 rounded border" onClick={() => { /* no-op */ }} disabled={groomingSubmitting}>Cancelar</button>
                    <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={submitGrooming} disabled={groomingSubmitting}>{groomingSubmitting ? 'Guardando...' : 'Guardar Grooming'}</button>
                  </div>
                </div>

                {/* Weight history (read-only) */}
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-md font-medium text-gray-900 mb-2">Historial de peso</h3>
                  <div className="flex gap-2 items-center mb-2">
                    <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={loadWeightHistory} disabled={weightHistoryLoading}>{weightHistoryLoading ? 'Cargando...' : 'Cargar historial'}</button>
                    {weightHistoryError && <span className="text-red-700">{weightHistoryError}</span>}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-auto bg-gray-50 p-2 rounded">
                    {weightHistory == null && <div className="text-sm text-gray-600">No cargado</div>}
                    {weightHistory && weightHistory.length === 0 && <div className="text-sm text-gray-600">Sin historial</div>}
                    {weightHistory && weightHistory.map((w, idx) => (
                      <pre key={idx} className="text-xs bg-white p-2 rounded border">{JSON.stringify(w, null, 2)}</pre>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button className="px-3 py-2 bg-gray-300 text-gray-900 rounded border" onClick={() => setEditOpen(false)} disabled={editSubmitting}>Cancelar</button>
                  <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={submitEdit} disabled={editSubmitting}>{editSubmitting ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
