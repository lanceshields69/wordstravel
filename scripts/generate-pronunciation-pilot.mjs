#!/usr/bin/env node
// A deliberately small, unpublished listening pilot. No app content is changed.
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import process from "node:process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(root, "reference/pronunciation-pilot/audio");
const previewPath = join(root, "reference/pronunciation-pilot/preview.html");
const journeys = JSON.parse(readFileSync(join(root, "content/word-journeys.json"), "utf8"));
const cards = new Map(journeys.journeys.flatMap((journey) => journey.cards.map((card) => [card.id, card])));

// Frozen from the 39 modern candidates in the 2026-10-09 audit. Editorial
// changes to audit wording or later supplied recordings cannot expand scope.
const modernIds = [
  "orange-arabic", "orange-italian", "orange-english",
  "sugar-arabic", "sugar-italian", "sugar-english",
  "ginger-english", "ginger-american", "apricot-english",
  "magazine-arabic", "magazine-italian", "magazine-french",
  "magazine-english", "magazine-publication", "magazine-return",
  "check-persian", "check-english", "check-banking", "check-bill",
  "paradise-english", "zero-arabic", "zero-bejaia", "zero-italian",
  "zero-french", "zero-english", "algorithm-english",
  "coffee-arabic", "coffee-italian", "coffee-dutch", "coffee-english",
  "coffee-cafe", "coffee-cafeteria", "coffee-self-service",
  "ketchup-malay", "ketchup-british", "ketchup-american",
  "typhoon-arabic", "typhoon-portuguese", "typhoon-english",
];

// Explicit provider locales and named Standard voices from Google's catalog.
// `ar` in content is generic; `ar-XA` is Google's Modern Standard Arabic voice.
// This choice is disclosed in the plan and preview, never treated as an exact
// regional or historical pronunciation.
const voices = {
  ar: { locale: "ar-XA", name: "ar-XA-Standard-A", disclosure: "Modern Standard Arabic illustration (ar-XA)" },
  "fr-FR": { locale: "fr-FR", name: "fr-FR-Standard-F" },
  "it-IT": { locale: "it-IT", name: "it-IT-Standard-E" },
  "en-GB": { locale: "en-GB", name: "en-GB-Standard-A" },
  "en-US": { locale: "en-US", name: "en-US-Standard-C" },
  "nl-NL": { locale: "nl-NL", name: "nl-NL-Standard-F" },
  "ms-MY": { locale: "ms-MY", name: "ms-MY-Standard-A" },
  "pt-PT": { locale: "pt-PT", name: "pt-PT-Standard-E" },
};

// One pilot reading per requested language, plus a second Arabic card with
// identical text to exercise recording reuse. Persian has no Google voice.
const sampleIds = [
  "zero-arabic",
  "zero-bejaia",
  "check-persian",
  "magazine-french",
  "zero-italian",
  "zero-english",
];

function modernCandidates() {
  if (modernIds.length !== 39 || new Set(modernIds).size !== 39) {
    throw new Error("The frozen modern-candidate list must contain 39 distinct cards.");
  }
  return modernIds.map((id) => {
    const card = cards.get(id);
    if (!card) throw new Error(`Candidate card is absent from content: ${id}`);
    const generation = card.pronunciation?.generation;
    if (!generation?.language || !generation.text || generation.review_required !== true) {
      throw new Error(`Card ${id} has changed pronunciation eligibility; review it before generating.`);
    }
    return { id, word: card.current_english_word, language: card.language, text: generation.text, requestedLocale: generation.language, voice: voices[generation.language] ?? null, existingAudio: Boolean(generation.audio_url) };
  });
}

function fileFor(item) {
  if (!item.voice) return null;
  const key = JSON.stringify({ voice: item.voice.name, locale: item.voice.locale, text: item.text, encoding: "MP3" });
  return `${createHash("sha256").update(key).digest("hex").slice(0, 20)}.mp3`;
}

