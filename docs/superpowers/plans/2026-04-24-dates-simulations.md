# Dates & Simulations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les données mockées du panel "Dates & Simulations" (step 4) par des calculs réels issus des données de carrière déjà en state.

**Architecture:** Toutes les fonctions de calcul vont dans `src/utils/calculators.js` (pattern existant du projet), testées dans `calculators.test.js`. Le panel dates dans `SimulatorIntegration.js` importe et utilise ces fonctions au lieu des constantes mockées.

**Tech Stack:** React 16, Jest (via react-scripts test), JS pur — aucune dépendance nouvelle.

---

## File Map

| Fichier | Action | Contenu |
|---|---|---|
| `src/utils/calculators.js` | Modifier | Ajouter `computeSAMB`, `computeArrcoPts`, `parseBirthDate`, `computeDateLegale`, `computeDateTauxPlein`, `computeDate67`, `computeAutoDateFromDispositif` |
| `src/utils/calculators.test.js` | Modifier | Tests pour chaque nouvelle fonction |
| `src/views/apps/user/edit/notes/SimulatorIntegration.js` | Modifier | Importer les nouvelles fonctions, remplacer MOCK_AUTO_DATES et dateComments hardcodés |

---

## Task 1 — Fonctions de calcul pension (SAMB + points ARRCO)

**Files:**
- Modify: `src/utils/calculators.js`
- Modify: `src/utils/calculators.test.js`

### Contexte
`calculators.js` importe déjà `coeffRevalo` et `plafondSS` depuis `simulatorData`. On ajoute deux fonctions qui travaillent sur `carriereRows` (le state React du tableau carrière). Chaque `row` a la forme `{ yr, sal, agircPts, ... }`.

- [ ] **Step 1 : Écrire les tests qui doivent échouer**

Ajouter à la fin de `src/utils/calculators.test.js` :

```js
import { computeSAMB, computeArrcoPts } from './calculators';

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
    // 10000 * coeffRevalo[yr] for each of 25 best years — all ~10000*1.x
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
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /Users/dydy2brazil/stage/frontmoneynci
CI=true npx react-scripts test --testPathPattern="calculators" --watchAll=false 2>&1 | tail -20
```

Résultat attendu : erreur "computeSAMB is not exported" ou similaire.

- [ ] **Step 3 : Implémenter les fonctions dans `calculators.js`**

Ajouter à la fin de `src/utils/calculators.js` :

```js
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
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /Users/dydy2brazil/stage/frontmoneynci
CI=true npx react-scripts test --testPathPattern="calculators" --watchAll=false 2>&1 | tail -20
```

Résultat attendu : tous les tests PASS.

- [ ] **Step 5 : Commit**

```bash
cd /Users/dydy2brazil/stage/frontmoneynci
git add src/utils/calculators.js src/utils/calculators.test.js
git commit -m "feat(calculators): add computeSAMB and computeArrcoPts

Compute the SAMB (25 best revalued years, capped at PASS) and ARRCO
total points + annual projection from career rows."
```

---

## Task 2 — Fonctions de calcul des dates de départ

**Files:**
- Modify: `src/utils/calculators.js`
- Modify: `src/utils/calculators.test.js`

### Contexte
On ajoute les fonctions qui calculent les dates légales de départ à la retraite à partir de la date de naissance et des trimestres acquis. La source de vérité est la réforme 2023 (Décret n°2023-435). `getTrimTauxPlein` existe déjà dans `simulatorData.js` — on l'importe dans `calculators.js`.

- [ ] **Step 1 : Ajouter l'import de `getTrimTauxPlein` dans `calculators.js`**

Modifier la première ligne d'import de `src/utils/calculators.js` :

```js
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
  getTrimTauxPlein,
} from '../views/apps/user/edit/simulatorData';
```

- [ ] **Step 2 : Écrire les tests qui doivent échouer**

Ajouter à la fin de `src/utils/calculators.test.js` :

