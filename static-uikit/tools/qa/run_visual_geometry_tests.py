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
ASCENT = 0.891

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
  let flowPages = [];
  const expansionStyles = {};
  (t.fields || []).concat(t.wordFlowBlocks || []).forEach(function (anchor) {
    if (anchor.expansion) expansionStyles[anchor.id] = anchor.expansion.lineStyle || 'underline';
  });
  const activeWordFlow = [];
  const fieldUnderlines = [];
  CRMDocumentEngine.overlayRenderer.activeReviewedRangePages(t, payload)
    .forEach(function (group) {
      group.blocks.forEach(function (block) {
        activeWordFlow.push({
          id: block.id, page: block.page, frame: block.frame,
          fontSize: block.fontSize, lineHeight: block.lineHeight,
          initialLineCount: block.initialLineCount || block.frame.initialLineCount,
          expectedSizes: [block.fontSize].concat((block.runs || []).map(function (run) {
            return run.fontSize;
          }).filter(function (size) { return Number(size) > 0; }))
        });
      });
    });
  // The layout engine is the single source of truth for where a line lands, so
  // QA compares the drawn PDF against the assignments it actually produced
  // instead of re-deriving a grid. Paragraph spacing and reflowed lines make a
  // re-derived grid disagree with a correct render.
  const flowLayout = {};
  const blob = await CRMDocumentEngine.overlayRenderer.render(t, payload, {
    onExpansion: function (l) { l.forEach(function (n) { notes.push(n); }); },
    onPlan: function (d) {
      flowPages = Object.keys(d.plans).filter(function (page) {
        return !!d.plans[page].pageFlow;
      }).map(Number);
      Object.keys((d.planned && d.planned.byBlock) || {}).forEach(function (id) {
        const result = d.planned.byBlock[id];
        if (!result || !result.drawn || !result.layout) return;
        const block = (t.wordFlowBlocks || []).filter(function (item) {
          return item.id === id;
        })[0];
        const plan = block ? (d.plans || {})[block.page] : null;
        // A reviewed block is drawn where the page shifts put it — the same
        // contract the renderer applies, minus the block's own added lines,
        // which it consumes itself. QA has to predict the same point to tell a
        // correctly moved underline from a stray rule.
        function shiftAt(top) {
          if (!plan) return 0;
          return (plan.shifts || []).reduce(function (total, shift) {
            if (shift.fieldId === id) return total;
            if (top < shift.fromTop - 1e-6 || top > shift.toTop + 1e-6) return total;
            return total + Number(shift.delta);
          }, 0);
        }
        flowLayout[id] = {
          baselines: (result.layout.lines || []).map(function (line) {
            return line.baselineTop + shiftAt(line.baselineTop);
          }),
          decorations: (result.layout.lines || []).reduce(function (all, line) {
            const y = line.baselineTop + shiftAt(line.baselineTop);
            (line.runs || []).forEach(function (run) {
              if (!run.decoration || !run.decoration.underline || !(run.width > 0)) return;
              all.push({
                baseline: y, left: run.x, width: run.width,
                offset: Number(run.decoration.offset != null ? run.decoration.offset : 2)
              });
            });
            return all;
          }, [])
        };
      });
      // An ordinary multiline field owns reviewed rules too: a `flowRegions`
      // continuation declared `drawUnderline` is the form's own printed blank
      // continued, and the renderer draws it from the region the expansion
      // pass handed back. Read those exact regions here so a reviewed
      // continuation rule is not reported as a stray vector.
      Object.keys((d.planned && d.planned.byField) || {}).forEach(function (id) {
        const result = d.planned.byField[id];
        if (!result || !result.drawn || !result.layout) return;
        const regions = result.layout.regions || result.regions || [];
        (result.layout.lines || []).forEach(function (line) {
          const region = regions[line.regionIndex];
          if (!region || !region.drawUnderline) return;
          const lineHeight = CRMDocumentEngine.textLayout
            .lineHeightAt(region, result.layout.size);
          const top = region.underlineTop != null
            ? Number(region.underlineTop) + Number(line.lineIndex || 0) * lineHeight
            : Number(region.baselineTop) + Number(line.lineIndex || 0) * lineHeight +
              Number(region.underlineOffset != null ? region.underlineOffset : 2);
          const left = Number(region.underlineLeft != null
            ? region.underlineLeft : region.left);
          const width = Number(region.underlineWidth != null
            ? region.underlineWidth : region.width);
          fieldUnderlines.push({ fieldId: id, page: Number(region.page),
                                 top: top, left: left, right: left + width });
        });
      });
    }
  });
  const u8 = new Uint8Array(await blob.arrayBuffer());
  let s = ''; const c = 0x8000;
  for (let i = 0; i < u8.length; i += c) s += String.fromCharCode.apply(null, u8.subarray(i, i + c));
  activeWordFlow.forEach(function (block) {
    const assigned = flowLayout[block.id];
    block.baselines = assigned ? assigned.baselines : [];
    block.decorations = assigned ? assigned.decorations : [];
  });
  return JSON.stringify({ pdf: btoa(s), notes: notes, flowPages: flowPages,
                          expansionStyles: expansionStyles,
                          activeWordFlow: activeWordFlow,
                          fieldUnderlines: fieldUnderlines,
                          url: t.templateUrl });
}(DOC, PROFILE, OVERRIDES))
"""

RU_COMPANY = "Публичное акционерное общество «Международные инвестиционные решения»"
EN_ADDRESS = ("27 King George the Fifth Avenue, London, United Kingdom, SW1A 2AA")

# name, doc, profile, overrides, what the example is for
CASES = [
    ("one Word-flow line", "qualification-notice", "ru-resident-normal",
     {"field.client-full-name": "Иванов И.И."}),
    ("two Word-flow lines", "qualification-notice", "ru-company-normal",
     {"field.client-full-name": "АО «Международные инвестиционные технологии»"}),
    ("several Word-flow lines", "qualification-notice", "ru-company-normal",
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
    ("cross-page legal block transfer", "client-notifications",
     "en-nonresident-long", {}),
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
    out = []
    for rule in rules(page):
        shape = rule[1:]
        if shapes[shape]:
            shapes[shape] -= 1
        else:
            out.append(rule)
    return sorted(out)


def verticals(page):
    out = []
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        if rect.width < 2.0 and rect.height > 3.0:
            out.append((round(rect.x0, 2), round(rect.x1, 2),
                        round(rect.y0, 2), round(rect.y1, 2)))
    return sorted(out)


def column_positions(page):
    """Centre-line of every vertical rule, including each doubled border."""
    out = set()
    for x0, x1, _y0, _y1 in verticals(page):
        # Source rules are filled 0.48 pt rectangles while generated rules are
        # stroked paths with zero-width geometry. Comparing their left edges
        # made a correctly centred continuation look displaced by half a rule.
        out.add(round((x0 + x1) / 2, 1))
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


def flow_baselines(block):
    """The baselines the layout engine assigned this block, in order.

    Paragraph spacing and reflowed lines mean a block's baselines are not a
    plain `top + n * lineHeight` grid, so QA reads the assignments the engine
    produced rather than guessing a second grid that would disagree with a
    correct render.
    """
    return [float(value) for value in block.get("baselines") or []]


def flow_bounds(block):
    """The ink box of a reviewed block: first ascent down to last descent.

    Reviewed blocks sit directly under one another on a filled form, so this box
    has to follow the real baselines. Padding it by a whole line makes it overlap
    the block below, and then one paragraph's size is reported against its
    neighbour's lock.
    """
    frame = block.get("frame") or {}
    baselines = flow_baselines(block)
    sizes = [float(size) for size in block.get("expectedSizes") or []]
    size = max(sizes + [float(block.get("fontSize") or 0)])
    left = float(frame.get("left") or 0)
    if not baselines:
        return fitz.Rect(left - 0.5, 0, left + float(frame.get("width") or 0) + 0.5, 0)
    return fitz.Rect(left - 0.5, baselines[0] - ASCENT * size - 0.5,
                     left + float(frame.get("width") or 0) + 0.5,
                     baselines[-1] + max(DESCENT * size, 3.0))


def assign_spans(page_blocks, drawn_text):
    """Give every drawn span to exactly one reviewed block.

    Two reviewed blocks can be a single line apart, so a span is attributed by
    the assigned baseline it actually sits on, not by box intersection.
    """
    grids = [flow_baselines(block) for block in page_blocks]
    frames = [flow_bounds(block) for block in page_blocks]
    assigned = [[] for _ in page_blocks]
    for bbox, size, text in drawn_text:
        baseline = bbox[3] - DESCENT * size
        best, best_gap = None, None
        for index, grid in enumerate(grids):
            if not grid or bbox[0] > frames[index].x1 or bbox[2] < frames[index].x0:
                continue
            gap = min(abs(baseline - line) for line in grid)
            if best_gap is None or gap < best_gap:
                best, best_gap = index, gap
        if best is not None and best_gap <= 3.0:
            assigned[best].append((bbox, size, text))
    return assigned


def decoration_rules(block):
    """Every underline rule this block's assignments call for: (top, left, right)."""
    out = []
    for item in block.get("decorations") or []:
        top = float(item.get("baseline") or 0) + float(item.get("offset") or 0)
        left = float(item.get("left") or 0)
        out.append((top, left, left + float(item.get("width") or 0)))
    return out


