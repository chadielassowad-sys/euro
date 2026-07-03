const API = "data/stats.json";
const THEO_BALL = 10;
const THEO_STAR = 16.67;
const GRID_PRICE = 2.5;
let statsData = null;
let probMode = "ultra";
let lastCombos = null;
let comboHistory = JSON.parse(localStorage.getItem("comboHistory") || "[]");
let selectedBudget = 20;
let selectedGrids = 8;

async function loadStats() {
  const res = await fetch(API);
  if (!res.ok) throw new Error("Impossible de charger les données");
  return res.json();
}

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "className") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v);
  });
  children.forEach((c) => {
    if (typeof c === "string") e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  });
  return e;
}

function renderBalls(nums, star = false) {
  const g = el("div", { className: star ? "stars-group" : "balls" });
  nums.forEach((n) => {
    g.appendChild(el("div", { className: star ? "star" : "ball" }, [String(n)]));
  });
  return g;
}

function renderNumList(items, maxCount, type = "hot") {
  const ul = el("ul", { className: "num-list" });
  items.forEach((item, i) => {
    const pct = maxCount ? (item.count / maxCount) * 100 : 0;
    const barClass =
      type === "star" ? "star-bar" : type === "cold" ? "cold-bar" : "hot-bar";
    const circleClass =
      type === "star" ? "num-circle star-num" : "num-circle";
    
    let infoText = `${item.count}× (${item.pct ?? Math.round((item.count / (maxCount || 1)) * 100)}%)`;
    
    if (item.ultra_score !== undefined || item.pro_score !== undefined) {
      const u = item.ultra_score != null ? Math.round(item.ultra_score * 100) : item.pro;
      infoText += ` · ULTRA ${u}`;
    } else if (item.smart_score !== undefined) {
      infoText += ` · Smart ${Math.round(item.smart_score * 100)}`;
    }
    if (item.ewma_score !== undefined && item.ewma_score > 0.3) {
      infoText += ` · EWMA ${Math.round(item.ewma_score * 100)}`;
    }
    if (item.momentum_delta !== undefined && item.momentum_delta !== 0) {
      infoText += ` · Mom ${item.momentum_delta > 0 ? "+" : ""}${item.momentum_delta}`;
    }
    if (item.regularity !== undefined && item.regularity > 0.1) {
      infoText += ` · Régulier`;
    }
    if (item.overdue_score !== undefined && item.overdue_score > 1.5) {
      infoText += ` · En retard`;
    }
    if (item.last_draw_ago !== undefined) {
      infoText += ` · ↔ ${item.last_draw_ago}`;
    }
    
    ul.appendChild(
      el("li", {}, [
        el("span", { className: "rank" }, [`#${i + 1}`]),
        el("span", { className: circleClass }, [String(item.num)]),
        el("span", { className: "info" }, [infoText]),
        el("div", { className: "bar-wrap" }, [
          el("div", {
            className: `bar ${barClass}`,
            style: `width:${pct}%`,
          }),
        ]),
      ])
    );
  });
  return ul;
}

function renderFrequencyChart(freqs, expected, label) {
  const max = Math.max(...freqs.map((f) => f.count));
  const container = el("div", { className: "chart-container" });
  const bars = el("div", { className: "chart-bars" });
  freqs.forEach((f) => {
    const h = max ? (f.count / max) * 180 : 4;
    const above = f.count >= expected;
    bars.appendChild(
      el("div", { className: "chart-bar-wrap", title: `N°${f.num}: ${f.count} fois` }, [
        el("div", {
          className: `chart-bar ${above ? "above-avg" : "below-avg"}`,
          style: `height:${h}px`,
        }),
        el("span", { className: "chart-label" }, [String(f.num)]),
      ])
    );
  });
  container.appendChild(bars);
  container.appendChild(
    el("div", { className: "chart-legend" }, [
      el("span", { className: "legend-above" }, [
        `Au-dessus de la moyenne (≥ ${expected})`,
      ]),
      el("span", { className: "legend-below" }, ["En dessous"]),
    ])
  );
  return container;
}

