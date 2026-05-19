// SuiviAvancementBox.js
import React, { useEffect, useState } from "react";
import { Card, CardBody, Spinner, Button, Input } from "reactstrap";
import {
  Edit,
  PlusCircle,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Trash2,
} from "react-feather";
import axios from "axios";
import SweetAlert from "react-bootstrap-sweetalert";

// ----------- Helpers de format de date ------------

// Pour afficher la date (JJ/MM/AAAA) sans heure
const formatDisplayDate = (raw) => {
  if (!raw) return "-";
  let datePart = raw;
  if (raw.includes("T")) {
    datePart = raw.split("T")[0];
  } else if (raw.includes(" ")) {
    datePart = raw.split(" ")[0];
  }
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return raw;
  return `${d}/${m}/${y}`;
};
// Pour afficher date + heure (JJ/MM/AAAA HH:MM)
const formatDisplayDateTime = (raw) => {
  if (!raw) return "-";

  let v = raw.replace("Z", "");
  let datePart = v;
  let timePart = "";

  if (v.includes("T")) {
    const [d, t] = v.split("T");
    datePart = d;
    timePart = t || "";
  } else if (v.includes(" ")) {
    const [d, t] = v.split(" ");
    datePart = d;
    timePart = t || "";
  }

  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return raw;

  if (timePart) {
    const [hh, mm] = timePart.split(":");
    if (hh && mm) {
      timePart = `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
    } else {
      timePart = "";
    }
  }

  const dateFormatted = `${d}/${m}/${y}`;
  return timePart ? `${dateFormatted} ${timePart}` : dateFormatted;
};

// Pour remplir un <input type="datetime-local"> depuis une valeur DB
const toDateTimeLocalValue = (raw) => {
  if (!raw) return "";
  let v = raw.replace("Z", "");
  let datePart = v;
  let timePart = "";

  if (v.includes("T")) {
    const [d, t] = v.split("T");
    datePart = d;
    timePart = t || "";
  } else if (v.includes(" ")) {
    const [d, t] = v.split(" ");
    datePart = d;
    timePart = t || "";
  }

  if (!datePart) return "";

  let hh = "00";
  let mm = "00";

  if (timePart) {
    const parts = timePart.split(":");
    if (parts[0]) hh = parts[0].padStart(2, "0");
    if (parts[1]) mm = parts[1].padStart(2, "0");
  }

  return `${datePart}T${hh}:${mm}`;
};

// Pour envoyer au back une valeur type="datetime-local" (YYYY-MM-DDTHH:MM)
const fromDateTimeLocalValue = (value) => {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return null;

  const [hh, mm] = timePart.split(":");
  const h = (hh || "00").padStart(2, "0");
  const m = (mm || "00").padStart(2, "0");

  return `${datePart} ${h}:${m}:00`;
};

// Pour remplir un <input type="date">
const toDateInputValue = (raw) => {
  if (!raw) return "";
  let datePart = raw;
  if (raw.includes("T")) {
    datePart = raw.split("T")[0];
  } else if (raw.includes(" ")) {
    datePart = raw.split(" ")[0];
  }
  return datePart;
};

// Récupère la première date d'un champ (string simple ou liste JSON/array)
const getFirstDateFromValue = (value) => {
  if (!value) return null;

  // Si c'est déjà un tableau JS
  if (Array.isArray(value)) {
    if (!value.length) return null;
    const v0 = value[0];
    if (typeof v0 === "string") return toDateInputValue(v0);
    return null;
  }

  // Si c'est une string
  if (typeof value === "string") {
    const trimmed = value.trim();

    // Si c'est une string de tableau JSON : '["2025-11-17","2025-12-01"]'
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          typeof parsed[0] === "string"
        ) {
          return toDateInputValue(parsed[0]);
        }
        // tableau vide ou contenu non string → pas de date exploitable
        return null;
      } catch (e) {
        // si parse KO, on continue plus bas
      }
    }

    // Sinon on considère que c'est une simple date "YYYY-MM-DD ..."
    return toDateInputValue(value);
  }

  return null;
};

// Pour envoyer au back (YYYY-MM-DD HH:MM:SS)
const fromDateInputValue = (value) => {
  if (!value) return null;
  return value + " 00:00:00";
};

// Ajouter N jours ouvrés à une date (YYYY-MM-DD)
const addBusinessDays = (dateInputValue, days) => {
  if (!dateInputValue) return null;
  const [year, month, day] = dateInputValue.split("-").map(Number);
  if (!year || !month || !day) return null;

  const d = new Date(year, month - 1, day);
  let added = 0;

  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dayOfWeek = d.getDay(); // 0 = dimanche, 6 = samedi
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }

  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  return `${y}-${m}-${da}`;
};

// Ajouter N jours "classiques" (calendaires) à une date (YYYY-MM-DD)
const addDays = (dateInputValue, days) => {
  if (!dateInputValue) return null;
  const [year, month, day] = dateInputValue.split("-").map(Number);
  if (!year || !month || !day) return null;

  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);

  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  return `${y}-${m}-${da}`;
};

// ----------- Helpers sur les prestations ------------

const parseServices = (servicesRaw) => {
  if (!servicesRaw) return [];

  return servicesRaw
    .split("/") // ex : "CH / AR / SIMU"
    .map((s) =>
      s
        .replace(/["\\]/g, "") // enlève guillemets / backslashes
        .trim()
        .toUpperCase()
    )
    .filter(Boolean);
};

// Code interne du type de contrat
// - "credit_impot"         si unipro === 1
// - "ch_simu_actu_rac"     si services contient CH / SIMU / ACTU / RAC
// - "ar_tfd"               si services contient AR / TFD
// - "none"                 sinon
const getContractTypeCode = (contract) => {
  if (!contract) return "none";

  if (contract.unipro === 1) {
    return "credit_impot";
  }

  const services = parseServices(contract.subscribe_services);
  const groupCH = ["CH", "SIMU", "ACTU", "RAC"];
  const groupAR = ["AR", "TFD"];

  const hasGroupCH = services.some((s) => groupCH.includes(s));
  const hasGroupAR = services.some((s) => groupAR.includes(s));

  if (hasGroupCH) return "ch_simu_actu_rac";
  if (hasGroupAR) return "ar_tfd";

  return "none";
};

// Label affiché dans le badge
const getContractTypeLabel = (contract) => {
  if (!contract) return "Pas de prestation";

  const typeCode = getContractTypeCode(contract);
  const services = parseServices(contract.subscribe_services);
  const knownCodes = ["CH", "SIMU", "ACTU", "RAC", "AR", "TFD"];
  const filtered = services.filter((s) => knownCodes.includes(s));

  // 👉 Cas particulier : crédit d'impôt
  if (typeCode === "credit_impot") {
    if (filtered.length > 0) {
      // Ex : "Crédit d'impot (CH / SIMU)"
      return `Crédit d'impôt (${filtered.join(" / ")})`;
    }
    return "Crédit d'impôt";
  }

  // 👉 Autres types : comportement inchangé
  if (filtered.length > 0) {
    return filtered.join(" / ");
  }

  return "Pas de prestation";
};

const BADGE_CLASS_BY_TYPE = {
  credit_impot: "badge badge-light-success", // vert
  ar_tfd: "badge badge-light-warning", // jaune
  ch_simu_actu_rac: "badge badge-light-primary", // bleu
  none: "badge badge-light-secondary", // gris
};

// Définition des steps par type
const STEP_DEFINITION = {
  credit_impot: {
    totalSteps: 9, // Augmenté de 8 à 9 pour ajouter "Envoi du contrat" au début
    dateSteps: [1, 2, 3, 4, 5, 6, 7, 8], // Les étapes visuelles 1 à 8 ont une date
    columnMap: {
      1: 8, // Visual Step 1 (Envoi) -> DB step8 (inutilisé avant)
      2: 1, // Visual Step 2 (Signature) -> DB step1
      3: 2, // Visual Step 3 (Activation Urssaf) -> DB step2
      4: 3, // Visual Step 4 (5 jours) -> DB step3
      5: 4, // Visual Step 5 (Création devis) -> DB step4
      6: 5, // Visual Step 6 (Transfo devis) -> DB step5
      7: 6, // Visual Step 7 (Paiement Unipro) -> DB step6
      8: 7, // Visual Step 8 (Paiement contrat) -> DB step7
      9: null, // Visual Step 9 (Avancement) -> Calculé
    },
    labels: [
      "Envoi du contrat", // Visual Step 1
      "Signature du contrat", // Visual Step 2
      "Activation compte Urssaf", // Visual Step 3
      "5 jours ouvrés d'attente", // Visual Step 4
      "Création devis", // Visual Step 5
      "Transformer devis en facture", // Visual Step 6
      "Paiement automatique Unipro", // Visual Step 7
      "Paiement du contrat", // Visual Step 8
      "Avancement du dossier", // Visual Step 9
    ],
  },
  ar_tfd: {
    totalSteps: 6,
    dateSteps: [1, 2, 3, 4, 5], // Les étapes visuelles 1, 2, 3, 4, 5 ont une date
    // Mapping : Etape Visuelle -> Colonne DB
    columnMap: {
      1: 6, // Envoi du contrat -> step6_completed_at
      2: 1, // Signature du contrat -> step1_completed_at
      3: 2, // Création devis -> step2_completed_at
      4: 3, // Transformer devis en facture -> step3_completed_at
      5: 4, // Paiement du contrat -> step4_completed_at
      6: null, // Avancement du dossier -> pas de date spécifique (calculé)
    },
    labels: [
      "Envoi du contrat", // Visuel 1 (DB step6)
      "Signature du contrat", // Visuel 2 (DB step1)
      "Création devis", // Visuel 3 (DB step2)
      "Transformer devis en facture", // Visuel 4 (DB step3)
      "Paiement du contrat", // Visuel 5 (DB step4)
      "Avancement du dossier", // Visuel 6
    ],
  },

  ch_simu_actu_rac: {
    totalSteps: 5,
    dateSteps: [1, 2, 3, 4],
    labels: [
      "Étape 1", // 1
      "Prise de RDV", // 2
      "Facturation", // 3
      "Paiement du contrat", // 4
      "Avancement du dossier", // 5
    ],
  },
  none: {
    totalSteps: 0,
    dateSteps: [],
    labels: [],
  },
};

// ----------- Styles visuels de la timeline (uniquement UI) -----------

