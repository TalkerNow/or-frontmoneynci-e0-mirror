import React, { useState, useCallback, useMemo } from "react";
import { Collapse } from "reactstrap";
import classnames from "classnames";
import { ircantecPlafonds, ircantecValeursPoint, ircantecTauxDisplay } from "./simulatorData";

const YEARS_START = 1963;
const YEARS_END = 2024;

const chevronSvg = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export default function IrcantecSimulator({ onSave }) {
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

  const handleSimulateur = useCallback((salaireBrut, year) => {
    const salaire = parseFloat(String(salaireBrut).replace(/\s/g, "").replace(",", "."));
    if (!ircantecPlafonds[year] || !ircantecValeursPoint[year] || isNaN(salaire)) {
      setComputed(prev => {
        const next = { ...prev };
        delete next[year];
        return next;
      });
      return;
    }

    const plafondAnnuel = ircantecPlafonds[year];
    const valeurPoint = ircantecValeursPoint[year];

    const TRA = Math.min(salaire, plafondAnnuel) * 0.07;
    const trancheB = Math.max(0, salaire - plafondAnnuel);
    const TRB = Math.min(trancheB, 375936 - plafondAnnuel) * 0.195;
    const TOTAL = TRA + TRB;
    const points = TOTAL / valeurPoint;

    setComputed(prev => ({
      ...prev,
      [year]: {
        tra: TRA.toFixed(5) + " points",
        trb: TRB.toFixed(5) + " points",
        total: points.toFixed(5) + " points",
      },
    }));
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
        .ircantec-simulator { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif; color:#4b4b4b; }
        .ircantec-simulator .sim-title { font-weight: 800; text-transform: uppercase; letter-spacing: .02em; margin: 6px 0 8px; font-size: 20px; color:#1f2d3d; }
        .ircantec-simulator .collapsible { border:1px solid #ddd; border-radius:16px; background:#fff; box-shadow:0 12px 30px rgba(15,23,42,0.08); }
        .ircantec-simulator .collapsible-header { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; border:0; background:transparent; cursor:pointer; border-radius:16px; font-size:18px; font-weight:700; color:#1f2d3d; }
        .ircantec-simulator .collapsible-header .chevron { transition: transform .25s ease; color:#6b7280; }
        .ircantec-simulator .collapsible-header.open .chevron { transform: rotate(180deg); }
        .ircantec-simulator .points-collapsible { margin: 0 0 16px; }
        .ircantec-simulator .points-header-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; padding-right:16px; }
        .ircantec-simulator .points-header-row .collapsible-header { flex:1 1 auto; width:auto; padding-right:0; }
        .ircantec-simulator .points-save-btn { border-radius:999px; padding:6px 14px; border:1px solid #7367f0; background:#7367f0; color:#fff; font-weight:600; cursor:pointer; box-shadow:0 6px 18px rgba(115,103,240,0.25); display:inline-flex; align-items:center; gap:8px; }
        .ircantec-simulator .points-save-btn:disabled { opacity:0.65; cursor:not-allowed; }
        .ircantec-simulator .points-section { display:flex; flex-direction:column; gap:15px; margin-top:0.75rem; }
        .ircantec-simulator .points-row { display:flex; align-items:center; justify-content:flex-start; margin-bottom:15px; gap:10px; flex-wrap:wrap; }
        .ircantec-simulator .points-label { display:inline-block; min-width:220px; margin-right:10px; font-size:14px; font-weight:600; color:#1f2d3d; }
        .ircantec-simulator .points-row input[type="date"],
        .ircantec-simulator .points-row input[type="number"] { width:130px; padding:4px; font-size:14px; }
        .ircantec-simulator table { width:auto; max-width:100%; border-collapse:collapse; font-size:13px; }
        .ircantec-simulator tbody tr:nth-child(even) { background-color:#f7f7fb; }
        .ircantec-simulator tbody tr:nth-child(odd) { background-color:#fff; }
        .ircantec-simulator td { border:1px solid #ddd; padding:8px; vertical-align:middle; text-align:center; white-space:nowrap; }
        .ircantec-simulator th { background-color:#7367f0; color:#fff; border:1px solid #ddd; padding:8px; text-align:center; white-space:nowrap; width:1%; }
        .ircantec-simulator input[type="text"],
        .ircantec-simulator input[type="number"],
        .ircantec-simulator input[type="date"] { width:100%; box-sizing:border-box; padding:6px 8px; border:1px solid #ddd; border-radius:6px; outline:none; display:block; background-color:#fff; color:#1f2d3d; }
        .ircantec-simulator .salary-input { width:110px; max-width:110px; }
        .ircantec-simulator .ris-input { width:110px; max-width:110px; }
        .ircantec-simulator button.action-btn { border-radius:8px; padding:6px 12px; border:1px solid #7367f0; color:#fff; background:#7367f0; cursor:pointer; }
        .ircantec-simulator .container-inner { padding:12px; }
        @media (max-width: 640px) {
          .ircantec-simulator .points-row { flex-direction:column; align-items:flex-start; }
          .ircantec-simulator .points-row input[type="date"],
          .ircantec-simulator .points-row input[type="number"] { width:100%; }
          .ircantec-simulator .points-label { min-width:0; }
        }
      `}</style>
      <div className="ircantec-simulator">
        {/* Section 1: Points acquis */}
        <div className="collapsible points-collapsible">
          <div className="points-header-row">
            <button
              type="button"
              className={classnames("collapsible-header", { open: isPointsOpen })}
              onClick={() => setIsPointsOpen(prev => !prev)}
              aria-expanded={isPointsOpen}
            >
              <span className="sim-title" style={{ margin: 0 }}>POINTS RELEV&Eacute; DE CARRI&Egrave;RE IRCANTEC</span>
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
                  <label className="points-label" htmlFor="ircantec-date">Nombre de points acquis au</label>
                  <input
                    type="date"
                    id="ircantec-date"
                    value={pointsDate}
                    onChange={e => setPointsDate(e.target.value)}
                  />
                  <input
                    type="number"
                    id="ircantec-total"
                    placeholder="Points"
                    inputMode="decimal"
                    value={pointsTotal}
                    onChange={e => setPointsTotal(e.target.value)}
                  />
                </div>
                <div className="points-row">
                  <label className="points-label" htmlFor="ircantec-2024">Points acquis ann&eacute;e 2024</label>
                  <input
                    type="number"
                    id="ircantec-2024"
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
                <div style={{ marginBottom: 8 }}>
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
                      <th>Points import&eacute;s RIS</th>
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
