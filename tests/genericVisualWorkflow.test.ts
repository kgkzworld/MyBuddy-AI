import { describe, expect, it } from "vitest";
import { createAgentTools } from "../src/core/agentTools";
import nativeComputerUse from "../src-tauri/src/computer_use_takeover.rs?raw";
import nativeHost from "../src-tauri/src/lib.rs?raw";
import nativeNotepad from "../src-tauri/src/notepad_takeover.rs?raw";
import frontend from "../src/main.ts?raw";

const productionComputerUse = nativeComputerUse.split("#[cfg(test)]")[0];

describe("generic target-bound visual workflows", () => {
  it("declares that mail and vault retrieval are not visual workflows", () => {
    const tool = createAgentTools(async () => ({}))
      .find((candidate) => candidate.id === "desktop.visual_workflow")!;
    expect(tool.description).toContain("Do not use for email, inbox, mail, vault, or Obsidian retrieval");
  });

  it("exposes one application-agnostic visual workflow to the selected AI", async () => {
    const calls: Array<{ command: string; argumentsValue?: Record<string, unknown> }> = [];
    const tool = createAgentTools(async (command, argumentsValue) => {
      calls.push({ command, argumentsValue });
      return { application: "Example Editor", verified: true };
    }).find((candidate) => candidate.id === "desktop.visual_workflow")!;

    expect(tool).toBeDefined();
    expect(tool.risk).toBe("consequential");
    expect(tool.description).toMatch(/any named desktop application/i);
    await tool.execute({
      application: "Example Editor",
      goal: "Show how to open a file and stop before selecting one",
      mode: "demonstrate",
    });
    expect(calls).toEqual([{
      command: "execute_application_visual_workflow",
      argumentsValue: {
        application: "Example Editor",
        goal: "Show how to open a file and stop before selecting one",
        mode: "demonstrate",
      },
    }]);
  });

  it("acquires named applications and follows only same-process workflow windows", () => {
    expect(nativeHost).toContain("computer_use_takeover::execute_application_visual_workflow");
    expect(nativeComputerUse).toContain('"launch_app"');
    expect(nativeComputerUse).toContain("resolve_application_target");
    expect(nativeComputerUse).toContain("select_workflow_window");
    expect(nativeComputerUse).toContain("origin_process_id");
    expect(nativeComputerUse).toContain("same process");
    expect(nativeComputerUse).toContain('"get_window_state"');
    expect(nativeComputerUse).toContain('"element_token"');
  });

  it("contains no application-specific visual executor or fixed walkthrough", () => {
    expect(productionComputerUse).not.toMatch(/Notepad\+\+|Microsoft Word|WINWORD|File > Open/);
    expect(nativeNotepad).not.toContain("execute_notepad_file_open_demonstration");
    expect(nativeHost).not.toContain("notepad_takeover::execute_notepad_file_open_demonstration");
    expect(frontend).not.toContain("start_notepad_file_open_demo");
    expect(frontend).not.toContain("notepad-file-open-demonstration");
    expect(nativeHost).not.toContain("--smoke-notepad-file-open-demonstration");
    expect(nativeHost).not.toContain("--smoke-notepad-context-follow-up");
  });

  it("does not register application-specific executors for ordinary visual workflows", () => {
    for (const command of [
      "execute_notepad_launch",
      "execute_notepad_open_dialog",
      "execute_word_launch",
      "execute_word_open_dialog",
    ]) {
      expect(nativeHost).not.toContain(command);
      expect(frontend).not.toContain(`\"${command}\"`);
    }
  });
});
