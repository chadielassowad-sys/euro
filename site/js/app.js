const API = "data/stats.json";
const THEO_BALL = 10;
const THEO_STAR = 16.67;
let statsData = null;
let probMode = "combined";
let lastCombos = null;

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
    
    if (item.smart_score !== undefined) {
      infoText += ` · Smart ${Math.round(item.smart_score * 100)}`;
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
  return {
    balls: data.balls.frequencies.map((f) => ({
      num: f.num,
      theoretical: THEO_BALL,
      historical: f.pct,
      combined: Math.round(f.smart_score * 100),
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
      combined: Math.round(f.smart_score * 100),
      last_draw_ago: f.last_draw_ago,
      smart_score: f.smart_score,
      regularity: f.regularity,
      overdue_score: f.overdue_score,
      count: f.count,
      expected: f.expected,
    })),
  };
}

function getPctForMode(item, mode) {
  if (mode === "theoretical") return item.theoretical;
  if (mode === "historical") return item.historical;
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
      title: `N°${item.num} — ${pct}${probMode === "combined" ? " pts" : "%"}${
        item.last_draw_ago ? ` — absent ${item.last_draw_ago} tirage(s)` : ""
      }`,
      style: `background:${heatColor(pct, maxPct, isStar)}`,
    });
    const unit = probMode === "combined" ? "pts" : "%";
    cell.appendChild(el("span", { className: "num" }, [String(item.num)]));
    cell.appendChild(el("span", { className: "pct" }, [`${pct}${unit}`]));
    cell.appendChild(
      el("span", { className: "pct-label" }, [
        probMode === "theoretical"
          ? "théorique"
          : probMode === "historical"
            ? "historique"
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

function calcComboScore(balls, stars, ballMap, starMap) {
  const ballScores = balls.map((n) => ballMap[n]?.smart_score || ballMap[n]?.combined / 100 || 0);
  const starScores = stars.map((n) => starMap[n]?.smart_score || starMap[n]?.combined / 100 || 0);
  
  const ballAvg = ballScores.reduce((a, b) => a + b, 0) / balls.length;
  const starAvg = starScores.reduce((a, b) => a + b, 0) / stars.length;
  
  const ballReg = balls.map((n) => ballMap[n]?.regularity || 0);
  const avgReg = ballReg.reduce((a, b) => a + b, 0) / balls.length;
  
  return Math.round((ballAvg * 0.6 + starAvg * 0.3 + avgReg * 10 * 0.1) * 100) / 100;
}

function generateThreeCombinations(scores) {
  if (window.advancedCombos && statsData) {
    return window.advancedCombos.generate(statsData);
  }
  
  const ballMap = Object.fromEntries(scores.balls.map((b) => [b.num, b]));
  const starMap = Object.fromEntries(scores.stars.map((s) => [s.num, s]));
  const usedKeys = new Set();
  const strategies = [
    {
      name: "SMART",
      title: "Score intelligent élevé",
      desc: "Algorithme avancé basé sur smart_score + régularité",
      ballKey: "smart_score",
      starKey: "smart_score",
      ballPool: scores.balls,
      starPool: scores.stars,
    },
    {
      name: "MOMENTUM",
      title: "Tendance forte",
      desc: "Numéros en progression récente",
      ballKey: "combined",
      starKey: "combined",
      ballPool: [...scores.balls].sort((a, b) => b.combined - a.combined).slice(0, 20),
      starPool: [...scores.stars].sort((a, b) => b.combined - a.combined).slice(0, 6),
    },
    {
      name: "ÉQUILIBRE",
      title: "Mix chaud & retard optimisé",
      desc: "Numéros fréquents + absents avec régularité",
      ballKey: "combined",
      starKey: "combined",
      ballPool: [
        ...[...scores.balls].sort((a, b) => (b.smart_score || 0) - (a.smart_score || 0)).slice(0, 15),
        ...[...scores.balls].sort((a, b) => (b.overdue_score || 0) - (a.overdue_score || 0)).slice(0, 10),
      ].filter((v, i, a) => a.findIndex((x) => x.num === v.num) === i),
      starPool: scores.stars,
    },
  ];

  const results = [];

  for (const strat of strategies) {
    let balls, stars, key, tries = 0;
    do {
      balls = weightedPick(strat.ballPool, 5, strat.ballKey);
      stars = weightedPick(strat.starPool, 2, strat.starKey);
      key = comboKey(balls, stars);
      tries++;
    } while (usedKeys.has(key) && tries < 40);

    usedKeys.add(key);
    const score = calcComboScore(balls, stars, ballMap, starMap);
    
    const ballSum = balls.reduce((a, b) => a + b, 0);
    const evenCount = balls.filter((b) => b % 2 === 0).length;
    
    results.push({
      ...strat,
      balls,
      stars,
      score,
      analysis: {
        sum: ballSum,
        even: evenCount,
      },
    });
  }

  return results;
}

function renderComboCard(combo, index) {
  const card = el("div", { className: "combo-card" });
  card.appendChild(el("div", { className: "combo-label" }, [combo.name]));
  card.appendChild(el("h4", {}, [combo.title]));
  card.appendChild(el("p", { className: "combo-desc" }, [combo.desc]));
  const row = el("div", { className: "combo-row" });
  row.appendChild(renderBalls(combo.balls));
  row.appendChild(renderBalls(combo.stars, true));
  card.appendChild(row);
  
  const scoreEl = el("div", { className: "combo-score" });
  scoreEl.appendChild(document.createTextNode(`Score : ${combo.score} `));
  const hint = el("span");
  hint.textContent = "(indice statistique intelligent)";
  scoreEl.appendChild(hint);
  card.appendChild(scoreEl);
  
  if (combo.analysis) {
    const details = el("div", { className: "combo-details" });
    details.innerHTML = `Somme: ${combo.analysis.sum} • ${combo.analysis.even}P/${5 - combo.analysis.even}I${combo.analysis.low ? ` • ${combo.analysis.low}B/${5 - combo.analysis.low}H` : ""}`;
    card.appendChild(details);
  }
  
  return card;
}

function displayThreeCombinations() {
  if (!statsData) return;
  const scores = buildProbabilityScores(statsData);
  const combos = generateThreeCombinations(scores);

  const container = document.getElementById("combo-results");
  const cards = document.getElementById("combo-cards");
  cards.innerHTML = "";
  combos.forEach((c) => cards.appendChild(renderComboCard(c)));
  container.hidden = false;
  container.classList.add("fresh");
  setTimeout(() => container.classList.remove("fresh"), 500);
  container.scrollIntoView({ behavior: "smooth", block: "nearest" });
  lastCombos = combos;
  return combos;
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

function onGenerateClick() {
  if (!statsData) return;
  const btn = document.getElementById("btn-generate-combos");
  btn.disabled = true;
  btn.querySelector(".btn-prob-text").textContent = "Génération…";
  setTimeout(() => {
    displayThreeCombinations();
    btn.disabled = false;
    btn.querySelector(".btn-prob-text").textContent =
      "Générer 3 combinaisons possibles";
  }, 200);
}

function closeProbPanel() {
  const overlay = document.getElementById("prob-overlay");
  overlay.hidden = true;
  document.body.style.overflow = "";
}

function setupProbabilityButton() {
  document.getElementById("btn-generate-combos").addEventListener("click", onGenerateClick);
  document.getElementById("btn-show-prob").addEventListener("click", openProbPanel);
  document.getElementById("btn-close-prob").addEventListener("click", closeProbPanel);
  document.getElementById("prob-overlay").addEventListener("click", (e) => {
    if (e.target.id === "prob-overlay") closeProbPanel();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeProbPanel();
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
