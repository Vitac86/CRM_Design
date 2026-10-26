"""Order forms (ПРИЛОЖЕНИЕ 7) end-to-end checks, driven headlessly.

    python static-uikit/tools/qa/run_order_forms_tests.py
    python static-uikit/tools/qa/run_order_forms_tests.py --keep out/

Drives the real Document Wizard page with the real engine and the real field
map, generates the PDF each scenario produces, and reads the result back with
pymupdf. Every assertion is made against text extracted from the generated
file, not against the payload the page built — a value that reaches the payload
and not the paper is exactly the failure this form has to be protected from.

What it proves:

  - the card is offered and opens;
  - «Первичная подача заявки» is always ticked and the cancellation box never;
  - a market order prints «Рыночная» and gives the manager no price box;
  - the issuer and the security description are derived, compact, carry no CFI
    and no `SecurityName`, and fit their two-line slot;
  - switching the market does not leak the previous branch's values;
  - a typed ticker that was never picked from the list blocks generation;
  - the other two forms in the file stay blank, and all four pages are emitted;
  - no slot is placed over the form's own printed words;
  - the amount in words is spelled out from the figure, in the right currency
    and with the right Russian agreement, and reaches the paper — including
    the longest amount either form can carry, which continues onto the
    reviewed line the map opens beneath the printed blank;
  - a payout's bank requisites come from the subject card rather than from a
    manager, and missing CRM data refuses the document by name.

Exit code 0 when every check passes.
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
from pathlib import Path

import fitz  # pymupdf

from headless_browser import STATIC_UIKIT, Chrome, Server

COMPANY = "c-011"
INDIVIDUAL = "c-006"
DOC = "order-forms"

# The overlay embeds Liberation Serif; the source form is set in Times New
# Roman, which is how generated text is told apart from printed text.
OVERLAY_FONT_HINT = "Liberation"

TEMPLATE = (Path(STATIC_UIKIT) / "assets" / "document-pdf-templates" / "order-forms.pdf")

# Set by --keep: where each scenario's generated file is written for a visual
# pass. Nothing is written by default.
KEEP_DIR: Path | None = None


class Checks:
    def __init__(self) -> None:
        self.results: list[tuple[str, bool, str]] = []

    def check(self, name: str, ok: bool, detail: str = "") -> bool:
        self.results.append((name, bool(ok), detail))
        return bool(ok)

    @property
    def failed(self):
        return [r for r in self.results if not r[1]]

    def report(self) -> int:
        for name, ok, detail in self.results:
            if not ok:
                print(f"FAIL  {name}\n      {detail}")
        print(f"\nOrder forms: {len(self.results) - len(self.failed)}"
              f"/{len(self.results)} checks passed")
        return 1 if self.failed else 0


# ── Page driving ─────────────────────────────────────────────────────────────

def open_document(browser, server, subject: str) -> bool:
    browser.goto(f"{server.base}/pages/document-wizard.html?subject={subject}")
    browser.eval("new Promise(function (r) { setTimeout(r, 400); })", await_promise=True)
    ok = browser.eval(
        "(function () {"
        "  var b = document.querySelector('button[data-doc-id=\"" + DOC + "\"]');"
        "  if (!b) return false; b.click(); return true; }())"
    )
    if not ok:
        return False
    browser.eval("new Promise(function (r) { setTimeout(r, 200); })", await_promise=True)
    return bool(browser.eval("!document.getElementById('docwiz-step2').hidden"))


def activation_state(browser, server, subject: str) -> dict:
    """Read the post-init registry/card state without bypassing the UI filter."""
    browser.goto(f"{server.base}/pages/document-wizard.html?subject={subject}")
    browser.eval("new Promise(function (r) { setTimeout(r, 400); })", await_promise=True)
    return browser.eval(
        "(function () {"
        " var catalog = window.CRMDocumentCatalog || {};"
        " var entries = (catalog.documents || []).filter(function (doc) {"
        "  return doc.id === 'order-forms';"
        " });"
        " var entry = entries[0] || null;"
        " var cards = document.querySelectorAll("
        "  '#docwiz-doc-grid .crm-docwiz-doc-card[data-doc-id=\"order-forms\"]');"
        " var card = cards[0] || null;"
        " var button = card && card.querySelector("
        "  'button.crm-docwiz-select-btn[data-doc-id=\"order-forms\"]');"
        " var title = card && card.querySelector('.crm-docwiz-doc-title');"
        " var description = card && card.querySelector('.crm-docwiz-doc-desc');"
        " var heading = card && card.previousElementSibling;"
        " while (heading && !heading.classList.contains('crm-docwiz-doc-group-title')) {"
        "  heading = heading.previousElementSibling;"
        " }"
        " function visible(node) {"
        "  if (!node || !node.getClientRects().length) return false;"
        "  var style = getComputedStyle(node);"
        "  return style.display !== 'none' && style.visibility !== 'hidden';"
        " }"
        " return {"
        "  registryCount: entries.length,"
        "  appliesTo: entry && entry.appliesTo,"
        "  blocked: !!(entry && entry.blockedIncompleteMapping),"
        "  overlayTemplateId: entry && entry.overlayTemplateId,"
        "  cardCount: cards.length,"
        "  cardVisible: visible(card),"
        "  title: title && title.textContent.trim(),"
        "  description: description && description.textContent.trim(),"
        "  category: entry && entry.category,"
        "  renderedCategory: heading && heading.textContent.trim(),"
        "  buttonVisible: visible(button),"
        "  buttonText: button && button.textContent.trim(),"
        "  modelLoaded: !!window.CRMOrderForms,"
        "  instrumentsLoaded: !!window.CRMInstrumentCatalog,"
        "  mapLoaded: !!(window.CRMDocumentEngine &&"
        "    window.CRMDocumentEngine.fieldMaps &&"
        "    window.CRMDocumentEngine.fieldMaps['order-forms'])"
        " };"
        "}())"
    ) or {}


SET_FIELD = """
(function (key, value) {
  var el = document.querySelector('#docwiz-extra-fields [data-field-key="' + key + '"]');
  if (!el) return { ok: false, reason: 'missing' };
  if (el.disabled) return { ok: false, reason: 'disabled' };
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true, value: el.value };
}(__KEY__, __VALUE__))
"""


def set_field(browser, key: str, value: str) -> dict:
    return browser.eval(
        SET_FIELD.replace("__KEY__", json.dumps(key))
        .replace("__VALUE__", json.dumps(value, ensure_ascii=False))
    )


TYPE_SEARCH = """
(function (key, text) {
  var el = document.querySelector(
    '#docwiz-extra-fields [data-autocomplete-for="' + key + '"]');
  if (!el) return { ok: false, reason: 'missing' };
  el.focus();
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  var rows = Array.prototype.map.call(
    document.querySelectorAll('#docwiz-field-' + key + '-menu .crm-docwiz-picker-item'),
    function (row) { return row.textContent; });
  return { ok: true, rows: rows, open: !document.getElementById(
    'docwiz-field-' + key + '-menu').hidden };
}(__KEY__, __TEXT__))
"""


def type_search(browser, key: str, text: str) -> dict:
    return browser.eval(
        TYPE_SEARCH.replace("__KEY__", json.dumps(key))
        .replace("__TEXT__", json.dumps(text, ensure_ascii=False))
    )


PICK_RESULT = """
(function (key, index) {
  var menu = document.getElementById('docwiz-field-' + key + '-menu');
  if (!menu || menu.hidden) return { ok: false, reason: 'menu closed' };
  var rows = menu.querySelectorAll('.crm-docwiz-picker-item');
  if (!rows.length || rows[index].classList.contains('crm-docwiz-picker-item-empty')) {
    return { ok: false, reason: 'no result' };
  }
  rows[index].dispatchEvent(new MouseEvent('click', { bubbles: true }));
  var value = document.querySelector(
    '#docwiz-extra-fields [data-field-key="' + key + '"]');
  var card = document.querySelector(
    '#docwiz-field-' + key + '-search').closest('.crm-docwiz-picker')
      .querySelector('.crm-docwiz-picker-card');
  return {
    ok: true,
    id: value ? value.value : null,
    card: card && !card.hidden ? card.textContent : null
  };
}(__KEY__, __INDEX__))
"""


def pick_result(browser, key: str, index: int = 0) -> dict:
    return browser.eval(
        PICK_RESULT.replace("__KEY__", json.dumps(key))
        .replace("__INDEX__", str(index))
    )


def keyboard_pick(browser, key: str, text: str) -> dict:
    """Type, walk down with the keyboard and commit with Enter."""
    return browser.eval(
        """
        (function (key, text) {
          var input = document.querySelector(
            '#docwiz-extra-fields [data-autocomplete-for="' + key + '"]');
          if (!input) return { ok: false, reason: 'missing' };
          input.focus();
          input.value = text;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          function press(name) {
            input.dispatchEvent(new KeyboardEvent('keydown',
              { key: name, bubbles: true, cancelable: true }));
          }
          press('ArrowDown');
          press('Enter');
          var value = document.querySelector(
            '#docwiz-extra-fields [data-field-key="' + key + '"]');
          return { ok: true, id: value ? value.value : null, text: input.value };
        }(__KEY__, __TEXT__))
        """.replace("__KEY__", json.dumps(key))
        .replace("__TEXT__", json.dumps(text, ensure_ascii=False))
    )


def field_values(browser, keys) -> dict:
    """Value and editability of named controls, as the manager sees them."""
    return browser.eval(
        "(function (keys) { var out = {};"
        " keys.forEach(function (key) {"
        "  var el = document.querySelector('#docwiz-extra-fields "
        "[data-field-key=\"' + key + '\"]');"
        "  out[key] = el ? { value: el.value, readOnly: !!el.readOnly,"
        "    type: el.getAttribute('data-field-type'),"
        "    placeholder: el.placeholder || '' } : null;"
        " }); return out; }(" + json.dumps(keys, ensure_ascii=False) + "))"
    ) or {}


def visible_keys(browser) -> list:
    return browser.eval(
        "Array.prototype.filter.call("
        " document.querySelectorAll('#docwiz-extra-fields [data-field-key]'),"
        " function (el) { return !el.disabled; }).map(function (el) {"
        " return el.getAttribute('data-field-key'); })"
    ) or []


def generate(browser, timeout_ms: int = 60000) -> dict:
    browser.eval("document.getElementById('docwiz-generate-pdf-btn').click()")
    return browser.eval(
        """
        new Promise(function (resolve) {
          var started = Date.now();
          (function poll() {
            var status = document.getElementById('docwiz-pdf-status');
            var box = document.getElementById('docwiz-pdf-downloads');
            var text = status ? status.textContent : '';
            var done = /сформирован/.test(text) || status.classList.contains('is-error');
            if (done || Date.now() - started > __TIMEOUT__) {
              var a = box ? box.querySelector('a[data-object-url]') : null;
              var overflow = document.getElementById('docwiz-pdf-overflow');
              resolve({
                status: text,
                kind: status ? status.className : '',
                url: a ? a.getAttribute('data-object-url') : null,
                downloads: box ? box.querySelectorAll('a[data-object-url]').length : 0,
                overflowShown: !!(overflow && !overflow.hidden),
                overflowFields: overflow ? Array.prototype.map.call(
                  overflow.querySelectorAll('.crm-docwiz-overflow-field'),
                  function (el) { return el.textContent; }) : [],
                focused: document.activeElement
                  ? document.activeElement.getAttribute('data-field-key') : null
              });
              return;
            }
            setTimeout(poll, 120);
          }());
        })
        """.replace("__TIMEOUT__", str(timeout_ms)),
        await_promise=True,
    )


def fetch_pdf(browser, url: str) -> bytes:
    encoded = browser.eval(
        """
        fetch(%s).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
          var bytes = new Uint8Array(buf), chunk = 0x8000, out = '';
          for (var i = 0; i < bytes.length; i += chunk) {
            out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
          }
          return btoa(out);
        })
        """ % json.dumps(url),
        await_promise=True,
    )
    return base64.b64decode(encoded)


# ── PDF inspection ───────────────────────────────────────────────────────────

def drawing_signatures(page) -> set:
    return {(round(d["rect"].x0, 1), round(d["rect"].y0, 1),
             round(d["rect"].x1, 1), round(d["rect"].y1, 1))
            for d in page.get_drawings()}


class Rendered:
    """The generated file, split into what the form prints and what we drew."""

    _base = None

    def __init__(self, data: bytes) -> None:
        if Rendered._base is None:
            Rendered._base = fitz.open(TEMPLATE)
        self.doc = fitz.open(stream=data, filetype="pdf")
        self.page_count = self.doc.page_count
        self.overlay_spans: list[dict] = []
        self.page_text: list[str] = []
        # A tick is a vector stroke — the serif font has no ✓ glyph — so it is
        # found as a shape the base template does not have.
        self._marks: dict[int, list] = {}
        for number, page in enumerate(self.doc):
            self.page_text.append(page.get_text())
            for block in page.get_text("dict")["blocks"]:
                for line in block.get("lines") or []:
                    for span in line.get("spans") or []:
                        if OVERLAY_FONT_HINT in span.get("font", ""):
                            span = dict(span)
                            span["page"] = number
                            self.overlay_spans.append(span)
            printed = (drawing_signatures(Rendered._base[number])
                       if number < Rendered._base.page_count else set())
            self._marks[number] = [d["rect"] for d in page.get_drawings()
                                   if (round(d["rect"].x0, 1), round(d["rect"].y0, 1),
                                       round(d["rect"].x1, 1),
                                       round(d["rect"].y1, 1)) not in printed]

    def overlay_text(self, page: int | None = None) -> str:
        return " ".join(s["text"] for s in self.overlay_spans
                        if page is None or s["page"] == page)

    def overlay_pages(self) -> set:
        return {s["page"] for s in self.overlay_spans if s["text"].strip()}

    def marks(self, page: int) -> list:
        """Ticks the renderer added to this page, as (left, baselineTop)-ish."""
        return [(round(rect.x0, 2), round(rect.y1, 2)) for rect in self._marks[page]]

    def min_font_size(self) -> float:
        sizes = [s["size"] for s in self.overlay_spans if s["text"].strip()]
        return min(sizes) if sizes else 0.0

    def close(self) -> None:
        self.doc.close()


def printed_runs(page, baseline: float) -> list:
    """The form's own ink on one printed line, split into words and rules.

    Character boxes, not span boxes: a trailing space is not ink, and a slot
    that ends where a space begins is correctly placed. Underscore runs are
    kept apart from words because writing on a fill-in rule is what a slot is
    for, and writing on a word never is.
    """
    chars = []
    for block in page.get_text("rawdict")["blocks"]:
        for line in block.get("lines") or []:
            for span in line["spans"]:
                if not (span["bbox"][1] - 1.0 <= baseline <= span["bbox"][3] + 1.0):
                    continue
                for ch in span.get("chars") or []:
                    if ch["c"].strip():
                        chars.append(ch)
    runs = []
    for ch in sorted(chars, key=lambda c: c["bbox"][0]):
        kind = "rule" if ch["c"] == "_" else "word"
        if runs and runs[-1]["kind"] == kind and ch["bbox"][0] - runs[-1]["x1"] < 2.0:
            runs[-1]["x1"] = max(runs[-1]["x1"], ch["bbox"][2])
            runs[-1]["text"] += ch["c"]
        else:
            runs.append({"kind": kind, "x0": ch["bbox"][0], "x1": ch["bbox"][2],
                         "text": ch["c"]})
    return runs


def check_slot_geometry(checks: Checks) -> None:
    """No text slot may be placed over a word the form itself prints.

    This is measured against the base template rather than against a generated
    file, so it holds for every value and not only for the ones a scenario
    happens to produce.
    """
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from dump_field_maps import dump

    template = dump()["order-forms"]
    base = fitz.open(TEMPLATE)
    collisions = []
    for field in template["fields"]:
        if (field.get("type") or "text") != "text":
            continue
        left = field["left"]
        right = left + field["width"]
        for run in printed_runs(base[field["page"]], field["baselineTop"]):
            if run["kind"] != "word":
                continue
            if run["x1"] > left + 0.5 and run["x0"] < right - 0.5:
                collisions.append(
                    f"{field['id']} ({left:.2f}–{right:.2f}) over "
                    f"[{run['x0']:.2f}–{run['x1']:.2f}] {run['text'][:30]!r}")
    base.close()
    checks.check("no slot is placed over the form's printed words",
                 not collisions, "; ".join(collisions))
    unlabelled = [f["id"] for f in template["fields"]
                  if (f.get("type") or "text") == "text" and not f.get("label")]
    checks.check("every printed row can be named in an overflow report",
                 not unlabelled, str(unlabelled))


# The two «Вид подачи» boxes of the trade form, from the field map.
TRADE_PRIMARY_BOX = (81.26, 96.02)
TRADE_CANCEL_BOX = (81.26, 112.58)


def near(mark, target) -> bool:
    """Is this tick the one the map places at (left, baselineTop)?

    The stroke is inset inside the printed box, and the box sits just above the
    baseline, so the tick lands a couple of points right of `left` and a couple
    of points above `baselineTop`. The tolerance is far smaller than the gap
    between any two boxes of one group, which is what has to be told apart.
    """
    return abs(mark[0] - target[0]) <= 4.0 and abs(mark[1] - target[1]) <= 5.0


# ── Scenario helpers ─────────────────────────────────────────────────────────

def fill_common(browser, order_type: str) -> None:
    set_field(browser, "extra-order-type", order_type)
    set_field(browser, "extra-contract-number-date", "BR-2026/00444 от 29.07.2026")
    set_field(browser, "extra-brokerage-account", "30601-000-4401")


def fill_trade_common(browser, *, side="buy", market="stock", kind="market",
                      settlement="T+1", validity="cancelled") -> None:
    set_field(browser, "extra-trade-kind", side)
    set_field(browser, "extra-order-market", market)
    set_field(browser, "extra-order-kind", kind)
    set_field(browser, "extra-order-validity-mode", validity)
    set_field(browser, "extra-settlement-period", settlement)


def render(browser, checks: Checks, label: str):
    result = generate(browser)
    if not checks.check(f"{label}: PDF generated",
                        result["downloads"] == 1 and "is-error" not in result["kind"],
                        json.dumps(result, ensure_ascii=False)):
        return None
    data = fetch_pdf(browser, result["url"])
    if KEEP_DIR is not None:
        name = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")
        KEEP_DIR.mkdir(parents=True, exist_ok=True)
        (KEEP_DIR / f"{name}.pdf").write_bytes(data)
    return Rendered(data)


def assert_frame(checks: Checks, label: str, pdf: Rendered) -> None:
    """What must hold for every generated order, whichever form it is."""
    checks.check(f"{label}: all four pages emitted", pdf.page_count == 4,
                 f"page count {pdf.page_count}")
    checks.check(f"{label}: no text below the 9 pt floor",
                 pdf.min_font_size() >= 8.99, f"min {pdf.min_font_size()}")


def main() -> int:  # noqa: C901 — one linear scenario list reads better whole
    global KEEP_DIR
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keep", metavar="DIR",
                        help="write each scenario's generated PDF here for a visual pass")
    args = parser.parse_args()
    if args.keep:
        KEEP_DIR = Path(args.keep)

    server, browser = Server(), Chrome()
    checks = Checks()
    try:
        server.assert_assets([
            "/assets/js/document-wizard/instrument-catalog.js",
            "/assets/js/document-wizard/order-forms-model.js",
            "/assets/js/document-field-maps/order-forms.js",
            "/assets/js/pages/document-wizard.js",
        ])
        check_slot_geometry(checks)

        # ── 0. The card is offered and opens ────────────────────────────────
        activation = activation_state(browser, server, INDIVIDUAL)
        checks.check("activation: exactly one order-forms registry entry exists",
                     activation.get("registryCount") == 1,
                     json.dumps(activation, ensure_ascii=False))
        checks.check("activation: c-006 is supported and the entry is not blocked",
                     "individual" in (activation.get("appliesTo") or [])
                     and not activation.get("blocked"),
                     json.dumps(activation, ensure_ascii=False))
        checks.check("activation: the overlay strategy, map and support models are loaded",
                     activation.get("overlayTemplateId") == DOC
                     and activation.get("mapLoaded")
                     and activation.get("modelLoaded")
                     and activation.get("instrumentsLoaded"),
                     json.dumps(activation, ensure_ascii=False))
        checks.check("activation: order-forms survives initWizard filtering as one visible card",
                     activation.get("cardCount") == 1 and activation.get("cardVisible"),
                     json.dumps(activation, ensure_ascii=False))
        checks.check("activation: the visible card has the authoritative title and description",
                     activation.get("title") == "Поручение (формы поручений)"
                     and activation.get("description") ==
                     "Приложение 7 к Регламенту брокерского обслуживания.",
                     json.dumps(activation, ensure_ascii=False))
        checks.check("activation: the card is rendered under operational requests",
                     activation.get("category") == "Операционные заявки"
                     and activation.get("renderedCategory") == "Операционные заявки",
                     json.dumps(activation, ensure_ascii=False))
        checks.check("activation: the visible Select button exists",
                     activation.get("buttonVisible")
                     and activation.get("buttonText") == "Выбрать",
                     json.dumps(activation, ensure_ascii=False))

        opened = open_document(browser, server, COMPANY)
        checks.check("order-forms is offered and opens for a company", opened)
        checks.check("order-forms is offered for an individual",
                     open_document(browser, server, INDIVIDUAL))
        if not opened:
            return checks.report()

        # The choices the process does not allow must not exist at all.
        options = browser.eval(
            "(function () {"
            " var out = {};"
            " ['extra-order-kind', 'extra-order-type', 'extra-settlement-period',"
            "  'extra-order-validity-mode', 'extra-otc-instrument-type'].forEach(function (key) {"
            "  var el = document.querySelector('#docwiz-extra-fields [data-field-key=\"' + key + '\"]');"
            "  out[key] = el ? Array.prototype.map.call(el.options, function (o) { return o.value; }) : null;"
            " });"
            " out.submissionControl = !!document.querySelector("
            "  '#docwiz-extra-fields [data-field-key=\"extra-submission-kind\"]');"
            " out.uncoveredControl = !!document.querySelector("
            "  '#docwiz-extra-fields [data-check-key=\"order-uncovered-ack\"]');"
            " return out; }())"
        )
        checks.check("conditional orders cannot be selected",
                     "conditional" not in (options["extra-order-kind"] or []),
                     str(options["extra-order-kind"]))
        checks.check("order kind offers exactly market and limit",
                     [v for v in options["extra-order-kind"] if v] == ["market", "limit"],
                     str(options["extra-order-kind"]))
        checks.check("settlement is a fixed T+0/T+1/T+2 choice",
                     [v for v in options["extra-settlement-period"] if v]
                     == ["T+0", "T+1", "T+2"],
                     str(options["extra-settlement-period"]))
        checks.check("validity is a fixed two-way choice",
                     [v for v in options["extra-order-validity-mode"] if v]
                     == ["cancelled", "date"],
                     str(options["extra-order-validity-mode"]))
        checks.check("OTC offers only a security or a currency instrument",
                     [v for v in options["extra-otc-instrument-type"] if v]
                     == ["security", "currency"],
                     str(options["extra-otc-instrument-type"]))
        checks.check("submission kind is not a control the manager sees",
                     options["submissionControl"] is False)
        checks.check("the uncovered-position mark is not asked",
                     options["uncoveredControl"] is False)

        # ── 1. Stock / Buy / Market / ordinary share ────────────────────────
        open_document(browser, server, COMPANY)
        fill_common(browser, "trade")
        fill_trade_common(browser)
        by_name = type_search(browser, "extra-security-asset-id", "акция обыкновенная")
        checks.check("security search supports the security name",
                     any("Сбербанк ао" in row for row in by_name.get("rows", [])),
                     json.dumps(by_name, ensure_ascii=False))
        by_isin = type_search(browser, "extra-security-asset-id", "RU0009029540")
        checks.check("security search supports ISIN",
                     any("Сбербанк ао" in row for row in by_isin.get("rows", [])),
                     json.dumps(by_isin, ensure_ascii=False))
        by_issuer = type_search(browser, "extra-security-asset-id", "ПАО Сбербанк")
        checks.check("security search supports the issuer",
                     any("Сбербанк ао" in row for row in by_issuer.get("rows", [])),
                     json.dumps(by_issuer, ensure_ascii=False))
        typed = type_search(browser, "extra-security-asset-id", "sber")
        checks.check("a ticker search offers results", bool(typed.get("rows")),
                     json.dumps(typed, ensure_ascii=False))
        checks.check("one Asset appears once despite four Securities aliases",
                     len([r for r in typed["rows"] if "Сбербанк ао" in r]) == 1,
                     json.dumps(typed["rows"], ensure_ascii=False))
        picked = pick_result(browser, "extra-security-asset-id", 0)
        checks.check("picking a result stores the AssetID",
                     picked.get("id") == "A-100001", json.dumps(picked, ensure_ascii=False))
        checks.check("the selected security shows a read-only summary",
                     "RU0009029540" in (picked.get("card") or ""),
                     json.dumps(picked, ensure_ascii=False))
        set_field(browser, "extra-security-quantity", "150")
        set_field(browser, "extra-repo-ccp", "no")

        keys = visible_keys(browser)
        checks.check("a market order gives the manager no price box",
                     "extra-security-price" not in keys, str(keys))
        checks.check("the issuer is not an editable control",
                     "extra-security-issuer" not in keys, str(keys))
        checks.check("the security description is not an editable control",
                     "extra-security-type" not in keys, str(keys))
        checks.check("no derivative control on the stock market",
                     "extra-derivative-id" not in keys, str(keys))
        checks.check("no currency control on the stock market",
                     "extra-fx-instrument-id" not in keys, str(keys))

        pdf = render(browser, checks, "stock/buy/market")
        if pdf:
            assert_frame(checks, "stock/buy/market", pdf)
            printed = pdf.overlay_text()
            checks.check("stock/buy/market: market price prints «Рыночная»",
                         "Рыночная" in printed, printed[:400])
            checks.check("stock/buy/market: the issuer is printed",
                         "ПАО Сбербанк" in printed, printed[:400])
            checks.check("stock/buy/market: the compact description is printed",
                         "Акции обыкновенные" in printed and "RU0009029540" in printed,
                         printed[:400])
            checks.check("stock/buy/market: no CFI is printed",
                         "CFI" not in printed, printed[:400])
            checks.check("stock/buy/market: no SecurityName reaches the paper",
                         "in MOEX" not in printed and "TQBR" not in printed,
                         printed[:400])
            checks.check("stock/buy/market: «До отмены» is printed",
                         "До отмены" in printed, printed[:400])
            checks.check("stock/buy/market: the settlement period is printed",
                         "T+1" in printed, printed[:400])
            marks = pdf.marks(0)
            checks.check("stock/buy/market: primary submission is ticked",
                         any(near(m, TRADE_PRIMARY_BOX) for m in marks), str(marks))
            checks.check("stock/buy/market: cancellation is never ticked",
                         not any(near(m, TRADE_CANCEL_BOX) for m in marks), str(marks))
            checks.check("stock/buy/market: the acknowledgement is ticked on page 2",
                         len(pdf.marks(1)) >= 1, str(pdf.marks(1)))
            checks.check("stock/buy/market: the transfer form stays blank",
                         2 not in pdf.overlay_pages(), str(sorted(pdf.overlay_pages())))
            checks.check("stock/buy/market: the payout form stays blank",
                         3 not in pdf.overlay_pages(), str(sorted(pdf.overlay_pages())))
            checks.check("stock/buy/market: no derivative value is printed",
                         "Фьючерс" not in printed and "Опцион" not in printed, printed[:400])
            pdf.close()

        # ── 2. Stock / Sell / Limit / corporate bond ────────────────────────
        open_document(browser, server, COMPANY)
        fill_common(browser, "trade")
        fill_trade_common(browser, side="sell", kind="limit", settlement="T+2",
                          validity="date")
        set_field(browser, "extra-order-validity-date", "2026-12-31")
        keyboard_pick(browser, "extra-security-asset-id", "RU000A10CXA6")
        set_field(browser, "extra-security-quantity", "2500")
        set_field(browser, "extra-security-price", "1014.37")
        set_field(browser, "extra-trade-amount", "2535925")
        set_field(browser, "extra-repo-ccp", "no")
        set_field(browser, "extra-counterparty", "ООО «Брокер-Партнёр», договор 17/26")
        pdf = render(browser, checks, "stock/sell/limit bond")
        if pdf:
            assert_frame(checks, "stock/sell/limit bond", pdf)
            printed = pdf.overlay_text()
            checks.check("bond: the series and the ISIN both print",
                         "CIB-SN-EQ-001S-3" in printed and "RU000A10CXA6" in printed,
                         printed[:500])
            checks.check("bond: the legal category prints",
                         "Корпоративные облигации" in printed, printed[:500])
            checks.check("bond: the limit price prints as a number",
                         "1 014,37" in printed, printed[:500])
            checks.check("bond: the quantity is grouped, not raw",
                         "2 500" in printed, printed[:500])
            checks.check("bond: «Рыночная» is not printed on a limit order",
                         "Рыночная" not in printed, printed[:500])
            checks.check("bond: the chosen validity date prints",
                         "31.12.2026" in printed, printed[:500])
            checks.check("bond: no CFI is printed", "CFI" not in printed, printed[:500])
            pdf.close()

        # ── 3. Stock / REPO with the CCP ────────────────────────────────────
        open_document(browser, server, COMPANY)
        fill_common(browser, "trade")
        fill_trade_common(browser)
        keyboard_pick(browser, "extra-security-asset-id", "GAZP")
        set_field(browser, "extra-security-quantity", "10")
        set_field(browser, "extra-repo-ccp", "yes")
        pdf = render(browser, checks, "stock/repo")
        if pdf:
            assert_frame(checks, "stock/repo", pdf)
            # The «Да» box of «Сделка РЕПО с ЦК» is at 252.05 on page 1.
            checks.check("REPO=Да ticks the yes box",
                         any(near(m, (252.05, 635.50)) for m in pdf.marks(0)),
                         str(pdf.marks(0)))
            checks.check("REPO=Да does not tick the no box",
                         not any(near(m, (277.97, 635.50)) for m in pdf.marks(0)),
                         str(pdf.marks(0)))
            pdf.close()

        # ── 4/9. Currency, and the switch away from a chosen security ───────
        open_document(browser, server, COMPANY)
        fill_common(browser, "trade")
        fill_trade_common(browser)
        moved = keyboard_pick(browser, "extra-security-asset-id", "sber")
        checks.check("ArrowDown walks past the pre-highlighted first result",
                     moved.get("id") == "A-100002",
                     json.dumps(moved, ensure_ascii=False))
        set_field(browser, "extra-security-quantity", "150")
        set_field(browser, "extra-repo-ccp", "yes")
        # …and now the manager changes their mind about the market entirely.
        set_field(browser, "extra-order-market", "currency")
        keys = visible_keys(browser)
        checks.check("switching to currency hides the security block",
                     "extra-security-asset-id" not in keys
                     and "extra-repo-ccp" not in keys, str(keys))
        picked = keyboard_pick(browser, "extra-fx-instrument-id", "USDRUB_TOM")
        checks.check("an FX instrument can be picked with the keyboard",
                     picked.get("id") == "FX-1001",
                     json.dumps(picked, ensure_ascii=False))
        set_field(browser, "extra-fx-lots", "25")
        set_field(browser, "extra-fx-amount", "2500000")
        set_field(browser, "extra-fx-swap-ccp", "no")
        pdf = render(browser, checks, "stock→currency/market")
        if pdf:
            assert_frame(checks, "stock→currency/market", pdf)
            printed = pdf.overlay_text()
            checks.check("currency: the FX instrument prints",
                         "USDRUB_TOM" in printed, printed[:500])
            checks.check("currency: a market order prints «Рыночная» for the rate",
                         "Рыночная" in printed, printed[:500])
            checks.check("switch: the abandoned security does not print",
                         "Сбербанк" not in printed and "RU0009029557" not in printed
                         and "Акции привилегированные" not in printed, printed[:600])
            checks.check("switch: the abandoned REPO answer does not print",
                         not any(near(m, (252.05, 635.50)) or near(m, (277.97, 635.50))
                                 for m in pdf.marks(0)), str(pdf.marks(0)))
            checks.check("switch: the abandoned quantity does not print",
                         "150" not in printed, printed[:600])
            pdf.close()

        # ── 5. Currency / Limit ─────────────────────────────────────────────
        open_document(browser, server, COMPANY)
        fill_common(browser, "trade")
        fill_trade_common(browser, side="sell", market="currency", kind="limit")
        keyboard_pick(browser, "extra-fx-instrument-id", "CNYRUB")
        set_field(browser, "extra-fx-lots", "40")
        set_field(browser, "extra-fx-rate", "11.735")
        set_field(browser, "extra-fx-amount", "469400")
        set_field(browser, "extra-fx-swap-ccp", "yes")
        pdf = render(browser, checks, "currency/limit")
        if pdf:
            assert_frame(checks, "currency/limit", pdf)
            printed = pdf.overlay_text()
            checks.check("currency/limit: the rate prints as a number",
                         "11,735" in printed, printed[:500])
            checks.check("currency/limit: «Рыночная» is not printed",
                         "Рыночная" not in printed, printed[:500])
            checks.check("currency/limit: SWAP=Да ticks the yes box",
                         any(near(m, (252.05, 257.09)) for m in pdf.marks(1)),
                         str(pdf.marks(1)))
            pdf.close()

        # ── 6. Derivatives ──────────────────────────────────────────────────
        open_document(browser, server, COMPANY)
        fill_common(browser, "trade")
        fill_trade_common(browser, market="derivatives", kind="limit")
        keyboard_pick(browser, "extra-derivative-id", "Si-12.26M181226CA95000")
        set_field(browser, "extra-derivative-quantity", "5")
        set_field(browser, "extra-derivative-premium", "3120.5")
        keys = visible_keys(browser)
        checks.check("derivatives: master data is not editable",
                     not any(k in keys for k in ("extra-derivative-kind",
                                                 "extra-derivative-name",
                                                 "extra-derivative-strike",
                                                 "extra-derivative-expiry")), str(keys))
        pdf = render(browser, checks, "derivatives/limit")
        if pdf:
            assert_frame(checks, "derivatives/limit", pdf)
            printed = pdf.overlay_text()
            checks.check("derivatives: the instrument kind prints",
                         "Опцион call" in printed, printed[:500])
            checks.check("derivatives: the strike prints",
                         "95 000" in printed, printed[:500])
            checks.check("derivatives: the expiry prints in Russian format",
                         "18.12.2026" in printed, printed[:500])
            checks.check("derivatives: no security value is printed",
                         "ISIN" not in printed, printed[:500])
            pdf.close()

        # ── 7. OTC / security — the same Asset catalog, no derivatives ──────
        open_document(browser, server, COMPANY)
        fill_common(browser, "trade")
        fill_trade_common(browser, market="otc")
        set_field(browser, "extra-otc-instrument-type", "security")
        keys = visible_keys(browser)
        checks.check("OTC never offers a derivative selector",
                     "extra-derivative-id" not in keys, str(keys))
        checks.check("OTC/security reuses the security selector",
                     "extra-security-asset-id" in keys, str(keys))
        picked = keyboard_pick(browser, "extra-security-asset-id", "TMOS")
        checks.check("OTC/security uses the same Asset catalog",
                     picked.get("id") == "A-300001",
                     json.dumps(picked, ensure_ascii=False))
        set_field(browser, "extra-security-quantity", "300")
        set_field(browser, "extra-repo-ccp", "no")
        pdf = render(browser, checks, "otc/security")
        if pdf:
            assert_frame(checks, "otc/security", pdf)
            printed = pdf.overlay_text()
            checks.check("otc/security: the fund's compact description prints",
                         "Паи" in printed and "RU000A101NZ2" in printed, printed[:500])
            # «Внебиржевой» is the fourth market box on page 1.
            checks.check("otc/security: the OTC market box is ticked",
                         any(near(m, (415.30, 355.49)) for m in pdf.marks(0)),
                         str(pdf.marks(0)))
            pdf.close()

        # ── 8/10. OTC security → OTC currency ───────────────────────────────
        set_field(browser, "extra-otc-instrument-type", "currency")
        keys = visible_keys(browser)
        checks.check("OTC/currency hides the security block",
                     "extra-security-asset-id" not in keys, str(keys))
        checks.check("OTC/currency reuses the FX catalog",
                     "extra-fx-instrument-id" in keys, str(keys))
        keyboard_pick(browser, "extra-fx-instrument-id", "EURRUB")
        set_field(browser, "extra-fx-lots", "12")
        set_field(browser, "extra-fx-amount", "1200000")
        set_field(browser, "extra-fx-swap-ccp", "no")
        pdf = render(browser, checks, "otc/security→currency")
        if pdf:
            assert_frame(checks, "otc/security→currency", pdf)
            printed = pdf.overlay_text()
            checks.check("otc switch: the FX instrument prints",
                         "EURRUB_TOM" in printed, printed[:500])
            checks.check("otc switch: the abandoned security does not print",
                         "Паи" not in printed and "RU000A101NZ2" not in printed,
                         printed[:600])
            pdf.close()

        # ── 13. A typed ticker that was never picked blocks generation ──────
        open_document(browser, server, COMPANY)
        fill_common(browser, "trade")
        fill_trade_common(browser)
        type_search(browser, "extra-security-asset-id", "RU0009029540")
        set_field(browser, "extra-security-quantity", "10")
        set_field(browser, "extra-repo-ccp", "no")
        blocked = generate(browser)
        checks.check("typed text with no selection blocks generation",
                     blocked["downloads"] == 0 and "is-error" in blocked["kind"],
                     json.dumps(blocked, ensure_ascii=False))
        checks.check("…and says the text is not a selected value",
                     "не является выбранным" in blocked["status"],
                     blocked["status"])

        # A quantity that is not a positive number is refused too.
        picked = pick_result(browser, "extra-security-asset-id", 0)
        set_field(browser, "extra-security-quantity", "0")
        blocked = generate(browser)
        checks.check("a non-positive quantity blocks generation",
                     blocked["downloads"] == 0 and "is-error" in blocked["kind"],
                     json.dumps(blocked, ensure_ascii=False))
        checks.check("…and a free-text quantity cannot even be entered",
                     set_field(browser, "extra-security-quantity", "100 шт.")["value"] == "",
                     "the numeric control accepted a string")

        # ── 11. Transfer between trading venues ─────────────────────────────
        open_document(browser, server, COMPANY)
        fill_common(browser, "transfer")
        set_field(browser, "extra-move-from", "stock")
        set_field(browser, "extra-move-to", "derivatives")
        set_field(browser, "extra-move-amount", "1500000")
        set_field(browser, "extra-move-currency", "RUB")
        pdf = render(browser, checks, "transfer")
        if pdf:
            assert_frame(checks, "transfer", pdf)
            checks.check("transfer: only the transfer form is filled",
                         pdf.overlay_pages() == {2}, str(sorted(pdf.overlay_pages())))
            checks.check("transfer: the amount is grouped",
                         "1 500 000" in pdf.overlay_text(2), pdf.overlay_text(2)[:400])
            pdf.close()

        # ── 12. Withdrawal to a bank account ────────────────────────────────
        open_document(browser, server, COMPANY)
        fill_common(browser, "withdrawal")
        set_field(browser, "extra-payout-currency", "RUB")
        set_field(browser, "extra-payout-amount-mode", "whole")
        set_field(browser, "extra-payout-from", "stock")
        set_field(browser, "extra-bank-recipient", "ООО «Ромашка»")
        set_field(browser, "extra-bank-bic", "044525225")
        set_field(browser, "extra-bank-name", "ПАО Сбербанк")
        set_field(browser, "extra-bank-account", "40702810000000012345")
        keys = visible_keys(browser)
        checks.check("«свободный остаток» asks for no amount",
                     "extra-payout-amount" not in keys, str(keys))
        pdf = render(browser, checks, "withdrawal/whole")
        if pdf:
            assert_frame(checks, "withdrawal/whole", pdf)
            checks.check("withdrawal: only the payout form is filled",
                         pdf.overlay_pages() == {3}, str(sorted(pdf.overlay_pages())))
            pdf.close()

        set_field(browser, "extra-payout-amount-mode", "amount")
        blocked = generate(browser)
        checks.check("«в сумме» without an amount blocks generation",
                     blocked["downloads"] == 0 and "is-error" in blocked["kind"],
                     json.dumps(blocked, ensure_ascii=False))
        set_field(browser, "extra-payout-amount", "250000")
        pdf = render(browser, checks, "withdrawal/amount")
        if pdf:
            assert_frame(checks, "withdrawal/amount", pdf)
            checks.check("withdrawal: the amount is grouped",
                         "250 000" in pdf.overlay_text(3), pdf.overlay_text(3)[:400])
            pdf.close()


        # ── Amount in words is spelled out, never typed ─────────────────────
        #
        # One scenario per shape the converter has to get right: a small sum, a
        # sum with kopecks, a round million, a foreign currency, and the
        # largest amount the form can carry — which is the one that has to
        # reach the paper through the continuation line rather than be dropped.
        WORDS_CASES = [
            ("small", "RUB", "1", "Один рубль 00 копеек", "1,00"),
            ("kopecks", "RUB", "125000.50",
             "Сто двадцать пять тысяч рублей 50 копеек", "125 000,50"),
            ("round million", "RUB", "1500000",
             "Один миллион пятьсот тысяч рублей 00 копеек", "1 500 000,00"),
            ("foreign currency", "USD", "1234.56",
             "Одна тысяча двести тридцать четыре доллара США 56 центов", "1 234,56"),
            ("longest realistic", "USD", "999999999.99",
             "Девятьсот девяносто девять миллионов девятьсот девяносто девять "
             "тысяч девятьсот девяносто девять долларов США 99 центов",
             "999 999 999,99"),
        ]
        for name, currency, amount, expected, figures in WORDS_CASES:
            open_document(browser, server, COMPANY)
            fill_common(browser, "withdrawal")
            set_field(browser, "extra-payout-currency", currency)
            set_field(browser, "extra-payout-amount-mode", "amount")
            set_field(browser, "extra-payout-from", "stock")
            set_field(browser, "extra-payout-amount", amount)
            keys = visible_keys(browser)
            checks.check(f"words/{name}: the wording is not a control the manager types",
                         "extra-payout-amount-words" not in keys, str(keys))
            pdf = render(browser, checks, f"words {name}")
            if not pdf:
                continue
            printed = " ".join(pdf.overlay_text(3).split())
            checks.check(f"words/{name}: the spelled-out amount reaches the PDF",
                         expected in printed, printed[:600])
            checks.check(f"words/{name}: the figures carry both minor digits",
                         figures in printed, printed[:600])
            checks.check(f"words/{name}: nothing is drawn below the 9 pt floor",
                         pdf.min_font_size() >= 8.99, str(pdf.min_font_size()))
            pdf.close()

        # Changing the figure changes the wording: they are one value.
        open_document(browser, server, COMPANY)
        fill_common(browser, "withdrawal")
        set_field(browser, "extra-payout-currency", "RUB")
        set_field(browser, "extra-payout-amount-mode", "amount")
        set_field(browser, "extra-payout-from", "stock")
        set_field(browser, "extra-payout-amount", "250000")
        pdf = render(browser, checks, "words before edit")
        first = " ".join(pdf.overlay_text(3).split()) if pdf else ""
        if pdf:
            pdf.close()
        set_field(browser, "extra-payout-amount", "310000.05")
        pdf = render(browser, checks, "words after edit")
        if pdf:
            second = " ".join(pdf.overlay_text(3).split())
            checks.check("editing the figure re-spells the wording",
                         "Двести пятьдесят тысяч рублей 00 копеек" in first
                         and "Двести пятьдесят тысяч рублей 00 копеек" not in second
                         and "Триста десять тысяч рублей 05 копеек" in second,
                         (first[:200], second[:200]))
            pdf.close()

        # «В размере свободного остатка» has no figure, so it spells nothing.
        set_field(browser, "extra-payout-amount-mode", "whole")
        pdf = render(browser, checks, "words whole balance")
        if pdf:
            printed = " ".join(pdf.overlay_text(3).split())
            checks.check("a free-balance payout spells no amount",
                         "рублей" not in printed and "копеек" not in printed,
                         printed[:400])
            pdf.close()

        # The readable 9 pt floor is a hard limit. An intentionally extreme
        # amount must be refused by the common PDF preflight, and the message
        # must name the derived field rather than dropping or truncating it.
        set_field(browser, "extra-payout-amount-mode", "amount")
        set_field(browser, "extra-payout-amount", "999999999999.99")
        blocked = generate(browser)
        checks.check("words/extreme: an amount that cannot fit is blocked",
                     blocked["downloads"] == 0 and "is-error" in blocked["kind"],
                     json.dumps(blocked, ensure_ascii=False))
        checks.check("words/extreme: preflight names the amount-in-words field",
                     "Сумма вывода (прописью)" in blocked["overflowFields"],
                     json.dumps(blocked, ensure_ascii=False))

        # The transfer form spells its amount the same way.
        open_document(browser, server, COMPANY)
        fill_common(browser, "transfer")
        set_field(browser, "extra-move-from", "stock")
        set_field(browser, "extra-move-to", "derivatives")
        set_field(browser, "extra-move-currency", "RUB")
        set_field(browser, "extra-move-amount", "1500000")
        keys = visible_keys(browser)
        checks.check("transfer: the wording is not a control the manager types",
                     "extra-move-amount-words" not in keys, str(keys))
        pdf = render(browser, checks, "transfer words")
        if pdf:
            printed = " ".join(pdf.overlay_text(2).split())
            checks.check("transfer: the spelled-out amount reaches the PDF",
                         "Один миллион пятьсот тысяч рублей 00 копеек" in printed,
                         printed[:500])
            checks.check("transfer: only the transfer form carries it",
                         pdf.overlay_pages() == {2}, str(sorted(pdf.overlay_pages())))
            pdf.close()

        # ── Payout requisites come from the subject card ────────────────────
        open_document(browser, server, COMPANY)
        fill_common(browser, "withdrawal")
        set_field(browser, "extra-payout-currency", "RUB")
        set_field(browser, "extra-payout-amount-mode", "whole")
        set_field(browser, "extra-payout-from", "stock")
        bank = field_values(browser, [
            "extra-bank-recipient", "extra-bank-name", "extra-bank-bic",
            "extra-bank-corr-account", "extra-bank-account", "extra-bank-inn",
            "extra-bank-corr-swift", "extra-bank-corr-name"])
        checks.check("requisites: the block is filled without the manager typing",
                     bank["extra-bank-recipient"]["value"] == "АО «Восток Майнинг Системс»"
                     and bank["extra-bank-bic"]["value"] == "044525187"
                     and bank["extra-bank-account"]["value"] == "40702810100000012345",
                     json.dumps(bank, ensure_ascii=False)[:500])
        checks.check("requisites: every bank row is read-only",
                     all(entry and entry["readOnly"] for entry in bank.values()),
                     json.dumps(bank, ensure_ascii=False)[:500])
        checks.check("requisites: a rouble route shows no intermediary bank",
                     bank["extra-bank-corr-swift"]["value"] == ""
                     and bank["extra-bank-corr-name"]["value"] == "",
                     json.dumps(bank, ensure_ascii=False)[:300])
        pdf = render(browser, checks, "requisites RUB")
        if pdf:
            printed = " ".join(pdf.overlay_text(3).split())
            checks.check("requisites: they reach the PDF",
                         "Банк ВТБ (ПАО), г. Санкт-Петербург" in printed
                         and "044525187" in printed
                         and "40702810100000012345" in printed
                         and "30101810700000000187" in printed, printed[:600])
            checks.check("requisites: an empty intermediary bank does not block "
                         "a valid rouble payout",
                         pdf.overlay_pages() == {3}, str(sorted(pdf.overlay_pages())))
            pdf.close()

        # A foreign route brings the intermediary bank with it.
        set_field(browser, "extra-payout-currency", "USD")
        bank = field_values(browser, ["extra-bank-corr-swift", "extra-bank-corr-name",
                                      "extra-bank-account"])
        checks.check("requisites: switching currency switches the record",
                     bank["extra-bank-corr-swift"]["value"] == "RZBAATWW"
                     and bank["extra-bank-account"]["value"] == "40702840700000012345",
                     json.dumps(bank, ensure_ascii=False))
        pdf = render(browser, checks, "requisites USD")
        if pdf:
            printed = " ".join(pdf.overlay_text(3).split())
            checks.check("requisites: the intermediary bank reaches the PDF",
                         "RZBAATWW" in printed and "RAIFFEISEN" in printed,
                         printed[:600])
            pdf.close()

        # A record the CRM has not finished refuses the document by name.
        set_field(browser, "extra-payout-currency", "EURO")
        blocked = generate(browser)
        checks.check("an unfinished requisite record blocks generation",
                     blocked["downloads"] == 0 and "is-error" in blocked["kind"],
                     json.dumps(blocked, ensure_ascii=False))
        checks.check("…and names the requisite that is missing",
                     "корреспондентский счёт" in blocked["status"],
                     blocked["status"])

        # No record at all for that currency is reported the same way.
        set_field(browser, "extra-payout-currency", "CNY")
        blocked = generate(browser)
        checks.check("a currency with no requisites on file blocks generation",
                     blocked["downloads"] == 0 and "is-error" in blocked["kind"],
                     json.dumps(blocked, ensure_ascii=False))
        checks.check("…and says which requisites are unavailable",
                     "нет банковских реквизитов" in blocked["status"]
                     and "счёт получателя" in blocked["status"],
                     blocked["status"])

        # An individual client has their own record, and it is theirs.
        open_document(browser, server, INDIVIDUAL)
        fill_common(browser, "withdrawal")
        set_field(browser, "extra-payout-currency", "RUB")
        set_field(browser, "extra-payout-amount-mode", "amount")
        set_field(browser, "extra-payout-amount", "45300.4")
        set_field(browser, "extra-payout-from", "stock")
        bank = field_values(browser, ["extra-bank-recipient", "extra-bank-account"])
        checks.check("requisites: an individual gets their own record",
                     bank["extra-bank-recipient"]["value"] == "Ковалёв Даниил Олегович"
                     and bank["extra-bank-account"]["value"] == "40817810500000078901",
                     json.dumps(bank, ensure_ascii=False))
        pdf = render(browser, checks, "requisites individual")
        if pdf:
            printed = " ".join(pdf.overlay_text(3).split())
            checks.check("requisites/individual: figures and wording agree",
                         "45 300,40" in printed
                         and "Сорок пять тысяч триста рублей 40 копеек" in printed,
                         printed[:600])
            pdf.close()

        # ── No console noise across every scenario ──────────────────────────
        noise = [c for c in browser.console if "favicon" not in c and "DevTools" not in c]
        checks.check("no console errors or warnings", not noise, "; ".join(noise[:5]))
        bad = [r for r in browser.requests if "favicon" not in r]
        checks.check("no failed network requests", not bad, "; ".join(bad[:5]))
    finally:
        browser.stop()
        server.stop()

    return checks.report()


if __name__ == "__main__":
    sys.exit(main())
