"""«Полное фирменное наименование» — the full legal name a real EGRUL entry has.

    python static-uikit/tools/qa/run_legal_name_row_tests.py
    python static-uikit/tools/qa/run_legal_name_row_tests.py --self-test

Row 1 of the legal-entity questionnaire is one 13.44 pt band and held exactly
one line. That is enough for «АО «Тестовые инвестиции»» and for nothing else:
«Акционерное общество «Международные инвестиционные технологии и
инфраструктурные решения»» is 463.30 pt of text at the row's own 10.5 pt in a
222.9 pt cell, so it wraps to three lines and the form refused it outright. A
company name of that shape is not a stress value — it is what the register
carries — so the row has to grow.

The field list is derived from the live maps through the exact UMI registry,
not typed here, so any other field backed by `umi.company.origname` is picked
up automatically; `EXPECTED_FIELDS` then has to agree, so one also cannot be
added silently.

For `anketa-yul/fullLegalName` this measures the produced PDF:

  * the requested name comes back out of it, once, unshortened;
  * a short name leaves the printed row exactly as the form drew it;
  * a long name opens whole reviewed 13.44 pt bands and nothing else;
  * every row below travels by exactly that height, and every row and printed
    label above stays where the form put it;
  * the seven vertical centre-lines continue through the added height with no
    gap, and no rule is drawn through the glyphs;
  * the value never touches row 2 «Сокращенное наименование» or row 3
    «Наименование на иностранном языке»;
  * nothing drops below the 9 pt floor and no printed text is covered;
  * preflight and render agree on the same expansion plan;
  * no page is appended and the page's reviewed reserve is respected.

Every other document that prints the same UMI field is swept with the same
names, so «fix it only where it is broken» is a measured statement rather than
an assumption.

All values are synthetic.
"""

from __future__ import annotations

import argparse
import base64
import json
import sys

import fitz  # pymupdf

from headless_browser import Chrome, Server


DOCUMENT = "anketa-yul"
FIELD = "fullLegalName"
SOURCE = "field.client-full-legal-name"
UMI = "umi.company.origname"
PROFILE = "ru-company-normal"

DYNAMIC_FONT_FLOOR = 9.0
OVERLAY_FONT_HINT = "Liberation"
DESCENT = 0.21631

# The reviewed band of the questionnaire's page 1 table and the cut it opens at.
ROW_HEIGHT = 13.44
INSERTION_TOP = 196.22
PAGE_BUDGET = 33.82
# The seven vertical centre-lines of the page 1 table, from the source PDF.
COLUMNS = [63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62]

# Row 1 is the growable one. Row 2 and row 3 must never be touched by it, and
# the checkboxes and title above it must never move.
ROW_TWO = "shortName"
ROW_THREE = "foreignName"
ROW_THREE_TOP = 234.02      # row 3's own reviewed cut, when it grows too
BELOW = ["shortName", "foreignName", "legalForm", "kpp", "egrulAddress"]
ABOVE_TOP = 182.06          # the table's own top rule; nothing above it moves

# Every registry path whose exact UMI field is — or composes — the company's
# full legal name. Derived below from `CRMDocumentEngine.umiRegistry.aliases`,
# so a renamed or added compatibility path is picked up rather than assumed;
# this list is the floor the derivation has to reach.
EXPECTED_ORIGNAME_PATHS = {
    "field.client-full-legal-name",
    "field.client-full-name",
    "field.clientFullName",
    "subject.displayName",
    "subject.fullLegalName",
}

# document/field -> mechanism, for every place a company subject's full legal
# name is printed. Derived below and required to match exactly.
EXPECTED_FIELDS = {
    ("accession-application-yul", "companyFullLegalName"): "word-flow block",
    ("account-opening-notice", "clientName"): "growable table row",
    ("anketa-yul", "fullLegalName"): "growable table row",
    ("broker-use-refusal-request", "clientName"): "growable table row",
    ("broker-use-refusal-request", "clientPrintedName"): "inline slot",
    ("client-notifications", "clientFullName"): "word-flow block",
    ("client-notifications", "signatureName"): "inline slot",
    ("code-word-request", "clientFullName"): "word-flow block",
    ("code-word-request", "signatureName"): "inline slot",
    ("order-forms", "moveClientName"): "inline slot",
    ("order-forms", "payoutClientName"): "inline slot",
    ("order-forms", "tradeClientName"): "growable table row",
    ("power-of-attorney", "flPrincipalName"): "word-flow block",
    ("power-of-attorney", "flSignerName"): "inline slot",
    ("power-of-attorney", "ulCompanyName"): "word-flow block",
    ("qualification-notice", "clientName"): "word-flow block",
    ("qualification-notice", "recipientName"): "word-flow block",
    ("qualification-notice", "registerEntryOrgName"): "word-flow block",
    ("qualification-notice", "registerEntryPersonName"): "word-flow block",
    ("qualification-request-yul", "companyFullLegalName"): "word-flow block",
    ("regulation-full-refusal-notice", "clientName"): "growable table row",
    ("regulation-full-refusal-notice", "clientPrintedName"): "inline slot",
    ("regulation-partial-refusal-notice", "clientName"): "growable table row",
    ("regulation-partial-refusal-notice", "clientPrintedName"): "inline slot",
}

