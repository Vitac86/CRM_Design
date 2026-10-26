"""The scenario matrix: what gets generated, for which document and profile.

Two kinds of entry:

* `CASES` — an explicit case. A document, a master profile, a scenario name and
  any per-case production overrides (document type, variant, checkbox branch).

* `LADDERS` — a cumulative ladder of ever-longer but still plausible values for
  one Word-flow block, one table-cell anchor or one cross-page rule. The
  generator *measures* every rung through the production preflight and then
  picks the rungs that actually produced the required scenarios:

    no expansion · one added line · maximum reviewed ·
    cross-page inactive · smallest cross-page activation · maximum reviewed

  Nothing about a rung is asserted in advance. Whatever the engine reports is
  what the manifest records, and a rung the engine refuses is recorded as a
  known limit rather than silently dropped.

Every key below is a real production identifier — a wizard key, a field source
or a checkbox key taken from the committed maps and the document catalog.
"""

from __future__ import annotations

from smoke_profiles import VALUES as V

FL_RU_N = "smoke-fl-ru-normal"
FL_RU_L = "smoke-fl-ru-long"
FL_EN_L = "smoke-fl-en-long"
UL_RU_N = "smoke-yul-ru-normal"
UL_RU_L = "smoke-yul-ru-long"
UL_EN_L = "smoke-yul-en-long"
OPTIONAL = "smoke-optional-empty"
BRANCHES = "smoke-max-branches"
BRANCHES_UL = "smoke-max-branches-company"
EXACT = "smoke-exact-identifiers"
STRESS = "smoke-stress-unbroken"


def case(doc, profile, scenario, folder, variant="", priority=False,
         overrides=None, notes=""):
    return {
        "doc": doc, "profile": profile, "scenario": scenario, "folder": folder,
        "variant": variant, "priority": priority,
        "overrides": overrides or {}, "notes": notes,
    }


# ── Shared per-document override blocks ──────────────────────────────────────

POA_UL_LONG = {
    "extra.extra-poa-date-words": "четырнадцатое марта две тысячи двадцать шестого года",
    "extra.extra-poa-city": "Санкт-Петербург",
    "extra.extra-attorney-name": V["ru_attorney_name_long"],
    "extra.extra-attorney-citizenship": V["ru_citizenship"],
    "extra.extra-attorney-passport": V["passport_series_number"],
    "extra.extra-attorney-issued-by": V["ru_passport_authority_long"],
    "extra.extra-attorney-address": V["ru_address_normal"],
}

POA_FL_LONG = {
    "extra.extra-poa-date-words": "четырнадцатое марта две тысячи двадцать шестого года",
    "extra.extra-attorney-name": V["ru_attorney_name_long"],
    "extra.extra-attorney-citizenship": V["ru_citizenship"],
    "extra.extra-attorney-passport-series": V["passport_series"],
    "extra.extra-attorney-passport-number": V["passport_number"],
    "extra.extra-attorney-issued-by": V["ru_passport_authority_normal"],
    "extra.extra-attorney-address": V["ru_address_normal"],
}

ACCESSION_COMMON = {
    "extra.extra-depository-contract": "ДЕПО-2026/000417-СПБ",
    "extra.extra-depository-contract-date": "2026-08-02",
    "extra.report-delivery": "email",
    "extra.depo-account-type": "owner",
    "extra.trading-depo-account-type": "nominee",
    "extra.income-payout": "broker-account",
    "extra.tariff-stock": "Стандартный фондовый",
    "extra.tariff-derivatives": "Стандартный срочный",
    "extra.tariff-currency": "Стандартный валютный",
    "check.accession-brokerage": True,
    "check.accession-depository": True,
    "check.market-stock": True,
}

ACCOUNT_NOTICE = {
    "extra.extra-authorized-signer": V["ru_signatory_name_long"],
    "extra.extra-brokerage-contract": V["agreement_number"],
    "extra.extra-depository-contract": "ДЕПО-2026/000417-СПБ",
    "extra.extra-depository-contract-date": "2026-08-02",
    "extra.extra-stock-market-account": V["bank_account"],
    "extra.extra-futures-market-account": "40817810099910004313",
    "extra.extra-currency-market-account": "40817810099910004314",
    "extra.extra-depo-account": "МС0000417000",
}

ORDER_TRADE = {
    "extra.extra-order-type": "trade",
    "extra.extra-submission-kind": "primary",
    "extra.extra-contract-number-date": V["agreement_number"] + " от 14.03.2026",
    "extra.extra-brokerage-account": V["bank_account"],
    "extra.extra-trade-kind": "buy",
    "extra.extra-order-market": "stock",
    "extra.extra-order-kind": "limit",
    "extra.extra-security-issuer": V["ru_security_issuer_long"],
    "extra.extra-security-type": "Обыкновенные именные бездокументарные акции",
    "extra.extra-security-quantity": "1 500",
    "extra.extra-security-price": "248,75",
    "extra.extra-trade-amount": "373 125,00",
    "extra.extra-counterparty": V["ru_bank_name_long"],
    "extra.extra-order-validity": "до конца торгового дня",
    "extra.extra-settlement-period": "Т+2",
}

ORDER_TRANSFER = {
    "extra.extra-order-type": "transfer",
    "extra.extra-submission-kind": "primary",
    "extra.extra-contract-number-date": V["agreement_number"] + " от 14.03.2026",
    "extra.extra-brokerage-account": V["bank_account"],
    "extra.extra-move-from": "stock",
    "extra.extra-move-to": "derivatives",
    "extra.extra-move-amount": "1 250 000,00",
    "extra.extra-move-amount-words": (
        "Один миллион двести пятьдесят тысяч рублей 00 копеек"
    ),
    "extra.extra-move-currency": "RUB",
}

