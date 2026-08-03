"""Build the focused manual-findings correction review pack.

The pack is deliberately local and git-excluded.  Every PDF is produced by
the production browser renderer from repository-owned synthetic fixtures; the
authoritative templates are read-only and neither Word nor LibreOffice is
used.

    python static-uikit/tools/qa/build_final_review_pack.py
"""

from __future__ import annotations

import argparse
import base64
import html
import json
import os
import shutil
import sys
from typing import Any

import fitz

HERE = os.path.dirname(os.path.abspath(__file__))
STATIC_UIKIT = os.path.abspath(os.path.join(HERE, "..", ".."))
SMOKE_TOOLS = os.path.join(
    STATIC_UIKIT, "manual-smoke", "word-flow-long-data", "tools"
)
TEMPLATES = os.path.join(STATIC_UIKIT, "assets", "document-pdf-templates")
OUT = os.path.join(STATIC_UIKIT, "manual-smoke", "manual-findings-fix")

for path in (HERE, SMOKE_TOOLS):
    if path not in sys.path:
        sys.path.insert(0, path)

from build_ordinary_review_pack import ASSIGNMENTS, slug  # noqa: E402
from run_document_regression import inspect as production_inspect  # noqa: E402
from smoke_engine import SmokeBrowser  # noqa: E402

FULL_PAGE_SCALE = 1.65
FOCUS_SCALE = 2.5

RU_ADDRESS = {
    "index": "125009",
    "country": "Российская Федерация",
    "region": "Центральный федеральный округ",
    "district": "внутригородская территория муниципальный округ Пресненский",
    "city": "Москва",
    "street": "Большая Дмитровка",
    "house": "128",
    "corps": "4, строение 7",
    "flat": "385",
}
FOREIGN_ADDRESS = {
    "index": "SW1A 2AA",
    "country": "United Kingdom",
    "region": "Greater London",
    "district": "City of Westminster",
    "city": "London",
    "settlement": "Saint Christopher International Business Park",
    "street": "King George the Fifth Avenue",
    "house": "27",
    "flat": "148",
}
LONG_NAME = (
    "Акционерное общество «Международные инвестиционные технологии, "
    "инфраструктурные решения и управление активами»"
)
BODY_NAME = (
    "Публичное акционерное общество «Международный центр инвестиционных "
    "технологий, инфраструктурных решений, управления активами и финансовых "
    "инструментов»"
)
OTHER_INSTRUMENTS = (
    "акций и облигаций иностранных эмитентов, паев международных "
    "инвестиционных фондов, депозитарных расписок, структурных облигаций и "
    "производных финансовых инструментов, предназначенных для "
    "квалифицированных инвесторов"
)


