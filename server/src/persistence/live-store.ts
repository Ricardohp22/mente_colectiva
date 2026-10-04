import type pg from "pg";
import type { Question } from "../contracts/models.js";
import type { EngineExport, GameEngine } from "../engine/game-engine.js";

export interface StoredLiveAnswer {
  instanceId: string;
  displayName: string;
  rawAnswer: string;
  normalizedAnswer: string;
  valid: boolean;
  responseTimeMs: number;
}

export interface LiveReport {
  id: string;
  state: string;
  startedAt: Date;
  endedAt: Date | null;
  durationLimitSeconds: number;
  scores: Array<{ externalId: string; displayName: string; points: number }>;
  instances: Array<{ id: string; prompt: string; closedAt: Date | null }>;
  answers: StoredLiveAnswer[];
}

export class LiveStore {
  constructor(private readonly pool: pg.Pool) {}

  async save(engine: GameEngine, questions: readonly Question[]): Promise<void> {
    const state = engine.exportState();

    if (!state.liveId || state.startedAt === null) {
      throw new Error("El LIVE no ha empezado");
    }

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await this.ensureQuestions(client, questions);
      await this.saveLive(client, state);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async load(liveId: string): Promise<LiveReport | null> {
    const live = await this.pool.query<{
      id: string;
      state: string;
      started_at: Date;
      ended_at: Date | null;
      duration_limit_seconds: number;
    }>("SELECT id, state, started_at, ended_at, duration_limit_seconds FROM lives WHERE id = $1", [liveId]);
    const row = live.rows[0];

    if (!row) {
      return null;
    }

    const scores = await this.pool.query<{
      external_id: string;
      display_name: string;
      points: number;
    }>(
      `SELECT p.external_id, p.display_name, s.points
       FROM live_scores s
       JOIN players p ON p.external_id = s.player_external_id
       WHERE s.live_id = $1
       ORDER BY s.points DESC, p.display_name`,
      [liveId],
    );
    const instances = await this.pool.query<{ id: string; prompt: string; closed_at: Date | null }>(
      `SELECT qi.id, q.prompt, qi.closed_at
       FROM question_instances qi
       JOIN questions q ON q.id = qi.question_id
       WHERE qi.live_id = $1
       ORDER BY qi.opened_at`,
      [liveId],
    );
    const answers = await this.pool.query<{
      instance_id: string;
      display_name: string;
      raw_answer: string;
      normalized_answer: string;
      valid: boolean;
      response_time_ms: number;
    }>(
      `SELECT a.instance_id, p.display_name, a.raw_answer, a.normalized_answer, a.valid, a.response_time_ms
       FROM answers a
       JOIN players p ON p.external_id = a.player_external_id
       WHERE a.live_id = $1
       ORDER BY a.received_at`,
      [liveId],
    );

    return {
      id: row.id,
      state: row.state,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationLimitSeconds: row.duration_limit_seconds,
      scores: scores.rows.map((score) => ({
        externalId: score.external_id,
        displayName: score.display_name,
        points: score.points,
      })),
      instances: instances.rows.map((instance) => ({
        id: instance.id,
        prompt: instance.prompt,
        closedAt: instance.closed_at,
      })),
      answers: answers.rows.map((answer) => ({
        instanceId: answer.instance_id,
        displayName: answer.display_name,
        rawAnswer: answer.raw_answer,
        normalizedAnswer: answer.normalized_answer,
        valid: answer.valid,
        responseTimeMs: answer.response_time_ms,
      })),
    };
  }

  private async ensureQuestions(client: pg.PoolClient, questions: readonly Question[]): Promise<void> {
    for (const question of questions) {
      await client.query(
        `INSERT INTO questions (
           id, category, type, presentation, difficulty, prompt, value,
           initial_time_seconds, answer_kind, nightmare_question_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL)
         ON CONFLICT (id) DO UPDATE SET
           category = EXCLUDED.category,
           type = EXCLUDED.type,
           presentation = EXCLUDED.presentation,
           difficulty = EXCLUDED.difficulty,
           prompt = EXCLUDED.prompt,
           value = EXCLUDED.value,
           initial_time_seconds = EXCLUDED.initial_time_seconds,
           answer_kind = EXCLUDED.answer_kind`,
        [
          question.id,
          question.category,
          question.type,
          question.presentation,
          question.difficulty,
          question.prompt,
          question.value,
          question.initialTimeSeconds,
          question.answerKind,
        ],
      );
      await client.query("DELETE FROM question_answers WHERE question_id = $1", [question.id]);
      await client.query("DELETE FROM question_hints WHERE question_id = $1", [question.id]);

      for (const [position, answer] of question.correctAnswers.entries()) {
        await client.query(
          "INSERT INTO question_answers (question_id, position, answer) VALUES ($1, $2, $3)",
          [question.id, position, answer],
        );
      }

      for (const [position, hint] of question.hints.entries()) {
        await client.query(
          "INSERT INTO question_hints (question_id, position, body) VALUES ($1, $2, $3)",
          [question.id, position, hint],
        );
      }
    }

    for (const question of questions) {
      if (!question.nightmareQuestionId) {
        continue;
      }

      await client.query("UPDATE questions SET nightmare_question_id = $2 WHERE id = $1", [
        question.id,
        question.nightmareQuestionId,
      ]);
    }
  }

  private async saveLive(client: pg.PoolClient, state: EngineExport): Promise<void> {
    const liveId = state.liveId;

    if (!liveId || state.startedAt === null) {
      throw new Error("El LIVE no ha empezado");
    }

    const externalByPlayerId = new Map(state.players.map((player) => [player.id, player.externalId]));

    await client.query(
      `INSERT INTO lives (id, state, started_at, ended_at, duration_limit_seconds)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         state = EXCLUDED.state,
         ended_at = EXCLUDED.ended_at,
         duration_limit_seconds = EXCLUDED.duration_limit_seconds`,
      [
        liveId,
        state.state,
        new Date(state.startedAt),
        state.endedAt === null ? null : new Date(state.endedAt),
        state.durationLimitSeconds,
      ],
    );

    for (const player of state.players) {
      await client.query(
        `INSERT INTO players (external_id, display_name, created_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (external_id) DO UPDATE SET display_name = EXCLUDED.display_name`,
        [player.externalId, player.displayName, new Date(state.startedAt)],
      );
    }

    for (const instance of state.instances) {
      await client.query(
        `INSERT INTO question_instances (
           live_id, id, question_id, opened_at, closed_at, value, initial_time_seconds
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (live_id, id) DO UPDATE SET closed_at = EXCLUDED.closed_at`,
        [
          liveId,
          instance.id,
          instance.questionId,
          new Date(instance.openedAt),
          instance.closedAt === null ? null : new Date(instance.closedAt),
          instance.value,
          instance.initialTimeSeconds,
        ],
      );
    }

    for (const answer of state.answers) {
      const externalId = externalByPlayerId.get(answer.playerId);

      if (!externalId) {
        throw new Error(`No existe el jugador ${answer.playerId}`);
      }

      await client.query(
        `INSERT INTO answers (
           live_id, id, instance_id, player_external_id, raw_answer, normalized_answer,
           received_at, response_time_ms, valid
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (live_id, id) DO UPDATE SET valid = EXCLUDED.valid`,
        [
          liveId,
          answer.id,
          answer.questionInstanceId,
          externalId,
          answer.rawAnswer,
          answer.normalizedAnswer,
          new Date(answer.receivedAt),
          answer.responseTimeMs,
          answer.valid,
        ],
      );
    }

    for (const score of state.scores) {
      const externalId = externalByPlayerId.get(score.playerId);

      if (!externalId) {
        throw new Error(`No existe el jugador ${score.playerId}`);
      }

      await client.query(
        `INSERT INTO live_scores (live_id, player_external_id, points)
         VALUES ($1, $2, $3)
         ON CONFLICT (live_id, player_external_id) DO UPDATE SET points = EXCLUDED.points`,
        [liveId, externalId, score.points],
      );
    }

    for (const event of state.events) {
      await client.query(
        `INSERT INTO events (
           live_id, id, instance_id, player_external_id, event_type, payload, status, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (live_id, id) DO NOTHING`,
        [
          liveId,
          event.eventId,
          event.questionInstanceId ?? null,
          event.playerId ? (externalByPlayerId.get(event.playerId) ?? null) : null,
          event.eventType,
          event.payload,
          event.status,
          new Date(event.timestamp),
        ],
      );
    }
  }
}
