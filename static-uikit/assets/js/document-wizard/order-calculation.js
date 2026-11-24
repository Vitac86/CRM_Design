// Decimal ratios keep quantity, quotation and currency rounding exact through the final step.
(function (global) {
  'use strict';

  function decimal(value) {
    var s = String(value == null ? '' : value).trim().replace(/\s/g, '').replace(',', '.');
    if (!/^\d{1,25}(?:\.\d{1,12})?$/.test(s)) return null;
    var parts = s.split('.');
    return { n: BigInt(parts.join('')), d: 10n ** BigInt((parts[1] || '').length) };
  }

  function multiplied(a, b) { return { n: a.n * b.n, d: a.d * b.d }; }
  function multiple(a, step) {
    return step && step.n > 0n && (a.n * step.d) % (step.n * a.d) === 0n;
  }
  function unavailable(reason, invalid) {
    return { mode: 'unavailable', value: '', reason: reason, invalid: !!invalid };
  }
  function added(a,b) { return {n:a.n*b.d + b.n*a.d, d:a.d*b.d}; }
  function roundedValue(amount, digits) {
    var rounded = (2n * amount.n * 10n**BigInt(digits) + amount.d) / (2n * amount.d);
    var s = rounded.toString().padStart(digits+1,'0');
    return digits ? s.slice(0,-digits) + '.' + s.slice(-digits) : s;
  }

  function roundCurrency(value, currency) {
    var amount = decimal(value);
    if (!amount || !/^[A-Z]{3}$/.test(currency)) return String(value ?? '');
    var digits = new Intl.NumberFormat('ru', {style:'currency',currency:currency}).resolvedOptions().maximumFractionDigits;
    return roundedValue(amount,digits);
  }

  function converted(amount, from, to, spec) {
    if (from === to || amount.n === 0n) return amount;
    var rate = (spec.rates || []).find(function (r) {
      return r.from === from && r.to === to && r.date === spec.tradeDate && ['official','manual'].includes(r.status);
    });
    if (!rate || !rate.legs.length) return null;
    var currency = from;
    for (var leg of rate.legs) {
      var price = decimal(leg.rate), units = decimal(leg.units);
      if (!price || !price.n || !units || !units.n) return null;
      var factor = {n:price.n*units.d, d:price.d*units.n};
      if (leg.from === currency) currency = leg.to;
      else if (leg.to === currency) {
        currency = leg.from;
        factor = {n:factor.d,d:factor.n};
      } else return null;
      amount = multiplied(amount,factor);
    }
    return currency === to ? amount : null;
  }

  function bondAmount(spec,q,p) {
    if (!['clean','dirty','quoted'].includes(spec.amountBasis))
      return unavailable('Не определены правила учёта НКД.');
    var principal = multiplied(q,p), nominal = decimal(spec.nominal);
    var percent = spec.formula === 'bond-percent';
    if (percent) {
      if (!nominal || !nominal.n) return unavailable('Не определён номинал на дату расчётов.');
      principal = multiplied(principal, nominal);
      principal.d *= 100n;
    }
    var base = percent ? spec.nominalCurrency || spec.currency : spec.currency;
    var pay = spec.settlementCurrency || spec.currency, accruedCurrency = spec.accruedCurrency || base;
    var addAccrued = spec.amountBasis === 'dirty' && !spec.quoteIncludesAccrued;
    var interest = {n:0n,d:1n};
    if (addAccrued) {
      var perBond = decimal(spec.accrued);
      if (!perBond || !spec.accruedFor || spec.accruedFor !== spec.settlementDate)
        return unavailable('Нет НКД на дату расчётов.');
      interest = multiplied(q,perBond);
    }
    var baseDigits = (percent ? spec.nominalDigits : spec.minorDigits) ?? spec.minorDigits;
    var interestDigits = accruedCurrency === base ? baseDigits :
      new Intl.NumberFormat('ru',{style:'currency',currency:accruedCurrency}).resolvedOptions().maximumFractionDigits;
    var components = {price:roundedValue(principal,baseDigits),priceCurrency:base,
      includesAccrued:!!spec.quoteIncludesAccrued,interest:addAccrued ? roundedValue(interest,interestDigits) : '',
      accruedCurrency:accruedCurrency,subtotalCurrency:base,
      subtotal:base === accruedCurrency || !interest.n ? roundedValue(added(principal,interest),baseDigits) : ''};
    var cleanPay = converted(principal,base,pay,spec), accruedPay = converted(interest,accruedCurrency,pay,spec);
    if (!cleanPay || !accruedPay) return Object.assign(unavailable('Для пересчёта нужен курс на дату сделки.'),{components:components});
    var value = roundedValue(added(cleanPay,accruedPay),spec.settlementDigits ?? spec.minorDigits);
    if (!/[1-9]/.test(value)) return unavailable('После округления сумма равна нулю.',true);
    return {mode:'auto',value:value,currency:pay,components:components,source:spec.source};
  }

  function calculate(spec, quantity, price) {
    if (!spec || !spec.source || !spec.currency || spec.rounding !== 'half-up' ||
        !Number.isInteger(spec.minorDigits) || spec.minorDigits < 0 || spec.minorDigits > 6) {
      return unavailable('Нет полной спецификации инструмента и правил округления.');
    }
    var q = decimal(quantity), p = decimal(price);
    if (!q || !p || !q.n || !p.n) return unavailable('Введите положительные количество и лимитную цену.', true);
    var qs = decimal(spec.quantityStep), ps = decimal(spec.priceStep);
    if (!qs || !ps || !qs.n || !ps.n) return unavailable('Не определён шаг количества или цены.');
    var stepPrice = p;
    if (spec.nativeQuotation && ((spec.formula === 'bond-percent' && spec.nativeQuotation === 'cash') ||
        (spec.formula === 'bond-cash' && spec.nativeQuotation === 'percent'))) {
      var nominal = decimal(spec.nominal);
      if (!nominal || !nominal.n || spec.nominalCurrency !== spec.currency)
        return unavailable('Не подтверждён пересчёт шага цены между способами котирования.');
      stepPrice = multiplied(p,spec.nativeQuotation === 'cash'
        ? {n:nominal.n,d:100n*nominal.d} : {n:100n*nominal.d,d:nominal.n});
    }
    if (!multiple(q, qs) || !multiple(stepPrice, ps)) return unavailable('Количество или цена не соответствуют шагу инструмента.', true);
    var result = multiplied(q, p);
    var formula = quantity + ' × ' + price;
    if (spec.formula === 'unit' && spec.quantityUnit === 'pieces') {
      // Price per security and quantity in individual securities.
    } else if (['bond-percent','bond-cash'].includes(spec.formula) && spec.quantityUnit === 'pieces') {
      return bondAmount(spec,q,p);
    } else if (spec.formula === 'fx' && spec.quantityUnit === 'lots') {
      var lot = decimal(spec.lotSize), scale = decimal(spec.quoteScale);
      if (!lot || !scale || !lot.n || !scale.n) return unavailable('Не определены размер лота или масштаб котировки.');
      result = multiplied(multiplied(result, lot), { n: scale.d, d: scale.n });
      formula += ' × ' + spec.lotSize + ' / ' + spec.quoteScale;
    } else if (spec.formula === 'premium' && spec.quantityUnit === 'contracts') {
      var factor = decimal(spec.premiumMultiplier);
      if (!factor || !factor.n) return unavailable('Не определён множитель премии опциона.');
      result = multiplied(result, factor);
      formula += ' × ' + spec.premiumMultiplier;
    } else {
      return unavailable('Формула денежной суммы для этой спецификации не подтверждена.');
    }
    var value = roundedValue(result,spec.minorDigits);
    if (!/[1-9]/.test(value)) return unavailable('После округления сумма равна нулю.', true);
    return { mode: 'auto', value: value, currency: spec.currency, formula: formula, source: spec.source };
  }

  global.CRMOrderCalculation = { calculate: calculate, decimal: decimal, roundCurrency:roundCurrency, unavailable: unavailable };
}(typeof window !== 'undefined' ? window : this));
