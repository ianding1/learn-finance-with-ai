"""Recompute every numeric answer in course/keys/E0.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""
from math import log, sqrt
from statistics import NormalDist, mean

Phi = NormalDist().cdf


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

    # Q3: A in {-10, 0, 10} equally likely, B = 0.1 A^2.
    A = [-10, 0, 10]
    B = [0.1 * a * a for a in A]
    ma, mb = mean(A), mean(B)
    r["Q3.cov"] = sum((a - ma) * (b - mb) for a, b in zip(A, B)) / 3

    # Q4: estimates 10% and 4%, both SE 2, independent: test the difference.
    se_d = sqrt(2**2 + 2**2)
    r["Q4.se_d"] = se_d
    r["Q4.t"] = (10 - 4) / se_d

    # Q5: slope of y on x is 2 and R^2 = 0.5; the product of the two slopes is r^2 = R^2.
    r["Q5.d"] = 0.5 / 2

    # Q6: withdrawals of 60,000 at the start of each year for 25 years; 6% nominal, monthly.
    i = 0.005
    R = (1 + i) ** 12 - 1
    pv = 60_000 * (1 - (1 + R) ** -25) / R * (1 + R)
    r["Q6.ear"] = 100 * R
    r["Q6.pv"] = pv
    # (b) 50,000 today plus 400 at the end of each month; years of 60,000 at the start of each year.
    fv = 50_000 * (1 + i) ** 360 + 400 * ((1 + i) ** 360 - 1) / i
    r["Q6.fv"] = fv
    r["Q6.n"] = -log(1 - fv * R / (60_000 * (1 + R))) / log(1 + R)
    fv0 = 50_000 * (1 + i) ** 360
    r["Q6.c"] = (pv - fv0) * i / ((1 + i) ** 360 - 1)  # deposit needed for all 25 withdrawals
    # (c) growing perpetuity with the first payment today.
    r["Q6.w"] = pv * (R - 0.02) / (1 + R)
    r["Q6.w3"] = pv * (R - 0.03) / (1 + R)

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

    # Q8: sigma_A 24, sigma_B 16; the minimum variance is 216 with both weights positive.
    sa, sb = 24, 16
    wstar = lambda rho: (sb**2 - rho * sa * sb) / (sa**2 + sb**2 - 2 * rho * sa * sb)
    minvar = lambda rho: sa**2 * sb**2 * (1 - rho**2) / (sa**2 + sb**2 - 2 * rho * sa * sb)
    # 216 (832 - 768 rho) = 147456 (1 - rho^2)  ->  quadratic in rho
    A, B, C = sa**2 * sb**2, -216 * 2 * sa * sb, 216 * (sa**2 + sb**2) - sa**2 * sb**2
    disc = sqrt(B * B - 4 * A * C)
    roots = [(-B + disc) / (2 * A), (-B - disc) / (2 * A)]
    rho = next(x for x in roots if 0 < wstar(x) < 1)
    assert abs(minvar(rho) - 216) < 1e-9
    r["Q8.rho"] = rho
    r["Q8.w"] = 100 * wstar(rho)
    r["Q8.w0"] = 100 * wstar(0)
    r["Q8.threshold"] = sb / sa

    # Q9: a report gives median 575.5 and mean 862.8 after 25 years for 100 invested.
    n = 25
    m = log(575.5 / 100)
    s = sqrt(2 * log(862.8 / 575.5))
    r["Q9.mu"] = 100 * m / n
    r["Q9.sigma"] = 100 * s / sqrt(n)
    m, s = 1.75, 0.9  # the rounded values used in the answer
    r["Q9.p25"] = 100 * Phi(-m / s)
    r["Q9.below"] = 100 * Phi((s**2 / 2) / s)

    # Q10: a = 0.4, b = 1.3, residual sd 5.75; market mean 1%.
    sd_e = 5.75
    pred = 0.4 + 1.3 * 4
    r["Q10.gap"] = 0.4 + (1.3 - 1) * 1  # fund minus market at the average market return
    r["Q10.gap_down"] = 0.4 + (1.3 - 1) * -4
    r["Q10.pred"] = pred
    r["Q10.lo"] = pred - 1.96 * sd_e
    r["Q10.hi"] = pred + 1.96 * sd_e
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
