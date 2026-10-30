"use client";

// Campañas y promociones (paku-backend C-38): descuentos por público (segmento de Clientes, todos, primera
// compra o cumpleaños). Automáticas (se aplican solas al comprar) o con cupón; se usa solo la mejor por orden.
// El envío de avisos por los canales todavía no existe: esa parte sigue siendo demo.

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Smartphone, Zap } from "lucide-react";
import { DateRangeFilter, useDateRange } from "@/components/dashboard/DateRangeFilter";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { DemoBadge } from "@/components/demo/DemoBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Stat, selectCls } from "@/components/crm/CrmUi";
import { limaToday, addDays } from "@/lib/dates";
import { CAMPAIGN_BENEFIT_LABELS, CAMPAIGN_STATE_LABELS, label } from "@/lib/labels";
import { fmtYmd } from "@/lib/orders";
import {
  createCampaign,
  getCampaignConfig,
  listCampaigns,
  updateCampaign,
  type BenefitType,
  type Campaign,
  type CampaignConfig,
  type CampaignStatus,
  type Channel,
} from "@/lib/services/campaigns";
import { soles } from "@/lib/services/inventory";
import { listAddons, listCategories, listProducts } from "@/lib/services/pricing";
import { cn } from "@/lib/utils";

const STATE_CLS: Record<string, string> = {
  activa: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  programada: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  borrador: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pausada: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  finalizada: "bg-neutral-100 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400",
};

export default function CampanasPage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando campañas...</p>}>
      <Campanas />
    </Suspense>
  );
}

type Addon = { code: string; name: string };

