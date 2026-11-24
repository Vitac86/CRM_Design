<?php
declare(strict_types=1);

namespace Orders;

// Точность из валютного справочника действующего API (Intl.NumberFormat).
function currencyDigits(string $code): ?int
{
    static $digits = null;
    if ($digits === null) {
        $digits = [];
        foreach ([
            0 => 'AFN ALL BIF CLP COP DJF GNF HUF IDR IQD IRR ISK JPY KMF KPW KRW LAK LBP MGA MMK PKR PYG RWF SLL SOS SYP UGX VND VUV XAF XOF XPF YER',
            2 => 'AED AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CNY CRC CUC CUP CVE CZK DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GTQ GYD HKD HNL HRK HTG ILS INR JMD KES KGS KHR KYD KZT LKR LRD LSL MAD MDL MKD MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD PAB PEN PGK PHP PLN QAR RON RSD RUB SAR SBD SCR SDG SEK SGD SHP SLE SRD SSP STN SVC SZL THB TJS TMT TOP TRY TTD TWD TZS UAH USD UYU UZS VES WST XCD XCG XDR XSU ZAR ZMW ZWG ZWL',
            3 => 'BHD JOD KWD LYD OMR TND',
        ] as $precision => $codes) {
            $digits += array_fill_keys(explode(' ', $codes), $precision);
        }
    }
    return $digits[$code] ?? null;
}

function clean(mixed $value): string
{
    return preg_replace('/^[\s\x{FEFF}]+|[\s\x{FEFF}]+$/u', '', (string) $value) ?? '';
}

function decimal(mixed $value): string
{
    return preg_replace('/(\.\d*?[1-9])0+$|\.0+$/D', '$1', clean($value));
}

function currency(mixed $value): string
{
    $code = strtoupper(clean($value));
    if ($code === 'RUR' || $code === 'SUR') return 'RUB';
    return preg_match('/^[A-Z]{3}$/D', $code) ? $code : '';
}

function isoDate(mixed $value): ?string
{
    return preg_match('/^(\d{4})(\d{2})(\d{2})$/D', clean($value), $m) ? "$m[1]-$m[2]-$m[3]" : null;
}

function positive(string $value): bool
{
    return (bool) preg_match('/^\d+(?:\.\d+)?$/D', $value) && strpbrk($value, '123456789') !== false;
}

function assetSummary(array $row): array
{
    $sorts = [1=>'share-ordinary',2=>'share-preferred',3=>'bond-government',6=>'bond-corporate',
        7=>'bond-regional',8=>'bond-municipal',9=>'depositary-receipt',10=>'depositary-receipt',12=>'bond-euro',
        14=>'fund-unit',22=>'bond-central-bank',24=>'share-foreign',33=>'bond-foreign',78=>'share-preferred'];
    $kind = $sorts[(int) $row['sortId']] ?? match ((int) $row['classId']) {
        6, 7, 9 => 'bond-other', 11 => 'fund-unit', 5 => 'share-other', default => 'security-other'
    };
    $name = clean($row['viewName']);
    return ['assetId'=>(string) (int) $row['assetId'], 'isin'=>clean($row['isin']),
        'shortName'=>$name !== '' ? $name : clean($row['shortName']), 'displayName'=>clean($row['displayName']),
        'issuerName'=>clean($row['issuerName']), 'issuerShortName'=>clean($row['issuerShortName']),
        'kind'=>$kind, 'primaryCode'=>clean($row['primaryCode'])];
}

function consistent(array $rows, string $field): string
{
    $values = array_values(array_unique(array_filter(array_map(__NAMESPACE__ . '\clean', array_column($rows, $field)),
        static fn($value) => $value !== '')));
    return count($values) === 1 ? $values[0] : '';
}

