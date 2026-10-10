import { useEffect, useRef, useState, type FormEvent } from "react";
import { sendSuggestion, SuggestionSubmissionError } from "./suggestion";

type Props = { onDone: () => void };
type FieldErrors = { word?: string; email?: string };

export default function SuggestWordForm({ onDone }: Props) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const submitting = useRef(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const word = form.elements.namedItem("word") as HTMLInputElement;
    const email = form.elements.namedItem("email") as HTMLInputElement;
    const nextErrors: FieldErrors = {};
    if (!word.value.trim()) nextErrors.word = "Please enter a word.";
    if (email.value && email.validity.typeMismatch)
      nextErrors.email = "Please enter a valid email address.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      (nextErrors.word ? word : email).focus();
      return;
    }

    const formData = new FormData(form);
    submitting.current = true;
    controller.current = new AbortController();
    setStatus("sending");
    try {
      await sendSuggestion(formData, controller.current.signal);
      setStatus("success");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        if (error instanceof SuggestionSubmissionError)
          setErrors(error.fieldErrors);
        setStatus("error");
      }
    } finally {
      submitting.current = false;
      controller.current = null;
    }
  };

  if (status === "success") {
    return (
      <div className="suggest-success" role="status" aria-live="polite">
        <p>Thanks for the suggestion. I’ll look into its journey.</p>
        <button type="button" className="suggest-submit" onClick={onDone} autoFocus>
          Done
        </button>
      </div>
    );
  }

  return (
    <form className="suggest-form" onSubmit={submit} noValidate>
      <p className="suggest-intro">
        Have a word whose journey you’d like to explore? Send it my way. Words from any language are welcome.
      </p>
      <div className="suggest-field">
        <label htmlFor="suggest-word">Which word would you like to explore?</label>
        <input
          id="suggest-word"
          name="word"
          type="text"
          required
          autoComplete="off"
          aria-invalid={Boolean(errors.word)}
          aria-describedby={errors.word ? "suggest-word-error" : undefined}
          onInput={() => setErrors((current) => ({ ...current, word: undefined }))}
        />
        {errors.word && <span id="suggest-word-error" className="suggest-error">{errors.word}</span>}
      </div>
      <div className="suggest-field">
        <label htmlFor="suggest-interest">What interests you about it?</label>
        <textarea
          id="suggest-interest"
          name="interest"
          rows={2}
          placeholder="A connection between languages, an unexpected meaning, or just curiosity."
        />
      </div>
      <div className="suggest-field">
        <label htmlFor="suggest-known-journey">What do you know about this word’s journey?</label>
        <textarea
          id="suggest-known-journey"
          name="known_journey"
          rows={2}
          placeholder="Share any origins, places, or changes in meaning you’ve heard about. Links are welcome."
        />
      </div>
      <div className="suggest-field">
        <label htmlFor="suggest-email">Email</label>
        <input
          id="suggest-email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "suggest-email-help suggest-email-error" : "suggest-email-help"}
          onInput={() => setErrors((current) => ({ ...current, email: undefined }))}
        />
        <span id="suggest-email-help" className="suggest-help">Leave your email if you’d like an update when we add it.</span>
        {errors.email && <span id="suggest-email-error" className="suggest-error">{errors.email}</span>}
      </div>
      <input className="suggest-honeypot" type="text" name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <input type="hidden" name="_subject" value="Words Travel: new word suggestion" />
      {status === "error" && (
        <p className="suggest-submit-error" role="alert">
          Your suggestion couldn’t be sent. Please try again.
        </p>
      )}
      <div className="suggest-actions">
        <button className="suggest-submit" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send suggestion"}
        </button>
        <span className="sr-only" role="status" aria-live="polite">
          {status === "sending" ? "Sending suggestion" : ""}
        </span>
      </div>
    </form>
  );
}
