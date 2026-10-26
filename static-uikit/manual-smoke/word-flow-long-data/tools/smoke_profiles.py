"""Synthetic master profiles and the realistic-long value library.

Everything in this file is invented for manual layout QA. No real client,
company, passport, account, phone or e-mail is used anywhere: e-mail addresses
use the reserved `example.test` domain, telephone numbers use the reserved
drama ranges, and every name, company and address is fictional.

The profiles are expressed as *overrides on the production fixture engine*.
`CRMDocumentBuilder.fixtures.payloadFor(baseProfileId, project, overrides)` is
the real production API: it fills every required wizard value from the map and
the catalog first, and these overrides are then applied on top. That is what
keeps the pack complete (generation never fails for a value nobody entered)
while still preserving every production identifier — the keys below are the
actual `subject.*`, `field.*`, `extra.*` and `check.*` paths the production
maps read. Nothing here renames or simplifies a production identifier.
"""

from __future__ import annotations

# ─────────────────────────────────────────────────────────────────────────────
# 1. The curated value library
#
# Several lengths per category so a scenario can pick the one it needs. The
# «normal» values are what an ordinary client record looks like; the «long»
# values are realistic-long — long, but still something a manager could type;
# the «stress» values are deliberately unbreakable and are used only by the
# stress-only profile.
# ─────────────────────────────────────────────────────────────────────────────