DOCUMENTS: dict[str, dict[str, Any]] = {
    "account-opening-notice": {
        "title": "Извещение об открытии брокерского счёта",
        "focusFields": [
            "depositaryContractNumber", "depositaryContractDate",
            "transferBasisDepositoryNumber", "transferBasisDepositoryDate",
        ],
        "focusRegions": [
            {"id": "representative-spelling", "title": "Исправленное отчество представителя",
             "page": 0, "clip": [30, 90, 565, 205], "fields": []},
            {"id": "depository-contract-row", "title": "Депозитарный договор: номер и дата",
             "page": 0, "clip": [30, 380, 570, 470],
             "fields": ["depositaryContractNumber", "depositaryContractDate"]},
            {"id": "transfer-basis", "title": "Основание перевода на странице 2",
             "page": 1, "clip": [30, 555, 570, 785],
             "fields": ["transferBasisDepositoryNumber", "transferBasisDepositoryDate"]},
        ],
        "staticChecks": [
            {"id": "correct-patronymic-once",
             "text": "Козырева Александра Юрьевича", "expectedCount": 1},
            {"id": "misspelled-patronymic-absent",
             "text": "Козырева Александра Юрьвеича", "expectedCount": 0},
            {"id": "printed-test-phrase-absent",
             "text": "Тестовое значение", "expectedCount": 0},
        ],
    },
    "qualification-notice": {
        "title": "Уведомление о признании квалифицированным инвестором",
        "focusFields": [
            "recipientName", "recipientAddress", "clientName",
            "recognitionDate", "otherInstruments", "registerEntryOrgName",
        ],
        "focusRegions": [
            {"id": "recipient", "title": "Получатель и единый форматированный адрес",
             "page": 0, "clip": [330, 140, 565, 360],
             "fields": ["recipientName", "recipientAddress"]},
            {"id": "recognition-body", "title": "Наименование организации и дата в тексте",
             "page": 0, "clip": [35, 255, 565, 440],
             "fields": ["clientName", "recognitionDate"]},
            {"id": "other-and-register", "title": "«Иное» и запись в реестре",
             "page": 0, "clip": [35, 390, 565, 555],
             "fields": ["otherInstruments", "registerEntryOrgName"]},
        ],
    },
    "anketa-fl-simplified-id": {
        "title": "Упрощённая анкета физического лица",
        "kind": "individual",
        "focusFields": [
            "clientFullName", "idIssuedBy", "registrationAddress",
            "bankName", "bankAddress", "otherInformation",
        ],
        "focusRegions": [
            {"id": "identity", "title": "ФИО и удостоверяющий документ", "page": 0,
             "clip": [45, 130, 575, 335],
             "fields": ["clientFullName", "idIssuedBy"]},
            {"id": "registration", "title": "Адрес регистрации", "page": 0,
             "clip": [45, 265, 575, 370], "fields": ["registrationAddress"]},
            {"id": "bank-and-free-text", "title": "Банк и дополнительные сведения", "page": 0,
             "clip": [45, 620, 575, 835],
             "fields": ["bankName", "bankAddress", "otherInformation"]},
        ],
    },
    "anketa-ip-sz": {
        "title": "Анкета ИП / самозанятого",
        "kind": "individual",
        "focusFields": [
            "clientFullName", "idIssuedBy", "registrationAddress",
            "bankName", "bankAddress", "ipRegistrationAuthority",
            "ipRegistrationPlace", "otherInformation",
        ],
        "focusRegions": [
            {"id": "identity", "title": "ФИО и удостоверяющий документ", "page": 0,
             "clip": [45, 225, 575, 535],
             "fields": ["clientFullName", "idIssuedBy"]},
            {"id": "registration", "title": "Адрес регистрации", "page": 0,
             "clip": [45, 645, 575, 835], "fields": ["registrationAddress"]},
            {"id": "bank-and-ip-registration", "title": "Банк и регистрация ИП", "page": 1,
             "clip": [45, 300, 575, 595],
             "fields": ["bankName", "bankAddress", "ipRegistrationAuthority",
                        "ipRegistrationPlace"]},
            {"id": "free-text", "title": "Дополнительные сведения", "page": 3,
             "clip": [45, 290, 575, 385], "fields": ["otherInformation"]},
        ],
    },
    "anketa-fl": {
        "title": "Полная анкета физического лица",
        "kind": "individual",
        "focusFields": [
            "fullName", "passportIssuedBy", "registrationAddress",
            "bankName", "bankAddress", "otherInformation",
        ],
        "focusRegions": [
            {"id": "identity", "title": "ФИО и удостоверяющий документ", "page": 0,
             "clip": [45, 190, 575, 545],
             "fields": ["fullName", "passportIssuedBy"]},
            {"id": "registration", "title": "Адрес регистрации", "page": 0,
             "clip": [45, 645, 575, 835], "fields": ["registrationAddress"]},
            {"id": "bank", "title": "Банковские реквизиты", "page": 1,
             "clip": [45, 270, 575, 430], "fields": ["bankName", "bankAddress"]},
            {"id": "free-text", "title": "Иные сведения", "page": 2,
             "clip": [45, 620, 575, 715], "fields": ["otherInformation"]},
        ],
    },
    "anketa-yul": {
        "title": "Анкета юридического лица",
        "kind": "company",
        "focusFields": [
            "fullLegalName", "foreignName", "stateRegistrationAuthority",
            "pre2002RegistrationDocument", "pre2002RegistrationAuthority",
            "egrulAddress", "licenceAuthority", "bankName", "bankAddress",
            "otherInformation",
        ],
        "focusRegions": [
            {"id": "names", "title": "Полное и иностранное наименование", "page": 0,
             "clip": [45, 170, 575, 275],
             "fields": ["fullLegalName", "foreignName"]},
            {"id": "registration", "title": "Регистрация и адрес ЕГРЮЛ", "page": 0,
             "clip": [45, 495, 575, 825],
             "fields": ["stateRegistrationAuthority", "pre2002RegistrationDocument",
                        "pre2002RegistrationAuthority", "egrulAddress"]},
            {"id": "licence-and-bank", "title": "Лицензия и банковские реквизиты", "page": 2,
             "clip": [45, 130, 575, 430],
             "fields": ["licenceAuthority", "bankName", "bankAddress"]},
            {"id": "free-text", "title": "Иные сведения", "page": 4,
             "clip": [45, 140, 575, 225], "fields": ["otherInformation"]},
        ],
    },
}


def umi_address(parts: dict[str, str]) -> dict[str, str]:
    return {f"umi.company.{key}": value for key, value in parts.items()}


def qualification_scenarios() -> list[dict[str, Any]]:
    short = "АО «Тестовые инвестиции»"

    def scenario(identifier: str, name: str, address: str = "г. Москва",
                 address_parts: dict[str, str] | None = None,
                 other: str | None = None) -> dict[str, Any]:
        overrides: dict[str, Any] = {
            "field.client-full-name": name,
            "field.client-registration-address": address,
            "field.documentDateRu": "2026-08-03",
            "umi.company.origname": name,
            "extra.extra-qualification-scope": "other" if other else "all",
            "extra.extra-qualification-instruments-other": other or "",
        }
        if address_parts:
            # A deliberately different fallback makes a duplicate or fallback
            # address obvious in the finished PDF.
            overrides["field.client-registration-address"] = (
                "РЕЗЕРВНЫЙ СИНТЕТИЧЕСКИЙ АДРЕС — НЕ ДОЛЖЕН ПЕЧАТАТЬСЯ"
            )
            overrides.update(umi_address(address_parts))
        required = ["recipientName", "recipientAddress", "clientName",
                    "recognitionDate", "registerEntryOrgName"]
        if other:
            required.append("otherInstruments")
        return {"id": identifier, "profile": "ru-company-normal",
                "overrides": overrides, "requiredFocusFields": required}

    return [
        scenario("short", short),
        scenario("long-name", LONG_NAME),
        scenario("long-ru-address", short, address_parts=RU_ADDRESS),
        scenario("long-foreign-address", short, address_parts=FOREIGN_ADDRESS),
        scenario("combined-long-name-address", LONG_NAME, address_parts=RU_ADDRESS),
        scenario("body-date", BODY_NAME),
        scenario("other", short, other=OTHER_INSTRUMENTS),
    ]


