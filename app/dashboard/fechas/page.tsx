"use client";

import { useState } from "react";

type Fecha = {
  id: number;
  fecha: string;
  estado: "Disponible" | "Bloqueada";
};

export default function FechasPage() {
  const [fechas, setFechas] = useState<Fecha[]>([
    { id: 1, fecha: "2026-03-01", estado: "Disponible" },
    { id: 2, fecha: "2026-03-02", estado: "Bloqueada" },
  ]);

  const handleAgregarFecha = () => {
    console.log("Agregar fecha");
  };

  const handleToggleEstado = (id: number) => {
    setFechas((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, estado: f.estado === "Disponible" ? "Bloqueada" : "Disponible" } : f
      )
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-gray-900">Gestión de Fechas</h1>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-gray-700">Administración de disponibilidad de fechas.</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleAgregarFecha}>
          Agregar fecha
        </button>
      </div>

      <div className="overflow-x-auto bg-white border border-gray-200 rounded">
        <table className="w-full table-auto">
          <thead className="bg-gray-100 text-left text-sm text-gray-700">
            <tr>
              <th className="px-4 py-3 border-b">Fecha</th>
              <th className="px-4 py-3 border-b">Estado</th>
              <th className="px-4 py-3 border-b">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-800">
            {fechas.map((f, idx) => (
              <tr key={f.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-3 border-b">{f.fecha}</td>
                <td className="px-4 py-3 border-b">{f.estado}</td>
                <td className="px-4 py-3 border-b">
                  <button
                    className={`px-3 py-1 rounded text-white ${
                      f.estado === "Disponible" ? "bg-red-600" : "bg-green-600"
                    }`}
                    onClick={() => handleToggleEstado(f.id)}
                  >
                    {f.estado === "Disponible" ? "Bloquear" : "Desbloquear"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
