"""Structure of a generated document, checked with two independent parsers.

    python static-uikit/tools/qa/run_structural_pdf_tests.py
    python static-uikit/tools/qa/run_structural_pdf_tests.py --doc power-of-attorney

The page expander rewrites a page's own content stream to move content down. The
guarantee that has to hold is narrow and absolute: **every original operator
outside an approved Word-flow replacement range still appears exactly once**.
Nothing else is removed, duplicated or rasterised, no page is added, and the
text remains extractable as text. Approved ranges are proved by their frozen
template/range SHA-256 values before this test subtracts them from the expected
source stream.

pymupdf and pypdf are used together on purpose. They disagree about clip paths
and about how much of a page a Form XObject contributes, and that disagreement
is what caught the rejected Form-XObject implementation: pymupdf rendered it
correctly while pypdf saw the whole page text once per band. A check that only
one parser can see is not a check.

Each document is rendered twice — with values that fit as printed, and with
values long enough to open every row its pages allow — so both the untouched
and the fully expanded form of each page are inspected.
"""

from __future__ import annotations

import argparse
import base64
import collections
import hashlib
import io as _io
import json
import os
import re
import sys
import zlib

import fitz  # pymupdf
import pypdf
from pypdf.generic import DecodedStreamObject, NameObject

from headless_browser import STATIC_UIKIT, Chrome, Server

TEMPLATES = os.path.join(STATIC_UIKIT, "assets", "document-pdf-templates")
OVERLAY_FONT_HINT = "Liberation"
MIN_DYNAMIC_FONT_SIZE = 9.0

# Values chosen to make every configured anchor open as many rows as it may.
LONG = {
    "field.client-full-name": "Публичное акционерное общество «Международные "
                              "инвестиционные технологии и решения»",
    "field.clientFullName": "Александров-Смирнов Максимилиан Константинович",
    "subject.citizenship": "United Kingdom",
    "extra.extra-attorney-citizenship": "United Kingdom",
    "extra.bank-address": "27 King George the Fifth Avenue, London, "
                          "United Kingdom, SW1A 2AA",
}

RENDER = r"""
(async function (docId, profileId, overrides) {
  const t = CRMDocumentEngine.fieldMaps[docId];
  const project = CRMDocumentBuilder.schema.fromProduction(t, null);
  const payload = CRMDocumentBuilder.fixtures.payloadFor(profileId, project);
  Object.keys(overrides).forEach(function (path) {
    const dot = path.indexOf('.');
    const ns = path.slice(0, dot), key = path.slice(dot + 1);
    const target = ns === 'subject' ? payload.subject : ns === 'field' ? payload.fields
      : ns === 'extra' ? payload.extraValues : payload.checks;
    if (Object.prototype.hasOwnProperty.call(target, key)) target[key] = overrides[path];
  });
  const notes = [];
  let flowPages = [];
  let reviewedRanges = [];
  let reviewedPathSuppressions = [];
  const reviewedFontSizes = {};
  let blob;
  try {
    const preflight = await CRMDocumentEngine.overlayRenderer.preflight(t, payload);
    reviewedRanges = preflight.reviewedRanges || [];
    reviewedPathSuppressions = preflight.reviewedPathSuppressions || [];
    CRMDocumentEngine.overlayRenderer.activeReviewedRangePages(t, payload)
      .forEach(function (group) {
        const sizes = [];
        group.blocks.forEach(function (block) {
          [block.fontSize, block.minFontSize].forEach(function (size) {
            if (Number(size) > 0) sizes.push(Number(size));
          });
          (block.runs || []).forEach(function (run) {
            if (Number(run.fontSize) > 0) sizes.push(Number(run.fontSize));
          });
        });
        reviewedFontSizes[group.page] = Array.from(new Set(sizes));
      });
    blob = await CRMDocumentEngine.overlayRenderer.render(t, payload, {
      onExpansion: function (l) { l.forEach(function (n) { notes.push(n); }); },
      onPlan: function (d) {
        flowPages = Object.keys(d.plans).filter(function (page) {
          return !!d.plans[page].pageFlow;
        }).map(Number);
      }
    });
  } catch (e) {
    return JSON.stringify({ error: e.name, message: String(e.message).slice(0, 200) });
  }
  const u8 = new Uint8Array(await blob.arrayBuffer());
  let s = ''; const c = 0x8000;
  for (let i = 0; i < u8.length; i += c) s += String.fromCharCode.apply(null, u8.subarray(i, i + c));
  return JSON.stringify({ pdf: btoa(s), notes: notes, flowPages: flowPages,
                          reviewedRanges: reviewedRanges,
                          reviewedPathSuppressions: reviewedPathSuppressions,
                          reviewedFontSizes: reviewedFontSizes,
                          pages: t.expectedPages,
                          url: t.templateUrl });
}(DOC, PROFILE, OVERRIDES))
"""

