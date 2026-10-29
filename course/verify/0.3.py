"""Recompute every numeric answer in course/keys/0.3.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""
from math import sqrt


def E(x, p):
    return sum(pi * xi for pi, xi in zip(p, x))


def var(x, p):
    m = E(x, p)
    return sum(pi * (xi - m) ** 2 for pi, xi in zip(p, x))


def cov(x, y, p):
    mx, my = E(x, p), E(y, p)
    return sum(pi * (xi - mx) * (yi - my) for pi, xi, yi in zip(p, x, y))


def results():
    r = {}
    p = [0.25, 0.5, 0.25]
    A = [30, 10, -10]
    B = [1, 5, 3]
    r["C1.E_B"] = E(B, p)
    A2 = [2 * a for a in A]
    r["Q1.cov_new"] = cov(A2, B, p)
    r["Q1.rho_new"] = cov(A2, B, p) / sqrt(var(A2, p) * var(B, p))
    r["C2.E_new"] = E([a + 5 for a in A], p)
    B2 = [1, 5, 8]
    r["C3.E_B_new"] = E(B2, p)
    r["C3.cov_new"] = cov(A, B2, p)
    w = 0.8
    P = [w * a + (1 - w) * b for a, b in zip(A, B)]
    r["C4.E_P"] = E(P, p)
    r["C4.var_P"] = var(P, p)
    r["C4.sd_P"] = sqrt(var(P, p))

    # C5: the interactive figure uses sigma_A = 20, sigma_B = 10
    sa, sb = 20, 10
    w_min = sb**2 / (sa**2 + sb**2)
    r["C5.w_A"] = 100 * w_min
    r["C5.sd_min"] = sqrt((w_min * sa) ** 2 + ((1 - w_min) * sb) ** 2)

    q = [0.3, 0.4, 0.3]
    C = [25, 8, -10]
    D = [-5, 6, 12]
    r["Q3.E_C"] = E(C, q)
    r["Q3.sd_C"] = sqrt(var(C, q))
    r["Q3.E_D"] = E(D, q)
    r["Q3.sd_D"] = sqrt(var(D, q))
    r["Q3.cov_CD"] = cov(C, D, q)
    r["Q3.rho_CD"] = cov(C, D, q) / sqrt(var(C, q) * var(D, q))

    sa, sb, rho, wa = 18, 8, 0.2, 0.6
    v = wa**2 * sa**2 + (1 - wa) ** 2 * sb**2 + 2 * wa * (1 - wa) * rho * sa * sb
    r["Q4.var_P"] = v
    r["Q4.sd_P"] = sqrt(v)
    r["Q4.wavg"] = wa * sa + (1 - wa) * sb

    r["Q6.w"] = 100 * sb / (sa + sb)
    return r
