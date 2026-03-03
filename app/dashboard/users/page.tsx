"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type UserRole = "user" | "ally" | "admin";

type RoleFilter = "all" | UserRole;

type AdminUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
  dni?: string | null;
  sex?: string | null;
  birth_date?: string | null;
  created_at?: string | null;
  profile_photo_url?: string | null;
};

type Pet = {
  id: string;
  name?: string | null;
  species?: "dog" | "cat" | string | null;
  breed?: string | null;
  weight_kg?: number | null;
  sex?: string | null;
  vaccines_up_to_date?: boolean | null;
  is_sterilized?: boolean | null;
  photo_url?: string | null;
  birth_date?: string | null;
};

const parseApiError = async (res: Response): Promise<string> => {
  try {
    const body = await res.json();
    const detail = body?.detail;
    if (detail) {
      if (Array.isArray(detail) && detail.length > 0) {
        return detail[0]?.msg || String(detail[0]);
      }
      return String(detail);
    }
    if (body?.message) return String(body.message);
  } catch {
    // ignore
  }
  return `Error ${res.status}`;
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "-";
  // prefer YYYY-MM-DD
  const m = /^\d{4}-\d{2}-\d{2}/.exec(iso);
  if (m) return m[0];
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().slice(0, 10);
  } catch {
    return iso;
  }
};

const roleLabel = (r: UserRole) => (r === "user" ? "Cliente" : r === "ally" ? "Aliado" : "Admin");

const roleBadgeVariant = (r: UserRole): "default" | "secondary" => {
  // high contrast: keep default for admin, secondary for others
  return r === "admin" ? "default" : "secondary";
};

const boolLabel = (v: boolean | null | undefined) => (v === true ? "Sí" : v === false ? "No" : "-");

const speciesLabel = (s?: string | null) => (s === "dog" ? "Perro" : s === "cat" ? "Gato" : s || "-");

const sexLabel = (s?: string | null) => (s === "male" ? "Macho" : s === "female" ? "Hembra" : s || "-");

const calcAgeLabel = (birthDate?: string | null) => {
  if (!birthDate) return "-";
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return "-";

  const now = new Date();
  // rough but consistent: convert to total months difference
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  if (months < 0) months = 0;

  const years = Math.floor(months / 12);
  const rem = months % 12;

  if (years === 0 && rem === 0) return "0 meses";
  if (years === 0) return `${rem} meses`;
  if (rem === 0) return `${years} años`;
  return `${years} años ${rem} meses`;
};

