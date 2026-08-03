"""Focused QA for the retained multiline-table-cell expansion anchors.

The Word-flow suite owns reviewed paragraph replacement.  This suite covers
every reviewed field-level ``expand-layout`` anchor and proves that each one:

* is classified as a table cell, never an independent underline;
* uses centre-lines and insertion geometry measured from the committed PDF;
* moves the source bottom border and lower table vectors with the text;
* adds only the vertical continuation segment required to extend the cell; and
* leaves a short-value render without any generated row.

Run from the repository root:

    python static-uikit/tools/qa/run_table_cell_expansion_tests.py
"""

from __future__ import annotations

import base64
import io
import json
import os
import sys
from dataclasses import dataclass

import fitz
import pypdf

from headless_browser import STATIC_UIKIT, Chrome, Server


TEMPLATES = os.path.join(STATIC_UIKIT, "assets", "document-pdf-templates")
TOKEN = "QAZWSX"


@dataclass(frozen=True)
class Case:
    document: str
    template: str
    profile: str
    source: str
    field: str
    page: int
    insertion_top: float
    row_height: float
    columns: tuple[float, ...]
    long_words: int
    # The row's printed bottom rule. Usually the insertion point sits exactly on
    # it, but a cut has to clear whatever the row's widest cell paints, and in
    # the accession form's market table that is 1.58 pt above the rule.
    border_top: float | None = None

    @property
    def rule_top(self) -> float:
        return self.insertion_top if self.border_top is None else self.border_top


