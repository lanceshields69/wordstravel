# Google Cloud Text-to-Speech pilot — Words Travel

Checked 2026-10-09 against the [Google Cloud voice catalog](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types), [pricing](https://cloud.google.com/text-to-speech/pricing), and the 39 modern illustrative candidates in [PRONUNCIATION_AUDIT.md](PRONUNCIATION_AUDIT.md). Catalog availability means a voice can be requested; it does **not** verify the pronunciation. The script confirms each named voice against the live `voices.list` response before making a synthesis request.

| Content locale | Modern cards | Google Standard voice for pilot | Decision |
| --- | ---: | --- | --- |
| `ar` | 7 | `ar-XA-Standard-A` | Supported with an **explicit** Modern Standard Arabic (`ar-XA`) illustration. `ar` has no specified regional dialect. |
| `it-IT` | 5 | `it-IT-Standard-E` | Exact locale supported. |
| `en-GB` | 14 | `en-GB-Standard-A` | Exact locale supported. |
| `en-US` | 4 | `en-US-Standard-C` | Exact locale supported. |
| `fr-FR` | 4 | `fr-FR-Standard-F` | Exact locale supported. |
| `fa-IR` | 1 | None | **Unsupported** in the current Google catalog. No Arabic or other substitute. |
| `nl-NL` | 1 | `nl-NL-Standard-F` | Exact locale supported. |
| `es-MX` | 1 | None | **Unsupported** as an exact locale. `es-US` and `es-ES` are listed, but neither is silently substituted. |
| `ms-MY` | 1 | `ms-MY-Standard-A` | Exact locale supported. |
| `pt-PT` | 1 | `pt-PT-Standard-E` | Exact locale supported. |
| **Total** | **39** | | **37 supported for this plan; 2 unsupported.** |

Google's catalog lists [Modern Standard Arabic as `ar-XA`](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types) and the named Standard voices above. It currently lists no `fa-IR` or `es-MX` voice. `yue-HK` Cantonese voices are listed, but **Typhoon's Chinese comparison is outside these 39 modern candidates** and needs the separate content research described in the audit. A supported voice for that locale would not settle the proposed etymology or verify a historical reading.

## Pilot samples

| Card | Stored generation text | Voice | Result |
| --- | --- | --- | --- |
| `zero-arabic` | صِفْر | `ar-XA-Standard-A` | One Arabic MP3 planned. |
| `zero-bejaia` | صِفْر | `ar-XA-Standard-A` | Reuses the same MP3 as `zero-arabic`. |
| `check-persian` | شاه | None | Skipped: `fa-IR` is unsupported by this provider. |
| `magazine-french` | magasin | `fr-FR-Standard-F` | One French MP3 planned. |
| `zero-italian` | zero | `it-IT-Standard-E` | One Italian MP3 planned. |
| `zero-english` | zero | `en-GB-Standard-A` | One UK English MP3 planned. |

The input comes from each card's `pronunciation.generation.text`, including the Arabic diacritics. It is never translated from the English word. Recordings are keyed by text, named voice, locale, and MP3 encoding, so identical inputs reuse one file. Existing nonempty MP3s and cards already linked to a supplied recording are skipped. Three of the 39 modern candidates now have user-recorded Typhoon audio; they remain in the catalog comparison but are outside this Google pilot. Output goes to `reference/pronunciation-pilot/audio/` and the [local listening preview](reference/pronunciation-pilot/preview.html); Google pilot files are not wired into the app or labeled verified. The generator cannot generate the full collection.

## Setup and commands

Google requires a [Cloud project with billing enabled and the Text-to-Speech API enabled](https://docs.cloud.google.com/text-to-speech/docs/get-started). Use a project you control, then install and initialize `gcloud`, run `gcloud auth application-default login`, and set the ADC quota project if prompted. The script uses those local [Application Default Credentials](https://docs.cloud.google.com/text-to-speech/docs/authentication), requests a token through `gcloud`, and sends it only to Google's API from Node. No credential is read by Vite or included in the browser bundle. Do not place service account keys in `public/` or `VITE_*` variables.

```sh
node scripts/generate-pronunciation-pilot.mjs --dry-run
node scripts/generate-pronunciation-pilot.mjs --preview
node scripts/generate-pronunciation-pilot.mjs --generate --project YOUR_PROJECT_ID
```

`--dry-run` makes no files or API calls. `--preview` refreshes the local HTML without making API calls. `--generate` first checks the [live `voices.list` API](https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1/voices/list) for **the exact named voice and locale**, then calls [text.synthesize](https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize) for at most four unique MP3s. It stops on a missing voice or API error; it never changes locale or voice automatically. The preview can be opened directly as a local HTML file after generation.

The chosen **Standard** voices have a [monthly free allowance of 4 million characters](https://cloud.google.com/text-to-speech/pricing), but billing must be enabled and Google charges usage above the allowance. The pilot is a few dozen characters; the script does not know the account's prior monthly use. Review the project's billing and quota before generating. No paid tier voice is selected.

### Current run status

The local login was refreshed and a dry run passed. A live `voices.list` request returned HTTP 403 because Text-to-Speech was disabled on the configured project. An authorized attempt to enable the API returned `FAILED_PRECONDITION`: the project's billing account is **not open**. Therefore the API remains disabled, no synthesis request was sent, and no MP3 exists yet. The local preview shows pending samples. A billing-enabled project (or an open billing account on this project) is required before running `--generate` again.

## Review boundary

The Google pilot does not alter historical review states. Sixteen `generation.language: null` cards remain blocked; a separately supplied, owner-approved Ancient Greek recording for Typhoon is a file-only exception. The other 16 research flagged cards, including Old French forms, the mixed Hindi/Urdu Typhoon card, and the disputed Cantonese comparison, are omitted from Google generation. The four planned Google recordings are modern machine illustrations pending listening and editorial review. The Google pilot itself does not change content or public playback.
