"""Сравнивает статус HTTP и все JSON-поля двух работающих API. Только GET."""
import argparse
import json
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import ProxyHandler, build_opener

API = "/api/order-reference/assets"
LIVE_ISINS = ("RU000A10A869", "RU000A10FAK6", "RU000A10FRA1", "RU000A10A6J1",
              "RU000A10G7B0", "RU000A102LR1", "RU0009029540")
MOCK_IDS = ("A-100001", "A-100002", "A-100003", "A-100004", "A-200001",
            "A-200002", "A-300001", "A-300002")


def read(client, origin, suffix):
    try:
        response = client.open(origin.rstrip("/") + API + suffix, timeout=20)
    except HTTPError as error:
        response = error
    with response:
        if response.headers.get_content_type() != "application/json":
            raise ValueError("Ответ API должен быть JSON")
        return response.status, json.load(response)


def difference(left, right, path="$"):
    if type(left) is not type(right):
        return path
    if isinstance(left, dict):
        if left.keys() != right.keys():
            return path + "." + ",".join(sorted(left.keys() ^ right.keys()))
        return next((result for key in left if (result := difference(left[key], right[key], path + "." + key))), None)
    if isinstance(left, list):
        if len(left) != len(right):
            return path + ".length"
        return next((result for i, (a, b) in enumerate(zip(left, right))
                     if (result := difference(a, b, f"{path}[{i}]"))), None)
    return path if left != right else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--node", required=True)
    parser.add_argument("--php", required=True)
    parser.add_argument("--mock", action="store_true")
    args = parser.parse_args()
    client = build_opener(ProxyHandler({}))
    failures = []
    count = 0

    def compare(suffix, expected=200):
        nonlocal count
        count += 1
        status, first = read(client, args.node, suffix)
        other, second = read(client, args.php, suffix)
        diff = difference(first, second)
        if status != expected or other != expected or diff:
            failures.append(f"{suffix} HTTP {status}/{other}, поле {diff or '—'}")
        return first

    for q in ("", "A", "SB", "Сбер", "SBER", "ОФЗ", "LQDT", "ZZZ-no-such-asset", "%_", "[", "ёб"):
        compare("?" + urlencode({"q": q}))
    for kind in ("security", "bond", "share", "fund"):
        first = compare("?" + urlencode({"q": "RU", "assetClass": kind, "limit": 2}))
        if first.get("nextCursor"):
            compare("?" + urlencode({"q": "RU", "assetClass": kind, "limit": 2, "cursor": first["nextCursor"]}))
    for suffix in ("?q=RU&limit=-1", "?q=RU&cursor=-1", "?q=RU&limit=NaN", "?q=RU&assetClass=no",
                   "/266?settlementDate=2026-02-30", "/266?tradeDate=bad", "/266?quotation=no",
                   "/266?accruedCurrency=usd"):
        compare(suffix, 400)
    for suffix in ("/missing", "/0", "/9007199254740992"):
        compare(suffix, 404)
    if args.mock:
        ids = MOCK_IDS
    else:
        ids = []
        for isin in LIVE_ISINS:
            page = compare("?q=" + isin)
            ids.append(next(row["assetId"] for row in page["items"] if row["isin"] == isin))

    for key in ids:
        compare("/" + key)
        for day in ("23", "24", "25", "26"):
            compare(f"/{key}?settlementDate=2026-11-{day}&tradeDate=2026-11-23")
    bond = "A-200002" if args.mock else ids[0]
    for trade in ("2026-11-20", "2026-11-23", "2026-11-24", "2027-01-01"):
        for mode in ("percent", "cash"):
            compare(f"/{bond}?settlementDate=2026-11-24&tradeDate={trade}&quotation={mode}&accruedCurrency=INR")
    print(f"Совпало {count - len(failures)} из {count} ответов ({'mock' if args.mock else 'QORT'}).")
    for failure in failures:
        print(failure)
    return int(bool(failures))


if __name__ == "__main__":
    raise SystemExit(main())
