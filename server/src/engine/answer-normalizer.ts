import type { AnswerKind } from "../contracts/models.js";

const PARENTHETICAL = /\(([^()]*)\)/g;
const TEXT_PUNCTUATION = /[.,;:!?¿¡"'`´]/g;

export interface NormalizedAnswer {
  normalized: string;
  comparable: string | null;
}

export function extractLastParenthetical(comment: string): string | null {
  const matches = [...comment.matchAll(PARENTHETICAL)];
  const last = matches.at(-1);

  if (!last) {
    return null;
  }

  const raw = last[1] ?? "";

  if (raw.trim() === "") {
    return null;
  }

  return raw;
}

export function normalizeAnswer(raw: string, kind: AnswerKind): NormalizedAnswer {
  if (kind === "INTEGER") {
    return normalizeInteger(raw);
  }

  if (kind === "DECIMAL") {
    return normalizeDecimal(raw);
  }

  if (kind === "DATE") {
    return normalizeDate(raw);
  }

  const normalized = normalizeText(raw);

  return {
    normalized,
    comparable: normalized === "" ? null : normalized,
  };
}

export function sameAnswer(left: string, right: string, kind: AnswerKind): boolean {
  const normalizedLeft = normalizeAnswer(left, kind).comparable;
  const normalizedRight = normalizeAnswer(right, kind).comparable;

  return normalizedLeft !== null && normalizedLeft === normalizedRight;
}

function normalizeText(raw: string): string {
  return raw
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(TEXT_PUNCTUATION, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeInteger(raw: string): NormalizedAnswer {
  const trimmed = raw.trim();

  if (!/^-?\d+(?:\.0+)?$/.test(trimmed)) {
    return { normalized: trimmed, comparable: null };
  }

  const canonical = String(Number(trimmed));

  return { normalized: canonical, comparable: canonical };
}

function normalizeDecimal(raw: string): NormalizedAnswer {
  const trimmed = raw.trim();

  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return { normalized: trimmed, comparable: null };
  }

  const canonical = String(Number(trimmed));

  return { normalized: canonical, comparable: canonical };
}

function normalizeDate(raw: string): NormalizedAnswer {
  const trimmed = raw.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (!match) {
    return { normalized: trimmed, comparable: null };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return {
    normalized: trimmed,
    comparable: valid ? trimmed : null,
  };
}
