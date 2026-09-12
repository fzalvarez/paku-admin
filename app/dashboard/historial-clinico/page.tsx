"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PriceCheckDialog } from "@/components/pet-records/PriceCheckDialog";
import {
  searchOwners,
  getUserPets,
  getPetRecords,
  createPetRecord,
  RECORD_TYPE_LABELS,
  RECORD_TYPE_FIELDS,
  type OwnerSearchResult,
  type PetSummary,
  type PetRecordOut,
  type RecordType,
  type PriceCheckOut,
} from "@/lib/services/petRecords";

const RECORD_TYPES = Object.keys(RECORD_TYPE_LABELS) as RecordType[];

const TYPE_BADGE_COLOR: Record<RecordType, string> = {
  check_up: "bg-blue-100 text-blue-800",
  vaccine: "bg-emerald-100 text-emerald-800",
  deworming: "bg-lime-100 text-lime-800",
  medication: "bg-purple-100 text-purple-800",
  bath: "bg-cyan-100 text-cyan-800",
  grooming: "bg-pink-100 text-pink-800",
  weight_record: "bg-orange-100 text-orange-800",
  nutrition: "bg-amber-100 text-amber-800",
  disease_condition: "bg-red-100 text-red-800",
  surgery: "bg-rose-100 text-rose-800",
  study_test: "bg-indigo-100 text-indigo-800",
  note: "bg-gray-100 text-gray-700",
};

const fmtDate = (s?: string | null) => {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return s;
  }
};

