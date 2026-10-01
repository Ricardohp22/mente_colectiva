import { describe, expect, it } from "vitest";
import { demoQuestions } from "../src/content/questions.js";
import { runDemoScenario } from "../src/adapters/simulator/demo.js";
import { manualClock } from "../src/engine/clock.js";
import { GameEngine } from "../src/engine/game-engine.js";
import type { Question } from "../src/contracts/models.js";

function engineWith(questions: readonly Question[] = demoQuestions) {
  const clock = manualClock(0);
  const engine = new GameEngine(clock, questions);
  engine.startLive();
  return { clock, engine };
}

describe("GameEngine", () => {
  it("cuenta solo la última respuesta y da los mismos puntos sin mirar el tiempo", () => {
    const { clock, engine } = engineWith();
    engine.openNextQuestion();

    clock.advance(1_000);
    engine.receiveComment({ externalId: "ana", displayName: "Ana", text: "(Madrid)" });
    clock.advance(7_000);
    engine.receiveComment({ externalId: "ana", displayName: "Ana", text: "(París)" });
    clock.advance(1_000);
    engine.receiveComment({ externalId: "sofia", displayName: "Sofía", text: "(PARIS)" });
    clock.advance(20_000);
    engine.sync();

    const result = engine.snapshot().lastResult;
    const ana = result?.awards.find((award) => award.displayName === "Ana");
    const sofia = result?.awards.find((award) => award.displayName === "Sofía");

    expect(ana).toMatchObject({ rawAnswer: "París", correct: true, points: 10, responseTimeMs: 8_000 });
    expect(sofia).toMatchObject({ correct: true, points: 10, responseTimeMs: 9_000 });
    expect(engine.listAnswers().filter((answer) => answer.valid)).toHaveLength(2);
  });

  it("una corrección final incorrecta anula el acierto anterior", () => {
    const { clock, engine } = engineWith();
    engine.openNextQuestion();

    clock.advance(2_000);
    engine.receiveComment({ externalId: "luis", displayName: "Luis", text: "(París)" });
    clock.advance(2_000);
    engine.receiveComment({ externalId: "luis", displayName: "Luis", text: "(Lyon)" });
    clock.advance(20_000);
    engine.sync();

    expect(engine.snapshot().lastResult?.awards[0]).toMatchObject({
      rawAnswer: "Lyon",
      correct: false,
      points: 0,
    });
  });

  it("congela el resultado cuando la pregunta ya cerró", () => {
    const snapshot = runDemoScenario();

    expect(snapshot.state).toBe("QUESTION_RESULTS");
    expect(snapshot.lastResult?.correctAnswer).toBe("París");
    expect(snapshot.lastResult?.awards).toEqual([
      expect.objectContaining({ displayName: "Sofía", points: 10, responseTimeMs: 4_000 }),
      expect.objectContaining({ displayName: "Ana", points: 10, responseTimeMs: 8_000 }),
      expect.objectContaining({ displayName: "Luis", rawAnswer: "Lyon", points: 0 }),
    ]);
    expect(snapshot.scores.map((score) => [score.displayName, score.points])).toEqual([
      ["Ana", 10],
      ["Sofía", 10],
      ["Luis", 0],
    ]);
    expect(snapshot.scores.some((score) => score.displayName === "Pedro")).toBe(false);
  });

  it("no deja que una respuesta de la pregunta anterior modifique la nueva", () => {
    const { clock, engine } = engineWith();
    engine.openNextQuestion();
    const firstInstanceId = engine.snapshot().question?.instanceId;

    clock.advance(20_000);
    engine.sync();
    engine.openNextQuestion();
    clock.advance(1_000);
    engine.receiveComment({
      externalId: "ana",
      displayName: "Ana",
      text: "(París)",
      questionInstanceId: firstInstanceId,
    });
    engine.receiveComment({ externalId: "ana", displayName: "Ana", text: "(42)" });
    clock.advance(15_000);
    engine.sync();

    expect(engine.listEvents().some((event) => event.status === "obsolete")).toBe(true);
    expect(engine.snapshot().scores).toEqual([
      expect.objectContaining({ displayName: "Ana", points: 5 }),
    ]);
    expect(engine.snapshot().lastResult?.questionInstanceId).toBe("q-siete-A");
  });

  it("evalúa un entero canónico", () => {
    const { clock, engine } = engineWith();
    engine.openNextQuestion();
    clock.advance(20_000);
    engine.sync();
    engine.openNextQuestion();
    clock.advance(500);
    engine.receiveComment({ externalId: "ana", displayName: "Ana", text: "(42.000)" });
    clock.advance(15_000);
    engine.sync();

    expect(engine.snapshot().lastResult?.awards[0]).toMatchObject({
      correct: true,
      points: 5,
    });
  });
});