ORDER_WITHDRAWAL = {
    "extra.extra-order-type": "withdrawal",
    "extra.extra-submission-kind": "primary",
    "extra.extra-contract-number-date": V["agreement_number"] + " от 14.03.2026",
    "extra.extra-brokerage-account": V["bank_account"],
    "extra.extra-payout-currency": "RUB",
    "extra.extra-payout-amount-mode": "amount",
    "extra.extra-payout-amount": "980 400,00",
    "extra.extra-payout-amount-words": (
        "Девятьсот восемьдесят тысяч четыреста рублей 00 копеек"
    ),
    "extra.extra-payout-from": "stock",
    "extra.extra-bank-recipient": V["ru_name_long"],
    "extra.extra-bank-name": V["ru_bank_name_long"],
    "extra.extra-bank-bic": V["bank_bic"],
    "extra.extra-bank-account": V["bank_account"],
    "extra.extra-bank-corr-account": V["bank_corr_account"],
    "extra.extra-bank-inn": V["inn_ul"],
    "extra.extra-bank-other": V["payment_purpose_long"],
}

QUAL_REQUEST_FL = {
    "extra.extra-qualification-scope": "other",
    "extra.extra-qualification-instruments-other": V["ru_qualification_instruments_long"],
    "extra.extra-delivery-method": "address",
    "extra.extra-delivery-address": V["ru_address_long"],
    "extra.extra-securities-value-millions": "9 999",
    "extra.extra-supporting-docs-securities-holdings": V["ru_supporting_docs_long"],
    "check.qualification-assets-securities": True,
}

QUAL_REQUEST_YUL = {
    "extra.extra-delivery-method": "address",
    "extra.extra-delivery-address": V["ru_address_legal_long"],
    "extra.extra-supporting-docs-1": V["ru_supporting_docs_long"],
    "extra.extra-supporting-docs-2": "Устав в действующей редакции",
}


# ─────────────────────────────────────────────────────────────────────────────
# Explicit cases
# ─────────────────────────────────────────────────────────────────────────────

