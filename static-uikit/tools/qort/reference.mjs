import { readFileSync } from 'node:fs';
import {readRates} from './cbr-rates.mjs';
import { ReferenceErrorResponse, withConnection } from './connection.mjs';

const load = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const searchQuery = load('search.sql'), cardQuery = load('card.sql'), accruedQuery = load('accrued.sql');
const filters = new Map([
  ['security','1 = 1'], ['bond','a.AssetClass_Const IN (6,7,9)'],
  ['share','a.AssetClass_Const = 5 OR a.AssetSort_Const IN (24,78)'], ['fund','a.AssetClass_Const = 11']
]);
const sorts = new Map([
  [1,'share-ordinary'],[2,'share-preferred'],[3,'bond-government'],[6,'bond-corporate'],
  [7,'bond-regional'],[8,'bond-municipal'],[9,'depositary-receipt'],[10,'depositary-receipt'],
  [12,'bond-euro'],[14,'fund-unit'],[22,'bond-central-bank'],[24,'share-foreign'],
  [33,'bond-foreign'],[78,'share-preferred']
]);
const minorDigits = new Map(Intl.supportedValuesOf('currency').map(code => [code,
  new Intl.NumberFormat('en',{style:'currency',currency:code}).resolvedOptions().maximumFractionDigits]));
const clean = value => String(value ?? '').trim();
function decimal(value) {
  return clean(value).replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');
}
function currency(value) {
  const code = clean(value).toUpperCase();
  return ['RUR','SUR'].includes(code) ? 'RUB' : /^[A-Z]{3}$/.test(code) ? code : '';
}
function iso(value) {
  return /^(\d{4})(\d{2})(\d{2})$/.test(clean(value)) ? String(value).replace(/^(....)(..)(..)$/, '$1-$2-$3') : null;
}
function kind(row) {
  return sorts.get(row.sortId) || ([6,7,9].includes(row.classId) ? 'bond-other' :
    row.classId === 11 ? 'fund-unit' : row.classId === 5 ? 'share-other' : 'security-other');
}
function summary(row) {
  return {assetId:String(row.assetId), isin:clean(row.isin), shortName:clean(row.viewName) || clean(row.shortName),
    displayName:clean(row.displayName), issuerName:clean(row.issuerName), issuerShortName:clean(row.issuerShortName), kind:kind(row), primaryCode:clean(row.primaryCode)};
}
function positive(value) { return /^\d+(\.\d+)?$/.test(value) && /[1-9]/.test(value); }
function consistent(rows, key) {
  const distinct = new Set(rows.map(row => clean(row[key])).filter(Boolean));
  return distinct.size === 1 ? [...distinct][0] : '';
}
function matchingCurrency(first, second) {
  return first && second && first !== second ? '' : first || second;
}

export function assetCard(rows) {
  const row = rows[0], asset = summary(row);
  const primary = rows.filter(r => r.sectionId === 1 && clean(r.securityTrading) === 'y');
  const nominalCurrency = currency(row.nominalCurrency);
  const knownQuotes = new Set(primary.map(r => currency(r.quoteCurrency)).filter(Boolean));
  const quoteCurrency = knownQuotes.size > 1 ? '' : matchingCurrency([...knownQuotes][0], currency(row.marketPriceCurrency));
  const payCurrency = currency(row.settlementCurrency);
  const percent = consistent(primary,'percentFlag');
  const quotation = percent && percent === clean(row.marketPercent) ? (percent === 'y' ? 'percent' : percent === 'n' ? 'cash' : '') : '';
  const aliases = new Map();
  for (const r of rows) {
    const code = clean(r.code);
    if (code) aliases.set(JSON.stringify([code,r.sectionId]), {code,section:clean(r.sectionName),sectionId:r.sectionId});
  }
  const isTrading = clean(row.isTrading) === 'y' && primary.length > 0;
  const bond = asset.kind.startsWith('bond-');
  const tick = decimal(row.tickSize);
  const simple = asset.kind.startsWith('share-') || ['fund-unit','depositary-receipt'].includes(asset.kind);
  const canQuote = isTrading && positive(tick) && !!quoteCurrency && quoteCurrency === payCurrency && minorDigits.has(quoteCurrency);
  return {...asset, aliases:[...aliases.values()], source:'QORT', asOfDate:iso(row.asOfDate),
    calculation:{source:'QORT · МБ ФР: T+', formula:!bond && simple && canQuote && quotation === 'cash' ? 'unit' : null,
      quantityUnit:'pieces', quantityStep:'1', priceStep:tick, currency:quoteCurrency,
      minorDigits:minorDigits.get(quoteCurrency) ?? null, rounding:'half-up', market:'stock'},
    instrumentTerms:{currentNominal:decimal(row.currentNominal), originalNominal:decimal(row.originalNominal),
      nominalCurrency, quoteCurrency, settlementCurrency:payCurrency, quotation, isTrading,
      cfi:clean(row.cfi), issueDate:iso(row.issueDate), maturityDate:iso(row.maturityDate),
      linkedCurrency:currency(row.linkedCurrency),
      // The standard clean-price convention applies to ordinary bonds on this board.
      quoteIncludesAccrued:bond && (quotation === 'percent' || /^DB[FVZ][A-Z]F[A-Z]$/.test(clean(row.cfi)) && quotation === 'cash') ? false : null,
      indexed:clean(row.indexedNominal) !== 'n', marketSettlementDate:iso(row.marketSettlementDate),
      priceScale:consistent(primary,'priceScale'), lotSize:consistent(primary,'lotSize')}
  };
}

