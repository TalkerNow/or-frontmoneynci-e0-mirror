# Instructions pour Claude Code — Migration SimulatorV6

## Contexte

Le fichier `SimulatorV6.js` est un composant React qui sert de simulateur retraite multi-régimes. Actuellement, le panel "Carrière" utilise des données MOCK (Math.random) et les onglets IRCANTEC/RCI affichent "à développer".

On veut intégrer la **vraie logique de calcul** depuis 4 simulateurs existants (CnavSimulator.js, ArrcoSimulator.js, IrcantecSimulator.js, RciSimulator.js) **tout en gardant le style visuel V6 intact**.

## Fichier modifié fourni

Le fichier `SimulatorV6.js` modifié est déjà prêt et déposé dans le projet. **Remplace l'ancien fichier par celui-ci.**

## Imports requis — à vérifier dans simulatorData.js

Le nouveau fichier importe ces éléments depuis `./simulatorData` :

```js
import {
  coeffRevalo,        // Object { [year]: coefficient } — revalorisation CNAV
  plafondSS,          // Object { [year]: plafondEuro } — PASS annuel
  getRetirementAge,   // Function(birthYear) → string — âge légal retraite
  getTrimTauxPlein,   // Function(birthYear) → number — trimestres taux plein
  arrcoPlafond,       // Array [[year, ..., plafondAnnuel, ...], ...] — AGIRC-ARRCO
  arrcoTaux,          // Array [[year, tauxTA, tauxTB, ..., valeurPt, ...], ...] — AGIRC-ARRCO
  arrcoTauxDisplay,   // Object { [year]: { tauxA, tauxB, ref } } — affichage AGIRC-ARRCO
  ircantecPlafonds,   // Object { [year]: plafondAnnuel } — IRCANTEC
  ircantecValeursPoint, // Object { [year]: valeurPoint } — IRCANTEC
  ircantecTauxDisplay,  // Object { [year]: { tauxA, tauxB, ref } } — IRCANTEC
  rciPrixAchat,       // Object { [year]: prixAchat } — RCI
  rciTauxDisplay,     // Object { [year]: { tauxA, tauxB, ref } } — RCI
} from "./simulatorData";
```

**Action :** Vérifie que `simulatorData.js` exporte bien TOUS ces éléments. S'il en manque, cherche dans les fichiers CnavSimulator.js, ArrcoSimulator.js, IrcantecSimulator.js et RciSimulator.js pour voir d'où ils importaient ces données et ajoute les exports manquants dans simulatorData.js.

## Imports requis — à vérifier dans risService.js

```js
import { fetchRISAnalysis, fetchRISPrefill } from "./risService";
```

**Action :** Vérifie que `risService.js` exporte bien ces deux fonctions.

## Import de toast

```js
import { toast } from "react-toastify";
```

**Action :** Vérifie que `react-toastify` est bien installé dans le projet (`npm list react-toastify`).

## Résumé des modifications

### Ce qui a changé (panel Carrière uniquement) :

1. **CNAV** — Les données MOCK_CNAV (Math.random) sont remplacées par :
   - Inputs éditables pour les salaires réels
   - Calcul du plafonnement au PASS (Francs avant 2001, Euros après)
   - Revalorisation via coeffRevalo
   - Trimestres calculés par 150×SMIC horaire
   - Déplafonnement checkbox avant 2005
   - Trimestres assimilés avec saisie et boutons "Ajouter"
   - Module enfants (nombre, genre femme/homme, statut privé/fonctionnaire, handicap)
   - Calcul trimestresEnfant (8 trim femme privé, 4 fonctionnaire, 0 homme, +8 handicap)
   - 25 meilleures années → SAM et moyenne annuelle
   - Boutons Simuler et Réinitialiser fonctionnels

2. **AGIRC-ARRCO** — Les données MOCK_AGIRC sont remplacées par :
   - Toggle Cadre/Non-Cadre avec recalcul de tous les salaires
   - Logique distincte avant/après 2019 (fusion ARRCO+AGIRC)
   - Calcul Tranche A et Tranche B via arrcoPlafond et arrcoTaux
   - Conversion Francs→Euros avant 2002
   - Champ points relevé

3. **IRCANTEC** — La section "à développer" est remplacée par :
   - Tableau complet avec inputs salaires
   - Calcul via ircantecPlafonds, ircantecValeursPoint, ircantecTauxDisplay
   - Tranche A (≤PASS) et Tranche B (>PASS, ≤8×PASS)
   - Champ points relevé

4. **RCI** — La section "à développer" est remplacée par :
   - Tableau complet avec inputs revenus
   - Calcul via plafondSS, rciPrixAchat, rciTauxDisplay
   - Tranche 1 (0→1 PASS) et Tranche 2 (1→4 PASS)
   - Conversion Francs avant 2002
   - Champ points relevé

5. **Zone Documents** — L'upload simulé (clic = mock) est remplacé par :
   - Vrai import RIS via fetchRISPrefill + fetchRISAnalysis
   - Pré-remplissage automatique des 4 régimes depuis les données RIS
   - Date de naissance + calcul âge légal et trimestres taux plein
   - Synchronisation sessionStorage + CustomEvent "risImportComplete"

### Ce qui n'a PAS changé :

- Tout le style visuel (couleurs, typo IBM Plex, cards, ombres)
- La navigation par workflow (5 panneaux)
- Le mode Admin complet (règles, paramètres, formules, prompts, registre, flux)
- Les panels Dispositifs, Dates & Simulations, Livrables
- Le système prompt IA
- Les données de référence admin (REVALO_CNAV, AGIRC_PARAMS restent pour l'admin)

## Test après déploiement

1. Ouvre le simulateur, vérifie que les 5 panneaux de navigation fonctionnent
2. Va dans Carrière → CNAV : saisis un salaire, vérifie que le coefficient et le salaire revalorisé se calculent
3. AGIRC-ARRCO : toggle Cadre/Non-Cadre, saisis un salaire
4. IRCANTEC : saisis un salaire, vérifie le calcul des points
5. RCI : saisis un revenu, vérifie les tranches
6. Teste l'import RIS si un fichier est disponible
7. Vérifie que le mode Admin fonctionne toujours normalement
