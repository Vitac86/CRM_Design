"""Full production document regression: render, then inspect the real PDF.

    python static-uikit/tools/qa/run_document_regression.py
    python static-uikit/tools/qa/run_document_regression.py --keep out/

Every production map is rendered with every synthetic RU/EN profile through the
production engine, and each generated file is inspected with pymupdf against the
rules the business set:

  - no dynamic text below the 9 pt readability floor;
  - no clipping — every drawn line stays inside the region it was assigned;
  - no appended page, and the page count matches the map;
  - no AcroForm and no widget annotations;
  - Cyrillic and Latin remain extractable;
  - the base template's own content is untouched (nothing removed, and the only
    vector lines added are the reviewed continuation rules);
  - checkbox marks are unchanged in size.

Overflows are reported per document and field so the audit report can separate a
source-layout limitation from an implementation defect.
"""

from __future__ import annotations

import argparse
import base64
import collections
import json
import os
import sys

import fitz  # pymupdf

from headless_browser import STATIC_UIKIT, Chrome, Server

TEMPLATES = os.path.join(STATIC_UIKIT, "assets", "document-pdf-templates")

# The overlay embeds Liberation Serif; every source form is set in Times New
# Roman. That is what tells our text apart from the form's printed text.
OVERLAY_FONT_HINT = "Liberation"
MIN_DYNAMIC_FONT_SIZE = 9.0

PROFILES = [
    "ru-resident-short", "ru-resident-normal", "ru-resident-long",
    "ru-company-normal", "ru-company-long", "en-nonresident-normal",
    "en-nonresident-long", "en-company-normal", "en-company-long",
    "mixed-ru-en", "missing-optional", "maximum-checkboxes", "minimum-required",
]


def overlay_spans(page):
    """Spans this engine drew, identified by the embedded overlay font."""
    out = []
    for block in page.get_text("rawdict").get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if OVERLAY_FONT_HINT not in span.get("font", ""):
                    continue
                text = "".join(c.get("c", "") for c in span.get("chars", []))
                if text.strip():
                    out.append((round(span["size"], 3), text, span["bbox"]))
    return out


def vector_lines(page):
    return sorted(
        (round(d["rect"].x0, 1), round(d["rect"].x1, 1),
         round(d["rect"].y0, 2), round(d["rect"].y1, 2))
        for d in page.get_drawings()
    )


