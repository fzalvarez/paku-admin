"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "paku-admin-theme";

// Funciona de verdad (no es decorativo): togglea la clase .dark en <html>,
// que ya tiene todos los tokens de color definidos en globals.css. El script
// inline en app/layout.tsx aplica la clase antes del primer paint para
// evitar el flash de tema incorrecto.
//
// useSyncExternalStore (en vez de useState+useEffect) evita el mismatch de
// hidratación sin necesidad de un "mounted gate" que dispara setState
// dentro de un efecto.
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* localStorage no disponible (modo privado, etc.) — no bloquea el toggle */
    }
  };

  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Cambiar tema">
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
