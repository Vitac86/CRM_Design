// Instrument reference data for the Document Wizard — STATIC MOCK.
//
// THIS FILE IS THE REPLACEMENT POINT. Everything a manager may pick as a
// traded instrument is looked up through `window.CRMInstrumentCatalog`; no
// page, event handler or field map hardcodes an instrument anywhere else.
// When the backend wires QORT up, only the three arrays below and the three
// `search*` functions have to become API calls — the wizard, the payload
// contract and the field map stay exactly as they are.
//
// ── The QORT model this mock stands in for ───────────────────────────────────
//
// A security is an **Asset**, not a trading instrument:
//
//   Assets                 the master object. `AssetID` is the stable id the
//                          wizard stores and the backend will keep.
//   Assets.EmitentFirm_ID  → Firms — the issuer. Mocked here as `issuerName`.
//   Securities             one row per instrument the asset trades as: the
//                          same share exists in T+, RPS, REPO and OTC
//                          sections, each with its own row and its own
//                          `SecurityName`. Those rows are search ALIASES, not
//                          separate results: search deduplicates by AssetID so
//                          one share is offered once.
//
// `Securities.SecurityName` («SBER … in MOEX SM: T+ …») is a technical
// composition of code + section. It is never shown to a manager and never
// printed: one alias below carries a real-shaped sample only to document what
// the production join returns, and nothing reads it. The printed description
// is built by `describeSecurity()` from the asset's own attributes.
//
// A form's selected security is deliberately NOT bound to a trading section
// (`TSSection_ID`): the order carries the Asset, and REPO / SWAP are separate
// order parameters the manager answers Yes/No to.
//
// Fictional demo data. Codes and ISINs are realistic in shape so the printed
// form can be reviewed; no market data is implied.

