// Field map — ПРИЛОЖЕНИЕ 14 К РЕГЛАМЕНТУ. ЗАЯВЛЕНИЕ ОБ
// УСТАНОВЛЕНИИ/ИЗМЕНЕНИИ КОДОВОГО СЛОВА.
//
// Base template : assets/document-pdf-templates/code-word-request.pdf
// Source Word   : "ПРИЛОЖЕНИЕ 14 К РЕГЛАМЕНТУ. ЗАЯВЛЕНИЕ ОБ
//                 УСТАНОВЛЕНИИ-ИЗМЕНЕНИИ КОДОВОГО СЛОВА.docx"
// Source SHA-256: 8544f32952da5d38538e0ddeb448398e4e3c682ee3925f79a98a52a58b361a0b
// Pages         : 1 (A4, 595.32 x 841.92 pt)
//
// The authoritative DOCX contains three mail-merge tokens rather than clean
// blanks: $FULLNAME$ (twice), $INN$ and $CLIENT_CODEWORD$. A temporary,
// byte-for-byte working copy was prepared before the one-time Word export by
// replacing only those literal tokens: FULLNAME/INN became underscore rules of
// useful width and CLIENT_CODEWORD became an empty bordered cell. No legal text,
// source typo, paragraph, table, margin or page break was changed. Coordinates
// below come from the resulting PDF's real glyph boxes and border geometry.
//
// The source sentence is fixed as "устанавливает следующее кодовое слово" and
// has no establish/change checkboxes, client-code blank or separate effective
// date. Those legacy HTML-only controls therefore do not belong in this map.

(function (global) {
  'use strict';

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 12;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller

  function text(id, source, left, baselineTop, width, extra) {
    var field = {
      id: id,
      type: 'text',
      source: source,
      page: 0,
      left: left,
      baselineTop: baselineTop,
      width: width,
      font: 'legalSerif',
      fontSize: BODY,
      minFontSize: MIN,
      align: 'left'
    };
    Object.keys(extra || {}).forEach(function (key) { field[key] = extra[key]; });
    return field;
  }

  // The source literally prints "202__ г." (three fixed year digits). Preserve
  // that defect and fill only the final year digit; writing YY would produce a
  // five-digit year and silently alter what the source says.
  var TEMPLATE = {
    id: 'code-word-request',
    title: 'Заявление об установлении/изменении кодового слова',
    templateUrl: '../assets/document-pdf-templates/code-word-request.pdf',
    outputFilename: 'code-word-request.pdf',
    expectedPages: 1,
    appliesTo: ['individual', 'company'],

    pageLayout: {
      0: {
        fixedHeaderUntil: 0,
        bodyBottom: 506.09,
        fixedFooterFrom: null,
        shiftToTop: 800.0,
        bottomClearance: 40.0,
        compaction: [],
        anchors: ['clientFullName']
      }
    },

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      // "от «__» _____________202__ г."
      text('documentDateDay', 'extra.extra-document-date', 266.70, 202.94, 15.00, {
        format: 'dateDay', align: 'center', required: true
      }),
      text('documentDateMonth', 'extra.extra-document-date', 289.20, 202.94, 64.90, {
        format: 'dateMonthGenitive', align: 'center', required: true
      }),
      text('documentDateYearLastDigit', 'extra.extra-document-date', 369.00, 202.94, 10.00, {
        format: 'dateYearLastDigit', align: 'center', required: true
      }),

      // "Настоящим ________, ________ (ФИО, ИНН), далее — Клиент..."
      text('clientFullName', 'subject.displayName', 139.80, 225.98, 124.90, {
        required: true,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 238.75, shiftFromTop: 238.75,
          rowHeight: 13, maxExtraRows: 1, maxFontSize: 10,
          lineStyle: 'underline', reviewStatus: 'approved',
          line: {
            left: 85.1, width: 472.5,
            baselineOffset: 10.0, ruleOffset: 11.2, ruleThickness: 0.36
          }
        }
      }),
      text('clientInn', 'subject.inn', 272.80, 225.98, 69.90, {
        align: 'center', required: true
      }),

      // Empty bordered code-word cell, measured from its 223.80..405.60 and
      // 246.89..278.09 pt border rectangle.
      text('newCodeWord', 'extra.extra-new-code-word', 228.80, 259.00, 171.80, {
        align: 'center', required: true,
        multiline: true, lineHeightRatio: 0.95, maxHeight: 21.0
      }),

      // The handwritten signature rule at 155.90..240.80 remains blank. The
      // printed name belongs on the separate rule above its FIO caption.
      text('signatureName', 'field.clientFullName', 297.50, 470.59, 124.80, {
        fallbacks: ['initials', 'surname'], align: 'center', required: true
      })
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
