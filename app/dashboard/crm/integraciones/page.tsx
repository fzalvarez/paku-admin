"use client";

// Integraciones CRM (DEMO): configuración de envíos y futura conexión con plataformas externas.

import { useState } from "react";
import { BellRing, CreditCard, Download, FileSpreadsheet, Mail, MessageCircle, Megaphone, Network, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { selectCls } from "@/components/crm/CrmUi";
import { cn } from "@/lib/utils";
import { CLIENTES, SEGMENTOS, type Segmento } from "@/lib/mock/crm";
import { downloadCsv } from "@/lib/mock/finanzas";

type Estado = "conectado" | "disponible" | "por_evaluar" | "futuro";

const ESTADO: Record<Estado, { label: string; cls: string }> = {
  conectado: { label: "Conectado", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  disponible: { label: "Disponible", cls: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  por_evaluar: { label: "Por evaluar", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  futuro: { label: "Futuro", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

const INTEGRACIONES: { id: string; nombre: string; icon: LucideIcon; estado: Estado; uso: string; nota: string }[] = [
  {
    id: "push", nombre: "Avisos push de la app Paku", icon: BellRing, estado: "conectado",
    uso: "Recordatorios y campañas a quien tiene la app instalada.",
    nota: "Ya existe en el backend: hoy se usa para avisar cambios de estado de la orden.",
  },
  {
    id: "culqi", nombre: "Culqi (pagos)", icon: CreditCard, estado: "conectado",
    uso: "Fuente del gasto acumulado y de los cupones aplicados en cada pago.",
    nota: "Conectado vía paku-backend → culqi-python. No requiere configuración en el CRM.",
  },
  {
    id: "whatsapp", nombre: "WhatsApp Business (API de Meta)", icon: MessageCircle, estado: "por_evaluar",
    uso: "Recordatorios y reactivación por el canal que más usa el cliente.",
    nota: "Requiere plantillas aprobadas por Meta, número verificado y costo por conversación.",
  },
  {
    id: "email", nombre: "Correo (Brevo, Mailchimp u otro)", icon: Mail, estado: "por_evaluar",
    uso: "Boletines, resumen del servicio y promociones de temporada.",
    nota: "Todos los clientes tienen correo (es su usuario); falta consentimiento de marketing.",
  },
  {
    id: "meta_ads", nombre: "Audiencias de Meta / Google Ads", icon: Megaphone, estado: "futuro",
    uso: "Publicidad a clientes inactivos o a personas parecidas a los VIP.",
    nota: "Mientras tanto: exportar el segmento en CSV y subirlo a mano.",
  },
  {
    id: "crm_externo", nombre: "CRM externo (HubSpot u otro)", icon: Network, estado: "futuro",
    uso: "Solo si el equipo comercial crece y necesita un embudo de ventas.",
    nota: "Sincronizaría clientes, segmentos y órdenes por API o webhook.",
  },
];

export default function IntegracionesPage() {
  const [activas, setActivas] = useState<Record<string, boolean>>({ push: true, culqi: true });
  const [desde, setDesde] = useState("09:00");
  const [hasta, setHasta] = useState("19:00");
  const [maxSemana, setMaxSemana] = useState("2");
  const [segmento, setSegmento] = useState<Segmento>("inactivo");

  const exportar = () => {
    const lista = CLIENTES.filter((c) => c.segmento === segmento);
    downloadCsv(`audiencia-${segmento}.csv`, [
      ["email", "phone", "fn", "ln", "ct", "country"],
      ...lista.map((c) => {
        const [fn, ...ln] = c.nombre.split(" ");
        return [c.email, c.telefono.replace(/\s/g, ""), fn, ln.join(" "), c.distrito, "PE"];
      }),
    ]);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Integraciones CRM"
        description="Canales con los que el CRM se comunica con los clientes y plataformas externas que se podrían conectar."
        className="mb-0"
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {INTEGRACIONES.map((i) => {
          const Icon = i.icon;
          const habilitable = i.estado === "conectado" || i.estado === "disponible";
          return (
            <Card key={i.id}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.nombre}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", ESTADO[i.estado].cls)}>{ESTADO[i.estado].label}</span>
                  </div>
                  {habilitable && (
                    <Switch
                      checked={!!activas[i.id]}
                      disabled={i.id === "culqi"}
                      onCheckedChange={(v) => setActivas((p) => ({ ...p, [i.id]: v }))}
                    />
                  )}
                </div>
                <p className="text-sm">{i.uso}</p>
                <p className="text-xs text-muted-foreground">{i.nota}</p>
                {!habilitable && (
                  <Button size="sm" variant="outline" disabled className="w-full">Configurar (próximamente)</Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reglas de envío</CardTitle>
            <p className="text-xs text-muted-foreground">Se aplican a recordatorios y campañas por cualquier canal.</p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Enviar desde</Label>
                <Input type="time" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hasta</Label>
                <Input type="time" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Máximo de avisos por cliente a la semana</Label>
              <select className={cn(selectCls, "w-full")} value={maxSemana} onChange={(e) => setMaxSemana(e.target.value)}>
                {["1", "2", "3"].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <label className="flex items-start gap-2">
              <Switch checked disabled />
              <span>
                Respetar «Recibir recordatorios» de cada mascota
                <span className="block text-xs text-muted-foreground">Lo elige el dueño en la app; no se puede desactivar desde el admin.</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <Switch checked disabled />
              <span>
                No enviar promociones a quien tiene una orden en curso
                <span className="block text-xs text-muted-foreground">Evita ofrecer un descuento a quien ya reservó.</span>
              </span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="size-4" /> Exportar audiencia</CardTitle>
            <p className="text-xs text-muted-foreground">
              CSV con el formato de audiencias personalizadas de Meta y Google (correo, teléfono, nombre, ciudad y país).
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <Label>Segmento</Label>
              <select className={cn(selectCls, "w-full")} value={segmento} onChange={(e) => setSegmento(e.target.value as Segmento)}>
                {Object.entries(SEGMENTOS).map(([k, s]) => (
                  <option key={k} value={k}>{s.label} ({CLIENTES.filter((c) => c.segmento === k).length})</option>
                ))}
              </select>
            </div>
            <Button variant="outline" onClick={exportar}><Download className="size-4" /> Descargar CSV</Button>
            <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              Antes de usar datos de clientes en publicidad hay que contar con su consentimiento (Ley 29733 de protección de datos
              personales). Hoy la app no pide un consentimiento de marketing aparte: sería un cambio en el registro.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
