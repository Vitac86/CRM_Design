"""Compare every mapped field width against the printed blank it sits in.

Developer-workstation tooling; reads only committed templates.

Before deciding that a value "does not fit", check that the map measured the
slot correctly in the first place. For each text field this reports the real
horizontal gap on its own baseline — from whatever is printed to its left to
whatever is printed to its right — next to the width the field map claims.

    python static-uikit/tools/qa/measure_slot_widths.py --maps maps.json
    python static-uikit/tools/qa/measure_slot_widths.py --maps maps.json --doc power-of-attorney

A field whose mapped width is materially narrower than the printed blank is a
mapping correction, not a layout problem.
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

# A span counts as "on the same line" when its baseline is within this many
# points of the field's.
LINE_TOLERANCE = 4.0


def line_items(page):
    """Printed spans and short vector rules, with their baselines."""
    items = []
    for block in page.get_text("rawdict").get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = "".join(c.get("c", "") for c in span.get("chars", []))
                if not text.strip():
                    continue
                # Word writes fill-in rules as runs of underscores; those are
                # the blank, not an obstacle.
                blank = set(text.strip()) <= set("_ ")
                items.append({
                    "x0": span["bbox"][0], "x1": span["bbox"][2],
                    "baseline": span["bbox"][3], "text": text.strip()[:24],
                    "blank": blank,
                })
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        if rect.height < 2.5 and rect.width > 8:
            items.append({
                "x0": rect.x0, "x1": rect.x1, "baseline": rect.y1,
                "text": "<rule>", "blank": True,
            })
    return items


def slot_for(items, left, width, baseline):
    """The printed blank a field sits in: nearest obstacle each side."""
    right = left + width
    near = [i for i in items if abs(i["baseline"] - baseline) <= LINE_TOLERANCE]
    rules = [i for i in near if i["blank"] and i["x1"] > left - 2 and i["x0"] < right + 2]

    obstacles = [i for i in near if not i["blank"]]
    before = [i["x1"] for i in obstacles if i["x1"] <= left + 1.0]
    after = [i["x0"] for i in obstacles if i["x0"] >= right - 1.0]

    start = max(before) if before else None
    end = min(after) if after else None

    # An explicit underscore run or rule is the most reliable answer.
    if rules:
        start = min(r["x0"] for r in rules)
        end = max(r["x1"] for r in rules)

    if start is None or end is None or end <= start:
        return None
    return {"left": round(start, 2), "right": round(end, 2),
            "width": round(end - start, 2),
            "source": "rule" if rules else "neighbours"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maps", required=True)
    parser.add_argument("--doc")
    parser.add_argument("--min-gain", type=float, default=4.0,
                        help="only report a correction worth at least this many pt")
    parser.add_argument("--out")
    args = parser.parse_args()

    maps = json.load(open(args.maps, encoding="utf-8"))
    findings = []

    for doc_id, template in sorted(maps.items()):
        if args.doc and doc_id != args.doc:
            continue
        path = os.path.join(TEMPLATES, os.path.basename(template["templateUrl"]))
        if not os.path.exists(path):
            continue
        document = fitz.open(path)
        cache = {}
        for field in template.get("fields", []):
            if field.get("type", "text") == "check":
                continue
            page = field["page"]
            if page not in cache:
                cache[page] = line_items(document[page])
            slot = slot_for(cache[page], field["left"], field["width"],
                            field["baselineTop"])
            if not slot:
                continue
            gain = slot["width"] - field["width"]
            findings.append({
                "doc": doc_id, "id": field["id"], "page": page,
                "mappedLeft": field["left"], "mappedWidth": field["width"],
                "printedLeft": slot["left"], "printedWidth": slot["width"],
                "gain": round(gain, 2), "via": slot["source"],
            })
        document.close()

    if args.out:
        with open(args.out, "w", encoding="utf-8") as handle:
            json.dump(findings, handle, ensure_ascii=False, indent=1)

    corrections = [f for f in findings if f["gain"] >= args.min_gain]
    print(f"fields measured: {len(findings)}")
    print(f"mapped narrower than the printed blank by >= {args.min_gain} pt: "
          f"{len(corrections)}\n")
    for finding in sorted(corrections, key=lambda f: -f["gain"]):
        print(f"  {finding['doc']:34s} {finding['id']:32s} p{finding['page']} "
              f"mapped {finding['mappedLeft']:7.2f}+{finding['mappedWidth']:6.2f}  "
              f"printed {finding['printedLeft']:7.2f}+{finding['printedWidth']:6.2f}  "
              f"+{finding['gain']:6.2f} pt ({finding['via']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
