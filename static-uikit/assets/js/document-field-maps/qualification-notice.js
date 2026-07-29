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

  var BODY = 9.96;
  var MIN = 6.0;

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
      lineHeight: o.lineHeight,
      format: o.format,
      fallbacks: o.fallbacks,
      showWhen: o.showWhen
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

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      // "Кому:____" / "Адрес:____" — underscore runs measured at 403.5 +124.9
      // and 407.7 +117.9. The address rule is short, so it may wrap onto a
      // second line, which reads naturally for an address block.
      // No `initials` fallback here: this slot holds a legal entity as often as
      // a person, and "АО «Восток Майнинг Системс»" initials-ised becomes the
      // nonsense "АО «.М.С.". Shrink-to-fit handles the width instead.
      text('recipientName', 'field.client-full-name', 403.5, 177.02, 124.9, {
        required: true
      }),
      text('recipientAddress', 'field.client-postal-address', 407.7, 200.42, 117.9, {
        required: true, multiline: true, maxLines: 2, lineHeight: 10.5
      }),

      // "ООО «Инвестика» настоящим уведомляет, что ______" — the printed text
      // ends at 299.54 and the rule runs 297.05 +237.53.
      text('clientName', 'field.client-full-name', 300.0, 292.49, 234.0, {
        required: true
      }),

      // The recognition date sits on the 141.62 pt rule captioned "(дата)".
      text('recognitionDate', 'field.documentDateRu', 101.0, 333.10, 138.0, {
        required: true, format: 'dateRu', align: 'center'
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
        showWhen: { source: 'subject.kind', equals: 'individual' }
      }),
      text('registerEntryOrgName', 'field.client-full-name', 232.0, 472.03, 89.0, {
        required: true,
        showWhen: { source: 'subject.kind', equals: 'company' }
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
