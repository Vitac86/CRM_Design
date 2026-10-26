"""Run the Template Builder browser QA suite headlessly.

    python static-uikit/tools/qa/run_builder_qa.py

Drives tools/document-template-builder-qa.html, which exercises the real
builder against the real production renderer and all 18 committed maps.
"""

from __future__ import annotations

import json
import sys

from headless_browser import Chrome, Server


def main() -> int:
    server, browser = Server(), Chrome()
    try:
        browser.goto(server.base + "/tools/document-template-builder-qa.html")
        browser.wait_for_title(("DONE · Builder QA", "FAILED · Builder QA"), timeout=600)
        report = json.loads(browser.payload("QA_JSON_START", "QA_JSON_END", "qa-output"))
    finally:
        browser.stop()
        server.stop()

    for result in report["results"]:
        if not result["pass"]:
            print(f"FAIL  {result['name']}\n      {result.get('details', '')}")
    print(f"\nTemplate Builder QA: {report['passed']}/{report['total']} passed")
    return 1 if report["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