# The same registry paths also feed the three questionnaires a natural person
# fills in, where the value is a ФИО and not an organisation name. Named here so
# the enumeration gate proves they were considered and deliberately excluded
# from the company sweep: those documents are never generated for a company
# subject, and their own row growth is pinned by
# `run_passport_authority_tests.py` and `run_table_ownership_tests.py`.
INDIVIDUAL_ONLY = {
    ("accession-application-fl", "clientFullName"),
    ("accession-application-fl", "signatureName"),
    ("anketa-fl", "fullName"),
    ("anketa-fl", "signaturePrintedName"),
    ("anketa-fl-simplified-id", "clientFullName"),
    ("anketa-fl-simplified-id", "signatureName"),
    ("anketa-ip-sz", "clientFullName"),
    ("anketa-ip-sz", "signaturePrintedName"),
    ("qualification-consequences-notice", "applicantFullName"),
    ("qualification-consequences-notice", "acknowledgementName"),
    ("qualification-request-fl", "clientFullName"),
    ("qualification-request-fl", "signatureName"),
}

# ── The six focused fixtures ──────────────────────────────────────────────────
#
# Synthetic, but every shape is one the register really carries. `bands` is the
# number of reviewed 13.44 pt rows the row must open — 0 means the printed row
# is left exactly as the form drew it.
SHORT_RU = "АО «Тестовые инвестиции»"
LONG_RU = "Акционерное общество «Специализированный депозитарий инвестиционных фондов»"
SHORT_LATIN = "North Star Investments Ltd."
LONG_FOREIGN = (
    "Interregional Investment, Industrial and Infrastructure Company "
    "for Technological Development, Joint-Stock Company"
)
VERY_LONG_RU = (
    "Акционерное общество «Международные инвестиционные технологии "
    "и инфраструктурные решения»"
)
# Row 3's own reviewed growth: a real foreign legal name needs a third line in
# its already double-height cell.
LONG_ROW_THREE = LONG_FOREIGN
SHORT_ROW_THREE = "Test Investments JSC"

FIXTURES = [
    {"id": "short-ru", "value": SHORT_RU, "row3": SHORT_ROW_THREE,
     "bands": 0, "lines": 1,
     "title": "короткое русское наименование"},
    {"id": "long-ru", "value": LONG_RU, "row3": SHORT_ROW_THREE,
     "bands": 1, "lines": 2,
     "title": "длинное русское наименование"},
    {"id": "short-latin", "value": SHORT_LATIN, "row3": SHORT_ROW_THREE,
     "bands": 0, "lines": 1,
     "title": "короткое латинское наименование"},
    {"id": "long-foreign", "value": LONG_FOREIGN, "row3": SHORT_ROW_THREE,
     "bands": 2, "lines": 3,
     "title": "длинное иностранное наименование"},
    {"id": "very-long-ru", "value": VERY_LONG_RU, "row3": SHORT_ROW_THREE,
     "bands": 2, "lines": 3,
     "title": "очень длинное реалистичное наименование в три строки"},
    {"id": "long-name-and-foreign", "value": LONG_RU, "row3": LONG_ROW_THREE,
     "bands": 1, "lines": 2, "row3Bands": 1,
     "title": "длинное наименование вместе с длинным иностранным в строке 3"},
]

# The row's measured ceiling and the first value past it. Three printed lines
# hold 658.50 pt of Cyrillic at the row's own 10.5 pt — a 129-character
# «Публичное акционерное общество …» — and the 151-character name that adds
# «и управления активами» to it needs a fourth line the page cannot pay for. It
# is refused rather than shortened, which is the honest answer, and both bounds
# are pinned so neither can drift unnoticed.
LONGEST_ACCEPTED = (
    "Публичное акционерное общество «Межрегиональная "
    "инвестиционно-промышленная и инфраструктурная компания технологического "
    "развития»"
)
BEYOND_REALISTIC = (
    "Публичное акционерное общество «Межрегиональная "
    "инвестиционно-промышленная и инфраструктурная компания технологического "
    "развития и управления активами»"
)