def inspect(checks, label, doc_id, pdf_bytes, template_path, notes,
            word_flow_blocks, expansion_styles, field_underlines=()):
    generated = fitz.open(stream=pdf_bytes, filetype="pdf")
    base = fitz.open(template_path)
    pages = {note["page"] for note in notes} | {
        int(block["page"]) for block in word_flow_blocks
    } | {int(rule["page"]) for rule in field_underlines}

    # A page that neither expanded nor carries a reviewed block must come out of
    # the engine untouched. Pages that do are inspected in full below: a Word
    # flow draws inline underline decorations on its own blanks even when the
    # paragraph needed no extra line, and that is the form being filled, not a
    # stray rule.
    for index in range(base.page_count):
        if index in pages:
            continue
        untouched = generated_rules(generated[index], base[index])
        checks.check(f"{label}: p{index} draws no rule the form did not print",
                     not untouched, str(untouched[:2]))

    for index in sorted(pages):
        page, base_page = generated[index], base[index]
        at = f"{label}: p{index}"
        added = generated_rules(page, base_page)
        printed = rules(base_page)
        drawn_text = overlay_spans(page)
        page_notes = [note for note in notes if int(note["page"]) == index]
        row_notes = [note for note in page_notes
                     if expansion_styles.get(note["fieldId"], "underline") != "none"]
        page_blocks = [block for block in word_flow_blocks
                       if int(block["page"]) == index]
        block_bounds = [flow_bounds(block) for block in page_blocks]

        # Every rule this engine drew has to be one of three reviewed things:
        # the rule of a continuation row, the underline decoration of an inline
        # blank, or the reviewed continuation rule of an ordinary multiline
        # field — each drawn on the exact baseline the layout engine assigned
        # it. Anything else is a stray vector on a legal form.
        if not row_notes:
            expected = [rule for block in page_blocks
                        for rule in decoration_rules(block)]
            expected += [(float(rule["top"]), float(rule["left"]),
                          float(rule["right"]))
                         for rule in field_underlines
                         if int(rule["page"]) == index]
            stray = [rule for rule in added
                     if not any(abs(rule[0] - top) <= 1.0
                                and abs(rule[1] - left) <= 1.0
                                and abs(rule[2] - right) <= 1.0
                                for top, left, right in expected)]
            checks.check(f"{at}: every drawn rule sits on an assigned underline",
                         not stray, str(stray[:2]))
        if row_notes:
            checks.check(f"{at}: an inserted table row extends source rules",
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

        # Reviewed Word-flow underlines are inline run decorations, not
        # continuation-row rules.  Check their owning vector text against the
        # locked source sizes and approved frame instead of treating several
        # fragments on one baseline as separate rows.
        block_spans_by_index = assign_spans(page_blocks, drawn_text)
        for index_block, block in enumerate(page_blocks):
            block_spans = block_spans_by_index[index_block]
            checks.check(f"{at}: {block['id']} draws vector text in its reviewed frame",
                         bool(block_spans), str(block_bounds[index_block]))
            expected_sizes = [float(size) for size in block.get("expectedSizes") or []]
            wrong_sizes = [(round(size, 3), text[:20]) for _bbox, size, text in block_spans
                           if not any(abs(size - expected) <= 0.05
                                      for expected in expected_sizes)]
            checks.check(f"{at}: {block['id']} keeps its locked source font sizes",
                         not wrong_sizes, str(wrong_sizes[:3]))

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
            inspect(checks, label, doc_id, pdf, template_path, payload["notes"],
                    payload.get("activeWordFlow") or [],
                    payload.get("expansionStyles") or {},
                    payload.get("fieldUnderlines") or [])
            if label == "cross-page legal block transfer":
                checks.check(f"{label}: local Word flow avoids an unnecessary transfer",
                             not payload["flowPages"], str(payload["flowPages"]))
            rows = sum(note["rows"] for note in payload["notes"])
            flow = f", cross-page from {payload['flowPages']}" if payload["flowPages"] else ""
            print(f"{label:34s} {doc_id:34s} {rows} inserted row(s){flow}",
                  flush=True)
        checks.check("no console errors", not browser.console,
                     "; ".join(browser.console[:3]))
    finally:
        browser.stop()
        server.stop()
    return checks.report()


if __name__ == "__main__":
    sys.exit(main())
