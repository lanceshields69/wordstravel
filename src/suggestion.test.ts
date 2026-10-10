import { afterEach, describe, expect, it, vi } from "vitest";
import { sendSuggestion, SuggestionSubmissionError, SUGGESTION_ENDPOINT } from "./suggestion";

afterEach(() => vi.unstubAllGlobals());

describe("suggestion submission", () => {
  it("posts the supplied FormData as JSON-accepted Formspree input", async () => {
    const formData = new FormData();
    formData.set("word", "शब्द 🌏");
    formData.set("interest", "");
    formData.set("known_journey", "");
    formData.set("email", "");
    formData.set("_subject", "Words Travel: new word suggestion");
    formData.set("_gotcha", "");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendSuggestion(formData);

    expect(fetchMock).toHaveBeenCalledWith(SUGGESTION_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
      signal: undefined,
    });
    expect(formData.get("word")).toBe("शब्द 🌏");
  });

  it("retains field-level errors from a rejected response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ errors: [{ field: "email", message: "Email is invalid." }] }),
    }));
    await expect(sendSuggestion(new FormData())).rejects.toMatchObject({
      fieldErrors: { email: "Email is invalid." },
    } satisfies Partial<SuggestionSubmissionError>);
  });
});
