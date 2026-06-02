import { calculateCnav, computeSAMB, computeArrcoPts } from './calculators';

describe('calculateCnav', () => {
  test('returns null for salary = 0', () => {
    expect(calculateCnav(2010, 0)).toBeNull();
  });

  test('returns null for negative salary', () => {
    expect(calculateCnav(2010, -100)).toBeNull();
  });

  test('returns null for NaN salary', () => {
    expect(calculateCnav(2010, NaN)).toBeNull();
  });

  test('returns null for null salary', () => {
    expect(calculateCnav(2010, null)).toBeNull();
  });

  test('2010 salary below PASS: not capped, trimestres=3', () => {
    // PASS 2010 = 34620, coeff = 1.267, seuil = 34620/4 = 8655
    // 30000 / 8655 = 3.46 → trimestres = 3
    // revalo = 30000 * 1.267 = 38010
    const result = calculateCnav(2010, 30000);
    expect(result).not.toBeNull();
    expect(result.trimestres).toBe(3);
    expect(result.salSS).toBeCloseTo(30000, 0);
    expect(result.revalo).toBeCloseTo(38010, 0);
    expect(result.coeff).toBe(1.267);
  });

  test('2010 salary above PASS: capped to PASS, trimestres=4', () => {
    // PASS 2010 = 34620, 50000 / (34620/4) = 5.77 → clamped to 4
    // revalo = 34620 * 1.267 = 43863.54
    const result = calculateCnav(2010, 50000, false);
    expect(result).not.toBeNull();
    expect(result.trimestres).toBe(4);
    expect(result.salSS).toBeCloseTo(34620, 0);
    expect(result.revalo).toBeCloseTo(43863.54, 0);
  });

  test('year 2010, deplafonner=true → still capped (year>=2005 overrides)', () => {
    const capped = calculateCnav(2010, 50000, false);
    const deplaf = calculateCnav(2010, 50000, true);
    expect(deplaf.salSS).toBeCloseTo(capped.salSS, 0);
    expect(deplaf.revalo).toBeCloseTo(capped.revalo, 0);
  });

  test('year 2003, deplafonner=true → salary not capped', () => {
    // PASS 2003 = 29184, salary = 35000 > PASS, isCapped=false
    // revalo = 35000 * 1.395 = 48825, salSS = 35000
    const result = calculateCnav(2003, 35000, true);
    expect(result).not.toBeNull();
    expect(result.salSS).toBeCloseTo(35000, 0);
    expect(result.revalo).toBeCloseTo(48825, 0);
  });

  test('year 2003, deplafonner=false → salary capped to PASS', () => {
    // salairePlafonne = 29184, revalo = 29184 * 1.395 = 40711.68, salSS = 29184
    const result = calculateCnav(2003, 35000, false);
    expect(result).not.toBeNull();
    expect(result.salSS).toBeCloseTo(29184, 0);
    expect(result.revalo).toBeCloseTo(40711.68, 0);
  });

  test('year 1990 (FRF), returns salSS and revalo in EUR', () => {
    // PASS 1990 euro = 19984.88018, coeff = 1.704
    // Taux de conversion officiel irrévocable : 1 EUR = 6.55957 FRF
    // passFrancs = 19984.88018 * 6.55957 ≈ 131089, salary = 100000 FRF < passFrancs
    // revalo = (100000 * 1.704) / 6.55957, salSS = 100000 / 6.55957
    const result = calculateCnav(1990, 100000);
    expect(result).not.toBeNull();
    // 100 000 FRF ÷ 6.55957 ≈ 15 244.95 EUR (salSS)
    // (100 000 × 1.704) ÷ 6.55957 ≈ 25 977.40 EUR (revalo)
    expect(result.salSS).toBeCloseTo(15245, 0);
    expect(result.revalo).toBeCloseTo(25977, 0);
  });

  test('trimestres never exceeds 4', () => {
    const result = calculateCnav(2010, 1000000);
    expect(result.trimestres).toBe(4);
  });

  test('trimestres = 0 for salary below quarterly threshold', () => {
    // seuil = 34620/4 = 8655. salary = 1000 → floor(1000/8655) = 0
    const result = calculateCnav(2010, 1000);
    expect(result.trimestres).toBe(0);
  });

  test('accepts French-formatted string input (spaces + comma decimal)', () => {
    // "30 000,50" is a realistic paste from a French spreadsheet
    const result = calculateCnav(2010, '30 000,50');
    expect(result).not.toBeNull();
    expect(result.trimestres).toBe(3);
    expect(result.salSS).toBeCloseTo(30000.50, 0);
  });

  test('returns null for year with no PASS data (e.g. 1950)', () => {
    // plafondSS has no entry for 1950 — function must return null, not crash
    expect(calculateCnav(1950, 50000)).toBeNull();
  });
});

