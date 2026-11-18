import { useMemo, useState } from "react";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import type { StudySet } from "../types/study";

interface LibraryViewProps {
  studySets: StudySet[];
  onOpenSet: (id: string) => void;
  onDeleteSet: (id: string) => void;
  onNewNote: () => void;
}

export function LibraryView({
  studySets,
  onOpenSet,
  onDeleteSet,
  onNewNote,
}: LibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const subjects = useMemo(() => {
    const unique = Array.from(
      new Set(studySets.map((s) => s.subject.trim()).filter(Boolean))
    );
    return ["All", ...unique];
  }, [studySets]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return studySets.filter((set) => {
      const matchesSubject =
        selectedSubject === "All" || set.subject === selectedSubject;
      const matchesQuery =
        !q ||
        set.title.toLowerCase().includes(q) ||
        set.subject.toLowerCase().includes(q) ||
        set.summary.overview.toLowerCase().includes(q);
      return matchesSubject && matchesQuery;
    });
  }, [studySets, searchQuery, selectedSubject]);

  return (
    <section className="print:hidden max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Study Library
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            All snapped notes, summaries, and practice decks saved in your browser.
          </p>
        </div>

        <button
          type="button"
          onClick={onNewNote}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Snap New Note
        </button>
      </div>

      {studySets.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes or subjects..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          {subjects.length > 2 && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => setSelectedSubject(subject)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    selectedSubject === subject
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {studySets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-base font-medium text-slate-900 dark:text-slate-100">
            No saved study notes yet
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Snap a photo of your handwritten notebook or upload a lecture slide
            to build your first study deck.
          </p>
          <button
            type="button"
            onClick={onNewNote}
            className="mt-5 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
          >
            Snap Your First Note
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-sm text-slate-600 dark:text-slate-400">
          No study sets match your current search or filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((set) => {
            const firstPage = set.pages[0];
            const mastered = set.flashcards.filter(
              (c) => c.status === "mastered"
            ).length;
            const dateStr = new Date(set.updatedAt).toLocaleDateString(
              undefined,
              { month: "short", day: "numeric" }
            );

            return (
              <div
                key={set.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onOpenSet(set.id)}
                  className="w-20 h-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400"
                >
                  {firstPage ? (
                    <img
                      src={firstPage.dataUrl}
                      alt={set.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenSet(set.id)}
                    className="text-left w-full focus-visible:outline-none focus-visible:underline"
                  >
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {set.title}
                    </h2>
                  </button>

                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>{set.subject}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {mastered}/{set.flashcards.length} mastered
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {set.quizQuestions.length} quiz
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{dateStr}</span>
                  </div>

                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {set.summary.overview}
                  </p>
                </div>

                <div className="shrink-0">
                  {confirmDeleteId === set.id ? (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteSet(set.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(set.id)}
                      aria-label={`Delete ${set.title}`}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
