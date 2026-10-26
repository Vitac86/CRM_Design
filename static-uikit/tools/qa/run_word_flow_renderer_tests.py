"""Focused end-to-end QA for reviewed Word-flow PDF replacement.

    python static-uikit/tools/qa/run_word_flow_renderer_tests.py

Uses the real Power of Attorney and legal-entity accession templates. The
browser performs production preflight/rendering; Python then checks the saved
PDF structure and extracted text.
"""

from __future__ import annotations

import base64
import io
import json
import os
import sys

import fitz
import pypdf

from headless_browser import Chrome, Server, STATIC_UIKIT


SCRIPT = r"""
(async function () {
  const renderer = CRMDocumentEngine.overlayRenderer;

  function payloadFor(id, profile, values) {
    const template = CRMDocumentEngine.fieldMaps[id];
    const project = CRMDocumentBuilder.schema.fromProduction(template, null);
    const payload = CRMDocumentBuilder.fixtures.payloadFor(profile, project);
    Object.keys(values).forEach(function (path) {
      const dot = path.indexOf('.');
      const namespace = path.slice(0, dot), key = path.slice(dot + 1);
      const target = namespace === 'subject' ? payload.subject
        : namespace === 'field' ? payload.fields
        : namespace === 'extra' ? payload.extraValues : payload.checks;
      target[key] = values[path];
    });
    return payload;
  }

  function binary(bytes) {
    let out = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(out);
  }

  function auditSummary(preflight) {
    return {
      ok: preflight.ok,
      expansion: preflight.expansion,
      pages: (preflight.reviewedRanges || []).map(function (entry) {
        return {
          page: entry.page,
          totalBlocks: entry.inspection.totalBlocks,
          templateSha256: entry.inspection.templateSha256,
          ranges: entry.inspection.ranges.map(function (range) {
            return {
              id: range.id,
              firstBlock: range.firstBlock,
              lastBlock: range.lastBlock,
              blockCount: range.blockCount,
              sha256: range.sha256
            };
          })
        };
      })
    };
  }

  async function produce(id, profile, values) {
    const template = CRMDocumentEngine.fieldMaps[id];
    const payload = payloadFor(id, profile, values);
    const preflight = await renderer.preflight(template, payload);
    let reviewed = [];
    const blob = await renderer.render(template, payload, {
      onReviewedRanges: function (entries) { reviewed = entries; }
    });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return {
      pdf: binary(bytes),
      preflight: auditSummary(preflight),
      suppressed: reviewed.map(function (entry) {
        return {
          page: entry.page,
          removedBlocks: entry.suppression.removedBlocks,
          ids: entry.suppression.ranges.map(function (range) { return range.id; })
        };
      })
    };
  }

  const poaValues = {
    'field.client-full-legal-name': 'ALPHA FLOW COMPANY',
    'field.client-ogrn': '1217700011256',
    'subject.inn': '7701234567',
    'field.client-rep-full-name': 'SMITH JOHN',
    'field.client-rep-authority': 'CHARTER',
    'extra.extra-attorney-name': 'BROWN ROBERT',
    'extra.extra-attorney-citizenship': 'CANADA',
    'extra.extra-attorney-passport': 'AB123456',
    'extra.extra-attorney-issued-by': 'FLOW AUTHORITY',
    'extra.extra-attorney-issue-date': '31.07.2026',
    'extra.extra-attorney-address': 'FLOW STREET 42',
    'extra.extra-poa-city': 'MOSCOW',
    'extra.extra-poa-date-words': 'THIRTY FIRST JULY'
  };
  const accessionValues = {
    'field.client-full-legal-name':
      'BETA INTERNATIONAL INVESTMENT TECHNOLOGIES LIMITED LIABILITY COMPANY',
    'field.client-english-name': 'BETA EN',
    'field.client-ogrn': '1027700132195',
    'field.client-legal-address': 'FLOW AVENUE 7',
    'field.representativeSignerLine': 'GAMMA SIGNER, DIRECTOR',
    'field.representativeAuthority': 'FLOW CHARTER'
  };
  const poaIndividualValues = {
    'field.clientFullName': 'DELTA PRINCIPAL',
    'subject.citizenship': 'CANADA',
    'field.passportSeriesNumber': 'CD987654',
    'field.client-passport-issued-by': 'DELTA AUTHORITY',
    'field.client-passport-issue-date': '30.07.2026',
    'field.client-registration-address': 'DELTA STREET 10',
    'extra.extra-attorney-name': 'ZETANAME',
    'extra.extra-attorney-citizenship': 'FRANCE',
    'extra.extra-attorney-passport-series': 'EF',
    'extra.extra-attorney-passport-number': '654321',
    'extra.extra-attorney-issued-by': 'OMEGA OFFICE',
    'extra.extra-attorney-issue-date': '31.07.2026',
    'extra.extra-attorney-address': 'OMEGA ROAD 9',
    'extra.extra-poa-date-words': 'THIRTIETH JULY'
  };

  const poa = await produce('power-of-attorney', 'ru-company-normal', poaValues);
  const poaIndividual = await produce(
    'power-of-attorney', 'ru-resident-normal', poaIndividualValues);
  const accession = await produce(
    'accession-application-yul', 'ru-company-normal', accessionValues);

  const original = CRMDocumentEngine.fieldMaps['power-of-attorney'];
  const bad = Object.assign({}, original, {
    wordFlowBlocks: original.wordFlowBlocks.map(function (block, index) {
      if (index !== 0) return block;
      return Object.assign({}, block, {
        sourceReplacement: Object.assign({}, block.sourceReplacement, {
          expectedSha256: '0'.repeat(64)
        })
      });
    })
  });
  let driftCode = 'resolved';
  try {
    await renderer.preflight(
      bad, payloadFor('power-of-attorney', 'ru-company-normal', poaValues));
  } catch (error) {
    driftCode = error && error.code ? error.code : String(error);
  }

  const conditionalTemplate = {
    fields: [
      {
        id: 'personName', source: 'field.person-name', required: true,
        showWhen: { source: 'subject.kind', equals: 'individual' }
      },
      {
        id: 'orgName', source: 'field.org-name', required: true,
        showWhen: { source: 'subject.kind', equals: 'company' }
      }
    ]
  };
  const conditionalBlock = {
    id: 'conditional-flow', font: 'legalSerif', fontSize: 10,
    runs: [
      { type: 'fieldRef', fieldId: 'personName', decoration: { underline: true } },
      { type: 'fieldRef', fieldId: 'orgName', decoration: { underline: true } }
    ]
  };
  const conditionalRuns = renderer.resolveWordFlowRuns(
    conditionalTemplate, conditionalBlock,
    { subject: { kind: 'company' }, fields: { 'org-name': 'ACTIVE ORG' } }
  );

  return JSON.stringify({
    poa: poa,
    poaIndividual: poaIndividual,
    accession: accession,
    driftCode: driftCode,
    conditionalRuns: conditionalRuns
  });
}())
"""


