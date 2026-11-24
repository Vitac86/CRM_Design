"""Compare the live wizard to the independent QORT SELECT and inspect three downloaded PDFs."""
from __future__ import annotations

import argparse
import json
import os
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from statistics import median
from time import monotonic, sleep
from urllib.parse import urlencode
from urllib.request import ProxyHandler, build_opener

import fitz
import pyodbc

from headless_browser import Chrome, STATIC_UIKIT
from run_order_forms_tests import (COMPANY, Checks, fetch_pdf, fill_trade_common, generate,
                                   pick_result, set_field, type_search)

ISINS = ("RU000A10FAK6", "RU000A10FRA1", "RU000A10A6J1", "RU000A10G7B0", "RU000A102LR1")
DATES = tuple(f"2026-11-{day}" for day in range(23, 27))
CONTROL = Path(__file__).with_name("qort_nkd_control.sql").read_text(encoding="utf-8")



BOND_ISIN = "RU000A10A869"
TRADE_DAY = "2026-11-23"
SETTLE_DAY = "2026-11-24"


def check_currency_dates(search, get, cursor, checks):
    """Read the control pair independently from the currency IDs and native bid, ask and unit."""
    asset_id = next(row["assetId"] for row in search(BOND_ISIN)["items"] if row["isin"] == BOND_ISIN)
    def detail(day, **options):
        params = urlencode({"settlementDate": SETTLE_DAY, "tradeDate": day, **options})
        return get("/"+asset_id+"?"+params, "detail")["bondData"]

    def control_rate(day, currency="USD"):
        stamp = int(day.replace("-", ""))
        params = ("MainCurBank", stamp, currency, "RUR")
        hist = cursor.execute("""
            SELECT h.Bid, h.Ask, h.Qty FROM dbo.CrossRatesHist h
            JOIN dbo.Assets f ON f.ID=h.TradeAsset_ID JOIN dbo.Assets t ON t.ID=h.PriceAsset_ID
            WHERE h.InfoSource=? AND h.OldDate=? AND f.ShortName=? AND t.ShortName=?
            """, *params).fetchall()
        current = cursor.execute("""
            SELECT c.Bid, c.Ask, c.Qty FROM dbo.CrossRates c
            JOIN dbo.Assets f ON f.ID=c.TradeAsset_ID JOIN dbo.Assets t ON t.ID=c.PriceAsset_ID
            WHERE c.InfoSource=? AND c.modified_date=? AND f.ShortName=? AND t.ShortName=?
              AND c.modified_date=CONVERT(int,CONVERT(char(8),GETDATE(),112))
            """, *params).fetchall()
        return {(Decimal(str(row.Bid)), Decimal(str(row.Qty))) for row in hist+current
                if row.Bid == row.Ask and row.Bid > 0 and row.Qty > 0}

    selected = detail(TRADE_DAY)
    quote = selected["quotes"][0]
    nkd = cursor.execute(CONTROL,20261124,int(selected["asOfDate"].replace("-","")),int(asset_id),BOND_ISIN).fetchone()
    checks.check("asset 266 uses primary unrounded value despite the rounded OTC observation",
                 asset_id=="266" and Decimal(str(nkd.MainNKD))==Decimal(quote["value"])==Decimal("53.129999") and
                 Decimal(str(nkd.OTCNKD))==Decimal("53.13") and quote["displayValue"]=="53.13" and
                 nkd.MainSourceTable==selected["sourceTable"] and selected["sourceTable"] in ("MarketInfo","MarketInfoHist") and
                 selected["sourceSectionId"]==1)
    for day, data in [(TRADE_DAY,selected), ("2026-11-20",detail("2026-11-20"))]:
        official = data["exchange"]["rates"][0]
        leg = official["legs"][0]
        rates = control_rate(day)
        checks.check("independent MainCurBank pair, effective date and unit "+day,
                     data["exchange"]["date"] == day and official["status"] == "official" and
                     official["date"] == day and (leg["from"],leg["to"]) == ("USD","RUB") and
                     rates == {(Decimal(leg["rate"]), Decimal(leg["units"]))})
        checks.check("changing only trade date preserves dated NKD "+day,
                     data["settlementDate"] == SETTLE_DAY and data["quotes"] == selected["quotes"])
    alternate = next(r for r in detail(TRADE_DAY,accruedCurrency="INR")["exchange"]["rates"] if r["from"] == "INR")
    multi_leg = alternate["legs"][0]
    checks.check("official INR quote has a 100-unit denominator in the live source",
                 Decimal(multi_leg["units"]) == 100 and control_rate(TRADE_DAY,"INR") ==
                 {(Decimal(multi_leg["rate"]), Decimal(multi_leg["units"]))})
    # Keep the missing-date regression repeatable after QORT publishes November 24.
    for day in (SETTLE_DAY, "2000-01-01"):
        if not control_rate(day):
            rate = detail(day)["exchange"]["rates"][0]
            checks.check("no previous CBR fixing substituted "+day,
                         rate["date"] == day and rate["status"] == "missing" and not rate["legs"])
            return selected, day, multi_leg
    raise AssertionError("Both test dates now have an official CBR rate")