CASES = (
    # The company accession form's three tariff cells. This table draws no
    # vertical rules at all — its rules are horizontal segments across the whole
    # row — so `columns` is empty and the expansion must add no verticals
    # either. The валютный row holds two value lines in its own padding, which
    # is why it needs one more token than the other two to ask for a row.
    Case("accession-application-yul", "accession-application-yul.pdf",
         "ru-company-normal", "extra.tariff-stock", "tariffStock", 0,
         540.41, 9.72, (), 2, 541.99),
    Case("accession-application-yul", "accession-application-yul.pdf",
         "ru-company-normal", "extra.tariff-derivatives", "tariffDerivatives",
         0, 561.43, 9.72, (), 2, 562.03),
    Case("accession-application-yul", "accession-application-yul.pdf",
         "ru-company-normal", "extra.tariff-currency", "tariffCurrency", 0,
         610.85, 9.72, (), 3, 612.67),
    Case("account-opening-notice", "account-opening-notice.pdf",
         "ru-company-normal", "field.client-full-name", "clientName", 0,
         229.82, 14.28, (36.00, 324.07, 567.72), 6),
    Case("anketa-fl", "anketa-fl.pdf", "ru-resident-normal",
         "field.client-passport-issued-by", "passportIssuedBy", 0,
         503.59, 13.44,
         (63.74, 64.70, 84.62, 85.58, 319.03, 566.63, 567.60), 6),
    Case("anketa-fl", "anketa-fl.pdf", "ru-resident-normal",
         "extra.bank-name", "bankName", 1, 305.21, 13.44,
         (63.74, 64.70, 84.62, 85.58, 319.03, 566.63, 567.60), 6),
    Case("anketa-fl", "anketa-fl.pdf", "en-nonresident-normal",
         "extra.bank-address", "bankAddress", 1, 318.65, 13.44,
         (63.74, 64.70, 84.62, 85.58, 319.03, 566.63, 567.60), 6),
    Case("anketa-fl-simplified-id", "anketa-fl-simplified-id.pdf",
         "ru-resident-normal", "field.clientFullName", "clientFullName", 0,
         153.62, 14.16,
         (63.74, 64.70, 84.62, 85.58, 326.11, 573.72, 574.68), 8),
    Case("anketa-fl-simplified-id", "anketa-fl-simplified-id.pdf",
         "ru-resident-normal", "extra.extra-bank-name", "bankName", 0,
         653.26, 13.44,
         (63.74, 64.70, 84.62, 85.58, 326.11, 573.72, 574.68), 8),
    Case("anketa-fl-simplified-id", "anketa-fl-simplified-id.pdf",
         "en-nonresident-normal", "extra.extra-bank-address", "bankAddress", 0,
         666.70, 13.44,
         (63.74, 64.70, 84.62, 85.58, 326.11, 573.72, 574.68), 8),
    Case("anketa-fl-simplified-id", "anketa-fl-simplified-id.pdf",
         "ru-resident-normal", "extra.extra-other-information",
         "otherInformation", 0, 757.18, 11.52,
         (63.74, 64.70, 84.62, 85.58, 326.11, 573.72, 574.68), 8),
    Case("anketa-ip-sz", "anketa-ip-sz.pdf", "ru-resident-normal",
         "field.clientFullName", "clientFullName", 0, 245.78, 13.44,
         (63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62), 8),
    Case("anketa-ip-sz", "anketa-ip-sz.pdf", "ru-resident-normal",
         "extra.extra-bank-name", "bankName", 1, 335.57, 13.44,
         (63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62), 8),
    Case("anketa-ip-sz", "anketa-ip-sz.pdf", "en-nonresident-normal",
         "extra.extra-bank-address", "bankAddress", 1, 349.01, 13.44,
         (63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62), 8),
    Case("anketa-ip-sz", "anketa-ip-sz.pdf", "ru-resident-normal",
         "extra.extra-ip-registration-authority", "ipRegistrationAuthority",
         1, 540.55, 13.44,
         (63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62), 8),
    Case("anketa-ip-sz", "anketa-ip-sz.pdf", "ru-resident-normal",
         "extra.extra-ip-registration-place", "ipRegistrationPlace", 1,
         553.99, 13.44,
         (63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62), 8),
    Case("anketa-ip-sz", "anketa-ip-sz.pdf", "ru-resident-normal",
         "field.client-rep-full-name", "representativeName", 2,
         155.90, 15.72,
         (63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62), 8),
    Case("anketa-ip-sz", "anketa-ip-sz.pdf", "ru-resident-normal",
         "extra.extra-beneficiary-name", "beneficiaryName", 2,
         280.49, 18.24,
         (63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62), 8),
    Case("anketa-ip-sz", "anketa-ip-sz.pdf", "ru-resident-normal",
         "extra.extra-beneficial-owner", "beneficialOwnerName", 2,
         366.53, 13.44,
         (63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62), 8),
    Case("anketa-yul", "anketa-yul.pdf", "en-company-normal",
         "field.client-english-name", "foreignName", 0, 234.02, 13.44,
         (63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62), 11),
    Case("anketa-yul", "anketa-yul.pdf", "ru-company-normal",
         "field.client-registration-authority", "stateRegistrationAuthority",
         0, 554.59, 19.92,
         (63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62), 8),
    Case("anketa-yul", "anketa-yul.pdf", "ru-company-normal",
         "extra.pre2002-registration-document", "pre2002RegistrationDocument",
         0, 594.07, 19.92,
         (63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62), 8),
    Case("anketa-yul", "anketa-yul.pdf", "ru-company-normal",
         "extra.pre2002-registration-authority", "pre2002RegistrationAuthority",
         0, 653.86, 19.92,
         (63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62), 8),
    Case("anketa-yul", "anketa-yul.pdf", "ru-company-normal",
         "extra.licence-authority", "licenceAuthority", 2, 193.94, 17.40,
         (63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62), 6),
    Case("anketa-yul", "anketa-yul.pdf", "en-company-normal",
         "extra.bank-address", "bankAddress", 2, 289.01, 17.40,
         (63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62), 6),
    Case("broker-use-refusal-request", "broker-use-refusal-request.pdf",
         "ru-company-normal", "field.client-full-name", "clientName", 0,
         195.86, 20.28, (56.76, 248.21, 545.86), 8),
    Case("order-forms", "order-forms.pdf", "ru-company-normal",
         "field.client-full-name", "tradeClientName", 0, 228.02, 20.40,
         (56.78, 248.21, 545.88), 8),
    Case("regulation-full-refusal-notice",
         "regulation-full-refusal-notice.pdf", "ru-company-normal",
         "field.client-full-name", "clientName", 0, 202.70, 20.40,
         (56.76, 248.21, 545.86), 8),
    Case("regulation-partial-refusal-notice",
         "regulation-partial-refusal-notice.pdf", "ru-company-normal",
         "field.client-full-name", "clientName", 0, 182.54, 20.40,
         (56.76, 248.21, 545.86), 8),
)


