"""Extract only recorded task data; never execute commands found in session logs."""
import base64
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path

OUT = Path(__file__).parent
REPO = Path('/Users/fatboy/city2127')
SESSIONS = Path('/Users/fatboy/.codex/sessions')
OWNER = '01a16998-07da-7c52-97ef-4bd5c885a6b2'
RING = '01a16eb3-c9b6-7670-b108-60b31eaaa040'
WORKER = '01a16eb8-13bb-7930-a8d0-aaf80b1753b8'
COMMAND = '01a16c95-84d1-7fe2-a365-42e343514498'
BASE = 'db772bb2248aed345468d6b07fc011d518f7c7b2'
manifest = {'base': BASE, 'sourceStages': [], 'targets': [], 'media': [], 'records': []}

def records(sid):
    path = next(SESSIONS.rglob('*' + sid + '.jsonl'))
    for line, raw in enumerate(path.open(), 1):
        yield line, json.loads(raw).get('payload', {})

def texts(v):
    output = v.get('output', [])
    if isinstance(output, str):
        output = [{'text': output}]
    for c in output:
        if not isinstance(c, dict) or not isinstance(c.get('text'), str):
            continue
        s = c['text']
        try:
            parsed = json.loads(s)
            if isinstance(parsed, dict) and isinstance(parsed.get('output'), str):
                s = parsed['output']
        except (ValueError, TypeError):
            pass
        yield s

