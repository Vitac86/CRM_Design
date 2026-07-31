"""Focused browser QA for reviewed PDF operator ranges and shift-only anchors.

    python static-uikit/tools/qa/run_reviewed_operator_range_tests.py

The checks use the committed Power of Attorney bytes and the production
pdf-lib build. They prove that inspection is non-mutating, reviewed q..Q
ordinals are fail-closed, suppression preserves every unselected byte, and a
flow renderer can replace only the marker left by suppression.
"""

from __future__ import annotations

import json
import sys

from headless_browser import Chrome, Server


SCRIPT = r"""
(async function () {
  const expander = CRMDocumentEngine.pageExpander;
  const PDF = PDFLib;
  const results = [];
  const note = (name, ok, detail) => results.push({
    name: name, ok: !!ok, detail: detail == null ? '' : String(detail)
  });

  function pageText(page) {
    const contents = page.node.Contents();
    const streams = contents instanceof PDF.PDFArray
      ? contents.asArray().map(ref => page.node.context.lookup(ref))
      : [contents];
    return streams.map(function (stream) {
      const bytes = PDF.decodePDFRawStream(stream).decode();
      let out = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      return out;
    }).join('\n');
  }

  function setPageText(doc, page, text) {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i += 1) bytes[i] = text.charCodeAt(i) & 0xff;
    const stream = doc.context.flateStream(bytes);
    page.node.set(PDF.PDFName.of('Contents'), doc.context.register(stream));
  }

  function unitBounds(text) {
    const tokens = expander.tokenize(text);
    const out = [];
    let depth = 0, first = -1;
    tokens.forEach(function (token, index) {
      if (token.type !== 'operator') return;
      if (token.value === 'q') {
        if (depth === 0) first = index;
        depth += 1;
      } else if (token.value === 'Q') {
        depth -= 1;
        if (depth === 0 && first >= 0) {
          out.push({ start: tokens[first].start, end: token.end });
          first = -1;
        }
        if (depth < 0) depth = 0;
      }
    });
    return out;
  }

  async function rejection(code, action) {
    try {
      await action();
      return 'resolved';
    } catch (error) {
      return error && error.code ? error.code : String(error);
    }
  }

  const response = await fetch('../assets/document-pdf-templates/power-of-attorney.pdf');
  const templateBytes = new Uint8Array(await response.arrayBuffer());
  const templateHash = 'a7bcaf8dc97cf1a368b8a22d024c9d9f44e5fb3cef42dc64d56890d03a62a801';
  const ranges = [
    {
      id: 'poa-ul-heading',
      firstBlock: 22,
      lastBlock: 31,
      expectedBlockCount: 10,
      expectedPageBlockCount: 165,
      expectedSha256: 'bf9392e9b388f595236845fe2537eed1405e3f02993cbf998993cb7544609ccd',
      expectedTemplateSha256: templateHash,
      reviewStatus: 'approved'
    },
    {
      id: 'poa-ul-intro',
      firstBlock: 32,
      lastBlock: 113,
      expectedBlockCount: 82,
      expectedPageBlockCount: 165,
      expectedSha256: '77806e87d7311e603578a81f84812df0e6e08b166fa39e2102ad579867dd5a3b',
      expectedTemplateSha256: templateHash,
      reviewStatus: 'approved'
    }
  ];

  const doc = await PDF.PDFDocument.load(templateBytes);
  const page = doc.getPage(0);
  const original = pageText(page);
  const originalUnits = unitBounds(original);
  const inspection = await expander.inspectReviewedRanges(doc, page, ranges, {
    templateBytes: templateBytes,
    expectedPageBlockCount: 165
  });
  note('inspection reports exact audited ordinals and hashes',
    inspection.totalBlocks === 165 && inspection.ranges.length === 2 &&
    inspection.ranges[0].startByte === 3328 && inspection.ranges[0].endByte === 4612 &&
    inspection.ranges[1].startByte === 4614 && inspection.ranges[1].endByte === 15601,
    JSON.stringify(inspection));
  note('inspection is non-mutating', pageText(page) === original);
  note('template bytes are independently SHA-256 verified',
    inspection.templateSha256 === templateHash, inspection.templateSha256);

  const suppression = await expander.suppressReviewedRanges(doc, page, ranges, {
    templateBytes: templateBytes,
    expectedPageBlockCount: 165
  });
  const suppressed = pageText(page);
  const selected = {};
  ranges.forEach(function (range) {
    for (let ordinal = range.firstBlock; ordinal <= range.lastBlock; ordinal += 1) {
      selected[ordinal] = ordinal === range.firstBlock
        ? expander.reviewedRangeMarker(range.id) : '';
    }
  });
  const pieces = [];
  let cursor = 0;
  originalUnits.forEach(function (unit, index) {
    const ordinal = index + 1;
    if (!Object.prototype.hasOwnProperty.call(selected, ordinal)) return;
    pieces.push(original.slice(cursor, unit.start));
    pieces.push(selected[ordinal]);
    cursor = unit.end;
  });
  pieces.push(original.slice(cursor));
  const expectedSuppressed = pieces.join('');
  note('suppression removes every reviewed block exactly once',
    suppression.removedBlocks === 92, suppression.removedBlocks);
  note('suppression preserves every other decoded operator byte',
    suppressed === expectedSuppressed,
    'actual=' + suppressed.length + ' expected=' + expectedSuppressed.length);
  note('suppression leaves one unique marker per range', ranges.every(function (range) {
    const marker = expander.reviewedRangeMarker(range.id);
    return suppressed.indexOf(marker) >= 0 &&
      suppressed.indexOf(marker, suppressed.indexOf(marker) + marker.length) < 0;
  }));

  const replacementA = 'q\n1 0 0 1 0 0 cm\nQ\n';
  const replacementB = 'q\n0 0 m\n1 1 l\nS\nQ\n';
  const expectedReplaced = suppressed
    .replace(expander.reviewedRangeMarker(ranges[0].id), replacementA)
    .replace(expander.reviewedRangeMarker(ranges[1].id), replacementB);
  const replacement = expander.replaceReviewedRangeContents(doc, page, [
    { id: ranges[0].id, content: replacementA },
    { id: ranges[1].id, content: replacementB }
  ]);
  note('marker replacement changes only the marker bytes',
    replacement.replaced === 2 && pageText(page) === expectedReplaced,
    JSON.stringify(replacement));
  const saved = await doc.save();
  const reopened = await PDF.PDFDocument.load(saved);
  note('suppressed and replaced content remains a valid saveable PDF',
    pageText(reopened.getPage(0)) === expectedReplaced);

  const afterReplacement = pageText(page);
  const missingCode = await rejection('missing-range-marker', function () {
    return expander.replaceReviewedRangeContent(doc, page, ranges[0].id, 'q Q\n');
  });
  note('replacement rejects a missing marker without mutation',
    missingCode === 'missing-range-marker' && pageText(page) === afterReplacement,
    missingCode);

  const duplicateDoc = await PDF.PDFDocument.load(templateBytes);
  const duplicatePage = duplicateDoc.getPage(0);
  await expander.suppressReviewedRanges(duplicateDoc, duplicatePage, ranges[0], {
    templateSha256: templateHash
  });
  const marker = expander.reviewedRangeMarker(ranges[0].id);
  setPageText(duplicateDoc, duplicatePage, pageText(duplicatePage) + marker);
  const duplicateBefore = pageText(duplicatePage);
  const duplicateCode = await rejection('duplicate-range-marker', function () {
    return expander.replaceReviewedRangeContent(
      duplicateDoc, duplicatePage, ranges[0].id, 'q Q\n');
  });
  note('replacement rejects duplicate markers without mutation',
    duplicateCode === 'duplicate-range-marker' && pageText(duplicatePage) === duplicateBefore,
    duplicateCode);

  const reservedBefore = pageText(duplicatePage);
  const reservedCode = await rejection('reserved-marker-content', function () {
    return expander.replaceReviewedRangeContent(
      duplicateDoc, duplicatePage, ranges[0].id, marker);
  });
  note('replacement content cannot forge a reviewed-range marker',
    reservedCode === 'reserved-marker-content' && pageText(duplicatePage) === reservedBefore,
    reservedCode);

  async function fresh() {
    const candidate = await PDF.PDFDocument.load(templateBytes);
    return { doc: candidate, page: candidate.getPage(0) };
  }

  let candidate = await fresh();
  let beforeFailure = pageText(candidate.page);
  const hashDrift = Object.assign({}, ranges[0], { expectedSha256: '0'.repeat(64) });
  const hashCode = await rejection('range-hash-drift', function () {
    return expander.suppressReviewedRanges(candidate.doc, candidate.page, hashDrift, {
      templateSha256: templateHash
    });
  });
  note('range SHA-256 drift rejects before mutation',
    hashCode === 'range-hash-drift' && pageText(candidate.page) === beforeFailure, hashCode);

  candidate = await fresh();
  beforeFailure = pageText(candidate.page);
  const overlap = Object.assign({}, ranges[1], {
    id: 'overlap', firstBlock: 30, lastBlock: 40, expectedBlockCount: 11
  });
  const overlapCode = await rejection('overlapping-ranges', function () {
    return expander.suppressReviewedRanges(candidate.doc, candidate.page,
      [ranges[0], overlap], { templateSha256: templateHash });
  });
  note('overlapping reviewed ranges reject before mutation',
    overlapCode === 'overlapping-ranges' && pageText(candidate.page) === beforeFailure,
    overlapCode);

  const unapproved = Object.assign({}, ranges[0], { reviewStatus: 'pending' });
  const statusCode = await rejection('range-not-approved', function () {
    return expander.inspectReviewedRanges(candidate.doc, candidate.page, unapproved, {
      templateSha256: templateHash
    });
  });
  note('unapproved ranges fail closed', statusCode === 'range-not-approved', statusCode);

  const countDrift = Object.assign({}, ranges[0], { expectedPageBlockCount: 164 });
  const countCode = await rejection('page-block-count-drift', function () {
    return expander.inspectReviewedRanges(candidate.doc, candidate.page, countDrift, {
      templateSha256: templateHash
    });
  });
  note('whole-page block-count drift fails closed',
    countCode === 'page-block-count-drift', countCode);

  const templateDrift = Object.assign({}, ranges[0], {
    expectedTemplateSha256: '0'.repeat(64)
  });
  const templateCode = await rejection('template-hash-drift', function () {
    return expander.inspectReviewedRanges(candidate.doc, candidate.page, templateDrift, {
      templateBytes: templateBytes
    });
  });
  note('template SHA-256 drift fails closed',
    templateCode === 'template-hash-drift', templateCode);

  const proofCode = await rejection('template-proof-required', function () {
    return expander.inspectReviewedRanges(candidate.doc, candidate.page, ranges[0]);
  });
  note('a declared template hash requires independent template proof',
    proofCode === 'template-proof-required', proofCode);

  const wordFlowBlock = {
    id: 'qa-word-flow',
    type: 'wordFlowBlock',
    page: 0,
    left: 72,
    width: 420,
    overflowStrategy: 'expand-layout',
    expansion: {
      page: 0,
      insertionTop: 140,
      rowHeight: 14,
      maxExtraRows: 4,
      lineStyle: 'none',
      reviewStatus: 'approved',
      line: { left: 72, width: 420 }
    }
  };
  const shiftOnlyRegion = expander.rowRegion(wordFlowBlock, 0, 0);
  note('a direct wordFlowBlock is accepted as an expansion anchor',
    expander.expansionOf(wordFlowBlock) === wordFlowBlock.expansion);
  note('lineStyle none creates no underline or table geometry',
    shiftOnlyRegion.lineStyle === 'none' && !shiftOnlyRegion.drawUnderline &&
    !shiftOnlyRegion.tableRow, JSON.stringify(shiftOnlyRegion));
  const shiftPlan = expander.planPage(0, [{ field: wordFlowBlock, rows: 2 }], 842, {
    fixedFooterFrom: 806,
    bodyBottom: 760,
    bottomClearance: 4,
    shiftToTop: 780,
    compaction: []
  });
  note('a word-flow anchor opens shift-only complete line increments',
    shiftPlan.errors.length === 0 && shiftPlan.rows.length === 2 &&
    shiftPlan.totalDelta === 28 && shiftPlan.shifts.length === 1 &&
    shiftPlan.rows.every(entry => !entry.region.drawUnderline && !entry.region.tableRow),
    JSON.stringify(shiftPlan));

  const underlineField = {
    id: 'legacy-underline', page: 0, left: 10, width: 100,
    overflowStrategy: 'expand-layout', expansion: {
      page: 0, insertionTop: 100, rowHeight: 12, lineStyle: 'underline'
    }
  };
  const tableField = {
    id: 'legacy-table', page: 0, left: 10, width: 100,
    overflowStrategy: 'expand-layout', expansion: {
      page: 0, insertionTop: 100, rowHeight: 12, lineStyle: 'table-row'
    }
  };
  note('legacy underline and table-row geometry is unchanged',
    !!expander.rowRegion(underlineField, 0, 0).drawUnderline &&
    !!expander.rowRegion(tableField, 0, 0).tableRow);

  return JSON.stringify({ results: results });
}())
"""


def main() -> int:
    server, browser = Server(), Chrome()
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")
        payload = json.loads(browser.eval(SCRIPT, await_promise=True))
    finally:
        browser.stop()
        server.stop()

    failed = [result for result in payload["results"] if not result["ok"]]
    for result in failed:
        print(f"FAIL  {result['name']}\n      {result['detail']}")
    passed = len(payload["results"]) - len(failed)
    print(f"\nReviewed operator ranges: {passed}/{len(payload['results'])} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
