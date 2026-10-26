"""Every ordinary value has to come out of the PDF exactly as it went in.

    python static-uikit/tools/qa/audit_ordinary_equality.py
    python static-uikit/tools/qa/audit_ordinary_equality.py --json report.json

Counting substitutions told us how often the engine had to be given a shorter
value. It did not tell us that the values it *accepted* were printed whole, and
those are two different promises. This gate makes both explicit for the payloads
the manual smoke pack classifies as ORDINARY — the medium-length, entirely
realistic ones a manager types every day:

  1. the production engine accepts the payload with no substitution at all; and
  2. for every value it draws, the text it assigned to the page is the text it
     was asked for, character for character.

Nothing here is a second implementation. The fixtures, the profiles and the
step-down ladder are the smoke pack's own modules, and the accept/refuse
decision is `overlayRenderer.preflight` — the same call the wizard makes. The
rendered side comes from the renderer's own draw assignments (`onPlan`), so a
value that appears twice in a document is never confused with its twin the way
a page-wide substring search would confuse them. The finished PDF is then
checked to still contain what was drawn, which is what catches a value that the
engine assigned but the file lost.

Line breaks and layout whitespace are ignored, because where a value wraps is a
layout decision. Nothing else is: a missing character, changed punctuation, an
abbreviation, a reordered fragment or a dropped identifier segment all fail.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

import fitz

HERE = os.path.dirname(os.path.abspath(__file__))
SMOKE_TOOLS = os.path.abspath(os.path.join(
    HERE, "..", "..", "manual-smoke", "word-flow-long-data", "tools"))
SMOKE_ROOT = os.path.dirname(SMOKE_TOOLS)

for path in (HERE, SMOKE_TOOLS):
    if path not in sys.path:
        sys.path.insert(0, path)

from smoke_engine import SmokeBrowser  # noqa: E402
from smoke_profiles import PROFILES_BY_ID  # noqa: E402
from smoke_cases import CASES  # noqa: E402
from generate_smoke_pack import fit, sanitise  # noqa: E402


# Draw assignments for one payload, plus the file they were drawn into. This is
# the renderer's own decision record, not a re-derivation of it.
ASSIGNMENTS = r"""
(function (docId, baseProfile, overrides) {
  var maps = window.CRMDocumentEngine.fieldMaps;
  var R = window.CRMDocumentEngine.overlayRenderer;
  var template = maps[docId];
  var payload = window.__smoke.payloadFor(docId, baseProfile, overrides);
  var fields = {};
  (template.fields || []).forEach(function (f) { fields[f.id] = f; });
  var drawn = [];

  function note(entry) { drawn.push(entry); }

  return R.render(template, payload, {
    onPlan: function (decided) {
      Object.keys(decided.planned.byField).forEach(function (id) {
        var planned = decided.planned.byField[id];
        if (!planned || !planned.drawn || !planned.layout) return;
        var field = fields[id] || {};
        if ((field.type || 'text') === 'check') return;
        note({
          kind: 'field', fieldId: id, source: field.source || null,
          page: planned.regions && planned.regions[0]
            ? planned.regions[0].page : field.page,
          requested: planned.value,
          rendered: (planned.layout.lines || []).map(function (line) {
            return line.text; }).join('\n'),
          size: planned.layout.size,
          lines: (planned.layout.lines || []).length,
          usedFallback: !!planned.usedFallback
        });
      });

      // A reviewed Word-flow block lays static wording and values out together,
      // so a value's fragments are the run assignments carrying its field id.
      Object.keys(decided.planned.byBlock || {}).forEach(function (id) {
        var planned = decided.planned.byBlock[id];
        if (!planned || !planned.drawn) return;
        var block = (template.wordFlowBlocks || []).filter(function (b) {
          return b.id === id; })[0] || {};
        var pieces = {};
        var sizes = {};
        (planned.layout.lines || []).forEach(function (line) {
          (line.runs || []).forEach(function (run) {
            if (run.type !== 'fieldRef' || !run.sourceFieldId) return;
            if (!pieces[run.sourceFieldId]) pieces[run.sourceFieldId] = [];
            pieces[run.sourceFieldId].push(run.text);
            // The block's own size is the SOURCE wording's size; a client value
            // inside it is drawn at the run's size (`valueFontSize`). Reporting
            // the block size here would understate the value's size and make
            // the readability floor look breached when it is not.
            if (sizes[run.sourceFieldId] == null ||
                run.fontSize < sizes[run.sourceFieldId]) {
              sizes[run.sourceFieldId] = run.fontSize;
            }
          });
        });
        Object.keys(pieces).forEach(function (fieldId) {
          var field = fields[fieldId] || {};
          note({
            kind: 'wordFlow', blockId: id, fieldId: fieldId,
            source: field.source || null, page: Number(block.page),
            requested: (planned.values || {})[fieldId],
            rendered: pieces[fieldId].join('\n'),
            size: sizes[fieldId], lines: pieces[fieldId].length,
            usedFallback: false
          });
        });
      });
    }
  }).then(function (blob) {
    return blob.arrayBuffer();
  }).then(function (buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return JSON.stringify({ ok: true, pdf: btoa(binary), drawn: drawn });
  }, function (error) {
    return JSON.stringify({ ok: false,
      message: String(error && error.message || error) });
  });
}(DOC, PROFILE, OVERRIDES))
"""


# The ten fields an ordinary value could not fit before this phase. A green
# report is only evidence if these were actually among the values it compared:
# a fixture edit that quietly stopped exercising one of them would otherwise
# look like a pass. Each is asserted to have been drawn at least once.
REQUIRED_COVERAGE = {
    ("accession-application-fl", "reportEmail"),
    ("accession-application-yul", "reportEmail"),
    ("accession-application-yul", "tariffStock"),
    ("accession-application-yul", "tariffDerivatives"),
    ("accession-application-yul", "tariffCurrency"),
    ("account-opening-notice", "paymentPurposeStock"),
    ("anketa-yul", "foreignName"),
    ("anketa-yul", "fundsOtherDetails"),
    ("power-of-attorney", "ulDateInWords"),
    ("power-of-attorney", "flDateInWords"),
}

# The readability floor for a value a client has to be able to read. Source
# wording reproduced by a reviewed block keeps its own smaller size and is not
# measured here — only `fieldRef` runs are.
MIN_CLIENT_VALUE_SIZE = 9.0


def comparable(value: str) -> str:
    """The value with layout whitespace removed and nothing else.

    Where a value wraps is a layout decision, and a token broken after its own
    hyphen or slash carries no space at the break, so whitespace cannot be part
    of the comparison. Every other character is.
    """
    text = str("" if value is None else value)
    text = text.replace(" ", " ").replace(" ", " ").replace(" ", " ")
    return re.sub(r"\s+", "", text)


def first_difference(left: str, right: str) -> int | None:
    for index, (a, b) in enumerate(zip(left, right)):
        if a != b:
            return index
    if len(left) != len(right):
        return min(len(left), len(right))
    return None


def ordinary_cases() -> list[dict]:
    """Every explicit smoke case whose profile is an ordinary payload."""
    out = []
    for entry in CASES:
        profile = PROFILES_BY_ID.get(entry["profile"]) or {}
        if profile.get("lengthClass") != "normal":
            continue
        out.append(entry)
    return out


def page_haystacks(pdf_bytes: bytes) -> list[str]:
    document = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        return [comparable(page.get_text("text")) for page in document]
    finally:
        document.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", help="write the machine-readable report here")
    parser.add_argument("--only", help="restrict to one document id")
    args = parser.parse_args()

    cases = [c for c in ordinary_cases()
             if not args.only or c["doc"] == args.only]

    room_path = os.path.join(SMOKE_ROOT, "reports", "field-room.json")
    room = {}
    if os.path.isfile(room_path):
        with open(room_path, encoding="utf-8") as fh:
            room = json.load(fh)

    browser = SmokeBrowser()
    substitutions: list[dict] = []
    mismatches: list[dict] = []
    lost: list[dict] = []
    undersized: list[dict] = []
    covered: set[tuple[str, str]] = set()
    checked = 0
    smallest = None

    try:
        if room:
            browser.load_field_room(room)
        facts = browser.facts()

        for entry in cases:
            doc_id = entry["doc"]
            profile = PROFILES_BY_ID[entry["profile"]]
            doc_facts = facts[doc_id]
            overrides = dict(profile["overrides"])
            overrides.update(entry.get("overrides") or {})
            if entry["scenario"] == "max-branches":
                for source in doc_facts["checkSources"]:
                    overrides.setdefault(source, True)
            if profile["id"] != "smoke-optional-empty":
                overrides = sanitise(doc_facts["wizardKeys"], overrides)

            block_sources = {b["id"]: b["sources"]
                             for b in doc_facts["wordFlowBlocks"]}

            # Exactly the production accept/refuse decision the smoke pack uses.
            fitted, _measurement, made = fit(
                browser, doc_id, profile["base"], overrides,
                profile["language"] == "en", block_sources)
            for item in made:
                substitutions.append({
                    "documentId": doc_id, "profile": profile["id"],
                    "scenario": entry["scenario"], "fieldId": item["fieldId"],
                    "source": item["source"], "requested": item["from"],
                    "used": item["to"], "reason": item["reason"],
                })

            script = (ASSIGNMENTS
                      .replace("DOC", json.dumps(doc_id))
                      .replace("PROFILE", json.dumps(profile["base"]))
                      .replace("OVERRIDES", json.dumps(fitted, ensure_ascii=False)))
            result = json.loads(browser.browser.eval(script, await_promise=True))
            if not result.get("ok"):
                mismatches.append({
                    "documentId": doc_id, "profile": profile["id"],
                    "fieldId": None, "requested": None, "rendered": None,
                    "firstDifference": None,
                    "note": "render failed: " + str(result.get("message")),
                })
                continue

            import base64
            pdf_bytes = base64.b64decode(result["pdf"])
            haystacks = page_haystacks(pdf_bytes)

            for item in result["drawn"]:
                requested = comparable(item.get("requested"))
                rendered = comparable(item.get("rendered"))
                if not requested and not rendered:
                    continue
                checked += 1
                covered.add((doc_id, item.get("fieldId")))
                size = item.get("size")
                if size and (smallest is None or size < smallest):
                    smallest = size
                if size and size < MIN_CLIENT_VALUE_SIZE - 1e-9:
                    undersized.append({
                        "documentId": doc_id, "profile": profile["id"],
                        "fieldId": item.get("fieldId"), "size": size,
                        "requested": item.get("requested"),
                        "rendered": item.get("rendered"),
                        "firstDifference": None,
                        "note": f"drawn at {size} pt, below the "
                                f"{MIN_CLIENT_VALUE_SIZE} pt readability floor",
                    })
                if requested != rendered:
                    mismatches.append({
                        "documentId": doc_id, "profile": profile["id"],
                        "scenario": entry["scenario"],
                        "fieldId": item.get("fieldId"),
                        "source": item.get("source"),
                        "requested": item.get("requested"),
                        "rendered": item.get("rendered"),
                        "firstDifference": first_difference(requested, rendered),
                        "note": "the renderer drew something other than the "
                                "value it was given",
                    })
                    continue
                page = item.get("page")
                haystack = haystacks[page] if isinstance(page, int) and \
                    0 <= page < len(haystacks) else ""
                if rendered and rendered not in haystack:
                    lost.append({
                        "documentId": doc_id, "profile": profile["id"],
                        "scenario": entry["scenario"],
                        "fieldId": item.get("fieldId"),
                        "page": page,
                        "requested": item.get("requested"),
                        "rendered": item.get("rendered"),
                        "note": "drawn by the renderer but not extractable "
                                "from the finished page",
                    })
    finally:
        browser.stop()

    uncovered = sorted(REQUIRED_COVERAGE - covered) if not args.only else []

    payload = {
        "ordinaryCases": len(cases),
        "valuesChecked": checked,
        "ordinarySubstitutions": len(substitutions),
        "requestedRenderedMismatches": len(mismatches),
        "valuesLostInThePdf": len(lost),
        "valuesBelowTheFloor": len(undersized),
        "smallestDrawnClientValueSize": smallest,
        "releaseBlockingFieldsNotExercised": [list(k) for k in uncovered],
        "substitutions": substitutions,
        "mismatches": mismatches,
        "lost": lost,
        "undersized": undersized,
    }
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=1)

    print(f"ordinary fixtures                : {len(cases)}")
    print(f"values drawn and compared        : {checked}")
    print(f"ordinary substitutions           : {len(substitutions)}")
    print(f"requested/rendered mismatches    : {len(mismatches)}")
    print(f"values lost between draw and PDF : {len(lost)}")
    print(f"values below the 9 pt floor      : {len(undersized)}")
    print(f"smallest drawn client value      : {smallest} pt")
    if not args.only:
        print(f"release-blocking fields covered  : "
              f"{len(REQUIRED_COVERAGE) - len(uncovered)}/{len(REQUIRED_COVERAGE)}")
    for key in uncovered:
        print(f"  NOT EXERCISED  {key[0]}/{key[1]}")

    for item in substitutions:
        print(f"\nSUBSTITUTION {item['documentId']}/{item['fieldId']}"
              f"  [{item['profile']}]")
        print(f"  requested : {item['requested']!r}")
        print(f"  used      : {item['used']!r}")
        print(f"  because   : {item['reason']}")
    for item in mismatches + lost + undersized:
        print(f"\nMISMATCH {item['documentId']}/{item['fieldId']}"
              f"  [{item['profile']}]")
        print(f"  requested : {item['requested']!r}")
        print(f"  rendered  : {item['rendered']!r}")
        if item.get("firstDifference") is not None:
            print(f"  differs at character {item['firstDifference']}")
        print(f"  {item['note']}")

    return 1 if (substitutions or mismatches or lost or undersized
                 or uncovered) else 0


if __name__ == "__main__":
    sys.exit(main())
