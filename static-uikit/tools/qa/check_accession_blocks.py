"""Gate: the blocks manual review rejected cannot come back.

    python static-uikit/tools/qa/check_accession_blocks.py
    python static-uikit/tools/qa/check_accession_blocks.py --self-test

Reads the committed maps (maps.json) and the committed source PDFs, so every
number below is measured, not asserted.

The three blocks
----------------
signature transcript  One field, one baseline. It used to be mapped to the
                      46.71 pt between the printed parentheses with a
                      continuation line 25.6 pt lower, which split every real
                      name: "Соколов" inside the parentheses and "А.М." on its
                      own baseline below the signature rule, beside «М.П.».
                      This refuses any transcript with more than one region, a
                      region below the signature baseline, or a region that
                      reaches «Подпись» or «М.П.».

source date           The day/month/year print into a line the template already
                      set in TimesNewRomanPSMT 8.52 pt. Drawing them at the
                      generic 12 pt client size made them 41 % larger than the
                      printed quotes beside them. This refuses a date field set
                      above the source size + the floor's own tolerance, or set
                      differently from its two siblings.

internal page         «Должность», «ФИО» and «Подпись» belong to the Investica
                      officer who signs after printing. This refuses any field
                      whose geometry lands in the employee rows, and any field
                      bound to a client-data source inside them.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import fitz  # pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
PDF_DIR = os.path.join(ROOT, "static-uikit", "assets", "document-pdf-templates")

# Measured from the committed templates. Re-measure with tools/qa/probe helpers
# if a template is ever replaced; a stale number here fails loudly rather than
# silently passing.
FORMS = {
    "accession-application-fl": {
        "pdf": "accession-application-fl.pdf",
        "datePage": 1, "dateBaseline": 732.82, "sourceDateSize": 8.52,
        "dateFields": ["signDay", "signMonth", "signYear"],
        "signaturePage": 1, "signatureBaseline": 752.38,
        # «Подпись» baseline and «М.П.» baseline on the same page.
        "podpisBaseline": 762.22, "mpBaseline": 771.58, "mpLeft": 453.34,
        "internalPage": 2,
        # The employee half of the table: header row top .. table bottom.
        "employeeBand": (168.50, 211.34),
        # Rows that must be bound, and to what.
        "required": {
            "brokerageContractNumber": "field.extra-contract-number",
            "brokerageContractDate": "field.extra-contract-date",
            "depositoryContractNumber": "extra.extra-depository-contract",
            "depositoryContractDate": "extra.extra-depository-contract-date",
            "internalClientCode": "field.client-code",
        },
        # Value columns, so a cell cannot be mapped over a vertical rule.
        "columns": [(271.85, 405.43), (405.91, 542.97), (271.85, 542.97)],
    },
    "accession-application-yul": {
        "pdf": "accession-application-yul.pdf",
        "datePage": 1, "dateBaseline": 496.39, "sourceDateSize": 8.52,
        "dateFields": ["signDay", "signMonth", "signYear"],
        "signaturePage": 1, "signatureBaseline": 535.51,
        "podpisBaseline": 545.23, "mpBaseline": 554.59, "mpLeft": 446.14,
        "internalPage": 1,
        "employeeBand": (688.18, 731.02),
        "required": {
            "brokerageContractNumber": "field.extra-contract-number",
            "brokerageContractDate": "field.extra-contract-date",
            "depositoryContractNumber": "extra.extra-depository-contract",
            "depositoryContractDate": "extra.extra-depository-contract-date",
            "internalClientCode": "field.client-code",
        },
        "columns": [(268.73, 400.39), (400.87, 536.01), (268.73, 536.01)],
    },
}

# The account-opening notice: what the replaced template must and must not say.
# Taken verbatim from the supplied corrected PDF, including its straight quotes
# and doubled spaces around «в лице».
ACCOUNT_OPENING = {
    "pdf": "account-opening-notice.pdf",
    "sha256": "8e6a39227c5ec62d1d0cefea1b194d823e17065e82e6c382db174c37f48ca294",
    "mapId": "account-opening-notice",
    "required": [
        'Общество с ограниченной ответственностью "Инвестика",  в  лице '
        'Генерального Директора Козырева',
        'Козырева Александра Юрьевича',
        'действующего на основании Устава, настоящим извещает Клиента',
    ],
    # Checked against the whole document.
    "forbidden": [
        "Тестовое значение",       # a printed sample nobody replaced
        "Козырева Александра Юрьвеича",  # rejected patronymic transposition
        "Доверенности №",          # the superseded representative wording
    ],
    # Checked against the introduction paragraph only. The rest of the form is
    # full of legitimate blanks — the signature rules on page 2 among them.
    "forbiddenInIntro": ["____"],
    # A field mapped into the introduction paragraph would print the
    # representative a second time, over wording the template already prints.
    "introBand": (120.0, 170.0),
    "introPage": 0,
}

READABILITY_FLOOR = 9.0
# The source sets these lines at 8.52 pt and the floor is 9 pt, so 9 pt is the
# only size that is both legal and close. Anything larger is the generic
# client-value size creeping back in.
MAX_SOURCE_DATE_SIZE = READABILITY_FLOOR

# Sources that carry client data. None of them may be bound inside the employee
# rows — that is the whole point of leaving those cells blank.
CLIENT_SOURCE_PREFIXES = ("subject.", "field.", "umi.")


def regions_of(field: dict) -> list[dict]:
    """Every drawn region of a field: its own geometry, or its flow regions."""
    flow = field.get("flowRegions")
    if flow:
        return flow
    return [{"page": field.get("page"), "left": field.get("left"),
             "baselineTop": field.get("baselineTop"),
             "width": field.get("width")}]


def check_form(map_id: str, spec: dict, template: dict) -> list[str]:
    failures: list[str] = []
    fields = {f["id"]: f for f in template.get("fields", [])}

    # ── 1. Signature transcript: one field, one baseline ──────────────────────
    sig = fields.get("signatureName")
    if not sig:
        failures.append(f"{map_id}: no signatureName field")
    else:
        regions = regions_of(sig)
        if len(regions) != 1:
            failures.append(
                f"{map_id}/signatureName: {len(regions)} regions — the "
                "transcript must be one field on one baseline")
        for region in regions:
            base = region.get("baselineTop")
            if base is None:
                continue
            if base > spec["signatureBaseline"] + 0.01:
                failures.append(
                    f"{map_id}/signatureName: region baseline {base} is below "
                    f"the signature line ({spec['signatureBaseline']})")
            if base >= spec["podpisBaseline"] - 0.01:
                failures.append(
                    f"{map_id}/signatureName: region baseline {base} collides "
                    f"with «Подпись» ({spec['podpisBaseline']})")
        # A silent shortening dressed up as a fallback.
        if "surname" in (sig.get("fallbacks") or []):
            failures.append(
                f"{map_id}/signatureName: `surname` fallback drops the "
                "initials — the transcript must not be shortened silently")
        size = sig.get("fontSize")
        if size is not None and size < READABILITY_FLOOR:
            failures.append(
                f"{map_id}/signatureName: {size} pt is below the {READABILITY_FLOOR} pt floor")

    # ── 2. Source-date typography ─────────────────────────────────────────────
    sizes = set()
    for field_id in spec["dateFields"]:
        field = fields.get(field_id)
        if not field:
            failures.append(f"{map_id}: no {field_id} field")
            continue
        size = field.get("fontSize")
        sizes.add(size)
        if size is None or size > MAX_SOURCE_DATE_SIZE + 0.001:
            failures.append(
                f"{map_id}/{field_id}: {size} pt — the form prints this line "
                f"at {spec['sourceDateSize']} pt, so the generic client size "
                "must not be used here")
        if size is not None and size < READABILITY_FLOOR:
            failures.append(
                f"{map_id}/{field_id}: {size} pt is below the floor")
        if field.get("baselineTop") != spec["dateBaseline"]:
            failures.append(
                f"{map_id}/{field_id}: baseline {field.get('baselineTop')} "
                f"!= measured {spec['dateBaseline']}")
    if len(sizes) > 1:
        failures.append(
            f"{map_id}: the day, month and year are set in {len(sizes)} "
            f"different sizes {sorted(sizes)} — they are one printed line")

    # ── 3. Internal page: employee cells stay blank ───────────────────────────
    top, bottom = spec["employeeBand"]
    for field in template.get("fields", []):
        for region in regions_of(field):
            if region.get("page") != spec["internalPage"]:
                continue
            base = region.get("baselineTop")
            if base is None:
                continue
            if top <= base <= bottom:
                failures.append(
                    f"{map_id}/{field['id']}: baseline {base} is inside the "
                    f"employee rows ({top}..{bottom}); Должность, ФИО and "
                    "Подпись must stay blank")

    # ── 4. Internal page: the rows that must be bound, and stay in their cell ─
    for field_id, expected_source in spec["required"].items():
        field = fields.get(field_id)
        if not field:
            failures.append(f"{map_id}: internal-page field {field_id} is missing")
            continue
        if field.get("source") != expected_source:
            failures.append(
                f"{map_id}/{field_id}: source {field.get('source')!r} "
                f"!= {expected_source!r}")
        if field.get("page") != spec["internalPage"]:
            failures.append(
                f"{map_id}/{field_id}: page {field.get('page')} "
                f"!= {spec['internalPage']}")
        left = field.get("left")
        width = field.get("width")
        if left is None or width is None:
            continue
        right = left + width
        if not any(c_left <= left and right <= c_right
                   for c_left, c_right in spec["columns"]):
            failures.append(
                f"{map_id}/{field_id}: [{left:.2f}, {right:.2f}] is not inside "
                "any value column — it would cross a vertical rule")
        size = field.get("fontSize")
        if size is not None and size < READABILITY_FLOOR:
            failures.append(f"{map_id}/{field_id}: {size} pt is below the floor")

    return failures


def check_pdf_unchanged(spec: dict) -> list[str]:
    """The measurements above are only true of the committed template."""
    path = os.path.join(PDF_DIR, spec["pdf"])
    doc = fitz.open(path)
    page = doc[spec["signaturePage"]]
    found = False
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                if abs(span["origin"][1] - spec["dateBaseline"]) < 0.05 and \
                        "20" in span["text"]:
                    found = True
                    if abs(span["size"] - spec["sourceDateSize"]) > 0.01:
                        doc.close()
                        return [f"{spec['pdf']}: the date line now prints at "
                                f"{span['size']} pt, not {spec['sourceDateSize']} pt "
                                "— re-measure the map"]
    doc.close()
    if not found:
        return [f"{spec['pdf']}: no printed date line at baseline "
                f"{spec['dateBaseline']} — re-measure the map"]
    return []


def check_account_opening(maps: dict) -> tuple[int, list[str]]:
    """The replaced template still says exactly what it was replaced to say."""
    failures: list[str] = []
    checks = 0
    spec = ACCOUNT_OPENING
    path = os.path.join(PDF_DIR, spec["pdf"])

    checks += 1
    with open(path, "rb") as fh:
        import hashlib
        digest = hashlib.sha256(fh.read()).hexdigest()
    if digest != spec["sha256"]:
        failures.append(
            f"{spec['pdf']}: sha256 {digest} != the reviewed replacement "
            f"{spec['sha256']}")

    doc = fitz.open(path)
    text = " ".join(" ".join(page.get_text().split()) for page in doc)
    doc.close()

    for phrase in spec["required"]:
        checks += 1
        count = text.count(" ".join(phrase.split()))
        if count != 1:
            failures.append(
                f"{spec['pdf']}: expected exactly one {phrase[:48]!r}, found {count}")
    for phrase in spec["forbidden"]:
        checks += 1
        if phrase in text:
            failures.append(f"{spec['pdf']}: still contains {phrase!r}")

    intro_start = text.find("Общество с ограниченной")
    intro_end = text.find("1. Информация о клиенте")
    checks += 1
    if intro_start == -1 or intro_end == -1 or intro_end <= intro_start:
        failures.append(f"{spec['pdf']}: introduction paragraph not found")
    else:
        intro = text[intro_start:intro_end]
        for phrase in spec["forbiddenInIntro"]:
            checks += 1
            if phrase in intro:
                failures.append(
                    f"{spec['pdf']}: the introduction still has a blank "
                    f"({phrase!r}) — the representative must be printed, not filled")

    template = maps.get(spec["mapId"]) or {}
    top, bottom = spec["introBand"]
    for field in template.get("fields", []):
        for region in regions_of(field):
            if region.get("page") != spec["introPage"]:
                continue
            base = region.get("baselineTop")
            checks += 1
            if base is not None and top <= base <= bottom:
                failures.append(
                    f"{spec['mapId']}/{field['id']}: baseline {base} is inside "
                    "the introduction the template now prints itself — it would "
                    "print the representative twice")
    for block in template.get("wordFlowBlocks", []) or []:
        if block.get("page") != spec["introPage"]:
            continue
        frame = block.get("frame") or {}
        base = frame.get("baselineTop")
        checks += 1
        if base is not None and top <= base <= bottom:
            failures.append(
                f"{spec['mapId']}/{block.get('id')}: a Word-flow block still "
                "replaces the introduction paragraph")
    return checks, failures


def run(maps: dict) -> tuple[int, list[str]]:
    failures: list[str] = []
    checks = 0
    for map_id, spec in FORMS.items():
        template = maps.get(map_id)
        if not template:
            failures.append(f"{map_id}: not in maps.json")
            continue
        checks += 1
        failures.extend(check_pdf_unchanged(spec))
        result = check_form(map_id, spec, template)
        # Every assertion above is one check; count them so the summary is real.
        checks += 4 + len(spec["required"]) + len(spec["dateFields"])
        failures.extend(result)

    extra_checks, extra_failures = check_account_opening(maps)
    checks += extra_checks
    failures.extend(extra_failures)
    return checks, failures


def self_test(maps: dict) -> int:
    """Each mutation below is a defect manual review actually found."""
    cases = []

    split = json.loads(json.dumps(maps))
    sig = next(f for f in split["accession-application-fl"]["fields"]
               if f["id"] == "signatureName")
    sig["flowRegions"] = [
        {"page": 1, "left": 400.3, "baselineTop": 752.38, "width": 46.7},
        {"page": 1, "left": 400.3, "baselineTop": 778.0, "width": 46.7}]
    cases.append(("transcript split below the signature line", split))

    big = json.loads(json.dumps(maps))
    next(f for f in big["accession-application-fl"]["fields"]
         if f["id"] == "signDay")["fontSize"] = 12
    cases.append(("date drawn at the generic client size", big))

    mixed = json.loads(json.dumps(maps))
    next(f for f in mixed["accession-application-yul"]["fields"]
         if f["id"] == "signMonth")["fontSize"] = 8.5
    cases.append(("day/month/year set in different sizes", mixed))

    employee = json.loads(json.dumps(maps))
    employee["accession-application-fl"]["fields"].append({
        "id": "officerName", "source": "field.clientFullName",
        "page": 2, "left": 300.0, "baselineTop": 198.74, "width": 100.0})
    cases.append(("client data bound into the employee row", employee))

    crossing = json.loads(json.dumps(maps))
    next(f for f in crossing["accession-application-fl"]["fields"]
         if f["id"] == "internalClientCode")["width"] = 400
    cases.append(("internal cell crossing a vertical rule", crossing))

    shortened = json.loads(json.dumps(maps))
    next(f for f in shortened["accession-application-yul"]["fields"]
         if f["id"] == "signatureName")["fallbacks"] = ["surname"]
    cases.append(("transcript silently shortened to the surname", shortened))

    passed = 0
    for label, mutated in cases:
        _, fails = run(mutated)
        if fails:
            passed += 1
        else:
            print(f"  NOT CAUGHT: {label}")

    ok = passed == len(cases)
    print(f"Accession blocks self-test: {'PASS' if ok else 'FAIL'} · "
          f"{passed}/{len(cases)} negative gates ("
          + ", ".join(label for label, _ in cases) + ")")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--maps", default=os.path.join(HERE, "maps.json"))
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    with open(args.maps, encoding="utf-8") as fh:
        maps = json.load(fh)

    if args.self_test:
        return self_test(maps)

    checks, failures = run(maps)
    for failure in failures:
        print(f"  FAIL {failure}")
    print(f"Manual-review blocks: {checks - len(failures)}/{checks} checks "
          f"passed ({len(FORMS)} accession forms: transcript, source date, "
          "internal page; plus the replaced account-opening notice)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
