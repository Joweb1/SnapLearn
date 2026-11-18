import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  Shuffle,
  Lightbulb,
} from "lucide-react";
import type { Flashcard, FlashcardStatus } from "../types/study";

interface FlashcardsDeckProps {
  cards: Flashcard[];
  onUpdateCardStatus: (cardId: string, status: FlashcardStatus) => void;
}

export function FlashcardsDeck({
  cards,
  onUpdateCardStatus,
}: FlashcardsDeckProps) {
  const [filter, setFilter] = useState<"all" | "review">("all");
  const [orderSeed, setOrderSeed] = useState<string[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const visibleCards = useMemo(() => {
    const base =
      filter === "review"
        ? cards.filter((c) => c.status !== "mastered")
        : cards;

    if (!orderSeed) return base;
    const rank = new Map(orderSeed.map((id, idx) => [id, idx]));
    return [...base].sort(
      (a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999)
    );
  }, [cards, filter, orderSeed]);

  const safeIndex =
    visibleCards.length === 0
      ? 0
      : Math.min(currentIndex, visibleCards.length - 1);
  const currentCard = visibleCards[safeIndex];

  const masteredCount = cards.filter((c) => c.status === "mastered").length;
  const reviewCount = cards.filter((c) => c.status === "review").length;

  const goToIndex = (nextIdx: number) => {
    if (visibleCards.length === 0) return;
    const clamped =
      (nextIdx + visibleCards.length) % visibleCards.length;
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex(clamped);
  };

  const handleMarkStatus = (status: FlashcardStatus) => {
    if (!currentCard) return;
    onUpdateCardStatus(currentCard.id, status);
    if (safeIndex < visibleCards.length - 1) {
      goToIndex(safeIndex + 1);
    } else {
      setIsFlipped(false);
      setShowHint(false);
    }
  };

  const handleShuffle = () => {
    const ids = cards.map((c) => c.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setOrderSeed(ids);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToIndex(safeIndex + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToIndex(safeIndex - 1);
      } else if (e.key === "1" && currentCard) {
        handleMarkStatus("review");
      } else if (e.key === "2" && currentCard) {
        handleMarkStatus("mastered");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (cards.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-sm text-slate-600 dark:text-slate-400">
        No flashcards were generated for this study set.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              All ({cards.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter("review");
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === "review"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              To Review ({cards.length - masteredCount})
            </button>
          </div>

          <button
            type="button"
            onClick={handleShuffle}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Shuffle
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          <span>{masteredCount} mastered</span>
          <span aria-hidden="true">·</span>
          <span>{reviewCount} flagged</span>
        </div>
      </div>

      {visibleCards.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
          <p className="text-base font-medium text-slate-900 dark:text-slate-100">
            All cards marked as mastered
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Switch back to All Cards to review the full deck anytime.
          </p>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
          >
            Show All Cards
          </button>
        </div>
      ) : (
        <>
          <div className="perspective-1000">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsFlipped((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setIsFlipped((prev) => !prev);
                }
              }}
              aria-label={isFlipped ? "Flashcard answer side. Click to flip." : "Flashcard question side. Click to flip."}
              className={`relative w-full min-h-[280px] sm:min-h-[320px] cursor-pointer preserve-3d transition-transform duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 rounded-2xl ${
                isFlipped ? "rotate-y-180" : ""
              }`}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Prompt</span>
                  <span className="font-mono tabular-nums">
                    {String(safeIndex + 1).padStart(2, "0")} /{" "}
                    {String(visibleCards.length).padStart(2, "0")}
                  </span>
                </div>

                <div className="my-auto py-4 text-center">
                  <p className="text-xl sm:text-2xl font-medium text-slate-900 dark:text-slate-100 leading-snug">
                    {currentCard.front}
                  </p>
                  {showHint && currentCard.hint && (
                    <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 inline-block">
                      Hint: {currentCard.hint}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  {currentCard.hint ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint((prev) => !prev);
                      }}
                      className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      {showHint ? "Hide hint" : "Show hint"}
                    </button>
                  ) : (
                    <span />
                  )}
                  <span>Click or press Space to flip</span>
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-blue-700 dark:text-blue-400 font-medium">
                    Answer
                  </span>
                  <span className="font-mono tabular-nums">
                    {String(safeIndex + 1).padStart(2, "0")} /{" "}
                    {String(visibleCards.length).padStart(2, "0")}
                  </span>
                </div>

                <div className="my-auto py-4 text-center">
                  <p className="text-lg sm:text-xl text-slate-900 dark:text-slate-100 leading-relaxed">
                    {currentCard.back}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Status:{" "}
                    {currentCard.status === "mastered"
                      ? "Got it"
                      : currentCard.status === "review"
                        ? "Needs review"
                        : "Unseen"}
                  </span>
                  <span>Click or press Space to flip</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMarkStatus("review")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  currentCard.status === "review"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                Needs Review
              </button>
              <button
                type="button"
                onClick={() => handleMarkStatus("mastered")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  currentCard.status === "mastered"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Check className="w-4 h-4" />
                Got It
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToIndex(safeIndex - 1)}
                aria-label="Previous card"
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <button
                type="button"
                onClick={() => goToIndex(safeIndex + 1)}
                aria-label="Next card"
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
            Shortcuts: Space to flip · Left/Right arrows to move · 1 for Review · 2 for Got It
          </p>
        </>
      )}
    </div>
  );
}
