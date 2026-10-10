import { useCallback, useEffect, useRef, useState } from "react";
import {
  cardFor,
  imageByWord,
  introImageUrl,
  introThumbnailUrl,
  journeyById,
  journeys,
  type IntroImage,
} from "./content";
import Globe from "./Globe";
import AppDialog from "./AppDialog";
import AboutStory from "./AboutStory";
import SuggestWordForm from "./SuggestWordForm";
import JourneyCard from "./JourneyCard";
import WordCarousel from "./WordCarousel";
import { browserPronunciation } from "./pronunciation";

type Phase = "browse" | "leaving" | "journey";
type Selection = { wordId: string | null; cardId: string | null };
type WordMotion = "idle" | "leaving" | "arriving";
const AUDIO_PREFERENCE_KEY = "words-travel-audio-enabled";
const CHAPTER_FADE_MS = 170;
const WORD_EXIT_MS = 260;
const WORD_ARRIVAL_MS = 620;

function savedAudioPreference(): boolean {
  try {
    return localStorage.getItem(AUDIO_PREFERENCE_KEY) !== "false";
  } catch {
    return true;
  }
}

function selectionFromUrl(): Selection {
  const params = new URLSearchParams(location.search);
  const wordId = params.get("word");
  const journey = wordId && journeyById.get(wordId);
  if (!journey) return { wordId: null, cardId: null };
  const cardId = cardFor(journey, params.get("stop")).id;
  return { wordId, cardId };
}

