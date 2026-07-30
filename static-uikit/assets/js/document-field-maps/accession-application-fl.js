// Field map — ПРИЛОЖЕНИЕ 1А К РЕГЛАМЕНТУ. ЗАЯВЛЕНИЕ О ПРИСОЕДИНЕНИИ (ФЛ)
//
// Base template : assets/document-pdf-templates/accession-application-fl.pdf
// Source Word   : "ПРИЛОЖЕНИЕ 1А К РЕГЛАМЕНТУ. ЗАЯВЛЕНИЕ О ПРИСОЕДИНЕНИИ (ФЛ).docx"
// Pages         : 3 (A4, 595.32 × 841.92 pt)
//
// Coordinates are MEASURED from the committed template with
// `tools/probe-pdf-coords.py`, never estimated:
//
//     left         x of the blank line / checkbox glyph
//     baselineTop  distance from the page TOP down to the text BASELINE
//
// The identity paragraph is justified, so inter-word spacing is stretched and
// a position computed from a font width table drifts by tens of points across
// a line. Always take these numbers from the probe (which reads real glyph
// boxes) and re-run it after regenerating the template from the .docx.
//
// The source document is set in Times New Roman 8.5 pt (body) and 9 pt (the
// §16 contact table). Liberation Serif is metric-compatible with Times New
// Roman, so values occupy the same space as the surrounding printed text.

