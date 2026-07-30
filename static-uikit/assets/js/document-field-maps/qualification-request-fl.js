// Field map — Приложение № 1. Заявление о признании физического лица
// квалифицированным инвестором.
//
// Base template : assets/document-pdf-templates/qualification-request-fl.pdf
// Source Word   : "Заявление о признании ФЛ квал. инвестором.docx"
// Source SHA-256: e8bb2fbf762bae29bc40369387e89b511ccccd31c976c60863f399926954abe2
// PDF SHA-256   : 6478113b5d1d7abede7ccb9acea043a9b08c70c0b392cbdce25aa84c00020efc
// Pages         : 3 (the authoritative Word export includes a blank third page)
//
// The source has no applicant-date blank. Its page-2 “Получено” date and
// employee signature block are internal and deliberately remain blank. The
// seven evidence inputs below correspond one-for-one to the seven printed
// criterion rows; they are not generic interchangeable evidence fields.

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
    assetsValueMillions: 10.5,       // 10.51 pt of room
    contractDate: 11,                // 11.46 pt of room
    quarterlyTransactionsValueMillions: 10.5, // 10.52 pt of room
    securitiesValueMillions: 10.5,   // 10.65 pt of room
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

  // The evidence blocks are blank boxes of a measured height, so their line
  // capacity follows the font size: at 12 pt the box holds fewer, larger lines,
  // and stepping down really does buy another line inside the same box.
  function evidence(id, source, page, baselineTop, maxHeight) {
    return text(id, source, page, 319.00, baselineTop, 232.00, {
      optional: true,
      multiline: true,
      lineHeightRatio: 0.95,
      maxHeight: maxHeight
    });
  }

  var TEMPLATE = {
    id: 'qualification-request-fl',
    title: 'Заявление о признании ФЛ квалифицированным инвестором',
    templateUrl: '../assets/document-pdf-templates/qualification-request-fl.pdf',
    outputFilename: 'qualification-request-fl.pdf',
    expectedPages: 3,
    appliesTo: ['individual'],

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      // Page 1 — applicant and contract. There is intentionally no applicant date.
      text('clientFullName', 'field.clientFullName', 0, 123.02, 127.34, 430.00, {
        required: true
      }),
      text('contractNumber', 'extra.extra-contract-number', 0, 99.50, 151.22, 68.00, {
        required: true, align: 'center'
      }),
      text('contractDate', 'extra.extra-contract-date', 0, 181.73, 151.22, 95.04, {
        required: true, format: 'dateRu', align: 'center'
      }),

      // Instrument scope — the two source boxes are mutually exclusive.
      check('scopeAll', 'extra.extra-qualification-scope', 'all', 0, 91.94, 203.90),
      check('scopeOther', 'extra.extra-qualification-scope', 'other', 0, 91.94, 232.94),
      text('scopeOtherText', 'extra.extra-qualification-instruments-other', 0,
        128.90, 232.94, 364.75, {
          required: true,
          showWhen: { source: 'extra.extra-qualification-scope', equals: 'other' }
        }),

      // Criterion 1 — securities / derivatives value and matching evidence.
      text('securitiesValueMillions', 'extra.extra-securities-value-millions', 0,
        42.36, 398.57, 69.98, { optional: true, align: 'center' }),
      evidence('securitiesEvidence', 'extra.extra-supporting-docs-securities-holdings',
        0, 345.00, 63.00),

      // Criterion 2 — one of the two printed work-experience bases.
      check('workExperienceQualifiedTwoYears', 'extra.extra-work-experience-basis',
        'qualified-two-years', 0, 42.36, 487.03),
      check('workExperienceOtherThreeYears', 'extra.extra-work-experience-basis',
        'other-three-years', 0, 42.36, 532.87),
      evidence('workExperienceEvidence', 'extra.extra-supporting-docs-work-experience',
        0, 434.00, 108.00),

      // Criterion 3 — position requiring Bank of Russia approval.
      evidence('bankApprovedPositionEvidence',
        'extra.extra-supporting-docs-bank-approved-position', 0, 570.00, 27.00),

      // Criterion 4 — quarterly transaction value and matching evidence.
      text('quarterlyTransactionsValueMillions',
        'extra.extra-quarterly-transactions-value-millions', 0,
        258.65, 665.26, 26.18, {
      overflowStrategy: 'expand-layout',
      expansion: {
        page: 0, insertionTop: 679.53,
        rowHeight: 14, maxExtraRows: 1,
        shiftFromTop: 679.53, shiftToTop: 726.18,
        bottomReserve: 113.86,
        lineStyle: 'underline', reviewStatus: 'approved',
        line: {
          left: 36.84, width: 518.88,
          baselineOffset: 10.5, ruleOffset: 12.6, ruleThickness: 0.48
        }
      }, optional: true, align: 'center' }),
      evidence('quarterlyTransactionsEvidence',
        'extra.extra-supporting-docs-quarterly-transactions', 0, 624.00, 90.00),

      // Page 2, criterion 5 — asset value, independent printed asset-type marks,
      // and the evidence cell that continues the table from page 1.
      text('assetsValueMillions', 'extra.extra-assets-value-millions', 1,
        172.49, 55.32, 64.44, { optional: true, align: 'center' }),
      check('assetsCashAndDeposits', 'check.qualification-assets-cash-deposits',
        true, 1, 42.36, 89.90),
      check('assetsPreciousMetals', 'check.qualification-assets-precious-metals',
        true, 1, 42.36, 158.90),
      check('assetsSecurities', 'check.qualification-assets-securities',
        true, 1, 42.24, 193.46),
      evidence('assetsEvidence', 'extra.extra-supporting-docs-assets',
        1, 60.00, 144.00),

      // Criterion 6 — the source says “или”, so this is one select value.
      check('educationHigher', 'extra.extra-education-basis',
        'higher-education', 1, 42.24, 243.86),
      check('educationCertificate', 'extra.extra-education-basis',
        'certificate', 1, 42.36, 335.93),
      evidence('educationEvidence', 'extra.extra-supporting-docs-education',
        1, 237.00, 108.00),

      // Criterion 7 — recognition recorded by another entity.
      evidence('qualifiedRegistryEvidence',
        'extra.extra-supporting-docs-qualified-registry', 1, 371.50, 36.00),

      // Page 2 — mutually exclusive delivery method and applicant signature.
      check('deliveryByAddress', 'extra.extra-delivery-method',
        'address', 1, 56.54, 619.90),
      check('deliveryAtOffice', 'extra.extra-delivery-method',
        'office', 1, 56.54, 643.42),
      text('deliveryAddress', 'extra.extra-delivery-address', 1,
        111.14, 619.90, 331.03, {
          required: true,
          showWhen: { source: 'extra.extra-delivery-method', equals: 'address' }
        }),
      // Handwritten signature stays blank; only the printed client name is drawn.
      text('signatureName', 'field.clientFullName', 1, 409.06, 694.90, 79.92, {
        format: 'initials', fallbacks: ['surname'], align: 'center', required: true
      })

      // Page 2 y >= 709 and the authoritative blank page 3 stay untouched.
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
