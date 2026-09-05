import { describe, expect, it } from "vitest";
import { captureComputerUseApproval } from "../src/core/computerUseApproval";

describe("Computer Use approval target", () => {
  it("keeps the exact target captured when the approval card was created", () => {
    const snapshot = { processName: "Microsoft Word", title: "Document1", observedAt: "2026-08-29T13:49:03Z" };
    const target = {
      windowHandle: 590358,
      expectedProcessId: 49884,
      expectedProcessName: "Microsoft Word",
      expectedTitle: "Document1",
    };

    const approval = captureComputerUseApproval(
      snapshot,
      target,
      "Open the current application's file picker and stop before selecting a file",
    );
    snapshot.processName = "Windows Shell Experience Host";
    target.windowHandle = 123;
    target.expectedProcessName = "Windows Shell Experience Host";

    expect(approval.snapshot.processName).toBe("Microsoft Word");
    expect(approval.target.windowHandle).toBe(590358);
    expect(approval.target.expectedProcessName).toBe("Microsoft Word");
  });

  it("rejects an empty approval goal", () => {
    expect(() => captureComputerUseApproval(
      { processName: "Microsoft Word", title: "Document1", observedAt: "now" },
      {
        windowHandle: 590358,
        expectedProcessId: 49884,
        expectedProcessName: "Microsoft Word",
        expectedTitle: "Document1",
      },
      "   ",
    )).toThrow(/goal/i);
  });
});
