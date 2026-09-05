import { describe, expect, it } from "vitest";
import provider from "../src-tauri/src/provider.rs?raw";

describe("provider child-process visibility policy", () => {
  it("suppresses console allocation for every Windows CLI provider child", () => {
    expect(provider).toContain("std::os::windows::process::CommandExt");
    expect(provider).toContain("const CREATE_NO_WINDOW: u32 = 0x08000000");
    expect(provider).toContain("configure_background_process(&mut command)");
    expect(provider).toContain("command.creation_flags(CREATE_NO_WINDOW)");
  });

  it("uses direct non-terminal execution on macOS and Linux", () => {
    expect(provider).toContain('#[cfg(not(target_os = "windows"))]');
    expect(provider).not.toContain("Terminal.app");
    expect(provider).not.toContain("xterm");
    expect(provider).not.toContain("osascript");
    expect(provider).toContain(".stdin(Stdio::piped())");
    expect(provider).toContain(".stdout(Stdio::piped())");
    expect(provider).toContain(".stderr(Stdio::piped())");
  });

  it("rejects whitespace-only HTTP assistant content", () => {
    expect(provider).toContain("Provider returned empty assistant content.");
    expect(provider).toContain("!content.trim().is_empty()");
  });
});
