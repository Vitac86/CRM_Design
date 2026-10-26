"""Focused geometry QA for the notice's «Основание для перевода» paragraph.

    python static-uikit/tools/qa/run_transfer_basis_paragraph_tests.py
    python static-uikit/tools/qa/run_transfer_basis_paragraph_tests.py --self-test

Manual review rejected item 2 of the transfer basis: the depository-agreement
sentence rendered with an abnormally large gap above it, so the numbered list
read as two detached blocks instead of one paragraph.

The cause was not leading. `account-opening-transfer-basis` replaces a reviewed
span nested two operator levels deep inside one top-level q…Q block, so its
marker stays inside that parent. When a payment-purpose row inserted higher up
the page moved the parent, `shiftPageContent` wrapped it in
`q 1 0 0 1 0 -delta cm … Q` and the inserted replacement inherited that
translation — while `drawWordFlowBlock` had already added the same page shift
to its own baselines. The paragraph was drawn one whole shift too low: 37.80 pt
here, turning the source's 13.35 pt step from item 1 to item 2 into 51.15 pt.

`Expander.graphicsStateAt` now reads the state in force at each marker and
`replaceReviewedRangeContents` cancels its translation, so a replacement is
placed in page space whatever the shift did around it.

What this suite measures, on the produced PDF rather than on the plan:

  * every step inside the paragraph equals the pitch the source prints;
  * the step from printed item 1 into item 2 equals the source's own step;
  * item 3 keeps the same pitch and never reaches the signature line;
  * «№» stays on the number's line and «от» on the date's;
  * the requested number and date come back out of the PDF unchanged;
  * no client value drops below the 9 pt floor;
  * the paragraph is drawn exactly one page shift below its planned baseline —
    the gate that fails if the double shift ever returns.

Every scenario runs twice: as printed, and with three payment-purpose rows
inserted above it, which is the arrangement manual review actually saw. All
data is synthetic.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys

import fitz  # pymupdf

from headless_browser import STATIC_UIKIT, Chrome, Server


TEMPLATE = os.path.join(
    STATIC_UIKIT, "assets", "document-pdf-templates", "account-opening-notice.pdf"
)

# Measured from the committed template, page 2 (`fitz` text lines):
#   1. Междепозитарный договор …   ink top 605.08
#   2. Депозитарный договор …      ink top 618.43
#   3. Договор купли-продажи …     ink top 631.39
# The list therefore steps 13.35 pt from item 1 to item 2 and 12.96 pt from
# item 2 to item 3. 12.96 is the paragraph pitch the block declares; 13.35 is
# the source's own slightly looser step out of the first printed item.
SOURCE_PITCH = 12.96
SOURCE_STEP_INTO_ITEM_2 = 13.35
PITCH_TOLERANCE = 0.15
DYNAMIC_FONT_FLOOR = 9.0

# Long enough to be a real archive reference, short enough that the whole
# document still accepts it. Beyond 27 characters the page-1 agreement table
# refuses first, and beyond 47 the reference itself becomes an unbreakable
# token — both honest limits of the printed form, pinned in `LIMITS` below.
ORDINARY_NUMBER = "ДЕПО-2026/000417"
LONG_NUMBER = "ДЕПО-2026/000417-СПБ-01"
MAXIMUM_NUMBER = "ДЕПО-2026/000417-СПБ-01/ДНД"
DATE = "2026-08-02"
DATE_PRINTED = "02.08.2026"

# A long client code and a long brokerage reference together make all three
# payment-purpose sentences take one more line, which is what inserts the three
# rows above the transfer basis — the arrangement manual review was looking at.
EXPANDING_OVERRIDES = {
    "field.client-code": "INV-TEST-2026-00000017",
    "extra.extra-brokerage-contract": "БД-2026/000417-СПБ-01",
    "extra.extra-brokerage-contract-date": "2026-07-29",
}
EXPECTED_INSERTED_ROWS = 3

SCENARIOS = [
    ("ordinary", ORDINARY_NUMBER, False),
    ("ordinary-expanded", ORDINARY_NUMBER, True),
    ("long", LONG_NUMBER, False),
    ("long-expanded", LONG_NUMBER, True),
    ("maximum", MAXIMUM_NUMBER, False),
    ("maximum-expanded", MAXIMUM_NUMBER, True),
]

# Values the printed form cannot take, with the reason it gives. Pinned so a
# future change cannot quietly start truncating instead of refusing.
LIMITS = [
    ("ДЕПО-2026/000417-" + "Ж" * 20, "the page-1 agreement table refuses first"),
    ("ДЕПО-2026/000417-" + "Ж" * 40, "unbreakable-token"),
]

ITEM_2_PREFIX = "Депозитарный договор клиента с ООО «ИНВЕСТИКА»"
ITEM_1_PREFIX = "Междепозитарный договор ООО «ИНВЕСТИКА»"
ITEM_3_PREFIX = "Договор купли-продажи, займа и т.п."
SIGNATURE_PREFIX = "Подпись ответственного лица"
BLOCK_ID = "account-opening-transfer-basis"

RENDER = r"""
(async function (number, expand) {
  const R = CRMDocumentEngine.overlayRenderer;
  const t = CRMDocumentEngine.fieldMaps['account-opening-notice'];
  const project = CRMDocumentBuilder.schema.fromProduction(t, null);
  const overrides = {
    'extra.extra-depository-contract': number,
    'extra.extra-depository-contract-date': DATE_ISO
  };
  if (expand) Object.keys(EXPAND_OVERRIDES).forEach(function (key) {
    overrides[key] = EXPAND_OVERRIDES[key];
  });
  const payload = CRMDocumentBuilder.fixtures.payloadFor(
    'ru-company-normal', project, overrides);

  const notes = [];
  let planned = null;
  let inherited = null;
  const blob = await R.render(t, payload, {
    onExpansion: function (items) { items.forEach(function (i) { notes.push(i); }); },
    onPlan: function (d) {
      const block = (t.wordFlowBlocks || []).filter(function (item) {
        return item.id === BLOCK_ID;
      })[0];
      const result = d.planned.byBlock[BLOCK_ID];
      if (!block || !result || !result.drawn) return;
      const plan = (d.plans || {})[block.page] || null;
      // The renderer's own contract: a reviewed block moves with the page,
      // minus the lines it consumes itself. QA predicts the same point so a
      // paragraph drawn one shift too low is a failure and not a new baseline.
      function shiftAt(top) {
        if (!plan) return 0;
        return (plan.shifts || []).reduce(function (total, shift) {
          if (shift.fieldId === BLOCK_ID) return total;
          if (top < shift.fromTop - 1e-6 || top > shift.toTop + 1e-6) return total;
          return total + Number(shift.delta);
        }, 0);
      }
      planned = {
        page: block.page,
        fontSize: Number(block.fontSize),
        lineHeight: Number(block.lineHeight),
        additionalLines: Number(result.layout.additionalLines || 0),
        lines: (result.layout.lines || []).map(function (line) {
          return {
            baselineTop: line.baselineTop,
            expectedTop: line.baselineTop + shiftAt(line.baselineTop),
            text: (line.runs || []).map(function (run) {
              return run.type === 'spacer' ? ' ' : (run.text || '');
            }).join('')
          };
        })
      };
    },
    onReviewedRanges: function (pages) {
      pages.forEach(function (entry) {
        const list = (entry.suppression && entry.suppression.suppressions) || [];
        list.forEach(function (item) {
          if (item.id === BLOCK_ID) inherited = entry.page;
        });
      });
    }
  });
  const u8 = new Uint8Array(await blob.arrayBuffer());
  let s = ''; const c = 0x8000;
  for (let i = 0; i < u8.length; i += c) s += String.fromCharCode.apply(null, u8.subarray(i, i + c));
  return JSON.stringify({ pdf: btoa(s), notes: notes, planned: planned });
}(NUMBER, DO_EXPAND))
"""

PREFLIGHT = r"""
(async function (number) {
  const R = CRMDocumentEngine.overlayRenderer;
  const t = CRMDocumentEngine.fieldMaps['account-opening-notice'];
  const project = CRMDocumentBuilder.schema.fromProduction(t, null);
  const payload = CRMDocumentBuilder.fixtures.payloadFor('ru-company-normal', project, {
    'extra.extra-depository-contract': number,
    'extra.extra-depository-contract-date': DATE_ISO
  });
  const result = await R.preflight(t, payload);
  return JSON.stringify({
    ok: result.ok,
    reasons: (result.overflows || []).map(function (o) {
      return { fieldId: o.fieldId || o.blockId, reason: o.reason };
    })
  });
}(NUMBER))
"""

# The new expander helper, checked against streams whose answer is arithmetic
# rather than a rendering opinion.
GRAPHICS_STATE = r"""
(function () {
  const E = CRMDocumentEngine.pageExpander;
  const cases = [
    { text: 'q 1 0 0 1 0 -12 cm BT ET Q', at: 'BT', expect: [1, 0, 0, 1, 0, -12] },
    { text: 'q 1 0 0 1 0 -12 cm Q BT ET', at: 'BT', expect: [1, 0, 0, 1, 0, 0] },
    { text: 'q 1 0 0 1 0 -12 cm q 1 0 0 1 0 -5 cm BT ET Q Q', at: 'BT',
      expect: [1, 0, 0, 1, 0, -17] },
    { text: 'q 1 0 0 1 0 -12 cm q 1 0 0 1 0 -5 cm Q BT ET Q', at: 'BT',
      expect: [1, 0, 0, 1, 0, -12] },
    { text: 'q 2 0 0 2 0 0 cm BT ET Q', at: 'BT', expect: [2, 0, 0, 2, 0, 0] },
    { text: '1 0 0 1 0 -12 cm BT ET', at: 'BT', expect: [1, 0, 0, 1, 0, -12] },
    { text: 'q /Name 9 Tf 1 0 0 1 0 -3 cm BT ET Q', at: 'BT',
      expect: [1, 0, 0, 1, 0, -3] }
  ];
  return JSON.stringify(cases.map(function (item) {
    const tokens = E.tokenize(item.text);
    const at = item.text.indexOf(item.at);
    return { text: item.text, expect: item.expect,
             got: E.graphicsStateAt(item.text, tokens, at) };
  }));
}())
"""


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


def page_lines(page: fitz.Page) -> list[dict]:
    """Every text line on the page: ink top, left edge, size, font, text."""
    out = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            spans = [s for s in line["spans"] if s["text"].strip()]
            if not spans:
                continue
            out.append({
                "top": min(s["bbox"][1] for s in spans),
                "bottom": max(s["bbox"][3] for s in spans),
                "left": min(s["bbox"][0] for s in spans),
                "size": max(s["size"] for s in spans),
                "font": spans[0]["font"],
                "text": "".join(s["text"] for s in spans).strip(),
            })
    return sorted(out, key=lambda row: (round(row["top"], 2), row["left"]))


def paragraph_steps(tops: list[float]) -> list[float]:
    return [round(tops[i + 1] - tops[i], 2) for i in range(len(tops) - 1)]


def judge(checks: Checks, label: str, tops: list[float], step_in: float | None,
          clearance: float | None) -> None:
    """The geometry verdict, as a pure function of measured ink tops.

    Kept separate from the rendering so `--self-test` can feed it the geometry
    manual review actually rejected and prove this suite rejects it too.
    """
    steps = paragraph_steps(tops)
    wrong = [value for value in steps if abs(value - SOURCE_PITCH) > PITCH_TOLERANCE]
    checks.check(f"{label}: every step inside the paragraph is the source pitch",
                 not wrong, f"{steps} vs {SOURCE_PITCH}")
    if step_in is not None:
        checks.check(f"{label}: the step from item 1 into item 2 is the source's own",
                     abs(step_in - SOURCE_STEP_INTO_ITEM_2) <= PITCH_TOLERANCE,
                     f"{step_in} vs {SOURCE_STEP_INTO_ITEM_2}")
    if clearance is not None:
        checks.check(f"{label}: the paragraph stays clear of the signature line",
                     clearance > SOURCE_PITCH, f"{clearance} pt of clearance")


def render(browser, number: str, expand: bool) -> dict:
    script = (RENDER
              .replace("NUMBER", json.dumps(number, ensure_ascii=False))
              .replace("DO_EXPAND", "true" if expand else "false")
              .replace("DATE_ISO", json.dumps(DATE))
              .replace("EXPAND_OVERRIDES", json.dumps(EXPANDING_OVERRIDES, ensure_ascii=False))
              .replace("BLOCK_ID", json.dumps(BLOCK_ID)))
    return json.loads(browser.eval(script, await_promise=True))


def inspect(checks: Checks, label: str, number: str, expand: bool,
            payload: dict) -> None:
    pdf = base64.b64decode(payload["pdf"])
    planned = payload["planned"]
    if not checks.check(f"{label}: the reviewed paragraph is planned and drawn",
                        bool(planned), "no planned layout reported"):
        return

    document = fitz.open(stream=pdf, filetype="pdf")
    base = fitz.open(TEMPLATE)
    checks.check(f"{label}: no page was appended",
                 document.page_count == base.page_count,
                 f"{document.page_count} vs {base.page_count}")
    page = document[int(planned["page"])]
    lines = page_lines(page)

    # Page 2 also carries the three payment-purpose Word-flow blocks at its
    # top. The transfer basis is the only reviewed paragraph below printed item
    # 1, so anchor the selection on that printed line rather than on the
    # planned position this suite is about to check.
    item_1 = [row for row in lines if row["text"].startswith(ITEM_1_PREFIX)]
    if not checks.check(f"{label}: printed item 1 is still above the paragraph",
                        bool(item_1), "item 1 not found"):
        return
    drawn = [row for row in lines
             if "Liberation" in row["font"] and row["top"] > item_1[0]["top"]]
    numbered = [row for row in drawn if row["left"] < 60]
    body = [row for row in drawn if row["left"] >= 60]
    checks.check(f"{label}: the list keeps its two printed numbers",
                 len(numbered) == 2, f"{[row['text'] for row in numbered]}")

    # Ink tops of the paragraph, one entry per drawn line.
    tops = sorted({round(row["top"], 2) for row in drawn})
    checks.check(f"{label}: the paragraph draws the planned number of lines",
                 len(tops) == len(planned["lines"]),
                 f"{len(tops)} drawn vs {len(planned['lines'])} planned")

    # The gate for the defect itself: every drawn line sits exactly where the
    # renderer said it would, so an inherited translation cannot move it again.
    ascent = 0.891 * float(planned["fontSize"])
    expected = [round(float(line["expectedTop"]) - ascent, 2)
                for line in planned["lines"]]
    off = [(round(a, 2), round(b, 2)) for a, b in zip(tops, expected)
           if abs(a - b) > 0.05]
    checks.check(f"{label}: every line is drawn at its planned baseline",
                 not off and len(tops) == len(expected),
                 f"drawn/planned mismatch {off[:3]}")

    signature = [row for row in lines if row["text"].startswith(SIGNATURE_PREFIX)]
    step_in = round(tops[0] - item_1[0]["top"], 2) if tops else None
    clearance = (round(signature[0]["top"] - max(
        row["bottom"] for row in drawn), 2)) if signature and drawn else None
    judge(checks, label, tops, step_in, clearance)

    # One sentence, not two: the reference and its date stay with their words.
    number_line = [row for row in body if number in row["text"]]
    date_line = [row for row in body if DATE_PRINTED in row["text"]]
    checks.check(f"{label}: the requested number comes back out of the PDF",
                 len(number_line) == 1, f"{len(number_line)} line(s) carry it")
    checks.check(f"{label}: the requested date comes back out of the PDF",
                 len(date_line) == 1, f"{len(date_line)} line(s) carry it")
    if number_line:
        checks.check(f"{label}: «№» stays on the number's line",
                     "№" in number_line[0]["text"],
                     number_line[0]["text"][:70])
    if date_line:
        checks.check(f"{label}: «от» stays on the date's line",
                     "от" in date_line[0]["text"], date_line[0]["text"][:70])
    if number_line and date_line:
        checks.check(f"{label}: number and date are one sentence, not two blocks",
                     abs(number_line[0]["top"] - date_line[0]["top"]) <= 0.05 or
                     abs(number_line[0]["top"] - date_line[0]["top"]) <= SOURCE_PITCH + 0.05,
                     f"{number_line[0]['top']} vs {date_line[0]['top']}")

    whole = " ".join(page.get_text().split())
    checks.check(f"{label}: item 2 is printed exactly once",
                 whole.count(ITEM_2_PREFIX) == 1,
                 f"{whole.count(ITEM_2_PREFIX)} occurrence(s)")
    checks.check(f"{label}: item 3 is printed exactly once",
                 whole.count(ITEM_3_PREFIX) == 1,
                 f"{whole.count(ITEM_3_PREFIX)} occurrence(s)")
    checks.check(f"{label}: no empty «№ от» sentence survives behind the value",
                 "присоединении) № от" not in whole, whole[:0])

    small = [(row["size"], row["text"][:24]) for row in drawn
             if row["size"] < DYNAMIC_FONT_FLOOR - 1e-6]
    checks.check(f"{label}: no paragraph text drops below the 9 pt floor",
                 not small, str(small[:3]))

    rows = sum(int(note["rows"]) for note in payload["notes"])
    checks.check(f"{label}: the expected rows are inserted above the paragraph",
                 rows == (EXPECTED_INSERTED_ROWS if expand else 0),
                 f"{rows} inserted row(s)")

    document.close()
    base.close()


def self_test() -> int:
    """The geometry manual review rejected has to fail these same checks."""
    checks = Checks()

    # Measured from the pre-fix render: the paragraph was drawn 37.80 pt low,
    # so the step out of item 1 was 51.15 pt instead of 13.35 pt while the
    # steps inside it looked perfectly normal.
    broken_tops = [694.18, 707.14, 720.10]
    broken = Checks()
    judge(broken, "double-shifted", broken_tops, 51.15, 44.40)
    failures = [row for row in broken.results if not row[1]]
    checks.check("the pre-fix geometry is rejected", bool(failures),
                 "the double-shifted paragraph passed")
    checks.check("the rejection names the step into item 2",
                 any("item 1 into item 2" in row[0] for row in failures),
                 str([row[0] for row in failures]))
    checks.check("the steps inside the paragraph were never the defect",
                 all("inside the paragraph" not in row[0] for row in failures),
                 str([row[0] for row in failures]))

    # A paragraph whose own leading drifted is rejected too, so this suite is
    # not merely a position check wearing a spacing name.
    loose = Checks()
    judge(loose, "loose-leading", [656.38, 674.00, 691.62], 13.35, 44.40)
    checks.check("a paragraph set on the wrong pitch is rejected",
                 any("inside the paragraph" in row[0]
                     for row in loose.results if not row[1]),
                 str([row[0] for row in loose.results if not row[1]]))

    # And the corrected geometry passes.
    good = Checks()
    judge(good, "corrected", [656.38, 669.34, 682.30], 13.35, 82.20)
    checks.check("the corrected geometry passes",
                 all(row[1] for row in good.results),
                 str([row[0] for row in good.results if not row[1]]))
    return checks.report("Transfer-basis paragraph self-test")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true",
                        help="prove the geometry gates reject the known defect")
    args = parser.parse_args()
    if args.self_test:
        return self_test()

    checks = Checks()
    server, browser = Server(), Chrome()
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")

        states = json.loads(browser.eval(GRAPHICS_STATE))
        for case in states:
            got = [round(float(value), 6) for value in case["got"]]
            checks.check(f"graphics state at «{case['text'][:34]}…»",
                         got == [float(v) for v in case["expect"]],
                         f"{got} vs {case['expect']}")

        for label, number, expand in SCENARIOS:
            payload = render(browser, number, expand)
            inspect(checks, label, number, expand, payload)
            planned = payload.get("planned") or {}
            rows = sum(int(note["rows"]) for note in payload["notes"])
            print(f"{label:20s} {len(planned.get('lines') or []):d} line(s), "
                  f"{rows} row(s) inserted above", flush=True)

        for number, why in LIMITS:
            script = (PREFLIGHT.replace("NUMBER", json.dumps(number, ensure_ascii=False))
                      .replace("DATE_ISO", json.dumps(DATE)))
            result = json.loads(browser.eval(script, await_promise=True))
            checks.check(f"a {len(number)}-character reference is refused, not truncated",
                         not result["ok"], f"{why}: {result['reasons'][:2]}")

        checks.check("no console errors", not browser.console,
                     "; ".join(browser.console[:3]))
    finally:
        browser.stop()
        server.stop()
    return checks.report("Transfer-basis paragraph")


if __name__ == "__main__":
    sys.exit(main())
