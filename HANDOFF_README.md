# Words Travel build handoff

This folder contains the original build prompt and prepared content for Words Travel. The app is implemented in this repository; use [README.md](README.md) for setup and checks.

Production domain: [wordstravel.app](https://wordstravel.app/). GitHub repository: [lanceshields69/wordstravel](https://github.com/lanceshields69/wordstravel).

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
