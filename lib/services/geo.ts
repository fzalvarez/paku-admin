// Catálogo de distritos (público). Espejo de paku-backend: app/modules/geo/api/router.py.

import { apiFetch } from "@/lib/apiClient";

export interface District {
  id: string;
  name: string;
}

// Distritos activos (GET /geo/districts), por nombre.
export async function listDistricts(): Promise<District[]> {
  const res = await apiFetch("/geo/districts");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? (data as District[]).sort((a, b) => a.name.localeCompare(b.name)) : [];
}

// Los distritos no cambian durante la sesión: se guardan en memoria por ID.
const districtNames = new Map<string, Promise<string | null>>();

export function getDistrictName(districtId: string): Promise<string | null> {
  let cached = districtNames.get(districtId);
  if (!cached) {
    cached = apiFetch(`/geo/districts/${encodeURIComponent(districtId)}`)
      .then(async (res) => (res.ok ? ((await res.json()) as { name?: string }).name ?? null : null))
      .catch(() => null);
    districtNames.set(districtId, cached);
  }
  return cached;
}
