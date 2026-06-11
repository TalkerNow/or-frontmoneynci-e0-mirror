# Projection multi-ancres — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three computed projection anchors (legal age, full-rate by duration, automatic full-rate at 67) alongside the existing free target age in the "Projection fin de carrière" control.

**Architecture:** A pure helper (`resolveProjectionTargetYear`) maps the selected mode to a target calendar year, reusing date objects already produced by `computeDateLegale` / `computeDateTauxPlein` / `computeDate67`. Those dates are lifted into a shared `departureDates` memo (today computed only inside the "dispositifs" render branch). The existing whole-year reducer (`reconcileProjection`) is unchanged — only how `targetYear` is derived changes.

**Tech Stack:** React 16 (function component + hooks), Jest via `react-app-rewired test`, no backend change.

**Spec:** `docs/specs/2026-06-08-projection-multi-ancres-design.md`

> **Note on plan location:** the skill default is `docs/superpowers/plans/`, but `docs/superpowers/` is gitignored in this repo, so the plan lives in `docs/plans/`.

> **Note on testing strategy:** only Task 1 is unit-tested (the pure helper — that is where every edge case lives). Tasks 2–6 edit the 5000-line `SimulatorIntegration.js` React component, which has no component tests in this repo; they are verified by the production build (compiles the whole tree, catches JSX/import errors) plus a browser-preview check (Task 7). After each component task, also run the unit suite to confirm the pure modules still pass.

