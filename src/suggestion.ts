export const SUGGESTION_ENDPOINT = "https://formspree.io/f/xppqrjpa";

export class SuggestionSubmissionError extends Error {
  fieldErrors: { word?: string; email?: string };

  constructor(status: number, fieldErrors: { word?: string; email?: string }) {
    super(`Suggestion failed: ${status}`);
    this.fieldErrors = fieldErrors;
  }
}

export async function sendSuggestion(formData: FormData, signal?: AbortSignal) {
  const response = await fetch(SUGGESTION_ENDPOINT, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
    signal,
  });
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const fieldErrors: { word?: string; email?: string } = {};
    if (data && typeof data === "object" && "errors" in data && Array.isArray(data.errors)) {
      for (const error of data.errors) {
        if (!error || typeof error !== "object") continue;
        if (error.field === "word" && typeof error.message === "string")
          fieldErrors.word = error.message;
        if (error.field === "email" && typeof error.message === "string")
          fieldErrors.email = error.message;
      }
    }
    throw new SuggestionSubmissionError(response.status, fieldErrors);
  }
}
