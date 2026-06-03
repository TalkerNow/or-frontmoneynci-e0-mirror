import { parseCarrierePoints } from "./carrierePoints";

/**
 * Bug COCHIN (client 1698) : l'extraction n8n renvoie les points par année sous
 * forme d'OBJET ({ agirc_arrco, cipav_base, cipav_complementaire, ... }), mais
 * l'ingestion front attendait un TABLEAU ([{ regime, valeur }]) → tous les points
 * étaient sautés (Array.isArray(objet) === false), d'où "points AGIRC non insérés"
 * et les "trous" sur les années à revenu 0 (2012-2016) qui n'avaient plus rien à
 * afficher. parseCarrierePoints doit accepter les DEUX formes.
 */
describe("parseCarrierePoints", () => {
  // Sous-ensemble réel du JSON COCHIN (forme OBJET renvoyée par n8n)
  const cochinObjectShape = [
    { annee: 1986, revenu: 0, points: {} }, // service national, aucun point
    { annee: 1988, revenu: 170112, points: { agirc_arrco: 168.02 } },
    { annee: 2009, revenu: 42829, points: { agirc_arrco: 241.79, cipav_base: 45.8, cipav_complementaire: 10 } },
    { annee: 2012, revenu: 0, points: { agirc_arrco: 507.03, cipav_base: 0, cipav_complementaire: 0 } },
    { annee: 2015, revenu: 0, points: { agirc_arrco: 624.08 } },
    { annee: 2016, revenu: 0, points: { agirc_arrco: 625.23 } },
  ];

  it("reads per-year AGIRC points from the n8n OBJECT shape, incl. revenu=0 years", () => {
    const { regimePtsByYear } = parseCarrierePoints(cochinObjectShape);
    expect(regimePtsByYear[1988].AGIRC_ARRCO).toBe(168.02);
    // the regression: these revenu=0 years used to be dropped → now their AGIRC points survive
    expect(regimePtsByYear[2012].AGIRC_ARRCO).toBe(507.03);
    expect(regimePtsByYear[2015].AGIRC_ARRCO).toBe(624.08);
    expect(regimePtsByYear[2016].AGIRC_ARRCO).toBe(625.23);
  });

  it("splits CIPAV base vs complémentaire and ignores zero values", () => {
    const { cipavBaseN, cipavComplN, regimePtsByYear } = parseCarrierePoints(cochinObjectShape);
    expect(cipavBaseN[2009]).toBe(45.8);
    expect(cipavComplN[2009]).toBe(10);
    // 2012 cipav values are 0 → must not appear
    expect(cipavBaseN[2012]).toBeUndefined();
    expect(cipavComplN[2012]).toBeUndefined();
    // CIPAV must not leak into the régime points map
    expect(regimePtsByYear[2009].CIPAV).toBeUndefined();
  });

  it("excludes years with no points", () => {
    const { regimePtsByYear, cipavBaseN, cipavComplN } = parseCarrierePoints(cochinObjectShape);
    expect(regimePtsByYear[1986]).toBeUndefined();
    expect(cipavBaseN[1986]).toBeUndefined();
    expect(cipavComplN[1986]).toBeUndefined();
  });

  it("still supports the legacy ARRAY shape [{ regime, valeur }]", () => {
    const arrayShape = [
      { annee: 2020, points: [{ regime: "AGIRC_ARRCO", valeur: 661.67 }, { regime: "IRCANTEC", valeur: 5 }] },
      { annee: 2021, points: [{ regime: "Agirc-Arrco", valeur: 12.5 }] },
    ];
    const { regimePtsByYear } = parseCarrierePoints(arrayShape);
    expect(regimePtsByYear[2020].AGIRC_ARRCO).toBe(661.67);
    expect(regimePtsByYear[2020].IRCANTEC).toBe(5);
    expect(regimePtsByYear[2021].AGIRC_ARRCO).toBe(12.5);
  });

  it("does not crash on missing/null/garbage input", () => {
    expect(parseCarrierePoints(null)).toEqual({ cipavBaseN: {}, cipavComplN: {}, regimePtsByYear: {} });
    expect(parseCarrierePoints([{ annee: 2000 }, { annee: 2001, points: null }])).toEqual({
      cipavBaseN: {}, cipavComplN: {}, regimePtsByYear: {},
    });
  });
});
