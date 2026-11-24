import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {readFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {assetCard, readAccrued} from '../qort/reference.mjs';

import {conversion, readRates} from '../qort/cbr-rates.mjs';

const box = {};
runInNewContext(readFileSync(new URL('../../assets/js/document-wizard/order-calculation.js',import.meta.url),'utf8'),box);
const date = '2026-11-23';
const instrument = {assetId:42,sortId:3,viewName:'Test',currentNominal:'1000',originalNominal:'1000',
  nominalCurrency:'RUR',marketPriceCurrency:'RUR',settlementCurrency:'RUR',sectionId:1,securityTrading:'y',
  isTrading:'y',percentFlag:'y',marketPercent:'y',tickSize:'0.01',asOfDate:20261123,indexedNominal:'n'};
function section(id, value, history=false) {
  return {sectionId:id,asOfDate:20261123,decimalValue:value,rawValue:value,currentValue:history ? null : value,
    historyObservationDate:history ? 20261120 : null,marketPriceCurrency:'RUR',settlementCurrency:'RUR',percentFlag:'y'};
}
test('a real primary zero does not read section 101',async () => {
  const hits = [];
  const b = await readAccrued(assetCard([instrument]),date,async id => { hits.push(id); return section(id,'0',true); });
  assert.deepEqual(hits,[1]);
  assert.equal(b.sourceStatus,'PRIMARY_TPLUS');
  assert.equal(b.observationDate,'2026-11-20');
  assert.equal(b.quotes[0].displayValue,'0.00');
});
test('primary 53.129999 is retained even though the OTC 53.13 displays identically',async () => {
  const calls = [];
  const detail = await readAccrued(assetCard([instrument]),date,async id => {
    calls.push(id);
    return section(id,id === 1 ? '53.129999' : '53.13',id === 101);
  });
  assert.deepEqual(calls,[1]);
  assert.equal(detail.sourceTable,'MarketInfo');
  assert.equal(detail.quotes[0].value,'53.129999');
  assert.equal(detail.quotes[0].displayValue,'53.13');
  assert.equal(box.CRMOrderCalculation.roundCurrency('53.129999','JPY'),'53');
  assert.equal(box.CRMOrderCalculation.roundCurrency('53.129999','KWD'),'53.130');
});
test('NULL falls through to the exact-date OTC value; preserve raw precision',async () => {
  const b = await readAccrued(assetCard([instrument]),date,async id => section(id,id===1 ? null : '364.679998'));
  assert.equal(b.sourceStatus,'FALLBACK_OTC_101');
  assert.equal(b.quotes[0].rawValue,'364.679998');
  assert.equal(b.quotes[0].displayValue,'364.68');
});
test('absence in both sections leaves an otherwise confirmed calculation available',async () => {
  const asset = assetCard([instrument]), b = await readAccrued(asset,date,async id => section(id,null));
  assert.equal(b.sourceStatus,'DEFAULT_ZERO');
  assert.equal(b.sourceTable,null);
  const spec = {...asset.calculation,...b.terms,settlementDate:date,accruedFor:date,accrued:b.quotes[0].value};
  assert.equal(box.CRMOrderCalculation.calculate(spec,'10','98.5').value,'9850.00');
});
test('inconsistent section currency, unconfirmed future nominal or inactive issue require a manual amount',async () => {
  for (const [overrides,target] of [[{settlementCurrency:'USD'},date],[{},'2026-11-24'],[{isTrading:'n'},date],
      [{currentNominal:'300'},date]]) {
    const b = await readAccrued(assetCard([{...instrument,...overrides}]),target,async id => section(id,'12'));
    assert.equal(b.terms,null);
    assert.ok(b.reason);
  }
});
test('a confirmed effective-date nominal takes precedence over the current balance',async () => {
  const b = await readAccrued(assetCard([{...instrument,currentNominal:'300'}]),'2026-11-24',
    async id => ({...section(id,'2.56'),datedNominal:'250'}));
  assert.equal(b.terms.nominal,'250');
  assert.equal(b.terms.nominalSource,'AssetsBaseValues.BVDate');
});
test('zero or conflicting dated nominals cannot fall back to a positive current nominal',async () => {
  for (const datedNominal of ['0',null]) {
    const b = await readAccrued(assetCard([instrument]),date,
      async id => ({...section(id,'2.56'),nominalRecords:2,datedNominal}));
    assert.equal(b.terms,null);
  }
});
test('cash bond requires an explicit quotation convention and counts accrual once',async () => {
  const asset = assetCard([{...instrument,percentFlag:'n',marketPercent:'n'}]);
  const read = async id => ({...section(id,'12.34'),percentFlag:'n'});
  assert.equal((await readAccrued(asset,date,read)).terms,null);
  for (const [included,total] of [[false,'1123.40'],[true,'1000.00']]) {
    asset.instrumentTerms.quoteIncludesAccrued=included;
    const b=await readAccrued(asset,date,read);
    const spec={...asset.calculation,...b.terms,settlementDate:date,accruedFor:date,accrued:b.quotes[0].value};
    assert.equal(box.CRMOrderCalculation.calculate(spec,'10','100').value,total);
  }
});
test('ambiguous price currencies do not select a quote',() => {
  const asset = assetCard([{...instrument,quoteCurrency:'CNY'}, {...instrument,quoteCurrency:'RUR'}]);
  assert.equal(asset.instrumentTerms.quoteCurrency,'');
});
test('unconfigured live server returns an explicit failure and keeps local configuration private',async () => {
  const entry=fileURLToPath(new URL('../order-reference-server.mjs',import.meta.url));
  const server=spawn(process.execPath,[entry,'--live'],{env:{...process.env,QORT_SERVER:'',QORT_PORT:'0'},
    stdio:['ignore','pipe','inherit'],windowsHide:true});
  try {
    const lines=createInterface({input:server.stdout});
    const [url]=await once(lines,'line');
    const origin=new URL(url).origin;
    const missing=await fetch(origin+'/api/order-reference/assets?q=SBER');
    assert.equal(missing.status,503);
    assert.match((await missing.json()).error,/QORT_SERVER/);
    assert.equal((await fetch(origin+'/static-uikit/.env.qort.local')).status,404);
    const html=await (await fetch(url)).text();
    assert.match(html,/data-mode="qort"/);
    assert.doesNotMatch(html,/src="[^"]*instrument-securities-demo/);
  } finally {
    const stopped=once(server,'exit');
    server.kill();
    await stopped;
  }
});