> **Branch:** all work happens on `feature/projection-multi-anchors` (already created; the design spec is its first commit).

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/views/apps/user/edit/notes/careerProjection.js` | Pure projection helpers (no React) | Add `PROJECTION_MODES` + `resolveProjectionTargetYear` |
| `src/views/apps/user/edit/notes/careerProjection.test.js` | Unit tests for the pure helpers | Add `resolveProjectionTargetYear` tests |
| `src/views/apps/user/edit/notes/SimulatorIntegration.js` | Simulator UI + projection wiring | Barème freshness, `departureDates` memo, `projectionMode` state, generalized handler, mode-selector UI |

---

## Task 1: Pure helper `resolveProjectionTargetYear`

**Files:**
- Modify: `src/views/apps/user/edit/notes/careerProjection.js` (append after `reconcileProjection`, currently ends line 124)
- Test: `src/views/apps/user/edit/notes/careerProjection.test.js`

- [ ] **Step 1: Add the failing tests**

Add `resolveProjectionTargetYear, PROJECTION_MODES` to the existing import block at the top of `careerProjection.test.js` (lines 1–12):

```js
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
} from "./careerProjection";
```

Append this `describe` block at the end of the file:

```js
describe("resolveProjectionTargetYear", () => {
  const departureDates = {
    trimAcquis: 168,
    legale:    { date: new Date(2027, 3, 1), ageStr: "63 ans 9 m", label: "avril 2027" },   // April 2027
    tauxPlein: { date: new Date(2029, 0, 1), ageStr: "65 ans", label: "janvier 2029", trimRequis: 172, trimManquants: 4 }, // Jan 2029
    date67:    { date: new Date(2032, 8, 1), label: "septembre 2032" },                       // Sept 2032
  };

  test("libre: birthYear + age", () => {
    expect(resolveProjectionTargetYear({ mode: PROJECTION_MODES.LIBRE, birthYear: 1965, age: 64 })).toBe(2029);
  });
  test("legal: year of the barème legal date", () => {
    expect(resolveProjectionTargetYear({ mode: PROJECTION_MODES.LEGAL, departureDates })).toBe(2027);
  });
  test("duree: year of the full-rate-by-duration date", () => {
    expect(resolveProjectionTargetYear({ mode: PROJECTION_MODES.DUREE, departureDates })).toBe(2029);
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `CI=true npm test -- src/views/apps/user/edit/notes/careerProjection.test.js --watchAll=false`
Expected: FAIL — `resolveProjectionTargetYear is not a function` (and `PROJECTION_MODES` undefined).

- [ ] **Step 3: Implement the helper**

Append to `careerProjection.js` (after the closing `}` of `reconcileProjection`, currently line 124):

```js

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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `CI=true npm test -- src/views/apps/user/edit/notes/careerProjection.test.js --watchAll=false`
Expected: PASS — all `resolveProjectionTargetYear` tests green, existing tests still green.

- [ ] **Step 5: Commit**

```bash
git add src/views/apps/user/edit/notes/careerProjection.js src/views/apps/user/edit/notes/careerProjection.test.js
git commit -m "feat: add resolveProjectionTargetYear pure helper for projection anchors"
```

---

## Task 2: Load the freshest backend barème on mount

**Files:**
- Modify: `src/views/apps/user/edit/notes/SimulatorIntegration.js` (import line 32; state near line 1049; new effect in the Side Effects area near line 1908)

- [ ] **Step 1: Import `initBareme`**

Change line 32 from:

```js
import { coeffRevalo } from "../simulatorData";
```

to:

```js
import { coeffRevalo, initBareme } from "../simulatorData";
```

- [ ] **Step 2: Add the `baremeReady` state**

Right after line 1049 (`const [projectionSurcote, setProjectionSurcote] = useState(0);`) add:

```js
  const [baremeReady, setBaremeReady] = useState(false);
```

- [ ] **Step 3: Add the load effect**

In the "Side Effects" area (just after line 1908 `// ── Side Effects ──`) add:

```js
  // Load the editable backend barème (/v1/departure-rules) so legal age / required
  // quarters reflect the latest table (it changes often). Falls back to the hard-coded
  // BAREME_TRANCHES on failure. baremeReady flips once loaded so the departureDates memo
  // recomputes (getBaremeRetraite reads a module-level cache React can't observe directly).
  useEffect(() => {
    let alive = true;
    initBareme().then(() => { if (alive) setBaremeReady(true); }).catch(() => {});
    return () => { alive = false; };
  }, []);
```

- [ ] **Step 4: Verify the unit suite still passes**

Run: `CI=true npm test -- --watchAll=false`
Expected: PASS (no regressions; this task adds an import/state/effect only).

- [ ] **Step 5: Commit**

```bash
git add src/views/apps/user/edit/notes/SimulatorIntegration.js
git commit -m "feat: load latest backend retirement barème on simulator mount"
```

---

## Task 3: Lift the `departureDates` memo and reuse it in the dispositifs panel

**Files:**
- Modify: `src/views/apps/user/edit/notes/SimulatorIntegration.js` (new memo after line 1508; refactor lines 5211–5241)

- [ ] **Step 1: Add the shared `departureDates` memo**

Right after line 1508 (`const projectionActive = projLastRealYear != null && projTargetYear != null;`) add:

```js

  // Departure dates derived from barème + grid, shared by the projection selector (below)
  // and the "dispositifs" panel. Each anchor is the object returned by its compute* helper
  // (or null when not computable, e.g. no birth date). baremeReady is a recompute trigger.
  const departureDates = useMemo(() => {
    const birthDate = user?.birth_date;
    const yearKeys = Array.from(new Set([...Object.keys(trimCotState), ...Object.keys(trimAssState)]));
    const trimAcquis = sumTrimestresCapped(
      yearKeys.map((yr) => ({
        trimestres_cotises: Number(trimCotState[yr]) || 0,
        trimestres_assimiles: Number(trimAssState[yr]) || 0,
      }))
    );
    let anneeRef = null;
    const scan = (state) => Object.entries(state).forEach(([y, v]) => {
      if ((Number(v) || 0) > 0) { const yr = Number(y); if (anneeRef === null || yr > anneeRef) anneeRef = yr; }
    });
    scan(trimCotState); scan(trimAssState);
    const trimParAnnee = {};
    yearKeys.forEach((yr) => {
      const v = Math.min(4, (Number(trimCotState[yr]) || 0) + (Number(trimAssState[yr]) || 0));
      if (v > 0) trimParAnnee[yr] = v;
    });
    return {
      trimAcquis,
      anneeRef,
      trimParAnnee,
      legale: computeDateLegale(birthDate),
      tauxPlein: computeDateTauxPlein(birthDate, trimAcquis, anneeRef),
      date67: computeDate67(birthDate),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, trimCotState, trimAssState, baremeReady]);
```

- [ ] **Step 2: Replace the duplicated computation in the dispositifs branch**

In the `expandedPanel === "dispositifs"` branch, replace the exact block at lines 5211–5241:

```js
                      const dispBirthDate = user?.birth_date;
                      // Durée d'assurance plafonnée à 4 trim/an : pilote la date de
                      // taux plein (computeDateTauxPlein). Sans plafond, un parcours
                      // mixte sur-compte et fausse la date de départ (bug 1708).
                      const dispTrimAcquis = sumTrimestresCapped(
                        Array.from(new Set([...Object.keys(trimCotState), ...Object.keys(trimAssState)])).map((yr) => ({
                          trimestres_cotises: Number(trimCotState[yr]) || 0,
                          trimestres_assimiles: Number(trimAssState[yr]) || 0,
                        }))
                      );
                      // Année de référence du décompte = dernière année civile avec des
                      // trimestres validés (les trimestres se valident par année civile).
                      const dispAnneeRef = (() => {
                        let max = null;
                        const scan = (state) => Object.entries(state).forEach(([y, v]) => {
                          if ((Number(v) || 0) > 0) { const yr = Number(y); if (max === null || yr > max) max = yr; }
                        });
                        scan(trimCotState); scan(trimAssState);
                        return max;
                      })();
                      // Trimestres validés par année civile (cotisés + assimilés,
                      // plafonné 4/an, rachetés exclus — cohérent avec computeDateTauxPlein).
                      // Sert au décompte historique exact des dates de départ passées.
                      const dispTrimParAnnee = {};
                      Array.from(new Set([...Object.keys(trimCotState), ...Object.keys(trimAssState)])).forEach((yr) => {
                        const v = Math.min(4, (Number(trimCotState[yr]) || 0) + (Number(trimAssState[yr]) || 0));
                        if (v > 0) dispTrimParAnnee[yr] = v;
                      });
                      const dispDateLegale = computeDateLegale(dispBirthDate);
                      const dispDateTauxPlein = computeDateTauxPlein(dispBirthDate, dispTrimAcquis, dispAnneeRef);
                      const dispDate67 = computeDate67(dispBirthDate);
```

with:

```js
                      const dispBirthDate = user?.birth_date;
                      // Dates de départ + durée d'assurance : calculées une seule fois dans
                      // le memo departureDates (partagé avec le sélecteur de projection).
                      const {
                        trimAcquis: dispTrimAcquis,
                        anneeRef: dispAnneeRef,
                        trimParAnnee: dispTrimParAnnee,
                        legale: dispDateLegale,
                        tauxPlein: dispDateTauxPlein,
                        date67: dispDate67,
                      } = departureDates;
```

- [ ] **Step 3: Verify the unit suite still passes**

Run: `CI=true npm test -- --watchAll=false`
Expected: PASS.

- [ ] **Step 4: Verify the app still compiles**

Run: `npm run build`
Expected: "Compiled successfully" (or compiled with pre-existing warnings only). No new errors mentioning `departureDates`, `dispTrimAcquis`, `dispDateLegale`, etc.

- [ ] **Step 5: Commit**

```bash
git add src/views/apps/user/edit/notes/SimulatorIntegration.js
git commit -m "refactor: lift departureDates into a shared memo, reuse in dispositifs panel"
```

---

## Task 4: Add `projectionMode` state, persistence and reset

**Files:**
- Modify: `src/views/apps/user/edit/notes/SimulatorIntegration.js` (careerProjection import block lines 33–39; state near line 1049; reset near line 1830; restore effect line 1917; persist effect lines 1929–1931)

- [ ] **Step 1: Import the mode constants**

Change the `careerProjection` import block (lines 33–39) from:

```js
import {
  parseBirthYear,
  computeTargetYear,
  findLastRealYear,
  findLastRealSalary,
  reconcileProjection,
} from "./careerProjection";
```

to:

```js
import {
  parseBirthYear,
  computeTargetYear,
  findLastRealYear,
  findLastRealSalary,
  reconcileProjection,
  resolveProjectionTargetYear,
  PROJECTION_MODES,
} from "./careerProjection";
```

- [ ] **Step 2: Add the `projectionMode` state**

Right after the `baremeReady` line added in Task 2 (after line 1049 area) add:

```js
  const [projectionMode, setProjectionMode] = useState(PROJECTION_MODES.LIBRE);
```

- [ ] **Step 3: Reset the mode in the reset handler**

After line 1828–1830, add `setProjectionMode` so the reset block reads:

```js
    setProjectionTargetAge(67);
    setProjectionSurcote(0);
    setProjectionMode(PROJECTION_MODES.LIBRE);
    try { localStorage.removeItem(`simu_projection_${id}`); } catch { /* noop */ }
```

- [ ] **Step 4: Restore the mode from localStorage**

In the restore effect (lines 1915–1919), add the `mode` line:

```js
      if (raw) {
        const d = JSON.parse(raw);
        if (Number.isFinite(d.targetAge)) setProjectionTargetAge(d.targetAge);
        if (Number.isFinite(d.surcote)) setProjectionSurcote(d.surcote);
        if (typeof d.mode === "string") setProjectionMode(d.mode);
      }
```

- [ ] **Step 5: Persist the mode**

Replace the persist effect body + deps (lines 1929 and 1931):

```js
      localStorage.setItem(`simu_projection_${id}`, JSON.stringify({ targetAge: projectionTargetAge, surcote: projectionSurcote }));
```

becomes:

```js
      localStorage.setItem(`simu_projection_${id}`, JSON.stringify({ targetAge: projectionTargetAge, surcote: projectionSurcote, mode: projectionMode }));
```

and the dependency array on line 1931:

```js
  }, [id, projectionTargetAge, projectionSurcote]);
```

becomes:

```js
  }, [id, projectionTargetAge, projectionSurcote, projectionMode]);
```

- [ ] **Step 6: Verify the unit suite still passes**

Run: `CI=true npm test -- --watchAll=false`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/views/apps/user/edit/notes/SimulatorIntegration.js
git commit -m "feat: add projectionMode state with localStorage persistence and reset"
```

---

## Task 5: Generalize `handleGenerateProjection` to the selected mode

**Files:**
- Modify: `src/views/apps/user/edit/notes/SimulatorIntegration.js` (handler lines 1512–1527; nonce effect line 1940; callers at lines 4611, 4620, 4624 — line numbers shift after Task 3/4 edits; match by content)

- [ ] **Step 1: Rewrite the handler to derive `targetYear` from the mode**

Replace the body of `handleGenerateProjection` (lines 1512–1527):

```js
  const handleGenerateProjection = useCallback((nextAge, nextSurcote) => {
    const birthYear = parseBirthYear(user?.birth_date);
    const targetYear = computeTargetYear(birthYear, nextAge);
    const lastRealYear = findLastRealYear(carriereRows);
    const lastRealSalary = findLastRealSalary(carriereRows, lastRealYear);
    const res = reconcileProjection(
      { carriereRows, revaloValues, trimCotState },
      { lastRealYear, targetYear, surcote: nextSurcote, lastRealSalary, passLast: PASS_LAST },
    );
    setCarriereRows(res.carriereRows);
    setRevaloValues(res.revaloValues);
    setTrimCotState(res.trimCotState);
    if (res.projectedYears.length) {
      setVisibleRowCount((v) => Math.min(res.carriereRows.length, Math.max(v, res.projectedYears.length + 20)));
    }
  }, [carriereRows, revaloValues, trimCotState, user]);
```

with (note the new first arg `nextMode`, the `resolveProjectionTargetYear` call, and `departureDates` added to deps):

```js
  const handleGenerateProjection = useCallback((nextMode, nextAge, nextSurcote) => {
    const birthYear = parseBirthYear(user?.birth_date);
    const targetYear = resolveProjectionTargetYear({ mode: nextMode, birthYear, age: nextAge, departureDates });
    const lastRealYear = findLastRealYear(carriereRows);
    const lastRealSalary = findLastRealSalary(carriereRows, lastRealYear);
    const res = reconcileProjection(
      { carriereRows, revaloValues, trimCotState },
      { lastRealYear, targetYear, surcote: nextSurcote, lastRealSalary, passLast: PASS_LAST },
    );
    setCarriereRows(res.carriereRows);
    setRevaloValues(res.revaloValues);
    setTrimCotState(res.trimCotState);
    if (res.projectedYears.length) {
      setVisibleRowCount((v) => Math.min(res.carriereRows.length, Math.max(v, res.projectedYears.length + 20)));
    }
  }, [carriereRows, revaloValues, trimCotState, user, departureDates]);
```

- [ ] **Step 2: Update the RIS-regen effect caller**

Find (was line 1940):

```js
    if (projRegenNonce > 0) handleGenerateProjection(projectionTargetAge, projectionSurcote);
```

Replace with:

```js
    if (projRegenNonce > 0) handleGenerateProjection(projectionMode, projectionTargetAge, projectionSurcote);
```

- [ ] **Step 3: Verify the unit suite still passes**

Run: `CI=true npm test -- --watchAll=false`
Expected: PASS.

> The two surcote-button callers and the numeric-input caller are rewritten as part of the new UI in Task 6 (that whole block is replaced), so no separate edit is needed here for them.

- [ ] **Step 4: Commit**

```bash
git add src/views/apps/user/edit/notes/SimulatorIntegration.js
git commit -m "feat: derive projection target year from selected mode"
```

---

## Task 6: Mode-selector UI with computed-anchor feedback

**Files:**
- Modify: `src/views/apps/user/edit/notes/SimulatorIntegration.js` (the "Projection fin de carrière" block, originally lines 4595–4631 — match by the `{/* Projection fin de carrière */}` comment)

- [ ] **Step 1: Replace the projection control block**

Replace the entire block from `{/* Projection fin de carrière */}` through its closing `</div>` (originally lines 4595–4631) with:

```jsx
                          {/* Projection fin de carrière */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "#FFF7E6", border: "1px solid #FFE0A3", borderRadius: 8, padding: "8px 14px", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 16 }}>📈</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#343a40" }}>Projeter jusqu&rsquo;à</span>
                              {[
                                { id: PROJECTION_MODES.LEGAL,  label: "Âge légal",          needsBirth: true },
                                { id: PROJECTION_MODES.DUREE,  label: "Taux plein (durée)", needsBirth: true },
                                { id: PROJECTION_MODES.AUTO67, label: "Taux plein 67 ans",  needsBirth: true },
                                { id: PROJECTION_MODES.LIBRE,  label: "Âge libre",          needsBirth: false },
                              ].map((chip) => {
                                const disabled = carriereValidee || (chip.needsBirth && !projBirthYear);
                                const active = projectionMode === chip.id;
                                return (
                                  <button
                                    key={chip.id}
                                    type="button"
                                    disabled={disabled}
                                    title={chip.needsBirth && !projBirthYear ? "Renseignez la date de naissance du client" : undefined}
                                    onClick={() => { setProjectionMode(chip.id); handleGenerateProjection(chip.id, projectionTargetAge, projectionSurcote); }}
                                    style={{ padding: "4px 10px", borderRadius: 14, fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, border: active ? "1px solid #FF9F43" : "1px solid #FFD08A", background: active ? "#FF9F43" : "#fff", color: active ? "#fff" : "#B26A00" }}
                                  >
                                    {chip.label}
                                  </button>
                                );
                              })}
                              {projectionMode === PROJECTION_MODES.LIBRE && (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <label htmlFor="proj_target_age" style={{ fontSize: 13, fontWeight: 600, color: "#343a40" }}>Âge visé</label>
                                  <input
                                    type="number"
                                    id="proj_target_age"
                                    min={60}
                                    max={75}
                                    value={projectionTargetAge}
                                    disabled={carriereValidee}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value, 10);
                                      const clamped = Number.isFinite(v) ? Math.min(75, Math.max(60, v)) : 67;
                                      setProjectionTargetAge(clamped);
                                      handleGenerateProjection(PROJECTION_MODES.LIBRE, clamped, projectionSurcote);
                                    }}
                                    style={{ width: 64, textAlign: "center", border: "1px solid #ddd", borderRadius: 4, fontSize: 14, padding: "2px 4px" }}
                                  />
                                </div>
                              )}
                              {projectionActive && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "#343a40" }}>Surcote</span>
                                  <button type="button" disabled={carriereValidee || projectionSurcote <= 0}
                                    onClick={() => { const s = Math.max(0, projectionSurcote - 1); setProjectionSurcote(s); handleGenerateProjection(projectionMode, projectionTargetAge, s); }}
                                    style={{ width: 26, height: 26, borderRadius: 4, border: "1px solid #FF9F43", background: "#fff", color: "#FF9F43", fontWeight: 700, cursor: "pointer" }}>−</button>
                                  <span style={{ fontSize: 13, minWidth: 56, textAlign: "center" }}>{projectionSurcote} an{projectionSurcote > 1 ? "s" : ""}</span>
                                  <button type="button" disabled={carriereValidee}
                                    onClick={() => { const s = projectionSurcote + 1; setProjectionSurcote(s); handleGenerateProjection(projectionMode, projectionTargetAge, s); }}
                                    style={{ width: 26, height: 26, borderRadius: 4, border: "1px solid #FF9F43", background: "#fff", color: "#FF9F43", fontWeight: 700, cursor: "pointer" }}>+</button>
                                </div>
                              )}
                            </div>
                            {projectionMode !== PROJECTION_MODES.LIBRE && projBirthYear && (() => {
                              const dd = departureDates;
                              let txt = null;
                              if (projectionMode === PROJECTION_MODES.LEGAL && dd.legale) {
                                txt = `📅 Âge légal : ${dd.legale.ageStr} — départ ${dd.legale.label}`;
                              } else if (projectionMode === PROJECTION_MODES.DUREE && dd.tauxPlein) {
                                const tp = dd.tauxPlein;
                                const reste = tp.trimManquants > 0 ? ` (${tp.trimManquants} manquants)` : " ✓";
                                txt = `📅 Taux plein (durée) : ${tp.ageStr} — départ ${tp.label} · ${dd.trimAcquis}/${tp.trimRequis} trim.${reste}`;
                              } else if (projectionMode === PROJECTION_MODES.AUTO67 && dd.date67) {
                                txt = `📅 Taux plein 67 ans — départ ${dd.date67.label}`;
                              }
                              return txt ? <span style={{ fontSize: 12, color: "#8a6d3b", fontWeight: 600 }}>{txt}</span> : null;
                            })()}
                            {projLastRealYear != null && !projBirthYear && (
                              <span style={{ fontSize: 12, color: "#ea5455", fontWeight: 600 }}>Renseignez la date de naissance du client pour projeter jusqu&rsquo;au taux plein.</span>
                            )}
                          </div>
