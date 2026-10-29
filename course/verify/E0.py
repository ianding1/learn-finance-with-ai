"""Recompute every numeric answer in course/keys/E0.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""
from math import log, sqrt
from statistics import mean, stdev


def fv_annuity(c, i, n):
    return c * ((1 + i) ** n - 1) / i


def results():
    r = {}
    # Q1: one asset doubles (+100%), the other halves (-50%), equal weights.
    r["Q1.log_x"] = log(2)
    r["Q1.portfolio"] = 0.5 * 100 + 0.5 * (-50)
    r["Q1.log_p"] = log(1.25)

    # Q2: U = xy, p_x = 2, p_y = 4: x = m/4, y = m/8, so U(m) = m^2 / 32 and lambda = m / 16.
    u = lambda m: m**2 / 32
    r["Q2.u100"] = u(100)
    r["Q2.u200"] = u(200)
    r["Q2.approx"] = (100 / 16) * 100
    r["Q2.actual"] = u(200) - u(100)

    # Q3: A in {-10, 0, 10} equally likely, B = 0.1 A^2.
    A = [-10, 0, 10]
    B = [0.1 * a * a for a in A]
    ma, mb = mean(A), mean(B)
    r["Q3.cov"] = sum((a - ma) * (b - mb) for a, b in zip(A, B)) / 3

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
    fv0 = 50_000 * (1 + i) ** n
    r["Q6.fv_savings"] = fv0
    r["Q6.payment_rest"] = (1_000_000 - fv0) * i / ((1 + i) ** n - 1)

    # Q7: p = 100 - 2q, C = 20q + 200; then unit cost 28.
    def mono(mc):
        q = (100 - mc) / 4
        p = 100 - 2 * q
        return q, p, p * q - mc * q - 200
    q, p, pi = mono(20)
    q2, p2, pi2 = mono(28)
    r.update({"Q7.q": q, "Q7.p": p, "Q7.profit": pi, "Q7.q_new": q2, "Q7.p_new": p2, "Q7.profit_new": pi2, "Q7.rise": p2 - p})

    # Q8: sigma_A 20, sigma_B 10, w* = 0.25 -> back out rho.
    sa, sb, w = 20, 10, 0.25
    # w* = (sb^2 - rho sa sb) / (sa^2 + sb^2 - 2 rho sa sb)
    rho = (sb**2 - w * (sa**2 + sb**2)) / (sa * sb * (1 - 2 * w))
    r["Q8.rho"] = rho
    r["Q8.sd"] = sqrt(w**2 * sa**2 + (1 - w) ** 2 * sb**2 + 2 * w * (1 - w) * rho * sa * sb)
    r["Q8.threshold"] = sb / sa

    x = [8, -2, 6, 12, -4]
    m, s = mean(x), stdev(x)
    se = s / sqrt(len(x))
    d = 1.04**2 / 1.6  # median of A (10 rises, 10 falls) equals B
    r["Q9.d"] = d
    r["Q9.mean_a"] = 100 * ((1.6 + d) / 2) ** 20
    r["Q9.safe"] = 100 * 1.04**20
    r.update({"Q9.mean": m, "Q9.s": s, "Q9.se": se, "Q9.t": m / se, "Q9.t10": m / (s / sqrt(10))})

    r["Q10.t_a"] = 0.4 / 0.25
    r["Q10.lo"] = 1.3 - 1.96 * 0.2
    r["Q10.hi"] = 1.3 + 1.96 * 0.2
    r["Q10.pred"] = 0.4 + 1.3 * 10
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
