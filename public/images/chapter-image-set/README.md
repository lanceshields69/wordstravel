# Words Travel: one source image for each chapter

This package contains 72 distinct downloaded images from 72 source records, assigned individually to the 72 chapters across 12 words. It replaces the first pass’s repeated image assignments. These are sourced and previewed candidates; no app placeholders have been changed.

## Review

Open gallery.html with the images folder alongside it. Each chapter shows 96×120 and 64×80 previews, language, location, meaning, source link, and an expandable credit/context note. The Figma slot’s exact dimensions were not measured programmatically.

## Import

1. Join chapter-images.json to the word journey dataset using card_id.
2. Copy the selected image_file into the app’s public image directory. Use its local path at runtime; no live Commons dependency is needed.
3. Apply crop_box_normalized = [left, top, right, bottom] as a source rectangle, preserving its aspect ratio. The gallery demonstrates this with CSS; it does not raster-edit the downloaded images.
4. Keep image_caption or alt_text with the image. Make source_url, creator, license, license_url, and context_note reachable from the card’s image credit control.
5. If making optimized cropped derivatives, retain credits and applicable image licenses. Keep the original source files.

chapter-images.csv is an alternate flat manifest. IMAGE_CREDITS.md has all attribution information. JSON also records download dimensions, format, and SHA-256 for each selected file.

## Editorial scope

Strong means the focal subject is clear at small size. Conditional means a caption, close crop, or symbolic/contextual connection is needed; it is not an empty slot. Manuscript and arithmetic images are context pictures, not text readers should decipher at thumbnail size. Modern photographs, nineteenth-century art, and modern diagrams must not be labeled as objects from an earlier word date or as evidence of a culture-specific invention. Each record has an individual explanation.

This is a mixed source-art set. Consistent illustration styling is a separate design step. The set is ready for selection and integration, not a claim that all 72 images have identical visual quality or depict exactly contemporaneous artifacts.
