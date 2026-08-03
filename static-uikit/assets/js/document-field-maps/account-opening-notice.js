// Field map — ПРИЛОЖЕНИЕ 3 К РЕГЛАМЕНТУ. УВЕДОМЛЕНИЕ ОБ ОТКРЫТИИ
// БРОКЕРСКОГО/ДЕПОЗИТАРНОГО СЧЕТА.
//
// Base template : assets/document-pdf-templates/account-opening-notice.pdf
// Source Word   : Z:\6. Управление по работе с клиентами\Формы документов\
//                 для оцифровки\ПРИЛОЖЕНИЕ 3 К РЕГЛАМЕНТУ. УВЕДОМЛЕНИЕ ОБ
//                 ОТКРЫТИИ БРОКЕРСКОГО-ДЕПОЗИТАРНОГО СЧЕТА.docx
// Source SHA-256: 39e0df89471e07bb40a055fe6aa5f0f4c25c65af2062da53029d172b5128c699
// PDF SHA-256   : 8e6a39227c5ec62d1d0cefea1b194d823e17065e82e6c382db174c37f48ca294
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
//
// PRINTED SAMPLE CONTENT, REPLACED BY A REAL VALUE:
//   * «Код INV0000X» (stock, currency) and «Код XXXXXXХ» (derivatives) in the
//     payment-purpose rows are not blanks — the source prints a sample client
//     code where the client's own belongs. They cannot be overlaid, because
//     that would mean drawing on top of existing glyphs. Each row is instead a
//     reviewed Word-flow block that replaces the printed paragraph and puts the
//     CRM client code (`field.client-code`, the same source the «Код клиента»
//     cell on page 1 uses) where the sample stood. The one dropped token per
//     row is declared in `sourcePlaceholders`; every other token still has to
//     match the authoritative PDF exactly.
//
// THE PAYMENT-PURPOSE SENTENCE IS ONE SENTENCE:
//   «Код {код}. Перевод денежных средств по Договору на брокерское
//    обслуживание №{номер} дата {дата}. {РЫНОК}»
//   All three values come from the payload the wizard already collects, and
//   all three rows name the SAME brokerage agreement — the form has one
//   «Договор на брокерское обслуживание», recorded once in §2 of page 1 and
//   quoted three times on page 2. So the number is `extra-brokerage-contract`
//   and the date is `extra-brokerage-contract-date`, the same two wizard
//   fields «Номер/Дата договора на брокерское обслуживание» that fill the §2
//   table, not three copies of one input. The date is `format: 'dateRu'`,
//   which is what §2 prints beside the number.
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
  // The payment-purpose rows are not here: they are reviewed Word-flow blocks
  // that print at the source's own locked 11.04 pt, not overlays sized against
  // the room left over in a printed blank.
  var ROW_SIZE = {
    // (Empty since the introduction paragraph became static in the updated
    // template — every remaining row takes BODY.)
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
      flowBlockId: o.flowBlockId,
      allowMultipleFlowReferences: o.allowMultipleFlowReferences
    };
  }

  // A value typed into the wide right-hand column of tables 1, 3 and 4.
  function cell(id, source, baselineTop, options) {
    return text(id, source, 0, VALUE_LEFT, baselineTop, VALUE_WIDTH, options);
  }

  // ── Page 2 payment-purpose rows ────────────────────────────────────────────
  //
  // Each of the three rows prints one paragraph in the right-hand cell of a
  // bordered table, measured from the committed template:
  //
  //   column rules      41.40 | 246.77 | 553.30
  //   row bands         36.48–74.40, 74.88–112.94, 113.42–151.34
  //   cell text starts  x 252.41, three printed lines per row
  //   first baselines   46.68 (stock), 85.22 (currency), 123.62 (derivatives)
  //   leading           12.60 pt; the size the source prints is 11.04 pt
  //
  // Why these are Word-flow blocks and not overlays on the printed blank:
  //
  //   1. The sentence names a client code the source only *samples*
  //      («Код INV0000X»). A real code cannot be overlaid onto printed glyphs,
  //      so the paragraph has to be re-flowed to hold it.
  //   2. The agreement reference belongs in the same sentence. Filling only the
  //      printed «№_________» blank cannot work — the blank is 49.68 pt and a
  //      real reference such as «БД-2026/000417-СПБ» is 101.17 pt at this size —
  //      and moving the reference alone to the row's third line put it beside
  //      «ФОНДОВЫЙ РЫНОК», 95 pt to the right of a still-empty «№» blank. That
  //      is geometrically inside the cell and reads as a stray caption.
  //
  //   3. The agreement DATE belongs to the same sentence for exactly the same
  //      reason. «дата__» is an 11.04 pt rule — no date fits it at any size, so
  //      as an overlay this blank could only ever stay empty, and a sentence
  //      that names a real agreement number and then prints «дата__» reads as
  //      an unfinished form. Inside the re-flowed paragraph the label and its
  //      value are two runs of one sentence and the printed rule's width stops
  //      being a constraint.
  //
  // Re-flowing the whole paragraph keeps all three values inside the sentence
  // that introduces them.
  //
  // What that costs in rows, measured against this font at this size over every
  // fixture profile (client codes 7…27 characters, agreement references 7…45,
  // all three market designations): 44 of 72 combinations still end on the
  // source's own third line; the remaining 28 need a fourth. None needs a
  // fifth — the widest reference this form can be given, «№» plus 45
  // characters, is 272.40 pt of the 295.25 pt line. So each row is allowed
  // exactly one additional line, taken as a complete bordered table row at the
  // source's own 12.60 pt pitch.
  var PURPOSE_LEFT = 252.41;
  var PURPOSE_WIDTH = 295.25;       // 553.30 right rule − 252.41 − 5.64 padding
  var PURPOSE_SIZE = 11.04;         // the size the source itself prints
  var PURPOSE_LINE_HEIGHT = 12.60;
  var PURPOSE_BLANK_WIDTH = 49.68;  // «_________» at 11.04 pt
  var PURPOSE_DATE_BLANK_WIDTH = 11.04;   // «__» at 11.04 pt

  // The table's three drawn rules, as centre lines: the source paints each as a
  // 0.48 pt rectangle at 41.40–41.88, 246.77–247.25 and 553.30–553.78. A row
  // opened between two bands reproduces exactly these, so the growth is
  // invisible except that the row is taller.
  var PURPOSE_RULES = [41.64, 247.01, 553.54];
  var PURPOSE_RULE_THICKNESS = 0.48;

  var PURPOSE_LEAD = 'Код ';
  var PURPOSE_BODY = '. Перевод денежных средств по Договору на брокерское ' +
    'обслуживание №';
  // «дата» and the value it labels are one group: the trailing space becomes
  // the space between them and `keepWithNext` refuses to break there.
  var PURPOSE_DATE_LABEL = ' дата ';

  // Page 2, §7, item 2. Word exported items 2 and 3 as one outer page block,
  // but each printed word is still its own balanced depth-2 q…Q operator unit.
  // The reviewed nested span removes exactly those two visible lines; item 2
  // is rebuilt with the client's operator-entered depository agreement pair
  // and item 3 is redrawn verbatim underneath it. This is real content-stream
  // suppression, not a white rectangle, so extraction contains no empty
  // «№ от» sentence behind the requested value.
  var TRANSFER_BASIS_SIZE = 11.04;
  var TRANSFER_BASIS_LINE_HEIGHT = 12.96;
  var TRANSFER_BASIS_INDENT = 24.504;

  // One row.
  //   `market`      the sentence's closing designation, as the source prints it
  //   `placeholder` the sample client code that row prints
  //   `rowBottom`   the top of the row's own bottom rule — where a fourth line
  //                 opens a new table row
  function purposeBlock(blockId, fieldId, baselineTop, market, placeholder,
                        rowBottom, range) {
    return {
      id: blockId,
      type: 'wordFlowBlock',
      page: 1,
      frame: {
        left: PURPOSE_LEFT, baselineTop: baselineTop, width: PURPOSE_WIDTH,
        initialLineCount: 3
      },
      font: 'legalSerif',
      fontSize: PURPOSE_SIZE, minFontSize: PURPOSE_SIZE, fontSizeLocked: true,
      lineHeight: PURPOSE_LINE_HEIGHT,
      // The source's own three lines are ragged, not justified.
      alignment: 'left',
      // A fourth line is a fourth table row, not text spilling over a rule.
      // The cut is the top of this row's own bottom rule: everything from there
      // down — the rule itself, the bands below it and their rules, and the
      // whole body of the page — moves down by one 12.60 pt line, and the gap
      // that opens is closed by redrawing the three column rules across it.
      // The band's own rules end exactly at the cut and so stay where they are;
      // the inserted row continues them.
      overflowStrategy: 'expand-layout',
      expansion: {
        page: 1, insertionTop: rowBottom, shiftFromTop: rowBottom,
        rowHeight: PURPOSE_LINE_HEIGHT, maxExtraRows: 1,
        lineStyle: 'table-row', reviewStatus: 'approved',
        rowLeft: PURPOSE_RULES[0],
        rowWidth: PURPOSE_RULES[PURPOSE_RULES.length - 1] - PURPOSE_RULES[0],
        // The table draws no rule of its own at the top or bottom of an
        // inserted row: the band above it already ends on one and the row's
        // travelling bottom rule closes it underneath.
        borders: { left: false, right: false, top: false, bottom: false },
        columns: PURPOSE_RULES,
        line: {
          left: PURPOSE_LEFT, width: PURPOSE_WIDTH,
          baselineOffset: 10.08, ruleThickness: PURPOSE_RULE_THICKNESS
        }
      },
      sourceReplacement: {
        firstBlock: range.block, lastBlock: range.block,
        expectedBlockCount: 1, expectedPageBlockCount: 10,
        expectedSha256: range.sha256,
        expectedTemplateSha256: '8e6a39227c5ec62d1d0cefea1b194d823e17065e82e6c382db174c37f48ca294',
        reviewStatus: 'approved'
      },
      // The printed sample code. Declared so the legal-text gate drops exactly
      // this one token and still holds every other token to the source.
      sourcePlaceholders: [
        {
          text: placeholder,
          fieldId: 'paymentPurposeClientCode',
          reviewStatus: 'approved',
          note: 'sample client code printed by the source form'
        }
      ],
      sourceStaticText: PURPOSE_LEAD + placeholder + PURPOSE_BODY +
        '_________ дата__. ' + market,
      runs: [
        { type: 'static', text: PURPOSE_LEAD },
        // The CRM client code, where the form printed its sample.
        { type: 'fieldRef', fieldId: 'paymentPurposeClientCode',
          keepTogether: true },
        // `keepWithNext` keeps «№» on the same line as the reference it
        // introduces; a break between them would read as a dangling number
        // sign at the end of a line.
        { type: 'static', text: PURPOSE_BODY, keepWithNext: true },
        // The exact agreement reference: one token, never split, carrying the
        // rule the source prints for this blank.
        { type: 'fieldRef', fieldId: fieldId, keepTogether: true,
          decoration: {
            underline: true, minWidth: PURPOSE_BLANK_WIDTH,
            thickness: 0.48, offset: 1.20
          } },
        // «дата» keeps its own value the same way «№» keeps the reference: the
        // label and the date are one group, and the date is one token.
        { type: 'static', text: PURPOSE_DATE_LABEL, keepWithNext: true },
        { type: 'fieldRef', fieldId: 'paymentPurposeAgreementDate',
          keepTogether: true,
          decoration: {
            underline: true, minWidth: PURPOSE_DATE_BLANK_WIDTH,
            thickness: 0.48, offset: 1.20
          } },
        // A full stop attaches to whatever precedes it, so the sentence ends
        // on the date rather than opening a line with a stray point.
        { type: 'static', text: '.' },
        // «ФОНДОВЫЙ» and «РЫНОК» name one market between them: one token, never
        // split across two lines.
        { type: 'static', text: ' ' + market, keepTogether: true }
      ]
    };
  }

  // The reference field itself. It is never drawn on its own — the block above
  // draws it — but it keeps its own id, source and printed-blank geometry so the
  // wizard, the review pack and the Template Builder still name one field per
  // market row.
  function purposeReference(id, blockId, baselineTop) {
    return text(id, 'extra.extra-brokerage-contract',
                1, 389.0, baselineTop, PURPOSE_BLANK_WIDTH, {
      required: true,
      fontSize: PURPOSE_SIZE,
      minFontSize: PURPOSE_SIZE,
      tokenBreak: 'none',
      layoutMode: 'flow-reference',
      flowBlockId: blockId
    });
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
        // The introduction is static in the updated template, so the only
        // block page 1 can grow for is the client-name table row.
        anchors: ['clientName']
      },
      // Page 2. Its movable body ends at 738.92 — «Подпись ответственного
      // лица …» — and the sheet is 841.92 pt tall with no page number of its
      // own, so 103.00 pt sit unused beneath it. The three payment-purpose
      // rows may each open one 12.60 pt line: 37.80 pt of the 97.00 pt this
      // budget allows once the 6 pt bottom clearance is taken off. Anchors are
      // listed top to bottom, which is the order they are paid for in, so a
      // lower row's insertion point already accounts for the rows above it.
      //   python static-uikit/tools/qa/measure_page_layout.py --doc account-opening-notice
      1: {
        fixedHeaderUntil: 0,
        bodyBottom: 738.92,
        fixedFooterFrom: null,
        shiftToTop: 835.92,
        bottomClearance: 6.0,
        compaction: [],
        anchors: [
          'account-opening-payment-purpose-stock',
          'account-opening-payment-purpose-currency',
          'account-opening-payment-purpose-derivatives'
        ]
      }
    },

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    wordFlowBlocks: [
      // The introduction paragraph used to be replaced here. The updated
      // authoritative template prints it itself —
      //   «Общество с ограниченной ответственностью "Инвестика",  в  лице
      //    Генерального Директора Козырева Александра Юрьевича, действующего
      //    на основании Устава, настоящим извещает Клиента …»
      // — so there is no blank to fill and no rule to draw. Drawing anything
      // over it would print the representative twice.

      // Page 2, §5 «Назначение платежа». One block per market row; each
      // replaces exactly one top-level q…Q block of the source page, and the
      // page's table rules are separate blocks that are never touched, so the
      // borders stay where the form drew them.
      purposeBlock('account-opening-payment-purpose-stock', 'paymentPurposeStock',
                   46.68, 'ФОНДОВЫЙ РЫНОК', 'INV0000X', 74.40,
                   { block: 2, sha256: '8d508405d9190a64921835d973104e4b7ee9010a000e4e6952ced5dd7d725738' }),
      purposeBlock('account-opening-payment-purpose-currency', 'paymentPurposeCurrency',
                   85.22, 'ВАЛЮТНЫЙ РЫНОК', 'INV0000X', 112.94,
                   { block: 4, sha256: '0cc104761d1b66bdc93f286bd0a80cefac3a04e726ec61fb67ab80115dfae191' }),
      // The derivatives row samples the code differently: six Latin X and one
      // Cyrillic Х. Declared exactly as printed.
      purposeBlock('account-opening-payment-purpose-derivatives', 'paymentPurposeDerivatives',
                   123.62, 'СРОЧНЫЙ РЫНОК', 'XXXXXXХ', 151.34,
                   { block: 6, sha256: '81b7fd45a974ee6b5667fe1558c6526919b7cac5aacb183529700d391cf258cd' }),
      {
        id: 'account-opening-transfer-basis',
        type: 'wordFlowBlock',
        page: 1,
        frame: {
          left: 41.40, baselineTop: 628.42, width: 511.42,
          initialLineCount: 2
        },
        font: 'legalSerif',
        fontSize: TRANSFER_BASIS_SIZE,
        minFontSize: TRANSFER_BASIS_SIZE,
        fontSizeLocked: true,
        lineHeight: TRANSFER_BASIS_LINE_HEIGHT,
        firstLineIndent: 0,
        hangingIndent: TRANSFER_BASIS_INDENT,
        alignment: 'left',
        maxAdditionalLines: 3,
        overflowStrategy: 'flow',
        sourceReplacement: {
          operatorScope: 'all-balanced',
          operatorDepth: 2,
          parentTopLevelBlock: 7,
          firstBlock: 250,
          lastBlock: 292,
          expectedBlockCount: 43,
          expectedPageBlockCount: 312,
          expectedParentSha256: '38de8f2ffc2d14f3322a31faf44a0a70098471242a7fbcec3ccdcfe1c079fe60',
          expectedSha256: '1a33b2e34ffd9d96dd21744ca0869602d96d0e65a89d1228476d26fb50956235',
          expectedTemplateSha256: '8e6a39227c5ec62d1d0cefea1b194d823e17065e82e6c382db174c37f48ca294',
          reviewStatus: 'approved'
        },
        sourceStaticText: '2. Депозитарный договор клиента с ООО «ИНВЕСТИКА» ' +
          '(Заявление о присоединении) № от «__» г. 3. Договор купли-продажи, ' +
          'займа и т.п. (в случае перевода со сменой права собственности).',
        runs: [
          { type: 'static', text: '2.' },
          { type: 'spacer', width: 16.224 },
          {
            type: 'static', keepWithNext: true,
            text: 'Депозитарный договор клиента с ООО «ИНВЕСТИКА» ' +
              '(Заявление о присоединении) № '
          },
          {
            type: 'fieldRef', fieldId: 'transferBasisDepositoryNumber',
            keepTogether: true
          },
          { type: 'static', text: ' от «', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'transferBasisDepositoryDate',
            keepTogether: true, keepWithNext: true,
            decoration: {
              underline: true, minWidth: 11.04, thickness: 0.48, offset: 1.20
            }
          },
          { type: 'static', text: '» г.', keepTogether: true },
          { type: 'paragraphBreak' },
          { type: 'static', text: '3.' },
          { type: 'spacer', width: 16.224 },
          {
            type: 'static',
            text: 'Договор купли-продажи, займа и т.п. ' +
              '(в случае перевода со сменой права собственности).'
          }
        ],
        semanticGroup: {
          kind: 'depository-transfer-basis',
          boundary: { left: 41.40, top: 618.58, right: 552.82, bottom: 683.26 },
          reviewStatus: 'approved'
        }
      }
    ],

    fields: [
      // ── Header ───────────────────────────────────────────────────────────
      // "Дата формирования" ends at 137.90 on this baseline.
      text('formationDate', 'field.documentDateRu', 0, 142.0, 78.96, 120.0, {
        required: true, format: 'dateRu'
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

      // ── Page 2: §5 «Назначение платежа» ──────────────────────────────────
      //
      // The brokerage agreement reference, repeated in each payment-purpose
      // row — one operator input drives all three.
      //
      // These are flow references: the reviewed Word-flow row above draws each
      // one inside the sentence that introduces it, immediately after «№», so a
      // reference wider than the printed blank pushes the wording along instead
      // of landing on its own line. `tokenBreak: 'none'` records that the value
      // is one exact identifier: «БД-2026/» on one line and «000417-СПБ» on the
      // next would read as two different references.
      purposeReference('paymentPurposeStock',
                       'account-opening-payment-purpose-stock', 59.40),
      purposeReference('paymentPurposeCurrency',
                       'account-opening-payment-purpose-currency', 97.82),
      purposeReference('paymentPurposeDerivatives',
                       'account-opening-payment-purpose-derivatives', 136.22),

      // The client code the payment-purpose sentences print. Same source as the
      // «Код клиента» cell of §1 above — one CRM value, shown in both places —
      // but a separate field, because §1 is an ordinary overlay into a printed
      // blank and these three are flow references into replaced paragraphs.
      text('paymentPurposeClientCode', 'field.client-code',
           1, PURPOSE_LEFT, 46.68, PURPOSE_WIDTH, {
             required: true,
             fontSize: PURPOSE_SIZE,
             minFontSize: PURPOSE_SIZE,
             layoutMode: 'flow-reference',
             flowBlockId: [
               'account-opening-payment-purpose-stock',
               'account-opening-payment-purpose-currency',
               'account-opening-payment-purpose-derivatives'
             ],
             allowMultipleFlowReferences: true
           }),

      // The date of that same brokerage agreement, printed where the source
      // reserves «дата__». One value for all three rows, from the same wizard
      // input that fills «Дата» of the §2 table on page 1 — the form records
      // one brokerage agreement, so a second date here could only ever
      // contradict it. Formatted as §2 formats it, dd.mm.yyyy.
      text('paymentPurposeAgreementDate', 'extra.extra-brokerage-contract-date',
           1, PURPOSE_LEFT, 46.68, PURPOSE_DATE_BLANK_WIDTH, {
             required: true,
             format: 'dateRu',
             fontSize: PURPOSE_SIZE,
             minFontSize: PURPOSE_SIZE,
             tokenBreak: 'none',
             layoutMode: 'flow-reference',
             flowBlockId: [
               'account-opening-payment-purpose-stock',
               'account-opening-payment-purpose-currency',
               'account-opening-payment-purpose-derivatives'
             ],
             allowMultipleFlowReferences: true
           }),

      // Page 2, §7 «Основание для перевода». Separate field IDs preserve one
      // card per printed occurrence while both values resolve from the exact
      // same required operator inputs as the page-1 agreement table.
      text('transferBasisDepositoryNumber', 'extra.extra-depository-contract',
           1, 471.10, 628.42, 70.0, {
             required: true,
             fontSize: TRANSFER_BASIS_SIZE,
             minFontSize: TRANSFER_BASIS_SIZE,
             tokenBreak: 'none',
             layoutMode: 'flow-reference',
             flowBlockId: 'account-opening-transfer-basis'
           }),
      text('transferBasisDepositoryDate', 'extra.extra-depository-contract-date',
           1, 497.16, 628.42, 55.0, {
             required: true,
             format: 'dateRu',
             fontSize: TRANSFER_BASIS_SIZE,
             minFontSize: TRANSFER_BASIS_SIZE,
             tokenBreak: 'none',
             layoutMode: 'flow-reference',
             flowBlockId: 'account-opening-transfer-basis'
           })
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
