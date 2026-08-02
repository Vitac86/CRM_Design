"""One canonical dataset for every value QA had to shorten.

    python static-uikit/tools/qa/audit_ordinary_substitutions.py \
        --smoke static-uikit/manual-smoke/word-flow-long-data

Three earlier reports counted the same problem differently and named different
fields, which is why this exists. They were each right about a different thing:

  * the substitution audit counts *occurrences* — one row per (profile,
    document, field), so one field appears once per profile that hit it;
  * the ordinary list counts *distinct fields reached by an ordinary payload*;
  * the wrapping matrix counts *distinct fields reached by a realistic-long
    payload*, and deliberately excludes fields already classified as an
    unrealistic fixture or duplicate coverage.

A field can therefore appear in the wrapping matrix and not in the ordinary
list, or the reverse. This joins all of them on (documentId, fieldId), keeps
the fixture class of every occurrence, and reports both numbers separately so
neither can be mistaken for the other.

Everything is read from committed maps and generated QA reports; nothing is
inferred.
"""

from __future__ import annotations

import argparse
import collections
import csv
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

# Field categories the product claims to support. A realistic-long value in one
# of these is release-blocking too, not merely "long".
SUPPORTED_CATEGORIES = {
    "company-name": r"company|legal-?name|foreign-?name|english-?name|short-?name",
    "address": r"address",
    "authority": r"authority|issued-?by|registration-?authority|licence",
    "email": r"email",
    "source-of-funds": r"funds|source-of-funds",
    "tariff": r"tariff",
    "payment-purpose": r"payment-?purpose|purpose",
    "date-in-words": r"date-?words|prописью|propisyu",
    "name": r"full-?name|fio|signatory|representative|signature",
}

MAP_FACTS = r"""
JSON.stringify(Object.keys(window.CRMDocumentEngine.fieldMaps).sort()
  .reduce(function (out, id) {
    var t = window.CRMDocumentEngine.fieldMaps[id];
    var fields = {};
    (t.fields || []).forEach(function (f) {
      fields[f.id] = { label: f.label || null, source: f.source || null,
        page: f.page, left: f.left, width: f.width,
        fontSize: f.fontSize, minFontSize: f.minFontSize,
        multiline: !!f.multiline, maxLines: f.maxLines || null,
        maxHeight: f.maxHeight || null,
        flowRegions: (f.flowRegions || []).length,
        hasExpansion: !!f.expansion,
        overflowStrategy: f.overflowStrategy || null,
        flowBlockId: f.flowBlockId || null };
    });
    (t.wordFlowBlocks || []).forEach(function (b) {
      fields[b.id] = { label: b.id, source: null, page: b.page,
        left: (b.frame || {}).left, width: (b.frame || {}).width,
        fontSize: b.fontSize, minFontSize: b.minFontSize,
        multiline: true,
        maxLines: (b.frame || {}).initialLineCount || null,
        maxHeight: null, flowRegions: 0,
        hasExpansion: !!b.expansion,
        overflowStrategy: b.overflowStrategy || null,
        isWordFlowBlock: true,
        maxExtraRows: (b.expansion || {}).maxExtraRows || 0 };
    });
    out[id] = { title: t.title || id, appliesTo: t.appliesTo || [],
                fields: fields };
    return out; }, {}))
"""


