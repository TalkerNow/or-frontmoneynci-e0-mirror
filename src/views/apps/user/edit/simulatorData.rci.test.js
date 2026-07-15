import { rciPrixAchat, rciTauxDisplay } from "./simulatorData";
import { calculateRci } from "../../../../utils/calculators";

// Verrouille les valeurs d'achat du point RCI (salaire de référence) contre
// les valeurs officielles SSI. Une valeur d'achat fausse => points faux =>
// pension RCI fausse sur toute la projection.
describe("rciPrixAchat — valeurs officielles", () => {
  test("2024 = 20,734 €", () => {
    expect(rciPrixAchat[2024]).toBe(20.734);
  });

  test("2025 = 21,532 €", () => {
    expect(rciPrixAchat[2025]).toBe(21.532);
  });

  test("2026 = 21,726 €", () => {
    expect(rciPrixAchat[2026]).toBe(21.726);
  });

  test("la chaîne d'affichage 2026 correspond à la table", () => {
    // ref est affiché tel quel dans la grille RCI — il doit refléter rciPrixAchat
    expect(rciTauxDisplay[2026].ref).toBe("21,726 €");
  });

  test("cohérence table/affichage sur les années récentes", () => {
    [2020, 2021, 2022, 2023, 2024, 2025, 2026].forEach((yr) => {
      const fromRef = parseFloat(rciTauxDisplay[yr].ref.replace(",", ".").replace("€", "").trim());
      expect(fromRef).toBeCloseTo(rciPrixAchat[yr], 3);
    });
  });
});

describe("calculateRci — points dérivés du prix d'achat", () => {
  test("2026: cotisation T1 (7% jusqu'à 1 PASS) / prix d'achat", () => {
    // PASS 2026 = 48060 ; salaire sous plafond => points = (salaire × 7%) / 21,726
    const salaire = 40000;
    const res = calculateRci(2026, salaire);
    expect(res).not.toBeNull();
    const attendu = (salaire * 0.07) / 21.726;
    expect(res.total).toBeCloseTo(attendu, 4);
  });
});