describe('computeSAMB', () => {
  test('returns 0 for empty rows', () => {
    expect(computeSAMB([])).toBe(0);
  });

  test('returns 0 if all salaries are 0', () => {
    const rows = [{ yr: 2020, sal: 0 }, { yr: 2019, sal: 0 }];
    expect(computeSAMB(rows)).toBe(0);
  });

  test('caps salary at PASS before revaluation', () => {
    // PASS 2024 = 46368, coeffRevalo 2024 = 1.031
    // salary 100000 → capped to 46368 → revalorisé = 46368 * 1.031 ≈ 47805
    const rows = [{ yr: 2024, sal: 100000 }];
    expect(computeSAMB(rows)).toBeCloseTo(47805, -2);
  });

  test('picks top 25 years', () => {
    // 30 rows: years 2026 to 1997, salary 10000 each + one year with 50000
    const rows = Array.from({ length: 30 }, (_, i) => ({
      yr: 2026 - i,
      sal: i === 29 ? 50000 : 10000,
    }));
    // year 1997 has sal 50000 but no PASS data (plafondSS starts at 1963)
    // so that row is filtered out — top 25 are all sal=10000
    const result = computeSAMB(rows);
    expect(result).toBeGreaterThan(9000);
    expect(result).toBeLessThan(15000);
  });

  test('ignores years with no PASS data', () => {
    const rows = [
      { yr: 2024, sal: 30000 },
      { yr: 1950, sal: 99999 }, // no PASS → ignored
    ];
    // Only 2024 counts: min(30000, 46368) * 1.031 / 1 = 30930
    expect(computeSAMB(rows)).toBeCloseTo(30930, -2);
  });
});

describe('computeArrcoPts', () => {
  test('returns 0 for empty rows', () => {
    const result = computeArrcoPts([]);
    expect(result.total).toBe(0);
    expect(result.projectionAnnuelle).toBe(0);
  });

  test('sums agircPts across all rows', () => {
    const rows = [
      { yr: 2026, agircPts: 100 },
      { yr: 2025, agircPts: 200 },
      { yr: 2024, agircPts: 150 },
    ];
    expect(computeArrcoPts(rows).total).toBeCloseTo(450, 0);
  });

  test('projection uses average of up to 3 most recent rows with points > 0', () => {
    const rows = [
      { yr: 2026, agircPts: 0 },    // skipped (no points)
      { yr: 2025, agircPts: 300 },
      { yr: 2024, agircPts: 200 },
      { yr: 2023, agircPts: 100 },
      { yr: 2022, agircPts: 400 },  // 4th, not included
    ];
    // top 3 with points: 2025=300, 2024=200, 2023=100 → avg = 200
    expect(computeArrcoPts(rows).projectionAnnuelle).toBe(200);
  });
});

import {
  parseBirthDate,
  computeDateLegale,
  computeDateTauxPlein,
  computeDate67,
  computeAutoDateFromDispositif,
} from './calculators';

describe('parseBirthDate', () => {
  test('parses YYYY-MM-DD format', () => {
    const d = parseBirthDate('1966-07-08');
    expect(d.getFullYear()).toBe(1966);
    expect(d.getMonth()).toBe(6); // 0-indexed
    expect(d.getDate()).toBe(8);
  });

  test('parses DD/MM/YYYY format', () => {
    const d = parseBirthDate('08/07/1966');
    expect(d.getFullYear()).toBe(1966);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(8);
  });

  test('returns null for null input', () => {
    expect(parseBirthDate(null)).toBeNull();
  });
});

describe('computeDateLegale', () => {
  test('returns null for missing birthDate', () => {
    expect(computeDateLegale(null)).toBeNull();
  });

  test('born 1966 → legal age 63 ans 3 mois (Circulaire Cnav 2026-07)', () => {
    // 1966-07-08 + 63 ans 3 mois = 2029-10-08 → 1er du mois suivant = 2029-11-01
    const result = computeDateLegale('1966-07-08');
    expect(result).not.toBeNull();
    expect(result.date.getFullYear()).toBe(2029);
    expect(result.date.getMonth()).toBe(10); // novembre = index 10
    expect(result.date.getDate()).toBe(1);
    expect(result.ageStr).toBe('63 ans et 3 mois');
  });

  test('born 1968 → legal age 63 ans 9 mois (Circulaire Cnav 2026-07)', () => {
    // 1968-03-15 + 63 ans 9 mois = 2031-12-15 → 1er du mois suivant = 2032-01-01
    const result = computeDateLegale('1968-03-15');
    expect(result.date.getFullYear()).toBe(2032);
    expect(result.date.getMonth()).toBe(0); // janvier
    expect(result.date.getDate()).toBe(1);
    expect(result.ageStr).toBe('63 ans et 9 mois');
  });

  test('born 01/01/1965 → legal age 62 ans 9 mois, no day shift', () => {
    // 1965-01-01 (tranche jan-mars 1965) + 62 ans 9 mois = 2027-10-01 → already 1st, no shift
    const result = computeDateLegale('1965-01-01');
    expect(result.date.getFullYear()).toBe(2027);
    expect(result.date.getMonth()).toBe(9); // octobre
    expect(result.date.getDate()).toBe(1);
    expect(result.ageStr).toBe('62 ans et 9 mois');
  });

  test('born 1964 → legal age 62 ans 9 mois (suspension de la réforme 2023)', () => {
    // 1964-03-10 + 62 ans 9 mois = 2026-12-10 → 1er du mois suivant = 2027-01-01
    const result = computeDateLegale('1964-03-10');
    expect(result.date.getFullYear()).toBe(2027);
    expect(result.date.getMonth()).toBe(0); // janvier
    expect(result.date.getDate()).toBe(1);
    expect(result.ageStr).toBe('62 ans et 9 mois');
  });
});

