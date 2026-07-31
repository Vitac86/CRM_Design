// Field map — УВЕДОМЛЕНИЯ.pdf, client acknowledgement on pages 9–10.
//
// Base template : assets/document-pdf-templates/client-notifications.pdf
// Source PDF    : Z:\6. Управление по работе с клиентами\Формы документов\для оцифровки\УВЕДОМЛЕНИЯ.pdf
// Source SHA-256: 8f5a922c9b2140fc8724bc9365de073ac10a1c48a5f44b55b78e319d2b501657
// Pages         : 10 (595.20 × 841.92 pt, 0 AcroForm fields/widgets)
//
// Pages 1–8 are notices supplied unchanged. Pages 9–10 contain one client
// acknowledgement. Coordinates below come from the source PDF's real glyph
// boxes and vector rules. The printed cross marks are declarations already
// present in the source, not selectable controls, so this map draws no marks.

(function (global) {
  'use strict';

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 12;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller

  var TEMPLATE = {
    id: 'client-notifications',
    title: 'Уведомления клиента',
    templateUrl: '../assets/document-pdf-templates/client-notifications.pdf',
    outputFilename: 'client-notifications.pdf',
    expectedPages: 10,
    appliesTo: ['individual', 'company'],

    pageLayout: {
      8: {
        fixedHeaderUntil: 0,
        bodyBottom: 820.06,
        fixedFooterFrom: null,
        shiftToTop: 830.0,
        bottomClearance: 30.0,
        compaction: [],
        crossPageFlow: {
          targetPage: 9,
          sourceFromTop: 759.6, sourceToTop: 830.0,
          sourceContentTop: 764.46, retainedBodyBottom: 759.56,
          targetInsertionTop: 74.03,
          targetShiftFromTop: 72.7, targetShiftToTop: 800.0,
          targetShift: 53.76, maxCumulativeShift: 53.76,
          maxCascadeDepth: 1, reviewStatus: 'approved',
          note: 'последний полный пункт страницы 9 переносится перед продолжением уведомления'
        },
        anchors: ['client-notifications-identity']
      }
    },

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    wordFlowBlocks: [
      {
        id: 'client-notifications-identity',
        type: 'wordFlowBlock',
        page: 8,
        frame: {
          left: 56.66, baselineTop: 264.07, width: 484.77,
          initialLineCount: 6
        },
        font: 'legalSerif', fontSize: 11.04, minFontSize: 11.04,
        fontSizeLocked: true, lineHeight: 13.44,
        alignment: 'left',
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 8, insertionTop: 339.10, shiftFromTop: 339.10,
          rowHeight: 13.44, maxExtraRows: 2, lineStyle: 'none',
          reviewStatus: 'approved'
        },
        sourceReplacement: {
          firstBlock: 13, lastBlock: 29,
          expectedBlockCount: 17, expectedPageBlockCount: 120,
          expectedSha256: '530e584829608ae7dd8a12579519d7e73c3d7c33c92c1750f237e2d6e07a46ce',
          expectedTemplateSha256: '8f5a922c9b2140fc8724bc9365de073ac10a1c48a5f44b55b78e319d2b501657',
          reviewStatus: 'approved'
        },
        sourceStaticText: 'Настоящим я, ________, паспорт серии ____ ' +
          '№__________, выдан ________ дата выдачи ________, ' +
          'проживающий(ая) по адресу (регистрации): ________',
        runs: [
          { type: 'static', text: 'Настоящим я, ' },
          {
            type: 'fieldRef', fieldId: 'clientFullName',
            decoration: {
              underline: true, minWidth: 263.99, thickness: 0.48, offset: 1.20
            }
          },
          { type: 'static', text: ', паспорт серии ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'passportSeries', keepTogether: true,
            decoration: {
              underline: true, minWidth: 30.12, thickness: 0.48, offset: 1.20
            }
          },
          { type: 'static', text: ' №', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'passportNumber', keepTogether: true,
            decoration: {
              underline: true, minWidth: 55.20, thickness: 0.48, offset: 1.20
            }
          },
          { type: 'static', text: ', выдан ' },
          {
            type: 'fieldRef', fieldId: 'passportIssuedBy',
            decoration: {
              underline: true, minWidth: 483.55, thickness: 0.48, offset: 1.20
            }
          },
          { type: 'static', text: ' дата выдачи ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'passportIssueDate', keepTogether: true,
            decoration: {
              underline: true, minWidth: 99.10, thickness: 0.48, offset: 1.20
            }
          },
          {
            type: 'static',
            text: ', проживающий(ая) по адресу (регистрации): '
          },
          {
            type: 'fieldRef', fieldId: 'registrationAddress',
            decoration: {
              underline: true, minWidth: 483.55, thickness: 0.48, offset: 1.20
            }
          }
        ]
      }
    ],

    fields: [
      // Page 9: "Настоящим я, ________, паспорт серии ___ №____, выдан ..."
      {
        id: 'clientFullName',
        source: 'field.clientFullName',
        page: 8, left: 143.33, baselineTop: 264.07, width: 263.99,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true,
        layoutMode: 'flow-reference', flowBlockId: 'client-notifications-identity'
      },
      {
        id: 'passportSeries',
        source: 'field.passportSeries',
        page: 8, left: 511.24, baselineTop: 264.07, width: 30.12,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true,
        layoutMode: 'flow-reference', flowBlockId: 'client-notifications-identity'
      },
      {
        id: 'passportNumber',
        source: 'field.passportNumber',
        page: 8, left: 67.20, baselineTop: 277.51, width: 55.20,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true,
        layoutMode: 'flow-reference', flowBlockId: 'client-notifications-identity'
      },
      {
        // Full-width vector rule immediately below "выдан".
        id: 'passportIssuedBy',
        source: 'field.passportIssuedBy',
        page: 8, left: 56.66, baselineTop: 297.70, width: 483.55,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true,
        layoutMode: 'flow-reference', flowBlockId: 'client-notifications-identity'
      },
      {
        id: 'passportIssueDate',
        source: 'field.passportIssueDate', format: 'dateRu',
        page: 8, left: 116.40, baselineTop: 314.74, width: 99.10,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true,
        layoutMode: 'flow-reference', flowBlockId: 'client-notifications-identity'
      },
      {
        // Full-width vector rule following the printed registration-address label.
        id: 'registrationAddress',
        source: 'field.registrationAddress',
        page: 8, left: 56.66, baselineTop: 334.42, width: 483.55,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true,
        layoutMode: 'flow-reference', flowBlockId: 'client-notifications-identity'
      },

      // Page 10: left half is the printed-name line; right half stays blank for
      // the handwritten signature. The narrow name slot uses the document's
      // conventional surname + initials fallback chain.
      {
        id: 'signatureName',
        source: 'field.clientFullName', format: 'initials', fallbacks: ['surname'],
        page: 9, left: 55.22, baselineTop: 498.14, width: 101.40,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'documentDate',
        source: 'field.documentDateRu', format: 'dateRu',
        page: 9, left: 422.57, baselineTop: 498.14, width: 77.30,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      }
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
