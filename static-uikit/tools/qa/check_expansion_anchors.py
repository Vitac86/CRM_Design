"""Verify every expansion anchor sits on a clean cut, and suggest one if not.

    python static-uikit/tools/qa/check_expansion_anchors.py
    python static-uikit/tools/qa/check_expansion_anchors.py --suggest

A page's content can only be split where no drawing block crosses the line.
This asks the production expander to try each declared `insertionTop` and, when
it straddles, scans nearby for the closest value that does not.
"""

from __future__ import annotations

import argparse
import json
import sys

from headless_browser import Chrome, Server

PROBE = r"""
(async function (docId, page, tops, toTop, delta) {
  const t = CRMDocumentEngine.fieldMaps[docId];
  const url = t.templateUrl.replace('../', '../');
  const bytes = await (await fetch(url)).arrayBuffer();
  const out = [];
  for (const top of tops) {
    const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
    try {
      const r = CRMDocumentEngine.pageExpander.shiftPageContent(
        doc, doc.getPages()[page], [{ fromTop: top, toTop: toTop, delta: delta }]);
      out.push([top, r.moved]);
    } catch (e) { /* straddles */ }
  }
  return JSON.stringify(out);
}(DOC, PAGE, TOPS, TO_TOP, DELTA))
"""


def anchors(browser):
    raw = browser.eval(
        "JSON.stringify(Object.keys(window.CRMDocumentEngine.fieldMaps).reduce("
        "function (out, id) {"
        "  (window.CRMDocumentEngine.fieldMaps[id].fields || []).forEach(function (f) {"
        "    if (f.expansion) out.push({ doc: id, field: f.id, e: f.expansion });"
        "  }); return out; }, []))"
    )
    return json.loads(raw)


def probe(browser, doc, page, tops, to_top, delta):
    script = (PROBE
              .replace("DOC", json.dumps(doc))
              .replace("PAGE", str(page))
              .replace("TOPS", json.dumps(tops))
              .replace("TO_TOP", str(to_top))
              .replace("DELTA", str(delta)))
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
            spec = entry["e"]
            page = int(spec.get("page", 0))
            declared = float(spec["insertionTop"])
            to_top = float(spec["shiftToTop"])
            delta = float(spec["rowHeight"])
            ok = probe(browser, entry["doc"], page, [declared], to_top, delta)
            if ok:
                print(f"OK    {entry['doc']:34s} {entry['field']:34s} "
                      f"p{page} @{declared} ({ok[0][1]} blocks move)")
                continue
            bad += 1
            print(f"CLASH {entry['doc']:34s} {entry['field']:34s} "
                  f"p{page} @{declared}")
            if not args.suggest:
                continue
            candidates = [round(declared + step * 0.25, 2)
                          for step in range(int(-args.span * 4), int(args.span * 4) + 1)]
            clean = probe(browser, entry["doc"], page, candidates, to_top, delta)
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