function renderHero(data) {
  const m = data.meta;
  const ld = m.last_draw;
  document.getElementById("hero-desc").textContent = `${m.total_draws} tirages analysés · Algorithmes PRO · Smart Score activé · ${formatDate(m.first_date)} → ${formatDate(m.last_date)}`;
  document.getElementById("stat-draws").textContent = m.total_draws.toLocaleString("fr-FR");
  document.getElementById("stat-years").textContent = "22+";
  document.getElementById("stat-expected-ball").textContent =
    data.balls.expected_per_number;
  document.getElementById("stat-expected-star").textContent =
    data.stars.expected_per_number;
  const lastEl = document.getElementById("last-draw");
  lastEl.innerHTML = "";
  lastEl.appendChild(el("span", { className: "date" }, [
    `Dernier tirage : ${formatDate(ld.date)}`,
  ]));
  lastEl.appendChild(renderBalls(ld.balls));
  lastEl.appendChild(renderBalls(ld.stars, true));
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function renderHotCold(data) {
  document.getElementById("hot-balls").appendChild(
    renderNumList(data.balls.hot, data.balls.hot[0].count, "hot")
  );
  const coldSorted = [...data.balls.cold].sort((a, b) => a.count - b.count);
  document.getElementById("cold-balls").appendChild(
    renderNumList(coldSorted, data.balls.hot[0].count, "cold")
  );
  document.getElementById("overdue-balls").appendChild(
    renderNumList(data.balls.overdue, data.balls.hot[0].count, "hot")
  );
  document.getElementById("chart-balls").appendChild(
    renderFrequencyChart(
      [...data.balls.frequencies].sort((a, b) => a.num - b.num),
      data.balls.expected_per_number,
      "boules"
    )
  );
}

function renderStars(data) {
  document.getElementById("hot-stars").appendChild(
    renderNumList(data.stars.hot, data.stars.hot[0]?.count || 1, "star")
  );
  document.getElementById("cold-stars").appendChild(
    renderNumList(
      [...data.stars.cold].reverse(),
      data.stars.hot[0]?.count || 1,
      "star"
    )
  );
  document.getElementById("chart-stars").appendChild(
    renderFrequencyChart(
      [...data.stars.frequencies].sort((a, b) => a.num - b.num),
      data.stars.expected_per_number,
      "étoiles"
    )
  );
}

function renderRecent(data) {
  const r = data.recent_100 || data.recent_200 || { balls: [], stars: [] };
  const recentBalls = document.getElementById("recent-balls");
  const recentStars = document.getElementById("recent-stars");
  
  if (recentBalls && r.balls && r.balls.length) {
    recentBalls.appendChild(
      renderNumList(r.balls, r.balls[0]?.count || 1, "hot")
    );
  }
  
  if (recentStars && r.stars && r.stars.length) {
    recentStars.appendChild(
      renderNumList(r.stars, r.stars[0]?.count || 1, "star")
    );
  }
}

function renderPairs(data) {
  const tbody = document.getElementById("pairs-body");
  if (tbody && data.pairs) {
    data.pairs.forEach((p, i) => {
      const tr = el("tr");
      const strength = p.strength ? `${p.strength}%` : "—";
      tr.innerHTML = `<td>#${i + 1}</td><td><strong>${p.balls[0]}</strong> + <strong>${p.balls[1]}</strong></td><td>${p.count} fois</td><td>${strength}</td>`;
      tbody.appendChild(tr);
    });
  }

  const tripletsBody = document.getElementById("triplets-body");
  if (tripletsBody && data.triplets) {
    data.triplets.forEach((t, i) => {
      const tr = el("tr");
      tr.innerHTML = `<td>#${i + 1}</td><td><strong>${t.triplet.join(" · ")}</strong></td><td>${t.count} fois</td>`;
      tripletsBody.appendChild(tr);
    });
  }

  const consBody = document.getElementById("consecutive-body");
  if (consBody && data.consecutive_pairs) {
    data.consecutive_pairs.forEach((c, i) => {
      const tr = el("tr");
      tr.innerHTML = `<td>#${i + 1}</td><td><strong>${c.pair[0]}</strong> — <strong>${c.pair[1]}</strong></td><td>${c.count} fois</td>`;
      consBody.appendChild(tr);
    });
  }
}

function renderMomentum(data) {
  const upEl = document.getElementById("momentum-up-balls");
  const downEl = document.getElementById("momentum-down-balls");
  
  if (!data.momentum || !data.momentum.balls || data.momentum.balls.length === 0) {
    if (upEl) {
      upEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">Données de momentum non disponibles.</p>';
    }
    if (downEl) {
      downEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">Données de momentum non disponibles.</p>';
    }
    return;
  }
  
  const up = data.momentum.balls.filter((m) => m.delta > 0).slice(0, 8);
  const down = data.momentum.balls.filter((m) => m.delta < 0).slice(0, 8);
  
  if (upEl && up.length > 0) {
    const ul = el("ul", { className: "num-list" });
    up.forEach((m) => {
      ul.appendChild(
        el("li", {}, [
          el("span", { className: "num-circle" }, [String(m.num)]),
          el("span", { className: "info" }, [`+${m.delta} apparitions récentes`]),
        ])
      );
    });
    upEl.appendChild(ul);
  }
  
  if (downEl && down.length > 0) {
    const ul = el("ul", { className: "num-list" });
    down.forEach((m) => {
      ul.appendChild(
        el("li", {}, [
          el("span", { className: "num-circle" }, [String(m.num)]),
          el("span", { className: "info" }, [`${m.delta} (en déclin)`]),
        ])
      );
    });
    downEl.appendChild(ul);
  }
}

function renderWeekdayAnalysis(data) {
  const container = document.getElementById("weekday-cards");
  if (!container) return;
  
  if (!data.weekday_analysis || Object.keys(data.weekday_analysis).length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1">Analyse par jour non disponible.</p>';
    return;
  }
  
  Object.entries(data.weekday_analysis).forEach(([day, info]) => {
    const card = el("div", { className: "card" });
    card.appendChild(el("h3", {}, [day]));
    card.appendChild(
      el("p", { style: "font-size:0.85rem;color:var(--text-muted);margin-bottom:0.75rem" }, [
        `${info.count} tirages`,
      ])
    );
    
    if (info.top_balls && info.top_balls.length) {
      card.appendChild(el("strong", { style: "font-size:0.8rem" }, ["Top boules :"]));
      const balls = info.top_balls.slice(0, 5).map((b) => b.num);
      card.appendChild(
        el("div", { style: "margin:0.5rem 0" }, [renderBalls(balls)])
      );
    }
    
    if (info.top_stars && info.top_stars.length) {
      card.appendChild(el("strong", { style: "font-size:0.8rem;display:block;margin-top:0.5rem" }, ["Top étoiles :"]));
      const stars = info.top_stars.map((s) => s.num);
      card.appendChild(
        el("div", { style: "margin:0.5rem 0" }, [renderBalls(stars, true)])
      );
    }
    
    container.appendChild(card);
  });
}

function renderPatterns(data) {
  if (!data.patterns) return;
  
  const p = data.patterns;
  const sumEl = document.getElementById("pattern-sum");
  const minEl = document.getElementById("pattern-min");
  const maxEl = document.getElementById("pattern-max");
  const jackpotsEl = document.getElementById("pattern-jackpots");
  const evenEl = document.getElementById("even-dist");
  
  if (sumEl) sumEl.textContent = p.avg_sum_balls || "—";
  if (minEl) minEl.textContent = p.min_sum || "—";
  if (maxEl) maxEl.textContent = p.max_sum || "—";
  
  const gapEl = document.getElementById("pattern-gap");
  if (gapEl) gapEl.textContent = p.avg_gap || "—";
  
  if (evenEl && p.parity_distribution) {
    Object.entries(p.parity_distribution).forEach(([k, v]) => {
      evenEl.appendChild(
        el("div", { className: "pattern-item" }, [
          el("div", { className: "big" }, [String(v)]),
          el("div", {}, [`${k} boules paires`]),
        ])
      );
    });
  }
}

function renderSuggestions(data) {
  const grid = document.getElementById("suggestions-grid");
  if (!grid) return;
  
  const suggestions = data.suggested_combinations || [];
  
  if (suggestions.length === 0) {
    const note = el("p", { style: "color:var(--text-muted);text-align:center" }, [
      "Les suggestions sont maintenant générées via le bouton principal ci-dessus.",
    ]);
    grid.appendChild(note);
    return;
  }
  
  suggestions.forEach((s) => {
    const card = el("div", { className: "suggestion-card" });
    card.appendChild(el("h4", {}, [s.name]));
    card.appendChild(el("p", {}, [s.desc]));
    const combo = el("div", { style: "display:flex;gap:1rem;flex-wrap:wrap;align-items:center" });
    combo.appendChild(renderBalls(s.balls));
    combo.appendChild(renderBalls(s.stars, true));
    card.appendChild(combo);
    grid.appendChild(card);
  });
}

function renderHistory(data) {
  const grid = document.getElementById("history-grid");
  data.history.forEach((d) => {
    const item = el("div", { className: "history-item" });
    item.appendChild(el("span", {}, [formatDate(d.date)]));
    item.appendChild(el("span", { style: "color:var(--text-muted)" }, [d.id]));
    const nums = el("div", { style: "display:flex;gap:0.5rem;flex-wrap:wrap" });
    nums.appendChild(renderBalls(d.balls));
    nums.appendChild(renderBalls(d.stars, true));
    item.appendChild(nums);
    grid.appendChild(item);
  });
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(target)?.classList.add("active");
    });
  });
}

