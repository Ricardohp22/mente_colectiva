import type { GameEvent } from "../contracts/events.js";

export class EventQueue {
  private readonly events: GameEvent[] = [];

  record(event: GameEvent): GameEvent {
    this.events.push(event);
    return event;
  }

  history(): readonly GameEvent[] {
    return this.events;
  }
}