def questionnaire_overrides(doc_id: str, language: str, long: bool) -> dict[str, Any]:
    overrides: dict[str, Any] = {"subject.email": "client@example.test"}
    if doc_id == "anketa-yul":
        if language == "foreign":
            full_name = (
                "North Star Infrastructure Investments Ltd."
                if long else "North Star Investments Ltd."
            )
            foreign_name = (
                "Interregional Investment, Industrial and Infrastructure Company "
                "for Technological Development, Joint-Stock Company"
                if long else full_name
            )
            overrides.update({
                "field.client-full-legal-name": full_name,
                "field.client-short-name": ("North Star Infrastructure Ltd."
                                             if long else "North Star Ltd."),
                "field.client-english-name": foreign_name,
                "field.client-legal-form": "Limited company",
            })
        else:
            full_name = (
                "Акционерное общество «Северные инвестиции»" if long else
                "Акционерное общество «Тестовые инвестиции»"
            )
            overrides.update({
                "field.client-full-legal-name": full_name,
                "field.client-short-name": ("АО «Международные технологии»"
                                             if long else "АО «Тестовые инвестиции»"),
                "field.client-english-name":
                    ("Interregional Investment, Industrial and Infrastructure "
                     "Company for Technological Development, Joint-Stock Company"
                     if long else "Test Investments JSC"),
                "field.client-legal-form": "Акционерное общество",
            })
    if not long:
        return overrides
    ru_bank = "Акционерное общество «Северо-Западный инвестиционно-коммерческий банк»"
    en_bank = "International Commercial and Infrastructure Development Bank Limited"
    bank = en_bank if language == "foreign" else ru_bank
    address = (
        "27 King George the Fifth Avenue, International Business Park, London, "
        "United Kingdom, SW1A 2AA"
        if language == "foreign" else
        "125009, Российская Федерация, г. Москва, ул. Большая Дмитровка, "
        "д. 128, корп. 4, стр. 7"
    )
    if doc_id == "anketa-fl-simplified-id":
        overrides.update({"extra.extra-bank-name": bank,
                          "extra.extra-bank-address": address,
                          # Identity and both bank rows can grow in this same
                          # one-page table. Keep the free-text cell realistic
                          # and single-line so the combined long case stays
                          # inside the page's reviewed aggregate budget.
                          "extra.extra-other-information":
                              ("No additional information."
                               if language == "foreign" else
                               "Дополнительных сведений нет.")})
    elif doc_id == "anketa-ip-sz":
        overrides.update({"extra.extra-bank-name": bank,
                          "extra.extra-bank-address": address,
                          "extra.extra-other-info":
                              ("No additional information."
                               if language == "foreign" else
                               "Дополнительных сведений нет."),
                          # Bank name + address consume the two reviewed row
                          # insertions on page 2. Keep the independent IP
                          # registration pair ordinary in this combined case;
                          # its own owner cell remains visible in the crop.
                          "extra.extra-ip-registration-authority":
                              ("Companies House" if language == "foreign" else
                               "ИФНС России № 46 по г. Москве"),
                          "extra.extra-ip-registration-place":
                              ("London" if language == "foreign" else "Москва"),
                          "extra.extra-ipsz-status": "entrepreneur"})
    elif doc_id == "anketa-fl":
        overrides.update({"extra.bank-name": bank, "extra.bank-address": address,
                          # This row is intentionally reviewed at a realistic
                          # two-line value, not at an artificial essay.
                          "extra.extra-other-info": "Дополнительных сведений нет."})
    elif doc_id == "anketa-yul":
        overrides.update({
                          # This printed form gives the bank name a single
                          # fixed line; the adjacent address is the reviewed
                          # expandable row. Exercise that row with a long
                          # address and use a realistic fitting institution
                          # name instead of manufacturing a known refusal.
                          "extra.bank-name":
                              ("North Star Investments Ltd." if language == "foreign" else
                               "АО «Инвестиционный Банк»"),
                          "extra.bank-address": address,
                          "extra.extra-other-info": "Дополнительных сведений нет.",
                          "extra.licensed-activities": "Брокерская деятельность.",
                          "extra.extra-management-structure":
                              "Единоличный исполнительный орган",
                          # Foreign name and the current registration authority
                          # already exercise page 1's reviewed aggregate growth
                          # budget. The historical pre-2002 pair remains
                          # visible, but uses plausible compact document text.
                          "extra.pre2002-registration-document":
                              ("Legacy register extract" if language == "foreign" else
                               "Выписка из реестра"),
                          "extra.pre2002-registration-authority":
                              ("Companies House" if language == "foreign" else
                               "Московская регистрационная палата")})
    return overrides


