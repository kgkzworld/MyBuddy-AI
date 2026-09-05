import { describe, expect, it } from "vitest";
import { takeoverLaunchResultCard, takeoverRequestCard } from "../src/cards/conversationCard";

describe("takeoverRequestCard", () => {
  it("offers app-general Computer Use for an approved goal without an app-specific walkthrough", () => {
    const serialized = JSON.stringify(takeoverRequestCard("Open the current application's file picker", null));
    expect(serialized).toContain("Yes — use Computer Use");
    expect(serialized).toContain("request_computer_use");
    expect(serialized).toContain("Open the current application's file picker");
    expect(serialized).not.toContain("tested adapter");
    expect(serialized).not.toMatch(/Notepad\+\+|Microsoft Word/);
  });

  it("does not offer execution for an unrecognized takeover request", () => {
    const card = takeoverRequestCard("Do something else", null);
    expect(JSON.stringify(card)).toContain("request_computer_use");
  });

  it("offers a non-persistent approval for AI story generation and verified Notepad++ insertion", () => {
    const card = takeoverRequestCard(
      "open Notepad++, open a new file and create a story that is 500 words or less",
      "notepad-story",
    );
    const serialized = JSON.stringify(card);
    expect(serialized).toContain("Allow once, write the story, and put it in Notepad++");
    expect(serialized).toContain("approve_notepad_story");
    expect(serialized).not.toContain("Always allow this exact action");
  });

  it("reports a verified Word launch without claiming a File Open dialog", () => {
    const card = takeoverLaunchResultCard(true, "Microsoft Word is visible.");
    expect(JSON.stringify(card)).toContain("Microsoft Word is open");
    expect(JSON.stringify(card)).toContain("Allow-once scope ended");
    expect(JSON.stringify(card)).not.toContain("Open dialog is ready");
  });

  it("reports a verified Notepad++ foreground action without calling it Word", () => {
    const card = takeoverLaunchResultCard(true, "Notepad++ is foreground.", "Notepad++");
    expect(JSON.stringify(card)).toContain("Notepad++ is open");
    expect(JSON.stringify(card)).not.toContain("Microsoft Word is open");
  });
});