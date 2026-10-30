"""Recompute every numeric answer in course/keys/E0.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""
from math import erfc, log, sqrt


def norm_sf(z):
    return 0.5 * erfc(z / sqrt(2))


def results():
    r = {}
    # Q1: sigma_A 25, sigma_B 10; counterexample rho = 0.2 with 10% in A.
    sa, sb, rho, w = 25, 10, 0.2, 0.1
    var = w**2 * sa**2 + (1 - w) ** 2 * sb**2 + 2 * w * (1 - w) * rho * sa * sb
    assert rho < sb / sa and sqrt(var) < sb
    r["Q1.var"] = var
    r["Q1.sd"] = sqrt(var)

    # Q3: +20% or -20% with equal probability: expected simple return 0, expected log return < 0.
    r["Q3.mlog"] = (log(1.2) + log(0.8)) / 2

    # Q5: 12 payments of 1,000 at the end of each month vs 11,400 cash; savings at 4.8% APR monthly.
    i = 0.048 / 12
    pv = 1000 * (1 - (1 + i) ** -12) / i
    assert pv > 11400  # paying cash is better
    r["Q5.pv"] = pv
    pv8 = 1000 * (1 - 1.008**-12) / 0.008  # the given monthly rate of 0.8%
    assert abs(pv8 - 11400) < 2  # so 0.8% is (almost exactly) the implied monthly rate
    r["Q5.pv8"] = pv8
    r["Q5.ear"] = 100 * (1.008**12 - 1)
    r["Q5.naive"] = 100 * 600 / 11400

    # Q6: slope 1.2, sigma_x 5, sigma_y 7.5; hedge y - 1.2 x.
    b, sx, sy = 1.2, 5, 7.5
    cov = b * sx**2
    hedged = sy**2 - 2 * b * cov + b**2 * sx**2
    r2 = cov**2 / (sx**2 * sy**2)
    assert abs(hedged - (1 - r2) * sy**2) < 1e-9
    r["Q6.cov"] = cov
    r["Q6.sd"] = sqrt(hedged)
    r["Q6.r2"] = r2
    r["Q6.naive"] = sy - b * sx

    # Q7: p = MC = q / 10 gives q = 10 p; surplus 5 p^2 must cover the stall fee of 50.
    p = sqrt(50 / 5)
    r["Q7.p"] = p
    r["Q7.q"] = 10 * p
    r["Q7.wrong"] = sqrt((50 + 600 / 30) / 5)  # permit spread over 30 days (wrong)

    # Q8: A pays 1,000,000 in 30 years; B is a perpetuity of 40,000.
    zero = lambda rate: 1e6 / (1 + rate) ** 30
    perp = lambda rate: 40000 / rate
    r["Q8.a4"] = 100 * (zero(0.05) / zero(0.04) - 1)
    r["Q8.b4"] = 100 * (perp(0.05) / perp(0.04) - 1)
    r["Q8.near4"] = 100 * (1 - 1.04**-30)
    r["Q8.far4"] = 100 * 1.04**-30
    r["Q8.a2"] = 100 * (zero(0.03) / zero(0.02) - 1)
    r["Q8.b2"] = 100 * (perp(0.03) / perp(0.02) - 1)
    r["Q8.far2"] = 100 * 1.02**-30
    assert r["Q8.a4"] < r["Q8.b4"] and r["Q8.b2"] < r["Q8.a2"]  # the conclusion flips

    # Q9: excess return sd 8, true mean 2, 10 years; two-sided test, P(|t| > 1.96).
    se = 8 / sqrt(10)
    cut = 1.96 * se
    z = (cut - 2) / se
    r["Q9.se"] = se
    r["Q9.cut"] = cut
    r["Q9.z"] = z
    z2 = (cut + 2) / se  # lower tail: sample mean below -cut
    r["Q9.z2"] = z2
    r["Q9.prob"] = 100 * (norm_sf(z) + norm_sf(z2))  # two-sided test
    r["Q9.years"] = (1.96 * 8 / 2) ** 2  # critical value equals the true mean: 50% chance
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
