// Field map — ПРИЛОЖЕНИЕ 3 К РЕГЛАМЕНТУ. УВЕДОМЛЕНИЕ ОБ ОТКРЫТИИ
// БРОКЕРСКОГО/ДЕПОЗИТАРНОГО СЧЕТА.
//
// Base template : assets/document-pdf-templates/account-opening-notice.pdf
// Source Word   : Z:\6. Управление по работе с клиентами\Формы документов\
//                 для оцифровки\ПРИЛОЖЕНИЕ 3 К РЕГЛАМЕНТУ. УВЕДОМЛЕНИЕ ОБ
//                 ОТКРЫТИИ БРОКЕРСКОГО-ДЕПОЗИТАРНОГО СЧЕТА.docx
// Source SHA-256: 600f6fb134bd0117093ccec690d979a4b54e26475bc93c736d3557c609d56edc
// PDF SHA-256   : d46681cf43b357112a73a83bc01d1668036daceedc0ef9881ad63994a6f8a834
// Pages         : 2 (A4, 595.32 × 841.92 pt; 0 AcroForm fields/widgets/annots)
//
// Not to be confused with «Приложение № 3» of the qualification regulation
// (`qualification-notice`).
//
// STATIC CONTENT — printed into the authoritative template, never overlaid:
//   §5 broker requisites  — Получатель «ООО «Инвестика»», ИНН 7802953900,
//     Р/сч 40701810700000002900, Банк АО "Райффайзенбанк",
//     К/сч 30101810200000000700, БИК 044525700.
//   Page 2 депо tables    — Торговый раздел № счета HL2509080091, Неторговый
//     раздел № счета ML2508290147, Код/идентификатор MC0742000000, Раздел
//     основной 00000000000000000, Раздел торговый 36MC0742000000F00, Место
//     хранения «НКО АО НРД», Междепозитарный договор «№7420/ДНД от 29 августа
//     2025 г.», and the same agreement repeated under «Основание для перевода».
// These are Investica's own constants and are identical on every generated
// document, so they carry no overlay and no wizard input.
//
// LEFT BLANK BY DESIGN:
//   * «Подпись ответственного лица ______ /______» — employee signature stage.
//   * «на основании Доверенности № , настоящим…» — measured against real glyph
//     boxes the gap between «№» and the following comma is 8.18 pt. No
//     document number fits, so the source reserves no usable space.
//   * «…№_________ дата__» on page 2 — the date rule is 11.04 pt wide; no date
//     fits even at the 6 pt floor. The contract number beside it (49.56 pt)
//     *is* filled.
//   * «Код INV0000X» / «Код XXXXXXХ» in the payment-purpose rows are printed
//     placeholder text, not blanks. Overwriting them would mean drawing over
//     existing content, so they are left exactly as the source prints them.
//
// Column geometry (page 1), from the drawn table rules:
//   label column        41.4 → 323.8
//   value column       323.8 → 567.5   (tables 1, 3, 4)
//   «Номер договора»   323.8 → 492.8   (table 2)
//   «Дата»             492.8 → 567.5   (table 2)