VALUES = {
    # ── Russian personal names ──────────────────────────────────────────────
    "ru_name_normal": "Соколов Алексей Михайлович",
    "ru_name_long": "Александров-Смирнов Константин Владиславович",
    "ru_name_very_long": "Преображенский-Вознесенский Иннокентий Аполлинариевич",
    "ru_name_short": "Иванов И.И.",
    "ru_rep_name_normal": "Петрова Анна Сергеевна",
    "ru_rep_name_long": "Вознесенская-Тихомирова Екатерина Аполлинарьевна",
    "ru_attorney_name_long": "Пересветов-Загорский Ярослав Иннокентьевич",
    "ru_signatory_name_long": "Дьяченко-Белозерский Святослав Вениаминович",
    "ru_beneficiary_name_long": "Рождественская-Покровская Ярослава Владимировна",
    "ru_beneficial_owner_long": "Архангельский-Троицкий Феодосий Пантелеймонович",

    # ── English personal names ──────────────────────────────────────────────
    "en_name_normal": "Patrick O'Connor",
    "en_name_long": "Christopher Alexander Montgomery-Wellington",
    "en_name_very_long": "Alexander Christopher Fitzwilliam Montgomery-Wellington",
    "en_name_apostrophe": "Siobhan O'Connor",
    "en_name_hyphen": "Emily Smith-Jones",
    "en_rep_name_long": "Alexandra Catherine Fitzwilliam-Harrington",
    "en_attorney_name_long": "Nathaniel Sebastian Ravensworth-Kingsley",
    "en_signatory_name_long": "Beatrice Anne Carmichael-Thornbury",

    # ── Russian company names ───────────────────────────────────────────────
    "ru_company_normal": "АО «Северная инвестиционная компания»",
    "ru_company_long": (
        "Акционерное общество «Межрегиональная инвестиционно-промышленная компания»"
    ),
    "ru_company_very_long": (
        "Акционерное общество «Межрегиональная инвестиционно-промышленная "
        "инфраструктурная компания технологического развития»"
    ),
    "ru_company_short_name": "АО «МИПИК ТР»",
    "ru_company_legal_form": "Акционерное общество",
    "ru_company_english_name": (
        "Interregional Investment, Industrial and Infrastructure Company "
        "for Technological Development, Joint-Stock Company"
    ),

    # ── English company names ───────────────────────────────────────────────
    "en_company_normal": "North Harbour Capital Ltd.",
    "en_company_long": (
        "Northern Continental Infrastructure and Investment Holdings Limited"
    ),
    "en_company_very_long": (
        "Northern Continental Infrastructure and Strategic Investment "
        "Holdings Limited"
    ),
    "en_company_short_name": "NCISIH Ltd.",

    # ── Russian addresses (index, region, district, city, settlement,
    #    street, building, block, structure, office) ─────────────────────────
    "ru_address_normal": "190121, Россия, г. Санкт-Петербург, ул. Декабристов, д. 42, кв. 17",
    "ru_address_long": (
        "190121, Российская Федерация, город Санкт-Петербург, Адмиралтейский "
        "район, внутригородское муниципальное образование Коломна, набережная "
        "реки Мойки, дом 102, корпус 3, строение 5, помещение 14-Н, офис 217"
    ),
    "ru_address_postal_long": (
        "197227, Российская Федерация, Санкт-Петербург, Приморский район, "
        "муниципальный округ Озеро Долгое, посёлок городского типа Лисий Нос, "
        "Приморское шоссе, дом 48, корпус 2, литера А, офис 305"
    ),
    "ru_address_legal_long": (
        "125315, Российская Федерация, город Москва, Северный административный "
        "округ, муниципальный округ Аэропорт, Ленинградский проспект, дом 74, "
        "корпус 1, строение 2, этаж 11, помещение XII, комната 7"
    ),
    "ru_address_executive_long": (
        "125315, Российская Федерация, город Москва, Ленинградский проспект, "
        "дом 74, корпус 1, строение 2, этаж 11, помещение XII, комната 7"
    ),

    # ── Foreign addresses (building, street, district, city, region,
    #    postal code, country) ────────────────────────────────────────────────
    "en_address_normal": "27 King Street, London, SW1A 2AA, United Kingdom",
    "en_address_long": (
        "Suite 1420, Kingsway Continental House, 118–120 Ludgate Hill Street, "
        "City of London, Greater London, EC4M 7AA, United Kingdom"
    ),
    "en_address_postal_long": (
        "Apartment 148, Building 27, Saint Christopher International Business "
        "Park, King George the Fifth Avenue, Kingston upon Thames, Greater "
        "London, KT1 2EE, United Kingdom"
    ),

    # ── Authorities ─────────────────────────────────────────────────────────
    "ru_passport_authority_normal": "ГУ МВД России по г. Санкт-Петербургу",
    "ru_passport_authority_long": (
        "Отделение по вопросам миграции Управления Министерства внутренних дел "
        "Российской Федерации по Центральному административному округу города "
        "Москвы"
    ),
    "ru_registration_authority_long": (
        "Межрайонная инспекция Федеральной налоговой службы № 46 по городу "
        "Москве"
    ),
    "ru_licence_authority_long": (
        "Центральный банк Российской Федерации (Банк России), Департамент "
        "допуска и прекращения деятельности финансовых организаций"
    ),
    "en_passport_authority_long": (
        "His Majesty's Passport Office, Overseas Territories Identity and "
        "Citizenship Directorate"
    ),
    "en_registration_authority_long": (
        "Companies House for England and Wales, Office of the Registrar of "
        "Companies"
    ),

    # ── Authority basis (the document a representative acts under) ──────────
    "ru_authority_basis_normal": "Устава",
    "ru_authority_basis_long": "Устава общества",
    "ru_authority_basis_very_long": (
        "Доверенности № 78 АГ 4412596 от 14.03.2026, удостоверенной нотариусом "
        "нотариального округа Санкт-Петербурга"
    ),
    "en_authority_basis_long": (
        "the Articles of Association and the Board Resolution of 14 March 2026"
    ),

    # ── Positions ───────────────────────────────────────────────────────────
    "ru_position_normal": "Генеральный директор",
    "ru_position_long": (
        "Заместитель генерального директора по инвестиционной деятельности"
    ),
    "en_position_long": "Chief Executive Officer and Managing Director",

    # ── Exact identifiers — never lengthened, never broken ──────────────────
    "inn_ul": "7801234567",              # 10 digits — legal entity
    "inn_fl": "781234567890",            # 12 digits — individual
    "ogrn": "1177847012345",             # 13 digits
    "kpp": "780101001",
    "snils": "123-456-789 01",
    "passport_series": "4019",
    "passport_number": "587412",
    "passport_series_number": "4019 587412",
    "passport_dept_code": "780-014",
    "en_passport_series": "GB",
    "en_passport_number": "GB-5581742",
    "en_passport_series_number": "GB GB-5581742",
    "bank_account": "40817810099910004312",
    # Deliberately outside every assigned range: 0499… is not allocated to
    # any real credit institution, so no live bank identifier ends up in a
    # QA artefact by accident.
    "bank_corr_account": "30101810000000000999",
    "bank_bic": "049999999",
    "agreement_number": "БД-2026/000417-СПБ",
    "client_code": "INV-SMOKE-2026-000417",
    "okpo": "12345678",
    "okved": "64.99",
    "foreign_registration_number": "GB-11482376",
    "foreign_tax_identifier": "GB998877665",

    # ── Contacts ────────────────────────────────────────────────────────────
    "ru_email": "k.aleksandrov-smirnov@example.test",
    "ru_email_long": "compliance.notifications.department@example.test",
    "en_email": "c.montgomery-wellington@example.test",
    "en_email_long": "international.client.notifications@example.test",
    "ru_phone": "+7 (812) 555-01-47",
    "ru_landline": "+7 (812) 555-04-18",
    "en_phone": "+44 20 7946 0958",
    "website": "https://example.test",

    # ── Banks ───────────────────────────────────────────────────────────────
    "ru_bank_name_long": (
        "Акционерное общество «Северо-Западный расчётно-инвестиционный банк»"
    ),
    "en_bank_name_long": "Northern Continental Merchant Bank Limited",

    # ── Free text ───────────────────────────────────────────────────────────
    "payment_purpose_long": (
        "Перевод денежных средств по брокерскому договору "
        "№ БД-2026/000417-СПБ от 14.03.2026, без налога (НДС)"
    ),
    "transfer_description_long": (
        "Перевод свободного остатка денежных средств между торговыми "
        "площадками в рамках единого брокерского счёта"
    ),
    "notification_description_long": (
        "Уведомление направляется по адресу электронной почты, указанному "
        "клиентом в анкете, в срок не позднее следующего рабочего дня"
    ),
    "ru_birthplace_long": "город Санкт-Петербург, Российская Федерация",
    "en_birthplace_long": "Kingston upon Thames, Greater London, United Kingdom",
    "ru_citizenship": "Российская Федерация",
    "en_citizenship_long": "United Kingdom of Great Britain and Northern Ireland",
    "ru_business_purpose_other_long": (
        "Совершение операций с ценными бумагами и производными финансовыми "
        "инструментами в интересах долгосрочного инвестирования"
    ),
    "ru_financial_goal_other_long": (
        "Формирование долгосрочного диверсифицированного инвестиционного "
        "портфеля с умеренным уровнем риска"
    ),
    "ru_other_info_long": (
        "Дополнительные сведения предоставляются клиентом по запросу "
        "в порядке, установленном Регламентом"
    ),
    "ru_supporting_docs_long": (
        "Выписка по счёту депо, отчёт брокера за отчётный период и справка "
        "о стоимости портфеля ценных бумаг"
    ),
    "ru_qualification_instruments_long": (
        "Акции, облигации российских и иностранных эмитентов, паи паевых "
        "инвестиционных фондов и производные финансовые инструменты"
    ),
    "ru_security_issuer_long": (
        "Публичное акционерное общество «Северный энергетический холдинг»"
    ),
    "ru_code_word_long": "Северо-Западная навигация",

    # ── Stress-only: unbroken tokens, used by one clearly separated profile ─
    "stress_unbroken_ru": (
        "Александровсмирновконстантинвладиславовичпреображенскийвознесенский"
    ),
    "stress_unbroken_en": (
        "NorthernContinentalInfrastructureAndStrategicInvestmentHoldingsLimited"
    ),
    "stress_unbroken_digits": "12345678901234567890123456789012345678901234567890",
}


