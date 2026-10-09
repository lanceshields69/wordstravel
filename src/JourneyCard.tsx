import { useEffect, useMemo, useState } from "react";
import type { Card, Journey } from "./content";
import { browserPronunciation } from "./pronunciation";

type Props = {
  journey: Journey;
  card: Card;
  onSelect: (id: string) => void;
  onBack: () => void;
  onNextWord: () => void;
  onRecenter: () => void;
  mapAvailable: boolean;
};

function ScriptWord({ card }: { card: Card }) {
  const arabic = /[\u0600-\u06ff]/.test(card.spelling);
  const devanagari = /[\u0900-\u097f]/.test(card.spelling);
  const chinese = /[\u3400-\u9fff]/.test(card.spelling);
  return (
    <h2
      id="story-heading"
      tabIndex={-1}
      className={`local-word${arabic ? " arabic" : ""}${devanagari ? " devanagari" : ""}`}
      lang={arabic ? "ar" : devanagari ? "sa" : chinese ? "zh" : undefined}
      dir={arabic ? "rtl" : undefined}
    >
      {card.spelling}
    </h2>
  );
}

function PronunciationButton({ card }: { card: Card }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [state, setState] = useState<"idle" | "playing" | "error">("idle");
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    if (typeof speechSynthesis === "undefined") {
      const timer = setTimeout(() => setChecking(false), 0);
      return () => clearTimeout(timer);
    }
    const refresh = () => {
      const available = browserPronunciation.voices();
      setVoices(available);
      if (available.length) setChecking(false);
    };
    refresh();
    const timer = window.setTimeout(() => setChecking(false), 900);
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => {
      window.clearTimeout(timer);
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
      browserPronunciation.stop();
    };
  }, [card.id]);
  const language = card.pronunciation.generation.language;
  const voice = useMemo(
    () =>
      language
        ? (voices.find(
            (v) => v.lang.toLowerCase() === language.toLowerCase(),
          ) ??
          voices.find(
            (v) =>
              v.lang.toLowerCase().split("-")[0] ===
              language.toLowerCase().split("-")[0],
          ))
        : null,
    [language, voices],
  );
  if (checking && language && !voice)
    return (
      <span className="pronunciation-unavailable">Checking pronunciation…</span>
    );
  if (!language)
    return (
      <span className="pronunciation-unavailable">
        Pronunciation not available yet
        <small>Reading awaits review.</small>
      </span>
    );
  if (!voice)
    return (
      <span className="pronunciation-unavailable">
        Pronunciation not available yet
        <small>No matching voice on this device.</small>
      </span>
    );
  return (
    <span className="pronunciation-wrap">
      <button
        type="button"
        className="pronunciation-button"
        onClick={() => {
          setState("playing");
          browserPronunciation.speak(
            card,
            voice,
            () => setState("idle"),
            () => setState("error"),
          );
        }}
        aria-label={`Play modern illustrative pronunciation of ${card.pronunciation.generation.text}`}
      >
        <span aria-hidden="true">◖))</span>{" "}
        {state === "playing"
          ? "Playing reading"
          : state === "error"
            ? "Try reading again"
            : "Hear a reading"}
      </button>
      <small>Modern illustrative reading</small>
    </span>
  );
}

