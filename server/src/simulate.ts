import type { LiveSnapshot } from "./engine/game-engine.js";
import { runDemoScenario } from "./adapters/simulator/demo.js";

const snapshot = runDemoScenario();
printSnapshot(snapshot);

function printSnapshot(snapshot: LiveSnapshot): void {
  const question = snapshot.question;
  const result = snapshot.lastResult;

  if (!question || !result) {
    throw new Error("La simulación no cerró la pregunta");
  }

  console.log(`LIVE ${snapshot.liveId}`);
  console.log(`Pregunta: ${question.prompt}`);
  console.log(`Categoría: ${question.category}`);
  console.log(`Valor: ${question.value} puntos`);
  console.log("");
  console.log(`Respuesta correcta: ${result.correctAnswer}`);
  console.log("");

  for (const award of result.awards) {
    const seconds = (award.responseTimeMs / 1000).toFixed(1);
    console.log(
      `${award.displayName}  (${award.rawAnswer})  ${seconds} s  ${award.points} puntos`,
    );
  }

  console.log("");
  console.log("Puntuación del LIVE");

  for (const score of snapshot.scores) {
    console.log(`${score.displayName}  ${score.points}`);
  }
}
