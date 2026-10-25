from pathlib import Path
import hashlib
base = Path(__file__).resolve().parent
original = (base/'pass1/source.ts').read_text()
current = Path('src/energyPrototype.ts').read_text()
start = '  // Bay-facing flywheel stands ahead'
end = '  // Three reclaimed caissons read as new coastline.'
def outside(source):
    a, rest = source.split(start)
    _, b = rest.split(end)
    return a + end + b
assert outside(original) == outside(current), 'Protected water/island/other source changed'
print('PASS protected source outside storage ring SHA256', hashlib.sha256(outside(current).encode()).hexdigest())