function urlFor(wordId: string | null, cardId: string | null) {
  const url = new URL(location.href);
  if (wordId && cardId) {
    url.searchParams.set("word", wordId);
    url.searchParams.set("stop", cardId);
  } else {
    url.searchParams.delete("word");
    url.searchParams.delete("stop");
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function ImageCredits({
  image,
  onClose,
}: {
  image: IntroImage;
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  const modal = useRef<HTMLElement>(null);
  useEffect(() => {
    close.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !modal.current) return;
      const focusable = [
        ...modal.current.querySelectorAll<HTMLElement>("button,a[href]"),
      ];
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable.at(-1)?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === focusable.at(-1)
      ) {
        event.preventDefault();
        focusable[0]?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);
  return (
    <div
      className="modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modal}
        className="credit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-title"
      >
        <button
          className="modal-close"
          ref={close}
          onClick={onClose}
          aria-label="Close image credit"
        >
          ×
        </button>
        <img src={introImageUrl(image)} alt={image.alt_text} />
        <div>
          <p className="modal-kicker">Journey illustration</p>
          <h2 id="credit-title">{image.image_title}</h2>
          <p>{image.caption}</p>
          <p>
            {image.credit_line} · {image.source_declared_rights}
          </p>
          <p className="credit-context">{image.crop_guidance}</p>
          <a href={image.source_url} target="_blank" rel="noopener noreferrer">
            View image source ↗
          </a>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [initial] = useState(selectionFromUrl);
  const [selection, setSelection] = useState<Selection>(initial);
  const [phase, setPhase] = useState<Phase>(
    initial.wordId ? "journey" : "browse",
  );
  const [credit, setCredit] = useState<IntroImage | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [mapStatus, setMapStatus] = useState<
    "ready" | "missing" | "error" | "loading"
  >("loading");
  const [recenterKey, setRecenterKey] = useState(0);
  const [chapterLeaving, setChapterLeaving] = useState(false);
  const [wordMotion, setWordMotion] = useState<WordMotion>("idle");
  const [audioEnabled, setAudioEnabled] = useState(savedAudioPreference);
  const transitionTimer = useRef<number | null>(null);
  const creditOrigin = useRef<HTMLElement | null>(null);
  const aboutButton = useRef<HTMLButtonElement>(null);
  const suggestOrigin = useRef<HTMLElement | null>(null);
  const reducedMotion = useRef(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const previousCard = useRef<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const journey = selection.wordId
    ? (journeyById.get(selection.wordId) ?? null)
    : null;
  const card = journey ? cardFor(journey, selection.cardId) : null;
  const nextJourney = journey
    ? journeys[(journeys.findIndex((item) => item.id === journey.id) + 1) % journeys.length]
    : null;

  useEffect(() => {
    browserPronunciation.setEnabled(audioEnabled);
    try {
      localStorage.setItem(AUDIO_PREFERENCE_KEY, String(audioEnabled));
    } catch {
      // Playback still works when storage is unavailable.
    }
  }, [audioEnabled]);

  const toggleAudio = () => {
    const next = !audioEnabled;
    browserPronunciation.setEnabled(next);
    setAudioEnabled(next);
  };

  const cancelTransition = () => {
    if (transitionTimer.current !== null) {
      window.clearTimeout(transitionTimer.current);
      transitionTimer.current = null;
    }
  };
  const openWord = (id: string) => {
    const next = journeyById.get(id);
    if (!next) return;
    cancelTransition();
    setChapterLeaving(false);
    setWordMotion("idle");
    previousCard.current = id;
    setSelectedWord(id);
    setSelection({ wordId: id, cardId: next.cards[0].id });
    history.pushState({}, "", urlFor(id, next.cards[0].id));
    setPhase("leaving");
    transitionTimer.current = window.setTimeout(
      () => {
        setPhase("journey");
        transitionTimer.current = null;
      },
      reducedMotion.current ? 130 : 850,
    );
  };
  const selectCard = useCallback(
    (id: string) => {
      const current = selection.wordId
        ? journeyById.get(selection.wordId)
        : undefined;
      if (!current?.cards.some((c) => c.id === id)) return;
      cancelTransition();
      setWordMotion("idle");
      if (id === selection.cardId) {
        setChapterLeaving(false);
        return;
      }
      const showChapter = () => {
        setSelection({ wordId: current.id, cardId: id });
        setChapterLeaving(false);
        setPhase("journey");
        history.replaceState({}, "", urlFor(current.id, id));
        transitionTimer.current = null;
      };
      if (reducedMotion.current) showChapter();
      else {
        setChapterLeaving(true);
        transitionTimer.current = window.setTimeout(showChapter, CHAPTER_FADE_MS);
      }
    },
    [selection.wordId, selection.cardId],
  );
  const browse = () => {
    cancelTransition();
    setChapterLeaving(false);
    setWordMotion("idle");
    setPhase("browse");
    setSelection({ wordId: null, cardId: null });
    history.pushState({}, "", urlFor(null, null));
    window.setTimeout(
      () =>
        document
          .querySelector<HTMLButtonElement>(
            `[data-word="${previousCard.current}"] .intro-card-main`,
          )
          ?.focus(),
      50,
    );
  };
  const nextWord = () => {
    if (!nextJourney) return;
    const next = nextJourney;
    const showWord = () => {
      previousCard.current = next.id;
      setSelectedWord(next.id);
      setSelection({ wordId: next.id, cardId: next.cards[0].id });
      history.pushState({}, "", urlFor(next.id, next.cards[0].id));
      if (reducedMotion.current) {
        setWordMotion("idle");
        transitionTimer.current = null;
      } else {
        setWordMotion("arriving");
        transitionTimer.current = window.setTimeout(() => {
          setWordMotion("idle");
          transitionTimer.current = null;
        }, WORD_ARRIVAL_MS);
      }
    };
    cancelTransition();
    setChapterLeaving(false);
    if (reducedMotion.current) showWord();
    else {
      setWordMotion("leaving");
      transitionTimer.current = window.setTimeout(showWord, WORD_EXIT_MS);
    }
  };

  useEffect(() => {
    const pop = () => {
      cancelTransition();
      setChapterLeaving(false);
      setWordMotion("idle");
      const next = selectionFromUrl();
      setSelection(next);
      setPhase(next.wordId ? "journey" : "browse");
      if (!next.wordId)
        window.setTimeout(
          () =>
            document
              .querySelector<HTMLButtonElement>(
                `[data-word="${previousCard.current}"] .intro-card-main`,
              )
              ?.focus(),
          50,
        );
    };
    window.addEventListener("popstate", pop);
    return () => {
      cancelTransition();
      window.removeEventListener("popstate", pop);
    };
  }, []);

  useEffect(() => {
    if (phase !== "journey") return;
    const timer = window.setTimeout(
      () => document.getElementById("story-heading")?.focus(),
      reducedMotion.current ? 60 : 250,
    );
    return () => window.clearTimeout(timer);
  }, [phase, card?.id]);

  useEffect(() => {
    const canonical = urlFor(initial.wordId, initial.cardId);
    if (`${location.pathname}${location.search}${location.hash}` !== canonical)
      history.replaceState({}, "", canonical);
  }, [initial]);

  const showCredit = (image: IntroImage) => {
    creditOrigin.current = document.activeElement as HTMLElement | null;
    setCredit(image);
  };
  const closeCredit = useCallback(() => {
    setCredit(null);
    window.setTimeout(() => creditOrigin.current?.focus(), 0);
  }, []);
  const closeAbout = useCallback(() => {
    setAboutOpen(false);
    window.setTimeout(() => aboutButton.current?.focus(), 0);
  }, []);
  const openSuggest = () => {
    suggestOrigin.current = document.activeElement as HTMLElement | null;
    setSuggestOpen(true);
  };
  const closeSuggest = () => {
    setSuggestOpen(false);
    window.setTimeout(() => suggestOrigin.current?.focus(), 0);
  };
  const mapAvailable = mapStatus === "ready";

  return (
    <>
    <main className={`app phase-${phase}`}>
      <Globe
        journey={journey}
        activeCard={card}
        mode={phase === "browse" ? "browse" : "journey"}
        onSelectCard={selectCard}
        recenterKey={recenterKey}
        onStatus={setMapStatus}
      />
      <header className="site-header">
        <button
          className="brand"
          type="button"
          onClick={browse}
          aria-label="Words Travel — explore words"
        >
          <img src="/images/logo.svg" alt="" aria-hidden="true" />
        </button>
        <div className="header-actions">
          {phase === "browse" ? (
            <>
              <button
                ref={aboutButton}
                className="explore-button"
                type="button"
                onClick={() => setAboutOpen(true)}
                aria-haspopup="dialog"
              >
                <img src="/icons/document.svg" alt="" aria-hidden="true" />
                About this app
              </button>
              <button
                className="explore-button"
                type="button"
                onClick={openSuggest}
                aria-haspopup="dialog"
              >
                <img src="/icons/plus.svg" alt="" aria-hidden="true" />
                Suggest a word
              </button>
            </>
          ) : (
            <button className="explore-button" type="button" onClick={browse}>
              <img src="/icons/grid.svg" alt="" aria-hidden="true" />
              Explore more words
            </button>
          )}
        </div>
      </header>
      {phase !== "browse" && (
        <button
          className={`audio-toggle${audioEnabled ? "" : " is-off"}`}
          type="button"
          onClick={toggleAudio}
          aria-pressed={audioEnabled}
          aria-label={`Audio ${audioEnabled ? "on. Turn audio off" : "off. Turn audio on"}`}
          title={audioEnabled ? "Turn pronunciation audio off" : "Turn pronunciation audio on"}
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 8h3l4-3v10l-4-3H3V8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            {audioEnabled ? (
              <path d="M13 7c1.5 1.5 1.5 4.5 0 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M3 3l14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
          <span>Audio {audioEnabled ? "on" : "off"}</span>
        </button>
      )}
      <div className="browse-content" aria-hidden={phase !== "browse"}>
        <div className="hero-copy">
          <p className="hero-kicker">A living atlas of language</p>
          <h1>
            Every word
            <br />
            has a journey.
          </h1>
          <p>Explore the extraordinary travels of everyday words.</p>
        </div>
      </div>
      <WordCarousel
        journeys={journeys}
        active={phase === "browse"}
        selectedWord={selectedWord}
        onOpen={openWord}
        onCredit={showCredit}
      />
      {phase === "journey" && journey && card && (
        <JourneyCard
          key={journey.id}
          journey={journey}
          card={card}
          chapterLeaving={chapterLeaving}
          wordMotion={wordMotion}
          audioEnabled={audioEnabled}
          nextWordName={nextJourney?.current_english_word ?? ""}
          onSelect={selectCard}
          onNextWord={nextWord}
          onSuggest={openSuggest}
          onRecenter={() => setRecenterKey((k) => k + 1)}
          mapAvailable={mapAvailable}
        />
      )}
      {phase === "journey" &&
        journey &&
        !mapAvailable &&
        imageByWord.get(journey.id) && (
          <aside className="fallback-illustration">
            <img
              src={introThumbnailUrl(imageByWord.get(journey.id)!)}
              alt={imageByWord.get(journey.id)!.alt_text}
            />
            <div>
              <span>Journey illustration</span>
              <p>{imageByWord.get(journey.id)!.caption}</p>
              <button
                type="button"
                onClick={() => showCredit(imageByWord.get(journey.id)!)}
              >
                Image details and credit ↗
              </button>
            </div>
          </aside>
        )}
      {phase !== "browse" && journey && (
        <div className="journey-caption" aria-hidden="true">
          <span>
            Word{" "}
            {String(
              journeys.findIndex((j) => j.id === journey.id) + 1,
            ).padStart(2, "0")}{" "}
            / 12
          </span>
          <strong>{journey.current_english_word}</strong>
        </div>
      )}
      {phase === "journey" && nextJourney && wordMotion === "idle" && (
        <button
          className="next-word-preview"
          type="button"
          onClick={nextWord}
          aria-label={`Next word: ${nextJourney.current_english_word}`}
        >
          <span>Next word:</span>
          <strong>{nextJourney.current_english_word}</strong>
          <span className="next-word-preview-arrow" aria-hidden="true">→</span>
        </button>
      )}
      {(mapStatus === "missing" || mapStatus === "error") && (
        <div className="map-status" role="status">
          <strong>Globe unavailable</strong>
          <span>
            {mapStatus === "missing"
              ? "Add a public Mapbox token in .env.local to see the globe. The stories remain fully browsable."
              : "The globe could not load. Continue with the chapter controls and sources."}
          </span>
        </div>
      )}
      {credit && <ImageCredits image={credit} onClose={closeCredit} />}
      {aboutOpen && (
        <AppDialog title="About Words Travel" byline="Created by Lance Shields" onClose={closeAbout}>
          <AboutStory />
        </AppDialog>
      )}
      {suggestOpen && (
        <AppDialog title="Suggest a word" onClose={closeSuggest} initialFocus='[name="word"]'>
          <SuggestWordForm onDone={closeSuggest} />
        </AppDialog>
      )}
      <div className="sr-only" aria-live="polite">
        {phase === "journey" && card && journey
          ? `${journey.current_english_word}, chapter ${journey.cards.findIndex((c) => c.id === card.id) + 1}, ${card.location.label}`
          : ""}
      </div>
    </main>
    {phase === "browse" && (
      <footer className="site-footer">
        <div className="site-footer-inner">
          <img
            className="footer-wordmark"
            src="/images/logo.svg"
            alt="Words Travel"
          />
          <a
            className="footer-byline"
            href="https://raftdesign.studio/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="/images/raft-design-icon.svg" alt="" aria-hidden="true" />
            <span>By <u>Raft Design</u></span>
          </a>
          <small>© 2026 Raft Design. All rights reserved.</small>
        </div>
      </footer>
    )}
    </>
  );
}
