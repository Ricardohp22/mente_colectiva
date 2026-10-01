export const GAME_STATES = [
  "IDLE",
  "QUESTION_ACTIVE",
  "PAUSED_FOR_LARGE_GIFT",
  "QUESTION_RESULTS",
  "SUPREME_CHALLENGE",
  "EXTENSION_OFFER",
  "LIVE_PAUSED",
  "LIVE_FINISHED",
] as const;

export type GameState = (typeof GAME_STATES)[number];