def _individual_identity(long_values: bool, english: bool = False) -> dict:
    """Identity paths shared by every individual profile."""
    v = VALUES
    if english:
        name = v["en_name_long"] if long_values else v["en_name_normal"]
        address = v["en_address_long"] if long_values else v["en_address_normal"]
        postal = v["en_address_postal_long"] if long_values else v["en_address_normal"]
        authority = v["en_passport_authority_long"]
        return {
            "subject.displayName": name,
            "subject.shortName": name,
            "subject.fullLegalName": name,
            "subject.citizenship": v["en_citizenship_long"],
            "subject.birthPlace": v["en_birthplace_long"],
            "subject.email": v["en_email_long"] if long_values else v["en_email"],
            "subject.phone": v["en_phone"],
            "subject.inn": v["foreign_tax_identifier"],
            # A nonresident who is on a Russian register still has these, and
            # the maps mark them required. Blanking them would not test a
            # foreign layout — it would only test a missing-value message.
            "subject.snils": v["snils"],
            "subject.code": v["client_code"],
            "subject.registrationAddress": address,
            "subject.postalAddress": postal,
            "subject.legalAddress": address,
            "subject.website": v["website"],
            "field.clientFullName": name,
            "field.client-full-name": name,
            "field.client-full-legal-name": name,
            "field.client-short-name": name,
            "field.client-birth-place": v["en_birthplace_long"],
            "field.client-citizenship": v["en_citizenship_long"],
            "field.client-registration-address": address,
            "field.client-postal-address": postal,
            "field.registrationAddress": address,
            "field.client-passport-issued-by": authority,
            "field.passportIssuedBy": authority,
            "field.client-passport-series": v["en_passport_series"],
            "field.client-passport-number": v["en_passport_number"],
            "field.passportSeries": v["en_passport_series"],
            "field.passportNumber": v["en_passport_number"],
            "field.passportSeriesNumber": v["en_passport_series_number"],
            "field.client-passport-dept-code": v["passport_dept_code"],
            "field.client-inn": v["foreign_tax_identifier"],
            "field.client-id-or-inn": v["foreign_tax_identifier"],
            "field.client-snils": v["snils"],
            "field.client-rep-full-name": v["en_rep_name_long"],
            "field.representativeFullName": v["en_rep_name_long"],
            "field.client-rep-authority": v["en_authority_basis_long"],
            "field.client-rep-position": v["en_position_long"],
        }

    name = v["ru_name_long"] if long_values else v["ru_name_normal"]
    address = v["ru_address_long"] if long_values else v["ru_address_normal"]
    postal = v["ru_address_postal_long"] if long_values else v["ru_address_normal"]
    authority = (v["ru_passport_authority_long"] if long_values
                 else v["ru_passport_authority_normal"])
    rep = v["ru_rep_name_long"] if long_values else v["ru_rep_name_normal"]
    return {
        "subject.displayName": name,
        "subject.shortName": name,
        "subject.fullLegalName": name,
        "subject.citizenship": v["ru_citizenship"],
        "subject.birthPlace": v["ru_birthplace_long"] if long_values else "г. Москва",
        "subject.email": v["ru_email_long"] if long_values else v["ru_email"],
        "subject.phone": v["ru_phone"],
        "subject.inn": v["inn_fl"],
        "subject.snils": v["snils"],
        "subject.code": v["client_code"],
        "subject.registrationAddress": address,
        "subject.postalAddress": postal,
        "subject.legalAddress": address,
        "subject.website": v["website"],
        "field.clientFullName": name,
        "field.client-full-name": name,
        "field.client-full-legal-name": name,
        "field.client-short-name": name,
        "field.client-birth-place": (v["ru_birthplace_long"] if long_values
                                     else "г. Москва"),
        "field.client-citizenship": v["ru_citizenship"],
        "field.client-registration-address": address,
        "field.client-postal-address": postal,
        "field.registrationAddress": address,
        "field.client-passport-issued-by": authority,
        "field.passportIssuedBy": authority,
        "field.client-passport-series": v["passport_series"],
        "field.client-passport-number": v["passport_number"],
        "field.passportSeries": v["passport_series"],
        "field.passportNumber": v["passport_number"],
        "field.passportSeriesNumber": v["passport_series_number"],
        "field.client-passport-dept-code": v["passport_dept_code"],
        "field.client-inn": v["inn_fl"],
        "field.client-id-or-inn": v["inn_fl"],
        "field.client-snils": v["snils"],
        "field.client-rep-full-name": rep,
        "field.representativeFullName": rep,
        "field.client-rep-authority": (v["ru_authority_basis_very_long"] if long_values
                                       else v["ru_authority_basis_normal"]),
        "field.client-rep-position": (v["ru_position_long"] if long_values
                                      else v["ru_position_normal"]),
    }


