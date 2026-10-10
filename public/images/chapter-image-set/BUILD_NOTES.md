# Chapter image implementation notes

The app’s 12 word journeys each contain multiple chapters. Use one record per chapter; do not map only by word_id or reuse the introductory word image for every stage.

Preferred binding:

```ts
const imageByCardId = new Map(manifest.cards.map(image => [image.card_id, image]));
const chapterImage = imageByCardId.get(chapter.id);
```

The manifest preserves all 72 existing card IDs. Chapter narrative, etymology sources, dates, and globe coordinates belong to the existing word dataset and are unchanged here. Image dates and sources are separate fields.

Use a fixed portrait image slot with a neutral background. Essential meaning stays in the text. For a decorative image duplicating the adjacent caption, an empty alt attribute may be appropriate; otherwise use alt_text. Keep credits available on touch as well as hover. Respect reduced-motion preferences if animating images.

Do not describe a conditional candidate as a historical artifact from the chapter’s location unless context_note explicitly supports that. In particular: al-Khwarizmi’s stamp portrait is imagined; the Béjaïa port photograph is modern; the empty bowl is metaphorical; the Greek Typhon picture demonstrates a mythological association; the modern tomato-ketchup brand is not the inventor of the word.
