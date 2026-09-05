import { describe, expect, it } from "vitest";
import { takeoverRequestCard } from "../src/cards/conversationCard";
import frontend from "../src/main.ts?raw";

function serializedUnknownRequest(): string {
  return JSON.stringify(takeoverRequestCard("Open Paint and resize this image", null));
}

describe("app-general Computer Use request flow", () => {
  it("offers one-time Computer Use instead of requesting a hard-coded adapter", () => {
    const card = serializedUnknownRequest();
    expect(card).toContain("Yes — use Computer Use");
    expect(card).toContain("request_computer_use");
    expect(card).toContain("Open Paint and resize this image");
    expect(card).not.toContain("Request this capability");
    expect(card).not.toContain("request_capability");
    expect(card).not.toContain("approve_notepad_open_dialog");
    expect(card).not.toContain("approve_word_open_dialog");
  });

  it("does not execute until the explicit Computer Use card action is handled", () => {
    expect(frontend).toContain('case "request_computer_use"');
    expect(frontend).toContain('invoke<TakeoverExecutionResult>("execute_computer_use_goal"');
    expect(frontend).not.toContain("invoke(action");
    expect(frontend).not.toContain("Command::new(request");
  });

  it("routes known bounded actions to their tested adapter and unknown goals to current-app approval", () => {
    expect(frontend).toContain("const fixedCapability = resolveTakeoverCapability(request)");
    expect(frontend).toContain("takeoverRequestCard(request, fixedCapability)");
    expect(frontend).toContain("!fixedCapability && latestSnapshot && latestContextTarget");
  });

  it("routes approved foreground goals to exact-window native Computer Use", () => {
    expect(frontend).toContain('invoke<TakeoverExecutionResult>("execute_computer_use_goal"');
    expect(frontend).not.toContain("I cannot bring an application to the foreground");
  });
});
