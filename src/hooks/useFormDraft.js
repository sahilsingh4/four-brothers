import { useState, useEffect } from "react";

// Persist an in-progress form draft to localStorage so refreshing,
// accidental close, or idle logout doesn't wipe unsaved work.
// Returns [draft, setDraft, wasRestored, clearDraft].
// `enabled` lets callers skip persistence (e.g. when editing an existing
// record, since the server has the source of truth there).
export const FORM_DRAFT_PREFIX = "fbt:draft:";

export const useFormDraft = (key, initialValue, enabled = true) => {
  const storageKey = FORM_DRAFT_PREFIX + key;
  const [wasRestored, setWasRestored] = useState(false);
  const [draft, setDraft] = useState(() => {
    if (!enabled) return initialValue;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // flip wasRestored after render so effects can react
        queueMicrotask(() => setWasRestored(true));
        return parsed;
      }
    } catch { /* noop: private mode / quota exceeded */ }
    return initialValue;
  });
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(draft)); }
      catch { /* noop */ }
    }, 500);
    return () => clearTimeout(t);
  }, [draft, enabled, storageKey]);
  const clearDraft = () => {
    try { localStorage.removeItem(storageKey); } catch { /* noop */ }
    setWasRestored(false);
  };
  return [draft, setDraft, wasRestored, clearDraft];
};
