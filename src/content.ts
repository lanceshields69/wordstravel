import rawJourneys from "../content/word-journeys.json";
import rawImages from "../content/intro-images.json";

export type Location = {
  label: string;
  latitude: number;
  longitude: number;
  precision: string;
  uncertainty_radius_km?: number | null;
  note?: string;
};
export type DateInfo = {
  label: string;
  start_year: number | null;
  end_year: number | null;
  type: string;
  note?: string;
  arrival_date?: string | null;
};
export type Source = {
  source_id: string;
  title: string;
  publisher: string;
  url: string;
  scope?: string;
};
export type Card = {
  id: string;
  current_english_word: string;
  title: string;
  language: string;
  spelling: string;
  transliteration: string | null;
  meaning: string;
  location: Location;
  date: DateInfo;
  stage_kind: string;
  story: string;
  travel: { summary: string; evidence_status?: string };
  cultural_change: string;
  pronunciation: {
    display?: string;
    generation: {
      language: string | null;
      text: string;
      label: string;
      audio_url: string | null;
      owner_approved_audio?: boolean;
    };
  };
  visual: { image_url: string | null; alt_text?: string; status: string };
  source_ids: string[];
  confidence: string;
  review_status: string;
  learn_more: Source[];
  display_order: number;
  claim_scope?: string;
  timeline_eligible?: boolean;
};
export type Edge = {
  from: string;
  to: string;
  relationship: string;
  confidence: string;
  rendering: string;
  source_ids: string[];
  note: string;
};
export type Journey = {
  id: string;
  current_english_word: string;
  root: {
    form: string;
    transliteration: string | null;
    language: string;
    meaning: string;
    status: string;
  };
  hook: string;
  research_note: string;
  cards: Card[];
  edges: Edge[];
  sources: Source[];
  card_count: number;
};
export type IntroImage = {
  word_id: string;
  image_file: string;
  alt_text: string;
  image_title: string;
  image_date_label: string;
  caption: string;
  credit_line: string;
  source_url: string;
  rights_url?: string;
  source_declared_rights: string;
  display_object_fit?: string;
  display_object_position?: string;
  crop_guidance?: string;
};

export const journeys = (rawJourneys.journeys as unknown as Journey[]).map(
  (j) => ({
    ...j,
    cards: [...j.cards].sort((a, b) => a.display_order - b.display_order),
  }),
);
export const images = rawImages.images as IntroImage[];
export const imageByWord = new Map(
  images.map((image) => [image.word_id, image]),
);
export const journeyById = new Map(
  journeys.map((journey) => [journey.id, journey]),
);

/** The research manifest retains handoff-relative paths; the app owns URL resolution. */
export function introImageUrl(image: IntroImage): string {
  return `/images/intro/${image.image_file.replace(/^images\//, "")}`;
}

/** Display derivative; the supplied original remains available in the credit viewer. */
export function introThumbnailUrl(image: IntroImage): string {
  return `/images/intro/thumbs/${image.image_file.replace(/^images\//, "").replace(/\.[^.]+$/, "")}.jpg`;
}

export function cardFor(journey: Journey, id: string | null): Card {
  return journey.cards.find((card) => card.id === id) ?? journey.cards[0];
}
