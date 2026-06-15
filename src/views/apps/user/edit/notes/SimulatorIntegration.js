/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Dropzone from "react-dropzone";
import "../../../../../assets/scss/plugins/extensions/dropzone.scss";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, UncontrolledTooltip, Input, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";
import { DownloadCloud, Eye, Download, Edit2, Save, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Trash2, Menu, MessageSquare, X as XIcon } from "react-feather";
import ReportChatPanel from "./ReportChatPanel";
import HtmlDiffPreview from "./HtmlDiffPreview";
import VersionHistoryDropdown from "./VersionHistoryDropdown";
import RegistreErreurs from "./RegistreErreurs";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { parseNIR } from "./utils";
import { parseCarrierePoints } from "./carrierePoints";
import { REGIMES, getPoints, resolveRegime, computeVisibleRegimes, REGIMES_SIMPLES, extractRegimeSimplePoints } from "../simulatorRegimes";
import { executeScript, executeSkillGeneric, executeRaclScenario, executeRpScenario, executeCerScenario, executeTnsScenario, executeChomageIndScenario, executeChomageNonIndScenario, executeArretActiviteScenario, executeVplrScenario, fetchLatestReport, saveSkillResult, fetchSkillsList, fetchRISAnalysisV6, fetchChosenScenarios, saveChosenScenarios, fetchChosenDates, saveChosenDates, updateSimulationHtml, detectDocumentType, fetchRapprochementConstat, applyReportChatMessage, fetchPromptNotes, savePromptNote, deletePromptNote } from "../risService";
import { calculateArrco, calculateIrcantec, calculateRci, computeSAMB, computeDateLegale, computeDateTauxPlein, computeDate67, computeAutoDateFromDispositif, computeTrimAtDate, sumTrimestresCapped, parseBirthDate } from '../../../../../utils/calculators';
import api from "../../../../../services/api";
import SkillEditModal from "./SkillEditModal";
import SkillCreateModal from "./SkillCreateModal";
import AdminEngineChat from "./AdminEngineChat";
import DateInputFR from "../DateInputFR";
import SweetAlert from "react-bootstrap-sweetalert";
import MD_CONTENT from "./adminSkillsContent";
import { buildRecapRegimes, buildCipavRecap } from "./recapCarriere";
import { RegimeRecapVignettes } from "./RecapCarriereParRegime";
import BaremeRetraitePage from "../../../bareme-retraite";
import { coeffRevalo, initBareme } from "../simulatorData";
import {
  parseBirthYear,
  computeTargetYear,
  findLastRealYear,
  findLastRealSalary,
  reconcileProjection,
  resolveProjectionTargetYear,
  PROJECTION_MODES,
  computeRealAssuranceTotals,
} from "./careerProjection";
import CalculDataPanel from "./CalculDataPanel";

// ─── DATA ───────────────────────────────────────────────────────────────────

const ACTION_PANELS = {
  carriere: {
    label: "Carrière", icon: "📂", color: "#7367f0", order: 1,
    navCount: "5 régimes",
    desc: "Données carrière par régime — validation consultant avant simulation",
    actions: [],
  },
  dispositifs: {
    label: "Scénarios & dates", icon: "🔧", color: "#7367f0", order: 2,
    desc: "Activez les dispositifs applicables — l'IA en déduit les dates de départ possibles",
    actions: [
      { id: "racl", label: "Carrière longue (RACL)", icon: "⏩", requires: ["ris"], desc: "Départ anticipé si début activité avant 16/18/20/21 ans", generates_date: true },
      { id: "rachat_vplr", label: "Rachat VPLR", icon: "🧩", requires: ["ris"], hasInput: true, inputType: "number", inputLabel: "Nombre de trimestres à racheter", desc: "Rachat de trimestres (études sup. + années incomplètes) — plafond légal 12 trim." },
      { id: "retraite_progressive", label: "Retraite progressive", icon: "⚖️", requires: ["ris"], desc: "Temps partiel + pension partielle dès âge légal −2 ans", generates_date: true, hasInput: true, inputType: "number", inputLabel: "Quotité activité (%)" },
      { id: "cumul_emploi", label: "Cumul emploi-retraite", icon: "🔄", requires: ["ris"], desc: "Liquidation puis reprise d'activité, 2e pension (réforme 2023)", generates_date: true },
      { id: "chomage_ind", label: "Chômage indemnisé", icon: "📉", requires: ["ris"], hasInput: true, inputType: "number", inputLabel: "Durée (mois)", desc: "Trim. assimilés, impact sur date taux plein", generates_date: true },
      { id: "chomage_non_ind", label: "Chômage non indemnisé", icon: "⚠️", requires: ["ris"], desc: "Limites spécifiques, exception +55 ans / 20 ans cotisation", generates_date: true },
      { id: "arret_activite", label: "Arrêt d'activité", icon: "🛑", requires: ["ris"], hasInput: true, inputType: "date", inputLabel: "Date arrêt", desc: "Cessation totale, droits figés, décote", generates_date: true },
      { id: "cotisations_min", label: "Cotisations minimales (TI/TNS)", icon: "💰", requires: ["ris"], desc: "Maintien validation 4 trim./an avec revenu minimal" },
    ]
  },
  livrables: {
    label: "Livrables", icon: "📋", color: "#7367f0", order: 3,
    desc: "Générer le document final — mêmes calculs, niveaux de détail différents",
    actions: [
      { id: "rapport_consultation", label: "Rapport de consultation retraite", icon: "📄", requires: ["ris"], desc: "Synthèse 1 page — entretien client", pages: "~1 page" },
      { id: "simulation_retraite", label: "Simulation retraite", icon: "📊", requires: ["ris"], desc: "Tableaux détaillés — scénarios comparés", pages: "~1 page" },
      { id: "audit_retraite", label: "Audit retraite", icon: "📚", requires: ["ris"], desc: "Analyse complète régime par régime", pages: "~30 pages" },
    ]
  },
};


// Mapping dispositif UI id → skill_code DB (null = pas de skill générique pour ce dispositif)
const SKILL_CODE_LABELS = {
  RACL: "CARRIÈRE LONGUE (RACL)",
  RP: "RETRAITE PROGRESSIVE",
  CER: "CUMUL EMPLOI-RETRAITE",
  VPLR: "RACHAT VPLR",
  "RETRAITE PROGRESSIVE": "RETRAITE PROGRESSIVE",
  "CUMUL EMPLOI RETRAITE": "CUMUL EMPLOI RETRAITE",
  CHOMAGE_INDEMNISE: "CHÔMAGE INDEMNISÉ",
  CHOMAGE_NON_INDEMNISE: "CHÔMAGE NON INDEMNISÉ",
  ARRET_ACTIVITE: "ARRÊT D'ACTIVITÉ",
  COTISATIONS_MIN: "COTISATIONS MINIMALES (TI/TNS)",
  // Anciens codes conservés pour rétro-compat (rapports déjà stockés en DB)
  VPLR_INCOMPLETE: "RACHAT VPLR (ANNÉE INCOMPLÈTE)",
  VPLR_ETUDE: "RACHAT VPLR (ANNÉE D'ÉTUDE)",
};

const DISPOSITIF_TO_SKILL_CODE = {
  racl: "RACL",
  rachat_vplr: "VPLR",
  retraite_progressive: "RP",
  cumul_emploi: "CER",
  chomage_ind: "CHOMAGE_INDEMNISE",
  chomage_non_ind: "CHOMAGE_NON_INDEMNISE",
  arret_activite: "ARRET_ACTIVITE",
  cotisations_min: "COTISATIONS_MIN",
  trimestres_etranger: "TRIMESTRES ETRANGER",
  reversion: "REVERSION",
};

// Auto-results that appear automatically in bilans (not buttons)
const AUTO_RESULTS = [
  { id: "surcote", label: "Surcote", icon: "📈", desc: "Calculée automatiquement si départ au-delà du taux plein. +1,25%/trimestre supplémentaire.", color: "#00B894" },
  { id: "minimum_contributif", label: "Minimum contributif", icon: "🔒", desc: "Éligibilité vérifiée automatiquement. Si pension < seuil et taux plein atteint → complément.", color: "#0984E3" },
  { id: "majoration_enfants", label: "Majoration enfants", icon: "👶", desc: "Appliquée automatiquement selon le nombre d'enfants renseigné. CNAV +10% si ≥3, AGIRC-ARRCO +10% à +30%.", color: "#E17055" },
];

// Mapping ADMIN_SECTIONS.regles.items[].id → skills_catalog.code
// Used by the "✏️ Éditer" button to open SkillEditModal with the right skill.
// Items absent from this map have no backend skill yet (the Edit button stays disabled,
// and we offer the "Créer le skill" CTA instead).
const RULE_ID_TO_SKILL_CODE = {
  cnav_base:   "CNAV",
  agirc_arrco: "COMPLEMENTAIRES",
  ircantec:    "COMPLEMENTAIRES",
  rci:         "COMPLEMENTAIRES",
  racl:        "RACL",
  vplr:        "VPLR",
  progressive: "RETRAITE_PROGRESSIVE",
  cumul:       "CUMUL_EMPLOI_RETRAITE",
  conventions: "TRIMESTRES_ETRANGER",
  // chomage, minimum, majorations → pas de skill seedé pour l'instant
};

const ADMIN_SECTIONS = {
  regles: {
    label: "Règles métier", icon: "📜", color: "#6C5CE7",
    items: [
      { id: "cnav_base", label: "Régime de base CNAV", icon: "🏛️", file: "circulaire_revalorisation_2025.md", contentKey: "cnav_base", officialUrl: "https://www.lassuranceretraite.fr/", desc: "Calcul pension, SAM, taux, durée d'assurance" },
      { id: "agirc_arrco", label: "AGIRC-ARRCO", icon: "📊", file: "REGIMES-COMPLEMENTAIRE-AGIRC_ARRCO.md", contentKey: "agirc_arrco", officialUrl: "https://www.agirc-arrco.fr/", desc: "Points, valeur de service, coefficients" },
      { id: "ircantec", label: "Ircantec", icon: "🏢", file: "SKILL_complementaires.md", contentKey: "ircantec", officialUrl: "https://www.ircantec.retraites.fr/", desc: "Points, calcul pension agents non titulaires" },
      { id: "rci", label: "RCI / SSI", icon: "📑", file: "circulaire_rci_2025.md", contentKey: "rci", officialUrl: "https://www.lassuranceretraite.fr/portail-info/hors-menu/annexe/travailleurs-independants/retraite-complementaire.html", desc: "Complémentaire indépendants, BIC/BNC" },
      { id: "racl", label: "Carrière longue (RACL)", icon: "⏩", file: "racl-regles-conditions.md", contentKey: "racl", officialUrl: "https://www.service-public.fr/particuliers/vosdroits/F13845", desc: "Conditions, seuils, trimestres retenus" },
      { id: "vplr", label: "Rachat VPLR", icon: "🧩", file: "circulaire_rachat_vplr_2025.md", contentKey: "vplr", officialUrl: "https://www.service-public.fr/particuliers/vosdroits/F15675", desc: "Barèmes, options taux/proratisation" },
      { id: "progressive", label: "Retraite progressive", icon: "⚖️", file: "SKILL_retraite_progressive.md", contentKey: "progressive", officialUrl: "https://www.lassuranceretraite.fr/portail-info/home/actif/je-souhaite-partir-plus-tot/retraite-progressive.html#:~:text=La%20retraite%20progressive%20permet%20de,plusieurs%20activit%C3%A9s%20%C3%A0%20temps%20partiel.", desc: "Conditions, fraction, quotité" },
      { id: "cumul", label: "Cumul emploi-retraite", icon: "🔄", file: "SKILL_cumul_emploi_retraite.md", contentKey: "cumul", officialUrl: "https://www.service-public.fr/particuliers/vosdroits/F13243", desc: "Intégral, plafonné, 2e pension réforme 2023" },
      { id: "chomage", label: "Chômage et retraite", icon: "📉", file: "SKILL_chomage.md", contentKey: "chomage", officialUrl: "https://www.francetravail.fr/candidat/mes-droits-aux-aides-et-allocati/a-chaque-situation-son-allocatio/quelle-est-ma-situation-personne/je-suis-proche-de-la-retraite.html", desc: "Assimilés, non indemnisé, exception +55 ans" },
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
  bareme: { label: "Barème retraite", icon: "📅", color: "#2D3436", desc: "Âge légal et trimestres requis par génération" },
};

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
    detected.rachat_vplr = `${incompletYears.length} année(s) incomplète(s) (${incompletYears.slice(0, 3).join(", ")}${incompletYears.length > 3 ? "…" : ""})`;
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

// ─── DONNÉES CARRIÈRE ───────────────────────────────────────────────────────

// Source unique des coefficients de revalorisation : `coeffRevalo` (simulatorData),
// alignée sur la Circulaire Cnav officielle. L'ancienne table locale REVALO_CNAV
// (dupliquée et divergente sur 2009-2011 + années < 1988) a été supprimée.


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

// Latest known PASS (plafond annuel SS). Projected future years cap salary here.
const PASS_LAST = PLAFONDS_SS[2026] || 0;

function _buildDefaultCarriereRows() {
  return Array.from({ length: 65 }, (_, i) => {
    const yr = 2026 - i;
    const coeff = coeffRevalo[yr] || 1;
    return { yr, sal: 0, ss: 0, coeff: coeff.toFixed(3), revalo: 0, trim: 0, ar: 0, total: 0, agircPts: 0, ircPts: 0, rciPts: 0, regimes: {} };
  });
}

// ─── RAPPROCHEMENT RIS / BULLETIN (déterministe) ────────────────────────────
// Compare, par année, le salaire reporté au RIS au cumul brut du bulletin plafonné
// au PASS. Détecte écarts et années non reportées. Calcul pur — l'IA rédige le constat.
function computeRapprochementRisBulletin(carriereRows, bulletins) {
  const risByYear = {};
  (carriereRows || []).forEach((r) => { if (r && r.yr != null) risByYear[r.yr] = r; });
  // Dernière année réellement reportée au RIS : au-delà, un bulletin n'est pas une anomalie
  // (année en cours / trop récente, jamais encore au relevé de carrière).
  const risYears = Object.keys(risByYear).map(Number).filter((y) => (Number(risByYear[y].ss) || Number(risByYear[y].sal) || 0) > 0);
  const maxRisYear = risYears.length ? Math.max.apply(null, risYears) : null;
  const ecarts = [];
  (bulletins || []).forEach((b) => {
    if (b.annee == null || b.brutAnnuel == null) return;
    const pass = PLAFONDS_SS[b.annee] != null ? PLAFONDS_SS[b.annee] : null;
    // Salaire qui DEVRAIT figurer au RIS = brut annuel plafonné au PASS de l'année.
    const bulletinReporte = pass != null ? Math.min(b.brutAnnuel, pass) : b.brutAnnuel;
    const row = risByYear[b.annee];
    const risReporte = row ? (Number(row.ss) || Number(row.sal) || 0) : 0;
    const present = !!row && risReporte > 0;
    const ecartEur = Math.round((risReporte - bulletinReporte) * 100) / 100; // < 0 => RIS sous le bulletin
    const ecartPct = bulletinReporte > 0 ? Math.round((ecartEur / bulletinReporte) * 1000) / 10 : null;
    const absPct = ecartPct == null ? 0 : Math.abs(ecartPct);
    const absEur = Math.abs(ecartEur);
    let niveau; let motif;
    if (!present) {
      if (maxRisYear != null && b.annee > maxRisYear) { niveau = "RECENT"; motif = "Année non encore reportée au RIS (trop récente / en cours)"; }
      else { niveau = "ROUGE"; motif = "Année non reportée au RIS (salaire absent/nul) alors qu'un bulletin l'atteste"; }
    }
    else if (absPct >= 10 || absEur >= 1000) { niveau = "ROUGE"; motif = "Écart majeur RIS / bulletin"; }
    else if (absPct >= 2 || absEur >= 200) { niveau = "ORANGE"; motif = "Écart à vérifier"; }
    else { niveau = "VERT"; motif = "Cohérent"; }
    ecarts.push({
      annee: b.annee, salarie: b.salarie, employeur: b.employeur, periode: b.periode, filename: b.filename,
      pass, brutBulletin: b.brutAnnuel, bulletinReporte, risReporte, present,
      ecartEur, ecartPct, niveau, motif, plafonne: pass != null && b.brutAnnuel > pass,
    });
  });
  ecarts.sort((a, b) => b.annee - a.annee);
  const nbAnomalies = ecarts.filter((e) => e.niveau === "ROUGE" || e.niveau === "ORANGE").length;

  // ── Impact SAM (estimation, lecture seule) ──
  // SAM officiel via computeSAMB (25 meilleures, plafonné PASS, revalorisé).
  // Carrière "corrigée" : pour les années ROUGE/ORANGE, on remonte le salaire au brut
  // du bulletin (computeSAMB re-plafonne au PASS). On ne corrige jamais à la baisse.
  const corrigeRows = (carriereRows || []).map((r) => {
    const ec = ecarts.find((e) => e.annee === r.yr && (e.niveau === "ROUGE" || e.niveau === "ORANGE") && e.brutBulletin != null);
    if (ec) return { ...r, sal: Math.max(Number(r.sal) || 0, ec.brutBulletin) };
    return r;
  });
  const samRis = computeSAMB(carriereRows || []);
  const samCorrige = computeSAMB(corrigeRows);
  const deltaSam = samCorrige - samRis;
  // Estimation pension de base CNAV : ΔSAM × taux plein (50%). Hors prorata/décote.
  const deltaPensionAnnuelle = Math.round(deltaSam * 0.5);
  const deltaPensionMensuelle = Math.round((deltaPensionAnnuelle / 12) * 100) / 100;

  return { ecarts, nbAnomalies, nbBulletins: (bulletins || []).length, samRis, samCorrige, deltaSam, deltaPensionAnnuelle, deltaPensionMensuelle };
}

// ─── CIPAV RESULT CARD ──────────────────────────────────────────────────────

// Built from the régimes registry. Keep the shape { color, icon, title, label }
// since legacy code below indexes by uppercase key.
const REGIME_THEMES = REGIMES.reduce((acc, r) => {
  acc[r.key] = {
    color: r.color,
    icon: r.icon,
    title: `Pension ${r.label}`,
    label: r.label,
  };
  return acc;
}, {});

function buildRegimeView(code, po) {
  if (!po) return { hero: [], details: [] };
  const fmt = (v, frac = 2) => v?.toLocaleString("fr-FR", { minimumFractionDigits: frac, maximumFractionDigits: frac });
  const fmtInt = (v) => v?.toLocaleString("fr-FR");

  if (code === "CIPAV") {
    const baseAnnuelle = po.pension_base_annuelle ?? ((po.points_base || 0) * (po.valeur_point_base || 0));
    const complAnnuelle = po.pension_complementaire_annuelle ?? ((po.points_complementaire || 0) * (po.valeur_point_complementaire || 0));
    const totalAnnuel = po.pension_annuelle_brute ?? (baseAnnuelle + complAnnuelle);
    const totalMensuel = po.pension_mensuelle_brute ?? (totalAnnuel / 12);
    const ptsBase = po.points_base ?? po.details_points?.base;
    const ptsCompl = po.points_complementaire ?? po.details_points?.complementaire;
    return {
      hero: [
        { label: "Mensuelle brute", value: `${fmt(totalMensuel)} €` },
        { label: "Annuelle brute",  value: `${fmt(totalAnnuel, 0)} €` },
      ],
      details: [
        ["Base annuelle",          baseAnnuelle != null ? `${fmt(baseAnnuelle)} €` : null],
        ["Complémentaire annuelle", complAnnuelle != null ? `${fmt(complAnnuelle)} €` : null],
        ["Points base",            ptsBase != null ? fmtInt(ptsBase) : null],
        ["Points complémentaire",  ptsCompl != null ? fmtInt(ptsCompl) : null],
      ],
    };
  }

  const hero = [
    { label: "Mensuelle brute", value: `${fmt(po.pension_mensuelle_brute)} €` },
    { label: "Annuelle brute",  value: `${fmt(po.pension_annuelle_brute, 0)} €` },
  ];

  if (code === "CNAV") {
    return {
      hero,
      details: [
        ["SAM · 25 meilleures années",   po.sam != null ? `${fmt(po.sam, 0)} €` : null],
        ["Taux de liquidation",          po.taux_liquidation != null ? `${po.taux_liquidation} %` : null],
        ["Coefficient de proratisation", po.coefficient_proratisation?.toFixed(4)],
      ],
    };
  }
  if (code === "AGIRC_ARRCO") {
    return {
      hero,
      details: [
        ["Nb points total",   fmtInt(po.total_points ?? po.nb_points_total)],
        ["Coeff. solidarité", po.coefficient_solidarite ? `−${(po.coefficient_solidarite * 100).toFixed(0)} %` : "Aucun (taux plein)"],
        ["Valeur de service", po.valeur_point != null || po.valeur_service != null ? `${po.valeur_point ?? po.valeur_service} €/pt` : null],
      ],
    };
  }
  // IRCANTEC, RCI
  return {
    hero,
    details: [
      ["Nb points total", fmtInt(po.nb_points_total)],
      ["Valeur du point", po.valeur_point != null ? `${po.valeur_point} €` : null],
    ],
  };
}

function RegimeAlertes({ alertes, themeColor }) {
  if (!alertes || alertes.length === 0) return null;
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${themeColor}20`, display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Alertes</div>
      {alertes.map((a, i) => {
        const c = a.niveau === "ROUGE" ? "#D63031" : a.niveau === "ORANGE" ? "#E17055" : a.niveau === "JAUNE" ? "#F9A825" : "#00B894";
        const msg = a.message?.raison || a.message || (typeof a === "object" ? a.raison || a.message : a);
        return (
          <div key={`${a.code}-${i}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 10px", borderRadius: 6, background: `${c}0D`, border: `1px solid ${c}28` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: c, flexShrink: 0, minWidth: 36 }}>{a.code}</span>
            <span style={{ fontSize: 12, color: "#444", lineHeight: 1.4 }}>{msg}</span>
          </div>
        );
      })}
    </div>
  );
}

