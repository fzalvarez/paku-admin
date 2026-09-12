"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/PageHeader";

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
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Razas" action={<Button onClick={openCreate}>Nueva raza</Button>} />

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Especie</label>
            <Select value={draftSpecies} onValueChange={(v) => setDraftSpecies(v)}>
              <SelectTrigger className="w-40" size="sm">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="dog">dog</SelectItem>
                <SelectItem value="cat">cat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleApply} disabled={loading}>Aplicar</Button>
          <Button variant="outline" onClick={handleClear} disabled={loading}>Limpiar</Button>
        </CardContent>
      </Card>

      {/* State messages */}
      {loading && <p className="mb-2 text-muted-foreground">Cargando razas...</p>}
      {error && <p className="mb-2 text-destructive">{error}</p>}
      {toggleError && <p className="mb-2 text-destructive">{toggleError}</p>}
      {!loading && !error && breeds.length === 0 && (
        <p className="mb-2 text-muted-foreground">No hay razas</p>
      )}

      {/* Table */}
      {!loading && !error && breeds.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">ID (slug)</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-24">Especie</TableHead>
                  <TableHead className="w-20">Activo</TableHead>
                  <TableHead className="w-44">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breeds.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.id}</TableCell>
                    <TableCell>{b.name}</TableCell>
                    <TableCell>{b.species}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          b.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {b.is_active ? "Sí" : "No"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(b)}>Editar</Button>
                        <Button
                          size="sm"
                          variant={b.is_active ? 'destructive' : 'default'}
                          onClick={() => handleToggle(b)}
                          disabled={togglingId === b.id}
                        >
                          {togglingId === b.id ? '...' : b.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative z-50 w-full max-w-3xl rounded-xl bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground mb-4">Nueva raza</h2>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm text-foreground">ID (slug)</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                  placeholder="ej: husky, dog_mixed"
                  value={createForm.id}
                  onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-foreground">Nombre</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-foreground">Especie</label>
                <Select value={createForm.species} onValueChange={(v) => setCreateForm({ ...createForm, species: v as Species })}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="dog" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dog">dog</SelectItem>
                    <SelectItem value="cat">cat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {createError && <p className="mt-2 text-sm text-destructive">{createError}</p>}

            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>Cancelar</Button>
              <Button onClick={submitCreate} disabled={createSubmitting}>{createSubmitting ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editBreed && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
          <div className="relative z-50 w-full max-w-3xl rounded-xl bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground mb-1">Editar raza</h2>
            <p className="mb-4 font-mono text-xs text-muted-foreground">{editBreed.id}</p>

            <div>
              <label className="block text-sm text-foreground">Nombre</label>
              <input
                className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            {editError && <p className="mt-2 text-sm text-destructive">{editError}</p>}

            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={closeEdit} disabled={editSubmitting}>Cancelar</Button>
              <Button onClick={submitEdit} disabled={editSubmitting}>{editSubmitting ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
