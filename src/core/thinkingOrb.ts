export class ThinkingOrbController {
  private readonly depths = new Map<string, number>();

  constructor(
    private readonly show: () => Promise<void>,
    private readonly restore: () => Promise<void>,
  ) {}

  async begin(owner = "default"): Promise<void> {
    const wasThinking = this.isThinking();
    this.depths.set(owner, (this.depths.get(owner) ?? 0) + 1);
    if (!wasThinking) await this.show();
  }

  async end(owner = "default"): Promise<void> {
    const depth = this.depths.get(owner) ?? 0;
    if (depth === 0) return;
    if (depth === 1) this.depths.delete(owner);
    else this.depths.set(owner, depth - 1);
    if (!this.isThinking()) await this.restore();
  }

  async cancel(owner: string): Promise<void> {
    if (!this.depths.delete(owner)) return;
    if (!this.isThinking()) await this.restore();
  }

  isThinking(): boolean {
    return this.depths.size > 0;
  }

  async run<T>(work: () => Promise<T>, owner = "default"): Promise<T> {
    await this.begin(owner);
    try {
      return await work();
    } finally {
      await this.end(owner);
    }
  }
}
