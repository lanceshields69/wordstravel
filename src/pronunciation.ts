import type { Card } from "./content";

export interface PronunciationService {
  voices(): SpeechSynthesisVoice[];
  voiceFor(language: string | null): SpeechSynthesisVoice | null;
  speak(
    card: Card,
    voice: SpeechSynthesisVoice,
    onEnd: () => void,
    onError: () => void,
  ): void;
  stop(): void;
}

export const browserPronunciation: PronunciationService = {
  voices: () =>
    typeof window !== "undefined" && "speechSynthesis" in window
      ? speechSynthesis.getVoices()
      : [],
  voiceFor(language) {
    if (!language) return null;
    const voices = this.voices();
    const requested = language.toLowerCase();
    return (
      voices.find((v) => v.lang.toLowerCase() === requested) ??
      voices.find(
        (v) => v.lang.toLowerCase().split("-")[0] === requested.split("-")[0],
      ) ??
      null
    );
  },
  speak(card, voice, onEnd, onError) {
    this.stop();
    const utterance = new SpeechSynthesisUtterance(
      card.pronunciation.generation.text,
    );
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.88;
    utterance.onend = onEnd;
    utterance.onerror = onError;
    speechSynthesis.speak(utterance);
  },
  stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      speechSynthesis.cancel();
  },
};