function assetCard(array $rows): array
{
    $row = $rows[0];
    $asset = assetSummary($row);
    $primary = array_filter($rows, static fn($r) => (int) $r['sectionId'] === 1 && clean($r['securityTrading']) === 'y');
    $nominalCurrency = currency($row['nominalCurrency']);
    $codes = array_values(array_unique(array_filter(array_map(__NAMESPACE__ . '\currency', array_column($primary, 'quoteCurrency')))));
    $marketCurrency = currency($row['marketPriceCurrency']);
    $quoteCurrency = $codes[0] ?? $marketCurrency;
    if (count($codes) > 1 || ($marketCurrency !== '' && $marketCurrency !== $quoteCurrency)) $quoteCurrency = '';
    $payCurrency = currency($row['settlementCurrency']);
    $percent = consistent($primary, 'percentFlag');
    $quotation = $percent === clean($row['marketPercent']) ? match ($percent) {'y'=>'percent','n'=>'cash',default=>''} : '';
    $aliases = [];
    foreach ($rows as $r) {
        $code = clean($r['code']);
        if ($code !== '') {
            $section = $r['sectionId'] === null ? null : (int) $r['sectionId'];
            $aliases[json_encode([$code,$section])] = ['code'=>$code, 'section'=>clean($r['sectionName']), 'sectionId'=>$section];
        }
    }
    $isTrading = clean($row['isTrading']) === 'y' && count($primary) > 0;
    $bond = str_starts_with($asset['kind'], 'bond-');
    $tick = decimal($row['tickSize']);
    $simple = str_starts_with($asset['kind'], 'share-') || in_array($asset['kind'], ['fund-unit','depositary-receipt'], true);
    $digits = currencyDigits($quoteCurrency);
    $canQuote = $isTrading && positive($tick) && $quoteCurrency === $payCurrency && $digits !== null;
    $cfi = clean($row['cfi']);
    return $asset + ['aliases'=>array_values($aliases), 'source'=>'QORT','asOfDate'=>isoDate($row['asOfDate']),
        'calculation'=>['source'=>'QORT · МБ ФР: T+', 'formula'=>!$bond && $simple && $canQuote && $quotation === 'cash' ? 'unit' : null,
            'quantityUnit'=>'pieces','quantityStep'=>'1','priceStep'=>$tick,'currency'=>$quoteCurrency,
            'minorDigits'=>$digits,'rounding'=>'half-up','market'=>'stock'],
        'instrumentTerms'=>['currentNominal'=>decimal($row['currentNominal']), 'originalNominal'=>decimal($row['originalNominal']),
            'nominalCurrency'=>$nominalCurrency,'quoteCurrency'=>$quoteCurrency,'settlementCurrency'=>$payCurrency,
            'quotation'=>$quotation,'isTrading'=>$isTrading,'cfi'=>$cfi,'issueDate'=>isoDate($row['issueDate']),
            'maturityDate'=>isoDate($row['maturityDate']),'linkedCurrency'=>currency($row['linkedCurrency']),
            'quoteIncludesAccrued'=>$bond && ($quotation === 'percent' || ($quotation === 'cash' && preg_match('/^DB[FVZ][A-Z]F[A-Z]$/D',$cfi))) ? false : null,
            'indexed'=>clean($row['indexedNominal']) !== 'n','marketSettlementDate'=>isoDate($row['marketSettlementDate']),
            'priceScale'=>consistent($primary,'priceScale'),'lotSize'=>consistent($primary,'lotSize')]];
}

// Округляется только отображаемая строка. Сумма сделки получает исходную десятичную строку.
function roundedAmount(string $value, int $digits): string
{
    [$whole,$fraction] = array_pad(explode('.', $value, 2), 2, '');
    $fraction = str_pad($fraction, $digits + 1, '0');
    $units = bcadd($whole . substr($fraction, 0, $digits), $fraction[$digits] >= '5' ? '1' : '0', 0);
    $number = str_pad($units, $digits + 1, '0', STR_PAD_LEFT);
    return $digits ? substr($number, 0, -$digits) . '.' . substr($number, -$digits) : $number;
}

