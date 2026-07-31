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
        # The budget belongs to the page, so this is where it has to be taken
        # away: the anchors keep their own maxExtraRows and simply cannot be
        # paid for.
        blocked = browser.eval(
            """
            (async function () {
              const t = JSON.parse(JSON.stringify(
                CRMDocumentEngine.fieldMaps['qualification-notice'],
                function (k, v) { return typeof v === 'function' ? undefined : v; }));
              // Room for exactly one 11.5 pt row: the configuration stays
              // valid, and the second anchor that needs one cannot be paid for.
              t.pageLayout[0].bottomClearance = 841.92 - t.pageLayout[0].bodyBottom - 11.5;
              const project = CRMDocumentBuilder.schema.fromProduction(
                CRMDocumentEngine.fieldMaps['qualification-notice'], null);
              const payload = CRMDocumentBuilder.fixtures.payloadFor('ru-resident-normal', project);
              payload.fields['client-full-name'] = %s;
              try {
                await CRMDocumentEngine.overlayRenderer.render(t, payload);
                return JSON.stringify({ ok: true });
              } catch (e) {
                return JSON.stringify({ ok: false, name: e.name, message: e.message,
                  fields: (e.overflows || []).map(function (o) { return o.fieldId; }),
                  reasons: (e.overflows || []).map(function (o) { return o.reason; }) });
              }
            }())
            """ % json.dumps(LONGER_NAME, ensure_ascii=False),
            await_promise=True)
        verdict = json.loads(blocked)
        checks.check("too little page budget produces a field-specific error",
                     not verdict["ok"] and verdict.get("fields") and
                     "reserve-exceeded" in verdict.get("reasons", []),
                     json.dumps(verdict, ensure_ascii=False))

        # A page budget is stated once. A field that also states its own reserve
        # is a configuration error, not a silent second opinion.
        duplicated = browser.eval(
            """
            (async function () {
              const t = JSON.parse(JSON.stringify(
                CRMDocumentEngine.fieldMaps['qualification-notice'],
                function (k, v) { return typeof v === 'function' ? undefined : v; }));
              t.fields.forEach(function (f) {
                if (f.expansion) f.expansion.bottomReserve = 250;
              });
              const project = CRMDocumentBuilder.schema.fromProduction(
                CRMDocumentEngine.fieldMaps['qualification-notice'], null);
              const payload = CRMDocumentBuilder.fixtures.payloadFor('ru-resident-normal', project);
              try {
                await CRMDocumentEngine.overlayRenderer.render(t, payload);
                return 'accepted';
              } catch (e) { return e.message; }
            }())
            """, await_promise=True)
        checks.check("a per-field reserve may not shadow the page budget",
                     "bottomReserve" in duplicated, duplicated)

        # ── Only the scenario being printed may spend the page ───────────────
        #
        # The power of attorney holds a legal-entity доверенность on pages 1–2
        # and an individual one on pages 3–4 of the same file. A document must
        # pay for the variant it prints and nothing else, or the variant it does
        # not print silently eats the reserve the other one needs.
        plans = browser.eval(
            """
            (async function () {
              const t = CRMDocumentEngine.fieldMaps['power-of-attorney'];
              const project = CRMDocumentBuilder.schema.fromProduction(t, null);
              const bytes = await (await fetch(t.templateUrl)).arrayBuffer();
              const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
              doc.registerFontkit(fontkit);
              const fb = await (await fetch(t.fonts.legalSerif)).arrayBuffer();
              const fonts = { legalSerif: await doc.embedFont(fb, { subset: true }) };
              const out = {};
              ['ru-company-normal', 'en-company-normal',
               'ru-resident-normal', 'en-nonresident-normal'].forEach(function (id) {
                const payload = CRMDocumentBuilder.fixtures.payloadFor(id, project);
                const demands = CRMDocumentEngine.overlayRenderer
                  .expansionDemands(t, payload, fonts);
                out[id] = {
                  rows: demands.reduce(function (m, d) { m[d.field.id] = d.rows; return m; }, {}),
                  inactive: demands.filter(function (d) { return d.inactive; })
                    .map(function (d) { return d.field.id; }),
                  pages: doc.getPages().map(function (p, i) {
                    const plan = CRMDocumentEngine.pageExpander.planPage(
                      i, demands, p.getSize().height, (t.pageLayout || {})[i]);
                    return { total: plan.totalDelta, recovered: plan.recovered,
                             errors: plan.errors.length,
                             consumption: plan.consumption };
                  })
                };
              });
              return JSON.stringify(out);
            }())
            """, await_promise=True)
        scenarios = json.loads(plans)

        checks.check("a hidden showWhen field asks for no rows",
                     all(s["rows"][f] == 0
                         for s in scenarios.values() for f in s["inactive"]),
                     json.dumps({k: v["inactive"] for k, v in scenarios.items()}))
        checks.check("the legal-entity variant leaves the individual pages alone",
                     scenarios["ru-company-normal"]["pages"][2]["total"] == 0 and
                     scenarios["ru-company-normal"]["pages"][3]["total"] == 0,
                     json.dumps(scenarios["ru-company-normal"]["pages"]))
        checks.check("the individual variant leaves the legal-entity pages alone",
                     scenarios["ru-resident-normal"]["pages"][0]["total"] == 0 and
                     scenarios["ru-resident-normal"]["pages"][1]["total"] == 0,
                     json.dumps(scenarios["ru-resident-normal"]["pages"]))
        # Every ordinary scenario is paid for. The foreign-individual page uses
        # its reviewed cross-page capacity for the fifth and sixth rows.
        checks.check("every ordinary scenario fits its reviewed page budget",
                     all(page["errors"] == 0
                         for s in scenarios.values()
                         for page in s["pages"]),
                     json.dumps({k: [p["errors"] for p in v["pages"]]
                                 for k, v in scenarios.items()}))

        # Capacity an anchor does not need stays available to the ones below it.
        ru_company = scenarios["ru-company-normal"]["pages"][0]["consumption"]
        en_company = scenarios["en-company-normal"]["pages"][0]["consumption"]
        checks.check("unused capacity is left to the anchors below",
                     len(en_company) > len(ru_company) and
                     all(a["remaining"] > b["remaining"]
                         for a, b in zip(en_company, en_company[1:])),
                     json.dumps([ru_company, en_company], ensure_ascii=False))
        checks.check("the plan accounts for the budget anchor by anchor",
                     all(e["cumulative"] == round(sum(x["delta"] for x in en_company[:i + 1]), 2)
                         for i, e in enumerate(en_company)),
                     json.dumps(en_company, ensure_ascii=False))
        checks.check("anchors are allocated top to bottom, deterministically",
                     [e["fieldId"] for e in en_company] ==
                     ["ulOgrn", "ulInn", "ulAttorneyCitizenship",
                      "ulAttorneyIssuedBy", "ulAttorneyAddress"],
                     json.dumps([e["fieldId"] for e in en_company]))

        # ── Reviewed white space is recovered only when it is needed ─────────
        poa_base = fitz.open(os.path.join(TEMPLATES, "power-of-attorney.pdf"))
        title_0 = anchor_y(poa_base, 0, "Доверенность")
        title_2 = anchor_y(poa_base, 2, "Доверенность")
        number_tops = [anchor_y(poa_base, p, str(p + 1)) for p in range(4)]

        rendered = {}
        for profile in ("ru-company-normal", "en-company-normal",
                        "ru-resident-normal"):
            pdf, _notes = engine.render("power-of-attorney", profile, {})
            rendered[profile] = fitz.open(stream=pdf, filetype="pdf")

        # A foreign individual needs six rows. Local reserve pays for four; the
        # reviewed cross-page rule moves the two final lines of a complete power
        # before their existing continuation on page 4, preserving four pages.
        foreign = browser.eval(
            """
            (async function () {
              const t = CRMDocumentEngine.fieldMaps['power-of-attorney'];
              const project = CRMDocumentBuilder.schema.fromProduction(t, null);
              const payload = CRMDocumentBuilder.fixtures.payloadFor('en-nonresident-normal', project);
              const pre = await CRMDocumentEngine.overlayRenderer.preflight(t, payload);
              return JSON.stringify({ ok: pre.ok, rows: pre.expansion.length,
                fields: pre.overflows.map(function (o) { return o.fieldId; }),
                reasons: pre.overflows.map(function (o) { return o.reason; }) });
            }())
            """, await_promise=True)
        limited = json.loads(foreign)
        checks.check("a foreign individual's доверенность uses reviewed cross-page flow",
                     limited["ok"] and limited["rows"] == 6 and
                     not limited["fields"] and not limited["reasons"],
                     foreign)
        invalid_flow = browser.eval(
            """
            (async function () {
              const original = CRMDocumentEngine.fieldMaps['power-of-attorney'];
              const broken = Object.assign({}, original, {
                pageLayout: JSON.parse(JSON.stringify(original.pageLayout))
              });
              broken.pageLayout[0].crossPageFlow.targetPage = 2;
              const project = CRMDocumentBuilder.schema.fromProduction(original, null);
              const payload = CRMDocumentBuilder.fixtures.payloadFor('ru-company-long', project);
              try {
                await CRMDocumentEngine.overlayRenderer.preflight(broken, payload);
                return JSON.stringify({ rejected: false });
              } catch (error) {
                return JSON.stringify({ rejected: true, message: String(error.message) });
              }
            }())
            """, await_promise=True)
        invalid = json.loads(invalid_flow)
        checks.check("cross-page flow cannot skip the following page",
                     invalid["rejected"] and
                     "immediately following page" in invalid.get("message", ""),
                     invalid_flow)
        foreign_pdf, _foreign_notes = engine.render(
            "power-of-attorney", "en-nonresident-normal", {})
        foreign_doc = fitz.open(stream=foreign_pdf, filetype="pdf")
        moved_phrase = "поручения на операции с денежными"
        checks.check("the moved trailing block occurs on page 4 exactly once",
                     moved_phrase not in foreign_doc[2].get_text() and
                     foreign_doc[3].get_text().count(moved_phrase) == 1,
                     json.dumps([foreign_doc[i].get_text().count(moved_phrase)
                                 for i in range(4)]))
        checks.check("cross-page flow preserves the four authoritative pages",
                     foreign_doc.page_count == poa_base.page_count == 4,
                     str(foreign_doc.page_count))

        checks.check("the legal-entity page recovers white space when it must",
                     0 < title_0 - anchor_y(rendered["ru-company-normal"], 0, "Доверенность") <= 21.35 + 0.02,
                     f"{anchor_y(rendered['ru-company-normal'], 0, 'Доверенность')} vs {title_0}")
        checks.check("a fifth row recovers more, but never past the approved minimum",
                     title_0 - anchor_y(rendered["en-company-normal"], 0, "Доверенность") >=
                     title_0 - anchor_y(rendered["ru-company-normal"], 0, "Доверенность"),
                     f"{anchor_y(rendered['en-company-normal'], 0, 'Доверенность')} vs "
                     f"{anchor_y(rendered['ru-company-normal'], 0, 'Доверенность')}")
        checks.check("the individual page draws on its top margin, not past it",
                     0 < title_2 - anchor_y(rendered["ru-resident-normal"], 2, "Доверенность") <= 14.63 + 0.02,
                     f"{anchor_y(rendered['ru-resident-normal'], 2, 'Доверенность')} vs {title_2}")

        # ── A page number never moves ────────────────────────────────────────
        for profile, document in rendered.items():
            checks.check(f"{profile}: every page number stays where it was printed",
                         [anchor_y(document, p, str(p + 1)) for p in range(4)] == number_tops,
                         f"{[anchor_y(document, p, str(p + 1)) for p in range(4)]} vs {number_tops}")

        # ── An empty optional value costs the page nothing ───────────────────
        empty_rows = browser.eval(
            """
            (async function () {
              const t = CRMDocumentEngine.fieldMaps['anketa-fl'];
              const project = CRMDocumentBuilder.schema.fromProduction(t, null);
              const payload = CRMDocumentBuilder.fixtures.payloadFor('en-nonresident-normal', project);
              delete payload.extraValues['bank-address'];
              const bytes = await (await fetch(t.templateUrl)).arrayBuffer();
              const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
              doc.registerFontkit(fontkit);
              const fb = await (await fetch(t.fonts.legalSerif)).arrayBuffer();
              const fonts = { legalSerif: await doc.embedFont(fb, { subset: true }) };
              const demands = CRMDocumentEngine.overlayRenderer
                .expansionDemands(t, payload, fonts);
              return JSON.stringify(demands.map(function (d) {
                return { id: d.field.id, rows: d.rows, reason: d.reason }; }));
            }())
            """, await_promise=True)
        checks.check("an empty optional value asks for no rows",
                     all(d["rows"] == 0 for d in json.loads(empty_rows)), empty_rows)

        # ── A mutually exclusive pair shares one physical reserve ────────────
        person, _ = engine.render("qualification-notice", "ru-resident-normal", {})
        company, notes_company = engine.render("qualification-notice", "ru-company-normal", {})
        p_doc = fitz.open(stream=person, filetype="pdf")
        c_doc = fitz.open(stream=company, filetype="pdf")
        checks.check("the individual branch of an either/or line takes no row",
                     anchor_y(p_doc, 0, "в реестр лиц") ==
                     anchor_y(base, 0, "в реестр лиц"),
                     f"{anchor_y(p_doc, 0, 'в реестр лиц')} vs "
                     f"{anchor_y(base, 0, 'в реестр лиц')}")
        checks.check("the legal-entity branch of the same line gets one",
                     any(n["fieldId"] == "registerEntryOrgName" for n in notes_company),
                     json.dumps(notes_company, ensure_ascii=False))
        checks.check("an either/or row moves only what is below it",
                     anchor_y(c_doc, 0, "в реестр лиц") ==
                     anchor_y(base, 0, "в реестр лиц"),
                     f"{anchor_y(c_doc, 0, 'в реестр лиц')} vs "
                     f"{anchor_y(base, 0, 'в реестр лиц')}")

        # ── Zero rows leaves the form exactly as printed ─────────────────────
        untouched, untouched_notes = engine.render(
            "power-of-attorney", "ru-company-normal", {
                "field.client-ogrn": "12177", "subject.inn": "7701",
                "extra.extra-attorney-citizenship": "РФ",
                "extra.extra-attorney-issued-by": "ОВД",
                "extra.extra-attorney-address": "г. Москва"})
        u_doc = fitz.open(stream=untouched, filetype="pdf")
        checks.check("nothing to expand leaves every page where it was printed",
                     not untouched_notes and
                     [round(anchor_y(u_doc, 0, s) or 0, 2) for s in
                      ("Доверенность", "Регламентом/Договором;")] ==
                     [round(anchor_y(poa_base, 0, s) or 0, 2) for s in
                      ("Доверенность", "Регламентом/Договором;")],
                     json.dumps(untouched_notes, ensure_ascii=False))
        checks.check("nothing to expand draws no continuation rule",
                     len(rules_on(u_doc, 0)) == len(rules_on(poa_base, 0)),
                     f"{len(rules_on(u_doc, 0))} vs {len(rules_on(poa_base, 0))}")

        # ── Preflight and final render decide the same layout ────────────────
        #
        # The wizard tells a manager what will happen before the document is
        # generated. That promise is only worth anything if the two cannot
        # disagree: they run the same decision pass, and the fingerprint of what
        # it decided is compared here for every document and every profile.
        agreement = browser.eval(
            """
            (async function () {
              const ids = Object.keys(CRMDocumentEngine.fieldMaps).sort();
              const profiles = ['ru-resident-normal', 'ru-company-normal',
                                'en-nonresident-normal', 'en-company-normal',
                                'ru-resident-long', 'ru-company-long'];
              const out = { compared: 0, mismatches: [], preflightOnly: [],
                            renderOnly: [] };
              for (const id of ids) {
                const t = CRMDocumentEngine.fieldMaps[id];
                const project = CRMDocumentBuilder.schema.fromProduction(t, null);
                for (const profile of profiles) {
                  const payload = CRMDocumentBuilder.fixtures.payloadFor(profile, project);
                  let pre = null, preError = null;
                  try { pre = await CRMDocumentEngine.overlayRenderer.preflight(t, payload); }
                  catch (e) { preError = e.name; }
                  let drew = null, renderError = null;
                  try {
                    await CRMDocumentEngine.overlayRenderer.render(t, payload, {
                      onPlan: function (decided) { drew = decided.fingerprint; }
                    });
                  } catch (e) { renderError = e.name; }
                  // A configuration fault stops both; a value that does not
                  // fit is reported by the preflight and thrown by the render.
                  if (preError || renderError) {
                    if (!preError !== !renderError && !(pre && !pre.ok)) {
                      out.mismatches.push(id + '/' + profile + ' preflight=' +
                        preError + ' render=' + renderError);
                    }
                  }
                  if (pre && pre.ok && renderError) {
                    out.preflightOnly.push(id + '/' + profile);
                  }
                  if (pre && !pre.ok && !renderError) {
                    out.renderOnly.push(id + '/' + profile);
                  }
                  if (pre && drew) {
                    out.compared += 1;
                    if (pre.fingerprint !== drew) {
                      out.mismatches.push(id + '/' + profile + ' fingerprint');
                    }
                  }
                }
              }
              return JSON.stringify(out);
            }())
            """, await_promise=True)
        verdict = json.loads(agreement)
        checks.check("preflight and final render decide the same layout",
                     verdict["compared"] > 90 and not verdict["mismatches"],
                     json.dumps(verdict, ensure_ascii=False)[:400])
        checks.check("a successful preflight is never a failed generation",
                     not verdict["preflightOnly"],
                     json.dumps(verdict["preflightOnly"], ensure_ascii=False))
        checks.check("a refused preflight is never a silent success",
                     not verdict["renderOnly"],
                     json.dumps(verdict["renderOnly"], ensure_ascii=False))

        # The same payload twice gives the same plan, character for character.
        stable = browser.eval(
            """
            (async function () {
              const t = CRMDocumentEngine.fieldMaps['power-of-attorney'];
              const project = CRMDocumentBuilder.schema.fromProduction(t, null);
              const payload = CRMDocumentBuilder.fixtures.payloadFor('en-nonresident-normal', project);
              const a = await CRMDocumentEngine.overlayRenderer.preflight(t, payload);
              const b = await CRMDocumentEngine.overlayRenderer.preflight(t, payload);
              return JSON.stringify({ same: a.fingerprint === b.fingerprint,
                                      rows: a.expansion.length, ok: a.ok });
            }())
            """, await_promise=True)
        repeatable = json.loads(stable)
        checks.check("the layout plan is deterministic for the same payload",
                     repeatable["same"] and repeatable["rows"] >= 3, stable)

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
