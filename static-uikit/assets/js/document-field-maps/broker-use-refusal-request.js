// Field map — ПРИЛОЖЕНИЕ 9 К РЕГЛАМЕНТУ.
// ЗАЯВЛЕНИЕ ОБ ОТКАЗЕ ОТ ПРЕДОСТАВЛЕНИЯ БРОКЕРУ ПРАВА ИСПОЛЬЗОВАНИЯ
// ДЕНЕЖНЫХ СРЕДСТВ И (ИЛИ) ЦЕННЫХ БУМАГ КЛИЕНТА.
//
// Base template : assets/document-pdf-templates/broker-use-refusal-request.pdf
// Source Word   : "ПРИЛОЖЕНИЕ 9 К РЕГЛАМЕНТУ. ЗАЯВЛЕНИЕ ОБ ОТКАЗЕ ОТ ПРЕДОСТАВЛЕНИЯ
//                 БРОКЕРУ ПРАВА ИСПОЛЬЗОВАНИЯ В СВОИХ ИНТЕРЕСАХ ДЕНЕЖНЫХ СРЕДСТВ И (ИЛИ)
//                 ЦЕННЫХ БУМАГ КЛИЕНТА.docx"
// Source SHA-256: 2B73CCB07FD8131E7B59539C2408CF780D4FA65B2C0AE9D5B32EF5D6AA2AE59A
// Pages         : 1 (A4, 595.32 × 841.92 pt; no AcroForm/widgets)
//
// Coordinates below come from the actual Word-exported PDF glyphs and rules,
// measured with PyMuPDF. The right-hand Broker column is intentionally blank.

(function (global) {
  'use strict';

  var BODY = 9;
  var MIN = 6;

  function contractNumber(value) {
    value = String(value || '').trim();
    return value ? '№ ' + value : '';
  }

  function contractDate(value) {
    value = String(value || '').trim();
    return value ? 'от ' + value : '';
  }

  var TEMPLATE = {
    id: 'broker-use-refusal-request',
    title: 'Заявление об отказе от права использования средств/ценных бумаг',
    templateUrl: '../assets/document-pdf-templates/broker-use-refusal-request.pdf',
    outputFilename: 'broker-use-refusal-request.pdf',
    expectedPages: 1,
    appliesTo: ['individual', 'company'],

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      // Client-information table. The value cells are 297.17 pt wide. A long
      // client name/account may wrap to two lines inside the original row;
      // the renderer still fails visibly if two lines at 6 pt are insufficient.
      {
        id: 'clientName',
        source: 'field.client-full-name',
        page: 0, left: 252.0, baselineTop: 185.3, width: 289.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', multiline: true, lineHeight: 8.5,
        maxHeight: 17, maxLines: 2, required: true
      },
      {
        id: 'contractNumber',
        source: 'field.extra-contract-number', format: contractNumber,
        page: 0, left: 252.0, baselineTop: 206.06, width: 175.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'contractDate',
        source: 'field.extra-contract-date', format: contractDate,
        page: 0, left: 432.0, baselineTop: 206.06, width: 109.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'accountPortfolio',
        source: 'field.extra-account-portfolio',
        page: 0, left: 252.0, baselineTop: 225.3, width: 289.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', multiline: true, lineHeight: 8.5,
        maxHeight: 17, maxLines: 2, required: true
      },

      // Client side only. The handwritten signature and stamp remain blank.
      // Position is printed only for legal entities, as the source instructs.
      {
        id: 'clientRepresentativeRole',
        source: 'field.representativeRole', optional: true, required: true,
        showWhen: { source: 'subject.kind', equals: 'company' },
        page: 0, left: 110.0, baselineTop: 392.09, width: 169.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center'
      },
      {
        id: 'clientPrintedName',
        source: 'field.clientFullName', format: 'initials', fallbacks: ['surname'],
        page: 0, left: 195.5, baselineTop: 451.27, width: 77.5,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'clientDateDay',
        source: 'field.documentDateRu', format: 'dateDay',
        page: 0, left: 60.5, baselineTop: 510.79, width: 23.7,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'clientDateMonth',
        source: 'field.documentDateRu', format: 'monthOnly',
        page: 0, left: 91.0, baselineTop: 510.79, width: 85.9,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'clientDateYear',
        source: 'field.documentDateRu', format: 'dateYear2',
        page: 0, left: 185.4, baselineTop: 510.79, width: 27.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      }

      // Broker position/name/signature/stamp and "Получено Брокером" date
      // are completed after the client submits the document and stay blank.
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
