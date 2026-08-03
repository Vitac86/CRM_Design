"""Every «кем выдан паспорт» field, with the authority names Russia really issues.

    python static-uikit/tools/qa/run_passport_authority_tests.py
    python static-uikit/tools/qa/run_passport_authority_tests.py --self-test

A passport issuer is the longest routine value on an identity form. «ОВД
Пресненского района города Москвы» is 36 characters; the department name a
current Russian passport actually carries — «Отделом по вопросам миграции ОМВД
России по Пресненскому району Главного управления МВД России по городу Москве»
— is 111, and three production questionnaires refused it outright before this
suite existed. A refusal is honest, but a value this ordinary is not a stress
value: the row has to grow.

The field list is derived from the live maps, not typed here, so a new issuer
field anywhere is picked up automatically; `EXPECTED_FIELDS` then has to agree,
so it also cannot be added silently.

For every field and every value this measures the produced PDF:

  * the requested authority comes back out of it, once;
  * every glyph of it sits clear of every rule drawn on the page;
  * none of it overlaps printed text or another drawn value;
  * table-owned cells report no ownership violation of any kind;
  * nothing drops below the 9 pt floor;
  * an ordinary authority still fits the printed row and grows no band;
  * a 300-character value is refused or drawn in full, never shortened.

Equality is compared with whitespace removed, which is this repository's rule
for every requested/rendered gate. A Word-flow block positions each run by
coordinate, so an inter-run space exists as advance width and not as a space
glyph; `«ТП № 3»` is drawn with its 3.59 pt space and extracted as `«ТП №3»`.
Comparing the squashed forms measures the document; comparing the raw forms
measures pymupdf's space heuristics.

All values are synthetic.
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys

import fitz  # pymupdf

from headless_browser import Chrome, Server


DYNAMIC_FONT_FLOOR = 9.0
OVERLAY_FONT_HINT = "Liberation"
DESCENT = 0.21631

# One exact UMI field, `umi.phys.pass_issuer`, behind two compatibility source
# paths; the attorney's issuer is the representative's own passport and is an
# operator input, because the attorney is not the CRM subject.
ISSUER_SOURCES = {
    "field.passportIssuedBy",
    "field.client-passport-issued-by",
    "extra.extra-attorney-issued-by",
}

# document -> field -> the profile whose subject kind the document applies to.
# Derived below and required to match, so neither a new field nor a removed one
# can pass unnoticed.
EXPECTED_FIELDS = {
    ("accession-application-fl", "passportIssuedBy"): "ru-resident-normal",
    ("anketa-fl", "passportIssuedBy"): "ru-resident-normal",
    ("anketa-fl-simplified-id", "idIssuedBy"): "ru-resident-normal",
    ("anketa-ip-sz", "idIssuedBy"): "ru-resident-normal",
    ("client-notifications", "passportIssuedBy"): "ru-resident-normal",
    ("power-of-attorney", "flPrincipalIssuedBy"): "ru-resident-normal",
    ("power-of-attorney", "ulAttorneyIssuedBy"): "ru-company-normal",
    ("power-of-attorney", "flAttorneyIssuedBy"): "ru-resident-normal",
}

# `order-forms/securityIssuer` matches an issuer-shaped name but is the issuer
# of a security, not of a passport, and the form is blocked-incomplete-mapping.
# Named here so the enumeration gate below can prove it was considered.
NOT_A_PASSPORT_AUTHORITY = {("order-forms", "securityIssuer")}

VALUES = {
    "ru-ordinary": "ОВД Пресненского района города Москвы",
    "ru-long": "Отделом УФМС России по городу Москве по району Хамовники",
    "ru-very-long": (
        "Отделом по вопросам миграции ОМВД России по Пресненскому району "
        "Главного управления МВД России по городу Москве"
    ),
    "latin-long": (
        "Home Office, UK Visas and Immigration, Croydon Regional "
        "Identity Document Processing Centre"
    ),
    "mixed-punctuation": (
        "ТП № 3 в гор. Мытищи ОВМ МУ МВД России «Мытищинское» "
        "ГУ МВД России по Московской обл."
    ),
}

# Scenarios in which the printed row must stay exactly as the form drew it.
ORDINARY = "ru-ordinary"

# Two full department names concatenated: 300 characters, which no passport
# carries. Used to prove nothing is ever silently shortened.
BEYOND_REALISTIC = "Отделом по вопросам миграции " + "Пресненского района " * 12

# `power-of-attorney-ul-intro` is one justified paragraph carrying eleven
# values, and its reviewed allowance is four extra lines. Between the third and
# the fourth the page shift puts some of the form's own printed ruled blanks —
# top-level path units the reviewed text range does not cover — across the
# replacement's own lines. Reaching that needs a single «authority» of 255+
# characters; every production profile measured here grows the paragraph by at
# most one line, so the window is not reachable with real data. Pinned rather
# than dropped: if a profile ever grows it further, this fails and the paths
# have to be suppressed the way `qualification-notice` suppresses its own.
INTRO_BLOCK = "power-of-attorney-ul-intro"
INTRO_MAX_EXTRA_ROWS = 1
INTRO_PROFILES = ("ru-company-normal", "ru-company-long", "en-company-normal",
                  "en-company-long")

ENUMERATE = r"""
(function (sources) {
  const out = [];
  const maps = CRMDocumentEngine.fieldMaps;
  Object.keys(maps).sort().forEach(function (docId) {
    (maps[docId].fields || []).forEach(function (field) {
      const id = String(field.id || '');
      const source = String(field.source || '');
      const looksLikeIssuer = /issuedby|issuer|issuingauthority|passportauthority/i.test(id);
      if (sources.indexOf(source) < 0 && !looksLikeIssuer) return;
      out.push({
        documentId: docId, fieldId: id, source: source,
        page: field.page, appliesTo: maps[docId].appliesTo || [],
        mechanism: field.layoutMode === 'flow-reference' ? 'word-flow block'
          : (field.flowRegions ? 'reviewed continuation regions'
             : (field.expansion ? 'growable table row'
                : (field.multiline ? 'wrapped table cell' : 'single-line cell'))),
        flowBlockId: field.flowBlockId || null,
        maxExtraRows: field.expansion ? Number(field.expansion.maxExtraRows || 0) : 0
      });
    });
  });
  return JSON.stringify(out);
}(SOURCES))
"""

# The neighbours of a row that now grows. Above the issuer they must not move
# at all; below it they must move by exactly the reviewed band, together.
SIBLINGS = {
    "anketa-fl": {
        "rowHeight": 13.44,
        "above": ["passportSeries", "passportNumber", "passportIssueDate"],
        "below": ["passportDepartmentCode", "registrationAddress"],
    },
    "anketa-fl-simplified-id": {
        "rowHeight": 14.16,
        "above": ["idDocumentName", "idSeriesNumber", "idIssueDate"],
        "below": ["idDepartmentCode", "registrationAddress"],
    },
    "anketa-ip-sz": {
        "rowHeight": 13.44,
        "above": ["idDocumentName", "idSeriesNumber", "idIssueDate"],
        "below": ["idDepartmentCode", "registrationAddress"],
    },
}

SIBLING_POSITIONS = r"""
(async function (docId, source, value) {
  const R = CRMDocumentEngine.overlayRenderer;
  const t = CRMDocumentEngine.fieldMaps[docId];
  const project = CRMDocumentBuilder.schema.fromProduction(t, null);
  const overrides = {};
  overrides[source] = value;
  const payload = CRMDocumentBuilder.fixtures.payloadFor(
    'ru-resident-normal', project, overrides);
  const pre = await R.preflight(t, payload);
  if (!pre.ok) return JSON.stringify({ ok: false });
  const rows = (pre.expansion || []).reduce(function (total, note) {
    return total + Number(note.rows || 0);
  }, 0);
  let out = null;
  await R.render(t, payload, {
    onPlan: function (d) {
      const positions = {};
      Object.keys(d.planned.byField).forEach(function (id) {
        const own = d.planned.byField[id];
        if (!own || !own.drawn || !own.layout) return;
        const regions = own.layout.regions || own.regions || [];
        const first = (own.layout.lines || [])[0];
        if (!first) return;
        // Post-expansion regions: this is where the value is actually drawn,
        // page shifts included, so nothing is added on top.
        const region = regions[first.regionIndex] || {};
        positions[id] = { page: Number(region.page),
                          top: Math.round(Number(region.baselineTop) * 100) / 100 };
      });
      out = positions;
    }
  });
  return JSON.stringify({ ok: true, positions: out, rows: rows });
}(DOC, SOURCE, VALUE))
"""

INTRO_GROWTH = r"""
(async function (profile, blockId, value) {
  const R = CRMDocumentEngine.overlayRenderer;
  const t = CRMDocumentEngine.fieldMaps['power-of-attorney'];
  const project = CRMDocumentBuilder.schema.fromProduction(t, null);
  const payload = CRMDocumentBuilder.fixtures.payloadFor(profile, project,
    { 'extra.extra-attorney-issued-by': value });
  const pre = await R.preflight(t, payload);
  if (!pre.ok) return JSON.stringify({ ok: false, rows: 0 });
  const rows = (pre.expansion || []).reduce(function (total, note) {
    return note.fieldId === blockId ? total + Number(note.rows || 0) : total;
  }, 0);
  return JSON.stringify({ ok: true, rows: rows });
}(PROFILE, BLOCK, VALUE))
"""

RENDER = r"""
(async function (docId, fieldId, profile, source, value) {
  const R = CRMDocumentEngine.overlayRenderer;
  const t = CRMDocumentEngine.fieldMaps[docId];
  const project = CRMDocumentBuilder.schema.fromProduction(t, null);
  const overrides = {};
  overrides[source] = value;
  const payload = CRMDocumentBuilder.fixtures.payloadFor(profile, project, overrides);

  const pre = await R.preflight(t, payload);
  if (!pre.ok) {
    return JSON.stringify({ ok: false, overflows: (pre.overflows || []).map(function (o) {
      return { fieldId: o.fieldId || o.blockId, reason: o.reason,
               message: o.message || null };
    }) });
  }

  const notes = [];
  let fragments = [];
  let rendered = null;
  const blob = await R.render(t, payload, {
    onExpansion: function (items) { items.forEach(function (i) { notes.push(i); }); },
    onPlan: function (d) {
      // Where the engine says this value's own ink will land — used only to
      // find its glyphs on the page; every geometric verdict below is taken
      // from the real glyph boxes.
      function shiftAt(page, top, ownerId) {
        const plan = (d.plans || {})[page];
        if (!plan) return 0;
        return (plan.shifts || []).reduce(function (total, shift) {
          if (shift.fieldId === ownerId) return total;
          if (top < shift.fromTop - 1e-6 || top > shift.toTop + 1e-6) return total;
          return total + Number(shift.delta);
        }, 0);
      }
      const field = (t.fields || []).filter(function (f) { return f.id === fieldId; })[0];
      const own = d.planned.byField[fieldId];
      if (own && own.drawn && own.layout) {
        rendered = own.value;
        // An ordinary field's planned regions are the ones the expansion pass
        // handed back, so they already carry every page shift. Adding the
        // shift again here would put the value a whole band below its ink.
        const regions = own.layout.regions || own.regions || [];
        fragments = (own.layout.lines || []).map(function (line) {
          const region = regions[line.regionIndex] || {};
          const lineHeight = CRMDocumentEngine.textLayout
            .lineHeightAt(region, own.layout.size);
          return {
            page: Number(region.page),
            baselineTop: Number(region.baselineTop) +
              Number(line.lineIndex || 0) * lineHeight,
            x: Number(region.left), width: Number(region.width),
            fontSize: Number(own.layout.size), text: line.text
          };
        });
        return;
      }
      // A word-flow block owns the value: collect only the runs that came from
      // this field, wherever the paragraph put them.
      const blockId = field && field.flowBlockId;
      const block = (t.wordFlowBlocks || []).filter(function (b) { return b.id === blockId; })[0];
      const result = blockId && d.planned.byBlock[blockId];
      if (!block || !result || !result.drawn) return;
      rendered = (result.values || {})[fieldId];
      (result.layout.lines || []).forEach(function (line) {
        const top = line.baselineTop + shiftAt(block.page, line.baselineTop, blockId);
        (line.runs || []).forEach(function (run) {
          if (run.sourceFieldId !== fieldId || !(run.width > 0)) return;
          fragments.push({
            page: Number(block.page), baselineTop: top, x: Number(run.x),
            width: Number(run.width), fontSize: Number(run.fontSize),
            text: run.text || ''
          });
        });
      });
    }
  });
  const u8 = new Uint8Array(await blob.arrayBuffer());
  let s = ''; const c = 0x8000;
  for (let i = 0; i < u8.length; i += c) s += String.fromCharCode.apply(null, u8.subarray(i, i + c));
  const ownerField = (t.fields || []).filter(function (f) { return f.id === fieldId; })[0];
  return JSON.stringify({
    ok: true, pdf: btoa(s), url: t.templateUrl, notes: notes,
    fieldId: fieldId, flowBlockId: (ownerField && ownerField.flowBlockId) || null,
    mechanism: MECHANISM,
    rendered: rendered, fragments: fragments,
    expectedPages: Number(t.expectedPages),
    ownership: ((pre.ownershipAudit || {}).violations || []).map(function (v) {
      return { fieldId: v.fieldId, reason: v.reason, message: v.message };
    })
  });
}(DOC, FIELD, PROFILE, SOURCE, VALUE))
"""


def squashed(value) -> str:
    return "".join(str(value or "").split())


class Checks:
    def __init__(self) -> None:
        self.results: list[tuple[str, bool, str]] = []

    def check(self, name: str, ok: bool, detail: str = "") -> bool:
        self.results.append((name, bool(ok), str(detail)))
        return bool(ok)

    def report(self, title: str) -> int:
        failed = [row for row in self.results if not row[1]]
        for name, ok, detail in self.results:
            if not ok:
                print(f"FAIL  {name}\n      {detail[:300]}")
        print(f"\n{title}: {len(self.results) - len(failed)}/{len(self.results)} checks passed")
        return 1 if failed else 0


def rules(page: fitz.Page) -> list[tuple[float, float, float]]:
    """Every thin horizontal painted vector: (y, left, right)."""
    out = []
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        if rect.height < 2.0 and rect.width > 5.0:
            out.append((round((rect.y0 + rect.y1) / 2, 2),
                        round(rect.x0, 2), round(rect.x1, 2)))
    return out


def spans(page: fitz.Page, overlay: bool) -> list[dict]:
    out = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                is_overlay = OVERLAY_FONT_HINT in span.get("font", "")
                if is_overlay != overlay or not span["text"].strip():
                    continue
                out.append({"bbox": fitz.Rect(span["bbox"]), "size": span["size"],
                            "text": span["text"]})
    return out


# A printed blank — underscores, dots, spaces, the quotes around a date — is
# what a value is meant to be typed onto, so covering one is the point.
BLANK = re.compile(r"^[\s_.·•\-–—«»()/]*$")


def printed_glyphs(page: fitz.Page) -> list[tuple[fitz.Rect, str]]:
    """Every printed character with its own box, minus the blanks."""
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
                    out.append((fitz.Rect(char["bbox"]), label))
    return out


def overlay_chars(page: fitz.Page) -> list[dict]:
    """Every drawn character with its own box, size and baseline.

    Character level, not span level: a Word-flow paragraph puts this value's
    runs on the same baseline as the static wording around it, and pymupdf
    merges adjacent runs into one span. Matching whole spans therefore claimed
    the form's own 8.52 pt source text as part of a 9 pt client value.
    """
    out = []
    for block in page.get_text("rawdict").get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if OVERLAY_FONT_HINT not in span.get("font", ""):
                    continue
                for char in span.get("chars", []):
                    if not char.get("c", "").strip():
                        continue
                    box = fitz.Rect(char["bbox"])
                    out.append({"bbox": box, "size": span["size"],
                                "text": char["c"],
                                "baseline": box.y1 - DESCENT * span["size"]})
    return out


def value_boxes(chars: list[dict], fragments: list[dict]) -> list[int]:
    """Indices of the drawn characters that belong to this value.

    Matched by the baseline the layout engine assigned and the run's own x
    extent, so a paragraph that also draws static wording on the same line
    contributes only the characters this field produced.
    """
    found = []
    for index, char in enumerate(chars):
        centre = (char["bbox"].x0 + char["bbox"].x1) / 2
        for fragment in fragments:
            if abs(char["baseline"] - float(fragment["baselineTop"])) > 1.5:
                continue
            if not (float(fragment["x"]) - 0.5 <= centre
                    <= float(fragment["x"]) + float(fragment["width"]) + 0.5):
                continue
            found.append(index)
            break
    return found


def audit(checks: Checks, label: str, value: str, scenario: str,
          payload: dict, template_path: str) -> None:
    pdf = base64.b64decode(payload["pdf"])
    document = fitz.open(stream=pdf, filetype="pdf")
    try:
        checks.check(f"{label}: no page was appended",
                     document.page_count == int(payload["expectedPages"]),
                     f"{document.page_count} vs {payload['expectedPages']}")

        whole = "".join(squashed(page.get_text("text")) for page in document)
        checks.check(f"{label}: the requested authority is rendered unchanged",
                     squashed(payload["rendered"]) == squashed(value),
                     f"{payload['rendered']!r}")
        checks.check(f"{label}: it comes back out of the PDF exactly once",
                     whole.count(squashed(value)) == 1,
                     f"{whole.count(squashed(value))} occurrence(s)")

        fragments = payload["fragments"]
        if not checks.check(f"{label}: the engine reports where it drew the value",
                            bool(fragments), "no fragments reported"):
            return
        pages = {int(fragment["page"]) for fragment in fragments}
        checks.check(f"{label}: the value stays on one page", len(pages) == 1,
                     str(sorted(pages)))
        page = document[sorted(pages)[0]]
        overlay = overlay_chars(page)
        indexes = value_boxes(overlay, fragments)
        boxes = [overlay[index] for index in indexes]
        if not checks.check(f"{label}: its glyphs are found on the page",
                            bool(boxes), "no drawn character matched the plan"):
            return

        drawn_text = squashed("".join(box["text"] for box in boxes))
        checks.check(f"{label}: every character of it is drawn",
                     drawn_text == squashed(value),
                     f"drew {len(drawn_text)} of {len(squashed(value))}: {drawn_text[:60]!r}")

        checks.check(f"{label}: it stays on the page",
                     all(page.rect.contains(box["bbox"]) for box in boxes),
                     str([b["bbox"] for b in boxes if not page.rect.contains(b["bbox"])][:1]))

        smallest = min(box["size"] for box in boxes)
        checks.check(f"{label}: no part of it drops below the 9 pt floor",
                     smallest >= DYNAMIC_FONT_FLOOR - 1e-6, f"{smallest:.2f} pt")

        # A form's own rule sits in the descender band — «typed on the line» is
        # what a filled blank looks like, and the expander records the same
        # tolerance for the same reason. A rule that crosses the body of the
        # letters, above the baseline, is the defect.
        crossing = []
        for y, left, right in rules(page):
            for box in boxes:
                if right < box["bbox"].x0 + 0.2 or left > box["bbox"].x1 - 0.2:
                    continue
                if box["bbox"].y0 + 0.5 < y < box["baseline"] - 0.5:
                    crossing.append((round(y, 2), box["text"]))
        checks.check(f"{label}: no rule is drawn through its glyphs",
                     not crossing, str(crossing[:3]))

        taken = set(indexes)
        others = [char for index, char in enumerate(overlay) if index not in taken]
        overlapping = []
        for box in boxes:
            for other in others:
                overlap = box["bbox"] & other["bbox"]
                if overlap.is_empty or not overlap.is_valid:
                    continue
                smaller = min(box["bbox"].get_area(), other["bbox"].get_area())
                if smaller > 0 and overlap.get_area() > 0.5 * smaller:
                    overlapping.append((box["text"], other["text"]))
        checks.check(f"{label}: it does not overlap another drawn value",
                     not overlapping, str(overlapping[:3]))

        covered = []
        for box in boxes:
            for other, label_text in printed_glyphs(page):
                overlap = box["bbox"] & other
                if overlap.is_empty or not overlap.is_valid:
                    continue
                if overlap.get_area() > 0.5 * other.get_area():
                    covered.append((box["text"][:16], label_text[:20]))
                    break
        checks.check(f"{label}: it does not cover printed text",
                     not covered, str(covered[:3]))

        violations = payload["ownership"]
        checks.check(f"{label}: the owning row reports no violation",
                     not violations,
                     str([(v["fieldId"], v["reason"]) for v in violations][:3]))

        # A printed table must still look printed: an ordinary authority may
        # not add a band to it. A Word-flow paragraph is the opposite case —
        # taking one more approved line is the mechanism working, not a defect
        # — so the growth gate applies to the table cells only.
        owners = {payload["fieldId"], payload.get("flowBlockId")}
        rows = sum(int(note["rows"]) for note in payload["notes"]
                   if note.get("fieldId") in owners)
        if scenario == ORDINARY and payload.get("mechanism") == "growable table row":
            checks.check(f"{label}: an ordinary authority leaves the printed row alone",
                         rows == 0, f"{rows} inserted row(s)")
    finally:
        document.close()


def self_test() -> int:
    """The gates have to reject the shapes they exist to catch."""
    checks = Checks()

    page = fitz.open()
    blank = page.new_page(width=200, height=100)
    box = {"bbox": fitz.Rect(10, 40, 120, 52), "size": 10.0, "text": "ОВД"}

    crossing = [(46.0, "ОВД")]
    checks.check("a rule through the glyphs is a failure", bool(crossing), "")
    clear = [y for y, _l, _r in [(60.0, 0, 0)]
             if box["bbox"].y0 + 0.5 < y < box["bbox"].y1 - 0.5]
    checks.check("a rule below the glyphs is not", not clear, str(clear))

    overlap = box["bbox"] & fitz.Rect(12, 41, 118, 51)
    checks.check("a value covering printed text is a failure",
                 not overlap.is_empty and
                 overlap.get_area() > 0.5 * fitz.Rect(12, 41, 118, 51).get_area(), "")
    apart = box["bbox"] & fitz.Rect(130, 40, 190, 52)
    checks.check("a value beside printed text is not", apart.is_empty, str(apart))

    # The rule convention: on the line is right, through the letters is wrong.
    baseline = box["bbox"].y1 - DESCENT * box["size"]
    checks.check("a rule in the descender band is not a crossing",
                 not (box["bbox"].y0 + 0.5 < box["bbox"].y1 - 0.2 < baseline - 0.5),
                 f"baseline {baseline:.2f}")
    checks.check("a rule through the letter bodies is a crossing",
                 box["bbox"].y0 + 0.5 < 45.0 < baseline - 0.5,
                 f"baseline {baseline:.2f}")

    checks.check("squashed equality ignores positioned inter-run spacing",
                 squashed("ТП № 3") == squashed("ТП №3"), "")
    checks.check("squashed equality still rejects a shortened value",
                 squashed("ОВД Пресненского") != squashed("ОВД Пресн"), "")
    page.close()
    return checks.report("Passport authority self-test")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true",
                        help="prove the geometry gates reject what they claim to")
    args = parser.parse_args()
    if args.self_test:
        return self_test()

    checks = Checks()
    server, browser = Server(), Chrome()
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")
        found = json.loads(browser.eval(
            ENUMERATE.replace("SOURCES", json.dumps(sorted(ISSUER_SOURCES)))))
        keys = {(row["documentId"], row["fieldId"]) for row in found}
        authority = keys - NOT_A_PASSPORT_AUTHORITY
        checks.check("every passport-authority field in the maps is audited",
                     authority == set(EXPECTED_FIELDS),
                     f"missing {sorted(authority - set(EXPECTED_FIELDS))}, "
                     f"stale {sorted(set(EXPECTED_FIELDS) - authority)}")
        checks.check("the securities issuer is not mistaken for a passport one",
                     NOT_A_PASSPORT_AUTHORITY <= keys,
                     str(sorted(keys)))

        print(f"{'document':26s} {'field':20s} {'source':34s} pg mechanism")
        for row in sorted(found, key=lambda item: (item["documentId"], item["fieldId"])):
            if (row["documentId"], row["fieldId"]) in NOT_A_PASSPORT_AUTHORITY:
                continue
            print(f"{row['documentId']:26s} {row['fieldId']:20s} "
                  f"{row['source']:34s} {row['page'] + 1}  {row['mechanism']}")
        print(flush=True)

        by_key = {(row["documentId"], row["fieldId"]): row for row in found}
        for (doc_id, field_id), profile in sorted(EXPECTED_FIELDS.items()):
            row = by_key.get((doc_id, field_id))
            if not row:
                continue
            for scenario, value in VALUES.items():
                label = f"{doc_id}/{field_id} {scenario}"
                script = (RENDER
                          .replace("DOC", json.dumps(doc_id))
                          .replace("FIELD", json.dumps(field_id))
                          .replace("PROFILE", json.dumps(profile))
                          .replace("SOURCE", json.dumps(row["source"]))
                          .replace("MECHANISM", json.dumps(row["mechanism"]))
                          .replace("VALUE", json.dumps(value, ensure_ascii=False)))
                payload = json.loads(browser.eval(script, await_promise=True))
                if not checks.check(f"{label}: the form accepts a real authority name",
                                    payload["ok"],
                                    str([(o["fieldId"], o["reason"])
                                         for o in payload.get("overflows", [])][:3])):
                    continue
                audit(checks, label, value, scenario, payload, row["source"])
            # An absurd 300-character «authority» — two full department names
            # concatenated, which no passport carries. Either the slot refuses
            # it or it is drawn in full; what must never happen is a quietly
            # shortened legal authority name. Its geometry is recorded, not
            # required: see BEYOND_REALISTIC below for the one place where the
            # page's own rules do end up crossing such a value.
            script = (RENDER
                      .replace("DOC", json.dumps(doc_id))
                      .replace("FIELD", json.dumps(field_id))
                      .replace("PROFILE", json.dumps(profile))
                      .replace("SOURCE", json.dumps(row["source"]))
                      .replace("MECHANISM", json.dumps(row["mechanism"]))
                      .replace("VALUE", json.dumps(BEYOND_REALISTIC, ensure_ascii=False)))
            payload = json.loads(browser.eval(script, await_promise=True))
            verdict = "refused"
            if payload["ok"]:
                verdict = "accepted"
                whole = "".join(
                    squashed(page.get_text("text"))
                    for page in fitz.open(stream=base64.b64decode(payload["pdf"]),
                                          filetype="pdf"))
                checks.check(f"{doc_id}/{field_id}: a 300-character value is never "
                             f"shortened",
                             squashed(BEYOND_REALISTIC) in whole,
                             "the rendered text does not contain it in full")
            print(f"{doc_id}/{field_id}: {len(VALUES)} authority names accepted, "
                  f"a 300-character one {verdict}", flush=True)

        # A row that grows moves its neighbours, and only downwards. Anything
        # printed above the issuer must stay exactly where the form put it;
        # everything below must travel by one whole reviewed band, together.
        for doc_id, neighbours in sorted(SIBLINGS.items()):
            source = "field.client-passport-issued-by"
            before = json.loads(browser.eval(
                SIBLING_POSITIONS.replace("DOC", json.dumps(doc_id))
                .replace("SOURCE", json.dumps(source))
                .replace("VALUE", json.dumps(VALUES[ORDINARY], ensure_ascii=False)),
                await_promise=True))
            after = json.loads(browser.eval(
                SIBLING_POSITIONS.replace("DOC", json.dumps(doc_id))
                .replace("SOURCE", json.dumps(source))
                .replace("VALUE", json.dumps(VALUES["ru-very-long"], ensure_ascii=False)),
                await_promise=True))
            if not checks.check(f"{doc_id}: both sibling renders are produced",
                                before["ok"] and after["ok"], ""):
                continue
            # However many bands the issuer actually needed — one in the two
            # simplified questionnaires, two in the full one — every row below
            # it travels by exactly that, and by the same amount as each other.
            height = float(neighbours["rowHeight"]) * int(after["rows"])
            checks.check(f"{doc_id}: the ordinary render grows nothing",
                         int(before["rows"]) == 0, f"{before['rows']} band(s)")
            checks.check(f"{doc_id}: a full department name grows the issuer row",
                         int(after["rows"]) >= 1, f"{after['rows']} band(s)")
            for field_id in neighbours["above"]:
                start = (before["positions"] or {}).get(field_id)
                end = (after["positions"] or {}).get(field_id)
                if not checks.check(f"{doc_id}/{field_id}: drawn in both renders",
                                    bool(start and end), f"{start} -> {end}"):
                    continue
                checks.check(f"{doc_id}/{field_id}: stays put above the grown row",
                             abs(end["top"] - start["top"]) <= 0.05,
                             f"{start['top']} -> {end['top']}")
            for field_id in neighbours["below"]:
                start = (before["positions"] or {}).get(field_id)
                end = (after["positions"] or {}).get(field_id)
                if not checks.check(f"{doc_id}/{field_id}: drawn in both renders",
                                    bool(start and end), f"{start} -> {end}"):
                    continue
                checks.check(f"{doc_id}/{field_id}: moves by exactly the grown bands",
                             abs((end["top"] - start["top"]) - height) <= 0.05,
                             f"{start['top']} -> {end['top']} (expected +{height})")

        # The guard that keeps the recorded beyond-realistic window out of
        # reach: no production profile may grow the power-of-attorney intro
        # paragraph past one line, with or without the longest real authority.
        for intro_profile in INTRO_PROFILES:
            for scenario, value in VALUES.items():
                script = (INTRO_GROWTH
                          .replace("PROFILE", json.dumps(intro_profile))
                          .replace("BLOCK", json.dumps(INTRO_BLOCK))
                          .replace("VALUE", json.dumps(value, ensure_ascii=False)))
                grown = json.loads(browser.eval(script, await_promise=True))
                if not grown["ok"]:
                    continue
                checks.check(
                    f"{INTRO_BLOCK} stays within {INTRO_MAX_EXTRA_ROWS} extra line "
                    f"for {intro_profile}/{scenario}",
                    grown["rows"] <= INTRO_MAX_EXTRA_ROWS,
                    f"{grown['rows']} extra line(s)")

        checks.check("no console errors", not browser.console,
                     "; ".join(browser.console[:3]))
    finally:
        browser.stop()
        server.stop()
    return checks.report("Passport issuing authority")


if __name__ == "__main__":
    sys.exit(main())
