# Build Word Caravan

You are Codex working in VS Code. Build a complete, polished MVP of Word Caravan, an interactive experience that follows familiar English words across geography, time, languages and changing meanings. Implement and run the app; do not stop at a plan or a static mockup.

## Workspace and repository

- Intended project folder: `/Users/lanceshields/Documents/Coding/word caravan`
- GitHub repository: `https://github.com/lanceshields69/wordcaravan`
- Inspect the folder, repository state, existing files and any `AGENTS.md` before changing anything. Preserve existing work. If the folder is already the repository checkout, use it. If it is empty and the repository is accessible, clone into this exact folder. If it contains files but no checkout, inspect and integrate carefully; never clear the directory to make cloning work.
- This prompt and the supplied handoff are authorized inputs for local implementation. Use reasonable implementation judgment and continue through normal setup, fixes and validation. Ask only for information that genuinely blocks dependent work; finish unaffected work meanwhile.
- Treat the prepared content as user material. Do not overwrite it with demo data or unresearched facts. Do not commit credentials. Prepare a reviewable local implementation; publishing, deployment and pushing to GitHub are separate steps unless the user explicitly requests them.

## Product and scope

App name: **Word Caravan**. Tagline: **Every word has a journey.**

The experience begins with a curated shelf of words. Selecting one reveals the same globe behind the shelf, brightens it, and opens the first chapter of that word's journey. Users navigate through location cards or click pins to explore. The pleasure should come from watching a familiar word become unfamiliar, then recognizable again.

Use all 12 prepared journeys: orange, sugar, ginger, apricot, magazine, check, paradise, zero, algorithm, coffee, ketchup and typhoon. The supplied expanded JSON contains 72 cards and 63 explicitly modeled relationships. Counts vary by word; never pad a journey with invented stops to make lengths match.

The MVP has curated browsing, a globe, journey cards, source links, historical intro images and generated pronunciation where supported. No search, accounts, CMS, payments, social features or backend are required. Favor a focused, finished experience over adding unrelated features.

## Reference design

Use this Figma file as the visual base:

https://www.figma.com/design/3ImV63TPfg1upJrj9JuURa/Untitled?node-id=1-2

Inspect the actual file through the available Figma connector or browser before implementing. This is an inspection task; do not modify the Figma file. If a connector is unavailable, the shared canvas has been viewable in a browser. If access remains unavailable, proceed from the visual description and supplied image collection, and identify that limitation at handoff.

The design shows a dark teal environment, a large serif opening headline reading “Every word has a journey,” historical image cards across the foreground, and a dim globe behind them. Journey screens use a narrow ivory story card on the left and a large globe on the right. The magazine sequence demonstrates changing local spellings, including Arabic script and Italian magazzino. Preserve that composition, restraint and editorial character.

Use real geographic shapes. The simplified faceted continents in the design are a visual reference, not a requirement to distort geography. Match spacing, color, typography and visual balance while making the globe geographically functional.

## Supplied files and content authority

The portable handoff bundle has this structure:

```text
BUILD_PROMPT.md
HANDOFF_README.md
content/
  word-journeys.json
  intro-images.json
public/images/intro/
  orange.jpg
  sugar.jpg
  ginger.png
  apricot.jpg
  magazine.jpg
  check.jpg
  paradise.jpg
  zero.jpg
  algorithm.jpg
  coffee.jpg
  ketchup.jpg
  typhoon.jpg
reference/
  word-atlas-content.xlsx
  cards.csv
  intro-images.csv
  IMAGE_CREDITS.md
  image-selection-gallery.html
  image-collection-preview.png
```

If these are already staged in the project, use them. Otherwise copy them from the unzipped handoff folder into the checkout. This is a handoff directory, not a scaffold to replace existing application files.

The expanded `content/word-journeys.json` is the runtime input, schema version 0.3. The spreadsheet is the editorial reference for these same journeys, with sheets for Cards, Journeys, Routes, Sources, Events and Build Guide. There is no live spreadsheet synchronization. Keep JSON and spreadsheet roles clear in the README; do not silently use the older 68-card JSON if another copy exists.

