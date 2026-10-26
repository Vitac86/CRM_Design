// Field map — Приложение № 3 «Уведомление о признании лица квалифицированным
// инвестором» к Регламенту принятия решения о признании лица квалифицированным
// инвестором в ООО «Инвестика».
//
// Base template : assets/document-pdf-templates/qualification-notice.pdf
// Source Word   : Z:\6. Управление по работе с клиентами\Формы документов\
//                 для оцифровки\УВЕДОМЛЕНИЕ о признании лица
//                 квалифицированным инвестором.docx
// Source SHA-256: a097d95d38c3dfda980c86bd574037f4a4721e7abb33558470add6b3ab39cc6f
// PDF SHA-256   : 2a9fab02f5b05c69b1fafe73d6d8d7c46c11114a9acb17f0f7b581fb1e3f4494
// Pages         : 1 (A4, 595.32 × 841.92 pt; 0 AcroForm fields/widgets)
//
// This is «Приложение № 3» of the *qualification* regulation and has nothing to
// do with «ПРИЛОЖЕНИЕ 3 К РЕГЛАМЕНТУ» of the brokerage regulation
// (`account-opening-notice`). Matched by title and content, not by number.
//
// Issued for both individuals and legal entities: the recipient name and
// address come from the subject card either way.
//
// Left blank by design:
//   * the whole signature block at baseline 531.42 — "Должность
//     уполномоченного лица / подпись / ФИО ООО «Инвестика»" and М.П. are
//     completed by an Investica employee after printing;
//   * the register-entry date after «инвесторами». Measured against real glyph
//     boxes the gap is 10.86 pt — "29.07.2026" needs ~27 pt even at the 6 pt
//     floor — so the source reserves no usable space. Recorded as a defect
//     rather than overprinted onto the "(дата)" caption.

