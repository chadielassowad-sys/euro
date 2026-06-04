"""Analyse statistique complète des tirages Euromillions."""
import csv
import json
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
EXTRACTED = BASE / "extracted"
OUTPUT = BASE / "site" / "data" / "stats.json"

CSV_FILES = [
    EXTRACTED / "euromillions" / "euromillions.csv",
    EXTRACTED / "euromillions_2" / "euromillions_2.csv",
    EXTRACTED / "euromillions_3" / "euromillions_3.csv",
    EXTRACTED / "euromillions_4" / "euromillions_4.csv",
    EXTRACTED / "euromillions_201902" / "euromillions_201902.csv",
    EXTRACTED / "euromillions_202002" / "euromillions_202002.csv",
]


def parse_date(s):
    s = s.strip()
    if re.match(r"^\d{8}$", s):
        return datetime.strptime(s, "%Y%m%d")
    if "/" in s:
        d, m, y = s.split("/")
        if len(y) == 2:
            y = ("20" if int(y) < 50 else "19") + y
        return datetime(int(y), int(m), int(d))
    return None


def load_draws():
    draws = []
    for path in CSV_FILES:
        if not path.exists():
            continue
        with open(path, encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f, delimiter=";")
            header = next(reader)
            idx = {h: i for i, h in enumerate(header)}
            b_cols = [idx[f"boule_{i}"] for i in range(1, 6)]
            e_cols = [idx["etoile_1"], idx["etoile_2"]]
            date_col = idx["date_de_tirage"]
            id_col = idx["annee_numero_de_tirage"]
            rapport_col = idx.get("rapport_du_rang1") or idx.get(
                "rapport_du_rang1_Euro_Millions"
            )

            for row in reader:
                if len(row) <= max(b_cols + e_cols):
                    continue
                try:
                    balls = sorted(int(row[c]) for c in b_cols)
                    stars = sorted(int(row[c]) for c in e_cols)
                except (ValueError, IndexError):
                    continue
                dt = parse_date(row[date_col])
                if not dt:
                    continue
                rapport = 0
                if rapport_col is not None and row[rapport_col]:
                    try:
                        rapport = float(
                            str(row[rapport_col]).replace(",", ".").replace(" ", "")
                        )
                    except ValueError:
                        pass
                draws.append(
                    {
                        "id": row[id_col],
                        "date": dt.strftime("%Y-%m-%d"),
                        "balls": balls,
                        "stars": stars,
                        "jackpot": rapport,
                    }
                )
    draws.sort(key=lambda d: d["date"])
    return draws


