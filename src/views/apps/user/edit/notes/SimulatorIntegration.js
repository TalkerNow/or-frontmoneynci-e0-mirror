/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Dropzone from "react-dropzone";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, UncontrolledTooltip } from "reactstrap";
import { DownloadCloud, Eye } from "react-feather";
import {
  QUICK_TAGS_OPTIONS,
  generateDocId,
  persistUploadedDocs,
  loadUploadedDocs,
  parseNIR,
} from "./utils";
import { executeSkill, executeScript, executeSkillGeneric, executeRaclScenario, executeTnsScenario, executeChomageIndScenario, fetchLatestReport, saveSkillResult, fetchSkillsList, fetchRISAnalysisV6, executeAgircArrcoWebhook } from "../risService";
import { calculateArrco, calculateIrcantec, calculateRci } from '../../../../../utils/calculators';
import api from "../../../../../services/api";
import SkillEditModal from "./SkillEditModal";
import SkillCreateModal from "./SkillCreateModal";
import SweetAlert from "react-bootstrap-sweetalert";
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
    label: "Scénarios", icon: "🔧", color: "#00B894", order: 3,
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
      { id: "sim_date_libre", label: "Dates libres", icon: "📆", requires: ["ris"], hasInput: true, inputType: "date", inputLabel: "Date souhaitée", desc: "Choisir une date, voir l'impact complet", auto: false },
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


// Mapping dispositif UI id → skill_code DB (null = pas de skill générique pour ce dispositif)
const DISPOSITIF_TO_SKILL_CODE = {
  racl: "RACL",
  rachat_incomplete: "VPLR",
  rachat_etude: "VPLR",
  retraite_progressive: "RETRAITE_PROGRESSIVE",
  cumul_emploi: "CUMUL_EMPLOI_RETRAITE",
  chomage_ind: "CHOMAGE_INDEMNISE",
  chomage_non_ind: null,
  arret_activite: null,
  cotisations_min: "COTISATIONS_MIN",
  trimestres_etranger: "TRIMESTRES_ETRANGER",
  reversion: "REVERSION",
};

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
      { id: "cnav_base", label: "Régime de base CNAV", icon: "🏛️", file: "circulaire_revalorisation_2025.md", contentKey: "cnav_base", officialUrl: "https://www.lassuranceretraite.fr/", desc: "Calcul pension, SAM, taux, durée d'assurance" },
      { id: "agirc_arrco", label: "AGIRC-ARRCO", icon: "📊", file: "REGIMES-COMPLEMENTAIRE-AGIRC_ARRCO.md", contentKey: "agirc_arrco", officialUrl: "https://www.agirc-arrco.fr/", desc: "Points, valeur de service, coefficients" },
      { id: "ircantec", label: "Ircantec", icon: "🏢", file: null, contentKey: null, officialUrl: "https://www.ircantec.retraites.fr/", desc: "Points, calcul pension agents non titulaires", missing: true },
      { id: "rci", label: "RCI / SSI", icon: "📑", file: "circulaire_rci_2025.md", contentKey: "rci", officialUrl: "https://www.lassuranceretraite.fr/portail-info/hors-menu/annexe/travailleurs-independants/retraite-complementaire.html", desc: "Complémentaire indépendants, BIC/BNC" },
      { id: "racl", label: "Carrière longue (RACL)", icon: "⏩", file: "racl-regles-conditions.md", contentKey: "racl", officialUrl: "https://www.service-public.fr/particuliers/vosdroits/F13845", desc: "Conditions, seuils, trimestres retenus" },
      { id: "vplr", label: "Rachat VPLR", icon: "🧩", file: "circulaire_rachat_vplr_2025.md", contentKey: "vplr", officialUrl: "https://www.service-public.fr/particuliers/vosdroits/F15675", desc: "Barèmes, options taux/proratisation" },
      { id: "progressive", label: "Retraite progressive", icon: "⚖️", file: "SKILL_retraite_progressive.md", contentKey: "progressive", officialUrl: "https://www.lassuranceretraite.fr/portail-info/home/actif/je-souhaite-partir-plus-tot/retraite-progressive.html#:~:text=La%20retraite%20progressive%20permet%20de,plusieurs%20activit%C3%A9s%20%C3%A0%20temps%20partiel.", desc: "Conditions, fraction, quotité" },
      { id: "cumul", label: "Cumul emploi-retraite", icon: "🔄", file: "SKILL_cumul_emploi_retraite.md", contentKey: "cumul", officialUrl: "https://www.service-public.fr/particuliers/vosdroits/F13243", desc: "Intégral, plafonné, 2e pension réforme 2023" },
      { id: "chomage", label: "Chômage et retraite", icon: "📉", file: null, contentKey: null, officialUrl: "https://www.francetravail.fr/candidat/mes-droits-aux-aides-et-allocati/a-chaque-situation-son-allocatio/quelle-est-ma-situation-personne/je-suis-proche-de-la-retraite.html", desc: "Assimilés, non indemnisé, exception +55 ans", missing: true },
      { id: "conventions", label: "Conventions internationales", icon: "🌍", file: "SKILL_trimestres_etranger.md", contentKey: "conventions", officialUrl: "https://www.cleiss.fr/", desc: "Bilatérales, UE, totalisation/proratisation" },
      { id: "minimum", label: "Minimum contributif", icon: "🔒", file: null, contentKey: null, officialUrl: "https://www.service-public.fr/particuliers/vosdroits/F15522", desc: "Base, majoré, plafond toutes pensions", missing: true },
      { id: "majorations", label: "Majorations (enfants, handicap…)", icon: "👶", file: null, contentKey: null, officialUrl: "https://www.service-public.fr/particuliers/vosdroits/F14818", desc: "MDA, +10% 3 enfants, tierce personne", missing: true },
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
      { id: "f_sam", label: "SAM 25 meilleures", icon: "💰", formula: "Σ(meilleures années, max 25, salaire > 0) / N", desc: "Salaires plafonnés au PASS, revalorisés — années à 0€ exclues" },
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

// Détection automatique des dispositifs applicables à partir des données RIS
function detectDispositifsFromRIS(trimCot, birthDate) {
  const detected = {};
  if (!birthDate) return detected;

  const birthYear = parseInt((birthDate || "").split("-")[0] || (birthDate || "").split("/")[2], 10);
  if (!birthYear) return detected;

  // Années avec au moins 1 trimestre cotisé
  const activeYears = Object.entries(trimCot)
    .filter(([, t]) => parseInt(t, 10) > 0)
    .map(([yr]) => parseInt(yr, 10))
    .sort((a, b) => a - b);

  const firstWorkYear = activeYears[0] || null;

  // RACL — début d'activité avant 21 ans
  if (firstWorkYear) {
    const ageDebutCarriere = firstWorkYear - birthYear;
    if (ageDebutCarriere <= 20 && ageDebutCarriere >= 14) {
      detected.racl = `Début d'activité à ${ageDebutCarriere} ans détecté sur le RIS (${firstWorkYear})`;
    }
  }

  // VPLR rachat années incomplètes — au moins une année avec 1-3 trimestres
  const incompletYears = Object.entries(trimCot)
    .filter(([, t]) => { const v = parseInt(t, 10); return v > 0 && v < 4; })
    .map(([yr]) => yr);
  if (incompletYears.length > 0) {
    detected.rachat_incomplete = `${incompletYears.length} année(s) incomplète(s) (${incompletYears.slice(0, 3).join(", ")}${incompletYears.length > 3 ? "…" : ""})`;
  }

  // Retraite progressive — âge légal estimé selon génération (réforme 2023)
  const ageLegal = birthYear >= 1968 ? 64
    : birthYear >= 1965 ? 63.5
    : birthYear >= 1963 ? 63
    : birthYear >= 1961 ? 62.5
    : 62;
  const ageApprox = 2026 - birthYear;
  if (ageApprox >= ageLegal - 4 && ageApprox <= ageLegal + 3) {
    detected.retraite_progressive = `Profil compatible — âge ~${ageApprox} ans (éligible dès ${ageLegal - 2} ans)`;
  }

  return detected;
}

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


const PLAFONDS_SS = {
  1985: Math.round(106740/6.55957), 1986: Math.round(112200/6.55957),
  1987: Math.round(116820/6.55957), 1988: Math.round(120360/6.55957),
  1989: Math.round(125280/6.55957), 1990: Math.round(131040/6.55957),
  1991: Math.round(137760/6.55957), 1992: Math.round(144120/6.55957),
  1993: Math.round(149820/6.55957), 1994: Math.round(153120/6.55957),
  1995: Math.round(155940/6.55957), 1996: Math.round(161220/6.55957),
  1997: Math.round(164640/6.55957), 1998: Math.round(169080/6.55957),
  1999: Math.round(173640/6.55957), 2000: Math.round(176400/6.55957),
  2001: Math.round(179400/6.55957),
  2002: 28224,  2003: 29184,  2004: 29712,
  2005: 30192,  2006: 31068,  2007: 32184,  2008: 33276,
  2009: 34308,  2010: 34620,  2011: 35352,  2012: 36372,
  2013: 37032,  2014: 37548,  2015: 38040,  2016: 38616,
  2017: 39228,  2018: 39732,  2019: 40524,  2020: 41136,
  2021: 41136,  2022: 41136,  2023: 43992,  2024: 46368,
  2025: 47100,  2026: 48060,
};

