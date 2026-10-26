"""Measure the page geometry a dynamic layout is allowed to use.

Developer-workstation tooling; reads only committed templates and never writes
to them.

Three questions the page-level expansion budget needs answered from the real
document rather than from a guess:

  reserve      where does the movable body actually end, where does the fixed
               footer begin, and how much white space separates them;
  gaps         which vertical gaps sit between two *complete* blocks, so a
               reviewed compaction may recover part of one;
  row          what a line looks like right where a continuation row would be
               inserted — its pitch, its ink height, the weight of its rule and
               how far that rule sits below the baseline.

    python static-uikit/tools/qa/measure_page_layout.py --doc power-of-attorney
    python static-uikit/tools/qa/measure_page_layout.py --row power-of-attorney 0 156.86
    python static-uikit/tools/qa/measure_page_layout.py --out page-layout.json

The trailing block of a page is reported as a footer candidate only when it is
separated from the body by a gap several times the body's own line pitch and is
narrow — that is what a page number looks like, and a page number never moves.
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
import sys

import fitz  # pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATES = os.path.abspath(
    os.path.join(HERE, "..", "..", "assets", "document-pdf-templates")
)

# Liberation Serif / Times New Roman, the faces these forms and their overlays
# are set in. Ink height is what decides whether a generated row is tall enough.
ASCENT = 0.891
DESCENT = 0.21631
INK = ASCENT + DESCENT

# A trailing block is only a fixed footer when the body clearly ended above it.
FOOTER_GAP_FACTOR = 1.5
FOOTER_MAX_WIDTH = 120.0


def spans(page):
    """Visible text spans as (top, bottom, left, right, size, text)."""
    out = []
    for block in page.get_text("rawdict").get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = "".join(c.get("c", "") for c in span.get("chars", []))
                if text.strip():
                    x0, y0, x1, y1 = span["bbox"]
                    out.append((y0, y1, x0, x1, span["size"], text.strip()))
    return sorted(out)


def vectors(page):
    """Painted vectors as (top, bottom, left, right, thickness)."""
    out = []
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        out.append((rect.y0, rect.y1, rect.x0, rect.x1, rect.height))
    return sorted(out)


def content(page):
    return sorted([(s[0], s[1], s[2], s[3]) for s in spans(page)]
                  + [(v[0], v[1], v[2], v[3]) for v in vectors(page)])


def bands(page, minimum=3.0):
    """Blank horizontal bands across the full page width."""
    out, cursor = [], 0.0
    for top, bottom, _l, _r in content(page):
        if top - cursor >= minimum:
            out.append((round(cursor, 2), round(top, 2)))
        cursor = max(cursor, bottom)
    if page.rect.height - cursor >= minimum:
        out.append((round(cursor, 2), round(page.rect.height, 2)))
    return out


def line_pitch(rows):
    """Modal distance between consecutive text-line tops."""
    tops = sorted({round(r[0], 2) for r in rows})
    steps = [round(b - a, 2) for a, b in zip(tops, tops[1:]) if 4.0 < b - a < 40.0]
    if not steps:
        return None
    return statistics.mode(steps)


def page_layout(page, index):
    rows = spans(page)
    if not rows:
        return {"page": index, "empty": True}
    boxes = content(page)
    pitch = line_pitch(rows)
    height = page.rect.height

    top_content = round(boxes[0][0], 2)
    bottom_content = round(max(b[1] for b in boxes), 2)

    # A page number sits alone under a gap much larger than the body's pitch.
    footer_from = None
    footer_text = None
    trailing = [r for r in rows if r[1] >= bottom_content - 0.5]
    if trailing and pitch:
        above = max((b[1] for b in boxes if b[1] < trailing[0][0] - 0.5), default=None)
        width = max(r[3] for r in trailing) - min(r[2] for r in trailing)
        if (above is not None
                and trailing[0][0] - above > pitch * FOOTER_GAP_FACTOR
                and width <= FOOTER_MAX_WIDTH):
            footer_from = round(trailing[0][0], 2)
            footer_text = " ".join(r[5] for r in trailing)[:40]

    body_bottom = bottom_content
    if footer_from is not None:
        body_bottom = round(max(b[1] for b in boxes if b[1] <= footer_from - 0.5), 2)

    # Gaps between two complete blocks — candidates for reviewed compaction.
    #
    # The blank left between two lines of the same paragraph is the page's modal
    # blank band; anything markedly larger separates two complete blocks. Using
    # the measured modal blank rather than a fraction of the line pitch keeps
    # dense justified prose (6.4 pt blanks at an 18.1 pt pitch) out of the list.
    inner = [round(high - low, 2) for low, high in bands(page, minimum=1.0)
             if low > 0.5 and high < height - 0.5]
    modal_blank = statistics.mode(inner) if inner else 0.0
    block_gaps = []
    for low, high in bands(page, minimum=max(modal_blank * 1.5, 3.0)):
        if low <= 0.5 or high >= height - 0.5:
            continue
        if footer_from is not None and high >= footer_from - 0.5:
            continue
        block_gaps.append({"from": low, "to": high, "gap": round(high - low, 2)})

    return {
        "page": index,
        "width": round(page.rect.width, 2),
        "height": round(height, 2),
        "topMargin": top_content,
        "bodyBottom": body_bottom,
        "fixedFooterFrom": footer_from,
        "fixedFooterText": footer_text,
        "bottomReserve": round((footer_from if footer_from is not None else height)
                               - body_bottom, 2),
        "linePitch": pitch,
        "modalBlank": round(modal_blank, 2),
        "bodyFontSize": round(statistics.mode([round(r[4], 2) for r in rows]), 2),
        "blockGaps": block_gaps,
    }


def row_geometry(page, baseline_top, window=None, left=None, width=None):
    """What a printed line looks like at `baseline_top`: pitch, rule, ink.

    `left`/`width` restrict the search to the horizontal band a field occupies,
    so the rule reported is the one the value is actually typed on rather than
    whichever rule happens to come first on the same line.
    """
    rows = spans(page)
    pitch = line_pitch(rows) or 0.0
    window = window if window is not None else max(pitch, 12.0)
    near = [r for r in rows if abs((r[1] - DESCENT * r[4]) - baseline_top) <= window]
    if not near:
        near = sorted(rows, key=lambda r: abs(r[1] - baseline_top))[:3]
    size = round(statistics.mode([round(r[4], 2) for r in near]), 2)

    right = None if left is None or width is None else left + width
    rules = [v for v in vectors(page)
             if 0 < v[0] - baseline_top < window and v[4] < 2.0 and v[3] - v[2] > 5.0
             and (right is None or (v[3] > left + 0.5 and v[2] < right - 0.5))]
    rule = min(rules, key=lambda v: v[0] - baseline_top) if rules else None

    return {
        "baselineTop": round(baseline_top, 2),
        "linePitch": pitch,
        "sourceFontSize": size,
        "inkHeight": round(size * INK, 2),
        "ruleTop": None if rule is None else round(rule[0], 2),
        "ruleBelowBaseline": None if rule is None else round(rule[0] - baseline_top, 2),
        "ruleThickness": None if rule is None else round(rule[4], 2),
        "ruleLeft": None if rule is None else round(rule[2], 2),
        "ruleWidth": None if rule is None else round(rule[3] - rule[2], 2),
        # The shortest row that keeps this size's ink inside it, rounded up to
        # the half point the maps are authored in.
        "minRowHeight": round(_ceil_half(size * INK), 2),
    }


def _ceil_half(value):
    return -(-value * 2 // 1) / 2


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--doc", help="restrict to one template file stem")
    parser.add_argument("--out", help="write every measurement as JSON")
    parser.add_argument("--row", nargs="+",
                        metavar="DOC PAGE BASELINE_TOP [LEFT WIDTH]",
                        help="measure the printed line at one baseline")
    args = parser.parse_args()

    if args.row:
        doc_id, page_index, baseline = args.row[:3]
        left, width = (float(args.row[3]), float(args.row[4])) if len(args.row) >= 5 \
            else (None, None)
        document = fitz.open(os.path.join(TEMPLATES, doc_id + ".pdf"))
        measured = row_geometry(document[int(page_index)], float(baseline),
                                left=left, width=width)
        print(json.dumps(measured, ensure_ascii=False, indent=1))
        document.close()
        return 0

    stems = ([args.doc] if args.doc else
             sorted(os.path.splitext(f)[0] for f in os.listdir(TEMPLATES)
                    if f.endswith(".pdf")))
    report = {}
    for stem in stems:
        path = os.path.join(TEMPLATES, stem + ".pdf")
        if not os.path.exists(path):
            print("missing template:", path, file=sys.stderr)
            continue
        document = fitz.open(path)
        report[stem] = [page_layout(document[i], i) for i in range(document.page_count)]
        document.close()

    if args.out:
        with open(args.out, "w", encoding="utf-8") as handle:
            json.dump(report, handle, ensure_ascii=False, indent=1)

    for stem, pages in report.items():
        for entry in pages:
            if entry.get("empty"):
                continue
            footer = ("footer@%.2f «%s»" % (entry["fixedFooterFrom"],
                                            entry["fixedFooterText"])
                      if entry["fixedFooterFrom"] else "no fixed footer")
            print(f"{stem:34s} p{entry['page']}  top {entry['topMargin']:7.2f}  "
                  f"body ends {entry['bodyBottom']:7.2f}  reserve "
                  f"{entry['bottomReserve']:6.2f}  pitch {entry['linePitch']}  "
                  f"{footer}")
            for gap in entry["blockGaps"]:
                print(f"{'':38s}   block gap {gap['from']:7.2f}–{gap['to']:7.2f} "
                      f"({gap['gap']:.2f} pt)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
