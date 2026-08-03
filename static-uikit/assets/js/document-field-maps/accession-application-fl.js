// Field map — ПРИЛОЖЕНИЕ 1А К РЕГЛАМЕНТУ. ЗАЯВЛЕНИЕ О ПРИСОЕДИНЕНИИ (ФЛ)
//
// Base template : assets/document-pdf-templates/accession-application-fl.pdf
// Source Word   : "ПРИЛОЖЕНИЕ 1А К РЕГЛАМЕНТУ. ЗАЯВЛЕНИЕ О ПРИСОЕДИНЕНИИ (ФЛ).docx"
// Pages         : 3 (A4, 595.32 × 841.92 pt)
//
// Coordinates are MEASURED from the committed template with
// `tools/probe-pdf-coords.py`, never estimated:
//
//     left         x of the blank line / checkbox glyph
//     baselineTop  distance from the page TOP down to the text BASELINE
//
// The identity paragraph is justified, so inter-word spacing is stretched and
// a position computed from a font width table drifts by tens of points across
// a line. Always take these numbers from the probe (which reads real glyph
// boxes) and re-run it after regenerating the template from the .docx.
//
// The source document is set in Times New Roman 8.5 pt (body) and 9 pt (the
// §16 contact table). Liberation Serif is metric-compatible with Times New
// Roman, so values occupy the same space as the surrounding printed text.

