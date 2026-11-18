import { Moon, Sun } from "lucide-react";
import type { AppView } from "../types/study";

interface TopBarProps {
  activeView: AppView;
  hasActiveSet: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onNavigate: (view: AppView) => void;
  onOpenPractice: () => void;
  onNewNote: () => void;
}

export function TopBar({
  activeView,
  hasActiveSet,
  theme,
  onToggleTheme,
  onNavigate,
  onOpenPractice,
  onNewNote,
}: TopBarProps) {
  return (
    <header className="print:hidden sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        <button
          type="button"
          onClick={() => onNavigate("capture")}
          className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 rounded-md px-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          SnapLearn
        </button>

        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-5 sm:gap-6 text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          <button
            type="button"
            onClick={() => onNavigate("capture")}
            className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 ${
              activeView === "capture"
                ? "border-blue-600 dark:border-blue-400 text-slate-900 dark:text-slate-100"
                : "border-transparent hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            Capture
          </button>
          <button
            type="button"
            onClick={() => onNavigate("library")}
            className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 ${
              activeView === "library"
                ? "border-blue-600 dark:border-blue-400 text-slate-900 dark:text-slate-100"
                : "border-transparent hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            Library
          </button>
          <button
            type="button"
            onClick={onOpenPractice}
            className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 ${
              activeView === "workspace" && hasActiveSet
                ? "border-blue-600 dark:border-blue-400 text-slate-900 dark:text-slate-100"
                : "border-transparent hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            Study
          </button>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onNewNote}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            New Note
          </button>
        </div>
      </div>
    </header>
  );
}
