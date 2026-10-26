"""The exact matrix for every field that had to be shortened, and why.

    python static-uikit/tools/qa/audit_wrapping_candidates.py --values values.json

`values.json` maps "documentId/fieldId" to the original realistic-long value
the smoke pack tried before substituting. For each field this reports the
printed-slot geometry, the flow regions it has, the blank space measured under
it in the authoritative PDF, and what the production layout engine does with
the original value — then classifies it:

  1 fixture-unrealistic          the value is longer than a manager would type
  2 duplicate-coverage           a shorter value covers the same layout question
  3 wrapping-missing             room exists on the line and the value wraps
                                 once wrapping is enabled
  4 continuation-region-missing  room exists below and a reviewed continuation
                                 region would hold the remainder
  5 expansion-required           only a generated row can hold it
  6 physical-limit               nothing on the page can hold it

Nothing is asserted from configuration alone: every verdict comes from asking
the engine to lay the original value out.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from headless_browser import Chrome, Server

HERE = os.path.dirname(os.path.abspath(__file__))

# A continuation line at the readability floor needs about a line of paper.
MIN_CONTINUATION_ROOM = 11.0

PROBE = r"""
(async function (docId, fieldId, value, roomBelow) {
  const E = CRMDocumentEngine.overlayRenderer;
  const L = CRMDocumentEngine.textLayout;
  const t = CRMDocumentEngine.fieldMaps[docId];
  const field = (t.fields || []).filter(function (f) { return f.id === fieldId; })[0];
  if (!field) return JSON.stringify({ missing: true });
  const ctx = await E.open(t, {});
  const font = ctx.fonts[field.font || 'legalSerif'];

  function attempt(spec) {
    try {
      return L.layoutValue(font, value, spec);
    } catch (e) { return { fits: false, reason: 'error', message: e.message }; }
  }

  // As configured today.
  const asIs = attempt(field);
  // The same slot, allowed to use more lines on the spot.
  const wrapped = attempt(Object.assign({}, field, {
    multiline: true, maxLines: 2,
    lineHeight: field.lineHeight || (Number(field.fontSize) * 1.15)
  }));
  const wrapped3 = attempt(Object.assign({}, field, {
    multiline: true, maxLines: 3,
    lineHeight: field.lineHeight || (Number(field.fontSize) * 1.15)
  }));
  // The decisive question: if the slot were allowed to use the blank paper
  // that is really under it, would the value fit? `maxHeight` is what caps
  // most of these, and a cap is configuration — the paper is not.
  const lineHeight = field.lineHeight || (Number(field.fontSize) * 1.15);
  const available = (Number(field.maxHeight) || lineHeight) +
                    (Number(roomBelow) || 0);
  const usingRoom = attempt(Object.assign({}, field, {
    multiline: true, maxLines: null, lineHeight: lineHeight,
    maxHeight: available
  }));

  return JSON.stringify({
    fieldId: field.id, page: field.page, source: field.source || null,
    left: field.left, width: field.width,
    fontSize: field.fontSize, minFontSize: field.minFontSize,
    multiline: !!field.multiline, maxLines: field.maxLines || null,
    maxHeight: field.maxHeight || null,
    flowRegions: (field.flowRegions || []).length,
    expansion: !!field.expansion,
    overflowStrategy: field.overflowStrategy || null,
    asIs: { fits: !!asIs.fits, reason: asIs.reason || null,
            size: asIs.size || null, lines: (asIs.lines || []).length },
    twoLines: { fits: !!wrapped.fits, reason: wrapped.reason || null,
                size: wrapped.size || null, lines: (wrapped.lines || []).length },
    threeLines: { fits: !!wrapped3.fits, reason: wrapped3.reason || null,
                  size: wrapped3.size || null, lines: (wrapped3.lines || []).length },
    usingRoom: { fits: !!usingRoom.fits, reason: usingRoom.reason || null,
                 size: usingRoom.size || null,
                 lines: (usingRoom.lines || []).length,
                 heightAllowed: available }
  });
}(DOC, FIELD, VALUE, ROOM))
"""


def classify(row, room_below, original, substituted):
    """One verdict per field, from the measured facts."""
    original_length, substituted_length = len(original or ""), len(substituted or "")

    if row["asIs"]["fits"]:
        return "2-duplicate-coverage", (
            "the original value fits as configured; the substitution was not "
            "needed for this field")

    if original_length >= 150 and substituted_length >= 60:
        return "1-fixture-unrealistic", (
            f"{original_length} characters is beyond what a manager types; the "
            f"{substituted_length}-character value used is still realistic")

    if row["flowRegions"] > 1 or row["expansion"]:
        return "5-expansion-required", (
            "the slot already flows or expands and still cannot hold it")

    fits_in_room = row["usingRoom"]["fits"]
    lines = (row["usingRoom"]["lines"] or row["twoLines"]["lines"]
             or row["threeLines"]["lines"])
    if fits_in_room and (room_below or 0) >= MIN_CONTINUATION_ROOM:
        if row["multiline"]:
            return "3-wrapping-missing", (
                f"the slot already wraps but is capped at "
                f"{row['maxHeight'] or 'one line'}; the value needs {lines} lines "
                f"and {room_below:.2f} pt is free below it")
        return "4-continuation-region-missing", (
            f"one printed line, {room_below:.2f} pt free below it, and the "
            f"value fits in {lines} lines once that room is allowed")

    if row["twoLines"]["fits"] or row["threeLines"]["fits"]:
        return "6-physical-limit", (
            f"it would wrap, but only "
            f"{('no' if room_below is None else format(room_below, '.2f') + ' pt')} "
            f"of blank paper is under the slot")

    return "6-physical-limit", (
        f"the value does not fit in a {row['width']} pt slot at the "
        f"{row['minFontSize']} pt floor even using the "
        f"{row['usingRoom']['heightAllowed']:.2f} pt of height really available")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--values", required=True,
                        help="JSON: {'doc/field': {original, substituted, class}}")
    parser.add_argument("--room", default=None,
                        help="field-room.json from measure_field_room.py")
    parser.add_argument("--out", default=os.path.join(HERE, "wrapping-candidates.json"))
    args = parser.parse_args()

    with open(args.values, encoding="utf-8") as fh:
        wanted = json.load(fh)

    room = {}
    if args.room and os.path.isfile(args.room):
        with open(args.room, encoding="utf-8") as fh:
            for doc, rows in json.load(fh).items():
                for entry in rows:
                    room[f"{doc}/{entry['id']}"] = entry.get("below")

    server, browser = Server(), Chrome()
    matrix = []
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")
        for key in sorted(wanted):
            doc_id, field_id = key.split("/", 1)
            entry = wanted[key]
            script = (PROBE.replace("DOC", json.dumps(doc_id))
                      .replace("FIELD", json.dumps(field_id))
                      .replace("VALUE", json.dumps(entry["original"],
                                                   ensure_ascii=False))
                      .replace("ROOM", json.dumps(room.get(key) or 0)))
            row = json.loads(browser.eval(script, await_promise=True))
            if row.get("missing"):
                # A Word-flow block, not a field: it has no printed slot of its
                # own and is measured by its frame and row budget instead.
                matrix.append({"documentId": doc_id, "fieldId": field_id,
                               "source": None, "page": None,
                               "originalValue": entry["original"],
                               "substitutedValue": entry.get("substituted", ""),
                               "originalLength": len(entry["original"] or ""),
                               "substitutedLength": len(entry.get("substituted") or ""),
                               "slotWidth": 0.0, "measuredRoomBelow": None,
                               "fitsOverTwoLines": False,
                               "category": "word-flow-block",
                               "why": "measured as a block, not a field"})
                continue
            below = room.get(key)
            category, why = classify(row, below, entry["original"],
                                     entry.get("substituted", ""))
            matrix.append({
                "documentId": doc_id, "fieldId": field_id,
                "source": row["source"], "page": row["page"],
                "originalValue": entry["original"],
                "substitutedValue": entry.get("substituted", ""),
                "originalLength": len(entry["original"] or ""),
                "substitutedLength": len(entry.get("substituted") or ""),
                "preferredFontSize": row["fontSize"],
                "minimumFontSize": row["minFontSize"],
                "slotLeft": row["left"], "slotWidth": row["width"],
                "multiline": row["multiline"], "maxLines": row["maxLines"],
                "maxHeight": row["maxHeight"],
                "flowRegions": row["flowRegions"],
                "hasExpansion": row["expansion"],
                "overflowStrategy": row["overflowStrategy"],
                "measuredRoomBelow": below,
                "valueClass": entry.get("valueClass", "realistic-long"),
                "originalFitsAsConfigured": row["asIs"]["fits"],
                "fitsOverTwoLines": row["twoLines"]["fits"],
                "fitsOverThreeLines": row["threeLines"]["fits"],
                "fitsUsingMeasuredRoom": row["usingRoom"]["fits"],
                "linesUsingMeasuredRoom": row["usingRoom"]["lines"],
                "heightAvailable": row["usingRoom"]["heightAllowed"],
                "category": category, "why": why,
                "productionReady": row["asIs"]["fits"],
            })
    finally:
        browser.stop()
        server.stop()

    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump({"fields": matrix}, fh, ensure_ascii=False, indent=1)

    print(f"{len(matrix)} distinct field(s)\n")
    print(f"{'document / field':52s} {'orig':>5s} {'sub':>5s} {'width':>7s} "
          f"{'below':>7s} {'lines2':>7s}  category")
    for row in matrix:
        below = row.get("measuredRoomBelow")
        print(f"{row['documentId'] + '/' + row['fieldId']:52s} "
              f"{row['originalLength']:5d} {row['substitutedLength']:5d} "
              f"{row['slotWidth']:7.1f} "
              f"{(f'{below:.1f}' if below is not None else '-'):>7s} "
              f"{str(row['fitsOverTwoLines']):>7s}  {row['category']}")
    print(f"\n-> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
