import type { EventType, GameEvent } from "../contracts/events.js";
import type { GameState } from "../contracts/game-state.js";
import type { Question } from "../contracts/models.js";
import { extractLastParenthetical, normalizeAnswer, sameAnswer } from "./answer-normalizer.js";
import type { Clock } from "./clock.js";
import { EventQueue } from "./event-queue.js";
import { pointsForCorrectAnswer } from "./score-engine.js";
import { TimerEngine } from "./timer-engine.js";

export interface CommentInput {
  externalId: string;
  displayName: string;
  text: string;
  questionInstanceId?: string;
}

export interface StoredAnswer {
  playerId: string;
  questionInstanceId: string;
  rawAnswer: string;
  normalizedAnswer: string;
  receivedAt: number;
  responseTimeMs: number;
  valid: boolean;
}

export interface QuestionAward {
  playerId: string;
  displayName: string;
  rawAnswer: string;
  correct: boolean;
  points: number;
  responseTimeMs: number;
}

export interface QuestionResult {
  questionInstanceId: string;
  prompt: string;
  correctAnswer: string;
  awards: QuestionAward[];
}

export interface LiveSnapshot {
  state: GameState;
  liveId: string | null;
  question: {
    instanceId: string;
    prompt: string;
    category: string;
    value: number;
    remainingSeconds: number;
  } | null;
  scores: Array<{ playerId: string; displayName: string; points: number }>;
  lastResult: QuestionResult | null;
}

interface PlayerRecord {
  id: string;
  externalId: string;
  displayName: string;
}

interface QuestionInstance {
  id: string;
  question: Question;
  openedAt: number;
}

export class GameEngine {
  private state: GameState = "IDLE";
  private liveId: string | null = null;
  private readonly players = new Map<string, PlayerRecord>();
  private readonly scores = new Map<string, number>();
  private readonly answers: StoredAnswer[] = [];
  private readonly usedQuestionIds = new Set<string>();
  private readonly events = new EventQueue();
  private readonly timer = new TimerEngine();
  private instance: QuestionInstance | null = null;
  private lastResult: QuestionResult | null = null;
  private sequence = 0;

  constructor(
    private readonly clock: Clock,
    private readonly questions: readonly Question[],
  ) {}

  startLive(liveId = "live-1"): void {
    if (this.liveId) {
      throw new Error("Ya hay un LIVE en curso");
    }

    this.liveId = liveId;
    this.state = "IDLE";
    this.record("LIVE_STARTED", { status: "applied" });
  }

  openNextQuestion(): void {
    this.sync();

    if (!this.liveId) {
      throw new Error("El LIVE no ha empezado");
    }

    if (this.state === "QUESTION_ACTIVE") {
      throw new Error("Ya hay una pregunta en curso");
    }

    const question = this.questions.find((item) => !this.usedQuestionIds.has(item.id));

    if (!question) {
      throw new Error("No quedan preguntas");
    }

    if (question.value < 0 || question.value > 50) {
      throw new Error("El valor de la pregunta debe estar entre 0 y 50");
    }

    if (question.initialTimeSeconds <= 0) {
      throw new Error("La pregunta necesita tiempo");
    }

    const now = this.clock.now();
    this.instance = {
      id: `${question.id}-A`,
      question,
      openedAt: now,
    };
    this.usedQuestionIds.add(question.id);
    this.timer.start(question.initialTimeSeconds * 1000, now);
    this.state = "QUESTION_ACTIVE";
    this.sync();
  }

  receiveComment(input: CommentInput): void {
    this.sync();

    const rawAnswer = extractLastParenthetical(input.text);

    if (rawAnswer === null) {
      return;
    }

    if (!this.liveId) {
      throw new Error("El LIVE no ha empezado");
    }

    const player = this.playerFor(input);

    if (input.questionInstanceId && input.questionInstanceId !== this.instance?.id) {
      this.record("PLAYER_ANSWERED", {
        playerId: player.id,
        questionInstanceId: input.questionInstanceId,
        payload: { rawAnswer, normalizedAnswer: "", responseTimeMs: 0 },
        status: "obsolete",
      });
      return;
    }

    if (this.state !== "QUESTION_ACTIVE" || !this.instance) {
      this.record("PLAYER_ANSWERED", {
        playerId: player.id,
        questionInstanceId: this.instance?.id,
        payload: { rawAnswer, normalizedAnswer: "", responseTimeMs: 0 },
        status: "rejected",
      });
      return;
    }

    const instance = this.instance;
    const normalized = normalizeAnswer(rawAnswer, instance.question.answerKind);
    const receivedAt = this.clock.now();
    const responseTimeMs = receivedAt - instance.openedAt;

    for (const answer of this.answers) {
      if (answer.playerId === player.id && answer.questionInstanceId === instance.id && answer.valid) {
        answer.valid = false;
      }
    }

    this.answers.push({
      playerId: player.id,
      questionInstanceId: instance.id,
      rawAnswer,
      normalizedAnswer: normalized.normalized,
      receivedAt,
      responseTimeMs,
      valid: true,
    });

    this.record("PLAYER_ANSWERED", {
      playerId: player.id,
      questionInstanceId: instance.id,
      payload: {
        rawAnswer,
        normalizedAnswer: normalized.normalized,
        responseTimeMs,
      },
      status: "applied",
    });
  }