```js
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

  test('born 1966 → legal age 63 ans 9 mois', () => {
    // 1966-07-08 + 63 ans 9 mois = 2030-04-08 → 1er du mois suivant = 2030-05-01
    const result = computeDateLegale('1966-07-08');
    expect(result).not.toBeNull();
    expect(result.date.getFullYear()).toBe(2030);
    expect(result.date.getMonth()).toBe(3); // avril = index 3
    expect(result.date.getDate()).toBe(1);
    expect(result.ageStr).toBe('63 ans et 9 mois');
  });

  test('born 1968 → legal age 64 ans', () => {
    // 1968-03-15 + 64 ans = 2032-03-15 → 1er du mois suivant = 2032-04-01
    const result = computeDateLegale('1968-03-15');
    expect(result.date.getFullYear()).toBe(2032);
    expect(result.date.getMonth()).toBe(3);
    expect(result.date.getDate()).toBe(1);
  });

  test('born on the 1st → departure on same date (no shift)', () => {
    // 1965-01-01 + 63 ans 6 mois = 2028-07-01 → already 1st, no shift
    const result = computeDateLegale('1965-01-01');
    expect(result.date.getMonth()).toBe(6); // juillet
    expect(result.date.getDate()).toBe(1);
  });
});

describe('computeDateTauxPlein', () => {
  test('returns null for missing birthDate', () => {
    expect(computeDateTauxPlein(null, 0)).toBeNull();
  });

  test('0 trimestres manquants → departure date is today or earlier', () => {
    // born 1960, trimRequis = 167, trimAcquis = 200 → no quarters missing
    const result = computeDateTauxPlein('1960-01-01', 200);
    expect(result.trimManquants).toBe(0);
    expect(result.date).toBeDefined();
  });

  test('correct trimRequis for birth year 1966', () => {
    // getTrimTauxPlein(1966) = 169 (from simulatorData)
    const result = computeDateTauxPlein('1966-07-08', 100);
    expect(result.trimRequis).toBe(169);
    expect(result.trimManquants).toBe(69);
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
    // 1966 → age légal 63 ans 9 mois → progressive = 61 ans 9 mois
    // 1966-07-08 + 61*12+9 mois = 2028-04-08 → 2028-05-01
    const result = computeAutoDateFromDispositif('retraite_progressive', '1966-07-08', {}, {});
    expect(result).not.toBeNull();
    expect(result.date.getFullYear()).toBe(2028);
    expect(result.date.getMonth()).toBe(4); // mai = index 4
  });
});
```

- [ ] **Step 3 : Vérifier que les tests échouent**

```bash
cd /Users/dydy2brazil/stage/frontmoneynci
CI=true npx react-scripts test --testPathPattern="calculators" --watchAll=false 2>&1 | tail -20
```

Résultat attendu : erreur "parseBirthDate is not exported" ou similaire.

- [ ] **Step 4 : Implémenter les fonctions dans `calculators.js`**

Ajouter à la fin de `src/utils/calculators.js` (après `computeArrcoPts`) :

```js
// ─── DATES DE DÉPART À LA RETRAITE ──────────────────────────────────────────

// Barème âge légal post-réforme 2023 (Décret n°2023-435 du 3 juin 2023)
// { months: total mois à ajouter à la date de naissance, label }
const AGE_LEGAL_BY_BIRTH_YEAR = {
  1961: { months: 62 * 12 + 3, label: '62 ans et 3 mois' },
  1962: { months: 62 * 12 + 6, label: '62 ans et 6 mois' },
  1963: { months: 63 * 12,     label: '63 ans' },
  1964: { months: 63 * 12 + 3, label: '63 ans et 3 mois' },
  1965: { months: 63 * 12 + 6, label: '63 ans et 6 mois' },
  1966: { months: 63 * 12 + 9, label: '63 ans et 9 mois' },
  1967: { months: 64 * 12,     label: '64 ans' },
};

function getAgeLegalEntry(birthYear) {
  if (birthYear < 1961) return { months: 62 * 12, label: '62 ans' };
  return AGE_LEGAL_BY_BIRTH_YEAR[birthYear] || { months: 64 * 12, label: '64 ans' };
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function firstOfNextMonth(date) {
  if (date.getDate() === 1) return new Date(date.getFullYear(), date.getMonth(), 1);
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function formatDateFR(date) {
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function ageLabel(birth, target) {
  const totalMonths =
    (target.getFullYear() - birth.getFullYear()) * 12 +
    (target.getMonth() - birth.getMonth());
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
    return new Date(y, m - 1, d);
  }
  if (birthDate.includes('/')) {
    const parts = birthDate.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number);
      if (!y || !m || !d) return null;
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
  const entry = getAgeLegalEntry(birth.getFullYear());
  const atAge = addMonths(birth, entry.months);
  const departure = firstOfNextMonth(atAge);
  return {
    date: departure,
    label: formatDateFR(departure),
    ageStr: entry.label,
    dateStr: departure.toLocaleDateString('fr-FR'),
  };
}

/**
 * Calcule la date d'atteinte du taux plein (durée d'assurance requise).
 *
 * @param {string|null} birthDate
 * @param {number} trimAcquis  Total trimestres acquis (cotisés + assimilés)
 * @returns {{ date: Date, label: string, trimManquants: number, trimRequis: number } | null}
 */
export function computeDateTauxPlein(birthDate, trimAcquis) {
  const birth = parseBirthDate(birthDate);
  if (!birth) return null;
  const trimRequis = getTrimTauxPlein(birth.getFullYear());
  const trimManquants = Math.max(0, trimRequis - trimAcquis);
  // Projection : 4 trimestres par an = 1 trimestre par trimestre civil (3 mois)
  const today = new Date();
  const projected = addMonths(today, trimManquants * 3);
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
    const entry = getAgeLegalEntry(birthYear);
    const rpMonths = entry.months - 24; // éligible 2 ans avant l'âge légal
    const atAge = addMonths(birth, rpMonths);
    const departure = firstOfNextMonth(atAge);
    return {
      date: departure,
      dateStr: departure.toLocaleDateString('fr-FR'),
      age: ageLabel(birth, departure),
      detail: `Éligible dès ${entry.label} − 2 ans (si 150 trimestres atteints)`,
      color: '#0984E3',
      source: 'Retraite progressive',
    };
  }

  // Les autres dispositifs (chômage, arrêt activité, CER) nécessitent des données
  // non disponibles en JS pur → pas de date calculée ici
  return null;
}
```