// The two rows are already final within their sections. Preserve a real zero before considering a fallback.
export function bondDetail(asset, date, rows, quotationOverride) {
  const primary = rows.find(r => r.sectionId === 1);
  const fallback = rows.find(r => r.sectionId === 101);
  const hasValue = r => r && r.decimalValue != null;
  const selected = hasValue(primary) ? primary : hasValue(fallback) ? fallback : null;
  const sourceTable = selected ? (selected.currentValue != null ? 'MarketInfo' : 'MarketInfoHist') : null;
  const sourceStatus = !selected ? 'DEFAULT_ZERO' : selected.sectionId === 1 ? 'PRIMARY_TPLUS' : 'FALLBACK_OTC_101';
  const terms = asset.instrumentTerms, spec = asset.calculation;
  const datedCurrency = currency(selected?.marketPriceCurrency);
  const quoteForAccrued = selected ? datedCurrency : terms.quoteCurrency;
  // For these T+ and CCP bond quotations the verified accrual is per bond in its issue currency.
  // Conflicting or absent market denomination stays visible and requires a manual currency.
  const accruedCurrency = terms.nominalCurrency && quoteForAccrued === terms.nominalCurrency ? quoteForAccrued : '';
  const value = selected ? decimal(selected.decimalValue) : '0';
  const digits = minorDigits.get(accruedCurrency);
  const sourceSectionId = selected?.sectionId ?? null;
  const provenance = {sourceStatus, sourceSectionId, sourceTable,
    observationDate:sourceTable === 'MarketInfoHist' ? iso(selected.historyObservationDate) : null,
    asOfDate:iso(primary?.asOfDate), settlementDate:date, rawValue:selected ? clean(selected.rawValue) : '0'};
  const section = sourceSectionId === 1 ? 'МБ ФР: T+' : sourceSectionId === 101 ? 'МБ ФР: OTC: Облигации с ЦК' : '';
  const source = selected ? 'QORT · ' + section + ' · ' + sourceTable : 'QORT · по отсутствию данных в секциях 1 и 101';
  const quote = {...provenance, assetId:asset.assetId, date, section, source, unit:'per-security', value,
    displayValue:digits == null ? value : roundDecimal(value,digits), currency:accruedCurrency};
  const result = {quotes:[quote], terms:null, ...provenance};
  const dated = decimal(primary?.datedNominal);
  const samePrincipal = !terms.indexed && terms.currentNominal === terms.originalNominal;
  // ISO 10962: DB...., redemption attribute F means repayment in full at maturity.
  const fixedPrincipal = /^DB[A-Z]{2}F[A-Z]$/.test(terms.cfi) && terms.issueDate && terms.maturityDate &&
    date >= terms.issueDate && date < terms.maturityDate;
  const current = samePrincipal && (date === provenance.asOfDate || fixedPrincipal);
  const hasDatedNominal = primary?.nominalRecords > 0 || primary?.datedNominal != null;
  const nominal = hasDatedNominal ? dated : current ? terms.currentNominal : '';
  const quotation = quotationOverride || terms.quotation;
  if (!terms.isTrading || !positive(terms.currentNominal)) result.reason = 'У выпуска нет действующей котировки или положительного номинала.';
  else if (!minorDigits.has(terms.quoteCurrency) || !minorDigits.has(terms.settlementCurrency) ||
      selected && currency(selected.settlementCurrency) !== terms.settlementCurrency)
    result.reason = 'Валюта цены или расчётов не подтверждена для выбранного режима.';
  else if (terms.linkedCurrency && ![terms.quoteCurrency,terms.nominalCurrency,terms.settlementCurrency].includes(terms.linkedCurrency) ||
      terms.quoteCurrency !== terms.settlementCurrency && (terms.indexed || !/^DB[FVZ][A-Z]{3}$/.test(terms.cfi)))
    result.reason = 'Для валютной оговорки выпуска нужна согласованная формула. Укажите сумму вручную.';
  else if ((quotation === 'percent' || quotation !== terms.quotation) && (!positive(nominal) || !minorDigits.has(terms.nominalCurrency)))
    result.reason = 'Номинал или его валюта на дату расчётов не подтверждены.';
  else if (!positive(spec.priceStep) || typeof terms.quoteIncludesAccrued !== 'boolean' ||
      !['percent','cash'].includes(terms.quotation) || selected && clean(selected.percentFlag) !== (terms.quotation === 'percent' ? 'y' : 'n'))
    result.reason = 'Способ учёта НКД в котировке или шаг цены не подтверждён.';
  else result.terms = {source:spec.source, date, currency:terms.quoteCurrency, unit:'per-security',
    nominal, nominalSource:positive(dated) ? 'AssetsBaseValues.BVDate' : 'Assets.BaseValue',
    nominalCurrency:terms.nominalCurrency, nominalDigits:minorDigits.get(terms.nominalCurrency), settlementCurrency:terms.settlementCurrency,
    settlementDigits:minorDigits.get(terms.settlementCurrency), nativeQuotation:terms.quotation,
    formula:quotation === 'percent' ? 'bond-percent' : 'bond-cash',
    amountBasis:terms.quoteIncludesAccrued ? 'quoted' : 'dirty', quoteIncludesAccrued:terms.quoteIncludesAccrued};
  return result;
}

