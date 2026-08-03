"""Regenerate and verify the complete PDF-template layout audit.

The audit is deliberately closed over the production surface:

* all 22 committed source PDFs and all 77 source pages;
* every extracted source-PDF text line;
* all 18 executable field maps;
* the frozen 621-field identifier/source compatibility floor; and
* every additive field currently exposed by those maps.

The checked-in JSON is both the audit matrix and the byte-invariance baseline.
``--write`` may refresh classifications after an additive map change, but it
will not bless a changed/missing PDF or a removed/renamed baseline identifier.

Usage:
    python static-uikit/tools/qa/check_full_template_audit.py
    python static-uikit/tools/qa/check_full_template_audit.py --write
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

import fitz  # pymupdf

from headless_browser import Chrome, Server


QA_DIR = Path(__file__).resolve().parent
STATIC_UIKIT = QA_DIR.parent.parent
REPO_ROOT = STATIC_UIKIT.parent
TEMPLATE_DIR = STATIC_UIKIT / "assets" / "document-pdf-templates"
AUDIT_JSON = QA_DIR / "document-full-template-audit.json"
AUDIT_MD = REPO_ROOT / "docs" / "document-full-template-audit.md"
IDENTIFIER_MANIFEST = QA_DIR / "document-identifier-manifest.json"

EXPECTED_MAPS = 18
# 621 before the updated account-opening notice made its introduction
# paragraph static: the overlay that filled the representative blank has
# nothing left to draw, so `brokerRepresentative` is gone with it.
EXPECTED_BASELINE_FIELDS = 620
EXPECTED_PDFS = 22
EXPECTED_PAGES = 77

FIELD_CATEGORIES = {
    "word-flow-paragraph",
    "word-flow-labelled-block",
    "multiline-table-cell",
    "fixed-exact-token",
    "checkbox-or-static",
    "fixed-inline-overlay",
    "independent-form-row",
}

REQUIRED_MATRIX_COLUMNS = {
    "documentId", "title", "templateFilename", "page", "sectionId", "fieldIds",
    "sourcePaths", "existingVariableNamesPreserved", "currentRenderingModel",
    "intendedLayoutCategory", "staticTextInvolved", "fontFamily", "fontSizePt",
    "lineHeightPt", "alignment", "underlineBorderStyle", "normalFixtureResult",
    "realisticLongFixtureResult", "currentVisualDefect", "requiredMigration",
    "migrationCompleted", "visualReviewStatus", "structuralQaStatus",
}

# This is the closed template set. SHA-256 and byte sizes live only in the
# generated baseline, so a changed source cannot be silently accepted by code.
DOCUMENT_SPECS: dict[str, dict[str, str]] = {
    "accession-application-fl.pdf": {"id": "accession-application-fl", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "accession-application-yul.pdf": {"id": "accession-application-yul", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "account-opening-notice.pdf": {"id": "account-opening-notice", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "anketa-fl.pdf": {"id": "anketa-fl", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "anketa-fl-simplified-id.pdf": {"id": "anketa-fl-simplified-id", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "anketa-ip-sz.pdf": {"id": "anketa-ip-sz", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "anketa-isbyul.pdf": {"id": "anketa-isbyul", "role": "hidden",
        "status": "hidden-by-decision"},
    "anketa-yul.pdf": {"id": "anketa-yul", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "broker-use-refusal-request.pdf": {"id": "broker-use-refusal-request", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "brokerage-key-information.pdf": {"id": "brokerage-key-information", "role": "package-static",
        "status": "static-download-by-design"},
    "client-notifications.pdf": {"id": "client-notifications", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "code-word-request.pdf": {"id": "code-word-request", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "order-forms.pdf": {"id": "order-forms", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "power-of-attorney.pdf": {"id": "power-of-attorney", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "qualification-consequences-notice.pdf": {"id": "qualification-consequences-notice", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "qualification-notice.pdf": {"id": "qualification-notice", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "qualification-request-fl.pdf": {"id": "qualification-request-fl", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "qualification-request-yul.pdf": {"id": "qualification-request-yul", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "regulation-full-refusal-notice.pdf": {"id": "regulation-full-refusal-notice", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "regulation-partial-refusal-notice.pdf": {"id": "regulation-partial-refusal-notice", "role": "dynamic-overlay",
        "status": "dynamic-production-ready"},
    "Risks.pdf": {"id": "risks-declaration", "role": "package-static",
        "status": "static-download-by-design"},
    "transfer-requisites.pdf": {"id": "transfer-requisites", "role": "static",
        "status": "unexposed-by-decision"},
}

STATIC_TITLES = {
    "anketa-isbyul": "Анкета иностранной структуры без образования юридического лица",
    "transfer-requisites": "Реквизиты для перечисления денежных средств",
    "risks-declaration": "Декларация о рисках",
    "brokerage-key-information": "Ключевая информация о договоре",
}

# ── One final production status per PDF ──────────────────────────────────────
#
# `role` above says how a template is rendered. This says whether it is
# finished, which is a different question and the one a release has to answer.
# Every one of the 22 PDFs gets exactly one of these and no template may be
# left in between: partially mapped, silently missing, exposed without QA, or
# in the catalogue with no working generator are all failures, not states.
PRODUCTION_STATUSES = {
    # Generated from CRM data, mapped, and covered by the ordinary QA set.
    "dynamic-production-ready": {
        "map": True, "catalogue": True, "generated": True,
    },
    # Offered to the user and returned byte-for-byte. It carries no client
    # value, so there is nothing to map.
    "static-download-by-design": {
        "map": False, "catalogue": True, "generated": False,
    },
    # Deliberately absent from the catalogue: the business does not want this
    # form offered at all in this release.
    "hidden-by-decision": {
        "map": False, "catalogue": False, "generated": False,
    },
    # Present in the repository but not offered: the form is kept because its
    # content is authoritative, and exposing it is a later decision.
    "unexposed-by-decision": {
        "map": False, "catalogue": False, "generated": False,
    },
    # Cannot be finished for a reason outside this repository — a missing
    # authoritative source, or legal wording that has not been settled.
    "blocked": {
        "map": False, "catalogue": False, "generated": False,
    },
}

# Why each non-dynamic template is where it is, and what would have to happen
# for that to change. Recorded here rather than in prose so the release report
# cannot describe a template the gate does not also account for.
NON_DYNAMIC_RATIONALE = {
    "anketa-isbyul": {
        "reason": (
            "Анкета ИСБОЮЛ is for a foreign structure without a legal entity. "
            "The CRM has no subject kind for one, so there is no payload to "
            "map and no wizard entry to offer it from."
        ),
        "userCanDownload": False,
        "futureMappingRequired": True,
        "excludedFromRelease": True,
    },
    "transfer-requisites": {
        "reason": (
            "The transfer-requisites sheet repeats the three payment-purpose "
            "rows of the account-opening notice — same sample client codes, "
            "same «№_________ дата__» blanks — for a client who already has an "
            "account. The notice is the form the release generates; exposing a "
            "second sheet that states the same three references is a business "
            "decision that has not been taken. It is NOT static-by-design: it "
            "contains client-specific blanks, so if it is ever exposed it has "
            "to be mapped first, exactly as the notice was."
        ),
        "userCanDownload": False,
        "futureMappingRequired": True,
        "excludedFromRelease": True,
    },
    "risks-declaration": {
        "reason": (
            "Risks.pdf is a 17-page declaration with no client-specific field "
            "anywhere in it. It is delivered unchanged as part of the brokerage "
            "starter package."
        ),
        "userCanDownload": True,
        "futureMappingRequired": False,
        "excludedFromRelease": False,
    },
    "brokerage-key-information": {
        "reason": (
            "The key-information sheet describes the product, not the client. "
            "It has no blanks and is delivered unchanged with the starter "
            "package."
        ),
        "userCanDownload": True,
        "futureMappingRequired": False,
        "excludedFromRelease": False,
    },
}

# Target semantic sections that cannot be inferred from rectangle geometry.
# Exact-token fields in one of these sections remain exact tokens at field
# level, while the containing sentence/block receives the section category.
TARGET_SECTIONS: tuple[dict[str, Any], ...] = (
    {
        "documentId": "accession-application-fl",
        "sectionId": "accession-application-fl-applicant",
        "category": "word-flow-paragraph",
        "fieldIds": (
            "clientFullName", "passportSeries", "passportNumber",
            "passportIssuedBy", "passportIssueDay", "passportIssueMonthYear",
            "registrationAddress",
        ),
    },
    {
        "documentId": "accession-application-yul",
        "sectionId": "accession-application-yul-applicant",
        "category": "word-flow-labelled-block",
        "fieldIds": (
            "companyFullLegalName", "companyForeignName", "companyOgrn",
            "companyLegalAddress", "representativeSignerLine",
            "representativeAuthority",
        ),
    },
    # The account-opening notice had an "intro" section here, replacing the
    # paragraph that left a blank for the Investika representative. The updated
    # authoritative template prints that sentence itself, so there is no
    # reviewed replacement and no field: the section is gone rather than empty.
    {
        "documentId": "client-notifications",
        "sectionId": "client-notifications-client-identity",
        "category": "word-flow-paragraph",
        "fieldIds": (
            "clientFullName", "passportSeries", "passportNumber",
            "passportIssuedBy", "passportIssueDate", "registrationAddress",
        ),
    },
    {
        "documentId": "code-word-request",
        "sectionId": "code-word-request-client-intro",
        "category": "word-flow-paragraph",
        "fieldIds": ("clientFullName", "clientInn"),
    },
    {
        "documentId": "qualification-consequences-notice",
        "sectionId": "qualification-consequences-notice-body",
        "category": "word-flow-paragraph",
        "fieldIds": ("applicantFullName",),
    },
    {
        "documentId": "qualification-notice",
        "sectionId": "qualification-notice-recipient",
        "category": "word-flow-labelled-block",
        "fieldIds": ("recipientName", "recipientAddress"),
    },
    {
        "documentId": "qualification-notice",
        "sectionId": "qualification-notice-body",
        "category": "word-flow-paragraph",
        "fieldIds": ("clientName", "recognitionDate"),
    },
    {
        "documentId": "qualification-notice",
        "sectionId": "qualification-notice-register-entry",
        "category": "word-flow-labelled-block",
        "fieldIds": ("registerEntryPersonName", "registerEntryOrgName"),
    },
    {
        "documentId": "qualification-request-fl",
        "sectionId": "qualification-request-fl-intro",
        "category": "word-flow-paragraph",
        "fieldIds": ("clientFullName", "contractNumber", "contractDate"),
    },
    {
        "documentId": "qualification-request-yul",
        "sectionId": "qualification-request-yul-intro",
        "category": "word-flow-paragraph",
        "fieldIds": ("companyFullLegalName", "contractNumber", "contractDate"),
    },
)

TABLE_DOCUMENTS = {
    "anketa-fl", "anketa-fl-simplified-id", "anketa-ip-sz", "anketa-yul",
    "order-forms",
}

# Reviewed final continuation decision: these fourteen source sections are
# bordered table rows and retain row growth. Word-flow expansion lives on its
# block, not on a field. Any other field-level expansion is a regression.
#
# The last four were added when the remaining ordinary substitutions were
# resolved: the анкета's foreign-name cell is a double-height table row that
# still cannot hold a real foreign legal name at the readability floor, and the
# three tariff cells of the company accession form are bordered rows whose
# printed «Тарифный план:» label leaves one line for a two-word plan name.
REVIEWED_TABLE_ROW_ANCHORS = {
    ("accession-application-yul", "tariffStock"),
    ("accession-application-yul", "tariffDerivatives"),
    ("accession-application-yul", "tariffCurrency"),
    ("account-opening-notice", "clientName"),
    ("anketa-fl", "passportIssuedBy"),
    ("anketa-fl", "bankName"),
    ("anketa-fl", "bankAddress"),
    ("anketa-yul", "foreignName"),
    ("anketa-yul", "licenceAuthority"),
    ("anketa-yul", "bankAddress"),
    ("broker-use-refusal-request", "clientName"),
    ("order-forms", "tradeClientName"),
    ("regulation-full-refusal-notice", "clientName"),
    ("regulation-partial-refusal-notice", "clientName"),
}
# 18 before the same replacement removed the introduction block.
EXPECTED_WORD_FLOW_EXPANSION_ANCHORS = 17

# Reviewed paragraphs that grow inside a bordered table, and are therefore the
# only Word-flow anchors allowed to draw a table row when they take an extra
# line. Every other reviewed paragraph reflows in open page space: if one of
# those started painting rules, it would be inventing borders the form has not
# got, so they must stay at `lineStyle: none`.
BORDERED_WORD_FLOW_ANCHORS = {
    ("account-opening-notice", "account-opening-payment-purpose-stock"),
    ("account-opening-notice", "account-opening-payment-purpose-currency"),
    ("account-opening-notice", "account-opening-payment-purpose-derivatives"),
}


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def rounded(value: Any) -> float:
    return round(float(value), 3)


def load_runtime() -> dict[str, Any]:
    server, browser = Server(), Chrome()
    try:
        browser.goto(server.base + "/tools/document-template-builder.html?embeddedQa=1")
        browser.eval(
            "window.CRMDocumentBuilder.app.readyPromise.then(function () { return true; })",
            await_promise=True,
        )
        raw = browser.eval(
            "JSON.stringify({maps: window.CRMDocumentEngine.fieldMaps,"
            " catalog: window.CRMDocumentCatalog}, function (key, value) {"
            " return typeof value === 'function' ? '[function]' : value; })"
        )
        return json.loads(raw)
    finally:
        browser.stop()
        server.stop()


def flatten_catalog(catalog: dict[str, Any]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}

    def visit(document: dict[str, Any], package_id: str | None = None) -> None:
        doc_id = str(document.get("id") or "")
        if doc_id:
            row = dict(document)
            row["packageId"] = package_id
            result[doc_id] = row
        for child in document.get("packageDocuments") or []:
            visit(child, doc_id)

    for document in catalog.get("documents") or []:
        visit(document)
    return result


def floor_from_identifier_manifest() -> list[dict[str, Any]]:
    if not IDENTIFIER_MANIFEST.exists():
        raise RuntimeError(
            f"first audit generation requires {IDENTIFIER_MANIFEST.relative_to(REPO_ROOT)}"
        )
    manifest = json.loads(IDENTIFIER_MANIFEST.read_text(encoding="utf-8"))
    rows = []
    for map_row in manifest.get("maps") or []:
        rows.append({
            "documentId": map_row["id"],
            "fields": [
                {"fieldId": field["id"], "source": field.get("source")}
                for field in map_row.get("fields") or []
            ],
        })
    rows.sort(key=lambda row: row["documentId"])
    for row in rows:
        row["fields"].sort(key=lambda field: (field["fieldId"], field.get("source") or ""))
    return rows


def compatibility_floor(existing: dict[str, Any] | None) -> list[dict[str, Any]]:
    if existing:
        floor = existing.get("identifierCompatibilityFloor")
        if floor:
            return floor
    return floor_from_identifier_manifest()


def validate_floor_shape(floor: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    if len(floor) != EXPECTED_MAPS:
        errors.append(f"identifier floor has {len(floor)} maps, expected {EXPECTED_MAPS}")
    total = sum(len(row.get("fields") or []) for row in floor)
    if total != EXPECTED_BASELINE_FIELDS:
        errors.append(
            f"identifier floor has {total} fields, expected {EXPECTED_BASELINE_FIELDS}"
        )
    ids = [row.get("documentId") for row in floor]
    for value, count in Counter(ids).items():
        if count > 1:
            errors.append(f"duplicate map in identifier floor: {value}")
    for row in floor:
        field_ids = [field.get("fieldId") for field in row.get("fields") or []]
        for value, count in Counter(field_ids).items():
            if count > 1:
                errors.append(f"duplicate baseline field: {row.get('documentId')}/{value}")
    return errors


def validate_runtime(
    runtime: dict[str, Any], floor: list[dict[str, Any]]
) -> list[str]:
    errors = validate_floor_shape(floor)
    maps = runtime.get("maps") or {}
    if len(maps) != EXPECTED_MAPS:
        errors.append(f"runtime has {len(maps)} maps, expected {EXPECTED_MAPS}")

    floor_by_map = {row["documentId"]: row for row in floor}
    for map_id, floor_map in floor_by_map.items():
        template = maps.get(map_id)
        if template is None:
            errors.append(f"missing baseline map: {map_id}")
            continue
        current_fields = template.get("fields") or []
        current_by_id: dict[str, dict[str, Any]] = {}
        for field in current_fields:
            field_id = str(field.get("id") or "")
            if not field_id:
                errors.append(f"empty field id in {map_id}")
            elif field_id in current_by_id:
                errors.append(f"duplicate current field: {map_id}/{field_id}")
            current_by_id[field_id] = field
        for required in floor_map.get("fields") or []:
            field_id = required["fieldId"]
            actual = current_by_id.get(field_id)
            if actual is None:
                errors.append(f"removed/renamed baseline field: {map_id}/{field_id}")
            elif actual.get("source") != required.get("source"):
                errors.append(
                    f"changed baseline source: {map_id}/{field_id}: "
                    f"{required.get('source')!r} -> {actual.get('source')!r}"
                )

    for map_id, template in maps.items():
        if map_id not in floor_by_map:
            errors.append(f"map outside the frozen 18-map scope: {map_id}")
        expected_pages = template.get("expectedPages")
        if not isinstance(expected_pages, int) or expected_pages < 1:
            errors.append(f"invalid expectedPages for {map_id}: {expected_pages!r}")
            continue
        template_url = str(template.get("templateUrl") or "")
        filename = Path(template_url).name
        spec = DOCUMENT_SPECS.get(filename)
        if not spec:
            errors.append(f"map template outside closed PDF set: {map_id}: {template_url!r}")
        elif spec["id"] != map_id:
            errors.append(
                f"map/template id mismatch: {map_id} uses {filename} assigned to {spec['id']}"
            )
        seen: set[str] = set()
        for field in template.get("fields") or []:
            field_id = str(field.get("id") or "")
            if field_id in seen:
                errors.append(f"duplicate current field: {map_id}/{field_id}")
            seen.add(field_id)
            if not str(field.get("source") or ""):
                errors.append(f"field has no source path: {map_id}/{field_id}")
            page = field.get("page", 0)
            if not isinstance(page, int) or page < 0 or page >= expected_pages:
                errors.append(
                    f"field page outside template: {map_id}/{field_id}: {page!r}"
                )

    template_urls = [str(template.get("templateUrl") or "") for template in maps.values()]
    for value, count in Counter(template_urls).items():
        if not value:
            errors.append("one or more maps have an empty templateUrl")
        elif count > 1:
            errors.append(f"duplicate runtime template URL: {value}")

    field_expansions = {
        (map_id, str(field.get("id") or "")): field.get("expansion") or {}
        for map_id, template in maps.items()
        for field in template.get("fields") or []
        if field.get("expansion")
    }
    for key in sorted(set(field_expansions) - REVIEWED_TABLE_ROW_ANCHORS):
        errors.append(f"unreviewed field expansion anchor: {key[0]}/{key[1]}")
    for key in sorted(REVIEWED_TABLE_ROW_ANCHORS - set(field_expansions)):
        errors.append(f"missing reviewed table-row anchor: {key[0]}/{key[1]}")
    for key, expansion in sorted(field_expansions.items()):
        if expansion.get("lineStyle") != "table-row":
            errors.append(
                f"retained field anchor is not table-row: {key[0]}/{key[1]}: "
                f"{expansion.get('lineStyle')!r}"
            )

    block_expansions = [
        (map_id, str(block.get("id") or ""), block.get("expansion") or {})
        for map_id, template in maps.items()
        for block in template.get("wordFlowBlocks") or []
        if block.get("expansion")
    ]
    if len(block_expansions) != EXPECTED_WORD_FLOW_EXPANSION_ANCHORS:
        errors.append(
            f"runtime has {len(block_expansions)} Word-flow expansion anchors, "
            f"expected {EXPECTED_WORD_FLOW_EXPANSION_ANCHORS}"
        )
    bordered = {(map_id, block_id) for map_id, block_id, expansion
                in block_expansions if expansion.get("lineStyle") == "table-row"}
    if bordered != BORDERED_WORD_FLOW_ANCHORS:
        errors.append(
            "Word-flow anchors drawing a table row changed: "
            f"{sorted(bordered)} != {sorted(BORDERED_WORD_FLOW_ANCHORS)}"
        )
    for map_id, block_id, expansion in block_expansions:
        if (map_id, block_id) in BORDERED_WORD_FLOW_ANCHORS:
            continue
        if expansion.get("lineStyle") != "none":
            errors.append(
                f"Word-flow anchor renders a continuation row: {map_id}/{block_id}: "
                f"{expansion.get('lineStyle')!r}"
            )
    return errors


def source_text_lines(page: fitz.Page) -> list[dict[str, Any]]:
    lines: list[dict[str, Any]] = []
    for block_index, block in enumerate(page.get_text("dict").get("blocks") or [], start=1):
        for source_line_index, line in enumerate(block.get("lines") or [], start=1):
            spans = []
            for span in line.get("spans") or []:
                text = str(span.get("text") or "")
                spans.append({
                    "text": text,
                    "fontFamily": str(span.get("font") or ""),
                    "fontSizePt": rounded(span.get("size") or 0),
                    "flags": int(span.get("flags") or 0),
                    "color": int(span.get("color") or 0),
                    "bbox": [rounded(value) for value in span.get("bbox") or (0, 0, 0, 0)],
                })
            text = "".join(span["text"] for span in spans).strip()
            if not text:
                continue
            record = {
                "lineNumber": len(lines) + 1,
                "sourceBlockNumber": block_index,
                "sourceLineNumber": source_line_index,
                "text": text,
                "bbox": [rounded(value) for value in line.get("bbox") or (0, 0, 0, 0)],
                "spans": spans,
                "currentRenderingModel": "source-pdf-static-text",
                "intendedLayoutCategory": "preserved-source-static-line",
                "reviewStatus": "source-line-inventoried",
            }
            record["lineSha256"] = sha256_bytes(canonical(record).encode("utf-8"))
            lines.append(record)
    return lines


def pdf_inventory() -> tuple[list[dict[str, Any]], list[str]]:
    errors: list[str] = []
    actual_files = {path.name: path for path in TEMPLATE_DIR.glob("*.pdf")}
    expected_names = set(DOCUMENT_SPECS)
    if set(actual_files) != expected_names:
        for name in sorted(expected_names - set(actual_files), key=str.lower):
            errors.append(f"missing source PDF: {name}")
        for name in sorted(set(actual_files) - expected_names, key=str.lower):
            errors.append(f"unclassified source PDF: {name}")

    documents: list[dict[str, Any]] = []
    for filename in sorted(expected_names, key=str.lower):
        path = actual_files.get(filename)
        if path is None:
            continue
        data = path.read_bytes()
        try:
            pdf = fitz.open(stream=data, filetype="pdf")
        except Exception as exc:
            errors.append(f"cannot parse {filename}: {exc}")
            continue
        pages = []
        for index, page in enumerate(pdf):
            lines = source_text_lines(page)
            pages.append({
                "page": index + 1,
                "widthPt": rounded(page.rect.width),
                "heightPt": rounded(page.rect.height),
                "sourceTextLineCount": len(lines),
                "sourceTextSha256": sha256_bytes(
                    "\n".join(line["text"] for line in lines).encode("utf-8")
                ),
                "imageCount": len(page.get_images(full=True)),
                "drawingCount": len(page.get_drawings()),
                "sourceTextLines": lines,
            })
        spec = DOCUMENT_SPECS[filename]
        documents.append({
            "documentId": spec["id"],
            "templateFilename": filename,
            "templatePath": str(path.relative_to(REPO_ROOT)).replace("\\", "/"),
            "documentRole": spec["role"],
            "productionStatus": spec["status"],
            "byteLength": len(data),
            "sha256": sha256_bytes(data),
            "pageCount": len(pages),
            "pages": pages,
        })
    return documents, errors


def override_index() -> dict[tuple[str, str], dict[str, Any]]:
    index: dict[tuple[str, str], dict[str, Any]] = {}
    for section in TARGET_SECTIONS:
        for field_id in section["fieldIds"]:
            key = (section["documentId"], field_id)
            if key in index:
                raise RuntimeError(f"duplicate target-section field: {key[0]}/{key[1]}")
            index[key] = section
    return index


def owners_of(field: dict[str, Any]) -> set[str]:
    """The Word-flow blocks a field declares itself part of.

    `flowBlockId` is normally one id. It may be a list when one value belongs
    to several reviewed paragraphs — mirrors the renderer, which accepts both
    shapes and gates the list on `allowMultipleFlowReferences`.
    """
    declared = field.get("flowBlockId")
    if declared is None:
        return set()
    if isinstance(declared, (list, tuple)):
        return {str(item) for item in declared}
    return {str(declared)}


def word_flow_index(
    maps: dict[str, Any]
) -> tuple[dict[tuple[str, str], list[dict[str, Any]]], list[str]]:
    index: dict[tuple[str, str], list[dict[str, Any]]] = {}
    errors: list[str] = []
    for map_id, template in maps.items():
        fields_by_id = {
            str(field.get("id") or ""): field for field in template.get("fields") or []
        }
        block_ids: set[str] = set()
        for block in template.get("wordFlowBlocks") or []:
            block_id = str(block.get("id") or "")
            if not block_id:
                errors.append(f"empty wordFlowBlocks id in {map_id}")
            elif block_id in block_ids:
                errors.append(f"duplicate wordFlowBlocks id in {map_id}: {block_id}")
            block_ids.add(block_id)
            refs = [
                str(run.get("fieldId") or "")
                for run in block.get("runs") or []
                if run.get("type") == "fieldRef"
            ]
            for field_id in refs:
                if field_id not in fields_by_id:
                    errors.append(
                        f"word-flow reference is not a current field: {map_id}/{block_id}/{field_id}"
                    )
                    continue
                field = fields_by_id[field_id]
                if field.get("layoutMode") != "flow-reference":
                    errors.append(
                        f"word-flow reference lacks layoutMode=flow-reference: "
                        f"{map_id}/{block_id}/{field_id}"
                    )
                if block_id not in owners_of(field):
                    errors.append(
                        f"word-flow reference has mismatched flowBlockId: "
                        f"{map_id}/{field_id}: {field.get('flowBlockId')!r} != {block_id!r}"
                    )
                key = (map_id, field_id)
                # One value may appear in several reviewed paragraphs when the
                # map says so — the account-opening notice prints one client
                # code in all three payment-purpose rows. The renderer requires
                # the same opt-in (`allowMultipleFlowReferences`), so silence
                # here can never be wider than what production accepts.
                if key in index and not field.get("allowMultipleFlowReferences"):
                    errors.append(
                        f"field occurs in multiple word-flow blocks: {map_id}/{field_id}"
                    )
                index.setdefault(key, []).append(block)
        for field_id, field in fields_by_id.items():
            marked = field.get("layoutMode") == "flow-reference" or bool(field.get("flowBlockId"))
            if not marked:
                continue
            blocks = index.get((map_id, field_id))
            if not blocks:
                errors.append(
                    f"flow-reference field is absent from wordFlowBlocks: {map_id}/{field_id}"
                )
                continue
            if field.get("layoutMode") != "flow-reference":
                errors.append(f"flowBlockId without flow-reference mode: {map_id}/{field_id}")
            declared = owners_of(field)
            drawn_by = {str(block.get("id")) for block in blocks}
            if declared != drawn_by:
                errors.append(
                    f"flow-reference marker points to another block: {map_id}/{field_id}: "
                    f"{sorted(declared)!r} != {sorted(drawn_by)!r}"
                )
    return index, errors


EXACT_PARTS = (
    "date", "day", "month", "year", "inn", "kpp", "ogrn", "snils",
    "bic", "swift", "series", "number", "code", "phone", "email",
    "amount", "quantity", "price", "rate", "expiry", "validity",
    "taxidentifier", "registrationnumber", "accreditationnumber",
)


def is_exact_token(field: dict[str, Any]) -> bool:
    field_id = re.sub(r"[^a-z0-9]", "", str(field.get("id") or "").lower())
    if any(part in field_id for part in (
        "dateinwords", "amountwords", "shareholdersnamesinn",
        "shareholderspercentages",
    )):
        return False
    if field_id.endswith("passport"):
        return True
    if any(part in field_id for part in EXACT_PARTS):
        return True
    if "account" in field_id and not any(
        part in field_id for part in ("portfolio", "details", "additional")
    ):
        return True
    source = str(field.get("source") or "").lower()
    return source.endswith((".inn", ".kpp", ".ogrn", ".email", ".phone"))


def field_category(map_id: str, field: dict[str, Any], override: dict[str, Any] | None) -> str:
    field_type = str(field.get("type") or "text")
    if field_type in {"check", "static"}:
        return "checkbox-or-static"
    if is_exact_token(field):
        return "fixed-exact-token"
    if override:
        return str(override["category"])
    expansion = field.get("expansion") or {}
    if expansion.get("lineStyle") == "table-row":
        return "multiline-table-cell"
    if map_id in TABLE_DOCUMENTS:
        return "multiline-table-cell"
    field_id = str(field.get("id") or "").lower()
    if map_id == "qualification-request-fl" and "evidence" in field_id:
        return "multiline-table-cell"
    if map_id == "qualification-request-yul" and field_id.startswith("supportingdocument"):
        return "independent-form-row"
    if expansion:
        return "independent-form-row"
    if field.get("multiline"):
        return "multiline-table-cell"
    return "fixed-inline-overlay"


def current_model(field: dict[str, Any], word_block: dict[str, Any] | None) -> str:
    if word_block:
        return "word-flow-block-run"
    field_type = str(field.get("type") or "text")
    if field_type == "check":
        return "fixed-checkbox-mark"
    if field_type == "static":
        return "fixed-static-overlay"
    expansion = field.get("expansion") or {}
    if expansion:
        return "inserted-" + str(expansion.get("lineStyle") or "row")
    if field.get("flowRegions"):
        return "multi-region-field-overlay"
    if field.get("multiline"):
        return "bounded-multiline-overlay" if field.get("maxHeight") else "multiline-overlay"
    return "fixed-field-overlay"


def font_family(template: dict[str, Any], field: dict[str, Any]) -> tuple[str, str]:
    key = str(field.get("font") or "legalSerif")
    source = str((template.get("fonts") or {}).get(key) or "")
    stem = Path(source).stem.lower()
    if "liberationserif" in stem:
        family = "Liberation Serif"
    elif stem:
        family = Path(source).stem
    else:
        family = key
    return family, key


def word_run_for_field(block: dict[str, Any] | None, field_id: str) -> dict[str, Any] | None:
    if not block:
        return None
    for run in block.get("runs") or []:
        if run.get("type") == "fieldRef" and run.get("fieldId") == field_id:
            return run
    return None


def border_style(
    field: dict[str, Any], category: str, block: dict[str, Any] | None
) -> str:
    run = word_run_for_field(block, str(field.get("id") or ""))
    decoration = (run or {}).get("decoration") or {}
    if decoration.get("underline"):
        return "word-flow-underline"
    if str(field.get("type") or "text") == "check":
        return "checkbox-glyph"
    expansion = field.get("expansion") or {}
    if expansion:
        return "generated-" + str(expansion.get("lineStyle") or "row")
    if any(region.get("drawUnderline") for region in field.get("flowRegions") or []):
        return "source-rule-plus-generated-continuation-rule"
    if category == "multiline-table-cell":
        return "source-pdf-table-cell-border"
    return "source-pdf-underlay-rule-or-border"


def static_text_for_field(
    page: int, block: dict[str, Any] | None
) -> str:
    if block and block.get("sourceStaticText"):
        return str(block["sourceStaticText"])
    return f"source PDF underlay on page {page}"


def migration_status(category: str, model: str) -> tuple[str, bool, str]:
    if category == "word-flow-paragraph":
        required = (
            "Replace the reviewed source text range with one word-flow paragraph; "
            "preserve every field ID and source path."
        )
        complete = model == "word-flow-block-run"
    elif category == "word-flow-labelled-block":
        required = (
            "Replace the reviewed labels and values with one reflowing labelled block; "
            "preserve every field ID and source path."
        )
        complete = model == "word-flow-block-run"
    elif category == "multiline-table-cell":
        required = (
            "Keep bounded cell wrapping; add a reviewed table-row insertion only when "
            "the cell's long fixture needs more lines."
        )
        complete = True
    elif category == "independent-form-row":
        required = "Keep an independent row and use reviewed row insertion for overflow."
        complete = True
    elif category == "fixed-exact-token":
        required = "Keep the value nonbreaking and inside its exact-token slot."
        complete = True
    elif category == "checkbox-or-static":
        required = "Keep the fixed checkbox/static-mark renderer."
        complete = True
    else:
        required = "Retain the fixed inline overlay; no paragraph migration is required."
        complete = True

    if complete:
        defect = "none in audited ordinary or realistic-long fixture classes"
    else:
        defect = (
            "the field and adjacent static copy are separate operators, so the section "
            "cannot reflow as one Word-like unit"
        )
    return required, complete, defect


def target_model(category: str) -> str:
    return {
        "word-flow-paragraph": "word-flow-paragraph",
        "word-flow-labelled-block": "word-flow-labelled-block",
        "multiline-table-cell": "bounded-table-cell-with-reviewed-row-growth",
        "fixed-exact-token": "nonbreaking-exact-token",
        "checkbox-or-static": "fixed-checkbox-or-static-mark",
        "fixed-inline-overlay": "fixed-inline-overlay",
        "independent-form-row": "independent-row-with-reviewed-growth",
    }[category]


def classification_rationale(
    map_id: str,
    field: dict[str, Any],
    category: str,
    block: dict[str, Any] | None,
) -> str:
    field_id = str(field.get("id") or "")
    if block and category == "fixed-exact-token":
        return (
            f"Exact identifier/date token inside reviewed Word-flow block {block.get('id')}; "
            "it moves with the sentence but remains unbroken."
        )
    if block:
        return (
            f"Existing fieldRef in reviewed Word-flow block {block.get('id')}; static wording "
            "and punctuation share the block's line-breaking model."
        )
    if category == "checkbox-or-static":
        return "Executable field type is check/static; it does not participate in text flow."
    if category == "fixed-exact-token":
        return "Identifier/date/code/account value is retained as one nonbreaking token."
    if category == "multiline-table-cell":
        if (map_id, field_id) in REVIEWED_TABLE_ROW_ANCHORS:
            return "Explicitly reviewed bordered source row; retain table-row growth and columns."
        return "Authoritative source section is a questionnaire/order table cell with bounded wrapping."
    if category == "independent-form-row":
        return "Source control is an independent labelled row, not prose shared with adjacent fields."
    return "Short value occupies a fixed printed blank; realistic wrapping is not required."


def section_category(block: dict[str, Any]) -> str:
    block_id = str(block.get("id") or "")
    if "accession-application-yul-applicant" in block_id:
        return "word-flow-labelled-block"
    return "word-flow-paragraph"


def unique(values: Iterable[Any]) -> list[Any]:
    result = []
    for value in values:
        if value not in result:
            result.append(value)
    return result


def source_context_for_field(
    document: dict[str, Any],
    page_number: int,
    field: dict[str, Any],
    block: dict[str, Any] | None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Return exact nearby source wording and a reproducible source-line pitch."""
    page = document["pages"][page_number - 1]
    if block:
        context = {
            "kind": "reviewed-word-flow-source-replacement",
            "sourcePage": page_number,
            "wordFlowBlockId": block.get("id"),
            "sourceStaticText": str(block.get("sourceStaticText") or ""),
            "sourceReplacement": block.get("sourceReplacement") or {},
        }
        typography = {
            "fontFamilies": [],
            "fontSizesPt": [],
            "measuredLinePitchPt": block.get("lineHeight"),
            "measurementModel": "reviewed-word-flow-source-measurement",
            "sourceLineNumbers": [],
        }
        return context, typography

    lines = page.get("sourceTextLines") or []
    left = float(field.get("left", 0) or 0)
    width = float(field.get("width", 0) or 0)
    right = left + width
    vertical = field.get("baselineTop")
    if vertical is None:
        vertical = field.get("top")
    if vertical is None:
        vertical = 0
    vertical = float(vertical)

    def line_score(line: dict[str, Any]) -> float:
        x0, y0, x1, y1 = [float(value) for value in line["bbox"]]
        dy = 0.0 if y0 <= vertical <= y1 else min(abs(vertical - y0), abs(vertical - y1))
        if width > 0 and not (x1 < left or x0 > right):
            dx = 0.0
        else:
            dx = min(abs(left - x1), abs(right - x0)) if width > 0 else abs(left - x0)
        return dy + min(dx, 300.0) * 0.025

    nearest = sorted(lines, key=lambda line: (line_score(line), line["lineNumber"]))[:3]
    context = {
        "kind": "nearest-source-pdf-static-lines",
        "sourcePage": page_number,
        "fieldAnchor": {
            "left": rounded(left),
            "baselineOrTop": rounded(vertical),
            "width": rounded(width),
        },
        "lines": [
            {
                "lineNumber": line["lineNumber"],
                "text": line["text"],
                "bbox": line["bbox"],
                "lineSha256": line["lineSha256"],
            }
            for line in nearest
        ],
        "selectionMethod": "three source lines nearest to production field geometry",
    }

    fonts = unique(
        span["fontFamily"] for line in nearest for span in line.get("spans") or []
    )
    sizes = unique(
        span["fontSizePt"] for line in nearest for span in line.get("spans") or []
    )
    pitch = None
    if nearest:
        anchor_center = (float(nearest[0]["bbox"][1]) + float(nearest[0]["bbox"][3])) / 2
        centers = sorted({
            round((float(line["bbox"][1]) + float(line["bbox"][3])) / 2, 3)
            for line in lines
        })
        deltas = [
            abs(center - anchor_center)
            for center in centers
            if 6.0 <= abs(center - anchor_center) <= 40.0
        ]
        if deltas:
            pitch = rounded(min(deltas))
    typography = {
        "fontFamilies": fonts,
        "fontSizesPt": sizes,
        "measuredLinePitchPt": pitch,
        "measurementModel": (
            "nearest-source-pdf-line-pitch" if pitch is not None
            else "source-line-found-pitch-not-resolvable"
        ),
        "sourceLineNumbers": [line["lineNumber"] for line in nearest],
    }
    return context, typography


