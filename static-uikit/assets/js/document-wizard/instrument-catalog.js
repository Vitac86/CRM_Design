// Reference adapter for the Document Wizard. Securities use a stable AssetID.
// A configured HTTP endpoint serves ranked pages and selected cards. The static
// prototype loads its small offline fixture file. FX and derivatives use the
// existing local catalogs. QORT column mappings are deliberately left to the backend.
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
  var SECURITY_ASSETS = global.CRMOrderDemoSecurities || [];

  // The printed legal noun. The form asks for «Вид, категория (тип), выпуск,
  // транш, серия», so this is the vocabulary the description is built from.
  var SECURITY_KIND_LABELS = {
    'share-ordinary': 'Акции обыкновенные',
    'share-preferred': 'Акции привилегированные',
    'bond-corporate': 'Корпоративные облигации',
    'bond-government': 'Облигации федерального займа',
    'bond-regional': 'Облигации субъектов РФ',
    'bond-municipal': 'Муниципальные облигации',
    'bond-euro': 'Еврооблигации',
    'bond-central-bank': 'Облигации Банка России',
    'bond-foreign': 'Иностранные облигации',
    'bond-other': 'Облигации',
    'share-foreign': 'Иностранные акции',
    'share-other': 'Акции',
    'security-other': 'Ценные бумаги',
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

  // Demonstration specifications only. Live QORT must provide the quotation,
  // settlement basis and steps for the particular traded instrument.
  function demoSpec(formula, quantityUnit, detail) {
    return Object.assign({source:'demo-spec-2026-11', formula:formula, quantityUnit:quantityUnit,
      priceStep:'0.01', quantityStep:'1', currency:'RUB', minorDigits:2, rounding:'half-up'},detail);
  }
  SECURITY_ASSETS.forEach(function (item) {
    if (['share-ordinary','share-preferred','fund-unit'].includes(item.kind))
      item.calculation = demoSpec('unit','pieces');
    else if (item.kind.indexOf('bond-') === 0)
      item.calculation = demoSpec(null,'pieces'); // A dated detail may supply the actual quotation convention.
  });
  FX_INSTRUMENTS.filter(function (x) { return ['FX-1001','FX-1004'].includes(x.fxId); }).forEach(function (x) {
    x.calculation = demoSpec('fx','lots',{lotSize:'1000',quoteScale:'1',priceStep:'0.0001'});
  });
  DERIVATIVE_INSTRUMENTS.filter(function (x) { return x.kind === 'option-call'; }).forEach(function (x) {
    x.calculation = demoSpec('premium','contracts',{premiumMultiplier:'10'});
  });

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
    if (isin.indexOf(query) === 0) return RANK_CODE_PREFIX;
    if (shortName.indexOf(query) === 0) return RANK_SHORT_PREFIX;
    if (shortName.indexOf(query) !== -1 || displayName.indexOf(query) !== -1) return RANK_NAME;
    if (issuer.indexOf(query) !== -1) return RANK_ISSUER;
    if (codes.some(function (code) { return code.indexOf(query) !== -1; })) return RANK_NAME;
    return RANK_NONE;
  }

  // One row per Asset even when several Securities aliases match: the list is
  // built from the assets, so a match on any alias contributes a single result.
  function searchSecurities(query, limit) {
    return mockPage({q:query,limit:limit}).items.map(function (item) { return getSecurity(item.assetId); });
  }

  function mockPage(parameters) {
    var q = norm(parameters.q);
    var type = parameters.assetClass || 'security';
    var offset = Number(parameters.cursor || 0);
    var limit = Math.min(MAX_RESULTS, Number(parameters.limit || MAX_RESULTS));
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 ||
        !['security','share','fund','bond'].includes(type)) throw new Error('Некорректные параметры поиска.');
    if (q.length < MIN_QUERY_LENGTH) return { items: [], nextCursor: null };
    var hits = SECURITY_ASSETS.filter(function (a) {
      return type === 'security' || a.kind.split('-')[0] === type;
    }).map(function (asset) {
      return {asset:asset, rank:rankSecurity(asset,q)};
    }).filter(function (row) { return row.rank !== RANK_NONE; });
    hits.sort(function (a,b) {
      return a.rank - b.rank || a.asset.assetId.localeCompare(b.asset.assetId);
    });
    return { items:hits.slice(offset,offset+limit).map(function (row) {
      var a=row.asset;
      return { assetId:a.assetId, shortName:a.shortName, displayName:a.displayName,
        isin:a.isin, issuerName:a.issuerName, kind:a.kind, primaryCode:primaryCode(a) };
    }), nextCursor:offset+limit < hits.length ? String(offset+limit) : null };
  }

  function mockDetail(id, date) {
    var asset = findBy(SECURITY_ASSETS,'assetId',id);
    if (!asset) return null;
    return { asset:Object.assign({},asset,{aliases:asset.aliases.map(function (row) { return {code:row.code,section:row.section}; })}),
      bondData:global.CRMOrderDemoBondData(asset,date) };
  }

  // The static UI ships only the small fixed demo. The HTTP adapter holds selected cards
  // and a bounded search cache. An HTTP failure must never substitute a demo quotation.
  var apiMeta = global.document && global.document.querySelector('meta[name="crm-order-reference-api"]');
  var apiBase = apiMeta && apiMeta.content.replace(/\/$/, '');
  var liveQort = apiMeta && apiMeta.dataset && apiMeta.dataset.mode === 'qort';
  var searchCache = new Map(), selectedCards = new Map(), bondCache = new Map();

  async function request(path, parameters, signal) {
    var url = new URL(apiBase + path, global.location.href);
    Object.keys(parameters).forEach(function (key) {
      if (parameters[key] != null && parameters[key] !== '') url.searchParams.set(key,parameters[key]);
    });
    var controller = new AbortController();
    function abort() { controller.abort(); }
    if (signal && signal.aborted) abort();
    if (signal) signal.addEventListener('abort',abort,{once:true});
    var timeout = setTimeout(abort,15000);
    try {
      var response = await fetch(url, {signal:controller.signal,credentials:'same-origin',headers:{Accept:'application/json'}});
      if (!response.ok) {
        var failure = await response.json().catch(function () { return {}; });
        throw new Error(failure.error || ('Справочник недоступен (HTTP ' + response.status + ').'));
      }
      return await response.json();
    } finally {
      clearTimeout(timeout);
      if (signal) signal.removeEventListener('abort',abort);
    }
  }

  function remember(map,key,value,limit) {
    map.delete(key);
    if (map.size >= limit) map.delete(map.keys().next().value);
    map.set(key,value);
  }

  async function searchPage(parameters, signal) {
    var key = JSON.stringify([norm(parameters.q),parameters.assetClass,parameters.limit,parameters.cursor]);
    var old = searchCache.get(key);
    if (old && old.until > Date.now()) return old.page;
    var page = apiBase ? await request('', parameters, signal) : mockPage(parameters);
    if (!page || !Array.isArray(page.items) || page.items.length > MAX_RESULTS) throw new Error('Некорректный ответ справочника.');
    if (signal && signal.aborted) throw new DOMException('Отменено','AbortError');
    remember(searchCache,key,{page:page,until:Date.now()+30000},48);
    return page;
  }

  function bondKey(id,date,options) {
    var o = options || {};
    return JSON.stringify([id,date,o.tradeDate || '',o.quotation || '',o.accruedCurrency || '']);
  }
  async function loadSecurity(id, date, signal, options) {
    var detail = apiBase ? await request('/'+encodeURIComponent(id), Object.assign({settlementDate:date}, options), signal) : mockDetail(id,date);
    if (!detail || !detail.asset || detail.asset.assetId !== id) throw new Error('Карточка бумаги не найдена.');
    if (signal && signal.aborted) throw new DOMException('Отменено','AbortError');
    remember(selectedCards,id,detail.asset,32);
    if (date) remember(bondCache,bondKey(id,date,options),detail.bondData || {quotes:[],terms:null},64);
    return detail.asset;
  }

  function bondData(id,date,options) {
    if (!date) return null;
    return bondCache.get(bondKey(id,date,options)) || (!apiBase && mockDetail(id,date) || {}).bondData || null;
  }
  function clearBondData(id,date,options) { bondCache.delete(bondKey(id,date,options)); }

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

  function supportsDerivative(item, market) {
    return !!item && (item.markets || ['derivatives']).includes(market);
  }

  function searchDerivatives(query, limit, market) {
    var eligible = market ? DERIVATIVE_INSTRUMENTS.filter(function (item) {
      return supportsDerivative(item, market);
    }) : DERIVATIVE_INSTRUMENTS;
    return searchList(eligible, function (item) {
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

  function getSecurity(assetId) { return selectedCards.get(assetId) || (!apiBase && findBy(SECURITY_ASSETS, 'assetId', assetId)) || null; }
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
    var terms = asset.instrumentTerms;
    var rows = [
      { label: 'Наименование', value: asset.displayName },
      { label: 'Торговый код', value: primaryCode(asset) },
      { label: 'ISIN', value: asset.isin },
      { label: 'Эмитент', value: asset.issuerShortName && asset.issuerShortName !== asset.issuerName
        ? asset.issuerShortName + ' (' + asset.issuerName + ')' : asset.issuerName },
      { label: 'Вид ценной бумаги', value: securityKindLabel(asset) },
      { label: 'Для печати в поручении', value: describeSecurity(asset) }
    ];
    if (terms) {
      if (asset.kind.indexOf('bond-') === 0) {
        rows.push({label:'Текущий номинал',value:[terms.currentNominal.replace('.',','),terms.nominalCurrency].filter(Boolean).join(' ')});
      }
      rows.push({label:'Котировка в QORT',value:terms.quotation === 'percent' ? 'В процентах от номинала' :
        terms.quotation === 'cash' ? 'В деньгах за бумагу' : ''},
        {label:'Валюта цены',value:terms.quoteCurrency}, {label:'Валюта расчётов',value:terms.settlementCurrency},
        {label:'Источник',value:'QORT · ' + asset.asOfDate});
    }
    return rows.filter(function (row) { return !!row.value; });
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
      { label: 'Источник', value: liveQort ? 'Учебный справочник ПФИ' : '' },
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
      search: searchSecurities, searchPage:searchPage, load:loadSecurity,
      get: getSecurity,
      // What one result row shows in the dropdown.
      resultTitle: function (asset) { return asset.shortName; },
      resultMeta: function (asset) {
        return [asset.primaryCode || primaryCode(asset), asset.isin, asset.issuerName]
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
    mockPage: mockPage, mockDetail: mockDetail, loadSecurity: loadSecurity, bondData: bondData, clearBondData: clearBondData,
    MIN_QUERY_LENGTH: MIN_QUERY_LENGTH,
    MAX_RESULTS: MAX_RESULTS,

    SECURITY_ASSETS: SECURITY_ASSETS,
    FX_INSTRUMENTS: FX_INSTRUMENTS,
    DERIVATIVE_INSTRUMENTS: DERIVATIVE_INSTRUMENTS,

    catalog: function (name) { return CATALOGS[name] || null; },

    searchSecurities: searchSecurities,
    searchFxInstruments: searchFxInstruments,
    searchDerivatives: searchDerivatives,
    supportsDerivative: supportsDerivative,

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
