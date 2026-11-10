// Libro de Reclamaciones (admin). Espejo de paku-backend: app/modules/complaints/api/router.py (C-52).

import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";

export type ComplaintStatus = "received" | "answered";

export interface ComplaintSummary {
  id: string;
  code: string;
  created_at: string;
  kind: "reclamo" | "queja";
  kind_label: string;
  consumer_name: string;
  email: string;
  status: ComplaintStatus;
  status_label: string;
  response_due: string; // YYYY-MM-DD
  overdue: boolean;
}

export interface ComplaintDetail extends ComplaintSummary {
  sheet: { label: string; value: string }[];
  response: string | null;
  responded_at: string | null;
  responded_by: string | null;
}

export async function listComplaints(status?: ComplaintStatus | ""): Promise<{ items: ComplaintSummary[]; total: number }> {
  const qs = new URLSearchParams({ limit: "200" });
  if (status) qs.set("status", status);
  const res = await apiFetch(`/admin/complaints?${qs}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

export async function getComplaint(id: string): Promise<ComplaintDetail> {
  const res = await apiFetch(`/admin/complaints/${id}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}

export async function answerComplaint(id: string, response: string): Promise<ComplaintDetail> {
  const res = await apiFetch(`/admin/complaints/${id}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response }),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json();
}
