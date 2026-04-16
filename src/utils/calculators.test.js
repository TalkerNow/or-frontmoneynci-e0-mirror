import { calculateCnav } from './calculators';

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
    // passFrancs = 19984.88018 * 6.556957 ≈ 131043, salary = 100000 FRF < passFrancs
    // revalo = (100000 * 1.704) / 6.556957, salSS = 100000 / 6.556957
    const result = calculateCnav(1990, 100000);
    expect(result).not.toBeNull();
    // 100 000 FRF ÷ 6.556957 ≈ 15 250.98 EUR (salSS)
    // (100 000 × 1.704) ÷ 6.556957 ≈ 25 987.66 EUR (revalo)
    expect(result.salSS).toBeCloseTo(15251, 0);
    expect(result.revalo).toBeCloseTo(25988, 0);
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
