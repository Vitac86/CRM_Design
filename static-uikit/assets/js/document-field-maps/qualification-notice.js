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
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 212.20, shiftFromTop: 212.20,
          rowHeight: 11.52, maxExtraRows: 6, lineStyle: 'none',
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
          { type: 'spacer', width: 259.51 },
          { type: 'static', text: 'Кому:', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'recipientName',
            decoration: {
              underline: true, minWidth: 124.90, thickness: 0.48, offset: 1.20
            }
          },
          { type: 'paragraphBreak' },
          { type: 'spacer', width: 259.51 },
          { type: 'static', text: 'Адрес:', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'recipientAddress',
            decoration: {
              underline: true, minWidth: 117.90, thickness: 0.48, offset: 1.20
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
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 367.00, shiftFromTop: 367.00,
          rowHeight: 11.52, maxExtraRows: 4, lineStyle: 'none',
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
          { type: 'static', text: 'ООО «Инвестика» настоящим уведомляет, что ' },
          {
            type: 'fieldRef', fieldId: 'clientName',
            decoration: {
              underline: true, minWidth: 234.00, thickness: 0.48, offset: 1.20
            }
          },
          { type: 'lineBreak' },
          { type: 'spacer', width: 237.05 },
          {
            type: 'static', text: '(Ф.И.О./ наименование организации)',
            font: 'legalSerifItalic'
          },
          { type: 'lineBreak' },
          {
            type: 'fieldRef', fieldId: 'recognitionDate', keepTogether: true,
            decoration: {
              underline: true, minWidth: 138.00, thickness: 0.48, offset: 1.20
            }
          },
          {
            type: 'static',
            text: ' признано квалифицированным инвестором в отношении следующих видов:'
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
              underline: true, minWidth: 89.00, thickness: 0.48, offset: 1.08
            }
          },
          {
            type: 'fieldRef', fieldId: 'registerEntryOrgName',
            decoration: {
              underline: true, minWidth: 89.00, thickness: 0.48, offset: 1.08
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
      text('recipientAddress', 'field.client-postal-address', 407.7, 200.42, 117.9, {
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
      text('recognitionDate', 'field.documentDateRu', 101.0, 333.10, 138.0, {
        required: true, format: 'dateRu', align: 'center',
        layoutMode: 'flow-reference', flowBlockId: 'qualification-notice-recognition'
      }),

      // "иное ______" — free text, drawn only when that branch is chosen.
      text('otherInstruments', 'extra.extra-qualification-instruments-other',
           137.5, 425.93, 362.0, {
        optional: true,
        showWhen: { source: 'extra.extra-qualification-scope', equals: 'other' }
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
