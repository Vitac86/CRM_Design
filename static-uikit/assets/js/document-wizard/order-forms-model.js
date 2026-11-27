// Appendix 7. Resolve order data from the selected document, instrument and CRM subject.
(function (global) {
  'use strict';

  // Printed where the form asks for a price a market order does not have.
  var MARKET_PRICE = 'Рыночная';
  var VALIDITY_UNTIL_CANCELLED = 'До отмены';

  // ── Values ────────────────────────────────────────────────────────────────

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function formatAmount(raw) {
    var value = text(raw).replace(/\s/g, '').replace(',', '.');
    if (!/^\d+(?:\.\d+)?$/.test(value)) return text(raw);
    var parts = value.split('.');
    var whole = parts[0].replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    var fraction = (parts[1] || '').replace(/0+$/, '');
    return whole + (fraction ? ',' + fraction : '');
  }

  // Cash transfers and withdrawals use integer minor units.
  // Multiplying a floating-point major amount by 100 can change the last
  // kopeck. Number inputs also accept exponent notation (for example 1e3).
  function parseMoney(raw) {
    var value = text(raw).replace(/\s/g, '').replace(',', '.');
    var match = /^(-?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(value);
    if (!match || !(match[2] || match[3])) return { error: 'Введите сумму числом.' };
    var fraction = match[3] || '';
    var digits = (match[2] + fraction).replace(/^0+/, '') || '0';
    var exponent = Number(match[4] || 0);
    var rangeError = 'Сумма слишком велика для точного расчёта копеек.';
    if (!Number.isSafeInteger(exponent)) return { error: rangeError };
    var shift = 2 + exponent - fraction.length;
    if (digits === '0') return { minorTotal: 0n, negative: false, error: '' };
    if (shift < 0) {
      var end = digits.length + shift;
      if (end < 0 || /[1-9]/.test(digits.slice(Math.max(0, end)))) {
        return { error: 'Укажите сумму с точностью до двух знаков после запятой.' };
      }
      digits = digits.slice(0, end) || '0';
    } else {
      // Bound allocation before expanding an exponent, even for invalid input.
      if (digits.length + shift > 17) return { error: rangeError };
      digits += '0'.repeat(shift);
    }
    if (digits.length > 17) return { error: rangeError };
    var minorTotal = BigInt(digits);
    return { minorTotal: minorTotal, negative: match[1] === '-', error: '' };
  }

  function moneyProblem(raw) {
    return parseMoney(raw).error;
  }

  // ── Amount in words ───────────────────────────────────────────────────────
  //
  // Russian agreement is the whole job here. The numeral takes the gender of
  // the noun that follows it, and that noun is different in each group: рубль
  // is masculine, тысяча is feminine, and «один/одна», «два/две» change with
  // it. The unit itself then takes one of three plural forms chosen by the
  // last group of the number. Kopecks are written as digits, which is the
  // convention on Russian payment documents and also the shortest form the
  // printed blank has to hold.

  var ONES = {
    m: ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'],
    f: ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']
  };
  var TEENS = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать',
               'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  var TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят',
              'семьдесят', 'восемьдесят', 'девяносто'];
  var HUNDREDS = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот',
                  'семьсот', 'восемьсот', 'девятьсот'];

  // Each thousand group brings its own noun, and its own gender for the
  // numeral in front of it.
  var SCALES = [
    { gender: 'f', forms: ['тысяча', 'тысячи', 'тысяч'] },
    { gender: 'm', forms: ['миллион', 'миллиона', 'миллионов'] },
    { gender: 'm', forms: ['миллиард', 'миллиарда', 'миллиардов'] },
    { gender: 'm', forms: ['триллион', 'триллиона', 'триллионов'] }
  ];

  // The currencies the two forms offer as a fixed choice. «Иная валюта» has no
  // name anywhere on the form — the source prints only a box — so an amount in
  // an unnamed currency spells the number and writes the fraction as a ratio.
  var CURRENCIES = {
    RUB: { gender: 'm', major: ['рубль', 'рубля', 'рублей'],
           minor: ['копейка', 'копейки', 'копеек'] },
    USD: { gender: 'm', major: ['доллар США', 'доллара США', 'долларов США'],
           minor: ['цент', 'цента', 'центов'] },
    EUR: { gender: 'm', major: ['евро', 'евро', 'евро'],
            minor: ['евроцент', 'евроцента', 'евроцентов'] },
    CNY: { gender: 'm', major: ['юань', 'юаня', 'юаней'],
           minor: ['фэнь', 'фэня', 'фэней'] }
  };

  // 1 → one, 2–4 → few, everything else → many; and the teens are all «many»
  // however they end.
  function plural(count, forms) {
    var mod100 = count % 100;
    var mod10 = count % 10;
    if (mod100 >= 11 && mod100 <= 14) return forms[2];
    if (mod10 === 1) return forms[0];
    if (mod10 >= 2 && mod10 <= 4) return forms[1];
    return forms[2];
  }

  function groupWords(group, gender) {
    var out = [];
    var hundreds = Math.floor(group / 100);
    var rest = group % 100;
    if (hundreds) out.push(HUNDREDS[hundreds]);
    if (rest >= 10 && rest < 20) {
      out.push(TEENS[rest - 10]);
    } else {
      var tens = Math.floor(rest / 10);
      var ones = rest % 10;
      if (tens) out.push(TENS[tens]);
      if (ones) out.push(ONES[gender][ones]);
    }
    return out;
  }

  function integerWords(value, gender) {
    if (value === 0n) return ['ноль'];
    var groups = [];
    var rest = value;
    while (rest > 0n) {
      groups.push(Number(rest % 1000n));
      rest /= 1000n;
    }
    var out = [];
    for (var i = groups.length - 1; i >= 0; i -= 1) {
      var group = groups[i];
      if (!group) continue;
      var scale = i > 0 ? SCALES[i - 1] : null;
      out = out.concat(groupWords(group, scale ? scale.gender : gender));
      if (scale) out.push(plural(group, scale.forms));
    }
    return out;
  }

  // «125000.50 RUB» → «Сто двадцать пять тысяч рублей 50 копеек».
  function amountInWords(raw, currency) {
    var amount = parseMoney(raw);
    if (amount.error) return '';
    var unit = CURRENCIES[text(currency)] || null;
    var minorTotal = amount.minorTotal;
    var major = minorTotal / 100n;
    var minor = Number(minorTotal % 100n);
    var words = integerWords(major, unit ? unit.gender : 'm');
    if (unit) words.push(plural(Number(major % 100n), unit.major));
    var minorDigits = (minor < 10 ? '0' : '') + minor;
    words.push(unit ? (minorDigits + ' ' + plural(minor, unit.minor))
      : (minorDigits + '/100'));
    var sentence = (amount.negative ? 'минус ' : '') + words.join(' ');
    return sentence.charAt(0).toLocaleUpperCase('ru-RU') + sentence.slice(1);
  }

  // A sum of money always prints both minor digits: the amount in words spells
  // «… 50 копеек», and «125 000,5» beside it would be the same figure written
  // two different ways on one line.
  function formatMoney(raw) {
    var parsed = parseMoney(raw);
    if (parsed.error) return '';
    var minorTotal = parsed.minorTotal;
    var whole = String(minorTotal / 100n)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    var minor = Number(minorTotal % 100n);
    return (parsed.negative ? '-' : '') + whole + ',' + (minor < 10 ? '0' : '') + minor;
  }

  function isoToRu(value) {
    var match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? (match[3] + '.' + match[2] + '.' + match[1]) : text(value);
  }

  function calendarDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    var date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
  }

  function catalog() {
    return global.CRMInstrumentCatalog || null;
  }

  // ── Which instrument block is the order actually about? ───────────────────
  //
  // Фондовый рынок and внебиржевая ценная бумага are the same block: an order
  // names an Asset, not a trading section. Срочный рынок is its own block and
  // is never reachable from OTC — that is the business rule this returns.
  function instrumentBranch(values) {
    var market = text(values['extra-order-market']);
    if (market === 'stock') return 'security';
    if (market === 'currency') return 'fx';
    if (market === 'derivatives') return 'derivative';
    if (market === 'otc') {
      var otc = text(values['extra-otc-instrument-type']);
      if (otc === 'security') return 'security';
      if (otc === 'derivative') return 'derivative';
    }
    return null;
  }

  // ── Derivation ────────────────────────────────────────────────────────────

  function deriveValidity(values) {
    if (text(values['extra-order-validity-mode']) === 'date') {
      return isoToRu(values['extra-order-validity-date']);
    }
    return VALIDITY_UNTIL_CANCELLED;
  }

  function deriveSecurity(values, isLimit) {
    var reference = catalog();
    var asset = reference ? reference.getSecurity(values['extra-security-asset-id']) : null;
    values['extra-security-issuer'] = asset ? asset.issuerName : '';
    values['extra-security-type'] = asset ? reference.describeSecurity(asset) : '';
    values['extra-security-quantity'] = formatAmount(values['extra-security-quantity']);
    if (!isLimit && !values['extra-security-price']) values['extra-security-price'] = MARKET_PRICE;
  }

  function deriveFx(values, isLimit) {
    var reference = catalog();
    var instrument = reference
      ? reference.getFxInstrument(values['extra-fx-instrument-id']) : null;
    values['extra-fx-instrument'] = instrument
      ? reference.describeFxInstrument(instrument) : '';
    values['extra-fx-lots'] = formatAmount(values['extra-fx-lots']);
    if (!isLimit && !values['extra-fx-rate']) values['extra-fx-rate'] = MARKET_PRICE;
  }

  function deriveDerivative(values, isLimit) {
    var reference = catalog();
    var instrument = reference
      ? reference.getDerivative(values['extra-derivative-id']) : null;
    values['extra-derivative-kind'] = instrument
      ? reference.derivativeKindLabel(instrument) : '';
    values['extra-derivative-name'] = instrument
      ? reference.describeDerivative(instrument) : '';
    // A future has no strike; the row stays blank rather than printing a dash.
    values['extra-derivative-strike'] = instrument && instrument.strike
      ? formatAmount(instrument.strike) : '';
    // ISO here: the map formats this row with `dateRu`.
    values['extra-derivative-expiry'] = instrument && instrument.expiry
      ? instrument.expiry : '';
    values['extra-derivative-quantity'] = formatAmount(values['extra-derivative-quantity']);
    if (!isLimit && !values['extra-derivative-premium']) values['extra-derivative-premium'] = MARKET_PRICE;
  }

  var KINDS = {
    'order-trade': 'trade', 'order-venue-transfer': 'transfer', 'order-bank-withdrawal': 'withdrawal'
  };
  var VENUES = [
    ['stock', 'ПАО Московская Биржа — фондовый рынок и рынок депозитов'],
    ['currency', 'ПАО Московская Биржа — валютный рынок и рынок драгоценных металлов'],
    ['derivatives', 'ПАО Московская Биржа — срочный рынок'],
    ['spb-stock', 'ПАО СПБ биржа — фондовый рынок'],
    ['spb-derivatives', 'ПАО СПБ биржа — срочный рынок'],
    ['otc', 'Внебиржевой рынок']
  ];
  function venues(subject) {
    var list = VENUES.map(function (v) { return { value: v[0], label: v[1], box: v[0] }; });
    (subject.additionalOrderVenues || []).forEach(function (venue) {
      if (venue.id && venue.label && venue.id !== 'other' && !list.some(function (v) { return v.value === venue.id; })) {
        list.push({ value: venue.id, label: venue.label, box: 'other' });
      }
    });
    return list;
  }

  function identity(subject) {
    var adapter = global.CRMDocumentEngine.umiAdapter;
    var payload = { subject: subject, umi: subject.umi || {} };
    function exact(name) { return text(adapter.resolve('umi.' + name, payload)); }
    var number = exact('bo_num'), date = exact('datesign');
    return {
      code: exact('num_investika') || text(subject.code),
      contract: number && date ? number + ' от ' + isoToRu(date) : ''
    };
  }

  function currencyCode(value) { return value === 'EURO' ? 'EUR' : text(value); }
  function eligibleRequisites(subject, currency) {
    return (subject.bankRequisites || []).filter(function (r) {
      return r.id && (!r.subjectId || r.subjectId === subject.id) &&
        currencyCode(r.currency) === currency && r.active !== false && r.archived !== true &&
        !['archived', 'inactive', 'deleted', 'blocked'].includes(r.status) && r.usableForPayout !== false;
    });
  }
  function payoutRequisite(subject, values) {
    var id = values.selectedRequisiteId;
    var matches = eligibleRequisites(subject, values['extra-payout-currency']).filter(function (r) { return r.id === id; });
    return matches.length === 1 ? matches[0] : null;
  }
  function requisiteFields(r) {
    r = r || {};
    return {
      'extra-bank-recipient': text(r.recipient), 'extra-bank-bic': text(r.bic),
      'extra-bank-name': text(r.bankName), 'extra-bank-corr-swift': text(r.correspondentSwift),
      'extra-bank-corr-name': text(r.correspondentBankName), 'extra-bank-corr-account': text(r.correspondentAccount),
      'extra-bank-account': text(r.account), 'extra-bank-inn': text(r.inn),
      'extra-bank-personal-account': text(r.personalAccount), 'extra-bank-other': text(r.notation)
    };
  }

  var BRANCH = {
    security: ['extra-security-asset-id', 'extra-security-quantity', 'extra-security-price', 'extra-trade-amount', 'getSecurity'],
    fx: ['extra-fx-instrument-id', 'extra-fx-lots', 'extra-fx-rate', 'extra-fx-amount', 'getFxInstrument'],
    derivative: ['extra-derivative-id', 'extra-derivative-quantity', 'extra-derivative-premium', 'extra-derivative-amount', 'getDerivative']
  };

  function settlement(v) {
    var choice = v['extra-settlement-period'] ?? (v.settlementMode === 'date' ? 'date' : v.settlementTenor);
    if (choice === 'date') return {settlementMode:'date', settlementDateISO:text(v['extra-settlement-date'] ?? v.settlementDateISO)};
    return {settlementMode:'tenor', settlementTenor:text(choice)};
  }

  function settlementText(s) {
    return s.settlementMode === 'date' ? (calendarDate(s.settlementDateISO) ? isoToRu(s.settlementDateISO) : '') : s.settlementTenor;
  }

  function referenceInterest(asset, data, target) {
    function missing(message) { return {value:'',displayText:'',date:target || '',message:message}; }
    if (!calendarDate(target)) return missing('Для НКД из справочника выберите конкретную дату расчётов.');
    var rows = (data && data.quotes || []).filter(function (r) { return r.assetId === asset.assetId && r.date === target; });
    if (!rows.length) return missing('На выбранную дату нет данных НКД.');
    var first = rows[0];
    if (rows.some(function (r) { return !global.CRMOrderCalculation.decimal(r.value) || !r.source ||
        r.unit !== 'per-security' || formatAmount(r.value) !== formatAmount(first.value) || r.currency !== first.currency; }))
      return missing('Источник не подтвердил однозначное значение НКД на эту дату.');
    var display = first.displayValue ?? global.CRMOrderCalculation.roundCurrency(first.value,first.currency);
    return {value:String(first.value),displayText:formatDecimalInput(display),rawValue:first.rawValue,
      sourceStatus:first.sourceStatus,sourceSectionId:first.sourceSectionId,sourceTable:first.sourceTable,
      observationDate:first.observationDate,currency:first.currency || '',date:target,unit:first.unit,source:first.source,
      message:!first.currency && first.sourceStatus !== 'DEFAULT_ZERO' ? 'Валюта НКД не подтверждена.' : ''};
  }

  function accruedInterest(asset, v, data, target) {
    var reference = referenceInterest(asset,data,target);
    var legacy = v['extra-accrued-mode'] === 'manual' && v['extra-accrued-edited'] == null;
    var enteredCurrency = v['extra-accrued-currency'];
    if (!legacy && v['extra-accrued-edited'] !== 'yes') {
      if (enteredCurrency) reference.currency = enteredCurrency;
      return reference;
    }
    var input = String((legacy ? v['extra-accrued-manual'] : v['extra-accrued-input']) ?? '');
    var number = input.trim();
    var valid = global.CRMOrderCalculation.decimal(number);
    var currency = enteredCurrency || reference.currency ||
      (!data?.quotes?.length ? asset.instrumentTerms?.nominalCurrency || asset.calculation?.currency : '');
    return {edited:true,displayText:legacy && valid ? formatAmount(input) : input,value:valid ? number.replace(/\s/g,'').replace(',','.') : '',
      currency:currency || '',date:target || (legacy && v['extra-accrued-date']) || '',unit:'per-security',source:'Введено вручную'};
  }

  function bondOptions(asset,v) {
    if (!asset || asset.source !== 'QORT') return {};
    var tradeDate = text(v['extra-trade-date'] ?? v['extra-order-date']);
    // Previously prepared orders retain their explicit price convention when printed again.
    var oldMode = v['extra-quotation-mode'], terms = asset.instrumentTerms || {};
    var quotation = oldMode === 'cash' || oldMode === 'reference' && terms.quotation === 'cash' ? 'cash' : 'percent';
    var principal = quotation === 'percent' ? terms.nominalCurrency : terms.quoteCurrency;
    var ccy = text(v['extra-accrued-currency']).toUpperCase();
    return {tradeDate:calendarDate(tradeDate) ? tradeDate : '',quotation:quotation,
      accruedCurrency:ccy !== principal && /^[A-Z]{3}$/.test(ccy) ? ccy : ''};
  }

  function paymentRates(asset,data,options,v,interest) {
    var terms = data && data.terms || asset.instrumentTerms;
    if (!terms || !terms.settlementCurrency) return [];
    var pay = terms.settlementCurrency;
    var principal = options.quotation === 'cash' ? asset.instrumentTerms.quoteCurrency : terms.nominalCurrency;
    var accrued = !terms.quoteIncludesAccrued && text(interest.currency).toUpperCase();
    var currencies = [principal, accrued];
    var exchange = data && data.exchange;
    return currencies.flatMap(function (from, index) {
      if (!/^[A-Z]{3}$/.test(from) || from === pay || (index && from === principal)) return [];
      var rate = exchange && exchange.date === options.tradeDate &&
        exchange.rates.find(function (r) { return r.from === from && r.to === pay && r.date === options.tradeDate; });
      var key = JSON.stringify([asset.assetId,options.tradeDate,from,pay]);
      var field = index ? 'extra-accrued-rate' : 'extra-price-rate';
      var info = {from:from,to:pay,date:options.tradeDate,field:field,key:key,legs:[],referenceStatus:rate ? rate.status : 'missing'};
      if (rate && rate.status !== 'official' && v[field+'-key'] === key) {
        var manual = text(v[field]), number = global.CRMOrderCalculation.decimal(manual);
        if (number && number.n > 0n) return [Object.assign(info,{status:'manual',source:'Введено вручную',
          legs:[{from:from,to:pay,units:'1',rate:manual.replace(',','.')}]})];
      }
      return [Object.assign(info,rate || {status:'missing'})];
    });
  }

  function datedBondSpec(base, data, target, interest, options, rates) {
    var terms = data && data.terms;
    if (!terms || terms.date !== target || !terms.source || !base || terms.currency !== base.currency ||
        terms.unit !== 'per-security') return null;
    var formula = options.quotation === 'cash' ? 'bond-cash' : 'bond-percent';
    if (terms.formula !== formula) return null;
    var spec = Object.assign({},base,terms,{settlementDate:target,tradeDate:options.tradeDate,rates:rates});
    var currency = text(interest && interest.currency).toUpperCase();
    if (interest && interest.value !== '' && (currency === terms.currency || terms.settlementCurrency && (/^[A-Z]{3}$/.test(currency) || (!currency && interest.value === '0'))) && interest.date === target &&
        interest.unit === 'per-security') {
      spec.accrued = interest.value;
      spec.accruedCurrency = currency;
      spec.accruedFor = target;
    }
    return spec;
  }

  function tradeCalculation(v) {
    var branch = instrumentBranch(v), keys = BRANCH[branch];
    var item = keys && catalog() && catalog()[keys[4]](v[keys[0]]);
    if (branch === 'derivative' && item && !catalog().supportsDerivative(item,v['extra-order-market'])) item = null;
    var spec = item && item.calculation;
    var isBond = !!(branch === 'security' && item && /^bond-/.test(item.kind));
    var target = settlement(v).settlementDateISO;
    var options = isBond ? bondOptions(item,v) : {};
    var data = isBond && catalog().bondData(item.assetId,target,options);
    var interest = isBond ? accruedInterest(item,v,data,target) : null;
    var rates = isBond ? paymentRates(item,data,options,v,interest) : [];
    var dated = isBond ? datedBondSpec(spec,data,target,interest,options,rates) : spec;
    var priceCurrency = branch === 'security' && v['extra-security-currency'] != null
      ? text(v['extra-security-currency']).toUpperCase() : (spec && spec.currency || '');
    var defaultSettlement = item?.instrumentTerms?.settlementCurrency ?? spec?.settlementCurrency ?? spec?.currency ?? item?.quote ?? '';
    var settlementCurrency = v['extra-settlement-currency'] ?? defaultSettlement;
    var math = global.CRMOrderCalculation;
    var result;
    if (v['extra-order-kind'] !== 'limit') result = math.unavailable('Сумма рыночного поручения не определена.');
    else if (branch === 'security' && v['extra-repo-ccp'] === 'yes' || branch === 'fx' && v['extra-fx-swap-ccp'] === 'yes')
      result = math.unavailable('Для РЕПО и СВОП нужны условия обеих частей.');
    else if (v['extra-trade-kind'] === 'other') result = math.unavailable('Для иного вида сделки требуется подтверждённая сумма.');
    else if (!keys || !item) result = math.unavailable('Выберите инструмент из справочника.');
    else if (spec && spec.market && spec.market !== v['extra-order-market'])
      result = math.unavailable('Для выбранного рынка нет подтверждённой спецификации расчёта.');
    else if (branch === 'security' && spec && priceCurrency !== spec.currency)
      result = math.unavailable('Для выбранной валюты цены отсутствует спецификация расчёта.');
    else if (text(settlementCurrency).toUpperCase() !== defaultSettlement)
      result = math.unavailable('Валюта расчётов отличается от валюты спецификации.');
    else if (options.tradeDate && target && options.tradeDate > target)
      result = math.unavailable('Дата сделки должна быть не позже даты расчётов.');
    else if (isBond && !dated) result = math.unavailable(data && data.reason || 'Нет подтверждённых единиц котировки и спецификации облигации на дату расчётов.');
    else {
      result = math.calculate(dated, v[keys[1]], v[keys[2]]);
      if (isBond && interest.edited && !interest.value && !result.invalid)
        result = math.unavailable('Для автоматического расчёта нужен числовой НКД. Сумму можно указать вручную.');
    }
    return {branch:branch, keys:keys, item:item, spec:dated || spec, result:result, currency:priceCurrency,
      defaultSettlement:defaultSettlement,settlementCurrency:settlementCurrency,
      isBond:isBond, quotation:isBond ? (options.quotation === 'cash' ? 'bond-cash' : 'bond-percent') : null,
      interest:interest,rates:rates,options:options};
  }

  function reviewKey(id, s, v) {
    var p = id === 'order-venue-transfer' ? 'extra-move-' : 'extra-payout-';
    return JSON.stringify([id, s.id, v[p + 'amount-mode'] || '', formatMoney(v[p+'amount']), v[p+'currency'],
      v['extra-words-mode'], v['extra-manual-words']]);
  }

  function formatDecimalInput(value, group) {
    var parts = String(value || '').split('.');
    if (group) parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join(',');
  }

  function context(id, subject, values) {
    var v = values, key = id === 'order-venue-transfer' ? 'extra-move-' : 'extra-payout-';
    return {
      identity: identity(subject), requisites: requisiteFields(payoutRequisite(subject, v)),
      words: id !== 'order-trade' && v[key + 'amount'] && CURRENCIES[v[key+'currency']] ? amountInWords(v[key+'amount'], v[key+'currency']) : ''
    };
  }

  function prepare(id, subject, input) {
    var kind = KINDS[id], v = Object.assign({}, input), errors = [], out = {}, checks = {}, raw = {};
    var metadata = { documentId: id, subjectId: subject.id }, ident = identity(subject);
    if (v['extra-settlement-period'] == null && v.settlementMode) {
      v['extra-settlement-period'] = v.settlementMode === 'date' ? 'date' : v.settlementTenor;
      if (v.settlementMode === 'date') v['extra-settlement-date'] = v.settlementDateISO;
    }
    function issue(key, message) { errors.push({ key: key, message: message }); }
    function keep(keys) {
      keys.forEach(function (k) { if (v[k] != null) raw[k] = v[k]; });
    }
    function copy(keys) {
      keep(keys);
      keys.forEach(function (k) { if (v[k] != null) out[k] = v[k]; });
    }
    function oneOf(key, choices) {
      if (!choices.includes(v[key])) issue(key, 'Выберите допустимое значение поля.');
    }
    function positive(key) {
      var m = parseMoney(v[key]);
      if (m.error || m.negative || !m.minorTotal) issue(key, m.error || 'Сумма должна быть больше нуля.');
    }
    function safeText(s) { return !!text(s) && !/[<>\u0000-\u001f\u007f]/.test(s); }
    function confirm() {
      var against = reviewKey(id, subject, v);
      var approved = v.confirmedAgainst === against;
      if (!approved) issue('order-review', 'Проверьте и подтвердите ручную редакцию для текущих значений.');
      metadata.lastValidatedAgainst = approved ? against : null;
      if (approved) raw.confirmedAgainst = against;
    }
    if (!kind) issue('extra-order-type', 'Неизвестное поручение.');
    if (!/^INV[^\s]+$/i.test(ident.code)) issue('extra-brokerage-account', 'В карточке клиента отсутствует корректный код INV.');
    if (!ident.contract) issue('extra-contract-number-date', 'В карточке клиента не заполнены номер или дата брокерского договора.');
    out['extra-brokerage-account'] = ident.code;
    out['extra-contract-number-date'] = ident.contract;
    out['extra-submission-kind'] = 'primary';
    copy(['extra-order-number','extra-order-date']);
    var date = text(v['extra-order-date']);
    if (date || text(v['extra-order-number'])) {
      var match = /^(20\d{2})-(\d{2})-(\d{2})$/.exec(date);
      if (!match || !calendarDate(date))
        issue('extra-order-date', 'Укажите корректную дату первичной заявки.');
      else {
        out['extra-order-day'] = match[3]; out['extra-order-month'] = match[2]; out['extra-order-year'] = match[1].slice(2);
      }
    }
    if (kind === 'trade') {
      // Previously saved orders used a separate input for their agreed amount and currency.
      if (v['extra-order-amount'] == null && v['extra-amount-mode'] === 'manual') {
        v['extra-order-amount'] = v['extra-manual-amount'];
        if (v['extra-settlement-currency'] == null && v['extra-manual-currency']) v['extra-settlement-currency'] = v['extra-manual-currency'];
      }
      var trade = tradeCalculation(v), keys = trade.keys, result = trade.result;
      oneOf('extra-trade-kind', ['buy','sell','other']); oneOf('extra-order-kind', ['limit','market']);
      oneOf('extra-order-validity-mode', ['cancelled','date']);
      if (v['extra-settlement-period']) oneOf('extra-settlement-period', ['T+0','T+1','T+2','date']);
      var s = settlement(v), target = s.settlementDateISO;
      Object.assign(metadata,s);
      Object.assign(raw,s);
      if (s.settlementMode === 'date') {
        var bounds = trade.item && trade.item.settlementBounds || {};
        if (target && (!calendarDate(target) || (date && target < date) || (bounds.first && target < bounds.first) || (bounds.last && target > bounds.last)))
          issue('extra-settlement-date','Проверьте дату расчётов относительно даты заявки и допустимого периода инструмента.');
        keep(['extra-settlement-date']);
      }
      if (!keys || !trade.item) issue(keys ? keys[0] : 'extra-order-market', 'Выберите инструмент активного рынка из справочника.');
      if (v['extra-trade-kind'] === 'other' && !safeText(v['extra-trade-kind-other'])) issue('extra-trade-kind-other','Укажите вид сделки.');
      if (v['extra-order-validity-mode'] === 'date' && !calendarDate(v['extra-order-validity-date']))
        issue('extra-order-validity-date','Укажите дату окончания поручения.');
      copy(['extra-trade-kind','extra-order-market','extra-order-kind','extra-order-validity-mode','extra-settlement-period','extra-counterparty','extra-order-other-info']);
      if (v['extra-trade-kind']==='other') copy(['extra-trade-kind-other']);
      if (v['extra-order-market']==='otc') copy(['extra-otc-instrument-type']);
      if (v['extra-order-validity-mode']==='date') copy(['extra-order-validity-date']);
      out['extra-order-validity'] = deriveValidity(v);
      out['extra-settlement-period'] = settlementText(s);
      if (keys) {
        var limit = v['extra-order-kind'] === 'limit';
        copy([keys[0],keys[1],keys[2]]);
        out[keys[2]] = String(out[keys[2]] ?? '');
        if (!/^[1-9]\d*$/.test(String(v[keys[1]] || '').replace(/ /g,''))) issue(keys[1], 'Укажите положительное целое количество.');
        if (trade.branch==='security') {
          oneOf('extra-repo-ccp',['yes','no']); copy(['extra-repo-ccp']); deriveSecurity(out,limit);
          out['extra-security-currency'] = v['extra-security-currency'] ?? trade.currency;
          keep(['extra-security-currency']);
          if (trade.quotation === 'bond-percent' && global.CRMOrderCalculation.decimal(v[keys[2]])) out['extra-security-price'] += ' %';
          if (trade.isBond) {
            var interest = trade.interest;
            metadata.accruedInterest = interest;
            if (trade.item.source === 'QORT') {
              keep(['extra-trade-date','extra-quotation-mode']);
              metadata.tradeDate = trade.options.tradeDate;
              metadata.quotation = trade.quotation;
              if (trade.options.tradeDate && target && trade.options.tradeDate > target)
                issue('extra-trade-date','Дата сделки должна быть не позже даты расчётов.');
              metadata.exchangeRates = trade.rates;
              trade.rates.forEach(function (rate) {
                if (rate.status === 'manual') keep([rate.field,rate.field+'-key']);
              });
            }
            keep(['extra-accrued-currency']);
            if (v['extra-accrued-edited'] === 'yes') {
              keep(['extra-accrued-edited','extra-accrued-input','extra-accrued-currency']);
            } else if (v['extra-accrued-mode'] === 'manual') {
              keep(['extra-accrued-mode','extra-accrued-manual','extra-accrued-currency','extra-accrued-date']);
            }
            // Free text is a valid document entry. Only numeric interest participates in the calculation.
            var nkdCurrency = interest.currency;
            var printNkdCurrency = nkdCurrency !== out['extra-security-currency'] && (interest.value || v['extra-accrued-currency']);
            out['extra-security-accrued'] = [interest.displayText,printNkdCurrency && nkdCurrency].filter(Boolean).join(' ');
          }
        } else if (trade.branch==='fx') {
          oneOf('extra-fx-swap-ccp',['yes','no']); copy(['extra-fx-swap-ccp']); deriveFx(out,limit);
        } else deriveDerivative(out,limit);
        keep(['extra-order-amount','extra-settlement-currency']);
        var amount = String(v['extra-order-amount'] ?? formatDecimalInput(result.value,true));
        var currency = trade.settlementCurrency;
        var showCurrency = currency && (trade.branch !== 'security' || currency !== out['extra-security-currency']);
        out[keys[3]] = showCurrency && (amount || v['extra-settlement-currency']) ? [amount,currency].filter(Boolean).join(' ') : amount;
        metadata.amount = {value:out[keys[3]],currency:currency,sourceRecordId:v[keys[0]],
          source:trade.spec && trade.spec.source || null};
      }
      checks['order-uncovered-ack'] = true;
    } else if (kind) {
      var move = kind === 'transfer', p = move ? 'extra-move-' : 'extra-payout-';
      var currency = currencyCode(v[p+'currency']); v[p+'currency'] = currency;
      oneOf(p+'currency',Object.keys(CURRENCIES));
      copy([p+'currency']);
      var list = venues(subject);
      (move ? [p+'from',p+'to'] : [p+'from']).forEach(function (k) {
        var venue = list.find(function (o) { return o.value === v[k]; });
        if (!venue) issue(k,'Выберите торговую площадку из справочника.');
        else { out[k]=venue.box; if(venue.box==='other') out[k+'-other-name']=venue.label; }
        keep([k]);
      });
      if (move && v[p+'from'] && v[p+'from']===v[p+'to']) issue(p+'to','Перевод на ту же торговую площадку невозможен.');
      if (!move) {
        oneOf(p+'amount-mode',['amount','whole']); copy([p+'amount-mode']);
        keep(['selectedRequisiteId']); var rec = payoutRequisite(subject,v);
        if (!rec) issue('selectedRequisiteId','Выберите сохранённые реквизиты клиента для валюты '+currency+'. При отсутствии записи откройте карточку клиента.');
        else {
          var required = ['recipient','bankName','bic','account'];
          if (currency==='RUB' || rec.requiresCorrespondentAccount || rec.requiresIntermediary) required.push('correspondentAccount');
          if (rec.requiresIntermediary) required.push('correspondentBankName','correspondentSwift');
          var missing = required.filter(function (k) { return !text(rec[k]); });
          if (missing.length) issue('selectedRequisiteId','Не заполнены реквизиты банковского маршрута: '+missing.map(function(k){return BANK_LABELS[k];}).join(', ')+'.');
          var bic = text(rec.bic);
          var swift = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
          if (bic && !(currency === 'RUB' || rec.routingType === 'domestic' ? /^\d{9}$/.test(bic) : swift.test(bic)))
            issue('selectedRequisiteId','Проверьте БИК/SWIFT банка в сохранённых реквизитах.');
          if (rec.correspondentSwift && !swift.test(rec.correspondentSwift))
            issue('selectedRequisiteId','Проверьте SWIFT банка-корреспондента.');
          Object.assign(out,requisiteFields(rec));
          metadata.selectedRequisiteId = rec.id; metadata.bankSource = 'Front Реквизиты';
        }
      }
      if (move || v[p+'amount-mode']==='amount') {
        positive(p+'amount'); keep([p+'amount','extra-words-mode']);
        out[p+'amount']=formatMoney(v[p+'amount']);
        var manual=v['extra-words-mode']==='manual';
        if (v['extra-words-mode'] && !['manual','auto'].includes(v['extra-words-mode'])) issue('extra-words-mode','Недопустимый режим прописи.');
        var words=manual ? text(v['extra-manual-words']) : amountInWords(v[p+'amount'],currency);
        if (manual) {
          keep(['extra-manual-words']);
          if (!safeText(v['extra-manual-words'])) issue('extra-manual-words','Введите пропись обычным текстом, без разметки и управляющих символов.');
          confirm();
        }
        out[p+'amount-words']=words;
        metadata.words={mode:manual?'manual':'auto',value:words,source:manual?'operator':'amountInWords',
          confirmed:manual && !!metadata.lastValidatedAgainst,confirmedAgainstAmount:out[p+'amount'],confirmedAgainstCurrency:currency};
      }
    }
    return { extraValues: out, checkValues: checks, input: raw, metadata: metadata, errors: errors };
  }

  // Final boundary shared by preflight and PDF rendering, including callers outside the wizard.
  function printable(id, payload) {
    var displayed = payload.extraValues || {};
    if (id === 'order-venue-transfer' && displayed['extra-move-from'] &&
        displayed['extra-move-from'] === displayed['extra-move-to'] &&
        (displayed['extra-move-from'] !== 'other' || !payload.orderInput)) {
      throw new Error('Перевод на ту же торговую площадку невозможен.');
    }
    var input = payload.orderInput || displayed;
    var subject = payload.subject || {};
    if (payload.umi && !subject.umi) subject = Object.assign({},subject,{umi:payload.umi});
    var order = prepare(id,subject,input);
    if (order.errors.length) throw new Error(order.errors[0].message);
    return Object.assign({},payload,{extraValues:order.extraValues,checks:order.checkValues,
      orderMetadata:order.metadata,orderInput:order.input});
  }

  var BANK_LABELS={recipient:'получатель',bankName:'наименование банка',bic:'БИК/SWIFT',account:'счёт получателя',
    correspondentAccount:'корреспондентский счёт',correspondentBankName:'банк-корреспондент',correspondentSwift:'SWIFT корреспондента'};

  global.CRMOrderForms = {
    kinds: KINDS, printable: printable, venues: venues, eligibleRequisites: eligibleRequisites, payoutRequisite: payoutRequisite,
    settlement: settlement, settlementText: settlementText, bondOptions:bondOptions, isoToRu:isoToRu,
    instrumentBranch: instrumentBranch, formatAmount: formatAmount, formatMoney: formatMoney, moneyProblem: moneyProblem,
    amountInWords: amountInWords, formatDecimalInput: formatDecimalInput, tradeCalculation: tradeCalculation, context: context, reviewKey: reviewKey, prepare: prepare
  };
}(typeof window !== 'undefined' ? window : this));
