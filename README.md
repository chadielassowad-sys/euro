# Euro Stats PRO — Analyse Ultra-Avancée Euromillions

Système d'analyse professionnel de **1 951 tirages** (2004–2026) avec algorithmes avancés et génération intelligente de combinaisons.

## 🚀 Démarrage Rapide

```bash
cd site
python -m http.server 8080
```

Ouvrir : **http://localhost:8080**

## ⭐ Fonctionnalités PRO

### Analyses Statistiques Avancées
- ✅ **Smart Score** : Algorithme combinant fréquence + régularité + retard
- ✅ **Régularité** : Écart-type des intervalles (prédictibilité)
- ✅ **Overdue Score** : Retard actuel / intervalle moyen
- ✅ **Momentum** : Delta 50 derniers vs 50 précédents tirages
- ✅ **Patterns** : 30 paires + 20 triplets + 15 consécutifs
- ✅ **Analyse par jour** : Numéros favoris mardi/vendredi

### 6 Algorithmes de Génération
1. **ULTRA SMART** : smart_score × 1.5 + régularité × 0.8 + overdue × 0.7
2. **HOT MOMENTUM** : Tendance en hausse
3. **CHASSEUR** : Retard critique + régularité élevée
4. **ÉQUILIBRE** : Mix optimal fréquence/retard
5. **PATTERNS** : Basé sur paires/triplets historiques
6. **CONTRARIAN** : Numéros froids mais réguliers

### Génération Interactive
- **3 combinaisons** par clic
- **Stratégies variées** automatiques
- **Score intelligent** par grille
- **Validation patterns** (somme, parité, spread)

## 📊 Métriques Calculées

Chaque numéro dispose de :
- Fréquence absolue et relative
- Intervalle moyen entre sorties
- Écart-type (régularité)
- Smart score combiné (0-2)
- Overdue score (retard)
- Présence dans paires/triplets

## 🎯 Utilisation Optimale

### Générer des Grilles
1. Clic sur **"Générer 3 combinaisons"**
2. Répéter 5 fois → 15 grilles
3. Garder score > 0.85
4. Valider patterns

### Sélectionner
- Score > 1.0 = Excellent
- Score 0.8-1.0 = Très bon
- Score 0.6-0.8 = Bon

### Critères Validation
✓ Somme : 120-135 optimal
✓ Parité : 2P/3I ou 3P/2I
✓ 2+ numéros smart > 90
✓ Max 1 paire consécutive

## 📁 Structure

```
euro/
├── scripts/
│   └── advanced_analyze.py   # Analyse ultra-complète
├── site/
│   ├── index.html             # Interface web
│   ├── css/style.css          # Design moderne
│   ├── js/
│   │   ├── app.js            # Logique principale
│   │   └── advanced.js       # Algorithmes PRO
│   └── data/stats.json        # Données analysées (3 Mo)
├── extracted/                 # CSV FDJ
├── ANALYSE_PRO.md            # Documentation métriques
├── GUIDE_UTILISATION.md      # Guide stratégies
└── README.md

```

## 🔄 Mise à Jour

Après chaque nouveau tirage :

```bash
python scripts/advanced_analyze.py
```

Le fichier `stats.json` est mis à jour automatiquement.

## 📈 Base de Données

- **1 951 tirages** analysés
- **50 boules** · **12 étoiles**
- **30 paires** identifiées
- **20 triplets** détectés
- **7 jours** analysés
- **6 stratégies** parallèles

## ⚡ Performance

- JSON optimisé : ~3 Mo
- Chargement : < 1s
- Génération combos : < 200ms
- Analyses temps réel

## 📚 Documentation

- `ANALYSE_PRO.md` — Détail des métriques et formules
- `GUIDE_UTILISATION.md` — 6 stratégies de jeu
- `site/README.md` — Infos techniques

## ⚠️ Disclaimer Important

**Ce système analyse l'historique, il ne prédit PAS l'avenir.**

Chaque tirage est indépendant et aléatoire :
- Probabilité jackpot : **1 / 139 838 160**
- 10% par boule · 16,7% par étoile

Les combinaisons générées sont des **suggestions statistiques optimisées**, pas des garanties de gain.

**Jouez responsable. 18+**

## 🛠️ Technologies

- Python 3.x (analyse)
- Vanilla JS (pas de framework)
- CSS moderne (variables, animations)
- JSON (stockage optimisé)

---

**Version** : PRO 2.0
**Dernière analyse** : 2026-06-04
**Tirages** : 1 951