def _company_identity(long_values: bool, english: bool = False) -> dict:
    """Identity paths shared by every legal-entity profile."""
    v = VALUES
    if english:
        legal = v["en_company_very_long"] if long_values else v["en_company_normal"]
        short = v["en_company_short_name"] if long_values else v["en_company_normal"]
        address = v["en_address_long"] if long_values else v["en_address_normal"]
        postal = v["en_address_postal_long"] if long_values else v["en_address_normal"]
        return {
            "subject.displayName": legal,
            "subject.shortName": short,
            "subject.fullLegalName": legal,
            "subject.englishName": legal,
            "subject.citizenship": v["en_citizenship_long"],
            "subject.email": v["en_email_long"],
            "subject.phone": v["en_phone"],
            "subject.inn": v["foreign_tax_identifier"],
            # Kept populated for the same reason as СНИЛС above: the Russian
            # forms print a КПП slot for a foreign applicant too.
            "subject.kpp": v["kpp"],
            "subject.ogrn": v["foreign_registration_number"],
            "subject.code": v["client_code"],
            "subject.registrationAddress": address,
            "subject.postalAddress": postal,
            "subject.legalAddress": address,
            "subject.registrationAuthority": v["en_registration_authority_long"],
            "subject.website": v["website"],
            "field.client-full-legal-name": legal,
            "field.client-short-name": short,
            "field.client-english-name": legal,
            "field.clientFullName": legal,
            "field.client-full-name": legal,
            "field.client-legal-address": address,
            "field.client-postal-address": postal,
            "field.client-legal-form": "Private Limited Company",
            "field.client-inn": v["foreign_tax_identifier"],
            "field.client-id-or-inn": v["foreign_tax_identifier"],
            "field.client-kpp": v["kpp"],
            "field.client-ogrn": v["foreign_registration_number"],
            "field.client-registration-authority": v["en_registration_authority_long"],
            "field.client-rep-full-name": v["en_signatory_name_long"],
            "field.representativeFullName": v["en_signatory_name_long"],
            "field.representativeSignerLine": v["en_signatory_name_long"],
            "field.client-rep-position": v["en_position_long"],
            "field.representativeRole": v["en_position_long"],
            "field.client-rep-authority": v["en_authority_basis_long"],
            "field.representativeAuthority": v["en_authority_basis_long"],
        }

    legal = v["ru_company_very_long"] if long_values else v["ru_company_normal"]
    short = v["ru_company_short_name"] if long_values else v["ru_company_normal"]
    address = v["ru_address_legal_long"] if long_values else v["ru_address_normal"]
    postal = v["ru_address_postal_long"] if long_values else v["ru_address_normal"]
    signer = (v["ru_signatory_name_long"] if long_values
              else v["ru_rep_name_normal"])
    return {
        "subject.displayName": legal,
        "subject.shortName": short,
        "subject.fullLegalName": legal,
        "subject.englishName": v["ru_company_english_name"],
        "subject.citizenship": v["ru_citizenship"],
        "subject.email": v["ru_email_long"] if long_values else v["ru_email"],
        "subject.phone": v["ru_phone"],
        "subject.inn": v["inn_ul"],
        "subject.kpp": v["kpp"],
        "subject.ogrn": v["ogrn"],
        "subject.code": v["client_code"],
        "subject.registrationAddress": address,
        "subject.postalAddress": postal,
        "subject.legalAddress": address,
        "subject.registrationAuthority": v["ru_registration_authority_long"],
        "subject.website": v["website"],
        "field.client-full-legal-name": legal,
        "field.client-short-name": short,
        "field.client-english-name": v["ru_company_english_name"],
        "field.clientFullName": legal,
        "field.client-full-name": legal,
        "field.client-legal-address": address,
        "field.client-postal-address": postal,
        "field.client-legal-form": v["ru_company_legal_form"],
        "field.client-inn": v["inn_ul"],
        "field.client-id-or-inn": v["inn_ul"],
        "field.client-kpp": v["kpp"],
        "field.client-ogrn": v["ogrn"],
        "field.client-registration-authority": v["ru_registration_authority_long"],
        "field.client-rep-full-name": signer,
        "field.representativeFullName": signer,
        "field.representativeSignerLine": signer,
        "field.client-rep-position": (v["ru_position_long"] if long_values
                                      else v["ru_position_normal"]),
        "field.representativeRole": (v["ru_position_long"] if long_values
                                     else v["ru_position_normal"]),
        "field.client-rep-authority": (v["ru_authority_basis_very_long"] if long_values
                                       else v["ru_authority_basis_normal"]),
        "field.representativeAuthority": (v["ru_authority_basis_very_long"] if long_values
                                          else v["ru_authority_basis_normal"]),
    }