const ADMIN_SKILL_PROMPTS = [
  { id: "sk_prompt1",    label: "PROMPT 1 — Rapport de génération pré-entretien", icon: "🔍", color: "#6C5CE7", contentKey: "sk_prompt1",    category: "Workflow principal" },
  { id: "sk_prompt2",    label: "PROMPT 2 — Rapport de consultation client",  icon: "📄", color: "#6C5CE7", contentKey: "sk_prompt2",    category: "Workflow principal" },
  { id: "sk_prompt3",    label: "PROMPT 3 — Auto-apprentissage erreurs",      icon: "🧠", color: "#6C5CE7", contentKey: "sk_prompt3",    category: "Workflow principal" },
  { id: "sk_workflow",   label: "Workflow consultation final",                 icon: "🔀", color: "#D63031", contentKey: "sk_workflow",   category: "Workflow principal" },
  // ── Manquants — à créer ──
  { id: "miss_paie",      label: "Rapprochement RIS / bulletin de salaire",    icon: "💶", color: "#666", contentKey: null, category: "Manquants — à créer", missing: true },
  { id: "miss_ft",        label: "Rapprochement RIS / France Travail",         icon: "📉", color: "#666", contentKey: null, category: "Manquants — à créer", missing: true },
  { id: "miss_fp",        label: "Rapprochement RIS / fonctionnaire Ircantec", icon: "🏛️", color: "#666", contentKey: null, category: "Manquants — à créer", missing: true },
  { id: "miss_chomage",   label: "Chômage indemnisé / non indemnisé",          icon: "⚠️", color: "#666", contentKey: null, category: "Manquants — à créer", missing: true },
  { id: "miss_arret",     label: "Arrêt d'activité",                           icon: "🛑", color: "#666", contentKey: null, category: "Manquants — à créer", missing: true },
  { id: "miss_tns",       label: "Cotisations minimales TI/TNS",               icon: "📑", color: "#666", contentKey: null, category: "Manquants — à créer", missing: true },
  { id: "miss_mincontrib",label: "Minimum contributif",                        icon: "🔒", color: "#666", contentKey: null, category: "Manquants — à créer", missing: true },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────

function _buildDefaultCarriereRows() {
  return Array.from({ length: 65 }, (_, i) => {
    const yr = 2026 - i;
    const coeff = REVALO_CNAV[yr] || 1;
    return { yr, sal: 0, ss: 0, coeff: coeff.toFixed(3), revalo: 0, trim: 0, ar: 0, total: 0, agircPts: 0, ircPts: 0, rciPts: 0 };
  });
}

// ─── CIPAV RESULT CARD ──────────────────────────────────────────────────────

function CipavResult({ po }) {
  const baseAnnuelle = po.pension_base_annuelle != null
    ? po.pension_base_annuelle
    : (po.points_base || 0) * (po.valeur_point_base || 0);
  const complAnnuelle = po.pension_complementaire_annuelle != null
    ? po.pension_complementaire_annuelle
    : (po.points_complementaire || 0) * (po.valeur_point_complementaire || 0);
  const totalAnnuel = po.pension_annuelle_brute != null ? po.pension_annuelle_brute : (baseAnnuelle + complAnnuelle);
  const totalMensuel = po.pension_mensuelle_brute != null ? po.pension_mensuelle_brute : (totalAnnuel / 12);
  const ptsBase = po.points_base != null ? po.points_base : (po.details_points && po.details_points.base);
  const ptsCompl = po.points_complementaire != null ? po.points_complementaire : (po.details_points && po.details_points.complementaire);

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ background: "#9B59B608", border: "1px solid #9B59B620", borderRadius: 8, padding: "10px 14px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#9B59B6", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Résultat CIPAV</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div style={{ background: "#9B59B618", borderRadius: 7, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: "#555", marginBottom: 4 }}>Total mensuel</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#9B59B6" }}>
              {totalMensuel.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
            </div>
          </div>
          <div style={{ background: "#fbf8fd", borderRadius: 7, padding: "10px 12px", border: "1px solid #9B59B610" }}>
            <div style={{ fontSize: 9, color: "#555", marginBottom: 4 }}>Total annuel</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>
              {totalAnnuel.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} €
            </div>
          </div>
          <div style={{ background: "#fbf8fd", borderRadius: 7, padding: "8px 10px", border: "1px solid #9B59B608" }}>
            <div style={{ fontSize: 8, color: "#666", marginBottom: 2 }}>Base annuelle</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>{baseAnnuelle.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</div>
          </div>
          <div style={{ background: "#fbf8fd", borderRadius: 7, padding: "8px 10px", border: "1px solid #9B59B608" }}>
            <div style={{ fontSize: 8, color: "#666", marginBottom: 2 }}>Compl. annuelle</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>{complAnnuelle.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            ["Points base", ptsBase != null ? ptsBase.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : null],
            ["Points complémentaire", ptsCompl != null ? ptsCompl.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : null],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, borderBottom: "1px solid #9B59B610", paddingBottom: 4 }}>
              <span style={{ color: "#666" }}>{label}</span>
              <span style={{ fontWeight: 700, color: "#1a1a2e" }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export default function SimulatorV6({ mode = "production", id, user, onUserUpdate }) {
  // ── UI State ──
  const [apiSkills, setApiSkills] = useState([]);
  const [apiSkillsLoading, setApiSkillsLoading] = useState(false);
  const [editSkillCode, setEditSkillCode] = useState(null);
  const [createSkillOpen, setCreateSkillOpen] = useState(false);

  const fetchApiSkills = useCallback(() => {
    setApiSkillsLoading(true);
    api.get("/v1/skills")
      .then((res) => setApiSkills(res.data))
      .catch(() => toast.error("Impossible de charger les skills"))
      .finally(() => setApiSkillsLoading(false));
  }, []);

  useEffect(() => {
    fetchApiSkills();
  }, [fetchApiSkills]);

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
  const [preentretienModal, setPreentretienModal] = useState(null);
  const [systemPromptModal, setSystemPromptModal] = useState(null);
  const [hiddenSystemPrompt, setHiddenSystemPrompt] = useState("");

  const openPreentretienEditor = async () => {
    setPreentretienModal({ text: "", loading: true, saving: false });
    try {
      const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
      const response = await axios.get(`${global.config.server_url}/prompts/4`, Config);
      const text = (response && response.data && response.data.prompt_text) || "";
      setPreentretienModal({ text, loading: false, saving: false });
    } catch (err) {
      toast.error("Impossible de charger le prompt pré-entretien");
      setPreentretienModal(null);
    }
  };

  const savePreentretienPrompt = async (text) => {
    setPreentretienModal((m) => (m ? { ...m, saving: true } : m));
    try {
      const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
      await axios.put(
        `${global.config.server_url}/prompts/4`,
        { prompt_text: text },
        Config
      );
      toast.success("Prompt pré-entretien enregistré avec succès");
      setPreentretienModal(null);
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement du prompt");
      setPreentretienModal((m) => (m ? { ...m, saving: false } : m));
    }
  };

  const openSystemPromptEditor = async () => {
    setSystemPromptModal({ text: "", id: null, loading: true, saving: false });
    try {
      const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
      const response = await axios.get(`${global.config.server_url}/v1/system-prompt/latest`, Config);
      const { id, prompt_text } = response.data;
      setSystemPromptModal({ text: prompt_text || "", id, loading: false, saving: false });
    } catch (err) {
      toast.error("Impossible de charger le system prompt");
      setSystemPromptModal(null);
    }
  };

  const saveSystemPrompt = async (text) => {
    if (!systemPromptModal?.id) return;
    setSystemPromptModal((m) => (m ? { ...m, saving: true } : m));
    try {
      const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
      await axios.put(
        `${global.config.server_url}/prompts/${systemPromptModal.id}`,
        { prompt_text: text },
        Config
      );
      toast.success("System prompt enregistré avec succès");
      setSystemPromptModal(null);
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement du system prompt");
      setSystemPromptModal((m) => (m ? { ...m, saving: false } : m));
    }
  };

  const [activatedDispositifs, setActivatedDispositifs] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [showAutoResults, setShowAutoResults] = useState(false);
  const [excludedDates, setExcludedDates] = useState([]);
  const [carriereValidee, setCarriereValidee] = useState(false);
  const [lockedAt, setLockedAt] = useState(null);
  const [lockedBy, setLockedBy] = useState(null); // eslint-disable-line no-unused-vars
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [cnavplOpen, setCnavplOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [cnavplClosing, setCnavplClosing] = useState(false);
  const [samOpen, setSamOpen] = useState(false);
  const [accordeonsVisible, setAccordeonsVisible] = useState(true);
  const [openAccordeons, setOpenAccordeons] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [revaloValues, setRevaloValues] = useState(() => {
    const init = {};
    for (let i = 0; i < 65; i++) { init[2026 - i] = 0; }
    return init;
  });
  const [deplafValues, setDeplafValues] = useState({});
  const [deplafSnapshots, setDeplafSnapshots] = useState({});

  // ── CNAV Skill State ──
  const [skillLoading, setSkillLoading] = useState(false);
  const [skillResult, setSkillResult] = useState(null);
  const [skillError, setSkillError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [availableSkills, setAvailableSkills] = useState([]);
  // ── Career data state (stable, populated from OCR or manual input) ──
  const [carriereRows, setCarriereRows] = useState(_buildDefaultCarriereRows);
  const [isCadreSimu, setIsCadreSimu] = useState(false);
  const [trimCotState, setTrimCotState] = useState(() => {
    const init = {};
    for (let i = 0; i < 65; i++) { init[2026 - i] = 0; }
    return init;
  });
  const [trimAssState, setTrimAssState] = useState(() => {
    const init = {};
    for (let i = 0; i < 65; i++) { init[2026 - i] = 0; }
    return init;
  });
  const [arState, setArState] = useState(() => {
    const init = {};
    for (let i = 0; i < 65; i++) { init[2026 - i] = 0; }
    return init;
  });
  const [frozenLoading, setFrozenLoading] = useState(false);
  const [isParsingRIS, setIsParsingRIS] = useState(false);
  const [visibleRowCount, setVisibleRowCount] = useState(20);
  const [risFileName, setRisFileName] = useState(null);
  const [droitsSynthese, setDroitsSynthese] = useState(null);
  const [risCarriereSynthese, setRisCarriereSynthese] = useState(null);
  const [lastRisPayload, setLastRisPayload] = useState(null);
  const [cnavplRows, setCnavplRows] = useState(() => {
    const yrs = [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015];
    return Object.fromEntries(yrs.map(yr => [yr, { revenus: "", revCnavpl: "", points: "" }]));
  });

  // ── AGIRC-ARRCO Skill State ──
  const [agircLoading, setAgircLoading] = useState(false);
  const [agircResult, setAgircResult] = useState(null);
  const [agircError, setAgircError] = useState(null);

  // ── IRCANTEC Skill State ──
  const [ircantecLoading, setIrcantecLoading] = useState(false);
  const [ircantecResult, setIrcantecResult] = useState(null);
  const [ircantecError, setIrcantecError] = useState(null);

  // ── RCI Skill State ──
  const [rciLoading, setRciLoading] = useState(false);
  const [rciResult, setRciResult] = useState(null);
  const [rciError, setRciError] = useState(null);

  // ── CIPAV Skill State ──
  const [cipavLoading, setCipavLoading] = useState(false);
  const [cipavResult, setCipavResult] = useState(null);
  const [cipavError, setCipavError] = useState(null);

  // ── Master "Calculate All" State ──
  const [isCalculatingAll, setIsCalculatingAll] = useState(false);

  // ── Scénarios — Generic Skill Executor State ──
  const [scenarioSkillResults, setScenarioSkillResults] = useState({});
  const [scenarioSkillLoading, setScenarioSkillLoading] = useState({});
  const [scenarioSkillErrors, setScenarioSkillErrors] = useState({});

  // ── Détection automatique des dispositifs applicables ──
  const [detectedDispositifs, setDetectedDispositifs] = useState({});

  // ── Upload & Analysis State (migrated from useNotesLogic) ──
  const [fileToSend, setFileToSend] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userDocuments, setUserDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, docId: null, fileName: "" });
  const [localUploadedIds, setLocalUploadedIds] = useState(() => new Set(loadUploadedDocs(id).map((d) => String(d.id))));
  // eslint-disable-next-line no-unused-vars
  const [n8nMessage, setN8nMessage] = useState(() => {
    try {
      const stored = sessionStorage.getItem(`simu_n8n_message_${id}`);
      return stored || "";
    } catch { return ""; }
  });
  const cancelRef = useRef(null);
  const hasHydratedRef = useRef(false);
  // const clientNames = useMemo(() => extractClientNames(user), [user]);

  // Persist n8nMessage to sessionStorage
  useEffect(() => {
    if (!id) return;
    try { sessionStorage.setItem(`simu_n8n_message_${id}`, n8nMessage); }
    catch (e) { /* noop */ }
  }, [n8nMessage, id]);

  // Load cached skill results from DB on mount (persist across F5)
  useEffect(() => {
    if (!id) return;
    const loadCached = async () => {
      const skillMap = [
        ["CNAV",        setSkillResult],
        ["AGIRC_ARRCO", setAgircResult],
        ["IRCANTEC",    setIrcantecResult],
        ["RCI",         setRciResult],
        ["CIPAV",       setCipavResult],
      ];
      for (const [code, setter] of skillMap) {
        try {
          const report = await fetchLatestReport(id, code);
          const result = report?.result_json;
          // Only restore v2 results (mode: 'parallel_v2.x') — old v1 records have different field names
          if (result?.python_output && result.mode?.startsWith('parallel')) {
            setter(result);
          }
        } catch { /* 404 = pas encore calculé, on ignore */ }
      }

      // Recharger les résultats skills scénarios (RACL, VPLR, etc.)
      const scenarioCodes = Object.values(DISPOSITIF_TO_SKILL_CODE).filter(Boolean);
      const uniqueCodes = [...new Set(scenarioCodes)];
      const scenarioResults = {};
      for (const code of uniqueCodes) {
        try {
          const report = await fetchLatestReport(id, code);
          if (report?.result_json) scenarioResults[code] = report.result_json;
        } catch { /* 404 = jamais exécuté, on ignore */ }
      }
      if (Object.keys(scenarioResults).length > 0) {
        setScenarioSkillResults(scenarioResults);
      }
    };
    loadCached();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Détection réactive des dispositifs après import RIS ──────────────────
  const birthDate = user?.birth_date;
  useEffect(() => {
    const hasActivity = Object.values(trimCotState).some(t => parseInt(t, 10) > 0);
    if (!hasActivity || !birthDate) return;
    setDetectedDispositifs(detectDispositifsFromRIS(trimCotState, birthDate));
  }, [trimCotState, birthDate]);

  // ── Apply career rows from backend data ─────────────────────────────────
  // Handles two formats:
  //   RIS format  : { annee, sal_original, sal_eur, devise, regimes }
  //   SAISIE format: { annee, salaire_brut, salaire_revalo, trimestres_cotises, trimestres_assimiles }
  const applyCarriereData = useCallback((carriere) => {
    if (!Array.isArray(carriere) || !carriere.length) return 0;
    const minYear = Math.min(...carriere.map(r => r.annee));
    setVisibleRowCount(Math.min(Math.max(20, 2026 - minYear + 1), 65));
    setCarriereRows(prev => prev.map(row => {
      const entry = carriere.find(r => r.annee === row.yr);
      if (!entry) return row;
      // Normalize salary: new format uses revenu_brut, legacy uses salaire_brut, RIS uses sal_eur
      const salEur = entry.revenu_brut ?? entry.salaire_brut ?? entry.sal_eur ?? 0;
      const salOriginal = entry.revenu_brut ?? entry.salaire_brut ?? entry.sal_original ?? 0;
      const plaf = PLAFONDS_SS[row.yr] || 48060;
      const coeff = REVALO_CNAV[row.yr] || 1;
      const calculatedRevalo = Math.round(Math.min(salEur, plaf) * coeff);
      let uncappedRevalo = entry.salaire_revalo ?? calculatedRevalo;
      const revalo = Math.min(uncappedRevalo, plaf);
      const ss = Math.min(salEur, plaf);
      const pts = {};
      // Backward compatibility for points (supporting both points_ and pts_ prefixes)
      const agirc = entry.points_agirc_arrco ?? entry.pts_agirc_arrco;
      if (agirc != null) pts.agircPts = agirc;
      const irc = entry.points_ircantec ?? entry.pts_ircantec;
      if (irc != null)   pts.ircPts = irc;
      const rci = entry.points_rci ?? entry.pts_rci;
      if (rci != null)   pts.rciPts = rci;
      return { ...row, sal: salOriginal, ss, revalo, devise: entry.devise || '€', regimes_concernes: entry.regimes_concernes || '', ...pts };
    }));
    setRevaloValues(prev => {
      const next = { ...prev };
      carriere.forEach(entry => {
        const salEur = entry.revenu_brut ?? entry.salaire_brut ?? entry.sal_eur ?? 0;
        const plaf = PLAFONDS_SS[entry.annee] || 48060;
        const coeff = REVALO_CNAV[entry.annee] || 1;
        const calculatedRevalo = Math.round(Math.min(salEur, plaf) * coeff);
        let uncappedRevalo = entry.salaire_revalo ?? calculatedRevalo;
        next[entry.annee] = Math.min(uncappedRevalo, plaf);
      });
      return next;
    });
    // Restore trimestres if present (SAISIE format)
    const hasTrim = carriere.some(e => e.trimestres_cotises != null || e.trimestres_assimiles != null);
    if (hasTrim) {
      setTrimCotState(prev => {
        const next = { ...prev };
        carriere.forEach(e => { if (e.trimestres_cotises != null) next[e.annee] = e.trimestres_cotises; });
        return next;
      });
      setTrimAssState(prev => {
        const next = { ...prev };
        carriere.forEach(e => { if (e.trimestres_assimiles != null) next[e.annee] = e.trimestres_assimiles; });
        return next;
      });
      setArState(prev => {
        const next = { ...prev };
        carriere.forEach(e => { if (e.trimestres_ar != null) next[e.annee] = e.trimestres_ar; });
        return next;
      });
    }
    // Count years where the revalorized salary hit the PASS ceiling (matches isPlafonne in UI)
    return carriere.filter(entry => {
      const salEur = entry.revenu_brut ?? entry.salaire_brut ?? entry.sal_eur ?? 0;
      if (!salEur) return false;
      const plaf = PLAFONDS_SS[entry.annee] || 48060;
      const coeff = REVALO_CNAV[entry.annee] || 1;
      const uncappedRevalo = entry.salaire_revalo ?? Math.round(Math.min(salEur, plaf) * coeff);
      return uncappedRevalo >= plaf;
    }).length;
  }, []);

  // Load career data from frozen_data on mount
  useEffect(() => {
    if (!id) return;
    const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
    axios.get(`${global.config.server_url}/frozen_data/${id}`, Config)
      .then(res => {
        // Restore CIPAV points (from dedicated column or legacy carriere objects)
        const cipav = res.data?.cipav;
        const carriere = res.data?.carriere;

        if (Array.isArray(cipav) && cipav.length) {
          setCnavplOpen(true);
          setCnavplRows(prev => {
            const next = { ...prev };
            cipav.forEach(e => {
              if (e.annee) {
                // Support both new points_cipav_* and legacy pts_cipav_* keys
                const ptsBase = e.points_cipav_base ?? e.pts_cipav_base;
                const ptsCompl = e.points_cipav_complementaire ?? e.pts_cipav_complementaire;
                
                next[e.annee] = {
                  ...(next[e.annee] || { revenus: "", revCnavpl: "" }),
                  points: ptsBase ?? (next[e.annee]?.points ?? ""),
                  pointsCompl: ptsCompl ?? (next[e.annee]?.pointsCompl ?? ""),
                };
              }
            });
            return next;
          });
        }

        if (Array.isArray(carriere) && carriere.length) {
          applyCarriereData(carriere);

          // Legacy fallback: Restore CIPAV from carriere if cipav column was empty
          if (!Array.isArray(cipav) || !cipav.length) {
            const hasCipav = carriere.some(e => e.pts_cipav_base != null || e.pts_cipav_complementaire != null);
            if (hasCipav) {
              setCnavplOpen(true);
              setCnavplRows(prev => {
                const next = { ...prev };
                carriere.forEach(e => {
                  const ptsBase = e.points_cipav_base ?? e.pts_cipav_base;
                  const ptsCompl = e.points_cipav_complementaire ?? e.pts_cipav_complementaire;
                  
                  if (ptsBase != null || ptsCompl != null) {
                    next[e.annee] = {
                      ...(next[e.annee] || { revenus: "", revCnavpl: "" }),
                      points: ptsBase != null ? ptsBase : (next[e.annee]?.points ?? ""),
                      pointsCompl: ptsCompl != null ? ptsCompl : (next[e.annee]?.pointsCompl ?? ""),
                    };
                  }
                });
                return next;
              });
            }
          }
        }
        // Restore frozen state if data was previously geled
        if (res.data?.locked_at) {
          setCarriereValidee(true);
          setLockedAt(res.data.locked_at);
          setLockedBy(res.data.locked_by);
        }
      })
      .catch(() => { /* pas de données = normal */ });
  }, [id, applyCarriereData]);

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

  // ── Réinitialiser le tableau carrière ───────────────────────────────────────
  const doResetCarriere = useCallback(async () => {
    setShowResetConfirm(false);
    setCarriereRows(_buildDefaultCarriereRows());
    setRevaloValues(() => { const init = {}; for (let i = 0; i < 65; i++) { init[2026 - i] = 0; } return init; });
    setDeplafValues({});
    setDeplafSnapshots({});
    setTrimCotState(() => { const init = {}; for (let i = 0; i < 65; i++) { init[2026 - i] = 0; } return init; });
    setTrimAssState(() => { const init = {}; for (let i = 0; i < 65; i++) { init[2026 - i] = 0; } return init; });
    setArState(() => { const init = {}; for (let i = 0; i < 65; i++) { init[2026 - i] = 0; } return init; });
    setCnavplRows(Object.fromEntries([2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015].map(yr => [yr, { revenus: "", revCnavpl: "", points: "" }])));
    setCnavplOpen(false);
    setVisibleRowCount(20);
    setCarriereValidee(false);
    setRisFileName(null);
    setLastRisPayload(null);
    try {
      const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
      await axios.delete(`${global.config.server_url}/frozen_data/${id}`, Config);
    } catch (e) {
      if (e?.response?.status !== 404) {
        toast.error("Échec de la suppression côté serveur. Les données reviendront au rechargement.");
        return;
      }
      // 404 = pas encore de données en base (import RIS non gelé) → normal
    }
    toast.success("Carrière réinitialisée.");
  }, [id]);

  const handleResetCarriere = useCallback(() => {
    if (carriereValidee) {
      toast.error("Cette carrière est validée. Déverrouillez-la avant de réinitialiser.");
      return;
    }
    setShowResetConfirm(true);
  }, [carriereValidee]);

  // ── Side Effects ──

  // Reset hydration tracker on client switch
  useEffect(() => {
    hasHydratedRef.current = false;
  }, [id]);

  // Reset RIS payload state on client switch (source of truth = backend frozen_data)
  useEffect(() => {
    setLastRisPayload(null);
  }, [id]);

  // Fetch documents on mount
  useEffect(() => { fetchUserDocuments(); }, [fetchUserDocuments]);

  // R4 removed — loadCached useEffect handles all 5 regimes with correct shape

  // R5 — Load available skills from API once on mount
  useEffect(() => {
    fetchSkillsList()
      .then((skills) => setAvailableSkills(Array.isArray(skills) ? skills : []))
      .catch(() => setAvailableSkills([]));
  }, []);

  // Chargement silencieux du system prompt IA depuis la DB (jamais affiché)
  useEffect(() => {
    const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
    axios.get(`${global.config.server_url}/v1/system-prompt/latest`, Config)
      .then((res) => setHiddenSystemPrompt(res.data?.prompt_text || ""))
      .catch(() => {});
  }, []);

  // ── Parse PDF via n8n v6 (direct webhook, SimulatorV6 compatible) ─────────
  const parsePdfAndFillCarriere = useCallback(async (file) => {
    if (!file) return;
    setIsParsingRIS(true);
    toast.info("Analyse du RIS en cours… (peut prendre 1-2 minutes)", { autoClose: false, toastId: "ris-parsing" });
    try {
      const payload = await fetchRISAnalysisV6(file);
      setLastRisPayload(payload);

      // ── Auto-fill user profile from RIS profil (if fields are missing) ──
      const profilRIS = payload?.profil;
      if (profilRIS) {
        const nirFromProfil = profilRIS.numero_secu || profilRIS.numero_securite_sociale || profilRIS.numero_ss;
        const profileUpdates = {};
        if (!user?.secu_social && nirFromProfil) profileUpdates.secu_social = nirFromProfil;
        if (!user?.birth_date && profilRIS.date_naissance) {
          profileUpdates.birth_date = profilRIS.date_naissance.length === 7
            ? profilRIS.date_naissance + "-01"
            : profilRIS.date_naissance;
        }
        if (!user?.first_name && profilRIS.prenom) profileUpdates.first_name = profilRIS.prenom;
        if (!user?.last_name && profilRIS.nom) profileUpdates.last_name = profilRIS.nom;

        if (Object.keys(profileUpdates).length > 0) {
          try {
            await axios.put(
              `${global.config.server_url}/personal_information/${id}`,
              profileUpdates,
              { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
            );
            const filledFields = Object.keys(profileUpdates).join(", ");
            toast.success(`Profil mis à jour depuis le RIS : ${filledFields}`);
            if (onUserUpdate) onUserUpdate(profileUpdates);
          } catch (e) {
            console.warn("Auto-fill profile from RIS failed", e);
          }
        }
      }

      // ── Détection du format de réponse ──────────────────────────────────
      let cappedFromRIS = 0;
      const isNewFormat = Array.isArray(payload.carriere) && !Array.isArray(payload.debug_carriere_detaillee_regex);

      if (isNewFormat) {
        // ── NOUVEAU FORMAT : { carriere[], synthese, profil, meta } ─────────
        const carriereRaw = payload.carriere || [];

        // 1. Salaires
        cappedFromRIS = applyCarriereData(carriereRaw.map(entry => ({
          annee: entry.annee,
          sal_eur: entry.annee < 2002 ? Math.round((entry.revenu || 0) / 6.55957) : (entry.revenu || 0),
          sal_original: entry.revenu || 0,
          devise: entry.annee < 2002 ? "FRF" : "€",
          regimes_concernes: Array.isArray(entry.regimes) ? entry.regimes.join(', ').toLowerCase() : (entry.regimes_concernes || ''),
        })));

        // 2. Trimestres par année — nouveau format (cotisés/assimilés/rachetés séparés)
        //    avec fallback sur l'ancien format (champ "trimestres" agrégé → tout en cotisés)
        const trimCotN = {}, trimAssN = {}, arN = {};
        carriereRaw.forEach(({ annee, trimestres, trimestres_cotises, trimestres_assimiles, trimestres_ar }) => {
          if (!annee) return;
          const hasDetailedNature =
            trimestres_cotises != null || trimestres_assimiles != null || trimestres_ar != null;
          if (hasDetailedNature) {
            const tc = parseInt(trimestres_cotises, 10) || 0;
            const ta = parseInt(trimestres_assimiles, 10) || 0;
            const tr = parseInt(trimestres_ar, 10) || 0;
            if (tc > 0) trimCotN[annee] = Math.min(tc, 4);
            if (ta > 0) trimAssN[annee] = Math.min(ta, 4);
            if (tr > 0) arN[annee] = Math.min(tr, 4);
          } else {
            const t = parseInt(trimestres, 10) || 0;
            if (t > 0) trimCotN[annee] = Math.min(t, 4);
          }
        });
        if (Object.keys(trimCotN).length) setTrimCotState(prev => ({ ...prev, ...trimCotN }));
        if (Object.keys(trimAssN).length) setTrimAssState(prev => ({ ...prev, ...trimAssN }));
        if (Object.keys(arN).length)      setArState(prev => ({ ...prev, ...arN }));

        // 3. Points AGIRC-ARRCO / Ircantec / RCI / CIPAV par année
        const agircN = {}, ircN = {}, rciN = {}, cipavBaseN = {}, cipavComplN = {};
        carriereRaw.forEach(({ annee, points }) => {
          if (!Array.isArray(points)) return;
          points.forEach(({ regime, valeur }) => {
            const r = (regime || "").toLowerCase();
            const pts = parseFloat(valeur) || 0;
            if (!pts) return;
            if (r.includes("agirc") || r.includes("arrco")) agircN[annee] = (agircN[annee] || 0) + pts;
            else if (r.includes("ircantec")) ircN[annee] = (ircN[annee] || 0) + pts;
            else if (r.includes("cipav") && (r.includes("compl") || r.includes("complémentaire"))) cipavComplN[annee] = (cipavComplN[annee] || 0) + pts;
            else if (r.includes("cipav")) cipavBaseN[annee] = (cipavBaseN[annee] || 0) + pts;
            else if (r.includes("rci") || r.includes("ssi")) rciN[annee] = (rciN[annee] || 0) + pts;
          });
        });
        if (Object.keys(agircN).length || Object.keys(ircN).length || Object.keys(rciN).length) {
          setCarriereRows(prev => prev.map(row => {
            const u = {};
            if (agircN[row.yr] != null) u.agircPts = agircN[row.yr];
            if (ircN[row.yr] != null) u.ircPts = ircN[row.yr];
            if (rciN[row.yr] != null) u.rciPts = rciN[row.yr];
            return Object.keys(u).length ? { ...row, ...u } : row;
          }));
        }
        if (Object.keys(cipavBaseN).length || Object.keys(cipavComplN).length) {
          setCnavplOpen(true);
          setCnavplRows(prev => {
            const next = { ...prev };
            const allYears = new Set([...Object.keys(cipavBaseN), ...Object.keys(cipavComplN)]);
            allYears.forEach(yr => {
              const y = parseInt(yr, 10);
              const base = cipavBaseN[yr] ?? null;
              const compl = cipavComplN[yr] ?? null;
              if (next[y]) next[y] = { ...next[y], ...(base != null && { points: base }), ...(compl != null && { pointsCompl: compl }) };
              else next[y] = { revenus: "", revCnavpl: "", points: base ?? "", pointsCompl: compl ?? "" };
            });
            return next;
          });
        }

        // 4. Synthèse globale
        const synthese = payload.synthese || {};
        if (synthese.trimestres_total || synthese.points) {
          const pts = synthese.points || {};
          setDroitsSynthese({
            trimestres_total: synthese.trimestres_total,
            points_agirc_arrco: pts.agirc_arrco,
            points_cipav_base: pts.cipav_base,
            points_cipav_complementaire: pts.cipav_complementaire,
            points_cipav: (pts.cipav ?? ((pts.cipav_base || 0) + (pts.cipav_complementaire || 0))) || null,
            ...(pts.ircantec != null && { ircantec: { points_total: pts.ircantec } }),
            ...(pts.rci != null      && { rci:      { points_total: pts.rci      } }),
          });
        }

      } else {
        // ── ANCIEN FORMAT : { debug_carriere_detaillee_regex[], detail_annuel[], ... } ──
        if (payload.droits_synthese) setDroitsSynthese(payload.droits_synthese);
        if (payload.carriere_synthese) setRisCarriereSynthese(payload.carriere_synthese);

        const detail_annuel = Array.isArray(payload.detail_annuel) ? payload.detail_annuel : [];
        const cipavEntries = detail_annuel.filter(e => (e.regimes_concernes || "").toLowerCase().includes("cipav"));
        if (cipavEntries.length) {
          const revenuMap = {};
          cipavEntries.forEach(({ annee, revenus, points_acquis }) => {
            const yr = parseInt(annee, 10);
            if (!yr) return;
            if (revenus) {
              const sum = revenus.replace(/[€\s]/g, "").split("+")
                .reduce((s, p) => s + (parseFloat(p.replace(",", ".")) || 0), 0);
              if (sum > 0) revenuMap[yr] = { revenus: Math.round(sum).toString(), points: parseFloat(points_acquis) || "" };
            }
          });
          if (Object.keys(revenuMap).length) {
            setCnavplOpen(true);
            setCnavplRows(prev => {
              const next = { ...prev };
              Object.entries(revenuMap).forEach(([yr, vals]) => {
                const y = parseInt(yr, 10);
                if (next[y]) next[y] = { ...next[y], revenus: vals.revenus, points: vals.points || next[y].points };
                else next[y] = { revenus: vals.revenus, revCnavpl: "", points: vals.points || "" };
              });
              return next;
            });
          }
        }

        const agircPtsMap = {}, ircPtsMap = {}, rciPtsMap = {};
        detail_annuel.forEach((entry) => {
          const regime = (entry.regimes_concernes || "").toLowerCase();
          const yr = parseInt(entry.annee, 10);
          const pts = parseFloat(entry.points_acquis) || 0;
          if (!yr || !pts) return;
          if (regime.includes("agirc") || regime.includes("arrco")) agircPtsMap[yr] = (agircPtsMap[yr] || 0) + pts;
          else if (regime.includes("ircantec")) ircPtsMap[yr] = (ircPtsMap[yr] || 0) + pts;
          else if (regime.includes("rci") || regime.includes("ssi")) rciPtsMap[yr] = (rciPtsMap[yr] || 0) + pts;
        });
        if (Object.keys(agircPtsMap).length || Object.keys(ircPtsMap).length || Object.keys(rciPtsMap).length) {
          setCarriereRows(prev => prev.map(row => {
            const updates = {};
            if (agircPtsMap[row.yr] != null) updates.agircPts = agircPtsMap[row.yr];
            if (ircPtsMap[row.yr] != null) updates.ircPts = ircPtsMap[row.yr];
            if (rciPtsMap[row.yr] != null) updates.rciPts = rciPtsMap[row.yr];
            return Object.keys(updates).length ? { ...row, ...updates } : row;
          }));
        }

        const raw = Array.isArray(payload.debug_carriere_detaillee_regex) ? payload.debug_carriere_detaillee_regex : [];
        cappedFromRIS = applyCarriereData(raw.map((entry) => ({
          annee: entry.annee,
          sal_eur: entry.annee < 2002 ? Math.round((entry.revenu_brut || 0) / 6.55957) : (entry.revenu_brut || 0),
          sal_original: entry.revenu_brut || 0,
          devise: entry.annee < 2002 ? "FRF" : "EUR",
          regimes_concernes: entry.regimes_concernes || '',
        })));

        const newTrimCot = {}, newTrimAss = {}, newAr = {};
        detail_annuel.forEach(({ annee, trimestres_retenus, nature }) => {
          const yr = parseInt(annee, 10);
          const t = parseInt(trimestres_retenus, 10) || 0;
          if (!yr) return;
          const n = nature || "Cotisé";
          if (n === "Racheté" || n === "Rachete" || n === "VPLR") newAr[yr] = Math.min((newAr[yr] || 0) + t, 4);
          else if (n === "Cotisé") newTrimCot[yr] = Math.min((newTrimCot[yr] || 0) + t, 4);
          else newTrimAss[yr] = Math.min((newTrimAss[yr] || 0) + t, 4);
        });
        if (Object.keys(newTrimCot).length) setTrimCotState(prev => ({ ...prev, ...newTrimCot }));
        if (Object.keys(newTrimAss).length) setTrimAssState(prev => ({ ...prev, ...newTrimAss }));
        if (Object.keys(newAr).length) setArState(prev => ({ ...prev, ...newAr }));
      }

      toast.dismiss("ris-parsing");
      toast.success("Tableau carrière rempli");
      if (cappedFromRIS > 0) {
        toast.info(
          `📏 ${cappedFromRIS} an${cappedFromRIS > 1 ? 's' : ''} plafonnée${cappedFromRIS > 1 ? 's' : ''} au PASS — revalo ramenée au max autorisé (cellules en rouge).`,
          { autoClose: 12000 }
        );
      }
    } catch (e) {
      toast.dismiss("ris-parsing");
      console.error("[parsePdfAndFillCarriere] erreur:", e?.response?.data || e?.message || e);
      toast.error("Erreur lors de l'analyse du RIS");
    } finally {
      setIsParsingRIS(false);
    }
  }, [applyCarriereData]);

  // ── Select document from list (for analysis report — no RIS parsing) ──
  const handleSelectDocument = useCallback(async (doc) => {
    try {
      toast.info("Chargement du document…");
      const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") }, responseType: "blob" };
      const response = await axios.get(`${global.config.server_url}/downloadFile?file_id=${doc.id}`, Config);
      const blob = response.data;
      const file = new File([blob], doc.filename, { type: blob.type || "application/pdf" });
      setFileToSend(file);
      toast.success(`"${doc.filename}" sélectionné`);
    } catch { toast.error("Impossible de charger le document"); }
  }, []);

  // ── Mark a server document as the RIS ──
  const handleSetDocAsRIS = useCallback(async (doc) => {
    if (risFileName === doc.filename) {
      setRisFileName(null);
      return;
    }
    try {
      const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") }, responseType: "blob" };
      const response = await axios.get(`${global.config.server_url}/downloadFile?file_id=${doc.id}`, Config);
      const blob = response.data;
      const file = new File([blob], doc.filename, { type: blob.type || "application/pdf" });
      setRisFileName(doc.filename);
      parsePdfAndFillCarriere(file);
    } catch { toast.error("Impossible de charger le document RIS"); }
  }, [risFileName, parsePdfAndFillCarriere]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (hiddenSystemPrompt) n8nFormData.append("system_prompt", hiddenSystemPrompt);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileToSend, selectedAction, user, id, promptText, hiddenSystemPrompt]);

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

  const getPlafond = (yr) => PLAFONDS_SS[yr] || 48060;

  const toggleCnavpl = () => {
    if (cnavplOpen) {
      setCnavplClosing(true);
      setTimeout(() => { setCnavplOpen(false); setCnavplClosing(false); }, 280);
    } else {
      setCnavplOpen(true);
    }
  };

  const handleRevaloChange = (yr, val, deplaf) => {
    const parsed = parseInt(val) || 0;
    const capped = (yr >= 2005 || !deplaf) ? Math.min(parsed, getPlafond(yr)) : parsed;
    setRevaloValues(prev => ({ ...prev, [yr]: capped }));
  };

  const handleDeplafChange = (yr, checked) => {
    setDeplafValues(prev => ({ ...prev, [yr]: checked }));
    const row = carriereRows.find(r => r.yr === yr);
    const sal = row?.sal || 0;
    if (sal > 0) {
      const coeff = REVALO_CNAV[yr] || 1;
      const passEuro = PLAFONDS_SS[yr] || 48060;
      const isCapped = !checked || yr >= 2005;
      let salPlafonne, revalo, ssEur;
      if (yr <= 2001) {
        const passFrancs = passEuro * 6.556957;
        salPlafonne = isCapped ? Math.min(sal, passFrancs) : sal;
        revalo = Math.round((salPlafonne * coeff) / 6.556957);
        ssEur = Math.round(salPlafonne / 6.556957);
      } else {
        salPlafonne = isCapped ? Math.min(sal, passEuro) : sal;
        revalo = Math.round(salPlafonne * coeff);
        ssEur = salPlafonne;
      }
      setRevaloValues(prev => ({ ...prev, [yr]: revalo }));
      setCarriereRows(prev => prev.map(r => r.yr === yr ? { ...r, ss: ssEur } : r));

      if (checked) {
        // Sauvegarder les valeurs actuelles avant déplafonnement
        setDeplafSnapshots(prev => ({
          ...prev,
          [yr]: {
            trimCot: trimCotState[yr] ?? 0,
            trimAss: trimAssState[yr] ?? 0,
            ar: arState[yr] ?? 0,
          },
        }));
        // Recalculer les trimestres sur la base du salaire complet
        const seuilTrimestre = yr <= 2001 ? (passEuro * 6.556957) / 4 : passEuro / 4;
        const trimestres = Math.min(4, Math.max(0, Math.floor(sal / (seuilTrimestre || Infinity))));
        setTrimCotState(prev => ({ ...prev, [yr]: trimestres }));
      } else {
        // Restaurer le snapshot sauvegardé au moment du cochage
        const snap = deplafSnapshots[yr];
        if (snap) {
          setTrimCotState(prev => ({ ...prev, [yr]: snap.trimCot }));
          setTrimAssState(prev => ({ ...prev, [yr]: snap.trimAss }));
          setArState(prev => ({ ...prev, [yr]: snap.ar }));
          setDeplafSnapshots(prev => { const next = { ...prev }; delete next[yr]; return next; });
        }
      }
    }
  };


  const isCarriereEmpty = useMemo(() => {
    return !carriereRows.some(row => {
      const cipavRow = cnavplRows[row.yr];
      return (row.sal > 0)
        || (row.agircPts > 0)
        || (row.ircPts > 0)
        || (row.rciPts > 0)
        || (parseFloat(cipavRow?.points) > 0) || (parseFloat(cipavRow?.pointsCompl) > 0)
        || (trimCotState[row.yr] > 0) || (trimAssState[row.yr] > 0) || (arState[row.yr] > 0);
    });
  }, [carriereRows, cnavplRows, trimCotState, trimAssState, arState]);

  const handleGeler = useCallback(async () => {
    if (!id) return;
    if (isCarriereEmpty) {
      toast.error("Remplissez au moins une ligne de carrière avant de valider.");
      return;
    }
    setFrozenLoading(true);
    try {
      const carriere = carriereRows.map(row => {
        const cipavRow = cnavplRows[row.yr];
        return {
          annee: row.yr,
          revenu_brut: row.sal, // Align with CnavSimulator and migration standard
          salaire_revalo: revaloValues[row.yr] ?? 0,
          deplafonne: deplafValues[row.yr] || false,
          trimestres_cotises: trimCotState[row.yr] ?? 0,
          trimestres_assimiles: trimAssState[row.yr] ?? 0,
          trimestres_ar: arState[row.yr] ?? 0,
          // Use standard points_ prefix for Python script compatibility
          ...(row.agircPts != null && { points_agirc_arrco: row.agircPts }),
          ...(row.ircantecPoints != null && { points_ircantec: row.ircantecPoints }),
          ...(row.ircPts != null && { points_ircantec: row.ircPts }), // fallback if ircPts is used
          ...(row.rciPts != null && { points_rci: row.rciPts }),
          ...(cipavRow?.points && { points_cipav_base: parseFloat(cipavRow.points) || 0 }),
          ...(cipavRow?.pointsCompl && { points_cipav_complementaire: parseFloat(cipavRow.pointsCompl) || 0 }),
          regimes_concernes: row.regimes_concernes || '',
        };
      });

      const totalCot = carriere.reduce((s, r) => s + (r.trimestres_cotises || 0), 0);
      const totalAss = carriere.reduce((s, r) => s + (r.trimestres_assimiles || 0), 0);

      // ────────────────────────────────────────────────────────
      // Trimestres par régime :
      //   1. Priorité au cache RIS (duree_assurance_trimestres = données officielles)
      //   2. Fallback droitsSynthese
      //   3. Fallback heuristique basée sur les points/salaire
      // ────────────────────────────────────────────────────────
      const dureeAssurance = lastRisPayload?.duree_assurance_trimestres || {};

      const getRisTrim = (r) => (
        dureeAssurance[r]
        ?? droitsSynthese?.[r]?.trimestres_total
        ?? droitsSynthese?.[r]?.trimestres
        ?? null
      );
      const risTrimCnav = getRisTrim("assurance_retraite") ?? getRisTrim("cnav");
      const risTrimCipav = getRisTrim("cipav");
      const risTrimIrcantec = getRisTrim("ircantec");
      const risTrimRci = getRisTrim("rci");
      const risTrimTousRegimes = dureeAssurance.tous_regimes
        ?? lastRisPayload?.carriere_synthese?.trimestres_valides_total
        ?? null;
      const risTrimRequis = dureeAssurance.requis_taux_plein
        ?? lastRisPayload?.carriere_synthese?.trimestres_requis_taux_plein
        ?? null;

      // Heuristique fallback : compter les trimestres des années où chaque régime est présent
      const heuristicTrim = { cnav: 0, cipav: 0, ircantec: 0, rci: 0 };
      carriere.forEach(row => {
        const totalTrim = (row.trimestres_cotises || 0) + (row.trimestres_assimiles || 0);
        const regimesLower = (row.regimes_concernes || '').toLowerCase();
        const isCipavYear = (row.points_cipav_base || 0) > 0 || (row.points_cipav_complementaire || 0) > 0;
        const hasCnav = regimesLower.includes('assurance retraite') || regimesLower.includes('cnav')
          || (row.points_agirc_arrco || 0) > 0
          || (!isCipavYear && (row.revenu_brut || 0) > 0);
        const hasCipav = (row.points_cipav_base || 0) > 0 || (row.points_cipav_complementaire || 0) > 0;
        const hasIrcantec = (row.points_ircantec || 0) > 0;
        const hasRci = (row.points_rci || 0) > 0;
        if (hasCnav) heuristicTrim.cnav += totalTrim;
        if (hasCipav) heuristicTrim.cipav += totalTrim;
        if (hasIrcantec) heuristicTrim.ircantec += totalTrim;
        if (hasRci) heuristicTrim.rci += totalTrim;
      });

      const trimestres_par_regime = {
        cnav: risTrimCnav ?? heuristicTrim.cnav,
        cipav: risTrimCipav ?? heuristicTrim.cipav,
        ircantec: risTrimIrcantec ?? heuristicTrim.ircantec,
        rci: risTrimRci ?? heuristicTrim.rci,
        msa: 0,
      };

      // ────────────────────────────────────────────────────────
      // NIR parser : SOURCE OFFICIELLE UNIQUE pour sexe + date naissance
      // Priorite ABSOLUE au NIR du RIS courant (ignorant user.birth_date
      // qui peut etre errone / d'un ancien RIS)
      // ────────────────────────────────────────────────────────
      const nir = lastRisPayload?.profil?.numero_securite_sociale
        || lastRisPayload?.profil?.numero_ss
        || user?.secu_social
        || "";
      const nirInfo = parseNIR(nir);

      // Date naissance : TOUJOURS le NIR si disponible, peu importe user.birth_date
      let dateNaissanceFinale = null;
      if (nirInfo?.date_naissance_estimee) {
        dateNaissanceFinale = nirInfo.date_naissance_estimee;
        if (user?.birth_date && user.birth_date !== nirInfo.date_naissance_estimee) {
          console.warn(
            `[handleGeler] user.birth_date (${user.birth_date}) IGNORE — ` +
            `utilisation du NIR du RIS courant : ${nirInfo.date_naissance_estimee} (NIR=${nir})`
          );
          toast.warning(
            `Date de naissance corrigée via le NIR du RIS : ${nirInfo.date_naissance_estimee} (fiche client : ${user.birth_date})`,
            { autoClose: 6000 }
          );
        }
      } else {
        // Fallback uniquement si aucun NIR disponible
        dateNaissanceFinale = user?.birth_date || "";
        console.warn(`[handleGeler] Aucun NIR disponible, fallback sur user.birth_date : ${dateNaissanceFinale}`);
      }

      const consultantId = parseInt(localStorage.getItem("userid"));
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Totaux points par régime (préfère droitsSynthese si présent, sinon somme de la carrière)
      const totalPointsAgirc = droitsSynthese?.agirc_arrco?.points_total
        ?? droitsSynthese?.agirc_arrco?.total_points
        ?? carriere.reduce((s, r) => s + (r.points_agirc_arrco || 0), 0);
      const totalPointsIrcantec = droitsSynthese?.ircantec?.points_total
        ?? droitsSynthese?.ircantec?.total_points
        ?? carriere.reduce((s, r) => s + (r.points_ircantec || 0), 0);
      const totalPointsRci = droitsSynthese?.rci?.points_total
        ?? droitsSynthese?.rci?.total_points
        ?? carriere.reduce((s, r) => s + (r.points_rci || 0), 0);
      const totalPointsCipavBase = droitsSynthese?.cipav?.points_base
        ?? droitsSynthese?.points_cipav_base
        ?? Object.values(cnavplRows).reduce((s, r) => s + (parseFloat(r.points) || 0), 0);
      const totalPointsCipavCompl = droitsSynthese?.cipav?.points_complementaire
        ?? droitsSynthese?.points_cipav_complementaire
        ?? Object.values(cnavplRows).reduce((s, r) => s + (parseFloat(r.pointsCompl) || 0), 0);

      const payload = {
        user_id: parseInt(id), // Primary identifier for the client in DB
        source: "SAISIE_CONSULTANT",
        meta: {
          nom: user?.last_name || lastRisPayload?.profil?.nom || "",
          prenom: user?.first_name || lastRisPayload?.profil?.prenom || "",
          date_naissance: dateNaissanceFinale,
          sexe: nirInfo?.sexe || user?.sexe || null,
          nombre_enfants: user?.children_number ?? user?.nombre_enfants ?? lastRisPayload?.profil?.nombre_enfants ?? 0,
          nir: nir || null,
          valide_le: new Date().toISOString().split("T")[0],
        },
        carriere,
        // Restore CIPAV column (dedicated JSON field)
        cipav: Object.entries(cnavplRows)
          .filter(([_, row]) => row.points || row.pointsCompl)
          .map(([yr, row]) => ({
            annee: parseInt(yr),
            points_cipav_base: parseFloat(row.points) || 0,
            points_cipav_complementaire: parseFloat(row.pointsCompl) || 0,
          })),
        alertes: [],
        totaux: {
          trimestres_cotises: totalCot,
          trimestres_assimiles: totalAss,
          trimestres_total: totalCot + totalAss,
          // Trimestres officiels RIS prioritaires sur la somme calculée
          trimestres_tous_regimes: risTrimTousRegimes ?? (totalCot + totalAss),
          trimestres_requis: risTrimRequis
            ?? droitsSynthese?.trimestres_requis_taux_plein
            ?? risCarriereSynthese?.trimestres_requis_taux_plein
            ?? 172,
          trimestres_par_regime,
          points_officiels: {
            agirc_arrco: {
              total_points: totalPointsAgirc,
              valeur_point: droitsSynthese?.agirc_arrco?.valeur_point || 1.4386,
            },
            cipav: {
              points_base: totalPointsCipavBase,
              valeur_point_base: droitsSynthese?.cipav?.valeur_point_base || 0.654,
              points_complementaire: totalPointsCipavCompl,
              valeur_point_complementaire: droitsSynthese?.cipav?.valeur_point_complementaire || 2.89,
            },
            ircantec: {
              total_points: totalPointsIrcantec,
              valeur_point: droitsSynthese?.ircantec?.valeur_point || 0.56357,
            },
            rci: {
              total_points: totalPointsRci,
              valeur_point: droitsSynthese?.rci?.valeur_point || 1.280,
            },
          },
        },
        // Adapt: Set locking fields directly in the store payload
        locked_at: now,
        locked_by: consultantId,
      };

      const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
      await axios.post(`${global.config.server_url}/frozen_data`, payload, Config);
      // Lock properly so locked_at is persisted in DB (store() ignores it, lock() saves it)
      await axios.post(`${global.config.server_url}/frozen_data/${parseInt(id)}/lock`, {}, Config);

      setLastRisPayload(null);

      setCarriereValidee(true);
      setLockedAt(now);
      setLockedBy(consultantId);
      toast.success("Carrière gelée — calculs CNAV, AGIRC-ARRCO, IRCANTEC, RCI et CIPAV disponibles");
      setExpandedPanel("dispositifs");
      setSelectedAction(null);
      setExecuted(null);
    } catch (err) {
      if (err.response?.status === 423) {
        toast.error("Données verrouillées — déverrouillez d'abord");
      } else {
        toast.error("Erreur lors du gel des données carrière");
      }
    } finally {
      setFrozenLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, carriereRows, revaloValues, deplafValues, trimCotState, trimAssState, user, cnavplRows, droitsSynthese, risCarriereSynthese, isCarriereEmpty]);

  const handleCalculateAllRegimes = async () => {
    if (!carriereValidee) return;
    if (isCarriereEmpty) {
      toast.error("Carrière vide — déverrouillez et renseignez les données avant de calculer.");
      return;
    }
    if (!user?.birth_date) {
      toast.error("Date de naissance manquante dans le profil client — impossible de calculer.");
      return;
    }
    setIsCalculatingAll(true);
    setSkillLoading(true);
    setSkillError(null);
    setSkillResult(null);
    setAgircLoading(true);
    setAgircError(null);
    setAgircResult(null);
    setIrcantecLoading(true);
    setIrcantecError(null);
    setIrcantecResult(null);
    setRciLoading(true);
    setRciError(null);
    setRciResult(null);
    setCipavLoading(true);
    setCipavError(null);
    setCipavResult(null);
    try {
      const [cnavRes, agircRes, ircantecRes, rciRes, cipavRes] = await Promise.allSettled([
        executeScript("CNAV", id, ""),
        executeScript("AGIRC_ARRCO", id, ""),
        executeScript("IRCANTEC", id, ""),
        executeScript("RCI", id, ""),
        executeScript("CIPAV", id, ""),
      ]);

      if (cnavRes.status === "fulfilled") {
        setSkillResult(cnavRes.value);
        saveSkillResult(id, "CNAV", cnavRes.value);
        if (cnavRes.value.arret_critique) toast.error(cnavRes.value.arret_critique.raison || "Calcul CNAV interrompu");
      } else {
        const msg = cnavRes.reason?.response?.data?.arret_critique?.raison || cnavRes.reason?.message || "Erreur réseau CNAV";
        setSkillError(msg);
        toast.error(msg);
      }

      if (agircRes.status === "fulfilled") {
        setAgircResult(agircRes.value);
        saveSkillResult(id, "AGIRC_ARRCO", agircRes.value);
        if (agircRes.value.success === false && agircRes.value.arret_critique) toast.error(agircRes.value.arret_critique.raison || "Calcul AGIRC-ARRCO interrompu");
      } else {
        const msg = agircRes.reason?.response?.data?.arret_critique?.raison || agircRes.reason?.message || "Erreur réseau AGIRC-ARRCO";
        setAgircError(msg);
        toast.error(msg);
      }

      if (ircantecRes.status === "fulfilled") {
        setIrcantecResult(ircantecRes.value);
        saveSkillResult(id, "IRCANTEC", ircantecRes.value);
        if (ircantecRes.value.success === false && ircantecRes.value.arret_critique) toast.error(ircantecRes.value.arret_critique.raison || "Calcul IRCANTEC interrompu");
      } else {
        const msg = ircantecRes.reason?.response?.data?.arret_critique?.raison || ircantecRes.reason?.message || "Erreur réseau IRCANTEC";
        setIrcantecError(msg);
        toast.error("Erreur calcul IRCANTEC");
      }

      if (rciRes.status === "fulfilled") {
        setRciResult(rciRes.value);
        saveSkillResult(id, "RCI", rciRes.value);
        if (rciRes.value.success === false && rciRes.value.arret_critique) toast.error(rciRes.value.arret_critique.raison || "Calcul RCI interrompu");
      } else {
        const msg = rciRes.reason?.response?.data?.arret_critique?.raison || rciRes.reason?.message || "Erreur réseau RCI";
        setRciError(msg);
        toast.error("Erreur calcul RCI");
      }

      if (cipavRes.status === "fulfilled") {
        setCipavResult(cipavRes.value);
        saveSkillResult(id, "CIPAV", cipavRes.value);
        if (cipavRes.value.success === false && cipavRes.value.arret_critique) toast.error(cipavRes.value.arret_critique.raison || "Calcul CIPAV interrompu");
      } else {
        const msg = cipavRes.reason?.response?.data?.arret_critique?.raison || cipavRes.reason?.message || "Erreur réseau CIPAV";
        setCipavError(msg);
        toast.error("Erreur calcul CIPAV");
      }
    } finally {
      setIsCalculatingAll(false);
      setSkillLoading(false);
      setAgircLoading(false);
      setIrcantecLoading(false);
      setRciLoading(false);
      setCipavLoading(false);
    }
  };

  const handleScenarioSkillExecute = useCallback(async (skillCode, scenarioParams = {}) => {
    if (!id || !carriereValidee) {
      toast.error("Geler la carrière d'abord");
      return;
    }
    setScenarioSkillLoading(prev => ({ ...prev, [skillCode]: true }));
    setScenarioSkillErrors(prev => ({ ...prev, [skillCode]: null }));
    try {
      const result = skillCode === "RACL"
        ? await executeRaclScenario(parseInt(id), scenarioParams)
        : skillCode === "COTISATIONS_MIN"
        ? await executeTnsScenario(parseInt(id), scenarioParams)
        : skillCode === "CHOMAGE_INDEMNISE"
        ? await executeChomageIndScenario(parseInt(id), scenarioParams)
        : await executeSkillGeneric(skillCode, {
            clientId: parseInt(id),
            userContext: `Analyse dispositif ${skillCode} pour client ${id}`,
            scenarioParams,
          });
      setScenarioSkillResults(prev => ({ ...prev, [skillCode]: result }));
      saveSkillResult(id, skillCode, result);
      if (result.eligible === true) {
        toast.success(`${result.skill_name || skillCode} : éligible`);
      } else if (result.eligible === false) {
        toast.warning(`${result.skill_name || skillCode} : non éligible`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Erreur exécution skill";
      setScenarioSkillErrors(prev => ({ ...prev, [skillCode]: msg }));
      toast.error(`Erreur ${skillCode} : ${msg}`);
    } finally {
      setScenarioSkillLoading(prev => ({ ...prev, [skillCode]: false }));
    }
  }, [id, carriereValidee]);

      return (
    <div style={{ marginTop: "24px" }}>
      <style>{`
        @keyframes cnavplFadeIn {
          from { opacity: 0; transform: translateX(8px) scaleX(0.92); }
          to   { opacity: 1; transform: translateX(0)   scaleX(1); }
        }
        @keyframes cnavplFadeOut {
          from { opacity: 1; transform: translateX(0)   scaleX(1); }
          to   { opacity: 0; transform: translateX(8px) scaleX(0.92); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes cnavReveal {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cnavShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
      {/* ══ MODAL CONTENU RÉGLEMENTAIRE ══ */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: "min(800px, calc(100vw - 32px))", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
            {/* Header modal */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: modal.color || "#333" }}>{modal.title}</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{modal.lines} lignes — 01_REGLEMENTATION/ · Cliquer en dehors pour fermer</div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#555", lineHeight: 1 }}>✕</button>
            </div>
            {/* Contenu scrollable */}
            <div style={{ overflowY: "auto", flex: 1, padding: "14px 18px" }}>
              <pre style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: 13, lineHeight: 1.7, color: "#333", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                {modal.content}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL ÉDITION PROMPT PRÉ-ENTRETIEN EOR ══ */}
      {preentretienModal && (
        <Modal
          isOpen={!!preentretienModal}
          toggle={() => !preentretienModal.saving && setPreentretienModal(null)}
          size="xl"
          backdrop="static"
        >
          <ModalHeader toggle={() => !preentretienModal.saving && setPreentretienModal(null)}>
            Rapport de génération pré-entretien EOR
            <div style={{ fontSize: 13, color: "#555", marginTop: 4, fontWeight: "normal" }}>
              Éditeur de prompt — une nouvelle version sera créée à l'enregistrement
            </div>
          </ModalHeader>
          <ModalBody>
            {preentretienModal.loading ? (
              <div className="text-center p-4" style={{ color: "#555", fontSize: 14 }}>
                Chargement du prompt…
              </div>
            ) : (
              <>
                <label style={{ fontSize: 14, fontWeight: 600 }}>Contenu (Prompt)</label>
                <textarea
                  value={preentretienModal.text}
                  disabled={preentretienModal.saving}
                  onChange={(e) => {
                    const nouvelleValeur = e.target.value;
                    setPreentretienModal((m) => (m ? { ...m, text: nouvelleValeur } : m));
                  }}
                  style={{
                    width: "100%",
                    minHeight: 400,
                    fontFamily: "monospace",
                    fontSize: 14,
                    padding: 10,
                    border: "1px solid #ccc",
                    borderRadius: 4,
                  }}
                />
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              color="secondary"
              onClick={() => setPreentretienModal(null)}
              disabled={preentretienModal.saving}
            >
              Annuler
            </Button>
            <Button
              color="primary"
              onClick={() => savePreentretienPrompt(preentretienModal.text)}
              disabled={preentretienModal.loading || preentretienModal.saving}
            >
              {preentretienModal.saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ══ MODAL ÉDITION SYSTEM PROMPT ══ */}
      {systemPromptModal && (
        <Modal
          isOpen={!!systemPromptModal}
          toggle={() => !systemPromptModal.saving && setSystemPromptModal(null)}
          size="xl"
          backdrop="static"
        >
          <ModalHeader toggle={() => !systemPromptModal.saving && setSystemPromptModal(null)}>
            EOR SystemPrompt — Moteur Analyse Réglementaire
            <div style={{ fontSize: 13, color: "#555", marginTop: 4, fontWeight: "normal" }}>
              Instructions fondamentales du moteur IA — une nouvelle version sera créée à l'enregistrement
            </div>
          </ModalHeader>
          <ModalBody>
            {systemPromptModal.loading ? (
              <div className="text-center p-4" style={{ color: "#555", fontSize: 14 }}>
                Chargement du system prompt…
              </div>
            ) : (
              <>
                <label style={{ fontSize: 14, fontWeight: 600 }}>Contenu (System Prompt)</label>
                <textarea
                  value={systemPromptModal.text}
                  disabled={systemPromptModal.saving}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSystemPromptModal((m) => (m ? { ...m, text: val } : m));
                  }}
                  style={{
                    width: "100%",
                    minHeight: 500,
                    fontFamily: "monospace",
                    fontSize: 14,
                    padding: 10,
                    border: "1px solid #ccc",
                    borderRadius: 4,
                  }}
                />
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              color="secondary"
              onClick={() => setSystemPromptModal(null)}
              disabled={systemPromptModal.saving}
            >
              Annuler
            </Button>
            <Button
              color="primary"
              onClick={() => saveSystemPrompt(systemPromptModal.text)}
              disabled={systemPromptModal.loading || systemPromptModal.saving}
            >
              {systemPromptModal.saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {mode === "production" && (
        <div style={{ padding: "0 4px" }}>
{/* Zone documents — real upload */}
              <div style={{ ...S.card, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>📁 Documents</div>

                {/* Dropzone */}
                <Dropzone disabled={isUploading || isGenerating} onDrop={handleUpload}>
                  {({ getRootProps, getInputProps, isDragActive }) => (
                    <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? "#6C5CE7" : "#ccc"}`, borderRadius: 9, padding: "16px 14px", textAlign: "center", cursor: isUploading ? "wait" : "pointer", background: isDragActive ? "#6C5CE706" : "#fafafa", transition: "all 0.15s", marginBottom: 10 }}>
                      <input {...getInputProps()} />
                      <DownloadCloud size={28} color="#6C5CE7" style={{ marginBottom: 4 }} />
                      <div style={{ fontWeight: 600, color: "#6C5CE7", fontSize: 13 }}>
                        {isUploading ? "Import en cours…" : "Déposez tous vos documents ici"}
                      </div>
                      <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>Glissez-déposez un fichier ou cliquez pour parcourir</div>
                    </div>
                  )}
                </Dropzone>

                {/* Liste des documents réels */}
                {isLoadingDocs ? (
                  <div style={{ fontSize: 12, color: "#555", padding: "6px 0" }}>Chargement des documents…</div>
                ) : ((userDocuments.filter((d) => localUploadedIds.has(String(d.id))).length > 0 || fileToSend)) ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {userDocuments.filter((d) => localUploadedIds.has(String(d.id))).map((doc) => {
                      const ext = (doc.filename || "").split(".").pop().toLowerCase();
                      
                      // 🟢 Green for PDF
                      const color = ext === "pdf" ? "#00B894" : ext === "html" ? "#0984E3" : "#6C5CE7";
                      const isSelected = fileToSend && fileToSend.name === doc.filename;
                      const isRIS = risFileName === doc.filename;

                      return (
                        <div key={doc.id} style={{ display: "flex", flexDirection: "column", padding: "6px 12px", borderRadius: 7, background: isSelected ? `${color}18` : `${color}08`, border: `1px solid ${isSelected ? color : `${color}18`}`, fontSize: 13, cursor: "pointer", transition: "all 0.15s", minWidth: 180 }}
                          onClick={() => {
                            if (isSelected) return;
                            handleSelectDocument(doc);
                          }}
                          title={isSelected ? "Document sélectionné pour l'analyse" : `Cliquer pour sélectionner "${doc.filename}"`}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 15 }}>📄</span>
                            <span style={{ fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14 }}>{doc.filename}</span>
                            <span style={{ fontSize: 11, color, fontWeight: 700 }}>{ext.toUpperCase()}</span>

                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto", paddingLeft: 4 }}>
                              {isSelected && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const url = URL.createObjectURL(fileToSend);
                                    window.open(url, '_blank');
                                  }}
                                  style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}
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
                                style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: "2px", fontSize: 14, lineHeight: 1, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
                                title="Supprimer le document"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          {ext === "pdf" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSetDocAsRIS(doc); }}
                              disabled={isParsingRIS}
                              style={{
                                marginTop: 6,
                                background: isParsingRIS && isRIS ? "#a29bfe" : "#7367f0",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                padding: "5px 10px",
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: isParsingRIS ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 5,
                                width: "100%",
                                opacity: isParsingRIS && !isRIS ? 0.5 : 1,
                                transition: "all 0.2s ease",
                              }}
                            >
                              {isParsingRIS && isRIS ? (
                                <>
                                  <span className="spinner-border spinner-border-sm" style={{ width: "0.6rem", height: "0.6rem", borderWidth: "0.15em" }} role="status" />
                                  Extraction en cours…
                                </>
                              ) : (
                                "🚀 Analyser ce RIS"
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Fichier uploadé manuellement (pas encore dans la liste serveur) */}
                    {fileToSend && !userDocuments.filter((d) => localUploadedIds.has(String(d.id))).some((d) => d.filename === fileToSend.name) && (
                      <div style={{ display: "flex", flexDirection: "column", padding: "6px 12px", borderRadius: 7, background: "#00B89418", border: "1px solid #00B894", fontSize: 13, minWidth: 180 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 15 }}>📄</span>
                          <span style={{ fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14 }}>{fileToSend.name}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto", paddingLeft: 4 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = URL.createObjectURL(fileToSend);
                                window.open(url, '_blank');
                              }}
                              style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}
                              title="Visualiser"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); clearFileToSend(); }}
                              style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: "2px", fontSize: 14, lineHeight: 1, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
                              title="Retirer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        {fileToSend.name.toLowerCase().endsWith(".pdf") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRisFileName(fileToSend.name);
                              parsePdfAndFillCarriere(fileToSend);
                            }}
                            disabled={isParsingRIS}
                            style={{
                              marginTop: 6,
                              background: isParsingRIS && risFileName === fileToSend.name ? "#a29bfe" : "#7367f0",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "5px 10px",
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: isParsingRIS ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 5,
                              width: "100%",
                              opacity: isParsingRIS && risFileName !== fileToSend.name ? 0.5 : 1,
                              transition: "all 0.2s ease",
                            }}
                          >
                            {isParsingRIS && risFileName === fileToSend.name ? (
                              <>
                                <span className="spinner-border spinner-border-sm" style={{ width: "0.6rem", height: "0.6rem", borderWidth: "0.15em" }} role="status" />
                                Extraction en cours…
                              </>
                            ) : (
                              "🚀 Analyser ce RIS"
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#666", textAlign: "center", padding: "4px 0" }}>Aucun document importé</div>
                )}
              </div>

          {/* ── MAIN PANELS ── */}
          {hasDocuments && (
            <>
              <div className={`simu-workflow-grid${navCollapsed ? " nav-collapsed" : ""}`}>

                {/* Panel navigation — ordered by logic */}
                <div className="simu-nav-col" style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                  {navCollapsed ? (
                    /* Barre réduite */
                    <button onClick={() => setNavCollapsed(false)} title="Afficher le flux de travail" style={{ width: 36, alignSelf: "flex-start", padding: "8px 0", borderRadius: 9, border: "1px solid #e0e0e0", background: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "#555" }}>
                      <span style={{ fontSize: 15 }}>▶</span>
                      <span style={{ fontSize: 9, writingMode: "vertical-rl", textTransform: "uppercase", letterSpacing: "0.08em", color: "#666" }}>Flux</span>
                    </button>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px" }}>
                        <div style={{ fontSize: 11, color: "#555", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Flux de travail ↓</div>
                        <button onClick={() => setNavCollapsed(true)} title="Masquer" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#666", padding: "0 2px", lineHeight: 1 }}>◀</button>
                      </div>
                      {Object.entries(ACTION_PANELS).map(([key, panel]) => {
                        const isActive = expandedPanel === key;
                        const currentOrder = ACTION_PANELS[expandedPanel].order;
                        const isDone = !isActive && panel.order < currentOrder;
                        const stepNum = panel.order;
                        return (
                          <button key={key} onClick={() => { setExpandedPanel(key); setSelectedAction(null); setExecuted(null); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, border: `2px solid ${isActive ? panel.color : isDone ? panel.color + "88" : "transparent"}`, background: isActive ? `${panel.color}10` : isDone ? `${panel.color}08` : "#fff", cursor: "pointer", textAlign: "left", transition: "all 0.12s", boxShadow: isActive ? `0 2px 8px ${panel.color}20` : "0 1px 3px rgba(0,0,0,0.04)" }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: isActive ? panel.color : isDone ? panel.color : "#ddd", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                              {isDone ? "✓" : stepNum}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? panel.color : isDone ? panel.color : "#333" }}>{panel.label}</div>
                              <div style={{ fontSize: 11, color: isDone ? panel.color + "99" : "#555", fontWeight: 500 }}>{isDone ? "Traité ✓" : panel.navCount || `${panel.actions.length} ${key === "dispositifs" ? "dispositifs" : key === "livrables" ? "formats" : "actions"}`}</div>
                            </div>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Content area */}
                <div className="simu-content-card" style={{ ...S.card, padding: 16, ...(expandedPanel === "carriere" && !cnavplOpen ? { maxWidth: 1280 } : {}) }}>
                  {(() => {
                    const panel = ACTION_PANELS[expandedPanel];

                    // ── CARRIÈRE: TABLEAU UNIFIÉ ──
                    if (expandedPanel === "carriere") {
                      // Utilise carriereRows (état stable, hydraté depuis OCR ou saisie manuelle)
                      const totalRows = carriereRows.slice(0, visibleRowCount);
                      const totalCotTbl = totalRows.reduce((s, r) => s + (trimCotState[r.yr] ?? 0), 0);
                      const totalAssTbl = totalRows.reduce((s, r) => s + (trimAssState[r.yr] ?? 0), 0);
                      const totalArTbl = totalRows.reduce((s, r) => s + (arState[r.yr] ?? 0), 0);
                      const totalTrimTbl = totalRows.reduce((s, r) => {
                        const tc = trimCotState[r.yr] ?? 0;
                        const ta = trimAssState[r.yr] ?? 0;
                        const ar = arState[r.yr] ?? 0;
                        return s + Math.min(4, tc + ta + ar);
                      }, 0);
                      // SAM CNAV : uniquement les années avec affiliation CNAV (TC ou TA > 0)
                      // Exclut les années régime complémentaire seul (Agirc-only, CIPAV seul, etc.)
                      const samRows = [...carriereRows]
                        .filter(r => ((trimCotState[r.yr] ?? 0) > 0 || (trimAssState[r.yr] ?? 0) > 0) && (revaloValues[r.yr] ?? 0) > 0)
                        .sort((a, b) => (revaloValues[b.yr] ?? 0) - (revaloValues[a.yr] ?? 0))
                        .slice(0, 25);
                      const samVal = samRows.length ? Math.round(samRows.reduce((s, r) => s + (revaloValues[r.yr] ?? 0), 0) / samRows.length) : 0;

                      return (
                        <div>
                          {/* Header */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 18 }}>📂</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#E17055" }}>Carrière</span>
                              <span style={{ fontSize: 12, color: "#555" }}>— tableau unifié tous régimes</span>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 12, padding: "3px 8px", borderRadius: 5, background: isParsingRIS ? "#0984E315" : carriereValidee ? "#00B89415" : "#E1705515", color: isParsingRIS ? "#0984E3" : carriereValidee ? "#00B894" : "#E17055", fontWeight: 700 }}>
                                {isParsingRIS ? "⏳ Analyse en cours…" : carriereValidee ? `🔒 Validée${lockedAt ? ` le ${new Date(lockedAt).toLocaleDateString("fr-FR")}` : ""}` : "📥 Importée OCR"}
                              </span>
                              <button onClick={async () => {
                                if (carriereValidee) {
                                  try {
                                    const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
                                    await axios.post(`${global.config.server_url}/frozen_data/${parseInt(id)}/unlock`, {}, Config);
                                  } catch (e) { /* silencieux */ }
                                  setCarriereValidee(false);
                                } else {
                                  handleGeler();
                                }
                              }} disabled={frozenLoading || (!carriereValidee && isCarriereEmpty)} title={!carriereValidee && isCarriereEmpty ? "Remplissez au moins une ligne de carrière" : ""} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "none", background: carriereValidee ? "#E1705520" : (isCarriereEmpty ? "#ccc" : "#00B89420"), color: carriereValidee ? "#E17055" : (isCarriereEmpty ? "#888" : "#00B894"), cursor: (frozenLoading || (!carriereValidee && isCarriereEmpty)) ? "not-allowed" : "pointer", fontWeight: 700 }}>
                                {carriereValidee ? "🔓 Déverrouiller" : frozenLoading ? "⏳…" : "🔒 Valider"}
                              </button>
                              <button onClick={handleResetCarriere} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: "#888", cursor: "pointer", fontWeight: 700 }}>
                                🗑️ Réinitialiser
                              </button>
                            </div>
                          </div>

                          {/* Légende couleurs régimes */}
                          {/* <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
                            {[["🏛️ CNAV", "#6C5CE7"], ["📊 AGIRC-ARRCO", "#0984E3"], ["🏢 Ircantec", "#00B894"], ["📑 RCI / SSI", "#E17055"]].map(([label, color]) => (
                              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#555" }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: color, opacity: 0.7 }} />
                                {label}
                              </div>
                            ))}
                          </div> */}

                          {/* Droits extraits du RIS */}
                          {/* {droitsSynthese && (
                            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                              {droitsSynthese.agirc_arrco?.points_total > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#0984E308", border: "1px solid #0984E330", borderRadius: 6, padding: "4px 10px" }}>
                                  <span style={{ fontSize: 13 }}>📊</span>
                                  <span style={{ fontSize: 12, color: "#0984E3", fontWeight: 700 }}>AGIRC-ARRCO</span>
                                  <span style={{ fontSize: 12, color: "#555" }}>—</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{droitsSynthese.agirc_arrco.points_total.toLocaleString("fr-FR")} pts</span>
                                  <span style={{ fontSize: 11, color: "#999" }}>extraits du RIS</span>
                                </div>
                              )}
                              {droitsSynthese.ircantec?.points_total > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#00B89408", border: "1px solid #00B89430", borderRadius: 6, padding: "4px 10px" }}>
                                  <span style={{ fontSize: 13 }}>🏢</span>
                                  <span style={{ fontSize: 12, color: "#00B894", fontWeight: 700 }}>Ircantec</span>
                                  <span style={{ fontSize: 12, color: "#555" }}>—</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{droitsSynthese.ircantec.points_total.toLocaleString("fr-FR")} pts</span>
                                  <span style={{ fontSize: 11, color: "#999" }}>extraits du RIS</span>
                                </div>
                              )}
                              {droitsSynthese.rci?.points_total > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#E1705508", border: "1px solid #E1705530", borderRadius: 6, padding: "4px 10px" }}>
                                  <span style={{ fontSize: 13 }}>📑</span>
                                  <span style={{ fontSize: 12, color: "#E17055", fontWeight: 700 }}>RCI / SSI</span>
                                  <span style={{ fontSize: 12, color: "#555" }}>—</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{droitsSynthese.rci.points_total.toLocaleString("fr-FR")} pts</span>
                                  <span style={{ fontSize: 11, color: "#999" }}>extraits du RIS</span>
                                </div>
                              )}
                            </div>
                          )} */}

                          {/* Grand tableau unifié */}
                          <div className="simu-table-wrap" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
                              <thead>
                                <tr>
                                  <th rowSpan={2} style={{ padding: "5px 6px", textAlign: "left", fontWeight: 700, color: "#333", borderBottom: "2px solid #ddd", background: "#f8f8f8", verticalAlign: "bottom", width: 36 }}>An.</th>
                                  <th rowSpan={2} style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, color: "#555", borderBottom: "2px solid #ddd", background: "#f8f8f8", borderLeft: "1px solid #ddd", verticalAlign: "bottom" }}>Sal. brut<br/><span style={{ fontWeight: 400, color: "#666", fontSize: 14 }}>/Rému.</span></th>
                                  <th colSpan={8} style={{ padding: "3px 6px", textAlign: "center", fontWeight: 700, color: "#6C5CE7", background: "#6C5CE708", borderLeft: "2px solid #6C5CE730", borderBottom: "1px solid #6C5CE720" }}>🏛️ CNAV</th>
                                  <th colSpan={3} style={{ padding: "3px 6px", textAlign: "center", fontWeight: 700, color: "#0984E3", background: "#0984E308", borderLeft: "2px solid #0984E330", borderBottom: "1px solid #0984E320" }}>
                                    <div>📊 AGIRC-ARRCO</div>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 3, fontSize: 12, fontWeight: 400 }}>
                                      <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", margin: 0, color: "#555" }}>
                                        <input type="radio" name="simu-cadre-status" checked={!isCadreSimu} onChange={() => {
                                          setIsCadreSimu(false);
                                          setCarriereRows(prev => prev.map(r => {
                                            if (!r.sal || r.sal <= 0) return r;
                                            const res = calculateArrco(r.yr, r.sal, false);
                                            return res ? { ...r, agircT1: parseFloat(res.t1.toFixed(2)), agircT2: parseFloat(res.t2.toFixed(2)), agircPts: parseFloat(res.total.toFixed(2)) } : r;
                                          }));
                                        }} />
                                        Non-Cadre
                                      </label>
                                      <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", margin: 0, color: "#555" }}>
                                        <input type="radio" name="simu-cadre-status" checked={isCadreSimu} onChange={() => {
                                          setIsCadreSimu(true);
                                          setCarriereRows(prev => prev.map(r => {
                                            if (!r.sal || r.sal <= 0) return r;
                                            const res = calculateArrco(r.yr, r.sal, true);
                                            return res ? { ...r, agircT1: parseFloat(res.t1.toFixed(2)), agircT2: parseFloat(res.t2.toFixed(2)), agircPts: parseFloat(res.total.toFixed(2)) } : r;
                                          }));
                                        }} />
                                        Cadre
                                      </label>
                                    </div>
                                  </th>
                                  <th colSpan={1} style={{ padding: "3px 6px", textAlign: "center", fontWeight: 700, color: "#00B894", background: "#00B89408", borderLeft: "2px solid #00B89430", borderBottom: "1px solid #00B89420" }}>🏢 Ircantec</th>
                                  <th colSpan={1} style={{ padding: "3px 6px", textAlign: "center", fontWeight: 700, color: "#E17055", background: "#E1705508", borderLeft: "2px solid #E1705530", borderBottom: "1px solid #E1705520" }}>📑 RCI</th>
                                  <th colSpan={cnavplOpen ? 2 : 1} style={{ padding: "3px 6px", textAlign: "center", fontWeight: 700, color: "#9B59B6", background: cnavplOpen ? "#9B59B608" : "#f8f8f8", borderLeft: "2px solid #9B59B630", borderBottom: "1px solid #9B59B620", whiteSpace: "nowrap" }}>
                                    <button onClick={toggleCnavpl} title="CIPAV — Libéral" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#9B59B6", padding: 0, display: "inline-flex", alignItems: "center", gap: 3 }}>
                                      <span style={{ display: "inline-block", transform: cnavplOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", fontSize: 11 }}>▶</span>
                                      {cnavplOpen && <span style={{ fontSize: 11, fontWeight: 700 }}>🏥 CIPAV</span>}
                                    </button>
                                  </th>
                                </tr>
                                <tr style={{ background: "#fafafa" }}>
                                  {[["Sal. SS","r"],["Coeff.","r"],["Revalo.","r"],["Déplaf.","c"],["Trim.","c"],["Ass.","c"],["AR","c"],["Tot.","c"]].map(([h, a], i) => (
                                    <th key={h} style={{ padding: "3px 5px", textAlign: a === "r" ? "right" : "center", fontWeight: 600, color: "#6C5CE7", borderBottom: "2px solid #6C5CE720", whiteSpace: "nowrap", borderLeft: i === 0 ? "2px solid #6C5CE730" : undefined }}>{h}</th>
                                  ))}
                                  <th style={{ padding: "3px 5px", textAlign: "center", fontWeight: 600, color: "#0984E3", borderBottom: "2px solid #0984E320", whiteSpace: "nowrap", borderLeft: "2px solid #0984E330" }}>Pts T1</th>
                                  <th style={{ padding: "3px 5px", textAlign: "center", fontWeight: 600, color: "#0984E3", borderBottom: "2px solid #0984E320", whiteSpace: "nowrap" }}>Pts T2</th>
                                  <th style={{ padding: "3px 5px", textAlign: "center", fontWeight: 600, color: "#0984E3", borderBottom: "2px solid #0984E320", whiteSpace: "nowrap" }}>Total</th>
                                  <th style={{ padding: "3px 5px", textAlign: "center", fontWeight: 600, color: "#00B894", borderBottom: "2px solid #00B89420", borderLeft: "2px solid #00B89430" }}>Points</th>
                                  <th style={{ padding: "3px 5px", textAlign: "center", fontWeight: 600, color: "#E17055", borderBottom: "2px solid #E1705520", borderLeft: "2px solid #E1705530" }}>Points</th>
                                  {cnavplOpen ? (
                                    <>
                                      {["Pts Base", "Pts Compl."].map((h, i) => (
                                        <th key={h} style={{ padding: "3px 5px", textAlign: "center", fontWeight: 600, color: "#9B59B6", borderBottom: "2px solid #9B59B620", borderLeft: i === 0 ? "2px solid #9B59B630" : undefined, whiteSpace: "nowrap", animation: cnavplClosing ? "cnavplFadeOut 0.28s ease forwards" : "cnavplFadeIn 0.3s ease forwards" }}>{h}</th>
                                      ))}
                                    </>
                                  ) : (
                                    <th style={{ padding: "3px 5px", width: 24, borderBottom: "2px solid #9B59B620", borderLeft: "2px solid #9B59B630" }}></th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {totalRows.map((row, i) => {
                                  const tot = Math.min(4, (trimCotState[row.yr] ?? 0) + (trimAssState[row.yr] ?? 0) + (arState[row.yr] ?? 0));
                                  let revaloVal = revaloValues[row.yr] ?? row.revalo;
                                  if (revaloVal > getPlafond(row.yr) && (row.yr >= 2005 || !deplafValues[row.yr])) {
                                    revaloVal = getPlafond(row.yr);
                                  }
                                  const isPlafonne = revaloVal >= getPlafond(row.yr) && (row.yr >= 2005 || !deplafValues[row.yr]);
                                  return (
                                    <tr key={row.yr} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                      <td style={{ padding: "3px 5px", fontWeight: 700, color: "#333" }}>{row.yr}</td>
                                      <td style={{ padding: "3px 5px", textAlign: "center", borderLeft: "1px solid #eee" }}>
                                        <input type="number" value={row.sal || ""} disabled={carriereValidee}
                                          onChange={(e) => {
                                            const v = parseInt(e.target.value) || 0;
                                            const yr = row.yr;
                                            const coeff = REVALO_CNAV[yr] || 1;
                                            const passEuro = PLAFONDS_SS[yr] || 48060;
                                            const isDeplaf = deplafValues[yr] || false;
                                            const isCapped = !isDeplaf || yr >= 2005;
                                            let salPlafonne, revalo, ssEur;
                                            if (yr <= 2001) {
                                              // Salaire en FRF — réplique exacte CnavSimulator
                                              const passFrancs = passEuro * 6.556957;
                                              salPlafonne = isCapped ? Math.min(v, passFrancs) : v;
                                              revalo = Math.round((salPlafonne * coeff) / 6.556957);
                                              ssEur = Math.round(salPlafonne / 6.556957);
                                            } else {
                                              // Salaire en EUR
                                              salPlafonne = isCapped ? Math.min(v, passEuro) : v;
                                              revalo = Math.round(salPlafonne * coeff);
                                              ssEur = salPlafonne;
                                            }
                                            // Trimestres cotisés — réplique exacte CnavSimulator
                                            const seuilTrimestre = yr <= 2001
                                              ? (passEuro * 6.556957) / 4
                                              : passEuro / 4;
                                            const trimestres = Math.min(4, Math.max(0, Math.floor(v / (seuilTrimestre || Infinity))));
                                            setRevaloValues(prev => ({ ...prev, [yr]: revalo }));
                                            setTrimCotState(prev => ({ ...prev, [yr]: trimestres }));
                                            // Calcul ARRCO/AGIRC-ARRCO, IRCANTEC, RCI depuis le salaire brut
                                            const arrcoRes = v > 0 ? calculateArrco(yr, v, isCadreSimu) : null;
                                            const ircRes = v > 0 ? calculateIrcantec(yr, v) : null;
                                            const rciRes = v > 0 ? calculateRci(yr, v) : null;
                                            setCarriereRows(prev => prev.map(r => r.yr === yr ? {
                                              ...r,
                                              sal: v,
                                              ss: ssEur,
                                              agircT1: arrcoRes ? parseFloat(arrcoRes.t1.toFixed(2)) : null,
                                              agircT2: arrcoRes ? parseFloat(arrcoRes.t2.toFixed(2)) : null,
                                              agircPts: arrcoRes ? parseFloat(arrcoRes.total.toFixed(2)) : 0,
                                              ircPts: ircRes ? parseFloat(ircRes.total.toFixed(5)) : 0,
                                              rciPts: rciRes ? parseFloat(rciRes.total.toFixed(5)) : 0,
                                            } : r));
                                          }}
                                          style={{ width: 62, textAlign: "center", border: "1px solid #ddd", borderRadius: 3, fontSize: 15, padding: "1px 3px", background: carriereValidee ? "#fafafa" : "#fff" }} />
                                        {row.devise === 'FRF' && (
                                          <span style={{ display: "block", fontSize: 10, color: "#E17055", fontWeight: 700, textAlign: "center", marginTop: 1 }}>FRF</span>
                                        )}
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "right", borderLeft: "2px solid #6C5CE715" }}>
                                        <input type="number" value={row.ss || ""} disabled={carriereValidee}
                                          onChange={(e) => { const v = parseInt(e.target.value) || 0; setCarriereRows(prev => prev.map(r => r.yr === row.yr ? { ...r, ss: v } : r)); }}
                                          style={{ width: 62, textAlign: "right", border: "1px solid #6C5CE730", borderRadius: 3, fontSize: 15, padding: "1px 3px", background: carriereValidee ? "#fafafa" : "#fff", color: "#555" }} />
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "right", color: "#0984E3", fontWeight: 600 }}>{row.coeff}</td>
                                      <td style={{ padding: "3px 5px", textAlign: "right", fontWeight: 700, color: "#6C5CE7" }}>
                                        <input
                                          type="number"
                                          value={revaloVal || ""}
                                          disabled={carriereValidee}
                                          onChange={(e) => handleRevaloChange(row.yr, e.target.value, deplafValues[row.yr])}
                                          style={{ width: 68, textAlign: "right", border: `1px solid ${isPlafonne ? "#E17055" : "#6C5CE730"}`, borderRadius: 3, fontSize: 15, padding: "1px 3px", background: carriereValidee ? "#fafafa" : "#fff", color: "#6C5CE7", fontWeight: 700 }}
                                        />
                                        <span style={{ fontSize: 9, color: "#666", display: "block", textAlign: "right", marginTop: 1 }}>
                                          ≤ {getPlafond(row.yr).toLocaleString("fr-FR")} €
                                          {isPlafonne && (
                                            <>
                                              <span id={`revalo-alert-${row.yr}`} style={{ color: "#E17055", cursor: "pointer", display: "inline-block", padding: "0 2px" }}>
                                                ⚠
                                              </span>
                                              <UncontrolledTooltip placement="top" target={`revalo-alert-${row.yr}`}>
                                                Salaire au plafond PASS {row.yr} ({getPlafond(row.yr).toLocaleString("fr-FR")} €) — la revalorisation a été automatiquement ramenée au maximum autorisé pour le calcul CNAV.
                                              </UncontrolledTooltip>
                                            </>
                                          )}
                                        </span>
                                      </td>
                                      <td style={{ padding: "2px 3px", textAlign: "center", width: 28 }}>
                                        {row.yr < 2005 && (
                                          <input type="checkbox"
                                            checked={deplafValues[row.yr] || false}
                                            disabled={carriereValidee}
                                            onChange={(e) => handleDeplafChange(row.yr, e.target.checked)}
                                            title="Déplafonner : salaire enregistré au-dessus du plafond SS"
                                            style={{ cursor: carriereValidee ? "default" : "pointer", accentColor: "#6C5CE7", width: 12, height: 12 }} />
                                        )}
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center" }}>
                                        <input type="number" value={trimCotState[row.yr] ?? 0} disabled={carriereValidee}
                                          onChange={(e) => { const v = parseInt(e.target.value) || 0; setTrimCotState(prev => ({ ...prev, [row.yr]: v })); }}
                                          style={{ width: 26, textAlign: "center", border: "1px solid #ddd", borderRadius: 3, fontSize: 15, padding: "1px" }} />
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center" }}>
                                        <input type="number" value={trimAssState[row.yr] ?? 0} disabled={carriereValidee}
                                          onChange={(e) => { const v = parseInt(e.target.value) || 0; setTrimAssState(prev => ({ ...prev, [row.yr]: v })); }}
                                          title="Trimestres assimilés (maladie, chômage, maternité…)" style={{ width: 26, textAlign: "center", border: "1px solid #6C5CE730", borderRadius: 3, fontSize: 15, padding: "1px", color: "#6C5CE7" }} />
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center" }}>
                                        <input type="number" value={arState[row.yr] ?? 0} disabled={carriereValidee}
                                          onChange={(e) => { const v = parseInt(e.target.value) || 0; setArState(prev => ({ ...prev, [row.yr]: v })); }}
                                          title="Trimestres rachetés (versement pour la retraite)"
                                          style={{ width: 26, textAlign: "center", border: "1px solid #ddd", borderRadius: 3, fontSize: 15, padding: "1px" }} />
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center", fontWeight: 700, color: "#6C5CE7" }}>{tot}</td>
                                      <td style={{ padding: "3px 5px", textAlign: "center", borderLeft: "2px solid #0984E315" }}>
                                        <input type="number" step="0.01" value={row.agircT1 ?? ""} disabled={carriereValidee} onChange={e => { const v = parseFloat(e.target.value) || 0; setCarriereRows(prev => prev.map(r => r.yr === row.yr ? { ...r, agircT1: v } : r)); }} style={{ width: 72, textAlign: "center", border: "1px solid #0984E330", borderRadius: 3, fontSize: 13, padding: "1px 4px", color: "#0984E3", fontWeight: 600, background: carriereValidee ? "#fafafa" : "#fff" }} />
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center" }}>
                                        <input type="number" step="0.01" value={row.agircT2 ?? ""} disabled={carriereValidee} onChange={e => { const v = parseFloat(e.target.value) || 0; setCarriereRows(prev => prev.map(r => r.yr === row.yr ? { ...r, agircT2: v } : r)); }} style={{ width: 72, textAlign: "center", border: "1px solid #0984E330", borderRadius: 3, fontSize: 13, padding: "1px 4px", color: "#0984E3", fontWeight: 600, background: carriereValidee ? "#fafafa" : "#fff" }} />
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center" }}>
                                        <input type="number" step="0.01" value={row.agircPts || ""} disabled={carriereValidee} onChange={e => { const v = parseFloat(e.target.value) || 0; setCarriereRows(prev => prev.map(r => r.yr === row.yr ? { ...r, agircPts: v } : r)); }} style={{ width: 72, textAlign: "center", border: "1px solid #0984E350", borderRadius: 3, fontSize: 13, padding: "1px 4px", color: "#1a1a2e", fontWeight: 800, background: carriereValidee ? "#fafafa" : "#fff" }} />
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center", borderLeft: "2px solid #00B89415" }}>
                                        <input type="number" step="0.01" value={row.ircPts || ""} disabled={carriereValidee} onChange={e => { const v = parseFloat(e.target.value) || 0; setCarriereRows(prev => prev.map(r => r.yr === row.yr ? { ...r, ircPts: v } : r)); }} style={{ width: 72, textAlign: "center", border: "1px solid #00B89430", borderRadius: 3, fontSize: 13, padding: "1px 4px", color: "#00B894", fontWeight: 600, background: carriereValidee ? "#fafafa" : "#fff" }} />
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center", borderLeft: "2px solid #E1705515" }}>
                                        <input type="number" step="0.01" value={row.rciPts || ""} disabled={carriereValidee} onChange={e => { const v = parseFloat(e.target.value) || 0; setCarriereRows(prev => prev.map(r => r.yr === row.yr ? { ...r, rciPts: v } : r)); }} style={{ width: 72, textAlign: "center", border: "1px solid #E1705530", borderRadius: 3, fontSize: 13, padding: "1px 4px", color: "#E17055", fontWeight: 600, background: carriereValidee ? "#fafafa" : "#fff" }} />
                                      </td>
                                      {cnavplOpen ? (
                                        <>
                                          <td style={{ padding: "3px 5px", textAlign: "center", borderLeft: "2px solid #9B59B630", animation: cnavplClosing ? "cnavplFadeOut 0.28s ease forwards" : "cnavplFadeIn 0.3s ease forwards" }}>
                                            <input type="text" value={cnavplRows[row.yr]?.points || ""} onChange={e => { const v = e.target.value; setCnavplRows(p => ({...p, [row.yr]: {...p[row.yr], points: v}})); }} disabled={carriereValidee} style={{ width: 72, textAlign: "center", border: "1px solid #9B59B630", borderRadius: 3, fontSize: 13, padding: "1px 4px", background: carriereValidee ? "#fafafa" : "#fff", color: "#9B59B6", fontWeight: 700 }} />
                                          </td>
                                          <td style={{ padding: "3px 5px", textAlign: "center", animation: cnavplClosing ? "cnavplFadeOut 0.28s ease forwards" : "cnavplFadeIn 0.3s ease forwards" }}>
                                            <input type="text" value={cnavplRows[row.yr]?.pointsCompl || ""} onChange={e => { const v = e.target.value; setCnavplRows(p => ({...p, [row.yr]: {...p[row.yr], pointsCompl: v}})); }} disabled={carriereValidee} style={{ width: 72, textAlign: "center", border: "1px solid #9B59B630", borderRadius: 3, fontSize: 13, padding: "1px 4px", background: carriereValidee ? "#fafafa" : "#fff", color: "#9B59B6", fontWeight: 600 }} />
                                          </td>
                                        </>
                                      ) : (
                                        <td style={{ padding: "3px 5px", width: 24, borderLeft: "2px solid #9B59B630" }}></td>
                                      )}
                                    </tr>
                                  );
                                })}
                                <tr>
                                  <td colSpan={cnavplOpen ? 18 : 16} style={{ padding: "4px 8px" }}>
                                    <button onClick={() => setVisibleRowCount(v => Math.min(v + 1, 65))} style={{ fontSize: 14, padding: "3px 10px", borderRadius: 5, border: "1px dashed #bbb", background: "transparent", color: "#555", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                      <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Ajouter une année ({carriereRows[visibleRowCount] ? carriereRows[visibleRowCount].yr : "—"})
                                    </button>
                                  </td>
                                </tr>
                              </tbody>
                              <tfoot>
                                <tr style={{ background: "#f0f0f0", fontWeight: 700, borderTop: "2px solid #ddd" }}>
                                  <td style={{ padding: "5px 5px", fontSize: 15, color: "#333" }}>∑</td>
                                  <td style={{ borderLeft: "1px solid #eee" }}></td>
                                  <td colSpan={3} style={{ padding: "5px 5px", textAlign: "right", fontSize: 15, color: "#6C5CE7", borderLeft: "2px solid #6C5CE715" }}>
                                    <button onClick={() => setSamOpen(v => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 15, color: "#6C5CE7", padding: 0 }}>
                                      <span style={{ fontSize: 10, display: "inline-block", transform: samOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▶</span>
                                      SAM : {samVal ? samVal.toLocaleString("fr-FR") + " €" : "—"}
                                    </button>
                                  </td>
                                  <td></td>
                                  <td style={{ padding: "5px 5px", textAlign: "center", fontSize: 15, color: "#6C5CE7" }}>{totalCotTbl || "—"}</td>
                                  <td style={{ padding: "5px 5px", textAlign: "center", fontSize: 15, color: "#6C5CE7" }}>{totalAssTbl || "—"}</td>
                                  <td style={{ padding: "5px 5px", textAlign: "center", fontSize: 15, color: "#6C5CE7" }}>{totalArTbl || "—"}</td>
                                  <td style={{ padding: "5px 5px", textAlign: "center", fontSize: 15, color: "#6C5CE7", fontWeight: 800 }}>{totalTrimTbl || "—"}</td>
                                  {(() => {
                                    const visRows = carriereRows.slice(0, visibleRowCount);
                                    const totalT1 = parseFloat(visRows.reduce((s, r) => s + (r.agircT1 ?? 0), 0).toFixed(2));
                                    const totalT2 = parseFloat(visRows.reduce((s, r) => s + (r.agircT2 ?? 0), 0).toFixed(2));
                                    const totalPts = parseFloat(visRows.reduce((s, r) => s + (r.agircPts || 0), 0).toFixed(2));
                                    return (
                                      <>
                                        <td style={{ padding: "5px 5px", textAlign: "center", fontSize: 15, color: "#0984E3", borderLeft: "2px solid #0984E315", fontWeight: 700 }}>{totalT1 ? totalT1.toLocaleString("fr-FR") : "—"}</td>
                                        <td style={{ padding: "5px 5px", textAlign: "center", fontSize: 15, color: "#0984E3", fontWeight: 700 }}>{totalT2 ? totalT2.toLocaleString("fr-FR") : "—"}</td>
                                        <td style={{ padding: "5px 5px", textAlign: "center", fontSize: 15, color: "#1a1a2e", fontWeight: 800 }}>{totalPts ? totalPts.toLocaleString("fr-FR") : "—"}</td>
                                      </>
                                    );
                                  })()}
                                  <td style={{ padding: "5px 5px", textAlign: "center", fontSize: 15, color: "#00B894", borderLeft: "2px solid #00B89415", fontWeight: 700 }}>{carriereRows.slice(0, visibleRowCount).reduce((s, r) => s + (r.ircPts || 0), 0) || "—"}</td>
                                  <td style={{ padding: "5px 5px", textAlign: "center", fontSize: 15, color: "#E17055", borderLeft: "2px solid #E1705515", fontWeight: 700 }}>{carriereRows.slice(0, visibleRowCount).reduce((s, r) => s + (r.rciPts || 0), 0) || "—"}</td>
                                  {cnavplOpen ? (
                                    <>
                                      <td style={{ padding: "5px 5px", textAlign: "center", fontSize: 12, color: "#9B59B6", borderLeft: "2px solid #9B59B630", fontWeight: 800, animation: cnavplClosing ? "cnavplFadeOut 0.28s ease forwards" : "cnavplFadeIn 0.3s ease forwards" }}>{(total => total ? total.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : "—")(carriereRows.slice(0, visibleRowCount).reduce((s, r) => s + (parseFloat(cnavplRows[r.yr]?.points) || 0), 0))}</td>
                                      <td style={{ padding: "5px 5px", textAlign: "center", fontSize: 12, color: "#9B59B6", fontWeight: 800, animation: cnavplClosing ? "cnavplFadeOut 0.28s ease forwards" : "cnavplFadeIn 0.3s ease forwards" }}>{(total => total ? total.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : "—")(carriereRows.slice(0, visibleRowCount).reduce((s, r) => s + (parseFloat(cnavplRows[r.yr]?.pointsCompl) || 0), 0))}</td>
                                    </>
                                  ) : (
                                    <td style={{ padding: "5px 5px", width: 24, borderLeft: "2px solid #9B59B630" }}></td>
                                  )}
                                </tr>
                                {samOpen && (
                                  <tr>
                                    <td colSpan={cnavplOpen ? 18 : 16} style={{ padding: 0, background: "#fff" }}>
                                      <div style={{ padding: "10px 14px", borderTop: "1px solid #6C5CE720" }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: "#6C5CE7", marginBottom: 8 }}>📊 25 meilleures années retenues — salaires revalorisés</div>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                          <thead>
                                            <tr style={{ background: "#6C5CE708" }}>
                                              {["Rang", "Année", "Sal. brut", "Coeff. revalo.", "Sal. CNAV revalorisé"].map(h => (
                                                <th key={h} style={{ padding: "4px 8px", textAlign: h === "Rang" ? "left" : "right", fontWeight: 700, color: "#6C5CE7", borderBottom: "1px solid #6C5CE720" }}>{h}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {samRows.map((r, idx) => (
                                              <tr key={r.yr} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                                                <td style={{ padding: "3px 8px", color: "#555", fontWeight: 600 }}>#{idx + 1}</td>
                                                <td style={{ padding: "3px 8px", textAlign: "right", fontWeight: 700 }}>{r.yr}</td>
                                                <td style={{ padding: "3px 8px", textAlign: "right", color: "#555" }}>{(r.sal || 0).toLocaleString("fr-FR")} €</td>
                                                <td style={{ padding: "3px 8px", textAlign: "right", color: "#0984E3", fontWeight: 600 }}>{r.coeff}</td>
                                                <td style={{ padding: "3px 8px", textAlign: "right", fontWeight: 700, color: "#6C5CE7" }}>{(revaloValues[r.yr] ?? 0).toLocaleString("fr-FR")} €</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                          <tfoot>
                                            <tr style={{ background: "#6C5CE708", borderTop: "2px solid #6C5CE720" }}>
                                              <td colSpan={4} style={{ padding: "5px 8px", fontWeight: 700, color: "#6C5CE7" }}>SAM — moyenne des 25 meilleures années CNAV revalorisées</td>
                                              <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 800, fontSize: 13, color: "#6C5CE7" }}>{samVal ? samVal.toLocaleString("fr-FR") + " €" : "—"}</td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </tfoot>
                            </table>
                          </div>

                          {/* Détail par régime */}
                          <div style={{ marginTop: 12, borderTop: "1px solid #f0f0f0", paddingTop: 10 }}>
                            <button onClick={() => setAccordeonsVisible(v => !v)}
                              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "2px 0", width: "100%" }}>
                              <span style={{ fontSize: 11, color: "#666", display: "inline-block", transform: accordeonsVisible ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▶</span>
                              <span style={{ fontSize: 12, color: "#555", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>Détail par régime</span>
                              {/* <span style={{ fontSize: 11, color: "#ddd", marginLeft: 4 }}>— CNAV · AGIRC-ARRCO · Ircantec · RCI · CNAV PL · PER</span> */}
                            </button>
                          </div>
                          {accordeonsVisible && (
                            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                              {[
                                { id: "cnav_acc",  label: "CNAV — Régime de base",             icon: "🏛️", color: "#6C5CE7" },
                                { id: "agirc_acc", label: "AGIRC-ARRCO — Complémentaire",      icon: "📊", color: "#0984E3" },
                                { id: "irc_acc",   label: "IRCANTEC — Agents non titulaires",  icon: "🏢", color: "#00B894" },
                                { id: "rci_acc",   label: "RCI / SSI — Indépendants",          icon: "📑", color: "#E17055" },
                                { id: "cnavpl_acc",label: "CIPAV — Libéral",                 icon: "🏥", color: "#9B59B6", cols: ["Revenus", "Rev. CIPAV", "Points"] },
                                { id: "per_acc",   label: "PER — Épargne retraite",             icon: "💼", color: "#D63031" },
                              ].map((reg) => {
                                const isOpen = openAccordeons.includes(reg.id);
                                return (
                                  <div key={reg.id} style={{ border: `1px solid ${reg.color}25`, borderRadius: 9, overflow: "hidden" }}>
                                    <button
                                      onClick={() => setOpenAccordeons(prev => prev.includes(reg.id) ? prev.filter(x => x !== reg.id) : [...prev, reg.id])}
                                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: isOpen ? `${reg.color}06` : "#fafafa", border: "none", cursor: "pointer" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 16 }}>{reg.icon}</span>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: reg.color }}>{reg.label}</span>
                                      </div>
                                      <span style={{ fontSize: 13, color: reg.color, transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }}>▼</span>
                                    </button>
                                    {isOpen && (
                                      <div style={{ padding: "14px 16px", background: "#fff" }}>
                                        {/* ── CNAV PL : table contrôlée pré-remplie ── */}
                                        {reg.id === "cnavpl_acc" ? (
                                          <div style={{ overflowX: "auto" }}>
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                              <thead>
                                                <tr style={{ background: `${reg.color}08` }}>
                                                  <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 700, color: reg.color, borderBottom: `1px solid ${reg.color}20` }}>Année</th>
                                                  {["Revenus", "Rev. CIPAV", "Points"].map(c => (
                                                    <th key={c} style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, color: reg.color, borderBottom: `1px solid ${reg.color}20`, whiteSpace: "nowrap" }}>{c}</th>
                                                  ))}
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {Object.entries(cnavplRows).sort(([a],[b]) => b - a).map(([yr, row], i) => (
                                                  <tr key={yr} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                                    <td style={{ padding: "4px 8px", fontWeight: 700, color: "#333" }}>{yr}</td>
                                                    {[
                                                      { key: "revenus", val: row.revenus },
                                                      { key: "revCnavpl", val: row.revCnavpl },
                                                      { key: "points", val: row.points },
                                                    ].map(({ key, val }) => (
                                                      <td key={key} style={{ padding: "4px 8px", textAlign: "right" }}>
                                                        <input
                                                          type="number"
                                                          value={val}
                                                          disabled={carriereValidee}
                                                          onChange={e => setCnavplRows(prev => ({ ...prev, [parseInt(yr,10)]: { ...prev[parseInt(yr,10)], [key]: e.target.value } }))}
                                                          style={{ width: 70, textAlign: "right", border: `1px solid ${val ? reg.color + "60" : reg.color + "30"}`, borderRadius: 3, fontSize: 12, padding: "1px 4px", color: reg.color, fontWeight: 600, background: carriereValidee ? "#fafafa" : val ? `${reg.color}06` : "#fff" }}
                                                        />
                                                      </td>
                                                    ))}
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        ) : reg.id === "cnav_acc" ? (
                                          /* ── CNAV : synthèse extraction ── */
                                          risCarriereSynthese ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                                {[
                                                  { label: "Trimestres validés", value: risCarriereSynthese.trimestres_total ?? "—" },
                                                  { label: "Années cotisées", value: risCarriereSynthese.annees_cotisees ?? "—" },
                                                ].map(({ label, value }) => (
                                                  <div key={label} style={{ background: "#6C5CE708", border: "1px solid #6C5CE730", borderRadius: 7, padding: "8px 14px", textAlign: "center" }}>
                                                    <div style={{ fontSize: 18, fontWeight: 800, color: "#6C5CE7" }}>{value}</div>
                                                    <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{label}</div>
                                                  </div>
                                                ))}
                                              </div>
                                              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                                                💡 Salaires et trimestres chargés dans le tableau carrière ci-dessus.
                                              </div>
                                            </div>
                                          ) : (
                                            <div style={{ fontSize: 13, color: "#555" }}><em>Données CNAV — à compléter / importer depuis le RIS.</em></div>
                                          )
                                        ) : reg.id === "agirc_acc" ? (
                                          /* ── AGIRC-ARRCO : total extrait ── */
                                          droitsSynthese?.agirc_arrco != null ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                              <div style={{ display: "inline-flex", alignItems: "baseline", gap: 6, background: "#0984E308", border: "1px solid #0984E330", borderRadius: 7, padding: "10px 16px", alignSelf: "flex-start" }}>
                                                <span style={{ fontSize: 22, fontWeight: 800, color: "#0984E3" }}>
                                                  {(droitsSynthese.agirc_arrco.points_total ?? 0).toLocaleString("fr-FR")}
                                                </span>
                                                <span style={{ fontSize: 13, color: "#0984E3", fontWeight: 600 }}>pts</span>
                                                <span style={{ fontSize: 11, color: "#888", marginLeft: 4 }}>total extrait du RIS</span>
                                              </div>
                                              <div style={{ fontSize: 12, color: "#888" }}>
                                                💡 Détail annuel disponible après le calcul par script.
                                              </div>
                                            </div>
                                          ) : (
                                            <div style={{ fontSize: 13, color: "#555" }}><em>Données AGIRC-ARRCO — à compléter / importer depuis le RIS.</em></div>
                                          )
                                        ) : reg.id === "irc_acc" ? (
                                          /* ── IRCANTEC ── */
                                          droitsSynthese?.ircantec != null ? (
                                            droitsSynthese.ircantec.points_total > 0 ? (
                                              <div style={{ display: "inline-flex", alignItems: "baseline", gap: 6, background: "#00B89408", border: "1px solid #00B89430", borderRadius: 7, padding: "10px 16px" }}>
                                                <span style={{ fontSize: 22, fontWeight: 800, color: "#00B894" }}>{droitsSynthese.ircantec.points_total.toLocaleString("fr-FR")}</span>
                                                <span style={{ fontSize: 13, color: "#00B894", fontWeight: 600 }}>pts</span>
                                                <span style={{ fontSize: 11, color: "#888", marginLeft: 4 }}>total extrait du RIS</span>
                                              </div>
                                            ) : (
                                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#888" }}>
                                                <span style={{ fontSize: 14 }}>✅</span>
                                                <em>Non concerné d'après le RIS (0 pt IRCANTEC)</em>
                                              </div>
                                            )
                                          ) : (
                                            <div style={{ fontSize: 13, color: "#555" }}><em>Données IRCANTEC — à compléter / importer depuis le RIS.</em></div>
                                          )
                                        ) : reg.id === "rci_acc" ? (
                                          /* ── RCI / SSI ── */
                                          droitsSynthese?.rci != null ? (
                                            droitsSynthese.rci.points_total > 0 ? (
                                              <div style={{ display: "inline-flex", alignItems: "baseline", gap: 6, background: "#E1705508", border: "1px solid #E1705530", borderRadius: 7, padding: "10px 16px" }}>
                                                <span style={{ fontSize: 22, fontWeight: 800, color: "#E17055" }}>{droitsSynthese.rci.points_total.toLocaleString("fr-FR")}</span>
                                                <span style={{ fontSize: 13, color: "#E17055", fontWeight: 600 }}>pts</span>
                                                <span style={{ fontSize: 11, color: "#888", marginLeft: 4 }}>total extrait du RIS</span>
                                              </div>
                                            ) : (
                                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#888" }}>
                                                <span style={{ fontSize: 14 }}>✅</span>
                                                <em>Non concerné d'après le RIS (0 pt RCI / SSI)</em>
                                              </div>
                                            )
                                          ) : (
                                            <div style={{ fontSize: 13, color: "#555" }}><em>Données RCI / SSI — à compléter / importer depuis le RIS.</em></div>
                                          )
                                        ) : (
                                          /* ── Autres (PER) : placeholder ── */
                                          <div style={{ fontSize: 13, color: "#555" }}><em>Données {reg.label} — à compléter / importer depuis le RIS.</em></div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Boutons bas */}
                          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                            <button
                              onClick={handleGeler}
                              disabled={carriereValidee || frozenLoading || isCarriereEmpty}
                              title={isCarriereEmpty && !carriereValidee ? "Remplissez au moins une ligne de carrière" : ""}
                              style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", background: carriereValidee ? "#00B894" : frozenLoading ? "#aaa" : isCarriereEmpty ? "#ccc" : "#E17055", color: "#fff", fontWeight: 700, fontSize: 13, cursor: (carriereValidee || frozenLoading || isCarriereEmpty) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                              {carriereValidee ? "🔒 Données gelées" : frozenLoading ? "⏳ Gel en cours…" : isCarriereEmpty ? "📝 Carrière vide" : "🔒 Geler & Calculer"}
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
                                  await axios.post(`${global.config.server_url}/frozen_data/${parseInt(id)}/unlock`, {}, Config);
                                } catch (e) { /* silencieux */ }
                                setCarriereValidee(false);
                              }}
                              disabled={!carriereValidee}
                              style={{ padding: "8px 14px", borderRadius: 7, border: "1px solid #ddd", background: "#fafafa", color: carriereValidee ? "#E17055" : "#bbb", fontSize: 13, cursor: carriereValidee ? "pointer" : "default", fontWeight: carriereValidee ? 600 : 400 }}>
                              ↺ Déverrouiller
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // ── DISPOSITIFS: special rendering with toggle chips ──
                    if (expandedPanel === "dispositifs") {
                      const analyserTousDisabled = !carriereValidee || activatedDispositifs.filter(id => DISPOSITIF_TO_SKILL_CODE[id]).every(id => !!scenarioSkillLoading[DISPOSITIF_TO_SKILL_CODE[id]]);
                      const analyserTousVisible = activatedDispositifs.some(id => DISPOSITIF_TO_SKILL_CODE[id]);
                      const analyserTousLoading = activatedDispositifs.filter(id => DISPOSITIF_TO_SKILL_CODE[id]).some(id => !!scenarioSkillLoading[DISPOSITIF_TO_SKILL_CODE[id]]);
                      return (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 18 }}>{panel.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: panel.color }}>{panel.label}</span>
                            <span style={{ fontSize: 12, color: "#555" }}>— Activez les dispositifs, l'IA calcule les dates</span>
                            {analyserTousVisible && (
                              <button
                                onClick={() => {
                                  activatedDispositifs.forEach(dId => {
                                    const sc = DISPOSITIF_TO_SKILL_CODE[dId];
                                    if (sc && !scenarioSkillLoading[sc]) handleScenarioSkillExecute(sc, {});
                                  });
                                }}
                                disabled={analyserTousDisabled}
                                style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, border: "none", background: analyserTousDisabled ? "#ccc" : panel.color, color: "#fff", fontWeight: 700, fontSize: 12, cursor: analyserTousDisabled ? "not-allowed" : "pointer", opacity: analyserTousDisabled ? 0.6 : 1, whiteSpace: "nowrap" }}
                              >
                                {analyserTousLoading ? (
                                  <><span style={{ display: "inline-block", width: 9, height: 9, border: "2px solid #fff4", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Analyse en cours...</>
                                ) : "🔍 Analyser tous"}
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: "#555", marginBottom: 14 }}>{panel.desc}</div>

                          <div className="simu-action-grid">
                            {panel.actions.map((action) => {
                              const ok = checkReq(action.requires);
                              const miss = getMissing(action.requires);
                              const isActivated = activatedDispositifs.includes(action.id);
                              const isDetected = !!detectedDispositifs[action.id];
                              const detectedReason = detectedDispositifs[action.id] || "";
                              const skillCode = DISPOSITIF_TO_SKILL_CODE[action.id];
                              const isSkillRunning = skillCode ? !!scenarioSkillLoading[skillCode] : false;
                              const skillResultData = skillCode ? scenarioSkillResults[skillCode] : null;
                              const skillErrorMsg = skillCode ? scenarioSkillErrors[skillCode] : null;
                              return (
                                <div key={action.id}>
                                  <button onClick={() => { if (ok) toggleDispositif(action.id); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", borderRadius: 8, border: `2px solid ${isActivated ? panel.color : ok ? "#e8e8e8" : "#f0f0f0"}`, background: isActivated ? `${panel.color}12` : ok ? "#fafafa" : "#f8f8f8", cursor: ok ? "pointer" : "not-allowed", textAlign: "left", opacity: ok ? 1 : 0.45, transition: "all 0.12s", position: "relative", width: "100%", flex: 1 }}>
                                    <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${isActivated ? panel.color : "#ccc"}`, background: isActivated ? panel.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, color: "#fff" }}>
                                      {isActivated && "✓"}
                                    </div>
                                    <span style={{ fontSize: 15, flexShrink: 0 }}>{action.icon}</span>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                        <div style={{ fontSize: 13, fontWeight: isActivated ? 700 : 600, color: isActivated ? panel.color : ok ? "#333" : "#999" }}>{action.label}</div>
                                        {isDetected && ok && (
                                          <span title={detectedReason} style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: isActivated ? "#F9A825" : "#F9A825", color: "#fff", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>💡 Détecté</span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: 11, color: "#555" }}>{action.desc}</div>
                                      {isDetected && detectedReason && (
                                        <div style={{ fontSize: 10, color: "#F9A825", marginTop: 1, fontStyle: "italic" }}>{detectedReason}</div>
                                      )}
                                      {action.generates_date && <div style={{ fontSize: 10, color: "#0984E3", marginTop: 1 }}>📅 Génère une date de simulation</div>}
                                      {!ok && <div style={{ fontSize: 10, color: "#D63031", marginTop: 1 }}>⚠ Manque : {miss.map((m) => DOC_TYPES.find((d) => d.id === m)?.label).join(", ")}</div>}
                                    </div>
                                  </button>

                                  {isActivated && skillCode && (
                                    <div style={{ marginTop: 6 }}>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleScenarioSkillExecute(skillCode, inputValues[action.id] ? { input: inputValues[action.id] } : {}); }}
                                        disabled={isSkillRunning || !carriereValidee}
                                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 5, border: "none", background: isSkillRunning || !carriereValidee ? "#ccc" : panel.color, color: "#fff", fontWeight: 700, fontSize: 12, cursor: isSkillRunning || !carriereValidee ? "not-allowed" : "pointer", opacity: isSkillRunning || !carriereValidee ? 0.6 : 1, width: "100%" }}
                                      >
                                        {isSkillRunning ? (
                                          <>
                                            <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid #fff4", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                                            Analyse en cours...
                                          </>
                                        ) : "🔍 Analyser avec IA"}
                                      </button>

                                      {skillErrorMsg && (
                                        <div style={{ marginTop: 6, padding: "7px 10px", background: "#D6303110", border: "1px solid #D63031", borderRadius: 5, fontSize: 12, color: "#D63031" }}>
                                          ⚠ {skillErrorMsg}
                                        </div>
                                      )}

                                      {skillResultData && !skillErrorMsg && (() => {
                                        const color = skillResultData.eligible ? "#00B894" : "#C0392B";
                                        const bgColor = skillResultData.eligible ? "#00B89410" : "#FDEDEC";
                                        const borderWidth = skillResultData.eligible ? "1px" : "2px";
                                        return (
                                          <div style={{ marginTop: 6, padding: "10px 12px", background: bgColor, border: `${borderWidth} solid ${color}`, borderRadius: 6 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4 }}>
                                              {skillResultData.eligible ? "✓ Éligible" : "✗ Non éligible"}
                                            </div>
                                            {skillResultData.raison_eligibilite && (
                                              <div style={{ fontSize: 11, color: "#333", marginBottom: 5 }}>{skillResultData.raison_eligibilite}</div>
                                            )}
                                            {skillCode === "RACL" && skillResultData.eligible && (
                                              <div style={{ marginBottom: 4 }}>
                                                {skillResultData.age_depart_possible != null && (
                                                  <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 2 }}>
                                                    🗓 Départ possible à {skillResultData.age_depart_possible} ans
                                                    {skillResultData.date_depart_estimee ? ` — ${skillResultData.date_depart_estimee}` : ""}
                                                  </div>
                                                )}
                                                {skillResultData.palier?.libelle && (
                                                  <div style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>Palier : {skillResultData.palier.libelle}</div>
                                                )}
                                              </div>
                                            )}
                                            {skillCode === "RACL" && !skillResultData.eligible && skillResultData.manquants > 0 && (
                                              <div style={{ fontSize: 11, color: "#C0392B", marginBottom: 4 }}>
                                                ⏳ {skillResultData.manquants} trimestre{skillResultData.manquants > 1 ? "s" : ""} cotisé{skillResultData.manquants > 1 ? "s" : ""} manquant{skillResultData.manquants > 1 ? "s" : ""}
                                              </div>
                                            )}
                                            {skillCode === "COTISATIONS_MIN" && skillResultData.tns_result && (
                                              <div style={{ marginBottom: 4 }}>
                                                {skillResultData.tns_result.regime_tns && (
                                                  <div style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>
                                                    Régime : <strong>{skillResultData.tns_result.regime_tns}</strong> · {skillResultData.tns_result.nb_annees_tns} an{skillResultData.tns_result.nb_annees_tns > 1 ? "s" : ""} d'activité
                                                  </div>
                                                )}
                                                {skillResultData.tns_result.pension_complementaire_mensuelle > 0 && (
                                                  <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 2 }}>
                                                    💰 Pension : {skillResultData.tns_result.pension_complementaire_mensuelle.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €/mois
                                                  </div>
                                                )}
                                                {skillResultData.tns_result.nb_annees_incompletes > 0 && (
                                                  <div style={{ fontSize: 11, color: "#E17055", marginBottom: 2 }}>
                                                    ⚠ {skillResultData.tns_result.nb_annees_incompletes} année{skillResultData.tns_result.nb_annees_incompletes > 1 ? "s" : ""} incomplète{skillResultData.tns_result.nb_annees_incompletes > 1 ? "s" : ""} · {skillResultData.tns_result.total_trimestres_manquants} trim. perdus
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            {skillResultData.impact?.gain_mensuel > 0 && (
                                              <div style={{ fontSize: 12, fontWeight: 600, color: "#00B894", marginBottom: 4 }}>
                                                💰 +{skillResultData.impact.gain_mensuel.toFixed(2)} €/mois ({skillResultData.impact.gain_annuel?.toFixed(0)} €/an)
                                              </div>
                                            )}
                                            {skillResultData.impact?.trimestres_ajoutes > 0 && (
                                              <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>
                                                +{skillResultData.impact.trimestres_ajoutes} trim. assimilés
                                              </div>
                                            )}
                                            {skillResultData.alertes?.length > 0 && (
                                              <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${color}40` }}>
                                                {skillResultData.alertes.map((a, i) => (
                                                  <div key={i} style={{ fontSize: 10, color: a.niveau === "ROUGE" ? "#D63031" : a.niveau === "ORANGE" ? "#E17055" : "#00B894", marginBottom: 3 }}>
                                                    <strong>{a.niveau}</strong> — {a.message}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                            {skillResultData.recommandations?.length > 0 && (
                                              <div style={{ marginTop: 6, fontSize: 10, color: "#555" }}>
                                                <strong>Recommandations :</strong>
                                                <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                                                  {skillResultData.recommandations.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
                                                </ul>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Input fields for activated dispositifs that need them */}
                          {activatedDispositifs.length > 0 && panel.actions.filter(a => a.hasInput && activatedDispositifs.includes(a.id)).length > 0 && (
                            <div style={{ marginTop: 12, padding: "10px 12px", background: "#00B89408", borderRadius: 8, border: "1px solid #00B89420" }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#00B894", marginBottom: 8 }}>Paramètres des dispositifs activés :</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                                {panel.actions.filter(a => a.hasInput && activatedDispositifs.includes(a.id)).map(a => (
                                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 15 }}>{a.icon}</span>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>{a.inputLabel} :</label>
                                    <input type={a.inputType === "date" ? "date" : "number"} placeholder={a.inputType === "date" ? "" : "Ex: 3"} value={inputValues[a.id] || ""} onChange={(e) => setInputValues({ ...inputValues, [a.id]: e.target.value })} style={{ padding: "4px 7px", borderRadius: 5, border: "1px solid #ccc", fontSize: 13, width: a.inputType === "date" ? 130 : 60, fontFamily: "inherit" }} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── Bouton maître — Calculer tous les régimes ── */}
                          <div style={{ marginTop: 18, marginBottom: 4 }}>
                            {!carriereValidee && (
                              <div style={{ marginBottom: 8, fontSize: 12, color: "#E17055", background: "#E1705510", border: "1px solid #E1705530", borderRadius: 6, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                                <span>⚠</span>
                                <span>Veuillez valider la carrière avant de lancer les calculs.</span>
                              </div>
                            )}
                            {carriereValidee && isCarriereEmpty && (
                              <div style={{ marginBottom: 8, fontSize: 12, color: "#D63031", background: "#D6303110", border: "1px solid #D6303130", borderRadius: 6, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                                <span>🚫</span>
                                <span>Carrière vide — déverrouillez et renseignez les données avant de calculer.</span>
                              </div>
                            )}
                            {carriereValidee && !isCarriereEmpty && !user?.birth_date && (
                              <div style={{ marginBottom: 8, fontSize: 12, color: "#D63031", background: "#D6303110", border: "1px solid #D6303130", borderRadius: 6, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                                <span>🚫</span>
                                <span>Date de naissance manquante dans le profil client.</span>
                              </div>
                            )}
                            <button
                              onClick={handleCalculateAllRegimes}
                              disabled={!carriereValidee || isCalculatingAll || isCarriereEmpty || !user?.birth_date}
                              title={!carriereValidee ? "Validez d'abord la carrière" : isCarriereEmpty ? "Carrière vide" : !user?.birth_date ? "Date de naissance manquante" : "Lancer le calcul simultané des 5 régimes"}
                              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "12px 20px", borderRadius: 8, border: "none", background: carriereValidee && !isCalculatingAll && !isCarriereEmpty && user?.birth_date ? "linear-gradient(135deg, #6C5CE7 0%, #0984E3 100%)" : "#ccc", color: "#fff", fontWeight: 700, fontSize: 15, cursor: carriereValidee && !isCalculatingAll && !isCarriereEmpty && user?.birth_date ? "pointer" : "not-allowed", boxShadow: carriereValidee && !isCalculatingAll && !isCarriereEmpty && user?.birth_date ? "0 4px 14px rgba(108,92,231,0.35)" : "none", transition: "all 0.2s" }}
                            >
                              {isCalculatingAll ? (
                                <>
                                  <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #fff4", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                  Calculs en cours… (5 régimes)
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: 16 }}>🚀</span>
                                  Calculer toutes les pensions (5 régimes)
                                </>
                              )}
                            </button>
                          </div>

                          {/* ── Calculer CNAV ── */}
                          <div style={{ marginTop: 18, padding: "12px 14px", background: carriereValidee ? "#f0fdf9" : "#fafafa", borderRadius: 9, border: `1px solid ${carriereValidee ? "#00B89430" : "#e8e8e8"}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 16 }}>🧮</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>Calcul pension CNAV</span>
                              {!carriereValidee && (
                                <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "#E1705515", color: "#E17055", fontWeight: 700 }}>Validez d'abord la carrière</span>
                              )}
                            </div>
                            {skillLoading && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6C5CE7" }}>
                                <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid #6C5CE740", borderTop: "2px solid #6C5CE7", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                Calcul CNAV en cours…
                              </div>
                            )}
                            {skillError && (
                              <div style={{ marginTop: 8, fontSize: 12, color: "#D63031", background: "#D6303110", padding: "6px 10px", borderRadius: 5 }}>
                                ⚠ {skillError}
                              </div>
                            )}

                            {/* ── Résultat CNAV ── */}
                            {skillResult && (
                              <div style={{ marginTop: 14, animation: "cnavReveal 0.35s cubic-bezier(0.16,1,0.3,1) both" }}>

                                {/* ── ÉTAT CRITIQUE ── */}
                                {skillResult.arret_critique ? (
                                  <div style={{ borderRadius: 8, background: "#D6303108", border: "1px solid #D6303130", overflow: "hidden" }}>
                                    <div style={{ padding: "11px 14px 10px", borderBottom: "1px solid #D6303120" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                        <span style={{ fontSize: 14 }}>🚫</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#D63031", letterSpacing: "0.06em", textTransform: "uppercase" }}>Arrêt critique</span>
                                      </div>
                                      <div style={{ fontSize: 14, color: "#D63031", lineHeight: 1.5 }}>
                                        {skillResult.arret_critique.raison || (typeof skillResult.arret_critique === 'string' ? skillResult.arret_critique : JSON.stringify(skillResult.arret_critique))}
                                      </div>
                                      {skillResult.arret_critique.action_requise && (
                                        <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid #D6303118", fontSize: 12, color: "#b71c1c", lineHeight: 1.4 }}>
                                          <span style={{ fontWeight: 600 }}>Action requise —</span> {skillResult.arret_critique.action_requise}
                                        </div>
                                      )}
                                    </div>
                                    {skillResult.alertes && skillResult.alertes.length > 0 && (
                                      <div style={{ padding: "9px 14px 11px", display: "flex", flexDirection: "column", gap: 5 }}>
                                        {skillResult.alertes.map((a, i) => {
                                          const c = a.niveau === "ROUGE" ? "#D63031" : a.niveau === "ORANGE" ? "#E17055" : "#F9A825";
                                          return (
                                            <div key={`${a.code}-${i}`} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                              <span style={{ fontSize: 11, fontWeight: 700, color: c, flexShrink: 0, minWidth: 32 }}>{a.code}</span>
                                              <span style={{ fontSize: 12, color: "#555", lineHeight: 1.4 }}>{a.message}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                ) : skillResult.python_output ? (

                                  /* ── ÉTAT SUCCESS ── */
                                  <div style={{ borderRadius: 8, background: "#fff", border: "1px solid #6C5CE722", overflow: "hidden", boxShadow: "0 2px 8px rgba(108,92,231,0.06)" }}>

                                    {/* En-tête */}
                                    <div style={{ padding: "10px 14px 9px", background: "#6C5CE708", borderBottom: "1px solid #6C5CE715", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: "#6C5CE7", textTransform: "uppercase", letterSpacing: "0.07em" }}>Résultat CNAV</span>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: "#6C5CE7", background: "#6C5CE715", padding: "2px 7px", borderRadius: 3, letterSpacing: "0.08em" }}>CALCUL BRUT</span>
                                    </div>

                                    {/* Pensions — hero */}
                                    <div style={{ padding: "12px 14px", borderBottom: "1px solid #f0eeff", display: "flex", flexWrap: "wrap", gap: 10 }}>
                                      <div style={{ flex: "1 1 120px", background: "#6C5CE710", borderRadius: 7, padding: "10px 12px" }}>
                                        <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Mensuelle brute</div>
                                        <div style={{ fontSize: 22, fontWeight: 700, color: "#6C5CE7", lineHeight: 1, letterSpacing: "-0.01em" }}>
                                          {skillResult.python_output.pension_mensuelle_brute?.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                                          <span style={{ fontSize: 15, fontWeight: 600, marginLeft: 3 }}>€</span>
                                        </div>
                                      </div>
                                      <div style={{ flex: "1 1 120px", background: "#f8f7ff", borderRadius: 7, padding: "10px 12px" }}>
                                        <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Annuelle brute</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", lineHeight: 1, letterSpacing: "-0.01em" }}>
                                          {skillResult.python_output.pension_annuelle_brute?.toLocaleString("fr-FR", { minimumFractionDigits: 0 })}
                                          <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 3, color: "#555" }}>€</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Paramètres */}
                                    <div style={{ padding: "10px 14px 12px" }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Paramètres de calcul</div>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                                        {[
                                          ["SAM · 25 meilleures années", `${skillResult.python_output.sam?.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} €`],
                                          ["Taux de liquidation",         `${skillResult.python_output.taux_liquidation} %`],
                                          ["Coefficient de proratisation", skillResult.python_output.coefficient_proratisation?.toFixed(4)],
                                        ].map(([label, val], i) => (
                                          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < 2 ? "1px solid #f4f3ff" : "none" }}>
                                            <span style={{ fontSize: 12, color: "#666" }}>{label}</span>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{val}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Alertes */}
                                    {skillResult.alertes && skillResult.alertes.length > 0 && (
                                      <div style={{ padding: "8px 14px 12px", borderTop: "1px solid #f0eeff" }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>Alertes</div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                          {skillResult.alertes.map((a, i) => {
                                            const c = a.niveau === "ROUGE" ? "#D63031" : a.niveau === "ORANGE" ? "#E17055" : "#F9A825";
                                            return (
                                              <div key={`${a.code}-${i}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 10px", borderRadius: 6, background: `${c}0D`, border: `1px solid ${c}28` }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: c, flexShrink: 0, minWidth: 32 }}>{a.code}</span>
                                                <span style={{ fontSize: 12, color: "#444", lineHeight: 1.4 }}>{a.message}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Pied */}
                                    <div style={{ padding: "6px 14px", borderTop: "1px solid #f4f3ff", background: "#faf9ff" }}>
                                      <span style={{ fontSize: 11, color: "#666" }}>Montants bruts avant prélèvements sociaux (CSG/CRDS 9,2 %)</span>
                                    </div>
                                  </div>

                                ) : null}
                              </div>
                            )}
                          </div>
                          {/* ── Calculer AGIRC-ARRCO ── */}
                          <div style={{ marginTop: 12, padding: "12px 14px", background: carriereValidee ? "#f0f7ff" : "#fafafa", borderRadius: 9, border: `1px solid ${carriereValidee ? "#0984E330" : "#e8e8e8"}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 16 }}>📊</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>Calcul pension AGIRC-ARRCO</span>
                              {!carriereValidee && (
                                <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "#E1705515", color: "#E17055", fontWeight: 700 }}>Validez d'abord la carrière</span>
                              )}
                            </div>
                            {agircLoading && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#0984E3" }}>
                                <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid #0984E340", borderTop: "2px solid #0984E3", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                Calcul AGIRC-ARRCO en cours…
                              </div>
                            )}
                            {agircError && (
                              <div style={{ marginTop: 8, fontSize: 12, color: "#D63031", background: "#D6303110", padding: "6px 10px", borderRadius: 5 }}>
                                ⚠ {agircError}
                              </div>
                            )}

                            {/* ── Résultat AGIRC-ARRCO ── */}
                            {agircResult && agircResult.python_output && (
                              <div style={{ marginTop: 14 }}>
                                {agircResult.arret_critique && (
                                  <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 8, background: "#D6303112", border: "2px solid #D63031" }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#D63031", marginBottom: 4 }}>🚫 Arrêt critique</div>
                                    <div style={{ fontSize: 12, color: "#D63031" }}>{agircResult.arret_critique.raison || (typeof agircResult.arret_critique === 'string' ? agircResult.arret_critique : JSON.stringify(agircResult.arret_critique))}</div>
                                  </div>
                                )}
                                <div style={{ background: "#0984E308", border: "1px solid #0984E320", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0984E3", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Résultat AGIRC-ARRCO</div>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                                    {[
                                      ["Pension mensuelle brute", `${agircResult.python_output.pension_mensuelle_brute?.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, "#0984E3", true],
                                      ["Pension annuelle brute",  `${agircResult.python_output.pension_annuelle_brute?.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`, "#1a1a2e", false],
                                      ["Nb points total",         (agircResult.python_output.total_points ?? agircResult.python_output.nb_points_total)?.toLocaleString("fr-FR"), "#6C5CE7", false],
                                      ["Coeff. solidarité",       agircResult.python_output.coefficient_solidarite ? `-${agircResult.python_output.coefficient_solidarite * 100}%` : "Aucun (taux plein)", agircResult.python_output.coefficient_solidarite ? "#E17055" : "#00B894", false],
                                      ["Valeur de service",       `${(agircResult.python_output.valeur_point ?? agircResult.python_output.valeur_service)} €/pt`, "#888", false],
                                    ].map(([label, val, color, big]) => (
                                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #0984E310" }}>
                                        <span style={{ fontSize: 11, color: "#555" }}>{label}</span>
                                        <span style={{ fontSize: big ? 13 : 10, fontWeight: 700, color }}>{val}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {agircResult.alertes && agircResult.alertes.length > 0 && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 2 }}>Alertes</div>
                                    {agircResult.alertes.map((a, i) => {
                                      const color = a.niveau === "ROUGE" ? "#D63031" : a.niveau === "JAUNE" ? "#F9A825" : "#00B894";
                                      return (
                                        <div key={`${a.code}-${i}`} style={{ display: "flex", gap: 8, padding: "7px 10px", borderRadius: 6, background: `${color}10`, border: `1px solid ${color}30` }}>
                                          <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0, minWidth: 36 }}>{a.code}</span>
                                          <span style={{ fontSize: 12, color: "#333" }}>{a.message?.raison || a.message || (typeof a === 'object' ? a.raison || a.message : a)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* ── Calculer IRCANTEC ── */}
                          <div style={{ marginTop: 12, padding: "12px 14px", background: carriereValidee ? "#f0fdf9" : "#fafafa", borderRadius: 9, border: `1px solid ${carriereValidee ? "#00B89430" : "#e8e8e8"}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 16 }}>🏢</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>Calcul pension IRCANTEC</span>
                              {!carriereValidee && (
                                <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "#E1705515", color: "#E17055", fontWeight: 700 }}>Validez d'abord la carrière</span>
                              )}
                            </div>
                            {ircantecLoading && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#00B894" }}>
                                <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid #00B89440", borderTop: "2px solid #00B894", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                Calcul IRCANTEC en cours…
                              </div>
                            )}
                            {ircantecError && (
                              <div style={{ marginTop: 8, fontSize: 12, color: "#D63031", background: "#D6303110", padding: "6px 10px", borderRadius: 5 }}>
                                ⚠ {ircantecError}
                              </div>
                            )}
                            {/* Résultat IRCANTEC */}
                            {ircantecResult && ircantecResult.python_output && (
                              <div style={{ marginTop: 14 }}>
                                <div style={{ background: "#00B89408", border: "1px solid #00B89420", borderRadius: 8, padding: "10px 14px" }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#00B894", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Résultat IRCANTEC</div>
                                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                                    <div style={{ flex: 1, background: "#00B89415", borderRadius: 7, padding: "10px 12px" }}>
                                      <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Mensuelle brute</div>
                                      <div style={{ fontSize: 20, fontWeight: 700, color: "#00B894" }}>{ircantecResult.python_output.pension_mensuelle_brute?.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</div>
                                    </div>
                                    <div style={{ flex: 1, background: "#f8fdfb", borderRadius: 7, padding: "10px 12px", border: "1px solid #00B89410" }}>
                                      <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Annuelle brute</div>
                                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>{ircantecResult.python_output.pension_annuelle_brute?.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} €</div>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {[
                                      ["Nb points total", ircantecResult.python_output.nb_points_total?.toLocaleString("fr-FR")],
                                      ["Valeur du point", `${ircantecResult.python_output.valeur_point} €`],
                                    ].map(([label, val]) => (
                                      <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderBottom: "1px solid #00B89410", paddingBottom: 4 }}>
                                        <span style={{ color: "#666" }}>{label}</span>
                                        <span style={{ fontWeight: 700, color: "#1a1a2e" }}>{val}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ── Calculer RCI ── */}
                          <div style={{ marginTop: 12, padding: "12px 14px", background: carriereValidee ? "#fef8f5" : "#fafafa", borderRadius: 9, border: `1px solid ${carriereValidee ? "#E1705530" : "#e8e8e8"}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 16 }}>📑</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>Calcul pension RCI</span>
                              {!carriereValidee && (
                                <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "#E1705515", color: "#E17055", fontWeight: 700 }}>Validez d'abord la carrière</span>
                              )}
                            </div>
                            {rciLoading && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#E17055" }}>
                                <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid #E1705540", borderTop: "2px solid #E17055", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                Calcul RCI en cours…
                              </div>
                            )}
                            {rciError && (
                              <div style={{ marginTop: 8, fontSize: 12, color: "#D63031", background: "#D6303110", padding: "6px 10px", borderRadius: 5 }}>
                                ⚠ {rciError}
                              </div>
                            )}
                            {/* Résultat RCI */}
                            {rciResult && rciResult.python_output && (
                              <div style={{ marginTop: 14 }}>
                                <div style={{ background: "#E1705508", border: "1px solid #E1705520", borderRadius: 8, padding: "10px 14px" }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#E17055", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Résultat RCI</div>
                                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                                    <div style={{ flex: 1, background: "#E1705515", borderRadius: 7, padding: "10px 12px" }}>
                                      <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Mensuelle brute</div>
                                      <div style={{ fontSize: 20, fontWeight: 700, color: "#E17055" }}>{rciResult.python_output.pension_mensuelle_brute?.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</div>
                                    </div>
                                    <div style={{ flex: 1, background: "#fffaf8", borderRadius: 7, padding: "10px 12px", border: "1px solid #E1705510" }}>
                                      <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Annuelle brute</div>
                                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>{rciResult.python_output.pension_annuelle_brute?.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} €</div>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {[
                                      ["Nb points total", rciResult.python_output.nb_points_total?.toLocaleString("fr-FR")],
                                      ["Valeur du point", `${rciResult.python_output.valeur_point} €`],
                                    ].map(([label, val]) => (
                                      <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderBottom: "1px solid #E1705510", paddingBottom: 4 }}>
                                        <span style={{ color: "#666" }}>{label}</span>
                                        <span style={{ fontWeight: 700, color: "#1a1a2e" }}>{val}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ── Calculer CIPAV ── */}
                          <div style={{ marginTop: 12, padding: "12px 14px", background: carriereValidee ? "#f9f1fc" : "#fafafa", borderRadius: 9, border: `1px solid ${carriereValidee ? "#9B59B630" : "#e8e8e8"}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 16 }}>🏥</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>Calcul pension CIPAV</span>
                              {!carriereValidee && (
                                <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "#E1705515", color: "#E17055", fontWeight: 700 }}>Validez d'abord la carrière</span>
                              )}
                            </div>
                            {cipavLoading && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9B59B6" }}>
                                <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid #9B59B640", borderTop: "2px solid #9B59B6", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                Calcul CIPAV en cours…
                              </div>
                            )}
                            {cipavError && (
                              <div style={{ marginTop: 8, fontSize: 12, color: "#D63031", background: "#D6303110", padding: "6px 10px", borderRadius: 5 }}>
                                ⚠ {cipavError}
                              </div>
                            )}
                            {/* Résultat CIPAV */}
                            {cipavResult && cipavResult.python_output && (
                              <CipavResult po={cipavResult.python_output} />
                            )}
                          </div>
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
                          <div style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>{panel.desc}</div>

                          {/* Données de calcul */}
                          <div style={{ background: "#F7F6F3", border: "1px solid #e8e8e8", borderRadius: 9, padding: "10px 14px", marginBottom: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>📊 Données de calcul</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", fontSize: 12 }}>
                              {[
                                ["SAMB Assurance Retraite / CNAV", "32 586 €", "#1a1a2e"],
                                ["Points ARRCO-AGIRC au 31/12/25", "28 330 pts", "#0984E3"],
                                ["Projection jusqu'au départ", "+ 344 pts / an", "#00B894"],
                                ["Situation jusqu'au départ", "Poursuite d'activité actuelle", "#555"],
                              ].map(([label, val, color]) => (
                                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #eee" }}>
                                  <span style={{ color: "#555" }}>{label}</span>
                                  <span style={{ fontWeight: 700, color, fontSize: 12 }}>{val}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Auto-generated dates from dispositifs */}
                          {activatedDispositifs.length > 0 && showAutoResults && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#00B894", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                                <span>🤖</span> Dates calculées automatiquement depuis les dispositifs activés
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {MOCK_AUTO_DATES.map((d, i) => (
                                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: `${d.color}08`, borderLeft: `3px solid ${d.color}` }}>
                                    <div style={{ textAlign: "center", minWidth: 70 }}>
                                      <div style={{ fontSize: 15, fontWeight: 700, color: d.color }}>{d.date}</div>
                                      <div style={{ fontSize: 12, color: "#555" }}>{d.age}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 13, fontWeight: 600 }}>Via : {d.source}</div>
                                      <div style={{ fontSize: 12, color: "#666" }}>{d.detail}</div>
                                    </div>
                                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: `${d.color}18`, color: d.color, fontWeight: 700 }}>Auto</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {activatedDispositifs.length === 0 && (
                            <div style={{ padding: "16px", textAlign: "center", color: "#555", fontSize: 13, background: "#fafafa", borderRadius: 8, marginBottom: 14 }}>
                              💡 Activez d'abord des dispositifs (étape 2) pour que l'IA calcule automatiquement les dates de départ possibles
                            </div>
                          )}

                          {/* Standard dates always available */}
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0984E3", marginBottom: 8 }}>Dates standard :</div>
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
                                    <div style={{ flex: 1, fontSize: 13, fontWeight: sel ? 700 : 600, color: sel ? panel.color : "#333", textDecoration: isExcluded ? "line-through" : "none" }}>{action.label}</div>
                                    {action.auto && (
                                      <span
                                        onClick={(e) => { e.stopPropagation(); setExcludedDates((prev) => prev.includes(action.id) ? prev.filter((x) => x !== action.id) : [...prev, action.id]); }}
                                        title={isExcluded ? "Réactiver ce calcul" : "Exclure ce calcul"}
                                        style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: isExcluded ? "#E1705525" : "#0984E312", color: isExcluded ? "#C0392B" : "#0984E3", fontWeight: 700, flexShrink: 0, cursor: "pointer" }}>
                                        {isExcluded ? "✕ Exclu" : "✓ Calculé"}
                                      </span>
                                    )}
                                  </div>
                                  {dateComments[action.id] && (
                                    <div style={{ fontSize: 11, color: "#555", paddingLeft: 22, lineHeight: 1.5 }}>
                                      {isDateLibre && sel ? "→ Saisir dans le Système prompt IA ↓" : dateComments[action.id]}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
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
                          <div style={{ fontSize: 13, color: "#555", marginBottom: 14 }}>{panel.desc}</div>

                          <div className="simu-livrables-grid">
                            {panel.actions.map((action) => {
                              const sel = selectedAction?.id === action.id;
                              return (
                                <button key={action.id} onClick={() => { setSelectedAction(sel ? null : action); setExecuted(null); }} style={{ padding: "16px 14px", borderRadius: 10, border: `2px solid ${sel ? panel.color : "#e8e8e8"}`, background: sel ? `${panel.color}08` : "#fafafa", cursor: "pointer", textAlign: "center", transition: "all 0.12s" }}>
                                  <span style={{ fontSize: 28, display: "block", marginBottom: 6 }}>{action.icon}</span>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: sel ? panel.color : "#333", marginBottom: 4 }}>{action.label}</div>
                                  <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>{action.desc}</div>
                                  <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 10, background: `${panel.color}12`, color: panel.color, fontWeight: 700 }}>{action.pages}</span>
                                </button>
                              );
                            })}
                          </div>

                          {selectedAction && (
                            <div style={{ marginTop: 14, borderTop: "1px solid #eee", paddingTop: 14 }}>
                              <div style={{ background: "#F0EDFF", borderRadius: 7, padding: 10, marginBottom: 10, border: "1px solid #6C5CE720" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#6C5CE7", marginBottom: 3 }}>📝 PROMPT STRICT :</div>
                                <div style={{ fontSize: 12, color: "#333", lineHeight: 1.6, ...S.mono }}>
                                  [Prompt calibré pour "{selectedAction.label}" — intègre tous les dispositifs activés ({activatedDispositifs.length}), les dates calculées, les résultats automatiques (surcote, minimum contributif, majoration enfants). Niveau de détail : {selectedAction.pages}]
                                </div>
                              </div>
                              <button onClick={() => setExecuted(selectedAction)} style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: panel.color, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>▶ Générer le {selectedAction.label.toLowerCase()}</button>
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
                          <span style={{ fontSize: 12, color: "#555" }}>— {panel.actions.length} actions disponibles</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#555", marginBottom: 14 }}>{panel.desc}</div>
                        {/* Thematic analysis vignettes */}
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 8 }}>Thématiques d'analyse</div>
                        <div className="simu-action-grid simu-action-grid--analyse">
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
                                  <div style={{ fontSize: 13, fontWeight: sel ? 700 : 600, color: sel ? panel.color : ok ? "#333" : "#999" }}>{action.label}</div>
                                  <div style={{ fontSize: 11, color: "#555" }}>{action.desc}</div>
                                  {!ok && <div style={{ fontSize: 10, color: "#D63031", marginTop: 1 }}>⚠ Manque : {miss.map((m) => DOC_TYPES.find((d) => d.id === m)?.label).join(", ")}</div>}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {selectedAction && (
                          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#6C5CE708", borderRadius: 7, border: "1px solid #6C5CE720" }}>
                            <span style={{ fontSize: 15 }}>{selectedAction.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#6C5CE7" }}>{selectedAction.label}</span>
                            <span style={{ fontSize: 11, color: "#555", marginLeft: "auto" }}>↓ Prompt chargé ci-dessous</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Système prompt IA */}
              <div style={{ ...S.card, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>💬 {
                  expandedPanel === "analyse" ? "Analyse de documents"
                  : expandedPanel === "dispositifs" ? "Demande complémentaire"
                  : expandedPanel === "dates" ? "Autres dates"
                  : "Système prompt IA"
                }</div>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>En complément des actions structurées — l'IA reformule et mappe vers les étapes du flux</div>
                <style>{`.sim-readable-placeholder::placeholder { color: #666 !important; opacity: 1; } .sim-readable-placeholder::-webkit-input-placeholder { color: #666 !important; } .sim-readable-placeholder::-moz-placeholder { color: #666 !important; opacity: 1; }`}</style>
                <textarea
                  className="sim-readable-placeholder"
                  readOnly={!commentairesMode}
                  value={promptText}
                  onChange={(e) => commentairesMode && setPromptText(e.target.value)}
                  placeholder="Sélectionnez une analyse ci-dessus ou saisissez une instruction libre…"
                  style={{ width: "100%", padding: "9px 11px", borderRadius: 7, border: `1px solid ${commentairesMode ? "#6C5CE7" : "#ddd"}`, fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 60, boxSizing: "border-box", background: commentairesMode ? "#FDFCFF" : "#fafafa", color: "#333" }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setCommentairesMode(!commentairesMode)}
                    style={{ padding: "8px 14px", borderRadius: 7, border: "1px solid #6C5CE7", background: commentairesMode ? "#6C5CE712" : "transparent", color: "#6C5CE7", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    ✏️ {commentairesMode ? "Fermer" : "Ajouter du contexte"}
                  </button>
                  <button
                    onClick={handleGenerateDoc}
                    disabled={isGenerating}
                    style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: isGenerating ? "#a29bfe" : "linear-gradient(135deg, #6C5CE7, #a29bfe)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: isGenerating ? "wait" : "pointer", opacity: isGenerating ? 0.7 : 1 }}>
                    {isGenerating ? "⏳ Analyse en cours…" : "▶ Exécuter"}
                  </button>
                </div>
                {executed && executed.resultUrl && (
                  <div style={{ background: "#F8FFF8", borderRadius: 7, padding: 10, marginTop: 10, border: "1px solid #00B89420" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#00B894", marginBottom: 4 }}>✅ Rapport généré :</div>
                    <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
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
              <div style={{ color: "#FFEAA7", fontSize: 12, marginTop: 2 }}>Règles métier · Paramètres annuels · Formules · Prompts · Architecture</div>
            </div>
            <div style={{ fontSize: 12, color: "#fff", background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>🔐 Accès administrateur</div>
          </div>

          <div className="simu-admin-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {Object.entries(ADMIN_SECTIONS).map(([key, sec]) => (
                <button key={key} onClick={() => { setAdminSection(key); setExpandedRule(null); setExpandedParam(null); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, border: `2px solid ${adminSection === key ? sec.color : "transparent"}`, background: adminSection === key ? `${sec.color}10` : "#fff", cursor: "pointer", textAlign: "left", boxShadow: adminSection === key ? `0 2px 8px ${sec.color}20` : "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <span style={{ fontSize: 18 }}>{sec.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: adminSection === key ? sec.color : "#333" }}>{sec.label}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{sec.items?.length ? `${sec.items.length} éléments` : sec.desc}</div>
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
                    <span style={{ fontSize: 12, color: "#555" }}>— Fichiers .md + liens législation officielle</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {ADMIN_SECTIONS.regles.items.map((rule, i) => {
                      const hasMd = !!rule.contentKey && !!MD_CONTENT[rule.contentKey];
                      return (
                        <div key={rule.id} style={{ borderRadius: 8, border: `1px solid ${expandedRule === i ? "#6C5CE730" : "#eee"}`, overflow: "hidden" }}>
                          <div onClick={() => setExpandedRule(expandedRule === i ? null : i)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", cursor: "pointer", background: expandedRule === i ? "#6C5CE706" : "#fafafa" }}>
                            <span style={{ fontSize: 16 }}>{rule.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 600 }}>{rule.label}</div>
                              <div style={{ fontSize: 12, color: "#555" }}>{rule.desc}</div>
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                              {hasMd
                                ? <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "#6C5CE712", color: "#6C5CE7", fontWeight: 600 }}>📄 {rule.file}</span>
                                : <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "#D6303115", color: "#D63031", fontWeight: 600 }}>⚠ Fichier manquant</span>
                              }
                              {rule.officialUrl && (
                                <a href={rule.officialUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                                  <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "#0984E312", color: "#0984E3", fontWeight: 600 }}>🔗 Officiel</span>
                                </a>
                              )}
                            </div>
                          </div>
                          {expandedRule === i && (
                            <div style={{ padding: "10px 12px", borderTop: "1px solid #eee", background: "#fff" }}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {hasMd ? (
                                  <button
                                    onClick={() => setModal({ title: MD_CONTENT[rule.contentKey].title, content: MD_CONTENT[rule.contentKey].content, lines: MD_CONTENT[rule.contentKey].lines, color: "#6C5CE7" })}
                                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #6C5CE7", background: "#6C5CE708", color: "#6C5CE7", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                    📄 Ouvrir {rule.file}
                                  </button>
                                ) : (
                                  <span style={{ fontSize: 12, color: "#D63031", padding: "6px 0" }}>⚠ Fichier MD à créer dans 01_REGLEMENTATION/</span>
                                )}
                                {rule.officialUrl && (
                                  <a href={rule.officialUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                                    <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #0984E3", background: "#0984E308", color: "#0984E3", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>🔗 Site officiel</button>
                                  </a>
                                )}
                                <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #00B894", background: "#00B89408", color: "#00B894", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>✏️ Éditer</button>
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
                    <span style={{ fontSize: 12, padding: "3px 8px", borderRadius: 5, background: "#E1705515", color: "#E17055", fontWeight: 700 }}>⚠ À mettre à jour chaque année</span>
                  </div>
                  <div className="simu-params-grid">
                    {ADMIN_SECTIONS.parametres.items.map((param, i) => (
                      <div key={param.id} onClick={() => setExpandedParam(expandedParam === i ? null : i)} style={{ borderRadius: 8, border: `1px solid ${expandedParam === i ? "#0984E330" : "#eee"}`, padding: "10px 12px", cursor: "pointer", background: expandedParam === i ? "#0984E306" : "#fafafa" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                            <span style={{ fontSize: 14 }}>{param.icon}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{param.label}</div>
                              <div style={{ fontSize: 11, color: "#555" }}>{param.desc}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#0984E3" }}>{param.value}</div>
                            <div style={{ fontSize: 11, color: "#555" }}>{param.year}{param.maj ? ` · màj ${param.maj}` : ""}</div>
                          </div>
                        </div>

                        {/* CSG : tableau taux */}
                        {param.csgDetail && expandedParam === i && (
                          <div className="simu-table-wrap" style={{ marginTop: 7 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
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
                            <button style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid #E17055", background: "#E1705508", color: "#E17055", fontWeight: 600, cursor: "pointer" }}>✏️ Modifier</button>
                            <button style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid #888", background: "#88888808", color: "#555", fontWeight: 600, cursor: "pointer" }}>📜 Historique</button>
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
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#00B894" }}>{f.label}</span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'IBM Plex Mono', 'Courier New', monospace", background: "#fff", borderRadius: 5, padding: "8px 10px", border: "1px solid #00B89420", marginBottom: 4 }}>{f.formula}</div>
                        <div style={{ fontSize: 12, color: "#666" }}>{f.desc}</div>
                        <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                          <button style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid #00B894", background: "transparent", color: "#00B894", fontWeight: 600, cursor: "pointer" }}>📜 Règle</button>
                          <button style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid #0984E3", background: "transparent", color: "#0984E3", fontWeight: 600, cursor: "pointer" }}>📐 Paramètres</button>
                          <button style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid #E17055", background: "transparent", color: "#E17055", fontWeight: 600, cursor: "pointer" }}>✏️ Éditer</button>
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
                    <span style={{ fontSize: 12, color: "#555" }}>— {apiSkills.length} fichiers · {ADMIN_SKILL_PROMPTS.filter(p => p.missing).length} manquants</span>
                  </div>

                  {/* Vignette System Prompt — fondation du moteur IA */}
                  <div style={{ borderRadius: 9, padding: "12px 14px", background: "linear-gradient(135deg, #f9f0ff 0%, #fff 100%)", border: "1.5px solid #6C3483", borderLeft: "4px solid #6C3483", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(108, 52, 131, 0.08)" }}>
                    <span style={{ fontSize: 22 }}>⚙️</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#6C3483" }}>EOR SystemPrompt — Moteur Analyse Réglementaire</span>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: "#6C348315", color: "#6C3483", fontWeight: 700, letterSpacing: "0.04em" }}>SYSTEM PROMPT</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#666", lineHeight: 1.4 }}>
                        Instructions fondamentales du moteur IA. Définit le rôle, les règles métier et les contraintes applicables à tous les skills. Chargé par N8N avant chaque exécution.
                      </div>
                    </div>
                    <button
                      onClick={openSystemPromptEditor}
                      style={{ fontSize: 12, padding: "7px 13px", borderRadius: 5, border: "1px solid #6C3483", background: "#6C3483", color: "#fff", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      Éditer
                    </button>
                  </div>


                  {/* Workflow principal — inchangé, lit ADMIN_SKILL_PROMPTS */}
                  {["Workflow principal"].map((cat) => {
                    const items = ADMIN_SKILL_PROMPTS.filter(p => p.category === cat);
                    return (
                      <div key={cat} style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid #eee" }}>
                          {cat}
                        </div>
                        <div className="simu-prompts-grid">
                          {items.map((skill) => {
                            const hasContent = !!skill.contentKey && !!MD_CONTENT[skill.contentKey];
                            return (
                              <div key={skill.id} style={{ borderRadius: 7, padding: "9px 11px", background: "#fff", border: "1px solid #e0e0e0", borderLeft: `3px solid ${skill.color}` }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                                  <span style={{ fontSize: 14 }}>{skill.icon}</span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: skill.color, flex: 1 }}>{skill.label}</span>
                                </div>
                                <div style={{ display: "flex", gap: 4 }}>
                                  {hasContent ? (
                                    <button
                                      onClick={() => setModal({ title: MD_CONTENT[skill.contentKey].title, content: MD_CONTENT[skill.contentKey].content, lines: MD_CONTENT[skill.contentKey].lines, color: skill.color })}
                                      style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: `1px solid ${skill.color}`, background: `${skill.color}08`, color: skill.color, fontWeight: 700, cursor: "pointer" }}>
                                      👁 Voir le prompt
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: 11, color: "#D63031" }}>Fichier manquant</span>
                                  )}
                                  <button
                                    onClick={skill.id === "sk_prompt1" ? openPreentretienEditor : undefined}
                                    style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid #888", background: "transparent", color: "#555", fontWeight: 600, cursor: skill.id === "sk_prompt1" ? "pointer" : "default" }}>
                                    ✏️ Éditer
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Skills N8N — dynamique depuis /v1/skills */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid #eee" }}>
                      Skills N8N {apiSkillsLoading && "(chargement…)"} {!apiSkillsLoading && `— ${apiSkills.length} skills`}
                    </div>
                    <div className="simu-prompts-grid">
                      {apiSkills.map((skill) => (
                        <div key={skill.id} style={{ borderRadius: 7, padding: "9px 11px", background: "#fff", border: "1px solid #e0e0e0", borderLeft: "3px solid #0984E3" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                            <span style={{ fontSize: 14 }}>🧩</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#0984E3", flex: 1 }}>{skill.nom}</span>
                            <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "#0984E315", color: "#0984E3", fontWeight: 700 }}>{skill.code}</span>
                          </div>
                          {skill.description && (
                            <div style={{ fontSize: 11, color: "#666", marginBottom: 5, lineHeight: 1.3 }}>{skill.description}</div>
                          )}
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              onClick={() => setEditSkillCode(skill.code)}
                              style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: "1px solid #0984E3", background: "#0984E308", color: "#0984E3", fontWeight: 700, cursor: "pointer" }}>
                              ✏️ Éditer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Manquants — à créer */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#D63031", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid #D6303120" }}>
                      ⚠ Manquants — à créer
                    </div>
                    <div className="simu-prompts-grid">
                      {ADMIN_SKILL_PROMPTS.filter(p => p.category === "Manquants — à créer").map((skill) => (
                        <div key={skill.id} style={{ borderRadius: 7, padding: "9px 11px", background: "#fafafa", border: "1px solid #f0f0f0", borderLeft: "3px solid #ddd", opacity: 0.6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                            <span style={{ fontSize: 14 }}>{skill.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#aaa", flex: 1 }}>{skill.label}</span>
                            <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "#D6303115", color: "#D63031", fontWeight: 700 }}>À créer</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Créer un nouveau skill */}
                  <div style={{ marginTop: 14, textAlign: "center" }}>
                    <button
                      onClick={() => setCreateSkillOpen(true)}
                      style={{ fontSize: 13, padding: "8px 18px", borderRadius: 6, border: "1.5px dashed #00B894", background: "#00B89408", color: "#00B894", fontWeight: 700, cursor: "pointer" }}>
                      + Créer un nouveau skill
                    </button>
                  </div>
                </div>
              )}

              {/* REGISTRE D'ERREURS */}
              {adminSection === "registre" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>📚</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#D63031" }}>Registre d'erreurs</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>Règles Gate #2 — chaque erreur capturée bloque automatiquement les calculs incohérents</div>

                  {/* Stats */}
                  <div className="simu-auto-results-strip" style={{ marginBottom: 16 }}>
                    {[
                      { label: "Règles actives", val: REGISTRE_ERREURS.length, color: "#D63031" },
                      { label: "Règles archivées", val: 0, color: "#555" },
                      { label: "Dernière màj", val: "06/11/2025", color: "#555" },
                    ].map((s) => (
                      <div key={s.label} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "#fafafa", border: "1px solid #eee", textAlign: "center" }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
                        <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Liste des règles */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#D63031", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>🔴 Règles actives (Gate #2)</div>
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
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: "#D63031", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>🔴 {r.id}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", flex: 1 }}>{r.title}</span>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: "#555" }}>{r.date}</span>
                            <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 3, background: "#D6303110", color: "#D63031", fontWeight: 700 }}>CRITIQUE</span>
                            <span style={{ fontSize: 11, color: "#6C5CE7" }}>👁 Voir →</span>
                          </div>
                        </button>
                        {/* Aperçu condition */}
                        <div style={{ padding: "0 13px 8px 13px", borderTop: "1px solid #f5f5f5" }}>
                          <code style={{ fontSize: 11, color: "#555", background: "#f5f5f5", padding: "3px 7px", borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace" }}>{r.condition}</code>
                          <span style={{ fontSize: 11, color: "#555", marginLeft: 8 }}>{r.erreur}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bouton ajouter */}
                  <button style={{ marginTop: 12, width: "100%", padding: "9px 0", borderRadius: 8, border: "2px dashed #D6303140", background: "transparent", color: "#D63031", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    + Ajouter une règle (PROMPT 3)
                  </button>
                </div>
              )}

              {/* FLUX */}
              {adminSection === "flux" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                    <span style={{ fontSize: 18 }}>🔀</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#D63031" }}>Flux & Architecture</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {[
                      { s: "1", t: "Analyse documents", d: "5 rapprochements RIS — caisse, paie, France Travail, étranger, fonctionnaire (Ircantec)", c: "#6C5CE7" },
                      { s: "2", t: "Carrière", d: "Données carrière validées par le consultant — 5 régimes : CNAV, AGIRC-ARRCO, CIPAV, IRCANTEC, RCI", c: "#E17055" },
                      { s: "3", t: "Scénarios", d: "9 dispositifs activables : RACL, VPLR (incomplet/études), progressive, cumul, chômage ind./non ind., arrêt, cotisations min.", c: "#00B894" },
                      { s: "4", t: "Dates & Simulations", d: "4 scénarios : âge légal, taux plein (durée), taux plein auto 67 ans, date(s) libre(s)", c: "#0984E3" },
                      { s: "5", t: "Livrables", d: "Rapport consultation (~1p), Simulation retraite (~1p), Audit retraite (~30p)", c: "#D63031" },
                    ].map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 36 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: step.c, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, boxShadow: `0 2px 8px ${step.c}30` }}>{step.s}</div>
                          {i < 4 && <div style={{ width: 2, height: 20, background: step.c, margin: "2px 0", opacity: 0.3 }} />}
                        </div>
                        <div style={{ background: "#fff", borderRadius: 11, boxShadow: "0 1px 5px rgba(0,0,0,0.05)", padding: "10px 14px", flex: 1 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: step.c }}>{step.t}</span>
                          <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{step.d}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 16, padding: "10px 12px", background: "#f8f8f8", borderRadius: 8, border: "1px solid #eee" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>🔄 Résultats automatiques intégrés à chaque simulation :</div>
                    <div className="simu-auto-results-strip">
                      {AUTO_RESULTS.map((ar) => (
                        <div key={ar.id} style={{ flex: 1, padding: "6px 8px", borderRadius: 6, background: `${ar.color}06`, border: `1px solid ${ar.color}15`, fontSize: 12 }}>
                          <span>{ar.icon}</span> <strong style={{ color: ar.color }}>{ar.label}</strong> — {ar.desc.split(".")[0]}.
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 16, background: "#1a1a2e", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 10 }}>🔧 Architecture du moteur</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr 40px 1fr", alignItems: "center" }}>
                      <div style={{ background: "#6C5CE720", borderRadius: 8, padding: 10, border: "1px solid #6C5CE740" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#a29bfe", marginBottom: 3 }}>📜 Règles .md</div>
                        <div style={{ fontSize: 11, color: "#555" }}>12 fichiers règles métier</div>
                      </div>
                      <div style={{ textAlign: "center", color: "#555", fontSize: 16 }}>→</div>
                      <div style={{ background: "#E1705520", borderRadius: 8, padding: 10, border: "1px solid #E1705540" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#E17055", marginBottom: 3 }}>🤖 Moteur IA</div>
                        <div style={{ fontSize: 11, color: "#ccc" }}>Prompt + Règles + Paramètres + Formules</div>
                      </div>
                      <div style={{ textAlign: "center", color: "#ccc", fontSize: 16 }}>→</div>
                      <div style={{ background: "#00B89420", borderRadius: 8, padding: 10, border: "1px solid #00B89440" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#00B894", marginBottom: 3 }}>📊 Résultats</div>
                        <div style={{ fontSize: 11, color: "#ccc" }}>+ surcote, min. contributif, majo. enfants</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <div style={{ background: "#0984E320", borderRadius: 8, padding: 8, border: "1px solid #0984E340" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#0984E3" }}>📐 19 paramètres annuels</div>
                        <div style={{ fontSize: 11, color: "#ccc" }}>PASS, SMIC, points, taux cotis. T1/T2, appel 127%, CSG…</div>
                      </div>
                      <div style={{ background: "#00B89420", borderRadius: 8, padding: 8, border: "1px solid #00B89440" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#00B894" }}>🧮 8 formules de calcul</div>
                        <div style={{ fontSize: 11, color: "#ccc" }}>Pension CNAV, décote, surcote, SAM, points AGIRC-ARRCO…</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "flex-end", borderTop: "1px solid #ccc", marginTop: 24 }}>
        <button
          onClick={() => setReportOpen(true)}
          style={{ fontSize: 14, color: "#E17055", background: "#fff", border: "1px solid #E17055", borderRadius: 6, padding: "6px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, transition: "all 0.2s ease" }}
          onMouseOver={e => { e.currentTarget.style.background = "#E17055"; e.currentTarget.style.color = "#fff"; }}
          onMouseOut={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#E17055"; }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span style={{ paddingTop: 1 }}>Signaler une erreur</span>
        </button>
      </div>

      {/* Modal Signaler une erreur */}
      {reportOpen && (
        <div onClick={() => setReportOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#D25F45" }}>Signaler une erreur</div>
                <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>Un calcul incorrect, un affichage anormal, une donnée manquante…</div>
              </div>
              <button onClick={() => setReportOpen(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#555" }}>✕</button>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 13, color: "#333", fontWeight: 600, marginBottom: 8 }}>Section concernée :</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {["Carrière", "Dispositifs", "Dates & Simulations", "Livrables", "Analyse documents", "Autre"].map(s => (
                  <button key={s} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 5, border: "1px solid #ccc", background: "#fdfdfd", color: "#444", cursor: "pointer", transition: "all 0.15s ease" }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = "#6C5CE7"; e.currentTarget.style.color = "#6C5CE7"; e.currentTarget.style.background = "#fff"; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = "#ccc"; e.currentTarget.style.color = "#444"; e.currentTarget.style.background = "#fdfdfd"; }}>
                    {s}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 13, color: "#333", fontWeight: 600, marginBottom: 8 }}>Description :</div>
              <textarea
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                placeholder="Décrivez l'erreur constatée…"
                style={{ width: "100%", padding: "9px 11px", color: "#444", borderRadius: 8, border: "1px solid #ccc", fontSize: 13, fontFamily: "inherit", resize: "vertical", minHeight: 90, boxSizing: "border-box", outline: "none", lineHeight: 1.6 }} />
            </div>
            <div style={{ padding: "12px 18px", borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setReportOpen(false)} style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid #ccc", background: "#fafafa", color: "#444", fontSize: 13, cursor: "pointer" }}>Annuler</button>
              <button onClick={() => { setReportOpen(false); setReportText(""); }} style={{ padding: "7px 18px", borderRadius: 7, border: "none", background: "#E17055", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Envoyer</button>
            </div>
          </div>
        </div>
      )}

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

      <SkillEditModal
        isOpen={!!editSkillCode}
        skillCode={editSkillCode}
        onClose={() => setEditSkillCode(null)}
        onSaved={() => fetchApiSkills()}
      />
      <SkillCreateModal
        isOpen={createSkillOpen}
        onClose={() => setCreateSkillOpen(false)}
        onCreated={() => fetchApiSkills()}
        existingTypes={[...new Set(apiSkills.map((s) => s.type))].filter(Boolean)}
      />
      <SweetAlert
        warning
        showCancel
        confirmBtnText="Réinitialiser"
        confirmBtnBsStyle="danger"
        cancelBtnText="Annuler"
        cancelBtnBsStyle="primary"
        title="Réinitialiser la carrière ?"
        show={showResetConfirm}
        onConfirm={doResetCarriere}
        onCancel={() => setShowResetConfirm(false)}
      >
        Les données importées seront supprimées définitivement.
      </SweetAlert>
    </div>
  );

}