function fileExists(file) {
  return file && existsSync(join(outputDir, file)) && statSync(join(outputDir, file)).size > 100;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function preview(samples) {
  mkdirSync(dirname(previewPath), { recursive: true });
  const rows = samples.map((item) => {
    const file = fileFor(item);
    const recording = item.existingAudio
      ? "<span class=\"pending\">Card already has a supplied recording; Google sample skipped</span>"
      : fileExists(file)
      ? `<audio controls preload="none" src="audio/${file}"></audio>`
      : `<span class="pending">${item.voice ? "Awaiting sample generation" : "No exact Google voice; not generated"}</span>`;
    return `<tr><th scope="row">${escapeHtml(item.word)}<small>${escapeHtml(item.id)}</small></th><td lang="${escapeHtml(item.voice?.locale ?? item.requestedLocale)}">${escapeHtml(item.text)}</td><td>${escapeHtml(item.requestedLocale)}${item.voice ? ` → ${escapeHtml(item.voice.locale)}<small>${escapeHtml(item.voice.name)}</small>` : "<small>Unsupported locale</small>"}</td><td>${recording}</td></tr>`;
  }).join("\n");
  writeFileSync(previewPath, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Words Travel pronunciation pilot — listening preview</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:1100px;margin:3rem auto;padding:0 1.25rem;color:#24322b;background:#faf8f2}h1{font-size:2rem}p{max-width:75ch}table{border-collapse:collapse;width:100%;background:#fff}th,td{text-align:left;padding:1rem;border-bottom:1px solid #d8ddd7;vertical-align:middle}thead th{background:#e7eee6}small{display:block;color:#617066;font-size:.8rem}audio{max-width:210px}.pending{color:#76664f}@media(max-width:720px){table,thead,tbody,tr,th,td{display:block}thead{display:none}tr{border:1px solid #d8ddd7;margin:1rem 0}th,td{border:0;padding:.5rem 1rem}}</style></head><body>
<h1>Words Travel pronunciation pilot</h1><p>Unreviewed machine speech samples for listening only. Each input is the card's existing pronunciation text. The Arabic voice is Google's Modern Standard Arabic (ar-XA), an explicit illustration for generic <code>ar</code> cards. No sample is a verified historical reading.</p>
<table><thead><tr><th>Card</th><th>Input text</th><th>Requested → provider locale</th><th>Listen</th></tr></thead><tbody>${rows}</tbody></table>
<p>Files are local to <code>reference/pronunciation-pilot/audio/</code>. This preview is not part of the public app.</p></body></html>\n`);
}

function accessToken() {
  try {
    return execFileSync("gcloud", ["auth", "application-default", "print-access-token"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    throw new Error("Google Application Default Credentials are unavailable. Run `gcloud auth application-default login` locally, then retry. No audio was requested.");
  }
}

async function googleJson(url, token, project, body) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "x-goog-user-project": project, ...(body ? { "Content-Type": "application/json; charset=utf-8" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`Google Cloud TTS returned HTTP ${response.status}: ${(await response.text()).slice(0, 400)}`);
  return response.json();
}

async function generate(samples, project) {
  if (!project) throw new Error("Pass --project YOUR_PROJECT_ID (or set GOOGLE_CLOUD_PROJECT) before generating. Dry-run needs no project.");
  const pending = samples.filter((item) => item.voice && !item.existingAudio && !fileExists(fileFor(item)));
  if (!pending.length) { console.log("All supported pilot recordings already exist; no API calls made."); preview(samples); return; }
  const token = accessToken();
  const catalog = await googleJson("https://texttospeech.googleapis.com/v1/voices", token, project);
  for (const item of pending) {
    const match = catalog.voices?.find((voice) => voice.name === item.voice.name && voice.languageCodes?.includes(item.voice.locale));
    if (!match) throw new Error(`The live API did not list exact voice ${item.voice.name} for ${item.voice.locale}. No substitute will be used.`);
  }
  mkdirSync(outputDir, { recursive: true });
  for (const item of pending) {
    const file = fileFor(item);
    if (fileExists(file)) { console.log(`Reused ${file} for ${item.id}`); continue; }
    const result = await googleJson("https://texttospeech.googleapis.com/v1/text:synthesize", token, project, {
      input: { text: item.text },
      voice: { languageCode: item.voice.locale, name: item.voice.name },
      audioConfig: { audioEncoding: "MP3" },
    });
    if (typeof result.audioContent !== "string") throw new Error(`No audioContent returned for ${item.id}.`);
    const bytes = Buffer.from(result.audioContent, "base64");
    if (bytes.length <= 100) throw new Error(`Empty or invalid MP3 returned for ${item.id}.`);
    const destination = join(outputDir, file);
    const temporary = `${destination}.partial`;
    writeFileSync(temporary, bytes, { flag: "wx" });
    renameSync(temporary, destination);
    console.log(`Saved ${relative(root, destination)} for ${item.id} (${bytes.length} bytes)`);
  }
  preview(samples);
  console.log(`Listening preview: ${relative(root, previewPath)}`);
}

const args = process.argv.slice(2);
if (args.some((arg) => !["--dry-run", "--preview", "--generate", "--project", "--help"].includes(arg) && args[args.indexOf(arg) - 1] !== "--project")) {
  throw new Error("Unknown argument. Use --dry-run, --preview, or --generate [--project PROJECT_ID].");
}
if (args.includes("--help")) {
  console.log("node scripts/generate-pronunciation-pilot.mjs [--dry-run | --preview | --generate --project PROJECT_ID]");
  process.exit(0);
}
const actions = ["--dry-run", "--preview", "--generate"].filter((flag) => args.includes(flag));
if (actions.length > 1) throw new Error("Choose only one action.");
const candidates = modernCandidates();
const samples = sampleIds.map((id) => {
  const item = candidates.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Sample ${id} is not an approved modern candidate.`);
  return item;
});
if (args.includes("--preview")) {
  preview(samples);
  console.log(`Wrote ${relative(root, previewPath)}; no API calls made.`);
} else if (args.includes("--generate")) {
  const index = args.indexOf("--project");
  const project = index >= 0 ? args[index + 1] : process.env.GOOGLE_CLOUD_PROJECT;
  await generate(samples, project);
} else {
  const counts = Object.groupBy(candidates, (item) => item.requestedLocale);
  console.log("Google Cloud TTS pilot — dry run (no files or API calls)");
  console.log(`Modern candidates: ${candidates.length}; supported exact/explicit locales: ${candidates.filter((item) => item.voice).length}; unsupported: ${candidates.filter((item) => !item.voice).length}`);
  console.log(`Already linked user recordings among candidates: ${candidates.filter((item) => item.existingAudio).length}; Google requests for these are skipped.`);
  for (const [locale, items] of Object.entries(counts)) console.log(`  ${locale}: ${items.length} card(s) → ${items[0].voice ? `${items[0].voice.locale} / ${items[0].voice.name}` : "UNSUPPORTED; no substitution"}`);
  console.log("Pilot cards:");
  for (const item of samples) console.log(`  ${item.id}: ${JSON.stringify(item.text)} → ${item.voice?.name ?? "UNSUPPORTED"} ${item.existingAudio ? "[card already has audio; no request]" : item.voice ? (fileExists(fileFor(item)) ? "[existing recording]" : `[new/reusable ${fileFor(item)}]`) : "[no request]"}`);
}
