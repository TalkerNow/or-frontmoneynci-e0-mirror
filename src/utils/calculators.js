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
  getBaremeRetraite,
} from '../views/apps/user/edit/simulatorData';

const FRF_PER_EUR = 6.55957;
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

// ─── DATES DE DÉPART À LA RETRAITE ──────────────────────────────────────────

function addMonths(date, n) {
  const totalMonths = date.getFullYear() * 12 + date.getMonth() + n;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return new Date(y, m, date.getDate());
}

function firstOfNextMonth(date) {
  if (date.getDate() === 1) return new Date(date.getFullYear(), date.getMonth(), 1);
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function formatDateFR(date) {
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function ageLabel(birth, target) {
  let totalMonths =
    (target.getFullYear() - birth.getFullYear()) * 12 +
    (target.getMonth() - birth.getMonth());
  // Si le jour du mois cible n'a pas encore atteint le jour de naissance,
  // le mois en cours n'est pas révolu.
  if (target.getDate() < birth.getDate()) totalMonths--;
  if (totalMonths < 0) totalMonths = 0;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m ? `${y} ans ${m}m` : `${y} ans`;
}

/**
 * Parse une date de naissance en objet Date.
 * Accepte "YYYY-MM-DD" ou "DD/MM/YYYY".
 *
 * @param {string|null} birthDate
 * @returns {Date|null}
 */
export function parseBirthDate(birthDate) {
  if (!birthDate) return null;
  if (birthDate.includes('-')) {
    const [y, m, d] = birthDate.split('-').map(Number);
    if (!y || !m || !d) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return new Date(y, m - 1, d);
  }
  if (birthDate.includes('/')) {
    const parts = birthDate.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);
      if (!y || !m || !d) return null;
      if (m < 1 || m > 12 || d < 1 || d > 31) return null;
      return new Date(y, m - 1, d);
    }
  }
  return null;
}

/**
 * Calcule la date légale de départ selon la réforme 2023.
 *
 * @param {string|null} birthDate  "YYYY-MM-DD" ou "DD/MM/YYYY"
 * @returns {{ date: Date, label: string, ageStr: string, dateStr: string } | null}
 */
export function computeDateLegale(birthDate) {
  const birth = parseBirthDate(birthDate);
  if (!birth) return null;
  const bareme = getBaremeRetraite(birth);
  const atAge = addMonths(birth, bareme.ageLegalMois);
  const departure = firstOfNextMonth(atAge);
  return {
    date: departure,
    label: formatDateFR(departure),
    ageStr: bareme.ageLegalLabel,
    dateStr: departure.toLocaleDateString('fr-FR'),
  };
}

/**
 * Calcule la date d'atteinte du taux plein (durée d'assurance requise).
 *
 * @param {string|null} birthDate
 * @param {number} trimAcquis  Total trimestres acquis (cotisés + assimilés)
 * @param {number|null} [anneeReference=null]  Année civile à laquelle le décompte
 *   `trimAcquis` est arrêté (ex: dernière année du RIS). Les trimestres se valident
 *   par année civile : la projection démarre au 1er janvier de l'année suivante.
 *   Si null, fallback sur la date du jour (comportement historique).
 * @returns {{ date: Date, label: string, trimManquants: number, trimRequis: number } | null}
 */
export function computeDateTauxPlein(birthDate, trimAcquis, anneeReference = null) {
  const birth = parseBirthDate(birthDate);
  if (!birth) return null;
  const { trimRequis } = getBaremeRetraite(birth);
  const trimManquants = Math.max(0, trimRequis - trimAcquis);
  // Projection : 4 trimestres par an = 1 trimestre par trimestre civil (3 mois).
  // Les trimestres acquis sont arrêtés au 31/12 de `anneeReference` ; on projette
  // donc à partir du 1er janvier de l'année suivante (et non de la date du jour,
  // qui décalait la date à tort — ex: 160 T au 31/12/2025, 8 manquants → 01/01/2028).
  const base = anneeReference
    ? new Date(anneeReference + 1, 0, 1)
    : new Date();
  const projected = addMonths(base, trimManquants * 3);
  const departure = firstOfNextMonth(projected);
  return { date: departure, label: formatDateFR(departure), trimManquants, trimRequis };
}