```

- [ ] **Step 2: Verify the app compiles**

Run: `npm run build`
Expected: "Compiled successfully" (only pre-existing warnings). No errors referencing the projection block, `projectionMode`, `departureDates`, or `handleGenerateProjection`.

- [ ] **Step 3: Verify the unit suite still passes**

Run: `CI=true npm test -- --watchAll=false`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/views/apps/user/edit/notes/SimulatorIntegration.js
git commit -m "feat: mode selector (legal age / full-rate duration / 67 / free) for projection"
```

---

## Task 7: Browser verification

**Files:** none (manual/preview verification)

- [ ] **Step 1: Start the dev server**

Use the preview tooling (`preview_start`) against `frontmoneynci` (dev server on :3000). Ensure `frontmoneynci/.env.local` points `REACT_APP_API_URL` at `http://localhost:8000/api` (not `:8001`) so the client list and barème load.

- [ ] **Step 2: Open a client with a known birth date and reach the simulator**

Navigate to a client edit page → Notes tab → simulator career grid (`SimulatorIntegration`). Confirm the "Projection fin de carrière" box shows four chips: **Âge légal · Taux plein (durée) · Taux plein 67 ans · Âge libre**, with "Âge libre" active by default and the numeric field visible.

- [ ] **Step 3: Exercise each anchor**

