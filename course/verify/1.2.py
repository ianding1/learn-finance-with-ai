"""Recompute every numeric answer in course/keys/1.2.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""
from math import log


def cobb_douglas(M, px):
    """U = xy: x* = M / (2 px)."""
    return M / (2 * px)


def results():
    r = {}
    r["C1.u1"], r["C1.u2"], r["C1.u3"] = 2 * 8, 4 * 4, 3 * 5
    assert log(16) > log(15)
    r["C1.w2"] = 4 + 4

    x, y = 3, 4
    r["C2.mux"], r["C2.muy"] = 2 * x * y, x * x
    r["C2.mrs"] = r["C2.mux"] / r["C2.muy"]

    r["C3.x"] = 100 / (3 + 2)

    p = 0.5
    mc = p * 10 + 1 * 20
    r["C4.xb"] = cobb_douglas(mc, p)
    r["C4.xc"] = cobb_douglas(40, p)
    r["C4.se"] = r["C4.xb"] - 10
    r["C4.ie"] = r["C4.xc"] - r["C4.xb"]

    # Q2: U = x^0.3 y^0.7, px = 3, py = 7, M = 100: spending shares 0.3 and 0.7.
    r["Q2.x"], r["Q2.y"] = 0.3 * 100 / 3, 0.7 * 100 / 7

    r["Q3.y"] = 30 / 1
    r["Q3.x"] = 30 / 1.5
    r["Q3.pstar"] = 2 / 1

    r["Q5.x"] = cobb_douglas(40, 2)
    r["Q5.mc"] = 2 * 10 + 2 * 20
    r["Q5.xs"] = cobb_douglas(r["Q5.mc"], 2)
    r["Q5.se"] = r["Q5.xs"] - 10
    r["Q5.ie"] = 10 - r["Q5.xs"]

    r["Q6.ie"] = -60 * (-0.15) * 0.5
    r["Q6.total"] = -2 + r["Q6.ie"]
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
