"""The focused visual-review pack for the ten resolved ordinary fields.

    python static-uikit/tools/qa/build_ordinary_review_pack.py

Automated QA proves the values are complete, the geometry is legal and nothing
below an anchor drifted. It cannot say whether the result LOOKS like the form a
client is meant to sign, and four of these ten changes grow a bordered table row
or reflow a printed line. Those need a person.

So this builds one small pack — ten fields, four fixtures each — rather than
regenerating the 134-document smoke pack. Each card carries the requested value,
the value actually extracted from the finished PDF, the size and line count it
was drawn at, how many rows were inserted, how far the page moved, the preflight
fingerprint, the production structural verdict, and a high-resolution crop of
exactly the part of the page that changed.

Output is deliberately local and git-excluded:

    static-uikit/manual-smoke/ordinary-substitution-review/

Everything is drawn by the production renderer through the smoke pack's own
browser harness. Word and LibreOffice are not involved and no source PDF is
touched.
"""

from __future__ import annotations

import argparse
import base64
import html
import json
import os
import shutil
import sys

import fitz

HERE = os.path.dirname(os.path.abspath(__file__))
STATIC_UIKIT = os.path.abspath(os.path.join(HERE, "..", ".."))
SMOKE_TOOLS = os.path.join(STATIC_UIKIT, "manual-smoke", "word-flow-long-data", "tools")
TEMPLATES = os.path.join(STATIC_UIKIT, "assets", "document-pdf-templates")
OUT = os.path.join(STATIC_UIKIT, "manual-smoke", "ordinary-substitution-review")

for path in (HERE, SMOKE_TOOLS):
    if path not in sys.path:
        sys.path.insert(0, path)

from smoke_engine import SmokeBrowser  # noqa: E402
from run_document_regression import inspect as production_inspect  # noqa: E402

SCREENSHOT_SCALE = 4  # 288 dpi — a 0.48 pt rule is two pixels wide


# ── The reviewed payloads ────────────────────────────────────────────────────
#
# Every value below is this repository's own synthetic fixture data. The
# "ordinary" rung is the exact value the substitution audit recorded as refused;
# "maximum" is the longest value the reviewed configuration is meant to hold.

ACCESSION_COMMON = {
    "extra.report-delivery": "email",
    "extra.depo-account-type": "owner",
    "extra.trading-depo-account-type": "nominee",
    "extra.income-payout": "broker-account",
    "check.accession-brokerage": True,
    "check.accession-depository": True,
    "check.market-stock": True,
    "check.market-derivatives": True,
    "check.market-currency": True,
}

POA_UL = {
    "extra.extra-poa-city": "Москва",
    "extra.extra-attorney-name": "Соколов Алексей Михайлович",
    "extra.extra-attorney-citizenship": "Российская Федерация",
    "extra.extra-attorney-passport": "40 05 123456",
    "extra.extra-attorney-issued-by": "ГУ МВД России по г. Санкт-Петербургу",
    "extra.extra-attorney-address": "г. Санкт-Петербург, ул. Декабристов, д. 42, кв. 17",
}

POA_FL = {
    "extra.extra-attorney-name": "Соколов Алексей Михайлович",
    "extra.extra-attorney-citizenship": "Российская Федерация",
    "extra.extra-attorney-passport-series": "40 05",
    "extra.extra-attorney-passport-number": "123456",
    "extra.extra-attorney-issued-by": "ГУ МВД России по г. Санкт-Петербургу",
    "extra.extra-attorney-address": "г. Санкт-Петербург, ул. Декабристов, д. 42, кв. 17",
}

