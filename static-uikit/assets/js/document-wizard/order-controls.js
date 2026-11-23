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
      var changedAsset = !!state.instrument && (instrument !== state.instrument || state.branch !== trade.branch);
      if (changedAsset) {
        var oldPrice = {security:'extra-security-price',fx:'extra-fx-rate',derivative:'extra-derivative-premium'}[state.branch];
        if (oldPrice) set(oldPrice,'');
        if (trade.keys) set(trade.keys[2],'');
        ['extra-manual-amount','extra-amount-reason','extra-accrued-manual','extra-accrued-date',
          'extra-accrued-currency','extra-accrued-confirmed'].forEach(function (key) { set(key,''); });
        set('extra-accrued-mode','reference');
        set('extra-amount-mode','auto');
      }
      if (trade.branch === 'security' && (instrument !== state.instrument || trade.branch !== state.branch)) {
        set('extra-security-currency', trade.spec && trade.spec.currency || '');
        set('extra-accrued-currency', trade.spec && trade.spec.currency || '');
      }
      state.branch = trade.branch;
      state.instrument = instrument;
      set('extra-is-bond', trade.isBond ? 'yes' : 'no');

      var target = orders.settlement(v).settlementDateISO || '';
      var lookupKey = trade.isBond && target ? instrument+'|'+target : '';
      var assetNode = el('extra-security-asset-id');
      if (lookupKey !== state.bondLookupKey || state.bondLookupNode !== assetNode) {
        if (state.bondController) state.bondController.abort();
        state.bondLookupKey = lookupKey;
        state.bondLookupNode = assetNode;
        set('extra-accrued-status','');
        if (lookupKey) {
          var controller = new AbortController();
          state.bondController = controller;
          global.CRMInstrumentCatalog.clearBondData(instrument,target);
          set('extra-accrued-status','Получение НКД…');
          var timeout = setTimeout(function () { controller.abort(); },8000);
          global.CRMInstrumentCatalog.loadSecurity(instrument,target,controller.signal).then(function () {
            finish('');
          },function () { finish('Не удалось получить НКД. Повторите запрос или укажите значение вручную.'); });
          function finish(message) {
            clearTimeout(timeout);
            if (controller !== state.bondController || state.bondLookupKey !== lookupKey || !assetNode.isConnected) return;
            set('extra-accrued-status',message);
            assetNode.dispatchEvent(new Event('change',{bubbles:true}));
          }
        }
      }
      var manualAccrued = trade.isBond && el('extra-accrued-mode').value === 'manual';
      var refresh = container.querySelector('[data-refresh-accrued]');
      if (refresh) refresh.hidden = !lookupKey || manualAccrued;
      var accruedReview = el('extra-accrued-review'), accruedKey = orders.accruedReviewKey(read());
      if (changed === 'extra-accrued-review') set('extra-accrued-confirmed',accruedReview.checked ? accruedKey : '');
      if (!manualAccrued || el('extra-accrued-confirmed').value !== accruedKey) set('extra-accrued-confirmed','');
      accruedReview.checked = !!el('extra-accrued-confirmed').value;
      trade = orders.tradeCalculation(read());
      if (changed === 'extra-manual-amount') set('extra-amount-mode', 'manual');
      var manual = el('extra-amount-mode').value === 'manual';
      if (!manual) {
        set('extra-manual-amount', orders.formatDecimalInput(trade.result.value));
        set('extra-amount-reason', '');
      }
      var reset = container.querySelector('[data-order-reset-amount]');
      if (reset) reset.hidden = !manual || !trade.result.value;
      var manualNote = container.querySelector('[data-order-manual]');
      if (manualNote) manualNote.hidden = !manual;
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
