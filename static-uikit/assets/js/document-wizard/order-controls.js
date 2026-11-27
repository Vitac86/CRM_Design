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
    function label(key, caption) {
      var node = container.querySelector('label[for="docwiz-field-'+key+'"]');
      if (node && node.textContent !== caption) node.textContent = caption;
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
      if (changed === 'extra-accrued-input') {
        set('extra-accrued-edited','yes');
        v['extra-accrued-edited'] = 'yes';
      }
      var trade = orders.tradeCalculation(v);
      var instrument = trade.keys && v[trade.keys[0]] || '';
      var changedAsset = !!state.instrument && (instrument !== state.instrument || state.branch !== trade.branch);
      if (changedAsset) {
        var oldPrice = {security:'extra-security-price',fx:'extra-fx-rate',derivative:'extra-derivative-premium'}[state.branch];
        if (oldPrice) set(oldPrice,'');
        if (trade.keys) set(trade.keys[2],'');
        state.amountEdited = false;
        state.priceCurrencyEdited = false;
        state.settlementCurrencyEdited = false;
        set('extra-order-amount','');
      }
      if (changed === 'extra-order-amount') state.amountEdited = true;
      if (changed === 'extra-security-currency') state.priceCurrencyEdited = true;
      if (changed === 'extra-settlement-currency') state.settlementCurrencyEdited = true;
      if (instrument !== state.instrument || trade.branch !== state.branch) {
        if (trade.branch === 'security' && !state.priceCurrencyEdited) set('extra-security-currency',trade.spec?.currency || '');
        if (!state.settlementCurrencyEdited) set('extra-settlement-currency',trade.defaultSettlement);
      }
      state.branch = trade.branch;
      state.instrument = instrument;
      set('extra-is-bond', trade.isBond ? 'yes' : 'no');

      var liveBond = trade.isBond && trade.item.source === 'QORT';
      set('extra-live-bond',liveBond ? 'yes' : 'no');
      if (changed === 'extra-trade-date') state.tradeDateEdited = true;
      if (liveBond && !state.tradeDateEdited && state.lastTradeOrderDate !== v['extra-order-date']) {
        set('extra-trade-date',v['extra-order-date'] || '');
        state.lastTradeOrderDate = v['extra-order-date'];
      }
      v = read();
      var target = orders.bondSettlementDate(trade.item,orders.settlement(v));
      var request = orders.bondOptions(trade.item,v);
      var lookupKey = trade.isBond && target ? JSON.stringify([instrument,target,request]) : '';
      var assetNode = el('extra-security-asset-id');
      if (lookupKey !== state.bondLookupKey || state.bondLookupNode !== assetNode) {
        if (state.bondController) state.bondController.abort();
        state.bondLookupKey = lookupKey;
        state.bondLookupNode = assetNode;
        state.bondLoading = false;
        if (lookupKey) {
          var controller = new AbortController();
          state.bondController = controller;
          global.CRMInstrumentCatalog.clearBondData(instrument,target,request);
          state.bondLoading = true;
          var timeout = setTimeout(function () { controller.abort(); },15000);
          global.CRMInstrumentCatalog.loadSecurity(instrument,target,controller.signal,request).then(finish,finish);
          function finish() {
            clearTimeout(timeout);
            if (controller !== state.bondController || state.bondLookupKey !== lookupKey || !assetNode.isConnected) return;
            state.bondLoading = false;
            assetNode.dispatchEvent(new Event('change',{bubbles:true}));
          }
        }
      }
      trade = orders.tradeCalculation(read());
      var interest = trade.interest;
      if (interest) {
        if (!interest.edited) set('extra-accrued-input',interest.displayText);
        el('extra-accrued-currency').placeholder = interest.currency || 'Код валюты';
        var note = container.querySelector('#docwiz-field-extra-accrued-input-source');
        var source = interest.source || (state.bondLoading ? 'Получение НКД…' : '');
        note.textContent = source ? [interest.currency,orders.isoToRu(interest.date),source].filter(Boolean).join(' · ') : '';
      }
      label('extra-security-price',trade.isBond ? 'Цена, % от номинала' : 'Цена одной ценной бумаги');
      ['extra-price-rate','extra-accrued-rate'].forEach(function (field) {
        var rate = trade.rates.find(function (r) { return r.field === field; });
        var input = el(field);
        set(field.replace('extra-','extra-need-'),rate ? 'yes' : 'no');
        var official = !!rate && rate.referenceStatus === 'official';
        if (!rate || el(field+'-key').value !== rate.key || (input.readOnly && !official)) set(field,'');
        set(field+'-key',rate ? rate.key : '');
        input.readOnly = official;
        if (!rate) return;
        var caption = official ? 'Курс ЦБ '+rate.from+' в '+rate.to : 'Курс, '+rate.to+' за 1 '+rate.from;
        label(field,caption+(rate.date ? ' на '+orders.isoToRu(rate.date) : ''));
        if (official) {
          input.value = rate.legs.map(function (leg) {
            return leg.units+' '+leg.from+' = '+orders.formatAmount(leg.rate)+' '+leg.to;
          }).join(' · ');
          delete state.fields[field];
        }
      });
      if (!state.amountEdited) set('extra-order-amount',orders.formatDecimalInput(trade.result.value));
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
