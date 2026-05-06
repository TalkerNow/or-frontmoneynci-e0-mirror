import { normalize, resolveRegime, REGIMES, getPoints, setPoints, migrateRowShape, buildLegacyMirror } from "./simulatorRegimes";

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
});
