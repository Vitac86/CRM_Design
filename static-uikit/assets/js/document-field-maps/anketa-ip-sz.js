// Field map — Приложение 18. АНКЕТА (ДОСЬЕ) ФИЗИЧЕСКОГО ЛИЦА –
// ИНДИВИДУАЛЬНОГО ПРЕДПРИНИМАТЕЛЯ ИЛИ ЛИЦА, ЗАНИМАЮЩЕГОСЯ ЧАСТНОЙ ПРАКТИКОЙ.
//
// Base template : assets/document-pdf-templates/anketa-ip-sz.pdf
// Source Word   : Z:\6. Управление по работе с клиентами\Формы документов\
//                 для оцифровки\Анкета ФЛ - ИП и СЗ.docx
// Source SHA-256: 6102dedd3d865431a327400b74c3aa679065668bda351f1d3953da0f818f04fe
// Pages         : 5 (A4, 595.32 × 841.92 pt; 0 AcroForm fields/widgets)
//
// The filename abbreviates the second category as «СЗ», but the form itself
// never says «самозанятый». Its own wording — in the title and in the first
// checkbox pair — is «Индивидуальный предприниматель» and «Лицо, занимающееся
// частной практикой», and those are the two legally distinct categories used
// here. They are not merged.
//
// Value column, from the drawn table rules: 325.9 → 559.4 pt on every page.
//
// LEFT BLANK BY DESIGN:
//   * page 5 «Для служебных отметок» — ФИО / должность / дата / подпись of the
//     employee who accepted the questionnaire;
//   * the handwritten «(подпись клиента)» rule on page 4 and «МП (при наличии)».

