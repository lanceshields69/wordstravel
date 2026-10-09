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
import JourneyCard from "./JourneyCard";
import WordCarousel from "./WordCarousel";

type Phase = "browse" | "leaving" | "journey";
type Selection = { wordId: string | null; cardId: string | null };

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
  const [mapStatus, setMapStatus] = useState<
    "ready" | "missing" | "error" | "loading"
  >("loading");
  const [recenterKey, setRecenterKey] = useState(0);
  const transitionTimer = useRef<number | null>(null);
  const creditOrigin = useRef<HTMLElement | null>(null);
  const reducedMotion = useRef(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const previousCard = useRef<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const journey = selection.wordId
    ? (journeyById.get(selection.wordId) ?? null)
    : null;
  const card = journey ? cardFor(journey, selection.cardId) : null;

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
      setSelection({ wordId: current.id, cardId: id });
      setPhase("journey");
      history.replaceState({}, "", urlFor(current.id, id));
    },
    [selection.wordId],
  );
  const browse = () => {
    cancelTransition();
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
    const index = journeys.findIndex((j) => j.id === journey?.id);
    openWord(journeys[(index + 1) % journeys.length].id);
  };

  useEffect(() => {
    const pop = () => {
      cancelTransition();
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
      60,
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
  const mapAvailable = mapStatus === "ready";

  return (
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
          aria-label="Word Caravan — explore words"
        >
          Word Caravan
          <span className="brand-star" aria-hidden="true">
            ✦
          </span>
        </button>
        {phase !== "browse" && (
          <button className="explore-button" type="button" onClick={browse}>
            Explore words <span aria-hidden="true">↗</span>
          </button>
        )}
      </header>
      <div className="browse-content" aria-hidden={phase !== "browse"}>
        <div className="hero-copy">
          <p className="hero-kicker">A living atlas of language</p>
          <h1>
            Every word
            <br />
            has a journey.
          </h1>
          <p>Choose a word. Follow its journey.</p>
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
          key={card.id}
          journey={journey}
          card={card}
          onSelect={selectCard}
          onBack={browse}
          onNextWord={nextWord}
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
      <div className="sr-only" aria-live="polite">
        {phase === "journey" && card && journey
          ? `${journey.current_english_word}, chapter ${journey.cards.findIndex((c) => c.id === card.id) + 1}, ${card.location.label}`
          : ""}
      </div>
    </main>
  );
}
