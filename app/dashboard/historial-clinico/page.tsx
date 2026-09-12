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
    <div className="max-w-6xl mx-auto px-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Historial clínico</h1>
      </div>

      {/* Paso 1: combobox de dueño */}
      <div className="bg-white border border-gray-200 rounded p-4 mb-4">
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
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-800"
              onClick={clearOwner}
            >
              ✕
            </button>
          )}
          {ownerDropdownOpen && (
            <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-72 overflow-auto">
              {ownerSearching && <div className="px-3 py-2 text-sm text-gray-500">Buscando…</div>}
              {!ownerSearching && ownerQuery.trim().length >= 3 && ownerResults.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
              )}
              {!ownerSearching &&
                ownerResults.map((o) => (
                  <button
                    type="button"
                    key={o.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => selectOwner(o)}
                  >
                    <div className="font-medium text-gray-900">
                      {o.first_name} {o.last_name}
                    </div>
                    <div className="text-xs text-gray-500">{o.phone || o.email}</div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Paso 2: mascotas (buscable) */}
      {selectedOwner && (
        <div className="bg-white border border-gray-200 rounded p-4 mb-4">
          <Label className="mb-1 block">
            Mascotas de {selectedOwner.first_name} {selectedOwner.last_name}
          </Label>
          {petsLoading && <p className="text-sm text-gray-600">Cargando mascotas…</p>}
          {petsError && <p className="text-sm text-red-700">{petsError}</p>}
          {!petsLoading && !petsError && pets.length === 0 && (
            <p className="text-sm text-gray-600">Este dueño no tiene mascotas registradas.</p>
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
                    className={`px-3 py-2 rounded border text-sm text-left ${
                      selectedPet?.id === p.id
                        ? "border-blue-600 bg-blue-50 text-blue-900"
                        : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">
                      {p.species}
                      {p.breed_name ? ` · ${p.breed_name}` : ""}
                    </div>
                  </button>
                ))}
              </div>
              {filteredPets.length === 0 && <p className="text-sm text-gray-600 mt-2">Sin coincidencias</p>}
            </>
          )}
        </div>
      )}

      {/* Paso 3: historial */}
      {selectedPet && (
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Historial de {selectedPet.name}</h2>
            <Button onClick={openCreate}>Nuevo registro</Button>
          </div>

          {recordsLoading && <p className="text-sm text-gray-600">Cargando historial…</p>}
          {recordsError && <p className="text-sm text-red-700">{recordsError}</p>}
          {!recordsLoading && !recordsError && records.length === 0 && (
            <p className="text-sm text-gray-600">Sin registros todavía.</p>
          )}

          {!recordsLoading && records.length > 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded">
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "38%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "14%" }} />
                </colgroup>
                <thead className="bg-gray-100 text-left text-sm text-gray-700">
                  <tr>
                    <th className="px-4 py-3 border-b">Fecha</th>
                    <th className="px-4 py-3 border-b">Tipo</th>
                    <th className="px-4 py-3 border-b">Descripción</th>
                    <th className="px-4 py-3 border-b">Registrado por</th>
                    <th className="px-4 py-3 border-b">Acción</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-800">
                  {records.map((r, i) => (
                    <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-3 border-b">{fmtDate(r.occurred_at)}</td>
                      <td className="px-4 py-3 border-b">
                        <Badge className={TYPE_BADGE_COLOR[r.type]}>{RECORD_TYPE_LABELS[r.type]}</Badge>
                      </td>
                      <td className="px-4 py-3 border-b">{r.title}</td>
                      <td className="px-4 py-3 border-b">
                        {r.recorded_by_name ? `${r.recorded_by_name} (${r.recorded_by_role})` : r.recorded_by_role}
                      </td>
                      <td className="px-4 py-3 border-b">
                        <Button variant="outline" size="sm" onClick={() => setDetailRecord(r)}>
                          Ver detalle
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
                <span className="font-medium text-gray-900">Fecha:</span> {fmtDate(detailRecord.occurred_at)}
              </p>
              <p>
                <span className="font-medium text-gray-900">Descripción:</span> {detailRecord.title}
              </p>
              <p>
                <span className="font-medium text-gray-900">Registrado por:</span>{" "}
                {detailRecord.recorded_by_name
                  ? `${detailRecord.recorded_by_name} (${detailRecord.recorded_by_role})`
                  : detailRecord.recorded_by_role}
              </p>
              <div className="border-t pt-3">
                <p className="font-medium text-gray-900 mb-1">Datos</p>
                <div className="space-y-1">
                  {Object.entries(detailRecord.data).map(([k, v]) => (
                    <p key={k}>
                      <span className="text-gray-600">{k}:</span> {String(v)}
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
                className="w-full px-2 py-2 border border-gray-300 rounded text-gray-900"
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
                    className="w-full px-2 py-2 border border-gray-300 rounded text-gray-900"
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

          {createError && <p className="text-sm text-red-700">{createError}</p>}

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
