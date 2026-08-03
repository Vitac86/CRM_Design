"""Focused production-PDF QA for ``qualification-notice``.

The scenarios mirror the manual-review failures that prompted the correction:
short values, a long legal name, long Russian and foreign addresses, both long
at once, body/date expansion, and a long ``other`` instrument description.
All data is deliberately synthetic.

    python static-uikit/tools/qa/run_qualification_notice_layout_tests.py
"""

from __future__ import annotations

import base64
import json
import os
import re
import sys

import fitz  # pymupdf

from headless_browser import STATIC_UIKIT, Chrome, Server


TEMPLATE = os.path.join(
    STATIC_UIKIT, "assets", "document-pdf-templates", "qualification-notice.pdf"
)
PITCH = 11.52
RIGHT_LEFT = 379.51
RIGHT_RIGHT = 533.60
SOURCE_RULES = {
    "name-upper": (297.05, 293.09, 534.58, 293.33),
    "name-lower": (297.05, 294.29, 534.58, 294.53),
    "date": (99.264, 334.13, 240.884, 334.61),
    "other": (135.86, 427.01, 500.97, 427.49),
    "register-name": (229.01, 473.11, 322.154, 473.59),
    "register-date": (308.81, 484.63, 314.354, 485.11),
    "name-continuation-stroke": (63.80, 311.90, 468.91, 311.90),
    "name-continuation-fill": (63.80, 311.03, 468.80, 311.51),
}

SHORT_NAME = "АО «Тестовые инвестиции»"
LONG_NAME = (
    "Акционерное общество «Международные инвестиционные технологии, "
    "инфраструктурные решения и управление активами»"
)
BODY_NAME = (
    "Публичное акционерное общество «Международный центр инвестиционных "
    "технологий, инфраструктурных решений, управления активами и финансовых "
    "инструментов»"
)

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
OTHER_LONG = (
    "акций и облигаций иностранных эмитентов, паев международных "
    "инвестиционных фондов, депозитарных расписок, структурных облигаций и "
    "производных финансовых инструментов, предназначенных для "
    "квалифицированных инвесторов"
)

ADDRESS_ORDER = (
    "index", "country", "region", "district", "city", "settlement", "street",
    "house", "corps", "flat",
)
ADDRESS_PREFIX = {
    "city": "г. ", "street": "ул. ", "house": "д. ", "corps": "корп. ",
    "flat": "кв. ",
}


def formatted_address(parts: dict[str, str]) -> str:
    return ", ".join(
        ADDRESS_PREFIX.get(key, "") + parts[key].strip()
        for key in ADDRESS_ORDER
        if parts.get(key, "").strip()
    )


SCENARIOS = [
    {
        "id": "short",
        "name": SHORT_NAME,
        "address": "г. Москва",
        "expectedAddress": "г. Москва",
    },
    {
        "id": "long-name",
        "name": LONG_NAME,
        "address": "г. Москва",
        "expectedAddress": "г. Москва",
    },
    {
        "id": "long-ru-address",
        "name": SHORT_NAME,
        "addressParts": RU_ADDRESS,
        "expectedAddress": formatted_address(RU_ADDRESS),
    },
    {
        "id": "long-foreign-address",
        "name": SHORT_NAME,
        "addressParts": FOREIGN_ADDRESS,
        "expectedAddress": formatted_address(FOREIGN_ADDRESS),
    },
    {
        "id": "combined-long-name-address",
        "name": LONG_NAME,
        "addressParts": RU_ADDRESS,
        "expectedAddress": formatted_address(RU_ADDRESS),
    },
    {
        "id": "body-expansion-date",
        "name": BODY_NAME,
        "address": "г. Москва",
        "expectedAddress": "г. Москва",
    },
    {
        "id": "other-long",
        "name": SHORT_NAME,
        "address": "г. Москва",
        "expectedAddress": "г. Москва",
        "other": OTHER_LONG,
    },
]


