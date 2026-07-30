"""Run the production text-layout specs headlessly.

    python static-uikit/tools/qa/run_layout_specs.py

Exit code 0 when every spec passes. See tools/document-layout-qa.html to run the
same specs manually in a visible browser.
"""

from __future__ import annotations

import json
import sys

from headless_browser import Chrome, Server


def main() -> int:
    server, browser = Server(), Chrome()
    try:
        browser.goto(server.base + "/tools/document-layout-qa.html?auto=1")
        browser.wait_for_title()
        report = json.loads(browser.payload("JSON_START", "JSON_END"))
    finally:
        browser.stop()
        server.stop()

    if report.get("harnessError"):
        print("harness error:", report["harnessError"])
        return 2

    failed = [r for r in report["results"] if not r["ok"]]
    for result in report["results"]:
        if not result["ok"]:
            print(f"FAIL  {result['name']}\n      {result.get('detail', '')}")
    print(f"\ntext-layout specs: {report['passed']}/{report['total']} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
