// Field map — ПРИЛОЖЕНИЕ 6 К РЕГЛАМЕНТУ. ДОВЕРЕННОСТЬ.
//
// Base template : assets/document-pdf-templates/power-of-attorney.pdf
// Source Word   : Z:\6. Управление по работе с клиентами\Формы документов\
//                 для оцифровки\ПРИЛОЖЕНИЕ 6 К РЕГЛАМЕНТУ. ДОВЕРЕННОСТЬ.docx
// Source SHA-256: e21384040c81982042193bef1a4adc1bbcd15b0111f7dc31782684e97e94e9b9
// PDF SHA-256   : a7bcaf8dc97cf1a368b8a22d024c9d9f44e5fb3cef42dc64d56890d03a62a801
// Pages         : 4, mixed sizes — pages 1–2 are 595.56 × 842.04 pt and
//                 pages 3–4 are 595.32 × 841.92 pt. 0 AcroForm fields/widgets.
//
// THE FILE HOLDS TWO SEPARATE POWERS OF ATTORNEY:
//   pages 1–2  «Доверенность (доверенность от юридического лица)»
//   pages 3–4  «Доверенность (от физического лица)»
// So the document is not legal-entity-only. Whichever variant matches the
// selected subject is filled and the other stays completely blank, driven by
// `showWhen` on subject.kind. Both variants are always printed, because the
// authoritative file is one four-page document and pages are never removed.
//
// THE DELEGATED POWERS ARE NOT SELECTABLE. Both variants enumerate their powers
// as fixed prose paragraphs; the document contains **zero checkbox glyphs** on
// any page. There is likewise no "other powers" line, no validity-period blank
// and no substitution option: the wording is fixed at «Доверенность выдана
// сроком на три года без права передоверия». Nothing here is therefore exposed
// as a power checkbox — doing so would invent a choice the form does not offer.
//
// LEFT BLANK BY DESIGN:
//   * «Подпись доверенного лица удостоверяю» / «Подпись руки удостоверяю» and
//     both подпись rules — handwritten signature and notary stages;
//   * ЮЛ «серии» — the word ends the line and no rule follows it, so the series
//     is printed together with the number on the «№» rule instead;
//   * ЮЛ «дата выдачи _,» — the gap between the label and the following comma
//     is 4.56 pt, measured from real glyph boxes. No date fits.
//   * ФЛ «г. Москва» is printed in the source, so only the ЮЛ variant asks for
//     a place of issue.

