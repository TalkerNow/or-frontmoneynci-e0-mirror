// SuiviAvancementBox.js
import React, { useEffect, useState } from "react";
import { Card, CardBody, Spinner, Button, Input } from "reactstrap";
import { Edit } from "react-feather";
import axios from "axios";

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
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
          return toDateInputValue(parsed[0]);
        }
      } catch (e) {
        // on tombe plus bas
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
  if (typeCode === "credit_impot") {
    return "Crédit d'impot";
  }

  const services = parseServices(contract.subscribe_services);
  const knownCodes = ["CH", "SIMU", "ACTU", "RAC", "AR", "TFD"];
  const filtered = services.filter((s) => knownCodes.includes(s));

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
    totalSteps: 8,
    dateSteps: [1, 2, 3, 4, 5, 6, 7],
    labels: [
        "Signature du contrat",              // 1
        "Inscription Urssaf",                // 2
        "5 jours ouvrés d'attente",          // 3
        "Création devis",                    // 4
        "Transformer devis en facture",      // 5
        "Paiement automatique Unipro",                           // 6
        "Paiement du contrat",                           // 7
        "Avancement du dossier",              // 8
    ],
    },

  ar_tfd: {
    totalSteps: 5,
    dateSteps: [1, 2, 3, 4],
    labels: [
      "Signature du contrat", // step 1
      "Étape 2",
      "Étape 3",
      "Étape 4",
      "Étape 5 (sans date)",
    ],
  },
  ch_simu_actu_rac: {
    totalSteps: 5,
    dateSteps: [1, 2, 3, 4],
    labels: ["Étape 1", "Étape 2", "Étape 3", "Étape 4", "Étape 5 (sans date)"],
  },
  none: {
    totalSteps: 0,
    dateSteps: [],
    labels: [],
  },
};

