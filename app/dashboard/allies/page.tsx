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

type Ally = {
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

const parseApiError = async (res: Response): Promise<string> => {
  try {
    const body = await res.json();
    if (body?.detail) {
      if (body.detail === "email_already_registered") return "El email ya está registrado";
      if (Array.isArray(body.detail) && body.detail.length > 0) {
        return body.detail[0].msg || String(body.detail[0]);
      }
      return String(body.detail);
    }
    if (body?.message) return String(body.message);
  } catch (_) {}
  return `Error ${res.status}`;
};

const fmtDate = (s?: string | null) => {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString("es");
  } catch (_) {
    return s;
  }
};

export default function AlliesPage() {
  const [allies, setAllies] = useState<Ally[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadAllies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/admin/users?role=ally");
      if (!res.ok) {
        setError(await parseApiError(res));
        setAllies([]);
        return;
      }
      const data = await res.json();
      setAllies(Array.isArray(data) ? data : []);
    } catch (_) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllies();
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
        role: "ally",
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
      await loadAllies();
    } catch (_) {
      setCreateError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field: keyof typeof emptyForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Allies" action={<Button onClick={openCreate}>Nuevo Ally</Button>} />

      {loading && <p className="mb-2 text-muted-foreground">Cargando allies...</p>}
      {error && <p className="mb-2 text-destructive">{error}</p>}
      {!loading && !error && allies.length === 0 && (
        <p className="mb-2 text-muted-foreground">No hay allies registrados</p>
      )}

      {!loading && !error && allies.length > 0 && (
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
                {allies.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {[a.first_name, a.last_name].filter(Boolean).join(" ") || "-"}
                    </TableCell>
                    <TableCell>{a.email}</TableCell>
                    <TableCell>{a.phone || "-"}</TableCell>
                    <TableCell>{a.sex || "-"}</TableCell>
                    <TableCell>{fmtDate(a.birth_date)}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          a.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {a.is_active ? "Sí" : "No"}
                      </span>
                    </TableCell>
                    <TableCell>{fmtDate(a.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-12">
          <div className="absolute inset-0 bg-black/40" onClick={closeCreate} />
          <div className="relative z-50 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Nuevo Ally</h2>
              <Button variant="outline" size="sm" onClick={closeCreate}>Cerrar</Button>
            </div>

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
                    <SelectValue placeholder="male" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">male</SelectItem>
                    <SelectItem value="female">female</SelectItem>
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
                <label className="block text-sm text-foreground">Foto URL (opcional)</label>
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
              <Button onClick={submitCreate} disabled={submitting}>{submitting ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
