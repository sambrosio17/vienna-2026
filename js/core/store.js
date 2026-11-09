// localStorage with JSON values. In preview mode nothing is saved.
import { PREVIEW } from './config.js';

export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  // Returns false when the value could not be saved (quota, private mode).
  set(key, value) {
    if (PREVIEW) return true;
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
};
