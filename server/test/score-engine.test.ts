import { describe, expect, it } from "vitest";
import { pointsForCorrectAnswer } from "../src/engine/score-engine.js";

describe("pointsForCorrectAnswer", () => {
  it("da el valor de la pregunta a quien acierta y cero a quien falla", () => {
    expect(pointsForCorrectAnswer(10, true)).toBe(10);
    expect(pointsForCorrectAnswer(10, false)).toBe(0);
  });
});
