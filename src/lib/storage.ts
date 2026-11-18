import type { StudySet } from "../types/study";

const DB_NAME = "snaplearn-study-db";
const DB_VERSION = 1;
const STORE_NAME = "study_sets";
const FALLBACK_KEY = "snaplearn_study_sets_v1";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

function readFallback(): StudySet[] {
  try {
    const raw = window.localStorage.getItem(FALLBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallback(items: StudySet[]): void {
  try {
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors in fallback mode
  }
}

export async function getAllStudySets(): Promise<StudySet[]> {
  try {
    const db = await openDatabase();
    return await new Promise<StudySet[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as StudySet[]) || [];
        items.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return readFallback().sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export async function saveStudySet(studySet: StudySet): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(studySet);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const current = readFallback().filter((item) => item.id !== studySet.id);
    writeFallback([studySet, ...current]);
  }
}

export async function deleteStudySet(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const current = readFallback().filter((item) => item.id !== id);
    writeFallback(current);
  }
}
