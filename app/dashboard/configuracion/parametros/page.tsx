"use client";

// Parámetros generales (paku-backend C-35): datos de la empresa y valores por defecto de la plataforma. El
// formulario sale de las secciones que manda el backend; se guarda solo lo cambiado (PATCH, todo o nada).

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtDateTime } from "@/lib/orders";
import { getSettings, updateSettings, type GeneralSettings, type SettingField, type SettingValue } from "@/lib/services/settings";

const toText = (v: SettingValue) => (v == null ? "" : String(v));

export default function ParametrosPage() {
  const [data, setData] = useState<GeneralSettings | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const apply = (s: GeneralSettings) => {
    setData(s);
    setDraft(Object.fromEntries(s.sections.flatMap((sec) => sec.fields).map((f) => [f.key, toText(f.value)])));
  };

  useEffect(() => {
    getSettings().then(apply).catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar los parámetros."));
  }, []);

  const fields = useMemo(() => data?.sections.flatMap((s) => s.fields) ?? [], [data]);
  const changed = fields.filter((f) => f.editable && draft[f.key] !== toText(f.value));

  async function save() {
    setSaving(true);
    setError("");
    setNotice("");
    const values: Record<string, SettingValue> = {};
    for (const f of changed) {
      const raw = draft[f.key].trim();
      values[f.key] = raw === "" ? null : f.type === "percent" || f.type === "int" ? Number(raw.replace(",", ".")) : raw;
    }
    try {
      apply(await updateSettings(values));
      setNotice("Cambios guardados.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Parámetros generales"
        description="Datos de la empresa y valores por defecto de la plataforma."
        action={
          <Button disabled={!changed.length || saving} onClick={save}>
            {saving ? "Guardando…" : changed.length ? `Guardar cambios (${changed.length})` : "Guardar cambios"}
          </Button>
        }
        className="mb-0"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && !error && <p className="text-sm text-muted-foreground">{notice}</p>}
      {!data && !error && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {data?.updated_at && (
        <p className="text-xs text-muted-foreground">Último cambio: {fmtDateTime(data.updated_at)}</p>
      )}

      {data?.sections.map((s) => (
        <Card key={s.code}>
          <CardHeader>
            <CardTitle className="text-base">{s.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {s.fields.map((f) => (
              <FieldInput key={f.key} field={f} value={draft[f.key] ?? ""} onChange={(v) => setDraft((p) => ({ ...p, [f.key]: v }))} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const PLACEHOLDERS: Record<string, string> = {
  ruc: "20XXXXXXXXX",
  phone: "+51 9XX XXX XXX",
  email: "hola@paku.com.pe",
  time: "08:00",
};

function FieldInput({ field: f, value, onChange }: { field: SettingField; value: string; onChange: (v: string) => void }) {
  const changed = f.editable && value !== toText(f.value);
  return (
    <div className="space-y-1.5">
      <Label>{f.label}</Label>
      <Input
        type={f.type === "time" ? "time" : f.type === "email" ? "email" : "text"}
        inputMode={f.type === "percent" || f.type === "int" ? "decimal" : undefined}
        value={value}
        disabled={!f.editable}
        placeholder={f.default != null ? `Por defecto: ${f.default}` : PLACEHOLDERS[f.type] ?? ""}
        className={changed ? "border-amber-500 bg-amber-50" : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
    </div>
  );
}
