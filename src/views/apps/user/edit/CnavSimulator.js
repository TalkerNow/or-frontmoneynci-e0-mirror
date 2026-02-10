import React, { useState, useCallback, useMemo } from "react";
import { Collapse } from "reactstrap";
import classnames from "classnames";
import { coeffRevalo, plafondSS, getRetirementAge, getTrimTauxPlein } from "./simulatorData";

const YEARS_START = 1963;
const YEARS_END = 2024;

const chevronSvg = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export default function CnavSimulator() {
  const [isOpen, setIsOpen] = useState(true);
  const [birthDate, setBirthDate] = useState("");
  const [showBirthInfo, setShowBirthInfo] = useState(false);
  const [birthInfo, setBirthInfo] = useState(null);

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

  // Enfant
  const [enfantTrimestres, setEnfantTrimestres] = useState(0);
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

  const enfantMax = enfantHandicap ? 16 : 8;
  const enfantDisplay = Math.min(Math.max(0, enfantTrimestres), enfantMax);

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

    const retirementAge = getRetirementAge(year);
    const trimTauxPlein = getTrimTauxPlein(year);

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
    let salaireAnnuel = parseFloat(String(val).replace(/\s/g, "").replace(",", "."));
    if (isNaN(salaireAnnuel) || salaireAnnuel <= 0) {
      setComputed(prev => {
        const next = { ...prev };
        delete next[year];
        return next;
      });
      setTrimestresParSalaire(0);
      return;
    }

    const coeff = coeffRevalo[year] || 1;
    const passEuro = plafondSS[year] || 0;

    let salaireRevaloriser = year <= 2001
      ? (salaireAnnuel * coeff) / 6.556957
      : salaireAnnuel * coeff;

    const isCapped = !isDeplafonner || year >= 2005;
    if (isCapped) salaireRevaloriser = Math.min(salaireRevaloriser, passEuro);

    const seuilTrimestre = passEuro / 4 || 0;
    const trimestre = Math.min(4, Math.max(0, Math.floor(salaireAnnuel / (seuilTrimestre || Infinity))));
    setTrimestresParSalaire(trimestre);

    setComputed(prev => ({
      ...prev,
      [year]: {
        revalorise: salaireRevaloriser,
        revaloriseStr: salaireRevaloriser.toFixed(2) + (isDeplafonner ? " \u20AC" : ""),
        trimestres: trimestre,
      },
    }));
  }, []);

  const handleAjouterTrimestres = useCallback((type) => {
    const val = assimilatedInputs[type] || 0;
    if (isNaN(val) || val <= 0) return;
    setTotalTrimestresAssimiles(prev => prev + val);
    setAssimilatedInputs(prev => ({ ...prev, [type]: 0 }));
  }, [assimilatedInputs]);

  const handleAjouterTrimestresSalaire = useCallback(() => {
    if (trimestresParSalaire <= 0) return;
    setTotalTrimestresAssimiles(prev => prev + trimestresParSalaire);
  }, [trimestresParSalaire]);

  const handleSimulationFinale = useCallback(() => {
    let salRev = [];
    let totalTrimestre = 0;
    for (const year in computed) {
      const c = computed[year];
      if (c && c.revalorise > 0) salRev.push(c.revalorise);
      if (c) totalTrimestre += c.trimestres || 0;
    }
    salRev.sort((a, b) => a - b);
    const best = salRev.slice(-25);

    const bestDisplay = [];
    for (let j = 0; j < 25; j++) {
      const val = best[best.length - 1 - j] || 0;
      bestDisplay.push({
        year: currentYear - j,
        value: val,
        display: val ? val.toFixed(2) + " \u20AC" : "0",
      });
    }

    const total = best.reduce((s, v) => s + v, 0);
    const moyenne = best.length ? total / best.length : 0;

    setBestYears(bestDisplay);
    setTotalBestYears(total);
    setMoyenneAnnuelle(moyenne);
  }, [computed, currentYear]);

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
  }, []);

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
      <style>{`
        .cnav-simulator { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif; color:#4b4b4b; }
        .cnav-simulator .collapsible { border:1px solid #ddd; border-radius:16px; background:#fff; box-shadow:0 12px 30px rgba(15,23,42,0.08); }
        .cnav-simulator .collapsible-header { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; border:0; background:transparent; cursor:pointer; border-radius:16px; font-size:18px; font-weight:700; color:#1f2d3d; }
        .cnav-simulator .collapsible-header .chevron { transition: transform .25s ease; color:#6b7280; }
        .cnav-simulator .collapsible-header.open .chevron { transform: rotate(180deg); }
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
          <button
            type="button"
            className={classnames("collapsible-header", { open: isOpen })}
            onClick={() => setIsOpen(prev => !prev)}
            aria-expanded={isOpen}
          >
            <span className="sim-title" style={{ margin: 0 }}>SIMULATEUR PENSION S&Eacute;CURIT&Eacute; SOCIALE CNAV</span>
            <span className="chevron" aria-hidden="true">{chevronSvg}</span>
          </button>

          <Collapse isOpen={isOpen}>
            <div style={{ padding: 16 }}>
              {/* Date de naissance */}
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem", margin: "8px 0" }}>
                <label htmlFor="cnav_birth_date">Quelle est votre date de naissance ? </label>
                <input
                  type="date"
                  id="cnav_birth_date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                />
                <button type="button" className="action-btn" onClick={handleAfficher}>OK</button>
                <button type="button" className="action-btn" onClick={handleReset}>R&eacute;initialiser</button>
              </div>

              {/* Titres */}
              <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", margin: "6px 0 10px", gap: 12, flexWrap: "wrap" }}>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#343a40" }}>Simulateur de trimestres cotis&eacute;s</h4>
              </div>

              {/* Infos naissance */}
              {showBirthInfo && birthInfo && (
                <div style={{ marginBottom: 10 }}>
                  <p>
                    Vous &ecirc;tes n&eacute; le <span style={{ color: "#7367f0" }}>{birthInfo.formattedDate}</span>. Vous pouvez partir en retraite d&egrave;s <span style={{ color: "#7367f0" }}>{birthInfo.retirementAge}</span>
                    {" "}et avec <span style={{ color: "#7367f0" }}>{birthInfo.trimTauxPlein}</span> trimestres pour obtenir le taux plein*,
                  </p>
                  {birthInfo.isRetired ? (
                    <p>Vous &ecirc;tes en retraite</p>
                  ) : (
                    <p>
                      Il vous reste <span style={{ color: "#7367f0" }}>{birthInfo.anneeRestant}</span> ann&eacute;e(s) et <span style={{ color: "#7367f0" }}>{birthInfo.moisRestant}</span> mois avant votre retraite.
                      Soit <span style={{ color: "#7367f0" }}>{birthInfo.totalMois}</span> mois avant votre retraite.
                    </p>
                  )}
                  <p className="note">
                    * Nombre d&rsquo;ann&eacute;es restant &agrave; travailler avant la retraite :<br />
                    <span style={{ color: "#808080" }}>
                      Cette r&eacute;ponse est bas&eacute;e sur l&rsquo;&acirc;ge l&eacute;gal de retraite. Vous pourriez devoir travailler moins si vous &ecirc;tes &eacute;ligible carri&egrave;re longue (d&eacute;part anticip&eacute;), ou travailler plus pour obtenir votre taux plein si vous &ecirc;tes rentr&eacute; sur le march&eacute; du travail tardivement (&eacute;tudes sup&eacute;rieures etc,)
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
                      {sortedYears.map(year => {
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
                                title={isFranc ? "Saisir le montant en francs (FRF)" : "Saisir le montant en euros (\u20AC)"}
                                value={sal.sr || ""}
                                onChange={e => {
                                  const val = e.target.value;
                                  setSalaries(prev => ({
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
                                title={isFranc ? "Saisir le montant en francs (FRF)" : "Saisir le montant en euros (\u20AC)"}
                                value={sal.ss || ""}
                                onChange={e => {
                                  const val = e.target.value;
                                  setSalaries(prev => ({
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
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={isDeplaf}
                                  onChange={e => {
                                    const checked = e.target.checked;
                                    setDeplafonner(prev => ({ ...prev, [year]: checked }));
                                    const currentSr = (salaries[year] || {}).sr || "";
                                    if (currentSr) handleSimulateur(currentSr, year, checked);
                                  }}
                                />
                              </label>
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
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: "#343a40", marginBottom: 8 }}>Simulateur de trimestres assimil&eacute;s</h4>
                    <table className="simulateur-table">
                      <colgroup>
                        <col style={{ width: "55%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "25%" }} />
                      </colgroup>
                      <thead>
                        <tr><th>Type</th><th>Nombre</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {[
                          { key: "serviceNational", label: "Service national" },
                          { key: "chomageIndemnise", label: "Ch\u00F4mage indemnis\u00E9" },
                          { key: "chomageNonIndemnise", label: "Ch\u00F4mage non indemnis\u00E9" },
                          { key: "maladieAccident", label: "Maladie et AT" },
                        ].map(item => (
                          <tr key={item.key}>
                            <td>{item.label}</td>
                            <td>
                              <input
                                type="number"
                                value={assimilatedInputs[item.key]}
                                min="0"
                                onChange={e => {
                                  const v = parseInt(e.target.value, 10) || 0;
                                  setAssimilatedInputs(prev => ({ ...prev, [item.key]: v }));
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
                          <td><span>{trimestresParSalaire}</span></td>
                          <td>
                            <button type="button" className="action-btn" onClick={handleAjouterTrimestresSalaire}>
                              Ajouter
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>Invalidit&eacute;s</td>
                          <td><span>0</span></td>
                          <td>
                            <button type="button" className="action-btn" onClick={() => {}}>
                              Ajouter
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p>Total des trimestres assimil&eacute;s: <span>{totalTrimestresAssimiles}</span></p>
                  </div>

                  {/* Trimestres enfant */}
                  <table className="child-table">
                    <thead>
                      <tr>
                        <th>Trimestres enfant</th>
                        <th>Nombre de trimestres</th>
                        <th>Handicap</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Enfant(s)</td>
                        <td>
                          <input
                            type="number"
                            value={enfantTrimestres}
                            min="0"
                            max={enfantMax}
                            step="1"
                            onChange={e => {
                              let v = parseInt(e.target.value, 10);
                              if (isNaN(v) || v < 0) v = 0;
                              if (v > enfantMax) v = enfantMax;
                              setEnfantTrimestres(v);
                            }}
                          />
                        </td>
                        <td>
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={enfantHandicap}
                              onChange={e => {
                                const checked = e.target.checked;
                                setEnfantHandicap(checked);
                                const newMax = checked ? 16 : 8;
                                if (enfantTrimestres > newMax) setEnfantTrimestres(newMax);
                              }}
                            />
                            {" "}En situation de handicap
                          </label>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p>Trimestres enfant pris en compte: <span>{enfantDisplay}</span></p>

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
                    <thead><tr><th>Total des meilleures ann&eacute;es revaloris&eacute;es</th></tr></thead>
                    <tbody><tr><td>{totalBestYears.toFixed(2)} &euro;</td></tr></tbody>
                  </table>
                  <table>
                    <thead><tr><th>MOYENNE ANNUELLE</th></tr></thead>
                    <tbody><tr><td>{moyenneAnnuelle.toFixed(2)} &euro;</td></tr></tbody>
                  </table>

                  <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                    <button type="button" className="action-btn" onClick={handleSimulationFinale}>Simuler</button>
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
          </Collapse>
        </div>
      </div>
    </>
  );
}
