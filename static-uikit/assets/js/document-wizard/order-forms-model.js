// Order forms (ПРИЛОЖЕНИЕ 7) — the payload contract of the three order forms.
//
// The Document Wizard collects what a manager chose; this module turns that
// into the `extra.*` / `check.*` values the field map prints, and is the only
// place that decides what an order actually contains.
//
// It does two things the wizard cannot do generically:
//
//   1. DERIVES the values a manager must not type. The issuer, the security
//      description, the FX instrument name, the derivative master data, the
//      printable validity, the market price wording, the submission kind, the
//      amount in words and the payout bank requisites are all built here from
//      the selected instrument, the fixed choices and the subject card.
//
//   2. DROPS every value that does not belong to the branch the manager
//      actually filled. This is not tidiness: the file holds three forms and
//      the trade form holds four mutually exclusive instrument blocks, and the
//      map draws a trade-form row whenever the order is a trade. A security
//      left behind by a market that has since been switched away from would be
//      printed on a currency order. The outgoing payload is therefore built
//      from an allow-list per branch rather than filtered after the fact.
//
// The payload key names are the ones the map and the backend already know.
// Internal selections (`extra-security-asset-id`, `extra-fx-instrument-id`,
// `extra-derivative-id`) travel with the active branch as well: the AssetID is
// the value a real QORT integration will want, and it is nothing the map reads.

