import { describe, expect, it } from "vitest";
import frontend from "../src/main.ts?raw";
import shell from "../index.html?raw";

describe("multi-turn conversation continuity", () => {
  it("passes bounded prior conversation to selected-agent follow-up questions", () => {
    const passthroughStart = frontend.indexOf("if (shouldPassThroughToSelectedAgent");
    const passthroughEnd = frontend.indexOf("return;", passthroughStart);
    const passthrough = frontend.slice(passthroughStart, passthroughEnd);

    expect(passthrough).toContain('invoke<string>("ask_qwen"');
    expect(passthrough).toContain("conversation: priorConversation");
  });

  it("exposes a clear control that resets conversation and prepared-target context", () => {
    expect(shell).toContain('id="clear-conversation"');
    expect(shell).toContain('aria-label="Clear conversation and start over"');
    expect(frontend).toContain('document.querySelector<HTMLButtonElement>("#clear-conversation")');
    expect(frontend).toContain("conversationContext.clear();");
    expect(frontend).toContain("pendingComputerUseApproval = null;");
    expect(frontend).toContain("pendingAgentToolApproval = null;");
  });
});
