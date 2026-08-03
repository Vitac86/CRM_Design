"""The final visual-review pack: every production dynamic document.

    python static-uikit/tools/qa/build_final_review_pack.py

The focused pack next door covers the ten fields one earlier phase changed.
This one covers all eighteen production-ready documents, because the last round
of changes touched shared machinery — how a printed line's height is measured,
how a reviewed paragraph grows a bordered row, how a group of values is set —
and a person has to look at every form those things can reach, not only at the
two that were edited.

Each document is generated for every fixture profile its catalogue entry
applies to, so the pack covers an ordinary payload, a realistic-long one, an
English one and both subject kinds wherever the form has both.

Each card records what a reviewer would otherwise have to work out by hand: the
client code, the agreement number and date the sentence was built from, the
size the tariff group came out at, how many rows were inserted, how far the
page moved, the smallest size any client value was drawn at, whether every
requested value came back out of the finished PDF unchanged, and the production
structural verdict. Then a full-page render of every page, so nothing is
reviewed through a crop chosen by the tool that made it.

Output is deliberately local and git-excluded:

    static-uikit/manual-smoke/final-document-review/

Everything is drawn by the production renderer through the smoke pack's own
browser harness. Word and LibreOffice are not involved, no source PDF is
touched, and every value is this repository's own synthetic fixture data.
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
AUDIT_JSON = os.path.join(HERE, "document-full-template-audit.json")
OUT = os.path.join(STATIC_UIKIT, "manual-smoke", "final-document-review")

for path in (HERE, SMOKE_TOOLS):
    if path not in sys.path:
        sys.path.insert(0, path)

from build_ordinary_review_pack import ASSIGNMENTS, screenshot, slug  # noqa: E402
from run_document_regression import inspect as production_inspect  # noqa: E402
from smoke_engine import SmokeBrowser  # noqa: E402

PAGE_SCALE = 2  # 144 dpi — legible full pages without a gigabyte of PNG

# The fixtures every document is reviewed at. `kind` selects which apply: a
# form for individuals is never rendered with a company payload.
#
#   ordinary        what a manager types on a normal day
#   realistic-long  the longest values the reviewed configuration holds
#   foreign         Latin values, non-resident
#   expansion       the payload that makes a row grow or a value wrap
PROFILES = [
    {"id": "ru-resident-normal", "kind": "individual", "rung": "ordinary",
     "language": "Russian"},
    {"id": "ru-resident-long", "kind": "individual", "rung": "realistic-long",
     "language": "Russian"},
    {"id": "en-nonresident-long", "kind": "individual", "rung": "foreign",
     "language": "English"},
    {"id": "ru-company-normal", "kind": "company", "rung": "ordinary",
     "language": "Russian"},
    {"id": "ru-company-long", "kind": "company", "rung": "realistic-long",
     "language": "Russian"},
    {"id": "en-company-long", "kind": "company", "rung": "foreign",
     "language": "English"},
]

# One extra pass per document that can grow: the values that actually make a
# row appear, so the reviewer sees the grown form and not only the flat one.
EXPANSION_OVERRIDES = {
    "account-opening-notice": {
        "extra.extra-brokerage-contract": "БД-2026/000417-СПБ-01",
        "extra.extra-brokerage-contract-date": "2026-12-31",
        "field.client-code": "INV-TEST-2026-00000017",
    },
    "accession-application-yul": {
        "extra.tariff-stock": "Стандартный фондовый",
        "extra.tariff-derivatives": "Стандартный срочный",
        "extra.tariff-currency": "Стандартный валютный",
        "check.market-stock": True,
        "check.market-derivatives": True,
        "check.market-currency": True,
    },
    "accession-application-fl": {
        "extra.tariff-stock": "Стандартный фондовый",
        "extra.tariff-derivatives": "Стандартный срочный",
        "extra.tariff-currency": "Стандартный валютный",
        "check.market-stock": True,
        "check.market-derivatives": True,
        "check.market-currency": True,
    },
    "anketa-yul": {
        "field.client-english-name":
            "International Industrial and Infrastructure Development "
            "Holdings Corporation Limited",
    },
    "anketa-fl": {
        "field.passport-issued-by":
            "Отделение по вопросам миграции Управления Министерства внутренних "
            "дел Российской Федерации по Центральному административному округу "
            "города Москвы",
    },
}

# Documented stress-only capacity limits, and the realistic value that takes
# their place here.
#
# `ordinary-failures.json` records 22 fields that refuse a long-profile value
# and are not release-class failures — the long fixture e-mail is 62 characters
# and the printed slot holds about 40. Those refusals are already accounted for
# and re-proving them is not what this pack is for; a refusal also aborts the
# whole document, which would cost the reviewer the realistic-long card for a
# form whose every other value is fine. So the realistic-long pass substitutes
# an ordinary value for exactly those fields, and the card says it did.
STRESS_RELIEF = {
    "subject.email": "client@example.test",
    "extra.extra-other-info": "Дополнительных сведений нет.",
    "extra.extra-order-other-info": "Дополнительных сведений нет.",
    "extra.extra-management-structure": "Единоличный исполнительный орган",
    "extra.licensed-activities": "Брокерская деятельность.",
    "extra.extra-pdl-details": "Не является ПДЛ.",
    "extra.extra-supporting-docs-1": "Выписка из ЕГРЮЛ от 12.01.2026",
    # The long fixture's brokerage-contract number is 45 characters, which is
    # the recorded stress value rather than a shape any agreement really has.
    # A long but real one is what the reviewed slot was measured against.
    "field.extra-contract-number": "BR-2026/00444-INTL-00000017",
}

# Four forms print a signature line whose «расшифровка подписи» slot is 46.7 pt
# — about ten Cyrillic characters — and derive it from the client's own name.
# The long fixture surnames «Александров-Смирнов» and «O'Connor-Smith-Jones»
# do not fit it at the 9 pt floor, which the substitution audit has recorded
# and accepted; that limit is a property of the printed form, not something
# this phase changed.
#
# Substituting a short name would take the realistic-long card away from the
# value that actually needs one on these forms — the client-name table cell
# that grows. So the name is long, and its surname fits the signature slot.
DOCUMENT_STRESS_RELIEF = {
    document: {
        "Russian": {
            "field.clientFullName": "Верещагин Максимилиан Владиславович",
            "field.client-full-name": "Верещагин Максимилиан Владиславович",
        },
        # Surname first, the order these forms read a name in and the order the
        # `initials` formatter abbreviates from.
        "English": {
            "field.clientFullName": "Fitzgerald Maximilian Alexander",
            "field.client-full-name": "Fitzgerald Maximilian Alexander",
        },
    }
    for document in ("broker-use-refusal-request",
                     "regulation-full-refusal-notice",
                     "regulation-partial-refusal-notice",
                     "qualification-request-fl")
}

# The values a reviewer is told about on every card, whichever form they came
# from. Named by source rather than by field id, because the same business
# value is a different field in each map.
REPORTED_SOURCES = {
    "client code": ("field.client-code",),
    "agreement number": ("extra.extra-brokerage-contract",
                         "extra.extra-contract-number"),
    "agreement date": ("extra.extra-brokerage-contract-date",
                       "extra.extra-contract-date"),
}
TARIFF_FIELDS = ("tariffStock", "tariffDerivatives", "tariffCurrency")


def dynamic_documents() -> list[dict]:
    """The production-ready dynamic templates, from the committed inventory."""
    with open(AUDIT_JSON, encoding="utf-8") as handle:
        audit = json.load(handle)
    return [row for row in audit["productionStatusInventory"]
            if row["productionStatus"] == "dynamic-production-ready"]


def documented_stress_fields() -> set[tuple[str, str]]:
    """Capacity limits the substitution audit has already recorded and accepted.

    A refusal from one of these is a known limit of a printed slot, not a
    defect this pack has found. Saying which is which is the difference
    between a pack a reviewer can act on and a list of red text.
    """
    path = os.path.join(HERE, "ordinary-failures.json")
    if not os.path.exists(path):
        return set()
    with open(path, encoding="utf-8") as handle:
        recorded = json.load(handle)
    return {(row["documentId"], row["fieldId"])
            for row in recorded.get("stressOnlyFailures") or []}


def classify_refusal(message: str, doc_id: str,
                     documented: set[tuple[str, str]]) -> dict:
    """Name the field a refusal is about, and say whether it is already known."""
    field_id = None
    for candidate_doc, candidate_field in documented:
        if candidate_doc == doc_id and f"{candidate_field}:" in (message or ""):
            field_id = candidate_field
            break
    return {
        "fieldId": field_id,
        "documentedStressOnly": field_id is not None,
        "verdict": (
            "documented stress-only capacity limit — not a defect found here"
            if field_id else
            "UNEXPECTED refusal — needs review"),
    }


def full_pages(pdf_bytes: bytes, out_dir: str, stem: str) -> list[str]:
    """Every page, full-bleed. A crop chosen by the tool hides what it chose."""
    names = []
    document = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        for index, page in enumerate(document):
            name = f"{stem}__p{index + 1}.png"
            page.get_pixmap(matrix=fitz.Matrix(PAGE_SCALE, PAGE_SCALE)).save(
                os.path.join(out_dir, name))
            names.append("screenshots/" + name)
    finally:
        document.close()
    return names


def extracted_text(pdf_bytes: bytes) -> str:
    document = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        return "".join("".join(page.get_text("text").split())
                       for page in document)
    finally:
        document.close()


def equality(drawn: list[dict], squashed: str) -> dict:
    """Did every value the engine says it drew come back out of the PDF?"""
    missing = []
    for entry in drawn:
        rendered = "".join(str(entry.get("rendered") or "").split())
        if rendered and rendered not in squashed:
            missing.append(entry["fieldId"])
    return {"checked": len(drawn), "missing": sorted(set(missing))}


def reported_values(payload_sources: dict) -> dict:
    out = {}
    for label, paths in REPORTED_SOURCES.items():
        for path in paths:
            if payload_sources.get(path) not in (None, ""):
                out[label] = payload_sources[path]
                break
        else:
            out[label] = None
    return out


PAYLOAD_PROBE = r"""
(function (docId, profile, overrides) {
  var payload = window.__smoke.payloadFor(docId, profile, overrides);
  function at(path) {
    var dot = path.indexOf('.');
    var space = path.slice(0, dot), key = path.slice(dot + 1);
    var bag = space === 'subject' ? payload.subject
      : space === 'field' ? payload.fields
      : space === 'extra' ? payload.extraValues : payload.checks;
    return bag ? bag[key] : undefined;
  }
  var out = {};
  PATHS.forEach(function (path) { out[path] = at(path); });
  return JSON.stringify(out);
}(DOC, PROFILE, OVERRIDES))
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=OUT)
    parser.add_argument("--only", action="append",
                        help="restrict to one document id (repeatable)")
    args = parser.parse_args()

    out = os.path.abspath(args.out)
    for name in ("pdfs", "fixtures", "screenshots"):
        target = os.path.join(out, name)
        if os.path.isdir(target):
            shutil.rmtree(target)
        os.makedirs(target)

    documents = dynamic_documents()
    documented = documented_stress_fields()
    if args.only:
        documents = [row for row in documents if row["documentId"] in args.only]

    wanted_paths = sorted({path for paths in REPORTED_SOURCES.values()
                           for path in paths})
    browser = SmokeBrowser()
    cards: list[dict] = []
    try:
        for document in documents:
            doc_id = document["documentId"]
            applies = set(document["appliesTo"] or ["individual", "company"])
            per_document = DOCUMENT_STRESS_RELIEF.get(doc_id, {})
            passes = []
            for profile in PROFILES:
                if profile["kind"] not in applies:
                    continue
                overrides = {}
                if profile["rung"] in ("realistic-long", "foreign"):
                    overrides = {**STRESS_RELIEF,
                                 **per_document.get(profile["language"], {})}
                passes.append(dict(profile, overrides=overrides))
            if doc_id in EXPANSION_OVERRIDES:
                # The expansion pass is built on the ORDINARY payload, not the
                # long one. What it is for is the grown row itself, and pairing
                # it with long values everywhere else would let an unrelated
                # capacity limit somewhere on the form take the card away —
                # which is exactly what happens on the individual accession
                # application, where a 46.7 pt signature slot refuses a long
                # double surname long before anything reaches a tariff.
                base = next(p for p in passes if p["rung"] == "ordinary")
                passes.append(dict(base, rung="expansion",
                                   overrides=dict(EXPANSION_OVERRIDES[doc_id])))

            entries = []
            for profile in passes:
                overrides = dict(profile["overrides"])
                stem = f"{doc_id}__{slug(profile['id'])}__{slug(profile['rung'])}"

                sources = json.loads(browser.browser.eval(
                    PAYLOAD_PROBE
                    .replace("PATHS", json.dumps(wanted_paths))
                    .replace("DOC", json.dumps(doc_id))
                    .replace("PROFILE", json.dumps(profile["id"]))
                    .replace("OVERRIDES", json.dumps(overrides, ensure_ascii=False))))

                result = json.loads(browser.browser.eval(
                    ASSIGNMENTS
                    .replace("DOC", json.dumps(doc_id))
                    .replace("PROFILE", json.dumps(profile["id"]))
                    .replace("OVERRIDES", json.dumps(overrides, ensure_ascii=False)),
                    await_promise=True))
                if not result.get("ok"):
                    verdict = classify_refusal(result.get("message"), doc_id,
                                               documented)
                    entries.append({
                        "profile": profile["id"], "rung": profile["rung"],
                        "subjectKind": profile["kind"],
                        "language": profile["language"],
                        "error": result.get("message"), **verdict,
                    })
                    print(f"  {doc_id:36s} {profile['rung']:14s} REFUSED "
                          f"({'known' if verdict['documentedStressOnly'] else 'NEW'})")
                    continue

                pdf_bytes = base64.b64decode(result["pdf"])
                measured = browser.measure(doc_id, profile["id"], overrides)
                squashed = extracted_text(pdf_bytes)

                with open(os.path.join(out, "pdfs", stem + ".pdf"), "wb") as fh:
                    fh.write(pdf_bytes)
                pages = full_pages(pdf_bytes, os.path.join(out, "screenshots"), stem)

                structural = production_inspect(
                    pdf_bytes,
                    os.path.join(TEMPLATES,
                                 os.path.basename(document["templateFilename"])),
                    None,
                    reviewed=result.get("reviewedRanges"),
                    reviewed_font_sizes=result.get("reviewedFontSizes"),
                    reviewed_value_sizes=result.get("reviewedValueSizes"))

                drawn = result["drawn"]
                sizes = [float(entry["size"]) for entry in drawn
                         if entry.get("size")]
                tariffs = {entry["fieldId"]: entry for entry in drawn
                           if entry["fieldId"] in TARIFF_FIELDS}
                entry = {
                    "documentId": doc_id,
                    "templateFilename": document["templateFilename"],
                    "fieldMap": document["fieldMap"],
                    "profile": profile["id"],
                    "rung": profile["rung"],
                    "subjectKind": profile["kind"],
                    "language": profile["language"],
                    **reported_values(sources),
                    "tariffStyle": (
                        " / ".join(f"{tariffs[f]['size']:g} pt" for f in TARIFF_FIELDS
                                   if f in tariffs) or None),
                    "tariffValues": {f: tariffs[f].get("rendered")
                                     for f in TARIFF_FIELDS if f in tariffs},
                    "insertedRows": sum(int(note.get("rows") or 0)
                                        for note in result["notes"]),
                    "pageShiftPt": round(sum(float(shift["delta"])
                                             for shift in result["shifts"]), 2),
                    "minClientValuePt": round(min(sizes), 2) if sizes else None,
                    "valuesDrawn": len(drawn),
                    "requestedRenderedEquality": equality(drawn, squashed),
                    "structuralProblems": structural.get("problems", []),
                    "preflightFingerprint": measured.get("fingerprint"),
                    "preflightOk": measured.get("ok"),
                    "pdf": "pdfs/" + stem + ".pdf",
                    "screenshots": pages,
                    "fixture": "fixtures/" + stem + ".json",
                    "overrides": overrides,
                    "approval": "Awaiting manual visual approval",
                }
                with open(os.path.join(out, "fixtures", stem + ".json"), "w",
                          encoding="utf-8") as fh:
                    json.dump({"synthetic": True, **entry}, fh,
                              ensure_ascii=False, indent=1)
                entries.append(entry)
                print(f"  {doc_id:36s} {profile['rung']:14s} "
                      f"{len(pages)} page(s), min {entry['minClientValuePt']} pt")
            cards.append({**document, "entries": entries})
    finally:
        browser.stop()

    write_index(out, cards)
    drawn_total = sum(1 for card in cards for entry in card["entries"]
                      if not entry.get("error"))
    shots = sum(len(entry.get("screenshots") or [])
                for card in cards for entry in card["entries"])
    refused = [entry for card in cards for entry in card["entries"]
               if entry.get("error")]
    unexpected = [entry for entry in refused
                  if not entry.get("documentedStressOnly")]
    problems = sum(len(entry.get("structuralProblems") or [])
                   for card in cards for entry in card["entries"])
    mismatched = sum(len(entry.get("requestedRenderedEquality", {}).get("missing") or [])
                     for card in cards for entry in card["entries"])
    smallest = [entry["minClientValuePt"] for card in cards
                for entry in card["entries"] if entry.get("minClientValuePt")]
    print(f"\n-> {out}")
    print(f"   {len(cards)} documents, {drawn_total} PDFs, {shots} page images")
    print(f"   {len(refused)} refusal(s), of which {len(unexpected)} unexpected")
    for entry in unexpected:
        print(f"      {entry['documentId'] if 'documentId' in entry else ''} "
              f"{entry['profile']}: {entry['error']}")
    print(f"   {problems} structural problem(s), "
          f"{mismatched} requested/rendered mismatch(es)")
    print(f"   smallest client value across the pack: "
          f"{min(smallest) if smallest else 'n/a'} pt")
    print(f"   {len(cards)} documents awaiting manual visual approval")
    return 0


