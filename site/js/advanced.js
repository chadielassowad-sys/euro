// Génération avancée — utilise prob-engine PRO v2
const STRATEGIES = [
  {
    id: "ultra_smart",
    name: "ULTRA SMART",
    title: "Score PRO maximum",
    desc: "pro_score + synergies paires + patterns historiques",
    weight: (item, data) => {
      const pro = item.pro_score ?? (item.smart_score || 1) / 2.5;
      const reg = item.regularity || 0;
      const syn = item.pair_synergy || 0;
      const mom = item.momentum_score ?? 0.5;
      return pro * 2.2 + reg * 0.9 + syn * 1.1 + mom * 0.6;
    },
  },
  {
    id: "hot_momentum",
    name: "MOMENTUM +",
    title: "Tendance récente forte",
    desc: "Momentum 50 tirages + fréquence récente (100 tirages)",
    weight: (item, data) => {
      const pro = item.pro_score ?? (item.smart_score || 1) / 2.5;
      const recent = item.recent_score ?? 0;
      const delta = item.momentum_delta ?? 0;
      return pro * 1.3 + recent * 1.8 + Math.max(delta, 0) * 0.15;
    },
  },
  {
    id: "overdue_hunter",
    name: "CHASSEUR",
    title: "Retard sigmoïde + régularité",
    desc: "Absence normalisée sans surestimer le « dû »",
    weight: (item) => {
      const overdue = item.overdue_sigmoid ?? Math.min(item.overdue_score || 0, 1);
      const reg = item.regularity || 0;
      const pro = item.pro_score ?? (item.smart_score || 1) / 2.5;
      return overdue * 2.2 + reg * 1.4 + pro * 0.8;
    },
  },
  {
    id: "balanced_mix",
    name: "ÉQUILIBRE",
    title: "Fusion historique + récent",
    desc: "Mélange pondéré 50/50 historique et tendance",
    weight: (item) => {
      const freq = item.count / (item.expected || 1);
      const recent = item.recent_score ?? 0;
      const pro = item.pro_score ?? (item.smart_score || 1) / 2.5;
      return freq * 0.6 + recent * 1.2 + pro * 1.0;
    },
  },
  {
    id: "pattern_based",
    name: "PATTERNS",
    title: "Synergie paires & triplets",
    desc: "Numéros liés dans les combinaisons historiques",
    weight: (item, data) => {
      const pro = item.pro_score ?? (item.smart_score || 1) / 2.5;
      const syn = item.pair_synergy || 0;
      const inPairs = (data.pairs || []).filter(
        (p) => p.balls[0] === item.num || p.balls[1] === item.num
      ).length;
      return pro * 1.2 + syn * 1.5 + inPairs * 0.2;
    },
  },
  {
    id: "contrarian",
    name: "CONTRARIAN",
    title: "Froids réguliers + unicité",
    desc: "Sous la moyenne mais stables — moins partagés si gain",
    weight: (item) => {
      const below = Math.max(0, (item.expected || 0) - (item.count || 0));
      const reg = item.regularity || 0;
      const uniq = item.uniqueness_bonus ?? 0.5;
      const overdue = item.overdue_sigmoid ?? 0;
      return below * 0.08 + reg * 2.0 + uniq * 1.2 + overdue * 0.9;
    },
  },
];

function generateAdvancedCombinations(data) {
  const engine = window.probEngine;
  const scores = engine
    ? engine.buildProbabilityScores(data)
    : null;
  const usedKeys = new Set();
  const results = [];

  const selectedStrats = [
    STRATEGIES[0],
    STRATEGIES[Math.floor(Math.random() * 2) + 1],
    STRATEGIES[Math.floor(Math.random() * 3) + 3],
  ];

  for (const strat of selectedStrats) {
    let combo;
    if (engine && scores) {
      combo = engine.generateOptimizedCombo(scores, data, strat, usedKeys, 16);
      combo.name = strat.name;
      combo.title = strat.title;
      combo.desc = strat.desc;
    } else {
      combo = legacyGenerate(strat, data, usedKeys);
    }
    results.push(combo);
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

function legacyGenerate(strat, data, usedKeys) {
  const balls = pickLegacy(data.balls.frequencies, 5, strat, data);
  const stars = pickLegacy(data.stars.frequencies, 2, strat, data);
  const key = `${balls.join("-")}|${stars.join("-")}`;
  usedKeys.add(key);
  return {
    name: strat.name,
    title: strat.title,
    desc: strat.desc,
    balls,
    stars,
    score: 0,
    analysis: { sum: balls.reduce((a, b) => a + b, 0), even: 0, low: 0, spread: 0 },
  };
}

function pickLegacy(pool, count, strategy, data) {
  const selected = [];
  const used = new Set();
  for (let i = 0; i < count && i < 300; i++) {
    const avail = pool.filter((p) => !used.has(p.num));
    if (!avail.length) break;
    const total = avail.reduce((s, p) => s + Math.max(strategy.weight(p, data), 0.01), 0);
    let r = Math.random() * total;
    for (const p of avail) {
      r -= Math.max(strategy.weight(p, data), 0.01);
      if (r <= 0) {
        selected.push(p.num);
        used.add(p.num);
        break;
      }
    }
  }
  return selected.sort((a, b) => a - b);
}

if (typeof window !== "undefined") {
  window.advancedCombos = {
    generate: generateAdvancedCombinations,
    strategies: STRATEGIES,
  };
}