function bondData(array $asset, string $date, array $primary, ?array $fallback, string $override): array
{
    $selected = isset($primary['decimalValue']) ? $primary : (isset($fallback['decimalValue']) ? $fallback : null);
    $sectionId = $selected === null ? null : (int) $selected['sectionId'];
    $table = $selected === null ? null : (isset($selected['currentValue']) ? 'MarketInfo' : 'MarketInfoHist');
    $terms = $asset['instrumentTerms'];
    $spec = $asset['calculation'];
    $quoteCurrency = $terms['quoteCurrency'];
    $pay = $terms['settlementCurrency'];
    $denomination = $terms['nominalCurrency'];
    $quoteForAccrued = $selected === null ? $quoteCurrency : currency($selected['marketPriceCurrency']);
    $accruedCurrency = $quoteForAccrued === $denomination ? $denomination : '';
    $value = $selected === null ? '0' : decimal($selected['decimalValue']);
    $digits = currencyDigits($accruedCurrency);
    $provenance = ['sourceStatus'=>match ($sectionId) {1=>'PRIMARY_TPLUS',101=>'FALLBACK_OTC_101',default=>'DEFAULT_ZERO'},
        'sourceSectionId'=>$sectionId, 'sourceTable'=>$table,
        'observationDate'=>$table === 'MarketInfoHist' ? isoDate($selected['historyObservationDate']) : null,
        'asOfDate'=>isoDate($primary['asOfDate']), 'settlementDate'=>$date,
        'rawValue'=>$selected === null ? '0' : clean($selected['rawValue'])];
    $section = match ($sectionId) {1=>'МБ ФР: T+',101=>'МБ ФР: OTC: Облигации с ЦК',default=>''};
    $source = $selected === null ? 'QORT · по отсутствию данных в секциях 1 и 101' : "QORT · $section · $table";
    $quote = $provenance + ['assetId'=>$asset['assetId'],'date'=>$date,'section'=>$section,'source'=>$source,
        'unit'=>'per-security','value'=>$value,'displayValue'=>$digits === null ? $value : roundedAmount($value,$digits),'currency'=>$accruedCurrency];
    $result = ['quotes'=>[$quote],'terms'=>null] + $provenance;
    $dated = decimal($primary['datedNominal']);
    $samePrincipal = !$terms['indexed'] && $terms['currentNominal'] === $terms['originalNominal'];
    $fixed = preg_match('/^DB[A-Z]{2}F[A-Z]$/D',$terms['cfi']) && $terms['issueDate'] && $terms['maturityDate']
        && $date >= $terms['issueDate'] && $date < $terms['maturityDate'];
    $current = $samePrincipal && ($date === $provenance['asOfDate'] || $fixed);
    $nominal = $primary['nominalRecords'] > 0 || $primary['datedNominal'] !== null ? $dated : ($current ? $terms['currentNominal'] : '');
    $native = $terms['quotation'];
    $quotation = $override ?: $native;
    $reason = match (true) {
        !$terms['isTrading'] || !positive($terms['currentNominal']) => 'У выпуска нет действующей котировки или положительного номинала.',
        currencyDigits($quoteCurrency) === null || currencyDigits($pay) === null || ($selected && currency($selected['settlementCurrency']) !== $pay)
            => 'Валюта цены или расчётов не подтверждена для выбранного режима.',
        ($terms['linkedCurrency'] !== '' && !in_array($terms['linkedCurrency'], [$quoteCurrency,$denomination,$pay], true)) ||
            ($quoteCurrency !== $pay && ($terms['indexed'] || !preg_match('/^DB[FVZ][A-Z]{3}$/D',$terms['cfi'])))
            => 'Для валютной оговорки выпуска нужна согласованная формула. Укажите сумму вручную.',
        ($quotation === 'percent' || $quotation !== $native) && (!positive($nominal) || currencyDigits($denomination) === null)
            => 'Номинал или его валюта на дату расчётов не подтверждены.',
        !positive($spec['priceStep']) || !is_bool($terms['quoteIncludesAccrued']) || !in_array($native,['percent','cash'],true) ||
            ($selected && clean($selected['percentFlag']) !== ($native === 'percent' ? 'y' : 'n'))
            => 'Способ учёта НКД в котировке или шаг цены не подтверждён.',
        default => null,
    };
    if ($reason !== null) {
        $result['reason'] = $reason;
    } else {
        $result['terms'] = ['source'=>$spec['source'],'date'=>$date,'currency'=>$quoteCurrency,'unit'=>'per-security',
            'nominal'=>$nominal,'nominalSource'=>positive($dated) ? 'AssetsBaseValues.BVDate' : 'Assets.BaseValue',
            'nominalCurrency'=>$denomination,'settlementCurrency'=>$pay,'settlementDigits'=>currencyDigits($pay),
            'nativeQuotation'=>$native,'formula'=>$quotation === 'percent' ? 'bond-percent' : 'bond-cash',
            'amountBasis'=>$terms['quoteIncludesAccrued'] ? 'quoted' : 'dirty','quoteIncludesAccrued'=>$terms['quoteIncludesAccrued']];
        if (currencyDigits($denomination) !== null) $result['terms']['nominalDigits'] = currencyDigits($denomination);
    }
    return $result;
}

