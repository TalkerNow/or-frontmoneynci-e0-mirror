// Pure career-end projection helpers for SimulatorIntegration. No React, no side effects.
// Projected years are real carriereRows entries flagged `projected: true`; they ride the
// existing freeze (handleGeler) → frozen_data → n8n path and every aggregation unchanged.

// Last year present in the seeded historical grid (_buildDefaultCarriereRows: 2026..1962).
// Projected years <= this already exist as rows; years beyond it are inserted as new rows.
const LAST_HISTORY_YEAR = 2026;

export function toNumber(v) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

// UTC year from an ISO birth date string (user.birth_date). Null if unparseable.
export function parseBirthYear(birthDateStr) {
  if (!birthDateStr || typeof birthDateStr !== "string") return null;
  const d = new Date(birthDateStr);
  if (isNaN(d.getTime())) return null;
  return d.getUTCFullYear();
}

export function computeTargetYear(birthYear, targetAge) {
  if (birthYear == null || !Number.isFinite(targetAge)) return null;
  return birthYear + targetAge;
}

// Most recent year with a salary > 0. Null if the grid has no salary anywhere.
export function findLastRealYear(carriereRows) {
  let last = null;
  for (const r of carriereRows) {
    if (!r.projected && toNumber(r.sal) > 0 && (last == null || r.yr > last)) last = r.yr;
  }
  return last;
}

export function findLastRealSalary(carriereRows, lastRealYear) {
  if (lastRealYear == null) return 0;
  const row = carriereRows.find((r) => r.yr === lastRealYear);
  return row ? toNumber(row.sal) : 0;
}

// [lastRealYear+1 … max(targetYear, lastRealYear) + surcote] ascending.
// The max() lets surcote add years even when the client is already past the target age.
export function computeProjectedYears(lastRealYear, targetYear, surcote) {
  if (lastRealYear == null || targetYear == null) return [];
  const upper = Math.max(targetYear, lastRealYear) + (surcote || 0);
  const years = [];
  for (let y = lastRealYear + 1; y <= upper; y++) years.push(y);
  return years;
}

export function isProjectedYear(year, lastRealYear, maxProjectedYear, active) {
  if (!active || lastRealYear == null || maxProjectedYear == null) return false;
  return year > lastRealYear && year <= maxProjectedYear;
}

// Value carried by one projected year: last real salary capped at the latest PASS,
// coeff 1 (revalo = sal), 4 cotised trimestres.
export function projectYearValue(lastSalary, passLast) {
  const sal = Math.min(toNumber(lastSalary), toNumber(passLast));
  return { sal, revalo: sal, trimestres: 4 };
}

// Row object for a NEW (>2026) projected year, matching _buildDefaultCarriereRows shape + flag.
export function buildProjectedRow(year, value) {
  return {
    yr: year, sal: value.sal, ss: value.sal, coeff: "1.000", revalo: value.revalo,
    trim: 0, ar: 0, total: 0, agircPts: 0, ircPts: 0, rciPts: 0, regimes: {}, projected: true,
  };
}