function nowLocalInputValue() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function HistorialClinicoPage() {
  // ── Paso 1: combobox de dueño ──────────────────────────────────
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerResults, setOwnerResults] = useState<OwnerSearchResult[]>([]);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [ownerDropdownOpen, setOwnerDropdownOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<OwnerSearchResult | null>(null);
  const ownerBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ownerQuery.trim().length < 3) {
      setOwnerResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setOwnerSearching(true);
      try {
        const results = await searchOwners(ownerQuery.trim());
        setOwnerResults(results);
        setOwnerDropdownOpen(true);
      } catch {
        setOwnerResults([]);
      } finally {
        setOwnerSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [ownerQuery]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ownerBoxRef.current && !ownerBoxRef.current.contains(e.target as Node)) {
        setOwnerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectOwner = (owner: OwnerSearchResult) => {
    setSelectedOwner(owner);
    setOwnerQuery(`${owner.first_name} ${owner.last_name}`);
    setOwnerDropdownOpen(false);
    setSelectedPet(null);
    setRecords([]);
    loadPets(owner.id);
  };

  const clearOwner = () => {
    setSelectedOwner(null);
    setOwnerQuery("");
    setOwnerResults([]);
    setPets([]);
    setSelectedPet(null);
    setRecords([]);
  };

  // ── Paso 2: mascotas del dueño (buscable) ──────────────────────
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petsError, setPetsError] = useState<string | null>(null);
  const [petQuery, setPetQuery] = useState("");
  const [selectedPet, setSelectedPet] = useState<PetSummary | null>(null);

  const loadPets = async (ownerId: string) => {
    setPetsLoading(true);
    setPetsError(null);
    try {
      const data = await getUserPets(ownerId);
      setPets(data);
    } catch (e) {
      setPetsError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setPetsLoading(false);
    }
  };

  const filteredPets = useMemo(() => {
    const q = petQuery.trim().toLowerCase();
    if (!q) return pets;
    return pets.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.breed_name || "").toLowerCase().includes(q)
    );
  }, [pets, petQuery]);

  const selectPet = (pet: PetSummary) => {
    setSelectedPet(pet);
    loadRecords(pet.id);
  };

  // ── Paso 3: historial ───────────────────────────────────────────
  const [records, setRecords] = useState<PetRecordOut[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const loadRecords = async (petId: string) => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const data = await getPetRecords(petId, { limit: 20, offset: 0 });
      setRecords(data);
    } catch (e) {
      setRecordsError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setRecordsLoading(false);
    }
  };

  // ── Sheet de detalle ─────────────────────────────────────────────
  const [detailRecord, setDetailRecord] = useState<PetRecordOut | null>(null);

  // ── Dialog de creación ────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<RecordType>("note");
  const [createOccurredAt, setCreateOccurredAt] = useState(nowLocalInputValue());
  const [createData, setCreateData] = useState<Record<string, string>>({});
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const openCreate = () => {
    setCreateType("note");
    setCreateOccurredAt(nowLocalInputValue());
    setCreateData({});
    setCreateError(null);
    setCreateOpen(true);
  };

  const [priceCheck, setPriceCheck] = useState<PriceCheckOut | null>(null);

  const submitCreate = async () => {
    if (!selectedPet) return;
    setCreateError(null);

    const fields = RECORD_TYPE_FIELDS[createType];
    const missing = fields.filter((f) => f.required && !createData[f.key]?.trim());
    if (missing.length > 0) {
      setCreateError(`Faltan campos: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    const data: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = createData[f.key];
      if (raw === undefined || raw === "") continue;
      data[f.key] = f.type === "number" ? Number(raw) : raw;
    }

    let occurredIso: string;
    try {
      occurredIso = new Date(createOccurredAt).toISOString();
    } catch {
      setCreateError("Fecha inválida");
      return;
    }

    setCreateSubmitting(true);
    try {
      const result = await createPetRecord(selectedPet.id, {
        type: createType,
        occurred_at: occurredIso,
        data,
      });
      setCreateOpen(false);
      await loadRecords(selectedPet.id);
      if (result.price_check) {
        setPriceCheck(result.price_check);
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Historial clínico" description="Busca un dueño para ver el historial médico de sus mascotas." />

      {/* Paso 1: combobox de dueño */}
      <Card className="mb-4">
        <CardContent>
        <Label className="mb-1 block">Buscar dueño</Label>
        <div className="relative max-w-md" ref={ownerBoxRef}>
          <Input
            placeholder="Nombre o apellido (mínimo 3 letras)"
            value={ownerQuery}
            onChange={(e) => {
              setOwnerQuery(e.target.value);
              setSelectedOwner(null);
            }}
            onFocus={() => ownerResults.length > 0 && setOwnerDropdownOpen(true)}
          />
          {selectedOwner && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearOwner}
            >
              ✕
            </button>
          )}
          {ownerDropdownOpen && (
            <div className="absolute z-30 mt-1 w-full max-h-72 overflow-auto rounded-lg border bg-popover shadow-lg">
              {ownerSearching && <div className="px-3 py-2 text-sm text-muted-foreground">Buscando…</div>}
              {!ownerSearching && ownerQuery.trim().length >= 3 && ownerResults.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
              )}
              {!ownerSearching &&
                ownerResults.map((o) => (
                  <button
                    type="button"
                    key={o.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => selectOwner(o)}
                  >
                    <div className="font-medium text-popover-foreground">
                      {o.first_name} {o.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">{o.phone || o.email}</div>
                  </button>
                ))}
            </div>
          )}
        </div>
        </CardContent>
      </Card>

      {/* Paso 2: mascotas (buscable) */}
      {selectedOwner && (
        <Card className="mb-4">
          <CardContent>
          <Label className="mb-1 block">
            Mascotas de {selectedOwner.first_name} {selectedOwner.last_name}
          </Label>
          {petsLoading && <p className="text-sm text-muted-foreground">Cargando mascotas…</p>}
          {petsError && <p className="text-sm text-destructive">{petsError}</p>}
          {!petsLoading && !petsError && pets.length === 0 && (
            <p className="text-sm text-muted-foreground">Este dueño no tiene mascotas registradas.</p>
          )}
          {!petsLoading && pets.length > 0 && (
            <>
              {pets.length > 5 && (
                <Input
                  className="max-w-xs mb-2"
                  placeholder="Filtrar por nombre o raza"
                  value={petQuery}
                  onChange={(e) => setPetQuery(e.target.value)}
                />
              )}
              <div className="flex flex-wrap gap-2">
                {filteredPets.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => selectPet(p)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selectedPet?.id === p.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:bg-accent"
                    }`}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.species}
                      {p.breed_name ? ` · ${p.breed_name}` : ""}
                    </div>
                  </button>
                ))}
              </div>
              {filteredPets.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">Sin coincidencias</p>
              )}
            </>
          )}
          </CardContent>
        </Card>
      )}

      {/* Paso 3: historial */}
      {selectedPet && (
        <Card>
          <CardContent>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Historial de {selectedPet.name}</h2>
            <Button onClick={openCreate}>Nuevo registro</Button>
          </div>

          {recordsLoading && <p className="text-sm text-muted-foreground">Cargando historial…</p>}
          {recordsError && <p className="text-sm text-destructive">{recordsError}</p>}
          {!recordsLoading && !recordsError && records.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin registros todavía.</p>
          )}

          {!recordsLoading && records.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Registrado por</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{fmtDate(r.occurred_at)}</TableCell>
                      <TableCell>
                        <Badge className={TYPE_BADGE_COLOR[r.type]}>{RECORD_TYPE_LABELS[r.type]}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal">{r.title}</TableCell>
                      <TableCell>
                        {r.recorded_by_name ? `${r.recorded_by_name} (${r.recorded_by_role})` : r.recorded_by_role}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => setDetailRecord(r)}>
                          Ver detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          </CardContent>
        </Card>
      )}

      {/* Sheet de detalle */}
      <Sheet open={!!detailRecord} onOpenChange={(open) => !open && setDetailRecord(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{detailRecord ? RECORD_TYPE_LABELS[detailRecord.type] : ""}</SheetTitle>
          </SheetHeader>
          {detailRecord && (
            <div className="px-4 pb-4 space-y-3 text-sm">
              <p>
                <span className="font-medium text-foreground">Fecha:</span> {fmtDate(detailRecord.occurred_at)}
              </p>
              <p>
                <span className="font-medium text-foreground">Descripción:</span> {detailRecord.title}
              </p>
              <p>
                <span className="font-medium text-foreground">Registrado por:</span>{" "}
                {detailRecord.recorded_by_name
                  ? `${detailRecord.recorded_by_name} (${detailRecord.recorded_by_role})`
                  : detailRecord.recorded_by_role}
              </p>
              <div className="border-t pt-3">
                <p className="font-medium text-foreground mb-1">Datos</p>
                <div className="space-y-1">
                  {Object.entries(detailRecord.data).map(([k, v]) => (
                    <p key={k}>
                      <span className="text-muted-foreground">{k}:</span> {String(v)}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de creación */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo registro — {selectedPet?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="mb-1 block">Tipo</Label>
              <Select
                value={createType}
                onValueChange={(v) => {
                  setCreateType(v as RecordType);
                  setCreateData({});
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECORD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {RECORD_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block">Fecha</Label>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                value={createOccurredAt}
                max={nowLocalInputValue()}
                onChange={(e) => setCreateOccurredAt(e.target.value)}
              />
            </div>

            {RECORD_TYPE_FIELDS[createType].map((f) => (
              <div key={f.key}>
                <Label className="mb-1 block">
                  {f.label}
                  {f.required ? " *" : ""}
                </Label>
                {f.type === "textarea" ? (
                  <textarea
                    className="w-full rounded-md border border-input bg-transparent px-2 py-2 text-foreground"
                    rows={3}
                    value={createData[f.key] || ""}
                    onChange={(e) => setCreateData({ ...createData, [f.key]: e.target.value })}
                  />
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={createData[f.key] || ""}
                    onChange={(e) => setCreateData({ ...createData, [f.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>

          {createError && <p className="text-sm text-destructive">{createError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>
              Cancelar
            </Button>
            <Button onClick={submitCreate} disabled={createSubmitting}>
              {createSubmitting ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedPet && (
        <PriceCheckDialog priceCheck={priceCheck} petId={selectedPet.id} onClose={() => setPriceCheck(null)} />
      )}
    </div>
  );
}