def scenarios_for(doc_id: str) -> list[dict[str, Any]]:
    if doc_id == "account-opening-notice":
        return [{
            "id": "corrected-spelling-and-depository",
            "profile": "ru-company-normal",
            "requiredFocusFields": list(DOCUMENTS[doc_id]["focusFields"]),
            "overrides": {
                "extra.extra-depository-contract": "ДЕПО-2026/000417-СПБ-01",
                "extra.extra-depository-contract-date": "2026-08-02",
                "extra.extra-brokerage-contract": "БД-2026/000417-СПБ-01",
                "extra.extra-brokerage-contract-date": "2026-07-29",
                "field.client-code": "INV-TEST-2026-00000017",
            },
        }]
    if doc_id == "qualification-notice":
        return qualification_scenarios()
    kind = DOCUMENTS[doc_id]["kind"]
    matrix = [
        ("ru-normal", "ru-company-normal" if kind == "company" else "ru-resident-normal", "ru", False),
        ("ru-long", "ru-company-long" if kind == "company" else "ru-resident-long", "ru", True),
        ("foreign-normal", "en-company-normal" if kind == "company" else "en-nonresident-normal", "foreign", False),
        ("foreign-long", "en-company-long" if kind == "company" else "en-nonresident-long", "foreign", True),
    ]
    return [{"id": identifier, "profile": profile,
             "requiredFocusFields": list(DOCUMENTS[doc_id]["focusFields"]),
             "overrides": questionnaire_overrides(doc_id, language, is_long)}
            for identifier, profile, language, is_long in matrix]


def normalized(value: Any) -> str:
    return "".join(str(value or "").split())


def extracted_text(pdf_bytes: bytes) -> str:
    document = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        return "".join(normalized(page.get_text("text")) for page in document)
    finally:
        document.close()


def execute_static_checks(config: dict[str, Any], squashed_pdf: str) -> list[dict[str, Any]]:
    results = []
    for check in config.get("staticChecks") or []:
        needle = normalized(check["text"])
        actual = squashed_pdf.count(needle)
        expected = int(check["expectedCount"])
        results.append({**check, "actualCount": actual, "ok": actual == expected})
    return results


def render_image(pdf_bytes: bytes, page_index: int, path: str,
                 clip: list[float] | None = None, scale: float = 2.0) -> None:
    document = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        page = document[page_index]
        rect = page.rect if clip is None else fitz.Rect(*clip) & page.rect
        pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=rect)
        pixmap.save(path)
    finally:
        document.close()


def expansion_for(field_id: str, drawn: dict[str, Any], owner: dict[str, Any] | None,
                  result: dict[str, Any]) -> tuple[int, float]:
    if owner:
        return (int(owner.get("rowExpansionCount") or 0),
                float(owner.get("cumulativeShift") or 0))
    block_id = drawn.get("blockId")
    if block_id:
        block = (result.get("blockMetrics") or {}).get(block_id) or {}
        expansion = int(block.get("additionalLines") or 0)
        shifts = [float(item.get("delta") or 0) for item in result.get("shifts") or []
                  if item.get("fieldId") == block_id]
        return expansion, round(sum(shifts), 3)
    notes = [item for item in result.get("notes") or []
             if item.get("fieldId") == field_id]
    return (sum(int(item.get("rows") or 0) for item in notes),
            round(sum(float(item.get("delta") or 0) for item in result.get("shifts") or []
                      if item.get("fieldId") == field_id), 3))