DATE_WORDS = "четырнадцатое марта две тысячи двадцать шестого года"
DATE_LONGEST = "двадцать восьмое сентября две тысячи двадцать шестого года"
EMAIL_ORDINARY = "k.aleksandrov-smirnov@example.test"
EMAIL_REALISTIC = "compliance.notifications@example.test"
EMAIL_LONG = "compliance.notifications.department@example.test"
# Both accession forms repeat the client's address in the §16 contact table on
# their last page, in a printed cell 155 pt wide with the signing-date block
# directly beneath it. That cell — not the report-delivery line this card is
# about — is what refuses a 48-character address, and it is recorded separately
# as a measured physical limit.
EMAIL_LIMIT_NOTE = (
    "Отказ приходит НЕ от этой строки: перело́женная строка «По электронной "
    "почте …» держит 48 символов. Его не принимает контактная таблица §16 на "
    "последней странице — печатная ячейка 155 pt, под которой сразу идёт блок "
    "даты и подписи. Это отдельно зафиксированное физическое ограничение.")
FOREIGN_ORDINARY = ("Interregional Investment, Industrial and Infrastructure "
                    "Company for Technological Development, Joint-Stock Company")
FOREIGN_LONG = ("International Industrial and Infrastructure Development "
                "Holdings Corporation Limited")
FUNDS_ORDINARY = ("Доход от предпринимательской деятельности и инвестиционных "
                  "операций")
PAYMENT_ORDINARY = "БД-2026/000417-СПБ"


