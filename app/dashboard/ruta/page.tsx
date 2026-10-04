"use client";

// Ruta del día (spec: specs/features/0005-ruta-del-dia). El backend no ofrece la ruta del día al
// admin: se arma con las órdenes del groomer, filtradas por día (hora de Lima) y ordenadas por hora.

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { OrderDetailSheet } from "@/components/orders/OrderDetailSheet";
import { addDays, isYmd, limaDate, limaToday } from "@/lib/dates";
import {
  SERVICE_STEP_LABELS,
  SKIP_REASON_LABELS,
  SPECIES_LABELS,
  label,
  orderStatusBadge,
  orderStatusLabel,
} from "@/lib/labels";
import { MAX_ROUTE_POINTS, placeUrl, routeUrl, type MapPoint } from "@/lib/maps";
import { fmtTotal, type DeliveryAddress, type Order, type StopDetail } from "@/lib/orders";
import { getDistrictName } from "@/lib/services/geo";
import { getStopDetail, listGroomers, listOrdersFiltered, type GroomerSummary } from "@/lib/services/orders";
import { getGroomerLocation, type GroomerLocation } from "@/lib/services/tracking";

const LIMA_TIME = new Intl.DateTimeFormat("es", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" });
const DAY_TITLE = new Intl.DateTimeFormat("es", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

const dayTitle = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const text = DAY_TITLE.format(new Date(Date.UTC(y, m - 1, d)));
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const PENDING = ["created", "accepted"];
const ACTIVE = ["on_the_way", "in_service"];

const addressOf = (o: Order) => (o.delivery_address_snapshot ?? null) as DeliveryAddress | null;
const pointOf = (o: Order): MapPoint | null => {
  const a = addressOf(o);
  return a?.lat != null && a?.lng != null ? { lat: a.lat, lng: a.lng } : null;
};

const groomerFullName = (g: GroomerSummary) =>
  [g.first_name, g.last_name].filter(Boolean).join(" ") || g.id.slice(0, 8);

export default function RutaPage() {
  // Next 16: useSearchParams en una página prerenderizada exige un Suspense alrededor.
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando ruta...</p>}>
      <RutaView />
    </Suspense>
  );
}