function buildProbabilityScores(data) {
  if (window.probEngine) {
    return window.probEngine.buildProbabilityScores(data);
  }
  return {
    balls: data.balls.frequencies.map((f) => ({
      num: f.num,
      theoretical: THEO_BALL,
      historical: f.pct,
      combined: Math.round((f.pro_score || f.smart_score / 2.5) * 100),
      pro: Math.round((f.pro_score || 0) * 100),
      last_draw_ago: f.last_draw_ago,
      smart_score: f.smart_score,
      regularity: f.regularity,
      overdue_score: f.overdue_score,
      count: f.count,
      expected: f.expected,
    })),
    stars: data.stars.frequencies.map((f) => ({
      num: f.num,
      theoretical: THEO_STAR,
      historical: f.pct,
      combined: Math.round((f.pro_score || f.smart_score / 2.5) * 100),
      pro: Math.round((f.pro_score || 0) * 100),
      last_draw_ago: f.last_draw_ago,
      smart_score: f.smart_score,
      regularity: f.regularity,
      overdue_score: f.overdue_score,
      count: f.count,
      expected: f.expected,
    })),
    patterns: data.patterns || {},
    pairs: data.pairs || [],
  };
}

function getPctForMode(item, mode) {
  if (window.probEngine) {
    return window.probEngine.getPctForMode(item, mode);
  }
  if (mode === "theoretical") return item.theoretical;
  if (mode === "historical") return item.historical;
  if (mode === "recent") return item.recent ?? 0;
  if (mode === "pro" || mode === "ultra") return item.ultra ?? item.pro ?? item.combined;
  return item.combined;
}

