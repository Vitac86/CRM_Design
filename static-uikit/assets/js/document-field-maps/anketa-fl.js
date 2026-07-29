// Field map — Приложение 16. АНКЕТА ФИЗИЧЕСКОГО ЛИЦА
//
// Base template : assets/document-pdf-templates/anketa-fl.pdf
// Source Word   : Z:\6. Управление по работе с клиентами\Формы документов\
//                 для оцифровки\Анкета ФЛ.docx
// Source SHA-256: 23d3e5687526f495470dab91011e0aea6fc6d9a54e745b2fac14b14138fabf86
// Pages         : 4 (A4, 595.32 × 841.92 pt; 0 AcroForm fields/widgets)
//
// All coordinates come from the converted PDF's actual glyph boxes and table
// vectors. The form body is Times New Roman 9.5 pt; Liberation Serif is the
// locally committed metric-compatible replacement used for inserted values.
//
// Page 4's "Для служебных отметок" block is intentionally absent. It is
// completed by an employee after the client questionnaire is received.

(function (global) {
  'use strict';

  var BODY = 9.48;
  var MIN = 6.0;
  var VALUE_LEFT = 324.4;
  var VALUE_WIDTH = 237.0;

  function text(id, source, page, left, baselineTop, width, options) {
    var o = options || {};
    return {
      id: id,
      source: source,
      page: page,
      left: left,
      baselineTop: baselineTop,
      width: width,
      font: o.font || 'legalSerif',
      fontSize: o.fontSize || BODY,
      minFontSize: o.minFontSize != null ? o.minFontSize : MIN,
      align: o.align || 'left',
      required: !!o.required,
      optional: !!o.optional,
      multiline: !!o.multiline,
      maxLines: o.maxLines,
      maxHeight: o.maxHeight,
      lineHeight: o.lineHeight,
      format: o.format,
      fallbacks: o.fallbacks,
      showWhen: o.showWhen
    };
  }

  function cell(id, source, page, top, bottom, options) {
    var o = options || {};
    o.multiline = !!o.multiline;
    if (o.multiline) {
      o.maxHeight = o.maxHeight || (bottom - top - 2.0);
      o.lineHeight = o.lineHeight || 10.8;
    }
    return text(id, source, page, VALUE_LEFT, top + 10.3, VALUE_WIDTH, o);
  }

  function check(id, source, equals, page, left, baselineTop, optional) {
    var f = {
      id: id,
      type: 'check',
      source: source,
      page: page,
      left: left,
      baselineTop: baselineTop,
      glyphSize: 9.0
    };
    if (equals !== undefined) f.equals = equals;
    if (optional) f.optional = true;
    return f;
  }

  var TEMPLATE = {
    id: 'anketa-fl',
    title: 'Анкета физического лица',
    templateUrl: '../assets/document-pdf-templates/anketa-fl.pdf',
    outputFilename: 'anketa-fl.pdf',
    expectedPages: 4,
    appliesTo: ['individual'],

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      // Header: role of the person and reason for completing the form.
      check('roleClient', 'check.anketa-role-client', true, 0, 100.6, 125.54),
      check('roleRepresentative', 'check.anketa-role-representative', true, 0, 180.1, 125.54),
      check('roleBeneficiary', 'check.anketa-role-beneficiary', true, 0, 290.6, 125.54),
      check('roleBeneficialOwner', 'check.anketa-role-beneficial-owner', true, 0, 407.6, 125.54),
      check('modeFirst', 'check.anketa-mode-first', true, 0, 151.8, 148.70),
      check('modeChange', 'check.anketa-mode-change', true, 0, 281.8, 148.70),

      // Page 1 — identity (rows 1–12).
      cell('fullName', 'field.client-full-name', 0, 203.90, 217.82, { required: true }),
      cell('birthDate', 'field.client-birth-date', 0, 217.82, 231.26, { required: true, align: 'center' }),
      cell('birthPlace', 'field.client-birth-place', 0, 231.26, 244.70, { required: true }),

      check('citizenshipRussia', 'check.citizenship-rf', true, 0, 324.4, 268.49),
      check('citizenshipOther', 'check.citizenship-other', true, 0, 324.4, 281.21),
      text('citizenshipCountries', 'field.client-citizenship', 0, 339.0, 281.21, 222.4, {
        optional: true,
        showWhen: { source: 'check.citizenship-other', equals: true }
      }),

      check('taxResidentRussia', 'check.tax-resident-rf-yes', true, 0, 324.4, 324.89),
      check('taxResidentOther', 'check.tax-resident-rf-no', true, 0, 324.4, 337.61),
      text('taxResidencyCountries', 'extra.tax-residency-countries', 0, 339.0, 337.61, 222.4, {
        optional: true,
        showWhen: { source: 'check.tax-resident-rf-no', equals: true }
      }),

      check('foreignTaxpayerYes', 'check.fatca-yes', true, 0, 324.4, 363.05),
      check('foreignTaxpayerNo', 'check.fatca-no', true, 0, 324.4, 387.65),

      cell('inn', 'field.client-inn', 0, 409.85, 423.29, { required: true, align: 'center' }),
      cell('snils', 'field.client-snils', 0, 423.29, 436.73, { required: true, align: 'center' }),
      cell('identityDocumentType', 'field.client-id-type', 0, 450.19, 463.51, { required: true }),
      text('passportSeries', 'field.client-passport-series', 0, 324.4, 473.81, 69.0, {
        required: true,
        align: 'center'
      }),
      text('passportNumber', 'field.client-passport-number', 0, 400.0, 473.81, 161.4, {
        required: true,
        align: 'center'
      }),
      cell('passportIssueDate', 'field.client-passport-issue-date', 0, 476.95, 490.39, {
        required: true,
        align: 'center',
        format: 'dateRu'
      }),
      cell('passportIssuedBy', 'field.client-passport-issued-by', 0, 490.39, 503.83, { required: true }),
      cell('passportDepartmentCode', 'field.client-passport-dept-code', 0, 503.83, 517.27, {
        required: true,
        align: 'center'
      }),

      // Row 10 applies only to a foreign citizen / stateless person.
      cell('migrationDocumentSeriesNumber', 'extra.migration-document-series-number', 0, 552.55, 565.99, {
        optional: true
      }),
      cell('migrationStayStartDate', 'extra.migration-stay-start-date', 0, 565.99, 612.19, {
        optional: true,
        align: 'center',
        format: 'dateRu'
      }),
      cell('migrationStayEndDate', 'extra.migration-stay-end-date', 0, 612.19, 658.42, {
        optional: true,
        align: 'center',
        format: 'dateRu'
      }),

      cell('registrationAddress', 'field.client-registration-address', 0, 671.86, 719.02, {
        required: true,
        multiline: true,
        maxLines: 4
      }),
      cell('postalAddress', 'field.client-postal-address', 0, 732.46, 767.74, {
        optional: true,
        multiline: true,
        maxLines: 3
      }),

      // Page 2 — PEP status, contacts, banking and related persons.
      check('pepForeign', 'check.pep-foreign', true, 1, 324.4, 90.62),
      check('pepInternational', 'check.pep-international', true, 1, 324.4, 107.06),
      check('pepRussian', 'check.pep-russian', true, 1, 324.4, 133.82),
      text('pepPositionEmployer', 'extra.pep-position-employer', 1, 342.0, 133.82, 219.4, {
        optional: true,
        multiline: true,
        maxLines: 2,
        maxHeight: 32.0,
        lineHeight: 10.8
      }),
      cell('pepRelation', 'extra.extra-pep-relation', 1, 174.14, 211.46, {
        optional: true,
        multiline: true,
        maxLines: 3
      }),

      cell('mobilePhone', 'subject.phone', 1, 224.90, 238.22, { required: true }),
      cell('landlinePhone', 'extra.landline-phone', 1, 238.22, 251.66, { optional: true }),
      cell('email', 'subject.email', 1, 251.66, 266.69, { required: true }),

      cell('bankName', 'extra.bank-name', 1, 292.13, 305.45, { optional: true }),
      cell('bankAddress', 'extra.bank-address', 1, 305.45, 318.89, { optional: true }),
      cell('bankInn', 'extra.bank-inn', 1, 318.89, 332.33, { optional: true }),
      cell('bankBicSwift', 'extra.bank-bic-swift', 1, 332.33, 345.77, { optional: true }),
      cell('bankCorrespondentAccount', 'extra.bank-correspondent-account', 1, 345.77, 359.21, { optional: true }),
      cell('bankSettlementAccount', 'extra.bank-settlement-account', 1, 359.21, 372.65, { optional: true }),
      cell('bankAdditionalDetails', 'extra.bank-additional-details', 1, 372.65, 397.97, {
        optional: true,
        multiline: true,
        maxLines: 2
      }),

      cell('representativeName', 'extra.representative-name', 1, 444.19, 471.91, {
        optional: true,
        multiline: true,
        maxLines: 2
      }),
      cell('representativeAuthorityDetails', 'extra.representative-authority-details', 1, 471.91, 520.03, {
        optional: true,
        multiline: true,
        maxLines: 4
      }),
      cell('beneficiaryName', 'extra.beneficiary-name', 1, 577.15, 605.11, {
        optional: true,
        multiline: true,
        maxLines: 2
      }),
      cell('beneficiaryBasisDetails', 'extra.beneficiary-basis-details', 1, 605.11, 633.22, {
        optional: true,
        multiline: true,
        maxLines: 2
      }),
      cell('beneficialOwnerName', 'extra.beneficial-owner-name', 1, 679.42, 692.86, { optional: true }),
      cell('beneficialOwnerBasis', 'extra.beneficial-owner-basis', 1, 692.86, 718.18, {
        optional: true,
        multiline: true,
        maxLines: 2
      }),

      check('purposeBrokerage', 'extra.extra-business-purpose', 'Брокерское обслуживание', 1, 324.4, 728.50),
      check('purposeTrustManagement', 'extra.extra-business-purpose', 'Доверительное управление', 1, 324.4, 741.22),
      check('purposeConversion', 'extra.extra-business-purpose', 'Конверсионные операции', 1, 324.4, 753.94),
      check('purposeOther', 'extra.extra-business-purpose', 'Иное', 1, 324.4, 766.54),
      text('purposeOtherDetails', 'extra.business-purpose-other', 1, 405.0, 766.54, 156.4, {
        optional: true,
        showWhen: { source: 'extra.extra-business-purpose', equals: 'Иное' }
      }),

      // Page 3 — relationship goals, declarations and FATCA indicators.
      check('financialGoalIncome', 'extra.extra-financial-goal', 'Получение инвестиционного дохода', 2, 324.4, 67.32),
      check('financialGoalPreservation', 'extra.extra-financial-goal', 'Сохранение активов', 2, 324.4, 80.04),
      check('financialGoalRiskControl', 'extra.extra-financial-goal', 'Контроль рисков', 2, 324.4, 92.66),
      check('financialGoalOther', 'extra.extra-financial-goal', 'Иное', 2, 324.4, 105.38),
      text('financialGoalOtherDetails', 'extra.financial-goal-other', 2, 405.0, 105.38, 156.4, {
        optional: true,
        showWhen: { source: 'extra.extra-financial-goal', equals: 'Иное' }
      }),

      check('solvencyNoBankruptcy', 'extra.financial-solvency', 'no-bankruptcy', 2, 324.4, 131.42, true),
      check('solvencyBankruptcyPresent', 'extra.financial-solvency', 'bankruptcy-present', 2, 324.4, 144.14, true),
      cell('businessReputation', 'extra.extra-business-reputation', 2, 203.78, 240.98, {
        optional: true,
        multiline: true,
        maxLines: 3
      }),

      // Row 24 is preprinted documentary guidance, not a fillable narrative.
      check('foreignTrustOwnerYes', 'extra.foreign-trust-owner-status', 'yes', 2, 324.4, 364.13, true),
      check('foreignTrustOwnerNo', 'extra.foreign-trust-owner-status', 'no', 2, 324.4, 376.85, true),
      check('foreignTrustProtectorYes', 'extra.foreign-trust-protector-status', 'yes', 2, 324.4, 401.45, true),
      check('foreignTrustProtectorNo', 'extra.foreign-trust-protector-status', 'no', 2, 324.4, 414.05, true),

      check('usCitizen', 'check.fatca-us-citizen', true, 2, 324.4, 427.01, true),
      check('usPermanentResident', 'check.fatca-us-permanent-resident', true, 2, 324.4, 452.23, true),
      check('usBirthCountry', 'check.fatca-us-birth-country', true, 2, 326.8, 477.31, true),
      check('usAddress', 'check.fatca-us-address', true, 2, 324.4, 489.91, true),
      check('usMailingInstructions', 'check.fatca-us-mailing-address', true, 2, 326.8, 527.59, true),
      check('usPhone', 'check.fatca-us-phone', true, 2, 326.8, 577.87, true),
      check('usPaymentInstructions', 'check.fatca-us-payment-instructions', true, 2, 324.4, 602.95, true),
      check('usAttorney', 'check.fatca-us-attorney', true, 2, 324.4, 629.02, true),

      cell('otherInformation', 'extra.extra-other-info', 2, 654.22, 667.66, { optional: true }),

      // Completion date and printed name. The left rule remains blank for a
      // handwritten signature.
      text('questionnaireDate', 'field.documentDateRu', 2, 171.0, 749.86, 113.9, {
        required: true,
        align: 'center',
        format: 'dateRu'
      }),
      text('signaturePrintedName', 'field.client-full-name', 2, 184.1, 782.62, 119.0, {
        required: true,
        align: 'center',
        format: 'initials',
        fallbacks: ['surname']
      })

      // Page 4 — explanatory notes and employee-only block: no overlays.
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
