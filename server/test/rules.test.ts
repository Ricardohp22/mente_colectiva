import { describe, expect, it } from "vitest";
import { EVENT_TYPES, GAME_STATES } from "../src/contracts/index.js";
import {
  applyPlusFifteenToCurrentQuestion,
  applyPlusFifteenToCurrentQuestionTimes,
  classifyGift,
} from "../src/contracts/rules.js";

describe("contratos", () => {
  it("no repite estados ni tipos de evento", () => {
    expect(new Set(GAME_STATES).size).toBe(GAME_STATES.length);
    expect(new Set(EVENT_TYPES).size).toBe(EVENT_TYPES.length);
  });
});

describe("classifyGift", () => {
  it("manda de 1 a 29 monedas a la manecilla", () => {
    expect(classifyGift(1)).toBe("small");
    expect(classifyGift(10)).toBe("small");
    expect(classifyGift(29)).toBe("small");
  });

  it("separa apuestas y regalos grandes", () => {
    expect(classifyGift(30)).toBe("medium");
    expect(classifyGift(99)).toBe("medium");
    expect(classifyGift(100)).toBe("large");
    expect(classifyGift(44999)).toBe("large");
  });

  it("ignora valores que no son monedas enteras", () => {
    expect(classifyGift(0)).toBeNull();
    expect(classifyGift(-5)).toBeNull();
    expect(classifyGift(1.5)).toBeNull();
  });
});

describe("applyPlusFifteenToCurrentQuestion", () => {
  it("sube el reloj en curso hasta el cierre del minuto", () => {
    expect(applyPlusFifteenToCurrentQuestion(54)).toBe(60);
    expect(applyPlusFifteenToCurrentQuestion(59)).toBe(60);
    expect(applyPlusFifteenToCurrentQuestion(0)).toBe(15);
  });

  it("abre el siguiente tramo cuando el reloj ya está en un múltiplo de 60", () => {
    expect(applyPlusFifteenToCurrentQuestion(60)).toBe(75);
    expect(applyPlusFifteenToCurrentQuestion(119)).toBe(120);
    expect(applyPlusFifteenToCurrentQuestion(120)).toBe(135);
    expect(applyPlusFifteenToCurrentQuestion(180)).toBe(195);
  });

  it("recalcula el tope en cada activación", () => {
    expect(applyPlusFifteenToCurrentQuestionTimes(54, 2)).toBe(75);
  });
});