  sync(): void {
    if (this.state !== "QUESTION_ACTIVE" || !this.instance || !this.timer.isRunning()) {
      return;
    }

    if (this.timer.remainingMs(this.clock.now()) > 0) {
      return;
    }

    this.closeQuestion();
  }

  listAnswers(): readonly StoredAnswer[] {
    return this.answers;
  }

  listEvents(): readonly GameEvent[] {
    return this.events.history();
  }

  snapshot(): LiveSnapshot {
    const scores = [...this.players.values()]
      .map((player) => ({
        playerId: player.id,
        displayName: player.displayName,
        points: this.scores.get(player.id) ?? 0,
      }))
      .sort((left, right) => right.points - left.points || left.displayName.localeCompare(right.displayName, "es"));

    return {
      state: this.state,
      liveId: this.liveId,
      question: this.instance
        ? {
            instanceId: this.instance.id,
            prompt: this.instance.question.prompt,
            category: this.instance.question.category,
            value: this.instance.question.value,
            remainingSeconds: Math.ceil(this.timer.remainingMs(this.clock.now()) / 1000),
          }
        : null,
      scores,
      lastResult: this.lastResult,
    };
  }

  private closeQuestion(): void {
    if (this.state !== "QUESTION_ACTIVE" || !this.instance || !this.liveId) {
      return;
    }

    const instance = this.instance;
    this.record("TIMER_EXPIRED", {
      questionInstanceId: instance.id,
      status: "applied",
    });

    const awards = this.answers
      .filter((answer) => answer.questionInstanceId === instance.id && answer.valid)
      .map((answer) => {
        const player = [...this.players.values()].find((item) => item.id === answer.playerId);
        const correct = instance.question.correctAnswers.some((expected) =>
          sameAnswer(answer.rawAnswer, expected, instance.question.answerKind),
        );
        const points = pointsForCorrectAnswer(instance.question.value, correct);

        this.scores.set(answer.playerId, (this.scores.get(answer.playerId) ?? 0) + points);

        return {
          playerId: answer.playerId,
          displayName: player?.displayName ?? answer.playerId,
          rawAnswer: answer.rawAnswer,
          correct,
          points,
          responseTimeMs: answer.responseTimeMs,
        };
      })
      .sort((left, right) => left.responseTimeMs - right.responseTimeMs);

    this.lastResult = {
      questionInstanceId: instance.id,
      prompt: instance.question.prompt,
      correctAnswer: instance.question.correctAnswers[0] ?? "",
      awards,
    };
    this.state = "QUESTION_RESULTS";
    this.record("QUESTION_CLOSED", {
      questionInstanceId: instance.id,
      status: "applied",
    });
  }

  private playerFor(input: CommentInput): PlayerRecord {
    const existing = this.players.get(input.externalId);

    if (existing) {
      return existing;
    }

    const player = {
      id: this.nextId("player"),
      externalId: input.externalId,
      displayName: input.displayName,
    };
    this.players.set(input.externalId, player);
    this.scores.set(player.id, 0);

    return player;
  }

  private record(
    eventType: EventType,
    input: {
      playerId?: string;
      questionInstanceId?: string;
      payload?: unknown;
      status: GameEvent["status"];
    },
  ): void {
    if (!this.liveId) {
      throw new Error("El LIVE no ha empezado");
    }

    this.events.record({
      eventId: this.nextId("event"),
      eventType,
      timestamp: new Date(this.clock.now()).toISOString(),
      liveId: this.liveId,
      questionInstanceId: input.questionInstanceId,
      playerId: input.playerId,
      payload: input.payload ?? {},
      status: input.status,
    });
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }
}
