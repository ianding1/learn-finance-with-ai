"""Recompute every numeric answer in course/keys/0.1.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""


def payment(principal, i, n):
    """Level payment of a loan: the annuity formula solved for C."""
    return principal * i / (1 - (1 + i) ** -n)


def annuity_pv(c, r, n):
    return c / r * (1 - (1 + r) ** -n)


def results():
    r = {}
    r["C1.pv"] = 10_000 / 1.06**5
    r["C2.ear"] = 100 * (1.03**4 - 1)
    r["C3.pv"] = annuity_pv(50, 0.10, 2)
    r["C4.pv"] = 40_000 / 0.04
    r["C5.pv"] = 5_000 / (0.07 - 0.02)

    r["Q3.ear_A"] = 100 * ((1 + 0.05 / 365) ** 365 - 1)
    r["Q3.ear_B"] = 5.10

    c15 = payment(500_000, 0.055 / 12, 180)
    c30 = payment(500_000, 0.06 / 12, 360)
    interest15 = 180 * c15 - 500_000
    interest30 = 360 * c30 - 500_000
    r["Q4.payment"] = c15
    r["Q4.interest"] = interest15
    r["Q4.saving"] = interest30 - interest15

    r["Q5.less"] = 100 * (1 - (1.06 / 1.0695) ** 30)
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
