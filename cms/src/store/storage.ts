import type { StateStorage } from 'zustand/middleware';

/**
 * localStorage wrapper that never throws (private mode, quota exceeded …).
 * A full quota (e.g. many large image uploads) is reported via a window event
 * so the UI can show a friendly toast instead of silently losing data.
 */
export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('optika:storage-full', { detail: { name, err } }));
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};