Click **Âge légal**: the numeric field disappears, the feedback line shows e.g. "📅 Âge légal : 63 ans 9 m — départ …", and projected rows appear at the top of the grid up to that year.
Click **Taux plein (durée)**: feedback shows "… · NN/172 trim. …" and the grid projects to the duration year.
Click **Taux plein 67 ans**: grid projects to the year of the client's 67th birthday.
Click **Âge libre**: the numeric field returns and editing it reprojects.
Use **Surcote +/−** in an anchor mode and confirm extra years are added on top.

- [ ] **Step 4: Edge + persistence checks**

Open a client with **no birth date**: the three anchor chips are greyed/disabled (tooltip on hover), "Âge libre" still works, and the existing red warning shows.
Pick an anchor, reload the page: the same mode is restored (localStorage `simu_projection_<id>`).
Check `preview_console_logs` for errors after the interactions.

- [ ] **Step 5: Capture proof**

Take a `preview_screenshot` of the projection box in an anchor mode (with the feedback line and projected rows visible) to attach to the PR.

---

## Self-Review

- **Spec coverage:** 4 modes (Task 1 + 6), barème freshness (Task 2), shared `departureDates` memo + DRY with dispositifs (Task 3), `projectionMode` state/persistence/reset (Task 4), generalized handler reusing the unchanged reducer (Task 5), selector UI + feedback + month→year mapping via `.getFullYear()` (Task 1/6), edge cases: no birth date (Task 6 disabled chips + Task 1 null), past target (handled by existing `Math.max` in `computeProjectedYears`), locked career (`carriereValidee` disables, Task 6). All spec sections map to a task.
- **Type consistency:** `resolveProjectionTargetYear({ mode, birthYear, age, departureDates })` and `PROJECTION_MODES` (`LEGAL`/`DUREE`/`AUTO67`/`LIBRE`) used identically across Tasks 1, 4, 5, 6. `handleGenerateProjection(nextMode, nextAge, nextSurcote)` — every caller updated (nonce effect Task 5; chips, numeric input, surcote buttons in Task 6). `departureDates` shape (`{ trimAcquis, anneeRef, trimParAnnee, legale, tauxPlein, date67 }`) consumed consistently by the memo (Task 3), the dispositifs destructuring (Task 3), the handler (Task 5) and the feedback line (Task 6).
- **No placeholders:** every code/edit step contains full code and exact commands.
```
