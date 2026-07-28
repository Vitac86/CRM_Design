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

  var BODY = 8.52;          // body text size measured in the template
  var TABLE = 9;            // §16 contact table
  var MIN = 6.0;            // never shrink below this — below it stops looking typed

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
      glyphSize: BODY
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
      {
        id: 'passportIssuedBy',
        source: 'field.passportIssuedBy',
        page: 0, left: 56.6, baselineTop: 118.82, width: 352.6,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'left'
      },
      // The printed date reads «__» ______г. — day inside the quotes, month and
      // year after them. That slot is 38 pt wide, too narrow for a spelled-out
      // month ("апреля 2008" needs ~46 pt at 8.5 pt), so MM.YYYY is used.
      {
        id: 'passportIssueDay',
        source: 'field.passportIssueDate', format: 'dateDay',
        page: 0, left: 487.0, baselineTop: 118.82, width: 12.8,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center'
      },
      {
        id: 'passportIssueMonthYear',
        source: 'field.passportIssueDate', format: 'dateMonthYearShort',
        page: 0, left: 513.7, baselineTop: 118.82, width: 38.2,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center'
      },
      {
        id: 'registrationAddress',
        source: 'field.registrationAddress',
        page: 0, left: 217.7, baselineTop: 138.38, width: 339.9,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'left'
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
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'left'
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
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'left'
      },
      {
        id: 'tariffDerivatives',
        source: 'extra.tariff-derivatives', optional: true,
        page: 0, left: 506.5, baselineTop: 511.15, width: 51.1,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'left'
      },
      {
        id: 'tariffCurrency',
        source: 'extra.tariff-currency', optional: true,
        page: 0, left: 506.5, baselineTop: 531.19, width: 51.1,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'left'
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
        font: 'legalSerif', fontSize: TABLE, minFontSize: MIN, align: 'left'
      },
      {
        id: 'clientEmail',
        source: 'subject.email',
        page: 1, left: 139.6, baselineTop: 712.78, width: 155.0,
        font: 'legalSerif', fontSize: TABLE, minFontSize: MIN, align: 'left'
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
        // Only ~47 pt of rule between the parentheses — a full name does not
        // fit and the printed convention here is "Фамилия И.О." anyway. A very
        // long hyphenated surname falls back to the surname alone; if even that
        // does not fit, generation fails loudly rather than clipping the name.
        id: 'signatureName',
        source: 'field.clientFullName', format: 'initials', fallbacks: ['surname'],
        page: 1, left: 400.3, baselineTop: 752.38, width: 46.7,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN, align: 'center'
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
