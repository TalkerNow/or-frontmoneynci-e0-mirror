/**
 * simulatorRegimes.js
 * Registry of French pension régimes with display metadata,
 * plus pure helpers used by the simulator UI.
 */

// ---------------------------------------------------------------------------
// Task 1: normalize
// ---------------------------------------------------------------------------

export function normalize(s) {
  if (s == null) return "";
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s\-_]/g, "")
    .trim();
}