CARDS = [
    {
        "order": 1,
        "title": "Доверенность — дата прописью (ЮЛ)",
        "documentId": "power-of-attorney", "fieldId": "ulDateInWords",
        "profile": "ru-company-normal", "page": 0,
        "source": "extra.extra-poa-date-words",
        "clip": (50, 110, 560, 172),
        "base": POA_UL,
        "change": "Рамка строки расширена до текстовой границы страницы "
                  "(534.89 pt). Ничего не сдвигается, строка не переносится.",
        "fixtures": {
            "short": "14 марта 2026 г.",
            "ordinary": DATE_WORDS,
            "realistic-long": DATE_LONGEST,
            "maximum": DATE_LONGEST,
        },
    },
    {
        "order": 2,
        "title": "Доверенность — дата прописью (ФЛ)",
        "documentId": "power-of-attorney", "fieldId": "flDateInWords",
        "profile": "ru-resident-normal", "page": 2,
        "source": "extra.extra-poa-date-words",
        "clip": (60, 60, 560, 125),
        "base": POA_FL,
        "change": "Рамка строки расширена до текстовой границы страницы "
                  "(535.18 pt). Ничего не сдвигается, строка не переносится.",
        "fixtures": {
            "short": "14 марта 2026 г.",
            "ordinary": DATE_WORDS,
            "realistic-long": DATE_LONGEST,
            "maximum": DATE_LONGEST,
        },
    },
    {
        "order": 3,
        "title": "Тарифный план — фондовый рынок",
        "documentId": "accession-application-yul", "fieldId": "tariffStock",
        "profile": "ru-company-normal", "page": 0,
        "source": "extra.tariff-stock",
        "clip": (56, 494, 560, 625),
        "base": dict(ACCESSION_COMMON, **{
            "extra.tariff-derivatives": "Базовый",
            "extra.tariff-currency": "Базовый",
        }),
        "change": "Строка таблицы вырастает на один шаг источника 9.72 pt: "
                  "нижняя линейка и всё, что ниже неё, опускаются.",
        "fixtures": {
            "short": "Базовый",
            "ordinary": "Стандартный фондовый",
            "realistic-long": "Стандартный фондовый",
            "maximum": "Премиальный фондовый",
        },
    },
    {
        "order": 4,
        "title": "Тарифный план — срочный рынок",
        "documentId": "accession-application-yul", "fieldId": "tariffDerivatives",
        "profile": "ru-company-normal", "page": 0,
        "source": "extra.tariff-derivatives",
        "clip": (56, 494, 560, 625),
        "base": dict(ACCESSION_COMMON, **{
            "extra.tariff-stock": "Базовый",
            "extra.tariff-currency": "Базовый",
        }),
        "change": "Строка таблицы вырастает на один шаг источника 9.72 pt.",
        "fixtures": {
            "short": "Базовый",
            "ordinary": "Стандартный срочный",
            "realistic-long": "Стандартный срочный",
            "maximum": "Премиальный срочный",
        },
    },
    {
        "order": 5,
        "title": "Тарифный план — валютный рынок",
        "documentId": "accession-application-yul", "fieldId": "tariffCurrency",
        "profile": "ru-company-normal", "page": 0,
        "source": "extra.tariff-currency",
        "clip": (56, 494, 560, 625),
        "base": dict(ACCESSION_COMMON, **{
            "extra.tariff-stock": "Базовый",
            "extra.tariff-derivatives": "Базовый",
        }),
        "change": "Вторая строка помещается в собственный отступ строки "
                  "таблицы — ни одна линейка не двигается.",
        "fixtures": {
            "short": "Базовый",
            "ordinary": "Стандартный валютный",
            "realistic-long": "Стандартный валютный",
            "maximum": "Премиальный валютный",
        },
    },
    {
        "order": 6,
        "title": "Наименование на иностранном языке",
        "documentId": "anketa-yul", "fieldId": "foreignName",
        "profile": "en-company-normal", "page": 0,
        "source": "field.client-english-name",
        "clip": (60, 180, 570, 275),
        "base": {},
        "change": "Строка таблицы вырастает на один печатный шаг 13.44 pt; "
                  "семь вертикальных осевых продолжаются, нижняя линейка "
                  "опускается и закрывает выросшую ячейку.",
        "fixtures": {
            "short": "Northern Continental Ltd",
            "ordinary": FOREIGN_ORDINARY,
            "realistic-long": FOREIGN_LONG,
            "maximum": FOREIGN_ORDINARY + ", Branch Office",
        },
    },
    {
        "order": 7,
        "title": "Адрес электронной почты для отчётов (ФЛ)",
        "documentId": "accession-application-fl", "fieldId": "reportEmail",
        "profile": "ru-resident-normal", "page": 0,
        "source": "subject.email",
        "clip": (50, 390, 570, 440),
        "base": {"extra.report-delivery": "email"},
        "change": "Печатная строка перекладывается заново: адрес занимает "
                  "нужную ширину, пояснение сдвигается вправо. «По системе "
                  "ЭДО» и §4 не двигаются.",
        "fixtures": {
            "short": "client@example.test",
            "ordinary": EMAIL_ORDINARY,
            "realistic-long": EMAIL_REALISTIC,
            "maximum": EMAIL_LONG,
        },
        "rungNotes": {"maximum": EMAIL_LIMIT_NOTE},
    },
    {
        "order": 8,
        "title": "Адрес электронной почты для отчётов (ЮЛ)",
        "documentId": "accession-application-yul", "fieldId": "reportEmail",
        "profile": "ru-company-normal", "page": 0,
        "source": "subject.email",
        "clip": (50, 425, 545, 480),
        "base": dict(ACCESSION_COMMON, **{
            "extra.tariff-stock": "Базовый",
            "extra.tariff-derivatives": "Базовый",
            "extra.tariff-currency": "Базовый",
        }),
        "change": "Та же перекладка печатной строки, что и в форме ФЛ.",
        "fixtures": {
            "short": "client@example.test",
            "ordinary": EMAIL_ORDINARY,
            "realistic-long": EMAIL_REALISTIC,
            "maximum": EMAIL_LONG,
        },
        "rungNotes": {"maximum": EMAIL_LIMIT_NOTE},
    },
    {
        "order": 9,
        "title": "Назначение платежа — номер договора",
        "documentId": "account-opening-notice", "fieldId": "paymentPurposeStock",
        "profile": "ru-company-normal", "page": 1,
        "source": "extra.extra-brokerage-contract",
        "clip": (240, 30, 560, 160),
        "base": {},
        "change": "Точный идентификатор не разрывается: он целиком уходит на "
                  "продолжение — третью печатную строку той же ячейки.",
        "fixtures": {
            "short": "БД-000417",
            "ordinary": PAYMENT_ORDINARY,
            "realistic-long": PAYMENT_ORDINARY,
            "maximum": "БД-2026/000417-СПБ-01",
        },
    },
    {
        "order": 10,
        "title": "Источник происхождения средств — «Иное»",
        "documentId": "anketa-yul", "fieldId": "fundsOtherDetails",
        "profile": "ru-company-normal", "page": 3,
        "source": "extra.source-of-funds-other",
        "clip": (326, 555, 570, 632),
        "base": {"check.funds-other": True},
        "change": "Одна проверенная строка продолжения в той же ячейке, во всю "
                  "её ширину. Ничего не двигается.",
        "fixtures": {
            "short": "Инвестиционный доход",
            "ordinary": FUNDS_ORDINARY,
            "realistic-long": "Income from entrepreneurial activity and "
                              "investment operations",
            "maximum": FUNDS_ORDINARY,
        },
    },
]