`content/intro-images.json` is a separate manifest. Join `images[].word_id` to `journeys[].id`. Its `image_file` values are relative paths such as `images/orange.jpg`; resolve these to `/images/intro/orange.jpg` in the app. Do not mutate the research manifest merely to make paths work; create an explicit asset-path adapter.

Keep the supplied narrative text and sources intact. Original copy should feel curious, vivid, lightly witty and attentive to what trade, power, learning and everyday use did to words. These are broad editorial qualities, not a request to imitate a living writer. The source prose was not copied. Do not scrape dictionary entries during the build.

Some linguistic connections, dates and readings remain uncertain. Render uncertainty honestly and elegantly. These are sourced research drafts, not a claim that every point is academically settled.

## Implementation stack

If this is a new repository, use React, TypeScript and Vite. Use the current compatible stable package releases and commit the lockfile. Prefer plain CSS or CSS modules with design tokens; use the existing styling setup if the repo already has one. Use a small animation library only if it makes the transition and carousel more reliable. Avoid a large UI kit that changes the design's character.

Use **Mapbox GL JS v3 with globe projection** as the primary geographic renderer. It already supplies a live WebGL globe, map camera, GeoJSON layers and interactive markers. Integrate it directly in a React component rather than stacking unnecessary map wrappers. Maintain one map instance across browsing and journey modes.

Mapbox setup:

- Read the public browser token from `VITE_MAPBOX_ACCESS_TOKEN` in `.env.local`.
- Optional `VITE_MAPBOX_STYLE_URL` allows a custom Studio style later.
- Provide `.env.example` with placeholder values and ignore `.env.local`.
- A browser public token is expected to be visible to clients; never put secret Mapbox tokens or unrelated API keys in Vite environment variables. Document URL restrictions for a production public token.
- Mapbox is usage-priced, with current allowances determined by its pricing page. Do not describe it as unlimited free software. Reusing one instance also avoids needless map initializations.
- Retain required Mapbox branding and map-data attribution in both modes. Decorative darkness overlays must not obscure those controls.

Use the globe projection explicitly. Start from a Mapbox basemap or custom style that can be reduced to muted land and ocean colors. Keep political boundaries, roads, POIs and busy city labels out of the primary composition. Use application labels for journey pins. Read the actual loaded style rather than guessing unsupported layer IDs. Prefer a configurable style adapter and `style.load` handling.

Style land in muted parchment, oceans in dark blue-green, space in deep teal, with very subtle graticules and atmosphere. Avoid satellite textures, bright default blue oceans, neon glow and a star-field theme. Use the supported fog/atmosphere API. Mapbox's current globe guide does not support CustomLayerInterface on globe, so do not depend on an unsupported Three.js custom map layer for floating routes.

Keep journey camera zoom low enough to preserve the visible globe rather than morphing into a street map. Test the resulting globe size at desktop and mobile dimensions instead of assuming a fixed zoom looks identical everywhere.

If the Mapbox token is missing or invalid, complete the UI, dataset, navigation and a readable non-map journey mode. Explain map setup in a contained status area and README. Do not fake a functioning Mapbox globe with a circle, a flat map, or random polygons. Finish everything independent of the token, then request the public token only if needed for live map verification. Distinguish completed UI checks from live map checks that were not possible.

## Visual direction

Treat this as a literary atlas: spacious, tactile and calm. The historical images provide texture; the interface remains clean.

Suggested tokens, adjusted only as needed to match Figma:

```css
--color-space: #172F35;
--color-ocean: #365961;
--color-paper: #F5F1E8;
--color-card: #FFFCF6;
--color-ink: #263A40;
--color-accent: #A76543;
```

Use Google Fonts **Newsreader** for the app title, word headings and narrative text, and **DM Sans** for controls and metadata. Load Latin plus the required language coverage; Newsreader is not the font solution for every script. Use suitable script fallbacks such as Noto Sans Arabic and Noto Sans Devanagari. Render Arabic right-to-left within its own language block, not the entire page. Use language and direction attributes where appropriate.

