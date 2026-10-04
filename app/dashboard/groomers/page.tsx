"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";
import { PERSON_SEX_LABELS, label } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type Groomer = {
  id: string;
  email: string;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  sex?: string | null;
  birth_date?: string | null;
  is_active: boolean;
  created_at?: string | null;
  role: string;
};

const emptyForm = {
  email: "",
  password: "",
  phone: "",
  first_name: "",
  last_name: "",
  sex: "male" as "male" | "female",
  birth_date: "",
  dni: "",
  profile_photo_url: "",
};

const fmtDate = (s?: string | null) => {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString("es");
  } catch {
    return s;
  }
};

export default function GroomersPage() {
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadGroomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/admin/users?role=groomer");
      if (!res.ok) {
        setError(await parseApiError(res));
        setGroomers([]);
        return;
      }
      const data = await res.json();
      setGroomers(Array.isArray(data) ? data : []);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroomers();
  }, []);

  const openCreate = () => {
    setForm({ ...emptyForm });
    setCreateError(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateError(null);
  };

  const submitCreate = async () => {
    setCreateError(null);

    if (!form.email.trim()) { setCreateError("El email es requerido"); return; }
    if (!form.password.trim()) { setCreateError("La contraseña es requerida"); return; }
    if (!form.sex) { setCreateError("El sexo es requerido"); return; }
    if (!form.birth_date) { setCreateError("La fecha de nacimiento es requerida"); return; }

    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        email: form.email.trim(),
        password: form.password.trim(),
        phone: form.phone.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        sex: form.sex,
        birth_date: form.birth_date,
        role: "groomer",
      };
      if (form.dni.trim()) body.dni = form.dni.trim();
      if (form.profile_photo_url.trim()) body.profile_photo_url = form.profile_photo_url.trim();

      const res = await apiFetch("/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setCreateError(await parseApiError(res));
        setSubmitting(false);
        return;
      }

      closeCreate();
      await loadGroomers();
    } catch {
      setCreateError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field: keyof typeof emptyForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Groomers" action={<Button onClick={openCreate}>Nuevo groomer</Button>} />

      {loading && <p className="mb-2 text-muted-foreground">Cargando groomers...</p>}
      {error && <p className="mb-2 text-destructive">{error}</p>}
      {!loading && !error && groomers.length === 0 && (
        <p className="mb-2 text-muted-foreground">No hay groomers registrados</p>
      )}

      {!loading && !error && groomers.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Nacimiento</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groomers.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      {[g.first_name, g.last_name].filter(Boolean).join(" ") || "-"}
                    </TableCell>
                    <TableCell>{g.email}</TableCell>
                    <TableCell>{g.phone || "-"}</TableCell>
                    <TableCell>{label(PERSON_SEX_LABELS, g.sex)}</TableCell>
                    <TableCell>{fmtDate(g.birth_date)}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          g.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {g.is_active ? "Sí" : "No"}
                      </span>
                    </TableCell>
                    <TableCell>{fmtDate(g.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={(v) => !v && closeCreate()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo groomer</DialogTitle>
          </DialogHeader>
          <div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-foreground">
                  Email <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-foreground">
                  Contraseña <span className="text-destructive">*</span>
                </label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-foreground">Nombre</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-foreground">Apellido</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-foreground">Teléfono</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-foreground">
                  Sexo <span className="text-destructive">*</span>
                </label>
                <Select value={form.sex} onValueChange={(v) => set("sex", v)}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERSON_SEX_LABELS).map(([value, text]) => (
                      <SelectItem key={value} value={value}>{text}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm text-foreground">
                  Fecha de nacimiento <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                  value={form.birth_date}
                  onChange={(e) => set("birth_date", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-foreground">DNI (opcional)</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                  value={form.dni}
                  onChange={(e) => set("dni", e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-foreground">URL de la foto (opcional)</label>
                <input
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                  value={form.profile_photo_url}
                  onChange={(e) => set("profile_photo_url", e.target.value)}
                />
              </div>
            </div>

            {createError && (
              <p className="mt-3 text-sm text-destructive">{createError}</p>
            )}

            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={closeCreate} disabled={submitting}>Cancelar</Button>
              <Button onClick={submitCreate} disabled={submitting}>{submitting ? "Guardando..." : "Guardar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