describe('computeDateTauxPlein', () => {
  test('returns null for missing birthDate', () => {
    expect(computeDateTauxPlein(null, 0)).toBeNull();
  });

  test('0 trimestres manquants → trimManquants = 0', () => {
    // born 1960, trimRequis = 167, trimAcquis = 200 → no quarters missing
    const result = computeDateTauxPlein('1960-01-01', 200);
    expect(result.trimManquants).toBe(0);
    expect(result.date).toBeDefined();
  });

  test('correct trimRequis for birth year 1966', () => {
    // Circulaire Cnav 2026-07 : 1966 → 172 trim
    const result = computeDateTauxPlein('1966-07-08', 100);
    expect(result.trimRequis).toBe(172);
    expect(result.trimManquants).toBe(72);
  });

  test('projette depuis le 31/12 de l\'année de référence, pas la date du jour (cas Crozier)', () => {
    // 172 - 164 = 8 trimestres manquants, décompte arrêté au 31/12/2025.
    // Les trimestres se valident par année civile → 2 années pleines (2026, 2027)
    // → taux plein le 01/01/2028 (et non +24 mois depuis "aujourd'hui").
    const result = computeDateTauxPlein('1966-07-08', 164, 2025);
    expect(result.trimManquants).toBe(8);
    expect(result.date.getFullYear()).toBe(2028);
    expect(result.date.getMonth()).toBe(0); // janvier
    expect(result.date.getDate()).toBe(1);
  });

  test('sans anneeReference → fallback date du jour (comportement historique préservé)', () => {
    const result = computeDateTauxPlein('1966-07-08', 164); // 8 manquants
    expect(result.trimManquants).toBe(8);
    expect(result.date).toBeDefined();
  });
});

describe('computeDate67', () => {
  test('returns null for missing birthDate', () => {
    expect(computeDate67(null)).toBeNull();
  });

  test('1966-07-08 + 67 ans = 2033-07-08 → 2033-08-01', () => {
    const result = computeDate67('1966-07-08');
    expect(result.date.getFullYear()).toBe(2033);
    expect(result.date.getMonth()).toBe(7); // août = index 7
    expect(result.date.getDate()).toBe(1);
  });
});

describe('computeAutoDateFromDispositif', () => {
  test('returns null for unknown dispositif', () => {
    expect(computeAutoDateFromDispositif('unknown', '1966-07-08', {}, {})).toBeNull();
  });

  test('racl: returns null if no first work year found', () => {
    expect(computeAutoDateFromDispositif('racl', '1966-07-08', {}, {})).toBeNull();
  });

  test('racl: career started at age 17 → depart at 60 ans', () => {
    // birthDate 1966, first work year 1983 → age début = 17 → depart à 60 ans
    // 1966-07-08 + 60 ans = 2026-07-08 → 2026-08-01
    const trimCot = { 1983: 4, 1984: 4 };
    const result = computeAutoDateFromDispositif('racl', '1966-07-08', trimCot, {});
    expect(result).not.toBeNull();
    expect(result.date.getFullYear()).toBe(2026);
    expect(result.date.getMonth()).toBe(7); // août
  });

  test('retraite_progressive: 2 years before legal age', () => {
    // Circulaire Cnav 2026-07 : 1966 → age légal 63 ans 3 mois → progressive = 61 ans 3 mois
    // 1966-07-08 + 61*12+3 mois = 2027-10-08 → 2027-11-01
    const result = computeAutoDateFromDispositif('retraite_progressive', '1966-07-08', {}, {});
    expect(result).not.toBeNull();
    expect(result.date.getFullYear()).toBe(2027);
    expect(result.date.getMonth()).toBe(10); // novembre = index 10
  });
});
