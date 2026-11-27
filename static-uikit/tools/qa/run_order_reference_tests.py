"""Exercise the local HTTP reference adapter, trade wizard and all three downloaded PDF files."""
from __future__ import annotations

from contextlib import nullcontext
import argparse
import base64
import json
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import build_opener, ProxyHandler

import fitz

from headless_browser import Chrome, STATIC_UIKIT
from run_order_forms_tests import (Checks, COMPANY, INDIVIDUAL, fetch_pdf, fill_trade_common,
                                   generate, pick_result, set_field, type_search)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keep", type=Path, help="save three PDFs and desktop/mobile screenshots")
    parser.add_argument("--url", help="origin of an already running mock API")
    args = parser.parse_args()
    if args.keep:
        args.keep.mkdir(parents=True, exist_ok=True)
    qa = Checks()
    opener = build_opener(ProxyHandler({}))
    command = ["node", str(Path(STATIC_UIKIT) / "tools/order-reference-server.mjs"), "0"]
    preview = nullcontext(None) if args.url else subprocess.Popen(command, stdout=subprocess.PIPE, encoding="utf-8")
    with preview as server:
        browser = None
        try:
            entry = (args.url.rstrip("/") + "/static-uikit/pages/document-wizard.html?subject=c-006"
                     if args.url else server.stdout.readline().strip())
            if server and not entry.startswith("http://127.0.0.1:"):
                raise RuntimeError("Local reference server did not announce its URL: " + entry)
            base = entry.split("/static-uikit/", 1)[0]
            api = base + "/api/order-reference/assets"
            def get(path):
                with opener.open(api+path, timeout=6) as response:
                    return json.load(response)
            for term in ["RU0009029540", "SBER", "%D0%A1%D0%B1%D0%B5%D1%80"]:
                hits = get("?q="+term)["items"]
                qa.check("ISIN/ticker/name ranking "+term, bool(hits) and hits[0]["assetId"] == "A-100001"
                         and len({r["assetId"] for r in hits}) == len(hits) and bool(hits[0]["issuerName"]))
            page = get("?q=RU&assetClass=bond&limit=1")
            more = get("?q=RU&assetClass=bond&limit=1&cursor="+page["nextCursor"])
            qa.check("paged asset class",len(page["items"])==len(more["items"])==1
                     and page["items"][0]["assetId"]!=more["items"][0]["assetId"] and more["nextCursor"] is None)
            qa.check("empty search",get("?q=")["items"]==[])
            qa.check("two-character ticker/prefix",bool(get("?q=SB")["items"]))
            qa.check("no results",get("?q=NO_SUCH_BOND")["items"]==[])
            for path,code in [("?q=RU&cursor=-1",400),("?q=RU&limit=NaN",400),("/unknown",404),
                              ("/A-200002?settlementDate=2026-02-30",400)]:
                try: get(path); status=200
                except HTTPError as exc: status=exc.code
                qa.check("HTTP "+path,status==code)
            zero = get("/A-200002?settlementDate=2026-11-24")
            qa.check("detail carries quote, unit, currency and section",
                     all(q["unit"]=="per-security" and q["currency"]=="RUB" and q["section"] for q in zero["bondData"]["quotes"]))
            browser = Chrome()
            field = lambda key: "document.getElementById("+json.dumps("docwiz-field-"+key)+")"
            def value(key): return browser.eval("document.querySelector("+json.dumps('[data-field-key="'+key+'"]')+").value")
            def select(doc,client=COMPANY):
                browser.goto(entry.split("?")[0]+"?subject="+client)
                browser.eval("document.querySelector('button[data-doc-id="+doc+"]').click()")
            def fill(**fields):
                for key,val in fields.items():
                    k="selectedRequisiteId" if key=="bank" else "extra-"+key.replace("_","-")
                    result=set_field(browser,k,val)
                    if not result.get("ok"): raise AssertionError((k,result))
            def wait_for(js):
                deadline=time.monotonic()+10
                while time.monotonic()<deadline:
                    if browser.eval(js): return True
                    time.sleep(.04)
                return False
            def choose(term):
                type_search(browser,"extra-security-asset-id",term)
                found=pick_result(browser,"extra-security-asset-id")
                if not found.get("id"): raise AssertionError((term,found))
            def rejected(label):
                result=generate(browser,10000)
                qa.check(label,result["downloads"]==0 and "is-error" in result["kind"],str(result))
            def save_pdf(name,pages):
                result=generate(browser,15000)
                if not qa.check(name+" downloaded",result["downloads"]==1 and "is-error" not in result["kind"],str(result)):
                    raise AssertionError(result["status"])
                blob=fetch_pdf(browser,result["url"])
                if args.keep and name.startswith("poruchenie-"): (args.keep/(name+".pdf")).write_bytes(blob)
                pdf=fitz.open(stream=blob,filetype="pdf")
                qa.check(name+" pages",len(pdf)==pages)
                return pdf
            def print_cell(page,x,y,width):
                return " ".join(s["text"] for b in page.get_text("dict")["blocks"] for l in b.get("lines",[])
                    for s in l["spans"] if "Liberation" in s["font"] and x-.2<=s["origin"][0]<x+width
                    and abs(s["origin"][1]-y)<.25 and s["bbox"][2]<=x+width+.2)
            def shot(name,start,end,width):
                if not args.keep: return
                browser._send("Emulation.setDeviceMetricsOverride",{"width":width,"height":950,"deviceScaleFactor":1,"mobile":False})
                box=browser.eval("""(()=>{const panel=document.querySelector('#docwiz-extra-fields');
                  const a=document.getElementById(%s).closest('.crm-docwiz-field-wrap').getBoundingClientRect();
                  const b=document.getElementById(%s).closest('.crm-docwiz-field-wrap').getBoundingClientRect();
                  const p=panel.getBoundingClientRect();return {x:Math.max(0,p.left+scrollX-7),y:a.top+scrollY-6,
                  width:p.width+14,height:b.bottom-a.top+12,scale:1}})()"""%(json.dumps("docwiz-field-"+start),json.dumps("docwiz-field-"+end)))
                raw=browser._send("Page.captureScreenshot",{"format":"png","captureBeyondViewport":True,"clip":box})
                (args.keep/(name+".png")).write_bytes(base64.b64decode(raw["data"]))
            select("order-trade",INDIVIDUAL)
            qa.check("server mode does not ship complete security catalog",browser.eval(
                "!!document.querySelector('meta[name=crm-order-reference-api]') && !window.CRMOrderDemoSecurities && CRMInstrumentCatalog.SECURITY_ASSETS.length===0"))
            # Network events are recorded before the first search to distinguish list/detail requests.
            browser.eval("""window.orderTestFetch=window.fetch;window.orderTestRequests=[];
              window.fetch=(url,opts)=>{window.orderTestRequests.push(String(url));return window.orderTestFetch(url,opts)}""")
            search=field("extra-security-asset-id-search")
            menu=field("extra-security-asset-id-menu")
            browser.eval("""window.orderTestType = term => {const input=document.querySelector('[data-autocomplete-for="extra-security-asset-id"]');
              input.focus();input.value=term;input.dispatchEvent(new Event('input',{bubbles:true}))}""")
            # Choose an active branch before exercising keyboard and search.
            fill_trade_common(browser,kind="limit")
            browser.eval("orderTestType('GA');orderTestType('GAZ')")
            qa.check("300 ms debounce skips superseded text",wait_for(menu+".textContent.includes('GAZP')")
                     and not browser.eval("orderTestRequests.some(s=>new URL(s,location).searchParams.get('q')==='GA')"))
            browser.eval("""window.orderTestLogFetch=window.fetch;
              window.fetch=async (url,opts)=>{const response=await orderTestLogFetch(url,opts);
                if (new URL(url,location).searchParams.get('q')==='SB') await new Promise(r=>setTimeout(r,650));
                return response};
              orderTestType('SB')""")
            qa.check("first request sent",wait_for("orderTestRequests.some(s=>new URL(s,location).searchParams.get('q')==='SB')"))
            browser.eval("orderTestType('GAZP')")
            wait_for(menu+".textContent.includes('GAZP')")
            browser.eval("new Promise(r=>setTimeout(r,750))",await_promise=True)
            qa.check("late result cannot overwrite active query",browser.eval(menu+".textContent.includes('GAZP') && !"+menu+".textContent.includes('SBER')"))
            browser.eval("""let failOnce=true;window.fetch=(url,opts)=>{
              if(failOnce && new URL(url,location).searchParams.get('q')==='RETRYTEST') {failOnce=false;return Promise.reject(new Error('test timeout'))}
              return orderTestLogFetch(url,opts)};orderTestType('RETRYTEST')""")
            qa.check("error and retry action",wait_for(menu+".textContent.includes('Повторить')"))
            browser.eval(menu+".querySelector('button').click()")
            qa.check("retry distinguishes empty result from failure",wait_for(menu+".textContent.includes('Ничего не найдено')"))
            browser.eval("window.fetch=orderTestLogFetch")
            type_search(browser,"extra-security-asset-id","GAZP")
            browser.eval(search+".dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))")
            qa.check("keyboard selects result by ID",wait_for("CRMInstrumentCatalog.getSecurity("+field("extra-security-asset-id")+".value)?.isin==='RU0007661625'"))
            browser.eval(field("extra-settlement-period")+".focus()")
            browser._send("Input.dispatchKeyEvent",{"type":"keyDown","key":"End","code":"End","windowsVirtualKeyCode":35})
            browser._send("Input.dispatchKeyEvent",{"type":"keyUp","key":"End","code":"End","windowsVirtualKeyCode":35})
            qa.check("native select keyboard opens date control",value("extra-settlement-period")=="date" and not browser.eval(field("extra-settlement-date")+".disabled"))
            fill(order_date="2026-11-20",settlement_period="date",settlement_date="2026-11-23")
            choose("SU26238")
            fill(security_quantity="10",security_price="98,5",repo_ccp="no")
            qa.check("dated quote arrived",wait_for(field("extra-accrued-input")+".value==='12,34'"))
            qa.check("settlement request by AssetID and day",browser.eval(
                "orderTestRequests.some(s=>s.includes('/A-200002?settlementDate=2026-11-23'))"))
            qa.check("calculated amount in a single editable control",value("extra-order-amount")=="9973,40" and
                     not browser.eval(field("extra-order-amount")+".readOnly") and value("extra-settlement-currency")=="RUB")
            qa.check("fixture is visibly identified", "Демо" in browser.eval(field("extra-accrued-input-source")+".textContent"))
            qa.check("native select has a clickable 44px target and one inert chevron",browser.eval(
                """(()=>{const s=document.getElementById('docwiz-field-extra-settlement-period'),icon=s.nextElementSibling;
                return s.tagName==='SELECT' && s.getBoundingClientRect().height>=44 && getComputedStyle(icon).pointerEvents==='none'
                && getComputedStyle(s).backgroundImage==='none'})()"""))
            shot("trade-reference-desktop","extra-accrued-input","extra-order-amount",1280)
            shot("settlement-mobile","extra-settlement-period","extra-settlement-date",420)
            shot("trade-reference-mobile","extra-accrued-input","extra-order-amount",420)
            browser._send("Emulation.setDeviceMetricsOverride",{"width":1280,"height":950,"deviceScaleFactor":1,"mobile":False})
            with save_pdf("poruchenie-na-sdelku",2) as pdf:
                for label,x,y,w,expected in [("settlement",250.8,411.56,292.2,"23.11.2026"),("price",257,586.5,80,"98,5 %"),
                    ("accrued",343.46,586.5,92.91,"12,34"),("currency",442,586.5,101,"RUB"),("total",249.1,632.78,294.2,"9 973,40")]:
                    qa.check("mapped "+label,print_cell(pdf[0],x,y,w)==expected,print_cell(pdf[0],x,y,w))
                qa.check("inactive FX and derivatives blank",not print_cell(pdf[1],249,181.57,295) and not print_cell(pdf[0],249,699.03,295))
            for tenor in ["T+0","T+1","T+2"]:
                fill(settlement_period=tenor)
                qa.check("tenor clears dated information "+tenor,not value("extra-accrued-input") and not value("extra-order-amount"))
            fill(settlement_period="date")
            qa.check("restores explicit date",value("extra-settlement-date")=="2026-11-23")
            fill(settlement_date="")
            with save_pdf("blank-settlement",2) as pdf:
                qa.check("empty calendar date leaves the settlement cell blank",not print_cell(pdf[0],250.8,411.56,292.2))
            fill(settlement_date="2026-11-18")
            rejected("settlement before order")
            fill(settlement_date="2026-11-24")
            qa.check("zero differs from absence",wait_for(field("extra-accrued-input")+".value==='0,00'") and value("extra-order-amount")=="9850,00")
            fill(settlement_date="2026-11-25")
            qa.check("section 1 wins over different lower-priority observations",
                     wait_for(field("extra-accrued-input")+".value==='12,34'") and value("extra-order-amount")=="9973,40")
            fill(settlement_date="2026-12-01")
            qa.check("both source sections empty gives zero; unconfirmed nominal leaves total empty",
                     wait_for(field("extra-accrued-input")+".value==='0,00'") and not value("extra-order-amount"))
            fill(settlement_date="2026-11-23",accrued_input="13.01")
            qa.check("typing numeric interest updates estimate immediately",wait_for(field("extra-order-amount")+".value==='9980,10'"))
            fill(order_amount="9950,20")
            shot("trade-manual-desktop","extra-accrued-input","extra-settlement-currency",1280)
            with save_pdf("manual-check",2) as pdf:
                qa.check("manual values in own cells",print_cell(pdf[0],343.46,586.5,92.91)=="13.01"
                         and print_cell(pdf[0],249.1,632.78,294.2)=="9950,20")
            fill(settlement_date="2026-11-24")
            qa.check("date preserves both edited values",value("extra-accrued-input")=="13.01" and value("extra-order-amount")=="9950,20")
            fill(accrued_input="НКД  <&>",accrued_currency="у.е.",security_currency="р & ₽",
                 settlement_period="",order_amount="Не более 10 000 руб.",settlement_currency="у.е. & ₽")
            with save_pdf("literal-bond",2) as pdf:
                qa.check("text interest, spaces, symbols and both currencies print verbatim",
                         print_cell(pdf[0],343.46,586.5,92.91)=="НКД  <&> у.е." and print_cell(pdf[0],442,586.5,101)=="р & ₽" and
                         print_cell(pdf[0],249.1,632.78,294.2)=="Не более 10 000 руб. у.е. & ₽" and not print_cell(pdf[0],250.8,411.56,292.2))
            price_text = "Не более 100 руб. за одну бумагу"
            nkd_text = "НКД определяется на дату расчётов по условиям выпуска № 7, включая все изменения"
            fill(security_price=price_text,accrued_input=nkd_text,accrued_currency="RUB",security_currency="RUB")
            with save_pdf("long-literals",2) as pdf:
                for x,right,text in [(257,337,price_text),(343.46,436.37,nkd_text)]:
                    spans=[s for b in pdf[0].get_text("dict")["blocks"] for l in b.get("lines",[]) for s in l["spans"]
                           if "Liberation" in s["font"] and x-.2<=s["origin"][0]<right and 574<s["origin"][1]<593.7]
                    spans.sort(key=lambda s:(s["origin"][1],s["origin"][0]))
                    qa.check("long literal fits its original cell "+str(x),
                        "".join(s["text"] for s in spans)==text and len({round(s["origin"][1],1) for s in spans})==2
                        and all(s["bbox"][2]<=right+.3 for s in spans),repr([s["text"] for s in spans]))
            choose("SBER")
            qa.check("share resets price, amount and settlement currency and hides bond interest",
                not any(value(k) for k in ["extra-security-price","extra-order-amount"]) and
                browser.eval(field("extra-accrued-input")+".disabled") and value("extra-settlement-currency")=="RUB")
            fill(security_price="272.5",settlement_period="T+1")
            with save_pdf("stock-check",2) as pdf:
                qa.check("stock tenor and inactive accrued",print_cell(pdf[0],250.8,411.56,292.2)=="T+1" and not print_cell(pdf[0],343.46,586.5,92.91))
            select("order-venue-transfer")
            fill(move_from="stock",move_to="currency",move_currency="RUB",move_amount="122054562115,15")
            with save_pdf("poruchenie-perevod-ploshchadki",1) as pdf:
                words=" ".join(pdf[0].get_text().split())
                qa.check("transfer amount and CRM INV","122 054 562 115,15" in words and "INV-1011" in words)
            select("order-bank-withdrawal")
            fill(payout_from="stock",payout_currency="RUB",payout_amount_mode="amount",payout_amount="13316,44",bank="req-ul-rub")
            with save_pdf("poruchenie-vyvod-na-bank",1) as pdf:
                words=" ".join(pdf[0].get_text().split())
                qa.check("withdrawal requisites and digits","40702810100000012345" in words and "13 316,44" in words and "INV-1011" in words)
        finally:
            if browser: browser.stop()
            if server: server.terminate()
    for name,ok,detail in qa.failed: print("FAIL",name,detail)
    print(f"Order reference: {len(qa.results)-len(qa.failed)}/{len(qa.results)} checks passed")
    return int(bool(qa.failed))

if __name__=="__main__":
    sys.exit(main())