# A show-text operator and the string it prints. Counting these is how "every
# original operator exactly once" is verified without re-implementing a full
# PDF interpreter: a duplicated block duplicates its strings, a lost one loses
# them, and a subsetted overlay font never produces the same bytes as the
# template's own.
SHOW_TEXT = re.compile(rb"(\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>)\s*(Tj|TJ|'|\")")
OPERATOR = re.compile(rb"(?<![/\w.\-])(q|Q|cm|BT|ET|Tf|Td|TD|Tm|T\*|TJ|Tj|re|m|l|c|v|y|S|s|f|F|f\*|B|B\*|b|b\*|n|W|W\*|Do|gs|sh)(?![\w*])")


def page_streams(reader, index):
    """Raw, decompressed content bytes of one page."""
    page = reader.pages[index]
    contents = page.get("/Contents")
    if contents is None:
        return b""
    try:
        return page.get_contents().get_data()
    except Exception:
        pass
    data = []
    items = contents if isinstance(contents, list) else [contents]
    for item in items:
        obj = item.get_object()
        raw = obj._data if hasattr(obj, "_data") else b""
        try:
            data.append(zlib.decompress(raw))
        except Exception:
            data.append(obj.get_data())
    return b"\n".join(data)


def show_text_counter(stream):
    return collections.Counter(m.group(1) for m in SHOW_TEXT.finditer(stream))


def operator_counter(stream):
    return collections.Counter(m.group(1) for m in OPERATOR.finditer(stream))


def words(text):
    return collections.Counter(w for w in text.split() if len(w) > 2)


def reviewed_ranges_by_page(reviewed, page_count, reviewed_paths=None):
    """Validate all exact suppressions and return page -> source byte ranges."""
    result = collections.defaultdict(list)
    for collection, key in ((reviewed or [], "ranges"),
                            (reviewed_paths or [], "suppressions")):
        for entry in collection:
            page = int(entry["page"])
            if page < 0 or page >= page_count:
                raise AssertionError(
                    f"reviewed suppression page {page} is outside the PDF")
            inspection = entry.get("inspection") or {}
            for item in inspection.get(key) or []:
                start, end = int(item["startByte"]), int(item["endByte"])
                if start < 0 or end <= start:
                    raise AssertionError(
                        f"invalid byte range for {item.get('id')}: {start}:{end}")
                units = item.get("unitRanges") or [
                    {"startByte": start, "endByte": end}]
                for unit_index, unit in enumerate(units):
                    result[page].append({
                        "id": (item.get("id") if len(units) == 1 else
                               f"{item.get('id')}#{unit_index + 1}"),
                        "start": int(unit["startByte"]),
                        "end": int(unit["endByte"]),
                        "proof_id": item.get("id"),
                        "proof_start": start,
                        "proof_end": end,
                        "sha256": item.get("sha256"),
                    })
    for ranges in result.values():
        ranges.sort(key=lambda item: (item["start"], item["end"]))
        for previous, current in zip(ranges, ranges[1:]):
            if current["start"] < previous["end"]:
                raise AssertionError(
                    f"reviewed ranges {previous['id']} and {current['id']} overlap")
    return dict(result)


def stream_outside_reviewed_ranges(stream, ranges):
    """Remove only hash-proved ranges from a decoded source content stream."""
    proofs = {}
    for item in ranges:
        key = (item["proof_id"], item["proof_start"], item["proof_end"])
        proofs[key] = item["sha256"]
    for (proof_id, start, end), expected in proofs.items():
        if end > len(stream):
            raise AssertionError(
                f"reviewed range {proof_id} ends at {end}, stream has {len(stream)} bytes")
        actual = hashlib.sha256(stream[start:end]).hexdigest()
        if actual != expected:
            raise AssertionError(
                f"reviewed range {proof_id} has {actual}, expected {expected}; "
                "browser and pypdf decoded-stream offsets disagree")
    pieces, cursor = [], 0
    for item in ranges:
        start, end = item["start"], item["end"]
        if end > len(stream):
            raise AssertionError(
                f"reviewed range {item['id']} ends at {end}, stream has {len(stream)} bytes")
        pieces.append(stream[cursor:start])
        cursor = end
    pieces.append(stream[cursor:])
    return b"".join(pieces)