function rateLeg(string $from, string $to, array $rows): ?array
{
    $leg = null;
    foreach ($rows as $row) {
        if ($row['fromCurrency'] !== $from || $row['toCurrency'] !== $to) continue;
        $rate = decimal($row['rate']);
        $units = (string) $row['units'];
        if (!positive($rate) || !positive($units) || ($leg && ($rate !== $leg['rate'] || $units !== $leg['units']))) {
            return ['status'=>'ambiguous'];
        }
        $leg ??= ['status'=>'official','from'=>$from,'to'=>$to,'rate'=>$rate,'units'=>$units,'table'=>$row['sourceTable']];
    }
    return $leg;
}

function between(string $from, string $to, array $rows): ?array
{
    $direct = rateLeg($from,$to,$rows);
    $inverse = rateLeg($to,$from,$rows);
    if ($direct === null || $inverse === null) return $direct ?? $inverse;
    if ($direct['status'] === 'official' && $inverse['status'] === 'official') {
        // Умножение с полной точностью обоих множителей до сравнения обратных котировок.
        $scale = static fn($s) => strlen(explode('.', $s, 2)[1] ?? '');
        $precision = max($scale($direct['rate']) + $scale($inverse['rate']), $scale($direct['units']) + $scale($inverse['units']));
        if (bcmul($direct['rate'],$inverse['rate'],$precision) === bcmul($direct['units'],$inverse['units'],$precision)) return $direct;
    }
    return ['status'=>'ambiguous'];
}

function conversion(string $from, string $to, string $date, array $rows): array
{
    $key = str_replace('-','',$date);
    $exact = array_filter($rows, static fn($row) => (string) $row['rateDate'] === $key);
    $direct = between($from,$to,$exact);
    $legs = $direct ? [$direct] : ($from !== 'RUB' && $to !== 'RUB' ? [between($from,'RUB',$exact), between('RUB',$to,$exact)] : []);
    $pair = ['from'=>$from,'to'=>$to,'date'=>$date];
    if (in_array('ambiguous',array_column(array_filter($legs),'status'),true)) return $pair + ['status'=>'ambiguous','legs'=>[]];
    if (!$legs || in_array(null,$legs,true)) return $pair + ['status'=>'missing','legs'=>[]];
    return $pair + ['status'=>'official','source'=>'MainCurBank','legs'=>$legs];
}

function jsLength(string $value): int
{
    return intdiv(strlen(mb_convert_encoding($value,'UTF-16LE','UTF-8')), 2);
}

function pageNumber(string $value): float
{
    $value = clean($value);
    if ($value === '') return 0.0;
    if ($value === 'Infinity' || $value === '+Infinity') return INF;
    if ($value === '-Infinity') return -INF;
    if (preg_match('/^0(?:[xX][0-9a-fA-F]+|[bB][01]+|[oO][0-7]+)$/D', $value)) {
        $base = match (strtolower($value[1])) {'x'=>16,'b'=>2,'o'=>8};
        return (float) intval(substr($value, 2), $base);
    }
    return is_numeric($value) ? (float) $value : NAN;
}
