// Field map — ПРИЛОЖЕНИЕ 1В К РЕГЛАМЕНТУ.
// ЗАЯВЛЕНИЕ О ПРИСОЕДИНЕНИИ (ДЛЯ ЮРИДИЧЕСКИХ ЛИЦ).
//
// Base template : assets/document-pdf-templates/accession-application-yul.pdf
// Source Word   : "ПРИЛОЖЕНИЕ 1В К РЕГЛАМЕНТУ. ЗАЯВЛЕНИЕ О ПРИСОЕДИНЕНИИ (ЮЛ).docx"
// Source SHA-256: D92604FAFE61C4CBA0B48A65AE7A17D488F038A493DF3DFD2EE5F12137437BD7
// Pages         : 2 (A4, 595.32 × 841.92 pt; no AcroForm/widgets)
//
// This is the legal-entity counterpart of the approved Appendix 1А map. All
// coordinates were measured independently from this two-page export with
// PyMuPDF; page/line positions are not copied from Appendix 1А.

(function (global) {
  'use strict';

  var BODY = 8.52;
  var TABLE = 9;
  var MIN = 6;

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
    id: 'accession-application-yul',
    title: 'Заявление о присоединении (ЮЛ)',
    templateUrl: '../assets/document-pdf-templates/accession-application-yul.pdf',
    outputFilename: 'zayavlenie-o-prisoedinenii-yul.pdf',
    expectedPages: 2,
    appliesTo: ['company'],

    fonts: {
      legalSerif: '../assets/fonts/pdf/LiberationSerif-Regular.ttf'
    },

    fields: [
      // ── Page 1 — applicant details ─────────────────────────────────────
      // These labels have no underscore glyphs. Each left edge is the measured
      // end of its printed label plus a small typing gap; the right edge is the
      // same 529.4 pt body-text boundary used by the source.
      {
        id: 'companyFullLegalName',
        source: 'field.client-full-legal-name',
        page: 0, left: 218.0, baselineTop: 101.78, width: 311.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true
      },

      // "Наименование на иностранном языке" is explicitly for a
      // nonresident. The current normalized company data has no trusted
      // residency branch, so a resident company's `englishName` is not printed
      // here. The line deliberately remains blank rather than guessing.
      {
        id: 'companyOgrn',
        source: 'field.client-ogrn',
        page: 0, left: 224.0, baselineTop: 131.18, width: 305.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'companyLegalAddress',
        source: 'field.client-legal-address',
        page: 0, left: 84.5, baselineTop: 150.74, width: 444.5,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        // One source slot asks for both values. buildFields supplies the
        // normalized "<full name>, <role>" string for the selected signatory,
        // allowing one shrink-to-fit decision instead of two overlapping boxes.
        id: 'representativeSignerLine',
        source: 'field.representativeSignerLine',
        page: 0, left: 174.0, baselineTop: 160.46, width: 355.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'representativeAuthority',
        source: 'field.representativeAuthority',
        page: 0, left: 215.0, baselineTop: 170.18, width: 314.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left', required: true
      },

      // ── §1 Joining the agreements ──────────────────────────────────
      check('accessionBrokerage', 'check.accession-brokerage', true, 0, 56.6, 229.58),
      check('accessionDepository', 'check.accession-depository', true, 0, 56.6, 250.34),

      // ── §2 Depo / trading-depo account type ─────────────────────────
      check('depoOwner', 'extra.depo-account-type', 'owner', 0, 56.6, 300.53),
      check('depoNominee', 'extra.depo-account-type', 'nominee', 0, 56.6, 311.57),
      check('depoTrustee', 'extra.depo-account-type', 'trustee', 0, 56.6, 322.61),

      check('tradingDepoOwner', 'extra.trading-depo-account-type', 'owner', 0, 56.6, 353.09),
      check('tradingDepoNominee', 'extra.trading-depo-account-type', 'nominee', 0, 56.6, 364.13),
      check('tradingDepoTrustee', 'extra.trading-depo-account-type', 'trustee', 0, 56.6, 375.17),

      check('depoOperator', 'check.depo-operator', true, 0, 56.6, 395.93),

      // ── §3 Report delivery ───────────────────────────────────────────
      check('reportsOffice', 'extra.report-delivery', 'office', 0, 56.6, 436.37),
      check('reportsPost', 'extra.report-delivery', 'post', 0, 56.6, 447.43),
      check('reportsEmail', 'extra.report-delivery', 'email', 0, 56.6, 458.35),
      check('reportsEdo', 'extra.report-delivery', 'edo', 0, 56.6, 469.39),
      {
        id: 'reportEmail',
        source: 'subject.email', optional: true,
        showWhen: { source: 'extra.report-delivery', equals: 'email' },
        page: 0, left: 155.4, baselineTop: 458.35, width: 93.4,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'left'
      },

      // ── §4 Markets and tariff plans ───────────────────────────────────
      check('marketStock', 'check.market-stock', true, 0, 62.1, 510.31),
      check('marketDerivatives', 'check.market-derivatives', true, 0, 62.1, 555.43),
      check('marketCurrency', 'check.market-currency', true, 0, 62.1, 571.15),
      // The tariff column is only 77.52 pt wide. Values are placed in the
      // measured empty line below its printed "Тарифный план:" label.
      {
        id: 'tariffStock',
        source: 'extra.tariff-stock', optional: true,
        page: 0, left: 471.5, baselineTop: 533.5, width: 71.5,
        font: 'legalSerif', fontSize: 7.5, minFontSize: MIN,
        align: 'center'
      },
      {
        id: 'tariffDerivatives',
        source: 'extra.tariff-derivatives', optional: true,
        page: 0, left: 471.5, baselineTop: 559.0, width: 71.5,
        font: 'legalSerif', fontSize: 7.0, minFontSize: MIN,
        align: 'center'
      },
      {
        id: 'tariffCurrency',
        source: 'extra.tariff-currency', optional: true,
        page: 0, left: 471.5, baselineTop: 593.0, width: 71.5,
        font: 'legalSerif', fontSize: 7.5, minFontSize: MIN,
        align: 'center'
      },

      // ── §5 Agreements ─────────────────────────────────────────────────
      check('agreementEsign', 'check.agreement-esignature', true, 0, 62.1, 641.38),
      check('agreementQuik', 'check.agreement-quik', true, 0, 62.1, 652.42),

      // ── §6 Securities-income destination ───────────────────────────────
      check('payoutBrokerAccount', 'extra.income-payout', 'broker-account', 0, 58.8, 692.74),
      check('payoutBankDetails', 'extra.income-payout', 'bank-details', 0, 61.0, 723.34),

      // ── Page 2 — client contacts ─────────────────────────────────────
      {
        id: 'clientPhone',
        source: 'subject.phone',
        page: 1, left: 102.0, baselineTop: 464.35, width: 191.5,
        font: 'legalSerif', fontSize: TABLE, minFontSize: MIN,
        align: 'left', required: true
      },
      {
        id: 'clientEmail',
        source: 'subject.email',
        page: 1, left: 140.0, baselineTop: 476.23, width: 153.5,
        font: 'legalSerif', fontSize: TABLE, minFontSize: MIN,
        align: 'left', required: true
      },

      // ── Page 2 — client date and printed signer name ─────────────────────
      {
        id: 'signDay',
        source: 'field.documentDateRu', format: 'dateDay',
        page: 1, left: 60.1, baselineTop: 496.39, width: 21.3,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'signMonth',
        source: 'field.documentDateRu', format: 'monthOnly',
        page: 1, left: 84.8, baselineTop: 496.39, width: 42.5,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        id: 'signYear',
        source: 'field.documentDateRu', format: 'dateYear2',
        page: 1, left: 141.4, baselineTop: 496.39, width: 17.0,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      },
      {
        // The long rule is for a handwritten signature. Only the short name
        // inside parentheses is typed. The source hard-codes the adjacent role
        // as "Генеральный директор" and is preserved verbatim.
        id: 'signatureName',
        source: 'field.representativeFullName', format: 'initials', fallbacks: ['surname'],
        page: 1, left: 393.1, baselineTop: 535.51, width: 46.7,
        font: 'legalSerif', fontSize: BODY, minFontSize: MIN,
        align: 'center', required: true
      }

      // The checkbox at (212.0, 361.25) is explanatory prose, not a control.
      // The entire "Заполняется ООО «Инвестика»" table (page 2, y >= 575.83)
      // is completed later by staff and intentionally remains blank.
    ]
  };

  global.CRMDocumentEngine = global.CRMDocumentEngine || {};
  global.CRMDocumentEngine.fieldMaps = global.CRMDocumentEngine.fieldMaps || {};
  global.CRMDocumentEngine.fieldMaps[TEMPLATE.id] = TEMPLATE;

}(typeof window !== 'undefined' ? window : this));
