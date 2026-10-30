// Parámetros generales. Espejo de paku-backend: app/modules/general_settings/api/router.py — /admin/settings (C-35).
// Una sola empresa: un valor por parámetro. Los de solo lectura (zona horaria, moneda, tiempo para pagar) no se cambian.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export type SettingValue = string | number | null;

export interface SettingField {
  key: string;
  label: string;
  type: "text" | "ruc" | "email" | "phone" | "time" | "percent" | "int" | "readonly";
  value: SettingValue;
  default: SettingValue;
  editable: boolean;
  help: string | null;
  min: number | null;
  max: number | null;
}

export interface GeneralSettings {
  values: Record<string, SettingValue>;
  sections: { code: string; title: string; fields: SettingField[] }[];
  updated_at: string | null;
  updated_by: string | null;
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<T>;
}

export const getSettings = () => getJson<GeneralSettings>("/admin/settings");

/** Cambia solo las claves enviadas; `null` vuelve al valor por defecto. Todo o nada. */
export const updateSettings = (values: Record<string, SettingValue>) =>
  getJson<GeneralSettings>("/admin/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
