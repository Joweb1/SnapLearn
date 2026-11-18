import type { StudySet } from "../types/study";

function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "study-notes"
  );
}

function escapeTabField(value: string): string {
  return value.replace(/\t/g, " ").replace(/\r?\n/g, "<br>");
}

function escapeCsvField(value: string): string {
  const normalized = value.replace(/\r?\n/g, " ");
  if (/[",]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToAnkiTxt(studySet: StudySet): void {
  const tag = studySet.subject
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "snaplearn";

  const header = [
    "#separator:tab",
    "#html:true",
    "#tags column:3",
  ];

  const rows = studySet.flashcards.map((card) => {
    const front = escapeTabField(card.front);
    const back = card.hint
      ? `${escapeTabField(card.back)}<br><br><small>Hint: ${escapeTabField(card.hint)}</small>`
      : escapeTabField(card.back);
    return `${front}\t${back}\t${tag}`;
  });

  const content = [...header, ...rows].join("\n");
  downloadBlob(content, `${sanitizeFilename(studySet.title)}-anki.txt`, "text/plain");
}

export function exportToQuizletCsv(studySet: StudySet): void {
  const rows = studySet.flashcards.map((card) => {
    return `${escapeCsvField(card.front)},${escapeCsvField(card.back)}`;
  });
  downloadBlob(rows.join("\n"), `${sanitizeFilename(studySet.title)}-quizlet.csv`, "text/csv");
}

export function buildMarkdownDocument(studySet: StudySet): string {
  const dateStr = new Date(studySet.createdAt).toISOString().split("T")[0];
  const lines: string[] = [
    "---",
    `title: "${studySet.title.replace(/"/g, '\\"')}"`,
    `subject: "${studySet.subject.replace(/"/g, '\\"')}"`,
    `date: ${dateStr}`,
    "tags: [study-notes, flashcards]",
    "---",
    "",
    `# ${studySet.title}`,
    "",
    `*Subject: ${studySet.subject} · ${studySet.flashcards.length} flashcards · ${studySet.quizQuestions.length} practice questions*`,
    "",
    "## Summary",
    "",
    studySet.summary.overview,
    "",
    "### Key Takeaways",
    "",
    ...studySet.summary.keyTakeaways.map((item) => `- ${item}`),
    "",
    "### Core Concepts & Formulas",
    "",
    ...studySet.summary.concepts.map((c) => `- **${c.term}**: ${c.explanation}`),
    "",
    "## Handwritten Note Transcript",
    "",
    studySet.transcript,
    "",
    "## Flashcards",
    "",
    ...studySet.flashcards.flatMap((card, idx) => [
      `### Card ${idx + 1}: ${card.front}`,
      `${card.back}`,
      card.hint ? `*Hint: ${card.hint}*` : "",
      "",
    ]),
    "## Practice Exam Questions",
    "",
    ...studySet.quizQuestions.flatMap((q, idx) => {
      const qLines = [`${idx + 1}. **${q.question}**`];
      if (q.type === "mcq" && q.options.length > 0) {
        q.options.forEach((opt, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx);
          qLines.push(`   - ${letter}. ${opt}`);
        });
      }
      qLines.push(`   - **Answer:** ${q.correctAnswer}`);
      if (q.explanation) {
        qLines.push(`   - **Why:** ${q.explanation}`);
      }
      qLines.push("");
      return qLines;
    }),
  ];

  return lines.join("\n");
}

export function exportToMarkdown(studySet: StudySet): void {
  const content = buildMarkdownDocument(studySet);
  downloadBlob(content, `${sanitizeFilename(studySet.title)}.md`, "text/markdown");
}

export function buildPlainTextForDocs(studySet: StudySet): string {
  const sections: string[] = [
    `${studySet.title.toUpperCase()}`,
    `Subject: ${studySet.subject}`,
    "",
    "OVERVIEW",
    studySet.summary.overview,
    "",
    "KEY TAKEAWAYS",
    ...studySet.summary.keyTakeaways.map((item, i) => `${i + 1}. ${item}`),
    "",
    "CORE CONCEPTS",
    ...studySet.summary.concepts.map((c) => `• ${c.term}: ${c.explanation}`),
    "",
    "FLASHCARDS",
    ...studySet.flashcards.map(
      (c, i) => `${i + 1}. Q: ${c.front}\n   A: ${c.back}`
    ),
    "",
    "PRACTICE QUESTIONS",
    ...studySet.quizQuestions.map((q, i) => {
      const opts =
        q.type === "mcq" && q.options.length > 0
          ? "\n" +
            q.options
              .map((o, oi) => `   ${String.fromCharCode(65 + oi)}) ${o}`)
              .join("\n")
          : "";
      return `${i + 1}. ${q.question}${opts}\n   Answer: ${q.correctAnswer}`;
    }),
  ];
  return sections.join("\n");
}

export async function copyStudySetToClipboard(studySet: StudySet): Promise<void> {
  const text = buildPlainTextForDocs(studySet);
  await navigator.clipboard.writeText(text);
}
