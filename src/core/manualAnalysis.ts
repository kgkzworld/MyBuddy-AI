import type { InterventionCandidate, WindowSnapshot } from "./contracts";
import type { PrivacyPolicy } from "./privacy";

export function buildManualAnalysisCandidate(
  snapshot: WindowSnapshot,
  privacyPolicy: PrivacyPolicy,
): InterventionCandidate | null {
  if (!privacyPolicy.evaluate(snapshot).allowed) {
    return null;
  }

  return {
    kind: "manual-analysis",
    confidence: 1,
    summary: "The user explicitly requested analysis of the current work context.",
    observations: [{ ...snapshot, kind: "manual-analysis" }],
  };
}