- [ ] **Step 5 : Vérifier que les tests passent**

```bash
cd /Users/dydy2brazil/stage/frontmoneynci
CI=true npx react-scripts test --testPathPattern="calculators" --watchAll=false 2>&1 | tail -30
```

Résultat attendu : tous les tests PASS (y compris ceux de la Task 1).

- [ ] **Step 6 : Commit**

```bash
cd /Users/dydy2brazil/stage/frontmoneynci
git add src/utils/calculators.js src/utils/calculators.test.js
git commit -m "feat(calculators): add retirement date computation functions

Add parseBirthDate, computeDateLegale, computeDateTauxPlein,
computeDate67 and computeAutoDateFromDispositif using the post-2023
reform table (Décret n°2023-435)."
```

---

## Task 3 — Brancher le panel Dates dans SimulatorIntegration.js

**Files:**
- Modify: `src/views/apps/user/edit/notes/SimulatorIntegration.js`

### Contexte
Trois zones à modifier dans le JSX du panel `dates` (lignes ~3432–3542) :
1. Le bloc "Données de calcul" → SAMB et points réels
2. Les `MOCK_AUTO_DATES` → dates calculées depuis dispositifs activés
3. Les `dateComments` hardcodés → libellés issus des fonctions

Aucune modification à l'UI existante (classes, couleurs, structure JSX).

- [ ] **Step 1 : Étendre l'import existant de `calculators` dans SimulatorIntegration.js**

À la ligne 16, remplacer :

```js
import { calculateArrco, calculateIrcantec, calculateRci } from '../../../../../utils/calculators';
```

par :

```js
import { calculateArrco, calculateIrcantec, calculateRci, computeSAMB, computeArrcoPts, computeDateLegale, computeDateTauxPlein, computeDate67, computeAutoDateFromDispositif } from '../../../../../utils/calculators';
```

- [ ] **Step 2 : Remplacer MOCK_AUTO_DATES par les dates calculées**

Localiser le bloc (ligne ~3467) :
```jsx
{activatedDispositifs.length > 0 && showAutoResults && (
  <div style={{ marginBottom: 16 }}>
    ...
    {MOCK_AUTO_DATES.map((d, i) => (
```

Remplacer la source de données `MOCK_AUTO_DATES.map(...)` par :
```jsx
{activatedDispositifs.length > 0 && showAutoResults && (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: "#00B894", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
      <span>🤖</span> Dates calculées automatiquement depuis les dispositifs activés
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {activatedDispositifs
        .map(id => computeAutoDateFromDispositif(id, user?.birth_date, trimCotState, trimAssState))
        .filter(Boolean)
        .map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: `${d.color}08`, borderLeft: `3px solid ${d.color}` }}>
            <div style={{ textAlign: "center", minWidth: 70 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: d.color }}>{d.dateStr}</div>
              <div style={{ fontSize: 12, color: "#555" }}>{d.age}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Via : {d.source}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{d.detail}</div>
            </div>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: `${d.color}18`, color: d.color, fontWeight: 700 }}>Auto</span>
          </div>
        ))}
    </div>
  </div>
)}
```

