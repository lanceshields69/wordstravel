# Word Caravan build handoff

This is the build prompt and prepared content, not an implemented application.

## Start in VS Code

1. Extract this bundle somewhere accessible to VS Code.
2. Open `/Users/lanceshields/Documents/Coding/word caravan` in VS Code.
3. Give Codex `BUILD_PROMPT.md` and the absolute path of this extracted handoff directory. Ask it to follow the prompt and build the MVP in the intended folder, using the repository at https://github.com/lanceshields69/wordcaravan.
4. Let Codex inspect the folder and repository before importing the handoff files. Do not replace an existing checkout wholesale with this directory.

Suggested initial message:

> Read the attached BUILD_PROMPT.md and implement it end to end. The prepared assets and content are in the unzipped word-caravan-build-handoff folder at [insert its absolute path]. Build in /Users/lanceshields/Documents/Coding/word caravan using https://github.com/lanceshields69/wordcaravan. Preserve existing work, run the app and relevant checks, and show desktop/mobile screenshots of the result.

## Inputs

- `content/word-journeys.json`: expanded schema 0.3, 12 words, 72 location/story cards, 63 relationships. Runtime content input.
- `content/intro-images.json`: 12 historical intro image records, keyed by word_id, with captions, credits, original/source URLs, rights information, alt text and crop suggestions.
- `public/images/intro/`: actual downloaded images. Manifest paths such as images/orange.jpg must resolve to /images/intro/orange.jpg in the app.
- `reference/word-atlas-content.xlsx`: editorial reference with six sheets. There is no automated synchronization from the workbook to the JSON.
- `reference/cards.csv`: flat card reference.
- `reference/IMAGE_CREDITS.md`: source and context details for the historical images.
- `reference/image-selection-gallery.html`: open locally to see the image selection and source links.
- `reference/image-collection-preview.png`: visual overview of all 12 selected images.

## Live dependencies and known limits

Mapbox GL JS v3 is the intended globe renderer. A public browser Mapbox token is needed for live map setup and validation. Configure it locally as VITE_MAPBOX_ACCESS_TOKEN; never embed a secret token in the client. The app should still offer its readable journey interface if map setup fails.

Generated pronunciation can use browser speech synthesis for supported modern-language readings. Voices vary by device. No reviewed audio files or per-stop illustrations have been produced. Ancient/specialist readings remain pending. Unknown dates, approximate coordinates and proposed relationships are deliberately preserved in the data.

Historical intro images are supplied for all 12 words; their dates describe artworks/objects, not word arrivals. Ketchup and typhoon have lower-resolution sources. Preserve their source credits and context.

This chat session could not access the requested Documents directory, including after elevated access was attempted. No files in that project folder or the GitHub repository were changed. The complete handoff was packaged in the chat workspace instead.
