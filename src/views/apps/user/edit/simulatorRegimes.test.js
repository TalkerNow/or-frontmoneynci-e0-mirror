import { normalize, resolveRegime, REGIMES, getPoints, setPoints, migrateRowShape, buildLegacyMirror, computeVisibleRegimes, REGIMES_SIMPLES, extractRegimeSimplePoints } from "./simulatorRegimes";

describe("normalize", () => {
  it("returns empty string for nullish input", () => {
    expect(normalize(null)).toBe("");
    expect(normalize(undefined)).toBe("");
    expect(normalize("")).toBe("");
  });

  it("lowercases", () => {
    expect(normalize("CARPIMKO")).toBe("carpimko");
    expect(normalize("Agirc-Arrco")).toBe("agircarrco");
  });

  it("strips accents", () => {
    expect(normalize("Complémentaire")).toBe("complementaire");
    expect(normalize("Régime général")).toBe("regimegeneral");
  });

  it("strips spaces, hyphens, underscores", () => {
    expect(normalize("AGIRC ARRCO")).toBe("agircarrco");
    expect(normalize("AGIRC-ARRCO")).toBe("agircarrco");
    expect(normalize("agirc_arrco")).toBe("agircarrco");
    expect(normalize("Assurance Retraite")).toBe("assuranceretraite");
  });

  it("collapses snake_case and human-readable into the same key", () => {
    expect(normalize("agirc_arrco")).toBe(normalize("Agirc-Arrco"));
    expect(normalize("cipav_base")).toBe(normalize("CIPAV Base"));
  });
});

