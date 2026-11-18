import type { StudySet } from "../types/study";

interface PrintSheetProps {
  studySet: StudySet | null;
}

export function PrintSheet({ studySet }: PrintSheetProps) {
  if (!studySet) return null;

  return (
    <div className="hidden print:block bg-white text-slate-900 p-4 max-w-4xl mx-auto">
      <header className="pb-4 border-b border-slate-300 mb-6">
        <h1 className="text-2xl font-bold">{studySet.title}</h1>
        <p className="text-sm text-slate-600 mt-1">
          {studySet.subject} · {studySet.flashcards.length} Flashcards ·{" "}
          {studySet.quizQuestions.length} Exam Questions
        </p>
      </header>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Summary</h2>
        <p className="text-sm leading-relaxed mb-3">
          {studySet.summary.overview}
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {studySet.summary.keyTakeaways.map((point, idx) => (
            <li key={idx}>{point}</li>
          ))}
        </ul>
      </section>

      {studySet.summary.concepts.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Core Concepts</h2>
          <div className="space-y-2 text-sm">
            {studySet.summary.concepts.map((c, idx) => (
              <p key={idx}>
                <strong>{c.term}:</strong> {c.explanation}
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Flashcards</h2>
        <table className="w-full border-collapse border border-slate-300 text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 text-left px-3 py-2 w-1/2">
                Prompt
              </th>
              <th className="border border-slate-300 text-left px-3 py-2 w-1/2">
                Answer
              </th>
            </tr>
          </thead>
          <tbody>
            {studySet.flashcards.map((card) => (
              <tr key={card.id}>
                <td className="border border-slate-300 px-3 py-2 align-top">
                  {card.front}
                </td>
                <td className="border border-slate-300 px-3 py-2 align-top">
                  {card.back}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Practice Exam Questions</h2>
        <ol className="list-decimal pl-5 space-y-4 text-sm">
          {studySet.quizQuestions.map((q) => (
            <li key={q.id}>
              <p className="font-medium mb-1">{q.question}</p>
              {q.type === "mcq" && q.options.length > 0 && (
                <ul className="space-y-0.5 pl-4 text-slate-700">
                  {q.options.map((opt, idx) => (
                    <li key={idx}>
                      {String.fromCharCode(65 + idx)}. {opt}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="pt-4 border-t border-slate-300">
        <h2 className="text-base font-semibold mb-2">Answer Key</h2>
        <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-700">
          {studySet.quizQuestions.map((q) => (
            <li key={q.id}>
              <strong>{q.correctAnswer}</strong>
              {q.explanation ? ` — ${q.explanation}` : ""}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
