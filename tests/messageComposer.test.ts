import { describe, expect, it } from "vitest";
import html from "../index.html?raw";
import frontend from "../src/main.ts?raw";
import rustQwen from "../src-tauri/src/qwen.rs?raw";
import { classifyUserRequest } from "../src/core/userRequest";

describe("question and takeover composer", () => {
  it("provides a persistent labelled message field", () => {
    expect(html).toContain('id="message-form"');
    expect(html).toContain('id="message-input"');
    expect(html).toContain("Ask a question or describe what you want me to do");
  });

  it("routes questions locally and takeover requests to preview only", () => {
    expect(frontend).toContain('invoke<string>("ask_qwen"');
    expect(frontend).toContain('requestClass === "takeover-preview"');
    expect(frontend).toContain("takeoverRequestCard");
    expect(frontend).not.toContain('invoke("execute');
  });

  it("uses a local text-only Qwen request for questions", () => {
    expect(rustQwen).toContain("pub async fn ask_qwen");
    expect(rustQwen).toContain('"type": "text"');
    expect(rustQwen).toContain("Do not claim to see the screen");
  });

  it.each([
    "kill the MS Edge browser window that is stuck on my screen",
    "terminate the stuck Microsoft Edge window",
    "force close Edge for me",
  ])("keeps stuck-browser execution requests out of question passthrough: %s", (request) => {
    expect(classifyUserRequest(request)).toBe("takeover-preview");
  });
});