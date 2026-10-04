"use client";

// Fichas de mascotas de los clientes (solo lectura).
// El backend solo deja editar una mascota a su dueño; el admin la consulta.
// El peso se registra desde Historial clínico (registro de tipo "Peso").

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { OwnerSearch } from "@/components/owners/OwnerSearch";
import {
  getPetRecords,
  getUserPets,
  type OwnerSearchResult,
  type PetRecordOut,
  type PetSummary,
} from "@/lib/services/petRecords";
import {
  ACTIVITY_LEVEL_LABELS,
  ANTIPARASITIC_INTERVAL_LABELS,
  BATH_BEHAVIOR_LABELS,
  COAT_TYPE_LABELS,
  GROOMING_FREQUENCY_LABELS,
  RECORD_ROLE_LABELS,
  SEX_LABELS,
  SIZE_LABELS,
  SPECIES_LABELS,
  label,
  yesNo,
} from "@/lib/labels";

// PetOut completo de GET /admin/users/{id}/pets.
type Pet = PetSummary & {
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  sterilized?: boolean | null;
  size?: string | null;
  activity_level?: string | null;
  coat_type?: string | null;
  skin_sensitivity?: boolean | null;
  bath_behavior?: string | null;
  tolerates_drying?: boolean | null;
  tolerates_nail_clipping?: boolean | null;
  vaccines_up_to_date?: boolean | null;
  grooming_frequency?: string | null;
  receive_reminders?: boolean | null;
  antiparasitic?: boolean | null;
  antiparasitic_interval?: string | null;
  special_shampoo?: boolean | null;
};

const fmtDate = (s?: string | null) => {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return s;
  }
};

function Field({ name, value }: { name: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{name}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}

export default function MascotasPage() {
  const [owner, setOwner] = useState<OwnerSearchResult | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petsError, setPetsError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Pet | null>(null);
  const [weights, setWeights] = useState<PetRecordOut[]>([]);
  const [weightsLoading, setWeightsLoading] = useState(false);
  const [weightsError, setWeightsError] = useState<string | null>(null);

  const onOwnerSelect = async (o: OwnerSearchResult | null) => {
    setOwner(o);
    setPets([]);
    setPetsError(null);
    if (!o) return;
    setPetsLoading(true);
    try {
      setPets((await getUserPets(o.id)) as Pet[]);
    } catch (e) {
      setPetsError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setPetsLoading(false);
    }
  };

  const openPet = async (pet: Pet) => {
    setSelected(pet);
    setWeights([]);
    setWeightsError(null);
    setWeightsLoading(true);
    try {
      setWeights(await getPetRecords(pet.id, { type: "weight_record", limit: 50 }));
    } catch (e) {
      setWeightsError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setWeightsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Mascotas"
        description="Busca un cliente para ver la ficha de sus mascotas."
      />

      <Card className="mb-4">
        <CardContent>
          <OwnerSearch onSelect={onOwnerSelect} label="Buscar cliente" />
        </CardContent>
      </Card>

      {owner && (
        <Card>
          <CardContent className="overflow-x-auto">
            <h2 className="mb-3 font-semibold text-foreground">
              Mascotas de {owner.first_name} {owner.last_name}
            </h2>
            {petsLoading && <p className="text-sm text-muted-foreground">Cargando mascotas…</p>}
            {petsError && <p className="text-sm text-destructive">{petsError}</p>}
            {!petsLoading && !petsError && pets.length === 0 && (
              <p className="text-sm text-muted-foreground">Este cliente no tiene mascotas registradas.</p>
            )}
            {pets.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Especie</TableHead>
                    <TableHead>Raza</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead>Actualizada</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pets.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{label(SPECIES_LABELS, p.species)}</TableCell>
                      <TableCell>{p.breed_name || "-"}</TableCell>
                      <TableCell>{label(SEX_LABELS, p.sex)}</TableCell>
                      <TableCell>{p.weight_kg != null ? `${p.weight_kg} kg` : "-"}</TableCell>
                      <TableCell>{fmtDate(p.updated_at ?? p.created_at)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openPet(p)}>
                          Ver ficha
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {label(SPECIES_LABELS, selected.species)}
                  {selected.breed_name ? ` · ${selected.breed_name}` : ""}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 p-4">
                <div className="flex items-start gap-3 rounded-md border bg-background p-4">
                  {selected.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL firmada de GCS
                    <img
                      src={selected.photo_url}
                      alt={`Foto de ${selected.name}`}
                      className="h-16 w-16 rounded-full border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-muted text-lg font-medium">
                      {selected.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
                    <Field name="Sexo" value={label(SEX_LABELS, selected.sex)} />
                    <Field name="Nacimiento" value={fmtDate(selected.birth_date)} />
                    <Field name="Peso" value={selected.weight_kg != null ? `${selected.weight_kg} kg` : "-"} />
                    <Field name="Esterilizada" value={yesNo(selected.sterilized)} />
                  </div>
                </div>

                <div className="rounded-md border bg-background p-4">
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Perfil para el servicio</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Field name="Tamaño" value={label(SIZE_LABELS, selected.size)} />
                    <Field name="Nivel de actividad" value={label(ACTIVITY_LEVEL_LABELS, selected.activity_level)} />
                    <Field name="Tipo de pelaje" value={label(COAT_TYPE_LABELS, selected.coat_type)} />
                    <Field name="Comportamiento en el baño" value={label(BATH_BEHAVIOR_LABELS, selected.bath_behavior)} />
                    <Field name="Piel sensible" value={yesNo(selected.skin_sensitivity)} />
                    <Field name="Tolera el secado" value={yesNo(selected.tolerates_drying)} />
                    <Field name="Tolera el corte de uñas" value={yesNo(selected.tolerates_nail_clipping)} />
                    <Field name="Shampoo especial" value={yesNo(selected.special_shampoo)} />
                    <Field name="Vacunas al día" value={yesNo(selected.vaccines_up_to_date)} />
                    <Field
                      name="Antiparasitario"
                      value={
                        selected.antiparasitic
                          ? `Sí (${label(ANTIPARASITIC_INTERVAL_LABELS, selected.antiparasitic_interval)})`
                          : yesNo(selected.antiparasitic)
                      }
                    />
                    <Field name="Frecuencia de grooming" value={label(GROOMING_FREQUENCY_LABELS, selected.grooming_frequency)} />
                    <Field name="Recibe recordatorios" value={yesNo(selected.receive_reminders)} />
                  </div>
                  {selected.notes && (
                    <div className="mt-3 text-sm">
                      <p className="text-xs text-muted-foreground">Notas</p>
                      <p className="whitespace-pre-wrap text-foreground">{selected.notes}</p>
                    </div>
                  )}
                </div>

                <div className="rounded-md border bg-background p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Historial de peso</h3>
                    <Link
                      href="/dashboard/historial-clinico"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Registrar peso en Historial clínico
                    </Link>
                  </div>
                  {weightsLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
                  {weightsError && <p className="text-sm text-destructive">{weightsError}</p>}
                  {!weightsLoading && !weightsError && weights.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin registros de peso.</p>
                  )}
                  {weights.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Peso</TableHead>
                          <TableHead>Registrado por</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {weights.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell>{fmtDate(w.occurred_at)}</TableCell>
                            <TableCell>{String(w.data.weight_kg ?? "-")} kg</TableCell>
                            <TableCell>
                              {w.recorded_by_name || label(RECORD_ROLE_LABELS, w.recorded_by_role)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
