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
        ['extra-manual-amount','extra-manual-currency','extra-amount-reason'].forEach(function (key) { set(key,''); });
        set('extra-amount-mode','auto');
      }
      if (trade.branch === 'security' && (instrument !== state.instrument || trade.branch !== state.branch)) {
        set('extra-security-currency', trade.spec && trade.spec.currency || '');
        var terms = trade.item && trade.item.instrumentTerms;
        set('extra-manual-currency', terms ? terms.settlementCurrency : '');
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
      var target = orders.settlement(v).settlementDateISO || '';
      var request = orders.bondOptions(trade.item,v);
      var lookupKey = trade.isBond && target ? JSON.stringify([instrument,target,request]) : '';
      var assetNode = el('extra-security-asset-id');
      if (lookupKey !== state.bondLookupKey || state.bondLookupNode !== assetNode) {
        if (state.bondController) state.bondController.abort();
        state.bondLookupKey = lookupKey;
        state.bondLookupNode = assetNode;
        state.bondMessage = '';
        if (lookupKey) {
          var controller = new AbortController();
          state.bondController = controller;
          global.CRMInstrumentCatalog.clearBondData(instrument,target,request);
          state.bondMessage = 'Получение НКД…';
          var timeout = setTimeout(function () { controller.abort(); },15000);
          global.CRMInstrumentCatalog.loadSecurity(instrument,target,controller.signal,request).then(function () {
            finish('');
          },function () { finish('Не удалось получить данные QORT. Проверьте подключение или укажите НКД вручную.'); });
          function finish(message) {
            clearTimeout(timeout);
            if (controller !== state.bondController || state.bondLookupKey !== lookupKey || !assetNode.isConnected) return;
            state.bondMessage = message;
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
        var source = interest.edited ? 'Введено вручную' : state.bondMessage || interest.message || interest.source;
        note.textContent = [interest.currency,orders.isoToRu(interest.date),source].filter(Boolean).join(' · ');
      }
      label('extra-security-price',(trade.isBond ? 'Цена, % от номинала' : 'Цена одной ценной бумаги')+' *');
      set('extra-show-rates',trade.rates.length ? 'yes' : 'no');
      var rateBasis = JSON.stringify([instrument,request.tradeDate]);
      ['extra-price-rate','extra-accrued-rate'].forEach(function (field) {
        var rate = trade.rates.find(function (r) { return r.field === field; });
        var open = rate && rate.referenceStatus !== 'official';
        set(field.replace('extra-','extra-need-'),open ? 'yes' : 'no');
        if (open) {
          if (el(field+'-key').value !== rate.key) { set(field,''); set(field+'-key',rate.key); }
          label(field,'Ручной курс, '+rate.to+' за 1 '+rate.from);
        } else if (rate || state.rateBasis !== rateBasis) {
          set(field,''); set(field+'-key','');
        }
      });
      state.rateBasis = rateBasis;
      if (changed === 'extra-manual-amount') set('extra-amount-mode', 'manual');
      var manual = el('extra-amount-mode').value === 'manual';
      if (!manual) {
        set('extra-manual-amount', orders.formatDecimalInput(trade.result.value));
        set('extra-amount-reason', '');
      }
      var amountCurrency = liveBond && (manual && el('extra-manual-currency').value || trade.item.instrumentTerms.settlementCurrency);
      label('extra-manual-amount', 'Сумма сделки'+(amountCurrency ? ', '+amountCurrency : '')+' *');
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
