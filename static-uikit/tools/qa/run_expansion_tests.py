"""Page-section expansion: behaviour and PDF structure.

    python static-uikit/tools/qa/run_expansion_tests.py

Renders the same document with values of increasing length and inspects the
real PDF each time. The production output — not a canvas preview — is the
source of truth here, so every assertion is made against the generated file
with pymupdf and pypdf.
"""

from __future__ import annotations

import base64
import collections
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
  let flowPages = [], underlines = [];
  const blob = await CRMDocumentEngine.overlayRenderer.render(t, payload, {
    onExpansion: function (list) { list.forEach(function (n) { notes.push(n); }); },
    onPlan: function (d) {
      flowPages = Object.keys(d.plans).filter(function (page) {
        return !!d.plans[page].pageFlow;
      }).map(Number);
      // Where the layout engine assigned an inline underline decoration, so a
      // reviewed blank can be told apart from a continuation rule.
      Object.keys((d.planned && d.planned.byBlock) || {}).forEach(function (id) {
        const result = d.planned.byBlock[id];
        if (!result || !result.drawn || !result.layout) return;
        const block = (t.wordFlowBlocks || []).filter(function (item) {
          return item.id === id;
        })[0];
        const plan = block ? (d.plans || {})[block.page] : null;
        function shiftAt(top) {
          if (!plan) return 0;
          return (plan.shifts || []).reduce(function (total, shift) {
            if (shift.fieldId === id) return total;
            if (top < shift.fromTop - 1e-6 || top > shift.toTop + 1e-6) return total;
            return total + Number(shift.delta);
          }, 0);
        }
        (result.layout.lines || []).forEach(function (line) {
          const y = line.baselineTop + shiftAt(line.baselineTop);
          (line.runs || []).forEach(function (run) {
            if (!run.decoration || !run.decoration.underline || !(run.width > 0)) return;
            underlines.push({
              page: block ? block.page : 0,
              top: y + Number(run.decoration.offset != null ? run.decoration.offset : 2),
              left: run.x, right: run.x + run.width
            });
          });
        });
      });
      // Ordinary multiline fields can own reviewed rules too.  Record the
      // exact regions the shared layout engine chose, so the assertion below
      // does not mistake an `otherInstruments` rule for an unreviewed
      // Word-flow continuation.
      Object.keys((d.planned && d.planned.byField) || {}).forEach(function (id) {
        const result = d.planned.byField[id];
        if (!result || !result.drawn || !result.layout) return;
        const regions = result.layout.regions || result.regions || [];
        (result.layout.lines || []).forEach(function (line) {
          const region = regions[line.regionIndex];
          if (!region || !region.drawUnderline) return;
          const lineHeight = CRMDocumentEngine.textLayout
            .lineHeightAt(region, result.layout.size);
          const top = region.underlineTop != null
            ? Number(region.underlineTop) + Number(line.lineIndex || 0) * lineHeight
            : Number(region.baselineTop) + Number(line.lineIndex || 0) * lineHeight +
              Number(region.underlineOffset != null ? region.underlineOffset : 2);
          const left = Number(region.underlineLeft != null
            ? region.underlineLeft : region.left);
          const width = Number(region.underlineWidth != null
            ? region.underlineWidth : region.width);
          underlines.push({ page: Number(region.page), top: top,
                            left: left, right: left + width });
        });
      });
    }
  });
  const u8 = new Uint8Array(await blob.arrayBuffer());
  let s = ''; const c = 0x8000;
  for (let i = 0; i < u8.length; i += c) s += String.fromCharCode.apply(null, u8.subarray(i, i + c));
  return JSON.stringify({ pdf: btoa(s), notes: notes, flowPages: flowPages,
                          underlines: underlines });
}(DOC, PROFILE, OVERRIDES))
"""

SHORT_NAME = "АО «Тестовые инвестиции»"
LONG_NAME = "Акционерное общество «Международные инвестиционные технологии и решения»"
LONGER_NAME = ("Публичное акционерное общество «Международные инвестиционные "
               "технологии, инфраструктурные решения и управление активами "
               "Центрального федерального округа»")
SHORT_ADDRESS = "125009, Россия, г. Москва, ул. Тверская, д. 14"
# The уведомление sets «Кому:»/«Адрес:» in a 154 pt column, so an ordinary
# postal address genuinely takes a second line there. This one is short enough
# to leave the block at its printed height, which is what makes it the baseline
# for "no value, no extra line".
TINY_ADDRESS = "г. Москва"
LONG_ADDRESS = ("Apartment 148, Building 27, Saint Christopher International "
                "Business Park, King George the Fifth Avenue, London, SW1A 2AA")

# Since the доверенность intro became one reviewed Word-flow paragraph, an
# ordinary long client no longer spends the page's reserve: the paragraph simply
# reflows. The reviewed cross-page rule is reached only by a client long enough
# to take the whole local budget first, so the tests that cover that rule have to
# supply one. These are ordinary Russian words with ordinary spaces — a very long
# client, not a stress string.
_FLOW_WORDS = "Международных Инвестиционных Технологий "
_FLOW_ADDRESS = ("город Москва улица Большая Академическая дом 27 корпус 3 "
                 "квартира 148 ")


def _flow_overrides(name, repeat):
    return {
        "field.client-full-name": name,
        "extra.extra-authorized-signer": "Председатель Правления " + _FLOW_WORDS * repeat,
        "extra.extra-attorney-name": "Александров-Смирнов Константин Владиславович",
        "extra.extra-attorney-issued-by": "ГУ МВД России по городу Москве "
                                          + _FLOW_WORDS * repeat,
        "extra.extra-attorney-address": _FLOW_ADDRESS * repeat,
    }


# Four rows on the ЮЛ page and three on the ФЛ page: measured thresholds at
# which each variant's local reserve is exhausted and its reviewed cross-page
# rule takes over.
POA_COMPANY_FLOW = _flow_overrides(
    "Публичное акционерное общество «Управляющая компания " + _FLOW_WORDS * 4 + "»", 4)
POA_PERSON_FLOW = _flow_overrides("Александров-Смирнов Константин Владиславович", 3)


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
        return self.render_plan(doc, profile, overrides)[:2]

    def render_plan(self, doc, profile, overrides):
        """Render, and report the reviewed cross-page pages and underlines."""
        script = (RENDER
                  .replace("DOC", json.dumps(doc))
                  .replace("PROFILE", json.dumps(profile))
                  .replace("OVERRIDES", json.dumps(overrides, ensure_ascii=False)))
        payload = json.loads(self.browser.eval(script, await_promise=True))
        return (base64.b64decode(payload["pdf"]), payload["notes"],
                payload.get("flowPages") or [], payload.get("underlines") or [])


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

        # ── Company name: none / one / two inserted lines ────────────────────
        #
        # This page is three reviewed Word-flow blocks. A line inside a block is
        # positioned by the reflow, so its absolute y is not an invariant — the
        # paragraph is meant to rewrap. What is invariant is what the page owes
        # the content *below* the blocks: it moves down by exactly the complete
        # lines the blocks above it added, and by nothing else.
        base = fitz.open(os.path.join(TEMPLATES, "qualification-notice.pdf"))
        base_rules = len(rules_on(base, 0))
        base_text = " ".join(base[0].get_text().split())
        signature = "Должность уполномоченного лица"
        header = "УВЕДОМЛЕНИЕ"
        base_signature = anchor_y(base, 0, signature)
        base_header = anchor_y(base, 0, header)
        pitch = 11.52
        recipient_block = "qualification-notice-recipient"

        def pitches_of(notes, only=None):
            return sum(n["rows"] for n in notes if n["page"] == 0
                       and (only is None or n["fieldId"] == only))

        outputs = {}
        for key, name in (("short", SHORT_NAME), ("long", LONG_NAME),
                          ("longer", LONGER_NAME)):
            pdf, notes, _flow, lines = engine.render_plan(
                "qualification-notice", "ru-resident-normal",
                {"field.client-full-name": name,
                 "field.client-registration-address": TINY_ADDRESS})
            outputs[key] = (fitz.open(stream=pdf, filetype="pdf"), notes, pdf, lines)

        short_doc, short_notes = outputs["short"][0], outputs["short"][1]
        long_doc, long_notes = outputs["long"][0], outputs["long"][1]
        longer_doc, longer_notes = outputs["longer"][0], outputs["longer"][1]

        checks.check("a normal client and address need no extra line",
                     not short_notes and
                     anchor_y(short_doc, 0, signature) == base_signature,
                     f"signature {anchor_y(short_doc, 0, signature)} vs "
                     f"{base_signature}, notes {short_notes}")
        checks.check("a long client name grows a block and moves the signature",
                     pitches_of(long_notes) > 0 and
                     anchor_y(long_doc, 0, signature) > base_signature,
                     f"{anchor_y(long_doc, 0, signature)} vs {base_signature}")
        checks.check("a very long client name moves it further still",
                     anchor_y(longer_doc, 0, signature) >
                     anchor_y(long_doc, 0, signature),
                     f"{anchor_y(longer_doc, 0, signature)} vs "
                     f"{anchor_y(long_doc, 0, signature)}")

        # Every scenario: the content below moves by complete source lines, and
        # by exactly as many as the blocks above it reported.
        for key, (document, notes, _pdf, _lines) in outputs.items():
            expected = base_signature + pitches_of(notes) * pitch
            checks.check(f"{key}: the signature moves by whole lines only",
                         abs(anchor_y(document, 0, signature) - expected) <= 0.05,
                         f"{anchor_y(document, 0, signature):.2f} vs {expected:.2f} "
                         f"({pitches_of(notes)} pitches)")

        # ── Fixed header stays put ───────────────────────────────────────────
        checks.check("content above the first anchor never moves",
                     anchor_y(long_doc, 0, "Приложение № 3") ==
                     anchor_y(base, 0, "Приложение № 3"),
                     f"{anchor_y(long_doc, 0, 'Приложение № 3')} vs "
                     f"{anchor_y(base, 0, 'Приложение № 3')}")
        for key, (document, notes, _pdf, _lines) in outputs.items():
            between = base_header + pitches_of(notes, recipient_block) * pitch
            checks.check(f"{key}: content between two anchors takes only the first shift",
                         abs(anchor_y(document, 0, header) - between) <= 0.05,
                         f"{anchor_y(document, 0, header):.2f} vs {between:.2f}")

        # These blocks are declared `lineStyle: 'none'` — growing one adds a line
        # of text, never a continuation rule. The only rules the engine may add
        # here are the inline underlines its own layout assigned.
        for key, (document, _notes, _pdf, lines) in outputs.items():
            assigned = [u for u in lines if int(u["page"]) == 0]
            printed = collections.Counter(
                (round(r.x0, 2), round(r.x1, 2)) for r in rules_on(base, 0))
            unassigned = []
            for rect in rules_on(document, 0):
                shape = (round(rect.x0, 2), round(rect.x1, 2))
                if printed[shape]:
                    printed[shape] -= 1
                elif not any(abs(rect.y0 - u["top"]) <= 1.0
                             and abs(rect.x0 - u["left"]) <= 1.0
                             and abs(rect.x1 - u["right"]) <= 1.0 for u in assigned):
                    unassigned.append((round(rect.y0, 2), round(rect.x0, 2)))
            checks.check(f"{key}: a grown block draws no continuation rule",
                         not unassigned, f"{unassigned[:3]} of {len(assigned)} assigned")

        # ── Structure of every expanded output ───────────────────────────────
        for key, (document, _notes, pdf, _lines) in outputs.items():
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
            naive = " ".join(pypdf.PdfReader(
                __import__("io").BytesIO(pdf)).pages[0].extract_text().split())
            checks.check(f"{key}: no duplication for a clip-blind extractor",
                         naive.count("настоящим уведомляет") == 1,
                         f"pypdf count={naive.count('настоящим уведомляет')} "
                         f"len={len(naive)} head={naive[:80]!r}")
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
                                 {"field.client-full-name": LONG_NAME,
                                  "field.client-registration-address": TINY_ADDRESS})
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
              // Room for exactly one 11.52 pt line: the configuration stays
              // valid, and the further lines this client needs cannot be paid
              // for. A budget below one whole line is a configuration error
              // instead, which is a different check.
              t.pageLayout[0].bottomClearance = 841.92 - t.pageLayout[0].bodyBottom - 11.52;
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
              // Reviewed Word-flow blocks own the page anchors on this map, so
              // the rule has to hold for them exactly as it does for fields.
              (t.fields || []).concat(t.wordFlowBlocks || []).forEach(function (f) {
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
                const flow = CRMDocumentEngine.overlayRenderer
                  .planWordFlowBlocks(t, payload, fonts);
                const demands = CRMDocumentEngine.overlayRenderer
                  .expansionDemands(t, payload, fonts, flow);
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
        # The доверенность now carries one reviewed anchor per page, so the page
        # that shares a budget between several anchors is the уведомление: three
        # reviewed blocks, one budget, allocated top to bottom.
        shared = browser.eval(
            """
            (async function (name, address) {
              const t = CRMDocumentEngine.fieldMaps['qualification-notice'];
              const project = CRMDocumentBuilder.schema.fromProduction(t, null);
              const bytes = await (await fetch(t.templateUrl)).arrayBuffer();
              const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
              doc.registerFontkit(fontkit);
              const fb = await (await fetch(t.fonts.legalSerif)).arrayBuffer();
              const fonts = { legalSerif: await doc.embedFont(fb, { subset: true }) };
              // The legal-entity branch puts the same long name in two reviewed
              // blocks, which is what makes one page budget serve two anchors.
              const payload = CRMDocumentBuilder.fixtures.payloadFor('ru-company-normal', project);
              payload.fields['client-full-name'] = name;
              payload.fields['client-registration-address'] = address;
              // A reviewed block reports the complete lines it needs only when
              // its own layout has been decided first.
              const flow = CRMDocumentEngine.overlayRenderer
                .planWordFlowBlocks(t, payload, fonts);
              const demands = CRMDocumentEngine.overlayRenderer
                .expansionDemands(t, payload, fonts, flow);
              const plan = CRMDocumentEngine.pageExpander.planPage(
                0, demands, doc.getPages()[0].getSize().height, (t.pageLayout || {})[0]);
              return JSON.stringify({ consumption: plan.consumption,
                                      errors: plan.errors.length,
                                      anchors: (t.pageLayout[0].anchors || []) });
            }(%s, %s))
            """ % (json.dumps(LONGER_NAME, ensure_ascii=False),
                   json.dumps(SHORT_ADDRESS, ensure_ascii=False)),
            await_promise=True)
        allocation = json.loads(shared)
        spend = allocation["consumption"]
        checks.check("unused capacity is left to the anchors below",
                     len(spend) >= 2 and allocation["errors"] == 0 and
                     all(a["remaining"] > b["remaining"]
                         for a, b in zip(spend, spend[1:])),
                     json.dumps(spend, ensure_ascii=False))
        checks.check("the plan accounts for the budget anchor by anchor",
                     all(e["cumulative"] == round(sum(x["delta"] for x in spend[:i + 1]), 2)
                         for i, e in enumerate(spend)),
                     json.dumps(spend, ensure_ascii=False))
        checks.check("anchors are allocated top to bottom, deterministically",
                     [e["fieldId"] for e in spend] ==
                     [a for a in allocation["anchors"]
                      if a in {e["fieldId"] for e in spend}],
                     json.dumps([e["fieldId"] for e in spend]))

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

        # The reviewed intro paragraph absorbs an ordinary long client on its
        # own. A client long enough to take the whole local reserve first is
        # what reaches the reviewed cross-page rule, which moves the final
        # complete power before its existing continuation on the next page and
        # preserves the four authoritative pages.
        company_pdf, company_notes, company_flow, _cu = engine.render_plan(
            "power-of-attorney", "ru-company-normal", POA_COMPANY_FLOW)
        checks.check("an ordinary long ЮЛ доверенность uses reviewed cross-page flow",
                     company_flow == [0] and
                     any(n["fieldId"] == "power-of-attorney-ul-intro"
                         for n in company_notes),
                     json.dumps({"flow": company_flow, "notes": company_notes},
                                ensure_ascii=False)[:300])
        person_pdf, person_notes, person_flow, _pu = engine.render_plan(
            "power-of-attorney", "ru-resident-normal", POA_PERSON_FLOW)
        checks.check("an ordinary long ФЛ доверенность uses reviewed cross-page flow",
                     person_flow == [2] and
                     any(n["fieldId"] == "power-of-attorney-fl-intro"
                         for n in person_notes),
                     json.dumps({"flow": person_flow, "notes": person_notes},
                                ensure_ascii=False)[:300])
        checks.check("cross-page flow preserves the four pages for both variants",
                     fitz.open(stream=company_pdf, filetype="pdf").page_count == 4 and
                     fitz.open(stream=person_pdf, filetype="pdf").page_count == 4,
                     "")
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
        person_doc = fitz.open(stream=person_pdf, filetype="pdf")
        moved_phrase = "поручения на операции с денежными"
        checks.check("the moved trailing block occurs on page 4 exactly once",
                     moved_phrase not in person_doc[2].get_text() and
                     person_doc[3].get_text().count(moved_phrase) == 1,
                     json.dumps([person_doc[i].get_text().count(moved_phrase)
                                 for i in range(4)]))
        checks.check("cross-page flow preserves the four authoritative pages",
                     person_doc.page_count == poa_base.page_count == 4,
                     str(person_doc.page_count))

        # Reviewed white space is recovered only by a client that needs it. An
        # ordinary one now reflows inside the paragraph and the title stays
        # exactly where the form printed it.
        company_doc = fitz.open(stream=company_pdf, filetype="pdf")
        checks.check("an ordinary ЮЛ client leaves the title where it was printed",
                     anchor_y(rendered["ru-company-normal"], 0, "Доверенность") == title_0,
                     f"{anchor_y(rendered['ru-company-normal'], 0, 'Доверенность')} vs {title_0}")
        # Two reviewed gaps sit above the title — the 2.25 cm top margin (21.35 pt)
        # and the gap under the appendix header (6.71 pt). Nothing may be
        # recovered past their approved minimums.
        checks.check("the legal-entity page recovers white space when it must",
                     0 < title_0 - anchor_y(company_doc, 0, "Доверенность")
                     <= 21.35 + 6.71 + 0.02,
                     f"{anchor_y(company_doc, 0, 'Доверенность')} vs {title_0}")
        checks.check("the individual page draws on its top margin, not past it",
                     0 < title_2 - anchor_y(person_doc, 2, "Доверенность") <= 14.63 + 0.02,
                     f"{anchor_y(person_doc, 2, 'Доверенность')} vs {title_2}")

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
        person, notes_person = engine.render(
            "qualification-notice", "ru-resident-normal", {})
        company, notes_company = engine.render(
            "qualification-notice", "ru-company-normal", {})
        p_doc = fitz.open(stream=person, filetype="pdf")
        c_doc = fitz.open(stream=company, filetype="pdf")

        # The either/or line is one reviewed Word-flow block. The individual
        # branch prints the sentence on its own; the legal-entity branch sets
        # the organisation name inside the same sentence, which is what Word
        # would do — not a separate row, and never a second copy of the line.
        register_base = anchor_y(base, 0, "в реестр")
        pitch = 11.52
        above = ("qualification-notice-recipient", "qualification-notice-recognition")

        def register_spans(document):
            out = []
            for blk in document[0].get_text("rawdict")["blocks"]:
                for line in blk.get("lines", []):
                    for span in line.get("spans", []):
                        text = "".join(c.get("c", "") for c in span.get("chars", []))
                        if "в реестр" in text:
                            out.append((span["bbox"][1], span["font"], text))
            return out

        for label, document, notes in (("individual", p_doc, notes_person),
                                       ("legal entity", c_doc, notes_company)):
            spans = register_spans(document)
            checks.check(f"the {label} branch prints the either/or line exactly once",
                         len(spans) == 1 and "Liberation" in spans[0][1],
                         str([(round(s[0], 2), s[1]) for s in spans]))
            if len(spans) != 1:
                continue
            pitches = sum(n["rows"] for n in notes
                          if n["page"] == 0 and n["fieldId"] in above)
            expected = register_base + pitches * pitch
            checks.check(f"the {label} branch moves down only by the rows above it",
                         abs(spans[0][0] - expected) <= 0.05,
                         f"{spans[0][0]:.2f} vs {expected:.2f} ({pitches} pitches)")
        checks.check("the legal-entity branch sets its name inside the same sentence",
                     any("Тестовые инвестиции" in span[2]
                         for span in register_spans(c_doc)),
                     str([s[2][:60] for s in register_spans(c_doc)]))

        # ── Zero rows leaves the form exactly as printed ─────────────────────
        untouched, untouched_notes, _uf, untouched_underlines = engine.render_plan(
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
        # The reviewed intro still underlines its own inline blanks — that is the
        # form being filled. What must not appear is a continuation rule: every
        # rule this render added has to be an underline the layout engine
        # assigned, at the exact place it assigned it.
        printed_shapes = collections.Counter(
            (round(r.x0, 2), round(r.x1, 2)) for r in rules_on(poa_base, 0))
        added_rules = []
        for rect in rules_on(u_doc, 0):
            shape = (round(rect.x0, 2), round(rect.x1, 2))
            if printed_shapes[shape]:
                printed_shapes[shape] -= 1
            else:
                added_rules.append(rect)
        assigned = [u for u in untouched_underlines if int(u["page"]) == 0]
        unassigned = [
            (round(r.y0, 2), round(r.x0, 2), round(r.x1, 2)) for r in added_rules
            if not any(abs(r.y0 - u["top"]) <= 1.0 and abs(r.x0 - u["left"]) <= 1.0
                       and abs(r.x1 - u["right"]) <= 1.0 for u in assigned)]
        checks.check("nothing to expand draws no continuation rule",
                     not unassigned,
                     f"{unassigned[:3]} vs {len(assigned)} assigned underlines")

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
            (async function (overrides) {
              const t = CRMDocumentEngine.fieldMaps['power-of-attorney'];
              const project = CRMDocumentBuilder.schema.fromProduction(t, null);
              const payload = CRMDocumentBuilder.fixtures.payloadFor('ru-company-normal', project);
              Object.keys(overrides).forEach(function (path) {
                const dot = path.indexOf('.');
                const ns = path.slice(0, dot), key = path.slice(dot + 1);
                const target = ns === 'subject' ? payload.subject
                  : ns === 'field' ? payload.fields
                  : ns === 'extra' ? payload.extraValues : payload.checks;
                target[key] = overrides[path];
              });
              const a = await CRMDocumentEngine.overlayRenderer.preflight(t, payload);
              const b = await CRMDocumentEngine.overlayRenderer.preflight(t, payload);
              return JSON.stringify({ same: a.fingerprint === b.fingerprint,
                                      rows: a.expansion.length, ok: a.ok });
            }(%s))
            """ % json.dumps(POA_COMPANY_FLOW, ensure_ascii=False),
            await_promise=True)
        repeatable = json.loads(stable)
        checks.check("the layout plan is deterministic for the same payload",
                     repeatable["same"] and repeatable["ok"] and
                     repeatable["rows"] >= 1, stable)

        # ── No dynamic text below 9 pt anywhere in an expanded page ──────────
        smallest = None
        for _key, (document, _n, _p, _l) in outputs.items():
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
