// Integraciones (DEMO): maqueta de las integraciones de la plataforma. No conecta nada.
// Los canales del CRM (WhatsApp, correo, audiencias) están en CRM → Integraciones CRM; aquí solo se enlazan.

import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Estado = "en_uso" | "futuro";

const ESTADO: Record<Estado, { label: string; cls: string }> = {
  en_uso: { label: "En uso", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  futuro: { label: "Futuro", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

const GRUPOS: { titulo: string; items: { nombre: string; detalle: string; estado: Estado }[]; enlace?: { href: string; label: string } }[] = [
  {
    titulo: "Pasarelas de pago",
    items: [
      { nombre: "Culqi", detalle: "Cobros con tarjeta desde la app y la web.", estado: "en_uso" },
      { nombre: "Otras pasarelas", detalle: "Alternativa o respaldo de Culqi.", estado: "futuro" },
    ],
  },
  {
    titulo: "CRM",
    items: [
      { nombre: "Canales y plataformas del CRM", detalle: "WhatsApp, correo, audiencias de anuncios y CRM externo.", estado: "futuro" },
    ],
    enlace: { href: "/dashboard/crm/integraciones", label: "Ver Integraciones CRM" },
  },
  {
    titulo: "Sistemas contables",
    items: [
      { nombre: "Facturación electrónica (SUNAT)", detalle: "Emisión de boletas y facturas por cada pago.", estado: "futuro" },
      { nombre: "Software contable", detalle: "Envío de ventas, pagos y gastos para la contabilidad.", estado: "futuro" },
    ],
  },
];

export default function IntegracionesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Integraciones"
        description="Sistemas externos con los que se conecta o se podría conectar Paku."
        className="mb-0"
      />

      {GRUPOS.map((g) => (
        <Card key={g.titulo}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{g.titulo}</CardTitle>
            {g.enlace && (
              <Button asChild size="sm" variant="outline">
                <Link href={g.enlace.href}>{g.enlace.label}</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="divide-y">
            {g.items.map((i) => (
              <div key={i.nombre} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium">{i.nombre}</p>
                  <p className="text-sm text-muted-foreground">{i.detalle}</p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", ESTADO[i.estado].cls)}>
                  {ESTADO[i.estado].label}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
