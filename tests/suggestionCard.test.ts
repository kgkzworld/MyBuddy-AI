import { describe, expect, it } from "vitest";
import { buildSuggestionCard } from "../src/cards/suggestionCard";
import type { Suggestion } from "../src/core/contracts";

const suggestion: Suggestion = {
  title: "Want a hand?",
  message: "You have switched between the editor and documentation several times. I can help isolate the next step.",
  confidence: 0.82,
  source: "qwen",
  observedProcess: "Code",
  observedWindow: "Ambient Desktop Agent — Visual Studio Code",
};

describe("suggestion Adaptive Card", () => {
  it("offers bounded interactive choices", () => {
    const card = buildSuggestionCard(suggestion);
    const actions = card.actions.map((action) => ({ type: action.type, id: action.data?.action }));

    expect(card.type).toBe("AdaptiveCard");
    expect(card.version).toBe("1.5");
    expect(actions).toEqual([
      { type: "Action.Submit", id: "hint" },
      { type: "Action.Submit", id: "preview_takeover" },
      { type: "Action.Submit", id: "snooze" },
      { type: "Action.Submit", id: "dismiss" },
    ]);
  });

  it("marks takeover as preview-only in this prototype", () => {
    const card = buildSuggestionCard(suggestion);

    expect(JSON.stringify(card)).toContain("Preview only");
    expect(JSON.stringify(card)).not.toContain("execute");
  });
});
