import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  coeffRevalo,
  plafondSS,
  getRetirementAge,
  getTrimTauxPlein,
  arrcoPlafond,
  arrcoTaux,
  arrcoTauxDisplay,
  ircantecPlafonds,
  ircantecValeursPoint,
  ircantecTauxDisplay,
  rciPrixAchat,
  rciTauxDisplay,
} from "./simulatorData";
import { fetchRISAnalysis, fetchRISPrefill } from "./risService";
import { toast } from "react-toastify";

const MD_CONTENT = {};

const CNAV_YEARS_START = 1963;
const CNAV_YEARS_END = 2026;
const RCI_YEARS_START = 1971;
const TAUX_CONVERSION_FRF_EUR = 6.55957;

const formatNumber = (num) => {
  const parts = num.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join(".");
};

// --- DATA ---

const ACTION_PANELS = {
  analyse: {
    label: "Analyse documents", icon: "\u{1F4CA}", color: "#6C5CE7", order: 1,
    desc: "Cross-check et rapprochements entre documents \u2014 \u00e0 la demande",
    actions: [
      { id: "ris_vs_autre_caisse", label: "Rapprochement RIS relev\u00e9 autre caisse ou r\u00e9gime", icon: "\u{1F3E2}", requires: ["ris"], desc: "Coh\u00e9rence trimestres inter-r\u00e9gimes" },
      { id: "ris_vs_paie", label: "Rapprochement RIS Bulletin de salaire", icon: "\u{1F4B0}", requires: ["ris", "fiche_paie"], desc: "\u00c9carts salariaux, recalcul SAM" },
      { id: "ris_vs_ft", label: "Rapprochement RIS doc France Travail (ch\u00f4mage)", icon: "\u{1F4CB}", requires: ["ris", "pole_emploi"], desc: "Trimestres assimil\u00e9s ch\u00f4mage" },
      { id: "ris_vs_etranger", label: "Rapprochement RIS carri\u00e8re documents \u00e9tranger", icon: "\u{1F30D}", requires: ["ris", "releve_etranger"], desc: "Totalisation, conventions bilat\u00e9rales" },
      { id: "ris_vs_fp", label: "Rapprochement RIS p\u00e9riode(s) fonctionnaire", icon: "\u{1F3DB}\uFE0F", requires: ["ris", "ircantec"], desc: "Fonction publique contractuelle, Ircantec" },
    ]
  },
  carriere: {
    label: "Carri\u00e8re", icon: "\u{1F4C8}", color: "#E17055", order: 2,
    navCount: "5 r\u00e9gimes",
    desc: "Donn\u00e9es carri\u00e8re par r\u00e9gime \u2014 validation consultant avant simulation",
    actions: [],
  },
  dispositifs: {
    label: "Dispositifs", icon: "\u{1F9E9}", color: "#00B894", order: 3,
    desc: "Activez les dispositifs applicables \u2014 l\u2019IA en d\u00e9duit les dates de d\u00e9part possibles",
    actions: [
      { id: "racl", label: "Carri\u00e8re longue (RACL)", icon: "\u23E9", requires: ["ris"], desc: "D\u00e9part anticip\u00e9 si d\u00e9but activit\u00e9 avant 16/18/20/21 ans", generates_date: true },
      { id: "rachat_incomplete", label: "Rachat VPLR ann\u00e9e incompl\u00e8te", icon: "\u{1F9E9}", requires: ["ris"], desc: "Racheter des trimestres pour ann\u00e9es < 4 trimestres" },
      { id: "rachat_etude", label: "Rachat VPLR ann\u00e9e d'\u00e9tude", icon: "\u{1F393}", requires: ["ris"], hasInput: true, inputType: "number", inputLabel: "Nb ann\u00e9es \u00e9tudes", desc: "Max 12 trimestres rachetables" },
      { id: "retraite_progressive", label: "Retraite progressive", icon: "\u2696\uFE0F", requires: ["ris"], desc: "Temps partiel + pension partielle d\u00e8s \u00e2ge l\u00e9gal \u22122 ans", generates_date: true },
      { id: "cumul_emploi", label: "Cumul emploi-retraite", icon: "\u{1F4BC}", requires: ["ris"], desc: "Liquidation puis reprise d\u2019activit\u00e9, 2e pension (r\u00e9forme 2023)", generates_date: true },
      { id: "chomage_ind", label: "Ch\u00f4mage indemnis\u00e9", icon: "\u{1F4C9}", requires: ["ris"], hasInput: true, inputType: "number", inputLabel: "Dur\u00e9e (mois)", desc: "Trim. assimil\u00e9s, impact sur date taux plein", generates_date: true },
      { id: "chomage_non_ind", label: "Ch\u00f4mage non indemnis\u00e9", icon: "\u26A0\uFE0F", requires: ["ris"], desc: "Limites sp\u00e9cifiques, exception +55 ans / 20 ans cotisation", generates_date: true },
      { id: "arret_activite", label: "Arr\u00eat d\u2019activit\u00e9", icon: "\u{1F6D1}", requires: ["ris"], hasInput: true, inputType: "number", inputLabel: "\u00c2ge arr\u00eat", desc: "Cessation totale, droits fig\u00e9s, d\u00e9cote", generates_date: true },
      { id: "cotisations_min", label: "Cotisations minimales (TI/TNS)", icon: "\u{1F4B0}", requires: ["ris"], desc: "Maintien validation 4 trim./an avec revenu minimal" },
    ]
  },
  dates: {
    label: "Dates & Simulations", icon: "\u{1F4C5}", color: "#0984E3", order: 4,
    desc: "Dates auto-calcul\u00e9es par l\u2019IA selon les dispositifs activ\u00e9s + dates standard",
    actions: [
      { id: "sim_legal", label: "\u00c2ge l\u00e9gal", icon: "\u2696\uFE0F", requires: ["ris"], desc: "Date d\u2019ouverture des droits selon g\u00e9n\u00e9ration", auto: true },
      { id: "sim_taux_plein", label: "Taux plein (dur\u00e9e)", icon: "\u{1F3AF}", requires: ["ris"], desc: "Date atteinte du nb de trimestres requis", auto: true },
      { id: "sim_auto_67", label: "Taux plein automatique (67 ans)", icon: "\u{1F4C6}", requires: ["ris"], desc: "Taux plein garanti, proratisation \u00e9ventuelle", auto: true },
      { id: "sim_date_libre", label: "Date libre", icon: "\u{1F4DD}", requires: ["ris"], hasInput: true, inputType: "date", inputLabel: "Date souhait\u00e9e", desc: "Choisir une date, voir l\u2019impact complet", auto: false },
    ]
  },
  livrables: {
    label: "Livrables", icon: "\u{1F4E6}", color: "#D63031", order: 5,
    desc: "G\u00e9n\u00e9rer le document final \u2014 m\u00eames calculs, niveaux de d\u00e9tail diff\u00e9rents",
    actions: [
      { id: "rapport_consultation", label: "Rapport de consultation retraite", icon: "\u{1F4C4}", requires: ["ris"], desc: "Synth\u00e8se 1 page \u2014 entretien client", pages: "~1 page" },
      { id: "simulation_retraite", label: "Simulation retraite", icon: "\u{1F4CA}", requires: ["ris"], desc: "Tableaux d\u00e9taill\u00e9s \u2014 sc\u00e9narios compar\u00e9s", pages: "~1 page" },
      { id: "audit_retraite", label: "Audit retraite", icon: "\u{1F4D1}", requires: ["ris"], desc: "Analyse compl\u00e8te r\u00e9gime par r\u00e9gime", pages: "~30 pages" },
    ]
  },
};

const AUTO_RESULTS = [
  { id: "surcote", label: "Surcote", icon: "\u{1F4C8}", desc: "Calcul\u00e9e automatiquement si d\u00e9part au-del\u00e0 du taux plein. +1,25%/trimestre suppl\u00e9mentaire.", color: "#00B894" },
  { id: "minimum_contributif", label: "Minimum contributif", icon: "\u{1F4CA}", desc: "\u00c9ligibilit\u00e9 v\u00e9rifi\u00e9e automatiquement. Si pension < seuil et taux plein atteint \u2014 compl\u00e9ment.", color: "#0984E3" },
  { id: "majoration_enfants", label: "Majoration enfants", icon: "\u{1F476}", desc: "Appliqu\u00e9e automatiquement selon le nombre d\u2019enfants renseign\u00e9. CNAV +10% si \u22653, AGIRC-ARRCO +10% \u00e0 +30%.", color: "#E17055" },
];

const ADMIN_SECTIONS = {
  regles: {
    label: "R\u00e8gles m\u00e9tier", icon: "\u{1F4D6}", color: "#6C5CE7",
    items: [
      { id: "cnav_base", label: "R\u00e9gime de base CNAV", icon: "\u{1F3DB}\uFE0F", file: "circulaire_revalorisation_2025.md", contentKey: "cnav_base", officialUrl: "https://www.legislation.cnav.fr", desc: "Calcul pension, SAM, taux, dur\u00e9e d\u2019assurance" },
      { id: "agirc_arrco", label: "AGIRC-ARRCO", icon: "\u{1F4CA}", file: "REGIMES-COMPLEMENTAIRE-AGIRC_ARRCO.md", contentKey: "agirc_arrco", officialUrl: "https://www.agirc-arrco.fr/particuliers", desc: "Points, valeur de service, coefficients" },
      { id: "ircantec", label: "Ircantec", icon: "\u{1F3E2}", file: null, contentKey: null, officialUrl: "https://www.ircantec.retraites.fr", desc: "Points, calcul pension agents non titulaires", missing: true },
      { id: "rci", label: "RCI / SSI", icon: "\u{1F4CB}", file: "circulaire_rci_2025.md", contentKey: "rci", officialUrl: "https://www.secu-independants.fr", desc: "Compl\u00e9mentaire ind\u00e9pendants, BIC/BNC" },
      { id: "racl", label: "Carri\u00e8re longue (RACL)", icon: "\u23E9", file: "racl-regles-conditions.md", contentKey: "racl", officialUrl: "https://www.service-public.fr/particuliers/vosdroits/F13845", desc: "Conditions, seuils, trimestres retenus" },
      { id: "vplr", label: "Rachat VPLR", icon: "\u{1F9E9}", file: "circulaire_rachat_vplr_2025.md", contentKey: "vplr", officialUrl: "https://www.lassuranceretraite.fr/rachat-trimestres", desc: "Bar\u00e8mes, options taux/proratisation" },
      { id: "progressive", label: "Retraite progressive", icon: "\u2696\uFE0F", file: "SKILL_retraite_progressive.md", contentKey: "progressive", officialUrl: "https://www.service-public.fr/particuliers/vosdroits/F13819", desc: "Conditions, fraction, quotit\u00e9" },
      { id: "cumul", label: "Cumul emploi-retraite", icon: "\u{1F4BC}", file: "SKILL_cumul_emploi_retraite.md", contentKey: "cumul", officialUrl: "https://www.service-public.fr/particuliers/vosdroits/F13243", desc: "Int\u00e9gral, plafonn\u00e9, 2e pension r\u00e9forme 2023" },
      { id: "chomage", label: "Ch\u00f4mage et retraite", icon: "\u{1F4C9}", file: null, contentKey: null, officialUrl: "https://www.unedic.org", desc: "Assimil\u00e9s, non indemnis\u00e9, exception +55 ans", missing: true },
      { id: "conventions", label: "Conventions internationales", icon: "\u{1F30D}", file: "SKILL_trimestres_etranger.md", contentKey: "conventions", officialUrl: "https://www.cleiss.fr/docs/textes/index.html", desc: "Bilat\u00e9rales, UE, totalisation/proratisation" },
      { id: "minimum", label: "Minimum contributif", icon: "\u{1F4CA}", file: null, contentKey: null, officialUrl: "https://www.legislation.cnav.fr", desc: "Base, major\u00e9, plafond toutes pensions", missing: true },
      { id: "majorations", label: "Majorations (enfants, handicap\u2026)", icon: "\u{1F476}", file: null, contentKey: null, officialUrl: "https://www.legislation.cnav.fr", desc: "MDA, +10% 3 enfants, tierce personne", missing: true },
    ]
  },
  parametres: {
    label: "Param\u00e8tres annuels", icon: "\u{1F4CA}", color: "#0984E3",
    items: [
      { id: "plafond_ss", label: "Plafond S\u00e9curit\u00e9 Sociale (PASS)", icon: "\u{1F4CA}", value: "48 060 \u20AC / 4 005 \u20AC mois", year: "2026", maj: "23/10/2025", desc: "Assiette Tranche A, seuil d\u00e9plafonnement" },
      { id: "smic_horaire", label: "SMIC", icon: "\u{1F4B6}", value: "12,02 \u20AC h / 1 823 \u20AC mois / 21 876 \u20AC an", year: "2026", maj: "01/01/2026", desc: "Base validation trimestres (150\u00d7SMIC)" },
      { id: "seuil_trim", label: "Seuil validation 1 trimestre", icon: "\u2705", value: "1 803,00 \u20AC", year: "2026", maj: "01/01/2026", desc: "150 \u00d7 SMIC horaire brut (150 \u00d7 12,02 \u20AC)" },
      { id: "valeur_point_agirc", label: "Valeur point AGIRC-ARRCO", icon: "\u{1F4CA}", value: "1,4386 \u20AC", year: "2025", maj: "01/11/2024", desc: "Valeur de service \u2014 valeur 2025 en vigueur, bar\u00e8me 2026 non encore publi\u00e9" },
      { id: "prix_achat_point", label: "Prix d\u2019achat point AGIRC-ARRCO", icon: "\u{1F4CA}", value: "20,1877 \u20AC", year: "2025", maj: "01/01/2025", desc: "Salaire de r\u00e9f\u00e9rence \u2014 valeur 2025 reconduite en 2026 (en attente officiel)" },
      { id: "valeur_point_ircantec", label: "Valeur point Ircantec", icon: "\u{1F3E2}", value: "0,51681 \u20AC", year: "2024", maj: "01/01/2024", desc: "Valeur de service \u2014 aucune nouvelle valeur publi\u00e9e pour 2025\u20132026 \u00e0 ce jour" },
      { id: "coeff_revalo", label: "Coefficients revalorisation CNAV", icon: "\u{1F4CA}", value: "Tableau", year: "2024", desc: "Revalorisation salaires port\u00e9s au compte" },
      { id: "bareme_vplr", label: "Bar\u00e8me rachat VPLR", icon: "\u{1F9E9}", value: "Grille", year: "2024", desc: "Co\u00fbt par trimestre selon \u00e2ge et revenu" },
      { id: "taux_csg", label: "Taux CSG retrait\u00e9s", icon: "\u{1F9FE}", value: "0% / 3,8% / 6,6% / 8,3%", year: "2025", maj: "01/01/2025", desc: "Exon\u00e9r\u00e9 / taux r\u00e9duit / taux m\u00e9dian / taux normal. + CRDS 0,5% + CASA 0,3%" },
      { id: "age_legal", label: "\u00c2ge l\u00e9gal par g\u00e9n\u00e9ration", icon: "\u{1F4CA}", value: "Tableau", year: "2024", maj: "2024", desc: "Post-r\u00e9forme 2023 \u2014 \u00e2ge l\u00e9gal 62 \u2192 64 ans progressif selon g\u00e9n\u00e9ration" },
      { id: "duree_assurance", label: "Dur\u00e9e d\u2019assurance requise", icon: "\u23F1\uFE0F", value: "166 \u2192 172 trim.", year: "2024", maj: "2024", desc: "Par g\u00e9n\u00e9ration \u2014 tableau post-r\u00e9forme 2023" },
      { id: "coeff_solidarite", label: "Coefficient solidarit\u00e9 AGIRC-ARRCO", icon: "\u{1F91D}", value: "10%", year: "2025", maj: "01/01/2019", desc: "Coefficient temporaire standard \u2014 confirm\u00e9 par les accords 2023\u20132025. S\u2019applique si d\u00e9part sans attendre le taux plein." },
      { id: "taux_majo_enfants", label: "Taux majoration pour enfants", icon: "\u{1F476}", value: "+10% (\u22653 enfants)", year: "2024", maj: "2014", desc: "CNAV +10% si 3+ enfants. AGIRC-ARRCO : +10% (3 enf.) \u00e0 +30% (7 enf. et +). Inchang\u00e9 depuis 2014." },
      { id: "taux_cotis_t1", label: "Taux cotisation calcul points T1 (\u2264PASS)", icon: "\u{1F4CA}", value: "6,20%", year: "2025", maj: "01/01/2019", desc: "Taux contractuel Tranche 1 \u2014 stable depuis 2019" },
      { id: "taux_cotis_t2", label: "Taux cotisation calcul points T2 (>PASS)", icon: "\u{1F4CA}", value: "17,00%", year: "2025", maj: "01/01/2019", desc: "Taux contractuel Tranche 2 (1 \u00e0 8 PASS) \u2014 stable depuis 2019" },
      { id: "taux_appel", label: "Taux d\u2019appel AGIRC-ARRCO", icon: "\u{1F4CA}", value: "127%", year: "2025", maj: "01/01/2019", desc: "Cotisation r\u00e9elle = taux contractuel \u00d7127%. Part >100% ne g\u00e9n\u00e8re pas de points. Confirm\u00e9 2023\u20132025." },
      { id: "historique_valeur_service", label: "Table historique valeur de service du point", icon: "\u{1F4CA}", value: "Tableau", year: "1999\u20132024", maj: "01/11/2024", desc: "Derni\u00e8re valeur connue : 1,4386 \u20AC au 01/11/2024. Bar\u00e8me 2026 non publi\u00e9." },
      { id: "historique_prix_achat", label: "Table historique prix d\u2019achat du point", icon: "\u{1F4CA}", value: "Tableau", year: "1999\u20132025", maj: "01/01/2025", desc: "Derni\u00e8re valeur connue : 20,1877 \u20AC au 01/01/2025." },
      { id: "taux_csg_retraite_detail", label: "Taux CSG retraite (d\u00e9tail seuils RFR)", icon: "\u{1F9FE}", value: "0% / 3,8% / 6,6% / 8,3%", year: "2025", maj: "2025", csgDetail: [{ taux: "0%", label: "Exon\u00e9r\u00e9", crds: false }, { taux: "3,8%", label: "Taux r\u00e9duit", crds: true }, { taux: "6,6%", label: "Taux m\u00e9dian", crds: true }, { taux: "8,3%", label: "Taux normal", crds: true }], desc: "Seuils RFR mill\u00e9sime 2025. + CRDS 0,5% sur tous sauf exon\u00e9r\u00e9s. + CASA 0,3% (taux m\u00e9dian et normal)." },
    ]
  },
  formules: {
    label: "Formules de calcul", icon: "\u{1F9EE}", color: "#00B894",
    items: [
      { id: "f_cnav", label: "Pension CNAV", icon: "\u{1F3DB}\uFE0F", formula: "SAM \u00d7 Taux \u00d7 (Trim. valid\u00e9s / Dur\u00e9e requise)", desc: "Taux plein = 50%, min 37.5% (d\u00e9cote max 20 trim.)" },
      { id: "f_decote", label: "D\u00e9cote CNAV", icon: "\u{1F4C9}", formula: "Taux plein \u2212 (1.25% \u00d7 trim. manquants)", desc: "Trim. manquants = min(\u00e2ge l\u00e9gal\u201367, dur\u00e9e requise\u2212valid\u00e9s)" },
      { id: "f_surcote", label: "Surcote CNAV", icon: "\u{1F4C8}", formula: "Pension \u00d7 (1 + 1.25% \u00d7 trim. surcot\u00e9s)", desc: "Trimestres au-del\u00e0 du taux plein, apr\u00e8s \u00e2ge l\u00e9gal" },
      { id: "f_agirc", label: "Pension AGIRC-ARRCO", icon: "\u{1F4CA}", formula: "Nb points \u00d7 Valeur de service du point", desc: "Points = cotisations / prix d\u2019achat du point" },
      { id: "f_sam", label: "SAM 25 meilleures", icon: "\u{1F4B0}", formula: "\u03A3(25 meilleurs salaires revaloris\u00e9s) / 25", desc: "Salaires plafonn\u00e9s au PASS, revaloris\u00e9s par coefficients" },
      { id: "f_trim_salaire", label: "Trimestres par salaire", icon: "\u2705", formula: "Trim. = min(4, Salaire annuel / (150\u00d7SMIC))", desc: "Arrondi \u00e0 l\u2019entier inf\u00e9rieur, max 4/an" },
      { id: "f_points_agirc", label: "Points AGIRC-ARRCO", icon: "\u{1F4CA}", formula: "Assiette \u00d7 Taux contractuel / Prix d\u2019achat", desc: "T1 (\u2264PASS) \u00e0 6,20% + T2 (>PASS) \u00e0 17%. Taux d\u2019appel 127% (part >100% non productive)" },
      { id: "f_rachat", label: "Co\u00fbt rachat VPLR", icon: "\u{1F9E9}", formula: "Bar\u00e8me(\u00e2ge, revenu) \u00d7 nb trimestres", desc: "Option 1 (taux seul) ou Option 2 (taux+prorato)" },
    ]
  },
  prompts: { label: "Prompts IA", icon: "\u{1F916}", color: "#E17055", desc: "26 prompts stricts pr\u00e9-calibr\u00e9s" },
  registre: { label: "Registre d\u2019erreurs", icon: "\u{1F6A8}", color: "#D63031", desc: "R\u00e8gles Gate #2 \u2014 auto-apprentissage" },
  flux: { label: "Flux & Architecture", icon: "\u{1F504}", color: "#D63031", desc: "Diagramme du flux utilisateur" },
};

