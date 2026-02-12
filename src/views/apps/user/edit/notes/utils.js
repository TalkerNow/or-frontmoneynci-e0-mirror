import {
  arrcoPlafond,
  arrcoTaux,
  ircantecPlafonds,
  ircantecValeursPoint,
  coeffRevalo,
  plafondSS,
} from "../simulatorData";

// eslint-disable-next-line no-unused-vars
const DOC_STORAGE_KEY = "career_generated_docs_v1";
// eslint-disable-next-line no-unused-vars
const DOC_UPLOAD_META_KEY = "career_doc_meta";
const PUBLIC_URL =
  typeof process !== "undefined" && process.env && process.env.PUBLIC_URL
    ? process.env.PUBLIC_URL
    : "";
export const DEFAULT_DOC_URLS = {
  pre: `${PUBLIC_URL}/cnav-simulator.html`,
  consult: `${PUBLIC_URL}/arrco-simulator.html`,
};

// Quick Tags for IA prompt - dropdown multi-select format
export const QUICK_TAGS_OPTIONS = [
  { value: "fin_carriere", label: "Dispositifs fin de carrière" },
  { value: "rapport_consultation", label: "Rapport de consultation" },
  { value: "preparation_entretien", label: "Préparation entretien" },
  { value: "simulation_chomage", label: "Simulation chômage" },
  { value: "simulation_auto", label: "Simulation auto-entrepreneur" },
  { value: "racl", label: "RACL (Retraite Anticipée Carrière Longue)" },
  { value: "retraite_progressive", label: "Retraite progressive" },
  { value: "cumul_emploi", label: "Cumul emploi retraite" },
  { value: "periode_etranger", label: "Période à l'étranger" },
];

export const pickNamePart = (value) =>
  typeof value === "string" && value.trim().length ? value.trim() : "";

export const stripAccents = (value = "") =>
  value.normalize
    ? value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    : value;

export const generateDocId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `doc-${Math.random().toString(36).slice(2)}-${Date.now()}`;

export const detectDocTypeFromName = (name = "") => {
  const normalized = stripAccents(name).toLowerCase();
  if (normalized.startsWith("rapport pre-entretien")) return "pre";
  if (normalized.startsWith("rapport consultation")) return "consult";
  return "unknown";
};

export const resolveDocType = (doc) => {
  const type = doc?.type || doc?.origin;
  if (type === "consult" || type === "consultation") return "consult";
  if (type === "preanalyse" || type === "pre") return "pre";
  return detectDocTypeFromName(doc?.name);
};

export const getDocStorageKey = (id) => `career_generated_docs_v1_${id}`;
export const getUploadStorageKey = (id) => `career_doc_meta_${id}`;

export const loadStoredDocs = (clientId, docUrls = DEFAULT_DOC_URLS) => {
  if (
    !clientId ||
    typeof window === "undefined" ||
    typeof localStorage === "undefined"
  )
    return [];
  try {
    const raw = localStorage.getItem(getDocStorageKey(clientId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const type = resolveDocType(item);
        return {
          id: item.id || generateDocId(),
          name: item.name || "Document carrière",
          type,
          createdAt:
            item.createdAt || item.generatedAt || item.uploadedAt || "",
          url: item.url || docUrls[type] || "",
          // htmlContent n'est plus stocké dans localStorage
        };
      });
  } catch {
    return [];
  }
};

export const loadUploadedDocs = (clientId) => {
  if (
    !clientId ||
    typeof window === "undefined" ||
    typeof localStorage === "undefined"
  )
    return [];
  try {
    const raw = localStorage.getItem(getUploadStorageKey(clientId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          id: item.id || generateDocId(),
          name: item.name || "",
          uploadedAt:
            item.uploadedAt || item.created_at || new Date().toISOString(),
          url: item.url || "",
        }));
    }
  } catch {
    /* noop */
  }
  return [];
};

