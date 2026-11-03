"use client";

// Boletas de venta con Nubefact: qué se puede y qué no se puede hacer desde Paku admin, según el manual de la API JSON
// de Nubefact (facturas, boletas y notas) y los datos que Paku ya tiene. Lo de arriba (conexión y datos de Paku) es
// real (C-47); la lista de capacidades es informativa: la emisión todavía no está implementada.

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Check, CircleSlash, Clock, HelpCircle, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { INVOICING_STATUS } from "@/components/integrations/NubefactCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getNubefactIntegration, type NubefactIntegration } from "@/lib/services/invoicing";

const MANUAL_URL = "https://www.nubefact.com/integracion";

type Estado = "listo" | "posible" | "no" | "decidir";

const ESTADO: Record<Estado, { label: string; icon: LucideIcon; cls: string }> = {
  listo: { label: "Ya en Paku", icon: Check, cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  posible: { label: "Posible · por implementar", icon: Clock, cls: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  no: { label: "No se puede", icon: CircleSlash, cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  decidir: { label: "Por decidir", icon: HelpCircle, cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
};

interface Item {
  titulo: string;
  detalle: string;
  /** Operación o campos del manual de Nubefact que lo respaldan. */
  api?: string;
  estado: Estado;
}

const PUEDE: Item[] = [
  { titulo: "Guardar la conexión con Nubefact", estado: "listo", api: "RUTA + TOKEN",
    detalle: "Ruta de la cuenta, token cifrado y serie de boletas en Configuración → Integraciones." },
  { titulo: "Probar la conexión sin emitir", estado: "listo", api: "consultar_comprobante",
    detalle: "Consulta una boleta que no existe: confirma que la ruta y el token sirven sin generar ningún comprobante." },
  { titulo: "Emitir la boleta de una orden pagada", estado: "posible", api: "generar_comprobante · tipo 2 · serie B…",
    detalle: "Nubefact genera el PDF y el XML, lo envía a SUNAT y guarda el CDR. Paku manda cliente, ítems, IGV y totales." },
  { titulo: "Consultar el estado de una boleta", estado: "posible", api: "consultar_comprobante",
    detalle: "Si SUNAT la aceptó (aceptada_por_sunat), su descripción o error, y si está anulada." },
  { titulo: "Ver y descargar PDF, XML y CDR", estado: "posible", api: "enlace_del_pdf · enlace_del_xml · enlace_del_cdr",
    detalle: "Desde la orden o el Reporte de ventas. PDF en A4, A5 o ticket (formato_de_pdf)." },
  { titulo: "Enviar la boleta al correo del cliente", estado: "posible", api: "enviar_automaticamente_al_cliente · cliente_email",
    detalle: "Lo envía Nubefact; o Paku con su propio correo (Resend) adjuntando el enlace del PDF." },
  { titulo: "Anular una boleta", estado: "posible", api: "generar_anulacion (motivo) · consultar_anulacion",
    detalle: "Con un motivo; SUNAT la procesa y devuelve un ticket. Después se consulta si la aceptó." },
  { titulo: "Nota de crédito sobre una boleta", estado: "posible", api: "generar_comprobante · tipo 3 · serie B…",
    detalle: "Para devoluciones totales o parciales o un descuento después de emitida." },
  { titulo: "Nota de débito", estado: "posible", api: "generar_comprobante · tipo 4",
    detalle: "Para cobrar un monto adicional sobre una boleta ya emitida." },
  { titulo: "Factura con RUC si el cliente la pide", estado: "posible", api: "generar_comprobante · tipo 1 · serie F…",
    detalle: "Fuera del alcance de boletas, pero la misma integración lo permite." },
  { titulo: "QR y hash para imprimir una representación propia", estado: "posible", api: "cadena_para_codigo_qr · codigo_hash",
    detalle: "Solo si se quisiera un formato de Paku en vez del PDF de Nubefact." },
];

const NO_PUEDE: Item[] = [
  { titulo: "Listar o buscar las boletas emitidas en Nubefact", estado: "no",
    detalle: "La API solo consulta una boleta por serie y número. Paku tendrá que guardar su propio registro de cada boleta." },
  { titulo: "Editar una boleta emitida", estado: "no",
    detalle: "Una boleta no se modifica: se anula o se corrige con una nota de crédito." },
  { titulo: "Emitir con una fecha anterior", estado: "no", api: "fecha_de_emision",
    detalle: "Según el manual, la fecha de emisión debe ser la del día." },
  { titulo: "Saltar o repetir números", estado: "no", api: "numero · error 23",
    detalle: "La numeración es correlativa por serie desde 1; si el número ya existe, Nubefact responde error 23." },
  { titulo: "Anular fuera de plazo", estado: "no", api: "error 22",
    detalle: "Fuera del plazo permitido Nubefact responde error 22. El manual no dice cuántos días: confirmarlo con el contador." },
  { titulo: "Crear series, unidades de medida o usuarios", estado: "no",
    detalle: "Se hace en el panel de Nubefact. Por API solo se usan (servicios: ZZ; productos: NIU)." },
  { titulo: "Probar en un ambiente separado", estado: "no",
    detalle: "No hay URL de pruebas: se usa una cuenta DEMO y Nubefact pide documentos de prueba antes de pasar a producción." },
  { titulo: "Reportes contables (registro de ventas, libros)", estado: "no",
    detalle: "Desde el panel de Nubefact o el sistema contable. En Paku queda el Reporte de ventas." },
];

const DECIDIR: Item[] = [
  { titulo: "¿Cuándo se emite?", estado: "decidir",
    detalle: "Al confirmarse el pago (tarjeta, Yape o efectivo) o al terminar el servicio." },
  { titulo: "Cliente sin DNI", estado: "decidir", api: "cliente_tipo_de_documento: 1 (DNI) o «-» (VARIOS)",
    detalle: "SUNAT pide identificar al comprador en boletas de más de S/ 700 (confirmar con el contador). ¿Pedir el DNI al pagar?" },
  { titulo: "Cargos extra por diferencia de peso", estado: "decidir",
    detalle: "Hoy son una orden de ajuste aparte: ¿boleta aparte o una sola boleta con el total?" },
  { titulo: "Descuentos de campaña", estado: "decidir", api: "total_descuento / descuento por ítem",
    detalle: "¿Se muestran como descuento en la boleta o se emite con el precio ya rebajado?" },
  { titulo: "IGV de los servicios", estado: "decidir", api: "tipo_de_igv · porcentaje_de_igv",
    detalle: "Lo normal es gravado con el IGV incluido en el precio; confirmarlo con el contador." },
  { titulo: "¿Quién envía la boleta al cliente?", estado: "decidir",
    detalle: "Nubefact por correo, el correo de Paku (Resend) o solo verla en la app." },
];

export default function NubefactCapacidadesPage() {
  const [data, setData] = useState<NubefactIntegration | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getNubefactIntegration()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el estado de Nubefact."));
  }, []);

  const r = data?.readiness;
  const dniPct = r && r.customers > 0 ? Math.round((r.customers_with_dni / r.customers) * 100) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Boletas de venta con Nubefact"
        description="Qué se puede y qué no se puede hacer desde Paku admin para emitir y consultar boletas."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/configuracion/integraciones"><ArrowLeft className="size-4" /> Integraciones</Link>
          </Button>
        }
        className="mb-0"
      />

      <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Hoy Paku solo guarda y prueba la conexión: <strong>todavía no emite boletas</strong>. Esta lista sale del manual
        de la API JSON de Nubefact (facturas, boletas y notas) y marca lo que falta decidir antes de emitir.{" "}
        <a href={MANUAL_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
          Ver la documentación de Nubefact
        </a>
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado en Paku</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Dato label="Conexión con Nubefact">
            {data ? (
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", INVOICING_STATUS[data.status].cls)}>
                {INVOICING_STATUS[data.status].label}
              </span>
            ) : "…"}
            {data && <p className="mt-1 text-xs text-muted-foreground">Serie de boletas: {data.boleta_series}</p>}
          </Dato>
          <Dato label="RUC de la empresa" warn={!!r && !r.company_ruc}>
            {r ? r.company_ruc ?? "Falta (Parámetros generales)" : "…"}
            {r?.company_name && <p className="mt-1 text-xs text-muted-foreground">{r.company_name}</p>}
          </Dato>
          <Dato label="IGV">{r ? `${r.igv_percent} %` : "…"}<p className="mt-1 text-xs text-muted-foreground">De Parámetros generales</p></Dato>
          <Dato label="Clientes con DNI" warn={dniPct != null && dniPct < 100}>
            {r ? `${r.customers_with_dni} de ${r.customers}` : "…"}
            {dniPct != null && <p className="mt-1 text-xs text-muted-foreground">{dniPct} % de los clientes activos</p>}
          </Dato>
        </CardContent>
      </Card>

      <Seccion titulo="Lo que se puede hacer" items={PUEDE} />
      <Seccion titulo="Lo que no se puede hacer" items={NO_PUEDE} />
      <Seccion titulo="Por decidir antes de emitir" items={DECIDIR} />
    </div>
  );
}

function Dato({ label, warn, children }: { label: string; warn?: boolean; children: ReactNode }) {
  return (
    <div className={cn("rounded-md border p-3", warn && "border-amber-300 dark:border-amber-800")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className={cn("mt-1 font-medium", warn && "text-amber-700 dark:text-amber-400")}>{children}</div>
    </div>
  );
}

function Seccion({ titulo, items }: { titulo: string; items: Item[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {items.map((i) => {
          const e = ESTADO[i.estado];
          const Icon = e.icon;
          return (
            <div key={i.titulo} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{i.titulo}</p>
                <p className="text-sm text-muted-foreground">{i.detalle}</p>
                {i.api && <p className="mt-0.5 font-mono text-xs text-muted-foreground">{i.api}</p>}
              </div>
              <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", e.cls)}>
                <Icon className="size-3.5" /> {e.label}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
