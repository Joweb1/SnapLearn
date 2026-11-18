import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Check,
  Download,
  Eye,
  EyeOff,
  FileText,
  Pencil,
  Printer,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type {
  FlashcardStatus,
  QuizQuestion,
  StudySet,
  WorkspaceTab,
} from "../types/study";
import {
  copyStudySetToClipboard,
  exportToAnkiTxt,
  exportToMarkdown,
  exportToQuizletCsv,
} from "../lib/exporters";
import { FlashcardsDeck } from "./FlashcardsDeck";
import { ExamQuiz } from "./ExamQuiz";

interface StudyWorkspaceProps {
  studySet: StudySet;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onBackToLibrary: () => void;
  onUpdateStudySet: (updated: StudySet) => void;
}

export function StudyWorkspace({
  studySet,
  activeTab,
  onTabChange,
  onBackToLibrary,
  onUpdateStudySet,
}: StudyWorkspaceProps) {
  const [showOriginalDrawer, setShowOriginalDrawer] = useState(false);
  const [selectedPageIdx, setSelectedPageIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(studySet.title);

  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState(studySet.transcript);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTitleDraft(studySet.title);
    setTranscriptDraft(studySet.transcript);
    setSelectedPageIdx(0);
    setIsEditingTitle(false);
    setIsEditingTranscript(false);
  }, [studySet.id, studySet.title, studySet.transcript]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const flashNotice = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 2600);
  };

  const handleSaveTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== studySet.title) {
      onUpdateStudySet({
        ...studySet,
        title: trimmed,
        updatedAt: Date.now(),
      });
    } else {
      setTitleDraft(studySet.title);
    }
    setIsEditingTitle(false);
  };

  const handleSaveTranscript = () => {
    onUpdateStudySet({
      ...studySet,
      transcript: transcriptDraft,
      updatedAt: Date.now(),
    });
    setIsEditingTranscript(false);
  };

  const handleUpdateCardStatus = (cardId: string, status: FlashcardStatus) => {
    onUpdateStudySet({
      ...studySet,
      updatedAt: Date.now(),
      flashcards: studySet.flashcards.map((c) =>
        c.id === cardId ? { ...c, status } : c
      ),
    });
  };

  const handleUpdateQuestion = (
    questionId: string,
    patch: Partial<QuizQuestion>
  ) => {
    onUpdateStudySet({
      ...studySet,
      updatedAt: Date.now(),
      quizQuestions: studySet.quizQuestions.map((q) =>
        q.id === questionId ? { ...q, ...patch } : q
      ),
    });
  };

  const handleResetQuiz = () => {
    onUpdateStudySet({
      ...studySet,
      updatedAt: Date.now(),
      quizQuestions: studySet.quizQuestions.map((q) => ({
        ...q,
        userAnswer: undefined,
        isCorrect: undefined,
        aiScore: undefined,
        aiFeedback: undefined,
      })),
    });
  };

  const handleCopyTranscript = async () => {
    await navigator.clipboard.writeText(studySet.transcript);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const dateLabel = new Date(studySet.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const hasPages = studySet.pages.length > 0;
  const activePage = studySet.pages[selectedPageIdx] || studySet.pages[0];

  return (
    <section className="print:hidden max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Workspace Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBackToLibrary}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Study Notes
          </button>

          {isEditingTitle ? (
            <div className="flex items-center gap-2 max-w-xl">
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") {
                    setTitleDraft(studySet.title);
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="flex-1 text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-blue-600 dark:border-blue-400 rounded-lg px-3 py-1 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                {studySet.title}
              </h1>
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                aria-label="Rename study note"
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{studySet.subject}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {studySet.pages.length > 0
                ? `${studySet.pages.length} ${studySet.pages.length === 1 ? "page" : "pages"}`
                : "Typed note"}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {studySet.flashcards.length} flashcards
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {studySet.quizQuestions.length} questions
            </span>
            <span aria-hidden="true">·</span>
            <span>{dateLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {exportNotice && (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {exportNotice}
            </span>
          )}

          {hasPages && (
            <button
              type="button"
              onClick={() => setShowOriginalDrawer((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                showOriginalDrawer
                  ? "bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {showOriginalDrawer ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              Original Note
            </button>
          )}

          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setIsExportOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className="w-4 h-4" />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1.5 z-40">
                <button
                  type="button"
                  onClick={() => {
                    exportToAnkiTxt(studySet);
                    setIsExportOpen(false);
                    flashNotice("Anki deck downloaded");
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Anki Deck (.txt)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tab-separated import with tags
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportToQuizletCsv(studySet);
                    setIsExportOpen(false);
                    flashNotice("Quizlet CSV downloaded");
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Quizlet Set (.csv)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ready for Quizlet import
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportToMarkdown(studySet);
                    setIsExportOpen(false);
                    flashNotice("Markdown file downloaded");
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Notion / Obsidian (.md)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Summary, transcript, cards &amp; quiz
                  </p>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await copyStudySetToClipboard(studySet);
                    setIsExportOpen(false);
                    flashNotice("Copied for Google Docs");
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Copy for Google Docs
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Copies full formatted study guide
                  </p>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                <button
                  type="button"
                  onClick={() => {
                    setIsExportOpen(false);
                    setTimeout(() => window.print(), 80);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5"
                >
                  <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      Print / Save as PDF
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Clean printable study sheet
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto py-4">
        <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {(
            [
              { id: "summary", label: "Summary" },
              { id: "transcript", label: "Handwritten Text" },
              {
                id: "flashcards",
                label: `Flashcards (${studySet.flashcards.length})`,
              },
              {
                id: "quiz",
                label: `Exam Quiz (${studySet.quizQuestions.length})`,
              },
            ] as Array<{ id: WorkspaceTab; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content + Optional Original Note Split */}
      <div
        className={`mt-2 grid gap-6 items-start ${
          showOriginalDrawer && hasPages
            ? "grid-cols-1 lg:grid-cols-12"
            : "grid-cols-1"
        }`}
      >
        <div
          className={
            showOriginalDrawer && hasPages ? "lg:col-span-7" : "col-span-1"
          }
        >
          {activeTab === "summary" && (
            <div className="space-y-8">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Overview
                </h2>
                <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
                  {studySet.summary.overview}
                </p>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Key Takeaways
                  </h2>
                  <ol className="space-y-3">
                    {studySet.summary.keyTakeaways.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex items-baseline gap-3 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed"
                      >
                        <span className="font-mono text-xs font-medium text-blue-600 dark:text-blue-400 tabular-nums shrink-0">
                          {String(idx + 1).padStart(2, "0")}.
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {studySet.summary.concepts.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Core Concepts &amp; Formulas
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {studySet.summary.concepts.map((concept, idx) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"
                      >
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {concept.term}
                        </h3>
                        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {concept.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "transcript" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Recognized Note Text
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyTranscript()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    {copiedTranscript ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedTranscript ? "Copied" : "Copy Text"}
                  </button>

                  {isEditingTranscript ? (
                    <button
                      type="button"
                      onClick={handleSaveTranscript}
                      className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
                    >
                      Save Edits
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingTranscript(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit Text
                    </button>
                  )}
                </div>
              </div>

              {isEditingTranscript ? (
                <textarea
                  rows={16}
                  value={transcriptDraft}
                  onChange={(e) => setTranscriptDraft(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 text-sm font-mono text-slate-800 dark:text-slate-200 leading-relaxed focus:bg-white dark:focus:bg-slate-950 focus:border-blue-600 dark:focus:border-blue-400 focus:outline-none"
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                  {studySet.transcript}
                </div>
              )}
            </div>
          )}

          {activeTab === "flashcards" && (
            <FlashcardsDeck
              cards={studySet.flashcards}
              onUpdateCardStatus={handleUpdateCardStatus}
            />
          )}

          {activeTab === "quiz" && (
            <ExamQuiz
              questions={studySet.quizQuestions}
              noteContext={studySet.transcript || studySet.summary.overview}
              onUpdateQuestion={handleUpdateQuestion}
              onResetQuiz={handleResetQuiz}
            />
          )}
        </div>

        {/* Collapsible Original Note Drawer */}
        {showOriginalDrawer && hasPages && activePage && (
          <aside className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden lg:sticky lg:top-24">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                Original Page {selectedPageIdx + 1} of {studySet.pages.length}
              </span>

              <div className="flex items-center gap-2">
                {studySet.pages.length > 1 && (
                  <div className="flex items-center gap-1">
                    {studySet.pages.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPageIdx(idx)}
                        className={`px-2 py-1 text-xs font-mono tabular-nums rounded ${
                          idx === selectedPageIdx
                            ? "bg-blue-600 dark:bg-blue-500 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsZoomed((prev) => !prev)}
                  aria-label={isZoomed ? "Zoom out" : "Zoom in"}
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                >
                  {isZoomed ? (
                    <ZoomOut className="w-4 h-4" />
                  ) : (
                    <ZoomIn className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto bg-slate-100 dark:bg-slate-950 p-3">
              <img
                src={activePage.dataUrl}
                alt={activePage.name}
                referrerPolicy="no-referrer"
                className={`rounded-lg border border-slate-200 dark:border-slate-800 transition-transform duration-200 ${
                  isZoomed ? "w-[160%] max-w-none" : "w-full h-auto"
                }`}
              />
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
