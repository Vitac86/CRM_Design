// Official regulation effective 19 November 2026, physical pages 124.
// Coordinates are points from the top left of the extracted pages.
(function (engine) {
  'use strict';
  var slot = engine.orderMap.slot;
  var mark = engine.orderMap.mark;
  var paragraph = engine.orderMap.cashParagraph;
  function reviewed(first, last, sha256) {
    return {firstBlock: first, lastBlock: last, expectedBlockCount: last - first + 1,
      expectedPageBlockCount: 238, expectedSha256: sha256, reviewStatus: 'approved',
      expectedTemplateSha256: '5301e5ce8bf22900d8871fe18ad31767437fe915a891839580376fb78f5d7c8d'};
  }
  engine.orderMap.register({
    id: "order-venue-transfer",
    title: "Поручение на перевод средств между торговыми площадками",
    templateUrl: "../assets/document-pdf-templates/order-venue-transfer.pdf",
    outputFilename: "poruchenie-perevod-ploshchadki.pdf",
    expectedPages: 1,
    appliesTo: ["individual", "company"],
    fonts: {legalSerif: "../assets/fonts/pdf/LiberationSerif-Regular.ttf",
      legalSerifItalic: "../assets/fonts/pdf/LiberationSerif-Italic.ttf"},
    // The unbroken figure has its own row. The words finish on the original
    // underline, directly before the original closing parenthesis and currency boxes.
    pageLayout: {0: {anchors:['transfer-words-line'], bodyBottom:770, shiftToTop:796, bottomClearance:24}},
    wordFlowBlocks: [
      paragraph('transfer-figures-line', {left:84.5, baselineTop:513.1, width:475, initialLineCount:1},
        '1. Денежные средства в сумме', [
          {type:'static', text:'1.'}, {type:'spacer', width:10.5},
          {type:'static', text:'Денежные средства в сумме '},
          {type:'fieldRef', fieldId:'moveAmountFigures', keepTogether:true,
            decoration:{underline:true, minWidth:84, thickness:0.48, offset:1.5}}
        ], reviewed(185,194,'2f789a0f7f0481e531e29c4a900d756060010a9b06488151badd8b907a3eb162')),
      paragraph('transfer-words-line', {left:103, baselineTop:529.1, width:284, initialLineCount:3, alignToBottom:true},
        '(', [{type:'static', text:'(', keepWithNext:true},
          {type:'fieldRef', fieldId:'moveAmountWords', keepTrailingNumberWithUnit:true}],
        reviewed(195,196,'5ad77b1eeafef7c0fef9f40bd564ccdd2fc7158d773a7649829105196e893196'), {overflowStrategy:'expand-layout',
          expansion:{page:0, insertionTop:540, shiftFromTop:540, rowHeight:10.5, maxExtraRows:3,
            lineStyle:'none', moveTopLevelPaths:true, reviewStatus:'approved'}}),
      paragraph('transfer-figures-caption', {left:214, baselineTop:521.5, width:85, initialLineCount:1},
        'цифрами', [{type:'static', text:'цифрами', font:'legalSerifItalic'}],
        reviewed(220,220,'61a509fc5285415c5e693725038989dbda1f694bb3623a20d7ac520ea3ac8198'), {alignment:'center'}),
      paragraph('transfer-words-caption', {left:103, baselineTop:550.95, width:285.73, initialLineCount:2},
        'прописью', [{type:'spacer', width:285.73, decoration:{underline:true, thickness:0.48, offset:1.7}},
          {type:'lineBreak'}, {type:'static', text:'прописью', font:'legalSerifItalic'}],
        reviewed(223,223,'f281abbd790b69229d4da0e2d6636f42735c92a669dd280d17730821f4f68a1f'), {alignment:'center'})
    ],
    fields: [
      mark("movePrimary", "extra.extra-submission-kind", "primary", "Первичная подача заявки", 0, 109.79, 78.83, 7.7),
      mark("moveCancellation", "extra.extra-submission-kind", "cancellation", "Отмена ранее поданной заявки", 0, 109.79, 93.23, 7.7),
      slot("moveOrderNumber", "extra.extra-order-number", "Первичная подача заявки №", 0, 241.8, 78.28, 32, {fontSize: 9}),
      slot("moveOrderDay", "extra.extra-order-day", "от «____» (день)", 0, 292.4, 78.28, 18, {fontSize: 9}),
      slot("moveOrderMonth", "extra.extra-order-month", "месяц", 0, 319.4, 78.28, 26, {fontSize: 9}),
      slot("moveOrderYear", "extra.extra-order-year", "20______г. (год)", 0, 358.8, 78.28, 27, {fontSize: 9}),
      slot("moveClientName", "field.client-full-name", "Наименование/Фамилия, имя, отчество", 0, 279.12, 209.61, 292.46, {required: true, fontSize: 9, multiline: true, maxLines: 2, lineHeight: 9.5}),
      slot("moveContractNumberDate", "extra.extra-contract-number-date", "Номер и дата договора с клиентом", 0, 279.12, 234.33, 292.46, {required: true, fontSize: 10}),
      slot("moveBrokerageAccount", "extra.extra-brokerage-account", "Брокерский счет №", 0, 279.12, 254.73, 292.46, {required: true, fontSize: 10}),
      mark("move-from-stock", "extra.extra-move-from", "stock", "С торговой площадки · торговая система ПАО Московская Биржа (фондовый рынок и рынок депозитов);", 0, 102.83, 307.87, 8.6),
      mark("move-from-currency", "extra.extra-move-from", "currency", "С торговой площадки · торговая система ПАО Московская Биржа (Валютный рынок и рынок драгоценных металлов);", 0, 102.83, 320.11, 8.6),
      mark("move-from-derivatives", "extra.extra-move-from", "derivatives", "С торговой площадки · торговая система ПАО Московская Биржа (Срочный рынок);", 0, 102.83, 332.11, 8.6),
      mark("move-from-spb-stock", "extra.extra-move-from", "spb-stock", "С торговой площадки · торговая система ПАО СПБ биржа (Фондовый рынок);", 0, 102.83, 344.35, 8.6),
      mark("move-from-spb-derivatives", "extra.extra-move-from", "spb-derivatives", "С торговой площадки · торговая система ПАО СПБ биржа (Срочный рынок);", 0, 102.83, 356.59, 8.6),
      mark("move-from-otc", "extra.extra-move-from", "otc", "С торговой площадки · внебиржевой рынок;", 0, 102.83, 368.59, 8.6),
      mark("move-from-other", "extra.extra-move-from", "other", "С торговой площадки · иное ___;", 0, 102.83, 380.85, 8.6),
      slot("move-from-other-name", "extra.extra-move-from-other-name", "иное (указать)", 0, 140, 380.2, 310, {showWhen: {source: "extra.extra-move-from", equals: "other"}}),
      mark("move-to-stock", "extra.extra-move-to", "stock", "На торговую площадку · торговая система ПАО Московская Биржа (фондовый рынок и рынок депозитов);", 0, 102.83, 429.33, 8.6),
      mark("move-to-currency", "extra.extra-move-to", "currency", "На торговую площадку · торговая система ПАО Московская Биржа (Валютный рынок и рынок драгоценных металлов);", 0, 102.83, 441.57, 8.6),
      mark("move-to-derivatives", "extra.extra-move-to", "derivatives", "На торговую площадку · торговая система ПАО Московская Биржа (Срочный рынок);", 0, 102.83, 453.81, 8.6),
      mark("move-to-spb-stock", "extra.extra-move-to", "spb-stock", "На торговую площадку · торговая система ПАО СПБ биржа (Фондовый рынок);", 0, 102.83, 465.83, 8.6),
      mark("move-to-spb-derivatives", "extra.extra-move-to", "spb-derivatives", "На торговую площадку · торговая система ПАО СПБ биржа (Срочный рынок);", 0, 102.83, 478.07, 8.6),
      mark("move-to-otc", "extra.extra-move-to", "otc", "На торговую площадку · внебиржевой рынок;", 0, 102.83, 490.31, 8.6),
      mark("move-to-other", "extra.extra-move-to", "other", "На торговую площадку · иное ___;", 0, 102.83, 502.31, 8.6),
      slot("move-to-other-name", "extra.extra-move-to-other-name", "иное (указать)", 0, 140, 501.66, 310, {showWhen: {source: "extra.extra-move-to", equals: "other"}}),
      mark("moveCurrencyRUB", "extra.extra-move-currency", "RUB", "RUB", 0, 400.55, 551.06, 7.7),
      mark("moveCurrencyUSD", "extra.extra-move-currency", "USD", "USD", 0, 433.19, 551.06, 7.7),
      mark("moveCurrencyEUR", "extra.extra-move-currency", "EUR", "EUR", 0, 465.61, 551.06, 7.7),
      mark("moveCurrencyCNY", "extra.extra-move-currency", "CNY", "CNY", 0, 497.77, 551.06, 7.7),
      mark("moveCurrencyother", "extra.extra-move-currency", "other", "☐ (без подписи)", 0, 533.32, 551.06, 7.7),
      slot("moveAmountFigures", "extra.extra-move-amount", "цифрами", 0, 224, 550.1, 50.5, {fontSize:9, layoutMode:"flow-reference", flowBlockId:"transfer-figures-line"}),
      slot("moveAmountWords", "extra.extra-move-amount-words", "прописью", 0, 282.4, 550.1, 105.1, {fontSize:9, layoutMode:"flow-reference", flowBlockId:"transfer-words-line"})
    ]
  });
}(window.CRMDocumentEngine));
