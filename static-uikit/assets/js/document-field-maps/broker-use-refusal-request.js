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

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 12;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller
  var SIZE_10_5 = 10.5;      // measured room: 10.91, 10.91 pt
  var SIZE_10 = 10;        // measured room: 10.37 pt
  var SIZE_9_5 = 9.5;       // measured room: 9.61 pt

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
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 196.46,
          rowHeight: 14, maxExtraRows: 2,
          shiftFromTop: 196.46, shiftToTop: 516.05,
          bottomReserve: 323.87,
          lineStyle: 'underline', reviewStatus: 'approved',
          line: {
            left: 52.92, width: 492.7,
            baselineOffset: 10.5, ruleOffset: 12.6, ruleThickness: 0.36
          }
        },
        source: 'field.client-full-name',
        page: 0, left: 252.0, baselineTop: 185.3, width: 289.0,
        font: 'legalSerif', fontSize: SIZE_10, minFontSize: MIN,
        align: 'left', multiline: true, lineHeightRatio: 0.95,
        maxHeight: 17, required: true
      },
      {
        id: 'contractNumber',
        source: 'field.extra-contract-number', format: 'prefixNumber',
        page: 0, left: 252.0, baselineTop: 206.06, width: 175.0,
        font: 'legalSerif', fontSize: SIZE_10_5, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'contractDate',
        source: 'field.extra-contract-date', format: 'prefixFrom',
        page: 0, left: 432.0, baselineTop: 206.06, width: 109.0,
        font: 'legalSerif', fontSize: SIZE_10_5, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'accountPortfolio',
        source: 'field.extra-account-portfolio',
        page: 0, left: 252.0, baselineTop: 225.3, width: 289.0,
        font: 'legalSerif', fontSize: SIZE_9_5, minFontSize: MIN,
        align: 'left', multiline: true, lineHeightRatio: 0.95,
        maxHeight: 17, required: true
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
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 464.85,
          rowHeight: 14, maxExtraRows: 1,
          shiftFromTop: 464.85, shiftToTop: 516.05,
          bottomReserve: 323.87,
          lineStyle: 'underline', reviewStatus: 'approved',
          line: {
            left: 52.92, width: 492.7,
            baselineOffset: 10.5, ruleOffset: 12.6, ruleThickness: 0.36
          }
        },
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