CASES = [
    # ── Power of attorney — legal entity (priority) ─────────────────────────
    case("power-of-attorney", UL_RU_N, "normal", "power-of-attorney",
         "company", True,
         {"extra.extra-poa-date-words":
          "четырнадцатое марта две тысячи двадцать шестого года",
          "extra.extra-poa-city": "Москва",
          "extra.extra-attorney-name": V["ru_name_normal"],
          "extra.extra-attorney-citizenship": V["ru_citizenship"],
          "extra.extra-attorney-passport": V["passport_series_number"],
          "extra.extra-attorney-issued-by": V["ru_passport_authority_normal"],
          "extra.extra-attorney-address": V["ru_address_normal"]},
         "Company baseline — compare every long company case against this."),
    case("power-of-attorney", UL_RU_L, "long-company-name", "power-of-attorney",
         "company", True, POA_UL_LONG,
         "Long legal name, long signatory, long authority basis."),
    case("power-of-attorney", UL_EN_L, "foreign-company", "power-of-attorney",
         "company", True,
         dict(POA_UL_LONG, **{
             "extra.extra-attorney-name": V["en_attorney_name_long"],
             "extra.extra-attorney-citizenship": V["en_citizenship_long"],
             "extra.extra-attorney-issued-by": V["en_passport_authority_long"],
             "extra.extra-attorney-address": V["en_address_normal"]}),
         "Foreign company principal with a foreign attorney."),
    case("power-of-attorney", EXACT, "exact-identifiers", "power-of-attorney",
         "company", True,
         {"extra.extra-poa-date-words":
          "четырнадцатое марта две тысячи двадцать шестого года",
          "extra.extra-poa-city": "Санкт-Петербург",
          "extra.extra-attorney-name": V["ru_name_normal"],
          "extra.extra-attorney-citizenship": V["ru_citizenship"],
          "extra.extra-attorney-passport": V["passport_series_number"],
          "extra.extra-attorney-issued-by": V["ru_passport_authority_normal"],
          "extra.extra-attorney-address": V["ru_address_normal"]},
         "ОГРН and ИНН must stay unbroken on their own underline."),

    # ── Power of attorney — individual (priority) ───────────────────────────
    case("power-of-attorney", FL_RU_N, "normal", "power-of-attorney",
         "individual", True,
         {"extra.extra-poa-date-words":
          "четырнадцатое марта две тысячи двадцать шестого года",
          "extra.extra-attorney-name": V["ru_name_normal"],
          "extra.extra-attorney-citizenship": V["ru_citizenship"],
          "extra.extra-attorney-passport-series": V["passport_series"],
          "extra.extra-attorney-passport-number": V["passport_number"],
          "extra.extra-attorney-issued-by": V["ru_passport_authority_normal"],
          "extra.extra-attorney-address": V["ru_address_normal"]},
         "Individual baseline."),
    case("power-of-attorney", FL_RU_L, "long-principal-and-attorney",
         "power-of-attorney", "individual", True, POA_FL_LONG,
         "Long principal data, long attorney data, long issuing authority."),
    case("power-of-attorney", FL_EN_L, "foreign-individual", "power-of-attorney",
         "individual", True,
         dict(POA_FL_LONG, **{
             "extra.extra-attorney-name": V["en_attorney_name_long"],
             "extra.extra-attorney-citizenship": V["en_citizenship_long"],
             "extra.extra-attorney-passport-series": V["en_passport_series"],
             "extra.extra-attorney-passport-number": V["en_passport_number"],
             "extra.extra-attorney-issued-by": V["en_passport_authority_long"],
             "extra.extra-attorney-address": V["en_address_normal"]}),
         "Foreign individual principal and foreign attorney."),

    # ── Legal-entity accession application (priority) ───────────────────────
    case("accession-application-yul", UL_RU_N, "normal", "accession",
         "company", True, ACCESSION_COMMON, "Normal Russian company."),
    case("accession-application-yul", UL_RU_L, "long-ru-company", "accession",
         "company", True, ACCESSION_COMMON,
         "Long Russian company name, long address, long signatory."),
    case("accession-application-yul", UL_EN_L, "long-foreign-company",
         "accession", "company", True, ACCESSION_COMMON,
         "Long foreign company name and long foreign address."),
    case("accession-application-yul", UL_RU_L, "delivery-post", "accession",
         "company", False, dict(ACCESSION_COMMON, **{
             "extra.report-delivery": "post"}),
         "Variant: reports by registered post."),
    case("accession-application-yul", UL_RU_L, "delivery-edo", "accession",
         "company", False, dict(ACCESSION_COMMON, **{
             "extra.report-delivery": "edo"}),
         "Variant: reports over the EDO system."),
    case("accession-application-yul", UL_RU_L, "delivery-office", "accession",
         "company", False, dict(ACCESSION_COMMON, **{
             "extra.report-delivery": "office"}),
         "Variant: reports collected at the office."),
    case("accession-application-yul", BRANCHES_UL, "max-branches", "accession",
         "company", False, {}, "Every checkbox branch selected at once."),

    # ── Individual accession application (priority) ─────────────────────────
    case("accession-application-fl", FL_RU_N, "normal", "accession",
         "individual", True, ACCESSION_COMMON, "Normal Russian individual."),
    case("accession-application-fl", FL_RU_L, "long-individual", "accession",
         "individual", True, ACCESSION_COMMON,
         "Long full name, long passport authority, long registration address."),
    case("accession-application-fl", FL_EN_L, "foreign-individual", "accession",
         "individual", True, ACCESSION_COMMON, "Foreign individual."),
    case("accession-application-fl", FL_RU_L, "delivery-post", "accession",
         "individual", False, dict(ACCESSION_COMMON, **{
             "extra.report-delivery": "post"}), "Variant: registered post."),
    case("accession-application-fl", FL_RU_L, "delivery-edo", "accession",
         "individual", False, dict(ACCESSION_COMMON, **{
             "extra.report-delivery": "edo"}), "Variant: EDO."),
    case("accession-application-fl", BRANCHES, "max-branches", "accession",
         "individual", False, {}, "Every checkbox branch selected."),

    # The identity block's continuation row works, so every variant is covered
    # at full realistic-long identity length. These used to be carried at a
    # shortened identity because the block could not add a row at all; that
    # workaround is gone with the anchor it was working around.
    case("accession-application-fl", FL_RU_L, "delivery-office", "accession",
         "individual", False,
         dict(ACCESSION_COMMON, **{"extra.report-delivery": "office"}),
         "Variant: reports collected at the office."),

    # ── Questionnaires ──────────────────────────────────────────────────────
    case("anketa-fl", FL_RU_N, "normal", "individual", "individual", True, {},
         "Normal individual questionnaire."),
    case("anketa-fl", FL_RU_L, "long-values", "individual", "individual", True,
         {"extra.extra-questionnaire-role": "client",
          "extra.extra-questionnaire-mode": "first",
          "extra.extra-tax-residency": "rf",
          "extra.representative-name": V["ru_rep_name_long"],
          "extra.representative-authority-details": V["ru_authority_basis_very_long"]},
         "Long name, address, birthplace, issuing authority, representative."),
    case("anketa-fl", FL_EN_L, "foreign-individual", "individual", "individual",
         True, {"extra.extra-tax-residency": "other",
                "extra.tax-residency-countries": V["en_citizenship_long"],
                "extra.extra-foreign-taxpayer": "yes"},
         "Foreign individual, foreign tax residency branch."),
    case("anketa-fl", FL_RU_L, "role-representative", "individual",
         "individual", False,
         {"extra.extra-questionnaire-role": "representative"},
         "Variant: questionnaire filled by a representative."),
    case("anketa-fl", FL_RU_L, "role-beneficial-owner", "individual",
         "individual", False,
         {"extra.extra-questionnaire-role": "beneficial-owner"},
         "Variant: beneficial owner."),
    case("anketa-fl", BRANCHES, "max-branches", "individual", "individual",
         False, {}, "Every ПДЛ and FATCA branch selected."),
    case("anketa-fl", OPTIONAL, "optional-empty", "individual", "individual",
         False, {}, "Optional values absent."),

    case("anketa-yul", UL_RU_N, "normal", "company", "company", True, {},
         "Normal company questionnaire."),
    case("anketa-yul", UL_RU_L, "long-values", "company", "company", True,
         {"extra.extra-licensed-activity": "yes",
          "extra.licence-number": "045-14785-100000",
          "extra.licence-authority": V["ru_licence_authority_long"],
          "extra.licensed-activities": "Брокерская и депозитарная деятельность"},
         "Long legal name, long addresses, long licence authority."),
    case("anketa-yul", UL_EN_L, "foreign-company", "company", "company", True,
         {"extra.extra-tax-residency": "other",
          "extra.tax-residency-countries": V["en_citizenship_long"],
          "extra.extra-foreign-taxpayer": "yes"},
         "Foreign company, nonresident representation branch."),
    case("anketa-yul", BRANCHES_UL, "max-branches", "company", "company", False,
         {}, "Every reputation, funds and FATCA branch selected."),
    case("anketa-yul", OPTIONAL, "optional-empty", "company", "company", False,
         {}, "Optional values absent."),

    case("anketa-ip-sz", FL_RU_L, "entrepreneur", "individual", "individual",
         True, {"extra.extra-ipsz-status": "entrepreneur",
                "extra.extra-ogrnip": "317784700123456",
                "extra.extra-ip-registration-authority":
                    V["ru_registration_authority_long"],
                "extra.extra-ip-registration-place": V["ru_address_long"],
                "extra.extra-licensing": "yes",
                "extra.extra-licence-authority": V["ru_licence_authority_long"]},
         "Variant: individual entrepreneur, licensed."),
    case("anketa-ip-sz", FL_RU_L, "private-practice", "individual",
         "individual", True,
         {"extra.extra-ipsz-status": "private-practice",
          "extra.extra-practice-document":
              "Приказ о наделении полномочиями нотариуса",
          "extra.extra-practice-document-authority":
              V["ru_registration_authority_long"],
          "extra.extra-licensing": "none"},
         "Variant: person in private practice."),
    case("anketa-ip-sz", FL_EN_L, "foreign-citizenship", "individual",
         "individual", False,
         {"extra.extra-ipsz-status": "entrepreneur",
          "extra.extra-citizenship-kind": "other",
          "extra.extra-citizenship-countries": V["en_citizenship_long"],
          "extra.extra-tax-residency": "other"},
         "Variant: foreign citizenship and residence permit branch."),
    case("anketa-ip-sz", FL_RU_N, "normal", "individual", "individual", False,
         {"extra.extra-ipsz-status": "entrepreneur"}, "Normal baseline."),

    case("anketa-fl-simplified-id", FL_RU_N, "normal", "individual",
         "individual", True, {"extra.extra-pdl-status": "none"},
         "Normal simplified identification."),
    case("anketa-fl-simplified-id", FL_RU_L, "long-values", "individual",
         "individual", True,
         {"extra.extra-pdl-status": "russian",
          "extra.extra-pdl-details":
              "Депутат законодательного собрания субъекта Российской Федерации"},
         "Long name, address and issuing authority."),
    case("anketa-fl-simplified-id", FL_RU_L, "pdl-foreign", "individual",
         "individual", False,
         {"extra.extra-pdl-status": "foreign",
          "extra.extra-pdl-details":
              "Должностное лицо органа исполнительной власти иностранного государства"},
         "Variant: foreign public official."),
    case("anketa-fl-simplified-id", FL_RU_L, "pdl-international", "individual",
         "individual", False,
         {"extra.extra-pdl-status": "international",
          "extra.extra-pdl-details":
              "Должностное лицо публичной международной организации"},
         "Variant: international organisation official."),

    # ── Account-opening notice ──────────────────────────────────────────────
    case("account-opening-notice", UL_RU_N, "normal", "other-documents",
         "company", False, ACCOUNT_NOTICE, "Normal company."),
    case("account-opening-notice", UL_RU_L, "long-company", "other-documents",
         "company", True, ACCOUNT_NOTICE,
         "Long company name and long agreement/account values."),
    case("account-opening-notice", FL_RU_L, "long-individual",
         "other-documents", "individual", True, ACCOUNT_NOTICE,
         "Long individual name and long account values."),
    case("account-opening-notice", EXACT, "exact-identifiers",
         "other-documents", "company", False, ACCOUNT_NOTICE,
         "Account and agreement numbers must stay unbroken."),

    # ── Client notifications (cross-page rule) ──────────────────────────────
    case("client-notifications", FL_RU_N, "normal", "other-documents",
         "individual", False, {}, "Normal individual."),
    case("client-notifications", UL_RU_L, "long-company", "other-documents",
         "company", True, {}, "Long company identity block on page 9."),

    # ── Code word ───────────────────────────────────────────────────────────
    case("code-word-request", FL_RU_N, "normal", "other-documents",
         "individual", False, {"extra.extra-new-code-word": "Навигация"},
         "Normal individual."),
    case("code-word-request", UL_RU_L, "long-company", "other-documents",
         "company", True, {"extra.extra-new-code-word": V["ru_code_word_long"]},
         "Long company name in the introduction block."),
    case("code-word-request", FL_RU_L, "long-individual", "other-documents",
         "individual", False,
         {"extra.extra-new-code-word": V["ru_code_word_long"]},
         "Long individual name in the introduction block."),

    # ── Order forms — every order type ──────────────────────────────────────
    case("order-forms", UL_RU_L, "trade", "other-documents", "company", True,
         ORDER_TRADE, "Order type: trade."),
    case("order-forms", UL_RU_L, "transfer-between-venues", "other-documents",
         "company", True, ORDER_TRANSFER,
         "Order type: transfer between trading venues."),
    case("order-forms", UL_RU_L, "withdrawal-to-bank", "other-documents",
         "company", True, ORDER_WITHDRAWAL,
         "Order type: withdrawal to a bank account."),
    case("order-forms", FL_RU_L, "trade-individual", "other-documents",
         "individual", False, ORDER_TRADE, "Trade order for an individual."),
    case("order-forms", FL_RU_L, "trade-conditional", "other-documents",
         "individual", False,
         dict(ORDER_TRADE, **{
             "extra.extra-order-kind": "conditional",
             "extra.extra-order-kind-conditional":
                 "При достижении цены 250,00 руб. за одну ценную бумагу"}),
         "Variant: conditional order."),
    case("order-forms", FL_RU_L, "trade-other-kind", "other-documents",
         "individual", False,
         dict(ORDER_TRADE, **{
             "extra.extra-trade-kind": "other",
             "extra.extra-trade-kind-other":
                 "Сделка репо с центральным контрагентом"}),
         "Variant: other trade kind."),
    case("order-forms", UL_RU_L, "withdrawal-whole-balance", "other-documents",
         "company", False,
         dict(ORDER_WITHDRAWAL, **{
             "extra.extra-payout-amount-mode": "whole"}),
         "Variant: withdrawal of the whole free balance."),
    case("order-forms", UL_RU_L, "cancellation", "other-documents", "company",
         False, dict(ORDER_TRADE, **{
             "extra.extra-submission-kind": "cancellation",
             "extra.extra-order-number-date": "№ 000417 от 14.03.2026"}),
         "Variant: cancellation of a previously submitted order."),

    # ── Qualification documents ─────────────────────────────────────────────
    case("qualification-request-fl", FL_RU_N, "normal", "individual",
         "individual", False,
         {"extra.extra-qualification-scope": "all",
          "extra.extra-delivery-method": "office"}, "Normal individual."),
    case("qualification-request-fl", FL_RU_L, "long-values", "individual",
         "individual", True, QUAL_REQUEST_FL,
         "Long name, long instrument list, long delivery address."),
    case("qualification-request-fl", FL_RU_L, "delivery-office", "individual",
         "individual", False,
         {"extra.extra-qualification-scope": "all",
          "extra.extra-delivery-method": "office"},
         "Variant: collected at the office — delivery block hidden."),
    case("qualification-request-fl", BRANCHES, "max-branches", "individual",
         "individual", False,
         {"extra.extra-delivery-method": "address",
          "extra.extra-delivery-address": V["ru_address_long"]},
         "Every asset checkbox selected."),

    case("qualification-request-yul", UL_RU_N, "normal", "company", "company",
         False, {"extra.extra-delivery-method": "office"}, "Normal company."),
    case("qualification-request-yul", UL_RU_L, "long-values", "company",
         "company", True, QUAL_REQUEST_YUL,
         "Long company name, long signatory, long delivery address."),
    case("qualification-request-yul", UL_EN_L, "foreign-company", "company",
         "company", False, QUAL_REQUEST_YUL, "Foreign company."),
    case("qualification-request-yul", UL_RU_L, "delivery-office", "company",
         "company", False, {"extra.extra-delivery-method": "office"},
         "Variant: collected at the office."),

    case("qualification-notice", FL_RU_N, "normal-individual", "individual",
         "individual", False,
         {"extra.extra-qualification-scope": "all"}, "Normal individual."),
    case("qualification-notice", FL_RU_L, "long-individual", "individual",
         "individual", True,
         {"extra.extra-qualification-scope": "other",
          "extra.extra-qualification-instruments-other":
              V["ru_qualification_instruments_long"]},
         "Long individual name, long postal address, restricted scope."),
    case("qualification-notice", UL_RU_L, "long-company", "company", "company",
         True, {"extra.extra-qualification-scope": "other",
                "extra.extra-qualification-instruments-other":
                    V["ru_qualification_instruments_long"]},
         "Long company name and restricted scope."),
    case("qualification-notice", UL_RU_N, "normal-company", "company",
         "company", False, {"extra.extra-qualification-scope": "all"},
         "Normal company."),

    case("qualification-consequences-notice", FL_RU_N, "normal", "individual",
         "individual", False, {}, "Normal individual."),
    case("qualification-consequences-notice", FL_RU_L, "long-individual",
         "individual", "individual", True, {},
         "Long applicant name in the reviewed paragraph."),

    # ── Refusal notices and broker-use refusal ──────────────────────────────
    case("broker-use-refusal-request", FL_RU_N, "normal", "other-documents",
         "individual", False, {}, "Normal individual."),
    case("broker-use-refusal-request", UL_RU_L, "long-company",
         "other-documents", "company", False, {},
         "Long company name in the expanding table cell."),
    case("broker-use-refusal-request", FL_RU_L, "long-individual",
         "other-documents", "individual", False, {},
         "Long individual name in the expanding table cell."),

    case("regulation-full-refusal-notice", FL_RU_N, "normal",
         "other-documents", "individual", False,
         {"check.full-refusal-brokerage": True}, "Normal individual."),
    case("regulation-full-refusal-notice", UL_RU_L, "long-company",
         "other-documents", "company", False,
         {"check.full-refusal-brokerage": True,
          "check.full-refusal-depository": True},
         "Long company name, both services refused."),

    case("regulation-partial-refusal-notice", FL_RU_N, "normal",
         "other-documents", "individual", False,
         {"check.partial-refusal-stock": True,
          "extra.extra-stock-portfolio": "STOCK-000417"}, "Normal individual."),
    case("regulation-partial-refusal-notice", UL_RU_L, "long-company-all-markets",
         "other-documents", "company", False,
         {"check.partial-refusal-stock": True,
          "check.partial-refusal-derivatives": True,
          "check.partial-refusal-currency": True,
          "check.partial-refusal-quik": True,
          "check.partial-refusal-esignature": True,
          "extra.extra-stock-portfolio": "STOCK-000417",
          "extra.extra-derivatives-portfolio": "DERIV-000417",
          "extra.extra-currency-portfolio": "CURR-000417"},
         "Long company name with every market branch printed."),
]