(function (global) {
  'use strict';

  // ── The keys each branch may contribute ───────────────────────────────────

  var COMMON_KEYS = [
    'extra-order-type', 'extra-submission-kind', 'extra-order-number-date',
    'extra-contract-number-date', 'extra-brokerage-account'
  ];

  var TRADE_KEYS = [
    'extra-trade-kind', 'extra-trade-kind-other',
    'extra-order-market', 'extra-otc-instrument-type',
    'extra-order-kind', 'extra-order-kind-conditional',
    'extra-order-validity-mode', 'extra-order-validity-date', 'extra-order-validity',
    'extra-settlement-period', 'extra-counterparty', 'extra-order-other-info'
  ];

  var SECURITY_KEYS = [
    'extra-security-asset-id', 'extra-security-issuer', 'extra-security-type',
    'extra-security-quantity', 'extra-security-price', 'extra-repo-ccp',
    'extra-trade-amount'
  ];

  var FX_KEYS = [
    'extra-fx-instrument-id', 'extra-fx-instrument', 'extra-fx-lots',
    'extra-fx-rate', 'extra-fx-amount', 'extra-fx-swap-ccp'
  ];

  var DERIVATIVE_KEYS = [
    'extra-derivative-id', 'extra-derivative-kind', 'extra-derivative-name',
    'extra-derivative-quantity', 'extra-derivative-premium',
    'extra-derivative-strike', 'extra-derivative-expiry', 'extra-derivative-amount'
  ];

  var TRANSFER_KEYS = [
    'extra-move-from', 'extra-move-to', 'extra-move-amount',
    'extra-move-amount-words', 'extra-move-currency'
  ];

  var WITHDRAWAL_KEYS = [
    'extra-payout-currency', 'extra-payout-amount-mode', 'extra-payout-amount',
    'extra-payout-amount-words', 'extra-payout-from',
    'extra-bank-recipient', 'extra-bank-bic', 'extra-bank-name',
    'extra-bank-corr-swift', 'extra-bank-corr-name', 'extra-bank-corr-account',
    'extra-bank-account', 'extra-bank-inn', 'extra-bank-personal-account',
    'extra-bank-other'
  ];

  // Printed where the form asks for a price a market order does not have.
  var MARKET_PRICE = 'Рыночная';
  var VALIDITY_UNTIL_CANCELLED = 'До отмены';

  // ── Values ────────────────────────────────────────────────────────────────

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function parseAmount(raw) {
    var value = text(raw).replace(/\s/g, '').replace(',', '.');
    if (!value || !/^-?\d*\.?\d+$/.test(value)) return null;
    var parsed = Number(value);
    return isFinite(parsed) ? parsed : null;
  }

  // 1234.5 → «1 234,5». An ordinary space groups the thousands: these rows are
  // drawn into narrow slots that the layout may have to shrink, and a
  // non-breaking space would take a wrap opportunity away from it.
  function formatAmount(raw) {
    var parsed = parseAmount(raw);
    if (parsed === null) return text(raw);
    var parts = String(Math.abs(parsed)).split('.');
    var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (parsed < 0 ? '-' : '') + whole + (parts[1] ? ',' + parts[1] : '');
  }

  // ── Amount in words ───────────────────────────────────────────────────────
  //
  // Both money forms print the amount twice — «цифрами» and «прописью» — and
  // the second is not a second thing to type: it is the first one spelled out.
  // A manager retyping it is a manager who can disagree with the figure they
  // just entered, so it is derived and never offered.
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
    { gender: 'm', forms: ['миллиард', 'миллиарда', 'миллиардов'] }
  ];

  // The currencies the two forms offer as a fixed choice. «Иная валюта» has no
  // name anywhere on the form — the source prints only a box — so an amount in
  // an unnamed currency spells the number and writes the fraction as a ratio.
  var CURRENCIES = {
    RUB: { gender: 'm', major: ['рубль', 'рубля', 'рублей'],
           minor: ['копейка', 'копейки', 'копеек'] },
    USD: { gender: 'm', major: ['доллар США', 'доллара США', 'долларов США'],
           minor: ['цент', 'цента', 'центов'] },
    EURO: { gender: 'm', major: ['евро', 'евро', 'евро'],
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
    if (value === 0) return ['ноль'];
    var groups = [];
    var rest = value;
    while (rest > 0) {
      groups.push(rest % 1000);
      rest = Math.floor(rest / 1000);
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
    var amount = parseAmount(raw);
    if (amount === null) return '';
    var unit = CURRENCIES[text(currency)] || null;
    // Work in minor units so 0.1 + 0.2 arithmetic can never lose a kopeck.
    var minorTotal = Math.round(Math.abs(amount) * 100);
    var major = Math.floor(minorTotal / 100);
    var minor = minorTotal % 100;
    var words = integerWords(major, unit ? unit.gender : 'm');
    if (unit) words.push(plural(major, unit.major));
    var minorDigits = (minor < 10 ? '0' : '') + minor;
    words.push(unit ? (minorDigits + ' ' + plural(minor, unit.minor))
      : (minorDigits + '/100'));
    var sentence = words.join(' ');
    return sentence.charAt(0).toLocaleUpperCase('ru-RU') + sentence.slice(1);
  }

  // A sum of money always prints both minor digits: the amount in words spells
  // «… 50 копеек», and «125 000,5» beside it would be the same figure written
  // two different ways on one line.
  function formatMoney(raw) {
    var parsed = parseAmount(raw);
    if (parsed === null) return text(raw);
    var minorTotal = Math.round(Math.abs(parsed) * 100);
    var whole = String(Math.floor(minorTotal / 100))
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    var minor = minorTotal % 100;
    return (parsed < 0 ? '-' : '') + whole + ',' + (minor < 10 ? '0' : '') + minor;
  }

  function isoToRu(value) {
    var match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? (match[3] + '.' + match[2] + '.' + match[1]) : text(value);
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
      if (otc === 'currency') return 'fx';
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

  // ── Payout bank requisites ────────────────────────────────────────────────
  //
  // The withdrawal form's bank block is CRM-owned data, not something a
  // manager should retype from a screen they already have open. Each row here
  // has an exact UMI name in `Front Реквизиты` (docs/umi-variable-registry.md);
  // the wizard reads them from the subject card's static mock today and the
  // backend will point the same keys at the real record.
  //
  //   recipient              umi.requisites.recipient
  //   bankName               umi.requisites.bank_name
  //   bic                    umi.requisites.bik_dlya_rublevyh_rekvizitov
  //   correspondentSwift     umi.requisites.inter_swift_code
  //   correspondentBankName  umi.requisites.inter_bank_name
  //   correspondentAccount   umi.requisites.corr_account
  //   account                umi.requisites.payment_account
  //   inn                    umi.requisites.inn
  //   personalAccount        umi.requisites.payment_account (лицевой счёт row)
  //   notation               umi.requisites.notation
  //
  // A client may hold several requisites. Which one a payout uses is one of
  // the open questions in docs/order-forms-mapping-gap.md; until it is
  // answered the rule is the one the form itself implies — the requisite whose
  // currency is the currency being withdrawn, falling back to the record the
  // card marks primary (`umi.requisites.osnovnoj_rekvizit`) when it is for
  // that same currency.
  function payoutRequisite(subject, values) {
    var currency = text(values['extra-payout-currency']);
    var records = (subject && subject.bankRequisites) || [];
    if (!currency) return null;
    var matching = records.filter(function (record) {
      return text(record.currency) === currency;
    });
    if (!matching.length) return null;
    var primary = matching.filter(function (record) { return !!record.primary; });
    return (primary[0] || matching[0]);
  }

  // The `extra-bank-*` payload keys, filled from one requisite record. The key
  // names are the ones the map and the backend already know; only where the
  // value comes from has changed.
  function requisiteFields(record) {
    return {
      'extra-bank-recipient': text(record && record.recipient),
      'extra-bank-bic': text(record && record.bic),
      'extra-bank-name': text(record && record.bankName),
      'extra-bank-corr-swift': text(record && record.correspondentSwift),
      'extra-bank-corr-name': text(record && record.correspondentBankName),
      'extra-bank-corr-account': text(record && record.correspondentAccount),
      'extra-bank-account': text(record && record.account),
      'extra-bank-inn': text(record && record.inn),
      'extra-bank-personal-account': text(record && record.personalAccount),
      'extra-bank-other': text(record && record.notation)
    };
  }

  // What a payout cannot be executed without. The correspondent BANK — its
  // SWIFT and its name — is an intermediary that a domestic rouble route
  // simply does not have, so it is required only where the route needs one.
  // The correspondent ACCOUNT is a different row: a rouble payment carries the
  // recipient bank's own к/с, so it is always required.
  var REQUISITE_LABELS = {
    'extra-bank-recipient': 'получатель',
    'extra-bank-name': 'наименование банка получателя',
    'extra-bank-bic': 'БИК/SWIFT банка получателя',
    'extra-bank-corr-account': 'корреспондентский счёт банка получателя',
    'extra-bank-account': 'счёт получателя',
    'extra-bank-corr-swift': 'SWIFT банка-корреспондента',
    'extra-bank-corr-name': 'наименование банка-корреспондента'
  };

  var REQUISITE_CORE = [
    'extra-bank-recipient', 'extra-bank-name', 'extra-bank-bic',
    'extra-bank-corr-account', 'extra-bank-account'
  ];
  var REQUISITE_CORRESPONDENT = ['extra-bank-corr-swift', 'extra-bank-corr-name'];

  function requiredRequisiteKeys(currency) {
    return text(currency) === 'RUB'
      ? REQUISITE_CORE.slice()
      : REQUISITE_CORE.concat(REQUISITE_CORRESPONDENT);
  }

  // The read-only context the wizard's `valueFrom` controls resolve against.
  // Returned as plain data so the renderer never learns what a requisite is.
  function context(subject, values) {
    var record = payoutRequisite(subject, values);
    return { requisites: requisiteFields(record) };
  }

  // Missing CRM data is not a blank row on a client's payout order: it is a
  // refusal that names what is missing. Returned as wizard field keys so the
  // caller can mark the exact controls.
  function validate(subject, values) {
    var problems = [];
    if (text(values['extra-order-type']) !== 'withdrawal') return problems;
    var currency = text(values['extra-payout-currency']);
    if (!currency) return problems;

    var record = payoutRequisite(subject, values);
    var resolved = requisiteFields(record);
    var missing = requiredRequisiteKeys(currency).filter(function (key) {
      return !resolved[key];
    });
    if (!missing.length) return problems;

    var names = missing.map(function (key) { return REQUISITE_LABELS[key]; });
    var reason = record
      ? 'В карточке субъекта не заполнены реквизиты для вывода в ' + currency + ': '
      : 'В карточке субъекта нет банковских реквизитов для вывода в ' + currency +
        '. Недоступны: ';
    missing.forEach(function (key) {
      problems.push({ key: key, message: reason + names.join(', ') + '.' });
    });
    return problems;
  }

  // ── The public step ───────────────────────────────────────────────────────

  function pick(source, keys, target) {
    keys.forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(source, key)) target[key] = source[key];
    });
    return target;
  }

  // Returns fresh `extraValues` / `checkValues` maps. The caller's originals
  // are not modified: the DOM still holds what the manager typed, and a value
  // dropped from one generation must come back if the branch is chosen again.
  function normalize(extraValues, checkValues, subject) {
    var values = {};
    Object.keys(extraValues || {}).forEach(function (key) {
      values[key] = extraValues[key];
    });
    var checks = {};
    Object.keys(checkValues || {}).forEach(function (key) {
      checks[key] = checkValues[key];
    });

    // Always a primary submission. The «Отмена ранее поданной заявки» box of
    // the source form is mapped and stays mapped; nothing can set it.
    values['extra-submission-kind'] = 'primary';
    // Never generated: this process does not accept conditional orders.
    values['extra-order-kind-conditional'] = '';

    var orderType = text(values['extra-order-type']);
    var allowed = COMMON_KEYS.slice();

    if (orderType === 'trade') {
      var isLimit = text(values['extra-order-kind']) === 'limit';
      values['extra-order-validity'] = deriveValidity(values);
      // Answers to questions this order no longer asks. The map guards each of
      // them with its own condition, so none of these could print; they are
      // cleared because the payload is also read by people and by the backend.
      if (text(values['extra-trade-kind']) !== 'other') {
        values['extra-trade-kind-other'] = '';
      }
      if (text(values['extra-order-market']) !== 'otc') {
        values['extra-otc-instrument-type'] = '';
      }
      if (text(values['extra-order-validity-mode']) !== 'date') {
        values['extra-order-validity-date'] = '';
      }
      allowed = allowed.concat(TRADE_KEYS);

      var branch = instrumentBranch(values);
      if (branch === 'security') {
        deriveSecurity(values, isLimit);
        allowed = allowed.concat(SECURITY_KEYS);
      } else if (branch === 'fx') {
        deriveFx(values, isLimit);
        allowed = allowed.concat(FX_KEYS);
      } else if (branch === 'derivative') {
        deriveDerivative(values, isLimit);
        allowed = allowed.concat(DERIVATIVE_KEYS);
      }

      // The form's own wording, and not a question the manager answers: a
      // trade order always carries the uncovered-position acknowledgement.
      checks['order-uncovered-ack'] = true;
    } else {
      checks['order-uncovered-ack'] = false;
      if (orderType === 'transfer') {
        values['extra-move-amount'] = formatMoney(values['extra-move-amount']);
        values['extra-move-amount-words'] = amountInWords(
          values['extra-move-amount'], values['extra-move-currency']);
        allowed = allowed.concat(TRANSFER_KEYS);
      } else if (orderType === 'withdrawal') {
        if (text(values['extra-payout-amount-mode']) === 'amount') {
          values['extra-payout-amount'] = formatMoney(values['extra-payout-amount']);
          values['extra-payout-amount-words'] = amountInWords(
            values['extra-payout-amount'], values['extra-payout-currency']);
        } else {
          // «В размере свободного остатка»: there is no figure, so there is
          // nothing to spell out. Both amount rows stay blank by design.
          values['extra-payout-amount'] = '';
          values['extra-payout-amount-words'] = '';
        }
        // The bank block comes from the subject card, not from the screen.
        // Taken here rather than from the read-only controls so the payload is
        // right even if a control was never rendered.
        var requisites = requisiteFields(payoutRequisite(subject, values));
        Object.keys(requisites).forEach(function (key) {
          values[key] = requisites[key];
        });
        allowed = allowed.concat(WITHDRAWAL_KEYS);
      }
    }

    return {
      extraValues: pick(values, allowed, {}),
      checkValues: checks
    };
  }

  global.CRMOrderForms = {
    DOCUMENT_ID: 'order-forms',
    MARKET_PRICE: MARKET_PRICE,
    VALIDITY_UNTIL_CANCELLED: VALIDITY_UNTIL_CANCELLED,
    instrumentBranch: instrumentBranch,
    formatAmount: formatAmount,
    formatMoney: formatMoney,
    amountInWords: amountInWords,
    payoutRequisite: payoutRequisite,
    context: context,
    validate: validate,
    normalize: normalize
  };

}(typeof window !== 'undefined' ? window : this));
