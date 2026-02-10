import React, { useState, useCallback, useMemo } from "react";
import { Collapse } from "reactstrap";
import classnames from "classnames";
import { arrcoPlafond, arrcoTaux, arrcoTauxDisplay } from "./simulatorData";

const YEARS_START = 1963;
const YEARS_END = 2025;

const chevronSvg = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export default function ArrcoSimulator({ onSave }) {
  const [isCadre, setIsCadre] = useState(false);
  const [pointsDate, setPointsDate] = useState("");
  const [pointsTotal, setPointsTotal] = useState("");
  const [points2024, setPoints2024] = useState("");
  const [salaries, setSalaries] = useState({});
  const [computed, setComputed] = useState({});
  const [risValues, setRisValues] = useState({});
  const [isPointsOpen, setIsPointsOpen] = useState(true);
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  const sortedYears = useMemo(() => {
    const years = [];
    for (let y = YEARS_START; y <= YEARS_END; y++) years.push(y);
    return years.sort((a, b) => b - a);
  }, []);

  const isSaveEnabled = useMemo(() => {
    return !!pointsDate && (!!pointsTotal.trim() || !!points2024.trim());
  }, [pointsDate, pointsTotal, points2024]);

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
      const totalPoints = (totalCotisations / valeurAchatArrco) + (cotisationTA / valeurT1);

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
      const totalPoints = pointsA + (pointsB * 0.347791548);

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

  const handleSalaryChange = useCallback((year, value, cadre) => {
    setSalaries(prev => ({ ...prev, [year]: value }));

    let annuelBrut = parseFloat(value);
    if (isNaN(annuelBrut)) {
      setComputed(prev => {
        const next = { ...prev };
        delete next[year];
        return next;
      });
      return;
    }
    if (year < 2002) annuelBrut = annuelBrut / 6.55957;

    const x = arrcoPlafond.findIndex(p => p[0] === year);
    if (x < 0) return;

    const result = cadre ? computeCadre(annuelBrut, year, x) : computeNonCadre(annuelBrut, year, x);
    setComputed(prev => ({ ...prev, [year]: result }));
  }, [computeNonCadre, computeCadre]);

  const handleStatusChange = useCallback((cadre) => {
    setIsCadre(cadre);
    setSalaries({});
    setComputed({});
    setRisValues({});
  }, []);

  const handleReset = useCallback(() => {
    setSalaries({});
    setComputed({});
  }, []);

  const handleSave = useCallback(() => {
    if (!onSave) return;
    onSave({
      year: 2024,
      pointDate: pointsDate || null,
      pointsTotal: parseFloat(pointsTotal || "0"),
      pointsYear: parseFloat(points2024 || "0"),
    });
  }, [onSave, pointsDate, pointsTotal, points2024]);

  return (
    <>
      <style>{`
        .arrco-simulator { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif; color:#4b4b4b; }
        .arrco-simulator .sim-title { font-weight: 800; text-transform: uppercase; letter-spacing: .02em; margin: 6px 0 8px; font-size: 20px; color:#1f2d3d; }
        .arrco-simulator .collapsible { border:1px solid #ddd; border-radius:16px; background:#fff; box-shadow:0 12px 30px rgba(15,23,42,0.08); }
        .arrco-simulator .collapsible-header { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; border:0; background:transparent; cursor:pointer; border-radius:16px; font-size:18px; font-weight:700; color:#1f2d3d; }
        .arrco-simulator .collapsible-header .chevron { transition: transform .25s ease; color:#6b7280; }
        .arrco-simulator .collapsible-header.open .chevron { transform: rotate(180deg); }
        .arrco-simulator .points-collapsible { margin: 0 0 16px; }
        .arrco-simulator .points-header-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; padding-right:16px; }
        .arrco-simulator .points-header-row .collapsible-header { flex:1 1 auto; width:auto; padding-right:0; }
        .arrco-simulator .points-save-btn { border-radius:999px; padding:6px 14px; border:1px solid #7367f0; background:#7367f0; color:#fff; font-weight:600; cursor:pointer; box-shadow:0 6px 18px rgba(115,103,240,0.25); display:inline-flex; align-items:center; gap:8px; }
        .arrco-simulator .points-save-btn:disabled { opacity:0.65; cursor:not-allowed; }
        .arrco-simulator .points-section { display:flex; flex-direction:column; gap:15px; margin-top:0.75rem; }
        .arrco-simulator .points-row { display:flex; align-items:center; justify-content:flex-start; margin-bottom:15px; gap:10px; flex-wrap:wrap; }
        .arrco-simulator .points-label { display:inline-block; min-width:220px; margin-right:10px; font-size:14px; font-weight:600; color:#1f2d3d; }
        .arrco-simulator .points-row input[type="date"],
        .arrco-simulator .points-row input[type="number"] { width:130px; padding:4px; font-size:14px; }
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
        .arrco-simulator .ris-input { width:110px; max-width:110px; }
        .arrco-simulator button.action-btn { border-radius:8px; padding:6px 12px; border:1px solid #7367f0; color:#fff; background:#7367f0; cursor:pointer; }
        .arrco-simulator .container-inner { padding:12px; }
        @media (max-width: 640px) {
          .arrco-simulator .points-row { flex-direction:column; align-items:flex-start; }
          .arrco-simulator .points-row input[type="date"],
          .arrco-simulator .points-row input[type="number"] { width:100%; }
          .arrco-simulator .points-label { min-width:0; }
        }
      `}</style>
      <div className="arrco-simulator">
        {/* Section 1: Points acquis */}
        <div className="collapsible points-collapsible">
          <div className="points-header-row">
            <button
              type="button"
              className={classnames("collapsible-header", { open: isPointsOpen })}
              onClick={() => setIsPointsOpen(prev => !prev)}
              aria-expanded={isPointsOpen}
            >
              <span className="sim-title" style={{ margin: 0 }}>POINTS RELEV&Eacute; DE CARRI&Egrave;RE ARRCO AGIRC</span>
              <span className="chevron" aria-hidden="true">{chevronSvg}</span>
            </button>
            <button
              type="button"
              className="points-save-btn"
              style={{ marginLeft: "auto" }}
              disabled={!isSaveEnabled}
              onClick={handleSave}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
              Enregistrer
            </button>
          </div>
          <Collapse isOpen={isPointsOpen}>
            <div style={{ padding: 16 }}>
              <div className="points-section">
                <div className="points-row">
                  <label className="points-label" htmlFor="arrco-points-date">Nombre de points acquis au</label>
                  <input
                    type="date"
                    id="arrco-points-date"
                    value={pointsDate}
                    onChange={e => setPointsDate(e.target.value)}
                  />
                  <input
                    type="number"
                    id="arrco-points-total"
                    placeholder="Points"
                    inputMode="decimal"
                    value={pointsTotal}
                    onChange={e => setPointsTotal(e.target.value)}
                  />
                </div>
                <div className="points-row">
                  <label className="points-label" htmlFor="arrco-points-2024">Points acquis ann&eacute;e 2024</label>
                  <input
                    type="number"
                    id="arrco-points-2024"
                    placeholder="Points"
                    inputMode="decimal"
                    value={points2024}
                    onChange={e => setPoints2024(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </Collapse>
        </div>

        {/* Section 2: Calcul nombre de points */}
        <div className="container-inner">
          <div className="collapsible">
            <button
              type="button"
              className={classnames("collapsible-header", { open: isCalcOpen })}
              onClick={() => setIsCalcOpen(prev => !prev)}
              aria-expanded={isCalcOpen}
            >
              <span className="sim-title" style={{ margin: 0 }}>CALCUL NOMBRE DE POINTS &Agrave; PARTIR D&rsquo;UN SALAIRE</span>
              <span className="chevron" aria-hidden="true">{chevronSvg}</span>
            </button>
            <Collapse isOpen={isCalcOpen}>
              <div style={{ padding: 16 }}>
                <div className="controls">
                  <b style={{ fontWeight: 600, fontSize: 14 }}>Veuillez s&eacute;lectionner votre statut :</b><br /><br />
                  <div className="divider">
                    <input
                      type="radio"
                      id="arrco-non-cadre"
                      name="arrco-cadreStatus"
                      checked={!isCadre}
                      onChange={() => handleStatusChange(false)}
                    />
                    <label htmlFor="arrco-non-cadre">Non-Cadre</label>
                  </div>
                  <div className="divider">
                    <input
                      type="radio"
                      id="arrco-cadre"
                      name="arrco-cadreStatus"
                      checked={isCadre}
                      onChange={() => handleStatusChange(true)}
                    />
                    <label htmlFor="arrco-cadre">Cadre</label>
                  </div>
                  <div className="divider">
                    <button type="button" className="action-btn" onClick={handleReset}>R&eacute;initialiser</button>
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
                      <th>Points import&eacute;s RIS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedYears.map(year => {
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
                              onChange={e => {
                                const val = e.target.value;
                                setSalaries(prev => ({ ...prev, [year]: val }));
                                // Recalculate inline
                                let annuelBrut = parseFloat(val);
                                if (isNaN(annuelBrut)) {
                                  setComputed(prev => {
                                    const next = { ...prev };
                                    delete next[year];
                                    return next;
                                  });
                                  return;
                                }
                                if (year < 2002) annuelBrut = annuelBrut / 6.55957;
                                const x = arrcoPlafond.findIndex(p => p[0] === year);
                                if (x < 0) return;
                                const result = isCadre
                                  ? computeCadre(annuelBrut, year, x)
                                  : computeNonCadre(annuelBrut, year, x);
                                setComputed(prev => ({ ...prev, [year]: result }));
                              }}
                            />
                          </td>
                          <td>{display.tauxA || ""}</td>
                          <td>{display.tauxB || ""}</td>
                          <td>{display.ref || ""}</td>
                          <td>{comp ? comp.trancheA : ""}</td>
                          <td>{comp ? comp.trancheB : ""}</td>
                          <td>{comp ? comp.total : ""}</td>
                          <td>
                            <input
                              type="number"
                              placeholder="Points"
                              inputMode="decimal"
                              className="ris-input"
                              value={risValues[year] || ""}
                              onChange={e => setRisValues(prev => ({ ...prev, [year]: e.target.value }))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Collapse>
          </div>
        </div>
      </div>
    </>
  );
}
