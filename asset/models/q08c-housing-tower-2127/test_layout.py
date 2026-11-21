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
print(L.front_map(*L.place(2127)))
print("OK")
