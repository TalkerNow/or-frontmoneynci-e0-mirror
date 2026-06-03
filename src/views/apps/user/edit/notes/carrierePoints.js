import { resolveRegime } from "../simulatorRegimes";

/**
 * Parse les points de retraite par année issus de l'extraction RIS (n8n).
 *
 * Accepte les DEUX formes de `entry.points` :
 *   - OBJET (forme n8n actuelle) : { agirc_arrco: 168.02, cipav_base: 45.8, cipav_complementaire: 10, ircantec: …, rci: … }
 *   - TABLEAU (forme historique/défensive) : [{ regime: "AGIRC_ARRCO", valeur: 168.02 }, …]
 *
 * Bug d'origine (client COCHIN 1698) : l'ingestion testait `Array.isArray(points)`
 * et sautait tout quand `points` était un objet → aucun point inséré, et "trous"
 * visibles sur les années à revenu 0 (rien d'autre à afficher).
 *
 * CIPAV est routé à part (base / complémentaire). Tout autre régime est résolu via
 * le registre (`resolveRegime`) et agrégé par année.
 *
 * @param {Array<{annee:number, points:(object|Array)}>} carriereRaw
 * @returns {{ cipavBaseN: Object, cipavComplN: Object, regimePtsByYear: Object }}
 */
export function parseCarrierePoints(carriereRaw) {
  const cipavBaseN = {};
  const cipavComplN = {};
  const regimePtsByYear = {};

  if (!Array.isArray(carriereRaw)) {
    return { cipavBaseN, cipavComplN, regimePtsByYear };
  }

  const addPoint = (annee, regimeLabel, valeur) => {
    const pts = parseFloat(valeur) || 0;
    if (!annee || !pts) return;
    const lower = String(regimeLabel || "").toLowerCase();

    // CIPAV : cas particulier, split base / complémentaire, routé vers cnavplRows
    if (lower.includes("cipav")) {
      if (lower.includes("compl")) {
        cipavComplN[annee] = (cipavComplN[annee] || 0) + pts;
      } else {
        cipavBaseN[annee] = (cipavBaseN[annee] || 0) + pts;
      }
      return;
    }

    // Tout autre régime (connu ou non) → résolu via le registre, atterrit dans row.regimes
    const resolved = resolveRegime(regimeLabel);
    if (!resolved || !resolved.key) return;
    if (!regimePtsByYear[annee]) regimePtsByYear[annee] = {};
    regimePtsByYear[annee][resolved.key] = (regimePtsByYear[annee][resolved.key] || 0) + pts;
  };

  carriereRaw.forEach((entry) => {
    if (!entry) return;
    const { annee, points } = entry;
    if (!annee || !points) return;

    if (Array.isArray(points)) {
      // Forme tableau : [{ regime, valeur }]
      points.forEach((p) => {
        if (p && typeof p === "object") addPoint(annee, p.regime, p.valeur);
      });
    } else if (typeof points === "object") {
      // Forme objet n8n : { agirc_arrco: 168.02, cipav_base: 45.8, … }
      Object.entries(points).forEach(([regime, valeur]) => addPoint(annee, regime, valeur));
    }
  });

  return { cipavBaseN, cipavComplN, regimePtsByYear };
}