export const persistDocs = (clientId, docs) => {
  if (
    !clientId ||
    typeof window === "undefined" ||
    typeof localStorage === "undefined"
  )
    return;

  try {
    // On ne stocke plus htmlContent dans localStorage (trop volumineux et problèmes CORS)
    // Seules les métadonnées sont persistées
    const payload = (Array.isArray(docs) ? docs : []).map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      createdAt: doc.createdAt,
      url: doc.url,
      // htmlContent n'est plus stocké
    }));
    localStorage.setItem(getDocStorageKey(clientId), JSON.stringify(payload));
  } catch (err) {
    console.warn("Storage error:", err);
  }
};

export const persistUploadedDocs = (clientId, items) => {
  if (
    !clientId ||
    typeof window === "undefined" ||
    typeof localStorage === "undefined"
  )
    return;
  try {
    if (!items || !items.length) {
      localStorage.removeItem(getUploadStorageKey(clientId));
      return;
    }
    localStorage.setItem(getUploadStorageKey(clientId), JSON.stringify(items));
  } catch {
    /* noop */
  }
};

export const extractClientNames = (perso = {}) => {
  const first = pickNamePart(
    perso.first_name || perso.firstname || perso.firstName || perso.prenom || ""
  );
  const last = pickNamePart(
    perso.last_name || perso.lastname || perso.lastName || perso.nom || ""
  );
  const displayName =
    `${first} ${last}`.replace(/\s+/g, " ").trim() || "ce client";
  return { first, last, displayName };
};

export const sanitizeSalaryInput = (val) => {
  if (!val) return "";
  const s = String(val).replace(/[^0-9,.]/g, "");
  let seenSep = false;
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "," || ch === ".") {
      if (seenSep) continue;
      seenSep = true;
    }
    out += ch;
  }
  return out;
};

// --- Import RIS (Relevé Individuel de Situation) ---

const FRF_TO_EUR = 6.55957;

const PASS_HISTORIQUE = {
  1960: 6960, 1961: 7560, 1962: 8400, 1963: 9360, 1964: 10440,
  1965: 11400, 1966: 12240, 1967: 13200, 1968: 14400, 1969: 16320,
  1970: 18000, 1971: 19800, 1972: 21960, 1973: 24480, 1974: 28200,
  1975: 33000, 1976: 37920, 1977: 43320, 1978: 48000, 1979: 53640,
  1980: 60120, 1981: 69840, 1982: 76680, 1983: 83400, 1984: 88920,
  1985: 94320, 1986: 98760, 1987: 101760, 1988: 105600, 1989: 109920,
  1990: 114120, 1991: 119040, 1992: 124320, 1993: 128880, 1994: 130440,
  1995: 132480, 1996: 135840, 1997: 137760, 1998: 140640, 1999: 144120,
  2000: 147360, 2001: 149820,
  2002: 28224, 2003: 29184, 2004: 29712, 2005: 30192, 2006: 31068,
  2007: 32184, 2008: 33276, 2009: 34308, 2010: 34620, 2011: 35352,
  2012: 36372, 2013: 37032, 2014: 37548, 2015: 38040, 2016: 38616,
  2017: 39228, 2018: 39732, 2019: 40524, 2020: 41136, 2021: 41136,
  2022: 41136, 2023: 43992, 2024: 46368, 2025: 47100,
};

const formatEUR = (num) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

