import {
  buildSimulatorContext,
  buildCarriereResume,
  computeAge,
  ORCHESTRATION_CONSIGNE,
} from "./simulatorContext";

const baseState = {
  user: {
    name: "Jean Dupont",
    first_name: "Jean",
    last_name: "Dupont",
    birth_date: "1962-04-10",
    secu_social: "1620456789012",
    sexe: "M",
  },
  carriereRows: [
    { yr: 1985, trimestres_cotises: 4, trimestres_assimiles: 1, agircPts: 120.5, sal: 20000, ss: 20000 },
    { yr: 1986, trimestres_cotises: 0, trimestres_assimiles: 0, agircPts: 0, sal: 0, ss: 0 },
    { yr: 1987, trimestres_cotises: 4, trimestres_assimiles: 0, agircPts: 80, sal: 22000, ss: 22000 },
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

describe("buildCarriereResume", () => {
  test("summarizes span, activity and points", () => {
    const r = buildCarriereResume(baseState.carriereRows, true);
    expect(r.nb_lignes).toBe(3);
    expect(r.annee_debut).toBe(1985);
    expect(r.annee_fin).toBe(1987);
    expect(r.annees_avec_activite).toBe(2);
    expect(r.annees_sans_activite_dans_plage).toBe(1);
    expect(r.echantillon_annees_sans_activite).toContain(1986);
    expect(r.trimestres_cotises).toBe(8);
    expect(r.trimestres_assimiles).toBe(1);
    expect(r.trimestres_total).toBe(9);
    expect(r.points_agirc_arrco).toBe(200.5);
    expect(r.carriere_validee).toBe(true);
  });
});

describe("buildSimulatorContext", () => {
  test("maps profile and sums career totals", () => {
    const ctx = buildSimulatorContext(baseState);
    expect(ctx.profil.nom).toBe("Jean Dupont");
    expect(ctx.profil.prenom).toBe("Jean");
    expect(ctx.profil.nir).toBe("1620456789012");
    expect(ctx.profil.date_naissance).toBe("1962-04-10");
    expect(ctx.carriere.trimestres_cotises).toBe(8);
    expect(ctx.carriere.trimestres_assimiles).toBe(1);
    expect(ctx.carriere.points_agirc_arrco).toBe(200.5);
    expect(ctx.carriere.carriere_validee).toBe(true);
    expect(ctx.carriere.resume.annee_debut).toBe(1985);
    expect(ctx.scenarios.scenarios_choisis).toEqual(["racl"]);
    expect(ctx.scenarios.dates_cles).toEqual(["2025-09-01"]);
    expect(ctx.regimes).toEqual({ cnav: { montant: 1200 } });
    expect(ctx.champs_manquants).toEqual([]);
    expect(ctx.priorite_reponse).toBe("profil_dossier");
  });

  test("embeds lecture-consigne orchestration and calc forbid", () => {
    const ctx = buildSimulatorContext(baseState);
    expect(ctx.consigne).toBe(ORCHESTRATION_CONSIGNE);
    expect(ctx.consigne).toMatch(/lecture-consigne/i);
    expect(ctx.consigne).toMatch(/script-execute/i);
    expect(ctx.consigne).toMatch(/production-validated-calculate/i);
    expect(ctx.orchestration.mode).toBe("lecture-consigne");
    expect(ctx.orchestration.interdits).toContain("calculators.js");
    expect(ctx.orchestration.interdits).toContain("admin-chat/apply");
  });

  test("handles empty / null state without crashing", () => {
    const ctx = buildSimulatorContext({});
    expect(ctx.profil.nom).toBeNull();
    expect(ctx.profil.date_naissance).toBeNull();
    expect(ctx.profil.age).toBeNull();
    expect(ctx.carriere.trimestres_cotises).toBe(0);
    expect(ctx.carriere.carriere_validee).toBe(false);
    expect(ctx.carriere.resume.nb_lignes).toBe(0);
    expect(ctx.regimes).toBeNull();
    expect(ctx.admin_lecture.system_prompt).toBeNull();
  });

  test("lists missing fields including NIR and validation", () => {
    const ctx = buildSimulatorContext({
      user: {},
      carriereRows: [{ yr: 2000, sal: 1000, ss: 1000, trimestres_cotises: 4 }],
      carriereValidee: false,
      chosenScenarios: [],
      chosenDates: [],
    });
    expect(ctx.champs_manquants).toContain("date de naissance");
    expect(ctx.champs_manquants).toContain("NIR / numéro de sécurité sociale");
    expect(ctx.champs_manquants).toContain("identité (prénom / nom)");
    expect(ctx.champs_manquants).toContain("validation carrière (non validée)");
    expect(ctx.champs_manquants).toContain("au moins un scénario à activer");
    expect(ctx.champs_manquants).toContain("une date de départ");
  });

  test("lists empty career as manque", () => {
    const ctx = buildSimulatorContext({
      user: {}, carriereRows: [], chosenScenarios: [], chosenDates: [],
    });
    expect(ctx.champs_manquants).toContain("données de carrière");
  });

  test("passes through optional GET-only admin lecture refs", () => {
    const ctx = buildSimulatorContext({
      ...baseState,
      systemPromptMeta: { id: 4, name: "EOR SystemPrompt", excerpt: "…", updated_at: "2026-09-01" },
      promptsCatalogue: [{ id: 1, name: "Prompt A" }],
      departureRules: { ageLegalLabel: "64 ans", trimRequis: 172, source: "api" },
      registryMeta: { rules_count: 3, prompt_id: 9 },
    });
    expect(ctx.admin_lecture.system_prompt.id).toBe(4);
    expect(ctx.admin_lecture.prompts_catalogue).toHaveLength(1);
    expect(ctx.admin_lecture.departure_rules.trimRequis).toBe(172);
    expect(ctx.admin_lecture.registry.rules_count).toBe(3);
  });
});
