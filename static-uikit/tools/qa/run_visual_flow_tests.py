"""Reading-flow QA: does a value that fits still LOOK like one field?

    python static-uikit/tools/qa/run_visual_flow_tests.py
    python static-uikit/tools/qa/run_visual_flow_tests.py --json report.json

The other suites answer three questions that are all necessary and none of
which is sufficient:

  structural validity   the value is complete, the PDF parses, nothing is drawn
                        below the readability floor, no source content is lost
  geometric validity    no overlap, nothing crosses a rule or a page boundary,
                        every inserted row is inside a reviewed band
  reading-flow validity  ← this file

A layout can pass the first two and still be wrong. The account-opening notice
proved it: the payment reference was complete, on an approved line, inside its
own cell, at a legal size — and it printed 95 pt to the right of a still-empty
«№» blank, on the line that says «ФОНДОВЫЙ РЫНОК». Nothing measured it because
nothing was measuring whether the result reads as one sentence.

So this suite asserts the properties a person checks by eye, from the
renderer's own line boxes and region assignment rather than from pixels:

  1. an exact reference is one whole token, on one line, in the block that
     introduces it, immediately after the «№» that names it;
  2. a value's own lines keep one rhythm — a continuation may not open a gap
     that reads as a new paragraph;
  3. a printed placeholder never survives into the output when a real value
     replaces it;
  4. every market row of a repeated pattern gets the same treatment.

Developer-workstation tooling; fictional fixtures only. No Office tool is
involved and no source PDF is touched.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from headless_browser import STATIC_UIKIT  # noqa: E402

SMOKE_TOOLS = os.path.join(
    STATIC_UIKIT, "manual-smoke", "word-flow-long-data", "tools")
if SMOKE_TOOLS not in sys.path:
    sys.path.insert(0, SMOKE_TOOLS)

from smoke_engine import SmokeBrowser  # noqa: E402


# The largest vertical drift, in points, that two lines of ONE value may have
# between them before the lower one stops reading as a continuation. Half a
# printed line at 11 pt: below this a reader sees one paragraph, above it they
# see a caption. The account-opening defect was 4.31 pt over a 9.97 pt rhythm.
LEADING_TOLERANCE = 1.25

# The largest horizontal gap between the token that introduces a value and the
# value itself. «№» and its reference share a line or the layout is wrong.
INTRODUCER_GAP = 1.0


LAYOUT_PROBE = r"""
(function (docId, baseProfile, overrides) {
  var maps = window.CRMDocumentEngine.fieldMaps;
  var R = window.CRMDocumentEngine.overlayRenderer;
  var template = maps[docId];
  var payload = window.__smoke.payloadFor(docId, baseProfile, overrides);
  var out = { ok: true, fields: {}, blocks: {} };

  // `render` is the only entry point that reports where every line of every
  // value actually lands; `preflight` answers a narrower question. The Blob it
  // produces is discarded — this suite reads geometry, not bytes.
  return R.render(template, payload, { onPlan: function (decided) {
    var planned = decided.planned || decided;

    // Ordinary fields: one entry per printed line, with the region the
    // renderer assigned it to and the baseline it will really be drawn at.
    Object.keys(planned.byField || {}).forEach(function (id) {
      var p = planned.byField[id];
      if (!p || !p.drawn || !p.layout) return;
      var regions = p.layout.regions || [];
      out.fields[id] = {
        value: p.value,
        size: p.layout.size,
        lines: (p.layout.lines || []).map(function (line) {
          var region = regions[line.regionIndex] || {};
          var lineHeight = region.lineHeightRatio
            ? p.layout.size * region.lineHeightRatio
            : (region.lineHeight != null ? region.lineHeight : p.layout.size * 1.15);
          return {
            text: line.text,
            page: line.page,
            regionIndex: line.regionIndex,
            inserted: !!region.inserted,
            baselineTop: region.baselineTop + line.lineIndex * lineHeight,
            left: region.left,
            width: region.width
          };
        })
      };
    });

    // Word-flow blocks: the printed lines of the reviewed paragraph, with
    // every run's field, x position and width.
    Object.keys(planned.byBlock || {}).forEach(function (id) {
      var p = planned.byBlock[id];
      if (!p || !p.drawn || !p.layout) return;
      out.blocks[id] = {
        values: p.values || {},
        lines: (p.layout.lines || []).map(function (line) {
          return {
            text: line.text,
            baselineTop: line.baselineTop,
            runs: (line.runs || []).map(function (run) {
              return { type: run.type, text: run.text, x: run.x,
                       width: run.width, textWidth: run.textWidth,
                       fieldId: run.sourceFieldId || null,
                       fontSize: run.fontSize };
            })
          };
        })
      };
    });
  } }).then(function () {
    return JSON.stringify(out);
  }, function (error) {
    return JSON.stringify({ ok: false,
      message: String(error && error.message || error) });
  });
}(DOC, PROFILE, OVERRIDES))
"""


# ── Scenarios ────────────────────────────────────────────────────────────────
#
# Every value is this repository's own synthetic fixture data.

PAYMENT_ROWS = [
    ("paymentPurposeStock", "account-opening-payment-purpose-stock", "ФОНДОВЫЙ РЫНОК"),
    ("paymentPurposeCurrency", "account-opening-payment-purpose-currency", "ВАЛЮТНЫЙ РЫНОК"),
    ("paymentPurposeDerivatives", "account-opening-payment-purpose-derivatives", "СРОЧНЫЙ РЫНОК"),
]

PAYMENT_REFERENCES = {
    "short": "БД-000417",
    "ordinary": "БД-2026/000417-СПБ",
    "realistic-long": "БД-2026/000417-СПБ",
    "maximum": "БД-2026/000417-СПБ-01",
}

# Short and long CRM client codes. The form prints «Код INV0000X» /
# «Код XXXXXXХ» as a sample; both of these have to replace it cleanly.
CLIENT_CODES = {
    "short": "INV-014",
    "long": "INV-TEST-2026-00000017",
}

# Placeholder text that must never reach a generated document.
PLACEHOLDERS = ("INV0000X", "INVXXXXXX", "XXXXXXХ", "XXXXXXX")

# Fields whose value may be split across a printed line and a continuation.
# Each is checked for one rhythm across its own lines.
# Every value here is one the reviewed configuration is meant to hold — the
# same rungs the focused review pack and the smoke pack use. A value the map
# legitimately refuses is a capacity question, not a reading-flow one, and
# belongs to the substitution audit instead.
CONTINUATION_FIELDS = [
    ("anketa-yul", "en-company-normal", "foreignName", "field.client-english-name",
     "Interregional Investment, Industrial and Infrastructure Company for "
     "Technological Development, Joint-Stock Company, Branch Office", {}),
    ("anketa-yul", "en-company-normal", "foreignName", "field.client-english-name",
     "International Industrial and Infrastructure Development Holdings "
     "Corporation Limited", {}),
    ("anketa-yul", "ru-company-normal", "fundsOtherDetails", "extra.source-of-funds-other",
     "Доход от предпринимательской деятельности и инвестиционных операций",
     {"check.funds-other": True}),
    ("anketa-yul", "ru-company-normal", "bankName", "extra.bank-name",
     "АО «Северо-Западный инвестиционный банк»", {}),
]


def check(results: list, ok: bool, label: str, detail: str = "") -> None:
    results.append({"ok": bool(ok), "label": label, "detail": detail})


def payment_purpose_checks(browser: SmokeBrowser, results: list) -> None:
    """The reading flow of the three payment-purpose rows."""
    for code_name, code in CLIENT_CODES.items():
        for rung, reference in PAYMENT_REFERENCES.items():
            overrides = {
                "extra.extra-brokerage-contract": reference,
                "field.client-code": code,
            }
            probe = run_probe(browser, "account-opening-notice",
                              "ru-company-normal", overrides)
            where = f"account-opening-notice [{code_name} code / {rung}]"
            if not probe.get("ok"):
                check(results, False, where, probe.get("message", "render refused"))
                continue

            for field_id, block_id, market in PAYMENT_ROWS:
                block = probe["blocks"].get(block_id)
                if not block:
                    check(results, False, f"{where} {block_id}",
                          "the reviewed block did not draw")
                    continue
                assert_payment_row(results, where, block_id, field_id, market,
                                   block, reference, code)


def assert_payment_row(results, where, block_id, field_id, market, block,
                       reference, code) -> None:
    prefix = f"{where} {block_id}"
    lines = block["lines"]
    runs = [(index, run) for index, line in enumerate(lines)
            for run in line["runs"]]

    # 1. The exact reference is one whole token on one line.
    ref_runs = [(i, r) for i, r in runs if r["fieldId"] == field_id]
    check(results, len(ref_runs) == 1,
          f"{prefix}: reference is one unbroken token",
          f"drawn as {len(ref_runs)} fragment(s): "
          f"{[r['text'] for _, r in ref_runs]}")
    if len(ref_runs) != 1:
        return
    ref_line, ref_run = ref_runs[0]
    check(results, ref_run["text"] == reference,
          f"{prefix}: reference is rendered verbatim",
          f"wanted {reference!r}, drew {ref_run['text']!r}")

    # 2. It is preceded on the SAME line by the «№» that introduces it, with
    #    no gap. This is the check the old layout would have failed: there the
    #    reference sat alone on the row's third line, 95 pt from anything.
    same_line = [r for r in lines[ref_line]["runs"]
                 if r["x"] + r["width"] <= ref_run["x"] + 1e-6]
    introducer = same_line[-1] if same_line else None
    check(results, introducer is not None and introducer["text"].endswith("№"),
          f"{prefix}: «№» introduces the reference on its own line",
          f"line reads {lines[ref_line]['text']!r}")
    if introducer is not None:
        gap = ref_run["x"] - (introducer["x"] + introducer["width"])
        check(results, gap <= INTRODUCER_GAP,
              f"{prefix}: no gap between «№» and the reference",
              f"{gap:.2f} pt (limit {INTRODUCER_GAP})")

    # 3. The reference is not the last thing on the line — the sentence goes
    #    on. A reference that ends its line reads as a caption.
    after = [r for r in lines[ref_line]["runs"] if r["x"] > ref_run["x"]]
    check(results, bool(after),
          f"{prefix}: the sentence continues after the reference",
          f"line reads {lines[ref_line]['text']!r}")

    # 4. The CRM client code replaced the printed sample, in this row.
    code_runs = [r for _, r in runs if r["fieldId"] == "paymentPurposeClientCode"]
    check(results, len(code_runs) == 1 and code_runs[0]["text"] == code,
          f"{prefix}: the CRM client code is drawn",
          f"drew {[r['text'] for r in code_runs]}, wanted {code!r}")

    # 5. No printed placeholder survives anywhere in the block.
    printed = " ".join(line["text"] for line in lines)
    leaked = [p for p in PLACEHOLDERS if p in printed]
    check(results, not leaked, f"{prefix}: no placeholder client code remains",
          f"found {leaked} in {printed!r}")

    # 6. The market designation the row is about is still in the sentence.
    check(results, market in printed.replace("\n", " "),
          f"{prefix}: the row still names «{market}»", printed)

    # 7. One rhythm across the block's own lines.
    assert_one_rhythm(results, f"{prefix}: block",
                      [line["baselineTop"] for line in lines])


def assert_one_rhythm(results, label, baselines) -> None:
    """Every step between consecutive lines of one value is the same step."""
    steps = [round(b - a, 3) for a, b in zip(baselines, baselines[1:])]
    if len(steps) < 2:
        check(results, True, f"{label}: one reading rhythm", "fewer than 3 lines")
        return
    drift = max(steps) - min(steps)
    check(results, drift <= LEADING_TOLERANCE,
          f"{label}: one reading rhythm",
          f"line steps {steps} differ by {drift:.2f} pt "
          f"(limit {LEADING_TOLERANCE})")


def continuation_checks(browser: SmokeBrowser, results: list) -> None:
    """A grown row or a continuation line must stay in the paragraph."""
    for doc, profile, field_id, source, value, base in CONTINUATION_FIELDS:
        overrides = dict(base)
        overrides[source] = value
        probe = run_probe(browser, doc, profile, overrides)
        label = f"{doc}/{field_id}"
        if not probe.get("ok"):
            check(results, False, label, probe.get("message", "render refused"))
            continue
        field = probe["fields"].get(field_id)
        if not field:
            check(results, False, label, "the field did not draw")
            continue
        lines = field["lines"]

        assert_one_rhythm(results, label, [l["baselineTop"] for l in lines])

        # A continuation stays on the page its sentence started on.
        pages = {l["page"] for l in lines}
        check(results, len(pages) == 1,
              f"{label}: the value stays on one page", f"pages {sorted(pages)}")

        # …and in its own column. Word lets a wrapped paragraph return to the
        # cell's left margin when the first line began after a printed label —
        # «Иное (указать) …» does exactly that — so a continuation may start
        # further LEFT than the first line. It may never start further right:
        # that is the account-opening failure, where the value walked 95 pt
        # across the cell and stopped reading as the same sentence. Every
        # continuation also shares one left edge with the others.
        lefts = [round(l["left"], 2) for l in lines]
        check(results, all(x <= lefts[0] + 1e-6 for x in lefts[1:]),
              f"{label}: no line starts right of the one it continues",
              f"left edges {lefts}")
        rest = set(lefts[1:])
        check(results, len(rest) <= 1,
              f"{label}: every continuation starts in the same column",
              f"left edges {lefts}")


def run_probe(browser: SmokeBrowser, doc: str, profile: str,
              overrides: dict) -> dict:
    script = (LAYOUT_PROBE
              .replace("DOC", json.dumps(doc))
              .replace("PROFILE", json.dumps(profile))
              .replace("OVERRIDES", json.dumps(overrides, ensure_ascii=False)))
    return json.loads(browser.browser.eval(script, await_promise=True))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json")
    args = parser.parse_args()

    results: list = []
    browser = SmokeBrowser()
    try:
        payment_purpose_checks(browser, results)
        continuation_checks(browser, results)
    finally:
        browser.stop()

    failures = [r for r in results if not r["ok"]]
    for failure in failures:
        print("FAIL", failure["label"])
        if failure["detail"]:
            print("     ", failure["detail"])
    print(f"\nVisual reading flow: {len(results) - len(failures)}/{len(results)} "
          f"checks passed")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump({"checks": results}, fh, ensure_ascii=False, indent=1)

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
