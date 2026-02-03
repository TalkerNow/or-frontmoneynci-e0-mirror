import axios from "axios";

/**
 * Charge le template de contrat
 */
export const loadContractTemplate = async () => {
  const token = localStorage.getItem("token");
  try {
    const resp = await axios.get(
      `${global.config.server_url}/contract-templates`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!resp.data || resp.data.length === 0) return null;
    return resp.data[0];
  } catch (error) {
    console.error("Erreur lors du chargement du template:", error);
    return null;
  }
};

/**
 * Normalise les valeurs du template
 */
export const normalizeTemplateValues = (values) => {
  if (!values) return {};
  const normalized = {};
  Object.keys(values).forEach((k) => {
    const val = values[k];
    if (typeof val === "object" && val !== null && "value" in val) {
      normalized[k] = val.value;
    } else {
      normalized[k] = val;
    }
  });
  return normalized;
};

/**
 * Récupère le label d'une ligne de prestation
 */
export const getRowLabel = (id, values = {}) => {
  const labels = {
    r1: "Bilan retraite",
    r2: "Bilan retraite + Reconstitution",
    r3: "Reconstitution de carrière",
    r4: "Liquidation de retraite",
    r5: "Rachat de trimestres",
    r6: "Cumul emploi-retraite",
    r7: "Pack Entrepreneur",
  };
  return values[id] || labels[id] || id;
};

/**
 * Construit les valeurs pour une sélection de lignes
 */
export const buildValuesForSelection = (selectedRows) => {
  const allValues = {
    r1: "Bilan retraite",
    r2: "Bilan retraite + Reconstitution",
    r3: "Reconstitution de carrière",
    r4: "Liquidation de retraite",
    r5: "Rachat de trimestres",
    r6: "Cumul emploi-retraite",
    r7: "Pack Entrepreneur",
  };
  const result = {};
  selectedRows.forEach((rowId) => {
    result[rowId] = allValues[rowId] || rowId;
  });
  return result;
};

/**
 * Construit la chaîne subscribe_services
 */
export const buildSubscribeServicesString = (values) => {
  if (!values || Object.keys(values).length === 0) return "";
  return Object.values(values).filter(Boolean).join(" / ");
};

/**
 * Calcule les totaux depuis les valeurs
 */
export const computeTotalsFromValues = (values) => {
  if (!values) return { advanced: 0, pre: 0, end: 0 };

  const safeNum = (val) => {
    if (val === null || val === undefined) return 0;
    const n = parseFloat(val);
    return Number.isNaN(n) ? 0 : n;
  };

  let advanced = 0;
  let pre = 0;
  let end = 0;

  Object.keys(values).forEach((key) => {
    const val = values[key];
    if (typeof val !== "object" || val === null) return;

    advanced += safeNum(val.advanced || val.advanced_payment || 0);
    pre += safeNum(val.pre || val.pre_payment || 0);
    end += safeNum(val.end || val.end_payment || 0);
  });

  return { advanced, pre, end };
};

/**
 * Génère un libellé intelligent pour le contrat
 */
export const generateContractLabel = (userDetails, selectedRows, values) => {
  if (!userDetails) return "Nouveau contrat";

  const firstName = userDetails.first_name || userDetails.prenom || "";
  const lastName = userDetails.last_name || userDetails.nom || "";
  const name = `${firstName} ${lastName}`.trim() || "Client";

  if (!selectedRows || selectedRows.length === 0) {
    return `Contrat - ${name}`;
  }

  const services = selectedRows
    .map((rowId) => getRowLabel(rowId, values))
    .join(" + ");

  return `${name} - ${services}`;
};
