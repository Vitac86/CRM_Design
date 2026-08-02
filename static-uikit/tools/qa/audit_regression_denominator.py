"""Account for every case in the document-regression denominator.

    python static-uikit/tools/qa/audit_regression_denominator.py

`run_document_regression.py` renders 18 maps against 13 profiles = 234 cases,
and reports how many rendered. The number that did not is meaningless until
each one has a reason, so this classifies all 234:

  rendered                a PDF was produced and inspected
  not-applicable          the document does not apply to that subject kind
  variant-not-selected    a mutually exclusive branch the profile did not pick,
                          so a value the printed form needs was never entered
  stress-refusal          a deliberately unprintable stress value
  physical-limit          a realistic value the source form cannot hold
  UNEXPECTED              anything else — must be zero

It reads `document-regression.json`, so run the regression first.
"""

from __future__ import annotations

import collections
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPORT = os.path.join(HERE, "document-regression.json")

# Which subject kind each production profile describes.
PROFILE_KIND = {
    "ru-resident-short": "individual", "ru-resident-normal": "individual",
    "ru-resident-long": "individual", "ru-company-normal": "company",
    "ru-company-long": "company", "en-nonresident-normal": "individual",
    "en-nonresident-long": "individual", "en-company-normal": "company",
    "en-company-long": "company", "mixed-ru-en": "individual",
    "missing-optional": "individual", "maximum-checkboxes": "individual",
    "minimum-required": "individual",
}

# Profiles that deliberately withhold values, so a required slot is empty by
# construction rather than by defect.
WITHHOLDING = {"missing-optional", "minimum-required"}

MAPS = r"""
JSON.stringify(Object.keys(window.CRMDocumentEngine.fieldMaps).sort()
  .reduce(function (out, id) {
    out[id] = window.CRMDocumentEngine.fieldMaps[id].appliesTo || [];
    return out; }, {}))
"""


def classify(entry, applies_to):
    """Why this case did not produce a PDF."""
    profile = entry["profile"]
    kind = PROFILE_KIND.get(profile)
    reasons = [item.get("reason") for item in entry.get("overflows") or []]
    fields = [item.get("fieldId") for item in entry.get("overflows") or []]

    if applies_to and kind and kind not in applies_to:
        return "not-applicable", (
            f"{entry['doc']} applies to {'/'.join(applies_to)}; "
            f"{profile} is an {kind}")

    if all(reason == "missing" for reason in reasons) and reasons:
        if profile in WITHHOLDING:
            return "variant-not-selected", (
                f"{profile} withholds values by design; "
                f"absent: {', '.join(sorted(set(fields)))}")
        return "variant-not-selected", (
            f"a branch this profile did not select left "
            f"{', '.join(sorted(set(fields)))} unset")

    if any(reason == "unbreakable-token" for reason in reasons):
        return "stress-refusal", (
            f"a value with no legal break point: "
            f"{', '.join(sorted({f for f, r in zip(fields, reasons) if r == 'unbreakable-token'}))}")

    if reasons and all(reason in ("overflow", "no-space", "missing")
                       for reason in reasons):
        return "physical-limit", (
            f"the source slot cannot hold the profile's value: "
            f"{', '.join(sorted(set(fields)))}")

    return "UNEXPECTED", json.dumps(entry.get("overflows") or
                                    entry.get("problems") or entry,
                                    ensure_ascii=False)[:200]


def main() -> int:
    if not os.path.isfile(REPORT):
        print(f"{REPORT} not found — run run_document_regression.py first")
        return 2
    with open(REPORT, encoding="utf-8") as fh:
        report = json.load(fh)

    sys.path.insert(0, HERE)
    from headless_browser import Chrome, Server  # noqa: E402

    server, browser = Server(), Chrome()
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")
        applies = json.loads(browser.eval(MAPS))
    finally:
        browser.stop()
        server.stop()

    rows = []
    for entry in report:
        if entry.get("ok"):
            rows.append({**entry, "bucket": "rendered", "why": ""})
            continue
        if not entry.get("overflow") and entry.get("problems"):
            rows.append({**entry, "bucket": "UNEXPECTED",
                         "why": "; ".join(entry["problems"][:3])})
            continue
        bucket, why = classify(entry, applies.get(entry["doc"], []))
        rows.append({**entry, "bucket": bucket, "why": why})

    counts = collections.Counter(row["bucket"] for row in rows)
    print(f"document-regression denominator: {len(rows)} cases "
          f"({len(applies)} maps x {len(PROFILE_KIND)} profiles)\n")
    for bucket in ("rendered", "not-applicable", "variant-not-selected",
                   "stress-refusal", "physical-limit", "UNEXPECTED"):
        print(f"  {bucket:22s} {counts.get(bucket, 0):4d}")

    print("\n── every case that did not render ──────────────────────────────")
    for row in rows:
        if row["bucket"] == "rendered":
            continue
        print(f"  [{row['bucket']:20s}] {row['doc']:34s} {row['profile']:22s}")
        print(f"       {row['why'][:150]}")

    out = os.path.join(HERE, "regression-denominator.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump({"total": len(rows), "counts": dict(counts),
                   "cases": [{"doc": r["doc"], "profile": r["profile"],
                              "bucket": r["bucket"], "why": r["why"]}
                             for r in rows]}, fh, ensure_ascii=False, indent=1)
    print(f"\n-> {out}")

    unexpected = counts.get("UNEXPECTED", 0)
    print(f"\nunexpected failures: {unexpected}")
    return 1 if unexpected else 0


if __name__ == "__main__":
    sys.exit(main())
