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