const REGISTRE_ERREURS = [
  {
    id: "R001", niveau: "critique",
    title: "Trimestres enfants attribu\u00e9s \u00e0 un homme",
    date: "06/11/2025", prompt: "PROMPT 1 + PROMPT 2",
    erreur: "Attribution de 8 trimestres pour enfants \u00e0 un homme.",
    condition: 'sexe == "H" and trimestres_enfants > 0',
    message: "\u274C ERREUR CRITIQUE : Impossible d\u2019attribuer des trimestres pour enfants \u00e0 un homme. Les trimestres pour enfants sont r\u00e9serv\u00e9s aux femmes.",
    impact: "Bloque automatiquement tout calcul qui attribuerait des majorations enfants \u00e0 un homme.",
  },
  {
    id: "R002", niveau: "critique",
    title: "\u00c2ge l\u00e9gal inf\u00e9rieur \u00e0 62 ans",
    date: "06/11/2025", prompt: "PROMPT 1 + PROMPT 2",
    erreur: "\u00c2ge l\u00e9gal calcul\u00e9 \u00e0 61 ans (impossible depuis r\u00e9forme 2023).",
    condition: "age_legal < 62",
    message: "\u274C ERREUR CRITIQUE : \u00c2ge l\u00e9gal inf\u00e9rieur \u00e0 62 ans impossible. Depuis la r\u00e9forme 2023, l\u2019\u00e2ge l\u00e9gal minimum est de 62 ans.",
    impact: "Emp\u00eache les estimations avec un \u00e2ge l\u00e9gal incoh\u00e9rent.",
  },
  {
    id: "R003", niveau: "critique",
    title: "Nombre de trimestres sup\u00e9rieur \u00e0 200",
    date: "06/11/2025", prompt: "PROMPT 1 + PROMPT 2",
    erreur: "Plus de 200 trimestres valid\u00e9s (impossible : max 50 ans de carri\u00e8re).",
    condition: "trimestres_total > 200",
    message: "\u274C ERREUR CRITIQUE : Plus de 200 trimestres impossible. Maximum th\u00e9orique = 50 ans \u00d7 4 trimestres = 200 trimestres.",
    impact: "D\u00e9tecte les erreurs de saisie ou de calcul de trimestres.",
  },
  {
    id: "R004", niveau: "critique",
    title: "Enfant n\u00e9 avant le client",
    date: "06/11/2025", prompt: "PROMPT 1 + PROMPT 2",
    erreur: "Date de naissance enfant ant\u00e9rieure \u00e0 la date de naissance du client.",
    condition: "date_naissance_enfant < date_naissance_client",
    message: "\u274C ERREUR CRITIQUE : Enfant n\u00e9 avant le client. V\u00e9rifier les dates de naissance.",
    impact: "Emp\u00eache les incoh\u00e9rences temporelles dans les donn\u00e9es familiales.",
  },
];

const DOC_TYPES = [
  { id: "ris", label: "RIS", icon: "\u{1F4C4}", color: "#6C5CE7" },
  { id: "agirc_arrco", label: "AGIRC-ARRCO", icon: "\u{1F4CA}", color: "#0984E3" },
  { id: "ircantec", label: "Ircantec", icon: "\u{1F3DB}\uFE0F", color: "#00B894" },
  { id: "carsat", label: "CARSAT", icon: "\u{1F3E2}", color: "#D63031" },
  { id: "notif_agirc", label: "Notif. AGIRC", icon: "\u{1F4EC}", color: "#6C5CE7" },
  { id: "pole_emploi", label: "France Travail", icon: "\u{1F4CB}", color: "#FDCB6E" },
  { id: "fiche_paie", label: "Fiches paie", icon: "\u{1F4B0}", color: "#00CEC9" },
  { id: "releve_etranger", label: "\u00c9tranger", icon: "\u{1F30D}", color: "#A29BFE" },
];

const MOCK_DOCS = [
  { type: "ris", name: "RIS_Smith_2024.pdf", conf: 97 },
  { type: "agirc_arrco", name: "AGIRC_2024.pdf", conf: 94 },
  { type: "fiche_paie", name: "Paie_Dec23.pdf", conf: 91 },
  { type: "fiche_paie", name: "Paie_Nov23.pdf", conf: 93 },
  { type: "pole_emploi", name: "Attest_PE_2019.pdf", conf: 88 },
  { type: "releve_etranger", name: "US_SSA_2022.pdf", conf: 72 },
];

const MOCK_DETECTED_DISPOSITIFS = {
  racl: "D\u00e9but activit\u00e9 \u00e0 17 ans d\u00e9tect\u00e9 sur le RIS",
  chomage_ind: "Attestation France Travail pr\u00e9sente au dossier",
  retraite_progressive: "Profil compatible (\u00e2ge l\u00e9gal \u22122 ans atteint)",
};

const MOCK_AUTO_DATES = [
  { source: "RACL", date: "01/07/2011", age: "63 ans 4m", detail: "\u00c9ligible \u2014 d\u00e9but activit\u00e9 \u00e0 17 ans, 5 trim. avant 20 ans", color: "#00B894" },
  { source: "Ch\u00f4mage 18m + Taux plein", date: "01/10/2014", age: "66 ans 7m", detail: "Taux plein d\u00e9cal\u00e9 de 8 mois par p\u00e9riode ch\u00f4mage", color: "#E17055" },
  { source: "Retraite progressive", date: "01/03/2012", age: "64 ans", detail: "\u00c9ligible d\u00e8s \u00e2ge l\u00e9gal \u22122 ans, 150 trim. atteints", color: "#0984E3" },
];

const REVALO_CNAV = {
  2026:1.009,2025:1.009,2024:1.031,2023:1.085,2022:1.137,2021:1.149,2020:1.153,
  2019:1.164,2018:1.181,2017:1.190,2016:1.190,2015:1.191,2014:1.191,2013:1.205,
  2012:1.231,2011:1.246,2010:1.261,2009:1.270,2008:1.290,2007:1.302,2006:1.324,
  2005:1.348,2004:1.374,2003:1.395,2002:1.418,2001:1.449,2000:1.480,1999:1.487,
  1998:1.505,1997:1.522,1996:1.538,1995:1.577,1994:1.595,1993:1.623,1992:1.623,
  1991:1.677,1990:1.704,1989:1.751,1988:1.816,1987:1.803,1986:1.872,1985:1.908,
  1984:1.959,1983:2.016,1982:2.106,1981:2.249,1980:2.483,1979:2.737,1978:3.010,
  1977:3.290,1976:3.610,1975:4.015,1974:4.650,1973:5.450,1972:6.280,1971:7.220,
  1970:8.200,1969:9.180,1968:10.150,1967:11.090,1966:12.040,1965:12.840,
};

const AGIRC_PARAMS = {
  2026:{ta:6.20,tb:17.00,ref:5787},2025:{ta:6.20,tb:17.00,ref:5735},
  2024:{ta:6.20,tb:17.00,ref:5611},2023:{ta:6.20,tb:17.00,ref:5329},
  2022:{ta:6.20,tb:17.00,ref:5083},2021:{ta:6.20,tb:17.00,ref:5028},
  2020:{ta:6.20,tb:17.00,ref:5008},2019:{ta:6.20,tb:17.00,ref:4958},
  2018:{ta:6.20,tb:15.60,ref:4943},2017:{ta:6.20,tb:15.60,ref:4904},
  2016:{ta:6.20,tb:15.28,ref:4766},2015:{ta:6.20,tb:15.28,ref:4687},
  2014:{ta:6.20,tb:15.00,ref:4631},2013:{ta:6.20,tb:14.50,ref:4575},
  2012:{ta:6.20,tb:14.50,ref:4543},2011:{ta:6.20,tb:14.50,ref:4474},
  2010:{ta:6.20,tb:14.50,ref:4391},2009:{ta:6.20,tb:14.50,ref:4374},
  2008:{ta:6.20,tb:14.50,ref:4381},2007:{ta:6.20,tb:14.50,ref:4162},
  2006:{ta:6.00,tb:14.00,ref:3968},2005:{ta:6.00,tb:14.00,ref:3838},
  2004:{ta:6.00,tb:14.00,ref:3745},2003:{ta:6.00,tb:14.00,ref:3676},
  2002:{ta:6.00,tb:14.00,ref:3587},2001:{ta:6.00,tb:14.00,ref:3455},
  2000:{ta:6.00,tb:14.00,ref:3259},1999:{ta:6.00,tb:14.00,ref:3178},
  1998:{ta:6.00,tb:14.00,ref:3100},1997:{ta:6.00,tb:14.00,ref:3051},
  1996:{ta:6.00,tb:14.00,ref:2971},1995:{ta:6.00,tb:14.00,ref:2894},
  1994:{ta:6.00,tb:14.00,ref:2794},1993:{ta:6.00,tb:14.00,ref:2741},
  1992:{ta:6.00,tb:14.00,ref:2619},1991:{ta:6.00,tb:14.00,ref:2487},
  1990:{ta:6.00,tb:14.00,ref:2303},1989:{ta:6.00,tb:14.00,ref:2116},
  1988:{ta:6.00,tb:14.00,ref:1985},1987:{ta:6.00,tb:14.00,ref:1880},
  1986:{ta:6.00,tb:14.00,ref:1764},1985:{ta:6.00,tb:14.00,ref:1629},
  1984:{ta:6.00,tb:14.00,ref:1493},1983:{ta:6.00,tb:14.00,ref:1319},
  1982:{ta:6.00,tb:14.00,ref:1091},1981:{ta:6.00,tb:14.00,ref:868},
  1980:{ta:6.00,tb:14.00,ref:697},1979:{ta:6.00,tb:14.00,ref:566},
  1978:{ta:6.00,tb:14.00,ref:483},1977:{ta:6.00,tb:14.00,ref:415},
  1976:{ta:6.00,tb:14.00,ref:347},1975:{ta:6.00,tb:14.00,ref:291},
  1974:{ta:6.00,tb:14.00,ref:236},1973:{ta:6.00,tb:14.00,ref:193},
  1972:{ta:6.00,tb:14.00,ref:166},1971:{ta:6.00,tb:14.00,ref:146},
  1970:{ta:6.00,tb:14.00,ref:130},1969:{ta:6.00,tb:14.00,ref:120},
  1968:{ta:6.00,tb:14.00,ref:107},1967:{ta:6.00,tb:14.00,ref:97},
  1966:{ta:6.00,tb:14.00,ref:89},1965:{ta:6.00,tb:14.00,ref:82},
};

