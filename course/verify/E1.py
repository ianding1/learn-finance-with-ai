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

    # Q5: good assets 200, bad 40; project costs 20 and adds 25; half of each type.
    good, bad = 200 + 25, 40 + 25
    avg = (good + bad) / 2
    share = 20 / avg
    keep = good * (1 - share)
    assert keep < 200  # the good company does not issue shares
    assert bad * (1 - 20 / bad) > 40  # issuing pays for the bad company even when identified
    r["Q5.avg"], r["Q5.share"], r["Q5.keep"] = avg, 100 * share, keep
    r["Q5.debt"] = good - 20
    assert r["Q5.debt"] > 200

    # Q6: economic profit 10 next year; A shrinks 30% a year, B stays; discount rate 8%.
    a = 10 / (0.08 + 0.30)
    b = 10 / 0.08
    r["Q6.a"], r["Q6.b"] = a, b
    r["Q6.d"] = 100 * (10 / 50 - 0.08)  # decline implied by a premium of 50
    r["Q6.over"] = 50 - a

    # Q7: expected 7% minus 1% fee, sd 15%, gamma 3; certain alternative 4%.
    premium = 0.5 * 3 * 0.15**2
    ce = 0.07 - 0.01 - premium
    assert ce < 0.04 and 0.07 - premium < 0.04
    r["Q7.premium"], r["Q7.ce"] = 100 * premium, 100 * ce
    r["Q7.fee"] = 0.01 * 200000

    # Q8: collusion needs delta >= 1 - 1/n.
    r["Q8.d2"] = 1 - 1 / 2
    r["Q8.n"] = max(n for n in range(1, 100) if 1 - 1 / n <= 0.92)

    # Q9: Qd = 1000 - 10P, short-run Qs = 40P - 1000, long-run supply flat at 40, tax 6.
    pb = (1000 + 1000 + 40 * 6) / 50
    r["Q9.pb"], r["Q9.ps"], r["Q9.q"] = pb, pb - 6, 1000 - 10 * pb
    assert 1000 - 10 * 40 == 40 * 40 - 1000  # the starting point is the long-run equilibrium
    r["Q9.pl"] = 40 + 6
    r["Q9.ql"] = 1000 - 10 * r["Q9.pl"]
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
