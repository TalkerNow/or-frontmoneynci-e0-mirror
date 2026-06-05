import {
  toNumber,
  parseBirthYear,
  computeTargetYear,
  findLastRealYear,
  findLastRealSalary,
  computeProjectedYears,
  isProjectedYear,
  projectYearValue,
  buildProjectedRow,
  reconcileProjection,
} from "./careerProjection";

const PASS = 48060;

// Minimal career rows helper (descending, like _buildDefaultCarriereRows)
function rows(years) {
  return years.map((y) => ({ yr: y.yr, sal: y.sal ?? 0, ss: 0, coeff: "1.000", revalo: 0, trim: 0, ar: 0, total: 0, agircPts: 0, ircPts: 0, rciPts: 0, regimes: {} }));
}

describe("toNumber", () => {
  test("passes through finite numbers", () => { expect(toNumber(5)).toBe(5); });
  test("parses numeric strings", () => { expect(toNumber("12.5")).toBe(12.5); });
  test("zero for null/garbage/NaN", () => { expect(toNumber(null)).toBe(0); expect(toNumber("abc")).toBe(0); expect(toNumber(NaN)).toBe(0); expect(toNumber(undefined)).toBe(0); });
});

describe("parseBirthYear", () => {
  test("parses ISO date to UTC year", () => { expect(parseBirthYear("1965-03-10")).toBe(1965); });
  test("null for empty/garbage", () => { expect(parseBirthYear("")).toBeNull(); expect(parseBirthYear("nope")).toBeNull(); expect(parseBirthYear(null)).toBeNull(); });
});

describe("computeTargetYear", () => {
  test("birthYear + age", () => { expect(computeTargetYear(1965, 67)).toBe(2032); });
  test("null when birthYear null", () => { expect(computeTargetYear(null, 67)).toBeNull(); });
  test("null when age is not finite", () => { expect(computeTargetYear(1965, undefined)).toBeNull(); });
});

describe("findLastRealYear / findLastRealSalary", () => {
  const r = rows([{ yr: 2026 }, { yr: 2025 }, { yr: 2024, sal: 41000 }, { yr: 2023, sal: 39000 }, { yr: 2022 }]);
  test("last year with sal>0", () => { expect(findLastRealYear(r)).toBe(2024); });
  test("salary at that year", () => { expect(findLastRealSalary(r, 2024)).toBe(41000); });
  test("null when no salary anywhere", () => { expect(findLastRealYear(rows([{ yr: 2026 }, { yr: 2025 }]))).toBeNull(); });
  test("excludes projected rows", () => {
    const r2 = [
      { yr: 2027, sal: 48060, projected: true },
      { yr: 2026, sal: 48060, projected: true },
      { yr: 2024, sal: 41000 },
    ];
    expect(findLastRealYear(r2)).toBe(2024);
  });
});

describe("computeProjectedYears", () => {
  test("normal: lastReal+1 .. target+surcote", () => { expect(computeProjectedYears(2024, 2032, 0)).toEqual([2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032]); });
  test("surcote extends the top", () => { expect(computeProjectedYears(2024, 2032, 2)).toEqual([2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034]); });
  test("client past target, no surcote → empty", () => { expect(computeProjectedYears(2030, 2028, 0)).toEqual([]); });
  test("client past target, surcote adds beyond last real year", () => { expect(computeProjectedYears(2030, 2028, 3)).toEqual([2031, 2032, 2033]); });
  test("null target → empty", () => { expect(computeProjectedYears(2024, null, 0)).toEqual([]); });
  test("null lastReal → empty", () => { expect(computeProjectedYears(null, 2032, 0)).toEqual([]); });
});

describe("isProjectedYear", () => {
  test("inside the active window", () => { expect(isProjectedYear(2030, 2024, 2032, true)).toBe(true); });
  test("the last real year itself is not projected", () => { expect(isProjectedYear(2024, 2024, 2032, true)).toBe(false); });
  test("inactive → false", () => { expect(isProjectedYear(2030, 2024, 2032, false)).toBe(false); });
});

describe("projectYearValue", () => {
  test("caps salary at PASS, coeff 1, 4 trimestres", () => { expect(projectYearValue(50000, PASS)).toEqual({ sal: PASS, revalo: PASS, trimestres: 4 }); });
  test("below PASS unchanged", () => { expect(projectYearValue(30000, PASS)).toEqual({ sal: 30000, revalo: 30000, trimestres: 4 }); });
});