const TIMELINE_STYLES = {
  container: {
    position: "relative",
    paddingLeft: "1.5rem",
    marginTop: "0.75rem",
  },
  line: {
    position: "absolute",
    left: "8px",
    top: 0,
    bottom: 0,
    width: "2px",
    backgroundColor: "#e9ecef",
    borderRadius: 999,
  },
  step: {
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    marginBottom: "0.75rem",
  },
  bulletWrapper: {
    position: "relative",
    marginRight: "0.75rem",
    marginLeft: "-2px",
  },
  bulletBase: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "2px solid #ced4da",
    backgroundColor: "#fff",
    zIndex: 2,
  },
  bulletCompleted: {
    borderColor: "#28a745",
    backgroundColor: "#28a745",
  },
  bulletCurrent: {
    borderColor: "#007bff",
    backgroundColor: "#007bff",
    boxShadow: "0 0 0 4px rgba(0,123,255,.15)",
  },
  content: {
    flex: 1,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "4px",
  },
  label: { fontWeight: "bold" },
  chipsWrapper: {
    display: "inline-flex",
    alignItems: "center",
    marginLeft: 0,
    marginTop: 2,
    marginBottom: 2,
  },
  chipBase: {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 999,
    fontWeight: 500,
  },
  chipCurrent: { backgroundColor: "rgba(0,123,255,.08)", color: "#0056b3" },
  chipDone: { backgroundColor: "rgba(40,167,69,.08)", color: "#155724" },
  dateText: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 2,
    display: "flex",
    flexDirection: "column",
  },
};

// Déterminer l'étape "actuelle" pour le visuel (n'affecte pas la logique métier / API)
const getCurrentStepNumber = (typeCode, suivi) => {
  const stepDef = STEP_DEFINITION[typeCode] || STEP_DEFINITION.none;
  if (!stepDef.totalSteps) return null;

  const isStepDone = (stepNumber) => {
    // 💡 Spécial CH/SIMU/ACTU/RAC :
    // on considère l'étape 1 comme "faite" puisqu'on ne l'affiche pas
    if (typeCode === "ch_simu_actu_rac" && stepNumber === 1) {
      return true;
    }

    const hasDate = stepDef.dateSteps.includes(stepNumber);
    if (hasDate) {
      // 💡 Support du mapping de colonnes (pour AR/TFD notamment)
      let dbStepNumber = stepNumber;
      if (stepDef.columnMap && stepDef.columnMap[stepNumber]) {
        dbStepNumber = stepDef.columnMap[stepNumber];
      }
      const col = `step${dbStepNumber}_completed_at`;
      return !!suivi[col];
    }

    if (!stepDef.dateSteps.length) return false;

    // Pour l'étape finale "Avancement du dossier", on vérifie toutes les dates requises
    return stepDef.dateSteps.every((num) => {
      let dbNum = num;
      if (stepDef.columnMap && stepDef.columnMap[num]) {
        dbNum = stepDef.columnMap[num];
      }
      return !!suivi[`step${dbNum}_completed_at`];
    });
  };

  let current = null;
  let allPreviousDone = true;

  for (let stepNumber = 1; stepNumber <= stepDef.totalSteps; stepNumber++) {
    const done = isStepDone(stepNumber);

    if (current === null && !done && allPreviousDone) {
      current = stepNumber;
    }

    if (!done) {
      allPreviousDone = false;
    }
  }

  if (current === null) {
    current = stepDef.totalSteps;
  }

  return current;
};

