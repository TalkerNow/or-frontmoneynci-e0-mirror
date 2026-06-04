/**
 * recapCarriere.js
 * Fonction pure : transforme `carriereRows` (état du simulateur) en un récap
 * carrière par régime, prêt pour l'affichage lecture seule.
 *
 * Aucune dépendance React, aucune source externe : tout est dérivé des lignes
 * carrière déjà en mémoire. Voir spec :
 * docs/superpowers/specs/2026-06-03-recap-carriere-par-regime-design.md
 */

import { REGIMES } from "../simulatorRegimes";

// Régimes couverts par le récap, dans l'ordre d'affichage.
// CNAV = base (revenu + trimestres) ; les autres = points.
// PER exclu (capitalisation). CIPAV/CARPIMKO ont leurs propres blocs.
const ORDER = ["CNAV", "AGIRC_ARRCO", "IRCANTEC", "RCI"];

// Champs miroir « legacy » sur la ligne, en complément de row.regimes[KEY].
const LEGACY_FIELD = {
  AGIRC_ARRCO: "agircPts",
  IRCANTEC: "ircPts",
  RCI: "rciPts",
};

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function theme(key) {
  const r = REGIMES.find((x) => x.key === key);
  return r
    ? { label: r.label, icon: r.icon, color: r.color }
    : { label: key, icon: "❓", color: "#9CA3AF" };
}

// Points d'un régime complémentaire sur une ligne : canonique puis miroir legacy.
function regimePoints(row, key) {
  const fromMap = row?.regimes?.[key];
  if (fromMap != null) return num(fromMap);
  return num(row?.[LEGACY_FIELD[key]]);
}

// Cas « total agrégé RIS » : une seule année porte une valeur et elle vaut le
// total (le RIS ne fournit pas la ventilation annuelle — typiquement RCI).
function isAggregate(values, total) {
  if (total <= 0) return false;
  const nonZero = values.filter((v) => v > 0);
  return nonZero.length === 1 && Math.abs(nonZero[0] - total) < 0.01;
}

// CNAV : revenu brut depuis carriereRows (`sal`), trimestres depuis les 3 maps
// séparées de l'UI (cotisés / assimilés / AR), keyées par année. Total annuel
// retenu = min(4, cotisés + assimilés + AR), comme le tableau principal.
function buildCnav(rows, trim) {
  const trimCot = trim.trimCot || {};
  const trimAss = trim.trimAss || {};
  const ar = trim.ar || {};
  const detail = [];
  let totCot = 0;
  let totAss = 0;
  let totAr = 0;
  let totRetenu = 0;
  for (const row of rows) {
    const revenu = num(row.sal);
    const cotises = num(trimCot[row.yr]);
    const assimiles = num(trimAss[row.yr]);
    const arVal = num(ar[row.yr]);
    if (revenu <= 0 && cotises <= 0 && assimiles <= 0 && arVal <= 0) continue;
    const retenu = Math.min(4, cotises + assimiles + arVal);
    detail.push({ annee: row.yr, revenu, cotises, assimiles, ar: arVal, total: retenu });
    totCot += cotises;
    totAss += assimiles;
    totAr += arVal;
    totRetenu += retenu;
  }
  if (detail.length === 0) return null;
  detail.sort((a, b) => a.annee - b.annee);
  return {
    code: "CNAV",
    ...theme("CNAV"),
    unit: "trimestres",
    rows: detail,
    totals: {
      cotises: totCot,
      assimiles: totAss,
      ar: totAr,
      total: totRetenu,
    },
    agrege: false,
  };
}

function buildComplementaire(rows, key) {
  const detail = [];
  const values = [];
  let total = 0;
  for (const row of rows) {
    const points = regimePoints(row, key);
    if (points <= 0) continue;
    const p = round2(points);
    detail.push({ annee: row.yr, points: p });
    values.push(p);
    total += p;
  }
  if (detail.length === 0) return null;
  detail.sort((a, b) => a.annee - b.annee);
  total = round2(total);
  return {
    code: key,
    ...theme(key),
    unit: "points",
    rows: detail,
    totals: { points: total },
    agrege: isAggregate(values, total),
  };
}

/**
 * Récap CIPAV (lecture seule) depuis cnavplRows (saisie main table).
 * cnavplRows : { [yr]: { points (base), pointsCompl } }.
 * @returns {Object|null} { code:"CIPAV", ..., totals:{ base, compl, points } } ou null si vide
 */
export function buildCipavRecap(cnavplRows) {
  if (!cnavplRows || typeof cnavplRows !== "object") return null;
  let base = 0;
  let compl = 0;
  for (const row of Object.values(cnavplRows)) {
    base += num(row?.points);
    compl += num(row?.pointsCompl);
  }
  base = round2(base);
  compl = round2(compl);
  const points = round2(base + compl);
  if (points <= 0) return null;
  return {
    code: "CIPAV",
    ...theme("CIPAV"),
    unit: "points",
    totals: { base, compl, points },
  };
}

/**
 * Construit le récap carrière par régime.
 * @param {Array} carriereRows lignes carrière du simulateur
 * @param {Object} [trim] maps trimestres CNAV keyées par année :
 *   { trimCot, trimAss, ar } (cotisés / assimilés / AR)
 * @returns {Array} régimes non vides, dans l'ordre ORDER. Chaque entrée :
 *   { code, label, icon, color, unit, rows, totals, agrege }
 *   - CNAV  : rows = { annee, revenu, cotises, assimiles, ar, total }
 *             totals = { cotises, assimiles, ar, total }
 *   - autres: rows = { annee, points } ; totals = { points }
 */
export function buildRecapRegimes(carriereRows, trim = {}) {
  if (!Array.isArray(carriereRows) || carriereRows.length === 0) return [];
  const out = [];
  for (const code of ORDER) {
    const recap =
      code === "CNAV"
        ? buildCnav(carriereRows, trim)
        : buildComplementaire(carriereRows, code);
    if (recap) out.push(recap);
  }
  return out;
}