def analyze(draws):
    n = len(draws)
    ball_counts = Counter()
    star_counts = Counter()
    ball_last = {}
    star_last = {}
    pair_counts = Counter()
    sums = []
    even_counts = []
    jackpots_won = 0
    by_year = defaultdict(lambda: {"draws": 0, "balls": Counter(), "stars": Counter()})

    for i, d in enumerate(draws):
        for b in d["balls"]:
            ball_counts[b] += 1
            ball_last[b] = i
        for s in d["stars"]:
            star_counts[s] += 1
            star_last[s] = i
        for a, b in zip(d["balls"], d["balls"][1:]):
            if b - a == 1:
                pass
        for bi in range(len(d["balls"])):
            for bj in range(bi + 1, len(d["balls"])):
                pair_counts[(d["balls"][bi], d["balls"][bj])] += 1

        ball_sum = sum(d["balls"])
        sums.append(ball_sum)
        even_counts.append(sum(1 for b in d["balls"] if b % 2 == 0))
        if d["jackpot"] > 1_000_000:
            jackpots_won += 1

        year = d["date"][:4]
        by_year[year]["draws"] += 1
        for b in d["balls"]:
            by_year[year]["balls"][b] += 1
        for s in d["stars"]:
            by_year[year]["stars"][s] += 1

    expected_ball = n * 5 / 50
    expected_star = n * 2 / 12

    def freq_table(counts, max_num, expected):
        items = []
        for num in range(1, max_num + 1):
            c = counts.get(num, 0)
            pct = (c / (n * (5 if max_num == 50 else 2))) * 100 if n else 0
            items.append(
                {
                    "num": num,
                    "count": c,
                    "pct": round(pct, 2),
                    "expected": round(expected, 1),
                    "deviation": round(c - expected, 1),
                    "last_draw_ago": (n - 1 - ball_last.get(num, -1))
                    if max_num == 50
                    else (n - 1 - star_last.get(num, -1)),
                }
            )
        items.sort(key=lambda x: x["count"], reverse=True)
        return items

    balls_freq = freq_table(ball_counts, 50, expected_ball)
    stars_freq = freq_table(star_counts, 12, expected_star)

    recent_n = min(200, n)
    recent = draws[-recent_n:]
    rb, rs = Counter(), Counter()
    for d in recent:
        for b in d["balls"]:
            rb[b] += 1
        for s in d["stars"]:
            rs[s] += 1

    top_pairs = [
        {"balls": [a, b], "count": c}
        for (a, b), c in pair_counts.most_common(25)
    ]

    avg_sum = sum(sums) / len(sums) if sums else 0
    even_dist = Counter(even_counts)

    return {
        "meta": {
            "total_draws": n,
            "first_date": draws[0]["date"] if draws else None,
            "last_date": draws[-1]["date"] if draws else None,
            "last_draw": draws[-1] if draws else None,
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        },
        "balls": {
            "frequencies": balls_freq,
            "hot": balls_freq[:10],
            "cold": sorted(balls_freq, key=lambda x: x["count"])[:10],
            "overdue": sorted(balls_freq, key=lambda x: x["last_draw_ago"], reverse=True)[
                :10
            ],
            "expected_per_number": round(expected_ball, 1),
        },
        "stars": {
            "frequencies": stars_freq,
            "hot": stars_freq[:5],
            "cold": sorted(stars_freq, key=lambda x: x["count"])[:5],
            "overdue": sorted(stars_freq, key=lambda x: x["last_draw_ago"], reverse=True)[
                :5
            ],
            "expected_per_number": round(expected_star, 1),
        },
        "recent_200": {
            "draws": recent_n,
            "balls": sorted(
                [{"num": i, "count": rb.get(i, 0)} for i in range(1, 51)],
                key=lambda x: x["count"],
                reverse=True,
            )[:15],
            "stars": sorted(
                [{"num": i, "count": rs.get(i, 0)} for i in range(1, 13)],
                key=lambda x: x["count"],
                reverse=True,
            )[:6],
        },
        "pairs": top_pairs,
        "patterns": {
            "avg_sum_balls": round(avg_sum, 1),
            "min_sum": min(sums) if sums else 0,
            "max_sum": max(sums) if sums else 0,
            "even_distribution": {
                str(k): v for k, v in sorted(even_dist.items())
            },
            "jackpots_over_1m": jackpots_won,
        },
        "by_year": {
            y: {
                "draws": data["draws"],
                "top_ball": data["balls"].most_common(1)[0][0]
                if data["balls"]
                else None,
                "top_star": data["stars"].most_common(1)[0][0]
                if data["stars"]
                else None,
            }
            for y, data in sorted(by_year.items())
        },
        "history": draws[-50:][::-1],
        "suggested_combinations": build_suggestions(balls_freq, stars_freq, rb, rs),
    }


def build_suggestions(balls_freq, stars_freq, recent_balls, recent_stars):
    """Combinaisons indicatives (statistiques, pas prédictions)."""
    hot_b = [x["num"] for x in balls_freq[:8]]
    cold_b = [x["num"] for x in sorted(balls_freq, key=lambda x: x["count"])[:8]]
    overdue_b = sorted(balls_freq, key=lambda x: x["last_draw_ago"], reverse=True)[:8]
    hot_s = [x["num"] for x in stars_freq[:4]]
    recent_hot_b = sorted(
        range(1, 51), key=lambda x: recent_balls.get(x, 0), reverse=True
    )[:10]

    def pick(nums, n=5):
        return sorted(nums[:n])

    return [
        {
            "name": "Numéros chauds",
            "desc": "Les 5 boules les plus sorties sur tout l'historique",
            "balls": pick(hot_b),
            "stars": pick(hot_s, 2),
        },
        {
            "name": "Mix chaud + froid",
            "desc": "3 numéros fréquents + 2 numéros rares",
            "balls": pick(hot_b[:3] + cold_b[:2]),
            "stars": pick(hot_s, 2),
        },
        {
            "name": "Numéros en retard",
            "desc": "Boules absentes depuis le plus longtemps",
            "balls": pick([x["num"] for x in overdue_b]),
            "stars": pick(
                [x["num"] for x in sorted(stars_freq, key=lambda x: x["last_draw_ago"], reverse=True)],
                2,
            ),
        },
        {
            "name": "Tendance récente",
            "desc": "Top 200 derniers tirages",
            "balls": pick(recent_hot_b),
            "stars": pick(
                sorted(range(1, 13), key=lambda x: recent_stars.get(x, 0), reverse=True),
                2,
            ),
        },
    ]


def main():
    draws = load_draws()
    stats = analyze(draws)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(f"OK: {stats['meta']['total_draws']} tirages -> {OUTPUT}")


if __name__ == "__main__":
    main()
