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

  var TABLE_COLUMNS = [63.74, 64.70, 84.62, 85.58, 326.11, 573.72, 574.68];
  var TABLE_ID = 'anketa-fl-simplified-id-p1-main';
  var CELL_OWNERSHIP = [];
  var OWNERSHIP_EXEMPTIONS = [];

  // Bounds are rule centres from the source PDF.  ruleTop/ruleBottom are the
  // exact top coordinates of its 0.48 pt horizontal rule rectangles.
  var CELL_GEOMETRY = {
    clientFullName:       { top: 139.58, bottom: 153.86, ruleTop: 139.34, ruleBottom: 153.62, lines: 1 },
    birthDate:            { top: 153.86, bottom: 167.90, ruleTop: 153.62, ruleBottom: 167.66, lines: 1 },
    idDocumentName:       { top: 182.06, bottom: 196.22, ruleTop: 181.82, ruleBottom: 195.98, lines: 1 },
    idSeriesNumber:       { top: 196.22, bottom: 210.38, ruleTop: 195.98, ruleBottom: 210.14, lines: 1 },
    idIssueDate:          { top: 210.38, bottom: 224.54, ruleTop: 210.14, ruleBottom: 224.30, lines: 1 },
    idIssuedBy:           { top: 224.54, bottom: 250.34, ruleTop: 224.30, ruleBottom: 250.10, lines: 2 },
    idDepartmentCode:     { top: 250.34, bottom: 264.53, ruleTop: 250.10, ruleBottom: 264.29, lines: 1 },
    registrationAddress:  { top: 278.69, bottom: 328.13, ruleTop: 278.45, ruleBottom: 327.89, lines: 4 },
    mobilePhone:          { top: 342.29, bottom: 356.45, ruleTop: 342.05, ruleBottom: 356.21, lines: 1 },
    landlinePhone:        { top: 356.45, bottom: 370.49, ruleTop: 356.21, ruleBottom: 370.25, lines: 1 },
    email:                { top: 370.49, bottom: 384.65, ruleTop: 370.25, ruleBottom: 384.41, lines: 1 },
    inn:                  { top: 384.65, bottom: 398.81, ruleTop: 384.41, ruleBottom: 398.57, lines: 1 },
    snils:                { top: 398.81, bottom: 412.97, ruleTop: 398.57, ruleBottom: 412.73, lines: 1 },
    medicalPolicy:        { top: 412.97, bottom: 438.77, ruleTop: 412.73, ruleBottom: 438.53, lines: 2 },
    kinshipDegree:        { top: 577.39, bottom: 614.71, ruleTop: 577.15, ruleBottom: 614.47, lines: 3 },
    bankName:             { top: 640.06, bottom: 653.50, ruleTop: 639.82, ruleBottom: 653.26, lines: 1 },
    bankAddress:          { top: 653.50, bottom: 666.94, ruleTop: 653.26, ruleBottom: 666.70, lines: 1 },
    bankInn:              { top: 666.94, bottom: 680.38, ruleTop: 666.70, ruleBottom: 680.14, lines: 1 },
    bankBic:              { top: 680.38, bottom: 693.70, ruleTop: 680.14, ruleBottom: 693.46, lines: 1 },
    bankCorrespondentAccount: { top: 693.70, bottom: 707.14, ruleTop: 693.46, ruleBottom: 706.90, lines: 1 },
    bankSettlementAccount: { top: 707.14, bottom: 720.58, ruleTop: 706.90, ruleBottom: 720.34, lines: 1 },
    bankAdditional:       { top: 720.58, bottom: 745.90, ruleTop: 720.34, ruleBottom: 745.66, lines: 2 },
    otherInformation:     { top: 745.90, bottom: 757.42, ruleTop: 745.66, ruleBottom: 757.18, lines: 1,
                            nextRowId: 'p1-legal-confirmation' }
  };

  function ownershipFor(field, geometry, options) {
    var o = options || {};
    CELL_OWNERSHIP.push({
      fieldId: field.id, source: field.source, page: field.page,
      tableId: o.tableId || TABLE_ID,
      rowId: o.rowId || ('p' + (field.page + 1) + '-' + field.id),
      bounds: {
        top: geometry.top, bottom: geometry.bottom,
        left: o.left != null ? o.left : 326.11,
        right: o.right != null ? o.right : 574.68
      },
      maxReviewedLines: o.maxReviewedLines || geometry.lines || 1,
      canGrow: !!field.expansion,
      nextRowId: geometry.nextRowId || o.nextRowId || null,
      affectedBorders: {
        horizontal: [geometry.ruleTop, geometry.ruleBottom],
        vertical: o.vertical || TABLE_COLUMNS.slice()
      },
      budgetId: o.budgetId || TABLE_ID,
      reviewStatus: 'approved', inkInset: 0
    });
  }

  function exempt(field, reason) {
    OWNERSHIP_EXEMPTIONS.push({
      fieldId: field.id, source: field.source, page: field.page,
      reason: reason, reviewStatus: 'approved'
    });
  }

  function finishOwnership() {
    CELL_OWNERSHIP.forEach(function (owner, index) {
      if (owner.nextRowId) return;
      for (var i = index + 1; i < CELL_OWNERSHIP.length; i += 1) {
        if (CELL_OWNERSHIP[i].tableId === owner.tableId &&
            CELL_OWNERSHIP[i].page === owner.page &&
            CELL_OWNERSHIP[i].bounds.top >= owner.bounds.bottom - 0.05) {
          owner.nextRowId = CELL_OWNERSHIP[i].rowId;
          return;
        }
      }
    });
  }

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
    var field = {
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
    if (o.ownership) ownershipFor(field, o.ownership, o.ownershipOptions);
    else exempt(field, o.exemptionReason || 'reviewed non-table or inline value region');
    return field;
  }

  // A value typed into the right-hand column of the row whose printed label
  // sits on `baselineTop`, so the value lands on the label's own line.
  // Height of each printed value box, measured from the committed
  // template with tools/qa/measure_field_room.py. A cell may use as many
  // lines as its own box holds at the chosen size — wrapping inside the
  // row is what the form was designed for and always beats shrinking.
  function cell(id, source, baselineTop, options) {
    var o = options || {};
    var geometry = CELL_GEOMETRY[id];
    if (!geometry) throw new Error('Missing cell geometry for ' + id);
    o.multiline = o.multiline !== false;
    o.maxHeight = o.maxHeight || (geometry.bottom - geometry.top - 2.0);
    o.maxLines = o.maxLines || geometry.lines;
    o.lineHeightRatio = o.lineHeightRatio || 0.95;
    o.ownership = geometry;
    return text(id, source, 0, VALUE_LEFT, baselineTop, VALUE_WIDTH, o);
  }

  function check(id, source, equals, page, left, baselineTop) {
    var field = {
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
    exempt(field, 'reviewed source checkbox glyph; no text cell is drawn');
    return field;
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

    // Page 1 has 61.46 pt below its last movable source operator.  Retaining
    // the standard 30 pt print margin leaves one shared 31.46 pt budget; all
    // identity, bank and free-text anchors draw from this same number.
    pageLayout: {
      0: {
        fixedHeaderUntil: 0, bodyBottom: 780.46, fixedFooterFrom: null,
        shiftToTop: 841.92, bottomClearance: 30.0, compaction: [],
        anchors: ['clientFullName', 'bankName', 'bankAddress', 'otherInformation']
      }
    },

    tableOwnershipRequired: true,
    cellOwnership: CELL_OWNERSHIP,
    ownershipExemptions: OWNERSHIP_EXEMPTIONS,
    tableBudgets: [
      { id: TABLE_ID, tableId: TABLE_ID, page: 0, top: 139.58,
        bottom: 757.42, maxGrowth: 31.46, reviewStatus: 'approved' }
    ],

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      // ── 1–2. Identity ────────────────────────────────────────────────────
      cell('clientFullName', 'field.clientFullName', 149.90, {
        required: true,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 153.62, shiftFromTop: 153.62,
          rowHeight: 14.16, maxExtraRows: 1, maxFontSize: 9.5,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 510.94,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 10.44, ruleOffset: 14.16, ruleThickness: 0.48 }
        }
      }),
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
        ownership: { top: 465.67, bottom: 563.23,
          ruleTop: 465.43, ruleBottom: 562.99, lines: 2 },
        showWhen: { source: 'extra.extra-pdl-status', equals: PDL_SET }
      }),

      // ── 12. Degree of kinship to the person named above ──────────────────
      cell('kinshipDegree', 'extra.extra-kinship-degree', 587.59, {
        optional: true, multiline: true, maxLines: 3, lineHeight: 11.5, maxHeight: 35.0
      }),

      // ── 13. Bank details ─────────────────────────────────────────────────
      cell('bankName', 'extra.extra-bank-name', 650.26, {
        optional: true,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 653.26, shiftFromTop: 653.26,
          rowHeight: 13.44, maxExtraRows: 1, maxFontSize: 9.5,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 510.94,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 10.44, ruleOffset: 13.44, ruleThickness: 0.48 }
        }
      }),
      cell('bankAddress', 'extra.extra-bank-address', 663.70, {
        optional: true,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 666.70, shiftFromTop: 666.70,
          rowHeight: 13.44, maxExtraRows: 1, maxFontSize: 9.5,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 510.94,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 10.44, ruleOffset: 13.44, ruleThickness: 0.48 }
        }
      }),
      cell('bankInn', 'extra.extra-bank-inn', 677.14, { optional: true }),
      cell('bankBic', 'extra.extra-bank-bic', 690.58, { optional: true }),
      cell('bankCorrespondentAccount', 'extra.extra-bank-corr-account', 704.02, { optional: true }),
      cell('bankSettlementAccount', 'extra.extra-bank-account', 717.34, { optional: true }),
      cell('bankAdditional', 'extra.extra-bank-additional', 730.78, { optional: true }),

      // ── 14. Other information ────────────────────────────────────────────
      cell('otherInformation', 'extra.extra-other-information', 755.14, {
        optional: true, multiline: true, maxLines: 1,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 757.18, shiftFromTop: 757.18,
          rowHeight: 11.52, maxExtraRows: 1, maxFontSize: 10,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 510.94,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 9.24, ruleOffset: 11.52, ruleThickness: 0.48 }
        }
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

  finishOwnership();

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
