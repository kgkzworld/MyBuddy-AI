import type { InterventionCandidate, ObservationEvent } from "./contracts";

export interface PatternDetectorOptions {
  switchThreshold: number;
  windowSeconds: number;
  dwellSeconds: number;
}

export class PatternDetector {
  private readonly events: ObservationEvent[] = [];

  constructor(private readonly options: PatternDetectorOptions) {}

  record(event: ObservationEvent): InterventionCandidate | null {
    this.events.push(event);
    const cutoff = new Date(event.observedAt).getTime() - this.options.windowSeconds * 1000;
    while (this.events.length > 0 && new Date(this.events[0].observedAt).getTime() < cutoff) {
      this.events.shift();
    }

    const recent = this.events.slice(-this.options.switchThreshold);
    if (recent.length < this.options.switchThreshold) {
      return null;
    }

    const identities = recent.map((item) => `${item.processName}|${item.title}`);
    const unique = new Set(identities);
    const alternates = identities.every((identity, index) => index < 2 || identity === identities[index - 2]);

    if (unique.size === 2 && alternates) {
      return {
        kind: "repeated-switch",
        confidence: 0.76,
        summary: `Repeated switching detected between ${recent[0].title} and ${recent[1].title}.`,
        observations: recent,
      };
    }

    return null;
  }
}
