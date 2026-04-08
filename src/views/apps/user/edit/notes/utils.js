import {
  arrcoPlafond,
  arrcoTaux,
  ircantecPlafonds,
  ircantecValeursPoint,
  coeffRevalo,
  plafondSS,
  rciPrixAchat,
  rciTauxDisplay,
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

export function parseRevenusString(str) {
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
    const clean = part.replace(/\s/g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
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
export function computeArrcoPoints(salaireEUR, year) {
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
export function computeIrcantecPoints(salaireNominal, year) {
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
export function computeCnavRevalorise(salaireEUR, year) {
  if (!salaireEUR || salaireEUR <= 0) return null;
  const coeff = coeffRevalo[year];
  const pass = plafondSS[year];
  if (!coeff || !pass) return null;

  const capped = Math.min(salaireEUR, pass);
  return capped * coeff;
}

// --- Fonctions de calcul exactes des simulateurs ---

// CNAV: réplique exacte de CnavSimulator.handlePrefill (lignes 386-412)
// Travaille en devise d'origine (francs pre-2002), cap au PASS avant revalorisation
function computeCnavSimulator(montantRaw, annee) {
  if (!montantRaw || montantRaw <= 0) return null;
  const coeff = coeffRevalo[annee] || 1;
  const passEuro = plafondSS[annee] || 0;
  if (!passEuro) return null;

  let salairePlafonne = montantRaw;
  if (annee <= 2001) {
    const passFrancs = passEuro * 6.556957;
    salairePlafonne = Math.min(montantRaw, passFrancs);
  } else {
    salairePlafonne = Math.min(montantRaw, passEuro);
  }

  const salaireRevaloriser = annee <= 2001
    ? (salairePlafonne * coeff) / 6.556957
    : salairePlafonne * coeff;

  const seuilTrimestre = annee <= 2001
    ? (passEuro * 6.556957) / 4
    : passEuro / 4;
  const trimestres = Math.min(4, Math.max(0, Math.floor(montantRaw / (seuilTrimestre || Infinity))));

  return { revalorise: salaireRevaloriser, trimestres };
}

// ARRCO: réplique exacte de ArrcoSimulator.computeNonCadre/computeCadre (lignes 22-112)
// Conversion francs→EUR interne pour pre-2002, supporte cadre et non-cadre
function computeArrcoSimulator(montantRaw, annee, isCadre) {
  if (!montantRaw || montantRaw <= 0) return null;

  let salaire = montantRaw;
  if (annee < 2002) salaire = montantRaw / 6.55957;

  const x = arrcoPlafond.findIndex((p) => p[0] === annee);
  if (x < 0 || !arrcoTaux[x]) return null;

  const plafondAnnuel = arrcoPlafond[x][2];

  if (isCadre) {
    if (annee < 2019) {
      const tauxArrco = arrcoTaux[x][1];
      const tauxAgirc = arrcoTaux[x][3];
      const valeurPtArrco = arrcoTaux[x][6];
      const valeurPtAgirc = arrcoTaux[x][8];
      if (!valeurPtArrco || !valeurPtAgirc) return null;

      const cotisA = Math.min(salaire, plafondAnnuel) * tauxArrco;
      const pointsA = cotisA / valeurPtArrco;
      let pointsB = 0;
      if (salaire > plafondAnnuel) {
        const cotisB = (salaire - plafondAnnuel) * tauxAgirc;
        pointsB = cotisB / valeurPtAgirc;
      }
      return pointsA + pointsB * 0.347791548;
    } else {
      const tauxTA = arrcoTaux[x][1];
      const tauxTB = arrcoTaux[x][3];
      const valeurAchatPoint = arrcoTaux[x][8];
      if (!valeurAchatPoint) return null;

      const cotisTA = Math.min(salaire, plafondAnnuel) * tauxTA;
      const pointsTA = cotisTA / valeurAchatPoint;
      let pointsTB = 0;
      if (salaire > plafondAnnuel) {
        const cotisB = (salaire - plafondAnnuel) * tauxTB;
        pointsTB = cotisB / valeurAchatPoint;
      }
      return pointsTA + pointsTB;
    }
  } else {
    if (annee < 2019) {
      const tauxTA = arrcoTaux[x][1];
      const tauxTB = arrcoTaux[x][2];
      const valeurT1 = arrcoTaux[x][6];
      const valeurAchatArrco = arrcoTaux[x][8];
      if (!valeurT1 || !valeurAchatArrco) return null;

      const trancheA = Math.min(Math.max(salaire, 0), plafondAnnuel);
      const cotisTA = trancheA * tauxTA;
      let cotisationTB = 0;
      if (salaire > plafondAnnuel) {
        const excedent = salaire - plafondAnnuel;
        const trancheB = Math.min(excedent, 2 * plafondAnnuel);
        cotisationTB = trancheB * tauxTB;
      }
      const totalCotisations = cotisationTB * 0.347791548;
      return totalCotisations / valeurAchatArrco + cotisTA / valeurT1;
    } else {
      const tauxTA = arrcoTaux[x][1];
      const tauxTB = arrcoTaux[x][3];
      const valeurAchatPoint = arrcoTaux[x][8];
      if (!valeurAchatPoint) return null;

      const cotisTA = Math.min(salaire, plafondAnnuel) * tauxTA;
      const pointsTA = cotisTA / valeurAchatPoint;
      let pointsTB = 0;
      if (salaire > plafondAnnuel) {
        const cotisB = (salaire - plafondAnnuel) * tauxTB;
        pointsTB = cotisB / valeurAchatPoint;
      }
      return pointsTA + pointsTB;
    }
  }
}

// IRCANTEC: réplique exacte de IrcantecSimulator.handleSimulateur (lignes 21-49)
// Plafond haut fixe à 375936 (comme le simulateur)
function computeIrcantecSimulator(salaireBrut, annee) {
  if (!salaireBrut || salaireBrut <= 0) return null;
  const plafondAnnuel = ircantecPlafonds[annee];
  const valeurPoint = ircantecValeursPoint[annee];
  if (!plafondAnnuel || !valeurPoint) return null;

  const TRA = Math.min(salaireBrut, plafondAnnuel) * 0.07;
  const trancheB = Math.max(0, salaireBrut - plafondAnnuel);
  const TRB = Math.min(trancheB, 375936 - plafondAnnuel) * 0.195;
  const TOTAL = TRA + TRB;
  return TOTAL / valeurPoint;
}

// RCI: réplique exacte de RciSimulator.handleSimulateur (lignes 22-58)
// Conversion francs→EUR interne pour pre-2002
function computeRciSimulator(montantRaw, annee) {
  if (!montantRaw || montantRaw <= 0) return null;

  let salaire = montantRaw;
  if (annee < 2002) salaire = montantRaw / 6.55957;

  const pass = plafondSS[annee];
  const prixAchat = rciPrixAchat[annee];
  const display = rciTauxDisplay[annee];
  if (!pass || !prixAchat || !display) return null;

  const tauxA = parseFloat((display.tauxA || "").replace(",", ".").replace("%", "")) / 100;
  const tauxB = parseFloat((display.tauxB || "").replace(",", ".").replace("%", "")) / 100;
  if (isNaN(tauxA) || isNaN(tauxB)) return null;

  const cotisA = Math.min(Math.max(salaire, 0), pass) * tauxA;
  const cotisB = Math.min(Math.max(salaire - pass, 0), 3 * pass) * tauxB;
  const pointsA = cotisA / prixAchat;
  const pointsB = cotisB / prixAchat;
  return pointsA + pointsB;
}

// --- Conversion de texte brut en HTML lisible ---

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTextBlock(text) {
  if (!text) return '';

  // Découpe sur □ (séparateur bullet de l'IA)
  const bullets = text.split('□').map(p => p.trim()).filter(Boolean);
  if (bullets.length > 2) {
    return bullets.map(part => {
      const colonIdx = part.indexOf(' : ');
      if (colonIdx > 0 && colonIdx < 80) {
        const key = part.slice(0, colonIdx).trim();
        const val = part.slice(colonIdx + 3).trim();
        return `<div class="kv-row"><span class="kv-k">${escHtml(key)}</span><span class="kv-v">${escHtml(val)}</span></div>`;
      }
      return `<div class="kv-row"><span class="kv-v">${escHtml(part)}</span></div>`;
    }).join('');
  }

  // Pas de bullets, on formate ligne par ligne
  const lines = text.split('\n');
  let html = '';
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { html += '<div style="height:6px"></div>'; continue; }

    // --- Ligne 1 : … --- (sous-titres)
    const dashMatch = line.match(/^---+\s*(.*?)\s*---+$/);
    if (dashMatch) {
      html += `<div class="sub-title">${escHtml(dashMatch[1] || line)}</div>`;
      continue;
    }

    // Vérification / ✓ (ligne de validation)
    if (line.startsWith('✓') || line.startsWith('✗')) {
      const ok = line.startsWith('✓');
      html += `<div class="check-row ${ok ? 'check-ok' : 'check-fail'}">${escHtml(line)}</div>`;
      continue;
    }

    // Paire Clé : Valeur
    const colonIdx = line.indexOf(' : ');
    if (colonIdx > 0 && colonIdx < 80) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 3).trim();
      html += `<div class="kv-row"><span class="kv-k">${escHtml(key)}</span><span class="kv-v">${escHtml(val)}</span></div>`;
      continue;
    }

    html += `<p class="plain-p">${escHtml(line)}</p>`;
  }
  return html;
}

/**
 * Encapsule du texte brut (retour N8N non-HTML) dans un document HTML stylisé et lisible.
 * Si le contenu est déjà du HTML valide, il est retourné tel quel.
 */
export function wrapPlainTextAsHtml(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  const trimmed = raw.trim();

  // Déjà du HTML → on ne touche pas
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    (trimmed.startsWith('<') && /<\/[a-zA-Z]+>/.test(trimmed))
  ) {
    return raw;
  }

  // Détection des sections [Étape N : titre] ou [TITRE]
  const sectionRe = /\[([^\]]+)\]/g;
  const parts = [];
  let lastIdx = 0;
  let match;

  while ((match = sectionRe.exec(trimmed)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ type: 'text', content: trimmed.slice(lastIdx, match.index) });
    }
    parts.push({ type: 'section', title: match[1] });
    lastIdx = sectionRe.lastIndex;
  }
  if (lastIdx < trimmed.length) {
    parts.push({ type: 'text', content: trimmed.slice(lastIdx) });
  }

  // Regrouper chaque section avec son contenu qui suit
  const sections = [];
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (part.type === 'section') {
      const nextText = parts[i + 1] && parts[i + 1].type === 'text' ? parts[i + 1].content.trim() : '';
      sections.push({ title: part.title, content: nextText });
      i += nextText ? 2 : 1;
    } else {
      if (part.content.trim()) {
        sections.push({ title: null, content: part.content.trim() });
      }
      i++;
    }
  }

  let bodyHtml = '';
  for (const sec of sections) {
    if (sec.title) {
      bodyHtml += `
        <div class="section">
          <div class="section-hd">${escHtml(sec.title)}</div>
          <div class="section-bd">${formatTextBlock(sec.content)}</div>
        </div>`;
    } else {
      bodyHtml += `<div class="intro-block">${formatTextBlock(sec.content)}</div>`;
    }
  }

  if (!bodyHtml.trim()) {
    bodyHtml = `<pre class="fallback">${escHtml(trimmed)}</pre>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    font-family:'Segoe UI',system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
    background:#f0f4f8;
    padding:24px;
    color:#1e293b;
    font-size:13.5px;
    line-height:1.65;
  }
  .doc{
    max-width:860px;
    margin:0 auto;
    background:#fff;
    border-radius:14px;
    box-shadow:0 4px 24px rgba(0,32,96,0.10);
    overflow:hidden;
  }
  .doc-hd{
    background:linear-gradient(135deg,#002060 0%,#1a56db 100%);
    padding:28px 36px;
    color:#fff;
  }
  .doc-hd h1{font-size:18px;font-weight:700;margin-bottom:4px;letter-spacing:-0.3px}
  .doc-hd p{font-size:12px;opacity:0.75;margin:0}
  .doc-body{padding:28px 36px}
  .section{
    border:1px solid #e2e8f0;
    border-radius:10px;
    overflow:hidden;
    margin-bottom:18px;
  }
  .section-hd{
    background:#eff6ff;
    border-bottom:1px solid #bfdbfe;
    padding:9px 16px;
    font-weight:700;
    font-size:11.5px;
    color:#1d4ed8;
    text-transform:uppercase;
    letter-spacing:0.06em;
  }
  .section-bd{padding:12px 16px}
  .intro-block{margin-bottom:18px}
  .kv-row{
    display:flex;
    gap:10px;
    padding:5px 0;
    border-bottom:1px solid #f8fafc;
    align-items:flex-start;
  }
  .kv-row:last-child{border-bottom:none}
  .kv-k{
    font-weight:600;
    color:#475569;
    min-width:190px;
    flex-shrink:0;
    font-size:12.5px;
  }
  .kv-v{color:#1e293b;font-size:13px;flex:1}
  .sub-title{
    font-size:11px;
    font-weight:700;
    color:#64748b;
    text-transform:uppercase;
    letter-spacing:0.08em;
    margin:14px 0 8px;
    padding-bottom:4px;
    border-bottom:1px solid #e2e8f0;
  }
  .check-row{padding:4px 0;font-size:13px}
  .check-ok{color:#15803d;font-weight:500}
  .check-fail{color:#b91c1c;font-weight:500}
  .plain-p{margin:4px 0;font-size:13px;color:#334155}
  .fallback{
    white-space:pre-wrap;
    font-family:'Courier New',monospace;
    font-size:12px;
    line-height:1.6;
    color:#334155;
    background:#f8fafc;
    padding:16px;
    border-radius:8px;
    border:1px solid #e2e8f0;
  }
  div[style="height:6px"]{height:6px}
</style>
</head>
<body>
<div class="doc">
  <div class="doc-hd">
    <h1>Rapport d'Analyse Retraite</h1>
    <p>Document généré automatiquement — Option Retraite</p>
  </div>
  <div class="doc-body">
    ${bodyHtml}
  </div>
</div>
</body>
</html>`;
}