class Checks:
    def __init__(self) -> None:
        self.results: list[tuple[str, bool, str]] = []

    def check(self, name: str, ok, detail="") -> None:
        self.results.append((name, bool(ok), str(detail)))

    def report(self) -> int:
        failed = [item for item in self.results if not item[1]]
        for name, _ok, detail in failed:
            print(f"FAIL  {name}\n      {detail}")
        print(f"\nWord-flow renderer: {len(self.results) - len(failed)}"
              f"/{len(self.results)} checks passed")
        return 1 if failed else 0


def content_streams(reader: pypdf.PdfReader, page_index: int) -> list[bytes]:
    contents = reader.pages[page_index].get("/Contents")
    if contents is None:
        return []
    resolved = contents.get_object()
    if isinstance(resolved, pypdf.generic.ArrayObject):
        return [entry.get_object().get_data() for entry in resolved]
    return [resolved.get_data()]


def inspect_pdf(checks: Checks, label: str, encoded: str, expected_pages: int,
                unique_values: list[str], source_path: str,
                shifted_anchor: tuple[str, float] | None = None,
                flow_page: int = 0) -> None:
    data = base64.b64decode(encoded)
    document = fitz.open(stream=data, filetype="pdf")
    reader = pypdf.PdfReader(io.BytesIO(data))
    source = fitz.open(source_path)
    text = "\n".join(page.get_text() for page in document)

    checks.check(f"{label}: authoritative page count retained",
                 document.page_count == expected_pages,
                 f"{document.page_count} vs {expected_pages}")
    checks.check(f"{label}: no AcroForm or widgets",
                 not document.is_form_pdf and
                 all(not list(page.widgets() or []) for page in document))
    checks.check(f"{label}: no annotations introduced",
                 all(not list(page.annots() or []) for page in document))
    checks.check(f"{label}: source image counts retained",
                 [len(page.get_images(full=True)) for page in document] ==
                 [len(page.get_images(full=True)) for page in source])
    for value in unique_values:
        checks.check(f"{label}: {value} is extractable exactly once",
                     text.count(value) == 1, text.count(value))

    streams = [stream for page in range(len(reader.pages))
               for stream in content_streams(reader, page)]
    checks.check(f"{label}: no reviewed marker survives the saved PDF",
                 all(b"% CRM_REVIEWED_RANGE " not in stream for stream in streams))
    # The replacement stream contains both untouched Word marked-content
    # operators and the embedded Liberation Serif font used by styled runs.
    # This distinguishes marker insertion from an unrelated appended overlay.
    flow_streams = content_streams(reader, flow_page)
    checks.check(f"{label}: styled-run operators occupy the rewritten source stream",
                 any(b"/LiberationSerif" in stream and b"BDC" in stream
                     for stream in flow_streams),
                 [len(stream) for stream in flow_streams])
    if shifted_anchor:
        needle, expected_delta = shifted_anchor
        source_hits = source[0].search_for(needle)
        rendered_hits = document[0].search_for(needle)
        actual_delta = (rendered_hits[0].y0 - source_hits[0].y0
                        if source_hits and rendered_hits else None)
        checks.check(f"{label}: reviewed lower source content takes the exact line shift",
                     actual_delta is not None and
                     abs(actual_delta - expected_delta) < 0.2,
                     actual_delta)


