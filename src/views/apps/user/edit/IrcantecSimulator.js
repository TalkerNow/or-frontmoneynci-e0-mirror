import React, { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "react-toastify";
import { fetchRISAnalysis } from "./risService";
import { ircantecPlafonds, ircantecValeursPoint, ircantecTauxDisplay } from "./simulatorData";

const YEARS_START = 1963;
const YEARS_END = 2026;

export default function IrcantecSimulator({ user }) {
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
    const salaire = parseFloat(String(salaireBrut).replace(/\s/g, "").replace(",", "."));
    const display = ircantecTauxDisplay[year];
    if (!ircantecPlafonds[year] || !ircantecValeursPoint[year] || !display || isNaN(salaire)) {
      setComputed(prev => {
        const next = { ...prev };
        delete next[year];
        return next;
      });
      return;
    }

    const plafondAnnuel = ircantecPlafonds[year];
    const valeurPoint = ircantecValeursPoint[year];
    const tauxA = parseFloat((display.tauxA || "").replace(",", ".").replace("%", "")) / 100;
    const tauxB = parseFloat((display.tauxB || "").replace(",", ".").replace("%", "")) / 100;

    const cotisA = Math.min(salaire, plafondAnnuel) * tauxA;
    const cotisB = Math.max(0, Math.min(salaire, 8 * plafondAnnuel) - plafondAnnuel) * tauxB;
    const pointsA = cotisA / valeurPoint;
    const pointsB = cotisB / valeurPoint;
    const totalPoints = pointsA + pointsB;

    setComputed(prev => ({
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

  const handlePrefill = useCallback((overrideData = null) => {
    let sourceData = user;
    if (overrideData && (overrideData.detail_annuel || overrideData.debug_carriere_detaillee_regex)) {
      sourceData = overrideData;
    }
    if (!sourceData) return;

    const detailAnnuel = sourceData.detail_annuel;
    if (!Array.isArray(detailAnnuel) || detailAnnuel.length === 0) return;

    const newSalaries = {};
    const newComputed = {};

    detailAnnuel.forEach(entry => {
      const annee = entry.annee;
      const regimes = (entry.regimes_concernes || "").toLowerCase();
      if (!regimes.includes("ircantec")) return;

      // Parse individual revenue amounts from detail_annuel
      // Split by currency marker (€, FRF, EUR) to reliably isolate each amount
      const revenusStr = entry.revenus || "";
      const amounts = revenusStr.split(/€|FRF|EUR/i).map(s => {
        const digits = s.replace(/[^\d]/g, "");
        return digits ? parseInt(digits, 10) : NaN;
      }).filter(n => !isNaN(n) && n > 0);

      if (amounts.length === 0) return;

      let montant;
      if (regimes.includes("agirc-arrco") && amounts.length > 1) {
        // Mixed year (Agirc-Arrco + Ircantec): exclude the largest amount
        // (main Agirc-Arrco salary) to isolate Ircantec revenue
        const maxAmount = Math.max(...amounts);
        montant = amounts.reduce((sum, a) => sum + a, 0) - maxAmount;
      } else {
        // Ircantec-only year: use the full total
        montant = amounts.reduce((sum, a) => sum + a, 0);
      }

      if (!montant || montant <= 0) return;

      newSalaries[annee] = String(montant);

      const salaire = parseFloat(String(montant));
      const display = ircantecTauxDisplay[annee];
      if (!ircantecPlafonds[annee] || !ircantecValeursPoint[annee] || !display || isNaN(salaire)) return;

      const plafondAnnuel = ircantecPlafonds[annee];
      const valeurPoint = ircantecValeursPoint[annee];
      const tauxA = parseFloat((display.tauxA || "").replace(",", ".").replace("%", "")) / 100;
      const tauxB = parseFloat((display.tauxB || "").replace(",", ".").replace("%", "")) / 100;

      const cotisA = Math.min(salaire, plafondAnnuel) * tauxA;
      const cotisB = Math.max(0, Math.min(salaire, 8 * plafondAnnuel) - plafondAnnuel) * tauxB;
      const pointsA = cotisA / valeurPoint;
      const pointsB = cotisB / valeurPoint;
      const totalPoints = pointsA + pointsB;

      newComputed[annee] = {
        tra: pointsA.toFixed(5) + " points",
        trb: pointsB.toFixed(5) + " points",
        total: totalPoints.toFixed(5) + " points",
      };
    });

    setSalaries(newSalaries);
    setComputed(newComputed);
  }, [user]);

  // Auto-prefill depuis l'import ManualCareerTable (event temps réel + sessionStorage au montage)
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
  }, [user?.id, handlePrefill]);

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

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const childrenCount = user?.profil?.children_number ?? user?.children_number ?? "";
      const birthDateVal = user?.profil?.date_naissance ?? user?.birth_date ?? "";
      const msg = `Analyse RIS pour Ircantec Simulator.\nNombre d'enfants : ${childrenCount}\nDate de naissance : ${birthDateVal}`;

      toast.info("Analyse du RIS en cours...");

      const payload = await fetchRISAnalysis(file, msg, user?.id);

      if (!payload || !payload.debug_carriere_detaillee_regex) {
        toast.warn("Le retour de l'analyse ne contient pas de données de carrière utilisables.");
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
  }, [user, handlePrefill]);

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
        .ircantec-simulator { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif; color:#4b4b4b; }
        .ircantec-simulator .sim-title { font-weight: 800; text-transform: uppercase; letter-spacing: .02em; margin: 6px 0 8px; font-size: 20px; color:#1f2d3d; }
        .ircantec-simulator .collapsible { border:1px solid #ddd; border-radius:16px; background:#fff; box-shadow:0 12px 30px rgba(15,23,42,0.08); }
        .ircantec-simulator .collapsible-header { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; border:0; background:transparent; border-radius:16px; font-size:18px; font-weight:700; color:#1f2d3d; }
        .ircantec-simulator table { width:auto; max-width:100%; border-collapse:collapse; font-size:13px; }
        .ircantec-simulator tbody tr:nth-child(even) { background-color:#f7f7fb; }
        .ircantec-simulator tbody tr:nth-child(odd) { background-color:#fff; }
        .ircantec-simulator td { border:1px solid #ddd; padding:8px; vertical-align:middle; text-align:center; white-space:nowrap; }
        .ircantec-simulator th { background-color:#7367f0; color:#fff; border:1px solid #ddd; padding:8px; text-align:center; white-space:nowrap; width:1%; }
        .ircantec-simulator input[type="text"],
        .ircantec-simulator input[type="number"],
        .ircantec-simulator input[type="date"] { width:100%; box-sizing:border-box; padding:6px 8px; border:1px solid #ddd; border-radius:6px; outline:none; display:block; background-color:#fff; color:#1f2d3d; }
        .ircantec-simulator .salary-input { width:110px; max-width:110px; }
        .ircantec-simulator button.action-btn { border-radius:8px; padding:6px 12px; border:1px solid #7367f0; color:#fff; background:#7367f0; cursor:pointer; }
        .ircantec-simulator .container-inner { padding:12px; }
      `}</style>
      <div className="ircantec-simulator">
        <div className="container-inner">
          <div className="collapsible">
            <div className="collapsible-header open">
              <span className="sim-title" style={{ margin: 0 }}>CALCUL NOMBRE DE POINTS &Agrave; PARTIR D&rsquo;UN SALAIRE</span>
            </div>
            <div style={{ padding: 16 }}>
                <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    className="action-btn"
                    style={{ background: isImporting ? "#6c757d" : "#28c76f", borderColor: isImporting ? "#6c757d" : "#28c76f" }}
                    onClick={handleImportOrPrefill}
                    disabled={isImporting}
                  >
                    {isImporting ? "Analyse..." : "Importer les donn\u00e9es"}
                  </button>
                  <button type="button" className="action-btn" onClick={handleReset}>R&eacute;initialiser</button>
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
                    {sortedYears.map(year => {
                      const isFranc = year <= 2001;
                      const display = ircantecTauxDisplay[year] || {};
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
                              onChange={e => {
                                const val = e.target.value;
                                setSalaries(prev => ({ ...prev, [year]: val }));
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
