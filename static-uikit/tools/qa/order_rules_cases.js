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