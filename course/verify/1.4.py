"""Recompute every numeric answer in course/keys/1.4.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""
from math import exp, log, sqrt


def ce(gamma, outcomes, probs):
    """Certainty equivalent under CRRA utility with relative risk aversion gamma."""
    if abs(gamma - 1) < 1e-12:
        return exp(sum(p * log(w) for w, p in zip(outcomes, probs)))
    return sum(p * w ** (1 - gamma) for w, p in zip(outcomes, probs)) ** (1 / (1 - gamma))


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
    r["C1.eu"] = 0.5 * sqrt(64) + 0.5 * sqrt(16)
    r["C1.ce"] = r["C1.eu"] ** 2
    r["C1.rp"] = 40 - r["C1.ce"]

    r["C2.r"] = 1.0  # W * (1/W) for log utility

    c = ce(3, [150, 50], [0.5, 0.5])
    r["C3.ce"], r["C3.rp"] = c, 100 - c
    r["C3.approx"] = 0.5 * 3 * 0.5**2 * 100

    r["C4.loss"] = 0.05 * 20
    r["C4.ce"] = ce(1, [50, 30], [0.95, 0.05])
    r["C4.pmax"] = 50 - r["C4.ce"]

    r["Q1.ce"] = ce(1, [112, 90], [0.5, 0.5])

    r["Q4.elog"] = 0.5 * log(1.5) + 0.5 * log(0.6)
    f = bisect(lambda f: 0.5 * 0.5 / (1 + 0.5 * f) - 0.5 * 0.4 / (1 - 0.4 * f), 0.0, 2.0)
    r["Q4.f"] = f
    r["Q4.g"] = (0.5 * log(1 + 0.5 * f) + 0.5 * log(1 - 0.4 * f)) * 100

    sd = 20 * sqrt(0.05 * 0.95)
    r["Q5.sd"] = sd
    r["Q5.sdavg"] = sd / sqrt(10_000)
    r["Q5.z"] = (1.1 - 1) / round(sd / 100, 4)

    r["Q6.gamma"] = bisect(lambda g: ce(g, [5, 15], [0.5, 0.5]) - 8, 1.0001, 20)
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
