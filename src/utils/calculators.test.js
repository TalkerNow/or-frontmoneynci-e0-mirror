import { calculateCnav, calculateArrco, calculateIrcantec, calculateRci, computeSAMB, computeSamCnav, computeArrcoPts, departureTrimOutlook } from './calculators';

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

  test('2010 salary below PASS: not capped, trimestres=4', () => {
    // PASS 2010 = 34620, coeff = 1.267. Seuil trimestre = 200 × SMIC horaire (8,86 €)
    // = 1772 € (règle légale). 30000 / 1772 = 16.9 → plafonné à 4 trimestres.
    // revalo = 30000 * 1.267 = 38010
    const result = calculateCnav(2010, 30000);
    expect(result).not.toBeNull();
    expect(result.trimestres).toBe(4);
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
    // seuil 2010 = 200 × SMIC horaire (8,86 €) = 1772 €. salary 1000 → floor(1000/1772) = 0
    const result = calculateCnav(2010, 1000);
    expect(result.trimestres).toBe(0);
  });

  test('accepts French-formatted string input (spaces + comma decimal)', () => {
    // "30 000,50" is a realistic paste from a French spreadsheet.
    // seuil 2010 = 1772 € → floor(30000.5/1772) = 16, plafonné à 4 (salaire ≫ seuil).
    const result = calculateCnav(2010, '30 000,50');
    expect(result).not.toBeNull();
    expect(result.trimestres).toBe(4);
    expect(result.salSS).toBeCloseTo(30000.50, 0);
  });

  test('low salary validates quarters via 150×SMIC, not the old PASS/4 bug', () => {
    // Régression : sous PASS/4 (47100/4 = 11775 €) un salaire 2025 de 8 000 € donnait
    // 0 trimestre (sous-comptage). Règle légale = 150 × SMIC (11,88 €) = 1 782 € →
    // floor(8000/1782) = 4 ; 3 000 € → floor(3000/1782) = 1 (0 sous l'ancien seuil).
    expect(calculateCnav(2025, 8000).trimestres).toBe(4);
    expect(calculateCnav(2025, 3000).trimestres).toBe(1);
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

  test('converts pre-2002 FRF salary to EUR before capping at PASS', () => {
    // row.sal est en FRANCS avant 2002. 60000 FRF ≈ 9147 € (÷6.55957) < PASS 1995
    // (23782 €), × coeffRevalo 1995 (1.577) ≈ 14424 €. Sans conversion, 60000 traité
    // comme des euros serait écrêté à 23782 → ×1.577 ≈ 37505 € (le bug FRF/EUR).
    expect(computeSAMB([{ yr: 1995, sal: 60000 }])).toBeCloseTo(14424, -1);
  });
});

describe('calculateArrco/Ircantec/Rci — projection au-delà de 2026', () => {
  test('year >2026 uses the latest known parameters instead of returning null', () => {
    // Régression : éditer le salaire d'une année projetée mettait les points à 0
    // (fonctions renvoyaient null hors table). Elles gèlent désormais les paramètres
    // de la dernière année connue (2026).
    expect(calculateArrco(2030, 50000)).not.toBeNull();
    expect(calculateIrcantec(2030, 50000)).not.toBeNull();
    expect(calculateRci(2030, 50000)).not.toBeNull();
    expect(calculateArrco(2030, 50000).total).toBeCloseTo(calculateArrco(2026, 50000).total, 5);
    expect(calculateRci(2030, 50000).total).toBeCloseTo(calculateRci(2026, 50000).total, 5);
  });

  test('year before the table still returns null (no fabricated past data)', () => {
    // arrcoPlafond commence en 1936 ; une année antérieure reste rejetée.
    expect(calculateArrco(1900, 50000)).toBeNull();
  });
});