RENDER = r"""
(async function (scenario) {
  const R = CRMDocumentEngine.overlayRenderer;
  const t = CRMDocumentEngine.fieldMaps['qualification-notice'];
  const project = CRMDocumentBuilder.schema.fromProduction(t, null);
  const payload = CRMDocumentBuilder.fixtures.payloadFor('ru-company-normal', project);

  // Conflicting short/display values prove that every name slot consumes the
  // full-name semantic source, never a convenient short caption.
  payload.subject.kind = 'company';
  payload.subject.displayName = 'КРАТКОЕ ТЕСТОВОЕ ИМЯ';
  payload.subject.shortName = 'КРАТКОЕ ТЕСТОВОЕ ИМЯ';
  payload.fields['client-full-name'] = scenario.name;
  payload.fields['client-registration-address'] = scenario.address ||
    'ДУБЛИРУЮЩИЙ РЕЗЕРВНЫЙ АДРЕС';
  payload.fields.documentDateRu = '2026-08-03';
  payload.umi = { company: {
    origname: scenario.name,
    basicname: 'КРАТКОЕ ТЕСТОВОЕ ИМЯ'
  }};
  Object.keys(scenario.addressParts || {}).forEach(function (key) {
    payload.umi.company[key] = scenario.addressParts[key];
  });
  payload.extraValues['extra-qualification-scope'] = scenario.other ? 'other' : 'all';
  payload.extraValues['extra-qualification-instruments-other'] = scenario.other || '';

  const notes = [];
  const pathIds = [];
  let decidedSummary = null;

  function copyRun(run) {
    return {
      type: run.type, text: run.text, fieldId: run.sourceFieldId || null,
      x: Number(run.x), width: Number(run.width), fontSize: Number(run.fontSize),
      decoration: run.decoration || null
    };
  }

  const blob = await R.render(t, payload, {
    onExpansion: function (items) {
      items.forEach(function (item) { notes.push(item); });
    },
    onReviewedPathSuppressions: function (pages) {
      pages.forEach(function (page) {
        (page.suppression.suppressions || []).forEach(function (entry) {
          pathIds.push(entry.id);
        });
      });
    },
    onPlan: function (d) {
      const blocks = {};
      const fields = {};

      function shiftAt(block, top) {
        const plan = (d.plans || {})[block.page];
        if (!plan) return 0;
        return (plan.shifts || []).reduce(function (total, shift) {
          if (shift.fieldId === block.id) return total;
          if (top < shift.fromTop - 1e-6 || top > shift.toTop + 1e-6) return total;
          return total + Number(shift.delta);
        }, 0);
      }

      Object.keys((d.planned && d.planned.byBlock) || {}).forEach(function (id) {
        const result = d.planned.byBlock[id];
        const block = (t.wordFlowBlocks || []).filter(function (item) {
          return item.id === id;
        })[0];
        if (!result || !result.drawn || !result.layout || !block) return;
        blocks[id] = {
          values: result.values || {},
          size: Number(result.layout.size),
          additionalLines: Number(result.layout.additionalLines || 0),
          lines: (result.layout.lines || []).map(function (line) {
            return {
              y: Number(line.baselineTop) + shiftAt(block, Number(line.baselineTop)),
              text: line.text,
              runs: (line.runs || []).map(copyRun)
            };
          })
        };
      });

      Object.keys((d.planned && d.planned.byField) || {}).forEach(function (id) {
        const result = d.planned.byField[id];
        if (!result || !result.drawn || !result.layout) return;
        const regions = result.layout.regions || result.regions || [];
        fields[id] = {
          requested: result.value,
          size: Number(result.layout.size),
          lines: (result.layout.lines || []).map(function (line) {
            const region = regions[line.regionIndex];
            const lineHeight = CRMDocumentEngine.textLayout
              .lineHeightAt(region, result.layout.size);
            return {
              text: line.text,
              left: Number(region.left), right: Number(region.left) + Number(region.width),
              baselineTop: Number(region.baselineTop) +
                Number(line.lineIndex || 0) * lineHeight,
              baselineShift: Number(region.baselineShift || 0),
              underline: !!region.drawUnderline
            };
          })
        };
      });

      decidedSummary = {
        blocks: blocks,
        fields: fields,
        shifts: ((d.plans || {})[0].shifts || []).map(function (shift) {
          return { fieldId: shift.fieldId, delta: Number(shift.delta),
                   fromTop: Number(shift.fromTop), toTop: Number(shift.toTop) };
        }),
        meta: {
          recipientSource: (t.fields || []).filter(function (f) {
            return f.id === 'recipientAddress'; })[0].source,
          recipientFirstLineIndent: Number(t.wordFlowBlocks[0].firstLineIndent),
          recipientHangingIndent: Number(t.wordFlowBlocks[0].hangingIndent),
          recipientSemanticGroup: t.wordFlowBlocks[0].semanticGroup,
          recognitionSemanticGroup: t.wordFlowBlocks[1].semanticGroup,
          pathSuppressions: (t.sourcePathSuppressions || []).map(function (entry) {
            return { id: entry.id, pathOrdinal: entry.pathOrdinal,
                     showWhen: entry.showWhen || null };
          }),
          otherRegionCount: ((t.fields || []).filter(function (f) {
            return f.id === 'otherInstruments'; })[0].flowRegions || []).length
        }
      };
    }
  });

  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return JSON.stringify({ ok: true, pdf: btoa(binary), notes: notes,
                          pathIds: pathIds, plan: decidedSummary });
}(SCENARIO)).catch(function (error) {
  return JSON.stringify({ ok: false, message: String(error && error.message || error) });
})
"""


