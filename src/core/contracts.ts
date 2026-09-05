export interface WindowSnapshot {
  processName: string;
  title: string;
  observedAt: string;
}

export interface PrivacyDecision {
  allowed: boolean;
  reason: string;
}

export interface ObservationEvent extends WindowSnapshot {
  kind: "window-changed" | "window-dwell" | "manual-analysis";
}

export interface InterventionCandidate {
  kind: "repeated-switch" | "long-dwell" | "manual-analysis";
  confidence: number;
  summary: string;
  observations: ObservationEvent[];
}

export interface Suggestion {
  title: string;
  message: string;
  confidence: number;
  source: "qwen" | "local-fallback";
  observedProcess: string;
  observedWindow: string;
}
