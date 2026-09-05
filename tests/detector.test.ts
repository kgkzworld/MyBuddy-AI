import { describe, expect, it } from "vitest";
import { PatternDetector } from "../src/core/detector";
import type { ObservationEvent } from "../src/core/contracts";

const event = (processName: string, title: string, second: number): ObservationEvent => ({
  processName,
  title,
  observedAt: new Date(Date.UTC(2026, 7, 28, 1, 0, second)).toISOString(),
  kind: "window-changed",
});

describe("PatternDetector", () => {
  it("detects repeated switching between two work windows", () => {
    const detector = new PatternDetector({ switchThreshold: 4, windowSeconds: 60, dwellSeconds: 45 });

    detector.record(event("Code", "Editor", 0));
    detector.record(event("msedge", "Documentation", 5));
    detector.record(event("Code", "Editor", 10));
    const candidate = detector.record(event("msedge", "Documentation", 15));

    expect(candidate?.kind).toBe("repeated-switch");
    expect(candidate?.observations).toHaveLength(4);
  });

  it("does not flag normal forward progress across different windows", () => {
    const detector = new PatternDetector({ switchThreshold: 4, windowSeconds: 60, dwellSeconds: 45 });

    detector.record(event("Code", "Editor", 0));
    detector.record(event("msedge", "Documentation", 5));
    detector.record(event("explorer", "Project files", 10));
    const candidate = detector.record(event("notepad", "Notes", 15));

    expect(candidate).toBeNull();
  });
});
