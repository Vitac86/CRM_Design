"""Fit a realistic-long value to the slot the source form actually gives it.

The point of the manual pack is that the manager can *open* the document and
look at it. A case that the engine refuses teaches nothing visually, and many
of the refusals are ordinary source-layout limits that the production audit
already records: a printed cell is 50 pt wide and a 145-character issuing
authority does not go into it at 9 pt however the engine wraps it.

So when a case is refused, this steps the offending value down one rung of its
own curated ladder — long → medium → short, always another *plausible* value,
never a truncation — and asks the engine again. That is exactly what a manager
does in the wizard. Every substitution is recorded, so the report says which
slot could not hold which realistic-long value, and the fixture JSON always
holds the values the PDF was really drawn from.

Nothing here changes production behaviour: no map, no renderer, no identifier.
"""

from __future__ import annotations

import re

from smoke_profiles import VALUES as V

# ── Ladders, longest first ───────────────────────────────────────────────────

LADDERS: dict[str, list[str]] = {
    "ru_address": [
        V["ru_address_long"],
        V["ru_address_legal_long"],
        V["ru_address_postal_long"],
        "190121, Российская Федерация, город Санкт-Петербург, Адмиралтейский "
        "район, набережная реки Мойки, дом 102, корпус 3, квартира 217",
        "190121, Российская Федерация, город Санкт-Петербург, улица "
        "Декабристов, дом 42, квартира 17",
        "190121, Россия, г. Санкт-Петербург, ул. Декабристов, д. 42, кв. 17",
        "г. Санкт-Петербург, ул. Декабристов, д. 42, кв. 17",
        "г. Санкт-Петербург, ул. Декабристов, д. 42",
    ],
    "en_address": [
        V["en_address_postal_long"],
        V["en_address_long"],
        "Suite 1420, Kingsway House, 118 Ludgate Hill, London, EC4M 7AA, "
        "United Kingdom",
        "27 King Street, London, SW1A 2AA, United Kingdom",
        "27 King Street, London SW1A 2AA",
    ],
    "ru_authority": [
        V["ru_passport_authority_long"],
        "Отделение по вопросам миграции ОМВД России по Пресненскому району "
        "города Москвы",
        "ОВМ УМВД России по Адмиралтейскому району Санкт-Петербурга",
        V["ru_passport_authority_normal"],
        "ГУ МВД России по г. СПб",
    ],
    "en_authority": [
        V["en_passport_authority_long"],
        "His Majesty's Passport Office, Overseas Territories Directorate",
        "His Majesty's Passport Office",
        "UK Passport Office",
    ],
    "ru_company": [
        V["ru_company_very_long"],
        V["ru_company_long"],
        "Акционерное общество «Северная инвестиционная компания»",
        V["ru_company_normal"],
        V["ru_company_short_name"],
    ],
    "en_company": [
        V["en_company_very_long"],
        V["en_company_long"],
        "Northern Continental Investment Holdings Limited",
        V["en_company_normal"],
        V["en_company_short_name"],
    ],
    "ru_person": [
        V["ru_name_very_long"],
        V["ru_name_long"],
        V["ru_name_normal"],
        "Соколов А.М.",
    ],
    "en_person": [
        V["en_name_very_long"],
        V["en_name_long"],
        V["en_name_normal"],
        "P. O'Connor",
    ],
    "email": [
        V["ru_email_long"],
        V["ru_email"],
        "client.notifications@example.test",
        "client@example.test",
    ],
    "position": [
        V["ru_position_long"],
        "Заместитель генерального директора",
        V["ru_position_normal"],
        "Директор",
    ],
    "basis": [
        V["ru_authority_basis_very_long"],
        "Доверенности № 78 АГ 4412596 от 14.03.2026",
        V["ru_authority_basis_long"],
        V["ru_authority_basis_normal"],
    ],
    "bank": [
        V["ru_bank_name_long"],
        "АО «Северо-Западный инвестиционный банк»",
        "АО «Северный банк»",
        "АО «СЗБ»",
    ],
    "instruments": [
        V["ru_qualification_instruments_long"],
        "Акции и облигации российских и иностранных эмитентов",
        "Акции и облигации российских эмитентов",
        "Акции",
    ],
    "payment_purpose": [
        V["payment_purpose_long"],
        "Перевод по договору № БД-2026/000417-СПБ от 14.03.2026",
        "Перевод по брокерскому договору",
        "Перевод",
    ],
    "tariff": [
        "Стандартный фондовый",
        "Стандартный",
        "Базовый",
    ],
    "date_words": [
        "четырнадцатое марта две тысячи двадцать шестого года",
        "четырнадцатое марта 2026 года",
        "14 марта 2026 г.",
    ],
    "freetext": [
        V["ru_other_info_long"],
        "Сведения предоставляются по запросу в порядке, установленном Регламентом",
        "Сведения предоставляются по запросу",
        "Не применимо",
    ],
    "identifier": [
        V["agreement_number"],
        "БД-2026/000417",
        "БД-000417",
    ],
    "amount_words": [
        "Один миллион двести пятьдесят тысяч рублей 00 копеек",
        "Один миллион 250 000 рублей 00 копеек",
        "1 250 000 (один миллион 250 000) руб.",
        "1 250 000,00 руб.",
    ],
    "swift": [
        "NCMBGB2LXXX, Northern Continental Merchant Bank",
        "NCMBGB2LXXX",
        V["bank_bic"],
    ],
    "bank_other": [
        V["payment_purpose_long"],
        "Перевод по договору № БД-2026/000417-СПБ",
        "Перевод по договору",
        "Не применимо",
    ],
    "order_condition": [
        "При достижении цены 250,00 руб. за одну ценную бумагу",
        "При цене не выше 250,00 руб.",
        "При цене 250,00",
    ],
    "trade_kind_other": [
        "Сделка репо с центральным контрагентом",
        "Сделка репо с ЦК",
        "Сделка репо",
        "Репо",
    ],
    "funds_other": [
        "Доход от предпринимательской деятельности и инвестиционных операций",
        "Доход от предпринимательской деятельности",
        "Инвестиционный доход",
    ],
}