def category_of(source, field_id):
    import re
    text = f"{source or ''} {field_id or ''}"
    for name, pattern in SUPPORTED_CATEGORIES.items():
        if re.search(pattern, text, re.I):
            return name
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--smoke", required=True,
                        help="the manual smoke pack root")
    parser.add_argument("--out", default=os.path.join(HERE, "ordinary-substitutions.json"))
    parser.add_argument("--csv", default=os.path.join(HERE, "ordinary-substitutions.csv"))
    args = parser.parse_args()

    smoke = os.path.abspath(args.smoke)

    def load(rel, default=None):
        path = os.path.join(smoke, rel)
        if not os.path.isfile(path):
            return default
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)

    substitutions = (load("reports/substitution-review.json") or {}).get(
        "substitutions", [])
    room_raw = load("reports/field-room.json") or {}
    room = {f"{doc}/{r['id']}": r.get("below")
            for doc, rows in room_raw.items() for r in rows}
    height = {f"{doc}/{r['id']}": r.get("room")
              for doc, rows in room_raw.items() for r in rows}

    profiles = {}
    profile_dir = os.path.join(smoke, "fixtures", "profiles")
    if os.path.isdir(profile_dir):
        for name in os.listdir(profile_dir):
            with open(os.path.join(profile_dir, name), encoding="utf-8") as fh:
                entry = json.load(fh)
            profiles[entry["id"]] = entry

    wrapping = {}
    path = os.path.join(HERE, "wrapping-candidates.json")
    if os.path.isfile(path):
        with open(path, encoding="utf-8") as fh:
            for row in json.load(fh)["fields"]:
                if row.get("documentId"):
                    wrapping[f"{row['documentId']}/{row['fieldId']}"] = row

    sys.path.insert(0, HERE)
    from headless_browser import Chrome, Server  # noqa: E402

    server, browser = Server(), Chrome()
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")
        maps = json.loads(browser.eval(MAP_FACTS))
    finally:
        browser.stop()
        server.stop()

    # ── join every occurrence onto its field ────────────────────────────────
    by_field = collections.defaultdict(list)
    for item in substitutions:
        if not item.get("fieldId"):
            continue
        key = f"{item['doc']}/{item['fieldId']}"
        profile = profiles.get(item.get("profile"), {})
        by_field[key].append({
            "profile": item.get("profile"),
            "fixtureClass": profile.get("lengthClass", "unknown"),
            "subjectKind": profile.get("subjectKind"),
            "requested": item.get("refusedValue"),
            "rendered": item.get("usedValue"),
            "requestedLength": item.get("refusedLength"),
            "renderedLength": item.get("usedLength"),
            "category": item.get("category"),
            "scenario": item.get("scenario"),
        })

    rows = []
    for key in sorted(by_field):
        doc_id, field_id = key.split("/", 1)
        occurrences = by_field[key]
        classes = collections.Counter(o["fixtureClass"] for o in occurrences)
        info = (maps.get(doc_id) or {}).get("fields", {}).get(field_id, {})
        wrap = wrapping.get(key, {})

        # The longest value each class asked for.
        def longest(cls):
            candidates = [o for o in occurrences if o["fixtureClass"] == cls]
            if not candidates:
                return None
            return max(candidates, key=lambda o: o["requestedLength"] or 0)

        ordinary, long_value = longest("normal"), longest("realistic-long")
        worst = ordinary or long_value or occurrences[0]

        rows.append({
            "documentId": doc_id,
            "documentTitle": (maps.get(doc_id) or {}).get("title", doc_id),
            "appliesTo": (maps.get(doc_id) or {}).get("appliesTo", []),
            "fieldId": field_id,
            "isWordFlowBlock": bool(info.get("isWordFlowBlock")),
            "label": info.get("label"),
            "source": info.get("source"),
            "page": info.get("page"),
            "valueCategory": category_of(info.get("source"), field_id),
            "occurrences": len(occurrences),
            "occurrencesByFixtureClass": dict(classes),
            "reachedByOrdinary": bool(ordinary),
            "reachedByRealisticLong": bool(long_value),
            "reachedByStressOnly": bool(classes.get("stress-only")),
            "ordinaryRequested": ordinary["requested"] if ordinary else None,
            "ordinaryRendered": ordinary["rendered"] if ordinary else None,
            "ordinaryRequestedLength": ordinary["requestedLength"] if ordinary else None,
            "ordinaryRenderedLength": ordinary["renderedLength"] if ordinary else None,
            "longRequested": long_value["requested"] if long_value else None,
            "longRendered": long_value["rendered"] if long_value else None,
            "preferredFontSize": info.get("fontSize"),
            "minimumFontSize": info.get("minFontSize"),
            "slotLeft": info.get("left"),
            "slotWidth": info.get("width"),
            "slotHeight": height.get(key),
            "existingLines": info.get("maxLines"),
            "maxHeight": info.get("maxHeight"),
            "multiline": info.get("multiline"),
            "existingContinuationRegions": info.get("flowRegions"),
            "hasExpansionAnchor": info.get("hasExpansion"),
            "maxExtraRows": info.get("maxExtraRows"),
            "overflowStrategy": info.get("overflowStrategy"),
            "measuredBlankBelow": room.get(key),
            "wrappingMatrixVerdict": wrap.get("category"),
            "wrappingMatrixWhy": wrap.get("why"),
            "worstRequested": worst["requested"],
            "worstRendered": worst["rendered"],
        })

    ordinary_fields = [r for r in rows if r["reachedByOrdinary"]]
    long_fields = [r for r in rows if r["reachedByRealisticLong"]]
    supported_long = [r for r in long_fields
                      if not r["reachedByOrdinary"] and r["valueCategory"]]

    payload = {
        "occurrences": len(substitutions),
        "distinctFields": len(rows),
        "distinctFieldsReachedByOrdinary": len(ordinary_fields),
        "distinctFieldsReachedByRealisticLong": len(long_fields),
        "distinctFieldsInWrappingMatrix": len(wrapping),
        "supportedCategoryLongOnlyFields": len(supported_long),
        "fields": rows,
    }
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=1)

    columns = ["documentId", "documentTitle", "fieldId", "isWordFlowBlock",
               "label", "source", "page", "valueCategory", "occurrences",
               "reachedByOrdinary", "reachedByRealisticLong",
               "ordinaryRequested", "ordinaryRendered",
               "ordinaryRequestedLength", "ordinaryRenderedLength",
               "longRequested", "longRendered",
               "preferredFontSize", "minimumFontSize", "slotWidth",
               "slotHeight", "existingLines", "maxHeight", "multiline",
               "existingContinuationRegions", "hasExpansionAnchor",
               "measuredBlankBelow", "wrappingMatrixVerdict"]
    with open(args.csv, "w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.writer(fh, delimiter=";")
        writer.writerow(columns)
        for row in rows:
            writer.writerow([row.get(c) for c in columns])

    print(f"substitution occurrences        : {payload['occurrences']}")
    print(f"distinct fields overall         : {payload['distinctFields']}")
    print(f"  reached by an ordinary value  : {payload['distinctFieldsReachedByOrdinary']}")
    print(f"  reached by realistic-long     : {payload['distinctFieldsReachedByRealisticLong']}")
    print(f"wrapping matrix distinct fields : {payload['distinctFieldsInWrappingMatrix']}")
    print(f"supported-category, long only   : {payload['supportedCategoryLongOnlyFields']}")

    print("\n── fields an ORDINARY value could not fit ──────────────────────")
    for row in ordinary_fields:
        print(f"  {row['documentId']}/{row['fieldId']}  [{row['valueCategory']}]")
        print(f"     requested {row['ordinaryRequestedLength']} ch -> rendered "
              f"{row['ordinaryRenderedLength']} ch | slot {row['slotWidth']} pt "
              f"| below {row['measuredBlankBelow']} | regions "
              f"{row['existingContinuationRegions']} | anchor "
              f"{row['hasExpansionAnchor']}")

    print("\n── reached only by a realistic-long value ──────────────────────")
    for row in long_fields:
        if row["reachedByOrdinary"]:
            continue
        print(f"  {row['documentId']}/{row['fieldId']}  "
              f"[{row['valueCategory']}] {row['wrappingMatrixVerdict']}")

    print(f"\n-> {args.out}\n-> {args.csv}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