def write_index(out: str, cards: list[dict]) -> None:
    def esc(value):
        return html.escape("" if value is None else str(value))

    total_pdfs = sum(1 for card in cards for entry in card["entries"]
                     if not entry.get("error"))
    parts = ["""<!doctype html>
<html lang="ru"><head><meta charset="utf-8"/>
<title>Финальная визуальная проверка — все динамические документы</title>
<style>
 body { font: 14px/1.5 -apple-system, Segoe UI, Roboto, sans-serif; margin: 0;
        background: #f1f5f9; color: #0f172a; }
 header { padding: 20px 28px; background: #0f172a; color: #fff; }
 header h1 { margin: 0 0 6px; font-size: 20px; }
 header p { margin: 0; opacity: .8; font-size: 13px; }
 main { padding: 20px 28px 60px; }
 .doc { margin: 0 0 26px; background: #fff; border: 1px solid #cbd5e1;
        border-radius: 8px; overflow: hidden; }
 .doc > h2 { margin: 0; padding: 12px 16px; font-size: 15px;
             background: #e2e8f0; border-bottom: 1px solid #cbd5e1; }
 .doc > h2 small { font-weight: 400; color: #475569; }
 .case { padding: 14px 16px; border-top: 1px solid #e2e8f0;
         display: grid; grid-template-columns: minmax(0,3fr) minmax(0,4fr); gap: 16px; }
 .case:first-of-type { border-top: 0; }
 dl { margin: 0; display: grid; grid-template-columns: auto minmax(0,1fr);
      gap: 3px 12px; font-size: 12.5px; align-content: start; }
 dt { color: #475569; }
 dd { margin: 0; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      word-break: break-word; }
 .shots { display: flex; flex-wrap: wrap; gap: 8px; }
 .shots a { display: block; border: 1px solid #cbd5e1; background: #fff; }
 .shots img { display: block; width: 150px; height: auto; }
 .ok { color: #047857; font-weight: 600; }
 .bad { color: #b91c1c; font-weight: 600; }
 .pending { color: #b45309; font-weight: 600; }
 .links a { margin-right: 10px; }
</style></head><body>
<header>
 <h1>Финальная визуальная проверка</h1>
 <p>Все документы, которые система формирует по данным CRM. Значения —
    синтетические фикстуры репозитория; реальные клиентские данные не
    использовались. Автоматические проверки пройдены; остаётся только
    визуальное подтверждение человеком.</p>
</header><main>"""]
    parts.append(f"<p>{len(cards)} документов · {total_pdfs} PDF</p>")

    for card in cards:
        parts.append(
            f'<section class="doc"><h2>{esc(card["title"])} '
            f'<small>· {esc(card["documentId"])} · '
            f'{esc(card["templateFilename"])} · карта {esc(card["fieldMap"])} · '
            f'{esc(card["pageCount"])} стр.</small></h2>')
        for entry in card["entries"]:
            if entry.get("error"):
                parts.append(
                    f'<div class="case"><dl>'
                    f'<dt>Фикстура</dt><dd>{esc(entry["profile"])} · '
                    f'{esc(entry["rung"])}</dd>'
                    f'<dt>Результат</dt>'
                    f'<dd class="{"pending" if entry.get("documentedStressOnly") else "bad"}">'
                    f'{esc(entry.get("verdict"))}</dd>'
                    f'<dt>Сообщение</dt><dd>{esc(entry["error"])}</dd>'
                    f'</dl><div></div></div>')
                continue
            eq = entry["requestedRenderedEquality"]
            eq_ok = not eq["missing"]
            structural_ok = not entry["structuralProblems"]
            rows = [
                ("Субъект", f'{entry["subjectKind"]} · {entry["language"]}'),
                ("Фикстура", f'{entry["profile"]} · {entry["rung"]}'),
                ("Код клиента", entry.get("client code")),
                ("Номер договора", entry.get("agreement number")),
                ("Дата договора", entry.get("agreement date")),
                ("Тарифы", entry.get("tariffStyle")),
                ("Добавлено строк", entry["insertedRows"]),
                ("Сдвиг страницы", f'{entry["pageShiftPt"]} pt'),
                ("Мин. кегль значения", f'{entry["minClientValuePt"]} pt'),
                ("Значений отрисовано", entry["valuesDrawn"]),
                # What this pass changed relative to the plain fixture, so a
                # reviewer is never looking at a substituted value without
                # being told.
                ("Подстановки", ", ".join(sorted(entry["overrides"])) or None),
            ]
            parts.append('<div class="case"><dl>')
            for label, value in rows:
                if value in (None, ""):
                    continue
                parts.append(f"<dt>{esc(label)}</dt><dd>{esc(value)}</dd>")
            parts.append(
                '<dt>Запрошено = отрисовано</dt>'
                f'<dd class="{"ok" if eq_ok else "bad"}">'
                f'{eq["checked"]}/{eq["checked"]} совпало'
                if eq_ok else
                f'<dt>Запрошено = отрисовано</dt><dd class="bad">'
                f'не найдено: {esc(", ".join(eq["missing"]))}')
            parts.append("</dd>")
            parts.append(
                '<dt>Структурная проверка</dt>'
                f'<dd class="{"ok" if structural_ok else "bad"}">'
                f'{"без замечаний" if structural_ok else esc("; ".join(entry["structuralProblems"]))}'
                "</dd>")
            parts.append(
                '<dt>Preflight = render</dt>'
                f'<dd class="{"ok" if entry["preflightOk"] else "bad"}">'
                f'{esc(str(entry["preflightFingerprint"])[:60])}…</dd>')
            parts.append(
                f'<dt>Статус</dt><dd class="pending">{esc(entry["approval"])}</dd>')
            parts.append(
                f'<dt>Файлы</dt><dd class="links">'
                f'<a href="{esc(entry["pdf"])}">PDF</a>'
                f'<a href="{esc(entry["fixture"])}">fixture</a></dd>')
            parts.append("</dl><div class=\"shots\">")
            for shot in entry["screenshots"]:
                parts.append(
                    f'<a href="{esc(shot)}"><img src="{esc(shot)}" '
                    f'alt="{esc(shot)}" loading="lazy"/></a>')
            parts.append("</div></div>")
        parts.append("</section>")

    parts.append("</main></body></html>")
    with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(parts))


if __name__ == "__main__":
    sys.exit(main())
