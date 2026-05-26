import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  coeffRevalo,
  plafondSS,
  getBaremeRetraite,
} from "./simulatorData";
import { fetchRISAnalysis } from "./risService";
// We need to import convertRISToManualRows if we want to use its potentially shared logic,
// OR we can just use the raw data if handlePrefill parses it.
// The user said "exactement comme le fait Importer les données".
// In useNotesLogic, it calls convertRISToManualRows AND THEN setManualCareerRows.
// But CnavSimulator uses `user.debug_carriere_detaillee_regex` format.
// convertRISToManualRows TAKES `debug_carriere_detaillee_regex` from the RIS data.
// So the webhook returns the RIS data object which HAS `debug_carriere_detaillee_regex`.
// We just need that array.
import { toast } from "react-toastify";

const YEARS_START = 1963;
const YEARS_END = 2026;

/** Formate un nombre avec des espaces comme séparateur de milliers (ex: 10000.50 → "10 000.50") */
const formatNumber = (num) => {
  const parts = num.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join(".");
};

export default function CnavSimulator({ user }) {
  const userId = user?.id;
  const [birthDate, setBirthDate] = useState("");
  const [showBirthInfo, setShowBirthInfo] = useState(false);
  const [birthInfo, setBirthInfo] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef(null);

  // Salaries: { [year]: { sr: string, ss: string } }
  const [salaries, setSalaries] = useState({});
  const [deplafonner, setDeplafonner] = useState({});
  // Computed: { [year]: { revalorise: number, revaloriseStr: string, trimestres: number } }
  const [computed, setComputed] = useState({});

  // Trimestres assimiles
  const [assimilatedInputs, setAssimilatedInputs] = useState({
    serviceNational: 0,
    chomageIndemnise: 0,
    chomageNonIndemnise: 0,
    maladieAccident: 0,
  });
  const [totalTrimestresAssimiles, setTotalTrimestresAssimiles] = useState(0);
  const [trimestresParSalaire, setTrimestresParSalaire] = useState(0);

  // Enfant — auto-rempli depuis le profil
  const [nombreEnfants, setNombreEnfants] = useState(0);
  const [genre, setGenre] = useState("femme"); // "femme" | "homme"
  const [statut, setStatut] = useState("prive"); // "prive" | "fonctionnaire"
  const [enfantHandicap, setEnfantHandicap] = useState(false);

  // Best years
  const [bestYears, setBestYears] = useState([]);
  const [totalBestYears, setTotalBestYears] = useState(0);
  const [moyenneAnnuelle, setMoyenneAnnuelle] = useState(0);

  const sortedYears = useMemo(() => {
    const years = [];
    for (let y = YEARS_START; y <= YEARS_END; y++) years.push(y);
    return years.sort((a, b) => b - a);
  }, []);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Calcul automatique des trimestres enfant
  const trimestresEnfant = useMemo(() => {
    if (nombreEnfants <= 0) return 0;
    let parEnfant = 0;
    if (genre === "femme") {
      if (statut === "fonctionnaire") {
        parEnfant = 4; // bonification fonctionnaire
      } else {
        parEnfant = 8; // 4 maternité + 4 éducation (régime général)
      }
    }
    // Homme : 0 trimestres par défaut (maternité = mère uniquement)
    const base = nombreEnfants * parEnfant;
    const handicapBonus = enfantHandicap ? nombreEnfants * 8 : 0;
    return base + handicapBonus;
  }, [nombreEnfants, genre, statut, enfantHandicap]);

  // Total trimestres cotisés (somme des trimestres calculés par salaire)
  const totalTrimestresCotises = useMemo(() => {
    let total = 0;
    for (const year in computed) {
      if (computed[year] && computed[year].trimestres) {
        total += computed[year].trimestres;
      }
    }
    return total;
  }, [computed]);

  // Total général de tous les trimestres
  const totalTrimestresGlobal =
    totalTrimestresCotises + totalTrimestresAssimiles + trimestresEnfant;

  const handleAfficher = useCallback(() => {
    if (!birthDate) return;
    const d = new Date(birthDate);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const today = new Date();
    const diff = today - d;
    const yearAge = Math.floor(diff / 31536000000);
    const dayAge = Math.floor((diff % 31536000000) / 86400000);
    const monthAge = Math.floor(dayAge / 30);

    const bareme = getBaremeRetraite(d);
    const retirementAge = bareme.ageLegalLabel;
    const trimTauxPlein = bareme.trimRequis;

    const restant = 62 - (yearAge + monthAge / 30);
    const anneeRestant = Math.floor(restant);
    const moisRestant = Math.floor((restant - anneeRestant) * 12);
    const isRetired = anneeRestant <= 0;

    setBirthInfo({
      formattedDate: `${day}/${month}/${year}`,
      retirementAge,
      trimTauxPlein,
      anneeRestant,
      moisRestant,
      totalMois: moisRestant + anneeRestant * 12,
      isRetired,
    });
    setShowBirthInfo(true);
  }, [birthDate]);

  const handleSimulateur = useCallback((val, year, isDeplafonner) => {
    let salaireAnnuel = parseFloat(
      String(val).replace(/\s/g, "").replace(",", "."),
    );
    if (isNaN(salaireAnnuel) || salaireAnnuel <= 0) {
      setComputed((prev) => {
        const next = { ...prev };
        delete next[year];
        return next;
      });
      setTrimestresParSalaire(0);
      return;
    }

    const coeff = coeffRevalo[year] || 1;
    const passEuro = plafondSS[year] || 0;

    // 1. Plafonner au PASS de l'année AVANT de revaloriser
    const isCapped = !isDeplafonner || year >= 2005;
    let salairePlafonne = salaireAnnuel;
    if (isCapped && passEuro > 0) {
      if (year <= 2001) {
        const passFrancs = passEuro * 6.556957;
        salairePlafonne = Math.min(salaireAnnuel, passFrancs);
      } else {
        salairePlafonne = Math.min(salaireAnnuel, passEuro);
      }
    }

    // 2. Puis revaloriser le salaire plafonné
    let salaireRevaloriser =
      year <= 2001
        ? (salairePlafonne * coeff) / 6.556957
        : salairePlafonne * coeff;

    // Trimestres : comparer le salaire réel au seuil dans la même devise
    const seuilTrimestre =
      year <= 2001 ? (passEuro * 6.556957) / 4 : passEuro / 4;
    const trimestre = Math.min(
      4,
      Math.max(0, Math.floor(salaireAnnuel / (seuilTrimestre || Infinity))),
    );
    setTrimestresParSalaire(trimestre);

    setComputed((prev) => ({
      ...prev,
      [year]: {
        revalorise: salaireRevaloriser,
        revaloriseStr:
          formatNumber(salaireRevaloriser) + (isDeplafonner ? " \u20AC" : ""),
        trimestres: trimestre,
      },
    }));
  }, []);

  const handleAjouterTrimestres = useCallback(
    (type) => {
      const val = assimilatedInputs[type] || 0;
      if (isNaN(val) || val <= 0) return;
      setTotalTrimestresAssimiles((prev) => prev + val);
      setAssimilatedInputs((prev) => ({ ...prev, [type]: 0 }));
    },
    [assimilatedInputs],
  );

  const handleAjouterTrimestresSalaire = useCallback(() => {
    if (trimestresParSalaire <= 0) return;
    setTotalTrimestresAssimiles((prev) => prev + trimestresParSalaire);
  }, [trimestresParSalaire]);

  const handleSimulationFinale = useCallback(() => {
    const entries = [];
    const updatedSalaries = { ...salaries };

    for (const year in salaries) {
      const sal = salaries[year];
      if (!sal || !sal.sr) continue;
      const salaireReel = parseFloat(
        String(sal.sr).replace(/\s/g, "").replace(",", "."),
      );
      if (isNaN(salaireReel) || salaireReel <= 0) continue;

      const yearNum = Number(year);
      const passEuro = plafondSS[yearNum] || 0;

      // Calculer le salaire SS (plafonné au PASS de l'année)
      let salaireSS = salaireReel;
      if (passEuro > 0) {
        if (yearNum <= 2001) {
          const passFrancs = passEuro * 6.556957;
          salaireSS = Math.min(salaireReel, passFrancs);
        } else {
          salaireSS = Math.min(salaireReel, passEuro);
        }
      }

      // Remplir la colonne Salaire SS (dans la devise d'origine)
      updatedSalaries[year] = {
        ...updatedSalaries[year],
        ss: String(Math.round(salaireSS * 100) / 100),
      };

      // Pour les 25 meilleures : salaire SS en euros
      const salaireSS_euro = yearNum <= 2001 ? salaireSS / 6.556957 : salaireSS;
      entries.push({ year: yearNum, value: salaireSS_euro });
    }

    setSalaries(updatedSalaries);

    // Trier par valeur décroissante et garder les 25 meilleures
    entries.sort((a, b) => b.value - a.value);
    const best = entries.slice(0, 25);

    const bestDisplay = best.map((e) => ({
      year: e.year,
      value: e.value,
      display: formatNumber(e.value) + " \u20AC",
    }));

    const total = best.reduce((s, e) => s + e.value, 0);
    const moyenne = best.length ? total / best.length : 0;

    setBestYears(bestDisplay);
    setTotalBestYears(total);
    setMoyenneAnnuelle(moyenne);
  }, [salaries]);

  const handleReset = useCallback(() => {
    setSalaries({});
    setDeplafonner({});
    setComputed({});
    setBestYears([]);
    setTotalBestYears(0);
    setMoyenneAnnuelle(0);
    setTrimestresParSalaire(0);
    setTotalTrimestresAssimiles(0);
    setAssimilatedInputs({
      serviceNational: 0,
      chomageIndemnise: 0,
      chomageNonIndemnise: 0,
      maladieAccident: 0,
    });
    setNombreEnfants(0);
    setGenre("femme");
    setStatut("prive");
    setEnfantHandicap(false);
  }, []);

  // TRIGGER FILE INPUT
  const handleImportRIS = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const handlePrefill = useCallback(
    (overrideData = null) => {
      // Si overrideData est fourni (retour webhook), on l'utilise. Sinon on prend user.
      // Attention: overrideData peut être l'event click si appelé via onClick sans params

      // Check if overrideData is a real data object or an event
      let sourceData = user;

      if (overrideData && overrideData.debug_carriere_detaillee_regex) {
        sourceData = overrideData;
      }

      if (!sourceData) return;

      // 1. Date de naissance — toujours depuis user (le webhook ne renvoie pas le profil)
      if (user?.profil?.date_naissance) {
        const parts = user.profil.date_naissance.split("/");
        if (parts.length === 3) {
          setBirthDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      } else if (user?.birth_date || user?.birthDate) {
        const bd = user.birth_date || user.birthDate;
        try {
          const d = new Date(bd);
          if (!isNaN(d.getTime())) {
            setBirthDate(d.toISOString().split("T")[0]);
          }
        } catch (e) {}
      }

      // 2. Nombre d'enfants et genre — depuis le profil user
      const childCount = parseInt(
        user?.profil?.children_number ?? user?.children_number ?? 0,
        10,
      );
      if (childCount > 0) setNombreEnfants(childCount);

      const civility = user?.profil?.civility ?? user?.civility ?? "";
      if (civility === "Monsieur") {
        setGenre("homme");
      } else if (civility === "Madame" || civility === "Mlle") {
        setGenre("femme");
      }

      // 3. Salaires
      const careerData = sourceData.debug_carriere_detaillee_regex;

      if (careerData && Array.isArray(careerData)) {
        const newSalaries = {};

        careerData.forEach((entry) => {
          const annee = entry.annee;
          if (!annee) return;

          const regimes = entry.regimes_concernes || "";
          const regimesLower = regimes.toLowerCase();

          const hasBaseAlignee =
            regimesLower.includes("assurance retraite") ||
            regimesLower.includes("ssi") ||
            regimesLower.includes("msa") ||
            regimesLower.includes("agirc-arrco");

          const isPureCipav = regimesLower.includes("cipav") && !hasBaseAlignee;
          const isPureLib =
            (regimesLower.includes("profession libérale") ||
              regimesLower.includes("profession liberale")) &&
            !hasBaseAlignee;

          if (isPureCipav || isPureLib) {
            return;
          }

          let montant = entry.revenu_brut;
          if (!montant && entry.revenus) {
            const clean = entry.revenus
              .replace(/[^0-9.,]/g, "")
              .replace(",", ".");
            montant = parseFloat(clean);
          }

          if (montant) {
            newSalaries[annee] = { sr: String(montant), ss: "" };

            let salaireAnnuel = parseFloat(String(montant));
            const coeff = coeffRevalo[annee] || 1;
            const passEuro = plafondSS[annee] || 0;

            // Plafonner au PASS de l'année AVANT de revaloriser
            let salairePlafonne = salaireAnnuel;
            if (passEuro > 0) {
              if (annee <= 2001) {
                const passFrancs = passEuro * 6.556957;
                salairePlafonne = Math.min(salaireAnnuel, passFrancs);
              } else {
                salairePlafonne = Math.min(salaireAnnuel, passEuro);
              }
            }

            let salaireRevaloriser =
              annee <= 2001
                ? (salairePlafonne * coeff) / 6.556957
                : salairePlafonne * coeff;
            const seuilTrimestre =
              annee <= 2001 ? (passEuro * 6.556957) / 4 : passEuro / 4;
            const trimestre = Math.min(
              4,
              Math.max(
                0,
                Math.floor(salaireAnnuel / (seuilTrimestre || Infinity)),
              ),
            );

            setComputed((prev) => ({
              ...prev,
              [annee]: {
                revalorise: salaireRevaloriser,
                revaloriseStr: formatNumber(salaireRevaloriser),
                trimestres: trimestre,
              },
            }));
          }
        });

        setSalaries((prev) => ({ ...prev, ...newSalaries }));
      }
    },
    [user],
  );

  // UNIFIED: pre-fill from user data if available, otherwise open file picker
  const handleImportOrPrefill = useCallback(() => {
    if (user?.debug_carriere_detaillee_regex?.length) {
      handlePrefill();
    } else {
      handleImportRIS();
    }
  }, [user, handleImportRIS, handlePrefill]);

  // CALL WEBHOOK
  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const childrenCount =
          user?.profil?.children_number ?? user?.children_number ?? "";
        const birthDateVal =
          user?.profil?.date_naissance ?? user?.birth_date ?? "";
        const msg = `Analyse RIS pour CNAV Simulator.\nNombre d'enfants : ${childrenCount}\nDate de naissance : ${birthDateVal}`;

        toast.info("Analyse du RIS en cours...");

        const payload = await fetchRISAnalysis(file, msg, user?.id);

        if (!payload || !payload.debug_carriere_detaillee_regex) {
          toast.warn(
            "Le retour de l'analyse ne contient pas de données de carrière utilisables.",
          );
          console.warn("Webhook response:", payload);
        }

        handlePrefill(payload);
        toast.success("Données importées avec succès !");
      } catch (err) {
        console.error("Erreur import RIS:", err);
        toast.error("Erreur lors de l'analyse du fichier.");
      } finally {
        setIsImporting(false);
      }
    },
    [user, handlePrefill],
  );

  // Auto-prefill depuis l'import ManualCareerTable (event temps réel + sessionStorage au montage)
  useEffect(() => {
    const clientId = userId;
    if (!clientId) return;

    const onRisImport = (event) => {
      const { clientId: evtId, risData } = event.detail || {};
      if (String(evtId) !== String(clientId) || !risData) return;
      handlePrefill(risData);
    };

    window.addEventListener("risImportComplete", onRisImport);

    // Vérifier sessionStorage au montage (si l'import a eu lieu avant que ce composant soit monté)
    try {
      const stored = sessionStorage.getItem(`ris_import_data_${clientId}`);
      if (stored) {
        const { risData, timestamp } = JSON.parse(stored);
        // Ignorer si plus vieux que 5 minutes
        if (risData && Date.now() - timestamp < 5 * 60 * 1000) {
          handlePrefill(risData);
        }
      }
    } catch (e) {
      // ignore
    }

    return () => window.removeEventListener("risImportComplete", onRisImport);
  }, [userId, handlePrefill]);

  const defaultBestYears = useMemo(() => {
    if (bestYears.length) return bestYears;
    return Array.from({ length: 25 }, (_, i) => ({
      year: currentYear - i,
      value: 0,
      display: "0",
    }));
  }, [bestYears, currentYear]);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept=".pdf"
        onChange={handleFileChange}
      />
      <style>{`
        .cnav-simulator { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif; color:#4b4b4b; }
        .cnav-simulator .collapsible { border:1px solid #ddd; border-radius:16px; background:#fff; box-shadow:0 12px 30px rgba(15,23,42,0.08); }
        .cnav-simulator .collapsible-header { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; border:0; background:transparent; border-radius:16px; font-size:18px; font-weight:700; color:#1f2d3d; }
        .cnav-simulator .sim-title { font-weight: 800; text-transform: none; letter-spacing: .01em; margin: 6px 0 12px; font-size: 20px; color:#1f2d3d; }
        .cnav-simulator label { font-size:14px; }
        .cnav-simulator label[for="cnav_birth_date"] { display: inline-block; margin: 8px 0; }
        .cnav-simulator input[type="date"], .cnav-simulator input[type="text"], .cnav-simulator input[type="number"] { padding:6px 8px; border:1px solid #ddd; border-radius:6px; outline:none; }
        .cnav-simulator button.action-btn { border-radius: 8px; padding: 6px 12px; border: 1px solid #7367f0; color:#fff; background: #7367f0; cursor:pointer; }
        .cnav-simulator table { width:100%; border-collapse:collapse; font-size: 13px; }
        .cnav-simulator thead th { background-color: #7367f0; color:#fff; border:1px solid #ddd; padding:10px; text-align:center; }
        .cnav-simulator td { border:1px solid #ddd; padding:8px; vertical-align: middle; text-align:center; }
        .cnav-simulator tbody tr:nth-child(even) { background-color: #f7f7fb; }
        .cnav-simulator .grid { display:grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 1100px) { .cnav-simulator .grid { grid-template-columns: 3fr 1.2fr; } }
        .cnav-simulator .note { color:#808080; font-size:13px; margin:6px 0 12px; }
        .cnav-simulator .aside { position: relative; }
        .cnav-simulator .aside table { margin-bottom: 10px; }
        .cnav-simulator .aside th { background: #7367f0; color:#fff; }
        .cnav-simulator .checkbox-label { display:flex; align-items:center; justify-content:center; gap:.5rem; font-size:12px; }
        .cnav-simulator .simulateur-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .cnav-simulator .simulateur-table th, .cnav-simulator .simulateur-table td { text-align: center; }
        .cnav-simulator .simulateur-table input[type="number"] { width: 100%; box-sizing: border-box; padding: 6px 8px; border:1px solid #ddd; border-radius:6px; }
        .cnav-simulator .simulateur-table button { width: 100%; box-sizing: border-box; display: block; padding: 6px 8px; }
        .cnav-simulator .child-table { width:100%; border-collapse: collapse; margin: 8px 0 12px; }
        .cnav-simulator .child-table thead th { background: #7367f0; color:#fff; border:1px solid #ddd; padding:8px; text-align:center; }
        .cnav-simulator .child-table td { border:1px solid #ddd; padding:8px; text-align:center; vertical-align: middle; }
        .cnav-simulator .child-table input[type="number"] { width: 80px; box-sizing: border-box; padding: 6px 8px; border:1px solid #ddd; border-radius:6px; }
        .cnav-simulator .best-years-table { width:100%; border-collapse: collapse; table-layout: fixed; }
        .cnav-simulator .best-years-table thead th { background: #7367f0; color:#fff; border:1px solid #ddd; padding:10px; text-align:center; }
        .cnav-simulator .best-years-table td { border:1px solid #ddd; padding:8px; text-align:center; }
        .cnav-simulator .cnav-main-table input[type="text"] { width:100%; box-sizing:border-box; }
      `}</style>
      <div className="cnav-simulator">
        <div className="collapsible">
          <div className="collapsible-header open">
            <span className="sim-title" style={{ margin: 0 }}>
              SIMULATEUR PENSION S&Eacute;CURIT&Eacute; SOCIALE CNAV
            </span>
          </div>
          <div style={{ padding: 16 }}>
            {/* Date de naissance */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".5rem",
                margin: "8px 0",
              }}
            >
              <label htmlFor="cnav_birth_date">
                Quelle est votre date de naissance ?{" "}
              </label>
              <input
                type="date"
                id="cnav_birth_date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
              <button
                type="button"
                className="action-btn"
                onClick={handleAfficher}
              >
                OK
              </button>
              <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="action-btn"
                  style={{
                    background: isImporting ? "#6c757d" : "#28c76f",
                    borderColor: isImporting ? "#6c757d" : "#28c76f",
                  }}
                  onClick={handleImportOrPrefill}
                  disabled={isImporting}
                >
                  {isImporting ? "Analyse..." : "Importer les données"}
                </button>
                <button
                  type="button"
                  className="action-btn"
                  onClick={handleReset}
                >
                  R&eacute;initialiser
                </button>
              </div>
            </div>

            {/* Titres */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "center",
                margin: "6px 0 10px",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#343a40",
                }}
              >
                Simulateur de trimestres cotis&eacute;s
              </h4>
            </div>

            {/* Infos naissance */}
            {showBirthInfo && birthInfo && (
              <div style={{ marginBottom: 10 }}>
                <p>
                  Vous &ecirc;tes n&eacute; le{" "}
                  <span style={{ color: "#7367f0" }}>
                    {birthInfo.formattedDate}
                  </span>
                  . Vous pouvez partir en retraite d&egrave;s{" "}
                  <span style={{ color: "#7367f0" }}>
                    {birthInfo.retirementAge}
                  </span>{" "}
                  et avec{" "}
                  <span style={{ color: "#7367f0" }}>
                    {birthInfo.trimTauxPlein}
                  </span>{" "}
                  trimestres pour obtenir le taux plein*,
                </p>
                {birthInfo.isRetired ? (
                  <p>Vous &ecirc;tes en retraite</p>
                ) : (
                  <p>
                    Il vous reste{" "}
                    <span style={{ color: "#7367f0" }}>
                      {birthInfo.anneeRestant}
                    </span>{" "}
                    ann&eacute;e(s) et{" "}
                    <span style={{ color: "#7367f0" }}>
                      {birthInfo.moisRestant}
                    </span>{" "}
                    mois avant votre retraite. Soit{" "}
                    <span style={{ color: "#7367f0" }}>
                      {birthInfo.totalMois}
                    </span>{" "}
                    mois avant votre retraite.
                  </p>
                )}
                <p className="note">
                  * Nombre d&rsquo;ann&eacute;es restant &agrave; travailler
                  avant la retraite :<br />
                  <span style={{ color: "#808080" }}>
                    Cette r&eacute;ponse est bas&eacute;e sur l&rsquo;&acirc;ge
                    l&eacute;gal de retraite. Vous pourriez devoir travailler
                    moins si vous &ecirc;tes &eacute;ligible carri&egrave;re
                    longue (d&eacute;part anticip&eacute;), ou travailler plus
                    pour obtenir votre taux plein si vous &ecirc;tes
                    rentr&eacute; sur le march&eacute; du travail tardivement
                    (&eacute;tudes sup&eacute;rieures etc,)
                  </span>
                </p>
              </div>
            )}

            {/* Grille principale */}
            <div className="grid">
              {/* Table principale */}
              <div className="main">
                <table className="cnav-main-table">
                  <colgroup>
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "6%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Ann&eacute;es</th>
                      <th>Salaires R&eacute;els (F/&euro;)</th>
                      <th>Salaire SS(F/&euro;)</th>
                      <th>Coeff. Revalo</th>
                      <th>Salaires Revaloris&eacute;s</th>
                      <th>D&eacute;plafonner</th>
                      <th>Trimestres</th>
                      <th>AR</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedYears.map((year) => {
                      const isFranc = year <= 2001;
                      const placeholder = isFranc ? "en Franc" : "en \u20ACuro";
                      const sal = salaries[year] || {};
                      const isDeplaf = deplafonner[year] || false;
                      const comp = computed[year];

                      return (
                        <tr key={year}>
                          <td>{year}</td>
                          <td>
                            <input
                              type="text"
                              placeholder={placeholder}
                              title={
                                isFranc
                                  ? "Saisir le montant en francs (FRF)"
                                  : "Saisir le montant en euros (\u20AC)"
                              }
                              value={sal.sr || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSalaries((prev) => ({
                                  ...prev,
                                  [year]: { ...prev[year], sr: val },
                                }));
                                handleSimulateur(val, year, isDeplaf);
                              }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder={placeholder}
                              title={
                                isFranc
                                  ? "Saisir le montant en francs (FRF)"
                                  : "Saisir le montant en euros (\u20AC)"
                              }
                              value={sal.ss || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSalaries((prev) => ({
                                  ...prev,
                                  [year]: { ...prev[year], ss: val },
                                }));
                                handleSimulateur(val, year, isDeplaf);
                              }}
                            />
                          </td>
                          <td>{coeffRevalo[year] || ""}</td>
                          <td>{comp ? comp.revaloriseStr : "0"}</td>
                          <td>
                            {year < 2005 ? (
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={isDeplaf}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setDeplafonner((prev) => ({
                                      ...prev,
                                      [year]: checked,
                                    }));
                                    const currentSr =
                                      (salaries[year] || {}).sr || "";
                                    if (currentSr)
                                      handleSimulateur(
                                        currentSr,
                                        year,
                                        checked,
                                      );
                                  }}
                                />
                              </label>
                            ) : null}
                          </td>
                          <td>{comp ? String(comp.trimestres) : "0"}</td>
                          <td></td>
                          <td></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Panneau lateral */}
              <div className="aside">
                {/* Trimestres assimiles */}
                <div style={{ marginTop: 0 }}>
                  <h4
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#343a40",
                      marginBottom: 8,
                    }}
                  >
                    Simulateur de trimestres assimil&eacute;s
                  </h4>
                  <table className="simulateur-table">
                    <colgroup>
                      <col style={{ width: "55%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "25%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Nombre</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: "serviceNational", label: "Service national" },
                        {
                          key: "chomageIndemnise",
                          label: "Ch\u00F4mage indemnis\u00E9",
                        },
                        {
                          key: "chomageNonIndemnise",
                          label: "Ch\u00F4mage non indemnis\u00E9",
                        },
                        { key: "maladieAccident", label: "Maladie et AT" },
                      ].map((item) => (
                        <tr key={item.key}>
                          <td>{item.label}</td>
                          <td>
                            <input
                              type="number"
                              value={assimilatedInputs[item.key]}
                              min="0"
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10) || 0;
                                setAssimilatedInputs((prev) => ({
                                  ...prev,
                                  [item.key]: v,
                                }));
                              }}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() => handleAjouterTrimestres(item.key)}
                            >
                              Ajouter
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td>Trimestres calcul&eacute;s par salaire</td>
                        <td>
                          <span>{trimestresParSalaire}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={handleAjouterTrimestresSalaire}
                          >
                            Ajouter
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>Invalidit&eacute;s</td>
                        <td>
                          <span>0</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() => {}}
                          >
                            Ajouter
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p>
                    Total des trimestres assimil&eacute;s:{" "}
                    <span>{totalTrimestresAssimiles}</span>
                  </p>
                </div>

                {/* Trimestres enfant */}
                <table className="child-table">
                  <thead>
                    <tr>
                      <th>Enfants</th>
                      <th>Genre</th>
                      <th>Statut</th>
                      <th>Handicap</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <input
                          type="number"
                          value={nombreEnfants}
                          min="0"
                          step="1"
                          onChange={(e) => {
                            let v = parseInt(e.target.value, 10);
                            if (isNaN(v) || v < 0) v = 0;
                            setNombreEnfants(v);
                          }}
                        />
                      </td>
                      <td>
                        <select
                          value={genre}
                          onChange={(e) => setGenre(e.target.value)}
                          style={{
                            padding: "6px 8px",
                            border: "1px solid #ddd",
                            borderRadius: 6,
                          }}
                        >
                          <option value="femme">Femme</option>
                          <option value="homme">Homme</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={statut}
                          onChange={(e) => setStatut(e.target.value)}
                          style={{
                            padding: "6px 8px",
                            border: "1px solid #ddd",
                            borderRadius: 6,
                          }}
                        >
                          <option value="prive">
                            Salari&eacute; priv&eacute;
                          </option>
                          <option value="fonctionnaire">Fonctionnaire</option>
                        </select>
                      </td>
                      <td>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={enfantHandicap}
                            onChange={(e) =>
                              setEnfantHandicap(e.target.checked)
                            }
                          />{" "}
                          Handicap
                        </label>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p>
                  Trimestres enfant:{" "}
                  <span style={{ fontWeight: 600, color: "#7367f0" }}>
                    {trimestresEnfant}
                  </span>
                  <span
                    style={{ color: "#808080", fontSize: 12, marginLeft: 8 }}
                  >
                    (
                    {genre === "femme"
                      ? statut === "fonctionnaire"
                        ? `${nombreEnfants} × 4 trim.`
                        : `${nombreEnfants} × 8 trim. (4 maternit\u00E9 + 4 \u00E9ducation)`
                      : "0 (maternit\u00E9 = m\u00E8re uniquement)"}
                    {enfantHandicap && nombreEnfants > 0
                      ? ` + ${nombreEnfants} × 8 trim. handicap`
                      : ""}
                    )
                  </span>
                </p>

                {/* Totaux trimestres */}
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    margin: "8px 0 12px",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          background: "#7367f0",
                          color: "#fff",
                          border: "1px solid #ddd",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        Type
                      </th>
                      <th
                        style={{
                          background: "#7367f0",
                          color: "#fff",
                          border: "1px solid #ddd",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        Nombre
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #ddd", padding: 8 }}>
                        Trimestres cotis&eacute;s
                      </td>
                      <td
                        style={{
                          border: "1px solid #ddd",
                          padding: 8,
                          textAlign: "center",
                          fontWeight: 600,
                        }}
                      >
                        {totalTrimestresCotises}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #ddd", padding: 8 }}>
                        Trimestres assimil&eacute;s
                      </td>
                      <td
                        style={{
                          border: "1px solid #ddd",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {totalTrimestresAssimiles}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #ddd", padding: 8 }}>
                        Trimestres enfant
                      </td>
                      <td
                        style={{
                          border: "1px solid #ddd",
                          padding: 8,
                          textAlign: "center",
                        }}
                      >
                        {trimestresEnfant}
                      </td>
                    </tr>
                    <tr style={{ background: "#f0eeff" }}>
                      <td
                        style={{
                          border: "1px solid #ddd",
                          padding: 8,
                          fontWeight: 700,
                        }}
                      >
                        Total trimestres
                      </td>
                      <td
                        style={{
                          border: "1px solid #ddd",
                          padding: 8,
                          textAlign: "center",
                          fontWeight: 700,
                          color: "#7367f0",
                        }}
                      >
                        {totalTrimestresGlobal}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 25 meilleures annees */}
                <table className="best-years-table">
                  <colgroup>
                    <col style={{ width: "50%" }} />
                    <col style={{ width: "50%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Ann&eacute;e</th>
                      <th>Les 25 meilleures ann&eacute;es</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaultBestYears.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.year}</td>
                        <td>{item.display}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <table>
                  <thead>
                    <tr>
                      <th>
                        Total des meilleures ann&eacute;es revaloris&eacute;es
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{formatNumber(totalBestYears)} &euro;</td>
                    </tr>
                  </tbody>
                </table>
                <table>
                  <thead>
                    <tr>
                      <th>MOYENNE ANNUELLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{formatNumber(moyenneAnnuelle)} &euro;</td>
                    </tr>
                  </tbody>
                </table>

                <div
                  style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}
                >
                  <button
                    type="button"
                    className="action-btn"
                    onClick={handleSimulationFinale}
                  >
                    Simuler
                  </button>
                  <button
                    type="button"
                    className="action-btn"
                    style={{ background: "#aaa", borderColor: "#aaa" }}
                    onClick={handleReset}
                  >
                    R&eacute;initialiser
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
