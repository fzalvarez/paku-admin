"use client";

// Estado en memoria del CRM de demostración: campañas creadas, reglas de recordatorio e integraciones
// activadas viven mientras la pestaña esté abierta y se pierden al recargar. No llama al backend.

import { createContext, useContext, useState, type ReactNode } from "react";
import { CAMPANAS, type Campana, type EstadoCampana, type TipoRecordatorio } from "@/lib/mock/crm";

type Ctx = {
  campanas: Campana[];
  addCampana: (c: Omit<Campana, "id">) => void;
  setEstadoCampana: (id: string, estado: EstadoCampana) => void;
  reglas: Record<TipoRecordatorio, boolean>;
  toggleRegla: (t: TipoRecordatorio) => void;
  enviados: Set<string>; // recordatorios enviados a mano durante la demo
  marcarEnviado: (ids: string[]) => void;
};

const DemoCrmContext = createContext<Ctx | null>(null);

export function DemoCrmProvider({ children }: { children: ReactNode }) {
  const [campanas, setCampanas] = useState<Campana[]>(CAMPANAS);
  const [reglas, setReglas] = useState<Record<TipoRecordatorio, boolean>>({ bano: true, antiparasitario: true, cumpleanos: false });
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const addCampana = (c: Omit<Campana, "id">) =>
    setCampanas((prev) => [{ ...c, id: `CMP-${String(prev.length + 1).padStart(3, "0")}` }, ...prev]);
  const setEstadoCampana = (id: string, estado: EstadoCampana) =>
    setCampanas((prev) => prev.map((c) => (c.id === id ? { ...c, estado } : c)));
  const toggleRegla = (t: TipoRecordatorio) => setReglas((prev) => ({ ...prev, [t]: !prev[t] }));
  const marcarEnviado = (ids: string[]) => setEnviados((prev) => new Set([...prev, ...ids]));
  return (
    <DemoCrmContext.Provider value={{ campanas, addCampana, setEstadoCampana, reglas, toggleRegla, enviados, marcarEnviado }}>
      {children}
    </DemoCrmContext.Provider>
  );
}

export function useDemoCrm() {
  const ctx = useContext(DemoCrmContext);
  if (!ctx) throw new Error("useDemoCrm fuera de DemoCrmProvider");
  return ctx;
}
