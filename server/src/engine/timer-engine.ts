export class TimerEngine {
  private startedAt: number | null = null;
  private durationMs = 0;

  start(durationMs: number, now: number): void {
    this.startedAt = now;
    this.durationMs = durationMs;
  }

  remainingMs(now: number): number {
    if (this.startedAt === null) {
      return 0;
    }

    return Math.max(0, this.durationMs - (now - this.startedAt));
  }

  isRunning(): boolean {
    return this.startedAt !== null;
  }
}
