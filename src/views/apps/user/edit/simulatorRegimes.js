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
    .replace(/[\s\-_]/g, "");
}

// ---------------------------------------------------------------------------
// Task 2: REGIMES registry + resolveRegime
// ---------------------------------------------------------------------------

const buildAliases = (...names) => names.map(normalize);

export const REGIMES = [
  // Régimes with a Python calc engine
  {
    key: "CNAV",
    label: "CNAV",
    color: "#6C5CE7",
    icon: "🧮",
    aliases: buildAliases("CNAV", "Assurance Retraite", "assurance_retraite", "Régime général", "regime_general"),
    hasCalcEngine: true,
  },
  {
    key: "AGIRC_ARRCO",
    label: "AGIRC-ARRCO",
    color: "#0984E3",
    icon: "📊",
    aliases: buildAliases("AGIRC-ARRCO", "Agirc-Arrco", "agirc_arrco", "AGIRC", "ARRCO"),
    hasCalcEngine: true,
  },
  {
    key: "IRCANTEC",
    label: "IRCANTEC",
    color: "#00B894",
    icon: "🏢",
    aliases: buildAliases("IRCANTEC", "Ircantec", "ircantec"),
    hasCalcEngine: true,
  },
  {
    key: "RCI",
    label: "RCI",
    color: "#E17055",
    icon: "📑",
    aliases: buildAliases("RCI", "SSI", "RSI", "RCI/SSI"),
    hasCalcEngine: true,
  },
  {
    key: "CIPAV",
    label: "CIPAV",
    color: "#9B59B6",
    icon: "🏥",
    aliases: buildAliases("CIPAV", "cipav", "cipav_base", "cipav_complementaire"),
    hasCalcEngine: true,
  },
  // Régimes with carrière input only (no calc engine yet)
  { key: "CARPIMKO",       label: "CARPIMKO",       color: "#FF6B9D", icon: "💉", aliases: buildAliases("CARPIMKO", "CARPIMKO_BASE"),                                                              hasCalcEngine: true },
  { key: "CARPIMKO_ASV",   label: "CARPIMKO ASV",   color: "#FFA08A", icon: "💉", aliases: buildAliases("CARPIMKO ASV", "CARPIMKO_ASV"),                                                          hasCalcEngine: true },
  { key: "CARPIMKO_COMPL", label: "CARPIMKO Compl", color: "#FFB7B7", icon: "💉", aliases: buildAliases("CARPIMKO Complémentaire", "CARPIMKO_Complementaire", "CARPIMKO_COMPL", "CARPIMKO_RC"), hasCalcEngine: true },
  // Tier 1 — régimes simples multi-piliers (workflow n8n générique + Python regime_simple)
  { key: "CARMF",   label: "CARMF",   color: "#FF7675", icon: "🩺", aliases: buildAliases("CARMF"),   hasCalcEngine: true },
  { key: "CARCDSF", label: "CARCDSF", color: "#FAB1A0", icon: "🦷", aliases: buildAliases("CARCDSF"), hasCalcEngine: true },
  { key: "CARPV",   label: "CARPV",   color: "#FFEAA7", icon: "🐾", aliases: buildAliases("CARPV"),   hasCalcEngine: true },
  { key: "CAVP",    label: "CAVP",    color: "#A29BFE", icon: "💊", aliases: buildAliases("CAVP"),    hasCalcEngine: true },
  { key: "CNBF",    label: "CNBF",    color: "#74B9FF", icon: "⚖️", aliases: buildAliases("CNBF"),    hasCalcEngine: true },
  { key: "MSA",     label: "MSA",     color: "#55EFC4", icon: "🌾", aliases: buildAliases("MSA"),     hasCalcEngine: true },
  { key: "CAVAMAC", label: "CAVAMAC", color: "#DFE6E9", icon: "🏢", aliases: buildAliases("CAVAMAC"), hasCalcEngine: true },
  { key: "CAVOM",   label: "CAVOM",   color: "#DFE6E9", icon: "🏢", aliases: buildAliases("CAVOM"),   hasCalcEngine: true },
  { key: "CRN",     label: "CRN",     color: "#DFE6E9", icon: "📜", aliases: buildAliases("CRN"),     hasCalcEngine: true },
  { key: "CAVEC",   label: "CAVEC",   color: "#FDCB6E", icon: "📊", aliases: buildAliases("CAVEC", "CAVEC Base", "CAVEC_BASE"), hasCalcEngine: true },
  // Tier 2 — fonction publique (à câbler séparément, règles spécifiques)
  { key: "CNRACL",  label: "CNRACL",  color: "#81ECEC", icon: "🏛️", aliases: buildAliases("CNRACL"),  hasCalcEngine: false },
  { key: "SRE",     label: "SRE",     color: "#B2BEC3", icon: "🏛️", aliases: buildAliases("SRE", "Fonction publique état", "fonction_publique_etat"), hasCalcEngine: false },
  { key: "RAFP",    label: "RAFP",    color: "#A29BFE", icon: "🏛️", aliases: buildAliases("RAFP", "Retraite additionnelle de la fonction publique", "retraite_additionnelle_fonction_publique", "retraite_additionnelle"), hasCalcEngine: false },
];