RENDER = r"""
(async function (documentId, profileId, source, value) {
  const template = CRMDocumentEngine.fieldMaps[documentId];
  const project = CRMDocumentBuilder.schema.fromProduction(template, null);
  const payload = CRMDocumentBuilder.fixtures.payloadFor(profileId, project);
  const dot = source.indexOf('.');
  const namespace = source.slice(0, dot), key = source.slice(dot + 1);
  const target = namespace === 'subject' ? payload.subject
    : namespace === 'field' ? payload.fields
    : namespace === 'extra' ? payload.extraValues : payload.checks;
  target[key] = value;
  const field = (template.fields || []).find(function (item) {
    return item.id === FIELD;
  });
  if (field && field.showWhen && field.showWhen.source) {
    const condition = field.showWhen;
    const conditionDot = condition.source.indexOf('.');
    const conditionNamespace = condition.source.slice(0, conditionDot);
    const conditionKey = condition.source.slice(conditionDot + 1);
    const conditionTarget = conditionNamespace === 'subject' ? payload.subject
      : conditionNamespace === 'field' ? payload.fields
      : conditionNamespace === 'extra' ? payload.extraValues : payload.checks;
    conditionTarget[conditionKey] = Array.isArray(condition.equals)
      ? condition.equals[0] : condition.equals;
  }
  const notes = [];
  const blob = await CRMDocumentEngine.overlayRenderer.render(template, payload, {
    onExpansion: function (items) {
      items.forEach(function (item) { notes.push(item); });
    }
  });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return JSON.stringify({ pdf: btoa(binary), notes: notes });
}(DOC, PROFILE, SOURCE, VALUE))
"""


class Checks:
    def __init__(self) -> None:
        self.results: list[tuple[str, bool, str]] = []

    def check(self, name: str, ok: bool, detail: str = "") -> None:
        self.results.append((name, bool(ok), detail))

    def report(self) -> int:
        failures = [result for result in self.results if not result[1]]
        for name, ok, detail in self.results:
            if not ok:
                print(f"FAIL  {name}\n      {detail}")
        print(f"\nTable-cell expansion: "
              f"{len(self.results) - len(failures)}/{len(self.results)} checks passed")
        return 1 if failures else 0


class Renderer:
    def __init__(self, browser: Chrome, server: Server) -> None:
        self.browser = browser
        browser.goto(server.base + "/tools/document-map-audit.html")

    def render(self, case: Case, value: str) -> tuple[bytes, list[dict]]:
        script = (RENDER.replace("DOC", json.dumps(case.document))
                  .replace("PROFILE", json.dumps(case.profile))
                  .replace("FIELD", json.dumps(case.field))
                  .replace("SOURCE", json.dumps(case.source))
                  .replace("VALUE", json.dumps(value)))
        result = json.loads(self.browser.eval(script, await_promise=True))
        return base64.b64decode(result["pdf"]), result["notes"]


def horizontal_rectangles(page: fitz.Page, top: float) -> list[fitz.Rect]:
    result = []
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        if (any(item[0] == "re" for item in drawing["items"])
                and rect.width > 10 and 0.35 <= rect.height <= 0.65
                and abs(rect.y0 - top) <= 0.04):
            result.append(rect)
    return result


def generated_verticals(page: fitz.Page, top: float,
                        bottom: float) -> list[tuple[float, float]]:
    result = []
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        if (any(item[0] == "l" for item in drawing["items"])
                and abs(rect.x1 - rect.x0) <= 0.02
                and abs(rect.y0 - top) <= 0.04
                and abs(rect.y1 - bottom) <= 0.04):
            result.append((round(rect.x0, 2), float(drawing.get("width") or 0)))
    return result


def generated_horizontals(page: fitz.Page, top: float,
                          bottom: float) -> list[fitz.Rect]:
    result = []
    for drawing in page.get_drawings():
        rect = drawing["rect"]
        if (any(item[0] == "l" for item in drawing["items"])
                and rect.width > 10 and rect.height <= 0.02
                and top - 0.04 <= rect.y0 <= bottom + 0.04):
            result.append(rect)
    return result


def expansion_inventory(browser: Chrome) -> dict:
    raw = browser.eval(r"""
      JSON.stringify(Object.keys(CRMDocumentEngine.fieldMaps).sort().reduce(
        function (out, id) {
          const template = CRMDocumentEngine.fieldMaps[id];
          (template.fields || []).forEach(function (field) {
            if (field.overflowStrategy !== 'expand-layout') return;
            out.fields.push({ document: id, id: field.id, source: field.source,
              lineStyle: field.expansion && field.expansion.lineStyle,
              insertionTop: field.expansion && field.expansion.insertionTop,
              rowHeight: field.expansion && field.expansion.rowHeight,
              columns: field.expansion && field.expansion.columns,
              borders: field.expansion && field.expansion.borders });
          });
          (template.wordFlowBlocks || []).forEach(function (block) {
            if (block.overflowStrategy !== 'expand-layout') return;
            out.blocks.push({ document: id, id: block.id,
              lineStyle: block.expansion && block.expansion.lineStyle });
          });
          return out;
        }, { fields: [], blocks: [] }))
    """)
    return json.loads(raw)


