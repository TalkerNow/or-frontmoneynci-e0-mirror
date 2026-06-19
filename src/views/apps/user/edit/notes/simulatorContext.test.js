import { buildSimulatorContext, computeAge } from "./simulatorContext";

const baseState = {
  user: { name: "Jean Dupont", birth_date: "1962-04-10" },
  carriereRows: [
    { trimestres_cotises: 4, trimestres_assimiles: 1, agircPts: 120.5 },
    { trimestres_cotises: 4, trimestres_assimiles: 0, agircPts: 80 },
  ],
  carriereValidee: true,
  chosenScenarios: ["racl"],
  chosenDates: ["2025-09-01"],
  scenarioSkillResults: { cnav: { montant: 1200 } },
};

describe("computeAge", () => {
  test("computes age from birth date", () => {
    expect(computeAge("1962-04-10", new Date("2026-06-18"))).toBe(64);
  });
  test("null for missing/garbage", () => {
    expect(computeAge(null)).toBeNull();
    expect(computeAge("not-a-date")).toBeNull();
  });
});

describe("buildSimulatorContext", () => {
  test("maps profile and sums career totals", () => {
    const ctx = buildSimulatorContext(baseState);
    expect(ctx.profil.nom).toBe("Jean Dupont");
    expect(ctx.profil.date_naissance).toBe("1962-04-10");
    expect(ctx.carriere.trimestres_cotises).toBe(8);
    expect(ctx.carriere.trimestres_assimiles).toBe(1);
    expect(ctx.carriere.points_agirc_arrco).toBe(200.5);
    expect(ctx.carriere.carriere_validee).toBe(true);
    expect(ctx.scenarios.scenarios_choisis).toEqual(["racl"]);
    expect(ctx.scenarios.dates_cles).toEqual(["2025-09-01"]);
    expect(ctx.regimes).toEqual({ cnav: { montant: 1200 } });
    expect(ctx.champs_manquants).toEqual([]);
  });

  test("handles empty / null state without crashing", () => {
    const ctx = buildSimulatorContext({});
    expect(ctx.profil.nom).toBeNull();
    expect(ctx.profil.date_naissance).toBeNull();
    expect(ctx.profil.age).toBeNull();
    expect(ctx.carriere.trimestres_cotises).toBe(0);
    expect(ctx.carriere.carriere_validee).toBe(false);
    expect(ctx.regimes).toBeNull();
  });

  test("lists missing fields", () => {
    const ctx = buildSimulatorContext({
      user: {}, carriereRows: [], chosenScenarios: [], chosenDates: [],
    });
    expect(ctx.champs_manquants).toContain("date de naissance");
    expect(ctx.champs_manquants).toContain("données de carrière");
    expect(ctx.champs_manquants).toContain("au moins un scénario à activer");
    expect(ctx.champs_manquants).toContain("une date de départ");
  });
});
