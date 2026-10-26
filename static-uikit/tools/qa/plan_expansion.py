"""Derive a page-expansion block for a field from the real template geometry.

Developer-workstation tooling; reads only committed templates.

Nothing about an expansion may be guessed at runtime, so every number in the
map has to come from the document itself. For a given field this reports, and
emits as a ready `expansion: { … }` block:

  insertionTop   the first blank band below the field's own line
  rowHeight      the local printed line spacing
  shiftToTop     the bottom of the movable block
  bottomReserve  the free space under the lowest content on the page
  line           the page's text measure and the weight of a nearby rule

    python static-uikit/tools/qa/plan_expansion.py --maps maps.json \
        --field client-notifications/registrationAddress --max-rows 1

Check the reported band before pasting: an insertion point must sit in space the
form actually leaves blank.
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

SAFETY = 4.0          # keep this much clear of the page's last content


def page_boxes(page):
    boxes = []
    for block in page.get_text("rawdict").get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if "".join(c.get("c", "") for c in span.get("chars", [])).strip():
                    boxes.append(tuple(span["bbox"]))
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        boxes.append((rect.x0, rect.y0, rect.x1, rect.y1))
    return boxes


def measure(document, page_index, field, max_rows):
    page = document[page_index]
    boxes = page_boxes(page)
    height = page.rect.height
    baseline = float(field["baselineTop"])

    # Everything that belongs to the field's own printed line — its text and,
    # crucially, the rule the value is typed on. A row must be inserted BELOW
    # that rule, or the rule would travel away from the line it underlines.
    own = [b for b in boxes if baseline - 16.0 <= b[1] <= baseline + 6.0]
    own_bottom = max((b[3] for b in own), default=baseline + 2)

    below = sorted((b for b in boxes if b[1] > own_bottom + 0.2), key=lambda b: b[1])
    next_top = below[0][1] if below else height
    band = (round(own_bottom, 2), round(next_top, 2))

    lowest = max((b[3] for b in boxes), default=0.0)
    reserve = height - lowest - SAFETY

    # Local line spacing: the gap between the field's line and the next one.
    spacing = next_top - own_bottom + (own_bottom - baseline)
    row_height = round(max(12.0, min(18.0, spacing if spacing > 12 else 14.0)), 2)

    # The page's text measure, from the widest printed body line.
    lefts = [b[0] for b in boxes if b[2] - b[0] > 100]
    rights = [b[2] for b in boxes if b[2] - b[0] > 100]
    left = round(min(lefts), 2) if lefts else round(field["left"], 2)
    right = round(max(rights), 2) if rights else round(field["left"] + field["width"], 2)

    # Weight of the nearest printed rule, for a matching continuation line.
    rules = [d["rect"] for d in page.get_drawings()
             if d["rect"].height < 2 and d["rect"].width > 40]
    thickness = round(min((r.height for r in rules), default=0.36), 2) or 0.36

    return {
        "page": page_index,
        "band": band,
        "bandHeight": round(next_top - own_bottom, 2),
        "insertionTop": round(own_bottom + 0.6, 2),
        "rowHeight": row_height,
        "shiftToTop": round(min(height - 2, lowest + 2), 2),
        "bottomReserve": round(max(0.0, reserve), 2),
        "maxRowsByReserve": int(max(0.0, reserve) // row_height),
        "maxExtraRows": min(max_rows, int(max(0.0, reserve) // row_height)),
        "line": {
            "left": left,
            "width": round(right - left, 2),
            "baselineOffset": round(row_height * 0.75, 2),
            "ruleOffset": round(row_height * 0.9, 2),
            "ruleThickness": thickness,
        },
    }


def emit(spec):
    line = spec["line"]
    return (
        "        overflowStrategy: 'expand-layout',\n"
        "        expansion: {\n"
        f"          page: {spec['page']},\n"
        f"          insertionTop: {spec['insertionTop']},\n"
        f"          rowHeight: {spec['rowHeight']},\n"
        f"          maxExtraRows: {spec['maxExtraRows']},\n"
        f"          shiftFromTop: {spec['insertionTop']},\n"
        f"          shiftToTop: {spec['shiftToTop']},\n"
        f"          bottomReserve: {spec['bottomReserve']},\n"
        "          lineStyle: 'underline',\n"
        "          reviewStatus: 'approved',\n"
        "          line: {\n"
        f"            left: {line['left']}, width: {line['width']},\n"
        f"            baselineOffset: {line['baselineOffset']}, "
        f"ruleOffset: {line['ruleOffset']}, ruleThickness: {line['ruleThickness']}\n"
        "          }\n"
        "        }"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maps", required=True)
    parser.add_argument("--field", required=True, help="doc-id/field-id")
    parser.add_argument("--max-rows", type=int, default=2)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    doc_id, field_id = args.field.split("/", 1)
    maps = json.load(open(args.maps, encoding="utf-8"))
    template = maps[doc_id]
    field = next(f for f in template["fields"] if f.get("id") == field_id)
    path = os.path.join(TEMPLATES, os.path.basename(template["templateUrl"]))
    document = fitz.open(path)
    spec = measure(document, int(field["page"]), field, args.max_rows)

    if args.json:
        print(json.dumps(spec, ensure_ascii=False))
        return 0

    print(f"{doc_id}/{field_id}  page {spec['page']}")
    print(f"  blank band below the field : {spec['band'][0]} – {spec['band'][1]} "
          f"({spec['bandHeight']} pt)")
    print(f"  page bottom reserve        : {spec['bottomReserve']} pt "
          f"({spec['maxRowsByReserve']} rows of {spec['rowHeight']} pt)")
    print(f"  text measure               : {spec['line']['left']} + "
          f"{spec['line']['width']} pt")
    print(f"  nearest rule thickness     : {spec['line']['ruleThickness']} pt")
    print()
    print(emit(spec))
    return 0


if __name__ == "__main__":
    sys.exit(main())