function roundDecimal(value, digits) {
  const [whole, fraction=''] = value.split('.');
  const padded = fraction.padEnd(digits+1,'0');
  const n = BigInt(whole + padded.slice(0,digits)) + (padded[digits] >= '5' ? 1n : 0n);
  const str = n.toString().padStart(digits+1,'0');
  return digits ? str.slice(0,-digits) + '.' + str.slice(-digits) : str;
}

export async function search(parameters) {
  const q = clean(parameters.q), filter = filters.get(parameters.assetClass || 'security');
  const requested = Number(parameters.limit ?? 20), limit = Math.min(20,requested), offset = Number(parameters.cursor || 0);
  if (!filter || !Number.isSafeInteger(requested) || requested < 1 || !Number.isInteger(offset) || offset < 0 ||
      offset > 2147483600 || q.length > 128) throw new ReferenceErrorResponse(400,'Некорректные параметры поиска.');
  if (q.length < 2) return {items:[], nextCursor:null};
  const escaped = q.replace(/[~%_\[]/g,'~$&');
  // Only a predicate from the fixed map above can be inserted. Search text travels as ODBC parameters.
  return withConnection(async (select, sql) => {
    const rows = await select(searchQuery.replace('/*assetClass*/',filter), [
      sql.NVarChar(q), sql.NVarChar(escaped+'%'), sql.NVarChar('%'+escaped+'%'), sql.Int(offset), sql.Int(limit+1)
    ]);
    return {items:rows.slice(0,limit).map(summary),nextCursor:rows.length > limit ? String(offset+limit) : null};
  });
}

export async function readAccrued(asset, date, readSection, quotation) {
  const rows = [await readSection(1)];
  if (rows[0].decimalValue == null) rows.push(await readSection(101));
  return bondDetail(asset,date,rows,quotation);
}

export async function detail(id, date, options = {}) {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return null;
  return withConnection(async (select, sql) => {
    const assetKey = sql.Float(Number(id));
    const rows = await select(cardQuery,[assetKey]);
    if (!rows.length) return null;
    const asset = assetCard(rows);
    const bondData = date && asset.kind.startsWith('bond-') ? await readAccrued(asset,date, async section => {
      const rows = await select(accruedQuery,[sql.Float(Number(id)), sql.Int(Number(date.replaceAll('-',''))),
        sql.Int(Number(asset.asOfDate.replaceAll('-',''))), sql.Int(section)]);
      return rows[0];
    },options.quotation) : {quotes:[], terms:null};
    if (asset.kind.startsWith('bond-') && date && options.tradeDate) {
      const terms = asset.instrumentTerms;
      const mode = options.quotation || terms.quotation;
      const principal = mode === 'percent' ? terms.nominalCurrency : terms.quoteCurrency;
      const interest = terms.quoteIncludesAccrued ? '' : options.accruedCurrency || bondData.quotes[0]?.currency;
      bondData.exchange = await readRates(select,sql,options.tradeDate,asset.asOfDate,[principal,interest],terms.settlementCurrency);
    }
    return {asset,bondData};
  });
}