function RutaView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const today = limaToday();
  const dia = isYmd(searchParams.get("dia")) ? searchParams.get("dia")! : today;

  const setParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const goToDay = (ymd: string) => setParams({ dia: ymd === today ? "" : ymd });

  // Groomer: el de la URL o el primero activo (los primeros meses hay uno solo).
  const [groomers, setGroomers] = useState<GroomerSummary[] | null>(null);
  useEffect(() => {
    listGroomers()
      .then(setGroomers)
      .catch(() => setGroomers([]));
  }, []);
  const activeGroomers = (groomers ?? []).filter((g) => g.is_active);
  const groomerId = searchParams.get("groomer") || activeGroomers[0]?.id || null;
  const groomer = groomers?.find((g) => g.id === groomerId);

  const [stops, setStops] = useState<Order[]>([]);
  const [details, setDetails] = useState<Record<string, StopDetail | null>>({});
  const [districts, setDistricts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!groomerId) return;
    setLoading(true);
    setError(null);
    try {
      const all = await listOrdersFiltered({ groomer_id: groomerId });
      const ofDay = all
        .filter((o) => o.status !== "cancelled" && limaDate(o.scheduled_at) === dia)
        .sort((a, b) => new Date(a.scheduled_at ?? 0).getTime() - new Date(b.scheduled_at ?? 0).getTime());
      setStops(ofDay);
      setDetails({});
      // Detalle de cada parada y nombres de distrito, en paralelo y sin bloquear la lista.
      void Promise.all(
        ofDay.map(async (o) => {
          const detail = await getStopDetail(o.id).catch(() => null);
          setDetails((prev) => ({ ...prev, [o.id]: detail }));
        })
      );
      const districtIds = [...new Set(ofDay.map((o) => addressOf(o)?.district_id).filter(Boolean))] as string[];
      void Promise.all(
        districtIds.map(async (id) => {
          const name = await getDistrictName(id);
          if (name) setDistricts((prev) => ({ ...prev, [id]: name }));
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
      setStops([]);
    } finally {
      setLoading(false);
    }
  }, [groomerId, dia]);

  useEffect(() => {
    load();
  }, [load]);

  // Panel de detalle
  const [detailId, setDetailId] = useState<string | null>(null);

  // Última ubicación del groomer (solo a pedido)
  const activeStop = stops.find((o) => ACTIVE.includes(o.status));
  const [location, setLocation] = useState<{ loading: boolean; data?: GroomerLocation; error?: string } | null>(null);
  const locate = async () => {
    if (!activeStop) return;
    setLocation({ loading: true });
    try {
      setLocation({ loading: false, data: await getGroomerLocation(activeStop.id) });
    } catch (e) {
      setLocation({ loading: false, error: e instanceof Error ? e.message : "Error de conexión" });
    }
  };

  const count = (statuses: string[]) => stops.filter((o) => statuses.includes(o.status)).length;
  const dayTotal = stops.filter((o) => o.status !== "skipped").reduce((sum, o) => sum + (o.total_snapshot ?? 0), 0);
  const pendingPoints = stops.filter((o) => PENDING.includes(o.status) || ACTIVE.includes(o.status));
  const routePoints = pendingPoints.map(pointOf).filter((p): p is MapPoint => !!p);
  const route = routeUrl(routePoints);

  // Un solo groomer no puede atender dos paradas a la misma hora: número de la parada anterior
  // (no saltada) con la misma hora programada, o null.
  const clashWith = (i: number): number | null => {
    const at = stops[i].scheduled_at;
    if (!at || stops[i].status === "skipped") return null;
    for (let j = i - 1; j >= 0; j--) {
      if (stops[j].status !== "skipped" && stops[j].scheduled_at === at) return j + 1;
    }
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Ruta del día"
        description={groomer ? `Groomer: ${groomerFullName(groomer)}` : undefined}
      />

      {/* Barra del día */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => goToDay(addDays(dia, -1))} aria-label="Día anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="sm" variant={dia === today ? "default" : "outline"} onClick={() => goToDay(today)}>
            Hoy
          </Button>
          <Button size="sm" variant="outline" onClick={() => goToDay(addDays(dia, 1))} aria-label="Día siguiente">
            <ChevronRight className="size-4" />
          </Button>
          <input
            type="date"
            aria-label="Día"
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
            value={dia}
            onChange={(e) => isYmd(e.target.value) && goToDay(e.target.value)}
          />
          <span className="ml-1 font-semibold text-foreground">{dayTitle(dia)}</span>

          {activeGroomers.length > 1 && (
            <Select value={groomerId ?? ""} onValueChange={(v) => setParams({ groomer: v })}>
              <SelectTrigger className="w-44" size="sm">
                <SelectValue placeholder="Groomer" />
              </SelectTrigger>
              <SelectContent>
                {activeGroomers.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{groomerFullName(g)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
            </Button>
            {route && (
              <Button size="sm" asChild>
                <a href={route} target="_blank" rel="noopener noreferrer">
                  Abrir la ruta en Google Maps
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {groomers !== null && activeGroomers.length === 0 && (
        <p className="text-muted-foreground">No hay groomers activos.</p>
      )}
      {error && <p className="mb-3 text-destructive">{error}</p>}
      {loading && stops.length === 0 && <p className="text-muted-foreground">Cargando ruta...</p>}

      {!loading && !error && groomerId && stops.length === 0 && (
        <p className="text-muted-foreground">
          No hay paradas para este día.{" "}
          <Link href="/dashboard/asignaciones" className="text-primary underline-offset-4 hover:underline">
            Ir a Asignación
          </Link>
        </p>
      )}

      {stops.length > 0 && (
        <>
          {/* Resumen */}
          <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold text-foreground">
              {stops.length} {stops.length === 1 ? "parada" : "paradas"}
            </span>
            <span className="text-muted-foreground">Pendientes: {count(PENDING)}</span>
            <span className="text-muted-foreground">En camino: {count(["on_the_way"])}</span>
            <span className="text-muted-foreground">En servicio: {count(["in_service"])}</span>
            <span className="text-muted-foreground">Terminadas: {count(["done"])}</span>
            <span className="text-muted-foreground">Saltadas: {count(["skipped"])}</span>
            <span className="text-muted-foreground">Total: {dayTotal} PEN</span>
          </div>

          {routePoints.length > MAX_ROUTE_POINTS && (
            <p className="mb-3 text-xs text-amber-700">
              Google Maps abre hasta {MAX_ROUTE_POINTS} paradas: el enlace incluye las primeras {MAX_ROUTE_POINTS}.
            </p>
          )}

          {/* Ubicación del groomer */}
          {activeStop && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm">
              <Button size="sm" variant="outline" onClick={locate} disabled={location?.loading}>
                {location?.loading ? "Buscando…" : "¿Dónde está el groomer?"}
              </Button>
              {location?.error && <span className="text-destructive">{location.error}</span>}
              {location?.data &&
                (location.data.groomer_location ? (
                  <span>
                    Última ubicación{" "}
                    {location.data.staleness_seconds != null &&
                      `hace ${Math.max(1, Math.round(location.data.staleness_seconds / 60))} min`}{" "}
                    ·{" "}
                    <a
                      href={placeUrl(location.data.groomer_location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Ver en el mapa
                    </a>
                  </span>
                ) : (
                  <span className="text-muted-foreground">El groomer aún no envió su ubicación.</span>
                ))}
            </div>
          )}

          <ol className="space-y-3">
            {stops.map((o, i) => (
              <StopCard
                key={o.id}
                index={i + 1}
                clashWith={clashWith(i)}
                order={o}
                detail={details[o.id]}
                district={districts[addressOf(o)?.district_id ?? ""]}
                onOpen={() => setDetailId(o.id)}
              />
            ))}
          </ol>
        </>
      )}

      <OrderDetailSheet orderId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function StopCard({
  index,
  clashWith,
  order: o,
  detail,
  district,
  onOpen,
}: {
  index: number;
  clashWith: number | null;
  order: Order;
  detail: StopDetail | null | undefined;
  district?: string;
  onOpen: () => void;
}) {
  const address = addressOf(o);
  const point = pointOf(o);
  const pet = detail?.pet;
  const client = detail?.client;
  const service = detail?.service;
  const clientName = [client?.first_name, client?.last_name].filter(Boolean).join(" ");
  const finished = o.status === "done" || o.status === "skipped";

  return (
    <li>
      <Card className={finished ? "opacity-70" : ""}>
        <CardContent className="flex flex-wrap items-start gap-4">
          <div className="flex w-16 shrink-0 flex-col items-center">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {index}
            </span>
            <span className="mt-1 text-sm font-semibold tabular-nums">
              {o.scheduled_at ? LIMA_TIME.format(new Date(o.scheduled_at)) : "-"}
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${orderStatusBadge(o.status)}`}>
                {orderStatusLabel(o.status)}
              </span>
              {o.status === "in_service" && o.service_step && (
                <span className="text-xs text-muted-foreground">Paso: {label(SERVICE_STEP_LABELS, o.service_step)}</span>
              )}
              {o.status === "skipped" && (
                <span className="text-xs text-muted-foreground">{label(SKIP_REASON_LABELS, o.skip_reason)}</span>
              )}
              <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}</span>
              {clashWith && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Misma hora que la parada {clashWith}
                </span>
              )}
            </div>

            <p className="text-base font-semibold text-foreground">
              {pet ? (
                <>
                  {pet.name}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    · {label(SPECIES_LABELS, pet.species)}
                    {pet.breed_name ? ` · ${pet.breed_name}` : ""}
                    {pet.weight_kg != null ? ` · ${pet.weight_kg} kg` : ""}
                  </span>
                </>
              ) : detail === undefined ? (
                <span className="text-sm font-normal text-muted-foreground">Cargando…</span>
              ) : (
                <span className="text-sm font-normal text-muted-foreground">Mascota sin datos</span>
              )}
            </p>

            <p>
              {service?.name ?? "Servicio"}
              {service?.addons?.length ? ` + ${service.addons.map((a) => a.name ?? "complemento").join(", ")}` : ""}
              <span className="text-muted-foreground"> · {fmtTotal(o)}</span>
            </p>

            <p>
              <span className="text-muted-foreground">Cliente: </span>
              {clientName || "-"}
              {client?.phone && (
                <>
                  {" · "}
                  <a href={`tel:${client.phone}`} className="text-primary underline-offset-4 hover:underline">
                    {client.phone}
                  </a>
                </>
              )}
            </p>

            <p>
              <span className="text-muted-foreground">Dirección: </span>
              {address
                ? [address.address_line, address.building_number, address.apartment_number].filter(Boolean).join(", ")
                : "-"}
              {district ? ` — ${district}` : ""}
              {point && (
                <>
                  {" · "}
                  <a
                    href={placeUrl(point)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Ver en el mapa
                  </a>
                </>
              )}
            </p>
            {address?.reference && <p className="text-muted-foreground">Referencia: {address.reference}</p>}
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <Button size="sm" variant="outline" onClick={onOpen}>
              Ver detalle
            </Button>
            {o.status === "skipped" && (
              <Button size="sm" asChild>
                <Link href={`/dashboard/asignaciones?reprogramar=${o.id}`}>Reprogramar</Link>
              </Button>
            )}
            {PENDING.includes(o.status) && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/dashboard/asignaciones?reprogramar=${o.id}`}>Cambiar hora</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
