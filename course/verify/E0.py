"""Recompute every numeric answer in course/keys/E0.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""
from math import log, sqrt


def fv_annuity(c, i, n):
    return c * ((1 + i) ** n - 1) / i


def results():
    r = {}
    r["Q1.pv"] = 100 / (0.08 - 0.03)
    r["Q1.pv_due"] = r["Q1.pv"] * 1.08
    r["Q3.sd"] = sqrt(0.25 * 10**2 + 0.25 * 30**2 + 2 * 0.25 * 0.9 * 10 * 30)

    i, n = 0.005, 360
    c = 1_000_000 * i / ((1 + i) ** n - 1)
    r["Q6.payment"] = c
    r["Q6.payment_due"] = c / (1 + i)
    lo, hi = 1e-6, 0.05  # monthly rate
    for _ in range(200):
        mid = (lo + hi) / 2
        if fv_annuity(800, mid, n) < 1_000_000:
            lo = mid
        else:
            hi = mid
    r["Q6.apr"] = 100 * 12 * mid
    r["Q6.years"] = 2 * 72 / 6
    r["Q6.exact"] = log(4) / log(1.06)

    # Q7: p = 60, C = 2q^2 + 20q + 100
    profit = lambda q, extra_unit=0, fee=0: 60 * q - 2 * q**2 - 20 * q - 100 - extra_unit * q - fee
    r["Q7.q"] = 40 / 4
    r["Q7.profit"] = profit(10)
    r["Q7.q_tax"] = (40 - 8) / 4
    r["Q7.profit_tax"] = profit(8, extra_unit=8)
    r["Q7.profit_fee"] = profit(10, fee=300)

    sa, sb = 20, 12
    w_star = lambda rho: (sb**2 - rho * sa * sb) / (sa**2 + sb**2 - 2 * rho * sa * sb)
    w = w_star(0.3)
    r["Q8.w"] = w
    r["Q8.sd"] = sqrt(w**2 * sa**2 + (1 - w) ** 2 * sb**2 + 2 * w * (1 - w) * 0.3 * sa * sb)
    r["Q8.w_unconstrained"] = w_star(0.8)
    r["Q8.threshold"] = sb / sa

    se = 10 / sqrt(10)
    r["Q9.se"] = se
    r["Q9.t"] = 4 / se
    r["Q9.lo"] = 4 - 1.96 * se
    r["Q9.hi"] = 4 + 1.96 * se
    need = (1.96 * 10 / 4) ** 2
    r["Q9.years"] = int(need) + 1 if need != int(need) else need + 1
    r["Q9.median"] = 100 * (1.3 * 0.7) ** 10

    r["Q10.t_a"] = 0.4 / 0.25
    r["Q10.lo"] = 1.3 - 1.96 * 0.2
    r["Q10.hi"] = 1.3 + 1.96 * 0.2
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
