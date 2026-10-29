"""Recompute every numeric answer in course/keys/1.3.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""


def log_c1(y1, y2, r, beta):
    """Log utility: c1 = W / (1 + beta) with W = y1 + y2 / (1 + r)."""
    return (y1 + y2 / (1 + r)) / (1 + beta)


def results():
    r = {}
    r["C1.w"] = 60 + 33 / 1.1
    r["C1.c2max"] = 60 * 1.1 + 33
    r["C1.c2a"] = (60 - 40) * 1.1 + 33
    r["C1.c2b"] = (60 - 70) * 1.1 + 33

    r["C2.ratio"] = 0.9 * 1.05
    c1 = 100 / (1 + 0.9)
    r["C2.c1"], r["C2.c2"] = c1, 0.945 * c1

    c1 = log_c1(80, 22, 0.20, 0.95)
    r["C3.c1"], r["C3.s"] = c1, 80 - c1

    r["C4.ex_ante"] = (1.06 / 1.04 - 1) * 100
    r["C4.ex_post"] = (1.06 / 1.07 - 1) * 100

    c1 = log_c1(20, 88, 0.10, 0.95)
    r["Q1.c1"], r["Q1.b"] = c1, c1 - 20

    r["Q3.b10"] = log_c1(30, 99, 0.10, 0.95) - 30
    r["Q3.b20"] = log_c1(30, 99, 0.20, 0.95) - 30

    rr = 1.05 / 1.02 - 1
    r["Q4.r"] = rr * 100
    r["Q4.pv"] = 10_000 / (1 + rr) ** 10
    assert abs(r["Q4.pv"] - 10_000 * 1.02**10 / 1.05**10) < 1e-6
    r["Q4.wrong"] = 10_000 / 1.05**10

    r["Q5.r"] = (1 / 0.96 - 1) * 100
    r["Q5.s"] = 100 - log_c1(100, 0, -0.02, 0.96)

    after = 0.04 * (1 - 0.25)
    r["Q6.real3"] = ((1 + after) / 1.03 - 1) * 100
    r["Q6.real5"] = ((1 + after) / 1.05 - 1) * 100
    r["Q6.pre5"] = (1.04 / 1.05 - 1) * 100
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