def comparison_pdf(template_path, ranges_by_page):
    """Build an in-memory source PDF containing only protected source bytes."""
    reader = pypdf.PdfReader(template_path)
    writer = pypdf.PdfWriter()
    for index, page in enumerate(reader.pages):
        writer.add_page(page)
        if index not in ranges_by_page:
            continue
        stream = stream_outside_reviewed_ranges(
            page_streams(reader, index), ranges_by_page[index])
        replacement = DecodedStreamObject()
        replacement.set_data(stream)
        writer.pages[index][NameObject("/Contents")] = writer._add_object(replacement)
    output = _io.BytesIO()
    writer.write(output)
    return output.getvalue()


class Checks:
    def __init__(self):
        self.results = []

    def check(self, name, ok, detail=""):
        self.results.append((name, bool(ok), str(detail)))
        return bool(ok)

    def report(self):
        failed = [r for r in self.results if not r[1]]
        for name, ok, detail in self.results:
            if not ok:
                print(f"FAIL  {name}\n      {detail[:400]}")
        print(f"\nStructural PDF: {len(self.results) - len(failed)}"
              f"/{len(self.results)} checks passed")
        return 1 if failed else 0


def inspect(checks, doc_id, label, pdf_bytes, template_path, expected_pages,
            cross_page=False, reviewed=None, reviewed_paths=None,
            reviewed_font_sizes=None):
    generated = fitz.open(stream=pdf_bytes, filetype="pdf")
    base = fitz.open(template_path)
    where = f"{doc_id} [{label}]"

    ranges_by_page = reviewed_ranges_by_page(
        reviewed, base.page_count, reviewed_paths)
    comparison_bytes = comparison_pdf(template_path, ranges_by_page) \
        if ranges_by_page else None
    protected = fitz.open(stream=comparison_bytes, filetype="pdf") \
        if comparison_bytes else base

    checks.check(f"{where}: page count unchanged",
                 generated.page_count == base.page_count == expected_pages,
                 f"{generated.page_count} / {base.page_count} / {expected_pages}")
    checks.check(f"{where}: no AcroForm", not generated.is_form_pdf, "")
    checks.check(f"{where}: no widgets",
                 not any(True for page in generated for _ in page.widgets()), "")
    checks.check(f"{where}: no annotations introduced",
                 sum(len(list(p.annots())) for p in generated) ==
                 sum(len(list(p.annots())) for p in base), "")

    base_reader = pypdf.PdfReader(template_path)
    gen_reader = pypdf.PdfReader(_io.BytesIO(pdf_bytes))
    protected_reader = pypdf.PdfReader(_io.BytesIO(comparison_bytes)) \
        if comparison_bytes else base_reader

    checks.check(f"{where}: approved ranges are hash-proved before comparison",
                 all(item.get("sha256")
                     for entries, key in ((reviewed or [], "ranges"),
                                          (reviewed_paths or [], "suppressions"))
                     for entry in entries
                     for item in (entry.get("inspection") or {}).get(key, [])),
                 f"{sum(len(items) for items in ranges_by_page.values())} ranges")

    # A cross-page rule intentionally changes which page owns a static block,
    # so the absolute operator guarantee is document-wide: every original
    # operator/string occurs exactly once across the same fixed page set.
    base_stream_all = b"\n".join(page_streams(protected_reader, i)
                                  for i in range(protected.page_count))
    gen_stream_all = b"\n".join(page_streams(gen_reader, i)
                                 for i in range(generated.page_count))
    base_show_all = show_text_counter(base_stream_all)
    gen_show_all = show_text_counter(gen_stream_all)
    lost_all = base_show_all - gen_show_all
    duplicate_all = collections.Counter(
        {k: gen_show_all[k] - base_show_all[k] for k in base_show_all
         if gen_show_all[k] > base_show_all[k]})
    checks.check(f"{where}: every protected show-text operator survives",
                 not lost_all, f"{sum(lost_all.values())} lost")
    checks.check(f"{where}: no protected show-text operator is duplicated",
                 not duplicate_all, f"{sum(duplicate_all.values())} duplicated")
    base_ops_all = operator_counter(base_stream_all)
    gen_ops_all = operator_counter(gen_stream_all)
    missing_all = {op: base_ops_all[op] - gen_ops_all[op]
                   for op in base_ops_all if gen_ops_all[op] < base_ops_all[op]}
    checks.check(f"{where}: no protected operator is lost", not missing_all,
                 json.dumps({k.decode(): v for k, v in missing_all.items()}))
    added_q_all = gen_ops_all[b"q"] - base_ops_all[b"q"]
    added_qq_all = gen_ops_all[b"Q"] - base_ops_all[b"Q"]
    checks.check(f"{where}: the rewrite adds balanced q/Q only",
                 added_q_all == added_qq_all and added_q_all >= 0,
                 f"+{added_q_all} q / +{added_qq_all} Q")

    base_text_all = "\n".join(page.get_text() for page in protected)
    gen_text_all = "\n".join(page.get_text() for page in generated)
    missing_words_all = words(base_text_all) - words(gen_text_all)
    checks.check(f"{where}: static text complete across pages (pymupdf)",
                 not missing_words_all,
                 f"{sum(missing_words_all.values())} missing")
    repeated_words_all = sum(
        max(0, words(gen_text_all)[word] - words(base_text_all)[word])
        for word in words(base_text_all))
    checks.check(f"{where}: no wholesale duplication across pages (pymupdf)",
                 repeated_words_all < max(4, len(words(base_text_all)) // 4),
                 f"{repeated_words_all} of {len(words(base_text_all))}")
    naive_base_all = words("\n".join(page.extract_text() or ""
                                      for page in protected_reader.pages))
    naive_gen_all = words("\n".join(page.extract_text() or ""
                                     for page in gen_reader.pages))
    checks.check(f"{where}: static text complete across pages (pypdf)",
                 not (naive_base_all - naive_gen_all),
                 f"{sum((naive_base_all - naive_gen_all).values())} missing")
    naive_repeated_all = sum(
        max(0, naive_gen_all[word] - naive_base_all[word])
        for word in naive_base_all)
    checks.check(f"{where}: no duplication across pages (pypdf)",
                 naive_repeated_all < max(4, len(naive_base_all) // 4),
                 f"{naive_repeated_all} of {len(naive_base_all)}")

    smallest = None
    unapproved_small = []
    font_sizes_by_page = {
        int(page): [float(size) for size in sizes]
        for page, sizes in (reviewed_font_sizes or {}).items()
    }
    for index in range(base.page_count):
        page, base_page = generated[index], base[index]
        protected_page = protected[index]
        at = f"{where} p{index}"

        # ── Nothing rasterised, nothing lost from the page's own drawing ──────
        checks.check(f"{at}: nothing rasterised",
                     len(page.get_images(full=True)) == len(base_page.get_images(full=True)),
                     f"{len(page.get_images(full=True))} vs "
                     f"{len(base_page.get_images(full=True))}")

        base_stream = page_streams(protected_reader, index)
        gen_stream = page_streams(gen_reader, index)
        base_show = show_text_counter(base_stream)
        gen_show = show_text_counter(gen_stream)
        lost = base_show - gen_show
        duplicated = collections.Counter(
            {k: gen_show[k] - base_show[k] for k in base_show
             if gen_show[k] > base_show[k]})
        if not cross_page:
            checks.check(f"{at}: every protected show-text operator survives",
                         not lost, f"{sum(lost.values())} lost, e.g. {list(lost)[:2]}")
            checks.check(f"{at}: no protected show-text operator is duplicated",
                         not duplicated,
                         f"{sum(duplicated.values())} duplicated, e.g. {list(duplicated)[:2]}")

        base_ops = operator_counter(base_stream)
        gen_ops = operator_counter(gen_stream)
        missing_ops = {op: base_ops[op] - gen_ops[op]
                       for op in base_ops if gen_ops[op] < base_ops[op]}
        if not cross_page:
            checks.check(f"{at}: no protected operator is lost", not missing_ops,
                         json.dumps({k.decode(): v for k, v in missing_ops.items()}))
        # A moved block is wrapped in exactly `q … cm … Q`, so the only balanced
        # pairs the rewrite may add are those.
        added_q = gen_ops[b"q"] - base_ops[b"q"]
        added_qq = gen_ops[b"Q"] - base_ops[b"Q"]
        if not cross_page:
            checks.check(f"{at}: the rewrite adds balanced q/Q only",
                         added_q == added_qq and added_q >= 0,
                         f"+{added_q} q / +{added_qq} Q")

        # ── The static legal text, read by both parsers ───────────────────────
        base_words = words(protected_page.get_text())
        gen_words = words(page.get_text())
        missing = base_words - gen_words
        if not cross_page:
            checks.check(f"{at}: static text complete (pymupdf)", not missing,
                         f"{sum(missing.values())} missing, e.g. {list(missing)[:3]}")
        repeated = collections.Counter(
            {w: gen_words[w] - base_words[w] for w in base_words
             if gen_words[w] > base_words[w]})
        # A dynamic value may legitimately repeat a word the form prints, so
        # only a wholesale duplication of the page is a failure here.
        if not cross_page:
            checks.check(f"{at}: no wholesale duplication (pymupdf)",
                         sum(repeated.values()) < max(4, len(base_words) // 4),
                         f"{sum(repeated.values())} of {len(base_words)}")

        naive_base = words(protected_reader.pages[index].extract_text() or "")
        naive_gen = words(gen_reader.pages[index].extract_text() or "")
        naive_missing = naive_base - naive_gen
        if not cross_page:
            checks.check(f"{at}: static text complete (pypdf)", not naive_missing,
                         f"{sum(naive_missing.values())} missing, e.g. "
                         f"{list(naive_missing)[:3]}")
        naive_repeated = sum(max(0, naive_gen[w] - naive_base[w]) for w in naive_base)
        if not cross_page:
            checks.check(f"{at}: no duplication for a clip-blind extractor (pypdf)",
                         naive_repeated < max(4, len(naive_base) // 4),
                         f"{naive_repeated} of {len(naive_base)}")

        # ── Our own text: readable, on the page, in both scripts ──────────────
        for block in page.get_text("rawdict")["blocks"]:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    if OVERLAY_FONT_HINT not in span.get("font", ""):
                        continue
                    text = "".join(c.get("c", "") for c in span.get("chars", []))
                    if not text.strip():
                        continue
                    smallest = span["size"] if smallest is None else min(smallest, span["size"])
                    if span["size"] < MIN_DYNAMIC_FONT_SIZE - 1e-6:
                        approved = any(
                            abs(span["size"] - size) <= 0.05
                            for size in font_sizes_by_page.get(index, []))
                        if not approved:
                            unapproved_small.append(
                                (index, span["size"], text[:30]))
                    if not page.rect.contains(fitz.Rect(span["bbox"])):
                        checks.check(f"{at}: drawn text stays on the page", False,
                                     text[:30])

    checks.check(
        f"{where}: no unapproved dynamic text below {MIN_DYNAMIC_FONT_SIZE:g} pt",
        not unapproved_small,
        repr(unapproved_small[:3]))
    generated.close()
    if protected is not base:
        protected.close()
    base.close()
    return smallest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--doc", help="restrict to one template id")
    args = parser.parse_args()

    server, browser = Server(), Chrome()
    checks = Checks()
    smallest_overall = None
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")
        ids = json.loads(browser.eval(
            "JSON.stringify(Object.keys(window.CRMDocumentEngine.fieldMaps).sort())"))
        if args.doc:
            ids = [args.doc]

        for doc_id in ids:
            for label, profile, overrides in (
                    ("as printed", "ru-resident-short", {}),
                    ("expanded", "ru-company-normal", LONG),
                    ("expanded, individual", "en-nonresident-normal", LONG)):
                script = (RENDER
                          .replace("DOC", json.dumps(doc_id))
                          .replace("PROFILE", json.dumps(profile))
                          .replace("OVERRIDES", json.dumps(overrides, ensure_ascii=False)))
                payload = json.loads(browser.eval(script, await_promise=True))
                if payload.get("error"):
                    # A value that cannot be printed is a layout question, not a
                    # structural one; run_document_regression.py reports those.
                    continue
                pdf = base64.b64decode(payload["pdf"])
                template_path = os.path.join(
                    TEMPLATES, os.path.basename(payload["url"]))
                size = inspect(checks, doc_id, label, pdf, template_path,
                               payload["pages"], bool(payload.get("flowPages")),
                               payload.get("reviewedRanges"),
                               payload.get("reviewedPathSuppressions"),
                               payload.get("reviewedFontSizes"))
                if size is not None:
                    smallest_overall = size if smallest_overall is None \
                        else min(smallest_overall, size)
            print(f"{doc_id:36s} done", flush=True)

        checks.check("no console errors while generating",
                     not browser.console, "; ".join(browser.console[:3]))
        checks.check("no failed asset requests",
                     not browser.requests, "; ".join(browser.requests[:3]))
    finally:
        browser.stop()
        server.stop()

    print(f"\nsmallest dynamic font size seen: {smallest_overall} pt")
    return checks.report()


if __name__ == "__main__":
    sys.exit(main())
