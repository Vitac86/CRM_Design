"""Reproduce the measurements the accession one-row limit rests on.

    python static-uikit/tools/qa/verify_accession_row_capacity.py

The individual accession identity block is allowed one continuation row. That
is only an acceptable answer if the page really cannot pay for a second one,
so every number behind it is measured here from the committed PDF and the
production planner rather than quoted:

  page height, body end, reviewed clearance, the resulting one-row and two-row
  bottom margins, whether a fixed footer or signature area is in the way,
  whether any other clean anchor on the page could host the row, and whether a
  reviewed cross-page move is available.

It also checks the behaviour that limit implies: zero-row, one-row Russian and
one-row foreign cases render, an over-capacity case is refused during preflight
naming the block, and the renderer never discovers a failure preflight missed.
"""

from __future__ import annotations

import json
import sys

import fitz

from headless_browser import STATIC_UIKIT, Chrome, Server
import os

TEMPLATE = os.path.join(STATIC_UIKIT, "assets", "document-pdf-templates",
                        "accession-application-fl.pdf")
DOC = "accession-application-fl"
BLOCK = "accession-application-fl-identity"

RU_AUTHORITY_LONG = (
    "Отделение по вопросам миграции Управления Министерства внутренних дел "
    "Российской Федерации по Центральному административному округу города Москвы"
)
RU_ADDRESS_LONG = (
    "190121, Российская Федерация, город Санкт-Петербург, Адмиралтейский район, "
    "внутригородское муниципальное образование Коломна, набережная реки Мойки, "
    "дом 102, корпус 3, строение 5, помещение 14-Н, офис 217"
)
EN_NAME = "Christopher Alexander Montgomery-Wellington"
EN_AUTHORITY = ("His Majesty's Passport Office, Overseas Territories Identity "
                "and Citizenship Directorate")

FACTS = r"""
(async function () {
  const E = CRMDocumentEngine.overlayRenderer;
  const X = CRMDocumentEngine.pageExpander;
  const t = CRMDocumentEngine.fieldMaps['accession-application-fl'];
  const layout = t.pageLayout[0];
  const block = t.wordFlowBlocks.filter(function (b) {
    return b.id === 'accession-application-fl-identity'; })[0];
  const ctx = await E.open(t, {});
  const height = ctx.pages[0].getSize().height;
  const budget = X.pageBudget(layout, layout.anchors, height);

  // Is there any other clean cut on this page that could host a second row,
  // below the block and above the body end?
  const bytes = await (await fetch(t.templateUrl)).arrayBuffer();
  const clean = [];
  for (let top = block.expansion.insertionTop; top <= layout.bodyBottom; top += 1) {
    const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    const analysis = X.analysePageShift(doc.getPages()[0], [{
      fromTop: top, toTop: layout.shiftToTop, delta: block.expansion.rowHeight
    }], {});
    if (!analysis.straddling.length) clean.push(Math.round(top * 100) / 100);
  }
  return JSON.stringify({
    pageHeight: height,
    layout: layout,
    expansion: block.expansion,
    budget: budget,
    cleanCutsBelowAnchor: clean.length,
    firstCleanCuts: clean.slice(0, 6),
    crossPageFlow: layout.crossPageFlow || null,
    compactionZones: (layout.compaction || []).length
  });
}())
"""

CASE = r"""
(async function (profile, overrides) {
  const E = CRMDocumentEngine.overlayRenderer;
  const t = CRMDocumentEngine.fieldMaps['accession-application-fl'];
  const project = CRMDocumentBuilder.schema.fromProduction(t, null);
  const payload = CRMDocumentBuilder.fixtures.payloadFor(profile, project);
  Object.keys(overrides).forEach(function (path) {
    const dot = path.indexOf('.');
    const bag = { subject: payload.subject, field: payload.fields,
                  extra: payload.extraValues, check: payload.checks
                }[path.slice(0, dot)];
    if (bag) bag[path.slice(dot + 1)] = overrides[path];
  });
  const pf = await E.preflight(t, payload);
  let render = { ok: true };
  try { await E.render(t, payload); }
  catch (e) { render = { ok: false, message: String(e && e.message || e) }; }
  return JSON.stringify({
    preflightOk: pf.ok,
    rows: (pf.expansion || []).map(function (n) { return n.rows; }),
    overflows: (pf.overflows || []).map(function (o) {
      return { fieldId: o.fieldId, message: o.message }; }),
    render: render
  });
}(PROFILE, OVERRIDES))
"""


class Checks:
    def __init__(self):
        self.results = []

    def check(self, name, ok, detail=""):
        self.results.append((name, bool(ok), detail))

    def report(self):
        bad = [r for r in self.results if not r[1]]
        for name, ok, detail in self.results:
            print(("  ok   " if ok else "  FAIL ") + name +
                  (f"\n         {detail}" if detail else ""))
        print(f"\nAccession row capacity: "
              f"{len(self.results) - len(bad)}/{len(self.results)} checks passed")
        return 1 if bad else 0


