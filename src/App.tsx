import { useEffect, useState } from "react";
import type {
  AppView,
  CapturedPage,
  StudySet,
  WorkspaceTab,
} from "./types/study";
import {
  deleteStudySet,
  getAllStudySets,
  saveStudySet,
} from "./lib/storage";
import { generateId } from "./lib/imageUtils";
import { TopBar } from "./components/TopBar";
import { CaptureView } from "./components/CaptureView";
import { LibraryView } from "./components/LibraryView";
import { StudyWorkspace } from "./components/StudyWorkspace";
import { PrintSheet } from "./components/PrintSheet";

interface ApiAnalyzeResponse {
  title: string;
  subject: string;
  transcript: string;
  summary: {
    overview: string;
    keyTakeaways: string[];
    concepts: Array<{ term: string; explanation: string }>;
  };
  flashcards: Array<{ front: string; back: string; hint: string }>;
  quizQuestions: Array<{
    type: "mcq" | "short_answer";
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }>;
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    }
    return "light";
  });
  const [view, setView] = useState<AppView>("capture");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("summary");
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      window.localStorage.setItem("snaplearn-theme", theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    let active = true;
    getAllStudySets()
      .then((sets) => {
        if (!active) return;
        setStudySets(sets);
        if (sets.length > 0) {
          setActiveSetId(sets[0].id);
        }
      })
      .catch(() => {
        // Ignore initial storage read failure
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisStep(0);
      return;
    }
    const timer1 = setTimeout(() => setAnalysisStep(1), 1600);
    const timer2 = setTimeout(() => setAnalysisStep(2), 3400);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isAnalyzing]);

  const activeSet =
    studySets.find((item) => item.id === activeSetId) ?? null;

  const handleAnalyze = async (payload: {
    pages: CapturedPage[];
    rawText: string;
    subjectHint: string;
    examFocus: string;
  }) => {
    setErrorMessage(null);
    setIsAnalyzing(true);
    setAnalysisStep(0);

    try {
      const response = await fetch("/api/analyze-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: payload.pages.map((p) => ({
            mimeType: p.mimeType,
            data: p.base64,
          })),
          rawText: payload.rawText,
          subjectHint: payload.subjectHint,
          examFocus: payload.examFocus,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to analyze your notes. Please try again."
        );
      }

      const parsed = data as ApiAnalyzeResponse;
      const now = Date.now();
      const newSet: StudySet = {
        id: generateId("set"),
        title: parsed.title || "Untitled Study Notes",
        subject: parsed.subject || payload.subjectHint || "General Studies",
        createdAt: now,
        updatedAt: now,
        pages: payload.pages.map((p) => ({
          id: p.id,
          name: p.name,
          dataUrl: p.dataUrl,
        })),
        transcript: parsed.transcript || payload.rawText,
        summary: {
          overview: parsed.summary?.overview || "",
          keyTakeaways: Array.isArray(parsed.summary?.keyTakeaways)
            ? parsed.summary.keyTakeaways
            : [],
          concepts: Array.isArray(parsed.summary?.concepts)
            ? parsed.summary.concepts
            : [],
        },
        flashcards: (parsed.flashcards || []).map((card) => ({
          id: generateId("card"),
          front: card.front,
          back: card.back,
          hint: card.hint || "",
          status: "unseen",
        })),
        quizQuestions: (parsed.quizQuestions || []).map((q) => ({
          id: generateId("q"),
          type: q.type === "short_answer" ? "short_answer" : "mcq",
          question: q.question,
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || "",
        })),
      };

      await saveStudySet(newSet);
      setStudySets((prev) => [newSet, ...prev]);
      setActiveSetId(newSet.id);
      setWorkspaceTab("summary");
      setView("workspace");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong while analyzing your notes."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateStudySet = async (updated: StudySet) => {
    setStudySets((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    await saveStudySet(updated);
  };

  const handleDeleteStudySet = async (id: string) => {
    await deleteStudySet(id);
    setStudySets((prev) => {
      const remaining = prev.filter((item) => item.id !== id);
      if (activeSetId === id) {
        setActiveSetId(remaining[0]?.id ?? null);
        if (view === "workspace") {
          setView(remaining.length > 0 ? "library" : "capture");
        }
      }
      return remaining;
    });
  };

  const handleOpenPractice = () => {
    if (activeSet) {
      setView("workspace");
    } else if (studySets.length > 0) {
      setActiveSetId(studySets[0].id);
      setView("workspace");
    } else {
      setView("capture");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <TopBar
        activeView={view}
        hasActiveSet={Boolean(activeSet)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onNavigate={setView}
        onOpenPractice={handleOpenPractice}
        onNewNote={() => {
          setErrorMessage(null);
          setView("capture");
        }}
      />

      <main className="flex-1">
        {view === "capture" && (
          <CaptureView
            isAnalyzing={isAnalyzing}
            analysisStep={analysisStep}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
            onAnalyze={(payload) => void handleAnalyze(payload)}
          />
        )}

        {view === "library" && (
          <LibraryView
            studySets={studySets}
            onOpenSet={(id) => {
              setActiveSetId(id);
              setWorkspaceTab("summary");
              setView("workspace");
            }}
            onDeleteSet={(id) => void handleDeleteStudySet(id)}
            onNewNote={() => setView("capture")}
          />
        )}

        {view === "workspace" && activeSet && (
          <StudyWorkspace
            studySet={activeSet}
            activeTab={workspaceTab}
            onTabChange={setWorkspaceTab}
            onBackToLibrary={() => setView("library")}
            onUpdateStudySet={(updated) => void handleUpdateStudySet(updated)}
          />
        )}

        {view === "workspace" && !activeSet && (
          <CaptureView
            isAnalyzing={isAnalyzing}
            analysisStep={analysisStep}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
            onAnalyze={(payload) => void handleAnalyze(payload)}
          />
        )}
      </main>

      <PrintSheet studySet={activeSet} />
    </div>
  );
}
