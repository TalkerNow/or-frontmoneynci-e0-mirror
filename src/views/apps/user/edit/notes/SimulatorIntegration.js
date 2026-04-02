/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Dropzone from "react-dropzone";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "reactstrap";
import { DownloadCloud, Eye } from "react-feather";
import {
  QUICK_TAGS_OPTIONS,
  generateDocId,
  extractClientNames,
  persistUploadedDocs,
  loadUploadedDocs,
} from "./utils";
const MD_CONTENT = {};

// Map QUICK_TAGS to icons for the analyse panel
const TAG_ICONS = {
  fin_carriere: "🔧",
  rapport_consultation: "📄",
  preparation_entretien: "🤝",
  simulation_chomage: "📉",
  simulation_auto: "💼",
  racl: "⏩",
  retraite_progressive: "⚖️",
  cumul_emploi: "🔄",
  periode_etranger: "🌍",
};


// ─── DATA ───────────────────────────────────────────────────────────────────

const ACTION_PANELS = {
  analyse: {
    label: "Analyse documents", icon: "🔍", color: "#6C5CE7", order: 1,
    desc: "Sélectionnez une thématique d'analyse puis exécutez",
    actions: QUICK_TAGS_OPTIONS.map((tag) => ({
      id: tag.value,
      label: tag.label,
      icon: TAG_ICONS[tag.value] || "🔍",
      requires: [],
      desc: "",
    })),
  },
  carriere: {
    label: "Carrière", icon: "📂", color: "#E17055", order: 2,
    navCount: "5 régimes",
    desc: "Données carrière par régime — validation consultant avant simulation",
    actions: [],
  },
  dispositifs: {
    label: "Dispositifs", icon: "🔧", color: "#00B894", order: 3,
    desc: "Activez les dispositifs applicables — l'IA en déduit les dates de départ possibles",
    actions: [
      { id: "racl", label: "Carrière longue (RACL)", icon: "⏩", requires: ["ris"], desc: "Départ anticipé si début activité avant 16/18/20/21 ans", generates_date: true },
      { id: "rachat_incomplete", label: "Rachat VPLR année incomplète", icon: "🧩", requires: ["ris"], desc: "Racheter des trimestres pour années < 4 trimestres" },
      { id: "rachat_etude", label: "Rachat VPLR année d'étude", icon: "🎓", requires: ["ris"], hasInput: true, inputType: "number", inputLabel: "Nb années études", desc: "Max 12 trimestres rachetables" },
      { id: "retraite_progressive", label: "Retraite progressive", icon: "⚖️", requires: ["ris"], desc: "Temps partiel + pension partielle dès âge légal −2 ans", generates_date: true },
      { id: "cumul_emploi", label: "Cumul emploi-retraite", icon: "🔄", requires: ["ris"], desc: "Liquidation puis reprise d'activité, 2e pension (réforme 2023)", generates_date: true },
      { id: "chomage_ind", label: "Chômage indemnisé", icon: "📉", requires: ["ris"], hasInput: true, inputType: "number", inputLabel: "Durée (mois)", desc: "Trim. assimilés, impact sur date taux plein", generates_date: true },
      { id: "chomage_non_ind", label: "Chômage non indemnisé", icon: "⚠️", requires: ["ris"], desc: "Limites spécifiques, exception +55 ans / 20 ans cotisation", generates_date: true },
      { id: "arret_activite", label: "Arrêt d'activité", icon: "🛑", requires: ["ris"], hasInput: true, inputType: "number", inputLabel: "Âge arrêt", desc: "Cessation totale, droits figés, décote", generates_date: true },
      { id: "cotisations_min", label: "Cotisations minimales (TI/TNS)", icon: "💰", requires: ["ris"], desc: "Maintien validation 4 trim./an avec revenu minimal" },
    ]
  },
  dates: {
    label: "Dates & Simulations", icon: "📅", color: "#0984E3", order: 4,
    desc: "Dates auto-calculées par l'IA selon les dispositifs activés + dates standard",
    actions: [
      { id: "sim_legal", label: "Âge légal", icon: "⚖️", requires: ["ris"], desc: "Date d'ouverture des droits selon génération", auto: true },
      { id: "sim_taux_plein", label: "Taux plein (durée)", icon: "🎯", requires: ["ris"], desc: "Date atteinte du nb de trimestres requis", auto: true },
      { id: "sim_auto_67", label: "Taux plein automatique (67 ans)", icon: "🔓", requires: ["ris"], desc: "Taux plein garanti, proratisation éventuelle", auto: true },
      { id: "sim_date_libre", label: "Date libre", icon: "📆", requires: ["ris"], hasInput: true, inputType: "date", inputLabel: "Date souhaitée", desc: "Choisir une date, voir l'impact complet", auto: false },
    ]
  },
  livrables: {
    label: "Livrables", icon: "📋", color: "#D63031", order: 5,
    desc: "Générer le document final — mêmes calculs, niveaux de détail différents",
    actions: [
      { id: "rapport_consultation", label: "Rapport de consultation retraite", icon: "📄", requires: ["ris"], desc: "Synthèse 1 page — entretien client", pages: "~1 page" },
      { id: "simulation_retraite", label: "Simulation retraite", icon: "📊", requires: ["ris"], desc: "Tableaux détaillés — scénarios comparés", pages: "~1 page" },
      { id: "audit_retraite", label: "Audit retraite", icon: "📚", requires: ["ris"], desc: "Analyse complète régime par régime", pages: "~30 pages" },
    ]
  },
};

// Rapprochement actions (cross-check RIS vs other documents)
const RAPPROCHEMENT_ACTIONS = [
  { id: "ris_vs_autre_caisse", label: "Rapprochement RIS relevé autre caisse ou régime", icon: "🏢", requires: ["ris"], desc: "Cohérence trimestres inter-régimes" },
  { id: "ris_vs_paie", label: "Rapprochement RIS Bulletin de salaire", icon: "💰", requires: ["ris", "fiche_paie"], desc: "Écarts salariaux, recalcul SAM" },
  { id: "ris_vs_ft", label: "Rapprochement RIS doc France Travail (chômage)", icon: "📄", requires: ["ris", "pole_emploi"], desc: "Trimestres assimilés chômage" },
  { id: "ris_vs_etranger", label: "Rapprochement RIS carrière documents étranger", icon: "🌍", requires: ["ris", "releve_etranger"], desc: "Totalisation, conventions bilatérales" },
  { id: "ris_vs_fp", label: "Rapprochement RIS période(s) fonctionnaire", icon: "🏛️", requires: ["ris", "ircantec"], desc: "Fonction publique contractuelle, Ircantec" },
];

// Auto-results that appear automatically in bilans (not buttons)
const AUTO_RESULTS = [
  { id: "surcote", label: "Surcote", icon: "📈", desc: "Calculée automatiquement si départ au-delà du taux plein. +1,25%/trimestre supplémentaire.", color: "#00B894" },
  { id: "minimum_contributif", label: "Minimum contributif", icon: "🔒", desc: "Éligibilité vérifiée automatiquement. Si pension < seuil et taux plein atteint → complément.", color: "#0984E3" },
  { id: "majoration_enfants", label: "Majoration enfants", icon: "👶", desc: "Appliquée automatiquement selon le nombre d'enfants renseigné. CNAV +10% si ≥3, AGIRC-ARRCO +10% à +30%.", color: "#E17055" },
];

