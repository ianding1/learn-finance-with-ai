"""Recompute every numeric answer in course/keys/1.1.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""


def equilibrium(a_d, b_d, a_s, b_s):
    """Demand Q = a_d - b_d P, supply Q = a_s + b_s P."""
    p = (a_d - a_s) / (b_d + b_s)
    return p, a_d - b_d * p


def results():
    r = {}
    p, q = equilibrium(120, 3, -10, 2)
    r["C1.p"], r["C1.q"] = p, q
    r["C1.gap"] = (120 - 3 * 20) - (2 * 20 - 10)

    p, q = equilibrium(100, 2, -50, 4)
    r["C2.p"], r["C2.q"] = p, q

    q = 100 - 2 * 30
    r["C3.q"] = q
    r["C3.e"] = -2 * 30 / q
    r["C3.dq"] = 1.5 * 2

    r["C4.ei"] = -3 / 10
    r["C4.ex"] = 4 / 10

    e = lambda P: -2 * P / (100 - 2 * P)
    r["Q1.e10"], r["Q1.e25"], r["Q1.e40"] = e(10), e(25), e(40)

    P = 100 / 4
    r["Q2.p"], r["Q2.q"] = P, 100 - 2 * P
    r["Q2.r"] = P * (100 - 2 * P)
    r["Q2.e"] = e(P)

    p, q = equilibrium(130, 2, 10, 4)
    r["Q3.p"], r["Q3.q"] = p, q

    r["Q4.price_up"] = (0.8**-2 - 1) * 100
    r["Q4.rev_up"] = (0.8**-2 * 0.8 - 1) * 100

    r["Q5.up"] = (-20 / 120) / (1 / 4)
    r["Q5.down"] = (20 / 100) / (-1 / 5)
    r["Q5.mid"] = (-20 / 110) / (1 / 4.5)

    r["Q6.e"] = -5 / 10
    r["Q6.rev"] = (1.1 * 0.95 - 1) * 100
    r["Q6.dq"] = -0.5 * 10 + 0.3 * 10
    r["Q6.rev2"] = (1.1 * 0.98 - 1) * 100
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