function RegimeArretCritique({ arret, alertes }) {
  return (
    <div style={{ marginTop: 14, borderRadius: 8, background: "#D6303108", border: "1px solid #D6303130", overflow: "hidden" }}>
      <div style={{ padding: "11px 14px 10px", borderBottom: alertes && alertes.length > 0 ? "1px solid #D6303120" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 14 }}>🚫</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#D63031", letterSpacing: "0.06em", textTransform: "uppercase" }}>Arrêt critique</span>
        </div>
        <div style={{ fontSize: 14, color: "#D63031", lineHeight: 1.5 }}>
          {arret.raison || (typeof arret === "string" ? arret : JSON.stringify(arret))}
        </div>
        {arret.action_requise && (
          <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid #D6303118", fontSize: 12, color: "#b71c1c", lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600 }}>Action requise —</span> {arret.action_requise}
          </div>
        )}
      </div>
      {alertes && alertes.length > 0 && (
        <div style={{ padding: "9px 14px 11px", display: "flex", flexDirection: "column", gap: 5 }}>
          {alertes.map((a, i) => {
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
  );
}

function RegimeResultCard({ code, loading, error, result, carriereValidee }) {
  const theme = REGIME_THEMES[code];
  const po = result?.python_output;
  const arret = result?.arret_critique;
  const alertes = result?.alertes;
  const { hero, details } = buildRegimeView(code, po);
  const visibleDetails = details.filter(([_, v]) => v != null && v !== "");

  // Skip rendering if nothing to show (no loading, no error, no result, no arret)
  if (!loading && !error && !arret && !po) return null;
  // Hide cards with 0€ pension (régime applicable mais sans droits effectifs)
  const pensionMensuelle = Number(po?.pension_mensuelle_brute ?? po?.pension_mensuelle_estimee ?? 0);
  const pensionAnnuelle = Number(po?.pension_annuelle_brute ?? po?.pension_annuelle_estimee ?? 0);
  if (!loading && !error && !arret && po && pensionMensuelle === 0 && pensionAnnuelle === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      {loading && (
        <div style={{ padding: "10px 14px", background: `${theme.color}0A`, borderRadius: 9, border: `1px solid ${theme.color}30`, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.color }}>
          <span style={{ display: "inline-block", width: 10, height: 10, border: `2px solid ${theme.color}40`, borderTop: `2px solid ${theme.color}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          <span style={{ fontSize: 16 }}>{theme.icon}</span>
          Calcul {theme.label} en cours…
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 14px", background: "#D6303110", borderRadius: 9, border: "1px solid #D6303130", fontSize: 12, color: "#D63031" }}>
          <span style={{ fontSize: 16, marginRight: 6 }}>{theme.icon}</span>
          ⚠ {error}
        </div>
      )}

      {arret && (
        <div style={{ padding: "10px 14px", background: `${theme.color}0A`, borderRadius: 9, border: `1px solid ${theme.color}30` }}>
          <RegimeArretCritique arret={arret} alertes={alertes} />
        </div>
      )}

      {!arret && po && (
        <div style={{ background: "#fff", border: `1px solid ${theme.color}20`, borderRadius: 8, padding: "10px 14px", boxShadow: `0 2px 8px ${theme.color}0A` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: theme.color, textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>{theme.icon}</span>
              Résultat {theme.label}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: theme.color, background: `${theme.color}15`, padding: "2px 7px", borderRadius: 3, letterSpacing: "0.08em" }}>CALCUL BRUT</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: visibleDetails.length > 0 ? 10 : 0 }}>
            {hero.map((h, i) => (
              <div key={h.label} style={{ flex: "1 1 130px", background: i === 0 ? `${theme.color}15` : `${theme.color}05`, borderRadius: 7, padding: "10px 12px", border: i === 0 ? "none" : `1px solid ${theme.color}10` }}>
                <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{h.label}</div>
                <div style={{ fontSize: i === 0 ? 22 : 16, fontWeight: 700, color: i === 0 ? theme.color : "#1a1a2e", lineHeight: 1, letterSpacing: "-0.01em" }}>{h.value}</div>
              </div>
            ))}
          </div>

          {visibleDetails.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {visibleDetails.map(([label, value], i) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < visibleDetails.length - 1 ? `1px solid ${theme.color}12` : "none" }}>
                  <span style={{ fontSize: 12, color: "#666" }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          <RegimeAlertes alertes={alertes} themeColor={theme.color} />
        </div>
      )}
    </div>
  );
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────

// ── Uncertainty rendering helpers ─────────────────────────────────────────
// Format d'entrée (côté n8n) : { level: 'low'|'medium'|'high', reason: string }
const UNCERT_BG = { low: "#f0f9ff", medium: "#fff8e1", high: "#fff3e0" };
const UNCERT_BORDER = { low: "#bae6fd", medium: "#f9a825", high: "#F39130" };

// Read a persisted uncertainty map from sessionStorage (always returns an object).
function readPersistedUncert(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const CAREER_DRAFT_KEY = (id) => `simu_career_draft_${id}`;

// Read an unvalidated career draft (scanned RIS working state) from localStorage.
// Returns null if absent/malformed. The draft lets a freshly-scanned RIS survive a
// refresh without freezing — frozen_data still wins once the career is validated.
function readCareerDraft(id) {
  try {
    const raw = localStorage.getItem(CAREER_DRAFT_KEY(id));
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && typeof d === "object" && Array.isArray(d.carriereRows) ? d : null;
  } catch {
    return null;
  }
}

// Select the field content on focus so a typed digit replaces the existing value
// instead of being appended (trimestre cells show "0", which otherwise gives "40"/"04").
// Deferred a tick so the mouse-click's mouseup doesn't collapse the selection.
function selectAllOnFocus(e) {
  const el = e.target;
  setTimeout(() => { try { el.select(); } catch { /* noop */ } }, 0);
}

function getCellUncert(map, year, fieldKey) {
  if (!map || !year) return null;
  const byField = map[year] || map[String(year)];
  if (!byField) return null;
  const entry = byField[fieldKey];
  if (!entry || !entry.level || !entry.reason) return null;
  return entry;
}

function uncertProps(u) {
  if (!u) return { tdStyle: null, title: undefined, badge: null };
  const bg = UNCERT_BG[u.level] || UNCERT_BG.medium;
  const border = UNCERT_BORDER[u.level] || UNCERT_BORDER.medium;
  return {
    tdStyle: { background: bg, boxShadow: `inset 0 0 0 1px ${border}`, position: "relative" },
    // Native title intentionally dropped — the reason is now revealed through the
    // clickable <IaNoteFlag> popover. Call sites keep their own help-text fallback.
    title: undefined,
    badge: <IaNoteFlag level={u.level} reason={u.reason} />,
  };
}

// ── IA note flag: a clickable badge that opens a designed popover with the reason.
const IA_FLAG_THEME = {
  low:    { accent: "#0EA5E9", soft: "#E0F2FE", ring: "#7DD3FC", glyph: "ℹ️", label: "Note IA",    tone: "Information" },
  medium: { accent: "#F59E0B", soft: "#FEF3C7", ring: "#FCD34D", glyph: "⚠️", label: "À vérifier",  tone: "Point d'attention" },
  high:   { accent: "#F97316", soft: "#FFEDD5", ring: "#FDBA74", glyph: "🚩", label: "Incertain",   tone: "Relire le RIS" },
};

const IA_FLAG_STYLE_ID = "ia-note-flag-styles";
function ensureIaFlagStyles() {
  if (typeof document === "undefined" || document.getElementById(IA_FLAG_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = IA_FLAG_STYLE_ID;
  el.textContent = `
@keyframes iaFlagPop { from { opacity: 0; transform: translateY(var(--ia-from, -5px)) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes iaFlagPulse { 0% { box-shadow: 0 0 0 0 var(--ia-ring); } 70% { box-shadow: 0 0 0 5px rgba(0,0,0,0); } 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); } }
.ia-note-flag { transition: transform .15s cubic-bezier(.34,1.56,.64,1), box-shadow .15s ease; box-shadow: 0 1px 2px rgba(15,23,42,.16); }
.ia-note-flag:hover { transform: scale(1.25); box-shadow: 0 4px 10px rgba(15,23,42,.26); }
.ia-note-flag:focus-visible { outline: 2px solid currentColor; outline-offset: 1px; }
.ia-note-flag--active { transform: scale(1.12); }
.ia-note-flag--high { animation: iaFlagPulse 2.6s ease-out infinite; }
`;
  document.head.appendChild(el);
}
if (typeof document !== "undefined") ensureIaFlagStyles();

function IaNoteFlag({ level, reason }) {
  const theme = IA_FLAG_THEME[level] || IA_FLAG_THEME.medium;
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  const toggle = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setAnchor({ top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width });
    }
    setPos(null);
    setOpen((o) => !o);
  }, []);

  // Close on outside click, Escape, scroll or resize.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (popRef.current && popRef.current.contains(e.target)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onMove = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  // Position the popover once it is mounted (so its height can be measured).
  useEffect(() => {
    if (!open || !anchor || !popRef.current) return;
    const W = 290;
    const margin = 8;
    const h = popRef.current.offsetHeight || 150;
    const left = Math.max(margin, Math.min(anchor.right - W + 12, window.innerWidth - W - margin));
    let placement = "bottom";
    let top = anchor.bottom + 10;
    if (top + h > window.innerHeight - margin && anchor.top - h - 10 > margin) {
      placement = "top";
      top = anchor.top - h - 10;
    }
    const caretLeft = Math.max(16, Math.min(W - 16, anchor.left + anchor.width / 2 - left));
    setPos({ top, left, caretLeft, placement });
  }, [open, anchor]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title="Voir la note IA"
        aria-label={`${theme.label} — note de l'IA`}
        aria-expanded={open}
        className={`ia-note-flag${level === "high" ? " ia-note-flag--high" : ""}${open ? " ia-note-flag--active" : ""}`}
        style={{
          position: "absolute", top: 1, right: 1, zIndex: 6,
          width: 17, height: 17, padding: 0, margin: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${theme.ring}`, borderRadius: 6,
          background: "#fff", color: theme.accent, cursor: "pointer",
          fontSize: 10, lineHeight: 1, "--ia-ring": theme.ring,
        }}
      >
        <span aria-hidden="true">{theme.glyph}</span>
      </button>

      {open && typeof document !== "undefined" && ReactDOM.createPortal(
        <div
          ref={popRef}
          role="dialog"
          aria-label={`${theme.label} — note de l'IA`}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: pos ? pos.top : -9999,
            left: pos ? pos.left : -9999,
            width: 290,
            zIndex: 2147483600,
            visibility: pos ? "visible" : "hidden",
            background: "#fff",
            borderRadius: 14,
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: `inset 4px 0 0 0 ${theme.accent}, 0 18px 48px -12px rgba(15,23,42,.34), 0 4px 14px -6px rgba(15,23,42,.18)`,
            fontFamily: "inherit",
            animation: "iaFlagPop .18s cubic-bezier(.16,1,.3,1) both",
            "--ia-from": pos && pos.placement === "top" ? "5px" : "-5px",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: pos ? pos.caretLeft - 6 : -9999,
              [pos && pos.placement === "top" ? "bottom" : "top"]: -6,
              width: 12, height: 12, background: "#fff",
              borderLeft: "1px solid rgba(15,23,42,0.08)",
              borderTop: "1px solid rgba(15,23,42,0.08)",
              borderTopLeftRadius: 3,
              transform: pos && pos.placement === "top" ? "rotate(225deg)" : "rotate(45deg)",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 14px 11px 18px" }}>
            <div
              aria-hidden="true"
              style={{
                flex: "0 0 34px", width: 34, height: 34, borderRadius: 10,
                background: theme.soft, boxShadow: `inset 0 0 0 1px ${theme.ring}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
              }}
            >
              {theme.glyph}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: theme.accent, letterSpacing: .2, lineHeight: 1.1 }}>{theme.label}</div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#94A3B8", letterSpacing: .9, textTransform: "uppercase", marginTop: 3 }}>{theme.tone}</div>
            </div>
            <span style={{ flex: "0 0 auto", fontSize: 8.5, fontWeight: 800, color: "#fff", background: theme.accent, padding: "3px 7px", borderRadius: 999, letterSpacing: .6 }}>IA</span>
          </div>
          <div style={{ height: 1, background: "rgba(15,23,42,0.06)", margin: "0 14px 0 18px" }} />
          <div style={{ padding: "11px 16px 15px 18px", fontSize: 13, lineHeight: 1.55, color: "#334155" }}>{reason}</div>
        </div>,
        document.body
      )}
    </>
  );
}

export default function SimulatorV6({ mode = "production", id, user, onUserUpdate }) {
  // ── UI State ──
  const [apiSkills, setApiSkills] = useState([]);
  const [apiSkillsLoading, setApiSkillsLoading] = useState(false);
  const [editSkillCode, setEditSkillCode] = useState(null);
  const [createSkillOpen, setCreateSkillOpen] = useState(false);
  // Admin > Paramètres annuels : overrides persistés en localStorage (per-browser).
  // Pas de backend dédié à ces paramètres pour l'instant — chaque entrée est
  // de la forme { value, year, maj } et écrase le défaut codé dans ADMIN_SECTIONS.
  const PARAM_OVERRIDES_KEY = "admin_param_overrides_v1";
  const [paramOverrides, setParamOverrides] = useState(() => {
    try {
      const raw = localStorage.getItem(PARAM_OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const [editingParamId, setEditingParamId] = useState(null);
  const [paramDraft, setParamDraft] = useState({ value: "", year: "", maj: "" });

  const persistParamOverrides = useCallback((next) => {
    setParamOverrides(next);
    try { localStorage.setItem(PARAM_OVERRIDES_KEY, JSON.stringify(next)); } catch { /* quota */ }
  }, []);

  const resolveParam = useCallback((param) => {
    const o = paramOverrides[param.id];
    if (!o) return param;
    return { ...param, value: o.value ?? param.value, year: o.year ?? param.year, maj: o.maj ?? param.maj, _overridden: true };
  }, [paramOverrides]);

  const startEditParam = useCallback((param) => {
    const cur = resolveParam(param);
    setEditingParamId(param.id);
    setParamDraft({ value: cur.value || "", year: cur.year || "", maj: cur.maj || "" });
  }, [resolveParam]);

  const saveEditParam = useCallback(() => {
    if (!editingParamId) return;
    const next = { ...paramOverrides, [editingParamId]: { ...paramDraft } };
    persistParamOverrides(next);
    setEditingParamId(null);
  }, [editingParamId, paramDraft, paramOverrides, persistParamOverrides]);

  const cancelEditParam = useCallback(() => setEditingParamId(null), []);

  const resetParamOverride = useCallback((paramId) => {
    const next = { ...paramOverrides };
    delete next[paramId];
    persistParamOverrides(next);
    setEditingParamId(null);
  }, [paramOverrides, persistParamOverrides]);

  const fetchApiSkills = useCallback(() => {
    setApiSkillsLoading(true);
    api.get("/v1/skills")
      .then((res) => setApiSkills(res.data))
      // .catch(() => toast.error("Impossible de charger les skills"))
      .finally(() => setApiSkillsLoading(false));
  }, []);

  useEffect(() => {
    fetchApiSkills();
  }, [fetchApiSkills]);

  const [accessGranted, setAccessGranted] = useState(false);
  const [identiteReset, setIdentiteReset] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState("carriere");
  const [selectedAction, setSelectedAction] = useState(null);
  const [inputValues, setInputValues] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [executed, setExecuted] = useState(null);
  const [adminSection, setAdminSection] = useState("regles");
  const [expandedRule, setExpandedRule] = useState(null);
  const [expandedParam, setExpandedParam] = useState(null);
  const [modal, setModal] = useState(null);
  const [preentretienModal, setPreentretienModal] = useState(null);
  const [systemPromptModal, setSystemPromptModal] = useState(null);
  const [hiddenSystemPrompt, setHiddenSystemPrompt] = useState("");
  const [showDetailedCalcs, setShowDetailedCalcs] = useState(false);
  const [expandedScenarios, setExpandedScenarios] = useState({});
  const autoChainPendingRef = useRef(false);
  const [promptText, setPromptText] = useState("");
  const [promptNotes, setPromptNotes] = useState([]);
  const [showPromptHistory, setShowPromptHistory] = useState(false);

  const reloadPromptNotes = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchPromptNotes(id);
      setPromptNotes(data.notes || []);
    } catch (err) {
      // silencieux : pas bloquant
    }
  }, [id]);

  useEffect(() => {
    reloadPromptNotes();
  }, [reloadPromptNotes]);

  const persistPromptNote = useCallback(async (text) => {
    const content = (text || "").trim();
    if (!content || !id) return;
    try {
      await savePromptNote(id, content);
      reloadPromptNotes();
    } catch (err) {
      // silencieux : pas bloquant pour le calcul
    }
  }, [id, reloadPromptNotes]);

  const handleDeletePromptNote = useCallback(async (noteId) => {
    try {
      await deletePromptNote(noteId);
      setPromptNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      toast.error("Impossible de supprimer la note");
    }
  }, []);

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

  const [activatedDispositifs, setActivatedDispositifs] = useState(() => {
    try {
      const stored = localStorage.getItem(`simu_dispositifs_${id}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [carriereValidee, setCarriereValidee] = useState(false);
  const [lockedAt, setLockedAt] = useState(null);
  const [lockedBy, setLockedBy] = useState(null); // eslint-disable-line no-unused-vars
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [cnavplOpen, setCnavplOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [cnavplClosing, setCnavplClosing] = useState(false);
  const [samOpen, setSamOpen] = useState(false);
  const [accordeonsVisible, setAccordeonsVisible] = useState(false);
  const [openAccordeons, setOpenAccordeons] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportSection, setReportSection] = useState("autre");
  const [reportSending, setReportSending] = useState(false);
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
  // ── Uncertainties (IA "hésitations") par année et par champ ──
  // Forme : { [year]: { [fieldKey]: { level: 'low'|'medium'|'high', reason: string } } }
  // fieldKey suit les conventions du workflow n8n : revenu, trimestres_cotises,
  // trimestres_assimiles, trimestres_ar, points.agirc_arrco, points.ircantec, points.rci.
  // Restored from sessionStorage so the flags survive a page reload — the career
  // grid itself is rehydrated from frozen_data, but uncertainties are not stored there.
  const [uncertaintiesByYear, setUncertaintiesByYear] = useState(() => readPersistedUncert(`simu_uncert_${id}`));
  // Synthese-level + profil-level uncertainties (badges sur les totaux)
  const [syntheseUncertainties, setSyntheseUncertainties] = useState(() => readPersistedUncert(`simu_uncert_synthese_${id}`));
  // Reload the right client's flags when the consultant switches client without a
  // remount (uncertainties are keyed by year, so stale data would mislead otherwise).
  const [uncertClientId, setUncertClientId] = useState(id);
  if (id !== uncertClientId) {
    setUncertClientId(id);
    setUncertaintiesByYear(readPersistedUncert(`simu_uncert_${id}`));
    setSyntheseUncertainties(readPersistedUncert(`simu_uncert_synthese_${id}`));
  }
  const [frozenLoading, setFrozenLoading] = useState(false);
  const [isParsingRIS, setIsParsingRIS] = useState(false);
  const [visibleRowCount, setVisibleRowCount] = useState(20);
  // ── Projection fin de carrière ──
  const [projectionTargetAge, setProjectionTargetAge] = useState(67);
  const [projectionTargetMonths, setProjectionTargetMonths] = useState(0);
  const [projectionSurcote, setProjectionSurcote] = useState(0);
  const [baremeReady, setBaremeReady] = useState(false);
  const [projectionMode, setProjectionMode] = useState(PROJECTION_MODES.LIBRE);
  const [autoDateSignal, setAutoDateSignal] = useState(0);
  const lastAutoDateTypeRef = useRef(null); // last date type auto-selected by the projection (for clean replace)
  const [projRegenNonce, setProjRegenNonce] = useState(0);
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

  // ── CARPIMKO Debug State (bouton de debug isolé — masqué par défaut) ──
  // Pour réactiver le bouton debug, passer SHOW_CARPIMKO_DEBUG à true.
  const SHOW_CARPIMKO_DEBUG = false;
  const [carpimkoDebugLoading, setCarpimkoDebugLoading] = useState(false);
  const [carpimkoDebugResult, setCarpimkoDebugResult] = useState(null);
  const [carpimkoDebugError, setCarpimkoDebugError] = useState(null);

  // ── CARPIMKO State (paramédicaux libéraux : Base + ASV + Complémentaire) ──
  // Source de vérité unique pour les points par année. Persistée dans frozen_data.carpimko.
  const [carpimkoOpen, setCarpimkoOpen] = useState(false);
  const [carpimkoRows, setCarpimkoRows] = useState(() => {
    const yrs = [2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015];
    return Object.fromEntries(yrs.map(yr => [yr, { points_base: "", points_asv: "", points_compl: "" }]));
  });
  // ── CARPIMKO Skill State (résultat du calcul, intégré au flot "Calculer toutes les pensions") ──
  const [carpimkoLoading, setCarpimkoLoading] = useState(false);
  const [carpimkoResult, setCarpimkoResult] = useState(null);
  const [carpimkoError, setCarpimkoError] = useState(null);

  // ── Tier 1 Régimes State (CARMF, CAVP, CARPV, ...) — maps génériques par code régime ──
  // Forme : { CARMF: {points_base: 1500, points_compl: 800, ...}, CAVP: {...} }
  const [regimesPoints, setRegimesPoints] = useState({});
  // Forme : { CARMF: {python_output, alertes, ...}, ... }
  const [regimesSimplesResults, setRegimesSimplesResults] = useState({});
  const [regimesSimplesLoading, setRegimesSimplesLoading] = useState({});
  const [regimesSimplesErrors, setRegimesSimplesErrors] = useState({});

  // ── Master "Calculate All" State ──
  const [isCalculatingAll, setIsCalculatingAll] = useState(false);

  // ── #2: "results stale" detection ──
  // Pensions are computed server-side off frozen_data, so a manual grid edit isn't
  // reflected until the career is re-frozen and recomputed. We flag the displayed
  // results as stale once the grid diverges from the snapshot at the last calc.
  const [resultsStale, setResultsStale] = useState(false);
  const [hydrationDone, setHydrationDone] = useState(false);
  const lastCalcSigRef = useRef(null);
  const calcInputsSig = useMemo(() => JSON.stringify({
    c: carriereRows.map(r => [r.yr, r.sal, r.ss, r.agircPts ?? null, r.ircPts ?? null, r.rciPts ?? null, r.agircT1 ?? null, r.agircT2 ?? null]),
    tc: trimCotState, ta: trimAssState, ar: arState, dp: deplafValues, rv: revaloValues,
    cn: cnavplRows, ck: carpimkoRows, rp: regimesPoints,
  }), [carriereRows, trimCotState, trimAssState, arState, deplafValues, revaloValues, cnavplRows, carpimkoRows, regimesPoints]);
  const calcResultsExist = !!(skillResult || agircResult || ircantecResult || rciResult || cipavResult || carpimkoResult);
  useEffect(() => {
    if (!hydrationDone) return; // ignore grid changes during initial mount hydration
    if (!calcResultsExist) { lastCalcSigRef.current = null; setResultsStale(false); return; }
    if (lastCalcSigRef.current === null) {
      // Results just appeared (fresh calc or restored from cache) → baseline the grid.
      lastCalcSigRef.current = calcInputsSig;
      setResultsStale(false);
    } else if (calcInputsSig !== lastCalcSigRef.current) {
      setResultsStale(true);
    }
  }, [hydrationDone, calcResultsExist, calcInputsSig]);

  // ── Scénarios — Generic Skill Executor State ──
  const [scenarioSkillResults, setScenarioSkillResults] = useState({});
  const [scenarioSkillLoading, setScenarioSkillLoading] = useState({});
  const [scenarioSkillErrors, setScenarioSkillErrors] = useState({});

  // ── Scénarios retenus (multi-select, persisté dans frozen_data.scenarios_choisis) ──
  // Tableau d'items : { dispositif_id, label, skill_code, params, result_summary,
  //                     last_calc, last_calc_at, chosen_at, chosen_by }
  const [chosenScenarios, setChosenScenarios] = useState([]);
  const [chosenScenarioSaving, setChosenScenarioSaving] = useState(false);

  // ── Dates retenues (multi-select, persisté dans frozen_data.dates_retenues) ──
  // Tableau d'items : { type, label, date (ISO yyyy-mm-dd), info, chosen_at, chosen_by }
  const [chosenDates, setChosenDates] = useState([]);
  const [chosenDateSaving, setChosenDateSaving] = useState(false);
  const [dateLibreInput, setDateLibreInput] = useState("");

  // ── Détection automatique des dispositifs applicables ──
  const [detectedDispositifs, setDetectedDispositifs] = useState({});

  // ── Détection type document (RIS vs autre) ──
  // Full detection payloads — not persisted (session only), keyed by filename
  const docTypePayloads = useRef({});
  // { [filename]: { loading: bool, is_ris: bool|null, doc_type: string|null } }
  const [docTypeDetection, setDocTypeDetection] = useState(() => {
    try {
      const stored = sessionStorage.getItem(`simu_doc_detection_${id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Reset any loading=true states left from a previous crash
        Object.keys(parsed).forEach((k) => { if (parsed[k].loading) parsed[k] = { loading: false, is_ris: null, doc_type: null }; });
        return parsed;
      }
    } catch { /* noop */ }
    return {};
  });
  // ── Bulletin de paie — extraction inline (V1 : affichage seul, en mémoire) ──
  // { [filename]: { loading: bool, data: object|null, error: string|null } }
  const [bulletinResults, setBulletinResults] = useState({});
  // ── Rapprochement RIS / bulletin (résultat du calcul déterministe) ──
  const [rapprochement, setRapprochement] = useState(null);
  // Confirmation "Appliquer à la carrière" : null ou { corrections: [{annee, oldSal, newSal}] }
  const [applyConfirm, setApplyConfirm] = useState(null);
  const [orderedDocs, setOrderedDocs] = useState([]);

  // ── RIS — Relevé de carrière du client ──────────────────────────────────────
  // fileToSend     : fichier PDF brut déposé par le consultant (Dropzone)
  // userDocuments  : liste des documents uploadés côté serveur (GET /files?user_id)
  // Source de vérité définitive = frozen_data MySQL (table frozen_data, verrouillée après validation)
  // fileToSend sert uniquement à alimenter n8n avant que frozen_data soit gelé
  // Les fichiers du simulateur sont identifiés par dossier=10 en base (pas de localStorage)
  const [fileToSend, setFileToSend] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [userDocuments, setUserDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, docId: null, fileName: "" });
  const [deleteGenDocId, setDeleteGenDocId] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [n8nMessage, setN8nMessage] = useState(() => {
    try {
      const stored = sessionStorage.getItem(`simu_n8n_message_${id}`);
      return stored || "";
    } catch { return ""; }
  });
  const hasHydratedRef = useRef(false);

  // ── Livrables — Documents générés ───────────────────────────────────────────
  // generatedDocs  : liste locale (session) des rapports produits par n8n
  //                  { id, name, type, createdAt, url (Laravel /uploadFiles), htmlContent }
  // viewingDoc     : doc actuellement ouvert dans ReportViewerModal
  // Persisté via analysis_reports (skill_code = RAPPORT_CONSULTATION) et rechargé au mount.
  const [generatedDocs, setGeneratedDocs] = useState([]);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const cancelReportRef = useRef(null);
  const [isGeneratingSimulation, setIsGeneratingSimulation] = useState(false);
  // const clientNames = useMemo(() => extractClientNames(user), [user]);

  // Charger le dernier rapport simulation depuis la DB au montage —
  // injecté dans generatedDocs pour passer par l'interface unifiée (ReportViewerModal).
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token") || "";
    fetch(`${global.config.server_url}/v1/simulation-retraite/${id}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.html_report) return;
        const displayName = user
          ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
          : "Client";
        // Enforcement Gate #2 : restaurer alertes / arrêt critique du rapport stocké.
        const displayAlertes = (Array.isArray(data.alertes) ? data.alertes : []).map((a) => ({
          code: a.code,
          message: a.message,
          niveau: a.niveau === "CRITIQUE" ? "ROUGE" : (a.niveau === "AVERTISSEMENT" ? "ORANGE" : a.niveau),
        }));
        const arretCritique = data.arret_critique || null;
        setGeneratedDocs((prev) => {
          const existing = prev.find((d) => d.type === "simulation_retraite");
          if (existing) {
            return prev.map((d) =>
              d.type === "simulation_retraite"
                ? { ...d, name: `Simulation retraite de ${displayName}`, htmlContent: data.html_report, alertes: displayAlertes, arretCritique }
                : d
            );
          }
          return [
            {
              id: `sim_restored_${Date.now()}`,
              name: `Simulation retraite de ${displayName}`,
              type: "simulation_retraite",
              createdAt: data.created_at || new Date().toISOString(),
              url: null,
              htmlContent: data.html_report,
              alertes: displayAlertes,
              arretCritique,
            },
            ...prev,
          ];
        });
      })
      .catch(() => {});
  }, [id, user]);

  // Persist n8nMessage to sessionStorage
  useEffect(() => {
    if (!id) return;
    try { sessionStorage.setItem(`simu_n8n_message_${id}`, n8nMessage); }
    catch (e) { /* noop */ }
  }, [n8nMessage, id]);

  // ── Polling de génération en cours (EOR-61) ─────────────────────────────
  // Si un livrable est en cours de génération côté backend (n8n) et que l'utilisateur
  // a navigué/rechargé entre-temps, on reprend l'attente : spinner + polling de la DB
  // jusqu'à apparition du livrable, puis cleanup du flag localStorage.
  // Timeout dur : 8 min (au-delà on abandonne).
  useEffect(() => {
    if (!id) return;
    const PENDING_TIMEOUT_MS = 8 * 60 * 1000;
    const POLL_INTERVAL_MS = 8000;

    const checkPending = (storageKey) => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return null;
        const { startedAt } = JSON.parse(raw);
        if (!startedAt || Date.now() - startedAt > PENDING_TIMEOUT_MS) {
          localStorage.removeItem(storageKey);
          return null;
        }
        return startedAt;
      } catch { localStorage.removeItem(storageKey); return null; }
    };

    const rapportKey = `gen_pending_RAPPORT_CONSULTATION_${id}`;
    const simKey = `gen_pending_SIMULATION_RETRAITE_${id}`;
    const rapportPending = checkPending(rapportKey);
    const simPending = checkPending(simKey);

    if (!rapportPending && !simPending) return;

    if (rapportPending) setIsGeneratingReport(true);
    if (simPending) setIsGeneratingSimulation(true);

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;

      // Rapport de consultation : vérifie analysis_reports
      if (checkPending(rapportKey)) {
        try {
          const report = await fetchLatestReport(id, "RAPPORT_CONSULTATION");
          const data = report?.result_json;
          if (data?.htmlContent) {
            setGeneratedDocs((prev) => prev.some((d) => d.type === "rapport_consultation")
              ? prev
              : [{
                  id: data.id || `rc_polled_${Date.now()}`,
                  name: data.name || "Rapport de consultation retraite",
                  type: "rapport_consultation",
                  createdAt: data.createdAt || report.created_at || new Date().toISOString(),
                  url: data.url || null,
                  htmlContent: data.htmlContent,
                }, ...prev]);
            localStorage.removeItem(rapportKey);
            setIsGeneratingReport(false);
            toast.success("Rapport de consultation prêt !");
          }
        } catch { /* 404 = pas encore prêt, on retentera */ }
      } else {
        setIsGeneratingReport(false);
      }

      // Simulation retraite : vérifie l'endpoint dédié
      if (checkPending(simKey)) {
        try {
          const token = localStorage.getItem("token") || "";
          const r = await fetch(`${global.config.server_url}/v1/simulation-retraite/${id}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          });
          if (r.ok) {
            const d = await r.json();
            if (d?.html_report) {
              const displayName = user
                ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                : "Client";
              setGeneratedDocs((prev) => {
                const newDoc = {
                  id: `sim_polled_${Date.now()}`,
                  name: `Simulation retraite de ${displayName}`,
                  type: "simulation_retraite",
                  createdAt: d.created_at || new Date().toISOString(),
                  url: null,
                  htmlContent: d.html_report,
                };
                if (prev.some((dd) => dd.type === "simulation_retraite")) {
                  return prev.map((dd) => dd.type === "simulation_retraite" ? { ...dd, name: newDoc.name, htmlContent: newDoc.htmlContent } : dd);
                }
                return [newDoc, ...prev];
              });
              localStorage.removeItem(simKey);
              setIsGeneratingSimulation(false);
              toast.success("Simulation prête !");
            }
          }
        } catch { /* on retente */ }
      } else {
        setIsGeneratingSimulation(false);
      }

      if (!cancelled && (checkPending(rapportKey) || checkPending(simKey))) {
        setTimeout(tick, POLL_INTERVAL_MS);
      }
    };

    setTimeout(tick, POLL_INTERVAL_MS);
    return () => { cancelled = true; };
  }, [id, user]);

  // Load cached skill results from DB on mount (persist across F5)
  useEffect(() => {
    if (!id) return;
    const loadCached = async () => {
      // Si un reset vient d'être effectué pour ce client, ne pas recharger depuis la DB
      // Flag supprimé uniquement quand une nouvelle analyse est sauvegardée (saveSkillResult)
      if (localStorage.getItem(`simulator_reset_${id}`)) {
        return;
      }

      const skillMap = [
        ["CNAV",        setSkillResult],
        ["AGIRC_ARRCO", setAgircResult],
        ["IRCANTEC",    setIrcantecResult],
        ["RCI",         setRciResult],
        ["CIPAV",       setCipavResult],
        ["CARPIMKO",    setCarpimkoResult],
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

      // Tier 1 régimes : restaurer dans un map unique
      const tier1Codes = Object.keys(REGIMES_SIMPLES);
      const restoredSimples = {};
      for (const code of tier1Codes) {
        try {
          const report = await fetchLatestReport(id, code);
          const result = report?.result_json;
          if (result?.python_output && result.mode?.startsWith('parallel')) {
            restoredSimples[code] = result;
          }
        } catch { /* ignore 404 */ }
      }
      if (Object.keys(restoredSimples).length) setRegimesSimplesResults(restoredSimples);

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
        // Auto-cocher les dispositifs dont un résultat existe déjà en DB
        const skillToDispositif = Object.fromEntries(
          Object.entries(DISPOSITIF_TO_SKILL_CODE).map(([k, v]) => [v, k])
        );
        const toActivate = Object.keys(scenarioResults).map(c => skillToDispositif[c]).filter(Boolean);
        if (toActivate.length > 0) {
          setActivatedDispositifs(prev => {
            const next = [...new Set([...prev, ...toActivate])];
            try { localStorage.setItem(`simu_dispositifs_${id}`, JSON.stringify(next)); } catch {}
            return next;
          });
        }
      }

      // Recharger les scénarios retenus (frozen_data.scenarios_choisis, multi)
      try {
        const list = await fetchChosenScenarios(id);
        if (Array.isArray(list)) setChosenScenarios(list);
        // Restaurer les inputValues à partir des params persistés
        const restoredInputs = {};
        for (const s of list || []) {
          if (s?.dispositif_id && s?.params?.input != null) {
            restoredInputs[s.dispositif_id] = String(s.params.input);
          }
        }
        if (Object.keys(restoredInputs).length) {
          setInputValues(prev => ({ ...restoredInputs, ...prev }));
        }
      } catch { /* 404 ou pas de carrière, on ignore */ }

      // Recharger les dates retenues (frozen_data.dates_retenues, multi)
      try {
        const dates = await fetchChosenDates(id);
        if (Array.isArray(dates)) {
          setChosenDates(dates);
          const libre = dates.find(d => d?.type === "date_libre" && d?.date);
          if (libre) setDateLibreInput(libre.date);
        }
      } catch { /* 404 ou pas de carrière, on ignore */ }

      // Recharger le rapport de consultation depuis analysis_reports
      try {
        const rapportReport = await fetchLatestReport(id, "RAPPORT_CONSULTATION");
        const rapportData = rapportReport?.result_json;
        if (rapportData?.htmlContent) {
          setGeneratedDocs((prev) => {
            // Éviter les doublons si déjà chargé
            if (prev.some((d) => d.id === rapportData.id)) return prev;
            return [{
              id: rapportData.id || `rc_restored_${Date.now()}`,
              name: rapportData.name || "Rapport de consultation retraite",
              type: rapportData.type || "rapport_consultation",
              createdAt: rapportData.createdAt || rapportReport.created_at || new Date().toISOString(),
              url: rapportData.url || null,
              htmlContent: rapportData.htmlContent,
            }, ...prev];
          });
        }
      } catch { /* 404 = pas de rapport consultation, on ignore */ }
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
  // Derived projection values (read-only; recomputed from grid + controls + client birthdate).
  const projBirthYear = useMemo(() => parseBirthYear(user?.birth_date), [user]);
  const projTargetYear = useMemo(() => computeTargetYear(projBirthYear, projectionTargetAge), [projBirthYear, projectionTargetAge]);
  const projLastRealYear = useMemo(() => findLastRealYear(carriereRows), [carriereRows]);
  const projectionActive = projLastRealYear != null && projTargetYear != null;
  const projectionOn = useMemo(() => carriereRows.some((r) => r && r.projected), [carriereRows]);

  // Departure dates derived from barème + grid, shared by the projection selector (below)
  // and the "dispositifs" panel. Each anchor is the object returned by its compute* helper
  // (or null when not computable, e.g. no birth date). baremeReady is a recompute trigger.
  const departureDates = useMemo(() => {
    const birthDate = user?.birth_date;
    // trimAcquis / anneeRef are computed from REAL (non-projected) years only, so a
    // duration-based taux-plein target never depends on its own projection — otherwise
    // adding surcote drifts the target forward and removing it can't shrink the grid back.
    const { trimAcquis, anneeRef, trimParAnnee } = computeRealAssuranceTotals(trimCotState, trimAssState, carriereRows);
    return {
      trimAcquis,
      anneeRef,
      trimParAnnee,
      legale: computeDateLegale(birthDate),
      tauxPlein: computeDateTauxPlein(birthDate, trimAcquis, anneeRef),
      date67: computeDate67(birthDate),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, trimCotState, trimAssState, baremeReady, carriereRows]);

  // Reconcile projected rows to the current controls. Thin wrapper over the pure reducer;
  // preserves manual edits, bumps visibleRowCount so the projected block (top of grid) shows.
  const handleGenerateProjection = useCallback((nextMode, nextAge, nextSurcote, nextMonths = 0, nextLibreDate = dateLibreInput) => {
    const birthYear = parseBirthYear(user?.birth_date);
    const _birth = parseBirthDate(user?.birth_date);
    let targetYear;
    if (nextMode === PROJECTION_MODES.LIBRE) {
      // « Date libre » : la cible = l'année de la date choisie (date-picker, plus simple qu'un âge).
      const _d = nextLibreDate ? new Date(String(nextLibreDate).slice(0, 10) + "T00:00:00") : null;
      targetYear = (_d && !isNaN(_d.getTime())) ? _d.getFullYear() : null;
    } else {
      targetYear = resolveProjectionTargetYear({ mode: nextMode, birthYear, age: nextAge, months: nextMonths, birthMonth: _birth ? _birth.getMonth() : 0, departureDates });
    }
    const lastRealYear = findLastRealYear(carriereRows);
    const lastRealSalary = findLastRealSalary(carriereRows, lastRealYear);
    const res = reconcileProjection(
      { carriereRows, revaloValues, trimCotState },
      { lastRealYear, targetYear, surcote: nextSurcote, lastRealSalary, passLast: PASS_LAST },
    );
    // SIMPLE carry-forward: each projected year = a copy of the LAST REAL year. Its salary is
    // carried by projectYearValue (no PASS cap), and we copy that year's complementary points
    // verbatim onto every projected row — no recompute from salary, no multi-year heuristic.
    // What the consultant sees is exactly "next year = same salary AND same points as the last
    // real year".
    const lastRealRow = carriereRows.find((r) => r && !r.projected && r.yr === lastRealYear);
    const baseAgirc = Number(lastRealRow?.agircPts) || 0;
    const baseIrc = Number(lastRealRow?.ircPts) || 0;
    const baseRci = Number(lastRealRow?.rciPts) || 0;
    const projectedRows = res.carriereRows.map((r) => {
      if (!r.projected) return r;
      return { ...r, agircPts: baseAgirc, ircPts: baseIrc, rciPts: baseRci, regimes: { ...(r.regimes || {}), AGIRC_ARRCO: baseAgirc, IRCANTEC: baseIrc, RCI: baseRci } };
    });
    setCarriereRows(projectedRows);
    setRevaloValues(res.revaloValues);
    setTrimCotState(res.trimCotState);
    if (res.projectedYears.length) {
      setVisibleRowCount((v) => Math.min(res.carriereRows.length, Math.max(v, res.projectedYears.length + 20)));
    }
  }, [carriereRows, revaloValues, trimCotState, user, departureDates, dateLibreInput]);

  // Désactive la projection : retire toutes les années projetées (reconcile vers un set vide).
  const clearProjection = useCallback(() => {
    const lastRealYear = findLastRealYear(carriereRows);
    const res = reconcileProjection(
      { carriereRows, revaloValues, trimCotState },
      { lastRealYear, targetYear: lastRealYear, surcote: 0, lastRealSalary: 0, passLast: PASS_LAST },
    );
    setCarriereRows(res.carriereRows);
    setRevaloValues(res.revaloValues);
    setTrimCotState(res.trimCotState);
  }, [carriereRows, revaloValues, trimCotState]);

  //   RIS format  : { annee, sal_original, sal_eur, devise, regimes }
  //   SAISIE format: { annee, salaire_brut, salaire_revalo, trimestres_cotises, trimestres_assimiles }
  const applyCarriereData = useCallback((carriere) => {
    if (!Array.isArray(carriere) || !carriere.length) return 0;
    const minYear = Math.min(...carriere.map(r => r.annee));
    setVisibleRowCount(Math.min(Math.max(20, 2026 - minYear + 1), 65));
    // Build a full grid row from a carriere entry. Shared by the in-place update and the
    // append step below so projected years stored BEYOND the default grid (e.g. 2027+) get
    // real rows AND keep their `projected` flag — instead of being dropped from carriereRows
    // while still feeding trimCotState (the desync that made a projection "disappear" from
    // the grid yet linger in the totals, and made 2026 look like real RIS data with points).
    const buildRowFromEntry = (row, entry) => {
      // Normalize salary: new format uses revenu_brut, legacy uses salaire_brut, RIS uses sal_eur
      const salEur = entry.revenu_brut ?? entry.salaire_brut ?? entry.sal_eur ?? 0;
      const salOriginal = entry.revenu_brut ?? entry.salaire_brut ?? entry.sal_original ?? 0;
      const plaf = PLAFONDS_SS[row.yr] || 48060;
      const coeff = coeffRevalo[row.yr] || 1;
      const calculatedRevalo = Math.round(Math.min(salEur, plaf) * coeff);
      // R.351-29 CSS : le plafond PASS s'applique au salaire AVANT revalorisation. Le salaire
      // revalorisé (plaf × coeff) dépasse normalement le PASS courant et NE doit PAS être re-plafonné.
      const revalo = entry.salaire_revalo ?? calculatedRevalo;
      const ss = Math.min(salEur, plaf);
      const pts = {};
      // Backward compatibility for points (supporting both points_ and pts_ prefixes)
      const agirc = entry.points_agirc_arrco ?? entry.pts_agirc_arrco;
      const irc = entry.points_ircantec ?? entry.pts_ircantec;
      const rci = entry.points_rci ?? entry.pts_rci;
      // Preserve existing regimes on the row + merge any regimes map saved on the backend entry
      pts.regimes = { ...(row.regimes || {}), ...(entry.regimes || {}) };
      if (agirc != null) { pts.agircPts = agirc; pts.regimes.AGIRC_ARRCO = agirc; }
      if (irc != null)   { pts.ircPts   = irc;   pts.regimes.IRCANTEC    = irc;   }
      if (rci != null)   { pts.rciPts   = rci;   pts.regimes.RCI         = rci;   }
      return { ...row, sal: salOriginal, ss, revalo, devise: entry.devise || '€', regimes_concernes: entry.regimes_concernes || '', ...pts, projected: !!entry.projected };
    };
    setCarriereRows(prev => {
      const updated = prev.map(row => {
        const entry = carriere.find(r => r.annee === row.yr);
        return entry ? buildRowFromEntry(row, entry) : row;
      });
      // Append rows for carriere years beyond the existing grid (projected years > newest row),
      // so carriereRows stays in sync with trimCotState (which is filled for every entry below).
      const existingYears = new Set(prev.map(r => r.yr));
      const extras = carriere
        .filter(e => e && e.annee != null && !existingYears.has(e.annee))
        .map(e => buildRowFromEntry(
          { yr: e.annee, sal: 0, ss: 0, coeff: "1.000", revalo: 0, trim: 0, ar: 0, total: 0, agircPts: 0, ircPts: 0, rciPts: 0, regimes: {} },
          e
        ));
      return extras.length ? [...updated, ...extras].sort((a, b) => b.yr - a.yr) : updated;
    });
    setRevaloValues(prev => {
      const next = { ...prev };
      carriere.forEach(entry => {
        const salEur = entry.revenu_brut ?? entry.salaire_brut ?? entry.sal_eur ?? 0;
        const plaf = PLAFONDS_SS[entry.annee] || 48060;
        const coeff = coeffRevalo[entry.annee] || 1;
        const calculatedRevalo = Math.round(Math.min(salEur, plaf) * coeff);
        // Pas de re-plafond du salaire revalorisé (cf. R.351-29 CSS).
        next[entry.annee] = entry.salaire_revalo ?? calculatedRevalo;
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
    // Compte les années dont le salaire brut a atteint le PASS (salaire SS = plafond).
    // Le salaire revalorisé n'est PAS plafonné (R.351-29 CSS) ; ce compteur sert
    // uniquement à signaler les années au plafond dans l'UI (cellules en rouge).
    return carriere.filter(entry => {
      const salEur = entry.revenu_brut ?? entry.salaire_brut ?? entry.sal_eur ?? 0;
      if (!salEur) return false;
      const plaf = PLAFONDS_SS[entry.annee] || 48060;
      return salEur >= plaf;
    }).length;
  }, []);

  // Becomes true once mount hydration (frozen_data or draft) has run, so the
  // autosave effect below never persists the empty default grid over a good draft.
  const draftHydratedRef = useRef(false);

  // Restore the full working career from a localStorage draft (see readCareerDraft).
  const restoreCareerDraft = useCallback((d) => {
    if (!d) return;
    if (Array.isArray(d.carriereRows)) setCarriereRows(d.carriereRows);
    if (d.trimCotState) setTrimCotState(d.trimCotState);
    if (d.trimAssState) setTrimAssState(d.trimAssState);
    if (d.arState) setArState(d.arState);
    if (d.revaloValues) setRevaloValues(d.revaloValues);
    if (d.deplafValues) setDeplafValues(d.deplafValues);
    if (d.cnavplRows) setCnavplRows(d.cnavplRows);
    if (typeof d.cnavplOpen === "boolean") setCnavplOpen(d.cnavplOpen);
    if (d.carpimkoRows) setCarpimkoRows(d.carpimkoRows);
    if (typeof d.carpimkoOpen === "boolean") setCarpimkoOpen(d.carpimkoOpen);
    if (d.regimesPoints) setRegimesPoints(d.regimesPoints);
    if (d.lastRisPayload) setLastRisPayload(d.lastRisPayload);
    if (typeof d.visibleRowCount === "number") setVisibleRowCount(d.visibleRowCount);
    if (d.risFileName) setRisFileName(d.risFileName);
  }, []);

  // Load career data from frozen_data on mount
  useEffect(() => {
    if (!id) return;
    // Block autosave until this client's hydration finishes (prevents saving the
    // previous client's grid under the new client's key on a client switch).
    draftHydratedRef.current = false;
    setHydrationDone(false);
    const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
    axios.get(`${global.config.server_url}/frozen_data/${id}`, Config)
      .then(res => {
        // A working draft exists ONLY while the career is unlocked — locking removes it
        // (see the freeze handler). So whenever a draft is present it is the freshest
        // in-progress grid (e.g. a projection added after UNLOCKING a previously-frozen
        // career) and must win over the server frozen_data. Gating this on `!locked_at`
        // was the bug: after a first lock the server keeps locked_at, so unlock → project
        // → F5 ignored the draft and silently reverted to the frozen snapshot — the
        // projection "disappeared". Drafts are cleared on lock, so this can't resurrect a
        // stale grid over a freshly-frozen one.
        const draft = readCareerDraft(id);
        if (draft) {
          restoreCareerDraft(draft);
          draftHydratedRef.current = true;
          setHydrationDone(true);
          return;
        }
        // Restore CIPAV points (from dedicated column or legacy carriere objects)
        const cipav = res.data?.cipav;
        const carpimko = res.data?.carpimko;
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

        // Restore CARPIMKO points (3 piliers : Base + ASV + Complémentaire)
        if (Array.isArray(carpimko) && carpimko.length) {
          setCarpimkoOpen(true);
          setCarpimkoRows(prev => {
            const next = { ...prev };
            carpimko.forEach(e => {
              if (e.annee) {
                next[e.annee] = {
                  points_base: e.points_base ?? e.pts_carpimko_base ?? (next[e.annee]?.points_base ?? ""),
                  points_asv: e.points_asv ?? e.pts_carpimko_asv ?? (next[e.annee]?.points_asv ?? ""),
                  points_compl: e.points_complementaire ?? e.points_compl ?? e.pts_carpimko_complementaire ?? e.pts_carpimko_compl ?? (next[e.annee]?.points_compl ?? ""),
                };
              }
            });
            return next;
          });
        }

        // Tier 1 : restaurer regimes_points (frozen_data.regimes_points) + fallback carriere[].regimes
        const persistedRP = res.data?.regimes_points || {};
        const merged = { ...persistedRP };
        if (Array.isArray(carriere) && carriere.length) {
          for (const code of Object.keys(REGIMES_SIMPLES)) {
            if (merged[code] && Object.keys(merged[code]).length) continue; // déjà persisté
            const auto = extractRegimeSimplePoints(carriere, code);
            if (Object.keys(auto).length) merged[code] = auto;
          }
        }
        if (Object.keys(merged).length) setRegimesPoints(merged);

        if (Array.isArray(carriere) && carriere.length && (!Array.isArray(carpimko) || !carpimko.length)) {
          // Fallback CARPIMKO : auto-extraire depuis carriere[].regimes (parsing RIS automatique)
          const hasCarpimkoInCarriere = carriere.some(e => {
            const r = e?.regimes || {};
            return r.CARPIMKO != null || r.CARPIMKO_ASV != null || r.CARPIMKO_COMPL != null;
          });
          if (hasCarpimkoInCarriere) {
            setCarpimkoOpen(true);
            setCarpimkoRows(prev => {
              const next = { ...prev };
              carriere.forEach(e => {
                const r = e?.regimes || {};
                if (e.annee && (r.CARPIMKO != null || r.CARPIMKO_ASV != null || r.CARPIMKO_COMPL != null)) {
                  next[e.annee] = {
                    points_base: r.CARPIMKO != null ? String(r.CARPIMKO) : (next[e.annee]?.points_base ?? ""),
                    points_asv: r.CARPIMKO_ASV != null ? String(r.CARPIMKO_ASV) : (next[e.annee]?.points_asv ?? ""),
                    points_compl: r.CARPIMKO_COMPL != null ? String(r.CARPIMKO_COMPL) : (next[e.annee]?.points_compl ?? ""),
                  };
                }
              });
              return next;
            });
          }
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
        draftHydratedRef.current = true;
        setHydrationDone(true);
      })
      .catch(() => {
        // No frozen_data on the server — still restore a local draft if present.
        const draft = readCareerDraft(id);
        if (draft) restoreCareerDraft(draft);
        draftHydratedRef.current = true;
        setHydrationDone(true);
      });
  }, [id, applyCarriereData, restoreCareerDraft]);

  // Autosave the working career to localStorage (debounced) so a scanned RIS
  // survives a refresh without freezing. Skipped while the career is locked
  // (frozen_data is then authoritative) and until mount hydration has run.
  useEffect(() => {
    if (!id || carriereValidee || !draftHydratedRef.current) return undefined;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(CAREER_DRAFT_KEY(id), JSON.stringify({
          v: 1,
          carriereRows, trimCotState, trimAssState, arState,
          revaloValues, deplafValues,
          cnavplRows, cnavplOpen, carpimkoRows, carpimkoOpen,
          regimesPoints, lastRisPayload, visibleRowCount, risFileName,
        }));
      } catch { /* quota exceeded or storage disabled: best-effort, skip */ }
    }, 600);
    return () => clearTimeout(t);
  }, [id, carriereValidee, carriereRows, trimCotState, trimAssState, arState,
      revaloValues, deplafValues, cnavplRows, cnavplOpen, carpimkoRows, carpimkoOpen,
      regimesPoints, lastRisPayload, visibleRowCount, risFileName]);

  // ── Fetch user documents from server ──
  // Charge la liste des documents uploadés pour ce client depuis Laravel
  // Utilisé pour afficher le RIS déjà présent + permettre de le re-sélectionner
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
    localStorage.setItem(`simulator_reset_${id}`, '1');
    setCarriereRows(_buildDefaultCarriereRows());
    setRevaloValues(() => { const init = {}; for (let i = 0; i < 65; i++) { init[2026 - i] = 0; } return init; });
    setDeplafValues({});
    setDeplafSnapshots({});
    setTrimCotState(() => { const init = {}; for (let i = 0; i < 65; i++) { init[2026 - i] = 0; } return init; });
    setTrimAssState(() => { const init = {}; for (let i = 0; i < 65; i++) { init[2026 - i] = 0; } return init; });
    setArState(() => { const init = {}; for (let i = 0; i < 65; i++) { init[2026 - i] = 0; } return init; });
    setCnavplRows(Object.fromEntries([2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015].map(yr => [yr, { revenus: "", revCnavpl: "", points: "" }])));
    setCnavplOpen(false);
    setCarpimkoRows(Object.fromEntries([2025,2024,2023,2022,2021,2020,2019,2018,2017,2016,2015].map(yr => [yr, { points_base: "", points_asv: "", points_compl: "" }])));
    setCarpimkoOpen(false);
    setVisibleRowCount(20);
    setProjectionTargetAge(67);
    setProjectionTargetMonths(0);
    setProjectionSurcote(0);
    setProjectionMode(PROJECTION_MODES.LIBRE);
    try { localStorage.removeItem(`simu_projection_${id}`); } catch { /* noop */ }
    setCarriereValidee(false);
    setRisFileName(null);
    setLastRisPayload(null);
    // Vider les notes IA (flags) persistées + le brouillon de carrière local
    setUncertaintiesByYear({});
    setSyntheseUncertainties({});
    try {
      sessionStorage.removeItem(`simu_uncert_${id}`);
      sessionStorage.removeItem(`simu_uncert_synthese_${id}`);
      localStorage.removeItem(CAREER_DRAFT_KEY(id));
    } catch { /* noop */ }
    // Vider les résultats des calculs et scénarios
    setSkillResult(null);
    setSkillError(null);
    setAgircResult(null);
    setAgircError(null);
    setIrcantecResult(null);
    setIrcantecError(null);
    setRciResult(null);
    setRciError(null);
    setCipavResult(null);
    setCipavError(null);
    setCarpimkoResult(null);
    setCarpimkoError(null);
    setRegimesPoints({});
    setRegimesSimplesResults({});
    setRegimesSimplesLoading({});
    setRegimesSimplesErrors({});
    setScenarioSkillResults({});
    setScenarioSkillErrors({});
    setActivatedDispositifs([]);
    try { localStorage.removeItem(`simu_dispositifs_${id}`); } catch {}
    setDetectedDispositifs({});
    setGeneratedDocs([]);
    // Supprimer les rapports en base pour éviter leur rechargement au F5
    const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
    const allCodes = [
      "CNAV", "AGIRC_ARRCO", "IRCANTEC", "RCI", "CIPAV", "RAPPORT_CONSULTATION",
      ...new Set(Object.values(DISPOSITIF_TO_SKILL_CODE).filter(Boolean)),
    ];
    for (const code of allCodes) {
      try {
        const report = await axios.get(
          `${global.config.server_url}/v1/analysis-reports/latest/${id}/${code}`,
          Config,
        );
        if (report?.data?.id) {
          await axios.delete(
            `${global.config.server_url}/v1/analysis-reports/${report.data.id}`,
            Config,
          );
        }
      } catch { /* 404 = pas de rapport, on ignore */ }
    }
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
    setAccessGranted(false);
    setIdentiteReset(true);
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

  // Load the editable backend barème (/v1/departure-rules) so legal age / required
  // quarters reflect the latest table (it changes often). Falls back to the hard-coded
  // BAREME_TRANCHES on failure. baremeReady flips once loaded so the departureDates memo
  // recomputes (getBaremeRetraite reads a module-level cache React can't observe directly).
  useEffect(() => {
    let alive = true;
    initBareme().then(() => { if (alive) setBaremeReady(true); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Restore projection controls for this client (rows themselves ride the WIP career draft).
  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem(`simu_projection_${id}`);
      if (raw) {
        const d = JSON.parse(raw);
        if (Number.isFinite(d.targetAge)) setProjectionTargetAge(d.targetAge);
        setProjectionTargetMonths(Number.isFinite(d.targetMonths) ? d.targetMonths : 0);
        if (Number.isFinite(d.surcote)) setProjectionSurcote(d.surcote);
        if (typeof d.mode === "string" && Object.values(PROJECTION_MODES).includes(d.mode)) setProjectionMode(d.mode);
      }
    } catch { /* noop */ }
  }, [id]);

  // Persist projection controls (best-effort; the projected rows persist via the career draft).
  // On mount this fires with defaults before the restore effect's state update lands; the
  // restore effect corrects it in the same commit cycle (the rows persist independently).
  useEffect(() => {
    if (!id) return;
    try {
      localStorage.setItem(`simu_projection_${id}`, JSON.stringify({ targetAge: projectionTargetAge, targetMonths: projectionTargetMonths, surcote: projectionSurcote, mode: projectionMode }));
    } catch { /* noop */ }
  }, [id, projectionTargetAge, projectionTargetMonths, projectionSurcote, projectionMode]);

  // After a RIS import bumps projRegenNonce, regenerate the projection once against the
  // freshly-applied grid. Intentionally keyed ONLY on the nonce (run-on-signal pattern):
  // do NOT add handleGenerateProjection to the deps — it re-memoizes whenever carriereRows
  // changes, and because the nonce guard stays > 0 the effect would then re-run on every
  // grid edit and loop forever (the handler itself calls setCarriereRows). The render that
  // bumps the nonce already captures a fresh handler reflecting the post-import grid.
  useEffect(() => {
    if (projRegenNonce > 0) handleGenerateProjection(projectionMode, projectionTargetAge, projectionSurcote, projectionTargetMonths);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projRegenNonce]);

  // After freezing the career, auto-select in Scénarios the date matching the projection mode.
  // Anchors (légal / durée / 67) ALWAYS select — even when the date is in the past and the grid
  // has no projected rows (e.g. a client already at/past legal age). Âge libre selects only when
  // the user actually projected (projected rows exist), so an untouched default doesn't force a
  // date. The previous projection-chosen date is replaced on mode change; manual picks are kept.
  // Run-on-signal (keyed only on autoDateSignal) so chosenDates is fresh.
  useEffect(() => {
    if (autoDateSignal === 0 || !id) return;
    const dd = departureDates;
    const birth = parseBirthDate(user?.birth_date);
    const hasProjectedRows = carriereRows.some((r) => r && r.projected);
    const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let typeId = null, label = null, isoDate = null, info = "";
    if (projectionMode === PROJECTION_MODES.LEGAL && dd.legale) {
      typeId = "age_legal"; label = "Âge légal"; isoDate = toIso(dd.legale.date);
      info = `${dd.legale.ageStr} → ${dd.legale.label}`;
    } else if (projectionMode === PROJECTION_MODES.DUREE && dd.tauxPlein) {
      const tp = dd.tauxPlein; typeId = "taux_plein"; label = "Taux plein (durée)"; isoDate = toIso(tp.date);
      info = tp.trimManquants === 0 ? `${tp.ageStr} • ${tp.trimRequis} trim. atteints` : `${tp.ageStr} • ${tp.trimManquants} trim. manquants → ${tp.label}`;
    } else if (projectionMode === PROJECTION_MODES.AUTO67 && dd.date67) {
      typeId = "taux_plein_auto"; label = "Taux plein auto (67 ans)"; isoDate = toIso(dd.date67.date);
      info = `67 ans → ${dd.date67.label}`;
    } else if (projectionMode === PROJECTION_MODES.LIBRE && hasProjectedRows && dateLibreInput) {
      typeId = "date_libre"; label = "Date libre"; isoDate = dateLibreInput;
      const _d = new Date(dateLibreInput + "T00:00:00");
      info = !isNaN(_d.getTime()) ? _d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : dateLibreInput;
    }
    if (!typeId) return; // aucune projection exploitable → on laisse l'utilisateur choisir
    const prevAuto = lastAutoDateTypeRef.current;
    let next = chosenDates, changed = false;
    if (prevAuto && prevAuto !== typeId && next.some((cd) => cd?.type === prevAuto)) {
      next = next.filter((cd) => cd?.type !== prevAuto); changed = true;
    }
    if (!next.some((cd) => cd?.type === typeId)) {
      next = [...next, { type: typeId, label, date: isoDate, info }]; changed = true;
    }
    lastAutoDateTypeRef.current = typeId;
    if (typeId === "date_libre") setDateLibreInput(isoDate); // garde la carte « Date libre » surlignée
    if (!changed) return;
    setChosenDates(next);
    saveChosenDates(parseInt(id), next)
      .then((updated) => { if (Array.isArray(updated?.dates_retenues)) setChosenDates(updated.dates_retenues); toast.success(`Date retenue : ${label}`); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDateSignal]);

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

  // Restore fileToSend from sessionStorage after refresh
  useEffect(() => {
    if (!id) return;
    try {
      const stored = sessionStorage.getItem(`simu_file_to_send_${id}`);
      if (!stored) return;
      const { name, type, dataUrl } = JSON.parse(stored);
      fetch(dataUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const file = new File([blob], name, { type });
          setFileToSend(file);
          // Only detect if not already known (persisted from previous session)
          const alreadyKnown = (() => { try { const s = sessionStorage.getItem(`simu_doc_detection_${id}`); if (!s) return false; const p = JSON.parse(s); return p[name]?.is_ris !== null && p[name]?.is_ris !== undefined; } catch { return false; } })();
          if (!alreadyKnown) detectDocType(file);
        })
        .catch(() => sessionStorage.removeItem(`simu_file_to_send_${id}`));
    } catch {
      sessionStorage.removeItem(`simu_file_to_send_${id}`);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist docTypeDetection to sessionStorage (skip loading states)
  useEffect(() => {
    if (!id) return;
    try {
      const toSave = {};
      Object.entries(docTypeDetection).forEach(([k, v]) => { if (!v.loading) toSave[k] = v; });
      sessionStorage.setItem(`simu_doc_detection_${id}`, JSON.stringify(toSave));
    } catch { /* noop */ }
  }, [docTypeDetection, id]);

  // Persist IA uncertainties so the "note IA" flags survive a page reload.
  useEffect(() => {
    if (!id || id !== uncertClientId) return;
    try {
      sessionStorage.setItem(`simu_uncert_${id}`, JSON.stringify(uncertaintiesByYear));
      sessionStorage.setItem(`simu_uncert_synthese_${id}`, JSON.stringify(syntheseUncertainties));
    } catch { /* noop */ }
  }, [uncertaintiesByYear, syntheseUncertainties, id, uncertClientId]);

  // Sync orderedDocs when userDocuments changes (preserve existing order, append new)
  useEffect(() => {
    const dossier10 = userDocuments.filter((d) => Number(d.dossier) === 10);
    setOrderedDocs((prev) => {
      const prevIds = prev.map((d) => d.id);
      const kept = prev.filter((d) => dossier10.some((x) => x.id === d.id));
      const added = dossier10.filter((d) => !prevIds.includes(d.id));
      return [...kept, ...added];
    });
  }, [userDocuments]);

  const handleDragEnd = useCallback((result) => {
    if (!result.destination) return;
    setOrderedDocs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      return next;
    });
  }, []);

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
  const parsePdfAndFillCarriere = useCallback(async (file, preloadedPayload = null) => {
    if (!file && !preloadedPayload) return;

    if (!preloadedPayload) {
      const authRole = localStorage.getItem("role");
      if (authRole === "Consultant" && !accessGranted) {
        try {
          const verifyRes = await api.post("/v1/consultant-access/verify");
          if (verifyRes.status === 200) {
            setAccessGranted(true);
            setIdentiteReset(false);
            const { remaining_credits, access_type } = verifyRes.data;
            if (access_type === "credits" && remaining_credits !== null) {
              toast.info(`1 crédit consommé — Solde restant : ${remaining_credits} crédit${remaining_credits !== 1 ? "s" : ""}`);
            } else if (access_type === "unlimited_pass") {
              toast.info("Accès pass illimité ✓");
            }
          }
        } catch (err) {
          const backendMsg = err?.response?.data?.error || "Accès refusé : crédits insuffisants ou pass expiré.";
          const msg = `${backendMsg} Veuillez contacter Jean-François Chauffété pour recharger vos crédits.`;
          toast.error(msg);
          return;
        }
      }
    }

    setIsParsingRIS(true);
    toast.info(preloadedPayload ? "Application des données extraites…" : "Analyse du RIS en cours… (peut prendre 1-2 minutes)", { autoClose: false, toastId: "ris-parsing" });
    try {
      const payload = preloadedPayload || await fetchRISAnalysisV6(file);
      setLastRisPayload(payload);

      // ── Auto-fill user profile from RIS profil (if fields are missing) ──
      const profilRIS = payload?.profil;
      if (profilRIS) {
        const nirFromProfil = profilRIS.numero_secu || profilRIS.numero_securite_sociale || profilRIS.numero_ss;
        const profileUpdates = {};
        if (!user?.secu_social && nirFromProfil) profileUpdates.secu_social = nirFromProfil;
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

        // 2bis. Uncertainties par année (IA "hésitations") + synthese/profil
        const uncertByYear = {};
        carriereRaw.forEach((entry) => {
          if (!entry || !entry.annee) return;
          const u = entry.uncertainties;
          if (u && typeof u === "object" && Object.keys(u).length) {
            uncertByYear[entry.annee] = u;
          }
        });
        const syntheseU = {
          ...(payload?.synthese?.uncertainties || {}),
          ...(payload?.profil?.uncertainties || {}),
        };
        setUncertaintiesByYear(uncertByYear);
        setSyntheseUncertainties(syntheseU);

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

        // 3. Points par année — résolus via le registre des régimes
        //    CIPAV reste à part (split base/complémentaire vers cnavplRows).
        //    Tout autre régime (connu ou non) atterrit dans row.regimes via resolveRegime.
        // n8n renvoie `entry.points` en OBJET ({ agirc_arrco, cipav_base, … }) ;
        // parseCarrierePoints accepte aussi la forme tableau historique. Cf. bug
        // COCHIN (1698) : l'ancien code testait Array.isArray(points) et sautait
        // tout quand points était un objet (points non insérés + trous revenu=0).
        const { cipavBaseN, cipavComplN, regimePtsByYear } = parseCarrierePoints(carriereRaw);
        if (Object.keys(regimePtsByYear).length) {
          setCarriereRows(prev => prev.map(row => {
            const yearRegimes = regimePtsByYear[row.yr];
            if (!yearRegimes) return row;
            const newRegimes = { ...(row.regimes || {}), ...yearRegimes };
            const u = { regimes: newRegimes };
            // Mirror to legacy fields for the 3 mapped keys
            if (yearRegimes.AGIRC_ARRCO != null) u.agircPts = yearRegimes.AGIRC_ARRCO;
            if (yearRegimes.IRCANTEC    != null) u.ircPts   = yearRegimes.IRCANTEC;
            if (yearRegimes.RCI         != null) u.rciPts   = yearRegimes.RCI;
            return { ...row, ...u };
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

        // 4. Synthèse globale — structure imbriquée par régime, alignée sur handleGeler (L1938+)
        const synthese = payload.synthese || {};
        if (synthese.trimestres_total || synthese.points) {
          const pts = synthese.points || {};
          const cipavBase = pts.cipav_base ?? null;
          const cipavCompl = pts.cipav_complementaire ?? null;
          setDroitsSynthese({
            trimestres_total: synthese.trimestres_total,
            ...(pts.agirc_arrco != null && { agirc_arrco: { points_total: pts.agirc_arrco } }),
            ...(pts.ircantec    != null && { ircantec:    { points_total: pts.ircantec    } }),
            ...(pts.rci         != null && { rci:         { points_total: pts.rci         } }),
            ...((cipavBase != null || cipavCompl != null) && {
              cipav: {
                points_base: cipavBase ?? 0,
                points_complementaire: cipavCompl ?? 0,
              },
            }),
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

        // Résoudre chaque entrée via le registre des régimes — CARPIMKO et co tombent dans row.regimes
        const regimePtsByYearLegacy = {};
        detail_annuel.forEach((entry) => {
          const yr = parseInt(entry.annee, 10);
          const pts = parseFloat(entry.points_acquis) || 0;
          if (!yr || !pts) return;
          // CIPAV is handled by the cipavEntries block above; skip here to avoid double-counting
          if ((entry.regimes_concernes || "").toLowerCase().includes("cipav")) return;
          const resolved = resolveRegime(entry.regimes_concernes || "");
          if (!resolved) return;
          if (!regimePtsByYearLegacy[yr]) regimePtsByYearLegacy[yr] = {};
          regimePtsByYearLegacy[yr][resolved.key] = (regimePtsByYearLegacy[yr][resolved.key] || 0) + pts;
        });
        if (Object.keys(regimePtsByYearLegacy).length) {
          setCarriereRows(prev => prev.map(row => {
            const yearRegimes = regimePtsByYearLegacy[row.yr];
            if (!yearRegimes) return row;
            const newRegimes = { ...(row.regimes || {}), ...yearRegimes };
            const updates = { regimes: newRegimes };
            if (yearRegimes.AGIRC_ARRCO != null) updates.agircPts = yearRegimes.AGIRC_ARRCO;
            if (yearRegimes.IRCANTEC    != null) updates.ircPts   = yearRegimes.IRCANTEC;
            if (yearRegimes.RCI         != null) updates.rciPts   = yearRegimes.RCI;
            return { ...row, ...updates };
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
      setProjectionSurcote(0);
      setProjRegenNonce((n) => n + 1);
      if (cappedFromRIS > 0) {
        toast.info(
          `📏 ${cappedFromRIS} an${cappedFromRIS > 1 ? 's' : ''} au plafond SS (salaire SS = plafond ; revalorisation appliquée — cellules en rouge).`,
          { autoClose: 12000 }
        );
      }
      autoChainPendingRef.current = true;
    } catch (e) {
      toast.dismiss("ris-parsing");
      console.error("[parsePdfAndFillCarriere] erreur:", e?.response?.data || e?.message || e);
      toast.error("Erreur lors de l'analyse du RIS");
    } finally {
      setIsParsingRIS(false);
    }
  }, [applyCarriereData, id, onUserUpdate, user?.birth_date, user?.first_name, user?.last_name, user?.secu_social, accessGranted]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Détecte le type d'un fichier PDF (RIS ou autre) ──
  const detectDocType = useCallback(async (file) => {
    const name = file.name.toLowerCase();
    const supported = name.endsWith(".pdf") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp");
    if (!file || !supported) return;
    const filename = file.name;
    setDocTypeDetection(prev => ({ ...prev, [filename]: { loading: true, is_ris: null, doc_type: null } }));
    try {
      const result = await detectDocumentType(file, id, { nom: user?.last_name, prenom: user?.first_name, secu: user?.secu_social });
      docTypePayloads.current[filename] = result;
      setDocTypeDetection(prev => ({
        ...prev,
        [filename]: { loading: false, is_ris: result.is_ris === true, doc_type: result.doc_type || null },
      }));
    } catch {
      setDocTypeDetection(prev => ({ ...prev, [filename]: { loading: false, is_ris: null, doc_type: null } }));
    }
  }, [id, user?.last_name, user?.first_name, user?.secu_social]);

  // ── Analyse un document serveur : détecte le type puis extrait la carrière ──
  // preloadedFile lets external entry points (e.g. Documents tab "Analyse carrière")
  // skip the /downloadFile round-trip when the File is already in hand.
  const handleAnalyzeDoc = useCallback(async (doc, preloadedFile = null) => {
    const existing = docTypeDetection[doc.filename];
    if (existing?.loading) return;
    const downloadFile = async () => {
      if (preloadedFile) return preloadedFile;
      const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") }, responseType: "blob" };
      const response = await axios.get(`${global.config.server_url}/downloadFile?file_id=${doc.id}`, Config);
      return new File([response.data], doc.filename, { type: response.data.type || "application/pdf" });
    };
    if (existing?.is_ris === true) {
      try {
        const file = await downloadFile();
        setRisFileName(doc.filename);
        parsePdfAndFillCarriere(file);
      } catch { toast.error("Impossible de charger le document"); }
      return;
    }
    if (existing?.is_ris === false) {
      toast.info(`"${doc.filename}" n'est pas un RIS (${existing.doc_type || "document"}) — application des données extraites...`);
      const storedPayload = docTypePayloads.current[doc.filename];
      if (storedPayload) {
        parsePdfAndFillCarriere(null, storedPayload);
      } else {
        try {
          const file = await downloadFile();
          parsePdfAndFillCarriere(file);
        } catch { toast.error("Impossible de charger le document"); }
      }
      return;
    }
    try {
      setDocTypeDetection(prev => ({ ...prev, [doc.filename]: { loading: true, is_ris: null, doc_type: null } }));
      const file = await downloadFile();
      const detection = await detectDocumentType(file, id, { nom: user?.last_name, prenom: user?.first_name, secu: user?.secu_social });
      docTypePayloads.current[doc.filename] = detection;
      const isRisResult = detection.is_ris === true;
      setDocTypeDetection(prev => ({
        ...prev,
        [doc.filename]: { loading: false, is_ris: isRisResult, doc_type: detection.doc_type || null },
      }));
      if (isRisResult) {
        setRisFileName(doc.filename);
        parsePdfAndFillCarriere(file);
      } else {
        toast.info(`"${doc.filename}" n'est pas un RIS (${detection.doc_type || "document"}) — application des données extraites...`);
        parsePdfAndFillCarriere(null, detection);
      }
    } catch {
      setDocTypeDetection(prev => ({ ...prev, [doc.filename]: { loading: false, is_ris: null, doc_type: null } }));
      toast.error("Impossible d'analyser le document");
    }
  }, [docTypeDetection, id, risFileName, parsePdfAndFillCarriere]);

  // ── Analyse un bulletin de paie : extraction inline (V1 — affichage seul) ──
  // L'extraction bulletin est fusionnée dans le workflow "Détection Type Document"
  // (detectDocumentType) : la détection auto au drop renvoie déjà `bulletin`.
  // Cas normal → lecture instantanée du payload mis en cache. Après un reload (ref
  // docTypePayloads vidée) → fallback qui relance la détection (= ré-extrait le bulletin).
  // `source` est soit un File (upload manuel) soit un doc serveur ({ id, filename }).
  const analyzeBulletin = useCallback(async (filename, source) => {
    if (bulletinResults[filename]?.loading) return;
    const cached = docTypePayloads.current[filename];
    if (cached?.bulletin) {
      setBulletinResults(prev => ({ ...prev, [filename]: { loading: false, data: cached.bulletin, error: null } }));
      return;
    }
    setBulletinResults(prev => ({ ...prev, [filename]: { loading: true, data: null, error: null } }));
    toast.info("Analyse du bulletin en cours…", { autoClose: false, toastId: `bulletin-${filename}` });
    try {
      let file = source;
      if (!(source instanceof File)) {
        const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") }, responseType: "blob" };
        const response = await axios.get(`${global.config.server_url}/downloadFile?file_id=${source.id}`, Config);
        file = new File([response.data], source.filename, { type: response.data.type || "application/pdf" });
      }
      const payload = await detectDocumentType(file, id, { nom: user?.last_name, prenom: user?.first_name, secu: user?.secu_social });
      docTypePayloads.current[filename] = payload;
      const data = payload?.bulletin || null;
      setBulletinResults(prev => ({ ...prev, [filename]: { loading: false, data, error: data ? null : "Aucune donnée extraite" } }));
      toast.dismiss(`bulletin-${filename}`);
      if (data) toast.success(`Bulletin analysé${data.employeur ? ` — ${data.employeur}` : ""}`);
      else toast.warn("Aucune donnée de bulletin extraite");
    } catch {
      setBulletinResults(prev => ({ ...prev, [filename]: { loading: false, data: null, error: "Erreur d'analyse" } }));
      toast.dismiss(`bulletin-${filename}`);
      toast.error("Erreur lors de l'analyse du bulletin");
    }
  }, [bulletinResults, id, user?.last_name, user?.first_name, user?.secu_social]);

  // ── Rendu de la section bulletin de paie (badge + bouton, ou récap extrait) ──
  // Mutualisé entre les deux blocs (doc serveur + fichier uploadé manuellement).
  const renderBulletinSection = useCallback((filename, source) => {
    const bull = bulletinResults[filename];
    if (bull?.data) {
      const d = bull.data;
      const fmt = (v) => (v || v === 0) ? Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : null;
      const periode = d.periode || [d.mois, d.annee].filter(Boolean).join(" ");
      const salarieName = d.salarie ? `${d.salarie.prenom || ""} ${d.salarie.nom || ""}`.trim() : "";
      return (
        <div style={{ marginTop: 6, fontSize: 11, color: "#2d3436", background: "#7367f014", borderRadius: 6, padding: "5px 8px", lineHeight: 1.5 }}>
          {salarieName && <div style={{ fontWeight: 700, color: "#7367f0" }}>{salarieName}</div>}
          {d.employeur && <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.employeur}</div>}
          {periode && <div>Période : {periode}</div>}
          {fmt(d.brut) && <div>Brut (mois) : {fmt(d.brut)} €</div>}
          {fmt(d.net_a_payer) && <div style={{ fontWeight: 700 }}>Net à payer (mois) : {fmt(d.net_a_payer)} €</div>}
          {d.cumul && fmt(d.cumul.brut_annuel) && <div style={{ marginTop: 2, color: "#636e72" }}>Cumul brut année : {fmt(d.cumul.brut_annuel)} €</div>}
          {d.cumul && fmt(d.cumul.net_imposable_annuel) && <div style={{ color: "#636e72" }}>Cumul net imposable : {fmt(d.cumul.net_imposable_annuel)} €</div>}
          {d.nb_bulletins_detectes > 1 && <div style={{ marginTop: 3, color: "#E17055", fontSize: 10, fontWeight: 600 }}>⚠️ {d.nb_bulletins_detectes} bulletins dans le PDF — gardé : {salarieName || "le 1er"}</div>}
        </div>
      );
    }
    return (
      <button
        onClick={(e) => { e.stopPropagation(); analyzeBulletin(filename, source); }}
        disabled={bull?.loading}
        style={{ marginTop: 6, background: bull?.loading ? "#a29bfe" : "#7367f0", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 13, fontWeight: 700, cursor: bull?.loading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, width: "100%", transition: "all 0.2s ease" }}
      >
        {bull?.loading ? (<><span className="spinner-border spinner-border-sm" style={{ width: "0.6rem", height: "0.6rem", borderWidth: "0.15em" }} role="status" />Extraction en cours…</>) : "🚀 Analyser ce bulletin"}
      </button>
    );
  }, [bulletinResults, analyzeBulletin]);

  // ── Rapprochement RIS / bulletin : déclenché par bouton, calcul déterministe ──
  // Docs réellement présents dans la liste (pas les détections fantômes persistées).
  const presentDocNames = Array.from(new Set(orderedDocs.map((d) => d.filename).concat(fileToSend ? [fileToSend.name] : [])));
  // Bulletins ANALYSÉS (clic "Analyser ce bulletin" → bulletinResults), présents dans la liste.
  const nbBulletinsAnalyses = presentDocNames.filter((n) => bulletinResults[n] && bulletinResults[n].data).length;
  const risAnalyse = carriereRows.some((r) => (Number(r.ss) || Number(r.sal) || 0) > 0);
  // Carte affichée seulement quand RIS analysé ET ≥1 bulletin analysé.
  const canRapprocher = risAnalyse && nbBulletinsAnalyses > 0;
  const handleRapprocher = useCallback(async () => {
    const present = Array.from(new Set(orderedDocs.map((d) => d.filename).concat(fileToSend ? [fileToSend.name] : [])));
    const bulletins = present
      .filter((n) => bulletinResults[n] && bulletinResults[n].data)
      .map((n) => {
        const b = bulletinResults[n].data;
        return {
          filename: n,
          annee: b.annee,
          brutAnnuel: (b.cumul && b.cumul.brut_annuel != null) ? b.cumul.brut_annuel : null,
          netImposableAnnuel: (b.cumul && b.cumul.net_imposable_annuel != null) ? b.cumul.net_imposable_annuel : null,
          salarie: b.salarie,
          employeur: b.employeur,
          periode: b.periode,
        };
      });
    const res = computeRapprochementRisBulletin(carriereRows, bulletins);
    if (!res.ecarts.length) {
      toast.info("Aucun bulletin avec cumul annuel exploitable.");
      setRapprochement({ ...res, constat: null, constatLoading: false, constatError: false });
      return;
    }
    setRapprochement({ ...res, constat: null, constatLoading: true, constatError: false });
    try {
      const constat = await fetchRapprochementConstat(
        { ecarts: res.ecarts, client: { nom: user?.last_name, prenom: user?.first_name } },
        id
      );
      setRapprochement({ ...res, constat, constatLoading: false, constatError: false });
      // Couche 3 (CDC) : persister l'analyse dans analysis_reports (silencieux).
      saveSkillResult(id, "RAPPROCHEMENT_BULLETIN", { ...res, constat, alertes: res.ecarts.filter((e) => e.niveau === "ROUGE" || e.niveau === "ORANGE") });
    } catch {
      setRapprochement({ ...res, constat: null, constatLoading: false, constatError: true });
      toast.error("Constat IA indisponible.");
      saveSkillResult(id, "RAPPROCHEMENT_BULLETIN", { ...res, alertes: res.ecarts.filter((e) => e.niveau === "ROUGE" || e.niveau === "ORANGE") });
    }
  }, [carriereRows, orderedDocs, fileToSend, bulletinResults, user?.last_name, user?.first_name, id]);

  // ── 2c-B : appliquer les corrections (bulletin) à la carrière ──
  const handleApplyCorrections = useCallback(() => {
    if (!rapprochement || !rapprochement.ecarts) return;
    const corrections = rapprochement.ecarts
      .filter((e) => (e.niveau === "ROUGE" || e.niveau === "ORANGE") && e.brutBulletin != null)
      .map((e) => {
        const row = carriereRows.find((r) => r.yr === e.annee);
        const oldSal = row ? (Number(row.sal) || 0) : 0;
        return { annee: e.annee, oldSal, newSal: Math.max(oldSal, e.brutBulletin) };
      })
      .filter((c) => c.newSal > c.oldSal);
    if (!corrections.length) { toast.info("Aucune correction à appliquer."); return; }
    setApplyConfirm({ corrections });
  }, [rapprochement, carriereRows]);

  const confirmApplyCorrections = useCallback(() => {
    const corrections = (applyConfirm && applyConfirm.corrections) || [];
    const byYear = {};
    corrections.forEach((c) => { byYear[c.annee] = c.newSal; });
    setCarriereRows((prev) => prev.map((r) => {
      if (byYear[r.yr] != null) {
        const sal = byYear[r.yr];
        const pass = PLAFONDS_SS[r.yr] != null ? PLAFONDS_SS[r.yr] : sal;
        return { ...r, sal, ss: Math.min(sal, pass), corrige_bulletin: true };
      }
      return r;
    }));
    if (carriereValidee) setCarriereValidee(false); // déverrouille la carrière validée
    setApplyConfirm(null);
    setRapprochement(null); // le rapprochement devient obsolète après correction
    toast.success(`Carrière corrigée (${corrections.length} année(s)) et déverrouillée. Re-valider puis relancer le calcul pour le montant exact.`);
  }, [applyConfirm, carriereValidee]);

  // Listen for files routed in from the Documents tab ("Analyse carrière").
  // Documents.js downloads the file and dispatches `careerAnalysisFileReady` with
  // its dataUrl — we rebuild the File and feed handleAnalyzeDoc directly so the
  // carrière grid auto-fills without the user having to click anywhere else.
  useEffect(() => {
    if (!id) return;
    const handler = async (event) => {
      const { clientId, fileId, fileData } = event.detail || {};
      if (clientId !== id || !fileData) return;
      try {
        const { name, type, dataUrl } = fileData;
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], name, { type });
        // Mark the file as selected so the workflow panels (career table) render —
        // hasDocuments is gated on fileToSend, exactly like the manual upload path.
        setFileToSend(file);
        await handleAnalyzeDoc({ id: fileId, filename: name }, file);
      } catch (e) {
        console.error("Failed to ingest careerAnalysisFileReady in simulator:", e);
      }
    };
    window.addEventListener("careerAnalysisFileReady", handler);
    return () => window.removeEventListener("careerAnalysisFileReady", handler);
  }, [id, handleAnalyzeDoc]);

  // Drag & drop ou clic → stocke le fichier RIS en mémoire (fileToSend)
  // ET l'uploade sur le serveur Laravel (/uploadFiles) pour historisation
  // Déclenche ensuite parsePdfAndFillCarriere → analyse n8n → remplit carriereRows
  const handleUpload = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles || !acceptedFiles.length || !id) return;
    const file = acceptedFiles[0];
    setFileToSend(file);
    // Détecte CHAQUE fichier déposé (multi-drop), pas seulement le 1er — appels n8n en parallèle, état keyé par filename.
    acceptedFiles.forEach((f) => detectDocType(f));

    // Persist to sessionStorage so the file survives a page refresh. Best-effort:
    // a large RIS can blow the ~5MB sessionStorage quota. The catch MUST live
    // inside onload — setItem runs async, after the surrounding try has exited.
    const reader = new FileReader();
    reader.onload = () => {
      try {
        sessionStorage.setItem(`simu_file_to_send_${id}`, JSON.stringify({
          name: file.name, type: file.type, dataUrl: reader.result,
        }));
      } catch (e) {
        // Quota exceeded (or storage disabled): drop any stale entry so the
        // post-refresh restore doesn't resurrect an outdated file.
        try { sessionStorage.removeItem(`simu_file_to_send_${id}`); } catch { /* noop */ }
      }
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("user_id", id);
      formData.set("dossier", "10");
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
        toast.success(files.length > 1 ? "Documents importés" : "Document importé");
        fetchUserDocuments(); // refresh list — dossier=10 filter handles display
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

  // Suppression d'un document RIS uploadé (serveur Laravel + state local)
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

  // ── Livrables helpers ──

  const cleanChainOfThought = useCallback((raw) => {
    if (!raw || typeof raw !== "string") return raw;

    // Stratégie 1 : HTML wrappé dans ```html ... ```
    const htmlBlockMatch = raw.match(/```html\s*([\s\S]*?)```/i);
    if (htmlBlockMatch) return htmlBlockMatch[1].trim();

    // Stratégie 2 : tout texte avant le premier tag HTML structurel → strip si > 50 chars
    const htmlStartIdx = raw.search(/<(!DOCTYPE|html|div|section|table|h[1-6]|p\s)/i);
    if (htmlStartIdx > 50) {
      return raw.slice(htmlStartIdx).trim();
    }

    // Stratégie 3 : strip les lignes [Step N: / [Étape N:
    const lines = raw.split("\n");
    const hasCot = lines.some(
      (l) => /^\s*\[(step|étape|etape)\s*\d/i.test(l) || /^\s*\*\*(step|étape|etape)\s*\d/i.test(l)
    );
    if (hasCot) {
      return lines
        .filter((l) => !/^\s*\[(step|étape|etape)\s*\d/i.test(l))
        .join("\n")
        .trim();
    }

    // Stratégie 4 : strip balises <scratchpad>...</scratchpad> injectées par certains modèles
    return raw.replace(/<scratchpad>[\s\S]*?<\/scratchpad>/gi, "").trim();
  }, []);

  const handleDownloadReportHtml = useCallback((doc) => {
    const content = doc?.htmlContent;
    if (!content) { toast.error("Contenu HTML non disponible"); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: "text/html;charset=utf-8" }));
    a.download = `${(doc.name || "rapport").replace(/[^a-z0-9_\-]/gi, "_")}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const handleDownloadReportPdf = useCallback(async () => {
    if (!viewingDoc) { toast.error("Aucun document sélectionné"); return; }

    const htmlContent = viewingDoc.htmlContent;

    if (htmlContent) {
      try {
        toast.info("Génération du PDF en cours...");
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = "-9999px";
        container.style.top = "0";
        container.style.width = "794px";
        container.style.backgroundColor = "white";
        container.style.color = "black";
        container.style.boxSizing = "border-box";
        container.style.padding = "0";
        container.style.margin = "0";
        const resetStyle = `<style>html,body{margin:0;padding:0;background:white;}*{box-sizing:border-box;}</style>`;
        const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*)<\/head>/i);
        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        container.innerHTML = resetStyle + (headMatch ? headMatch[1] : "") + (bodyMatch ? bodyMatch[1] : htmlContent);
        document.body.appendChild(container);
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        let imgWidth = pdfWidth;
        let imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        if (imgHeight > pdfHeight) { imgHeight = pdfHeight; imgWidth = (imgProps.width * pdfHeight) / imgProps.height; }
        pdf.addImage(imgData, "JPEG", (pdfWidth - imgWidth) / 2, 0, imgWidth, imgHeight);
        const safeName = (viewingDoc.name || "rapport").replace(/[^a-zA-Z0-9À-ÿ\s\-_]/g, "").trim();
        pdf.save(`${safeName}.pdf`);
        document.body.removeChild(container);
        toast.success("PDF téléchargé avec succès !");
      } catch (err) {
        console.error("Erreur génération PDF:", err);
        toast.error("Erreur lors de la génération du PDF");
      }
      return;
    }

    if (viewingDoc.url) {
      try {
        toast.info("Récupération du document...");
        const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
        const response = await axios.post(`${global.config.server_url}/fetch-html`, { url: viewingDoc.url }, Config);
        if (!response.data?.html) throw new Error("Contenu HTML vide");
        const fetched = response.data.html;
        toast.info("Génération du PDF...");
        const container = document.createElement("div");
        container.style.cssText = "position:absolute;left:-9999px;top:0;width:794px;background:white;color:black;box-sizing:border-box;padding:0;margin:0;";
        const resetStyle = `<style>html,body{margin:0;padding:0;background:white;}*{box-sizing:border-box;}</style>`;
        const headMatch = fetched.match(/<head[^>]*>([\s\S]*)<\/head>/i);
        const bodyMatch = fetched.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        container.innerHTML = resetStyle + (headMatch ? headMatch[1] : "") + (bodyMatch ? bodyMatch[1] : fetched);
        document.body.appendChild(container);
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        let imgWidth = pdfWidth;
        let imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        if (imgHeight > pdfHeight) { imgHeight = pdfHeight; imgWidth = (imgProps.width * pdfHeight) / imgProps.height; }
        pdf.addImage(imgData, "JPEG", (pdfWidth - imgWidth) / 2, 0, imgWidth, imgHeight);
        const safeName = (viewingDoc.name || "rapport").replace(/[^a-zA-Z0-9À-ÿ\s\-_]/g, "").trim();
        pdf.save(`${safeName}.pdf`);
        document.body.removeChild(container);
        toast.success("PDF téléchargé avec succès !");
      } catch (err) {
        console.error("Erreur téléchargement PDF backend:", err);
        toast.error("Erreur lors du téléchargement du PDF. Veuillez régénérer le document.");
      }
      return;
    }

    toast.error("Aucun contenu disponible pour générer le PDF.");
  }, [viewingDoc]);

  const handleSaveReport = useCallback(async (doc) => {
    if (!doc?.htmlContent) { toast.error("Aucun contenu à sauvegarder"); return; }
    const fileName = `Rapport_Modifie_${Date.now()}.html`;
    const blob = new Blob([doc.htmlContent], { type: "text/html;charset=utf-8" });
    const uploadForm = new FormData();
    uploadForm.append("user_id", id);
    uploadForm.append("photoUpload0", blob, fileName);
    try {
      const res = await axios.post(`${global.config.server_url}/uploadFiles`, uploadForm, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
          "Content-Type": "multipart/form-data",
        },
      });
      const newUrl = res?.data?.files?.[0]?.url;
      if (!newUrl) throw new Error("Pas d'URL renvoyée");

      // Persistance DB selon le type — assure que les édits survivent à un reload (EOR-61).
      const updatedDoc = { ...doc, url: newUrl, htmlContent: doc.htmlContent };
      if (doc.type === "rapport_consultation") {
        await saveSkillResult(id, "RAPPORT_CONSULTATION", updatedDoc);
      } else if (doc.type === "simulation_retraite") {
        try { await updateSimulationHtml(parseInt(id), doc.htmlContent); }
        catch (e) { console.warn("updateSimulationHtml failed:", e); }
      }

      setGeneratedDocs((prev) =>
        prev.map((d) => d.id === doc.id ? { ...d, url: newUrl, htmlContent: doc.htmlContent } : d)
      );
      setViewingDoc((prev) => prev?.id === doc.id ? { ...prev, url: newUrl, htmlContent: doc.htmlContent } : prev);
      toast.success("Modifications enregistrées");
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  }, [id]);

  // Génère le rapport de consultation retraite via n8n (webhook f012dfc7).
  // CDC V2 : frontend → backend → n8n (plus d'appel direct n8n depuis le front).
  // Backend forward le PDF à n8n en multipart. n8n inchangé.
  const handleGenerateRapportConsultation = useCallback(async () => {
    // Guard : exiger qu'au moins un calcul de dispositif ait tourné avant de générer le livrable.
    // Évite que le consultant produise un rapport sur des données figées sans avoir lancé les calculs.
    if (!scenarioSkillResults || Object.keys(scenarioSkillResults).length === 0) {
      toast.error("Lance d'abord les calculs (bouton 🚀 Calculer toutes les pensions) avant de générer le rapport.");
      return;
    }
    // Flag pending — survit à la navigation, repris par le polling au mount (EOR-61)
    try { localStorage.setItem(`gen_pending_RAPPORT_CONSULTATION_${id}`, JSON.stringify({ startedAt: Date.now() })); } catch {}
    // Auto-récupération du RIS si fileToSend est vide. Si aucun PDF n'existe
    // côté client, on continue sans fichier : le backend transmettra
    // frozen_data + calculs via simulateur_context et n8n générera le rapport
    // depuis les données saisies manuellement.
    let risFile = fileToSend;
    if (!risFile) {
      const pdfDoc = userDocuments.find((d) =>
        (d.filename || "").toLowerCase().endsWith(".pdf")
      );
      if (pdfDoc) {
        try {
          toast.info("Récupération automatique du RIS…");
          const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") }, responseType: "blob" };
          const response = await axios.get(`${global.config.server_url}/downloadFile?file_id=${pdfDoc.id}`, Config);
          const blob = response.data;
          risFile = new File([blob], pdfDoc.filename, { type: blob.type || "application/pdf" });
          setFileToSend(risFile);
        } catch {
          toast.warning("Impossible de récupérer le RIS — génération à partir des données du simulateur.");
        }
      } else {
        toast.info("RIS non détecté — génération à partir des données saisies.");
      }
    }

    setIsGeneratingReport(true);
    if (cancelReportRef.current) cancelReportRef.current.cancel();
    cancelReportRef.current = axios.CancelToken.source();

    try {
      const displayName = user
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
        : "Client";

      const childrenCount = user?.children_number ?? "";
      const birthDate = user?.birth_date ?? "";
      const nir = user?.secu_social ?? "";
      const message = [
        "Thématiques d'analyse : Rapport de consultation retraite",
        `Nombre d'enfants : ${childrenCount}`,
        `Date de naissance : ${birthDate}`,
        `NIR : ${nir}`,
      ].join("\n");

      const formData = new FormData();
      if (risFile) formData.append("file", risFile);
      formData.append("message", message);
      formData.append("client_id", id);
      formData.append("nir", nir);
      if (hiddenSystemPrompt) formData.append("system_prompt", hiddenSystemPrompt);
      const rapportComment = (promptText || "").trim();
      if (rapportComment) {
        formData.append("user_context", rapportComment);
        toast.success("✓ Votre note sera utilisée pour ce rapport", { autoClose: 2500 });
        persistPromptNote(rapportComment);
      }

      toast.info("Génération du rapport de consultation en cours…");

      // Timeout client légèrement supérieur au timeout n8n côté backend (340s)
      // pour que le backend ait le temps de remonter une erreur explicite si n8n traîne.
      const backendRes = await axios.post(
        `${global.config.server_url}/v1/rapports/consultation`,
        formData,
        {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
            "Content-Type": "multipart/form-data",
          },
          cancelToken: cancelReportRef.current.token,
          timeout: 355000,
        }
      );

      if (backendRes.data && backendRes.data.success === false) {
        throw new Error(backendRes.data.error || "Le rapport n'a pas pu être généré.");
      }

      // Extraction contenu brut depuis réponse backend (data = réponse n8n)
      let raw = "";
      const n8nData = backendRes.data?.data;
      const root = Array.isArray(n8nData) ? n8nData[0] : n8nData;
      if (typeof root === "string") {
        raw = root;
      } else if (root && typeof root === "object") {
        raw = root.html_report || root.output || root.text || root.response || JSON.stringify(root);
      } else {
        raw = String(n8nData);
      }

      // Fix n8n 2.x : string JSON wrappée
      const trimmedRaw = raw.trim();
      if (trimmedRaw.charAt(0) === '"' && trimmedRaw.charAt(trimmedRaw.length - 1) === '"') {
        try { raw = JSON.parse(trimmedRaw); } catch (_) {}
      }
      if (raw.indexOf("\\n") !== -1) {
        raw = raw.split("\\n").join("\n").split("\\t").join("\t").split('\\"').join('"');
      }

      // Nettoyage chain-of-thought puis markdown
      let contentString = cleanChainOfThought(raw);
      contentString = contentString
        .replace(/^```html\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      // Wrap si texte brut
      if (
        !contentString.startsWith("<!DOCTYPE") &&
        !contentString.startsWith("<html") &&
        !/<\/[a-zA-Z]+>/.test(contentString)
      ) {
        contentString = `<html><body style="font-family:sans-serif;padding:20px">${contentString.replace(/\n/g, "<br>")}</body></html>`;
      }

      // Upload vers Laravel
      const fileName = `Rapport_Consultation_${Date.now()}.html`;
      const blob = new Blob([contentString], { type: "text/html;charset=utf-8" });
      const uploadForm = new FormData();
      uploadForm.append("user_id", id);
      uploadForm.append("photoUpload0", blob, fileName);

      let reportUrl = null;
      try {
        const uploadRes = await axios.post(
          `${global.config.server_url}/uploadFiles`,
          uploadForm,
          {
            headers: {
              Authorization: "Bearer " + localStorage.getItem("token"),
              "Content-Type": "multipart/form-data",
            },
            cancelToken: cancelReportRef.current.token,
          }
        );
        reportUrl = uploadRes?.data?.files?.[0]?.url || null;
        if (!reportUrl) throw new Error("Pas d'URL renvoyée");
      } catch (err) {
        console.error(err);
        toast.error("Rapport généré mais impossible de le sauvegarder sur le serveur.");
      }

      // Enforcement Gate #2 : alertes / arrêt critique renvoyés par le registre (backend).
      const rawAlertes = Array.isArray(backendRes.data?.alertes) ? backendRes.data.alertes : [];
      const displayAlertes = rawAlertes.map((a) => ({
        code: a.code,
        message: a.message,
        niveau: a.niveau === "CRITIQUE" ? "ROUGE" : "ORANGE",
      }));
      const arretCritique = backendRes.data?.arret_critique || null;

      const doc = {
        id: `rc_${Date.now()}`,
        name: `Rapport de consultation retraite de ${displayName}`,
        type: "rapport_consultation",
        createdAt: new Date().toISOString(),
        url: reportUrl,
        htmlContent: contentString,
        alertes: displayAlertes,
        arretCritique,
      };

      setGeneratedDocs((prev) => [doc, ...prev]);
      setViewingDoc(doc);

      // Persister la version post-traitée (chain-of-thought enlevée, fences strippés)
      // sur la ligne créée par le backend, plutôt que d'en créer une 2ème via POST.
      // Sans ça, on dupliquait analysis_reports à chaque génération et la suppression
      // ne nettoyait qu'une seule ligne → le rapport "revient" au F5.
      const backendReportId = backendRes?.data?.report_id;
      if (backendReportId) {
        try {
          await axios.put(
            `${global.config.server_url}/v1/analysis-reports/${backendReportId}`,
            { result_json: doc },
            { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
          );
        } catch (e) {
          // Échec rare : la ligne backend garde le rawHtml (chain-of-thought visible au F5).
          // On ne POST PAS de fallback : créer une 2ème ligne ré-introduirait le bug du doublon.
          console.warn("rapport_consultation: PUT update failed, F5 affichera la version brute", e?.response?.data || e?.message);
        }
      }

      if (arretCritique) {
        toast.error(`🚫 Livraison bloquée : ${arretCritique.raison || "incohérence critique détectée par le registre"}`, { autoClose: 8000 });
      } else if (displayAlertes.length > 0) {
        toast.warn(`⚠️ ${displayAlertes.length} alerte(s) de cohérence — voir le livrable`, { autoClose: 5000 });
        toast.success("Rapport de consultation généré avec succès");
      } else {
        toast.success("Rapport de consultation généré avec succès");
      }
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error("rapport_consultation generation failed:", err);
      const serverMsg = err?.response?.data?.error;
      const isTimeout = err?.code === "ECONNABORTED" || /timeout/i.test(err?.message || "");
      const msg = serverMsg
        || (isTimeout
            ? "Délai dépassé — le workflow IA est probablement toujours en cours côté n8n. Réessayez dans une minute."
            : (err?.message || "Erreur lors de la génération du rapport"));
      toast.error(msg, { autoClose: 8000 });
    } finally {
      setIsGeneratingReport(false);
      cancelReportRef.current = null;
      try { localStorage.removeItem(`gen_pending_RAPPORT_CONSULTATION_${id}`); } catch {}
    }
  }, [fileToSend, user, id, hiddenSystemPrompt, cleanChainOfThought, userDocuments, scenarioSkillResults, promptText]);

  // ── Simulation Retraite (appelle Laravel → n8n → HTML) ──────────────────────
  const handleGenerateSimulationRetraite = useCallback(async () => {
    if (!id) {
      toast.error("ID client manquant");
      return;
    }
    // Guard : exiger qu'au moins un calcul de dispositif ait tourné.
    if (!scenarioSkillResults || Object.keys(scenarioSkillResults).length === 0) {
      toast.error("Lance d'abord les calculs (bouton 🚀 Calculer toutes les pensions) avant de générer la simulation.");
      return;
    }
    setIsGeneratingSimulation(true);
    try { localStorage.setItem(`gen_pending_SIMULATION_RETRAITE_${id}`, JSON.stringify({ startedAt: Date.now() })); } catch {}
    if ((promptText || "").trim()) {
      toast.info("💬 Commentaire transmis à la Simulation retraite", { autoClose: 2500 });
    }
    try {
      const token = localStorage.getItem("token") || "";
      const resp = await fetch(`${global.config.server_url}/v1/simulation-retraite/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: id,
          user_context: (promptText || "").trim() || undefined,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Erreur serveur (${resp.status})`);
      }
      const result = await resp.json();
      if (!result.html_report) throw new Error("Rapport vide reçu — vérifiez les données carrière du client");

      // Enforcement Gate #2 : alertes / arrêt critique renvoyés par le registre d'erreurs
      // (évalués par le node VALIDATION GATE de n8n). niveau backend CRITIQUE/AVERTISSEMENT
      // → ROUGE/ORANGE pour les composants RegimeAlertes/RegimeArretCritique.
      const rawAlertes = Array.isArray(result.alertes) ? result.alertes : [];
      const displayAlertes = rawAlertes.map((a) => ({
        code: a.code,
        message: a.message,
        niveau: a.niveau === "CRITIQUE" ? "ROUGE" : "ORANGE",
      }));
      const arretCritique = result.arret_critique || null;

      const displayName = user
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
        : "Client";
      const doc = {
        id: `sim_${Date.now()}`,
        name: `Simulation retraite de ${displayName}`,
        type: "simulation_retraite",
        createdAt: new Date().toISOString(),
        url: null,
        htmlContent: result.html_report,
        alertes: displayAlertes,
        arretCritique,
      };
      // Remplace tout rapport simulation existant (un seul actif à la fois côté backend)
      setGeneratedDocs((prev) => [doc, ...prev.filter((d) => d.type !== "simulation_retraite")]);
      if (arretCritique) {
        toast.error(`🚫 Livraison bloquée : ${arretCritique.raison || "incohérence critique détectée par le registre"}`, { autoClose: 8000 });
      } else if (displayAlertes.length > 0) {
        toast.warn(`⚠️ ${displayAlertes.length} alerte(s) de cohérence — voir le livrable`, { autoClose: 5000 });
        toast.success("Simulation générée !");
      } else {
        toast.success("Simulation générée !");
      }
    } catch (err) {
      toast.error(err.message || "Erreur lors de la simulation");
    } finally {
      setIsGeneratingSimulation(false);
      try { localStorage.removeItem(`gen_pending_SIMULATION_RETRAITE_${id}`); } catch {}
    }
  }, [id, scenarioSkillResults, user, promptText]);

  const [isGeneratingAudit, setIsGeneratingAudit] = useState(false);

  // ── Audit Retraite (via backend → n8n, même pattern que simulation) ─────────
  const handleGenerateAuditRetraite = useCallback(async () => {
    if (!id) { toast.error("ID client manquant"); return; }
    if (!scenarioSkillResults || Object.keys(scenarioSkillResults).length === 0) {
      toast.error("Lance d'abord les calculs avant de générer l'audit.");
      return;
    }
    setIsGeneratingAudit(true);
    try { localStorage.setItem(`gen_pending_AUDIT_RETRAITE_${id}`, JSON.stringify({ startedAt: Date.now() })); } catch {}
    try {
      const auditComment = (promptText || "").trim();
      if (auditComment) {
        toast.success("✓ Votre note sera utilisée pour cet audit", { autoClose: 2500 });
        persistPromptNote(auditComment);
      }
      toast.info("Génération de l'audit retraite en cours… (peut prendre plusieurs minutes)");
      const token = localStorage.getItem("token") || "";
      const resp = await fetch(`${global.config.server_url}/v1/audit-retraite/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: id,
          user_context: auditComment || undefined,
        }),
        signal: AbortSignal.timeout(900000),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Erreur serveur (${resp.status})`);
      }
      const result = await resp.json();
      if (!result.html_report) throw new Error("Rapport vide reçu — vérifiez les données carrière du client");
      const displayName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "Client";
      const doc = {
        id: `audit_${Date.now()}`,
        name: `Audit retraite de ${displayName}`,
        type: "audit_retraite",
        createdAt: new Date().toISOString(),
        url: null,
        htmlContent: result.html_report,
      };
      setGeneratedDocs((prev) => [doc, ...prev.filter((d) => d.type !== "audit_retraite")]);
      toast.success("Audit retraite généré !");
    } catch (err) {
      toast.error(err?.message || "Erreur lors de l'audit");
    } finally {
      setIsGeneratingAudit(false);
      try { localStorage.removeItem(`gen_pending_AUDIT_RETRAITE_${id}`); } catch {}
    }
  }, [id, scenarioSkillResults, user, promptText, persistPromptNote]);

  // Derive doc availability from real uploaded documents
  const hasDocuments = userDocuments.some((d) => Number(d.dossier) === 10) || !!fileToSend;
  const checkReq = () => true; // requirements are met if we have a file
  const getMissing = () => [];

  const S = {
    card: { background: "#fff", borderRadius: 11, boxShadow: "0 1px 5px rgba(0,0,0,0.05)" },
    mono: { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" },
  };

  const toggleDispositif = (dispositifId) => {
    setActivatedDispositifs((prev) => {
      const next = prev.includes(dispositifId)
        ? prev.filter((d) => d !== dispositifId)
        : [...prev, dispositifId];
      try { localStorage.setItem(`simu_dispositifs_${id}`, JSON.stringify(next)); } catch {}
      return next;
    });
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
      const coeff = coeffRevalo[yr] || 1;
      const passEuro = PLAFONDS_SS[yr] || 48060;
      const isCapped = !checked || yr >= 2005;
      let salPlafonne, revalo, ssEur;
      if (yr <= 2001) {
        const passFrancs = passEuro * 6.55957;
        salPlafonne = isCapped ? Math.min(sal, passFrancs) : sal;
        revalo = Math.round((salPlafonne * coeff) / 6.55957);
        ssEur = Math.round(salPlafonne / 6.55957);
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
        const seuilTrimestre = yr <= 2001 ? (passEuro * 6.55957) / 4 : passEuro / 4;
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

  // Récap carrière par régime (lecture seule) indexé par code, pour injection
  // dans les accordéons "Détail par régime". Dérivé de l'état existant.
  const recapByCode = useMemo(() => {
    const list = buildRecapRegimes(carriereRows, {
      trimCot: trimCotState,
      trimAss: trimAssState,
      ar: arState,
    });
    return Object.fromEntries(list.map((r) => [r.code, r]));
  }, [carriereRows, trimCotState, trimAssState, arState]);

  // Récap CIPAV (vignettes lecture seule) depuis cnavplRows.
  const cipavRecap = useMemo(() => buildCipavRecap(cnavplRows), [cnavplRows]);

  const handleGeler = useCallback(async () => {
    if (!id) return;
    if (isCarriereEmpty) {
      toast.error("Remplissez au moins une ligne de carrière avant de valider.");
      return;
    }

    const authRole = localStorage.getItem("role");
    if (authRole === "Consultant" && !accessGranted) {
      setFrozenLoading(true);
      try {
        const verifyRes = await api.post("/v1/consultant-access/verify");
        if (verifyRes.status === 200) {
          setAccessGranted(true);
          setIdentiteReset(false);
        }
      } catch (err) {
        setFrozenLoading(false);
        const msg = err?.response?.data?.error || "Accès refusé : crédits insuffisants ou pass expiré.";
        toast.error(msg);
        return;
      }
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
          ...(row.regimes && Object.keys(row.regimes).length > 0 && { regimes: row.regimes }),   // forward-compat full régimes map (CARPIMKO, etc.)
          ...(row.projected && { projected: true }),   // additive: marks career-end projected years for the deliverable
          regimes_concernes: row.regimes_concernes || '',
          // Data Barrier (CDC règle 5) : année corrigée depuis un bulletin de paie → tracée.
          ...(row.corrige_bulletin && { source: "BULLETIN", modifie_par_consultant: true }),
        };
      });

      const totalCot = carriere.reduce((s, r) => s + (r.trimestres_cotises || 0), 0);
      const totalAss = carriere.reduce((s, r) => s + (r.trimestres_assimiles || 0), 0);
      // Durée d'assurance plafonnée à 4 trim/an (écrêtement RIS). Sommer
      // totalCot + totalAss sans ce plafond sur-compte les parcours mixtes
      // (salarié + indépendant la même année) et les assimilés empilés
      // (bug client 1708 : 166 au lieu de 158). Cf. sumTrimestresCapped.
      const totalAcquisPlafonne = sumTrimestresCapped(carriere);
      const totalTousRegimesPlafonne = sumTrimestresCapped(carriere, { includeRachetes: true });

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
        const totalTrim = sumTrimestresCapped([row]); // plafonné à 4/an
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
      // NIR parser : utilisé uniquement comme fallback pour le sexe
      // (la date de naissance vient exclusivement de la fiche client)
      // ────────────────────────────────────────────────────────
      const nir = lastRisPayload?.profil?.numero_securite_sociale
        || lastRisPayload?.profil?.numero_ss
        || user?.secu_social
        || "";
      const nirInfo = parseNIR(nir);

      const dateNaissanceFinale = user?.birth_date || "";

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
          // Sexe : priorité à la civilité explicite de la fiche (Madame/Mlle/Monsieur)
          // car le consultant peut l'avoir corrigée manuellement ; fallback sur NIR puis user.sexe.
          sexe: (() => {
            const civ = String(user?.civility || '').toLowerCase().trim();
            if (civ === 'madame' || civ === 'mme' || civ === 'mlle' || civ === 'mademoiselle') return 'F';
            if (civ === 'monsieur' || civ === 'mr' || civ === 'm.') return 'M';
            return nirInfo?.sexe || user?.sexe || null;
          })(),
          nombre_enfants: parseInt(
            user?.children_number
              ?? user?.profil?.children_number
              ?? user?.nombre_enfants
              ?? lastRisPayload?.profil?.nombre_enfants
              ?? 0,
            10
          ) || 0,
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
        // CARPIMKO (paramédicaux libéraux : Base + ASV + Complémentaire).
        // Source de vérité : carpimkoRows si rempli manuellement, sinon fallback automatique
        // sur carriereRows[].regimes.CARPIMKO|_ASV|_COMPL (populé par l'analyse RIS).
        carpimko: (() => {
          const fromRows = Object.entries(carpimkoRows)
            .filter(([_, row]) => row.points_base || row.points_asv || row.points_compl)
            .map(([yr, row]) => ({
              annee: parseInt(yr),
              points_base: parseFloat(row.points_base) || 0,
              points_asv: parseFloat(row.points_asv) || 0,
              points_complementaire: parseFloat(row.points_compl) || 0,
            }));
          if (fromRows.length) return fromRows;
          // Fallback : extraire directement de la carrière
          return carriereRows
            .filter(row => {
              const r = row.regimes || {};
              return (r.CARPIMKO || r.CARPIMKO_ASV || r.CARPIMKO_COMPL);
            })
            .map(row => {
              const r = row.regimes || {};
              return {
                annee: parseInt(row.yr ?? row.annee),
                points_base: parseFloat(r.CARPIMKO) || 0,
                points_asv: parseFloat(r.CARPIMKO_ASV) || 0,
                points_complementaire: parseFloat(r.CARPIMKO_COMPL) || 0,
              };
            });
        })(),
        // Tier 1 régimes (CARMF, CAVP, CARPV, ...) : map générique
        regimes_points: regimesPoints,
        alertes: [],
        totaux: {
          trimestres_cotises: totalCot,
          trimestres_assimiles: totalAss,
          trimestres_total: totalAcquisPlafonne,
          // Trimestres officiels RIS prioritaires sur la somme plafonnée calculée
          trimestres_tous_regimes: risTrimTousRegimes ?? totalTousRegimesPlafonne,
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
            carpimko: (() => {
              // Privilégie carpimkoRows (saisie manuelle), sinon fallback sur carriereRows[].regimes
              let base = Object.values(carpimkoRows).reduce((s, r) => s + (parseFloat(r.points_base) || 0), 0);
              let asv = Object.values(carpimkoRows).reduce((s, r) => s + (parseFloat(r.points_asv) || 0), 0);
              let compl = Object.values(carpimkoRows).reduce((s, r) => s + (parseFloat(r.points_compl) || 0), 0);
              if (base === 0 && asv === 0 && compl === 0) {
                carriereRows.forEach(row => {
                  const r = row.regimes || {};
                  base += parseFloat(r.CARPIMKO) || 0;
                  asv += parseFloat(r.CARPIMKO_ASV) || 0;
                  compl += parseFloat(r.CARPIMKO_COMPL) || 0;
                });
              }
              return {
                points_base: base,
                valeur_point_base: droitsSynthese?.carpimko?.valeur_point_base || 0.5860,
                points_asv: asv,
                valeur_point_asv: droitsSynthese?.carpimko?.valeur_point_asv || 5.4500,
                points_complementaire: compl,
                valeur_point_complementaire: droitsSynthese?.carpimko?.valeur_point_complementaire || 11.30,
              };
            })(),
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

      // Frozen_data is now the source of truth — drop the local working draft.
      try { localStorage.removeItem(CAREER_DRAFT_KEY(id)); } catch { /* noop */ }

      setLastRisPayload(null);

      setCarriereValidee(true);
      setLockedAt(now);
      setLockedBy(consultantId);
      toast.success("Carrière gelée — calculs CNAV, AGIRC-ARRCO, IRCANTEC, RCI et CIPAV disponibles");
      setExpandedPanel("dispositifs");
      setSelectedAction(null);
      setExecuted(null);
      setAutoDateSignal((n) => n + 1); // déclenche l'auto-sélection de date si une projection a été posée
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
  }, [id, carriereRows, revaloValues, deplafValues, trimCotState, trimAssState, user, cnavplRows, carpimkoRows, droitsSynthese, risCarriereSynthese, isCarriereEmpty, accessGranted]);

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
    // CARPIMKO : ne calculer que si le client a effectivement des points (optimisation)
    const hasCarpimkoPoints = Object.values(carpimkoRows).some(r => r.points_base || r.points_asv || r.points_compl);
    if (hasCarpimkoPoints) {
      setCarpimkoLoading(true);
      setCarpimkoError(null);
      setCarpimkoResult(null);
    }
    // Tier 1 : repérer les régimes simples avec des points (zéro appel si vide)
    const tier1Active = Object.keys(REGIMES_SIMPLES).filter(code => {
      const pts = regimesPoints[code] || {};
      return Object.values(pts).some(v => parseFloat(v) > 0);
    });
    if (tier1Active.length) {
      setRegimesSimplesLoading(prev => ({ ...prev, ...Object.fromEntries(tier1Active.map(c => [c, true])) }));
      setRegimesSimplesErrors({});
    }
    try {
      const carpimkoSums = {
        points_base: Math.round(Object.values(carpimkoRows).reduce((s, r) => s + (parseFloat(r.points_base) || 0), 0) * 100) / 100,
        points_asv: Math.round(Object.values(carpimkoRows).reduce((s, r) => s + (parseFloat(r.points_asv) || 0), 0) * 100) / 100,
        points_complementaire: Math.round(Object.values(carpimkoRows).reduce((s, r) => s + (parseFloat(r.points_compl) || 0), 0) * 100) / 100,
      };
      const calls = [
        executeScript("CNAV", id, ""),
        executeScript("AGIRC_ARRCO", id, ""),
        executeScript("IRCANTEC", id, ""),
        executeScript("RCI", id, ""),
        executeScript("CIPAV", id, ""),
      ];
      if (hasCarpimkoPoints) calls.push(executeScript("CARPIMKO", id, "Calcul CARPIMKO unifié — base + ASV + complémentaire", carpimkoSums));
      // Tier 1 : un appel par régime actif, scenario_params = points par pilier
      for (const code of tier1Active) calls.push(executeScript(code, id, `Calcul ${code}`, regimesPoints[code] || {}));
      const settled = await Promise.allSettled(calls);
      const [cnavRes, agircRes, ircantecRes, rciRes, cipavRes, ...rest] = settled;
      const carpimkoRes = hasCarpimkoPoints ? rest.shift() : null;
      const tier1Results = rest; // dans l'ordre de tier1Active

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

      if (hasCarpimkoPoints && carpimkoRes) {
        if (carpimkoRes.status === "fulfilled") {
          setCarpimkoResult(carpimkoRes.value);
          saveSkillResult(id, "CARPIMKO", carpimkoRes.value);
          if (carpimkoRes.value.success === false && carpimkoRes.value.arret_critique) toast.error(carpimkoRes.value.arret_critique.raison || "Calcul CARPIMKO interrompu");
        } else {
          const msg = carpimkoRes.reason?.response?.data?.arret_critique?.raison || carpimkoRes.reason?.message || "Erreur réseau CARPIMKO";
          setCarpimkoError(msg);
          toast.error("Erreur calcul CARPIMKO");
        }
      }

      // Tier 1 : dispatch des résultats dans les maps génériques
      tier1Active.forEach((code, idx) => {
        const res = tier1Results[idx];
        if (!res) return;
        if (res.status === "fulfilled") {
          setRegimesSimplesResults(prev => ({ ...prev, [code]: res.value }));
          saveSkillResult(id, code, res.value);
          if (res.value?.arret_critique) toast.error(res.value.arret_critique.raison || `Calcul ${code} interrompu`);
        } else {
          const msg = res.reason?.response?.data?.arret_critique?.raison || res.reason?.message || `Erreur réseau ${code}`;
          setRegimesSimplesErrors(prev => ({ ...prev, [code]: msg }));
          toast.error(`Erreur calcul ${code}`);
        }
      });

      const scenarioCodes = ACTION_PANELS.dispositifs.actions
        .map(a => DISPOSITIF_TO_SKILL_CODE[a.id])
        .filter(Boolean);
      await Promise.allSettled(
        scenarioCodes.map(code => handleScenarioSkillExecute(code, {}))
      );
    } finally {
      setIsCalculatingAll(false);
      setSkillLoading(false);
      setAgircLoading(false);
      setIrcantecLoading(false);
      setRciLoading(false);
      setCipavLoading(false);
      setCarpimkoLoading(false);
      setRegimesSimplesLoading({});
    }
  };

  // Construit un item de scénario à partir d'une action, de son résultat
  // (le payload n8n complet) et des params saisis. Centralisé pour pouvoir
  // ré-utiliser au moment d'un recalcul (snapshot rafraîchi).
  const buildScenarioItem = useCallback((action, skillResultData, paramsOverride) => {
    const params = paramsOverride
      ?? (inputValues[action.id] != null && inputValues[action.id] !== ""
        ? { input: inputValues[action.id] }
        : {});
    return {
      dispositif_id: action.id,
      label: action.label,
      skill_code: DISPOSITIF_TO_SKILL_CODE[action.id] || null,
      params,
      result_summary: skillResultData ? {
        eligible: skillResultData.eligible ?? null,
        date_depart_estimee: skillResultData.date_depart_estimee
          || skillResultData.rp_result?.date_debut_rp_possible
          || skillResultData.cer_result?.date_cumul_possible
          || null,
        age_depart_possible: skillResultData.age_depart_possible ?? null,
        gain_mensuel: skillResultData.impact?.gain_mensuel ?? null,
      } : null,
      last_calc: skillResultData ?? null,
      last_calc_at: skillResultData ? new Date().toISOString() : null,
    };
  }, [inputValues]);

  // Met à jour le snapshot (params + résultat) d'un scénario déjà retenu.
  // Appelé après un recalcul pour persister le résultat le plus récent.
  // No-op si le dispositif n'est pas dans la liste.
  const refreshChosenScenarioSnapshot = useCallback(async (action, skillResultData, paramsOverride) => {
    if (!id) return;
    if (!chosenScenarios.some(s => s?.dispositif_id === action.id)) return;
    const next = chosenScenarios.map(s =>
      s?.dispositif_id === action.id
        ? buildScenarioItem(action, skillResultData, paramsOverride)
        : s
    );
    const previous = chosenScenarios;
    setChosenScenarios(next);
    try {
      const updated = await saveChosenScenarios(parseInt(id), next);
      const serverList = updated?.scenarios_choisis;
      if (Array.isArray(serverList)) setChosenScenarios(serverList);
    } catch (err) {
      setChosenScenarios(previous);
      // silencieux : le résultat reste affiché côté UI, juste pas re-persisté
    }
  }, [id, chosenScenarios, buildScenarioItem]);

  // Persiste la saisie (quotité/date) d'un dispositif DÉJÀ retenu directement
  // dans son `params`, dès la sortie du champ (onBlur) — indépendamment du
  // recalcul. Garantit que le livrable affiche toujours le paramètre saisi,
  // même si le calcul du dispositif échoue. No-op si le dispositif n'est pas retenu.
  const persistChosenDispositifInput = useCallback(async (action, rawValue) => {
    if (!id) return;
    const idx = chosenScenarios.findIndex(s => s?.dispositif_id === action.id);
    if (idx === -1) return; // pas encore retenu → la saisie sera capturée au moment de retenir
    const value = (rawValue ?? "").toString().trim();
    const existing = chosenScenarios[idx];
    const prevInput = (existing?.params && !Array.isArray(existing.params) ? existing.params.input : undefined) ?? "";
    if (String(prevInput) === value) return; // inchangé → pas de save inutile
    const baseParams = (existing?.params && !Array.isArray(existing.params)) ? existing.params : {};
    const newParams = value !== "" ? { ...baseParams, input: value } : {};
    const next = chosenScenarios.map((s, i) => (i === idx ? { ...s, params: newParams } : s));
    const previous = chosenScenarios;
    setChosenScenarios(next); // optimiste
    try {
      const updated = await saveChosenScenarios(parseInt(id), next);
      const serverList = updated?.scenarios_choisis;
      if (Array.isArray(serverList)) setChosenScenarios(serverList);
    } catch (err) {
      setChosenScenarios(previous); // rollback silencieux
    }
  }, [id, chosenScenarios]);

  const handleScenarioSkillExecute = useCallback(async (skillCode, scenarioParams = {}) => {
    if (!id || !carriereValidee) {
      toast.error("Geler la carrière d'abord");
      return;
    }
    const extraContext = (promptText || "").trim();
    if (extraContext) {
      toast.success("✓ Votre note sera utilisée pour ce calcul", { autoClose: 2500 });
      persistPromptNote(extraContext);
    }
    setScenarioSkillLoading(prev => ({ ...prev, [skillCode]: true }));
    setScenarioSkillErrors(prev => ({ ...prev, [skillCode]: null }));
    try {
      const result = skillCode === "RACL"
        ? await executeRaclScenario(parseInt(id), scenarioParams, extraContext)
        : skillCode === "RP"
        ? await executeRpScenario(parseInt(id), scenarioParams, extraContext)
        : skillCode === "CER"
        ? await executeCerScenario(parseInt(id), scenarioParams, extraContext)
        : skillCode === "COTISATIONS_MIN"
        ? await executeTnsScenario(parseInt(id), scenarioParams, extraContext)
        : skillCode === "CHOMAGE_INDEMNISE"
        ? await executeChomageIndScenario(parseInt(id), scenarioParams, extraContext)
        : skillCode === "CHOMAGE_NON_INDEMNISE"
        ? await executeChomageNonIndScenario(parseInt(id), scenarioParams, extraContext)
        : skillCode === "VPLR"
        ? await executeVplrScenario(parseInt(id), {
            ...scenarioParams,
            annees_etudes_superieures:
              user?.higher_education_years != null
                ? Number(user.higher_education_years)
                : null,
            // Normaliser l'input UI vers le param attendu par n8n.
            // Source priorisée : trimestres_a_racheter explicite → input (bouton "Calculer" du dispositif)
            // → inputValues.rachat_vplr (saisi dans la carte mais "Calculer toutes les pensions" déclenché).
            // Sans ça, le workflow tombe sur le plafond légal 12 trim. (max études) au lieu du nb saisi.
            trimestres_a_racheter:
              scenarioParams.trimestres_a_racheter != null
                ? scenarioParams.trimestres_a_racheter
                : (scenarioParams.input != null && scenarioParams.input !== ""
                    ? parseInt(scenarioParams.input, 10)
                    : (inputValues.rachat_vplr != null && inputValues.rachat_vplr !== ""
                        ? parseInt(inputValues.rachat_vplr, 10)
                        : undefined)),
          }, extraContext)
        : skillCode === "ARRET_ACTIVITE"
        ? await executeArretActiviteScenario(parseInt(id), scenarioParams, extraContext)
        : await executeSkillGeneric(skillCode, {
            clientId: parseInt(id),
            userContext: extraContext
              ? `Analyse dispositif ${skillCode} pour client ${id}\n\nCommentaire consultant : ${extraContext}`
              : `Analyse dispositif ${skillCode} pour client ${id}`,
            scenarioParams,
          });
      setScenarioSkillResults(prev => ({ ...prev, [skillCode]: result }));
      saveSkillResult(id, skillCode, result);
      // Persistance multi-select : si le dispositif est retenu, mettre à
      // jour son snapshot (params + résultat complet) en base.
      const dispId = Object.entries(DISPOSITIF_TO_SKILL_CODE).find(([, v]) => v === skillCode)?.[0];
      if (dispId) {
        const action = Object.values(ACTION_PANELS)
          .flatMap(p => p?.actions || [])
          .find(a => a.id === dispId);
        if (action) {
          const paramsForItem = scenarioParams && Object.keys(scenarioParams).length
            ? scenarioParams
            : undefined;
          // fire-and-forget : ne bloque pas l'affichage des résultats
          refreshChosenScenarioSnapshot(action, result, paramsForItem);
        }
      }
      const skillLabel = result.skill_name || SKILL_CODE_LABELS[skillCode] || skillCode.replace(/_/g, ' ');
      if (result.eligible === true) {
        toast.success(`${skillLabel} : éligible`);
      } else if (result.eligible === false) {
        toast.warning(`${skillLabel} : non éligible`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Erreur exécution skill";
      setScenarioSkillErrors(prev => ({ ...prev, [skillCode]: msg }));
      toast.error(`Erreur ${skillCode} : ${msg}`);
    } finally {
      setScenarioSkillLoading(prev => ({ ...prev, [skillCode]: false }));
    }
  }, [id, carriereValidee, refreshChosenScenarioSnapshot, inputValues, user, promptText]);

  // ── Multi-select : toggle d'un scénario dans la liste retenue ──
  // Persiste l'intégralité de la liste à chaque modification.
  const handleChooseScenario = useCallback(async (action, skillResultData) => {
    if (!id) return;
    const idx = chosenScenarios.findIndex(s => s?.dispositif_id === action.id);
    const adding = idx === -1;
    const next = adding
      ? [...chosenScenarios, buildScenarioItem(action, skillResultData)]
      : chosenScenarios.filter((_, i) => i !== idx);

    setChosenScenarioSaving(true);
    const previous = chosenScenarios;
    setChosenScenarios(next); // optimiste
    try {
      const updated = await saveChosenScenarios(parseInt(id), next);
      const serverList = updated?.scenarios_choisis;
      if (Array.isArray(serverList)) setChosenScenarios(serverList);
      toast.success(adding ? `Scénario ajouté : ${action.label}` : `Scénario retiré : ${action.label}`);
    } catch (err) {
      setChosenScenarios(previous);
      const msg = err.response?.data?.message || err.message || "Erreur sauvegarde";
      toast.error(`Impossible de sauvegarder : ${msg}`);
    } finally {
      setChosenScenarioSaving(false);
    }
  }, [id, chosenScenarios, buildScenarioItem]);

  // ── Multi-select : toggle d'une date dans la liste retenue ──
  // Identité : (type, date) pour les dates dérivées — une seule "date_libre" à la fois.
  // Pour "date_libre" : modifier la date remplace l'entrée existante, re-cliquer sur la même date la retire.
  // Pour "date_libre", `customDate` doit être au format ISO yyyy-mm-dd.
  const handleChooseDate = useCallback(async (typeId, label, dateInfo, customDate = null) => {
    if (!id) return;
    let isoDate = customDate;
    let info = dateInfo?.info || "";
    if (typeId !== "date_libre" && dateInfo?.date instanceof Date) {
      const d = dateInfo.date;
      isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    if (typeId === "date_libre" && customDate) {
      info = new Date(customDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    }
    const candidate = { type: typeId, label, date: isoDate, info };

    let next, adding, replacing = false;
    if (typeId === "date_libre") {
      const existingIdx = chosenDates.findIndex(d => d?.type === "date_libre");
      if (existingIdx !== -1 && chosenDates[existingIdx]?.date === isoDate) {
        // Même date cliquée deux fois → retirer
        next = chosenDates.filter((_, i) => i !== existingIdx);
        adding = false;
      } else if (existingIdx !== -1) {
        // Date différente → remplacer l'existante
        next = chosenDates.map((d, i) => (i === existingIdx ? candidate : d));
        adding = true;
        replacing = true;
      } else {
        // Aucune date_libre existante → ajouter
        next = [...chosenDates, candidate];
        adding = true;
      }
    } else {
      // Toggle sur le type seul (cohérent avec l'indicateur isChosen). Chaque date
      // standard est unique par type ; matcher aussi sur la date échouait quand le
      // format renvoyé par le serveur différait de l'isoDate recalculé → impossible
      // de désélectionner.
      const idx = chosenDates.findIndex(d => d?.type === typeId);
      adding = idx === -1;
      next = adding ? [...chosenDates, candidate] : chosenDates.filter((_, i) => i !== idx);
    }

    setChosenDateSaving(true);
    const previous = chosenDates;
    setChosenDates(next);
    try {
      const updated = await saveChosenDates(parseInt(id), next);
      const serverList = updated?.dates_retenues;
      if (Array.isArray(serverList)) setChosenDates(serverList);
      const action = adding ? (replacing ? "modifiée" : "ajoutée") : "retirée";
      toast.success(`Date ${action} : ${label}`);
    } catch (err) {
      setChosenDates(previous);
      const msg = err.response?.data?.message || err.message || "Erreur sauvegarde";
      toast.error(`Impossible de sauvegarder : ${msg}`);
    } finally {
      setChosenDateSaving(false);
    }
  }, [id, chosenDates]);

  useEffect(() => {
    if (!carriereValidee || !autoChainPendingRef.current) return;
    autoChainPendingRef.current = false;
    handleCalculateAllRegimes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carriereValidee]);

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
                <Dropzone disabled={isUploading} onDrop={handleUpload}>
                  {({ getRootProps, getInputProps, isDragActive }) => (
                    <div {...getRootProps()} className={"docs-dropzone" + (isDragActive ? " is-dragging" : "")} style={{ border: "2px dashed #ccc", borderRadius: 9, padding: "16px 14px", textAlign: "center", cursor: isUploading ? "wait" : "pointer", background: "#fafafa", transition: "all 0.15s", marginBottom: 10 }}>
                      <input {...getInputProps()} />
                      <DownloadCloud size={28} color="#6C5CE7" className="docs-dropzone-icon" style={{ marginBottom: 4 }} />
                      <div style={{ fontWeight: 600, color: "#6C5CE7", fontSize: 13 }}>
                        {isUploading ? "Import en cours…" : isDragActive ? "Déposez pour importer" : "Déposez tous vos documents ici"}
                      </div>
                      <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>{isDragActive ? "Relâchez le fichier ici" : "Glissez-déposez un fichier ou cliquez pour parcourir"}</div>
                    </div>
                  )}
                </Dropzone>

                {/* Liste des documents réels */}
                {isLoadingDocs ? (
                  <div style={{ fontSize: 12, color: "#555", padding: "6px 0" }}>Chargement des documents…</div>
                ) : ((orderedDocs.length > 0 || fileToSend)) ? (
                  <div>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="docs-list" direction="horizontal">
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", gap: 7, overflowX: "auto", paddingBottom: 4 }}>
                            {orderedDocs.map((doc, index) => {
                              const ext = (doc.filename || "").split(".").pop().toLowerCase();
                              const color = ext === "pdf" ? "#00B894" : ext === "html" ? "#0984E3" : "#6C5CE7";
                              const isSelected = fileToSend && fileToSend.name === doc.filename;
                              const isRIS = risFileName === doc.filename;
                              return (
                                <Draggable key={String(doc.id)} draggableId={String(doc.id)} index={index}>
                                  {(drag, snapshot) => (
                                    <div
                                      ref={drag.innerRef}
                                      {...drag.draggableProps}
                                      {...drag.dragHandleProps}
                                      style={{ display: "flex", flexDirection: "column", padding: "6px 12px", borderRadius: 7, background: isSelected ? `${color}18` : snapshot.isDragging ? "#f3f0ff" : `${color}08`, border: `1px solid ${isSelected ? color : snapshot.isDragging ? "#7367f0" : `${color}18`}`, fontSize: 13, cursor: snapshot.isDragging ? "grabbing" : "grab", transition: snapshot.isDragging ? "none" : "all 0.15s", ...drag.draggableProps.style }}
                                      onClick={() => { if (isSelected) return; handleSelectDocument(doc); }}
                                      title={isSelected ? "Document sélectionné pour l'analyse" : `Cliquer pour sélectionner "${doc.filename}"`}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ fontSize: 15 }}>📄</span>
                                        <span style={{ fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14 }}>{doc.filename}</span>
                                        <span style={{ fontSize: 11, color, fontWeight: 700 }}>{ext.toUpperCase()}</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto", paddingLeft: 4 }}>
                                          {isSelected && (
                                            <button onClick={(e) => { e.stopPropagation(); const url = URL.createObjectURL(fileToSend); window.open(url, '_blank'); }} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center" }} title="Visualiser le document">
                                              <Eye size={14} />
                                            </button>
                                          )}
                                          <button onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id, doc.filename); }} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: "2px", fontSize: 14, lineHeight: 1, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }} title="Supprimer le document">✕</button>
                                        </div>
                                      </div>
                                      {["pdf", "png", "jpg", "jpeg", "webp"].includes(ext) && (() => {
                                        const detection = docTypeDetection[doc.filename];
                                        if (detection?.loading) {
                                          return (
                                            <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 12, color: "#7367f0" }}>
                                              <span className="spinner-border spinner-border-sm" style={{ width: "0.6rem", height: "0.6rem", borderWidth: "0.15em" }} role="status" />
                                              Détection…
                                            </div>
                                          );
                                        }
                                        if (detection?.doc_type === "bulletin_salaire") {
                                          return renderBulletinSection(doc.filename, doc);
                                        }
                                        if (detection?.is_ris === false) {
                                          return (
                                            <div style={{ marginTop: 6, textAlign: "center", fontSize: 11, color: "#636e72", padding: "3px 8px", background: "#f5f5f5", borderRadius: 6, fontWeight: 600 }}>
                                              📄 {detection.doc_type ? detection.doc_type.charAt(0).toUpperCase() + detection.doc_type.slice(1).replace(/_/g, " ") : "Document"}
                                            </div>
                                          );
                                        }
                                        return (
                                          <button onClick={(e) => { e.stopPropagation(); handleAnalyzeDoc(doc); }} disabled={isParsingRIS} style={{ marginTop: 6, background: isParsingRIS && isRIS ? "#a29bfe" : "#7367f0", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 13, fontWeight: 700, cursor: isParsingRIS ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, width: "100%", opacity: isParsingRIS && !isRIS ? 0.5 : 1, transition: "all 0.2s ease" }}>
                                            {isParsingRIS && isRIS ? (<><span className="spinner-border spinner-border-sm" style={{ width: "0.6rem", height: "0.6rem", borderWidth: "0.15em" }} role="status" />Extraction en cours…</>) : "🚀 Analyser ce RIS"}
                                          </button>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                    
                    {/* Fichier uploadé manuellement (pas encore dans la liste serveur) */}
                    {fileToSend && !userDocuments.filter((d) => Number(d.dossier) === 10).some((d) => d.filename === fileToSend.name) && (
                      <div style={{ display: "flex", flexDirection: "column", padding: "6px 12px", borderRadius: 7, background: "#00B89418", border: "1px solid #00B894", fontSize: 13, minWidth: 180, maxWidth: 320, alignSelf: "flex-start" }}>
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
                        {(() => { const n = fileToSend.name.toLowerCase(); return n.endsWith(".pdf") || n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".webp"); })() && (() => {
                          const detection = docTypeDetection[fileToSend.name];
                          const isActiveRIS = risFileName === fileToSend.name;
                          if (detection?.loading) {
                            return (
                              <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 12, color: "#7367f0" }}>
                                <span className="spinner-border spinner-border-sm" style={{ width: "0.6rem", height: "0.6rem", borderWidth: "0.15em" }} role="status" />
                                Détection…
                              </div>
                            );
                          }
                          if (detection?.doc_type === "bulletin_salaire") {
                            return renderBulletinSection(fileToSend.name, fileToSend);
                          }
                          if (detection?.is_ris === false) {
                            return (
                              <div style={{ marginTop: 6, textAlign: "center", fontSize: 11, color: "#636e72", padding: "3px 8px", background: "#f5f5f5", borderRadius: 6, fontWeight: 600 }}>
                                📄 {detection.doc_type ? detection.doc_type.charAt(0).toUpperCase() + detection.doc_type.slice(1).replace(/_/g, " ") : "Document"}
                              </div>
                            );
                          }
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRisFileName(fileToSend.name);
                                parsePdfAndFillCarriere(fileToSend);
                              }}
                              disabled={isParsingRIS}
                              style={{
                                marginTop: 6,
                                background: isParsingRIS && isActiveRIS ? "#a29bfe" : "#7367f0",
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
                                opacity: isParsingRIS && !isActiveRIS ? 0.5 : 1,
                                transition: "all 0.2s ease",
                              }}
                            >
                              {isParsingRIS && isActiveRIS ? (
                                <>
                                  <span className="spinner-border spinner-border-sm" style={{ width: "0.6rem", height: "0.6rem", borderWidth: "0.15em" }} role="status" />
                                  Extraction en cours…
                                </>
                              ) : (
                                "🚀 Analyser ce RIS"
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#666", textAlign: "center", padding: "4px 0" }}>Aucun document importé</div>
                )}
              </div>
              {/* fin zone documents masquée */}

              {/* ── Rapprochement RIS / bulletin (affichée seulement si RIS analysé + ≥1 bulletin) ── */}
              {canRapprocher && (
              <div style={{ ...S.card, padding: 14, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>🔎 Rapprochement RIS / bulletin</div>
                  <button
                    onClick={handleRapprocher}
                    disabled={!canRapprocher}
                    title={canRapprocher ? "Comparer les salaires RIS et bulletins" : "Analyse un RIS et importe au moins un bulletin"}
                    style={{ background: canRapprocher ? "#7367f0" : "#c9c6f5", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 700, cursor: canRapprocher ? "pointer" : "not-allowed" }}
                  >
                    Rapprocher RIS / bulletin
                  </button>
                </div>
                {rapprochement && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
                      {rapprochement.nbBulletins} bulletin(s) comparé(s) —{" "}
                      <b style={{ color: rapprochement.nbAnomalies ? "#E17055" : "#00B894" }}>{rapprochement.nbAnomalies} anomalie(s)</b>
                    </div>
                    {rapprochement.deltaSam > 0 && (
                      <div style={{ marginBottom: 8, background: "#00B89412", border: "1px solid #00B89455", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                        <div style={{ fontWeight: 700, color: "#00875A" }}>💰 Impact estimé de la régularisation</div>
                        <div style={{ marginTop: 2 }}>SAM : {Number(rapprochement.samRis).toLocaleString("fr-FR")} € → <b>{Number(rapprochement.samCorrige).toLocaleString("fr-FR")} €</b> (+{Number(rapprochement.deltaSam).toLocaleString("fr-FR")} €)</div>
                        <div>Pension de base CNAV : <b>~ +{Number(rapprochement.deltaPensionMensuelle).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €/mois</b> (+{Number(rapprochement.deltaPensionAnnuelle).toLocaleString("fr-FR")} €/an)</div>
                        <div style={{ color: "#888", fontSize: 11, marginTop: 2 }}>Estimation à taux plein (50%), hors prorata et décote/surcote. Chiffre exact via recalcul complet de la carrière.</div>
                      </div>
                    )}
                    {rapprochement.nbAnomalies > 0 && (
                      <button
                        onClick={handleApplyCorrections}
                        title="Écrit les salaires des bulletins dans le tableau carrière (déverrouille si validée)"
                        style={{ marginBottom: 8, background: "#00875A", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        ⚙️ Appliquer les corrections à la carrière
                      </button>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {rapprochement.ecarts.map((e) => {
                        const c = e.niveau === "ROUGE" ? "#D63031" : e.niveau === "ORANGE" ? "#E17055" : e.niveau === "RECENT" ? "#636e72" : "#00B894";
                        const fmtE = (v) => Number(v).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
                        return (
                          <div key={e.filename + "-" + e.annee} style={{ borderLeft: `3px solid ${c}`, background: `${c}10`, borderRadius: 6, padding: "6px 10px", fontSize: 12 }}>
                            <div style={{ fontWeight: 700, color: c }}>{e.annee} — {e.motif}</div>
                            <div style={{ color: "#2d3436", marginTop: 2 }}>
                              RIS : {fmtE(e.risReporte)} € · Bulletin (plafonné PASS) : {fmtE(e.bulletinReporte)} €
                              {e.ecartPct != null && (
                                <> · Écart : <b>{e.ecartEur > 0 ? "+" : ""}{fmtE(e.ecartEur)} € ({e.ecartPct > 0 ? "+" : ""}{e.ecartPct} %)</b></>
                              )}
                            </div>
                            {e.plafonne && (
                              <div style={{ color: "#888", fontSize: 11 }}>Brut bulletin {fmtE(e.brutBulletin)} € &gt; PASS {fmtE(e.pass)} € → plafonné</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {rapprochement.constatLoading && (
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#7367f0" }}>
                        <span className="spinner-border spinner-border-sm" style={{ width: "0.7rem", height: "0.7rem", borderWidth: "0.15em" }} role="status" />
                        Rédaction du constat consultant…
                      </div>
                    )}
                    {rapprochement.constatError && (
                      <div style={{ marginTop: 10, fontSize: 12, color: "#D63031" }}>Constat IA indisponible — réessaie.</div>
                    )}
                    {rapprochement.constat && (
                      <div style={{ marginTop: 10, background: "#fff", border: "1px solid #eee", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>📝 Constat consultant</div>
                        {rapprochement.constat.synthese && (
                          <div style={{ fontSize: 12, color: "#2d3436", whiteSpace: "pre-line", lineHeight: 1.5 }}>{rapprochement.constat.synthese}</div>
                        )}
                        {Array.isArray(rapprochement.constat.recommandations) && rapprochement.constat.recommandations.length > 0 && (
                          <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "#2d3436", lineHeight: 1.5 }}>
                            {rapprochement.constat.recommandations.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

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
                      const totalRows = carriereRows.slice(0, visibleRowCount);
                      // ∑ trimestres : on somme sur TOUTES les années présentes dans trimCotState/
                      // trimAssState/arState (la source de vérité, identique à « Données de calcul »),
                      // PAS sur carriereRows — sinon les années projetées >2026 que carriereRows ne
                      // porte pas (désync grille↔totaux) seraient oubliées → le ∑ sous-comptait (166
                      // au lieu de 174). On itère les clés directement pour rester cohérent partout.
                      const _allTrimYears = Array.from(new Set([
                        ...Object.keys(trimCotState), ...Object.keys(trimAssState), ...Object.keys(arState),
                      ]));
                      const totalCotTbl = _allTrimYears.reduce((s, yr) => s + (Number(trimCotState[yr]) || 0), 0);
                      const totalAssTbl = _allTrimYears.reduce((s, yr) => s + (Number(trimAssState[yr]) || 0), 0);
                      const totalArTbl = _allTrimYears.reduce((s, yr) => s + (Number(arState[yr]) || 0), 0);
                      const totalTrimTbl = _allTrimYears.reduce((s, yr) => {
                        const tc = Number(trimCotState[yr]) || 0;
                        const ta = Number(trimAssState[yr]) || 0;
                        const ar = Number(arState[yr]) || 0;
                        return s + Math.min(4, tc + ta + ar);
                      }, 0);
                      // SAM CNAV : uniquement les années avec affiliation CNAV (TC ou TA > 0)
                      // Exclut les années régime complémentaire seul (Agirc-only, CIPAV seul, etc.)
                      const samRows = [...carriereRows]
                        .filter(r => ((trimCotState[r.yr] ?? 0) > 0 || (trimAssState[r.yr] ?? 0) > 0) && (revaloValues[r.yr] ?? 0) > 0)
                        .sort((a, b) => (revaloValues[b.yr] ?? 0) - (revaloValues[a.yr] ?? 0))
                        .slice(0, 25);
                      const samVal = samRows.length ? Math.round(samRows.reduce((s, r) => s + (revaloValues[r.yr] ?? 0), 0) / samRows.length) : 0;

                      const WIRED_REGIME_KEYS = ["CNAV", "AGIRC_ARRCO", "IRCANTEC", "RCI", "CIPAV"];
                      const dynamicRegimes = computeVisibleRegimes(carriereRows, WIRED_REGIME_KEYS).filter(
                        (r) => !WIRED_REGIME_KEYS.includes(r.key)
                      );

                      return (
                        <div>
                          {/* Header */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 18 }}>📂</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#7367f0" }}>Carrière</span>
                              <span style={{ fontSize: 12, color: "#555" }}>— tableau unifié tous régimes</span>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 12, padding: "3px 8px", borderRadius: 5, background: isParsingRIS ? "#0984E315" : carriereValidee ? "#00B89415" : "#E1705515", color: isParsingRIS ? "#0984E3" : carriereValidee ? "#00B894" : "#E17055", fontWeight: 700 }}>
                                {isParsingRIS ? "⏳ Analyse en cours…" : carriereValidee ? `🔒 Validée${lockedAt ? ` le ${new Date(lockedAt).toLocaleDateString("fr-FR")}` : ""}` : ""}
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

                          {/* Identité client */}
                          {!identiteReset && (user?.first_name || user?.last_name || user?.birth_date) && (
                            <div style={{ display: "flex", alignItems: "center", gap: 16, background: "#F8F9FA", border: "1px solid #E9ECEF", borderRadius: 8, padding: "10px 14px", marginBottom: 12, flexWrap: "wrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 13 }}>👤</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>
                                  {[user.first_name, user.last_name].filter(Boolean).join(" ") || "—"}
                                </span>
                              </div>
                              {user?.birth_date && (
                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Né(e) le</span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>
                                    {new Date(user.birth_date).toLocaleDateString("fr-FR")}
                                  </span>
                                </div>
                              )}
                              {user?.birth_date && (() => {
                                const b = new Date(user.birth_date);
                                if (isNaN(b.getTime())) return null;
                                const t = new Date();
                                let years = t.getFullYear() - b.getFullYear();
                                let months = t.getMonth() - b.getMonth();
                                if (t.getDate() < b.getDate()) months--;
                                if (months < 0) { years--; months += 12; }
                                const label = `${years} ans${months > 0 ? ` ${months} mois` : ""}`;
                                return (
                                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Âge</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>{label}</span>
                                  </div>
                                );
                              })()}
                              {user?.secu_social && (
                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>NIR</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "#555", fontFamily: "monospace", letterSpacing: "0.05em" }}>
                                    {user.secu_social}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

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

                          {/* Projection fin de carrière */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "#FFF7E6", border: "1px solid #FFE0A3", borderRadius: 8, padding: "8px 14px", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 16 }}>📈</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#343a40" }}>Projeter jusqu&rsquo;à</span>
                              {[
                                { id: PROJECTION_MODES.LEGAL,  label: "Âge légal",          needsBirth: true },
                                { id: PROJECTION_MODES.DUREE,  label: "Taux plein (durée)", needsBirth: true },
                                { id: PROJECTION_MODES.AUTO67, label: "Taux plein 67 ans",  needsBirth: true },
                                { id: PROJECTION_MODES.LIBRE,  label: "Date libre",         needsBirth: false },
                              ].map((chip) => {
                                const disabled = carriereValidee || (chip.needsBirth && !projBirthYear);
                                const active = projectionMode === chip.id && projectionOn;
                                return (
                                  <button
                                    key={chip.id}
                                    type="button"
                                    disabled={disabled}
                                    title={
                                      carriereValidee ? "Déverrouillez la carrière pour modifier la projection" :
                                      chip.needsBirth && !projBirthYear ? "Renseignez la date de naissance du client" :
                                      active ? "Recliquez pour désactiver la projection" :
                                      "Cliquez pour projeter jusqu'à cette cible"
                                    }
                                    onClick={() => {
                                      if (active) { clearProjection(); }
                                      // Sélectionner un mode repart d'une projection « propre » : on remet les
                                      // années en plus à 0 (sinon une valeur reportée d'un mode précédent décale
                                      // la nouvelle cible — ex. projection vide après avoir retiré des années).
                                      else { setProjectionMode(chip.id); setProjectionSurcote(0); handleGenerateProjection(chip.id, projectionTargetAge, 0, projectionTargetMonths); }
                                    }}
                                    style={{ padding: "4px 10px", borderRadius: 14, fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, border: active ? "1px solid #FF9F43" : "1px solid #FFD08A", background: active ? "#FF9F43" : "#fff", color: active ? "#fff" : "#B26A00" }}
                                  >
                                    {chip.label}
                                  </button>
                                );
                              })}
                              {projectionMode === PROJECTION_MODES.LIBRE && (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <label style={{ fontSize: 13, fontWeight: 600, color: "#343a40" }}>Date de départ</label>
                                  <DateInputFR
                                    value={dateLibreInput}
                                    disabled={carriereValidee}
                                    onChange={(e) => { const v = e.target.value; setDateLibreInput(v); handleGenerateProjection(PROJECTION_MODES.LIBRE, projectionTargetAge, projectionSurcote, projectionTargetMonths, v); }}
                                    style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #ddd", fontSize: 14, fontFamily: "inherit", width: 120 }}
                                  />
                                </div>
                              )}
                              {projectionActive && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "#343a40" }}>Ajouter une année sur la projection</span>
                                  <button type="button" disabled={carriereValidee || !projectionOn}
                                    title={!projectionOn ? "Aucune année projetée à retirer" : "Retirer une année de la projection"}
                                    onClick={() => { const s = projectionSurcote - 1; setProjectionSurcote(s); handleGenerateProjection(projectionMode, projectionTargetAge, s, projectionTargetMonths); }}
                                    style={{ width: 26, height: 26, borderRadius: 4, border: "1px solid #FF9F43", background: "#fff", color: "#FF9F43", fontWeight: 700, cursor: (carriereValidee || !projectionOn) ? "not-allowed" : "pointer" }}>−</button>
                                  <span style={{ fontSize: 13, minWidth: 56, textAlign: "center" }}>{(() => { const cy = new Date().getFullYear(); const n = carriereRows.filter(r => r && r.projected && r.yr > cy).length; return n + " an" + (n > 1 ? "s" : ""); })()}</span>
                                  <button type="button" disabled={carriereValidee}
                                    onClick={() => { const s = projectionSurcote + 1; setProjectionSurcote(s); handleGenerateProjection(projectionMode, projectionTargetAge, s, projectionTargetMonths); }}
                                    style={{ width: 26, height: 26, borderRadius: 4, border: "1px solid #FF9F43", background: "#fff", color: "#FF9F43", fontWeight: 700, cursor: "pointer" }}>+</button>
                                </div>
                              )}
                            </div>
                            {projBirthYear && (() => {
                              const dd = departureDates;
                              const birth = parseBirthDate(user?.birth_date);
                              let head = null, date = null;
                              if (projectionMode === PROJECTION_MODES.LEGAL && dd.legale) {
                                head = `Âge légal : ${dd.legale.ageStr}`; date = dd.legale.date;
                              } else if (projectionMode === PROJECTION_MODES.AUTO67 && dd.date67) {
                                head = "Taux plein 67 ans"; date = dd.date67.date;
                              } else if (projectionMode === PROJECTION_MODES.LIBRE && dateLibreInput) {
                                const _d = new Date(dateLibreInput + "T00:00:00");
                                if (!isNaN(_d.getTime())) { head = "Date libre"; date = _d; }
                              } else if (projectionMode === PROJECTION_MODES.DUREE && dd.tauxPlein) {
                                head = `Taux plein (durée) : ${dd.tauxPlein.ageStr}`; date = dd.tauxPlein.date;
                              }
                              if (!date) return null;
                              const departLabel = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
                              // Trimestres affichés = MÊME source unique que le ∑ et « Données de calcul » :
                              // total réels + projetés (somme des clés trimCotState/trimAssState/arState),
                              // plus le total SANS projection (années non futures). Fini les 3 nombres qui
                              // se contredisaient (bandeau 162 / ∑ 166 / Données de calcul 174).
                              const _curY = new Date().getFullYear();
                              const _bYears = Array.from(new Set([...Object.keys(trimCotState), ...Object.keys(trimAssState), ...Object.keys(arState)]));
                              const _capYr = (yr) => Math.min(4, (Number(trimCotState[yr]) || 0) + (Number(trimAssState[yr]) || 0) + (Number(arState[yr]) || 0));
                              const _bTot = _bYears.reduce((s, yr) => s + _capYr(yr), 0);
                              const _bReal = _bYears.filter((yr) => Number(yr) <= _curY).reduce((s, yr) => s + _capYr(yr), 0);
                              const _bReq = (dd.tauxPlein && dd.tauxPlein.trimRequis) || 172;
                              const _bProj = _bTot - _bReal;
                              const tail = ` · ${_bReal} acquis${_bProj > 0 ? ` + ${_bProj} projetés = ${_bTot}` : ""} / ${_bReq} requis (${_bTot >= _bReq ? "taux plein" : (_bReq - _bTot) + " manquants → décote"})`;
                              return <span style={{ fontSize: 12, color: "#8a6d3b", fontWeight: 600 }}>{`📅 ${head} — départ ${departLabel}${tail}`}</span>;
                            })()}
                            {projLastRealYear != null && !projBirthYear && (
                              <span style={{ fontSize: 12, color: "#ea5455", fontWeight: 600 }}>Renseignez la date de naissance du client pour projeter jusqu&rsquo;au taux plein.</span>
                            )}
                          </div>

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
                                            return res ? { ...r, agircT1: parseFloat(res.t1.toFixed(2)), agircT2: parseFloat(res.t2.toFixed(2)), agircPts: parseFloat(res.total.toFixed(2)), regimes: { ...(r.regimes || {}), AGIRC_ARRCO: parseFloat(res.total.toFixed(2)) } } : r;
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
                                            return res ? { ...r, agircT1: parseFloat(res.t1.toFixed(2)), agircT2: parseFloat(res.t2.toFixed(2)), agircPts: parseFloat(res.total.toFixed(2)), regimes: { ...(r.regimes || {}), AGIRC_ARRCO: parseFloat(res.total.toFixed(2)) } } : r;
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
                                  {dynamicRegimes.map((regime) => {
                                    const c = regime.isUnknown ? "#9CA3AF" : regime.color;
                                    return (
                                    <th
                                      key={regime.key}
                                      title={regime.isUnknown ? "Régime non reconnu — calcul non disponible" : regime.label}
                                      style={{
                                        padding: "3px 6px",
                                        textAlign: "center",
                                        fontWeight: 700,
                                        fontSize: 12,
                                        color: c,
                                        background: c + "08",
                                        borderLeft: "2px solid " + c + "30",
                                        borderBottom: "1px solid " + c + "20",
                                        verticalAlign: "bottom",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      <span style={{ marginRight: 4 }}>{regime.icon}</span>
                                      {regime.label}
                                      {regime.isUnknown && <span style={{ marginLeft: 4, opacity: 0.6 }}>⚠️</span>}
                                    </th>
                                    );
                                  })}
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
                                  {dynamicRegimes.map((regime) => {
                                    const c = regime.isUnknown ? "#9CA3AF" : regime.color;
                                    return (
                                      <th key={regime.key} style={{ padding: "3px 5px", textAlign: "center", fontWeight: 600, color: c, borderBottom: "2px solid " + c + "20", borderLeft: "2px solid " + c + "30", whiteSpace: "nowrap" }}>Points</th>
                                    );
                                  })}
                                </tr>
                              </thead>
                              <tbody>
                                {totalRows.map((row, i) => {
                                  const tot = Math.min(4, (trimCotState[row.yr] ?? 0) + (trimAssState[row.yr] ?? 0) + (arState[row.yr] ?? 0));
                                  // Projection framing. totalRows is descending, so the visual TOP
                                  // projected row is the highest year and the visual BOTTOM is the
                                  // lowest. Cap the block's OUTER edges accordingly.
                                  const isProj = !!row.projected;
                                  const isFirstProj = isProj && (i === 0 || !totalRows[i - 1].projected);   // visual top
                                  const isLastProj = isProj && (i === totalRows.length - 1 || !totalRows[i + 1].projected); // visual bottom
                                  // Salaire revalorisé : jamais re-plafonné (R.351-29 CSS).
                                  // Le plafond PASS s'applique au salaire SS, pas au revalorisé.
                                  const revaloVal = revaloValues[row.yr] ?? row.revalo;
                                  // "Plafonné" = le salaire SS de l'année a atteint le PASS.
                                  const isPlafonne = (row.ss ?? 0) >= getPlafond(row.yr) && (row.yr >= 2005 || !deplafValues[row.yr]);
                                  // ── Incertitudes IA pour chaque cellule de cette année ──
                                  const uRevenu   = uncertProps(getCellUncert(uncertaintiesByYear, row.yr, "revenu"));
                                  const uTrimCot  = uncertProps(getCellUncert(uncertaintiesByYear, row.yr, "trimestres_cotises"));
                                  const uTrimAss  = uncertProps(getCellUncert(uncertaintiesByYear, row.yr, "trimestres_assimiles"));
                                  const uTrimAr   = uncertProps(getCellUncert(uncertaintiesByYear, row.yr, "trimestres_ar"));
                                  const uAgirc    = uncertProps(getCellUncert(uncertaintiesByYear, row.yr, "points.agirc_arrco"));
                                  const uIrc      = uncertProps(getCellUncert(uncertaintiesByYear, row.yr, "points.ircantec"));
                                  const uRci      = uncertProps(getCellUncert(uncertaintiesByYear, row.yr, "points.rci"));
                                  return (
                                    <tr key={row.yr} style={{
                                      background: isProj ? "#FFF7E6" : (i % 2 === 0 ? "#fff" : "#fafafa"),
                                      ...(isFirstProj && { borderTop: "2px dashed #FF9F43" }),
                                      ...(isLastProj && { borderBottom: "2px dashed #FF9F43" }),
                                    }}>
                                      <td style={{ padding: "3px 5px", fontWeight: 700, color: "#333", ...(isProj && { borderLeft: "3px solid #FF9F43" }) }}>
                                        {row.yr}
                                        {isProj && (
                                          <span style={{ display: "inline-block", marginLeft: 6, padding: "1px 6px", borderRadius: 8, background: "#FF9F43", color: "#fff", fontSize: 9, fontWeight: 700, verticalAlign: "middle" }}>Projection</span>
                                        )}
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center", borderLeft: "1px solid #eee", ...(uRevenu.tdStyle || {}) }}>
                                        <input type="number" value={row.sal || ""} disabled={carriereValidee}
                                          title={uRevenu.title}
                                          onChange={(e) => {
                                            const v = parseInt(e.target.value) || 0;
                                            const yr = row.yr;
                                            const coeff = coeffRevalo[yr] || 1;
                                            const passEuro = PLAFONDS_SS[yr] || 48060;
                                            const isDeplaf = deplafValues[yr] || false;
                                            const isCapped = !isDeplaf || yr >= 2005;
                                            let salPlafonne, revalo, ssEur;
                                            if (yr <= 2001) {
                                              // Salaire en FRF — réplique exacte CnavSimulator
                                              const passFrancs = passEuro * 6.55957;
                                              salPlafonne = isCapped ? Math.min(v, passFrancs) : v;
                                              revalo = Math.round((salPlafonne * coeff) / 6.55957);
                                              ssEur = Math.round(salPlafonne / 6.55957);
                                            } else {
                                              // Salaire en EUR
                                              salPlafonne = isCapped ? Math.min(v, passEuro) : v;
                                              revalo = Math.round(salPlafonne * coeff);
                                              ssEur = salPlafonne;
                                            }
                                            // Trimestres cotisés — réplique exacte CnavSimulator
                                            const seuilTrimestre = yr <= 2001
                                              ? (passEuro * 6.55957) / 4
                                              : passEuro / 4;
                                            const trimestres = Math.min(4, Math.max(0, Math.floor(v / (seuilTrimestre || Infinity))));
                                            setRevaloValues(prev => ({ ...prev, [yr]: revalo }));
                                            setTrimCotState(prev => ({ ...prev, [yr]: trimestres }));
                                            // Calcul ARRCO/AGIRC-ARRCO, IRCANTEC, RCI depuis le salaire brut
                                            const arrcoRes = v > 0 ? calculateArrco(yr, v, isCadreSimu) : null;
                                            const ircRes = v > 0 ? calculateIrcantec(yr, v) : null;
                                            const rciRes = v > 0 ? calculateRci(yr, v) : null;
                                            const agircV = arrcoRes ? parseFloat(arrcoRes.total.toFixed(2)) : 0;
                                            const ircV   = ircRes   ? parseFloat(ircRes.total.toFixed(5))   : 0;
                                            const rciV   = rciRes   ? parseFloat(rciRes.total.toFixed(5))   : 0;
                                            setCarriereRows(prev => prev.map(r => r.yr === yr ? {
                                              ...r,
                                              sal: v,
                                              ss: ssEur,
                                              agircT1: arrcoRes ? parseFloat(arrcoRes.t1.toFixed(2)) : null,
                                              agircT2: arrcoRes ? parseFloat(arrcoRes.t2.toFixed(2)) : null,
                                              agircPts: agircV,
                                              ircPts:   ircV,
                                              rciPts:   rciV,
                                              regimes: { ...(r.regimes || {}), AGIRC_ARRCO: agircV, IRCANTEC: ircV, RCI: rciV },
                                            } : r));
                                          }}
                                          style={{ width: 62, textAlign: "center", border: "1px solid #ddd", borderRadius: 3, fontSize: 15, padding: "1px 3px", background: carriereValidee ? "#fafafa" : "#fff" }} />
                                        {row.devise === 'FRF' && (
                                          <span style={{ display: "block", fontSize: 10, color: "#E17055", fontWeight: 700, textAlign: "center", marginTop: 1 }}>FRF</span>
                                        )}
                                        {uRevenu.badge}
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "right", borderLeft: "2px solid #6C5CE715" }}>
                                        <input type="number" value={row.ss || ""} disabled={carriereValidee}
                                          onChange={(e) => { const v = parseInt(e.target.value) || 0; setCarriereRows(prev => prev.map(r => r.yr === row.yr ? { ...r, ss: v } : r)); }}
                                          style={{ width: 62, textAlign: "right", border: "1px solid #6C5CE730", borderRadius: 3, fontSize: 15, padding: "1px 3px", background: carriereValidee ? "#fafafa" : "#fff", color: "#555" }} />
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "right", color: "#0984E3", fontWeight: 600 }}>{row.coeff}</td>
                                      <td style={{ padding: "3px 5px", textAlign: "right", fontWeight: 700, color: "#6C5CE7", background: isPlafonne ? "#FDEDEC" : undefined }} title={isPlafonne ? "Année au plafond SS (salaire SS = plafond ; revalorisation appliquée)" : undefined}>
                                        <input
                                          type="number"
                                          value={revaloVal || ""}
                                          disabled={carriereValidee}
                                          onChange={(e) => handleRevaloChange(row.yr, e.target.value, deplafValues[row.yr])}
                                          style={{ width: 68, textAlign: "right", border: "1px solid #6C5CE730", borderRadius: 3, fontSize: 15, padding: "1px 3px", background: carriereValidee ? "#fafafa" : "#fff", color: "#6C5CE7", fontWeight: 700 }}
                                        />
                                        <span style={{ fontSize: 9, color: "#666", display: "block", textAlign: "right", marginTop: 1 }}>
                                          ≤ {getPlafond(row.yr).toLocaleString("fr-FR")} €
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
                                      <td style={{ padding: "3px 5px", textAlign: "center", ...(uTrimCot.tdStyle || {}) }}>
                                        <input type="number" min={0} max={4} value={trimCotState[row.yr] || ""} disabled={carriereValidee}
                                          onFocus={selectAllOnFocus}
                                          title={uTrimCot.title}
                                          onChange={(e) => { const reste = 4 - ((trimAssState[row.yr] ?? 0) + (arState[row.yr] ?? 0)); const v = Math.max(0, Math.min(parseInt(e.target.value, 10) || 0, Math.max(0, reste))); setTrimCotState(prev => ({ ...prev, [row.yr]: v })); }}
                                          style={{ width: 26, textAlign: "center", border: "1px solid #ddd", borderRadius: 3, fontSize: 15, padding: "1px" }} />
                                        {uTrimCot.badge}
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center", ...(uTrimAss.tdStyle || {}) }}>
                                        <input type="number" min={0} max={4} value={trimAssState[row.yr] || ""} disabled={carriereValidee}
                                          onFocus={selectAllOnFocus}
                                          onChange={(e) => { const reste = 4 - ((trimCotState[row.yr] ?? 0) + (arState[row.yr] ?? 0)); const v = Math.max(0, Math.min(parseInt(e.target.value, 10) || 0, Math.max(0, reste))); setTrimAssState(prev => ({ ...prev, [row.yr]: v })); }}
                                          title={uTrimAss.title || "Trimestres assimilés (maladie, chômage, maternité…)"} style={{ width: 26, textAlign: "center", border: "1px solid #6C5CE730", borderRadius: 3, fontSize: 15, padding: "1px", color: "#6C5CE7" }} />
                                        {uTrimAss.badge}
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center", ...(uTrimAr.tdStyle || {}) }}>
                                        <input type="number" min={0} max={4} value={arState[row.yr] || ""} disabled={carriereValidee}
                                          onFocus={selectAllOnFocus}
                                          onChange={(e) => { const reste = 4 - ((trimCotState[row.yr] ?? 0) + (trimAssState[row.yr] ?? 0)); const v = Math.max(0, Math.min(parseInt(e.target.value, 10) || 0, Math.max(0, reste))); setArState(prev => ({ ...prev, [row.yr]: v })); }}
                                          title={uTrimAr.title || "Trimestres rachetés (versement pour la retraite)"}
                                          style={{ width: 26, textAlign: "center", border: "1px solid #ddd", borderRadius: 3, fontSize: 15, padding: "1px" }} />
                                        {uTrimAr.badge}
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center", fontWeight: 700, color: "#6C5CE7" }}>{tot}</td>
                                      <td style={{ padding: "3px 5px", textAlign: "center", borderLeft: "2px solid #0984E315" }}>
                                        <input type="number" step="0.01" value={row.agircT1 ?? ""} disabled={carriereValidee} onChange={e => { const v = parseFloat(e.target.value) || 0; setCarriereRows(prev => prev.map(r => r.yr === row.yr ? { ...r, agircT1: v } : r)); }} style={{ width: 72, textAlign: "center", border: "1px solid #0984E330", borderRadius: 3, fontSize: 13, padding: "1px 4px", color: "#0984E3", fontWeight: 600, background: carriereValidee ? "#fafafa" : "#fff" }} />
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center" }}>
                                        <input type="number" step="0.01" value={row.agircT2 ?? ""} disabled={carriereValidee} onChange={e => { const v = parseFloat(e.target.value) || 0; setCarriereRows(prev => prev.map(r => r.yr === row.yr ? { ...r, agircT2: v } : r)); }} style={{ width: 72, textAlign: "center", border: "1px solid #0984E330", borderRadius: 3, fontSize: 13, padding: "1px 4px", color: "#0984E3", fontWeight: 600, background: carriereValidee ? "#fafafa" : "#fff" }} />
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center", ...(uAgirc.tdStyle || {}) }}>
                                        <input type="number" step="0.01" value={row.agircPts || ""} disabled={carriereValidee} title={uAgirc.title} onChange={e => { const v = parseFloat(e.target.value) || 0; setCarriereRows(prev => prev.map(r => r.yr === row.yr ? { ...r, agircPts: v } : r)); }} style={{ width: 72, textAlign: "center", border: "1px solid #0984E350", borderRadius: 3, fontSize: 13, padding: "1px 4px", color: "#1a1a2e", fontWeight: 800, background: carriereValidee ? "#fafafa" : "#fff" }} />
                                        {uAgirc.badge}
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center", borderLeft: "2px solid #00B89415", ...(uIrc.tdStyle || {}) }}>
                                        <input type="number" step="0.01" value={row.ircPts || ""} disabled={carriereValidee} title={uIrc.title} onChange={e => { const v = parseFloat(e.target.value) || 0; setCarriereRows(prev => prev.map(r => r.yr === row.yr ? { ...r, ircPts: v } : r)); }} style={{ width: 72, textAlign: "center", border: "1px solid #00B89430", borderRadius: 3, fontSize: 13, padding: "1px 4px", color: "#00B894", fontWeight: 600, background: carriereValidee ? "#fafafa" : "#fff" }} />
                                        {uIrc.badge}
                                      </td>
                                      <td style={{ padding: "3px 5px", textAlign: "center", borderLeft: "2px solid #E1705515", ...(uRci.tdStyle || {}) }}>
                                        <input type="number" step="0.01" value={row.rciPts || ""} disabled={carriereValidee} title={uRci.title} onChange={e => { const v = parseFloat(e.target.value) || 0; setCarriereRows(prev => prev.map(r => r.yr === row.yr ? { ...r, rciPts: v } : r)); }} style={{ width: 72, textAlign: "center", border: "1px solid #E1705530", borderRadius: 3, fontSize: 13, padding: "1px 4px", color: "#E17055", fontWeight: 600, background: carriereValidee ? "#fafafa" : "#fff" }} />
                                        {uRci.badge}
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
                                      {dynamicRegimes.map((regime) => {
                                        const value = getPoints(row, regime.key);
                                        return (
                                          <td
                                            key={regime.key}
                                            style={{
                                              padding: "3px 5px",
                                              textAlign: "center",
                                              borderLeft: "2px solid " + regime.color + "30",
                                              background: regime.isUnknown ? "#F3F4F6" : undefined,
                                            }}
                                          >
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={value ?? ""}
                                              disabled={true}
                                              readOnly
                                              style={{
                                                width: 72,
                                                textAlign: "center",
                                                border: "1px solid " + regime.color + "30",
                                                borderRadius: 3,
                                                fontSize: 13,
                                                padding: "1px 4px",
                                                color: regime.color,
                                                fontWeight: 600,
                                                background: "#fafafa",
                                              }}
                                            />
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                                <tr>
                                  <td colSpan={(cnavplOpen ? 18 : 16) + dynamicRegimes.length} style={{ padding: "4px 8px" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                      <button onClick={() => setVisibleRowCount(v => Math.min(v + 1, 65))} style={{ fontSize: 14, padding: "3px 10px", borderRadius: 5, border: "1px dashed #bbb", background: "transparent", color: "#555", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Ajouter une année ({carriereRows[visibleRowCount] ? carriereRows[visibleRowCount].yr : "—"})
                                      </button>
                                      {(() => {
                                        const lastYr = carriereRows[visibleRowCount - 1] ? carriereRows[visibleRowCount - 1].yr : null;
                                        const canRemove = !carriereValidee && visibleRowCount > 1 && lastYr != null;
                                        return (
                                          <button
                                            disabled={!canRemove}
                                            onClick={() => {
                                              if (!canRemove) return;
                                              // Supprime l'année la plus ancienne affichée : on efface ses données
                                              // (trimestres, salaires, points) ET on la masque, pour qu'elle disparaisse
                                              // vraiment des totaux (qui somment trimCotState/trimAssState/arState).
                                              const delKey = (setter) => setter(prev => { const n = { ...prev }; delete n[lastYr]; return n; });
                                              setCarriereRows(prev => prev.map(r => r.yr === lastYr ? { ...r, sal: 0, ss: 0, revalo: 0, agircT1: 0, agircT2: 0, agircPts: 0, ircPts: 0, rciPts: 0, regimes: {}, projected: false } : r));
                                              delKey(setTrimCotState); delKey(setTrimAssState); delKey(setArState); delKey(setRevaloValues); delKey(setDeplafValues);
                                              setVisibleRowCount(v => Math.max(1, v - 1));
                                            }}
                                            style={{ fontSize: 14, padding: "3px 10px", borderRadius: 5, border: "1px dashed #d99", background: "transparent", color: canRemove ? "#c0392b" : "#bbb", cursor: canRemove ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 4 }}
                                            title={carriereValidee ? "Déverrouillez la carrière pour supprimer une année" : ""}
                                          >
                                            <span style={{ fontSize: 14, lineHeight: 1 }}>−</span> Retirer une année ({lastYr != null ? lastYr : "—"})
                                          </button>
                                        );
                                      })()}
                                    </div>
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
                                  {dynamicRegimes.map((regime) => {
                                    const total = carriereRows
                                      .slice(0, visibleRowCount)
                                      .reduce((s, r) => s + (Number(getPoints(r, regime.key)) || 0), 0);
                                    const formatted = total
                                      ? total.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
                                      : "—";
                                    return (
                                      <td
                                        key={regime.key}
                                        style={{
                                          padding: "5px 5px",
                                          textAlign: "center",
                                          fontSize: 15,
                                          color: regime.color,
                                          borderLeft: "2px solid " + regime.color + "15",
                                          fontWeight: 700,
                                        }}
                                      >
                                        {formatted}
                                      </td>
                                    );
                                  })}
                                </tr>
                                {samOpen && (
                                  <tr>
                                    <td colSpan={(cnavplOpen ? 18 : 16) + dynamicRegimes.length} style={{ padding: 0, background: "#fff" }}>
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

                          {/* Données de calcul — sous la grille, repliable */}
                          <div style={{ marginTop: 12 }}>
                            <CalculDataPanel
                              carriereRows={carriereRows}
                              trimCotState={trimCotState}
                              trimAssState={trimAssState}
                              arState={arState}
                              user={user}
                              departureDates={departureDates}
                              collapsible
                              defaultOpen
                            />
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
                                        {/* ── CIPAV : vignettes totaux (lecture seule) — saisie via colonne CIPAV du tableau ci-dessus ── */}
                                        {reg.id === "cnavpl_acc" ? (
                                          cipavRecap ? (
                                            <RegimeRecapVignettes recap={cipavRecap} />
                                          ) : (
                                            <div style={{ fontSize: 13, color: "#555" }}><em>Données CIPAV — à compléter / importer depuis le RIS.</em></div>
                                          )
                                        ) : reg.id === "cnav_acc" ? (
                                          /* ── CNAV : vignettes totaux (lecture seule) ou synthèse ── */
                                          recapByCode.CNAV ? (
                                            <RegimeRecapVignettes recap={recapByCode.CNAV} sam={skillResult?.python_output?.sam} />
                                          ) : risCarriereSynthese ? (
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
                                          /* ── AGIRC-ARRCO : vignette total (lecture seule) ou total extrait ── */
                                          recapByCode.AGIRC_ARRCO ? (
                                            <RegimeRecapVignettes recap={recapByCode.AGIRC_ARRCO} />
                                          ) : droitsSynthese?.agirc_arrco != null ? (
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
                                          /* ── IRCANTEC : vignette total (lecture seule) ou total extrait ── */
                                          recapByCode.IRCANTEC ? (
                                            <RegimeRecapVignettes recap={recapByCode.IRCANTEC} />
                                          ) : droitsSynthese?.ircantec != null ? (
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
                                          /* ── RCI / SSI : vignette total (lecture seule) ou total extrait ── */
                                          recapByCode.RCI ? (
                                            <RegimeRecapVignettes recap={recapByCode.RCI} />
                                          ) : droitsSynthese?.rci != null ? (
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
                      const dispBirthDate = user?.birth_date;
                      // Dates de départ + durée d'assurance : calculées une seule fois dans
                      // le memo departureDates (partagé avec le sélecteur de projection).
                      const {
                        trimAcquis: dispTrimAcquis,
                        anneeRef: dispAnneeRef,
                        trimParAnnee: dispTrimParAnnee,
                        legale: dispDateLegale,
                        tauxPlein: dispDateTauxPlein,
                        date67: dispDate67,
                      } = departureDates;
                      // Complementary figures shown inside each date card so the three
                      // boxes together expose age-at-date + acquired/required trimestres.
                      const dispTrimRequis = dispDateTauxPlein?.trimRequis ?? null;
                      const dispTrimManquants = dispTrimRequis != null ? Math.max(0, dispTrimRequis - dispTrimAcquis) : null;
                      const dispTauxPleinAtteint = dispTrimRequis != null && dispTrimAcquis >= dispTrimRequis;
                      const ageAtDispDate = (date) => {
                        if (!dispBirthDate || !date) return null;
                        const b = new Date(dispBirthDate);
                        if (isNaN(b.getTime())) return null;
                        let years = date.getFullYear() - b.getFullYear();
                        let months = date.getMonth() - b.getMonth();
                        if (date.getDate() < b.getDate()) months -= 1;
                        if (months < 0) { years -= 1; months += 12; }
                        return months > 0 ? `${years} ans ${months} m` : `${years} ans`;
                      };
                      const trimAcquisVal = dispTrimAcquis > 0 ? `${dispTrimAcquis} trim.` : "—";
                      const trimRequisVal = dispTrimRequis != null ? `${dispTrimRequis} trim.` : "—";
                      const manquantsVal = dispTrimManquants == null ? "—" : (dispTrimManquants === 0 ? "✓ atteint" : `${dispTrimManquants} trim.`);
                      const manquantsColorDisp = dispTrimManquants == null ? "#555" : (dispTrimManquants === 0 ? "#00B894" : "#C0392B");
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

                          <CalculDataPanel
                            carriereRows={carriereRows}
                            trimCotState={trimCotState}
                            trimAssState={trimAssState}
                            arState={arState}
                            user={user}
                            departureDates={departureDates}
                          />

                          <div style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#0984E3" }}>Dates standard</div>
                              <span style={{ fontSize: 11, color: "#888" }}>— cliquez pour retenir une date</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 7 }}>
                              {[
                                { id: "age_legal", label: "Âge légal", icon: "⚖️", info: dispDateLegale ? `${dispDateLegale.ageStr} → ${dispDateLegale.label}` : "Date de naissance manquante", dateInfo: dispDateLegale, disabled: !dispDateLegale, trimAt: dispDateLegale ? computeTrimAtDate(dispTrimAcquis, dispAnneeRef, dispDateLegale.date, dispTrimParAnnee) : null, details: dispDateLegale ? [
                                  { k: "Âge légal", v: dispDateLegale.ageStr },
                                  { k: "Trim. acquis", v: trimAcquisVal, color: "#0984E3" },
                                  { k: "Requis", v: trimRequisVal },
                                  { k: "Taux plein à cet âge", v: manquantsVal, color: manquantsColorDisp },
                                ] : null },
                                { id: "taux_plein", label: "Taux plein (durée)", icon: "🎯", info: dispDateTauxPlein ? (dispDateTauxPlein.trimManquants === 0 ? `${dispDateTauxPlein.ageStr} • ${dispDateTauxPlein.trimRequis} trim. atteints` : `${dispDateTauxPlein.ageStr} • ${dispDateTauxPlein.trimManquants} trim. manquants → ${dispDateTauxPlein.label}`) : "Date de naissance manquante", dateInfo: dispDateTauxPlein, disabled: !dispDateTauxPlein, trimAt: dispDateTauxPlein ? dispDateTauxPlein.trimRequis : null, details: dispDateTauxPlein ? [
                                  { k: "Âge à cette date", v: ageAtDispDate(dispDateTauxPlein.date) || "—", color: "#0984E3" },
                                  { k: "Trim. acquis", v: trimAcquisVal },
                                  { k: "Requis", v: trimRequisVal },
                                  { k: "Manquants", v: manquantsVal, color: manquantsColorDisp },
                                ] : null },
                                { id: "taux_plein_auto", label: "Taux plein auto (67 ans)", icon: "🔓", info: dispDate67 ? `67 ans → ${dispDate67.label}` : "Date de naissance manquante", dateInfo: dispDate67, disabled: !dispDate67, trimAt: dispDate67 ? computeTrimAtDate(dispTrimAcquis, dispAnneeRef, dispDate67.date, dispTrimParAnnee) : null, details: dispDate67 ? [
                                  { k: "Âge à cette date", v: ageAtDispDate(dispDate67.date) || "67 ans" },
                                  { k: "Trim. acquis", v: trimAcquisVal, color: "#0984E3" },
                                  { k: "Décote", v: dispTauxPleinAtteint ? "aucune" : "aucune (taux plein auto)", color: "#00B894" },
                                ] : null },
                                { id: "date_libre", label: "Date libre", icon: "📆", info: "Date de simulation à choisir", dateInfo: null, disabled: false, trimAt: null, details: null },
                              ].map((d) => {
                                const isChosen = chosenDates.some(cd => cd?.type === d.id && (d.id !== "date_libre" || cd?.date === dateLibreInput));
                                const handleClick = () => {
                                  if (d.disabled || chosenDateSaving) return;
                                  if (d.id === "date_libre") return; // géré par l'input + bouton dédié
                                  handleChooseDate(d.id, d.label, { ...d.dateInfo, info: d.info });
                                };
                                return (
                                  <div
                                    key={d.id}
                                    onClick={handleClick}
                                    style={{
                                      display: "flex", flexDirection: "column", gap: 3, padding: "9px 11px", borderRadius: 8,
                                      border: isChosen ? "2px solid #0984E3" : "1px solid #e8e8e8",
                                      background: isChosen ? "#E8F5FE" : "#fafafa",
                                      cursor: d.disabled ? "not-allowed" : (d.id === "date_libre" ? "default" : "pointer"),
                                      opacity: d.disabled ? 0.5 : 1,
                                      transition: "all 0.12s",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <span style={{ fontSize: 14 }}>{d.icon}</span>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: "#333", flex: 1 }}>{d.label}</div>
                                      {isChosen && <span title="Date retenue" style={{ fontSize: 13, color: "#0984E3" }}>✓</span>}
                                    </div>
                                    <div style={{ fontSize: 11, color: "#555", paddingLeft: 22 }}>
                                      {d.info.includes(" → ") ? (
                                        <>
                                          {d.info.split(" → ")[0]}
                                          <span style={{ display: "block", whiteSpace: "nowrap", fontWeight: 600, color: "#0984E3" }}>→ {d.info.split(" → ")[1]}</span>
                                        </>
                                      ) : d.info}
                                    </div>
                                    {d.trimAt != null && (
                                      <div style={{ fontSize: 10, color: "#999", paddingLeft: 22, marginTop: 1 }}>
                                        📊 {d.trimAt} trim. à cette date
                                      </div>
                                    )}
                                    {d.details && (
                                      <div style={{ paddingLeft: 22, marginTop: 3, display: "grid", gridTemplateColumns: "1fr auto", gap: "2px 8px", fontSize: 10.5 }}>
                                        {d.details.map((row) => (
                                          <React.Fragment key={row.k}>
                                            <span style={{ color: "#8a8a8a" }}>{row.k}</span>
                                            <span style={{ fontWeight: 700, color: row.color || "#444", textAlign: "right", whiteSpace: "nowrap" }}>{row.v}</span>
                                          </React.Fragment>
                                        ))}
                                      </div>
                                    )}
                                    {d.id === "date_libre" && (
                                      <div style={{ display: "flex", gap: 6, marginTop: 4, paddingLeft: 22 }}>
                                        <DateInputFR
                                          value={dateLibreInput}
                                          onChange={(e) => setDateLibreInput(e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #ccc", fontSize: 12, fontFamily: "inherit", width: 110 }}
                                        />
                                        <button
                                          onClick={(e) => { e.stopPropagation(); if (dateLibreInput) handleChooseDate("date_libre", "Date libre", null, dateLibreInput); }}
                                          disabled={!dateLibreInput || chosenDateSaving}
                                          style={{ padding: "3px 9px", borderRadius: 4, border: "none", background: !dateLibreInput || chosenDateSaving ? "#ccc" : "#0984E3", color: "#fff", fontWeight: 600, fontSize: 11, cursor: !dateLibreInput || chosenDateSaving ? "not-allowed" : "pointer" }}
                                        >
                                          {chosenDateSaving ? "…" : (isChosen ? "✓ Retenue" : "Retenir")}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, marginBottom: 10, paddingTop: 12, borderTop: "1px solid #e8e8e8" }}>
                            <span style={{ fontSize: 16 }}>🔧</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: panel.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>Scénarios applicables</span>
                            <span style={{ fontSize: 11, color: "#888" }}>— éligibles ({Object.values(scenarioSkillResults).filter(r => r?.eligible === true).length}) + rachats VPLR</span>
                          </div>

                          {chosenScenarios.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: "#FFF8E1", border: "1px solid #F9A825" }}>
                              <span style={{ fontSize: 14 }}>⭐</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#8D6E00" }}>
                                {chosenScenarios.length === 1 ? "Scénario retenu :" : `${chosenScenarios.length} scénarios retenus :`}
                              </span>
                              {chosenScenarios.map((cs) => (
                                <span key={cs.dispositif_id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 12, background: "#fff", border: "1px solid #F9A82560", fontSize: 11, color: "#333" }}>
                                  <span style={{ fontWeight: 600, color: "#8D6E00" }}>{cs.label}</span>
                                  {cs.result_summary?.date_depart_estimee && (
                                    <span style={{ color: "#555" }}>— 📅 {cs.result_summary.date_depart_estimee}</span>
                                  )}
                                  <button
                                    onClick={() => handleChooseScenario({ id: cs.dispositif_id, label: cs.label }, null)}
                                    disabled={chosenScenarioSaving}
                                    title="Retirer ce scénario"
                                    style={{ marginLeft: 2, padding: "0 6px", borderRadius: 8, border: "none", background: "transparent", color: "#8D6E00", fontWeight: 700, fontSize: 11, cursor: chosenScenarioSaving ? "wait" : "pointer", lineHeight: 1 }}
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="simu-action-grid">
                            {panel.actions.filter((action) => {
                              const code = DISPOSITIF_TO_SKILL_CODE[action.id];
                              const result = scenarioSkillResults[code];
                              // VPLR : toujours visible (le rachat est un levier consultant
                              // pertinent même quand non-éligible automatiquement).
                              if (code === "VPLR") return true;
                              return result?.eligible === true;
                            }).map((action) => {
                              const ok = checkReq(action.requires);
                              const miss = getMissing(action.requires);
                              const isActivated = activatedDispositifs.includes(action.id);
                              const isDetected = !!detectedDispositifs[action.id];
                              const detectedReason = detectedDispositifs[action.id] || "";
                              const skillCode = DISPOSITIF_TO_SKILL_CODE[action.id];
                              const isSkillRunning = skillCode ? !!scenarioSkillLoading[skillCode] : false;
                              const skillResultData = skillCode ? scenarioSkillResults[skillCode] : null;
                              const skillErrorMsg = skillCode ? scenarioSkillErrors[skillCode] : null;
                              const isExpanded = !!expandedScenarios[action.id];
                              const isChosen = chosenScenarios.some(s => s?.dispositif_id === action.id);
                              // Couleurs carte : retenu=vert, non éligible=rouge, éligible non retenu=gris.
                              const isIneligible = skillResultData && skillResultData.eligible !== true;
                              const eligibilityColor = isChosen ? "#00B894"
                                : isIneligible ? "#C0392B"
                                : "#999999";
                              const eligibilityBg = isChosen ? "#00B89412"
                                : isIneligible ? "#FDEDEC"
                                : "#fafafa";
                              const cardBorder = `2px solid ${isChosen ? eligibilityColor : eligibilityColor + "60"}`;
                              const cardBg = eligibilityBg;
                              return (
                                <div key={action.id}>
                                  <div
                                    onClick={() => setExpandedScenarios(prev => ({ ...prev, [action.id]: !prev[action.id] }))}
                                    title={skillResultData ? (skillResultData.eligible ? "Éligible" : "Non éligible") : (skillErrorMsg ? "Erreur" : "")}
                                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: 8, border: cardBorder, background: cardBg, cursor: "pointer", opacity: ok ? 1 : 0.45, width: "100%", transition: "all 0.12s" }}>
                                    <span style={{ fontSize: 15, flexShrink: 0 }}>{action.icon}</span>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#333", flex: 1, minWidth: 0 }}>{action.label}</div>
                                    {isChosen && (
                                      <span title="Scénario retenu" style={{ fontSize: 13, color: "#F9A825", flexShrink: 0, lineHeight: 1 }}>⭐</span>
                                    )}
                                    {isSkillRunning && !skillResultData && (
                                      <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #ccc", borderTop: `2px solid ${panel.color}`, borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                                    )}
                                    {skillResultData && (
                                      <span style={{ fontSize: 14, fontWeight: 700, color: eligibilityColor, flexShrink: 0, lineHeight: 1 }}>
                                        {skillResultData.eligible ? "✓" : "✗"}
                                      </span>
                                    )}
                                    {skillErrorMsg && !skillResultData && (
                                      <span style={{ fontSize: 14, color: "#D63031", flexShrink: 0, lineHeight: 1 }}>⚠</span>
                                    )}
                                    <span style={{ fontSize: 10, color: "#888", flexShrink: 0, transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
                                  </div>

                                  {isExpanded && (
                                    <div style={{ marginTop: 6, padding: "8px 12px", background: "#fff", border: "1px solid #eee", borderRadius: 6 }}>
                                      <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>{action.desc}</div>
                                      {isDetected && detectedReason && (
                                        <div style={{ fontSize: 10, color: "#F9A825", marginBottom: 6, fontStyle: "italic" }}>💡 {detectedReason}</div>
                                      )}
                                      {!ok && <div style={{ fontSize: 11, color: "#D63031", marginBottom: 6 }}>⚠ Manque : {miss.map((m) => DOC_TYPES.find((d) => d.id === m)?.label).join(", ")}</div>}

                                      {action.hasInput && skillCode && (
                                        <div style={{ marginBottom: 8 }}>
                                          <label style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", marginBottom: 4 }}>
                                            {action.inputLabel}
                                          </label>
                                          <div style={{ display: "flex", alignItems: "stretch", borderRadius: 6, overflow: "hidden", border: "1px solid #e0e0e0", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                                            <input
                                              type={action.inputType === "date" ? "date" : "number"}
                                              placeholder={action.inputType === "date" ? "" : "Ex: 3"}
                                              value={inputValues[action.id] || ""}
                                              onChange={(e) => setInputValues({ ...inputValues, [action.id]: e.target.value })}
                                              onBlur={(e) => persistChosenDispositifInput(action, e.target.value)}
                                              onClick={(e) => e.stopPropagation()}
                                              style={{ flex: 1, minWidth: 0, padding: "6px 10px", border: "none", outline: "none", fontSize: 12, background: "transparent", fontFamily: "inherit", color: "#333" }}
                                            />
                                            <button
                                              type="button"
                                              title={isSkillRunning ? "Calcul en cours…" : "Recalculer"}
                                              aria-label="Recalculer"
                                              onClick={(e) => { e.stopPropagation(); handleScenarioSkillExecute(skillCode, inputValues[action.id] ? { input: inputValues[action.id] } : {}); }}
                                              disabled={isSkillRunning || !carriereValidee}
                                              style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 5,
                                                padding: "0 12px",
                                                border: "none",
                                                borderLeft: "1px solid #e0e0e0",
                                                background: isSkillRunning || !carriereValidee ? "#f5f5f5" : panel.color,
                                                color: isSkillRunning || !carriereValidee ? "#999" : "#fff",
                                                fontWeight: 700,
                                                fontSize: 10,
                                                letterSpacing: "0.08em",
                                                textTransform: "uppercase",
                                                cursor: isSkillRunning || !carriereValidee ? "not-allowed" : "pointer",
                                                whiteSpace: "nowrap",
                                                transition: "background 0.15s, color 0.15s",
                                                flexShrink: 0
                                              }}
                                            >
                                              <span style={{ fontSize: 13, lineHeight: 1, display: "inline-flex" }}>{isSkillRunning ? "…" : "↻"}</span>
                                              <span>{isSkillRunning ? "" : "Recalculer"}</span>
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {skillErrorMsg && (
                                        <div style={{ padding: "7px 10px", background: "#D6303110", border: "1px solid #D63031", borderRadius: 5, fontSize: 12, color: "#D63031" }}>
                                          ⚠ {skillErrorMsg}
                                        </div>
                                      )}

                                      {skillResultData && !skillErrorMsg && (() => {
                                        const color = skillResultData.eligible ? "#00B894" : "#C0392B";
                                        return (
                                          <div>
                                            {skillCode === "RACL" && skillResultData.eligible && (
                                              <div style={{ marginBottom: 4 }}>
                                                {skillResultData.age_depart_possible != null && (
                                                  <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 2 }}>
                                                    🗓 Départ possible à {skillResultData.age_depart_possible} ans
                                                    {skillResultData.date_depart_estimee ? ` — ${skillResultData.date_depart_estimee}` : ""}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            {skillCode === "RACL" && !skillResultData.eligible && skillResultData.manquants > 0 && (
                                              <div style={{ fontSize: 11, color: "#C0392B", marginBottom: 4 }}>
                                                ⏳ {skillResultData.manquants} trimestre{skillResultData.manquants > 1 ? "s" : ""} cotisé{skillResultData.manquants > 1 ? "s" : ""} manquant{skillResultData.manquants > 1 ? "s" : ""}
                                              </div>
                                            )}
                                            {skillCode === "RP" && skillResultData.eligible && skillResultData.rp_result && (
                                              <div style={{ marginBottom: 4 }}>
                                                {skillResultData.rp_result.date_debut_rp_possible && (
                                                  <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 2 }}>
                                                    🗓 Début RP possible : {skillResultData.rp_result.date_debut_rp_possible}
                                                  </div>
                                                )}
                                                {skillResultData.rp_result.fraction_pension_provisoire_pct != null && (
                                                  <div style={{ fontSize: 11, color: "#0984E3", marginBottom: 2 }}>
                                                    💶 {skillResultData.rp_result.quotite_label}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            {skillCode === "RP" && !skillResultData.eligible && skillResultData.rp_result && (
                                              <div style={{ marginBottom: 4 }}>
                                                {!skillResultData.rp_result.condition_age_ok && (
                                                  <div style={{ fontSize: 11, color: "#C0392B", marginBottom: 2 }}>
                                                    ⏳ Âge insuffisant — {Math.ceil(skillResultData.rp_result.manquants_mois_age / 12 * 10) / 10} an(s) avant 62 ans
                                                  </div>
                                                )}
                                                {!skillResultData.rp_result.condition_trim_ok && (
                                                  <div style={{ fontSize: 11, color: "#C0392B", marginBottom: 2 }}>
                                                    ⏳ {skillResultData.rp_result.manquants_trimestres} trimestre{skillResultData.rp_result.manquants_trimestres > 1 ? "s" : ""} manquant{skillResultData.rp_result.manquants_trimestres > 1 ? "s" : ""} ({skillResultData.rp_result.trim_valides_actuels}/150 tous régimes)
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                            {skillCode === "CER" && skillResultData.cer_result && (
                                              <div style={{ marginBottom: 4 }}>
                                                {skillResultData.cer_result.type_cumul && (
                                                  <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 2 }}>
                                                    {skillResultData.cer_result.type_cumul === "CER_TOTAL" ? "✅ CER TOTAL" : "⚠️ CER PLAFONNÉ"}
                                                  </div>
                                                )}
                                                {skillResultData.eligible && skillResultData.cer_result.date_cumul_possible && (
                                                  <div style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>
                                                    🗓 Reprise possible dès {skillResultData.cer_result.date_cumul_possible}
                                                  </div>
                                                )}
                                                {skillResultData.cer_result.type_cumul === "CER_PLAFONNÉ" && (
                                                  <div style={{ fontSize: 11, color: "#E17055", marginBottom: 2 }}>
                                                    💶 Plafond mensuel : {skillResultData.cer_result.plafond_cer_plafonne_mensuel?.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € — Bascule CER TOTAL à 67 ans ({skillResultData.cer_result.date_bascule_cer_total})
                                                  </div>
                                                )}
                                                {!skillResultData.eligible && skillResultData.cer_result.manquants_mois_age_legal > 0 && (
                                                  <div style={{ fontSize: 11, color: "#C0392B", marginBottom: 2 }}>
                                                    ⏳ {Math.ceil(skillResultData.cer_result.manquants_mois_age_legal / 12 * 10) / 10} an(s) avant l'âge légal ({skillResultData.cer_result.age_legal_ans} ans{skillResultData.cer_result.age_legal_mois_complementaires > 0 ? " et " + skillResultData.cer_result.age_legal_mois_complementaires + " mois" : ""}) — accès estimé : {skillResultData.cer_result.date_cumul_possible}
                                                  </div>
                                                )}
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
                                          </div>
                                        );
                                      })()}

                                      {skillResultData && (
                                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #e0e0e0", display: "flex", justifyContent: "flex-end" }}>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleChooseScenario(action, skillResultData); }}
                                            disabled={chosenScenarioSaving}
                                            style={{
                                              padding: "5px 12px",
                                              borderRadius: 5,
                                              border: isChosen ? "1px solid #F9A825" : "1px solid #F9A82550",
                                              background: isChosen ? "#F9A825" : "#fff",
                                              color: isChosen ? "#fff" : "#8D6E00",
                                              fontWeight: 700,
                                              fontSize: 11,
                                              cursor: chosenScenarioSaving ? "wait" : "pointer",
                                            }}
                                          >
                                            {chosenScenarioSaving ? "…" : isChosen ? "⭐ Scénario retenu — cliquer pour annuler" : "☆ Retenir le scénario"}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {action.generates_date && skillResultData?.eligible === true && (() => {
                                    const dateInfo = computeAutoDateFromDispositif(action.id, user?.birth_date, trimCotState, trimAssState);
                                    if (!dateInfo) return null;
                                    return (
                                      <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 12, background: `${dateInfo.color}12`, border: `1px solid ${dateInfo.color}30` }}>
                                        <span style={{ fontSize: 12 }}>📅</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: dateInfo.color }}>{dateInfo.dateStr}</span>
                                        <span style={{ fontSize: 11, color: "#555" }}>· {dateInfo.age}</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              );
                            })}
                          </div>

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
                            {(() => {
                              // Calculs frais : déjà exécutés et carrière toujours gelée → on
                              // remplace le bouton "lancer les calculs" par un CTA vers les
                              // livrables pour éviter un reclic inutile (les calculs sont
                              // identiques tant que la carrière n'a pas été dégelée).
                              const tier1ActiveCodes = Object.keys(REGIMES_SIMPLES).filter(c => Object.values(regimesPoints[c] || {}).some(v => parseFloat(v) > 0));
                              const hasAnyTier1Result = tier1ActiveCodes.some(c => regimesSimplesResults[c]);
                              const calcsDone = !!(skillResult || agircResult || ircantecResult || rciResult || cipavResult || carpimkoResult || hasAnyTier1Result);
                              const hasCarpimkoPoints = Object.values(carpimkoRows).some(r => r.points_base || r.points_asv || r.points_compl);
                              const totalRegimes = 5 + (hasCarpimkoPoints ? 1 : 0) + tier1ActiveCodes.length;
                              // Career edited since the last calc → results are stale. One click
                              // re-freezes the edited grid then recomputes (autoChain), so the
                              // server engine reads the new data.
                              if (resultsStale && !isCalculatingAll) {
                                const recalcReady = !isCarriereEmpty && !!user?.birth_date && !frozenLoading;
                                return (
                                  <button
                                    onClick={() => { autoChainPendingRef.current = true; handleGeler(); }}
                                    disabled={!recalcReady}
                                    title="La carrière a été modifiée depuis le dernier calcul — recalcule les pensions avec les données actuelles"
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "12px 20px", borderRadius: 8, border: "none", background: recalcReady ? "linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)" : "#ccc", color: "#fff", fontWeight: 700, fontSize: 15, cursor: recalcReady ? "pointer" : "not-allowed", boxShadow: recalcReady ? "0 4px 14px rgba(234,88,12,0.32)" : "none", transition: "all 0.2s" }}
                                  >
                                    {frozenLoading ? (
                                      <>
                                        <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #fff4", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                        Recalcul en cours…
                                      </>
                                    ) : (
                                      <>
                                        <span style={{ fontSize: 16 }}>⚠️</span>
                                        Résultats périmés — Recalculer ({totalRegimes} régimes)
                                      </>
                                    )}
                                  </button>
                                );
                              }
                              if (carriereValidee && calcsDone && !isCalculatingAll) {
                                return (
                                  <button
                                    onClick={() => { setExpandedPanel("livrables"); setSelectedAction(null); setExecuted(null); }}
                                    title="Calculs déjà effectués — passer aux livrables. Pour relancer, déverrouillez la carrière."
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "12px 20px", borderRadius: 8, border: "1px solid #ccc", background: "#f3f3f3", color: "#555", fontWeight: 700, fontSize: 15, cursor: "pointer", transition: "all 0.2s" }}
                                  >
                                    <span style={{ fontSize: 14, color: "#888" }}>✓ Calculs effectués</span>
                                    <span style={{ flex: 1, textAlign: "center" }}>Passer aux livrables</span>
                                    <span style={{ fontSize: 16 }}>→</span>
                                  </button>
                                );
                              }
                              return (
                                <button
                                  onClick={handleCalculateAllRegimes}
                                  disabled={!carriereValidee || isCalculatingAll || isCarriereEmpty || !user?.birth_date}
                                  title={!carriereValidee ? "Validez d'abord la carrière" : isCarriereEmpty ? "Carrière vide" : !user?.birth_date ? "Date de naissance manquante" : `Lancer le calcul simultané des ${totalRegimes} régimes`}
                                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "12px 20px", borderRadius: 8, border: "none", background: carriereValidee && !isCalculatingAll && !isCarriereEmpty && user?.birth_date ? "linear-gradient(135deg, #6C5CE7 0%, #0984E3 100%)" : "#ccc", color: "#fff", fontWeight: 700, fontSize: 15, cursor: carriereValidee && !isCalculatingAll && !isCarriereEmpty && user?.birth_date ? "pointer" : "not-allowed", boxShadow: carriereValidee && !isCalculatingAll && !isCarriereEmpty && user?.birth_date ? "0 4px 14px rgba(108,92,231,0.35)" : "none", transition: "all 0.2s" }}
                                >
                                  {isCalculatingAll ? (
                                    <>
                                      <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #fff4", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                      Calculs en cours… ({totalRegimes} régimes)
                                    </>
                                  ) : (
                                    <>
                                      <span style={{ fontSize: 16 }}>🚀</span>
                                      Calculer toutes les pensions ({totalRegimes} régimes)
                                    </>
                                  )}
                                </button>
                              );
                            })()}

                            {SHOW_CARPIMKO_DEBUG && (() => {
                              const round2 = n => Math.round((Number(n) || 0) * 100) / 100;
                              const sumBase = round2(Object.values(carpimkoRows).reduce((s, r) => s + (parseFloat(r.points_base) || 0), 0));
                              const sumAsv = round2(Object.values(carpimkoRows).reduce((s, r) => s + (parseFloat(r.points_asv) || 0), 0));
                              const sumCompl = round2(Object.values(carpimkoRows).reduce((s, r) => s + (parseFloat(r.points_compl) || 0), 0));
                              return (
                            <div style={{ marginTop: 8, padding: 10, background: "#FFF7ED", border: "1px dashed #FB923C", borderRadius: 6 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#9A3412", letterSpacing: 0.3 }}>🏥 CARPIMKO</span>
                                <button
                                  onClick={() => setCarpimkoOpen(o => !o)}
                                  style={{ padding: "3px 9px", borderRadius: 5, border: "1px solid #FB923C50", background: "#FFF", color: "#9A3412", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                                >
                                  {carpimkoOpen ? "▼ Masquer la saisie année par année" : "▶ Afficher la saisie année par année"}
                                </button>
                                <span style={{ fontSize: 11, color: "#9A3412", marginLeft: "auto" }}>
                                  Totaux : <strong>{sumBase}</strong> Base · <strong>{sumAsv}</strong> ASV · <strong>{sumCompl}</strong> Compl
                                </span>
                                {SHOW_CARPIMKO_DEBUG && (
                                <button
                                  onClick={async () => {
                                    setCarpimkoDebugLoading(true);
                                    setCarpimkoDebugError(null);
                                    setCarpimkoDebugResult(null);
                                    try {
                                      const scenarioParams = {
                                        points_base: sumBase,
                                        points_asv: sumAsv,
                                        points_complementaire: sumCompl,
                                      };
                                      console.log("[CARPIMKO] sending scenario_params", scenarioParams);
                                      const res = await executeScript("CARPIMKO", id, "Calcul CARPIMKO unifié — base + ASV + complémentaire", scenarioParams);
                                      setCarpimkoDebugResult(res);
                                      console.log("[CARPIMKO] response", res);
                                      if (res?.arret_critique) toast.error(res.arret_critique.raison || "Calcul CARPIMKO interrompu");
                                      else toast.success("CARPIMKO : réponse reçue");
                                    } catch (err) {
                                      const msg = err?.response?.data?.message || err?.response?.data?.arret_critique?.raison || err?.message || "Erreur réseau CARPIMKO";
                                      setCarpimkoDebugError(msg);
                                      console.error("[CARPIMKO] error", err);
                                      toast.error("CARPIMKO : " + msg);
                                    } finally {
                                      setCarpimkoDebugLoading(false);
                                    }
                                  }}
                                  disabled={carpimkoDebugLoading || !id}
                                  style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid #FB923C", background: carpimkoDebugLoading ? "#FED7AA" : "#FFF", color: "#9A3412", fontWeight: 700, fontSize: 12, cursor: carpimkoDebugLoading ? "wait" : "pointer" }}
                                >
                                  {carpimkoDebugLoading ? "⏳ Calcul…" : "🚀 Lancer CARPIMKO (debug)"}
                                </button>
                                )}
                              </div>
                              {carpimkoOpen && (
                                <div style={{ marginBottom: 8, background: "#fff", border: "1px solid #FB923C30", borderRadius: 6, padding: 8, maxHeight: 280, overflowY: "auto" }}>
                                  <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                                    <thead>
                                      <tr style={{ background: "#FFF7ED" }}>
                                        <th style={{ padding: "4px 6px", textAlign: "left", fontWeight: 700, color: "#9A3412" }}>Année</th>
                                        <th style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700, color: "#9A3412" }}>Pts Base</th>
                                        <th style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700, color: "#9A3412" }}>Pts ASV</th>
                                        <th style={{ padding: "4px 6px", textAlign: "center", fontWeight: 700, color: "#9A3412" }}>Pts Compl</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {Object.keys(carpimkoRows).sort((a, b) => parseInt(b) - parseInt(a)).map(yr => {
                                        const row = carpimkoRows[yr];
                                        const updateRow = (field, val) => setCarpimkoRows(prev => ({ ...prev, [yr]: { ...prev[yr], [field]: val } }));
                                        return (
                                          <tr key={yr} style={{ borderBottom: "1px solid #FB923C15" }}>
                                            <td style={{ padding: "3px 6px", fontWeight: 600, color: "#374151" }}>{yr}</td>
                                            <td style={{ padding: "3px 6px", textAlign: "center" }}>
                                              <input
                                                type="number"
                                                value={row.points_base}
                                                onChange={e => updateRow("points_base", e.target.value)}
                                                disabled={carriereValidee}
                                                placeholder="—"
                                                style={{ width: 70, padding: "2px 4px", border: "1px solid #FB923C40", borderRadius: 3, fontSize: 11, textAlign: "right", background: carriereValidee ? "#f5f5f5" : "#fff" }}
                                              />
                                            </td>
                                            <td style={{ padding: "3px 6px", textAlign: "center" }}>
                                              <input
                                                type="number"
                                                value={row.points_asv}
                                                onChange={e => updateRow("points_asv", e.target.value)}
                                                disabled={carriereValidee}
                                                placeholder="—"
                                                style={{ width: 70, padding: "2px 4px", border: "1px solid #FB923C40", borderRadius: 3, fontSize: 11, textAlign: "right", background: carriereValidee ? "#f5f5f5" : "#fff" }}
                                              />
                                            </td>
                                            <td style={{ padding: "3px 6px", textAlign: "center" }}>
                                              <input
                                                type="number"
                                                value={row.points_compl}
                                                onChange={e => updateRow("points_compl", e.target.value)}
                                                disabled={carriereValidee}
                                                placeholder="—"
                                                style={{ width: 70, padding: "2px 4px", border: "1px solid #FB923C40", borderRadius: 3, fontSize: 11, textAlign: "right", background: carriereValidee ? "#f5f5f5" : "#fff" }}
                                              />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                  {carriereValidee && (
                                    <div style={{ marginTop: 6, fontSize: 10, color: "#9A3412", fontStyle: "italic" }}>
                                      Carrière gelée — déverrouillez pour modifier les points CARPIMKO.
                                    </div>
                                  )}
                                </div>
                              )}
                              {SHOW_CARPIMKO_DEBUG && carpimkoDebugError && (
                                <div style={{ fontSize: 12, color: "#B91C1C", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                                  Erreur : {carpimkoDebugError}
                                </div>
                              )}
                              {SHOW_CARPIMKO_DEBUG && carpimkoDebugResult && (
                                <div style={{ fontSize: 12, color: "#374151" }}>
                                  <div>✓ Pension mensuelle brute : <strong>{carpimkoDebugResult.python_output?.pension_mensuelle_brute ?? "—"}</strong> € · annuelle : <strong>{carpimkoDebugResult.python_output?.pension_annuelle_brute ?? "—"}</strong> €</div>
                                  <div style={{ marginTop: 4, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                                    <div>Base : {(Math.round((carpimkoDebugResult.python_output?.details_base?.points ?? 0) * 100) / 100)} pts × {carpimkoDebugResult.python_output?.details_base?.valeur_point ?? 0} €</div>
                                    <div>ASV : {(Math.round((carpimkoDebugResult.python_output?.details_asv?.points ?? 0) * 100) / 100)} pts × {carpimkoDebugResult.python_output?.details_asv?.valeur_point ?? 0} €</div>
                                    <div>Compl : {(Math.round((carpimkoDebugResult.python_output?.details_complementaire?.points ?? 0) * 100) / 100)} pts × {carpimkoDebugResult.python_output?.details_complementaire?.valeur_point ?? 0} €</div>
                                  </div>
                                  {Array.isArray(carpimkoDebugResult.alertes) && carpimkoDebugResult.alertes.length > 0 && (
                                    <div style={{ marginTop: 6, fontSize: 11, color: "#9A3412" }}>
                                      {carpimkoDebugResult.alertes.length} alerte(s) — voir console
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                              );
                            })()}
                          </div>

                          {resultsStale && (
                            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "#FFF7ED", border: "1px solid #FDBA74", color: "#9A3412", fontSize: 12.5, fontWeight: 600 }}>
                              <span style={{ fontSize: 15 }}>⚠️</span>
                              <span style={{ flex: 1 }}>Carrière modifiée depuis ces calculs — les montants affichés sont périmés. Cliquez « Recalculer » pour les mettre à jour.</span>
                            </div>
                          )}
                          {(skillResult || agircResult || ircantecResult || rciResult || cipavResult || carpimkoResult) && (
                            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                              <button
                                onClick={() => setShowDetailedCalcs(s => !s)}
                                style={{ padding: "3px 9px", borderRadius: 5, border: "none", background: "transparent", color: "#888", fontWeight: 500, fontSize: 11, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
                                {showDetailedCalcs ? "Masquer les calculs détaillés" : "Afficher les calculs détaillés"}
                              </button>
                            </div>
                          )}

                          {showDetailedCalcs && (<>
                            <RegimeResultCard code="CNAV"        carriereValidee={carriereValidee} loading={skillLoading}    error={skillError}    result={skillResult} />
                            <RegimeResultCard code="AGIRC_ARRCO" carriereValidee={carriereValidee} loading={agircLoading}    error={agircError}    result={agircResult} />
                            <RegimeResultCard code="IRCANTEC"    carriereValidee={carriereValidee} loading={ircantecLoading} error={ircantecError} result={ircantecResult} />
                            <RegimeResultCard code="RCI"         carriereValidee={carriereValidee} loading={rciLoading}      error={rciError}      result={rciResult} />
                            <RegimeResultCard code="CIPAV"       carriereValidee={carriereValidee} loading={cipavLoading}    error={cipavError}    result={cipavResult} />
                            {(Object.values(carpimkoRows).some(r => r.points_base || r.points_asv || r.points_compl) || carpimkoResult || carpimkoLoading || carpimkoError) && (
                              <RegimeResultCard code="CARPIMKO"  carriereValidee={carriereValidee} loading={carpimkoLoading} error={carpimkoError} result={carpimkoResult} />
                            )}
                            {Object.keys(REGIMES_SIMPLES).map(code => {
                              const hasPoints = Object.values(regimesPoints[code] || {}).some(v => parseFloat(v) > 0);
                              const hasState = regimesSimplesResults[code] || regimesSimplesLoading[code] || regimesSimplesErrors[code];
                              if (!hasPoints && !hasState) return null;
                              return (
                                <RegimeResultCard
                                  key={code}
                                  code={code}
                                  carriereValidee={carriereValidee}
                                  loading={!!regimesSimplesLoading[code]}
                                  error={regimesSimplesErrors[code] || null}
                                  result={regimesSimplesResults[code] || null}
                                />
                              );
                            })}
                            {(() => {
                              const wired = ["CNAV", "AGIRC_ARRCO", "IRCANTEC", "RCI", "CIPAV", "CARPIMKO", "CARPIMKO_ASV", "CARPIMKO_COMPL", ...Object.keys(REGIMES_SIMPLES)];
                              return computeVisibleRegimes(carriereRows, wired).filter(r => !wired.includes(r.key));
                            })().map((regime) => (
                              <div
                                key={regime.key}
                                style={{
                                  background: "#F3F4F6",
                                  border: "1px dashed #D1D5DB",
                                  padding: 14,
                                  borderRadius: 8,
                                  marginTop: 12,
                                  opacity: 0.92,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                  <span style={{ fontSize: 18 }}>{regime.icon}</span>
                                  <span style={{ fontWeight: 700, fontSize: 15, color: "#374151" }}>
                                    {regime.label}
                                  </span>
                                  {regime.isUnknown && (
                                    <span
                                      title="Régime détecté automatiquement, calcul non disponible"
                                      style={{ fontSize: 14 }}
                                    >
                                      ⚠️
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 13, color: "#6B7280" }}>
                                  Saisie carrière disponible. Calcul de pension non implémenté pour ce régime.
                                </div>
                                {regime.isUnknown && (
                                  <div style={{ marginTop: 4, fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>
                                    Régime détecté automatiquement depuis le RIS.
                                  </div>
                                )}
                              </div>
                            ))}
                          </>)}
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

                          {selectedAction?.id === "rapport_consultation" && (
                            <div style={{ marginTop: 14, borderTop: "1px solid #eee", paddingTop: 14 }}>
                              {!fileToSend && userDocuments.filter(d => (d.filename || "").toLowerCase().endsWith(".pdf")).length === 0 && (
                                <div style={{ padding: "8px 12px", background: "#FFF3CD", borderRadius: 7, marginBottom: 10, fontSize: 13, color: "#856404", border: "1px solid #FFE08A" }}>
                                  ⚠ RIS non détecté — le rapport sera généré à partir des données saisies manuellement.
                                </div>
                              )}
                              <button
                                onClick={handleGenerateRapportConsultation}
                                disabled={isGeneratingReport}
                                style={{ padding: "10px 20px", borderRadius: 7, border: "none", background: isGeneratingReport ? "#a29bfe" : panel.color, color: "#fff", fontWeight: 700, fontSize: 13, cursor: isGeneratingReport ? "wait" : "pointer", opacity: isGeneratingReport ? 0.7 : 1 }}
                              >
                                {isGeneratingReport ? "⏳ Génération en cours…" : "▶ Générer le rapport de consultation retraite"}
                              </button>
                            </div>
                          )}

                          {selectedAction?.id === "simulation_retraite" && (
                            <div style={{ marginTop: 14, borderTop: "1px solid #eee", paddingTop: 14 }}>
                              <button
                                onClick={handleGenerateSimulationRetraite}
                                disabled={isGeneratingSimulation}
                                style={{ padding: "10px 20px", borderRadius: 7, border: "none", background: isGeneratingSimulation ? "#9ad9c0" : panel.color, color: "#fff", fontWeight: 700, fontSize: 13, cursor: isGeneratingSimulation ? "wait" : "pointer", opacity: isGeneratingSimulation ? 0.7 : 1 }}
                              >
                                {isGeneratingSimulation ? "⏳ Génération en cours… (1-2 min)" : "▶ Générer la simulation retraite"}
                              </button>
                            </div>
                          )}

                          {selectedAction?.id === "audit_retraite" && (
                            <div style={{ marginTop: 14, borderTop: "1px solid #eee", paddingTop: 14 }}>
                              <button
                                onClick={handleGenerateAuditRetraite}
                                disabled={isGeneratingAudit}
                                style={{ padding: "10px 20px", borderRadius: 7, border: "none", background: isGeneratingAudit ? "#a29bfe" : panel.color, color: "#fff", fontWeight: 700, fontSize: 13, cursor: isGeneratingAudit ? "wait" : "pointer", opacity: isGeneratingAudit ? 0.7 : 1 }}
                              >
                                {isGeneratingAudit ? "⏳ Génération en cours… (plusieurs minutes)" : "▶ Générer l'audit retraite"}
                              </button>
                            </div>
                          )}

                          {generatedDocs.length > 0 && (
                            <div style={{ marginTop: 18, background: `${panel.color}08`, border: `1px solid ${panel.color}25`, borderRadius: 10, padding: "12px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                <span style={{ fontSize: 16 }}>📄</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: panel.color }}>Documents générés</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: panel.color, borderRadius: 10, padding: "1px 9px", minWidth: 20, textAlign: "center" }}>{generatedDocs.length}</span>
                              </div>
                              {generatedDocs.map((doc) => (
                                <div
                                  key={doc.id}
                                  style={{ display: "flex", flexDirection: "column", padding: "11px 14px", borderRadius: 8, border: doc.arretCritique ? "1px solid #D6303140" : "1px solid #e8e8e8", borderLeft: doc.arretCritique ? "3px solid #D63031" : `3px solid ${panel.color}`, background: doc.arretCritique ? "#D6303106" : "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 7 }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setViewingDoc(doc)}>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: "#333", textDecoration: "underline", textDecorationColor: "#ccc", textUnderlineOffset: 2 }}>
                                        📄 {doc.name}
                                        {doc.arretCritique && (
                                          <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, color: "#fff", background: "#D63031", borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>🚫 Livraison bloquée</span>
                                        )}
                                        {!doc.arretCritique && doc.alertes && doc.alertes.length > 0 && (
                                          <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, color: "#fff", background: "#E17055", borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>⚠️ {doc.alertes.length} alerte(s)</span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                                        {new Date(doc.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                      <button
                                        type="button"
                                        onClick={() => setViewingDoc(doc)}
                                        style={{ background: "none", border: "none", color: panel.color, cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
                                        title="Visualiser"
                                      >
                                        <Eye size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeleteGenDocId(doc.id)}
                                        style={{ background: "none", border: "none", color: "#dc3545", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
                                        title="Supprimer"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                  {doc.arretCritique ? (
                                    <RegimeArretCritique arret={doc.arretCritique} alertes={doc.alertes} />
                                  ) : (doc.alertes && doc.alertes.length > 0 ? (
                                    <RegimeAlertes alertes={doc.alertes} themeColor="#E17055" />
                                  ) : null)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })()}
                </div>
              </div>

              {/* Pavé prompt IA — visible uniquement dans Scénarios et Livrables (pas en Carrière, FROZEN_DATA pure) */}
              {(expandedPanel === "dispositifs" || expandedPanel === "livrables") && (
              <div style={{ ...S.card, padding: 14, marginTop: 16, border: promptText ? "2px solid #6C5CE7" : undefined }}>
                <style>{`
                  @keyframes pavePulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(108,92,231,0.5); } 50% { transform: scale(1.08); box-shadow: 0 0 0 6px rgba(108,92,231,0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(108,92,231,0); } }
                  .pave-badge-pulse { animation: pavePulse 1.2s ease-out; }
                `}</style>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>💬 Note pour l'IA</div>
                  {promptText && (
                    <span key={promptText.length} className="pave-badge-pulse" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#6C5CE7", color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                      Actif
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>
                  Écrivez ici toute précision utile pour le client. L'IA en tiendra compte dans le prochain calcul ou rapport.
                </div>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value.slice(0, 500))}
                  placeholder="Exemple : insister sur le maintien des revenus pendant la transition."
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 7, border: "1px solid #ccc", fontSize: 14, fontFamily: "inherit", resize: "vertical", minHeight: 80, boxSizing: "border-box", background: "#fff", color: "#333", lineHeight: 1.5 }}
                />
                {promptNotes.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowPromptHistory(v => !v)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, border: "1px solid #6C5CE7", background: showPromptHistory ? "#6C5CE7" : "#fff", color: showPromptHistory ? "#fff" : "#6C5CE7", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      📋 Mes notes précédentes ({promptNotes.length})
                      <span style={{ fontSize: 10, transform: showPromptHistory ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
                    </button>
                    {showPromptHistory && (
                      <div style={{ marginTop: 6, border: "1px solid #E0DCFF", borderRadius: 6, background: "#FDFCFF", maxHeight: 220, overflowY: "auto" }}>
                        {promptNotes.map((note) => (
                          <div key={note.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", borderBottom: "1px solid #EFEBFF" }}>
                            <button
                              type="button"
                              onClick={() => { setPromptText(note.content.slice(0, 500)); setShowPromptHistory(false); }}
                              title="Réutiliser cette note"
                              style={{ flex: 1, textAlign: "left", background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "#333", fontSize: 12, lineHeight: 1.45 }}
                            >
                              <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>
                                {new Date(note.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </div>
                              <div>{note.content.length > 120 ? note.content.slice(0, 120) + "…" : note.content}</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePromptNote(note.id)}
                              title="Supprimer"
                              style={{ background: "transparent", border: "none", color: "#D63031", cursor: "pointer", padding: 2, flexShrink: 0 }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {promptText && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "8px 12px", background: "#F2F0FF", border: "1px solid #6C5CE7", borderRadius: 6 }}>
                    <span style={{ fontSize: 16, color: "#6C5CE7", fontWeight: 700 }}>✓</span>
                    <span style={{ fontSize: 12, color: "#3F2D8A", fontWeight: 600 }}>
                      Votre note sera transmise à l'IA lors du prochain calcul ou rapport.
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "#888" }}>{promptText.length}/500</span>
                  {promptText && (
                    <button
                      onClick={() => setPromptText("")}
                      style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, border: "1.5px solid #D63031", background: "#fff", color: "#D63031", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#D63031"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#D63031"; }}
                    >
                      <Trash2 size={14} />
                      Effacer la note
                    </button>
                  )}
                </div>
              </div>
              )}

            </>
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
                                {(() => {
                                  const skillCode = RULE_ID_TO_SKILL_CODE[rule.id];
                                  if (skillCode) {
                                    return (
                                      <button
                                        onClick={() => setEditSkillCode(skillCode)}
                                        title={`Éditer le skill ${skillCode} (skill_md + regles_json)`}
                                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #00B894", background: "#00B89408", color: "#00B894", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                                        ✏️ Éditer
                                      </button>
                                    );
                                  }
                                  return (
                                    <button
                                      onClick={() => setCreateSkillOpen(true)}
                                      title="Aucun skill en base — créer un skill pour cette règle"
                                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px dashed #888", background: "#88888808", color: "#555", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                                      ➕ Créer le skill
                                    </button>
                                  );
                                })()}
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
                    {ADMIN_SECTIONS.parametres.items.map((rawParam, i) => {
                      const param = resolveParam(rawParam);
                      const isEditing = editingParamId === param.id;
                      return (
                      <div key={param.id} onClick={() => !isEditing && setExpandedParam(expandedParam === i ? null : i)} style={{ borderRadius: 8, border: `1px solid ${expandedParam === i ? "#0984E330" : "#eee"}`, padding: "10px 12px", cursor: isEditing ? "default" : "pointer", background: expandedParam === i ? "#0984E306" : "#fafafa" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                            <span style={{ fontSize: 14 }}>{param.icon}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>
                                {param.label}
                                {param._overridden && !isEditing && (
                                  <span title="Valeur personnalisée (override local)" style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px", borderRadius: 3, background: "#E1705515", color: "#E17055", fontWeight: 700, letterSpacing: "0.04em" }}>ÉDITÉ</span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: "#555" }}>{param.desc}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10, minWidth: 220 }}>
                            {isEditing ? (
                              <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <input
                                  type="text"
                                  value={paramDraft.value}
                                  onChange={(e) => setParamDraft({ ...paramDraft, value: e.target.value })}
                                  placeholder="Valeur"
                                  style={{ width: "100%", fontSize: 13, fontWeight: 700, color: "#0984E3", padding: "4px 8px", border: "1px solid #0984E3", borderRadius: 4 }}
                                />
                                <div style={{ display: "flex", gap: 4 }}>
                                  <input
                                    type="text"
                                    value={paramDraft.year}
                                    onChange={(e) => setParamDraft({ ...paramDraft, year: e.target.value })}
                                    placeholder="Année"
                                    style={{ flex: 1, fontSize: 11, padding: "3px 6px", border: "1px solid #ccc", borderRadius: 4 }}
                                  />
                                  <input
                                    type="text"
                                    value={paramDraft.maj}
                                    onChange={(e) => setParamDraft({ ...paramDraft, maj: e.target.value })}
                                    placeholder="màj (jj/mm/aaaa)"
                                    style={{ flex: 1, fontSize: 11, padding: "3px 6px", border: "1px solid #ccc", borderRadius: 4 }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: 15, fontWeight: 700, color: "#0984E3" }}>{param.value}</div>
                                <div style={{ fontSize: 11, color: "#555" }}>{param.year}{param.maj ? ` · màj ${param.maj}` : ""}</div>
                              </>
                            )}
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
                          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {isEditing ? (
                              <>
                                <button onClick={saveEditParam} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid #00B894", background: "#00B894", color: "#fff", fontWeight: 700, cursor: "pointer" }}>💾 Enregistrer</button>
                                <button onClick={cancelEditParam} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid #888", background: "transparent", color: "#555", fontWeight: 600, cursor: "pointer" }}>Annuler</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEditParam(rawParam)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid #E17055", background: "#E1705508", color: "#E17055", fontWeight: 600, cursor: "pointer" }}>✏️ Modifier</button>
                                {param._overridden && (
                                  <button onClick={() => resetParamOverride(param.id)} title="Revenir au défaut codé" style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid #D63031", background: "#D6303108", color: "#D63031", fontWeight: 600, cursor: "pointer" }}>↩ Réinitialiser</button>
                                )}
                                <button title="Pas encore disponible — l'historique nécessitera un backend dédié aux paramètres annuels" disabled style={{ fontSize: 11, padding: "4px 10px", borderRadius: 5, border: "1px solid #ccc", background: "#f5f5f5", color: "#999", fontWeight: 600, cursor: "not-allowed" }}>📜 Historique</button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: "#888", fontStyle: "italic" }}>
                    Astuce : les modifications sont enregistrées localement dans votre navigateur (localStorage). Un futur backend dédié pourra synchroniser ces valeurs entre utilisateurs.
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
                <RegistreErreurs />
              )}

              {/* BARÈME RETRAITE */}
              {adminSection === "bareme" && (
                <BaremeRetraitePage />
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
                      { s: "1", t: "Carrière", d: "Données carrière validées par le consultant — 5 régimes : CNAV, AGIRC-ARRCO, CIPAV, IRCANTEC, RCI", c: "#E17055" },
                      { s: "2", t: "Scénarios & dates", d: "9 dispositifs activables (RACL, VPLR, progressive, cumul, chômage, arrêt, cotisations min.) + dates standard (légal, taux plein, 67 ans, libre)", c: "#00B894" },
                      { s: "3", t: "Livrables", d: "Rapport consultation (~1p), Simulation retraite (~1p), Audit retraite (~30p)", c: "#D63031" },
                    ].map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 36 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: step.c, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, boxShadow: `0 2px 8px ${step.c}30` }}>{step.s}</div>
                          {i < 2 && <div style={{ width: 2, height: 20, background: step.c, margin: "2px 0", opacity: 0.3 }} />}
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
          <AdminEngineChat />
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
                {[
                  { label: "Carrière",          val: "carriere" },
                  { label: "Scénarios & dates", val: "scenarios_dates" },
                  { label: "Livrables",         val: "livrables" },
                  { label: "Autre",             val: "autre" },
                ].map(s => (
                  <button key={s.val} onClick={() => setReportSection(s.val)}
                    style={{ fontSize: 12, padding: "4px 10px", borderRadius: 5, cursor: "pointer", transition: "all 0.15s ease",
                      border: `1px solid ${reportSection === s.val ? "#E17055" : "#ccc"}`,
                      background: reportSection === s.val ? "#E17055" : "#fdfdfd",
                      color: reportSection === s.val ? "#fff" : "#444",
                      fontWeight: reportSection === s.val ? 700 : 400,
                    }}>
                    {s.label}
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
              <button onClick={() => { setReportOpen(false); setReportText(""); setReportSection("autre"); }} style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid #ccc", background: "#fafafa", color: "#444", fontSize: 13, cursor: "pointer" }}>Annuler</button>
              <button
                disabled={reportSending}
                onClick={() => {
                  if (!reportText.trim()) { toast.error("Décrivez l'erreur constatée."); return; }
                  setReportSending(true);
                  api.post("/v1/admin-chat/registry/report-error", {
                    client_id: user?.id || null,
                    section: reportSection,
                    description: reportText.trim(),
                  })
                    .then(() => { toast.success("Erreur signalée. Merci !"); setReportOpen(false); setReportText(""); setReportSection("autre"); })
                    .catch(() => toast.error("Erreur lors de l'envoi."))
                    .finally(() => setReportSending(false));
                }}
                style={{ padding: "7px 18px", borderRadius: 7, border: "none", background: "#E17055", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: reportSending ? 0.6 : 1 }}>
                {reportSending ? "Envoi…" : "Envoyer"}
              </button>
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
      <style>{`
        .rappro-confirm-modal .sa-button-container { display: flex !important; flex-direction: row-reverse !important; justify-content: center !important; gap: 10px; }
        .rappro-confirm-modal .sa-button-container .btn { font-size: 13px !important; padding: 7px 18px !important; margin: 0 !important; min-width: 0 !important; }
      `}</style>
      <SweetAlert
        warning
        showCancel
        confirmBtnText="Appliquer & déverrouiller"
        confirmBtnBsStyle="primary"
        cancelBtnText="Annuler"
        cancelBtnBsStyle="danger"
        customClass="rappro-confirm-modal"
        title="Corriger la carrière ?"
        show={!!applyConfirm}
        onConfirm={confirmApplyCorrections}
        onCancel={() => setApplyConfirm(null)}
      >
        <div style={{ fontSize: 13, textAlign: "left" }}>
          {carriereValidee && <div style={{ color: "#E17055", marginBottom: 6, fontWeight: 600 }}>⚠️ La carrière est validée — elle sera déverrouillée.</div>}
          Les salaires suivants seront remplacés par ceux des bulletins (plafonnés PASS) :
          <ul style={{ marginTop: 6, paddingLeft: 18 }}>
            {(applyConfirm ? applyConfirm.corrections : []).map((c) => (
              <li key={c.annee}>{c.annee} : {Number(c.oldSal).toLocaleString("fr-FR")} € → <b>{Number(c.newSal).toLocaleString("fr-FR")} €</b></li>
            ))}
          </ul>
        </div>
      </SweetAlert>

      <SweetAlert
        warning
        showCancel
        confirmBtnText="Supprimer"
        confirmBtnBsStyle="danger"
        cancelBtnText="Annuler"
        cancelBtnBsStyle="primary"
        title="Supprimer ce document ?"
        show={!!deleteGenDocId}
        onConfirm={async () => {
          const docToDelete = generatedDocs.find((d) => d.id === deleteGenDocId);
          setGeneratedDocs((prev) => prev.filter((d) => d.id !== deleteGenDocId));
          setDeleteGenDocId(null);
          // Supprimer aussi de la base pour ne pas le recharger au F5.
          // On boucle sur /latest jusqu'à 404 : il peut exister plusieurs lignes
          // historiques (doublons d'un ancien bug de double-save, ou rapports
          // validés/livrés d'un cycle précédent). Sinon le rapport "revient" au F5.
          if (docToDelete?.type === "rapport_consultation") {
            const Config = { headers: { Authorization: "Bearer " + localStorage.getItem("token") } };
            for (let i = 0; i < 20; i++) {
              try {
                const report = await axios.get(
                  `${global.config.server_url}/v1/analysis-reports/latest/${id}/RAPPORT_CONSULTATION`,
                  Config,
                );
                if (!report?.data?.id) break;
                await axios.delete(
                  `${global.config.server_url}/v1/analysis-reports/${report.data.id}`,
                  Config,
                );
              } catch (e) {
                // 404 = plus de rapport, on a fini. Toute autre erreur = stop pour éviter une boucle.
                break;
              }
            }
          } else if (docToDelete?.type === "simulation_retraite") {
            try {
              const token = localStorage.getItem("token") || "";
              await fetch(`${global.config.server_url}/v1/simulation-retraite/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
              });
            } catch { /* on ignore — l'item est déjà retiré côté UI */ }
          }
        }}
        onCancel={() => setDeleteGenDocId(null)}
      >
        Cette action est irréversible.
      </SweetAlert>

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

      {viewingDoc && (
        <ReportViewerModal
          viewingDoc={viewingDoc}
          setViewingDoc={setViewingDoc}
          isGenerating={isGeneratingReport}
          handleSaveDoc={handleSaveReport}
          handleDownloadHtml={handleDownloadReportHtml}
          handleDownloadPdf={handleDownloadReportPdf}
          clientId={id}
        />
      )}
    </div>
  );

}

// ── ReportViewerModal ────────────────────────────────────────────────────────

function ReportViewerModal({
  viewingDoc,
  setViewingDoc,
  isGenerating,
  handleSaveDoc,
  handleDownloadHtml,
  handleDownloadPdf,
  clientId,
}) {
  const iframeRef = useRef(null);
  const [staticHtmlContent, setStaticHtmlContent] = useState(viewingDoc?.htmlContent || "");
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  // isDirty = vrai uniquement quand l'utilisateur a réellement édité (event "input" dans l'iframe).
  // Sans ce flag, handleClose se déclenchait dès l'ouverture car isEditMode passe true dès qu'il y a du HTML.
  const [isDirty, setIsDirty] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // ── Chat IA ──────────────────────────────────────────────────────────────
  // Skills supportés côté backend par ReportChatService::buildSystemPrompt.
  // Ajouter ici tout nouveau type de livrable doté de son Prompt class.
  const AI_CHAT_SUPPORTED_TYPES = ["simulation_retraite", "rapport_consultation", "audit_retraite"];
  const aiChatSkillCode = viewingDoc?.type;
  const aiChatAvailable = AI_CHAT_SUPPORTED_TYPES.includes(aiChatSkillCode) && !!clientId;
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [proposedHtml, setProposedHtml] = useState(null);
  const [proposedMessageId, setProposedMessageId] = useState(null);
  const [applyingMessageId, setApplyingMessageId] = useState(null);
  const [versionsReloadSignal, setVersionsReloadSignal] = useState(0);

  const handleProposedHtml = (html, msgId) => {
    setProposedHtml(html);
    setProposedMessageId(msgId);
  };
  const handleClearProposed = () => {
    setProposedHtml(null);
    setProposedMessageId(null);
  };
  const handleApplied = (newHtml) => {
    setStaticHtmlContent(newHtml);
    setViewingDoc((prev) => ({ ...prev, htmlContent: newHtml }));
    setApplyingMessageId(null);
    handleClearProposed();
    setVersionsReloadSignal((s) => s + 1);
    setIsDirty(false);
  };
  const handleVersionRestored = (newHtml) => {
    setStaticHtmlContent(newHtml);
    setViewingDoc((prev) => ({ ...prev, htmlContent: newHtml }));
    setVersionsReloadSignal((s) => s + 1);
    setIsDirty(false);
  };

  const docId = viewingDoc?.id;
  const docUrl = viewingDoc?.url;
  const docHtmlContent = viewingDoc?.htmlContent;

  useEffect(() => {
    if (viewingDoc) {
      setStaticHtmlContent(docHtmlContent || "");
      setIsEditMode(!!docHtmlContent);
    }
  }, [docId, docUrl, docHtmlContent, viewingDoc]);

  // Reset isDirty UNIQUEMENT à l'ouverture d'un doc différent. Ne pas l'inclure
  // dans le useEffect ci-dessus : sinon le blur (qui met à jour viewingDoc.htmlContent
  // via updateContent) re-déclenche cet effet et wipe isDirty avant qu'on puisse l'utiliser.
  useEffect(() => {
    setIsDirty(false);
  }, [docId, docUrl]);

  const execCmd = (e, command, value = null) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    try {
      iframe.contentDocument.execCommand(command, false, value);
      iframe.contentWindow.focus();
    } catch (_) {}
  };

  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (doc && doc.body) {
        doc.body.contentEditable = "true";
        doc.body.style.cursor = "text";
        const updateContent = () => {
          const newContent = doc.documentElement.outerHTML;
          setStaticHtmlContent(newContent);
          setViewingDoc((prev) => ({ ...prev, htmlContent: newContent }));
        };
        doc.body.addEventListener("blur", updateContent);
        // input = vraie édition utilisateur (frappe clavier, paste...). Distinct du blur
        // qui re-sync l'outerHTML même sans modif réelle.
        doc.body.addEventListener("input", () => setIsDirty(true));
      }
    } catch (_) {}
  };

  const handleClose = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      setViewingDoc(null);
    }
  };

  const handleEditToggle = async () => {
    if (isEditMode && viewingDoc?.htmlContent) {
      await handleSaveDoc(viewingDoc);
      setIsDirty(false);
      return;
    }
    if (viewingDoc?.htmlContent) {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentDocument && iframe.contentDocument.body) {
        iframe.contentDocument.body.contentEditable = "true";
        iframe.contentDocument.body.focus();
      }
      setIsEditMode(true);
      return;
    }
    if (!viewingDoc?.url) { toast.error("Aucune source disponible pour l'édition."); return; }
    setIsLoadingEdit(true);
    try {
      const res = await axios.post(
        `${global.config.server_url}/fetch-html`,
        { url: viewingDoc.url },
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      if (res.data && res.data.html) {
        setStaticHtmlContent(res.data.html);
        setViewingDoc((prev) => ({ ...prev, htmlContent: res.data.html }));
        setIsEditMode(true);
      } else {
        toast.error("Impossible de récupérer le contenu modifiable.");
      }
    } catch {
      toast.error("Erreur lors de l'activation du mode édition.");
    } finally {
      setIsLoadingEdit(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={!!viewingDoc}
        toggle={handleClose}
        className="modal-dialog-centered modal-xl"
        contentClassName="h-100"
        style={{ maxWidth: "95vw", height: "90vh" }}
      >
        <ModalHeader toggle={handleClose}>{viewingDoc?.name || "Document"}</ModalHeader>
        <ModalBody className="p-0" style={{ overflow: "hidden", height: "100%" }}>
          <div className="d-flex h-100">
            {/* Panneau gauche — Actions */}
            <div className="d-flex flex-column" style={{ flex: "0 0 320px", backgroundColor: "#f8f9fa", borderRight: "1px solid #dee2e6", overflowY: "auto" }}>
              <div className="p-4">
                <h5 className="mb-3" style={{ color: "#495057", fontWeight: 600 }}>Actions</h5>

                <div className="mb-3">
                  <div className="d-flex" style={{ gap: 10 }}>
                    <Button color="primary" className="flex-fill d-flex align-items-center justify-content-center" onClick={handleDownloadPdf} style={{ borderRadius: 8, padding: "10px 16px", fontWeight: 500 }}>
                      <Download size={16} className="mr-1" /> PDF
                    </Button>
                    {(viewingDoc?.htmlContent || viewingDoc?.url) && (
                      <Button color="info" className="flex-fill d-flex align-items-center justify-content-center" onClick={() => handleDownloadHtml(viewingDoc)} style={{ borderRadius: 8, padding: "10px 16px", fontWeight: 500 }}>
                        <Download size={16} className="mr-1" /> HTML
                      </Button>
                    )}
                  </div>
                </div>

                {(viewingDoc?.htmlContent || viewingDoc?.url) && (
                  <Button
                    color={isEditMode ? "success" : "warning"}
                    className="w-100 d-flex align-items-center justify-content-center mb-3"
                    onClick={handleEditToggle}
                    disabled={isLoadingEdit}
                    style={{ borderRadius: 8, padding: "12px 16px", fontWeight: 500 }}
                  >
                    {isLoadingEdit ? <span className="spinner-border spinner-border-sm mr-2" /> : isEditMode ? <Save size={18} className="mr-2" /> : <Edit2 size={18} className="mr-2" />}
                    {isLoadingEdit ? "Chargement..." : isEditMode ? "Enregistrer les modifications" : "Modifier le texte"}
                  </Button>
                )}

                {aiChatAvailable && (
                  <>
                    <Button
                      color={aiChatOpen ? "secondary" : "primary"}
                      outline={!aiChatOpen}
                      className="w-100 d-flex align-items-center justify-content-center mb-2"
                      onClick={() => setAiChatOpen((v) => !v)}
                      style={{ borderRadius: 8, padding: "12px 16px", fontWeight: 500 }}
                    >
                      <MessageSquare size={18} className="mr-2" />
                      {aiChatOpen ? "Masquer l'assistant IA" : "Assistant IA (chat)"}
                    </Button>
                    <div className="mb-3 d-flex justify-content-end">
                      <VersionHistoryDropdown
                        clientId={clientId}
                        skillCode={aiChatSkillCode}
                        onRestored={handleVersionRestored}
                        reloadSignal={versionsReloadSignal}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Panneau droit — Prévisualisation */}
            <div className="flex-grow-1 bg-white position-relative d-flex flex-column">
              {isEditMode && (
                <div style={{ padding: "10px 14px", backgroundColor: "#fff", borderBottom: "2px solid #e9ecef", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 4, padding: 4, backgroundColor: "#f8f9fa", borderRadius: 6 }}>
                    <Button color="light" onMouseDown={(e) => execCmd(e, "bold")} title="Gras" style={{ border: "1px solid #dee2e6", borderRadius: 4, padding: "6px 10px", backgroundColor: "#fff" }}><Bold size={16} /></Button>
                    <Button color="light" onMouseDown={(e) => execCmd(e, "italic")} title="Italique" style={{ border: "1px solid #dee2e6", borderRadius: 4, padding: "6px 10px", backgroundColor: "#fff" }}><Italic size={16} /></Button>
                    <Button color="light" onMouseDown={(e) => execCmd(e, "underline")} title="Souligné" style={{ border: "1px solid #dee2e6", borderRadius: 4, padding: "6px 10px", backgroundColor: "#fff" }}><Underline size={16} /></Button>
                  </div>
                  <div style={{ width: 1, height: 28, backgroundColor: "#dee2e6" }} />
                  <UncontrolledDropdown>
                    <DropdownToggle color="light" caret onMouseDown={(e) => e.preventDefault()} style={{ border: "1px solid #dee2e6", borderRadius: 6, padding: "6px 10px", backgroundColor: "#fff", fontWeight: 500 }}>Taille</DropdownToggle>
                    <DropdownMenu>
                      <DropdownItem onMouseDown={(e) => execCmd(e, "fontSize", "1")}><span style={{ fontSize: 12 }}>Petit</span></DropdownItem>
                      <DropdownItem onMouseDown={(e) => execCmd(e, "fontSize", "3")}><span style={{ fontSize: 14 }}>Normal</span></DropdownItem>
                      <DropdownItem onMouseDown={(e) => execCmd(e, "fontSize", "5")}><span style={{ fontSize: 18 }}>Grand</span></DropdownItem>
                      <DropdownItem onMouseDown={(e) => execCmd(e, "fontSize", "7")}><span style={{ fontSize: 24 }}>Très grand</span></DropdownItem>
                    </DropdownMenu>
                  </UncontrolledDropdown>
                  <UncontrolledDropdown>
                    <DropdownToggle color="light" caret onMouseDown={(e) => e.preventDefault()} style={{ border: "1px solid #dee2e6", borderRadius: 6, padding: "6px 10px", backgroundColor: "#fff", fontWeight: 500 }}>Couleur</DropdownToggle>
                    <DropdownMenu>
                      {[["#000000", "Noir"], ["#FF0000", "Rouge"], ["#0000FF", "Bleu"], ["#008000", "Vert"], ["#FFA500", "Orange"]].map(([c, l]) => (
                        <DropdownItem key={c} onMouseDown={(e) => execCmd(e, "foreColor", c)}><span style={{ color: c, fontWeight: 600 }}>⬤</span> {l}</DropdownItem>
                      ))}
                    </DropdownMenu>
                  </UncontrolledDropdown>
                  <div style={{ width: 1, height: 28, backgroundColor: "#dee2e6" }} />
                  <div style={{ display: "flex", gap: 4, padding: 4, backgroundColor: "#f8f9fa", borderRadius: 6 }}>
                    <Button color="light" onMouseDown={(e) => execCmd(e, "justifyLeft")} style={{ border: "1px solid #dee2e6", borderRadius: 4, padding: "6px 10px", backgroundColor: "#fff" }}><AlignLeft size={16} /></Button>
                    <Button color="light" onMouseDown={(e) => execCmd(e, "justifyCenter")} style={{ border: "1px solid #dee2e6", borderRadius: 4, padding: "6px 10px", backgroundColor: "#fff" }}><AlignCenter size={16} /></Button>
                    <Button color="light" onMouseDown={(e) => execCmd(e, "justifyRight")} style={{ border: "1px solid #dee2e6", borderRadius: 4, padding: "6px 10px", backgroundColor: "#fff" }}><AlignRight size={16} /></Button>
                  </div>
                  <div style={{ display: "flex", gap: 4, padding: 4, backgroundColor: "#f8f9fa", borderRadius: 6 }}>
                    <Button color="light" onMouseDown={(e) => execCmd(e, "insertUnorderedList")} style={{ border: "1px solid #dee2e6", borderRadius: 4, padding: "6px 10px", backgroundColor: "#fff" }}><List size={16} /></Button>
                    <Button color="light" onMouseDown={(e) => execCmd(e, "insertOrderedList")} style={{ border: "1px solid #dee2e6", borderRadius: 4, padding: "6px 10px", backgroundColor: "#fff" }}><span style={{ fontSize: 13, fontWeight: 600 }}>1.</span> <List size={14} /></Button>
                  </div>
                </div>
              )}

              <div className="flex-grow-1 position-relative">
                {proposedHtml ? (
                  <HtmlDiffPreview
                    beforeHtml={staticHtmlContent}
                    afterHtml={proposedHtml}
                    applying={!!applyingMessageId}
                    onApply={async () => {
                      if (!proposedMessageId) return;
                      setApplyingMessageId(proposedMessageId);
                      try {
                        const report = await fetchLatestReport(clientId, aiChatSkillCode);
                        if (!report?.id) throw new Error("Rapport introuvable");
                        const res = await applyReportChatMessage(report.id, proposedMessageId);
                        const newHtml =
                          (res.analysis_report?.result_json &&
                            (typeof res.analysis_report.result_json === "string"
                              ? res.analysis_report.result_json
                              : res.analysis_report.result_json.htmlContent)) || "";
                        handleApplied(newHtml);
                        toast.success("Modification appliquée — nouvelle version créée.");
                      } catch (err) {
                        console.error("apply from diff error:", err);
                        toast.error(err?.response?.data?.message || "Erreur lors de l'application");
                        setApplyingMessageId(null);
                      }
                    }}
                    onReject={handleClearProposed}
                  />
                ) : viewingDoc?.htmlContent ? (
                  <iframe ref={iframeRef} srcDoc={staticHtmlContent} onLoad={handleIframeLoad} title="Aperçu rapport" style={{ width: "100%", height: "100%", border: "none" }} />
                ) : viewingDoc?.url ? (
                  <iframe ref={iframeRef} src={viewingDoc.url} onLoad={handleIframeLoad} title="Aperçu rapport" style={{ width: "100%", height: "100%", border: "none" }} />
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 text-muted">Aucun aperçu disponible</div>
                )}
                {isGenerating && (
                  <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.8)", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div className="spinner-border text-primary" style={{ width: "2.5rem", height: "2.5rem" }} role="status"><span className="sr-only">Chargement...</span></div>
                    <p className="mt-2 text-primary font-weight-bold">Nouvelle analyse en cours...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Panneau IA (chat) — visible quand l'utilisateur l'ouvre */}
            {aiChatAvailable && aiChatOpen && (
              <div
                className="d-flex flex-column"
                style={{ flex: "0 0 380px", borderLeft: "1px solid #dee2e6", backgroundColor: "#fff" }}
              >
                <div
                  className="d-flex align-items-center justify-content-between px-3 py-2"
                  style={{ borderBottom: "1px solid #dee2e6", backgroundColor: "#f8f9fa" }}
                >
                  <strong style={{ color: "#495057" }}>Édition par IA</strong>
                  <Button
                    color="link"
                    size="sm"
                    onClick={() => setAiChatOpen(false)}
                    style={{ padding: 4 }}
                    title="Fermer"
                  >
                    <XIcon size={18} />
                  </Button>
                </div>
                <div className="flex-grow-1" style={{ minHeight: 0 }}>
                  <ReportChatPanel
                    clientId={clientId}
                    skillCode={aiChatSkillCode}
                    onProposedHtml={handleProposedHtml}
                    onApplied={handleApplied}
                    applyingMessageId={applyingMessageId}
                    clearProposedSignal={proposedHtml === null ? 1 : 0}
                  />
                </div>
              </div>
            )}
          </div>
        </ModalBody>
      </Modal>

      <SweetAlert
        warning
        showCancel
        confirmBtnText="Enregistrer"
        confirmBtnBsStyle="success"
        cancelBtnText="Annuler"
        cancelBtnBsStyle="primary"
        title="Modifications non enregistrées"
        show={showCloseConfirm}
        onConfirm={async () => { setShowCloseConfirm(false); await handleSaveDoc(viewingDoc); setIsDirty(false); setViewingDoc(null); setIsEditMode(false); }}
        onCancel={() => { setShowCloseConfirm(false); setIsDirty(false); setViewingDoc(null); setIsEditMode(false); }}
      >
        Voulez-vous enregistrer vos modifications avant de fermer ?
      </SweetAlert>
    </>
  );
}