function heatColor(pct, maxPct, isStar) {
  const t = maxPct ? Math.min(pct / maxPct, 1) : 0;
  if (isStar) {
    return `rgba(232, 93, 4, ${0.15 + t * 0.55})`;
  }
  return `rgba(34, 197, 94, ${0.1 + t * 0.5})`;
}

function renderProbGrid(container, items, topNums, isStar = false) {
  container.innerHTML = "";
  const maxPct = Math.max(...items.map((i) => getPctForMode(i, probMode)));
  const sorted = [...items].sort(
    (a, b) => getPctForMode(b, probMode) - getPctForMode(a, probMode)
  );

  sorted.forEach((item) => {
    const pct = getPctForMode(item, probMode);
    const isTop = topNums.includes(item.num);
    const cell = el("div", {
      className: `prob-cell${isStar ? " star-cell" : ""}${isTop ? " top-pick" : ""}`,
      title: `N°${item.num} — ${pct}${probMode === "theoretical" || probMode === "historical" || probMode === "recent" ? "%" : " pts"}${
        item.last_draw_ago ? ` — absent ${item.last_draw_ago} tirage(s)` : ""
      }${item.pair_synergy ? ` — synergie ${Math.round(item.pair_synergy * 100)}%` : ""}`,
      style: `background:${heatColor(pct, maxPct, isStar)}`,
    });
    const isPct = probMode === "theoretical" || probMode === "historical" || probMode === "recent";
    const unit = isPct ? "%" : "pts";
    cell.appendChild(el("span", { className: "num" }, [String(item.num)]));
    cell.appendChild(el("span", { className: "pct" }, [`${pct}${unit}`]));
    cell.appendChild(
      el("span", { className: "pct-label" }, [
        probMode === "theoretical"
          ? "théorique"
          : probMode === "historical"
            ? "historique"
            : probMode === "recent"
              ? "récent"
              : probMode === "pro" || probMode === "ultra"
                ? "ULTRA"
                : "score",
      ])
    );
    container.appendChild(cell);
  });
}

