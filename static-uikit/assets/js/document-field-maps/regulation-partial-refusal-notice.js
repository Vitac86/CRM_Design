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

  var TABLE = 9;
  var SERVICE = 10.56;
  var MIN = 6;

  function check(id, source, baselineTop) {
    return {
      id: id,
      type: 'check',
      source: source,
      page: 0,
      left: 65.2,
      baselineTop: baselineTop,
      glyphSize: SERVICE
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
      fontSize: SERVICE,
      minFontSize: 6.5,
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
        source: 'field.client-full-name',
        page: 0, left: 252.0, baselineTop: 171.84, width: 289.0,
        font: 'legalSerif', fontSize: TABLE, minFontSize: MIN,
        align: 'left', multiline: true, lineHeight: 8.5,
        maxHeight: 17, maxLines: 2, required: true
      },
      {
        id: 'contractNumber',
        source: 'field.extra-contract-number', format: 'prefixNumber',
        page: 0, left: 252.0, baselineTop: 192.74, width: 175.0,
        font: 'legalSerif', fontSize: TABLE, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'contractDate',
        source: 'field.extra-contract-date', format: 'prefixFrom',
        page: 0, left: 432.0, baselineTop: 192.74, width: 109.0,
        font: 'legalSerif', fontSize: TABLE, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'accountPortfolio',
        source: 'field.extra-account-portfolio',
        page: 0, left: 252.0, baselineTop: 211.80, width: 289.0,
        font: 'legalSerif', fontSize: TABLE, minFontSize: MIN,
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
        font: 'legalSerif', fontSize: TABLE, minFontSize: MIN,
        align: 'center'
      },
      {
        id: 'clientPrintedName',
        source: 'field.clientFullName', format: 'initials', fallbacks: ['surname'],
        page: 0, left: 195.5, baselineTop: 652.78, width: 77.5,
        font: 'legalSerif', fontSize: TABLE, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'clientDateDay',
        source: 'field.documentDateRu', format: 'dateDay',
        page: 0, left: 60.5, baselineTop: 712.42, width: 23.7,
        font: 'legalSerif', fontSize: TABLE, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'clientDateMonth',
        source: 'field.documentDateRu', format: 'monthOnly',
        page: 0, left: 91.0, baselineTop: 712.42, width: 85.9,
        font: 'legalSerif', fontSize: TABLE, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'clientDateYear',
        source: 'field.documentDateRu', format: 'dateYear2',
        page: 0, left: 185.4, baselineTop: 712.42, width: 27.0,
        font: 'legalSerif', fontSize: TABLE, minFontSize: MIN,
        align: 'center', required: true
      }

      // Broker position/name/signature/stamp and received date stay blank.
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
