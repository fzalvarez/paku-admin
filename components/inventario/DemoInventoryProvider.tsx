"use client";

// Estado en memoria del módulo de Inventario de demostración: lo que se agregue durante la demo vive
// mientras la pestaña esté abierta y se pierde al recargar. No llama al backend.

import { createContext, useContext, useState, type ReactNode } from "react";
import { INSUMOS, MOVIMIENTOS, type Insumo, type Movimiento } from "@/lib/mock/inventario";

type Ctx = {
  insumos: Insumo[];
  movimientos: Movimiento[];
  addInsumo: (i: Insumo) => void;
  addMovimiento: (m: Omit<Movimiento, "id">) => void;
};

const DemoInventoryContext = createContext<Ctx | null>(null);

export function DemoInventoryProvider({ children }: { children: ReactNode }) {
  const [insumos, setInsumos] = useState<Insumo[]>(INSUMOS);
  const [movimientos, setMovimientos] = useState<Movimiento[]>(MOVIMIENTOS);
  const addInsumo = (i: Insumo) => setInsumos((prev) => [...prev, i]);
  const addMovimiento = (m: Omit<Movimiento, "id">) =>
    setMovimientos((prev) => [...prev, { ...m, id: `MOV-${String(prev.length + 1).padStart(4, "0")}` }]);
  return (
    <DemoInventoryContext.Provider value={{ insumos, movimientos, addInsumo, addMovimiento }}>
      {children}
    </DemoInventoryContext.Provider>
  );
}

export function useDemoInventory() {
  const ctx = useContext(DemoInventoryContext);
  if (!ctx) throw new Error("useDemoInventory fuera de DemoInventoryProvider");
  return ctx;
}
