"""Recompute every numeric answer in course/keys/E0.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""
from math import exp, log, sqrt


def results():
    r = {}
    # Q1: A pays 200 at the end of year 10, B pays 140 at the end of year 3.
    r["Q1.a5"] = 200 / 1.05**10
    r["Q1.b5"] = 140 / 1.05**3
    r["Q1.a10"] = 200 / 1.1**10
    r["Q1.b10"] = 140 / 1.1**3

    # Q2: U = x y^2, p_x = 1, p_y = 3: x = M/3, y = 2M/9, U*(M) = 4M^3/243, lambda = 4M^2/81.
    u = lambda m: (m / 3) * (2 * m / 9) ** 2
    r["Q2.lam"] = 4 * 90**2 / 81
    r["Q2.u90"] = u(90)
    r["Q2.u180"] = u(180)
    r["Q2.gain"] = u(180) - u(90)

    # Q3: estimates 10% and 4%, both SE 2, independent: test the difference.
    se_d = sqrt(2**2 + 2**2)
    r["Q3.se_d"] = se_d
    r["Q3.t"] = (10 - 4) / se_d

    # Q4: slope of y on x is 2 and R^2 = 0.5; the product of the two slopes is r^2 = R^2.
    r["Q4.d"] = 0.5 / 2

    # Q5: withdrawals at the start of each year for 25 years; 6% nominal, monthly.
    i = 0.005
    R = (1 + i) ** 12 - 1
    pv = 60_000 * (1 - (1 + R) ** -25) / R * (1 + R)
    r["Q5.ear"] = 100 * R
    r["Q5.pv"] = pv
    # (b) 25 payments growing 2% a year, the first today: growing annuity due.
    g = 0.02
    factor = (1 + R) / (R - g) * (1 - ((1 + g) / (1 + R)) ** 25)
    r["Q5.w"] = pv / factor

    # Q6: p = 100 - 2q, C = cq + F.
    q = lambda c: (100 - c) / 4
    p = lambda c: (100 + c) / 2
    operating = lambda c: (100 - c) ** 2 / 8  # revenue minus material cost at the optimum
    r["Q6.q"] = q(20)
    r["Q6.p"] = p(20)
    r["Q6.profit"] = operating(20) - 200
    r["Q6.rise"] = p(28) - p(20)
    # (c) the rent of 200 is sunk; c = 70; stopping lets the company sublet for 120.
    r["Q6.q70"] = q(70)
    r["Q6.op"] = operating(70)
    r["Q6.total"] = operating(70) - 200
    r["Q6.stop"] = 120 - 200  # stop and sublet the equipment for 120
    assert r["Q6.stop"] > r["Q6.total"]  # stopping beats producing

    # Q7: sigma_A 24, sigma_B 16; the minimum variance is 216 with both weights positive.
    sa, sb = 24, 16
    wstar = lambda rho: (sb**2 - rho * sa * sb) / (sa**2 + sb**2 - 2 * rho * sa * sb)
    minvar = lambda rho: sa**2 * sb**2 * (1 - rho**2) / (sa**2 + sb**2 - 2 * rho * sa * sb)
    A, B, C = sa**2 * sb**2, -216 * 2 * sa * sb, 216 * (sa**2 + sb**2) - sa**2 * sb**2
    disc = sqrt(B * B - 4 * A * C)
    roots = [(-B + disc) / (2 * A), (-B - disc) / (2 * A)]
    rho = next(x for x in roots if 0 < wstar(x) < 1)
    # Without short selling, a root with w* outside [0, 1] gives a corner (holding only B, variance 256).
    assert abs(minvar(rho) - 216) < 1e-9 and sum(0 <= wstar(x) <= 1 for x in roots) == 1
    r["Q7.rho"] = rho
    r["Q7.w"] = 100 * wstar(rho)

    # Q8: mean of 10-year wealth 236.8 for 100 invested; P(loss after 25 years) = 2.6%.
    # Loss: Phi(-25 mu / (5 sigma)) = 0.026, so mu = 0.388 sigma.
    # Mean: 10 mu + 5 sigma^2 = ln 2.368  ->  5 sigma^2 + 3.88 sigma - ln 2.368 = 0.
    L = log(2.368)
    sigma = (-3.88 + sqrt(3.88**2 + 20 * L)) / 10
    r["Q8.mu"] = 100 * 0.388 * sigma
    r["Q8.sigma"] = 100 * sigma

    # Q9: a = 0.4, b = 1.3, residual sd 5.75; market mean 1%.
    sd_e = 5.75
    pred = 0.4 + 1.3 * 4
    r["Q9.gap"] = 0.4 + (1.3 - 1) * 1
    r["Q9.pred"] = pred
    r["Q9.lo"] = pred - 1.96 * sd_e
    r["Q9.hi"] = pred + 1.96 * sd_e
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
