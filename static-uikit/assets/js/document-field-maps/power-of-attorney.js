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

  // Reviewed paragraph flow below uses the source's measured 10.56 pt face,
  // 18.12 pt pitch and 0.48 pt rules. Legacy fields elsewhere in this map keep
  // the ordinary 12→9 pt fixed-region policy.

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

  var TEMPLATE = {
    id: 'power-of-attorney',
    title: 'Доверенность',
    templateUrl: '../assets/document-pdf-templates/power-of-attorney.pdf',
    outputFilename: 'doverennost.pdf',
    expectedPages: 4,
    appliesTo: ['individual', 'company'],

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf',
      legalSerifItalic: '../assets/fonts/pdf/LiberationSerif-Italic.ttf'
    },

    // ── What each page may give a generated row ──────────────────────────────
    //
    //   python static-uikit/tools/qa/measure_page_layout.py --doc power-of-attorney
    //
    // The room a page has is a property of the page, not of any one field, so
    // it is stated once here and shared by every anchor on it. Only the variant
    // being printed draws on it: a доверенность for a legal entity spends
    // nothing on page 3.
    //
    // The page number is the fixed footer of every page and never moves. The
    // previous configuration let the movable band run past it, so an expanded
    // page carried its number 28 pt further down the sheet.
    pageLayout: {
      // ЮЛ page 1. Body 63.85–756.96, page number «1» at 789.97.
      // A доверенность for a foreign attorney needs five rows here — the ОГРН,
      // the ИНН, the citizenship, the issuing authority and the address — so
      // the top margin is drawn on first and the two header gaps only when that
      // is not enough. The page's 63.85 pt top margin is 2.25 cm, wider than
      // the individual variant's own 2.0 cm; 42.5 pt is 1.5 cm.
      //   bottom capacity 789.97 − 6.00 − 756.96 = 27.01 pt
      //   top margin 63.85 → 42.50 = 21.35 pt
      //   two reviewed header gaps give 13.00 pt more
      //   → 61.36 pt, five 12 pt rows
      0: {
        fixedHeaderUntil: 0,
        bodyBottom: 756.96,
        fixedFooterFrom: 789.97,
        shiftToTop: 783.0,
        bottomClearance: 6.0,
        compaction: [
          {
            top: 62.60, originalGap: 63.85, minGap: 42.5,
            reviewStatus: 'approved',
            note: 'верхнее поле страницы юридического лица, 2.25 → 1.5 см'
          },
          {
            top: 87.33, originalGap: 13.71, minGap: 7.0,
            reviewStatus: 'approved',
            note: 'между шапкой приложения и заголовком «Доверенность»'
          },
          {
            top: 125.56, originalGap: 13.29, minGap: 7.0,
            reviewStatus: 'approved',
            note: 'между подзаголовком варианта и строкой «г. ___ (дата прописью)»'
          }
        ],
        // The final complete power (ten lines, 581.02–754.68) may move before
        // the already-continuing list on page 2.  The target body moves by ten
        // source pitches; its signature block stays complete on page 2 and the
        // page number remains fixed.
        crossPageFlow: {
          targetPage: 1,
          sourceFromTop: 575.72, sourceToTop: 783.0,
          sourceContentTop: 580.87, retainedBodyBottom: 575.71,
          targetInsertionTop: 58.17,
          targetShiftFromTop: 56.0, targetShiftToTop: 783.0,
          targetShift: 181.2, maxCumulativeShift: 181.2,
          maxCascadeDepth: 1, reviewStatus: 'approved',
          note: 'последнее полное полномочие страницы 1 переносится перед перечнем страницы 2'
        },
        anchors: ['power-of-attorney-ul-intro']
      },
      // ФЛ page 3. Body 57.13–761.98, page number «3» at 794.77.
      //
      // This page is one continuous justified block from 116 pt to 762 pt at a
      // uniform 18.12 pt pitch — there is no gap between two complete blocks
      // anywhere in it, so nothing may be recovered from the body. What it does
      // have is a 57.13 pt top margin, which is Word's 2 cm default; 42.5 pt is
      // 1.5 cm and still an ordinary margin.
      //
      // A доверенность given by a foreign individual to a foreign attorney
      // needs four rows here — citizenship twice, the issuing authority and the
      // date — so all four of the page's anchors can be live at once.
      //   bottom capacity 794.77 − 3.00 − 761.98 = 29.79 pt
      //   top margin 57.13 → 42.50 = 14.63 pt
      //   → 44.42 pt, four 11 pt rows
      2: {
        fixedHeaderUntil: 0,
        bodyBottom: 761.98,
        fixedFooterFrom: 794.77,
        shiftToTop: 788.0,
        bottomClearance: 3.0,
        compaction: [
          {
            top: 55.88, originalGap: 57.13, minGap: 42.5,
            reviewStatus: 'approved',
            note: 'верхнее поле страницы физического лица, 2.0 → 1.5 см'
          }
        ],
        // Page 3 ends with the first two lines of a power that continues on
        // page 4. Move those four complete drawing blocks before their existing
        // continuation, then shift page 4 by two line pitches. No paragraph,
        // signature, footer or page number is split or moved to another page.
        crossPageFlow: {
          targetPage: 3,
          sourceFromTop: 725.9, sourceToTop: 788.0,
          sourceContentTop: 731.02, retainedBodyBottom: 725.86,
          targetInsertionTop: 55.92,
          targetShiftFromTop: 55.9, targetShiftToTop: 788.0,
          targetShift: 36.24, maxCumulativeShift: 36.24,
          maxCascadeDepth: 1, reviewStatus: 'approved',
          note: 'две начальные строки продолжающегося полномочия переносятся на страницу 4'
        },
        anchors: ['power-of-attorney-fl-intro']
      }
    },

    // ── Reviewed Word-like replacement blocks ──────────────────────────────
    // Static legal wording and the existing business fields share one line-
    // breaking pass at the source's measured Times-compatible size. The exact
    // q…Q ranges are frozen against the authoritative PDF; only those blocks
    // are suppressed in generated output and every other source operator stays
    // byte-for-byte present once.
    wordFlowBlocks: [
      {
        id: 'power-of-attorney-ul-date',
        type: 'wordFlowBlock',
        page: 0,
        showWhen: UL_ONLY,
        frame: { left: 157.34, baselineTop: 135.26, width: 316.4, initialLineCount: 2 },
        font: 'legalSerif', fontSize: 9.48, minFontSize: 9.48,
        fontSizeLocked: true, lineHeight: 9.84, alignment: 'left',
        sourceReplacement: {
          firstBlock: 22, lastBlock: 31,
          expectedBlockCount: 10,
          expectedSha256: 'bf9392e9b388f595236845fe2537eed1405e3f02993cbf998993cb7544609ccd',
          expectedTemplateSha256: 'a7bcaf8dc97cf1a368b8a22d024c9d9f44e5fb3cef42dc64d56890d03a62a801',
          reviewStatus: 'approved'
        },
        sourceStaticText: 'г. ____________ (дата прописью)',
        runs: [
          { type: 'static', text: 'г. ' },
          {
            type: 'fieldRef', fieldId: 'ulCity', keepTogether: true,
            decoration: { underline: true, minWidth: 56, thickness: 0.48, offset: 1.2 }
          },
          { type: 'spacer', width: 32.67 },
          {
            type: 'fieldRef', fieldId: 'ulDateInWords',
            decoration: { underline: true, minWidth: 174, thickness: 0.48, offset: 1.2 }
          },
          { type: 'lineBreak' },
          { type: 'spacer', width: 171.5 },
          { type: 'static', text: '(дата прописью)', font: 'legalSerifItalic', fontSize: 8.04 }
        ]
      },
      {
        id: 'power-of-attorney-ul-intro',
        type: 'wordFlowBlock',
        page: 0,
        showWhen: UL_ONLY,
        frame: { left: 56.54, baselineTop: 156.86, width: 478.35, initialLineCount: 8 },
        font: 'legalSerif', fontSize: 10.56, minFontSize: 10.56,
        fontSizeLocked: true, lineHeight: 18.12, alignment: 'justify',
        justifyMinRatio: 0.55,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 0, insertionTop: 286.2, shiftFromTop: 286.2,
          rowHeight: 18.12, maxExtraRows: 4, lineStyle: 'none',
          reviewStatus: 'approved'
        },
        sourceReplacement: {
          firstBlock: 32, lastBlock: 113,
          expectedBlockCount: 82,
          expectedSha256: '77806e87d7311e603578a81f84812df0e6e08b166fa39e2102ad579867dd5a3b',
          expectedTemplateSha256: 'a7bcaf8dc97cf1a368b8a22d024c9d9f44e5fb3cef42dc64d56890d03a62a801',
          reviewStatus: 'approved'
        },
        sourceStaticText: '__________, ОГРН ________, ИНН ____, (полное наименование) ' +
          'далее именуемое «Доверитель», в лице ________, действующего на основании ________, ' +
          'настоящей доверенностью уполномочивает гр. ________, далее именуемого «Поверенный», ' +
          'имеющего паспорт гражданина ________, серии № ________, выданный ________, ' +
          'дата выдачи _, проживающего по адресу (регистрации) ________, ' +
          'совершать следующие действия:',
        runs: [
          {
            type: 'fieldRef', fieldId: 'ulCompanyName',
            decoration: { underline: true, minWidth: 223, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', ОГРН ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'ulOgrn', keepTogether: true,
            decoration: { underline: true, minWidth: 51, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', ИНН ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'ulInn', keepTogether: true,
            decoration: { underline: true, minWidth: 27.2, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ',' },
          { type: 'lineBreak' },
          { type: 'static', text: '(полное наименование)', font: 'legalSerifItalic' },
          { type: 'lineBreak' },
          { type: 'static', text: 'далее именуемое «Доверитель», в лице ' },
          {
            type: 'fieldRef', fieldId: 'ulExecutiveName',
            decoration: { underline: true, minWidth: 81, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', действующего на основании ' },
          {
            type: 'fieldRef', fieldId: 'ulAuthorityBasis',
            decoration: { underline: true, minWidth: 138.86, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', настоящей доверенностью уполномочивает гр. ' },
          {
            type: 'fieldRef', fieldId: 'ulAttorneyName',
            decoration: { underline: true, minWidth: 107, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', далее именуемого «Поверенный», имеющего паспорт гражданина ' },
          {
            type: 'fieldRef', fieldId: 'ulAttorneyCitizenship',
            decoration: { underline: true, minWidth: 28, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', серии № ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'ulAttorneyPassport', keepTogether: true,
            decoration: { underline: true, minWidth: 84, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', выданный ' },
          {
            type: 'fieldRef', fieldId: 'ulAttorneyIssuedBy',
            decoration: { underline: true, minWidth: 112, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', дата выдачи ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'ulAttorneyIssueDate', keepTogether: true,
            decoration: { underline: true, minWidth: 40, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', проживающего по адресу (регистрации) ' },
          {
            type: 'fieldRef', fieldId: 'ulAttorneyAddress',
            decoration: { underline: true, minWidth: 143, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', совершать следующие действия:' }
        ]
      },
      {
        id: 'power-of-attorney-fl-date',
        type: 'wordFlowBlock',
        page: 2,
        showWhen: FL_ONLY,
        frame: { left: 133.94, baselineTop: 89.54, width: 339.8, initialLineCount: 2 },
        font: 'legalSerif', fontSize: 10.56, minFontSize: 10.56,
        fontSizeLocked: true, lineHeight: 18.12, alignment: 'left',
        sourceReplacement: {
          firstBlock: 10, lastBlock: 19,
          expectedBlockCount: 10,
          expectedSha256: '08b1d054b8d2d59ba901d346a9a57316f53d6d23d4729496b2c6b7a65ca5f663',
          expectedTemplateSha256: 'a7bcaf8dc97cf1a368b8a22d024c9d9f44e5fb3cef42dc64d56890d03a62a801',
          reviewStatus: 'approved'
        },
        sourceStaticText: 'г. Москва ____________ (дата прописью)',
        runs: [
          { type: 'static', text: 'г. Москва' },
          { type: 'spacer', width: 68.2 },
          {
            type: 'fieldRef', fieldId: 'flDateInWords',
            decoration: { underline: true, minWidth: 220, thickness: 0.48, offset: 1.2 }
          },
          { type: 'lineBreak' },
          { type: 'spacer', width: 191.3 },
          { type: 'static', text: '(дата прописью)', font: 'legalSerifItalic' }
        ]
      },
      {
        id: 'power-of-attorney-fl-intro',
        type: 'wordFlowBlock',
        page: 2,
        showWhen: FL_ONLY,
        frame: { left: 70.22, baselineTop: 125.78, width: 464.96, initialLineCount: 8 },
        font: 'legalSerif', fontSize: 10.56, minFontSize: 10.56,
        fontSizeLocked: true, lineHeight: 18.12, alignment: 'justify',
        justifyMinRatio: 0.55,
        overflowStrategy: 'expand-layout',
        expansion: {
          page: 2, insertionTop: 255.0, shiftFromTop: 255.0,
          rowHeight: 18.12, maxExtraRows: 4, lineStyle: 'none',
          reviewStatus: 'approved'
        },
        sourceReplacement: {
          firstBlock: 20, lastBlock: 117,
          expectedBlockCount: 98,
          expectedSha256: 'f6e745726adc410803c87a47b1bf86abb340707e4cb52e145d750b5b909b4198',
          expectedTemplateSha256: 'a7bcaf8dc97cf1a368b8a22d024c9d9f44e5fb3cef42dc64d56890d03a62a801',
          reviewStatus: 'approved'
        },
        sourceStaticText: 'Я, Гр. ________, далее именуемый «Доверитель», паспорт гражданина ____, ' +
          'серии №______: выданный ________, дата выдачи ________, проживающий по адресу ' +
          '(регистрации): ________ настоящей доверенностью уполномочиваю гр. ________,далее ' +
          'именуемого «Поверенный», паспорт гражданина ____, серии____№________, ' +
          'выданный________, дата выдачи____, проживающего по адресу (регистрации): ________, ' +
          'совершать следующие действия:',
        runs: [
          { type: 'static', text: 'Я, Гр. ' },
          {
            type: 'fieldRef', fieldId: 'flPrincipalName', useRawValue: true,
            decoration: { underline: true, minWidth: 101, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', далее именуемый «Доверитель», паспорт гражданина ' },
          {
            type: 'fieldRef', fieldId: 'flPrincipalCitizenship',
            decoration: { underline: true, minWidth: 18.5, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', серии № ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'flPrincipalPassport', keepTogether: true,
            decoration: { underline: true, minWidth: 50, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ': выданный ' },
          {
            type: 'fieldRef', fieldId: 'flPrincipalIssuedBy',
            decoration: { underline: true, minWidth: 50.2, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', дата выдачи ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'flPrincipalIssueDate', keepTogether: true,
            decoration: { underline: true, minWidth: 63, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', проживающий по адресу (регистрации): ' },
          {
            type: 'fieldRef', fieldId: 'flPrincipalAddress',
            decoration: { underline: true, minWidth: 126, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ' настоящей доверенностью уполномочиваю гр. ' },
          {
            type: 'fieldRef', fieldId: 'flAttorneyName', useRawValue: true,
            decoration: { underline: true, minWidth: 47, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ',далее именуемого «Поверенный», паспорт гражданина ' },
          {
            type: 'fieldRef', fieldId: 'flAttorneyCitizenship',
            decoration: { underline: true, minWidth: 28, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', серии ' },
          {
            type: 'fieldRef', fieldId: 'flAttorneySeries', keepTogether: true,
            decoration: { underline: true, minWidth: 18, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ' № ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'flAttorneyNumber', keepTogether: true,
            decoration: { underline: true, minWidth: 65, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', выданный ' },
          {
            type: 'fieldRef', fieldId: 'flAttorneyIssuedBy',
            decoration: { underline: true, minWidth: 84, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', дата выдачи ', keepWithNext: true },
          {
            type: 'fieldRef', fieldId: 'flAttorneyIssueDate', keepTogether: true,
            decoration: { underline: true, minWidth: 35.5, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', проживающего по адресу (регистрации): ' },
          {
            type: 'fieldRef', fieldId: 'flAttorneyAddress',
            decoration: { underline: true, minWidth: 126, thickness: 0.48, offset: 1.2 }
          },
          { type: 'static', text: ', совершать следующие действия:' }
        ]
      }
    ],

    fields: [
      // ══════════ ЮЛ variant — pages 1–2 ══════════
      // The place of issue sits inside «г. ____________», a printed underscore
      // run of 56 pt. «Москва» fits; «Санкт-Петербург» is 66.31 pt at 9 pt and
      // does not.
      //
      // The date rule and its caption are separate complete blocks. Opening the
      // city continuation at the clean 135.30 cut moves both down together, so
      // the caption remains attached to its rule while «Санкт-Петербург» keeps
      // its printed hyphen and continues directly under «г. ____________».
      text('ulCity', 'extra.extra-poa-city', 0, 165.86, 135.26, 56.0, {
        required: true, align: 'center', showWhen: UL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-ul-date'
      }),
      text('ulDateInWords', 'extra.extra-poa-date-words', 0, 258.0, 135.26, 174.0, {
        required: true, align: 'center', showWhen: UL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-ul-date'
      }),

      // «__________, ОГРН ______, ИНН ____,» + caption «(полное наименование)»
      text('ulCompanyName', 'field.client-full-legal-name', 0, 58.0, 156.86, 223.0, {
        required: true, fallbacks: ['trim'], showWhen: UL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-ul-intro'
      }),
      // The printed blank is 54.36 pt; a 13-digit ОГРН needs 58.50 pt at the
      // 9 pt floor. Exact identifiers are never split or abbreviated, so the
      // complete number prints on a continuation row under its own label.
      text('ulOgrn', 'field.client-ogrn', 0, 320.0, 156.86, 51.0, {
        required: true, align: 'center', showWhen: UL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-ul-intro'
      }),
      // 27.48 pt printed for a 10-digit ИНН, which needs 45.00 pt at 9 pt.
      text('ulInn', 'subject.inn', 0, 403.5, 156.86, 27.2, {
        required: true, align: 'center', showWhen: UL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-ul-intro'
      }),

      // «в лице ______, действующего на основании ______»
      text('ulExecutiveName', 'field.client-rep-full-name', 0, 258.0, 193.10, 81.0, {
        required: true, fallbacks: ['initials', 'surname'], showWhen: UL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-ul-intro'
      }),
      // «…действующего на основании ____» wraps in the source: the blank ends
      // the first line after 39.50 pt (492.58–532.08) and continues at the
      // start of the next on a 99.36 pt rule (56.54–155.90), before
      // «, настоящей доверенностью уполномочивает гр.». Both printed rules
      // belong to this one value; mapping only the second reported 96 pt of
      // room where the form gives 138.86 pt.
      text('ulAuthorityBasis', 'field.client-rep-authority', 0, 493.5, 193.10, 37.0, {
        required: true, showWhen: UL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-ul-intro'
      }),

      // «уполномочивает гр. ______» — the поверенный, who is not in the CRM.
      // The same wrap: 109.94 pt (381.43–491.37) then 99.36 pt (56.54–155.90)
      // on the next line before «, далее именуемого «Поверенный»».
      // «Соколов Алексей Михайлович» needs 117.99 pt at 9 pt and 157.32 pt at
      // 12 pt, so with both rules mapped an ordinary Russian name prints at the
      // preferred size and the page is not touched at all.
      text('ulAttorneyName', 'extra.extra-attorney-name', 0, 383.0, 211.22, 107.0, {
        required: true, showWhen: UL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-ul-intro'
      }),
      // «имеющего паспорт гражданина ____, серии» — 30.72 pt printed, bounded
      // by text on both sides, and no printed rule continues it. «Россия» fits;
      // «United Kingdom» needs 60.75 pt at 9 pt and takes a continuation row.
      text('ulAttorneyCitizenship', 'extra.extra-attorney-citizenship',
           0, 462.0, 229.34, 28.0, {
        required: true, align: 'center', showWhen: UL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-ul-intro'
      }),
      // «серии» has no rule of its own, so series and number share this one.
      text('ulAttorneyPassport', 'extra.extra-attorney-passport', 0, 70.5, 247.49, 84.0, {
        required: true, showWhen: UL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-ul-intro'
      }),
      // Two printed lines of 112 pt hold an ordinary «ОВД …»; a full Russian
      // «Отделение по вопросам миграции …» does not, and an issuing authority
      // is one of the values the business expects to be expandable. It is last
      // in the page order, so it takes a row only out of what the ОГРН, the ИНН
      // and the citizenship left behind.
      // 8.71 pt of clear space below the baseline before the comma that ends
      // the clause, so this rule holds exactly one line — the second line the
      // map used to allow was drawn straight over that comma.
      text('ulAttorneyIssuedBy', 'extra.extra-attorney-issued-by', 0, 211.0, 247.49, 112.0, {
        required: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 8.5,
        fontSize: 10.5, showWhen: UL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-ul-intro'
      }),
      // The authoritative sentence includes «дата выдачи». The old fixed map
      // could not use its 4.56 pt gap; paragraph flow can now print the same
      // existing wizard value without changing that business key.
      text('ulAttorneyIssueDate', 'extra.extra-attorney-issue-date', 0, 324.19, 247.49, 40.0, {
        required: true, format: 'dateRu', showWhen: UL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-ul-intro'
      }),
      // Likewise 8.71 pt: «совершать следующие действия:» begins on the next
      // printed line. An address of any length needs the continuation row.
      text('ulAttorneyAddress', 'extra.extra-attorney-address', 0, 123.5, 265.61, 143.0, {
        required: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 8.5,
        fontSize: 10.5, showWhen: UL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-ul-intro'
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
        required: true, align: 'center', showWhen: FL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-fl-date'
      }),

      text('flPrincipalName', 'field.clientFullName', 2, 104.5, 125.78, 101.0, {
        required: true, fallbacks: ['initials', 'surname'], showWhen: FL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-fl-intro'
      }),
      // 20.40 pt printed. Even «Россия» needs 26.45 pt at the 9 pt floor.
      text('flPrincipalCitizenship', 'subject.citizenship', 2, 488.0, 125.78, 18.5, {
        required: true, align: 'center', showWhen: FL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-fl-intro'
      }),
      text('flPrincipalPassport', 'field.passportSeriesNumber', 2, 81.0, 143.90, 50.0, {
        required: true, showWhen: FL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-fl-intro'
      }),
      // The individual variant reserves only 50.2 pt between «выданный» and the
      // following comma — the legal-entity variant gives 114.5 pt for the same
      // value. A typical authority such as «ОВД района Пресненский г. Москвы»
      // needs three wrapped lines even at a reduced floor. The next printed
      // line is 18.1 pt below, so three lines at 6.2 pt just fit above it.
      // 26.83 pt of clear space below the baseline — nothing printed sits in
      // this column until «настоящей доверенностью» two lines further down — so
      // the 50.2 pt rule may run to three lines at the floor. A Russian «ГУ МВД
      // России по г. Москве» fits in those three; «United Kingdom Passport
      // Office» needs four, and takes the continuation row.
      text('flPrincipalIssuedBy', 'field.client-passport-issued-by', 2, 189.5, 143.90, 50.2, {
        required: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 26.0,
        showWhen: FL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-fl-intro'
      }),
      text('flPrincipalIssueDate', 'field.client-passport-issue-date', 2, 320.5, 143.90, 63.0, {
        required: true, format: 'dateRu', align: 'center', showWhen: FL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-fl-intro'
      }),
      // «(регистрации):» ends its line; the rule sits on the line below.
      // «(регистрации):» ends its line; the rule sits on the line below, and
      // «именуемого» begins 8.71 pt under its baseline. One line of 127.82 pt,
      // therefore, and any real address needs the continuation row.
      text('flPrincipalAddress', 'field.client-registration-address', 2, 71.5, 180.14, 126.0, {
        required: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 8.5,
        showWhen: FL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-fl-intro'
      }),

      // «уполномочиваю гр. ____ ,далее» reserves 47 pt and the sentence has no
      // continuation rule on the next line, so this one prints initials rather
      // than wrapping a full name into the printed text below it.
      text('flAttorneyName', 'extra.extra-attorney-name', 2, 436.0, 180.14, 47.0, {
        required: true, format: 'initials', fallbacks: ['surname'],
        showWhen: FL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-fl-intro'
      }),
      // 29.76 pt printed: «Россия» (26.45 pt at 9 pt) fits, «United Kingdom»
      // (60.75 pt) does not — the reason this one fails for a foreign attorney
      // and not for a Russian one.
      text('flAttorneyCitizenship', 'extra.extra-attorney-citizenship',
           2, 243.0, 216.38, 28.0, {
        required: true, align: 'center', showWhen: FL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-fl-intro'
      }),
      text('flAttorneySeries', 'extra.extra-attorney-passport-series',
           2, 307.5, 216.38, 18.0, {
        required: true, align: 'center', showWhen: FL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-fl-intro'
      }),
      text('flAttorneyNumber', 'extra.extra-attorney-passport-number',
           2, 338.0, 216.38, 65.0, {
        required: true, showWhen: FL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-fl-intro'
      }),
      // 8.71 pt to the comma that ends the clause: one line of 84 pt, which
      // even «ГУ МВД России по г. Москве» overruns. Its row opens at the same
      // point as the citizenship above it, so the two stack in reading order.
      text('flAttorneyIssuedBy', 'extra.extra-attorney-issued-by', 2, 461.0, 216.38, 84.0, {
        required: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 8.5,
        showWhen: FL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-fl-intro'
      }),
      // «дата выдачи ____,» — the printed rule is 37.44 pt and a ten-character
      // date needs 40.50 pt at the 9 pt floor. Three points short, and a date
      // is not something that may be shortened.
      text('flAttorneyIssueDate', 'extra.extra-attorney-issue-date', 2, 125.5, 234.50, 35.5, {
        required: true, format: 'dateRu', align: 'center', showWhen: FL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-fl-intro'
      }),
      // 26.74 pt before «изменять/расторгать…», so three lines of 126 pt —
      // enough for a Russian or a foreign address without touching the page.
      text('flAttorneyAddress', 'extra.extra-attorney-address', 2, 354.0, 234.50, 126.0, {
        required: true, multiline: true, lineHeightRatio: 0.95, maxHeight: 26.0,
        showWhen: FL_ONLY,
        layoutMode: 'flow-reference', flowBlockId: 'power-of-attorney-fl-intro'
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
