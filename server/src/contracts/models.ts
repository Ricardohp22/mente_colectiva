import type { GameState } from "./game-state.js";

export type AnswerKind = "TEXT" | "INTEGER" | "DECIMAL" | "DATE";

export type QuestionPresentation = "text" | "image" | "interactive";

export type QuestionInstanceKind =
  | "normal"
  | "nightmare"
  | "category_change"
  | "supreme";

export interface Player {
  id: string;
  externalId: string;
  displayName: string;
}

export interface Question {
  id: string;
  category: string;
  type: string;
  presentation: QuestionPresentation;
  difficulty: number;
  prompt: string;
  value: number;
  initialTimeSeconds: number;
  answerKind: AnswerKind;
  correctAnswers: string[];
  hints: string[];
  nightmareQuestionId: string | null;
}

export interface LiveSession {
  id: string;
  state: GameState;
  durationLimitSeconds: number;
}
