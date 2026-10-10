# Words Travel

**Every word has a journey.** A local, front-end atlas for twelve familiar English words. Select an image card, then follow its sourced chapters through a live globe or the chapter list.

Planned production URL: [wordstravel.app](https://wordstravel.app/).

## Run locally

Requires Node.js 22 or newer. Install and start the app:

```sh
npm ci
cp .env.example .env.local
# Edit .env.local and set VITE_MAPBOX_ACCESS_TOKEN to a public Mapbox browser token.
npm run dev
```

Open the URL printed by Vite. The app also works without a token: cards, chapters, pronunciation controls, sources and image credits remain usable, with a contained map status and a local journey illustration. The globe needs WebGL2, network access to Mapbox, and an accepted token. `VITE_MAPBOX_STYLE_URL` may point to a custom Studio style later. The current default is `mapbox://styles/mapbox/light-v11`; the code inspects its loaded layers and mutes labels, boundaries, roads and other clutter. The app preserves Mapbox and OpenStreetMap attribution.

`VITE_MAPBOX_ACCESS_TOKEN` is a **public browser token** and is visible in requests from the app. Restrict production tokens to your deployed URL origins in Mapbox. Keep secret Mapbox credentials and unrelated API keys out of Vite variables. `.env.local` is ignored by Git. [Mapbox counts a map load when a GL JS map initializes](https://docs.mapbox.com/mapbox-gl-js/guides/pricing/); check [current pricing](https://www.mapbox.com/pricing) for allowances and rates. One Mapbox instance persists across browse and journey modes.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The tests verify the twelve image mappings and local assets, 72 cards and 63 edge endpoints, coordinate ranges and GeoJSON coordinate order, unknown dates, same-position markers, antimeridian splitting, and typhoon/coffee branches. Browser checks were made at desktop, tablet and phone widths; representative captures are in `screenshots/` in the local handoff.

## Content and imagery

`content/word-journeys.json` (schema 0.3) is the runtime source for narrative, dates, location anchors, sources and modeled edges. `content/intro-images.json` supplies one historical image and its credit for each journey. Its `images/<name>` references are deliberately left intact; `src/content.ts` resolves them to `/images/intro/<name>`. The display thumbnails in `public/images/intro/thumbs/` are derived from the twelve originals to keep the shelf responsive. The supplied full-resolution originals remain in `public/images/intro/` and appear in the credit viewer.

Edit the JSON and the source material carefully. `reference/word-atlas-content.xlsx` is the editorial workbook for the same research, with Cards, Journeys, Routes, Sources, Events and Build Guide sheets; it is **not** synchronized with the app. The CSVs and image credits in `reference/` are handoff references. Do not replace schema 0.3 with an older 68-card export. Card order comes from `display_order`; geographic lines come only from `journey.edges`. A reading sequence does not assert a borrowing route.

Historical dates and coordinates are qualified in each chapter. Pins are editorial anchors, often approximate regions, not exact birthplaces. Map lines link those display anchors and do not depict verified travel itineraries. Typhoon includes disputed and proposed influences; coffee has a café/cafeteria branch; algorithm includes biographical context. Image dates describe the pictured artifact, not a word's arrival. [Image credits and context](reference/IMAGE_CREDITS.md) document the supplied collection.

Pronunciation uses browser `speechSynthesis` only when the device offers a matching language voice. Readings are modern illustrations, not verified historical pronunciations or recorded native-speaker audio. Ancient/specialist forms and languages without a suitable voice show an unavailable state. The adapter in `src/pronunciation.ts` can later be replaced with reviewed audio. The browser voice list and playback can vary by device.

Share a specific chapter with `/?word=magazine&stop=magazine-arabic` (using actual IDs in the JSON). The URL is updated as readers change chapters; Browser Back and Explore more words restore the shelf. The phone layout offers swipe browsing and a collapsible story sheet, and reduced-motion preferences stop automatic shelf and globe movement.

On the home screen the globe rotates slowly behind the word shelf. It pauses for direct map interaction, while opening a journey stops the idle rotation; returning to the shelf resumes it.
