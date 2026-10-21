"use client";

// Campañas y promociones (DEMO): descuentos, promociones y acciones para incentivar la recompra.

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Smartphone, Zap } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FuenteDatos, Stat, selectCls } from "@/components/crm/CrmUi";
import { useDemoCrm } from "@/components/crm/DemoCrmProvider";
import { cn } from "@/lib/utils";
import {
  CANALES, CLIENTES, ESTADO_CAMPANA, HOY, SEGMENTOS, addDays, audiencia, beneficioTexto, fechaCorta,
  type Campana, type Canal, type TipoBeneficio,
} from "@/lib/mock/crm";
import { soles } from "@/lib/mock/inventario";
import { ADICIONALES } from "@/lib/mock/ordenes";

const SEGMENTO_LABEL = (s: Campana["segmento"]) =>
  s === "todos" ? "Todos los clientes" : s === "cumpleanos" ? "Cumpleaños del mes" : SEGMENTOS[s].label;

export default function CampanasPage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando campañas...</p>}>
      <Campanas />
    </Suspense>
  );
}

function Campanas() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { campanas, setEstadoCampana } = useDemoCrm();
  const nueva = params.get("nueva"); // segmento con que abrir el formulario (desde Fidelización)
  const abrir = (segmento: string | null) =>
    router.replace(segmento ? `${pathname}?nueva=${segmento}` : pathname, { scroll: false });

  const activas = campanas.filter((c) => c.estado === "activa").length;
  const usos = campanas.reduce((a, c) => a + (c.usos ?? 0), 0);
  const descuento = campanas.reduce((a, c) => a + (c.descuentoOtorgado ?? 0), 0);
  const ventas = campanas.reduce((a, c) => a + (c.ventasAtribuidas ?? 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Campañas y promociones"
        description="Cupones, descuentos y beneficios por segmento para que el cliente vuelva a reservar."
        action={<Button onClick={() => abrir("todos")}><Plus className="size-4" /> Nueva campaña</Button>}
        className="mb-0"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Campañas activas" value={String(activas)} sub={`${campanas.length} en total`} />
        <Stat label="Cupones usados (octubre)" value={String(usos)} />
        <Stat label="Descuento otorgado" value={soles(descuento)} sub="Cuadra con «Descuentos» del Cierre mensual" />
        <Stat label="Ventas con cupón" value={soles(ventas)} sub={usos ? `Ticket ${soles(ventas / usos)}` : undefined} />
      </div>

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaña</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Beneficio</TableHead>
                <TableHead>Canales</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead className="text-right">Usos</TableHead>
                <TableHead className="text-right">Descuento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {campanas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="flex items-center gap-1.5 font-medium">
                      {c.nombre}
                      {c.automatica && <span title="Automática: se envía sola al entrar al segmento"><Zap className="size-3.5 text-amber-500" /></span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.objetivo}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {SEGMENTO_LABEL(c.segmento)}
                    <span className="block text-xs text-muted-foreground">{audiencia(c.segmento)} clientes</span>
                  </TableCell>
                  <TableCell>
                    {beneficioTexto(c)}
                    <span className="block font-mono text-xs text-muted-foreground">{c.codigo}</span>
                  </TableCell>
                  <TableCell className="text-xs">{c.canales.map((k) => CANALES[k]).join(" · ")}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {fechaCorta(c.inicio)} → {c.fin ? fechaCorta(c.fin) : "sin fin"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.usos ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.descuentoOtorgado != null ? soles(c.descuentoOtorgado) : "—"}</TableCell>
                  <TableCell>
                    <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", ESTADO_CAMPANA[c.estado].cls)}>
                      {ESTADO_CAMPANA[c.estado].label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {(c.estado === "borrador" || c.estado === "programada") && (
                      <Button size="sm" variant="outline" onClick={() => setEstadoCampana(c.id, "activa")}>Activar</Button>
                    )}
                    {c.estado === "activa" && (
                      <Button size="sm" variant="ghost" onClick={() => setEstadoCampana(c.id, "finalizada")}>Finalizar</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reglas de las promociones</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-6 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p>• El descuento se aplica en el carrito sobre el precio de Pricing V2 (servicio + adicionales), antes de pagar.</p>
          <p>• Un cupón por orden y uno por cliente por campaña; no son acumulables.</p>
          <p>• El monto y el motivo quedan en la orden: así aparecen en Pagos y en «Descuentos» del Cierre mensual.</p>
          <p>• «Adicional gratis» agrega el adicional a precio cero: el groomer lo ve en la orden como cualquier adicional.</p>
          <p>• Las campañas automáticas se envían cuando el cliente entra al segmento (p. ej. pasa a inactivo).</p>
          <p>• Los avisos respetan «Recibir recordatorios» de la mascota y el horario de envío de Integraciones.</p>
        </CardContent>
      </Card>

      <FuenteDatos
        existe={[
          "Segmentos y audiencia (ver Fidelización) desde las órdenes reales",
          "Avisos push a la app del cliente (módulo de notificaciones del backend)",
          "Adicionales y precios de Pricing V2 para el beneficio «adicional gratis»",
        ]}
        falta={[
          "Cupones en el backend: código, vigencia, usos y aplicación en el carrito",
          "Campo de descuento y motivo en la orden (hoy la orden solo guarda el total)",
          "Envío masivo de avisos por segmento (hoy solo se avisa por estado de la orden)",
        ]}
      />

      <NuevaCampanaDialog segmento={nueva} onClose={() => abrir(null)} />
    </div>
  );
}

function NuevaCampanaDialog({ segmento, onClose }: { segmento: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!segmento} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {/* key: reinicia el formulario cada vez que se abre con otro segmento */}
        {segmento && <Formulario key={segmento} segmentoInicial={segmento} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

const SUGERENCIAS: Record<string, { nombre: string; beneficio: TipoBeneficio; valor: number; addonCode?: string; codigo: string }> = {
  inactivo: { nombre: "Te extrañamos", beneficio: "porcentaje", valor: 15, codigo: "VUELVE15" },
  en_riesgo: { nombre: "Tu mascota te espera", beneficio: "monto", valor: 15, codigo: "PAKU15" },
  sin_recompra: { nombre: "Segundo servicio con regalo", beneficio: "adicional_gratis", valor: 25, addonCode: "ADD_RETOQUE", codigo: "SEGUNDO" },
  nuevo: { nombre: "Bienvenida", beneficio: "porcentaje", valor: 10, codigo: "BIENVENIDA10" },
  vip: { nombre: "Gracias por ser VIP", beneficio: "adicional_gratis", valor: 30, addonCode: "ADD_CORTE_EST", codigo: "VIPPAKU" },
  recurrente: { nombre: "Combo mensual", beneficio: "monto", valor: 10, codigo: "MES10" },
  cumpleanos: { nombre: "Feliz cumpleaños", beneficio: "adicional_gratis", valor: 30, addonCode: "ADD_CORTE_EST", codigo: "CUMPLEPAKU" },
  todos: { nombre: "", beneficio: "porcentaje", valor: 10, codigo: "" },
};

function Formulario({ segmentoInicial, onClose }: { segmentoInicial: string; onClose: () => void }) {
  const { addCampana } = useDemoCrm();
  const sug = SUGERENCIAS[segmentoInicial] ?? SUGERENCIAS.todos;
  const [nombre, setNombre] = useState(sug.nombre);
  const [segmento, setSegmento] = useState<Campana["segmento"]>(segmentoInicial as Campana["segmento"]);
  const [beneficio, setBeneficio] = useState<TipoBeneficio>(sug.beneficio);
  const [valor, setValor] = useState(String(sug.valor));
  const [addonCode, setAddonCode] = useState(sug.addonCode ?? "ADD_RETOQUE");
  const [codigo, setCodigo] = useState(sug.codigo);
  const [canales, setCanales] = useState<Canal[]>(["push"]);
  const [inicio, setInicio] = useState(addDays(HOY, 1));
  const [fin, setFin] = useState(addDays(HOY, 31));
  const [automatica, setAutomatica] = useState(false);

  const alcance = audiencia(segmento);
  const clientes = segmento === "todos" || segmento === "cumpleanos" ? CLIENTES : CLIENTES.filter((c) => c.segmento === segmento);
  const ticket = clientes.length ? clientes.reduce((a, c) => a + c.ticketPromedio, 0) / clientes.length : 0;
  const v = beneficio === "adicional_gratis" ? ADICIONALES[addonCode].precio : Number(valor) || 0;
  const costoPorUso = beneficio === "porcentaje" ? (ticket * v) / 100 : v;
  const usosEsperados = Math.round(alcance * 0.2); // supuesto: 20 % de redención
  const valido = nombre.trim() && codigo.trim() && v > 0 && canales.length > 0 && alcance > 0;

  const guardar = () => {
    addCampana({
      nombre: nombre.trim(), objetivo: `Campaña para ${SEGMENTO_LABEL(segmento).toLowerCase()}`, segmento, beneficio, valor: v,
      addonCode: beneficio === "adicional_gratis" ? addonCode : undefined, codigo: codigo.trim().toUpperCase(), canales,
      inicio, fin, estado: inicio <= HOY ? "activa" : "programada", automatica,
    });
    onClose();
  };
  const toggleCanal = (k: Canal) => setCanales((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const beneficioActual = beneficioTexto({ beneficio, valor: v, addonCode });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nueva campaña</DialogTitle>
        <DialogDescription>Se guarda solo en esta demo; no se envía nada a los clientes.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 md:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Te extrañamos" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Segmento</Label>
              <select className={cn(selectCls, "w-full")} value={segmento} onChange={(e) => setSegmento(e.target.value as Campana["segmento"])}>
                <option value="todos">Todos los clientes</option>
                {Object.entries(SEGMENTOS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                <option value="cumpleanos">Cumpleaños del mes</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Código del cupón</Label>
              <Input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} className="font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Beneficio</Label>
              <select className={cn(selectCls, "w-full")} value={beneficio} onChange={(e) => setBeneficio(e.target.value as TipoBeneficio)}>
                <option value="porcentaje">% de descuento</option>
                <option value="monto">Monto fijo (S/)</option>
                <option value="adicional_gratis">Adicional gratis</option>
              </select>
            </div>
            {beneficio === "adicional_gratis" ? (
              <div className="space-y-1.5">
                <Label>Adicional</Label>
                <select className={cn(selectCls, "w-full")} value={addonCode} onChange={(e) => setAddonCode(e.target.value)}>
                  {Object.entries(ADICIONALES).map(([k, a]) => <option key={k} value={k}>{a.nombre} ({soles(a.precio)})</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>{beneficio === "porcentaje" ? "Porcentaje" : "Monto S/"}</Label>
                <Input type="number" min={1} value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Desde</Label>
              <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hasta</Label>
              <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Canales</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CANALES) as Canal[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleCanal(k)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs",
                    canales.includes(k) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
                  )}
                >
                  {CANALES[k]}{k !== "push" && " · requiere integración"}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={automatica} onCheckedChange={setAutomatica} />
            Automática: enviar a cada cliente cuando entre al segmento
          </label>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="text-xs text-muted-foreground">Alcance</p>
            <p className="text-xl font-semibold tabular-nums">{alcance} clientes</p>
            <div className="mt-2 space-y-0.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Ticket promedio</span><span className="tabular-nums">{soles(ticket)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Costo por uso</span><span className="tabular-nums">{soles(costoPorUso)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Usos esperados (20 %)</span><span className="tabular-nums">{usosEsperados}</span></div>
              <div className="flex justify-between font-medium"><span>Descuento estimado</span><span className="tabular-nums">{soles(usosEsperados * costoPorUso)}</span></div>
              <div className="flex justify-between font-medium"><span>Venta esperada</span><span className="tabular-nums">{soles(usosEsperados * (ticket - (beneficio === "adicional_gratis" ? 0 : costoPorUso)))}</span></div>
            </div>
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Smartphone className="size-3.5" /> Vista del aviso push</p>
            <div className="rounded-xl bg-neutral-900 p-2.5 text-white shadow">
              <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                <span className="flex size-4 items-center justify-center rounded bg-[#0052FF] text-[9px] font-bold text-white">P</span>
                PAKU · ahora
              </div>
              <p className="mt-1 text-xs font-semibold">{nombre.trim() || "Nombre de la campaña"} 🐾</p>
              <p className="text-xs text-neutral-300">
                {beneficioActual} en tu próxima reserva con el código {codigo || "CODIGO"}.{fin ? ` Válido hasta el ${fechaCorta(fin)}.` : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar} disabled={!valido}>{inicio <= HOY ? "Crear y activar" : "Programar campaña"}</Button>
      </DialogFooter>
    </>
  );
}