def control_connection():
    cfg = {}
    local = Path(STATIC_UIKIT) / ".env.qort.local"
    if local.exists():
        for line in local.read_text(encoding="utf-8-sig").splitlines():
            if line.strip() and not line.lstrip().startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                cfg[key.strip()] = value.strip()
    cfg.update(os.environ)
    server = cfg["QORT_SERVER"]
    if any(ch in server for ch in ";{}"):
        raise ValueError("Invalid QORT_SERVER")
    trust = "Yes" if cfg.get("QORT_TRUST_SERVER_CERTIFICATE") == "true" else "No"
    return pyodbc.connect(
        f"DRIVER={{ODBC Driver 18 for SQL Server}};SERVER={server};DATABASE=BACK_QORT_DB;"
        f"Trusted_Connection=Yes;Encrypt=Yes;TrustServerCertificate={trust};ApplicationIntent=ReadOnly",
        timeout=10, autocommit=True)


def check_browser(base, checks, keep, observations, ruble, fx_sample):
    dated = observations[DATES[0]]
    browser = Chrome()
    entry = base + "/static-uikit/pages/document-wizard.html?subject=" + COMPANY
    def select(doc):
        browser.goto(entry)
        browser.eval("document.querySelector('button[data-doc-id="+doc+"]').click()")

    def fill(**fields):
        for key, val in fields.items():
            key = "selectedRequisiteId" if key == "bank" else "extra-" + key.replace("_", "-")
            if not set_field(browser, key, val)["ok"]:
                raise AssertionError(key)

    def field(key):
        return "document.getElementById(" + json.dumps("docwiz-field-"+key) + ")"

    def wait_for(expression):
        stop = monotonic() + 15
        while monotonic() < stop:
            if browser.eval(expression):
                return True
            sleep(.05)
        return False

    def wait_value(key, text):
        return wait_for(field(key)+".value.includes("+json.dumps(text)+")")

    def pdf(name, pages):
        result = generate(browser, 30000)
        if not checks.check(name+" download", result["downloads"] == 1 and "is-error" not in result["kind"], str(result)):
            raise AssertionError(result["status"])
        data = fetch_pdf(browser, result["url"])
        if keep:
            (keep / (name+".pdf")).write_bytes(data)
        doc = fitz.open(stream=data, filetype="pdf")
        checks.check(name+" page count", len(doc) == pages)
        return doc

    def cell(page, x, y, width):
        return " ".join(span["text"] for block in page.get_text("dict")["blocks"]
                        for line in block.get("lines", []) for span in line["spans"]
                        if "Liberation" in span["font"] and x-.2 <= span["origin"][0] < x+width
                        and abs(span["origin"][1]-y) < .25 and span["bbox"][2] <= x+width+.2)

    try:
        select("order-trade")
        checks.check("live HTML without the offline security fixture", browser.eval(
            "document.querySelector('meta[name=crm-order-reference-api]').dataset.mode==='qort' && !window.CRMOrderDemoSecurities"))
        fill_trade_common(browser, kind="limit")
        fill(order_date=DATES[0],settlement_period="date",settlement_date=DATES[0])
        type_search(browser,"extra-security-asset-id",ISINS[0])
        picked = pick_result(browser,"extra-security-asset-id")
        checks.check("selected QORT asset and issuer",picked["id"] == dated["asset"]["assetId"]
                     and dated["asset"]["issuerName"] in picked["card"])
        fill(security_quantity="10",security_price="98,5",repo_ccp="no")
        quote = dated["bondData"]["quotes"][0]
        shown = quote["displayValue"].replace(".",",")
        checks.check("dated reference reached the browser",wait_value("extra-accrued-input",shown))
        # Use an expressly agreed amount and currency. No FX rate is needed for this scenario.
        fill(manual_amount="10123,45",manual_currency="RUB",amount_reason="Сумма согласована для проверки")
        browser.eval(field("order-review")+".click()")
        with pdf("poruchenie-na-sdelku",2) as doc:
            checks.check("reference accrual in its PDF cell",cell(doc[0],343.46,586.5,92.91) == shown)
            checks.check("price, quote currency and separate agreed currency",cell(doc[0],257,586.5,80)=="98,5 %"
                         and cell(doc[0],442,586.5,101)=="CNY" and cell(doc[0],249.1,632.78,294.2)=="10 123,45 RUB")
        fill(accrued_input="12,31",accrued_currency="CNY")
        browser.eval(field("order-review")+".click()")
        with pdf("manual-accrual",2) as doc:
            checks.check("manual accrual in its PDF cell",cell(doc[0],343.46,586.5,92.91)=="12,31")
        fill(settlement_date=DATES[1])
        checks.check("settlement date preserves the NKD edit and revokes only the manual amount confirmation",
                     browser.eval(field("extra-accrued-input")+".value")=="12,31" and not browser.eval(field("order-review")+".checked"))
        select("order-trade")
        fill_trade_common(browser,kind="limit")
        fill(order_date=DATES[0],settlement_period="date",settlement_date=DATES[0])
        type_search(browser,"extra-security-asset-id",ISINS[0])
        pick_result(browser,"extra-security-asset-id")
        for day in DATES[1:]:
            fill(settlement_date=day)
            wanted = observations[day]["bondData"]["quotes"][0]
            checks.check("visible settlement "+day,wait_value("extra-accrued-input",wanted["displayValue"].replace(".",",")))
        fill(settlement_period="T+1")
        checks.check("tenor clears dated reference",not browser.eval(field("extra-accrued-input")+".value") and "конкретную дату" in browser.eval(field("extra-accrued-input-source")+".textContent"))

        select("order-trade")
        fill_trade_common(browser,kind="limit")
        actual_day = ruble["asset"]["asOfDate"]
        fill(order_date=actual_day,settlement_period="date",settlement_date=actual_day)
        type_search(browser,"extra-security-asset-id",ISINS[1])
        pick_result(browser,"extra-security-asset-id")
        fill(security_quantity="10",security_price="98,5",repo_ccp="no")
        ruble_quote = ruble["bondData"]["quotes"][0]
        checks.check("RUB bond reference reached browser",wait_value("extra-accrued-input",
                     ruble_quote["displayValue"].replace(".",",")))
        terms = ruble["bondData"]["terms"]
        if terms:
            total = (10*(Decimal(terms["nominal"])*Decimal("0.985")+Decimal(ruble_quote["value"]))).quantize(
                     Decimal("0.01"),rounding=ROUND_HALF_UP)
            checks.check("live RUB clean price plus accrued exactly once",wait_value("extra-manual-amount",str(total).replace(".",",")))
        else:
            checks.check("incomplete dated terms keep the total manual",not browser.eval(field("extra-manual-amount")+".value"))
        select("order-trade")
        fill_trade_common(browser, kind="limit")
        fill(order_date=TRADE_DAY, settlement_period="date", settlement_date=SETTLE_DAY)
        type_search(browser, "extra-security-asset-id", BOND_ISIN)
        pick_result(browser, "extra-security-asset-id")
        fill(security_quantity="1330", security_price="108", repo_ccp="no")
        official, missing_day, alternate_leg = fx_sample
        accrued = Decimal(official["quotes"][0]["value"])
        leg = official["exchange"]["rates"][0]["legs"][0]
        fixing = Decimal(leg["rate"])/Decimal(leg["units"])
        cents = Decimal("0.01")
        def final_amount(price, rate):
            return (1330*(price+accrued)*rate).quantize(cents,rounding=ROUND_HALF_UP)
        def display(amount, group=False):
            return (format(amount,",.2f").replace(","," ") if group else format(amount,".2f")).replace(".",",")
        def visible(key):
            return browser.eval("Boolean("+field(key)+".getClientRects().length)")
        checks.check("trade date defaults to application date", browser.eval(field("extra-trade-date")+".value") == TRADE_DAY)
        checks.check("automatic percentage mode and contextual price label",
                     wait_value("extra-estimate","1 507 062,90 USD") and "Цена, % от номинала" in browser.eval(
                     "document.querySelector('label[for=docwiz-field-extra-security-price]').textContent"))
        checks.check("regular text input with rounded QORT default and source",wait_value("extra-accrued-input","53,13")
                     and browser.eval(field("extra-accrued-input")+".type==='text'") and
                     "MarketInfo" in browser.eval(field("extra-accrued-input-source")+".textContent"))
        checks.check("no quotation mode, manual NKD mode, refresh or confirmation controls",browser.eval(
                     "!document.querySelector('[data-toggle-accrued],[data-field-key=extra-quotation-mode],"
                     "[data-field-key=extra-accrued-mode],[data-field-key=extra-accrued-review]')"))
        checks.check("official quote includes units and date", wait_value("extra-rates-summary","23.11.2026")
                     and wait_value("extra-rates-summary","1 USD"))
        clean = Decimal(official["terms"]["nominal"])*Decimal("1.08")
        value = final_amount(clean,fixing)
        checks.check("unrounded primary NKD reaches the automatic amount",
                     wait_value("extra-manual-amount",display(value)) and accrued == Decimal("53.129999"))
        with pdf(BOND_ISIN+"-percent",2) as doc:
            checks.check("exact PDF cells for percentage price, rounded NKD, quote and payment",
                         cell(doc[0],257,586.5,80)=="108 %" and cell(doc[0],343.46,586.5,92.91)=="53,13" and
                         cell(doc[0],442,586.5,101)=="USD" and cell(doc[0],249.1,632.78,294.2)==display(value,True)+" RUB")
        fill(trade_date=missing_day)
        checks.check("missing fixing clears previous automatic amount and opens the rate input",
                     wait_value("extra-rates-summary","курс") and visible("extra-price-rate") and
                     browser.eval(field("extra-manual-amount")+".value") == "")
        fill(price_rate="80,12")
        manual_value = final_amount(clean,Decimal("80.12"))
        checks.check("manual FX recalculates immediately without changing dated NKD",
                     wait_value("extra-manual-amount",display(manual_value)) and wait_value("extra-accrued-input","53,13"))
        with pdf(BOND_ISIN+"-manual-rate",2) as doc:
            checks.check("manual FX reaches PDF",cell(doc[0],249.1,632.78,294.2) == display(manual_value,True)+" RUB")
        fill(manual_amount="999,99",manual_currency="RUB",amount_reason="Сумма согласована для проверки")
        browser.eval(field("order-review")+".click()")
        fill(price_rate="80.15")
        checks.check("editing the rate retains an explicit amount and revokes confirmation",
                     browser.eval(field("extra-manual-amount")+".value")== "999,99" and not browser.eval(field("order-review")+".checked"))
        fill(trade_date=TRADE_DAY)
        checks.check("restoring the official rate retains a manual amount",
                     wait_value("extra-estimate","1 507 062,90 USD") and browser.eval(field("extra-manual-amount")+".value")=="999,99")
        browser.eval("document.querySelector('[data-order-reset-amount]').click()")
        checks.check("restore automatically calculated amount",wait_value("extra-manual-amount",display(final_amount(clean,fixing))))
        fill(accrued_input="53,13")
        entered_total=(1330*(clean+Decimal("53.13"))*fixing).quantize(cents,rounding=ROUND_HALF_UP)
        checks.check("typing the rounded number uses the operator's exact precision",
                     entered_total != value and wait_value("extra-manual-amount",display(entered_total)))
        fill(accrued_input="4,5",accrued_currency="INR")
        alternate_fx = Decimal(alternate_leg["rate"])/Decimal(alternate_leg["units"])
        mixed = (1330*(clean*fixing+Decimal("4.5")*alternate_fx)).quantize(cents,rounding=ROUND_HALF_UP)
        checks.check("manual interest in INR uses its 100-unit CBR quote alongside USD principal",
                     wait_value("extra-rates-summary","100 INR") and wait_value("extra-manual-amount",display(mixed)))
        with pdf(BOND_ISIN+"-manual-interest",2) as doc:
            checks.check("mixed currency interest and RUB total print in their proper cells",
                         cell(doc[0],343.46,586.5,92.91)=="4,5 INR" and cell(doc[0],249.1,632.78,294.2)==display(mixed,True)+" RUB")
        literal = "По договору"
        fill(accrued_input=literal)
        checks.check("arbitrary NKD text clears the automatic amount and its numeric breakdown",
                     browser.eval(field("extra-accrued-input")+".value")==literal and
                     browser.eval(field("extra-manual-amount")+".value")=="" and
                     "Чистая стоимость" not in browser.eval(field("extra-estimate")+".value"))
        fill(manual_amount="12345,67",manual_currency="RUB",amount_reason="Сумма по договору")
        browser.eval(field("order-review")+".click()")
        with pdf(BOND_ISIN+"-text",2) as doc:
            checks.check("verbatim NKD text and agreed amount in distinct PDF fields",
                         cell(doc[0],343.46,586.5,92.91)==literal and cell(doc[0],249.1,632.78,294.2)=="12 345,67 RUB")
        browser.eval("document.getElementById('docwiz-back-btn').click();"
                     "document.querySelector('button[data-doc-id=order-trade]').click()")
        checks.check("returning to the form preserves literal NKD and manual amount",
                     wait_value("extra-accrued-input",literal) and browser.eval(field("extra-manual-amount")+".value")=="12345,67")
        # Hold a real HTTP response while the operator edits the NKD field.
        browser.eval("""window.nkdFetch=window.fetch;window.fetch=async function(url,options) {
            const response=await window.nkdFetch(url,options),u=new URL(url,location);
            if (u.pathname.endsWith('/266') && u.searchParams.get('settlementDate')==='2026-11-25') {
              await new Promise(resolve=>{window.releaseNkd=resolve});
            }
            return response;
        }""")
        fill(settlement_date=DATES[2])
        if not wait_for("typeof window.releaseNkd==='function'"):
            raise AssertionError("Expected a dated QORT lookup")
        fill(accrued_input="  Текст  ")
        browser.eval("window.fetch=window.nkdFetch;window.releaseNkd()")
        cache = "CRMInstrumentCatalog.bondData('266','2026-11-25',{tradeDate:'2026-11-23',quotation:'percent',accruedCurrency:'INR'})"
        checks.check("delayed QORT response preserves verbatim input including spaces",wait_for("!!"+cache) and
                     browser.eval(field("extra-accrued-input")+".value")=="  Текст  ")
        fill(accrued_input="",settlement_date=DATES[3])
        checks.check("an explicit blank survives the next response and preserves the manual total",
                     wait_for("!!"+cache.replace(DATES[2],DATES[3])) and browser.eval(field("extra-accrued-input")+".value")=="" and
                     browser.eval(field("extra-manual-amount")+".value")=="12345,67")
        type_search(browser,"extra-security-asset-id",ISINS[0])
        pick_result(browser,"extra-security-asset-id")
        key = str(dated["asset"]["assetId"])
        checks.check("choosing another bond also preserves the explicit blank",
                     wait_for("!!"+cache.replace("'266'","'"+key+"'").replace(DATES[2],DATES[3])) and
                     browser.eval(field("extra-accrued-input")+".value")=="")

        select("order-venue-transfer")
        fill(move_from="stock",move_to="stock")
        checks.check("duplicate market clears the opposite side",browser.eval(field("extra-move-from")+".value===''"))
        fill(move_from="currency",move_currency="RUB",move_amount="122054562115,15")
        with pdf("poruchenie-perevod-ploshchadki",1) as doc:
            text=" ".join(doc[0].get_text().split())
            checks.check("transfer, words and CRM code","122 054 562 115,15" in text and "миллиард" in text and "INV-1011" in text)
        select("order-bank-withdrawal")
        fill(payout_from="stock",payout_currency="RUB",payout_amount_mode="amount",payout_amount="13316,44",bank="req-ul-rub")
        with pdf("poruchenie-vyvod-na-bank",1) as doc:
            text=" ".join(doc[0].get_text().split())
            checks.check("withdrawal uses saved CRM bank and client code","40702810100000012345" in text and
                         "13 316,44" in text and "INV-1011" in text)
    finally:
        browser.stop()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:4179", help="origin of the running live server")
    parser.add_argument("--keep", type=Path, help="write the downloaded PDF files here")
    args = parser.parse_args()
    if args.keep:
        args.keep.mkdir(parents=True, exist_ok=True)
    checks = Checks()
    opener = build_opener(ProxyHandler({}))
    base = args.url.rstrip("/")
    timings = {"search":[], "detail":[]}
    def get(suffix, label):
        start = monotonic()
        with opener.open(base+"/api/order-reference/assets"+suffix,timeout=20) as response:
            result = json.load(response)
        timings[label].append((monotonic()-start)*1000)
        return result
    def search(term, **params):
        return get("?"+urlencode({"q":term, **params}),"search")

    for term in (ISINS[0],"YKENP","Сбер"):
        rows = search(term)["items"]
        checks.check("ranked unique live results "+term, 0<len(rows)<=20 and len({r["assetId"] for r in rows})==len(rows)
                     and all(r["assetId"].isdigit() for r in rows))
    one = search("Сбер",limit=1)
    if one["nextCursor"]:
        two = search("Сбер",limit=1,cursor=one["nextCursor"])
        checks.check("distinct next page",one["items"][0]["assetId"] != two["items"][0]["assetId"])

    control = control_connection()
    observations = {}
    ruble_id = None
    try:
        control.timeout = 10
        cursor = control.cursor()
        fx_sample = check_currency_dates(search, get, cursor, checks)
        for isin in ISINS:
            row = next(r for r in search(isin)["items"] if r["isin"]==isin)
            for date in DATES:
                data = get("/"+row["assetId"]+"?settlementDate="+date, "detail")
                bond = data["bondData"]
                ref = cursor.execute(CONTROL,int(date.replace("-","")),int(bond["asOfDate"].replace("-","")),
                                     int(row["assetId"]),isin).fetchone()
                expected = ref.SourceStatus
                section = {"PRIMARY_TPLUS":1,"FALLBACK_OTC_101":101,"DEFAULT_ZERO":None}[expected]
                table = ref.MainSourceTable if section==1 else ref.OTCSourceTable if section==101 else None
                observed = ref.MainObservationDate if section==1 else ref.OTCObservationDate if section==101 else None
                checks.check(f"independent SELECT {isin} {date}", bond["sourceStatus"]==expected and
                    bond["sourceSectionId"]==section and bond["sourceTable"]==table and bond["settlementDate"]==date and
                    (bond["observationDate"] or "").replace("-","")==str(observed or "") and
                    abs(Decimal(bond["rawValue"])-Decimal(str(ref.SelectedNKDRaw)))<Decimal("0.00000001"))
                if isin==ISINS[0]:
                    quote = bond["quotes"][0]
                    print(date, row["assetId"], quote["displayValue"], quote["currency"],expected,table,observed)
                    observations[date] = data
                elif isin==ISINS[1]:
                    ruble_id = row["assetId"]
                if isin==ISINS[-1] and not data["asset"]["instrumentTerms"]["isTrading"]:
                    checks.check("inactive issue has no automatic specification "+date,bond["terms"] is None)
    finally:
        control.close()
    ruble = get("/"+ruble_id+"?settlementDate="+observations[DATES[0]]["asset"]["asOfDate"],"detail")
    for k,times in timings.items():
        print(f"{k}: n={len(times)}, median {median(times):.0f} ms, range {min(times):.0f}–{max(times):.0f} ms")
    check_browser(base, checks, args.keep, observations, ruble, fx_sample)
    for name, ok, details in checks.failed:
        print("FAIL",name,details)
    print(f"QORT live: {len(checks.results)-len(checks.failed)}/{len(checks.results)} checks passed")
    return int(bool(checks.failed))

if __name__ == "__main__":
    raise SystemExit(main())
