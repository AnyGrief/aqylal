export interface MatchingPair {
  id: string;
  left: string;
  right: string;
  correct: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface Question {
  id: string;
  question: string;
  question_type: "quiz" | "true_false" | "pin_answer" | "matching";
  options: string[] | MatchingPair[];
  correct_answers: string | string[] | MatchingPair[] | null;
  timer: number;
  points: number;
  image?: string | null;
  correct_position?: Position;
  option_colors?: string[];
}

export interface AssignmentFormData {
  title: string;
  type: string;
  description?: string;
  subject: string;
  subjects: string[];
  grade: string;
  gradeLetter: string;
  dueDate: string;
  timeLimit: string;
  customTimeLimit: string;
  questions: Question[];
}

export const TIME_LIMIT_OPTIONS = [
  "Без ограничения",
  "5 минут",
  "10 минут",
  "20 минут",
  "30 минут",
  "40 минут",
  "50 минут",
  "60 минут",
  "Другое",
] as const;

export const QUESTION_TYPES = {
  quiz: "Викторина",
  true_false: "Истина/Ложь",
  pin_answer: "Закрепите ответ",
  matching: "Сопоставление",
} as const;

export const TIMER_OPTIONS = [5, 10, 20, 30, 60] as const;
export const POINTS_OPTIONS = [500, 1000, 1500, 2000] as const;

export const BUTTON_COLORS = [
  "#E21B3C",
  "#1368CE",
  "#D89E00",
  "#26890C",
  "#0AA3A3",
  "#864CBF",
  "#E29E3C",
  "#3CB371",
];

export const validateQuestions = (questions: Question[]): string | null => {
  if (!questions.length) return "Добавьте хотя бы один вопрос.";

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.question?.trim()) return `Вопрос ${i + 1}: Текст вопроса обязателен.`;

    switch (q.question_type) {
      case "quiz":
        const quizOptions = q.options as string[];
        if (quizOptions.length < 4 || quizOptions.length > 8) return `Вопрос ${i + 1}: Количество вариантов должно быть от 4 до 8 (сейчас ${quizOptions.length}).`;
        if (!quizOptions.some(opt => opt.trim())) return `Вопрос ${i + 1}: Добавьте хотя бы один непустой вариант ответа.`;
        if (!Array.isArray(q.correct_answers) || (q.correct_answers as string[]).length === 0) return `Вопрос ${i + 1}: Укажите хотя бы один правильный ответ.`;
        if (q.option_colors && q.option_colors.length !== quizOptions.length) return `Вопрос ${i + 1}: Количество цветов (${q.option_colors.length}) должно соответствовать количеству вариантов (${quizOptions.length}).`;
        break;

      case "true_false":
        const tfOptions = q.options as string[];
        if (tfOptions.length !== 2 || tfOptions[0] !== "Верно" || tfOptions[1] !== "Неверно") return `Вопрос ${i + 1}: Варианты должны быть "Верно" и "Неверно".`;
        if (!q.correct_answers || !["Верно", "Неверно"].includes(q.correct_answers as string)) return `Вопрос ${i + 1}: Ответ должен быть "Верно" или "Неверно" (сейчас ${q.correct_answers}).`;
        break;

      case "pin_answer":
        if (!q.image) return `Вопрос ${i + 1}: Изображение обязательно.`;
        if (!q.correct_position || typeof q.correct_position.x !== "number" || typeof q.correct_position.y !== "number") return `Вопрос ${i + 1}: Укажите корректные координаты (x, y).`;
        break;

      case "matching":
        const pairs = q.options as MatchingPair[];
        if (pairs.length < 2) return `Вопрос ${i + 1}: Минимум 2 пары (сейчас ${pairs.length}).`;
        if (pairs.some(p => !p.left?.trim() || !p.right?.trim())) return `Вопрос ${i + 1}: Все пары должны быть заполнены.`;
        if (!Array.isArray(q.correct_answers) || (q.correct_answers as MatchingPair[]).length === 0) return `Вопрос ${i + 1}: Укажите хотя бы одну правильную пару.`;
        break;

      default:
        return `Вопрос ${i + 1}: Неизвестный тип вопроса "${q.question_type}".`;
    }
  }

  return null;
};

export const validateForm = (formData: AssignmentFormData): string | null => {
  const { title, type, subject, grade, gradeLetter, dueDate, timeLimit, customTimeLimit, questions } = formData;
  if (!title?.trim()) return "Название задания обязательно.";
  if (!type) return "Тип задания обязателен.";
  if (!subject) return "Предмет обязателен.";
  if (!grade) return "Класс обязателен.";
  if (!gradeLetter || !/^[А-ЯA-Z]$/.test(gradeLetter)) return "Литера класса — одна заглавная буква.";
  if (!dueDate) return "Дата сдачи обязательна.";
  if (timeLimit === "Другое" && (!customTimeLimit || +customTimeLimit <= 0)) return "Укажите корректный лимит времени.";
  if (questions.length === 0) return "Добавьте хотя бы один вопрос.";
  return null;
};

export const formatTimeLimit = (timeLimit: string, customTimeLimit: string): string => {
  if (timeLimit === "Без ограничения") return "00:00:00";
  const minutes = timeLimit === "Другое" ? +customTimeLimit : +timeLimit.split(" ")[0];
  return `00:${String(minutes).padStart(2, "0")}:00`;
};