class Checks:
    def __init__(self) -> None:
        self.results: list[tuple[str, bool, str]] = []

    def check(self, name: str, ok: bool, detail: object = "") -> bool:
        rendered = detail if isinstance(detail, str) else json.dumps(
            detail, ensure_ascii=False, sort_keys=True
        )
        self.results.append((name, bool(ok), rendered))
        return bool(ok)

    def report(self) -> int:
        failures = [entry for entry in self.results if not entry[1]]
        for name, _ok, detail in failures:
            print(f"FAIL  {name}\n      {detail}")
        print(
            f"\nQualification notice layout: "
            f"{len(self.results) - len(failures)}/{len(self.results)} checks passed"
        )
        return 1 if failures else 0


def normal(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def dynamic_fragments(block: dict, field_id: str) -> str:
    pieces: list[str] = []
    for line in block.get("lines", []):
        line_pieces = [
            run.get("text", "")
            for run in line.get("runs", [])
            if run.get("fieldId") == field_id
        ]
        if line_pieces:
            pieces.append(" ".join(line_pieces))
    return normal(" ".join(pieces))


def field_runs(block: dict, field_id: str) -> list[tuple[int, dict, dict]]:
    return [
        (line_index, line, run)
        for line_index, line in enumerate(block.get("lines", []))
        for run in line.get("runs", [])
        if run.get("fieldId") == field_id
    ]


def anchor_y(page: fitz.Page, text: str) -> float | None:
    matches = page.search_for(text)
    return matches[0].y0 if matches else None


def liberation_spans(page: fitz.Page) -> list[tuple[str, fitz.Rect, float]]:
    spans: list[tuple[str, fitz.Rect, float]] = []
    for block in page.get_text("rawdict")["blocks"]:
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if "Liberation" not in span.get("font", ""):
                    continue
                text = "".join(char.get("c", "") for char in span.get("chars", []))
                spans.append((text, fitz.Rect(span["bbox"]), float(span["size"])))
    return spans


def rule_rect(drawing: dict) -> fitz.Rect:
    rect = fitz.Rect(drawing["rect"])
    if rect.height <= 1e-6:
        half = float(drawing.get("width") or 0) / 2
        return fitz.Rect(rect.x0, rect.y0 - half, rect.x1, rect.y1 + half)
    return rect


def rule_glyph_intersections(page: fitz.Page) -> list[dict]:
    spans = liberation_spans(page)
    collisions: list[dict] = []
    for drawing in page.get_drawings():
        rect = rule_rect(drawing)
        if rect.width <= 1 or rect.height > 2 or not (150 < rect.y0 < 540):
            continue
        for text, bbox, _size in spans:
            intersection = rect & bbox
            # A sub-hundredth rounding contact is not painted overlap.  The
            # reviewed 0.48 pt rules sit in the measured 0.49 pt interline gap.
            if not intersection.is_empty and intersection.width > 0.05 and intersection.height > 0.02:
                collisions.append({
                    "rule": [round(value, 3) for value in rect],
                    "glyphs": text,
                    "bbox": [round(value, 3) for value in bbox],
                    "overlap": [round(value, 3) for value in intersection],
                })
    return collisions


def source_rule_present(page: fitz.Page, expected: tuple[float, ...]) -> bool:
    target = fitz.Rect(expected)
    for drawing in page.get_drawings():
        actual = rule_rect(drawing)
        if all(abs(left - right) <= 0.03 for left, right in zip(actual, target)):
            return True
    return False


def note_rows(notes: list[dict], *block_ids: str) -> int:
    wanted = set(block_ids)
    return sum(
        int(note.get("rows", 0))
        for note in notes
        if note.get("page") == 0 and note.get("fieldId") in wanted
    )


def render(browser: Chrome, scenario: dict) -> dict:
    script = RENDER.replace("SCENARIO", json.dumps(scenario, ensure_ascii=False))
    result = json.loads(browser.eval(script, await_promise=True))
    if result.get("ok"):
        result["document"] = fitz.open(
            stream=base64.b64decode(result["pdf"]), filetype="pdf"
        )
    return result


def main() -> int:
    checks = Checks()
    base = fitz.open(TEMPLATE)
    base_page = base[0]
    base_heading = anchor_y(base_page, "УВЕДОМЛЕНИЕ")
    base_instruments = anchor_y(base_page, "1).сделок")
    base_register = anchor_y(base_page, "Дата внесения записи")
    base_signature = anchor_y(base_page, "Должность уполномоченного лица")

    server, browser = Server(), Chrome()
    try:
        browser.goto(server.base + "/tools/document-map-audit.html")
        rendered: dict[str, dict] = {}
        for scenario in SCENARIOS:
            result = render(browser, scenario)
            checks.check(
                f"{scenario['id']}: production render succeeds",
                result.get("ok", False),
                result.get("message", ""),
            )
            if not result.get("ok"):
                continue
            rendered[scenario["id"]] = result
            document = result["document"]
            page = document[0]
            plan = result["plan"]
            recipient = plan["blocks"]["qualification-notice-recipient"]
            recognition = plan["blocks"]["qualification-notice-recognition"]
            register = plan["blocks"]["qualification-notice-register-entry"]

            # Recipient: exact sources, exact value, one right-side block.
            checks.check(
                f"{scenario['id']}: recipient name requested/rendered equality",
                normal(recipient["values"]["recipientName"]) == normal(scenario["name"]) ==
                dynamic_fragments(recipient, "recipientName"),
                {"requested": scenario["name"],
                 "rendered": dynamic_fragments(recipient, "recipientName")},
            )
            checks.check(
                f"{scenario['id']}: formatted address requested/rendered equality",
                normal(recipient["values"]["recipientAddress"]) ==
                normal(scenario["expectedAddress"]) ==
                dynamic_fragments(recipient, "recipientAddress"),
                {"expected": scenario["expectedAddress"],
                 "value": recipient["values"]["recipientAddress"],
                 "rendered": dynamic_fragments(recipient, "recipientAddress")},
            )
            right_runs = field_runs(recipient, "recipientName") + field_runs(
                recipient, "recipientAddress"
            )
            checks.check(
                f"{scenario['id']}: every recipient continuation stays in the right block",
                bool(right_runs) and all(
                    run["x"] >= RIGHT_LEFT - 0.02 and
                    run["x"] + run["width"] <= RIGHT_RIGHT + 0.02
                    for _index, _line, run in right_runs
                ),
                [(round(run["x"], 2), round(run["x"] + run["width"], 2))
                 for _index, _line, run in right_runs],
            )
            for label, field_id in (("Кому:", "recipientName"), ("Адрес:", "recipientAddress")):
                label_lines = [
                    index for index, line in enumerate(recipient["lines"])
                    if label in line.get("text", "")
                ]
                value_lines = {index for index, _line, _run in field_runs(recipient, field_id)}
                checks.check(
                    f"{scenario['id']}: {label} stays with first value content",
                    len(label_lines) == 1 and label_lines[0] in value_lines,
                    {"labelLines": label_lines, "valueLines": sorted(value_lines)},
                )
                gaps = []
                for index in label_lines:
                    runs = recipient["lines"][index].get("runs", [])
                    label_run = next((run for run in runs
                                      if run.get("type") == "static" and
                                      label in run.get("text", "")), None)
                    value_run = next((run for run in runs
                                      if run.get("fieldId") == field_id), None)
                    if label_run and value_run:
                        gaps.append(value_run["x"] -
                                    (label_run["x"] + label_run["width"]))
                checks.check(
                    f"{scenario['id']}: {label} has a visible label/value gap",
                    len(gaps) == 1 and gaps[0] >= 3.45,
                    gaps,
                )

            output_text = normal(page.get_text())
            checks.check(
                f"{scenario['id']}: address is printed exactly once",
                output_text.count(normal(scenario["expectedAddress"])) == 1 and
                "ДУБЛИРУЮЩИЙ РЕЗЕРВНЫЙ АДРЕС" not in output_text,
                output_text.count(normal(scenario["expectedAddress"])),
            )

            # Recognition body: exact full name, attached caption, own date.
            checks.check(
                f"{scenario['id']}: body uses the full client-name source exactly",
                normal(recognition["values"]["clientName"]) == normal(scenario["name"]) ==
                dynamic_fragments(recognition, "clientName") and
                "КРАТКОЕ ТЕСТОВОЕ ИМЯ" not in output_text,
                dynamic_fragments(recognition, "clientName"),
            )
            name_lines = sorted({
                index for index, _line, _run in field_runs(recognition, "clientName")
            })
            caption_lines = [
                index for index, line in enumerate(recognition["lines"])
                if "(Ф.И.О./ наименование организации)" in line.get("text", "")
            ]
            checks.check(
                f"{scenario['id']}: full-name caption stays attached",
                bool(name_lines) and caption_lines == [name_lines[-1] + 1],
                {"nameLines": name_lines, "captionLines": caption_lines},
            )
            date_runs = field_runs(recognition, "recognitionDate")
            date_ok = len(date_runs) == 1
            if date_ok:
                date_index, date_line, date_run = date_runs[0]
                static_after = [
                    run for run in date_line["runs"]
                    if not run.get("fieldId") and run.get("text") == "признано"
                ]
                date_ok = (
                    normal(recognition["values"]["recognitionDate"]) == "03.08.2026" and
                    normal(date_run["text"]) == "03.08.2026" and
                    abs(date_run["x"] - 99.264) <= 0.02 and
                    abs(date_run["width"] - 141.62) <= 0.02 and
                    bool(static_after) and
                    static_after[0]["x"] >= date_run["x"] + date_run["width"]
                )
            checks.check(
                f"{scenario['id']}: date owns its field/rule and clause follows it",
                date_ok,
                date_runs,
            )

            upper_rows = note_rows(
                result["notes"], "qualification-notice-recipient",
                "qualification-notice-recognition",
            )
            all_rows = note_rows(
                result["notes"], "qualification-notice-recipient",
                "qualification-notice-recognition",
                "qualification-notice-register-entry",
            )
            checks.check(
                f"{scenario['id']}: heading moves by the exact recipient delta",
                abs(anchor_y(page, "УВЕДОМЛЕНИЕ") -
                    (base_heading + note_rows(result["notes"],
                                              "qualification-notice-recipient") * PITCH)) <= 0.05,
                result["notes"],
            )
            checks.check(
                f"{scenario['id']}: lower instrument sentence moves by exact block delta",
                abs(anchor_y(page, "1).сделок") -
                    (base_instruments + upper_rows * PITCH)) <= 0.05,
                {"actual": anchor_y(page, "1).сделок"),
                 "expected": base_instruments + upper_rows * PITCH,
                 "rows": upper_rows},
            )
            checks.check(
                f"{scenario['id']}: register paragraph moves by the same upper delta",
                abs(anchor_y(page, "Дата внесения записи") -
                    (base_register + upper_rows * PITCH)) <= 0.05,
                {"actual": anchor_y(page, "Дата внесения записи"),
                 "expected": base_register + upper_rows * PITCH},
            )
            checks.check(
                f"{scenario['id']}: lower continuation shifts by complete source rows",
                abs(anchor_y(page, "Должность уполномоченного лица") -
                    (base_signature + all_rows * PITCH)) <= 0.05,
                {"actual": anchor_y(page, "Должность уполномоченного лица"),
                 "expected": base_signature + all_rows * PITCH,
                 "rows": all_rows},
            )

            # Source and generated rules have positive clearance from glyphs.
            collisions = rule_glyph_intersections(page)
            checks.check(
                f"{scenario['id']}: no source or dynamic rule intersects glyphs",
                not collisions,
                collisions[:8],
            )
            minimum = min((size for _text, _box, size in liberation_spans(page)), default=99)
            checks.check(
                f"{scenario['id']}: all replacement text stays at or above 9 pt",
                minimum >= 9 - 1e-3,
                minimum,
            )
            checks.check(
                f"{scenario['id']}: page and extraction remain structural",
                document.page_count == 1 and not page.get_images(full=True) and
                not document.is_form_pdf and "квалифицированным инвестором" in output_text,
                {"pages": document.page_count, "images": page.get_images(full=True)},
            )

            expected_paths = {
                "qualification-notice-recognition-name-rule-upper",
                "qualification-notice-recognition-name-rule-lower",
                "qualification-notice-recognition-date-rule",
                "qualification-notice-register-name-rule",
                "qualification-notice-register-date-micro-rule",
                "qualification-notice-recognition-continuation-stroke",
                "qualification-notice-recognition-continuation-fill",
            }
            if scenario.get("other"):
                expected_paths.add("qualification-notice-other-instruments-rule")
            checks.check(
                f"{scenario['id']}: exact reviewed path set is suppressed",
                set(result["pathIds"]) == expected_paths,
                sorted(result["pathIds"]),
            )
            active_rule_names = set(SOURCE_RULES) - ({"other"} if not scenario.get("other") else set())
            checks.check(
                f"{scenario['id']}: offending authoritative rule bytes are absent",
                all(not source_rule_present(page, SOURCE_RULES[name])
                    for name in active_rule_names),
                [name for name in active_rule_names
                 if source_rule_present(page, SOURCE_RULES[name])],
            )

            # The legal-entity register branch also preserves the full value.
            checks.check(
                f"{scenario['id']}: register organization-name equality",
                normal(register["values"]["registerEntryOrgName"]) ==
                normal(scenario["name"]) ==
                dynamic_fragments(register, "registerEntryOrgName"),
                dynamic_fragments(register, "registerEntryOrgName"),
            )

        if "short" in rendered:
            short = rendered["short"]
            recipient = short["plan"]["blocks"]["qualification-notice-recipient"]
            recognition = short["plan"]["blocks"]["qualification-notice-recognition"]
            checks.check(
                "short: no empty recipient or name continuation row is opened",
                len(recipient["lines"]) == 2 and recipient["additionalLines"] == 0 and
                len({index for index, _line, _run in field_runs(
                    recognition, "clientName")}) == 1 and
                not short["notes"],
                {"recipientLines": len(recipient["lines"]),
                 "recognitionNameLines": sorted({
                     index for index, _line, _run in field_runs(recognition, "clientName")
                 }), "notes": short["notes"]},
            )
            meta = short["plan"]["meta"]
            checks.check(
                "map: recipient indents and canonical address semantics are explicit",
                meta["recipientSource"] == "umi.address.registration" and
                meta["recipientFirstLineIndent"] == 259.51 and
                meta["recipientHangingIndent"] == 259.51 and
                meta["recipientSemanticGroup"]["bounds"] == {
                    "left": RIGHT_LEFT, "right": RIGHT_RIGHT
                } and meta["recipientSemanticGroup"]["address"]["renderOnce"] is True,
                meta,
            )
            checks.check(
                "map: body full-name/date semantics and reviewed paths are explicit",
                meta["recognitionSemanticGroup"]["fullName"]["source"] ==
                "field.client-full-name" and
                meta["recognitionSemanticGroup"]["fullName"]["companyUmi"] ==
                "umi.company.origname" and
                meta["recognitionSemanticGroup"]["date"]["rule"]["width"] == 141.62 and
                len(meta["pathSuppressions"]) == 8,
                meta,
            )

        for scenario_id in ("long-name", "long-ru-address", "long-foreign-address",
                            "combined-long-name-address"):
            if scenario_id not in rendered:
                continue
            recipient = rendered[scenario_id]["plan"]["blocks"][
                "qualification-notice-recipient"
            ]
            checks.check(
                f"{scenario_id}: recipient block grows rather than shrinking or escaping",
                recipient["additionalLines"] > 0 and recipient["size"] >= 9,
                {"additionalLines": recipient["additionalLines"],
                 "size": recipient["size"]},
            )

        if "body-expansion-date" in rendered:
            body = rendered["body-expansion-date"]["plan"]["blocks"][
                "qualification-notice-recognition"
            ]
            checks.check(
                "body expansion: organization name consumes reviewed complete lines",
                body["additionalLines"] > 0 and
                len({index for index, _line, _run in field_runs(body, "clientName")}) > 1,
                {"additionalLines": body["additionalLines"],
                 "lines": len({index for index, _line, _run in field_runs(
                     body, "clientName")})},
            )

        if "other-long" in rendered:
            other_result = rendered["other-long"]
            field = other_result["plan"]["fields"].get("otherInstruments", {})
            page = other_result["document"][0]
            field_text = normal(" ".join(line["text"] for line in field.get("lines", [])))
            label_hits = [
                rect for rect in page.search_for("иное")
                if 105 <= rect.x0 <= 120 and rect.y0 > 390
            ]
            first_word = OTHER_LONG.split()[0]
            value_hits = [
                rect for rect in page.search_for(first_word)
                if rect.x0 >= 137 and rect.y0 > 390
            ]
            checks.check(
                "other long: exact value uses coherent reviewed continuation lines",
                normal(field.get("requested")) == normal(OTHER_LONG) == field_text and
                2 <= len(field.get("lines", [])) <= 3 and field.get("size", 0) >= 9 and
                all(line["left"] >= 137.5 - 0.02 and line["right"] <= 499.5 + 0.02
                    for line in field.get("lines", [])),
                field,
            )
            checks.check(
                "other long: checkbox label and first value line remain attached",
                bool(label_hits) and bool(value_hits) and
                abs(label_hits[0].y0 - value_hits[0].y0) <= 0.6,
                {"label": [list(rect) for rect in label_hits],
                 "value": [list(rect) for rect in value_hits]},
            )
            register_y = anchor_y(page, "Дата внесения записи")
            lowest_value = max((rect.y1 for rect in value_hits), default=0)
            checks.check(
                "other long: instrument text remains above the register paragraph",
                lowest_value < register_y and register_y <= page.rect.height,
                {"valueBottom": lowest_value, "registerTop": register_y},
            )

    finally:
        browser.stop()
        server.stop()
        base.close()

    return checks.report()


if __name__ == "__main__":
    sys.exit(main())
