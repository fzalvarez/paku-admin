"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

type Species = "dog" | "cat";

type Breed = {
  id: string;
  name: string;
  species: Species;
  is_active: boolean;
};

const parseApiError = async (res: Response): Promise<string> => {
  try {
    const body = await res.json();
    if (body?.detail) {
      if (Array.isArray(body.detail) && body.detail.length > 0) {
        return body.detail[0].msg || String(body.detail[0]);
      }
      return String(body.detail);
    }
    if (body?.message) return String(body.message);
  } catch (_) {}
  return `Error ${res.status}`;
};

export default function BreedsPage() {
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filter
  const [filterSpecies, setFilterSpecies] = useState<string>("all");
  const [draftSpecies, setDraftSpecies] = useState<string>("all");

  // create form
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ id: "", name: "", species: "dog" as Species });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // edit form (PATCH name only)
  const [editBreed, setEditBreed] = useState<Breed | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // toggle
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const buildPath = (species: string) => {
    if (species !== "all") return `/admin/breeds?species=${encodeURIComponent(species)}`;
    return "/admin/breeds";
  };

  const loadBreeds = async (species: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(buildPath(species));
      if (!res.ok) {
        setError(await parseApiError(res));
        setBreeds([]);
        return;
      }
      const data = await res.json();
      setBreeds(Array.isArray(data) ? data : []);
    } catch (_) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBreeds(filterSpecies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => {
    setFilterSpecies(draftSpecies);
    loadBreeds(draftSpecies);
  };

  const handleClear = () => {
    setDraftSpecies("all");
    setFilterSpecies("all");
    loadBreeds("all");
  };

  // ── Toggle ──────────────────────────────────────────────────────────────────
  const handleToggle = async (breed: Breed) => {
    setTogglingId(breed.id);
    setToggleError(null);
    try {
      const res = await apiFetch(`/admin/breeds/${breed.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !breed.is_active }),
      });
      if (!res.ok) {
        setToggleError(await parseApiError(res));
        setTogglingId(null);
        return;
      }
      // optimistic local update
      setBreeds((prev) =>
        prev.map((b) => (b.id === breed.id ? { ...b, is_active: !b.is_active } : b))
      );
    } catch (_) {
      setToggleError("Error de conexión");
    } finally {
      setTogglingId(null);
    }
  };

  // ── Create ───────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setCreateForm({ id: "", name: "", species: "dog" });
    setCreateError(null);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setCreateError(null);
    if (!createForm.id.trim()) { setCreateError("El ID (slug) es requerido"); return; }
    if (!createForm.name.trim()) { setCreateError("El nombre es requerido"); return; }
    setCreateSubmitting(true);
    try {
      const normalizedId = createForm.id.trim().toLowerCase().replace(/\s+/g, "_");
      const res = await apiFetch("/admin/breeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: normalizedId,
          name: createForm.name.trim(),
          species: createForm.species,
        }),
      });
      if (!res.ok) {
        setCreateError(await parseApiError(res));
        setCreateSubmitting(false);
        return;
      }
      setCreateOpen(false);
      await loadBreeds(filterSpecies);
    } catch (_) {
      setCreateError("Error de conexión");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ── Edit (PATCH name) ────────────────────────────────────────────────────────
  const openEdit = (breed: Breed) => {
    setEditBreed(breed);
    setEditName(breed.name);
    setEditError(null);
  };

  const closeEdit = () => {
    setEditBreed(null);
    setEditName("");
    setEditError(null);
  };

  const submitEdit = async () => {
    if (!editBreed) return;
    setEditError(null);
    if (!editName.trim()) { setEditError("El nombre es requerido"); return; }
    setEditSubmitting(true);
    try {
      const res = await apiFetch(`/admin/breeds/${editBreed.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) {
        setEditError(await parseApiError(res));
        setEditSubmitting(false);
        return;
      }
      closeEdit();
      await loadBreeds(filterSpecies);
    } catch (_) {
      setEditError("Error de conexión");
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Razas</h1>
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded"
          onClick={openCreate}
        >
          Nueva raza
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Especie</label>
          <select
            className="px-2 py-2 border border-gray-300 rounded text-gray-900 bg-white"
            value={draftSpecies}
            onChange={(e) => setDraftSpecies(e.target.value)}
          >
            <option value="all">Todas</option>
            <option value="dog">dog</option>
            <option value="cat">cat</option>
          </select>
        </div>
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          onClick={handleApply}
          disabled={loading}
        >
          Aplicar
        </button>
        <button
          className="px-3 py-2 bg-gray-300 text-gray-900 rounded border disabled:opacity-50"
          onClick={handleClear}
          disabled={loading}
        >
          Limpiar
        </button>
      </div>

      {/* State messages */}
      {loading && <p className="text-gray-700 mb-2">Cargando razas...</p>}
      {error && <p className="text-red-700 mb-2">{error}</p>}
      {toggleError && <p className="text-red-700 mb-2">{toggleError}</p>}
      {!loading && !error && breeds.length === 0 && (
        <p className="text-gray-700 mb-2">No hay razas</p>
      )}

      {/* Table */}
      {!loading && !error && breeds.length > 0 && (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded">
          <table className="w-full table-auto">
            <thead className="bg-gray-100 text-left text-sm text-gray-700">
              <tr>
                <th className="px-4 py-3 border-b">ID (slug)</th>
                <th className="px-4 py-3 border-b">Nombre</th>
                <th className="px-4 py-3 border-b">Especie</th>
                <th className="px-4 py-3 border-b">Activo</th>
                <th className="px-4 py-3 border-b">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-800">
              {breeds.map((b, i) => (
                <tr key={b.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3 border-b font-mono text-xs">{b.id}</td>
                  <td className="px-4 py-3 border-b">{b.name}</td>
                  <td className="px-4 py-3 border-b">{b.species}</td>
                  <td className="px-4 py-3 border-b">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        b.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {b.is_active ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b">
                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white text-xs disabled:opacity-50"
                        onClick={() => openEdit(b)}
                      >
                        Editar
                      </button>
                      <button
                        className={`px-2 py-1 border rounded text-xs disabled:opacity-50 ${
                          b.is_active
                            ? "border-red-300 text-red-800 bg-red-50"
                            : "border-green-300 text-green-800 bg-green-50"
                        }`}
                        onClick={() => handleToggle(b)}
                        disabled={togglingId === b.id}
                      >
                        {togglingId === b.id
                          ? "..."
                          : b.is_active
                          ? "Desactivar"
                          : "Activar"}
                      </button>
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
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded shadow-lg p-6 z-50">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nueva raza</h2>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm text-gray-900">ID (slug)</label>
                <input
                  className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900"
                  placeholder="ej: husky, dog_mixed"
                  value={createForm.id}
                  onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-900">Nombre</label>
                <input
                  className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-900">Especie</label>
                <select
                  className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900 bg-white"
                  value={createForm.species}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, species: e.target.value as Species })
                  }
                >
                  <option value="dog">dog</option>
                  <option value="cat">cat</option>
                </select>
              </div>
            </div>

            {createError && <p className="text-red-700 mt-2 text-sm">{createError}</p>}

            <div className="mt-4 flex gap-2">
              <button
                className="px-3 py-2 bg-gray-300 text-gray-900 rounded border disabled:opacity-50"
                onClick={() => setCreateOpen(false)}
                disabled={createSubmitting}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                onClick={submitCreate}
                disabled={createSubmitting}
              >
                {createSubmitting ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editBreed && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
          <div className="relative bg-white w-full max-w-sm rounded shadow-lg p-6 z-50">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Editar raza</h2>
            <p className="text-xs text-gray-500 font-mono mb-4">{editBreed.id}</p>

            <div>
              <label className="block text-sm text-gray-900">Nombre</label>
              <input
                className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            {editError && <p className="text-red-700 mt-2 text-sm">{editError}</p>}

            <div className="mt-4 flex gap-2">
              <button
                className="px-3 py-2 bg-gray-300 text-gray-900 rounded border disabled:opacity-50"
                onClick={closeEdit}
                disabled={editSubmitting}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                onClick={submitEdit}
                disabled={editSubmitting}
              >
                {editSubmitting ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