def case(browser, profile, overrides):
    return json.loads(browser.eval(
        CASE.replace("PROFILE", json.dumps(profile))
            .replace("OVERRIDES", json.dumps(overrides, ensure_ascii=False)),
        await_promise=True))


def main() -> int:
    checks = Checks()
    server, browser = Server(), Chrome()
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")
        facts = json.loads(browser.eval(FACTS, await_promise=True))

        layout, budget = facts["layout"], facts["budget"]
        row = float(facts["expansion"]["rowHeight"])
        height = float(facts["pageHeight"])
        body_end = float(layout["bodyBottom"])
        clearance = float(layout["bottomClearance"])
        reserve = height - body_end
        one_row_margin = reserve - row
        two_row_margin = reserve - 2 * row

        print("── measured, from the committed PDF and the production planner ──")
        print(f"  page height                 {height:8.2f} pt")
        print(f"  body ends                   {body_end:8.2f} pt")
        print(f"  reserve to the page edge    {reserve:8.2f} pt")
        print(f"  reviewed bottom clearance   {clearance:8.2f} pt")
        print(f"  page budget (total)         {budget['total']:8.2f} pt")
        print(f"  one continuation row        {row:8.2f} pt")
        print(f"  bottom margin with 1 row    {one_row_margin:8.2f} pt")
        print(f"  bottom margin with 2 rows   {two_row_margin:8.2f} pt")
        print(f"  fixed footer                {layout['fixedFooterFrom']}")
        print(f"  compaction zones            {facts['compactionZones']}")
        print(f"  reviewed cross-page flow    {facts['crossPageFlow']}")
        print(f"  clean cuts below the anchor {facts['cleanCutsBelowAnchor']}")
        print()

        # ── the measurements the limit rests on ─────────────────────────────
        checks.check("the page budget pays for exactly one row",
                     budget["total"] >= row and budget["total"] < 2 * row,
                     f"budget {budget['total']} pt, row {row} pt")
        checks.check("a second row would breach the reviewed clearance",
                     two_row_margin < clearance,
                     f"two rows leave {two_row_margin:.2f} pt against a reviewed "
                     f"{clearance:.2f} pt clearance")
        checks.check("a second row would leave under 10 pt of paper",
                     two_row_margin < 10.0, f"{two_row_margin:.2f} pt")
        checks.check("there is no recoverable white space on this page",
                     facts["compactionZones"] == 0 and budget["recoverable"] == 0,
                     f"{facts['compactionZones']} zone(s), "
                     f"{budget['recoverable']} pt recoverable")
        checks.check("there is no reviewed cross-page move available",
                     facts["crossPageFlow"] is None and budget["flowRecoverable"] == 0,
                     str(facts["crossPageFlow"]))
        checks.check("no alternate anchor would help — the budget, not the cut, "
                     "is what is exhausted",
                     budget["total"] < 2 * row,
                     f"{facts['cleanCutsBelowAnchor']} clean cut(s) exist below "
                     f"the anchor, but the page can only pay for one row")

        # ── the behaviour that limit implies ────────────────────────────────
        zero = case(browser, "ru-resident-normal", {})
        checks.check("an ordinary Russian payload renders",
                     zero["preflightOk"] and zero["render"]["ok"],
                     json.dumps(zero["overflows"], ensure_ascii=False))

        one_ru = case(browser, "ru-resident-normal",
                      {"field.passportIssuedBy": RU_AUTHORITY_LONG})
        checks.check("a one-row Russian case renders",
                     one_ru["preflightOk"] and one_ru["render"]["ok"] and
                     one_ru["rows"] == [1], json.dumps(one_ru["rows"]))

        one_en = case(browser, "en-nonresident-normal",
                      {"field.clientFullName": EN_NAME,
                       "field.passportIssuedBy": EN_AUTHORITY,
                       "field.registrationAddress":
                           "27 King Street, London, SW1A 2AA, United Kingdom"})
        checks.check("a one-row foreign case renders",
                     one_en["preflightOk"] and one_en["render"]["ok"],
                     json.dumps(one_en["overflows"], ensure_ascii=False))

        over = case(browser, "ru-resident-normal",
                    {"field.passportIssuedBy": RU_AUTHORITY_LONG,
                     "field.registrationAddress": RU_ADDRESS_LONG})
        checks.check("a two-row case is refused during preflight",
                     not over["preflightOk"], "preflight accepted it")
        checks.check("the renderer discovers nothing preflight missed",
                     not over["render"]["ok"], "render produced a document")
        message = " ".join(o["message"] or "" for o in over["overflows"])
        checks.check("the refusal names the identity block",
                     BLOCK in message, message[:160])
        checks.check("the refusal states the rows wanted against those allowed",
                     "требуется дополнительных строк: 2" in message and
                     "разрешено: 1" in message, message[:160])
    finally:
        browser.stop()
        server.stop()
    return checks.report()


if __name__ == "__main__":
    sys.exit(main())
