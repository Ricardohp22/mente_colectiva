export type GiftTier = "small" | "medium" | "large";

/**
 * 1–29 monedas alimentan la manecilla.
 * 30–99 son una apuesta.
 * 100 o más abren la decisión del regalo grande.
 */
export function classifyGift(coins: number): GiftTier | null {
  if (!Number.isInteger(coins) || coins < 1) {
    return null;
  }

  if (coins <= 29) {
    return "small";
  }

  if (coins <= 99) {
    return "medium";
  }

  return "large";
}

/**
 * Tope del +15 sobre el reloj que está corriendo.
 * 0–59 solo puede llegar a 60, 60–119 a 120, 120–179 a 180, y así.
 */
export function currentQuestionTimeCap(remainingSeconds: number): number {
  return (Math.floor(remainingSeconds / 60) + 1) * 60;
}

/**
 * El +15 modifica la pregunta en curso. Cada activación se aplica sola
 * y el tope se vuelve a calcular con el tiempo ya actualizado.
 */
export function applyPlusFifteenToCurrentQuestion(remainingSeconds: number): number {
  return Math.min(remainingSeconds + 15, currentQuestionTimeCap(remainingSeconds));
}

export function applyPlusFifteenToCurrentQuestionTimes(
  remainingSeconds: number,
  times: number,
): number {
  let remaining = remainingSeconds;
  const activations = Math.max(0, Math.floor(times));

  for (let index = 0; index < activations; index += 1) {
    remaining = applyPlusFifteenToCurrentQuestion(remaining);
  }

  return remaining;
}
