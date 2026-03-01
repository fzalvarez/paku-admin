"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Allies</h1>
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded"
          onClick={openCreate}
        >
          Nuevo Ally
        </button>
      </div>

      {loading && <p className="text-gray-700 mb-2">Cargando allies...</p>}
      {error && <p className="text-red-700 mb-2">{error}</p>}
      {!loading && !error && allies.length === 0 && (
        <p className="text-gray-700 mb-2">No hay allies registrados</p>
      )}

      {!loading && !error && allies.length > 0 && (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded">
          <table className="w-full table-auto">
            <thead className="bg-gray-100 text-left text-sm text-gray-700">
              <tr>
                <th className="px-4 py-3 border-b">Nombre</th>
                <th className="px-4 py-3 border-b">Email</th>
                <th className="px-4 py-3 border-b">Teléfono</th>
                <th className="px-4 py-3 border-b">Sexo</th>
                <th className="px-4 py-3 border-b">Nacimiento</th>
                <th className="px-4 py-3 border-b">Activo</th>
                <th className="px-4 py-3 border-b">Creado</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-800">
              {allies.map((a, i) => (
                <tr key={a.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3 border-b">
                    {[a.first_name, a.last_name].filter(Boolean).join(" ") || "-"}
                  </td>
                  <td className="px-4 py-3 border-b">{a.email}</td>
                  <td className="px-4 py-3 border-b">{a.phone || "-"}</td>
                  <td className="px-4 py-3 border-b">{a.sex || "-"}</td>
                  <td className="px-4 py-3 border-b">{fmtDate(a.birth_date)}</td>
                  <td className="px-4 py-3 border-b">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        a.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {a.is_active ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b">{fmtDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-12">
          <div className="absolute inset-0 bg-black/40" onClick={closeCreate} />
          <div className="relative bg-white w-full max-w-lg rounded shadow-lg p-6 z-50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Nuevo Ally</h2>
              <button
                className="px-3 py-1 bg-gray-300 text-gray-900 rounded border text-sm"
                onClick={closeCreate}
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-900">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-900">
                  Contraseña <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-900">Nombre</label>
                <input
                  className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900"
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-900">Apellido</label>
                <input
                  className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900"
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-900">Teléfono</label>
                <input
                  className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-900">
                  Sexo <span className="text-red-600">*</span>
                </label>
                <select
                  className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900 bg-white"
                  value={form.sex}
                  onChange={(e) => set("sex", e.target.value)}
                >
                  <option value="male">male</option>
                  <option value="female">female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-900">
                  Fecha de nacimiento <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900"
                  value={form.birth_date}
                  onChange={(e) => set("birth_date", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-900">DNI (opcional)</label>
                <input
                  className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900"
                  value={form.dni}
                  onChange={(e) => set("dni", e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-gray-900">Foto URL (opcional)</label>
                <input
                  className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-gray-900"
                  value={form.profile_photo_url}
                  onChange={(e) => set("profile_photo_url", e.target.value)}
                />
              </div>
            </div>

            {createError && (
              <p className="text-red-700 mt-3 text-sm">{createError}</p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                className="px-3 py-2 bg-gray-300 text-gray-900 rounded border disabled:opacity-50"
                onClick={closeCreate}
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                onClick={submitCreate}
                disabled={submitting}
              >
                {submitting ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
