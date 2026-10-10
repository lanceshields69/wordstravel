import type { FeatureCollection, LineString, Point } from "geojson";
import type { Journey } from "./content";
import { geodesicSegments, positionOf } from "./geography";

export type OpeningStage =
  | "waiting"
  | "globe"
  | "mark"
  | "wordmark"
  | "hold"
  | "fallback"
  | "reduced"
  | "reveal"
  | "complete";

export const OPENING_SESSION_KEY = "words-travel-opening-seen";
export const OPENING_ROUTE_STAGGER_MS = 230;
export const OPENING_ROUTE_DRAW_MS = 1150;

type SessionStore = Pick<Storage, "getItem" | "setItem">;

export function shouldPlayOpening(
  directJourney: boolean,
  storage: SessionStore | null,
): boolean {
  if (directJourney) return false;
  try {
    return storage?.getItem(OPENING_SESSION_KEY) !== "1";
  } catch {
    return true;
  }
}

export function rememberOpening(storage: SessionStore | null): void {
  try {
    storage?.setItem(OPENING_SESSION_KEY, "1");
  } catch {
    // Storage can be disabled; the introduction remains usable.
  }
}

// Each pair is an actual edge in the research manifest, spread across the
// visible face of the opening globe rather than implying a single itinerary.
const routeChoices = [
  ["orange", "orange-root", "orange-persian"],
  ["zero", "zero-arabic", "zero-bejaia"],
  ["coffee", "coffee-turkish", "coffee-italian"],
  ["algorithm", "algorithm-name", "algorithm-scholar"],
  ["typhoon", "typhoon-arabic", "typhoon-portuguese"],
  ["ketchup", "ketchup-malay", "ketchup-british"],
] as const;

export function openingRouteData(journeys: Journey[]): {
  lines: FeatureCollection<LineString>;
  points: FeatureCollection<Point>;
} {
  const lines: FeatureCollection<LineString> = {
    type: "FeatureCollection",
    features: [],
  };
  const points: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: [],
  };
  for (const [wordId, fromId, toId] of routeChoices) {
    const journey = journeys.find((item) => item.id === wordId);
    if (!journey?.edges.some((edge) => edge.from === fromId && edge.to === toId))
      continue;
    const from = journey.cards.find((card) => card.id === fromId);
    const to = journey.cards.find((card) => card.id === toId);
    if (!from || !to) continue;
    const start = positionOf(from);
    const end = positionOf(to);
    for (const coordinates of geodesicSegments(start, end)) {
      lines.features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates },
        properties: { wordId },
      });
    }
    for (const [id, coordinates] of [
      [fromId, start],
      [toId, end],
    ] as const) {
      points.features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates },
        properties: { wordId, id },
      });
    }
  }
  return { lines, points };
}

export function tracedOpeningLines(
  lines: FeatureCollection<LineString>,
  elapsedMs: number,
): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: lines.features.flatMap((feature, index) => {
      const progress = Math.max(0, Math.min(1,
        (elapsedMs - index * OPENING_ROUTE_STAGGER_MS) / OPENING_ROUTE_DRAW_MS,
      ));
      if (progress <= 0) return [];
      const coordinates = feature.geometry.coordinates;
      const position = progress * (coordinates.length - 1);
      const lastWholePoint = Math.floor(position);
      const visible = coordinates.slice(0, lastWholePoint + 1);
      if (lastWholePoint < coordinates.length - 1) {
        const start = coordinates[lastWholePoint];
        const end = coordinates[lastWholePoint + 1];
        const fraction = position - lastWholePoint;
        visible.push([
          start[0] + (end[0] - start[0]) * fraction,
          start[1] + (end[1] - start[1]) * fraction,
        ]);
      }
      return [{
        ...feature,
        geometry: { ...feature.geometry, coordinates: visible },
      }];
    }),
  };
}