RUNG_TITLES = {
    "short": "Короткое значение",
    "ordinary": "Обычное значение (то самое, что раньше сокращалось)",
    "realistic-long": "Реалистично длинное значение",
    "maximum": "Максимум проверенной конфигурации",
}


ASSIGNMENTS = r"""
(function (docId, baseProfile, overrides) {
  var maps = window.CRMDocumentEngine.fieldMaps;
  var R = window.CRMDocumentEngine.overlayRenderer;
  var template = maps[docId];
  var payload = window.__smoke.payloadFor(docId, baseProfile, overrides);
  var fields = {};
  (template.fields || []).forEach(function (f) { fields[f.id] = f; });
  var drawn = [];
  var notes = [];
  var shifts = [];
  var reviewedRanges = [];
  var reviewedFontSizes = {};
  var reviewedValueSizes = [];
  R.activeReviewedRangePages(template, payload).forEach(function (group) {
    var sizes = [];
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

  return R.render(template, payload, {
    onReviewedRanges: function (entries) {
      reviewedRanges = entries.map(function (entry) {
        return { page: entry.page, inspection: entry.suppression };
      });
    },
    onExpansion: function (items) {
      items.forEach(function (item) { notes.push(item); });
    },
    onPlan: function (decided) {
      Object.keys(decided.plans || {}).forEach(function (page) {
        var plan = decided.plans[page];
        (plan.shifts || []).forEach(function (shift) {
          shifts.push({ page: Number(page), fieldId: shift.fieldId || null,
                        fromTop: shift.fromTop, delta: shift.delta });
        });
      });
      Object.keys(decided.planned.byField).forEach(function (id) {
        var planned = decided.planned.byField[id];
        if (!planned || !planned.drawn || !planned.layout) return;
        drawn.push({ fieldId: id, requested: planned.value,
          rendered: (planned.layout.lines || []).map(function (l) {
            return l.text; }).join('\n'),
          size: planned.layout.size,
          lines: (planned.layout.lines || []).length });
      });
      Object.keys(decided.planned.byBlock || {}).forEach(function (id) {
        var planned = decided.planned.byBlock[id];
        if (!planned || !planned.drawn) return;
        var pieces = {}, sizes = {}, seen = {};
        (planned.layout.lines || []).forEach(function (line, lineIndex) {
          (line.runs || []).forEach(function (run) {
            if (run.type !== 'fieldRef' || !run.sourceFieldId) return;
            var key = run.sourceFieldId;
            if (!pieces[key]) { pieces[key] = []; seen[key] = {}; }
            pieces[key].push(run.text);
            // A value inside a Word-flow block is many word runs on few lines.
            // «Lines» has to mean printed lines, not runs, or a date in words
            // reads as seven lines when it is one.
            seen[key][lineIndex] = true;
            if (sizes[key] == null || run.fontSize < sizes[key]) {
              sizes[key] = run.fontSize;
            }
          });
        });
        Object.keys(pieces).forEach(function (key) {
          drawn.push({ fieldId: key, requested: (planned.values || {})[key],
            rendered: pieces[key].join(' '), size: sizes[key],
            lines: Object.keys(seen[key]).length });
          reviewedValueSizes.push({ block: id, fieldId: key, size: sizes[key] });
        });
      });
    }
  }).then(function (blob) { return blob.arrayBuffer(); })
    .then(function (buffer) {
      var bytes = new Uint8Array(buffer);
      var binary = '';
      for (var i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      return JSON.stringify({ ok: true, pdf: btoa(binary), drawn: drawn,
                              notes: notes, shifts: shifts,
                              reviewedRanges: reviewedRanges,
                              reviewedFontSizes: reviewedFontSizes,
                              reviewedValueSizes: reviewedValueSizes });
    }, function (error) {
      return JSON.stringify({ ok: false,
        message: String(error && error.message || error) });
    });
}(DOC, PROFILE, OVERRIDES))
"""