function parseRevenusString(str) {
  if (!str) return { total: null, isFRF: false };
  const parts = str
    .toString()
    .split(/[,;]| et |\||\//)
    .map((p) => p.trim())
    .filter(Boolean);

  let total = 0;
  let found = false;
  let isFRF = false;

  for (const part of parts) {
    if (part.toUpperCase().includes("FRF")) isFRF = true;
    const clean = part.replace(/\s/g, "").replace(",", ".").replace(/[^0-9.\-]/g, "");
    const v = parseFloat(clean);
    if (Number.isFinite(v) && v > 0) {
      total += v;
      found = true;
    }
  }

  return { total: found ? total : null, isFRF };
}

// Helper: extract a numeric value from an object, checking multiple keys
function extractNumField(obj, ...keys) {
  for (const key of keys) {
    const val = obj[key];
    if (val === undefined || val === null || val === "" || val === "N/A") continue;
    const num = typeof val === "number" ? val : parseFloat(String(val).replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(num) && num > 0) return num;
  }
  return null;
}

// Helper: format a points value for display (2 decimals)
function fmtPoints(val) {
  if (val === null || val === undefined) return "";
  return formatEUR(val);
}

// --- ARRCO: Calcul nombre de points à partir d'un salaire (non-cadre par défaut) ---
function computeArrcoPoints(salaireEUR, year) {
  if (!salaireEUR || salaireEUR <= 0) return null;
  const x = arrcoPlafond.findIndex((p) => p[0] === year);
  if (x < 0 || !arrcoTaux[x]) return null;

  const plafondEUR = arrcoPlafond[x][2];

  if (year < 2019) {
    const tauxTA = arrcoTaux[x][1];
    const tauxTB = arrcoTaux[x][2];
    const valeurT1 = arrcoTaux[x][6];
    const valeurAchat = arrcoTaux[x][8];
    if (!valeurT1 || !valeurAchat) return null;

    const cotisTA = Math.min(salaireEUR, plafondEUR) * tauxTA;
    const pointsA = cotisTA / valeurT1;
    let pointsB = 0;
    if (salaireEUR > plafondEUR) {
      const excedent = Math.min(salaireEUR - plafondEUR, 2 * plafondEUR);
      const cotisB = excedent * tauxTB;
      pointsB = (cotisB * 0.347791548) / valeurAchat;
    }
    return pointsA + pointsB;
  } else {
    const tauxTA = arrcoTaux[x][1];
    const tauxTB = arrcoTaux[x][3];
    const valeurAchat = arrcoTaux[x][8];
    if (!valeurAchat) return null;

    const cotisTA = Math.min(salaireEUR, plafondEUR) * tauxTA;
    const pointsTA = cotisTA / valeurAchat;
    let pointsTB = 0;
    if (salaireEUR > plafondEUR) {
      const cotisB = (salaireEUR - plafondEUR) * tauxTB;
      pointsTB = cotisB / valeurAchat;
    }
    return pointsTA + pointsTB;
  }
}

// --- IRCANTEC: Calcul nombre de points à partir d'un salaire ---
function computeIrcantecPoints(salaireNominal, year) {
  const plafond = ircantecPlafonds[year];
  const valeur = ircantecValeursPoint[year];
  if (!plafond || !valeur || !salaireNominal || salaireNominal <= 0) return null;

  const TRA = Math.min(salaireNominal, plafond) * 0.07;
  const trancheB = Math.max(0, salaireNominal - plafond);
  const plafondHaut = plafond * 8;
  const TRB = Math.min(trancheB, plafondHaut - plafond) * 0.195;
  return (TRA + TRB) / valeur;
}

// --- CNAV: Salaire revalorisé pour le SAM ---
function computeCnavRevalorise(salaireEUR, year) {
  if (!salaireEUR || salaireEUR <= 0) return null;
  const coeff = coeffRevalo[year];
  const pass = plafondSS[year];
  if (!coeff || !pass) return null;

  const capped = Math.min(salaireEUR, pass);
  return capped * coeff;
}

export function convertRISToManualRows(risData) {
  const data = Array.isArray(risData) ? risData[0] : risData;
  if (!data) return [];

  const regexByYear = new Map(
    (data.debug_carriere_detaillee_regex || []).map((r) => [
      parseInt(r.annee, 10),
      r,
    ])
  );

  const detailAnnuel =
    data.detail_annuel || data.carriere_detaillee || [];

  // --- Extract aggregate points for RCI / CIPAV (pas de calcul par année dispo) ---
  const pts = data.points_officiels || {};
  const syn = data.droits_synthese || {};

  const aggRci = extractNumField(
    { a: pts.rci?.total_points, b: syn.rci?.total_points },
    "a", "b"
  );
  const aggCipavBase = extractNumField(
    { a: pts.cipav?.points_base, b: syn.cipav?.points_base },
    "a", "b"
  );
  const aggCipavCompl = extractNumField(
    { a: pts.cipav?.points_complementaire, b: syn.cipav?.points_complementaire },
    "a", "b"
  );
  const aggCipav = (aggCipavBase || 0) + (aggCipavCompl || 0) || null;

  const rows = [];

  for (let idx = 0; idx < detailAnnuel.length; idx++) {
    const entry = detailAnnuel[idx];
    const annee = parseInt(entry.annee, 10);
    if (!annee) continue;

    const regexRow = regexByYear.get(annee);

    // --- Revenue ---
    let brutNominal = null;
    let isFRF = annee < 2002;

    if (regexRow && Number.isFinite(+regexRow.revenu_brut)) {
      brutNominal = +regexRow.revenu_brut;
      if ((regexRow.revenus || "").toUpperCase().includes("FRF")) isFRF = true;
      if ((regexRow.revenus || "").toUpperCase().includes("EUR")) isFRF = false;
    } else {
      const parsed = parseRevenusString(entry.revenus);
      brutNominal = parsed.total;
      if (parsed.isFRF) isFRF = true;
    }

    let brutEUR = brutNominal;
    if (isFRF && brutNominal !== null) {
      brutEUR = brutNominal / FRF_TO_EUR;
    }

    // --- PASS & Tranches ---
    const passNominal = PASS_HISTORIQUE[annee];
    let ta = "";
    let tb = "";
    if (brutEUR !== null && passNominal) {
      const passEUR = annee < 2002 ? passNominal / FRF_TO_EUR : passNominal;
      ta = formatEUR(Math.min(brutEUR, passEUR));
      tb = formatEUR(Math.max(0, brutEUR - passEUR));
    }

    // --- Trimestres ---
    const trimTotal = parseInt(entry.trimestres_retenus, 10) || 0;
    const nature = (entry.nature || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let trimBase = trimTotal;
    let trimAR = 0;
    if (nature === "assimile") {
      trimBase = 0;
      trimAR = trimTotal;
    }

    // --- Régimes concernés pour cette année ---
    const regimes = (entry.regimes_concernes || "").toLowerCase();
    const hasCnav = regimes.includes("assurance retraite");
    const hasArrco = regimes.includes("agirc-arrco");
    const hasIrcantec = regimes.includes("ircantec");

    // --- Points par régime (calculés uniquement si le régime est concerné) ---

    // CNAV: salaire revalorisé pour le SAM
    let cnavDisplay = "";
    if (hasCnav) {
      const cnavRevalo = brutEUR !== null ? computeCnavRevalorise(brutEUR, annee) : null;
      cnavDisplay = cnavRevalo !== null ? fmtPoints(cnavRevalo) : ta;
    }

    // ARRCO: points calculés à partir du salaire EUR (formule non-cadre)
    let arrcoCalc = null;
    if (hasArrco) {
      arrcoCalc = brutEUR !== null ? computeArrcoPoints(brutEUR, annee) : null;
    }

    // IRCANTEC: points calculés à partir du salaire nominal (tables en FRF pre-2002, EUR post-2002)
    let ircantecCalc = null;
    if (hasIrcantec) {
      const ircantecSalaire = brutNominal !== null ? brutNominal : null;
      ircantecCalc = ircantecSalaire !== null ? computeIrcantecPoints(ircantecSalaire, annee) : null;
    }

    rows.push({
      id: Date.now() + idx,
      annee: String(annee),
      revenu: brutEUR !== null ? formatEUR(brutEUR) : "",
      trimBase: String(trimBase),
      trimAR: String(trimAR),
      cnavPoints: cnavDisplay,
      arrcoPoints: arrcoCalc !== null ? fmtPoints(arrcoCalc) : "",
      ircantecPoints: ircantecCalc !== null ? fmtPoints(ircantecCalc) : "",
      rciPoints: "",
      cipavPoints: "",
      ta,
      tb,
      tc: "",
      errY: false,
      errR: false,
    });
  }

  // --- RCI / CIPAV: pas de calcul par année, on utilise les totaux agrégés ---
  if (rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    if (aggRci !== null) {
      lastRow.rciPoints = fmtPoints(aggRci);
    }
    if (aggCipav !== null) {
      lastRow.cipavPoints = fmtPoints(aggCipav);
    }
  }

  return rows;
}
