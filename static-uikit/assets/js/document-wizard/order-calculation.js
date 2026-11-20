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
  function calculate(spec, quantity, price) {
    if (!spec || !spec.source || !spec.currency || spec.rounding !== 'half-up' ||
        !Number.isInteger(spec.minorDigits) || spec.minorDigits < 0 || spec.minorDigits > 6) {
      return unavailable('Нет полной спецификации инструмента и правил округления.');
    }
    var q = decimal(quantity), p = decimal(price);
    if (!q || !p || !q.n || !p.n) return unavailable('Введите положительные количество и лимитную цену.', true);
    var qs = decimal(spec.quantityStep), ps = decimal(spec.priceStep);
    if (!qs || !ps || !qs.n || !ps.n) return unavailable('Не определён шаг количества или цены.');
    if (!multiple(q, qs) || !multiple(p, ps)) return unavailable('Количество или цена не соответствуют шагу инструмента.', true);
    var result = multiplied(q, p);
    var formula = quantity + ' × ' + price;
    if (spec.formula === 'unit' && spec.quantityUnit === 'pieces') {
      // Price per security and quantity in individual securities.
    } else if (spec.formula === 'bond-percent' && spec.quantityUnit === 'pieces') {
      var nominal = decimal(spec.nominal);
      if (!nominal || !nominal.n || !['clean', 'dirty'].includes(spec.amountBasis))
        return unavailable('Не определены номинал или правила учёта НКД.');
      result = multiplied(result, nominal);
      result.d *= 100n;
      formula += ' × ' + spec.nominal + ' / 100';
      if (spec.amountBasis === 'dirty') {
        var accrued = decimal(spec.accrued);
        if (!accrued || !spec.accruedFor || spec.accruedFor !== spec.settlementDate)
          return unavailable('Нет НКД на дату расчётов.');
        var interest = multiplied(q, accrued);
        result = { n: result.n * interest.d + interest.n * result.d, d: result.d * interest.d };
        formula += ' + ' + quantity + ' × ' + spec.accrued;
      }
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
    var scale10 = 10n ** BigInt(spec.minorDigits);
    var rounded = (2n * result.n * scale10 + result.d) / (2n * result.d);
    if (!rounded) return unavailable('После округления сумма равна нулю.', true);
    var digits = rounded.toString().padStart(spec.minorDigits + 1, '0');
    var value = spec.minorDigits ? digits.slice(0, -spec.minorDigits) + '.' + digits.slice(-spec.minorDigits) : digits;
    return { mode: 'auto', value: value, currency: spec.currency, formula: formula, source: spec.source };
  }

  global.CRMOrderCalculation = { calculate: calculate, decimal: decimal, unavailable: unavailable };
}(typeof window !== 'undefined' ? window : this));
