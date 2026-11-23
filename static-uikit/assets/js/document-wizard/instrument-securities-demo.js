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
    var levels = asset.assetId === exampleBond && bondExamples[date];
    var quotes = (levels || []).map(function (value, i) {
      return { assetId: asset.assetId, date: date, value: value, currency: 'RUB',
        unit: 'per-security', section: asset.aliases[i].section, source: exampleSource };
    });
    var terms = levels && date !== '2026-11-25' ? { date: date, currency: 'RUB', unit: 'per-security',
      nominal: '1000', formula: 'bond-percent', amountBasis: 'dirty', source: exampleSource } : null;
    return { quotes: quotes, terms: terms };
  };

}(typeof window !== 'undefined' ? window : this));