(function (global) {
  'use strict';

  var BODY = 9.48;
  var MIN = 6.0;
  var VALUE_LEFT = 329.1;
  var VALUE_WIDTH = 226.0;

  function text(id, source, page, left, baselineTop, width, options) {
    var o = options || {};
    return {
      id: id,
      source: source,
      page: page,
      left: left,
      baselineTop: baselineTop,
      width: width,
      font: 'legalSerif',
      fontSize: o.fontSize || BODY,
      minFontSize: o.minFontSize != null ? o.minFontSize : MIN,
      align: o.align || 'left',
      required: !!o.required,
      optional: o.optional !== false,
      multiline: !!o.multiline,
      maxLines: o.maxLines,
      lineHeight: o.lineHeight,
      format: o.format,
      fallbacks: o.fallbacks,
      showWhen: o.showWhen
    };
  }

  // Value typed into the right-hand column beside the label on `baselineTop`.
  function cell(id, source, page, baselineTop, options) {
    return text(id, source, page, VALUE_LEFT, baselineTop, VALUE_WIDTH, options);
  }

  function check(id, source, equals, page, left, baselineTop, showWhen) {
    var f = {
      id: id,
      type: 'check',
      source: source,
      page: page,
      left: left,
      baselineTop: baselineTop,
      glyphSize: 9.0,
      optional: true
    };
    if (equals !== undefined) f.equals = equals;
    if (showWhen) f.showWhen = showWhen;
    return f;
  }

  var IP_ONLY = { source: 'extra.extra-ipsz-status', equals: 'entrepreneur' };
  var PRACTICE_ONLY = { source: 'extra.extra-ipsz-status', equals: 'private-practice' };

  var TEMPLATE = {
    id: 'anketa-ip-sz',
    title: 'Анкета (досье) ИП или лица, занимающегося частной практикой',
    templateUrl: '../assets/document-pdf-templates/anketa-ip-sz.pdf',
    outputFilename: 'anketa-ip-chastnaya-praktika.pdf',
    expectedPages: 5,
    appliesTo: ['individual'],

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      // ═══ Header selections — three independent mutually exclusive pairs ═══
      // «Индивидуальный предприниматель ☐  Лицо, занимающееся частной практикой ☐»
      check('statusEntrepreneur', 'extra.extra-ipsz-status', 'entrepreneur', 0, 231.41, 152.42),
      check('statusPrivatePractice', 'extra.extra-ipsz-status', 'private-practice', 0, 410.59, 152.42),
      // «Представитель ☐  Выгодоприобретатель ☐» — the form notes that a
      // representative's or beneficiary's questionnaire is filled in only for
      // items 1–14, so this stays an explicit operator choice.
      check('roleRepresentative', 'extra.extra-questionnaire-role', 'representative', 0, 149.90, 174.38),
      check('roleBeneficiary', 'extra.extra-questionnaire-role', 'beneficiary', 0, 260.21, 174.38),
      // «Заполняется впервые ☐  Изменение анкетных данных ☐»
      check('modeFirst', 'extra.extra-questionnaire-mode', 'first', 0, 173.42, 196.46),
      check('modeChange', 'extra.extra-questionnaire-mode', 'change', 0, 303.41, 196.46),

      // ═══ 1–8 Identity, all from the subject card ═══
      cell('clientFullName', 'field.clientFullName', 0, 242.78, { required: true }),
      cell('birthDate', 'field.client-birth-date', 0, 256.22, { required: true }),
      cell('birthPlace', 'field.client-birth-place', 0, 269.69, { required: true }),
      cell('citizenship', 'field.client-citizenship', 0, 283.13, { required: true }),

      // «Гражданство»: ☐ Российская Федерация / ☐ Иное государство. Both
      // "Иное государство" rows ask for the countries to be listed, so the
      // value goes beside its own box rather than on the section header row.
      check('citizenshipRf', 'extra.extra-citizenship-kind', 'rf', 0, 331.51, 296.57),
      check('citizenshipOther', 'extra.extra-citizenship-kind', 'other', 0, 331.51, 309.29),
      text('citizenshipCountries', 'extra.extra-citizenship-countries', 0, 345.0, 309.29, 208.0, {
        showWhen: { source: 'extra.extra-citizenship-kind', equals: 'other' }
      }),
      // «Сведения о налоговом резидентстве»: same pair.
      check('taxResidencyRf', 'extra.extra-tax-residency', 'rf', 0, 331.51, 348.77),
      check('taxResidencyOther', 'extra.extra-tax-residency', 'other', 0, 331.51, 361.49),
      text('taxResidencyCountries', 'extra.extra-tax-residency-countries', 0, 345.0, 361.49, 208.0, {
        showWhen: { source: 'extra.extra-tax-residency', equals: 'other' }
      }),
      // «Принадлежность к категории иностранных налогоплательщиков»: Да / Нет
      check('foreignTaxpayerYes', 'extra.extra-foreign-taxpayer', 'yes', 0, 331.51, 387.53),
      check('foreignTaxpayerNo', 'extra.extra-foreign-taxpayer', 'no', 0, 331.51, 400.25),

      // Identity document — CRM
      cell('idDocumentName', 'field.client-id-type', 0, 445.99, { required: true }),
      cell('idSeriesNumber', 'field.passportSeriesNumber', 0, 459.43, { required: true }),
      cell('idIssueDate', 'field.client-passport-issue-date', 0, 473.95, {
        required: true, format: 'dateRu'
      }),
      cell('idIssuedBy', 'field.client-passport-issued-by', 0, 487.27, {
        required: true, multiline: true, maxLines: 2, lineHeight: 10.5, fontSize: 9.0
      }),
      cell('idDepartmentCode', 'field.client-passport-dept-code', 0, 511.75, { required: true }),

      // Residence-permit block — only for non-Russian citizens.
      cell('residencePermitSeriesNumber', 'extra.extra-residence-permit-number', 0, 560.47, {
        showWhen: { source: 'extra.extra-citizenship-kind', equals: 'other' }
      }),
      cell('residencePermitFrom', 'extra.extra-residence-permit-from', 0, 573.67, {
        format: 'dateRu',
        showWhen: { source: 'extra.extra-citizenship-kind', equals: 'other' }
      }),
      cell('residencePermitTo', 'extra.extra-residence-permit-to', 0, 619.90, {
        format: 'dateRu',
        showWhen: { source: 'extra.extra-citizenship-kind', equals: 'other' }
      }),

      // 9–11 addresses and INN
      cell('registrationAddress', 'field.client-registration-address', 0, 679.66, {
        required: true, multiline: true, maxLines: 3, lineHeight: 10.5, fontSize: 9.0
      }),
      cell('postalAddress', 'field.client-postal-address', 0, 740.14, {
        multiline: true, maxLines: 2, lineHeight: 10.5, fontSize: 9.0
      }),
      cell('inn', 'subject.inn', 0, 775.54, { required: true }),

      // ═══ Page 2 — SNILS, PDL, contacts, bank, IP/practice registration ═══
      cell('snils', 'field.client-snils', 1, 67.20, { required: true }),

      // 13 «Наличие статуса ПДЛ» — three mutually exclusive categories.
      check('pdlForeign', 'extra.extra-pdl-status', 'foreign', 1, 331.51, 117.02),
      check('pdlInternational', 'extra.extra-pdl-status', 'international', 1, 331.51, 154.22),
      check('pdlRussian', 'extra.extra-pdl-status', 'russian', 1, 331.51, 179.66),
      // 14 «Статус родства по отношению к ПДЛ»
      cell('pdlRelation', 'extra.extra-pdl-relation', 1, 218.18, {
        multiline: true, maxLines: 2, lineHeight: 10.5, fontSize: 9.0
      }),

      // 15 contacts — CRM
      cell('mobilePhone', 'subject.phone', 1, 267.05, { required: true }),
      cell('landlinePhone', 'extra.extra-landline-phone', 1, 280.37),
      cell('email', 'subject.email', 1, 293.81, { required: true }),

      // 16 bank details
      cell('bankName', 'extra.extra-bank-name', 1, 332.57),
      cell('bankAddress', 'extra.extra-bank-address', 1, 346.01),
      cell('bankInn', 'extra.extra-bank-inn', 1, 359.45),
      cell('bankBic', 'extra.extra-bank-bic', 1, 372.89),
      cell('bankCorrAccount', 'extra.extra-bank-corr-account', 1, 386.33),
      cell('bankSettlementAccount', 'extra.extra-bank-account', 1, 399.77),
      cell('bankAdditional', 'extra.extra-bank-additional', 1, 413.21),

      // 17 «Сведения о регистрации в качестве индивидуального предпринимателя»
      cell('ogrnip', 'extra.extra-ogrnip', 1, 451.87, { showWhen: IP_ONLY }),
      cell('ipRegistrationDate', 'extra.extra-ip-registration-date', 1, 476.71, {
        format: 'dateRu', showWhen: IP_ONLY
      }),
      cell('ipCertificate', 'extra.extra-ip-certificate', 1, 490.63, {
        multiline: true, maxLines: 3, lineHeight: 10.5, fontSize: 9.0, showWhen: IP_ONLY
      }),
      cell('ipRegistrationAuthority', 'extra.extra-ip-registration-authority', 1, 537.67, {
        showWhen: IP_ONLY
      }),
      cell('ipRegistrationPlace', 'extra.extra-ip-registration-place', 1, 551.11, { showWhen: IP_ONLY }),
      cell('okved', 'extra.extra-okved', 1, 564.55, { showWhen: IP_ONLY }),

      // 18 «Сведения о регистрации в качестве лица, занимающегося частной практикой»
      cell('practiceDocumentName', 'extra.extra-practice-document', 1, 591.19, {
        multiline: true, maxLines: 2, lineHeight: 10.5, fontSize: 9.0, showWhen: PRACTICE_ONLY
      }),
      cell('practiceDocumentNumber', 'extra.extra-practice-document-number', 1, 626.62, { showWhen: PRACTICE_ONLY }),
      cell('practiceDocumentDate', 'extra.extra-practice-document-date', 1, 640.06, {
        format: 'dateRu', showWhen: PRACTICE_ONLY
      }),
      cell('practiceDocumentAuthority', 'extra.extra-practice-document-authority', 1, 653.50, { showWhen: PRACTICE_ONLY }),

      // 19 licensing — «не осуществляется» / «осуществляется (указать ниже)»
      check('licensingNone', 'extra.extra-licensing', 'none', 1, 331.51, 703.78),
      check('licensingYes', 'extra.extra-licensing', 'yes', 1, 331.51, 716.50),
      cell('licenceNumberDate', 'extra.extra-licence-number-date', 1, 731.86, {
        showWhen: { source: 'extra.extra-licensing', equals: 'yes' }
      }),
      cell('licenceAuthority', 'extra.extra-licence-authority', 1, 747.70, {
        showWhen: { source: 'extra.extra-licensing', equals: 'yes' }
      }),
      cell('licenceValidity', 'extra.extra-licence-validity', 1, 763.42, {
        showWhen: { source: 'extra.extra-licensing', equals: 'yes' }
      }),
      cell('licenceActivities', 'extra.extra-licence-activities', 1, 779.14, {
        showWhen: { source: 'extra.extra-licensing', equals: 'yes' }
      }),

      // ═══ Page 3 — website, representative, beneficiary, purposes ═══
      cell('website', 'extra.extra-website', 2, 67.20),
      cell('representativeName', 'field.client-rep-full-name', 2, 150.62),
      cell('representativeBasis', 'extra.extra-representative-basis', 2, 166.34, {
        multiline: true, maxLines: 2, lineHeight: 10.5, fontSize: 9.0
      }),
      cell('beneficiaryName', 'extra.extra-beneficiary-name', 2, 271.61),
      cell('beneficiaryBasis', 'extra.extra-beneficiary-basis', 2, 289.97, {
        multiline: true, maxLines: 2, lineHeight: 10.5, fontSize: 9.0
      }),
      cell('beneficialOwnerName', 'extra.extra-beneficial-owner', 2, 362.57),
      cell('beneficialOwnerBasis', 'extra.extra-beneficial-owner-basis', 2, 375.89, {
        multiline: true, maxLines: 2, lineHeight: 10.5, fontSize: 9.0
      }),

      // 24 «Цели установления деловых отношений» — one choice of four.
      check('purposeBrokerage', 'extra.extra-business-purpose', 'brokerage', 2, 331.51, 399.53),
      check('purposeTrust', 'extra.extra-business-purpose', 'trust', 2, 331.51, 412.25),
      check('purposeConversion', 'extra.extra-business-purpose', 'conversion', 2, 331.51, 424.85),
      check('purposeOther', 'extra.extra-business-purpose', 'other', 2, 331.51, 437.57),
      // 25 «Цели финансово-хозяйственной деятельности» — one choice of four.
      check('goalIncome', 'extra.extra-financial-goal', 'income', 2, 331.51, 460.15),
      check('goalPreservation', 'extra.extra-financial-goal', 'preservation', 2, 331.51, 472.87),
      check('goalRiskControl', 'extra.extra-financial-goal', 'risk-control', 2, 331.51, 485.59),
      check('goalOther', 'extra.extra-financial-goal', 'other', 2, 331.51, 498.31),
      // 26 «Сведения о финансовом положении» — Да / Нет
      check('financialPositionYes', 'extra.extra-financial-position', 'yes', 2, 331.51, 521.35),
      check('financialPositionNo', 'extra.extra-financial-position', 'no', 2, 331.51, 534.07),
      // 29 «Статус доверительного собственника ИСБОЮЛ» — Имеется / Отсутствует
      check('trusteeStatusYes', 'extra.extra-trustee-status', 'yes', 2, 331.51, 754.06),
      check('trusteeStatusNo', 'extra.extra-trustee-status', 'no', 2, 331.51, 766.78),

      // ═══ Page 4 — protector status, FATCA, other, date and signature ═══
      // 30 «Статус протектора ИСБОЮЛ» — Имеется / Отсутствует
      check('protectorStatusYes', 'extra.extra-protector-status', 'yes', 3, 331.51, 67.32),
      check('protectorStatusNo', 'extra.extra-protector-status', 'no', 3, 331.51, 80.04),

      // 31 US-taxpayer indicators — eight INDEPENDENT declarations, any number
      // of which may be ticked. Each is its own wizard checkbox.
      check('fatcaCitizen', 'check.fatca-us-citizen', true, 3, 331.51, 92.90),
      check('fatcaGreencard', 'check.fatca-us-greencard', true, 3, 331.51, 118.10),
      check('fatcaBirthCountry', 'check.fatca-us-birth-country', true, 3, 331.51, 143.18),
      check('fatcaAddress', 'check.fatca-us-address', true, 3, 331.51, 155.78),
      check('fatcaMailingAddress', 'check.fatca-us-mailing-address', true, 3, 331.51, 193.46),
      check('fatcaPhone', 'check.fatca-us-phone', true, 3, 331.51, 243.74),
      check('fatcaPaymentInstructions', 'check.fatca-us-payment-instructions', true, 3, 331.51, 268.85),
      check('fatcaAttorney', 'check.fatca-us-attorney', true, 3, 331.51, 294.89),

      // 32 «Иные сведения»
      cell('otherInformation', 'extra.extra-other-info', 3, 330.29, {
        multiline: true, maxLines: 2, lineHeight: 10.5, fontSize: 9.0
      }),

      // «Дата заполнения анкеты: ____________»
      text('questionnaireDate', 'field.documentDateRu', 3, 171.0, 417.05, 113.9, {
        required: true, format: 'dateRu', align: 'center'
      }),
      // The 58.1 rule is the handwritten «(подпись клиента)» and stays empty;
      // this is the printed «( ФИО клиента )» identification beside it.
      text('signaturePrintedName', 'field.clientFullName', 3, 184.1, 449.83, 118.6, {
        required: true, align: 'center', format: 'initials', fallbacks: ['surname']
      })

      // Page 5 — footnotes and the «Для служебных отметок» employee block: no
      // overlays.
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
