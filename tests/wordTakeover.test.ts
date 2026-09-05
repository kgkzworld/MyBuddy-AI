import { describe, expect, it } from "vitest";
import nativeHost from "../src-tauri/src/lib.rs?raw";
import frontend from "../src/main.ts?raw";

describe("Microsoft Word visual workflows", () => {
  it("use the generic selected-AI visual workflow rather than a Word executor", () => {
    expect(nativeHost).not.toContain("mod word_takeover");
    expect(nativeHost).not.toContain("word_takeover::execute_word_launch");
    expect(nativeHost).not.toContain("word_takeover::execute_word_open_dialog");
    expect(frontend).not.toContain('case "approve_word_launch"');
    expect(frontend).not.toContain('case "approve_word_open_dialog"');
    expect(frontend).toContain('toolId === "desktop.visual_workflow"');
  });
});