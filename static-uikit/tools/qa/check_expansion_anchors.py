"""Verify every expansion anchor sits on a clean cut, and suggest one if not.

    python static-uikit/tools/qa/check_expansion_anchors.py
    python static-uikit/tools/qa/check_expansion_anchors.py --suggest

A page's content can only be split where no drawing block crosses the line.
This asks the production expander to try each declared `insertionTop` and, when
it straddles, scans nearby for the closest value that does not.

The anchor list comes from `CRMDocumentEngine.overlayRenderer.expansionAnchors`,
the production normalizer, so every schema location that can move page content
is audited: `fields[].expansion`, `wordFlowBlocks[].expansion`, page compaction
zones and both ends of a reviewed cross-page flow. Walking `fields[]` alone —
what this tool used to do — is why a Word-flow anchor sitting inside a printed
block passed for as long as it did.
"""

from __future__ import annotations

import argparse
import json
import sys

from headless_browser import Chrome, Server

PROBE = r"""
(async function (docId, page, tops, toTop, delta, moveTopLevelPaths) {
  const R = CRMDocumentEngine.overlayRenderer;
  const t = CRMDocumentEngine.fieldMaps[docId];
  const url = t.templateUrl.replace('../', '../');
  const bytes = await (await fetch(url)).arrayBuffer();
  // A reviewed paragraph is suppressed before the page is shifted, so the cut
  // never meets it. This audit has no payload, so it counts only the ranges
  // that are suppressed for EVERY payload — a `showWhen` variant stays on the
  // page as far as this check is concerned.
  const gone = (R.unconditionalSuppressedBlocksByPage(t) || {})[page] || [];
  const out = [];
  for (const top of tops) {
    const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    try {
      const r = CRMDocumentEngine.pageExpander.shiftPageContent(
        doc, doc.getPages()[page], [{ fromTop: top, toTop: toTop, delta: delta,
          moveTopLevelPaths: moveTopLevelPaths }],
        { suppressedBlocks: gone });
      out.push([top, r.moved]);
    } catch (e) { /* straddles */ }
  }
  return JSON.stringify(out);
}(DOC, PAGE, TOPS, TO_TOP, DELTA, MOVE_PATHS))
"""


def anchors(browser):
    """Every declared cut in every map, from the production normalizer."""
    raw = browser.eval(
        "JSON.stringify(Object.keys(window.CRMDocumentEngine.fieldMaps)"
        " .sort().reduce(function (out, id) {"
        "   return out.concat(window.CRMDocumentEngine.overlayRenderer"
        "     .expansionAnchors(window.CRMDocumentEngine.fieldMaps[id]));"
        " }, []))"
    )
    return [
        {"doc": item["documentId"], "field": item["id"], "origin": item["origin"],
         "page": item["page"], "top": item["top"], "delta": item["delta"],
         "toTop": item["toTop"], "moveTopLevelPaths": item["moveTopLevelPaths"]}
        for item in json.loads(raw)
    ]


def probe(browser, doc, page, tops, to_top, delta, move_paths=False):
    script = (PROBE
              .replace("DOC", json.dumps(doc))
              .replace("PAGE", str(page))
              .replace("TOPS", json.dumps(tops))
              .replace("TO_TOP", str(to_top))
              .replace("DELTA", str(delta))
              .replace("MOVE_PATHS", "true" if move_paths else "false"))
    return json.loads(browser.eval(script, await_promise=True))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--suggest", action="store_true",
                        help="scan for the nearest clean insertion point")
    parser.add_argument("--span", type=float, default=30.0)
    args = parser.parse_args()

    server, browser = Server(), Chrome()
    bad = 0
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")
        for entry in anchors(browser):
            page = int(entry["page"])
            declared = float(entry["top"])
            to_top = float(entry["toTop"])
            delta = float(entry["delta"])
            move_paths = bool(entry.get("moveTopLevelPaths"))
            ok = probe(browser, entry["doc"], page, [declared], to_top,
                       delta, move_paths)
            label = f"{entry['field']} [{entry['origin']}]"
            if ok:
                print(f"OK    {entry['doc']:34s} {label:48s} "
                      f"p{page} @{declared} ({ok[0][1]} blocks move)")
                continue
            bad += 1
            print(f"CLASH {entry['doc']:34s} {label:48s} "
                  f"p{page} @{declared}")
            if not args.suggest:
                continue
            candidates = [round(declared + step * 0.25, 2)
                          for step in range(int(-args.span * 4), int(args.span * 4) + 1)]
            clean = probe(browser, entry["doc"], page, candidates, to_top,
                          delta, move_paths)
            if not clean:
                print(f"      no clean cut within ±{args.span} pt")
                continue
            nearest = min(clean, key=lambda c: abs(c[0] - declared))
            print(f"      nearest clean insertionTop: {nearest[0]} "
                  f"({nearest[1]} blocks move)")
    finally:
        browser.stop()
        server.stop()

    print(f"\n{bad} anchor(s) need a different insertion point")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