# ─────────────────────────────────────────────────────────────────────────────
# Ladders — measured, never asserted
# ─────────────────────────────────────────────────────────────────────────────

def ladder(doc, profile, folder, variant, target, rungs, priority=False,
           base_overrides=None):
    return {
        "doc": doc, "profile": profile, "folder": folder, "variant": variant,
        "target": target, "rungs": rungs, "priority": priority,
        "base": base_overrides or {},
    }


LADDERS = [
    # Word-flow block + cross-page rule, ЮЛ доверенность (priority).
    ladder("power-of-attorney", UL_RU_L, "power-of-attorney", "company",
           "power-of-attorney-ul-intro", priority=True,
           base_overrides=dict(POA_UL_LONG, **{
               "extra.extra-attorney-issued-by": V["ru_passport_authority_long"]}),
           rungs=[
               ("attorney-address-short", {
                   "field.client-full-legal-name": V["ru_company_normal"],
                   "field.client-short-name": V["ru_company_normal"],
                   "extra.extra-attorney-name": V["ru_name_normal"],
                   "extra.extra-attorney-issued-by":
                       V["ru_passport_authority_normal"],
                   "extra.extra-attorney-address":
                       "190121, Санкт-Петербург, ул. Декабристов, д. 42, кв. 17"}),
               ("attorney-address-medium", {
                   "field.client-full-legal-name": V["ru_company_very_long"],
                   "field.client-short-name": V["ru_company_short_name"],
                   "extra.extra-attorney-name": V["ru_attorney_name_long"],
                   "extra.extra-attorney-issued-by":
                       V["ru_passport_authority_long"],
                   "extra.extra-attorney-address":
                       "190121, Санкт-Петербург, ул. Декабристов, д. 42, кв. 17"}),
               ("attorney-address-long", {
                   "extra.extra-attorney-address":
                       "190121, Россия, город Санкт-Петербург, улица "
                       "Декабристов, дом 42, квартира 17"}),
               ("attorney-address-district", {
                   "extra.extra-attorney-address":
                       "190121, Российская Федерация, город Санкт-Петербург, "
                       "Адмиралтейский район, улица Декабристов, дом 42, "
                       "квартира 17"}),
               ("attorney-address-embankment", {
                   "extra.extra-attorney-address":
                       "190121, Российская Федерация, город Санкт-Петербург, "
                       "Адмиралтейский район, набережная реки Мойки, дом 102, "
                       "корпус 3, квартира 217"}),
               ("attorney-address-full", {
                   "extra.extra-attorney-address": V["ru_address_long"]}),
           ]),

    # Word-flow block + cross-page rule, ФЛ доверенность (priority).
    ladder("power-of-attorney", FL_RU_L, "power-of-attorney", "individual",
           "power-of-attorney-fl-intro", priority=True,
           base_overrides=POA_FL_LONG,
           rungs=[
               ("principal-and-attorney-short", {
                   "field.clientFullName": V["ru_name_normal"],
                   "field.client-full-name": V["ru_name_normal"],
                   "field.client-registration-address": V["ru_address_normal"],
                   "field.client-passport-issued-by":
                       V["ru_passport_authority_normal"],
                   "extra.extra-attorney-name": V["ru_name_normal"],
                   "extra.extra-attorney-issued-by":
                       V["ru_passport_authority_normal"],
                   "extra.extra-attorney-address": V["ru_address_normal"]}),
               ("long-principal-name", {
                   "field.clientFullName": V["ru_name_long"],
                   "field.client-full-name": V["ru_name_long"]}),
               ("long-issuing-authority", {
                   "field.client-passport-issued-by":
                       V["ru_passport_authority_long"]}),
               ("long-attorney-name", {
                   "extra.extra-attorney-name": V["ru_attorney_name_long"]}),
               ("long-attorney-authority", {
                   "extra.extra-attorney-issued-by":
                       V["ru_passport_authority_long"]}),
               ("long-registration-address", {
                   "field.client-registration-address":
                       "190121, Российская Федерация, город Санкт-Петербург, "
                       "Адмиралтейский район, набережная реки Мойки, дом 102, "
                       "корпус 3, квартира 217"}),
           ]),

    # Word-flow block + cross-page rule, client notifications (priority).
    ladder("client-notifications", FL_RU_L, "other-documents", "individual",
           "client-notifications-identity", priority=True,
           rungs=[
               ("short-identity", {
                   "field.clientFullName": V["ru_name_normal"],
                   "field.client-full-name": V["ru_name_normal"],
                   "field.passportIssuedBy": V["ru_passport_authority_normal"],
                   "field.registrationAddress": V["ru_address_normal"]}),
               ("long-name", {
                   "field.clientFullName": V["ru_name_long"],
                   "field.client-full-name": V["ru_name_long"]}),
               ("long-issuing-authority", {
                   "field.passportIssuedBy": V["ru_passport_authority_long"]}),
               ("long-registration-address", {
                   "field.registrationAddress": V["ru_address_long"]}),
           ]),

    # Word-flow block, ЮЛ accession applicant block (priority).
    ladder("accession-application-yul", UL_RU_L, "accession", "company",
           "accession-application-yul-applicant", priority=True,
           base_overrides=ACCESSION_COMMON,
           rungs=[
               ("short-applicant", {
                   "field.client-full-legal-name": V["ru_company_normal"],
                   "field.client-short-name": V["ru_company_normal"],
                   "field.client-legal-address": V["ru_address_normal"],
                   "field.representativeFullName": V["ru_rep_name_normal"],
                   "field.representativeAuthority": V["ru_authority_basis_normal"]}),
               ("long-legal-name", {
                   "field.client-full-legal-name": V["ru_company_long"]}),
               ("very-long-legal-name", {
                   "field.client-full-legal-name": V["ru_company_very_long"]}),
               ("long-legal-address", {
                   "field.client-legal-address": V["ru_address_legal_long"]}),
               ("long-signatory-and-basis", {
                   "field.representativeFullName": V["ru_signatory_name_long"],
                   "field.representativeAuthority":
                       V["ru_authority_basis_very_long"]}),
           ]),

    # Word-flow block, ФЛ accession identity block (priority).
    #
    # This block's reviewed budget is one extra row, and its signature
    # transcript slot is 46 pt wide. Each rung therefore states the whole
    # identity explicitly rather than accumulating: two realistic-long values
    # at once need two rows, which is past what the source was reviewed for,
    # and that rung is recorded as a known limit instead of quietly shortening
    # everything before it.
    ladder("accession-application-fl", FL_RU_L, "accession", "individual",
           "accession-application-fl-identity", priority=True,
           base_overrides=ACCESSION_COMMON,
           rungs=[
               ("short-identity", {
                   "field.clientFullName": V["ru_name_normal"],
                   "field.client-full-name": V["ru_name_normal"],
                   "field.passportIssuedBy": V["ru_passport_authority_normal"],
                   "field.registrationAddress": V["ru_address_normal"]}),
               ("long-issuing-authority", {
                   "field.clientFullName": V["ru_name_normal"],
                   "field.client-full-name": V["ru_name_normal"],
                   "field.passportIssuedBy": V["ru_passport_authority_long"],
                   "field.registrationAddress": V["ru_address_normal"]}),
               ("long-registration-address", {
                   "field.clientFullName": V["ru_name_normal"],
                   "field.client-full-name": V["ru_name_normal"],
                   "field.passportIssuedBy": V["ru_passport_authority_normal"],
                   "field.registrationAddress": V["ru_address_long"]}),
               ("long-authority-and-address", {
                   "field.clientFullName": V["ru_name_normal"],
                   "field.client-full-name": V["ru_name_normal"],
                   "field.passportIssuedBy": V["ru_passport_authority_long"],
                   "field.registrationAddress": V["ru_address_long"]}),
           ]),

    # Table-cell anchor, анкета ФЛ — passport issuing authority.
    ladder("anketa-fl", FL_RU_L, "individual", "individual",
           "passportIssuedBy",
           rungs=[
               ("short-authority", {
                   "field.client-passport-issued-by":
                       "ОВМ УМВД России по г. Санкт-Петербургу"}),
               ("medium-authority", {
                   "field.client-passport-issued-by":
                       V["ru_passport_authority_normal"]}),
               ("long-authority", {
                   "field.client-passport-issued-by":
                       V["ru_passport_authority_long"]}),
           ]),

    # Table-cell anchor, анкета ФЛ — bank address.
    ladder("anketa-fl", FL_RU_L, "individual", "individual", "bankAddress",
           rungs=[
               ("short-bank-address", {
                   "extra.bank-address": "190121, Санкт-Петербург, ул. Декабристов, д. 42"}),
               ("long-bank-address", {"extra.bank-address": V["ru_address_long"]}),
               ("longest-bank-address", {
                   "extra.bank-address": V["ru_address_legal_long"]}),
           ]),

    # Table-cell anchor, анкета ЮЛ — licence authority.
    ladder("anketa-yul", UL_RU_L, "company", "company", "licenceAuthority",
           base_overrides={"extra.extra-licensed-activity": "yes",
                           "extra.licence-number": "045-14785-100000"},
           rungs=[
               ("short-authority", {"extra.licence-authority": "Банк России"}),
               ("long-authority", {
                   "extra.licence-authority": V["ru_licence_authority_long"]}),
           ]),

    # Table-cell anchor, анкета ЮЛ — bank address.
    ladder("anketa-yul", UL_RU_L, "company", "company", "bankAddress",
           rungs=[
               ("short-bank-address", {
                   "extra.bank-address": "190121, Санкт-Петербург, ул. Декабристов, д. 42"}),
               ("long-bank-address", {"extra.bank-address": V["ru_address_long"]}),
               ("longest-bank-address", {
                   "extra.bank-address": V["ru_address_legal_long"]}),
           ]),

    # Table-cell anchor, account-opening notice — client name.
    ladder("account-opening-notice", UL_RU_L, "other-documents", "company",
           "clientName", base_overrides=ACCOUNT_NOTICE,
           rungs=[
               ("short-name", {"field.client-full-name": V["ru_company_normal"]}),
               ("long-name", {"field.client-full-name": V["ru_company_long"]}),
               ("very-long-name", {
                   "field.client-full-name": V["ru_company_very_long"]}),
           ]),

    # Table-cell anchor, order forms — client name.
    ladder("order-forms", UL_RU_L, "other-documents", "company",
           "tradeClientName", base_overrides=ORDER_TRADE,
           rungs=[
               ("short-name", {"field.client-full-name": V["ru_company_normal"]}),
               ("long-name", {"field.client-full-name": V["ru_company_long"]}),
               ("very-long-name", {
                   "field.client-full-name": V["ru_company_very_long"]}),
           ]),

    # Table-cell anchor, broker-use refusal — client name.
    ladder("broker-use-refusal-request", UL_RU_L, "other-documents", "company",
           "clientName",
           rungs=[
               ("short-name", {"field.client-full-name": V["ru_company_normal"]}),
               ("long-name", {"field.client-full-name": V["ru_company_long"]}),
               ("very-long-name", {
                   "field.client-full-name": V["ru_company_very_long"]}),
           ]),

    # Table-cell anchor, full refusal notice — client name.
    ladder("regulation-full-refusal-notice", UL_RU_L, "other-documents",
           "company", "clientName",
           base_overrides={"check.full-refusal-brokerage": True},
           rungs=[
               ("short-name", {"field.client-full-name": V["ru_company_normal"]}),
               ("long-name", {"field.client-full-name": V["ru_company_long"]}),
               ("very-long-name", {
                   "field.client-full-name": V["ru_company_very_long"]}),
           ]),

    # Table-cell anchor, partial refusal notice — client name.
    ladder("regulation-partial-refusal-notice", UL_RU_L, "other-documents",
           "company", "clientName",
           base_overrides={"check.partial-refusal-stock": True,
                           "extra.extra-stock-portfolio": "STOCK-000417"},
           rungs=[
               ("short-name", {"field.client-full-name": V["ru_company_normal"]}),
               ("long-name", {"field.client-full-name": V["ru_company_long"]}),
               ("very-long-name", {
                   "field.client-full-name": V["ru_company_very_long"]}),
           ]),

    # Word-flow block, code word request.
    ladder("code-word-request", UL_RU_L, "other-documents", "company",
           "code-word-client-introduction",
           base_overrides={"extra.extra-new-code-word": V["ru_code_word_long"]},
           rungs=[
               ("short-name", {"subject.displayName": V["ru_company_normal"]}),
               ("long-name", {"subject.displayName": V["ru_company_long"]}),
               ("very-long-name", {"subject.displayName": V["ru_company_very_long"]}),
           ]),

    # Word-flow block, qualification consequences notice.
    ladder("qualification-consequences-notice", FL_RU_L, "individual",
           "individual", "qualification-consequences-applicant",
           rungs=[
               ("short-name", {
                   "field.clientFullName": V["ru_name_normal"],
                   "field.client-full-name": V["ru_name_normal"]}),
               ("long-name", {
                   "field.clientFullName": V["ru_name_long"],
                   "field.client-full-name": V["ru_name_long"]}),
               ("very-long-name", {
                   "field.clientFullName": V["ru_name_very_long"],
                   "field.client-full-name": V["ru_name_very_long"]}),
           ]),

    # Word-flow block, qualification notice recipient.
    ladder("qualification-notice", UL_RU_L, "company", "company",
           "qualification-notice-recipient",
           base_overrides={"extra.extra-qualification-scope": "all"},
           rungs=[
               ("short-recipient", {
                   "field.client-full-legal-name": V["ru_company_normal"],
                   "field.client-postal-address": V["ru_address_normal"]}),
               ("long-recipient", {
                   "field.client-full-legal-name": V["ru_company_long"]}),
               ("long-recipient-and-address", {
                   "field.client-full-legal-name": V["ru_company_very_long"],
                   "field.client-postal-address": V["ru_address_legal_long"]}),
           ]),

    # Word-flow block, ФЛ qualification request opening.
    ladder("qualification-request-fl", FL_RU_L, "individual", "individual",
           "qualification-request-fl-opening",
           base_overrides=QUAL_REQUEST_FL,
           rungs=[
               ("short-opening", {
                   "field.clientFullName": V["ru_name_normal"],
                   "field.client-full-name": V["ru_name_normal"],
                   "field.client-passport-issued-by":
                       V["ru_passport_authority_normal"]}),
               ("long-name", {
                   "field.clientFullName": V["ru_name_long"],
                   "field.client-full-name": V["ru_name_long"]}),
               ("long-issuing-authority", {
                   "field.client-passport-issued-by":
                       V["ru_passport_authority_long"]}),
           ]),

    # Word-flow block, ЮЛ qualification request opening.
    ladder("qualification-request-yul", UL_RU_L, "company", "company",
           "qualification-request-yul-opening",
           base_overrides=QUAL_REQUEST_YUL,
           rungs=[
               ("short-opening", {
                   "subject.fullLegalName": V["ru_company_normal"],
                   "field.representativeFullName": V["ru_rep_name_normal"]}),
               ("long-legal-name", {
                   "subject.fullLegalName": V["ru_company_long"]}),
               ("very-long-legal-name", {
                   "subject.fullLegalName": V["ru_company_very_long"],
                   "field.representativeFullName": V["ru_signatory_name_long"]}),
           ]),
]


# ── Stress-only cases, kept separate from the acceptance set ─────────────────

STRESS_CASES = [
    case("power-of-attorney", STRESS, "stress-unbroken", "power-of-attorney",
         "company", False, {}, "STRESS ONLY — expected to be refused."),
    case("accession-application-yul", STRESS, "stress-unbroken", "accession",
         "company", False, {}, "STRESS ONLY — expected to be refused."),
    case("broker-use-refusal-request", STRESS, "stress-unbroken",
         "other-documents", "company", False, {},
         "STRESS ONLY — expected to be refused."),
]
