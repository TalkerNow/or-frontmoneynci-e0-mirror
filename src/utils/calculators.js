import { coeffRevalo, plafondSS } from '../views/apps/user/edit/simulatorData';

const FRF_PER_EUR = 6.556957;

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