def main() -> int:
    checks = Checks()
    server, browser = Server(), Chrome()
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")
        result = json.loads(browser.eval(SCRIPT, await_promise=True))
    finally:
        browser.stop()
        server.stop()

    poa_pre = result["poa"]["preflight"]
    checks.check("PoA preflight proves only the active company ranges",
                 poa_pre["ok"] and len(poa_pre["pages"]) == 1 and
                 poa_pre["pages"][0]["page"] == 0 and
                 [item["id"] for item in poa_pre["pages"][0]["ranges"]] == [
                     "power-of-attorney-ul-date", "power-of-attorney-ul-intro"
                 ], json.dumps(poa_pre, ensure_ascii=False))
    checks.check("PoA preflight verifies authoritative template SHA-256",
                 poa_pre["pages"][0]["templateSha256"] ==
                 "a7bcaf8dc97cf1a368b8a22d024c9d9f44e5fb3cef42dc64d56890d03a62a801")
    checks.check("PoA render suppresses the two exact ranges before drawing",
                 result["poa"]["suppressed"] == [{
                     "page": 0,
                     "removedBlocks": 92,
                     "ids": ["power-of-attorney-ul-date", "power-of-attorney-ul-intro"]
                 }], json.dumps(result["poa"]["suppressed"]))

    poa_individual_pre = result["poaIndividual"]["preflight"]
    checks.check("PoA preflight selects only the individual page ranges",
                 poa_individual_pre["ok"] and
                 len(poa_individual_pre["pages"]) == 1 and
                 poa_individual_pre["pages"][0]["page"] == 2 and
                 [item["id"] for item in
                  poa_individual_pre["pages"][0]["ranges"]] == [
                     "power-of-attorney-fl-date", "power-of-attorney-fl-intro"
                 ], json.dumps(poa_individual_pre, ensure_ascii=False))
    checks.check("PoA individual render suppresses its exact 108 blocks",
                 result["poaIndividual"]["suppressed"] == [{
                     "page": 2,
                     "removedBlocks": 108,
                     "ids": ["power-of-attorney-fl-date", "power-of-attorney-fl-intro"]
                 }], json.dumps(result["poaIndividual"]["suppressed"]))

    accession_pre = result["accession"]["preflight"]
    checks.check("accession preflight proves its active applicant range",
                 accession_pre["ok"] and len(accession_pre["pages"]) == 1 and
                 accession_pre["pages"][0]["totalBlocks"] == 221 and
                 accession_pre["pages"][0]["ranges"][0]["id"] ==
                 "accession-application-yul-applicant" and
                 accession_pre["pages"][0]["ranges"][0]["blockCount"] == 34,
                 json.dumps(accession_pre, ensure_ascii=False))
    # Page 1 of the company accession form carries two reviewed ranges: the
    # 34-block applicant paragraph and the 2-block report-delivery e-mail line
    # (its printed blank and the parenthetical instruction beside it).
    checks.check("accession render suppresses exactly 36 reviewed blocks",
                 result["accession"]["suppressed"] == [{
                     "page": 0,
                     "removedBlocks": 36,
                     "ids": ["accession-application-yul-applicant",
                             "accession-application-yul-report-email"]
                 }], json.dumps(result["accession"]["suppressed"]))
    checks.check("accession Word-flow consumes one complete locked line",
                 accession_pre["expansion"] == [{
                     "page": 0,
                     "fieldId": "accession-application-yul-applicant",
                     "label": "accession-application-yul-applicant",
                     "rows": 1,
                     "delta": 9.72,
                     "remaining": 32.14
                 }], json.dumps(accession_pre["expansion"], ensure_ascii=False))
    checks.check("preflight rejects reviewed-range byte drift",
                 result["driftCode"] == "range-hash-drift", result["driftCode"])
    conditional = result["conditionalRuns"]
    checks.check("inactive conditional field references are empty and non-required",
                 not conditional["missing"] and
                 conditional["runs"][0]["inactive"] and
                 conditional["runs"][0]["text"] == "" and
                 "decoration" not in conditional["runs"][0] and
                 conditional["runs"][1]["text"] == "ACTIVE ORG" and
                 conditional["values"] == {"orgName": "ACTIVE ORG"},
                 json.dumps(conditional, ensure_ascii=False))

    templates = os.path.join(STATIC_UIKIT, "assets", "document-pdf-templates")
    inspect_pdf(
        checks, "PoA", result["poa"]["pdf"], 4,
        ["ALPHA FLOW COMPANY", "1217700011256", "7701234567",
         "BROWN ROBERT", "FLOW AUTHORITY", "FLOW STREET 42"],
        os.path.join(templates, "power-of-attorney.pdf"))
    inspect_pdf(
        checks, "PoA individual", result["poaIndividual"]["pdf"], 4,
        ["DELTA PRINCIPAL", "CD987654", "DELTA AUTHORITY",
         "ZETANAME", "OMEGA OFFICE", "OMEGA ROAD 9"],
        os.path.join(templates, "power-of-attorney.pdf"), flow_page=2)
    inspect_pdf(
        checks, "accession", result["accession"]["pdf"], 2,
        ["BETA INTERNATIONAL INVESTMENT TECHNOLOGIES", "1027700132195", "FLOW AVENUE 7",
         "GAMMA SIGNER", "FLOW CHARTER"],
        os.path.join(templates, "accession-application-yul.pdf"),
        ("Подписанием настоящего заявления Заявитель", 9.72))

    return checks.report()


if __name__ == "__main__":
    sys.exit(main())
