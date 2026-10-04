import { afterAll, beforeAll, expect, it } from "vitest";
import { demoQuestions } from "../src/content/questions.js";
import { manualClock } from "../src/engine/clock.js";
import { GameEngine } from "../src/engine/game-engine.js";
import { LiveStore } from "../src/persistence/live-store.js";
import { createPool, ensureDatabase, migrate } from "../src/persistence/migrate.js";

const pool = createPool();
const store = new LiveStore(pool);

beforeAll(async () => {
  await ensureDatabase();
  await migrate(pool);
  await migrate(pool);
  await pool.query(`
    TRUNCATE TABLE
      events,
      answers,
      live_scores,
      question_instances,
      lives,
      question_hints,
      question_answers,
      questions,
      players
    CASCADE
  `);
});

afterAll(async () => {
  await pool.end();
});

it("guarda un LIVE de dos preguntas y lo vuelve a leer", async () => {
  const clock = manualClock(1_700_000_000_000);
  const engine = new GameEngine(clock, demoQuestions);

  engine.startLive("live-db");
  engine.openNextQuestion();
  clock.advance(3_000);
  engine.receiveComment({ externalId: "ana", displayName: "Ana", text: "(Madrid)" });
  await store.save(engine, demoQuestions);
  clock.advance(5_000);
  engine.receiveComment({ externalId: "ana", displayName: "Ana", text: "(París)" });
  clock.advance(2_000);
  engine.receiveComment({ externalId: "luis", displayName: "Luis", text: "(Lyon)" });
  clock.advance(1_000);
  engine.receiveComment({ externalId: "pedro", displayName: "Pedro", text: "sin paréntesis" });
  clock.advance(20_000);
  engine.sync();

  engine.openNextQuestion();
  clock.advance(1_000);
  engine.receiveComment({ externalId: "ana", displayName: "Ana", text: "(42)" });
  clock.advance(15_000);
  engine.sync();
  engine.finishLive();
  engine.receiveComment({ externalId: "ana", displayName: "Ana", text: "(París)" });
  await store.save(engine, demoQuestions);

  const report = await store.load("live-db");

  expect(report).toMatchObject({
    id: "live-db",
    state: "LIVE_FINISHED",
    durationLimitSeconds: 3600,
  });
  expect(report?.endedAt).not.toBeNull();
  expect(report?.scores).toEqual([
    { externalId: "ana", displayName: "Ana", points: 15 },
    { externalId: "luis", displayName: "Luis", points: 0 },
  ]);
  expect(report?.instances.map((instance) => instance.id)).toEqual(["q-francia-A", "q-siete-A"]);
  expect(report?.answers).toEqual([
    expect.objectContaining({
      displayName: "Ana",
      rawAnswer: "Madrid",
      normalizedAnswer: "madrid",
      valid: false,
    }),
    expect.objectContaining({
      displayName: "Ana",
      rawAnswer: "París",
      normalizedAnswer: "paris",
      valid: true,
      responseTimeMs: 8_000,
    }),
    expect.objectContaining({
      displayName: "Luis",
      rawAnswer: "Lyon",
      normalizedAnswer: "lyon",
      valid: true,
    }),
    expect.objectContaining({
      displayName: "Ana",
      rawAnswer: "42",
      normalizedAnswer: "42",
      valid: true,
      instanceId: "q-siete-A",
    }),
  ]);
});
