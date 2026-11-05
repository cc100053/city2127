"""Self-check for crops.py: python3 crops_selftest.py (synthetic images in a temp dir)."""
import json, os, subprocess, sys, tempfile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
run = lambda *a: subprocess.run([sys.executable, f'{HERE}/crops.py', *a], check=True, capture_output=True, text=True).stdout
with tempfile.TemporaryDirectory() as d:
    os.makedirs(f'{d}/t'); [os.makedirs(f'{d}/{r}') for r in ('r1', 'r2')]
    Image.new('RGB', (1600, 900), 'white').save(f'{d}/t/flagship-high.jpg')
    for r, c in (('r1', 'red'), ('r2', 'blue')):
        for sfx in ('', '-night'): Image.new('RGB', (1600, 900), c).save(f'{d}/{r}/flagship-high{sfx}.png')
    open(f'{d}/rubric.md', 'w').write('## Flagship +1 `high`\n\n- `fh-a` [0,0,.5,1] — first\n- `fh-b` [.5,0,1,1] capture [.4,0,.9,1] — second\n')
    for r in ('r1', 'r2'): run('prep', f'{d}/rubric.md', f'{d}/t', f'{d}/{r}', *([f'{d}/r1'] if r == 'r2' else []), '--night')
    assert sorted(os.listdir(f'{d}/r2/night/judge/crops')) == ['fh-a.jpg', 'fh-b.jpg'] and os.path.exists(f'{d}/r2/night/pair-key.json')
    assert '[' not in open(f'{d}/r2/night/judge/rubric.md').read()  # judges never see the rectangles
    open(f'{d}/r1/night/judge/scores.md', 'w').write('| fh-a | 2 | x |\n| fh-b | 1 | x |\n')
    run('decode', f'{d}/r1/night')
    for k, (a, b) in zip('abc', ((1, 0), (1, 2), (0, 2))): open(f'{d}/r2/night/judge/scores-{k}.md', 'w').write(f'| fh-a | {a} | x |\n| fh-b | {b} | x |\n')
    key = json.load(open(f'{d}/r2/night/pair-key.json'))
    cur = {id: next(l for l, v in k.items() if v == 'cur') for id, k in key.items()}
    open(f'{d}/r2/night/pair/verdicts.md', 'w').write(f'| fh-a | = | same |\n| fh-b | {cur["fh-b"]} | better |\n')
    out = run('decode', f'{d}/r2/night', '--carry', f'{d}/r1/night')
    assert '| fh-a | 2 carried | = |' in out, out          # median 1, tie -> previous 2
    assert '| fh-b | 2 | this |' in out, out               # median of 0, 2, 2
    assert 'median of [0, 2, 2]' in open(f'{d}/r2/night/judge/scores.md').read()
    assert 'Absolute 4/4' in out and os.path.exists(f'{d}/r2/night/review.jpg'), out
    run('strip', f'{d}/t/flagship-high.jpg', f'{d}/s.jpg', f'R1={d}/r1/flagship-high.png', f'R2 night={d}/r2/flagship-high-night.png', '--x', '.4,.6')
    assert Image.open(f'{d}/s.jpg').height == 1450
print('crops.py self-check passed')