def slug(value: str) -> str:
    return "".join(c if c.isalnum() or c in "-_" else "-" for c in value).strip("-")


def screenshot(pdf_bytes: bytes, page_index: int, clip, path: str) -> None:
    document = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        page = document[page_index]
        rect = fitz.Rect(*clip) & page.rect
        pixmap = page.get_pixmap(
            matrix=fitz.Matrix(SCREENSHOT_SCALE, SCREENSHOT_SCALE), clip=rect)
        pixmap.save(path)
    finally:
        document.close()


def extracted(pdf_bytes: bytes, page_index: int, needle: str) -> str:
    """What the finished page really gives back for this value."""
    document = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        text = document[page_index].get_text("text")
    finally:
        document.close()
    squashed = "".join(text.split())
    wanted = "".join(str(needle or "").split())
    return wanted if wanted and wanted in squashed else ""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=OUT)
    args = parser.parse_args()

    out = os.path.abspath(args.out)
    for name in ("pdfs", "fixtures", "screenshots"):
        target = os.path.join(out, name)
        if os.path.isdir(target):
            shutil.rmtree(target)
        os.makedirs(target)

    browser = SmokeBrowser()
    results = []
    try:
        for card in sorted(CARDS, key=lambda c: c["order"]):
            entries = []
            for rung in ("short", "ordinary", "realistic-long", "maximum"):
                value = card["fixtures"][rung]
                overrides = dict(card["base"])
                overrides[card["source"]] = value
                name = f"{card['order']:02d}__{card['documentId']}__{card['fieldId']}__{slug(rung)}"

                script = (ASSIGNMENTS
                          .replace("DOC", json.dumps(card["documentId"]))
                          .replace("PROFILE", json.dumps(card["profile"]))
                          .replace("OVERRIDES", json.dumps(overrides, ensure_ascii=False)))
                result = json.loads(browser.browser.eval(script, await_promise=True))
                if not result.get("ok"):
                    entries.append({"rung": rung, "requested": value,
                                    "error": result.get("message"),
                                    "note": (card.get("rungNotes") or {}).get(rung)})
                    continue

                pdf_bytes = base64.b64decode(result["pdf"])
                measured = browser.measure(card["documentId"], card["profile"], overrides)

                pdf_name = name + ".pdf"
                png_name = name + ".png"
                json_name = name + ".json"
                with open(os.path.join(out, "pdfs", pdf_name), "wb") as fh:
                    fh.write(pdf_bytes)
                screenshot(pdf_bytes, card["page"], card["clip"],
                           os.path.join(out, "screenshots", png_name))

                drawn = [d for d in result["drawn"] if d["fieldId"] == card["fieldId"]]
                mine = drawn[0] if drawn else {}
                rows = [n for n in result["notes"] if n.get("fieldId") == card["fieldId"]]
                shift = sum(float(s["delta"]) for s in result["shifts"]
                            if s["page"] == card["page"])

                # The same call the smoke pack makes, with the same reviewed
                # metadata: without it every word of the source paragraph a
                # reviewed block redraws looks like dynamic text below the
                # floor, which it is not.
                structural = production_inspect(
                    pdf_bytes,
                    os.path.join(TEMPLATES, card["documentId"] + ".pdf"),
                    None,
                    reviewed=result.get("reviewedRanges"),
                    reviewed_font_sizes=result.get("reviewedFontSizes"),
                    reviewed_value_sizes=result.get("reviewedValueSizes"))

                entry = {
                    "rung": rung,
                    "documentId": card["documentId"],
                    "fieldId": card["fieldId"],
                    "profile": card["profile"],
                    "requested": value,
                    "rendered": mine.get("rendered"),
                    "extracted": extracted(pdf_bytes, card["page"], mine.get("rendered")),
                    "fontSize": mine.get("size"),
                    "lineCount": mine.get("lines"),
                    "insertedRows": sum(int(r.get("rows") or 0) for r in rows),
                    "pageShiftPt": round(shift, 2),
                    "preflightFingerprint": measured.get("fingerprint"),
                    "preflightOk": measured.get("ok"),
                    "structuralProblems": structural.get("problems", []),
                    "overrides": overrides,
                    "pdf": "pdfs/" + pdf_name,
                    "screenshot": "screenshots/" + png_name,
                    "fixture": "fixtures/" + json_name,
                    "approval": "Awaiting manual visual approval",
                    "note": (card.get("rungNotes") or {}).get(rung),
                }
                with open(os.path.join(out, "fixtures", json_name), "w",
                          encoding="utf-8") as fh:
                    json.dump({"synthetic": True, **entry}, fh,
                              ensure_ascii=False, indent=1)
                entries.append(entry)
            results.append({**{k: v for k, v in card.items()
                               if k not in ("fixtures", "rungNotes")},
                            "entries": entries})
    finally:
        browser.stop()

    write_index(out, results)
    drawn = sum(1 for card in results for entry in card["entries"]
                if not entry.get("error"))
    refused = sum(1 for card in results for entry in card["entries"]
                  if entry.get("error"))
    print(f"\n-> {out}")
    print(f"   {drawn} PDFs, {drawn} screenshots, "
          f"{refused} recorded refusal(s), "
          f"{len(results)} fields awaiting manual visual approval")
    return 0


