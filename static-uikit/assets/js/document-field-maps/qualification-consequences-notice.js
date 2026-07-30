// Field map — Приложение № 11 «Уведомление о последствиях признания
// физического лица квалифицированным инвестором» к Регламенту принятия решения
// о признании лица квалифицированным инвестором в ООО «Инвестика».
//
// Base template : assets/document-pdf-templates/qualification-consequences-notice.pdf
// Source Word   : Z:\6. Управление по работе с клиентами\Формы документов\
//                 для оцифровки\Приложение 11 Уведомление риски.docx
// Source SHA-256: 13b4d6e0f2ceb8f6bcaa3f311fbeaed001faef8eb22dbff737fb0428a8bac7d4
// PDF SHA-256   : 471b08285a154b04cf4d1702852171f2ed4e0b3fc7478084be5058899d8836b0
// Pages         : 1 (A4, 595.56 × 842.04 pt; 0 AcroForm fields/widgets)
//
// Despite the "Приложение 11" in its filename this is NOT a variant of
// ПРИЛОЖЕНИЕ 11 К РЕГЛАМЕНТУ (отказ от части услуг) — it belongs to the
// qualification regulation. It is also unrelated to the 17-page Risks.pdf.
//
// The fill-in lines here are drawn vector rules, not runs of underscores, so
// they were measured with tools/probe-pdf-table-cells.py's rule probe rather
// than probe-pdf-coords.py.
//
// Left blank by design:
//   * the handwritten "подпись" rule at left 91.94;
//   * "Дата и время ознакомления" — the client writes it when acknowledging;
//   * "по адресу электронной почты ____" — the printed rule is only 20.64 pt
//     wide, which cannot hold any e-mail address even at the 6 pt floor. The
//     broker's address is also not held anywhere in the CRM. Recorded as a
//     source defect rather than forced into the slot.

(function (global) {
  'use strict';

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 11;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller

  // Rows that physically cannot take BODY. Each value is the largest
  // half-point step the measured room allows, floored at MIN.
  var ROW_SIZE = {
    acknowledgementName: 12,         // 65.51 pt of room
    applicantFullName: 12,           // 33.01 pt of room
  };

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
      fontSize: o.fontSize || ROW_SIZE[id] || BODY,
      minFontSize: o.minFontSize != null ? o.minFontSize : MIN,
      align: o.align || 'left',
      required: !!o.required,
      optional: !!o.optional,
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
    };
  }

  var TEMPLATE = {
    id: 'qualification-consequences-notice',
    title: 'Уведомление о последствиях признания квалифицированным инвестором',
    templateUrl: '../assets/document-pdf-templates/qualification-consequences-notice.pdf',
    outputFilename: 'uvedomlenie-o-posledstviyah-priznaniya-kvalinvestorom.pdf',
    expectedPages: 1,
    appliesTo: ['individual'],

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      // «__» ________ 20__ — the quotes span 303.43..325.48, the month rule is
      // 322.99 +40.56, and the printed "20" ends at 385.00.
      text('noticeDateDay', 'field.documentDateRu', 308.5, 167.18, 13.5, {
        required: true, format: 'dateDay', align: 'center'
      }),
      text('noticeDateMonth', 'field.documentDateRu', 324.0, 167.18, 38.5, {
        required: true, format: 'dateMonthGenitive', align: 'center'
      }),
      text('noticeDateYear', 'field.documentDateRu', 385.5, 167.18, 16.0, {
        required: true, format: 'dateYear2', align: 'left'
      }),

      // "уведомляет Заявителя ______ (ФИО физического лица)" — a 74.54 pt rule,
      // so a full name usually shrinks or falls back to initials.
      text('applicantFullName', 'field.clientFullName', 331.0, 198.74, 72.0, {
        required: true, fallbacks: ['initials', 'surname']
      }),

      // "ОЗНАКОМЛЕН: Клиент ____ / ____" — the first rule is the handwritten
      // signature and stays empty; this is the "Ф.И.О., должность" rule.
      text('acknowledgementName', 'field.clientFullName', 254.0, 526.03, 131.0, {
        required: true, align: 'center', format: 'initials', fallbacks: ['surname']
      })
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
