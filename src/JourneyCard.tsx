import { useEffect, useMemo, useState } from "react";
import type { Card, Journey } from "./content";
import { browserPronunciation } from "./pronunciation";

type Props = {
  journey: Journey;
  card: Card;
  onSelect: (id: string) => void;
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
  const [showReason, setShowReason] = useState(false);

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
        ? (voices.find((v) => v.lang.toLowerCase() === language.toLowerCase()) ??
          voices.find(
            (v) =>
              v.lang.toLowerCase().split("-")[0] ===
              language.toLowerCase().split("-")[0],
          ))
        : null,
    [language, voices],
  );
  const unavailable = !checking && (!language || !voice);
  const reason = !language
    ? "Reading awaits review."
    : "No matching voice on this device.";

  return (
    <div className="pronunciation-wrap">
      <button
        type="button"
        className="pronunciation-button"
        onClick={() => {
          if (unavailable) {
            setShowReason((current) => !current);
            return;
          }
          if (!voice) return;
          setState("playing");
          browserPronunciation.speak(
            card,
            voice,
            () => setState("idle"),
            () => setState("error"),
          );
        }}
        aria-label={
          unavailable
            ? `Pronunciation unavailable for ${card.spelling}. ${reason}`
            : checking && !voice
              ? "Checking pronunciation availability"
              : `Play modern illustrative pronunciation of ${card.pronunciation.generation.text}`
        }
        aria-expanded={unavailable ? showReason : undefined}
        title={unavailable ? `Pronunciation not available yet. ${reason}` : "Hear a reading"}
      >
        <img src="/icons/pronunciation.svg" alt="" aria-hidden="true" />
      </button>
      {(showReason || state === "error") && (
        <span className="pronunciation-note" role="status">
          {state === "error" ? "Could not play this reading." : `Pronunciation not available yet. ${reason}`}
        </span>
      )}
    </div>
  );
}

export default function JourneyCard({
  journey,
  card,
  onSelect,
  onNextWord,
  onRecenter,
  mapAvailable,
}: Props) {
  const index = journey.cards.findIndex((item) => item.id === card.id);
  const [expanded, setExpanded] = useState(true);
  const related = journey.edges.filter(
    (edge) => edge.from === card.id || edge.to === card.id,
  );
  const chapterNumber = String(index + 1).padStart(2, "0");

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
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          {expanded ? "Collapse" : "Open"} story
        </button>
      </div>
      {expanded && (
        <>
          <div className="story-scroll">
            <div className="journey-card-meta">
              <span>{card.location.label}</span>
              <span>
                {card.date.label === "Date not established in reviewed sources"
                  ? "Date uncertain"
                  : card.date.label}
              </span>
            </div>
            <div className="journey-card-word-row">
              <ScriptWord card={card} />
              <PronunciationButton card={card} />
            </div>
            <div className="journey-card-subline">
              <span className="journey-language">{card.language}</span>
              <span className="journey-subline-rule" aria-hidden="true" />
              <span>{card.meaning.charAt(0).toUpperCase() + card.meaning.slice(1)}</span>
            </div>
            <div className="journey-card-feature">
              <div className="journey-card-illustration" aria-hidden="true">
                <span>{card.spelling.charAt(0).toUpperCase()}</span>
              </div>
              <div className="journey-card-feature-copy">
                <p className="journey-chapter-label">Chapter {chapterNumber}</p>
                <h3>{card.title}</h3>
                <p>{card.story}</p>
              </div>
            </div>
            <details className="journey-accordion">
              <summary>
                <span>Journey notes</span>
                <span className="accordion-symbol" aria-hidden="true" />
              </summary>
              <div className="journey-accordion-body">
                <dl className="journey-notes">
                  {card.travel?.summary && (
                    <div>
                      <dt>How it traveled</dt>
                      <dd>{card.travel.summary}</dd>
                    </div>
                  )}
                  {card.cultural_change && (
                    <div>
                      <dt>What changed</dt>
                      <dd>{card.cultural_change}</dd>
                    </div>
                  )}
                </dl>
                <details className="journey-research">
                  <summary>Research context</summary>
                  {card.transliteration && card.transliteration !== card.spelling && (
                    <p>Transliteration: {card.transliteration}</p>
                  )}
                  <p>{card.claim_scope || journey.research_note}</p>
                  {card.location.note && <p>{card.location.note}</p>}
                  {card.date.note && <p>{card.date.note}</p>}
                  <p>
                    Research status: {card.review_status.replaceAll("_", " ")}.
                    Confidence: {card.confidence.replaceAll("_", " ")}.
                  </p>
                  {related.length > 0 && (
                    <ul>
                      {related.map((edge, edgeIndex) => (
                        <li key={`${edge.from}-${edge.to}-${edgeIndex}`}>
                          {edge.relationship.replaceAll("_", " ")}: {edge.note}
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              </div>
            </details>
            <details className="journey-accordion">
              <summary>
                <span>Sources</span>
                <span className="accordion-symbol" aria-hidden="true" />
              </summary>
              <div className="journey-accordion-body journey-sources">
                {card.learn_more?.length ? (
                  <ul>
                    {card.learn_more.map((source, sourceIndex) => (
                      <li key={source.source_id}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={source.title}
                        >
                          {source.publisher}
                        </a>
                        {sourceIndex < card.learn_more.length - 1 ? "; " : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{journey.research_note}</p>
                )}
              </div>
            </details>
          </div>
          <nav className="story-footer" aria-label="Journey chapters">
            <button
              className="journey-nav-arrow"
              type="button"
              disabled={index === 0}
              onClick={() => onSelect(journey.cards[index - 1].id)}
              aria-label={`Previous chapter: ${journey.cards[index - 1]?.spelling ?? "none"}`}
            >
              <img src="/icons/previous.svg" alt="" aria-hidden="true" />
            </button>
            <div className="journey-progress">
              <span>Stop {index + 1} of {journey.cards.length}</span>
              <div className="journey-progress-bars">
                {journey.cards.map((item, itemIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    className={itemIndex === index ? "is-current" : ""}
                    aria-label={`Go to stop ${itemIndex + 1}: ${item.spelling}`}
                    aria-current={itemIndex === index ? "step" : undefined}
                    onClick={() =>
                      itemIndex === index && mapAvailable
                        ? onRecenter()
                        : onSelect(item.id)
                    }
                  />
                ))}
              </div>
            </div>
            <button
              className="journey-nav-arrow"
              type="button"
              onClick={() =>
                index < journey.cards.length - 1
                  ? onSelect(journey.cards[index + 1].id)
                  : onNextWord()
              }
              aria-label={
                index < journey.cards.length - 1
                  ? `Next chapter: ${journey.cards[index + 1].spelling}`
                  : "Explore another word"
              }
            >
              <img src="/icons/next.svg" alt="" aria-hidden="true" />
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
