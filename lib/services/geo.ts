// Catálogo de distritos (público). Espejo de paku-backend: app/modules/geo/api/router.py.

import { apiFetch } from "@/lib/apiClient";

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
