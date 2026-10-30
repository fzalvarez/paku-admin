// Campañas y promociones. Espejo de paku-backend: app/modules/campaigns/api/router.py — /admin/campaigns (C-38).
// Automáticas (se aplican solas al público) o con cupón; se usa solo la de mayor descuento por orden.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export type BenefitType = "percent" | "amount" | "free_addon";
export type CampaignStatus = "draft" | "active" | "paused" | "ended";
export type Channel = "push" | "whatsapp" | "email";

export interface CodeLabel {
  code: string;
  label: string;
}

export interface CampaignConfig {
  audiences: CodeLabel[];
  benefits: CodeLabel[];
  channels: CodeLabel[];
  states: CodeLabel[];
}

export interface Campaign {
  id: string;
  code: string;
  name: string;
  objective: string | null;
  audience: string;
  audience_label: string;
  benefit_type: BenefitType;
  benefit_label: string;
  value: number;
  addon_code: string | null;
  channels: Channel[];
  starts_on: string;
  ends_on: string | null;
  /** Lo que puso el admin. */
  status: CampaignStatus;
  /** Lo que se muestra: borrador | programada | activa | pausada | finalizada. */
  state: string;
  automatic: boolean;
  max_uses_per_customer: number | null;
  max_total_uses: number | null;
  uses: number;
  paid_uses: number;
  discount_given: number;
  sales: number;
  audience_size: number | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignInput {
  code: string;
  name: string;
  objective?: string | null;
  audience: string;
  benefit_type: BenefitType;
  value: number;
  addon_code?: string | null;
  channels: Channel[];
  starts_on: string;
  ends_on?: string | null;
  status: CampaignStatus;
  automatic: boolean;
  max_uses_per_customer: number | null;
  max_total_uses: number | null;
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<T>;
}

const send = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const getCampaignConfig = () => getJson<CampaignConfig>("/admin/campaigns/config");

export const listCampaigns = () => getJson<Campaign[]>("/admin/campaigns");

export const createCampaign = (input: CampaignInput) => getJson<Campaign>("/admin/campaigns", send("POST", input));

/** Edita solo lo enviado; con `status` activa, pausa o termina. */
export const updateCampaign = (id: string, patch: Partial<CampaignInput>) =>
  getJson<Campaign>(`/admin/campaigns/${encodeURIComponent(id)}`, send("PATCH", patch));
