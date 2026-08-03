"""The canonical combined QA run. It has to pass without a standalone rerun.

    python static-uikit/tools/qa/run_all_qa.py
    python static-uikit/tools/qa/run_all_qa.py --json report.json

Every suite runs in its own process, one at a time, each with its own loopback
port and its own browser profile. Before the first suite the assets the pages
need are fetched once and checked, so an environment fault is reported as an
environment fault instead of being blamed on the product.

Why this exists: run individually, the Template Builder suite passed 68/68;
run back-to-back with the others it failed 21 checks with 404s on a PDF
template and on `pdf.worker.mjs`. Neither was a product defect. `.mjs` is not a
registered media type on a stock Windows install, and the stdlib listen backlog
of 5 dropped connections when the builder page opened every map at once. Both
are fixed in `headless_browser.py`; this runner exists so the combined run is
the one that has to be green.

Only server readiness is retried, never a suite: a flaky product failure must
stay visible.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))

# Assets every harness page depends on. Checked once, before any suite runs.
REQUIRED_ASSETS = [
    "/tools/document-map-audit.html",
    "/tools/document-template-builder-qa.html",
    "/tools/document-layout-qa.html",
    "/assets/vendor/pdf-lib.min.js",
    "/assets/vendor/fontkit.umd.min.js",
    "/assets/vendor/pdfjs/pdf.mjs",
    "/assets/vendor/pdfjs/pdf.worker.mjs",
    "/assets/fonts/pdf/LiberationSerif-Regular.ttf",
    "/assets/js/document-engine/pdf-overlay-renderer.js",
    "/assets/js/pages/document-wizard.js",
    "/assets/document-pdf-templates/accession-application-fl.pdf",
    "/assets/document-pdf-templates/power-of-attorney.pdf",
]

SUITES = [
    # First: a map may only name a source the exact UMI registry can explain.
    # Everything after this assumes the names it reads are real.
    ("UMI registry", "check_umi_registry.py", []),
    ("UMI registry gates", "check_umi_registry.py", ["--self-test"]),
    ("text layout", "run_layout_specs.py", []),
    ("Word flow", "run_word_flow_renderer_tests.py", []),
    ("page expansion", "run_expansion_tests.py", []),
    ("table-cell expansion", "run_table_cell_expansion_tests.py", []),
    ("visual geometry and cross-page flow", "run_visual_geometry_tests.py", []),
    # Geometry says the value is inside its box. This says the result still
    # reads as one field: an exact reference stays in its sentence, a grown row
    # keeps the paragraph's rhythm, and no printed placeholder survives.
    ("visual reading flow", "run_visual_flow_tests.py", []),
    ("reviewed operator ranges", "run_reviewed_operator_range_tests.py", []),
    ("preflight/render agreement", "run_preflight_render_agreement_tests.py", []),
    ("Document Wizard", "run_wizard_tests.py", []),
    ("Template Builder", "run_builder_qa.py", []),
    ("identifier manifest", "check_identifier_manifest.py", []),
    ("Word-flow static equivalence", "check_word_flow_static_equivalence.py", []),
    ("expansion anchors", "check_expansion_anchors.py", []),
    ("structural PDF", "run_structural_pdf_tests.py", []),
    ("full template audit", "check_full_template_audit.py", ["--self-test"]),
    # Every other suite asks whether the values a map produces are right. These
    # two ask whether a map produces a value at all where the form asked for
    # one — a half-filled sentence, a group set two ways, a printed sample
    # nobody replaces — and are run against the source PDFs, not the maps, so a
    # blank nobody mapped is still found.
    ("production completeness", "check_production_completeness.py", []),
    ("production completeness gates", "check_production_completeness.py",
     ["--self-test"]),
    ("document regression", "run_document_regression.py", []),
    # These two read the regression report, so they run after it.
    ("regression denominator", "audit_regression_denominator.py", []),
    ("accession row capacity", "verify_accession_row_capacity.py", []),
    # The release gate: no ordinary payload may be shortened, and every value
    # the engine does accept has to come back out of the PDF unchanged.
    ("ordinary requested/rendered equality", "audit_ordinary_equality.py", []),
]


def check_environment() -> int:
    """Serve the tree once and prove every page dependency is really there."""
    sys.path.insert(0, HERE)
    from headless_browser import Server  # noqa: E402  (needs HERE on the path)

    server = Server()
    try:
        server.assert_assets(REQUIRED_ASSETS)
    finally:
        server.stop()
    print(f"environment: {len(REQUIRED_ASSETS)} required assets served correctly")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", help="write the machine-readable report here")
    parser.add_argument("--only", action="append",
                        help="run only this script (repeatable)")
    args = parser.parse_args()

    try:
        check_environment()
    except Exception as error:
        print(f"ENVIRONMENT FAULT: {error}")
        print("No suite was run. Fix the environment and try again.")
        return 2

    suites = [s for s in SUITES if not args.only or s[1] in args.only]
    results = []
    started = time.time()

    for label, script, extra in suites:
        print(f"\n{'=' * 78}\n>>> {label}  ({script})\n{'=' * 78}", flush=True)
        begin = time.time()
        proc = subprocess.run(
            [sys.executable, "-X", "utf8", os.path.join(HERE, script), *extra],
            cwd=HERE, capture_output=True, text=True,
            encoding="utf-8", errors="replace")
        elapsed = round(time.time() - begin, 1)
        stdout = proc.stdout or ""
        print("\n".join(stdout.strip().splitlines()[-25:]), flush=True)
        if proc.returncode != 0 and proc.stderr:
            print("--- stderr ---\n" + proc.stderr[-2500:], flush=True)
        results.append({
            "suite": label, "script": script, "args": extra,
            "returncode": proc.returncode, "seconds": elapsed,
            "summary": next((line for line in reversed(stdout.splitlines())
                             if line.strip()), ""),
            "stdout": stdout, "stderr": proc.stderr[-4000:],
        })
        print(f"<<< {label}: exit {proc.returncode} in {elapsed}s", flush=True)

    failed = [r for r in results if r["returncode"] != 0]
    print(f"\n{'=' * 78}")
    for result in results:
        mark = "PASS" if result["returncode"] == 0 else "FAIL"
        print(f"{mark}  {result['suite']:38s} {result['seconds']:7.1f}s  "
              f"{result['summary'][:70]}")
    print(f"{'=' * 78}")
    print(f"{len(results) - len(failed)}/{len(results)} suites passed "
          f"in {round(time.time() - started, 1)}s")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump({"suites": results,
                       "passed": len(results) - len(failed),
                       "total": len(results)}, fh, ensure_ascii=False, indent=1)
        print(f"-> {args.json}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
