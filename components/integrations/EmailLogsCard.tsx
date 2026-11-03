"use client";

// Envíos de correo (paku-backend C-45): registro con estado, intentos y error; filtros por estado, texto y fechas;
// reintento manual de los fallidos. Las fallas temporales también se reintentan solas en el backend.

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDateTime } from "@/lib/orders";
import { cn } from "@/lib/utils";
import {
  getNotificationLogs,
  retryNotificationLog,
  type LogStatus,
  type NotificationLog,
  type NotificationLogPage,
} from "@/lib/services/integrations";

const PAGE = 25;

const STATUS: Record<LogStatus, { label: string; cls: string }> = {
  SENT: { label: "Enviado", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  FAILED: { label: "Fallido", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  PENDING: { label: "Pendiente", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
};

const TABS: { value: LogStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "SENT", label: "Enviados" },
  { value: "FAILED", label: "Fallidos" },
  { value: "PENDING", label: "Pendientes" },
];

const TEMPLATE_LABEL: Record<string, string> = { test: "Prueba" };

export function EmailLogsCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [status, setStatus] = useState<LogStatus | "">("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<NotificationLogPage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getNotificationLogs({
        channel: "email", status, q: query, date_from: desde, date_to: hasta, limit: PAGE, offset,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los envíos.");
    } finally {
      setLoading(false);
    }
  }, [status, query, desde, hasta, offset]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Búsqueda con una pequeña espera para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setOffset(0);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  async function retry(log: NotificationLog) {
    setRetrying(log.id);
    setError("");
    try {
      await retryNotificationLog(log.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reintentar el envío.");
    } finally {
      setRetrying(null);
    }
  }

  const total = data?.total ?? 0;
  const all = data ? data.counts.SENT + data.counts.FAILED + data.counts.PENDING : 0;
  const count = (s: LogStatus | "") => (data ? (s ? data.counts[s] : all) : null);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Envíos de correo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cada correo enviado o intentado. Las fallas temporales se reintentan solas (hasta 5 intentos).
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} /> Actualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <Button
              key={t.value || "all"}
              size="sm"
              variant={status === t.value ? "default" : "outline"}
              onClick={() => {
                setStatus(t.value);
                setOffset(0);
              }}
            >
              {t.label}
              {count(t.value) != null && <span className="ml-1 opacity-70">{count(t.value)}</span>}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input className="max-w-xs" value={q} placeholder="Destinatario o asunto" onChange={(e) => setQ(e.target.value)} />
          <Input type="date" className="w-auto" value={desde} aria-label="Desde"
            onChange={(e) => { setDesde(e.target.value); setOffset(0); }} />
          <span className="text-sm text-muted-foreground">a</span>
          <Input type="date" className="w-auto" value={hasta} aria-label="Hasta"
            onChange={(e) => { setHasta(e.target.value); setOffset(0); }} />
          {(desde || hasta) && (
            <Button size="sm" variant="ghost" onClick={() => { setDesde(""); setHasta(""); setOffset(0); }}>
              Quitar fechas
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Intentos</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap">{fmtDateTime(l.created_at)}</TableCell>
                  <TableCell className="max-w-[14rem] truncate" title={l.recipient}>{l.recipient}</TableCell>
                  <TableCell className="max-w-[18rem]">
                    <p className="truncate" title={l.subject ?? ""}>{l.subject || "—"}</p>
                    {l.template && (
                      <p className="text-xs text-muted-foreground">{TEMPLATE_LABEL[l.template] ?? l.template}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS[l.status].cls)}>
                      {STATUS[l.status].label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.attempts}</TableCell>
                  <TableCell className="max-w-[20rem] text-xs">
                    {l.status === "SENT" && l.sent_at && <span className="text-muted-foreground">Enviado {fmtDateTime(l.sent_at)}</span>}
                    {l.status === "FAILED" && (
                      <>
                        <p className="text-destructive">{l.error ?? "Sin detalle"}</p>
                        {l.retryable && l.next_attempt_at && (
                          <p className="text-muted-foreground">Se reintenta solo: {fmtDateTime(l.next_attempt_at)}</p>
                        )}
                      </>
                    )}
                    {l.status === "PENDING" && <span className="text-muted-foreground">Esperando respuesta del proveedor</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {l.status === "FAILED" && (
                      <Button size="sm" variant="outline" disabled={retrying === l.id} onClick={() => retry(l)}>
                        {retrying === l.id ? "Enviando…" : "Reintentar"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {data && data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    No hay envíos con estos filtros.
                  </TableCell>
                </TableRow>
              )}
              {!data && !error && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">Cargando…</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {total > PAGE && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{offset + 1}–{Math.min(offset + PAGE, total)} de {total}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
                Anterior
              </Button>
              <Button size="sm" variant="outline" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