(function (global) {
  'use strict';

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 12;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller
  var CHECK_GLYPH = 8.52;  // printed ☐ box — geometry, not dynamic text
  var SIZE_10_5 = 10.5;      // measured room: 10.64, 10.59 pt
  var SIZE_9_5 = 9.5;       // measured room: 9.56 pt
  var SIZE_9 = 9;         // measured room: 8.89, 8.89, 8.89 pt

  // ── The three tariff plans are one visual group ───────────────────────────
  //
  // Same policy as the legal-entity form (1В): one face, one size, one leading,
  // one alignment, one clearance between the value and the rule under it. Here
  // all three rows measure 8.89 pt of room, so all three are already held at
  // the 9 pt readability floor and the size was never in question — but the
  // continuation rules underneath them were not alike. Two rows allowed a 9.5
  // pt second line and sat their rule 1.6 pt below the baseline while the third
  // allowed 9 pt and sat its rule at 1.2 pt, so a value that wrapped came out
  // slightly larger in two rows than in the third and its rule sat closer.
  // Stated once, they cannot drift again.
  var TARIFF_GROUP = 'accession-tariff-plans';
  var TARIFF_SIZE = SIZE_9;
  var TARIFF_ALIGN = 'left';
  var TARIFF_LINE_HEIGHT = 10.5;      // the source's own body line pitch
  // The reviewed continuation line: the full width of the column, from the
  // printed label's left edge to the text block's right edge.
  var TARIFF_ROW_LEFT = 437.7;
  var TARIFF_ROW_WIDTH = 119.9;
  var TARIFF_RULE_THICKNESS = 0.36;
  var TARIFF_RULE_OFFSET = 1.6;

  // One tariff value: the printed slot after «Тарифный план:», plus the
  // reviewed continuation line beneath it. The arguments are the measured
  // coordinates; everything a reader can see about the type is shared.
  function tariff(id, market, source, left, baselineTop, width,
                  continuationTop) {
    return {
      id: id,
      label: 'Тарифный план (' + market + ')',
      source: source,
      optional: true,
      typographyGroup: TARIFF_GROUP,
      page: 0,
      left: left,
      baselineTop: baselineTop,
      width: width,
      font: 'legalSerif',
      fontSize: TARIFF_SIZE,
      minFontSize: MIN,
      align: TARIFF_ALIGN,
      lineHeight: TARIFF_LINE_HEIGHT,
      overflowStrategy: 'flow',
      flowRegions: [
        { page: 0, left: left, baselineTop: baselineTop, width: width,
          maxLines: 1 },
        {
          page: 0, left: TARIFF_ROW_LEFT, baselineTop: continuationTop,
          width: TARIFF_ROW_WIDTH, maxLines: 1,
          maxFontSize: TARIFF_SIZE, generated: true, reviewStatus: 'approved',
          drawUnderline: true,
          underlineThickness: TARIFF_RULE_THICKNESS,
          underlineOffset: TARIFF_RULE_OFFSET
        }
      ]
    };
  }

  // Every checkbox glyph in this template is drawn at the body size.
  // (The source mixes MS-Gothic and Segoe UI Symbol for "☐"; both render the
  // same box, and the mark is drawn geometrically, so the font does not matter.)
  function check(id, source, equals, page, left, baselineTop) {
    return {
      id: id,
      type: 'check',
      source: source,
      equals: equals,
      page: page,
      left: left,
      baselineTop: baselineTop,
      glyphSize: CHECK_GLYPH
    };
  }

  var TEMPLATE = {
    id: 'accession-application-fl',
    title: 'Заявление о присоединении (ФЛ)',
    templateUrl: '../assets/document-pdf-templates/accession-application-fl.pdf',
    outputFilename: 'zayavlenie-o-prisoedinenii-fl.pdf',
    expectedPages: 3,
    appliesTo: ['individual'],

    pageLayout: {
      0: {
        fixedHeaderUntil: 0,
        bodyBottom: 793.94,
        fixedFooterFrom: null,
        shiftToTop: 830.0,
        bottomClearance: 28.0,
        compaction: [],
        anchors: ['accession-application-fl-identity']
      }
    },

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    wordFlowBlocks: [
      {
        id: 'accession-application-fl-identity',
        type: 'wordFlowBlock',
        page: 0,
        frame: {
          left: 56.60, baselineTop: 99.26, width: 501.00,
          initialLineCount: 3
        },
        font: 'legalSerif', fontSize: 8.52, minFontSize: 8.52,
        fontSizeLocked: true, lineHeight: 19.56,
        // The source paragraph is set in 8.52 pt, and the block reproduces
        // that wording exactly. The values the manager entered are drawn at
        // the 9 pt readability floor instead: a client has to be able to
        // read their own name, passport and address on a printed form, and
        // being inside a locked block is not a reason to go below it.
        // Measured cost: an ordinary payload now uses the one reviewed
        // continuation row this page already budgets for.
        valueFontSize: 9,
        alignment: 'justify', justifyMinRatio: 0.55,
        overflowStrategy: 'expand-layout',
        // The cut sits in the blank band that follows the complete identity
        // paragraph, not on the heading below it.
        //
        // 159.95 was the *declared* top of «1. Присоединяется…», taken from a
        // glyph box. That block actually paints 159.02–167.54, so the band
        // began inside it: the renderer refused every payload that needed the
        // row, and nothing caught it because the anchor audit only walked
        // `fields[].expansion`.
        //
        // The block draws its own continuation line from its frame, at
        // 99.26 + 3 × 19.56 = 157.94, which paints 150.35–159.78. Every source
        // block that line overlaps has to move, so the cut has to be at or
        // above 150.35. Measured clean bands there: 119.95–129.70 and
        // 138.45–149.20. The lower one is the gap immediately after the
        // paragraph, so the cut is its midpoint — ±5.38 pt of margin.
        //   python static-uikit/tools/qa/check_expansion_anchors.py --suggest
        expansion: {
          page: 0, insertionTop: 143.82, shiftFromTop: 143.82,
          rowHeight: 19.56, maxExtraRows: 1, lineStyle: 'none',
          reviewStatus: 'approved'
        },
        sourceReplacement: {
          firstBlock: 18, lastBlock: 24,
          expectedBlockCount: 7, expectedPageBlockCount: 264,
          expectedSha256: '74ffbd7c30383ad6868a9b4be4633569c12691e86e3da529b15ad9b0814f6c25',
          expectedTemplateSha256: '8fec088402d46b6a9251e92ceee15f4a7cdc74b12684f7be339194d04904c1e6',
          reviewStatus: 'approved'
        },
        sourceStaticText: 'Настоящим, ________, паспорт серии ____, № ________, ' +
          'выдан ________, дата выдачи «__» ________г., проживающий(ая) по ' +
          'адресу (регистрации): ________.',
        runs: [
          { type: 'static', text: 'Настоящим, ' },
          {
            type: 'fieldRef', fieldId: 'clientFullName',
            decoration: {
              underline: true, minWidth: 203.90, thickness: 0.36, offset: 1.20
            }
          },
          { type: 'static', text: ', паспорт серии ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'passportSeries', keepTogether: true,
            decoration: {
              underline: true, minWidth: 29.80, thickness: 0.36, offset: 1.20
            }
          },
          { type: 'static', text: ', № ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'passportNumber', keepTogether: true,
            decoration: {
              underline: true, minWidth: 46.70, thickness: 0.36, offset: 1.20
            }
          },
          { type: 'static', text: ', выдан ' },
          {
            type: 'fieldRef', fieldId: 'passportIssuedBy',
            decoration: {
              underline: true, minWidth: 352.60, thickness: 0.36, offset: 1.20
            }
          },
          { type: 'static', text: ', дата выдачи «', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'passportIssueDay', keepTogether: true,
            decoration: {
              underline: true, minWidth: 12.60, thickness: 0.36, offset: 1.20
            }
          },
          { type: 'static', text: '» ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'passportIssueMonthYear', keepTogether: true,
            decoration: {
              underline: true, minWidth: 37.50, thickness: 0.36, offset: 1.20
            }
          },
          { type: 'static', text: 'г., проживающий(ая) по адресу (регистрации): ' },
          {
            type: 'fieldRef', fieldId: 'registrationAddress',
            decoration: {
              underline: true, minWidth: 339.90, thickness: 0.36, offset: 1.20
            }
          },
          { type: 'static', text: '.' }
        ]
      },
      {
        // «По электронной почте ______(необходимо указать адрес электронной
        // почты)» — the report-delivery line of §3.
        //
        // The printed blank is 22 underscores, 93.4 pt. An ordinary client
        // e-mail is 136.25 pt at the 9 pt floor, so it never fitted, and the
        // form has nowhere to put a second line: the 23.63 pt of paper measured
        // below the slot is the «По системе ЭДО» row (422.78–432.21) and the
        // paragraph gap before §4. Writing there would attach the address to a
        // different delivery method. This page's 19.98 pt reserve is already
        // committed to the identity paragraph, so an inserted row is not
        // available either.
        //
        // What Word does with that line is simply reflow it: the typed address
        // takes the room it needs and the parenthetical instruction moves
        // right. Block 148 is exactly the underscores plus that instruction —
        // one complete q…Q block, 583 bytes — so replacing it reproduces the
        // line with the blank as vector underline and the instruction after it.
        // The ☐ glyph and the words «По электронной почте» are NOT in the
        // range and stay printed by the source.
        //
        // Line room: 149.42 → 557.60 (the identity block's right edge, the
        // widest text boundary this page states) = 408.18 pt. Address at 9 pt
        // plus a space plus the 173.64 pt instruction is 309.9 pt for an
        // ordinary address and 358.6 pt for the longest realistic one, so both
        // stay on the source's own single line and nothing below moves.
        id: 'accession-application-fl-report-email',
        type: 'wordFlowBlock',
        page: 0,
        frame: {
          left: 149.42, baselineTop: 419.09, width: 408.18,
          initialLineCount: 1
        },
        font: 'legalSerif', fontSize: 8.52, minFontSize: 8.52,
        fontSizeLocked: true, lineHeight: 11.28, alignment: 'left',
        // As in the identity paragraph: the form's own instruction keeps the
        // source's 8.52 pt, the address the client has to be able to read is
        // drawn at the 9 pt floor.
        valueFontSize: 9,
        sourceReplacement: {
          firstBlock: 148, lastBlock: 148,
          expectedBlockCount: 1, expectedPageBlockCount: 264,
          expectedSha256: '7b324e48a1e1710de59fcb82c97616426be831042a01d1163c49b5ab36f00093',
          expectedTemplateSha256: '8fec088402d46b6a9251e92ceee15f4a7cdc74b12684f7be339194d04904c1e6',
          reviewStatus: 'approved'
        },
        sourceStaticText: '______________________' +
          '(необходимо указать адрес электронной почты)',
        runs: [
          {
            type: 'fieldRef', fieldId: 'reportEmail',
            // The form prints this blank whether or not e-mail delivery was
            // chosen. `blankWhenEmpty` reproduces it at the measured 93.4 pt,
            // so selecting «в офисе», «по почте» or «ЭДО» leaves the line
            // looking exactly like the source instead of deleting its rule.
            blankWhenEmpty: true,
            decoration: {
              underline: true, minWidth: 93.4, thickness: 0.36, offset: 1.2
            }
          },
          // The source sets the instruction immediately after the last
          // underscore. One space keeps a filled-in address from touching the
          // opening bracket; it adds no visible glyph and no token.
          { type: 'space' },
          {
            type: 'static',
            text: '(необходимо указать адрес электронной почты)'
          }
        ]
      }
    ],

    fields: [
      // ── Page 1 — identity line ────────────────────────────────────────────
      // "Настоящим, ____, паспорт серии ___, № ___, выдан ____, дата выдачи
      //  «__» _____г., проживающий(ая) по адресу (регистрации): ____."
      {
        id: 'clientFullName',
        source: 'field.clientFullName',
        page: 0, left: 114.0, baselineTop: 99.26, width: 203.9,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true,
        layoutMode: 'flow-reference',
        flowBlockId: 'accession-application-fl-identity'
      },
      {
        id: 'passportSeries',
        source: 'field.passportSeries',
        page: 0, left: 409.0, baselineTop: 99.26, width: 29.8,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center',
        layoutMode: 'flow-reference', flowBlockId: 'accession-application-fl-identity'
      },
      {
        id: 'passportNumber',
        source: 'field.passportNumber',
        page: 0, left: 475.3, baselineTop: 99.26, width: 46.7,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center',
        layoutMode: 'flow-reference', flowBlockId: 'accession-application-fl-identity'
      },
      // ── Continuation lines for the identity paragraph ─────────────────────
      // The paragraph is justified prose with fixed blanks, so a long issuing
      // authority or address cannot simply take more of its own line. Below it
      // the page is empty from 140.22 down to 159.95, where «1. Присоединяется»
      // begins — 19.73 pt, which holds exactly two 9.5 pt lines:
      //
      //     140.22 ┄┄┄┄┄┄┄┄ top of the blank band
      //     148.70  continuation of the registration address
      //     157.70  continuation of the passport issuing authority
      //     159.95 ┄┄┄┄┄┄┄┄ §1 heading
      //
      // Each is a real, reviewed line: a baseline plus a rule of the same
      // 0.36 pt weight and the same 1.5 pt drop below the baseline as the
      // underscore rules Word produced on this page, so the filled form reads
      // as though the lines had been in the source document all along.
      // `maxFontSize` records that this particular band cannot hold more than
      // 9.5 pt — without it the engine would happily draw 12 pt text over the
      // printed paragraph above.
      //
      // Band measured with tools/qa/measure_field_room.py --gaps; rule weight
      // measured from a 1200 dpi rendering. See AUDIT_REPORT.md.
      {
        id: 'passportIssuedBy',
        label: 'Кем выдан паспорт',
        source: 'field.passportIssuedBy',
        page: 0, left: 56.6, baselineTop: 118.82, width: 352.6,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'left',
        layoutMode: 'flow-reference',
        flowBlockId: 'accession-application-fl-identity'
      },
      // The printed date reads:  дата выдачи «___» _________г.
      // Measured glyph geometry of that line (tools/probe-pdf-coords.py):
      //   «  ends at 487.01,  » starts at 499.66   -> day slot     12.65 pt
      //   underline starts 513.69, "г." starts 551.93 -> month+year 38.24 pt
      //
      // The form provides ONE blank for the month and the year together, so
      // both are drawn into it as "апреля 2008": a spelled-out genitive month
      // followed by the four-digit year, the way these forms are filled in by
      // hand. Never a numeric MM.YYYY.
      //
      // Widths of "<month> 2008" range from 32.26 pt (мая) to 51.45 pt
      // (сентября) at 8.52 pt, so at the 9 pt readability floor only the
      // shortest month names still fit the 37.5 pt blank. The rest fall back to
      // the numeric form below rather than being drawn at an unreadable size.
      {
        id: 'passportIssueDay',
        source: 'field.passportIssueDate', format: 'dateDay',
        page: 0, left: 487.0, baselineTop: 118.82, width: 12.6,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center',
        layoutMode: 'flow-reference', flowBlockId: 'accession-application-fl-identity'
      },
      {
        // A genitive month plus the year needs up to 51 pt at 8.52 pt and far
        // more at the readable 9 pt floor, but the printed blank is 37.5 pt.
        // «09.2018» is the same date, is unambiguous, and is an accepted way of
        // completing this slot by hand — so it is the declared safe fallback
        // rather than an error the manager cannot act on.
        id: 'passportIssueMonthYear',
        source: 'field.passportIssueDate', format: 'dateMonthYearGenitive',
        fallbacks: ['dateMonthYearShort'],
        page: 0, left: 513.7, baselineTop: 118.82, width: 37.5,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center',
        layoutMode: 'flow-reference', flowBlockId: 'accession-application-fl-identity'
      },
      // The address closes the identity sentence, so its continuation takes the
      // first of the two reviewed lines — directly under the line it continues.
      {
        id: 'registrationAddress',
        label: 'Адрес регистрации',
        source: 'field.registrationAddress',
        page: 0, left: 217.7, baselineTop: 138.38, width: 339.9,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'left',
        layoutMode: 'flow-reference',
        flowBlockId: 'accession-application-fl-identity'
      },

      // ── §1 Присоединение ──────────────────────────────────────────────────
      check('accessionBrokerage', 'check.accession-brokerage', true, 0, 56.6, 177.98),
      check('accessionDepository', 'check.accession-depository', true, 0, 56.6, 198.86),

      // ── §2 Счёт депо / торговый счёт депо ─────────────────────────────────
      // Mutually exclusive: three definitions share one normalised value.
      check('depoOwner', 'extra.depo-account-type', 'owner', 0, 56.6, 249.5),
      check('depoNominee', 'extra.depo-account-type', 'nominee', 0, 56.6, 260.3),
      check('depoTrustee', 'extra.depo-account-type', 'trustee', 0, 56.6, 271.85),

      check('tradingDepoOwner', 'extra.trading-depo-account-type', 'owner', 0, 56.6, 302.69),
      check('tradingDepoNominee', 'extra.trading-depo-account-type', 'nominee', 0, 56.6, 313.97),
      check('tradingDepoTrustee', 'extra.trading-depo-account-type', 'trustee', 0, 56.6, 325.25),

      check('depoOperator', 'check.depo-operator', true, 0, 56.6, 345.89),

      // ── §3 Способ получения отчётов ───────────────────────────────────────
      check('reportsOffice', 'extra.report-delivery', 'office', 0, 56.6, 396.53),
      check('reportsPost', 'extra.report-delivery', 'post', 0, 56.6, 407.81),
      check('reportsEmail', 'extra.report-delivery', 'email', 0, 56.6, 419.09),
      check('reportsEdo', 'extra.report-delivery', 'edo', 0, 56.6, 430.37),
      {
        // Address printed on the "По электронной почте ______" line. It belongs
        // to that delivery option only, so it stays blank whenever another
        // method (офис / почта / ЭДО) is selected.
        //
        // Laid out by the reviewed Word-flow block for that line, which lets a
        // complete address take the room the printed instruction is reflowed
        // out of. `left`/`width` remain the measured printed blank, which is
        // what the block reproduces as the value's minimum slot.
        id: 'reportEmail',
        source: 'subject.email', optional: true,
        showWhen: { source: 'extra.report-delivery', equals: 'email' },
        page: 0, left: 149.4, baselineTop: 419.09, width: 93.4,
        font: 'legalSerif', fontSize: SIZE_10_5, minFontSize: MIN, align: 'left',
        layoutMode: 'flow-reference',
        flowBlockId: 'accession-application-fl-report-email'
      },

      // ── §4 Рынки и тарифные планы ─────────────────────────────────────────
      check('marketStock', 'check.market-stock', true, 0, 62.1, 471.07),
      check('marketDerivatives', 'check.market-derivatives', true, 0, 62.1, 516.19),
      check('marketCurrency', 'check.market-currency', true, 0, 62.1, 531.91),
      // Tariff values sit after the printed "Тарифный план:" label on the same
      // line. The label ends at ~505.8 pt and the text block at ~557.6 pt, so
      // the slot itself is barely 51 pt — about ten Cyrillic characters at the
      // 9 pt readability floor. «Базовый» fits, «Стандартный» does not.
      //
      // Each tariff row is followed by blank space across the whole column
      // (measured 472.19–502.75, 512.99–522.79 and 533.03–545.00), so each one
      // gets a reviewed continuation line spanning the full column width from
      // the label's left edge, 437.7 pt, to the text block's right edge. That
      // takes the usable length to roughly 35 characters without touching the
      // market checkboxes above or the next printed label below.
      //
      // Only the measured coordinates differ between the three; every visible
      // typographic decision comes from `tariff()` and is shared.
      tariff('tariffStock', 'фондовый рынок', 'extra.tariff-stock',
             506.8, 470.35, 50.8, 481.00),
      tariff('tariffDerivatives', 'срочный рынок', 'extra.tariff-derivatives',
             506.5, 511.15, 51.1, 520.60),
      tariff('tariffCurrency', 'валютный рынок', 'extra.tariff-currency',
             506.5, 531.19, 51.1, 541.50),

      // ── §5 Соглашения ─────────────────────────────────────────────────────
      check('agreementEsign', 'check.agreement-esignature', true, 0, 62.1, 602.11),
      check('agreementQuik', 'check.agreement-quik', true, 0, 62.1, 613.15),

      // ── §6 Перечисление доходов по ценным бумагам ─────────────────────────
      check('payoutBrokerAccount', 'extra.income-payout', 'broker-account', 0, 58.8, 653.5),
      check('payoutBankDetails', 'extra.income-payout', 'bank-details', 0, 58.8, 674.26),

      // ── Page 2 — §16 contact table, client column ─────────────────────────
      // The right-hand column holds the broker's own fixed contacts and is
      // already printed in the template.
      //
      // NOTE: the checkbox glyph at (225.3, 597.91) on this page belongs to the
      // sentence "Проставление любого символа в графе ☐ означает согласие…".
      // It is explanatory text, NOT a fillable control, and is intentionally
      // absent from this map.
      {
        id: 'clientPhone',
        source: 'subject.phone',
        page: 1, left: 101.5, baselineTop: 700.9, width: 193.0,
        font: 'legalSerif', fontSize: SIZE_9_5, minFontSize: MIN, align: 'left'
      },
      {
        id: 'clientEmail',
        source: 'subject.email',
        page: 1, left: 139.6, baselineTop: 712.78, width: 155.0,
        font: 'legalSerif', fontSize: SIZE_10_5, minFontSize: MIN, align: 'left'
      },

      // ── Page 2 — signature block ──────────────────────────────────────────
      // Printed as:  "_____"__________" 20____ г.
      {
        id: 'signDay',
        source: 'field.documentDateRu', format: 'dateDay',
        page: 1, left: 309.8, baselineTop: 732.82, width: 21.3,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center'
      },
      {
        // The template already prints "20", so only the month name belongs
        // here; the two remaining year digits go in the next slot.
        id: 'signMonth',
        source: 'field.documentDateRu', format: 'monthOnly',
        page: 1, left: 334.5, baselineTop: 732.82, width: 42.5,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center'
      },
      {
        id: 'signYear',
        source: 'field.documentDateRu', format: 'dateYear2',
        page: 1, left: 391.0, baselineTop: 732.82, width: 17.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center'
      },
      // The long rule before the parentheses is where the client signs by hand
      // and is deliberately left empty. Only the printed name is drawn.
      {
        // Only 46.68 pt between the printed parentheses (measured: 400.28 to
        // 446.96), which at the 9 pt readability floor holds about ten Cyrillic
        // characters — the printed convention here is "Фамилия И.О." anyway.
        //
        // A long hyphenated surname needs more than that, and the area directly
        // under the parentheses is blank down to the page margin («Подпись»
        // ends at 764.06 and «М.П.» sits to the right, from x 453.34). One
        // reviewed continuation line therefore sits under the parentheses, the
        // same width and centred the same way, so the transcript continues
        // inside the signature block instead of failing. The surname keeps its
        // own hyphen as the break, so nothing is abbreviated or invented.
        id: 'signatureName',
        label: 'Расшифровка подписи',
        source: 'field.clientFullName', format: 'initials', fallbacks: ['surname'],
        page: 1, left: 400.3, baselineTop: 752.38, width: 46.7,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center',
        overflowStrategy: 'flow',
        flowRegions: [
          { page: 1, left: 400.3, baselineTop: 752.38, width: 46.7, maxLines: 1 },
          {
            page: 1, left: 400.3, baselineTop: 778.00, width: 46.7, maxLines: 1,
            align: 'center', maxFontSize: 9.5,
            generated: true, reviewStatus: 'approved',
            drawUnderline: true, underlineThickness: 0.36, underlineOffset: 1.6
          }
        ]
      }

      // ── Page 3 — "Заполняется ООО «Инвестика»" ────────────────────────────
      // Registration number, contract numbers/dates, internal client code and
      // the officer's position/name/signature are completed by Investica staff
      // after printing. Left blank by design — see docs/document-pdf-generation.md.
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