export default function JourneyCard({
  journey,
  card,
  onSelect,
  onBack,
  onNextWord,
  onRecenter,
  mapAvailable,
}: Props) {
  const index = journey.cards.findIndex((c) => c.id === card.id);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const related = journey.edges.filter(
    (edge) => edge.from === card.id || edge.to === card.id,
  );

  return (
    <section
      className={`story-panel${expanded ? "" : " is-collapsed"}`}
      aria-label={`${journey.current_english_word} journey`}
    >
      <div className="story-topbar">
        <span>
          {index + 1} of {journey.cards.length} · {journey.current_english_word}
        </span>
        <button
          className="sheet-toggle"
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "Collapse" : "Open"} story
        </button>
      </div>
      {expanded && (
        <>
          <div className="story-scroll">
            <div className="location-line">
              <span>{card.location.label}</span>
              <span aria-hidden="true">/</span>
              <span>{card.language}</span>
            </div>
            <p className="date-line">{card.date.label}</p>
            <ScriptWord card={card} />
            {card.transliteration && card.transliteration !== card.spelling && (
              <p className="transliteration">{card.transliteration}</p>
            )}
            <p className="meaning">{card.meaning}</p>
            <PronunciationButton card={card} />
            <div className="story-rule" />
            <p className="story-text">{card.story}</p>
            {card.travel?.summary && (
              <div className="story-detail">
                <h3>How it traveled</h3>
                <p>{card.travel.summary}</p>
              </div>
            )}
            {card.cultural_change && (
              <div className="story-detail">
                <h3>What changed</h3>
                <p>{card.cultural_change}</p>
              </div>
            )}
            {related.length > 0 && (
              <div className="story-detail">
                <h3>Connections</h3>
                <ul>
                  {related.map((edge, i) => (
                    <li key={`${edge.from}-${edge.to}-${i}`}>
                      <strong>{edge.relationship.replaceAll("_", " ")}</strong>
                      {edge.confidence !== "supported" && (
                        <span className="uncertain-tag">
                          {" "}
                          · {edge.confidence.replaceAll("_", " ")}
                        </span>
                      )}
                      <span className="edge-note">{edge.note}</span>
                    </li>
                  ))}
                </ul>
                <p className="route-explainer">
                  Solid lines show supported relationships; dashed lines show
                  qualified ones. Lines connect editorial anchors, not
                  documented physical routes.
                </p>
              </div>
            )}
            <details className="about-step">
              <summary>About this step</summary>
              <p>{card.claim_scope || journey.research_note}</p>
              <p>{card.location.note}</p>
              <p>{card.date.note}</p>
              <p>
                Research status: {card.review_status.replaceAll("_", " ")}.
                Confidence: {card.confidence.replaceAll("_", " ")}.
              </p>
            </details>
            {card.learn_more?.length > 0 && (
              <div className="source-section">
                <h3>Learn more</h3>
                <p>
                  Journey references; individual details may need further
                  review.
                </p>
                <ul>
                  {card.learn_more.map((source) => (
                    <li key={source.source_id}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.title} <span aria-hidden="true">↗</span>
                      </a>
                      <span>{source.publisher}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="story-footer">
            <button
              className="outline-button"
              type="button"
              onClick={() => setOutlineOpen((v) => !v)}
              aria-expanded={outlineOpen}
            >
              {outlineOpen ? "Hide chapters" : "All chapters"}{" "}
              <span aria-hidden="true">⌄</span>
            </button>
            {outlineOpen && (
              <ol className="chapter-list">
                {journey.cards.map((c, i) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={c.id === card.id ? "is-current" : ""}
                      onClick={() => {
                        onSelect(c.id);
                        setOutlineOpen(false);
                      }}
                    >
                      {i + 1}. {c.spelling} <small>{c.location.label}</small>
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <div className="chapter-nav">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onSelect(journey.cards[index - 1].id)}
                aria-label={`Previous chapter: ${journey.cards[index - 1]?.spelling ?? "none"}`}
              >
                ← Previous
              </button>
              {index < journey.cards.length - 1 ? (
                <button
                  type="button"
                  onClick={() => onSelect(journey.cards[index + 1].id)}
                  aria-label={`Next chapter: ${journey.cards[index + 1].spelling}`}
                >
                  Next →
                </button>
              ) : (
                <button type="button" onClick={onBack}>
                  Back to words →
                </button>
              )}
            </div>
            <div className="story-extras">
              {mapAvailable && (
                <button type="button" onClick={onRecenter}>
                  Recenter globe
                </button>
              )}
              {index === journey.cards.length - 1 && (
                <button type="button" onClick={onNextWord}>
                  Explore another word
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
