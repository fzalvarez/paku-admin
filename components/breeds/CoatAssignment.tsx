"use client";

// Asignación inversa raza → tipo de pelaje (C-27): el pelaje define el precio. Los mestizos (6, uno por
// pelaje) llevan foto y descripción, que la app muestra al elegir "Mestizo".

import { useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { parseApiError } from "@/lib/apiHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface CoatBreed {
  id: string;
  name: string;
  species: string;
  is_active: boolean;
  coat_type?: string | null;
  is_mixed?: boolean;
  photo_url?: string | null;
  description?: string | null;
}

const COATS: { key: string; label: string }[] = [
  { key: "simple_short", label: "S1 · Pelo corto / pegado" },
  { key: "simple_medium_long", label: "S2 · Pelo medio o largo" },
  { key: "curly_no_undercoat", label: "S3 · Rizado / lanoso" },
  { key: "double_short", label: "S4 · Doble manto corto" },
  { key: "double_long", label: "S5 · Doble manto largo" },
  { key: "mixed_curly_undercoat", label: "S6 · Mixto / rizado denso" },
];
const NONE = "";

async function patchBreed(id: string, body: Record<string, unknown>) {
  const res = await apiFetch(`/admin/breeds/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
}

async function uploadPhoto(file: File): Promise<string> {
  const res = await apiFetch("/media/signed-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity_type: "catalog", entity_id: crypto.randomUUID(), content_type: file.type }),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  const { upload_url, object_name } = await res.json();
  const put = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!put.ok) throw new Error("No se pudo subir la foto.");
  return object_name as string;
}

export function CoatAssignment({ breeds, onChanged }: { breeds: CoatBreed[]; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const dogs = breeds.filter((b) => b.species === "dog" && b.is_active);
  const pure = dogs.filter((b) => !b.is_mixed);
  const mixed = dogs.filter((b) => b.is_mixed);
  const unassigned = pure.filter((b) => !b.coat_type);

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    setError("");
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setBusy(null);
    }
  };

  if (dogs.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Pelaje por raza (perros)</h2>
        <p className="text-sm text-muted-foreground">
          El pelaje define el precio. Cambia el pelaje de una raza con su selector; sin pelaje se cobra como
          «Mestizo u otra raza».
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {unassigned.length > 0 && (
        <Card className="border-amber-300">
          <CardContent className="space-y-2 pt-4">
            <p className="text-sm font-medium text-amber-900">Sin pelaje asignado ({unassigned.length})</p>
            {unassigned.map((b) => (
              <BreedRow key={b.id} b={b} busy={busy === b.id} onCoat={(c) => run(b.id, () => patchBreed(b.id, { coat_type: c || null }))} />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {COATS.map((c) => {
          const list = pure.filter((b) => b.coat_type === c.key);
          return (
            <Card key={c.key}>
              <CardContent className="space-y-2 pt-4">
                <p className="text-sm font-semibold">
                  {c.label} <span className="font-normal text-muted-foreground">({list.length})</span>
                </p>
                {list.map((b) => (
                  <BreedRow key={b.id} b={b} busy={busy === b.id} onCoat={(v) => run(b.id, () => patchBreed(b.id, { coat_type: v || null }))} />
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {mixed.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Mestizos (la app los muestra con foto)</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {mixed.map((b) => (
              <MixedCard key={b.id + (b.description ?? "")} b={b} busy={busy === b.id} run={run} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BreedRow({ b, busy, onCoat }: { b: CoatBreed; busy: boolean; onCoat: (coat: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="truncate">{b.name}</span>
      <select
        className="h-8 max-w-44 rounded-md border bg-background px-2 text-xs"
        value={b.coat_type ?? NONE}
        disabled={busy}
        onChange={(e) => onCoat(e.target.value)}
      >
        <option value={NONE}>Sin pelaje</option>
        {COATS.map((c) => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>
    </div>
  );
}

function MixedCard({
  b,
  busy,
  run,
}: {
  b: CoatBreed;
  busy: boolean;
  run: (id: string, fn: () => Promise<void>) => void;
}) {
  const [desc, setDesc] = useState(b.description ?? "");
  const coat = COATS.find((c) => c.key === b.coat_type)?.label ?? "Sin pelaje";

  return (
    <Card>
      <CardContent className="space-y-2 pt-4">
        <p className="text-sm font-semibold">{b.name}</p>
        <p className="text-xs text-muted-foreground">{coat}</p>
        {b.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.photo_url} alt={b.name} className="h-36 w-full rounded-md object-cover" />
        ) : (
          <div className="flex h-36 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
            Sin foto
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          className="text-xs"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) run(b.id, async () => patchBreed(b.id, { photo_url: await uploadPhoto(file) }));
            e.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción del pelaje" />
          <Button
            size="sm"
            variant="outline"
            disabled={busy || desc === (b.description ?? "")}
            onClick={() => run(b.id, () => patchBreed(b.id, { description: desc || null }))}
          >
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