def field_evidence(config: dict[str, Any], scenario: dict[str, Any],
                   result: dict[str, Any], squashed_pdf: str) -> list[dict[str, Any]]:
    catalog = {item["fieldId"]: item for item in result.get("fieldCatalog") or []}
    drawn = {item["fieldId"]: item for item in result.get("drawn") or []}
    ownership = {item["fieldId"]: item
                 for item in (result.get("ownershipAudit") or {}).get("metrics") or []}
    focus_ids = list(config["focusFields"])
    required_ids = set(scenario.get("requiredFocusFields") or [])
    # This is intentionally a superset of the crop annotations. Any dynamic
    # value visible in any crop was drawn by the document plan, so recording
    # every drawn field makes omission impossible even where a broad crop also
    # shows neighbouring rows.
    field_ids = focus_ids + sorted(set(drawn) - set(focus_ids))
    evidence = []
    for field_id in field_ids:
        meta = catalog.get(field_id) or {"fieldId": field_id, "source": None,
                                         "page": None, "format": None}
        item = drawn.get(field_id)
        owner = ownership.get(field_id)
        if not item:
            evidence.append({
                "fieldId": field_id, "source": meta.get("source"),
                "page": meta.get("page"), "active": False,
                "fieldType": meta.get("type") or "text",
                "requested": None, "rendered": None, "pdfTextExact": None,
                "requestedRenderedEqual": None, "owner": owner,
                "lineCount": 0, "expansionCount": 0, "cumulativeShiftPt": 0,
                "fontSize": None, "logicalBlock": meta.get("flowBlockId"),
                "isScenarioFocus": field_id in focus_ids,
                "requiredFocus": field_id in required_ids,
            })
            continue
        expansion, cumulative = expansion_for(field_id, item, owner, result)
        rendered = item.get("rendered")
        field_type = meta.get("type") or "text"
        pdf_text_exact = None if field_type == "check" else bool(
            normalized(rendered) and normalized(rendered) in squashed_pdf
        )
        evidence.append({
            "fieldId": field_id,
            "source": item.get("source") or meta.get("source"),
            "page": item.get("page", meta.get("page")),
            "active": True,
            "fieldType": field_type,
            "requested": item.get("requested"),
            "rendered": rendered,
            "pdfTextExact": pdf_text_exact,
            "requestedRenderedEqual": normalized(item.get("requested")) == normalized(rendered),
            "owner": ({"tableId": owner.get("tableId"),
                       "rowId": owner.get("rowId"),
                       "bounds": owner.get("bounds"),
                       "sourceRepeatGroup": owner.get("sourceRepeatGroup")}
                      if owner else None),
            "lineCount": int(item.get("lines") or 0),
            "expansionCount": expansion,
            "cumulativeShiftPt": cumulative,
            "fontSize": item.get("size"),
            "logicalBlock": item.get("blockId") or meta.get("flowBlockId"),
            "format": meta.get("format"),
            "isScenarioFocus": field_id in focus_ids,
            "requiredFocus": field_id in required_ids,
        })
    return evidence