def _shared_agreement(long_values: bool) -> dict:
    """Contract / portfolio identifiers every document may print."""
    v = VALUES
    return {
        "field.extra-contract-number": v["agreement_number"],
        "field.extra-account-portfolio": v["bank_account"],
        "field.client-code": v["client_code"],
        "extra.extra-contract-number": v["agreement_number"],
        "extra.extra-account-portfolio": v["bank_account"],
        "extra.extra-brokerage-account": v["bank_account"],
        "extra.bank-name": v["ru_bank_name_long"] if long_values else "АО «Северный банк»",
        "extra.extra-bank-name": v["ru_bank_name_long"] if long_values else "АО «Северный банк»",
        "extra.bank-address": v["ru_address_long"] if long_values else v["ru_address_normal"],
        "extra.extra-bank-address": (v["ru_address_long"] if long_values
                                     else v["ru_address_normal"]),
        "extra.bank-settlement-account": v["bank_account"],
        "extra.extra-bank-account": v["bank_account"],
        "extra.bank-correspondent-account": v["bank_corr_account"],
        "extra.extra-bank-corr-account": v["bank_corr_account"],
        "extra.bank-bic-swift": v["bank_bic"],
        "extra.extra-bank-bic": v["bank_bic"],
        "extra.bank-inn": v["inn_ul"],
        "extra.extra-bank-inn": v["inn_ul"],
        "extra.landline-phone": v["ru_landline"],
        "extra.extra-landline-phone": v["ru_landline"],
    }


