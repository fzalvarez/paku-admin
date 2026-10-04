// Enlaces a Google Maps por URL pública (sin API key ni costo).
// https://developers.google.com/maps/documentation/urls/get-started

export interface MapPoint {
  lat: number;
  lng: number;
}

export const placeUrl = ({ lat, lng }: MapPoint) => `https://www.google.com/maps?q=${lat},${lng}`;

// La URL de rutas admite origen, destino y hasta 9 puntos intermedios: 10 paradas sin origen fijo.
export const MAX_ROUTE_POINTS = 10;

// Ruta en auto por las paradas en orden. Sin origen: Google parte de la ubicación de quien la abre.
export function routeUrl(points: MapPoint[]): string | null {
  const stops = points.slice(0, MAX_ROUTE_POINTS);
  if (stops.length === 0) return null;
  const fmt = (p: MapPoint) => `${p.lat},${p.lng}`;
  const params = new URLSearchParams({ api: "1", travelmode: "driving", destination: fmt(stops[stops.length - 1]) });
  if (stops.length > 1) params.set("waypoints", stops.slice(0, -1).map(fmt).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