def patch_for(text, name):
    lines = text.splitlines(keepends=True)
    marker = f'diff --git a/{name} b/{name}\n'
    start = lines.index(marker)
    result = lines[start:start + 4]
    i = start + 4
    while i < len(lines) and lines[i].startswith('@@ '):
        h = re.match(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', lines[i])
        assert h, lines[i]
        old, new = int(h[2] or 1), int(h[4] or 1)
        result.append(lines[i]); i += 1
        while old or new:
            line = lines[i]
            assert line[:1] in (' ', '+', '-'), line
            old -= line[:1] in (' ', '-')
            new -= line[:1] in (' ', '+')
            assert old >= 0 and new >= 0
            result.append(line); i += 1
    return ''.join(result)

def blob(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()

def apply(data, patch):
    lines = patch.splitlines(keepends=True)
    before, after = re.search(r'index ([0-9a-f]+)\.\.([0-9a-f]+)', patch).groups()
    assert blob(data).startswith(before), (blob(data), before)
    src = data.decode().splitlines(keepends=True)
    result = []; cursor = 0; i = 4
    while i < len(lines):
        h = re.match(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', lines[i])
        assert h
        start = int(h[1]) - 1
        assert start >= cursor
        result.extend(src[cursor:start]); cursor = start; i += 1
        while i < len(lines) and not lines[i].startswith('@@ '):
            line = lines[i]; kind, value = line[0], line[1:]
            if kind in (' ', '-'):
                assert src[cursor] == value, (cursor, src[cursor], value)
                cursor += 1
            if kind in (' ', '+'):
                result.append(value)
            i += 1
    result.extend(src[cursor:]); data = ''.join(result).encode()
    assert blob(data).startswith(after), (blob(data), after)
    return data

def save_stage(label, data, provenance):
    target = OUT / 'source' / label
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    manifest['sourceStages'].append({'file': str(target.relative_to(OUT)), 'blob': blob(data),
        'sha256': hashlib.sha256(data).hexdigest(), 'provenance': provenance})

owner = dict(records(OWNER))
source = subprocess.check_output(['git', 'show', BASE + ':src/energyPrototype.ts'], cwd=REPO)
tests = subprocess.check_output(['git', 'show', BASE + ':tests/energyPrototype.test.ts'], cwd=REPO)
for n in [965, 1179, 1287, 1434, 1749, 1895, 2079, 2305]:
    text = next(s for s in texts(owner[n]) if 'diff --git a/src/energyPrototype.ts' in s)
    patch = patch_for(text, 'src/energyPrototype.ts')
    (OUT / f'owner-{n}.patch').write_text(patch)
    if n == 1749:
        old = b'arc(garden, 2.17, 2.64, .42'
        assert source.count(old) == 1
        source = source.replace(old, b'arc(garden, 2.32, 2.64, .42')
        save_stage('water-garden-accepted.ts', source, f'{OWNER}:1462 recorded clearance correction')
    source = apply(source, patch)
    save_stage(f'owner-{n}.ts', source, f'{OWNER}:{n}')
    if n == 1179:
        tests = apply(tests, patch_for(text, 'tests/energyPrototype.test.ts'))
    if n == 2079:
        save_stage('energy-island-accepted.ts', source, f'{OWNER}:{n}, source commit 71330a5')

assert hashlib.sha256(source).hexdigest() == '5255520888c0810717e7aee60917c4703ba255721b67d6a7e9d6960aca4e9627'
save_stage('storage-ring-pass1-verified.ts', source, '40df2ef; exact original SHA-256 match')

# Restore the recorded pass2 test insertion as literal data, without executing its shell/Python command.
record = owner[1302]['input']
encoded_cmd = re.search(r'cmd:("(?:\\.|[^"\\])*")', record).group(1)
cmd = json.loads(encoded_cmd)
import ast
tree = ast.parse(cmd.split("<<'PY'\n", 1)[1].split('\nPY', 1)[0])
needle = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'needle' for t in n.targets))
addition = next(ast.literal_eval(n.args[1].right) for n in ast.walk(tree) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'replace' and len(n.args) == 2 and isinstance(n.args[1], ast.BinOp))
tests = tests.decode().replace('Matrix4, Mesh, Raycaster, Vector3', 'Matrix4, Mesh, MeshPhysicalMaterial, Raycaster, Texture, Vector3').replace('{ arc, trim }', '{ arc, chrome, trim }')
assert tests.count(needle) == 1
tests = tests.replace(needle, needle + addition).encode()
save_stage('energyPrototype.test.ts', tests, f'{OWNER}:1179 diff and :1302 literal insertion; final test hash not recorded')

worker = dict(records(WORKER))
patch = next(patch_for(s, 'src/energyPrototype.ts') for v in worker.values() for s in texts(v) if 'diff --git a/src/energyPrototype.ts' in s)
(OUT / 'ring-pass2-recorded.patch').write_text(patch)
pass2 = apply(source, patch)
assert pass2.count(b'[[-.9, .65], [.05, 2.2], [2.55, .7]]') == 1
pass2 = pass2.replace(b'[[-.9, .65], [.05, 2.2], [2.55, .7]]', b'[[-1.18, .93], [.05, 2.2], [2.55, .7]]')
save_stage('storage-ring-pass2-unverified.ts', pass2, WORKER + ': diff plus final recorded shell depth correction; no tests/build/browser/commit')

target_ids = ['exec-7ea7b986-15bf-4be3-8977-f3318caca897', 'exec-e342957b-174f-4a9b-b0df-6ca03025c75b', 'exec-fe16eb74-a4ee-4354-9100-68f15c78ef7e']
for batch, image_id in zip(['water-garden', 'energy-island', 'storage-ring'], target_ids):
    original = Path('/Users/fatboy/.codex/generated_images') / OWNER / (image_id + '.png')
    target = OUT / 'targets' / (batch + '.png'); target.parent.mkdir(exist_ok=True)
    shutil.copyfile(original, target)
    manifest['targets'].append({'batch': batch, 'original': str(original), 'file': str(target.relative_to(OUT)), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})

for sid in [OWNER, RING, WORKER, COMMAND]:
    calls = {}
    for n, v in records(sid):
        if v.get('type') in ('custom_tool_call', 'function_call'):
            calls[v.get('call_id')] = v.get('input', v.get('arguments', ''))
        if v.get('type') not in ('custom_tool_call_output', 'function_call_output'):
            continue
        call = calls.get(v.get('call_id'), '')
        if sid == OWNER and not (850 <= n <= 2390 or n >= 2524):
            continue
        output = v.get('output', [])
        if not isinstance(output, list):
            continue
        for i, c in enumerate(output):
            if not isinstance(c, dict) or c.get('type') != 'input_image':
                continue
            url = c.get('image_url', '')
            m = re.match(r'data:image/(png|jpeg);base64,(.*)', url, re.S)
            if not m:
                continue
            data = base64.b64decode(m[2], validate=True)
            assert data.startswith(b'\x89PNG\r\n\x1a\n') if m[1] == 'png' else data.startswith(b'\xff\xd8')
            name = f'{sid}-{n}-{i}.' + ('png' if m[1] == 'png' else 'jpg')
            target = OUT / 'session-media' / name; target.parent.mkdir(exist_ok=True)
            target.write_bytes(data)
            manifest['media'].append({'file': str(target.relative_to(OUT)), 'session': sid, 'line': n, 'item': i,
                'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data), 'recordedCall': call,
                'limit': 'Transcript media; may be resized. Not claimed byte-identical to missing original screenshot.'})

(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'sourceStages': len(manifest['sourceStages']), 'targets': len(manifest['targets']), 'media': len(manifest['media']), 'pass1_sha256': hashlib.sha256(source).hexdigest()}, indent=2))
