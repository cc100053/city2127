r"""Judge kit for closeup-polish steps 6-7 (Python 3 + Pillow).

  crops.py prep <rubric.md> <target_dir> <round_dir> [<prev_round_dir>] [--only <prefix>] [--night]
  crops.py decode <round_dir> [--carry <prev_round_dir>]
  crops.py strip <target.jpg> <out.jpg> [<label>=<capture.png> ...] [--x 0.38,0.62]

prep reads every rubric item `- \`id\` [x0,y0,x1,y1] capture [x0,y0,x1,y1] — text` under a heading
`## <Carrier> <step> \`<state>\``: the target is cropped from <target_dir>/<carrier>-<state>.jpg at the first
rectangle, the capture from <round_dir>/<carrier>-<state>.png at the capture rectangle (the first one when absent).
It writes <round_dir>/crops/<id>.jpg (target | round), the blind folders <round_dir>/judge/ (crops + rubric without
rectangles) and, with a previous round, <round_dir>/pair/ (target | A | B, shuffled) plus <round_dir>/pair-key.json.
Judges get only judge/ or pair/; they write judge/scores.md (`| id | 0-2 | evidence |`) and pair/verdicts.md (`| id | A/B/= | reason |`).
decode writes <round_dir>/pair.md (score + decoded pairwise per item) and <round_dir>/review.jpg (crop board with scores) for the owner.

--night reads <carrier>-<state>-night.png from both rounds and writes everything under <round_dir>/night/ (decode <round_dir>/night).
decode takes the per-item median when several absolute judges wrote judge/scores-*.md (it then writes judge/scores.md itself).
--carry gives an item the previous round's score when the pairwise verdict is `=` (no visible difference): one judge's
absolute score drifts ±1 on unchanged parts, so a tie keeps the old score (marked `carried`).
strip writes a labelled side-by-side of the full-height column x0..x1 (target first): the per-round progress picture.
"""
import json, os, random, re, sys
from PIL import Image, ImageDraw

ITEM = re.compile(r'- `([\w-]+)` \[([\d.,]+)\](?: capture \[([\d.,]+)\])?(.*)')

def items(rubric, only):
    carrier = state = None
    for line in open(rubric, encoding='utf-8'):
        head = re.match(r'## (\w+) .*`(\w+)`', line)
        if head: carrier, state = head[1].lower(), head[2]; continue
        m = ITEM.match(line.strip())
        if m and carrier and m[1].startswith(only):
            box = [float(v) for v in m[2].split(',')]
            yield m[1], f'{carrier}-{state}', box, [float(v) for v in m[3].split(',')] if m[3] else box

def crop(path, box):
    im = Image.open(path).convert('RGB').resize((3200, 1800))
    return im.crop(tuple(int(v * s) for v, s in zip(box, (3200, 1800, 3200, 1800))))

def row(ims, labels, h=900):
    ims = [i.resize((max(1, int(i.width * h / i.height)), h)) for i in ims]
    out = Image.new('RGB', (sum(i.width for i in ims) + 20 * (len(ims) - 1), h + 50), 'white')
    d, x = ImageDraw.Draw(out), 0
    for i, label in zip(ims, labels):
        out.paste(i, (x, 50)); d.text((x + 10, 10), label, fill='black', font_size=36); x += i.width + 20
    return out

def prep(rubric, targets, src, prev=None, only='', night=False):
    rnd, sfx = (f'{src}/night', '-night') if night else (src, '')
    for d in ('crops', 'judge/crops') + (('pair',) if prev else ()): os.makedirs(f'{rnd}/{d}', exist_ok=True)
    key, shuffle = {}, random.Random(os.urandom(8))
    for id, image, box, cbox in items(rubric, only):
        t, c = crop(f'{targets}/{image}.jpg', box), crop(f'{src}/{image}{sfx}.png', cbox)
        row([t, c], ['target', 'round']).save(f'{rnd}/crops/{id}.jpg', quality=88)
        row([t, c], ['target', 'round']).save(f'{rnd}/judge/crops/{id}.jpg', quality=88)
        if prev:
            pair = [('cur', c), ('prev', crop(f'{prev}/{image}{sfx}.png', cbox))]; shuffle.shuffle(pair)
            key[id] = {'A': pair[0][0], 'B': pair[1][0]}
            row([t, pair[0][1], pair[1][1]], ['target', 'A', 'B']).save(f'{rnd}/pair/{id}.jpg', quality=88)
    blind, head = [], None  # headings that hold a kept item, items without rectangles
    for line in open(rubric, encoding='utf-8'):
        m = ITEM.match(line.strip())
        if line.startswith('## '): head = line.rstrip()
        elif m and m[1].startswith(only):
            if head: blind += ['', head, '']; head = None
            blind.append(f'- `{m[1]}` — {m[4].lstrip(" —")}')
    blind = '\n'.join(blind).strip()
    for d in ('judge',) + (('pair',) if prev else ()): open(f'{rnd}/{d}/rubric.md', 'w', encoding='utf-8').write(blind + '\n')
    if prev: json.dump(key, open(f'{rnd}/pair-key.json', 'w'), indent=1)
    print(f'{len(os.listdir(f"{rnd}/crops"))} items -> {rnd}/judge' + (f', {rnd}/pair' if prev else ''))

