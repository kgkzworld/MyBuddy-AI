import { describe, expect, it } from "vitest";
import frontend from "../src/main.ts?raw";
import html from "../index.html?raw";
import nativeHost from "../src-tauri/src/lib.rs?raw";

describe("request progress UI", () => {
  it("clears the previous card before starting provider work", () => {
    expect(frontend).toContain("function clearCardForNewRequest(): void");
    const clearCall = frontend.indexOf("clearCardForNewRequest();");
    const thinkingCall = frontend.indexOf("await beginThinking(requestId)", clearCall);
    const agentCall = frontend.indexOf("await executeAgentTurn(", clearCall);

    expect(clearCall).toBeGreaterThan(-1);
    expect(thinkingCall).toBeGreaterThan(clearCall);
    expect(agentCall).toBeGreaterThan(thinkingCall);
  });

  it("uses the distinct green question-mark avatar while working", () => {
    expect(frontend).toContain('thinking-green-question.png?inline');
    expect(frontend).toContain('applyTransientOrbImage("thinking-green-question"');
    expect(frontend).not.toContain("thinking-blue-question");
  });

  it("offers request cancellation and a live redacted activity log from the mini screen", () => {
    expect(html).toContain('id="cancel-request"');
    expect(html).toContain('id="activity-log-button"');
    expect(html).toContain('id="activity-log"');
    expect(frontend).toContain('invoke<ProviderCancellationResult>("cancel_provider_request"');
    expect(frontend).toContain('listen<ProviderProgressEvent>("provider-progress"');
  });

  it("has a packaged smoke that opens the live log and cancels a real slow provider request", () => {
    expect(nativeHost).toContain('argument == "--smoke-provider-cancellation"');
    expect(frontend).toContain('listen("smoke-provider-cancellation"');
    expect(frontend).toContain("activityLogButton.click()");
    expect(frontend).toContain("cancelRequestButton.click()");
    expect(frontend).toContain('recordEvent("activity-log-toggled"');
    expect(frontend).toContain('recordEvent("provider-cancel-completed"');
  });
});
