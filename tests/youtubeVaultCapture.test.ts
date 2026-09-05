// @vitest-environment node

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const script = resolve("harness/skills/youtube-to-vault/scripts/capture_youtube_to_vault.py");

function runCapture(root: string, fixture: string) {
  return spawnSync(
    "python",
    [
      script,
      "https://www.youtube.com/watch?v=7s462S-qRY4&t=67s",
      "--vault-root",
      root,
      "--destination",
      "010_Personal/035_Knowledge_Base/DevOps/Floci.md",
      "--transcript-json",
      fixture,
      "--title",
      "This Tool Runs Real AWS Services on Your Laptop For Free (Floci)",
      "--author",
      "Better Stack",
    ],
    { encoding: "utf8" },
  );
}

describe("YouTube-to-vault capture", () => {
  it("accepts a final caption at 7:31 for a 7:33 video and verifies the saved note", () => {
    const root = mkdtempSync(join(tmpdir(), "mbai-vault-"));
    const fixture = join(root, "transcript.json");
    writeFileSync(
      fixture,
      JSON.stringify({
        video_id: "7s462S-qRY4",
        segment_count: 3,
        duration: "7:33",
        timestamped_text: "0:00 Intro\n7:21 Closing\n7:31 [music]",
      }),
      "utf8",
    );

    const result = runCapture(root, fixture);

    expect(result.status, result.stderr).toBe(0);
    const notePath = join(root, "010_Personal/035_Knowledge_Base/DevOps/Floci.md");
    const note = readFileSync(notePath, "utf8");
    expect(note).toContain('video_id: "7s462S-qRY4"');
    expect(note).toContain("7:31 [music]");
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: "saved-and-verified",
      segmentCount: 3,
      lastTimestamp: "7:31",
    });
  });

  it("rejects destinations outside the selected vault root", () => {
    const root = mkdtempSync(join(tmpdir(), "mbai-vault-"));
    const fixture = join(root, "transcript.json");
    writeFileSync(
      fixture,
      JSON.stringify({
        video_id: "7s462S-qRY4",
        segment_count: 1,
        duration: "0:05",
        timestamped_text: "0:00 Intro",
      }),
      "utf8",
    );

    const result = spawnSync(
      "python",
      [
        script,
        "7s462S-qRY4",
        "--vault-root",
        root,
        "--destination",
        "../outside.md",
        "--transcript-json",
        fixture,
        "--title",
        "Unsafe",
      ],
      { encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("destination must stay inside the vault root");
  });
});
