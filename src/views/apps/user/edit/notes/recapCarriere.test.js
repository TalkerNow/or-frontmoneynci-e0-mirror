import { buildRecapRegimes, buildCipavRecap } from "./recapCarriere";

// Helper : ligne carrière minimale (défaut tout à 0).
const row = (yr, over = {}) => ({
  yr,
  sal: 0,
  trim: 0,
  ar: 0,
  agircPts: 0,
  ircPts: 0,
  rciPts: 0,
  regimes: {},
  ...over,
});

const byCode = (recaps, code) => recaps.find((r) => r.code === code);

describe("buildRecapRegimes", () => {
  it("retourne [] pour une entrée vide ou nullish", () => {
    expect(buildRecapRegimes([])).toEqual([]);
    expect(buildRecapRegimes(null)).toEqual([]);
    expect(buildRecapRegimes(undefined)).toEqual([]);
  });

  it("retourne [] quand toutes les lignes sont à 0", () => {
    expect(buildRecapRegimes([row(2020), row(2021)])).toEqual([]);
  });

  it("CNAV seul : cotisés / assimilés / AR / total corrects", () => {
    const rows = [
      row(2018, { sal: 36900 }),
      row(2019, { sal: 0 }), // année assimilée pure
      row(2020, { sal: 38400 }),
    ];
    const trim = {
      trimCot: { 2018: 4, 2020: 4 },
      trimAss: { 2019: 4 },
      ar: { 2020: 1 },
    };
    const recaps = buildRecapRegimes(rows, trim);
    expect(recaps).toHaveLength(1);
    const cnav = byCode(recaps, "CNAV");
    expect(cnav.unit).toBe("trimestres");
    // 2020 : 4 cot + 0 ass + 1 AR = 5 → plafonné à 4
    expect(cnav.totals).toEqual({ cotises: 8, assimiles: 4, ar: 1, total: 12 });
    expect(cnav.agrege).toBe(false);
    expect(cnav.rows).toEqual([
      { annee: 2018, revenu: 36900, cotises: 4, assimiles: 0, ar: 0, total: 4 },
      { annee: 2019, revenu: 0, cotises: 0, assimiles: 4, ar: 0, total: 4 },
      { annee: 2020, revenu: 38400, cotises: 4, assimiles: 0, ar: 1, total: 4 },
    ]);
  });

  it("CNAV inclut une année à AR seul (revenu et cotisés à 0)", () => {
    const cnav = byCode(
      buildRecapRegimes([row(2019)], { ar: { 2019: 4 } }),
      "CNAV"
    );
    expect(cnav.rows).toEqual([
      { annee: 2019, revenu: 0, cotises: 0, assimiles: 0, ar: 4, total: 4 },
    ]);
    expect(cnav.totals.ar).toBe(4);
  });

  it("CNAV : total annuel plafonné à 4 trimestres", () => {
    const cnav = byCode(
      buildRecapRegimes([row(2020, { sal: 30000 })], {
        trimCot: { 2020: 3 },
        trimAss: { 2020: 2 },
        ar: { 2020: 2 },
      }),
      "CNAV"
    );
    expect(cnav.rows[0].total).toBe(4); // 3+2+2=7 → min(4,7)
    expect(cnav.totals).toEqual({ cotises: 3, assimiles: 2, ar: 2, total: 4 });
  });

  it("CNAV : une année sans revenu ni trimestre est ignorée", () => {
    const recaps = buildRecapRegimes([row(2020, { sal: 30000 }), row(2019)], {
      trimCot: { 2020: 4 },
    });
    expect(byCode(recaps, "CNAV").rows.map((r) => r.annee)).toEqual([2020]);
  });

  it("AGIRC-ARRCO ventilé : lignes par année + total, agrege=false", () => {
    const recaps = buildRecapRegimes([
      row(2020, { regimes: { AGIRC_ARRCO: 182.4 } }),
      row(2021, { regimes: { AGIRC_ARRCO: 189.1 } }),
      row(2022, { regimes: { AGIRC_ARRCO: 194.7 } }),
    ]);
    const agirc = byCode(recaps, "AGIRC_ARRCO");
    expect(agirc.unit).toBe("points");
    expect(agirc.rows).toHaveLength(3);
    expect(agirc.totals.points).toBeCloseTo(566.2, 5);
    expect(agirc.agrege).toBe(false);
  });

  it("RCI agrégé : une seule ligne == total → agrege=true", () => {
    const rci = byCode(
      buildRecapRegimes([row(2026, { rciPts: 1204, regimes: { RCI: 1204 } })]),
      "RCI"
    );
    expect(rci.agrege).toBe(true);
    expect(rci.rows).toEqual([{ annee: 2026, points: 1204 }]);
    expect(rci.totals.points).toBe(1204);
  });

  it("lit le miroir legacy (rciPts) quand regimes[KEY] absent", () => {
    const rci = byCode(buildRecapRegimes([row(2015, { rciPts: 300 })]), "RCI");
    expect(rci.totals.points).toBe(300);
  });

  it("regimes[KEY] prime sur le miroir legacy", () => {
    const irc = byCode(
      buildRecapRegimes([row(2010, { ircPts: 5, regimes: { IRCANTEC: 120 } })]),
      "IRCANTEC"
    );
    expect(irc.totals.points).toBe(120);
  });

  it("exclut les régimes sans donnée", () => {
    const recaps = buildRecapRegimes([row(2020, { sal: 30000, trim: 4 })]);
    expect(recaps.map((r) => r.code)).toEqual(["CNAV"]);
  });

  it("respecte l'ordre CNAV → AGIRC-ARRCO → IRCANTEC → RCI", () => {
    const recaps = buildRecapRegimes([
      row(2020, {
        sal: 30000,
        trim: 4,
        regimes: { RCI: 50, IRCANTEC: 60, AGIRC_ARRCO: 70 },
      }),
    ]);
    expect(recaps.map((r) => r.code)).toEqual([
      "CNAV",
      "AGIRC_ARRCO",
      "IRCANTEC",
      "RCI",
    ]);
  });

  it("trie les lignes par année croissante", () => {
    const agirc = byCode(
      buildRecapRegimes([
        row(2022, { regimes: { AGIRC_ARRCO: 10 } }),
        row(2019, { regimes: { AGIRC_ARRCO: 20 } }),
        row(2021, { regimes: { AGIRC_ARRCO: 30 } }),
      ]),
      "AGIRC_ARRCO"
    );
    expect(agirc.rows.map((r) => r.annee)).toEqual([2019, 2021, 2022]);
  });

  it("buildCipavRecap : null si vide / nullish", () => {
    expect(buildCipavRecap(null)).toBeNull();
    expect(buildCipavRecap({})).toBeNull();
    expect(buildCipavRecap({ 2020: { points: "", pointsCompl: "" } })).toBeNull();
  });

  it("buildCipavRecap : somme base + complémentaire", () => {
    const r = buildCipavRecap({
      2020: { points: "100", pointsCompl: "30" },
      2021: { points: "50", pointsCompl: "20" },
    });
    expect(r.code).toBe("CIPAV");
    expect(r.totals).toEqual({ base: 150, compl: 50, points: 200 });
    expect(r.label).toBeTruthy();
  });

  it("attache label/icon/color depuis le registre REGIMES", () => {
    const cnav = byCode(
      buildRecapRegimes([row(2020, { sal: 30000 })], { trimCot: { 2020: 4 } }),
      "CNAV"
    );
    expect(cnav.label).toBe("CNAV");
    expect(cnav.icon).toBeTruthy();
    expect(cnav.color).toMatch(/^#/);
  });
});
