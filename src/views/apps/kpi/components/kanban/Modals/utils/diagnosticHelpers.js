/**
 * Utilitaires pour la gestion du diagnostic
 */

export const getLatestDiagnostic = (userDetails) => {
  const list =
    userDetails?.simulator_difficulty_results ||
    userDetails?.simulatorDifficultyResults ||
    [];
  if (!Array.isArray(list) || list.length === 0) return null;

  const sorted = [...list].sort((a, b) => {
    const aDate = new Date(
      a?.created_at || a?.createdAt || a?.date || 0,
    ).getTime();
    const bDate = new Date(
      b?.created_at || b?.createdAt || b?.date || 0,
    ).getTime();
    if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
      return bDate - aDate;
    }
    return (b?.id || 0) - (a?.id || 0);
  });

  return sorted[0] || list[list.length - 1];
};

export const getDiagnosticAttributes = (raw) => {
  let attrs = raw?.attributes || raw;
  if (typeof attrs === "string") {
    try {
      attrs = JSON.parse(attrs);
    } catch (e) {
      attrs = {};
    }
  }
  return attrs || {};
};
