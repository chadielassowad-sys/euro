"""Analyse ultra-avancée des tirages Euromillions - Version Pro."""
import csv
import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from itertools import combinations

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
            day_col = idx.get("jour_de_tirage")
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
                day_name = ""
                if day_col and row[day_col]:
                    day_name = row[day_col].strip()[:2].upper()
                draws.append(
                    {
                        "id": row[id_col],
                        "date": dt,
                        "date_str": dt.strftime("%Y-%m-%d"),
                        "balls": balls,
                        "stars": stars,
                        "jackpot": rapport,
                        "weekday": dt.weekday(),
                        "day_name": day_name,
                    }
                )
    draws.sort(key=lambda d: d["date"])
    return draws


def _sigmoid(x, center=1.0, scale=1.2):
    return 1 / (1 + math.exp(-(x - center) / scale))


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


def enhance_probability_scores(
    balls_freq,
    stars_freq,
    n,
    recent_ball_counts,
    recent_star_counts,
    momentum_balls,
    momentum_stars,
    pair_matrix,
    expected_ball,
    expected_star,
    recent_n,
):
    """Moteur PRO v2 : fusion bayésienne historique + récent + momentum + synergies."""
    max_recent_b = max(recent_ball_counts.values()) if recent_ball_counts else 1
    max_recent_s = max(recent_star_counts.values()) if recent_star_counts else 1

    mom_b = {m["num"]: m["delta"] for m in momentum_balls}
    mom_s = {m["num"]: m["delta"] for m in momentum_stars}
    max_mom_b = max((abs(d) for d in mom_b.values()), default=1) or 1
    max_mom_s = max((abs(d) for d in mom_s.values()), default=1) or 1

    synergy_b = defaultdict(float)
    max_pair = max(pair_matrix.values()) if pair_matrix else 1
    for (a, b), c in pair_matrix.items():
        s = c / max_pair
        synergy_b[a] += s
        synergy_b[b] += s
    max_syn_b = max(synergy_b.values()) if synergy_b else 1

    def apply_pro(items, expected, recent_counts, max_recent, mom_map, max_mom, is_ball):
        std_est = math.sqrt(expected) if expected > 0 else 1.0
        for item in items:
            num = item["num"]
            recent_c = recent_counts.get(num, 0)
            recent_score = recent_c / max_recent if max_recent else 0
            item["recent_pct"] = round(
                (recent_c / (recent_n * (5 if is_ball else 2))) * 100, 2
            ) if recent_n else 0
            item["recent_score"] = round(recent_score, 4)

            delta = mom_map.get(num, 0)
            item["momentum_delta"] = delta
            item["momentum_score"] = round(
                _clamp(0.5 + delta / (2 * max_mom), 0, 1), 4
            )

            z = item["deviation"] / std_est if std_est else 0
            item["freq_z"] = round(z, 3)
            freq_norm = _clamp(0.5 + 0.22 * z, 0.15, 0.85)

            overdue_sig = _sigmoid(item["overdue_score"], center=1.0, scale=0.85)
            item["overdue_sigmoid"] = round(overdue_sig, 4)

            syn = synergy_b.get(num, 0) / max_syn_b if is_ball and max_syn_b else 0
            item["pair_synergy"] = round(syn, 4) if is_ball else 0

            pop = 0.0
            if is_ball:
                if num <= 31:
                    pop += 0.14
                if num % 5 == 0:
                    pop += 0.07
                if num in (7, 11, 13, 17, 19, 23):
                    pop += 0.04
            else:
                if num <= 6:
                    pop += 0.1
            item["popularity_penalty"] = round(pop, 3)
            item["uniqueness_bonus"] = round(1 - min(pop, 0.35), 3)

            pro = (
                freq_norm * 0.20
                + recent_score * 0.24
                + item["momentum_score"] * 0.16
                + overdue_sig * 0.10
                + item["regularity"] * 0.14
                + syn * 0.11
                + item["uniqueness_bonus"] * 0.05
            )
            item["pro_score"] = round(pro, 4)
            item["smart_score"] = round(pro * 2.5, 3)
            item["prob_pct"] = round(pro * 100, 1)

        return items

    apply_pro(
        balls_freq, expected_ball, recent_ball_counts, max_recent_b,
        mom_b, max_mom_b, True,
    )
    apply_pro(
        stars_freq, expected_star, recent_star_counts, max_recent_s,
        mom_s, max_mom_s, False,
    )


