# Order forms — mapping gap

**Production status: `blocked-incomplete-mapping` — separate implementation required.**

ПРИЛОЖЕНИЕ 7 К РЕГЛАМЕНТУ. ФОРМЫ ПОРУЧЕНИЙ · `order-forms.pdf` · 4 pages

## Why it is not production-ready

The retained incomplete map places **93 printed fields**. Its current sources
are:

- **89** `extra.*` operator values;
- **1** `check.*` operator acknowledgement;
- **3** normalized client-name values.

Every mapped field is currently declared `optional`, so nothing refuses to
generate when an amount, market, contract, recipient, bank requisite or
signature-side value is absent: the form simply prints blank. Only the three
form variants' client-name occurrences reach normalized CRM data. The table
below identifies **13 rows for which an exact UMI source is available** (the
three names and ten bank rows); those availability notes are the target mapping,
not a claim that the current map already uses those UMI paths.

That is why the form remains `blocked-incomplete-mapping`, is not offered by
the wizard, and is excluded from the 17 dynamic production-ready templates.
The catalogue entry and map remain only as a measured starting point for the
separate implementation.

The bank rows are the clearest case: `Front Реквизиты` holds every one of
them under an exact UMI name (see docs/umi-variable-registry.md), and the map
reads an operator-typed `extra.*` instead.

## Open business questions

1. Which order types must the release actually offer? The single file holds four.
2. Is the recipient always ООО «Инвестика», or client-selectable per order?
3. Which requisite of a client with several is the default for a payout —
   `umi.requisites.osnovnoj_rekvizit`, or chosen per order?
4. Where do the order registration number and date come from? The same
   question as the accession application, and still unanswered.
5. Does the initiator block print the client, the representative, or the
   Investika operator who accepted the order?

## Every printed field