const ADMIN_SKILL_PROMPTS = [
  { id: "sk_prompt1",    label: "PROMPT 1 \u2014 Pr\u00e9-analyse consultant",          icon: "\u{1F4CB}", color: "#6C5CE7", contentKey: "sk_prompt1",    category: "Workflow principal" },
  { id: "sk_prompt2",    label: "PROMPT 2 \u2014 Rapport de consultation client",  icon: "\u{1F4C4}", color: "#6C5CE7", contentKey: "sk_prompt2",    category: "Workflow principal" },
  { id: "sk_prompt3",    label: "PROMPT 3 \u2014 Auto-apprentissage erreurs",      icon: "\u{1F9E0}", color: "#6C5CE7", contentKey: "sk_prompt3",    category: "Workflow principal" },
  { id: "sk_workflow",   label: "Workflow consultation final",                 icon: "\u{1F504}", color: "#D63031", contentKey: "sk_workflow",   category: "Workflow principal" },
  { id: "sk_analyse",    label: "Analyse relev\u00e9 de carri\u00e8re harmonis\u00e9",       icon: "\u{1F4CA}", color: "#0984E3", contentKey: "sk_analyse",    category: "Skills N8N" },
  { id: "sk_racl",       label: "\u00c9ligibilit\u00e9 carri\u00e8re longue (RACL)",         icon: "\u23E9", color: "#0984E3", contentKey: "sk_racl",       category: "Skills N8N" },
  { id: "sk_estimation", label: "Estimation pensions retraite",               icon: "\u{1F4B0}", color: "#0984E3", contentKey: "sk_estimation", category: "Skills N8N" },
  { id: "sk_progressive",label: "Retraite progressive",                       icon: "\u2696\uFE0F", color: "#0984E3", contentKey: "progressive",   category: "Skills N8N" },
  { id: "sk_cumul",      label: "Cumul emploi-retraite",                      icon: "\u{1F4BC}", color: "#0984E3", contentKey: "cumul",         category: "Skills N8N" },
  { id: "sk_etranger",   label: "Trimestres \u00e9trangers",                       icon: "\u{1F30D}", color: "#0984E3", contentKey: "conventions",   category: "Skills N8N" },
  { id: "miss_paie",     label: "Rapprochement RIS / bulletin de salaire",    icon: "\u{1F4B6}", color: "#bbb",    contentKey: null,            category: "Manquants \u2014 \u00e0 cr\u00e9er", missing: true },
  { id: "miss_ft",       label: "Rapprochement RIS / France Travail",         icon: "\u{1F4CB}", color: "#bbb",    contentKey: null,            category: "Manquants \u2014 \u00e0 cr\u00e9er", missing: true },
  { id: "miss_fp",       label: "Rapprochement RIS / fonctionnaire Ircantec", icon: "\u{1F3DB}\uFE0F", color: "#bbb",    contentKey: null,            category: "Manquants \u2014 \u00e0 cr\u00e9er", missing: true },
  { id: "miss_chomage",  label: "Ch\u00f4mage indemnis\u00e9 / non indemnis\u00e9",          icon: "\u26A0\uFE0F", color: "#bbb",    contentKey: null,            category: "Manquants \u2014 \u00e0 cr\u00e9er", missing: true },
  { id: "miss_arret",    label: "Arr\u00eat d\u2019activit\u00e9",                           icon: "\u{1F6D1}", color: "#bbb",    contentKey: null,            category: "Manquants \u2014 \u00e0 cr\u00e9er", missing: true },
  { id: "miss_tns",      label: "Cotisations minimales TI/TNS",               icon: "\u{1F4CB}", color: "#bbb",    contentKey: null,            category: "Manquants \u2014 \u00e0 cr\u00e9er", missing: true },
  { id: "miss_mincontrib",label: "Minimum contributif",                       icon: "\u{1F4CA}", color: "#bbb",    contentKey: null,            category: "Manquants \u2014 \u00e0 cr\u00e9er", missing: true },
];

// --- COMPONENT ---

