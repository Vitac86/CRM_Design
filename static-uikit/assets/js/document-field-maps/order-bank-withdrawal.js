// Official regulation effective 19 November 2026, physical pages 125.
// Coordinates are points from the top left of the extracted pages.
(function (engine) {
  'use strict';
  var slot = engine.orderMap.slot;
  var mark = engine.orderMap.mark;
  engine.orderMap.register({
    id: "order-bank-withdrawal",
    title: "Поручение на вывод средств на банковский счёт",
    templateUrl: "../assets/document-pdf-templates/order-bank-withdrawal.pdf",
    outputFilename: "poruchenie-vyvod-na-bank.pdf",
    expectedPages: 1,
    appliesTo: ["individual", "company"],
    fonts: {legalSerif: "../assets/fonts/pdf/LiberationSerif-Regular.ttf",
      legalSerifItalic: "../assets/fonts/pdf/LiberationSerif-Italic.ttf"},
    // Only the fixed-amount branch reflows the parenthesised wording. The
    // three lines share the free right column above the source underline.
    pageLayout: {0: {anchors:['withdrawal-words-line'], bodyBottom:778, shiftToTop:796, bottomClearance:24}},
    wordFlowBlocks: [
      engine.orderMap.cashParagraph('withdrawal-words-line',
        {left:276.36, baselineTop:268.8, width:289, initialLineCount:3, alignToBottom:true},
        '( )', [{type:'static', text:'(', keepWithNext:true},
          {type:'fieldRef', fieldId:'payoutAmountWords', keepTrailingNumberWithUnit:true}, {type:'static', text:')'}], {
          firstBlock:110, lastBlock:113, expectedBlockCount:4, expectedPageBlockCount:200,
          expectedSha256:'2613753a4989d15f9157a00446aa6a3f0203d8dd3136a17eec984caa84d36a6c',
          expectedTemplateSha256:'b0101cdab337e6a0674b4b28d1b8cf28d7b71111ae5446895e6672eb14eddc10', reviewStatus:'approved'
        }, {showWhen:{source:'extra.extra-payout-amount-mode', equals:'amount'}, overflowStrategy:'expand-layout',
          expansion:{page:0, insertionTop:268, shiftFromTop:268, rowHeight:10.5, maxExtraRows:3,
            lineStyle:'none', moveTopLevelPaths:true, reviewStatus:'approved'}}),
      engine.orderMap.cashParagraph('withdrawal-words-caption',
        {left:279.24, baselineTop:290.47, width:285.76, initialLineCount:2}, 'прописью', [
          {type:'spacer', width:285.76, decoration:{underline:true, thickness:0.48, offset:1.7}},
          {type:'lineBreak'}, {type:'static', text:'прописью', font:'legalSerifItalic'}
        ], {firstBlock:118, lastBlock:118, expectedBlockCount:1, expectedPageBlockCount:200,
          expectedSha256:'43f7860cfa990b3353ec322ee3490729a77ff9aa4645ec701b1f7b6cd90e8168',
          expectedTemplateSha256:'b0101cdab337e6a0674b4b28d1b8cf28d7b71111ae5446895e6672eb14eddc10', reviewStatus:'approved'
        }, {alignment:'center', showWhen:{source:'extra.extra-payout-amount-mode', equals:'amount'}})
    ],
    fields: [
      mark("payoutPrimary", "extra.extra-submission-kind", "primary", "Первичная подача заявки", 0, 109.79, 77.63, 7.7),
      mark("payoutCancellation", "extra.extra-submission-kind", "cancellation", "Отмена ранее поданной заявки", 0, 109.79, 93.71, 7.7),
      slot("payoutOrderNumber", "extra.extra-order-number", "Первичная подача заявки №", 0, 242.5, 77.08, 32, {fontSize: 9}),
      slot("payoutOrderDay", "extra.extra-order-day", "от «____» (день)", 0, 293.4, 77.08, 18, {fontSize: 9}),
      slot("payoutOrderMonth", "extra.extra-order-month", "месяц", 0, 320.3, 77.08, 26, {fontSize: 9}),
      slot("payoutOrderYear", "extra.extra-order-year", "20______г. (год)", 0, 359.4, 77.08, 27, {fontSize: 9}),
      slot("payoutClientName", "field.client-full-name", "Наименование/Фамилия, имя, отчество", 0, 279.12, 180.33, 292.46, {required: true, fontSize: 9, multiline: true, maxLines: 2, lineHeight: 9.5}),
      slot("payoutContractNumberDate", "extra.extra-contract-number-date", "Номер и дата договора с клиентом", 0, 279.12, 205.03, 292.46, {required: true, fontSize: 10}),
      slot("payoutBrokerageAccount", "extra.extra-brokerage-account", "Брокерский счет №", 0, 279.12, 225.21, 292.46, {required: true, fontSize: 10}),
      mark("payout-from-stock", "extra.extra-payout-from", "stock", "С торговой площадки · торговая система ПАО Московская Биржа (фондовый рынок и рынок депозитов);", 0, 110.51, 324.67, 8.6),
      mark("payout-from-currency", "extra.extra-payout-from", "currency", "С торговой площадки · торговая система ПАО Московская Биржа (Валютный рынок и рынок драгоценных металлов);", 0, 110.51, 336.91, 8.6),
      mark("payout-from-derivatives", "extra.extra-payout-from", "derivatives", "С торговой площадки · торговая система ПАО Московская Биржа (Срочный рынок);", 0, 110.51, 348.91, 8.6),
      mark("payout-from-spb-stock", "extra.extra-payout-from", "spb-stock", "С торговой площадки · торговая система ПАО СПБ биржа (Фондовый рынок);", 0, 110.51, 361.15, 8.6),
      mark("payout-from-spb-derivatives", "extra.extra-payout-from", "spb-derivatives", "С торговой площадки · торговая система ПАО СПБ биржа (Срочный рынок);", 0, 110.51, 373.39, 8.6),
      mark("payout-from-otc", "extra.extra-payout-from", "otc", "С торговой площадки · внебиржевой рынок;", 0, 110.51, 385.41, 8.6),
      mark("payout-from-other", "extra.extra-payout-from", "other", "С торговой площадки · иное ___;", 0, 110.51, 397.65, 8.6),
      slot("payout-from-other-name", "extra.extra-payout-from-other-name", "иное (указать)", 0, 149, 397, 344, {showWhen: {source: "extra.extra-payout-from", equals: "other"}}),
      mark("payoutCurrencyRUB", "extra.extra-payout-currency", "RUB", "RUB", 0, 207.28, 254.32, 7.7),
      mark("payoutCurrencyUSD", "extra.extra-payout-currency", "USD", "USD", 0, 240.64, 254.32, 7.7),
      mark("payoutCurrencyEUR", "extra.extra-payout-currency", "EUR", "EUR", 0, 273.78, 254.32, 7.7),
      mark("payoutCurrencyCNY", "extra.extra-payout-currency", "CNY", "CNY", 0, 306.9, 254.32, 7.7),
      mark("payoutCurrencyother", "extra.extra-payout-currency", "other", "☐ (без подписи)", 0, 343.4, 254.32, 7.7),
      mark("payoutModewhole", "extra.extra-payout-amount-mode", "whole", "В размере свободного остатка", 0, 110.51, 278.56, 8.6),
      mark("payoutModeamount", "extra.extra-payout-amount-mode", "amount", "В сумме", 0, 110.51, 290.56, 8.6),
      slot("payoutAmountFigures", "extra.extra-payout-amount", "цифрами", 0, 168, 289.8, 106, {fontSize: 9}),
      slot("payoutAmountWords", "extra.extra-payout-amount-words", "прописью", 0, 282.4, 289.8, 105.1, {fontSize:9, layoutMode:"flow-reference", flowBlockId:"withdrawal-words-line"}),
      slot("bankRecipient", "extra.extra-bank-recipient", "Получатель (наименование/ФИО)", 0, 288.2, 438.56, 283.4),
      slot("bankBic", "extra.extra-bank-bic", "БИК/SWIFT банка получателя", 0, 288.2, 456.09, 283.4),
      slot("bankName", "extra.extra-bank-name", "Наименование банка получателя", 0, 288.2, 473.62, 283.4),
      slot("bankCorrSwift", "extra.extra-bank-corr-swift", "SWIFT банка-корреспондента", 0, 288.2, 491.14, 283.4),
      slot("bankCorrName", "extra.extra-bank-corr-name", "Наименование банка-корреспондента", 0, 288.2, 508.66, 283.4),
      slot("bankCorrAccount", "extra.extra-bank-corr-account", "Корреспондентский счет банка получателя (в банке-корреспонденте)", 0, 288.2, 528.1, 283.4),
      slot("bankRecipientAccount", "extra.extra-bank-account", "Счет получателя", 0, 288.2, 547.56, 283.4),
      slot("bankRecipientInn", "extra.extra-bank-inn", "ИНН получателя", 0, 288.2, 565.09, 283.4),
      slot("bankPersonalAccount", "extra.extra-bank-personal-account", "Лицевой счет", 0, 288.2, 582.61, 283.4),
      slot("bankOther", "extra.extra-bank-other", "Прочее", 0, 288.2, 600.13, 283.4)
    ]
  });
}(window.CRMDocumentEngine));
