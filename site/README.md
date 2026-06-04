# Euro Stats — Analyse Ultra-Avancée Euromillions

## Fonctionnalités PRO

### Analyses Statistiques
- **Smart Score** : Score intelligent combinant fréquence, régularité et retard
- **Régularité** : Écart-type des intervalles pour identifier les numéros prévisibles
- **Overdue Score** : Ratio retard actuel / intervalle moyen
- **Momentum** : Variation entre les 50 derniers et 50 précédents tirages
- **Patterns** : Paires (30), triplets (20), consécutifs (15)
- **Analyse par jour** : Numéros les plus fréquents selon le jour de la semaine

### Algorithmes de Génération
6 stratégies avancées :
1. **ULTRA SMART** : smart_score + régularité + momentum
2. **HOT MOMENTUM** : Tendance en hausse
3. **CHASSEUR** : Retard critique + régularité
4. **ÉQUILIBRE** : Mix optimal fréquence/retard
5. **PATTERNS** : Basé sur paires/triplets historiques
6. **CONTRARIAN** : Numéros froids réguliers

### Métriques par Numéro
- Fréquence absolue et %
- Intervalle moyen entre apparitions
- Écart-type (régularité)
- Dernier tirage
- Score overdue
- Smart score combiné
- Force dans les paires

## Lancer le site

```bash
cd site
python -m http.server 8080
```

http://localhost:8080

## Régénérer les stats

```bash
python scripts/advanced_analyze.py
```

## Base de données
- 1 951 tirages (2004-2026)
- 50 boules · 12 étoiles
- 30 paires · 20 triplets · 15 consécutifs
- 7 jours analysés (patterns par jour)

## Performance
- JSON optimisé ~3 Mo
- Chargement < 1s
- Génération combos < 200ms
- 6 stratégies parallèles