def advanced_analysis(draws):
    n = len(draws)
    
    # Compteurs de base
    ball_counts = Counter()
    star_counts = Counter()
    ball_last = {}
    star_last = {}
    ball_gaps = defaultdict(list)
    star_gaps = defaultdict(list)
    
    # Analyses avancées
    consecutive_pairs = Counter()
    triplets = Counter()
    sum_distribution = []
    gap_distribution = []
    parity_patterns = Counter()
    high_low_patterns = Counter()
    decade_distribution = Counter()
    
    # Streaks (hot/cold)
    ball_streaks = defaultdict(lambda: {"current": 0, "max": 0, "last_seen": -1})
    star_streaks = defaultdict(lambda: {"current": 0, "max": 0, "last_seen": -1})
    
    # Par jour de la semaine
    by_weekday = defaultdict(lambda: {"balls": Counter(), "stars": Counter(), "count": 0})
    
    # Patterns récurrents
    combo_history = Counter()
    pair_matrix = defaultdict(int)
    
    # Délais entre apparitions
    ball_intervals = defaultdict(list)
    star_intervals = defaultdict(list)
    
    for i, d in enumerate(draws):
        balls = d["balls"]
        stars = d["stars"]
        
        # Comptage et tracking
        for b in balls:
            ball_counts[b] += 1
            if b in ball_last:
                gap = i - ball_last[b]
                ball_gaps[b].append(gap)
                ball_intervals[b].append(gap)
            ball_last[b] = i
            
        for s in stars:
            star_counts[s] += 1
            if s in star_last:
                gap = i - star_last[s]
                star_gaps[s].append(gap)
                star_intervals[s].append(gap)
            star_last[s] = i
        
        # Jour de la semaine
        wd = d["weekday"]
        by_weekday[wd]["count"] += 1
        for b in balls:
            by_weekday[wd]["balls"][b] += 1
        for s in stars:
            by_weekday[wd]["stars"][s] += 1
        
        # Numéros consécutifs
        for j in range(len(balls) - 1):
            if balls[j + 1] - balls[j] == 1:
                consecutive_pairs[(balls[j], balls[j + 1])] += 1
        
        # Triplets
        if len(balls) >= 3:
            for trip in combinations(balls, 3):
                triplets[trip] += 1
        
        # Somme des boules
        ball_sum = sum(balls)
        sum_distribution.append(ball_sum)
        
        # Écarts (gaps entre les numéros)
        gaps = [balls[j + 1] - balls[j] for j in range(len(balls) - 1)]
        gap_distribution.extend(gaps)
        
        # Parité (pair/impair)
        even_count = sum(1 for b in balls if b % 2 == 0)
        parity_patterns[even_count] += 1
        
        # Haut/Bas (1-25 vs 26-50)
        low_count = sum(1 for b in balls if b <= 25)
        high_low_patterns[low_count] += 1
        
        # Distribution par décade
        for b in balls:
            decade = (b - 1) // 10
            decade_distribution[decade] += 1
        
        # Matrice de paires
        for bi in range(len(balls)):
            for bj in range(bi + 1, len(balls)):
                pair_matrix[(balls[bi], balls[bj])] += 1
        
        # Combo unique
        combo_key = tuple(balls + stars)
        combo_history[combo_key] += 1

    # Calculs statistiques avancés
    expected_ball = n * 5 / 50
    expected_star = n * 2 / 12
    
    def freq_stats(counts, max_num, expected, gaps_dict, last_dict):
        items = []
        for num in range(1, max_num + 1):
            c = counts.get(num, 0)
            pct = (c / (n * (5 if max_num == 50 else 2))) * 100 if n else 0
            
            # Écart-type des intervalles
            intervals = gaps_dict.get(num, [])
            avg_interval = sum(intervals) / len(intervals) if intervals else 0
            std_interval = 0
            if len(intervals) > 1:
                mean = avg_interval
                variance = sum((x - mean) ** 2 for x in intervals) / len(intervals)
                std_interval = variance ** 0.5
            
            last_idx = last_dict.get(num, -1)
            absence = (n - 1 - last_idx) if last_idx >= 0 else n
            
            # Prédiction basique : si absence > moyenne, bonus
            overdue_score = 0
            if avg_interval > 0:
                overdue_score = min(absence / avg_interval, 3)
            
            items.append({
                "num": num,
                "count": c,
                "pct": round(pct, 2),
                "expected": round(expected, 1),
                "deviation": round(c - expected, 1),
                "last_draw_ago": absence,
                "avg_interval": round(avg_interval, 1),
                "std_interval": round(std_interval, 1),
                "overdue_score": round(overdue_score, 2),
                "regularity": round(1 / (std_interval + 1), 3) if std_interval else 0,
            })
        items.sort(key=lambda x: x["count"], reverse=True)
        return items
    
    balls_freq = freq_stats(ball_counts, 50, expected_ball, ball_gaps, ball_last)
    stars_freq = freq_stats(star_counts, 12, expected_star, star_gaps, star_last)

    # Analyses tendances
    recent_n = min(100, n)
    recent = draws[-recent_n:]
    rb, rs = Counter(), Counter()
    for d in recent:
        for b in d["balls"]:
            rb[b] += 1
        for s in d["stars"]:
            rs[s] += 1

    # Momentum (50 derniers vs 50 précédents)
    momentum_n = min(50, n // 2)
    if n >= momentum_n * 2:
        latest = draws[-momentum_n:]
        previous = draws[-momentum_n * 2 : -momentum_n]
        lb, ls = Counter(), Counter()
        pb, ps = Counter(), Counter()
        for d in latest:
            for b in d["balls"]:
                lb[b] += 1
            for s in d["stars"]:
                ls[s] += 1
        for d in previous:
            for b in d["balls"]:
                pb[b] += 1
            for s in d["stars"]:
                ps[s] += 1
        
        momentum_balls = []
        for num in range(1, 51):
            delta = lb.get(num, 0) - pb.get(num, 0)
            if delta != 0:
                momentum_balls.append({"num": num, "delta": delta})
        momentum_balls.sort(key=lambda x: abs(x["delta"]), reverse=True)
        
        momentum_stars = []
        for num in range(1, 13):
            delta = ls.get(num, 0) - ps.get(num, 0)
            if delta != 0:
                momentum_stars.append({"num": num, "delta": delta})
        momentum_stars.sort(key=lambda x: abs(x["delta"]), reverse=True)
    else:
        momentum_balls = []
        momentum_stars = []

    enhance_probability_scores(
        balls_freq,
        stars_freq,
        n,
        rb,
        rs,
        momentum_balls,
        momentum_stars,
        pair_matrix,
        expected_ball,
        expected_star,
        recent_n,
    )

    # Patterns les plus fréquents
    top_consecutive = [
        {"pair": list(p), "count": c} for p, c in consecutive_pairs.most_common(15)
    ]
    
    top_triplets = [
        {"triplet": list(t), "count": c} for t, c in triplets.most_common(20)
    ]
    
    # Analyse par jour
    weekday_names = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    weekday_analysis = {}
    for wd in range(7):
        data = by_weekday[wd]
        if data["count"] > 0:
            top_b = data["balls"].most_common(5)
            top_s = data["stars"].most_common(2)
            weekday_analysis[weekday_names[wd]] = {
                "count": data["count"],
                "top_balls": [{"num": n, "count": c} for n, c in top_b],
                "top_stars": [{"num": n, "count": c} for n, c in top_s],
            }
    
    # Matrice de chaleur des paires
    top_pairs = sorted(pair_matrix.items(), key=lambda x: x[1], reverse=True)[:30]
    pair_network = [
        {"balls": [a, b], "count": c, "strength": round(c / n * 100, 2)}
        for (a, b), c in top_pairs
    ]
    
    # Décades
    decade_stats = {}
    for dec in range(5):
        count = decade_distribution.get(dec, 0)
        decade_stats[f"{dec*10+1}-{(dec+1)*10}"] = {
            "count": count,
            "pct": round(count / (n * 5) * 100, 1) if n else 0,
        }

    avg_sum = sum(sum_distribution) / len(sum_distribution) if sum_distribution else 127
    sum_std = 0
    if len(sum_distribution) > 1:
        mean_s = avg_sum
        sum_std = math.sqrt(
            sum((s - mean_s) ** 2 for s in sum_distribution) / len(sum_distribution)
        )
    mode_parity = parity_patterns.most_common(1)[0][0] if parity_patterns else 2
    mode_low = high_low_patterns.most_common(1)[0][0] if high_low_patterns else 2

    return {
        "meta": {
            "total_draws": n,
            "probability_engine": "pro_v2",
            "first_date": draws[0]["date_str"] if draws else None,
            "last_date": draws[-1]["date_str"] if draws else None,
            "last_draw": {
                "id": draws[-1]["id"],
                "date": draws[-1]["date_str"],
                "balls": draws[-1]["balls"],
                "stars": draws[-1]["stars"],
                "jackpot": draws[-1]["jackpot"],
            } if draws else None,
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        },
        "balls": {
            "frequencies": balls_freq,
            "hot": sorted(balls_freq, key=lambda x: x["pro_score"], reverse=True)[:10],
            "cold": sorted(balls_freq, key=lambda x: x["count"])[:10],
            "overdue": sorted(balls_freq, key=lambda x: x["last_draw_ago"], reverse=True)[:10],
            "regular": sorted(balls_freq, key=lambda x: x["regularity"], reverse=True)[:10],
            "expected_per_number": round(expected_ball, 1),
        },
        "stars": {
            "frequencies": stars_freq,
            "hot": sorted(stars_freq, key=lambda x: x["pro_score"], reverse=True)[:5],
            "cold": sorted(stars_freq, key=lambda x: x["count"])[:5],
            "overdue": sorted(stars_freq, key=lambda x: x["last_draw_ago"], reverse=True)[:5],
            "regular": sorted(stars_freq, key=lambda x: x["regularity"], reverse=True)[:5],
            "expected_per_number": round(expected_star, 1),
        },
        "recent_100": {
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
        "momentum": {
            "balls": momentum_balls[:15],
            "stars": momentum_stars[:6],
            "explanation": "Delta = différence entre les 50 derniers et les 50 précédents",
        },
        "pairs": pair_network,
        "consecutive_pairs": top_consecutive,
        "triplets": top_triplets,
        "patterns": {
            "avg_sum_balls": round(avg_sum, 1),
            "min_sum": min(sum_distribution) if sum_distribution else 0,
            "max_sum": max(sum_distribution) if sum_distribution else 0,
            "sum_std": round(sum_std, 1),
            "optimal_sum_range": [
                round(avg_sum - sum_std),
                round(avg_sum + sum_std),
            ],
            "optimal_parity": mode_parity,
            "optimal_low_count": mode_low,
            "sum_distribution": dict(Counter([s // 10 * 10 for s in sum_distribution]).most_common()),
            "avg_gap": round(sum(gap_distribution) / len(gap_distribution), 1) if gap_distribution else 0,
            "parity_distribution": {str(k): v for k, v in sorted(parity_patterns.items())},
            "high_low_distribution": {str(k): v for k, v in sorted(high_low_patterns.items())},
            "decade_stats": decade_stats,
        },
        "weekday_analysis": weekday_analysis,
        "history": [
            {
                "id": d["id"],
                "date": d["date_str"],
                "balls": d["balls"],
                "stars": d["stars"],
                "jackpot": d["jackpot"],
            }
            for d in draws[-50:][::-1]
        ],
    }


def main():
    draws = load_draws()
    stats = advanced_analysis(draws)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(f"✓ Analyse avancée : {stats['meta']['total_draws']} tirages")
    print(f"✓ {len(stats['pairs'])} paires analysées")
    print(f"✓ {len(stats['triplets'])} triplets identifiés")
    print(f"✓ Score intelligent calculé pour chaque numéro")
    print(f"✓ Fichier : {OUTPUT}")


if __name__ == "__main__":
    main()
