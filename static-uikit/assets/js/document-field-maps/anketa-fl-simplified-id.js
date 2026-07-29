// Field map — Приложение 16.1. АНКЕТА ФИЗИЧЕСКОГО ЛИЦА
// (применяется при упрощенной идентификации клиента через личный кабинет
// ООО «Инвестика»)
//
// Base template : assets/document-pdf-templates/anketa-fl-simplified-id.pdf
// Source Word   : Z:\6. Управление по работе с клиентами\Формы документов\
//                 для оцифровки\АНКЕТА ФЛ Упр. идент..docx
// Source SHA-256: 90bd7993c89078be18165512ff90e9820ce4e25e8dd479eb9b8b03160bbc94eb
// Pages         : 2 (A4, 595.32 × 841.92 pt; 0 AcroForm fields/widgets)
//
// This is a different document from Приложение 16 (`anketa-fl`): it is the
// short questionnaire used for *simplified* identification through the client
// cabinet, and it carries its own bank-details and PDL blocks.
//
// The form body is Times New Roman 9.48 pt; Liberation Serif is the locally
// committed metric-compatible replacement used for the inserted values. All
// coordinates below come from the converted PDF's real glyph boxes and table
// vectors: the value column runs 326.4 → 573.5 pt on every row.
//
// Left blank by design:
//   * the "Для служебных отметок" block on page 2 (ФИО / должность / дата /
//     подпись of the employee who accepted the questionnaire);
//   * the handwritten "(подпись клиента)" rule on page 2.

(function (global) {
  'use strict';

  var BODY = 9.48;
  var MIN = 6.0;
  var VALUE_LEFT = 329.1;
  var VALUE_WIDTH = 242.1;

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

  // A value typed into the right-hand column of the row whose printed label
  // sits on `baselineTop`, so the value lands on the label's own line.
  function cell(id, source, baselineTop, options) {
    return text(id, source, 0, VALUE_LEFT, baselineTop, VALUE_WIDTH, options);
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
      glyphSize: 9.0,
      optional: true
    };
  }

  // The three PDL boxes are mutually exclusive: one normalised value drives
  // whichever mark applies, and "none" leaves all three empty.
  var PDL_SET = ['foreign', 'international', 'russian'];

  var TEMPLATE = {
    id: 'anketa-fl-simplified-id',
    title: 'Анкета физического лица (упрощённая идентификация)',
    templateUrl: '../assets/document-pdf-templates/anketa-fl-simplified-id.pdf',
    outputFilename: 'anketa-fl-uproshchennaya-identifikaciya.pdf',
    expectedPages: 2,
    appliesTo: ['individual'],

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      // ── 1–2. Identity ────────────────────────────────────────────────────
      cell('clientFullName', 'field.clientFullName', 149.90, { required: true }),
      cell('birthDate', 'field.client-birth-date', 164.06, { required: true }),

      // ── 5. Identity document ─────────────────────────────────────────────
      cell('idDocumentName', 'field.client-id-type', 191.30, { required: true }),
      cell('idSeriesNumber', 'field.passportSeriesNumber', 205.46, { required: true }),
      cell('idIssueDate', 'field.client-passport-issue-date', 219.50, { required: true }),
      // The issuing authority routinely runs past one line; the row is 25.9 pt
      // tall, which holds two.
      cell('idIssuedBy', 'field.client-passport-issued-by', 234.62, {
        required: true, multiline: true, maxLines: 2, lineHeight: 10.5, maxHeight: 23.0
      }),
      cell('idDepartmentCode', 'field.client-passport-dept-code', 260.54, { required: true }),

      // ── 6. Registration address (49.4 pt row — up to four lines) ─────────
      cell('registrationAddress', 'field.client-registration-address', 288.89, {
        required: true, multiline: true, maxLines: 4, lineHeight: 11.5, maxHeight: 46.0
      }),

      // ── 7. Contacts ──────────────────────────────────────────────────────
      cell('mobilePhone', 'subject.phone', 352.49, { required: true }),
      cell('landlinePhone', 'extra.extra-landline-phone', 366.65, { optional: true }),
      cell('email', 'subject.email', 380.81, { required: true }),

      // ── 8–10. INN / SNILS / medical policy ───────────────────────────────
      cell('inn', 'subject.inn', 394.97, { required: true }),
      cell('snils', 'field.client-snils', 409.13, { required: true }),
      cell('medicalPolicy', 'extra.extra-medical-policy', 423.05, { optional: true }),

      // ── 11. Public official (ПДЛ) ────────────────────────────────────────
      // Position, employer name and employer address, printed in the free part
      // of the right-hand column beside "Укажите статус…" and above the boxes.
      text('pdlDetails', 'extra.extra-pdl-details', 0, 345.0, 475.87, 226.0, {
        optional: true, multiline: true, maxLines: 2, lineHeight: 11.88,
        maxHeight: 23.0,
        showWhen: { source: 'extra.extra-pdl-status', equals: PDL_SET }
      }),

      // ── 12. Degree of kinship to the person named above ──────────────────
      cell('kinshipDegree', 'extra.extra-kinship-degree', 587.59, {
        optional: true, multiline: true, maxLines: 3, lineHeight: 11.5, maxHeight: 35.0
      }),

      // ── 13. Bank details ─────────────────────────────────────────────────
      cell('bankName', 'extra.extra-bank-name', 650.26, { optional: true }),
      cell('bankAddress', 'extra.extra-bank-address', 663.70, { optional: true }),
      cell('bankInn', 'extra.extra-bank-inn', 677.14, { optional: true }),
      cell('bankBic', 'extra.extra-bank-bic', 690.58, { optional: true }),
      cell('bankCorrespondentAccount', 'extra.extra-bank-corr-account', 704.02, { optional: true }),
      cell('bankSettlementAccount', 'extra.extra-bank-account', 717.34, { optional: true }),
      cell('bankAdditional', 'extra.extra-bank-additional', 730.78, { optional: true }),

      // ── 14. Other information ────────────────────────────────────────────
      cell('otherInformation', 'extra.extra-other-information', 755.14, {
        optional: true, multiline: true, maxLines: 2, lineHeight: 11.0, maxHeight: 22.0
      }),

      // ── Page 2: completion date and printed name ─────────────────────────
      // "Дата заполнения анкеты: ____________"
      text('questionnaireDate', 'field.documentDateRu', 1, 171.0, 100.1, 113.9, {
        required: true, format: 'dateRu', align: 'center'
      }),
      // The left rule at 58.1 is the handwritten signature and stays empty;
      // this is the "( ФИО клиента )" rule beside it.
      text('signatureName', 'field.client-full-name', 1, 184.1, 132.86, 118.6, {
        required: true, align: 'center', format: 'initials', fallbacks: ['surname']
      }),

      // ── 11. PDL marks — mutually exclusive, all empty when "none" ────────
      check('pdlForeign', 'extra.extra-pdl-status', 'foreign', 0, 331.51, 501.31),
      check('pdlInternational', 'extra.extra-pdl-status', 'international', 0, 331.51, 514.75),
      check('pdlRussian', 'extra.extra-pdl-status', 'russian', 0, 331.51, 540.91)

      // Page 2 — explanatory notes and the "Для служебных отметок" employee
      // block: no overlays.
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
