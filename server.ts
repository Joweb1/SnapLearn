import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL_NAME = "gemini-4-hydrogen";

interface IncomingPage {
  mimeType: string;
  data: string;
}

interface AnalyzeNoteBody {
  pages?: IncomingPage[];
  rawText?: string;
  subjectHint?: string;
  examFocus?: string;
}

interface GradeAnswerBody {
  question?: string;
  expectedAnswer?: string;
  userAnswer?: string;
  noteContext?: string;
}

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please verify your API key in Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      if (status === 400 || status === 403 || status === 404) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delayMs = 600 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

function mapGeminiError(err: unknown): { status: number; message: string } {
  const errorObj = err as { status?: number; message?: string };
  const rawMessage = errorObj?.message || "Failed to process notes with Gemini.";
  const status = errorObj?.status || 500;

  if (status === 403 || rawMessage.includes("PERMISSION_DENIED")) {
    return {
      status: 403,
      message:
        "API key permission denied. Please check your Gemini API key in Settings > Secrets.",
    };
  }
  if (status === 400 && rawMessage.includes("API_KEY_INVALID")) {
    return {
      status: 400,
      message:
        "Invalid Gemini API key. Please check your API key in Settings > Secrets.",
    };
  }
  if (status === 429 || rawMessage.includes("RESOURCE_EXHAUSTED")) {
    return {
      status: 429,
      message:
        "Rate limit reached. Please wait a moment and try again.",
    };
  }
  return { status: status >= 400 && status < 600 ? status : 500, message: rawMessage };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "35mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/analyze-note", async (req, res) => {
    try {
      const body = (req.body || {}) as AnalyzeNoteBody;
      const pages = Array.isArray(body.pages) ? body.pages : [];
      const rawText = typeof body.rawText === "string" ? body.rawText.trim() : "";
      const subjectHint =
        typeof body.subjectHint === "string" ? body.subjectHint.trim() : "";
      const examFocus =
        typeof body.examFocus === "string" ? body.examFocus.trim() : "";

      if (pages.length === 0 && !rawText) {
        res.status(400).json({
          error: "Please snap or upload at least one note page, or paste note text.",
        });
        return;
      }

      const ai = createGeminiClient();

      const parts: Array<
        | { inlineData: { mimeType: string; data: string } }
        | { text: string }
      > = [];

      for (const page of pages) {
        if (page && typeof page.data === "string" && page.data.length > 0) {
          parts.push({
            inlineData: {
              mimeType: page.mimeType || "image/jpeg",
              data: page.data,
            },
          });
        }
      }

      const instructionLines = [
        "Analyze all attached note pages (including handwritten text, cursive, diagrams, arrows, equations, and margin callouts) and any provided text.",
        subjectHint ? `Subject context from user: ${subjectHint}.` : "",
        examFocus ? `Exam or study focus requested by user: ${examFocus}.` : "",
        "Deliver:",
        "1. A concise, clear title and subject label.",
        "2. A faithful, cleanly formatted Markdown transcription of the handwritten/printed notes (preserve equations, bullet hierarchy, and describe any hand-drawn diagrams in brackets).",
        "3. A structured summary with an executive overview, 4-7 concise key takeaways, and 4-8 core concepts/definitions/formulas.",
        "4. 8-12 active-recall flashcards (concise front prompt, clear back answer, and optional subtle hint).",
        "5. 6-8 exam practice questions mixing multiple-choice (4 distinct options, exact matching correctAnswer string) and short-answer questions (empty options array, clear rubric correctAnswer), each with a helpful explanation.",
      ]
        .filter(Boolean)
        .join("\n");

      parts.push({
        text: rawText
          ? `${instructionLines}\n\nAdditional typed/pasted notes:\n${rawText}`
          : instructionLines,
      });

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: { parts },
          config: {
            systemInstruction:
              "You are SnapLearn, an expert academic note transcriber, summarizer, and study coach. Read messy or neat handwriting carefully, fix obvious OCR ambiguity using domain context without inventing facts not supported by the notes, and produce crisp, high-yield study materials.",
            thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: "A concise 3-8 word title for these study notes.",
                },
                subject: {
                  type: Type.STRING,
                  description: "Short academic subject or course name.",
                },
                transcript: {
                  type: Type.STRING,
                  description:
                    "Clean Markdown transcription of all handwritten and printed text, equations, and labeled diagrams from the notes.",
                },
                summary: {
                  type: Type.OBJECT,
                  properties: {
                    overview: {
                      type: Type.STRING,
                      description: "2-3 sentence high-level synthesis of the notes.",
                    },
                    keyTakeaways: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "4 to 7 crisp takeaway bullet points.",
                    },
                    concepts: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          term: { type: Type.STRING },
                          explanation: { type: Type.STRING },
                        },
                        required: ["term", "explanation"],
                      },
                      description: "Key terms, formulas, or mechanisms explained simply.",
                    },
                  },
                  required: ["overview", "keyTakeaways", "concepts"],
                },
                flashcards: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      front: { type: Type.STRING },
                      back: { type: Type.STRING },
                      hint: { type: Type.STRING },
                    },
                    required: ["front", "back", "hint"],
                  },
                },
                quizQuestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: {
                        type: Type.STRING,
                        description: "Either 'mcq' or 'short_answer'.",
                      },
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description:
                          "Exactly 4 choices for 'mcq'; empty array [] for 'short_answer'.",
                      },
                      correctAnswer: {
                        type: Type.STRING,
                        description:
                          "Exact text of the correct option for 'mcq', or model answer rubric for 'short_answer'.",
                      },
                      explanation: {
                        type: Type.STRING,
                        description: "Clear explanation tied directly to the notes.",
                      },
                    },
                    required: [
                      "type",
                      "question",
                      "options",
                      "correctAnswer",
                      "explanation",
                    ],
                  },
                },
              },
              required: [
                "title",
                "subject",
                "transcript",
                "summary",
                "flashcards",
                "quizQuestions",
              ],
            },
          },
        })
      );

      const text = (response.text ?? "").trim();
      if (!text) {
        res.status(502).json({ error: "Empty response received from Gemini." });
        return;
      }

      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (err: unknown) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post("/api/grade-answer", async (req, res) => {
    try {
      const body = (req.body || {}) as GradeAnswerBody;
      const question = typeof body.question === "string" ? body.question.trim() : "";
      const expectedAnswer =
        typeof body.expectedAnswer === "string" ? body.expectedAnswer.trim() : "";
      const userAnswer =
        typeof body.userAnswer === "string" ? body.userAnswer.trim() : "";
      const noteContext =
        typeof body.noteContext === "string" ? body.noteContext.trim() : "";

      if (!question || !userAnswer) {
        res.status(400).json({ error: "Please write an answer before checking." });
        return;
      }

      const ai = createGeminiClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: [
            `Question: ${question}`,
            `Expected model answer: ${expectedAnswer}`,
            `Student answer: ${userAnswer}`,
            noteContext ? `Source note summary:\n${noteContext.slice(0, 3000)}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          config: {
            systemInstruction:
              "You are a fair, encouraging tutor grading a short-answer practice exam question. Score 0-100 based on conceptual accuracy (mark isCorrect true if score >= 70). Provide 1-2 crisp sentences of specific feedback.",
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isCorrect: { type: Type.BOOLEAN },
                score: { type: Type.INTEGER },
                feedback: { type: Type.STRING },
              },
              required: ["isCorrect", "score", "feedback"],
            },
          },
        })
      );

      const text = (response.text ?? "").trim();
      if (!text) {
        res.status(502).json({ error: "Empty grading response from Gemini." });
        return;
      }
      res.json(JSON.parse(text));
    } catch (err: unknown) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get("/{*splat}", (_req, res) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SnapLearn server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