SCORE = r'\| `?([\w-]+)`? \| (\d) \|'

def read_scores(rnd):
    """Per-item median of judge/scores-*.md (written back to judge/scores.md), else judge/scores.md."""
    many = sorted(f for f in os.listdir(f'{rnd}/judge') if re.fullmatch(r'scores-\w+\.md', f))
    if not many: return dict(re.findall(SCORE, open(f'{rnd}/judge/scores.md', encoding='utf-8').read()))
    runs = [dict(re.findall(SCORE, open(f'{rnd}/judge/{f}', encoding='utf-8').read())) for f in many]
    scores = {id: str(sorted(int(r[id]) for r in runs if id in r)[len([r for r in runs if id in r]) // 2]) for id in runs[0]}
    open(f'{rnd}/judge/scores.md', 'w', encoding='utf-8').write('| id | score | evidence |\n|---|---|---|\n' + ''.join(
        f'| {id} | {s} | median of {[int(r[id]) for r in runs if id in r]} |\n' for id, s in scores.items()))
    return scores

def decode(rnd, carry=None):
    scores = read_scores(rnd)
    key = json.load(open(f'{rnd}/pair-key.json')) if os.path.exists(f'{rnd}/pair-key.json') else {}
    verdict = dict(re.findall(r'\| `?([\w-]+)`? \| (A|B|=) \|', open(f'{rnd}/pair/verdicts.md', encoding='utf-8').read())) if key else {}
    win = lambda id: '' if id not in verdict else '=' if verdict[id] == '=' else 'this' if key[id][verdict[id]] == 'cur' else 'prev'
    prev = dict(re.findall(r'\| `?([\w-]+)`? \| (\d)(?: carried)? \|', open(f'{carry}/pair.md', encoding='utf-8').read())) if carry else {}
    carried = {id for id in scores if win(id) == '=' and id in prev and prev[id] != scores[id]}
    scores.update({id: prev[id] for id in carried})
    rows = ['| item | score | pairwise |', '|---|---|---|'] + [f'| {id} | {s}{" carried" if id in carried else ""} | {win(id)} |' for id, s in scores.items()]
    w, l = sum(win(i) == 'this' for i in scores), sum(win(i) == 'prev' for i in scores)
    rows.append(f'\nAbsolute {sum(map(int, scores.values()))}/{2 * len(scores)}' + (f'; pairwise this round {w}, previous {l} -> {"keep" if w > l else "do not keep"}' if key else ''))
    open(f'{rnd}/pair.md', 'w').write('\n'.join(rows) + '\n'); print('\n'.join(rows))
    board = []
    for id, s in scores.items():
        im = Image.open(f'{rnd}/crops/{id}.jpg'); im = im.resize((int(im.width * 420 / im.height), 420))
        if im.width > 1600: im = im.resize((1600, int(im.height * 1600 / im.width)))
        r = Image.new('RGB', (1600, im.height + 44), 'white'); ImageDraw.Draw(r).text((8, 6), f'{id}  score {s}  {win(id)}  (target | round)', fill='black', font_size=30)
        r.paste(im, (0, 44)); board.append(r)
    out = Image.new('RGB', (1600, sum(r.height + 8 for r in board)), 'white'); y = 0
    for r in board: out.paste(r, (0, y)); y += r.height + 8
    out.save(f'{rnd}/review.jpg', quality=82)

def strip(target, out, *captures, x=(.38, .62), h=1400):
    """Labelled full-height column x0..x1 of the target and each `label=path` capture, side by side."""
    cols = [('target', target)] + [c.split('=', 1) for c in captures]
    ims = [crop(p, [x[0], 0, x[1], 1]) for _, p in cols]
    row(ims, [l for l, _ in cols], h).save(out, quality=88)
    print(f'{len(cols)} columns -> {out}')

def opt(a, name, default=None):
    """Pop `--name value` (or a bare `--name` flag when default is False) from the argument list."""
    if name not in a: return default
    i = a.index(name)
    if default is False: a.pop(i); return True
    v = a[i + 1]; del a[i:i + 2]; return v

if __name__ == '__main__':
    a = sys.argv[1:]
    only, night, carry, x = opt(a, '--only', ''), opt(a, '--night', False), opt(a, '--carry'), opt(a, '--x')
    if a[0] == 'prep': prep(*a[1:5], only=only, night=night)
    elif a[0] == 'decode': decode(a[1], carry)
    elif a[0] == 'strip': strip(*a[1:], **({'x': tuple(map(float, x.split(',')))} if x else {}))
    else: sys.exit(__doc__)
