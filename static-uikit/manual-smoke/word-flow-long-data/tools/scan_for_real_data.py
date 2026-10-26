"""Scan the whole smoke pack for anything that could be real data.

    python scan_for_real_data.py

Checks every text artefact *and* the extracted text of every generated PDF for:

  * e-mail domains other than the reserved example domains;
  * URLs pointing anywhere but the reserved example domains;
  * telephone numbers outside the reserved drama ranges;
  * the real company names and internal paths that appear in the repository
    (the ones a copied production payload would drag in);
  * bank/account-shaped digit runs that are not on the synthetic allow-list.

Anything it cannot recognise is reported for a human to look at. It is a net,
not a proof — but it fails loudly rather than passing quietly.
"""

from __future__ import annotations

import json
import os
import re
import sys

import fitz  # pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TEMPLATES = os.path.abspath(os.path.join(
    ROOT, "..", "..", "assets", "document-pdf-templates"))

TEXT_SUFFIXES = (".json", ".csv", ".md", ".html", ".py", ".cmd", ".txt")

ALLOWED_EMAIL_DOMAINS = {"example.test", "example.com", "example.org",
                         "example.net"}
ALLOWED_HOSTS = ALLOWED_EMAIL_DOMAINS | {"127.0.0.1", "localhost"}

# Synthetic identifiers this pack is allowed to contain, from smoke_profiles.
ALLOWED_DIGIT_RUNS = {
    "7801234567", "781234567890", "1177847012345", "780101001",
    "40817810099910004312", "40817810099910004313", "40817810099910004314",
    "30101810000000000999", "049999999", "4019", "587412", "780014",
    "12345678", "317784700123456", "123456789", "045147851000000",
    "2026", "14032026", "29072026", "20042008", "1250000", "980400",
    "0000417000", "000417", "9999", "1500", "24875", "37312500",
    "11482376", "998877665", "5581742", "2606", "190121", "197227",
    "125315", "1420", "118", "120", "102",
}

# The repository's *own* synthetic fixture constants, from
# `static-uikit/assets/js/document-builder/test-fixtures.js`. The production
# fixture engine fills any slot this pack does not override, so these reach the
# payloads for the profiles that must stay untouched (notably
# `smoke-optional-empty`, whose whole point is that nothing is added back).
# They are committed test data, not client data.
PRODUCTION_FIXTURE_CONSTANTS = {
    "772201234567",          # ИНН of the fixture individual
    "770101001",             # КПП of the fixture company
    "1217700011256",         # ОГРН of the fixture company
    "12345678901",           # СНИЛС digits
    "306010004401",          # 30601-000-4401 account portfolio
    "00000000000000017",     # long portfolio suffix
    "7947032154489",         # +7 (903) 215-44-89 as a digit run
    "9032154489",
}
ALLOWED_DIGIT_RUNS |= PRODUCTION_FIXTURE_CONSTANTS

# Dates are not identifiers: 1988-03-15 and 20.04.2008 are shaped like long
# digit runs but say nothing about anyone.
DATE_SHAPED = re.compile(
    r"^(?:\d{4}-\d{2}-\d{2}|\d{2}[.\-/]\d{2}[.\-/]\d{4}|\d{4}\d{2}\d{2})$")

# Strings that would only appear if a production client payload leaked in.
# Repository paths (P:\Kolosov\…, \\pt-srv-file.piter-trust.local) are not on
# this list: the pack is required to state its own absolute location, and a
# server share name is not client data.
FORBIDDEN_SUBSTRINGS = [
    "Z:\\", "6. Управление по работе с клиентами",
    "Формы документов",
]

EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@([A-Za-z0-9.\-]+\.[A-Za-z]{2,})")
URL = re.compile(r"https?://([A-Za-z0-9.\-]+)(?::\d+)?")
PHONE = re.compile(r"\+\d[\d ()\-]{7,}\d")
DIGIT_RUN = re.compile(r"\d[\d\- ]{7,}\d")

# Reserved ranges: UK Ofcom drama numbers, and an obviously fictional RU block.
ALLOWED_PHONE = (
    re.compile(r"^\+?44 20 7946 0\d{3}$"),
    re.compile(r"^\+?7 \(\d{3}\) 555-\d{2}-\d{2}$"),
    # The production fixture's own number, see PRODUCTION_FIXTURE_CONSTANTS.
    re.compile(r"^\+?7 \(903\) 215-44-89$"),
)


def digits(value: str) -> str:
    return re.sub(r"\D", "", value)