export default function SimulatorV6({ id, user }) {
  const userId = user?.id;
  const [mode, setMode] = useState("production");
  const [docsUploaded, setDocsUploaded] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState("analyse");
  const [selectedAction, setSelectedAction] = useState(null);
  const [inputValues, setInputValues] = useState({});
  const [executed, setExecuted] = useState(null);
  const [promptText, setPromptText] = useState("");
  const [commentairesMode, setCommentairesMode] = useState(false);
  const [adminSection, setAdminSection] = useState("regles");
  const [expandedRule, setExpandedRule] = useState(null);
  const [expandedParam, setExpandedParam] = useState(null);
  const [modal, setModal] = useState(null);
  const [activatedDispositifs, setActivatedDispositifs] = useState([]);
  const [showAutoResults, setShowAutoResults] = useState(false);
  const [excludedDates, setExcludedDates] = useState([]);
  const [carriereValidee, setCarriereValidee] = useState(false);
  const [openRegimes, setOpenRegimes] = useState(["cnav"]);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [cnavSplitView, setCnavSplitView] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef(null);

  // === CNAV STATES ===
  const [birthDate, setBirthDate] = useState("");
  const [showBirthInfo, setShowBirthInfo] = useState(false);
  const [birthInfo, setBirthInfo] = useState(null);
  const [cnavSalaries, setCnavSalaries] = useState({});
  const [cnavDeplafonner, setCnavDeplafonner] = useState({});
  const [cnavComputed, setCnavComputed] = useState({});
  const [assimilatedInputs, setAssimilatedInputs] = useState({ serviceNational: 0, chomageIndemnise: 0, chomageNonIndemnise: 0, maladieAccident: 0 });
  const [totalTrimestresAssimiles, setTotalTrimestresAssimiles] = useState(0);
  const [trimestresParSalaire, setTrimestresParSalaire] = useState(0);
  const [nombreEnfants, setNombreEnfants] = useState(0);
  const [genre, setGenre] = useState("femme");
  const [statut, setStatut] = useState("prive");
  const [enfantHandicap, setEnfantHandicap] = useState(false);
  const [bestYears, setBestYears] = useState([]);
  const [totalBestYears, setTotalBestYears] = useState(0);
  const [moyenneAnnuelle, setMoyenneAnnuelle] = useState(0);

  // === AGIRC-ARRCO STATES ===
  const [isCadre, setIsCadre] = useState(false);
  const [arrcoSalaries, setArrcoSalaries] = useState({});
  const [arrcoComputed, setArrcoComputed] = useState({});
  const [arrcoPointsReleve, setArrcoPointsReleve] = useState("");

  // === IRCANTEC STATES ===
  const [ircantecSalaries, setIrcantecSalaries] = useState({});
  const [ircantecComputed, setIrcantecComputed] = useState({});
  const [ircantecPointsReleve, setIrcantecPointsReleve] = useState("");

  // === RCI STATES ===
  const [rciSalaries, setRciSalaries] = useState({});
  const [rciComputed, setRciComputed] = useState({});
  const [rciPointsReleve, setRciPointsReleve] = useState("");

  // === SORTED YEARS ===
  const sortedYears = useMemo(() => {
    const years = [];
    for (let y = CNAV_YEARS_START; y <= CNAV_YEARS_END; y++) years.push(y);
    return years.sort((a, b) => b - a);
  }, []);
  const rciSortedYears = useMemo(() => {
    const years = [];
    for (let y = RCI_YEARS_START; y <= CNAV_YEARS_END; y++) years.push(y);
    return years.sort((a, b) => b - a);
  }, []);

  // === CNAV COMPUTED VALUES ===
  const trimestresEnfant = useMemo(() => {
    if (nombreEnfants <= 0) return 0;
    let parEnfant = 0;
    if (genre === "femme") {
      parEnfant = statut === "fonctionnaire" ? 4 : 8;
    }
    const base = nombreEnfants * parEnfant;
    const handicapBonus = enfantHandicap ? nombreEnfants * 8 : 0;
    return base + handicapBonus;
  }, [nombreEnfants, genre, statut, enfantHandicap]);

  const totalTrimestresCotises = useMemo(() => {
    let total = 0;
    for (const year in cnavComputed) {
      if (cnavComputed[year]?.trimestres) total += cnavComputed[year].trimestres;
    }
    return total;
  }, [cnavComputed]);

  const totalTrimestresGlobal = totalTrimestresCotises + totalTrimestresAssimiles + trimestresEnfant;

  // === CNAV HANDLERS ===
  const handleAfficher = useCallback(() => {
    if (!birthDate) return;
    const d = new Date(birthDate);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const today = new Date();
    const diff = today - d;
    const yearAge = Math.floor(diff / 31536000000);
    const dayAge = Math.floor((diff % 31536000000) / 86400000);
    const monthAge = Math.floor(dayAge / 30);
    const retirementAge = getRetirementAge(year);
    const trimTauxPlein = getTrimTauxPlein(year);
    const restant = 62 - (yearAge + monthAge / 30);
    const anneeRestant = Math.floor(restant);
    const moisRestant = Math.floor((restant - anneeRestant) * 12);
    const isRetired = anneeRestant <= 0;
    setBirthInfo({ formattedDate: `${day}/${month}/${year}`, retirementAge, trimTauxPlein, anneeRestant, moisRestant, totalMois: moisRestant + anneeRestant * 12, isRetired });
    setShowBirthInfo(true);
  }, [birthDate]);

  const handleCnavSimulateur = useCallback((val, year, isDeplafonner) => {
    let salaireAnnuel = parseFloat(String(val).replace(/\s/g, "").replace(",", "."));
    if (isNaN(salaireAnnuel) || salaireAnnuel <= 0) {
      setCnavComputed((prev) => { const next = { ...prev }; delete next[year]; return next; });
      return;
    }
    const coeff = coeffRevalo[year] || 1;
    const passEuro = plafondSS[year] || 0;
    const isCapped = !isDeplafonner || year >= 2005;
    let salairePlafonne = salaireAnnuel;
    if (isCapped && passEuro > 0) {
      salairePlafonne = year <= 2001 ? Math.min(salaireAnnuel, passEuro * 6.556957) : Math.min(salaireAnnuel, passEuro);
    }
    let salaireRevaloriser = year <= 2001 ? (salairePlafonne * coeff) / 6.556957 : salairePlafonne * coeff;
    const seuilTrimestre = year <= 2001 ? (passEuro * 6.556957) / 4 : passEuro / 4;
    const trimestre = Math.min(4, Math.max(0, Math.floor(salaireAnnuel / (seuilTrimestre || Infinity))));
    setTrimestresParSalaire(trimestre);
    setCnavComputed((prev) => ({ ...prev, [year]: { revalorise: salaireRevaloriser, revaloriseStr: formatNumber(salaireRevaloriser), trimestres: trimestre } }));
  }, []);

  const handleAjouterTrimestres = useCallback((type) => {
    const val = assimilatedInputs[type] || 0;
    if (isNaN(val) || val <= 0) return;
    setTotalTrimestresAssimiles((prev) => prev + val);
    setAssimilatedInputs((prev) => ({ ...prev, [type]: 0 }));
  }, [assimilatedInputs]);

  const handleSimulationFinale = useCallback(() => {
    const entries = [];
    const updatedSalaries = { ...cnavSalaries };
    for (const year in cnavSalaries) {
      const sal = cnavSalaries[year];
      if (!sal || !sal.sr) continue;
      const salaireReel = parseFloat(String(sal.sr).replace(/\s/g, "").replace(",", "."));
      if (isNaN(salaireReel) || salaireReel <= 0) continue;
      const yearNum = Number(year);
      const passEuro = plafondSS[yearNum] || 0;
      let salaireSS = salaireReel;
      if (passEuro > 0) {
        salaireSS = yearNum <= 2001 ? Math.min(salaireReel, passEuro * 6.556957) : Math.min(salaireReel, passEuro);
      }
      updatedSalaries[year] = { ...updatedSalaries[year], ss: String(Math.round(salaireSS * 100) / 100) };
      const salaireSS_euro = yearNum <= 2001 ? salaireSS / 6.556957 : salaireSS;
      entries.push({ year: yearNum, value: salaireSS_euro });
    }
    setCnavSalaries(updatedSalaries);
    entries.sort((a, b) => b.value - a.value);
    const best = entries.slice(0, 25);
    const bestDisplay = best.map((e) => ({ year: e.year, value: e.value, display: formatNumber(e.value) + " \u20AC" }));
    const total = best.reduce((s, e) => s + e.value, 0);
    const moyenne = best.length ? total / best.length : 0;
    setBestYears(bestDisplay);
    setTotalBestYears(total);
    setMoyenneAnnuelle(moyenne);
  }, [cnavSalaries]);

  // === AGIRC-ARRCO HANDLERS ===
  const computeArrcoNonCadre = useCallback((annuelBrut, year, x) => {
    const plafondAnnuel = arrcoPlafond[x][2];
    if (year < 2019) {
      const tauxTA = arrcoTaux[x][1]; const tauxTB = arrcoTaux[x][2]; const valeurT1 = arrcoTaux[x][6]; const valeurAchatArrco = arrcoTaux[x][8];
      const trancheA = Math.min(Math.max(annuelBrut, 0), plafondAnnuel);
      const cotisationTA = trancheA * tauxTA;
      let cotisationTB = 0;
      if (annuelBrut > plafondAnnuel) { cotisationTB = Math.min(annuelBrut - plafondAnnuel, 2 * plafondAnnuel) * tauxTB; }
      const totalPoints = cotisationTB * 0.347791548 / valeurAchatArrco + cotisationTA / valeurT1;
      return { trancheA: (cotisationTA / valeurT1).toFixed(2) + " pts", trancheB: (cotisationTB / valeurAchatArrco).toFixed(2) + " pts", total: totalPoints.toFixed(2) + " pts" };
    } else {
      const tauxTA = arrcoTaux[x][1]; const tauxTB = arrcoTaux[x][3]; const valeurAchatPoint = arrcoTaux[x][8];
      const cotisationTA = Math.min(annuelBrut, plafondAnnuel) * tauxTA;
      const pointsTA = cotisationTA / valeurAchatPoint;
      let pointsTB = 0;
      if (annuelBrut > plafondAnnuel) { pointsTB = ((annuelBrut - plafondAnnuel) * tauxTB) / valeurAchatPoint; }
      return { trancheA: pointsTA.toFixed(2) + " pts", trancheB: pointsTB.toFixed(2) + " pts", total: (pointsTA + pointsTB).toFixed(2) + " pts" };
    }
  }, []);

  const computeArrcoCadre = useCallback((annuelBrut, year, x) => {
    const plafondAnnuel = arrcoPlafond[x][2];
    if (year < 2019) {
      const tauxArrco = arrcoTaux[x][1]; const tauxAgirc = arrcoTaux[x][3]; const valeurPtArrco = arrcoTaux[x][6]; const valeurPtAgirc = arrcoTaux[x][8];
      const cotisA = Math.min(annuelBrut, plafondAnnuel) * tauxArrco; const pointsA = cotisA / valeurPtArrco;
      let pointsB = 0;
      if (annuelBrut > plafondAnnuel) { pointsB = ((annuelBrut - plafondAnnuel) * tauxAgirc) / valeurPtAgirc; }
      return { trancheA: pointsA.toFixed(2) + " pts", trancheB: pointsB.toFixed(2) + " pts", total: (pointsA + pointsB * 0.347791548).toFixed(2) + " pts" };
    } else {
      const tauxTA = arrcoTaux[x][1]; const tauxTB = arrcoTaux[x][3]; const valeurAchatPoint = arrcoTaux[x][8];
      const cotisationTA = Math.min(annuelBrut, plafondAnnuel) * tauxTA; const pointsTA = cotisationTA / valeurAchatPoint;
      let pointsTB = 0;
      if (annuelBrut > plafondAnnuel) { pointsTB = ((annuelBrut - plafondAnnuel) * tauxTB) / valeurAchatPoint; }
      return { trancheA: pointsTA.toFixed(2) + " pts", trancheB: pointsTB.toFixed(2) + " pts", total: (pointsTA + pointsTB).toFixed(2) + " pts" };
    }
  }, []);

  const handleArrcoSalaryChange = useCallback((year, value, cadre) => {
    setArrcoSalaries((prev) => ({ ...prev, [year]: value }));
    let annuelBrut = parseFloat(String(value).replace(/\s/g, "").replace(",", "."));
    if (isNaN(annuelBrut)) { setArrcoComputed((prev) => { const next = { ...prev }; delete next[year]; return next; }); return; }
    if (year < 2002) annuelBrut = annuelBrut / TAUX_CONVERSION_FRF_EUR;
    const x = arrcoPlafond.findIndex((p) => p[0] === year);
    if (x < 0) return;
    setArrcoComputed((prev) => ({ ...prev, [year]: cadre ? computeArrcoCadre(annuelBrut, year, x) : computeArrcoNonCadre(annuelBrut, year, x) }));
  }, [computeArrcoNonCadre, computeArrcoCadre]);

  const handleArrcoStatusChange = useCallback((cadre) => {
    setIsCadre(cadre);
    const newComputed = {};
    Object.entries(arrcoSalaries).forEach(([yearStr, value]) => {
      const year = parseInt(yearStr, 10);
      let annuelBrut = parseFloat(String(value).replace(/\s/g, "").replace(",", "."));
      if (isNaN(annuelBrut)) return;
      if (year < 2002) annuelBrut = annuelBrut / TAUX_CONVERSION_FRF_EUR;
      const x = arrcoPlafond.findIndex((p) => p[0] === year);
      if (x < 0) return;
      newComputed[year] = cadre ? computeArrcoCadre(annuelBrut, year, x) : computeArrcoNonCadre(annuelBrut, year, x);
    });
    setArrcoComputed(newComputed);
  }, [arrcoSalaries, computeArrcoNonCadre, computeArrcoCadre]);

  // === IRCANTEC HANDLER ===
  const handleIrcantecSimulateur = useCallback((salaireBrut, year) => {
    const salaire = parseFloat(String(salaireBrut).replace(/\s/g, "").replace(",", "."));
    const display = ircantecTauxDisplay[year];
    if (!ircantecPlafonds[year] || !ircantecValeursPoint[year] || !display || isNaN(salaire)) {
      setIrcantecComputed((prev) => { const next = { ...prev }; delete next[year]; return next; }); return;
    }
    const plafondAnnuel = ircantecPlafonds[year]; const valeurPoint = ircantecValeursPoint[year];
    const tauxA = parseFloat((display.tauxA || "").replace(",", ".").replace("%", "")) / 100;
    const tauxB = parseFloat((display.tauxB || "").replace(",", ".").replace("%", "")) / 100;
    const cotisA = Math.min(salaire, plafondAnnuel) * tauxA;
    const cotisB = Math.max(0, Math.min(salaire, 8 * plafondAnnuel) - plafondAnnuel) * tauxB;
    const pointsA = cotisA / valeurPoint; const pointsB = cotisB / valeurPoint;
    setIrcantecComputed((prev) => ({ ...prev, [year]: { tra: pointsA.toFixed(5) + " pts", trb: pointsB.toFixed(5) + " pts", total: (pointsA + pointsB).toFixed(5) + " pts" } }));
  }, []);

  // === RCI HANDLER ===
  const handleRciSimulateur = useCallback((salaireBrut, year) => {
    let salaire = parseFloat(String(salaireBrut).replace(/\s/g, "").replace(",", "."));
    const display = rciTauxDisplay[year];
    if (!plafondSS[year] || !rciPrixAchat[year] || !display || isNaN(salaire)) {
      setRciComputed((prev) => { const next = { ...prev }; delete next[year]; return next; }); return;
    }
    if (year < 2002) salaire = salaire / TAUX_CONVERSION_FRF_EUR;
    const pass = plafondSS[year]; const prixAchat = rciPrixAchat[year];
    const tauxA = parseFloat((display.tauxA || "").replace(",", ".").replace("%", "")) / 100;
    const tauxB = parseFloat((display.tauxB || "").replace(",", ".").replace("%", "")) / 100;
    const cotisA = Math.min(Math.max(salaire, 0), pass) * tauxA;
    const cotisB = Math.min(Math.max(salaire - pass, 0), 3 * pass) * tauxB;
    const pointsA = cotisA / prixAchat; const pointsB = cotisB / prixAchat;
    setRciComputed((prev) => ({ ...prev, [year]: { tra: pointsA.toFixed(5) + " pts", trb: pointsB.toFixed(5) + " pts", total: (pointsA + pointsB).toFixed(5) + " pts" } }));
  }, []);

  // === PREFILL (from RIS import) ===
  const handlePrefill = useCallback((overrideData = null) => {
    let sourceData = user;
    if (overrideData && (overrideData.debug_carriere_detaillee_regex || overrideData.detail_annuel)) sourceData = overrideData;
    if (!sourceData) return;
    // Birth date
    if (user?.profil?.date_naissance) {
      const parts = user.profil.date_naissance.split("/");
      if (parts.length === 3) setBirthDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    // Children / genre
    const childCount = parseInt(user?.profil?.children_number ?? user?.children_number ?? 0, 10);
    if (childCount > 0) setNombreEnfants(childCount);
    const civility = user?.profil?.civility ?? user?.civility ?? "";
    if (civility === "Monsieur") setGenre("homme");
    else if (civility === "Madame" || civility === "Mlle") setGenre("femme");

    // CNAV salaries
    const careerData = sourceData.debug_carriere_detaillee_regex;
    if (careerData && Array.isArray(careerData)) {
      const newSalaries = {}; const newComputed = {};
      careerData.forEach((entry) => {
        const annee = entry.annee; if (!annee) return;
        const regimes = (entry.regimes_concernes || "").toLowerCase();
        const hasBaseAlignee = regimes.includes("assurance retraite") || regimes.includes("ssi") || regimes.includes("msa") || regimes.includes("agirc-arrco");
        if ((regimes.includes("cipav") && !hasBaseAlignee) || ((regimes.includes("profession libérale") || regimes.includes("profession liberale")) && !hasBaseAlignee)) return;
        let montant = entry.revenu_brut;
        if (!montant && entry.revenus) { montant = parseFloat(entry.revenus.replace(/[^0-9.,]/g, "").replace(",", ".")); }
        if (montant) {
          newSalaries[annee] = { sr: String(montant), ss: "" };
          const coeff = coeffRevalo[annee] || 1; const passEuro = plafondSS[annee] || 0;
          let salairePlafonne = parseFloat(String(montant));
          if (passEuro > 0) { salairePlafonne = annee <= 2001 ? Math.min(salairePlafonne, passEuro * 6.556957) : Math.min(salairePlafonne, passEuro); }
          let salaireRevaloriser = annee <= 2001 ? (salairePlafonne * coeff) / 6.556957 : salairePlafonne * coeff;
          const seuilTrimestre = annee <= 2001 ? (passEuro * 6.556957) / 4 : passEuro / 4;
          const trimestre = Math.min(4, Math.max(0, Math.floor(parseFloat(String(montant)) / (seuilTrimestre || Infinity))));
          newComputed[annee] = { revalorise: salaireRevaloriser, revaloriseStr: formatNumber(salaireRevaloriser), trimestres: trimestre };
        }
      });
      setCnavSalaries((prev) => ({ ...prev, ...newSalaries }));
      setCnavComputed((prev) => ({ ...prev, ...newComputed }));

      // AGIRC-ARRCO prefill
      const detailAnnuel = sourceData.detail_annuel;
      const arrcoYears = new Set();
      if (Array.isArray(detailAnnuel)) { detailAnnuel.forEach((e) => { if ((e.regimes_concernes || "").toLowerCase().includes("agirc-arrco")) arrcoYears.add(e.annee); }); }
      const newArrcoSal = {}; const newArrcoComp = {};
      careerData.forEach((entry) => {
        const annee = entry.annee; if (!annee || !arrcoYears.has(annee)) return;
        let montant = entry.revenu_brut;
        if (!montant && entry.revenus) { montant = parseFloat(entry.revenus.replace(/[^0-9.,]/g, "").replace(",", ".")); }
        if (!montant) return;
        newArrcoSal[annee] = String(montant);
        let annuelBrut = parseFloat(String(montant));
        if (annee < 2002) annuelBrut = annuelBrut / TAUX_CONVERSION_FRF_EUR;
        const x = arrcoPlafond.findIndex((p) => p[0] === annee);
        if (x < 0) return;
        newArrcoComp[annee] = isCadre ? computeArrcoCadre(annuelBrut, annee, x) : computeArrcoNonCadre(annuelBrut, annee, x);
      });
      setArrcoSalaries(newArrcoSal); setArrcoComputed(newArrcoComp);
    }

    // IRCANTEC prefill
    const detailAnnuel = sourceData.detail_annuel;
    if (Array.isArray(detailAnnuel)) {
      const newIrcSal = {}; const newIrcComp = {};
      detailAnnuel.forEach((entry) => {
        const annee = entry.annee; const regimes = (entry.regimes_concernes || "").toLowerCase();
        if (!regimes.includes("ircantec")) return;
        const amounts = (entry.revenus || "").split(/€|FRF|EUR/i).map((s) => { const d = s.replace(/[^\d]/g, ""); return d ? parseInt(d, 10) : NaN; }).filter((n) => !isNaN(n) && n > 0);
        if (amounts.length === 0) return;
        let montant = regimes.includes("agirc-arrco") && amounts.length > 1 ? amounts.reduce((s, a) => s + a, 0) - Math.max(...amounts) : amounts.reduce((s, a) => s + a, 0);
        if (!montant || montant <= 0) return;
        newIrcSal[annee] = String(montant);
        const display = ircantecTauxDisplay[annee];
        if (!ircantecPlafonds[annee] || !ircantecValeursPoint[annee] || !display) return;
        const plafondAnnuel = ircantecPlafonds[annee]; const valeurPoint = ircantecValeursPoint[annee];
        const tauxA = parseFloat((display.tauxA || "").replace(",", ".").replace("%", "")) / 100;
        const tauxB = parseFloat((display.tauxB || "").replace(",", ".").replace("%", "")) / 100;
        const cotisA = Math.min(montant, plafondAnnuel) * tauxA;
        const cotisB = Math.max(0, Math.min(montant, 8 * plafondAnnuel) - plafondAnnuel) * tauxB;
        newIrcComp[annee] = { tra: (cotisA / valeurPoint).toFixed(5) + " pts", trb: (cotisB / valeurPoint).toFixed(5) + " pts", total: ((cotisA + cotisB) / valeurPoint).toFixed(5) + " pts" };
      });
      setIrcantecSalaries(newIrcSal); setIrcantecComputed(newIrcComp);

      // RCI prefill
      const newRciSal = {}; const newRciComp = {};
      detailAnnuel.forEach((entry) => {
        const annee = entry.annee; const regimes = (entry.regimes_concernes || "").toLowerCase();
        if (!regimes.includes("rci")) return;
        const amounts = (entry.revenus || "").split(/[+]|\u20AC|FRF|EUR/i).map((s) => { const d = s.replace(/[^\d]/g, ""); return d ? parseInt(d, 10) : NaN; }).filter((n) => !isNaN(n) && n > 0);
        if (amounts.length === 0) return;
        const regimesList = (entry.regimes_concernes || "").split(/,\s*/);
        const rciIndex = regimesList.findIndex((r) => r.toLowerCase().includes("rci"));
        let montant = amounts.length > 1 && regimesList.length > 1 && rciIndex >= 0 && rciIndex < amounts.length ? amounts[rciIndex] : amounts.reduce((s, a) => s + a, 0);
        if (!montant || montant <= 0) return;
        newRciSal[annee] = String(montant);
        let salaire = parseFloat(String(montant));
        const display = rciTauxDisplay[annee];
        if (!plafondSS[annee] || !rciPrixAchat[annee] || !display) return;
        if (annee < 2002) salaire = salaire / TAUX_CONVERSION_FRF_EUR;
        const pass = plafondSS[annee]; const prixAchat = rciPrixAchat[annee];
        const tauxA = parseFloat((display.tauxA || "").replace(",", ".").replace("%", "")) / 100;
        const tauxB = parseFloat((display.tauxB || "").replace(",", ".").replace("%", "")) / 100;
        const cotisA = Math.min(Math.max(salaire, 0), pass) * tauxA;
        const cotisB = Math.min(Math.max(salaire - pass, 0), 3 * pass) * tauxB;
        newRciComp[annee] = { tra: (cotisA / prixAchat).toFixed(5) + " pts", trb: (cotisB / prixAchat).toFixed(5) + " pts", total: ((cotisA + cotisB) / prixAchat).toFixed(5) + " pts" };
      });
      setRciSalaries(newRciSal); setRciComputed(newRciComp);
    }
  }, [user, isCadre, computeArrcoCadre, computeArrcoNonCadre]);

  // === RIS FILE IMPORT ===
  const handleImportRIS = useCallback(() => { if (fileInputRef.current) { fileInputRef.current.value = ""; fileInputRef.current.click(); } }, []);
  const handleImportOrPrefill = useCallback(() => {
    if (user?.debug_carriere_detaillee_regex?.length) { handlePrefill(); } else { handleImportRIS(); }
  }, [user, handleImportRIS, handlePrefill]);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    setIsImporting(true);
    try {
      const childrenCount = user?.profil?.children_number ?? user?.children_number ?? "";
      const birthDateVal = user?.profil?.date_naissance ?? user?.birth_date ?? "";
      const msg = `Analyse RIS.\nNombre d'enfants : ${childrenCount}\nDate de naissance : ${birthDateVal}`;
      toast.info("Analyse du RIS en cours...");
      try {
        const prefillPayload = await fetchRISPrefill(file, msg, user?.id);
        if (prefillPayload?.debug_carriere_detaillee_regex?.length) {
          handlePrefill(prefillPayload);
          toast.success(`${prefillPayload.debug_carriere_detaillee_regex.length} année(s) pré-remplies !`);
          try { sessionStorage.setItem(`ris_import_data_${user?.id}`, JSON.stringify({ risData: prefillPayload, timestamp: Date.now() })); } catch (ex) {}
          window.dispatchEvent(new CustomEvent("risImportComplete", { detail: { clientId: user?.id, risData: prefillPayload } }));
        }
      } catch (prefillErr) { console.warn("Prefill rapide échoué:", prefillErr); }
      const payload = await fetchRISAnalysis(file, msg, user?.id);
      if (!payload || !payload.debug_carriere_detaillee_regex) { toast.warn("Pas de données de carrière utilisables."); return; }
      handlePrefill(payload);
      setDocsUploaded(true);
      try { sessionStorage.setItem(`ris_import_data_${user?.id}`, JSON.stringify({ risData: payload, timestamp: Date.now() })); } catch (ex) {}
      window.dispatchEvent(new CustomEvent("risImportComplete", { detail: { clientId: user?.id, risData: payload } }));
      const filledCount = (payload.debug_carriere_detaillee_regex || []).filter((e) => e.revenu_brut || e.revenus).length;
      if (filledCount > 0) toast.success(`${filledCount} année(s) importée(s) !`);
    } catch (err) { console.error("Erreur import RIS:", err); toast.error("Erreur lors de l'analyse."); } finally { setIsImporting(false); }
  }, [user, handlePrefill]);

  // Auto-prefill on mount from sessionStorage / event
  useEffect(() => {
    const clientId = userId; if (!clientId) return;
    const onRisImport = (event) => { const { clientId: evtId, risData } = event.detail || {}; if (String(evtId) !== String(clientId) || !risData) return; handlePrefill(risData); };
    window.addEventListener("risImportComplete", onRisImport);
    try { const stored = sessionStorage.getItem(`ris_import_data_${clientId}`); if (stored) { const { risData, timestamp } = JSON.parse(stored); if (risData && Date.now() - timestamp < 5 * 60 * 1000) handlePrefill(risData); } } catch (e) {}
    return () => window.removeEventListener("risImportComplete", onRisImport);
  }, [userId, handlePrefill]);

  // === RESET ALL ===
  const handleResetAll = useCallback(() => {
    setCnavSalaries({}); setCnavDeplafonner({}); setCnavComputed({}); setBestYears([]); setTotalBestYears(0); setMoyenneAnnuelle(0); setTrimestresParSalaire(0); setTotalTrimestresAssimiles(0);
    setAssimilatedInputs({ serviceNational: 0, chomageIndemnise: 0, chomageNonIndemnise: 0, maladieAccident: 0 });
    setNombreEnfants(0); setGenre("femme"); setStatut("prive"); setEnfantHandicap(false);
    setArrcoSalaries({}); setArrcoComputed({}); setIrcantecSalaries({}); setIrcantecComputed({}); setRciSalaries({}); setRciComputed({});
  }, []);

  const defaultBestYears = useMemo(() => {
    if (bestYears.length) return bestYears;
    return Array.from({ length: 25 }, (_, i) => ({ year: (new Date().getFullYear()) - i, value: 0, display: "0" }));
  }, [bestYears]);

  const uploadedTypes = MOCK_DOCS.map((d) => d.type);
  const checkReq = (req) => req.every((r) => uploadedTypes.includes(r));
  const getMissing = (req) => req.filter((r) => !uploadedTypes.includes(r));

  const S = {
    card: { background: "#fff", borderRadius: 11, boxShadow: "0 1px 5px rgba(0,0,0,0.05)" },
    mono: { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" },
  };

  const toggleDispositif = (actionId) => {
    setActivatedDispositifs((prev) =>
      prev.includes(actionId) ? prev.filter((d) => d !== actionId) : [...prev, actionId]
    );
  };

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", color: "#1a1a2e" }}>
      <input type="file" ref={fileInputRef} style={{ display: "none" }} accept=".pdf" onChange={handleFileChange} />

      {/* --- MODAL CONTENU REGLEMENTAIRE --- */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 800, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: modal.color || "#333" }}>{modal.title}</div>
                <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{modal.lines} lignes &middot; Cliquer en dehors pour fermer</div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#888", lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "14px 18px" }}>
              <pre style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: 11, lineHeight: 1.7, color: "#333", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                {modal.content}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* --- MODE TOGGLE --- */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <div style={{ display: "flex", background: "#1a1a2e", borderRadius: 8, padding: 3 }}>
          <button onClick={() => setMode("production")} style={{ padding: "7px 20px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, background: mode === "production" ? "#6C5CE7" : "transparent", color: mode === "production" ? "#fff" : "#a29bfe" }}>{"\u{1F916}"} Production Client</button>
          <button onClick={() => setMode("admin")} style={{ padding: "7px 20px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, background: mode === "admin" ? "#E17055" : "transparent", color: mode === "admin" ? "#fff" : "#a29bfe" }}>{"\u2699\uFE0F"} Admin & Moteur</button>
        </div>
      </div>

      {/* ===== PRODUCTION MODE ===== */}
      {mode === "production" && (
        <div>

          {/* Zone documents + Date naissance */}
          <div style={{ ...S.card, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{"\u{1F4CE}"} Documents & Profil</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={handleImportOrPrefill} disabled={isImporting} style={{ fontSize: 10, padding: "5px 12px", borderRadius: 6, border: "none", background: isImporting ? "#999" : "#00B894", color: "#fff", fontWeight: 700, cursor: isImporting ? "default" : "pointer" }}>{isImporting ? "Analyse..." : "\u{1F4E5} Importer les données"}</button>
                <button onClick={handleResetAll} style={{ fontSize: 10, padding: "5px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fafafa", color: "#888", fontWeight: 600, cursor: "pointer" }}>{"\u21BA"} Réinitialiser</button>
              </div>
            </div>
            {!docsUploaded ? (
              <div onClick={handleImportOrPrefill} style={{ border: "2px dashed #6C5CE7", borderRadius: 9, padding: "20px 14px", textAlign: "center", cursor: "pointer", background: "#6C5CE706" }}>
                <div style={{ fontSize: 24, marginBottom: 3 }}>{"\u{1F4E5}"}</div>
                <div style={{ fontWeight: 600, color: "#6C5CE7", fontSize: 11 }}>Déposez votre RIS ici ou cliquez pour importer</div>
                <div style={{ fontSize: 10, color: "#bbb", marginTop: 4 }}>{"\u{1F4A1}"} PDF du Relevé Individuel de Situation</div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {MOCK_DOCS.map((doc, i) => {
                    const dt = DOC_TYPES.find((d) => d.id === doc.type);
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, background: `${dt?.color}08`, border: `1px solid ${dt?.color}18`, fontSize: 10 }}>
                        <span>{dt?.icon}</span>
                        <span style={{ fontWeight: 600 }}>{doc.name}</span>
                        <span style={{ fontSize: 9, color: doc.conf > 85 ? "#00B894" : "#E17055", fontWeight: 700 }}>{doc.conf}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Date de naissance */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "8px 0", borderTop: "1px solid #f0f0f0" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>Date de naissance :</span>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={{ padding: "4px 7px", borderRadius: 5, border: "1px solid #ccc", fontSize: 11 }} />
              <button onClick={handleAfficher} style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: "#6C5CE7", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>OK</button>
            </div>
            {showBirthInfo && birthInfo && (
              <div style={{ marginTop: 6, padding: "6px 10px", background: "#6C5CE708", borderRadius: 7, border: "1px solid #6C5CE720", fontSize: 10, color: "#555" }}>
                Né(e) le <strong style={{ color: "#6C5CE7" }}>{birthInfo.formattedDate}</strong> — Âge légal : <strong style={{ color: "#6C5CE7" }}>{birthInfo.retirementAge}</strong> — Taux plein : <strong style={{ color: "#6C5CE7" }}>{birthInfo.trimTauxPlein} trimestres</strong>
                {birthInfo.isRetired ? <span> — <strong style={{ color: "#00B894" }}>Retraite atteinte</strong></span> : <span> — Reste <strong style={{ color: "#E17055" }}>{birthInfo.anneeRestant}a {birthInfo.moisRestant}m</strong></span>}
              </div>
            )}
          </div>

          {/* --- MAIN PANELS --- */}
          {docsUploaded && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: navCollapsed ? "36px 1fr" : "200px 1fr", gap: 14, marginBottom: 16, transition: "grid-template-columns 0.2s" }}>

                {/* Panel navigation */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                  {navCollapsed ? (
                    <button onClick={() => setNavCollapsed(false)} title="Afficher le flux de travail" style={{ width: 36, alignSelf: "flex-start", padding: "8px 0", borderRadius: 9, border: "1px solid #e0e0e0", background: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "#888" }}>
                      <span style={{ fontSize: 13 }}>{"\u25B6"}</span>
                      <span style={{ fontSize: 7, writingMode: "vertical-rl", textTransform: "uppercase", letterSpacing: "0.08em", color: "#bbb" }}>Flux</span>
                    </button>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px" }}>
                        <div style={{ fontSize: 9, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Flux de travail &rarr;</div>
                        <button onClick={() => setNavCollapsed(true)} title="Masquer" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#bbb", padding: "0 2px", lineHeight: 1 }}>&laquo;</button>
                      </div>
                      {Object.entries(ACTION_PANELS).map(([key, panel]) => {
                        const isActive = expandedPanel === key;
                        const currentOrder = ACTION_PANELS[expandedPanel].order;
                        const isDone = !isActive && panel.order < currentOrder;
                        const stepNum = panel.order;
                        return (
                          <button key={key} onClick={() => { setExpandedPanel(key); setSelectedAction(null); setExecuted(null); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, border: `2px solid ${isActive ? panel.color : isDone ? panel.color + "88" : "transparent"}`, background: isActive ? `${panel.color}10` : isDone ? `${panel.color}08` : "#fff", cursor: "pointer", textAlign: "left", transition: "all 0.12s", boxShadow: isActive ? `0 2px 8px ${panel.color}20` : "0 1px 3px rgba(0,0,0,0.04)" }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: isActive ? panel.color : isDone ? panel.color : "#ddd", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                              {isDone ? "\u2713" : stepNum}
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? panel.color : isDone ? panel.color : "#333" }}>{panel.label}</div>
                              <div style={{ fontSize: 9, color: isDone ? panel.color + "99" : "#999" }}>{isDone ? "Trait\u00e9 \u2713" : panel.navCount || `${panel.actions.length} ${key === "dispositifs" ? "dispositifs" : key === "livrables" ? "formats" : "actions"}`}</div>
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Content area */}
                <div style={{ ...S.card, padding: 16 }}>
                  {(() => {
                    const panel = ACTION_PANELS[expandedPanel];

                    // --- CARRIERE ---
                    if (expandedPanel === "carriere") {
                      const toggleRegime = (r) => setOpenRegimes((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
                      const regimes = [
                        { id: "cnav", label: "CNAV \u2014 R\u00e9gime de base", icon: "\u{1F3DB}\uFE0F", color: "#6C5CE7" },
                        { id: "agirc", label: "AGIRC-ARRCO \u2014 Compl\u00e9mentaire", icon: "\u{1F4CA}", color: "#0984E3" },
                        { id: "ircantec", label: "IRCANTEC \u2014 Agents non titulaires", icon: "\u{1F3E2}", color: "#00B894" },
                        { id: "rci", label: "RCI / SSI \u2014 Ind\u00e9pendants", icon: "\u{1F4CB}", color: "#E17055" },
                        { id: "per", label: "PER \u2014 \u00c9pargne retraite", icon: "\u{1F4BC}", color: "#D63031" },
                      ];
                      const ASSIMILES_TYPES = [
                        { key: "serviceNational", label: "Service national" },
                        { key: "chomageIndemnise", label: "Ch\u00f4mage indemnis\u00e9" },
                        { key: "chomageNonIndemnise", label: "Ch\u00f4mage non indemnis\u00e9" },
                        { key: "maladieAccident", label: "Maladie / AT-MP" },
                      ];
                      const thStyle = (c) => ({ padding: "5px 6px", textAlign: "right", fontWeight: 700, color: c, borderBottom: `1px solid ${c}20`, whiteSpace: "nowrap", fontSize: 10 });
                      const tdStyle = { padding: "4px 6px", fontSize: 10 };
                      const inputStyle = { width: 72, textAlign: "right", border: "1px solid #ddd", borderRadius: 4, fontSize: 10, padding: "1px 3px" };

                      return (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 18 }}>{"\u{1F4C8}"}</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#E17055" }}>Carri&egrave;re</span>
                              <span style={{ fontSize: 10, color: "#999" }}>&mdash; 5 r&eacute;gimes &middot; donn&eacute;es RIS</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: carriereValidee ? "#00B89415" : "#E1705515", color: carriereValidee ? "#00B894" : "#E17055", fontWeight: 700 }}>
                                {carriereValidee ? "\u{1F512} Valid\u00e9e consultant" : "\u{1F4E5} Import\u00e9e OCR"}
                              </span>
                              <button onClick={() => setCarriereValidee((v) => !v)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: "none", background: carriereValidee ? "#E1705520" : "#00B89420", color: carriereValidee ? "#E17055" : "#00B894", cursor: "pointer", fontWeight: 700 }}>
                                {carriereValidee ? "\u{1F513} D\u00e9verrouiller" : "\u{1F512} Valider & Verrouiller"}
                              </button>
                            </div>
                          </div>

                          {regimes.map((reg) => {
                            const isOpen = openRegimes.includes(reg.id);
                            return (
                              <div key={reg.id} style={{ marginBottom: 8, border: `1px solid ${reg.color}30`, borderRadius: 9, overflow: "hidden" }}>
                                <button onClick={() => toggleRegime(reg.id)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", background: isOpen ? `${reg.color}08` : "#fafafa", border: "none", cursor: "pointer", textAlign: "left" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 16 }}>{reg.icon}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: reg.color }}>{reg.label}</span>
                                  </div>
                                  <span style={{ fontSize: 14, color: reg.color }}>{isOpen ? "\u25B2" : "\u25BC"}</span>
                                </button>

                                {/* ========== CNAV ========== */}
                                {isOpen && reg.id === "cnav" && (
                                  <div style={{ padding: "12px 13px" }}>
                                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                                      <button onClick={() => setCnavSplitView((v) => !v)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: "1px solid #6C5CE740", background: "#6C5CE710", color: "#6C5CE7", cursor: "pointer", fontWeight: 600 }}>
                                        {cnavSplitView ? "\u2B07 Vue tableau \u00e9tendu" : "\u2B06 Vue partag\u00e9e"}
                                      </button>
                                    </div>
                                    <div style={{ display: cnavSplitView ? "grid" : "flex", flexDirection: cnavSplitView ? undefined : "column", gridTemplateColumns: cnavSplitView ? "1fr 280px" : undefined, gap: 12 }}>
                                      <div style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                                          <thead>
                                            <tr style={{ background: "#6C5CE710" }}>
                                              {["Ann\u00e9e", "Sal. r\u00e9els F/\u20AC", "Sal. SS F/\u20AC", "Coeff.", "Sal. revaloris\u00e9s", "D\u00e9pla.", "Trim.", "AR", "Total"].map((h) => (
                                                <th key={h} style={thStyle("#6C5CE7")}>{h}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {sortedYears.map((year, i) => {
                                              const isFranc = year <= 2001;
                                              const sal = cnavSalaries[year] || {};
                                              const isDeplaf = cnavDeplafonner[year] || false;
                                              const comp = cnavComputed[year];
                                              return (
                                                <tr key={year} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                                  <td style={{ ...tdStyle, fontWeight: 700, color: "#333" }}>{year}</td>
                                                  <td style={tdStyle}>
                                                    <input type="text" placeholder={isFranc ? "en Franc" : "en \u20ACuro"} value={sal.sr || ""} disabled={carriereValidee} onChange={(e) => { const val = e.target.value; setCnavSalaries((prev) => ({ ...prev, [year]: { ...prev[year], sr: val } })); handleCnavSimulateur(val, year, isDeplaf); }} style={inputStyle} />
                                                  </td>
                                                  <td style={{ ...tdStyle, textAlign: "right", color: "#555" }}>{sal.ss || ""}</td>
                                                  <td style={{ ...tdStyle, textAlign: "right", color: "#0984E3", fontWeight: 600 }}>{coeffRevalo[year] || ""}</td>
                                                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: "#1a1a2e" }}>{comp ? comp.revaloriseStr : "0"}</td>
                                                  <td style={{ ...tdStyle, textAlign: "center" }}>
                                                    {year < 2005 ? <input type="checkbox" checked={isDeplaf} disabled={carriereValidee} onChange={(e) => { const checked = e.target.checked; setCnavDeplafonner((prev) => ({ ...prev, [year]: checked })); if (sal.sr) handleCnavSimulateur(sal.sr, year, checked); }} style={{ cursor: carriereValidee ? "default" : "pointer" }} /> : <span style={{ color: "#ddd" }}>&mdash;</span>}
                                                  </td>
                                                  <td style={{ ...tdStyle, textAlign: "center" }}>{comp ? String(comp.trimestres) : "0"}</td>
                                                  <td style={{ ...tdStyle, textAlign: "center" }}></td>
                                                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, color: "#6C5CE7" }}>{comp ? String(comp.trimestres) : "0"}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* CNAV side panel */}
                                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {/* Trimestres assimilés */}
                                        <div style={{ border: "1px solid #6C5CE720", borderRadius: 8, overflow: "hidden" }}>
                                          <div style={{ background: "#6C5CE710", padding: "5px 9px", fontSize: 10, fontWeight: 700, color: "#6C5CE7" }}>Trimestres assimil&eacute;s</div>
                                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                                            <thead><tr style={{ background: "#f5f5f5" }}><th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600, color: "#555" }}>Type</th><th style={{ padding: "4px 8px", textAlign: "center", fontWeight: 600, color: "#555" }}>Nb</th><th style={{ padding: "4px 8px" }}></th></tr></thead>
                                            <tbody>
                                              {ASSIMILES_TYPES.map((item, i) => (
                                                <tr key={item.key} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                                  <td style={{ padding: "4px 8px", color: "#444" }}>{item.label}</td>
                                                  <td style={{ padding: "4px 8px", textAlign: "center" }}><input type="number" value={assimilatedInputs[item.key]} min="0" disabled={carriereValidee} onChange={(e) => { setAssimilatedInputs((prev) => ({ ...prev, [item.key]: parseInt(e.target.value, 10) || 0 })); }} style={{ width: 36, textAlign: "center", border: "1px solid #ddd", borderRadius: 4, fontSize: 10, padding: "1px 2px" }} /></td>
                                                  <td style={{ padding: "4px 8px" }}><button disabled={carriereValidee} onClick={() => handleAjouterTrimestres(item.key)} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, border: "1px solid #6C5CE740", background: "#6C5CE710", color: "#6C5CE7", cursor: carriereValidee ? "default" : "pointer" }}>+ Ajouter</button></td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                          {/* Enfants */}
                                          <div style={{ padding: "6px 8px", borderTop: "1px solid #f0f0f0" }}>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, fontSize: 9 }}>
                                              <div>Enfants : <input type="number" value={nombreEnfants} min="0" disabled={carriereValidee} onChange={(e) => setNombreEnfants(parseInt(e.target.value, 10) || 0)} style={{ width: 28, textAlign: "center", border: "1px solid #ddd", borderRadius: 3, fontSize: 9 }} /></div>
                                              <div>Genre : <select value={genre} disabled={carriereValidee} onChange={(e) => setGenre(e.target.value)} style={{ fontSize: 9, border: "1px solid #ddd", borderRadius: 3 }}><option value="femme">F</option><option value="homme">H</option></select></div>
                                              <div>Statut : <select value={statut} disabled={carriereValidee} onChange={(e) => setStatut(e.target.value)} style={{ fontSize: 9, border: "1px solid #ddd", borderRadius: 3 }}><option value="prive">Priv&eacute;</option><option value="fonctionnaire">Fonct.</option></select></div>
                                              <div><label style={{ fontSize: 9 }}><input type="checkbox" checked={enfantHandicap} disabled={carriereValidee} onChange={(e) => setEnfantHandicap(e.target.checked)} /> Handicap</label></div>
                                            </div>
                                            <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>Trim. enfant : <strong style={{ color: "#6C5CE7" }}>{trimestresEnfant}</strong></div>
                                          </div>
                                          {/* Totaux */}
                                          <div style={{ padding: "6px 8px", borderTop: "1px solid #f0f0f0", fontSize: 9 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cotis&eacute;s</span><strong>{totalTrimestresCotises}</strong></div>
                                            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Assimil&eacute;s</span><strong>{totalTrimestresAssimiles}</strong></div>
                                            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Enfant</span><strong>{trimestresEnfant}</strong></div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, padding: "4px 0", borderTop: "1px solid #6C5CE720", fontWeight: 700, color: "#6C5CE7" }}><span>TOTAL</span><span>{totalTrimestresGlobal}</span></div>
                                          </div>
                                        </div>

                                        {/* 25 meilleures années */}
                                        <div style={{ border: "1px solid #6C5CE720", borderRadius: 8, overflow: "hidden" }}>
                                          <div style={{ background: "#6C5CE710", padding: "5px 9px", fontSize: 10, fontWeight: 700, color: "#6C5CE7" }}>25 meilleures ann&eacute;es</div>
                                          <div style={{ padding: "4px 9px", fontSize: 10, color: "#555", maxHeight: 180, overflowY: "auto" }}>
                                            {defaultBestYears.map((r) => (
                                              <div key={r.year} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: "1px solid #f0f0f0" }}>
                                                <span style={{ color: "#888" }}>{r.year}</span>
                                                <span style={{ fontWeight: 700 }}>{r.display}</span>
                                              </div>
                                            ))}
                                          </div>
                                          <div style={{ padding: "6px 9px", borderTop: "1px solid #6C5CE720", fontSize: 10 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>SAM (25 meilleures)</span><span style={{ color: "#6C5CE7" }}>{formatNumber(totalBestYears)} &euro;</span></div>
                                            <div style={{ display: "flex", justifyContent: "space-between", color: "#888" }}><span>Moyenne annuelle</span><span>{formatNumber(moyenneAnnuelle)} &euro;</span></div>
                                          </div>
                                        </div>

                                        <div style={{ display: "flex", gap: 7 }}>
                                          <button disabled={carriereValidee} onClick={handleSimulationFinale} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", background: carriereValidee ? "#ddd" : "#6C5CE7", color: "#fff", fontWeight: 700, fontSize: 11, cursor: carriereValidee ? "default" : "pointer" }}>{"\u25B6"} Simuler</button>
                                          <button disabled={carriereValidee} onClick={handleResetAll} style={{ padding: "8px 12px", borderRadius: 7, border: "1px solid #ddd", background: "#fafafa", color: "#888", fontSize: 11, cursor: carriereValidee ? "default" : "pointer" }}>{"\u21BA"} R&eacute;initialiser</button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* ========== AGIRC-ARRCO ========== */}
                                {isOpen && reg.id === "agirc" && (
                                  <div style={{ padding: "12px 13px" }}>
                                    <div style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "center" }}>
                                      {["Non-Cadre", "Cadre"].map((opt, idx) => (
                                        <label key={opt} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                                          <input type="radio" name="cadre" checked={idx === 0 ? !isCadre : isCadre} disabled={carriereValidee} onChange={() => handleArrcoStatusChange(idx === 1)} /> {opt}
                                        </label>
                                      ))}
                                      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ fontSize: 10, color: "#0984E3", fontWeight: 600 }}>Points relev&eacute; :</span>
                                        <input type="text" value={arrcoPointsReleve} disabled={carriereValidee} onChange={(e) => setArrcoPointsReleve(e.target.value)} placeholder="Points" style={{ width: 80, textAlign: "right", border: "1px solid #0984E340", borderRadius: 5, fontSize: 10, padding: "3px 6px", fontWeight: 700, color: "#0984E3" }} />
                                      </div>
                                    </div>
                                    <div style={{ overflowX: "auto" }}>
                                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                                        <thead>
                                          <tr style={{ background: "#0984E310" }}>
                                            {["Ann\u00e9e", "Salaire F/\u20AC", "Taux TA", "Taux TB", "Sal. r\u00e9f.", "Tranche A", "Tranche B", "TOTAL"].map((h) => (
                                              <th key={h} style={thStyle("#0984E3")}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {sortedYears.map((year, i) => {
                                            const isFranc = year <= 2001;
                                            const display = arrcoTauxDisplay[year] || {};
                                            const comp = arrcoComputed[year];
                                            return (
                                              <tr key={year} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                                <td style={{ ...tdStyle, fontWeight: 700 }}>{year}</td>
                                                <td style={tdStyle}>
                                                  <input type="text" placeholder={isFranc ? "en Franc" : "en \u20ACuro"} value={arrcoSalaries[year] || ""} disabled={carriereValidee} onChange={(e) => handleArrcoSalaryChange(year, e.target.value, isCadre)} style={inputStyle} />
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: "right", color: "#888" }}>{display.tauxA || ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", color: "#888" }}>{display.tauxB || ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", color: "#888" }}>{display.ref || ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#0984E3" }}>{comp ? comp.trancheA : ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#0984E3" }}>{comp ? comp.trancheB : ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{comp ? comp.total : ""}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* ========== IRCANTEC ========== */}
                                {isOpen && reg.id === "ircantec" && (
                                  <div style={{ padding: "12px 13px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                                      <span style={{ fontSize: 10, color: "#00B894", fontWeight: 600 }}>Points relev&eacute; :</span>
                                      <input type="text" value={ircantecPointsReleve} disabled={carriereValidee} onChange={(e) => setIrcantecPointsReleve(e.target.value)} placeholder="Points" style={{ width: 80, textAlign: "right", border: "1px solid #00B89440", borderRadius: 5, fontSize: 10, padding: "3px 6px", fontWeight: 700, color: "#00B894" }} />
                                    </div>
                                    <div style={{ overflowX: "auto" }}>
                                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                                        <thead>
                                          <tr style={{ background: "#00B89410" }}>
                                            {["Ann\u00e9e", "Salaire F/\u20AC", "Taux TA", "Taux TB", "Sal. r\u00e9f.", "Tranche A", "Tranche B", "TOTAL"].map((h) => (
                                              <th key={h} style={thStyle("#00B894")}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {sortedYears.map((year, i) => {
                                            const isFranc = year <= 2001;
                                            const display = ircantecTauxDisplay[year] || {};
                                            const comp = ircantecComputed[year];
                                            return (
                                              <tr key={year} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                                <td style={{ ...tdStyle, fontWeight: 700 }}>{year}</td>
                                                <td style={tdStyle}>
                                                  <input type="text" placeholder={isFranc ? "en Franc" : "en \u20ACuro"} value={ircantecSalaries[year] || ""} disabled={carriereValidee} onChange={(e) => { const val = e.target.value; setIrcantecSalaries((prev) => ({ ...prev, [year]: val })); handleIrcantecSimulateur(val, year); }} style={inputStyle} />
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: "right", color: "#888" }}>{display.tauxA || ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", color: "#888" }}>{display.tauxB || ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", color: "#888" }}>{display.ref || ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#00B894" }}>{comp ? comp.tra : ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#00B894" }}>{comp ? comp.trb : ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{comp ? comp.total : ""}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* ========== RCI ========== */}
                                {isOpen && reg.id === "rci" && (
                                  <div style={{ padding: "12px 13px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                                      <span style={{ fontSize: 10, color: "#E17055", fontWeight: 600 }}>Points relev&eacute; :</span>
                                      <input type="text" value={rciPointsReleve} disabled={carriereValidee} onChange={(e) => setRciPointsReleve(e.target.value)} placeholder="Points" style={{ width: 80, textAlign: "right", border: "1px solid #E1705540", borderRadius: 5, fontSize: 10, padding: "3px 6px", fontWeight: 700, color: "#E17055" }} />
                                    </div>
                                    <div style={{ overflowX: "auto" }}>
                                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                                        <thead>
                                          <tr style={{ background: "#E1705510" }}>
                                            {["Ann\u00e9e", "Revenu \u20AC", "Taux T1", "Taux T2", "Prix pt. \u20AC", "Tranche 1", "Tranche 2", "TOTAL"].map((h) => (
                                              <th key={h} style={thStyle("#E17055")}>{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {rciSortedYears.map((year, i) => {
                                            const display = rciTauxDisplay[year] || {};
                                            const comp = rciComputed[year];
                                            return (
                                              <tr key={year} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                                <td style={{ ...tdStyle, fontWeight: 700 }}>{year}</td>
                                                <td style={tdStyle}>
                                                  <input type="text" placeholder={year >= 2002 ? "en Euro" : "en Francs"} value={rciSalaries[year] || ""} disabled={carriereValidee} onChange={(e) => { const val = e.target.value; setRciSalaries((prev) => ({ ...prev, [year]: val })); handleRciSimulateur(val, year); }} style={inputStyle} />
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: "right", color: "#888" }}>{display.tauxA || ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", color: "#888" }}>{display.tauxB || ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", color: "#888" }}>{display.ref || ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#E17055" }}>{comp ? comp.tra : ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: "#E17055" }}>{comp ? comp.trb : ""}</td>
                                                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{comp ? comp.total : ""}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {isOpen && reg.id === "per" && (
                                  <div style={{ padding: "14px 13px", color: "#888", fontSize: 11 }}><em>PER &mdash; &eacute;pargne retraite individuelle ou collective. Section &agrave; d&eacute;velopper.</em></div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    // --- DISPOSITIFS ---
                    if (expandedPanel === "dispositifs") {
                      return (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 18 }}>{panel.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: panel.color }}>{panel.label}</span>
                            <span style={{ fontSize: 10, color: "#999" }}>&mdash; Activez les dispositifs, l&rsquo;IA calcule les dates</span>
                          </div>
                          <div style={{ fontSize: 10, color: "#888", marginBottom: 14 }}>{panel.desc}</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 7 }}>
                            {panel.actions.map((action) => {
                              const ok = checkReq(action.requires);
                              const miss = getMissing(action.requires);
                              const isActivated = activatedDispositifs.includes(action.id);
                              const isDetected = !!MOCK_DETECTED_DISPOSITIFS[action.id];
                              return (
                                <button key={action.id} onClick={() => { if (ok) toggleDispositif(action.id); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", borderRadius: 8, border: `2px solid ${isActivated ? panel.color : ok ? "#e8e8e8" : "#f0f0f0"}`, background: isActivated ? `${panel.color}12` : ok ? "#fafafa" : "#f8f8f8", cursor: ok ? "pointer" : "not-allowed", textAlign: "left", opacity: ok ? 1 : 0.45, transition: "all 0.12s", position: "relative" }}>
                                  <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${isActivated ? panel.color : "#ccc"}`, background: isActivated ? panel.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, color: "#fff" }}>{isActivated && "\u2713"}</div>
                                  <span style={{ fontSize: 15, flexShrink: 0 }}>{action.icon}</span>
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                      <div style={{ fontSize: 11, fontWeight: isActivated ? 700 : 600, color: isActivated ? panel.color : ok ? "#333" : "#999" }}>{action.label}</div>
                                      {isDetected && !isActivated && ok && (<span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "#F9A825", color: "#fff", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>{"\u{1F4A1}"} D&eacute;tect&eacute;</span>)}
                                    </div>
                                    <div style={{ fontSize: 9, color: "#888" }}>{action.desc}</div>
                                    {action.generates_date && <div style={{ fontSize: 8, color: "#0984E3", marginTop: 1 }}>{"\u{1F4C5}"} G&eacute;n&egrave;re une date de simulation</div>}
                                    {!ok && <div style={{ fontSize: 8, color: "#D63031", marginTop: 1 }}>{"\u26A0"} Manque : {miss.map((m) => DOC_TYPES.find((d) => d.id === m)?.label).join(", ")}</div>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {activatedDispositifs.length > 0 && panel.actions.filter(a => a.hasInput && activatedDispositifs.includes(a.id)).length > 0 && (
                            <div style={{ marginTop: 12, padding: "10px 12px", background: "#00B89408", borderRadius: 8, border: "1px solid #00B89420" }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#00B894", marginBottom: 8 }}>Param&egrave;tres des dispositifs activ&eacute;s :</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                                {panel.actions.filter(a => a.hasInput && activatedDispositifs.includes(a.id)).map(a => (
                                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 13 }}>{a.icon}</span>
                                    <label style={{ fontSize: 10, fontWeight: 600, color: "#555" }}>{a.inputLabel} :</label>
                                    <input type={a.inputType === "date" ? "date" : "number"} placeholder={a.inputType === "date" ? "" : "Ex: 3"} value={inputValues[a.id] || ""} onChange={(e) => setInputValues({ ...inputValues, [a.id]: e.target.value })} style={{ padding: "4px 7px", borderRadius: 5, border: "1px solid #ccc", fontSize: 11, width: a.inputType === "date" ? 130 : 60, fontFamily: "inherit" }} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {activatedDispositifs.length > 0 && (
                            <div style={{ marginTop: 12, padding: "10px 12px", background: `${panel.color}08`, borderRadius: 8, border: `1px solid ${panel.color}20` }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: panel.color, marginBottom: 2 }}>Dispositifs activ&eacute;s :</div>
                              <div style={{ fontSize: 11, color: "#333" }}>{activatedDispositifs.map(aid => panel.actions.find(a => a.id === aid)?.label).join(" \u00b7 ")}</div>
                              <div style={{ marginTop: 8 }}>
                                <button onClick={() => setShowAutoResults(true)} style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: panel.color, color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{"\u25B6"} Calculer les dates et sc&eacute;narios</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // --- DATES & SIMULATIONS ---
                    if (expandedPanel === "dates") {
                      return (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 18 }}>{panel.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: panel.color }}>{panel.label}</span>
                          </div>
                          <div style={{ fontSize: 10, color: "#888", marginBottom: 14 }}>{panel.desc}</div>

                          {activatedDispositifs.length > 0 && showAutoResults && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#00B894", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}><span>{"\u{1F916}"}</span> Dates calcul&eacute;es automatiquement depuis les dispositifs activ&eacute;s</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {MOCK_AUTO_DATES.map((d, i) => (
                                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: `${d.color}08`, borderLeft: `3px solid ${d.color}` }}>
                                    <div style={{ textAlign: "center", minWidth: 70 }}>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: d.color }}>{d.date}</div>
                                      <div style={{ fontSize: 10, color: "#888" }}>{d.age}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 11, fontWeight: 600 }}>Via : {d.source}</div>
                                      <div style={{ fontSize: 10, color: "#666" }}>{d.detail}</div>
                                    </div>
                                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: `${d.color}18`, color: d.color, fontWeight: 700 }}>Auto</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {activatedDispositifs.length === 0 && (
                            <div style={{ padding: "16px", textAlign: "center", color: "#999", fontSize: 11, background: "#fafafa", borderRadius: 8, marginBottom: 14 }}>{"\u{1F4A1}"} Activez d&rsquo;abord des dispositifs (&eacute;tape 2) pour que l&rsquo;IA calcule automatiquement les dates de d&eacute;part possibles</div>
                          )}

                          <div style={{ fontSize: 11, fontWeight: 700, color: "#0984E3", marginBottom: 8 }}>Dates standard :</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 7 }}>
                            {panel.actions.map((action) => {
                              const ok = checkReq(action.requires);
                              const sel = selectedAction?.id === action.id;
                              const isExcluded = excludedDates.includes(action.id);
                              const isDateLibre = action.id === "sim_date_libre";
                              return (
                                <button key={action.id} onClick={() => { if (!ok) return; if (isDateLibre) { setSelectedAction(sel ? null : action); setPromptText("\u{1F4C5} Date libre : JJ/MM/AAAA\n"); setCommentairesMode(true); } else { setSelectedAction(sel ? null : action); } setExecuted(null); }}
                                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", borderRadius: 8, border: `2px solid ${sel ? panel.color : "#e8e8e8"}`, background: sel ? `${panel.color}10` : "#fafafa", cursor: ok ? "pointer" : "not-allowed", textAlign: "left", opacity: isExcluded ? 0.45 : ok ? 1 : 0.45 }}>
                                  <span style={{ fontSize: 15, flexShrink: 0 }}>{action.icon}</span>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, fontWeight: sel ? 700 : 600, color: sel ? panel.color : "#333", textDecoration: isExcluded ? "line-through" : "none" }}>{action.label}</div>
                                    <div style={{ fontSize: 9, color: "#888" }}>{isDateLibre && sel ? "\u2192 Saisir dans le Syst\u00e8me prompt IA \u2190" : action.desc}</div>
                                  </div>
                                  {action.auto && (
                                    <span onClick={(e) => { e.stopPropagation(); setExcludedDates((prev) => prev.includes(action.id) ? prev.filter((x) => x !== action.id) : [...prev, action.id]); }}
                                      title={isExcluded ? "R\u00e9activer ce calcul" : "Exclure ce calcul"}
                                      style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: isExcluded ? "#E1705525" : "#0984E312", color: isExcluded ? "#C0392B" : "#0984E3", fontWeight: 700, marginLeft: "auto", flexShrink: 0, cursor: "pointer", border: `1px solid ${isExcluded ? "#C0392B40" : "transparent"}` }}>
                                      {isExcluded ? "\u2716 Exclu" : "\u2713 Calcul\u00e9"}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          <div style={{ marginTop: 16, padding: "12px 14px", background: "linear-gradient(135deg, #1a1a2e08, #0984E308)", borderRadius: 9, border: "1px solid #0984E320", display: "flex", alignItems: "center", gap: 24 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#555", flexShrink: 0 }}>{"\u{1F4B0}"} Estimation pension</div>
                            <div style={{ display: "flex", gap: 20, flex: 1, flexWrap: "wrap" }}>
                              <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#ccc" }}>&mdash; &euro;</div><div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Brut / mois</div></div>
                              <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 700, color: "#ccc" }}>&mdash; %</div><div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Taux PAS</div></div>
                              <div style={{ textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 800, color: "#ccc" }}>&mdash; &euro;</div><div style={{ fontSize: 9, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Net / mois</div></div>
                            </div>
                            <div style={{ fontSize: 9, color: "#bbb", flexShrink: 0, fontStyle: "italic" }}>calcul&eacute; apr&egrave;s simulation &middot; tous r&eacute;gimes</div>
                          </div>

                          <div style={{ marginTop: 10, padding: "10px 12px", background: "#f8f8f8", borderRadius: 8, border: "1px solid #eee" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 8 }}>{"\u{1F504}"} R&eacute;sultats automatiques (calcul&eacute;s pour chaque simulation) :</div>
                            <div style={{ display: "flex", gap: 8 }}>
                              {AUTO_RESULTS.map((ar) => (
                                <div key={ar.id} style={{ flex: 1, padding: "8px 10px", borderRadius: 7, background: `${ar.color}06`, border: `1px solid ${ar.color}18` }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}><span style={{ fontSize: 13 }}>{ar.icon}</span><span style={{ fontSize: 10, fontWeight: 700, color: ar.color }}>{ar.label}</span></div>
                                  <div style={{ fontSize: 9, color: "#888" }}>{ar.desc}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // --- LIVRABLES ---
                    if (expandedPanel === "livrables") {
                      return (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 18 }}>{panel.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: panel.color }}>{panel.label}</span>
                          </div>
                          <div style={{ fontSize: 10, color: "#888", marginBottom: 14 }}>{panel.desc}</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                            {panel.actions.map((action) => {
                              const sel = selectedAction?.id === action.id;
                              return (
                                <button key={action.id} onClick={() => { setSelectedAction(sel ? null : action); setExecuted(null); }} style={{ padding: "16px 14px", borderRadius: 10, border: `2px solid ${sel ? panel.color : "#e8e8e8"}`, background: sel ? `${panel.color}08` : "#fafafa", cursor: "pointer", textAlign: "center", transition: "all 0.12s" }}>
                                  <span style={{ fontSize: 28, display: "block", marginBottom: 6 }}>{action.icon}</span>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: sel ? panel.color : "#333", marginBottom: 4 }}>{action.label}</div>
                                  <div style={{ fontSize: 10, color: "#888", marginBottom: 6 }}>{action.desc}</div>
                                  <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 10, background: `${panel.color}12`, color: panel.color, fontWeight: 700 }}>{action.pages}</span>
                                </button>
                              );
                            })}
                          </div>
                          {selectedAction && (
                            <div style={{ marginTop: 14, borderTop: "1px solid #eee", paddingTop: 14 }}>
                              <div style={{ background: "#F0EDFF", borderRadius: 7, padding: 10, marginBottom: 10, border: "1px solid #6C5CE720" }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: "#6C5CE7", marginBottom: 3 }}>{"\u{1F4CB}"} PROMPT STRICT :</div>
                                <div style={{ fontSize: 10, color: "#333", lineHeight: 1.6, ...S.mono }}>[Prompt calibr&eacute; pour &quot;{selectedAction.label}&quot; &mdash; int&egrave;gre tous les dispositifs activ&eacute;s ({activatedDispositifs.length}), les dates calcul&eacute;es, les r&eacute;sultats automatiques (surcote, minimum contributif, majoration enfants). Niveau de d&eacute;tail : {selectedAction.pages}]</div>
                              </div>
                              <button onClick={() => setExecuted(selectedAction)} style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: panel.color, color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{"\u25B6"} G&eacute;n&eacute;rer le {selectedAction.label.toLowerCase()}</button>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // --- ANALYSE DOCUMENTS (default) ---
                    return (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 18 }}>{panel.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: panel.color }}>{panel.label}</span>
                          <span style={{ fontSize: 10, color: "#999" }}>&mdash; {panel.actions.length} actions disponibles</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#888", marginBottom: 14 }}>{panel.desc}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 7 }}>
                          {panel.actions.map((action) => {
                            const ok = checkReq(action.requires);
                            const miss = getMissing(action.requires);
                            const sel = selectedAction?.id === action.id;
                            return (
                              <button key={action.id} onClick={() => { if (ok) { setSelectedAction(sel ? null : action); setExecuted(null); setCommentairesMode(false); setPromptText(sel ? "" : `[Prompt calibr\u00e9 pour "${action.label}". Voir Admin \u2192 Prompts IA pour le contenu complet.]`); } }}
                                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", borderRadius: 8, border: `2px solid ${sel ? panel.color : ok ? "#e8e8e8" : "#f0f0f0"}`, background: sel ? `${panel.color}10` : ok ? "#fafafa" : "#f8f8f8", cursor: ok ? "pointer" : "not-allowed", textAlign: "left", opacity: ok ? 1 : 0.45 }}>
                                <span style={{ fontSize: 15, flexShrink: 0 }}>{action.icon}</span>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 11, fontWeight: sel ? 700 : 600, color: sel ? panel.color : ok ? "#333" : "#999" }}>{action.label}</div>
                                  <div style={{ fontSize: 9, color: "#888" }}>{action.desc}</div>
                                  {!ok && <div style={{ fontSize: 8, color: "#D63031", marginTop: 1 }}>{"\u26A0"} Manque : {miss.map((m) => DOC_TYPES.find((d) => d.id === m)?.label).join(", ")}</div>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {selectedAction && (
                          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#6C5CE708", borderRadius: 7, border: "1px solid #6C5CE720" }}>
                            <span style={{ fontSize: 13 }}>{selectedAction.icon}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#6C5CE7" }}>{selectedAction.label}</span>
                            <span style={{ fontSize: 9, color: "#888", marginLeft: "auto" }}>&rarr; Prompt charg&eacute; ci-dessous</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Systeme prompt IA */}
              <div style={{ ...S.card, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{"\u{1F4AC}"} Syst&egrave;me prompt IA</div>
                <div style={{ fontSize: 10, color: "#888", marginBottom: 10 }}>En compl&eacute;ment des actions structur&eacute;es &mdash; l&rsquo;IA reformule et mappe vers les &eacute;tapes du flux</div>
                <textarea readOnly={!commentairesMode} value={promptText} onChange={(e) => commentairesMode && setPromptText(e.target.value)}
                  placeholder="S&eacute;lectionnez une analyse ci-dessus ou saisissez une instruction libre&hellip;"
                  style={{ width: "100%", padding: "9px 11px", borderRadius: 7, border: `1px solid ${commentairesMode ? "#6C5CE7" : "#ddd"}`, fontSize: 11, fontFamily: "inherit", resize: "vertical", minHeight: 60, boxSizing: "border-box", background: commentairesMode ? "#FDFCFF" : "#fafafa", color: "#333" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setCommentairesMode(!commentairesMode)} style={{ padding: "8px 14px", borderRadius: 7, border: "1px solid #6C5CE7", background: commentairesMode ? "#6C5CE712" : "transparent", color: "#6C5CE7", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>{"\u270F\uFE0F"} {commentairesMode ? "Fermer" : "Ajouter du contexte"}</button>
                  <button onClick={() => setExecuted(selectedAction)} style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: "linear-gradient(135deg, #6C5CE7, #a29bfe)", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{"\u25B6"} Ex&eacute;cuter</button>
                </div>
                {executed && (
                  <div style={{ background: "#F8FFF8", borderRadius: 7, padding: 10, marginTop: 10, border: "1px solid #00B89420" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#00B894", marginBottom: 4 }}>{"\u{1F916}"} R&eacute;sultat :</div>
                    <div style={{ fontSize: 11, color: "#555", lineHeight: 1.6 }}>[R&eacute;sultat structur&eacute; de l&rsquo;analyse]</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== ADMIN MODE ===== */}
      {mode === "admin" && (
        <div>
          <div style={{ background: "linear-gradient(135deg, #E17055 0%, #D63031 100%)", borderRadius: 11, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{"\u2699\uFE0F"} Administration du moteur IA</div>
              <div style={{ color: "#FFEAA7", fontSize: 10, marginTop: 2 }}>R&egrave;gles m&eacute;tier &middot; Param&egrave;tres annuels &middot; Formules &middot; Prompts &middot; Architecture</div>
            </div>
            <div style={{ fontSize: 10, color: "#fff", background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>{"\u{1F512}"} Acc&egrave;s administrateur</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {Object.entries(ADMIN_SECTIONS).map(([key, sec]) => (
                <button key={key} onClick={() => { setAdminSection(key); setExpandedRule(null); setExpandedParam(null); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, border: `2px solid ${adminSection === key ? sec.color : "transparent"}`, background: adminSection === key ? `${sec.color}10` : "#fff", cursor: "pointer", textAlign: "left", boxShadow: adminSection === key ? `0 2px 8px ${sec.color}20` : "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <span style={{ fontSize: 18 }}>{sec.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: adminSection === key ? sec.color : "#333" }}>{sec.label}</div>
                    <div style={{ fontSize: 9, color: "#999" }}>{sec.items?.length ? `${sec.items.length} \u00e9l\u00e9ments` : sec.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ ...S.card, padding: 18 }}>

              {/* REGLES */}
              {adminSection === "regles" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                    <span style={{ fontSize: 18 }}>{"\u{1F4D6}"}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#6C5CE7" }}>R&egrave;gles m&eacute;tier</span>
                    <span style={{ fontSize: 10, color: "#888" }}>&mdash; Fichiers .md + liens l&eacute;gislation officielle</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {ADMIN_SECTIONS.regles.items.map((rule, i) => {
                      const hasMd = !!rule.contentKey && !!MD_CONTENT[rule.contentKey];
                      return (
                        <div key={rule.id} style={{ borderRadius: 8, border: `1px solid ${rule.missing ? "#eee" : expandedRule === i ? "#6C5CE730" : "#eee"}`, overflow: "hidden", opacity: rule.missing ? 0.55 : 1 }}>
                          <div onClick={() => setExpandedRule(expandedRule === i ? null : i)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", cursor: "pointer", background: expandedRule === i ? "#6C5CE706" : "#fafafa" }}>
                            <span style={{ fontSize: 16 }}>{rule.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{rule.label}</div>
                              <div style={{ fontSize: 10, color: "#888" }}>{rule.desc}</div>
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                              {hasMd ? <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#6C5CE712", color: "#6C5CE7", fontWeight: 600 }}>{"\u{1F4C4}"} {rule.file}</span>
                                : <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#D6303115", color: "#D63031", fontWeight: 600 }}>{"\u26A0"} Fichier manquant</span>}
                              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#0984E312", color: "#0984E3", fontWeight: 600 }}>{"\u{1F310}"} Officiel</span>
                            </div>
                          </div>
                          {expandedRule === i && (
                            <div style={{ padding: "10px 12px", borderTop: "1px solid #eee", background: "#fff" }}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {hasMd ? (
                                  <button onClick={() => setModal({ title: MD_CONTENT[rule.contentKey].title, content: MD_CONTENT[rule.contentKey].content, lines: MD_CONTENT[rule.contentKey].lines, color: "#6C5CE7" })} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #6C5CE7", background: "#6C5CE708", color: "#6C5CE7", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>{"\u{1F4C4}"} Ouvrir {rule.file}</button>
                                ) : (
                                  <span style={{ fontSize: 10, color: "#D63031", padding: "6px 0" }}>{"\u26A0"} Fichier MD &agrave; cr&eacute;er dans 01_REGLEMENTATION/</span>
                                )}
                                <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #0984E3", background: "#0984E308", color: "#0984E3", fontWeight: 600, fontSize: 10, cursor: "pointer" }}>{"\u{1F310}"} Site officiel</button>
                                <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #00B894", background: "#00B89408", color: "#00B894", fontWeight: 600, fontSize: 10, cursor: "pointer" }}>{"\u270F\uFE0F"} &Eacute;diter</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PARAMETRES */}
              {adminSection === "parametres" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 18 }}>{"\u{1F4CA}"}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#0984E3" }}>Param&egrave;tres annuels</span>
                    </div>
                    <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "#E1705515", color: "#E17055", fontWeight: 700 }}>{"\u26A0"} &Agrave; mettre &agrave; jour chaque ann&eacute;e</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {ADMIN_SECTIONS.parametres.items.map((param, i) => (
                      <div key={param.id} onClick={() => setExpandedParam(expandedParam === i ? null : i)} style={{ borderRadius: 8, border: `1px solid ${expandedParam === i ? "#0984E330" : "#eee"}`, padding: "10px 12px", cursor: "pointer", background: expandedParam === i ? "#0984E306" : "#fafafa" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                            <span style={{ fontSize: 14 }}>{param.icon}</span>
                            <div><div style={{ fontSize: 11, fontWeight: 600 }}>{param.label}</div><div style={{ fontSize: 9, color: "#888" }}>{param.desc}</div></div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0984E3" }}>{param.value}</div>
                            <div style={{ fontSize: 9, color: "#999" }}>{param.year}{param.maj ? ` \u00b7 m\u00e0j ${param.maj}` : ""}</div>
                          </div>
                        </div>
                        {param.csgDetail && expandedParam === i && (
                          <div style={{ marginTop: 7 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                              <thead><tr style={{ background: "#f5f5f5" }}>{["Taux CSG", "Cat\u00e9gorie", "CRDS 0,5%", "CASA 0,3%"].map((h) => (<th key={h} style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600, color: "#555" }}>{h}</th>))}</tr></thead>
                              <tbody>
                                {param.csgDetail.map((row, j) => (
                                  <tr key={j} style={{ background: j % 2 === 0 ? "#fff" : "#fafafa" }}>
                                    <td style={{ padding: "4px 8px", fontWeight: 700, color: "#0984E3" }}>{row.taux}</td>
                                    <td style={{ padding: "4px 8px", color: "#555" }}>{row.label}</td>
                                    <td style={{ padding: "4px 8px", textAlign: "center" }}>{row.crds ? "\u2713" : "\u2717"}</td>
                                    <td style={{ padding: "4px 8px", textAlign: "center" }}>{(row.taux === "6,6%" || row.taux === "8,3%") ? "\u2713" : "\u2717"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {expandedParam === i && (
                          <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                            <button style={{ fontSize: 9, padding: "4px 10px", borderRadius: 5, border: "1px solid #E17055", background: "#E1705508", color: "#E17055", fontWeight: 600, cursor: "pointer" }}>{"\u270F\uFE0F"} Modifier</button>
                            <button style={{ fontSize: 9, padding: "4px 10px", borderRadius: 5, border: "1px solid #888", background: "#88888808", color: "#888", fontWeight: 600, cursor: "pointer" }}>{"\u{1F4CA}"} Historique</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FORMULES */}
              {adminSection === "formules" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                    <span style={{ fontSize: 18 }}>{"\u{1F9EE}"}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#00B894" }}>Formules de calcul</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ADMIN_SECTIONS.formules.items.map((f) => (
                      <div key={f.id} style={{ borderRadius: 8, padding: "12px 14px", background: "#fafafa", border: "1px solid #eee", borderLeft: "3px solid #00B894" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><span style={{ fontSize: 14 }}>{f.icon}</span><span style={{ fontSize: 12, fontWeight: 700, color: "#00B894" }}>{f.label}</span></div>
                        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'IBM Plex Mono', 'Courier New', monospace", background: "#fff", borderRadius: 5, padding: "8px 10px", border: "1px solid #00B89420", marginBottom: 4 }}>{f.formula}</div>
                        <div style={{ fontSize: 10, color: "#666" }}>{f.desc}</div>
                        <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                          <button style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, border: "1px solid #00B894", background: "transparent", color: "#00B894", fontWeight: 600, cursor: "pointer" }}>{"\u{1F4D6}"} R&egrave;gle</button>
                          <button style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, border: "1px solid #0984E3", background: "transparent", color: "#0984E3", fontWeight: 600, cursor: "pointer" }}>{"\u{1F4CA}"} Param&egrave;tres</button>
                          <button style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, border: "1px solid #E17055", background: "transparent", color: "#E17055", fontWeight: 600, cursor: "pointer" }}>{"\u270F\uFE0F"} &Eacute;diter</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PROMPTS */}
              {adminSection === "prompts" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                    <span style={{ fontSize: 18 }}>{"\u{1F916}"}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#E17055" }}>Prompts IA & Skills N8N</span>
                    <span style={{ fontSize: 10, color: "#999" }}>&mdash; {ADMIN_SKILL_PROMPTS.filter(p => !p.missing).length} fichiers &middot; {ADMIN_SKILL_PROMPTS.filter(p => p.missing).length} manquants</span>
                  </div>
                  {["Workflow principal", "Skills N8N", "Manquants \u2014 \u00e0 cr\u00e9er"].map((cat) => {
                    const items = ADMIN_SKILL_PROMPTS.filter(p => p.category === cat);
                    return (
                      <div key={cat} style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: cat.includes("Manquants") ? "#D63031" : "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${cat.includes("Manquants") ? "#D6303120" : "#eee"}` }}>
                          {cat.includes("Manquants") ? "\u26A0 " : ""}{cat}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          {items.map((skill) => {
                            const hasContent = !!skill.contentKey && !!MD_CONTENT[skill.contentKey];
                            return (
                              <div key={skill.id} style={{ borderRadius: 7, padding: "9px 11px", background: skill.missing ? "#fafafa" : "#fff", border: `1px solid ${skill.missing ? "#f0f0f0" : "#e0e0e0"}`, borderLeft: `3px solid ${skill.missing ? "#ddd" : skill.color}`, opacity: skill.missing ? 0.6 : 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                                  <span style={{ fontSize: 14 }}>{skill.icon}</span>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: skill.missing ? "#aaa" : skill.color, flex: 1 }}>{skill.label}</span>
                                  {skill.missing && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "#D6303115", color: "#D63031", fontWeight: 700 }}>&Agrave; cr&eacute;er</span>}
                                </div>
                                <div style={{ display: "flex", gap: 4 }}>
                                  {hasContent ? (
                                    <button onClick={() => setModal({ title: MD_CONTENT[skill.contentKey].title, content: MD_CONTENT[skill.contentKey].content, lines: MD_CONTENT[skill.contentKey].lines, color: skill.color })} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, border: `1px solid ${skill.color}`, background: `${skill.color}08`, color: skill.color, fontWeight: 700, cursor: "pointer" }}>{"\u{1F4C4}"} Voir le prompt</button>
                                  ) : (
                                    <span style={{ fontSize: 9, color: "#D63031" }}>Fichier manquant</span>
                                  )}
                                  {!skill.missing && <button style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, border: "1px solid #888", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>{"\u270F\uFE0F"} &Eacute;diter</button>}
                                  {!skill.missing && <button style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, border: "1px solid #00B894", background: "transparent", color: "#00B894", fontWeight: 600, cursor: "pointer" }}>{"\u{1F9EA}"} Tester</button>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* REGISTRE D'ERREURS */}
              {adminSection === "registre" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{"\u{1F6A8}"}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#D63031" }}>Registre d&rsquo;erreurs</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 14 }}>R&egrave;gles Gate #2 &mdash; chaque erreur captur&eacute;e bloque automatiquement les calculs incoh&eacute;rents</div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    {[{ label: "R\u00e8gles actives", val: REGISTRE_ERREURS.length, color: "#D63031" }, { label: "R\u00e8gles archiv\u00e9es", val: 0, color: "#888" }, { label: "Derni\u00e8re m\u00e0j", val: "06/11/2025", color: "#555" }].map((s) => (
                      <div key={s.label} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "#fafafa", border: "1px solid #eee", textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#D63031", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{"\u{1F534}"} R&egrave;gles actives (Gate #2)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {REGISTRE_ERREURS.map((r) => (
                      <div key={r.id} style={{ borderRadius: 8, border: "1px solid #D6303120", background: "#fff", overflow: "hidden" }}>
                        <button onClick={() => setModal({ title: `${r.id} \u2014 ${r.title}`, color: "#D63031", lines: 10, content: `R\u00c8GLE ${r.id} \u2014 Gate #2\n${"=".repeat(50)}\n\nTitre         : ${r.title}\nDate d'ajout  : ${r.date}\nPrompt        : ${r.prompt}\n\nErreur        : ${r.erreur}\n\nCondition     : ${r.condition}\n\nMessage       :\n${r.message}\n\nImpact        : ${r.impact}\n\nStatut        : \u2713 ACTIF \u2014 \u{1F534} CRITIQUE (bloquant)` })}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: "#D63031", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>{"\u{1F534}"} {r.id}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a2e", flex: 1 }}>{r.title}</span>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 9, color: "#888" }}>{r.date}</span>
                            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "#D6303110", color: "#D63031", fontWeight: 700 }}>CRITIQUE</span>
                            <span style={{ fontSize: 9, color: "#6C5CE7" }}>{"\u{1F4C4}"} Voir &rarr;</span>
                          </div>
                        </button>
                        <div style={{ padding: "0 13px 8px 13px", borderTop: "1px solid #f5f5f5" }}>
                          <code style={{ fontSize: 9, color: "#555", background: "#f5f5f5", padding: "3px 7px", borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace" }}>{r.condition}</code>
                          <span style={{ fontSize: 9, color: "#999", marginLeft: 8 }}>{r.erreur}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button style={{ marginTop: 12, width: "100%", padding: "9px 0", borderRadius: 8, border: "2px dashed #D6303140", background: "transparent", color: "#D63031", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Ajouter une r&egrave;gle (PROMPT 3)</button>
                </div>
              )}

              {/* FLUX */}
              {adminSection === "flux" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                    <span style={{ fontSize: 18 }}>{"\u{1F504}"}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#D63031" }}>Flux & Architecture V6</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {[
                      { s: "1", t: "Analyse documents", d: "Rapprochements RIS vs autres sources \u2014 5 actions", c: "#6C5CE7" },
                      { s: "2", t: "Dispositifs", d: "Activer RACL, VPLR, progressive, ch\u00f4mage, cumul, arr\u00eat\u2026 (9 dispositifs)", c: "#00B894" },
                      { s: "3", t: "Dates & Simulations", d: "Dates auto-calcul\u00e9es par l\u2019IA + \u00e2ge l\u00e9gal, taux plein, 67 ans, date libre", c: "#0984E3" },
                      { s: "4", t: "Livrables", d: "Rapport consultation (1p), Simulation (1p), Audit (30p)", c: "#D63031" },
                    ].map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 36 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: step.c, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, boxShadow: `0 2px 8px ${step.c}30` }}>{step.s}</div>
                          {i < 3 && <div style={{ width: 2, height: 20, background: step.c, margin: "2px 0", opacity: 0.3 }} />}
                        </div>
                        <div style={{ background: "#fff", borderRadius: 11, boxShadow: "0 1px 5px rgba(0,0,0,0.05)", padding: "10px 14px", flex: 1 }}>
                          <span style={{ fontWeight: 700, fontSize: 12, color: step.c }}>{step.t}</span>
                          <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{step.d}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 16, padding: "10px 12px", background: "#f8f8f8", borderRadius: 8, border: "1px solid #eee" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 6 }}>{"\u{1F504}"} R&eacute;sultats automatiques int&eacute;gr&eacute;s &agrave; chaque simulation :</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {AUTO_RESULTS.map((ar) => (
                        <div key={ar.id} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, background: `${ar.color}06`, border: `1px solid ${ar.color}15`, fontSize: 10 }}>
                          <span>{ar.icon}</span> <strong style={{ color: ar.color }}>{ar.label}</strong> &mdash; {ar.desc.split(".")[0]}.
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 16, background: "#1a1a2e", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{"\u{1F9E0}"} Architecture du moteur</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr 40px 1fr", alignItems: "center" }}>
                      <div style={{ background: "#6C5CE720", borderRadius: 8, padding: 10, border: "1px solid #6C5CE740" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#a29bfe", marginBottom: 3 }}>{"\u{1F4D6}"} R&egrave;gles .md</div>
                        <div style={{ fontSize: 9, color: "#888" }}>12 fichiers r&egrave;gles m&eacute;tier</div>
                      </div>
                      <div style={{ textAlign: "center", color: "#888", fontSize: 16 }}>&rarr;</div>
                      <div style={{ background: "#E1705520", borderRadius: 8, padding: 10, border: "1px solid #E1705540" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#E17055", marginBottom: 3 }}>{"\u{1F916}"} Moteur IA</div>
                        <div style={{ fontSize: 9, color: "#888" }}>Prompt + R&egrave;gles + Param&egrave;tres + Formules</div>
                      </div>
                      <div style={{ textAlign: "center", color: "#888", fontSize: 16 }}>&rarr;</div>
                      <div style={{ background: "#00B89420", borderRadius: 8, padding: 10, border: "1px solid #00B89440" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#00B894", marginBottom: 3 }}>{"\u{1F4CA}"} R&eacute;sultats</div>
                        <div style={{ fontSize: 9, color: "#888" }}>+ surcote, min. contributif, majo. enfants</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <div style={{ background: "#0984E320", borderRadius: 8, padding: 8, border: "1px solid #0984E340" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0984E3" }}>{"\u{1F4CA}"} 19 param&egrave;tres annuels</div>
                        <div style={{ fontSize: 9, color: "#888" }}>PASS, SMIC, points, taux cotis. T1/T2, appel 127%, CSG&hellip;</div>
                      </div>
                      <div style={{ background: "#00B89420", borderRadius: 8, padding: 8, border: "1px solid #00B89440" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#00B894" }}>{"\u{1F9EE}"} 8 formules de calcul</div>
                        <div style={{ fontSize: 9, color: "#888" }}>Pension CNAV, d&eacute;cote, surcote, SAM, points AGIRC-ARRCO&hellip;</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
