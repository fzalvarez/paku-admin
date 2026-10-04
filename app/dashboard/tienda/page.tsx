"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type Species = "dog" | "cat" | null;

type Category = {
  id: string;
  name: string;
  slug: string;
  species: Species;
  is_active: boolean;
};

const speciesLabel = (s: Species) => {
  if (s === "dog") return "Perro";
  if (s === "cat") return "Gato";
  return "Ambos";
};

// ─── Create form defaults ────────────────────────────────────────────────────
const emptyCreateForm = {
  name: "",
  slug: "",
  species: "none" as "dog" | "cat" | "none",
  is_active: true,
};

// ─── Edit form defaults ──────────────────────────────────────────────────────
const emptyEditForm = {
  name: "",
  species: "none" as "dog" | "cat" | "none",
};

export default function StorePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Create modal ────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyCreateForm });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Edit modal ──────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyEditForm });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ── Toggle ──────────────────────────────────────────────────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/admin/store/categories");
      if (!res.ok) { setError(await parseApiError(res)); setCategories([]); return; }
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);

  // ── Create ──────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setCreateForm({ ...emptyCreateForm });
    setCreateError(null);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setCreateError(null);
    if (!createForm.name.trim()) { setCreateError("El nombre es requerido"); return; }
    if (!createForm.slug.trim()) { setCreateError("El identificador es requerido"); return; }

    setCreateSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: createForm.name.trim(),
        slug: createForm.slug.trim(),
        species: createForm.species === "none" ? null : createForm.species,
        is_active: createForm.is_active,
      };
      const res = await apiFetch("/admin/store/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setCreateError(await parseApiError(res)); return; }
      setCreateOpen(false);
      await loadCategories();
    } catch {
      setCreateError("Error de conexión");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setEditForm({
      name: cat.name,
      species: cat.species ?? "none",
    });
    setEditError(null);
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    setEditError(null);
    if (!editForm.name.trim()) { setEditError("El nombre es requerido"); return; }

    setEditSubmitting(true);
    try {
      const body: Record<string, unknown> = {};
      if (editForm.name.trim() !== editTarget.name) body.name = editForm.name.trim();
      const newSpecies = editForm.species === "none" ? null : editForm.species;
      if (newSpecies !== editTarget.species) body.species = newSpecies;

      if (Object.keys(body).length === 0) { setEditOpen(false); return; }

      const res = await apiFetch(`/admin/store/categories/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setEditError(await parseApiError(res)); return; }
      setEditOpen(false);
      await loadCategories();
    } catch {
      setEditError("Error de conexión");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Toggle ──────────────────────────────────────────────────────────────────
  const handleToggle = async (cat: Category) => {
    setTogglingId(cat.id);
    setToggleError(null);
    try {
      const res = await apiFetch(`/admin/store/categories/${cat.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !cat.is_active }),
      });
      if (!res.ok) { setToggleError(await parseApiError(res)); return; }
      // optimistic update
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: !c.is_active } : c))
      );
    } catch {
      setToggleError("Error de conexión");
    } finally {
      setTogglingId(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tienda — Categorías"
        action={<Button onClick={openCreate}>Nueva categoría</Button>}
        className="mb-0"
      />

      {/* Banners */}
      {loading && <p className="text-muted-foreground text-sm">Cargando categorías...</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {toggleError && <p className="text-destructive text-sm">{toggleError}</p>}
      {!loading && !error && categories.length === 0 && (
        <p className="text-muted-foreground text-sm">No hay categorías</p>
      )}

      {/* Table */}
      {!loading && categories.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Especie</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium text-foreground">{cat.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{cat.slug}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{speciesLabel(cat.species)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.is_active ? "default" : "secondary"}>
                        {cat.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(cat)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant={cat.is_active ? "destructive" : "secondary"}
                          disabled={togglingId === cat.id}
                          onClick={() => handleToggle(cat)}
                        >
                          {togglingId === cat.id
                            ? "..."
                            : cat.is_active
                            ? "Desactivar"
                            : "Activar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => router.push(`/dashboard/tienda/${cat.id}`)}
                        >
                          Ver productos
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

      {/* ── Create Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="c-name">Nombre <span className="text-destructive">*</span></Label>
              <Input
                id="c-name"
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="c-slug">Identificador <span className="text-destructive">*</span></Label>
              <Input
                id="c-slug"
                value={createForm.slug}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Especie</Label>
              <Select
                value={createForm.species}
                onValueChange={(v) =>
                  setCreateForm((p) => ({ ...p, species: v as typeof createForm.species }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Especie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ambos (sin filtro)</SelectItem>
                  <SelectItem value="dog">Perro</SelectItem>
                  <SelectItem value="cat">Gato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="c-active"
                type="checkbox"
                className="h-4 w-4"
                checked={createForm.is_active}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, is_active: e.target.checked }))
                }
              />
              <Label htmlFor="c-active">Activo al crear</Label>
            </div>

            {createError && <p className="text-destructive text-sm">{createError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>
              Cancelar
            </Button>
            <Button onClick={submitCreate} disabled={createSubmitting}>
              {createSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editTarget && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Identificador (solo lectura)</Label>
                <p className="font-mono text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                  {editTarget.slug}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="e-name">Nombre <span className="text-destructive">*</span></Label>
              <Input
                id="e-name"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Especie</Label>
              <Select
                value={editForm.species}
                onValueChange={(v) =>
                  setEditForm((p) => ({ ...p, species: v as typeof editForm.species }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Especie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ambos (sin filtro)</SelectItem>
                  <SelectItem value="dog">Perro</SelectItem>
                  <SelectItem value="cat">Gato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editError && <p className="text-destructive text-sm">{editError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSubmitting}>
              Cancelar
            </Button>
            <Button onClick={submitEdit} disabled={editSubmitting}>
              {editSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
