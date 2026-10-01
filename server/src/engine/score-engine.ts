export function pointsForCorrectAnswer(questionValue: number, correct: boolean): number {
  if (!correct) {
    return 0;
  }

  return questionValue;
}
