# Guide d'Utilisation — Euro Stats PRO

## Démarrage Rapide

### 1. Lancer le site
```bash
cd c:\Users\chadi\Desktop\euro\site
python -m http.server 8080
```
Ouvrir : **http://localhost:8080**

### 2. Générer des combinaisons
- Cliquer sur le **bouton doré** : "Générer 3 combinaisons possibles"
- À chaque clic = **3 nouvelles grilles** uniques
- Recommandé : **cliquer 5 fois** pour obtenir 15 grilles

### 3. Sélectionner les meilleures
Garder les grilles avec :
- **Score > 0.9** (excellent)
- **Score 0.7-0.9** (bon)
- Score < 0.7 (moyen)

### 4. Vérifier les patterns
- Somme des 5 boules : **120-135** optimal
- Parité : **2-3 paires** / 3-2 impaires
- Répartition Haut/Bas : **2-3** vs 3-2

## Comprendre les Sections

### 🔥 Fréquences (Chauds/Froids)
**Top 10 chauds** = numéros les plus sortis + smart score élevé

Indicateurs :
- `Smart XX` = Score intelligent (>100 = excellent)
- `Régulier` = Intervalle stable
- `En retard` = Overdue score > 1.5
- `↔ X` = Absent depuis X tirages

**Stratégie** : Privilégier smart score 90-120 + réguliers

### ⚡ Momentum
**En hausse ▲** = progression sur 50 derniers tirages

Exemple : Delta +5 = apparu 5 fois de plus récemment

**Stratégie** : Mixer momentum positif + numéros stables

### 🎯 Patterns & Paires
**Paires fréquentes** = combos historiques (ex: 15-28 = 28 fois)

**Utilisation** :
- Inclure 1-2 numéros d'une paire top 5
- Ou prendre les 2 numéros d'une paire forte

**Triplets** = 3 numéros sortis ensemble
- Moins fiable que les paires
- Utile pour validation

### 📅 Analyse par Jour
Chaque jour a ses numéros favoris.

**Mardi** : 23, 44, 29, 17 | Étoiles 2, 5
**Vendredi** : 42, 19, 10, 50 | Étoiles 3, 9

**Stratégie** : Si vous jouez le mardi, privilégier ces numéros

### 🎲 Probabilités (Modal)
**Onglets** :
- **Score combiné** = Algorithme complet (recommandé)
- **Historique** = Fréquence pure
- **Théorique** = 10% par boule (hasard pur)

**Grille interactive** :
- Cases vertes = fréquents
- Étoile ★ = top 5 boules / top 2 étoiles

## Stratégies Avancées

### Stratégie 1 : MIX OPTIMAL (Recommandé)
1. Générer 5 fois (15 grilles)
2. Garder les 6 meilleures (score > 0.85)
3. Vérifier qu'elles couvrent différentes stratégies
4. Jouer 3-5 grilles

### Stratégie 2 : FOCUS SMART
1. Regarder section **Fréquences → Chauds**
2. Noter les 8 boules avec smart score > 100
3. Générer jusqu'à obtenir grille avec 3-4 de ces numéros
4. Vérifier : étoiles aussi avec smart > 100

### Stratégie 3 : MOMENTUM HUNTER
1. Section **Momentum** → Noter les 5 boules ▲
2. Générer avec stratégie MOMENTUM (dans les combos)
3. Garder grilles avec 2-3 numéros en hausse
4. Compléter avec 1-2 réguliers

### Stratégie 4 : OVERDUE BALANCED
1. Noter top 5 **En retard** (section Fréquences)
2. Filtrer ceux avec régularité > 0.10
3. Mixer 2 en retard + 2 chauds + 1 momentum
4. Étoiles : 1 chaude + 1 en retard

### Stratégie 5 : PATTERNS MASTER
1. Section **Patterns → Paires**
2. Noter top 10 paires
3. Construire grille incluant 2-3 paires
4. Vérifier cohérence somme/parité

### Stratégie 6 : JOUR SPÉCIFIQUE
1. Section **Analyse par jour**
2. Si vous jouez mardi : prendre top 5 boules mardi
3. Si vendredi : top 5 vendredi
4. Ajuster avec smart scores

## Indicateurs de Qualité

### Score de Combinaison
- **> 1.0** = Excellent (top 5%)
- **0.8-1.0** = Très bon (top 20%)
- **0.6-0.8** = Bon (top 40%)
- **< 0.6** = Moyen

### Validation Pattern
✓ Somme : 100-150 (optimal 120-135)
✓ Parité : 2P/3I ou 3P/2I
✓ Haut/Bas : 2H/3B ou 3H/2B
✓ Spread : 35-45
✓ Consécutifs : max 1 paire

### Checklist Finale
Avant de jouer une grille :
- [ ] Score > 0.7
- [ ] Au moins 2 numéros smart score > 90
- [ ] Pas plus de 3 numéros "froids" (smart < 50)
- [ ] Somme dans 110-140
- [ ] Parité équilibrée
- [ ] Étoiles : 1 chaude + 1 moyenne/retard

## Fréquence de Jeu

### Option 1 : Joueur Régulier
- Générer **10 grilles** le lundi
- Garder les **5 meilleures**
- Jouer **3 grilles mardi** + **2 vendredi**

### Option 2 : Joueur Occasionnel
- Générer **5 grilles** avant chaque tirage
- Garder la **meilleure**
- Jouer **1 grille** par tirage

### Option 3 : Joueur Stratégique
- Analyser **momentum** chaque semaine
- Si momentum fort (>3 numéros ▲) : jouer 5 grilles
- Si momentum faible : attendre ou jouer 1 grille

## Mise à Jour des Données

Après chaque nouveau tirage officiel :

```bash
# 1. Télécharger CSV mis à jour depuis FDJ
# 2. Placer dans extracted/
# 3. Lancer analyse
python scripts/advanced_analyze.py

# 4. Recharger le site
# Les nouvelles stats sont automatiquement prises en compte
```

## Interprétation des Résultats

### Si vous gagnez rang 4-6
➜ Les patterns ont partiellement fonctionné
➜ Continuer la stratégie en cours

### Si vous ne gagnez rien sur 10 tirages
➜ Normal (hasard)
➜ Changer de stratégie
➜ Tester mix différent (plus de numéros froids)

### Statistiques Réalistes
- Rang 13 (2N) : ~10% de chances
- Rang 12 (2N+1E) : ~1.6%
- Rang 5 (4N) : ~0.01%
- Jackpot : 0.0000007%

## Support & Questions

**Régénérer les stats** : `python scripts/advanced_analyze.py`
**Lancer le site** : `python -m http.server 8080` (depuis site/)
**Fichiers JSON** : `site/data/stats.json`

## Rappel Important

⚠️ **Ce système analyse l'historique, il ne prédit pas l'avenir.**

Chaque tirage est **indépendant et aléatoire**.
Les probabilités restent les mêmes à chaque fois :
- 1 / 139 838 160 pour le jackpot
- 10% par boule
- 16.7% par étoile

Ces outils vous donnent les **meilleures combinaisons statistiques**, mais ne garantissent rien.

**Jouez responsable. 18+**
