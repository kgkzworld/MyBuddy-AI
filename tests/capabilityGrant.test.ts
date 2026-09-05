import { describe, expect, it } from "vitest";
import {
  isCapabilityAlwaysAllowed,
  parseCapabilityGrants,
  recordCapabilityUse,
  rememberCapability,
  revokeCapability,
} from "../src/core/capabilityGrant";
import html from "../index.html?raw";
import frontend from "../src/main.ts?raw";

describe("persistent fixed-capability grants", () => {
  it("does not persist generic or retired application-specific visual workflows", () => {
    expect(() => rememberCapability([], "word-open-dialog" as never, "2026-08-28T20:00:00.000Z"))
      .toThrow("Unsupported capability grant");
    expect(() => rememberCapability([], "open-anything" as never, "2026-08-28T20:00:00.000Z"))
      .toThrow("Unsupported capability grant");
  });

  it("keeps empty grant operations safe", () => {
    expect(isCapabilityAlwaysAllowed([], "notepad-story")).toBe(false);
    expect(recordCapabilityUse([], "notepad-story", "2026-08-28T20:01:00.000Z")).toEqual([]);
    expect(revokeCapability([], "notepad-story")).toEqual([]);
  });

  it("drops malformed and unknown stored entries", () => {
    const parsed = parseCapabilityGrants(JSON.stringify([
      { capability: "word-launch", mode: "always", grantedAt: "2026-08-28T20:00:00.000Z", useCount: 0 },
      { capability: "delete-files", mode: "always", grantedAt: "2026-08-28T20:00:00.000Z", useCount: 0 },
    ]));
    expect(parsed).toEqual([]);
  });

  it("keeps legacy exact grants auditable and revocable without auto-using them", () => {
    expect(frontend).toContain('const capabilityGrantStorageKey = "mybuddy-capability-grants"');
    expect(frontend).toContain('case "always_allow_capability"');
    expect(frontend).toContain('recordEvent("capability-grant-created"');
    expect(frontend).toContain('recordEvent("capability-grant-used"');
    expect(frontend).not.toContain("isCapabilityAlwaysAllowed(grants, capability)");
    expect(frontend).toContain("takeoverRequestCard(request, fixedCapability)");
    expect(frontend).toContain("renderCapabilityGrantSettings");
    expect(frontend).toContain('recordEvent("capability-grant-revoked"');
    expect(html).toContain('id="capability-grant-list"');
  });
});
