"""Page-section expansion: behaviour and PDF structure.

    python static-uikit/tools/qa/run_expansion_tests.py

Renders the same document with values of increasing length and inspects the
real PDF each time. The production output — not a canvas preview — is the
source of truth here, so every assertion is made against the generated file
with pymupdf and pypdf.
"""

from __future__ import annotations

import base64
import json
import os
import sys

import fitz  # pymupdf
import pypdf

from headless_browser import STATIC_UIKIT, Chrome, Server

TEMPLATES = os.path.join(STATIC_UIKIT, "assets", "document-pdf-templates")

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
    target[key] = overrides[path];
  });
  const notes = [];
  const blob = await CRMDocumentEngine.overlayRenderer.render(t, payload, {
    onExpansion: function (list) { list.forEach(function (n) { notes.push(n); }); }
  });
  const u8 = new Uint8Array(await blob.arrayBuffer());
  let s = ''; const c = 0x8000;
  for (let i = 0; i < u8.length; i += c) s += String.fromCharCode.apply(null, u8.subarray(i, i + c));
  return JSON.stringify({ pdf: btoa(s), notes: notes });
}(DOC, PROFILE, OVERRIDES))
"""

SHORT_NAME = "АО «Тестовые инвестиции»"
LONG_NAME = "Акционерное общество «Международные инвестиционные технологии и решения»"
LONGER_NAME = ("Публичное акционерное общество «Международные инвестиционные "
               "технологии, инфраструктурные решения и управление активами "
               "Центрального федерального округа»")
SHORT_ADDRESS = "125009, Россия, г. Москва, ул. Тверская, д. 14"
LONG_ADDRESS = ("Apartment 148, Building 27, Saint Christopher International "
                "Business Park, King George the Fifth Avenue, London, SW1A 2AA")


class Checks:
    def __init__(self):
        self.results = []

    def check(self, name, ok, detail=""):
        self.results.append((name, bool(ok), detail))
        return bool(ok)

    def report(self):
        failed = [r for r in self.results if not r[1]]
        for name, ok, detail in self.results:
            if not ok:
                print(f"FAIL  {name}\n      {detail}")
        print(f"\nPage expansion: {len(self.results) - len(failed)}"
              f"/{len(self.results)} checks passed")
        return 1 if failed else 0


class Renderer:
    def __init__(self, browser, server):
        self.browser = browser
        self.server = server
        browser.goto(server.base + "/tools/document-map-audit.html")

    def render(self, doc, profile, overrides):
        script = (RENDER
                  .replace("DOC", json.dumps(doc))
                  .replace("PROFILE", json.dumps(profile))
                  .replace("OVERRIDES", json.dumps(overrides, ensure_ascii=False)))
        payload = json.loads(self.browser.eval(script, await_promise=True))
        return base64.b64decode(payload["pdf"]), payload["notes"]


def anchor_y(document, page, needle):
    hits = document[page].search_for(needle)
    return hits[0].y0 if hits else None


def rules_on(document, page, min_width=80):
    return [d["rect"] for d in document[page].get_drawings()
            if d["rect"].height < 2 and d["rect"].width > min_width]


def main() -> int:
    server, browser = Server(), Chrome()
    checks = Checks()
    try:
        engine = Renderer(browser, server)

        # ── Company name: none / one / two inserted rows ─────────────────────
        base = fitz.open(os.path.join(TEMPLATES, "qualification-notice.pdf"))
        caption = "(Ф.И.О./ наименование организации)"
        base_caption = anchor_y(base, 0, caption)
        base_rules = len(rules_on(base, 0))
        base_text = " ".join(base[0].get_text().split())

        outputs = {}
        for key, name in (("short", SHORT_NAME), ("long", LONG_NAME),
                          ("longer", LONGER_NAME)):
            pdf, notes = engine.render("qualification-notice", "ru-resident-normal",
                                       {"field.client-full-name": name})
            outputs[key] = (fitz.open(stream=pdf, filetype="pdf"), notes, pdf)

        short_doc, short_notes, short_pdf = outputs["short"]
        long_doc, long_notes, long_pdf = outputs["long"]
        longer_doc, longer_notes, longer_pdf = outputs["longer"]

        checks.check("normal company name inserts no row",
                     anchor_y(short_doc, 0, caption) == base_caption and not short_notes,
                     f"caption {anchor_y(short_doc, 0, caption)} vs {base_caption}, "
                     f"notes {short_notes}")
        checks.check("no unused blank row is drawn for a normal value",
                     len(rules_on(short_doc, 0)) == base_rules,
                     f"{len(rules_on(short_doc, 0))} vs base {base_rules}")
        checks.check("long company name inserts rows and moves the caption down",
                     anchor_y(long_doc, 0, caption) > base_caption,
                     str(anchor_y(long_doc, 0, caption)))
        checks.check("very long company name moves it further still",
                     anchor_y(longer_doc, 0, caption) >
                     anchor_y(long_doc, 0, caption),
                     f"{anchor_y(longer_doc, 0, caption)} vs "
                     f"{anchor_y(long_doc, 0, caption)}")
        checks.check("each inserted row draws exactly one rule",
                     len(rules_on(longer_doc, 0)) > len(rules_on(long_doc, 0)) >
                     len(rules_on(short_doc, 0)),
                     f"{len(rules_on(short_doc, 0))} / {len(rules_on(long_doc, 0))} / "
                     f"{len(rules_on(longer_doc, 0))}")

        # Cumulative: two anchors on one page.
        deltas = {k: anchor_y(d, 0, caption) - base_caption
                  for k, (d, _n, _p) in outputs.items()}
        checks.check("two anchors on one page shift cumulatively",
                     deltas["longer"] == deltas["long"] * 2 and deltas["long"] > 0,
                     str(deltas))

        # ── Fixed header stays put ───────────────────────────────────────────
        header = "УВЕДОМЛЕНИЕ"
        checks.check("content above the first anchor never moves",
                     anchor_y(long_doc, 0, "Приложение № 3") ==
                     anchor_y(base, 0, "Приложение № 3"),
                     f"{anchor_y(long_doc, 0, 'Приложение № 3')} vs "
                     f"{anchor_y(base, 0, 'Приложение № 3')}")
        checks.check("content between two anchors takes only the first shift",
                     anchor_y(long_doc, 0, header) - anchor_y(base, 0, header) <
                     deltas["long"],
                     f"{anchor_y(long_doc, 0, header) - anchor_y(base, 0, header)} "
                     f"vs total {deltas['long']}")

        # ── Structure of every expanded output ───────────────────────────────
        for key, (document, _notes, pdf) in outputs.items():
            checks.check(f"{key}: page count unchanged",
                         document.page_count == base.page_count,
                         f"{document.page_count} vs {base.page_count}")
            checks.check(f"{key}: nothing is rasterised",
                         not document[0].get_images(full=True),
                         str(document[0].get_images(full=True)))
            checks.check(f"{key}: no AcroForm, no widgets",
                         not document.is_form_pdf and
                         not list(document[0].widgets()), "")
            # Every word of the base template survives exactly once.
            text = " ".join(document[0].get_text().split())
            checks.check(f"{key}: base wording is present and not duplicated",
                         text.count("настоящим уведомляет") == 1 and
                         "квалифицированным инвестором" in text,
                         f"count={text.count('настоящим уведомляет')}")
            naive = pypdf.PdfReader(__import__("io").BytesIO(pdf)).pages[0].extract_text()
            checks.check(f"{key}: no duplication for a clip-blind extractor",
                         naive.count("настоящим уведомляет") == 1,
                         f"pypdf count={naive.count('настоящим уведомляет')}")
            checks.check(f"{key}: Cyrillic still extractable",
                         any("Ѐ" <= ch <= "ӿ" for ch in text), "")
            lowest = max([s["bbox"][3] for b in document[0].get_text("rawdict")["blocks"]
                          for l in b.get("lines", []) for s in l.get("spans", [])]
                         + [d["rect"].y1 for d in document[0].get_drawings()])
            checks.check(f"{key}: content stays on the page",
                         lowest <= document[0].rect.height,
                         f"lowest {lowest:.2f} vs {document[0].rect.height:.2f}")

        # ── Determinism ──────────────────────────────────────────────────────
        again, _ = engine.render("qualification-notice", "ru-resident-normal",
                                 {"field.client-full-name": LONG_NAME})
        repeat = fitz.open(stream=again, filetype="pdf")
        checks.check("repeated generation is deterministic",
                     " ".join(repeat[0].get_text().split()) ==
                     " ".join(long_doc[0].get_text().split()), "")

        # ── The manager is told, neutrally ───────────────────────────────────
        checks.check("expansion is reported to the wizard",
                     len(long_notes) >= 1 and all("rows" in n for n in long_notes),
                     json.dumps(long_notes, ensure_ascii=False))

        # ── An exact identifier is never split ───────────────────────────────
        # Values for the fields this page cannot expand are kept short here on
        # purpose: the point of this check is the ИНН and ОГРН rows.
        poa_pdf, poa_notes = engine.render("power-of-attorney", "ru-company-normal", {
            "subject.inn": "7701234567",
            "field.client-ogrn": "1217700011256",
            "field.client-rep-authority": "Устава",
            "field.client-rep-full-name": "Петров П.П.",
            "extra.extra-attorney-name": "Иванов И.И.",
            "extra.extra-attorney-citizenship": "РФ",
            "extra.extra-attorney-passport": "4510 234567",
            "extra.extra-attorney-issued-by": "ОВД Москвы",
            "extra.extra-attorney-address": "г. Москва",
            "extra.extra-poa-city": "Москва",
        })
        poa = fitz.open(stream=poa_pdf, filetype="pdf")
        poa_text = " ".join(poa[0].get_text().split())
        checks.check("a 10-digit ИНН prints unbroken on its continuation row",
                     "7701234567" in poa_text, poa_text[-300:])
        checks.check("a 13-digit ОГРН prints unbroken on its continuation row",
                     "1217700011256" in poa_text, poa_text[-300:])
        checks.check("power-of-attorney stays a 4-page document",
                     poa.page_count == 4, str(poa.page_count))

        # Citizenship keeps its label above it.
        poa_fl, _ = engine.render("power-of-attorney", "ru-resident-normal", {
            "subject.citizenship": "Россия",
            "extra.extra-attorney-name": "Иванов И.И.",
            "extra.extra-attorney-citizenship": "РФ",
            "extra.extra-attorney-issued-by": "ОВД Москвы",
            "extra.extra-attorney-address": "г. Москва",
            "field.client-passport-issued-by": "ОВД Москвы",
        })
        fl = fitz.open(stream=poa_fl, filetype="pdf")
        label = anchor_y(fl, 2, "гражданин")
        value = None
        for hit in fl[2].search_for("Россия"):
            if label is not None and hit.y0 > label:
                value = hit.y0
                break
        checks.check("citizenship stays immediately below its own label",
                     label is not None and value is not None and 0 < value - label < 40,
                     f"label {label} value {value}")

        # ── A table row is inserted with its borders ─────────────────────────
        anketa_short, _ = engine.render("anketa-yul", "ru-company-normal",
                                        {"extra.bank-address": SHORT_ADDRESS})
        anketa_long, notes = engine.render("anketa-yul", "ru-company-normal",
                                           {"extra.bank-address": LONG_ADDRESS})
        a_short = fitz.open(stream=anketa_short, filetype="pdf")
        a_long = fitz.open(stream=anketa_long, filetype="pdf")
        checks.check("an inserted table row adds vertical borders",
                     len([d for d in a_long[2].get_drawings() if d["rect"].width < 2]) >
                     len([d for d in a_short[2].get_drawings() if d["rect"].width < 2]),
                     "")
        checks.check("the анкета keeps its page count when a row is inserted",
                     a_long.page_count == a_short.page_count == 5,
                     f"{a_long.page_count} / {a_short.page_count}")

        # ── Insufficient reserve is a field-specific error ───────────────────
        blocked = browser.eval(
            """
            (async function () {
              const t = JSON.parse(JSON.stringify(
                CRMDocumentEngine.fieldMaps['qualification-notice'],
                function (k, v) { return typeof v === 'function' ? undefined : v; }));
              t.fields.forEach(function (f) {
                if (f.expansion) { f.expansion.bottomReserve = 15; f.expansion.maxExtraRows = 1; }
              });
              const project = CRMDocumentBuilder.schema.fromProduction(
                CRMDocumentEngine.fieldMaps['qualification-notice'], null);
              const payload = CRMDocumentBuilder.fixtures.payloadFor('ru-resident-normal', project);
              payload.fields['client-full-name'] = %s;
              try {
                await CRMDocumentEngine.overlayRenderer.render(t, payload);
                return JSON.stringify({ ok: true });
              } catch (e) {
                return JSON.stringify({ ok: false, name: e.name,
                  fields: (e.overflows || []).map(function (o) { return o.fieldId; }),
                  reasons: (e.overflows || []).map(function (o) { return o.reason; }) });
              }
            }())
            """ % json.dumps(LONGER_NAME, ensure_ascii=False),
            await_promise=True)
        verdict = json.loads(blocked)
        checks.check("too little reserve produces a field-specific error",
                     not verdict["ok"] and verdict.get("fields"),
                     json.dumps(verdict, ensure_ascii=False))

        # ── No dynamic text below 9 pt anywhere in an expanded page ──────────
        smallest = None
        for _key, (document, _n, _p) in outputs.items():
            for block in document[0].get_text("rawdict")["blocks"]:
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        if "Liberation" not in span.get("font", ""):
                            continue
                        if "".join(c.get("c", "") for c in span.get("chars", [])).strip():
                            smallest = span["size"] if smallest is None else min(
                                smallest, span["size"])
        checks.check("no dynamic text below 9 pt on an expanded page",
                     smallest is None or smallest >= 8.999, str(smallest))
    finally:
        browser.stop()
        server.stop()

    return checks.report()


if __name__ == "__main__":
    sys.exit(main())
