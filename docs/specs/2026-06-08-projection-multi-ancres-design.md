# Projection multi-ancres — Design

**Date** : 2026-06-08
**Composant** : `src/views/apps/user/edit/notes/SimulatorIntegration.js` (encadré « Projection fin de carrière »)
**Statut** : design validé par l'utilisateur

## Contexte

Aujourd'hui, l'encadré « Projection fin de carrière » expose un seul champ numérique
**« Âge de départ visé »** (67 par défaut, bornes 60–75). Quand l'utilisateur saisit un
âge, `handleGenerateProjection(age, surcote)` calcule `targetYear = annéeNaissance + âge`,
puis le réducteur pur `reconcileProjection` remplit la grille de carrière avec des années
projetées de `dernièreAnnéeRéelle + 1` jusqu'à `targetYear (+ surcote)`. Ces lignes
projetées alimentent ensuite `frozen_data` → n8n, sans autre traitement spécifique.

L'utilisateur veut pouvoir projeter non plus uniquement « par âge » saisi à la main, mais
selon trois ancres calculées automatiquement à partir des données du client :

1. **Âge légal** — l'âge légal de départ, **lu dans le barème** (table qui change souvent).
2. **Taux plein (durée)** — la date d'atteinte des trimestres requis (durée d'assurance).
3. **Taux plein 67 ans** — l'âge du taux plein automatique (annulation de la décote).

## Découverte clé : tout existe déjà

Les trois dates sont déjà calculées dans `src/utils/calculators.js` et s'appuient sur le
barème éditable côté backend :

| Ancre | Fonction | Source de vérité |
|---|---|---|
| Âge légal | `computeDateLegale(birthDate)` | `getBaremeRetraite()` → table `BAREME_TRANCHES` ou cache backend `/v1/departure-rules` |
| Taux plein (durée) | `computeDateTauxPlein(birthDate, trimAcquis, anneeRef)` | trimestres acquis vs `trimRequis` du barème |
| Taux plein 67 ans | `computeDate67(birthDate)` | 67 ans en dur |

Mieux : le composant **calcule déjà** ces trois dates ainsi que `dispTrimAcquis` et
`dispAnneeRef` — mais uniquement dans la branche de rendu du panneau « dispositifs »
(`SimulatorIntegration.js` lignes ~5215–5241), pour de l'affichage. Il s'agit donc de
remonter (lift) ce calcul pour le partager avec le contrôle de projection.

## Décisions validées

- **« Âge taux plein » = 67 ans automatique** (`computeDate67`), distinct de « taux plein durée ».
- **UI = sélecteur de mode + champ « âge libre » conservé** : on ne perd pas la saisie
  d'un âge arbitraire.

## Les 4 modes de projection

| Mode | `targetYear` | Source |
|---|---|---|
| `legal` (Âge légal) | `departureDates.legale.date.getFullYear()` | `computeDateLegale` (barème) |
| `duree` (Taux plein durée) | `departureDates.tauxPlein.date.getFullYear()` | `computeDateTauxPlein` |
| `auto67` (Taux plein 67 ans) | `departureDates.date67.date.getFullYear()` | `computeDate67` |
| `libre` (Âge libre) | `annéeNaissance + âge` | champ numérique existant |

> Note : `computeDateLegale` / `computeDateTauxPlein` / `computeDate67` renvoient toutes
> un **objet** `{ date, ... }` (pas une `Date` nue). Le memo stocke ces objets tels quels ;
> l'année cible se lit donc via `.date.getFullYear()` dans les trois cas.

## Architecture

### 1. `useMemo` `departureDates` remonté au niveau composant
Extraire vers un `useMemo` partagé le calcul aujourd'hui local au panneau « dispositifs » :
`dispTrimAcquis` (via `sumTrimestresCapped` sur `trimCotState` + `trimAssState`),
`dispAnneeRef`, puis `computeDateLegale` / `computeDateTauxPlein` / `computeDate67`.
Le panneau « dispositifs » consomme ce memo au lieu de recalculer → **zéro duplication**.