def write_readme(out: str, cards: list[dict[str, Any]]) -> None:
    pdfs = len(cards)
    pages = sum(len(card["fullPages"]) for card in cards)
    closeups = sum(len(card["closeups"]) for card in cards)
    by_doc: dict[str, list[str]] = {}
    for card in cards:
        by_doc.setdefault(card["documentId"], []).append(card["scenarioId"])
    lines = [
        "# Focused manual-findings correction review pack", "",
        "Status: **Awaiting manual visual approval**.", "",
        f"This local pack contains {pdfs} synthetic PDFs, {pages} full-page images, "
        f"and {closeups} close-ups. It is intentionally git-excluded.", "",
        "Open `index.html` for the review cards. Each card links its production-rendered "
        "PDF, JSON evidence, full pages, and close-ups.", "",
        "No real client data is present. The authoritative PDFs were not modified, and "
        "Word/LibreOffice were not used.", "", "## Scenario inventory", "",
    ]
    for doc_id, scenarios in by_doc.items():
        lines.append(f"- `{doc_id}`: {', '.join(f'`{item}`' for item in scenarios)}")
    lines.extend([
        "", "## Evidence on every card", "",
        "- every dynamic field drawn anywhere in the scenario (a strict superset of "
        "the fields visible or named in the close-ups), with exact field ID and "
        "source path plus requested and rendered values;",
        "- reviewed owner table/row/cell bounds where the field is table-owned;",
        "- line count, expansion count, cumulative shift, and font size;",
        "- full preflight fingerprint and preflight/render equality;",
        "- production structural result and exact PDF text recovery result.", "",
        "The account-opening card executes three static-text gates against the "
        "finished PDF: corrected patronymic exactly once, misspelling zero times, "
        "and `Тестовое значение` zero times.", "",
    ])
    with open(os.path.join(out, "README.md"), "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))


def write_checklist(out: str, cards: list[dict[str, Any]]) -> None:
    lines = [
        "# Manual visual approval checklist", "",
        "Automated evidence is recorded in `review.json`; these boxes stay unchecked "
        "until a person reviews the linked images/PDFs.", "",
        "Global checks:", "",
        "- [ ] No text overlaps a horizontal or vertical table border.",
        "- [ ] Every grown row remains connected to its original table.",
        "- [ ] Continued lines read as one value, with consistent alignment and leading.",
        "- [ ] No unrelated text moves, disappears, duplicates, or crosses the page edge.",
        "- [ ] Account opening says `Юрьевича` and never `Юрьвеича`.",
        "- [ ] Depository number/date are distinct, complete, and appear in both legal slots.",
        "- [ ] Qualification recipient name/address stay in the right column and render once.",
        "", "Scenario checks:", "",
    ]
    for card in cards:
        lines.append(
            f"- [ ] `{card['documentId']} / {card['scenarioId']}` — PDF and all close-ups approved"
        )
        for shot in card["closeups"]:
            lines.append(f"  - [ ] `{shot['id']}`: {shot['title']}")
    lines.append("")
    with open(os.path.join(out, "CHECKLIST.md"), "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))


def write_index(out: str, cards: list[dict[str, Any]]) -> None:
    esc = lambda value: html.escape("" if value is None else str(value))
    parts = ["""<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Focused manual-findings review</title><style>
body{font:14px/1.45 system-ui,sans-serif;margin:0;background:#f1f5f9;color:#0f172a}
header{background:#0f172a;color:#fff;padding:22px 28px}header h1{margin:0 0 7px;font-size:21px}
main{padding:20px 28px 60px}.card{background:#fff;border:1px solid #cbd5e1;border-radius:8px;margin:0 0 24px;overflow:hidden}
.card>h2{font-size:16px;margin:0;padding:12px 16px;background:#e2e8f0}.body{padding:14px 16px}
.pending{color:#b45309;font-weight:700}.ok{color:#047857;font-weight:700}.bad{color:#b91c1c;font-weight:700}
dl{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:3px 12px;font-size:12.5px}dt{color:#475569}dd{margin:0;font-family:ui-monospace,Consolas,monospace;word-break:break-word}
table{border-collapse:collapse;width:100%;font-size:12px;margin:12px 0}th,td{border:1px solid #cbd5e1;padding:5px 7px;text-align:left;vertical-align:top}th{background:#f8fafc}
.shots{display:flex;flex-wrap:wrap;gap:10px}.shot{border:1px solid #cbd5e1;padding:6px;background:#fff;max-width:360px}.shot img{display:block;max-width:100%;height:auto}.shot p{margin:5px 0 0;font-size:12px}.full img{width:150px}
a{color:#0369a1}.mono{font-family:ui-monospace,Consolas,monospace}.dim{color:#64748b}
</style></head><body><header><h1>Focused manual-findings correction review</h1>
<p>Synthetic data only · production renderer · Awaiting manual visual approval</p></header><main>"""]
    parts.append(
        f"<p><a href='README.md'>README</a> · <a href='CHECKLIST.md'>checklist</a> · "
        f"<a href='review.json'>combined JSON</a> · {len(cards)} PDFs</p>"
    )
    for card in cards:
        diagnostics_ok = (card["preflightOk"] and card["fingerprintsEqual"]
                          and card["structural"]["ok"]
                          and card["equality"]["ok"]
                          and not card["ownershipViolations"]
                          and not card["inactiveRequiredFocusFields"]
                          and card["evidenceCoverage"]["ok"]
                          and card["staticChecksOk"])
        parts.append(
            f"<section class='card'><h2>{esc(card['title'])} · "
            f"<span class='mono'>{esc(card['documentId'])}/{esc(card['scenarioId'])}</span></h2><div class='body'>"
        )
        parts.append("<dl>")
        for label, value in [
            ("Profile", card["profile"]),
            ("Status", card["approval"]),
            ("Automated verdict", "PASS" if diagnostics_ok else "REVIEW FAILURE"),
            ("Preflight fingerprint", card["preflightFingerprint"]),
            ("Preflight = render", card["fingerprintsEqual"]),
            ("Structural", "PASS" if card["structural"]["ok"] else card["structural"]["problems"]),
            ("Rendered values recovered from PDF", card["equality"]),
            ("Ownership violations", card["ownershipViolations"] or "none"),
            ("Required focus fields", card["requiredFocusFields"]),
            ("Inactive required focus", card["inactiveRequiredFocusFields"] or "none"),
            ("Dynamic evidence coverage", card["evidenceCoverage"]),
        ]:
            css = " class='pending'" if label == "Status" else ""
            if label == "Automated verdict":
                css = " class='ok'" if diagnostics_ok else " class='bad'"
            parts.append(f"<dt>{esc(label)}</dt><dd{css}>{esc(value)}</dd>")
        parts.append(
            f"<dt>Files</dt><dd><a href='{esc(card['pdf'])}'>PDF</a> · "
            f"<a href='{esc(card['fixture'])}'>fixture JSON</a></dd></dl>"
        )
        if card.get("staticChecks"):
            parts.append("<table><thead><tr><th>Executed static-text gate</th>"
                         "<th>Text</th><th>Expected count</th><th>Actual count</th>"
                         "<th>Result</th></tr></thead><tbody>")
            for check in card["staticChecks"]:
                parts.append(
                    f"<tr><td>{esc(check['id'])}</td><td>{esc(check['text'])}</td>"
                    f"<td>{esc(check['expectedCount'])}</td><td>{esc(check['actualCount'])}</td>"
                    f"<td class='{'ok' if check['ok'] else 'bad'}'>"
                    f"{'PASS' if check['ok'] else 'FAIL'}</td></tr>"
                )
            parts.append("</tbody></table>")
        parts.append("<table><thead><tr><th>Role</th><th>Field / exact source</th><th>Requested → rendered</th><th>Owner row/cell</th><th>Layout evidence</th><th>PDF equality</th></tr></thead><tbody>")
        for field in card["fields"]:
            owner = field.get("owner")
            ownership = (f"{owner['tableId']} / {owner['rowId']}<br>{esc(owner['bounds'])}"
                         if owner else "<span class='dim'>not table-owned</span>")
            equality_class = "ok" if field.get("pdfTextExact") is not False else "bad"
            role = ("required focus" if field.get("requiredFocus") else
                    "scenario focus" if field.get("isScenarioFocus") else
                    "other drawn dynamic field")
            equality_value = ("n/a (non-text check glyph)"
                              if field.get("pdfTextExact") is None and field["active"]
                              else field.get("pdfTextExact"))
            parts.append(
                f"<tr><td>{esc(role)}</td><td><span class='mono'>{esc(field['fieldId'])}</span><br>"
                f"<span class='mono'>{esc(field.get('source'))}</span></td>"
                f"<td>{esc(field.get('requested'))}<br>→ {esc(field.get('rendered'))}</td>"
                f"<td>{ownership}</td>"
                f"<td>{esc(field.get('lineCount'))} lines · {esc(field.get('expansionCount'))} expansions · "
                f"shift {esc(field.get('cumulativeShiftPt'))} pt · {esc(field.get('fontSize'))} pt</td>"
                f"<td class='{equality_class}'>{esc(equality_value)}</td></tr>"
            )
        parts.append("</tbody></table><h3>Close-ups</h3><div class='shots'>")
        for shot in card["closeups"]:
            parts.append(
                f"<a class='shot' href='{esc(shot['path'])}'><img loading='lazy' src='{esc(shot['path'])}'/>"
                f"<p>{esc(shot['title'])}<br>Named focus: "
                f"<span class='mono'>{esc(', '.join(shot['fields']) or 'static')}</span><br>"
                f"Dynamic page evidence ({len(shot['evidenceFieldIds'])}): "
                f"<span class='mono'>{esc(', '.join(shot['evidenceFieldIds']) or 'none')}</span>"
                f"</p></a>"
            )
        parts.append("</div><h3>Full pages</h3><div class='shots full'>")
        for page in card["fullPages"]:
            parts.append(
                f"<a class='shot' href='{esc(page)}'><img loading='lazy' src='{esc(page)}'/></a>"
            )
        parts.append("</div></div></section>")
    parts.append("</main></body></html>")
    with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as handle:
        handle.write("\n".join(parts))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=OUT)
    parser.add_argument("--only", action="append",
                        help="restrict to one of the six focused document IDs")
    args = parser.parse_args()

    out = os.path.abspath(args.out)
    for name in ("pdfs", "fixtures", "screenshots"):
        target = os.path.join(out, name)
        if os.path.isdir(target):
            shutil.rmtree(target)
        os.makedirs(target, exist_ok=True)

    selected = list(DOCUMENTS)
    if args.only:
        unknown = sorted(set(args.only) - set(DOCUMENTS))
        if unknown:
            parser.error("unknown document id(s): " + ", ".join(unknown))
        selected = [item for item in selected if item in set(args.only)]

    cards: list[dict[str, Any]] = []
    failures: list[str] = []
    browser = SmokeBrowser()
    try:
        for doc_id in selected:
            config = DOCUMENTS[doc_id]
            for scenario in scenarios_for(doc_id):
                stem = f"{doc_id}__{slug(scenario['id'])}"
                script = (ASSIGNMENTS
                          .replace("DOC", json.dumps(doc_id))
                          .replace("PROFILE", json.dumps(scenario["profile"]))
                          .replace("OVERRIDES", json.dumps(
                              scenario["overrides"], ensure_ascii=False)))
                result = json.loads(browser.browser.eval(script, await_promise=True))
                if not result.get("ok"):
                    failure = f"{doc_id}/{scenario['id']}: {result.get('message')}"
                    failures.append(failure)
                    print("  REFUSED", failure)
                    continue

                pdf_bytes = base64.b64decode(result["pdf"])
                pdf_name = stem + ".pdf"
                fixture_name = stem + ".json"
                with open(os.path.join(out, "pdfs", pdf_name), "wb") as handle:
                    handle.write(pdf_bytes)

                full_pages = []
                pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
                page_count = len(pdf)
                pdf.close()
                for page_index in range(page_count):
                    name = f"{stem}__page-{page_index + 1}.png"
                    render_image(pdf_bytes, page_index,
                                 os.path.join(out, "screenshots", name),
                                 scale=FULL_PAGE_SCALE)
                    full_pages.append("screenshots/" + name)

                closeups = []
                for region in config["focusRegions"]:
                    name = f"{stem}__focus-{slug(region['id'])}.png"
                    render_image(pdf_bytes, region["page"],
                                 os.path.join(out, "screenshots", name),
                                 clip=region["clip"], scale=FOCUS_SCALE)
                    closeups.append({**region, "path": "screenshots/" + name})

                structural = production_inspect(
                    pdf_bytes, os.path.join(TEMPLATES, doc_id + ".pdf"), None,
                    reviewed=result.get("reviewedRanges"),
                    reviewed_font_sizes=result.get("reviewedFontSizes"),
                    reviewed_value_sizes=result.get("reviewedValueSizes"),
                    reviewed_paths=result.get("reviewedPathSuppressions"),
                )
                squashed = extracted_text(pdf_bytes)
                fields = field_evidence(config, scenario, result, squashed)
                checked = [field for field in fields
                           if field["active"] and field["pdfTextExact"] is not None]
                missing = [field["fieldId"] for field in checked
                           if not field["pdfTextExact"]]
                evidence_ids = {field["fieldId"] for field in fields}
                drawn_ids = {field["fieldId"] for field in result.get("drawn") or []}
                named_ids = {field_id for region in config["focusRegions"]
                             for field_id in region["fields"]}
                missing_drawn_evidence = sorted(drawn_ids - evidence_ids)
                missing_named_evidence = sorted(named_ids - evidence_ids)
                missing_sources = sorted(field["fieldId"] for field in fields
                                         if field["active"] and not field.get("source"))
                required_focus = list(scenario.get("requiredFocusFields") or [])
                active_ids = {field["fieldId"] for field in fields if field["active"]}
                for closeup in closeups:
                    # A crop can show neighbouring rows beyond the small set
                    # named in its caption. Attach every active dynamic field
                    # on that page as a conservative evidence superset; all of
                    # those IDs resolve to full records in `card.fields`.
                    closeup["evidenceFieldIds"] = sorted(
                        field["fieldId"] for field in fields
                        if field["active"] and field.get("page") == closeup["page"]
                    )
                    closeup["missingNamedFieldEvidence"] = sorted(
                        set(closeup["fields"]) - evidence_ids
                    )
                inactive_required = sorted(set(required_focus) - active_ids)
                coverage = {
                    "ok": not (missing_drawn_evidence or missing_named_evidence or
                               missing_sources),
                    "drawnFieldCount": len(drawn_ids),
                    "evidenceFieldCount": len(evidence_ids),
                    "closeupNamedFieldCount": len(named_ids),
                    "missingDrawnFieldEvidence": missing_drawn_evidence,
                    "missingCloseupNamedFieldEvidence": missing_named_evidence,
                    "activeFieldsWithoutExactSource": missing_sources,
                }
                static_checks = execute_static_checks(config, squashed)
                static_checks_ok = all(item["ok"] for item in static_checks)
                fingerprint_equal = (
                    result.get("preflightFingerprint") == result.get("renderFingerprint")
                    and bool(result.get("preflightFingerprint"))
                )
                ownership = result.get("ownershipAudit") or {}
                card = {
                    "synthetic": True,
                    "documentId": doc_id,
                    "title": config["title"],
                    "scenarioId": scenario["id"],
                    "profile": scenario["profile"],
                    "overrides": scenario["overrides"],
                    "fields": fields,
                    "requiredFocusFields": required_focus,
                    "inactiveRequiredFocusFields": inactive_required,
                    "evidenceCoverage": coverage,
                    "staticChecks": static_checks,
                    "staticChecksOk": static_checks_ok,
                    "preflightOk": result.get("preflightOk") is True,
                    "preflightFingerprint": result.get("preflightFingerprint"),
                    "renderFingerprint": result.get("renderFingerprint"),
                    "fingerprintsEqual": fingerprint_equal,
                    "structural": {"ok": not structural.get("problems"),
                                   "problems": structural.get("problems", [])},
                    "equality": {"ok": not missing, "checked": len(checked),
                                 "missing": missing},
                    "ownershipViolations": ownership.get("violations") or [],
                    "ownershipBudgetUse": ownership.get("budgetUse") or [],
                    "pageCount": page_count,
                    "pdf": "pdfs/" + pdf_name,
                    "fixture": "fixtures/" + fixture_name,
                    "fullPages": full_pages,
                    "closeups": closeups,
                    "approval": "Awaiting manual visual approval",
                }
                with open(os.path.join(out, "fixtures", fixture_name), "w",
                          encoding="utf-8") as handle:
                    json.dump(card, handle, ensure_ascii=False, indent=2)
                cards.append(card)
                diagnostic_problems = []
                if not card["preflightOk"]:
                    diagnostic_problems.append("preflight")
                if not fingerprint_equal:
                    diagnostic_problems.append("fingerprint")
                if card["structural"]["problems"]:
                    diagnostic_problems.append("structure")
                if missing:
                    diagnostic_problems.append("equality")
                if card["ownershipViolations"]:
                    diagnostic_problems.append("ownership")
                if inactive_required:
                    diagnostic_problems.append("inactive-required-focus")
                if not coverage["ok"]:
                    diagnostic_problems.append("evidence-coverage")
                if not static_checks_ok:
                    diagnostic_problems.append("static-text")
                if diagnostic_problems:
                    failures.append(f"{doc_id}/{scenario['id']}: " +
                                    ", ".join(diagnostic_problems))
                print(f"  {doc_id:31s} {scenario['id']:31s} "
                      f"{page_count} page(s), {len(closeups)} close-up(s), "
                      f"{'PASS' if not diagnostic_problems else 'FAIL'}")
    finally:
        browser.stop()

    with open(os.path.join(out, "review.json"), "w", encoding="utf-8") as handle:
        json.dump({"synthetic": True,
                   "approval": "Awaiting manual visual approval",
                   "cards": cards, "generationFailures": failures},
                  handle, ensure_ascii=False, indent=2)
    write_readme(out, cards)
    write_checklist(out, cards)
    write_index(out, cards)

    pdf_count = len(cards)
    page_count = sum(len(card["fullPages"]) for card in cards)
    closeup_count = sum(len(card["closeups"]) for card in cards)
    fixture_count = len(cards)
    print(f"\n-> {out}")
    print(f"   {pdf_count} PDFs, {fixture_count} fixture JSON files, "
          f"{page_count} full-page images, {closeup_count} close-ups")
    print(f"   {len(failures)} generation/automated-evidence failure(s)")
    for failure in failures:
        print("      " + failure)
    print("   all cards remain Awaiting manual visual approval")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