Opening word titles are approximately 36–48px on desktop. Narrative text is 18–20px with generous line height. Controls and metadata are 13–16px. Use responsive sizes. Wordforms are the typographic hero; date labels and sources are secondary. Use subtle edges and shadows, limited corner rounding and sufficient contrast. Avoid dashboard panels, pill-heavy UI and excessive glass effects.

## Opening experience: word carousel

- Place the small Word Caravan identity near the top left. Show “Every word has a journey” as the larger editorial headline and a short instruction such as “Choose a word. Follow its journey.”
- The live globe is already mounted in the background. It is heavily dimmed, recognizable and quiet. Keep intro cards, headline and controls crisp and fully opaque.
- On a large screen, show around 3–4 substantial cards at once, with partial neighboring cards suggesting more to discover. All 12 are reachable.
- Each card contains its prepared historical image, a large Newsreader word title, the supplied one-sentence hook and a subtle invitation to begin. Give image credits an independently focusable control; opening credits must not start the journey.
- The carousel drifts slowly from left to right and wraps smoothly. As a card approaches the visual center, scale it gradually from about 0.88 at the edges to 1.05 at the center. Reserve enough space to avoid clipping enlarged cards or introducing layout jumps.
- Pause the drift on hover, keyboard focus and active pointer interaction. Offer a visible pause/play control and manual previous/next controls. Respect reduced-motion preference by defaulting to a stationary, manually navigable shelf.
- Do not move focused content out from under a keyboard user. Do not expose duplicate focusable cards or duplicate DOM IDs if the looping implementation duplicates visual elements.
- On phones, use manual swipe/snap browsing, roughly one main card plus a neighbor. Do not rely on hover or automatic movement.
- A card is activated by click, tap, Enter or Space. Its word and hook should form a useful accessible name.
- Preserve the shelf's position and focused word when returning from a journey. Store lightweight exploration state locally if useful; no account is needed.

## Transition into a journey

Use a deliberate transition lasting roughly 800–1,200ms total, tuned by eye:

1. Pause carousel motion and mark the chosen word.
2. Fade/translate the cards out of the foreground.
3. Reduce the darkness overlay so the same mounted globe brightens.
4. Move the map camera to the first selected card's geographic anchor.
5. Reveal the first story card and active pin, with the modeled outgoing relationship highlighted where one exists.

The globe should feel revealed, rather than replaced by another page. Avoid remounting it, flashing basemaps or resetting to a generic world view. Cancel old camera/transition work if a later interaction supersedes it. Reduced-motion mode uses a short fade and immediate camera positioning without a sweeping flight.

The existing research display order determines the first chapter. Do not claim it is a uniquely proven birthplace when the root status says otherwise.

## Journey screen and story cards

Desktop: an ivory story card on the left, approximately 320–400px wide; the large globe fills the remaining space. Maintain a narrow Word Caravan identity at top left and an **Explore words** button at top right. The current English word remains visible even when a chapter's local spelling is different.

The story card should show:

1. A compact chapter indicator, such as “2 of 6,” and the current English word.
2. Location, language and a human-readable date label.
3. The local word spelling as the principal heading; transliteration when supplied.
4. Meaning at that stage and a generated-pronunciation control when available.
5. The prepared narrative story, preserved in full.
6. Compact “How it traveled” and “What changed” details when present.
7. Relevant historical/illustrative media only when it has a real supplied asset.
8. Clickable “Learn more” sources with source titles and publishers.
9. Previous and next controls with meaningful labels.

Support long text inside the card without shrinking it into illegibility. Keep navigation accessible while the body scrolls. Avoid dumping internal JSON fields, generation prompts or technical status strings into the product UI. Research context and uncertainty can sit in a concise “About this step” disclosure. Source links should distinguish journey-level references from evidence for every individual claim.

A full-card outline button may expose a readable list of chapters so users have an alternative to the map. The final chapter offers “Back to words” and an optional next-word suggestion; it must not advance automatically. Previous is disabled at the first chapter, next is replaced or disabled at the last.

On mobile, place the globe above a compact, scrollable bottom story sheet or stacked card. Keep the active pin visible above the sheet. The sheet needs a clear open/collapse control and must not trap the page's scrolling. Preserve safe areas, touch targets and source-link access.

## Globe, pins and relationships

