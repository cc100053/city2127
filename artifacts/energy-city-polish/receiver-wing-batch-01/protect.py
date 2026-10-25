from pathlib import Path
import hashlib,json,subprocess
r=Path(__file__).resolve().parent
original=(r/'baseline-source.ts').read_bytes()
current=Path('src/energyPrototype.ts').read_bytes()
def outside(s):
    a=s.index(b'  // Offshore receiver:')
    b=s.index(b'  // All water-garden metalwork')
    return s[:a]+s[b:]
assert outside(original)==outside(current),'Protected source outside receiver changed'
assert set(subprocess.check_output(['git','diff','--name-only','62d000f','--','src'],text=True).splitlines()) <= {'src/energyPrototype.ts'},'Other runtime source changed'
for folder in ['tests','survey','module-swap']:
    assert not subprocess.check_output(['git','diff','62d000f', '--',folder]).strip(),folder+' changed'
assert hashlib.sha256((r/'target.png').read_bytes()).hexdigest()=='02bbde1032c230d51199d1d9cc219ca39fb9935f0af44b456fd843895ef51a40'
print('PASS outside receiver source',hashlib.sha256(outside(current)).hexdigest(),'locked target unchanged')
