export interface CapturedPage {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  base64: string;
  width?: number;
  height?: number;
}

export interface ConceptItem {
  term: string;
  explanation: string;
}

export interface SummaryData {
  overview: string;
  keyTakeaways: string[];
  concepts: ConceptItem[];
}

export type FlashcardStatus = "unseen" | "review" | "mastered";

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint: string;
  status: FlashcardStatus;
}

export type QuizQuestionType = "mcq" | "short_answer";

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  userAnswer?: string;
  isCorrect?: boolean;
  aiScore?: number;
  aiFeedback?: string;
}

export interface StudySet {
  id: string;
  title: string;
  subject: string;
  createdAt: number;
  updatedAt: number;
  pages: Array<{
    id: string;
    name: string;
    dataUrl: string;
  }>;
  transcript: string;
  summary: SummaryData;
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
}

export type AppView = "capture" | "library" | "workspace";
export type WorkspaceTab = "summary" | "transcript" | "flashcards" | "quiz";
