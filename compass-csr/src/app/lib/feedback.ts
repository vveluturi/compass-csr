import { useEffect, useState } from "react";

export type FeedbackType = "question" | "suggestion" | "feedback";
export type FeedbackStatus = "unread" | "read" | "resolved";

export interface FeedbackItem {
  id: string;
  programId: string | null;
  programName: string | null;
  type: FeedbackType;
  message: string;
  submittedBy: string;
  status: FeedbackStatus;
  adminReply: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

const FEEDBACK_KEY = "compass_feedback_v1";
const FEEDBACK_UPDATED_EVENT = "compass-feedback-updated";

// Shared across program-dashboard.tsx's Feedback tab and the Team Inbox page
// so the type/status color coding never drifts between the two surfaces.
export const FEEDBACK_TYPE_STYLES: Record<FeedbackType, string> = {
  question: "bg-blue-50 text-blue-700 border-blue-200",
  suggestion: "bg-amber-50 text-amber-700 border-amber-200",
  feedback: "bg-teal-50 text-teal-700 border-teal-200",
};

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  question: "Question",
  suggestion: "Suggestion",
  feedback: "Feedback",
};

export const FEEDBACK_TYPE_PLACEHOLDERS: Record<FeedbackType, string> = {
  question: "What would you like to know about this program?",
  suggestion: "What would you suggest improving or adding?",
  feedback: "Share your thoughts on how the program is going...",
};

export const FEEDBACK_STATUS_STYLES: Record<FeedbackStatus, string> = {
  unread: "bg-rose-50 text-rose-700 border-rose-200",
  read: "bg-muted text-muted-foreground border-border",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  unread: "Unread",
  read: "Read",
  resolved: "Resolved",
};

export function loadFeedback(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFeedback(items: FeedbackItem[]) {
  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(items));
  } catch {
    // quota exceeded — fail silently
  }
  // Notifies mounted components (sidebar badge, dashboard prompt) in the same
  // tab — the native "storage" event only fires for *other* tabs.
  window.dispatchEvent(new Event(FEEDBACK_UPDATED_EVENT));
}

export function addFeedback(fields: {
  programId: string | null;
  programName: string | null;
  type: FeedbackType;
  message: string;
  submittedBy: string;
}): FeedbackItem {
  const newItem: FeedbackItem = {
    id: crypto.randomUUID(),
    programId: fields.programId,
    programName: fields.programName,
    type: fields.type,
    message: fields.message,
    submittedBy: fields.submittedBy,
    status: "unread",
    adminReply: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  saveFeedback([...loadFeedback(), newItem]);
  return newItem;
}

export function updateFeedback(id: string, patch: Partial<FeedbackItem>) {
  saveFeedback(loadFeedback().map((f) => (f.id === id ? { ...f, ...patch } : f)));
}

export function deleteFeedback(id: string) {
  saveFeedback(loadFeedback().filter((f) => f.id !== id));
}

export function markFeedbackRead(id: string) {
  const current = loadFeedback().find((f) => f.id === id);
  if (current && current.status === "unread") {
    updateFeedback(id, { status: "read" });
  }
}

export function resolveFeedback(id: string) {
  updateFeedback(id, { status: "resolved", resolvedAt: new Date().toISOString() });
}

export function replyToFeedback(id: string, reply: string) {
  updateFeedback(id, { adminReply: reply, status: "read" });
}

export function unreadFeedbackCount(): number {
  return loadFeedback().filter((f) => f.status === "unread").length;
}

// Reactive unread count — stays in sync across the sidebar badge and the
// dashboard notification without needing a shared React context.
export function useUnreadFeedbackCount(): number {
  const [count, setCount] = useState(() => unreadFeedbackCount());

  useEffect(() => {
    function handleUpdate() {
      setCount(unreadFeedbackCount());
    }
    window.addEventListener(FEEDBACK_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(FEEDBACK_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return count;
}
