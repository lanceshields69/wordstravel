import rawChapterImages from "../content/chapter-images.json";

export type ChapterImageRecord = {
  card_id: string;
  word_id: string;
  image_file: string;
  image_title: string;
  image_caption: string;
  image_date: string;
  alt_text: string;
  creator: string;
  source_url: string;
  license: string;
  license_url: string;
  license_note: string;
  context_note: string;
  crop_box_normalized: [number, number, number, number];
  downloaded_width: number;
  downloaded_height: number;
  image_sha256: string;
  small_size_rating: string;
};

export const chapterImages = rawChapterImages.cards as unknown as ChapterImageRecord[];
export const imageByCardId = new Map(
  chapterImages.map((image) => [image.card_id, image]),
);

export function chapterImageUrl(image: ChapterImageRecord): string {
  return `/images/chapters/${image.image_file.replace(/^images\//, "")}`;
}

/** Commons exports sometimes append machine date tags or transfer logs. */
export function chapterImageDateLabel(image: ChapterImageRecord): string {
  const date = image.image_date.split("date QS:")[0].trim();
  if (!date || date.startsWith("Not given")) return "Not stated by source";
  return date;
}

/** Fill the portrait slot from the selected source rectangle, cropping excess centrally. */
export function chapterCropStyle(
  image: ChapterImageRecord,
  slotWidth: number,
  slotHeight: number,
) {
  const [left, top, right, bottom] = image.crop_box_normalized;
  const width = image.downloaded_width;
  const height = image.downloaded_height;
  const scale = Math.max(
    slotWidth / ((right - left) * width),
    slotHeight / ((bottom - top) * height),
  );
  return {
    width: width * scale,
    height: height * scale,
    left: slotWidth / 2 - ((left + right) * width * scale) / 2,
    top: slotHeight / 2 - ((top + bottom) * height * scale) / 2,
    clipPath: `inset(${top * 100}% ${(1 - right) * 100}% ${(1 - bottom) * 100}% ${left * 100}%)`,
  };
}
