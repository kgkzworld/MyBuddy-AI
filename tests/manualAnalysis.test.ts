import { describe, expect, it } from "vitest";
import { buildManualAnalysisCandidate } from "../src/core/manualAnalysis";
import { createDefaultPrivacyPolicy } from "../src/core/privacy";

const policy = createDefaultPrivacyPolicy();

describe("manual analysis privacy boundary", () => {
  it("refuses an explicit analysis request in a sensitive context", () => {
    const candidate = buildManualAnalysisCandidate(
      { processName: "1Password", title: "Vault", observedAt: "2026-08-28T01:00:00Z" },
      policy,
    );

    expect(candidate).toBeNull();
  });

  it("creates a minimal candidate for a permitted context", () => {
    const candidate = buildManualAnalysisCandidate(
      { processName: "Code", title: "Ambient Desktop Agent", observedAt: "2026-08-28T01:00:00Z" },
      policy,
    );

    expect(candidate?.kind).toBe("manual-analysis");
    expect(candidate?.observations).toHaveLength(1);
  });
});
