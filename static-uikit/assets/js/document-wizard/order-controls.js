// Live controls for the three independent Appendix 7 wizard entries.
(function (global) {
  'use strict';
  var orders = global.CRMOrderForms;
  function sync(doc, subject, container, state, event) {
    function el(key) { return container.querySelector('[data-field-key="' + key + '"]'); }
    function read() {
      var v = {};
      container.querySelectorAll('[data-field-key]').forEach(function (n) { v[n.dataset.fieldKey] = n.value; });
      return v;
    }
    function set(key, value) {
      var n = el(key);
      if (n) { n.value = value; state.fields[key] = value; }
    }
    function options(key, values, preselect) {
      var n = el(key);
      if (!n) return;
      var signature = JSON.stringify(values);
      if (n.dataset.options === signature) return;
      var previous = n.dataset.options === undefined ? state.fields[key] : n.value;
      while (n.options.length > 1) n.remove(1);
      values.forEach(function (o) { n.add(new Option(o.label, o.value)); });
      n.dataset.options = signature;
      var valid = values.some(function (o) { return o.value === previous; });
      set(key, valid ? previous : (preselect && values.length === 1 ? values[0].value : ''));
    }
    var changed = event && event.target && event.target.dataset.fieldKey;
    var v = read(), venueOptions = orders.venues(subject);
    ['extra-move-from','extra-move-to','extra-payout-from'].forEach(function (key) { options(key, venueOptions, false); });
    var dest = el('extra-move-to'), from = el('extra-move-from');
    if (dest && from && from.value && dest.value === from.value) {
      set(changed === 'extra-move-to' ? 'extra-move-from' : 'extra-move-to', '');
    }
    if (el('selectedRequisiteId')) {
      var records = orders.eligibleRequisites(subject,v['extra-payout-currency']);
      options('selectedRequisiteId',records.map(function (r) { return {value:r.id,
        label:r.bankName + ' · •••• ' + String(r.account || '').slice(-4) + ' · ' + v['extra-payout-currency'] + (r.primary?' · основной':'')}; }),true);
    }
    if (el('selectedRequisiteId') && v['extra-payout-currency']) {
      var select = el('selectedRequisiteId');
      select.options[0].text = select.options.length === 1 ? 'Нет сохранённых реквизитов в этой валюте' : 'Выберите…';
    }
    if (doc.orderKind === 'trade') {
      var trade = orders.tradeCalculation(v);
      var instrument = trade.keys && v[trade.keys[0]] || '';
      if (state.branch !== undefined && state.branch !== trade.branch) {
        set('extra-amount-mode', 'auto');
        set('extra-amount-reason', '');
      }
      if (trade.branch === 'security' && (instrument !== state.instrument || trade.branch !== state.branch)) {
        set('extra-security-currency', trade.spec && trade.spec.currency || '');
        trade = orders.tradeCalculation(read());
      }
      state.branch = trade.branch;
      state.instrument = instrument;
      if (changed === 'extra-manual-amount') set('extra-amount-mode', 'manual');
      var manual = el('extra-amount-mode').value === 'manual';
      if (!manual) {
        set('extra-manual-amount', orders.formatDecimalInput(trade.result.value));
        set('extra-amount-reason', '');
      }
      var reset = container.querySelector('[data-order-reset-amount]');
      if (reset) reset.hidden = !manual || !trade.result.value;
    } else if (changed === 'extra-words-mode' && v[changed] === 'manual' && !el('extra-manual-words').value) {
      set('extra-manual-words',orders.context(doc.id,subject,v).words);
    }
    var review = el('order-review');
    if (review) {
      var current = orders.reviewKey(doc.id,subject,read());
      if (changed === 'order-review') state.confirmedAgainst = review.checked ? current : '';
      if (state.confirmedAgainst !== current) state.confirmedAgainst = '';
      review.checked = !!state.confirmedAgainst;
    }
  }
  global.CRMOrderControls = { sync: sync };
}(window));
