// Parámetros generales (DEMO): maqueta de la configuración general de la plataforma. No guarda nada.

import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SECCIONES: { titulo: string; campos: { label: string; placeholder: string }[] }[] = [
  {
    titulo: "Empresa",
    campos: [
      { label: "Nombre comercial", placeholder: "Paku" },
      { label: "RUC", placeholder: "20XXXXXXXXX" },
      { label: "Teléfono de contacto", placeholder: "+51 9XX XXX XXX" },
      { label: "Correo de contacto", placeholder: "hola@paku.com.pe" },
    ],
  },
  {
    titulo: "Operación",
    campos: [
      { label: "Zona horaria", placeholder: "America/Lima" },
      { label: "Moneda", placeholder: "PEN (S/)" },
      { label: "Horario de atención", placeholder: "08:00 – 18:00" },
      { label: "IGV", placeholder: "18 %" },
    ],
  },
  {
    titulo: "Reservas",
    campos: [
      { label: "Anticipación mínima para reservar", placeholder: "Ej. 1 día" },
      { label: "Tiempo para pagar una reserva", placeholder: "Ej. 15 minutos" },
    ],
  },
];

export default function ParametrosPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Parámetros generales"
        description="Datos de la empresa y valores por defecto de la plataforma."
        action={<Button disabled>Guardar cambios</Button>}
        className="mb-0"
      />

      {SECCIONES.map((s) => (
        <Card key={s.titulo}>
          <CardHeader>
            <CardTitle className="text-base">{s.titulo}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {s.campos.map((c) => (
              <div key={c.label} className="space-y-1.5">
                <Label>{c.label}</Label>
                <Input placeholder={c.placeholder} disabled />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
