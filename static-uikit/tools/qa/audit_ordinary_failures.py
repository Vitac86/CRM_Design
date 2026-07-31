"""The exact failure matrix for values a manager will really type.

    python static-uikit/tools/qa/dump_field_maps.py --out static-uikit/tools/qa/maps.json
    python static-uikit/tools/qa/run_document_regression.py
    python static-uikit/tools/qa/audit_ordinary_failures.py

Reads the production regression report and, for every field that overflows with
an *ordinary* value, joins what the engine reported with what the authoritative
PDF actually measures: the printed slot, the room around it, the page's reserve
and the geometry of the printed line a continuation row would imitate.

Profiles are split the way the business splits them:

  ordinary       what a manager types on a normal day, in either language, for
                 either kind of subject — release-blocking;
  realistic-long the long end of real CRM data (a full legal company name, a
                 full Russian address, a full issuing authority) — also
                 release-blocking for the fields documented as expandable;
  stress         deliberately unrealistic values kept to find defects, never a
                 release gate.

The classification column is reviewed by hand and lives in CLASSIFICATION below;
everything else on the row is measured. Writing it down here is what stops a
real failure being quietly relabelled "extreme" to make a release pass.
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import sys

import fitz  # pymupdf

from measure_page_layout import page_layout, row_geometry

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATES = os.path.abspath(
    os.path.join(HERE, "..", "..", "assets", "document-pdf-templates")
)

ORDINARY = (
    "ru-resident-short", "ru-resident-normal", "ru-company-normal",
    "en-nonresident-normal", "en-company-normal", "mixed-ru-en",
    "missing-optional", "maximum-checkboxes", "minimum-required",
)
LONG = ("ru-resident-long", "ru-company-long",
        "en-nonresident-long", "en-company-long")

# Reviewed classification of every ordinary-value failure found on the
# 387af77 baseline. Each entry is (classification, note).
CLASSIFICATION = {
    ("anketa-fl", "bankAddress"): (
        "suitable for dynamic inserted row",
        "A foreign bank address is an ordinary value for a nonresident and the "
        "printed cell holds one line. The анкета is a table, so the Word-like "
        "answer is a real inserted table row, as anketa-yul/bankAddress "
        "already has."),
    ("anketa-fl", "birthPlace"): (
        "fixture defect",
        "The fixture fed a full street address into a place of birth because "
        "its source key ends in «place». A place of birth is «London, United "
        "Kingdom» (93.24 pt at 9 pt) and fits the 237 pt cell four times over."),
    ("power-of-attorney", "flAttorneyCitizenship"): (
        "suitable for dynamic inserted row",
        "«United Kingdom» needs 60.75 pt at 9 pt; the printed blank between "
        "«паспорт гражданина» and «, серии» is 29.76 pt and is bounded by "
        "printed text on both sides. No printed rule continues it."),
    ("power-of-attorney", "ulAttorneyCitizenship"): (
        "suitable for dynamic inserted row",
        "The ЮЛ variant of the same blank: 30.72 pt printed, 60.75 pt needed."),
    ("power-of-attorney", "ulAttorneyName"): (
        "mapping-width defect",
        "The sentence «уполномочивает гр. ____» wraps: the 109.94 pt rule is "
        "followed by a second printed rule of 99.36 pt on the next line, "
        "before «, далее именуемого «Поверенный»». The map used only the "
        "first, so 206 pt of printed room was reported as 107."),
    ("power-of-attorney", "ulAuthorityBasis"): (
        "fixture defect + mapping-width defect",
        "The fixture supplied an *issuing authority* because the source key "
        "contains «authority»; the field holds the document a representative "
        "acts under («Устава»). The map also used only the second of the two "
        "printed rules — 39.50 pt on the first line, 99.36 pt on the second."),
    ("qualification-notice", "registerEntryOrgName"): (
        "suitable for a larger complete operator-block cut",
        "An ordinary company name needs 107.78 pt at 9 pt in an 89 pt blank. "
        "The anchor was previously rejected as having no clean cut; the cut it "
        "was probed with ran to the page's own content bottom, which splits "
        "the trailing block. Probing to the full movable band finds a clean "
        "cut at 484.95 — just under the complete printed line the field sits "
        "on — with 13 blocks moving."),
}

# Values that are the long end of real CRM data rather than a stress test.
# Anything else in a `-long` profile stays a stress fixture.
REALISTIC_LONG_FIELDS = {
    "clientFullName", "fullName", "clientName", "recipientName",
    "tradeClientName", "registerEntryOrgName", "companyLegalAddress",
    "legalAddress", "registrationAddress", "postalAddress", "bankAddress",
    "birthPlace", "passportIssuedBy", "licenceAuthority",
    "flPrincipalIssuedBy", "ulAttorneyIssuedBy", "ulCity", "ulAuthorityBasis",
    "ulAttorneyName", "ulExecutiveName", "signatoryPosition",
}


def load(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def field_of(template, field_id):
    for field in template.get("fields", []):
        if field.get("id") == field_id:
            return field
    return {}


def regions_of(field):
    declared = field.get("flowRegions")
    if isinstance(declared, list) and declared:
        return [{"page": r.get("page", field.get("page")),
                 "left": r.get("left", field.get("left")),
                 "baselineTop": r.get("baselineTop"),
                 "width": r.get("width", field.get("width"))} for r in declared]
    return [{"page": field.get("page"), "left": field.get("left"),
             "baselineTop": field.get("baselineTop"),
             "width": field.get("width")}]


def collect(report):
    """Every layout overflow, keyed by (doc, field), split by profile class."""
    out = collections.defaultdict(lambda: {"ordinary": {}, "long": {}})
    for entry in report:
        if not entry.get("overflow"):
            continue
        for item in entry.get("overflows", []):
            if item.get("reason") in ("missing", "font", "no-reserve",
                                      "reserve-exceeded", "block-too-small"):
                continue
            bucket = "ordinary" if entry["profile"] in ORDINARY else "long"
            out[(entry["doc"], item["fieldId"])][bucket][entry["profile"]] = item
    return out


def describe(doc_id, field_id, profiles, maps, pages_cache):
    template = maps.get(doc_id, {})
    field = field_of(template, field_id)
    first = next(iter(profiles.values()))

    path = os.path.join(TEMPLATES, os.path.basename(
        template.get("templateUrl", doc_id + ".pdf")))
    if path not in pages_cache:
        document = fitz.open(path)
        pages_cache[path] = (document,
                             [page_layout(document[i], i)
                              for i in range(document.page_count)])
    document, layouts = pages_cache[path]
    page_index = int(field.get("page", 0))
    layout = layouts[page_index]
    row = row_geometry(document[page_index], float(field.get("baselineTop", 0)),
                       left=float(field.get("left", 0)),
                       width=float(field.get("width", 0)))

    expansion = field.get("expansion") or {}
    regions = regions_of(field)
    value = str(first.get("value") or "")
    classification, note = CLASSIFICATION.get(
        (doc_id, field_id), ("not classified", ""))

    return {
        "documentId": doc_id,
        "documentTitle": template.get("title", doc_id),
        "subjectKinds": template.get("appliesTo") or [],
        "variant": (field.get("showWhen") or {}).get("equals"),
        "page": page_index,
        "fieldId": field_id,
        "label": field.get("label") or first.get("label") or field_id,
        "source": field.get("source"),
        "formatter": field.get("format"),
        "fallbacks": field.get("fallbacks") or [],
        "profiles": sorted(profiles),
        "value": value,
        "valueLength": len(value),
        "hasSpaces": " " in value,
        "hasHyphen": "-" in value,
        "unbreakableToken": first.get("reason") == "unbreakable-token",
        "preferredFontSize": field.get("fontSize"),
        "minFontSize": field.get("minFontSize"),
        "printedSlotWidth": field.get("width"),
        "printedRuleWidth": row.get("ruleWidth"),
        "primaryRegion": regions[0],
        "continuationRegions": regions[1:],
        "lineCapacity": first.get("lineCapacity"),
        "rowHeight": expansion.get("rowHeight"),
        "maxExtraRows": expansion.get("maxExtraRows"),
        "pageBottomReserve": layout.get("bottomReserve"),
        "pageFixedFooterFrom": layout.get("fixedFooterFrom"),
        "pageBodyBottom": layout.get("bodyBottom"),
        "pageTopMargin": layout.get("topMargin"),
        "pageBlockGaps": layout.get("blockGaps"),
        "recoverableBlockGap": round(sum(
            max(0.0, gap["gap"] - 8.0) for gap in layout.get("blockGaps") or []), 2),
        "sourceLinePitch": layout.get("linePitch"),
        "sourceRowGeometry": row,
        "engineReason": first.get("reason"),
        "engineMessage": first.get("message"),
        "classification": classification,
        "note": note,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", default=os.path.join(HERE, "document-regression.json"))
    parser.add_argument("--maps", default=os.path.join(HERE, "maps.json"))
    parser.add_argument("--out", default=os.path.join(HERE, "ordinary-failures.json"))
    args = parser.parse_args()

    report = load(args.report)
    maps = load(args.maps)
    failures = collect(report)
    cache = {}

    ordinary = {key: value["ordinary"] for key, value in failures.items()
                if value["ordinary"]}
    long_only = {key: value["long"] for key, value in failures.items()
                 if not value["ordinary"]}

    rows = [describe(doc, field, profiles, maps, cache)
            for (doc, field), profiles in sorted(ordinary.items())]

    realistic = sorted(
        (doc, field) for (doc, field) in long_only if field in REALISTIC_LONG_FIELDS)
    stress = sorted(
        (doc, field) for (doc, field) in long_only if field not in REALISTIC_LONG_FIELDS)

    payload = {
        "baseline": "generated from document-regression.json",
        "ordinaryProfiles": list(ORDINARY),
        "longProfiles": list(LONG),
        "ordinaryFailures": rows,
        "realisticLongFailures": [{"documentId": d, "fieldId": f} for d, f in realistic],
        "stressOnlyFailures": [{"documentId": d, "fieldId": f} for d, f in stress],
        "counts": {
            "ordinary": len(rows),
            "realisticLong": len(realistic),
            "stressOnly": len(stress),
        },
    }
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=1)

    print(f"ordinary-value failures     : {len(rows)}")
    print(f"realistic-long-only failures: {len(realistic)}")
    print(f"stress-only failures        : {len(stress)}")
    print()
    for row in rows:
        print(f"{row['documentId']}/{row['fieldId']}  p{row['page']}  "
              f"[{row['classification']}]")
        print(f"    value      «{row['value']}» ({row['valueLength']} chars, "
              f"{row['engineReason']})")
        print(f"    slot       {row['printedSlotWidth']} pt mapped / "
              f"{row['printedRuleWidth']} pt printed rule, "
              f"{row['lineCapacity']} line(s), {row['preferredFontSize']}→"
              f"{row['minFontSize']} pt")
        print(f"    page       body ends {row['pageBodyBottom']}, footer "
              f"{row['pageFixedFooterFrom']}, reserve {row['pageBottomReserve']} pt, "
              f"recoverable block gap {row['recoverableBlockGap']} pt")
        print(f"    row        pitch {row['sourceLinePitch']}, ink "
              f"{row['sourceRowGeometry']['inkHeight']}, rule "
              f"{row['sourceRowGeometry']['ruleThickness']} pt at +"
              f"{row['sourceRowGeometry']['ruleBelowBaseline']}, minimum row "
              f"{row['sourceRowGeometry']['minRowHeight']} pt")
        print(f"    profiles   {', '.join(row['profiles'])}")
        print()
    print(f"written: {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