// Registry Tier 1 — utilisé par le simulateur pour itérer sur les régimes
// génériques (master button, persistance regimes_points, RegimeResultCard).
// Les `aliases` listent les clés possibles dans `carriere[].regimes` côté RIS auto-extrait.
// ⚠️ Garder en sync avec calculators/regime_simple.py (REGIMES_REGISTRY).
export const REGIMES_SIMPLES = {
  CARMF: { piliers: [
    { key: "base",          label: "Base",          aliases: ["CARMF", "CARMF_BASE"] },
    { key: "complementaire", label: "Complémentaire", aliases: ["CARMF_COMPL", "CARMF_COMPLEMENTAIRE", "CARMF_RC"] },
    { key: "asv",           label: "ASV",           aliases: ["CARMF_ASV"] },
  ]},
  CARCDSF: { piliers: [
    { key: "base",          label: "Base",          aliases: ["CARCDSF", "CARCDSF_BASE"] },
    { key: "complementaire", label: "Complémentaire", aliases: ["CARCDSF_COMPL", "CARCDSF_RC"] },
    { key: "asv",           label: "ASV",           aliases: ["CARCDSF_ASV"] },
  ]},
  CARPV: { piliers: [
    { key: "base",          label: "Base",          aliases: ["CARPV", "CARPV_BASE"] },
    { key: "complementaire", label: "Complémentaire", aliases: ["CARPV_COMPL", "CARPV_RC"] },
  ]},
  CAVP: { piliers: [
    { key: "base",          label: "Base",          aliases: ["CAVP", "CAVP_BASE"] },
    { key: "complementaire", label: "Complémentaire", aliases: ["CAVP_COMPL", "CAVP_RC"] },
  ]},
  CNBF: { piliers: [
    { key: "base",          label: "Base",          aliases: ["CNBF", "CNBF_BASE"] },
    { key: "complementaire", label: "Complémentaire", aliases: ["CNBF_COMPL", "CNBF_RC"] },
  ]},
  CAVAMAC: { piliers: [
    { key: "base",          label: "Base",          aliases: ["CAVAMAC", "CAVAMAC_BASE"] },
    { key: "complementaire", label: "Complémentaire", aliases: ["CAVAMAC_COMPL", "CAVAMAC_RC"] },
  ]},
  CAVOM: { piliers: [
    { key: "base",          label: "Base",          aliases: ["CAVOM", "CAVOM_BASE"] },
    { key: "complementaire", label: "Complémentaire", aliases: ["CAVOM_COMPL", "CAVOM_RC"] },
  ]},
  CRN: { piliers: [
    { key: "base",          label: "Base",          aliases: ["CRN", "CRN_BASE"] },
    { key: "complementaire", label: "Complémentaire", aliases: ["CRN_COMPL", "CRN_RC"] },
  ]},
  CAVEC: { piliers: [
    { key: "base",          label: "Base",          aliases: ["CAVEC", "CAVEC Base", "CAVEC_BASE"] },
    { key: "complementaire", label: "Complémentaire", aliases: ["CAVEC Complémentaire", "CAVEC_Complementaire", "CAVEC_COMPL", "CAVEC_COMPLEMENTAIRE", "CAVEC_RC"] },
  ]},
  MSA: { piliers: [
    { key: "base", label: "Base", aliases: ["MSA", "MSA_BASE"] },
  ]},
};

