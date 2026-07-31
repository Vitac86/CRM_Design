"""Does a generated row look like a row the form printed itself?

    python static-uikit/tools/qa/run_visual_geometry_tests.py
    python static-uikit/tools/qa/run_visual_geometry_tests.py --keep out/

"Visually approved" has to mean something a machine can also check, or the
approval is only a memory of one afternoon. Every claim the visual review makes
about a generated row is measured here against the page it was drawn on:

  * the rule has the weight the form uses on that page, and starts and ends on
    the page's own text measure;
  * the text sits ON the rule — above it, with its descenders clear of it, at
    the same distance the printed rules use;
  * several generated rows keep one pitch;
  * a row is drawn only where text landed, so no empty rule appears;
  * nothing generated covers printed text, a signature block or a page number;
  * a table row's verticals continue the printed ones, at the printed x.

The renderings are the synthetic QA examples §23 asks for: none, one and the
maximum number of rows, two anchors on one page, both power-of-attorney
variants, a company name, an address. `--keep` writes them out for a human to
look at; nothing is committed, because they are outputs, not sources.
"""

from __future__ import annotations

import argparse
import base64
import collections
import json
import os
import re
import sys

import fitz  # pymupdf

from headless_browser import STATIC_UIKIT, Chrome, Server

TEMPLATES = os.path.join(STATIC_UIKIT, "assets", "document-pdf-templates")
OVERLAY_FONT_HINT = "Liberation"

ASCENT = 0.891
DESCENT = 0.21631

RENDER = r"""
(async function (docId, profileId, overrides) {
  const t = CRMDocumentEngine.fieldMaps[docId];
  const project = CRMDocumentBuilder.schema.fromProduction(t, null);
  const payload = CRMDocumentBuilder.fixtures.payloadFor(profileId, project);
  Object.keys(overrides).forEach(function (path) {
    const dot = path.indexOf('.');
    const ns = path.slice(0, dot), key = path.slice(dot + 1);
    const target = ns === 'subject' ? payload.subject : ns === 'field' ? payload.fields
      : ns === 'extra' ? payload.extraValues : payload.checks;
    target[key] = overrides[path];
  });
  const notes = [];
  const blob = await CRMDocumentEngine.overlayRenderer.render(t, payload, {
    onExpansion: function (l) { l.forEach(function (n) { notes.push(n); }); } });
  const u8 = new Uint8Array(await blob.arrayBuffer());
  let s = ''; const c = 0x8000;
  for (let i = 0; i < u8.length; i += c) s += String.fromCharCode.apply(null, u8.subarray(i, i + c));
  return JSON.stringify({ pdf: btoa(s), notes: notes, url: t.templateUrl });
}(DOC, PROFILE, OVERRIDES))
"""

RU_COMPANY = "Публичное акционерное общество «Международные инвестиционные решения»"
EN_ADDRESS = ("27 King George the Fifth Avenue, London, United Kingdom, SW1A 2AA")

# name, doc, profile, overrides, what the example is for
CASES = [
    ("no expansion", "qualification-notice", "ru-resident-normal",
     {"field.client-full-name": "Иванов И.И."}),
    ("one inserted row", "qualification-notice", "ru-company-normal",
     {"field.client-full-name": "АО «Международные инвестиционные технологии»"}),
    ("maximum approved rows", "qualification-notice", "ru-company-normal",
     {"field.client-full-name": RU_COMPANY}),
    ("two anchors on one page", "power-of-attorney", "en-company-normal", {}),
    ("power of attorney, ЮЛ", "power-of-attorney", "ru-company-normal", {}),
    ("power of attorney, ФЛ", "power-of-attorney", "ru-resident-normal", {}),
    ("company name in a table", "order-forms", "ru-company-normal",
     {"field.client-full-name": RU_COMPANY}),
    ("address in a table row", "anketa-fl", "en-nonresident-normal",
     {"extra.bank-address": EN_ADDRESS}),
    ("consequences notice, long name", "qualification-consequences-notice",
     "ru-resident-long", {}),
]


class Checks:
    def __init__(self):
        self.results = []

    def check(self, name, ok, detail=""):
        self.results.append((name, bool(ok), str(detail)))
        return bool(ok)

    def report(self):
        failed = [r for r in self.results if not r[1]]
        for name, ok, detail in self.results:
            if not ok:
                print(f"FAIL  {name}\n      {detail[:300]}")
        print(f"\nVisual geometry: {len(self.results) - len(failed)}"
              f"/{len(self.results)} checks passed")
        return 1 if failed else 0


