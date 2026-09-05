import { describe, expect, it } from "vitest";
import { answerLocalUtility } from "../src/core/localUtility";
import { questionAnswerCard } from "../src/cards/conversationCard";
import frontend from "../src/main.ts?raw";
import nativeHost from "../src-tauri/src/lib.rs?raw";

describe("local utility answers", () => {
  it("answers a direct time question in-process", () => {
    const answer = answerLocalUtility("what time is it", new Date(2026, 7, 28, 21, 7, 6));

    expect(answer).toMatch(/^The current time is /);
    expect(answer).toContain("9:07:06");
  });

  it("leaves non-utility questions for the selected provider", () => {
    expect(answerLocalUtility("How do I fix this build?", new Date())).toBeNull();
  });

  it("labels an in-process answer without claiming Qwen handled it", () => {
    const card = JSON.stringify(
      questionAnswerCard("what time is it", "The current time is 9:07 PM.", "in-process"),
    );

    expect(card).toContain("Answered in-process · no helper process or screen content");
    expect(card).not.toContain("Answered by local Qwen");
  });

  it("provides a deterministic smoke-only submission through the real form handler", () => {
    expect(nativeHost).toContain('--smoke-time-question');
    expect(nativeHost).toContain('handle.emit("smoke-time-question"');
    expect(frontend).toContain('listen("smoke-time-question"');
    expect(frontend).toContain('messageInput.value = "what time is it"');
    expect(frontend).toContain("messageForm.requestSubmit()");
  });
});