const settlement = '2026-11-24';
const cbr = (from,to,rate,units,day=20261123) => ({
  fromCurrency:from,toCurrency:to,rate,units,rateDate:day,sourceTable:'CrossRatesHist'
});
const usd = cbr('USD','RUB','82.191100000000',1);
const bondSpec = {source:'QORT',formula:'bond-percent',quantityUnit:'pieces',quantityStep:'1',priceStep:'0.01',
  currency:'USD',nominalCurrency:'USD',settlementCurrency:'RUB',nominal:'1000',minorDigits:2,settlementDigits:2,
  amountBasis:'dirty',quoteIncludesAccrued:false,rounding:'half-up',nativeQuotation:'percent',tradeDate:date,
  settlementDate:settlement,accruedFor:settlement,accrued:'53.129999',accruedCurrency:'USD'};
const calculate = (spec,q='1330',price='108') => box.CRMOrderCalculation.calculate(spec,q,price);

test('CBR normalization preserves units, direction and only the requested effective date',() => {
  const rows=[cbr('USD','RUB','88',1,20261122),cbr('JPY','RUB','53.4',100),cbr('USD','RUB','82',1)];
  const mixed={...bondSpec,formula:'bond-cash',nativeQuotation:'cash',currency:'JPY',minorDigits:0,accrued:'0'};
  for (const units of [1,10,100]) {
    const rate=conversion('JPY','RUB',date,[cbr('JPY','RUB','53.4',units)]);
    assert.equal(calculate({...mixed,rates:[rate]},'1',String(units)).value,'53.40');
  }
  const inverse=conversion('RUB','JPY',date,rows);
  assert.equal(calculate({...mixed,currency:'RUB',settlementDigits:0,settlementCurrency:'JPY',rates:[inverse]},'1','53.4').value,'100');
  const cross=conversion('USD','JPY',date,rows);
  assert.equal(cross.legs.length,2);
  assert.equal(calculate({...mixed,currency:'USD',settlementDigits:0,settlementCurrency:'JPY',rates:[cross]},'1','10').value,'1536');
  assert.equal(conversion('USD','RUB',settlement,rows).status,'missing');
  assert.equal(conversion('USD','RUB',date,[usd,{...usd,rate:'81'}]).status,'ambiguous');
  assert.equal(conversion('USD','RUB',date,[cbr('USD','RUB','5',1),cbr('RUB','USD','1',4)]).status,'ambiguous');
  assert.equal(conversion('USD','RUB',date,[cbr('USD','RUB','5',1),cbr('RUB','USD','2',10)]).status,'official');
});

