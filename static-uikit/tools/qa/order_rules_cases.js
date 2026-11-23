(function () {
  'use strict';
  var results = [], model = CRMOrderForms, calc = CRMOrderCalculation.calculate;
  function check(label, ok) { results.push([label,!!ok]); }
  function spec(formula, quantityUnit, extra) {
    return Object.assign({formula:formula,quantityUnit:quantityUnit,source:'unit-test',currency:'RUB',
      priceStep:'0.01',quantityStep:'1',minorDigits:2,rounding:'half-up'},extra);
  }
  var unit=spec('unit','pieces',{quantityStep:'0.1'});
  check('exact 0.1 × 0.2',calc(unit,'0.1','0.2').value==='0.02');
  check('single final rounding',calc(unit,'0.5','0.01').value==='0.01');
  check('large exact integer',calc(unit,'10000000000000','0.33').value==='3300000000000.00');
  check('price step',calc(unit,'1','0.001').invalid);
  check('quantity step',calc(unit,'0.05','1').invalid);
  var bond=spec('bond-percent','pieces',{nominal:'1000',amountBasis:'clean'});
  check('bond percentage',calc(bond,'2','98.50').value==='1970.00');
  check('missing nominal',!calc(Object.assign({},bond,{nominal:null}),'2','98.50').value);
  check('unknown clean/dirty basis',!calc(Object.assign({},bond,{amountBasis:null}),'2','98.50').value);
  var dirty=Object.assign({},bond,{amountBasis:'dirty',accrued:'12.50',accruedFor:'2026-11-19',settlementDate:'2026-11-19'});
  check('dirty amount with dated accrued interest',calc(dirty,'2','98.50').value==='1995.00');
  check('stale accrued interest',!calc(Object.assign({},dirty,{settlementDate:'2026-11-20'}),'2','98.50').value);
  [1,100].forEach(function (factor) {
    var fx=spec('fx','lots',{quoteScale:String(factor),lotSize:'1000'});
    check('FX scale '+factor,calc(fx,'2','10.50').value===(factor===1?'21000.00':'210.00'));
    check('no FX lot '+factor,!calc(Object.assign({},fx,{lotSize:null}),'2','10.50').value);
  });
  check('unknown derivative multiplier',!calc(spec('premium','contracts'),'2','200').value);
  check('premium by contract specification',calc(spec('premium','contracts',{premiumMultiplier:'10'}),'2','200').value==='4000.00');
  var s={id:'test',kind:'individual',code:'INV-007',umi:{bo_num:'BR-test',datesign:'2026-11-19'},
    additionalOrderVenues:[{id:'other-a',label:'Альфа'},{id:'other-b',label:'Бета'}],
    bankRequisites:[{id:'a',currency:'CNY',recipient:'Тест',bankName:'Тест Банк',bic:'TESTCNSH',account:'999'},
      {id:'b',currency:'RUB',subjectId:'someone-else'},{id:'c',currency:'RUB',archived:true},{id:'d',currency:'RUB',usableForPayout:false}]};
  var tradeOrder = {
    'extra-trade-kind':'buy', 'extra-order-market':'stock', 'extra-order-kind':'market',
    'extra-order-validity-mode':'cancelled', 'extra-settlement-period':'T+1',
    'extra-security-asset-id':'A-100001', 'extra-security-quantity':'1', 'extra-repo-ccp':'no'
  };
  ['individual','company'].forEach(function (kind) {
    [null,'initial','standard','high'].forEach(function (level) {
      var client = Object.assign({},s,{kind:kind,umi:Object.assign({},s.umi)});
      if (level) client.umi.risklevel = level;
      var printed = model.printable('order-trade',{
        subject:client, orderInput:tradeOrder, checks:{'order-uncovered-ack':false}
      });
      check('trade acknowledgment '+kind+' '+(level || 'missing risk'),printed.checks['order-uncovered-ack'] === true);
    });
  });
  var datedOrder = Object.assign({},tradeOrder,{'extra-settlement-period':'date','extra-settlement-date':'2026-11-23'});
  var datedPayload = model.prepare('order-trade',s,datedOrder);
  check('dated payload excludes tenor',datedPayload.input.settlementDateISO==='2026-11-23' &&
    datedPayload.metadata.settlementMode==='date' && !('settlementTenor' in datedPayload.input) &&
    datedPayload.extraValues['extra-settlement-period']==='23.11.2026');
  ['T+0','T+1','T+2'].forEach(function (tenor) {
    var result = model.prepare('order-trade',s,Object.assign({},datedOrder,{'extra-settlement-period':tenor}));
    check('tenor excludes hidden date '+tenor,result.input.settlementTenor===tenor && result.metadata.settlementMode==='tenor' &&
      !('settlementDateISO' in result.input) && !('extra-settlement-date' in result.input) && result.extraValues['extra-settlement-period']===tenor);
  });
  var impossible = Object.assign({},datedOrder,{'extra-settlement-date':'2026-02-30'});
  check('rejects impossible leap date',model.prepare('order-trade',s,impossible).errors.some(function (e){return e.key==='extra-settlement-date';}));
  var direct = Object.assign({},tradeOrder,{settlementMode:'date',settlementDateISO:'2026-11-24'});
  delete direct['extra-settlement-period'];
  check('structured direct caller',model.prepare('order-trade',s,direct).extraValues['extra-settlement-period']==='24.11.2026');
  var ref=CRMInstrumentCatalog, lookup=ref.bondData;
  var settings = {assetId:'A-200002',date:'2026-11-23',source:'QA fixture',currency:'RUB',unit:'per-security',section:'test',value:'12.34'};
  var bondOrder=Object.assign({},datedOrder,{'extra-order-kind':'limit','extra-security-asset-id':'A-200002',
    'extra-security-quantity':'10','extra-security-price':'98.5'});
  function withQuote(rows,terms) {
    ref.bondData=function () { return {quotes:rows,terms:terms}; };
    return model.tradeCalculation(bondOrder);
  }
  try {
    var terms={source:'QA fixture',date:'2026-11-23',currency:'RUB',unit:'per-security',nominal:'1000',formula:'bond-percent',amountBasis:'dirty'};
    check('future quote must not be used',!withQuote([Object.assign({},settings,{date:'2026-11-24'})],terms).result.value);
    check('null quote differs from zero',!withQuote([Object.assign({},settings,{value:null})],terms).result.value);
    check('unknown accrued unit blocks total',!withQuote([Object.assign({},settings,{unit:'unknown'})],terms).result.value);
    check('foreign-currency interest excluded',!withQuote([Object.assign({},settings,{currency:'USD'})],terms).result.value);
    check('outdated nominal blocks percent total',!withQuote([settings],Object.assign({},terms,{date:'2026-11-22'})).result.value);
    check('per-piece cash quotation skips percentage and nominal',withQuote([settings],Object.assign({},terms,{formula:'unit',amountBasis:'quoted'})).result.value==='985.00');
    check('unapproved per-piece dirty convention remains manual',!withQuote([settings],Object.assign({},terms,{formula:'unit'})).result.value);
  } finally { ref.bondData=lookup; }
  var manualTenor=Object.assign({},bondOrder,{'extra-settlement-period':'T+1','extra-order-kind':'market',
    'extra-accrued-mode':'manual','extra-accrued-manual':'0','extra-accrued-date':'2026-11-23','extra-accrued-currency':'RUB'});
  manualTenor['extra-accrued-confirmed']=model.accruedReviewKey(manualTenor);
  var confirmedZero=model.prepare('order-trade',s,manualTenor);
  check('explicit manual zero with tenor keeps its own date',!confirmedZero.errors.length &&
    confirmedZero.extraValues['extra-security-accrued']==='0' && confirmedZero.metadata.accruedInterest.date==='2026-11-23' &&
    !('settlementDateISO' in confirmedZero.input));
  var fixtures = CRMInstrumentCatalog.SECURITY_ASSETS, originalSize=fixtures.length;
  try {
    for (var n=0;n<28;n++) {
      fixtures.push(Object.assign({},fixtures[0],{assetId:'QA-'+String(n).padStart(2,'0'),shortName:'QA limit '+n}));
    }
    var first=CRMInstrumentCatalog.mockPage({q:'QA limit',limit:900});
    var second=CRMInstrumentCatalog.mockPage({q:'QA limit',cursor:first.nextCursor});
    check('server hard cap and pagination',first.items.length===20 && second.items.length===8 &&
      new Set(first.items.concat(second.items).map(function (a){return a.assetId;})).size===28);
  } finally { fixtures.length=originalSize; }
  var v={'extra-move-from':'stock','extra-move-to':'currency','extra-move-currency':'RUB','extra-move-amount':'1000.50'};
  function prep(vv,ss) { return model.prepare('order-venue-transfer',ss||s,vv); }
  model.venues(s).forEach(function (venue) {
    check('same venue '+venue.value,prep(Object.assign({},v,{'extra-move-from':venue.value,'extra-move-to':venue.value})).errors.length);
  });
  check('two known other venues resolved independently',!prep(Object.assign({},v,{'extra-move-from':'other-a','extra-move-to':'other-b'})).errors.length);
  ['','0','-1','NaN','Infinity','1e999','0.001'].forEach(function (a) {
    check('invalid transfer amount '+a,prep(Object.assign({},v,{'extra-move-amount':a})).errors.length);
  });
  check('missing INV',prep(v,Object.assign({},s,{code:''})).errors.length);
  var tamper=prep(Object.assign({},v,{'extra-brokerage-account':'BANK','extra-contract-number-date':'FAKE'}));
  check('CRM identity overrides raw inputs',tamper.extraValues['extra-brokerage-account']==='INV-007' &&
    tamper.extraValues['extra-contract-number-date']==='BR-test от 19.11.2026');
  var scoped=prep(v,Object.assign({},s,{code:'',umi:{phys:{num_investika:'INV003',bo_num:'BO-7',datesign:'2026-11-19'}}}));
  check('scoped UMI master data',scoped.extraValues['extra-brokerage-account']==='INV003'&&!scoped.errors.length);
  var cash={'extra-payout-from':'stock','extra-payout-currency':'CNY','extra-payout-amount-mode':'whole',selectedRequisiteId:'a'};
  check('non-RUB direct route needs no intermediary',!model.prepare('order-bank-withdrawal',s,cash).errors.length);
  ['missing','b','c','d'].forEach(function (id) {
    check('foreign/inactive/missing bank '+id,model.prepare('order-bank-withdrawal',s,Object.assign({},cash,{selectedRequisiteId:id})).errors.length);
  });
  check('bank currency mismatch',model.prepare('order-bank-withdrawal',s,Object.assign({},cash,{'extra-payout-currency':'RUB'})).errors.length);
  check('foreign and archived credentials excluded',model.eligibleRequisites(s,'RUB').length===0);
  [['0.01','RUB','Ноль рублей 01 копейка'],['2','RUB','Два рубля 00 копеек'],['11','RUB','Одиннадцать рублей 00 копеек'],
    ['21','RUB','Двадцать один рубль 00 копеек'],['1','USD','Один доллар США 00 центов'],['2','EUR','Два евро 00 евроцентов'],
    ['21','CNY','Двадцать один юань 00 фэней']].forEach(function (r){check('words '+r[0]+r[1],model.amountInWords(r[0],r[1])===r[2]);});
  return results;
}())