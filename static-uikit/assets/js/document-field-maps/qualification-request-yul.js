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

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

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
        required: true
      }),
      text('contractNumber', 'extra.extra-contract-number', 0, 132.02, 262.90, 123.26, {
        required: true
      }),
      text('contractDate', 'extra.extra-contract-date', 0, 269.69, 262.90, 87.62, {
        format: 'dateRu', align: 'center', required: true
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
        showWhen: { source: 'extra.extra-delivery-method', equals: 'address' }
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
