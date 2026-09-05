import type { Suggestion } from "../core/contracts";

interface CardAction {
  type: "Action.Submit";
  title: string;
  style?: "positive" | "destructive";
  data: { action: string };
}

export interface SuggestionCardPayload {
  $schema: string;
  type: "AdaptiveCard";
  version: "1.5";
  fallbackText: string;
  body: Record<string, unknown>[];
  actions: CardAction[];
}

export function buildSuggestionCard(suggestion: Suggestion): SuggestionCardPayload {
  const confidence = Math.round(suggestion.confidence * 100);

  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    fallbackText: `${suggestion.title}: ${suggestion.message}`,
    body: [
      {
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "stretch",
            items: [
              { type: "TextBlock", text: suggestion.title, size: "Large", weight: "Bolder", wrap: true },
              { type: "TextBlock", text: suggestion.message, wrap: true, spacing: "Small" },
            ],
          },
          {
            type: "Column",
            width: "auto",
            items: [
              { type: "TextBlock", text: `${confidence}%`, color: "Accent", weight: "Bolder", horizontalAlignment: "Right" },
              { type: "TextBlock", text: suggestion.source === "qwen" ? "LOCAL QWEN" : "LOCAL RULES", isSubtle: true, size: "Small" },
            ],
          },
        ],
      },
      {
        type: "FactSet",
        facts: [
          { title: "App", value: suggestion.observedProcess || "Unknown" },
          { title: "Window", value: suggestion.observedWindow || "Unknown" },
        ],
        spacing: "Medium",
      },
      {
        type: "Container",
        style: "emphasis",
        spacing: "Medium",
        items: [
          {
            type: "TextBlock",
            text: "Preview only — this prototype can observe and suggest, but it cannot control your computer.",
            wrap: true,
            size: "Small",
          },
        ],
      },
    ],
    actions: [
      { type: "Action.Submit", title: "Give me a hint", style: "positive", data: { action: "hint" } },
      { type: "Action.Submit", title: "Preview takeover", data: { action: "preview_takeover" } },
      { type: "Action.Submit", title: "Snooze 15 min", data: { action: "snooze" } },
      { type: "Action.Submit", title: "Dismiss", data: { action: "dismiss" } },
    ],
  };
}
