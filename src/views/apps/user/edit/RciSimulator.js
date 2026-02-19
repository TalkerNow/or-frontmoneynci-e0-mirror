import React, { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "react-toastify";
import { fetchRISAnalysis } from "./risService";
import { plafondSS, rciPrixAchat, rciTauxDisplay } from "./simulatorData";

const YEARS_START = 1971;
const YEARS_END = 2026;
const TAUX_CONVERSION_FRF_EUR = 6.55957;

export default function RciSimulator({ user }) {
  const [salaries, setSalaries] = useState({});
  const [computed, setComputed] = useState({});
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef(null);

  const sortedYears = useMemo(() => {
    const years = [];
    for (let y = YEARS_START; y <= YEARS_END; y++) years.push(y);
    return years.sort((a, b) => b - a);
  }, []);

  const handleSimulateur = useCallback((salaireBrut, year) => {
    let salaire = parseFloat(String(salaireBrut).replace(/\s/g, "").replace(",", "."));
    const display = rciTauxDisplay[year];
    if (!plafondSS[year] || !rciPrixAchat[year] || !display || isNaN(salaire)) {
      setComputed((prev) => {
        const next = { ...prev };
        delete next[year];
        return next;
      });
      return;
    }

    // Conversion Francs -> Euros pour les annees avant 2002
    if (year < 2002) salaire = salaire / TAUX_CONVERSION_FRF_EUR;

    const pass = plafondSS[year];
    const prixAchat = rciPrixAchat[year];
    const tauxA = parseFloat((display.tauxA || "").replace(",", ".").replace("%", "")) / 100;
    const tauxB = parseFloat((display.tauxB || "").replace(",", ".").replace("%", "")) / 100;

    // Tranche 1 : 0 a 1 PASS
    const cotisA = Math.min(Math.max(salaire, 0), pass) * tauxA;
    // Tranche 2 : 1 PASS a 4 PASS (soit max 3 * PASS au-dessus du plafond)
    const cotisB = Math.min(Math.max(salaire - pass, 0), 3 * pass) * tauxB;
    const pointsA = cotisA / prixAchat;
    const pointsB = cotisB / prixAchat;
    const totalPoints = pointsA + pointsB;

    setComputed((prev) => ({
      ...prev,
      [year]: {
        tra: pointsA.toFixed(5) + " points",
        trb: pointsB.toFixed(5) + " points",
        total: totalPoints.toFixed(5) + " points",
      },
    }));
  }, []);

  const handleReset = useCallback(() => {
    setSalaries({});
    setComputed({});
  }, []);

  const handlePrefill = useCallback(
    (overrideData = null) => {
      let sourceData = user;
      if (
        overrideData &&
        (overrideData.detail_annuel ||
          overrideData.debug_carriere_detaillee_regex)
      ) {
        sourceData = overrideData;
      }
      if (!sourceData) return;

      const detailAnnuel = sourceData.detail_annuel;
      if (!Array.isArray(detailAnnuel) || detailAnnuel.length === 0) return;

      const newSalaries = {};
      const newComputed = {};

      detailAnnuel.forEach((entry) => {
        const annee = entry.annee;
        const regimes = (entry.regimes_concernes || "").toLowerCase();
        if (!regimes.includes("rci")) return;

        const revenusStr = entry.revenus || "";
        // Split par +, €, FRF, EUR pour isoler chaque montant
        const amounts = revenusStr
          .split(/[+]|\u20AC|FRF|EUR/i)
          .map((s) => {
            const digits = s.replace(/[^\d]/g, "");
            return digits ? parseInt(digits, 10) : NaN;
          })
          .filter((n) => !isNaN(n) && n > 0);

        if (amounts.length === 0) return;

        let montant;
        // Quand plusieurs régimes et montants, associer RCI à sa position
        const regimesList = (entry.regimes_concernes || "").split(/,\s*/);
        const rciIndex = regimesList.findIndex((r) =>
          r.toLowerCase().includes("rci"),
        );

        if (
          amounts.length > 1 &&
          regimesList.length > 1 &&
          rciIndex >= 0 &&
          rciIndex < amounts.length
        ) {
          montant = amounts[rciIndex];
        } else {
          montant = amounts.reduce((sum, a) => sum + a, 0);
        }

        if (!montant || montant <= 0) return;

        newSalaries[annee] = String(montant);

        let salaire = parseFloat(String(montant));
        const display = rciTauxDisplay[annee];
        if (
          !plafondSS[annee] ||
          !rciPrixAchat[annee] ||
          !display ||
          isNaN(salaire)
        )
          return;

        // Conversion Francs -> Euros pour les annees avant 2002
        if (annee < 2002) salaire = salaire / TAUX_CONVERSION_FRF_EUR;

        const pass = plafondSS[annee];
        const prixAchat = rciPrixAchat[annee];
        const tauxA =
          parseFloat((display.tauxA || "").replace(",", ".").replace("%", "")) /
          100;
        const tauxB =
          parseFloat((display.tauxB || "").replace(",", ".").replace("%", "")) /
          100;

        const cotisA = Math.min(Math.max(salaire, 0), pass) * tauxA;
        const cotisB = Math.min(Math.max(salaire - pass, 0), 3 * pass) * tauxB;
        const pointsA = cotisA / prixAchat;
        const pointsB = cotisB / prixAchat;
        const totalPoints = pointsA + pointsB;

        newComputed[annee] = {
          tra: pointsA.toFixed(5) + " points",
          trb: pointsB.toFixed(5) + " points",
          total: totalPoints.toFixed(5) + " points",
        };
      });

      setSalaries(newSalaries);
      setComputed(newComputed);
    },
    [user],
  );

  // Auto-prefill depuis l'import ManualCareerTable (event temps reel + sessionStorage au montage)
  useEffect(() => {
    const clientId = user?.id;
    if (!clientId) return;

    const onRisImport = (event) => {
      const { clientId: evtId, risData } = event.detail || {};
      if (String(evtId) !== String(clientId) || !risData) return;
      handlePrefill(risData);
    };

    window.addEventListener("risImportComplete", onRisImport);

    try {
      const stored = sessionStorage.getItem(`ris_import_data_${clientId}`);
      if (stored) {
        const { risData, timestamp } = JSON.parse(stored);
        if (risData && Date.now() - timestamp < 5 * 60 * 1000) {
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
        const msg = `Analyse RIS pour RCI Simulator.\nNombre d'enfants : ${childrenCount}\nDate de naissance : ${birthDateVal}`;

        toast.info("Analyse du RIS en cours...");

        const payload = await fetchRISAnalysis(file, msg, user?.id);

        if (!payload || !payload.debug_carriere_detaillee_regex) {
          toast.warn(
            "Le retour de l'analyse ne contient pas de donn\u00e9es de carri\u00e8re utilisables.",
          );
          console.warn("Webhook response:", payload);
        }

        handlePrefill(payload);
        toast.success("Donn\u00e9es import\u00e9es avec succ\u00e8s !");
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
        .rci-simulator { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif; color:#4b4b4b; }
        .rci-simulator .sim-title { font-weight: 800; text-transform: uppercase; letter-spacing: .02em; margin: 6px 0 8px; font-size: 20px; color:#1f2d3d; }
        .rci-simulator .collapsible { border:1px solid #ddd; border-radius:16px; background:#fff; box-shadow:0 12px 30px rgba(15,23,42,0.08); }
        .rci-simulator .collapsible-header { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; border:0; background:transparent; border-radius:16px; font-size:18px; font-weight:700; color:#1f2d3d; }
        .rci-simulator table { width:auto; max-width:100%; border-collapse:collapse; font-size:13px; }
        .rci-simulator tbody tr:nth-child(even) { background-color:#f7f7fb; }
        .rci-simulator tbody tr:nth-child(odd) { background-color:#fff; }
        .rci-simulator td { border:1px solid #ddd; padding:8px; vertical-align:middle; text-align:center; white-space:nowrap; }
        .rci-simulator th { background-color:#7367f0; color:#fff; border:1px solid #ddd; padding:8px; text-align:center; white-space:nowrap; width:1%; }
        .rci-simulator input[type="text"],
        .rci-simulator input[type="number"],
        .rci-simulator input[type="date"] { width:100%; box-sizing:border-box; padding:6px 8px; border:1px solid #ddd; border-radius:6px; outline:none; display:block; background-color:#fff; color:#1f2d3d; }
        .rci-simulator .salary-input { width:110px; max-width:110px; }
        .rci-simulator button.action-btn { border-radius:8px; padding:6px 12px; border:1px solid #7367f0; color:#fff; background:#7367f0; cursor:pointer; }
        .rci-simulator .container-inner { padding:12px; }
      `}</style>
      <div className="rci-simulator">
        <div className="container-inner">
          <div className="collapsible">
            <div className="collapsible-header open">
              <span className="sim-title" style={{ margin: 0 }}>
                CALCUL NOMBRE DE POINTS &Agrave; PARTIR D&rsquo;UN REVENU
              </span>
            </div>
            <div style={{ padding: 16 }}>
              <div
                style={{
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
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
              <table className="tableizer-table">
                <thead>
                  <tr>
                    <th>Ann&eacute;e</th>
                    <th>Revenu (&euro;)</th>
                    <th>Taux Tranche 1</th>
                    <th>Taux Tranche 2</th>
                    <th>Prix d&rsquo;achat du point (&euro;)</th>
                    <th>TRANCHE 1</th>
                    <th>TRANCHE 2</th>
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedYears.map((year) => {
                    const display = rciTauxDisplay[year] || {};
                    const comp = computed[year];
                    return (
                      <tr key={year}>
                        <td>{year}</td>
                        <td>
                          <input
                            type="text"
                            className="salary-input"
                            placeholder={year >= 2002 ? "en Euro" : "en Francs"}
                            value={salaries[year] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSalaries((prev) => ({ ...prev, [year]: val }));
                              handleSimulateur(val, year);
                            }}
                          />
                        </td>
                        <td>{display.tauxA || ""}</td>
                        <td>{display.tauxB || ""}</td>
                        <td>{display.ref || ""}</td>
                        <td>{comp ? comp.tra : ""}</td>
                        <td>{comp ? comp.trb : ""}</td>
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
