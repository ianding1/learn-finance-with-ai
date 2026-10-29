"""Recompute every numeric answer in course/keys/E0.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""
from math import exp, sqrt
from statistics import NormalDist, mean

Phi = NormalDist().cdf


def results():
    r = {}
    # Q1: A pays 200 at the end of year 10, B pays 140 at the end of year 3.
    r["Q1.a5"] = 200 / 1.05**10
    r["Q1.b5"] = 140 / 1.05**3
    r["Q1.a10"] = 200 / 1.1**10
    r["Q1.b10"] = 140 / 1.1**3

    # Q2: U = xy, p_x = 2, p_y = 4: x = M/4, y = M/8, so U*(M) = M^2 / 32 and lambda = M / 16.
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

    # Q4: at least one false positive among 20 independent tests at 5%.
    r["Q4.p"] = 100 * (1 - 0.95**20)

    # Q6: withdrawals of 60,000 at the start of each year for 25 years; 6% nominal, monthly.
    i = 0.005
    R = (1 + i) ** 12 - 1
    pv = 60_000 * (1 - (1 + R) ** -25) / R * (1 + R)
    r["Q6.ear"] = 100 * R
    r["Q6.pv"] = pv
    r["Q6.c"] = pv * i / ((1 + i) ** 360 - 1)
    r["Q6.w"] = pv * (R - 0.02) / (1 + R)  # growing perpetuity, first payment today

    # Q7: p = 100 - 2q, C = cq + F.
    q = lambda c: (100 - c) / 4
    p = lambda c: (100 + c) / 2
    profit = lambda c, F: (100 - c) ** 2 / 8 - F
    r["Q7.q"] = q(20)
    r["Q7.p"] = p(20)
    r["Q7.profit"] = profit(20, 200)
    r["Q7.p_new"] = p(28)
    r["Q7.rise"] = p(28) - p(20)
    r["Q7.c_shut"] = 100 - sqrt(8 * 200)  # profit(c, 200) = 0
    r["Q7.c_sunk"] = 100  # marginal revenue at q = 0

    # Q8: sigma_A 20, sigma_B 10, w* = 0.25 -> back out rho.
    sa, sb, w = 20, 10, 0.25
    rho = (sb**2 - w * (sa**2 + sb**2)) / (sa * sb * (1 - 2 * w))
    r["Q8.rho"] = rho
    r["Q8.sd"] = sqrt(w**2 * sa**2 + (1 - w) ** 2 * sb**2 + 2 * w * (1 - w) * rho * sa * sb)
    r["Q8.threshold"] = sb / sa

    # Q9: yearly log return N(7%, 18%^2), independent; 25 years.
    mu, sd, n = 0.07, 0.18, 25
    m, s = n * mu, sd * sqrt(n)
    r["Q9.p1"] = 100 * Phi(-mu / sd)
    r["Q9.p25"] = 100 * Phi(-m / s)
    r["Q9.median"] = 100 * exp(m)
    r["Q9.mean"] = 100 * exp(m + s**2 / 2)
    r["Q9.below"] = 100 * Phi((s**2 / 2) / s)

    # Q10: a = 0.4 (SE 0.25), b = 1.3 (SE 0.2), R^2 = 0.45, sd of market 4%.
    var_f = 1.3**2 * 4**2 / 0.45
    sd_e = sqrt((1 - 0.45) * var_f)
    pred = 0.4 + 1.3 * 4
    r["Q10.sd_f"] = sqrt(var_f)
    r["Q10.sd_e"] = sd_e
    r["Q10.t_a"] = 0.4 / 0.25
    r["Q10.ilo"] = 0.4 - 1.96 * 0.25
    r["Q10.ihi"] = 0.4 + 1.96 * 0.25
    r["Q10.pred"] = pred
    r["Q10.lo"] = pred - 1.96 * sd_e
    r["Q10.hi"] = pred + 1.96 * sd_e
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
