import {
  coeffRevalo,
  plafondSS,
  arrcoPlafond,
  arrcoTaux,
  ircantecPlafonds,
  ircantecValeursPoint,
  ircantecTauxDisplay,
  rciPrixAchat,
  rciTauxDisplay,
} from '../views/apps/user/edit/simulatorData';

const FRF_PER_EUR = 6.556957;
const FRF_PER_EUR_ARRCO = 6.55957;

/**
 * Calcule les métriques CNAV pour une année et un salaire donnés.
 * Réplique exacte de CnavSimulator.handleSimulateur + handleSimulationFinale.
 *
 * @param {number} year - Année (ex: 1985, 2010)
 * @param {number|string} grossSalary - Salaire brut en devise d'origine :
 *   FRF pour année <= 2001, EUR pour année > 2001
 * @param {boolean} [isDeplafonner=false] - Déplafonner le salaire au-dessus du PASS
 * @returns {{ salSS: number, coeff: number, revalo: number, trimestres: number } | null}
 *   salSS and revalo are always in EUR (converted from FRF for years <= 2001).
 *   Returns null if the salary is invalid or the year has no PASS reference.
 */
export function calculateCnav(year, grossSalary, isDeplafonner = false) {
  const salaireAnnuel =
    typeof grossSalary === 'string'
      ? parseFloat(String(grossSalary).replace(/\s/g, '').replace(',', '.'))
      : Number(grossSalary);

  if (isNaN(salaireAnnuel) || salaireAnnuel <= 0) return null;

  const coeff = coeffRevalo[year] || 1;
  const passEuro = plafondSS[year] || 0;
  // Intentional: return null for years outside the plafondSS table (e.g. before 1963).
  // The original CnavSimulator would proceed with passEuro=0 and produce wrong results.
  if (!passEuro) return null;

  const isCapped = !isDeplafonner || year >= 2005;

  let salairePlafonne = salaireAnnuel;
  if (isCapped) {
    if (year <= 2001) {
      const passFrancs = passEuro * FRF_PER_EUR;
      salairePlafonne = Math.min(salaireAnnuel, passFrancs);
    } else {
      salairePlafonne = Math.min(salaireAnnuel, passEuro);
    }
  }

  const revalo =
    year <= 2001
      ? (salairePlafonne * coeff) / FRF_PER_EUR
      : salairePlafonne * coeff;

  const salSS =
    year <= 2001 ? salairePlafonne / FRF_PER_EUR : salairePlafonne;

  const seuilTrimestre =
    year <= 2001 ? (passEuro * FRF_PER_EUR) / 4 : passEuro / 4;

  const trimestres = Math.min(
    4,
    Math.max(0, Math.floor(salaireAnnuel / (seuilTrimestre || Infinity)))
  );

  return { salSS, coeff, revalo, trimestres };
}

/**
 * Calcule les points ARRCO/AGIRC-ARRCO pour une année et un salaire donnés.
 * Réplique exacte de ArrcoSimulator.computeNonCadre / computeCadre.
 *
 * @param {number} year
 * @param {number|string} grossSalary - FRF pour année <= 2001, EUR pour année > 2001
 * @param {boolean} [isCadre=false]
 * @returns {{ total: number } | null}
 */
export function calculateArrco(year, grossSalary, isCadre = false) {
  const salaireRaw =
    typeof grossSalary === 'string'
      ? parseFloat(String(grossSalary).replace(/\s/g, '').replace(',', '.'))
      : Number(grossSalary);

  if (isNaN(salaireRaw) || salaireRaw <= 0) return null;

  let annuelBrut = salaireRaw;
  if (year <= 2001) annuelBrut = annuelBrut / FRF_PER_EUR_ARRCO;

  const x = arrcoPlafond.findIndex((p) => p[0] === year);
  if (x < 0) return null;

  const plafondAnnuel = arrcoPlafond[x][2];
  let totalPoints;

  let t1 = 0; // Points Tranche A (bruts)
  let t2 = 0; // Points Tranche B (bruts, avant pondération pour pre-2019 non-cadre)

  if (year >= 2019) {
    // Post-2019 : fusion AGIRC-ARRCO, même formule cadre et non-cadre
    const tauxTA = arrcoTaux[x][1];
    const tauxTB = arrcoTaux[x][3];
    const valeurAchatPoint = arrcoTaux[x][8];

    const cotisationTA = Math.min(annuelBrut, plafondAnnuel) * tauxTA;
    t1 = cotisationTA / valeurAchatPoint;
    if (annuelBrut > plafondAnnuel) {
      const cotisationTB = (annuelBrut - plafondAnnuel) * tauxTB;
      t2 = cotisationTB / valeurAchatPoint;
    }
    totalPoints = t1 + t2;
  } else if (isCadre) {
    // Cadre avant 2019 (AGIRC séparé)
    const tauxArrco = arrcoTaux[x][1];
    const tauxAgirc = arrcoTaux[x][3];
    const valeurPtArrco = arrcoTaux[x][6];
    const valeurPtAgirc = arrcoTaux[x][8];

    const cotisA = Math.min(annuelBrut, plafondAnnuel) * tauxArrco;
    t1 = cotisA / valeurPtArrco;
    if (annuelBrut > plafondAnnuel) {
      const cotisB = (annuelBrut - plafondAnnuel) * tauxAgirc;
      t2 = cotisB / valeurPtAgirc;
    }
    totalPoints = t1 + t2 * 0.347791548;
  } else {
    // Non-cadre avant 2019
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
    t1 = cotisationTA / valeurT1;
    t2 = cotisationTB / valeurAchatArrco; // brut avant pondération
    const totalCotisations = cotisationTB * 0.347791548;
    totalPoints = totalCotisations / valeurAchatArrco + t1;
  }

  return { t1, t2, total: totalPoints };
}

