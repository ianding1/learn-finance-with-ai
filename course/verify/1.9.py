"""Recompute every numeric answer in course/keys/1.9.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""


def results():
    r = {}
    # C1: buyers pay q * 10,000 + (1 - q) * 4,000; good cars stay at 8,000 or more.
    wtp = lambda q: q * 10000 + (1 - q) * 4000
    r["C1.q"] = (8000 - 4000) / (10000 - 4000)
    r["C1.wtp"] = wtp(0.7)
    assert wtp(0.65) < 8000 < wtp(0.7)

    # C2: expected claims 200 and 800; willingness to pay 300 and 1,000.
    r["C2.p1"] = 0.5 * 200 + 0.5 * 800
    assert r["C2.p1"] > 300  # low-risk people leave
    r["C2.p2"] = 800
    assert r["C2.p2"] <= 1000

    # C3: warranty costs 200 (good) and 7,000 or 5,000 (lemon); price 10,000 with a warranty, 4,000 without.
    r["C3.good"] = 10000 - 200
    r["C3.lemon"] = 10000 - 7000
    r["C3.lemon2"] = 10000 - 5000
    assert r["C3.good"] > 8000 and r["C3.lemon"] < 4000 < r["C3.lemon2"]

    # C4: care costs 50 and lowers the loss probability from 20% to 10%; loss 1,000.
    r["C4.gain"] = (0.2 - 0.1) * 1000
    r["C4.d"] = 50 / (0.2 - 0.1)

    # Q2: 20% of positive returns; safe 5%, risky +40% or -30%.
    r["Q2.safe"] = 0.2 * 5
    r["Q2.risky"] = 0.5 * 0.2 * 40 + 0.5 * 0

    # Q4: profit 10e, effort cost e^2 / 2, share s: e = 10 s; owner (1 - s) 100 s.
    s = 0.5
    e = 10 * s
    r["Q4.e"] = e
    r["Q4.owner"] = (1 - s) * 10 * e
    best = 10 * 10 - 10**2 / 2
    r["Q4.agency"] = best - (10 * e - e**2 / 2)

    # Q5: X: 5% load, 1.0% expenses; Y: 0.05% expenses; 7% gross for 20 years.
    r["Q5.x"] = 95000 * 1.06**20
    r["Q5.y"] = 100000 * 1.0695**20
    r["Q5.gap"] = r["Q5.y"] - r["Q5.x"]
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