# Each ladder must shorten monotonically, or a repair round can hand back a
# longer value than the one it just rejected and the loop never converges.
for _name, _rungs in LADDERS.items():
    LADDERS[_name] = sorted(dict.fromkeys(_rungs), key=len, reverse=True)


def category_for(source: str, english: bool) -> str | None:
    """Which ladder a production source path belongs to.

    The ordering mirrors the production fixture engine's own `defaultValue`
    dispatch, for the same reason: a «basis» key also matches «authority», and
    only the first of those two is right.
    """
    if not source:
        return None
    key = source.split(".", 1)[-1]

    # The narrow, unmistakable keys first: several of them also match the
    # broad «other information» and «authority» rules further down, and only
    # the specific one gives a value that still means what the slot asks for.
    if re.search(r"date-?words", key, re.I):
        return "date_words"
    if re.search(r"amount-?words|summa-?propisyu", key, re.I):
        return "amount_words"
    if re.search(r"swift|corr-?swift", key, re.I):
        return "swift"
    if re.search(r"bank-?other", key, re.I):
        return "bank_other"
    if re.search(r"order-?kind-?conditional|conditional", key, re.I):
        return "order_condition"
    if re.search(r"trade-?kind-?other", key, re.I):
        return "trade_kind_other"
    if re.search(r"funds-?other|source-?of-?funds", key, re.I):
        return "funds_other"
    if re.search(r"tariff", key, re.I):
        return "tariff"
    if re.search(r"email", key, re.I):
        return "email"
    if re.search(r"payment-?purpose|purpose-?of-?payment|naznachenie", key, re.I):
        return "payment_purpose"
    if re.search(r"instruments|qualification-?scope", key, re.I):
        return "instruments"
    if re.search(r"authority-?basis|rep(resentative)?-?authority|\bbasis\b", key, re.I):
        return "basis"
    if re.search(r"bank-?name|credit-?organisation|counterparty|broker", key, re.I):
        return "bank"
    if re.search(r"position|dolzhnost|job-?title|role", key, re.I):
        return "position"
    if re.search(r"authority|issued-?by|issuer|registration-?authority", key, re.I):
        return "en_authority" if english else "ru_authority"
    if re.search(r"address|place-?of-?registration", key, re.I):
        return "en_address" if english else "ru_address"
    if re.search(r"legal-?name|company|organisation|organization|foreign-?name|"
                 r"english-?name|short-?name", key, re.I):
        return "en_company" if english else "ru_company"
    if re.search(r"full-?name|fio|client-?name|rep-?full-?name|signer|"
                 r"signature|beneficiar|owner|recipient", key, re.I):
        return "en_person" if english else "ru_person"
    if re.search(r"other-?info|information|details|structure|activities|"
                 r"description|comment|purpose|goal|reputation|docs", key, re.I):
        return "freetext"
    if re.search(r"contract|agreement|portfolio|account", key, re.I):
        return "identifier"
    return None


# ── Classifying a substitution ───────────────────────────────────────────────
#
# A substitution is only acceptable evidence if it is *explained*. These are
# the categories the review asks for; every one is decided from what the engine
# reported about the slot, never from a guess.

CATEGORY_FIXTURE_TOO_LONG = "1-fixture-unrealistically-long"
CATEGORY_DUPLICATE_COVERAGE = "2-duplicate-coverage-shorter-still-realistic"
CATEGORY_EXACT_IDENTIFIER = "3-exact-fixed-width-identifier"
CATEGORY_MISSING_WRAPPING = "4-missing-wrapping-configuration"
CATEGORY_MISSING_CONTINUATION = "5-missing-continuation-region"
CATEGORY_MISSING_ANCHOR = "6-missing-dynamic-expansion-anchor"
CATEGORY_BROKEN_GEOMETRY = "7-broken-preflight-render-geometry"
CATEGORY_PHYSICAL = "8-genuine-physical-limitation"
CATEGORY_OTHER_DEFECT = "9-other-production-defect"

