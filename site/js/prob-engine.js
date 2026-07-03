/**
 * Moteur de probabilités PRO v3 — EWMA, momentum multi-fenêtres, ultra_score.
 */
(function (global) {
  const THEO_BALL = 10;
  const THEO_STAR = 16.67;

  function numScore(item) {
    return item.ultra_score ?? item.pro_score ?? item.smart_score / 2.5 ?? 0.5;
  }

  function buildProbabilityScores(data) {
    const mapBall = (f) => ({
      num: f.num,
      theoretical: THEO_BALL,
      historical: f.pct,
      recent: f.recent_pct ?? 0,
      combined: Math.round((f.ultra_score ?? f.pro_score ?? f.smart_score / 2.5) * 100),
      pro: Math.round((f.ultra_score ?? f.pro_score ?? 0) * 100),
      ultra: Math.round((f.ultra_score ?? 0) * 100),
      last_draw_ago: f.last_draw_ago,
      smart_score: f.smart_score,
      pro_score: f.pro_score,
      ultra_score: f.ultra_score,
      ewma_score: f.ewma_score,
      multi_momentum: f.multi_momentum,
      poisson_prob: f.poisson_prob,
      regularity: f.regularity,
      overdue_score: f.overdue_score,
      overdue_sigmoid: f.overdue_sigmoid,
      momentum_score: f.momentum_score,
      momentum_delta: f.momentum_delta,
      pair_synergy: f.pair_synergy,
      recent_score: f.recent_score,
      uniqueness_bonus: f.uniqueness_bonus,
      count: f.count,
      expected: f.expected,
    });

    const mapStar = (f) => ({
      num: f.num,
      theoretical: THEO_STAR,
      historical: f.pct,
      recent: f.recent_pct ?? 0,
      combined: Math.round((f.ultra_score ?? f.pro_score ?? f.smart_score / 2.5) * 100),
      pro: Math.round((f.ultra_score ?? f.pro_score ?? 0) * 100),
      ultra: Math.round((f.ultra_score ?? 0) * 100),
      last_draw_ago: f.last_draw_ago,
      smart_score: f.smart_score,
      pro_score: f.pro_score,
      ultra_score: f.ultra_score,
      ewma_score: f.ewma_score,
      multi_momentum: f.multi_momentum,
      poisson_prob: f.poisson_prob,
      regularity: f.regularity,
      overdue_score: f.overdue_score,
      momentum_score: f.momentum_score,
      momentum_delta: f.momentum_delta,
      recent_score: f.recent_score,
      uniqueness_bonus: f.uniqueness_bonus,
      count: f.count,
      expected: f.expected,
    });

    return {
      balls: data.balls.frequencies.map(mapBall),
      stars: data.stars.frequencies.map(mapStar),
      patterns: data.patterns || {},
      pairs: data.pairs || [],
    };
  }

  function getPctForMode(item, mode) {
    if (mode === "theoretical") return item.theoretical;
    if (mode === "historical") return item.historical;
    if (mode === "recent") return item.recent ?? 0;
    if (mode === "pro" || mode === "ultra") return item.ultra ?? item.pro ?? item.combined;
    return item.combined;
  }

  function pairStrength(balls, pairs) {
    if (!pairs.length || balls.length < 2) return 0;
    let total = 0;
    let count = 0;
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        const p = pairs.find(
          (x) =>
            (x.balls[0] === a && x.balls[1] === b) ||
            (x.balls[0] === b && x.balls[1] === a)
        );
        if (p) {
          total += p.strength || p.count / 100;
          count++;
        }
      }
    }
    return count ? total / count / 100 : 0;
  }

  function patternFitScore(balls, patterns) {
    if (!patterns || !balls.length) return 0.5;
    const sum = balls.reduce((a, b) => a + b, 0);
    const even = balls.filter((b) => b % 2 === 0).length;
    const low = balls.filter((b) => b <= 25).length;
    let score = 0;
    let parts = 0;

    const range = patterns.optimal_sum_range;
    if (range && range.length === 2) {
      const [lo, hi] = range;
      if (sum >= lo && sum <= hi) score += 1;
      else {
        const dist = sum < lo ? lo - sum : sum - hi;
        score += Math.max(0, 1 - dist / 40);
      }
      parts++;
    }

    if (patterns.optimal_parity !== undefined) {
      score += even === patterns.optimal_parity ? 1 : 0.5;
      parts++;
    }

    if (patterns.optimal_low_count !== undefined) {
      score += low === patterns.optimal_low_count ? 1 : 0.55;
      parts++;
    }

    return parts ? score / parts : 0.5;
  }

  function calcComboScore(balls, stars, ballMap, starMap, data) {
    const pairs = data?.pairs || [];
    const patterns = data?.patterns || {};

    const ballPro = balls.map((n) => numScore(ballMap[n] || {}));
    const starPro = stars.map((n) => numScore(starMap[n] || {}));
    const ballAvg = ballPro.reduce((a, b) => a + b, 0) / balls.length;
    const starAvg = starPro.reduce((a, b) => a + b, 0) / stars.length;

    const synergyNums = balls.map((n) => ballMap[n]?.pair_synergy || 0);
    const synergyAvg = synergyNums.reduce((a, b) => a + b, 0) / balls.length;
    const pairBonus = pairStrength(balls, pairs);
    const patternFit = patternFitScore(balls, patterns);

    const uniq =
      balls.reduce((s, n) => s + (ballMap[n]?.uniqueness_bonus || 0), 0) / balls.length;

    const raw =
      ballAvg * 0.38 +
      starAvg * 0.20 +
      synergyAvg * 0.10 +
      pairBonus * 0.08 +
      patternFit * 0.12 +
      uniq * 0.05 +
      (balls.reduce((s, n) => s + (ballMap[n]?.ewma_score || 0), 0) / balls.length) * 0.07;

    return Math.round(raw * 1000) / 10;
  }

  function validateCombo(balls, patterns) {
    if (!patterns?.optimal_sum_range) return true;
    const sum = balls.reduce((a, b) => a + b, 0);
    const [lo, hi] = patterns.optimal_sum_range;
    const margin = (patterns.sum_std || 25) * 1.2;
    return sum >= lo - margin && sum <= hi + margin;
  }

  function weightedPickPro(pool, count, data, exclude = new Set(), patterns = null) {
    const selected = [];
    const used = new Set(exclude);
    const pairMap = data?.pairs || [];

    for (let attempt = 0; selected.length < count && attempt < 400; attempt++) {
      const available = pool.filter((p) => !used.has(p.num));
      if (!available.length) break;

      const scored = available.map((item) => {
        let w = numScore(item) * 2.2;
        w += (item.ewma_score || 0) * 0.8;
        w += (item.multi_momentum || 0.5) * 0.5;
        if (selected.length) {
          let syn = 0;
          for (const sn of selected) {
            const found = pairMap.find(
              (p) =>
                (p.balls[0] === item.num && p.balls[1] === sn) ||
                (p.balls[0] === sn && p.balls[1] === item.num)
            );
            if (found) syn += (found.strength || 1) / 100;
          }
          w += syn * 0.35;
        }
        const trial = [...selected, item.num];
        if (patterns && trial.length >= 3) {
          w += patternFitScore(trial, patterns) * 0.25;
        }
        return { item, w: Math.max(w, 0.05) };
      });

      const total = scored.reduce((s, x) => s + x.w, 0);
      let r = Math.random() * total;
      for (const { item, w } of scored) {
        r -= w;
        if (r <= 0) {
          selected.push(item.num);
          used.add(item.num);
          break;
        }
      }
    }

    while (selected.length < count) {
      const available = pool.filter((p) => !used.has(p.num));
      if (!available.length) break;
      const pick = available[Math.floor(Math.random() * available.length)];
      selected.push(pick.num);
      used.add(pick.num);
    }

    return selected.sort((a, b) => a - b);
  }

  function generateOptimizedCombo(scores, data, strategy, usedKeys, maxCandidates = 12) {
    const ballMap = Object.fromEntries(scores.balls.map((b) => [b.num, b]));
    const starMap = Object.fromEntries(scores.stars.map((s) => [s.num, s]));
    const patterns = scores.patterns;
    let best = null;
    let bestScore = -1;

    for (let c = 0; c < maxCandidates; c++) {
      let balls, stars;
      if (strategy && strategy.weight && data?.balls?.frequencies) {
        const poolB = data.balls.frequencies;
        const poolS = data.stars.frequencies;
        balls = [];
        const usedB = new Set();
        for (let i = 0; i < 5; i++) {
          const avail = poolB.filter((p) => !usedB.has(p.num));
          if (!avail.length) break;
          const total = avail.reduce(
            (s, p) => s + Math.max(strategy.weight(p, data), 0.01),
            0
          );
          let r = Math.random() * total;
          for (const p of avail) {
            r -= Math.max(strategy.weight(p, data), 0.01);
            if (r <= 0) {
              balls.push(p.num);
              usedB.add(p.num);
              break;
            }
          }
        }
        balls = [...balls].sort((a, b) => a - b);
        stars = [];
        const usedS = new Set();
        for (let i = 0; i < 2; i++) {
          const avail = poolS.filter((p) => !usedS.has(p.num));
          if (!avail.length) break;
          const total = avail.reduce(
            (s, p) => s + Math.max(strategy.weight(p, data), 0.01),
            0
          );
          let r = Math.random() * total;
          for (const p of avail) {
            r -= Math.max(strategy.weight(p, data), 0.01);
            if (r <= 0) {
              stars.push(p.num);
              usedS.add(p.num);
              break;
            }
          }
        }
        stars = [...stars].sort((a, b) => a - b);
      } else {
        balls = weightedPickPro(scores.balls, 5, data, new Set(), patterns);
        stars = weightedPickPro(scores.stars, 2, data, new Set(), patterns);
      }

      if (balls.length < 5 || stars.length < 2) continue;
      if (!validateCombo(balls, patterns)) continue;

      const key = `${balls.join("-")}|${stars.join("-")}`;
      if (usedKeys.has(key)) continue;

      const score = calcComboScore(balls, stars, ballMap, starMap, data);
      if (score > bestScore) {
        bestScore = score;
        best = { balls, stars, score, key };
      }
    }

    if (!best) {
      const balls = weightedPickPro(scores.balls, 5, data);
      const stars = weightedPickPro(scores.stars, 2, data);
      const key = `${balls.join("-")}|${stars.join("-")}`;
      best = {
        balls,
        stars,
        score: calcComboScore(balls, stars, ballMap, starMap, data),
        key,
      };
    }

    usedKeys.add(best.key);
    const ballSum = best.balls.reduce((a, b) => a + b, 0);
    const evenCount = best.balls.filter((b) => b % 2 === 0).length;
    const lowCount = best.balls.filter((b) => b <= 25).length;

    return {
      balls: best.balls,
      stars: best.stars,
      score: best.score,
      analysis: {
        sum: ballSum,
        even: evenCount,
        low: lowCount,
        spread: Math.max(...best.balls) - Math.min(...best.balls),
        pattern_fit: Math.round(patternFitScore(best.balls, patterns) * 100),
      },
    };
  }

  global.probEngine = {
    THEO_BALL,
    THEO_STAR,
    buildProbabilityScores,
    getPctForMode,
    calcComboScore,
    patternFitScore,
    validateCombo,
    weightedPickPro,
    generateOptimizedCombo,
    numScore,
  };
})(typeof window !== "undefined" ? window : globalThis);
