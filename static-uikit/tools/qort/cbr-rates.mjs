import {readFileSync} from 'node:fs';

const query = readFileSync(new URL('cbr-rates.sql',import.meta.url),'utf8');
const positive = s => /^\d+(?:\.\d+)?$/.test(s) && /[1-9]/.test(s);
const trimRate = s => String(s ?? '').replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');

function leg(from, to, rows) {
  const matches = rows.filter(r => r.fromCurrency === from && r.toCurrency === to);
  if (!matches.length) return null;
  const row = matches[0], rate = trimRate(row.rate), units = String(row.units);
  if (!positive(rate) || !positive(units) ||
      matches.some(r => trimRate(r.rate) !== rate || String(r.units) !== units)) return {status:'ambiguous'};
  return {status:'official',from,to,rate,units,table:row.sourceTable};
}

// Both directions, when supplied, must describe the same unit-normalized rate.
function decimalRatio(value) {
  const [whole, fraction = ''] = value.split('.');
  return [BigInt(whole + fraction), 10n ** BigInt(fraction.length)];
}

function between(from, to, rows) {
  const direct = leg(from,to,rows), inverse = leg(to,from,rows);
  if (!direct || !inverse) return direct || inverse;
  if (direct.status !== 'official' || inverse.status !== 'official') return {status:'ambiguous'};
  const [a, ad] = decimalRatio(direct.rate), [b, bd] = decimalRatio(inverse.rate);
  const [u, ud] = decimalRatio(direct.units), [v, vd] = decimalRatio(inverse.units);
  return a*b*ud*vd === u*v*ad*bd ? direct : {status:'ambiguous'};
}

export function conversion(from, to, date, rows) {
  const exact = rows.filter(row => String(row.rateDate) === date.replaceAll('-',''));
  const direct = between(from,to,exact);
  const legs = direct ? [direct] : from !== 'RUB' && to !== 'RUB'
    ? [between(from,'RUB',exact),between('RUB',to,exact)] : [];
  if (legs.some(l => l?.status === 'ambiguous')) return {from,to,date,status:'ambiguous',legs:[]};
  if (!legs.length || legs.some(l => !l)) return {from,to,date,status:'missing',legs:[]};
  return {from,to,date,status:'official',source:'MainCurBank',legs};
}

export async function readRates(select, sql, date, asOf, sources, to) {
  const from = [...new Set(sources)].filter(s => s && s !== to);
  if (!date || !to || !from.length) return {date, rates:[]};
  const currencies = [...new Set([...from,to,'RUB'])].map(c => c === 'RUB' ? 'RUR' : c);
  while (currencies.length < 4) currencies.push('');
  try {
    const rows = await select(query,[sql.Int(Number(date.replaceAll('-',''))),sql.Int(Number(asOf.replaceAll('-',''))),
      sql.VarChar('MainCurBank'),...currencies.map(s => sql.VarChar(s))]);
    return {date,rates:from.map(s => conversion(s,to,date,rows))};
  } catch (error) {
    // A failed FX read must leave the separately loaded accrued interest and manual conversion usable.
    console.error('QORT MainCurBank:',error.message);
    return {date,rates:from.map(s => ({from:s,to,date,status:'error',legs:[]}))};
  }
}
