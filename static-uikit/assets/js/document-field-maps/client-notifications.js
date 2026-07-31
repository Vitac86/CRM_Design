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
        anchors: ['clientFullName', 'passportIssuedBy', 'registrationAddress']
      }
    },

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      // Page 9: "Настоящим я, ________, паспорт серии ___ №____, выдан ..."
      {
        id: 'clientFullName',
        source: 'field.clientFullName',
        page: 8, left: 143.33, baselineTop: 264.07, width: 263.99,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 8, insertionTop: 280.0, shiftFromTop: 280.0,
          rowHeight: 12.5, maxExtraRows: 1, maxFontSize: 11,
          lineStyle: 'underline', reviewStatus: 'approved',
          line: {
            left: 55.22, width: 484.99,
            baselineOffset: 9.8, ruleOffset: 11.4, ruleThickness: 0.48
          }
        }
      },
      {
        id: 'passportSeries',
        source: 'field.passportSeries',
        page: 8, left: 511.24, baselineTop: 264.07, width: 30.12,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'passportNumber',
        source: 'field.passportNumber',
        page: 8, left: 67.20, baselineTop: 277.51, width: 55.20,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        // Full-width vector rule immediately below "выдан".
        id: 'passportIssuedBy',
        source: 'field.passportIssuedBy',
        page: 8, left: 56.66, baselineTop: 297.70, width: 483.55,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 8, insertionTop: 302.0, shiftFromTop: 302.0,
          rowHeight: 12.5, maxExtraRows: 1, maxFontSize: 11,
          lineStyle: 'underline', reviewStatus: 'approved',
          line: {
            left: 55.22, width: 484.99,
            baselineOffset: 9.8, ruleOffset: 11.4, ruleThickness: 0.48
          }
        }
      },
      {
        id: 'passportIssueDate',
        source: 'field.passportIssueDate', format: 'dateRu',
        page: 8, left: 116.40, baselineTop: 314.74, width: 99.10,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        // Full-width vector rule following the printed registration-address label.
        id: 'registrationAddress',
        // the only row page 9 has room for goes to the longest value on it
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 8, insertionTop: 339.1,
          rowHeight: 14, maxExtraRows: 1,
          shiftFromTop: 339.1,
          lineStyle: 'underline', reviewStatus: 'approved',
          line: {
            left: 55.22, width: 484.99,
            baselineOffset: 10.5, ruleOffset: 12.6, ruleThickness: 0.48
          }
        },
        source: 'field.registrationAddress',
        page: 8, left: 56.66, baselineTop: 334.42, width: 483.55,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true
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