/**
 * Calcule les points IRCANTEC pour une année et un salaire donnés.
 * Réplique exacte de IrcantecSimulator.handleSimulateur.
 *
 * @param {number} year
 * @param {number|string} grossSalary - FRF pour année <= 2001 (même devise que ircantecPlafonds), EUR sinon
 * @returns {{ total: number } | null}
 */
export function calculateIrcantec(year, grossSalary) {
  const salaire =
    typeof grossSalary === 'string'
      ? parseFloat(String(grossSalary).replace(/\s/g, '').replace(',', '.'))
      : Number(grossSalary);

  if (isNaN(salaire) || salaire <= 0) return null;

  if (!ircantecPlafonds[year] || !ircantecValeursPoint[year] || !ircantecTauxDisplay[year]) {
    return null;
  }

  const display = ircantecTauxDisplay[year];
  const plafondAnnuel = ircantecPlafonds[year];
  const valeurPoint = ircantecValeursPoint[year];
  const tauxA =
    parseFloat((display.tauxA || '').replace(',', '.').replace('%', '')) / 100;
  const tauxB =
    parseFloat((display.tauxB || '').replace(',', '.').replace('%', '')) / 100;

  const cotisA = Math.min(salaire, plafondAnnuel) * tauxA;
  const cotisB = Math.max(0, Math.min(salaire, 8 * plafondAnnuel) - plafondAnnuel) * tauxB;
  const pointsA = cotisA / valeurPoint;
  const pointsB = cotisB / valeurPoint;

  return { total: pointsA + pointsB };
}

/**
 * Calcule les points RCI pour une année et un revenu donnés.
 * Réplique exacte de RciSimulator.handleSimulateur.
 *
 * @param {number} year
 * @param {number|string} grossSalary - FRF pour année <= 2001, EUR pour année > 2001
 * @returns {{ total: number } | null}
 */
export function calculateRci(year, grossSalary) {
  let salaire =
    typeof grossSalary === 'string'
      ? parseFloat(String(grossSalary).replace(/\s/g, '').replace(',', '.'))
      : Number(grossSalary);

  if (isNaN(salaire) || salaire <= 0) return null;

  if (!plafondSS[year] || !rciPrixAchat[year] || !rciTauxDisplay[year]) return null;

  // Conversion FRF → EUR pour les années avant 2002
  if (year < 2002) salaire = salaire / FRF_PER_EUR_ARRCO;

  const display = rciTauxDisplay[year];
  const pass = plafondSS[year];
  const prixAchat = rciPrixAchat[year];
  const tauxA =
    parseFloat((display.tauxA || '').replace(',', '.').replace('%', '')) / 100;
  const tauxB =
    parseFloat((display.tauxB || '').replace(',', '.').replace('%', '')) / 100;

  // Tranche 1 : 0 à 1 PASS
  const cotisA = Math.min(Math.max(salaire, 0), pass) * tauxA;
  // Tranche 2 : 1 PASS à 4 PASS (max 3×PASS au-dessus du plafond)
  const cotisB = Math.min(Math.max(salaire - pass, 0), 3 * pass) * tauxB;
  const pointsA = cotisA / prixAchat;
  const pointsB = cotisB / prixAchat;

  return { total: pointsA + pointsB };
}

/**
 * Calcule le Salaire Annuel Moyen de Base (SAMB) — 25 meilleures années.
 * Salaire plafonné au PASS de l'année avant revalorisation.
 *
 * @param {Array<{yr: number, sal: number}>} carriereRows
 * @returns {number} SAMB en EUR (arrondi)
 */
export function computeSAMB(carriereRows) {
  const revalued = carriereRows
    .filter(row => (Number(row.sal) || 0) > 0 && plafondSS[row.yr])
    .map(row => {
      const sal = Math.min(Number(row.sal), plafondSS[row.yr]);
      return sal * (coeffRevalo[row.yr] || 1);
    })
    .sort((a, b) => b - a)
    .slice(0, 25);

  if (revalued.length === 0) return 0;
  return Math.round(revalued.reduce((s, v) => s + v, 0) / revalued.length);
}

/**
 * Calcule les points AGIRC-ARRCO totaux et la projection annuelle.
 *
 * @param {Array<{yr: number, agircPts: number}>} carriereRows
 * @returns {{ total: number, projectionAnnuelle: number }}
 */
export function computeArrcoPts(carriereRows) {
  const total = carriereRows.reduce((s, r) => s + (Number(r.agircPts) || 0), 0);
  // carriereRows est trié du plus récent au plus ancien (2026 → 1961)
  const withPts = carriereRows.filter(r => (Number(r.agircPts) || 0) > 0).slice(0, 3);
  const projectionAnnuelle = withPts.length > 0
    ? Math.round(withPts.reduce((s, r) => s + Number(r.agircPts), 0) / withPts.length)
    : 0;
  return { total: Math.round(total * 10) / 10, projectionAnnuelle };
}
