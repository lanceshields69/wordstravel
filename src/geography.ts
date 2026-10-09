import type { Card, Edge } from "./content";
import type { FeatureCollection, Feature, LineString } from "geojson";

export type Position = [number, number];
const radians = (n: number) => (n * Math.PI) / 180;
const degrees = (n: number) => (n * 180) / Math.PI;
export const positionOf = (card: Card): Position => [
  card.location.longitude,
  card.location.latitude,
];

export function angularDistance(a: Position, b: Position): number {
  const [lon1, lat1] = a.map(radians);
  const [lon2, lat2] = b.map(radians);
  const cos =
    Math.sin(lat1) * Math.sin(lat2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  return degrees(Math.acos(Math.max(-1, Math.min(1, cos))));
}

/** Great-circle interpolation; splits at the date line for valid GeoJSON lines. */
export function geodesicSegments(a: Position, b: Position): Position[][] {
  const distance = radians(angularDistance(a, b));
  if (distance < 0.0001) return [];
  const steps = Math.max(8, Math.ceil(degrees(distance) / 3));
  const toVector = ([lon, lat]: Position) => {
    const x = radians(lon),
      y = radians(lat);
    return [Math.cos(y) * Math.cos(x), Math.cos(y) * Math.sin(x), Math.sin(y)];
  };
  const va = toVector(a),
    vb = toVector(b);
  const all: Position[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const wa = Math.sin((1 - t) * distance) / Math.sin(distance);
    const wb = Math.sin(t * distance) / Math.sin(distance);
    const x = va[0] * wa + vb[0] * wb,
      y = va[1] * wa + vb[1] * wb,
      z = va[2] * wa + vb[2] * wb;
    all.push([
      ((degrees(Math.atan2(y, x)) + 540) % 360) - 180,
      degrees(Math.atan2(z, Math.hypot(x, y))),
    ]);
  }
  const segments: Position[][] = [[all[0]]];
  for (let i = 1; i < all.length; i++) {
    const prev = all[i - 1],
      next = all[i];
    if (Math.abs(next[0] - prev[0]) > 180) segments.push([next]);
    else segments[segments.length - 1].push(next);
  }
  return segments.filter((s) => s.length > 1);
}

export function routeFeatures(
  cards: Card[],
  edges: Edge[],
  activeId: string,
): FeatureCollection<LineString> {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const features: Feature<LineString>[] = [];
  for (const edge of edges) {
    const from = byId.get(edge.from),
      to = byId.get(edge.to);
    if (!from || !to) continue;
    for (const coordinates of geodesicSegments(
      positionOf(from),
      positionOf(to),
    )) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates },
        properties: {
          from: edge.from,
          to: edge.to,
          relationship: edge.relationship,
          confidence: edge.confidence,
          rendering: edge.rendering,
          note: edge.note,
          active: edge.from === activeId || edge.to === activeId ? 1 : 0,
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

export function markerGroups(cards: Card[]): Card[][] {
  const groups = new Map<string, Card[]>();
  for (const card of cards) {
    const key = `${card.location.longitude},${card.location.latitude}`;
    groups.set(key, [...(groups.get(key) ?? []), card]);
  }
  return [...groups.values()];
}