function safeName(u: AdminUser) {
  const fn = (u.first_name || "").trim();
  const ln = (u.last_name || "").trim();
  const full = `${fn} ${ln}`.trim();
  return full || "-";
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filter
  const [filterRole, setFilterRole] = useState<RoleFilter>("all");
  const [draftRole, setDraftRole] = useState<RoleFilter>("all");

  // sheet (detail)
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // pets inside sheet
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petsError, setPetsError] = useState<string | null>(null);

  const buildPath = (role: RoleFilter) => {
    if (role === "all") return "/admin/users";
    return `/admin/users?role=${encodeURIComponent(role)}`;
  };

  const loadUsers = async (role: RoleFilter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(buildPath(role));
      if (!res.ok) {
        setError(await parseApiError(res));
        setUsers([]);
        return;
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setError("Error de conexión");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(filterRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => {
    setFilterRole(draftRole);
    loadUsers(draftRole);
  };

  const handleClear = () => {
    setDraftRole("all");
    setFilterRole("all");
    loadUsers("all");
  };

  const openDetail = (u: AdminUser) => {
    setSelectedUser(u);
    setOpen(true);
    setPets([]);
    setPetsError(null);
    setPetsLoading(false);
  };

  const closeDetail = () => {
    setOpen(false);
    setSelectedUser(null);
    setPets([]);
    setPetsError(null);
    setPetsLoading(false);
  };

  const loadPets = async () => {
    if (!selectedUser) return;
    setPetsLoading(true);
    setPetsError(null);
    try {
      const res = await apiFetch(`/admin/users/${selectedUser.id}/pets`);
      if (!res.ok) {
        // Si el backend responde 404 para usuarios sin mascotas, tratamos como lista vacía
        if (res.status === 404) {
          setPets([]);
          setPetsError(null);
          return;
        }
        setPetsError(await parseApiError(res));
        setPets([]);
        return;
      }
      const data = await res.json();
      setPets(Array.isArray(data) ? data : []);
    } catch {
      setPetsError("Error de conexión");
      setPets([]);
    } finally {
      setPetsLoading(false);
    }
  };

  const rows = useMemo(() => users, [users]);

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
        <p className="text-sm text-muted-foreground">Listado global (admin)</p>
      </div>

      {/* Filters */}
      <div className="bg-background border border-border rounded p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-55">
          <Label className="block text-sm font-medium mb-1">Rol</Label>
          <Select value={draftRole} onValueChange={(v) => setDraftRole(v as RoleFilter)}>
            <SelectTrigger className="w-48" size="sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="user">Cliente</SelectItem>
              <SelectItem value="ally">Aliado</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleApply} disabled={loading}>
          Aplicar
        </Button>
        <Button variant="outline" onClick={handleClear} disabled={loading}>
          Limpiar
        </Button>
      </div>

      {/* State messages */}
      {loading && <p className="text-muted-foreground mb-2">Cargando usuarios...</p>}
      {error && <p className="text-destructive mb-2">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="text-muted-foreground mb-2">No hay usuarios</p>
      )}

      {/* Table (simple, using existing styles) */}
      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto bg-background border border-border rounded">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 border-b">Nombre</th>
                <th className="px-4 py-3 border-b">Email</th>
                <th className="px-4 py-3 border-b">Teléfono</th>
                <th className="px-4 py-3 border-b">Rol</th>
                <th className="px-4 py-3 border-b">Activo</th>
                <th className="px-4 py-3 border-b">Registro</th>
                <th className="px-4 py-3 border-b">Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-4 py-3 border-b font-medium">{safeName(u)}</td>
                  <td className="px-4 py-3 border-b">{u.email || "-"}</td>
                  <td className="px-4 py-3 border-b">{u.phone || "-"}</td>
                  <td className="px-4 py-3 border-b">
                    <Badge variant={roleBadgeVariant(u.role)}>{roleLabel(u.role)}</Badge>
                  </td>
                  <td className="px-4 py-3 border-b">
                    <Badge variant={u.is_active ? "default" : "secondary"}>
                      {u.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 border-b">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3 border-b">
                    <Button size="sm" variant="outline" onClick={() => openDetail(u)}>
                      Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={open} onOpenChange={(v) => (v ? null : closeDetail())}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Detalle de usuario</SheetTitle>
            <SheetDescription>Información y mascotas asociadas</SheetDescription>
          </SheetHeader>

          {!selectedUser ? (
            <div className="p-4">
              <p className="text-sm text-muted-foreground">Sin usuario seleccionado.</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* User info */}
              <div className="rounded-md border bg-background p-4">
                <div className="flex items-start gap-3">
                  {selectedUser.profile_photo_url ? (
                    // avoid adding Avatar component file; show simple image
                    <img
                      src={selectedUser.profile_photo_url}
                      alt="Foto de perfil"
                      className="h-12 w-12 rounded-full object-cover border"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center border text-sm font-medium">
                      {safeName(selectedUser)
                        .split(" ")
                        .slice(0, 2)
                        .map((p) => p.slice(0, 1).toUpperCase())
                        .join("") || "-"}
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-base">{safeName(selectedUser)}</h3>
                      <Badge variant={roleBadgeVariant(selectedUser.role)}>
                        {roleLabel(selectedUser.role)}
                      </Badge>
                      <Badge variant={selectedUser.is_active ? "default" : "secondary"}>
                        {selectedUser.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedUser.email || "-"}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{selectedUser.phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">DNI</p>
                    <p className="font-medium">{selectedUser.dni || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sexo</p>
                    <p className="font-medium">{selectedUser.sex || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nacimiento</p>
                    <p className="font-medium">{selectedUser.birth_date || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Registro</p>
                    <p className="font-medium">{fmtDate(selectedUser.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ID</p>
                    <p className="font-mono text-xs break-all">{selectedUser.id}</p>
                  </div>
                </div>
              </div>

              {/* Pets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">Mascotas</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadPets}
                    disabled={petsLoading}
                    aria-disabled={petsLoading}
                  >
                    {petsLoading ? "Cargando..." : "Cargar mascotas"}
                  </Button>
                </div>

                {petsError && <p className="text-sm text-destructive">{petsError}</p>}

                {!petsLoading && !petsError && pets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Este usuario no tiene mascotas.
                  </p>
                ) : null}

                {pets.length > 0 ? (
                  <div className="overflow-x-auto rounded-md border bg-background">
                    <table className="w-full text-sm table-auto">
                      <thead className="bg-muted/50 text-left">
                        <tr>
                          <th className="px-3 py-2 border-b w-12">Foto</th>
                          <th className="px-3 py-2 border-b w-40">Nombre</th>
                          <th className="px-3 py-2 border-b w-24">Especie</th>
                          <th className="px-3 py-2 border-b w-48">Raza</th>
                          <th className="px-3 py-2 border-b w-24">Peso</th>
                          <th className="px-3 py-2 border-b w-32">Edad</th>
                          <th className="px-3 py-2 border-b w-28">Vacunas</th>
                          <th className="px-3 py-2 border-b w-28">Esteril.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pets.map((p, i) => (
                          <tr key={p.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                            <td className="px-3 py-2 border-b">
                              {p.photo_url ? (
                                <img
                                  src={p.photo_url}
                                  alt={(p.name || "Mascota").toString()}
                                  className="h-8 w-8 rounded-full object-cover border"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border text-xs font-medium text-foreground">
                                  {(p.name || "-")
                                    .toString()
                                    .trim()
                                    .slice(0, 1)
                                    .toUpperCase() || "-"}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 border-b font-medium text-foreground">
                              {(p.name || "-").toString()}
                            </td>
                            <td className="px-3 py-2 border-b text-foreground">{speciesLabel(p.species)}</td>
                            <td className="px-3 py-2 border-b text-foreground">{p.breed || "Sin especificar"}</td>
                            <td className="px-3 py-2 border-b text-foreground">
                              {p.weight_kg != null ? `${p.weight_kg} kg` : "-"}
                            </td>
                            <td className="px-3 py-2 border-b text-foreground">{calcAgeLabel(p.birth_date)}</td>
                            <td className="px-3 py-2 border-b">
                              <span className="font-medium text-foreground">{boolLabel(p.vaccines_up_to_date)}</span>
                            </td>
                            <td className="px-3 py-2 border-b">
                              <span className="font-medium text-foreground">{boolLabel(p.is_sterilized)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