- [ ] **Step 3 : Remplacer le bloc "Données de calcul" par les vraies valeurs**

Localiser le bloc (ligne ~3449) qui contient les 4 lignes hardcodées :
```jsx
{[
  ["SAMB Assurance Retraite / CNAV", "32 586 €", "#1a1a2e"],
  ["Points ARRCO-AGIRC au 31/12/25", "28 330 pts", "#0984E3"],
  ["Projection jusqu'au départ", "+ 344 pts / an", "#00B894"],
  ["Situation jusqu'au départ", "Poursuite d'activité actuelle", "#555"],
].map(([label, val, color]) => (
```

Remplacer par :

```jsx
{(() => {
  const samb = computeSAMB(carriereRows);
  const { total: arrcoPts, projectionAnnuelle } = computeArrcoPts(carriereRows);
  const rows = [
    ["SAMB Assurance Retraite / CNAV", samb > 0 ? `${samb.toLocaleString('fr-FR')} €` : "—", "#1a1a2e"],
    ["Points ARRCO-AGIRC cumulés", arrcoPts > 0 ? `${arrcoPts.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} pts` : "—", "#0984E3"],
    ["Projection annuelle (tendance)", projectionAnnuelle > 0 ? `+ ${projectionAnnuelle.toLocaleString('fr-FR')} pts / an` : "—", "#00B894"],
    ["Situation jusqu'au départ", "Poursuite d'activité actuelle", "#555"],
  ];
  return rows.map(([label, val, color]) => (
    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #eee" }}>
      <span style={{ color: "#555" }}>{label}</span>
      <span style={{ fontWeight: 700, color, fontSize: 12 }}>{val}</span>
    </div>
  ));
})()}
```

- [ ] **Step 4 : Remplacer les dateComments hardcodés**

Localiser le bloc (ligne ~3433) :
```js
const dateComments = {
  sim_legal: "64 ans atteints le 08/07/2030 → départ le 01/08/2030",
  sim_taux_plein: "172 trim. atteints en 11/2032",
  sim_auto_67: "67 ans atteints le 08/07/2033 → départ le 01/08/2033",
  sim_date_libre: "Indiquer les dates de simulation souhaitées",
};
```

Remplacer par :

```js
const birthDate = user?.birth_date;
const trimAcquis = Object.values(trimCotState).reduce((s, v) => s + (Number(v) || 0), 0)
  + Object.values(trimAssState).reduce((s, v) => s + (Number(v) || 0), 0);
const dateLegale = computeDateLegale(birthDate);
const dateTauxPlein = computeDateTauxPlein(birthDate, trimAcquis);
const date67 = computeDate67(birthDate);

const dateComments = {
  sim_legal: dateLegale
    ? `${dateLegale.ageStr} → départ en ${dateLegale.label}`
    : "Date de naissance manquante",
  sim_taux_plein: dateTauxPlein
    ? dateTauxPlein.trimManquants === 0
      ? `${dateTauxPlein.trimRequis} trim. déjà atteints`
      : `${dateTauxPlein.trimManquants} trim. manquants → départ en ${dateTauxPlein.label}`
    : "Date de naissance manquante",
  sim_auto_67: date67
    ? `67 ans → départ en ${date67.label}`
    : "Date de naissance manquante",
  sim_date_libre: "Indiquer les dates de simulation souhaitées",
};
```

- [ ] **Step 5 : Lancer l'app et vérifier visuellement**

```bash
cd /Users/dydy2brazil/stage/frontmoneynci
npm start
```

Naviguer sur un client avec une date de naissance renseignée → onglet Simulateur → étape "Dates & Simulations". Vérifier :
- ✅ Le SAMB affiche une valeur réelle (ou "—" si aucun salaire saisi)
- ✅ Les points ARRCO affichent le total réel
- ✅ La date légale correspond à la génération du client
- ✅ La date taux plein indique les trimestres manquants
- ✅ La date 67 ans est correcte
- ✅ Si RACL ou Retraite progressive sont activés, leurs dates apparaissent en auto-dates

- [ ] **Step 6 : Commit**

```bash
cd /Users/dydy2brazil/stage/frontmoneynci
git add src/views/apps/user/edit/notes/SimulatorIntegration.js
git commit -m "feat(simulator): wire real calculations in Dates & Simulations panel

Replace hardcoded mock data with computed values from career state:
SAMB from 25 best revalued years, ARRCO total points, departure dates
from birth date using post-2023 reform table."
```
