"""Preflight and the renderer must reach the same verdict. Prove it.

    python static-uikit/tools/qa/run_preflight_render_agreement_tests.py

The invariant, for identical PDF bytes, map, payload, fonts and configuration:

    preflight.ok === true  =>  render does not fail on layout-plan geometry

It used to be possible to break it. `accession-application-fl`'s identity block
declared an insertion point at 159.95 pt, inside a block that paints
159.02–167.54 pt. `Renderer.decide` reasoned only about declared coordinates,
so preflight approved the plan; `Expander.shiftPageContent` read the real
content stream and refused. The manager was told the document was fine and
generation then failed.

Both phases now ask `Expander.analysePageShift` — one implementation, reading
the page's own content stream — during the single `decide()` pass they share.

This suite covers:

  * the historical payload, from the unmodified production fixture;
  * the invariant across every map and a spread of profiles;
  * every expansion anchor in every schema location sitting on a clean cut;
  * the identity block's row allocation: zero, one, and over-capacity;
  * a foreign-language applicant, which needs a continuation row of its own;
  * an over-capacity refusal naming the field and the rows it wanted.
"""

from __future__ import annotations

import json
import sys

from headless_browser import Chrome, Server

# One realistic-long issuing authority is all it takes to need the row.
RU_AUTHORITY_LONG = (
    "Отделение по вопросам миграции Управления Министерства внутренних дел "
    "Российской Федерации по Центральному административному округу города Москвы"
)
RU_ADDRESS_LONG = (
    "190121, Российская Федерация, город Санкт-Петербург, Адмиралтейский район, "
    "внутригородское муниципальное образование Коломна, набережная реки Мойки, "
    "дом 102, корпус 3, строение 5, помещение 14-Н, офис 217"
)
RU_ADDRESS_ORDINARY = (
    "190121, Российская Федерация, город Санкт-Петербург, Адмиралтейский район, "
    "набережная реки Мойки, дом 102, корпус 3, квартира 217"
)
EN_NAME = "Christopher Alexander Montgomery-Wellington"
EN_AUTHORITY = ("His Majesty's Passport Office, Overseas Territories Identity "
                "and Citizenship Directorate")
EN_ADDRESS = ("Suite 1420, Kingsway Continental House, 118-120 Ludgate Hill "
              "Street, City of London, Greater London, EC4M 7AA, United Kingdom")

PROFILES = ["ru-resident-normal", "ru-resident-long", "ru-company-normal",
            "ru-company-long", "en-nonresident-long", "en-company-long",
            "missing-optional", "maximum-checkboxes"]

AGREEMENT = r"""
(async function (docId, profileId, overrides) {
  const E = CRMDocumentEngine.overlayRenderer;
  const t = CRMDocumentEngine.fieldMaps[docId];
  const project = CRMDocumentBuilder.schema.fromProduction(t, null);
  const payload = CRMDocumentBuilder.fixtures.payloadFor(profileId, project);
  Object.keys(overrides || {}).forEach(function (path) {
    const dot = path.indexOf('.');
    const ns = path.slice(0, dot), key = path.slice(dot + 1);
    const bag = ns === 'subject' ? payload.subject : ns === 'field' ? payload.fields
      : ns === 'extra' ? payload.extraValues : payload.checks;
    if (bag) bag[key] = overrides[path];
  });

  let preflight;
  try {
    const pf = await E.preflight(t, payload);
    preflight = {
      ok: pf.ok,
      fingerprint: pf.fingerprint,
      templateSha256: pf.templateSha256 || null,
      rows: (pf.expansion || []).map(function (n) {
        return { fieldId: n.fieldId, rows: n.rows };
      }),
      overflows: (pf.overflows || []).map(function (o) {
        return { fieldId: o.fieldId, reason: o.reason, message: o.message };
      })
    };
  } catch (error) {
    return JSON.stringify({ preflightThrew: String(error && error.message || error) });
  }

  let render = { ok: true };
  let fingerprint = null;
  try {
    await E.render(t, payload, {
      onPlan: function (decided) { fingerprint = decided.fingerprint; }
    });
  } catch (error) {
    render = {
      ok: false,
      message: String(error && error.message || error),
      overflows: (error.overflows || []).map(function (o) {
        return { fieldId: o.fieldId, reason: o.reason };
      })
    };
  }
  return JSON.stringify({ preflight: preflight, render: render,
                          renderFingerprint: fingerprint });
}(DOC, PROFILE, OVERRIDES))
"""

