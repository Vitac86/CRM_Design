// Field map — ПРИЛОЖЕНИЕ 7 К РЕГЛАМЕНТУ. ФОРМЫ ПОРУЧЕНИЙ.
//
// Base template : assets/document-pdf-templates/order-forms.pdf
// Source Word   : Z:\6. Управление по работе с клиентами\Формы документов\
//                 для оцифровки\ПРИЛОЖЕНИЕ 7 К РЕГЛАМЕНТУ.
//                 ФОРМЫ ПОРУЧЕНИЙ_____[1].docx
// Source SHA-256: adf2f86d974aff35b2c3b7adab6620dac9b73f7c0006c208259505d7c3b2fa88
// PDF SHA-256   : 24e593d1df7f5438252814d31a64e1b8516cce61c76127dd468606f829de17b1
// Pages         : 4 (A4, 595.56 × 842.04 pt; 0 AcroForm fields/widgets)
//
// THE FILE HOLDS THREE SEPARATE ORDER FORMS, each self-contained and each
// ending in its own «Заполняется ООО «Инвестика»» block. Their titles are
// taken verbatim from the source:
//   pages 1–2  «Поручение на совершение сделки»
//   page  3    «Поручение на операции с денежными средствами
//               (перевод денежных средств между торговыми площадками)»
//   page  4    «Поручение на операции с денежными средствами
//               (вывод денежных средств на банковский счет)»
//
// One submission is one order, so «Тип поручения» is a required mutually
// exclusive choice; only the selected form is filled and the other two stay
// completely blank. All four pages are always emitted — the authoritative file
// is one document and pages are never removed.
//
// Each form repeats the same «Первичная подача заявки» / «Отмена ранее
// поданной заявки» pair, which is mutually exclusive within that form, and the
// same client block, which comes from the subject card.
//
// LEFT BLANK BY DESIGN — every «Заполняется ООО «Инвестика»» block on all four
// pages (регистрационный номер поручения, дата и время приёма, подпись
// уполномоченного сотрудника), plus «ПОДПИСЬ ИНИЦИАТОРА ОПЕРАЦИИ» signature
// rules and М.П. The «(указать)» captions after «Иной вид сделки» and
// «Условное» are printed prose, and the trailing «☐» before «)» in each
// currency row is the "other currency" box.

