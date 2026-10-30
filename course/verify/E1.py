"""Recompute every numeric answer in course/keys/E1.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""


def results():
    r = {}
    # Q1: 2% nominal, 3% inflation, 10 years, 100,000 invested.
    real = 100000 * (1.02 / 1.03) ** 10
    r["Q1.real"] = real
    r["Q1.loss"] = 100 * (1 - real / 100000)

    # Q6: good assets 200, bad 40; project costs 20 and adds 25; half of each type.
    good, bad = 200 + 25, 40 + 25
    avg = (good + bad) / 2
    share = 20 / avg
    keep = good * (1 - share)
    assert keep < 200  # the good company does not issue shares
    assert bad * (1 - 20 / bad) > 40  # issuing pays for the bad company even when identified
    r["Q6.avg"], r["Q6.share"], r["Q6.keep"] = avg, 100 * share, keep
    r["Q6.debt"] = good - 20
    assert r["Q6.debt"] > 200

    # Q7: economic profit 10 next year; A shrinks 30% a year, B stays; discount rate 8%.
    a = 10 / (0.08 + 0.30)
    b = 10 / 0.08
    r["Q7.a"], r["Q7.b"] = a, b
    r["Q7.d"] = 100 * (10 / 50 - 0.08)  # decline implied by a premium of 50

    # Q5: Q = sqrt(K L), cost-minimizing K/L = w/r; wage +20% at fixed output.
    from math import sqrt
    r["Q5.kup"] = 100 * (sqrt(1.2) - 1)
    r["Q5.ldown"] = 100 * (1 - 1 / sqrt(1.2))

    # Q8: expected 7% minus 1% fee, sd 15%, gamma 3; certain alternative 4%.
    premium = 0.5 * 3 * 0.15**2
    ce = 0.07 - 0.01 - premium
    assert ce < 0.04 and 0.07 - premium < 0.04
    r["Q8.premium"], r["Q8.ce"] = 100 * premium, 100 * ce
    r["Q8.fee"] = 0.01 * 200000

    # Q9: collusion needs delta >= 1 - 1/n.
    r["Q9.d2"] = 1 - 1 / 2
    r["Q9.n"] = max(n for n in range(1, 100) if 1 - 1 / n <= 0.92)

    # Q10: Qd = 1000 - 10P, short-run Qs = 40P - 1000, long-run supply flat at 40, tax 6.
    pb = (1000 + 1000 + 40 * 6) / 50
    r["Q10.pb"], r["Q10.ps"], r["Q10.q"] = pb, pb - 6, 1000 - 10 * pb
    assert 1000 - 10 * 40 == 40 * 40 - 1000  # the starting point is the long-run equilibrium
    r["Q10.pl"] = 40 + 6
    r["Q10.ql"] = 1000 - 10 * r["Q10.pl"]
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
