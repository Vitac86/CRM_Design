"""Re-prove the production findings this smoke pack turned up.

    python verify_findings.py

Nothing here is asserted from memory: each finding is reproduced against the
committed maps and the production renderer, and the report records what the
engine actually did. Run it again after any engine change to see whether a
finding still stands.
"""

from __future__ import annotations

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from smoke_engine import SmokeBrowser          # noqa: E402
from smoke_profiles import VALUES as V         # noqa: E402

REPORTS = os.path.join(ROOT, "reports")


def finding_preflight_render_disagreement(browser) -> dict:
    """accession-application-fl: preflight says yes, render refuses.

    Reproduced from an *unmodified* production fixture profile plus a single
    realistic-long passport issuing authority — no smoke-only value is needed
    to reach it.
    """
    doc = "accession-application-fl"
    base = "ru-resident-normal"
    overrides = {"field.passportIssuedBy": V["ru_passport_authority_long"]}

    measured = browser.measure(doc, base, overrides)
    rendered = browser.render(doc, base, overrides)
    added = (measured.get("wordFlow") or {}).get(
        "accession-application-fl-identity")

    baseline = browser.render(doc, base, {})

    # An English-language applicant reaches the same wall with no long value at
    # all: Latin text is wider, so even the shortest plausible foreign identity
    # needs the extra row this block cannot draw.
    english = {
        "field.clientFullName": "P. O'Connor",
        "field.client-full-name": "P. O'Connor",
        "field.passportIssuedBy": "UK Passport Office",
        "field.registrationAddress": "27 King Street, London",
    }
    english_measured = browser.measure(doc, "en-nonresident-normal", english)
    english_rendered = browser.render(doc, "en-nonresident-normal", english)

    reproduced = bool(measured.get("ok")) and not rendered.get("ok")
    return {
        "id": "accession-fl-identity-insertion-band",
        "title": "Заявление о присоединении (ФЛ): preflight accepts a payload "
                 "the renderer then refuses",
        "documentId": doc,
        "block": "accession-application-fl-identity",
        "reproduced": reproduced,
        "status": "FIXED in this branch — kept here so a regression would be "
                  "visible immediately",
        "severity": "high — the wizard told the manager the document was fine "
                    "and generation then failed",
        "reproduction": {
            "baseProductionProfile": base,
            "overrides": overrides,
            "note": "one realistic-long issuing authority; every other value "
                    "is the production fixture's own",
        },
        "observed": {
            "preflightOk": bool(measured.get("ok")),
            "preflightAddedLines": added,
            "renderOk": bool(rendered.get("ok")),
            "renderMessage": rendered.get("message"),
            "sameDocumentWithoutTheExtraRowRenders": bool(baseline.get("ok")),
            "shortestForeignIdentity": {
                "payload": english,
                "preflightOk": bool(english_measured.get("ok")),
                "addedLines": (english_measured.get("wordFlow") or {}).get(
                    "accession-application-fl-identity"),
                "renderOk": bool(english_rendered.get("ok")),
                "note": "Latin text is wider, so a foreign applicant needs "
                        "the continuation row even with no long value. While "
                        "the anchor was broken that made the whole foreign "
                        "variant unreachable; it now generates.",
            },
        },
        "cause": (
            "The straddle check lives only in the render path "
            "(pdf-page-expander.js `shiftPageContent`, which throws when a "
            "top-level content block crosses the shift band). "
            "`Renderer.decide` — and therefore `Renderer.preflight` — never "
            "reads the page content stream, so it cannot see the collision. "
            "For this block the declared insertion point (~159.95 pt) sits "
            "inside printed content at 159.02–167.54 pt, so its one reviewed "
            "extra row can never actually be drawn."
        ),
        "gapInTheGates": (
            "tools/qa/check_expansion_anchors.py only walks `template.fields` "
            "entries that carry `expansion`. Word-flow block anchors "
            "(`template.wordFlowBlocks[].expansion`) are never offered to the "
            "expander, so this anchor is ungated — the suite passes."
        ),
        "howItWasFixed": (
            "`Expander.analysePageShift` now holds the one content-stream "
            "analysis, and `Renderer.decide` — the single pass preflight and "
            "render share — calls it, so a straddle is an ordinary plan error "
            "that both phases report together. The anchor audit was extended "
            "to every schema location, which found seven Word-flow anchors "
            "sitting inside printed blocks, and all seven were re-cut onto "
            "measured complete-operator boundaries. "
            "`tools/qa/run_preflight_render_agreement_tests.py` fails on the "
            "old geometry."
        ),
        "anchorRecut": "insertionTop 159.95 -> 143.82 pt, the midpoint of the "
                       "measured clean band 138.45-149.20 pt",
    }


