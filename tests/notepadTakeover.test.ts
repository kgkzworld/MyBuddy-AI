import { describe, expect, it } from "vitest";
import nativeTakeover from "../src-tauri/src/notepad_takeover.rs?raw";
import nativeHost from "../src-tauri/src/lib.rs?raw";
import frontend from "../src/main.ts?raw";

describe("bounded Notepad++ integration", () => {
  it("does not register Notepad++-specific launch or File Open visual executors", () => {
    expect(nativeHost).not.toContain("notepad_takeover::execute_notepad_launch");
    expect(nativeHost).not.toContain("notepad_takeover::execute_notepad_open_dialog");
    expect(frontend).not.toContain('case "approve_notepad_launch"');
    expect(frontend).not.toContain('case "approve_notepad_open_dialog"');
  });

  it("retains the bounded script-style story accelerator with read-back verification", () => {
    expect(nativeTakeover).toContain('args(["-multiInst", "-nosession"]');
    expect(nativeTakeover).toContain("wait_for_main_window_for_process");
    expect(nativeTakeover).toContain("std::fs::write");
    expect(nativeTakeover).toContain("std::fs::read_to_string");
    expect(nativeTakeover).toContain("execute_notepad_story");
    expect(nativeHost).toContain("notepad_takeover::execute_notepad_story");
    expect(frontend).toContain('case "approve_notepad_story"');
  });
});