/**
 * Calcule la date de départ au taux plein automatique (67 ans).
 *
 * @param {string|null} birthDate
 * @returns {{ date: Date, label: string, dateStr: string } | null}
 */
export function computeDate67(birthDate) {
  const birth = parseBirthDate(birthDate);
  if (!birth) return null;
  const at67 = addMonths(birth, 67 * 12);
  const departure = firstOfNextMonth(at67);
  return {
    date: departure,
    label: formatDateFR(departure),
    dateStr: departure.toLocaleDateString('fr-FR'),
  };
}

/**
 * Calcule la date auto-générée pour un dispositif activé.
 * Retourne null si le dispositif ne génère pas de date calculable en JS.
 *
 * @param {string} dispositifId  ex: "racl", "retraite_progressive"
 * @param {string|null} birthDate
 * @param {Object<number, number>} trimCotState  { [année]: nb_trimestres_cotisés }
 * @param {Object<number, number>} trimAssState  { [année]: nb_trimestres_assimilés }
 * @returns {{ date: Date, dateStr: string, age: string, detail: string, color: string, source: string } | null}
 */
export function computeAutoDateFromDispositif(dispositifId, birthDate, trimCotState, trimAssState) {
  const birth = parseBirthDate(birthDate);
  if (!birth) return null;
  const birthYear = birth.getFullYear();

  if (dispositifId === 'racl') {
    const activeYears = Object.entries(trimCotState)
      .filter(([, t]) => Number(t) > 0)
      .map(([yr]) => Number(yr))
      .sort((a, b) => a - b);
    const firstWorkYear = activeYears[0];
    if (!firstWorkYear) return null;
    const ageDebut = firstWorkYear - birthYear;
    let departureMonths;
    let detail;
    if (ageDebut <= 16) {
      departureMonths = 58 * 12;
      detail = `Début activité à ${ageDebut} ans (${firstWorkYear}) — départ anticipé à 58 ans`;
    } else if (ageDebut <= 18) {
      departureMonths = 60 * 12;
      detail = `Début activité à ${ageDebut} ans (${firstWorkYear}) — départ anticipé à 60 ans`;
    } else if (ageDebut <= 20) {
      departureMonths = 62 * 12;
      detail = `Début activité à ${ageDebut} ans (${firstWorkYear}) — départ anticipé à 62 ans`;
    } else if (ageDebut <= 21) {
      departureMonths = 63 * 12;
      detail = `Début activité à ${ageDebut} ans (${firstWorkYear}) — départ anticipé à 63 ans`;
    } else {
      return null;
    }
    const atAge = addMonths(birth, departureMonths);
    const departure = firstOfNextMonth(atAge);
    return {
      date: departure,
      dateStr: departure.toLocaleDateString('fr-FR'),
      age: ageLabel(birth, departure),
      detail,
      color: '#00B894',
      source: 'RACL (Carrière longue)',
    };
  }

  if (dispositifId === 'retraite_progressive') {
    const bareme = getBaremeRetraite(birth);
    const rpMonths = bareme.ageLegalMois - 24; // éligible 2 ans avant l'âge légal
    const atAge = addMonths(birth, rpMonths);
    const departure = firstOfNextMonth(atAge);
    return {
      date: departure,
      dateStr: departure.toLocaleDateString('fr-FR'),
      age: ageLabel(birth, departure),
      detail: `Éligible dès ${bareme.ageLegalLabel} − 2 ans (si 150 trimestres atteints)`,
      color: '#0984E3',
      source: 'Retraite progressive',
    };
  }

  // Les autres dispositifs (chômage, arrêt activité, CER) nécessitent des données
  // non disponibles en JS pur → pas de date calculée ici
  return null;
}
