"use client";

// Inventario (DEMO): recetas de consumo estándar con las llaves de Pricing V2 y costeo de una orden.
// Las recetas se crean y editan en memoria (DemoInventoryProvider); editar sube la versión (R1 → R2).

import { useState } from "react";
import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDemoInventory } from "@/components/inventario/DemoInventoryProvider";
import { cn } from "@/lib/utils";
import {
  COSTEO_EJEMPLO, cantidad, costoReceta, costoUnitario, soles, type Insumo, type Receta,
} from "@/lib/mock/inventario";
import { ADICIONALES, PRECIOS, SERVICIOS, type ServiceCode, type WeightCode } from "@/lib/mock/ordenes";

const Key = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs">{children}</span>
);
const selectCls = "h-9 w-full rounded-md border bg-background px-2 text-sm";

// Rangos conocidos de la hoja de Pricing V2; los demás se escriben a mano.
const RANGO_PESO: Partial<Record<WeightCode, string>> = { W01: "≤5 kg", W02: ">5 a ≤15 kg", W03: ">15 a ≤25 kg" };

const siguienteVersion = (v: string) => `R${(Number(v.replace(/\D/g, "")) || 1) + 1}`;

export default function RecetasPage() {
  const { insumos, recetas, saveReceta } = useDemoInventory();
  const [editing, setEditing] = useState<Receta | null>(null);
  const [creating, setCreating] = useState(false);
  const c = COSTEO_EJEMPLO;
  const recetasCosteo = recetas.filter((r) => c.recetas.includes(r.id));
  const insumosCosto = recetasCosteo.reduce((a, r) => a + costoReceta(r, insumos), 0);
  const comision = c.comision;
  const margen = c.venta - insumosCosto - comision - c.variableGroomer - c.otrosDirectos;
  const lineas: [string, number][] = [
    ["Insumos (según receta)", insumosCosto],
    [`Comisión de pago (${c.medio}, referencial + IGV)`, comision],
    [`Variable del groomer (${c.puntos} pts × S/ 6)`, c.variableGroomer],
    ["Otros costos directos (combustible, traslado)", c.otrosDirectos],
  ];

  return (
    <div className="space-y-6">
      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="text-base">Costeo de una orden — margen real del servicio</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{c.orden}</span>
            <ArrowRight className="size-3.5" />
            {c.llave.map((k) => <Key key={k}>{k}</Key>)}
            <span className="ml-1">
              · pricing {c.pricingVersion} · receta {recetasCosteo.map((r) => `${r.id} ${r.version}`).join(" + ")}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between font-semibold">
              <dt>Venta neta</dt>
              <dd className="tabular-nums">{soles(c.venta)}</dd>
            </div>
            {lineas.map(([k, v]) => (
              <div key={k} className="flex justify-between text-muted-foreground">
                <dt>(−) {k}</dt>
                <dd className="tabular-nums">{soles(v)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <dt>Margen de contribución</dt>
              <dd className="tabular-nums text-emerald-600 dark:text-emerald-400">
                {soles(margen)} · {((margen / c.venta) * 100).toFixed(1)} %
              </dd>
            </div>
          </dl>
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Cómo se obtiene</p>
            <p className="mt-1">
              La misma combinación que define el precio (servicio + peso + pelaje + adicional) define la receta de insumos.
              Al terminar la orden se descuentan los insumos del stock y su costo entra al costeo, junto con la comisión
              de la pasarela y el costo del groomer.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Recetas de consumo estándar</h2>
            <p className="text-sm text-muted-foreground">
              Se identifican con los códigos de Pricing V2. Al editar una receta sube su versión; los consumos ya
              registrados se quedan con la versión anterior.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Nueva receta
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {recetas.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{r.servicio}</CardTitle>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Key>{r.serviceCode}</Key>
                      {r.weightCode !== "—" && <Key>{r.weightCode}</Key>}
                      <Key>{r.coatSegment}</Key>
                      {r.addonCode && <Key>{r.addonCode}</Key>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.rangoPeso} · {r.id} · {r.version}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Costo insumos</p>
                    <p className="text-lg font-semibold tabular-nums">{soles(costoReceta(r, insumos))}</p>
                    <Button size="sm" variant="ghost" className="mt-1 -mr-2" onClick={() => setEditing(r)}>
                      <Pencil className="size-3.5" /> Editar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.lineas.map((l) => {
                      const i = insumos.find((x) => x.sku === l.sku);
                      return (
                        <TableRow key={l.sku}>
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">{l.sku}</span> {i?.nombre}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{cantidad(l.cantidad)} {i?.unidadConsumo}</TableCell>
                          <TableCell className="text-right tabular-nums">{i ? soles(costoUnitario(i) * l.cantidad) : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {editing && (
        <RecetaDialog
          key={editing.id}
          receta={editing}
          insumos={insumos}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            saveReceta(r);
            setEditing(null);
          }}
        />
      )}
      {creating && (
        <RecetaDialog
          insumos={insumos}
          nextId={(addon) => {
            const prefix = addon ? "REC-ADD-" : "REC-";
            const n = recetas.filter((r) => (addon ? r.id.startsWith("REC-ADD-") : !r.id.startsWith("REC-ADD-"))).length + 1;
            return `${prefix}${String(n).padStart(3, "0")}`;
          }}
          existentes={recetas}
          onClose={() => setCreating(false)}
          onSave={(r) => {
            saveReceta(r);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

type LineaForm = { sku: string; cantidad: string };

/** Crear (sin `receta`) o editar una receta. Al editar, la llave de Pricing V2 queda fija: otra llave es otra receta. */
function RecetaDialog({
  receta, insumos, existentes = [], nextId, onClose, onSave,
}: {
  receta?: Receta;
  insumos: Insumo[];
  existentes?: Receta[];
  nextId?: (addon: boolean) => string;
  onClose: () => void;
  onSave: (r: Receta) => void;
}) {
  const editando = !!receta;
  const [tipo, setTipo] = useState<"servicio" | "adicional">(receta?.addonCode ? "adicional" : "servicio");
  const [serviceCode, setServiceCode] = useState<ServiceCode>("Clasico");
  const [weightCode, setWeightCode] = useState<WeightCode>("W01");
  const [rangoPeso, setRangoPeso] = useState(RANGO_PESO.W01 ?? "");
  const [addonCode, setAddonCode] = useState(Object.keys(ADICIONALES)[0]);
  const [coatSegment, setCoatSegment] = useState(receta?.coatSegment ?? "S1");
  const [lineas, setLineas] = useState<LineaForm[]>(
    receta ? receta.lineas.map((l) => ({ sku: l.sku, cantidad: String(l.cantidad) })) : [{ sku: "", cantidad: "" }],
  );

  const pesos = Object.keys(PRECIOS[serviceCode]) as WeightCode[];
  const cambiarServicio = (s: ServiceCode) => {
    setServiceCode(s);
    const w = (Object.keys(PRECIOS[s]) as WeightCode[]).includes(weightCode) ? weightCode : "W01";
    setWeightCode(w);
    setRangoPeso(RANGO_PESO[w] ?? "");
  };

  const setLinea = (idx: number, cambio: Partial<LineaForm>) =>
    setLineas((p) => p.map((l, k) => (k === idx ? { ...l, ...cambio } : l)));
  const usados = new Set(lineas.map((l) => l.sku).filter(Boolean));

  const lineasOk = lineas.length > 0 && lineas.every((l) => l.sku && Number(l.cantidad) > 0);
  // Misma llave que otra receta: la orden no sabría cuál usar.
  const duplicada =
    !editando &&
    existentes.some((r) =>
      tipo === "adicional"
        ? r.addonCode === addonCode && r.coatSegment === coatSegment.trim()
        : !r.addonCode && r.serviceCode === serviceCode && r.weightCode === weightCode && r.coatSegment === coatSegment.trim(),
    );
  const sinCambios =
    editando &&
    JSON.stringify(receta!.lineas) === JSON.stringify(lineas.map((l) => ({ sku: l.sku, cantidad: Number(l.cantidad) })));
  const valido = lineasOk && coatSegment.trim() && !duplicada && !sinCambios && (tipo === "adicional" || rangoPeso.trim());

  const costoDe = (ls: LineaForm[]) =>
    ls.reduce((a, l) => {
      const i = insumos.find((x) => x.sku === l.sku);
      return a + (i ? costoUnitario(i) * (Number(l.cantidad) || 0) : 0);
    }, 0);
  const costoNuevo = costoDe(lineas);
  const costoActual = receta ? costoReceta(receta, insumos) : null;

  const guardar = () => {
    const ls = lineas.map((l) => ({ sku: l.sku, cantidad: Number(l.cantidad) }));
    if (receta) {
      onSave({ ...receta, lineas: ls, version: siguienteVersion(receta.version) });
      return;
    }
    const base = { id: nextId!(tipo === "adicional"), coatSegment: coatSegment.trim(), version: "R1", lineas: ls };
    onSave(
      tipo === "adicional"
        ? { ...base, serviceCode: "Adicional", servicio: ADICIONALES[addonCode].nombre, weightCode: "—", rangoPeso: "Cualquiera", addonCode }
        : { ...base, serviceCode, servicio: SERVICIOS[serviceCode], weightCode, rangoPeso: rangoPeso.trim() },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editando ? `Editar receta · ${receta!.servicio}` : "Nueva receta"}</DialogTitle>
        </DialogHeader>

        {editando ? (
          <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-1">
              <Key>{receta!.serviceCode}</Key>
              {receta!.weightCode !== "—" && <Key>{receta!.weightCode}</Key>}
              <Key>{receta!.coatSegment}</Key>
              {receta!.addonCode && <Key>{receta!.addonCode}</Key>}
              <span className="ml-1 text-xs text-muted-foreground">
                {receta!.rangoPeso} · {receta!.id} · {receta!.version} → {siguienteVersion(receta!.version)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              La llave de Pricing V2 no se edita: para otra combinación, crea otra receta.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tipo">
              <select className={selectCls} value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
                <option value="servicio">Servicio base</option>
                <option value="adicional">Adicional</option>
              </select>
            </Field>
            {tipo === "servicio" ? (
              <>
                <Field label="Servicio">
                  <select className={selectCls} value={serviceCode} onChange={(e) => cambiarServicio(e.target.value as ServiceCode)}>
                    {(Object.keys(SERVICIOS) as ServiceCode[]).map((s) => (
                      <option key={s} value={s}>{s} · {SERVICIOS[s]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Peso">
                  <select
                    className={selectCls}
                    value={weightCode}
                    onChange={(e) => {
                      const w = e.target.value as WeightCode;
                      setWeightCode(w);
                      setRangoPeso(RANGO_PESO[w] ?? "");
                    }}
                  >
                    {pesos.map((w) => <option key={w}>{w}</option>)}
                  </select>
                </Field>
                <Field label="Rango de peso">
                  <Input value={rangoPeso} onChange={(e) => setRangoPeso(e.target.value)} placeholder=">25 a ≤40 kg" />
                </Field>
              </>
            ) : (
              <Field label="Adicional">
                <select className={selectCls} value={addonCode} onChange={(e) => setAddonCode(e.target.value)}>
                  {Object.entries(ADICIONALES).map(([k, a]) => <option key={k} value={k}>{k} · {a.nombre}</option>)}
                </select>
              </Field>
            )}
            <Field label="Segmento de pelaje">
              <Input value={coatSegment} onChange={(e) => setCoatSegment(e.target.value)} placeholder="S1, S4 | S5…" />
            </Field>
            {duplicada && (
              <p className="text-sm text-destructive sm:col-span-2">Ya existe una receta con esa llave. Edítala en lugar de crear otra.</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-semibold">Insumos por servicio</p>
          <div className="space-y-2">
            {lineas.map((l, idx) => {
              const i = insumos.find((x) => x.sku === l.sku);
              return (
                <div key={idx} className="grid grid-cols-[1fr_7rem_6rem_auto] items-center gap-2">
                  <select
                    aria-label="Insumo"
                    className={selectCls}
                    value={l.sku}
                    onChange={(e) => setLinea(idx, { sku: e.target.value })}
                  >
                    <option value="">Elegir insumo…</option>
                    {insumos.map((x) => (
                      <option key={x.sku} value={x.sku} disabled={usados.has(x.sku) && x.sku !== l.sku}>
                        {x.sku} · {x.nombre}
                      </option>
                    ))}
                  </select>
                  <div className="relative">
                    <Input
                      aria-label="Cantidad"
                      type="number"
                      min={0}
                      step="any"
                      className={cn(i && "pr-14")}
                      value={l.cantidad}
                      onChange={(e) => setLinea(idx, { cantidad: e.target.value })}
                    />
                    {i && (
                      <span className="pointer-events-none absolute top-2 right-2 text-xs text-muted-foreground">{i.unidadConsumo}</span>
                    )}
                  </div>
                  <span className="text-right text-sm tabular-nums text-muted-foreground">
                    {i ? soles(costoUnitario(i) * (Number(l.cantidad) || 0)) : "—"}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Quitar insumo"
                    disabled={lineas.length === 1}
                    onClick={() => setLineas((p) => p.filter((_, k) => k !== idx))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={usados.size >= insumos.length}
            onClick={() => setLineas((p) => [...p, { sku: "", cantidad: "" }])}
          >
            <Plus className="size-4" /> Agregar insumo
          </Button>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t pt-3 text-sm">
          <span className="text-muted-foreground">Costo de insumos por servicio</span>
          <span className="text-base font-semibold tabular-nums">
            {soles(costoNuevo)}
            {costoActual != null && costoNuevo !== costoActual && (
              <span className={cn("ml-2 text-xs", costoNuevo > costoActual ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                {costoNuevo > costoActual ? "+" : "−"}{soles(Math.abs(costoNuevo - costoActual))} vs. {receta!.version}
              </span>
            )}
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!valido} onClick={guardar}>
            {editando ? `Guardar como ${siguienteVersion(receta!.version)}` : "Crear receta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
