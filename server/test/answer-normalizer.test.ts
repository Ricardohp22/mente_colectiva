import { describe, expect, it } from "vitest";
import {
  extractLastParenthetical,
  normalizeAnswer,
  sameAnswer,
} from "../src/engine/answer-normalizer.js";

describe("extractLastParenthetical", () => {
  it("se queda con la última respuesta entre paréntesis", () => {
    expect(extractLastParenthetical("(A) (B) (C)")).toBe("C");
  });

  it("ignora un comentario sin paréntesis o vacío", () => {
    expect(extractLastParenthetical("yo sé la respuesta")).toBeNull();
    expect(extractLastParenthetical("()")).toBeNull();
    expect(extractLastParenthetical("( )")).toBeNull();
  });
});

describe("normalizeAnswer", () => {
  it("iguala mayúsculas, espacios y acentos", () => {
    expect(sameAnswer("  París  ", "paris", "TEXT")).toBe(true);
    expect(normalizeAnswer("  San   Luis  ", "TEXT").normalized).toBe("san luis");
  });

  it("acepta 1.5 y 1.000, y rechaza 1,5", () => {
    expect(sameAnswer("1.5", "1.50", "DECIMAL")).toBe(true);
    expect(sameAnswer("1,5", "1.5", "DECIMAL")).toBe(false);
    expect(sameAnswer("1.000", "1", "INTEGER")).toBe(true);
    expect(sameAnswer("1.5", "1", "INTEGER")).toBe(false);
  });

  it("solo acepta fechas de calendario reales", () => {
    expect(sameAnswer("2026-01-02", "2026-01-02", "DATE")).toBe(true);
    expect(normalizeAnswer("2026-02-31", "DATE").comparable).toBeNull();
  });
});
