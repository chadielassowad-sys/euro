// Algorithme avancé de génération de combinaisons
const STRATEGIES = [
  {
    id: "ultra_smart",
    name: "ULTRA SMART",
    title: "Score intelligent maximum",
    desc: "Algorithme avancé : smart_score + régularité + momentum",
    weight: (item, data) => {
      const smart = item.smart_score || 1;
      const reg = item.regularity || 0;
      const overdue = item.overdue_score || 0;
      return smart * 1.5 + reg * 0.8 + Math.min(overdue, 2) * 0.7;
    },
  },
  {
    id: "hot_momentum",
    name: "MOMENTUM +",
    title: "Tendance en hausse",
    desc: "Numéros avec momentum positif sur 50 derniers tirages",
    weight: (item, data) => {
      const momentum = data.momentum || { balls: [], stars: [] };
      const ballM = momentum.balls.find((m) => m.num === item.num);
      const starM = momentum.stars.find((m) => m.num === item.num);
      const delta = ballM?.delta || starM?.delta || 0;
      const smart = item.smart_score || 1;
      return smart * 1.2 + Math.max(delta, 0) * 2;
    },
  },
  {
    id: "overdue_hunter",
    name: "CHASSEUR",
    title: "Numéros en retard critique",
    desc: "Focus sur numéros absents + écart-type faible (réguliers)",
    weight: (item) => {
      const overdue = item.overdue_score || 0;
      const reg = item.regularity || 0;
      const freq = item.count / item.expected;
      return overdue * 2.5 + reg * 1.2 + freq * 0.5;
    },
  },
  {
    id: "balanced_mix",
    name: "ÉQUILIBRE",
    title: "Mix optimal fréquence + retard",
    desc: "Équilibre entre numéros chauds et numéros en retard",
    weight: (item) => {
      const freq = item.count / item.expected;
      const overdue = Math.min(item.overdue_score || 0, 2);
      const reg = item.regularity || 0;
      return freq * 1.0 + overdue * 1.5 + reg * 0.8;
    },
  },
  {
    id: "pattern_based",
    name: "PATTERNS",
    title: "Basé sur les patterns historiques",
    desc: "Utilise les paires et triplets les plus fréquents",
    weight: (item, data) => {
      const smart = item.smart_score || 1;
      const inPairs = (data.pairs || []).filter(
        (p) => p.balls[0] === item.num || p.balls[1] === item.num
      ).length;
      return smart * 1.0 + inPairs * 0.3;
    },
  },
  {
    id: "contrarian",
    name: "CONTRARIAN",
    title: "Numéros froids réguliers",
    desc: "Numéros peu sortis mais réguliers (retour probable)",
    weight: (item) => {
      const belowAvg = Math.max(0, item.expected - item.count);
      const reg = item.regularity || 0;
      const overdue = Math.min(item.overdue_score || 0, 2.5);
      return belowAvg * 0.15 + reg * 2.0 + overdue * 1.5;
    },
  },
];

function advancedWeightedPick(pool, count, strategy, data, exclude = new Set()) {
  const selected = [];
  const used = new Set(exclude);
  const scoredPool = pool
    .filter((p) => !used.has(p.num))
    .map((item) => ({
      ...item,
      _weight: Math.max(strategy.weight(item, data), 0.01),
    }));

  for (let attempt = 0; selected.length < count && attempt < 300; attempt++) {
    const available = scoredPool.filter((p) => !used.has(p.num));
    if (!available.length) break;

    const total = available.reduce((s, p) => s + p._weight, 0);
    let r = Math.random() * total;

    for (const item of available) {
      r -= item._weight;
      if (r <= 0) {
        selected.push(item.num);
        used.add(item.num);
        break;
      }
    }
  }

  while (selected.length < count) {
    const available = scoredPool.filter((p) => !used.has(p.num));
    if (!available.length) break;
    const pick = available[Math.floor(Math.random() * available.length)];
    selected.push(pick.num);
    used.add(pick.num);
  }

  return selected.sort((a, b) => a - b);
}

function getSmartScore(balls, stars, ballMap, starMap) {
  if (!balls.length || !stars.length) return 0;
  
  const ballScores = balls.map((n) => ballMap[n]?.smart_score || 0);
  const starScores = stars.map((n) => starMap[n]?.smart_score || 0);
  
  const ballAvg = ballScores.reduce((a, b) => a + b, 0) / balls.length;
  const starAvg = starScores.reduce((a, b) => a + b, 0) / stars.length;
  
  const ballReg = balls.map((n) => ballMap[n]?.regularity || 0);
  const avgReg = ballReg.reduce((a, b) => a + b, 0) / balls.length;
  
  return Math.round((ballAvg * 0.6 + starAvg * 0.3 + avgReg * 10 * 0.1) * 100) / 100;
}

function generateAdvancedCombinations(data) {
  const ballMap = Object.fromEntries(
    data.balls.frequencies.map((b) => [b.num, b])
  );
  const starMap = Object.fromEntries(
    data.stars.frequencies.map((s) => [s.num, s])
  );

  const usedKeys = new Set();
  const results = [];

  // Sélectionner 3 stratégies variées
  const selectedStrats = [
    STRATEGIES[0], // ultra_smart
    STRATEGIES[Math.floor(Math.random() * 2) + 1], // momentum ou overdue
    STRATEGIES[Math.floor(Math.random() * 3) + 3], // balanced, pattern ou contrarian
  ];

  for (const strat of selectedStrats) {
    let balls, stars, key, tries = 0;

    do {
      balls = advancedWeightedPick(
        data.balls.frequencies,
        5,
        strat,
        data
      );
      stars = advancedWeightedPick(
        data.stars.frequencies,
        2,
        strat,
        data
      );
      key = `${balls.join("-")}|${stars.join("-")}`;
      tries++;
    } while (usedKeys.has(key) && tries < 50);

    usedKeys.add(key);

    const smartScore = getSmartScore(balls, stars, ballMap, starMap);
    
    // Analyse de la combinaison
    const ballSum = balls.reduce((a, b) => a + b, 0);
    const evenCount = balls.filter((b) => b % 2 === 0).length;
    const lowCount = balls.filter((b) => b <= 25).length;
    
    results.push({
      name: strat.name,
      title: strat.title,
      desc: strat.desc,
      balls,
      stars,
      score: smartScore,
      analysis: {
        sum: ballSum,
        even: evenCount,
        low: lowCount,
        spread: Math.max(...balls) - Math.min(...balls),
      },
    });
  }

  // Trier par score décroissant
  results.sort((a, b) => b.score - a.score);

  return results;
}

// Export pour utilisation dans app.js
if (typeof window !== "undefined") {
  window.advancedCombos = {
    generate: generateAdvancedCombinations,
    strategies: STRATEGIES,
  };
}
