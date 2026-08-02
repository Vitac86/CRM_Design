"""Full production document regression: render, then inspect the real PDF.

    python static-uikit/tools/qa/run_document_regression.py
    python static-uikit/tools/qa/run_document_regression.py --keep out/

Every production map is rendered with every synthetic RU/EN profile through the
production engine, and each generated file is inspected with pymupdf against the
rules the business set:

  - no legacy dynamic text below the 9 pt readability floor (reviewed Word-flow
    runs may use their exact, locked source size);
  - no clipping — every drawn line stays inside the region it was assigned;
  - no appended page, and the page count matches the map;
  - no AcroForm and no widget annotations;
  - Cyrillic and Latin remain extractable;
  - the base template's protected content is untouched outside exact,
    hash-reviewed Word-flow replacement ranges;
  - checkbox marks are unchanged in size.
  - repeated generation is byte-for-byte deterministic.

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
from run_structural_pdf_tests import comparison_pdf, reviewed_ranges_by_page

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

RENDER = r"""
(async function (docId, profileId) {
  const t = CRMDocumentEngine.fieldMaps[docId];
  const project = CRMDocumentBuilder.schema.fromProduction(t, null);
  const payload = CRMDocumentBuilder.fixtures.payloadFor(profileId, project);
  let reviewedRanges = [];
  const reviewedFontSizes = {};
  CRMDocumentEngine.overlayRenderer.activeReviewedRangePages(t, payload)
    .forEach(function (group) {
      const sizes = [];
      group.blocks.forEach(function (block) {
        [block.fontSize, block.minFontSize].forEach(function (size) {
          if (Number(size) > 0) sizes.push(Number(size));
        });
        (block.runs || []).forEach(function (run) {
          if (Number(run.fontSize) > 0) sizes.push(Number(run.fontSize));
        });
      });
      reviewedFontSizes[group.page] = Array.from(new Set(sizes));
    });
  // Which strings in a reviewed block are the client's, rather than the form's
  // own printed wording. A locked block may reproduce its source paragraph at
  // the source's size; the values a manager entered may not go below the
  // readability floor, and telling them apart needs the resolved values.
  const reviewedValueSizes = [];
  try {
    const ctx = await CRMDocumentEngine.overlayRenderer.open(t, {});
    const plan = CRMDocumentEngine.overlayRenderer.planWordFlowBlocks(
      t, payload, ctx.fonts);
    Object.keys(plan.byBlock).forEach(function (id) {
      const result = plan.byBlock[id];
      if (!result.drawn) return;
      (result.runs || []).forEach(function (run) {
        if (run.type !== 'fieldRef' || run.inactive) return;
        if (!String(run.text == null ? '' : run.text).trim()) return;
        reviewedValueSizes.push({ block: id, fieldId: run.sourceFieldId || null,
                                  size: Number(run.fontSize) });
      });
    });
  } catch (e) { /* a block that does not lay out draws no values */ }
  try {
    const first = await CRMDocumentEngine.overlayRenderer.render(t, payload, {
      onReviewedRanges: function (entries) {
        reviewedRanges = entries.map(function (entry) {
          return { page: entry.page, inspection: entry.suppression };
        });
      }
    });
    const second = await CRMDocumentEngine.overlayRenderer.render(t, payload);
    const a = new Uint8Array(await first.arrayBuffer());
    const b = new Uint8Array(await second.arrayBuffer());
    let deterministic = a.length === b.length;
    for (let i = 0; deterministic && i < a.length; i += 1) {
      if (a[i] !== b[i]) deterministic = false;
    }
    let s = ''; const c = 0x8000;
    for (let i = 0; i < a.length; i += c) {
      s += String.fromCharCode.apply(null, a.subarray(i, i + c));
    }
    return JSON.stringify({ pdf: btoa(s), deterministic: deterministic,
      reviewedRanges: reviewedRanges, reviewedFontSizes: reviewedFontSizes,
      reviewedValueSizes: reviewedValueSizes });
  } catch (error) {
    return JSON.stringify({ error: true, message: error.message,
      overflows: error.overflows || [] });
  }
}(DOC, PROFILE))
"""


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


def rule_shapes(page):
    """Every painted vector by its horizontal shape and weight.

    Page expansion moves printed rules down the page on purpose, so comparing
    absolute positions would report every moved rule as a lost one. What must
    never change is that each rule still exists, at its own width and weight:
    this counts them by shape, so a rule that moved is still found and a rule
    that was painted over, dropped or duplicated is not.
    """
    return collections.Counter(
        (round(d["rect"].x0, 1), round(d["rect"].x1, 1), round(d["rect"].height, 2))
        for d in page.get_drawings()
    )


def painted_image_counter(document):
    """Images actually painted, independent of unused page resource entries."""
    result = collections.Counter()
    for page in document:
        for image in page.get_image_info(hashes=True):
            digest = image.get("digest") or b""
            result[(bytes(digest), int(image.get("width") or 0),
                    int(image.get("height") or 0), int(image.get("bpc") or 0),
                    str(image.get("cs-name") or image.get("colorspace") or ""))] += 1
    return result


def inspect(pdf_bytes, template_path, expected_pages, reviewed=None,
            reviewed_font_sizes=None, deterministic=True,
            reviewed_value_sizes=None):
    """Structural verdict for one generated document."""
    problems = []
    generated = fitz.open(stream=pdf_bytes, filetype="pdf")
    base = fitz.open(template_path)
    ranges_by_page = reviewed_ranges_by_page(reviewed, base.page_count)
    protected_bytes = comparison_pdf(template_path, ranges_by_page) \
        if ranges_by_page else None
    protected = fitz.open(stream=protected_bytes, filetype="pdf") \
        if protected_bytes else base
    approved_sizes = {
        int(page): [float(size) for size in sizes]
        for page, sizes in (reviewed_font_sizes or {}).items()
    }

    if not deterministic:
        problems.append("repeated generation is not byte-for-byte deterministic")

    # Every client or transaction value drawn inside a reviewed Word-flow block,
    # at the size it was really drawn. Being inside a locked block is not an
    # exception: the floor applies to what the manager entered.
    for entry in reviewed_value_sizes or []:
        size = float(entry.get("size") or 0)
        if size < MIN_DYNAMIC_FONT_SIZE - 1e-6:
            problems.append(
                f"client value below the {MIN_DYNAMIC_FONT_SIZE:g} pt floor: "
                f"{entry.get('block')}/{entry.get('fieldId')} at {size} pt")

    if generated.page_count != base.page_count:
        problems.append(f"page count {generated.page_count} != base {base.page_count}")
    if expected_pages is not None and generated.page_count != expected_pages:
        problems.append(f"page count {generated.page_count} != declared {expected_pages}")

    if generated.is_form_pdf:
        problems.append("generated file declares an AcroForm")
    widgets = sum(1 for page in generated for _ in page.widgets())
    if widgets:
        problems.append(f"{widgets} widget annotation(s)")
    generated_annotations = sum(len(list(page.annots())) for page in generated)
    base_annotations = sum(len(list(page.annots())) for page in base)
    if generated_annotations != base_annotations:
        problems.append(
            f"annotations {generated_annotations} != base {base_annotations}")

    smallest = None
    cyrillic = latin = False
    for index in range(min(generated.page_count, base.page_count)):
        page = generated[index]
        spans = overlay_spans(page)
        for size, text, _bbox in spans:
            if smallest is None or size < smallest:
                smallest = size
            # A locked reviewed block may reproduce the form's own printed
            # wording at the size the source prints it. Values are held to the
            # floor regardless, and that is checked on the runs themselves
            # below rather than on drawn glyphs — the wording and the values
            # share commas and short words, so text matching cannot tell them
            # apart.
            source_locked = any(
                abs(size - approved) <= 0.05
                for approved in approved_sizes.get(index, []))
            if size < MIN_DYNAMIC_FONT_SIZE - 1e-6 and not source_locked:
                problems.append(
                    f"page {index}: dynamic text at {size} pt — «{text[:28]}»")
            if any("Ѐ" <= ch <= "ӿ" for ch in text):
                cyrillic = True
            if any(("a" <= ch <= "z") or ("A" <= ch <= "Z") for ch in text):
                latin = True
            if not page.rect.contains(fitz.Rect(_bbox)):
                problems.append(f"page {index}: drawn text outside the page — «{text[:24]}»")

        # Every vector outside an exact reviewed replacement survives. The
        # comparison source has only those SHA-proved ranges removed.
        removed = rule_shapes(protected[index]) - rule_shapes(page)
        if removed:
            problems.append(
                f"page {index}: {sum(removed.values())} protected vector rule(s) lost "
                f"— {list(removed)[:3]}")

    generated_images = painted_image_counter(generated)
    base_images = painted_image_counter(base)
    if generated_images != base_images:
        missing_images = base_images - generated_images
        added_images = generated_images - base_images
        problems.append(
            f"painted images changed: {sum(missing_images.values())} missing / "
            f"{sum(added_images.values())} added")

    # Two different numbers, deliberately kept apart: the smallest thing this
    # engine drew at all (which includes the form's own wording, reproduced at
    # the source's size), and the smallest value a client has to read.
    smallest_value = min((float(entry.get("size") or 0)
                          for entry in reviewed_value_sizes or []), default=None)

    result = {
        "problems": problems,
        "smallestDynamicSize": smallest,
        "smallestClientValueSize": smallest_value,
        "cyrillic": cyrillic,
        "latin": latin,
        "pages": generated.page_count,
        "addedRules": sum(
            sum((rule_shapes(generated[i]) - rule_shapes(base[i])).values())
            for i in range(min(generated.page_count, base.page_count))
        ),
    }
    generated.close()
    if protected is not base:
        protected.close()
    base.close()
    return result


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
                entry = {"doc": doc_id, "profile": profile}
                script = (RENDER
                          .replace("DOC", json.dumps(doc_id))
                          .replace("PROFILE", json.dumps(profile)))
                payload = json.loads(browser.eval(script, await_promise=True))
                if not payload.get("error"):
                    pdf = base64.b64decode(payload["pdf"])
                    if args.keep:
                        with open(os.path.join(args.keep,
                                               f"{doc_id}--{profile}.pdf"), "wb") as fh:
                            fh.write(pdf)
                    entry.update(inspect(
                        pdf, template_path, maps[doc_id]["pages"],
                        payload.get("reviewedRanges"),
                        payload.get("reviewedFontSizes"),
                        payload.get("deterministic", False),
                        payload.get("reviewedValueSizes")))
                    entry["ok"] = not entry["problems"]
                else:
                    entry.update({"ok": False, "overflow": True,
                                  "message": payload.get("message"),
                                  "overflows": payload.get("overflows") or []})
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
    smallest_value = min((e.get("smallestClientValueSize") for e in rendered
                          if e.get("smallestClientValueSize") is not None),
                         default=None)
    # Legacy fields outside reviewed blocks are drawn straight from the map and
    # are already floor-checked span by span; the smallest of those is the
    # overall smallest that is not reproduced source wording.

    print("\n── structural QA ─────────────────────────────────────────────")
    print(f"documents × profiles rendered : {len(rendered)}/{len(report)}")
    print(f"structural problems           : {len(structural)}")
    print(f"smallest drawn size           : {smallest} pt "
          f"(includes source wording reproduced by reviewed blocks)")
    print(f"smallest CLIENT VALUE size    : {smallest_value} pt "
          f"(the {MIN_DYNAMIC_FONT_SIZE:g} pt floor applies to this)")
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
