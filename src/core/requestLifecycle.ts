export type RequestProgressState = "working" | "cancelled" | "completed" | "failed";

export interface RequestProgressEntry {
  requestId: string;
  message: string;
  state: RequestProgressState;
  at: number;
}

export class RequestLifecycle {
  private activeId: string | null = null;
  private cancelled = new Set<string>();
  private history: RequestProgressEntry[] = [];

  constructor(private readonly maxEntries = 40) {}

  start(requestId: string, message: string): void {
    this.activeId = requestId;
    this.cancelled.delete(requestId);
    this.append(requestId, message, "working");
  }

  update(requestId: string, message: string, state: RequestProgressState = "working"): boolean {
    if (requestId !== this.activeId && !this.cancelled.has(requestId)) return false;
    this.append(requestId, message, state);
    if (state === "completed" || state === "failed") this.activeId = null;
    return true;
  }

  cancel(requestId: string): boolean {
    if (requestId !== this.activeId) return false;
    this.cancelled.add(requestId);
    this.activeId = null;
    this.append(requestId, "Cancellation requested", "cancelled");
    return true;
  }

  acceptsResult(requestId: string): boolean {
    return requestId === this.activeId && !this.cancelled.has(requestId);
  }

  finish(requestId: string, state: "completed" | "failed", message: string): boolean {
    if (!this.acceptsResult(requestId)) return false;
    this.append(requestId, message, state);
    this.activeId = null;
    return true;
  }

  activeRequestId(): string | null {
    return this.activeId;
  }

  entries(): readonly RequestProgressEntry[] {
    return this.history;
  }

  private append(requestId: string, message: string, state: RequestProgressState): void {
    this.history.push({ requestId, message: message.slice(0, 120), state, at: Date.now() });
    if (this.history.length > this.maxEntries) {
      this.history.splice(0, this.history.length - this.maxEntries);
    }
  }
}