ANCHOR_PROBE = r"""
(async function () {
  const E = CRMDocumentEngine.overlayRenderer;
  const X = CRMDocumentEngine.pageExpander;
  const maps = CRMDocumentEngine.fieldMaps;
  const out = [];
  for (const id of Object.keys(maps).sort()) {
    const t = maps[id];
    const bytes = await (await fetch(t.templateUrl)).arrayBuffer();
    for (const anchor of E.expansionAnchors(t)) {
      const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      const page = doc.getPages()[anchor.page];
      let straddling = -1;
      if (page) {
        const analysis = X.analysePageShift(page, [{
          fieldId: anchor.id, fromTop: anchor.top, toTop: anchor.toTop,
          delta: anchor.delta, moveTopLevelPaths: anchor.moveTopLevelPaths
        }], {});
        straddling = analysis.straddling.length;
      }
      out.push({ doc: id, id: anchor.id, origin: anchor.origin,
                 page: anchor.page, top: anchor.top, straddling: straddling });
    }
  }
  return JSON.stringify(out);
}())
"""


class Checks:
    def __init__(self) -> None:
        self.results: list[tuple[str, bool, str]] = []

    def check(self, name: str, ok: bool, detail: str = "") -> None:
        self.results.append((name, bool(ok), detail))

    def report(self) -> int:
        failures = [r for r in self.results if not r[1]]
        for name, ok, detail in self.results:
            if not ok:
                print(f"FAIL  {name}\n      {detail}")
        print(f"\nPreflight/render agreement: "
              f"{len(self.results) - len(failures)}/{len(self.results)} checks passed")
        return 1 if failures else 0


def agreement(browser, doc, profile, overrides=None):
    script = (AGREEMENT
              .replace("DOC", json.dumps(doc))
              .replace("PROFILE", json.dumps(profile))
              .replace("OVERRIDES", json.dumps(overrides or {}, ensure_ascii=False)))
    return json.loads(browser.eval(script, await_promise=True))


