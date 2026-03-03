"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="max-w-7xl mx-auto px-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">Gestión de Fechas</h1>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-gray-700">Administración de disponibilidad de fechas.</p>
        <Button onClick={handleAgregarFecha}>Agregar fecha</Button>
      </div>

      <div className="overflow-x-auto bg-white border border-gray-200 rounded">
        <table className="w-full table-fixed">
          <colgroup>
            <col style={{ width: '40%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '30%' }} />
          </colgroup>
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
                  <Button size="sm" variant={f.estado === "Disponible" ? "destructive" : "default"} onClick={() => handleToggleEstado(f.id)}>
                    {f.estado === "Disponible" ? "Bloquear" : "Desbloquear"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
