"use client";

// Ficha del cliente (paku-backend C-36): contacto, mascotas, historial de servicios, gasto y última visita.

import { useEffect, useState } from "react";
import { Bell, BellOff, Cat, Dog, Mail, MapPin, Phone } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ANTIPARASITIC_INTERVAL_LABELS, GROOMING_FREQUENCY_LABELS, SPECIES_LABELS, label } from "@/lib/labels";
import { fmtYmd } from "@/lib/orders";
import { fullName, getCustomer, type CustomerDetail } from "@/lib/services/customers";
import { soles } from "@/lib/services/inventory";
import { SegmentBadge } from "./CrmUi";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ClienteSheet({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  return (
    <Sheet open={!!userId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        {userId && (UUID.test(userId) ? (
          <FichaLoader key={userId} userId={userId} />
        ) : (
          // Enlaces desde vistas demo (Fidelización, Recordatorios) con clientes de ejemplo
          <p className="p-4 text-sm text-muted-foreground">Es un cliente de ejemplo de una vista demo; no existe en el sistema.</p>
        ))}
      </SheetContent>
    </Sheet>
  );
}

function FichaLoader({ userId }: { userId: string }) {
  const [c, setC] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getCustomer(userId).then(setC).catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el cliente."));
  }, [userId]);
  if (error) return <p className="p-4 text-sm text-destructive">{error}</p>;
  if (!c) return <p className="p-4 text-sm text-muted-foreground">Cargando…</p>;
  return <Ficha c={c} />;
}

const edad = (birth: string | null) => {
  if (!birth) return null;
  const years = Math.floor((Date.now() - new Date(`${birth}T00:00:00`).getTime()) / (365.25 * 86400000));
  return years >= 1 ? `${years} ${years === 1 ? "año" : "años"}` : "cachorro";
};

function Ficha({ c }: { c: CustomerDetail }) {
  const warn = c.segment === "en_riesgo" || c.segment === "inactivo";
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex flex-wrap items-center gap-2">
          {fullName(c)} <SegmentBadge segmento={c.segment} />
        </SheetTitle>
        <SheetDescription>Cliente desde {fmtYmd(c.registered_at.slice(0, 10))}</SheetDescription>
      </SheetHeader>

      <div className="space-y-5 px-4 pb-6">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {c.phone && <span className="flex items-center gap-1.5"><Phone className="size-4" /> {c.phone}</span>}
          <span className="flex items-center gap-1.5"><Mail className="size-4" /> {c.email}</span>
          {c.district_name && <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {c.district_name}</span>}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi label="Gasto acumulado" value={soles(c.spend)} />
          <Kpi label="Servicios" value={String(c.services)} sub={`Ticket ${soles(c.avg_ticket)}`} />
          <Kpi
            label="Última visita"
            value={fmtYmd(c.last_visit)}
            sub={c.days_since_last_visit == null ? undefined : c.days_since_last_visit === 0 ? "Hoy" : `Hace ${c.days_since_last_visit} días`}
            warn={warn}
          />
          <Kpi label="Frecuencia" value={c.avg_interval_days ? `${c.avg_interval_days} días` : "—"} sub={c.avg_interval_days ? "Promedio entre servicios" : "Un solo día de servicio"} />
        </div>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Mascotas</h3>
          {c.pets_detail.length === 0 && <p className="text-sm text-muted-foreground">Sin mascotas registradas.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {c.pets_detail.map((m) => {
              const Icon = m.species === "cat" ? Cat : Dog;
              return (
                <div key={m.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="size-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{m.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[label(SPECIES_LABELS, m.species), m.breed_name, m.weight_kg != null ? `${m.weight_kg} kg (${m.weight_code})` : null, edad(m.birth_date)]
                          .filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {m.receive_reminders
                      ? <span title="Recibe recordatorios"><Bell className="size-4 text-emerald-600" /></span>
                      : <span title="No recibe recordatorios"><BellOff className="size-4 text-muted-foreground" /></span>}
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                    <dt className="text-muted-foreground">Frecuencia de grooming</dt>
                    <dd>{label(GROOMING_FREQUENCY_LABELS, m.grooming_frequency)}</dd>
                    <dt className="text-muted-foreground">Antiparasitario</dt>
                    <dd>{m.antiparasitic ? label(ANTIPARASITIC_INTERVAL_LABELS, m.antiparasitic_interval) : "No"}</dd>
                    <dt className="text-muted-foreground">Servicios</dt>
                    <dd className="tabular-nums">{m.services}</dd>
                  </dl>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">
            Historial de servicios <span className="font-normal text-muted-foreground">· {c.visits.length} órdenes terminadas</span>
          </h3>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Mascota</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.visits.map((v) => (
                  <TableRow key={v.order_id} className={cn(!v.paid && "text-muted-foreground")}>
                    <TableCell className="whitespace-nowrap">{fmtYmd(v.date)}</TableCell>
                    <TableCell className="font-mono text-xs">{v.order_id.slice(0, 8)}</TableCell>
                    <TableCell>{v.pet_name ?? "—"}</TableCell>
                    <TableCell>
                      {v.service_name}
                      {v.addon_names.length > 0 && <span className="text-muted-foreground"> + {v.addon_names.join(", ")}</span>}
                      {!v.paid && <span className="block text-xs text-amber-700">Sin pagar · no suma al gasto</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{soles(v.amount)}</TableCell>
                  </TableRow>
                ))}
                {c.visits.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-4 text-center text-muted-foreground">Todavía no tiene servicios terminados.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </>
  );
}

function Kpi({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-3", warn && "border-amber-300 dark:border-amber-800")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold tabular-nums", warn && "text-amber-700 dark:text-amber-400")}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