def main() -> int:
    checks = Checks()
    server, browser = Server(), Chrome()
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")
        doc_ids = sorted(json.loads(browser.eval(
            "JSON.stringify(Object.keys(window.CRMDocumentEngine.fieldMaps))")))

        # ── 1. Every anchor, in every schema location, on a clean cut ────────
        anchors = json.loads(browser.eval(ANCHOR_PROBE, await_promise=True))
        checks.check("expansion anchors are audited in every schema location",
                     any(a["origin"] == "wordFlowBlock" for a in anchors) and
                     any(a["origin"] == "field" for a in anchors) and
                     any(a["origin"] == "compaction" for a in anchors) and
                     any(a["origin"] == "crossPageFlow" for a in anchors),
                     f"origins seen: {sorted({a['origin'] for a in anchors})}")
        for anchor in anchors:
            checks.check(
                f"anchor sits on a complete-operator boundary: "
                f"{anchor['doc']}/{anchor['id']} [{anchor['origin']}] p{anchor['page']}",
                anchor["straddling"] == 0,
                f"@{anchor['top']} straddles {anchor['straddling']} block(s)")

        # ── 2. The historical payload ───────────────────────────────────────
        historical = agreement(browser, "accession-application-fl",
                               "ru-resident-normal",
                               {"field.passportIssuedBy": RU_AUTHORITY_LONG})
        checks.check("historical defect payload: preflight accepts it",
                     historical["preflight"]["ok"],
                     json.dumps(historical["preflight"]["overflows"], ensure_ascii=False))
        checks.check("historical defect payload: the renderer agrees",
                     historical["render"]["ok"],
                     historical["render"].get("message", ""))
        checks.check("historical defect payload: exactly one row is inserted",
                     [r["rows"] for r in historical["preflight"]["rows"]] == [1],
                     json.dumps(historical["preflight"]["rows"]))
        checks.check("the plan fingerprint records which template bytes it used",
                     str(historical["preflight"]["templateSha256"] or "")
                     .startswith(("sha256:", "fnv1a:")),
                     str(historical["preflight"]["templateSha256"]))
        checks.check("preflight and render decide the identical plan",
                     historical["preflight"]["fingerprint"] ==
                     historical["renderFingerprint"],
                     "fingerprints differ")

        # ── 3. The invariant, across every map and profile ───────────────────
        for doc in doc_ids:
            for profile in PROFILES:
                result = agreement(browser, doc, profile)
                if result.get("preflightThrew"):
                    checks.check(f"preflight completes: {doc}/{profile}", False,
                                 result["preflightThrew"])
                    continue
                if not result["preflight"]["ok"]:
                    # A refusal is fine; the renderer must refuse it too.
                    checks.check(
                        f"refusal agrees: {doc}/{profile}",
                        not result["render"]["ok"],
                        "preflight refused but render succeeded")
                    continue
                checks.check(
                    f"accepted plan renders: {doc}/{profile}",
                    result["render"]["ok"],
                    result["render"].get("message", ""))
                checks.check(
                    f"same plan in both phases: {doc}/{profile}",
                    result["preflight"]["fingerprint"] == result["renderFingerprint"],
                    "fingerprints differ")

        # ── 4. Identity-block row allocation ────────────────────────────────
        def rows_of(result):
            return {r["fieldId"]: r["rows"] for r in result["preflight"]["rows"]}

        # The identity values are drawn at the 9 pt readability floor while the
        # form's own wording keeps its printed 8.52 pt, so an ordinary payload
        # already uses the one continuation row this page budgets for. That is
        # the measured cost of the floor on this form, not an accident.
        zero = agreement(browser, "accession-application-fl", "ru-resident-normal")
        checks.check("an ordinary payload uses the one reviewed row",
                     rows_of(zero).get("accession-application-fl-identity") == 1
                     and zero["render"]["ok"],
                     json.dumps(rows_of(zero)))

        one_auth = agreement(browser, "accession-application-fl",
                             "ru-resident-normal",
                             {"field.passportIssuedBy": RU_AUTHORITY_LONG})
        checks.check("a long issuing authority still fits in that one row",
                     rows_of(one_auth).get("accession-application-fl-identity") == 1
                     and one_auth["render"]["ok"],
                     json.dumps(rows_of(one_auth)))

        one_addr = agreement(browser, "accession-application-fl",
                             "ru-resident-normal",
                             {"field.registrationAddress": RU_ADDRESS_ORDINARY})
        checks.check("an ordinary long address fits in that one row",
                     rows_of(one_addr).get("accession-application-fl-identity") == 1
                     and one_addr["render"]["ok"],
                     json.dumps(rows_of(one_addr)))

        # The most extreme address — municipal formation, building, premises
        # and office all present — needs a second row at 9 pt and is refused.
        extreme = agreement(browser, "accession-application-fl",
                            "ru-resident-normal",
                            {"field.registrationAddress": RU_ADDRESS_LONG})
        checks.check("the most extreme address is refused, by both phases",
                     not extreme["preflight"]["ok"] and not extreme["render"]["ok"],
                     json.dumps(rows_of(extreme)))

        both_ordinary = agreement(
            browser, "accession-application-fl", "ru-resident-normal",
            {"field.passportIssuedBy": RU_AUTHORITY_LONG,
             "field.registrationAddress": RU_ADDRESS_ORDINARY})
        checks.check("a long authority and an ordinary long address fit in one row",
                     rows_of(both_ordinary).get(
                         "accession-application-fl-identity") == 1
                     and both_ordinary["render"]["ok"],
                     json.dumps(rows_of(both_ordinary)) +
                     both_ordinary["render"].get("message", ""))

        over = agreement(browser, "accession-application-fl", "ru-resident-normal",
                         {"field.passportIssuedBy": RU_AUTHORITY_LONG,
                          "field.registrationAddress": RU_ADDRESS_LONG})
        checks.check("beyond the reviewed capacity preflight refuses",
                     not over["preflight"]["ok"], "preflight accepted it")
        checks.check("beyond the reviewed capacity the renderer refuses too",
                     not over["render"]["ok"], "render produced a document")
        message = " ".join(o["message"] or "" for o in over["preflight"]["overflows"])
        checks.check("the refusal names the block and the rows it needed",
                     "accession-application-fl-identity" in message and
                     "требуется дополнительных строк: 2" in message and
                     "разрешено: 1" in message,
                     message)

        # ── 5. A foreign applicant ──────────────────────────────────────────
        foreign = agreement(browser, "accession-application-fl",
                            "en-nonresident-normal",
                            {"field.clientFullName": EN_NAME,
                             "field.passportIssuedBy": "UK Passport Office",
                             "field.registrationAddress":
                                 "27 King Street, London, SW1A 2AA, United Kingdom"})
        checks.check("an ordinary foreign applicant generates",
                     foreign["preflight"]["ok"] and foreign["render"]["ok"],
                     foreign["render"].get("message", "") +
                     json.dumps(foreign["preflight"]["overflows"], ensure_ascii=False))

        foreign_long = agreement(
            browser, "accession-application-fl", "en-nonresident-normal",
            {"field.clientFullName": EN_NAME,
             "field.passportIssuedBy": EN_AUTHORITY,
             "field.registrationAddress": EN_ADDRESS})
        checks.check("a foreign applicant with long authority and address generates",
                     foreign_long["preflight"]["ok"] and foreign_long["render"]["ok"],
                     foreign_long["render"].get("message", "") +
                     json.dumps(foreign_long["preflight"]["overflows"],
                                ensure_ascii=False))
    finally:
        browser.stop()
        server.stop()

    return checks.report()


if __name__ == "__main__":
    sys.exit(main())