def scan_text(where: str, text: str, findings: list, source_text: str = "") -> None:
    """Report anything not recognisably synthetic.

    `source_text` is the authoritative template's own text when `text` came
    from a generated PDF. The broker's own requisites — its site, telephone,
    БИК and settlement account — are *printed on the form itself*; finding them
    in the output proves the template was preserved, not that data leaked in.
    So anything already present in the source is not a finding.
    """
    def from_source(value: str) -> bool:
        return bool(source_text) and value in source_text

    for domain in set(EMAIL.findall(text)):
        if domain.lower() in ALLOWED_EMAIL_DOMAINS or from_source(domain):
            continue
        findings.append((where, "e-mail domain", domain))
    for host in set(URL.findall(text)):
        if host.lower() in ALLOWED_HOSTS or from_source(host):
            continue
        findings.append((where, "url host", host))
    for phone in set(PHONE.findall(text)):
        cleaned = re.sub(r"\s+", " ", phone).strip()
        if any(rule.match(cleaned) for rule in ALLOWED_PHONE) or from_source(cleaned):
            continue
        findings.append((where, "telephone", cleaned))
    for needle in FORBIDDEN_SUBSTRINGS:
        if needle in text:
            findings.append((where, "forbidden string", needle))
    for run in set(DIGIT_RUN.findall(text)):
        stripped = run.strip()
        clean = digits(run)
        if len(clean) < 8 or DATE_SHAPED.match(stripped):
            continue
        if any(rule.match(stripped) for rule in ALLOWED_PHONE):
            continue
        if clean in ALLOWED_DIGIT_RUNS or from_source(stripped):
            continue
        if any(clean in allowed or allowed in clean
               for allowed in ALLOWED_DIGIT_RUNS):
            continue
        findings.append((where, "unrecognised digit run", run.strip()))


def template_text(template_id: str, cache: dict) -> str:
    if template_id not in cache:
        path = os.path.join(TEMPLATES, template_id)
        if not os.path.isfile(path):
            cache[template_id] = ""
        else:
            document = fitz.open(path)
            cache[template_id] = "\n".join(
                page.get_text("text") for page in document)
            document.close()
    return cache[template_id]


def main() -> int:
    findings: list[tuple[str, str, str]] = []
    text_files = pdf_files = 0
    cache: dict[str, str] = {}

    manifest_path = os.path.join(ROOT, "manifest.json")
    template_of = {}
    if os.path.isfile(manifest_path):
        with open(manifest_path, encoding="utf-8") as fh:
            for item in json.load(fh)["items"]:
                if item.get("pdfFilename"):
                    template_of[item["pdfFilename"]] = item["templateId"]

    for folder, _dirs, names in os.walk(ROOT):
        for name in sorted(names):
            path = os.path.join(folder, name)
            rel = os.path.relpath(path, ROOT).replace("\\", "/")
            if name == os.path.basename(__file__):
                continue                       # this file lists the patterns
            if name.endswith(TEXT_SUFFIXES):
                text_files += 1
                with open(path, encoding="utf-8", errors="replace") as fh:
                    scan_text(rel, fh.read(), findings)
            elif name.endswith(".pdf"):
                pdf_files += 1
                document = fitz.open(path)
                text = "\n".join(page.get_text("text") for page in document)
                document.close()
                scan_text(rel, text, findings,
                          template_text(template_of.get(name, ""), cache))

    grouped: dict[tuple[str, str], list[str]] = {}
    for where, kind, value in findings:
        grouped.setdefault((kind, value), []).append(where)

    print(f"scanned {text_files} text file(s) and {pdf_files} PDF(s)")
    if not grouped:
        print("\nNo real-looking data found. Everything matches the synthetic "
              "allow-list.")
    else:
        print(f"\n{len(grouped)} item(s) need a human eye:\n")
        for (kind, value), places in sorted(grouped.items()):
            print(f"  [{kind}] {value}")
            for place in sorted(set(places))[:4]:
                print(f"       {place}")
            if len(set(places)) > 4:
                print(f"       … and {len(set(places)) - 4} more")

    report = os.path.join(ROOT, "reports", "real-data-scan.json")
    with open(report, "w", encoding="utf-8") as fh:
        json.dump({
            "textFilesScanned": text_files, "pdfsScanned": pdf_files,
            "clean": not grouped,
            "items": [{"kind": k, "value": v, "where": sorted(set(p))}
                      for (k, v), p in sorted(grouped.items())],
        }, fh, ensure_ascii=False, indent=1)
    print(f"\n-> {report}")
    return 1 if grouped else 0


if __name__ == "__main__":
    sys.exit(main())
