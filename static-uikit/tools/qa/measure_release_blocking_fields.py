"""What the authoritative PDF really gives each release-blocking field.

    python static-uikit/tools/qa/measure_release_blocking_fields.py

Reads `ordinary-substitutions.json` (from `audit_ordinary_substitutions.py`)
and, for every field an ordinary value could not fit, prints what the committed
PDF actually gives it: the printed text overlapping the slot horizontally, and
the rules and cell borders around it.

This exists because blank paper under a slot is not evidence that the slot may
use it. The band may belong to the next field, to a table's padding, to
paragraph spacing or to a signature area, and only the printed content around
it says which. Every layout change to these fields has to start here.
"""
from __future__ import annotations

import json
import os
import sys

import fitz

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATES = os.path.abspath(
    os.path.join(HERE, "..", "..", "assets", "document-pdf-templates"))
AUDIT = os.path.join(HERE, "ordinary-substitutions.json")


def main() -> int:
    with open(AUDIT, encoding="utf-8") as fh:
        rows = [r for r in json.load(fh)["fields"] if r["reachedByOrdinary"]]

    for row in rows:
        doc_id, field_id = row["documentId"], row["fieldId"]
        page_no = row["page"]
        left, width = row["slotLeft"], row["slotWidth"]
        pdf = os.path.join(TEMPLATES, doc_id + ".pdf")
        if not os.path.isfile(pdf) or page_no is None:
            print(f"\n=== {doc_id}/{field_id} — no template/page")
            continue
        document = fitz.open(pdf)
        page = document[page_no]

        # The field's own baseline is where the map draws; find printed content
        # around the horizontal band it occupies.
        print(f"\n=== {doc_id}/{field_id}  [{row['valueCategory']}] page {page_no + 1}")
        print(f"    slot left={left} width={width} "
              f"font={row['preferredFontSize']}/{row['minimumFontSize']} "
              f"multiline={row['multiline']} maxLines={row['existingLines']} "
              f"maxHeight={row['maxHeight']} regions={row['existingContinuationRegions']}")
        print(f"    ordinary value: {row['ordinaryRequestedLength']} ch "
              f"-> rendered {row['ordinaryRenderedLength']} ch")
        print(f"    requested: {str(row['ordinaryRequested'])[:70]!r}")

        if left is None or width is None:
            print("    (a Word-flow block: measured by its frame, see the map)")
            document.close()
            continue

        x0, x1 = float(left), float(left) + float(width)
        # Everything printed that horizontally overlaps the slot.
        near = []
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    bx0, by0, bx1, by1 = span["bbox"]
                    if bx1 < x0 - 4 or bx0 > x1 + 4:
                        continue
                    near.append((round(by0, 2), round(by1, 2), round(bx0, 2),
                                 round(bx1, 2), round(span["size"], 2),
                                 span["text"][:46]))
        near.sort()
        rules = []
        for drawing in page.get_drawings():
            rect = drawing["rect"]
            if rect.x1 < x0 - 4 or rect.x0 > x1 + 4:
                continue
            if rect.height > 6:            # a box, not a rule
                rules.append(("box", round(rect.y0, 2), round(rect.y1, 2),
                              round(rect.x0, 2), round(rect.x1, 2)))
            else:
                rules.append(("rule", round(rect.y0, 2), round(rect.y1, 2),
                              round(rect.x0, 2), round(rect.x1, 2)))
        rules.sort(key=lambda r: r[1])

        print("    printed text overlapping the slot horizontally:")
        for by0, by1, bx0, bx1, size, text in near[:14]:
            print(f"       y {by0:7.2f}-{by1:7.2f}  x {bx0:6.1f}-{bx1:6.1f} "
                  f"{size:5.2f}  {text!r}")
        print("    rules and borders overlapping the slot horizontally:")
        for kind, ry0, ry1, rx0, rx1 in rules[:12]:
            print(f"       {kind:4s} y {ry0:7.2f}-{ry1:7.2f}  x {rx0:6.1f}-{rx1:6.1f}")
        document.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
