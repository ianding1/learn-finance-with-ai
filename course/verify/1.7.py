"""Recompute every numeric answer in course/keys/1.7.yaml.

results() returns {"<question id>.<name>": value}. CI compares each value with the
`expected` string in the key file, rounded to the number of decimals written there.
"""


def threshold(T, R, P):
    """Smallest discount factor at which a trigger strategy sustains cooperation."""
    return (T - R) / (T - P)


def results():
    r = {}
    # C3: entry game with and without the plant (entrant, incumbent), solved by backward induction.
    def solve(stay, fight, acc):
        after = fight if fight[1] > acc[1] else acc  # incumbent's choice after entry
        return after if after[0] > stay[0] else stay  # entrant's choice
    with_plant = solve((0, 90), (-10, 40), (20, 35))
    without = solve((0, 100), (-10, 30), (20, 50))
    r["C3.with"], r["C3.without"] = with_plant[1], without[1]

    # C4: keep 10 forever vs 15 now then 5 forever.
    d = threshold(15, 10, 5)
    assert abs(10 / (1 - d) - (15 + 5 * d / (1 - d))) < 1e-9
    r["C4.delta"] = d
    r["C4.rate"] = 100 * (1 / d - 1)
    r["Q2.d"] = d

    # Q3: waiting must beat withdrawing (80) when the other withdraws.
    r["Q3.g"] = 80

    # Q5: Cournot collusion from lesson 1.6: R = 800, T = 900, P = 6400 / 9.
    d5 = threshold(900, 800, 6400 / 9)
    r["Q5.d"] = d5
    r["Q5.p"] = 100 * d5 * 1.05
    return r


if __name__ == "__main__":
    for k, v in results().items():
        print(k, round(v, 4))
