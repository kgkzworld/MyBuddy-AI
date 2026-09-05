import { describe, expect, it } from "vitest";
import { buildEpisodePrompt, parseSuggestionResponse } from "../src/core/qwen";
import type { InterventionCandidate } from "../src/core/contracts";

const candidate: InterventionCandidate = {
  kind: "repeated-switch",
  confidence: 0.76,
  summary: "Repeated switching detected between Editor and Documentation.",
  observations: [
    { processName: "Code", title: "Editor", observedAt: "2026-08-28T01:00:00Z", kind: "window-changed" },
    { processName: "msedge", title: "Documentation", observedAt: "2026-08-28T01:00:05Z", kind: "window-changed" },
  ],
};

describe("Qwen suggestion contract", () => {
  it("builds a minimal episode prompt", () => {
    const prompt = buildEpisodePrompt(candidate);

    expect(prompt).toContain("Repeated switching");
    expect(prompt).toContain("Code: Editor");
    expect(prompt).not.toContain("screenshot");
  });

  it("parses a fenced JSON suggestion", () => {
    const parsed = parseSuggestionResponse(`\n\`\`\`json\n{
      "title": "Try one focused check",
      "message": "Compare the error text with the documented requirement.",
      "confidence": 0.84
    }\n\`\`\``);

    expect(parsed).toEqual({
      title: "Try one focused check",
      message: "Compare the error text with the documented requirement.",
      confidence: 0.84,
    });
  });

  it("rejects malformed or overconfident output", () => {
    expect(() => parseSuggestionResponse("not json")).toThrow();
    expect(() => parseSuggestionResponse('{"title":"x","message":"y","confidence":4}')).toThrow();
  });
});
