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
  resolveProjectionTargetYear,
  PROJECTION_MODES,
  computeRealAssuranceTotals,
} from "./careerProjection";
import { computeDateTauxPlein } from "../../../../../utils/calculators";

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
  test("carries the last salary forward verbatim (no PASS cap), coeff 1, 4 trimestres", () => { expect(projectYearValue(50000, PASS)).toEqual({ sal: 50000, revalo: 50000, trimestres: 4 }); });
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

describe("resolveProjectionTargetYear", () => {
  const departureDates = {
    legale:    { date: new Date(2027, 3, 1), ageStr: "63 ans 9 m", label: "avril 2027" },   // April 2027
    tauxPlein: { date: new Date(2029, 0, 1), ageStr: "65 ans", label: "janvier 2029", trimRequis: 172, trimManquants: 4 }, // Jan 2029
    date67:    { date: new Date(2032, 8, 1), label: "septembre 2032" },                       // Sept 2032
  };

  test("libre: birthYear + age", () => {
    expect(resolveProjectionTargetYear({ mode: PROJECTION_MODES.LIBRE, birthYear: 1965, age: 63 })).toBe(2028);
  });
  test("libre: months within the year don't bump the target year", () => {
    // born January (birthMonth 0) + 6 months → still same calendar year
    expect(resolveProjectionTargetYear({ mode: PROJECTION_MODES.LIBRE, birthYear: 1964, age: 67, months: 6, birthMonth: 0 })).toBe(2031);
  });
  test("libre: months crossing December roll into the next year", () => {
    // born October (birthMonth 9) + 4 months → February of the next year
    expect(resolveProjectionTargetYear({ mode: PROJECTION_MODES.LIBRE, birthYear: 1964, age: 67, months: 4, birthMonth: 9 })).toBe(2032);
  });
  test("legal: year of the barème legal date", () => {
    expect(resolveProjectionTargetYear({ mode: PROJECTION_MODES.LEGAL, departureDates })).toBe(2027);
  });
  test("duree: year of the full-rate-by-duration date (fallback when no anneeRef)", () => {
    expect(resolveProjectionTargetYear({ mode: PROJECTION_MODES.DUREE, departureDates })).toBe(2029);
  });
  test("duree: projects exactly enough whole years to reach requis — no overshoot", () => {
    // 20 missing → 5 whole years from anneeRef (2030), NOT the liquidation date's year (2031) → 170, not 174
    expect(resolveProjectionTargetYear({ mode: PROJECTION_MODES.DUREE, departureDates: { anneeRef: 2025, tauxPlein: { date: new Date(2031, 1, 1), trimManquants: 20, trimRequis: 170 } } })).toBe(2030);
  });
  test("duree: rounds partial missing quarters up to a whole year", () => {
    // 18 missing → ceil(18/4)=5 years → 2030
    expect(resolveProjectionTargetYear({ mode: PROJECTION_MODES.DUREE, departureDates: { anneeRef: 2025, tauxPlein: { date: new Date(2031, 1, 1), trimManquants: 18, trimRequis: 170 } } })).toBe(2030);
  });
  test("auto67: year of the 67yo date", () => {
    expect(resolveProjectionTargetYear({ mode: PROJECTION_MODES.AUTO67, departureDates })).toBe(2032);
  });
  test("anchor with no departureDates → null", () => {
    expect(resolveProjectionTargetYear({ mode: PROJECTION_MODES.LEGAL, departureDates: null })).toBeNull();
  });
  test("anchor whose date object is null → null", () => {
    expect(resolveProjectionTargetYear({ mode: PROJECTION_MODES.DUREE, departureDates: { tauxPlein: null } })).toBeNull();
  });
  test("libre with null birthYear → null", () => {
    expect(resolveProjectionTargetYear({ mode: PROJECTION_MODES.LIBRE, birthYear: null, age: 64 })).toBeNull();
  });
  test("unknown mode → null", () => {
    expect(resolveProjectionTargetYear({ mode: "bogus", departureDates })).toBeNull();
  });
});