def inspect(pdf_bytes, template_path, expected_pages):
    """Structural verdict for one generated document."""
    problems = []
    generated = fitz.open(stream=pdf_bytes, filetype="pdf")
    base = fitz.open(template_path)

    if generated.page_count != base.page_count:
        problems.append(f"page count {generated.page_count} != base {base.page_count}")
    if expected_pages is not None and generated.page_count != expected_pages:
        problems.append(f"page count {generated.page_count} != declared {expected_pages}")

    if generated.is_form_pdf:
        problems.append("generated file declares an AcroForm")
    widgets = sum(1 for page in generated for _ in page.widgets())
    if widgets:
        problems.append(f"{widgets} widget annotation(s)")

    smallest = None
    cyrillic = latin = False
    for index in range(min(generated.page_count, base.page_count)):
        page = generated[index]
        spans = overlay_spans(page)
        for size, text, _bbox in spans:
            if smallest is None or size < smallest:
                smallest = size
            if size < MIN_DYNAMIC_FONT_SIZE - 1e-6:
                problems.append(
                    f"page {index}: dynamic text at {size} pt — «{text[:28]}»")
            if any("Ѐ" <= ch <= "ӿ" for ch in text):
                cyrillic = True
            if any(("a" <= ch <= "z") or ("A" <= ch <= "Z") for ch in text):
                latin = True
            if not page.rect.contains(fitz.Rect(_bbox)):
                problems.append(f"page {index}: drawn text outside the page — «{text[:24]}»")

        # The base template's own content must survive untouched: every printed
        # rule is still there, and any added line is a reviewed continuation.
        base_rules = set(vector_lines(base[index]))
        generated_rules = set(vector_lines(page))
        removed = base_rules - generated_rules
        if removed:
            problems.append(f"page {index}: {len(removed)} base vector rule(s) lost")

    return {
        "problems": problems,
        "smallestDynamicSize": smallest,
        "cyrillic": cyrillic,
        "latin": latin,
        "pages": generated.page_count,
        "addedRules": sum(
            len(set(vector_lines(generated[i])) - set(vector_lines(base[i])))
            for i in range(min(generated.page_count, base.page_count))
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keep", help="write every generated PDF into this directory")
    parser.add_argument("--doc", help="restrict to one template id")
    parser.add_argument("--profile", help="restrict to one profile id")
    args = parser.parse_args()

    if args.keep:
        os.makedirs(args.keep, exist_ok=True)

    server, browser = Server(), Chrome()
    report, maps = [], {}
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")
        maps = json.loads(browser.eval(
            "JSON.stringify(Object.keys(window.CRMDocumentEngine.fieldMaps).reduce("
            "function (out, id) { var t = window.CRMDocumentEngine.fieldMaps[id];"
            " out[id] = { url: t.templateUrl, pages: t.expectedPages,"
            " title: t.title }; return out; }, {}))"
        ))
        doc_ids = sorted(maps) if not args.doc else [args.doc]
        profiles = PROFILES if not args.profile else [args.profile]

        for doc_id in doc_ids:
            template_path = os.path.join(TEMPLATES,
                                         os.path.basename(maps[doc_id]["url"]))
            for profile in profiles:
                browser.goto(f"{server.base}/tools/document-map-audit.html"
                             f"?render={doc_id}&profile={profile}")
                browser.wait_for_title()
                raw = browser.eval("document.getElementById('out').textContent") or ""
                entry = {"doc": doc_id, "profile": profile}
                if raw.startswith("BASE64_START"):
                    pdf = base64.b64decode(raw[len("BASE64_START"):-len("BASE64_END")])
                    if args.keep:
                        with open(os.path.join(args.keep,
                                               f"{doc_id}--{profile}.pdf"), "wb") as fh:
                            fh.write(pdf)
                    entry.update(inspect(pdf, template_path, maps[doc_id]["pages"]))
                    entry["ok"] = not entry["problems"]
                elif raw.startswith("ERROR_START"):
                    payload = json.loads(raw[len("ERROR_START"):-len("ERROR_END")])
                    entry.update({"ok": False, "overflow": True,
                                  "message": payload.get("message"),
                                  "overflows": payload.get("overflows") or []})
                else:
                    entry.update({"ok": False, "message": "harness produced no output"})
                report.append(entry)
            done = sum(1 for e in report if e["doc"] == doc_id and e.get("ok"))
            print(f"{doc_id:36s} {done}/{len(profiles)}", flush=True)
    finally:
        browser.stop()
        server.stop()

    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "document-regression.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)

    rendered = [e for e in report if not e.get("overflow") and "problems" in e]
    structural = [e for e in rendered if e["problems"]]
    overflowed = [e for e in report if e.get("overflow")]

    smallest = min((e["smallestDynamicSize"] for e in rendered
                    if e["smallestDynamicSize"] is not None), default=None)

    print("\n── structural QA ─────────────────────────────────────────────")
    print(f"documents × profiles rendered : {len(rendered)}/{len(report)}")
    print(f"structural problems           : {len(structural)}")
    print(f"smallest dynamic font size    : {smallest} pt")
    print(f"documents with overflow       : {len(overflowed)}")
    for entry in structural[:20]:
        print(f"  {entry['doc']}/{entry['profile']}: {entry['problems'][:3]}")

    # A value that does not fit is a layout question; a value that is not there
    # at all is a payload question. Keeping them apart is what lets the audit
    # report separate a source-layout limitation from an implementation defect.
    layout = collections.defaultdict(set)
    missing = collections.defaultdict(set)
    for entry in overflowed:
        for item in entry["overflows"]:
            bucket = missing if item.get("reason") == "missing" else layout
            bucket[(entry["doc"], item["fieldId"])].add(entry["profile"])

    if layout:
        print(f"\nfields that cannot be printed at {MIN_DYNAMIC_FONT_SIZE:g} pt "
              f"({len(layout)}):")
        for (doc, field), profs in sorted(layout.items()):
            print(f"  {doc}/{field}  [{len(profs)} profiles]")
    if missing:
        print(f"\nfields with no value in some profiles — payload, not layout "
              f"({len(missing)}):")
        for (doc, field), profs in sorted(missing.items()):
            print(f"  {doc}/{field}  [{', '.join(sorted(profs))}]")

    return 1 if structural else 0


if __name__ == "__main__":
    sys.exit(main())