(function (global) {
  'use strict';

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 12;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller

  var UL_ONLY = { source: 'subject.kind', equals: 'company' };
  var FL_ONLY = { source: 'subject.kind', equals: 'individual' };

  function text(id, source, page, left, baselineTop, width, options) {
    var o = options || {};
    return {
      id: id,
      source: source,
      page: page,
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

  var TEMPLATE = {
    id: 'power-of-attorney',
    title: 'Доверенность',
    templateUrl: '../assets/document-pdf-templates/power-of-attorney.pdf',
    outputFilename: 'doverennost.pdf',
    expectedPages: 4,
    appliesTo: ['individual', 'company'],

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      // ══════════ ЮЛ variant — pages 1–2 ══════════
      text('ulCity', 'extra.extra-poa-city', 0, 165.86, 135.26, 56.0, {
        required: true, align: 'center', showWhen: UL_ONLY
      }),
      text('ulDateInWords', 'extra.extra-poa-date-words', 0, 258.0, 135.26, 174.0, {
        required: true, align: 'center', showWhen: UL_ONLY
      }),

      // «__________, ОГРН ______, ИНН ____,» + caption «(полное наименование)»
      text('ulCompanyName', 'field.client-full-legal-name', 0, 58.0, 156.86, 223.0, {
        required: true, fallbacks: ['trim'], showWhen: UL_ONLY
      }),
      text('ulOgrn', 'field.client-ogrn', 0, 320.0, 156.86, 51.0, {
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 159.74,
          rowHeight: 14, maxExtraRows: 1,
          shiftFromTop: 159.74, shiftToTop: 802.99,
          bottomReserve: 37.05,
          lineStyle: 'underline', reviewStatus: 'approved',
          line: {
            left: 56.54, width: 496.36,
            baselineOffset: 10.5, ruleOffset: 12.6, ruleThickness: 0.48
          }
        },
        required: true, align: 'center', showWhen: UL_ONLY
      }),
      // 27.48 pt for a 10–13 digit OGRN/INN: a 10-digit INN needs 5.5 pt, so
      // this one slot is allowed below the usual 6 pt floor rather than failing.
      text('ulInn', 'subject.inn', 0, 403.5, 156.86, 27.2, {
        // page 1 has 37 pt of reserve: one row each for the ОГРН and the ИНН
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 159.74,
          rowHeight: 14, maxExtraRows: 1,
          shiftFromTop: 159.74, shiftToTop: 802.99,
          bottomReserve: 37.05,
          lineStyle: 'underline', reviewStatus: 'approved',
          line: {
            left: 56.54, width: 496.36,
            baselineOffset: 10.5, ruleOffset: 12.6, ruleThickness: 0.48
          }
        },
        required: true, align: 'center', showWhen: UL_ONLY
      }),

      // «в лице ______, действующего на основании ______»
      text('ulExecutiveName', 'field.client-rep-full-name', 0, 258.0, 193.10, 81.0, {
        required: true, fallbacks: ['initials', 'surname'], showWhen: UL_ONLY
      }),
      // The basis wraps onto the next line, where the rule is 99.36 pt wide;
      // the 39.50 pt tail of the first line is left empty.
      text('ulAuthorityBasis', 'field.client-rep-authority', 0, 58.0, 211.22, 96.0, {
        required: true, showWhen: UL_ONLY
      }),

      // «уполномочивает гр. ______» — the поверенный, who is not in the CRM.
      text('ulAttorneyName', 'extra.extra-attorney-name', 0, 383.0, 211.22, 107.0, {
        required: true, showWhen: UL_ONLY
      }),
      text('ulAttorneyCitizenship', 'extra.extra-attorney-citizenship',
           0, 462.0, 229.34, 28.0, { required: true, align: 'center', showWhen: UL_ONLY }),
      // «серии» has no rule of its own, so series and number share this one.
      text('ulAttorneyPassport', 'extra.extra-attorney-passport', 0, 70.5, 247.49, 84.0, {
        required: true, showWhen: UL_ONLY
      }),
      text('ulAttorneyIssuedBy', 'extra.extra-attorney-issued-by', 0, 211.0, 247.49, 112.0, {
        required: true, multiline: true, maxLines: 2, lineHeight: 11.0,
        fontSize: 10.5, showWhen: UL_ONLY
      }),
      text('ulAttorneyAddress', 'extra.extra-attorney-address', 0, 123.5, 265.61, 143.0, {
        required: true, multiline: true, maxLines: 2, lineHeight: 11.0,
        fontSize: 10.5, showWhen: UL_ONLY
      }),

      // Page 2 signature block: «____ / ____ /» under the captions
      // «сокращенное наименование  подпись  ФИО  мп». The подпись rule stays
      // empty; these two are the printed identifications.
      text('ulCompanyShortName', 'field.client-short-name', 1, 60.0, 457.41, 268.0, {
        required: true, showWhen: UL_ONLY
      }),
      text('ulSignerName', 'field.client-rep-full-name', 1, 334.0, 457.41, 113.0, {
        required: true, format: 'initials', fallbacks: ['surname'], showWhen: UL_ONLY
      }),

      // ══════════ ФЛ variant — pages 3–4 ══════════
      // «г. Москва» is printed, so only the date is filled on that line.
      text('flDateInWords', 'extra.extra-poa-date-words', 2, 249.0, 89.54, 220.0, {
        required: true, align: 'center', showWhen: FL_ONLY
      }),

      text('flPrincipalName', 'field.clientFullName', 2, 104.5, 125.78, 101.0, {
        required: true, fallbacks: ['initials', 'surname'], showWhen: FL_ONLY
      }),
      text('flPrincipalCitizenship', 'subject.citizenship', 2, 488.0, 125.78, 18.5, {
        // page 3 has 32 pt of reserve: one row each for citizenship and the date
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 2, insertionTop: 128.66,
          rowHeight: 14, maxExtraRows: 1,
          shiftFromTop: 128.66, shiftToTop: 807.79,
          bottomReserve: 32.13,
          lineStyle: 'underline', reviewStatus: 'approved',
          line: {
            left: 70.22, width: 464.96,
            baselineOffset: 10.5, ruleOffset: 12.6, ruleThickness: 0.48
          }
        },
        required: true, align: 'center', showWhen: FL_ONLY
      }),
      text('flPrincipalPassport', 'field.passportSeriesNumber', 2, 81.0, 143.90, 50.0, {
        required: true, showWhen: FL_ONLY
      }),
      // The individual variant reserves only 50.2 pt between «выданный» and the
      // following comma — the legal-entity variant gives 114.5 pt for the same
      // value. A typical authority such as «ОВД района Пресненский г. Москвы»
      // needs three wrapped lines even at a reduced floor. The next printed
      // line is 18.1 pt below, so three lines at 6.2 pt just fit above it.
      text('flPrincipalIssuedBy', 'field.client-passport-issued-by', 2, 189.5, 143.90, 50.2, {
        required: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 17.4,
        showWhen: FL_ONLY
      }),
      text('flPrincipalIssueDate', 'field.client-passport-issue-date', 2, 320.5, 143.90, 63.0, {
        required: true, format: 'dateRu', align: 'center', showWhen: FL_ONLY
      }),
      // «(регистрации):» ends its line; the rule sits on the line below.
      text('flPrincipalAddress', 'field.client-registration-address', 2, 71.5, 180.14, 126.0, {
        required: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 18.0,
        showWhen: FL_ONLY
      }),

      // «уполномочиваю гр. ____ ,далее» reserves 47 pt and the sentence has no
      // continuation rule on the next line, so this one prints initials rather
      // than wrapping a full name into the printed text below it.
      text('flAttorneyName', 'extra.extra-attorney-name', 2, 436.0, 180.14, 47.0, {
        required: true, format: 'initials', fallbacks: ['surname'],
        showWhen: FL_ONLY
      }),
      text('flAttorneyCitizenship', 'extra.extra-attorney-citizenship',
           2, 243.0, 216.38, 28.0, { required: true, align: 'center', showWhen: FL_ONLY }),
      text('flAttorneySeries', 'extra.extra-attorney-passport-series',
           2, 307.5, 216.38, 18.0, { required: true, align: 'center', showWhen: FL_ONLY }),
      text('flAttorneyNumber', 'extra.extra-attorney-passport-number',
           2, 338.0, 216.38, 65.0, { required: true, showWhen: FL_ONLY }),
      text('flAttorneyIssuedBy', 'extra.extra-attorney-issued-by', 2, 461.0, 216.38, 84.0, {
        required: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 18.0,
        showWhen: FL_ONLY
      }),
      text('flAttorneyIssueDate', 'extra.extra-attorney-issue-date', 2, 125.5, 234.50, 35.5, {
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 2, insertionTop: 237.38,
          rowHeight: 14, maxExtraRows: 1,
          shiftFromTop: 237.38, shiftToTop: 807.79,
          bottomReserve: 32.13,
          lineStyle: 'underline', reviewStatus: 'approved',
          line: {
            left: 70.22, width: 464.96,
            baselineOffset: 10.5, ruleOffset: 12.6, ruleThickness: 0.48
          }
        },
        required: true, format: 'dateRu', align: 'center', showWhen: FL_ONLY
      }),
      text('flAttorneyAddress', 'extra.extra-attorney-address', 2, 354.0, 234.50, 126.0, {
        required: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 18.0,
        showWhen: FL_ONLY
      }),

      // Page 4 «Доверитель ____ / ____ /» — подпись rule stays empty.
      text('flSignerName', 'field.clientFullName', 3, 238.0, 509.37, 123.0, {
        required: true, align: 'center', format: 'initials', fallbacks: ['surname'],
        showWhen: FL_ONLY
      })
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