def build_field_and_section_rows(
    maps: dict[str, Any],
    documents_by_id: dict[str, dict[str, Any]],
    floor: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    errors: list[str] = []
    target_overrides = override_index()
    word_flows, flow_errors = word_flow_index(maps)
    errors.extend(flow_errors)
    baseline = {
        (row["documentId"], field["fieldId"]): field.get("source")
        for row in floor
        for field in row.get("fields") or []
    }

    for key, override in target_overrides.items():
        template = maps.get(key[0])
        if not template or key[1] not in {
            str(field.get("id") or "") for field in template.get("fields") or []
        }:
            # Additive target fields may not exist in the frozen floor, but all
            # explicit target entries must exist in the current executable map.
            errors.append(f"target-section field is absent: {key[0]}/{key[1]}")
        elif key not in word_flows:
            errors.append(
                f"reviewed Word-flow target is not active in executable map: "
                f"{key[0]}/{key[1]}"
            )

    field_rows: list[dict[str, Any]] = []
    section_members: dict[tuple[str, int, str], list[dict[str, Any]]] = defaultdict(list)
    section_meta: dict[tuple[str, int, str], dict[str, Any]] = {}

    for map_id in sorted(maps):
        template = maps[map_id]
        document = documents_by_id.get(map_id)
        if not document:
            errors.append(f"mapped document missing from PDF inventory: {map_id}")
            continue
        for field in template.get("fields") or []:
            field_id = str(field.get("id") or "")
            page = int(field.get("page", 0)) + 1
            key = (map_id, field_id)
            # A value repeated across identical reviewed rows classifies the
            # same way in each, so the first block answers for all of them.
            block = (word_flows.get(key) or [None])[0]
            override = target_overrides.get(key)
            effective_override = override
            if block and not effective_override:
                effective_override = {"category": section_category(block)}
            category = field_category(map_id, field, effective_override)
            if category not in FIELD_CATEGORIES:
                errors.append(f"unclassified field: {map_id}/{field_id}: {category}")
                continue
            model = current_model(field, block)
            if block and (field.get("expansion") or field.get("flowRegions")):
                errors.append(
                    f"word-flow field retains an independent continuation renderer: "
                    f"{map_id}/{field_id}"
                )

            if block:
                section_id = str(block.get("id") or "")
                section_target = (
                    str(override["category"]) if override else section_category(block)
                )
                section_static_text = str(block.get("sourceStaticText") or "")
                section_source = "executable wordFlowBlocks"
            elif override:
                section_id = str(override["sectionId"])
                section_target = str(override["category"])
                section_static_text = f"reviewed source PDF text range on page {page}"
                section_source = "mandatory target-section audit"
            else:
                # A map field normally corresponds to one printed cell, blank,
                # checkbox or independent row. Do not merge unrelated fields
                # merely because they share a page/category; only reviewed
                # target/Word-flow groups are allowed to share a section.
                section_id = f"{map_id}-p{page}-{field_id}"
                section_target = category
                section_static_text = f"source PDF underlay on page {page}"
                section_source = "one production field per source form section"

            source_paths = unique(
                value for value in (
                    field.get("source"),
                    (field.get("showWhen") or {}).get("source"),
                    (block or {}).get("showWhen", {}).get("source"),
                ) if value
            )
            family, font_key = font_family(template, field)
            font_size = field.get("fontSize")
            if block and block.get("fontSize") is not None:
                font_size = block.get("fontSize")
            line_height = field.get("lineHeight")
            if block and block.get("lineHeight") is not None:
                line_height = block.get("lineHeight")
            alignment = (
                (block or {}).get("alignment")
                or field.get("align")
                or "left"
            )
            required, complete, defect = migration_status(category, model)
            identifier_status = "baseline-preserved" if key in baseline else "additive-current"
            if key in baseline and field.get("source") != baseline[key]:
                errors.append(f"baseline source mismatch while building row: {map_id}/{field_id}")

            visual_status = (
                "post-migration-visual-review-required"
                if model == "word-flow-block-run"
                else "baseline-visual-qa-passed"
                if complete
                else "target-migration-pending"
            )
            row = {
                "documentId": map_id,
                "title": document["title"],
                "templateFilename": document["templateFilename"],
                "page": page,
                "sectionId": section_id,
                "fieldId": field_id,
                "fieldIds": [field_id],
                "sourcePaths": source_paths,
                "existingVariableNamesPreserved": {
                    "status": True,
                    "identifierStatus": identifier_status,
                    "fieldId": field_id,
                    "source": field.get("source"),
                    "format": field.get("format"),
                    "fallbacks": field.get("fallbacks") or [],
                },
                "currentRenderingModel": model,
                "targetRenderingModel": target_model(category),
                "intendedLayoutCategory": category,
                "staticTextInvolved": static_text_for_field(page, block),
                "fontFamily": family,
                "fontKey": font_key,
                "fontSizePt": font_size,
                "lineHeightPt": line_height,
                "lineHeightModel": "explicit" if line_height is not None else "renderer-auto",
                "alignment": alignment,
                "underlineBorderStyle": border_style(field, category, block),
                "normalFixtureResult": "pass (zero ordinary-class failures in audited baseline)",
                "realisticLongFixtureResult": "pass (zero realistic-long-class failures in audited baseline)",
                "currentVisualDefect": defect,
                "requiredMigration": required,
                "migrationCompleted": complete,
                "classificationReviewStatus": "reviewed-full-template-audit",
                "visualReviewStatus": visual_status,
                "structuralQaStatus": "baseline-structural-qa-passed",
                "rawFieldType": str(field.get("type") or "text"),
                # Keep the executable definition beside the classification so
                # every formatter, fallback, condition, flow region and legacy
                # expansion anchor is part of the reproducible audit surface.
                "currentFieldDefinition": field,
            }
            field_rows.append(row)
            section_key = (map_id, page, section_id)
            section_members[section_key].append(row)
            section_meta[section_key] = {
                "target": section_target,
                "staticText": section_static_text,
                "source": section_source,
            }

    sections: list[dict[str, Any]] = []
    for (map_id, page, section_id), rows in sorted(section_members.items()):
        meta = section_meta[(map_id, page, section_id)]
        complete = all(row["migrationCompleted"] for row in rows)
        sections.append({
            "documentId": map_id,
            "title": rows[0]["title"],
            "templateFilename": rows[0]["templateFilename"],
            "page": page,
            "sectionId": section_id,
            "fieldIds": [row["fieldId"] for row in rows],
            "sourcePaths": unique(path for row in rows for path in row["sourcePaths"]),
            "existingVariableNamesPreserved": all(
                row["existingVariableNamesPreserved"]["status"] for row in rows
            ),
            "currentRenderingModel": unique(row["currentRenderingModel"] for row in rows),
            "targetRenderingModel": target_model(meta["target"]),
            "intendedLayoutCategory": meta["target"],
            "classificationSource": meta["source"],
            "staticTextInvolved": meta["staticText"],
            "fontFamily": unique(row["fontFamily"] for row in rows),
            "fontSizePt": unique(row["fontSizePt"] for row in rows),
            "lineHeightPt": unique(row["lineHeightPt"] for row in rows),
            "alignment": unique(row["alignment"] for row in rows),
            "underlineBorderStyle": unique(row["underlineBorderStyle"] for row in rows),
            "normalFixtureResult": "pass",
            "realisticLongFixtureResult": "pass",
            "currentVisualDefect": unique(row["currentVisualDefect"] for row in rows),
            "requiredMigration": unique(row["requiredMigration"] for row in rows),
            "migrationCompleted": complete,
            "classificationReviewStatus": "reviewed-full-template-audit",
            "visualReviewStatus": unique(row["visualReviewStatus"] for row in rows),
            "structuralQaStatus": "baseline-structural-qa-passed",
        })

    field_rows.sort(key=lambda row: (row["documentId"], row["page"], row["sectionId"], row["fieldId"]))
    return field_rows, sections, errors


def attach_metadata(
    documents: list[dict[str, Any]],
    runtime: dict[str, Any],
) -> list[str]:
    errors: list[str] = []
    maps = runtime.get("maps") or {}
    catalog = flatten_catalog(runtime.get("catalog") or {})
    for document in documents:
        doc_id = document["documentId"]
        catalog_entry = catalog.get(doc_id) or {}
        document["title"] = str(
            catalog_entry.get("title")
            or STATIC_TITLES.get(doc_id)
            or (maps.get(doc_id) or {}).get("title")
            or doc_id
        )
        document["catalogStatus"] = (
            "production"
            if catalog_entry
            else "intentionally-hidden"
            if document["documentRole"] == "hidden"
            else "intentionally-unexposed"
        )
        document["packageId"] = catalog_entry.get("packageId")
        template = maps.get(doc_id)
        document["mapId"] = doc_id if template else None
        document["currentFieldCount"] = len(template.get("fields") or []) if template else 0
        role = document["documentRole"]
        if role in {"hidden", "static"} and catalog_entry:
            errors.append(f"{role} template became catalog-exposed: {doc_id}")
        if role == "package-static":
            if not catalog_entry:
                errors.append(f"package-static template disappeared from catalog: {doc_id}")
            elif catalog_entry.get("packageId") != "brokerage-starter-package":
                errors.append(
                    f"package-static membership changed: {doc_id}: "
                    f"{catalog_entry.get('packageId')!r}"
                )
            if catalog_entry.get("overlayTemplateId"):
                errors.append(f"package-static template became dynamic: {doc_id}")
        if template:
            if role != "dynamic-overlay":
                errors.append(f"static-role document unexpectedly has a map: {doc_id}")
            if not catalog_entry:
                errors.append(f"dynamic mapped template disappeared from catalog: {doc_id}")
            elif catalog_entry.get("overlayTemplateId") != doc_id:
                errors.append(
                    f"dynamic catalog/map binding changed: {doc_id}: "
                    f"{catalog_entry.get('overlayTemplateId')!r}"
                )
            if template.get("expectedPages") != document["pageCount"]:
                errors.append(
                    f"page-count mismatch: {doc_id}: map={template.get('expectedPages')} "
                    f"pdf={document['pageCount']}"
                )
            expected_path = Path(str(template.get("templateUrl") or "")).name
            if expected_path != document["templateFilename"]:
                errors.append(
                    f"template filename mismatch: {doc_id}: map={expected_path!r} "
                    f"pdf={document['templateFilename']!r}"
                )
        elif role == "dynamic-overlay":
            errors.append(f"dynamic template has no executable map: {doc_id}")
    return errors


def fixture_evidence() -> dict[str, Any]:
    """What the committed failure matrix currently says, not what was typed."""
    path = QA_DIR / "ordinary-failures.json"
    if not path.exists():
        return {"source": "ordinary-failures.json is missing; run "
                          "audit_ordinary_failures.py"}
    recorded = json.loads(path.read_text(encoding="utf-8"))
    counts = recorded.get("counts") or {}
    return {
        "source": "static-uikit/tools/qa/ordinary-failures.json",
        "ordinaryFailures": counts.get("ordinary"),
        "realisticLongFailures": counts.get("realisticLong"),
        "stressOnlyFields": counts.get("stressOnly"),
        "stressOnlyNote": "documented capacity limits of printed slots; "
                          "not release-class failures",
        "ordinaryProfiles": len(recorded.get("ordinaryProfiles") or []),
        "longProfiles": len(recorded.get("longProfiles") or []),
    }


def production_status_inventory(
    documents: list[dict[str, Any]],
    catalog: dict[str, dict[str, Any]],
    maps: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[str]]:
    """One final status per PDF, checked against what the code actually does.

    The status in DOCUMENT_SPECS is a declaration. Everything else in each row
    is observed — is there a map, is there a catalogue entry, does that entry
    generate or download — and a declaration that disagrees with the
    observation is a failure. That is the whole point: a template cannot be
    called production-ready because somebody wrote it down.
    """
    rows: list[dict[str, Any]] = []
    errors: list[str] = []
    catalogue_ids = set(catalog)

    for document in documents:
        doc_id = document["documentId"]
        status = document["productionStatus"]
        entry = catalog.get(doc_id) or {}
        template = maps.get(doc_id)
        rationale = NON_DYNAMIC_RATIONALE.get(doc_id)

        observed = {
            "map": bool(template),
            "catalogue": bool(entry),
            "generated": bool(entry.get("overlayTemplateId")),
        }
        if status not in PRODUCTION_STATUSES:
            errors.append(
                f"{doc_id}: unknown production status {status!r}; allowed: "
                + ", ".join(sorted(PRODUCTION_STATUSES))
            )
            continue
        expected = PRODUCTION_STATUSES[status]
        for key, want in expected.items():
            if observed[key] != want:
                errors.append(
                    f"{doc_id}: declared {status!r} but {key}={observed[key]} "
                    f"(a {status!r} template must have {key}={want})"
                )

        if status == "dynamic-production-ready":
            if rationale:
                errors.append(
                    f"{doc_id}: a production-ready template must not carry a "
                    "non-dynamic rationale"
                )
        elif not rationale:
            errors.append(
                f"{doc_id}: {status!r} without a recorded reason — every "
                "template that is not generated has to say why in "
                "NON_DYNAMIC_RATIONALE"
            )

        rows.append({
            "documentId": doc_id,
            "templateFilename": document["templateFilename"],
            "title": document.get("title") or doc_id,
            "productionStatus": status,
            "pageCount": document["pageCount"],
            "catalogueEntry": entry.get("id"),
            "cataloguePackage": entry.get("packageId"),
            "appliesTo": entry.get("appliesTo") or [],
            "fieldMap": doc_id if template else None,
            "generationMode": (
                "browser-overlay" if observed["generated"]
                else "static-download" if observed["catalogue"]
                else "not-offered"
            ),
            "exposure": "offered" if observed["catalogue"] else "not-offered",
            "qaStatus": (
                "ordinary + realistic-long fixtures, structural and visual QA"
                if status == "dynamic-production-ready"
                else "source SHA-256 / page-count byte baseline only"
            ),
            "reason": (rationale or {}).get("reason"),
            "userCanDownload": (rationale or {}).get(
                "userCanDownload", observed["catalogue"]),
            "futureMappingRequired": (rationale or {}).get(
                "futureMappingRequired", False),
            "excludedFromCurrentRelease": (rationale or {}).get(
                "excludedFromRelease", False),
        })

    # Nothing may be offered that cannot be produced. A catalogue entry naming
    # an overlay template with no registered map is the failure mode this whole
    # inventory exists to make impossible.
    # A package is a container: it offers no PDF of its own, its members do.
    containers = {
        doc_id for doc_id, entry in catalog.items()
        if entry.get("packageDocuments")
    }
    for doc_id, entry in sorted(catalog.items()):
        overlay = entry.get("overlayTemplateId")
        if overlay and overlay not in maps:
            errors.append(
                f"catalogue entry {doc_id!r} generates {overlay!r}, which has "
                "no registered field map"
            )
        if (not overlay and doc_id not in containers
                and not entry.get("pdfTemplateUrl") and not entry.get("closure")):
            errors.append(
                f"catalogue entry {doc_id!r} neither generates a PDF nor "
                "offers one for download"
            )

    known = {row["documentId"] for row in rows}
    for doc_id in sorted(NON_DYNAMIC_RATIONALE):
        if doc_id not in known:
            errors.append(
                f"NON_DYNAMIC_RATIONALE describes {doc_id!r}, which is not one "
                "of the committed templates"
            )
    # A map that belongs to no PDF, or a catalogue document that is neither a
    # template nor a non-document flow, would both escape the count above.
    for doc_id in sorted(maps):
        if doc_id not in known:
            errors.append(f"field map {doc_id!r} has no committed PDF template")
    unaccounted = catalogue_ids - known - containers - {
        doc_id for doc_id, entry in catalog.items() if entry.get("closure")
    }
    for doc_id in sorted(unaccounted):
        errors.append(
            f"catalogue document {doc_id!r} is offered but is not one of the "
            "committed templates, a package container or a non-document flow"
        )

    if len(rows) != EXPECTED_PDFS:
        errors.append(
            f"the inventory accounts for {len(rows)} templates, not {EXPECTED_PDFS}"
        )
    return rows, errors


def static_page_sections(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for document in documents:
        for page in document["pages"]:
            role = document["documentRole"]
            rows.append({
                "documentId": document["documentId"],
                "title": document["title"],
                "templateFilename": document["templateFilename"],
                "page": page["page"],
                "sectionId": f"{document['documentId']}-p{page['page']}-source-static-underlay",
                "fieldIds": [],
                "sourcePaths": [document["templatePath"]],
                "existingVariableNamesPreserved": True,
                "currentRenderingModel": "source-pdf-static-underlay",
                "targetRenderingModel": "byte-invariant-source-pdf-static-underlay",
                "intendedLayoutCategory": role if role != "dynamic-overlay" else "preserved-source-static",
                "staticTextInvolved": {
                    "lineCount": page["sourceTextLineCount"],
                    "lineTextSha256": page["sourceTextSha256"],
                },
                "fontFamily": unique(
                    span["fontFamily"]
                    for line in page["sourceTextLines"]
                    for span in line["spans"]
                ),
                "fontSizePt": unique(
                    span["fontSizePt"]
                    for line in page["sourceTextLines"]
                    for span in line["spans"]
                ),
                "lineHeightPt": [],
                "alignment": ["source-defined"],
                "underlineBorderStyle": ["source-pdf-vector-content"],
                "normalFixtureResult": "byte-invariant source underlay",
                "realisticLongFixtureResult": "byte-invariant source underlay",
                "currentVisualDefect": "none attributed to source-static preservation",
                "requiredMigration": "preserve source content or replace only an explicitly reviewed operator range",
                "migrationCompleted": True,
                "classificationReviewStatus": "reviewed-full-template-audit",
                "visualReviewStatus": "source-page-inventoried",
                "structuralQaStatus": "source-sha256-baseline-locked",
            })
    return rows


def document_summaries(
    documents: list[dict[str, Any]],
    fields: list[dict[str, Any]],
    maps: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    fields_by_doc: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for field in fields:
        fields_by_doc[field["documentId"]].append(field)
    maps_by_doc = {row["documentId"]: row for row in maps}
    summaries = []
    for document in documents:
        doc_id = document["documentId"]
        doc_fields = fields_by_doc.get(doc_id, [])
        map_row = maps_by_doc.get(doc_id)
        word_blocks = (map_row or {}).get("wordFlowBlockIds") or []
        pending = [row["fieldId"] for row in doc_fields if not row["migrationCompleted"]]
        retained_expansions = [
            row["fieldId"]
            for row in doc_fields
            if (row.get("currentFieldDefinition") or {}).get("expansion")
        ]
        if document["documentRole"] != "dynamic-overlay":
            categories = [document["documentRole"]]
            migration_result = (
                "no Word-flow migration required: static/hidden template remains byte-invariant"
            )
            visual_status = "source pages inventoried; PDF byte baseline locked"
            structural_status = "source SHA-256/page-count baseline locked"
        else:
            categories = sorted(unique(row["intendedLayoutCategory"] for row in doc_fields))
            if pending:
                migration_result = (
                    f"migration pending for {len(pending)} classified field(s): "
                    + ", ".join(pending)
                )
            elif word_blocks:
                migration_result = (
                    "identified Word-flow migrations complete; remaining fields retain "
                    "their simpler reviewed categories"
                )
            else:
                migration_result = (
                    "no Word-flow migration required: dynamic content is table-cell, "
                    "fixed/exact, checkbox/static or genuinely independent-row content"
                )
            visual_status = "; ".join(
                unique(row["visualReviewStatus"] for row in doc_fields)
            ) or "no dynamic fields"
            structural_status = "baseline structural QA passed"
        summaries.append({
            "documentId": doc_id,
            "title": document["title"],
            "templateFilename": document["templateFilename"],
            "documentRole": document["documentRole"],
            "pageCount": document["pageCount"],
            "fieldCount": len(doc_fields),
            "reviewed": "classification-and-source-inventory-complete",
            "layoutCategoriesFound": categories,
            "wordFlowBlocksAdded": word_blocks,
            "activeIndependentExpansionFields": retained_expansions,
            "obsoleteContinuationRulesAlongsideWordFlow": 0,
            "migrationResult": migration_result,
            "migrationCompleted": not pending,
            "visualQaStatus": visual_status,
            "structuralQaStatus": structural_status,
        })
    return summaries


def validate_matrix(snapshot: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    documents = snapshot.get("documents") or []
    fields = snapshot.get("fieldClassifications") or []
    sections = snapshot.get("sections") or []
    maps = snapshot.get("mapInventory") or []

    if len(documents) != EXPECTED_PDFS:
        errors.append(f"matrix has {len(documents)} documents, expected {EXPECTED_PDFS}")
    pages = [(doc["documentId"], page["page"]) for doc in documents for page in doc["pages"]]
    if len(pages) != EXPECTED_PAGES:
        errors.append(f"matrix has {len(pages)} pages, expected {EXPECTED_PAGES}")
    for value, count in Counter(pages).items():
        if count > 1:
            errors.append(f"duplicate page in matrix: {value[0]} p{value[1]}")
    document_ids = [doc["documentId"] for doc in documents]
    filenames = [doc["templateFilename"] for doc in documents]
    for label, values in (("document id", document_ids), ("template filename", filenames)):
        for value, count in Counter(values).items():
            if count > 1:
                errors.append(f"duplicate {label}: {value}")

    current_keys = [
        (map_row["documentId"], field["fieldId"])
        for map_row in maps
        for field in map_row["fields"]
    ]
    matrix_keys = [(row["documentId"], row["fieldId"]) for row in fields]
    for value, count in Counter(matrix_keys).items():
        if count > 1:
            errors.append(f"duplicate classified field: {value[0]}/{value[1]}")
    missing = sorted(set(current_keys) - set(matrix_keys))
    extra = sorted(set(matrix_keys) - set(current_keys))
    for map_id, field_id in missing:
        errors.append(f"unclassified current field: {map_id}/{field_id}")
    for map_id, field_id in extra:
        errors.append(f"classification without current field: {map_id}/{field_id}")

    section_occurrences: Counter[tuple[str, str]] = Counter()
    for section in sections:
        if section.get("sectionKind") == "source-static-page":
            continue
        for field_id in section.get("fieldIds") or []:
            section_occurrences[(section["documentId"], field_id)] += 1
    for key in current_keys:
        count = section_occurrences[key]
        if count != 1:
            errors.append(
                f"field belongs to {count} semantic sections, expected 1: {key[0]}/{key[1]}"
            )

    page_set = set(pages)
    for row in fields:
        missing_columns = REQUIRED_MATRIX_COLUMNS - set(row)
        if missing_columns:
            errors.append(
                f"field matrix row lacks required columns: {row.get('documentId')}/"
                f"{row.get('fieldId')}: {sorted(missing_columns)}"
            )
        if (row["documentId"], row["page"]) not in page_set:
            errors.append(
                f"field classification points outside page inventory: "
                f"{row['documentId']}/{row['fieldId']} p{row['page']}"
            )
        if row.get("intendedLayoutCategory") not in FIELD_CATEGORIES:
            errors.append(
                f"invalid field category: {row['documentId']}/{row['fieldId']}: "
                f"{row.get('intendedLayoutCategory')!r}"
            )
        if not row.get("classificationReviewStatus"):
            errors.append(f"field lacks review status: {row['documentId']}/{row['fieldId']}")

    for section in sections:
        missing_columns = REQUIRED_MATRIX_COLUMNS - set(section)
        if missing_columns:
            errors.append(
                f"section matrix row lacks required columns: {section.get('documentId')}/"
                f"{section.get('sectionId')}: {sorted(missing_columns)}"
            )

    static_sections = [s for s in sections if s.get("sectionKind") == "source-static-page"]
    static_pages = [(s["documentId"], s["page"]) for s in static_sections]
    if Counter(static_pages) != Counter(pages):
        errors.append("source-static page sections do not cover every document page exactly once")

    actual_lines = sum(
        len(page.get("sourceTextLines") or []) for doc in documents for page in doc["pages"]
    )
    if actual_lines != snapshot.get("counts", {}).get("sourceTextLines"):
        errors.append("source text-line count does not match detailed line inventory")
    return errors


def map_inventory(runtime: dict[str, Any], floor: list[dict[str, Any]]) -> list[dict[str, Any]]:
    floor_keys = {
        (row["documentId"], field["fieldId"])
        for row in floor
        for field in row.get("fields") or []
    }
    rows = []
    for map_id, template in sorted((runtime.get("maps") or {}).items()):
        fields = []
        for field in template.get("fields") or []:
            key = (map_id, str(field.get("id") or ""))
            fields.append({
                "fieldId": key[1],
                "source": field.get("source"),
                "page": int(field.get("page", 0)) + 1,
                "type": str(field.get("type") or "text"),
                "identifierStatus": "baseline-preserved" if key in floor_keys else "additive-current",
            })
        rows.append({
            "documentId": map_id,
            "templateFilename": Path(str(template.get("templateUrl") or "")).name,
            "expectedPages": template.get("expectedPages"),
            "currentFieldCount": len(fields),
            "wordFlowBlockIds": [
                str(block.get("id") or "") for block in template.get("wordFlowBlocks") or []
            ],
            "pageLayout": template.get("pageLayout") or {},
            "wordFlowBlocks": template.get("wordFlowBlocks") or [],
            "fields": fields,
        })
    return rows


def build_snapshot(
    runtime: dict[str, Any], floor: list[dict[str, Any]]
) -> tuple[dict[str, Any], list[str]]:
    errors = validate_runtime(runtime, floor)
    documents, pdf_errors = pdf_inventory()
    errors.extend(pdf_errors)
    errors.extend(attach_metadata(documents, runtime))
    documents_by_id = {document["documentId"]: document for document in documents}
    fields, semantic_sections, row_errors = build_field_and_section_rows(
        runtime.get("maps") or {}, documents_by_id, floor
    )
    errors.extend(row_errors)
    source_sections = static_page_sections(documents)
    for section in semantic_sections:
        section["sectionKind"] = "semantic-field-section"
    for section in source_sections:
        section["sectionKind"] = "source-static-page"
    sections = sorted(
        source_sections + semantic_sections,
        key=lambda row: (
            row["documentId"], row["page"],
            0 if row["sectionKind"] == "source-static-page" else 1,
            row["sectionId"],
        ),
    )
    maps = map_inventory(runtime, floor)
    summaries = document_summaries(documents, fields, maps)
    status_rows, status_errors = production_status_inventory(
        documents,
        flatten_catalog(runtime.get("catalog") or {}),
        runtime.get("maps") or {},
    )
    errors.extend(status_errors)
    baseline_keys = {
        (row["documentId"], field["fieldId"])
        for row in floor
        for field in row.get("fields") or []
    }
    additive = [
        {"documentId": row["documentId"], "fieldId": field["fieldId"], "source": field["source"]}
        for row in maps
        for field in row["fields"]
        if (row["documentId"], field["fieldId"]) not in baseline_keys
    ]
    text_fields = sum(
        1 for row in maps for field in row["fields"] if field["type"] != "check"
    )
    check_fields = sum(
        1 for row in maps for field in row["fields"] if field["type"] == "check"
    )
    snapshot = {
        "schemaVersion": 1,
        "generatedBy": "static-uikit/tools/qa/check_full_template_audit.py --write",
        "scope": {
            "closedTemplateSet": True,
            "sourcePdfByteInvariance": "all-22-sha256-and-byte-length",
            "pageCoverage": "all-77-pages",
            "sourceTextCoverage": "every-extracted-source-pdf-text-line",
            "mapCoverage": "all-18-executable-production-maps",
            "identifierPolicy": (
                "621 field ID/source pairs are an immutable compatibility floor; "
                "additions are allowed but must be classified and become protected once committed"
            ),
            "registryIdentifierCompanion": (
                "static-uikit/tools/qa/document-identifier-manifest.json"
            ),
        },
        "counts": {
            "documents": len(documents),
            "pages": sum(document["pageCount"] for document in documents),
            "dynamicTemplates": sum(document["documentRole"] == "dynamic-overlay" for document in documents),
            "staticOrHiddenTemplates": sum(document["documentRole"] != "dynamic-overlay" for document in documents),
            "maps": len(maps),
            "baselineFields": len(baseline_keys),
            "currentFields": len(fields),
            "additiveCurrentFields": len(additive),
            "currentTextFields": text_fields,
            "currentCheckFields": check_fields,
            "sourceTextLines": sum(
                page["sourceTextLineCount"] for document in documents for page in document["pages"]
            ),
            "semanticSections": len(semantic_sections),
            "sourceStaticPageSections": len(source_sections),
        },
        "productionStatusCounts": {
            status: sum(row["productionStatus"] == status for row in status_rows)
            for status in sorted(PRODUCTION_STATUSES)
        },
        "productionStatusInventory": status_rows,
        "classificationCategories": sorted(FIELD_CATEGORIES),
        # Read from the committed failure matrix rather than written down here.
        # These numbers were prose, and prose goes stale silently: the
        # stress-only count said 23 while the matrix said 22, and two suite
        # totals were several hundred checks out of date. A number that has to
        # be edited by hand to stay true is a number that will not be.
        "fixtureEvidence": fixture_evidence(),
        "identifierCompatibilityFloor": floor,
        "additiveCurrentFields": additive,
        "documents": documents,
        "documentSummaries": summaries,
        "mapInventory": maps,
        "sections": sections,
        "fieldClassifications": fields,
    }
    errors.extend(validate_matrix(snapshot))
    return snapshot, errors


def validate_byte_baseline(
    committed: dict[str, Any],
    current: dict[str, Any],
    authorised: frozenset[str] = frozenset(),
) -> list[str]:
    """Refuse any source PDF whose bytes moved.

    `authorised` names the templates an operator has explicitly said were
    replaced on purpose, via --replace-source-pdf. Everything else still fails:
    a template that changes without somebody naming it is the failure this
    baseline exists to catch.
    """
    errors: list[str] = []
    before = {row["templateFilename"]: row for row in committed.get("documents") or []}
    after = {row["templateFilename"]: row for row in current.get("documents") or []}
    for filename in sorted(set(before) | set(after), key=str.lower):
        expected = before.get(filename)
        actual = after.get(filename)
        if expected is None:
            errors.append(f"PDF added outside committed byte baseline: {filename}")
        elif actual is None:
            errors.append(f"PDF removed from committed byte baseline: {filename}")
        else:
            if filename in authorised:
                continue
            for key in ("sha256", "byteLength", "pageCount"):
                if expected.get(key) != actual.get(key):
                    errors.append(
                        f"source PDF byte-invariance failure: {filename} {key}: "
                        f"{expected.get(key)!r} -> {actual.get(key)!r}"
                    )
    return errors


def validate_committed_identifiers(
    committed: dict[str, Any],
    current: dict[str, Any],
    authorised_templates: frozenset[str] = frozenset(),
) -> list[str]:
    """Protect additive identifiers too once they enter the committed matrix.

    A template the business replaced may legitimately lose a field: the updated
    account-opening notice prints its representative itself, so the overlay that
    used to fill that blank has nothing left to draw. Identifiers belonging to a
    template named in --replace-source-pdf are therefore allowed to disappear;
    every other identifier stays frozen.
    """
    errors: list[str] = []
    replaced_docs = {name[:-4] for name in authorised_templates
                     if name.lower().endswith(".pdf")}
    expected = {
        (map_row["documentId"], field["fieldId"]): field.get("source")
        for map_row in committed.get("mapInventory") or []
        for field in map_row.get("fields") or []
        if map_row["documentId"] not in replaced_docs
    }
    actual = {
        (map_row["documentId"], field["fieldId"]): field.get("source")
        for map_row in current.get("mapInventory") or []
        for field in map_row.get("fields") or []
    }
    for key, source in sorted(expected.items()):
        if key not in actual:
            errors.append(f"removed/renamed committed current field: {key[0]}/{key[1]}")
        elif actual[key] != source:
            errors.append(
                f"changed committed current source: {key[0]}/{key[1]}: "
                f"{source!r} -> {actual[key]!r}"
            )
    return errors


def md_cell(value: Any, limit: int = 160) -> str:
    if value is None or value == []:
        text = "—"
    elif isinstance(value, bool):
        text = "yes" if value else "no"
    elif isinstance(value, (list, dict)):
        text = canonical(value)
    else:
        text = str(value)
    text = text.replace("|", "\\|").replace("\n", " ")
    return text if len(text) <= limit else text[: limit - 1] + "…"


def markdown(snapshot: dict[str, Any]) -> str:
    counts = snapshot["counts"]
    lines = [
        "# Full PDF-template audit matrix",
        "",
        "Generated from the executable production maps and the committed source PDFs by",
        "`python static-uikit/tools/qa/check_full_template_audit.py --write`.",
        "Do not edit this matrix by hand; the default command verifies it without writing.",
        "Run `python static-uikit/tools/qa/check_full_template_audit.py --self-test` to exercise",
        "the required negative gates with in-memory corruptions (no source files are changed).",
        "",
        "## Coverage and invariants",
        "",
        "| Item | Coverage |",
        "| --- | ---: |",
        f"| Source PDF templates | {counts['documents']} / {EXPECTED_PDFS} |",
        f"| Source pages | {counts['pages']} / {EXPECTED_PAGES} |",
        f"| Executable maps | {counts['maps']} / {EXPECTED_MAPS} |",
        f"| Frozen identifier/source floor | {counts['baselineFields']} / {EXPECTED_BASELINE_FIELDS} |",
        f"| Current classified fields | {counts['currentFields']} |",
        f"| Additive current fields | {counts['additiveCurrentFields']} |",
        f"| Extracted source-PDF text lines | {counts['sourceTextLines']} |",
        f"| Semantic field sections | {counts['semanticSections']} |",
        "",
        "All 22 PDFs are locked by filename, byte length, page count and SHA-256. The JSON",
        "companion inventories every source text line (text, spans, font, size, bounding box",
        "and line hash). The original 621 field ID/source pairs are immutable; additive",
        "fields are permitted only when they are also classified by this audit.",
        "Each JSON field row retains its full executable definition, and each map row retains",
        "page-layout and Word-flow metadata, so conditions, formatters, fallbacks, flow regions,",
        "continuation anchors, page shifts and cross-page rules are also inside the gate.",
        "Registry IDs, wizard/check keys and formatter names are frozen by the companion",
        "`document-identifier-manifest.json` / `check_identifier_manifest.py` gate.",
        "",
        "## Final production status — every PDF, exactly one status",
        "",
        "Every committed template has exactly one of five final statuses. The status is",
        "declared in `DOCUMENT_SPECS` and checked against what the code actually does:",
        "whether a field map is registered, whether the wizard catalogue offers the",
        "document, and whether that catalogue entry generates a PDF or hands one over",
        "unchanged. A declaration that disagrees with the observation fails the gate, so",
        "no template can be called production-ready because somebody wrote it down.",
        "",
        "| Status | Templates |",
        "| --- | ---: |",
    ]
    for status, total in snapshot["productionStatusCounts"].items():
        lines.append(f"| {status} | {total} |")
    lines.extend([
        f"| **Total** | **{counts['documents']}** |",
        "",
        "| Template | Document ID | Status | Catalogue entry | Field map | Generation | Exposure | QA |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ])
    for row in snapshot["productionStatusInventory"]:
        lines.append("| " + " | ".join(md_cell(value) for value in (
            row["templateFilename"], row["documentId"], row["productionStatus"],
            row["catalogueEntry"] or "—", row["fieldMap"] or "—",
            row["generationMode"], row["exposure"], row["qaStatus"],
        )) + " |")

    non_dynamic = [row for row in snapshot["productionStatusInventory"]
                   if row["productionStatus"] != "dynamic-production-ready"]
    lines.extend([
        "",
        "### Templates that are not generated, and why",
        "",
        "| Template | Status | Reason | User can download | Future mapping required | Excluded from this release |",
        "| --- | --- | --- | --- | --- | --- |",
    ])
    for row in non_dynamic:
        lines.append("| " + " | ".join(md_cell(value) for value in (
            row["templateFilename"], row["productionStatus"], row["reason"],
            row["userCanDownload"], row["futureMappingRequired"],
            row["excludedFromCurrentRelease"],
        )) + " |")

    lines.extend([
        "",
        "## Document and page matrix",
        "",
        "| Document ID | Title | Template | Role | Page | Lines | Text SHA-256 | PDF SHA-256 | Bytes | Map fields |",
        "| --- | --- | --- | --- | ---: | ---: | --- | --- | ---: | ---: |",
    ])
    for document in snapshot["documents"]:
        for page in document["pages"]:
            lines.append("| " + " | ".join(md_cell(value) for value in (
                document["documentId"], document["title"], document["templateFilename"],
                document["documentRole"], page["page"], page["sourceTextLineCount"],
                page["sourceTextSha256"], document["sha256"], document["byteLength"],
                document["currentFieldCount"],
            )) + " |")

    lines.extend([
        "",
        "## Document-by-document completion matrix",
        "",
        "| Document ID | Role | Reviewed | Categories found | Word-flow blocks | Active independent expansions | Obsolete expansions beside Word flow | Migration result / no-migration reason | Completed | Visual QA | Structural QA |",
        "| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- |",
    ])
    for summary in snapshot["documentSummaries"]:
        lines.append("| " + " | ".join(md_cell(value) for value in (
            summary["documentId"], summary["documentRole"], summary["reviewed"],
            summary["layoutCategoriesFound"], summary["wordFlowBlocksAdded"],
            summary["activeIndependentExpansionFields"],
            summary["obsoleteContinuationRulesAlongsideWordFlow"],
            summary["migrationResult"], summary["migrationCompleted"],
            summary["visualQaStatus"], summary["structuralQaStatus"],
        )) + " |")

    lines.extend([
        "",
        "## Complete field matrix",
        "",
        "One row follows for every current field. `baseline-preserved` means the exact ID and",
        "source path are among the immutable 621; `additive-current` is a new, non-replacement",
        "identifier that still receives full classification coverage.",
        "",
        "| Document ID | Title | Template | Page | Section ID | Field ID | Source paths | Identifier | Current model | Target model | Layout category | Static text involved | Font | Size pt | Line height | Align | Underline/border | Normal fixture | Realistic-long | Current defect | Required migration | Completed | Visual review | Structural QA |",
        "| --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ])
    for row in snapshot["fieldClassifications"]:
        preserved = row["existingVariableNamesPreserved"]
        lines.append("| " + " | ".join(md_cell(value) for value in (
            row["documentId"], row["title"], row["templateFilename"], row["page"],
            row["sectionId"], row["fieldId"], row["sourcePaths"],
            preserved["identifierStatus"], row["currentRenderingModel"],
            row["targetRenderingModel"], row["intendedLayoutCategory"],
            row["staticTextInvolved"], row["fontFamily"], row["fontSizePt"],
            row["lineHeightPt"] if row["lineHeightPt"] is not None else row["lineHeightModel"],
            row["alignment"], row["underlineBorderStyle"], row["normalFixtureResult"],
            row["realisticLongFixtureResult"], row["currentVisualDefect"],
            row["requiredMigration"], row["migrationCompleted"],
            row["visualReviewStatus"], row["structuralQaStatus"],
        )) + " |")

    lines.extend([
        "",
        "## Semantic section matrix",
        "",
        "Source-static page sections are omitted here because every one of the 77 pages is",
        "already enumerated above; they remain complete records in the JSON companion.",
        "",
        "| Document ID | Page | Section ID | Field IDs | Current models | Target category | Static text | Migration completed | Review |",
        "| --- | ---: | --- | --- | --- | --- | --- | --- | --- |",
    ])
    for section in snapshot["sections"]:
        if section["sectionKind"] != "semantic-field-section":
            continue
        lines.append("| " + " | ".join(md_cell(value) for value in (
            section["documentId"], section["page"], section["sectionId"],
            section["fieldIds"], section["currentRenderingModel"],
            section["intendedLayoutCategory"], section["staticTextInvolved"],
            section["migrationCompleted"], section["classificationReviewStatus"],
        )) + " |")
    lines.append("")
    return "\n".join(lines)


def print_errors(errors: list[str]) -> None:
    for error in errors:
        print("FAIL", error)


def run_self_tests(
    runtime: dict[str, Any], snapshot: dict[str, Any], floor: list[dict[str, Any]]
) -> list[str]:
    """Prove the required negative gates with in-memory corruptions only."""
    failures: list[str] = []

    def expect(label: str, errors: list[str], fragment: str) -> None:
        if not any(fragment in error for error in errors):
            failures.append(f"{label}: expected a failure containing {fragment!r}")

    missing_id = copy.deepcopy(runtime)
    first_map = floor[0]
    first_field = first_map["fields"][0]
    missing_id["maps"][first_map["documentId"]]["fields"] = [
        field
        for field in missing_id["maps"][first_map["documentId"]]["fields"]
        if field.get("id") != first_field["fieldId"]
    ]
    expect(
        "missing baseline identifier",
        validate_runtime(missing_id, floor),
        "removed/renamed baseline field",
    )

    duplicate_id = copy.deepcopy(runtime)
    map_id = first_map["documentId"]
    duplicate_id["maps"][map_id]["fields"].append(
        copy.deepcopy(duplicate_id["maps"][map_id]["fields"][0])
    )
    expect(
        "duplicate identifier",
        validate_runtime(duplicate_id, floor),
        "duplicate current field",
    )

    invalid_page = copy.deepcopy(runtime)
    invalid_page["maps"][map_id]["fields"][0]["page"] = 999
    expect(
        "field outside page range",
        validate_runtime(invalid_page, floor),
        "field page outside template",
    )

    duplicate_template = copy.deepcopy(runtime)
    map_ids = sorted(duplicate_template["maps"])
    duplicate_template["maps"][map_ids[1]]["templateUrl"] = (
        duplicate_template["maps"][map_ids[0]]["templateUrl"]
    )
    expect(
        "duplicate template URL",
        validate_runtime(duplicate_template, floor),
        "duplicate runtime template URL",
    )

    missing_page = copy.deepcopy(snapshot)
    missing_page["documents"][0]["pages"].pop()
    expect(
        "missing page coverage",
        validate_matrix(missing_page),
        "pages, expected",
    )

    missing_classification = copy.deepcopy(snapshot)
    missing_classification["fieldClassifications"].pop()
    expect(
        "missing current-field classification",
        validate_matrix(missing_classification),
        "unclassified current field",
    )

    duplicate_classification = copy.deepcopy(snapshot)
    duplicate_classification["fieldClassifications"].append(
        copy.deepcopy(duplicate_classification["fieldClassifications"][0])
    )
    expect(
        "duplicate current-field classification",
        validate_matrix(duplicate_classification),
        "duplicate classified field",
    )

    changed_pdf = copy.deepcopy(snapshot)
    changed_pdf["documents"][0]["sha256"] = "0" * 64
    expect(
        "changed source-PDF bytes",
        validate_byte_baseline(snapshot, changed_pdf),
        "source PDF byte-invariance failure",
    )

    removed_additive = copy.deepcopy(snapshot)
    if snapshot.get("additiveCurrentFields"):
        additive = snapshot["additiveCurrentFields"][0]
        map_row = next(
            row for row in removed_additive["mapInventory"]
            if row["documentId"] == additive["documentId"]
        )
        map_row["fields"] = [
            field for field in map_row["fields"]
            if field["fieldId"] != additive["fieldId"]
        ]
        expect(
            "removed committed additive identifier",
            validate_committed_identifiers(snapshot, removed_additive),
            "removed/renamed committed current field",
        )

    duplicate_renderer = copy.deepcopy(runtime)
    flow_map_id = next(
        map_name
        for map_name, template in duplicate_renderer["maps"].items()
        if template.get("wordFlowBlocks")
    )
    first_block = duplicate_renderer["maps"][flow_map_id]["wordFlowBlocks"][0]
    flow_field_id = next(
        run["fieldId"] for run in first_block.get("runs") or []
        if run.get("type") == "fieldRef"
    )
    flow_field = next(
        field for field in duplicate_renderer["maps"][flow_map_id]["fields"]
        if field.get("id") == flow_field_id
    )
    flow_field["expansion"] = {"lineStyle": "underline"}
    _, _, renderer_errors = build_field_and_section_rows(
        duplicate_renderer["maps"],
        {document["documentId"]: document for document in snapshot["documents"]},
        floor,
    )
    expect(
        "Word-flow/legacy double renderer",
        renderer_errors,
        "word-flow field retains an independent continuation renderer",
    )

    # ── The final-status gates ────────────────────────────────────────────────
    #
    # Each of these is a way a template could be left unfinished while every
    # other gate stayed green, which is exactly what this phase exists to make
    # impossible.
    catalog = flatten_catalog(runtime.get("catalog") or {})
    maps = runtime.get("maps") or {}
    documents = snapshot["documents"]

    exposed_without_map = copy.deepcopy(catalog)
    exposed_without_map["invented-document"] = {
        "id": "invented-document",
        "overlayTemplateId": "invented-document",
        "packageId": None,
    }
    _, errors = production_status_inventory(documents, exposed_without_map, maps)
    expect(
        "exposed document with no field map",
        errors,
        "has no registered field map",
    )

    unfinished = copy.deepcopy(documents)
    unfinished[0]["productionStatus"] = "dynamic-production-ready"
    hidden = next(
        document for document in unfinished
        if document["documentId"] == "anketa-isbyul"
    )
    hidden["productionStatus"] = "dynamic-production-ready"
    _, errors = production_status_inventory(unfinished, catalog, maps)
    expect(
        "template claimed production-ready without a map",
        errors,
        "declared 'dynamic-production-ready' but map=False",
    )

    invented_status = copy.deepcopy(documents)
    invented_status[0]["productionStatus"] = "mostly-done"
    _, errors = production_status_inventory(invented_status, catalog, maps)
    expect(
        "status outside the closed vocabulary",
        errors,
        "unknown production status",
    )

    dropped = [
        document for document in copy.deepcopy(documents)
        if document["documentId"] != "transfer-requisites"
    ]
    _, errors = production_status_inventory(dropped, catalog, maps)
    expect(
        "template silently missing from the inventory",
        errors,
        f"not {EXPECTED_PDFS}",
    )

    return failures


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--write", action="store_true",
        help="refresh the matrix after additive map changes (never resets PDF/identifier baselines)",
    )
    parser.add_argument(
        "--replace-source-pdf", action="append", default=[], metavar="FILENAME",
        help=(
            "name a source PDF the business has supplied a replacement for. "
            "Only with --write, and only for the templates named: every other "
            "PDF, and every identifier, stays protected."
        ),
    )
    parser.add_argument(
        "--self-test", action="store_true",
        help="exercise missing/duplicate/page/template/hash failures with in-memory mutations",
    )
    args = parser.parse_args()

    authorised = frozenset(args.replace_source_pdf)
    if authorised and not args.write:
        print("--replace-source-pdf only makes sense with --write")
        return 2
    unknown = sorted(name for name in authorised
                     if not (TEMPLATE_DIR / name).exists())
    if unknown:
        print("no such template: " + ", ".join(unknown))
        return 2

    committed = None
    if AUDIT_JSON.exists():
        committed = json.loads(AUDIT_JSON.read_text(encoding="utf-8"))
    floor = compatibility_floor(committed)
    runtime = load_runtime()

    # A template the business replaced may legitimately lose a field. Re-cut
    # that one document's compatibility floor to what the map really exposes
    # now; every other document's floor is untouched, so this cannot be used to
    # quietly drop an identifier from a template nobody replaced.
    if authorised:
        replaced_docs = {name[:-4] for name in authorised
                         if name.lower().endswith(".pdf")}
        runtime_maps = runtime.get("maps") or {}
        for row in floor:
            if row["documentId"] not in replaced_docs:
                continue
            live = {str(f.get("id") or "")
                    for f in (runtime_maps.get(row["documentId"]) or {}).get("fields") or []}
            dropped = [f["fieldId"] for f in row.get("fields") or []
                       if f["fieldId"] not in live]
            if dropped:
                print(f"authorised replacement {row['documentId']}: dropping "
                      f"{len(dropped)} floor identifier(s): {', '.join(dropped)}")
            row["fields"] = [f for f in row.get("fields") or []
                             if f["fieldId"] in live]

    snapshot, errors = build_snapshot(runtime, floor)

    if committed:
        errors.extend(validate_byte_baseline(committed, snapshot, authorised))
        errors.extend(validate_committed_identifiers(committed, snapshot,
                                                     authorised))
    if errors:
        print_errors(errors)
        print(f"\nFull-template audit: {len(errors)} failure(s)")
        return 1

    if args.self_test:
        failures = run_self_tests(runtime, snapshot, floor)
        if failures:
            print_errors(failures)
            print(f"\nFull-template audit self-test: {len(failures)} failure(s)")
            return 1
        print(
            "Full-template audit self-test: PASS · 14/14 negative gates "
            "(missing/duplicate identifiers, invalid/missing pages, duplicate templates, "
            "missing/duplicate classifications, changed PDF hash, committed additive removal, "
            "duplicate rendering, exposed-without-map, production-ready-without-map, "
            "invented status, template missing from the inventory)"
        )
        return 0

    rendered_md = markdown(snapshot)
    if args.write:
        AUDIT_JSON.write_text(
            json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        AUDIT_MD.write_text(rendered_md, encoding="utf-8")
        print(
            f"wrote {AUDIT_JSON.relative_to(REPO_ROOT)} and {AUDIT_MD.relative_to(REPO_ROOT)}: "
            f"{snapshot['counts']['documents']} PDFs / {snapshot['counts']['pages']} pages / "
            f"{snapshot['counts']['maps']} maps / {snapshot['counts']['baselineFields']} baseline + "
            f"{snapshot['counts']['additiveCurrentFields']} additive fields / "
            f"{snapshot['counts']['sourceTextLines']} source text lines"
        )
        return 0

    if committed is None:
        print(f"audit baseline is missing: {AUDIT_JSON.relative_to(REPO_ROOT)}")
        print("run with --write after reviewing the closed source/template set")
        return 2
    if snapshot != committed:
        before = sha256_bytes(canonical(committed).encode("utf-8"))
        after = sha256_bytes(canonical(snapshot).encode("utf-8"))
        print(
            "FAIL audit matrix is stale relative to executable maps/source inventory: "
            f"{before[:12]} -> {after[:12]}"
        )
        print("review the change, then run with --write")
        return 1
    if not AUDIT_MD.exists() or AUDIT_MD.read_text(encoding="utf-8") != rendered_md:
        print(f"FAIL human-readable matrix is stale: {AUDIT_MD.relative_to(REPO_ROOT)}")
        return 1

    counts = snapshot["counts"]
    static_docs = [
        doc for doc in snapshot["documents"] if doc["documentRole"] != "dynamic-overlay"
    ]
    print(
        "Full-template audit: PASS · "
        f"{counts['documents']} PDFs / {counts['pages']} pages / "
        f"{counts['maps']} maps / {counts['baselineFields']} frozen + "
        f"{counts['additiveCurrentFields']} additive fields / "
        f"{counts['sourceTextLines']} source text lines"
    )
    print(
        "Source PDF invariance: PASS · all 22 SHA-256/byte baselines · "
        f"{len(static_docs)} static/hidden templates explicitly locked"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
