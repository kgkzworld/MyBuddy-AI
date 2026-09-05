import { describe, expect, it } from "vitest";
import { createDefaultPrivacyPolicy } from "../src/core/privacy";
import type { WindowSnapshot } from "../src/core/contracts";

const snapshot = (processName: string, title: string): WindowSnapshot => ({
  processName,
  title,
  observedAt: "2026-08-28T01:00:00.000Z",
});

describe("default privacy policy", () => {
  it.each([
    ["1Password", "1Password"],
    ["msedge", "Sign in to your account"],
    ["chrome", "Bank of America — Online Banking"],
    ["CredentialUIBroker", "Windows Security"],
    ["Safari", "Private Browsing"],
  ])("blocks sensitive context %s / %s", (processName, title) => {
    const result = createDefaultPrivacyPolicy().evaluate(snapshot(processName, title));

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/^blocked:/);
  });

  it("allows normal work windows", () => {
    const result = createDefaultPrivacyPolicy().evaluate(
      snapshot("Code", "Ambient Desktop Agent — Visual Studio Code"),
    );

    expect(result).toEqual({ allowed: true, reason: "allowed" });
  });
});
