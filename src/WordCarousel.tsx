import { useCallback, useEffect, useRef, useState } from "react";
import {
  imageByWord,
  introThumbnailUrl,
  type IntroImage,
  type Journey,
} from "./content";

type Props = {
  journeys: Journey[];
  active: boolean;
  selectedWord: string | null;
  onOpen: (id: string) => void;
  onCredit: (image: IntroImage) => void;
};

export default function WordCarousel({
  journeys,
  active,
  selectedWord,
  onOpen,
  onCredit,
}: Props) {
  const [displayJourneys] = useState(() => {
    const shuffled = [...journeys];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });
  const shelf = useRef<HTMLDivElement>(null);
  const pausedByGesture = useRef(false);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);
  const [entranceComplete, setEntranceComplete] = useState(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [mobile, setMobile] = useState(
    window.matchMedia("(max-width: 700px)").matches,
  );
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const auto =
    active && entranceComplete && !paused && !reducedMotion && !mobile;

  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const change = () => setMobile(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);

  const itemWidth = useCallback(() => {
    const first = shelf.current?.querySelector<HTMLElement>(
      ".shelf-track > [data-word]",
    );
    const second = first?.nextElementSibling as HTMLElement | null;
    return first && second ? second.offsetLeft - first.offsetLeft : 340;
  }, []);

  const updateIndex = useCallback(() => {
    const el = shelf.current;
    if (!el) return;
    const width = itemWidth();
    setIndex(
      Math.min(
        displayJourneys.length - 1,
        Math.round(el.scrollLeft / width) % displayJourneys.length,
      ),
    );
  }, [itemWidth, displayJourneys.length]);

  useEffect(() => {
    const el = shelf.current;
    if (!el) return;
    updateIndex();
    const observer = new ResizeObserver(updateIndex);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateIndex]);

  useEffect(() => {
    if (!auto) return;
    const el = shelf.current;
    if (!el) return;
    let frame = 0,
      last = performance.now(),
      position = el.scrollLeft;
    const tick = (now: number) => {
      const delta = Math.min(now - last, 50);
      last = now;
      if (!pausedByGesture.current && !document.hidden) {
        position += delta * 0.018;
        const loop = itemWidth() * displayJourneys.length;
        if (position >= loop) position -= loop;
        el.scrollLeft = position;
      } else {
        position = el.scrollLeft;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [auto, displayJourneys.length, itemWidth]);

  const go = (step: number) => {
    const el = shelf.current;
    if (!el) return;
    setPaused(true);
    const next = (index + step + displayJourneys.length) % displayJourneys.length;
    el.scrollTo({
      left: next * itemWidth(),
      behavior: reducedMotion ? "instant" : "smooth",
    });
    setIndex(next);
  };

  const renderCard = (journey: Journey, clone: boolean) => {
    const image = imageByWord.get(journey.id);
    if (!image) return null;
    return (
      <div
        className="intro-card-wrap"
        key={`${journey.id}-${clone ? "copy" : "real"}`}
      >
        <div className="intro-card">
          <button
            className="intro-card-main"
            type="button"
            tabIndex={clone ? -1 : 0}
            onClick={() => onOpen(journey.id)}
            aria-label={`Explore ${journey.current_english_word}. ${journey.hook}`}
          >
            <span className="intro-image">
              <img
                src={introThumbnailUrl(image)}
                alt={image.alt_text}
                loading={displayJourneys.indexOf(journey) < 5 ? "eager" : "lazy"}
                style={{
                  objectPosition: image.display_object_position || "center",
                }}
              />
            </span>
            <span className="intro-copy">
              <span className="intro-word">{journey.current_english_word}</span>
              <span className="intro-hook">{journey.hook}</span>
              <span className="intro-invite">
                Begin journey <span aria-hidden="true">→</span>
              </span>
            </span>
          </button>
          <button
            className="image-credit-trigger home-image-credit-trigger"
            type="button"
            tabIndex={clone ? -1 : 0}
            onClick={() => onCredit(image)}
            aria-label={`Image credit for ${journey.current_english_word}`}
            aria-haspopup="dialog"
          >
            Image credit
          </button>
        </div>
      </div>
    );
  };

  return (
    <section
      className={`shelf-section${active ? "" : " is-hidden"}`}
      aria-label="Choose a word"
      aria-hidden={!active}
    >
      <div
        className="shelf-viewport"
        ref={shelf}
        onScroll={updateIndex}
        onMouseEnter={() => {
          pausedByGesture.current = true;
        }}
        onMouseLeave={() => {
          pausedByGesture.current = false;
        }}
        onFocusCapture={() => {
          pausedByGesture.current = true;
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            pausedByGesture.current = false;
        }}
        onPointerDown={() => {
          pausedByGesture.current = true;
        }}
        onPointerUp={() => {
          pausedByGesture.current = false;
        }}
      >
        <div
          className={`shelf-track${entranceComplete ? "" : " is-entering"}`}
          onAnimationEnd={(event) => {
            if (event.animationName !== "shelf-arrive") return;
            setEntranceComplete(true);
            updateIndex();
          }}
        >
          {displayJourneys.map((j) => (
            <div
              key={j.id}
              data-word={j.id}
              className={selectedWord === j.id ? "selected-card" : ""}
            >
              {renderCard(j, false)}
            </div>
          ))}
          <div className="shelf-clones" aria-hidden="true">
            {displayJourneys.map((j) => renderCard(j, true))}
          </div>
        </div>
      </div>
      <div className="shelf-controls">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous words"
        >
          ←
        </button>
        <span aria-live="polite">
          {String(index + 1).padStart(2, "0")} /{" "}
          {String(displayJourneys.length).padStart(2, "0")}
        </span>
        <button
          type="button"
          className="pause-control"
          onClick={() => setPaused((v) => !v)}
          aria-label={paused ? "Play carousel" : "Pause carousel"}
        >
          {paused ? "▶" : "Ⅱ"}
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Next words">
          →
        </button>
      </div>
    </section>
  );
}
