// Field map — Приложение № 2. Заявление о признании юридического лица
// квалифицированным инвестором.
//
// Base template : assets/document-pdf-templates/qualification-request-yul.pdf
// Source Word   : "ЗАЯВЛЕНИЕ о признании Юр. Лица квалифицированным инвестором.docx"
// Source SHA-256: 429f4868fdce44a62ae274e908a2f3f3b6ad4c683982414f815b184725df0996
// Pages         : 2 (A4, 595.32 x 841.92 pt)
//
// Every line, table boundary and checkbox coordinate below was measured from
// the committed PDF with PyMuPDF / tools/probe-pdf-coords.py. In particular,
// the five supporting-document fields belong to the five matching requirement
// rows in the source table; no criteria checkboxes are present in the source.
// The "Получено" block on page 2 is an internal receipt block and stays blank.

(function (global) {
  'use strict';

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 12;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller
  var CHECK_GLYPH = 9.96;  // printed ☐ box — geometry, not dynamic text

  // Rows that physically cannot take BODY. Each value is the largest
  // half-point step the measured room allows, floored at MIN.
  var ROW_SIZE = {
    companyFullLegalName: 10,        // 10.47 pt of room
    contractDate: 10,                // 10.20 pt of room
  };

  function text(id, source, page, left, baselineTop, width, extra) {
    var field = {
      id: id,
      type: 'text',
      source: source,
      page: page,
      left: left,
      baselineTop: baselineTop,
      width: width,
      font: 'legalSerif',
      fontSize: ROW_SIZE[id] || BODY,
      minFontSize: MIN,
      align: 'left'
    };
    Object.keys(extra || {}).forEach(function (key) { field[key] = extra[key]; });
    return field;
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
    id: 'qualification-request-yul',
    title: 'Заявление о признании ЮЛ квалифицированным инвестором',
    templateUrl: '../assets/document-pdf-templates/qualification-request-yul.pdf',
    outputFilename: 'qualification-request-yul.pdf',
    expectedPages: 2,
    appliesTo: ['company'],

    pageLayout: {
      0: {
        fixedHeaderUntil: 0,
        bodyBottom: 783.33,
        fixedFooterFrom: null,
        shiftToTop: 820.0,
        bottomClearance: 20.0,
        compaction: [],
        anchors: ['qualification-request-yul-opening']
      },
      1: {
        fixedHeaderUntil: 0,
        bodyBottom: 319.97,
        fixedFooterFrom: null,
        shiftToTop: 800.0,
        bottomClearance: 56.70,
        compaction: [],
        anchors: ['qualification-request-yul-delivery-address']
      }
    },

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf',
      legalSerifItalic: '../assets/fonts/pdf/LiberationSerif-Italic.ttf'
    },

    wordFlowBlocks: [
      {
        id: 'qualification-request-yul-opening',
        type: 'wordFlowBlock',
        page: 0,
        frame: {
          left: 85.10, baselineTop: 217.22, width: 470.26,
          initialLineCount: 7
        },
        font: 'legalSerif', fontSize: 9.96, minFontSize: 9.96,
        fontSizeLocked: true, lineHeight: 11.52,
        alignment: 'left',
        overflowStrategy: 'expand-layout',
        // Re-cut at a measured complete-operator boundary.
        //   python static-uikit/tools/qa/check_expansion_anchors.py --suggest
        // 297.00 fell inside a printed block. The continuation line paints
        // 288.99–300.01, so the cut belongs at or above 288.99. Measured
        // clean band 286.25–293.50; midpoint, +/-3.62 pt of margin.
        expansion: {
          page: 0, insertionTop: 289.88, shiftFromTop: 289.88,
          rowHeight: 11.52, maxExtraRows: 3, lineStyle: 'none',
          reviewStatus: 'approved'
        },
        sourceReplacement: {
          firstBlock: 77, lastBlock: 125,
          expectedBlockCount: 49, expectedPageBlockCount: 211,
          expectedSha256: '700bfa0dd4888332a13c53c0878b236448048cf658e60e80f0c27d15def0c1f7',
          expectedTemplateSha256: '9cff0dc94bbb155d6a4aadffa036d482b29f8a8cf1fbb63652cefe7ffc0ddeb8',
          reviewStatus: 'approved'
        },
        sourceStaticText: 'Прошу признать ________, Полное наименование организации ' +
          'Договор № ________ от ________ квалифицированным инвестором в ' +
          'отношении всех видов ценных бумаг и (или) производных финансовых ' +
          'инструментов, предназначенных для квалифицированных инвесторов;',
        runs: [
          { type: 'static', text: 'Прошу признать ' },
          {
            type: 'fieldRef', fieldId: 'companyFullLegalName',
            decoration: {
              underline: true, minWidth: 425.23, thickness: 0.48, offset: 1.20
            }
          },
          { type: 'static', text: ', ' },
          { type: 'lineBreak' },
          {
            type: 'static', text: 'Полное наименование организации',
            font: 'legalSerifItalic'
          },
          { type: 'lineBreak' },
          { type: 'static', text: 'Договор № ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'contractNumber', keepTogether: true,
            decoration: {
              underline: true, minWidth: 123.26, thickness: 0.48, offset: 1.20
            }
          },
          { type: 'static', text: ' от ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'contractDate', keepTogether: true,
            decoration: {
              underline: true, minWidth: 87.62, thickness: 0.48, offset: 1.20
            }
          },
          {
            type: 'static',
            text: ' квалифицированным инвестором в отношении всех видов ценных бумаг и (или) производных финансовых инструментов, предназначенных для квалифицированных инвесторов;'
          }
        ]
      },
      {
        id: 'qualification-request-yul-delivery-address',
        type: 'wordFlowBlock',
        page: 1,
        showWhen: { source: 'extra.extra-delivery-method', equals: 'address' },
        frame: {
          left: 110.66, baselineTop: 123.98, width: 386.00,
          initialLineCount: 1
        },
        font: 'legalSerif', fontSize: 9.96, minFontSize: 9.96,
        fontSizeLocked: true, lineHeight: 11.52,
        alignment: 'left',
        overflowStrategy: 'expand-layout',
        // Re-cut at a measured complete-operator boundary.
        //   python static-uikit/tools/qa/check_expansion_anchors.py --suggest
        // 135.70 fell inside a printed block. The continuation line paints
        // 126.63–137.65, so the cut belongs at or above 126.63. Measured
        // clean band 124.20–125.95; midpoint, +/-0.88 pt of margin.
        expansion: {
          page: 1, insertionTop: 125.08, shiftFromTop: 125.08,
          rowHeight: 11.52, maxExtraRows: 5, lineStyle: 'none',
          reviewStatus: 'approved'
        },
        sourceReplacement: {
          firstBlock: 31, lastBlock: 37,
          expectedBlockCount: 7, expectedPageBlockCount: 106,
          expectedSha256: 'b750a4dc49612793011be35b746ce78b1ed4d82373069127f17ac3e02507dc17',
          expectedTemplateSha256: '9cff0dc94bbb155d6a4aadffa036d482b29f8a8cf1fbb63652cefe7ffc0ddeb8',
          reviewStatus: 'approved'
        },
        sourceStaticText: 'по адресу: ________',
        runs: [
          { type: 'static', text: 'по адресу: ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'deliveryAddress',
            decoration: {
              underline: true, minWidth: 341.11, thickness: 0.48, offset: 1.20
            }
          }
        ]
      }
    ],

    fields: [
      // Page 1 — applicant date: «__» ________ 20__ г.
      text('documentDateDay', 'extra.extra-document-date', 0, 103.82, 188.54, 20.64, {
        format: 'dateDay', align: 'center', required: true
      }),
      text('documentDateMonth', 'extra.extra-document-date', 0, 132.02, 188.54, 59.90, {
        format: 'dateMonthGenitive', align: 'center', required: true
      }),
      text('documentDateYear', 'extra.extra-document-date', 0, 206.45, 188.54, 15.48, {
        format: 'dateYear2', align: 'center', required: true
      }),

      // The full legal name is typed on the source's single long rule.
      text('companyFullLegalName', 'subject.fullLegalName', 0, 127.70, 228.70, 425.23, {
        required: true,
        layoutMode: 'flow-reference', flowBlockId: 'qualification-request-yul-opening'
      }),
      text('contractNumber', 'extra.extra-contract-number', 0, 132.02, 262.90, 123.26, {
        required: true,
        layoutMode: 'flow-reference', flowBlockId: 'qualification-request-yul-opening'
      }),
      text('contractDate', 'extra.extra-contract-date', 0, 269.69, 262.90, 87.62, {
        format: 'dateRu', align: 'center', required: true,
        layoutMode: 'flow-reference', flowBlockId: 'qualification-request-yul-opening'
      }),

      // Right-hand table column: one supporting-document cell per source
      // criterion, in the same top-to-bottom order as the wizard's numbered
      // supporting-document inputs.
      text('supportingDocument1', 'extra.extra-supporting-docs-1', 0, 314.00, 412.00, 230.00, {
        optional: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 11.0
      }),
      text('supportingDocument2', 'extra.extra-supporting-docs-2', 0, 314.00, 439.00, 230.00, {
        optional: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 61.0
      }),
      text('supportingDocument3', 'extra.extra-supporting-docs-3', 0, 314.00, 522.00, 230.00, {
        optional: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 50.0
      }),
      text('supportingDocument4', 'extra.extra-supporting-docs-4', 0, 314.00, 592.00, 230.00, {
        optional: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 42.0
      }),
      text('supportingDocument5', 'extra.extra-supporting-docs-5', 0, 314.00, 657.00, 230.00, {
        optional: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 27.0
      }),

      // Page 2 — delivery choice and applicant signature block.
      check('deliveryByAddress', 'extra.extra-delivery-method', 'address', 1, 99.26, 123.98),
      check('deliveryAtOffice', 'extra.extra-delivery-method', 'office', 1, 99.26, 147.50),
      text('deliveryAddress', 'extra.extra-delivery-address', 1, 153.86, 123.30, 341.11, {
        optional: true,
        showWhen: { source: 'extra.extra-delivery-method', equals: 'address' },
        layoutMode: 'flow-reference',
        flowBlockId: 'qualification-request-yul-delivery-address'
      }),
      // The handwritten signature rule (351.31..446.49) remains blank. Only
      // the selected representative's printed name is drawn after the slash.
      text('representativeName', 'field.representativeFullName', 1, 451.78, 198.50, 79.92, {
        format: 'initials', fallbacks: ['surname'], align: 'center', required: true
      })

      // Page 2, y >= 250.59 — "Получено", date, employee signature/name and
      // seal are deliberately untouched: they are completed by staff.
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