test('one parameterized CBR read for price and interest, with separate same-day status for each currency',async () => {
  const sql={Int:v=>v,VarChar:v=>v}, calls=[];
  const select=async(query,params)=>{calls.push(params);assert.match(query,/h\.OldDate = p\.tradeDate/);return [usd];};
  const result=await readRates(select,sql,date,settlement,['USD','EUR'],'RUB');
  assert.deepEqual(calls,[[20261123,20261124,'MainCurBank','USD','EUR','RUR','']]);
  assert.deepEqual(result.rates.map(r=>r.status),['official','missing']);
  await readRates(select,sql,'',settlement,['USD'],'RUB');
  await readRates(select,sql,date,settlement,['RUB'],'RUB');
  assert.equal(calls.length,1);
});

test('bond quotation override, raw accrued precision and final currency rounding',() => {
  const rates=[conversion('USD','RUB',date,[usd])];
  const percent=calculate({...bondSpec,rates});
  assert.equal(percent.components.subtotal,'1507062.90');
  assert.equal(percent.value,'123867157.41');
  const cash=calculate({...bondSpec,formula:'bond-cash',rates});
  assert.equal(cash.components.subtotal,'214302.90');
  assert.equal(cash.value,'17613790.97');
  assert.equal(calculate({...bondSpec,formula:'bond-cash',rates},'1','108.001').invalid,true);
  assert.equal(calculate({...bondSpec,rates,accruedFor:date}).mode,'unavailable');
  assert.equal(calculate({...bondSpec,rates,tradeDate:settlement}).mode,'unavailable');
});

test('separate currencies for clean price and interest; already included interest needs no second rate',() => {
  const rows=[cbr('USD','RUB','75',1),cbr('EUR','RUB','90',1)];
  const spec={...bondSpec,accruedCurrency:'EUR',accrued:'4.5',rates:['USD','EUR'].map(c=>conversion(c,'RUB',date,rows))};
  assert.equal(calculate(spec,'2','100').value,'150810.00');
  const oneRate={...spec,rates:spec.rates.slice(0,1)};
  assert.equal(calculate(oneRate,'2','100').mode,'unavailable');
  assert.equal(calculate({...oneRate,amountBasis:'quoted',quoteIncludesAccrued:true},'2','100').value,'150000.00');
  assert.equal(calculate({...oneRate,accrued:'0'},'2','100').value,'150000.00');
});

test('manual FX uses the same formula, rejects a zero or stale rate and never enables an invalid price',() => {
  const manual={status:'manual',from:'USD',to:'RUB',date,legs:[{from:'USD',to:'RUB',units:'1',rate:'80,12'}]};
  const spec={...bondSpec,formula:'bond-cash',rates:[manual]};
  assert.equal(calculate(spec).value,'17169948.24');
  assert.equal(calculate({...spec,tradeDate:settlement}).mode,'unavailable');
  assert.equal(calculate({...spec,rates:[{...manual,legs:[{...manual.legs[0],rate:'0'}]}]}).mode,'unavailable');
  assert.equal(calculate(spec,'1330.5','108').invalid,true);
});

test('fixed unindexed principal spans settlement dates; an ambiguous or structured issue still needs manual terms',async () => {
  const ordinary={...instrument,nominalCurrency:'USD',marketPriceCurrency:'USD',cfi:'DBFXFR',
    issueDate:20241205,maturityDate:20280624};
  const read=async id=>({...section(id,'53.129999'),marketPriceCurrency:'USD'});
  const good=await readAccrued(assetCard([ordinary]),settlement,read,'cash');
  assert.equal(good.terms.nativeQuotation,'percent');
  assert.equal(good.terms.formula,'bond-cash');
  assert.equal(good.terms.nominal,'1000');
  for (const change of [{nominalCurrency:''},{indexedNominal:'y'},{cfi:'DBFXAR'},{cfi:'DBSXFZ'},{maturityDate:20261124},{linkedCurrency:'EUR'}]) {
    assert.equal((await readAccrued(assetCard([{...ordinary,...change}]),settlement,read)).terms,null);
  }
});