describe("buildProjectedRow", () => {
  test("future-year row shape with projected flag", () => {
    expect(buildProjectedRow(2030, { sal: PASS, revalo: PASS, trimestres: 4 })).toEqual({ yr: 2030, sal: PASS, ss: PASS, coeff: "1.000", revalo: PASS, trim: 0, ar: 0, total: 0, agircPts: 0, ircPts: 0, rciPts: 0, regimes: {}, projected: true });
  });
});

describe("reconcileProjection", () => {
  const base = rows([{ yr: 2026 }, { yr: 2025 }, { yr: 2024, sal: 41000 }, { yr: 2023, sal: 39000 }, { yr: 2022 }]);
  const baseState = () => ({ carriereRows: base.map((r) => ({ ...r })), revaloValues: {}, trimCotState: {} });

  test("generates projected rows, sorted descending, flagged, with revalo+trim maps", () => {
    const out = reconcileProjection(baseState(), { lastRealYear: 2024, targetYear: 2027, surcote: 0, lastRealSalary: 41000, passLast: PASS });
    expect(out.projectedYears).toEqual([2025, 2026, 2027]);
    // descending order, 2027 (new >2026 row) on top
    expect(out.carriereRows[0].yr).toBe(2027);
    expect(out.carriereRows.find((r) => r.yr === 2027)).toMatchObject({ sal: 41000, revalo: 41000, projected: true });
    expect(out.carriereRows.find((r) => r.yr === 2025)).toMatchObject({ sal: 41000, projected: true });
    expect(out.revaloValues[2027]).toBe(41000);
    expect(out.trimCotState[2026]).toBe(4);
  });

  test("≤2026 projected years fill existing rows in place (no array growth for them)", () => {
    const out = reconcileProjection(baseState(), { lastRealYear: 2024, targetYear: 2026, surcote: 0, lastRealSalary: 41000, passLast: PASS });
    expect(out.projectedYears).toEqual([2025, 2026]);
    expect(out.carriereRows.length).toBe(base.length); // 2025/2026 already existed
  });

  test("preserves manual edits to a kept projected year when surcote grows", () => {
    let out = reconcileProjection(baseState(), { lastRealYear: 2024, targetYear: 2027, surcote: 0, lastRealSalary: 41000, passLast: PASS });
    // consultant edits 2026 down to 20000
    out.carriereRows = out.carriereRows.map((r) => (r.yr === 2026 ? { ...r, sal: 20000 } : r));
    out.revaloValues = { ...out.revaloValues, 2026: 20000 };
    const out2 = reconcileProjection(out, { lastRealYear: 2024, targetYear: 2027, surcote: 1, lastRealSalary: 41000, passLast: PASS });
    expect(out2.projectedYears).toEqual([2025, 2026, 2027, 2028]);
    expect(out2.carriereRows.find((r) => r.yr === 2026).sal).toBe(20000); // edit preserved
    expect(out2.carriereRows.find((r) => r.yr === 2028)).toMatchObject({ sal: 41000, projected: true }); // new top added
  });

  test("removing years at the top drops >2026 rows and clears their maps", () => {
    const out = reconcileProjection(baseState(), { lastRealYear: 2024, targetYear: 2028, surcote: 0, lastRealSalary: 41000, passLast: PASS });
    const out2 = reconcileProjection(out, { lastRealYear: 2024, targetYear: 2026, surcote: 0, lastRealSalary: 41000, passLast: PASS });
    expect(out2.carriereRows.find((r) => r.yr === 2027)).toBeUndefined();
    expect(out2.revaloValues[2027]).toBeUndefined();
    expect(out2.projectedYears).toEqual([2025, 2026]);
  });

  test("deactivation (null target) removes all projected rows and restores ≤2026 rows", () => {
    const out = reconcileProjection(baseState(), { lastRealYear: 2024, targetYear: 2027, surcote: 0, lastRealSalary: 41000, passLast: PASS });
    const out2 = reconcileProjection(out, { lastRealYear: 2024, targetYear: null, surcote: 0, lastRealSalary: 41000, passLast: PASS });
    expect(out2.projectedYears).toEqual([]);
    expect(out2.carriereRows.some((r) => r.projected)).toBe(false);
    expect(out2.carriereRows.find((r) => r.yr === 2025)).toMatchObject({ sal: 0, projected: false });
    expect(out2.carriereRows.find((r) => r.yr === 2027)).toBeUndefined();
  });

  test("does not mutate the input state", () => {
    const state = baseState();
    const before = JSON.stringify(state);
    reconcileProjection(state, { lastRealYear: 2024, targetYear: 2028, surcote: 0, lastRealSalary: 41000, passLast: PASS });
    expect(JSON.stringify(state)).toBe(before);
  });
});
