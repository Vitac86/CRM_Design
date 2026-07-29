"""Table-cell probe for form PDFs whose blanks are table cells, not underscores.

Reconstructs the cell grid from the drawn rules and reports, for each row, the
label text and the empty cell to its right (where a typed value belongs).

    python probe_table.py TEMPLATE.pdf --page 0
    python probe_table.py TEMPLATE.pdf --page 0 --find "ИНН"
"""
import argparse
import sys

import fitz

sys.stdout.reconfigure(encoding='utf-8')

ap = argparse.ArgumentParser()
ap.add_argument('pdf')
ap.add_argument('--page', type=int, default=0)
ap.add_argument('--find', default=None)
ap.add_argument("--min-span", type=float, default=0.25,
                help="ignore vertical rules shorter than this fraction of the table")
a = ap.parse_args()

doc = fitz.open(a.pdf)
page = doc[a.page]
W, H = page.rect.width, page.rect.height
print('PAGE %d   %.2f x %.2f pt' % (a.page, W, H))

# ── collect rules, keeping how far each vertical rule actually runs ──────────
# A genuine column boundary runs down most of the table. Short vertical rules
# belong to a single row (e.g. the three-way checkbox split) and must not be
# treated as columns, or every value cell comes out a fraction of its true width.
xspan, ys = {}, set()


def add_v(x, y0, y1):
    x = round(x, 1)
    lo, hi = min(y0, y1), max(y0, y1)
    xspan[x] = xspan.get(x, 0.0) + (hi - lo)


for d in page.get_drawings():
    for item in d['items']:
        if item[0] == 're':
            r = item[1]
            ys.update([round(r.y0, 1), round(r.y1, 1)])
            add_v(r.x0, r.y0, r.y1)
            add_v(r.x1, r.y0, r.y1)
        elif item[0] == 'l':
            p1, p2 = item[1], item[2]
            if abs(p1.y - p2.y) < 0.8:
                ys.add(round((p1.y + p2.y) / 2, 1))
            elif abs(p1.x - p2.x) < 0.8:
                add_v((p1.x + p2.x) / 2, p1.y, p2.y)
                ys.update([round(p1.y, 1), round(p2.y, 1)])

table_h = (max(ys) - min(ys)) if ys else 1.0
MIN_SPAN = a.min_span * table_h
xs = {x for x, span in xspan.items() if span >= MIN_SPAN}
if len(xs) < 2:
    xs = set(xspan)
print('vertical rules: %d total, %d spanning >=%.0f%% of the table'
      % (len(xspan), len(xs), a.min_span * 100))


def cluster(vals, tol=2.0):
    vals = sorted(vals)
    out = []
    for v in vals:
        if out and v - out[-1][-1] <= tol:
            out[-1].append(v)
        else:
            out.append([v])
    return [round(sum(g) / len(g), 2) for g in out]


xs, ys = cluster(xs, 3.0), cluster(ys)
print('column rules: %d   row rules: %d' % (len(xs), len(ys)))

# ── text spans ───────────────────────────────────────────────────────────────
spans = []
for blk in page.get_text('dict')['blocks']:
    for line in blk.get('lines', []):
        for sp in line['spans']:
            t = sp['text'].strip()
            if t:
                spans.append({'t': t, 'x0': sp['bbox'][0], 'y0': sp['bbox'][1],
                              'x1': sp['bbox'][2], 'y1': sp['bbox'][3],
                              'size': sp['size'], 'font': sp['font'],
                              'base': sp['origin'][1]})

if a.find:
    needle = a.find.lower()
    print('\n--- anchors matching %r ---' % a.find)
    print('%-52s %8s %8s %8s %7s %6s' % ('text', 'left', 'right', 'baseTop', 'size', 'font'))
    for s in spans:
        if needle in s['t'].lower():
            print('%-52s %8.2f %8.2f %8.2f %7.2f %s'
                  % (s['t'][:51], s['x0'], s['x1'], s['base'], s['size'], s['font'][:14]))
    sys.exit(0)

# ── build cells, report label -> empty neighbour ─────────────────────────────
print('\n%-56s | %-38s' % ('label cell (printed text)', 'value cell -> left/baselineTop/width'))
print('-' * 110)
for ri in range(len(ys) - 1):
    top, bot = ys[ri], ys[ri + 1]
    if bot - top < 6:
        continue
    row = []
    for ci in range(len(xs) - 1):
        l, r = xs[ci], xs[ci + 1]
        if r - l < 12:
            continue
        inside = [s for s in spans
                  if s['x0'] >= l - 1 and s['x1'] <= r + 1
                  and s['base'] > top + 0.5 and s['base'] < bot + 1.5]
        row.append({'l': l, 'r': r, 'text': ' '.join(x['t'] for x in inside).strip(),
                    'size': (inside[0]['size'] if inside else None),
                    'base': (inside[0]['base'] if inside else None)})
    for i, cell in enumerate(row):
        if not cell['text']:
            continue
        nxt = row[i + 1] if i + 1 < len(row) else None
        if nxt is not None and not nxt['text']:
            # baseline: reuse the label's baseline so the value sits on the same line
            bl = cell['base'] if cell['base'] else (top + (bot - top) * 0.7)
            print('%-56s | left=%7.2f baselineTop=%7.2f width=%6.2f'
                  % (cell['text'][:55], nxt['l'] + 3, bl, nxt['r'] - nxt['l'] - 6))
