import { describe, expect, it } from "vitest";
import frontend from "../src/main.ts?raw";
import nativeHost from "../src-tauri/src/lib.rs?raw";
import nativeComputerUse from "../src-tauri/src/computer_use_takeover.rs?raw";
import cards from "../src/cards/conversationCard.ts?raw";

describe("AutoHotkey visible demonstrations", () => {
  it("passes only a validated speed and pinned target to the native demo", () => {
    expect(frontend).toContain('case "start_computer_use_demo"');
    expect(frontend).toContain('"execute_autohotkey_demo"');
    expect(frontend).toContain("approval.target");
    expect(frontend).toMatch(/requestedSpeed === "slow" \? "slow" : "normal"/);
    expect(nativeHost).toContain("computer_use_takeover::execute_autohotkey_demo");
  });

  it("generates fixed AutoHotkey actions rather than accepting model script source", () => {
    expect(nativeComputerUse).toContain("build_autohotkey_click_script");
    expect(nativeComputerUse).toContain("element_frame_center");
    expect(nativeComputerUse).not.toMatch(/ahk_source\s*:/i);
  });

  it("offers a native cancellation path without keyboard hooks", () => {
    expect(cards).toContain('data: { action: "cancel_autohotkey_demo" }');
    expect(frontend).toContain('case "cancel_autohotkey_demo"');
    expect(frontend).toContain('invoke("cancel_autohotkey_demo")');
    expect(nativeComputerUse).toContain("DEMONSTRATION_CANCELLED");
    expect(nativeHost).toContain("computer_use_takeover::cancel_autohotkey_demo");
  });

  it("has a deterministic Word demonstration smoke path through the production handler", () => {
    expect(nativeHost).toContain('argument == "--smoke-autohotkey-demo"');
    expect(nativeHost).toContain('emit("smoke-autohotkey-demo-normal"');
    expect(frontend).toContain('listen("smoke-autohotkey-demo-normal"');
    expect(frontend).toMatch(/handleCardAction\(\s*"start_computer_use_demo"/);
  });
});