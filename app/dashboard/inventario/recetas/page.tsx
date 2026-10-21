"use client";

// Inventario (DEMO): recetas de consumo estándar con las llaves de Pricing V2 y costeo de una orden.

import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDemoInventory } from "@/components/inventario/DemoInventoryProvider";
import { COSTEO_EJEMPLO, RECETAS, cantidad, costoReceta, costoUnitario, soles } from "@/lib/mock/inventario";

const Key = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs">{children}</span>
);

export default function RecetasPage() {
  const { insumos } = useDemoInventory();
  const c = COSTEO_EJEMPLO;
  const insumosCosto = RECETAS.filter((r) => c.recetas.includes(r.id)).reduce((a, r) => a + costoReceta(r, insumos), 0);
  const comision = c.venta * c.comisionPct;
  const margen = c.venta - insumosCosto - comision - c.variableGroomer - c.otrosDirectos;
  const lineas: [string, number][] = [
    ["Insumos (según receta)", insumosCosto],
    ["Comisión de pago (3.44 % + IGV)", comision],
    ["Variable del groomer", c.variableGroomer],
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
            <span className="ml-1">· pricing {c.pricingVersion} · receta R1</span>
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
        <div>
          <h2 className="text-lg font-semibold">Recetas de consumo estándar</h2>
          <p className="text-sm text-muted-foreground">Versión R1 · se identifican con los códigos de Pricing V2.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {RECETAS.map((r) => (
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
    </div>
  );
}