- Use each card's supplied `location.longitude` and `location.latitude`. Mapbox/GeoJSON coordinate order is **[longitude, latitude]**, not the reverse.
- Coordinates are editorial display anchors. Respect `location.precision`, uncertainty radius and explanatory notes. Use a softer halo and a concise “Approximate region” label for regional anchors. Do not describe a display coordinate as an exact historical birthplace.
- Pins are small copper-centered markers, with a restrained active ring and a nearby local-word label when it fits. Use accessible buttons or an equivalent accessible companion chapter list. Labels must not overwhelm the globe.
- Show the selected chapter distinctly. Completed chapters can be slightly stronger than future ones. Clicking a pin selects that actual card and updates the story, URL and camera coherently.
- If multiple cards share the same geographic position, keep the real coordinates. Use a chapter selector, stack or grouped marker rather than inventing offsets and presenting them as historical sites.
- Pins/labels on the far side of the globe should not appear through the planet. Use supported globe visibility behavior or a correctly tested visibility calculation. Marker terrain occlusion settings alone should not be assumed to solve all globe occlusion cases.
- Offset the desktop camera composition so the active pin lies in the unobstructed globe area, not underneath the left card. Recalculate padding/offsets when the layout changes. Keep both active and relevant next points visible when practical, while retaining the globe composition.
- Stop background rotation when entering a journey or when the user interacts with the globe. Allow normal drag and modest zoom. Never fight the user's gesture with continuous camera recentering.
- Offer a small recenter control that returns to the active chapter after free exploration.

Routes must come from `journey.edges`, never from automatically connecting every adjacent card. The editorial reading order is separate from the relationship graph. Each edge has `from`, `to`, `relationship`, `confidence`, `rendering`, source IDs and a note. Respect them.

Draw restrained globe-surface GeoJSON line layers with densified geodesic coordinates where useful. Handle the antimeridian and same-position edges without a line cutting across the wrong side of the world or a meaningless loop. Highlight the selected chapter's relevant edges. Use solid/dashed treatments from `edge.rendering`, with a short legend or tooltip explaining uncertainty and the relationship. Curves express a relationship between display anchors; they do not prove an actual trade route, ship itinerary or distance traveled.

When the next editorial chapter has no direct modeled edge, move to its card without inventing a connecting line. Biographical context, related derivation and proposed influence are different from sequential borrowing; preserve those distinctions in the display.

**Typhoon needs special care.** Its Greek, Arabic/Indic, Portuguese and Chinese contributions are modeled as disputed or proposed branches and influences. Do not turn them into one certain Greece → Arabia → India → Portugal → China → England timeline. Similarly, coffee's café/cafeteria branch is distinct from a simple linear coffee itinerary, and algorithm includes name geography/biographical context.

## Dates and chronology

Display `date.label`. Read numerical years only when present. Most unknown dates are intentionally null. An attestation, publication date, documented event and exact arrival date are different claims; keep the supplied type and notes available.

The navigation strip is a **chapter sequence**, not automatically a proportional historical timeline. If you add time information, only position eligible cards on a chronological scale and provide an undated section. Never assign invented years, spread unknown stages evenly across centuries, or label a printing date as a word's arrival.

Use short audience-facing uncertainty labels, with the fuller supplied note accessible on demand. Do not remove uncertainty to make the story more dramatic.

## Generated pronunciation

Use generated pronunciation only for this MVP. No recorded native-speaker audio has been supplied, and the JSON's `audio_url` values are currently null.

Implement a small pronunciation service interface. For the initial app, browser Web Speech `speechSynthesis` is an acceptable zero-backend generated-audio adapter:

- Read `pronunciation.generation.language`, `text` and `label`; use the configured word/text, not an English title substituted for it.
- Load the actual voice list, handle delayed `voiceschanged` and select a voice for the requested BCP-47 language. Voice availability depends on the user's device/browser.
- Enable playback only when there is a suitable language voice. Do not silently read Arabic, Chinese or Sanskrit through an English voice.
- Label modern illustrative readings clearly. Since research audio review is pending, do not call them historically authentic or expert-verified.
- For ancient/specialist forms with a null language, or unsupported voices, show “Pronunciation not available yet” or an equally concise disabled state. Show supplied transliteration; do not invent IPA.
- Playback is user-initiated. Provide loading/playing/error states, replay, and stop or cancel the old utterance when changing cards. Do not accumulate utterances across rapid navigation.
- Keep the adapter replaceable with pre-generated reviewed audio files later. No paid TTS account or secret client-side key is required for this build.