const ADMIN_SECTIONS = {
  regles: {
    label: "Règles métier", icon: "📜", color: "#6C5CE7",
    items: [
      { id: "cnav_base", label: "Régime de base CNAV", icon: "🏛️", file: "circulaire_revalorisation_2025.md", contentKey: "cnav_base", officialUrl: "https://www.legislation.cnav.fr", desc: "Calcul pension, SAM, taux, durée d'assurance" },
      { id: "agirc_arrco", label: "AGIRC-ARRCO", icon: "📊", file: "REGIMES-COMPLEMENTAIRE-AGIRC_ARRCO.md", contentKey: "agirc_arrco", officialUrl: "https://www.agirc-arrco.fr/particuliers", desc: "Points, valeur de service, coefficients" },
      { id: "ircantec", label: "Ircantec", icon: "🏢", file: null, contentKey: null, officialUrl: "https://www.ircantec.retraites.fr", desc: "Points, calcul pension agents non titulaires", missing: true },
      { id: "rci", label: "RCI / SSI", icon: "📑", file: "circulaire_rci_2025.md", contentKey: "rci", officialUrl: "https://www.secu-independants.fr", desc: "Complémentaire indépendants, BIC/BNC" },
      { id: "racl", label: "Carrière longue (RACL)", icon: "⏩", file: "racl-regles-conditions.md", contentKey: "racl", officialUrl: "https://www.service-public.fr/particuliers/vosdroits/F13845", desc: "Conditions, seuils, trimestres retenus" },
      { id: "vplr", label: "Rachat VPLR", icon: "🧩", file: "circulaire_rachat_vplr_2025.md", contentKey: "vplr", officialUrl: "https://www.lassuranceretraite.fr/rachat-trimestres", desc: "Barèmes, options taux/proratisation" },
      { id: "progressive", label: "Retraite progressive", icon: "⚖️", file: "SKILL_retraite_progressive.md", contentKey: "progressive", officialUrl: "https://www.service-public.fr/particuliers/vosdroits/F13819", desc: "Conditions, fraction, quotité" },
      { id: "cumul", label: "Cumul emploi-retraite", icon: "🔄", file: "SKILL_cumul_emploi_retraite.md", contentKey: "cumul", officialUrl: "https://www.service-public.fr/particuliers/vosdroits/F13243", desc: "Intégral, plafonné, 2e pension réforme 2023" },
      { id: "chomage", label: "Chômage et retraite", icon: "📉", file: null, contentKey: null, officialUrl: "https://www.unedic.org", desc: "Assimilés, non indemnisé, exception +55 ans", missing: true },
      { id: "conventions", label: "Conventions internationales", icon: "🌍", file: "SKILL_trimestres_etranger.md", contentKey: "conventions", officialUrl: "https://www.cleiss.fr/docs/textes/index.html", desc: "Bilatérales, UE, totalisation/proratisation" },
      { id: "minimum", label: "Minimum contributif", icon: "🔒", file: null, contentKey: null, officialUrl: "https://www.legislation.cnav.fr", desc: "Base, majoré, plafond toutes pensions", missing: true },
      { id: "majorations", label: "Majorations (enfants, handicap…)", icon: "👶", file: null, contentKey: null, officialUrl: "https://www.legislation.cnav.fr", desc: "MDA, +10% 3 enfants, tierce personne", missing: true },
    ]
  },
  parametres: {
    label: "Paramètres annuels", icon: "📐", color: "#0984E3",
    items: [
      { id: "plafond_ss", label: "Plafond Sécurité Sociale (PASS)", icon: "📏", value: "48 060 € / 4 005 € mois", year: "2026", maj: "23/10/2025", desc: "Assiette Tranche A, seuil déplafonnement" },
      { id: "smic_horaire", label: "SMIC", icon: "💶", value: "12,02 € h / 1 823 € mois / 21 876 € an", year: "2026", maj: "01/01/2026", desc: "Base validation trimestres (150×SMIC)" },
      { id: "seuil_trim", label: "Seuil validation 1 trimestre", icon: "✅", value: "1 803,00 €", year: "2026", maj: "01/01/2026", desc: "150 × SMIC horaire brut (150 × 12,02 €)" },
      { id: "valeur_point_agirc", label: "Valeur point AGIRC-ARRCO", icon: "📊", value: "1,4386 €", year: "2025", maj: "01/11/2024", desc: "Valeur de service — valeur 2025 en vigueur, barème 2026 non encore publié" },
      { id: "prix_achat_point", label: "Prix d'achat point AGIRC-ARRCO", icon: "🛒", value: "20,1877 €", year: "2025", maj: "01/01/2025", desc: "Salaire de référence — valeur 2025 reconduite en 2026 (en attente officiel)" },
      { id: "valeur_point_ircantec", label: "Valeur point Ircantec", icon: "🏢", value: "0,51681 €", year: "2024", maj: "01/01/2024", desc: "Valeur de service — aucune nouvelle valeur publiée pour 2025–2026 à ce jour" },
      { id: "coeff_revalo", label: "Coefficients revalorisation CNAV", icon: "📈", value: "Tableau", year: "2024", desc: "Revalorisation salaires portés au compte" },
      { id: "bareme_vplr", label: "Barème rachat VPLR", icon: "🧩", value: "Grille", year: "2024", desc: "Coût par trimestre selon âge et revenu" },
      { id: "taux_csg", label: "Taux CSG retraités", icon: "🧾", value: "0% / 3,8% / 6,6% / 8,3%", year: "2025", maj: "01/01/2025", desc: "Exonéré / taux réduit / taux médian / taux normal. + CRDS 0,5% + CASA 0,3%" },
      { id: "age_legal", label: "Âge légal par génération", icon: "📅", value: "Tableau", year: "2024", maj: "2024", desc: "Post-réforme 2023 — âge légal 62 → 64 ans progressif selon génération" },
      { id: "duree_assurance", label: "Durée d'assurance requise", icon: "⏱️", value: "166 → 172 trim.", year: "2024", maj: "2024", desc: "Par génération — tableau post-réforme 2023" },
      { id: "coeff_solidarite", label: "Coefficient solidarité AGIRC-ARRCO", icon: "🤝", value: "10%", year: "2025", maj: "01/01/2019", desc: "Coefficient temporaire standard — confirmé par les accords 2023–2025. S'applique si départ sans attendre le taux plein." },
      { id: "taux_majo_enfants", label: "Taux majoration pour enfants", icon: "👶", value: "+10% (≥3 enfants)", year: "2024", maj: "2014", desc: "CNAV +10% si 3+ enfants. AGIRC-ARRCO : +10% (3 enf.) à +30% (7 enf. et +). Inchangé depuis 2014." },
      { id: "taux_cotis_t1", label: "Taux cotisation calcul points T1 (≤PASS)", icon: "🔢", value: "6,20%", year: "2025", maj: "01/01/2019", desc: "Taux contractuel Tranche 1 — stable depuis 2019" },
      { id: "taux_cotis_t2", label: "Taux cotisation calcul points T2 (>PASS)", icon: "🔢", value: "17,00%", year: "2025", maj: "01/01/2019", desc: "Taux contractuel Tranche 2 (1 à 8 PASS) — stable depuis 2019" },
      { id: "taux_appel", label: "Taux d'appel AGIRC-ARRCO", icon: "📢", value: "127%", year: "2025", maj: "01/01/2019", desc: "Cotisation réelle = taux contractuel × 127%. Part >100% ne génère pas de points. Confirmé 2023–2025." },
      { id: "historique_valeur_service", label: "Table historique valeur de service du point", icon: "📜", value: "Tableau", year: "1999→2024", maj: "01/11/2024", desc: "Dernière valeur connue : 1,4386 € au 01/11/2024. Barème 2026 non publié." },
      { id: "historique_prix_achat", label: "Table historique prix d'achat du point", icon: "📜", value: "Tableau", year: "1999→2025", maj: "01/01/2025", desc: "Dernière valeur connue : 20,1877 € au 01/01/2025." },
      { id: "taux_csg_retraite_detail", label: "Taux CSG retraite (détail seuils RFR)", icon: "🧾", value: "0% / 3,8% / 6,6% / 8,3%", year: "2025", maj: "2025", csgDetail: [{ taux: "0%", label: "Exonéré", crds: false }, { taux: "3,8%", label: "Taux réduit", crds: true }, { taux: "6,6%", label: "Taux médian", crds: true }, { taux: "8,3%", label: "Taux normal", crds: true }], desc: "Seuils RFR millésime 2025. + CRDS 0,5% sur tous sauf exonérés. + CASA 0,3% (taux médian et normal)." },
    ]
  },
  formules: {
    label: "Formules de calcul", icon: "🧮", color: "#00B894",
    items: [
      { id: "f_cnav", label: "Pension CNAV", icon: "🏛️", formula: "SAM × Taux × (Trim. validés / Durée requise)", desc: "Taux plein = 50%, min 37.5% (décote max 20 trim.)" },
      { id: "f_decote", label: "Décote CNAV", icon: "📉", formula: "Taux plein − (1.25% × trim. manquants)", desc: "Trim. manquants = min(âge légal→67, durée requise−validés)" },
      { id: "f_surcote", label: "Surcote CNAV", icon: "📈", formula: "Pension × (1 + 1.25% × trim. surcotés)", desc: "Trimestres au-delà du taux plein, après âge légal" },
      { id: "f_agirc", label: "Pension AGIRC-ARRCO", icon: "📊", formula: "Nb points × Valeur de service du point", desc: "Points = cotisations / prix d'achat du point" },
      { id: "f_sam", label: "SAM 25 meilleures", icon: "💰", formula: "Σ(25 meilleurs salaires revalorisés) / 25", desc: "Salaires plafonnés au PASS, revalorisés par coefficients" },
      { id: "f_trim_salaire", label: "Trimestres par salaire", icon: "✅", formula: "Trim. = min(4, Salaire annuel / (150×SMIC))", desc: "Arrondi à l'entier inférieur, max 4/an" },
      { id: "f_points_agirc", label: "Points AGIRC-ARRCO", icon: "🔢", formula: "Assiette × Taux contractuel / Prix d'achat", desc: "T1 (≤PASS) à 6,20% + T2 (>PASS) à 17%. Taux d'appel 127% (part >100% non productive)" },
      { id: "f_rachat", label: "Coût rachat VPLR", icon: "🧩", formula: "Barème(âge, revenu) × nb trimestres", desc: "Option 1 (taux seul) ou Option 2 (taux+prorata)" },
    ]
  },
  prompts: { label: "Prompts IA", icon: "🤖", color: "#E17055", desc: "26 prompts stricts pré-calibrés" },
  registre: { label: "Registre d'erreurs", icon: "📚", color: "#D63031", desc: "Règles Gate #2 — auto-apprentissage" },
  flux: { label: "Flux & Architecture", icon: "🔀", color: "#D63031", desc: "Diagramme du flux utilisateur" },
};

const REGISTRE_ERREURS = [
  {
    id: "R001", niveau: "critique",
    title: "Trimestres enfants attribués à un homme",
    date: "06/11/2025", prompt: "PROMPT 1 + PROMPT 2",
    erreur: "Attribution de 8 trimestres pour enfants à un homme.",
    condition: 'sexe == "H" and trimestres_enfants > 0',
    message: "❌ ERREUR CRITIQUE : Impossible d'attribuer des trimestres pour enfants à un homme. Les trimestres pour enfants sont réservés aux femmes.",
    impact: "Bloque automatiquement tout calcul qui attribuerait des majorations enfants à un homme.",
  },
  {
    id: "R002", niveau: "critique",
    title: "Âge légal inférieur à 62 ans",
    date: "06/11/2025", prompt: "PROMPT 1 + PROMPT 2",
    erreur: "Âge légal calculé à 61 ans (impossible depuis réforme 2023).",
    condition: "age_legal < 62",
    message: "❌ ERREUR CRITIQUE : Âge légal inférieur à 62 ans impossible. Depuis la réforme 2023, l'âge légal minimum est de 62 ans.",
    impact: "Empêche les estimations avec un âge légal incohérent.",
  },
  {
    id: "R003", niveau: "critique",
    title: "Nombre de trimestres supérieur à 200",
    date: "06/11/2025", prompt: "PROMPT 1 + PROMPT 2",
    erreur: "Plus de 200 trimestres validés (impossible : max 50 ans de carrière).",
    condition: "trimestres_total > 200",
    message: "❌ ERREUR CRITIQUE : Plus de 200 trimestres impossible. Maximum théorique = 50 ans × 4 trimestres = 200 trimestres.",
    impact: "Détecte les erreurs de saisie ou de calcul de trimestres.",
  },
  {
    id: "R004", niveau: "critique",
    title: "Enfant né avant le client",
    date: "06/11/2025", prompt: "PROMPT 1 + PROMPT 2",
    erreur: "Date de naissance enfant antérieure à la date de naissance du client.",
    condition: "date_naissance_enfant < date_naissance_client",
    message: "❌ ERREUR CRITIQUE : Enfant né avant le client. Vérifier les dates de naissance.",
    impact: "Empêche les incohérences temporelles dans les données familiales.",
  },
];

const DOC_TYPES = [
  { id: "ris", label: "RIS", icon: "📋", color: "#6C5CE7" },
  { id: "agirc_arrco", label: "AGIRC-ARRCO", icon: "📊", color: "#0984E3" },
  { id: "ircantec", label: "Ircantec", icon: "🏛️", color: "#00B894" },
  { id: "carsat", label: "CARSAT", icon: "🏢", color: "#D63031" },
  { id: "notif_agirc", label: "Notif. AGIRC", icon: "📬", color: "#6C5CE7" },
  { id: "pole_emploi", label: "France Travail", icon: "📄", color: "#FDCB6E" },
  { id: "fiche_paie", label: "Fiches paie", icon: "💰", color: "#00CEC9" },
  { id: "releve_etranger", label: "Étranger", icon: "🌍", color: "#A29BFE" },
];

// MOCK_DOCS removed — real documents are fetched from the backend

// Dispositifs auto-détectés comme potentiellement applicables (basé sur l'analyse du dossier)
const MOCK_DETECTED_DISPOSITIFS = {
  racl: "Début activité à 17 ans détecté sur le RIS",
  chomage_ind: "Attestation France Travail présente au dossier",
  retraite_progressive: "Profil compatible (âge légal −2 ans atteint)",
};

// Mock auto-generated dates from dispositifs
const MOCK_AUTO_DATES = [
  { source: "RACL", date: "01/07/2011", age: "63 ans 4m", detail: "Éligible — début activité à 17 ans, 5 trim. avant 20 ans", color: "#00B894" },
  { source: "Chômage 18m + Taux plein", date: "01/10/2014", age: "66 ans 7m", detail: "Taux plein décalé de 8 mois par période chômage", color: "#E17055" },
  { source: "Retraite progressive", date: "01/03/2012", age: "64 ans", detail: "Éligible dès âge légal −2 ans, 150 trim. atteints", color: "#0984E3" },
];

