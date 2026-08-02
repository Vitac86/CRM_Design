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
  // The source's own line pitch inside the market table's tariff column
  // (measured label baselines 502.00 → 511.72 → 521.56). An added tariff line —
  // and the table row that has to grow to hold it — uses exactly that step.
  var TARIFF_PITCH = 9.72;

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
      // The three rows are NOT alike, and each was measured on its own:
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
      {
        id: 'tariffStock',
        label: 'Тарифный план (фондовый рынок)',
        source: 'extra.tariff-stock', optional: true,
        page: 0, left: 471.5, baselineTop: 533.5, width: 71.5,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center',
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 540.41, shiftFromTop: 540.41,
          rowHeight: TARIFF_PITCH, maxExtraRows: 1, maxFontSize: BODY,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 56.64, rowWidth: 489.1,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: [],
          line: {
            left: 471.5, width: 71.5,
            baselineOffset: 2.81, ruleThickness: 0.48
          }
        }
      },
      {
        id: 'tariffDerivatives',
        label: 'Тарифный план (срочный рынок)',
        source: 'extra.tariff-derivatives', optional: true,
        page: 0, left: 471.5, baselineTop: 559.0, width: 71.5,
        font: 'legalSerif', fontSize: SIZE_9, minFontSize: MIN,
        align: 'center',
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 561.43, shiftFromTop: 561.43,
          rowHeight: TARIFF_PITCH, maxExtraRows: 1, maxFontSize: SIZE_9,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 56.64, rowWidth: 489.1,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: [],
          line: {
            left: 471.5, width: 71.5,
            baselineOffset: 7.29, ruleThickness: 0.48
          }
        }
      },
      {
        id: 'tariffCurrency',
        label: 'Тарифный план (валютный рынок)',
        source: 'extra.tariff-currency', optional: true,
        page: 0, left: 471.5, baselineTop: 593.0, width: 71.5,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center',
        // This row's own padding holds the second line without growing
        // anything: 30.56 pt are free under the printed label. The leading is
        // the face's own ink height at the preferred size (0.9 em of 12 pt),
        // not the source's 9.72 pt label pitch, because these two lines are the
        // value's own — 593.0 and 603.80 leave the descender 6.28 pt clear of
        // the row's 612.67 rule.
        multiline: true, maxLines: 2, lineHeight: 10.8,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 610.85, shiftFromTop: 610.85,
          rowHeight: TARIFF_PITCH, maxExtraRows: 1, maxFontSize: BODY,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 56.64, rowWidth: 489.1,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: [],
          line: {
            left: 471.5, width: 71.5,
            baselineOffset: 1.59, ruleThickness: 0.48
          }
        }
      },

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
        id: 'signDay',
        source: 'field.documentDateRu', format: 'dateDay',
        page: 1, left: 60.1, baselineTop: 496.39, width: 21.3,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'signMonth',
        source: 'field.documentDateRu', format: 'monthOnly',
        page: 1, left: 84.8, baselineTop: 496.39, width: 42.5,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'signYear',
        source: 'field.documentDateRu', format: 'dateYear2',
        page: 1, left: 141.4, baselineTop: 496.39, width: 17.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        // The long rule is for a handwritten signature. Only the short name
        // inside parentheses is typed. The source hard-codes the adjacent role
        // as "Генеральный директор" and is preserved verbatim.
        id: 'signatureName',
        source: 'field.representativeFullName', format: 'initials', fallbacks: ['surname'],
        page: 1, left: 393.1, baselineTop: 535.51, width: 46.7,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      }

      // The checkbox at (212.0, 361.25) is explanatory prose, not a control.
      // The entire "Заполняется ООО «Инвестика»" table (page 2, y >= 575.83)
      // is completed later by staff and intentionally remains blank.
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