(function (global) {
  'use strict';

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 12;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller
  var VALUE_LEFT = 327.05;
  var VALUE_WIDTH = 237.70;

  // Rows that physically cannot take BODY. Each value is the largest
  // half-point step the measured room allows, floored at MIN.
  var ROW_SIZE = {
    brokerRepresentative: 11.5,      // 11.60 pt of room
    paymentPurposeCurrency: 11,      // 11.47 pt of room
    paymentPurposeDerivatives: 11,   // 11.47 pt of room
    paymentPurposeStock: 11.5,       // 11.60 pt of room
  };

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
      optional: !!o.optional,
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
      showWhen: o.showWhen,
      layoutMode: o.layoutMode,
      flowBlockId: o.flowBlockId
    };
  }

  // A value typed into the wide right-hand column of tables 1, 3 and 4.
  function cell(id, source, baselineTop, options) {
    return text(id, source, 0, VALUE_LEFT, baselineTop, VALUE_WIDTH, options);
  }

  var TEMPLATE = {
    id: 'account-opening-notice',
    title: 'Уведомление об открытии брокерского/депозитарного счета',
    templateUrl: '../assets/document-pdf-templates/account-opening-notice.pdf',
    outputFilename: 'uvedomlenie-ob-otkrytii-scheta.pdf',
    expectedPages: 2,
    appliesTo: ['individual', 'company'],

    pageLayout: {
      0: {
        fixedHeaderUntil: 0,
        bodyBottom: 807.44,
        fixedFooterFrom: null,
        shiftToTop: 807.44,
        bottomClearance: 2.0,
        compaction: [],
        anchors: ['account-opening-broker-introduction', 'clientName']
      }
    },

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    wordFlowBlocks: [
      {
        id: 'account-opening-broker-introduction',
        type: 'wordFlowBlock',
        page: 0,
        frame: {
          left: 41.40, baselineTop: 126.74, width: 523.58,
          initialLineCount: 4
        },
        font: 'legalSerif', fontSize: 11.04, minFontSize: 11.04,
        fontSizeLocked: true, lineHeight: 12.72,
        alignment: 'justify', justifyMinRatio: 0.55,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 177.86, shiftFromTop: 177.86,
          rowHeight: 12.72, maxExtraRows: 1, lineStyle: 'none',
          reviewStatus: 'approved'
        },
        sourceReplacement: {
          firstBlock: 24, lastBlock: 31,
          expectedBlockCount: 8, expectedPageBlockCount: 126,
          expectedSha256: '8cd5a73729ce0a18cea885681440b8acc2bc51c69c75a6c392111e6ddeb72749',
          expectedTemplateSha256: 'd46681cf43b357112a73a83bc01d1668036daceedc0ef9881ad63994a6f8a834',
          reviewStatus: 'approved'
        },
        sourceStaticText: 'Общество с ограниченной ответственностью "Инвестика", ' +
          'в лице ________, действующего на основании Доверенности № , ' +
          'настоящим извещает Клиента о заключении Договора о брокерском ' +
          'обслуживании и о заключении Депозитарного договора (договора счета ДЕПО)',
        runs: [
          {
            type: 'static',
            text: 'Общество с ограниченной ответственностью "Инвестика", в лице '
          },
          {
            type: 'fieldRef', fieldId: 'brokerRepresentative',
            decoration: {
              underline: true, minWidth: 398.00, thickness: 0.48, offset: 1.20
            }
          },
          {
            type: 'static',
            text: ', действующего на основании Доверенности № , настоящим извещает Клиента о заключении Договора о брокерском обслуживании и о заключении Депозитарного договора (договора счета ДЕПО)'
          }
        ]
      }
    ],

    fields: [
      // ── Header ───────────────────────────────────────────────────────────
      // "Дата формирования" ends at 137.90 on this baseline.
      text('formationDate', 'field.documentDateRu', 0, 142.0, 78.96, 120.0, {
        required: true, format: 'dateRu'
      }),

      // "…в лице ____________________________________, действующего на
      // основании Доверенности № , …" — a 401.5 pt rule on the next line.
      text('brokerRepresentative', 'extra.extra-authorized-signer',
           0, 43.0, 139.46, 398.0, {
             required: true,
             layoutMode: 'flow-reference',
             flowBlockId: 'account-opening-broker-introduction'
           }),

      // ── 1. Информация о клиенте (from the subject card) ──────────────────
      // This is the right-hand cell of the first ruled table row, not an
      // independent underlined blank.  The committed PDF measures the row from
      // the top of its 0.48 pt border at 215.54 to the top of its bottom border
      // at 229.82 (14.28 pt).  Extending at 229.82 keeps the continuation joined
      // to clientName and moves the following identification row as one table.
      // Source vertical-rule centres: 36.00 / 324.07 / 567.72 pt.
      cell('clientName', 'field.client-full-name', 226.82, {
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 229.82,
          rowHeight: 14.28, maxExtraRows: 2,
          shiftFromTop: 229.82, shiftToTop: 807.44,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 36.00, rowWidth: 531.72,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: [36.00, 324.07, 567.72],
          line: {
            left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 11.28, ruleOffset: 14.28, ruleThickness: 0.48
          }
        }, required: true }),
      // The label is "ИНН (для юридических лиц) / Номер документа,
      // удостоверяющего личность (для физических лиц)", which is exactly what
      // the normalised client-id-or-inn value already holds for each kind.
      cell('clientIdOrInn', 'field.client-id-or-inn', 252.26, { required: true }),
      cell('clientCode', 'field.client-code', 300.29, { required: true }),

      // ── 2. Информация о заключенных договорах ────────────────────────────
      text('brokerageContractNumber', 'extra.extra-brokerage-contract',
           0, 327.0, 400.61, 163.0, { required: true }),
      text('brokerageContractDate', 'extra.extra-brokerage-contract-date',
           0, 496.0, 400.61, 68.0, { required: true, format: 'dateRu', align: 'center' }),
      text('depositaryContractNumber', 'extra.extra-depository-contract',
           0, 327.0, 430.37, 163.0, { required: true }),
      text('depositaryContractDate', 'extra.extra-depository-contract-date',
           0, 496.0, 430.37, 68.0, { required: true, format: 'dateRu', align: 'center' }),

      // ── 3. Счета внутреннего учёта ───────────────────────────────────────
      cell('stockMarketAccount', 'extra.extra-stock-market-account', 522.07, { optional: true }),
      cell('derivativesMarketAccount', 'extra.extra-futures-market-account', 556.27, { optional: true }),
      cell('currencyMarketAccount', 'extra.extra-currency-market-account', 590.47, { optional: true }),

      // ── 4. Счёт депо клиента ─────────────────────────────────────────────
      cell('depoAccount', 'extra.extra-depo-account', 675.10, { required: true }),

      // ── Page 2: the brokerage agreement number repeated in each
      //    payment-purpose row. One operator input drives all three; the
      //    adjacent 11.04 pt "дата__" rule is too small to fill.
      text('paymentPurposeStock', 'extra.extra-brokerage-contract',
           1, 389.0, 59.40, 48.5, { required: true, fontSize: 10.0 }),
      text('paymentPurposeCurrency', 'extra.extra-brokerage-contract',
           1, 389.0, 97.82, 48.5, { required: true, fontSize: 10.0 }),
      text('paymentPurposeDerivatives', 'extra.extra-brokerage-contract',
           1, 389.0, 136.22, 48.5, { required: true, fontSize: 10.0 })
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
