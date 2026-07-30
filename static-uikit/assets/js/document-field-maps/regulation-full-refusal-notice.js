// Field map — ПРИЛОЖЕНИЕ 10 К РЕГЛАМЕНТУ.
// УВЕДОМЛЕНИЕ ОБ ОТКАЗЕ ОТ ИСПОЛНЕНИЯ РЕГЛАМЕНТА В ЦЕЛОМ.
//
// Base template : assets/document-pdf-templates/regulation-full-refusal-notice.pdf
// Source Word   : "ПРИЛОЖЕНИЕ 10 К РЕГЛАМЕНТУ. УВЕДОМЛЕНИЕ ОБ ОТКАЗЕ ИСПОЛНЕНИЯ РЕГЛАМЕНТА В ЦЕЛОМ.docx"
// Source SHA-256: ED5494B43403B84EF2DB1DA4E21253D1A67D6B99989710DB947F26DC95D97B2D
// Pages         : 1 (A4, 595.32 × 841.92 pt; no AcroForm/widgets)
//
// The two refusal boxes are independent: either or both may be marked. The
// Broker/Depositary half of the signature block is intentionally untouched.

(function (global) {
  'use strict';

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 12;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller
  var CHECK_GLYPH = 9;  // printed ☐ box — geometry, not dynamic text
  var SIZE_10_5 = 10.5;      // measured room: 10.91, 10.91 pt
  var SIZE_10 = 10;        // measured room: 10.35 pt
  var SIZE_9_5 = 9.5;       // measured room: 9.58 pt

  function check(id, source, baselineTop) {
    return {
      id: id,
      type: 'check',
      source: source,
      page: 0,
      left: 56.2,
      baselineTop: baselineTop,
      glyphSize: CHECK_GLYPH
    };
  }

  var TEMPLATE = {
    id: 'regulation-full-refusal-notice',
    title: 'Уведомление об отказе от исполнения Регламента в целом',
    templateUrl: '../assets/document-pdf-templates/regulation-full-refusal-notice.pdf',
    outputFilename: 'regulation-full-refusal-notice.pdf',
    expectedPages: 1,
    appliesTo: ['individual', 'company'],

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      {
        id: 'clientName',
        source: 'field.client-full-name',
        page: 0, left: 252.0, baselineTop: 192.0, width: 289.0,
        font: 'legalSerif', fontSize: SIZE_10, minFontSize: MIN,
        align: 'left', multiline: true, lineHeightRatio: 0.95,
        maxHeight: 17, required: true
      },
      {
        id: 'contractNumber',
        source: 'field.extra-contract-number', format: 'prefixNumber',
        page: 0, left: 252.0, baselineTop: 212.90, width: 175.0,
        font: 'legalSerif', fontSize: SIZE_10_5, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'contractDate',
        source: 'field.extra-contract-date', format: 'prefixFrom',
        page: 0, left: 432.0, baselineTop: 212.90, width: 109.0,
        font: 'legalSerif', fontSize: SIZE_10_5, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'accountPortfolio',
        source: 'field.extra-account-portfolio',
        page: 0, left: 252.0, baselineTop: 232.0, width: 289.0,
        font: 'legalSerif', fontSize: SIZE_9_5, minFontSize: MIN,
        align: 'left', multiline: true, lineHeightRatio: 0.95,
        maxHeight: 17, required: true
      },

      check('refuseBrokerageServices', 'check.full-refusal-brokerage', 289.97),
      check('refuseDepositaryServices', 'check.full-refusal-depository', 344.57),

      {
        id: 'clientRepresentativeRole',
        source: 'field.representativeRole', optional: true, required: true,
        showWhen: { source: 'subject.kind', equals: 'company' },
        page: 0, left: 110.0, baselineTop: 456.31, width: 169.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center'
      },
      {
        id: 'clientPrintedName',
        source: 'field.clientFullName', format: 'initials', fallbacks: ['surname'],
        page: 0, left: 195.5, baselineTop: 515.35, width: 77.5,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'clientDateDay',
        source: 'field.documentDateRu', format: 'dateDay',
        page: 0, left: 60.5, baselineTop: 574.87, width: 23.7,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'clientDateMonth',
        source: 'field.documentDateRu', format: 'monthOnly',
        page: 0, left: 91.0, baselineTop: 574.87, width: 85.9,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'clientDateYear',
        source: 'field.documentDateRu', format: 'dateYear2',
        page: 0, left: 185.4, baselineTop: 574.87, width: 27.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      }

      // Broker/Depositary received/staff fields remain blank by design.
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