function weightedPick(pool, count, weightKey, exclude = new Set()) {
  const selected = [];
  const used = new Set(exclude);
  const maxAttempts = 500;

  for (let attempt = 0; selected.length < count && attempt < maxAttempts; attempt++) {
    const available = pool.filter((p) => !used.has(p.num));
    if (!available.length) break;

    const total = available.reduce(
      (s, p) => s + Math.max(p[weightKey] || 1, 0.1),
      0
    );
    let r = Math.random() * total;

    for (const item of available) {
      r -= Math.max(item[weightKey] || 1, 0.1);
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

function comboKey(balls, stars) {
  return `${balls.join("-")}|${stars.join("-")}`;
}

function calcComboScore(balls, stars, ballMap, starMap, data) {
  if (window.probEngine) {
    return window.probEngine.calcComboScore(balls, stars, ballMap, starMap, data || statsData);
  }
  const ballScores = balls.map((n) => ballMap[n]?.smart_score || ballMap[n]?.combined / 100 || 0);
  const starScores = stars.map((n) => starMap[n]?.smart_score || starMap[n]?.combined / 100 || 0);
  const ballAvg = ballScores.reduce((a, b) => a + b, 0) / balls.length;
  const starAvg = starScores.reduce((a, b) => a + b, 0) / stars.length;
  return Math.round((ballAvg * 0.6 + starAvg * 0.3) * 100) / 100;
}

function generateCombinationsByCount(scores, count) {
  if (window.probEngine && window.advancedCombos && statsData) {
    const results = [];
    const usedKeys = new Set();
    const strats = window.advancedCombos.strategies;
    let round = 0;

    while (results.length < count && round < count * 4) {
      const strat = strats[round % strats.length];
      const combo = window.probEngine.generateOptimizedCombo(
        scores,
        statsData,
        strat,
        usedKeys,
        20
      );
      combo.name = strat.name;
      combo.title = strat.title;
      combo.desc = strat.desc;
      results.push(combo);
      round++;
    }

    if (results.length < count) {
      const extra = window.advancedCombos.generate(statsData);
      for (const c of extra) {
        if (results.length >= count) break;
        const key = `${c.balls.join("-")}|${c.stars.join("-")}`;
        if (!usedKeys.has(key)) {
          usedKeys.add(key);
          results.push(c);
        }
      }
    }

    return results.slice(0, count).sort((a, b) => b.score - a.score);
  }

  if (window.advancedCombos && statsData) {
    const results = [];
    const usedKeys = new Set();
    while (results.length < count) {
      const combos = window.advancedCombos.generate(statsData);
      for (const combo of combos) {
        const key = `${combo.balls.join("-")}|${combo.stars.join("-")}`;
        if (!usedKeys.has(key) && results.length < count) {
          usedKeys.add(key);
          results.push(combo);
        }
      }
      if (results.length === 0 && usedKeys.size > count * 3) break;
    }
    return results.slice(0, count);
  }
  
  // Fallback simple si advanced.js n'est pas disponible
  const ballMap = Object.fromEntries(scores.balls.map((b) => [b.num, b]));
  const starMap = Object.fromEntries(scores.stars.map((s) => [s.num, s]));
  const usedKeys = new Set();
  const results = [];
  
  const strategies = [
    { name: "SMART", title: "Score intelligent", desc: "Algorithme avancé", ballKey: "smart_score", starKey: "smart_score" },
    { name: "HOT", title: "Numéros chauds", desc: "Les plus fréquents", ballKey: "combined", starKey: "combined" },
    { name: "MIX", title: "Équilibré", desc: "Mix optimal", ballKey: "smart_score", starKey: "combined" },
  ];
  
  for (let i = 0; i < count; i++) {
    const strat = strategies[i % strategies.length];
    let balls, stars, key, tries = 0;
    
    do {
      balls = weightedPick(scores.balls, 5, strat.ballKey);
      stars = weightedPick(scores.stars, 2, strat.starKey);
      key = comboKey(balls, stars);
      tries++;
    } while (usedKeys.has(key) && tries < 50);
    
    usedKeys.add(key);
    const score = calcComboScore(balls, stars, ballMap, starMap, statsData);
    const ballSum = balls.reduce((a, b) => a + b, 0);
    const evenCount = balls.filter((b) => b % 2 === 0).length;
    const lowCount = balls.filter((b) => b <= 25).length;
    
    results.push({
      name: strat.name,
      title: strat.title,
      desc: strat.desc,
      balls,
      stars,
      score,
      analysis: {
        sum: ballSum,
        even: evenCount,
        low: lowCount,
        spread: Math.max(...balls) - Math.min(...balls),
      },
    });
  }
  
  return results;
}

function generateThreeCombinations(scores) {
  return generateCombinationsByCount(scores, 3);
}

function renderComboCard(combo, index, showActions = true) {
  const card = el("div", { className: "combo-card" });
  card.appendChild(el("div", { className: "combo-label" }, [combo.name]));
  card.appendChild(el("h4", {}, [combo.title]));
  card.appendChild(el("p", { className: "combo-desc" }, [combo.desc]));
  const row = el("div", { className: "combo-row" });
  row.appendChild(renderBalls(combo.balls));
  row.appendChild(renderBalls(combo.stars, true));
  card.appendChild(row);
  
  const scoreEl = el("div", { className: "combo-score" });
  scoreEl.appendChild(document.createTextNode(`Score ULTRA : ${combo.score} `));
  const hint = el("span");
  hint.textContent = "(moteur statistique v3)";
  scoreEl.appendChild(hint);
  card.appendChild(scoreEl);
  
  if (combo.analysis) {
    const details = el("div", { className: "combo-details" });
    const spread = combo.analysis.spread || (Math.max(...combo.balls) - Math.min(...combo.balls));
    const fit = combo.analysis.pattern_fit != null ? ` • Pattern ${combo.analysis.pattern_fit}%` : "";
    details.innerHTML = `Somme: ${combo.analysis.sum} • ${combo.analysis.even}P/${5 - combo.analysis.even}I${combo.analysis.low != null ? ` • ${combo.analysis.low}B/${5 - combo.analysis.low}H` : ""} • Écart: ${spread}${fit}`;
    card.appendChild(details);
  }
  
  if (showActions) {
    const actions = el("div", { className: "combo-actions" });
    const copyBtn = el("button", { 
      className: "btn-action",
      title: "Copier la combinaison"
    }, ["📋"]);
    copyBtn.onclick = () => copyCombo(combo);
    actions.appendChild(copyBtn);
    card.appendChild(actions);
  }
  
  return card;
}

function displayCombinations(count = null) {
  if (!statsData) return;
  const numCombos = count || selectedGrids;
  const scores = buildProbabilityScores(statsData);
  const combos = generateCombinationsByCount(scores, numCombos);

  // Sauvegarder dans l'historique
  const timestamp = new Date().toISOString();
  comboHistory.unshift({ timestamp, combos, budget: selectedBudget });
  if (comboHistory.length > 50) comboHistory = comboHistory.slice(0, 50);
  localStorage.setItem("comboHistory", JSON.stringify(comboHistory));
  updateHistoryBadge();

  const container = document.getElementById("combo-results");
  const cards = document.getElementById("combo-cards");
  const title = document.getElementById("combo-results-title");
  const costSummary = document.getElementById("combo-cost-summary");
  
  title.textContent = `Vos ${numCombos} combinaison${numCombos > 1 ? 's' : ''}`;
  cards.innerHTML = "";
  combos.forEach((c) => cards.appendChild(renderComboCard(c)));
  
  // Afficher le récapitulatif des coûts
  const totalCost = (numCombos * GRID_PRICE).toFixed(2);
  costSummary.innerHTML = `
    <div class="cost-info">
      <span>💰 Coût total : <strong>${totalCost}€</strong> (${numCombos} grille${numCombos > 1 ? 's' : ''} × ${GRID_PRICE}€)</span>
    </div>
  `;
  
  container.hidden = false;
  container.classList.add("fresh");
  setTimeout(() => container.classList.remove("fresh"), 500);
  container.scrollIntoView({ behavior: "smooth", block: "nearest" });
  lastCombos = combos;
  return combos;
}

function displayThreeCombinations() {
  return displayCombinations(3);
}

function renderProbPanel(combosFromClick) {
  if (!statsData) return;
  const scores = buildProbabilityScores(statsData);
  const combos = combosFromClick || lastCombos || generateThreeCombinations(scores);
  const allBalls = combos.flatMap((c) => c.balls);
  const allStars = combos.flatMap((c) => c.stars);

  const summary = document.getElementById("prob-summary");
  summary.innerHTML = "";
  summary.appendChild(
    el("div", { className: "prob-summary-item" }, [
      el("div", { className: "val" }, ["10 %"]),
      el("div", { className: "lbl" }, ["Chance théorique / boule"]),
    ])
  );
  summary.appendChild(
    el("div", { className: "prob-summary-item" }, [
      el("div", { className: "val" }, ["16,7 %"]),
      el("div", { className: "lbl" }, ["Chance théorique / étoile"]),
    ])
  );
  summary.appendChild(
    el("div", { className: "prob-summary-item" }, [
      el("div", { className: "val" }, ["1 / 139 M"]),
      el("div", { className: "lbl" }, ["Chance jackpot"]),
    ])
  );

  const picks = document.getElementById("prob-picks");
  picks.innerHTML = "";
  picks.appendChild(el("h4", {}, ["3 combinaisons générées"]));
  const grid = el("div", { className: "prob-combo-cards" });
  combos.forEach((c) => grid.appendChild(renderComboCard(c)));
  picks.appendChild(grid);
  picks.appendChild(
    el("p", {
      style: "text-align:center;margin-top:1rem;font-size:0.85rem;color:var(--text-muted)",
    }, ["Cliquez à nouveau sur le bouton principal pour obtenir 3 nouvelles grilles."])
  );

  renderProbGrid(
    document.getElementById("prob-grid-balls"),
    scores.balls,
    [...new Set(allBalls)]
  );
  renderProbGrid(
    document.getElementById("prob-grid-stars"),
    scores.stars,
    [...new Set(allStars)],
    true
  );
}

function openProbPanel() {
  const overlay = document.getElementById("prob-overlay");
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  const combos = displayThreeCombinations();
  renderProbPanel(combos);
}

function updateBudget(budget) {
  selectedBudget = budget;
  selectedGrids = Math.floor(budget / GRID_PRICE);
  
  document.getElementById("selected-budget").textContent = `${budget.toFixed(2)}€`;
  document.getElementById("selected-grids").textContent = selectedGrids;
  document.getElementById("total-cost").textContent = `${(selectedGrids * GRID_PRICE).toFixed(2)}€`;
  document.getElementById("generate-btn-text").textContent = `Générer ${selectedGrids} combinaison${selectedGrids > 1 ? 's' : ''}`;
  
  // Mettre à jour le bouton actif
  document.querySelectorAll(".budget-btn").forEach(btn => {
    btn.classList.remove("active");
    if (parseFloat(btn.dataset.budget) === budget) {
      btn.classList.add("active");
    }
  });
}

function onGenerateClick() {
  if (!statsData) return;
  const btn = document.getElementById("btn-generate-combos");
  btn.disabled = true;
  const originalText = btn.querySelector(".btn-prob-text").textContent;
  btn.querySelector(".btn-prob-text").textContent = "Génération…";
  setTimeout(() => {
    displayCombinations(selectedGrids);
    btn.disabled = false;
    btn.querySelector(".btn-prob-text").textContent = originalText;
  }, 200);
}

function closeProbPanel() {
  const overlay = document.getElementById("prob-overlay");
  overlay.hidden = true;
  document.body.style.overflow = "";
}

function copyCombo(combo) {
  const text = `${combo.name} - ${combo.title}\nBoules: ${combo.balls.join(", ")}\nÉtoiles: ${combo.stars.join(", ")}\nScore: ${combo.score}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast("✅ Combinaison copiée !");
  });
}

function exportAllCombos() {
  if (!lastCombos) return;
  let text = "=== MES COMBINAISONS EUROMILLIONS ===\n";
  text += `Générées le ${new Date().toLocaleString("fr-FR")}\n\n`;
  lastCombos.forEach((c, i) => {
    text += `${i + 1}. ${c.name} - ${c.title}\n`;
    text += `   Boules: ${c.balls.join(" - ")}\n`;
    text += `   Étoiles: ${c.stars.join(" - ")}\n`;
    text += `   Score: ${c.score}\n`;
    text += `   Analyse: Somme ${c.analysis.sum}, ${c.analysis.even}P/${5 - c.analysis.even}I\n\n`;
  });
  
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `euromillions-combos-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("📥 Combinaisons exportées !");
}

function showAllStrategies() {
  if (!statsData || !window.advancedCombos) return;
  
  const allCombos = [];
  for (let i = 0; i < 6; i++) {
    const combos = window.advancedCombos.generate(statsData);
    combos.forEach(c => {
      const key = `${c.balls.join("-")}|${c.stars.join("-")}`;
      if (!allCombos.find(x => `${x.balls.join("-")}|${x.stars.join("-")}` === key)) {
        allCombos.push(c);
      }
    });
  }
  
  const modal = el("div", { className: "prob-overlay", id: "all-strategies-overlay" });
  const content = el("div", { className: "prob-modal" });
  
  const header = el("div", { className: "prob-modal-header" });
  header.appendChild(el("div", {}, [
    el("h2", {}, ["Toutes les stratégies"]),
    el("p", { className: "prob-modal-sub" }, [`${allCombos.length} combinaisons uniques générées`])
  ]));
  const closeBtn = el("button", { className: "prob-close" }, ["×"]);
  closeBtn.onclick = () => modal.remove();
  header.appendChild(closeBtn);
  content.appendChild(header);
  
  const grid = el("div", { className: "all-strategies-grid" });
  allCombos.slice(0, 12).forEach((c, i) => grid.appendChild(renderComboCard(c, i)));
  content.appendChild(grid);
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

function showHistory() {
  const modal = el("div", { className: "prob-overlay", id: "history-overlay" });
  const content = el("div", { className: "prob-modal" });
  
  const header = el("div", { className: "prob-modal-header" });
  header.appendChild(el("div", {}, [
    el("h2", {}, ["Historique des générations"]),
    el("p", { className: "prob-modal-sub" }, [`${comboHistory.length} sessions enregistrées`])
  ]));
  const closeBtn = el("button", { className: "prob-close" }, ["×"]);
  closeBtn.onclick = () => modal.remove();
  header.appendChild(closeBtn);
  content.appendChild(header);
  
  if (comboHistory.length === 0) {
    content.appendChild(el("p", { style: "text-align:center;color:var(--text-muted);padding:2rem" }, [
      "Aucune combinaison générée pour le moment."
    ]));
  } else {
    const clearBtn = el("button", { className: "btn-prob-secondary", style: "margin:0 auto 1rem" }, ["🗑️ Vider l'historique"]);
    clearBtn.onclick = () => {
      if (confirm("Êtes-vous sûr de vouloir supprimer tout l'historique ?")) {
        comboHistory = [];
        localStorage.removeItem("comboHistory");
        modal.remove();
        updateHistoryBadge();
        showToast("🗑️ Historique supprimé");
      }
    };
    content.appendChild(clearBtn);
    
    const historyList = el("div", { className: "history-list" });
    comboHistory.forEach((entry, idx) => {
      const item = el("div", { className: "history-item-card" });
      const date = new Date(entry.timestamp);
      item.appendChild(el("div", { className: "history-date" }, [
        `${date.toLocaleDateString("fr-FR")} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
      ]));
      
      const grid = el("div", { className: "history-combos-grid" });
      entry.combos.forEach((c, i) => grid.appendChild(renderComboCard(c, i, false)));
      item.appendChild(grid);
      historyList.appendChild(item);
    });
    content.appendChild(historyList);
  }
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

function updateHistoryBadge() {
  const badge = document.getElementById("history-badge");
  if (badge) {
    badge.textContent = comboHistory.length;
    badge.style.display = comboHistory.length > 0 ? "inline-block" : "none";
  }
}

function showToast(message) {
  const toast = el("div", { className: "toast" }, [message]);
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function setupProbabilityButton() {
  document.getElementById("btn-generate-combos").addEventListener("click", onGenerateClick);
  document.getElementById("btn-show-prob").addEventListener("click", openProbPanel);
  document.getElementById("btn-close-prob").addEventListener("click", closeProbPanel);
  document.getElementById("btn-export-combos")?.addEventListener("click", exportAllCombos);
  document.getElementById("btn-all-strategies")?.addEventListener("click", showAllStrategies);
  document.getElementById("btn-history")?.addEventListener("click", showHistory);
  
  // Budget buttons
  document.querySelectorAll(".budget-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const budget = parseFloat(btn.dataset.budget);
      updateBudget(budget);
    });
  });
  
  // Custom budget
  document.getElementById("btn-apply-custom").addEventListener("click", () => {
    const customBudget = parseFloat(document.getElementById("custom-budget").value);
    if (customBudget && customBudget >= GRID_PRICE) {
      updateBudget(customBudget);
      document.getElementById("custom-budget").value = "";
    } else {
      showToast("⚠️ Budget minimum : " + GRID_PRICE + "€");
    }
  });
  
  document.getElementById("custom-budget").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      document.getElementById("btn-apply-custom").click();
    }
  });
  
  document.getElementById("prob-overlay").addEventListener("click", (e) => {
    if (e.target.id === "prob-overlay") closeProbPanel();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProbPanel();
      document.getElementById("all-strategies-overlay")?.remove();
      document.getElementById("history-overlay")?.remove();
    }
  });

  document.querySelectorAll(".prob-mode").forEach((btn) => {
    btn.addEventListener("click", () => {
      probMode = btn.dataset.mode;
      document.querySelectorAll(".prob-mode").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderProbPanel();
    });
  });

  document.querySelector('a[href="#probabilites"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    onGenerateClick();
  });
  
  updateHistoryBadge();
  updateBudget(selectedBudget);
}

async function init() {
  const app = document.getElementById("app");
  try {
    const data = await loadStats();
    statsData = data;
    app.classList.remove("loading");
    document.getElementById("generated-at").textContent = data.meta.generated_at;
    renderHero(data);
    renderHotCold(data);
    renderStars(data);
    renderRecent(data);
    renderPairs(data);
    renderMomentum(data);
    renderWeekdayAnalysis(data);
    renderPatterns(data);
    renderSuggestions(data);
    renderHistory(data);
    setupTabs();
    setupProbabilityButton();
  } catch (err) {
    app.innerHTML = `<p style="color:#f87171">Erreur : ${err.message}. Lancez un serveur local depuis le dossier site/.</p>`;
  }
}

init();