def weight_of(drawing):
    """The visible weight of a painted vector.

    A rule the form printed is a filled rectangle, so its weight is the height
    of that rectangle. A rule this engine draws is a stroked line, whose path
    rectangle has no height at all — its weight is the stroke width. Comparing
    the two without this returns 0 for every generated rule.
    """
    rect = drawing["rect"]
    if drawing.get("type") in ("s", "sf", "fs") and drawing.get("width"):
        return round(float(drawing["width"]), 2)
    return round(rect.height, 2)


def rules(page):
    """Thin horizontal painted vectors: (top, left, right, weight)."""
    out = []
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        if rect.height < 2.0 and rect.width > 5.0:
            out.append((round(rect.y0, 2), round(rect.x0, 2), round(rect.x1, 2),
                        weight_of(drawing)))
    return sorted(out)


def generated_rules(page, base_page):
    """The rules this engine drew, told apart from the ones that only moved.

    A printed rule that travels down with its block has a new position but the
    same shape, so position alone cannot distinguish the two. A rule whose
    left/right/weight shape does not occur in the template at all is ours.
    """
    shapes = collections.Counter(r[1:] for r in rules(base_page))
    return sorted(r for r in rules(page) if not shapes[r[1:]])


def verticals(page):
    out = []
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        if rect.width < 2.0 and rect.height > 3.0:
            out.append((round(rect.x0, 2), round(rect.x1, 2),
                        round(rect.y0, 2), round(rect.y1, 2)))
    return sorted(out)


def column_positions(page):
    """Every x a vertical rule occupies, both edges of a doubled border."""
    out = set()
    for x0, x1, _y0, _y1 in verticals(page):
        out.add(round(x0, 1))
        out.add(round(x1, 1))
    return out


# A printed blank — a run of underscores, dots or spaces — is what a value is
# meant to be typed onto, so drawing over one is the point, not a collision.
BLANK = re.compile(r"^[\s_.·•\-–—«»()]*$")


def overlay_spans(page):
    out = []
    for block in page.get_text("rawdict").get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if OVERLAY_FONT_HINT not in span.get("font", ""):
                    continue
                text = "".join(c.get("c", "") for c in span.get("chars", []))
                if text.strip():
                    out.append((span["bbox"], span["size"], text.strip()))
    return out


def printed_glyphs(page):
    """Every printed character with its own box, minus the blanks.

    A span such as «Кому:___________________» or «, серии   №» is one box in
    pymupdf's eyes, and most of that box is the blank a value is meant to be
    typed onto. Comparing against whole spans reports every correctly filled
    form field as printed text covered; comparing character by character asks
    the only question that matters — is a real glyph underneath.
    """
    out = []
    for block in page.get_text("rawdict").get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if OVERLAY_FONT_HINT in span.get("font", ""):
                    continue
                label = "".join(c.get("c", "") for c in span.get("chars", [])).strip()
                for char in span.get("chars", []):
                    if BLANK.match(char.get("c", "")):
                        continue
                    out.append((char["bbox"], label))
    return out