const SuiviAvancementBox = ({ clientId }) => {
  const [loading, setLoading] = useState(false);
  const [suivis, setSuivis] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [error, setError] = useState(null);
  const [hasSignedFile, setHasSignedFile] = useState(false);

  // édition manuelle des dates : { [suiviId]: { [stepNumber]: true } }
  const [editing, setEditing] = useState({});
  // valeurs éditées : { [suiviId]: { [stepNumber]: 'YYYY-MM-DD' } }
  const [editingValues, setEditingValues] = useState({});
  // états de sauvegarde : { [suiviId]: { [stepNumber]: bool } }
  const [saving, setSaving] = useState({});

  const getConfig = () => ({
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
  });

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

    const column = `step${stepNumber}_completed_at`;
    const hasExistingDate = !!suivi[column];
    const url = `${global.config.server_url}/suivi-avancement/${svId}/steps/${stepNumber}`;

    try {
      if (hasExistingDate) {
        await axios.put(url, { date: dateToSend }, getConfig());
      } else {
        await axios.post(url, { date: dateToSend }, getConfig());
      }

      // Cas spécial : crédit d'impot, step 2 -> auto step 3 = +5 jours ouvrés
      if (typeCode === "credit_impot" && stepNumber === 2) {
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
            console.error("Erreur mise à jour auto step3", e);
          }
        }
      }

      const refreshedSuivis = await fetchSuivis();
      setSuivis(refreshedSuivis);
      cancelEditing(svId, stepNumber);
    } catch (e) {
      console.error(e);
      setError("Erreur lors de la mise à jour de la date.");
    } finally {
      setSaving((prev) => ({
        ...prev,
        [svId]: { ...(prev[svId] || {}), [stepNumber]: false },
      }));
    }
  };
    const validateStep7Date = async (suivi, dateInput) => {
    const svId = suivi.id;
    if (!dateInput) return;
    const dateToSend = fromDateInputValue(dateInput);
    if (!dateToSend) return;

    setSaving((prev) => ({
        ...prev,
        [svId]: { ...(prev[svId] || {}), 7: true },
    }));
    setError(null);

    const hasExistingDate = !!suivi.step7_completed_at;
    const url = `${global.config.server_url}/suivi-avancement/${svId}/steps/7`;

    try {
        if (hasExistingDate) {
        await axios.put(url, { date: dateToSend }, getConfig());
        } else {
        await axios.post(url, { date: dateToSend }, getConfig());
        }
        const refreshedSuivis = await fetchSuivis();
        setSuivis(refreshedSuivis);
        cancelEditing(svId, 7);
    } catch (e) {
        console.error("Erreur validation step7", e);
        setError(
        "Erreur lors de la validation de la date pour l'étape 7 (crédit d'impot)."
        );
    } finally {
        setSaving((prev) => ({
        ...prev,
        [svId]: { ...(prev[svId] || {}), 7: false },
        }));
    }
    };

  // Validation step 4 (Création devis) avec une date donnée (input YYYY-MM-DD)
  const validateStep4Date = async (suivi, dateInput) => {
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
      if (hasExistingDate) {
        await axios.put(url, { date: dateToSend }, getConfig());
      } else {
        await axios.post(url, { date: dateToSend }, getConfig());
      }
      const refreshedSuivis = await fetchSuivis();
      setSuivis(refreshedSuivis);
      cancelEditing(svId, 4);
    } catch (e) {
      console.error("Erreur validation step4", e);
      setError(
        "Erreur lors de la validation de la date pour l'étape 4 (Création devis)."
      );
    } finally {
      setSaving((prev) => ({
        ...prev,
        [svId]: { ...(prev[svId] || {}), 4: false },
      }));
    }
  };

  // Validation step 6 (date step 5 + 2 jours)
  const validateStep6Date = async (suivi, dateInput) => {
    const svId = suivi.id;
    if (!dateInput) return;
    const dateToSend = fromDateInputValue(dateInput);
    if (!dateToSend) return;

    setSaving((prev) => ({
      ...prev,
      [svId]: { ...(prev[svId] || {}), 6: true },
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
      cancelEditing(svId, 6);
    } catch (e) {
      console.error("Erreur validation step6", e);
      setError(
        "Erreur lors de la validation de la date pour l'étape 6 (crédit d'impot)."
      );
    } finally {
      setSaving((prev) => ({
        ...prev,
        [svId]: { ...(prev[svId] || {}), 6: false },
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
    <Card className="mt-1">
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <h5 className="mb-0">Suivi d&apos;avancement</h5>
          <Button size="sm" color="link" onClick={syncSuivisForClient}>
            Rafraîchir
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
            Aucun suivi d&apos;avancement pour ce client.
          </div>
        )}

        {!loading && !error && suivis.length > 0 && (
          <div>
            {suivis.map((s) => {
              const contract = contracts.find((c) => c.id === s.facture_id);
              const typeCode = getContractTypeCode(contract);
              const typeLabel = getContractTypeLabel(contract);
              const stepDef = STEP_DEFINITION[typeCode] || STEP_DEFINITION.none;
              const badgeClass =
                BADGE_CLASS_BY_TYPE[typeCode] || BADGE_CLASS_BY_TYPE.none;

              return (
                <div
                  key={s.id}
                  className="border rounded p-50 mb-50"
                  style={{ fontSize: 13 }}
                >
                  <div className="font-weight-bold mb-25 d-flex justify-content-between">
                    <span>Contrat / Document #{s.facture_id}</span>
                    <span className={badgeClass}>{typeLabel}</span>
                  </div>

                  {stepDef.totalSteps === 0 ? (
                    <div className="text-muted">
                      Pas de prestation, aucune étape.
                    </div>
                  ) : (
                    <div>
                    {Array.from({ length: stepDef.totalSteps }).map((_, index) => {
                    const stepNumber = index + 1;
                    const hasDate = stepDef.dateSteps.includes(stepNumber);
                    const column = hasDate ? `step${stepNumber}_completed_at` : null;
                    const dbRaw = column && s[column] ? s[column] : null;
                    const dbInput = dbRaw ? toDateInputValue(dbRaw) : null;
                    const label = stepDef.labels[stepNumber - 1] || `Étape ${stepNumber}`;

                    const isCreditImpot = typeCode === "credit_impot";
                    const isStep1Signature =
                        (isCreditImpot || typeCode === "ar_tfd") && stepNumber === 1;
                    const isCreditImpotStep2 = isCreditImpot && stepNumber === 2;
                    const isCreditImpotStep3 = isCreditImpot && stepNumber === 3;
                    const isCreditImpotStep4 = isCreditImpot && stepNumber === 4;
                    const isCreditImpotStep5 = isCreditImpot && stepNumber === 5;
                    const isCreditImpotStep6 = isCreditImpot && stepNumber === 6;
                    const isCreditImpotStep7 = isCreditImpot && stepNumber === 7;
                    const isCreditImpotStep8 = isCreditImpot && stepNumber === 8;

                    const isEditing = editing[s.id]?.[stepNumber] === true;
                    const editingValueInput =
                        (editingValues[s.id] && editingValues[s.id][stepNumber]) || null;

                    // ----- Dates candidates par défaut -----
                    let displayDateInput = dbInput;

                    // Step 3 : vient de la DB uniquement (générée auto depuis step2)
                    // => pas de cas spécial ici, on laisse dbInput.

                    // Step 4 : même date que step 3 par défaut (puis validation)
                    let step4CandidateInput = null;
                    const step3Input = s.step3_completed_at
                        ? toDateInputValue(s.step3_completed_at)
                        : null;
                    const step4Validated = !!s.step4_completed_at;

                    if (isCreditImpotStep4) {
                        if (isEditing) {
                        step4CandidateInput = editingValueInput || dbInput || step3Input;
                        } else {
                        step4CandidateInput = dbInput || step3Input || null;
                        }
                        displayDateInput = step4CandidateInput || null;
                    }

                    // Step 5 : date manuelle
                    let step5CandidateInput = null;
                    const step5Validated = !!s.step5_completed_at;

                    if (isCreditImpotStep5) {
                        if (isEditing) {
                        step5CandidateInput = editingValueInput || dbInput || "";
                        } else {
                        step5CandidateInput = dbInput || null;
                        }
                        displayDateInput = step5CandidateInput || null;
                    }

                    // Step 6 : date step5 + 2 jours
                    let step6CandidateInput = null;
                    const step5Input = s.step5_completed_at
                        ? toDateInputValue(s.step5_completed_at)
                        : null;
                    const autoFromStep5 = step5Input ? addDays(step5Input, 2) : null;
                    const step6Validated = !!s.step6_completed_at;

                    if (isCreditImpotStep6) {
                        if (isEditing) {
                        step6CandidateInput = editingValueInput || dbInput || autoFromStep5;
                        } else {
                        step6CandidateInput = dbInput || autoFromStep5 || null;
                        }
                        displayDateInput = step6CandidateInput || null;
                    }

                    // Step 7 : première date de deposit_date du contrat (modifiable)
                    let step7CandidateInput = null;
                    const step7Validated = !!s.step7_completed_at;
                    const depositFirstInput = contract
                        ? getFirstDateFromValue(contract.deposit_date)
                        : null;

                    if (isCreditImpotStep7) {
                        if (isEditing) {
                        step7CandidateInput = editingValueInput || dbInput || depositFirstInput;
                        } else {
                        step7CandidateInput = dbInput || depositFirstInput || null;
                        }
                        displayDateInput = step7CandidateInput || null;
                    }

                    let displayValue = "-";

                    if (isCreditImpotStep8) {
                    // toutes les steps 1 à 7 ont une date ?
                    const allDone = STEP_DEFINITION.credit_impot.dateSteps
                        .filter((num) => num <= 7) // on limite bien à 1..7
                        .every((num) => !!s[`step${num}_completed_at`]);

                    displayValue = allDone
                        ? "Dossier en cours de traitement"
                        : "Dossier en attente";
                    } else {
                    displayValue = displayDateInput
                        ? formatDisplayDate(displayDateInput)
                        : "-";
                    }


                    // ----- Edition générique (step1 & step2) -----
                    const canEditDate =
                        hasDate && (isStep1Signature || isCreditImpotStep2);
                    const isEditingGeneric =
                        isEditing && (isStep1Signature || isCreditImpotStep2);

                    return (
                        <div key={stepNumber} className="mb-25">
                        <div className="d-flex justify-content-between align-items-center">
                            <span>
                            {label} : <strong>{displayValue}</strong>{" "}
                            {isStep1Signature && !hasSignedFile && !dbRaw && (
                                <span className="text-muted ml-25">
                                (Mettre le contrat signé dans le dossier{" "}
                                <strong>&quot;1. Contrat / Procuration&quot;</strong>{" "}
                                pour passer à l&apos;étape suivante.)
                                </span>
                            )}
                            </span>

                            {/* Édition générique Step1 & Step2 */}
                            {hasDate && canEditDate && (
                            <div className="d-flex align-items-center ml-1">
                                {isEditingGeneric ? (
                                <>
                                    <Input
                                    type="date"
                                    bsSize="sm"
                                    value={
                                        (editingValues[s.id] &&
                                        editingValues[s.id][stepNumber]) ??
                                        dbInput ??
                                        ""
                                    }
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        setEditingValues((prev) => ({
                                        ...prev,
                                        [s.id]: {
                                            ...(prev[s.id] || {}),
                                            [stepNumber]: newValue,
                                        },
                                        }));
                                    }}
                                    className="mr-50"
                                    style={{ maxWidth: 160 }}
                                    />
                                    <Button
                                    color="primary"
                                    size="sm"
                                    disabled={saving[s.id]?.[stepNumber] === true}
                                    className="mr-25"
                                    onClick={() =>
                                        saveManualStepDate(s, stepNumber, typeCode)
                                    }
                                    >
                                    {saving[s.id]?.[stepNumber] ? "..." : "OK"}
                                    </Button>
                                    <Button
                                    color="secondary"
                                    size="sm"
                                    outline
                                    onClick={() => cancelEditing(s.id, stepNumber)}
                                    >
                                    Annuler
                                    </Button>
                                </>
                                ) : (
                                <Button
                                    color="link"
                                    size="sm"
                                    className="p-0"
                                    onClick={() => startEditing(s.id, stepNumber, dbRaw)}
                                    title="Modifier la date"
                                >
                                    <Edit size={14} />
                                </Button>
                                )}
                            </div>
                            )}

                            {/* Étape 4 - Création devis (Edit + Valider avant validation) */}
                            {isCreditImpotStep4 && (
                            <div className="d-flex align-items-center ml-1">
                                {isEditing ? (
                                <>
                                    <Input
                                    type="date"
                                    bsSize="sm"
                                    value={step4CandidateInput || ""}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        setEditingValues((prev) => ({
                                        ...prev,
                                        [s.id]: {
                                            ...(prev[s.id] || {}),
                                            4: newValue,
                                        },
                                        }));
                                    }}
                                    className="mr-50"
                                    style={{ maxWidth: 160 }}
                                    />
                                    <Button
                                    color="primary"
                                    size="sm"
                                    disabled={saving[s.id]?.[4] === true}
                                    className="mr-25"
                                    onClick={() =>
                                        validateStep4Date(
                                        s,
                                        (editingValues[s.id] && editingValues[s.id][4]) ||
                                            step4CandidateInput
                                        )
                                    }
                                    >
                                    {saving[s.id]?.[4] ? "Validation..." : "Valider"}
                                    </Button>
                                    <Button
                                    color="secondary"
                                    size="sm"
                                    outline
                                    onClick={() => cancelEditing(s.id, 4)}
                                    >
                                    Annuler
                                    </Button>
                                </>
                                ) : (
                                <>
                                    {!step4Validated && step4CandidateInput && (
                                    <Button
                                        color="primary"
                                        size="sm"
                                        disabled={saving[s.id]?.[4] === true}
                                        className="mr-25"
                                        onClick={() =>
                                        validateStep4Date(s, step4CandidateInput)
                                        }
                                    >
                                        {saving[s.id]?.[4]
                                        ? "Validation..."
                                        : "Valider"}
                                    </Button>
                                    )}
                                    <Button
                                    color="link"
                                    size="sm"
                                    className="p-0"
                                    onClick={() =>
                                        startEditing(
                                        s.id,
                                        4,
                                        step4CandidateInput ||
                                            s.step4_completed_at ||
                                            s.step3_completed_at
                                        )
                                    }
                                    title="Modifier la date"
                                    >
                                    <Edit size={14} />
                                    </Button>
                                    {step4Validated && (
                                    <span className="text-success small ml-50">
                                        Validé
                                    </span>
                                    )}
                                </>
                                )}
                            </div>
                            )}

                            {/* Étape 5 - Transformer devis en facture (Edit + Valider pour sauvegarder) */}
                            {isCreditImpotStep5 && (
                            <div className="d-flex align-items-center ml-1">
                                {isEditing ? (
                                <>
                                    <Input
                                    type="date"
                                    bsSize="sm"
                                    value={step5CandidateInput || ""}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        setEditingValues((prev) => ({
                                        ...prev,
                                        [s.id]: {
                                            ...(prev[s.id] || {}),
                                            5: newValue,
                                        },
                                        }));
                                    }}
                                    className="mr-50"
                                    style={{ maxWidth: 160 }}
                                    />
                                    <Button
                                    color="primary"
                                    size="sm"
                                    disabled={saving[s.id]?.[5] === true}
                                    className="mr-25"
                                    onClick={() => saveManualStepDate(s, 5, typeCode)}
                                    >
                                    {saving[s.id]?.[5] ? "Validation..." : "Valider"}
                                    </Button>
                                    <Button
                                    color="secondary"
                                    size="sm"
                                    outline
                                    onClick={() => cancelEditing(s.id, 5)}
                                    >
                                    Annuler
                                    </Button>
                                </>
                                ) : (
                                <>
                                    <Button
                                    color="link"
                                    size="sm"
                                    className="p-0"
                                    onClick={() =>
                                        startEditing(
                                        s.id,
                                        5,
                                        step5CandidateInput || s.step5_completed_at
                                        )
                                    }
                                    title="Modifier la date"
                                    >
                                    <Edit size={14} />
                                    </Button>
                                    {step5Validated && (
                                    <span className="text-success small ml-50">
                                        Validé
                                    </span>
                                    )}
                                </>
                                )}
                            </div>
                            )}

                            {/* Étape 6 - date step5 + 2 jours (Edit + Valider) */}
                            {isCreditImpotStep6 && (
                            <div className="d-flex align-items-center ml-1">
                                {isEditing ? (
                                <>
                                    <Input
                                    type="date"
                                    bsSize="sm"
                                    value={step6CandidateInput || ""}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        setEditingValues((prev) => ({
                                        ...prev,
                                        [s.id]: {
                                            ...(prev[s.id] || {}),
                                            6: newValue,
                                        },
                                        }));
                                    }}
                                    className="mr-50"
                                    style={{ maxWidth: 160 }}
                                    />
                                    <Button
                                    color="primary"
                                    size="sm"
                                    disabled={saving[s.id]?.[6] === true}
                                    className="mr-25"
                                    onClick={() =>
                                        validateStep6Date(
                                        s,
                                        (editingValues[s.id] && editingValues[s.id][6]) ||
                                            step6CandidateInput
                                        )
                                    }
                                    >
                                    {saving[s.id]?.[6] ? "Validation..." : "Valider"}
                                    </Button>
                                    <Button
                                    color="secondary"
                                    size="sm"
                                    outline
                                    onClick={() => cancelEditing(s.id, 6)}
                                    >
                                    Annuler
                                    </Button>
                                </>
                                ) : (
                                <>
                                    {!step6Validated && step6CandidateInput && (
                                    <Button
                                        color="primary"
                                        size="sm"
                                        disabled={saving[s.id]?.[6] === true}
                                        className="mr-25"
                                        onClick={() =>
                                        validateStep6Date(s, step6CandidateInput)
                                        }
                                    >
                                        {saving[s.id]?.[6]
                                        ? "Validation..."
                                        : "Valider"}
                                    </Button>
                                    )}
                                    <Button
                                    color="link"
                                    size="sm"
                                    className="p-0"
                                    onClick={() =>
                                        startEditing(
                                        s.id,
                                        6,
                                        step6CandidateInput ||
                                            s.step6_completed_at ||
                                            (autoFromStep5 || null)
                                        )
                                    }
                                    title="Modifier la date"
                                    >
                                    <Edit size={14} />
                                    </Button>
                                    {step6Validated && (
                                    <span className="text-success small ml-50">
                                        Validé
                                    </span>
                                    )}
                                </>
                                )}
                            </div>
                            )}

                            {/* Étape 7 - première date de deposit_date (Edit + Valider) */}
                            {isCreditImpotStep7 && (
                            <div className="d-flex align-items-center ml-1">
                                {isEditing ? (
                                <>
                                    <Input
                                    type="date"
                                    bsSize="sm"
                                    value={step7CandidateInput || ""}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        setEditingValues((prev) => ({
                                        ...prev,
                                        [s.id]: {
                                            ...(prev[s.id] || {}),
                                            7: newValue,
                                        },
                                        }));
                                    }}
                                    className="mr-50"
                                    style={{ maxWidth: 160 }}
                                    />
                                    <Button
                                    color="primary"
                                    size="sm"
                                    disabled={saving[s.id]?.[7] === true}
                                    className="mr-25"
                                    onClick={() =>
                                        validateStep7Date(
                                        s,
                                        (editingValues[s.id] && editingValues[s.id][7]) ||
                                            step7CandidateInput
                                        )
                                    }
                                    >
                                    {saving[s.id]?.[7] ? "Validation..." : "Valider"}
                                    </Button>
                                    <Button
                                    color="secondary"
                                    size="sm"
                                    outline
                                    onClick={() => cancelEditing(s.id, 7)}
                                    >
                                    Annuler
                                    </Button>
                                </>
                                ) : (
                                <>
                                    {!step7Validated && step7CandidateInput && (
                                    <Button
                                        color="primary"
                                        size="sm"
                                        disabled={saving[s.id]?.[7] === true}
                                        className="mr-25"
                                        onClick={() =>
                                        validateStep7Date(s, step7CandidateInput)
                                        }
                                    >
                                        {saving[s.id]?.[7]
                                        ? "Validation..."
                                        : "Valider"}
                                    </Button>
                                    )}
                                    <Button
                                    color="link"
                                    size="sm"
                                    className="p-0"
                                    onClick={() =>
                                        startEditing(
                                        s.id,
                                        7,
                                        step7CandidateInput ||
                                            s.step7_completed_at ||
                                            depositFirstInput
                                        )
                                    }
                                    title="Modifier la date"
                                    >
                                    <Edit size={14} />
                                    </Button>
                                    {step7Validated && (
                                    <span className="text-success small ml-50">
                                        Validé
                                    </span>
                                    )}
                                </>
                                )}
                            </div>
                            )}
                        </div>
                        </div>
                    );
                    })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default SuiviAvancementBox;
