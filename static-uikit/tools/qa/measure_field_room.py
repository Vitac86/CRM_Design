"""Measure the physical room every mapped field has in its authoritative PDF.

Developer-workstation tooling; reads only committed templates and never writes
to them.

Two questions the field maps need answered from the real document rather than
from a guess:

  room     how tall may this field's text be before it touches whatever is
           printed above or below it — this is what decides whether a slot can
           accept the preferred 12 pt at all;
  gaps     where, inside a horizontal band, is the page actually blank — this is
           where an explicitly reviewed continuation line may be placed.

    python static-uikit/tools/qa/measure_field_room.py --maps maps.json
    python static-uikit/tools/qa/measure_field_room.py --gaps accession-application-fl 0 56 558 138 220

`maps.json` is produced by tools/qa/dump_field_maps.py.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import fitz  # pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATES = os.path.abspath(
    os.path.join(HERE, "..", "..", "assets", "document-pdf-templates")
)

# Liberation Serif, the face every overlay embeds. Metric-compatible with the
# Times New Roman the source forms are set in.
ASCENT = 0.891
DESCENT = 0.21631

# The form's own printed rule sits just under the baseline; descenders touching
# it is exactly what "typed on the line" looks like, so it is not an obstacle.
RULE_TOLERANCE = 3.0


def obstacles(page):
    """Everything printed on the page, as (x0, y0, x1, y1, what), top-based."""
    boxes = []
    for block in page.get_text("rawdict").get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = "".join(c.get("c", "") for c in span.get("chars", []))
                if text.strip():
                    boxes.append(tuple(span["bbox"]) + (text.strip()[:40],))
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        boxes.append((rect.x0, rect.y0, rect.x1, rect.y1, "<vector>"))
    return boxes


def clearance(boxes, left, width, baseline, multiline=False):
    """Vertical room above and below a baseline inside a horizontal band."""
    right = left + width
    above = below = None
    above_what = below_what = None
    for (x0, y0, x1, y1, what) in boxes:
        if x1 <= left + 0.5 or x0 >= right - 0.5:
            continue
        if y1 <= baseline - 0.5:
            gap = baseline - y1
            if above is None or gap < above:
                above, above_what = gap, what
        elif y0 >= baseline + RULE_TOLERANCE:
            gap = y0 - baseline
            if below is None or gap < below:
                below, below_what = gap, what
    by_above = above / ASCENT if above is not None else 99.0
    by_below = 99.0 if multiline else (below / DESCENT if below is not None else 99.0)
    return {
        "above": None if above is None else round(above, 2),
        "below": None if below is None else round(below, 2),
        "aboveWhat": above_what,
        "belowWhat": below_what,
        "room": round(min(by_above, by_below, 99.0), 2),
    }


def gaps(boxes, left, right, top, bottom, minimum=8.0):
    """Blank horizontal bands inside a rectangle — candidate continuation lines."""
    spans = []
    for (x0, y0, x1, y1, _what) in boxes:
        if x1 <= left + 0.5 or x0 >= right - 0.5:
            continue
        if y1 < top or y0 > bottom:
            continue
        spans.append((max(top, y0), min(bottom, y1)))
    spans.sort()
    free, cursor = [], top
    for y0, y1 in spans:
        if y0 - cursor >= minimum:
            free.append((round(cursor, 2), round(y0, 2)))
        cursor = max(cursor, y1)
    if bottom - cursor >= minimum:
        free.append((round(cursor, 2), round(bottom, 2)))
    return free


def report_maps(maps_path):
    maps = json.load(open(maps_path, encoding="utf-8"))
    out = {}
    for doc_id, template in sorted(maps.items()):
        pdf = os.path.join(TEMPLATES, os.path.basename(template["templateUrl"]))
        if not os.path.exists(pdf):
            print("missing template:", pdf, file=sys.stderr)
            continue
        document = fitz.open(pdf)
        cache, rows = {}, []
        for field in template.get("fields", []):
            if field.get("type", "text") == "check":
                continue
            page = field["page"]
            if page not in cache:
                cache[page] = obstacles(document[page])
            measured = clearance(cache[page], field["left"], field["width"],
                                 field["baselineTop"], bool(field.get("multiline")))
            measured.update({
                "doc": doc_id, "id": field["id"], "page": page,
                "fontSize": field.get("fontSize"),
                "minFontSize": field.get("minFontSize"),
                "width": field["width"],
                "multiline": bool(field.get("multiline")),
            })
            rows.append(measured)
        document.close()
        out[doc_id] = rows
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maps", help="maps.json from dump_field_maps.py")
    parser.add_argument("--out", help="write the measurements as JSON")
    parser.add_argument("--gaps", nargs=6,
                        metavar=("DOC", "PAGE", "LEFT", "RIGHT", "TOP", "BOTTOM"),
                        help="list blank bands inside a rectangle")
    args = parser.parse_args()

    if args.gaps:
        doc_id, page, left, right, top, bottom = args.gaps
        pdf = os.path.join(TEMPLATES, doc_id + ".pdf")
        document = fitz.open(pdf)
        boxes = obstacles(document[int(page)])
        for y0, y1 in gaps(boxes, float(left), float(right), float(top), float(bottom)):
            print(f"blank band  top={y0:8.2f}  bottom={y1:8.2f}  height={y1 - y0:6.2f}")
        document.close()
        return 0

    if not args.maps:
        parser.error("--maps or --gaps is required")

    measurements = report_maps(args.maps)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as handle:
            json.dump(measurements, handle, ensure_ascii=False, indent=1)

    buckets = {">=12": 0, "11-12": 0, "10-11": 0, "9-10": 0, "<9": 0}
    for rows in measurements.values():
        for row in rows:
            room = row["room"]
            buckets[">=12" if room >= 12 else "11-12" if room >= 11
                    else "10-11" if room >= 10 else "9-10" if room >= 9 else "<9"] += 1
    print("vertical room per field:", buckets)
    for rows in measurements.values():
        for row in rows:
            if row["room"] < 9:
                print(f"  tight  {row['doc']}/{row['id']}: room={row['room']} "
                      f"above={row['above']} below={row['below']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
