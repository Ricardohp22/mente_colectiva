export const EVENT_TYPES = [
  "PLAYER_ANSWERED",
  "GIFT_RECEIVED",
  "SMALL_MODIFIER_QUEUED",
  "MEDIUM_BET_PLACED",
  "LARGE_GIFT_RECEIVED",
  "LARGE_GIFT_CHOICE",
  "LARGE_GIFT_EXPIRED",
  "CHANGE_CATEGORY",
  "NEXT_QUESTION",
  "SHOW_HINT",
  "ACTIVATE_NIGHTMARE",
  "TIMER_EXPIRED",
  "QUESTION_CLOSED",
  "SUPREME_QUEUED",
  "EXTENSION_BLOCK_EARNED",
  "LIVE_STARTED",
  "LIVE_PAUSED",
  "LIVE_RESUMED",
  "LIVE_FINISHED",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type EventStatus = "pending" | "applied" | "rejected" | "obsolete";

export interface GameEvent<TPayload = unknown> {
  eventId: string;
  eventType: EventType;
  timestamp: string;
  liveId: string;
  questionInstanceId?: string;
  playerId?: string;
  payload: TPayload;
  status: EventStatus;
}
