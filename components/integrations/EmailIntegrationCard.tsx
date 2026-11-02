"use client";

// Correo saliente (paku-backend C-44): proveedor (Resend), API key cifrada en el backend, remitente y prueba de envío.
// La key nunca vuelve completa: se muestra enmascarada y dejar el campo vacío conserva la guardada.

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { selectCls } from "@/components/crm/CrmUi";
import { fmtDateTime } from "@/lib/orders";
import { cn } from "@/lib/utils";
import {
  getEmailIntegration,
  sendTestEmail,
  updateEmailIntegration,
  type EmailIntegration,
  type EmailStatus,
} from "@/lib/services/integrations";

const STATUS: Record<EmailStatus, { label: string; cls: string }> = {
  not_configured: { label: "Sin configurar", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  disabled: { label: "Desactivado", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  active: { label: "Activo", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  error: { label: "Con error", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
};

interface Draft {
  provider: string;
  enabled: boolean;
  api_key: string;
  from_email: string;
  from_name: string;
  reply_to: string;
}

const toDraft = (d: EmailIntegration): Draft => ({
  provider: d.provider,
  enabled: d.enabled,
  api_key: "",
  from_email: d.from_email ?? "",
  from_name: d.from_name ?? "",
  reply_to: d.reply_to ?? "",
});

const same = (a: Draft, b: Draft) => (Object.keys(a) as (keyof Draft)[]).every((k) => a[k] === b[k]);

export function EmailIntegrationCard() {
  const [data, setData] = useState<EmailIntegration | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  const apply = (d: EmailIntegration) => {
    setData(d);
    setDraft(toDraft(d));
  };

  useEffect(() => {
    getEmailIntegration()
      .then(apply)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar la configuración del correo."));
  }, []);

  const dirty = !!data && !!draft && !same(draft, toDraft(data));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((p) => (p ? { ...p, [k]: v } : p));

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      apply(await updateEmailIntegration({
        provider: draft.provider,
        enabled: draft.enabled,
        api_key: draft.api_key.trim() || null,
        from_email: draft.from_email.trim() || null,
        from_name: draft.from_name.trim() || null,
        reply_to: draft.reply_to.trim() || null,
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
      const r = await sendTestEmail(testTo.trim() || undefined);
      setNotice(r.ok ? `Correo de prueba enviado a ${r.to}. Revisa la bandeja (y spam).` : "");
      if (!r.ok) setError(`La prueba falló: ${r.error ?? "error desconocido"}`);
      apply(await getEmailIntegration());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la prueba.");
    } finally {
      setTesting(false);
    }
  }

  const status = data ? STATUS[data.status] : null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Mail className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base">Correo saliente</CardTitle>
            <p className="text-sm text-muted-foreground">Recordatorios, campañas y avisos por correo.</p>
          </div>
        </div>
        {status && (
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", status.cls)}>{status.label}</span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!data && !error && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {data && !data.encryption_ready && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            El servidor no tiene la llave de cifrado (<code>CREDENTIALS_ENCRYPTION_KEY</code>): no se puede guardar ni usar
            la API key hasta que se configure.
          </p>
        )}

        {draft && data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email-provider">Proveedor</Label>
                <select
                  id="email-provider"
                  className={cn(selectCls, "w-full")}
                  value={draft.provider}
                  onChange={(e) => set("provider", e.target.value)}
                >
                  {data.providers.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-api-key">API key</Label>
                <Input
                  id="email-api-key"
                  type="password"
                  autoComplete="new-password"
                  value={draft.api_key}
                  placeholder={data.api_key_mask ? `Guardada: ${data.api_key_mask}` : "re_…"}
                  onChange={(e) => set("api_key", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {data.api_key_mask
                    ? "Se guarda cifrada y no se puede volver a ver. Déjala vacía para conservarla; escribe otra para reemplazarla."
                    : "Se guarda cifrada y no se puede volver a ver."}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-from">Correo del remitente</Label>
                <Input
                  id="email-from"
                  type="email"
                  value={draft.from_email}
                  placeholder="hola@paku.com.pe"
                  onChange={(e) => set("from_email", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Su dominio debe estar verificado en el proveedor.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-from-name">Nombre del remitente</Label>
                <Input
                  id="email-from-name"
                  value={draft.from_name}
                  placeholder="Paku"
                  onChange={(e) => set("from_name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-reply-to">Responder a</Label>
                <Input
                  id="email-reply-to"
                  type="email"
                  value={draft.reply_to}
                  placeholder="soporte@paku.com.pe"
                  onChange={(e) => set("reply_to", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Opcional. Adonde llegan las respuestas de los clientes.</p>
              </div>
              <div className="flex items-center gap-3 self-center">
                <Switch id="email-enabled" checked={draft.enabled} onCheckedChange={(v) => set("enabled", v)} />
                <Label htmlFor="email-enabled">Envío de correos activo</Label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!dirty || saving} onClick={save}>{saving ? "Guardando…" : "Guardar"}</Button>
              {data.updated_at && (
                <span className="text-xs text-muted-foreground">Último cambio: {fmtDateTime(data.updated_at)}</span>
              )}
            </div>

            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">Probar el envío</p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="email"
                  className="max-w-xs"
                  value={testTo}
                  placeholder="Tu correo (por defecto)"
                  onChange={(e) => setTestTo(e.target.value)}
                />
                <Button variant="outline" disabled={!data.configured || dirty || testing} onClick={test}>
                  {testing ? "Enviando…" : "Enviar prueba"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {!data.configured
                  ? "Guarda la API key y el remitente para poder probar."
                  : dirty
                    ? "Guarda los cambios antes de probar: la prueba usa la configuración guardada."
                    : "Usa la configuración guardada, aunque el envío esté desactivado."}
              </p>
              {data.last_test_at && (
                <p className={cn("text-xs", data.last_test_ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
                  Última prueba {fmtDateTime(data.last_test_at)}:{" "}
                  {data.last_test_ok ? "enviada correctamente." : `falló — ${data.last_test_error ?? "sin detalle"}`}
                </p>
              )}
            </div>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && !error && <p className="text-sm text-muted-foreground">{notice}</p>}
      </CardContent>
    </Card>
  );
}
