"use client";

// Clientes (DEMO): ficha, historial de servicios, gasto acumulado y última visita.

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClienteSheet } from "@/components/crm/ClienteSheet";
import { FuenteDatos, SegmentBadge, Stat, selectCls } from "@/components/crm/CrmUi";
import { cn } from "@/lib/utils";
import { CLIENTES, DISTRITOS, SEGMENTOS, clientePorId, fechaCorta, type ClienteCrm } from "@/lib/mock/crm";
import { downloadCsv } from "@/lib/mock/finanzas";
import { soles } from "@/lib/mock/inventario";

type Orden = "gasto" | "ultima" | "servicios";

export default function ClientesPage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando clientes...</p>}>
      <Clientes />
    </Suspense>
  );
}

function Clientes() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [segmento, setSegmento] = useState(params.get("segmento") ?? "");
  const [distrito, setDistrito] = useState("");
  const [orden, setOrden] = useState<Orden>("gasto");
  const abierto = clientePorId(params.get("ver") ?? "") ?? null;
  const ver = (c: ClienteCrm | null) => router.replace(c ? `${pathname}?ver=${c.id}` : pathname, { scroll: false });

  const texto = q.trim().toLowerCase();
  const rows = CLIENTES.filter(
    (c) =>
      (!segmento || c.segmento === segmento) &&
      (!distrito || c.distrito === distrito) &&
      (!texto ||
        c.nombre.toLowerCase().includes(texto) ||
        c.telefono.replace(/\s/g, "").includes(texto.replace(/\s/g, "")) ||
        c.mascotas.some((m) => m.nombre.toLowerCase().includes(texto))),
  ).sort((a, b) =>
    orden === "gasto" ? b.gasto - a.gasto : orden === "servicios" ? b.servicios - a.servicios : b.ultimaVisita.localeCompare(a.ultimaVisita),
  );

  const gastoTotal = CLIENTES.reduce((a, c) => a + c.gasto, 0);
  const activos = CLIENTES.filter((c) => c.diasSinVenir <= 45).length;
  const conRecompra = CLIENTES.filter((c) => c.servicios > 1).length;
  const mascotas = CLIENTES.reduce((a, c) => a + c.mascotas.length, 0);

  const exportar = () =>
    downloadCsv("clientes-paku.csv", [
      ["cliente", "nombre", "telefono", "email", "distrito", "alta", "mascotas", "servicios", "gasto_acumulado", "ticket_promedio", "primera_visita", "ultima_visita", "dias_sin_venir", "frecuencia_dias", "segmento"],
      ...rows.map((c) => [c.id, c.nombre, c.telefono, c.email, c.distrito, c.alta, c.mascotas.map((m) => m.nombre).join(" / "), c.servicios,
        c.gasto.toFixed(2), c.ticketPromedio.toFixed(2), c.primeraVisita, c.ultimaVisita, c.diasSinVenir, c.intervaloPromedio ?? "", SEGMENTOS[c.segmento].label]),
    ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clientes"
        description="Dueños de mascotas con al menos un servicio desde junio 2026 · Gasto, frecuencia y última visita calculados desde sus órdenes."
        action={<Button variant="outline" onClick={exportar}><Download className="size-4" /> Exportar CSV</Button>}
        className="mb-0"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clientes" value={String(CLIENTES.length)} sub={`${mascotas} mascotas`} />
        <Stat label="Activos (últimos 45 días)" value={String(activos)} sub={`${Math.round((activos / CLIENTES.length) * 100)} % del total`} />
        <Stat label="Volvieron a comprar" value={`${Math.round((conRecompra / CLIENTES.length) * 100)} %`} sub={`${conRecompra} con 2 o más servicios`} />
        <Stat label="Gasto promedio por cliente" value={soles(gastoTotal / CLIENTES.length)} sub={`${soles(gastoTotal)} en total`} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Nombre, teléfono o mascota" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={selectCls} value={segmento} onChange={(e) => setSegmento(e.target.value)}>
            <option value="">Todos los segmentos</option>
            {Object.entries(SEGMENTOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className={selectCls} value={distrito} onChange={(e) => setDistrito(e.target.value)}>
            <option value="">Todos los distritos</option>
            {DISTRITOS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select className={selectCls} value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
            <option value="gasto">Mayor gasto</option>
            <option value="ultima">Visita más reciente</option>
            <option value="servicios">Más servicios</option>
          </select>
          <p className="text-xs text-muted-foreground">{rows.length} clientes</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Mascotas</TableHead>
                <TableHead>Distrito</TableHead>
                <TableHead className="text-right">Servicios</TableHead>
                <TableHead className="text-right">Gasto acumulado</TableHead>
                <TableHead>Última visita</TableHead>
                <TableHead className="text-right">Frecuencia</TableHead>
                <TableHead>Segmento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => ver(c)}>
                  <TableCell>
                    <p className="font-medium">{c.nombre}</p>
                    <p className="text-xs text-muted-foreground">{c.telefono}</p>
                  </TableCell>
                  <TableCell>{c.mascotas.map((m) => m.nombre).join(", ")}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.distrito}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.servicios}</TableCell>
                  <TableCell className="text-right tabular-nums">{soles(c.gasto)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {fechaCorta(c.ultimaVisita)}
                    <span className={cn("block text-xs", c.diasSinVenir > 45 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                      {c.diasSinVenir === 0 ? "hoy" : `hace ${c.diasSinVenir} días`}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{c.intervaloPromedio ? `${c.intervaloPromedio} d` : "—"}</TableCell>
                  <TableCell><SegmentBadge segmento={c.segmento} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FuenteDatos
        existe={[
          "Cliente: nombre, teléfono, correo, distrito y fecha de alta (usuarios con rol user)",
          "Mascotas del cliente: especie, raza, peso, nacimiento y frecuencia de grooming",
          "Órdenes del cliente con total, adicionales y estado de pago (user_id en cada orden)",
        ]}
        falta={[
          "Un endpoint de resumen por cliente (gasto, servicios, última visita) para no traer todas las órdenes",
          "Nombre del cliente en la orden (ya pedido al backend)",
        ]}
      />

      <ClienteSheet cliente={abierto} onClose={() => ver(null)} />
    </div>
  );
}