describe('computeSamCnav', () => {
  // Source unique du SAM affiché ET gelé (frozen_data.totaux.sam) — le moteur
  // consomme ce chiffre tel quel. Toute régression ici fausse la pension CNAV.
  const rows = (years) => years.map((yr) => ({ yr }));

  test('returns 0 for empty or missing inputs', () => {
    expect(computeSamCnav([])).toBe(0);
    expect(computeSamCnav(null)).toBe(0);
  });

  test('averages revalued salaries of CNAV-affiliated years only', () => {
    // 2023 : affilié (trim cotisés) ; 2022 : affilié (assimilés) ; 2021 : revalo
    // présent mais AUCUN trimestre CNAV (année régime complémentaire seul) → exclue.
    const sam = computeSamCnav(
      rows([2023, 2022, 2021]),
      { 2023: 4 },
      { 2022: 2 },
      { 2023: 40000, 2022: 30000, 2021: 99999 }
    );
    expect(sam).toBe(35000); // (40000 + 30000) / 2
  });

  test('excludes affiliated years with no revalued salary', () => {
    const sam = computeSamCnav(rows([2023, 2022]), { 2023: 4, 2022: 4 }, {}, { 2023: 40000, 2022: 0 });
    expect(sam).toBe(40000); // 2022 à 0 € : hors moyenne, pas de dilution
  });

  test('keeps only the top 25 revalued years', () => {
    const years = Array.from({ length: 30 }, (_, i) => 2026 - i);
    const trimCot = Object.fromEntries(years.map((y) => [y, 4]));
    const revalo = Object.fromEntries(years.map((y, i) => [y, i < 25 ? 40000 : 10000]));
    expect(computeSamCnav(rows(years), trimCot, {}, revalo)).toBe(40000);
  });

  test('rounds the average', () => {
    const sam = computeSamCnav(rows([2023, 2022, 2021]), { 2023: 1, 2022: 1, 2021: 1 }, {}, { 2023: 100, 2022: 100, 2021: 101 });
    expect(sam).toBe(100); // 301/3 = 100,33 → 100
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
  computeTrimAtDate,
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

describe('computeTrimAtDate', () => {
  test('returns null for missing targetDate', () => {
    expect(computeTrimAtDate(150, 2025, null)).toBeNull();
  });

  test('date antérieure à la base de projection → décompte acquis inchangé', () => {
    // base = 01/01/2026, cible 01/01/2025 < base → pas de projection
    expect(computeTrimAtDate(150, 2025, new Date(2025, 0, 1))).toBe(150);
  });

  test('projette 1 trimestre par trimestre civil (4/an)', () => {
    // base 01/01/2026 → 01/01/2028 = 24 mois = 8 trimestres
    expect(computeTrimAtDate(160, 2025, new Date(2028, 0, 1))).toBe(168);
  });

  test('cohérence avec computeDateTauxPlein : trim. à la date de taux plein = trimRequis', () => {
    const tp = computeDateTauxPlein('1966-07-08', 164, 2025); // trimRequis 172, date 01/01/2028
    expect(computeTrimAtDate(164, 2025, tp.date)).toBe(tp.trimRequis);
  });

  test('date passée + carrière → cumul réel des années révolues (pas le total actuel)', () => {
    // Carrière 2018-2021 = 4 ans pleins = 16 trim ; total acquis = 148 à 2024.
    // Date cible 01/02/2023 → on ne compte que les années < 2023 (2018-2021) = 16,
    // surtout PAS le total actuel 148.
    const trimParAnnee = { 2018: 4, 2019: 4, 2020: 4, 2021: 4, 2024: 4 };
    expect(computeTrimAtDate(148, 2024, new Date(2023, 1, 1), trimParAnnee)).toBe(16);
  });

  test('date future ignore la carrière et projette depuis anneeReference', () => {
    const trimParAnnee = { 2024: 4 };
    // base 01/01/2025 → 01/01/2027 = 24 mois = 8 trim → 160 + 8 = 168
    expect(computeTrimAtDate(160, 2024, new Date(2027, 0, 1), trimParAnnee)).toBe(168);
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

import { sumTrimestresCapped } from './calculators';

describe("sumTrimestresCapped — durée d'assurance plafonnée à 4 trim/an", () => {
  test('returns 0 for empty / nullish input', () => {
    expect(sumTrimestresCapped([])).toBe(0);
    expect(sumTrimestresCapped(null)).toBe(0);
    expect(sumTrimestresCapped(undefined)).toBe(0);
  });

  test('single régime, years already ≤ 4 → unchanged (cap is a no-op)', () => {
    expect(sumTrimestresCapped([
      { trimestres_cotises: 4 },
      { trimestres_cotises: 4 },
      { trimestres_cotises: 4 },
    ])).toBe(12);
  });

  test('partial years are preserved, not rounded up', () => {
    expect(sumTrimestresCapped([
      { trimestres_cotises: 1 },
      { trimestres_cotises: 1 },
      { trimestres_cotises: 4 },
    ])).toBe(6);
  });

  test('cotisés + assimilés the same year are capped at 4 (the over-count fix)', () => {
    // 4 cotisés + 2 assimilés la même année = 4 retenus (écrêtement RIS), PAS 6
    expect(sumTrimestresCapped([
      { trimestres_cotises: 4, trimestres_assimiles: 2 },
    ])).toBe(4);
  });

  test('cotisés + assimilés under 4 are summed normally', () => {
    expect(sumTrimestresCapped([
      { trimestres_cotises: 2, trimestres_assimiles: 1 },
    ])).toBe(3);
  });

  test('rachetés (AR) excluded by default, included with { includeRachetes: true }', () => {
    expect(sumTrimestresCapped([{ trimestres_cotises: 2, trimestres_ar: 2 }])).toBe(2);
    expect(sumTrimestresCapped([{ trimestres_cotises: 2, trimestres_ar: 2 }], { includeRachetes: true })).toBe(4);
    // le plafond s'applique aussi quand les rachetés poussent l'année au-dessus de 4
    expect(sumTrimestresCapped([{ trimestres_cotises: 3, trimestres_ar: 3 }], { includeRachetes: true })).toBe(4);
  });

  test('negative / non-numeric components are floored at 0 per year', () => {
    expect(sumTrimestresCapped([
      { trimestres_cotises: -4, trimestres_assimiles: 2 },  // -4+2 = -2 → 0
      { trimestres_cotises: 'x', trimestres_assimiles: 3 }, // NaN→0, +3 = 3
    ])).toBe(3);
  });

  // ── Intégration : client réel 1708 (Christian Vincent), RIS au 01/01/2026 ──
  // Récapitulatif officiel du RIS = 158 trimestres (170 requis, 12 manquants).
  // 41 années cotisées 1983–2025 (gaps en 2020 et 2023) ; seules 1983 et 1984
  // partielles (1 trim) ; toutes les autres à 4. → 39×4 + 2 = 158.
  const build1708 = (transform = (y, e) => e) => {
    const c = [];
    for (let y = 1983; y <= 2025; y++) {
      if (y === 2020 || y === 2023) continue; // années sans report sur le RIS
      const base = { trimestres_cotises: (y === 1983 || y === 1984) ? 1 : 4 };
      c.push(transform(y, base));
    }
    return c;
  };

  test('client 1708 truth: 41 années (1983=1, 1984=1, reste=4) → 158', () => {
    const carriere = build1708();
    expect(carriere.length).toBe(41);
    expect(sumTrimestresCapped(carriere)).toBe(158);
  });

  test('client 1708 over-count: assimilés empilés + années mixtes salarié/indépendant → toujours 158 (le plafond tient)', () => {
    // Reproduit le sur-comptage du simulateur (166) : service militaire 1986
    // empilé (4 cot + 4 ass) et années indépendant 2010-2012 où salarié+indépendant
    // valident chacun 4 (naïf = 8). La somme naïve dépasse 158 ; plafonnée = 158.
    const carriere = build1708((y, e) => {
      if (y === 1986) return { trimestres_cotises: 4, trimestres_assimiles: 4 };
      if (y >= 2010 && y <= 2012) return { trimestres_cotises: 8 };
      return e;
    });
    const naive = carriere.reduce(
      (s, e) => s + (Number(e.trimestres_cotises) || 0) + (Number(e.trimestres_assimiles) || 0),
      0
    );
    expect(naive).toBeGreaterThan(158);        // le bug : la somme naïve sur-compte
    expect(sumTrimestresCapped(carriere)).toBe(158); // le correctif : plafonné = total RIS officiel
  });
});

describe('departureTrimOutlook', () => {
  // birth 1965-06-15 → barème trimRequis = 171 (génération 1965, avril-déc)
  const BIRTH = '1965-06-15';
  const base = { birthDate: BIRTH, trimAcquis: 140, anneeRef: 2024, trimParAnnee: null };

  test('décote before 67 when projected trimestres stay below required', () => {
    const o = departureTrimOutlook({ ...base, departureDate: new Date(2028, 0, 1) });
    // 140 + projection 4/yr from 2025 (3 yrs → 12) = 152 < 171
    expect(o.trim).toBe(152);
    expect(o.trimRequis).toBe(171);
    expect(o.manquants).toBe(19);
    expect(o.tauxPlein).toBe(false);
    expect(o.automatique).toBe(false);
  });

  test('full rate by duration when projected trimestres reach the requirement', () => {
    const o = departureTrimOutlook({ birthDate: BIRTH, trimAcquis: 168, anneeRef: 2024, trimParAnnee: null, departureDate: new Date(2026, 0, 1) });
    expect(o.trim).toBe(172);          // 168 + 4
    expect(o.tauxPlein).toBe(true);
    expect(o.automatique).toBe(false); // reached by duration, not by age
  });

  test('automatic full rate at 67 even when trimestres are short', () => {
    const o = departureTrimOutlook({ ...base, trimAcquis: 100, departureDate: new Date(2032, 6, 1) }); // age 67
    expect(o.tauxPlein).toBe(true);
    expect(o.automatique).toBe(true);  // granted by age, not duration
    expect(o.trim).toBeLessThan(o.trimRequis);
  });

  test('null for invalid inputs', () => {
    expect(departureTrimOutlook({ ...base, departureDate: null })).toBeNull();
    expect(departureTrimOutlook({ ...base, birthDate: null, departureDate: new Date(2028, 0, 1) })).toBeNull();
  });
});