Test actual playback where supported. Browser synthesis is a prototype implementation, not a claim that all 72 historical forms now have generated recordings.

## Historical images and other visuals

Use the 12 prepared intro images from local assets. Do not hotlink Wikimedia or museum servers at runtime. The manifest supplies original/source URLs, image dates, credit lines, declared rights, alt text and CSS crop guidance. Keep credits reachable from the intro cards and any expanded image viewer.

The selection consists of botanical plates for orange/sugar/ginger/apricot, a 1731 magazine title page, a medieval ivory chess king, a 1589 garden miniature, the Bakhshali manuscript, a 1451 mathematical handbook, an Ottoman coffeehouse painting, an 1898 ketchup advertisement and a c.1915 artwork titled Typhoon. These illustrate aspects of the journeys; they do not all depict the earliest word stage. The actual manifest is authoritative if a label differs from this summary.

Important asset notes:

- Use image dates as image dates, not linguistic dates.
- Bakhshali manuscript dating remains disputed. Do not caption it “the first zero.”
- The magazine scan is an edition of the January 1731 issue, not evidence that this copy is the first printing.
- The 1451 handbook is a later volume containing mathematical texts, not al-Khwarizmi's ninth-century original.
- Ketchup and typhoon have limited source resolution. Keep their display size reasonable and avoid aggressive zoom crops or fake AI restoration.
- Preserve source pixels. CSS cropping and responsive layout are acceptable. Do not generate replacement historical images or pass invented pictures off as evidence.

Per-stage `card.visual` entries are **briefs**, not completed image assets: `status` is often `brief_only` and `image_url` is null. Do not put broken image tags into the journey cards. The MVP can use text-first cards and a small word-level image clearly labeled as a journey illustration. Only include per-stop illustrations if an actual supplied asset exists. Do not invent a historic scene or commission 72 images as part of this build.

## Content adapter and state architecture

Create typed, reusable components rather than duplicating a screen per word. A reasonable structure is:

```text
src/
  components/WordCarousel.tsx
  components/WordIntroCard.tsx
  components/Globe.tsx
  components/JourneyCard.tsx
  components/JourneyNavigation.tsx
  components/PronunciationButton.tsx
  components/SourcesDisclosure.tsx
  components/ImageCredits.tsx
  content/loadContent.ts
  content/types.ts
  lib/geography.ts
  lib/pronunciation.ts
  state/exploration.ts
  styles/tokens.css
```

Adapt this to the existing repository. Keep raw content separate from UI models and do not discard provenance fields during transformation.

Actual JSON structure:

- Top level: `schema_version`, `created`, `status`, `policy`, `journeys`, `voice`.
- A journey: `id`, `current_english_word`, `root`, `hook`, `research_note`, `cards`, `edges`, `sources`, `card_count`.
- A card: `id`, `title`, `language`, `spelling`, `transliteration`, `meaning`, `location`, `date`, `stage_kind`, `story`, `travel`, `cultural_change`, `pronunciation`, `visual`, `source_ids`, `confidence`, `review_status`, `learn_more`, `sources_ui`, `display_order`, `claim_scope`, `timeline_eligible`, plus editorial counts.
- `location` contains latitude/longitude, label, precision and uncertainty information.
- `travel` is an object with a summary/evidence status, not an array of transport icons.
- `learn_more` provides source title, publisher, URL and scope. Journey sources are inside each journey, not a global `sources` collection.
- `edges` are inside each journey, not a global `routes` collection.
- The image manifest has top-level `images[]`, each keyed by `word_id`.

Sort chapter navigation by `display_order` while keeping stable card IDs. Model browse/transition/journey states explicitly, with active word, active card ID, carousel position, animation state and playback state. Cancel superseded transitions. Guard invalid deep links and missing assets gracefully.

