"""Dump every production field map as JSON, by executing the real modules.

    python static-uikit/tools/qa/dump_field_maps.py --out maps.json

The maps are JavaScript that builds its field list with helper functions and
per-document constants, so the only trustworthy way to read them is to run
them. The output feeds measure_field_room.py and the audit report.
"""

from __future__ import annotations

import argparse
import json
import sys

from headless_browser import Chrome, Server


def dump():
    server, browser = Server(), Chrome()
    try:
        # The builder page loads all 18 maps; any page that does would work.
        browser.goto(server.base + "/tools/document-map-audit.html")
        raw = browser.eval(
            "JSON.stringify(window.CRMDocumentEngine.fieldMaps,"
            " function (key, value) {"
            "   return typeof value === 'function' ? '[function]' : value; })"
        )
    finally:
        browser.stop()
        server.stop()
    return json.loads(raw)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="maps.json")
    args = parser.parse_args()

    maps = dump()
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(maps, handle, ensure_ascii=False, indent=1)

    total = 0
    for map_id, template in sorted(maps.items()):
        fields = template.get("fields", [])
        total += len(fields)
        kinds = {}
        for field in fields:
            kind = field.get("type", "text")
            kinds[kind] = kinds.get(kind, 0) + 1
        print(f"{map_id:36s} {len(fields):4d}  {kinds}")
    print(f"\n{len(maps)} maps, {total} fields -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