function Campanas() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const nueva = params.get("nueva"); // público con que abrir el formulario (desde Fidelización)
  const range = useDateRange();
  const [config, setConfig] = useState<CampaignConfig | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Campaign | null>(null);

  const abrir = (audiencia: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (audiencia) next.set("nueva", audiencia);
    else next.delete("nueva");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const load = useCallback(async () => {
    try {
      setCampaigns(await listCampaigns());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las campañas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    getCampaignConfig().then(setConfig).catch(() => setConfig(null));
    // Códigos de adicional (ADD_…) de todas las categorías, para "adicional gratis"
    (async () => {
      try {
        const products = (await Promise.all((await listCategories()).map((c) => listProducts(c.id)))).flat();
        const all = (await Promise.all(products.map((p) => listAddons(p.id)))).flat();
        const byCode = new Map<string, string>();
        for (const a of all) if (a.code && !byCode.has(a.code)) byCode.set(a.code, a.name);
        setAddons([...byCode].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
        setAddons([]);
      }
    })();
  }, [load]);

  async function setStatus(c: Campaign, status: CampaignStatus) {
    setBusy(c.id);
    try {
      await updateCampaign(c.id, { status });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar el estado.");
    } finally {
      setBusy(null);
    }
  }

  // Campañas vigentes en algún momento del período elegido.
  const lista = campaigns.filter((c) => range.overlaps(c.starts_on, c.ends_on));
  const activas = lista.filter((c) => c.state === "activa").length;
  const usos = lista.reduce((a, c) => a + c.paid_uses, 0);
  const descuento = lista.reduce((a, c) => a + c.discount_given, 0);
  const ventas = lista.reduce((a, c) => a + c.sales, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Campañas y promociones"
        description="Cupones y descuentos por público. Las automáticas se aplican solas al comprar; si aplican varias, el cliente recibe solo la de mayor descuento."
        action={<Button onClick={() => abrir("todos")} disabled={!config}><Plus className="size-4" /> Nueva campaña</Button>}
        className="mb-0"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Campañas activas" value={String(activas)} sub={`${lista.length} en el período`} />
        <Stat label="Usos en órdenes pagadas" value={String(usos)} />
        <Stat label="Descuento otorgado" value={soles(descuento)} />
        <Stat label="Ventas con campaña (neto)" value={soles(ventas)} sub={usos ? `Ticket ${soles(ventas / usos)}` : undefined} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-4">
          <DateRangeFilter range={range} />
          <p className="text-xs text-muted-foreground">Muestra las campañas vigentes en algún día del período.</p>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaña</TableHead>
                <TableHead>Público</TableHead>
                <TableHead>Beneficio</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead className="text-right">Usos</TableHead>
                <TableHead className="text-right">Descuento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && lista.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">Sin campañas en ese período.</TableCell></TableRow>
              )}
              {lista.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="flex items-center gap-1.5 font-medium">
                      {c.name}
                      {c.automatic && <span title="Automática: se aplica sola al comprar"><Zap className="size-3.5 text-amber-500" /></span>}
                    </p>
                    {c.objective && <p className="text-xs text-muted-foreground">{c.objective}</p>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {c.audience_label}
                    {c.audience_size != null && <span className="block text-xs text-muted-foreground">{c.audience_size} clientes hoy</span>}
                  </TableCell>
                  <TableCell>
                    {c.benefit_type === "free_addon"
                      ? `${addons.find((a) => a.code === c.addon_code)?.name ?? c.addon_code} gratis`
                      : c.benefit_label}
                    <span className="block font-mono text-xs text-muted-foreground">{c.code}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {fmtYmd(c.starts_on)} → {c.ends_on ? fmtYmd(c.ends_on) : "sin fin"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.paid_uses}
                    {c.max_total_uses != null && <span className="text-muted-foreground"> / {c.max_total_uses}</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{soles(c.discount_given)}</TableCell>
                  <TableCell>
                    <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", STATE_CLS[c.state])}>
                      {label(CAMPAIGN_STATE_LABELS, c.state)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Editar</Button>
                    {(c.status === "draft" || c.status === "paused") && c.state !== "finalizada" && (
                      <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => setStatus(c, "active")}>Activar</Button>
                    )}
                    {c.status === "active" && c.state !== "finalizada" && (
                      <>
                        <Button size="sm" variant="ghost" disabled={busy === c.id} onClick={() => setStatus(c, "paused")}>Pausar</Button>
                        <Button size="sm" variant="ghost" disabled={busy === c.id} onClick={() => setStatus(c, "ended")}>Finalizar</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <p className="py-4 text-center text-sm text-muted-foreground">Cargando…</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cómo se aplican</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-6 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
          <p>• El descuento se calcula al crear la orden sobre el precio del servicio + adicionales; el total que se cobra ya lo trae.</p>
          <p>• Una campaña por orden: entre las automáticas del cliente y el cupón que escriba, gana la de mayor descuento.</p>
          <p>• Los usos por cliente y el tope total cuentan las órdenes pagadas (o por pagar en las 2 h del carrito). Cancelar la orden devuelve el uso.</p>
          <p>• «Adicional gratis» descuenta el precio de ese adicional si está en la compra; el groomer lo ve como cualquier adicional.</p>
          <p>• «Primera compra» son los clientes registrados sin servicios terminados; «Cumpleaños», la mascota del servicio cumple años este mes.</p>
          <p>• El monto queda en la orden (descuento de campaña) y el gasto de Clientes y el costeo usan el neto.</p>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <DemoBadge className="mt-0.5" />
        <p>
          <strong>Envío de avisos:</strong> los canales (push, WhatsApp, correo) se guardan con la campaña, pero todavía no se
          envía ningún aviso a los clientes. La vista previa del push del formulario es ilustrativa.
        </p>
      </div>

      {config && (nueva || editing) && (
        <CampaignDialog
          key={editing?.id ?? `nueva-${nueva}`}
          config={config}
          addons={addons}
          campaign={editing}
          audienciaInicial={nueva ?? "todos"}
          onClose={() => {
            setEditing(null);
            abrir(null);
          }}
          onSaved={async () => {
            setEditing(null);
            abrir(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

// Sugerencias al abrir desde Fidelización con un segmento
const SUGERENCIAS: Record<string, { name: string; benefit: BenefitType; value: number; addon?: string; code: string }> = {
  inactivo: { name: "Te extrañamos", benefit: "percent", value: 15, code: "VUELVE15" },
  en_riesgo: { name: "Tu mascota te espera", benefit: "amount", value: 15, code: "PAKU15" },
  sin_recompra: { name: "Segundo servicio con regalo", benefit: "free_addon", value: 0, addon: "ADD_RETOQUE", code: "SEGUNDO" },
  primera_compra: { name: "Bienvenida", benefit: "percent", value: 10, code: "BIENVENIDA10" },
  vip: { name: "Gracias por ser VIP", benefit: "free_addon", value: 0, addon: "ADD_CORTE_EST", code: "VIPPAKU" },
  recurrente: { name: "Combo mensual", benefit: "amount", value: 10, code: "MES10" },
  cumpleanos: { name: "Feliz cumpleaños", benefit: "free_addon", value: 0, addon: "ADD_CORTE_EST", code: "CUMPLEPAKU" },
};

function CampaignDialog({
  config, addons, campaign, audienciaInicial, onClose, onSaved,
}: {
  config: CampaignConfig;
  addons: Addon[];
  campaign: Campaign | null;
  audienciaInicial: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  // El segmento "nuevo" de Fidelización se ofrece como "primera compra" (bienvenida)
  const inicial = audienciaInicial === "nuevo" ? "primera_compra" : audienciaInicial;
  const sug = SUGERENCIAS[inicial];
  const today = limaToday();
  const [f, setF] = useState({
    name: campaign?.name ?? sug?.name ?? "",
    objective: campaign?.objective ?? "",
    audience: campaign?.audience ?? (config.audiences.some((a) => a.code === inicial) ? inicial : "todos"),
    benefit_type: (campaign?.benefit_type ?? sug?.benefit ?? "percent") as BenefitType,
    value: campaign ? String(campaign.value) : String(sug?.value || 10),
    addon_code: campaign?.addon_code ?? sug?.addon ?? addons[0]?.code ?? "",
    code: campaign?.code ?? sug?.code ?? "",
    channels: (campaign?.channels ?? ["push"]) as Channel[],
    starts_on: campaign?.starts_on ?? addDays(today, 1),
    ends_on: campaign?.ends_on ?? addDays(today, 31),
    automatic: campaign?.automatic ?? false,
    per_customer: campaign ? (campaign.max_uses_per_customer == null ? "" : String(campaign.max_uses_per_customer)) : "1",
    total: campaign?.max_total_uses == null ? "" : String(campaign.max_total_uses),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const value = Number(f.value.replace(",", "."));
  const valido =
    f.name.trim() && f.code.trim() && f.starts_on &&
    (f.benefit_type === "free_addon" ? !!f.addon_code : value > 0 && (f.benefit_type !== "percent" || value <= 100));
  const addonName = addons.find((a) => a.code === f.addon_code)?.name ?? f.addon_code;
  const beneficioActual = useMemo(
    () => (f.benefit_type === "percent" ? `${value || 0} % de descuento` : f.benefit_type === "amount" ? `${soles(value || 0)} de descuento` : `${addonName} gratis`),
    [f.benefit_type, value, addonName],
  );

  async function guardar(status?: CampaignStatus) {
    setSaving(true);
    setError("");
    const body = {
      name: f.name.trim(), objective: f.objective.trim() || null, audience: f.audience, benefit_type: f.benefit_type,
      value: f.benefit_type === "free_addon" ? 0 : value, addon_code: f.benefit_type === "free_addon" ? f.addon_code : null,
      code: f.code.trim().toUpperCase(), channels: f.channels, starts_on: f.starts_on, ends_on: f.ends_on || null,
      automatic: f.automatic, max_uses_per_customer: f.per_customer ? Number(f.per_customer) : null,
      max_total_uses: f.total ? Number(f.total) : null,
    };
    try {
      if (campaign) await updateCampaign(campaign.id, body);
      else await createCampaign({ ...body, status: status ?? "draft" });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la campaña.");
    } finally {
      setSaving(false);
    }
  }

  const toggleCanal = (k: Channel) => set("channels", f.channels.includes(k) ? f.channels.filter((x) => x !== k) : [...f.channels, k]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{campaign ? `Editar ${campaign.code}` : "Nueva campaña"}</DialogTitle>
          <DialogDescription>
            {campaign ? "Los usos ya registrados no cambian." : "Guárdala como borrador o actívala; el descuento se aplica al crear la orden."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[1fr_260px]">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej. Te extrañamos" />
            </div>
            <div className="space-y-1.5">
              <Label>Objetivo (opcional)</Label>
              <Input value={f.objective} onChange={(e) => set("objective", e.target.value)} placeholder="Reactivar clientes inactivos" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Público</Label>
                <select className={cn(selectCls, "w-full")} value={f.audience} onChange={(e) => set("audience", e.target.value)}>
                  {config.audiences.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Código del cupón</Label>
                <Input value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className="font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Beneficio</Label>
                <select className={cn(selectCls, "w-full")} value={f.benefit_type} onChange={(e) => set("benefit_type", e.target.value as BenefitType)}>
                  {Object.entries(CAMPAIGN_BENEFIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {f.benefit_type === "free_addon" ? (
                <div className="space-y-1.5">
                  <Label>Adicional</Label>
                  <select className={cn(selectCls, "w-full")} value={f.addon_code} onChange={(e) => set("addon_code", e.target.value)}>
                    {addons.length === 0 && <option value="">Sin adicionales con código</option>}
                    {addons.map((a) => <option key={a.code} value={a.code}>{a.name} ({a.code})</option>)}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>{f.benefit_type === "percent" ? "Porcentaje" : "Monto S/"}</Label>
                  <Input inputMode="decimal" value={f.value} onChange={(e) => set("value", e.target.value)} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Desde</Label>
                <Input type="date" value={f.starts_on} onChange={(e) => set("starts_on", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hasta (vacío = sin fin)</Label>
                <Input type="date" value={f.ends_on ?? ""} onChange={(e) => set("ends_on", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Usos por cliente (vacío = sin límite)</Label>
                <Input inputMode="numeric" value={f.per_customer} onChange={(e) => set("per_customer", e.target.value.replace(/\D/g, ""))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tope total de usos (vacío = sin tope)</Label>
                <Input inputMode="numeric" value={f.total} onChange={(e) => set("total", e.target.value.replace(/\D/g, ""))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">Canales <DemoBadge /></Label>
              <div className="flex flex-wrap gap-2">
                {config.channels.map((ch) => (
                  <button
                    key={ch.code}
                    type="button"
                    onClick={() => toggleCanal(ch.code as Channel)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs",
                      f.channels.includes(ch.code as Channel) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
                    )}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Se guardan, pero el envío de avisos todavía no existe.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={f.automatic} onCheckedChange={(v) => set("automatic", v)} />
              Automática: se aplica sola a los clientes del público, sin escribir el cupón
            </label>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="text-xs text-muted-foreground">Beneficio</p>
              <p className="font-semibold">{beneficioActual}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {f.automatic ? "Se aplica sin cupón" : `Con el cupón ${f.code || "CODIGO"}`} ·{" "}
                {config.audiences.find((a) => a.code === f.audience)?.label}
              </p>
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Smartphone className="size-3.5" /> Vista del aviso push <DemoBadge />
              </p>
              <div className="rounded-xl bg-neutral-900 p-2.5 text-white shadow">
                <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                  <span className="flex size-4 items-center justify-center rounded bg-[#0052FF] text-[9px] font-bold text-white">P</span>
                  PAKU · ahora
                </div>
                <p className="mt-1 text-xs font-semibold">{f.name.trim() || "Nombre de la campaña"} 🐾</p>
                <p className="text-xs text-neutral-300">
                  {beneficioActual} en tu próxima reserva{f.automatic ? "" : ` con el código ${f.code || "CODIGO"}`}.
                  {f.ends_on ? ` Válido hasta el ${fmtYmd(f.ends_on)}.` : ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {campaign ? (
            <Button onClick={() => guardar()} disabled={!valido || saving}>{saving ? "Guardando…" : "Guardar cambios"}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => guardar("draft")} disabled={!valido || saving}>Guardar borrador</Button>
              <Button onClick={() => guardar("active")} disabled={!valido || saving}>
                {f.starts_on <= today ? "Crear y activar" : "Programar campaña"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
