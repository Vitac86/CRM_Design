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

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 11;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller
  var VALUE_LEFT = 329.1;
  var VALUE_WIDTH = 226.0;

  var TABLE_COLUMNS = [63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62];
  var CELL_OWNERSHIP = [];
  var OWNERSHIP_EXEMPTIONS = [];

  function tableId(page) {
    return 'anketa-ip-sz-p' + (page + 1) + '-main';
  }

  // Rule-centre bounds measured from the authoritative PDF.  The old height
  // table gave several one-row values two or more rows of room; these bounds
  // deliberately stop at the field's own next horizontal rule.
  var CELL_GEOMETRY = {
    clientFullName: { top: 232.46, bottom: 246.02, ruleTop: 232.22, ruleBottom: 245.78, lines: 1 },
    birthDate: { top: 246.02, bottom: 259.46, ruleTop: 245.78, ruleBottom: 259.22, lines: 1 },
    birthPlace: { top: 259.46, bottom: 272.81, ruleTop: 259.22, ruleBottom: 272.57, lines: 1 },
    citizenship: { top: 272.81, bottom: 286.25, ruleTop: 272.57, ruleBottom: 286.01, lines: 1 },
    idDocumentName: { top: 436.85, bottom: 450.31, ruleTop: 436.61, ruleBottom: 450.07, lines: 1 },
    idSeriesNumber: { top: 450.31, bottom: 463.75, ruleTop: 450.07, ruleBottom: 463.51, lines: 1 },
    idIssueDate: { top: 463.75, bottom: 477.19, ruleTop: 463.51, ruleBottom: 476.95, lines: 1 },
    idIssuedBy: { top: 477.19, bottom: 501.55, ruleTop: 476.95, ruleBottom: 501.31, lines: 2 },
    idDepartmentCode: { top: 501.55, bottom: 514.87, ruleTop: 501.31, ruleBottom: 514.63, lines: 1 },
    residencePermitSeriesNumber: { top: 550.15, bottom: 563.59, ruleTop: 549.91, ruleBottom: 563.35, lines: 1 },
    residencePermitFrom: { top: 563.59, bottom: 609.79, ruleTop: 563.35, ruleBottom: 609.55, lines: 1, multiline: false },
    residencePermitTo: { top: 609.79, bottom: 656.02, ruleTop: 609.55, ruleBottom: 655.78, lines: 1, multiline: false },
    registrationAddress: { top: 669.46, bottom: 716.62, ruleTop: 669.22, ruleBottom: 716.38, lines: 4 },
    postalAddress: { top: 730.06, bottom: 765.34, ruleTop: 729.82, ruleBottom: 765.10, lines: 2 },
    inn: { top: 765.34, bottom: 778.78, ruleTop: 765.10, ruleBottom: 778.54, lines: 1 },

    snils: { top: 56.88, bottom: 70.32, ruleTop: 56.64, ruleBottom: 70.08, lines: 1 },
    pdlRelation: { top: 208.10, bottom: 243.38, ruleTop: 207.86, ruleBottom: 243.14, lines: 2 },
    mobilePhone: { top: 256.70, bottom: 270.17, ruleTop: 256.46, ruleBottom: 269.93, lines: 1 },
    landlinePhone: { top: 270.17, bottom: 283.61, ruleTop: 269.93, ruleBottom: 283.37, lines: 1 },
    email: { top: 283.61, bottom: 297.05, ruleTop: 283.37, ruleBottom: 296.81, lines: 1 },
    bankName: { top: 322.37, bottom: 335.81, ruleTop: 322.13, ruleBottom: 335.57, lines: 1 },
    bankAddress: { top: 335.81, bottom: 349.25, ruleTop: 335.57, ruleBottom: 349.01, lines: 1 },
    bankInn: { top: 349.25, bottom: 362.69, ruleTop: 349.01, ruleBottom: 362.45, lines: 1 },
    bankBic: { top: 362.69, bottom: 376.13, ruleTop: 362.45, ruleBottom: 375.89, lines: 1 },
    bankCorrAccount: { top: 376.13, bottom: 389.57, ruleTop: 375.89, ruleBottom: 389.33, lines: 1 },
    bankSettlementAccount: { top: 389.57, bottom: 402.89, ruleTop: 389.33, ruleBottom: 402.65, lines: 1 },
    bankAdditional: { top: 402.89, bottom: 428.33, ruleTop: 402.65, ruleBottom: 428.09, lines: 2 },
    ogrnip: { top: 441.79, bottom: 466.03, ruleTop: 441.55, ruleBottom: 465.79, lines: 1, multiline: false },
    ipRegistrationDate: { top: 466.03, bottom: 480.07, ruleTop: 465.79, ruleBottom: 479.83, lines: 1, multiline: false },
    ipCertificate: { top: 480.07, bottom: 527.47, ruleTop: 479.83, ruleBottom: 527.23, lines: 3 },
    ipRegistrationAuthority: { top: 527.47, bottom: 540.79, ruleTop: 527.23, ruleBottom: 540.55, lines: 1 },
    ipRegistrationPlace: { top: 540.79, bottom: 554.23, ruleTop: 540.55, ruleBottom: 553.99, lines: 1 },
    okved: { top: 554.23, bottom: 567.67, ruleTop: 553.99, ruleBottom: 567.43, lines: 1 },
    practiceDocumentName: { top: 581.11, bottom: 616.39, ruleTop: 580.87, ruleBottom: 616.15, lines: 2 },
    practiceDocumentNumber: { top: 616.39, bottom: 629.86, ruleTop: 616.15, ruleBottom: 629.62, lines: 1 },
    practiceDocumentDate: { top: 629.86, bottom: 643.30, ruleTop: 629.62, ruleBottom: 643.06, lines: 1, multiline: false },
    practiceDocumentAuthority: { top: 643.30, bottom: 656.74, ruleTop: 643.06, ruleBottom: 656.50, lines: 1 },
    licenceNumberDate: { top: 721.66, bottom: 737.50, ruleTop: 721.42, ruleBottom: 737.26, lines: 1 },
    licenceAuthority: { top: 737.50, bottom: 753.22, ruleTop: 737.26, ruleBottom: 752.98, lines: 1 },
    licenceValidity: { top: 753.22, bottom: 768.94, ruleTop: 752.98, ruleBottom: 768.70, lines: 1 },
    licenceActivities: { top: 768.94, bottom: 784.66, ruleTop: 768.70, ruleBottom: 784.42, lines: 1 },

    website: { top: 56.88, bottom: 94.22, ruleTop: 56.64, ruleBottom: 93.98, lines: 3 },
    representativeName: { top: 140.42, bottom: 156.14, ruleTop: 140.18, ruleBottom: 155.90, lines: 1 },
    representativeBasis: { top: 156.14, bottom: 205.34, ruleTop: 155.90, ruleBottom: 205.10, lines: 2 },
    beneficiaryName: { top: 262.49, bottom: 280.73, ruleTop: 262.25, ruleBottom: 280.49, lines: 1 },
    beneficiaryBasis: { top: 280.73, bottom: 307.13, ruleTop: 280.49, ruleBottom: 306.89, lines: 2 },
    beneficialOwnerName: { top: 353.33, bottom: 366.77, ruleTop: 353.09, ruleBottom: 366.53, lines: 1 },
    beneficialOwnerBasis: { top: 366.77, bottom: 389.09, ruleTop: 366.53, ruleBottom: 388.85, lines: 2 },

    otherInformation: { top: 320.09, bottom: 333.53, ruleTop: 319.85, ruleBottom: 333.29, lines: 1 }
  };

  function ownershipFor(field, geometry, options) {
    var o = options || {};
    var id = o.tableId || tableId(field.page);
    CELL_OWNERSHIP.push({
      fieldId: field.id, source: field.source, page: field.page,
      tableId: id, rowId: o.rowId || ('p' + (field.page + 1) + '-' + field.id),
      bounds: { top: geometry.top, bottom: geometry.bottom,
        left: o.left != null ? o.left : 326.11,
        right: o.right != null ? o.right : 560.62 },
      maxReviewedLines: o.maxReviewedLines || geometry.lines || 1,
      canGrow: !!field.expansion,
      nextRowId: geometry.nextRowId || o.nextRowId || null,
      affectedBorders: { horizontal: [geometry.ruleTop, geometry.ruleBottom],
        vertical: o.vertical || TABLE_COLUMNS.slice() },
      budgetId: o.budgetId || id, reviewStatus: 'approved', inkInset: 0
    });
  }

  function exempt(field, reason) {
    OWNERSHIP_EXEMPTIONS.push({ fieldId: field.id, source: field.source,
      page: field.page, reason: reason, reviewStatus: 'approved' });
  }

  function finishOwnership() {
    CELL_OWNERSHIP.forEach(function (owner, index) {
      if (owner.nextRowId) return;
      for (var i = index + 1; i < CELL_OWNERSHIP.length; i += 1) {
        var next = CELL_OWNERSHIP[i];
        if (next.tableId === owner.tableId && next.page === owner.page &&
            next.bounds.top >= owner.bounds.bottom - 0.05) {
          owner.nextRowId = next.rowId;
          return;
        }
      }
    });
  }

  // Rows that physically cannot take BODY. Each value is the largest
  // half-point step the measured room allows, floored at MIN.
  var ROW_SIZE = {
    beneficialOwnerBasis: 9.5,       // 9.97 pt of room
    beneficialOwnerName: 10,         // 10.10 pt of room
    beneficiaryBasis: 10,            // 10.10 pt of room
    beneficiaryName: 9.5,            // 9.97 pt of room
    citizenshipCountries: 12,        // 25.59 pt of room
    idDocumentName: 9.5,             // 9.99 pt of room
    idSeriesNumber: 9.5,             // 9.97 pt of room
    ipCertificate: 11.5,             // 11.58 pt of room
    ipRegistrationDate: 11.5,        // 11.72 pt of room
    questionnaireDate: 12,           // 28.55 pt of room
    signaturePrintedName: 12,        // 34.49 pt of room
    taxResidencyCountries: 12,       // 25.59 pt of room
  };

  function text(id, source, page, left, baselineTop, width, options) {
    var o = options || {};
    var field = {
      id: id,
      source: source,
      page: page,
      left: left,
      baselineTop: baselineTop,
      width: width,
      font: 'legalSerif',
      fontSize: o.fontSize || ROW_SIZE[id] || BODY,
      minFontSize: o.minFontSize != null ? o.minFontSize : MIN,
      align: o.align || 'left',
      required: !!o.required,
      optional: o.optional !== false,
      multiline: !!o.multiline,
      maxLines: o.maxLines,
      maxHeight: o.maxHeight,
      lineHeight: o.lineHeight,
      lineHeightRatio: o.lineHeightRatio,
      format: o.format,
      fallbacks: o.fallbacks,
      // Continuation regions and print-override permission are part of the
      // production schema; the helper must not drop them.
      flowRegions: o.flowRegions,
      expansion: o.expansion,
      overflowStrategy: o.overflowStrategy,
      allowPrintOverride: o.allowPrintOverride,
      tokenBreak: o.tokenBreak,
      label: o.label,
      showWhen: o.showWhen
    };
    if (o.ownership) ownershipFor(field, o.ownership, o.ownershipOptions);
    else exempt(field, o.exemptionReason || 'reviewed non-table or inline value region');
    return field;
  }

  // Value typed into the right-hand column beside the label on `baselineTop`.
  // Height of each printed value box, measured from the committed
  // template with tools/qa/measure_field_room.py. A cell may use as many
  // lines as its own box holds at the chosen size — wrapping inside the
  // row is what the form was designed for and always beats shrinking.
  function cell(id, source, page, baselineTop, options) {
    var o = options || {};
    var geometry = CELL_GEOMETRY[id];
    if (!geometry) throw new Error('Missing cell geometry for ' + id);
    o.multiline = geometry.multiline !== false && o.multiline !== false;
    o.maxHeight = o.maxHeight || (geometry.bottom - geometry.top - 2.0);
    o.maxLines = o.maxLines || geometry.lines;
    o.lineHeightRatio = o.lineHeightRatio || 0.95;
    o.ownership = geometry;
    return text(id, source, page, VALUE_LEFT, baselineTop, VALUE_WIDTH, o);
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
    exempt(f, 'reviewed source checkbox glyph; no text cell is drawn');
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

    pageLayout: {
      0: { fixedHeaderUntil: 0, bodyBottom: 779.02, fixedFooterFrom: null,
        shiftToTop: 841.92, bottomClearance: 30.0, compaction: [],
        anchors: ['clientFullName', 'idIssuedBy'] },
      1: { fixedHeaderUntil: 0, bodyBottom: 784.90, fixedFooterFrom: null,
        shiftToTop: 841.92, bottomClearance: 30.0, compaction: [],
        anchors: ['bankName', 'bankAddress', 'ipRegistrationAuthority',
          'ipRegistrationPlace'] },
      2: { fixedHeaderUntil: 0, bodyBottom: 781.18, fixedFooterFrom: null,
        shiftToTop: 841.92, bottomClearance: 30.0, compaction: [],
        anchors: ['representativeName', 'beneficiaryName', 'beneficialOwnerName'] }
    },

    tableOwnershipRequired: true,
    cellOwnership: CELL_OWNERSHIP,
    ownershipExemptions: OWNERSHIP_EXEMPTIONS,
    tableBudgets: [
      { id: tableId(0), tableId: tableId(0), page: 0, top: 232.46,
        bottom: 778.78, maxGrowth: 32.90, reviewStatus: 'approved' },
      { id: tableId(1), tableId: tableId(1), page: 1, top: 56.88,
        bottom: 784.66, maxGrowth: 27.02, reviewStatus: 'approved' },
      { id: tableId(2), tableId: tableId(2), page: 2, top: 56.88,
        bottom: 781.18, maxGrowth: 30.74, reviewStatus: 'approved' },
      { id: tableId(3), tableId: tableId(3), page: 3, top: 56.88,
        bottom: 333.53, maxGrowth: 0, reviewStatus: 'approved' }
    ],

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
      cell('clientFullName', 'field.clientFullName', 0, 242.78, {
        required: true,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 245.78, shiftFromTop: 245.78,
          rowHeight: 13.44, maxExtraRows: 1, maxFontSize: 9.5,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 10.54, ruleOffset: 13.44, ruleThickness: 0.48 }
        }
      }),
      cell('birthDate', 'field.client-birth-date', 0, 256.22, { required: true }),
      cell('birthPlace', 'field.client-birth-place', 0, 269.69, { required: true }),
      cell('citizenship', 'field.client-citizenship', 0, 283.13, { required: true }),

      // «Гражданство»: ☐ Российская Федерация / ☐ Иное государство. Both
      // "Иное государство" rows ask for the countries to be listed, so the
      // value goes beside its own box rather than on the section header row.
      check('citizenshipRf', 'extra.extra-citizenship-kind', 'rf', 0, 331.51, 296.57),
      check('citizenshipOther', 'extra.extra-citizenship-kind', 'other', 0, 331.51, 309.29),
      text('citizenshipCountries', 'extra.extra-citizenship-countries', 0, 345.0, 309.29, 208.0, {
        multiline: true, maxLines: 3, maxHeight: 36.76, lineHeightRatio: 0.95,
        ownership: { top: 286.25, bottom: 325.01,
          ruleTop: 286.01, ruleBottom: 324.77, lines: 3 },
        showWhen: { source: 'extra.extra-citizenship-kind', equals: 'other' }
      }),
      // «Сведения о налоговом резидентстве»: same pair.
      check('taxResidencyRf', 'extra.extra-tax-residency', 'rf', 0, 331.51, 348.77),
      check('taxResidencyOther', 'extra.extra-tax-residency', 'other', 0, 331.51, 361.49),
      text('taxResidencyCountries', 'extra.extra-tax-residency-countries', 0, 345.0, 361.49, 208.0, {
        multiline: true, maxLines: 3, maxHeight: 36.76, lineHeightRatio: 0.95,
        ownership: { top: 338.45, bottom: 377.21,
          ruleTop: 338.21, ruleBottom: 376.97, lines: 3 },
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
      // Two printed lines hold an ordinary authority. A full department name —
      // 111 characters in this 226 pt column — needs a third, so the row grows
      // by one reviewed 13.44 pt band and the 501.31 rule closes under it.
      // `baselineOffset` 6.96 puts that third baseline at 508.27, exactly
      // 10.5 pt below the second, so the wrapped value keeps one pitch instead
      // of stepping onto the row grid in the middle of a sentence.
      cell('idIssuedBy', 'field.client-passport-issued-by', 0, 487.27, {
        required: true, multiline: true, maxLines: 2, lineHeight: 10.5, fontSize: 9.0,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 501.31, shiftFromTop: 501.31,
          rowHeight: 13.44, maxExtraRows: 1, maxFontSize: 9.0,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 6.96, ruleOffset: 13.44, ruleThickness: 0.48 }
        }
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
        required: true, multiline: true, maxLines: 4, lineHeight: 10.5, fontSize: 9.0
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
      cell('bankName', 'extra.extra-bank-name', 1, 332.57, {
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 1, insertionTop: 335.57, shiftFromTop: 335.57,
          rowHeight: 13.44, maxExtraRows: 1, maxFontSize: 9.5,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 10.44, ruleOffset: 13.44, ruleThickness: 0.48 }
        }
      }),
      cell('bankAddress', 'extra.extra-bank-address', 1, 346.01, {
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 1, insertionTop: 349.01, shiftFromTop: 349.01,
          rowHeight: 13.44, maxExtraRows: 1, maxFontSize: 9.5,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 10.44, ruleOffset: 13.44, ruleThickness: 0.48 }
        }
      }),
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
        showWhen: IP_ONLY,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 1, insertionTop: 540.55, shiftFromTop: 540.55,
          rowHeight: 13.44, maxExtraRows: 1, maxFontSize: 9.5,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 10.56, ruleOffset: 13.44, ruleThickness: 0.48 }
        }
      }),
      cell('ipRegistrationPlace', 'extra.extra-ip-registration-place', 1, 551.11, {
        showWhen: IP_ONLY,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 1, insertionTop: 553.99, shiftFromTop: 553.99,
          rowHeight: 13.44, maxExtraRows: 1, maxFontSize: 9.5,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 10.56, ruleOffset: 13.44, ruleThickness: 0.48 }
        }
      }),
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
      cell('representativeName', 'field.client-rep-full-name', 2, 150.62, {
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 2, insertionTop: 155.90, shiftFromTop: 155.90,
          rowHeight: 15.72, maxExtraRows: 1, maxFontSize: 9.5,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 10.44, ruleOffset: 15.72, ruleThickness: 0.48 }
        }
      }),
      cell('representativeBasis', 'extra.extra-representative-basis', 2, 166.34, {
        multiline: true, maxLines: 2, lineHeight: 10.5, fontSize: 9.0
      }),
      cell('beneficiaryName', 'extra.extra-beneficiary-name', 2, 271.61, {
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 2, insertionTop: 280.49, shiftFromTop: 280.49,
          rowHeight: 18.24, maxExtraRows: 1, maxFontSize: 9.5,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 9.36, ruleOffset: 18.24, ruleThickness: 0.48 }
        }
      }),
      cell('beneficiaryBasis', 'extra.extra-beneficiary-basis', 2, 289.97, {
        multiline: true, maxLines: 2, lineHeight: 10.5, fontSize: 9.0
      }),
      cell('beneficialOwnerName', 'extra.extra-beneficial-owner', 2, 362.57, {
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 2, insertionTop: 366.53, shiftFromTop: 366.53,
          rowHeight: 13.44, maxExtraRows: 1, maxFontSize: 9.5,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 10.44, ruleOffset: 13.44, ruleThickness: 0.48 }
        }
      }),
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

  finishOwnership();

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
