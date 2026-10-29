"""Recompute every numeric answer in course/keys/0.2.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""
from math import log


def results():
    r = {}
    # C1: pi(q) = 60q - 3q^2 - F
    q = 60 / 6
    r["C1.q"] = q
    r["C1.profit"] = 60 * q - 3 * q**2 - 50
    r["C1.profit_new"] = 60 * q - 3 * q**2 - 200

    # C2: f = -x^2 - y^2 + 4x + 6y
    x, y = 2, 3
    r["C2.x"], r["C2.y"] = x, y
    r["C2.f"] = -(x**2) - y**2 + 4 * x + 6 * y

    # C3: U = xy, px = 1, py = 2, M = 40 -> x = M / (2 px), y = M / (2 py), lambda = M / (2 px py)
    px, py, M = 1, 2, 40
    r["C3.x"] = M / (2 * px)
    r["C3.y"] = M / (2 * py)
    r["C3.lambda"] = M / (2 * px * py)

    # C4: U = ln x + y, px = 2, py = 4, M = 3
    px, py, M = 2, 4, 3
    lam = 1 / py
    x_lag = 1 / (px * lam)
    r["C4.lambda"] = lam
    r["C4.x_lag"] = x_lag
    r["C4.y_lag"] = (M - px * x_lag) / py
    r["C4.x"] = M / px
    r["C4.u"] = log(M / px)

    # Q3: p = 50, C = q^2 + 10q + 50
    q = (50 - 10) / 2
    r["Q3.q"] = q
    r["Q3.profit"] = 50 * q - (q**2 + 10 * q + 50)

    # Q4: U = x^2 y, px = 2, py = 1, M = 30 -> x = y
    x = 30 / 3
    r["Q4.x"] = x
    r["Q4.y"] = x
    r["Q4.lambda"] = x**2
    r["Q4.u"] = x**2 * x
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