const SuiviAvancementBox = ({ clientId, onContractUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [suivis, setSuivis] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [historyOpen, setHistoryOpen] = useState({});
  const [error, setError] = useState(null);
  const [hasSignedFile, setHasSignedFile] = useState(false);

  // édition manuelle des dates : { [suiviId]: { [stepNumber]: true } }
  const [editing, setEditing] = useState({});
  // valeurs éditées : { [suiviId]: { [stepNumber]: 'YYYY-MM-DD' } }
  const [editingValues, setEditingValues] = useState({});
  // états de sauvegarde : { [suiviId]: { [stepNumber]: bool } }
  const [saving, setSaving] = useState({});
  // états pour la modal de confirmation de suppression
  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    suiviId: null,
    contractId: null,
  });

  const getConfig = () => ({
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
  });
  const toggleHistory = (suiviId) => {
    setHistoryOpen((prev) => ({
      ...prev,
      [suiviId]: !(prev[suiviId] ?? false),
    }));
  };

  // 1) Récupérer les "documents" du client et ne garder que les contrats
  const fetchContracts = async () => {
    const res = await axios.get(
      `${global.config.server_url}/documents/user/${clientId}`,
      getConfig()
    );

    const docs = Array.isArray(res.data) ? res.data : [];
    const contractsOnly = docs.filter((d) => d.type === "contract");

    return contractsOnly;
  };

  // 2) Récupérer tous les suivis existants pour ce client
  const fetchSuivis = async () => {
    const res = await axios.get(
      `${global.config.server_url}/suivi-avancement/client/${clientId}`,
      getConfig()
    );
    return Array.isArray(res.data) ? res.data : [];
  };

  // 3) Récupérer les fichiers du client
  const fetchFiles = async () => {
    const res = await axios.get(
      `${global.config.server_url}/files?user_id=${clientId}`,
      getConfig()
    );
    return Array.isArray(res.data) ? res.data : [];
  };

  // 4) Synchro Step 1 (signature) depuis les fichiers (dossier = 1)
  const syncStep1FromFiles = async (contractsRes, currentSuivis, files) => {
    const dossier1Files = (files || []).filter((f) => f.dossier === 1);
    const hasFile = dossier1Files.length > 0;
    setHasSignedFile(hasFile);

    if (!hasFile || currentSuivis.length === 0) {
      return currentSuivis;
    }

    const latestFile = dossier1Files.reduce((acc, f) => {
      if (!acc) return f;
      return new Date(f.created_at) > new Date(acc.created_at) ? f : acc;
    }, null);

    if (!latestFile) return currentSuivis;

    const fileDate = latestFile.created_at.replace("T", " ").replace("Z", "");

    await Promise.all(
      currentSuivis.map(async (s) => {
        const contract = contractsRes.find((c) => c.id === s.facture_id);
        const typeCode = getContractTypeCode(contract);
        if (typeCode !== "credit_impot" && typeCode !== "ar_tfd") return;

        // 🔴 IMPORTANT : ne JAMAIS écraser une date déjà renseignée
        if (s.step1_completed_at) {
          // il y a déjà une date (auto ou manuelle) -> on respecte la DB
          return;
        }

        const url = `${global.config.server_url}/suivi-avancement/${s.id}/steps/1`;

        try {
          // ici on ne fait que créer la date si elle est nulle
          await axios.post(url, { date: fileDate }, getConfig());
        } catch (e) {
          console.error(
            `Erreur update step1 pour le suivi ${s.id} avec la date du fichier`,
            e
          );
        }
      })
    );

    const refreshedSuivis = await fetchSuivis();
    return refreshedSuivis;
  };

  // 5) Synchro Step 3 (crédit d'impot) auto = Step 2 + 5 jours ouvrés
  const syncStep3FromStep2 = async (contractsRes, currentSuivis) => {
    let updated = false;

    await Promise.all(
      currentSuivis.map(async (s) => {
        const contract = contractsRes.find((c) => c.id === s.facture_id);
        const typeCode = getContractTypeCode(contract);
        if (typeCode !== "credit_impot") return;

        if (!s.step2_completed_at || s.step3_completed_at) return;

        const inputDate = toDateInputValue(s.step2_completed_at);
        const d3 = addBusinessDays(inputDate, 5);
        if (!d3) return;

        const date3ToSend = fromDateInputValue(d3);
        const url = `${global.config.server_url}/suivi-avancement/${s.id}/steps/3`;

        try {
          await axios.post(url, { date: date3ToSend }, getConfig());
          updated = true;
        } catch (e) {
          console.error("Erreur synchro auto step3 depuis step2", e);
        }
      })
    );

    if (updated) {
      const refreshedSuivis = await fetchSuivis();
      return refreshedSuivis;
    }

    return currentSuivis;
  };

  // 6) Synchro globale : créations manquantes + step1 fichiers + step3 auto
  const syncSuivisForClient = async () => {
    if (!clientId) return;

    setLoading(true);
    setError(null);

    try {
      const [contractsRes, existingSuivis, filesRes] = await Promise.all([
        fetchContracts(),
        fetchSuivis(),
        fetchFiles(),
      ]);

      setContracts(contractsRes);

      const existingByFactureId = new Set(
        (existingSuivis || []).map((s) => s.facture_id)
      );

      const contratsSansSuivi = contractsRes.filter(
        (c) => !existingByFactureId.has(c.id)
      );

      if (contratsSansSuivi.length > 0) {
        await Promise.all(
          contratsSansSuivi.map((contrat) =>
            axios.post(
              `${global.config.server_url}/suivi-avancement`,
              {
                client_id: clientId,
                facture_id: contrat.id,
              },
              getConfig()
            )
          )
        );
      }

      let finalSuivis = await fetchSuivis();
      finalSuivis = await syncStep1FromFiles(
        contractsRes,
        finalSuivis,
        filesRes
      );
      finalSuivis = await syncStep3FromStep2(contractsRes, finalSuivis);

      setSuivis(finalSuivis);
    } catch (e) {
      console.error(e);
      setError("Impossible de synchroniser le suivi d'avancement.");
    } finally {
      setLoading(false);
    }
  };

  // ----------- Edition manuelle d'une date (steps génériques) -----------

  const startEditing = (suiviId, stepNumber, rawValue) => {
    setEditing((prev) => ({
      ...prev,
      [suiviId]: { ...(prev[suiviId] || {}), [stepNumber]: true },
    }));
    setEditingValues((prev) => ({
      ...prev,
      [suiviId]: {
        ...(prev[suiviId] || {}),
        [stepNumber]: rawValue ? toDateInputValue(rawValue) : "",
      },
    }));
  };
  const startEditingDateTime = (suiviId, stepNumber, rawValue) => {
    setEditing((prev) => ({
      ...prev,
      [suiviId]: { ...(prev[suiviId] || {}), [stepNumber]: true },
    }));
    setEditingValues((prev) => ({
      ...prev,
      [suiviId]: {
        ...(prev[suiviId] || {}),
        [stepNumber]: rawValue ? toDateTimeLocalValue(rawValue) : "",
      },
    }));
  };

  const cancelEditing = (suiviId, stepNumber) => {
    setEditing((prev) => ({
      ...prev,
      [suiviId]: { ...(prev[suiviId] || {}), [stepNumber]: false },
    }));
  };

  const saveManualStepDate = async (suivi, stepNumber, typeCode) => {
    const svId = suivi.id;
    const valueForSuivi = editingValues[svId] || {};
    const raw = valueForSuivi[stepNumber];
    if (!raw) return;

    const dateToSend = fromDateInputValue(raw);
    if (!dateToSend) return;

    setSaving((prev) => ({
      ...prev,
      [svId]: { ...(prev[svId] || {}), [stepNumber]: true },
    }));
    setError(null);

    // 💡 Récupération du mapping si existant
    const stepDef = STEP_DEFINITION[typeCode];
    let dbStepNumber = stepNumber;
    if (stepDef && stepDef.columnMap && stepDef.columnMap[stepNumber]) {
      dbStepNumber = stepDef.columnMap[stepNumber];
    }

    const column = `step${dbStepNumber}_completed_at`;
    const hasExistingDate = !!suivi[column];
    const url = `${global.config.server_url}/suivi-avancement/${svId}/steps/${dbStepNumber}`;

    try {
      if (hasExistingDate) {
        await axios.put(url, { date: dateToSend }, getConfig());
      } else {
        await axios.post(url, { date: dateToSend }, getConfig());
      }

      // Cas spécial : crédit d'impot, step 3 (Ex-Step 2 Activation) -> auto step 4 (Ex-Step 3 5 jours) = +5 jours ouvrés
      if (typeCode === "credit_impot" && stepNumber === 3) {
        const d3 = addBusinessDays(raw, 5);
        if (d3) {
          const date3ToSend = fromDateInputValue(d3);
          const step3Url = `${global.config.server_url}/suivi-avancement/${svId}/steps/3`;
          const hasStep3 = !!suivi.step3_completed_at;

          try {
            if (hasStep3) {
              await axios.put(step3Url, { date: date3ToSend }, getConfig());
            } else {
              await axios.post(step3Url, { date: date3ToSend }, getConfig());
            }
          } catch (e) {
            console.error("Erreur mise à jour auto step3 (5 jours)", e);
          }
        }
      }

      const refreshedSuivis = await fetchSuivis();
      setSuivis(refreshedSuivis);
      cancelEditing(svId, stepNumber);
    } catch (e) {
      console.error(e);
      if (e.response) {
        console.error("Server Error Data:", e.response.data);
        console.error("Server Error Status:", e.response.status);
      }
      setError("Erreur lors de la mise à jour de la date.");
    } finally {
      setSaving((prev) => ({
        ...prev,
        [svId]: { ...(prev[svId] || {}), [stepNumber]: false },
      }));
    }
  };
  // Étape 2 (CH/SIMU/ACTU/RAC) : Prise de RDV avec date + heure
  const saveStep2DateTimeChSimu = async (suivi) => {
    const svId = suivi.id;
    const valueForSuivi = editingValues[svId] || {};
    const raw = valueForSuivi[2]; // "YYYY-MM-DDTHH:MM"

    if (!raw) return;

    const dateToSend = fromDateTimeLocalValue(raw);
    if (!dateToSend) return;

    setSaving((prev) => ({
      ...prev,
      [svId]: { ...(prev[svId] || {}), 2: true },
    }));
    setError(null);

    const hasExistingDate = !!suivi.step2_completed_at;
    const url = `${global.config.server_url}/suivi-avancement/${svId}/steps/2`;

    try {
      if (hasExistingDate) {
        await axios.put(url, { date: dateToSend }, getConfig());
      } else {
        await axios.post(url, { date: dateToSend }, getConfig());
      }

      const refreshedSuivis = await fetchSuivis();
      setSuivis(refreshedSuivis);
      cancelEditing(svId, 2);
    } catch (e) {
      console.error("Erreur lors de la mise à jour de la date/heure de RDV", e);
      setError(
        "Erreur lors de la mise à jour de la date/heure pour l'étape 2 (Prise de RDV)."
      );
    } finally {
      setSaving((prev) => ({
        ...prev,
        [svId]: { ...(prev[svId] || {}), 2: false },
      }));
    }
  };

  const validateStep7Date = async (suivi, dateInput, visualStep = 8) => {
    const svId = suivi.id;
    if (!dateInput) return;
    const dateToSend = fromDateInputValue(dateInput); // "YYYY-MM-DD 00:00:00"
    if (!dateToSend) return;

    setSaving((prev) => ({
      ...prev,
      [svId]: { ...(prev[svId] || {}), [visualStep]: true },
    }));
    setError(null);

    const hasExistingDate = !!suivi.step7_completed_at;
    const url = `${global.config.server_url}/suivi-avancement/${svId}/steps/7`;

    try {
      // 1) Mise à jour du suivi d'avancement
      if (hasExistingDate) {
        await axios.put(url, { date: dateToSend }, getConfig());
      } else {
        await axios.post(url, { date: dateToSend }, getConfig());
      }

      // 2) Mise à jour du contrat (sold_dates) dans la table documents
      if (suivi.facture_id) {
        const soldDates = JSON.stringify([dateToSend]);
        const contract = contracts.find((c) => c.id === suivi.facture_id);
        const payload = {
          sold_dates: soldDates,
          status_payment: 2, // Soldé dans tous les cas
        };

        // Si c'est une CH, on passe en Terminé
        if (
          contract &&
          contract.subscribe_services &&
          contract.subscribe_services.includes("CH")
        ) {
          payload.document_state = "Terminé";
        }

        await axios.put(
          `${global.config.server_url}/documents/${suivi.facture_id}`,
          payload,
          getConfig()
        );
      }

      const refreshedSuivis = await fetchSuivis();
      setSuivis(refreshedSuivis);
      cancelEditing(svId, visualStep);
    } catch (e) {
      console.error("Erreur validation step7 (paiement du contrat)", e);
      setError(
        "Erreur lors de la validation de la date pour l'étape 7 (Paiement du contrat)."
      );
    } finally {
      setSaving((prev) => ({
        ...prev,
        [svId]: { ...(prev[svId] || {}), [visualStep]: false },
      }));
    }
  };

  const validateStep3DateChSimu = async (suivi, dateInput) => {
    const svId = suivi.id;
    if (!dateInput) return;
    const dateToSend = fromDateInputValue(dateInput);
    if (!dateToSend) return;

    setSaving((prev) => ({
      ...prev,
      [svId]: { ...(prev[svId] || {}), 3: true },
    }));
    setError(null);

    const hasExistingDate = !!suivi.step3_completed_at;
    const url = `${global.config.server_url}/suivi-avancement/${svId}/steps/3`;

    try {
      if (hasExistingDate) {
        await axios.put(url, { date: dateToSend }, getConfig());
      } else {
        await axios.post(url, { date: dateToSend }, getConfig());
      }
      const refreshedSuivis = await fetchSuivis();
      setSuivis(refreshedSuivis);
      cancelEditing(svId, 3);
    } catch (e) {
      console.error("Erreur validation step3 (CH/SIMU/ACTU/RAC)", e);
      setError(
        "Erreur lors de la validation de la date pour l'étape 3 (Facturation)."
      );
    } finally {
      setSaving((prev) => ({
        ...prev,
        [svId]: { ...(prev[svId] || {}), 3: false },
      }));
    }
  };

  // Validation step 4 (Création devis) avec une date donnée (input YYYY-MM-DD)
  const validateStep4Date = async (suivi, dateInput, visualStep = 5) => {
    const svId = suivi.id;
    if (!dateInput) return;
    const dateToSend = fromDateInputValue(dateInput);
    if (!dateToSend) return;

    setSaving((prev) => ({
      ...prev,
      [svId]: { ...(prev[svId] || {}), [visualStep]: true },
    }));
    setError(null);

    const hasExistingDate = !!suivi.step4_completed_at;
    const url = `${global.config.server_url}/suivi-avancement/${svId}/steps/4`;

    try {
      if (hasExistingDate) {
        await axios.put(url, { date: dateToSend }, getConfig());
      } else {
        await axios.post(url, { date: dateToSend }, getConfig());
      }
      const refreshedSuivis = await fetchSuivis();
      setSuivis(refreshedSuivis);
      cancelEditing(svId, visualStep);
    } catch (e) {
      console.error("Erreur validation step4", e);
      setError(
        "Erreur lors de la validation de la date pour l'étape 4 (Création devis).",
      );
    } finally {
      setSaving((prev) => ({
        ...prev,
        [svId]: { ...(prev[svId] || {}), [visualStep]: false },
      }));
    }
  };

  // Validation step 6 (date step 5 + 2 jours)
  const validateStep6Date = async (suivi, dateInput, visualStep = 7) => {
    const svId = suivi.id;
    if (!dateInput) return;
    const dateToSend = fromDateInputValue(dateInput);
    if (!dateToSend) return;

    setSaving((prev) => ({
      ...prev,
      [svId]: { ...(prev[svId] || {}), [visualStep]: true },
    }));
    setError(null);

    const hasExistingDate = !!suivi.step6_completed_at;
    const url = `${global.config.server_url}/suivi-avancement/${svId}/steps/6`;

    try {
      if (hasExistingDate) {
        await axios.put(url, { date: dateToSend }, getConfig());
      } else {
        await axios.post(url, { date: dateToSend }, getConfig());
      }
      const refreshedSuivis = await fetchSuivis();
      setSuivis(refreshedSuivis);
      cancelEditing(svId, visualStep);
    } catch (e) {
      console.error("Erreur validation step6", e);
      setError(
        "Erreur lors de la validation de la date pour l'étape 6 (Transformer devis).",
      );
    } finally {
      setSaving((prev) => ({
        ...prev,
        [svId]: { ...(prev[svId] || {}), [visualStep]: false },
      }));
    }
  };

  // Ouvre la modal de confirmation de suppression
  const confirmDeleteContract = (suiviId, contractId) => {
    setDeleteConfirm({ show: true, suiviId, contractId });
  };

  // Effectue la suppression après confirmation
  const doDeleteContract = async () => {
    const { suiviId, contractId } = deleteConfirm;
    setDeleteConfirm({ show: false, suiviId: null, contractId: null });

    setLoading(true);
    try {
      // 1) Supprimer le suivi d'avancement
      await axios.delete(
        `${global.config.server_url}/suivi-avancement/${suiviId}`,
        getConfig()
      );

      // 2) Supprimer le contrat (document) associé s'il existe
      if (contractId) {
        await axios.delete(
          `${global.config.server_url}/documents/${contractId}`,
          getConfig(),
        );
      }

      // 3) Rafraîchir les données locales
      const [newContracts, newSuivis] = await Promise.all([
        fetchContracts(),
        fetchSuivis(),
      ]);
      setContracts(newContracts);
      setSuivis(newSuivis);

      // 4) Notifier le composant parent pour rafraîchir la liste des contrats
      if (onContractUpdate) {
        onContractUpdate();
      }
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la suppression.");
    } finally {
      setLoading(false);
    }
  };

  // Marquer un contrat CH comme "Terminé"
  const completeContractCH = async (suivi) => {
    if (!suivi.facture_id) return;

    setLoading(true);
    setError(null);

    try {
      await axios.put(
        `${global.config.server_url}/documents/${suivi.facture_id}`,
        { document_state: "Terminé" },
        getConfig(),
      );

      // Rafraîchir les suivis et les contrats
      const [newContracts, newSuivis] = await Promise.all([
        fetchContracts(),
        fetchSuivis(),
      ]);
      setContracts(newContracts);
      setSuivis(newSuivis);

      // Notifier le composant parent pour rafraîchir la liste des contrats
      if (onContractUpdate) {
        onContractUpdate();
      }
    } catch (e) {
      console.error("Erreur lors de la validation du dossier CH", e);
      setError("Erreur lors de la validation du dossier.");
    } finally {
      setLoading(false);
    }
  };

  const resetStepDate = async (suivi, dbStepNumber) => {
    setError(null);
    try {
      await axios.delete(
        `${global.config.server_url}/suivi-avancement/${suivi.id}/steps/${dbStepNumber}`,
        getConfig()
      );
      const newSuivis = await fetchSuivis();
      setSuivis(newSuivis);
    } catch (e) {
      console.error("Erreur reset step", e);
      setError("Impossible de retirer la date.");
    }
  };

  const reopenContract = async (suivi) => {
    if (!suivi.facture_id) return;
    setLoading(true);
    setError(null);
    try {
      await axios.put(
        `${global.config.server_url}/documents/${suivi.facture_id}`,
        { document_state: "En attente" },
        getConfig()
      );
      const [newContracts, newSuivis] = await Promise.all([
        fetchContracts(),
        fetchSuivis(),
      ]);
      setContracts(newContracts);
      setSuivis(newSuivis);
      if (onContractUpdate) onContractUpdate();
    } catch (e) {
      console.error("Erreur réouverture dossier", e);
      setError("Impossible de réouvrir le dossier.");
    } finally {
      setLoading(false);
    }
  };

  // Step 4 (CH/SIMU/ACTU/RAC) : Paiement du contrat via sold_dates
  const validateStep4PaymentChSimu = async (suivi, dateInput) => {
    const svId = suivi.id;
    if (!dateInput) return;
    const dateToSend = fromDateInputValue(dateInput);
    if (!dateToSend) return;

    setSaving((prev) => ({
      ...prev,
      [svId]: { ...(prev[svId] || {}), 4: true },
    }));
    setError(null);

    const hasExistingDate = !!suivi.step4_completed_at;
    const url = `${global.config.server_url}/suivi-avancement/${svId}/steps/4`;

    try {
      // 1) mise à jour du suivi d'avancement
      if (hasExistingDate) {
        await axios.put(url, { date: dateToSend }, getConfig());
      } else {
        await axios.post(url, { date: dateToSend }, getConfig());
      }

      // 2) mise à jour du contrat (sold_dates) dans documents
      // 2) mise à jour du contrat (sold_dates) dans documents
      if (suivi.facture_id) {
        const soldDates = JSON.stringify([dateToSend]);
        const contract = contracts.find((c) => c.id === suivi.facture_id);
        const payload = {
          sold_dates: soldDates,
          status_payment: 2, // Soldé dans tous les cas
        };

        // Si c'est une CH, on passe en Terminé
        if (
          contract &&
          contract.subscribe_services &&
          contract.subscribe_services.includes("CH")
        ) {
          payload.document_state = "Terminé";
        }

        await axios.put(
          `${global.config.server_url}/documents/${suivi.facture_id}`,
          payload,
          getConfig(),
        );
      }

      const refreshedSuivis = await fetchSuivis();
      setSuivis(refreshedSuivis);
      cancelEditing(svId, 4);
    } catch (e) {
      console.error(
        "Erreur validation step4 (paiement contrat CH/SIMU/ACTU/RAC)",
        e,
      );
      setError(
        "Erreur lors de la validation de la date de paiement (CH/SIMU/ACTU/RAC).",
      );
    } finally {
      setSaving((prev) => ({
        ...prev,
        [svId]: { ...(prev[svId] || {}), 4: false },
      }));
    }
  };

  // Step 5 (AR/TFD - Visual) : Paiement du contrat via sold_dates (DB Step 4)
  const validateStep4PaymentArTfd = async (suivi, dateInput) => {
    const svId = suivi.id;
    if (!dateInput) return;
    const dateToSend = fromDateInputValue(dateInput);
    if (!dateToSend) return;

    // On utilise l'index VISUEL (5) pour l'état de saving/editing local
    setSaving((prev) => ({
      ...prev,
      [svId]: { ...(prev[svId] || {}), 5: true },
    }));
    setError(null);

    // DB : c'est bien step4
    const hasExistingDate = !!suivi.step4_completed_at;
    const url = `${global.config.server_url}/suivi-avancement/${svId}/steps/4`;

    try {
      // 1) mise à jour du suivi d'avancement
      if (hasExistingDate) {
        await axios.put(url, { date: dateToSend }, getConfig());
      } else {
        await axios.post(url, { date: dateToSend }, getConfig());
      }

      // 2) mise à jour du contrat (sold_dates) dans documents
      if (suivi.facture_id) {
        const soldDates = JSON.stringify([dateToSend]);
        const contract = contracts.find((c) => c.id === suivi.facture_id);
        const payload = {
          sold_dates: soldDates,
          status_payment: 2, // Soldé dans tous les cas
        };

        // Si c'est une CH, on passe en Terminé (pas le cas ici car AR/TFD, mais on garde la logique au cas où)
        if (
          contract &&
          contract.subscribe_services &&
          contract.subscribe_services.includes("CH")
        ) {
          payload.document_state = "Terminé";
        }

        await axios.put(
          `${global.config.server_url}/documents/${suivi.facture_id}`,
          payload,
          getConfig(),
        );
      }

      const refreshedSuivis = await fetchSuivis();
      setSuivis(refreshedSuivis);
      cancelEditing(svId, 5); // Index visuel
    } catch (e) {
      console.error("Erreur validation step4 (paiement contrat AR/TFD)", e);
      setError("Erreur lors de la validation de la date de paiement (AR/TFD).");
    } finally {
      setSaving((prev) => ({
        ...prev,
        [svId]: { ...(prev[svId] || {}), 5: false },
      }));
    }
  };

  useEffect(() => {
    if (clientId) {
      syncSuivisForClient();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  return (
    <>
      {/* Modal de confirmation de suppression */}
      <SweetAlert
        title="Êtes-vous sûr ?"
        warning
        show={deleteConfirm.show}
        showCancel
        reverseButtons
        cancelBtnBsStyle="primary"
        confirmBtnBsStyle="danger"
        confirmBtnText="Oui, supprimer"
        cancelBtnText="Annuler"
        onConfirm={doDeleteContract}
        onCancel={() =>
          setDeleteConfirm({ show: false, suiviId: null, contractId: null })
        }
      >
        Cette action est irréversible.
      </SweetAlert>

      <Card className="mt-1">
        <CardBody>
          <div className="d-flex justify-content-between align-items-start mb-1 flex-wrap">
            <div className="mb-50 mb-sm-0">
              <h5 className="mb-0">Suivi d'avancement</h5>
              {suivis.length > 0 && (
                <span className="text-muted small">
                  {suivis.length} contrat(s) suivi(s)
                </span>
              )}
            </div>
            <Button
              size="sm"
              color="primary"
              outline
              onClick={syncSuivisForClient}
              className="ml-auto ml-sm-0"
            >
              <RefreshCcw size={16} className="mr-25" />
            </Button>
          </div>

          {loading && (
            <div className="d-flex align-items-center">
              <Spinner size="sm" className="mr-50" /> <span>Chargement...</span>
            </div>
          )}

          {error && <div className="text-danger">{error}</div>}

          {!loading && !error && suivis.length === 0 && (
            <div className="text-muted">
              Aucun suivi d'avancement pour ce client.
            </div>
          )}

          {!loading && !error && suivis.length > 0 && (
            <div>
              {suivis.map((s) => {
                const contract = contracts.find((c) => c.id === s.facture_id);
                const typeCode = getContractTypeCode(contract);
                const typeLabel = getContractTypeLabel(contract);
                const stepDef =
                  STEP_DEFINITION[typeCode] || STEP_DEFINITION.none;
                const badgeClass =
                  BADGE_CLASS_BY_TYPE[typeCode] || BADGE_CLASS_BY_TYPE.none;

                const currentStepNumber = getCurrentStepNumber(typeCode, s);
                const isContractFinished =
                  contract && contract.document_state === "Terminé";
                const historyState = historyOpen[s.id];
                // Par défaut : ouvert si pas terminé, fermé si terminé
                const isHistoryOpen =
                  historyState !== undefined
                    ? historyState
                    : !isContractFinished;
                return (
                  <div
                    key={s.id}
                    className="border rounded p-50 mb-50"
                    style={{ fontSize: 13 }}
                  >
                    <div className="d-flex flex-wrap justify-content-between align-items-start mb-50">
                      <div className="mb-50 mb-sm-0">
                        <div className="font-weight-bold">
                          Contrat #{s.facture_id}
                        </div>
                        {contract && contract.title && (
                          <div className="text-muted small pr-1">
                            {contract.title}
                          </div>
                        )}
                      </div>
                      <div
                        className="d-flex align-items-center justify-content-end flex-wrap"
                        style={{ flex: 1, minWidth: "120px" }}
                      >
                        <span
                          className={`${badgeClass} my-25 mr-50`}
                          style={{
                            whiteSpace: "normal",
                            textAlign: "right",
                            maxWidth: "100%",
                          }}
                        >
                          {typeLabel}
                        </span>
                        <Button
                          color="flat-danger"
                          size="sm"
                          className="btn-icon rounded-circle p-0"
                          style={{ width: 24, height: 24, flexShrink: 0 }}
                          onClick={() =>
                            confirmDeleteContract(
                              s.id,
                              contract ? contract.id : null,
                            )
                          }
                          title="Supprimer ce contrat"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>

                    {stepDef.totalSteps === 0 ? (
                      <div className="text-muted">
                        Pas de prestation, aucune étape.
                      </div>
                    ) : (
                      <>
                        {isContractFinished && (
                          <div className="d-flex flex-wrap justify-content-between align-items-center mb-50">
                            <span className="text-success font-weight-bold mr-1 mb-25">
                              Dossier terminé
                            </span>

                            <Button
                              color="link"
                              size="sm"
                              className="p-0 d-flex align-items-center mb-25"
                              onClick={() => toggleHistory(s.id)}
                            >
                              {isHistoryOpen ? (
                                <>
                                  <span
                                    className="mr-25"
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: 18,
                                      height: 18,
                                      borderRadius: 4,
                                      border: "1px solid #6c757d",
                                    }}
                                  >
                                    <ChevronUp size={12} />
                                  </span>
                                  <span className="small">
                                    Masquer l'historique
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span
                                    className="mr-25"
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: 18,
                                      height: 18,
                                      borderRadius: 4,
                                      border: "1px solid #6c757d",
                                    }}
                                  >
                                    <ChevronDown size={12} />
                                  </span>
                                  <span className="small">
                                    Afficher l'historique
                                  </span>
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {(!isContractFinished || isHistoryOpen) && (
                          <div style={TIMELINE_STYLES.container}>
                            <div style={TIMELINE_STYLES.line} />
                            {Array.from({
                              length: stepDef.totalSteps,
                            }).map((_, index) => {
                              const stepNumber = index + 1;
                              const hasDate =
                                stepDef.dateSteps.includes(stepNumber);

                              // 💡 Mapping colonne DB
                              let dbStepNumber = stepNumber;
                              if (
                                stepDef.columnMap &&
                                stepDef.columnMap[stepNumber]
                              ) {
                                dbStepNumber = stepDef.columnMap[stepNumber];
                              }

                              const column = hasDate
                                ? `step${dbStepNumber}_completed_at`
                                : null;
                              const dbRaw =
                                column && s[column] ? s[column] : null;
                              const hasExistingDate = !!dbRaw; // ✅ maintenant c’est bon

                              const dbInput = dbRaw
                                ? toDateInputValue(dbRaw)
                                : null;
                              const label =
                                stepDef.labels[stepNumber - 1] ||
                                `Étape ${stepNumber}`;
                              const isCreditImpot = typeCode === "credit_impot";
                              const isStep1Signature = stepNumber === 2; // Signature est maintenant Step 2 pour AR/TFD, Credit Impot et CH/SIMU

                              const isEnvoiStep =
                                (typeCode === "ar_tfd" || isCreditImpot) &&
                                stepNumber === 1;
                              // const isArTfdEnvoi =
                              //   isEnvoiStep && typeCode === "ar_tfd"; // Gardé pour compatibilité si utilisé ailleurs

                              const isCreditImpotStep3 = // Ex-Step 2 (Activation Urssaf)
                                isCreditImpot && stepNumber === 3;
                              // const isCreditImpotStep3 = // Ex-Step 3 (5 jours) -> Maintenat Step 4
                              const isFiveDaysWaitStep =
                                typeCode === "credit_impot" && stepNumber === 4;

                              const isCreditImpotStep5 = // Ex-Step 4 (Devis)
                                isCreditImpot && stepNumber === 5;
                              const isCreditImpotStep6 = // Ex-Step 5 (Transfo)
                                isCreditImpot && stepNumber === 6;
                              const isCreditImpotStep7 = // Ex-Step 6 (Paiement Unipro)
                                isCreditImpot && stepNumber === 7;
                              const isCreditImpotStep8 = // Ex-Step 7 (Paiement Contrat)
                                isCreditImpot && stepNumber === 8;
                              const isCreditImpotStep9 = // Ex-Step 8 (Avancement)
                                isCreditImpot && stepNumber === 9;

                              if (
                                typeCode === "ch_simu_actu_rac" &&
                                stepNumber === 1
                              ) {
                                return null;
                              }

                              const isChSimuStep2 =
                                typeCode === "ch_simu_actu_rac" &&
                                stepNumber === 2;
                              const isChSimuStep3 =
                                typeCode === "ch_simu_actu_rac" &&
                                stepNumber === 3;
                              const isChSimuStep5 =
                                typeCode === "ch_simu_actu_rac" &&
                                stepNumber === 5;

                              const isChSimuStep4 =
                                typeCode === "ch_simu_actu_rac" &&
                                stepNumber === 4;
                              const isArTfdStep5 =
                                typeCode === "ar_tfd" && stepNumber === 5; // Paiement du contrat (visuel 5, DB step4)

                              const isArTfdStep6 =
                                typeCode === "ar_tfd" && stepNumber === 6; // Avancement (visuel 6)

                              const isEditing =
                                editing[s.id]?.[stepNumber] === true;
                              const editingValueInput =
                                (editingValues[s.id] &&
                                  editingValues[s.id][stepNumber]) ||
                                null;

                              // ----- Dates candidates par défaut -----
                              let displayDateInput = dbInput;

                              // Step 3 :
                              // - Crédit d'impôt : vient de la DB uniquement (générée auto depuis step2)
                              // - CH/SIMU/ACTU/RAC : même date que step 2 par défaut (puis validation)
                              let step3CandidateInput = null;
                              const step3Validated = !!s.step3_completed_at;
                              const step2Input = s.step2_completed_at
                                ? toDateInputValue(s.step2_completed_at)
                                : null;

                              if (isChSimuStep3) {
                                if (isEditing) {
                                  step3CandidateInput =
                                    editingValueInput || dbInput || step2Input;
                                } else {
                                  step3CandidateInput =
                                    dbInput || step2Input || null;
                                }
                                displayDateInput = step3CandidateInput || null;
                              }

                              // Step 4 : même date que step 3 par défaut (puis validation)
                              let step4CandidateInput = null;
                              const step3Input = s.step3_completed_at
                                ? toDateInputValue(s.step3_completed_at)
                                : null;
                              // const step4Validated = !!s.step4_completed_at;

                              // Step 5 (Ex-Step 4) : Devis (Crédit d'impôt)
                              // Se base sur step 4 (Ex-Step 3) "5 jours" (DB Step 3) qui dérive de step 3 (Ex-Step 2) "Activation" (DB Step 2)
                              // ...
                              if (isCreditImpotStep5) {
                                if (isEditing) {
                                  step4CandidateInput =
                                    editingValueInput || dbInput || step3Input;
                                } else {
                                  step4CandidateInput =
                                    dbInput || step3Input || null;
                                }
                                displayDateInput = step4CandidateInput || null;
                              }

                              // Step 6 (Ex-Step 5) : Transfo Devis
                              // Manuelle
                              let step5CandidateInput = null;
                              const step5Validated = !!s.step5_completed_at;

                              if (isCreditImpotStep6) {
                                if (isEditing) {
                                  step5CandidateInput =
                                    editingValueInput || dbInput || "";
                                } else {
                                  step5CandidateInput = dbInput || null;
                                }
                                displayDateInput = step5CandidateInput || null;
                              }

                              // Step 7 (Ex-Step 6) : Paiement Unipro (Auto +2j)
                              let step6CandidateInput = null;
                              const step5Input = s.step5_completed_at
                                ? toDateInputValue(s.step5_completed_at)
                                : null;
                              const autoFromStep5 = step5Input
                                ? addDays(step5Input, 2)
                                : null;
                              const step6Validated = !!s.step6_completed_at;

                              if (isCreditImpotStep7) {
                                if (isEditing) {
                                  step6CandidateInput =
                                    editingValueInput ||
                                    dbInput ||
                                    autoFromStep5;
                                } else {
                                  step6CandidateInput =
                                    dbInput || autoFromStep5 || null;
                                }
                                displayDateInput = step6CandidateInput || null;
                              }

                              // ... (step3 CH, step4/5/6 crédit d'impôt que tu as déjà) ...

                              // Première date de sold_dates du contrat (utilisée pour les paiements)
                              const soldFirstInput = contract
                                ? getFirstDateFromValue(contract.sold_dates)
                                : null;

                              // Step 4 CH/SIMU/ACTU/RAC : Paiement du contrat (via sold_dates)
                              let step4ChSimuCandidateInput = null;
                              const step4ChSimuValidated =
                                !!s.step4_completed_at;

                              if (isChSimuStep4) {
                                if (isEditing) {
                                  step4ChSimuCandidateInput =
                                    editingValueInput ||
                                    dbInput ||
                                    soldFirstInput;
                                } else {
                                  step4ChSimuCandidateInput =
                                    dbInput || soldFirstInput || null;
                                }
                                displayDateInput =
                                  step4ChSimuCandidateInput || null;
                              }

                              // Step 5 AR/TFD (Visual) : Paiement du contrat (via sold_dates) -> DB Step 4
                              let step5ArTfdCandidateInput = null;
                              // const step5ArTfdValidated = !!s.step4_completed_at; // car mappé vers 4

                              if (isArTfdStep5) {
                                if (isEditing) {
                                  step5ArTfdCandidateInput =
                                    editingValueInput ||
                                    dbInput ||
                                    soldFirstInput;
                                } else {
                                  step5ArTfdCandidateInput =
                                    dbInput || soldFirstInput || null;
                                }
                                displayDateInput =
                                  step5ArTfdCandidateInput || null;
                              }

                              // Step 8 (Ex-Step 7) : Paiement du contrat (crédit d'impôt) via sold_dates
                              let step7CandidateInput = null;
                              const step7Validated = !!s.step7_completed_at;

                              if (isCreditImpotStep8) {
                                if (isEditing) {
                                  step7CandidateInput =
                                    editingValueInput ||
                                    dbInput ||
                                    soldFirstInput;
                                } else {
                                  step7CandidateInput =
                                    dbInput || soldFirstInput || null;
                                }
                                displayDateInput = step7CandidateInput || null;
                              }

                              // ----- Affichage et statut -----

                              let displayValue = "-";
                              let isCompleted = false;

                              if (isCreditImpotStep9) {
                                // Crédit d'impôt : Avancement du dossier = steps 1..8 remplies
                                const allDone =
                                  STEP_DEFINITION.credit_impot.dateSteps
                                    .filter((num) => num <= 8)
                                    .every((num) => {
                                      const dbNum =
                                        STEP_DEFINITION.credit_impot.columnMap[
                                          num
                                        ];
                                      return !!s[`step${dbNum}_completed_at`];
                                    });

                                if (isContractFinished) {
                                  // ✅ Contrat terminé → priorité max
                                  displayValue = "Dossier terminé";
                                  isCompleted = true;
                                } else {
                                  displayValue = allDone
                                    ? "Dossier en cours de traitement"
                                    : "Dossier en attente";
                                  isCompleted = allDone;
                                }
                              } else if (isArTfdStep6) {
                                // AR/TFD : Avancement du dossier (Visual 6) = toutes les steps avec date (1..5)
                                // Le stepDef.dateSteps contient déjà les mappings corrects
                                const allDone =
                                  STEP_DEFINITION.ar_tfd.dateSteps.every(
                                    (num) => {
                                      const dbNum =
                                        STEP_DEFINITION.ar_tfd.columnMap[num];
                                      return !!s[`step${dbNum}_completed_at`];
                                    },
                                  );

                                if (isContractFinished) {
                                  displayValue = "Dossier terminé";
                                  isCompleted = true;
                                } else {
                                  displayValue = allDone
                                    ? "Dossier en cours de traitement"
                                    : "Dossier en attente";
                                  isCompleted = allDone;
                                }
                                isCompleted = allDone; // Bug fix: ensure isCompleted is set correctly
                              } else if (isChSimuStep5) {
                                // CH/SIMU/ACTU/RAC : Avancement du dossier
                                const allDone = !!s.step4_completed_at;

                                if (isContractFinished) {
                                  displayValue = "Dossier terminé";
                                  isCompleted = true;
                                } else {
                                  displayValue = allDone
                                    ? "Dossier en cours de traitement"
                                    : "Dossier en attente";
                                  isCompleted = allDone;
                                }
                              } else {
                                // Steps classiques avec date
                                if (isChSimuStep2) {
                                  // Pour "Prise de RDV", on affiche date + heure
                                  displayValue = dbRaw
                                    ? formatDisplayDateTime(dbRaw)
                                    : "-";
                                } else {
                                  displayValue = displayDateInput
                                    ? formatDisplayDate(displayDateInput)
                                    : "-";
                                }

                                if (hasDate && dbRaw) {
                                  isCompleted = true;
                                }
                              }
                              const isArTfdGenericEditable =
                                typeCode === "ar_tfd" && stepNumber !== 5;

                              const canEditDate =
                                hasDate &&
                                (isStep1Signature || // Signature (Step 2 pour AR/TFD, Step 1 pour autres)
                                  isEnvoiStep || // Envoi (Step 1 pour AR/TFD et Credit Impot)
                                  isCreditImpotStep3 || // Activation Urssaf (Ex-Step 2)
                                  isChSimuStep2 ||
                                  isArTfdGenericEditable);
                              const isEditingGeneric =
                                isEditing &&
                                (isStep1Signature ||
                                  isEnvoiStep ||
                                  isCreditImpotStep3 ||
                                  isChSimuStep2 ||
                                  isArTfdGenericEditable);
                              const isAvancementStep =
                                isCreditImpotStep9 ||
                                isArTfdStep6 ||
                                isChSimuStep5;
                              let isCurrent = currentStepNumber === stepNumber;

                              if (isContractFinished && isAvancementStep) {
                                isCurrent = false;
                              }
                              const bulletStyle = {
                                ...TIMELINE_STYLES.bulletBase,
                                ...(isCompleted
                                  ? TIMELINE_STYLES.bulletCompleted
                                  : {}),
                                ...(isCurrent
                                  ? TIMELINE_STYLES.bulletCurrent
                                  : {}),
                              };
                              const labelStyle = {
                                ...TIMELINE_STYLES.label,
                                ...(isFiveDaysWaitStep
                                  ? {
                                      fontWeight: "normal",
                                      fontStyle: "italic",
                                    }
                                  : {}),
                              };

                              return (
                                <div
                                  key={stepNumber}
                                  style={TIMELINE_STYLES.step}
                                >
                                  <div style={TIMELINE_STYLES.bulletWrapper}>
                                    {!isFiveDaysWaitStep && (
                                      <div style={bulletStyle} />
                                    )}
                                  </div>
                                  <div style={TIMELINE_STYLES.content}>
                                    <div style={TIMELINE_STYLES.headerRow}>
                                      <div>
                                        <span style={labelStyle}>{label}</span>
                                        {(isCurrent || isCompleted) &&
                                          !isFiveDaysWaitStep && (
                                            <span
                                              style={{
                                                ...TIMELINE_STYLES.chipsWrapper,
                                              }}
                                            >
                                              <span
                                                style={{
                                                  ...TIMELINE_STYLES.chipBase,
                                                  ...(isCurrent
                                                    ? TIMELINE_STYLES.chipCurrent
                                                    : TIMELINE_STYLES.chipDone),
                                                }}
                                              >
                                                {isCurrent
                                                  ? "Étape actuelle"
                                                  : "Terminée"}
                                              </span>
                                            </span>
                                          )}
                                      </div>
                                      <div className="d-flex align-items-center ml-1">
                                        {hasDate &&
                                          canEditDate &&
                                          !isChSimuStep2 && (
                                            <>
                                              {isEditingGeneric ? (
                                                <>
                                                  <Input
                                                    type="date"
                                                    // bsSize="sm"  ❌ on enlève => input plus grand
                                                    value={
                                                      (editingValues[s.id] &&
                                                        editingValues[s.id][
                                                          stepNumber
                                                        ]) ??
                                                      dbInput ??
                                                      ""
                                                    }
                                                    onChange={(e) => {
                                                      const newValue =
                                                        e.target.value;
                                                      setEditingValues(
                                                        (prev) => ({
                                                          ...prev,
                                                          [s.id]: {
                                                            ...(prev[s.id] ||
                                                              {}),
                                                            [stepNumber]:
                                                              newValue,
                                                          },
                                                        }),
                                                      );
                                                    }}
                                                    className="mr-50"
                                                    style={{ maxWidth: 190 }} // un peu plus large
                                                  />
                                                  <Button
                                                    color="primary"
                                                    // size="sm" ❌ on enlève => bouton plus gros
                                                    disabled={
                                                      saving[s.id]?.[
                                                        stepNumber
                                                      ] === true
                                                    }
                                                    className="mr-25"
                                                    onClick={() =>
                                                      saveManualStepDate(
                                                        s,
                                                        stepNumber,
                                                        typeCode,
                                                      )
                                                    }
                                                  >
                                                    {saving[s.id]?.[stepNumber]
                                                      ? "..."
                                                      : "Valider"}
                                                  </Button>
                                                  <Button
                                                    color="link"
                                                    size="sm"
                                                    className="p-0 d-flex align-items-center"
                                                    onClick={() =>
                                                      cancelEditing(
                                                        s.id,
                                                        stepNumber,
                                                      )
                                                    }
                                                    title="Annuler"
                                                  >
                                                    <X size={16} />
                                                  </Button>
                                                </>
                                              ) : (
                                                <>
                                                  {/* PAS DE DATE → bouton "Ajouter une date" UNIQUEMENT pour l'étape actuelle */}
                                                  {!hasExistingDate &&
                                                    isCurrent && (
                                                      <Button
                                                        color="link"
                                                        size="sm"
                                                        className="p-0 d-flex align-items-center"
                                                        onClick={() =>
                                                          startEditing(
                                                            s.id,
                                                            stepNumber,
                                                            dbRaw,
                                                          )
                                                        }
                                                        title="Ajouter une date"
                                                      >
                                                        <PlusCircle
                                                          size={14}
                                                          className="mr-25"
                                                        />
                                                        <span>
                                                          Ajouter une date
                                                        </span>
                                                      </Button>
                                                    )}

                                                  {/* DATE DÉJÀ REMPLIE → bouton Edit */}
                                                  {hasExistingDate && (
                                                    <Button
                                                      color="link"
                                                      size="sm"
                                                      className="p-0"
                                                      onClick={() =>
                                                        startEditing(
                                                          s.id,
                                                          stepNumber,
                                                          dbRaw,
                                                        )
                                                      }
                                                      title="Modifier la date"
                                                    >
                                                      <Edit size={14} />
                                                    </Button>
                                                  )}
                                                </>
                                              )}
                                            </>
                                          )}
                                        {isChSimuStep2 && (
                                          <>
                                            {isEditing ? (
                                              <>
                                                <Input
                                                  type="datetime-local"
                                                  value={
                                                    (editingValues[s.id] &&
                                                      editingValues[s.id][2]) ||
                                                    (dbRaw
                                                      ? toDateTimeLocalValue(
                                                          dbRaw,
                                                        )
                                                      : "")
                                                  }
                                                  onChange={(e) => {
                                                    const newValue =
                                                      e.target.value;
                                                    setEditingValues(
                                                      (prev) => ({
                                                        ...prev,
                                                        [s.id]: {
                                                          ...(prev[s.id] || {}),
                                                          2: newValue,
                                                        },
                                                      }),
                                                    );
                                                  }}
                                                  className="mr-50"
                                                  style={{ maxWidth: 220 }}
                                                />
                                                <Button
                                                  color="primary"
                                                  disabled={
                                                    saving[s.id]?.[2] === true
                                                  }
                                                  className="mr-25"
                                                  onClick={() =>
                                                    saveStep2DateTimeChSimu(s)
                                                  }
                                                >
                                                  {saving[s.id]?.[2]
                                                    ? "Validation..."
                                                    : "Valider"}
                                                </Button>
                                                <Button
                                                  color="link"
                                                  size="sm"
                                                  className="p-0 d-flex align-items-center"
                                                  onClick={() =>
                                                    cancelEditing(s.id, 2)
                                                  }
                                                  title="Annuler"
                                                >
                                                  <X size={16} />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                {!hasExistingDate &&
                                                  isCurrent && (
                                                    <Button
                                                      color="link"
                                                      size="sm"
                                                      className="p-0 d-flex align-items-center"
                                                      onClick={() =>
                                                        startEditingDateTime(
                                                          s.id,
                                                          2,
                                                          dbRaw,
                                                        )
                                                      }
                                                      title="Ajouter date & heure"
                                                    >
                                                      <PlusCircle
                                                        size={14}
                                                        className="mr-25"
                                                      />
                                                      <span>
                                                        Ajouter date & heure
                                                      </span>
                                                    </Button>
                                                  )}

                                                {hasExistingDate && (
                                                  <Button
                                                    color="link"
                                                    size="sm"
                                                    className="p-0"
                                                    onClick={() =>
                                                      startEditingDateTime(
                                                        s.id,
                                                        2,
                                                        dbRaw,
                                                      )
                                                    }
                                                    title="Modifier la date & heure"
                                                  >
                                                    <Edit size={14} />
                                                  </Button>
                                                )}
                                              </>
                                            )}
                                          </>
                                        )}

                                        {/* Étape 3 (CH/SIMU/ACTU/RAC) - Facturation */}
                                        {isChSimuStep3 && (
                                          <>
                                            {isEditing ? (
                                              <>
                                                <Input
                                                  type="date"
                                                  value={
                                                    step3CandidateInput || ""
                                                  }
                                                  onChange={(e) => {
                                                    const newValue =
                                                      e.target.value;
                                                    setEditingValues(
                                                      (prev) => ({
                                                        ...prev,
                                                        [s.id]: {
                                                          ...(prev[s.id] || {}),
                                                          3: newValue,
                                                        },
                                                      }),
                                                    );
                                                  }}
                                                  className="mr-50"
                                                  style={{ maxWidth: 190 }}
                                                />
                                                <Button
                                                  color="primary"
                                                  disabled={
                                                    saving[s.id]?.[3] === true
                                                  }
                                                  className="mr-25"
                                                  onClick={() =>
                                                    validateStep3DateChSimu(
                                                      s,
                                                      (editingValues[s.id] &&
                                                        editingValues[
                                                          s.id
                                                        ][3]) ||
                                                        step3CandidateInput,
                                                    )
                                                  }
                                                >
                                                  {saving[s.id]?.[3]
                                                    ? "Validation..."
                                                    : "Valider"}
                                                </Button>
                                                <Button
                                                  color="link"
                                                  size="sm"
                                                  className="p-0 d-flex align-items-center"
                                                  onClick={() =>
                                                    cancelEditing(s.id, 3)
                                                  }
                                                  title="Annuler"
                                                >
                                                  <X size={16} />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                {!step3Validated &&
                                                  step3CandidateInput && (
                                                    <Button
                                                      color="primary"
                                                      className="mr-25"
                                                      disabled={
                                                        saving[s.id]?.[3] ===
                                                        true
                                                      }
                                                      onClick={() =>
                                                        validateStep3DateChSimu(
                                                          s,
                                                          step3CandidateInput,
                                                        )
                                                      }
                                                    >
                                                      {saving[s.id]?.[3]
                                                        ? "Validation..."
                                                        : "Valider"}
                                                    </Button>
                                                  )}

                                                {step3Validated && (
                                                  <>
                                                    <Button
                                                      color="link"
                                                      size="sm"
                                                      className="p-0"
                                                      onClick={() =>
                                                        startEditing(
                                                          s.id,
                                                          3,
                                                          step3CandidateInput ||
                                                            s.step3_completed_at ||
                                                            s.step2_completed_at,
                                                        )
                                                      }
                                                      title="Modifier la date"
                                                    >
                                                      <Edit size={14} />
                                                    </Button>
                                                  </>
                                                )}
                                              </>
                                            )}
                                          </>
                                        )}
                                        {/* Étape 4 (CH/SIMU/ACTU/RAC) - Paiement du contrat (sold_dates) */}
                                        {/* Étape 4 (CH/SIMU/ACTU/RAC) - Paiement du contrat (sold_dates) */}
                                        {isChSimuStep4 && (
                                          <>
                                            {isEditing ? (
                                              <>
                                                <Input
                                                  type="date"
                                                  value={
                                                    step4ChSimuCandidateInput ||
                                                    ""
                                                  }
                                                  onChange={(e) => {
                                                    const newValue =
                                                      e.target.value;
                                                    setEditingValues(
                                                      (prev) => ({
                                                        ...prev,
                                                        [s.id]: {
                                                          ...(prev[s.id] || {}),
                                                          4: newValue,
                                                        },
                                                      }),
                                                    );
                                                  }}
                                                  className="mr-50"
                                                  style={{ maxWidth: 190 }}
                                                />
                                                <Button
                                                  color="primary"
                                                  disabled={
                                                    saving[s.id]?.[4] === true
                                                  }
                                                  className="mr-25"
                                                  onClick={() =>
                                                    validateStep4PaymentChSimu(
                                                      s,
                                                      (editingValues[s.id] &&
                                                        editingValues[
                                                          s.id
                                                        ][4]) ||
                                                        step4ChSimuCandidateInput,
                                                    )
                                                  }
                                                >
                                                  {saving[s.id]?.[4]
                                                    ? "Validation..."
                                                    : "Valider"}
                                                </Button>
                                                <Button
                                                  color="link"
                                                  size="sm"
                                                  className="p-0 d-flex align-items-center"
                                                  onClick={() =>
                                                    cancelEditing(s.id, 4)
                                                  }
                                                  title="Annuler"
                                                >
                                                  <X size={16} />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                {/* Valider uniquement si étape actuelle */}
                                                {!step4ChSimuValidated &&
                                                  step4ChSimuCandidateInput &&
                                                  isCurrent && (
                                                    <Button
                                                      color="primary"
                                                      className="mr-25"
                                                      disabled={
                                                        saving[s.id]?.[4] ===
                                                        true
                                                      }
                                                      onClick={() =>
                                                        validateStep4PaymentChSimu(
                                                          s,
                                                          step4ChSimuCandidateInput,
                                                        )
                                                      }
                                                    >
                                                      {saving[s.id]?.[4]
                                                        ? "Validation..."
                                                        : "Valider"}
                                                    </Button>
                                                  )}

                                                {/* Ajouter uniquement si étape actuelle */}
                                                {!step4ChSimuValidated &&
                                                  !step4ChSimuCandidateInput &&
                                                  isCurrent && (
                                                    <Button
                                                      color="link"
                                                      size="sm"
                                                      className="p-0 d-flex align-items-center"
                                                      onClick={() =>
                                                        startEditing(
                                                          s.id,
                                                          4,
                                                          "",
                                                        )
                                                      }
                                                      title="Ajouter une date"
                                                    >
                                                      <PlusCircle
                                                        size={14}
                                                        className="mr-25"
                                                      />
                                                      <span>
                                                        Ajouter une date
                                                      </span>
                                                    </Button>
                                                  )}

                                                {/* Modifier toujours possible */}
                                                {step4ChSimuValidated && (
                                                  <>
                                                    <Button
                                                      color="link"
                                                      size="sm"
                                                      className="p-0"
                                                      onClick={() =>
                                                        startEditing(
                                                          s.id,
                                                          4,
                                                          step4ChSimuCandidateInput ||
                                                            s.step4_completed_at ||
                                                            soldFirstInput,
                                                        )
                                                      }
                                                      title="Modifier la date"
                                                    >
                                                      <Edit size={14} />
                                                    </Button>
                                                  </>
                                                )}
                                              </>
                                            )}
                                          </>
                                        )}

                                        {/* Étape 5 (CH/SIMU/ACTU/RAC) - Avancement du dossier - Bouton Valider */}
                                        {isChSimuStep5 &&
                                          !isContractFinished &&
                                          !!s.step4_completed_at && (
                                            <Button
                                              color="success"
                                              size="sm"
                                              disabled={loading}
                                              onClick={() =>
                                                completeContractCH(s)
                                              }
                                              title="Valider le dossier"
                                            >
                                              {loading
                                                ? "Validation..."
                                                : "Valider le dossier"}
                                            </Button>
                                          )}

                                        {/* Étape 6 (AR/TFD) - Avancement du dossier - Bouton Valider */}
                                        {isArTfdStep6 &&
                                          !isContractFinished &&
                                          !!s.step4_completed_at && (
                                            <Button
                                              color="success"
                                              size="sm"
                                              disabled={loading}
                                              onClick={() =>
                                                completeContractCH(s)
                                              }
                                              title="Valider le dossier"
                                            >
                                              {loading
                                                ? "Validation..."
                                                : "Valider le dossier"}
                                            </Button>
                                          )}

                                        {/* Étape 5 (Ex-Step 4) - Création devis */}
                                        {isCreditImpotStep5 && (
                                          <>
                                            {isEditing ? (
                                              <>
                                                <Input
                                                  type="date"
                                                  value={
                                                    step4CandidateInput || ""
                                                  }
                                                  onChange={(e) => {
                                                    const newValue =
                                                      e.target.value;
                                                    setEditingValues(
                                                      (prev) => ({
                                                        ...prev,
                                                        [s.id]: {
                                                          ...(prev[s.id] || {}),
                                                          5: newValue, // Index 5
                                                        },
                                                      }),
                                                    );
                                                  }}
                                                  className="mr-50"
                                                  style={{ maxWidth: 190 }}
                                                />
                                                <Button
                                                  color="primary"
                                                  disabled={
                                                    saving[s.id]?.[5] === true
                                                  }
                                                  className="mr-25"
                                                  onClick={() =>
                                                    validateStep4Date(
                                                      s,
                                                      (editingValues[s.id] &&
                                                        editingValues[
                                                          s.id
                                                        ][5]) ||
                                                        step4CandidateInput,
                                                      5, // Visual Step 5
                                                    )
                                                  }
                                                >
                                                  {saving[s.id]?.[5]
                                                    ? "Validation..."
                                                    : "Valider"}
                                                </Button>
                                                <Button
                                                  color="link"
                                                  size="sm"
                                                  className="p-0 d-flex align-items-center"
                                                  onClick={() =>
                                                    cancelEditing(s.id, 5)
                                                  }
                                                  title="Annuler"
                                                >
                                                  <X size={16} />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                {!step5Validated &&
                                                  step4CandidateInput && (
                                                    <Button
                                                      color="primary"
                                                      className="mr-25"
                                                      disabled={
                                                        saving[s.id]?.[5] ===
                                                        true
                                                      }
                                                      onClick={() =>
                                                        validateStep4Date(
                                                          s,
                                                          step4CandidateInput,
                                                          5, // Visual Step 5
                                                        )
                                                      }
                                                    >
                                                      {saving[s.id]?.[5]
                                                        ? "Validation..."
                                                        : "Valider"}
                                                    </Button>
                                                  )}

                                                {step5Validated && (
                                                  <>
                                                    <Button
                                                      color="link"
                                                      size="sm"
                                                      className="p-0"
                                                      onClick={() =>
                                                        startEditing(
                                                          s.id,
                                                          5,
                                                          step4CandidateInput ||
                                                            s.step5_completed_at ||
                                                            s.step4_completed_at,
                                                        )
                                                      }
                                                      title="Modifier la date"
                                                    >
                                                      <Edit size={14} />
                                                    </Button>
                                                  </>
                                                )}
                                              </>
                                            )}
                                          </>
                                        )}
                                        {isArTfdStep5 && (
                                          <>
                                            {isEditing ? (
                                              <>
                                                <Input
                                                  type="date"
                                                  value={
                                                    step5ArTfdCandidateInput ||
                                                    ""
                                                  }
                                                  onChange={(e) => {
                                                    const newValue =
                                                      e.target.value;
                                                    setEditingValues(
                                                      (prev) => ({
                                                        ...prev,
                                                        [s.id]: {
                                                          ...(prev[s.id] || {}),
                                                          5: newValue,
                                                        },
                                                      }),
                                                    );
                                                  }}
                                                  className="mr-50"
                                                  style={{ maxWidth: 190 }}
                                                />
                                                <Button
                                                  color="primary"
                                                  disabled={
                                                    saving[s.id]?.[5] === true
                                                  }
                                                  className="mr-25"
                                                  onClick={() =>
                                                    validateStep4PaymentArTfd(
                                                      s,
                                                      (editingValues[s.id] &&
                                                        editingValues[
                                                          s.id
                                                        ][5]) ||
                                                        step5ArTfdCandidateInput,
                                                    )
                                                  }
                                                >
                                                  {saving[s.id]?.[5]
                                                    ? "Validation..."
                                                    : "Valider"}
                                                </Button>
                                                <Button
                                                  color="link"
                                                  size="sm"
                                                  className="p-0 d-flex align-items-center"
                                                  onClick={() =>
                                                    cancelEditing(s.id, 5)
                                                  }
                                                  title="Annuler"
                                                >
                                                  <X size={16} />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                {/* Ajouter une date (avec pré-remplissage si sold_dates dispo) */}
                                                {!s.step4_completed_at &&
                                                  isCurrent && (
                                                    <Button
                                                      color="link"
                                                      size="sm"
                                                      className="p-0 d-flex align-items-center"
                                                      onClick={() =>
                                                        startEditing(
                                                          s.id,
                                                          5,
                                                          step5ArTfdCandidateInput || "",
                                                        )
                                                      }
                                                      title="Ajouter une date"
                                                    >
                                                      <PlusCircle
                                                        size={14}
                                                        className="mr-25"
                                                      />
                                                      <span>
                                                        Ajouter une date
                                                      </span>
                                                    </Button>
                                                  )}

                                                {/* Modifier toujours possible */}
                                                {!!s.step4_completed_at && (
                                                  <>
                                                    <Button
                                                      color="link"
                                                      size="sm"
                                                      className="p-0"
                                                      onClick={() =>
                                                        startEditing(
                                                          s.id,
                                                          5,
                                                          step5ArTfdCandidateInput ||
                                                            s.step4_completed_at ||
                                                            soldFirstInput,
                                                        )
                                                      }
                                                      title="Modifier la date"
                                                    >
                                                      <Edit size={14} />
                                                    </Button>
                                                  </>
                                                )}
                                              </>
                                            )}
                                          </>
                                        )}
                                        {/* Étape 6 (Ex-Step 5) - Transfo Devis */}
                                        {isCreditImpotStep6 && (
                                          <>
                                            {isEditing ? (
                                              <>
                                                <Input
                                                  type="date"
                                                  value={
                                                    step5CandidateInput || ""
                                                  }
                                                  onChange={(e) => {
                                                    const newValue =
                                                      e.target.value;
                                                    setEditingValues(
                                                      (prev) => ({
                                                        ...prev,
                                                        [s.id]: {
                                                          ...(prev[s.id] || {}),
                                                          6: newValue, // Index 6
                                                        },
                                                      }),
                                                    );
                                                  }}
                                                  className="mr-50"
                                                  style={{ maxWidth: 190 }}
                                                />
                                                <Button
                                                  color="primary"
                                                  disabled={
                                                    saving[s.id]?.[6] === true
                                                  }
                                                  className="mr-25"
                                                  onClick={() =>
                                                    saveManualStepDate(
                                                      s,
                                                      6, // Visual Step 6
                                                      typeCode,
                                                    )
                                                  }
                                                >
                                                  {saving[s.id]?.[6]
                                                    ? "Validation..."
                                                    : "Valider"}
                                                </Button>
                                                <Button
                                                  color="link"
                                                  size="sm"
                                                  className="p-0 d-flex align-items-center"
                                                  onClick={() =>
                                                    cancelEditing(s.id, 6)
                                                  }
                                                  title="Annuler"
                                                >
                                                  <X size={16} />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                {!step6Validated &&
                                                  isCurrent && (
                                                    <Button
                                                      color="link"
                                                      size="sm"
                                                      className="p-0 d-flex align-items-center"
                                                      onClick={() =>
                                                        startEditing(
                                                          s.id,
                                                          6,
                                                          step5CandidateInput ||
                                                            s.step5_completed_at ||
                                                            "",
                                                        )
                                                      }
                                                      title="Ajouter une date"
                                                    >
                                                      <PlusCircle
                                                        size={14}
                                                        className="mr-25"
                                                      />
                                                      <span>
                                                        Ajouter une date
                                                      </span>
                                                    </Button>
                                                  )}

                                                {step6Validated && (
                                                  <>
                                                    <Button
                                                      color="link"
                                                      size="sm"
                                                      className="p-0"
                                                      onClick={() =>
                                                        startEditing(
                                                          s.id,
                                                          6,
                                                          step5CandidateInput ||
                                                            s.step5_completed_at,
                                                        )
                                                      }
                                                      title="Modifier la date"
                                                    >
                                                      <Edit size={14} />
                                                    </Button>
                                                  </>
                                                )}
                                              </>
                                            )}
                                          </>
                                        )}
                                        {/* Étape 7 (Ex-Step 6) - Paiement Unipro */}
                                        {isCreditImpotStep7 && (
                                          <>
                                            {isEditing ? (
                                              <>
                                                <Input
                                                  type="date"
                                                  value={
                                                    step6CandidateInput || ""
                                                  }
                                                  onChange={(e) => {
                                                    const newValue =
                                                      e.target.value;
                                                    setEditingValues(
                                                      (prev) => ({
                                                        ...prev,
                                                        [s.id]: {
                                                          ...(prev[s.id] || {}),
                                                          7: newValue, // Index 7
                                                        },
                                                      }),
                                                    );
                                                  }}
                                                  className="mr-50"
                                                  style={{ maxWidth: 190 }}
                                                />
                                                <Button
                                                  color="primary"
                                                  disabled={
                                                    saving[s.id]?.[7] === true
                                                  }
                                                  className="mr-25"
                                                  onClick={() =>
                                                    validateStep6Date(
                                                      s,
                                                      (editingValues[s.id] &&
                                                        editingValues[
                                                          s.id
                                                        ][7]) ||
                                                        step6CandidateInput,
                                                      7, // Visual Step 7
                                                    )
                                                  }
                                                >
                                                  {saving[s.id]?.[7]
                                                    ? "Validation..."
                                                    : "Valider"}
                                                </Button>
                                                <Button
                                                  color="link"
                                                  size="sm"
                                                  className="p-0 d-flex align-items-center"
                                                  onClick={() =>
                                                    cancelEditing(s.id, 7)
                                                  }
                                                  title="Annuler"
                                                >
                                                  <X size={16} />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                {!step7Validated &&
                                                  step6CandidateInput && (
                                                    <Button
                                                      color="primary"
                                                      className="mr-25"
                                                      disabled={
                                                        saving[s.id]?.[7] ===
                                                        true
                                                      }
                                                      onClick={() =>
                                                        validateStep6Date(
                                                          s,
                                                          step6CandidateInput,
                                                          7, // Visual Step 7
                                                        )
                                                      }
                                                    >
                                                      {saving[s.id]?.[7]
                                                        ? "Validation..."
                                                        : "Valider"}
                                                    </Button>
                                                  )}

                                                {step7Validated && (
                                                  <>
                                                    <Button
                                                      color="link"
                                                      size="sm"
                                                      className="p-0"
                                                      onClick={() =>
                                                        startEditing(
                                                          s.id,
                                                          7,
                                                          step6CandidateInput ||
                                                            s.step6_completed_at ||
                                                            autoFromStep5,
                                                        )
                                                      }
                                                      title="Modifier la date"
                                                    >
                                                      <Edit size={14} />
                                                    </Button>
                                                  </>
                                                )}
                                              </>
                                            )}
                                          </>
                                        )}
                                        {/* Étape 8 (Ex-Step 7) - Paiement du contrat (crédit d'impôt, sold_dates) */}
                                        {isCreditImpotStep8 && (
                                          <>
                                            {isEditing ? (
                                              <>
                                                <Input
                                                  type="date"
                                                  value={
                                                    step7CandidateInput || ""
                                                  }
                                                  onChange={(e) => {
                                                    const newValue =
                                                      e.target.value;
                                                    setEditingValues(
                                                      (prev) => ({
                                                        ...prev,
                                                        [s.id]: {
                                                          ...(prev[s.id] || {}),
                                                          8: newValue, // Index 8
                                                        },
                                                      }),
                                                    );
                                                  }}
                                                  className="mr-50"
                                                  style={{ maxWidth: 190 }}
                                                />
                                                <Button
                                                  color="primary"
                                                  disabled={
                                                    saving[s.id]?.[8] === true
                                                  }
                                                  className="mr-25"
                                                  onClick={() =>
                                                    validateStep7Date(
                                                      s,
                                                      (editingValues[s.id] &&
                                                        editingValues[
                                                          s.id
                                                        ][8]) ||
                                                        step7CandidateInput,
                                                      8, // Visual Step 8
                                                    )
                                                  }
                                                >
                                                  {saving[s.id]?.[8]
                                                    ? "Validation..."
                                                    : "Valider"}
                                                </Button>
                                                <Button
                                                  color="link"
                                                  size="sm"
                                                  className="p-0 d-flex align-items-center"
                                                  onClick={() =>
                                                    cancelEditing(s.id, 8)
                                                  }
                                                  title="Annuler"
                                                >
                                                  <X size={16} />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                {/* Valider seulement si étape actuelle */}
                                                {!step7Validated &&
                                                  step7CandidateInput &&
                                                  isCurrent && (
                                                    <Button
                                                      color="primary"
                                                      className="mr-25"
                                                      disabled={
                                                        saving[s.id]?.[8] ===
                                                        true
                                                      }
                                                      onClick={() =>
                                                        validateStep7Date(
                                                          s,
                                                          step7CandidateInput,
                                                          8, // Visual Step 8
                                                        )
                                                      }
                                                    >
                                                      {saving[s.id]?.[8]
                                                        ? "Validation..."
                                                        : "Valider"}
                                                    </Button>
                                                  )}

                                                {/* Ajouter seulement si étape actuelle */}
                                                {!step7Validated &&
                                                  !step7CandidateInput &&
                                                  isCurrent && (
                                                    <Button
                                                      color="link"
                                                      size="sm"
                                                      className="p-0 d-flex align-items-center"
                                                      onClick={() =>
                                                        startEditing(
                                                          s.id,
                                                          8,
                                                          "",
                                                        )
                                                      }
                                                      title="Ajouter une date"
                                                    >
                                                      <PlusCircle
                                                        size={14}
                                                        className="mr-25"
                                                      />
                                                      <span>
                                                        Ajouter une date
                                                      </span>
                                                    </Button>
                                                  )}

                                                {/* Modifier toujours possible */}
                                                {step7Validated && (
                                                  <>
                                                    <Button
                                                      color="link"
                                                      size="sm"
                                                      className="p-0"
                                                      onClick={() =>
                                                        startEditing(
                                                          s.id,
                                                          8,
                                                          step7CandidateInput ||
                                                            s.step7_completed_at ||
                                                            soldFirstInput,
                                                        )
                                                      }
                                                      title="Modifier la date"
                                                    >
                                                      <Edit size={14} />
                                                    </Button>
                                                  </>
                                                )}
                                              </>
                                            )}
                                          </>
                                        )}

                                        {/* Retirer la date — universel pour tout step avec date remplie */}
                                        {hasDate && hasExistingDate && !isAvancementStep && (
                                          <Button
                                            color="link"
                                            size="sm"
                                            className="p-0 ml-25 text-danger"
                                            onClick={() => resetStepDate(s, dbStepNumber)}
                                            title="Retirer la date"
                                          >
                                            <RefreshCcw size={14} />
                                          </Button>
                                        )}

                                        {/* Réouvrir dossier depuis Terminé */}
                                        {isAvancementStep && isContractFinished && (
                                          <Button
                                            color="link"
                                            size="sm"
                                            className="p-0 text-warning"
                                            disabled={loading}
                                            onClick={() => reopenContract(s)}
                                            title="Réouvrir le dossier"
                                          >
                                            <RefreshCcw size={14} />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                    <div style={TIMELINE_STYLES.dateText}>
                                      {/* On n'affiche pas la date pour "5 jours ouvrés d'attente" */}
                                      {!isFiveDaysWaitStep && (
                                        <strong>{displayValue}</strong>
                                      )}

                                      {isStep1Signature &&
                                        !hasSignedFile &&
                                        !dbRaw && (
                                          <span className="text-muted mt-25">
                                            (Mettre le contrat signé dans le
                                            dossier{" "}
                                            <strong>
                                              "1. Contrat / Procuration"
                                            </strong>{" "}
                                            pour passer à l'étape suivante.)
                                          </span>
                                        )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
};

export default SuiviAvancementBox;