/**
 * Extrait les points d'un régime Tier 1 depuis carriere[].regimes (RIS auto)
 * en sommant tous les alias par pilier sur toutes les années.
 * @returns {Object} { base: 1500, complementaire: 800, ... } ou {} si vide
 */
export function extractRegimeSimplePoints(carriere, regimeCode) {
  const cfg = REGIMES_SIMPLES[regimeCode];
  if (!cfg || !Array.isArray(carriere)) return {};
  const result = {};
  for (const pilier of cfg.piliers) {
    let total = 0;
    for (const row of carriere) {
      const map = row?.regimes || {};
      for (const alias of pilier.aliases) {
        if (alias in map) total += parseFloat(map[alias]) || 0;
      }
    }
    if (total > 0) result[pilier.key] = Math.round(total * 100) / 100;
  }
  return result;
}

const UNKNOWN_REGIME_THEME = { color: "#9CA3AF", icon: "❓" };

export function resolveRegime(raw) {
  const norm = normalize(raw);
  if (!norm) return null;
  for (const entry of REGIMES) {
    if (entry.aliases.includes(norm)) return entry;
  }
  return {
    key: String(raw).trim(),
    label: String(raw).trim(),
    color: UNKNOWN_REGIME_THEME.color,
    icon: UNKNOWN_REGIME_THEME.icon,
    aliases: [norm],
    hasCalcEngine: false,
    isUnknown: true,
  };
}

// ---------------------------------------------------------------------------
// Task 3: getPoints / setPoints
// ---------------------------------------------------------------------------

export function getPoints(row, key) {
  if (!row || !row.regimes) return null;
  const v = row.regimes[key];
  return v === undefined ? null : v;
}

export function setPoints(row, key, value) {
  return {
    ...row,
    regimes: { ...(row?.regimes || {}), [key]: value },
  };
}

// ---------------------------------------------------------------------------
// Task 4: migrateRowShape
// ---------------------------------------------------------------------------

export function migrateRowShape(row) {
  if (!row) return row;
  if (row.regimes) return row;
  const { agircPts, ircPts, rciPts, ...rest } = row;
  const regimes = {};
  if (agircPts != null) regimes.AGIRC_ARRCO = agircPts;
  if (ircPts != null) regimes.IRCANTEC = ircPts;
  if (rciPts != null) regimes.RCI = rciPts;
  return { ...rest, regimes };
}

// ---------------------------------------------------------------------------
// Task 5: buildLegacyMirror
// ---------------------------------------------------------------------------

export function buildLegacyMirror(row) {
  if (!row) return row;
  const regimes = row.regimes || {};
  return {
    ...row,
    agircPts: regimes.AGIRC_ARRCO != null ? regimes.AGIRC_ARRCO : null,
    ircPts:   regimes.IRCANTEC    != null ? regimes.IRCANTEC    : null,
    rciPts:   regimes.RCI         != null ? regimes.RCI         : null,
  };
}

// ---------------------------------------------------------------------------
// Task 6: computeVisibleRegimes
// ---------------------------------------------------------------------------

export function computeVisibleRegimes(rows, defaultKeys = []) {
  const orderedKeys = [...defaultKeys];
  const seen = new Set(orderedKeys);
  for (const row of rows || []) {
    const regimes = row?.regimes || {};
    for (const key of Object.keys(regimes)) {
      const val = regimes[key];
      if (val == null || val === 0) continue;
      if (!seen.has(key)) {
        orderedKeys.push(key);
        seen.add(key);
      }
    }
  }
  return orderedKeys.map((key) => resolveRegime(key)).filter(Boolean);
}
