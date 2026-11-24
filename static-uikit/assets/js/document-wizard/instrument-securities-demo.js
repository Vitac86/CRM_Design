// Small offline fixture catalog. The local HTTP preview serves these records by ID only.
(function (global) {
  'use strict';
  global.CRMOrderDemoSecurities = [
    {
      assetId: 'A-100001',
      shortName: 'Сбербанк ао',
      displayName: 'ПАО Сбербанк — акция обыкновенная',
      isin: 'RU0009029540',
      issuerName: 'ПАО Сбербанк',
      kind: 'share-ordinary',
      series: null,
      // Four Securities rows, one Asset: the search must still offer it once.
      aliases: [
        // The only place a `SecurityName` shape appears in this repository.
        // Kept as documentation of the production join and read by nothing.
        { code: 'SBER', section: 'MOEX SM: T+', qortSecurityName: 'SBER, акция обыкновенная in MOEX SM: T+ (TQBR)' },
        { code: 'SBER', section: 'MOEX SM: РПС' },
        { code: 'SBER', section: 'MOEX SM: РЕПО' },
        { code: 'SBER', section: 'Внебиржевой рынок' }
      ]
    },
    {
      assetId: 'A-100002',
      shortName: 'Сбербанк ап',
      displayName: 'ПАО Сбербанк — акция привилегированная',
      isin: 'RU0009029557',
      issuerName: 'ПАО Сбербанк',
      kind: 'share-preferred',
      series: null,
      aliases: [
        { code: 'SBERP', section: 'MOEX SM: T+' },
        { code: 'SBERP', section: 'MOEX SM: РПС' }
      ]
    },
    {
      assetId: 'A-100003',
      shortName: 'Газпром ао',
      displayName: 'ПАО «Газпром» — акция обыкновенная',
      isin: 'RU0007661625',
      issuerName: 'ПАО «Газпром»',
      kind: 'share-ordinary',
      series: null,
      aliases: [
        { code: 'GAZP', section: 'MOEX SM: T+' },
        { code: 'GAZP', section: 'MOEX SM: РЕПО' }
      ]
    },
    {
      assetId: 'A-100004',
      shortName: 'Транснефть ап',
      displayName: 'ПАО «Транснефть» — акция привилегированная',
      isin: 'RU0009091573',
      issuerName: 'ПАО «Транснефть»',
      kind: 'share-preferred',
      series: null,
      aliases: [{ code: 'TRNFP', section: 'MOEX SM: T+' }]
    },
    {
      // The long-value case for the printed description: a corporate bond
      // prints kind + series + ISIN and is the row that fills both its lines.
      assetId: 'A-200001',
      shortName: 'КИБ-СН-ЭКВ 001Р-3',
      displayName: 'АО «Корпоративный инвестиционный банк» — облигация',
      isin: 'RU000A10CXA6',
      issuerName: 'АО «Корпоративный инвестиционный банк»',
      kind: 'bond-corporate',
      series: 'CIB-SN-EQ-001S-3',
      aliases: [
        { code: 'RU000A10CXA6', section: 'MOEX SM: T+' },
        { code: 'CIBSN3', section: 'MOEX SM: РПС' }
      ]
    },
    {
      assetId: 'A-200002',
      shortName: 'ОФЗ 26238',
      displayName: 'Облигация федерального займа 26238',
      isin: 'RU000A1038V6',
      issuerName: 'Министерство финансов Российской Федерации',
      kind: 'bond-government',
      series: '26238',
      aliases: [
        { code: 'SU26238RMFS4', section: 'MOEX SM: T+' },
        { code: 'SU26238RMFS4', section: 'MOEX SM: РЕПО' }
      ]
    },
    {
      assetId: 'A-300001',
      shortName: 'Фонд Российские акции',
      displayName: 'БПИФ «Российские акции» — инвестиционный пай',
      isin: 'RU000A101NZ2',
      issuerName: 'АО УК «Инвестика Капитал»',
      kind: 'fund-unit',
      series: null,
      aliases: [
        { code: 'TMOS', section: 'MOEX SM: T+' },
        { code: 'TMOS', section: 'Внебиржевой рынок' }
      ]
    },
    {
      assetId: 'A-300002',
      shortName: 'Фонд Денежный рынок',
      displayName: 'БПИФ «Денежный рынок» — инвестиционный пай',
      isin: 'RU000A104172',
      issuerName: 'АО УК «Инвестика Капитал»',
      kind: 'fund-unit',
      series: null,
      aliases: [{ code: 'LQDT', section: 'MOEX SM: T+' }]
    }
  ];
  // These rows reproduce the acceptance example only. They are not QORT facts about this ISIN.
  var exampleBond = 'A-200002';
  var exampleSource = 'Демоданные · пример из ТЗ';
  var bondExamples = {
    '2026-11-23': ['12.34', '12.34'],
    '2026-11-24': ['0', '0.00'],
    '2026-11-25': ['12.34', '12.35']
  };
  global.CRMOrderDemoBondData = function (asset, date) {
    if (!date || !/^bond-/.test(asset.kind)) return {quotes:[],terms:null};
    var levels = asset.assetId === exampleBond ? bondExamples[date] : null;
    var primary = levels && levels[0], otc = levels && levels[1];
    var section = primary != null ? 1 : otc != null ? 101 : null;
    var value = primary ?? otc ?? '0';
    var currency = asset.calculation && asset.calculation.currency || (asset.assetId === exampleBond ? 'RUB' : '');
    var quote = {assetId:asset.assetId,date:date,value:value,currency:currency,unit:'per-security',
      section:section === 1 ? 'МБ ФР: T+' : section === 101 ? 'МБ ФР: OTC: Облигации с ЦК' : '',
      sourceSectionId:section,sourceStatus:section === 1 ? 'PRIMARY_TPLUS' : section === 101 ? 'FALLBACK_OTC_101' : 'DEFAULT_ZERO',
      source:exampleSource + (section ? ' · секция '+section : ' · нет НКД в секциях 1 и 101')};
    var terms = levels ? {date:date,currency:'RUB',unit:'per-security',nominal:'1000',
      formula:'bond-percent',amountBasis:'dirty',source:exampleSource} : null;
    return {quotes:[quote],terms:terms};
  };

}(typeof window !== 'undefined' ? window : this));
