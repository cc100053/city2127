"""Owner checkpoint: full branch bundle, scoped evidence archive, byte verification."""
from pathlib import Path
import subprocess, hashlib, tarfile, json, sys, datetime
round_name = sys.argv[1]
assert round_name in ['pass1', 'pass2', 'pass3']
root = Path('artifacts/energy-city-polish/receiver-wing-batch-01')
out = root / 'checkpoints'
out.mkdir(exist_ok=True)
assert not subprocess.check_output(['git', 'status', '--porcelain'], text=True), 'Commit task before backup'
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
bundle = out / (round_name + '.bundle')
archive = out / (round_name + '-evidence.tar.gz')
assert not bundle.exists() and not archive.exists(), 'Preserve prior checkpoints'
subprocess.run(['git', 'bundle', 'create', str(bundle), 'codex/energy-city-polish'], check=True)
verify = subprocess.run(['git', 'bundle', 'verify', str(bundle)], capture_output=True, text=True, check=True)
(out / (round_name + '-bundle-verify.txt')).write_text(verify.stdout + verify.stderr)
files = []
for folder in [Path('src'), Path('tests'), Path('docs'), root]:
    files.extend(p for p in folder.rglob('*') if p.is_file() and 'checkpoints' not in p.parts)
files += [Path('.dream-loop/target.png'), Path('.dream-loop/receiver-wing-batch-01/target.png')]
files = sorted(set(files))
with tarfile.open(archive, 'w:gz') as tar:
    for p in files:
        tar.add(p, arcname=p.as_posix(), recursive=False)
with tarfile.open(archive, 'r:gz') as tar:
    members = [m for m in tar if m.isfile()]
    assert len(members) == len(files)
    for member in members:
        assert hashlib.sha256(tar.extractfile(member).read()).digest() == hashlib.sha256(Path(member.name).read_bytes()).digest(), member.name
assert not subprocess.check_output(['git', 'status', '--porcelain'], text=True), 'Backup must leave tree clean'
meta = {'round': round_name, 'commit': head, 'sourceSha256': hashlib.sha256(Path('src/energyPrototype.ts').read_bytes()).hexdigest(),
        'targetSha256': hashlib.sha256((root / 'target.png').read_bytes()).hexdigest(), 'bundleVerify': 'PASS',
        'archiveContentsVerify': 'PASS', 'archiveScope': 'all receiver evidence, complete current src/tests/docs and both workflow targets; checkpoints excluded',
        'verifiedEvidenceFiles': len(files), 'workingTree': 'clean; checkpoint files ignored locally', 'services': 'Vite stopped; browser and scratch server closed',
        'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'files': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in [bundle, archive]}}
(out / (round_name + '.json')).write_text(json.dumps(meta, indent=2) + '\n')
print(json.dumps(meta, indent=2))