// Pure reducer. Given current { carriereRows, revaloValues, trimCotState } and projection
// params, returns NEW state objects where projected rows match the target year set:
//   - add years (pre-filled), remove years (drop >2026 row / clear ≤2026 row), keep the rest
//     UNTOUCHED so manual edits survive. carriereRows is returned sorted descending by yr.
export function reconcileProjection(state, params) {
  const { lastRealYear, targetYear, surcote, lastRealSalary, passLast } = params;
  const target = new Set(computeProjectedYears(lastRealYear, targetYear, surcote));

  const carriereRows = state.carriereRows.map((r) => ({ ...r }));
  const revaloValues = { ...state.revaloValues };
  const trimCotState = { ...state.trimCotState };

  const byYear = new Map(carriereRows.map((r) => [r.yr, r]));
  const value = projectYearValue(lastRealSalary, passLast);

  // Remove rows that were projected but are no longer in the target set.
  for (let i = carriereRows.length - 1; i >= 0; i--) {
    const r = carriereRows[i];
    if (r.projected && !target.has(r.yr)) {
      if (r.yr > LAST_HISTORY_YEAR) {
        carriereRows.splice(i, 1);
        byYear.delete(r.yr);
      } else {
        carriereRows[i] = { ...r, sal: 0, ss: 0, revalo: 0, projected: false };
        byYear.set(r.yr, carriereRows[i]);
      }
      delete revaloValues[r.yr];
      delete trimCotState[r.yr];
    }
  }

  // Add years that are in the target set but not yet projected. Keep already-projected
  // years untouched (preserve manual edits).
  for (const y of target) {
    const existing = byYear.get(y);
    if (existing && existing.projected) continue; // keep edits
    if (existing) {
      const updated = { ...existing, sal: value.sal, ss: value.sal, coeff: "1.000", revalo: value.revalo, trim: 0, projected: true };
      const idx = carriereRows.findIndex((r) => r.yr === y);
      carriereRows[idx] = updated;
      byYear.set(y, updated);
    } else {
      const row = buildProjectedRow(y, value);
      carriereRows.push(row);
      byYear.set(y, row);
    }
    revaloValues[y] = value.revalo;
    trimCotState[y] = value.trimestres;
  }

  carriereRows.sort((a, b) => b.yr - a.yr);
  return { carriereRows, revaloValues, trimCotState, projectedYears: [...target].sort((a, b) => a - b) };
}

// Projection mode identifiers used by the "Projection fin de carrière" selector.
export const PROJECTION_MODES = {
  LEGAL: "legal",     // âge légal (barème)
  DUREE: "duree",     // taux plein par la durée d'assurance
  AUTO67: "auto67",   // taux plein automatique à 67 ans
  LIBRE: "libre",     // âge saisi librement (champ numérique)
};

// Resolve the calendar year the projection should fill up to, given the selected mode.
// `departureDates` carries the objects returned by computeDateLegale / computeDateTauxPlein /
// computeDate67 (each { date: Date, ... } | null). Returns null when not computable
// (e.g. no birth date) — which deactivates the projection (reconcileProjection adds no rows).
export function resolveProjectionTargetYear({ mode, birthYear, age, departureDates }) {
  if (mode === PROJECTION_MODES.LIBRE) return computeTargetYear(birthYear, age);
  if (!departureDates) return null;
  const picked =
    mode === PROJECTION_MODES.LEGAL ? departureDates.legale :
    mode === PROJECTION_MODES.DUREE ? departureDates.tauxPlein :
    mode === PROJECTION_MODES.AUTO67 ? departureDates.date67 :
    null;
  const d = picked && picked.date;
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;
  return d.getFullYear();
}

// Real (non-projected) assurance totals from the career grid: trimestres acquired (capped
// 4/yr, cotisés + assimilés), the reference calendar year, and the per-year validated map —
// EXCLUDING projected years. The career-end projection writes 4 trimestres into the projected
// years; counting them here would make a duration-based taux-plein target depend on its own
// projection (a feedback loop where adding surcote drifts the target so it never shrinks back).
export function computeRealAssuranceTotals(trimCotState, trimAssState, carriereRows) {
  const cot = trimCotState || {};
  const ass = trimAssState || {};
  const projected = new Set(
    (Array.isArray(carriereRows) ? carriereRows : [])
      .filter((r) => r && r.projected)
      .map((r) => r.yr)
  );
  const yearKeys = Array.from(new Set([...Object.keys(cot), ...Object.keys(ass)]))
    .filter((yr) => !projected.has(Number(yr)));
  let trimAcquis = 0;
  let anneeRef = null;
  const trimParAnnee = {};
  yearKeys.forEach((yr) => {
    const sum = (Number(cot[yr]) || 0) + (Number(ass[yr]) || 0);
    const capped = Math.min(4, Math.max(0, sum));
    trimAcquis += capped;
    if (sum > 0) {
      trimParAnnee[yr] = capped;
      const y = Number(yr);
      if (anneeRef === null || y > anneeRef) anneeRef = y;
    }
  });
  return { trimAcquis, anneeRef, trimParAnnee };
}
