"use client";

// Libro de Reclamaciones (C-52): hojas registradas desde paku.com.pe/libro-de-reclamaciones. Cada hoja se responde
// una sola vez y la respuesta llega al correo del consumidor. Plazo: 15 días hábiles.

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  answerComplaint,
  getComplaint,
  listComplaints,
  type ComplaintDetail,
  type ComplaintStatus,
  type ComplaintSummary,
} from "@/lib/services/complaints";

const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDay(ymd: string) {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

function StatusBadge({ c }: { c: ComplaintSummary }) {
  const cls = c.status === "answered"
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
    : c.overdue
      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return (
    <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", cls)}>
      {c.status === "received" && c.overdue ? "Vencido" : c.status_label}
    </span>
  );
}

export default function ReclamosPage() {
  const [status, setStatus] = useState<ComplaintStatus | "">("");
  const [items, setItems] = useState<ComplaintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems((await listComplaints(status)).items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el libro.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const pending = items.filter((c) => c.status === "received");
  const overdue = pending.filter((c) => c.overdue);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Libro de Reclamaciones"
        description="Hojas registradas en paku.com.pe. Responde cada una dentro de los 15 días hábiles: la respuesta llega al correo del consumidor."
        action={<Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="size-4" /> Actualizar</Button>}
        className="mb-0"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Hojas" value={items.length} />
        <Stat label="Por responder" value={pending.length} warn={pending.length > 0} />
        <Stat label="Vencidas" value={overdue.length} danger={overdue.length > 0} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-4">
          <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as ComplaintStatus | "")}>
            <option value="">Todas</option>
            <option value="received">Por responder</option>
            <option value="answered">Respondidas</option>
          </select>
          <p className="text-xs text-muted-foreground">
            El aviso de cada hoja nueva llega al correo de reclamos (Parámetros generales → Empresa).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Cargando…</p>
          ) : error ? (
            <p className="py-8 text-sm text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">No hay hojas registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hoja</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Consumidor</TableHead>
                  <TableHead>Responder hasta</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setOpenId(c.id)}>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtDateTime(c.created_at)}</TableCell>
                    <TableCell>{c.kind_label}</TableCell>
                    <TableCell>
                      <span className="font-medium">{c.consumer_name}</span>
                      <span className="block text-xs text-muted-foreground">{c.email}</span>
                    </TableCell>
                    <TableCell className={cn("whitespace-nowrap", c.overdue && "font-semibold text-red-600")}>{fmtDay(c.response_due)}</TableCell>
                    <TableCell><StatusBadge c={c} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ComplaintDialog id={openId} onClose={() => setOpenId(null)} onAnswered={load} />
    </div>
  );
}

function Stat({ label, value, warn, danger }: { label: string; value: number; warn?: boolean; danger?: boolean }) {
  return (
    <Card className={cn(danger ? "border-red-300 dark:border-red-800" : warn && "border-amber-300 dark:border-amber-800")}>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-semibold tabular-nums", danger ? "text-red-600" : warn && "text-amber-700 dark:text-amber-400")}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ComplaintDialog({ id, onClose, onAnswered }: { id: string | null; onClose: () => void; onAnswered: () => void }) {
  const [detail, setDetail] = useState<ComplaintDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    setDetail(null);
    setError(null);
    setAnswer("");
    getComplaint(id).then(setDetail).catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar la hoja."));
  }, [id]);

  async function send() {
    if (!id) return;
    if (!window.confirm("La respuesta se enviará al correo del consumidor y no se podrá cambiar. ¿Enviar?")) return;
    setSending(true);
    setError(null);
    try {
      setDetail(await answerComplaint(id, answer));
      onAnswered();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la respuesta.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{detail ? `Hoja ${detail.code}` : "Hoja de reclamación"}</DialogTitle>
          <DialogDescription>
            {detail ? `${detail.kind_label} · ${detail.status === "answered" ? "Respondida" : `responder hasta el ${fmtDay(detail.response_due)}`}` : "Cargando…"}
          </DialogDescription>
        </DialogHeader>

        {detail && (
          <div className="space-y-4 text-sm">
            <dl className="divide-y rounded-md border">
              {detail.sheet.map((row) => (
                <div key={row.label} className="grid grid-cols-1 gap-1 px-3 py-2 sm:grid-cols-[180px_1fr]">
                  <dt className="font-medium text-muted-foreground">{row.label}</dt>
                  <dd className="whitespace-pre-wrap break-words">{row.value}</dd>
                </div>
              ))}
            </dl>

            {detail.status === "answered" ? (
              <div className="rounded-md border border-emerald-300 bg-emerald-50/60 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                <p className="mb-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Respuesta enviada{detail.responded_at ? ` el ${fmtDateTime(detail.responded_at)}` : ""}
                </p>
                <p className="whitespace-pre-wrap">{detail.response}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="lr-answer" className="text-sm font-medium">Respuesta al consumidor</label>
                <textarea
                  id="lr-answer"
                  rows={6}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  maxLength={5000}
                  placeholder="Explica qué revisaste y qué solución ofreces."
                />
                <Button onClick={send} disabled={sending || answer.trim().length < 10}>
                  {sending && <Loader2 className="size-4 animate-spin" />} Enviar respuesta
                </Button>
              </div>
            )}
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
