"""Assert protected sectors and shared controllers match D's actual base."""
import json,pathlib,subprocess
BASE='3bb99ce2485aeb4b816e2ef21f8b74fb42328b08'
def old(p):return subprocess.check_output(['git','show',BASE+':'+p],text=True)
def now(p):return pathlib.Path(p).read_text()
p='src/headlineCamera.ts'
keys=['nw:focal','nw:district','energy:garden2','energy:wing','energy:island']
strip=lambda s:'\n'.join(l for l in s.splitlines() if not any("'"+k+"':" in l for k in keys))
assert strip(old(p))==strip(now(p)),'Non-D pose or camera logic changed'
p='src/siteBuilders/automationHub.ts'
assert old(p).split('function createAutomationHubRuntime')[1].split('export function buildAutomationHub')[0]==now(p).split('function createAutomationHubRuntime')[1].split('export function buildAutomationHub')[0],'Hub controller changed'
p='src/districtMeters.ts'
parts=lambda s:s.split('export class AutomationDistrict')
assert parts(old(p))[0]==parts(now(p))[0],'A/B district changed'
assert parts(old(p))[1].split('/** Lit-room')[1]==parts(now(p))[1].split('/** Lit-room')[1],'C district changed'
control=lambda s:parts(s)[1].split('  setTarget(')[1]
assert control(old(p))==control(now(p)),'NW target/count/selection/motion changed'
p='src/energyPrototype.ts'
suffix=lambda s:s.split('  // Two shore service gates')[1].split('  const gardens =')[0]
# D-only garden detail is inserted after the clone, leaving the first garden and C ring byte-identical.
garden_ring=lambda s:s.split('  // All water-garden metalwork')[1].split('  // Three reclaimed caissons')[0]
assert garden_ring(old(p))==garden_ring(now(p)),'A garden or C ring changed'
assert suffix(old(p))==suffix(now(p)),'Distribution or clone changed'
west=lambda s:'\n'.join(line for line in s.split('  const westGardenLights')[1].split('  // Short markers')[0].splitlines() if not line.lstrip().startswith('//'))
assert west(old(p))==west(now(p)),'First west-garden light geometry changed'
assert old(p).split('  let option: EnergyOption')[1]==now(p).split('  let option: EnergyOption')[1],'Energy mapping/motion changed'
changed=subprocess.check_output(['git','diff','--name-only',BASE,'--','src','tests','survey','module-swap','package.json','package-lock.json'],text=True).splitlines()
allowed={'src/headlineCamera.ts','src/siteBuilders/automationHub.ts','src/districtMeters.ts','src/energyPrototype.ts','tests/automationHub.test.ts','tests/districtMeters.test.ts','tests/energyPrototype.test.ts'}
assert set(changed)<=allowed,changed
out={'status':'PASS','base':BASE,'protected':['A/B/C poses and builders','FOV/hero/timeline','six hub slots/controller','NW targets/slots/selection/motion','first garden/C ring/distribution','energy configuration/60s cycle'], 'changed':changed}
pathlib.Path('artifacts/closeup-polish/D/scope-check.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
