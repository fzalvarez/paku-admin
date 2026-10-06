"use client";

// Detalle de una orden (solo lectura). Spec: specs/features/0002-detalle-orden.
// Cada bloque se carga por separado: si uno falla, el resto se ve igual.

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  BATH_BEHAVIOR_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PHOTO_KIND_LABELS,
  SERVICE_STEPS,
  SERVICE_STEP_LABELS,
  SKIP_REASON_LABELS,
  SPECIES_LABELS,
  label,
  orderStatusBadge,
  orderStatusLabel,
  yesNo,
} from "@/lib/labels";
import {
  fmtDateTime,
  fmtTotal,
  type DeliveryAddress,
  type Order,
  type OrderItem,
  type OrderPhoto,
  fmtYmd,
  reservedDate,
} from "@/lib/orders";
import {
  getDelayReports,
  getOrder,
  getOrderPhotos,
  getStopDetail,
  listAllOrders,
  listGroomers,
  type GroomerSummary,
} from "@/lib/services/orders";
import { getDistrictName } from "@/lib/services/geo";

// ── Carga por bloque ─────────────────────────────────────────────────────────

type Block<T> = { loading: boolean; data?: T; error?: string };

// Carga `load` cada vez que cambia `key`. `key` null = no cargar.
function useBlock<T>(key: string | null, load: () => Promise<T>): Block<T> {
  const [state, setState] = useState<{ key: string | null; data?: T; error?: string }>({ key: null });
  useEffect(() => {
    if (!key) return;
    let alive = true;
    load()
      .then((data) => alive && setState({ key, data }))
      .catch((e) => alive && setState({ key, error: e instanceof Error ? e.message : "Error de conexión" }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se recarga solo al cambiar la clave
  }, [key]);
  if (!key) return { loading: false };
  return state.key === key ? { loading: false, data: state.data, error: state.error } : { loading: true };
}

// Los groomers casi no cambian: una sola carga por sesión.
let groomersCache: Promise<GroomerSummary[]> | null = null;
const cachedGroomers = () => (groomersCache ??= listGroomers().catch(() => []));

// ── Piezas de presentación ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border bg-background p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Field({ name, value }: { name: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{name}</p>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}

function BlockState({ block, empty }: { block: Block<unknown>; empty?: string }) {
  if (block.loading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (block.error) return <p className="text-sm text-destructive">{block.error}</p>;
  return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
}

const money = (n: number, currency?: string | null) => `${n} ${currency ?? ""}`.trim();

// ── Panel ────────────────────────────────────────────────────────────────────

export function OrderDetailSheet({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const order = useBlock(orderId, () => getOrder(orderId!));
  const stop = useBlock(orderId, () => getStopDetail(orderId!));
  const photos = useBlock(orderId, () => getOrderPhotos(orderId!));
  const delays = useBlock(orderId, () => getDelayReports(orderId!));
  const adjustments = useBlock(orderId, async () =>
    (await listAllOrders()).filter((o) => o.parent_order_id === orderId)
  );
  const groomers = useBlock(orderId ? "groomers" : null, cachedGroomers);

  const o = order.data;
  const address = (o?.delivery_address_snapshot ?? null) as DeliveryAddress | null;
  const district = useBlock(address?.district_id ?? null, () => getDistrictName(address!.district_id!));

  const [copied, setCopied] = useState(false);
  const [bigPhoto, setBigPhoto] = useState<OrderPhoto | null>(null);

  const groomerName = (id?: string | null) => {
    if (!id) return "-";
    const g = groomers.data?.find((x) => x.id === id);
    return g ? [g.first_name, g.last_name].filter(Boolean).join(" ") || id.slice(0, 8) : id.slice(0, 8) + "…";
  };

  const copyId = async () => {
    if (!orderId) return;
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* el navegador no permitió copiar */
    }
  };

  const items = (Array.isArray(o?.items_snapshot) ? o!.items_snapshot : []) as OrderItem[];
  const baseItems = items.filter((i) => i.kind === "service_base");
  const addonItems = items.filter((i) => i.kind === "service_addon");
  const addonDoneAt = (refId: string) => o?.addons_done?.find((a) => a.addon_id === refId)?.done_at;

  const stepStartedAt = (step: string) => o?.service_steps_log?.find((s) => s.step === step)?.started_at;
  const pet = stop.data?.pet;
  const client = stop.data?.client;

  return (
    <>
      <Sheet open={!!orderId} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex flex-wrap items-center gap-2">
              Orden <span className="font-mono">{orderId?.slice(0, 8)}</span>
              {o && (
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${orderStatusBadge(o.status)}`}>
                  {orderStatusLabel(o.status)}
                </span>
              )}
            </SheetTitle>
            <SheetDescription>Detalle de solo lectura.</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 p-4">
            {/* Resumen */}
            <Section title="Resumen">
              {!o ? (
                <BlockState block={order} />
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field name="Total" value={fmtTotal(o)} />
                  <Field
                    name="Pago"
                    value={`${label(PAYMENT_STATUS_LABELS, o.payment_status)}${
                      o.payment_method ? ` · ${label(PAYMENT_METHOD_LABELS, o.payment_method)}` : ""
                    }`}
                  />
                  <Field name="Día reservado" value={fmtYmd(reservedDate(o))} />
                  <Field name="Programada" value={fmtDateTime(o.scheduled_at)} />
                  <Field name="Groomer" value={groomerName(o.groomer_id)} />
                  <Field name="Creada" value={fmtDateTime(o.created_at)} />
                  <Field name="Actualizada" value={fmtDateTime(o.updated_at)} />
                  <div className="col-span-2">
                    <Field
                      name="ID"
                      value={
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs break-all">{o.id}</span>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={copyId}>
                            {copied ? "Copiado" : "Copiar"}
                          </Button>
                        </span>
                      }
                    />
                  </div>
                </div>
              )}
            </Section>

            {/* Cliente y dirección */}
            <Section title="Cliente y dirección">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field
                  name="Cliente"
                  value={
                    client ? [client.first_name, client.last_name].filter(Boolean).join(" ") || "-" : stop.loading ? "Cargando…" : "-"
                  }
                />
                <Field
                  name="Teléfono"
                  value={
                    client?.phone ? (
                      <a href={`tel:${client.phone}`} className="text-primary underline-offset-4 hover:underline">
                        {client.phone}
                      </a>
                    ) : (
                      "-"
                    )
                  }
                />
                <div className="col-span-2">
                  <Field
                    name="Dirección"
                    value={
                      address ? (
                        <span>
                          {[
                            address.address_line,
                            address.building_number,
                            address.apartment_number,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                          {district.data ? ` — ${district.data}` : ""}
                          {address.label ? ` (${address.label})` : ""}
                          {address.lat != null && address.lng != null && (
                            <>
                              {" · "}
                              <a
                                href={`https://www.google.com/maps?q=${address.lat},${address.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline-offset-4 hover:underline"
                              >
                                Ver en el mapa
                              </a>
                            </>
                          )}
                        </span>
                      ) : o ? (
                        "Sin dirección"
                      ) : (
                        "-"
                      )
                    }
                  />
                </div>
                {address?.reference && (
                  <div className="col-span-2">
                    <Field name="Referencia" value={address.reference} />
                  </div>
                )}
              </div>
              {stop.error && <p className="mt-2 text-xs text-destructive">Cliente: {stop.error}</p>}
            </Section>

            {/* Mascota */}
            <Section title="Mascota">
              {!pet ? (
                <BlockState block={stop} empty="Sin datos de la mascota (puede haber sido eliminada)." />
              ) : (
                <div className="flex items-start gap-3">
                  {pet.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL firmada de GCS
                    <img src={pet.photo_url} alt={`Foto de ${pet.name}`} className="h-14 w-14 rounded-full border object-cover" />
                  ) : null}
                  <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
                    <Field
                      name="Nombre"
                      value={`${pet.name} · ${label(SPECIES_LABELS, pet.species)}${pet.breed_name ? ` · ${pet.breed_name}` : ""}`}
                    />
                    <Field name="Peso" value={pet.weight_kg != null ? `${pet.weight_kg} kg` : "-"} />
                    <Field name="Piel sensible" value={yesNo(pet.skin_sensitivity)} />
                    <Field name="En el baño" value={label(BATH_BEHAVIOR_LABELS, pet.bath_behavior)} />
                    <Field name="Tolera el secado" value={yesNo(pet.tolerates_drying)} />
                    <Field name="Tolera el corte de uñas" value={yesNo(pet.tolerates_nail_clipping)} />
                    <Field name="Shampoo especial" value={yesNo(pet.special_shampoo)} />
                    {pet.notes && (
                      <div className="col-span-2">
                        <Field name="Notas" value={<span className="whitespace-pre-wrap">{pet.notes}</span>} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Section>

            {/* Servicio */}
            <Section title="Servicio">
              {!o ? (
                <BlockState block={order} />
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin ítems.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {baseItems.map((i) => (
                    <li key={i.id} className="flex justify-between gap-3">
                      <span className="font-medium">{i.name ?? "Servicio"}</span>
                      <span className="tabular-nums">{money(i.unit_price * i.qty, o.currency)}</span>
                    </li>
                  ))}
                  {addonItems.map((i) => {
                    const doneAt = addonDoneAt(i.ref_id);
                    return (
                      <li key={i.id} className="flex justify-between gap-3">
                        <span>
                          + {i.name ?? "Complemento"}{" "}
                          <span className={doneAt ? "text-green-700" : "text-muted-foreground"}>
                            {doneAt ? `· realizado ${fmtDateTime(doneAt)}` : "· pendiente"}
                          </span>
                        </span>
                        <span className="tabular-nums">{money(i.unit_price * i.qty, o.currency)}</span>
                      </li>
                    );
                  })}
                  <li className="flex justify-between gap-3 border-t pt-1 font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{fmtTotal(o)}</span>
                  </li>
                </ul>
              )}
            </Section>

            {/* Progreso */}
            <Section title="Progreso del servicio">
              {!o ? (
                <BlockState block={order} />
              ) : (o.service_steps_log?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {o.status === "done" ? "Cerrada sin pasos registrados." : "Todavía no empezó."}
                </p>
              ) : (
                <ol className="space-y-1 text-sm">
                  {SERVICE_STEPS.map((step) => {
                    const at = stepStartedAt(step);
                    const current = o.status === "in_service" && o.service_step === step;
                    return (
                      <li key={step} className="flex justify-between gap-3">
                        <span className={current ? "font-semibold text-primary" : at ? "" : "text-muted-foreground"}>
                          {at ? "✓" : "○"} {SERVICE_STEP_LABELS[step]}
                          {current ? " (actual)" : ""}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{at ? fmtDateTime(at) : "-"}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Section>

            {/* Fotos */}
            <Section title="Fotos">
              {!photos.data || photos.data.length === 0 ? (
                <BlockState block={photos} empty="Sin fotos." />
              ) : (
                <div className="space-y-3">
                  {Object.keys(PHOTO_KIND_LABELS).map((kind) => {
                    const list = photos.data!.filter((p) => p.kind === kind);
                    if (list.length === 0) return null;
                    return (
                      <div key={kind}>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">{PHOTO_KIND_LABELS[kind]}</p>
                        <div className="flex flex-wrap gap-2">
                          {list.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setBigPhoto(p)}
                              className="overflow-hidden rounded-md border"
                              title={p.note ?? fmtDateTime(p.created_at)}
                            >
                              {p.read_url ? (
                                // eslint-disable-next-line @next/next/no-img-element -- URL firmada de GCS
                                <img src={p.read_url} alt={`Foto ${PHOTO_KIND_LABELS[kind]}`} className="h-20 w-20 object-cover" />
                              ) : (
                                <span className="flex h-20 w-20 items-center justify-center text-xs text-muted-foreground">
                                  Sin imagen
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* Demoras */}
            <Section title="Avisos de demora">
              {!delays.data || delays.data.length === 0 ? (
                <BlockState block={delays} empty="Sin avisos de demora." />
              ) : (
                <ul className="space-y-1 text-sm">
                  {delays.data.map((d) => (
                    <li key={d.id}>
                      <span className="font-medium">~{d.delay_minutes} min</span>{" "}
                      <span className="text-muted-foreground">· {fmtDateTime(d.created_at)}</span>
                      {d.note ? <span> — {d.note}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Salto */}
            {o?.skip_reason && (
              <Section title={o.status === "skipped" ? "Parada saltada" : "Se saltó antes de reprogramarse"}>
                <p className="text-sm">
                  <span className="font-medium">{label(SKIP_REASON_LABELS, o.skip_reason)}</span>
                  <span className="text-muted-foreground"> · {fmtDateTime(o.skipped_at)}</span>
                </p>
                {o.skip_note && <p className="mt-1 text-sm italic">“{o.skip_note}”</p>}
              </Section>
            )}

            {/* Cargo extra por peso */}
            {(o?.parent_order_id || (adjustments.data?.length ?? 0) > 0) && (
              <Section title="Cargo extra por peso">
                {o?.parent_order_id && (
                  <p className="text-sm">
                    Esta orden es un cargo extra de la orden{" "}
                    <span className="font-mono">{o.parent_order_id.slice(0, 8)}</span>.
                  </p>
                )}
                {adjustments.data?.map((a: Order) => (
                  <p key={a.id} className="text-sm">
                    <span className="font-mono">{a.id.slice(0, 8)}</span> · {fmtTotal(a)} ·{" "}
                    {label(PAYMENT_STATUS_LABELS, a.payment_status)}
                  </p>
                ))}
              </Section>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!bigPhoto} onOpenChange={(v) => !v && setBigPhoto(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Foto {bigPhoto ? label(PHOTO_KIND_LABELS, bigPhoto.kind).toLowerCase() : ""} ·{" "}
              {bigPhoto ? fmtDateTime(bigPhoto.created_at) : ""}
            </DialogTitle>
          </DialogHeader>
          {bigPhoto?.read_url && (
            // eslint-disable-next-line @next/next/no-img-element -- URL firmada de GCS
            <img src={bigPhoto.read_url} alt="Foto de la orden" className="max-h-[70vh] w-full rounded-md object-contain" />
          )}
          {bigPhoto?.note && <p className="text-sm">{bigPhoto.note}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
