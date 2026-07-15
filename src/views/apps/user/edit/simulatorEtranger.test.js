import { PAYS_ETRANGER, isValidPays } from "./simulatorEtranger";

describe("PAYS_ETRANGER", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(PAYS_ETRANGER)).toBe(true);
    expect(PAYS_ETRANGER.length).toBeGreaterThan(0);
    PAYS_ETRANGER.forEach((p) => expect(typeof p).toBe("string"));
  });

  it("contains expected sample countries", () => {
    expect(PAYS_ETRANGER).toContain("Suisse");
    expect(PAYS_ETRANGER).toContain("Belgique");
    expect(PAYS_ETRANGER).toContain("Royaume-Uni");
  });

  it("has no duplicates", () => {
    expect(new Set(PAYS_ETRANGER).size).toBe(PAYS_ETRANGER.length);
  });

  it("is sorted alphabetically (fr locale)", () => {
    const sorted = [...PAYS_ETRANGER].sort((a, b) => a.localeCompare(b, "fr"));
    expect(PAYS_ETRANGER).toEqual(sorted);
  });
});

describe("isValidPays", () => {
  it("accepts a known country", () => {
    expect(isValidPays("Suisse")).toBe(true);
  });
  it("rejects an unknown or empty value", () => {
    expect(isValidPays("Atlantide")).toBe(false);
    expect(isValidPays("")).toBe(false);
    expect(isValidPays(null)).toBe(false);
    expect(isValidPays(undefined)).toBe(false);
  });
});
