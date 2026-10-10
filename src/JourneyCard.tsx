import { useEffect, useMemo, useRef, useState } from "react";
import type { Card, Journey } from "./content";
import { browserPronunciation, matchingVoice } from "./pronunciation";
import ChapterImage from "./ChapterImage";
import { imageByCardId } from "./chapterImages";

type Props = {
  journey: Journey;
  card: Card;
  onSelect: (id: string) => void;
  onNextWord: () => void;
  nextWordName: string;
  onRecenter: () => void;
  mapAvailable: boolean;
  chapterLeaving: boolean;
  wordMotion: "idle" | "leaving" | "arriving";
  audioEnabled: boolean;
};

type Presentation = {
  cardId: string;
  reading: "waiting" | "speaking" | "done";
  detailsVisible: boolean;
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

function PronunciationButton({
  card,
  audioEnabled,
  autoPlayReady,
  onPlaybackStart,
  onPlaybackDone,
}: {
  card: Card;
  audioEnabled: boolean;
  autoPlayReady: boolean;
  onPlaybackStart: (durationMs: number) => void;
  onPlaybackDone: () => void;
}) {
  const generation = card.pronunciation.generation;
  const language = generation.language;
  const hasAudio = Boolean(
    generation.audio_url && (language || generation.owner_approved_audio),
  );
  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [checking, setChecking] = useState(Boolean(language) && !hasAudio);
  const [message, setMessage] = useState<string | null>(null);
  const [playback, setPlayback] = useState<"idle" | "starting" | "playing">("idle");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const autoPlayed = useRef(false);

  useEffect(() => () => browserPronunciation.stop(), []);

  useEffect(() => {
    if (!autoPlayReady) browserPronunciation.stop();
  }, [autoPlayReady]);

  useEffect(() => {
    if (!language || hasAudio) return;
    if (!speechSupported) {
      const timer = setTimeout(() => setChecking(false), 0);
      return () => clearTimeout(timer);
    }
    const refresh = () => {
      const available = browserPronunciation.voices();
      setVoices(available);
      if (available.length) setChecking(false);
      if (matchingVoice(available, language))
        setMessage((current) =>
          current?.startsWith("No ") || current?.startsWith("Still checking")
            ? null
            : current,
        );
    };
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    refresh();
    // Some browsers populate getVoices() late without firing voiceschanged.
    const poll = window.setInterval(refresh, 250);
    const timer = window.setTimeout(() => {
      setChecking(false);
      window.clearInterval(poll);
    }, 3000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
    };
  }, [language, hasAudio, speechSupported]);

  const voice = useMemo(
    () => matchingVoice(voices, language),
    [language, voices],
  );
  const reason = !audioEnabled
    ? "Audio is off. Use the Audio off control above the globe to turn it on."
    : !language && !hasAudio
    ? "Reading awaits review."
    : hasAudio
      ? null
      : !speechSupported
        ? "This browser does not support speech playback."
        : !checking && !voice
          ? `No ${language} voice is available on this device.`
          : null;

  useEffect(() => {
    if (
      !audioEnabled ||
      !autoPlayReady ||
      autoPlayed.current ||
      (!hasAudio && (!language || checking))
    ) return;
    const timer = window.setTimeout(() => {
      if (autoPlayed.current) return;
      autoPlayed.current = true;
      buttonRef.current?.click();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [audioEnabled, autoPlayReady, checking, hasAudio, language]);

  return (
    <div className="pronunciation-wrap">
      <button
        ref={buttonRef}
        type="button"
        className={`pronunciation-button${playback === "playing" ? " is-playing" : ""}${playback === "starting" ? " is-starting" : ""}`}
        disabled={!audioEnabled}
        onClick={() => {
          autoPlayed.current = true;
          if (!audioEnabled) return;
          if (playback !== "idle") {
            browserPronunciation.stop();
            setPlayback("idle");
            onPlaybackDone();
            return;
          }
          if (!language && !hasAudio) {
            setMessage("Reading awaits review.");
            onPlaybackDone();
            return;
          }
          if (!hasAudio && !speechSupported) {
            setMessage("This browser does not support speech playback.");
            onPlaybackDone();
            return;
          }
          // Recheck at click time: a voice may appear or disappear after loading.
          const currentVoice = hasAudio
            ? null
            : browserPronunciation.voiceFor(language);
          if (!hasAudio && !currentVoice) {
            setVoices(browserPronunciation.voices());
            setMessage(
              checking
                ? "Still checking for a matching voice on this device."
                : `No ${language} voice is available on this device.`,
            );
            onPlaybackDone();
            return;
          }
          setChecking(false);
          if (!hasAudio) setVoices(browserPronunciation.voices());
          setMessage(null);
          setPlayback("starting");
          browserPronunciation.speak(
            card,
            currentVoice,
            () => {
              setPlayback("idle");
              onPlaybackDone();
            },
            (error) => {
              setPlayback("idle");
              setMessage(error);
              onPlaybackDone();
            },
            (durationMs) => {
              setPlayback("playing");
              onPlaybackStart(durationMs);
            },
          );
        }}
        aria-label={
          playback === "playing"
            ? `Stop pronunciation of ${generation.text}`
            : playback === "starting"
              ? `Stop loading pronunciation of ${generation.text}`
              : reason
            ? `Pronunciation unavailable for ${card.spelling}. ${reason}`
            : checking && !hasAudio
              ? "Checking pronunciation availability"
              : hasAudio
                ? `Play recorded pronunciation of ${generation.text}. ${generation.label}`
                : `Play modern illustrative pronunciation of ${generation.text}${voice ? ` using ${voice.lang}` : ""}`
        }
        aria-pressed={playback !== "idle"}
        aria-expanded={reason ? Boolean(message) : undefined}
        title={playback !== "idle" ? "Stop pronunciation" : reason ?? (hasAudio ? generation.label : voice ? `Hear a modern reading (${voice.lang} voice)` : "Hear a reading")}
      >
        {playback === "playing" ? (
          <span className="pronunciation-stop-icon" aria-hidden="true" />
        ) : (
          <img src="/icons/pronunciation.svg" alt="" aria-hidden="true" />
        )}
      </button>
      {message && (
        <span className="pronunciation-note" role="status">
          {message}
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
  nextWordName,
  onRecenter,
  mapAvailable,
  chapterLeaving,
  wordMotion,
  audioEnabled,
}: Props) {
  const index = journey.cards.findIndex((item) => item.id === card.id);
  const [expanded, setExpanded] = useState(true);
  const [presentation, setPresentation] = useState<Presentation>({
    cardId: card.id,
    reading: "waiting",
    detailsVisible: false,
  });
  const [typingMs, setTypingMs] = useState(1000);
  const currentPresentation: Presentation =
    presentation.cardId === card.id
      ? presentation
      : { cardId: card.id, reading: "waiting", detailsVisible: false };
  const generation = card.pronunciation.generation;
  const hasPotentialReading = Boolean(
    generation.language ||
      (generation.audio_url && generation.owner_approved_audio),
  );
  const related = journey.edges.filter(
    (edge) => edge.from === card.id || edge.to === card.id,
  );
  const chapterNumber = String(index + 1).padStart(2, "0");
  const isLastChapter = index === journey.cards.length - 1;
  const chapterImage = imageByCardId.get(card.id);
  if (!chapterImage) throw new Error(`Missing chapter image for ${card.id}`);

  useEffect(() => {
    if (currentPresentation.detailsVisible) return;
    // Reveal the chapter even if a browser never starts or finishes playback.
    const delay =
      currentPresentation.reading === "speaking"
        ? 2600
        : audioEnabled && hasPotentialReading
          ? 1400
          : 450;
    const timer = window.setTimeout(() => {
      setPresentation((previous) => {
        const current = previous.cardId === card.id
          ? previous
          : { cardId: card.id, reading: "waiting" as const, detailsVisible: false };
        return {
          ...current,
          reading: current.reading === "waiting" ? "done" : current.reading,
          detailsVisible: true,
        };
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    card.id,
    currentPresentation.detailsVisible,
    currentPresentation.reading,
    audioEnabled,
    hasPotentialReading,
  ]);

  return (
    <section
      className={`story-panel${expanded ? "" : " is-collapsed"}${chapterLeaving ? " is-chapter-leaving" : ""}${wordMotion === "idle" ? "" : ` is-word-${wordMotion}`}`}
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
          <div
            className={`story-scroll is-audio-${currentPresentation.reading}${currentPresentation.detailsVisible ? " is-details-visible" : ""}`}
            key={card.id}
          >
            <div className="journey-card-meta">
              <span>{card.location.label}</span>
              <span>
                {card.date.label === "Date not established in reviewed sources"
                  ? "Date uncertain"
                  : card.date.label}
              </span>
            </div>
            <div className="journey-card-word-row">
              <div className="journey-card-word-stack">
                <ScriptWord card={card} />
                <p
                  className="journey-card-pronunciation"
                  dir="ltr"
                  style={{
                    animationDuration: `${typingMs}ms`,
                    animationTimingFunction: `steps(${Math.max(1, Array.from(card.pronunciation.display ?? "").length)}, end)`,
                  }}
                >
                  {card.pronunciation.display}
                </p>
              </div>
              <PronunciationButton
                key={`${card.id}-${audioEnabled}`}
                card={card}
                audioEnabled={audioEnabled}
                autoPlayReady={wordMotion === "idle" && !chapterLeaving}
                onPlaybackStart={(durationMs) => {
                  setTypingMs(durationMs);
                  setPresentation((previous) => ({
                    cardId: card.id,
                    reading: "speaking",
                    detailsVisible: previous.cardId === card.id && previous.detailsVisible,
                  }));
                }}
                onPlaybackDone={() => setPresentation({
                  cardId: card.id,
                  reading: "done",
                  detailsVisible: true,
                })}
              />
            </div>
            <div className="journey-card-details">
            <div className="journey-card-subline">
              <span className="journey-language">{card.language}</span>
              <span className="journey-subline-rule" aria-hidden="true" />
              <span>{card.meaning.charAt(0).toUpperCase() + card.meaning.slice(1)}</span>
            </div>
            <div className="journey-card-feature">
              <ChapterImage key={card.id} image={chapterImage} />
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
              className={`journey-nav-arrow${isLastChapter ? " journey-nav-next-word" : ""}`}
              type="button"
              onClick={() =>
                index < journey.cards.length - 1
                  ? onSelect(journey.cards[index + 1].id)
                  : onNextWord()
              }
              aria-label={
                index < journey.cards.length - 1
                  ? `Next chapter: ${journey.cards[index + 1].spelling}`
                  : `Next word: ${nextWordName}`
              }
            >
              {isLastChapter && <span>Next word</span>}
              <img src="/icons/next.svg" alt="" aria-hidden="true" />
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