export function convertRISToManualRows(risData, { isCadre = false } = {}) {
  const data = Array.isArray(risData) ? risData[0] : risData;
  if (!data) return [];

  const careerData = data.debug_carriere_detaillee_regex || [];
  const detailAnnuel = data.detail_annuel || data.carriere_detaillee || [];

  // Construire les sets de régimes depuis detail_annuel (comme ARRCO/IRCANTEC/RCI simulateurs)
  const arrcoYears = new Set();
  const ircantecYears = new Set();
  const rciYears = new Set();
  if (Array.isArray(detailAnnuel)) {
    detailAnnuel.forEach((entry) => {
      const regimes = (entry.regimes_concernes || "").toLowerCase();
      if (regimes.includes("agirc-arrco")) arrcoYears.add(String(entry.annee));
      if (regimes.includes("ircantec")) ircantecYears.add(String(entry.annee));
      if (regimes.includes("rci")) rciYears.add(String(entry.annee));
    });
  }

  // Map detail_annuel par année pour les trimestres AR
  const detailByYear = new Map();
  detailAnnuel.forEach((entry) => {
    const annee = String(entry.annee);
    if (annee) detailByYear.set(annee, entry);
  });

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

  // Parcourir debug_carriere_detaillee_regex (comme CnavSimulator.handlePrefill)
  careerData.forEach((entry, idx) => {
    const annee = parseInt(entry.annee, 10);
    if (!annee) return;
    const anneeStr = String(annee);

    // Filtrage CNAV (réplique CnavSimulator.handlePrefill lignes 362-375)
    const regimes = (entry.regimes_concernes || "").toLowerCase();
    const hasBaseAlignee =
      regimes.includes("assurance retraite") ||
      regimes.includes("ssi") ||
      regimes.includes("msa") ||
      regimes.includes("agirc-arrco");
    const isPureCipav = regimes.includes("cipav") && !hasBaseAlignee;
    const isPureLib =
      (regimes.includes("profession libérale") ||
        regimes.includes("profession liberale")) &&
      !hasBaseAlignee;

    if (isPureCipav || isPureLib) return;

    // Extraire le montant brut (en devise d'origine)
    let montant = entry.revenu_brut;
    if (!montant && entry.revenus) {
      const clean = entry.revenus.replace(/[^0-9.,]/g, "").replace(",", ".");
      montant = parseFloat(clean);
    }
    if (!montant) return;
    montant = parseFloat(String(montant));

    // Conversion EUR pour affichage
    const brutEUR = annee <= 2001 ? montant / FRF_TO_EUR : montant;

    // --- CNAV (logique exacte du simulateur) ---
    const cnavResult = computeCnavSimulator(montant, annee);
    const cnavDisplay = cnavResult ? fmtPoints(cnavResult.revalorise) : "";

    // --- ARRCO (logique exacte du simulateur, avec cadre/non-cadre) ---
    let arrcoCalc = null;
    if (arrcoYears.has(anneeStr)) {
      arrcoCalc = computeArrcoSimulator(montant, annee, isCadre);
    }

    // --- IRCANTEC (logique exacte du simulateur) ---
    let ircantecCalc = null;
    if (ircantecYears.has(anneeStr)) {
      ircantecCalc = computeIrcantecSimulator(montant, annee);
    }

    // --- RCI (logique exacte du simulateur) ---
    let rciCalc = null;
    if (rciYears.has(anneeStr)) {
      rciCalc = computeRciSimulator(montant, annee);
    }

    // --- Trimestres ---
    let trimBase = cnavResult ? cnavResult.trimestres : 0;
    let trimAR = 0;
    const detailEntry = detailByYear.get(anneeStr);
    if (detailEntry) {
      const nature = (detailEntry.nature || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (nature === "assimile") {
        trimAR = parseInt(detailEntry.trimestres_retenus, 10) || 0;
        trimBase = 0;
      }
    }

    // --- PASS & Tranches ---
    const passNominal = PASS_HISTORIQUE[annee];
    let ta = "";
    let tb = "";
    if (passNominal) {
      const passEUR = annee < 2002 ? passNominal / FRF_TO_EUR : passNominal;
      ta = formatEUR(Math.min(brutEUR, passEUR));
      tb = formatEUR(Math.max(0, brutEUR - passEUR));
    }

    rows.push({
      id: Date.now() + idx,
      annee: String(annee),
      revenu: formatEUR(brutEUR),
      trimBase: String(trimBase),
      trimAR: String(trimAR),
      cnavPoints: cnavDisplay,
      arrcoPoints: arrcoCalc !== null ? fmtPoints(arrcoCalc) : "",
      ircantecPoints: ircantecCalc !== null ? fmtPoints(ircantecCalc) : "",
      rciPoints: rciCalc !== null ? fmtPoints(rciCalc) : "",
      cipavPoints: "",
      ta,
      tb,
      tc: "",
      errY: false,
      errR: false,
    });
  });

  // --- RCI / CIPAV: fallback agrégé si aucun calcul par année ---
  if (rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    const hasRciByYear = rows.some((r) => r.rciPoints !== "");
    if (!hasRciByYear && aggRci !== null) {
      lastRow.rciPoints = fmtPoints(aggRci);
    }
    if (aggCipav !== null) {
      lastRow.cipavPoints = fmtPoints(aggCipav);
    }
  }

  return rows;
}
