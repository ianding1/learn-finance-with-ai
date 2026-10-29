"""Recompute every numeric answer in course/keys/1.6.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""
from math import sqrt


def cournot(n, a=100, b=1, c=20):
    q = (a - c) / ((n + 1) * b)
    Q = n * q
    return q, Q, a - b * Q


def results():
    r = {}
    # C1: P = 120 - 2Q, MC = 40, MR = 120 - 4Q.
    q = (120 - 40) / 4
    p = 120 - 2 * q
    r["C1.q"], r["C1.p"], r["C1.profit"] = q, p, (p - 40) * q
    r["C1.lerner"] = (p - 40) / p

    # C2: A: P = 100 - Q; B: P = 30 - Q/2; MC = 10.
    qa = (100 - 10) / 2
    qb = 30 - 10
    r["C2.qa"], r["C2.pa"] = qa, 100 - qa
    r["C2.qb"], r["C2.pb"] = qb, 30 - qb / 2

    r["C3.p1"] = cournot(1)[2]
    r["C3.p2"] = cournot(2)[2]
    _, Q10, P10 = cournot(10)
    r["C3.p10"], r["C3.q10"] = P10, Q10

    r["C4.price"] = 120

    r["Q2.p4"] = cournot(4)[2]

    q, _, P = cournot(2)
    r["Q3.qc"], r["Q3.pic"] = q, (P - 20) * q
    r["Q3.pim"] = (60 - 20) * 40 / 2
    q1 = (80 - 20) / 2
    P = 100 - q1 - 20
    r["Q3.qd"], r["Q3.pid"], r["Q3.pio"] = q1, (P - 20) * q1, (P - 20) * 20

    # Q4: uniform price; compare P <= 30 (both groups) and P > 30 (only A).
    grid = [10 + i / 100 for i in range(9001)]

    def profit(P):
        Q = max(100 - P, 0) + max(60 - 2 * P, 0)
        return (P - 10) * Q

    best = max(grid, key=profit)
    r["Q4.pu"], r["Q4.piu"] = best, profit(best)
    r["Q4.pid"] = (r["C2.pa"] - 10) * qa + (r["C2.pb"] - 10) * qb

    r["Q5.p1"] = 30 / (1 - 1 / 1.5)
    r["Q5.p2"] = 30 / (1 - 1 / 4)

    qm = (100 - 10) / 2
    r["Q6.qm"], r["Q6.pm"] = qm, 100 - qm
    r["Q6.pim"] = (100 - qm - 10) * qm - 900
    r["Q6.loss"] = (10 - 10) * 90 - 900
    qa6 = (90 + sqrt(90**2 - 4 * 900)) / 2
    r["Q6.qa"], r["Q6.pa"] = qa6, 100 - qa6
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
