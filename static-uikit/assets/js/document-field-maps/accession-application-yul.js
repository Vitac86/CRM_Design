// Field map — ПРИЛОЖЕНИЕ 1В К РЕГЛАМЕНТУ.
// ЗАЯВЛЕНИЕ О ПРИСОЕДИНЕНИИ (ДЛЯ ЮРИДИЧЕСКИХ ЛИЦ).
//
// Base template : assets/document-pdf-templates/accession-application-yul.pdf
// Source Word   : "ПРИЛОЖЕНИЕ 1В К РЕГЛАМЕНТУ. ЗАЯВЛЕНИЕ О ПРИСОЕДИНЕНИИ (ЮЛ).docx"
// Source SHA-256: D92604FAFE61C4CBA0B48A65AE7A17D488F038A493DF3DFD2EE5F12137437BD7
// Pages         : 2 (A4, 595.32 × 841.92 pt; no AcroForm/widgets)
//
// This is the legal-entity counterpart of the approved Appendix 1А map. All
// coordinates were measured independently from this two-page export with
// PyMuPDF; page/line positions are not copied from Appendix 1А.

(function (global) {
  'use strict';

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 12;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller
  var CHECK_GLYPH = 8.52;  // printed ☐ box — geometry, not dynamic text
  var SIZE_10_5 = 10.5;      // measured room: 10.64 pt
  var SIZE_10 = 10;        // measured room: 10.08 pt
  var SIZE_9 = 9;         // measured room: 9.43, 8.98, 8.98, 7.60 pt

  // ── Typography that belongs to the source form, not to the client value ───
  //
  // Same policy as the ФЛ form (1А), measured on this template:
  //   signature date   one printed span `"_____"__________" 20____ г.` in
  //                    TimesNewRomanPSMT 8.52 pt on baseline 496.39;
  //   internal table   «Заполняется ООО «Инвестика»» set in TimesNewRomanPSMT
  //                    at 9.00 pt throughout.
  // The 9 pt readability floor keeps the date 0.48 pt from the printed original
  // instead of the 3.48 pt the generic 12 pt client size produced.
  var SOURCE_FONT = 'legalSerif';
  var SOURCE_DATE_SIZE = 9;    // template prints 8.52 pt; 9 pt is the floor
  var SOURCE_DATE_GROUP = 'accession-yul-source-date';
  var SOURCE_TABLE_SIZE = 9;   // template prints 9.00 pt exactly
  var SOURCE_TABLE_GROUP = 'accession-yul-internal-table';

  // One value cell of the internal «Заполняется ООО «Инвестика»» table
  // (page index 1). Grid measured from the template:
  //   columns  57.12 | 268.25 | 400.39 | 536.02
  //   rows     575.83 header · 596.83 registration · 621.58 brokerage
  //            642.82 depository · 666.70 client code · 688.18 employee header
  //            709.54 employee row · 731.02 bottom
  // The vertical rule at 400.39 is absent between 667.18 and 688.18, so the
  // client-code row is one merged cell.
  function internalCell(id, label, source, centreX, baselineTop, width,
                        format, options) {
    var w = width == null ? 126 : width;
    var o = options || {};
    return {
      id: id,
      label: label,
      source: source,
      required: !!o.required,
      optional: !o.required,
      typographyGroup: SOURCE_TABLE_GROUP,
      page: 1,
      left: centreX - w / 2,
      baselineTop: baselineTop,
      width: w,
      font: SOURCE_FONT,
      fontSize: SOURCE_TABLE_SIZE,
      minFontSize: MIN,
      align: 'center',
      maxLines: 1,
      // Dates arrive ISO from the wizard's date input and RU from the
      // CRM payload; `dateRu` accepts both and prints дд.мм.гггг.
      format: format
    };
  }
  // The source's own line pitch inside the market table's tariff column
  // (measured label baselines 502.00 → 511.72 → 521.56). An added tariff line —
  // and the table row that has to grow to hold it — uses exactly that step.
  var TARIFF_PITCH = 9.72;

  // ── The three tariff plans are one visual group ───────────────────────────
  //
  // «Тарифный план» appears three times in the market table, once per market,
  // and a reader takes in all three at once — they are a column of answers to
  // the same question. So they get ONE typography policy: one face, one size,
  // one leading, one alignment, one clearance from the rules around them. A row
  // that is set larger than the row above it does not read as emphasis, it
  // reads as a mistake in the form.
  //
  // The size that policy can be is decided by the tightest of the three, and
  // the three are not alike (measure_field_room.py, room = the largest size
  // whose ascender still clears whatever is printed above the baseline):
  //
  //   фондовый    room 13.86 pt   label ends 521.15, baseline 533.50
  //   валютный    room 12.22 pt   label ends 582.11, baseline 593.00
  //   срочный     room  7.60 pt   label ends 552.23, baseline 559.00
  //
  // So 12 pt is available to two of the three and not to the third, which is
  // exactly the 12 / 9 / 12 the form must not print. 10 and 11 pt fail on the
  // same row for the same reason: «срочный» prints its label on ONE line
  // instead of two, which leaves its value 6.77 pt of headroom, and a 10 pt
  // ascender is 8.91 pt.
  //
  // Row growth does not rescue it. Growing the row adds space BELOW the
  // baseline; what is missing is above it, against a printed label. Buying the
  // headroom would mean moving the value's baseline ~4 pt down as well, which
  // costs a 9.72 pt row on every legal-entity application that names a срочный
  // tariff — printed or not, large or small — and leaves that one value sitting
  // visibly lower in its row than the other two do in theirs. Distorting the
  // table on every document to gain 3 pt on one value is not worth it.
  //
  // The largest size all three can share is therefore the 9 pt readability
  // floor, which is also what the individual form (1А) already prints. Nine
  // points is a deliberate floor, not a fallback: no client value goes below
  // it anywhere in this repository.
  var TARIFF_GROUP = 'accession-tariff-plans';
  var TARIFF_SIZE = SIZE_9;
  var TARIFF_ALIGN = 'center';       // the source centres this column
  var TARIFF_WIDTH = 71.5;           // column 468.22–545.74 less its padding
  var TARIFF_LEFT = 471.5;

  // One tariff value. Every typographic decision is shared and stated once;
  // the arguments are only the geometry the source measured differently for
  // each row. `typographyGroup` says out loud that these three belong
  // together, and the production validator refuses a map where two members of
  // one group are set differently.
  // `printedLines` is the only per-row difference that is not a coordinate:
  // how many lines the source's own row has room for before one has to be
  // added. That is geometry the form decided — «валютный» prints its label on
  // two lines and leaves 30.56 pt underneath, «срочный» prints one and leaves
  // 9.80 — and it is not something a reader compares between rows. What a
  // reader does compare, the type itself, is identical for all three.
  function tariff(id, market, source, baselineTop, printedLines,
                  insertionTop, baselineOffset) {
    return {
      id: id,
      label: 'Тарифный план (' + market + ')',
      source: source,
      optional: true,
      typographyGroup: TARIFF_GROUP,
      page: 0,
      left: TARIFF_LEFT,
      baselineTop: baselineTop,
      width: TARIFF_WIDTH,
      font: 'legalSerif',
      fontSize: TARIFF_SIZE,
      minFontSize: MIN,
      align: TARIFF_ALIGN,
      // Every real plan name is two words — «Стандартный фондовый» is 93.02 pt
      // in a 71.5 pt column — so every row has to be able to show a second
      // line, and it has to look the same wherever it lands. The leading is
      // the source's own label pitch, which is also the height of an inserted
      // row, so a value that wraps inside its printed row and a value that
      // wraps into a grown one keep exactly the same rhythm.
      multiline: printedLines > 1,
      maxLines: printedLines,
      lineHeight: TARIFF_PITCH,
      overflowStrategy: 'expand-layout',
      expansion: {
        page: 0, insertionTop: insertionTop, shiftFromTop: insertionTop,
        rowHeight: TARIFF_PITCH, maxExtraRows: 1, maxFontSize: TARIFF_SIZE,
        lineStyle: 'table-row', reviewStatus: 'approved',
        rowLeft: 56.64, rowWidth: 489.1,
        borders: { left: false, right: false, top: false, bottom: false },
        columns: [],
        line: {
          left: TARIFF_LEFT, width: TARIFF_WIDTH,
          baselineOffset: baselineOffset, ruleThickness: 0.48
        }
      }
    };
  }

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
    id: 'accession-application-yul',
    title: 'Заявление о присоединении (ЮЛ)',
    templateUrl: '../assets/document-pdf-templates/accession-application-yul.pdf',
    outputFilename: 'zayavlenie-o-prisoedinenii-yul.pdf',
    expectedPages: 2,
    appliesTo: ['company'],

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    // Page 1 has 41.86 pt of reviewed reserve below its last body line, and it
    // is one budget for the whole page, not one per anchor. Four anchors may
    // draw on it in top-to-bottom order — the applicant block and the three
    // tariff rows — and each spends only the complete 9.72 pt source-line steps
    // its own value actually needs. The worst realistic company payload asks
    // for one applicant row plus a second line in the фондовый and срочный
    // tariffs: 9.72 + 9.72 + 9.72 = 29.16 pt of the 41.86 pt available.
    pageLayout: {
      0: {
        fixedHeaderUntil: 0,
        bodyBottom: 794.06,
        fixedFooterFrom: 841.92,
        shiftToTop: 835.92,
        bottomClearance: 6,
        compaction: [],
        anchors: [
          'accession-application-yul-applicant',
          'tariffStock',
          'tariffDerivatives',
          'tariffCurrency'
        ]
      }
    },

    wordFlowBlocks: [
      {
        id: 'accession-application-yul-applicant',
        type: 'wordFlowBlock',
        page: 0,
        frame: { left: 56.64, baselineTop: 101.78, width: 472.88, initialLineCount: 8 },
        font: 'legalSerif', fontSize: 8.52, minFontSize: 8.52,
        fontSizeLocked: true, lineHeight: 9.72, alignment: 'left',
        // As in the individual form: the printed wording keeps its 8.52 pt,
        // the entered values are drawn at the 9 pt floor. Measured cost for
        // this block: none — the worst production profile still asks for one
        // continuation row out of the four it is allowed.
        valueFontSize: 9,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 171.4, shiftFromTop: 171.4,
          rowHeight: 9.72, maxExtraRows: 4, lineStyle: 'none',
          // The market-table rules are top-level PDF paths, while their text is
          // emitted in balanced blocks. Applicant growth sits above both and
          // must translate the complete visual table through the same plan.
          moveTopLevelPaths: true,
          reviewStatus: 'approved'
        },
        sourceReplacement: {
          firstBlock: 21, lastBlock: 54,
          expectedBlockCount: 34,
          expectedSha256: 'f9f18c98003454f232f074af6ff45ad5650b9f68aaa584a357bc8e468958f7a2',
          expectedTemplateSha256: '1b3365ce9ed177fb5069ae67ab70d8e5bc6556bbcb160544a439a2db2be9067d',
          reviewStatus: 'approved'
        },
        sourceStaticText: 'Полное наименование юридического лица: ' +
          'Полное или сокращенное наименование на иностранном языке (для клиента-нерезидента): ' +
          'Государственный регистрационный номер (ОГРН для клиента - резидента РФ/ номер и дата ' +
          'регистрации (при наличии), орган регистрации для клиента – нерезидента РФ): ' +
          'Адрес регистрации/местонахождение (страна, индекс, регион, населенный пункт, индекс, ' +
          'улица, дом, корпус/строение, литера, офис): ФИО и должность подписанта: ' +
          'Документ, подтверждающий полномочия:',
        runs: [
          { type: 'static', text: 'Полное наименование юридического лица: ' },
          { type: 'fieldRef', fieldId: 'companyFullLegalName' },
          { type: 'paragraphBreak' },
          {
            type: 'static',
            text: 'Полное или сокращенное наименование на иностранном языке (для клиента-нерезидента): '
          },
          { type: 'fieldRef', fieldId: 'companyForeignName' },
          { type: 'paragraphBreak' },
          {
            type: 'static',
            text: 'Государственный регистрационный номер (ОГРН для клиента - резидента РФ/ ' +
              'номер и дата регистрации (при наличии), орган регистрации для клиента – нерезидента РФ): '
          },
          { type: 'fieldRef', fieldId: 'companyOgrn', keepTogether: true },
          { type: 'paragraphBreak' },
          {
            type: 'static',
            text: 'Адрес регистрации/местонахождение (страна, индекс, регион, населенный пункт, ' +
              'индекс, улица, дом, корпус/строение, литера, офис): '
          },
          { type: 'fieldRef', fieldId: 'companyLegalAddress' },
          { type: 'paragraphBreak' },
          { type: 'static', text: 'ФИО и должность подписанта: ' },
          { type: 'fieldRef', fieldId: 'representativeSignerLine' },
          { type: 'paragraphBreak' },
          { type: 'static', text: 'Документ, подтверждающий полномочия: ' },
          { type: 'fieldRef', fieldId: 'representativeAuthority' }
        ]
      },
      {
        // The §3 report-delivery e-mail line, resolved exactly as on the
        // individual form (see accession-application-fl.js for the full
        // reasoning). The printed blank is 22 underscores, 93.51 pt, and an
        // ordinary client address is 136.25 pt at the 9 pt floor. The 23 pt
        // measured below the slot is the «По системе ЭДО» row, so it is not
        // this field's space.
        //
        // Blocks 167–168 are the underscores (F2) and the parenthetical
        // instruction (F1). Replacing exactly those two reflows the line the
        // way Word would: the address takes what it needs and the instruction
        // follows it. The ☐ and «По электронной почте» stay printed.
        //
        // Line room: 155.42 → 529.40, this form's own body-text boundary,
        // = 373.98 pt. Address at 9 pt plus a space plus the 173.64 pt
        // instruction is 309.9 pt ordinary and 360.6 pt for the longest
        // realistic address, so both fit the source's single line.
        id: 'accession-application-yul-report-email',
        type: 'wordFlowBlock',
        page: 0,
        frame: {
          left: 155.42, baselineTop: 458.35, width: 373.98,
          initialLineCount: 1
        },
        font: 'legalSerif', fontSize: 8.52, minFontSize: 8.52,
        fontSizeLocked: true, lineHeight: 11.04, alignment: 'left',
        valueFontSize: 9,
        sourceReplacement: {
          firstBlock: 167, lastBlock: 168,
          expectedBlockCount: 2, expectedPageBlockCount: 221,
          expectedSha256: '2062817ce59905265c1374816d0cb009e6232fa2b197e76cde90a36245bf73a4',
          expectedTemplateSha256: '1b3365ce9ed177fb5069ae67ab70d8e5bc6556bbcb160544a439a2db2be9067d',
          reviewStatus: 'approved'
        },
        sourceStaticText: '______________________' +
          '(необходимо указать адрес электронной почты)',
        runs: [
          {
            type: 'fieldRef', fieldId: 'reportEmail',
            blankWhenEmpty: true,
            decoration: {
              underline: true, minWidth: 93.51, thickness: 0.36, offset: 1.2
            }
          },
          { type: 'space' },
          {
            type: 'static',
            text: '(необходимо указать адрес электронной почты)'
          }
        ]
      }
    ],

    fields: [
      // ── Page 1 — applicant details ─────────────────────────────────────
      // These labels have no underscore glyphs. Each left edge is the measured
      // end of its printed label plus a small typing gap; the right edge is the
      // same 529.4 pt body-text boundary used by the source.
      {
        id: 'companyFullLegalName',
        source: 'field.client-full-legal-name',
        page: 0, left: 218.0, baselineTop: 101.78, width: 311.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true,
        layoutMode: 'flow-reference', flowBlockId: 'accession-application-yul-applicant'
      },

      {
        id: 'companyForeignName',
        source: 'field.client-english-name', optional: true,
        page: 0, left: 389.0, baselineTop: 111.50, width: 140.0,
        font: 'legalSerif', fontSize: SIZE_9, minFontSize: MIN,
        align: 'left',
        layoutMode: 'flow-reference', flowBlockId: 'accession-application-yul-applicant'
      },

      // "Наименование на иностранном языке" is explicitly for a
      // nonresident. The current normalized company data has no trusted
      // residency branch, so a resident company's `englishName` is not printed
      // here. The line deliberately remains blank rather than guessing.
      {
        id: 'companyOgrn',
        source: 'field.client-ogrn',
        page: 0, left: 224.0, baselineTop: 131.18, width: 305.0,
        font: 'legalSerif', fontSize: SIZE_9, minFontSize: MIN,
        align: 'left', required: true,
        layoutMode: 'flow-reference', flowBlockId: 'accession-application-yul-applicant'
      },
      {
        id: 'companyLegalAddress',
        source: 'field.client-legal-address',
        page: 0, left: 84.5, baselineTop: 150.74, width: 444.5,
        font: 'legalSerif', fontSize: SIZE_9, minFontSize: MIN,
        align: 'left', required: true,
        layoutMode: 'flow-reference', flowBlockId: 'accession-application-yul-applicant'
      },
      {
        // One source slot asks for both values. buildFields supplies the
        // normalized "<full name>, <role>" string for the selected signatory,
        // allowing one shrink-to-fit decision instead of two overlapping boxes.
        id: 'representativeSignerLine',
        source: 'field.representativeSignerLine',
        page: 0, left: 174.0, baselineTop: 160.46, width: 355.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true,
        layoutMode: 'flow-reference', flowBlockId: 'accession-application-yul-applicant'
      },
      {
        id: 'representativeAuthority',
        source: 'field.representativeAuthority',
        page: 0, left: 215.0, baselineTop: 170.18, width: 314.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true,
        layoutMode: 'flow-reference', flowBlockId: 'accession-application-yul-applicant'
      },

      // ── §1 Joining the agreements ──────────────────────────────────
      check('accessionBrokerage', 'check.accession-brokerage', true, 0, 56.6, 229.58),
      check('accessionDepository', 'check.accession-depository', true, 0, 56.6, 250.34),

      // ── §2 Depo / trading-depo account type ─────────────────────────
      check('depoOwner', 'extra.depo-account-type', 'owner', 0, 56.6, 300.53),
      check('depoNominee', 'extra.depo-account-type', 'nominee', 0, 56.6, 311.57),
      check('depoTrustee', 'extra.depo-account-type', 'trustee', 0, 56.6, 322.61),

      check('tradingDepoOwner', 'extra.trading-depo-account-type', 'owner', 0, 56.6, 353.09),
      check('tradingDepoNominee', 'extra.trading-depo-account-type', 'nominee', 0, 56.6, 364.13),
      check('tradingDepoTrustee', 'extra.trading-depo-account-type', 'trustee', 0, 56.6, 375.17),

      check('depoOperator', 'check.depo-operator', true, 0, 56.6, 395.93),

      // ── §3 Report delivery ───────────────────────────────────────────
      check('reportsOffice', 'extra.report-delivery', 'office', 0, 56.6, 436.37),
      check('reportsPost', 'extra.report-delivery', 'post', 0, 56.6, 447.43),
      check('reportsEmail', 'extra.report-delivery', 'email', 0, 56.6, 458.35),
      check('reportsEdo', 'extra.report-delivery', 'edo', 0, 56.6, 469.39),
      {
        // Laid out by the reviewed Word-flow block for this line; `left`/`width`
        // stay the measured printed blank it reproduces.
        id: 'reportEmail',
        source: 'subject.email', optional: true,
        showWhen: { source: 'extra.report-delivery', equals: 'email' },
        page: 0, left: 155.42, baselineTop: 458.35, width: 93.51,
        font: 'legalSerif', fontSize: SIZE_10, minFontSize: MIN,
        align: 'left',
        layoutMode: 'flow-reference',
        flowBlockId: 'accession-application-yul-report-email'
      },

      // ── §4 Markets and tariff plans ───────────────────────────────────
      check('marketStock', 'check.market-stock', true, 0, 62.1, 510.31),
      check('marketDerivatives', 'check.market-derivatives', true, 0, 62.1, 555.43),
      check('marketCurrency', 'check.market-currency', true, 0, 62.1, 571.15),
      // ── The tariff column ─────────────────────────────────────────────────
      //
      // The market table's right-hand column is x 468.22–545.74 and gives a
      // value 71.5 pt of usable width. Every real tariff name is two words —
      // «Стандартный фондовый» is 93.02 pt at the 9 pt floor — so no product's
      // plan ever fitted on one line and all three fell back to «Стандартный».
      //
      // The three values are set identically (see TARIFF_GROUP above). What
      // differs is only where the source put them, and each was measured on its
      // own:
      //
      //   фондовый   row 501.19–541.99, label on two printed lines ending at
      //              521.15, value baseline 533.5. A second line at 543.22
      //              would cross the row's bottom border → the row must grow.
      //   срочный    row 541.99–562.03, label on one line ending at 552.23,
      //              value baseline 559.0, 9.8 pt left → one line only, the
      //              row must grow.
      //   валютный   row 562.03–612.67, label on two lines ending at 582.11,
      //              value baseline 593.0 and 30.56 pt of the row's own
      //              padding below it → two lines fit inside the printed row,
      //              so this one grows nothing.
      //
      // Growth is a complete table row, not just more text: the source's own
      // 9.72 pt line pitch, the row's bottom rule and every rule, cell and
      // overlay below it move down together. This table draws no vertical
      // rules — its rules are three horizontal segments per row across
      // 56.64–545.74 — so an inserted row needs no borders of its own; the
      // bottom rule travelling down is what closes it.
      //
      // Each cut sits in the measured blank band between the last thing its own
      // row paints — which is the WIDE left-hand cell, not the narrow tariff
      // one — and the first thing the row below paints:
      //   фондовый   540.19 (left cell of the row) … 541.87 → 540.41
      //   срочный    560.23 …………………………………………… 561.91 → 561.43
      //   валютный   610.75 …………………………………………… 612.58 → 610.85
      //   python static-uikit/tools/qa/check_expansion_anchors.py --suggest
      //
      // Only the geometry below differs between the three rows — where the
      // value sits and where its row may be cut. Everything a reader can see
      // about the type comes from `tariff()`, so the three cannot drift apart.
      tariff('tariffStock', 'фондовый рынок', 'extra.tariff-stock',
             533.5, 1, 540.41, 2.81),
      tariff('tariffDerivatives', 'срочный рынок', 'extra.tariff-derivatives',
             559.0, 1, 561.43, 7.29),
      tariff('tariffCurrency', 'валютный рынок', 'extra.tariff-currency',
             593.0, 2, 610.85, 1.59),

      // ── §5 Agreements ─────────────────────────────────────────────────
      check('agreementEsign', 'check.agreement-esignature', true, 0, 62.1, 641.38),
      check('agreementQuik', 'check.agreement-quik', true, 0, 62.1, 652.42),

      // ── §6 Securities-income destination ───────────────────────────────
      check('payoutBrokerAccount', 'extra.income-payout', 'broker-account', 0, 58.8, 692.74),
      check('payoutBankDetails', 'extra.income-payout', 'bank-details', 0, 61.0, 723.34),

      // ── Page 2 — client contacts ─────────────────────────────────────
      {
        id: 'clientPhone',
        source: 'subject.phone',
        page: 1, left: 102.0, baselineTop: 464.35, width: 191.5,
        font: 'legalSerif', fontSize: SIZE_9, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'clientEmail',
        source: 'subject.email',
        page: 1, left: 140.0, baselineTop: 476.23, width: 153.5,
        font: 'legalSerif', fontSize: SIZE_10_5, minFontSize: MIN,
        align: 'left', required: true
      },

      // ── Page 2 — client date and printed signer name ─────────────────────
      {
        // Measured underscore runs (baseline 496.39, TimesNewRomanPSMT
        // 8.52 pt): day 60.12..81.40, month 84.81..127.31, year 141.40..158.37.
        id: 'signDay',
        source: 'field.documentDateRu', format: 'dateDay',
        typographyGroup: SOURCE_DATE_GROUP,
        page: 1, left: 60.1, baselineTop: 496.39, width: 21.3,
        font: SOURCE_FONT, fontSize: SOURCE_DATE_SIZE, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'signMonth',
        source: 'field.documentDateRu', format: 'monthOnly',
        typographyGroup: SOURCE_DATE_GROUP,
        page: 1, left: 84.8, baselineTop: 496.39, width: 42.5,
        font: SOURCE_FONT, fontSize: SOURCE_DATE_SIZE, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'signYear',
        source: 'field.documentDateRu', format: 'dateYear2',
        typographyGroup: SOURCE_DATE_GROUP,
        page: 1, left: 141.4, baselineTop: 496.39, width: 17.0,
        font: SOURCE_FONT, fontSize: SOURCE_DATE_SIZE, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        // One transcript, one baseline — the same fix as the ФЛ form.
        //
        // The long rule (311.69..388.13) is for a handwritten signature and
        // stays empty. The printed parentheses give only 46.71 pt of interior
        // (393.09..439.80), which no legible "Фамилия И.О." fits, so the
        // reviewed region runs from just inside the "(" to the page's right
        // text margin, where baseline 535.51 is measured blank. «Подпись» is on
        // the next baseline (545.23) and «М.П.» below that (554.59, x 446.14),
        // so a 9 pt line reaching 537.4 touches neither.
        //
        // The source hard-codes the adjacent role as «Генеральный директор» and
        // it is preserved verbatim. No `surname` fallback: with the real width
        // the initials never have to be dropped.
        id: 'signatureName',
        label: 'Расшифровка подписи',
        source: 'field.representativeFullName', format: 'initials',
        page: 1, left: 393.09, baselineTop: 535.51, width: 145.59,
        font: SOURCE_FONT, fontSize: SOURCE_DATE_SIZE, minFontSize: MIN,
        align: 'left', maxLines: 1, required: true
      },

      // ── Page 2 — "Заполняется ООО «Инвестика»" ────────────────────────────
      //
      // Populated from what the document knows. Должность, ФИО and Подпись
      // stay blank: they belong to the Investica officer who signs after
      // printing and must never be filled from client data.
      //
      // The application's registration number and date also stay blank — no
      // UMI field is proven to hold them. See docs/umi-variable-registry.md.
      internalCell('brokerageContractNumber', 'Номер договора на брокерское обслуживание',
                   'field.extra-contract-number', 334.56, 630.46),
      internalCell('brokerageContractDate', 'Дата договора на брокерское обслуживание',
                   'field.extra-contract-date', 468.44, 630.46, null, 'dateRu'),
      // The depository label wraps onto two lines (651.70, 662.02); the value
      // sits on the row's first baseline, level with «Депозитарный договор».
      internalCell('depositoryContractNumber', 'Номер депозитарного договора',
                   'extra.extra-depository-contract', 334.56, 651.70, null, null,
                   { required: true }),
      internalCell('depositoryContractDate', 'Дата депозитарного договора',
                   'extra.extra-depository-contract-date', 468.44, 651.70, null, 'dateRu',
                   { required: true }),
      // The merged cell: ruled 268.73 .. 536.01, centred on 402.37.
      internalCell('internalClientCode', 'Код клиента в системе внутреннего учета',
                   'field.client-code', 402.37, 675.70, 261)

      // The checkbox at (212.0, 361.25) is explanatory prose, not a control.
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
