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

  // ── «Сумма прописью» — one printed blank, and the line beneath it ─────────
  //
  // Both money forms print the amount twice: «цифрами» in a short blank and
  // «прописью» in a 106.5 pt one. A Russian amount in words does not fit
  // 106.5 pt at a readable size — «Сто двадцать пять тысяч рублей 50 копеек»
  // alone is 163.8 pt at 9 pt, and the largest amount either form can carry is
  // 493.7 pt — so the value continues onto a generated line in the blank band
  // beneath the row, the same way the accession form's tariff plans do.
  //
  // The continuation is capped at the 9 pt readability floor. The cap is what
  // makes the geometry exact: a value short enough for the printed blank is
  // drawn there at the row's own size, and the moment a value needs the second
  // line the whole value drops to 9 pt, whose glyph box these baselines are
  // measured for (8.02 pt above the baseline, 1.76 pt below).
  //
  // The bands are the measured empty ones, from
  //   python static-uikit/tools/qa/measure_page_layout.py --doc order-forms
  // p2 445.57–473.35 (27.78 pt — two lines) and p3 285.35–298.50 (13.15 pt —
  // one). Both sit directly under the «цифрами / прописью» caption, which is
  // where a person filling the form by hand would carry on writing.
  var WORDS_SIZE = 9;
  var WORDS_LINE_HEIGHT = 10.98;   // the pitch of both pages' body text

  function wordsContinuation(page, baselineTop, left, width) {
    return {
      page: page, left: left, baselineTop: baselineTop, width: width,
      maxLines: 1, maxFontSize: WORDS_SIZE,
      generated: true, reviewStatus: 'approved'
    };
  }

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
  // border tops 207.62–228.02 with a 0.48 pt rule and a 20.40 pt pitch.  The
  // three vertical rule centre-lines are 56.78 / 248.21 / 545.88. A full legal
  // company name
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
    rowLeft: 56.78, rowWidth: 489.10,
    borders: { left: false, right: false, top: false, bottom: false },
    columns: [56.78, 248.21, 545.88],
    line: {
      left: 249.55, width: 293.18,
      baselineOffset: 10.20,       // 217.82 − 207.62, the printed row's own
      ruleOffset: 20.40, ruleThickness: 0.48
    }
  };

  // Client block, identical on all three forms; only the column differs. Only
  // the trade form's name cell can grow: it is the one whose page has the
  // reserve and whose row boundary offers a clean cut.
  function clientBlock(prefix, page, left, width, tops, when, nameExpansion) {
    return [
      text(prefix + 'ClientName', 'field.client-full-name', page, left, tops[0], width,
           { required: true, showWhen: when, label: 'Наименование/ФИО клиента',
             overflowStrategy: nameExpansion ? 'expand-layout' : undefined,
             expansion: nameExpansion }),
      text(prefix + 'ContractNumberDate', 'extra.extra-contract-number-date',
           page, left, tops[1], width,
           { required: true, showWhen: when, label: 'Номер и дата договора с клиентом' }),
      text(prefix + 'BrokerageAccount', 'extra.extra-brokerage-account',
           page, left, tops[2], width,
           { required: true, showWhen: when, label: 'Брокерский счёт №' })
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
           page, valueLeft, dateTop, valueWidth,
           { showWhen: when, label: 'Номер и дата заявки' })
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
        // The printed fill-in rule of this row runs 423.77–481.16; «сделки»
        // ends at 421.74 and «(указать)» starts at 481.10. The slot is the rule.
        text('tradeKindOtherText', 'extra.extra-trade-kind-other', 0, 424.0, 325.25, 56.5, {
          showWhen: { source: 'extra.extra-trade-kind', equals: 'other' },
          label: 'Иной вид сделки (указать)'
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
        // Rule 430.66–505.68; «(указать)» starts at 505.62. Unreachable from
        // the wizard — conditional orders are not offered — but a slot that
        // exists has to be a correct one.
        text('orderKindConditionalText', 'extra.extra-order-kind-conditional',
             0, 431.0, 382.97, 74.0, {
          showWhen: { source: 'extra.extra-order-kind', equals: 'conditional' },
          label: 'Условное поручение (указать)'
        }),

        text('orderValidity', 'extra.extra-order-validity', 0, 249.55, 408.53, 293.18,
             { showWhen: TRADE, label: 'Срок действия заявки' }),
        text('settlementPeriod', 'extra.extra-settlement-period', 0, 249.55, 435.43, 293.18,
             { showWhen: TRADE, label: 'Срок расчётов' }),
        text('counterparty', 'extra.extra-counterparty', 0, 249.55, 462.31, 293.18,
             { showWhen: TRADE, label: 'Информация о контрагенте' }),
        text('otherInformation', 'extra.extra-order-other-info', 0, 249.55, 489.07, 293.18,
             { showWhen: TRADE, label: 'Иная информация' }),

        // «Параметры ценной бумаги»
        text('securityIssuer', 'extra.extra-security-issuer', 0, 249.55, 538.75, 293.18,
             { showWhen: TRADE, label: 'Наименование эмитента' }),
        text('securityType', 'extra.extra-security-type', 0, 249.55, 559.03, 293.18, {
          showWhen: TRADE, multiline: true, maxLines: 2, lineHeight: 9.5, fontSize: 9.0,
          label: 'Вид, категория (тип), выпуск, транш, серия, ISIN'
        }),
        text('securityQuantity', 'extra.extra-security-quantity', 0, 249.55, 581.95, 293.18,
             { showWhen: TRADE, label: 'Количество ценных бумаг' }),
        text('securityPrice', 'extra.extra-security-price', 0, 249.55, 605.0, 293.18,
             { showWhen: TRADE, label: 'Цена одной ценной бумаги / НКД / валюта цены' }),
        check('repoYes', 'extra.extra-repo-ccp', 'yes', 0, 252.05, 635.50, TRADE),
        check('repoNo', 'extra.extra-repo-ccp', 'no', 0, 277.97, 635.50, TRADE),
        text('tradeAmount', 'extra.extra-trade-amount', 0, 249.55, 659.14, 293.18,
             { showWhen: TRADE, label: 'Сумма сделки в валюте сделки' }),

        // «Параметры производного финансового инструмента»
        text('derivativeKind', 'extra.extra-derivative-kind', 0, 249.55, 693.58, 293.18,
             { showWhen: TRADE, label: 'Вид инструмента срочного рынка' }),
        text('derivativeName', 'extra.extra-derivative-name', 0, 249.55, 713.86, 293.18,
             { showWhen: TRADE, label: 'Наименование ПФИ' }),
        text('derivativeQuantity', 'extra.extra-derivative-quantity', 0, 249.55, 736.78, 293.18,
             { showWhen: TRADE, label: 'Количество ПФИ, шт. (лотов)' }),
        text('derivativePremium', 'extra.extra-derivative-premium', 0, 249.55, 759.72, 293.18,
             { showWhen: TRADE, label: 'Цена ПФИ (премия)' }),

        // page 2 — the rest of the derivative block and the currency block
        text('derivativeStrike', 'extra.extra-derivative-strike', 1, 249.55, 52.08, 293.50,
             { showWhen: TRADE, label: 'Цена исполнения страйк (для опционов)' }),
        text('derivativeExpiry', 'extra.extra-derivative-expiry', 1, 249.55, 72.36, 293.50, {
          showWhen: TRADE, format: 'dateRu',
          label: 'Дата исполнения (экспирации)'
        }),
        text('derivativeAmount', 'extra.extra-derivative-amount', 1, 249.55, 92.78, 293.50,
             { showWhen: TRADE, label: 'Сумма сделки (ПФИ)' }),

        text('fxInstrument', 'extra.extra-fx-instrument', 1, 249.55, 132.86, 293.50, {
          showWhen: TRADE, multiline: true, maxLines: 2, lineHeight: 9.5, fontSize: 9.0,
          label: 'Наименование валютного инструмента / инструмента драг. металлов'
        }),
        text('fxLots', 'extra.extra-fx-lots', 1, 249.55, 164.54, 293.50,
             { showWhen: TRADE, label: 'Количество лотов валютного инструмента' }),
        text('fxRate', 'extra.extra-fx-rate', 1, 249.55, 196.10, 293.50,
             { showWhen: TRADE, label: 'Курс валюты / цена сделки с драг. металлами' }),
        text('fxAmount', 'extra.extra-fx-amount', 1, 249.55, 231.26, 293.50,
             { showWhen: TRADE, label: 'Сумма сделки в валюте котировки' }),
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
        // «Денежные средства в сумме ___ ( ___ ) ( ☐ RUB … )». The printed ink
        // of this row is: «…в сумме» to 192.52, «(» 247.97–251.29,
        // «)» 360.43–363.75. Both blanks are what is between them, and both
        // are narrow — the source form leaves a handwriting-sized gap. A
        // «прописью» wording that does not fit is reported by the preflight
        // with this field's label; nothing is dropped or drawn over the form.
        text('moveAmountFigures', 'extra.extra-move-amount', 2, 194.5, 433.63, 52.5, {
          showWhen: MOVE, align: 'center', label: 'Сумма перевода (цифрами)'
        }),
        text('moveAmountWords', 'extra.extra-move-amount-words', 2, 253.0, 433.63, 106.5, {
          showWhen: MOVE, align: 'center', label: 'Сумма перевода (прописью)',
          lineHeight: WORDS_LINE_HEIGHT,
          overflowStrategy: 'flow',
          flowRegions: [
            { page: 2, left: 253.0, baselineTop: 433.63, width: 106.5, maxLines: 1 },
            // Two lines fit the 27.78 pt band; the widest amount this form can
            // print needs one of them.
            wordsContinuation(2, 454.20, 74.18, 472.42),
            wordsContinuation(2, 465.18, 74.18, 472.42)
          ]
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
        // Printed ink of this row: «В сумме:» to 131.63, «(» 247.97–251.29,
        // «)» 360.43–363.75 — the same pair of blanks as the transfer form.
        text('payoutAmount', 'extra.extra-payout-amount', 3, 134.0, 273.29, 112.5, {
          align: 'center', label: 'Сумма вывода (цифрами)',
          showWhen: { source: 'extra.extra-payout-amount-mode', equals: 'amount' }
        }),
        text('payoutAmountWords', 'extra.extra-payout-amount-words', 3, 253.0, 273.29, 106.5, {
          align: 'center', label: 'Сумма вывода (прописью)',
          lineHeight: WORDS_LINE_HEIGHT,
          showWhen: { source: 'extra.extra-payout-amount-mode', equals: 'amount' },
          overflowStrategy: 'flow',
          flowRegions: [
            { page: 3, left: 253.0, baselineTop: 273.29, width: 106.5, maxLines: 1 },
            // One line — the band before «С торговой площадки:» is 13.15 pt.
            // 464.6 pt of it against the 411.5 pt the largest realistic amount
            // needs after the printed blank has taken its share.
            wordsContinuation(3, 293.97, 81.98, 464.62)
          ]
        }),

        check('payoutFromStock', 'extra.extra-payout-from', 'stock', 3, 81.98, 319.49, PAYOUT),
        check('payoutFromCurrency', 'extra.extra-payout-from', 'currency', 3, 81.98, 331.61, PAYOUT),
        check('payoutFromDerivatives', 'extra.extra-payout-from', 'derivatives', 3, 81.98, 343.85, PAYOUT),
        check('payoutFromOtc', 'extra.extra-payout-from', 'otc', 3, 81.98, 355.97, PAYOUT),

        // «Вывести по следующим банковским реквизитам»
        text('bankRecipient', 'extra.extra-bank-recipient', 3, 259.95, 399.17, 283.10,
             { showWhen: PAYOUT, label: 'Получатель (наименование/ФИО)' }),
        text('bankBic', 'extra.extra-bank-bic', 3, 259.95, 416.59, 283.10,
             { showWhen: PAYOUT, label: 'БИК/SWIFT банка получателя' }),
        text('bankName', 'extra.extra-bank-name', 3, 259.95, 434.11, 283.10,
             { showWhen: PAYOUT, label: 'Наименование банка получателя' }),
        text('bankCorrSwift', 'extra.extra-bank-corr-swift', 3, 259.95, 451.75, 283.10,
             { showWhen: PAYOUT, label: 'SWIFT банка-корреспондента' }),
        text('bankCorrName', 'extra.extra-bank-corr-name', 3, 259.95, 469.27, 283.10,
             { showWhen: PAYOUT, label: 'Наименование банка-корреспондента' }),
        text('bankCorrAccount', 'extra.extra-bank-corr-account', 3, 259.95, 487.39, 283.10,
             { showWhen: PAYOUT, label: 'Корреспондентский счёт банка получателя' }),
        text('bankRecipientAccount', 'extra.extra-bank-account', 3, 259.95, 508.15, 283.10,
             { showWhen: PAYOUT, label: 'Счёт получателя' }),
        text('bankRecipientInn', 'extra.extra-bank-inn', 3, 259.95, 525.55, 283.10,
             { showWhen: PAYOUT, label: 'ИНН получателя' }),
        text('bankPersonalAccount', 'extra.extra-bank-personal-account', 3, 259.95, 543.19, 283.10,
             { showWhen: PAYOUT, label: 'Лицевой счёт' }),
        text('bankOther', 'extra.extra-bank-other', 3, 259.95, 560.71, 283.10,
             { showWhen: PAYOUT, label: 'Прочее' })
      ]
    )
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