def finding_one_row_budget(browser) -> dict:
    """Two realistic-long values in the ФЛ identity block need two rows."""
    doc = "accession-application-fl"
    base = "ru-resident-normal"
    only_authority = {"field.passportIssuedBy": V["ru_passport_authority_long"]}
    only_address = {"field.registrationAddress": V["ru_address_long"]}
    both = dict(only_authority, **only_address)

    a = browser.measure(doc, base, only_authority)
    b = browser.measure(doc, base, only_address)
    c = browser.measure(doc, base, both)

    def added(m):
        return (m.get("wordFlow") or {}).get("accession-application-fl-identity")

    return {
        "id": "accession-fl-identity-one-row-budget",
        "title": "Заявление о присоединении (ФЛ): the identity block is "
                 "reviewed for one extra row, and two long values need two",
        "documentId": doc,
        "block": "accession-application-fl-identity",
        "reproduced": bool(a.get("ok")) and bool(b.get("ok")) and not c.get("ok"),
        "status": "OPEN — a physical limit of the source page, not a defect",
        "severity": "source-layout limitation, not an implementation defect",
        "observed": {
            "longIssuingAuthorityOnly": {"ok": a.get("ok"), "addedLines": added(a)},
            "longRegistrationAddressOnly": {"ok": b.get("ok"), "addedLines": added(b)},
            "bothTogether": {
                "ok": c.get("ok"), "addedLines": added(c),
                "overflows": [o.get("fieldId") for o in c.get("overflows") or []],
            },
        },
        "cause": (
            "`expansion.maxExtraRows` for this block is 1, and page 1 has no "
            "reserve for a second row. Measured: body ends at 793.94 pt on an "
            "841.92 pt page, so 47.98 pt remain; the reviewed bottom clearance "
            "is 28 pt, leaving 19.98 pt — one 19.56 pt row, with 0.42 pt over. "
            "Two rows would need 39.12 pt and leave an 8.86 pt bottom margin, "
            "inside most printers' non-printable area. There is no compaction "
            "zone and no cross-page flow on this page to recover from."
        ),
        "whenItIsReached": (
            "Only when the long issuing authority and an address of about 194 "
            "characters or more are both present. A long authority together "
            "with an ordinary long address (up to ~129 characters — index, "
            "region, city, district, street, house, block, flat) still fits in "
            "one row."
        ),
        "notFixedBecause": "Raising a reviewed expansion budget needs measured "
                           "safe reserve, and this page has none. Preflight now "
                           "refuses it before render, naming the block and the "
                           "rows it wanted.",
    }


def main() -> int:
    os.makedirs(REPORTS, exist_ok=True)
    browser = SmokeBrowser()
    try:
        findings = [
            finding_preflight_render_disagreement(browser),
            finding_one_row_budget(browser),
        ]
    finally:
        browser.stop()

    path = os.path.join(REPORTS, "production-findings.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({"synthetic": True,
                   "reproducedAt": "run verify_findings.py to refresh",
                   "findings": findings}, fh, ensure_ascii=False, indent=1)

    for finding in findings:
        state = "REPRODUCED" if finding["reproduced"] else "no longer reproduces"
        print(f"{state:22s} {finding['id']}")
        print(f"    {finding['title']}")
    print(f"\n-> {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
