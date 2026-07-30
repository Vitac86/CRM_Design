// Field map — ПРИЛОЖЕНИЕ 11 К РЕГЛАМЕНТУ.
// УВЕДОМЛЕНИЕ ОБ ОТКАЗЕ ОТ ЧАСТИ УСЛУГ ПО РЕГЛАМЕНТУ.
//
// Base template : assets/document-pdf-templates/regulation-partial-refusal-notice.pdf
// Source Word   : "ПРИЛОЖЕНИЕ 11 К РЕГЛАМЕНТУ. УВЕДОМЛЕНИЕ ОБ ОТКАЗЕ ОТ ЧАСТИ УСЛУГ ПО РЕГЛАМЕНТУ.docx"
// Source SHA-256: 8C71D40847932035BBB12259FBBA33F230B99D238ADEBAE59878F58AA134A32F
// Pages         : 1 (A4, 595.32 × 841.92 pt; no AcroForm/widgets)
//
// The five service/agreement boxes are real controls. The sixth box at
// (232.5, 514.15) belongs to the explanatory sentence and is not fillable.
// Broker staff fields on the right remain blank.

(function (global) {
  'use strict';

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 12;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller
  var SIZE_10_5 = 10.5;      // measured room: 10.91, 10.91 pt
  var SIZE_10 = 10;        // measured room: 10.35 pt
  var SIZE_9 = 9;         // measured room: 9.41 pt
  var CHECK_GLYPH = 10.56; // printed checkbox glyph — not dynamic text

  function check(id, source, baselineTop) {
    return {
      id: id,
      type: 'check',
      source: source,
      page: 0,
      left: 65.2,
      baselineTop: baselineTop,
      glyphSize: CHECK_GLYPH
    };
  }

  function portfolio(id, source, checkSource, left, baselineTop, width) {
    return {
      id: id,
      source: source,
      showWhen: { source: checkSource, equals: true },
      page: 0,
      left: left,
      baselineTop: baselineTop,
      width: width,
      font: 'legalSerif',
      fontSize: BODY,
      minFontSize: MIN,
      align: 'left',
      required: true
    };
  }

  var TEMPLATE = {
    id: 'regulation-partial-refusal-notice',
    title: 'Уведомление об отказе от части услуг по Регламенту',
    templateUrl: '../assets/document-pdf-templates/regulation-partial-refusal-notice.pdf',
    outputFilename: 'regulation-partial-refusal-notice.pdf',
    expectedPages: 1,
    appliesTo: ['individual', 'company'],

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      {
        id: 'clientName',
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 183.14,
          rowHeight: 14, maxExtraRows: 2,
          shiftFromTop: 183.14, shiftToTop: 717.68,
          bottomReserve: 122.24,
          lineStyle: 'underline', reviewStatus: 'approved',
          line: {
            left: 56.16, width: 505.03,
            baselineOffset: 10.5, ruleOffset: 12.6, ruleThickness: 0.36
          }
        },
        source: 'field.client-full-name',
        page: 0, left: 252.0, baselineTop: 171.84, width: 289.0,
        font: 'legalSerif', fontSize: SIZE_10, minFontSize: MIN,
        align: 'left', multiline: true, lineHeightRatio: 0.95,
        maxHeight: 17, required: true
      },
      {
        id: 'contractNumber',
        source: 'field.extra-contract-number', format: 'prefixNumber',
        page: 0, left: 252.0, baselineTop: 192.74, width: 175.0,
        font: 'legalSerif', fontSize: SIZE_10_5, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'contractDate',
        source: 'field.extra-contract-date', format: 'prefixFrom',
        page: 0, left: 432.0, baselineTop: 192.74, width: 109.0,
        font: 'legalSerif', fontSize: SIZE_10_5, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'accountPortfolio',
        source: 'field.extra-account-portfolio',
        page: 0, left: 252.0, baselineTop: 211.80, width: 289.0,
        font: 'legalSerif', fontSize: SIZE_9, minFontSize: MIN,
        align: 'left', multiline: true, lineHeight: 8.5,
        maxHeight: 17, maxLines: 2, required: true
      },

      check('refuseStockMarket', 'check.partial-refusal-stock', 307.61),
      check('refuseDerivativesMarket', 'check.partial-refusal-derivatives', 328.61),
      check('refuseCurrencyMarket', 'check.partial-refusal-currency', 348.65),
      check('terminateQuikAgreement', 'check.partial-refusal-quik', 369.05),
      check('terminateEsignatureAgreement', 'check.partial-refusal-esignature', 390.41),

      // Each market has its own printed portfolio-number slot. Values appear
      // only beside a selected refusal and become required in that branch.
      portfolio('stockPortfolio', 'field.extra-stock-portfolio',
        'check.partial-refusal-stock', 364.0, 307.61, 171.0),
      portfolio('derivativesPortfolio', 'field.extra-derivatives-portfolio',
        'check.partial-refusal-derivatives', 355.0, 328.61, 180.0),
      portfolio('currencyPortfolio', 'field.extra-currency-portfolio',
        'check.partial-refusal-currency', 365.0, 348.65, 170.0),

      {
        id: 'clientRepresentativeRole',
        source: 'field.representativeRole', optional: true, required: true,
        showWhen: { source: 'subject.kind', equals: 'company' },
        page: 0, left: 110.0, baselineTop: 593.71, width: 169.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center'
      },
      {
        id: 'clientPrintedName',
        source: 'field.clientFullName', format: 'initials', fallbacks: ['surname'],
        page: 0, left: 195.5, baselineTop: 652.78, width: 77.5,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'clientDateDay',
        source: 'field.documentDateRu', format: 'dateDay',
        page: 0, left: 60.5, baselineTop: 712.42, width: 23.7,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'clientDateMonth',
        source: 'field.documentDateRu', format: 'monthOnly',
        page: 0, left: 91.0, baselineTop: 712.42, width: 85.9,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'clientDateYear',
        source: 'field.documentDateRu', format: 'dateYear2',
        page: 0, left: 185.4, baselineTop: 712.42, width: 27.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      }

      // Broker position/name/signature/stamp and received date stay blank.
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
