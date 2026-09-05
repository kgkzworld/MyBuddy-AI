import { describe, expect, it } from "vitest";
import { fileOpenGuidanceCard, fileOpenGuidanceUnavailableCard } from "../src/cards/conversationCard";
import frontend from "../src/main.ts?raw";
import nativeComputerUse from "../src-tauri/src/computer_use_takeover.rs?raw";
import nativeHost from "../src-tauri/src/lib.rs?raw";

const nativeComputerUseProduction = nativeComputerUse.split("#[cfg(test)]")[0];

describe("file-open show-me guidance", () => {
  it("renders click-by-click instructions without code", () => {
    const serialized = JSON.stringify(fileOpenGuidanceCard(
      "Show me how to open a file",
      { processName: "Example Editor", title: "notes.txt" },
      ["Click the visible document menu.", "Choose the visible Open control."],
    ));

    expect(serialized).toContain("1. Click the visible document menu.");
    expect(serialized).toContain("2. Choose the visible Open control.");
    expect(serialized).not.toContain("Click File in the menu bar");
    expect(serialized).not.toMatch(/powershell|command prompt|```|ctrl\+o|\.ps1|\.bat/i);
  });

  it("asks for a visible demonstration speed before acting", () => {
    const serialized = JSON.stringify(fileOpenGuidanceCard(
      "Show me how to open a file",
      { processName: "Example Editor", title: "notes.txt" },
      ["Use the visible controls identified from the current app."],
    ));

    expect(serialized).toContain("Choose a demonstration speed");
    expect(serialized).toContain("Normal");
    expect(serialized).toContain("Slow");
    expect(serialized).toContain("start_computer_use_demo");
    expect(serialized).toContain('"speed":"normal"');
    expect(serialized).toContain('"speed":"slow"');
    expect(serialized).toContain("No file will be selected");
    expect(serialized).not.toContain("approve_notepad_open_dialog");
    expect(serialized).not.toContain("approve_word_open_dialog");
  });

  it("keeps a guidance failure separate from generic Qwen answers", () => {
    const serialized = JSON.stringify(fileOpenGuidanceUnavailableCard(
      "Show me how to open a file",
      { processName: "Example Editor", title: "notes.txt" },
    ));

    expect(serialized).toContain("could not verify click-by-click instructions");
    expect(serialized).toContain("Yes — let Computer Use inspect and try");
    expect(serialized).toContain("request_computer_use");
    expect(serialized).not.toContain("Local Qwen could not answer");
    expect(frontend).toContain("fileOpenGuidanceUnavailableCard");
    expect(frontend).toContain("file-open-guidance-error");
  });

  it("executes approval through a state-driven Computer Use goal", () => {
    expect(frontend).toContain('case "request_computer_use"');
    expect(frontend).toContain('invoke<TakeoverExecutionResult>("execute_computer_use_goal"');
    expect(nativeHost).toContain("computer_use_takeover::execute_computer_use_goal");
    expect(nativeComputerUse).toContain('"get_window_state"');
    expect(nativeComputerUse).toContain('"element_token"');
    expect(nativeComputerUse).toContain("MAX_STEPS");
    expect(nativeComputerUse).toContain("provider::complete");
    expect(nativeComputerUse).not.toContain('["File", "Open"]');
    expect(nativeComputerUseProduction).not.toMatch(/expected_process_name.*(?:word|notepad)/i);
    expect(nativeComputerUseProduction).not.toContain("execute_notepad_open_dialog");
    expect(nativeComputerUseProduction).not.toContain("execute_word_open_dialog");
  });

  it("allows a model-selected exact-window foreground action with native verification", () => {
    expect(nativeComputerUse).toContain("BringToFront");
    expect(nativeComputerUse).toMatch(/call_driver\(\s*"bring_to_front"/);
    expect(nativeComputerUse).toContain("window_id");
    expect(nativeComputerUse).toContain("verify_foreground");
    expect(nativeComputerUse).not.toContain("SetForegroundWindow");
  });

  it("provides an instruction-only smoke path through the real form", () => {
    expect(nativeHost).toContain('--smoke-file-open-guidance');
    expect(nativeHost).toContain('emit("smoke-file-open-guidance"');
    expect(frontend).toContain('listen("smoke-file-open-guidance"');
    expect(frontend).toContain('messageInput.value = "Show me how to open a file"');
    expect(frontend).toContain('invoke<ComputerUseGuidance>("plan_computer_use_guidance"');
    expect(nativeHost).toContain("computer_use_takeover::plan_computer_use_guidance");
  });
});