def main() -> int:
    server, browser = Server(), Chrome()
    checks = Checks()
    try:
        renderer = Renderer(browser, server)
        inventory = expansion_inventory(browser)
        actual = {(entry["document"], entry["id"])
                  for entry in inventory["fields"]}
        expected = {(case.document, case.field) for case in CASES}

        checks.check("all field expansion anchors are explicitly reviewed",
                     actual == expected,
                     json.dumps(sorted(actual), ensure_ascii=False))
        checks.check("all retained field anchors are multiline table cells",
                     all(entry["lineStyle"] == "table-row"
                         for entry in inventory["fields"]),
                     json.dumps(inventory["fields"], ensure_ascii=False))
        checks.check("no independent underline continuation remains",
                     not any(entry["lineStyle"] in
                             {"underline", "independent-form-row"}
                             for entry in inventory["fields"]))
        checks.check("no exact-token field retains expansion",
                     not any(any(token in entry["source"].lower() for token in
                                 ("inn", "ogrn", "kpp", "passport-series",
                                  "passport-number", "date", "account-number"))
                             for entry in inventory["fields"]),
                     json.dumps(inventory["fields"], ensure_ascii=False))
        # Eighteen reviewed Word-flow anchors, and only three of them may draw
        # a table row: the three payment-purpose rows of the account-opening
        # notice, the only reviewed paragraphs that live in a bordered table and
        # therefore the only ones a grown line has to extend a rule for. Every
        # other reviewed paragraph reflows in open page space and must keep
        # `lineStyle: none`, or it would start painting rules the form has not
        # got. This is stated as an exact set, not a count, so a new table-row
        # block has to be named here before it can draw anything.
        BORDERED_BLOCKS = {
            ("account-opening-notice", "account-opening-payment-purpose-stock"),
            ("account-opening-notice", "account-opening-payment-purpose-currency"),
            ("account-opening-notice", "account-opening-payment-purpose-derivatives"),
        }
        drawing = {(entry["document"], entry["id"])
                   for entry in inventory["blocks"]
                   if entry["lineStyle"] == "table-row"}
        checks.check("only the bordered payment-purpose rows grow a table row",
                     drawing == BORDERED_BLOCKS,
                     json.dumps(sorted(drawing), ensure_ascii=False))
        checks.check("every other reviewed Word-flow anchor stays lineStyle none",
                     # 18 until the updated account-opening notice made its
                     # introduction paragraph static and removed that block.
                     len(inventory["blocks"]) == 17 and
                     all(entry["lineStyle"] == "none"
                         for entry in inventory["blocks"]
                         if (entry["document"], entry["id"]) not in BORDERED_BLOCKS),
                     json.dumps(inventory["blocks"], ensure_ascii=False))

        metadata = {(entry["document"], entry["id"]): entry
                    for entry in inventory["fields"]}
        long_outputs: dict[tuple[str, str], bytes] = {}

        for case in CASES:
            prefix = f"{case.document}/{case.field}"
            entry = metadata[(case.document, case.field)]
            checks.check(prefix + ": measured insertion and row pitch",
                         abs(float(entry["insertionTop"]) - case.insertion_top) < 0.001
                         and abs(float(entry["rowHeight"]) - case.row_height) < 0.001,
                         json.dumps(entry, ensure_ascii=False))
            checks.check(prefix + ": measured rule centre-lines",
                         tuple(round(float(x), 2) for x in entry["columns"])
                         == case.columns,
                         json.dumps(entry["columns"]))
            checks.check(prefix + ": source border is reused, not duplicated",
                         entry["borders"] == {"left": False, "right": False,
                                              "top": False, "bottom": False},
                         json.dumps(entry["borders"]))

            short_pdf, short_notes = renderer.render(case, TOKEN)
            long_value = " ".join([TOKEN] * case.long_words)
            long_pdf, long_notes = renderer.render(case, long_value)
            long_outputs[(case.document, case.field)] = long_pdf

            target_short = [note for note in short_notes
                            if note.get("fieldId") == case.field]
            target_long = [note for note in long_notes
                           if note.get("fieldId") == case.field]
            checks.check(prefix + ": short value adds no row", not target_short,
                         json.dumps(short_notes, ensure_ascii=False))
            checks.check(prefix + ": realistic long value adds exactly one row",
                         len(target_long) == 1 and target_long[0].get("rows") == 1
                         and abs(float(target_long[0].get("delta"))
                                 - case.row_height) < 0.001,
                         json.dumps(long_notes, ensure_ascii=False))

            short_doc = fitz.open(stream=short_pdf, filetype="pdf")
            long_doc = fitz.open(stream=long_pdf, filetype="pdf")
            source_doc = fitz.open(os.path.join(TEMPLATES, case.template))
            checks.check(prefix + ": authoritative page count is retained",
                         short_doc.page_count == long_doc.page_count
                         == source_doc.page_count)

            short_page, long_page = short_doc[case.page], long_doc[case.page]
            source_page = source_doc[case.page]
            original_rules = horizontal_rectangles(source_page, case.rule_top)
            short_rules = horizontal_rectangles(short_page, case.rule_top)
            long_rules = horizontal_rectangles(long_page, case.rule_top)
            shifted_rules = horizontal_rectangles(
                long_page, case.rule_top + case.row_height)
            checks.check(prefix + ": short output keeps the source boundary",
                         bool(original_rules) and len(short_rules) == len(original_rules),
                         f"source={len(original_rules)} short={len(short_rules)}")
            checks.check(prefix + ": source bottom border moves to close expansion",
                         not long_rules and len(shifted_rules) >= len(original_rules),
                         f"old={len(long_rules)} shifted={len(shifted_rules)} "
                         f"source={len(original_rules)}")

            verticals = generated_verticals(
                long_page, case.insertion_top,
                case.insertion_top + case.row_height)
            checks.check(prefix + ": generated verticals match source columns",
                         tuple(x for x, _width in verticals) == case.columns,
                         json.dumps(verticals))
            # A table whose source draws no vertical rules must not acquire any:
            # for those rows the check above already asserts «none», and a
            # weight assertion would have nothing to measure.
            if case.columns:
                checks.check(prefix + ": generated rules retain 0.48 pt weight",
                             verticals and all(abs(width - 0.48) <= 0.01
                                               for _x, width in verticals),
                             json.dumps(verticals))
            checks.check(prefix + ": no synthetic horizontal separator is added",
                         not generated_horizontals(
                             long_page, case.insertion_top,
                             case.insertion_top + case.row_height))
            checks.check(prefix + ": dynamic value is extractable exactly once",
                         long_page.get_text().count(TOKEN) == case.long_words,
                         str(long_page.get_text().count(TOKEN)))

            reader = pypdf.PdfReader(stream=io.BytesIO(long_pdf))
            fields = reader.get_fields() or {}
            annotations = sum(len(page.get("/Annots", [])) for page in reader.pages)
            # Two of the authoritative templates print a live URL and a mailto
            # link. Those are the source's own /Link annotations, not widgets:
            # the invariant is that expansion adds none, not that none exists.
            source_reader = pypdf.PdfReader(os.path.join(TEMPLATES, case.template))
            source_annotations = sum(len(page.get("/Annots", []))
                                     for page in source_reader.pages)
            checks.check(prefix + ": expansion introduces no form or annotation",
                         not fields and annotations == source_annotations,
                         f"fields={len(fields)} annots={annotations} "
                         f"source={source_annotations}")

        # One repeated production render protects deterministic operator moves
        # without doubling the runtime for every map.
        representative = CASES[-2]
        repeated, _ = renderer.render(
            representative, " ".join([TOKEN] * representative.long_words))
        first = long_outputs[(representative.document, representative.field)]
        first_page = fitz.open(stream=first, filetype="pdf")[representative.page]
        repeated_page = fitz.open(stream=repeated,
                                  filetype="pdf")[representative.page]
        first_geometry = generated_verticals(
            first_page, representative.insertion_top,
            representative.insertion_top + representative.row_height)
        repeated_geometry = generated_verticals(
            repeated_page, representative.insertion_top,
            representative.insertion_top + representative.row_height)
        first_hits = [tuple(round(value, 3) for value in rect)
                      for rect in first_page.search_for(TOKEN)]
        repeated_hits = [tuple(round(value, 3) for value in rect)
                         for rect in repeated_page.search_for(TOKEN)]
        checks.check("table-cell operator rewrite is geometrically deterministic",
                     first_geometry == repeated_geometry and
                     first_hits == repeated_hits and
                     first_page.get_text() == repeated_page.get_text())
    finally:
        browser.stop()
        server.stop()

    return checks.report()


if __name__ == "__main__":
    sys.exit(main())