def inspect(checks, label, doc_id, pdf_bytes, template_path, notes):
    generated = fitz.open(stream=pdf_bytes, filetype="pdf")
    base = fitz.open(template_path)
    pages = {note["page"] for note in notes}

    if not notes:
        for index in range(base.page_count):
            checks.check(f"{label}: p{index} draws no rule the form did not print",
                         not generated_rules(generated[index], base[index]),
                         str(generated_rules(generated[index], base[index])[:2]))
        generated.close(); base.close()
        return

    for index in sorted(pages):
        page, base_page = generated[index], base[index]
        at = f"{label}: p{index}"
        added = generated_rules(page, base_page)
        printed = rules(base_page)
        drawn_text = overlay_spans(page)
        checks.check(f"{at}: an inserted row draws a rule",
                     added or column_positions(page) != column_positions(base_page)
                     or len(verticals(page)) > len(verticals(base_page)),
                     f"{len(added)} added")

        # The weight the form itself uses on this page.
        weights = collections.Counter(rule[3] for rule in printed)
        common = weights.most_common(1)[0][0] if weights else None
        # The measure of the page: where its own text and rules begin and end.
        edges = [(r[1], r[2]) for r in printed] + \
                [(g[0][0], g[0][2]) for g in printed_glyphs(base_page)]
        measure_left = min((e[0] for e in edges), default=0.0)
        measure_right = max((e[1] for e in edges), default=page.rect.width)
        for top, left, right, thickness in added:
            checks.check(f"{at}: rule weight matches the form at {top}",
                         common is None or abs(thickness - common) < 0.25,
                         f"{thickness} vs form {common}")
            checks.check(f"{at}: rule stays inside the printed measure at {top}",
                         left >= measure_left - 1.0 and right <= measure_right + 1.0,
                         f"{left}–{right} vs {measure_left}–{measure_right}")

        # Text sits on the rule: baseline above it, descenders clear of it.
        for bbox, size, text in drawn_text:
            near = [r for r in added
                    if r[1] < bbox[2] and r[2] > bbox[0] and 0 < r[0] - bbox[3] + 3.0 < 6.0]
            if not near:
                continue
            rule_top = near[0][0]
            baseline = bbox[3] - DESCENT * size
            checks.check(f"{at}: «{text[:18]}» sits above its rule",
                         baseline < rule_top, f"baseline {baseline:.2f} rule {rule_top:.2f}")
            checks.check(f"{at}: «{text[:18]}» descenders clear the rule",
                         bbox[3] <= rule_top + 1.2,
                         f"ink {bbox[3]:.2f} rule {rule_top:.2f}")

        # Rows of ONE anchor keep one pitch. Rules further apart than a couple
        # of rows belong to different anchors and are compared separately.
        clusters, current = [], []
        for rule in sorted(added):
            if current and rule[0] - current[-1][0] > 25.0:
                clusters.append(current)
                current = []
            current.append(rule)
        if current:
            clusters.append(current)
        for cluster in clusters:
            if len(cluster) < 2:
                continue
            steps = [round(b[0] - a[0], 2) for a, b in zip(cluster, cluster[1:])]
            checks.check(f"{at}: generated rows keep one pitch",
                         max(steps) - min(steps) < 0.05, str(steps))

        # No generated text covers a printed glyph. A printed blank is not text
        # a value can cover: it is the line the value is typed on.
        glyphs = printed_glyphs(page)
        for bbox, size, text in drawn_text:
            drawn = fitz.Rect(bbox)
            hit = None
            for other, label in glyphs:
                box = fitz.Rect(other)
                if not drawn.intersects(box):
                    continue
                overlap = (drawn & box).normalize()
                if overlap.get_area() > 0.5 * box.get_area():
                    hit = label
                    break
            checks.check(f"{at}: «{text[:18]}» does not cover printed text",
                         hit is None, f"over «{(hit or '')[:28]}»")

        # A rule is only drawn where text landed.
        for top, left, right, _thickness in added:
            has_text = any(bbox[0] < right and bbox[2] > left and
                           0 < top - bbox[3] + 3.0 < 8.0
                           for bbox, _s, _t in drawn_text)
            checks.check(f"{at}: no empty generated row at {top}", has_text, "")

        # A table row's verticals continue the printed ones, at the printed x.
        new_columns = column_positions(page) - column_positions(base_page)
        checks.check(f"{at}: inserted verticals sit on printed columns",
                     not new_columns, sorted(new_columns)[:4])

    generated.close()
    base.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keep", help="write the QA examples into this directory")
    args = parser.parse_args()
    if args.keep:
        os.makedirs(args.keep, exist_ok=True)

    server, browser = Server(), Chrome()
    checks = Checks()
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")
        for label, doc_id, profile, overrides in CASES:
            script = (RENDER
                      .replace("DOC", json.dumps(doc_id))
                      .replace("PROFILE", json.dumps(profile))
                      .replace("OVERRIDES", json.dumps(overrides, ensure_ascii=False)))
            try:
                payload = json.loads(browser.eval(script, await_promise=True))
            except RuntimeError as error:
                # A value the form has no room for is a layout question, and
                # run_document_regression.py is where it is reported. Say so
                # here rather than failing a check about how a row looks.
                print(f"{label:34s} {doc_id:34s} skipped — {str(error)[:70]}",
                      flush=True)
                continue
            pdf = base64.b64decode(payload["pdf"])
            if args.keep:
                name = label.replace(" ", "-").replace(",", "")
                with open(os.path.join(args.keep, f"{doc_id}--{name}.pdf"), "wb") as fh:
                    fh.write(pdf)
            template_path = os.path.join(TEMPLATES, os.path.basename(payload["url"]))
            inspect(checks, label, doc_id, pdf, template_path, payload["notes"])
            rows = sum(note["rows"] for note in payload["notes"])
            print(f"{label:34s} {doc_id:34s} {rows} inserted row(s)", flush=True)
        checks.check("no console errors", not browser.console,
                     "; ".join(browser.console[:3]))
    finally:
        browser.stop()
        server.stop()
    return checks.report()


if __name__ == "__main__":
    sys.exit(main())
