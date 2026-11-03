"use client";

// Nubefact (paku-backend C-47): ruta de la cuenta, token cifrado en el backend, serie de boletas y prueba de conexión
// (consulta una boleta inexistente: no emite nada). Todavía no se emiten comprobantes desde Paku.

import Link from "next/link";
import { useEffect, useState } from "react";
import { ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fmtDateTime } from "@/lib/orders";
import { cn } from "@/lib/utils";
import {
  getNubefactIntegration,
  testNubefactConnection,
  updateNubefactIntegration,
  type InvoicingStatus,
  type NubefactIntegration,
} from "@/lib/services/invoicing";

export const INVOICING_STATUS: Record<InvoicingStatus, { label: string; cls: string }> = {
  not_configured: { label: "Sin configurar", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  disabled: { label: "Desactivado", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  active: { label: "Conectado", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  error: { label: "Con error", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
};

interface Draft {
  enabled: boolean;
  api_url: string;
  token: string;
  boleta_series: string;
}

const toDraft = (d: NubefactIntegration): Draft => ({
  enabled: d.enabled,
  api_url: d.api_url ?? "",
  token: "",
  boleta_series: d.boleta_series,
});

const same = (a: Draft, b: Draft) => (Object.keys(a) as (keyof Draft)[]).every((k) => a[k] === b[k]);

export function NubefactCard() {
  const [data, setData] = useState<NubefactIntegration | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const apply = (d: NubefactIntegration) => {
    setData(d);
    setDraft(toDraft(d));
  };

  useEffect(() => {
    getNubefactIntegration()
      .then(apply)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar la configuración de Nubefact."));
  }, []);

  const dirty = !!data && !!draft && !same(draft, toDraft(data));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((p) => (p ? { ...p, [k]: v } : p));

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      apply(await updateNubefactIntegration({
        enabled: draft.enabled,
        api_url: draft.api_url.trim() || null,
        token: draft.token.trim() || null,
        boleta_series: draft.boleta_series.trim() || null,
      }));
      setNotice("Configuración guardada.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setError("");
    setNotice("");
    try {
      const r = await testNubefactConnection();
      if (r.ok) setNotice(r.message);
      else setError(`La prueba falló: ${r.message}`);
      apply(await getNubefactIntegration());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo probar la conexión.");
    } finally {
      setTesting(false);
    }
  }

  const status = data ? INVOICING_STATUS[data.status] : null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ReceiptText className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base">Facturación electrónica · Nubefact</CardTitle>
            <p className="text-sm text-muted-foreground">Boletas de venta ante SUNAT. Por ahora solo conexión: aún no se emite.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status && <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", status.cls)}>{status.label}</span>}
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/configuracion/integraciones/nubefact">Qué se puede hacer</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!data && !error && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {data && !data.encryption_ready && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            El servidor no tiene la llave de cifrado (<code>CREDENTIALS_ENCRYPTION_KEY</code>): no se puede guardar el token.
          </p>
        )}

        {draft && data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nf-route">Ruta (URL de tu cuenta)</Label>
                <Input
                  id="nf-route"
                  value={draft.api_url}
                  placeholder="https://api.nubefact.com/api/v1/…"
                  onChange={(e) => set("api_url", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Única por cuenta; la ves en Nubefact con la opción API habilitada (si no la tienes, se pide en
                  ayuda.nubefact.com).
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nf-token">Token</Label>
                <Input
                  id="nf-token"
                  type="password"
                  autoComplete="new-password"
                  value={draft.token}
                  placeholder={data.token_mask ? `Guardado: ${data.token_mask}` : "Token de la API"}
                  onChange={(e) => set("token", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {data.token_mask
                    ? "Se guarda cifrado. Déjalo vacío para conservarlo; escribe otro para reemplazarlo."
                    : "Se guarda cifrado y no se puede volver a ver."}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nf-series">Serie de boletas</Label>
                <Input
                  id="nf-series"
                  maxLength={4}
                  value={draft.boleta_series}
                  placeholder="B001"
                  onChange={(e) => set("boleta_series", e.target.value.toUpperCase())}
                />
                <p className="text-xs text-muted-foreground">4 caracteres que empiezan con B. Debe existir en tu cuenta de Nubefact.</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="nf-enabled" checked={draft.enabled} onCheckedChange={(v) => set("enabled", v)} />
                <Label htmlFor="nf-enabled">Integración activa</Label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!dirty || saving} onClick={save}>{saving ? "Guardando…" : "Guardar"}</Button>
              <Button variant="outline" disabled={!data.configured || dirty || testing} onClick={test}>
                {testing ? "Probando…" : "Probar conexión"}
              </Button>
              {data.updated_at && <span className="text-xs text-muted-foreground">Último cambio: {fmtDateTime(data.updated_at)}</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              {!data.configured
                ? "Guarda la ruta y el token para poder probar."
                : dirty
                  ? "Guarda los cambios antes de probar."
                  : "La prueba consulta una boleta que no existe: valida la ruta y el token sin emitir nada."}
            </p>
            {data.last_test_at && (
              <p className={cn("text-xs", data.last_test_ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
                Última prueba {fmtDateTime(data.last_test_at)}:{" "}
                {data.last_test_ok ? "conexión correcta." : `falló — ${data.last_test_error ?? "sin detalle"}`}
              </p>
            )}
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && !error && <p className="text-sm text-muted-foreground">{notice}</p>}
      </CardContent>
    </Card>
  );
}
