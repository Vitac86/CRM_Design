"""Focused PDF-geometry QA for accession market/tariff rows.

The test reads text traces and vector drawings from the final rendered PDF. It
does not infer geometry from screenshots. For both accession applications it
checks every market row with ordinary and realistic-long synthetic data, every
market independently, all markets together, the longest reviewed tariff names,
and zero / one / several cumulative expansion rows above section 4.

Run from the repository root::

    python static-uikit/tools/qa/run_accession_market_tariff_geometry_tests.py
    python static-uikit/tools/qa/run_accession_market_tariff_geometry_tests.py \
      --keep static-uikit/manual-smoke/manual-findings-fix

``--mutate-separator`` deliberately moves the FL continuation rule through
``Универсальный`` and must exit non-zero. ``--self-test`` proves that gate.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import fitz

from headless_browser import Chrome, Server


MARKETS = ("stock", "derivatives", "currency")
FIELD_BY_MARKET = {
    "stock": "tariffStock",
    "derivatives": "tariffDerivatives",
    "currency": "tariffCurrency",
}
HEADING_BY_MARKET = {
    "stock": "Фондовый рынок",
    "derivatives": "Срочный рынок",
    "currency": "Валютный рынок и рынок драгоценных металлов",
}
UPPER_BLOCK = {
    "accession-application-fl": "accession-application-fl-identity",
    "accession-application-yul": "accession-application-yul-applicant",
}
BASE_FIRST_RULE = {
    "accession-application-fl": 461.95,
    "accession-application-yul": 501.19,
}

UNIVERSAL = "Универсальный"
LONGEST_TARIFFS = {
    "stock": "Премиальный фондовый",
    "derivatives": "Премиальный срочный",
    "currency": "Премиальный валютный",
}

# Conservative PDF text-trace boxes include the font's full descender band.
# The closest retained source separator is 0.432 pt below the FL derivatives
# value. A 0.40 pt floor preserves that source-like row while still rejecting
# an underline touching the font's conservative descender box. The source
# document's own closest description/rule pair is 0.138 pt apart, so 0.10 pt is
# the reviewed source-preserving floor for static prose.
MIN_TARIFF_CLEARANCE = 0.40
MIN_DESCRIPTION_CLEARANCE = 0.10
EPSILON = 0.04


@dataclass(frozen=True)
class Scenario:
    name: str
    document: str
    profile: str
    markets: tuple[str, ...] = MARKETS
    tariffs: dict[str, str] = field(
        default_factory=lambda: {market: UNIVERSAL for market in MARKETS})
    overrides: dict[str, str] = field(default_factory=dict)
    zero_upper_reference: bool = False
    expected_upper_rows: int | None = None
    review_name: str | None = None


def _individual_market_scenarios(document: str, profile: str) -> list[Scenario]:
    prefix = "fl" if document.endswith("-fl") else "yul"
    return [
        Scenario(f"{prefix}-{market}-only", document, profile,
                 markets=(market,), expected_upper_rows=(1 if prefix == "fl" else 0))
        for market in MARKETS
    ]


def scenarios() -> list[Scenario]:
    fl = "accession-application-fl"
    yul = "accession-application-yul"
    one_row = {
        "field.client-full-legal-name": "Synthetic value " * 3,
        "field.client-english-name": "Synthetic value " * 3,
        "field.client-ogrn": "1",
        "field.client-legal-address": "Synthetic value " * 3,
        "field.representativeSignerLine": "Synthetic value " * 3,
        "field.representativeAuthority": "Synthetic value " * 3,
    }
    several_rows = {key: ("Synthetic value " * 6 if key != "field.client-ogrn" else "1")
                    for key in one_row}

    out = [
        # The production FL identity paragraph always spends its one reviewed
        # row at the 9 pt value floor. Hiding only that reviewed replacement is
        # the zero-shift source reference; the committed PDF and tariff map stay
        # otherwise identical.
        Scenario("fl-zero-shift", fl, "ru-resident-normal",
                 zero_upper_reference=True, expected_upper_rows=0),
        Scenario("fl-ordinary-all", fl, "ru-resident-normal",
                 expected_upper_rows=1, review_name="market-tariff-fl-all-markets"),
        Scenario("fl-realistic-long-all", fl, "ru-resident-normal",
                 overrides={
                     "field.passportIssuedBy":
                         "Отделом по вопросам миграции ОМВД России по Пресненскому району "
                         "Главного управления МВД России по городу Москве",
                 },
                 expected_upper_rows=1),
        Scenario("fl-longest-tariffs", fl, "ru-resident-normal",
                 tariffs=LONGEST_TARIFFS, expected_upper_rows=1),
    ]
    out.extend(_individual_market_scenarios(fl, "ru-resident-normal"))
    out.extend([
        Scenario("yul-zero-shift", yul, "ru-company-normal",
                 expected_upper_rows=0, review_name="market-tariff-yul-all-markets"),
        Scenario("yul-realistic-long-all", yul, "ru-company-long",
                 overrides={
                     "subject.email": "client@example.test",
                     "field.extra-contract-number": "BR-2026/00444",
                 }),
        Scenario("yul-one-row-above", yul, "ru-company-normal",
                 overrides=one_row, expected_upper_rows=1),
        Scenario("yul-several-rows-above", yul, "ru-company-normal",
                 overrides=several_rows, expected_upper_rows=3,
                 review_name="market-tariff-yul-expanded-above"),
        Scenario("yul-longest-tariffs", yul, "ru-company-normal",
                 tariffs=LONGEST_TARIFFS, expected_upper_rows=0),
    ])
    out.extend(_individual_market_scenarios(yul, "ru-company-normal"))
    return out


RENDER = r"""
(async function (documentId, profileId, selectedMarkets, tariffs, overrides,
                 zeroUpperReference, mutateSeparator) {
  const sourceTemplate = CRMDocumentEngine.fieldMaps[documentId];
  const project = CRMDocumentBuilder.schema.fromProduction(sourceTemplate, null);
  const payload = CRMDocumentBuilder.fixtures.payloadFor(profileId, project);

  function assign(path, value) {
    const dot = path.indexOf('.');
    const namespace = path.slice(0, dot), key = path.slice(dot + 1);
    const target = namespace === 'subject' ? payload.subject
      : namespace === 'field' ? payload.fields
      : namespace === 'extra' ? payload.extraValues : payload.checks;
    target[key] = value;
  }
  Object.keys(overrides).forEach(function (path) { assign(path, overrides[path]); });
  ['stock', 'derivatives', 'currency'].forEach(function (market) {
    const selected = selectedMarkets.indexOf(market) !== -1;
    payload.checks['market-' + market] = selected;
    payload.extraValues['tariff-' + market] = selected ? tariffs[market] : '';
  });

  // FL has no production payload with zero identity growth: at the 9 pt floor
  // even its shortest complete identity needs the one reviewed continuation.
  // For the requested zero-shift comparison keep the source paragraph in place
  // by making only its reviewed replacement inactive at runtime.
  let template = sourceTemplate;
  if (zeroUpperReference) {
    const upperId = documentId === 'accession-application-fl'
      ? 'accession-application-fl-identity' : 'accession-application-yul-applicant';
    template = Object.assign({}, sourceTemplate, {
      wordFlowBlocks: (sourceTemplate.wordFlowBlocks || []).map(function (block) {
        if (block.id !== upperId) return block;
        return Object.assign({}, block, {
          showWhen: { source: 'check.market-stock', equals: '__qa_never__' }
        });
      })
    });
  }
  if (mutateSeparator && documentId === 'accession-application-fl') {
    template = Object.assign({}, template, {
      fields: (template.fields || []).map(function (item) {
        if (['tariffStock', 'tariffDerivatives', 'tariffCurrency'].indexOf(item.id) === -1) {
          return item;
        }
        const copy = Object.assign({}, item);
        copy.flowRegions = (item.flowRegions || []).map(function (region) {
          return region.drawUnderline
            ? Object.assign({}, region, { underlineOffset: 0.5 }) : region;
        });
        return copy;
      })
    });
  }

  let decision = null;
  const blob = await CRMDocumentEngine.overlayRenderer.render(template, payload, {
    onPlan: function (value) { decision = value; }
  });
  const fields = {};
  ['tariffStock', 'tariffDerivatives', 'tariffCurrency'].forEach(function (id) {
    const result = decision.planned.byField[id];
    fields[id] = result && result.drawn ? {
      value: result.value,
      size: result.layout.size,
      lines: result.layout.lines,
      regions: result.regions
    } : null;
  });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + 0x8000));
  }
  return JSON.stringify({
    pdf: btoa(binary), fields: fields, notes: decision.notes,
    shifts: decision.plans[0].shifts
  });
}(DOCUMENT, PROFILE, MARKETS_JSON, TARIFFS, OVERRIDES, ZERO_UPPER, MUTATE))
"""


class Renderer:
    def __init__(self, browser: Chrome, server: Server) -> None:
        self.browser = browser
        browser.goto(server.base + "/tools/document-map-audit.html")

    def render(self, scenario: Scenario, mutate: bool = False) -> dict[str, Any]:
        script = (RENDER
                  .replace("DOCUMENT", json.dumps(scenario.document))
                  .replace("PROFILE", json.dumps(scenario.profile))
                  .replace("MARKETS_JSON", json.dumps(scenario.markets))
                  .replace("TARIFFS", json.dumps(scenario.tariffs, ensure_ascii=True))
                  .replace("OVERRIDES", json.dumps(scenario.overrides, ensure_ascii=True))
                  .replace("ZERO_UPPER", json.dumps(scenario.zero_upper_reference))
                  .replace("MUTATE", json.dumps(mutate)))
        result = json.loads(self.browser.eval(script, await_promise=True))
        result["pdf"] = base64.b64decode(result["pdf"])
        return result


class Checks:
    def __init__(self) -> None:
        self.results: list[tuple[str, bool, str]] = []

    def check(self, name: str, ok: bool, detail: str = "") -> bool:
        self.results.append((name, bool(ok), detail))
        return bool(ok)

    def report(self) -> int:
        failures = [item for item in self.results if not item[1]]
        for name, _ok, detail in failures:
            print(f"FAIL  {name}\n      {detail[:500]}")
        print(f"\nAccession market/tariff geometry: "
              f"{len(self.results) - len(failures)}/{len(self.results)} checks passed")
        return 1 if failures else 0


def trace_spans(page: fitz.Page) -> list[dict[str, Any]]:
    spans = []
    for span in page.get_texttrace():
        chars = span.get("chars") or []
        text = "".join(chr(char[0]) for char in chars)
        origin = chars[0][2] if chars else (span["bbox"][0], span["bbox"][3])
        spans.append({
            "text": text.strip(), "bbox": fitz.Rect(span["bbox"]),
            "font": span.get("font") or "", "size": float(span.get("size") or 0),
            "origin": (float(origin[0]), float(origin[1])),
        })
    return spans


def horizontal_rules(page: fitz.Page) -> list[dict[str, float]]:
    result = []
    for drawing in page.get_drawings():
        rect = fitz.Rect(drawing["rect"])
        if rect.width <= 20 or rect.height >= 2:
            continue
        stroked = drawing.get("type") in ("s", "sf", "fs") and drawing.get("width")
        thickness = float(drawing.get("width") or rect.height)
        top = rect.y0 - thickness / 2 if stroked and rect.height <= EPSILON else rect.y0
        bottom = rect.y1 + thickness / 2 if stroked and rect.height <= EPSILON else rect.y1
        result.append({
            "left": rect.x0, "right": rect.x1, "top": top, "bottom": bottom,
            "centre": (top + bottom) / 2, "thickness": thickness,
        })
    return result


def overlapping_clearance(box: fitz.Rect, rules: list[dict[str, float]]) -> float:
    clearances = []
    for rule in rules:
        if rule["left"] >= box.x1 - EPSILON or rule["right"] <= box.x0 + EPSILON:
            continue
        if rule["bottom"] <= box.y0:
            clearances.append(box.y0 - rule["bottom"])
        elif rule["top"] >= box.y1:
            clearances.append(rule["top"] - box.y1)
        else:
            clearances.append(-min(box.y1, rule["bottom"]) + max(box.y0, rule["top"]))
    return min(clearances, default=999.0)


def source_row_rules(rules: list[dict[str, float]], first_heading: fitz.Rect,
                     last_heading: fitz.Rect) -> list[dict[str, float]]:
    candidates = [rule for rule in rules
                  if rule["left"] <= 57.2 and rule["right"] >= 400
                  and first_heading.y0 - 12 <= rule["centre"] <= last_heading.y1 + 55]
    candidates.sort(key=lambda item: item["centre"])
    unique = []
    for rule in candidates:
        if not unique or abs(rule["centre"] - unique[-1]["centre"]) > EPSILON:
            unique.append(rule)
    return unique


def matching_tariff_spans(all_spans: list[dict[str, Any]], planned: dict[str, Any]) \
        -> list[dict[str, Any]]:
    matches = []
    for line in planned["lines"]:
        region = planned["regions"][line["regionIndex"]]
        baseline = float(region["baselineTop"]) + float(line.get("lineIndex") or 0) * \
            float(region.get("lineHeight") or 0)
        options = [span for span in all_spans
                   if "LiberationSerif" in span["font"]
                   and span["text"] == line["text"]
                   and abs(span["origin"][1] - baseline) <= 0.08
                   and span["bbox"].x0 >= float(region["left"]) - 1
                   and span["bbox"].x1 <= float(region["left"]) + float(region["width"]) + 1]
        if options:
            matches.append(min(options, key=lambda span: abs(span["origin"][1] - baseline)))
    return matches


def union_box(spans: list[dict[str, Any]]) -> fitz.Rect:
    box = fitz.Rect(spans[0]["bbox"])
    for span in spans[1:]:
        box |= span["bbox"]
    return box


def inspect_scenario(checks: Checks, scenario: Scenario, result: dict[str, Any]) \
        -> dict[str, Any]:
    document = fitz.open(stream=result["pdf"], filetype="pdf")
    page = document[0]
    spans = trace_spans(page)
    rules = horizontal_rules(page)
    at = scenario.name

    headings: dict[str, dict[str, Any]] = {}
    for market in MARKETS:
        candidates = [span for span in spans if span["text"] == HEADING_BY_MARKET[market]
                      and "Liberation" not in span["font"]]
        checks.check(f"{at}: {market} heading is present once", len(candidates) == 1,
                     str([(item["text"], tuple(item["bbox"])) for item in candidates]))
        if candidates:
            headings[market] = candidates[0]
    if len(headings) != 3:
        document.close()
        return {"tariffClearance": -999, "descriptionClearance": -999,
                "checkboxOffsets": [], "upperRows": -1, "upperShift": -1}

    row_rules = source_row_rules(rules, headings["stock"]["bbox"],
                                 headings["currency"]["bbox"])
    checks.check(f"{at}: four market-row separators survive the final stream",
                 len(row_rules) == 4,
                 str([(round(rule["centre"], 3), round(rule["thickness"], 3))
                      for rule in row_rules]))

    upper_id = UPPER_BLOCK[scenario.document]
    upper_notes = [note for note in result["notes"] if note["fieldId"] == upper_id]
    upper_rows = sum(int(note["rows"]) for note in upper_notes)
    upper_shift = sum(float(shift["delta"]) for shift in result["shifts"]
                      if float(shift["fromTop"]) < BASE_FIRST_RULE[scenario.document])
    if scenario.expected_upper_rows is not None:
        checks.check(f"{at}: expected cumulative expansion above section 4",
                     upper_rows == scenario.expected_upper_rows,
                     f"rows={upper_rows}, shift={upper_shift:.2f}")
    if len(row_rules) == 4:
        expected_first = BASE_FIRST_RULE[scenario.document] + upper_shift
        checks.check(f"{at}: first separator follows cumulative page shift",
                     abs(row_rules[0]["top"] - expected_first) <= 0.05,
                     f"actual={row_rules[0]['top']:.3f}, expected={expected_first:.3f}, "
                     f"shift={upper_shift:.2f}")

    checkbox_offsets = []
    tariff_clearances = []
    description_clearances = []
    for index, market in enumerate(MARKETS):
        heading = headings[market]["bbox"]
        checkbox_options = [span for span in spans if span["text"] == "☐"
                            and span["bbox"].x0 < 71
                            and abs((span["bbox"].y0 + span["bbox"].y1) / 2
                                    - (heading.y0 + heading.y1) / 2) <= 3]
        # Word paints the empty box twice with coincident symbol-font glyphs.
        # It is one visual checkbox; collapse only exact geometric duplicates.
        deduplicated = []
        for option in checkbox_options:
            if not any(all(abs(a - b) <= EPSILON for a, b in
                           zip(option["bbox"], existing["bbox"]))
                       for existing in deduplicated):
                deduplicated.append(option)
        checkbox_options = deduplicated
        checks.check(f"{at}: {market} checkbox remains attached to heading",
                     len(checkbox_options) == 1, str([tuple(item["bbox"])
                                                     for item in checkbox_options]))
        if checkbox_options:
            checkbox = checkbox_options[0]["bbox"]
            offset = ((checkbox.y0 + checkbox.y1) / 2 -
                      (heading.y0 + heading.y1) / 2)
            checkbox_offsets.append(offset)
            checks.check(f"{at}: {market} checkbox/heading vertical alignment",
                         abs(offset) <= 1.0, f"offset={offset:.3f}")
            if market in scenario.markets:
                mark = [drawing for drawing in page.get_drawings()
                        if fitz.Rect(drawing["rect"]).intersects(checkbox)]
                checks.check(f"{at}: {market} selected mark is inside checkbox",
                             bool(mark), str([tuple(item["rect"]) for item in mark[:2]]))

        if len(row_rules) == 4:
            top, bottom = row_rules[index], row_rules[index + 1]
            checks.check(f"{at}: {market} heading belongs to its market row",
                         heading.y0 >= top["bottom"] - EPSILON
                         and heading.y1 <= bottom["top"] + EPSILON,
                         f"heading={tuple(heading)}, row={top['bottom']:.2f}–{bottom['top']:.2f}")

            descriptions = [span for span in spans
                            if "Liberation" not in span["font"]
                            and 61.4 <= span["bbox"].x0 <= 62.7
                            and len(span["text"]) >= 20
                            and span["bbox"].y0 > heading.y0 + 2
                            and span["bbox"].y0 < bottom["top"]]
            for description in descriptions:
                clearance = overlapping_clearance(description["bbox"], rules)
                description_clearances.append(clearance)
                checks.check(f"{at}: {market} description clears every separator",
                             clearance >= MIN_DESCRIPTION_CLEARANCE - EPSILON,
                             f"clearance={clearance:.3f}, text={description['text'][:60]}")
                checks.check(f"{at}: {market} description stays in its row",
                             description["bbox"].y1 < bottom["top"],
                             f"ink={description['bbox'].y1:.3f}, rule={bottom['top']:.3f}")

        field_id = FIELD_BY_MARKET[market]
        planned = result["fields"].get(field_id)
        if market not in scenario.markets:
            checks.check(f"{at}: unselected {market} tariff is not drawn", planned is None,
                         str(planned))
            continue
        checks.check(f"{at}: selected {market} tariff has a layout", planned is not None,
                     str(planned))
        if not planned:
            continue
        matches = matching_tariff_spans(spans, planned)
        checks.check(f"{at}: {market} tariff glyph boxes match every planned line",
                     len(matches) == len(planned["lines"]),
                     f"planned={planned['lines']}, matched={[(x['text'], tuple(x['bbox'])) for x in matches]}")
        checks.check(f"{at}: {market} tariff stays at least 9 pt",
                     float(planned["size"]) >= 9.0 - EPSILON,
                     f"size={planned['size']}")
        for match in matches:
            clearance = overlapping_clearance(match["bbox"], rules)
            tariff_clearances.append(clearance)
            checks.check(f"{at}: {market} tariff has zero rule intersections",
                         clearance >= 0, f"clearance={clearance:.3f}, box={tuple(match['bbox'])}")
            checks.check(f"{at}: {market} tariff keeps reviewed rule clearance",
                         clearance >= MIN_TARIFF_CLEARANCE - EPSILON,
                         f"clearance={clearance:.3f}, minimum={MIN_TARIFF_CLEARANCE:.2f}")
        if matches and len(row_rules) == 4:
            tariff_box = union_box(matches)
            checks.check(f"{at}: {market} tariff belongs visually to its market row",
                         tariff_box.y0 >= row_rules[index]["bottom"] - EPSILON
                         and tariff_box.y1 <= row_rules[index + 1]["top"] + EPSILON,
                         f"tariff={tuple(tariff_box)}, row="
                         f"{row_rules[index]['bottom']:.2f}–{row_rules[index + 1]['top']:.2f}")

    metrics = {
        "tariffClearance": min(tariff_clearances, default=999.0),
        "descriptionClearance": min(description_clearances, default=999.0),
        "checkboxOffsets": checkbox_offsets,
        "upperRows": upper_rows,
        "upperShift": upper_shift,
        "firstRule": row_rules[0]["top"] if row_rules else None,
        "lastRule": row_rules[-1]["bottom"] if row_rules else None,
    }
    document.close()
    return metrics


def write_review(out: str, scenario: Scenario, result: dict[str, Any],
                 metrics: dict[str, Any]) -> None:
    pdf_dir = Path(out, "pdfs")
    shot_dir = Path(out, "screenshots")
    fixture_dir = Path(out, "fixtures")
    for directory in (pdf_dir, shot_dir, fixture_dir):
        directory.mkdir(parents=True, exist_ok=True)
    stem = scenario.review_name or scenario.name
    Path(pdf_dir, stem + ".pdf").write_bytes(result["pdf"])
    Path(fixture_dir, stem + ".json").write_text(json.dumps({
        "scenario": scenario.name, "document": scenario.document,
        "profile": scenario.profile, "markets": scenario.markets,
        "tariffs": scenario.tariffs, "syntheticOverrides": scenario.overrides,
        "metrics": metrics,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    document = fitz.open(stream=result["pdf"], filetype="pdf")
    top = max(0, float(metrics.get("firstRule") or 450) - 12)
    bottom = min(document[0].rect.height, float(metrics.get("lastRule") or 620) + 25)
    pixmap = document[0].get_pixmap(matrix=fitz.Matrix(3, 3),
                                    clip=fitz.Rect(45, top, 560, bottom), alpha=False)
    pixmap.save(str(Path(shot_dir, stem + ".png")))
    document.close()


def compare_shift_invariance(checks: Checks, metrics: dict[str, dict[str, Any]],
                             names: tuple[str, ...]) -> None:
    baseline = metrics[names[0]]
    for name in names[1:]:
        current = metrics[name]
        checks.check(f"{name}: tariff clearance is invariant under cumulative shift",
                     abs(current["tariffClearance"] - baseline["tariffClearance"]) <= 0.05,
                     f"{current['tariffClearance']:.3f} vs {baseline['tariffClearance']:.3f}")
        checks.check(f"{name}: description clearance is invariant under cumulative shift",
                     abs(current["descriptionClearance"] - baseline["descriptionClearance"]) <= 0.05,
                     f"{current['descriptionClearance']:.3f} vs "
                     f"{baseline['descriptionClearance']:.3f}")
        checks.check(f"{name}: checkbox/heading offsets survive cumulative shift",
                     len(current["checkboxOffsets"]) == len(baseline["checkboxOffsets"])
                     and all(abs(a - b) <= 0.05 for a, b in
                             zip(current["checkboxOffsets"], baseline["checkboxOffsets"])),
                     f"{current['checkboxOffsets']} vs {baseline['checkboxOffsets']}")


def mutation_self_test() -> int:
    command = [sys.executable, "-X", "utf8", os.path.abspath(__file__),
               "--mutate-separator", "--only", "fl-zero-shift"]
    process = subprocess.run(command, capture_output=True, text=True,
                             encoding="utf-8", errors="replace")
    caught = process.returncode != 0 and (
        "zero rule intersections" in process.stdout
        or "reviewed rule clearance" in process.stdout)
    if not caught:
        print("FAIL  deliberate separator mutation was not rejected")
        print(process.stdout[-2000:])
        print(process.stderr[-1000:])
        return 1
    print("Mutation gate: deliberately moving the separator through "
          "«Универсальный» is rejected")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keep", help="append PDFs, metrics and close-ups here")
    parser.add_argument("--only", action="append", help="run only this scenario")
    parser.add_argument("--mutate-separator", action="store_true",
                        help="deliberately cross the FL tariff text (must fail)")
    parser.add_argument("--self-test", action="store_true",
                        help="prove the deliberate mutation exits non-zero")
    args = parser.parse_args()
    if args.self_test:
        return mutation_self_test()

    chosen = [item for item in scenarios() if not args.only or item.name in args.only]
    if not chosen:
        print("No matching scenario")
        return 2

    server, browser = Server(), Chrome()
    checks = Checks()
    metrics: dict[str, dict[str, Any]] = {}
    try:
        renderer = Renderer(browser, server)
        for scenario in chosen:
            result = renderer.render(scenario, mutate=args.mutate_separator)
            measured = inspect_scenario(checks, scenario, result)
            metrics[scenario.name] = measured
            if args.keep and scenario.review_name:
                write_review(args.keep, scenario, result, measured)
            print(f"{scenario.name:30s} upper={measured['upperRows']} row(s) / "
                  f"{measured['upperShift']:.2f} pt  "
                  f"tariff={measured['tariffClearance']:.3f} pt  "
                  f"description={measured['descriptionClearance']:.3f} pt")
        if not args.only and not args.mutate_separator:
            compare_shift_invariance(checks, metrics,
                                     ("fl-zero-shift", "fl-ordinary-all"))
            compare_shift_invariance(checks, metrics,
                                     ("yul-zero-shift", "yul-one-row-above",
                                      "yul-several-rows-above"))
        checks.check("no browser console errors", not browser.console,
                     "; ".join(browser.console[:5]))
    finally:
        browser.stop()
        server.stop()
    return checks.report()


if __name__ == "__main__":
    sys.exit(main())
