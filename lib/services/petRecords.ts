// Service para la pantalla de historial clínico (paku-admin) y el atajo de
// "registrar peso" desde Órdenes. Espejo del contrato en
// paku-backend: app/modules/pet_records/{domain/record.py,api/schemas.py}.

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export type RecordType =
  | "check_up"
  | "vaccine"
  | "deworming"
  | "medication"
  | "bath"
  | "grooming"
  | "weight_record"
  | "nutrition"
  | "disease_condition"
  | "surgery"
  | "study_test"
  | "note";

export type RecordRole = "owner" | "groomer" | "admin" | "system";

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  check_up: "Consulta veterinaria",
  vaccine: "Vacuna",
  deworming: "Desparasitación",
  medication: "Medicamento",
  bath: "Baño",
  grooming: "Peluquería",
  weight_record: "Peso",
  nutrition: "Nutrición",
  disease_condition: "Condición / enfermedad",
  surgery: "Cirugía",
  study_test: "Estudio / análisis",
  note: "Nota",
};

type RecordFieldType = "text" | "number" | "date" | "textarea";

export interface RecordFieldSchema {
  key: string;
  label: string;
  type: RecordFieldType;
  required: boolean;
}

// Espejo de RECORD_TYPE_SCHEMA en app/modules/pet_records/domain/record.py —
// el backend valida igual, esto es solo para marcar requeridos en la UI.
export const RECORD_TYPE_FIELDS: Record<RecordType, RecordFieldSchema[]> = {
  check_up: [
    { key: "vet_name", label: "Veterinario", type: "text", required: true },
    { key: "diagnosis", label: "Diagnóstico", type: "textarea", required: true },
  ],
  vaccine: [
    { key: "vaccine_name", label: "Vacuna", type: "text", required: true },
    { key: "next_dose_date", label: "Próxima dosis", type: "date", required: true },
  ],
  deworming: [
    { key: "product_name", label: "Producto", type: "text", required: true },
    { key: "next_due_date", label: "Próxima dosis", type: "date", required: true },
  ],
  medication: [
    { key: "drug_name", label: "Medicamento", type: "text", required: true },
    { key: "dose", label: "Dosis", type: "text", required: true },
    { key: "frequency", label: "Frecuencia", type: "text", required: true },
    { key: "duration_days", label: "Duración (días)", type: "number", required: true },
  ],
  bath: [{ key: "performed_by", label: "Realizado por", type: "text", required: true }],
  grooming: [
    { key: "service_type", label: "Tipo de servicio", type: "text", required: true },
    { key: "performed_by", label: "Realizado por", type: "text", required: true },
  ],
  weight_record: [{ key: "weight_kg", label: "Peso (kg)", type: "number", required: true }],
  nutrition: [
    { key: "food_brand", label: "Marca de alimento", type: "text", required: true },
    { key: "food_type", label: "Tipo de alimento", type: "text", required: true },
  ],
  disease_condition: [
    { key: "condition_name", label: "Condición", type: "text", required: true },
    { key: "status", label: "Estado", type: "text", required: true },
  ],
  surgery: [
    { key: "procedure_name", label: "Procedimiento", type: "text", required: true },
    { key: "vet_name", label: "Veterinario", type: "text", required: true },
  ],
  study_test: [
    { key: "test_name", label: "Estudio", type: "text", required: true },
    { key: "result_summary", label: "Resultado", type: "textarea", required: true },
  ],
  note: [{ key: "text", label: "Nota", type: "textarea", required: true }],
};

export interface OwnerSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string;
}

export interface PetSummary {
  id: string;
  owner_id: string;
  name: string;
  species: "dog" | "cat";
  breed_name: string | null;
  sex: "male" | "female" | null;
  birth_date: string | null;
  photo_url: string | null;
  weight_kg: number | null;
}

export interface PetRecordOut {
  id: string;
  pet_id: string;
  type: RecordType;
  title: string;
  occurred_at: string;
  created_at: string;
  updated_at: string;
  recorded_by_user_id: string | null;
  recorded_by_role: RecordRole;
  recorded_by_name: string | null;
  data: Record<string, unknown>;
  attachment_ids: string[];
  deleted_at: string | null;
}

export interface PriceCheckOut {
  order_id: string;
  old_price: number;
  new_price: number;
  difference: number;
}

export interface CreateRecordResponse {
  record: PetRecordOut;
  price_check: PriceCheckOut | null;
}

export interface CreateRecordPayload {
  type: RecordType;
  occurred_at: string; // ISO, no puede ser futuro
  data: Record<string, unknown>;
  title?: string | null;
}

export interface PetRecordFilters {
  type?: RecordType;
  date_from?: string;
  date_to?: string;
  recorded_by_role?: RecordRole;
  limit?: number;
  offset?: number;
}

export interface OrderAdjustmentOut {
  id: string;
  parent_order_id: string | null;
  total_snapshot: number;
  currency: string;
  payment_status: string;
}

export async function searchOwners(q: string, limit = 20): Promise<OwnerSearchResult[]> {
  const params = new URLSearchParams({ q, role: "user", limit: String(limit) });
  const res = await apiFetch(`/admin/users/search?${params.toString()}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

export async function getUserPets(userId: string): Promise<PetSummary[]> {
  const res = await apiFetch(`/admin/users/${userId}/pets`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

export async function getPetRecords(
  petId: string,
  filters: PetRecordFilters = {}
): Promise<PetRecordOut[]> {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.recorded_by_role) params.set("recorded_by_role", filters.recorded_by_role);
  params.set("limit", String(filters.limit ?? 20));
  params.set("offset", String(filters.offset ?? 0));

  const res = await apiFetch(`/pets/${petId}/records?${params.toString()}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

export async function createPetRecord(
  petId: string,
  payload: CreateRecordPayload
): Promise<CreateRecordResponse> {
  const res = await apiFetch(`/pets/${petId}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attachment_ids: [], title: null, ...payload }),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

export async function createOrderAdjustment(
  orderId: string,
  petId: string
): Promise<OrderAdjustmentOut> {
  const res = await apiFetch(`/orders/${orderId}/create-adjustment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pet_id: petId }),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}