| Page | Section | Field id | Printed label | Current source | Exact UMI name | Availability | Formatter | Required |
|---|---|---|---|---|---|---|---|---|
| 1 | 1. Поручение на сделку | `counterparty` | Информация о контрагенте | `extra.extra-counterparty` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `derivativeKind` | Вид инструмента срочного рынка | `extra.extra-derivative-kind` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `derivativeName` | Наименование ПФИ | `extra.extra-derivative-name` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `derivativePremium` | Цена ПФИ (премия) | `extra.extra-derivative-premium` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `derivativeQuantity` | Количество ПФИ, шт. (лотов) | `extra.extra-derivative-quantity` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `marketCurrency` | Вид рынка | `extra.extra-order-market` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `marketDerivatives` | Вид рынка | `extra.extra-order-market` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `marketOtc` | Вид рынка | `extra.extra-order-market` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `marketStock` | Вид рынка | `extra.extra-order-market` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `orderKindConditional` | Вид поручения | `extra.extra-order-kind` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `orderKindConditionalText` | Условное поручение (указать) | `extra.extra-order-kind-conditional` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `orderKindLimit` | Вид поручения | `extra.extra-order-kind` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `orderKindMarket` | Вид поручения | `extra.extra-order-kind` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `orderValidity` | Срок действия заявки | `extra.extra-order-validity` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `otherInformation` | Иная информация | `extra.extra-order-other-info` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `repoNo` | Сделка РЕПО с ЦК | `extra.extra-repo-ccp` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `repoYes` | Сделка РЕПО с ЦК | `extra.extra-repo-ccp` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `securityIssuer` | Наименование эмитента | `extra.extra-security-issuer` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `securityPrice` | Цена одной ценной бумаги / НКД / валюта цены | `extra.extra-security-price` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `securityQuantity` | Количество ценных бумаг | `extra.extra-security-quantity` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `securityType` | Вид, категория (тип), выпуск, транш, серия, ISIN/CFI | `extra.extra-security-type` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `settlementPeriod` | Срок расчётов | `extra.extra-settlement-period` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `tradeAmount` | Сумма сделки в валюте сделки | `extra.extra-trade-amount` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `tradeBrokerageAccount` | Брокерский счёт № | `extra.extra-brokerage-account` | — | operator input | — | required |
| 1 | 1. Поручение на сделку | `tradeCancellation` | Вид подачи | `extra.extra-submission-kind` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `tradeClientName` | — | `field.client-full-name` | umi.company.origname, umi.phys.surname, umi.phys.namecl, umi.phys.patronymic | UMI | — | required |
| 1 | 1. Поручение на сделку | `tradeContractNumberDate` | Номер и дата договора с клиентом | `extra.extra-contract-number-date` | — | operator input | — | required |
| 1 | 1. Поручение на сделку | `tradeKindBuy` | Вид сделки | `extra.extra-trade-kind` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `tradeKindOther` | Вид сделки | `extra.extra-trade-kind` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `tradeKindOtherText` | Иной вид сделки (указать) | `extra.extra-trade-kind-other` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `tradeKindSell` | Вид сделки | `extra.extra-trade-kind` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `tradeOrderNumberDate` | Номер и дата заявки (при отмене — ранее поданной) | `extra.extra-order-number-date` | — | operator input | — | optional |
| 1 | 1. Поручение на сделку | `tradePrimary` | Вид подачи | `extra.extra-submission-kind` | — | operator input | — | optional |
| 2 | 1. Поручение на сделку (продолжение) | `derivativeAmount` | Сумма сделки (ПФИ) | `extra.extra-derivative-amount` | — | operator input | — | optional |
| 2 | 1. Поручение на сделку (продолжение) | `derivativeExpiry` | Дата исполнения (экспирации) | `extra.extra-derivative-expiry` | — | operator input | dateRu | optional |
| 2 | 1. Поручение на сделку (продолжение) | `derivativeStrike` | Цена исполнения страйк (для опционов) | `extra.extra-derivative-strike` | — | operator input | — | optional |
| 2 | 1. Поручение на сделку (продолжение) | `fxAmount` | Сумма сделки в валюте котировки | `extra.extra-fx-amount` | — | operator input | — | optional |
| 2 | 1. Поручение на сделку (продолжение) | `fxInstrument` | Наименование валютного инструмента / инструмента драг. металлов | `extra.extra-fx-instrument` | — | operator input | — | optional |
| 2 | 1. Поручение на сделку (продолжение) | `fxLots` | Количество лотов валютного инструмента | `extra.extra-fx-lots` | — | operator input | — | optional |
| 2 | 1. Поручение на сделку (продолжение) | `fxRate` | Курс валюты / цена сделки с драг. металлами | `extra.extra-fx-rate` | — | operator input | — | optional |
| 2 | 1. Поручение на сделку (продолжение) | `fxSwapNo` | Сделка валютный СВОП с ЦК | `extra.extra-fx-swap-ccp` | — | operator input | — | optional |
| 2 | 1. Поручение на сделку (продолжение) | `fxSwapYes` | Сделка валютный СВОП с ЦК | `extra.extra-fx-swap-ccp` | — | operator input | — | optional |
| 2 | 1. Поручение на сделку (продолжение) | `uncoveredPositionAck` | Я проинформирован, что данная сделка может привести к открытию непокрытой позиции (для клиентов с начальным уровнем риска) | `check.order-uncovered-ack` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveAmountFigures` | Сумма (цифрами) | `extra.extra-move-amount` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveAmountWords` | Сумма (прописью) | `extra.extra-move-amount-words` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveBrokerageAccount` | Брокерский счёт № | `extra.extra-brokerage-account` | — | operator input | — | required |
| 3 | 2. Поручение на перевод | `moveCancellation` | Вид подачи | `extra.extra-submission-kind` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveClientName` | — | `field.client-full-name` | umi.company.origname, umi.phys.surname, umi.phys.namecl, umi.phys.patronymic | UMI | — | required |
| 3 | 2. Поручение на перевод | `moveContractNumberDate` | Номер и дата договора с клиентом | `extra.extra-contract-number-date` | — | operator input | — | required |
| 3 | 2. Поручение на перевод | `moveCurCny` | Валюта перевода | `extra.extra-move-currency` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveCurEur` | Валюта перевода | `extra.extra-move-currency` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveCurOther` | Валюта перевода | `extra.extra-move-currency` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveCurRub` | Валюта перевода | `extra.extra-move-currency` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveCurUsd` | Валюта перевода | `extra.extra-move-currency` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveFromCurrency` | С торговой площадки | `extra.extra-move-from` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveFromDerivatives` | С торговой площадки | `extra.extra-move-from` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveFromOtc` | С торговой площадки | `extra.extra-move-from` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveFromStock` | С торговой площадки | `extra.extra-move-from` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveOrderNumberDate` | Номер и дата заявки (при отмене — ранее поданной) | `extra.extra-order-number-date` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `movePrimary` | Вид подачи | `extra.extra-submission-kind` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveToCurrency` | На торговую площадку | `extra.extra-move-to` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveToDerivatives` | На торговую площадку | `extra.extra-move-to` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveToOtc` | На торговую площадку | `extra.extra-move-to` | — | operator input | — | optional |
| 3 | 2. Поручение на перевод | `moveToStock` | На торговую площадку | `extra.extra-move-to` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `bankBic` | БИК/SWIFT банка получателя | `extra.extra-bank-bic` | umi.requisites.bik_dlya_rublevyh_rekvizitov | UMI | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `bankCorrAccount` | Корреспондентский счёт банка получателя | `extra.extra-bank-corr-account` | umi.requisites.corr_account | UMI | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `bankCorrName` | Наименование банка-корреспондента | `extra.extra-bank-corr-name` | umi.requisites.inter_bank_name | UMI | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `bankCorrSwift` | SWIFT банка-корреспондента | `extra.extra-bank-corr-swift` | umi.requisites.inter_swift_code | UMI | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `bankName` | Наименование банка получателя | `extra.extra-bank-name` | umi.requisites.bank_name | UMI | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `bankOther` | Прочее | `extra.extra-bank-other` | umi.requisites.notation | UMI | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `bankPersonalAccount` | Лицевой счёт | `extra.extra-bank-personal-account` | umi.requisites.payment_account | UMI | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `bankRecipient` | Получатель (наименование/ФИО) | `extra.extra-bank-recipient` | umi.requisites.recipient | UMI | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `bankRecipientAccount` | Счёт получателя | `extra.extra-bank-account` | umi.requisites.payment_account | UMI | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `bankRecipientInn` | ИНН получателя | `extra.extra-bank-inn` | umi.requisites.inn | UMI | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutAmount` | Сумма вывода (цифрами) | `extra.extra-payout-amount` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutAmountWords` | Сумма вывода (прописью) | `extra.extra-payout-amount-words` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutBrokerageAccount` | Брокерский счёт № | `extra.extra-brokerage-account` | — | operator input | — | required |
| 4 | 3. Поручение на вывод денежных средств | `payoutCancellation` | Вид подачи | `extra.extra-submission-kind` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutClientName` | — | `field.client-full-name` | umi.company.origname, umi.phys.surname, umi.phys.namecl, umi.phys.patronymic | UMI | — | required |
| 4 | 3. Поручение на вывод денежных средств | `payoutContractNumberDate` | Номер и дата договора с клиентом | `extra.extra-contract-number-date` | — | operator input | — | required |
| 4 | 3. Поручение на вывод денежных средств | `payoutCurCny` | Валюта вывода | `extra.extra-payout-currency` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutCurEur` | Валюта вывода | `extra.extra-payout-currency` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutCurOther` | Валюта вывода | `extra.extra-payout-currency` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutCurRub` | Валюта вывода | `extra.extra-payout-currency` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutCurUsd` | Валюта вывода | `extra.extra-payout-currency` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutFixedAmount` | Сумма вывода | `extra.extra-payout-amount-mode` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutFromCurrency` | С торговой площадки | `extra.extra-payout-from` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutFromDerivatives` | С торговой площадки | `extra.extra-payout-from` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutFromOtc` | С торговой площадки | `extra.extra-payout-from` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutFromStock` | С торговой площадки | `extra.extra-payout-from` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutOrderNumberDate` | Номер и дата заявки (при отмене — ранее поданной) | `extra.extra-order-number-date` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutPrimary` | Вид подачи | `extra.extra-submission-kind` | — | operator input | — | optional |
| 4 | 3. Поручение на вывод денежных средств | `payoutWholeBalance` | Сумма вывода | `extra.extra-payout-amount-mode` | — | operator input | — | optional |

## Rows with no source at all (80)

These print only what an operator types. Each needs either an exact UMI
field or an explicit business decision that it stays manual.

- p1 `counterparty` — Информация о контрагенте
- p1 `derivativeKind` — Вид инструмента срочного рынка
- p1 `derivativeName` — Наименование ПФИ
- p1 `derivativePremium` — Цена ПФИ (премия)
- p1 `derivativeQuantity` — Количество ПФИ, шт. (лотов)
- p1 `marketCurrency` — Вид рынка
- p1 `marketDerivatives` — Вид рынка
- p1 `marketOtc` — Вид рынка
- p1 `marketStock` — Вид рынка
- p1 `orderKindConditional` — Вид поручения
- p1 `orderKindConditionalText` — Условное поручение (указать)
- p1 `orderKindLimit` — Вид поручения
- p1 `orderKindMarket` — Вид поручения
- p1 `orderValidity` — Срок действия заявки
- p1 `otherInformation` — Иная информация
- p1 `repoNo` — Сделка РЕПО с ЦК
- p1 `repoYes` — Сделка РЕПО с ЦК
- p1 `securityIssuer` — Наименование эмитента
- p1 `securityPrice` — Цена одной ценной бумаги / НКД / валюта цены
- p1 `securityQuantity` — Количество ценных бумаг
- p1 `securityType` — Вид, категория (тип), выпуск, транш, серия, ISIN/CFI
- p1 `settlementPeriod` — Срок расчётов
- p1 `tradeAmount` — Сумма сделки в валюте сделки
- p1 `tradeBrokerageAccount` — Брокерский счёт №
- p1 `tradeCancellation` — Вид подачи
- p1 `tradeContractNumberDate` — Номер и дата договора с клиентом
- p1 `tradeKindBuy` — Вид сделки
- p1 `tradeKindOther` — Вид сделки
- p1 `tradeKindOtherText` — Иной вид сделки (указать)
- p1 `tradeKindSell` — Вид сделки
- p1 `tradeOrderNumberDate` — Номер и дата заявки (при отмене — ранее поданной)
- p1 `tradePrimary` — Вид подачи
- p2 `derivativeAmount` — Сумма сделки (ПФИ)
- p2 `derivativeExpiry` — Дата исполнения (экспирации)
- p2 `derivativeStrike` — Цена исполнения страйк (для опционов)
- p2 `fxAmount` — Сумма сделки в валюте котировки
- p2 `fxInstrument` — Наименование валютного инструмента / инструмента драг. металлов
- p2 `fxLots` — Количество лотов валютного инструмента
- p2 `fxRate` — Курс валюты / цена сделки с драг. металлами
- p2 `fxSwapNo` — Сделка валютный СВОП с ЦК
- p2 `fxSwapYes` — Сделка валютный СВОП с ЦК
- p2 `uncoveredPositionAck` — Я проинформирован, что данная сделка может привести к открытию непокрытой позиции (для клиентов с начальным уровнем риска)
- p3 `moveAmountFigures` — Сумма (цифрами)
- p3 `moveAmountWords` — Сумма (прописью)
- p3 `moveBrokerageAccount` — Брокерский счёт №
- p3 `moveCancellation` — Вид подачи
- p3 `moveContractNumberDate` — Номер и дата договора с клиентом
- p3 `moveCurCny` — Валюта перевода
- p3 `moveCurEur` — Валюта перевода
- p3 `moveCurOther` — Валюта перевода
- p3 `moveCurRub` — Валюта перевода
- p3 `moveCurUsd` — Валюта перевода
- p3 `moveFromCurrency` — С торговой площадки
- p3 `moveFromDerivatives` — С торговой площадки
- p3 `moveFromOtc` — С торговой площадки
- p3 `moveFromStock` — С торговой площадки
- p3 `moveOrderNumberDate` — Номер и дата заявки (при отмене — ранее поданной)
- p3 `movePrimary` — Вид подачи
- p3 `moveToCurrency` — На торговую площадку
- p3 `moveToDerivatives` — На торговую площадку
- p3 `moveToOtc` — На торговую площадку
- p3 `moveToStock` — На торговую площадку
- p4 `payoutAmount` — Сумма вывода (цифрами)
- p4 `payoutAmountWords` — Сумма вывода (прописью)
- p4 `payoutBrokerageAccount` — Брокерский счёт №
- p4 `payoutCancellation` — Вид подачи
- p4 `payoutContractNumberDate` — Номер и дата договора с клиентом
- p4 `payoutCurCny` — Валюта вывода
- p4 `payoutCurEur` — Валюта вывода
- p4 `payoutCurOther` — Валюта вывода
- p4 `payoutCurRub` — Валюта вывода
- p4 `payoutCurUsd` — Валюта вывода
- p4 `payoutFixedAmount` — Сумма вывода
- p4 `payoutFromCurrency` — С торговой площадки
- p4 `payoutFromDerivatives` — С торговой площадки
- p4 `payoutFromOtc` — С торговой площадки
- p4 `payoutFromStock` — С торговой площадки
- p4 `payoutOrderNumberDate` — Номер и дата заявки (при отмене — ранее поданной)
- p4 `payoutPrimary` — Вид подачи
- p4 `payoutWholeBalance` — Сумма вывода
