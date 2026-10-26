"""Is anything a client will read still unfinished?

    python static-uikit/tools/qa/check_production_completeness.py
    python static-uikit/tools/qa/check_production_completeness.py --json report.json

The other gates answer questions about the values a map *does* produce: does
the value fit, is it complete, does it read as one field. This one asks the
question none of them ask — whether the map produces a value at all where the
form asked for one.

It is written against the source PDFs rather than against the maps, so a blank
that nobody mapped is still found. Three things are checked:

  1. A payment-purpose sentence that names a real agreement number and then
     leaves «дата» blank. That is the exact defect this phase was opened for:
     every gate passed, because every value the map produced was correct, and
     the printed form still came out unfinished. The rule is symmetric —
     wherever a form prints «№ …» and «дата …» in one sentence, a template that
     fills one must fill the other.

  2. A group of values a reader compares side by side that is not set alike.
     `typographyGroup` in a map declares the group; this proves the members
     really do share a face, a size, a leading, an alignment and the clearance
     under a wrapped line, and that none of them is below the 9 pt floor.

  3. A printed sample value — «Код INV0000X», «Код XXXXXXХ» — surviving into a
     generated document. Every such token in every source PDF is classified as
     either legal wording that stays, a sample a reviewed replacement drops, or
     a blank inside a template that is not generated at all.

Developer-workstation tooling; fictional fixtures only. No Office tool is
involved and no source PDF is touched.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

from dump_field_maps import dump
from headless_browser import STATIC_UIKIT

QA_DIR = Path(__file__).resolve().parent
AUDIT_JSON = QA_DIR / "document-full-template-audit.json"

MIN_DYNAMIC_FONT_SIZE = 9.0

# A printed blank: Word writes a fill-in rule as a run of underscores.
BLANK = r"_+"
NUMBER_BLANK = re.compile(r"№\s*" + BLANK)
DATE_BLANK = re.compile(r"дата\s*" + BLANK, re.IGNORECASE)
# «№_______ … дата__» inside ONE sentence.
#
# This is deliberately not a per-line search. The account-opening notice prints
# both blanks on its second line; the transfer-requisites sheet wraps between
# them, so a line-by-line scan finds neither and reports a clean sheet — which
# is how a form with a half-filled sentence could pass a completeness gate. The
# lines of a page are joined first and the sentence boundary is the full stop.
LABELLED_PAIR = re.compile(r"№\s*" + BLANK + r"[^.]{0,120}?дата\s*" + BLANK,
                           re.IGNORECASE)
# A sample value made of ordinary letters and digits, indistinguishable from
# the legal wording around it unless a reviewer names it.
SAMPLE_TOKEN = re.compile(r"\b(?:INV[0-9XХ]{3,}|[A-ZА-Я]*[XХ]{4,}[A-ZА-Я0-9]*)\b")

# What a reader compares within one typography group. Anything not listed is
# geometry the source decided per row — where the value sits, how wide its slot
# is, how many lines its own printed row has room for.
GROUP_PROPERTIES = ("font", "fontSize", "minFontSize", "lineHeight", "align")


def check(results: list, ok: bool, label: str, detail: str = "") -> None:
    results.append({"ok": bool(ok), "label": label, "detail": detail})


# ── 1. A labelled blank that a template fills only half of ───────────────────


def field_source(template: dict, field_id: str) -> str | None:
    for field in template.get("fields") or []:
        if field.get("id") == field_id:
            return field.get("source")
    return None


def bound_field_ids(block: dict) -> list[str]:
    return [str(run.get("fieldId")) for run in block.get("runs") or []
            if run.get("type") == "fieldRef" and run.get("fieldId")]


def static_text_of(block: dict) -> str:
    return "".join(str(run.get("text") or "") for run in block.get("runs") or []
                   if (run.get("type") or "static") == "static")


def labelled_blank_checks(results: list, audit: dict, maps: dict) -> None:
    """Wherever a form prints «№ …» and «дата …» together, fill both or neither.

    The blanks are found in the source PDF text, not in the maps, so a sentence
    nobody mapped is still reported rather than silently passing.
    """
    status_by_id = {row["documentId"]: row["productionStatus"]
                    for row in audit["productionStatusInventory"]}

    for document in audit["documents"]:
        doc_id = document["documentId"]
        status = status_by_id[doc_id]
        template = maps.get(doc_id)

        for page in document["pages"]:
            joined = " ".join(line["text"].strip()
                              for line in page["sourceTextLines"])
            sentences = LABELLED_PAIR.findall(joined)
            if not sentences:
                continue
            where = f"{doc_id} p{page['page']}"

            if status != "dynamic-production-ready":
                # Not generated: the blanks stay blank because the document
                # never reaches a client from this release. That is only
                # acceptable while the status says so — a map appearing here
                # means somebody started generating it without deciding to.
                check(results, template is None,
                      f"{where}: a non-generated template has no map",
                      f"status {status!r} but a field map exists, and the page "
                      f"prints {len(sentences)} half-blank sentence(s)")
                continue

            # Generated: every such sentence has to be a reviewed replacement
            # that binds BOTH values.
            blocks = [block for block in template.get("wordFlowBlocks") or []
                      if LABELLED_PAIR.search(block.get("sourceStaticText") or "")]
            check(results, len(blocks) >= len(sentences),
                  f"{where}: every «№ … дата» sentence is a reviewed replacement",
                  f"{len(sentences)} printed, {len(blocks)} reproduced by a "
                  f"Word-flow block")
            for block in blocks:
                assert_number_and_date(results, doc_id, block, template)


def assert_number_and_date(results, doc_id: str, block: dict,
                           template: dict) -> None:
    prefix = f"{doc_id}/{block['id']}"
    bound = bound_field_ids(block)
    sources = {field_id: field_source(template, field_id) for field_id in bound}
    printed = static_text_of(block)

    number_bound = any("contract" in (source or "") or "agreement" in (source or "")
                       for source in sources.values())
    date_bound = any(
        (source or "").endswith("-date") or "date" in (source or "").rsplit("-", 1)[-1]
        for source in sources.values()
    )

    check(results, number_bound,
          f"{prefix}: the agreement number comes from the payload",
          f"field sources: {sources}")
    # The asymmetric case is the defect: a sentence that names a real agreement
    # and then prints an empty rule where its date belongs.
    check(results, date_bound or not number_bound,
          f"{prefix}: the agreement date comes from the payload too",
          "the sentence binds an agreement number but no date — «дата» would "
          f"print as an empty rule. Field sources: {sources}")

    # Neither printed blank may survive into what the block will draw.
    check(results, not NUMBER_BLANK.search(printed),
          f"{prefix}: no printed «№» blank survives replacement", printed)
    check(results, not DATE_BLANK.search(printed),
          f"{prefix}: no printed «дата» blank survives replacement", printed)

    # A label and its value must be one group, or the value walks off on its
    # own and the label is left introducing nothing.
    runs = block.get("runs") or []
    for index, run in enumerate(runs):
        if (run.get("type") or "static") != "static":
            continue
        text = str(run.get("text") or "")
        following = runs[index + 1] if index + 1 < len(runs) else None
        introduces_value = bool(following) and following.get("type") == "fieldRef"
        if not introduces_value:
            continue
        if not re.search(r"(№|дата)\s*$", text, re.IGNORECASE):
            continue
        label = text.strip()[-4:]
        check(results, bool(run.get("keepWithNext")),
              f"{prefix}: «{label}» is bound to the value it introduces",
              "the run has no keepWithNext, so a line break may separate them")
        check(results, bool(following.get("keepTogether")),
              f"{prefix}: the value after «{label}» is one unbreakable token",
              f"{following.get('fieldId')} has no keepTogether")


# ── 2. Values a reader compares side by side ─────────────────────────────────


def continuation_style(field: dict) -> dict:
    generated = [region for region in field.get("flowRegions") or []
                 if region.get("generated")]
    expansion = field.get("expansion") or {}
    return {
        "continuation size": (
            generated[0].get("maxFontSize") if generated
            else expansion.get("maxFontSize")),
        "continuation rule offset": (
            generated[0].get("underlineOffset") if generated else None),
        "continuation rule thickness": (
            generated[0].get("underlineThickness") if generated else None),
        "grown row height": expansion.get("rowHeight"),
    }


def typography_group_checks(results: list, maps: dict) -> None:
    groups: dict[tuple[str, str], list[dict]] = {}
    for doc_id, template in sorted(maps.items()):
        for field in template.get("fields") or []:
            name = field.get("typographyGroup")
            if name:
                groups.setdefault((doc_id, str(name)), []).append(field)

    check(results, bool(groups),
          "at least one typography group is declared",
          "no map declares typographyGroup; the tariff policy would be "
          "unenforced")

    for (doc_id, name), members in sorted(groups.items()):
        prefix = f"{doc_id}/{name}"
        check(results, len(members) > 1,
              f"{prefix}: a group has more than one member",
              f"members: {[field['id'] for field in members]}")
        first = members[0]
        for field in members[1:]:
            for prop in GROUP_PROPERTIES:
                check(results, first.get(prop) == field.get(prop),
                      f"{prefix}: {field['id']}.{prop} matches {first['id']}",
                      f"{field.get(prop)!r} != {first.get(prop)!r}")
            wanted, got = continuation_style(first), continuation_style(field)
            for prop in wanted:
                check(results, wanted[prop] == got[prop],
                      f"{prefix}: {field['id']} {prop} matches {first['id']}",
                      f"{got[prop]!r} != {wanted[prop]!r}")
        for field in members:
            size = field.get("fontSize")
            floor = field.get("minFontSize")
            check(results, size is not None and float(size) >= MIN_DYNAMIC_FONT_SIZE,
                  f"{prefix}: {field['id']} is at least "
                  f"{MIN_DYNAMIC_FONT_SIZE:g} pt", f"fontSize {size!r}")
            check(results, floor is not None and float(floor) >= MIN_DYNAMIC_FONT_SIZE,
                  f"{prefix}: {field['id']} cannot shrink below "
                  f"{MIN_DYNAMIC_FONT_SIZE:g} pt", f"minFontSize {floor!r}")

    # The three tariff plans are the group this phase was about; naming them
    # keeps a future refactor from quietly dropping the declaration.
    for doc_id in ("accession-application-fl", "accession-application-yul"):
        members = groups.get((doc_id, "accession-tariff-plans")) or []
        check(results, {field["id"] for field in members} ==
              {"tariffStock", "tariffDerivatives", "tariffCurrency"},
              f"{doc_id}: the three tariff plans are one declared group",
              f"members: {sorted(field['id'] for field in members)}")


# ── 3. Printed samples that must not reach a client ──────────────────────────


def placeholder_checks(results: list, audit: dict, maps: dict) -> list[dict]:
    """Classify every sample-looking token in every source PDF.

    Four outcomes are legitimate, and the point is that each occurrence has
    exactly one of them rather than being merely absent from anybody's list.
    """
    status_by_id = {row["documentId"]: row["productionStatus"]
                    for row in audit["productionStatusInventory"]}
    findings: list[dict] = []

    for document in audit["documents"]:
        doc_id = document["documentId"]
        status = status_by_id[doc_id]
        template = maps.get(doc_id)
        declared = {
            str(entry.get("text"))
            for block in ((template or {}).get("wordFlowBlocks") or [])
            for entry in (block.get("sourcePlaceholders") or [])
        }
        for page in document["pages"]:
            for line in page["sourceTextLines"]:
                for token in SAMPLE_TOKEN.findall(line["text"]):
                    where = f"{doc_id} p{page['page']} line {line['lineNumber']}"
                    if token in declared:
                        verdict = "reviewed sample, replaced by a real value"
                    elif status != "dynamic-production-ready":
                        verdict = f"inside a {status} template; never generated"
                    else:
                        verdict = "UNCLASSIFIED"
                    findings.append({
                        "documentId": doc_id, "where": where, "token": token,
                        "status": status, "verdict": verdict,
                        "line": line["text"].strip()[:90],
                    })
                    check(results, verdict != "UNCLASSIFIED",
                          f"{where}: sample token «{token}» is accounted for",
                          f"neither declared in sourcePlaceholders nor inside a "
                          f"non-generated template: {line['text'].strip()[:80]!r}")

    # A declaration that matches nothing is drift in the other direction.
    for doc_id, template in sorted(maps.items()):
        for block in template.get("wordFlowBlocks") or []:
            for entry in block.get("sourcePlaceholders") or []:
                token = str(entry.get("text"))
                check(results,
                      any(row["token"] == token and row["documentId"] == doc_id
                          for row in findings),
                      f"{doc_id}/{block['id']}: declared sample «{token}» is "
                      "really printed by the source",
                      "the declaration no longer matches any printed token")
                check(results, entry.get("reviewStatus") == "approved",
                      f"{doc_id}/{block['id']}: sample «{token}» is approved",
                      f"reviewStatus {entry.get('reviewStatus')!r}")
    return findings


def run_self_tests(audit: dict, maps: dict) -> list[str]:
    """Prove each gate fires, with in-memory corruptions only.

    A gate nobody has seen fail is a gate nobody knows works. Each mutation
    below is a way this phase's work could be undone by a later change.
    """
    import copy

    failures: list[str] = []

    def expect(label: str, results: list, fragment: str) -> None:
        broken = [row["label"] for row in results if not row["ok"]]
        if not any(fragment in text for text in broken):
            failures.append(f"{label}: expected a failure containing {fragment!r}")

    def purpose_block(tree):
        return next(
            block for block in tree["account-opening-notice"]["wordFlowBlocks"]
            if block["id"] == "account-opening-payment-purpose-stock"
        )

    # 1. The date is unbound again — the defect this phase was opened for.
    no_date = copy.deepcopy(maps)
    block = purpose_block(no_date)
    block["runs"] = [run for run in block["runs"]
                     if run.get("fieldId") != "paymentPurposeAgreementDate"]
    results: list = []
    labelled_blank_checks(results, audit, no_date)
    expect("unbound agreement date", results,
           "the agreement date comes from the payload too")

    # 2. The date is bound but may be torn off its label by a line break.
    unbound_label = copy.deepcopy(maps)
    for run in purpose_block(unbound_label)["runs"]:
        if (run.get("type") or "static") == "static":
            run.pop("keepWithNext", None)
    results = []
    labelled_blank_checks(results, audit, unbound_label)
    expect("label not bound to its value", results,
           "is bound to the value it introduces")

    # 3. One tariff row set larger than its neighbours — the 12 / 9 / 12 the
    #    form must not print.
    mixed = copy.deepcopy(maps)
    for field in mixed["accession-application-yul"]["fields"]:
        if field.get("id") == "tariffStock":
            field["fontSize"] = 12
    results = []
    typography_group_checks(results, mixed)
    expect("mixed sizes in one typography group", results, "fontSize matches")

    # 4. A group member allowed below the readability floor.
    tiny = copy.deepcopy(maps)
    for field in tiny["accession-application-fl"]["fields"]:
        if field.get("typographyGroup"):
            field["minFontSize"] = 6
    results = []
    typography_group_checks(results, tiny)
    expect("group member below the readability floor", results,
           "cannot shrink below")

    # 5. A printed sample nobody declared, so nothing would replace it.
    undeclared = copy.deepcopy(maps)
    for wf_block in undeclared["account-opening-notice"]["wordFlowBlocks"]:
        wf_block.pop("sourcePlaceholders", None)
    results = []
    placeholder_checks(results, audit, undeclared)
    expect("undeclared printed sample", results, "is accounted for")

    # 6. An unexposed template quietly given a map — the blanks it prints would
    #    start reaching clients without anybody deciding that.
    exposed = copy.deepcopy(maps)
    exposed["transfer-requisites"] = {"fields": [], "wordFlowBlocks": []}
    results = []
    labelled_blank_checks(results, audit, exposed)
    expect("non-generated template given a map", results,
           "a non-generated template has no map")

    return failures


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json")
    parser.add_argument("--self-test", action="store_true",
                        help="prove each gate fires, with in-memory mutations")
    args = parser.parse_args()

    if not AUDIT_JSON.exists():
        print(f"missing {AUDIT_JSON}; run check_full_template_audit.py --write")
        return 2
    audit = json.loads(AUDIT_JSON.read_text(encoding="utf-8"))
    maps = dump()

    if args.self_test:
        failures = run_self_tests(audit, maps)
        for failure in failures:
            print("FAIL", failure)
        print(f"\nProduction completeness self-test: "
              f"{'PASS · 6/6' if not failures else f'{len(failures)} failure(s) in 6'}"
              " negative gates (unbound date, unbound label, mixed group sizes, "
              "sub-floor group member, undeclared sample, map on a "
              "non-generated template)")
        return 1 if failures else 0

    results: list = []
    labelled_blank_checks(results, audit, maps)
    typography_group_checks(results, maps)
    findings = placeholder_checks(results, audit, maps)

    failures = [row for row in results if not row["ok"]]
    for failure in failures:
        print("FAIL", failure["label"])
        if failure["detail"]:
            print("     ", failure["detail"])

    unclassified = [row for row in findings if row["verdict"] == "UNCLASSIFIED"]
    print()
    print(f"sample tokens found in the 22 source PDFs: {len(findings)}, "
          f"unclassified: {len(unclassified)}")
    for verdict in sorted({row["verdict"] for row in findings}):
        total = sum(row["verdict"] == verdict for row in findings)
        print(f"   {total:3d}  {verdict}")
    print(f"\nProduction completeness: {len(results) - len(failures)}/"
          f"{len(results)} checks passed")

    if args.json:
        Path(args.json).write_text(
            json.dumps({"checks": results, "placeholders": findings},
                       ensure_ascii=False, indent=1),
            encoding="utf-8")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
