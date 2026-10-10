import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { journeys } from "./content";
import {
  chapterCropStyle,
  chapterImageDateLabel,
  chapterImages,
  chapterImageUrl,
  imageByCardId,
} from "./chapterImages";

describe("chapter image package", () => {
  it("maps all 72 distinct chapter IDs to the intended local source files", () => {
    const cards = journeys.flatMap((journey) => journey.cards.map((card) => ({
      id: card.id,
      wordId: journey.id,
    })));
    expect(cards).toHaveLength(72);
    expect(chapterImages).toHaveLength(72);
    expect(imageByCardId.size).toBe(72);
    expect(new Set(chapterImages.map((image) => image.image_file)).size).toBe(72);
    expect([...imageByCardId.keys()].sort()).toEqual(cards.map((card) => card.id).sort());

    for (const card of cards) {
      const image = imageByCardId.get(card.id)!;
      expect(image.word_id).toBe(card.wordId);
      expect(image.alt_text).toBeTruthy();
      expect(image.source_url).toMatch(/^https?:\/\//);
      expect(image.license_url).toMatch(/^https?:\/\//);
      expect(image.context_note).toBeTruthy();
      const path = join(process.cwd(), "public", chapterImageUrl(image));
      const sha256 = createHash("sha256").update(readFileSync(path)).digest("hex");
      expect(sha256).toBe(image.image_sha256);
    }
  });

  it("fills the framed portrait slots from each selected source rectangle", () => {
    for (const image of chapterImages) {
      const [left, top, right, bottom] = image.crop_box_normalized;
      expect(left).toBeGreaterThanOrEqual(0);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(1);
      expect(bottom).toBeLessThanOrEqual(1);
      expect(right).toBeGreaterThan(left);
      expect(bottom).toBeGreaterThan(top);
      for (const [slotWidth, slotHeight] of [[80, 100], [68, 86]]) {
        const style = chapterCropStyle(image, slotWidth, slotHeight);
        const visibleWidth = (right - left) * style.width;
        const visibleHeight = (bottom - top) * style.height;
        expect(visibleWidth).toBeGreaterThanOrEqual(slotWidth - 0.001);
        expect(visibleHeight).toBeGreaterThanOrEqual(slotHeight - 0.001);
        expect(Math.min(visibleWidth / slotWidth, visibleHeight / slotHeight)).toBeCloseTo(1);
        expect(style.left + ((left + right) * style.width) / 2).toBeCloseTo(slotWidth / 2);
        expect(style.top + ((top + bottom) * style.height) / 2).toBeCloseTo(slotHeight / 2);
      }
    }
  });

  it("keeps image dates distinct while removing export artifacts", () => {
    expect(chapterImageDateLabel(imageByCardId.get("orange-french")!)).toBe("1856");
    expect(chapterImageDateLabel(imageByCardId.get("coffee-dutch")!)).toBe("Not stated by source");
  });
});
