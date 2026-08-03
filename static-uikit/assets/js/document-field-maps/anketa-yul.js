// Field map — Приложение 17. АНКЕТА ЮРИДИЧЕСКОГО ЛИЦА
//
// Base template : assets/document-pdf-templates/anketa-yul.pdf
// Source Word   : Z:\6. Управление по работе с клиентами\Формы документов\
//                 для оцифровки\Анкета ЮЛ.docx
// Source SHA-256: d2965a0e87a8d52491dd2edfe08a2c129b41212c307b7b19614ba70bc951d1f4
// Pages         : 5 (A4, 595.32 × 841.92 pt; 0 AcroForm fields/widgets)
//
// Coordinates are measured from the clean Word-exported PDF's glyphs and
// table vectors. Values use the local Liberation Serif font at the source
// form's 9.5 pt body size, with bounded wrapping and a readable 6 pt floor.
//
// The page 5 "Для служебных отметок" block is employee-only and remains blank.

(function (global) {
  'use strict';

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 11;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller
  var VALUE_LEFT = 331.5;
  var VALUE_WIDTH = 222.9;

  var TABLE_COLUMNS = [63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62];
  var CELL_OWNERSHIP = [];
  var OWNERSHIP_EXEMPTIONS = [];

  function tableId(page) {
    return 'anketa-yul-p' + (page + 1) + '-main';
  }

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
      budgetId: o.budgetId || id, reviewStatus: 'approved', inkInset: 0,
      sourceRepeatGroup: o.sourceRepeatGroup || null,
      sourceRepeatReason: o.sourceRepeatReason || null
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
    financialGoalOtherDetails: 11.5, // 11.98 pt of room
    foreignTaxIdentifier: 12,        // 49.18 pt of room
    fullLegalName: 10.5,             // 10.75 pt of room
    fundsOtherDetails: 12,           // 12.92 pt of room
    purposeOtherDetails: 11.5,       // 11.98 pt of room
    questionnaireDate: 12,           // 24.13 pt of room
    reputationOtherDetails: 12,      // 20.27 pt of room
    signatoryPosition: 12,           // 22.21 pt of room
    taxResidenceCountry: 12,         // 25.59 pt of room
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

  // A value cell is a printed box of a measured height, not a single rule, so
  // every cell may use as many lines as its own box holds at the chosen size.
  // Wrapping inside the cell is what the form was designed for and is always
  // preferable to shrinking: a long address or issuing authority now runs onto
  // the second line of its own row instead of being squeezed.
  function cell(id, source, page, top, bottom, options) {
    var o = options || {};
    o.multiline = o.multiline !== false;
    o.maxHeight = o.maxHeight || (bottom - top - 2.0);
    o.lineHeightRatio = o.lineHeightRatio || 0.95;
    o.ownership = {
      top: o.ownershipTop != null ? o.ownershipTop : top,
      bottom: o.ownershipBottom != null ? o.ownershipBottom : bottom,
      ruleTop: o.ownershipRuleTop != null ? o.ownershipRuleTop
        : Math.round((top - 0.24) * 100) / 100,
      ruleBottom: o.ownershipRuleBottom != null ? o.ownershipRuleBottom
        : Math.round((bottom - 0.24) * 100) / 100,
      lines: o.maxLines || Math.max(1,
        Math.floor((bottom - top - 2.0) / (MIN * o.lineHeightRatio))) };
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
    exempt(f, 'reviewed source checkbox glyph; no text cell is drawn');
    return f;
  }

  var TEMPLATE = {
    id: 'anketa-yul',
    title: 'Анкета юридического лица',
    templateUrl: '../assets/document-pdf-templates/anketa-yul.pdf',
    outputFilename: 'anketa-yul.pdf',
    expectedPages: 5,
    appliesTo: ['company'],

    tableOwnershipRequired: true,
    cellOwnership: CELL_OWNERSHIP,
    ownershipExemptions: OWNERSHIP_EXEMPTIONS,
    tableBudgets: [
      { id: tableId(0), tableId: tableId(0), page: 0, top: 182.54,
        bottom: 780.10, maxGrowth: 33.82, reviewStatus: 'approved' },
      { id: tableId(1), tableId: tableId(1), page: 1, top: 56.88,
        bottom: 769.54, maxGrowth: 0, reviewStatus: 'approved' },
      { id: tableId(2), tableId: tableId(2), page: 2, top: 56.88,
        bottom: 767.02, maxGrowth: 44.90, reviewStatus: 'approved' },
      { id: tableId(3), tableId: tableId(3), page: 3, top: 56.88,
        bottom: 781.06, maxGrowth: 0, reviewStatus: 'approved' },
      { id: tableId(4), tableId: tableId(4), page: 4, top: 56.88,
        bottom: 198.98, maxGrowth: 0, reviewStatus: 'approved' }
    ],

    pageLayout: {
      // Page 1 is one continuous table from 182 pt to its last rule at 780.10,
      // and its own bottom margin is 61.82 pt.  Keeping a reviewed 28 pt print
      // margin leaves 33.82 pt: either one 19.92 pt registration continuation,
      // or that continuation together with foreignName's 13.44 pt row.
      0: {
        fixedHeaderUntil: 0,
        bodyBottom: 780.10,
        fixedFooterFrom: null,
        shiftToTop: 800.0,
        bottomClearance: 28.0,
        compaction: [],
        anchors: ['foreignName', 'stateRegistrationAuthority',
          'pre2002RegistrationDocument', 'pre2002RegistrationAuthority']
      },
      2: {
        fixedHeaderUntil: 0,
        bodyBottom: 767.02,
        fixedFooterFrom: null,
        shiftToTop: 838.0,
        bottomClearance: 30.0,
        compaction: [],
        anchors: ['licenceAuthority', 'bankAddress']
      }
    },

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      // Header — organisation's role and completion mode.
      check('roleClient', 'check.anketa-role-client', true, 0, 102.9, 126.02),
      check('roleRepresentative', 'check.anketa-role-representative', true, 0, 182.4, 126.02),
      check('roleBeneficiary', 'check.anketa-role-beneficiary', true, 0, 292.9, 126.02),
      check('modeFirst', 'check.anketa-mode-first', true, 0, 151.8, 148.10),
      check('modeChange', 'check.anketa-mode-change', true, 0, 281.8, 148.10),

      // Page 1 — names, tax and state registration, principal addresses.
      cell('fullLegalName', 'field.client-full-legal-name', 0, 182.54, 196.46, {
        required: true, ownershipTop: 183.02, ownershipRuleTop: 182.78
      }),
      cell('shortName', 'field.client-short-name', 0, 196.46, 209.90, { required: true }),
      // Row 3 is already a double-height row (rules 209.66 → 234.02, 24.36 pt)
      // and holds two lines of 11 pt. A real foreign legal name does not fit
      // them: «Interregional Investment, Industrial and Infrastructure Company
      // for Technological Development, Joint-Stock Company» is 431.38 pt of
      // text at the 9 pt floor and wraps to three lines in this 222.9 pt cell.
      // Three lines need 31.35 pt of cell, and no font at or above the floor
      // makes three lines fit 22.36 pt — so the answer cannot be a bigger
      // `maxHeight`, which would only reach into row 4.
      //
      // The анкета is a table, so the Word-like answer is a real inserted row:
      // the rows below move down by one 13.44 pt pitch, the printed bottom rule
      // travels with them to close the grown cell, and the row's seven vertical
      // centre-lines are continued exactly where the printed ones stop.
      // 234.02 is the clean cut — the verticals of row 3 end there and its
      // bottom rule sits just under them.
      cell('foreignName', 'field.client-english-name', 0, 209.90, 234.26, {
        optional: true,
        multiline: true,
        maxLines: 2,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 234.02, shiftFromTop: 234.02,
          rowHeight: 13.44, maxExtraRows: 1, maxFontSize: 11,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: [63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62],
          line: {
            left: VALUE_LEFT, width: VALUE_WIDTH,
            // The grown row is a full 13.44 pt source pitch tall, but the name
            // inside it is the third line of one sentence and keeps the cell's
            // own 0.95 leading. Placed at the row's pitch it sat 4.31 pt low
            // and the last line read as a second, unrelated entry.
            continuesParagraph: true,
            baselineOffset: 10.44, ruleThickness: 0.48
          }
        }
      }),
      cell('legalForm', 'field.client-legal-form', 0, 234.26, 247.70, { required: true }),

      text('residentInn', 'field.client-inn', 0, VALUE_LEFT, 271.44, VALUE_WIDTH, {
        required: true,
        showWhen: { source: 'check.tax-resident-rf-yes', equals: true }
      }),
      text('foreignTaxIdentifier', 'extra.foreign-tax-identifier', 0, VALUE_LEFT, 305.20, VALUE_WIDTH, {
        optional: true,
        showWhen: { source: 'check.tax-resident-rf-no', equals: true }
      }),
      cell('taxRegistrationDate', 'extra.tax-registration-date', 0, 327.17, 340.61, {
        optional: true,
        align: 'center',
        format: 'dateRu'
      }),
      cell('kpp', 'field.client-kpp', 0, 340.61, 357.65, { required: true, align: 'center' }),

      cell('ogrn', 'field.client-ogrn', 0, 372.41, 403.73, { required: true, align: 'center' }),
      cell('foreignRegistrationNumber', 'extra.foreign-registration-number', 0, 403.73, 435.05, {
        optional: true,
        multiline: true,
        maxLines: 2
      }),
      cell('foreignBranchAccreditationNumber', 'extra.foreign-branch-accreditation-number', 0, 435.05, 479.35, {
        optional: true,
        multiline: true,
        maxLines: 3
      }),
      cell('stateRegistrationDate', 'field.client-registration-date', 0, 479.35, 501.67, {
        required: true,
        align: 'center',
        format: 'dateRu'
      }),
      cell('stateRegistrationPlace', 'field.client-legal-address', 0, 501.67, 534.91, {
        required: true,
        multiline: true,
        maxLines: 3,
        ownershipOptions: {
          sourceRepeatGroup: 'legal-address-required-rows',
          sourceRepeatReason: 'the source form separately asks for registration place and the full EGRUL legal address'
        }
      }),
      cell('stateRegistrationAuthority', 'field.client-registration-authority', 0, 534.91, 554.83, {
        required: true,
        multiline: true,
        maxLines: 1,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 554.59, shiftFromTop: 554.59,
          rowHeight: 19.92, maxExtraRows: 1, maxFontSize: 9.5,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 10.54, ruleOffset: 19.92, ruleThickness: 0.48 }
        }
      }),
      cell('pre2002RegistrationDocument', 'extra.pre2002-registration-document', 0, 574.27, 594.31, {
        optional: true,
        multiline: true,
        maxLines: 1,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 594.07, shiftFromTop: 594.07,
          rowHeight: 19.92, maxExtraRows: 1, maxFontSize: 9.5,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 10.54, ruleOffset: 19.92, ruleThickness: 0.48 }
        }
      }),
      cell('pre2002RegistrationNumber', 'extra.pre2002-registration-number', 0, 594.31, 614.23, { optional: true }),
      cell('pre2002RegistrationDate', 'extra.pre2002-registration-date', 0, 614.23, 634.18, {
        optional: true,
        align: 'center',
        format: 'dateRu'
      }),
      cell('pre2002RegistrationAuthority', 'extra.pre2002-registration-authority', 0, 634.18, 654.10, {
        optional: true,
        multiline: true,
        maxLines: 1,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 653.86, shiftFromTop: 653.86,
          rowHeight: 19.92, maxExtraRows: 1, maxFontSize: 9.5,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: TABLE_COLUMNS.slice(),
          line: { left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 10.54, ruleOffset: 19.92, ruleThickness: 0.48 }
        }
      }),

      cell('egrulAddress', 'field.client-legal-address', 0, 669.10, 713.38, {
        required: true,
        multiline: true,
        maxLines: 4,
        ownershipOptions: {
          sourceRepeatGroup: 'legal-address-required-rows',
          sourceRepeatReason: 'the source form separately asks for registration place and the full EGRUL legal address'
        }
      }),
      cell('executiveBodyAddress', 'extra.executive-body-address', 0, 713.38, 757.54, {
        optional: true,
        multiline: true,
        maxLines: 4
      }),
      // The postal-address row crosses the page break. Use its continuation on
      // page 2 so a two-line address can fit without clipping.
      cell('postalAddress', 'field.client-postal-address', 1, 56.88, 79.32, {
        optional: true,
        multiline: true,
        maxLines: 2
      }),

      // Page 2 — non-resident address, declarations and company data.
      cell('nonresidentRepresentationAddress', 'extra.nonresident-representation-address', 1, 114.62, 147.86, {
        optional: true,
        multiline: true,
        maxLines: 3
      }),
      cell('nonresidentRepresentativeResidence', 'extra.nonresident-representative-residence', 1, 147.86, 202.94, {
        optional: true,
        multiline: true,
        maxLines: 5
      }),

      check('taxResidentRussia', 'check.tax-resident-rf-yes', true, 1, 331.5, 226.70),
      check('taxResidentOther', 'check.tax-resident-rf-no', true, 1, 331.5, 239.42),
      text('taxResidenceCountry', 'extra.tax-residency-countries', 1, 347.0, 239.42, 207.4, {
        optional: true,
        showWhen: { source: 'check.tax-resident-rf-no', equals: true }
      }),
      check('foreignTaxpayerYes', 'check.fatca-yes', true, 1, 331.5, 258.14),
      check('foreignTaxpayerNo', 'check.fatca-no', true, 1, 331.5, 282.17),
      check('strategicCompanyYes', 'check.strategic-company-yes', true, 1, 331.5, 306.41),
      check('strategicCompanyNo', 'check.strategic-company-no', true, 1, 331.5, 341.81),

      cell('mobilePhone', 'subject.phone', 1, 375.53, 388.97, { required: true }),
      cell('landlinePhone', 'extra.landline-phone', 1, 388.97, 402.29, { optional: true }),
      cell('email', 'subject.email', 1, 402.29, 420.29, { required: true }),
      cell('website', 'field.client-website', 1, 420.29, 457.63, {
        optional: true,
        multiline: true,
        maxLines: 3
      }),
      cell('okpo', 'extra.extra-okpo', 1, 457.63, 497.83, { optional: true, align: 'center' }),
      cell('okved', 'extra.extra-okved', 1, 497.83, 540.07, {
        optional: true,
        multiline: true,
        maxLines: 4
      }),
      cell('creditOrganisationBic', 'extra.credit-organisation-bic', 1, 540.07, 568.63, {
        optional: true,
        align: 'center'
      }),
      cell('charterCapital', 'field.client-charter-capital', 1, 568.63, 597.31, {
        required: true,
        align: 'center'
      }),

      // Rows 19–20 have labelled two-column subheaders followed by one blank
      // data row. These coordinates use that actual blank row.
      text('managementStructure', 'extra.extra-management-structure', 1, 90.5, 654.32, 230.0, {
        optional: true,
        ownership: { top: 644.02, bottom: 661.78,
          ruleTop: 643.78, ruleBottom: 661.54, lines: 1 },
        ownershipOptions: { left: 85.58, right: 326.11,
          vertical: [63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62] }
      }),
      text('managementComposition', 'extra.management-composition', 1, 331.5, 654.32, 222.9, {
        optional: true,
        ownership: { top: 644.02, bottom: 661.78,
          ruleTop: 643.78, ruleBottom: 661.54, lines: 1 }
      }),
      text('shareholdersNamesInn', 'extra.shareholders-names-inn', 1, 90.5, 708.44, 230.0, {
        optional: true,
        ownership: { top: 698.14, bottom: 714.10,
          ruleTop: 697.90, ruleBottom: 713.86, lines: 1 },
        ownershipOptions: { left: 85.58, right: 326.11,
          vertical: [63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62] }
      }),
      text('shareholdersPercentages', 'extra.shareholders-percentages', 1, 331.5, 708.44, 222.9, {
        optional: true,
        ownership: { top: 698.14, bottom: 714.10,
          ruleTop: 697.90, ruleBottom: 713.86, lines: 1 }
      }),

      // Row 21's value row continues at the top of page 3.
      cell('controllingPersons', 'extra.extra-controlling-persons', 2, 56.88, 78.36, {
        optional: true,
        multiline: true,
        maxLines: 2
      }),

      // Page 3 — licences, banking, executive body and related persons.
      check('licensedActivityNo', 'check.licensed-activity-no', true, 2, 331.5, 125.54),
      check('licensedActivityYes', 'check.licensed-activity-yes', true, 2, 331.5, 138.14),
      cell('licenceNumber', 'extra.licence-number', 2, 141.98, 159.38, { optional: true }),
      cell('licenceIssueDate', 'extra.licence-issue-date', 2, 159.38, 176.78, {
        optional: true,
        align: 'center',
        format: 'dateRu'
      }),
      // Licence authority is a value cell in the ruled questionnaire table.
      // The source pitch is 17.40 pt (border tops 176.54 -> 193.94); the
      // continuation extends the seven measured vertical centre-lines while
      // the existing 0.48 pt bottom border moves down to close the cell.
      cell('licenceAuthority', 'extra.licence-authority', 2, 176.78, 194.18, {
        optional: true,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 2, insertionTop: 193.94, shiftFromTop: 193.94,
          rowHeight: 17.4, maxExtraRows: 1, maxFontSize: 11,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: [63.74, 64.70, 84.62, 85.58, 326.11, 559.66, 560.62],
          line: {
            left: VALUE_LEFT, width: VALUE_WIDTH,
            baselineOffset: 10.54, ruleOffset: 17.4, ruleThickness: 0.48
          }
        }
      }),
      cell('licenceExpiry', 'extra.licence-expiry', 2, 194.18, 211.70, { optional: true }),
      cell('licensedActivities', 'extra.licensed-activities', 2, 211.70, 229.10, { optional: true }),

      cell('bankName', 'extra.bank-name', 2, 254.42, 271.85, { optional: true }),
      cell('bankAddress', 'extra.bank-address', 2, 271.85, 289.25, {
        // A long foreign bank address does not fit this 222.9 pt cell at a
        // readable size. The анкета is a table, so the Word-like answer is a
        // real blank row: the rows below move down and the cell is extended
        // with the same 17.40 pt pitch, seven vertical centre-lines and 0.48 pt
        // rule weight as the source row (border tops 271.61 -> 289.01; value
        // boundary 326.11; outer rule centres 63.74/560.62).
        overflowStrategy: 'expand-layout',
        expansion: {
          // 289.01 is the clean cut here: the row's own vertical rules end
          // at 289.01 and its bottom border sits just under them, so inserting
          // above the border lets that border travel down and close the new
          // row. The inserted row therefore needs only its verticals — they
          // continue exactly where the printed ones stop, which is what a row
          // inserted in Word looks like.
          page: 2, insertionTop: 289.01,
          rowHeight: 17.40, maxExtraRows: 2,
          shiftFromTop: 289.01,
          lineStyle: 'table-row', reviewStatus: 'approved',
          rowLeft: 63.74, rowWidth: 496.88,
          borders: { left: false, right: false, top: false, bottom: false },
          columns: [63.74, 64.7, 84.62, 85.58, 326.11, 559.66, 560.62],
          line: {
            left: 331.5, width: 222.9,
            baselineOffset: 10.54, ruleOffset: 17.40, ruleThickness: 0.48
          }
        }, optional: true }),
      cell('bankInn', 'extra.bank-inn', 2, 289.25, 306.77, { optional: true }),
      cell('bankBicSwift', 'extra.bank-bic-swift', 2, 306.77, 324.17, { optional: true }),
      cell('bankCorrespondentAccount', 'extra.bank-correspondent-account', 2, 324.17, 341.57, { optional: true }),
      cell('bankSettlementAccount', 'extra.bank-settlement-account', 2, 341.57, 358.97, { optional: true }),
      cell('correspondentBankDetails', 'extra.correspondent-bank-details', 2, 358.97, 398.21, {
        optional: true,
        multiline: true,
        maxLines: 3
      }),

      cell('executiveName', 'field.client-rep-full-name', 2, 444.43, 461.95, { required: true }),
      cell('executivePosition', 'field.client-rep-position', 2, 461.95, 479.35, { required: true }),
      cell('executiveAuthority', 'field.client-rep-authority', 2, 479.35, 534.43, {
        required: true,
        multiline: true,
        maxLines: 5
      }),
      cell('representativeName', 'extra.representative-name', 2, 647.26, 660.10, { optional: true }),
      cell('representativeAuthorityDetails', 'extra.representative-authority-details', 2, 660.10, 693.34, {
        optional: true,
        multiline: true,
        maxLines: 3
      }),
      cell('beneficiaryName', 'extra.beneficiary-name', 2, 750.46, 766.78, { optional: true }),
      cell('beneficiaryBasisDetails', 'extra.beneficiary-basis-details', 3, 56.88, 79.32, {
        optional: true,
        multiline: true,
        maxLines: 2
      }),

      // Page 4 — beneficial owners, purposes and AML/FATCA declarations.
      cell('beneficialOwnerName', 'extra.beneficial-owner-name', 3, 136.46, 149.90, { optional: true }),
      cell('beneficialOwnerBasis', 'extra.beneficial-owner-basis', 3, 149.90, 174.26, {
        optional: true,
        multiline: true,
        maxLines: 2
      }),

      check('purposeBrokerage', 'extra.extra-business-purpose', 'Брокерское обслуживание', 3, 331.5, 184.58),
      check('purposeTrustManagement', 'extra.extra-business-purpose', 'Доверительное управление', 3, 331.5, 197.30),
      check('purposeConversion', 'extra.extra-business-purpose', 'Конверсионные операции', 3, 331.5, 209.90),
      check('purposeOther', 'extra.extra-business-purpose', 'Иное', 3, 331.5, 222.62),
      text('purposeOtherDetails', 'extra.business-purpose-other', 3, 412.0, 222.62, 142.4, {
        optional: true,
        showWhen: { source: 'extra.extra-business-purpose', equals: 'Иное' }
      }),

      check('financialGoalIncome', 'extra.extra-financial-goal', 'Получение инвестиционного дохода', 3, 331.5, 248.66),
      check('financialGoalPreservation', 'extra.extra-financial-goal', 'Сохранение активов', 3, 331.5, 261.38),
      check('financialGoalRiskControl', 'extra.extra-financial-goal', 'Контроль рисков', 3, 331.5, 274.01),
      check('financialGoalOther', 'extra.extra-financial-goal', 'Иное', 3, 331.5, 286.73),
      text('financialGoalOtherDetails', 'extra.financial-goal-other', 3, 412.0, 286.73, 142.4, {
        optional: true,
        showWhen: { source: 'extra.extra-financial-goal', equals: 'Иное' }
      }),

      check('financialDocsAnnualAccounts', 'check.financial-docs-annual-accounts', true, 3, 331.5, 313.97, true),
      check('financialDocsAuditReport', 'check.financial-docs-audit-report', true, 3, 333.9, 348.41, true),
      check('reputationClientReviews', 'check.reputation-client-reviews', true, 3, 331.5, 438.05, true),
      check('reputationFinancialReviews', 'check.reputation-financial-reviews', true, 3, 331.5, 483.43, true),
      check('reputationOther', 'check.reputation-other', true, 3, 331.5, 550.27, true),
      text('reputationOtherDetails', 'extra.reputation-other-details', 3, 90.5, 435.0, 230.0, {
        optional: true,
        multiline: true,
        maxLines: 10,
        maxHeight: 120.0,
        lineHeight: 10.8,
        ownership: { top: 405.65, bottom: 564.55,
          ruleTop: 405.41, ruleBottom: 564.31, lines: 10 },
        ownershipOptions: { left: 85.58, right: 326.11,
          vertical: TABLE_COLUMNS.slice() },
        showWhen: { source: 'check.reputation-other', equals: true }
      }),

      // "Собственные средства" is already marked ☒ in the authoritative
      // source. Preserve it; only the two genuinely empty boxes are overlaid.
      check('fundsBorrowed', 'check.funds-borrowed', true, 3, 331.5, 589.51),
      check('fundsOther', 'check.funds-other', true, 3, 331.5, 603.07, true),
      // «Иное (указать)» is free text and the source gives it 142.4 pt after
      // its own printed label — about 41 characters at the floor, where a
      // plain answer such as «Доход от предпринимательской деятельности и
      // инвестиционных операций» is 289.01 pt.
      //
      // The 18.38 pt below the label line, from 605.12 to the cell's bottom
      // rule at 623.50, is inside the SAME «источник происхождения средств»
      // cell — it is the rest of the answer's own box, not another field and
      // not another row. One reviewed continuation line therefore sits there,
      // starting at the cell's left edge rather than after the label, so the
      // answer continues with the cell's full 222.9 pt. Together the two lines
      // hold 365.3 pt of text at the floor. Nothing moves and no row grows.
      text('fundsOtherDetails', 'extra.source-of-funds-other', 3, 412.0, 603.07, 142.4, {
        optional: true,
        ownership: { top: 564.55, bottom: 623.74,
          ruleTop: 564.31, ruleBottom: 623.50, lines: 2 },
        showWhen: { source: 'check.funds-other', equals: true },
        overflowStrategy: 'flow',
        flowRegions: [
          { page: 3, left: 412.0, baselineTop: 603.07, width: 142.4, maxLines: 1 },
          {
            page: 3, left: VALUE_LEFT, baselineTop: 613.20, width: VALUE_WIDTH,
            maxLines: 1, maxFontSize: 9.5,
            generated: true, reviewStatus: 'approved'
          }
        ]
      }),

      check('foreignTrustOwnerYes', 'extra.foreign-trust-owner-status', 'yes', 3, 331.5, 634.06, true),
      check('foreignTrustOwnerNo', 'extra.foreign-trust-owner-status', 'no', 3, 331.5, 646.78, true),
      check('foreignTrustProtectorYes', 'extra.foreign-trust-protector-status', 'yes', 3, 331.5, 671.38, true),
      check('foreignTrustProtectorNo', 'extra.foreign-trust-protector-status', 'no', 3, 331.5, 684.10, true),

      check('usTaxResidence', 'check.fatca-us-tax-residence', true, 3, 331.5, 701.50, true),
      check('usRegistrationAddress', 'check.fatca-us-registration-address', true, 3, 333.9, 726.58, true),
      check('usBeneficialOwners', 'check.fatca-us-beneficial-owners', true, 3, 333.9, 751.78, true),
      check('usPhone', 'check.fatca-us-phone', true, 4, 331.5, 78.60, true),
      check('usSignatory', 'check.fatca-us-signatory', true, 4, 331.5, 103.82, true),
      check('usPaymentInstructions', 'check.fatca-us-payment-instructions', true, 4, 333.9, 154.94, true),

      cell('otherInformation', 'extra.extra-other-info', 4, 168.98, 187.46, {
        optional: true,
        multiline: true,
        maxLines: 2,
        ownershipTop: 169.22,
        ownershipRuleTop: 168.98
      }),

      // Page 5 footer: date and position are typed; the middle rule remains
      // blank for the handwritten signature. "Фамилия И.О." is printed source
      // guidance, not a blank that may be covered.
      text('questionnaireDate', 'field.documentDateRu', 4, 171.0, 264.77, 113.9, {
        required: true,
        align: 'center',
        format: 'dateRu'
      }),
      text('signatoryPosition', 'field.client-rep-position', 4, 58.1, 286.61, 133.0, {
        required: true,
        align: 'center'
      })

      // Page 5 employee-only block: no overlays.
    ]
  };

  finishOwnership();

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