describe("REGIMES registry", () => {
  it("contains the 5 currently-supported régimes with hasCalcEngine true", () => {
    const supported = REGIMES.filter((r) => r.hasCalcEngine).map((r) => r.key);
    expect(supported).toEqual(
      expect.arrayContaining(["CNAV", "AGIRC_ARRCO", "IRCANTEC", "RCI", "CIPAV"])
    );
  });

  it("contains CARPIMKO and its sub-régimes", () => {
    const keys = REGIMES.map((r) => r.key);
    expect(keys).toEqual(
      expect.arrayContaining(["CARPIMKO", "CARPIMKO_ASV", "CARPIMKO_COMPL"])
    );
  });

  it("has unique keys", () => {
    const keys = REGIMES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("resolveRegime", () => {
  it("matches the human-readable n8n form", () => {
    expect(resolveRegime("Agirc-Arrco").key).toBe("AGIRC_ARRCO");
    expect(resolveRegime("Assurance Retraite").key).toBe("CNAV");
    expect(resolveRegime("Ircantec").key).toBe("IRCANTEC");
  });

  it("matches the snake_case synthese form", () => {
    expect(resolveRegime("agirc_arrco").key).toBe("AGIRC_ARRCO");
    expect(resolveRegime("assurance_retraite").key).toBe("CNAV");
  });

  it("matches the SHOUT_CASE form", () => {
    expect(resolveRegime("CARPIMKO").key).toBe("CARPIMKO");
    expect(resolveRegime("CARPIMKO ASV").key).toBe("CARPIMKO_ASV");
    expect(resolveRegime("CARPIMKO Complémentaire").key).toBe("CARPIMKO_COMPL");
  });

  it("returns null for empty/whitespace input", () => {
    expect(resolveRegime("")).toBeNull();
    expect(resolveRegime(null)).toBeNull();
    expect(resolveRegime("   ")).toBeNull();
  });

  it("returns a synthesized entry with isUnknown=true for an unmatched string", () => {
    const result = resolveRegime("Caisse Inconnue XYZ");
    expect(result.isUnknown).toBe(true);
    expect(result.key).toBe("Caisse Inconnue XYZ");
    expect(result.label).toBe("Caisse Inconnue XYZ");
    expect(result.hasCalcEngine).toBe(false);
    expect(result.color).toBe("#9CA3AF");
  });

  it("normalizes during matching (case + separators)", () => {
    expect(resolveRegime("agirc-arrco").key).toBe("AGIRC_ARRCO");
    expect(resolveRegime("AGIRC ARRCO").key).toBe("AGIRC_ARRCO");
    expect(resolveRegime("Agirc Arrco").key).toBe("AGIRC_ARRCO");
  });

  it("recognizes RAFP (retraite additionnelle fonction publique) as a known régime", () => {
    // RIS fonction publique (ex. LADARRE 1700) : RAFP doit être un vrai régime,
    // pas un "inconnu" passthrough — sinon pas de colonne dédiée ni de label propre.
    const byCode = resolveRegime("RAFP");
    expect(byCode.key).toBe("RAFP");
    expect(byCode.isUnknown).toBeFalsy();
    expect(resolveRegime("Retraite additionnelle de la fonction publique").key).toBe("RAFP");
  });
});

describe("getPoints", () => {
  it("returns null when row has no regimes map", () => {
    expect(getPoints({ year: 2020 }, "AGIRC_ARRCO")).toBeNull();
  });

  it("returns null when key not present", () => {
    expect(getPoints({ year: 2020, regimes: {} }, "CARPIMKO")).toBeNull();
  });

  it("returns the value when present", () => {
    expect(getPoints({ year: 2020, regimes: { AGIRC_ARRCO: 12.5 } }, "AGIRC_ARRCO")).toBe(12.5);
  });

  it("returns 0 (not null) when value is 0", () => {
    expect(getPoints({ regimes: { AGIRC_ARRCO: 0 } }, "AGIRC_ARRCO")).toBe(0);
  });
});

describe("setPoints", () => {
  it("returns a new row with the value set", () => {
    const row = { year: 2020, regimes: {} };
    const result = setPoints(row, "CARPIMKO", 530.3);
    expect(result.regimes.CARPIMKO).toBe(530.3);
    expect(result).not.toBe(row);
    expect(result.regimes).not.toBe(row.regimes);
  });

  it("creates the regimes map if missing", () => {
    const row = { year: 2020 };
    const result = setPoints(row, "AGIRC_ARRCO", 12);
    expect(result.regimes.AGIRC_ARRCO).toBe(12);
  });

  it("preserves other régime values", () => {
    const row = { regimes: { AGIRC_ARRCO: 12, IRCANTEC: 5 } };
    const result = setPoints(row, "CARPIMKO", 530);
    expect(result.regimes).toEqual({ AGIRC_ARRCO: 12, IRCANTEC: 5, CARPIMKO: 530 });
  });

  it("does not mutate the original row", () => {
    const row = { regimes: { AGIRC_ARRCO: 12 } };
    setPoints(row, "AGIRC_ARRCO", 99);
    expect(row.regimes.AGIRC_ARRCO).toBe(12);
  });

  it("overwrites an existing value at the same key", () => {
    const row = { regimes: { AGIRC_ARRCO: 12 } };
    const result = setPoints(row, "AGIRC_ARRCO", 99);
    expect(result.regimes.AGIRC_ARRCO).toBe(99);
    expect(row.regimes.AGIRC_ARRCO).toBe(12); // original unchanged
  });
});

describe("migrateRowShape", () => {
  it("returns the row unchanged if regimes map is already present", () => {
    const row = { year: 2020, regimes: { AGIRC_ARRCO: 12 }, agircPts: 99 };
    expect(migrateRowShape(row)).toBe(row);
  });

  it("moves agircPts/ircPts/rciPts into regimes map", () => {
    const row = { year: 2020, trim: 4, agircPts: 12, ircPts: 5, rciPts: 3 };
    expect(migrateRowShape(row)).toEqual({
      year: 2020,
      trim: 4,
      regimes: { AGIRC_ARRCO: 12, IRCANTEC: 5, RCI: 3 },
    });
  });

  it("omits null/undefined legacy fields", () => {
    const row = { year: 2020, agircPts: 12, ircPts: null };
    const result = migrateRowShape(row);
    expect(result.regimes).toEqual({ AGIRC_ARRCO: 12 });
  });

  it("preserves all other fields", () => {
    const row = { year: 2020, salaire: 30000, agircPts: 12, custom: "x" };
    const result = migrateRowShape(row);
    expect(result.salaire).toBe(30000);
    expect(result.custom).toBe("x");
    expect(result.year).toBe(2020);
  });

  it("handles a row with no legacy fields at all", () => {
    expect(migrateRowShape({ year: 2020, trim: 4 })).toEqual({
      year: 2020, trim: 4, regimes: {},
    });
  });
});

describe("buildLegacyMirror", () => {
  it("mirrors AGIRC_ARRCO/IRCANTEC/RCI to legacy field names", () => {
    const row = { year: 2020, trim: 4, regimes: { AGIRC_ARRCO: 12, IRCANTEC: 5, RCI: 3 } };
    expect(buildLegacyMirror(row)).toEqual({
      year: 2020,
      trim: 4,
      regimes: { AGIRC_ARRCO: 12, IRCANTEC: 5, RCI: 3 },
      agircPts: 12,
      ircPts: 5,
      rciPts: 3,
    });
  });

  it("writes null for legacy fields when the new key is absent", () => {
    const row = { year: 2020, regimes: { AGIRC_ARRCO: 12 } };
    const result = buildLegacyMirror(row);
    expect(result.agircPts).toBe(12);
    expect(result.ircPts).toBeNull();
    expect(result.rciPts).toBeNull();
  });

  it("ignores non-mirrored régime keys (CARPIMKO etc.)", () => {
    const row = { regimes: { CARPIMKO: 530.3, AGIRC_ARRCO: 12 } };
    const result = buildLegacyMirror(row);
    expect(result.agircPts).toBe(12);
    expect(result.regimes.CARPIMKO).toBe(530.3);
    expect(result).not.toHaveProperty("carpimkoPts");
  });

  it("does not mutate the input row", () => {
    const row = { regimes: { AGIRC_ARRCO: 12 } };
    buildLegacyMirror(row);
    expect(row).toEqual({ regimes: { AGIRC_ARRCO: 12 } });
  });

  it("returns null/undefined unchanged for nullish input", () => {
    expect(buildLegacyMirror(null)).toBeNull();
    expect(buildLegacyMirror(undefined)).toBeUndefined();
  });
});

const DEFAULTS = ["CNAV", "AGIRC_ARRCO", "IRCANTEC", "RCI", "CIPAV"];

describe("computeVisibleRegimes", () => {
  it("returns the default 5 régimes when no rows have data", () => {
    const result = computeVisibleRegimes([], DEFAULTS);
    const keys = result.map((r) => r.key);
    expect(keys).toEqual(DEFAULTS);
  });

  it("preserves default order", () => {
    const rows = [{ regimes: { IRCANTEC: 5 } }];
    const keys = computeVisibleRegimes(rows, DEFAULTS).map((r) => r.key);
    expect(keys.slice(0, 5)).toEqual(DEFAULTS);
  });

  it("appends new régimes from row data after the defaults", () => {
    const rows = [{ regimes: { CARPIMKO: 530.3, "Caisse XYZ": 7 } }];
    const keys = computeVisibleRegimes(rows, DEFAULTS).map((r) => r.key);
    expect(keys).toEqual([...DEFAULTS, "CARPIMKO", "Caisse XYZ"]);
  });

  it("ignores keys whose values are 0 or null in every row", () => {
    const rows = [
      { regimes: { CARPIMKO: 0 } },
      { regimes: { CARPIMKO: null } },
    ];
    const keys = computeVisibleRegimes(rows, DEFAULTS).map((r) => r.key);
    expect(keys).toEqual(DEFAULTS);
  });

  it("includes a non-default régime if at least one row has a non-zero value", () => {
    const rows = [
      { regimes: { CARPIMKO: 0 } },
      { regimes: { CARPIMKO: 530.3 } },
    ];
    const keys = computeVisibleRegimes(rows, DEFAULTS).map((r) => r.key);
    expect(keys).toContain("CARPIMKO");
  });

  it("returns resolved registry entries (with color/icon/hasCalcEngine)", () => {
    const result = computeVisibleRegimes([], DEFAULTS);
    const cnav = result.find((r) => r.key === "CNAV");
    expect(cnav.hasCalcEngine).toBe(true);
    expect(cnav.color).toBeDefined();
  });

  it("flags unknown régimes with isUnknown=true", () => {
    const rows = [{ regimes: { "Caisse Mystère": 7 } }];
    const result = computeVisibleRegimes(rows, DEFAULTS);
    const mystery = result.find((r) => r.key === "Caisse Mystère");
    expect(mystery.isUnknown).toBe(true);
  });
});

describe("RAFP — câblage Tier-1 (apparition conditionnelle)", () => {
  it("is registered in REGIMES_SIMPLES with a single points pilier", () => {
    expect(REGIMES_SIMPLES.RAFP).toBeDefined();
    expect(REGIMES_SIMPLES.RAFP.piliers).toHaveLength(1);
    expect(REGIMES_SIMPLES.RAFP.piliers[0].key).toBe("base");
    expect(REGIMES_SIMPLES.RAFP.piliers[0].aliases).toContain("RAFP");
  });

  it("has hasCalcEngine=true in the REGIMES registry", () => {
    expect(resolveRegime("RAFP").hasCalcEngine).toBe(true);
  });

  it("extracts RAFP points from carriere[].regimes across years", () => {
    const carriere = [
      { annee: 2020, regimes: { RAFP: 250.5, CNAV: 999 } },
      { annee: 2021, regimes: { RAFP: 300 } },
      { annee: 2022, regimes: {} },
    ];
    expect(extractRegimeSimplePoints(carriere, "RAFP")).toEqual({ base: 550.5 });
  });

  it("extracts nothing when no RAFP data (conditional display stays hidden)", () => {
    const carriere = [{ annee: 2020, regimes: { CNAV: 100 } }];
    expect(extractRegimeSimplePoints(carriere, "RAFP")).toEqual({});
  });
});

describe("SRE — durée seulement, jamais dans le pipeline calcul", () => {
  it("stays OUT of REGIMES_SIMPLES (no generic calc dispatch)", () => {
    // SRE n'est pas un régime à points : pension statutaire (traitement indiciaire)
    // non calculable ici. L'inscrire dans REGIMES_SIMPLES déclencherait un appel
    // executeScript('SRE') vers un calculateur inexistant.
    expect(REGIMES_SIMPLES.SRE).toBeUndefined();
  });

  it("remains a known régime without calc engine", () => {
    const sre = resolveRegime("SRE");
    expect(sre.key).toBe("SRE");
    expect(sre.isUnknown).toBeFalsy();
    expect(sre.hasCalcEngine).toBe(false);
  });
});
