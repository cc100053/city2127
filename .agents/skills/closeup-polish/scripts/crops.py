r"""Judge kit for closeup-polish steps 6-7 (Python 3 + Pillow).

  crops.py prep <rubric.md> <target_dir> <round_dir> [<prev_round_dir>] [--only <prefix>]
  crops.py decode <round_dir>

prep reads every rubric item `- \`id\` [x0,y0,x1,y1] capture [x0,y0,x1,y1] — text` under a heading
`## <Carrier> <step> \`<state>\``: the target is cropped from <target_dir>/<carrier>-<state>.jpg at the first
rectangle, the capture from <round_dir>/<carrier>-<state>.png at the capture rectangle (the first one when absent).
It writes <round_dir>/crops/<id>.jpg (target | round), the blind folders <round_dir>/judge/ (crops + rubric without
rectangles) and, with a previous round, <round_dir>/pair/ (target | A | B, shuffled) plus <round_dir>/pair-key.json.
Judges get only judge/ or pair/; they write judge/scores.md (`| id | 0-2 | evidence |`) and pair/verdicts.md (`| id | A/B/= | reason |`).
decode writes <round_dir>/pair.md (score + decoded pairwise per item) and <round_dir>/review.jpg (crop board with scores) for the owner.
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

def prep(rubric, targets, rnd, prev=None, only=''):
    for d in ('crops', 'judge/crops') + (('pair',) if prev else ()): os.makedirs(f'{rnd}/{d}', exist_ok=True)
    key, shuffle = {}, random.Random(os.urandom(8))
    for id, image, box, cbox in items(rubric, only):
        t, c = crop(f'{targets}/{image}.jpg', box), crop(f'{rnd}/{image}.png', cbox)
        row([t, c], ['target', 'round']).save(f'{rnd}/crops/{id}.jpg', quality=88)
        row([t, c], ['target', 'round']).save(f'{rnd}/judge/crops/{id}.jpg', quality=88)
        if prev:
            pair = [('cur', c), ('prev', crop(f'{prev}/{image}.png', cbox))]; shuffle.shuffle(pair)
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

def decode(rnd):
    scores = dict(re.findall(r'\| `?([\w-]+)`? \| (\d) \|', open(f'{rnd}/judge/scores.md', encoding='utf-8').read()))
    key = json.load(open(f'{rnd}/pair-key.json')) if os.path.exists(f'{rnd}/pair-key.json') else {}
    verdict = dict(re.findall(r'\| `?([\w-]+)`? \| (A|B|=) \|', open(f'{rnd}/pair/verdicts.md', encoding='utf-8').read())) if key else {}
    win = lambda id: '' if id not in verdict else '=' if verdict[id] == '=' else 'this' if key[id][verdict[id]] == 'cur' else 'prev'
    rows = ['| item | score | pairwise |', '|---|---|---|'] + [f'| {id} | {s} | {win(id)} |' for id, s in scores.items()]
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

if __name__ == '__main__':
    a = sys.argv[1:]; only = a[a.index('--only') + 1] if '--only' in a else ''
    a = [v for i, v in enumerate(a) if v != '--only' and (i == 0 or a[i - 1] != '--only')]
    prep(*a[1:5], only=only) if a[0] == 'prep' else decode(a[1])
