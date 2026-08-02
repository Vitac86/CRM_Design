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

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 11;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller
  var VALUE_LEFT = 329.1;
  var VALUE_WIDTH = 242.1;

  // Rows that physically cannot take BODY. Each value is the largest
  // half-point step the measured room allows, floored at MIN.
  var ROW_SIZE = {
    idDocumentName: 10,              // 10.10 pt of room
    idIssueDate: 9.5,                // 9.97 pt of room
    idSeriesNumber: 10,              // 10.10 pt of room
    otherInformation: 10,            // 10.10 pt of room
    questionnaireDate: 12,           // 22.92 pt of room
    signatureName: 12,               // 34.47 pt of room
  };

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
      fontSize: o.fontSize || ROW_SIZE[id] || BODY,
      minFontSize: o.minFontSize != null ? o.minFontSize : MIN,
      align: o.align || 'left',
      required: !!o.required,
      optional: !!o.optional,
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
  }

  // A value typed into the right-hand column of the row whose printed label
  // sits on `baselineTop`, so the value lands on the label's own line.
  // Height of each printed value box, measured from the committed
  // template with tools/qa/measure_field_room.py. A cell may use as many
  // lines as its own box holds at the chosen size — wrapping inside the
  // row is what the form was designed for and always beats shrinking.
  var CELL_BOX = {
    bankAdditional: 24.8,
    bankAddress: 26.4,
    bankBic: 26.3,
    bankCorrespondentAccount: 26.4,
    bankInn: 26.3,
    bankName: 26.4,
    bankSettlementAccount: 13.0,
    birthDate: 13.6,
    clientFullName: 13.8,
    email: 13.7,
    idDepartmentCode: 13.7,
    idDocumentName: 13.7,
    idIssueDate: 13.7,
    idIssuedBy: 25.3,
    idSeriesNumber: 13.7,
    inn: 13.7,
    kinshipDegree: 36.8,
    landlinePhone: 13.6,
    medicalPolicy: 25.3,
    mobilePhone: 13.7,
    otherInformation: 22.8,
    pdlDetails: 97.1,
    questionnaireDate: 44.7,
    registrationAddress: 49.0,
    signatureName: 64.2,
    snils: 13.7,
  };

  function cell(id, source, baselineTop, options) {
    var o = options || {};
    if (CELL_BOX[id]) {
      o.multiline = o.multiline !== false;
      o.maxHeight = o.maxHeight || CELL_BOX[id];
      o.lineHeightRatio = o.lineHeightRatio || 0.95;
    }
    return text(id, source, 0, VALUE_LEFT, baselineTop, VALUE_WIDTH, o);
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
      // `maxLines: 2` promised a second line that `maxHeight: 23.0` then took
      // away: at the printed 11.88 pt pitch, 23.0 pt holds one line, so a real
      // «должность, наименование и адрес работодателя» never got the second one.
      // The cell itself has the room — it runs 465.91 → 562.99 and the next
      // printed thing inside it is the status checkbox at 492.86, so two lines
      // at 475.87 and 487.75 leave the descender 3.17 pt clear of it. 23.76 pt
      // is exactly those two pitches.
      text('pdlDetails', 'extra.extra-pdl-details', 0, 345.0, 475.87, 226.0, {
        optional: true, multiline: true, maxLines: 2, lineHeight: 11.88,
        maxHeight: 23.76,
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
