"""Recompute every numeric answer in course/keys/1.8.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""


def coffee(t):
    """Coffee market of lesson 1.1 (Qd = 100 - 2P, Qs = -20 + 4P) with a per-unit tax t."""
    pb = (120 + 4 * t) / 6
    ps = pb - t
    q = 100 - 2 * pb
    assert abs(q - (-20 + 4 * ps)) < 1e-9
    return pb, ps, q


def results():
    r = {}
    # C1: P = 60 - Q, P = 12 + Q/2.
    q = (60 - 12) / 1.5
    p = 60 - q
    r["C1.q"], r["C1.p"] = q, p
    r["C1.cs"], r["C1.ps"] = 0.5 * q * (60 - p), 0.5 * q * (p - 12)

    # C2: P = 120 - 2Q, MC = 40.
    qc, qm = (120 - 40) / 2, (120 - 40) / 4
    pm = 120 - 2 * qm
    r["C2.csc"] = 0.5 * qc * (120 - 40)
    r["C2.cs"] = 0.5 * qm * (120 - pm)
    r["C2.profit"] = (pm - 40) * qm
    r["C2.dwl"] = 0.5 * (qc - qm) * (pm - 40)
    assert r["C2.cs"] + r["C2.profit"] + r["C2.dwl"] == r["C2.csc"]

    # C3: tax 12 in the coffee market.
    pb, ps, q = coffee(12)
    r["C3.pb"], r["C3.ps"], r["C3.q"] = pb, ps, q
    r["C3.rev"], r["C3.dwl"] = 12 * q, 0.5 * 12 * (60 - q)

    # C4: P = 100 - Q, MC = 20 + Q, external cost 10.
    r["C4.q"] = (100 - 20) / 2
    r["C4.qs"] = (100 - 30) / 2
    r["C4.tax"] = 10
    r["C4.dwl"] = 0.5 * 10 * (r["C4.q"] - r["C4.qs"])

    # Q1: tax on buyers gives the same prices as a tax on sellers.
    ps1 = (100 - 12 + 20) / 6
    assert abs(ps1 + 6 - coffee(6)[0]) < 1e-9
    r["Q1.pb"], r["Q1.ps"], r["Q1.q"] = ps1 + 6, ps1, -20 + 4 * ps1

    # Q3: revenue t (60 - 4t/3) is largest at t = 22.5.
    t = 60 / (8 / 3)
    q = coffee(t)[2]
    r["Q3.tmax"], r["Q3.rmax"], r["Q3.dwl"] = t, t * q, 0.5 * t * (60 - q)

    # Q5: bank profit 20L - L^2, external cost 4 per unit.
    r["Q5.lp"], r["Q5.ls"], r["Q5.tax"] = 10, 8, 4
    social = lambda L: 20 * L - L**2 - 4 * L
    r["Q5.dwl"] = social(8) - social(10)
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
