# Analyse PRO Euromillions — Stratégie Avancée

## Métriques Calculées (par numéro)

### 1. Smart Score ★★★
**Formule** : `(Fréquence × 0.4) + (Overdue × 0.35) + (Régularité × 0.25)`

- **Fréquence** : Nombre de sorties / moyenne attendue
- **Overdue** : Retard actuel / intervalle moyen (plafonné à 3)
- **Régularité** : 1 / (écart-type des intervalles + 1)

**Interprétation** :
- Score > 1.0 = Numéro "chaud" avec bon potentiel
- Score 0.8-1.0 = Équilibré
- Score < 0.8 = Peu probable à court terme

### 2. Régularité
Mesure la constance des intervalles entre apparitions.

**Calcul** : `1 / (écart-type + 1)`

- Régularité > 0.12 = Très régulier (prévisible)
- Régularité 0.08-0.12 = Régulier
- Régularité < 0.08 = Aléatoire

**Exemple** :
- Numéro apparaissant tous les 8-10 tirages = régulier
- Numéro apparaissant de façon erratique (2, 25, 3, 18) = irrégulier

### 3. Overdue Score
Ratio entre le retard actuel et l'intervalle moyen.

**Formule** : `Retard actuel / Intervalle moyen`

- Score > 2.0 = Très en retard
- Score 1.0-2.0 = En retard modéré
- Score < 1.0 = Normal ou récent

### 4. Momentum
Delta entre les 50 derniers et les 50 précédents tirages.

- Momentum +5 = Numéro en forte hausse
- Momentum 0 = Stable
- Momentum -5 = En déclin

## Stratégies de Génération

### ULTRA SMART
**Pondération** : `smart_score × 1.5 + régularité × 0.8 + overdue × 0.7`

Privilégie les numéros avec :
- Smart score élevé
- Bonne régularité historique
- Retard modéré (pas extrême)

### HOT MOMENTUM
**Pondération** : `smart_score × 1.2 + momentum_positif × 2`

Focus sur :
- Numéros en progression récente
- Tendance haussière sur 50 tirages

### CHASSEUR (Overdue Hunter)
**Pondération** : `overdue × 2.5 + régularité × 1.2 + fréquence × 0.5`

Cible :
- Numéros très en retard
- Avec historique de régularité (donc retour probable)

### ÉQUILIBRE
**Pondération** : `fréquence × 1.0 + overdue × 1.5 + régularité × 0.8`

Mix 50/50 :
- Numéros fréquents
- Numéros en retard

### PATTERNS
**Pondération** : `smart_score × 1.0 + présence_dans_paires × 0.3`

Utilise :
- Paires historiques (ex: 23-44 sorties 28 fois)
- Triplets fréquents
- Numéros consécutifs (23-24)

### CONTRARIAN
**Pondération** : `(moyenne - sorties) × 0.15 + régularité × 2.0 + overdue × 1.5`

Approche inverse :
- Numéros peu sortis MAIS réguliers
- Retour à la moyenne attendu

## Patterns Avancés Détectés

### Paires (Top 3)
1. **15-28** : 28 occurrences (1.44%)
2. **4-23** : 28 occurrences
3. **23-24** : 28 occurrences (consécutifs)

### Triplets (Top 3)
1. **19-27-50** : X fois
2. **10-23-44** : X fois
3. **17-29-42** : X fois

### Numéros Consécutifs
Les paires 23-24, 44-45, 11-12 sortent plus que la moyenne.

## Analyse par Jour

### Mardi
- Top boules : **23, 44, 29**
- Top étoiles : **2, 5**

### Vendredi
- Top boules : **42, 19, 17**
- Top étoiles : **3, 9**

## Recommandations d'Utilisation

1. **Génération principale** : Cliquer 3-5 fois pour obtenir 9-15 grilles
2. **Sélection** : Garder les grilles avec score > 0.9
3. **Diversification** : Prendre 1 grille par stratégie
4. **Validation** : Vérifier somme (120-135 optimal), parité (2-3 pairs)

## Limites

⚠️ **Important** : Aucun algorithme ne peut prédire le hasard.
- Chaque tirage est indépendant
- Probabilité jackpot = 1 / 139 838 160
- Ces outils analysent le passé, pas le futur

Les combinaisons générées sont des **suggestions statistiques**, pas des garanties.

## Métriques de Performance du Système

- Tirages analysés : 1 951
- Paires identifiées : 30
- Triplets identifiés : 20
- Consécutifs : 15
- Jours analysés : 7
- Stratégies : 6
- Temps génération : < 200ms