# The exact UMI registry decides which compatibility paths carry the company's
# own name; the maps are then walked for every field bound to one of them. A
# new alias or a new field therefore shows up here without being typed in.
ENUMERATE = r"""
(function (umi) {
  const aliases = (CRMDocumentEngine.umiRegistry || {}).aliases || {};
  const paths = {};
  Object.keys(aliases).forEach(function (path) {
    const bound = aliases[path].umi;
    const list = Array.isArray(bound) ? bound : (bound ? [bound] : []);
    if (list.indexOf(umi) >= 0) paths[path] = aliases[path];
  });
  const out = [];
  const maps = CRMDocumentEngine.fieldMaps;
  Object.keys(maps).sort().forEach(function (docId) {
    const t = maps[docId];
    (t.fields || []).forEach(function (field) {
      const source = String(field.source || '');
      if (!paths[source]) return;
      const own = (t.cellOwnership || []).filter(function (o) {
        return o.fieldId === field.id;
      })[0] || null;
      out.push({
        documentId: docId, fieldId: field.id, source: source,
        page: field.page, appliesTo: t.appliesTo || [],
        registryKind: paths[source].kind || null,
        mechanism: field.layoutMode === 'flow-reference' ? 'word-flow block'
          : (field.flowRegions ? 'reviewed continuation regions'
             : (field.expansion ? 'growable table row'
                : (own ? 'fixed table cell' : 'inline slot'))),
        maxExtraRows: field.expansion ? Number(field.expansion.maxExtraRows || 0) : 0,
        reviewedLines: own ? Number(own.maxReviewedLines) : null,
        canGrow: own ? !!own.canGrow : false,
        width: Number(field.width)
      });
    });
  });
  return JSON.stringify({ paths: Object.keys(paths).sort(), fields: out });
}(UMI))
"""


# Preflight only: cheap enough to sweep every other document that prints the
# same UMI field with every name in the matrix.
SWEEP = r"""
(async function (docId, source, value, profile) {
  const R = CRMDocumentEngine.overlayRenderer;
  const t = CRMDocumentEngine.fieldMaps[docId];
  const project = CRMDocumentBuilder.schema.fromProduction(t, null);
  const overrides = {}; overrides[source] = value;
  const payload = CRMDocumentBuilder.fixtures.payloadFor(profile, project, overrides);
  try {
    const pre = await R.preflight(t, payload);
    return JSON.stringify({
      ok: !!pre.ok,
      overflows: (pre.overflows || []).map(function (o) {
        return [o.fieldId || o.blockId, o.reason];
      })
    });
  } catch (error) {
    return JSON.stringify({ ok: false, error: String(error && error.message || error) });
  }
}(DOC, SOURCE, VALUE, PROFILE))
"""


