import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { images, journeys, introImageUrl, introThumbnailUrl } from "./content";
import {
  geodesicSegments,
  markerGroups,
  positionOf,
  routeFeatures,
} from "./geography";

describe("supplied research content", () => {
  it("maps each of the twelve journeys to one local historical image", () => {
    expect(journeys).toHaveLength(12);
    expect(images).toHaveLength(12);
    expect(new Set(images.map((i) => i.word_id)).size).toBe(12);
    for (const journey of journeys) {
      const matches = images.filter((image) => image.word_id === journey.id);
      expect(matches).toHaveLength(1);
      expect(introImageUrl(matches[0])).toMatch(/^\/images\/intro\//);
      expect(
        existsSync(join(process.cwd(), "public", introImageUrl(matches[0]))),
      ).toBe(true);
      expect(
        existsSync(
          join(process.cwd(), "public", introThumbnailUrl(matches[0])),
        ),
      ).toBe(true);
    }
  });

  it("has 72 stable cards and 63 explicitly modeled edges with valid endpoints", () => {
    expect(journeys.reduce((n, journey) => n + journey.cards.length, 0)).toBe(
      72,
    );
    expect(journeys.reduce((n, journey) => n + journey.edges.length, 0)).toBe(
      63,
    );
    for (const journey of journeys) {
      const ids = new Set(journey.cards.map((card) => card.id));
      expect(ids.size).toBe(journey.cards.length);
      expect(journey.card_count).toBe(journey.cards.length);
      expect(journey.cards.map((c) => c.display_order)).toEqual(
        [...journey.cards.map((c) => c.display_order)].sort((a, b) => a - b),
      );
      for (const card of journey.cards) {
        const [longitude, latitude] = positionOf(card);
        expect(longitude).toBeGreaterThanOrEqual(-180);
        expect(longitude).toBeLessThanOrEqual(180);
        expect(latitude).toBeGreaterThanOrEqual(-90);
        expect(latitude).toBeLessThanOrEqual(90);
        if (card.date.type === "unknown")
          expect(card.date.start_year).toBeNull();
      }
      for (const edge of journey.edges) {
        expect(ids.has(edge.from)).toBe(true);
        expect(ids.has(edge.to)).toBe(true);
      }
    }
  });

  it("keeps alternate and proposed branches distinct from reading order", () => {
    const typhoon = journeys.find((j) => j.id === "typhoon")!;
    expect(
      typhoon.edges.some(
        (e) => e.confidence === "disputed" && e.rendering === "dashed",
      ),
    ).toBe(true);
    expect(
      typhoon.edges.filter((e) => e.relationship.startsWith("proposed_")),
    ).toHaveLength(2);
    const coffee = journeys.find((j) => j.id === "coffee")!;
    expect(coffee.edges.some((e) => e.to === "coffee-cafe")).toBe(true);
    expect(
      coffee.edges.some((e) => e.relationship === "related_derivation"),
    ).toBe(true);
    const rendered = routeFeatures(
      typhoon.cards,
      typhoon.edges,
      typhoon.cards[0].id,
    );
    expect(
      new Set(
        rendered.features.map(
          (f) => `${f.properties?.from}:${f.properties?.to}`,
        ),
      ).size,
    ).toBe(typhoon.edges.length);
  });

  it("groups coincident pins and splits a route at the antimeridian", () => {
    const ginger = journeys.find((j) => j.id === "ginger")!;
    expect(markerGroups(ginger.cards).some((group) => group.length === 2)).toBe(
      true,
    );
    expect(geodesicSegments([0, 0], [0, 0])).toEqual([]);
    const segments = geodesicSegments([170, 10], [-170, 10]);
    expect(segments.length).toBeGreaterThan(1);
    for (const segment of segments)
      for (let i = 1; i < segment.length; i++)
        expect(Math.abs(segment[i][0] - segment[i - 1][0])).toBeLessThan(180);
  });
});
