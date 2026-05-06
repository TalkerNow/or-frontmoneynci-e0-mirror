import { normalize } from "./simulatorRegimes";

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
