import type { ReadingStatus } from "./types";

export interface PostDraft {
  title: string;
  author: string;
  comment: string;
  status: ReadingStatus;
  rating: number;
  imageUrl: string;
}

const DRAFT_STORAGE_KEY = "library-sky-draft";

/**
 * Save post form draft to localStorage
 */
export function saveDraft(draft: PostDraft): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn("[draft-storage] Failed to save draft:", error);
  }
}

/**
 * Load post form draft from localStorage
 */
export function loadDraft(): PostDraft | null {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as PostDraft;
  } catch (error) {
    console.warn("[draft-storage] Failed to load draft:", error);
    return null;
  }
}

/**
 * Clear post form draft from localStorage
 */
export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    console.warn("[draft-storage] Failed to clear draft:", error);
  }
}