def write_index(out: str, cards: list[dict]) -> None:
    def esc(value):
        return html.escape("" if value is None else str(value))

    parts = ["""<!doctype html>
<html lang="ru"><head><meta charset="utf-8"/>
<title>Проверка вёрстки — десять полей с обычными значениями</title>
<style>
 body { font: 14px/1.55 system-ui, sans-serif; margin: 24px; max-width: 1180px; }
 h1 { font-size: 20px; } h2 { font-size: 16px; margin: 0 0 4px; }
 .card { border: 1px solid #d5d5d5; border-radius: 6px; padding: 16px;
         margin: 0 0 26px; }
 .await { display: inline-block; background: #fff3cd; border: 1px solid #e0c069;
          border-radius: 3px; padding: 1px 8px; font-size: 12px; }
 .rung { border-top: 1px solid #ececec; padding: 12px 0 4px; }
 .rung h3 { font-size: 14px; margin: 0 0 6px; }
 table { border-collapse: collapse; font-size: 13px; margin: 6px 0; }
 td, th { border: 1px solid #ddd; padding: 3px 8px; text-align: left;
          vertical-align: top; }
 td.v { font-family: ui-monospace, Consolas, monospace; white-space: pre-wrap;
        max-width: 640px; }
 img { max-width: 100%; border: 1px solid #ccc; margin-top: 8px; }
 .ok { color: #1a7f37; } .bad { color: #b42318; font-weight: 600; }
 .note { color: #555; }
</style></head><body>
<h1>Проверка вёрстки — десять полей с обычными значениями</h1>
<p class="note">Всё нарисовано производственным рендерером. Исходные PDF не
изменялись, Word и LibreOffice не запускались, реальных клиентских данных нет.
Автоматическая проверка уже пройдена; здесь нужен человеческий взгляд на то,
как это выглядит.</p>
<p><span class="await">Awaiting manual visual approval</span> — статус каждого
из десяти полей.</p>
"""]

    for card in cards:
        parts.append(f"""<div class="card">
<h2>{card['order']}. {esc(card['title'])}</h2>
<p><span class="await">Awaiting manual visual approval</span></p>
<table>
 <tr><th>Документ</th><td class="v">{esc(card['documentId'])}</td></tr>
 <tr><th>Поле</th><td class="v">{esc(card['fieldId'])}</td></tr>
 <tr><th>Страница</th><td>{card['page'] + 1}</td></tr>
 <tr><th>Что изменилось</th><td>{esc(card['change'])}</td></tr>
</table>""")
        for entry in card["entries"]:
            if entry.get("error"):
                note = entry.get("note")
                parts.append(f"""<div class="rung"><h3>{esc(RUNG_TITLES[entry['rung']])}</h3>
<p class="bad">Не отрисовано: {esc(entry['error'])}</p>
{'<p class="note">' + esc(note) + '</p>' if note else ''}
<table><tr><th>Запрошено</th><td class="v">{esc(entry['requested'])}</td></tr></table>
</div>""")
                continue
            same = ("".join(str(entry["requested"]).split())
                    == "".join(str(entry["extracted"]).split()))
            verdict = ('<span class="ok">совпадает символ в символ</span>' if same
                       else '<span class="bad">РАСХОЖДЕНИЕ</span>')
            structural = entry["structuralProblems"]
            struct_html = ('<span class="ok">без замечаний</span>' if not structural
                           else '<span class="bad">' + esc("; ".join(structural)) + '</span>')
            parts.append(f"""<div class="rung"><h3>{esc(RUNG_TITLES[entry['rung']])}</h3>
<table>
 <tr><th>Запрошенное значение</th><td class="v">{esc(entry['requested'])}</td></tr>
 <tr><th>Нарисовано</th><td class="v">{esc(entry['rendered'])}</td></tr>
 <tr><th>Извлечено из PDF</th><td class="v">{esc(entry['extracted'])}</td></tr>
 <tr><th>Сверка</th><td>{verdict}</td></tr>
 <tr><th>Кегль</th><td>{esc(entry['fontSize'])} pt</td></tr>
 <tr><th>Строк</th><td>{esc(entry['lineCount'])}</td></tr>
 <tr><th>Вставлено строк таблицы</th><td>{esc(entry['insertedRows'])}</td></tr>
 <tr><th>Сдвиг страницы</th><td>{esc(entry['pageShiftPt'])} pt</td></tr>
 <tr><th>Preflight</th><td>{'ok' if entry['preflightOk'] else 'ОТКАЗ'}</td></tr>
 <tr><th>Структурная проверка</th><td>{struct_html}</td></tr>
 <tr><th>Файлы</th><td>
   <a href="{esc(entry['pdf'])}">PDF</a> ·
   <a href="{esc(entry['fixture'])}">fixture JSON</a> ·
   <a href="{esc(entry['screenshot'])}">снимок</a></td></tr>
</table>
<img src="{esc(entry['screenshot'])}" alt="{esc(entry['rung'])}"/>
</div>""")
        parts.append("</div>")

    parts.append("</body></html>")
    with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(parts))

    with open(os.path.join(out, "review.json"), "w", encoding="utf-8") as fh:
        json.dump({"synthetic": True, "cards": cards}, fh,
                  ensure_ascii=False, indent=1)

    with open(os.path.join(out, "README.md"), "w", encoding="utf-8") as fh:
        fh.write(
            "# Проверка вёрстки — десять полей с обычными значениями\n\n"
            "Локальный пакет, он намеренно не коммитится.\n\n"
            "    python static-uikit/tools/qa/build_ordinary_review_pack.py\n\n"
            "Откройте `index.html`. Для каждого поля — четыре значения: короткое,\n"
            "обычное (именно оно раньше сокращалось), реалистично длинное и\n"
            "максимум проверенной конфигурации.\n\n"
            "Отдельного внимания просят изменения, которые двигают вёрстку:\n\n"
            "* три тарифные строки и строка «Наименование на иностранном языке» —\n"
            "  выросшая строка таблицы и всё, что опустилось ниже неё;\n"
            "* обе строки «По электронной почте …» — перело́женная печатная\n"
            "  строка и сохранённый печатный бланк;\n"
            "* обе доверенности — дата прописью и подпись «(дата прописью)».\n\n"
            "Каждое поле помечено «Awaiting manual visual approval» до тех пор,\n"
            "пока человек не подтвердит вёрстку.\n")


if __name__ == "__main__":
    sys.exit(main())