(function (global) {
  'use strict';

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 10;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller

  // Rows that physically cannot take BODY. Each value is the largest
  // half-point step the measured room allows, floored at MIN.
  var ROW_SIZE = {
    counterparty: 12,                // 23.16 pt of room
    fxAmount: 12,                    // 15.53 pt of room
    fxInstrument: 9,                 // 9.43 pt of room
    moveAmountFigures: 12,           // 14.05 pt of room
    moveAmountWords: 12,             // 14.05 pt of room
    moveClientName: 10.5,            // 10.91 pt of room
    moveContractNumberDate: 10.5,    // 10.91 pt of room
    moveOrderNumberDate: 10.5,       // 10.54 pt of room
    orderKindConditionalText: 12,    // 21.08 pt of room
    orderValidity: 12,               // 23.03 pt of room
    otherInformation: 12,            // 23.03 pt of room
    payoutAmount: 11,                // 11.19 pt of room
    payoutAmountWords: 12,           // 14.61 pt of room
    payoutClientName: 10.5,          // 10.91 pt of room
    payoutContractNumberDate: 10.5,  // 10.91 pt of room
    payoutOrderNumberDate: 10.5,     // 10.67 pt of room
    settlementPeriod: 12,            // 23.05 pt of room
    tradeAmount: 12,                 // 16.18 pt of room
    tradeClientName: 10.5,           // 10.91 pt of room
    tradeContractNumberDate: 10.5,   // 10.91 pt of room
    tradeKindOtherText: 12,          // 24.51 pt of room
    tradeOrderNumberDate: 12,        // 23.04 pt of room
  };

  // «Тип поручения» — one of the three forms in the file.
  var TRADE = { source: 'extra.extra-order-type', equals: 'trade' };
  var MOVE = { source: 'extra.extra-order-type', equals: 'transfer' };
  var PAYOUT = { source: 'extra.extra-order-type', equals: 'withdrawal' };

  function text(id, source, page, left, baselineTop, width, options) {
    var o = options || {};
    return {
      id: id,
      source: source,
      page: page,
      left: left,
      baselineTop: baselineTop,
      width: width,
      font: 'legalSerif',
      fontSize: o.fontSize || ROW_SIZE[id] || BODY,
      minFontSize: o.minFontSize != null ? o.minFontSize : MIN,
      align: o.align || 'left',
      required: !!o.required,
      optional: o.optional !== false,
      multiline: !!o.multiline,
      maxLines: o.maxLines,
      lineHeight: o.lineHeight,
      lineHeightRatio: o.lineHeightRatio,
      format: o.format,
      fallbacks: o.fallbacks,
      // Continuation regions and print-override permission are part of the
      // production schema; the helper must not drop them.
      flowRegions: o.flowRegions,
      expansion: o.expansion,
      overflowStrategy: o.overflowStrategy,
      allowPrintOverride: o.allowPrintOverride,
      tokenBreak: o.tokenBreak,
      label: o.label,
      showWhen: o.showWhen
    };
  }

  function check(id, source, equals, page, left, baselineTop, showWhen) {
    var f = {
      id: id,
      type: 'check',
      source: source,
      page: page,
      left: left,
      baselineTop: baselineTop,
      glyphSize: 9.0,
      optional: true
    };
    if (equals !== undefined) f.equals = equals;
    if (showWhen) f.showWhen = showWhen;
    return f;
  }

  // ── A generated table row, measured from this form ────────────────────────
  //
  //   python static-uikit/tools/qa/measure_page_layout.py --doc order-forms
  //
  // The client block of the trade order is a table: the «Наименование» row runs
  // 208.10–228.02 with a 0.48 pt border under it, a 20.40 pt pitch, verticals at
  // 56.54/57.02, 247.97/248.45 and 545.64/546.12. A full legal company name
  // needs more than the one line the cell holds, and a company name is not
  // something a manager may shorten.
  //
  // 228.02 is the clean cut: the row's verticals stop there and its bottom
  // border sits just under them, so inserting above the border lets that border
  // travel down and close the new row — the inserted row draws only the
  // verticals, continuing exactly where the printed ones stop.
  var TRADE_NAME_ROW = {
    page: 0, insertionTop: 228.02, shiftFromTop: 228.02,
    rowHeight: 20.40, maxExtraRows: 2, maxFontSize: 10.5,
    lineStyle: 'table-row', reviewStatus: 'approved',
    rowLeft: 56.54, rowWidth: 489.58,
    borders: { left: false, right: false, top: false, bottom: false },
    columns: [56.54, 57.02, 247.97, 248.45, 545.64, 546.12],
    line: {
      left: 249.55, width: 293.18,
      baselineOffset: 9.72,        // 217.82 − 208.10, the printed row's own
      ruleOffset: 20.40, ruleThickness: 0.48
    }
  };

  // Client block, identical on all three forms; only the column differs. Only
  // the trade form's name cell can grow: it is the one whose page has the
  // reserve and whose row boundary offers a clean cut.
  function clientBlock(prefix, page, left, width, tops, when, nameExpansion) {
    return [
      text(prefix + 'ClientName', 'field.client-full-name', page, left, tops[0], width,
           { required: true, showWhen: when,
             overflowStrategy: nameExpansion ? 'expand-layout' : undefined,
             expansion: nameExpansion }),
      text(prefix + 'ContractNumberDate', 'extra.extra-contract-number-date',
           page, left, tops[1], width, { required: true, showWhen: when }),
      text(prefix + 'BrokerageAccount', 'extra.extra-brokerage-account',
           page, left, tops[2], width, { required: true, showWhen: when })
    ];
  }

  // «Первичная подача заявки № ___ от «__» ___ 20__ г.» /
  // «Отмена ранее поданной заявки № ___ от «__» ___ 20__ г.» + «Дата отмены».
  function submissionBlock(prefix, page, boxLeft, primaryTop, cancelTop, dateTop,
                           valueLeft, valueWidth, when) {
    return [
      check(prefix + 'Primary', 'extra.extra-submission-kind', 'primary',
            page, boxLeft, primaryTop, when),
      check(prefix + 'Cancellation', 'extra.extra-submission-kind', 'cancellation',
            page, boxLeft, cancelTop, when),
      text(prefix + 'OrderNumberDate', 'extra.extra-order-number-date',
           page, valueLeft, dateTop, valueWidth, { showWhen: when })
    ];
  }

  var TEMPLATE = {
    id: 'order-forms',
    title: 'Поручение (формы поручений)',
    templateUrl: '../assets/document-pdf-templates/order-forms.pdf',
    outputFilename: 'poruchenie.pdf',
    expectedPages: 4,
    appliesTo: ['individual', 'company'],

    // Page 1 of the trade order: the table ends at 773.64 on an 842.04 pt page.
    // Keeping a 25 pt margin leaves 43.28 pt — two inserted 20.40 pt rows.
    pageLayout: {
      0: {
        fixedHeaderUntil: 0,
        bodyBottom: 773.64,
        fixedFooterFrom: null,
        shiftToTop: 830.0,
        bottomClearance: 25.0,
        compaction: [],
        anchors: ['tradeClientName']
      }
    },

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [].concat(
      // ═══════════ FORM 1 — «Поручение на совершение сделки» (pages 1–2) ═══
      submissionBlock('trade', 0, 81.26, 96.02, 112.58, 135.26, 249.55, 293.18, TRADE),
      clientBlock('trade', 0, 249.55, 293.18, [217.82, 238.22, 257.81], TRADE,
                  TRADE_NAME_ROW),
      [
        // «Вид сделки»: ☐ Покупка ☐ Продажа ☐ Иной вид сделки ____
        check('tradeKindBuy', 'extra.extra-trade-kind', 'buy', 0, 255.65, 325.25, TRADE),
        check('tradeKindSell', 'extra.extra-trade-kind', 'sell', 0, 301.27, 325.25, TRADE),
        check('tradeKindOther', 'extra.extra-trade-kind', 'other', 0, 346.99, 325.25, TRADE),
        text('tradeKindOtherText', 'extra.extra-trade-kind-other', 0, 404.0, 325.25, 96.0, {
          showWhen: { source: 'extra.extra-trade-kind', equals: 'other' }
        }),

        // «Вид рынка»: ☐ Фондовый ☐ Валютный ☐ Срочный ☐ Внебиржевой
        check('marketStock', 'extra.extra-order-market', 'stock', 0, 255.65, 355.49, TRADE),
        check('marketCurrency', 'extra.extra-order-market', 'currency', 0, 309.79, 355.49, TRADE),
        check('marketDerivatives', 'extra.extra-order-market', 'derivatives', 0, 364.03, 355.49, TRADE),
        check('marketOtc', 'extra.extra-order-market', 'otc', 0, 415.30, 355.49, TRADE),

        // «Вид поручения»: ☐ Рыночное ☐ Лимитированное ☐ Условное ____
        check('orderKindMarket', 'extra.extra-order-kind', 'market', 0, 255.65, 382.97, TRADE),
        check('orderKindLimit', 'extra.extra-order-kind', 'limit', 0, 306.31, 382.97, TRADE),
        check('orderKindConditional', 'extra.extra-order-kind', 'conditional', 0, 382.51, 382.97, TRADE),
        text('orderKindConditionalText', 'extra.extra-order-kind-conditional',
             0, 438.0, 382.97, 82.0, {
          showWhen: { source: 'extra.extra-order-kind', equals: 'conditional' }
        }),

        text('orderValidity', 'extra.extra-order-validity', 0, 249.55, 408.53, 293.18, { showWhen: TRADE }),
        text('settlementPeriod', 'extra.extra-settlement-period', 0, 249.55, 435.43, 293.18, { showWhen: TRADE }),
        text('counterparty', 'extra.extra-counterparty', 0, 249.55, 462.31, 293.18, { showWhen: TRADE }),
        text('otherInformation', 'extra.extra-order-other-info', 0, 249.55, 489.07, 293.18, { showWhen: TRADE }),

        // «Параметры ценной бумаги»
        text('securityIssuer', 'extra.extra-security-issuer', 0, 249.55, 538.75, 293.18, { showWhen: TRADE }),
        text('securityType', 'extra.extra-security-type', 0, 249.55, 559.03, 293.18, {
          showWhen: TRADE, multiline: true, maxLines: 2, lineHeight: 9.5, fontSize: 9.0
        }),
        text('securityQuantity', 'extra.extra-security-quantity', 0, 249.55, 581.95, 293.18, { showWhen: TRADE }),
        text('securityPrice', 'extra.extra-security-price', 0, 249.55, 605.0, 293.18, { showWhen: TRADE }),
        check('repoYes', 'extra.extra-repo-ccp', 'yes', 0, 252.05, 635.50, TRADE),
        check('repoNo', 'extra.extra-repo-ccp', 'no', 0, 277.97, 635.50, TRADE),
        text('tradeAmount', 'extra.extra-trade-amount', 0, 249.55, 659.14, 293.18, { showWhen: TRADE }),

        // «Параметры производного финансового инструмента»
        text('derivativeKind', 'extra.extra-derivative-kind', 0, 249.55, 693.58, 293.18, { showWhen: TRADE }),
        text('derivativeName', 'extra.extra-derivative-name', 0, 249.55, 713.86, 293.18, { showWhen: TRADE }),
        text('derivativeQuantity', 'extra.extra-derivative-quantity', 0, 249.55, 736.78, 293.18, { showWhen: TRADE }),
        text('derivativePremium', 'extra.extra-derivative-premium', 0, 249.55, 759.72, 293.18, { showWhen: TRADE }),

        // page 2 — the rest of the derivative block and the currency block
        text('derivativeStrike', 'extra.extra-derivative-strike', 1, 249.55, 52.08, 293.50, { showWhen: TRADE }),
        text('derivativeExpiry', 'extra.extra-derivative-expiry', 1, 249.55, 72.36, 293.50, {
          showWhen: TRADE, format: 'dateRu'
        }),
        text('derivativeAmount', 'extra.extra-derivative-amount', 1, 249.55, 92.78, 293.50, { showWhen: TRADE }),

        text('fxInstrument', 'extra.extra-fx-instrument', 1, 249.55, 132.86, 293.50, {
          showWhen: TRADE, multiline: true, maxLines: 2, lineHeight: 9.5, fontSize: 9.0
        }),
        text('fxLots', 'extra.extra-fx-lots', 1, 249.55, 164.54, 293.50, { showWhen: TRADE }),
        text('fxRate', 'extra.extra-fx-rate', 1, 249.55, 196.10, 293.50, { showWhen: TRADE }),
        text('fxAmount', 'extra.extra-fx-amount', 1, 249.55, 231.26, 293.50, { showWhen: TRADE }),
        check('fxSwapYes', 'extra.extra-fx-swap-ccp', 'yes', 1, 252.05, 257.09, TRADE),
        check('fxSwapNo', 'extra.extra-fx-swap-ccp', 'no', 1, 276.77, 257.09, TRADE),

        // Independent acknowledgement, not part of any exclusive group.
        check('uncoveredPositionAck', 'check.order-uncovered-ack', true, 1, 57.02, 278.69, TRADE)
      ],

      // ═══ FORM 2 — «перевод денежных средств между торговыми площадками» ═══
      submissionBlock('move', 2, 81.26, 56.28, 72.48, 84.02, 251.20, 291.85, MOVE),
      clientBlock('move', 2, 251.20, 291.85, [178.10, 198.50, 218.06], MOVE),
      [
        // «С торговой площадки:» — four mutually exclusive venues.
        check('moveFromStock', 'extra.extra-move-from', 'stock', 2, 74.18, 275.69, MOVE),
        check('moveFromCurrency', 'extra.extra-move-from', 'currency', 2, 74.18, 287.81, MOVE),
        check('moveFromDerivatives', 'extra.extra-move-from', 'derivatives', 2, 74.18, 299.93, MOVE),
        check('moveFromOtc', 'extra.extra-move-from', 'otc', 2, 74.18, 312.05, MOVE),
        // «На торговую площадку:» — the same four.
        check('moveToStock', 'extra.extra-move-to', 'stock', 2, 74.18, 360.65, MOVE),
        check('moveToCurrency', 'extra.extra-move-to', 'currency', 2, 74.18, 372.89, MOVE),
        check('moveToDerivatives', 'extra.extra-move-to', 'derivatives', 2, 74.18, 385.01, MOVE),
        check('moveToOtc', 'extra.extra-move-to', 'otc', 2, 74.18, 397.13, MOVE),

        // «Денежные средства в сумме (цифрами) (прописью)» + currency boxes.
        text('moveAmountFigures', 'extra.extra-move-amount', 2, 160.0, 433.63, 88.0, {
          showWhen: MOVE, align: 'center'
        }),
        text('moveAmountWords', 'extra.extra-move-amount-words', 2, 252.0, 433.63, 112.0, {
          showWhen: MOVE, align: 'center'
        }),
        check('moveCurRub', 'extra.extra-move-currency', 'RUB', 2, 371.95, 433.63, MOVE),
        check('moveCurUsd', 'extra.extra-move-currency', 'USD', 2, 404.62, 433.63, MOVE),
        check('moveCurEur', 'extra.extra-move-currency', 'EURO', 2, 436.90, 433.63, MOVE),
        check('moveCurCny', 'extra.extra-move-currency', 'CNY', 2, 476.50, 433.63, MOVE),
        check('moveCurOther', 'extra.extra-move-currency', 'other', 2, 512.04, 433.63, MOVE)
      ],

      // ═══ FORM 3 — «вывод денежных средств на банковский счет» ═══════════
      submissionBlock('payout', 3, 81.26, 53.28, 69.48, 81.14, 259.95, 283.10, PAYOUT),
      clientBlock('payout', 3, 259.95, 283.10, [163.70, 183.98, 203.66], PAYOUT),
      [
        check('payoutCurRub', 'extra.extra-payout-currency', 'RUB', 3, 178.25, 236.90, PAYOUT),
        check('payoutCurUsd', 'extra.extra-payout-currency', 'USD', 3, 211.01, 236.90, PAYOUT),
        check('payoutCurEur', 'extra.extra-payout-currency', 'EURO', 3, 243.29, 236.90, PAYOUT),
        check('payoutCurCny', 'extra.extra-payout-currency', 'CNY', 3, 282.91, 236.90, PAYOUT),
        check('payoutCurOther', 'extra.extra-payout-currency', 'other', 3, 318.31, 236.90, PAYOUT),

        // «☐ В размере свободного остатка» / «☐ В сумме: ( )»
        check('payoutWholeBalance', 'extra.extra-payout-amount-mode', 'whole',
              3, 81.98, 261.17, PAYOUT),
        check('payoutFixedAmount', 'extra.extra-payout-amount-mode', 'amount',
              3, 81.98, 273.29, PAYOUT),
        text('payoutAmount', 'extra.extra-payout-amount', 3, 150.0, 273.29, 110.0, {
          align: 'center',
          showWhen: { source: 'extra.extra-payout-amount-mode', equals: 'amount' }
        }),
        text('payoutAmountWords', 'extra.extra-payout-amount-words', 3, 268.0, 273.29, 130.0, {
          align: 'center',
          showWhen: { source: 'extra.extra-payout-amount-mode', equals: 'amount' }
        }),

        check('payoutFromStock', 'extra.extra-payout-from', 'stock', 3, 81.98, 319.49, PAYOUT),
        check('payoutFromCurrency', 'extra.extra-payout-from', 'currency', 3, 81.98, 331.61, PAYOUT),
        check('payoutFromDerivatives', 'extra.extra-payout-from', 'derivatives', 3, 81.98, 343.85, PAYOUT),
        check('payoutFromOtc', 'extra.extra-payout-from', 'otc', 3, 81.98, 355.97, PAYOUT),

        // «Вывести по следующим банковским реквизитам»
        text('bankRecipient', 'extra.extra-bank-recipient', 3, 259.95, 399.17, 283.10, { showWhen: PAYOUT }),
        text('bankBic', 'extra.extra-bank-bic', 3, 259.95, 416.59, 283.10, { showWhen: PAYOUT }),
        text('bankName', 'extra.extra-bank-name', 3, 259.95, 434.11, 283.10, { showWhen: PAYOUT }),
        text('bankCorrSwift', 'extra.extra-bank-corr-swift', 3, 259.95, 451.75, 283.10, { showWhen: PAYOUT }),
        text('bankCorrName', 'extra.extra-bank-corr-name', 3, 259.95, 469.27, 283.10, { showWhen: PAYOUT }),
        text('bankCorrAccount', 'extra.extra-bank-corr-account', 3, 259.95, 487.39, 283.10, { showWhen: PAYOUT }),
        text('bankRecipientAccount', 'extra.extra-bank-account', 3, 259.95, 508.15, 283.10, { showWhen: PAYOUT }),
        text('bankRecipientInn', 'extra.extra-bank-inn', 3, 259.95, 525.55, 283.10, { showWhen: PAYOUT }),
        text('bankPersonalAccount', 'extra.extra-bank-personal-account', 3, 259.95, 543.19, 283.10, { showWhen: PAYOUT }),
        text('bankOther', 'extra.extra-bank-other', 3, 259.95, 560.71, 283.10, { showWhen: PAYOUT })
      ]
    )
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
