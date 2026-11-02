"use client";

// Reporte de ventas (paku-backend C-41): servicios vendidos con filtros, totales y resúmenes. El backend calcula
// los montos; aquí solo se filtran, se muestran y se exportan.

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";
import { DateRangeFilter, useDateRange } from "@/components/dashboard/DateRangeFilter";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { OrderDetailSheet } from "@/components/orders/OrderDetailSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import { limaToday } from "@/lib/dates";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  label,
  orderStatusBadge,
  orderStatusLabel,
} from "@/lib/labels";
import { fmtYmd } from "@/lib/orders";
import { soles } from "@/lib/services/inventory";
import { getSalesReport, type DateBasis, type GroupTotal, type SalesReport } from "@/lib/services/sales";
import { cn } from "@/lib/utils";

const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

export default function VentasPage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando ventas...</p>}>
      <Ventas />
    </Suspense>
  );
}

function Ventas() {
  const today = limaToday();
  const range = useDateRange({ defaults: { desde: `${today.slice(0, 8)}01`, hasta: today } });
  const [basis, setBasis] = useState<DateBasis>("purchase");
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [method, setMethod] = useState("");
  const [service, setService] = useState("");
  const [groomer, setGroomer] = useState("");
  const [district, setDistrict] = useState("");
  const params = useSearchParams();
  const [campaign, setCampaign] = useState(params.get("campaign_id") ?? ""); // desde Campañas → Resultados
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // q con espera, para no consultar en cada tecla
  const [data, setData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reload, setReload] = useState(0); // al cambiar una orden desde su detalle

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    getSalesReport({
      date_from: range.desde, date_to: range.hasta, date_basis: basis, order_status: orderStatus,
      payment_status: paymentStatus, payment_method: method, service_id: service, groomer_id: groomer,
      district_id: district, campaign_id: campaign, q: query,
    })
      .then((r) => !cancelled && (setData(r), setError("")))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "No se pudo cargar el reporte."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [range.desde, range.hasta, basis, orderStatus, paymentStatus, method, service, groomer, district, campaign, query, reload]);

  const rows = data?.rows ?? [];
  const t = data?.totals;

  const exportar = () =>
    downloadCsv(`ventas-paku-${range.desde || "inicio"}-a-${range.hasta || today}.csv`, [
      ["orden", "fecha_compra", "fecha_servicio", "cliente", "email", "telefono", "mascota", "servicio", "adicionales",
        "subtotal", "descuento", "neto", "cargos_extra_pagados", "cobrado", "medio_pago", "estado_pago", "estado_orden",
        "groomer", "distrito", "campana"],
      ...rows.map((r) => [r.order_id, r.purchase_date, r.service_date ?? "", r.customer_name, r.customer_email,
        r.customer_phone ?? "", r.pet_name ?? "", r.service_name, r.addon_names.join(" / "), r.subtotal.toFixed(2),
        r.discount.toFixed(2), r.total.toFixed(2), r.extra_paid.toFixed(2), r.collected.toFixed(2),
        label(PAYMENT_METHOD_LABELS, r.payment_method), label(PAYMENT_STATUS_LABELS, r.payment_status),
        orderStatusLabel(r.order_status), r.groomer_name ?? "", r.district_name ?? "", r.campaign_name ?? ""]),
    ]);

  const select = (value: string, set: (v: string) => void, all: string, options: { value: string; label: string }[]) => (
    <select className={selectCls} value={value} onChange={(e) => set(e.target.value)}>
      <option value="">{all}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
  const fromLabels = (labels: Record<string, string>) => Object.entries(labels).map(([value, l]) => ({ value, label: l }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reporte de ventas"
        description="Servicios vendidos: una fila por orden, con sus cargos extra pagados. Fechas en hora de Lima."
        action={<Button variant="outline" onClick={exportar} disabled={!rows.length}><Download className="size-4" /> Exportar CSV</Button>}
        className="mb-0"
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <DateRangeFilter range={range} />
          <select className={selectCls} value={basis} onChange={(e) => setBasis(e.target.value as DateBasis)} aria-label="Las fechas filtran">
            <option value="purchase">Por fecha de compra</option>
            <option value="service">Por fecha del servicio</option>
          </select>
          <div className="relative w-full sm:w-64">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Cliente, mascota o n.º de orden" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {select(paymentStatus, setPaymentStatus, "Todos los pagos", fromLabels(PAYMENT_STATUS_LABELS))}
          {select(method, setMethod, "Todos los medios", fromLabels(PAYMENT_METHOD_LABELS))}
          {select(orderStatus, setOrderStatus, "Todos los estados", ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] })))}
          {select(service, setService, "Todos los servicios", data?.options.services ?? [])}
          {select(groomer, setGroomer, "Todos los groomers", data?.options.groomers ?? [])}
          {select(district, setDistrict, "Todos los distritos", data?.options.districts ?? [])}
          {select(campaign, setCampaign, "Todas las campañas", data?.options.campaigns ?? [])}
          <p className="text-xs text-muted-foreground">
            {loading ? "Cargando…" : `${rows.length} órdenes`} · Para ventas cobradas, filtra el pago en «Pagado».
          </p>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Tile label="Órdenes" value={t ? String(t.orders) : "—"} sub={t?.cancelled ? `${t.cancelled} canceladas` : undefined} />
        <Tile label="Neto vendido" value={soles(t?.total)} sub={t ? `Subtotal ${soles(t.subtotal)}` : undefined} />
        <Tile label="Descuentos de campaña" value={soles(t?.discount)} />
        <Tile label="Cobrado" value={soles(t?.collected)} sub={t?.extra_paid ? `Incluye ${soles(t.extra_paid)} de cargos extra` : undefined} />
        <Tile label="Ticket promedio" value={soles(t?.avg_ticket)} sub="Cobrado ÷ órdenes pagadas" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Summary title="Por servicio" groups={data?.by_service ?? []} />
        <Summary title="Por medio de pago" groups={(data?.by_payment_method ?? []).map((g) => ({ ...g, label: label(PAYMENT_METHOD_LABELS, g.key) }))} />
      </div>

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Compra</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Mascota</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead className="text-right">Neto</TableHead>
                <TableHead className="text-right">Cobrado</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Groomer</TableHead>
                <TableHead>Distrito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.order_id} className="cursor-pointer" onClick={() => setDetailId(r.order_id)}>
                  <TableCell className="whitespace-nowrap">{fmtYmd(r.purchase_date)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{fmtYmd(r.service_date)}</TableCell>
                  <TableCell>
                    <p className="font-medium">{r.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{r.customer_phone ?? r.customer_email}</p>
                  </TableCell>
                  <TableCell>{r.pet_name ?? "—"}</TableCell>
                  <TableCell>
                    <p>{r.service_name}</p>
                    {r.addon_names.length > 0 && <p className="text-xs text-muted-foreground">+ {r.addon_names.join(", ")}</p>}
                    {r.campaign_name && <p className="text-xs text-emerald-700 dark:text-emerald-400">{r.campaign_name} (−{soles(r.discount)})</p>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{soles(r.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {soles(r.collected)}
                    {r.extra_paid > 0 && <p className="text-xs text-muted-foreground">+{soles(r.extra_paid)} extra</p>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {label(PAYMENT_STATUS_LABELS, r.payment_status)}
                    <p className="text-muted-foreground">{label(PAYMENT_METHOD_LABELS, r.payment_method)}</p>
                  </TableCell>
                  <TableCell>
                    <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", orderStatusBadge(r.order_status))}>
                      {orderStatusLabel(r.order_status)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{r.groomer_name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{r.district_name ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-6 text-center text-muted-foreground">Sin ventas con estos filtros.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <OrderDetailSheet orderId={detailId} onClose={() => setDetailId(null)} onChanged={() => setReload((n) => n + 1)} />
    </div>
  );
}

function Tile({ label: l, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{l}</p>
        <p className="text-xl font-semibold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Summary({ title, groups }: { title: string; groups: GroupTotal[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{title.replace("Por ", "").replace(/^\w/, (c) => c.toUpperCase())}</TableHead>
              <TableHead className="text-right">Órdenes</TableHead>
              <TableHead className="text-right">Neto</TableHead>
              <TableHead className="text-right">Cobrado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <TableRow key={g.key ?? "none"}>
                <TableCell>{g.label}</TableCell>
                <TableCell className="text-right tabular-nums">{g.orders}</TableCell>
                <TableCell className="text-right tabular-nums">{soles(g.total)}</TableCell>
                <TableCell className="text-right tabular-nums">{soles(g.collected)}</TableCell>
              </TableRow>
            ))}
            {groups.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">—</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