def _merge(*parts: dict) -> dict:
    out: dict = {}
    for part in parts:
        out.update(part)
    return out


V = VALUES

# ─────────────────────────────────────────────────────────────────────────────
# 2. The master profiles (A–J)
# ─────────────────────────────────────────────────────────────────────────────

MASTER_PROFILES = [
    {
        "id": "smoke-fl-ru-normal",
        "letter": "A",
        "title": "Российское физическое лицо — обычные значения",
        "base": "ru-resident-normal",
        "subjectKind": "individual",
        "language": "ru",
        "lengthClass": "normal",
        "description": (
            "Ordinary Russian individual. Medium-length, entirely realistic "
            "values — this is the baseline every long case is compared against."
        ),
        "overrides": _merge(_individual_identity(False), _shared_agreement(False)),
    },
    {
        "id": "smoke-fl-ru-long",
        "letter": "B",
        "title": "Российское физическое лицо — реалистично длинные значения",
        "base": "ru-resident-long",
        "subjectKind": "individual",
        "language": "ru",
        "lengthClass": "realistic-long",
        "description": (
            "Long hyphenated full name, long birthplace, long registration and "
            "postal addresses, long passport issuing authority, long "
            "representative and authority basis, long but realistic e-mail."
        ),
        "overrides": _merge(_individual_identity(True), _shared_agreement(True), {
            "extra.pep-position-employer": (
                "Заместитель руководителя департамента стратегического развития "
                "государственной корпорации"
            ),
            "extra.representative-name": V["ru_rep_name_long"],
            "extra.representative-authority-details": V["ru_authority_basis_very_long"],
            "extra.extra-representative-basis": V["ru_authority_basis_very_long"],
            "extra.beneficiary-name": V["ru_beneficiary_name_long"],
            "extra.beneficial-owner-name": V["ru_beneficial_owner_long"],
            "extra.extra-beneficiary-name": V["ru_beneficiary_name_long"],
            "extra.extra-beneficial-owner": V["ru_beneficial_owner_long"],
            "extra.extra-other-info": V["ru_other_info_long"],
        }),
    },
    {
        "id": "smoke-fl-en-long",
        "letter": "C",
        "title": "Иностранное физическое лицо — реалистично длинные значения",
        "base": "en-nonresident-long",
        "subjectKind": "individual",
        "language": "en",
        "lengthClass": "realistic-long",
        "description": (
            "English-speaking nonresident individual: long multi-part name, "
            "long foreign address, long issuing authority, full citizenship "
            "wording, and apostrophe / hyphen surnames (O'Connor, Smith-Jones)."
        ),
        "overrides": _merge(_individual_identity(True, english=True), {
            "extra.extra-citizenship-countries": V["en_citizenship_long"],
            "extra.tax-residency-countries": V["en_citizenship_long"],
            "extra.extra-tax-residency-countries": V["en_citizenship_long"],
            "extra.representative-name": V["en_name_apostrophe"],
            "extra.beneficiary-name": V["en_name_hyphen"],
            "extra.extra-beneficiary-name": V["en_name_hyphen"],
            "extra.beneficial-owner-name": V["en_name_very_long"],
            "extra.extra-beneficial-owner": V["en_name_very_long"],
            "extra.bank-name": V["en_bank_name_long"],
            "extra.extra-bank-name": V["en_bank_name_long"],
            "extra.bank-address": V["en_address_long"],
            "extra.extra-bank-address": V["en_address_long"],
            "extra.representative-authority-details": V["en_authority_basis_long"],
        }),
    },
    {
        "id": "smoke-yul-ru-normal",
        "letter": "D",
        "title": "Российское юридическое лицо — обычные значения",
        "base": "ru-company-normal",
        "subjectKind": "company",
        "language": "ru",
        "lengthClass": "normal",
        "description": "Ordinary Russian legal entity — the company baseline.",
        "overrides": _merge(_company_identity(False), _shared_agreement(False)),
    },
    {
        "id": "smoke-yul-ru-long",
        "letter": "E",
        "title": "Российское юридическое лицо — реалистично длинные значения",
        "base": "ru-company-long",
        "subjectKind": "company",
        "language": "ru",
        "lengthClass": "realistic-long",
        "description": (
            "One continuous long legal name plus a realistic abbreviated name, "
            "long legal and postal addresses, long signatory name, position and "
            "authority basis, exact ОГРН / ИНН / КПП, long bank details."
        ),
        "overrides": _merge(_company_identity(True), _shared_agreement(True), {
            "extra.extra-okpo": V["okpo"],
            "extra.extra-okved": V["okved"],
            "extra.licence-authority": V["ru_licence_authority_long"],
            "extra.extra-licence-authority": V["ru_licence_authority_long"],
            "extra.executive-body-address": V["ru_address_executive_long"],
            "extra.extra-management-structure": (
                "Общее собрание акционеров, Совет директоров, "
                "Единоличный исполнительный орган"
            ),
            "extra.extra-controlling-persons": V["ru_beneficial_owner_long"],
            "extra.representative-name": V["ru_signatory_name_long"],
            "extra.representative-authority-details": V["ru_authority_basis_very_long"],
            "extra.beneficiary-name": V["ru_beneficiary_name_long"],
            "extra.beneficial-owner-name": V["ru_beneficial_owner_long"],
            "extra.extra-other-info": V["ru_other_info_long"],
        }),
    },
    {
        "id": "smoke-yul-en-long",
        "letter": "F",
        "title": "Иностранное юридическое лицо — реалистично длинные значения",
        "base": "en-company-long",
        "subjectKind": "company",
        "language": "en",
        "lengthClass": "realistic-long",
        "description": (
            "Foreign legal entity: long company name, foreign registration "
            "authority and number, long foreign address, long representative "
            "name, position and authority basis."
        ),
        "overrides": _merge(_company_identity(True, english=True), {
            "extra.foreign-registration-number": V["foreign_registration_number"],
            "extra.foreign-tax-identifier": V["foreign_tax_identifier"],
            "extra.tax-residency-countries": V["en_citizenship_long"],
            "extra.nonresident-representation-address": V["en_address_long"],
            "extra.nonresident-representative-residence": V["en_address_postal_long"],
            "extra.executive-body-address": V["en_address_long"],
            "extra.bank-name": V["en_bank_name_long"],
            "extra.extra-bank-name": V["en_bank_name_long"],
            "extra.bank-address": V["en_address_long"],
            "extra.extra-bank-address": V["en_address_long"],
            "extra.licence-authority": V["en_registration_authority_long"],
            "extra.representative-name": V["en_signatory_name_long"],
            "extra.representative-authority-details": V["en_authority_basis_long"],
        }),
    },
    {
        "id": "smoke-optional-empty",
        "letter": "G",
        "title": "Отсутствующие необязательные значения",
        "base": "missing-optional",
        "subjectKind": "individual",
        "language": "ru",
        "lengthClass": "normal",
        "description": (
            "Every optional value removed by the production fixture engine. "
            "Proves that a blank optional slot prints nothing at all — no "
            "stray rule, no leftover separator, no duplicated label."
        ),
        "overrides": {},
    },
    {
        "id": "smoke-max-branches",
        "letter": "H",
        "title": "Максимум применимых ветвей с флажками",
        "base": "maximum-checkboxes",
        "subjectKind": "individual",
        "language": "ru",
        "lengthClass": "normal",
        "description": (
            "Every checkbox the map exposes is selected, so every conditional "
            "branch and every «Иное» free-text row is printed at once."
        ),
        "overrides": _merge(_individual_identity(False), _shared_agreement(False), {
            "extra.business-purpose-other": V["ru_business_purpose_other_long"],
            "extra.financial-goal-other": V["ru_financial_goal_other_long"],
            "extra.reputation-other-details": V["ru_other_info_long"],
            "extra.source-of-funds-other": (
                "Доход от предпринимательской деятельности и инвестиционных операций"
            ),
        }),
    },
    {
        # Companion to H. The production `maximum-checkboxes` fixture is an
        # individual, so a company-only form needs a company subject to carry
        # the same "every branch at once" scenario.
        "id": "smoke-max-branches-company",
        "letter": "H2",
        "title": "Максимум применимых ветвей — юридическое лицо",
        "base": "ru-company-normal",
        "subjectKind": "company",
        "language": "ru",
        "lengthClass": "normal",
        "description": (
            "Every checkbox a company form exposes is selected. The check keys "
            "come from that document's own map, so no form is given another "
            "form's branches."
        ),
        "overrides": _merge(_company_identity(False), _shared_agreement(False), {
            "extra.business-purpose-other": V["ru_business_purpose_other_long"],
            "extra.financial-goal-other": V["ru_financial_goal_other_long"],
            "extra.reputation-other-details": V["ru_other_info_long"],
            "extra.source-of-funds-other": (
                "Доход от предпринимательской деятельности и инвестиционных операций"
            ),
        }),
    },
    {
        "id": "smoke-exact-identifiers",
        "letter": "I",
        "title": "Профиль точных идентификаторов",
        "base": "ru-company-normal",
        "subjectKind": "company",
        "language": "ru",
        "lengthClass": "normal",
        "description": (
            "Exact, unbroken identifiers only: 10-digit ИНН, 13-digit ОГРН, "
            "КПП, passport series and number, account number, agreement number "
            "and client code. Used to confirm none of them is ever hyphenated, "
            "wrapped mid-token or split across a line."
        ),
        "overrides": _merge(_company_identity(False), _shared_agreement(False), {
            "subject.inn": V["inn_ul"],
            "subject.ogrn": V["ogrn"],
            "subject.kpp": V["kpp"],
            "subject.code": V["client_code"],
            "field.client-inn": V["inn_ul"],
            "field.client-ogrn": V["ogrn"],
            "field.client-kpp": V["kpp"],
            "field.client-code": V["client_code"],
            "field.client-id-or-inn": V["inn_ul"],
            "field.passportSeries": V["passport_series"],
            "field.passportNumber": V["passport_number"],
            "field.passportSeriesNumber": V["passport_series_number"],
            "field.client-passport-series": V["passport_series"],
            "field.client-passport-number": V["passport_number"],
            "field.client-snils": V["snils"],
            "field.extra-contract-number": V["agreement_number"],
            "field.extra-account-portfolio": V["bank_account"],
            "extra.extra-contract-number": V["agreement_number"],
            "extra.extra-brokerage-account": V["bank_account"],
            "extra.extra-bank-account": V["bank_account"],
            "extra.bank-settlement-account": V["bank_account"],
            "extra.extra-bank-bic": V["bank_bic"],
            "extra.bank-bic-swift": V["bank_bic"],
            "extra.extra-okpo": V["okpo"],
        }),
    },
    {
        "id": "smoke-stress-unbroken",
        "letter": "J",
        "title": "СТРЕСС-ПРОФИЛЬ — неразрывные строки без пробелов",
        "base": "ru-company-long",
        "subjectKind": "company",
        "language": "ru",
        "lengthClass": "stress-only",
        "stressOnly": True,
        "description": (
            "STRESS ONLY — not a release acceptance profile. Very long strings "
            "with no space anywhere, to confirm the engine fails gracefully "
            "with an actionable message instead of drawing over the form."
        ),
        "overrides": {
            "subject.displayName": V["stress_unbroken_ru"],
            "subject.shortName": V["stress_unbroken_ru"],
            "subject.fullLegalName": V["stress_unbroken_ru"],
            "field.client-full-legal-name": V["stress_unbroken_ru"],
            "field.client-short-name": V["stress_unbroken_ru"],
            "field.clientFullName": V["stress_unbroken_ru"],
            "field.client-full-name": V["stress_unbroken_ru"],
            "field.client-english-name": V["stress_unbroken_en"],
            "field.client-legal-address": V["stress_unbroken_ru"],
            "field.client-postal-address": V["stress_unbroken_en"],
            "field.client-rep-full-name": V["stress_unbroken_ru"],
            "field.client-rep-authority": V["stress_unbroken_ru"],
        },
    },
]

PROFILES_BY_ID = {p["id"]: p for p in MASTER_PROFILES}
