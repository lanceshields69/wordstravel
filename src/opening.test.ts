import { describe, expect, it } from "vitest";
import { journeys } from "./content";
import {
  OPENING_SESSION_KEY,
  OPENING_ROUTE_DRAW_MS,
  OPENING_ROUTE_STAGGER_MS,
  openingRouteData,
  rememberOpening,
  shouldPlayOpening,
  tracedOpeningLines,
} from "./opening";

describe("opening sequence", () => {
  it("uses six existing journey edges with globe-attached endpoints", () => {
    const { lines, points } = openingRouteData(journeys);
    expect(lines.features).toHaveLength(6);
    expect(points.features).toHaveLength(12);
    for (const line of lines.features) {
      expect(line.geometry.coordinates.length).toBeGreaterThan(2);
      const word = journeys.find((item) => item.id === line.properties?.wordId);
      expect(word).toBeDefined();
      expect(word?.edges.some((edge) =>
        points.features.some((point) => point.properties?.id === edge.from) &&
        points.features.some((point) => point.properties?.id === edge.to),
      )).toBe(true);
    }
  });

  it("traces six journey legs in staggered order", () => {
    const { lines } = openingRouteData(journeys);
    expect(tracedOpeningLines(lines, 0).features).toHaveLength(0);
    const early = tracedOpeningLines(lines, OPENING_ROUTE_STAGGER_MS / 2);
    expect(early.features).toHaveLength(1);
    expect(early.features[0].geometry.coordinates.length).toBeLessThan(
      lines.features[0].geometry.coordinates.length,
    );
    const end = tracedOpeningLines(
      lines,
      (lines.features.length - 1) * OPENING_ROUTE_STAGGER_MS + OPENING_ROUTE_DRAW_MS,
    );
    expect(end).toEqual(lines);
  });

  it("plays once per session, skips direct journeys, and tolerates blocked storage", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    expect(shouldPlayOpening(false, storage)).toBe(true);
    rememberOpening(storage);
    expect(values.get(OPENING_SESSION_KEY)).toBe("1");
    expect(shouldPlayOpening(false, storage)).toBe(false);
    expect(shouldPlayOpening(true, null)).toBe(false);
    const blocked = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
    };
    expect(shouldPlayOpening(false, blocked)).toBe(true);
    expect(() => rememberOpening(blocked)).not.toThrow();
  });
});
