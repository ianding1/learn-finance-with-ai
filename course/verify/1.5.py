"""Recompute every numeric answer in course/keys/1.5.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""
from math import sqrt


def cost(q):
    return 72 + q**3 - 10 * q**2 + 40 * q


def mc(q):
    return 3 * q * q - 20 * q + 40


def bisect(f, lo, hi):
    for _ in range(200):
        mid = (lo + hi) / 2
        if (f(lo) < 0) == (f(mid) < 0):
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def results():
    r = {}
    r["C1.mp4"] = 2 / sqrt(4)
    r["C1.mp16"] = 2 / sqrt(16)
    r["C1.q16"] = 4 * sqrt(16)

    r["C2.a"] = 2**0.9
    r["C2.b"] = 2**1.5

    r["C3.mc"] = mc(4)
    r["C3.avc"] = (cost(4) - 72) / 4
    r["C3.atc"] = cost(4) / 4

    q = (20 + sqrt(400 - 12 * (40 - 20))) / 6
    r["C4.q"], r["C4.profit"] = q, 20 * q - cost(q)

    qs = bisect(lambda q: 2 * q - 10, 0.1, 20)  # minimum of AVC
    r["Q3.qs"], r["Q3.shut"] = qs, qs * qs - 10 * qs + 40
    qb = bisect(lambda q: 2 * q - 10 - 72 / q**2, 1, 20)  # minimum of ATC
    r["Q3.qb"], r["Q3.be"] = qb, cost(qb) / qb

    r["Q4.n0"] = (1000 - 10 * r["Q3.be"]) / qb
    r["Q4.n1"] = (1300 - 10 * r["Q3.be"]) / qb
    q = bisect(lambda q: 120 * q - (1300 - 10 * mc(q)), 5, 10)
    r["Q4.q_sr"], r["Q4.p_sr"] = q, mc(q)

    r["Q5.acc"] = 300 - 220
    r["Q5.econ"] = 300 - 220 - 70 - 200 * 0.06

    L = 40 / 2  # K = 4L, Q = 2L
    r["Q6.L"], r["Q6.K"] = L, 4 * L
    r["Q6.cost"] = 16 * L + 4 * 4 * L
    r["Q6.ac"] = r["Q6.cost"] / 40
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