(function (global) {
  'use strict';

  // ── Securities — Assets, deduplicated by AssetID ───────────────────────────
  //
  //   assetId       Assets.AssetID — the stable identifier the wizard stores
  //   shortName     the compact name a manager recognises
  //   displayName   the fuller name shown in the result row and summary card
  //   isin          Assets.ISIN
  //   issuerName    Assets.EmitentFirm_ID → Firms.Name
  //   kind          drives the printed legal noun (see SECURITY_KIND_LABELS)
  //   series        выпуск / серия — printed only where the kind needs it
  //   aliases       Securities rows: the trading codes this asset is found by
  var SECURITY_ASSETS = [
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

  // The printed legal noun. The form asks for «Вид, категория (тип), выпуск,
  // транш, серия», so this is the vocabulary the description is built from.
  var SECURITY_KIND_LABELS = {
    'share-ordinary': 'Акции обыкновенные',
    'share-preferred': 'Акции привилегированные',
    'bond-corporate': 'Корпоративные облигации',
    'bond-government': 'Облигации федерального займа',
    'fund-unit': 'Паи',
    'depositary-receipt': 'Депозитарные расписки'
  };

  // Series/выпуск belongs on a debt instrument's description and is noise on a
  // share, whose category already identifies it.
  var KINDS_WITH_SERIES = ['bond-corporate', 'bond-government'];

  // ── Currency market — QORT `Securities` rows of the FX/metals sections ─────
  var FX_INSTRUMENTS = [
    { fxId: 'FX-1001', code: 'USDRUB_TOM', shortName: 'USD/RUB TOM',
      displayName: 'Доллар США — рубль, TOM', base: 'USD', quote: 'RUB' },
    { fxId: 'FX-1002', code: 'USDRUB_TOD', shortName: 'USD/RUB TOD',
      displayName: 'Доллар США — рубль, TOD', base: 'USD', quote: 'RUB' },
    { fxId: 'FX-1003', code: 'EURRUB_TOM', shortName: 'EUR/RUB TOM',
      displayName: 'Евро — рубль, TOM', base: 'EUR', quote: 'RUB' },
    { fxId: 'FX-1004', code: 'CNYRUB_TOM', shortName: 'CNY/RUB TOM',
      displayName: 'Китайский юань — рубль, TOM', base: 'CNY', quote: 'RUB' },
    { fxId: 'FX-1005', code: 'EURUSD_TOM', shortName: 'EUR/USD TOM',
      displayName: 'Евро — доллар США, TOM', base: 'EUR', quote: 'USD' },
    // The form's row reads «валютного инструмента / инструмента драг. металлов».
    { fxId: 'FX-2001', code: 'GLDRUB_TOM', shortName: 'GLD/RUB TOM',
      displayName: 'Золото — рубль, TOM', base: 'GLD', quote: 'RUB' },
    { fxId: 'FX-2002', code: 'SLVRUB_TOM', shortName: 'SLV/RUB TOM',
      displayName: 'Серебро — рубль, TOM', base: 'SLV', quote: 'RUB' }
  ];

  // ── Derivatives market ─────────────────────────────────────────────────────
  //
  // Kept deliberately compact: «Наименование ПФИ» is a one-line slot on the
  // authoritative form, so a mock name that cannot be printed would be a mock
  // of nothing. Options carry a strike, futures do not.
  var DERIVATIVE_INSTRUMENTS = [
    { derivativeId: 'DR-3001', code: 'Si-12.26', kind: 'future',
      name: 'Фьючерс на курс USD/RUB', underlying: 'USD/RUB',
      strike: null, expiry: '2026-12-17' },
    { derivativeId: 'DR-3002', code: 'RI-12.26', kind: 'future',
      name: 'Фьючерс на Индекс РТС', underlying: 'RTSI',
      strike: null, expiry: '2026-12-17' },
    { derivativeId: 'DR-3003', code: 'SR-12.26', kind: 'future',
      name: 'Фьючерс на акции Сбербанка', underlying: 'SBER',
      strike: null, expiry: '2026-12-17' },
    { derivativeId: 'DR-4001', code: 'Si-12.26M181226CA95000', kind: 'option-call',
      name: 'Опцион call на фьючерс Si-12.26', underlying: 'Si-12.26',
      strike: '95000', expiry: '2026-12-18' },
    { derivativeId: 'DR-4002', code: 'Si-12.26M181226PA90000', kind: 'option-put',
      name: 'Опцион put на фьючерс Si-12.26', underlying: 'Si-12.26',
      strike: '90000', expiry: '2026-12-18' },
    { derivativeId: 'DR-4003', code: 'RI-12.26M181226PA95000', kind: 'option-put',
      name: 'Опцион put на фьючерс RI-12.26', underlying: 'RI-12.26',
      strike: '95000', expiry: '2026-12-18' }
  ];

  var DERIVATIVE_KIND_LABELS = {
    future: 'Фьючерсный контракт',
    'option-call': 'Опцион call',
    'option-put': 'Опцион put'
  };

  // ── Search ────────────────────────────────────────────────────────────────

  // Two characters is where a ticker starts to mean something; twenty rows is
  // as far as a manager reads before typing one more character.
  var MIN_QUERY_LENGTH = 2;
  var MAX_RESULTS = 20;

  function norm(value) {
    return String(value == null ? '' : value)
      .toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim();
  }

  // Ranking, best first. The business order is: an exact ISIN is unambiguous,
  // then an exact trading code, then the prefixes a manager actually types,
  // then a name or issuer appearing anywhere.
  var RANK_ISIN_EXACT = 0;
  var RANK_CODE_EXACT = 1;
  var RANK_CODE_PREFIX = 2;
  var RANK_SHORT_PREFIX = 3;
  var RANK_NAME = 4;
  var RANK_ISSUER = 5;
  var RANK_NONE = 99;

  function rankSecurity(asset, query) {
    var codes = (asset.aliases || []).map(function (alias) { return norm(alias.code); });
    var isin = norm(asset.isin);
    var shortName = norm(asset.shortName);
    var displayName = norm(asset.displayName);
    var issuer = norm(asset.issuerName);

    if (isin && isin === query) return RANK_ISIN_EXACT;
    if (codes.indexOf(query) !== -1) return RANK_CODE_EXACT;
    if (codes.some(function (code) { return code.indexOf(query) === 0; })) return RANK_CODE_PREFIX;
    if (shortName.indexOf(query) === 0) return RANK_SHORT_PREFIX;
    if (isin.indexOf(query) === 0) return RANK_CODE_PREFIX;
    if (shortName.indexOf(query) !== -1 || displayName.indexOf(query) !== -1) return RANK_NAME;
    if (issuer.indexOf(query) !== -1) return RANK_ISSUER;
    if (codes.some(function (code) { return code.indexOf(query) !== -1; })) return RANK_NAME;
    return RANK_NONE;
  }

  // One row per Asset even when several Securities aliases match: the list is
  // built from the assets, so a match on any alias contributes a single result.
  function searchSecurities(query, limit) {
    var q = norm(query);
    if (q.length < MIN_QUERY_LENGTH) return [];
    var scored = [];
    SECURITY_ASSETS.forEach(function (asset, index) {
      var rank = rankSecurity(asset, q);
      if (rank === RANK_NONE) return;
      scored.push({ asset: asset, rank: rank, index: index });
    });
    scored.sort(function (a, b) {
      return a.rank !== b.rank ? a.rank - b.rank : a.index - b.index;
    });
    return scored.slice(0, limit || MAX_RESULTS).map(function (entry) { return entry.asset; });
  }

  function rankSimple(haystacks, query) {
    for (var i = 0; i < haystacks.length; i += 1) {
      var value = norm(haystacks[i]);
      if (!value) continue;
      if (value === query) return RANK_CODE_EXACT;
      if (value.indexOf(query) === 0) return RANK_CODE_PREFIX;
      if (value.indexOf(query) !== -1) return RANK_NAME;
    }
    return RANK_NONE;
  }

  function searchList(items, haystacksOf, query, limit) {
    var q = norm(query);
    if (q.length < MIN_QUERY_LENGTH) return [];
    var scored = [];
    items.forEach(function (item, index) {
      var rank = rankSimple(haystacksOf(item), q);
      if (rank === RANK_NONE) return;
      scored.push({ item: item, rank: rank, index: index });
    });
    scored.sort(function (a, b) {
      return a.rank !== b.rank ? a.rank - b.rank : a.index - b.index;
    });
    return scored.slice(0, limit || MAX_RESULTS).map(function (entry) { return entry.item; });
  }

  function searchFxInstruments(query, limit) {
    return searchList(FX_INSTRUMENTS, function (item) {
      return [item.code, item.shortName, item.displayName,
              item.base + '/' + item.quote, item.base, item.quote];
    }, query, limit);
  }

  function searchDerivatives(query, limit) {
    return searchList(DERIVATIVE_INSTRUMENTS, function (item) {
      return [item.code, item.name, item.underlying,
              DERIVATIVE_KIND_LABELS[item.kind] || ''];
    }, query, limit);
  }

  // ── Lookup by stored id ───────────────────────────────────────────────────

  function findBy(items, key, id) {
    var wanted = String(id == null ? '' : id).trim();
    if (!wanted) return null;
    for (var i = 0; i < items.length; i += 1) {
      if (String(items[i][key]) === wanted) return items[i];
    }
    return null;
  }

  function getSecurity(assetId) { return findBy(SECURITY_ASSETS, 'assetId', assetId); }
  function getFxInstrument(fxId) { return findBy(FX_INSTRUMENTS, 'fxId', fxId); }
  function getDerivative(id) { return findBy(DERIVATIVE_INSTRUMENTS, 'derivativeId', id); }

  // ── Printable values ──────────────────────────────────────────────────────

  // «Вид, категория (тип), выпуск, транш, серия, ISIN/CFI» — the compact legal
  // description the row is sized for. CFI is deliberately absent: it carries
  // nothing a reader of this order needs and would cost one of the two lines.
  // The long `Assets.Name` is not printed either — the category plus the ISIN
  // identifies the paper exactly.
  //
  //   Акции обыкновенные, ISIN RU0009029540
  //   Корпоративные облигации, серия CIB-SN-EQ-001S-3, ISIN RU000A10CXA6
  function describeSecurity(asset) {
    if (!asset) return '';
    var parts = [SECURITY_KIND_LABELS[asset.kind] || 'Ценные бумаги'];
    if (asset.series && KINDS_WITH_SERIES.indexOf(asset.kind) !== -1) {
      parts.push('серия ' + asset.series);
    }
    if (asset.isin) parts.push('ISIN ' + asset.isin);
    return parts.join(', ');
  }

  function securityKindLabel(asset) {
    return (asset && SECURITY_KIND_LABELS[asset.kind]) || '';
  }

  function primaryCode(asset) {
    var alias = asset && (asset.aliases || [])[0];
    return alias ? alias.code : '';
  }

  // «Наименование валютного инструмента / инструмента драг. металлов».
  function describeFxInstrument(item) {
    if (!item) return '';
    return item.displayName + ' (' + item.code + ')';
  }

  function derivativeKindLabel(item) {
    return (item && DERIVATIVE_KIND_LABELS[item.kind]) || '';
  }

  // «Наименование ПФИ» — a one-line slot, so name plus code and nothing else.
  function describeDerivative(item) {
    if (!item) return '';
    return item.name + ' (' + item.code + ')';
  }

  // ── The rows a selected instrument shows in its read-only summary card ─────
  //
  // Returned as data rather than markup so the wizard owns the presentation
  // and this file stays a data source.
  function summarizeSecurity(asset) {
    if (!asset) return [];
    return [
      { label: 'Наименование', value: asset.displayName },
      { label: 'Торговый код', value: primaryCode(asset) },
      { label: 'ISIN', value: asset.isin },
      { label: 'Эмитент', value: asset.issuerName },
      { label: 'Вид ценной бумаги', value: securityKindLabel(asset) },
      { label: 'Для печати в поручении', value: describeSecurity(asset) }
    ].filter(function (row) { return !!row.value; });
  }

  function summarizeFxInstrument(item) {
    if (!item) return [];
    return [
      { label: 'Инструмент', value: item.displayName },
      { label: 'Код инструмента', value: item.code },
      { label: 'Валютная пара', value: item.base + '/' + item.quote }
    ].filter(function (row) { return !!row.value; });
  }

  function summarizeDerivative(item) {
    if (!item) return [];
    return [
      { label: 'Вид инструмента', value: derivativeKindLabel(item) },
      { label: 'Наименование', value: item.name },
      { label: 'Код контракта', value: item.code },
      { label: 'Базовый актив', value: item.underlying },
      { label: 'Цена исполнения (страйк)', value: item.strike },
      { label: 'Дата исполнения', value: item.expiry }
    ].filter(function (row) { return !!row.value; });
  }

  // ── One lookup surface, keyed by catalog name ─────────────────────────────
  //
  // A wizard field says `catalog: 'securities'` and never knows which array it
  // reads. Swapping an array for an API call is a change in this object only.
  var CATALOGS = {
    securities: {
      idKey: 'assetId',
      search: searchSecurities,
      get: getSecurity,
      // What one result row shows in the dropdown.
      resultTitle: function (asset) { return asset.shortName; },
      resultMeta: function (asset) {
        return [primaryCode(asset), asset.isin, asset.issuerName]
          .filter(Boolean).join(' · ');
      },
      summary: summarizeSecurity
    },
    fx: {
      idKey: 'fxId',
      search: searchFxInstruments,
      get: getFxInstrument,
      resultTitle: function (item) { return item.displayName; },
      resultMeta: function (item) {
        return [item.code, item.base + '/' + item.quote].filter(Boolean).join(' · ');
      },
      summary: summarizeFxInstrument
    },
    derivatives: {
      idKey: 'derivativeId',
      search: searchDerivatives,
      get: getDerivative,
      resultTitle: function (item) { return item.name; },
      resultMeta: function (item) {
        return [item.code, derivativeKindLabel(item), item.expiry]
          .filter(Boolean).join(' · ');
      },
      summary: summarizeDerivative
    }
  };

  global.CRMInstrumentCatalog = {
    MIN_QUERY_LENGTH: MIN_QUERY_LENGTH,
    MAX_RESULTS: MAX_RESULTS,

    SECURITY_ASSETS: SECURITY_ASSETS,
    FX_INSTRUMENTS: FX_INSTRUMENTS,
    DERIVATIVE_INSTRUMENTS: DERIVATIVE_INSTRUMENTS,

    catalog: function (name) { return CATALOGS[name] || null; },

    searchSecurities: searchSecurities,
    searchFxInstruments: searchFxInstruments,
    searchDerivatives: searchDerivatives,

    getSecurity: getSecurity,
    getFxInstrument: getFxInstrument,
    getDerivative: getDerivative,

    describeSecurity: describeSecurity,
    describeFxInstrument: describeFxInstrument,
    describeDerivative: describeDerivative,
    derivativeKindLabel: derivativeKindLabel,
    securityKindLabel: securityKindLabel,
    primaryCode: primaryCode
  };

}(typeof window !== 'undefined' ? window : this));
