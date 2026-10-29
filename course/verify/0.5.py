"""Recompute every numeric answer in course/keys/0.5.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""


def ols(x, y):
    n = len(x)
    mx, my = sum(x) / n, sum(y) / n
    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
    sxx = sum((a - mx) ** 2 for a in x)
    syy = sum((b - my) ** 2 for b in y)
    b = sxy / sxx
    a = my - b * mx
    ssr = sum((yy - a - b * xx) ** 2 for xx, yy in zip(x, y))
    return a, b, ssr, syy


def results():
    r = {}
    r["C1.fit"] = 2 + 0.8 * 5
    r["C1.resid"] = 4 - r["C1.fit"]

    a, b, ssr, sst = ols([1, 2, 3, 4], [2, 3, 5, 6])
    r["C2.b"], r["C2.a"] = b, a
    r["C4.ssr"], r["C4.sst"], r["C4.r2"] = ssr, sst, 1 - ssr / sst

    r["C3.per_sqft"] = 0.2 * 1000
    r["C3.price"] = 50 + 0.2 * 2000
    r["C3.per_m2"] = 0.2 * 10.76

    r["C5.t"] = 1.2 / 0.5
    r["C5.lo"] = 1.2 - 1.96 * 0.5
    r["C5.hi"] = 1.2 + 1.96 * 0.5

    a, b, ssr, sst = ols([-3, -1, 0, 2, 4, 4], [-2, -2, 1, 3, 6, 4])
    r["Q3.b"], r["Q3.a"], r["Q3.r2"] = b, a, 1 - ssr / sst

    r["Q4.biased"] = 2 + 3 * 2 / 4
    r["Q4.unbiased"] = 2 + 3 * 0 / 4
    r["Q4.negative"] = 2 - 3 * 2 / 4
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
