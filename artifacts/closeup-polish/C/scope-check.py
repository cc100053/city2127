"""Run from the checkout root; verify the C boundary against its actual handoff base."""
import json
import pathlib
import subprocess

BASE = 'ca22a92769e596b3c168ae0579aadef4b5420d9d'
def old(path):
    return subprocess.check_output(['git', 'show', f'{BASE}:{path}'], text=True)
def current(path):
    return pathlib.Path(path).read_text()

p = 'src/headlineCamera.ts'
without_c = lambda s: '\n'.join(line for line in s.splitlines() if not any(f"'{key}':" in line for key in ['se:focal', 'se:district', 'energy:ring']))
assert without_c(old(p)) == without_c(current(p)), 'Non-C poses or camera logic changed'
p = 'src/districtMeters.ts'
assert old(p).split('export class ConcentrationDistrict')[0] == current(p).split('export class ConcentrationDistrict')[0]
control = lambda s: s.split('export class ConcentrationDistrict')[1].split('  setTarget(', 1)[1].split('  private write()', 1)[0]
assert control(old(p)) == control(current(p)), 'District targets/counts/updates changed'
p = 'src/siteBuilders/concentrationTower.ts'
assert old(p).split('export function buildConcentrationTower')[0] == current(p).split('export function buildConcentrationTower')[0]
assert old(p).split('  const mixedModules =')[1] == current(p).split('  const mixedModules =')[1], 'Function module slots/wiring changed'
p = 'src/energyPrototype.ts'
ring = lambda s: (s.split('  // Bay-facing flywheel')[0], s.split('  // Three reclaimed caissons')[1])
assert ring(old(p)) == ring(current(p)), 'Energy outside the C ring changed'
changed = subprocess.check_output(['git', 'diff', '--name-only', BASE, '--', 'src', 'tests', 'survey', 'module-swap', 'package.json', 'package-lock.json'], text=True).splitlines()
assert set(changed) == {'src/headlineCamera.ts', 'src/districtMeters.ts', 'src/siteBuilders/concentrationTower.ts', 'src/energyPrototype.ts', 'tests/concentrationTower.test.ts', 'tests/districtMeters.test.ts'}, changed
result = {'status': 'PASS', 'baseline': BASE, 'checks': ['Only three C pose values; hero/FOV/timeline unchanged', 'Non-ConcentrationDistrict carriers and all slot positions unchanged', 'Concentration targets/counts/controllers/module wiring unchanged', 'Only the C flywheel block changes in energy; A/D and other energy parts preserved', 'No protocol, dependency, survey or module-swap changes'], 'changedRuntimeAndTests': changed}
pathlib.Path('artifacts/closeup-polish/C/scope-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
