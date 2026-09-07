import { describe, expect, it } from "vitest";
import config from "../src-tauri/tauri.conf.json";
import provider from "../src-tauri/src/provider.rs?raw";

const harnessFiles = import.meta.glob<string>("../harness/**/*", {
  eager: true,
  query: "?raw",
  import: "default",
});
const macConfigFiles = import.meta.glob<string>("../src-tauri/tauri.macos.conf.json", {
  eager: true,
  query: "?raw",
  import: "default",
});

function read(relative: string): string {
  return harnessFiles[`../harness/${relative}`] ?? "";
}

describe("portable MBAI harness", () => {
  it("packages the project-owned harness and exposes it to every equipped Hermes child", () => {
    expect(config.bundle.resources).toMatchObject({ "../harness/": "harness/" });
    expect(provider).toContain("BaseDirectory::Resource");
    expect(provider).toContain('resolve("harness", BaseDirectory::Resource)');
    expect(provider).toContain('command.env("MBAI_HARNESS_PATH"');
  });

  it("contains portable skills, workflows, cron definitions, and an installer", () => {
    for (const relative of [
      "README.md",
      "manifest.json",
      "skills/master-vault/SKILL.md",
      "skills/youtube-to-vault/SKILL.md",
      "skills/youtube-to-vault/scripts/capture_youtube_to_vault.py",
      "skills/composio-gmail/SKILL.md",
      "skills/composio-gmail/scripts/composio_gmail.py",
      "workflows/catalog.json",
      "cron/jobs.json",
      "scripts/install_harness.py",
    ]) {
      expect(Object.hasOwn(harnessFiles, `../harness/${relative}`), relative).toBe(true);
    }
  });

  it("configures profiles with the relocatable harness variable instead of an install path", () => {
    const installer = read("scripts/install_harness.py");
    expect(installer).toContain('${MBAI_HARNESS_PATH}/skills');
    expect(installer).toContain('"youtube-to-vault"');
    expect(installer).toContain('command = ["hermes", "-p", profile]');
    expect(installer).not.toContain('if profile != "default"');
    expect(installer).not.toContain('json.dumps([str(skills_dir)])');
  });

  it("does not embed this workstation's vault, user, or interpreter paths", () => {
    const portableFiles = [
      "README.md",
      "manifest.json",
      "skills/master-vault/SKILL.md",
      "skills/youtube-to-vault/SKILL.md",
      "skills/youtube-to-vault/scripts/capture_youtube_to_vault.py",
      "skills/composio-gmail/SKILL.md",
      "skills/composio-gmail/scripts/composio_gmail.py",
      "workflows/catalog.json",
      "cron/jobs.json",
      "scripts/install_harness.py",
    ].map(read).join("\n");

    expect(portableFiles).not.toContain("H:\\My Drive");
    expect(portableFiles).not.toContain("kgkzworld");
    expect(portableFiles).not.toContain("Python313");
    expect(portableFiles).not.toContain("COMPOSIO_API_KEY=");
  });

  it("does not package generated Python bytecode", () => {
    const packagedPaths = Object.keys(harnessFiles);
    expect(packagedPaths.some((entry) => entry.includes("__pycache__"))).toBe(false);
    expect(packagedPaths.some((entry) => entry.endsWith(".pyc"))).toBe(false);
  });

  it("keeps cron source definitions declarative and credential-free", () => {
    const jobs = JSON.parse(read("cron/jobs.json"));
    expect(jobs.schemaVersion).toBe(1);
    expect(jobs.jobs).toEqual([]);
    expect(JSON.stringify(jobs)).not.toMatch(/token|password|api[_-]?key/i);
  });

  it("declares an atomic YouTube transcript-to-vault workflow", () => {
    const workflows = JSON.parse(read("workflows/catalog.json"));
    expect(workflows.workflows).toContainEqual(
      expect.objectContaining({
        id: "youtube-transcript-to-vault",
        skills: ["youtube-to-vault", "master-vault", "obsidian", "youtube-content"],
        mode: "write-requested",
        computerUseFallback: false,
      }),
    );
    const skill = read("skills/youtube-to-vault/SKILL.md");
    expect(skill).toContain("Never require a caption at an exact wall-clock second");
    expect(skill).toContain("saved-and-verified");
  });

  it("uses an App-Store-compatible opaque main window on macOS", () => {
    const raw = macConfigFiles["../src-tauri/tauri.macos.conf.json"];
    expect(raw).toBeTruthy();
    const macConfig = JSON.parse(raw ?? "{}");
    expect(macConfig.app.macOSPrivateApi).toBe(false);
    expect(macConfig.app.windows[0].transparent).toBe(false);
  });
});