Use a shareable URL such as `/?word=magazine&stop=magazine-arabic`, with actual IDs from the dataset. Initial loading of a valid URL should open that chapter. Navigating into a word should create a history entry; chapter changes can replace that entry to avoid forcing dozens of Back clicks. Browser Back and Explore words should restore browsing coherently. Do not assume the example stop ID exists without reading the content.

## Accessibility and performance

- Keyboard access to every word, chapter, pronunciation control, source link and return control.
- Clear focus indicators, useful accessible names, meaningful heading structure and 44px practical touch targets.
- Pause carousel on focus; honor reduced motion for carousel, globe rotation and camera travel.
- A readable chapter list/card interface remains usable without dragging the globe.
- Focus moves to the active story heading after entry and returns to the selected intro card when exiting. Do not steal focus on ordinary map drag.
- Avoid live-region announcements every animation frame. Announce meaningful chapter changes succinctly.
- Check contrast, especially muted metadata and source links. Preserve readable script shaping and bidirectional text.
- Lazy-load images outside the visible carousel neighborhood. Preload the chosen/adjacent assets. Large original files should not block first interaction.
- Use a single globe instance; clean up map events, animation frames, marker nodes, resize observers and speech events. Handle React development lifecycle without leaking maps or creating duplicate layers.
- Pause idle movement in hidden tabs. Keep pointer gestures and animations smooth; do not update React state every map frame.
- Test resizing, slow loading, missing voices, invalid token, WebGL unavailable and source/image failures without blanking the entire app.

## Verification and completion

Implement in this order: inspect inputs/design/repo; establish the app and typed content; mount and style the globe; build carousel; implement the reveal transition; integrate chapters/pins/edges; add sources, credits and pronunciation; refine mobile/accessibility; run checks and capture screenshots.

Use meaningful tests for behavior and content integrity:

- All 12 journey IDs have exactly one intro asset mapping.
- Expanded data contains the expected 72 cards; card IDs and relationship endpoints resolve.
- Latitude/longitude ranges and GeoJSON coordinate order are correct.
- Unknown dates remain unknown; editorial chapter order never fabricates graph edges.
- Typhoon's proposed/disputed edges remain distinguishable and coffee's branch remains intact.
- Same-location chapters and antimeridian relationships do not break navigation or rendering.
- Enter a word, advance/reverse, click a pin, return to the shelf, reopen another word and load a valid deep link.
- Rapid chapter/word changes do not leave stale cards, markers, speech or camera animations.
- All local assets load; image credits and research links are reachable.
- Voice-unavailable and map-unavailable states work; a suitable voice can actually play a word when present.
- Keyboard, reduced-motion and mobile interactions work.

Run the production build, TypeScript check and the repository's relevant tests/lint. Add focused browser tests where useful; do not write tests that simply copy component implementation. Verify visually in a real browser at roughly 1440px desktop, 1024px tablet and 390px phone widths. Inspect opening, transition, magazine, typhoon, a longer journey and the return state. Capture representative desktop/mobile screenshots as handoff evidence. If a Mapbox token is unavailable, report the exact live checks that remain unverified instead of claiming everything passed.

Leave a working local app, an accurate README, `.env.example`, a locked dependency graph and clear asset/content attribution. README should cover install/dev/build commands, public Mapbox token setup, configured style, content editing, generated-pronunciation limitations and how to reproduce tests. Summarize what works, what was tested, how to run it and any concrete unresolved dependencies. Keep routine choices moving; do not end with only a proposed architecture.

## Primary technical references

Use current official documentation while implementing rather than guessing API support:

- Mapbox globe and atmosphere: https://docs.mapbox.com/mapbox-gl-js/guides/globe/
- Rotating globe example: https://docs.mapbox.com/mapbox-gl-js/example/globe-spin/
- Mapbox map API/camera: https://docs.mapbox.com/mapbox-gl-js/api/map/
- Markers and attribution: https://docs.mapbox.com/mapbox-gl-js/api/markers/
- Mapbox map-load pricing: https://docs.mapbox.com/mapbox-gl-js/guides/pricing/
- Current Mapbox pricing: https://www.mapbox.com/pricing
- Browser-generated speech: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
