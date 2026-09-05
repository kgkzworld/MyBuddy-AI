import { describe, expect, it } from "vitest";

const files = import.meta.glob<string>(["../docs/*.md", "../scripts/*"], {
  eager: true,
  query: "?raw",
  import: "default",
});
const portableRepositoryFiles = import.meta.glob<string>(
  ["../AGENTS.md", "../README.md", "../docs/*.md", "../scripts/*", "../harness/**/*"],
  { eager: true, query: "?raw", import: "default" },
);

function read(relative: string): string {
  return files[`../${relative}`] ?? "";
}

describe("cross-platform installation delivery", () => {
  it("documents click-through and source installation on all three desktop operating systems", () => {
    const guide = read("docs/INSTALL.md");
    expect(guide).toContain("## Windows");
    expect(guide).toContain("## macOS");
    expect(guide).toContain("## Linux");
    expect(guide).toContain("### Click-through install");
    expect(guide).toContain("### Build from source");
    expect(guide).toContain("current platform limitations");
    expect(guide).toContain("https://www.youtube.com/watch?v=OdximU6Ao00");
  });

  it("ships opt-in automation for Windows and Unix-like systems", () => {
    const windows = read("scripts/install-mybuddy.ps1");
    const unix = read("scripts/install-mybuddy.sh");
    expect(windows).toContain("npm ci --include=dev");
    expect(windows).toContain("npm run tauri build");
    expect(windows).toContain("install_harness.py");
    expect(unix).toContain("npm ci --include=dev");
    expect(unix).toContain("npm run tauri build");
    expect(unix).toContain("install_harness.py");
    expect(unix).toContain("uname -s");
  });

  it("provides an AI installer playbook with verification and no unsupported parity claim", () => {
    const playbook = read("docs/AI-INSTALL.md");
    expect(playbook).toContain("Read `AGENTS.md`");
    expect(playbook).toContain("npm test");
    expect(playbook).toContain("cargo test");
    expect(playbook).toContain("Do not claim macOS or Linux feature parity");
    expect(playbook).toContain("read back");
  });

  it("keeps tracked guidance free of checkout paths and repository visibility claims", () => {
    const guidance = Object.values(portableRepositoryFiles).join("\n");
    expect(guidance).not.toMatch(/\b[A-Za-z]:[\\/]/);
    expect(guidance).not.toMatch(/\/(?:Users|home)\//);
    expect(guidance).not.toMatch(/\b(?:private|public)\s+(?:canonical\s+)?(?:GitHub\s+)?repository\b/i);
    expect(guidance).not.toMatch(/github\.com\/[^/\s]+\/MyBuddy-AI/i);
  });
});