// ─── DONNÉES CARRIÈRE ───────────────────────────────────────────────────────

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
  { id: "sk_prompt1",    label: "PROMPT 1 — Pré-analyse consultant",          icon: "🔍", color: "#6C5CE7", contentKey: "sk_prompt1",    category: "Workflow principal" },
  { id: "sk_prompt2",    label: "PROMPT 2 — Rapport de consultation client",  icon: "📄", color: "#6C5CE7", contentKey: "sk_prompt2",    category: "Workflow principal" },
  { id: "sk_prompt3",    label: "PROMPT 3 — Auto-apprentissage erreurs",      icon: "🧠", color: "#6C5CE7", contentKey: "sk_prompt3",    category: "Workflow principal" },
  { id: "sk_workflow",   label: "Workflow consultation final",                 icon: "🔀", color: "#D63031", contentKey: "sk_workflow",   category: "Workflow principal" },
  { id: "sk_analyse",    label: "Analyse relevé de carrière harmonisé",       icon: "📋", color: "#0984E3", contentKey: "sk_analyse",    category: "Skills N8N" },
  { id: "sk_racl",       label: "Éligibilité carrière longue (RACL)",         icon: "⏩", color: "#0984E3", contentKey: "sk_racl",       category: "Skills N8N" },
  { id: "sk_estimation", label: "Estimation pensions retraite",               icon: "💰", color: "#0984E3", contentKey: "sk_estimation", category: "Skills N8N" },
  { id: "sk_progressive",label: "Retraite progressive",                       icon: "⚖️", color: "#0984E3", contentKey: "progressive",   category: "Skills N8N" },
  { id: "sk_cumul",      label: "Cumul emploi-retraite",                      icon: "🔄", color: "#0984E3", contentKey: "cumul",         category: "Skills N8N" },
  { id: "sk_etranger",   label: "Trimestres étrangers",                       icon: "🌍", color: "#0984E3", contentKey: "conventions",   category: "Skills N8N" },
  // ── Manquants ──
  { id: "miss_paie",     label: "Rapprochement RIS / bulletin de salaire",    icon: "💶", color: "#bbb",    contentKey: null,            category: "Manquants — à créer", missing: true },
  { id: "miss_ft",       label: "Rapprochement RIS / France Travail",         icon: "📉", color: "#bbb",    contentKey: null,            category: "Manquants — à créer", missing: true },
  { id: "miss_fp",       label: "Rapprochement RIS / fonctionnaire Ircantec", icon: "🏛️", color: "#bbb",    contentKey: null,            category: "Manquants — à créer", missing: true },
  { id: "miss_chomage",  label: "Chômage indemnisé / non indemnisé",          icon: "⚠️", color: "#bbb",    contentKey: null,            category: "Manquants — à créer", missing: true },
  { id: "miss_arret",    label: "Arrêt d'activité",                           icon: "🛑", color: "#bbb",    contentKey: null,            category: "Manquants — à créer", missing: true },
  { id: "miss_tns",      label: "Cotisations minimales TI/TNS",               icon: "📑", color: "#bbb",    contentKey: null,            category: "Manquants — à créer", missing: true },
  { id: "miss_mincontrib",label: "Minimum contributif",                       icon: "🔒", color: "#bbb",    contentKey: null,            category: "Manquants — à créer", missing: true },
];

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export default function SimulatorV6({ mode = "production", id, user }) {
  // ── UI State ──
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
  const [navCollapsed, setNavCollapsed] = useState(false);

  // ── Upload & Analysis State (migrated from useNotesLogic) ──
  const [fileToSend, setFileToSend] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userDocuments, setUserDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, docId: null, fileName: "" });
  const [localUploadedIds, setLocalUploadedIds] = useState(() => new Set(loadUploadedDocs(id).map((d) => String(d.id))));
  const [n8nMessage, setN8nMessage] = useState(() => {
    try {
      const stored = sessionStorage.getItem(`simu_n8n_message_${id}`);
      return stored || "";
    } catch { return ""; }
  });
  const cancelRef = useRef(null);
  // const clientNames = useMemo(() => extractClientNames(user), [user]);

  // Persist n8nMessage to sessionStorage
  useEffect(() => {
    if (!id) return;
    try { sessionStorage.setItem(`simu_n8n_message_${id}`, n8nMessage); }
    catch (e) { /* noop */ }
  }, [n8nMessage, id]);

  // Restore fileToSend from sessionStorage on mount
  useEffect(() => {
    if (!id) return;
    const restoreFile = async () => {
      try {
        const storedFileData = sessionStorage.getItem(`simu_file_to_send_${id}`);
        if (storedFileData) {
          const { name, type, dataUrl } = JSON.parse(storedFileData);
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          setFileToSend(new File([blob], name, { type }));
        }
      } catch (e) { /* noop */ }
    };
    restoreFile();
  }, [id]);

  // ── Fetch user documents from server ──
  const fetchUserDocuments = useCallback(async () => {
    if (!id) return;
    setIsLoadingDocs(true);
    try {
      const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
      const response = await axios.get(`${global.config.server_url}/files?user_id=${id}`, Config);
      setUserDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Erreur chargement documents utilisateur:", err);
      setUserDocuments([]);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [id]);

  // Fetch documents on mount
  useEffect(() => { fetchUserDocuments(); }, [fetchUserDocuments]);

  // ── File upload handler (drag & drop or click) ──
  const handleUpload = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles || !acceptedFiles.length || !id) return;
    const file = acceptedFiles[0];
    setFileToSend(file);

    // Persist to sessionStorage
    try {
      const reader = new FileReader();
      reader.onload = () => {
        sessionStorage.setItem(`simu_file_to_send_${id}`, JSON.stringify({
          name: file.name, type: file.type, dataUrl: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    } catch (e) { /* noop */ }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("user_id", id);
      acceptedFiles.forEach((f, index) => formData.append(`photoUpload${index}`, f));
      const Config = {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
          "Content-Type": "multipart/form-data",
        },
      };
      const response = await axios.post(`${global.config.server_url}/uploadFiles`, formData, Config);
      const files = Array.isArray(response?.data?.files) ? response.data.files : [];
      if (files.length) {
        const mapped = files.map((f) => ({
          id: f.id || generateDocId(),
          name: f.filename || "Document importé",
          uploadedAt: f.created_at || new Date().toISOString(),
          url: f.url || "",
        }));
        persistUploadedDocs(id, [...loadUploadedDocs(id), ...mapped]);
        setLocalUploadedIds((prev) => {
          const next = new Set(prev);
          mapped.forEach((m) => next.add(String(m.id)));
          return next;
        });
        toast.success(files.length > 1 ? "Documents importés" : "Relevé importé");
        fetchUserDocuments(); // refresh list
      }
    } catch {
      toast.error("Le téléversement a échoué");
    } finally {
      setIsUploading(false);
    }
  }, [id, fetchUserDocuments]);

  // ── Clear file ──
  const clearFileToSend = useCallback(() => {
    setFileToSend(null);
    try { sessionStorage.removeItem(`simu_file_to_send_${id}`); } catch { /* noop */ }
  }, [id]);

  // ── Delete document from server ──
  const handleDeleteDocument = useCallback((docId, fileName) => {
    setDeleteModal({ isOpen: true, docId, fileName });
  }, []);

  const confirmDeleteDocument = useCallback(async () => {
    const { docId, fileName } = deleteModal;
    if (!docId) return;

    try {
      const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
      await axios.delete(`${global.config.server_url}/files/${docId}`, Config);
      toast.success("Document supprimé avec succès");
      
      setUserDocuments((prev) => prev.filter((d) => d.id !== docId));
      const remaining = loadUploadedDocs(id).filter((d) => String(d.id) !== String(docId));
      persistUploadedDocs(id, remaining);
      setLocalUploadedIds((prev) => {
        const next = new Set(prev);
        next.delete(String(docId));
        return next;
      });
      if (fileToSend && fileToSend.name === fileName) {
        clearFileToSend();
      }
    } catch (e) {
      toast.error("Erreur lors de la suppression du document");
      console.error("Delete doc error:", e);
    } finally {
      setDeleteModal({ isOpen: false, docId: null, fileName: "" });
    }
  }, [deleteModal, fileToSend, clearFileToSend]);

  const toggleDeleteModal = useCallback(() => {
    setDeleteModal(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  // ── Cancel generation ──
  const handleCancelGeneration = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current.cancel("Opération annulée par l'utilisateur");
      cancelRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  // ── Report generation (same payload as old UploadSection flow) ──
  const handleGenerateDoc = useCallback(async () => {
    if (!fileToSend) {
      toast.error("Merci d'importer d'abord un RIS (PDF)");
      return null;
    }
    if (!selectedAction) {
      toast.error("Sélectionnez une thématique d'analyse");
      return null;
    }

    // Validation
    const childrenCountVal = user?.children_number;
    if (childrenCountVal === undefined || childrenCountVal === null || String(childrenCountVal).trim() === "") {
      toast.error("Le nombre d'enfants est manquant. Veuillez le renseigner dans les informations du client.");
      return null;
    }
    const birthDateVal = user?.birth_date;
    if (birthDateVal === undefined || birthDateVal === null || String(birthDateVal).trim() === "") {
      toast.error("La date de naissance est manquante. Veuillez la renseigner dans les informations du client.");
      return null;
    }

    setIsGenerating(true);
    if (cancelRef.current) cancelRef.current.cancel();
    cancelRef.current = axios.CancelToken.source();

    try {
      const n8nFormData = new FormData();
      n8nFormData.append("file", fileToSend);

      const tagsPrefix = `Thématiques d'analyse : ${selectedAction.label}\n\n`;
      const childrenCount = user?.children_number ?? "Non renseigné";
      const birthDate = user?.birth_date ?? "Non renseignée";
      const finalMessage = `${tagsPrefix}${promptText || ""}\n\nNombre d'enfants : ${childrenCount}\nDate de naissance : ${birthDate}`.trim();
      n8nFormData.append("message", finalMessage);
      if (id) n8nFormData.append("client_id", id);

      const webhookUrl = "https://n8n.srv796541.hstgr.cloud/webhook/f012dfc7-8b2c-479f-af1f-20dcd44cda02";
      toast.info("Analyse en cours (Standard)…");

      // --- APPEL N8N DÉSACTIVÉ ---
      // const n8nResponse = await axios.post(webhookUrl, n8nFormData, {
      //   headers: { "Content-Type": "multipart/form-data" },
      //   cancelToken: cancelRef.current.token,
      // });
      //
      // let reportData = n8nResponse.data;
      // let contentString = "";
      // const rootData = Array.isArray(reportData) ? reportData[0] : reportData;
      // if (typeof rootData === "string") {
      //   contentString = rootData;
      // } else if (typeof rootData === "object" && rootData !== null) {
      //   contentString = rootData.output || rootData.text || JSON.stringify(reportData, null, 2);
      // } else {
      //   contentString = String(reportData);
      // }
      // contentString = contentString.replace(/^```html/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();
      //
      // const fileName = `Rapport_Standard_${new Date().getTime()}.html`;
      // const fileBlob = new Blob([contentString], { type: "text/html;charset=utf-8" });
      // const uploadForm = new FormData();
      // uploadForm.append("user_id", id);
      // uploadForm.append("photoUpload0", fileBlob, fileName);
      // const uploadConfig = {
      //   headers: {
      //     Authorization: "Bearer " + localStorage.getItem("token"),
      //     "Content-Type": "multipart/form-data",
      //   },
      // };
      //
      // let reportUrl = null;
      // try {
      //   const uploadRes = await axios.post(
      //     `${global.config.server_url}/uploadFiles`, uploadForm,
      //     { ...uploadConfig, cancelToken: cancelRef.current.token },
      //   );
      //   if (uploadRes?.data?.files?.[0]?.url) {
      //     reportUrl = uploadRes.data.files[0].url;
      //   } else {
      //     throw new Error("Pas d'URL de fichier renvoyée");
      //   }
      // } catch (err) {
      //   console.error(err);
      //   toast.error("Impossible de sauvegarder le fichier du rapport");
      //   return null;
      // }
      //
      // setExecuted({ ...selectedAction, resultUrl: reportUrl });
      // toast.success("Rapport généré avec succès");
      // fetchUserDocuments();
      // return reportUrl;
      toast.warn("Appel N8N désactivé temporairement");
      return null;
    } catch (error) {
      if (axios.isCancel(error)) return null;
      console.error(error);
      toast.error("Erreur lors de la génération du rapport");
      return null;
    } finally {
      setIsGenerating(false);
      cancelRef.current = null;
    }
  }, [fileToSend, selectedAction, user, id, promptText, fetchUserDocuments]);

  // Derive doc availability from real uploaded documents
  const hasDocuments = userDocuments.some((d) => localUploadedIds.has(String(d.id))) || !!fileToSend;
  const checkReq = () => true; // requirements are met if we have a file
  const getMissing = () => [];

  const S = {
    card: { background: "#fff", borderRadius: 11, boxShadow: "0 1px 5px rgba(0,0,0,0.05)" },
    mono: { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" },
  };

  const toggleDispositif = (id) => {
    setActivatedDispositifs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

      return (
    <div style={{ marginTop: "24px" }}>
      {/* ══ MODAL CONTENU RÉGLEMENTAIRE ══ */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: "min(800px, calc(100vw - 32px))", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
            {/* Header modal */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: modal.color || "#333" }}>{modal.title}</div>
                <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{modal.lines} lignes — 01_REGLEMENTATION/ · Cliquer en dehors pour fermer</div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#888", lineHeight: 1 }}>✕</button>
            </div>
            {/* Contenu scrollable */}
            <div style={{ overflowY: "auto", flex: 1, padding: "14px 18px" }}>
              <pre style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: 11, lineHeight: 1.7, color: "#333", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                {modal.content}
              </pre>
            </div>
          </div>
        </div>
      )}

      {mode === "production" && (
        <div style={{ padding: "0 4px" }}>
{/* Zone documents — real upload */}
              <div style={{ ...S.card, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📁 Documents</div>

                {/* Dropzone */}
                <Dropzone disabled={isUploading || isGenerating} onDrop={handleUpload}>
                  {({ getRootProps, getInputProps, isDragActive }) => (
                    <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? "#6C5CE7" : "#ccc"}`, borderRadius: 9, padding: "16px 14px", textAlign: "center", cursor: isUploading ? "wait" : "pointer", background: isDragActive ? "#6C5CE706" : "#fafafa", transition: "all 0.15s", marginBottom: 10 }}>
                      <input {...getInputProps()} />
                      <DownloadCloud size={28} color="#6C5CE7" style={{ marginBottom: 4 }} />
                      <div style={{ fontWeight: 600, color: "#6C5CE7", fontSize: 11 }}>
                        {isUploading ? "Import en cours…" : "Déposez tous vos documents ici"}
                      </div>
                      <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>Glissez-déposez un fichier ou cliquez pour parcourir</div>
                    </div>
                  )}
                </Dropzone>

                {/* Liste des documents réels */}
                {isLoadingDocs ? (
                  <div style={{ fontSize: 10, color: "#888", padding: "6px 0" }}>Chargement des documents…</div>
                ) : ((userDocuments.filter((d) => localUploadedIds.has(String(d.id))).length > 0 || fileToSend)) ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {userDocuments.filter((d) => localUploadedIds.has(String(d.id))).map((doc) => {
                      const ext = (doc.filename || "").split(".").pop().toLowerCase();
                      
                      // 🟢 Green for PDF
                      const color = ext === "pdf" ? "#00B894" : ext === "html" ? "#0984E3" : "#6C5CE7";
                      const isSelected = fileToSend && fileToSend.name === doc.filename;
                      
                      return (
                        <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, background: isSelected ? `${color}18` : `${color}08`, border: `1px solid ${isSelected ? color : `${color}18`}`, fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}
                          onClick={() => {
                            if (isSelected) return;
                            const selectDoc = async () => {
                              try {
                                toast.info("Chargement du document…");
                                const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") }, responseType: "blob" };
                                const response = await axios.get(`${global.config.server_url}/downloadFile?file_id=${doc.id}`, Config);
                                const blob = response.data;
                                setFileToSend(new File([blob], doc.filename, { type: blob.type || "application/pdf" }));
                                toast.success(`"${doc.filename}" sélectionné`);
                              } catch { toast.error("Impossible de charger le document"); }
                            };
                            selectDoc();
                          }}
                          title={isSelected ? "Document sélectionné pour l'analyse" : `Cliquer pour sélectionner "${doc.filename}"`}
                        >
                          <span style={{ fontSize: 13 }}>📄</span>
                          <span style={{ fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>{doc.filename}</span>
                          <span style={{ fontSize: 9, color, fontWeight: 700 }}>{ext.toUpperCase()}</span>
                          
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto", paddingLeft: 4 }}>
                            {isSelected && (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  const url = URL.createObjectURL(fileToSend);
                                  window.open(url, '_blank');
                                }} 
                                style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center" }} 
                                title="Visualiser le document"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleDeleteDocument(doc.id, doc.filename); 
                              }} 
                              style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: "2px", fontSize: 14, lineHeight: 1, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }} 
                              title="Supprimer le document"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Fichier uploadé manuellement (pas encore dans la liste serveur) */}
                    {fileToSend && !userDocuments.filter((d) => localUploadedIds.has(String(d.id))).some((d) => d.filename === fileToSend.name) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, background: "#00B89418", border: "1px solid #00B894", fontSize: 11 }}>
                        <span style={{ fontSize: 13 }}>📄</span>
                        <span style={{ fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>{fileToSend.name}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto", paddingLeft: 4 }}>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const url = URL.createObjectURL(fileToSend);
                              window.open(url, '_blank');
                            }} 
                            style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center" }} 
                            title="Visualiser"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); clearFileToSend(); }} 
                            style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: "2px", fontSize: 14, lineHeight: 1, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }} 
                            title="Retirer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: "#bbb", textAlign: "center", padding: "4px 0" }}>Aucun document importé</div>
                )}
              </div>

          {/* ── MAIN PANELS ── */}
          {hasDocuments && (
            <>
              <div className={`simu-workflow-grid${navCollapsed ? " nav-collapsed" : ""}`}>

                {/* Panel navigation — ordered by logic */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                  {navCollapsed ? (
                    /* Barre réduite */
                    <button onClick={() => setNavCollapsed(false)} title="Afficher le flux de travail" style={{ width: 36, alignSelf: "flex-start", padding: "8px 0", borderRadius: 9, border: "1px solid #e0e0e0", background: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "#888" }}>
                      <span style={{ fontSize: 13 }}>▶</span>
                      <span style={{ fontSize: 7, writingMode: "vertical-rl", textTransform: "uppercase", letterSpacing: "0.08em", color: "#bbb" }}>Flux</span>
                    </button>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px" }}>
                        <div style={{ fontSize: 9, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Flux de travail ↓</div>
                        <button onClick={() => setNavCollapsed(true)} title="Masquer" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#bbb", padding: "0 2px", lineHeight: 1 }}>◀</button>
                      </div>
                      {Object.entries(ACTION_PANELS).map(([key, panel]) => {
                        const isActive = expandedPanel === key;
                        const currentOrder = ACTION_PANELS[expandedPanel].order;
                        const isDone = !isActive && panel.order < currentOrder;
                        const stepNum = panel.order;
                        return (
                          <button key={key} onClick={() => { setExpandedPanel(key); setSelectedAction(null); setExecuted(null); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, border: `2px solid ${isActive ? panel.color : isDone ? panel.color + "88" : "transparent"}`, background: isActive ? `${panel.color}10` : isDone ? `${panel.color}08` : "#fff", cursor: "pointer", textAlign: "left", transition: "all 0.12s", boxShadow: isActive ? `0 2px 8px ${panel.color}20` : "0 1px 3px rgba(0,0,0,0.04)" }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: isActive ? panel.color : isDone ? panel.color : "#ddd", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                              {isDone ? "✓" : stepNum}
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? panel.color : isDone ? panel.color : "#333" }}>{panel.label}</div>
                              <div style={{ fontSize: 9, color: isDone ? panel.color + "99" : "#999" }}>{isDone ? "Traité ✓" : panel.navCount || `${panel.actions.length} ${key === "dispositifs" ? "dispositifs" : key === "livrables" ? "formats" : "actions"}`}</div>
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Content area */}
                <div style={{ ...S.card, padding: 16, ...(expandedPanel === "carriere" ? { maxWidth: 820 } : {}) }}>
                  {(() => {
                    const panel = ACTION_PANELS[expandedPanel];

                    // ── CARRIÈRE: TABLEAU UNIFIÉ ──
                    if (expandedPanel === "carriere") {
                      // Préparation des données pour le tableau unifié
                      const MOCK_CNAV = Array.from({ length: 51 }, (_, i) => {
                        const yr = 2025 - i;
                        const sal = Math.round(15000 + i * 1800 + Math.random() * 2000);
                        const ss = Math.round(sal * 0.92);
                        const coeff = REVALO_CNAV[yr] || 1;
                        const revalo = Math.round(sal * coeff);
                        return { yr, sal, ss, coeff: coeff.toFixed(3), revalo, trim: 4, ar: 0, total: 4 };
                      });
                      const MOCK_AGIRC = Array.from({ length: 51 }, (_, i) => {
                        const yr = 2025 - i;
                        const p = AGIRC_PARAMS[yr] || { ta: 6.20, tb: 17.00, ref: 5611 };
                        const sal = Math.round(18000 + i * 2000 + Math.random() * 3000);
                        const trA = Math.round((sal * p.ta) / 100);
                        const trB = Math.round((sal * p.tb) / 100);
                        return { yr, sal, ta: p.ta, tb: p.tb, ref: p.ref, trA, trB, total: trA + trB };
                      });
                      const totalRows = MOCK_CNAV.slice(0, 20).map((row, i) => {
                        const agircRow = MOCK_AGIRC[i] || {};
                        const ptIrc = i < 10 ? Math.round(80 + i * 12) : 0;
                        const ptRci = i >= 5 && i < 15 ? Math.round(40 + i * 8) : 0;
                        return { ...row, agircPts: agircRow.total || 0, ircPts: ptIrc, rciPts: ptRci };
                      });

                      return (
                        <div>
                          {/* Header */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 18 }}>📂</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#E17055" }}>Carrière</span>
                              <span style={{ fontSize: 10, color: "#999" }}>— tableau unifié tous régimes</span>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: carriereValidee ? "#00B89415" : "#E1705515", color: carriereValidee ? "#00B894" : "#E17055", fontWeight: 700 }}>
                                {carriereValidee ? "🔒 Validée" : "📥 Importée OCR"}
                              </span>
                              <button onClick={() => setCarriereValidee(v => !v)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: "none", background: carriereValidee ? "#E1705520" : "#00B89420", color: carriereValidee ? "#E17055" : "#00B894", cursor: "pointer", fontWeight: 700 }}>
                                {carriereValidee ? "🔓 Déverrouiller" : "🔒 Valider"}
                              </button>
                            </div>
                          </div>

                          {/* Légende couleurs régimes */}
                          <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                            {[["🏛️ CNAV", "#6C5CE7"], ["📊 AGIRC-ARRCO", "#0984E3"], ["🏢 Ircantec", "#00B894"], ["📑 RCI / SSI", "#E17055"]].map(([label, color]) => (
                              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#555" }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: color, opacity: 0.7 }} />
                                {label}
                              </div>
                            ))}
                          </div>

                          {/* Grand tableau unifié */}
                          <div className="simu-table-wrap" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                            <table style={{ borderCollapse: "collapse", fontSize: 10, tableLayout: "auto" }}>
                              <thead>
                                <tr>
                                  {/* Année */}
                                  <th rowSpan={2} style={{ padding: "3px 2px", textAlign: "left", fontWeight: 700, color: "#333", borderBottom: "2px solid #ddd", background: "#f8f8f8", whiteSpace: "nowrap", verticalAlign: "bottom", width: 36 }}>An.</th>
                                  {/* Sal. brut partagé */}
                                  <th rowSpan={2} style={{ padding: "3px 2px", textAlign: "right", fontWeight: 700, color: "#555", borderBottom: "2px solid #ddd", background: "#f8f8f8", whiteSpace: "nowrap", verticalAlign: "bottom", borderLeft: "1px solid #ddd" }}>Sal. brut<br/><span style={{fontWeight:400,color:"#bbb"}}>/ Rému.</span></th>
                                  {/* CNAV */}
                                  <th colSpan={4} style={{ padding: "3px 2px", textAlign: "center", fontWeight: 700, color: "#6C5CE7", background: "#6C5CE708", borderLeft: "2px solid #6C5CE730", borderBottom: "1px solid #6C5CE720" }}>🏛️ CNAV</th>
                                  {/* AGIRC */}
                                  <th colSpan={3} style={{ padding: "3px 2px", textAlign: "center", fontWeight: 700, color: "#0984E3", background: "#0984E308", borderLeft: "2px solid #0984E330", borderBottom: "1px solid #0984E320" }}>📊 AGIRC-ARRCO</th>
                                  {/* Ircantec */}
                                  <th colSpan={1} style={{ padding: "3px 2px", textAlign: "center", fontWeight: 700, color: "#00B894", background: "#00B89408", borderLeft: "2px solid #00B89430", borderBottom: "1px solid #00B89420" }}>🏢 Irc.</th>
                                  {/* RCI */}
                                  <th colSpan={1} style={{ padding: "3px 2px", textAlign: "center", fontWeight: 700, color: "#E17055", background: "#E1705508", borderLeft: "2px solid #E1705530", borderBottom: "1px solid #E1705520" }}>📑 RCI</th>
                                </tr>
                                <tr style={{ background: "#fafafa" }}>
                                  {/* CNAV sous-cols */}
                                  <th style={{ padding: "2px 2px", textAlign: "right", fontWeight: 600, color: "#6C5CE7", borderBottom: "2px solid #6C5CE720", whiteSpace: "nowrap", borderLeft: "2px solid #6C5CE730" }}>Sal. SS</th>
                                  <th style={{ padding: "2px 2px", textAlign: "right", fontWeight: 600, color: "#6C5CE7", borderBottom: "2px solid #6C5CE720", whiteSpace: "nowrap" }}>Coeff.</th>
                                  <th style={{ padding: "2px 2px", textAlign: "right", fontWeight: 600, color: "#6C5CE7", borderBottom: "2px solid #6C5CE720", whiteSpace: "nowrap" }}>Revalo.</th>
                                  <th style={{ padding: "2px 2px", textAlign: "center", fontWeight: 600, color: "#6C5CE7", borderBottom: "2px solid #6C5CE720", whiteSpace: "nowrap" }}>Trim.</th>
                                  {/* AGIRC sous-cols */}
                                  <th style={{ padding: "2px 2px", textAlign: "right", fontWeight: 600, color: "#0984E3", borderBottom: "2px solid #0984E320", whiteSpace: "nowrap", borderLeft: "2px solid #0984E330" }}>Pts T1</th>
                                  <th style={{ padding: "2px 2px", textAlign: "right", fontWeight: 600, color: "#0984E3", borderBottom: "2px solid #0984E320", whiteSpace: "nowrap" }}>Pts T2</th>
                                  <th style={{ padding: "2px 2px", textAlign: "right", fontWeight: 600, color: "#0984E3", borderBottom: "2px solid #0984E320", whiteSpace: "nowrap" }}>Pts∑</th>
                                  {/* Ircantec */}
                                  <th style={{ padding: "2px 2px", textAlign: "right", fontWeight: 600, color: "#00B894", borderBottom: "2px solid #00B89420", whiteSpace: "nowrap", borderLeft: "2px solid #00B89430" }}>Points</th>
                                  {/* RCI */}
                                  <th style={{ padding: "2px 2px", textAlign: "right", fontWeight: 600, color: "#E17055", borderBottom: "2px solid #E1705520", whiteSpace: "nowrap", borderLeft: "2px solid #E1705530" }}>Points</th>
                                </tr>
                              </thead>
                              <tbody>
                                {totalRows.map((row, i) => {
                                  const ptT1 = Math.round(row.agircPts * 0.62);
                                  const ptT2 = Math.round(row.agircPts * 0.38);
                                  const ptSum = ptT1 + ptT2;
                                  return (
                                    <tr key={row.yr} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                      <td style={{ padding: "2px 2px", fontWeight: 700, color: "#333", whiteSpace: "nowrap" }}>{row.yr}</td>
                                      {/* Sal. brut partagé — éditable */}
                                      <td style={{ padding: "2px 2px", textAlign: "right", borderLeft: "1px solid #eee" }}>
                                        <input type="number" defaultValue={row.sal} disabled={carriereValidee} style={{ width: 56, textAlign: "right", border: "1px solid #ddd", borderRadius: 3, fontSize: 10, padding: "1px 2px", background: carriereValidee ? "#fafafa" : "#fff" }} />
                                      </td>
                                      {/* CNAV */}
                                      <td style={{ padding: "2px 2px", textAlign: "right", color: "#888", borderLeft: "2px solid #6C5CE715" }}>{row.ss.toLocaleString("fr-FR")}</td>
                                      <td style={{ padding: "2px 2px", textAlign: "right", color: "#0984E3", fontWeight: 600 }}>{row.coeff}</td>
                                      <td style={{ padding: "2px 2px", textAlign: "right", fontWeight: 700, color: "#6C5CE7" }}>{row.revalo.toLocaleString("fr-FR")}</td>
                                      <td style={{ padding: "2px 2px", textAlign: "center" }}>
                                        <input type="number" defaultValue={row.trim} disabled={carriereValidee} style={{ width: 26, textAlign: "center", border: "1px solid #ddd", borderRadius: 3, fontSize: 10, padding: "1px 1px" }} />
                                      </td>
                                      {/* AGIRC */}
                                      <td style={{ padding: "2px 2px", textAlign: "right", color: "#0984E3", fontWeight: 600, borderLeft: "2px solid #0984E315" }}>{i < 15 ? ptT1 : <span style={{ color: "#ddd" }}>—</span>}</td>
                                      <td style={{ padding: "2px 2px", textAlign: "right", color: "#0984E3", fontWeight: 600 }}>{i < 15 ? ptT2 : <span style={{ color: "#ddd" }}>—</span>}</td>
                                      <td style={{ padding: "2px 2px", textAlign: "right", fontWeight: 700, color: "#1a1a2e" }}>{i < 15 ? ptSum : <span style={{ color: "#ddd" }}>—</span>}</td>
                                      {/* Ircantec */}
                                      <td style={{ padding: "2px 2px", textAlign: "right", color: "#00B894", fontWeight: 600, borderLeft: "2px solid #00B89415" }}>
                                        {row.ircPts > 0 ? row.ircPts : <span style={{ color: "#ddd" }}>—</span>}
                                      </td>
                                      {/* RCI */}
                                      <td style={{ padding: "2px 2px", textAlign: "right", color: "#E17055", fontWeight: 600, borderLeft: "2px solid #E1705515" }}>
                                        {row.rciPts > 0 ? row.rciPts : <span style={{ color: "#ddd" }}>—</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr style={{ background: "#f0f0f0", fontWeight: 700, borderTop: "2px solid #ddd" }}>
                                  <td style={{ padding: "3px 2px", fontSize: 10, color: "#333" }}>∑</td>
                                  <td style={{ padding: "3px 2px", borderLeft: "1px solid #eee" }}></td>
                                  <td colSpan={3} style={{ padding: "3px 2px", textAlign: "right", fontSize: 10, color: "#6C5CE7", borderLeft: "2px solid #6C5CE715" }}>SAM : 38 420 €</td>
                                  <td style={{ padding: "3px 2px", textAlign: "center", fontSize: 10, color: "#6C5CE7" }}>156</td>
                                  <td colSpan={2} style={{ padding: "3px 2px", textAlign: "right", fontSize: 10, color: "#0984E3", borderLeft: "2px solid #0984E315" }}>—</td>
                                  <td style={{ padding: "3px 2px", textAlign: "right", fontSize: 10, color: "#0984E3", fontWeight: 800 }}>28 330</td>
                                  <td style={{ padding: "3px 2px", textAlign: "right", fontSize: 10, color: "#00B894", borderLeft: "2px solid #00B89415" }}>1 240</td>
                                  <td style={{ padding: "3px 2px", textAlign: "right", fontSize: 10, color: "#E17055", borderLeft: "2px solid #E1705515" }}>620</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Boutons bas */}
                          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                            <button disabled={carriereValidee} style={{ flex: 1, minWidth: 160, padding: "8px 0", borderRadius: 7, border: "none", background: carriereValidee ? "#ddd" : "#E17055", color: "#fff", fontWeight: 700, fontSize: 11, cursor: carriereValidee ? "default" : "pointer" }}>▶ Valider & Simuler</button>
                            <button disabled={carriereValidee} style={{ padding: "8px 14px", borderRadius: 7, border: "1px solid #ddd", background: "#fafafa", color: "#888", fontSize: 11, cursor: carriereValidee ? "default" : "pointer" }}>↺ Réinitialiser</button>
                          </div>
                        </div>
                      );
                    }

                    // ── DISPOSITIFS: special rendering with toggle chips ──
                    if (expandedPanel === "dispositifs") {
                      return (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 18 }}>{panel.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: panel.color }}>{panel.label}</span>
                            <span style={{ fontSize: 10, color: "#999" }}>— Activez les dispositifs, l'IA calcule les dates</span>
                          </div>
                          <div style={{ fontSize: 10, color: "#888", marginBottom: 14 }}>{panel.desc}</div>

                          <div className="simu-action-grid">
                            {panel.actions.map((action) => {
                              const ok = checkReq(action.requires);
                              const miss = getMissing(action.requires);
                              const isActivated = activatedDispositifs.includes(action.id);
                              const isDetected = !!MOCK_DETECTED_DISPOSITIFS[action.id];
                              return (
                                <button key={action.id} onClick={() => { if (ok) toggleDispositif(action.id); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", borderRadius: 8, border: `2px solid ${isActivated ? panel.color : ok ? "#e8e8e8" : "#f0f0f0"}`, background: isActivated ? `${panel.color}12` : ok ? "#fafafa" : "#f8f8f8", cursor: ok ? "pointer" : "not-allowed", textAlign: "left", opacity: ok ? 1 : 0.45, transition: "all 0.12s", position: "relative" }}>
                                  <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${isActivated ? panel.color : "#ccc"}`, background: isActivated ? panel.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, color: "#fff" }}>
                                    {isActivated && "✓"}
                                  </div>
                                  <span style={{ fontSize: 15, flexShrink: 0 }}>{action.icon}</span>
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                      <div style={{ fontSize: 11, fontWeight: isActivated ? 700 : 600, color: isActivated ? panel.color : ok ? "#333" : "#999" }}>{action.label}</div>
                                      {isDetected && !isActivated && ok && (
                                        <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "#F9A825", color: "#fff", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>💡 Détecté</span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: 9, color: "#888" }}>{action.desc}</div>
                                    {action.generates_date && <div style={{ fontSize: 8, color: "#0984E3", marginTop: 1 }}>📅 Génère une date de simulation</div>}
                                    {!ok && <div style={{ fontSize: 8, color: "#D63031", marginTop: 1 }}>⚠ Manque : {miss.map((m) => DOC_TYPES.find((d) => d.id === m)?.label).join(", ")}</div>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Input fields for activated dispositifs that need them */}
                          {activatedDispositifs.length > 0 && panel.actions.filter(a => a.hasInput && activatedDispositifs.includes(a.id)).length > 0 && (
                            <div style={{ marginTop: 12, padding: "10px 12px", background: "#00B89408", borderRadius: 8, border: "1px solid #00B89420" }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#00B894", marginBottom: 8 }}>Paramètres des dispositifs activés :</div>
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
                              <div style={{ fontSize: 10, fontWeight: 700, color: panel.color, marginBottom: 2 }}>Dispositifs activés :</div>
                              <div style={{ fontSize: 11, color: "#333" }}>
                                {activatedDispositifs.map(id => panel.actions.find(a => a.id === id)?.label).join(" · ")}
                              </div>
                              <div style={{ marginTop: 8 }}>
                                <button onClick={() => setShowAutoResults(true)} style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: panel.color, color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                                  ▶ Calculer les dates et scénarios
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // ── DATES & SIMULATIONS: shows auto-generated dates ──
                    if (expandedPanel === "dates") {
                      const dateComments = {
                        sim_legal: "64 ans atteints le 08/07/2030 → départ le 01/08/2030",
                        sim_taux_plein: "172 trim. atteints en 11/2032",
                        sim_auto_67: "67 ans atteints le 08/07/2033 → départ le 01/08/2033",
                        sim_date_libre: "Indiquer les dates de simulation souhaitées",
                      };
                      return (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 18 }}>{panel.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: panel.color }}>{panel.label}</span>
                          </div>
                          <div style={{ fontSize: 10, color: "#888", marginBottom: 12 }}>{panel.desc}</div>

                          {/* Données de calcul */}
                          <div style={{ background: "#F7F6F3", border: "1px solid #e8e8e8", borderRadius: 9, padding: "10px 14px", marginBottom: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>📊 Données de calcul</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", fontSize: 10 }}>
                              {[
                                ["SAMB Assurance Retraite / CNAV", "32 586 €", "#1a1a2e"],
                                ["Points ARRCO-AGIRC au 31/12/25", "28 330 pts", "#0984E3"],
                                ["Projection jusqu'au départ", "+ 344 pts / an", "#00B894"],
                                ["Situation jusqu'au départ", "Poursuite d'activité actuelle", "#555"],
                              ].map(([label, val, color]) => (
                                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #eee" }}>
                                  <span style={{ color: "#888" }}>{label}</span>
                                  <span style={{ fontWeight: 700, color, fontSize: 10 }}>{val}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Auto-generated dates from dispositifs */}
                          {activatedDispositifs.length > 0 && showAutoResults && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#00B894", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                                <span>🤖</span> Dates calculées automatiquement depuis les dispositifs activés
                              </div>
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
                            <div style={{ padding: "16px", textAlign: "center", color: "#999", fontSize: 11, background: "#fafafa", borderRadius: 8, marginBottom: 14 }}>
                              💡 Activez d'abord des dispositifs (étape 2) pour que l'IA calcule automatiquement les dates de départ possibles
                            </div>
                          )}

                          {/* Standard dates always available */}
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#0984E3", marginBottom: 8 }}>Dates standard :</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 7 }}>
                            {panel.actions.map((action) => {
                              const ok = checkReq(action.requires);
                              const sel = selectedAction?.id === action.id;
                              const isExcluded = excludedDates.includes(action.id);
                              const isDateLibre = action.id === "sim_date_libre";
                              return (
                                <button key={action.id}
                                  onClick={() => {
                                    if (!ok) return;
                                    if (isDateLibre) {
                                      setSelectedAction(sel ? null : action);
                                      setPromptText("📆 Date libre : JJ/MM/AAAA\n");
                                      setCommentairesMode(true);
                                    } else {
                                      setSelectedAction(sel ? null : action);
                                    }
                                    setExecuted(null);
                                  }}
                                  style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 11px", borderRadius: 8, border: `2px solid ${sel ? panel.color : "#e8e8e8"}`, background: sel ? `${panel.color}10` : "#fafafa", cursor: ok ? "pointer" : "not-allowed", textAlign: "left", opacity: isExcluded ? 0.45 : ok ? 1 : 0.45 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    <span style={{ fontSize: 15, flexShrink: 0 }}>{action.icon}</span>
                                    <div style={{ flex: 1, fontSize: 11, fontWeight: sel ? 700 : 600, color: sel ? panel.color : "#333", textDecoration: isExcluded ? "line-through" : "none" }}>{action.label}</div>
                                    {action.auto && (
                                      <span
                                        onClick={(e) => { e.stopPropagation(); setExcludedDates((prev) => prev.includes(action.id) ? prev.filter((x) => x !== action.id) : [...prev, action.id]); }}
                                        title={isExcluded ? "Réactiver ce calcul" : "Exclure ce calcul"}
                                        style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: isExcluded ? "#E1705525" : "#0984E312", color: isExcluded ? "#C0392B" : "#0984E3", fontWeight: 700, flexShrink: 0, cursor: "pointer" }}>
                                        {isExcluded ? "✕ Exclu" : "✓ Calculé"}
                                      </span>
                                    )}
                                  </div>
                                  {dateComments[action.id] && (
                                    <div style={{ fontSize: 9, color: "#aaa", paddingLeft: 22, lineHeight: 1.5 }}>
                                      {isDateLibre && sel ? "→ Saisir dans le Système prompt IA ↓" : dateComments[action.id]}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Résultats automatiques */}
                          <div style={{ marginTop: 10, padding: "10px 12px", background: "#f8f8f8", borderRadius: 8, border: "1px solid #eee" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 8 }}>🔄 Résultats automatiques :</div>
                            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                              <div style={{ flex: 1, padding: "8px 10px", borderRadius: 7, background: "#00B89406", border: "1px solid #00B89418" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                                  <span style={{ fontSize: 13 }}>📈</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "#00B894" }}>Surcote</span>
                                </div>
                                <div style={{ fontSize: 9, color: "#888" }}>+1,25%/trimestre supplémentaire au-delà du taux plein.</div>
                              </div>
                              <div style={{ flex: 1, padding: "8px 10px", borderRadius: 7, background: "#E1705506", border: "1px solid #E1705518" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                                  <span style={{ fontSize: 13 }}>👶</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "#E17055" }}>Majoration enfants</span>
                                </div>
                                <div style={{ fontSize: 9, color: "#888" }}>CNAV +10% si ≥3 enfants. AGIRC-ARRCO +10% à +30%.</div>
                              </div>
                              <div style={{ flex: 1, padding: "8px 10px", borderRadius: 7, background: "#6C5CE706", border: "1px solid #6C5CE718" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                                  <span style={{ fontSize: 13 }}>💶</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "#6C5CE7" }}>Retraite brute / nette</span>
                                </div>
                                <div style={{ fontSize: 9, color: "#888" }}>Calcul net après prélèvements sociaux.</div>
                              </div>
                            </div>
                            <div style={{ fontSize: 9, color: "#bbb", padding: "6px 8px", background: "#fff", borderRadius: 6, border: "1px solid #eee", lineHeight: 1.6 }}>
                              <span style={{ fontWeight: 600, color: "#aaa" }}>CSG / CRDS (indicatif) : </span>
                              Taux réduit → 3,8% · Taux médian → 6,6% · Taux normal → 6,6% + CRDS 0,5% + CASA 0,3%
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ── LIVRABLES: special rendering with page count ──
                    if (expandedPanel === "livrables") {
                      return (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 18 }}>{panel.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: panel.color }}>{panel.label}</span>
                          </div>
                          <div style={{ fontSize: 10, color: "#888", marginBottom: 14 }}>{panel.desc}</div>

                          <div className="simu-livrables-grid">
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
                                <div style={{ fontSize: 9, fontWeight: 700, color: "#6C5CE7", marginBottom: 3 }}>📝 PROMPT STRICT :</div>
                                <div style={{ fontSize: 10, color: "#333", lineHeight: 1.6, ...S.mono }}>
                                  [Prompt calibré pour "{selectedAction.label}" — intègre tous les dispositifs activés ({activatedDispositifs.length}), les dates calculées, les résultats automatiques (surcote, minimum contributif, majoration enfants). Niveau de détail : {selectedAction.pages}]
                                </div>
                              </div>
                              <button onClick={() => setExecuted(selectedAction)} style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: panel.color, color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>▶ Générer le {selectedAction.label.toLowerCase()}</button>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // ── ANALYSE DOCUMENTS: grid rendering ──
                    return (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 18 }}>{panel.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: panel.color }}>{panel.label}</span>
                          <span style={{ fontSize: 10, color: "#999" }}>— {panel.actions.length} actions disponibles</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#888", marginBottom: 14 }}>{panel.desc}</div>

                        {/* Rapprochement vignettes */}
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 8 }}>Cross-check et rapprochements entre documents — à la demande</div>
                        <div className="simu-action-grid" style={{ marginBottom: 18 }}>
                          {RAPPROCHEMENT_ACTIONS.map((action) => {
                            const ok = checkReq(action.requires);
                            const miss = getMissing(action.requires);
                            const sel = selectedAction?.id === action.id;
                            return (
                              <button key={action.id} onClick={() => {
                                if (ok) {
                                  setSelectedAction(sel ? null : action);
                                  setExecuted(null);
                                  setCommentairesMode(false);
                                  setPromptText(sel ? "" : `[Prompt calibré pour "${action.label}". Voir Admin → Prompts IA pour le contenu complet.]`);
                                }
                              }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", borderRadius: 8, border: `2px solid ${sel ? panel.color : ok ? "#e8e8e8" : "#f0f0f0"}`, background: sel ? `${panel.color}10` : ok ? "#fafafa" : "#f8f8f8", cursor: ok ? "pointer" : "not-allowed", textAlign: "left", opacity: ok ? 1 : 0.45 }}>
                                <span style={{ fontSize: 15, flexShrink: 0 }}>{action.icon}</span>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 11, fontWeight: sel ? 700 : 600, color: sel ? panel.color : ok ? "#333" : "#999" }}>{action.label}</div>
                                  <div style={{ fontSize: 9, color: "#888" }}>{action.desc}</div>
                                  {!ok && <div style={{ fontSize: 8, color: "#D63031", marginTop: 1 }}>⚠ Manque : {miss.map((m) => DOC_TYPES.find((d) => d.id === m)?.label).join(", ")}</div>}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Thematic analysis vignettes */}
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 8 }}>Thématiques d'analyse</div>
                        <div className="simu-action-grid">
                          {panel.actions.map((action) => {
                            const ok = checkReq(action.requires);
                            const miss = getMissing(action.requires);
                            const sel = selectedAction?.id === action.id;
                            return (
                              <button key={action.id} onClick={() => {
                                if (ok) {
                                  setSelectedAction(sel ? null : action);
                                  setExecuted(null);
                                  setCommentairesMode(false);
                                  setPromptText(sel ? "" : `[Prompt calibré pour "${action.label}". Voir Admin → Prompts IA pour le contenu complet.]`);
                                }
                              }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", borderRadius: 8, border: `2px solid ${sel ? panel.color : ok ? "#e8e8e8" : "#f0f0f0"}`, background: sel ? `${panel.color}10` : ok ? "#fafafa" : "#f8f8f8", cursor: ok ? "pointer" : "not-allowed", textAlign: "left", opacity: ok ? 1 : 0.45 }}>
                                <span style={{ fontSize: 15, flexShrink: 0 }}>{action.icon}</span>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 11, fontWeight: sel ? 700 : 600, color: sel ? panel.color : ok ? "#333" : "#999" }}>{action.label}</div>
                                  <div style={{ fontSize: 9, color: "#888" }}>{action.desc}</div>
                                  {!ok && <div style={{ fontSize: 8, color: "#D63031", marginTop: 1 }}>⚠ Manque : {miss.map((m) => DOC_TYPES.find((d) => d.id === m)?.label).join(", ")}</div>}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {selectedAction && (
                          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#6C5CE708", borderRadius: 7, border: "1px solid #6C5CE720" }}>
                            <span style={{ fontSize: 13 }}>{selectedAction.icon}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#6C5CE7" }}>{selectedAction.label}</span>
                            <span style={{ fontSize: 9, color: "#888", marginLeft: "auto" }}>↓ Prompt chargé ci-dessous</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Système prompt IA */}
              <div style={{ ...S.card, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>💬 Système prompt IA</div>
                <div style={{ fontSize: 10, color: "#888", marginBottom: 10 }}>En complément des actions structurées — l'IA reformule et mappe vers les étapes du flux</div>
                <textarea
                  readOnly={!commentairesMode}
                  value={promptText}
                  onChange={(e) => commentairesMode && setPromptText(e.target.value)}
                  placeholder="Sélectionnez une analyse ci-dessus ou saisissez une instruction libre…"
                  style={{ width: "100%", padding: "9px 11px", borderRadius: 7, border: `1px solid ${commentairesMode ? "#6C5CE7" : "#ddd"}`, fontSize: 11, fontFamily: "inherit", resize: "vertical", minHeight: 60, boxSizing: "border-box", background: commentairesMode ? "#FDFCFF" : "#fafafa", color: "#333" }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setCommentairesMode(!commentairesMode)}
                    style={{ padding: "8px 14px", borderRadius: 7, border: "1px solid #6C5CE7", background: commentairesMode ? "#6C5CE712" : "transparent", color: "#6C5CE7", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
                    ✏️ {commentairesMode ? "Fermer" : "Ajouter du contexte"}
                  </button>
                  <button
                    onClick={handleGenerateDoc}
                    disabled={isGenerating}
                    style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: isGenerating ? "#a29bfe" : "linear-gradient(135deg, #6C5CE7, #a29bfe)", color: "#fff", fontWeight: 700, fontSize: 11, cursor: isGenerating ? "wait" : "pointer", opacity: isGenerating ? 0.7 : 1 }}>
                    {isGenerating ? "⏳ Analyse en cours…" : "▶ Exécuter"}
                  </button>
                </div>
                {executed && executed.resultUrl && (
                  <div style={{ background: "#F8FFF8", borderRadius: 7, padding: 10, marginTop: 10, border: "1px solid #00B89420" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#00B894", marginBottom: 4 }}>✅ Rapport généré :</div>
                    <div style={{ fontSize: 11, color: "#555", lineHeight: 1.6 }}>
                      Le rapport « {executed.label} » est disponible dans les documents du client.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Generating overlay */}
          {isGenerating && (
            <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(255,255,255,0.85)", zIndex: 9998, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
              <div className="spinner-border text-primary" style={{ width: "3rem", height: "3rem" }} role="status">
                <span className="sr-only">Chargement...</span>
              </div>
              <h4 className="mt-2 text-primary font-weight-bold">Analyse en cours...</h4>
              <p className="text-dark font-weight-bold">Merci de ne pas fermer cette page.</p>
              <button type="button" onClick={handleCancelGeneration} style={{ position: "absolute", top: 15, right: 15, background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "50%", color: "#dc2626", cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: "bold" }} title="Interrompre l'analyse">✕</button>
            </div>
          )}
        </div>
      )}

{/* ═══════════════════════════════════════════════════════════════════════
          MODE ADMIN
          ═══════════════════════════════════════════════════════════════════════ */}
      {mode === "admin" && (
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "18px 16px" }}>
          <div style={{ background: "linear-gradient(135deg, #E17055 0%, #D63031 100%)", borderRadius: 11, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>⚙️ Administration du moteur IA</div>
              <div style={{ color: "#FFEAA7", fontSize: 10, marginTop: 2 }}>Règles métier · Paramètres annuels · Formules · Prompts · Architecture</div>
            </div>
            <div style={{ fontSize: 10, color: "#fff", background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>🔐 Accès administrateur</div>
          </div>

          <div className="simu-admin-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {Object.entries(ADMIN_SECTIONS).map(([key, sec]) => (
                <button key={key} onClick={() => { setAdminSection(key); setExpandedRule(null); setExpandedParam(null); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, border: `2px solid ${adminSection === key ? sec.color : "transparent"}`, background: adminSection === key ? `${sec.color}10` : "#fff", cursor: "pointer", textAlign: "left", boxShadow: adminSection === key ? `0 2px 8px ${sec.color}20` : "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <span style={{ fontSize: 18 }}>{sec.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: adminSection === key ? sec.color : "#333" }}>{sec.label}</div>
                    <div style={{ fontSize: 9, color: "#999" }}>{sec.items?.length ? `${sec.items.length} éléments` : sec.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ ...S.card, padding: 18 }}>

              {/* RÈGLES */}
              {adminSection === "regles" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                    <span style={{ fontSize: 18 }}>📜</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#6C5CE7" }}>Règles métier</span>
                    <span style={{ fontSize: 10, color: "#888" }}>— Fichiers .md + liens législation officielle</span>
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
                              {hasMd
                                ? <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#6C5CE712", color: "#6C5CE7", fontWeight: 600 }}>📄 {rule.file}</span>
                                : <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#D6303115", color: "#D63031", fontWeight: 600 }}>⚠ Fichier manquant</span>
                              }
                              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#0984E312", color: "#0984E3", fontWeight: 600 }}>🔗 Officiel</span>
                            </div>
                          </div>
                          {expandedRule === i && (
                            <div style={{ padding: "10px 12px", borderTop: "1px solid #eee", background: "#fff" }}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {hasMd ? (
                                  <button
                                    onClick={() => setModal({ title: MD_CONTENT[rule.contentKey].title, content: MD_CONTENT[rule.contentKey].content, lines: MD_CONTENT[rule.contentKey].lines, color: "#6C5CE7" })}
                                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #6C5CE7", background: "#6C5CE708", color: "#6C5CE7", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>
                                    📄 Ouvrir {rule.file}
                                  </button>
                                ) : (
                                  <span style={{ fontSize: 10, color: "#D63031", padding: "6px 0" }}>⚠ Fichier MD à créer dans 01_REGLEMENTATION/</span>
                                )}
                                <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #0984E3", background: "#0984E308", color: "#0984E3", fontWeight: 600, fontSize: 10, cursor: "pointer" }}>🔗 Site officiel</button>
                                <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #00B894", background: "#00B89408", color: "#00B894", fontWeight: 600, fontSize: 10, cursor: "pointer" }}>✏️ Éditer</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PARAMÈTRES */}
              {adminSection === "parametres" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 18 }}>📐</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#0984E3" }}>Paramètres annuels</span>
                    </div>
                    <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "#E1705515", color: "#E17055", fontWeight: 700 }}>⚠ À mettre à jour chaque année</span>
                  </div>
                  <div className="simu-params-grid">
                    {ADMIN_SECTIONS.parametres.items.map((param, i) => (
                      <div key={param.id} onClick={() => setExpandedParam(expandedParam === i ? null : i)} style={{ borderRadius: 8, border: `1px solid ${expandedParam === i ? "#0984E330" : "#eee"}`, padding: "10px 12px", cursor: "pointer", background: expandedParam === i ? "#0984E306" : "#fafafa" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                            <span style={{ fontSize: 14 }}>{param.icon}</span>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600 }}>{param.label}</div>
                              <div style={{ fontSize: 9, color: "#888" }}>{param.desc}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0984E3" }}>{param.value}</div>
                            <div style={{ fontSize: 9, color: "#999" }}>{param.year}{param.maj ? ` · màj ${param.maj}` : ""}</div>
                          </div>
                        </div>

                        {/* CSG : tableau taux */}
                        {param.csgDetail && expandedParam === i && (
                          <div className="simu-table-wrap" style={{ marginTop: 7 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                              <thead>
                                <tr style={{ background: "#f5f5f5" }}>
                                  {["Taux CSG", "Catégorie", "CRDS 0,5%", "CASA 0,3%"].map((h) => (
                                    <th key={h} style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600, color: "#555" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {param.csgDetail.map((row, j) => (
                                  <tr key={j} style={{ background: j % 2 === 0 ? "#fff" : "#fafafa" }}>
                                    <td style={{ padding: "4px 8px", fontWeight: 700, color: "#0984E3" }}>{row.taux}</td>
                                    <td style={{ padding: "4px 8px", color: "#555" }}>{row.label}</td>
                                    <td style={{ padding: "4px 8px", textAlign: "center" }}>{row.crds ? "✓" : "—"}</td>
                                    <td style={{ padding: "4px 8px", textAlign: "center" }}>{(row.taux === "6,6%" || row.taux === "8,3%") ? "✓" : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {expandedParam === i && (
                          <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                            <button style={{ fontSize: 9, padding: "4px 10px", borderRadius: 5, border: "1px solid #E17055", background: "#E1705508", color: "#E17055", fontWeight: 600, cursor: "pointer" }}>✏️ Modifier</button>
                            <button style={{ fontSize: 9, padding: "4px 10px", borderRadius: 5, border: "1px solid #888", background: "#88888808", color: "#888", fontWeight: 600, cursor: "pointer" }}>📜 Historique</button>
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
                    <span style={{ fontSize: 18 }}>🧮</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#00B894" }}>Formules de calcul</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ADMIN_SECTIONS.formules.items.map((f) => (
                      <div key={f.id} style={{ borderRadius: 8, padding: "12px 14px", background: "#fafafa", border: "1px solid #eee", borderLeft: "3px solid #00B894" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 14 }}>{f.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#00B894" }}>{f.label}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'IBM Plex Mono', 'Courier New', monospace", background: "#fff", borderRadius: 5, padding: "8px 10px", border: "1px solid #00B89420", marginBottom: 4 }}>{f.formula}</div>
                        <div style={{ fontSize: 10, color: "#666" }}>{f.desc}</div>
                        <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                          <button style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, border: "1px solid #00B894", background: "transparent", color: "#00B894", fontWeight: 600, cursor: "pointer" }}>📜 Règle</button>
                          <button style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, border: "1px solid #0984E3", background: "transparent", color: "#0984E3", fontWeight: 600, cursor: "pointer" }}>📐 Paramètres</button>
                          <button style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, border: "1px solid #E17055", background: "transparent", color: "#E17055", fontWeight: 600, cursor: "pointer" }}>✏️ Éditer</button>
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
                    <span style={{ fontSize: 18 }}>🤖</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#E17055" }}>Prompts IA & Skills N8N</span>
                    <span style={{ fontSize: 10, color: "#999" }}>— {ADMIN_SKILL_PROMPTS.filter(p => !p.missing).length} fichiers · {ADMIN_SKILL_PROMPTS.filter(p => p.missing).length} manquants</span>
                  </div>
                  {["Workflow principal", "Skills N8N", "Manquants — à créer"].map((cat) => {
                    const items = ADMIN_SKILL_PROMPTS.filter(p => p.category === cat);
                    return (
                      <div key={cat} style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: cat === "Manquants — à créer" ? "#D63031" : "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${cat === "Manquants — à créer" ? "#D6303120" : "#eee"}` }}>
                          {cat === "Manquants — à créer" ? "⚠ " : ""}{cat}
                        </div>
                        <div className="simu-prompts-grid">
                          {items.map((skill) => {
                            const hasContent = !!skill.contentKey && !!MD_CONTENT[skill.contentKey];
                            return (
                              <div key={skill.id} style={{ borderRadius: 7, padding: "9px 11px", background: skill.missing ? "#fafafa" : "#fff", border: `1px solid ${skill.missing ? "#f0f0f0" : "#e0e0e0"}`, borderLeft: `3px solid ${skill.missing ? "#ddd" : skill.color}`, opacity: skill.missing ? 0.6 : 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                                  <span style={{ fontSize: 14 }}>{skill.icon}</span>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: skill.missing ? "#aaa" : skill.color, flex: 1 }}>{skill.label}</span>
                                  {skill.missing && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: "#D6303115", color: "#D63031", fontWeight: 700 }}>À créer</span>}
                                </div>
                                <div style={{ display: "flex", gap: 4 }}>
                                  {hasContent ? (
                                    <button
                                      onClick={() => setModal({ title: MD_CONTENT[skill.contentKey].title, content: MD_CONTENT[skill.contentKey].content, lines: MD_CONTENT[skill.contentKey].lines, color: skill.color })}
                                      style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, border: `1px solid ${skill.color}`, background: `${skill.color}08`, color: skill.color, fontWeight: 700, cursor: "pointer" }}>
                                      👁 Voir le prompt
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: 9, color: "#D63031" }}>Fichier manquant</span>
                                  )}
                                  {!skill.missing && <button style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, border: "1px solid #888", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>✏️ Éditer</button>}
                                  {!skill.missing && <button style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, border: "1px solid #00B894", background: "transparent", color: "#00B894", fontWeight: 600, cursor: "pointer" }}>🧪 Tester</button>}
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
                    <span style={{ fontSize: 18 }}>📚</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#D63031" }}>Registre d'erreurs</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 14 }}>Règles Gate #2 — chaque erreur capturée bloque automatiquement les calculs incohérents</div>

                  {/* Stats */}
                  <div className="simu-auto-results-strip" style={{ marginBottom: 16 }}>
                    {[
                      { label: "Règles actives", val: REGISTRE_ERREURS.length, color: "#D63031" },
                      { label: "Règles archivées", val: 0, color: "#888" },
                      { label: "Dernière màj", val: "06/11/2025", color: "#555" },
                    ].map((s) => (
                      <div key={s.label} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "#fafafa", border: "1px solid #eee", textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 9, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Liste des règles */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#D63031", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>🔴 Règles actives (Gate #2)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {REGISTRE_ERREURS.map((r) => (
                      <div key={r.id} style={{ borderRadius: 8, border: "1px solid #D6303120", background: "#fff", overflow: "hidden" }}>
                        {/* Ligne titre — cliquable → modal */}
                        <button
                          onClick={() => setModal({
                            title: `${r.id} — ${r.title}`,
                            color: "#D63031",
                            lines: 10,
                            content:
                              `RÈGLE ${r.id} — Gate #2\n` +
                              `${"─".repeat(50)}\n\n` +
                              `Titre         : ${r.title}\n` +
                              `Date d'ajout  : ${r.date}\n` +
                              `Prompt        : ${r.prompt}\n\n` +
                              `Erreur        : ${r.erreur}\n\n` +
                              `Condition     : ${r.condition}\n\n` +
                              `Message       :\n${r.message}\n\n` +
                              `Impact        : ${r.impact}\n\n` +
                              `Statut        : ✅ ACTIF — 🔴 CRITIQUE (bloquant)`
                          })}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: "#D63031", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>🔴 {r.id}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a2e", flex: 1 }}>{r.title}</span>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 9, color: "#888" }}>{r.date}</span>
                            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "#D6303110", color: "#D63031", fontWeight: 700 }}>CRITIQUE</span>
                            <span style={{ fontSize: 9, color: "#6C5CE7" }}>👁 Voir →</span>
                          </div>
                        </button>
                        {/* Aperçu condition */}
                        <div style={{ padding: "0 13px 8px 13px", borderTop: "1px solid #f5f5f5" }}>
                          <code style={{ fontSize: 9, color: "#555", background: "#f5f5f5", padding: "3px 7px", borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace" }}>{r.condition}</code>
                          <span style={{ fontSize: 9, color: "#999", marginLeft: 8 }}>{r.erreur}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bouton ajouter */}
                  <button style={{ marginTop: 12, width: "100%", padding: "9px 0", borderRadius: 8, border: "2px dashed #D6303140", background: "transparent", color: "#D63031", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    + Ajouter une règle (PROMPT 3)
                  </button>
                </div>
              )}

              {/* FLUX */}
              {adminSection === "flux" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                    <span style={{ fontSize: 18 }}>🔀</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#D63031" }}>Flux & Architecture V6</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {[
                      { s: "1", t: "Analyse documents", d: "Rapprochements RIS vs autres sources — 5 actions (caisse, paie, FT, étranger, fonctionnaire)", c: "#6C5CE7" },
                      { s: "2", t: "Dispositifs", d: "Activer RACL, VPLR, progressive, chômage, cumul, arrêt… (9 dispositifs)", c: "#00B894" },
                      { s: "3", t: "Dates & Simulations", d: "Dates auto-calculées par l'IA + âge légal, taux plein, 67 ans, date libre", c: "#0984E3" },
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
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 6 }}>🔄 Résultats automatiques intégrés à chaque simulation :</div>
                    <div className="simu-auto-results-strip">
                      {AUTO_RESULTS.map((ar) => (
                        <div key={ar.id} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, background: `${ar.color}06`, border: `1px solid ${ar.color}15`, fontSize: 10 }}>
                          <span>{ar.icon}</span> <strong style={{ color: ar.color }}>{ar.label}</strong> — {ar.desc.split(".")[0]}.
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 16, background: "#1a1a2e", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 10 }}>🔧 Architecture du moteur</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr 40px 1fr", alignItems: "center" }}>
                      <div style={{ background: "#6C5CE720", borderRadius: 8, padding: 10, border: "1px solid #6C5CE740" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#a29bfe", marginBottom: 3 }}>📜 Règles .md</div>
                        <div style={{ fontSize: 9, color: "#888" }}>12 fichiers règles métier</div>
                      </div>
                      <div style={{ textAlign: "center", color: "#888", fontSize: 16 }}>→</div>
                      <div style={{ background: "#E1705520", borderRadius: 8, padding: 10, border: "1px solid #E1705540" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#E17055", marginBottom: 3 }}>🤖 Moteur IA</div>
                        <div style={{ fontSize: 9, color: "#888" }}>Prompt + Règles + Paramètres + Formules</div>
                      </div>
                      <div style={{ textAlign: "center", color: "#888", fontSize: 16 }}>→</div>
                      <div style={{ background: "#00B89420", borderRadius: 8, padding: 10, border: "1px solid #00B89440" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#00B894", marginBottom: 3 }}>📊 Résultats</div>
                        <div style={{ fontSize: 9, color: "#888" }}>+ surcote, min. contributif, majo. enfants</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <div style={{ background: "#0984E320", borderRadius: 8, padding: 8, border: "1px solid #0984E340" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#0984E3" }}>📐 19 paramètres annuels</div>
                        <div style={{ fontSize: 9, color: "#888" }}>PASS, SMIC, points, taux cotis. T1/T2, appel 127%, CSG…</div>
                      </div>
                      <div style={{ background: "#00B89420", borderRadius: 8, padding: 8, border: "1px solid #00B89440" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#00B894" }}>🧮 8 formules de calcul</div>
                        <div style={{ fontSize: 9, color: "#888" }}>Pension CNAV, décote, surcote, SAM, points AGIRC-ARRCO…</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "12px 20px", textAlign: "center", fontSize: 9, color: "#bbb", borderTop: "1px solid #eee", marginTop: 24 }}>
        <div style={{ marginTop: 24, textAlign: "right" }}>
          <button 
            onClick={() => {
              const form = document.getElementById("user-edit-form");
              if (form) {
                form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
              }
            }}
            style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#28c76f", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px 0 rgba(40, 199, 111, 0.39)" }}>
            Mettre à jour
          </button>
        </div>
      </div>

      {/* Modale de suppression */}
      <Modal
        isOpen={deleteModal.isOpen}
        toggle={toggleDeleteModal}
        centered
      >
        <ModalHeader toggle={toggleDeleteModal}>
          Supprimer le fichier
        </ModalHeader>
        <ModalBody>Êtes-vous sûr de vouloir supprimer ce document ?</ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={confirmDeleteDocument}>
            Supprimer
          </Button>{" "}
          <Button color="danger" onClick={toggleDeleteModal}>
            Annuler
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );

}
