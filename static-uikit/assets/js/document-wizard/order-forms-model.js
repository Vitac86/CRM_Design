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

  // Monetary arithmetic stays in integer minor units, including large manual trade totals.
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
    values['extra-security-price'] = isLimit
      ? formatAmount(values['extra-security-price']) : MARKET_PRICE;
    // «Сумма сделки в валюте сделки» has no value on a market order: the form
    // itself leaves it blank when the price is not yet known.
    values['extra-trade-amount'] = isLimit ? formatAmount(values['extra-trade-amount']) : '';
  }

  function deriveFx(values, isLimit) {
    var reference = catalog();
    var instrument = reference
      ? reference.getFxInstrument(values['extra-fx-instrument-id']) : null;
    values['extra-fx-instrument'] = instrument
      ? reference.describeFxInstrument(instrument) : '';
    values['extra-fx-lots'] = formatAmount(values['extra-fx-lots']);
    values['extra-fx-rate'] = isLimit ? formatAmount(values['extra-fx-rate']) : MARKET_PRICE;
    values['extra-fx-amount'] = formatAmount(values['extra-fx-amount']);
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
    values['extra-derivative-premium'] = isLimit
      ? formatAmount(values['extra-derivative-premium']) : MARKET_PRICE;
    values['extra-derivative-amount'] = formatAmount(values['extra-derivative-amount']);
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
    var choice = v['extra-settlement-period'] || (v.settlementMode === 'date' ? 'date' : v.settlementTenor);
    if (choice === 'date') return {settlementMode:'date', settlementDateISO:text(v['extra-settlement-date'] ?? v.settlementDateISO)};
    return {settlementMode:'tenor', settlementTenor:text(choice)};
  }

  function settlementText(s) {
    return s.settlementMode === 'date' ? (calendarDate(s.settlementDateISO) ? isoToRu(s.settlementDateISO) : '') : s.settlementTenor;
  }

  function accruedReviewKey(v) {
    var s = settlement(v);
    return JSON.stringify([v['extra-security-asset-id'], s, v['extra-order-date'] || '',
      s.settlementMode === 'date' ? '' : v['extra-accrued-date'], text(v['extra-accrued-manual']),
      text(v['extra-accrued-currency']).toUpperCase(), text(v['extra-security-currency']).toUpperCase()]);
  }

  function accruedInterest(asset, v, data, target) {
    var manual = v['extra-accrued-mode'] === 'manual';
    function missing(message) { return {mode:manual?'manual':'reference', value:'', message:message}; }
    if (manual) {
      var amount = text(v['extra-accrued-manual']), currency = text(v['extra-accrued-currency']).toUpperCase();
      var date = target || v['extra-accrued-date'];
      if (!global.CRMOrderCalculation.decimal(amount)) return missing('Введите НКД от нуля и выше.');
      if (!calendarDate(date)) return missing('Укажите дату ручного НКД.');
      if (!/^[A-Z]{3}$/.test(currency)) return missing('Укажите валюту НКД трёхбуквенным кодом.');
      return {mode:'manual', value:amount.replace(',','.'), currency:currency, date:date,
        source:'Введено вручную', unit:'per-security', confirmed:v['extra-accrued-confirmed'] === accruedReviewKey(v)};
    }
    if (!calendarDate(target)) return missing('Для автоматического НКД нужна конкретная дата расчётов. Календарь T+N не подключён.');
    var rows = (data && data.quotes || []).filter(function (r) { return r.assetId === asset.assetId && r.date === target; });
    if (!rows.length) return missing('На выбранную дату НКД в справочнике отсутствует.');
    var first = rows[0];
    if (rows.some(function (r) { return !global.CRMOrderCalculation.decimal(r.value) || !r.source ||
      !/^[A-Z]{3}$/.test(r.currency) || r.unit !== 'per-security'; }))
      return missing('Источник не подтвердил значение, валюту или единицу НКД.');
    if (rows.some(function (r) { return formatAmount(r.value) !== formatAmount(first.value) || r.currency !== first.currency; }))
      return missing('Значения НКД в секциях расходятся: ' + rows.map(function (r) { return r.section+' — '+formatAmount(r.value)+' '+r.currency; }).join(', ') + '. Уточните значение или введите его вручную.');
    return {mode:'reference', value:String(first.value), currency:first.currency, date:target, unit:first.unit,
      source:Array.from(new Set(rows.map(function (r) { return r.source; }))).sort().join(', '),
      sections:Array.from(new Set(rows.map(function (r) { return r.section; }))).sort(), confirmed:true};
  }

  function datedBondSpec(base, data, target, interest) {
    var terms = data && data.terms;
    if (!terms || terms.date !== target || !terms.source || !base || terms.currency !== base.currency ||
        terms.unit !== 'per-security') return null;
    if (terms.formula === 'unit' && !['quoted','clean'].includes(terms.amountBasis)) return null;
    var spec = Object.assign({},base,{source:terms.source,formula:terms.formula,amountBasis:terms.amountBasis,
      nominal:terms.nominal,settlementDate:target});
    if (interest && interest.value !== '' && interest.currency === terms.currency && interest.date === target &&
        interest.unit === 'per-security') {
      spec.accrued = interest.value;
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
    var data = isBond && catalog().bondData(item.assetId,target);
    var interest = isBond ? accruedInterest(item,v,data,target) : null;
    var dated = isBond ? datedBondSpec(spec,data,target,interest) : spec;
    var priceCurrency = branch === 'security' && v['extra-security-currency'] != null
      ? text(v['extra-security-currency']).toUpperCase() : (spec && spec.currency || '');
    var math = global.CRMOrderCalculation;
    var result;
    if (v['extra-order-kind'] !== 'limit') result = math.unavailable('Сумма рыночного поручения не определена.');
    else if (branch === 'security' && v['extra-repo-ccp'] === 'yes' || branch === 'fx' && v['extra-fx-swap-ccp'] === 'yes')
      result = math.unavailable('Для РЕПО и СВОП нужны условия обеих частей.');
    else if (v['extra-trade-kind'] === 'other') result = math.unavailable('Для иного вида сделки требуется подтверждённая сумма.');
    else if (!keys || !item) result = math.unavailable('Выберите инструмент из справочника.');
    else if (branch === 'security' && spec && priceCurrency !== spec.currency)
      result = math.unavailable('Для выбранной валюты цены отсутствует спецификация расчёта.');
    else if (isBond && !dated) result = math.unavailable('Нет подтверждённых единиц котировки и спецификации облигации на дату расчётов.');
    else result = math.calculate(dated, v[keys[1]], v[keys[2]]);
    return {branch:branch, keys:keys, item:item, spec:dated || spec, result:result, currency:priceCurrency,
      isBond:isBond, quotation:dated && dated.formula, interest:interest};
  }

  function reviewKey(id, s, v) {
    if (id === 'order-trade') {
      var trade = tradeCalculation(v), keys = trade.keys || [];
      return JSON.stringify([id, s.id, v['extra-trade-kind'], v['extra-order-market'], v['extra-order-kind'],
        settlement(v), trade.interest, v[keys[0]], v[keys[1]], v[keys[2]], trade.branch === 'security' ? text(v['extra-repo-ccp']) : trade.branch === 'fx' ? text(v['extra-fx-swap-ccp']) : '',
        trade.currency, trade.result.value, trade.spec || null, v['extra-amount-mode'], v['extra-manual-amount'], v['extra-amount-reason']]);
    }
    var p = id === 'order-venue-transfer' ? 'extra-move-' : 'extra-payout-';
    return JSON.stringify([id, s.id, v[p + 'amount-mode'] || '', formatMoney(v[p+'amount']), v[p+'currency'],
      v['extra-words-mode'], v['extra-manual-words']]);
  }

  function difference(manual, calculated) {
    var a = parseMoney(manual), b = parseMoney(calculated);
    if (a.error || a.negative || b.error || b.negative || !calculated) return '';
    var delta = a.minorTotal - b.minorTotal;
    var magnitude = delta < 0n ? -delta : delta;
    return (delta < 0n ? '−' : delta > 0n ? '+' : '') + String(magnitude / 100n) + ',' +
      String(magnitude % 100n).padStart(2,'0');
  }

  function formatDecimalInput(value, group) {
    var parts = String(value || '').split('.');
    if (group) parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join(',');
  }

  function context(id, subject, values) {
    var v = values, key = id === 'order-venue-transfer' ? 'extra-move-' : 'extra-payout-';
    var trade = id === 'order-trade' ? tradeCalculation(v) : null;
    var info = trade && trade.result;
    return {
      identity: identity(subject), requisites: requisiteFields(payoutRequisite(subject, v)),
      words: v[key + 'amount'] && CURRENCIES[v[key+'currency']] ? amountInWords(v[key+'amount'], v[key+'currency']) : '',
      discrepancy: info ? difference(v['extra-manual-amount'],info.value) : '',
      accrued: trade && trade.interest ? (trade.interest.mode !== 'manual' && v['extra-accrued-status']) || trade.interest.message || (formatAmount(trade.interest.value) + ' ' + trade.interest.currency + '/бумагу · ' + isoToRu(trade.interest.date) + ' · ' + trade.interest.source) : '',
      estimate: info ? info.value ? formatDecimalInput(info.value, true) + ' ' + info.currency +
        (trade.isBond && trade.spec.source ? ' · '+trade.spec.source : '') : 'Недостаточно данных для расчёта. '+info.reason : ''
    };
  }

  function prepare(id, subject, input) {
    var kind = KINDS[id], v = Object.assign({}, input), errors = [], out = {}, checks = {}, raw = {};
    var metadata = { documentId: id, subjectId: subject.id }, ident = identity(subject);
    if (!v['extra-settlement-period'] && v.settlementMode) {
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
      if (v.confirmedAgainst !== against) issue('order-review', 'Проверьте и подтвердите ручную редакцию для текущих значений.');
      metadata.lastValidatedAgainst = v.confirmedAgainst === against ? against : null;
      keep(['confirmedAgainst']);
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
      var trade = tradeCalculation(v), keys = trade.keys, result = trade.result;
      oneOf('extra-trade-kind', ['buy','sell','other']); oneOf('extra-order-kind', ['limit','market']);
      oneOf('extra-order-validity-mode', ['cancelled','date']);
      oneOf('extra-settlement-period', ['T+0','T+1','T+2','date']);
      var s = settlement(v), target = s.settlementDateISO;
      Object.assign(metadata,s);
      Object.assign(raw,s);
      if (s.settlementMode === 'date') {
        var bounds = trade.item && trade.item.settlementBounds || {};
        if (!calendarDate(target) || (date && target < date) || (bounds.first && target < bounds.first) || (bounds.last && target > bounds.last))
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
        copy([keys[0],keys[1]]); if (limit) copy([keys[2]]);
        if (!/^[1-9]\d*$/.test(String(v[keys[1]] || '').replace(/ /g,''))) issue(keys[1], 'Укажите положительное целое количество.');
        if (limit) {
          var price = global.CRMOrderCalculation.decimal(v[keys[2]]);
          if (!price || !price.n) issue(keys[2], 'Укажите положительную лимитную цену.');
        }
        if (trade.branch==='security') {
          oneOf('extra-repo-ccp',['yes','no']); copy(['extra-repo-ccp']); deriveSecurity(out,limit);
          if ((trade.currency && !/^[A-Z]{3}$/.test(trade.currency)) || (limit && !trade.currency))
            issue('extra-security-currency', 'Введите трёхбуквенный код валюты цены.');
          out['extra-security-currency'] = trade.currency;
          keep(['extra-security-currency']);
          if (limit && trade.quotation==='bond-percent') out['extra-security-price'] += ' %';
          if (trade.isBond) {
            var interest = trade.interest;
            metadata.accruedInterest = interest;
            keep(['extra-accrued-mode']);
            if (v['extra-accrued-mode'] && !['reference','manual'].includes(v['extra-accrued-mode']))
              issue('extra-accrued-mode','Выберите источник НКД.');
            if (interest.mode === 'manual') {
              keep(['extra-accrued-manual','extra-accrued-currency','extra-accrued-confirmed']);
              if (!target) keep(['extra-accrued-date']);
              if (!interest.confirmed) issue('extra-accrued-review', interest.message || 'Подтвердите НКД для текущего инструмента и даты.');
            }
            if (interest.value !== '' && interest.confirmed) out['extra-security-accrued'] = formatAmount(interest.value) +
              (interest.currency === trade.currency ? '' : ' '+interest.currency);
          }
        } else if (trade.branch==='fx') {
          oneOf('extra-fx-swap-ccp',['yes','no']); copy(['extra-fx-swap-ccp']); deriveFx(out,limit);
        } else deriveDerivative(out,limit);
        var mode = v['extra-amount-mode'] || 'auto';
        metadata.amount = { mode: limit ? (mode === 'manual' ? mode : result.mode) : 'unavailable',
          source: trade.spec && trade.spec.source || null, sourceRecordId: v[keys[0]], calculated: result.value, reason: result.reason || '' };
        out[keys[3]] = '';
        if (limit) {
          if (!['manual','auto'].includes(mode)) issue('extra-manual-amount', 'Недопустимый режим суммы.');
          if (result.invalid) issue(keys[2],result.reason);
          keep(['extra-amount-mode']);
          if (mode === 'manual') {
            positive('extra-manual-amount'); keep(['extra-manual-amount','extra-amount-reason']);
            if (!safeText(v['extra-amount-reason'])) issue('extra-amount-reason','Укажите основание ручной суммы.');
            confirm();
            out[keys[3]] = formatMoney(v['extra-manual-amount']);
            metadata.amount.reason = text(v['extra-amount-reason']);
            metadata.amount.difference = difference(v['extra-manual-amount'],result.value);
            metadata.amount.currency = trade.currency || (trade.item && trade.item.quote) || '';
          } else if (result.value) out[keys[3]] = formatDecimalInput(result.value,true);
          else issue('extra-manual-amount',result.reason + ' Введите сумму сделки.');
        }
        metadata.amount.value = out[keys[3]];
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
    settlement: settlement, settlementText: settlementText, accruedReviewKey: accruedReviewKey,
    instrumentBranch: instrumentBranch, formatAmount: formatAmount, formatMoney: formatMoney, moneyProblem: moneyProblem,
    amountInWords: amountInWords, formatDecimalInput: formatDecimalInput, tradeCalculation: tradeCalculation, context: context, reviewKey: reviewKey, prepare: prepare
  };
}(typeof window !== 'undefined' ? window : this));