Dépendances du memo : `user?.birth_date`, `trimCotState`, `trimAssState`.

Forme renvoyée (exemple) — chaque ancre est l'objet renvoyé par sa fonction `compute*`,
ou `null` si non calculable (ex. pas de date de naissance) :
```js
{
  trimAcquis, anneeRef,
  legale,    // { date, label, ageStr, dateStr } | null
  tauxPlein, // { date, label, trimRequis, trimManquants, ageStr } | null
  date67,    // { date, label, dateStr } | null
}
```

### 2. Helper pur `resolveProjectionTargetYear` (dans `careerProjection.js`)
```js
// Renvoie le targetYear (number) ou null si non calculable.
resolveProjectionTargetYear({ mode, birthYear, age, departureDates })
```
- `libre` → `computeTargetYear(birthYear, age)` (réutilise l'existant)
- `legal` → `departureDates.legale.date.getFullYear()`
- `duree` → `departureDates.tauxPlein.date.getFullYear()`
- `auto67` → `departureDates.date67.date.getFullYear()`
- ancre sans date dispo (pas de naissance) → `null`

Pur, sans React → **testé unitairement** (c'est là que vivent les cas limites).

### 3. `handleGenerateProjection` généralisé
Au lieu de dériver `targetYear` d'un âge seul, il appelle `resolveProjectionTargetYear`
en fonction du mode courant. Le réducteur pur `reconcileProjection` reste **inchangé**
(il prend déjà un `targetYear`).

### 4. UI
- Sélecteur de mode (boutons radio / chips) dans l'encadré existant (style `#FFF7E6` /
  `#FFE0A3`) : **Âge légal | Taux plein durée | 67 ans | Âge libre**.
- `libre` réaffiche le champ numérique actuel.
- Sous le sélecteur, un libellé de feedback : date + âge atteint
  (ex. *« Âge légal : 63 ans 9 m — départ 04/2027 »*) ; pour `duree`, ajout
  *« 168/172 trim. — 4 manquants »*.
- La **surcote** existante reste appliquée par-dessus n'importe quel mode.

## Data flow (inchangé en aval)

Mode → `targetYear` → `reconcileProjection` remplit les lignes projetées → `frozen_data`
→ n8n. **Aucun changement backend.**

## Cas limites

- **Pas de date de naissance** → les 3 ancres désactivées (grisées + tooltip) ;
  `libre` reste utilisable. Le warning existant (« Renseignez la date de naissance… »)
  est conservé.
- **Taux plein / légal déjà atteint dans le passé** (`targetYear ≤ dernièreAnnéeRéelle`)
  → géré par le `Math.max(targetYear, lastRealYear)` déjà présent dans
  `computeProjectedYears` : aucune année fantôme ajoutée, la surcote peut toujours en
  ajouter.
- **Précision au mois → année** : on projette jusqu'à l'**année civile** de la date de
  départ (la dernière année compte comme une année pleine). Cohérent avec le modèle
  annuel actuel ; un découpage infra-annuel serait du sur-dimensionnement pour cette v1.
- **Carrière verrouillée** (`carriereValidee`) → sélecteur désactivé, comme le champ actuel.

## Fraîcheur du barème

Ajout d'un `useEffect(() => { initBareme(); }, [])` dans `SimulatorIntegration` (déjà fait
dans `CnavSimulator`) pour que `getBaremeRetraite` utilise la table backend
`/v1/departure-rules` la plus à jour, avec repli sur la table codée en dur.

## Persistance & tests

- Persister le `mode` choisi dans `localStorage` `simu_projection_${id}` (à côté de
  `targetAge` / `surcote`) ; le restaurer au montage.
- Tests unitaires de `resolveProjectionTargetYear` (chaque mode + cas limites : pas de
  naissance, ancre nulle, mode `libre`) dans le fichier de tests adjacent.

## Hors périmètre (YAGNI)

- Découpage infra-annuel de la dernière année projetée.
- Modes additionnels (carrière longue, retraite progressive — déjà couverts ailleurs).
- Changement du chemin `frozen_data` → n8n.