describe("computeRealAssuranceTotals", () => {
  test("excludes projected years from trimAcquis / anneeRef / trimParAnnee", () => {
    // 2025 & 2026 are PROJECTED (the projection wrote 4 trim into them) → must not count.
    const trimCotState = { 2023: 4, 2024: 4, 2025: 4, 2026: 4 };
    const trimAssState = {};
    const carriereRows = [
      { yr: 2026, projected: true }, { yr: 2025, projected: true },
      { yr: 2024 }, { yr: 2023 },
    ];
    const t = computeRealAssuranceTotals(trimCotState, trimAssState, carriereRows);
    expect(t.trimAcquis).toBe(8);          // 2023 + 2024 only
    expect(t.anneeRef).toBe(2024);         // last REAL year, not 2026
    expect(t.trimParAnnee).toEqual({ 2023: 4, 2024: 4 });
  });

  test("with no projected rows, counts every year capped at 4/yr", () => {
    const t = computeRealAssuranceTotals({ 2023: 3, 2024: 6 }, { 2024: 2 }, [{ yr: 2024 }, { yr: 2023 }]);
    expect(t.trimAcquis).toBe(7);          // min(4,3)=3 + min(4,6+2)=4
    expect(t.anneeRef).toBe(2024);
  });

  test("tolerates null/empty inputs", () => {
    expect(computeRealAssuranceTotals({}, {}, [])).toEqual({ trimAcquis: 0, anneeRef: null, trimParAnnee: {} });
    expect(computeRealAssuranceTotals(null, null, null)).toEqual({ trimAcquis: 0, anneeRef: null, trimParAnnee: {} });
  });
});

// Regression for the reported bug: in "Taux plein (durée)" mode, adding then removing
// surcote left the extra year in the grid. Root cause: the duration target was derived
// from trimestres that INCLUDED the projected years it had just written, so each surcote
// step drifted the target forward and the reconcile never shrank back. The target must be
// derived from REAL (non-projected) trimestres so it stays stable across surcote changes.
describe("DUREE surcote add/remove (feedback-loop regression)", () => {
  const BIRTH = "1965-06-15"; // trimRequis = 171 (génération 1965, avril-déc)

  // Mirrors the component: derive the duration target from current grid state.
  function dureeTargetYear(state) {
    const { trimAcquis, anneeRef } = computeRealAssuranceTotals(state.trimCotState, state.trimAssState, state.carriereRows);
    const tp = computeDateTauxPlein(BIRTH, trimAcquis, anneeRef);
    return tp ? tp.date.getFullYear() : null;
  }

  // Mirrors one user action: retarget from current state, then reconcile once.
  function applyProjection(state, surcote) {
    const targetYear = dureeTargetYear(state);
    const lastRealYear = findLastRealYear(state.carriereRows);
    const lastRealSalary = findLastRealSalary(state.carriereRows, lastRealYear);
    const res = reconcileProjection(
      { carriereRows: state.carriereRows, revaloValues: state.revaloValues, trimCotState: state.trimCotState },
      { lastRealYear, targetYear, surcote, lastRealSalary, passLast: PASS },
    );
    return { ...state, carriereRows: res.carriereRows, revaloValues: res.revaloValues, trimCotState: res.trimCotState };
  }

  function projectedYears(state) {
    return state.carriereRows.filter((r) => r.projected).map((r) => r.yr).sort((a, b) => a - b);
  }

  test("removing surcote returns to the baseline projection", () => {
    const trimCotState = {};
    for (let y = 1985; y <= 2024; y++) trimCotState[y] = 4; // 40 real years × 4 = 160 trim
    const carriereRows = [];
    for (let y = 2026; y >= 1985; y--) {
      const real = y <= 2024;
      carriereRows.push({ yr: y, sal: real ? 40000 : 0, ss: 0, coeff: "1.000", revalo: real ? 40000 : 0, trim: 0, ar: 0, total: 0, agircPts: 0, ircPts: 0, rciPts: 0, regimes: {} });
    }
    const init = { carriereRows, revaloValues: {}, trimCotState, trimAssState: {} };

    const baseline = applyProjection(init, 0);
    const added = applyProjection(baseline, 1);
    const removed = applyProjection(added, 0);

    expect(projectedYears(added).length).toBe(projectedYears(baseline).length + 1); // surcote added exactly one year
    expect(projectedYears(removed)).toEqual(projectedYears(baseline));              // and removing it goes back
  });
});