(function (global) {
  'use strict';

  // Readability policy (docs/document-pdf-generation.md): dynamic text is
  // never drawn below 9 pt, and prefers 12 pt wherever the form's own
  // geometry allows it. Vertical room per row was measured from the
  // committed template with tools/qa/measure_field_room.py.
  var BODY = 12;          // preferred dynamic size for this form
  var MIN = 9;             // hard readability floor — never draw smaller
  var CHECK_GLYPH = 8.52;  // printed ☐ box — geometry, not dynamic text
  var SIZE_10_5 = 10.5;      // measured room: 10.64, 10.59 pt
  var SIZE_9_5 = 9.5;       // measured room: 9.56 pt
  var SIZE_9 = 9;         // measured room: 8.89, 8.89, 8.89 pt

  // Every checkbox glyph in this template is drawn at the body size.
  // (The source mixes MS-Gothic and Segoe UI Symbol for "☐"; both render the
  // same box, and the mark is drawn geometrically, so the font does not matter.)
  function check(id, source, equals, page, left, baselineTop) {
    return {
      id: id,
      type: 'check',
      source: source,
      equals: equals,
      page: page,
      left: left,
      baselineTop: baselineTop,
      glyphSize: CHECK_GLYPH
    };
  }

  var TEMPLATE = {
    id: 'accession-application-fl',
    title: 'Заявление о присоединении (ФЛ)',
    templateUrl: '../assets/document-pdf-templates/accession-application-fl.pdf',
    outputFilename: 'zayavlenie-o-prisoedinenii-fl.pdf',
    expectedPages: 3,
    appliesTo: ['individual'],

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      // ── Page 1 — identity line ────────────────────────────────────────────
      // "Настоящим, ____, паспорт серии ___, № ___, выдан ____, дата выдачи
      //  «__» _____г., проживающий(ая) по адресу (регистрации): ____."
      {
        id: 'clientFullName',
        source: 'field.clientFullName',
        page: 0, left: 114.0, baselineTop: 99.26, width: 203.9,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'passportSeries',
        source: 'field.passportSeries',
        page: 0, left: 409.0, baselineTop: 99.26, width: 29.8,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center'
      },
      {
        id: 'passportNumber',
        source: 'field.passportNumber',
        page: 0, left: 475.3, baselineTop: 99.26, width: 46.7,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center'
      },
      // ── Continuation lines for the identity paragraph ─────────────────────
      // The paragraph is justified prose with fixed blanks, so a long issuing
      // authority or address cannot simply take more of its own line. Below it
      // the page is empty from 140.22 down to 159.95, where «1. Присоединяется»
      // begins — 19.73 pt, which holds exactly two 9.5 pt lines:
      //
      //     140.22 ┄┄┄┄┄┄┄┄ top of the blank band
      //     148.70  continuation of the registration address
      //     157.70  continuation of the passport issuing authority
      //     159.95 ┄┄┄┄┄┄┄┄ §1 heading
      //
      // Each is a real, reviewed line: a baseline plus a rule of the same
      // 0.36 pt weight and the same 1.5 pt drop below the baseline as the
      // underscore rules Word produced on this page, so the filled form reads
      // as though the lines had been in the source document all along.
      // `maxFontSize` records that this particular band cannot hold more than
      // 9.5 pt — without it the engine would happily draw 12 pt text over the
      // printed paragraph above.
      //
      // Band measured with tools/qa/measure_field_room.py --gaps; rule weight
      // measured from a 1200 dpi rendering. See AUDIT_REPORT.md.
      {
        id: 'passportIssuedBy',
        label: 'Кем выдан паспорт',
        source: 'field.passportIssuedBy',
        page: 0, left: 56.6, baselineTop: 118.82, width: 352.6,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'left',
        overflowStrategy: 'flow',
        flowRegions: [
          { page: 0, left: 56.6, baselineTop: 118.82, width: 352.6, maxLines: 1 },
          {
            page: 0, left: 56.6, baselineTop: 157.70, width: 501.0, maxLines: 1,
            // The §1 heading starts at 159.95, so this rule is pulled a little
            // closer to its baseline than the first one to keep clear air.
            maxFontSize: 9.5, generated: true, reviewStatus: 'approved',
            drawUnderline: true, underlineThickness: 0.36, underlineOffset: 1.2
          }
        ]
      },
      // The printed date reads:  дата выдачи «___» _________г.
      // Measured glyph geometry of that line (tools/probe-pdf-coords.py):
      //   «  ends at 487.01,  » starts at 499.66   -> day slot     12.65 pt
      //   underline starts 513.69, "г." starts 551.93 -> month+year 38.24 pt
      //
      // The form provides ONE blank for the month and the year together, so
      // both are drawn into it as "апреля 2008": a spelled-out genitive month
      // followed by the four-digit year, the way these forms are filled in by
      // hand. Never a numeric MM.YYYY.
      //
      // Widths of "<month> 2008" range from 32.26 pt (мая) to 51.45 pt
      // (сентября) at 8.52 pt, so at the 9 pt readability floor only the
      // shortest month names still fit the 37.5 pt blank. The rest fall back to
      // the numeric form below rather than being drawn at an unreadable size.
      {
        id: 'passportIssueDay',
        source: 'field.passportIssueDate', format: 'dateDay',
        page: 0, left: 487.0, baselineTop: 118.82, width: 12.6,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center'
      },
      {
        // A genitive month plus the year needs up to 51 pt at 8.52 pt and far
        // more at the readable 9 pt floor, but the printed blank is 37.5 pt.
        // «09.2018» is the same date, is unambiguous, and is an accepted way of
        // completing this slot by hand — so it is the declared safe fallback
        // rather than an error the manager cannot act on.
        id: 'passportIssueMonthYear',
        source: 'field.passportIssueDate', format: 'dateMonthYearGenitive',
        fallbacks: ['dateMonthYearShort'],
        page: 0, left: 513.7, baselineTop: 118.82, width: 37.5,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center'
      },
      // The address closes the identity sentence, so its continuation takes the
      // first of the two reviewed lines — directly under the line it continues.
      {
        id: 'registrationAddress',
        label: 'Адрес регистрации',
        source: 'field.registrationAddress',
        page: 0, left: 217.7, baselineTop: 138.38, width: 339.9,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'left',
        overflowStrategy: 'flow',
        flowRegions: [
          { page: 0, left: 217.7, baselineTop: 138.38, width: 339.9, maxLines: 1 },
          {
            page: 0, left: 56.6, baselineTop: 148.70, width: 501.0, maxLines: 1,
            maxFontSize: 9.5, generated: true, reviewStatus: 'approved',
            drawUnderline: true, underlineThickness: 0.36, underlineOffset: 1.6
          }
        ]
      },

      // ── §1 Присоединение ──────────────────────────────────────────────────
      check('accessionBrokerage', 'check.accession-brokerage', true, 0, 56.6, 177.98),
      check('accessionDepository', 'check.accession-depository', true, 0, 56.6, 198.86),

      // ── §2 Счёт депо / торговый счёт депо ─────────────────────────────────
      // Mutually exclusive: three definitions share one normalised value.
      check('depoOwner', 'extra.depo-account-type', 'owner', 0, 56.6, 249.5),
      check('depoNominee', 'extra.depo-account-type', 'nominee', 0, 56.6, 260.3),
      check('depoTrustee', 'extra.depo-account-type', 'trustee', 0, 56.6, 271.85),

      check('tradingDepoOwner', 'extra.trading-depo-account-type', 'owner', 0, 56.6, 302.69),
      check('tradingDepoNominee', 'extra.trading-depo-account-type', 'nominee', 0, 56.6, 313.97),
      check('tradingDepoTrustee', 'extra.trading-depo-account-type', 'trustee', 0, 56.6, 325.25),

      check('depoOperator', 'check.depo-operator', true, 0, 56.6, 345.89),

      // ── §3 Способ получения отчётов ───────────────────────────────────────
      check('reportsOffice', 'extra.report-delivery', 'office', 0, 56.6, 396.53),
      check('reportsPost', 'extra.report-delivery', 'post', 0, 56.6, 407.81),
      check('reportsEmail', 'extra.report-delivery', 'email', 0, 56.6, 419.09),
      check('reportsEdo', 'extra.report-delivery', 'edo', 0, 56.6, 430.37),
      {
        // Address printed on the "По электронной почте ______" line. It belongs
        // to that delivery option only, so it stays blank whenever another
        // method (офис / почта / ЭДО) is selected.
        id: 'reportEmail',
        source: 'subject.email', optional: true,
        showWhen: { source: 'extra.report-delivery', equals: 'email' },
        page: 0, left: 149.4, baselineTop: 419.09, width: 93.4,
        font: 'legalSerif', fontSize: SIZE_10_5, minFontSize: MIN, align: 'left'
      },

      // ── §4 Рынки и тарифные планы ─────────────────────────────────────────
      check('marketStock', 'check.market-stock', true, 0, 62.1, 471.07),
      check('marketDerivatives', 'check.market-derivatives', true, 0, 62.1, 516.19),
      check('marketCurrency', 'check.market-currency', true, 0, 62.1, 531.91),
      // Tariff values sit after the printed "Тарифный план:" label on the same
      // line. The label ends at ~505.8 pt; the text block ends at ~557.6 pt.
      {
        id: 'tariffStock',
        source: 'extra.tariff-stock', optional: true,
        page: 0, left: 506.8, baselineTop: 470.35, width: 50.8,
        font: 'legalSerif', fontSize: SIZE_9, minFontSize: MIN, align: 'left'
      },
      {
        id: 'tariffDerivatives',
        source: 'extra.tariff-derivatives', optional: true,
        page: 0, left: 506.5, baselineTop: 511.15, width: 51.1,
        font: 'legalSerif', fontSize: SIZE_9, minFontSize: MIN, align: 'left'
      },
      {
        id: 'tariffCurrency',
        source: 'extra.tariff-currency', optional: true,
        page: 0, left: 506.5, baselineTop: 531.19, width: 51.1,
        font: 'legalSerif', fontSize: SIZE_9, minFontSize: MIN, align: 'left'
      },

      // ── §5 Соглашения ─────────────────────────────────────────────────────
      check('agreementEsign', 'check.agreement-esignature', true, 0, 62.1, 602.11),
      check('agreementQuik', 'check.agreement-quik', true, 0, 62.1, 613.15),

      // ── §6 Перечисление доходов по ценным бумагам ─────────────────────────
      check('payoutBrokerAccount', 'extra.income-payout', 'broker-account', 0, 58.8, 653.5),
      check('payoutBankDetails', 'extra.income-payout', 'bank-details', 0, 58.8, 674.26),

      // ── Page 2 — §16 contact table, client column ─────────────────────────
      // The right-hand column holds the broker's own fixed contacts and is
      // already printed in the template.
      //
      // NOTE: the checkbox glyph at (225.3, 597.91) on this page belongs to the
      // sentence "Проставление любого символа в графе ☐ означает согласие…".
      // It is explanatory text, NOT a fillable control, and is intentionally
      // absent from this map.
      {
        id: 'clientPhone',
        source: 'subject.phone',
        page: 1, left: 101.5, baselineTop: 700.9, width: 193.0,
        font: 'legalSerif', fontSize: SIZE_9_5, minFontSize: MIN, align: 'left'
      },
      {
        id: 'clientEmail',
        source: 'subject.email',
        page: 1, left: 139.6, baselineTop: 712.78, width: 155.0,
        font: 'legalSerif', fontSize: SIZE_10_5, minFontSize: MIN, align: 'left'
      },

      // ── Page 2 — signature block ──────────────────────────────────────────
      // Printed as:  "_____"__________" 20____ г.
      {
        id: 'signDay',
        source: 'field.documentDateRu', format: 'dateDay',
        page: 1, left: 309.8, baselineTop: 732.82, width: 21.3,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center'
      },
      {
        // The template already prints "20", so only the month name belongs
        // here; the two remaining year digits go in the next slot.
        id: 'signMonth',
        source: 'field.documentDateRu', format: 'monthOnly',
        page: 1, left: 334.5, baselineTop: 732.82, width: 42.5,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center'
      },
      {
        id: 'signYear',
        source: 'field.documentDateRu', format: 'dateYear2',
        page: 1, left: 391.0, baselineTop: 732.82, width: 17.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center'
      },
      // The long rule before the parentheses is where the client signs by hand
      // and is deliberately left empty. Only the printed name is drawn.
      {
        // Only 46.68 pt between the printed parentheses (measured: 400.28 to
        // 446.96), which at the 9 pt readability floor holds about ten Cyrillic
        // characters — the printed convention here is "Фамилия И.О." anyway.
        //
        // A long hyphenated surname needs more than that, and the area directly
        // under the parentheses is blank down to the page margin («Подпись»
        // ends at 764.06 and «М.П.» sits to the right, from x 453.34). One
        // reviewed continuation line therefore sits under the parentheses, the
        // same width and centred the same way, so the transcript continues
        // inside the signature block instead of failing. The surname keeps its
        // own hyphen as the break, so nothing is abbreviated or invented.
        id: 'signatureName',
        label: 'Расшифровка подписи',
        source: 'field.clientFullName', format: 'initials', fallbacks: ['surname'],
        page: 1, left: 400.3, baselineTop: 752.38, width: 46.7,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center',
        overflowStrategy: 'flow',
        flowRegions: [
          { page: 1, left: 400.3, baselineTop: 752.38, width: 46.7, maxLines: 1 },
          {
            page: 1, left: 400.3, baselineTop: 778.00, width: 46.7, maxLines: 1,
            align: 'center', maxFontSize: 9.5,
            generated: true, reviewStatus: 'approved',
            drawUnderline: true, underlineThickness: 0.36, underlineOffset: 1.6
          }
        ]
      }

      // ── Page 3 — "Заполняется ООО «Инвестика»" ────────────────────────────
      // Registration number, contract numbers/dates, internal client code and
      // the officer's position/name/signature are completed by Investica staff
      // after printing. Left blank by design — see docs/document-pdf-generation.md.
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
