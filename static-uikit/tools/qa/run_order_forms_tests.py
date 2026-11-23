"""Generate all three November Appendix 7 orders in the real wizard and inspect their printed pages."""
from __future__ import annotations

import argparse
import hashlib
import base64
import json
import re
import sys
from pathlib import Path

import fitz  # pymupdf

from headless_browser import STATIC_UIKIT, Chrome, Server

COMPANY = "c-011"
INDIVIDUAL = "c-006"
OVERLAY_FONT_HINT = "Liberation"


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
(async function (key, text) {
  var el = document.querySelector(
    '#docwiz-extra-fields [data-autocomplete-for="' + key + '"]');
  if (!el) return { ok: false, reason: 'missing' };
  el.focus();
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  var deadline = Date.now()+10000;
  while (el.getAttribute('aria-busy') === 'true' && Date.now()<deadline) await new Promise(r=>setTimeout(r,20));
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
        .replace("__TEXT__", json.dumps(text, ensure_ascii=False)),await_promise=True
    )


PICK_RESULT = """
(async function (key, index) {
  var menu = document.getElementById('docwiz-field-' + key + '-menu');
  if (!menu || menu.hidden) return { ok: false, reason: 'menu closed' };
  var rows = menu.querySelectorAll('.crm-docwiz-picker-item');
  if (!rows.length || rows[index].classList.contains('crm-docwiz-picker-item-empty')) {
    return { ok: false, reason: 'no result' };
  }
  rows[index].dispatchEvent(new MouseEvent('click', { bubbles: true }));
  var value = document.querySelector(
    '#docwiz-extra-fields [data-field-key="' + key + '"]');
  var deadline = Date.now()+10000;
  while (value && !value.value && Date.now()<deadline) await new Promise(r=>setTimeout(r,20));
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
        .replace("__INDEX__", str(index)),await_promise=True
    )


def keyboard_pick(browser, key: str, text: str) -> dict:
    """Type, walk down with the keyboard and commit with Enter."""
    type_search(browser,key,text)
    return browser.eval(
        """(async function(key){
          const input=document.querySelector('[data-autocomplete-for="'+key+'"]');
          for (const name of ['ArrowDown','Enter']) input.dispatchEvent(new KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true}));
          const selected=document.querySelector('[data-field-key="'+key+'"]'), end=Date.now()+10000;
          while (!selected.value && Date.now()<end) await new Promise(r=>setTimeout(r,20));
          return {ok:!!selected.value,id:selected.value,text:input.value};
        }(__KEY__))""".replace("__KEY__",json.dumps(key)),await_promise=True)


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


def fill_trade_common(browser, *, side="buy", market="stock", kind="market",
                      settlement="T+1", validity="cancelled") -> None:
    set_field(browser, "extra-trade-kind", side)
    set_field(browser, "extra-order-market", market)
    set_field(browser, "extra-order-kind", kind)
    set_field(browser, "extra-order-validity-mode", validity)
    set_field(browser, "extra-settlement-period", settlement)



DOCUMENTS = {
    "order-trade": (2, "poruchenie-na-sdelku.pdf"),
    "order-venue-transfer": (1, "poruchenie-perevod-ploshchadki.pdf"),
    "order-bank-withdrawal": (1, "poruchenie-vyvod-na-bank.pdf"),
}

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keep", type=Path, help="write typical and boundary demo PDFs")
    args = parser.parse_args()
    checks, server, browser = Checks(), Server(), Chrome()
    doc = ""
    subject = ""
    def select(doc_id, client=COMPANY):
        nonlocal doc, subject
        doc, subject = doc_id, client
        browser.goto(f"{server.base}/pages/document-wizard.html?subject={client}")
        click_card()
    def click_card():
        q = 'button[data-doc-id="' + doc + '"]'
        browser.eval("document.querySelector("+json.dumps(q)+").click()")
    def fill(**values):
        for k, v in values.items():
            key = "selectedRequisiteId" if k == "bank" else "extra-" + k.replace("_", "-")
            ret = set_field(browser,key,v)
            decimal_keys = {"security_price", "fx_rate", "derivative_premium", "move_amount", "payout_amount", "manual_amount", "accrued_manual"}
            expected = v.replace(".", ",") if k in decimal_keys else v
            checks.check(f"{doc} control {key}", ret.get("ok") and ret.get("value") == expected, str(ret))
    def confirm():
        browser.eval("document.getElementById('docwiz-field-order-review').click()")
    def blocked(label, message=""):
        result = generate(browser,12000)
        checks.check(label, result["downloads"]==0 and "is-error" in result["kind"] and message in result["status"],str(result))
    def pdf(label, *, keep=False, extra_lines=0):
        result = generate(browser,12000)
        if not checks.check(label+" generated", result["downloads"]==1 and "is-error" not in result["kind"],str(result)): return ""
        data=fetch_pdf(browser,result["url"])
        filename=browser.eval("document.querySelector('#docwiz-pdf-downloads a[data-object-url]').download")
        checks.check(label+" filename",filename==DOCUMENTS[doc][1],filename)
        if keep and args.keep:
            args.keep.mkdir(parents=True,exist_ok=True)
            (args.keep/(label+".pdf")).write_bytes(data)
        with fitz.open(stream=data,filetype="pdf") as actual, fitz.open(Path(STATIC_UIKIT)/"assets/document-pdf-templates"/(doc+".pdf")) as base:
            checks.check(label+" pages",len(actual)==len(base)==DOCUMENTS[doc][0],str(len(actual)))
            spans=[]; added_marks=[]
            for i,p in enumerate(actual):
                for block in p.get_text("dict")["blocks"]:
                    for line in block.get("lines",[]):
                        spans += [s for s in line["spans"] if OVERLAY_FONT_HINT in s["font"] and s["text"].strip()]
                before=drawing_signatures(base[i])
                added_marks.extend((i,d["rect"].x0,d["rect"].y1) for d in p.get_drawings()
                    if (round(d["rect"].x0,1),round(d["rect"].y0,1),round(d["rect"].x1,1),round(d["rect"].y1,1)) not in before)
                expected_static=" ".join(base[i].get_text().split())
                original=" ".join(s["text"].strip() for block in p.get_text("dict")["blocks"] for line in block.get("lines",[])
                                  for s in line["spans"] if OVERLAY_FONT_HINT not in s["font"] and s["text"].strip())
                native = "".join(expected_static.split())
                printed = "".join(original.split())
                # Only the operator ranges attested by the static-equivalence gate are
                # re-typeset. Every other character must still use the original PDF font.
                if doc == "order-venue-transfer":
                    native = native.replace("1.Денежныесредствавсумме(", "", 1).replace("цифрамипрописью", "", 1)
                    rendered = "".join(p.get_text().split())
                    for term in ("1.Денежныесредствавсумме", "цифрами", "прописью"):
                        checks.check(label+" source words "+term, rendered.count(term) == 1)
                if doc == "order-bank-withdrawal" and field_values(browser,["extra-payout-amount-mode"])["extra-payout-amount-mode"]["value"] == "amount":
                    native = native.replace("Всумме:()цифрамипрописью", "Всумме:цифрами", 1)
                checks.check(label+f" page {i+1} static wording intact", native == printed)
            if doc in ("order-bank-withdrawal", "order-venue-transfer"):
                payout = doc == "order-bank-withdrawal"
                last = (289.8 if payout else 550.1) + extra_lines*10.5
                first_x = 276 if payout else 102
                word_ink = [span for span in spans if first_x <= span["origin"][0] < (568 if payout else 388)
                            and last-(2+extra_lines)*10.5-0.1 <= span["origin"][1] <= last+0.1]
                baselines = sorted({round(span["origin"][1],1) for span in word_ink})
                if word_ink:
                    checks.check(label+" words end on source baseline", abs(baselines[-1]-last) < 0.2, str(baselines))
                    left, right, y = (279.24,565,292.17) if payout else (103,388.73,552.65)
                    rules = [drawing["rect"] for drawing in actual[0].get_drawings()]
                    checks.check(label+" underline spans the complete words column", any(
                        abs(rect.x0-left)<0.1 and abs(rect.x1-right)<0.1 and abs(rect.y0-y-extra_lines*10.5)<0.3 for rect in rules))
                    checks.check(label+" words wrap on consecutive lines",
                                 all(abs(b-a-10.5)<0.2 for a,b in zip(baselines,baselines[1:])), str(baselines))
            yyyy, month, day = field_values(browser,["extra-order-date"])["extra-order-date"]["value"].split("-")
            date_x = {"order-trade":(266.3,293.4,332.5), "order-venue-transfer":(292.4,319.4,358.8),
                      "order-bank-withdrawal":(293.4,320.3,359.4)}[doc]
            checks.check(label+" prints the selected date",all(any(abs(span["origin"][0]-x)<0.3 and
                         75<span["origin"][1]<80 and span["text"].strip()==part for span in spans)
                         for x,part in zip(date_x,(day,month,yyyy[-2:]))))
            if label == "withdrawal-short-wrap":
                checks.check("13 316,44 wording uses one line", len(baselines)==1 and any(
                    "44 копейки" in span["text"] for span in word_ink),str(word_ink))
            px,py=(81.14,78.26) if doc=="order-trade" else (109.49,78.98 if doc=="order-venue-transfer" else 77.78)
            checks.check(label+" primary checkbox",any(i==0 and abs(x-px)<5 and abs(y-py)<6 for i,x,y in added_marks))
            if doc == "order-trade":
                checks.check(label+" uncovered position marked on page two", any(
                    i == 1 and abs(x-57.2) < 2 and abs(y-256.48) < 3 for i,x,y in added_marks), str(added_marks))
            checks.check(label+" cancellation stays blank",not any(i==0 and abs(x-px)<5 and abs(y-93.5)<5 for i,x,y in added_marks))
            checks.check(label+" serif 9pt",bool(spans) and all(s["size"]>=8.99 for s in spans))
            text_value=" ".join(" ".join(s["text"] for s in spans).split())
            checks.check(label+" CRM code",("INV-1006" if subject==INDIVIDUAL else "INV-1011") in text_value,text_value[:250])
            return text_value
    try:
        template_hashes = {
            "order-trade":"a2129baa013de80b308e315c61f45177012e9c6c0844d4264f9a8542159a0e1e",
            "order-venue-transfer":"5301e5ce8bf22900d8871fe18ad31767437fe915a891839580376fb78f5d7c8d",
            "order-bank-withdrawal":"b0101cdab337e6a0674b4b28d1b8cf28d7b71111ae5446895e6672eb14eddc10",
        }
        for name, digest in template_hashes.items():
            path = Path(STATIC_UIKIT)/"assets/document-pdf-templates"/(name+".pdf")
            checks.check(name+" November source hash",hashlib.sha256(path.read_bytes()).hexdigest()==digest)
        select("order-trade",INDIVIDUAL)
        catalog=browser.eval("CRMDocumentCatalog.documents.filter(d=>d.id.startsWith('order-')).map(d=>d.id)")
        checks.check("only three independent catalog entries", set(catalog)==set(DOCUMENTS),str(catalog))
        m=browser.eval("Object.keys(CRMDocumentEngine.fieldMaps)")
        checks.check("20 maps loaded",len(m)==20 and all(d in m for d in DOCUMENTS) and "order-forms" not in m,str(m))
        cases=Path(__file__).with_name("order_rules_cases.js").read_text("utf-8")
        for name,ok in browser.eval(cases): checks.check(name,ok)
        # Every text slot is measured against the printed characters of its own source.
        for key in DOCUMENTS:
            fields=browser.eval("CRMDocumentEngine.fieldMaps["+json.dumps(key)+"].fields")
            with fitz.open(Path(STATIC_UIKIT)/"assets/document-pdf-templates"/(key+".pdf")) as template:
                for f in fields:
                    if f.get("type")=="check": continue
                    collisions=[r["text"] for r in printed_runs(template[f["page"]],f["baselineTop"])
                                if r["kind"]=="word" and r["x1"]>f["left"]+.5 and r["x0"]<f["left"]+f["width"]-.5]
                    checks.check(key+"/"+f["id"]+" avoids source ink",not collisions,str(collisions))
        today=browser.eval("(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')})()")
        def today_default(key="extra-order-date"):
            field=field_values(browser,[key])[key]
            checks.check(doc+" editable local date "+key, field["value"] == today and not field["readOnly"],str(field))
        today_default()
        common=field_values(browser,["extra-brokerage-account","extra-contract-number-date"])
        checks.check("read-only CRM identity",all(v["readOnly"] for v in common.values()))
        fill_trade_common(browser,kind="limit")
        fill(order_validity_mode="date");today_default("extra-order-validity-date")
        fill(order_validity_date="2026-12-09",order_validity_mode="cancelled")
        fill(order_number="17",order_date="2026-11-19",security_quantity="10",security_price="272.50",repo_ccp="no")
        type_search(browser,"extra-security-asset-id","SBER")
        blocked("uncommitted typed instrument")
        pick_result(browser,"extra-security-asset-id")
        out=pdf("trade-typical",keep=True)
        checks.check("share calculation and selected ISIN","2 725" in out and "RU0009029540" in out and "BR-2026/01006" in out,out)
        checks.check("no mode selector",browser.eval("!document.querySelector('select[data-field-key=extra-amount-mode]')"))
        controls = field_values(browser,["extra-manual-amount","extra-estimate","extra-security-currency"])
        checks.check("calculation and editable amount", controls["extra-estimate"]["value"]=="2 725,00 RUB"
                     and controls["extra-manual-amount"]["value"]=="2725,00" and not controls["extra-manual-amount"]["readOnly"])
        checks.check("catalogue price currency editable", controls["extra-security-currency"]["value"]=="RUB"
                     and not controls["extra-security-currency"]["readOnly"])
        fill(manual_amount="2800.01",amount_reason="Уточнение суммы поручения")
        blocked("manual trade requires confirmation")
        checks.check("explicit manual difference",field_values(browser,["extra-discrepancy"])["extra-discrepancy"]["value"]=="+75,01")
        confirm();out=pdf("trade-manual");checks.check("manual trade amount printed","2 800,01" in out,out)
        browser.eval("document.getElementById('docwiz-back-btn').click()");click_card()
        checks.check("manual amount survives Back",field_values(browser,["extra-manual-amount"])["extra-manual-amount"]["value"]=="2800,01")
        fill(security_quantity="11");blocked("quantity invalidates review")
        checks.check("quantity change preserves handwritten amount",field_values(browser,["extra-manual-amount"])["extra-manual-amount"]["value"]=="2800,01")
        fill(security_currency="USD")
        confirm();out=pdf("trade-currency-override")
        checks.check("selected currency and manual amount written", "USD" in out and "2 800,01" in out,out)
        fill(security_currency="RUB")
        browser.eval("document.querySelector('[data-order-reset-amount]').click()")
        checks.check("explicit restoration uses current specification",field_values(browser,["extra-manual-amount"])["extra-manual-amount"]["value"]=="2997,50")
        fill(security_quantity="199999999996",security_price="659,22")
        amt=field_values(browser,["extra-estimate","extra-manual-amount"])
        checks.check("screenshot calculation clean and exact",amt["extra-estimate"]["value"]=="131 843 999 997 363,12 RUB"
                     and amt["extra-manual-amount"]["value"]=="131843999997363,12",str(amt))
        fill(manual_amount="131843999997363.13",amount_reason="Уточнение итоговой суммы")
        confirm();out=pdf("trade-large")
        checks.check("large manual amount with exact kopecks", "131 843 999 997 363,13" in out,out)
        fill(order_kind="market")
        out=pdf("trade-market");checks.check("market price and no stale manual amount","Рыночная" in out and "2 800,01" not in out,out)
        select("order-trade");fill_trade_common(browser,kind="limit")
        type_search(browser,"extra-security-asset-id","CIBSN3");pick_result(browser,"extra-security-asset-id")
        fill(security_quantity="14",security_price="98.12",repo_ccp="no")
        blocked("bond with unknown basis requires confirmed amount")
        fill(manual_amount="13956.10",amount_reason="Сумма согласована по спецификации выпуска")
        confirm();out=pdf("trade-boundary",keep=True);checks.check("bond retained","RU000A10CXA6" in out and "13 956,10" in out,out)
        fill(order_market="currency");type_search(browser,"extra-fx-instrument-id","USDRUB_TOM");pick_result(browser,"extra-fx-instrument-id")
        fill(fx_lots="2",fx_rate="81.2345",fx_swap_ccp="no")
        out=pdf("trade-fx");checks.check("FX quote, no abandoned asset","162 469" in out and "RU000A10CXA6" not in out,out)
        fill(order_market="derivatives");type_search(browser,"extra-derivative-id","CA95000");pick_result(browser,"extra-derivative-id")
        fill(derivative_quantity="2",derivative_premium="12.30")
        out=pdf("trade-option");checks.check("premium, strike, expiry independent","246" in out and "95 000" in out and "18.12.2026" in out,out)
        type_search(browser,"extra-derivative-id","RI-12.26");pick_result(browser,"extra-derivative-id")
        blocked("future lacks confirmed cash multiplier")
        fill(order_kind="market");out=pdf("trade-future");checks.check("future has no option strike","Рыночная" in out and "95 000" not in out,out)
        select("order-trade",INDIVIDUAL)
        fill_trade_common(browser,market="otc",kind="market")
        fill(otc_instrument_type="security",counterparty="Учебный контрагент",repo_ccp="no",security_quantity="5")
        type_search(browser,"extra-security-asset-id","GAZP");pick_result(browser,"extra-security-asset-id")
        out=pdf("trade-otc");checks.check("OTC security and counterparty","RU0007661625" in out and "Учебный контрагент" in out,out)
        checks.check("no OTC currency choice",browser.eval("![...document.getElementById('docwiz-field-extra-otc-instrument-type').options].some(o=>o.value==='currency')"))
        select("order-venue-transfer");today_default()
        fill(move_from="stock",move_to="stock")
        route=field_values(browser,["extra-move-from","extra-move-to"])
        checks.check("destination choice clears matching source",route["extra-move-from"]["value"]=="" and route["extra-move-to"]["value"]=="stock")
        fill(move_from="stock")
        route=field_values(browser,["extra-move-from","extra-move-to"])
        checks.check("source choice clears matching destination",route["extra-move-from"]["value"]=="stock" and route["extra-move-to"]["value"]=="")
        checks.check("same venues remain selectable",browser.eval("![...document.querySelectorAll('#docwiz-field-extra-move-from option,#docwiz-field-extra-move-to option')].some(o=>o.disabled)"))
        fill(move_from="stock",move_to="spb-stock",move_currency="RUB",move_amount="1000.50")
        out=pdf("transfer-typical",keep=True)
        checks.check("auto words and figures","1 000,50" in out and "Одна тысяча рублей 50 копеек" in out,out)
        fill(move_amount="122115.15");out=pdf("transfer-short-wrap",keep=True)
        checks.check("short transfer wording complete","Сто двадцать две тысячи сто пятнадцать рублей 15 копеек" in out,out)
        fill(move_amount="122054562115,15");out=pdf("transfer-large",keep=True)
        checks.check("large transfer figure unbroken and words complete","122 054 562 115,15" in out and "пятнадцать рублей 15 копеек" in out,out)
        fill(move_amount="888888888888888,99",move_currency="USD")
        out=pdf("transfer-expanded",extra_lines=1,keep=True)
        checks.check("transfer adds a line for a full exact amount","888 888 888 888 888,99" in out and "99 центов" in out,out)
        fill(move_currency="RUB")
        fill(move_amount="1000,50")
        fill(move_from="spb-stock");blocked("equal destination is cleared")
        fill(move_to="spb-derivatives",words_mode="manual",manual_words="Одна тысяча рублей пятьдесят копеек")
        blocked("manual words require confirmation")
        confirm();out=pdf("transfer-manual");checks.check("manual words printed","пятьдесят копеек" in out,out)
        browser.eval("document.getElementById('docwiz-back-btn').click()");click_card()
        out=pdf("transfer-back");checks.check("Back preserves confirmed words","пятьдесят копеек" in out,out)
        fill(move_amount="1001.50");blocked("number invalidates words")
        confirm();fill(move_currency="USD");blocked("currency invalidates words")
        fill(words_mode="auto",move_amount="9999999.99",move_currency="CNY")
        out=pdf("transfer-boundary",keep=True);checks.check("long CNY amount fully printed","99 фэней" in out and "9 999 999,99" in out,out)
        for x in ("0","-1","0.001"):
            fill(move_amount=x);blocked("invalid UI amount "+x)
        eq=browser.eval("""(async()=>{try{await CRMDocumentEngine.overlayRenderer.render(
          CRMDocumentEngine.fieldMaps['order-venue-transfer'],{subject:{},extraValues:{'extra-move-from':'stock','extra-move-to':'stock'}});return ''}
          catch(e){return e.message}})()""",await_promise=True)
        checks.check("direct PDF renderer refuses equal route","ту же" in eq,eq)
        select("order-venue-transfer",INDIVIDUAL)
        fill(move_from="spb-stock",move_to="otc",move_currency="EUR",move_amount="21")
        out=pdf("transfer-individual");checks.check("individual EUR transfer","Двадцать один евро" in out,out)
        select("order-bank-withdrawal");today_default();fill(payout_currency="RUB",payout_from="spb-stock",payout_amount_mode="amount",payout_amount="1000.50")
        details=browser.eval("({val:document.getElementById('docwiz-field-selectedRequisiteId').value,opts:[...document.getElementById('docwiz-field-selectedRequisiteId').options].map(o=>o.text)})")
        checks.check("two RUB banks require explicit selection",details["val"]=="" and len(details["opts"])==3 and "40702810" not in str(details),str(details))
        blocked("no selected bank")
        fill(bank="req-ul-rub");out=pdf("withdrawal-typical",keep=True)
        checks.check("single complete RUB record","40702810100000012345" in out and out.count("40702810100000012345")==1,out)
        fill(payout_amount="13316,44");out=pdf("withdrawal-short-wrap",keep=True)
        checks.check("withdrawal from the additional screenshot","13 316,44" in out and "Тринадцать тысяч триста шестнадцать рублей 44 копейки" in out,out)
        fill(payout_amount="13312456,44");out=pdf("withdrawal-large",keep=True)
        checks.check("long withdrawal from screenshot", "13 312 456,44" in out and "рублей 44 копейки" in out,out)
        fill(bank="req-ul-rub-2");out=pdf("withdrawal-second-bank")
        checks.check("whole bank record replaced","Демонстрационный расчётный банк" in out and "40702810000000000002" in out and "40702810100000012345" not in out,out)
        fill(payout_currency="USD",payout_amount="1234.56",payout_from="spb-derivatives")
        out=pdf("withdrawal-boundary",keep=True)
        checks.check("foreign bank and words","VTBRRUMM" in out and "RZBAATWW" in out and "56 центов" in out,out)
        fill(payout_amount="888888888888888.99")
        out=pdf("withdrawal-expanded",extra_lines=1,keep=True)
        checks.check("withdrawal adds a line and keeps bank data","888 888 888 888 888,99" in out and "VTBRRUMM" in out,out)
        fill(payout_amount="1234,56")
        fill(words_mode="manual",manual_words="Одна тысяча двести тридцать четыре доллара США 56 центов")
        confirm();out=pdf("withdrawal-manual");checks.check("manual withdrawal survives print","56 центов" in out,out)
        fill(manual_words="Неверное <значение>");confirm();blocked("HTML in words")
        fill(manual_words="Длинная пропись "*45);confirm();blocked("overflow refuses complete PDF")
        fill(payout_amount_mode="whole");out=pdf("withdrawal-whole");checks.check("free balance has no numerical words","центов" not in out and "Длинная" not in out,out)
        fill(payout_currency="EUR");blocked("incomplete EUR route","корреспондентский")
        fill(payout_currency="CNY");blocked("no compatible record")
        select("order-bank-withdrawal",INDIVIDUAL);fill(payout_currency="RUB",payout_amount_mode="whole",payout_from="stock")
        out=pdf("withdrawal-individual");checks.check("client-scoped bank","40817810500000078901" in out,out)
    finally:
        browser.stop();server.stop()
    return checks.report()

if __name__=="__main__":
    sys.exit(main())