# A continuation line at the 9 pt readability floor needs roughly a line
# height of blank paper under the slot. Below that there is nowhere to put
# it, however the map is configured.
MIN_CONTINUATION_ROOM = 11.0

# Slots that hold one exact token and must never be wrapped or shortened.
EXACT_TOKEN = re.compile(
    r"inn|kpp|ogrn|snils|\bbik\b|\bbic\b|okpo|okved|okato|oktmo|"
    r"account|portfolio|passport.*(series|number)|contract-number|"
    r"registration-number|swift", re.I)

# Slots whose value is prose the form gives a fixed cell to.
FREE_TEXT = re.compile(
    r"other-?info|information|details|description|comment|purpose|goal|"
    r"reputation|docs|structure|activities|note", re.I)


def classify(source: str, refused: str, used: str, diagnostics: dict) -> dict:
    """Why this realistic-long value did not fit, in the review's terms.

    `diagnostics` is the engine's own overflow entry for the slot: its reason,
    the line capacity it had, how many regions it could flow through and
    whether the field declares an expansion anchor.
    """
    key = (source or "").split(".", 1)[-1]
    reason = (diagnostics or {}).get("reason") or ""
    regions = (diagnostics or {}).get("regionCount")
    capacity = (diagnostics or {}).get("lineCapacity")
    has_anchor = bool((diagnostics or {}).get("hasExpansion"))
    has_flow = bool((diagnostics or {}).get("hasFlowRegions"))
    refused_length = len(refused or "")
    used_length = len(used or "")

    if reason == "straddle" or "insertion band" in ((diagnostics or {}).get("message") or ""):
        return {"category": CATEGORY_BROKEN_GEOMETRY,
                "why": "the anchor's insertion point does not sit on a "
                       "complete-operator boundary"}

    if EXACT_TOKEN.search(key):
        return {"category": CATEGORY_EXACT_IDENTIFIER,
                "why": "the slot holds one exact identifier, which is printed "
                       "whole or not at all"}

    if reason == "unbreakable-token":
        return {"category": CATEGORY_PHYSICAL,
                "why": "the value contains a token with no legal break point "
                       "and is wider than the printed slot"}

    # A one-line slot is only a *configuration* gap if the paper actually has
    # somewhere to wrap to. `below` is the measured blank height under the slot
    # in the authoritative PDF; without it this cannot be decided, and guessing
    # would turn every printed one-line rule into a reported production defect.
    below = (diagnostics or {}).get("roomBelow")
    if capacity == 1 and not has_flow and not has_anchor:
        if below is None:
            return {"category": CATEGORY_PHYSICAL,
                    "why": "a one-line printed slot with printed content "
                           "immediately below it — nowhere to continue"}
        if below < MIN_CONTINUATION_ROOM:
            return {"category": CATEGORY_PHYSICAL,
                    "why": f"a one-line printed slot with only {below:.2f} pt "
                           f"free below it; a 9 pt continuation line needs "
                           f"{MIN_CONTINUATION_ROOM:.0f} pt"}
        if FREE_TEXT.search(key):
            return {"category": CATEGORY_MISSING_CONTINUATION,
                    "why": f"a free-text slot with one line and {below:.2f} pt "
                           "of measured blank space below it, but no "
                           "continuation region configured"}
        return {"category": CATEGORY_MISSING_WRAPPING,
                "why": f"a one-line slot with {below:.2f} pt of measured blank "
                       "space below it, but neither wrapping nor a "
                       "continuation region configured"}

    if has_flow and not has_anchor and (capacity or 0) >= 2:
        return {"category": CATEGORY_MISSING_ANCHOR,
                "why": "the slot flows through its configured regions and "
                       "still needs a row it has no anchor to ask for"}

    # The value was simply longer than anything a manager would type.
    if refused_length >= 150 and used_length >= 60:
        return {"category": CATEGORY_FIXTURE_TOO_LONG,
                "why": f"the test value was {refused_length} characters; the "
                       f"one used ({used_length}) is still realistic"}

    if used_length >= 40:
        return {"category": CATEGORY_DUPLICATE_COVERAGE,
                "why": f"the shorter value ({used_length} characters) covers "
                       "the same layout question"}

    return {"category": CATEGORY_PHYSICAL,
            "why": f"the printed slot holds about {used_length} characters at "
                   "the 9 pt floor"}


def step_down(source: str, current, english: bool):
    """The next shorter plausible value for this source, or None if exhausted."""
    name = category_for(source, english)
    if not name:
        return None
    rungs = LADDERS[name]
    text = str(current or "")
    for index, rung in enumerate(rungs):
        if rung == text:
            return rungs[index + 1] if index + 1 < len(rungs) else None
    # The value did not come from this ladder (a production default, say):
    # start at the first rung that is genuinely shorter than what overflowed.
    for rung in rungs:
        if len(rung) < len(text):
            return rung
    return rungs[-1] if rungs and len(rungs[-1]) < len(text) else None
