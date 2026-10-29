"use client";

// Recordatorios (DEMO): servicios recurrentes y avisos para los dueños de mascotas.

import { Suspense, useState } from "react";
import Link from "next/link";
import { Bell, Send, Smartphone } from "lucide-react";
import { DateRangeFilter, useDateRange } from "@/components/dashboard/DateRangeFilter";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FuenteDatos, Stat, selectCls } from "@/components/crm/CrmUi";
import { useDemoCrm } from "@/components/crm/DemoCrmProvider";
import { cn } from "@/lib/utils";
import { GROOMING_FREQUENCY_LABELS } from "@/lib/labels";
import {
  CLIENTES, FRECUENCIA_DIAS, HOY, PLANTILLAS, TIPOS_RECORDATORIO, diffDays, efectividadOctubre, fechaCorta,
  recordatoriosPendientes, rellenar, type EstadoRecordatorio, type GroomingFrequency, type Recordatorio, type TipoRecordatorio,
} from "@/lib/mock/crm";

const ESTADO: Record<EstadoRecordatorio, { label: string; cls: string }> = {
  vencido: { label: "Vencido", cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  esta_semana: { label: "Esta semana", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  proximo: { label: "Próximo", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

const TODOS = recordatoriosPendientes();

export default function RecordatoriosPage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando recordatorios...</p>}>
      <Recordatorios />
    </Suspense>
  );
}

function Recordatorios() {
  const { reglas, toggleRegla, enviados, marcarEnviado } = useDemoCrm();
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [sel, setSel] = useState<Recordatorio | null>(null);
  const range = useDateRange();

  const activos = TODOS.filter((r) => reglas[r.tipo]);
  const rows = activos.filter((r) => (!tipo || r.tipo === tipo) && (!estado || r.estado === estado) && range.inRange(r.fecha));
  const urgentes = activos.filter((r) => r.estado !== "proximo" && !enviados.has(r.id));
  const mascotas = CLIENTES.flatMap((c) => c.mascotas);
  const conAviso = mascotas.filter((m) => m.recibeRecordatorios).length;
  const ef = efectividadOctubre();
  const preview = sel ?? rows[0] ?? null;

  // Servicios recurrentes: frecuencia declarada por el dueño vs. la que realmente cumple
  const recurrencia = (Object.keys(FRECUENCIA_DIAS) as GroomingFrequency[]).map((f) => {
    const lista = CLIENTES.flatMap((c) => c.mascotas.filter((m) => m.groomingFrequency === f).map((m) => ({ c, m })));
    const reales = lista
      .map(({ c, m }) => c.visitas.filter((v) => v.mascotaId === m.id && !v.devuelto).map((v) => v.fecha))
      .filter((fs) => fs.length > 1)
      .map((fs) => diffDays(fs[fs.length - 1], fs[0]) / (fs.length - 1));
    const real = reales.length ? reales.reduce((a, n) => a + n, 0) / reales.length : null;
    const alDia = lista.filter(({ c, m }) => {
      const ult = c.visitas.filter((v) => v.mascotaId === m.id && !v.devuelto).at(-1);
      return ult && diffDays(HOY, ult.fecha) <= FRECUENCIA_DIAS[f] + 5;
    }).length;
    return { f, mascotas: lista.length, real, alDia };
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recordatorios"
        description="Avisos automáticos al dueño según la frecuencia de grooming, el antiparasitario y el cumpleaños de cada mascota."
        action={
          <Button disabled={!urgentes.length} onClick={() => marcarEnviado(urgentes.map((r) => r.id))}>
            <Send className="size-4" /> Enviar vencidos y de esta semana ({urgentes.length})
          </Button>
        }
        className="mb-0"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Por enviar esta semana" value={String(activos.filter((r) => r.estado === "esta_semana" && !enviados.has(r.id)).length)} />
        <Stat label="Vencidos sin aviso" value={String(activos.filter((r) => r.estado === "vencido" && !enviados.has(r.id)).length)} warn />
        <Stat label="Mascotas con recordatorios" value={`${conAviso} de ${mascotas.length}`} sub="Opción «Recibir recordatorios» de la mascota" />
        <Stat label="Volvieron tras el aviso" value={ef.enviados ? `${Math.round((ef.volvieron / ef.enviados) * 100)} %` : "—"} sub={`${ef.volvieron} de ${ef.enviados} avisos de baño en octubre`} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {(Object.keys(TIPOS_RECORDATORIO) as TipoRecordatorio[]).map((t) => (
          <Card key={t} className={cn(!reglas[t] && "opacity-60")}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-medium"><Bell className="size-4 text-primary" /> {TIPOS_RECORDATORIO[t].label}</p>
                <Switch checked={reglas[t]} onCheckedChange={() => toggleRegla(t)} />
              </div>
              <p className="text-xs text-muted-foreground">{TIPOS_RECORDATORIO[t].descripcion}</p>
              <p className="text-xs">
                <span className="text-muted-foreground">Se envía:</span>{" "}
                {PLANTILLAS[t].anticipacion ? `${PLANTILLAS[t].anticipacion} días antes` : "el mismo día"} · Push en la app
              </p>
              <p className="rounded-md bg-muted/50 p-2 text-xs italic text-muted-foreground">«{PLANTILLAS[t].titulo}»</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Próximos avisos</CardTitle>
            <div className="flex flex-wrap items-end gap-2">
              <DateRangeFilter range={range} />
              <select className={selectCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="">Todos los tipos</option>
                {Object.entries(TIPOS_RECORDATORIO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select className={selectCls} value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="">Todos</option>
                {Object.entries(ESTADO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Mascota</TableHead>
                  <TableHead>Dueño</TableHead>
                  <TableHead>Aviso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Sin avisos con estos filtros.</TableCell></TableRow>
                )}
                {rows.map((r) => {
                  const enviado = enviados.has(r.id);
                  return (
                    <TableRow key={r.id} className={cn("cursor-pointer", preview?.id === r.id && "bg-primary/5")} onClick={() => setSel(r)}>
                      <TableCell className="whitespace-nowrap">{fechaCorta(r.fecha)}</TableCell>
                      <TableCell className="font-medium">{r.mascota.nombre}</TableCell>
                      <TableCell>
                        <Link href={`/dashboard/crm/clientes?ver=${r.cliente.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                          {r.cliente.nombre}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {TIPOS_RECORDATORIO[r.tipo].label}
                        <span className="block text-xs text-muted-foreground">{r.detalle}</span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold",
                          enviado ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : ESTADO[r.estado].cls)}>
                          {enviado ? "Enviado" : ESTADO[r.estado].label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {!enviado && (
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); marcarEnviado([r.id]); }}>Enviar</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Smartphone className="size-4" /> Así le llega al dueño
          </p>
          <div className="mx-auto w-full max-w-[300px] rounded-[2rem] border-8 border-neutral-800 bg-gradient-to-b from-sky-100 to-indigo-100 p-3 pt-10 shadow-lg dark:from-slate-800 dark:to-indigo-950">
            <p className="text-center text-4xl font-light text-neutral-800 dark:text-neutral-100">9:00</p>
            <p className="mb-6 text-center text-xs text-neutral-600 dark:text-neutral-300">martes, 20 de octubre</p>
            {preview ? (
              <div className="rounded-2xl bg-white/90 p-3 text-neutral-900 shadow">
                <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                  <span className="flex size-4 items-center justify-center rounded bg-[#0052FF] text-[9px] font-bold text-white">P</span>
                  PAKU · ahora
                </div>
                <p className="mt-1 text-sm font-semibold">{rellenar(PLANTILLAS[preview.tipo].titulo, preview)}</p>
                <p className="text-xs text-neutral-600">{rellenar(PLANTILLAS[preview.tipo].cuerpo, preview)}</p>
              </div>
            ) : (
              <p className="text-center text-xs text-neutral-500">Selecciona un aviso</p>
            )}
            <div className="h-24" />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Servicios recurrentes</CardTitle>
          <p className="text-xs text-muted-foreground">Frecuencia de grooming que declaró el dueño frente a la que realmente cumple.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Frecuencia declarada</TableHead>
                <TableHead className="text-right">Mascotas</TableHead>
                <TableHead className="text-right">Intervalo real promedio</TableHead>
                <TableHead className="text-right">Al día</TableHead>
                <TableHead>Cumplimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recurrencia.map((r) => {
                const pct = r.mascotas ? r.alDia / r.mascotas : 0;
                return (
                  <TableRow key={r.f}>
                    <TableCell className="font-medium">{GROOMING_FREQUENCY_LABELS[r.f]}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.mascotas}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.real ? `${Math.round(r.real)} días` : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.alDia}</TableCell>
                    <TableCell className="w-48">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${pct * 100}%` }} /></div>
                        <span className="w-9 text-right text-xs tabular-nums">{Math.round(pct * 100)} %</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="pt-3 text-xs text-muted-foreground">«Al día»: su último servicio fue dentro de la frecuencia declarada (+5 días de tolerancia).</p>
        </CardContent>
      </Card>

      <FuenteDatos
        existe={[
          "Por mascota: frecuencia de grooming, «Recibir recordatorios», antiparasitario e intervalo, y fecha de nacimiento",
          "Fecha del último servicio de cada mascota (órdenes)",
          "Avisos push a la app del cliente (módulo de notificaciones)",
        ]}
        falta={[
          "Tarea programada en el backend que genere y envíe los avisos cada día",
          "Fecha de la última dosis de antiparasitario (hoy solo se guarda si lo usa y cada cuánto)",
          "Registro de avisos enviados para medir cuántos clientes vuelven a reservar",
        ]}
      />
    </div>
  );
}
