import type { Card } from "./content";

const START_TIMEOUT_MS = 8000;

export function matchingVoice(
  voices: SpeechSynthesisVoice[],
  language: string | null,
): SpeechSynthesisVoice | null {
  if (!language) return null;
  const requested = language.replaceAll("_", "-").toLowerCase();
  const exact = voices.find(
    (voice) => voice.lang.replaceAll("_", "-").toLowerCase() === requested,
  );
  if (exact) return exact;
  // A region-specific request must not silently use a different accent.
  if (requested.includes("-")) return null;
  return (
    voices.find(
      (voice) =>
        voice.lang.replaceAll("_", "-").toLowerCase().split("-")[0] ===
        requested,
    ) ?? null
  );
}

export function speechErrorMessage(code?: string): string {
  if (code === "voice-unavailable")
    return "The selected voice is unavailable on this device.";
  if (code === "not-allowed")
    return "The browser blocked speech. Try again after interacting with the page.";
  if (code === "canceled" || code === "interrupted")
    return "Speech was interrupted. Try playing it again.";
  return "This device could not play the selected voice.";
}

export interface PronunciationService {
  voices(): SpeechSynthesisVoice[];
  voiceFor(language: string | null): SpeechSynthesisVoice | null;
  speak(
    card: Card,
    voice: SpeechSynthesisVoice | null,
    onEnd: () => void,
    onError: (message: string) => void,
  ): void;
  stop(): void;
}

let playbackId = 0;
let cancelPlayback: (() => void) | null = null;

export const browserPronunciation: PronunciationService = {
  voices: () =>
    typeof window !== "undefined" && "speechSynthesis" in window
      ? window.speechSynthesis.getVoices()
      : [],
  voiceFor(language) {
    return matchingVoice(this.voices(), language);
  },
  speak(card, voice, onEnd, onError) {
    this.stop();
    const id = playbackId;
    const generation = card.pronunciation.generation;
    if (!generation.language) {
      onError("Reading awaits review.");
      return;
    }

    if (generation.audio_url) {
      let audio: HTMLAudioElement;
      try {
        audio = new Audio(generation.audio_url);
      } catch {
        onError("This audio file could not be opened.");
        return;
      }
      let started = false;
      let finished = false;
      const timer = window.setTimeout(
        () => finish("Audio did not start on this device."),
        START_TIMEOUT_MS,
      );
      const finish = (message?: string) => {
        if (id !== playbackId || finished) return;
        finished = true;
        window.clearTimeout(timer);
        audio.onplaying = null;
        audio.onended = null;
        audio.onerror = null;
        cancelPlayback = null;
        if (message) {
          audio.pause();
          onError(message);
        } else onEnd();
      };
      audio.onplaying = () => {
        started = true;
        window.clearTimeout(timer);
      };
      audio.onended = () =>
        finish(started ? undefined : "Audio did not start on this device.");
      audio.onerror = () => finish("This audio file could not be played.");
      cancelPlayback = () => {
        window.clearTimeout(timer);
        audio.onplaying = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
      };
      void audio.play().catch(() => finish("This audio file could not be played."));
      return;
    }

    if (!voice || !matchingVoice([voice], generation.language)) {
      onError(`No ${generation.language} voice is available on this device.`);
      return;
    }
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      onError("This browser does not support speech playback.");
      return;
    }

    const synth = window.speechSynthesis;
    let utterance: SpeechSynthesisUtterance;
    try {
      utterance = new SpeechSynthesisUtterance(generation.text);
    } catch {
      onError("This device could not create speech playback.");
      return;
    }
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.88;
    let started = false;
    let finished = false;
    const timer = window.setTimeout(
      () => finish("The selected voice did not start on this device."),
      START_TIMEOUT_MS,
    );
    const finish = (message?: string) => {
      if (id !== playbackId || finished) return;
      finished = true;
      window.clearTimeout(timer);
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      cancelPlayback = null;
      if (message) {
        synth.cancel();
        onError(message);
      } else onEnd();
    };
    utterance.onstart = () => {
      started = true;
      window.clearTimeout(timer);
    };
    utterance.onend = () =>
      finish(started ? undefined : "The selected voice did not start on this device.");
    utterance.onerror = (event) => finish(speechErrorMessage(event.error));
    cancelPlayback = () => {
      window.clearTimeout(timer);
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
    };
    try {
      synth.speak(utterance);
    } catch {
      finish("This device could not start speech playback.");
    }
  },
  stop() {
    playbackId += 1;
    cancelPlayback?.();
    cancelPlayback = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
  },
};