(function (global) {
  'use strict';

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 12;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller

  function text(id, source, left, baselineTop, width, options) {
    var o = options || {};
    return {
      id: id,
      source: source,
      page: 0,
      left: left,
      baselineTop: baselineTop,
      width: width,
      font: 'legalSerif',
      fontSize: o.fontSize || BODY,
      minFontSize: o.minFontSize != null ? o.minFontSize : MIN,
      align: o.align || 'left',
      required: !!o.required,
      optional: !!o.optional,
      multiline: !!o.multiline,
      maxLines: o.maxLines,
      // A printed cell of measured height. Dropping this made the
      // field unbounded, and a long value ran over the text below it.
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
      showWhen: o.showWhen,
      layoutMode: o.layoutMode,
      flowBlockId: o.flowBlockId,
      allowMultipleFlowReferences: o.allowMultipleFlowReferences
    };
  }

  function check(id, source, equals, left, baselineTop) {
    return {
      id: id,
      type: 'check',
      source: source,
      equals: equals,
      page: 0,
      left: left,
      baselineTop: baselineTop,
      glyphSize: 9.96,
      optional: true
    };
  }

  var TEMPLATE = {
    id: 'qualification-notice',
    title: 'Уведомление о признании лица квалифицированным инвестором',
    templateUrl: '../assets/document-pdf-templates/qualification-notice.pdf',
    outputFilename: 'uvedomlenie-o-priznanii-kvalinvestorom.pdf',
    expectedPages: 1,
    appliesTo: ['individual', 'company'],

    // One page, one budget. Content ends at 554.34 pt on an 841.92 pt page;
    // keeping the form's own 56.7 pt bottom margin still leaves 230.88 pt,
    // which is twenty of this form's rows. Nothing here is tight — the reason
    // an anchor was previously refused was the cut, not the room.
    pageLayout: {
      0: {
        fixedHeaderUntil: 0,
        bodyBottom: 554.34,
        fixedFooterFrom: null,
        shiftToTop: 830.0,
        bottomClearance: 56.7,
        compaction: [],
        anchors: [
          'qualification-notice-recipient',
          'qualification-notice-recognition',
          'qualification-notice-register-entry'
        ]
      }
    },

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf',
      legalSerifItalic: '../assets/fonts/pdf/LiberationSerif-Italic.ttf'
    },

    // Word emitted these ruled blanks as independent top-level path units, not
    // inside the balanced text blocks replaced below.  Exact path ordinals and
    // hashes keep their removal tied to the authoritative PDF bytes; this is
    // the path-level counterpart of sourceReplacement, not a coordinate
    // whiteout.  The instrument rule is selected only with the `other` branch,
    // when its mapped replacement can travel with all expansion above it.
    sourcePathSuppressions: [
      {
        id: 'qualification-notice-recognition-name-rule-upper',
        page: 0, pathOrdinal: 1, expectedPagePathCount: 11,
        expectedSha256: 'c89aacec0fd63a35aa2a8a22469d9f6fa53f78ecdd9c834639504a1eaa10bb05',
        expectedTemplateSha256: '2a9fab02f5b05c69b1fafe73d6d8d7c46c11114a9acb17f0f7b581fb1e3f4494',
        ownerBlockId: 'qualification-notice-recognition',
        reviewStatus: 'approved', fieldIds: ['clientName'],
        geometry: { left: 297.05, top: 293.09, right: 534.58, bottom: 293.33 }
      },
      {
        id: 'qualification-notice-recognition-name-rule-lower',
        page: 0, pathOrdinal: 2, expectedPagePathCount: 11,
        expectedSha256: '1e3fd1246c845224557a1f7bce494dcb8a5ba439461bf14337cbab78b4843e38',
        expectedTemplateSha256: '2a9fab02f5b05c69b1fafe73d6d8d7c46c11114a9acb17f0f7b581fb1e3f4494',
        ownerBlockId: 'qualification-notice-recognition',
        reviewStatus: 'approved', fieldIds: ['clientName'],
        geometry: { left: 297.05, top: 294.29, right: 534.58, bottom: 294.53 }
      },
      {
        id: 'qualification-notice-recognition-date-rule',
        page: 0, pathOrdinal: 3, expectedPagePathCount: 11,
        expectedSha256: '33b6ca5e2085753da8bc3a75a2f35be4d212f3b0a1e96474e82c5d5d95c014e5',
        expectedTemplateSha256: '2a9fab02f5b05c69b1fafe73d6d8d7c46c11114a9acb17f0f7b581fb1e3f4494',
        ownerBlockId: 'qualification-notice-recognition',
        reviewStatus: 'approved', fieldIds: ['recognitionDate'],
        geometry: { left: 99.264, top: 334.13, right: 240.884, bottom: 334.61 }
      },
      {
        id: 'qualification-notice-other-instruments-rule',
        page: 0, pathOrdinal: 4, expectedPagePathCount: 11,
        expectedSha256: 'b8f392fba3fb1b5c638c05511352d7b486f9b0403d3965b942ef157a5f4fdcbe',
        expectedTemplateSha256: '2a9fab02f5b05c69b1fafe73d6d8d7c46c11114a9acb17f0f7b581fb1e3f4494',
        ownerBlockId: 'qualification-notice-recognition',
        reviewStatus: 'approved', fieldIds: ['otherInstruments'],
        showWhen: { source: 'extra.extra-qualification-scope', equals: 'other' },
        geometry: { left: 135.86, top: 427.01, right: 500.97, bottom: 427.49 }
      },
      {
        id: 'qualification-notice-register-name-rule',
        page: 0, pathOrdinal: 5, expectedPagePathCount: 11,
        expectedSha256: 'd8a147e7282168bb4bac087a81a0626a97381933ad8e63e35bd7b79a9277a74f',
        expectedTemplateSha256: '2a9fab02f5b05c69b1fafe73d6d8d7c46c11114a9acb17f0f7b581fb1e3f4494',
        ownerBlockId: 'qualification-notice-register-entry',
        reviewStatus: 'approved',
        fieldIds: ['registerEntryPersonName', 'registerEntryOrgName'],
        geometry: { left: 229.01, top: 473.11, right: 322.154, bottom: 473.59 }
      },
      {
        id: 'qualification-notice-register-date-micro-rule',
        page: 0, pathOrdinal: 6, expectedPagePathCount: 11,
        expectedSha256: '64860ef28b9e84321a60d13385b4d8e4fb295b72a6e1ea13155ca6fa80668821',
        expectedTemplateSha256: '2a9fab02f5b05c69b1fafe73d6d8d7c46c11114a9acb17f0f7b581fb1e3f4494',
        ownerBlockId: 'qualification-notice-register-entry',
        reviewStatus: 'approved', fieldIds: [],
        geometry: { left: 308.81, top: 484.63, right: 314.354, bottom: 485.11 }
      },
      {
        id: 'qualification-notice-recognition-continuation-stroke',
        page: 0, pathOrdinal: 7, expectedPagePathCount: 11,
        expectedSha256: '59ef92586e64fe1b7a1d876022e27df6653588488a341ddddd56cbd44a76318e',
        expectedTemplateSha256: '2a9fab02f5b05c69b1fafe73d6d8d7c46c11114a9acb17f0f7b581fb1e3f4494',
        ownerBlockId: 'qualification-notice-recognition',
        reviewStatus: 'approved', fieldIds: ['clientName'],
        geometry: { left: 63.80, top: 311.90, right: 468.91, bottom: 311.90 }
      },
      {
        id: 'qualification-notice-recognition-continuation-fill',
        page: 0, pathOrdinal: 8, expectedPagePathCount: 11,
        expectedSha256: '8f3b7860da393e144a2db31574c0726784aeab9c4941f9c44ef1b3ffebfae788',
        expectedTemplateSha256: '2a9fab02f5b05c69b1fafe73d6d8d7c46c11114a9acb17f0f7b581fb1e3f4494',
        ownerBlockId: 'qualification-notice-recognition',
        reviewStatus: 'approved', fieldIds: ['clientName'],
        geometry: { left: 63.80, top: 311.03, right: 468.80, bottom: 311.51 }
      }
    ],

    wordFlowBlocks: [
      {
        id: 'qualification-notice-recipient',
        type: 'wordFlowBlock',
        page: 0,
        frame: {
          left: 120.00, baselineTop: 177.02, width: 413.60,
          initialLineCount: 2
        },
        font: 'legalSerif', fontSize: 9.96, minFontSize: 9.96,
        fontSizeLocked: true, lineHeight: 11.52,
        paragraphSpacingAfter: 11.88, alignment: 'left',
        // The source lays both labelled paragraphs in the 154.09 pt column at
        // the right edge.  A spacer can place only the first line there: every
        // wrapped line starts at the frame edge.  Paragraph indents own the
        // whole line box, so name and address continuations cannot escape to
        // the unrelated left margin.
        firstLineIndent: 259.51,
        hangingIndent: 259.51,
        semanticGroup: {
          id: 'qualification-notice-recipient-address',
          kind: 'recipient-block',
          reviewStatus: 'approved',
          bounds: { left: 379.51, right: 533.60 },
          name: {
            fieldId: 'recipientName', source: 'field.client-full-name',
            companyUmi: 'umi.company.origname', representation: 'full-name'
          },
          address: {
            fieldId: 'recipientAddress', source: 'umi.address.registration',
            representation: 'single-formatted-address', renderOnce: true
          }
        },
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 212.20, shiftFromTop: 212.20,
          rowHeight: 11.52, maxExtraRows: 10, lineStyle: 'none',
          moveTopLevelPaths: true,
          reviewStatus: 'approved'
        },
        sourceReplacement: {
          firstBlock: 47, lastBlock: 54,
          expectedBlockCount: 8, expectedPageBlockCount: 197,
          expectedSha256: '9278984594894804d710c1ee65321a27e8a7589070b18c080358ce0330b52fa3',
          expectedTemplateSha256: '2a9fab02f5b05c69b1fafe73d6d8d7c46c11114a9acb17f0f7b581fb1e3f4494',
          reviewStatus: 'approved'
        },
        sourceStaticText: 'Кому:_________________________ Адрес:________________________',
        runs: [
          {
            type: 'static', text: 'Кому:', keepWithNext: true,
            semanticRole: 'recipient-label'
          },
          {
            type: 'spacer', width: 3.50, keepWithNext: true,
            semanticRole: 'recipient-label-gap'
          },
          {
            type: 'fieldRef', fieldId: 'recipientName',
            semanticRole: 'recipient-full-name',
            decoration: {
              underline: true, minWidth: 124.90, thickness: 0.48, offset: 2.40
            }
          },
          { type: 'paragraphBreak' },
          {
            type: 'static', text: 'Адрес:', keepWithNext: true,
            semanticRole: 'address-label'
          },
          {
            type: 'spacer', width: 3.50, keepWithNext: true,
            semanticRole: 'address-label-gap'
          },
          {
            type: 'fieldRef', fieldId: 'recipientAddress',
            semanticRole: 'formatted-address',
            decoration: {
              underline: true, minWidth: 117.90, thickness: 0.48, offset: 2.40
            }
          }
        ]
      },
      {
        id: 'qualification-notice-recognition',
        type: 'wordFlowBlock',
        page: 0,
        frame: {
          left: 99.26, baselineTop: 292.49, width: 435.89,
          initialLineCount: 6
        },
        font: 'legalSerif', fontSize: 9.96, minFontSize: 9.96,
        fontSizeLocked: true, lineHeight: 11.52,
        alignment: 'left',
        semanticGroup: {
          id: 'qualification-notice-recognition-body',
          kind: 'organization-name-and-date',
          reviewStatus: 'approved',
          fullName: {
            fieldId: 'clientName', source: 'field.client-full-name',
            companyUmi: 'umi.company.origname', representation: 'full-name'
          },
          caption: { role: 'full-name-caption', keepWith: 'clientName' },
          date: {
            fieldId: 'recognitionDate', source: 'field.documentDateRu',
            rule: { left: 99.264, width: 141.62, thickness: 0.48, offset: 2.40 }
          },
          continuation: { role: 'recognition-clause', shiftWithBlock: true }
        },
        overflowStrategy: 'expand-layout',
        // Re-cut at a measured complete-operator boundary.
        //   python static-uikit/tools/qa/check_expansion_anchors.py --suggest
        // 367.00 fell inside a printed block. The continuation line is at
        // 350.09 + 1 x 11.52 = 361.61 and paints 352.74–363.76, so the cut
        // belongs at or above 352.74. Measured clean band 344.75–346.00;
        // midpoint, +/-0.62 pt of margin.
        expansion: {
          page: 0, insertionTop: 345.38, shiftFromTop: 345.38,
          rowHeight: 11.52, maxExtraRows: 4, lineStyle: 'none',
          moveTopLevelPaths: true,
          reviewStatus: 'approved'
        },
        sourceReplacement: {
          firstBlock: 70, lastBlock: 108,
          expectedBlockCount: 39, expectedPageBlockCount: 197,
          expectedSha256: '911bca3c3dbfba4b0eb3da118a939f0419c06cdf0a953ba122c6f7d54a284a3f',
          expectedTemplateSha256: '2a9fab02f5b05c69b1fafe73d6d8d7c46c11114a9acb17f0f7b581fb1e3f4494',
          reviewStatus: 'approved'
        },
        sourceStaticText: 'ООО «Инвестика» настоящим уведомляет, что ________ ' +
          '(Ф.И.О./ наименование организации) ________ признано ' +
          'квалифицированным инвестором в отношении следующих видов: (дата)',
        runs: [
          {
            type: 'static', text: 'ООО «Инвестика» настоящим уведомляет, что ',
            semanticRole: 'recognition-lead-in'
          },
          {
            type: 'fieldRef', fieldId: 'clientName',
            semanticRole: 'client-full-name',
            decoration: {
              // 233.80 is the measured remainder after the real lead-in and
              // its word space.  Rounding it to 234 made an ordinary short
              // name open a spurious continuation line by 0.11 pt.
              underline: true, minWidth: 233.80, thickness: 0.48, offset: 2.40
            }
          },
          { type: 'lineBreak' },
          { type: 'spacer', width: 237.05, keepWithNext: true },
          {
            type: 'static', text: '(Ф.И.О./ наименование организации)',
            font: 'legalSerifItalic', keepTogether: true,
            semanticRole: 'client-full-name-caption'
          },
          { type: 'lineBreak' },
          {
            type: 'fieldRef', fieldId: 'recognitionDate',
            keepTogether: true, keepWithNext: true,
            semanticRole: 'recognition-date',
            decoration: {
              underline: true, minWidth: 141.62, thickness: 0.48, offset: 2.40
            }
          },
          {
            type: 'static',
            text: ' признано квалифицированным инвестором в отношении следующих видов:',
            semanticRole: 'recognition-clause'
          },
          { type: 'lineBreak' },
          { type: 'spacer', width: 35.40 },
          { type: 'static', text: '(дата)', font: 'legalSerifItalic' }
        ]
      },
      {
        id: 'qualification-notice-register-entry',
        type: 'wordFlowBlock',
        page: 0,
        frame: {
          left: 99.26, baselineTop: 472.03, width: 435.89,
          initialLineCount: 2
        },
        font: 'legalSerif', fontSize: 9.96, minFontSize: 9.96,
        fontSizeLocked: true, lineHeight: 11.52,
        alignment: 'left',
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 484.95, shiftFromTop: 484.95,
          rowHeight: 11.52, maxExtraRows: 4, lineStyle: 'none',
          moveTopLevelPaths: true,
          reviewStatus: 'approved'
        },
        sourceReplacement: {
          firstBlock: 162, lastBlock: 186,
          expectedBlockCount: 25, expectedPageBlockCount: 197,
          expectedSha256: '37bf1e68072ba1f496388cb777af3ada8924357076977a861a9dd2157dd6726f',
          expectedTemplateSha256: '2a9fab02f5b05c69b1fafe73d6d8d7c46c11114a9acb17f0f7b581fb1e3f4494',
          reviewStatus: 'approved'
        },
        sourceStaticText: 'Дата внесения записи о ________ ' +
          '(Ф.И.О./ наименование организации) в реестр лиц, признанных ' +
          'квалифицированными инвесторами (дата).',
        runs: [
          { type: 'static', text: 'Дата внесения записи о ' },
          {
            type: 'fieldRef', fieldId: 'registerEntryPersonName',
            decoration: {
              underline: true, minWidth: 89.00, thickness: 0.48, offset: 2.40
            }
          },
          {
            type: 'fieldRef', fieldId: 'registerEntryOrgName',
            decoration: {
              underline: true, minWidth: 89.00, thickness: 0.48, offset: 2.40
            }
          },
          {
            type: 'static',
            text: ' (Ф.И.О./ наименование организации) в реестр лиц, признанных квалифицированными инвесторами (дата).'
          }
        ]
      }
    ],

    fields: [
      // "Кому:____" / "Адрес:____" — underscore runs measured at 403.5 +124.9
      // and 407.7 +117.9. The address rule is short, so it may wrap onto a
      // second line, which reads naturally for an address block.
      // No `initials` fallback here: this slot holds a legal entity as often as
      // a person, and "АО «Восток Майнинг Системс»" initials-ised becomes the
      // nonsense "АО «.М.С.". Shrink-to-fit handles the width instead.
      // «Кому:______» — the printed blank ends at 533.6, leaving 124.9 pt after
      // the label. A full legal company name needs a continuation row, which
      // the header block has room for: «Адрес:» and everything below it move
      // down together.
      text('recipientName', 'field.client-full-name', 403.5, 177.02, 124.9, {
        required: true,
        label: 'Получатель уведомления',
        layoutMode: 'flow-reference',
        flowBlockId: 'qualification-notice-recipient'
      }),
      // 36.97 pt of clear space below the baseline before the title block, so
      // this 117.9 pt rule holds four lines at the floor — enough for a full
      // foreign postal address without touching the page.
      text('recipientAddress', 'umi.address.registration', 407.7, 200.42, 117.9, {
        required: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 34.0,
        layoutMode: 'flow-reference', flowBlockId: 'qualification-notice-recipient'
      }),

      // "ООО «Инвестика» настоящим уведомляет, что ______" — the printed text
      // ends at 299.54 and the rule runs 297.05 +237.53.
      // «ООО «Инвестика» настоящим уведомляет, что ____» — the printed lead-in
      // ends at 299.5 and the blank runs to the right margin, 234 pt. A full
      // legal company name does not fit that at a readable size.
      //
      // The line below it is only the caption «(Ф.И.О./наименование
      // организации)», and the page has 287 pt of unused space at the foot, so
      // the document can simply grow a row the way it would have in Word: the
      // caption and everything under it move down and the name continues on a
      // real ruled line across the full text measure.
      text('clientName', 'field.client-full-name', 300.0, 292.49, 234.0, {
        required: true,
        label: 'Ф.И.О. / наименование организации',
        layoutMode: 'flow-reference',
        flowBlockId: 'qualification-notice-recognition'
      }),

      // The recognition date sits on the 141.62 pt rule captioned "(дата)".
      text('recognitionDate', 'field.documentDateRu', 99.264, 333.10, 141.62, {
        required: true, format: 'dateRu', align: 'center',
        layoutMode: 'flow-reference', flowBlockId: 'qualification-notice-recognition'
      }),

      // "иное ______" — free text, drawn only when that branch is chosen.
      // «иное ______» closes the list of instrument categories, and the printed
      // rule (135.86 → 500.97) is the last thing on it: the page is then blank
      // down to «Дата внесения записи о …» at 463.16, which is 35.67 pt of
      // paragraph spacing at this slot's own x range. One reviewed continuation
      // line takes 11 pt of it and still leaves 25 pt before the next
      // paragraph, so a real list of instruments is written out instead of
      // being cut back to «Акции». The rule matches the printed one's 0.48 pt
      // weight, and it is drawn only if the value actually reaches the line.
      text('otherInstruments', 'extra.extra-qualification-instruments-other',
           137.5, 425.93, 362.0, {
        optional: true,
        showWhen: { source: 'extra.extra-qualification-scope', equals: 'other' },
        overflowStrategy: 'flow',
        flowRegions: [
          {
            page: 0, left: 137.5, baselineTop: 425.93, width: 362.0,
            maxLines: 1, maxFontSize: 9.96,
            drawUnderline: true, underlineThickness: 0.48, underlineOffset: 2.40
          },
          {
            page: 0, left: 137.5, baselineTop: 437.45, width: 362.0,
            maxLines: 1, maxFontSize: 9.96,
            generated: true, reviewStatus: 'approved',
            drawUnderline: true, underlineThickness: 0.48, underlineOffset: 2.40
          },
          {
            page: 0, left: 137.5, baselineTop: 448.97, width: 362.0,
            maxLines: 1, maxFontSize: 9.96,
            generated: true, reviewStatus: 'approved',
            drawUnderline: true, underlineThickness: 0.48, underlineOffset: 2.40
          }
        ]
      }),

      // "Дата внесения записи о ______ (Ф.И.О./ наименование организации)" —
      // the printed label ends at 231.50 and "(Ф.И.О." resumes at 322.15, so
      // the slot is only 89 pt. Split by subject kind: a person may safely be
      // shortened to initials, a legal entity may not.
      text('registerEntryPersonName', 'field.client-full-name', 232.0, 472.03, 89.0, {
        required: true, format: 'initials', fallbacks: ['surname'],
        showWhen: { source: 'subject.kind', equals: 'individual' },
        layoutMode: 'flow-reference', flowBlockId: 'qualification-notice-register-entry'
      }),
      // An ordinary company name needs 107.78 pt at the 9 pt floor in an 89 pt
      // blank, so the legal-entity branch of this line always needed a row.
      //
      // The previous phase recorded this anchor as having no clean cut within
      // ±30 pt. That was measured with a shift band that ended at the page's
      // own content bottom, which cuts the trailing block in half and makes
      // every candidate straddle. Against the real movable band the cut at
      // 484.95 is clean and moves 13 complete blocks — it sits immediately
      // under the whole printed sentence «Дата внесения записи о ____
      // (Ф.И.О./ наименование организации) в реестр лиц, признанных
      // квалифицированными инвесторами ____ (дата).», so the continuation row
      // follows the complete legal sentence instead of splitting it.
      text('registerEntryOrgName', 'field.client-full-name', 232.0, 472.03, 89.0, {
        required: true,
        label: 'Наименование организации в записи реестра',
        showWhen: { source: 'subject.kind', equals: 'company' },
        layoutMode: 'flow-reference', flowBlockId: 'qualification-notice-register-entry'
      }),

      // Mutually exclusive scope marks (Wingdings boxes in the base template).
      check('scopeAllTypes', 'extra.extra-qualification-scope', 'all', 99.26, 397.01),
      check('scopeOther', 'extra.extra-qualification-scope', 'other', 99.26, 425.93)
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
