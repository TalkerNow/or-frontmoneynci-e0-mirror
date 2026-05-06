import { normalize, resolveRegime, REGIMES } from "./simulatorRegimes";

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
