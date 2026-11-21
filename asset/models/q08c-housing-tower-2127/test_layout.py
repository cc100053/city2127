"""Runnable check for layout.py (plain Python 3, no Blender): python test_layout.py"""
import layout as L

for seed in (2127, 8, 1, 99):
    a1, o1 = L.place(seed)
    a2, o2 = L.place(seed)
    assert a1 == a2 and o1 == o2, "same seed must reproduce"
    st = L.stats(a1, o1)
    assert not st["adjacent_same"], (seed, st["adjacent_same"])
    assert not st["periodic_rows"], (seed, st["periodic_rows"])
    assert set(st["counts"]) == set(L.TYPES), (seed, st["counts"])
    assert not set(a1) & set(L.RESERVED) and not o1 & set(L.RESERVED) and not set(a1) & o1
    assert len(a1) + len(o1) + len(L.RESERVED) == len(L.all_slots())
    for s in o1:
        assert not any(n in o1 or n in L.RESERVED for n in L.neighbours(s)), s
        assert s[0] == "F" and sum(o[1] == s[1] for o in o1) == 1, s
    print(seed, st["houses"], "houses", st["open"], "open", st["counts"])
assert L.place(2127)[0] != L.place(8)[0], "different seeds should differ"
for seed in (2127, 8):
    a0, o0 = L.place(seed)
    a, o, blocked, empty, landings = L.side_middle(seed, a0, o0)
    assert (a, o, blocked, empty) == L.side_middle(seed, a0, o0)[:4], "side middle must reproduce"
    for side, prog in L.SIDE_MIDDLE.items():
        for l in range(L.NL):
            mid, corner = (side, l, 1), ("F", l, L.CORNER[side])
            if l in prog:                     # the landing goes to the middle slot: no house in the corner bay
                assert corner not in a, (seed, corner)
                assert (mid in a) == (prog[l] == "house") and (mid in empty) == (prog[l] == "empty"), (seed, mid)
                assert (corner in empty) == (prog[l] == "empty") and (corner in blocked) == (prog[l] == "house"), corner
            else:                             # terrace or plain landing: the corner bay keeps its draw
                assert mid not in a and mid not in empty and corner not in blocked and corner not in empty, (seed, mid)
                assert (corner in a) == (corner in a0), (seed, corner)
    assert {k: v for k, v in a.items() if k[0] == "F" and k[2] not in (0, L.FRONT_BAYS - 1)} == \
        {k: v for k, v in a0.items() if k[0] == "F" and k[2] not in (0, L.FRONT_BAYS - 1)}, "inner bays keep the draw"
    assert not L.stats(a, o)["adjacent_same"], (seed, L.stats(a, o)["adjacent_same"])
a0, o0 = L.place(2127)
a, o, *_ = L.side_middle(2127, a0, o0)
print(L.front_map(a, o))
print("OK")
