# Design — Étape 4 : Dates & Simulations

**Date :** 2026-04-24  
**Fichier cible :** `src/views/apps/user/edit/notes/SimulatorIntegration.js`  
**Périmètre :** Remplacer les données mockées du panel `dates` par des calculs réels

---

## Contexte

L'étape 4 du simulateur EOR affiche actuellement des données hardcodées (SAMB, points ARRCO, dates de départ). L'objectif est de brancher les vrais calculs sans toucher à l'UI existante.

---

## Architecture

Tout se passe en JS dans `SimulatorIntegration.js`. Aucun appel API nouveau. On s'appuie sur :
- `carriereRows` — données carrière saisies/importées (step 2)
- `trimCotState` / `trimAssState` — trimestres par année
- `user.birth_date` — date de naissance du client
- `activatedDispositifs` — dispositifs sélectionnés (step 3)
- `scenarioSkillResults` — résultats pension déjà calculés par n8n (step 3)
- `REVALO_CNAV` — coefficients de revalorisation déjà dans le fichier
- `PLAFONDS_SS` — plafonds sécurité sociale déjà dans le fichier

---

## Calculs à implémenter

### 1. SAMB (Salaire Annuel Moyen de Base)
- Prendre les 25 meilleures années de salaire revalorisé depuis `carriereRows`
- `salRevalo = min(row.sal, PLAFONDS_SS[row.yr]) * REVALO_CNAV[row.yr]` (plafond appliqué par année)
- SAMB = moyenne des 25 meilleurs `salRevalo`

### 2. Points ARRCO totaux
- Somme de `row.agircPts` sur toutes les `carriereRows`
- Projection annuelle = moyenne des 3 dernières années avec points > 0

### 3. Date légale de départ
- Basée sur `user.birth_date`
- Réforme 2023 : âge légal 64 ans pour les générations nées après 1968, sinon barème progressif (62→64 ans selon année de naissance)
- Départ le 1er du mois suivant l'anniversaire

### 4. Date taux plein
- Trimestres requis selon génération (168→172 selon année de naissance)
- Trimestres acquis = somme de `trimCotState` + `trimAssState`
- Projeter les trimestres futurs (4 trim/an si en activité) pour trouver la date d'atteinte
- Départ le 1er du trimestre suivant

### 5. Date 67 ans (taux plein d'office)
- `user.birth_date` + 67 ans, arrondi au 1er du mois suivant

### 6. Auto-dates depuis les dispositifs activés
- **RACL** : si début activité < 21 ans ET trimestres longue carrière atteints → date anticipée calculée
- **Retraite progressive** : âge légal − 2 ans si 150 trimestres atteints
- **Chômage** : décaler la date taux plein selon les mois de chômage en fin de carrière
- Autres dispositifs : afficher résultat depuis `scenarioSkillResults` si disponible

### 7. Montants de pension par date
- Si `scenarioSkillResults` contient des données → afficher le montant total (CNAV + complémentaires)
- Sinon → placeholder "En attente du calcul"

---

## Ce qui NE change PAS

- La structure JSX du panel `dates` reste identique
- Les 4 boutons (légale, taux plein, 67 ans, date libre) restent
- Le bloc "Données de calcul" garde sa structure grille
- Les auto-dates gardent leur style card avec couleur par source

---

## Implémentation

### Nouvelles fonctions à créer (dans le fichier, avant le composant)

```
computeSAMB(carriereRows) → number
computeArrcoPts(carriereRows) → { total, projectionAnnuelle }
computeDateLegale(birthDate) → { date: Date, label: string, age: string }
computeDateTauxPlein(birthDate, trimAcquis, trimReqFn) → { date: Date, label: string, trimManquants: number }
computeDate67(birthDate) → { date: Date, label: string }
computeAutoDateFromDispositif(dispositifId, birthDate, carriereRows, trimAcquis, scenarioResults) → { date, age, detail, color } | null
```

### Remplacement dans le render du panel `dates`

- `MOCK_AUTO_DATES` → remplacé par `computedAutoDatesfromDispositifs` (calculé au render)
- `dateComments` hardcodés → remplacés par les vrais libellés issus des fonctions
- Bloc "Données de calcul" → SAMB et points réels

---

## Hors périmètre

- Moteur Python (prévu plus tard)
- Nouveaux webhooks n8n
- Modification des autres étapes
- Calcul du minimum contributif et majorations enfants (step 5)
