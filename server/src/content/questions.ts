import type { Question } from "../contracts/models.js";

export const demoQuestions: Question[] = [
  {
    id: "q-francia",
    category: "Cultura general",
    type: "geografia",
    presentation: "text",
    difficulty: 1,
    prompt: "¿Cuál es la capital de Francia?",
    value: 10,
    initialTimeSeconds: 20,
    answerKind: "TEXT",
    correctAnswers: ["París"],
    hints: ["Está en Europa"],
    nightmareQuestionId: null,
  },
  {
    id: "q-siete",
    category: "Matemáticas",
    type: "aritmetica",
    presentation: "text",
    difficulty: 1,
    prompt: "¿Cuánto es 6 por 7?",
    value: 5,
    initialTimeSeconds: 15,
    answerKind: "INTEGER",
    correctAnswers: ["42"],
    hints: [],
    nightmareQuestionId: null,
  },
];
