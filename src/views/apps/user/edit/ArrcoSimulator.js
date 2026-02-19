import React, { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "react-toastify";
import { fetchRISAnalysis } from "./risService";
import { arrcoPlafond, arrcoTaux, arrcoTauxDisplay } from "./simulatorData";

const YEARS_START = 1963;
const YEARS_END = 2026;

export default function ArrcoSimulator({ user }) {
  const [isCadre, setIsCadre] = useState(false);
  const [salaries, setSalaries] = useState({});
  const [computed, setComputed] = useState({});
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef(null);

  const sortedYears = useMemo(() => {
    const years = [];
    for (let y = YEARS_START; y <= YEARS_END; y++) years.push(y);
    return years.sort((a, b) => b - a);
  }, []);

  const computeNonCadre = useCallback((annuelBrut, year, x) => {
    const plafondAnnuel = arrcoPlafond[x][2];

    if (year < 2019) {
      const tauxTA = arrcoTaux[x][1];
      const tauxTB = arrcoTaux[x][2];
      const valeurT1 = arrcoTaux[x][6];
      const valeurAchatArrco = arrcoTaux[x][8];

      const trancheA = Math.min(Math.max(annuelBrut, 0), plafondAnnuel);
      const cotisationTA = trancheA * tauxTA;
      let cotisationTB = 0;
      if (annuelBrut > plafondAnnuel) {
        const excedent = annuelBrut - plafondAnnuel;
        const trancheB = Math.min(excedent, 2 * plafondAnnuel);
        cotisationTB = trancheB * tauxTB;
      }
      const totalCotisations = cotisationTB * 0.347791548;
      const totalPoints =
        totalCotisations / valeurAchatArrco + cotisationTA / valeurT1;

      return {
        trancheA: (cotisationTA / valeurT1).toFixed(2) + " pts (A)",
        trancheB: (cotisationTB / valeurAchatArrco).toFixed(2) + " pts (B)",
        total: totalPoints.toFixed(2) + " pts (Total)",
      };
    } else {
      const tauxTA = arrcoTaux[x][1];
      const tauxTB = arrcoTaux[x][3];
      const valeurAchatPoint = arrcoTaux[x][8];

      const cotisationTA = Math.min(annuelBrut, plafondAnnuel) * tauxTA;
      const pointsTA = cotisationTA / valeurAchatPoint;
      let pointsTB = 0;
      if (annuelBrut > plafondAnnuel) {
        const cotisationTB = (annuelBrut - plafondAnnuel) * tauxTB;
        pointsTB = cotisationTB / valeurAchatPoint;
      }
      const totalPoints = pointsTA + pointsTB;

      return {
        trancheA: pointsTA.toFixed(2) + " points",
        trancheB: pointsTB.toFixed(2) + " points",
        total: totalPoints.toFixed(2) + " points",
      };
    }
  }, []);

  const computeCadre = useCallback((annuelBrut, year, x) => {
    const plafondAnnuel = arrcoPlafond[x][2];

    if (year < 2019) {
      const tauxArrco = arrcoTaux[x][1];
      const tauxAgirc = arrcoTaux[x][3];
      const valeurPtArrco = arrcoTaux[x][6];
      const valeurPtAgirc = arrcoTaux[x][8];

      const cotisA = Math.min(annuelBrut, plafondAnnuel) * tauxArrco;
      const pointsA = cotisA / valeurPtArrco;
      let pointsB = 0;
      if (annuelBrut > plafondAnnuel) {
        const cotisB = (annuelBrut - plafondAnnuel) * tauxAgirc;
        pointsB = cotisB / valeurPtAgirc;
      }
      const totalPoints = pointsA + pointsB * 0.347791548;

      return {
        trancheA: pointsA.toFixed(2) + " points",
        trancheB: pointsB.toFixed(2) + " points",
        total: totalPoints.toFixed(2) + " points",
      };
    } else {
      const tauxTA = arrcoTaux[x][1];
      const tauxTB = arrcoTaux[x][3];
      const valeurAchatPoint = arrcoTaux[x][8];

      const cotisationTA = Math.min(annuelBrut, plafondAnnuel) * tauxTA;
      const pointsTA = cotisationTA / valeurAchatPoint;
      let pointsTB = 0;
      if (annuelBrut > plafondAnnuel) {
        const cotisationTB = (annuelBrut - plafondAnnuel) * tauxTB;
        pointsTB = cotisationTB / valeurAchatPoint;
      }
      const totalPoints = pointsTA + pointsTB;

      return {
        trancheA: pointsTA.toFixed(2) + " points",
        trancheB: pointsTB.toFixed(2) + " points",
        total: totalPoints.toFixed(2) + " points",
      };
    }
  }, []);

  const handleSalaryChange = useCallback(
    (year, value, cadre) => {
      setSalaries((prev) => ({ ...prev, [year]: value }));

      let annuelBrut = parseFloat(value);
      if (isNaN(annuelBrut)) {
        setComputed((prev) => {
          const next = { ...prev };
          delete next[year];
          return next;
        });
        return;
      }
      if (year < 2002) annuelBrut = annuelBrut / 6.55957;

      const x = arrcoPlafond.findIndex((p) => p[0] === year);
      if (x < 0) return;

      const result = cadre
        ? computeCadre(annuelBrut, year, x)
        : computeNonCadre(annuelBrut, year, x);
      setComputed((prev) => ({ ...prev, [year]: result }));
    },
    [computeNonCadre, computeCadre],
  );

  const handleStatusChange = useCallback(
    (cadre) => {
      setIsCadre(cadre);
      setSalaries((prev) => {
        const newComputed = {};
        Object.entries(prev).forEach(([yearStr, value]) => {
          const year = parseInt(yearStr, 10);
          let annuelBrut = parseFloat(value);
          if (isNaN(annuelBrut)) return;
          if (year < 2002) annuelBrut = annuelBrut / 6.55957;
          const x = arrcoPlafond.findIndex((p) => p[0] === year);
          if (x < 0) return;
          newComputed[year] = cadre
            ? computeCadre(annuelBrut, year, x)
            : computeNonCadre(annuelBrut, year, x);
        });
        setComputed(newComputed);
        return prev;
      });
    },
    [computeNonCadre, computeCadre],
  );

  const handleReset = useCallback(() => {
    setSalaries({});
    setComputed({});
  }, []);

  const handlePrefill = useCallback(
    (overrideData = null) => {
      let sourceData = user;
      if (overrideData && overrideData.debug_carriere_detaillee_regex) {
        sourceData = overrideData;
      }
      if (!sourceData) return;

      // Build set of Agirc-Arrco years from detail_annuel (accurate regime info)
      const detailAnnuel = sourceData.detail_annuel;
      const arrcoYears = new Set();
      if (Array.isArray(detailAnnuel)) {
        detailAnnuel.forEach((entry) => {
          const regimes = (entry.regimes_concernes || "").toLowerCase();
          if (regimes.includes("agirc-arrco")) arrcoYears.add(entry.annee);
        });
      }

      // Use debug_carriere_detaillee_regex for clean revenue amounts
      const careerData = sourceData.debug_carriere_detaillee_regex;
      if (!careerData || !Array.isArray(careerData) || careerData.length === 0)
        return;

      const newSalaries = {};
      const newComputed = {};

      careerData.forEach((entry) => {
        const annee = entry.annee;
        if (!annee || !arrcoYears.has(annee)) return;

        let montant = entry.revenu_brut;
        if (!montant && entry.revenus) {
          const clean = entry.revenus
            .replace(/[^0-9.,]/g, "")
            .replace(",", ".");
          montant = parseFloat(clean);
        }
        if (!montant) return;

        newSalaries[annee] = String(montant);

        let annuelBrut = parseFloat(String(montant));
        if (annee < 2002) annuelBrut = annuelBrut / 6.55957;

        const x = arrcoPlafond.findIndex((p) => p[0] === annee);
        if (x < 0) return;

        newComputed[annee] = isCadre
          ? computeCadre(annuelBrut, annee, x)
          : computeNonCadre(annuelBrut, annee, x);
      });

      setSalaries(newSalaries);
      setComputed(newComputed);
    },
    [user, isCadre, computeCadre, computeNonCadre],
  );

  // Auto-prefill depuis l'import ManualCareerTable (event temps réel + sessionStorage au montage)
  useEffect(() => {
    const clientId = user?.id;
    if (!clientId) return;

    const onRisImport = (event) => {
      const {
        clientId: evtId,
        risData,
        isCadre: evtCadre,
      } = event.detail || {};
      if (String(evtId) !== String(clientId) || !risData) return;
      if (evtCadre !== undefined) setIsCadre(evtCadre);
      handlePrefill(risData);
    };

    window.addEventListener("risImportComplete", onRisImport);

    try {
      const stored = sessionStorage.getItem(`ris_import_data_${clientId}`);
      if (stored) {
        const { risData, isCadre: storedCadre, timestamp } = JSON.parse(stored);
        if (risData && Date.now() - timestamp < 5 * 60 * 1000) {
          if (storedCadre !== undefined) setIsCadre(storedCadre);
          handlePrefill(risData);
        }
      }
    } catch (e) {
      // ignore
    }

    return () => window.removeEventListener("risImportComplete", onRisImport);
  }, [user, handlePrefill]);

  const handleImportRIS = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const handleImportOrPrefill = useCallback(() => {
    if (user?.debug_carriere_detaillee_regex?.length) {
      handlePrefill();
    } else {
      handleImportRIS();
    }
  }, [user, handlePrefill, handleImportRIS]);

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
        const msg = `Analyse RIS pour Agirc-Arrco Simulator.\nNombre d'enfants : ${childrenCount}\nDate de naissance : ${birthDateVal}`;

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
        .arrco-simulator { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif; color:#4b4b4b; }
        .arrco-simulator .sim-title { font-weight: 800; text-transform: uppercase; letter-spacing: .02em; margin: 6px 0 8px; font-size: 20px; color:#1f2d3d; }
        .arrco-simulator .collapsible { border:1px solid #ddd; border-radius:16px; background:#fff; box-shadow:0 12px 30px rgba(15,23,42,0.08); }
        .arrco-simulator .collapsible-header { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; border:0; background:transparent; cursor:pointer; border-radius:16px; font-size:18px; font-weight:700; color:#1f2d3d; }
        .arrco-simulator .collapsible-header .chevron { transition: transform .25s ease; color:#6b7280; }
        .arrco-simulator .collapsible-header.open .chevron { transform: rotate(180deg); }
        .arrco-simulator .controls { margin-bottom:8px; font-size:14px; }
        .arrco-simulator .controls input[type="radio"] { accent-color: #7367f0; }
        .arrco-simulator .controls input[type="radio"] + label { font-weight: 400; }
        .arrco-simulator .controls input[type="radio"]:checked + label { font-weight: 700; }
        .arrco-simulator .divider { margin-right:50px; height:auto; display:inline-block; }
        .arrco-simulator table { width:auto; max-width:100%; border-collapse:collapse; font-size:13px; }
        .arrco-simulator tbody tr:nth-child(even) { background-color:#f7f7fb; }
        .arrco-simulator tbody tr:nth-child(odd) { background-color:#fff; }
        .arrco-simulator td { border:1px solid #ddd; padding:8px; vertical-align:middle; white-space:nowrap; }
        .arrco-simulator th { background-color:#7367f0; color:#fff; border:1px solid #ddd; padding:8px; text-align:center; white-space:nowrap; width:1%; }
        .arrco-simulator input[type="text"],
        .arrco-simulator input[type="number"],
        .arrco-simulator input[type="date"] { width:100%; box-sizing:border-box; padding:6px 8px; border:1px solid #ddd; border-radius:6px; outline:none; display:block; }
        .arrco-simulator .salary-input { width:110px; max-width:110px; }
        .arrco-simulator button.action-btn { border-radius:8px; padding:6px 12px; border:1px solid #7367f0; color:#fff; background:#7367f0; cursor:pointer; }
        .arrco-simulator .container-inner { padding:12px; }
      `}</style>
      <div className="arrco-simulator">
        <div className="container-inner">
          <div className="collapsible">
            <div className="collapsible-header open">
              <span className="sim-title" style={{ margin: 0 }}>
                CALCUL NOMBRE DE POINTS &Agrave; PARTIR D&rsquo;UN SALAIRE
              </span>
            </div>
            <div style={{ padding: 16 }}>
              <div
                className="controls"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <b style={{ fontWeight: 600, fontSize: 14 }}>Statut :</b>
                  <input
                    type="radio"
                    id="arrco-non-cadre"
                    name="arrco-cadreStatus"
                    checked={!isCadre}
                    onChange={() => handleStatusChange(false)}
                  />
                  <label htmlFor="arrco-non-cadre">Non-Cadre</label>
                  <input
                    type="radio"
                    id="arrco-cadre"
                    name="arrco-cadreStatus"
                    checked={isCadre}
                    onChange={() => handleStatusChange(true)}
                  />
                  <label htmlFor="arrco-cadre">Cadre</label>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
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
                    {isImporting ? "Analyse..." : "Importer les donn\u00e9es"}
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

              <table className="tableizer-table">
                <thead>
                  <tr>
                    <th>Ann&eacute;e</th>
                    <th>Salaire (F/&euro;)</th>
                    <th>Taux service Tranche A</th>
                    <th>Taux service Tranche B</th>
                    <th>Salaire r&eacute;f&eacute;rence (F/&euro;)</th>
                    <th>TRANCHE A</th>
                    <th>TRANCHE B</th>
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedYears.map((year) => {
                    const isFranc = year <= 2001;
                    const display = arrcoTauxDisplay[year] || {};
                    const comp = computed[year];
                    return (
                      <tr key={year}>
                        <td>{year}</td>
                        <td>
                          <input
                            type="text"
                            className="salary-input"
                            placeholder={isFranc ? "en Franc" : "en \u20ACuro"}
                            value={salaries[year] || ""}
                            onChange={(e) =>
                              handleSalaryChange(year, e.target.value, isCadre)
                            }
                          />
                        </td>
                        <td>{display.tauxA || ""}</td>
                        <td>{display.tauxB || ""}</td>
                        <td>{display.ref || ""}</td>
                        <td>{comp ? comp.trancheA : ""}</td>
                        <td>{comp ? comp.trancheB : ""}</td>
                        <td>{comp ? comp.total : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
