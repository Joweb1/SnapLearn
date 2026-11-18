import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, RotateCcw } from "lucide-react";
import type { QuizQuestion } from "../types/study";

interface ExamQuizProps {
  questions: QuizQuestion[];
  noteContext: string;
  onUpdateQuestion: (questionId: string, patch: Partial<QuizQuestion>) => void;
  onResetQuiz: () => void;
}

export function ExamQuiz({
  questions,
  noteContext,
  onUpdateQuestion,
  onResetQuiz,
}: ExamQuizProps) {
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [revealedModelIds, setRevealedModelIds] = useState<Record<string, boolean>>({});
  const [gradeError, setGradeError] = useState<string | null>(null);

  const answeredQuestions = questions.filter(
    (q) => q.userAnswer !== undefined && q.userAnswer !== ""
  );
  const correctCount = questions.filter((q) => q.isCorrect === true).length;
  const accuracyPct =
    answeredQuestions.length > 0
      ? Math.round((correctCount / answeredQuestions.length) * 100)
      : 0;

  const handleSelectMcq = (question: QuizQuestion, option: string) => {
    const isCorrect =
      option.trim().toLowerCase() ===
      question.correctAnswer.trim().toLowerCase();
    onUpdateQuestion(question.id, {
      userAnswer: option,
      isCorrect,
    });
  };

  const handleCheckShortAnswer = async (question: QuizQuestion) => {
    const draft = (draftAnswers[question.id] ?? question.userAnswer ?? "").trim();
    if (!draft) return;

    setGradeError(null);
    setGradingId(question.id);
    try {
      const response = await fetch("/api/grade-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.question,
          expectedAnswer: question.correctAnswer,
          userAnswer: draft,
          noteContext,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to check answer right now.");
      }

      onUpdateQuestion(question.id, {
        userAnswer: draft,
        isCorrect: Boolean(data.isCorrect),
        aiScore: typeof data.score === "number" ? data.score : undefined,
        aiFeedback: typeof data.feedback === "string" ? data.feedback : "",
      });
    } catch (err) {
      setGradeError(
        err instanceof Error ? err.message : "Failed to grade short answer."
      );
    } finally {
      setGradingId(null);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-600 dark:text-slate-400">
        No exam questions were generated for this study set.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5">
        <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 font-mono tabular-nums">
          <span>
            Answered {answeredQuestions.length} of {questions.length}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Score {answeredQuestions.length > 0 ? `${accuracyPct}%` : "--"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setDraftAnswers({});
            setRevealedModelIds({});
            setGradeError(null);
            onResetQuiz();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Quiz
        </button>
      </div>

      {gradeError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {gradeError}
        </div>
      )}

      <div className="space-y-5">
        {questions.map((q, index) => {
          const isMcq = q.type === "mcq" && q.options.length > 0;
          const hasAnswered = q.userAnswer !== undefined && q.userAnswer !== "";

          return (
            <div
              key={q.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-mono tabular-nums">
                  Question {index + 1}
                </span>
                <span aria-hidden="true">·</span>
                <span>{isMcq ? "Multiple Choice" : "Short Answer"}</span>
              </div>

              <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 leading-snug mb-4">
                {q.question}
              </h3>

              {isMcq ? (
                <div className="space-y-2">
                  {q.options.map((option, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    const isSelected = q.userAnswer === option;
                    const isRightOption =
                      option.trim().toLowerCase() ===
                      q.correctAnswer.trim().toLowerCase();

                    let optionStyle =
                      "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200";
                    if (hasAnswered) {
                      if (isRightOption) {
                        optionStyle =
                          "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200";
                      } else if (isSelected && !isRightOption) {
                        optionStyle =
                          "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-950 dark:text-red-200";
                      } else {
                        optionStyle =
                          "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-500";
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectMcq(q, option)}
                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors flex items-center justify-between gap-3 ${optionStyle}`}
                      >
                        <span className="flex items-baseline gap-3">
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0">
                            {letter}.
                          </span>
                          <span>{option}</span>
                        </span>

                        {hasAnswered && isRightOption && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                            Correct
                          </span>
                        )}
                        {hasAnswered && isSelected && !isRightOption && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 shrink-0">
                            <XCircle className="w-4 h-4" />
                            Incorrect
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <textarea
                    rows={3}
                    value={draftAnswers[q.id] ?? q.userAnswer ?? ""}
                    onChange={(e) =>
                      setDraftAnswers((prev) => ({
                        ...prev,
                        [q.id]: e.target.value,
                      }))
                    }
                    placeholder="Write your answer in 1-3 sentences..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-950 focus:border-blue-600 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedModelIds((prev) => ({
                          ...prev,
                          [q.id]: !prev[q.id],
                        }))
                      }
                      className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      {revealedModelIds[q.id]
                        ? "Hide model answer"
                        : "Show model answer"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        gradingId === q.id ||
                        !(draftAnswers[q.id] ?? q.userAnswer ?? "").trim()
                      }
                      onClick={() => void handleCheckShortAnswer(q)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {gradingId === q.id && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      Check Answer
                    </button>
                  </div>

                  {q.aiFeedback && (
                    <div
                      className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                        q.isCorrect
                          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200"
                          : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200"
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium text-xs mb-1">
                        <span className="inline-flex items-center gap-1.5">
                          {q.isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                          )}
                          {q.isCorrect ? "Strong answer" : "Needs refinement"}
                        </span>
                        {q.aiScore !== undefined && (
                          <span className="font-mono tabular-nums">
                            {q.aiScore}/100
                          </span>
                        )}
                      </div>
                      <p>{q.aiFeedback}</p>
                    </div>
                  )}

                  {revealedModelIds[q.id] && (
                    <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        Model answer:{" "}
                      </span>
                      {q.correctAnswer}
                    </div>
                  )}
                </div>
              )}

              {hasAnswered && q.explanation && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    Explanation:{" "}
                  </span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