RENDER = r"""
(async function (value, row3, profile) {
  const R = CRMDocumentEngine.overlayRenderer;
  const t = CRMDocumentEngine.fieldMaps[DOC];
  const project = CRMDocumentBuilder.schema.fromProduction(t, null);
  const overrides = {};
  overrides[SOURCE] = value;
  if (row3 != null) overrides['field.client-english-name'] = row3;
  const payload = CRMDocumentBuilder.fixtures.payloadFor(profile, project, overrides);

  const pre = await R.preflight(t, payload);
  const preRows = {};
  (pre.expansion || []).forEach(function (note) {
    preRows[note.fieldId] = (preRows[note.fieldId] || 0) + Number(note.rows || 0);
  });
  if (!pre.ok) {
    return JSON.stringify({
      ok: false, preRows: preRows,
      overflows: (pre.overflows || []).map(function (o) {
        return { fieldId: o.fieldId || o.blockId, reason: o.reason,
                 message: (o.message || '').slice(0, 200) };
      })
    });
  }

  const notes = [];
  let fragments = [];
  let rendered = null;
  let positions = {};
  let planRows = {};
  let shifts = [];
  const blob = await R.render(t, payload, {
    onExpansion: function (items) { items.forEach(function (i) { notes.push(i); }); },
    onPlan: function (d) {
      const plan = (d.plans || {})[0] || {};
      shifts = (plan.shifts || []).map(function (s) {
        return { fieldId: s.fieldId || null, fromTop: s.fromTop,
                 toTop: s.toTop, delta: s.delta };
      });
      (plan.rows || []).forEach(function (row) {
        planRows[row.fieldId] = (planRows[row.fieldId] || 0) + 1;
      });
      Object.keys(d.planned.byField).forEach(function (id) {
        const own = d.planned.byField[id];
        if (!own || !own.drawn || !own.layout) return;
        const regions = own.layout.regions || own.regions || [];
        const first = (own.layout.lines || [])[0];
        if (!first) return;
        const region = regions[first.regionIndex] || {};
        positions[id] = { page: Number(region.page),
                          top: Math.round(Number(region.baselineTop) * 100) / 100 };
      });
      const own = d.planned.byField[FIELD];
      if (own && own.drawn && own.layout) {
        rendered = own.value;
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
            fontSize: Number(own.layout.size), text: line.text,
            inserted: !!region.inserted,
            rowTop: region.rowTop != null ? Number(region.rowTop) : null,
            columns: region.tableRow ? (region.tableRow.columns || []) : null
          };
        });
      }
    }
  });
  const u8 = new Uint8Array(await blob.arrayBuffer());
  let s = ''; const c = 0x8000;
  for (let i = 0; i < u8.length; i += c) s += String.fromCharCode.apply(null, u8.subarray(i, i + c));
  const audit = pre.ownershipAudit || {};
  return JSON.stringify({
    ok: true, pdf: btoa(s), rendered: rendered, fragments: fragments,
    notes: notes, preRows: preRows, planRows: planRows, shifts: shifts,
    positions: positions,
    expectedPages: Number(t.expectedPages),
    budgetUse: audit.budgetUse || [],
    ownership: (audit.violations || []).map(function (v) {
      return { fieldId: v.fieldId, reason: v.reason, message: v.message };
    })
  });
}(VALUE, ROW3, PROFILE))
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
                print(f"FAIL  {name}\n      {detail[:400]}")
        print(f"\n{title}: {len(self.results) - len(failed)}/{len(self.results)} checks passed")
        return 1 if failed else 0


def horizontal_rules(page: fitz.Page) -> list[tuple[float, float, float]]:
    """Every thin horizontal painted vector: (y, left, right), top-based."""
    out = set()
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        if rect.height < 2.0 and rect.width > 5.0:
            out.add((round((rect.y0 + rect.y1) / 2, 2),
                     round(rect.x0, 2), round(rect.x1, 2)))
    return sorted(out)


def vertical_rules(page: fitz.Page) -> list[tuple[float, float, float]]:
    """Every thin vertical painted vector: (x, top, bottom), top-based."""
    out = set()
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        if rect.width < 2.0 and rect.height > 2.0:
            out.add((round((rect.x0 + rect.x1) / 2, 2),
                     round(rect.y0, 2), round(rect.y1, 2)))
    return sorted(out)


def overlay_chars(page: fitz.Page) -> list[dict]:
    """Every drawn character with its own box, size and baseline."""
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


BLANK_CHARS = set(" \t _.·•-–—«»()/")


def printed_glyphs(page: fitz.Page) -> list[tuple[fitz.Rect, str]]:
    """Every printed character with its own box, minus the printed blanks."""
    out = []
    for block in page.get_text("rawdict").get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if OVERLAY_FONT_HINT in span.get("font", ""):
                    continue
                label = "".join(c.get("c", "") for c in span.get("chars", [])).strip()
                for char in span.get("chars", []):
                    ch = char.get("c", "")
                    if not ch.strip() or ch in BLANK_CHARS:
                        continue
                    out.append((fitz.Rect(char["bbox"]), label))
    return out


def value_boxes(chars: list[dict], fragments: list[dict]) -> list[int]:
    """Indices of the drawn characters that belong to this value."""
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


def shift_at(fixture: dict, top: float) -> float:
    """The engine's own rule: every band whose cut is at or above `top`.

    Both cuts are template coordinates, so a page that grows twice adds both
    deltas to everything below the lower of them and one delta in between.
    """
    total = 0.0
    if top >= INSERTION_TOP - 1e-6:
        total += int(fixture["bands"]) * ROW_HEIGHT
    if top >= ROW_THREE_TOP - 1e-6:
        total += int(fixture.get("row3Bands") or 0) * ROW_HEIGHT
    return total


def audit(checks: Checks, label: str, fixture: dict, payload: dict,
          baseline: dict) -> None:
    value = fixture["value"]
    bands = int(fixture["bands"])
    delta = bands * ROW_HEIGHT
    pdf = base64.b64decode(payload["pdf"])
    document = fitz.open(stream=pdf, filetype="pdf")
    try:
        checks.check(f"{label}: no page was appended",
                     document.page_count == int(payload["expectedPages"]),
                     f"{document.page_count} vs {payload['expectedPages']}")

        whole = "".join(squashed(page.get_text("text")) for page in document)
        checks.check(f"{label}: requested equals rendered",
                     squashed(payload["rendered"]) == squashed(value),
                     f"{payload['rendered']!r}")
        checks.check(f"{label}: the name comes back out of the PDF exactly once",
                     whole.count(squashed(value)) == 1,
                     f"{whole.count(squashed(value))} occurrence(s)")

        # Preflight and render must have produced the same plan, not merely a
        # compatible one: the row count the manager was promised is the one
        # that was drawn.
        checks.check(f"{label}: preflight and render agree on the expansion plan",
                     int(payload["preRows"].get(FIELD, 0)) ==
                     int(payload["planRows"].get(FIELD, 0)) == bands,
                     f"preflight={payload['preRows'].get(FIELD, 0)} "
                     f"render={payload['planRows'].get(FIELD, 0)} expected={bands}")

        notes = sum(int(note["rows"]) for note in payload["notes"]
                    if note.get("fieldId") == FIELD)
        checks.check(f"{label}: the row opens exactly {bands} reviewed band(s)",
                     notes == bands, f"{notes} band(s)")

        if "row3Bands" in fixture:
            row3 = int(payload["planRows"].get(ROW_THREE, 0))
            checks.check(f"{label}: row 3 opens its own band at the same time",
                         row3 == int(fixture["row3Bands"]),
                         f"{row3} band(s)")

        used = {entry["id"]: entry["used"] for entry in payload["budgetUse"]}
        page_one = used.get("anketa-yul-p1-main", 0.0)
        checks.check(f"{label}: page 1 stays inside its reviewed reserve",
                     page_one <= PAGE_BUDGET + 1e-6,
                     f"{page_one} of {PAGE_BUDGET} pt")

        fragments = payload["fragments"]
        if not checks.check(f"{label}: the engine reports where it drew the name",
                            bool(fragments), "no fragments reported"):
            return
        checks.check(f"{label}: it is laid out on {fixture['lines']} line(s)",
                     len(fragments) == int(fixture["lines"]),
                     f"{len(fragments)} line(s)")
        checks.check(f"{label}: the name stays on page 1",
                     {int(f["page"]) for f in fragments} == {0},
                     str(sorted({int(f["page"]) for f in fragments})))

        page = document[0]
        overlay = overlay_chars(page)
        indexes = value_boxes(overlay, fragments)
        boxes = [overlay[index] for index in indexes]
        if not checks.check(f"{label}: its glyphs are found on the page",
                            bool(boxes), "no drawn character matched the plan"):
            return

        drawn_text = squashed("".join(box["text"] for box in boxes))
        checks.check(f"{label}: every character of it is drawn",
                     drawn_text == squashed(value),
                     f"drew {len(drawn_text)} of {len(squashed(value))}: {drawn_text[:70]!r}")
        checks.check(f"{label}: it stays on the page",
                     all(page.rect.contains(box["bbox"]) for box in boxes),
                     str([b["bbox"] for b in boxes if not page.rect.contains(b["bbox"])][:1]))

        smallest = min(box["size"] for box in boxes)
        checks.check(f"{label}: no part of it drops below the 9 pt floor",
                     smallest >= DYNAMIC_FONT_FLOOR - 1e-6, f"{smallest:.2f} pt")

        # Zero border intersections. A form's own rule sitting in the descender
        # band is «typed on the line»; a rule through the letter bodies is the
        # defect this row's growth exists to prevent.
        crossing = []
        for y, left, right in horizontal_rules(page):
            for box in boxes:
                if right < box["bbox"].x0 + 0.2 or left > box["bbox"].x1 - 0.2:
                    continue
                if box["bbox"].y0 + 0.5 < y < box["baseline"] - 0.5:
                    crossing.append((round(y, 2), box["text"]))
        checks.check(f"{label}: zero border intersections", not crossing,
                     str(crossing[:4]))

        # No overlap with rows 2 and 3, or with any other drawn value.
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
                     not overlapping, str(overlapping[:4]))

        # Row numbers and left-side labels are printed text; covering one would
        # destroy the questionnaire's own numbering.
        covered = []
        for box in boxes:
            for other, label_text in printed_glyphs(page):
                overlap = box["bbox"] & other
                if overlap.is_empty or not overlap.is_valid:
                    continue
                if overlap.get_area() > 0.5 * other.get_area():
                    covered.append((box["text"][:16], label_text[:26]))
                    break
        checks.check(f"{label}: it covers no printed row number or label",
                     not covered, str(covered[:4]))

        checks.check(f"{label}: the owning row reports no violation",
                     not payload["ownership"],
                     str([(v["fieldId"], v["reason"]) for v in payload["ownership"]][:3]))

        # ── Row and border movement ──────────────────────────────────────────
        base_page = baseline["page"]
        base_rules = horizontal_rules(base_page)
        grown_rules = horizontal_rules(page)

        above = [r for r in base_rules if r[0] < ABOVE_TOP + 0.5]
        checks.check(f"{label}: every rule above the table top stays put",
                     all(rule in grown_rules for rule in above),
                     str([r for r in above if r not in grown_rules][:3]))

        moved = [(round(y + shift_at(fixture, y), 2), left, right)
                 for y, left, right in base_rules if y > INSERTION_TOP + 0.01]
        missing = [rule for rule in moved
                   if not any(abs(rule[0] - g[0]) <= 0.05 and
                              abs(rule[1] - g[1]) <= 0.05 and
                              abs(rule[2] - g[2]) <= 0.05 for g in grown_rules)]
        checks.check(f"{label}: every rule below the cut moved by exactly "
                     f"its own bands",
                     not missing, str(missing[:4]))

        # The seven vertical centre-lines must run without a gap from the
        # printed row's own top to the moved bottom rule.
        if bands:
            columns = vertical_rules(page)
            gaps = []
            for x in COLUMNS:
                segments = sorted((top, bottom) for cx, top, bottom in columns
                                  if abs(cx - x) <= 0.15 and
                                  bottom > 183.0 and top < INSERTION_TOP + delta + 1.0)
                if not segments:
                    gaps.append((x, "no vector"))
                    continue
                reach = segments[0][1]
                for top, bottom in segments[1:]:
                    if top > reach + 0.6:
                        gaps.append((x, round(reach, 2), round(top, 2)))
                        break
                    reach = max(reach, bottom)
                else:
                    if reach < INSERTION_TOP + delta - 0.6:
                        gaps.append((x, "stops at", round(reach, 2)))
            checks.check(f"{label}: the vertical borders continue through the "
                         f"added height", not gaps, str(gaps[:4]))

        # The signature block and the employee-only page must be untouched.
        last = document[document.page_count - 1]
        checks.check(f"{label}: the employee-only page 5 block is unchanged",
                     horizontal_rules(last) == horizontal_rules(baseline["last"]),
                     "page 5 vectors changed")
    finally:
        document.close()


def positions_moved(checks: Checks, label: str, fixture: dict,
                    payload: dict, baseline: dict) -> None:
    """Rows below travel by exactly the added height; rows above do not move."""
    before = baseline["positions"]
    after = payload["positions"]
    for field_id in BELOW:
        start, end = before.get(field_id), after.get(field_id)
        if not checks.check(f"{label}/{field_id}: drawn in both renders",
                            bool(start and end), f"{start} -> {end}"):
            continue
        expected = shift_at(fixture, start["top"])
        checks.check(f"{label}/{field_id}: moves by exactly the added height",
                     abs((end["top"] - start["top"]) - expected) <= 0.05,
                     f"{start['top']} -> {end['top']} "
                     f"(expected +{round(expected, 2)})")
    for field_id, position in before.items():
        if position["page"] != 0 or position["top"] > INSERTION_TOP:
            continue
        end = after.get(field_id)
        if not end:
            continue
        checks.check(f"{label}/{field_id}: stays put above the grown row",
                     abs(end["top"] - position["top"]) <= 0.05,
                     f"{position['top']} -> {end['top']}")


def self_test() -> int:
    """The gates have to reject the shapes they exist to catch."""
    checks = Checks()

    document = fitz.open()
    page = document.new_page(width=595.32, height=841.92)
    box = {"bbox": fitz.Rect(331.5, 186.0, 450.0, 196.0), "size": 10.5,
           "text": "Акционерное"}
    baseline = box["bbox"].y1 - DESCENT * box["size"]

    checks.check("a rule through the letter bodies is a crossing",
                 box["bbox"].y0 + 0.5 < 190.0 < baseline - 0.5,
                 f"baseline {baseline:.2f}")
    checks.check("a rule in the descender band is not a crossing",
                 not (box["bbox"].y0 + 0.5 < box["bbox"].y1 - 0.2 < baseline - 0.5),
                 f"baseline {baseline:.2f}")

    overlap = box["bbox"] & fitz.Rect(340.0, 187.0, 440.0, 195.0)
    checks.check("a name covering printed text is a failure",
                 not overlap.is_empty and overlap.get_area() >
                 0.5 * fitz.Rect(340.0, 187.0, 440.0, 195.0).get_area(), "")
    beside = box["bbox"] & fitz.Rect(90.5, 186.0, 250.0, 196.0)
    checks.check("a name beside the printed row label is not",
                 beside.is_empty, str(beside))

    checks.check("squashed equality ignores positioned inter-run spacing",
                 squashed("АО «Тестовые инвестиции»") ==
                 squashed("АО«Тестовые  инвестиции»"), "")
    checks.check("squashed equality still rejects a shortened name",
                 squashed(VERY_LONG_RU) != squashed(VERY_LONG_RU[:60]), "")

    # The band arithmetic the movement gate depends on.
    checks.check("two bands are exactly 26.88 pt",
                 abs(2 * ROW_HEIGHT - 26.88) < 1e-9, str(2 * ROW_HEIGHT))
    checks.check("three bands do not fit page 1's reviewed reserve",
                 3 * ROW_HEIGHT > PAGE_BUDGET, f"{3 * ROW_HEIGHT} vs {PAGE_BUDGET}")
    checks.check("a name row and row 3's band together do fit",
                 2 * ROW_HEIGHT <= PAGE_BUDGET, f"{2 * ROW_HEIGHT} vs {PAGE_BUDGET}")

    # A gap in a continued vertical border must be detected.
    segments = [(183.38, 196.22), (209.66, 223.10)]
    reach = segments[0][1]
    gap = any(top > reach + 0.6 for top, _bottom in segments[1:])
    checks.check("a break in a continued vertical border is a gap", gap,
                 str(segments))
    joined = [(183.38, 196.22), (196.22, 209.66)]
    reach = joined[0][1]
    checks.check("an uninterrupted vertical border is not",
                 not any(top > reach + 0.6 for top, _bottom in joined[1:]),
                 str(joined))

    checks.check("the six focused fixtures are all present",
                 len(FIXTURES) == 6 and
                 {f["id"] for f in FIXTURES} == {
                     "short-ru", "long-ru", "short-latin", "long-foreign",
                     "very-long-ru", "long-name-and-foreign"},
                 str(sorted(f["id"] for f in FIXTURES)))
    checks.check("at least one fixture needs three printed lines",
                 any(int(f["lines"]) >= 3 for f in FIXTURES),
                 str([f["lines"] for f in FIXTURES]))
    checks.check("one fixture grows row 1 and row 3 at the same time",
                 any(f.get("row3Bands") and f["bands"] for f in FIXTURES),
                 str([(f["id"], f["bands"], f.get("row3Bands")) for f in FIXTURES]))

    # The cumulative-shift rule the movement gates depend on.
    combined = {"bands": 1, "row3Bands": 1}
    checks.check("a row above the first cut does not move",
                 shift_at(combined, 192.84) == 0, str(shift_at(combined, 192.84)))
    checks.check("a row between the two cuts moves by one band",
                 abs(shift_at(combined, 206.76) - ROW_HEIGHT) < 1e-9,
                 str(shift_at(combined, 206.76)))
    checks.check("a row below both cuts moves by both",
                 abs(shift_at(combined, 244.56) - 2 * ROW_HEIGHT) < 1e-9,
                 str(shift_at(combined, 244.56)))
    document.close()
    return checks.report("Legal-name row self-test")


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

        # ── Every field that prints this exact UMI field ─────────────────────
        enumerated = json.loads(browser.eval(ENUMERATE.replace("UMI", json.dumps(UMI))))
        found = enumerated["fields"]
        checks.check(f"the registry still binds every known path to {UMI}",
                     EXPECTED_ORIGNAME_PATHS <= set(enumerated["paths"]),
                     f"missing {sorted(EXPECTED_ORIGNAME_PATHS - set(enumerated['paths']))}; "
                     f"live {enumerated['paths']}")
        keys = {(row["documentId"], row["fieldId"]) for row in found}
        company = {(row["documentId"], row["fieldId"]) for row in found
                   if "company" in (row["appliesTo"] or [])}
        checks.check("every company full-name field in the maps is audited",
                     company == set(EXPECTED_FIELDS),
                     f"missing {sorted(company - set(EXPECTED_FIELDS))}, "
                     f"stale {sorted(set(EXPECTED_FIELDS) - company)}")
        checks.check("the individual questionnaires are considered and excluded",
                     INDIVIDUAL_ONLY <= keys,
                     str(sorted(INDIVIDUAL_ONLY - keys)))
        wrong = {(row["documentId"], row["fieldId"]): row["mechanism"]
                 for row in found
                 if (row["documentId"], row["fieldId"]) in EXPECTED_FIELDS and
                 row["mechanism"] != EXPECTED_FIELDS[(row["documentId"], row["fieldId"])]}
        checks.check("each of them still uses the mechanism it was reviewed with",
                     not wrong, json.dumps(
                         {f"{k[0]}/{k[1]}": v for k, v in wrong.items()},
                         ensure_ascii=False))

        print(f"{'document':36s} {'field':24s} {'source':30s} pg mechanism")
        for row in sorted(found, key=lambda item: (item["documentId"], item["fieldId"])):
            if (row["documentId"], row["fieldId"]) not in EXPECTED_FIELDS:
                continue
            print(f"{row['documentId']:36s} {row['fieldId']:24s} "
                  f"{row['source']:30s} {row['page'] + 1}  {row['mechanism']}"
                  f" (+{row['maxExtraRows']} rows)")
        print(flush=True)

        by_key = {(row["documentId"], row["fieldId"]): row for row in found}
        target = by_key.get((DOCUMENT, FIELD)) or {}
        checks.check("the questionnaire's row 1 is a growable table row",
                     target.get("mechanism") == "growable table row" and
                     target.get("canGrow") and int(target.get("maxExtraRows") or 0) == 2,
                     json.dumps(target, ensure_ascii=False))

        # ── The six focused fixtures, measured in the produced PDF ───────────
        baseline_payload = None
        results: dict[str, dict] = {}
        for fixture in FIXTURES:
            script = (RENDER
                      .replace("DOC", json.dumps(DOCUMENT))
                      .replace("SOURCE", json.dumps(SOURCE))
                      .replace("FIELD", json.dumps(FIELD))
                      .replace("PROFILE", json.dumps(PROFILE))
                      .replace("ROW3", json.dumps(fixture["row3"], ensure_ascii=False))
                      .replace("VALUE", json.dumps(fixture["value"], ensure_ascii=False)))
            payload = json.loads(browser.eval(script, await_promise=True))
            label = f"{DOCUMENT}/{FIELD} {fixture['id']}"
            if not checks.check(f"{label}: the form accepts a real company name",
                                payload["ok"],
                                str([(o["fieldId"], o["reason"])
                                     for o in payload.get("overflows", [])][:4])):
                continue
            results[fixture["id"]] = payload
            if fixture["id"] == "short-ru":
                document = fitz.open(stream=base64.b64decode(payload["pdf"]),
                                     filetype="pdf")
                baseline_payload = {
                    "document": document,
                    "page": document[0],
                    "last": document[document.page_count - 1],
                    "positions": payload["positions"],
                }
            print(f"{label}: {fixture['lines']} line(s), "
                  f"{fixture['bands']} band(s)", flush=True)

        if checks.check("the unexpanded baseline render is available",
                        baseline_payload is not None, ""):
            for fixture in FIXTURES:
                payload = results.get(fixture["id"])
                if not payload:
                    continue
                label = f"{DOCUMENT}/{FIELD} {fixture['id']}"
                audit(checks, label, fixture, payload, baseline_payload)
                positions_moved(checks, label, fixture, payload, baseline_payload)

            # The ceiling: the longest name three printed lines really hold.
            script = (RENDER
                      .replace("DOC", json.dumps(DOCUMENT))
                      .replace("SOURCE", json.dumps(SOURCE))
                      .replace("FIELD", json.dumps(FIELD))
                      .replace("PROFILE", json.dumps(PROFILE))
                      .replace("ROW3", json.dumps(SHORT_ROW_THREE, ensure_ascii=False))
                      .replace("VALUE", json.dumps(LONGEST_ACCEPTED, ensure_ascii=False)))
            payload = json.loads(browser.eval(script, await_promise=True))
            if checks.check(f"a {len(LONGEST_ACCEPTED)}-character name still fits "
                            f"three printed lines", payload["ok"],
                            str([(o["fieldId"], o["reason"])
                                 for o in payload.get("overflows", [])][:4])):
                ceiling = {"id": "longest-accepted", "value": LONGEST_ACCEPTED,
                           "row3": SHORT_ROW_THREE, "bands": 2, "lines": 3}
                label = f"{DOCUMENT}/{FIELD} longest-accepted"
                audit(checks, label, ceiling, payload, baseline_payload)
                positions_moved(checks, label, ceiling, payload, baseline_payload)
            baseline_payload["document"].close()

        # A 151-character four-part holding name needs a fourth line the page
        # cannot pay for. Either the row refuses it or it is drawn in full;
        # what must never happen is a quietly shortened legal name.
        script = (RENDER
                  .replace("DOC", json.dumps(DOCUMENT))
                  .replace("SOURCE", json.dumps(SOURCE))
                  .replace("FIELD", json.dumps(FIELD))
                  .replace("PROFILE", json.dumps(PROFILE))
                  .replace("ROW3", json.dumps(SHORT_ROW_THREE, ensure_ascii=False))
                  .replace("VALUE", json.dumps(BEYOND_REALISTIC, ensure_ascii=False)))
        payload = json.loads(browser.eval(script, await_promise=True))
        verdict = "refused"
        if payload["ok"]:
            verdict = "accepted"
            whole = "".join(squashed(page.get_text("text"))
                            for page in fitz.open(
                                stream=base64.b64decode(payload["pdf"]),
                                filetype="pdf"))
            checks.check("a 151-character holding name is never shortened",
                         squashed(BEYOND_REALISTIC) in whole,
                         "the rendered text does not contain it in full")
        else:
            checks.check("a name past the row's third line is refused, not cut",
                         any(o["fieldId"] == FIELD for o in payload["overflows"]),
                         str([(o["fieldId"], o["reason"])
                              for o in payload["overflows"]][:4]))
        print(f"{DOCUMENT}/{FIELD}: {len(FIXTURES)} realistic names accepted, "
              f"a 151-character one {verdict}", flush=True)

        # ── Every other document that prints the same UMI field ──────────────
        sweep_values = [SHORT_RU, LONG_RU, SHORT_LATIN, LONG_FOREIGN, VERY_LONG_RU]
        for (doc_id, field_id), mechanism in sorted(EXPECTED_FIELDS.items()):
            if (doc_id, field_id) == (DOCUMENT, FIELD):
                continue
            row = by_key[(doc_id, field_id)]
            refusals = []
            for value in sweep_values:
                script = (SWEEP
                          .replace("DOC", json.dumps(doc_id))
                          .replace("SOURCE", json.dumps(row["source"]))
                          .replace("PROFILE", json.dumps(PROFILE))
                          .replace("VALUE", json.dumps(value, ensure_ascii=False)))
                out = json.loads(browser.eval(script, await_promise=True))
                if not out["ok"]:
                    refusals.append((value[:24], out.get("overflows")
                                     or out.get("error")))
            checks.check(f"{doc_id}/{field_id} ({mechanism}): takes every "
                         f"realistic company name",
                         not refusals, str(refusals[:3]))

        checks.check("no failed asset requests", not browser.requests,
                     "\n".join(browser.requests[-20:]))
    finally:
        browser.stop()
        server.stop()
    return checks.report("Legal-entity full name row")


if __name__ == "__main__":
    sys.exit(main())
