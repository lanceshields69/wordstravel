import { afterEach, describe, expect, it, vi } from "vitest";
import { journeys, type Card } from "./content";
import {
  browserPronunciation,
  matchingVoice,
  speechErrorMessage,
} from "./pronunciation";

const voice = (lang: string) => ({ lang, name: lang }) as SpeechSynthesisVoice;
const card = (id: string) =>
  journeys.flatMap((journey) => journey.cards).find((item) => item.id === id)!;

afterEach(() => {
  browserPronunciation.stop();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("pronunciation playback", () => {
  it("requires the requested region and never substitutes an unrelated voice", () => {
    expect(matchingVoice([voice("en-US")], "en-GB")).toBeNull();
    expect(matchingVoice([voice("fa-IR")], "ar")).toBeNull();
    expect(matchingVoice([voice("ar-SA")], "ar")?.lang).toBe("ar-SA");
    expect(matchingVoice([voice("fr-FR")], null)).toBeNull();
  });

  it("keeps specialist readings under review even if an audio URL appears", () => {
    const restricted = card("zero-sanskrit");
    const withAudio = {
      ...restricted,
      pronunciation: {
        ...restricted.pronunciation,
        generation: {
          ...restricted.pronunciation.generation,
          audio_url: "/audio/unreviewed.mp3",
        },
      },
    } as Card;
    const error = vi.fn();
    browserPronunciation.speak(withAudio, voice("hi-IN"), vi.fn(), error);
    expect(error).toHaveBeenCalledWith("Reading awaits review.");
  });

  it("plays an owner-approved historical recording without enabling historical browser speech", async () => {
    const greek = card("typhoon-greek");
    expect(greek.pronunciation.generation.language).toBeNull();
    expect(greek.pronunciation.generation.owner_approved_audio).toBe(true);
    class AudioMock {
      onplaying: (() => void) | null = null;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      pause = vi.fn();
      play = vi.fn(async () => {
        this.onplaying?.();
        this.onended?.();
      });
      constructor(public src: string) {}
    }
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    vi.stubGlobal("Audio", AudioMock);
    const end = vi.fn();
    const error = vi.fn();
    browserPronunciation.speak(greek, null, end, error);
    await Promise.resolve();
    expect(end).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
  });

  it("reports a listed voice that never starts instead of hanging silently", () => {
    vi.useFakeTimers();
    const selectedVoice = voice("ar-SA");
    const synth = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: () => [selectedVoice],
    };
    class Utterance {
      voice: SpeechSynthesisVoice | null = null;
      lang = "";
      rate = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      constructor(public text: string) {}
    }
    vi.stubGlobal("window", { speechSynthesis: synth, setTimeout, clearTimeout });
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    const error = vi.fn();
    browserPronunciation.speak(card("zero-arabic"), selectedVoice, vi.fn(), error);
    expect(synth.speak).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(8000);
    expect(error).toHaveBeenCalledWith(
      "The selected voice did not start on this device.",
    );
    expect(synth.cancel).toHaveBeenCalled();
  });

  it("reports a voice error and ignores callbacks after cancellation", () => {
    const selectedVoice = voice("ar-SA");
    let spoken: Utterance | undefined;
    class Utterance {
      voice: SpeechSynthesisVoice | null = null;
      lang = "";
      rate = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      constructor(public text: string) {}
    }
    const synth = {
      cancel: vi.fn(),
      speak: (utterance: Utterance) => { spoken = utterance; },
      getVoices: () => [selectedVoice],
    };
    vi.stubGlobal("window", { speechSynthesis: synth, setTimeout, clearTimeout });
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    const recorded = card("sugar-arabic");
    const browserCard: Card = {
      ...recorded,
      pronunciation: {
        ...recorded.pronunciation,
        generation: { ...recorded.pronunciation.generation, audio_url: null },
      },
    };
    const error = vi.fn();
    browserPronunciation.speak(browserCard, selectedVoice, vi.fn(), error);
    spoken!.onerror?.({ error: "voice-unavailable" });
    expect(error).toHaveBeenCalledWith(
      "The selected voice is unavailable on this device.",
    );
    browserPronunciation.speak(browserCard, selectedVoice, vi.fn(), error);
    const interrupted = spoken!;
    browserPronunciation.stop();
    interrupted.onerror?.({ error: "canceled" });
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("plays an eligible audio file and reports browser speech errors clearly", async () => {
    const selectedVoice = voice("ar-SA");
    const synth = { cancel: vi.fn(), getVoices: () => [selectedVoice] };
    class AudioMock {
      onplaying: (() => void) | null = null;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      pause = vi.fn();
      play = vi.fn(async () => {
        this.onplaying?.();
        this.onended?.();
      });
      constructor(public src: string) {}
    }
    vi.stubGlobal("window", { speechSynthesis: synth, setTimeout, clearTimeout });
    vi.stubGlobal("Audio", AudioMock);
    const modern = card("zero-arabic");
    const withAudio = {
      ...modern,
      pronunciation: {
        ...modern.pronunciation,
        generation: {
          ...modern.pronunciation.generation,
          audio_url: "/audio/zero-arabic.mp3",
        },
      },
    } as Card;
    const end = vi.fn();
    const error = vi.fn();
    browserPronunciation.speak(withAudio, null, end, error);
    await Promise.resolve();
    expect(end).toHaveBeenCalledOnce();
    expect(error).not.toHaveBeenCalled();
    expect(speechErrorMessage("voice-unavailable")).toContain("unavailable");
    expect(speechErrorMessage("not-allowed")).toContain("blocked");
  });
});
