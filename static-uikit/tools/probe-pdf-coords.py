#!/usr/bin/env python3
"""Build-time only: derive overlay coordinates from a converted PDF template.

Not part of the browser runtime. Used while preparing a document mapping in
`assets/js/document-field-maps/`, so coordinates come from the real template
instead of being guessed by eye.

It reports, per page:

  * `blank`    — runs of underscores (the fill-in lines of the Word form),
                 with their exact left edge, width and baseline;
  * `checkbox` — every checkbox glyph in the template;
  * `anchor`   — text spans matching a search term, so values can be placed
                 after a printed label that has no underline.

Positions come from real per-character glyph boxes. Do NOT compute sub-line
offsets from a font width table: Word justifies these forms, which stretches
inter-word spaces, and an estimated offset drifts by tens of points by the
middle of a line — enough to print a passport number on top of the word next
to it.

Coordinates are printed in BOTH systems:

  x / baseline   PDF user space, origin bottom-left (what pdf-lib draws with)
  left / top     origin top-left (what the field maps are authored in);
                 `top` is the distance from the page top down to the BASELINE,
                 i.e. exactly the `baselineTop` used in a field map.

Usage
-----
    python tools/probe-pdf-coords.py TEMPLATE.pdf
    python tools/probe-pdf-coords.py TEMPLATE.pdf --page 0
    python tools/probe-pdf-coords.py TEMPLATE.pdf --find "Тарифный план"
    python tools/probe-pdf-coords.py TEMPLATE.pdf --json > coords.json

Requires: PyMuPDF  (pip install pymupdf) — a developer-workstation dependency
only; nothing in static-uikit/assets depends on it.
"""
import argparse
import json
import sys

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    sys.exit('PyMuPDF is required:  pip install pymupdf')

CHECKBOX_GLYPHS = set('☐□❑❏')


def page_chars(page):
    """Yield every glyph on the page with its box, size, font and baseline."""
    data = page.get_text('rawdict')
    for block in data.get('blocks', []):
        for line in block.get('lines', []):
            for span in line.get('spans', []):
                size = span.get('size', 0)
                font = span.get('font', '')
                origin_y = span.get('origin', [0, 0])[1]
                for ch in span.get('chars', []):
                    yield {
                        'c': ch['c'],
                        'bbox': ch['bbox'],          # x0, y0, x1, y1
                        'size': size,
                        'font': font,
                        'baseline': ch.get('origin', [0, origin_y])[1],
                    }


def analyse(path, only_page=None, find=None):
    doc = fitz.open(path)
    out = []

    for index in range(doc.page_count):
        if only_page is not None and index != only_page:
            continue
        page = doc[index]
        items = []
        chars = list(page_chars(page))

        # ── underscore runs → blank fill-in lines ──────────────────────────
        run = []
        for ch in chars + [None]:
            if ch is not None and ch['c'] == '_':
                run.append(ch)
                continue
            if len(run) >= 2:
                first, last = run[0], run[-1]
                items.append({
                    'kind': 'blank',
                    'page': index,
                    'left': round(first['bbox'][0], 1),
                    'top': round(first['baseline'], 2),
                    'width': round(last['bbox'][2] - first['bbox'][0], 1),
                    'size': round(first['size'], 2),
                    'font': first['font'],
                })
            run = []

        # ── checkbox glyphs ────────────────────────────────────────────────
        for ch in chars:
            if ch['c'] in CHECKBOX_GLYPHS:
                items.append({
                    'kind': 'checkbox',
                    'page': index,
                    'left': round(ch['bbox'][0], 1),
                    'top': round(ch['baseline'], 2),
                    'size': round(ch['size'], 2),
                    'font': ch['font'],
                })

        # ── anchors: end of a matching span, where a value would be typed ──
        if find:
            for block in page.get_text('dict').get('blocks', []):
                for line in block.get('lines', []):
                    for span in line.get('spans', []):
                        if find.lower() in span.get('text', '').lower():
                            items.append({
                                'kind': 'anchor',
                                'page': index,
                                'left': round(span['bbox'][0], 1),
                                'endsAt': round(span['bbox'][2], 1),
                                'top': round(span['origin'][1], 2),
                                'size': round(span['size'], 2),
                                'font': span.get('font', ''),
                                'text': span.get('text', '')[:70],
                            })

        items.sort(key=lambda i: (i['top'], i['left']))
        out.append({
            'page': index,
            'width': round(page.rect.width, 2),
            'height': round(page.rect.height, 2),
            'items': items,
        })
    return out


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('pdf')
    ap.add_argument('--page', type=int, default=None, help='only this page index')
    ap.add_argument('--find', default=None, help='also report spans containing this text')
    ap.add_argument('--json', action='store_true', help='emit JSON')
    args = ap.parse_args()

    pages = analyse(args.pdf, args.page, args.find)

    if args.json:
        json.dump(pages, sys.stdout, ensure_ascii=False, indent=2)
        print()
        return

    for page in pages:
        print('=' * 86)
        print('PAGE %d   %.2f x %.2f pt   (top = baselineTop for a field map)'
              % (page['page'], page['width'], page['height']))
        print('%-9s %-8s %-9s %-8s %-6s %s'
              % ('kind', 'left', 'top', 'width', 'size', 'detail'))
        for it in page['items']:
            detail = it.get('text', '') or it.get('font', '')
            if it['kind'] == 'anchor':
                detail = 'ends at %s  %r' % (it['endsAt'], it.get('text', ''))
            print('%-9s %-8s %-9s %-8s %-6s %s'
                  % (it['kind'], it['left'], it['top'],
                     it.get('width', ''), it['size'], detail))


if __name__ == '__main__':
    main()
