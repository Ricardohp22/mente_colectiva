import { demoQuestions } from "../../content/questions.js";
import { manualClock } from "../../engine/clock.js";
import { GameEngine, type LiveSnapshot } from "../../engine/game-engine.js";

export function runDemoScenario(): LiveSnapshot {
  const clock = manualClock(0);
  const engine = new GameEngine(clock, demoQuestions);

  engine.startLive("live-demo");
  engine.openNextQuestion();

  const steps = [
    { at: 3_000, externalId: "ana", displayName: "Ana", text: "(Madrid)" },
    { at: 4_000, externalId: "sofia", displayName: "Sofía", text: "(paris)" },
    { at: 8_000, externalId: "ana", displayName: "Ana", text: "(París)" },
    { at: 9_000, externalId: "pedro", displayName: "Pedro", text: "yo sé pero sin paréntesis" },
    { at: 11_000, externalId: "luis", displayName: "Luis", text: "(París)" },
    { at: 14_000, externalId: "luis", displayName: "Luis", text: "(Lyon)" },
  ];

  let elapsed = 0;

  for (const step of steps) {
    clock.advance(step.at - elapsed);
    elapsed = step.at;
    engine.receiveComment(step);
  }

  clock.advance(20_000 - elapsed);
  engine.sync();
  engine.receiveComment({ externalId: "ana", displayName: "Ana", text: "(París)" });

  return engine.snapshot();
}
