import type { InterventionCandidate } from "./contracts";

export interface ParsedSuggestion {
  title: string;
  message: string;
  confidence: number;
}

export function buildEpisodePrompt(candidate: InterventionCandidate): string {
  const timeline = candidate.observations
    .map((item) => `- ${item.observedAt} — ${item.processName}: ${item.title}`)
    .join("\n");

  return [
    "You are a quiet local desktop assistant.",
    "Decide whether a short hint would help. Do not claim to see anything outside this event list.",
    "Return JSON only with title, message, and confidence from 0 to 1.",
    `Pattern: ${candidate.summary}`,
    "Recent window events:",
    timeline,
  ].join("\n");
}

export function parseSuggestionResponse(raw: string): ParsedSuggestion {
  const unfenced = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const parsed = JSON.parse(unfenced) as Partial<ParsedSuggestion>;

  if (
    typeof parsed.title !== "string" ||
    parsed.title.trim().length === 0 ||
    typeof parsed.message !== "string" ||
    parsed.message.trim().length === 0 ||
    typeof parsed.confidence !== "number" ||
    parsed.confidence < 0 ||
    parsed.confidence > 1
  ) {
    throw new Error("Qwen response does not match the suggestion contract.");
  }

  return {
    title: parsed.title.trim(),
    message: parsed.message.trim(),
    confidence: parsed.confidence,
  };
}
