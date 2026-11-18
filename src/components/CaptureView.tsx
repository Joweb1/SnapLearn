import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Upload,
  FileText,
  X,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  BookOpen,
  Plus,
} from "lucide-react";
import type { CapturedPage } from "../types/study";
import {
  fileToCapturedPage,
  urlToCapturedPage,
  videoFrameToCapturedPage,
} from "../lib/imageUtils";

const SAMPLE_NOTE_IMAGE_PATH =
  "/src/assets/images/sample_handwritten_note_1794999885843.jpg";

interface CaptureViewProps {
  isAnalyzing: boolean;
  analysisStep: number;
  errorMessage: string | null;
  onClearError: () => void;
  onAnalyze: (payload: {
    pages: CapturedPage[];
    rawText: string;
    subjectHint: string;
    examFocus: string;
  }) => void;
}

const LOADING_STEPS = [
  "Reading handwritten & printed notes",
  "Structuring summary & core concepts",
  "Creating flashcards & practice exam",
];

export function CaptureView({
  isAnalyzing,
  analysisStep,
  errorMessage,
  onClearError,
  onAnalyze,
}: CaptureViewProps) {
  const [inputMode, setInputMode] = useState<"photos" | "text">("photos");
  const [pages, setPages] = useState<CapturedPage[]>([]);
  const [rawText, setRawText] = useState("");
  const [subjectHint, setSubjectHint] = useState("");
  const [examFocus, setExamFocus] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  // Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraFileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    setCameraError(null);
    setLocalError(null);
    onClearError();

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      // Fallback to native device camera file input
      cameraFileInputRef.current?.click();
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 50);
    } catch {
      setCameraError(
        "Camera preview unavailable in this browser context. You can upload a photo directly below."
      );
      cameraFileInputRef.current?.click();
    }
  };

  const handleToggleFacingMode = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startCamera(next);
  };

  const handleSnapFrame = async () => {
    if (!videoRef.current) return;
    try {
      const captured = await videoFrameToCapturedPage(
        videoRef.current,
        pages.length + 1
      );
      setPages((prev) => [...prev, captured]);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Could not capture camera frame."
      );
    }
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setLocalError(null);
    onClearError();

    const imageFiles = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/")
    );
    if (imageFiles.length === 0) {
      setLocalError("Please choose image files (PNG, JPG, or WebP).");
      return;
    }

    try {
      const processed = await Promise.all(
        imageFiles.map((file) => fileToCapturedPage(file))
      );
      setPages((prev) => [...prev, ...processed]);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to process selected images."
      );
    }
  };

  const handleLoadSampleNote = async () => {
    setLocalError(null);
    onClearError();
    setIsLoadingSample(true);
    try {
      const samplePage = await urlToCapturedPage(
        SAMPLE_NOTE_IMAGE_PATH,
        "Cellular Respiration Notes.jpg"
      );
      setInputMode("photos");
      setPages([samplePage]);
      if (!subjectHint) {
        setSubjectHint("Cellular Biology");
      }
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Unable to load sample note."
      );
    } finally {
      setIsLoadingSample(false);
    }
  };

  const movePage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const removePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    onClearError();

    if (pages.length === 0 && !rawText.trim()) {
      setLocalError(
        "Snap or upload at least one note page, or switch to Paste Text to enter notes."
      );
      return;
    }

    if (isCameraOpen) {
      stopCamera();
    }

    onAnalyze({
      pages,
      rawText: rawText.trim(),
      subjectHint: subjectHint.trim(),
      examFocus: examFocus.trim(),
    });
  };

  const activeError = errorMessage || localError;

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
          Snap your notes. Study in seconds.
        </h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          Photograph handwritten pages or upload class notes to get a clean
          transcript, structured summary, flashcards, and a practice exam.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8"
      >
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setInputMode("photos")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                inputMode === "photos"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Camera className="w-4 h-4" />
              Photos &amp; Camera
            </button>
            <button
              type="button"
              onClick={() => {
                if (isCameraOpen) stopCamera();
                setInputMode("text");
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                inputMode === "text"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <FileText className="w-4 h-4" />
              Paste Text
            </button>
          </div>

          {pages.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {pages.length} {pages.length === 1 ? "page" : "pages"} queued
            </span>
          )}
        </div>

        {inputMode === "photos" ? (
          <div>
            {isCameraOpen ? (
              <div className="mb-6 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="relative aspect-[4/3] w-full flex items-center justify-center bg-slate-950">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-white dark:bg-slate-900 px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Flip Camera
                  </button>

                  <button
                    type="button"
                    onClick={handleSnapFrame}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Camera className="w-4 h-4" />
                    Snap Page
                  </button>

                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  void handleFilesSelected(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  isDragging
                    ? "border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex flex-col items-center">
                  <p className="text-base font-medium text-slate-900 dark:text-slate-100">
                    Snap a notebook page or drop images here
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Supports handwritten notes, whiteboards, diagrams, and multi-page batches
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => void startCamera()}
                      disabled={isAnalyzing}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4" />
                      Take Photo
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isAnalyzing}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Photos
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleLoadSampleNote()}
                    disabled={isLoadingSample || isAnalyzing}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline disabled:opacity-50"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {isLoadingSample
                      ? "Loading sample handwritten note..."
                      : "Try with a sample handwritten notebook page"}
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void handleFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={cameraFileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    void handleFilesSelected(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
            )}

            {cameraError && (
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </p>
            )}

            {pages.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Note Pages (in reading order)
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add another page
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {pages.map((page, index) => (
                    <div
                      key={page.id}
                      className="group relative border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800"
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
                        <img
                          src={page.dataUrl}
                          alt={`Note page ${index + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="px-2.5 py-1.5 flex items-center justify-between bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-mono tabular-nums truncate">
                          Page {index + 1}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => movePage(index, -1)}
                            disabled={index === 0}
                            aria-label="Move page left"
                            className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => movePage(index, 1)}
                            disabled={index === pages.length - 1}
                            aria-label="Move page right"
                            className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removePage(page.id)}
                            aria-label="Remove page"
                            className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label
              htmlFor="raw-notes-input"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Paste or type lecture notes
            </label>
            <textarea
              id="raw-notes-input"
              rows={7}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste class notes, an outline, or textbook excerpts here..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-950 focus:border-blue-600 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            />
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="subject-hint"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Subject (optional)
            </label>
            <input
              id="subject-hint"
              type="text"
              value={subjectHint}
              onChange={(e) => setSubjectHint(e.target.value)}
              placeholder="e.g., Organic Chemistry, World History"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            />
          </div>
          <div>
            <label
              htmlFor="exam-focus"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Study focus (optional)
            </label>
            <input
              id="exam-focus"
              type="text"
              value={examFocus}
              onChange={(e) => setExamFocus(e.target.value)}
              placeholder="e.g., Midterm definitions, reaction mechanisms"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            />
          </div>
        </div>

        {activeError && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{activeError}</span>
          </div>
        )}

        {isAnalyzing ? (
          <div className="mt-6 rounded-xl border border-blue-200 dark:border-blue-900/70 bg-blue-50/60 dark:bg-blue-950/30 px-5 py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {LOADING_STEPS[analysisStep] || LOADING_STEPS[0]}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Step {Math.min(analysisStep + 1, LOADING_STEPS.length)} of{" "}
                  {LOADING_STEPS.length} · Usually takes a few seconds
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              Summarize &amp; Create Practice
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
