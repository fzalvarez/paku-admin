"use client";

// Ficha del cliente (DEMO): datos de contacto, mascotas, historial de servicios, gasto y última visita.

import { Bell, BellOff, Cat, Dog, Mail, MapPin, Phone } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ANTIPARASITIC_INTERVAL_LABELS, GROOMING_FREQUENCY_LABELS, SPECIES_LABELS, label } from "@/lib/labels";
import { HOY, diffDays, fechaCorta, mascotaDe, type ClienteCrm } from "@/lib/mock/crm";
import { soles } from "@/lib/mock/inventario";
import { ADICIONALES, SERVICIOS } from "@/lib/mock/ordenes";
import { SegmentBadge } from "./CrmUi";

export function ClienteSheet({ cliente, onClose }: { cliente: ClienteCrm | null; onClose: () => void }) {
  return (
    <Sheet open={!!cliente} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        {cliente && <Ficha c={cliente} />}
      </SheetContent>
    </Sheet>
  );
}

function Ficha({ c }: { c: ClienteCrm }) {
  const historial = [...c.visitas].reverse();
  const descuentos = c.visitas.reduce((a, v) => a + v.descuento, 0);
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex flex-wrap items-center gap-2">
          {c.nombre} <SegmentBadge segmento={c.segmento} />
        </SheetTitle>
        <SheetDescription>
          {c.id} · Cliente desde {fechaCorta(c.alta)} {c.alta.slice(0, 4)}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 px-4 pb-6">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Phone className="size-4" /> {c.telefono}</span>
          <span className="flex items-center gap-1.5"><Mail className="size-4" /> {c.email}</span>
          <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {c.distrito}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi label="Gasto acumulado" value={soles(c.gasto)} />
          <Kpi label="Servicios" value={String(c.servicios)} sub={`Ticket ${soles(c.ticketPromedio)}`} />
          <Kpi
            label="Última visita"
            value={fechaCorta(c.ultimaVisita)}
            sub={c.diasSinVenir === 0 ? "Hoy" : `Hace ${c.diasSinVenir} días`}
            warn={c.segmento === "en_riesgo" || c.segmento === "inactivo"}
          />
          <Kpi label="Frecuencia" value={c.intervaloPromedio ? `${c.intervaloPromedio} días` : "—"} sub={c.intervaloPromedio ? "Promedio entre servicios" : "Un solo servicio"} />
        </div>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Mascotas</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {c.mascotas.map((m) => {
              const Icon = m.especie === "cat" ? Cat : Dog;
              const servicios = c.visitas.filter((v) => v.mascotaId === m.id && !v.devuelto).length;
              return (
                <div key={m.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="size-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{m.nombre}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {label(SPECIES_LABELS, m.especie)} · {m.raza} · {m.weightCode} · {diffDays(HOY, m.nacimiento) >= 365 ? `${Math.floor(diffDays(HOY, m.nacimiento) / 365)} años` : "cachorro"}
                      </p>
                    </div>
                    {m.recibeRecordatorios
                      ? <span title="Recibe recordatorios"><Bell className="size-4 text-emerald-600" /></span>
                      : <span title="No recibe recordatorios"><BellOff className="size-4 text-muted-foreground" /></span>}
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                    <dt className="text-muted-foreground">Frecuencia de grooming</dt>
                    <dd>{label(GROOMING_FREQUENCY_LABELS, m.groomingFrequency)}</dd>
                    <dt className="text-muted-foreground">Antiparasitario</dt>
                    <dd>{m.antiparasitario ? label(ANTIPARASITIC_INTERVAL_LABELS, m.antiparasitario) : "No"}</dd>
                    <dt className="text-muted-foreground">Servicios</dt>
                    <dd className="tabular-nums">{servicios}</dd>
                  </dl>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">
            Historial de servicios <span className="font-normal text-muted-foreground">· {c.visitas.length} órdenes desde junio</span>
          </h3>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Mascota</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.map((v) => (
                  <TableRow key={v.orden} className={cn(v.devuelto && "text-muted-foreground")}>
                    <TableCell className="whitespace-nowrap">{fechaCorta(v.fecha)}</TableCell>
                    <TableCell className="font-mono text-xs">{v.orden}</TableCell>
                    <TableCell>{mascotaDe(c, v.mascotaId)?.nombre}</TableCell>
                    <TableCell>
                      {SERVICIOS[v.serviceCode]}
                      {v.addonCodes.length > 0 && <span className="text-muted-foreground"> + {v.addonCodes.map((a) => ADICIONALES[a].nombre).join(", ")}</span>}
                      {v.motivoDescuento && <span className="block text-xs text-emerald-700 dark:text-emerald-400">{v.motivoDescuento} (−{soles(v.descuento)})</span>}
                      {v.devuelto && <span className="block text-xs text-red-600 dark:text-red-400">Devuelto · no suma al gasto</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{soles(v.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {descuentos > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Descuentos recibidos en total: {soles(descuentos)}</p>
          )}
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
