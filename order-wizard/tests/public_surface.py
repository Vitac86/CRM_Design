"""Проверка HTTP-границы между ресурсами интерфейса и исходным кодом/конфигурацией."""
import argparse
import re
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import ProxyHandler, Request, build_opener

REPO = Path(__file__).resolve().parents[2]
STATIC = REPO / "static-uikit"
PRIVATE_PATHS = [
    "/order-wizard/src/qort.php", "/src/reference.php", "/serve.php", "/web.config",
    "/static-uikit/.env.qort.local", "/static-uikit/.env.qort.example",
    "/static-uikit/tools/order-reference-server.mjs", "/static-uikit/tools/qort/connection.mjs",
    "/static-uikit/tools/qort/reference.mjs", "/static-uikit/tools/qa/qort_nkd_control.sql",
    "/static-uikit/assets/js/document-wizard/instrument-securities-demo.js",
]
PRIVATE_PATHS += ["/static-uikit/tools/qort/" + p.name for p in (STATIC / "tools/qort").glob("*.sql")]
CONNECTION = re.compile(rb"\b(?:QORT_SERVER|QORT_DATABASE|QORT_TRUSTED_CONNECTION|BACK_QORT_DB|"
                        rb"Trusted_Connection\s*=|ApplicationIntent=ReadOnly|sqlsrv:Server\s*=|"
                        rb"Driver=\{ODBC Driver|SQLSTATE\[)", re.I)
QUERY = re.compile(rb"\b(?:SELECT\b.{0,500}?\bFROM|JOIN)\s+(?:\[?(?:dbo|sys)\]?\s*\.\s*\[?\w+|"
                   rb"AssetsBaseValues|CrossRatesHist|MarketInfoHist|Securities\b|Assets\b)", re.I | re.S)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True)
    args = parser.parse_args()
    client = build_opener(ProxyHandler({}))
    checked = 0

    def get(path, method="GET"):
        try:
            r = client.open(Request(args.url.rstrip("/") + quote(path, safe="/?=&%"), method=method), timeout=10)
        except HTTPError as e:
            r = e
        with r:
            return r.status, r.read()

    for path in PRIVATE_PATHS:
        status, body = get(path)
        if status != 404 or CONNECTION.search(body) or QUERY.search(body):
            raise AssertionError(f"Приватный адрес {path}, HTTP {status}")
    paths = ["/static-uikit/INDEX.html", "/api/order-reference/assets?q=SB",
             "/api/order-reference/assets/266?settlementDate=2026-11-24&tradeDate=2026-11-23"]
    for root in (STATIC / "assets", STATIC / "pages"):
        paths.extend("/static-uikit/" + p.relative_to(STATIC).as_posix() for p in root.rglob("*") if p.is_file())
    for path in paths:
        status, body = get(path)
        if status == 404:
            continue
        if status != 200 or CONNECTION.search(body) or QUERY.search(body):
            raise AssertionError(f"Проверка публичного ресурса {path}, HTTP {status}")
        checked += 1
    if get("/api/order-reference/assets", method="POST")[0] != 405:
        raise AssertionError("API принимает метод записи")
    print(f"Проверено {checked} доступных HTTP-ресурсов и {len(PRIVATE_PATHS)} приватных путей.")


if __name__ == "__main__":
    main()
