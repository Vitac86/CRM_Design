<?php
declare(strict_types=1);

namespace Orders;

require __DIR__ . '/../src/reference.php';

function same(mixed $expected, mixed $actual, string $case): void
{
    if ($expected !== $actual) throw new \RuntimeException($case);
}

$day = '2026-11-24';
$asset = ['assetId'=>'266','calculation'=>['source'=>'QORT','priceStep'=>'0.01'], 'instrumentTerms'=>[
    'isTrading'=>true,'nominalCurrency'=>'USD','settlementCurrency'=>'RUB','quoteCurrency'=>'USD','quotation'=>'percent',
    'quoteIncludesAccrued'=>false,'currentNominal'=>'1000','originalNominal'=>'1000','indexed'=>false,'cfi'=>'DBFXFR',
    'issueDate'=>'2020-01-01','maturityDate'=>'2030-01-01','linkedCurrency'=>'']];
$primary = ['sectionId'=>1,'asOfDate'=>20261124,'rawValue'=>'53.129999','decimalValue'=>'53.129999000000',
    'currentValue'=>53.129999,'marketPriceCurrency'=>'USD','settlementCurrency'=>'RUB','percentFlag'=>'y',
    'datedNominal'=>null,'nominalRecords'=>0,'historyObservationDate'=>null];
$fallback = array_replace($primary,['sectionId'=>101,'decimalValue'=>'53.130000000000','rawValue'=>'53.13',
    'currentValue'=>null,'historyObservationDate'=>20261123]);
$both = bondData($asset,$day,$primary,$fallback,'');
same([1,'53.129999','53.13'], [$both['sourceSectionId'],$both['quotes'][0]['value'],$both['quotes'][0]['displayValue']], 'Точность секции 1');
$zero = array_replace($primary,['rawValue'=>'0','decimalValue'=>'0.000','currentValue'=>0]);
same(1, bondData($asset,$day,$zero,$fallback,'')['sourceSectionId'], 'Нулевой НКД секции 1 имеет приоритет');
$empty = array_replace($primary,['rawValue'=>null,'currentValue'=>null,'decimalValue'=>null]);
$archive = bondData($asset,$day,$empty,$fallback,'');
same([101,'MarketInfoHist','2026-11-23'], [$archive['sourceSectionId'],$archive['sourceTable'],$archive['observationDate']], 'Архив секции 101');
$missing = bondData($asset,$day,$empty,null,'');
same(['DEFAULT_ZERO','0','0.00'], [$missing['sourceStatus'],$missing['quotes'][0]['value'],$missing['quotes'][0]['displayValue']], 'Обе секции пусты');
$invalid = array_replace($primary,['nominalRecords'=>2,'datedNominal'=>null]);
same(null, bondData($asset,$day,$invalid,null,'')['terms'], 'Противоречивый номинал');
same('100000000000000000000.00', roundedAmount('99999999999999999999.995',2), 'Десятичный перенос');
same([0,3,null], [currencyDigits('JPY'),currencyDigits('KWD'),currencyDigits('ZZZ')], 'Точность валют');

$row = ['fromCurrency'=>'CNY','toCurrency'=>'RUB','rate'=>'115.000000','units'=>10,'rateDate'=>20261124,'sourceTable'=>'CrossRatesHist'];
$rate = conversion('CNY','RUB',$day,[$row]);
same(['official','115','10'], [$rate['status'],$rate['legs'][0]['rate'],$rate['legs'][0]['units']], 'Котировка за 10 единиц');
same('missing', conversion('CNY','RUB','2026-11-25',[$row])['status'], 'Курс с другой даты');
$direct = array_replace($row,['rate'=>'1.000000000001','units'=>1]);
$inverse = array_replace($row,['fromCurrency'=>'RUB','toCurrency'=>'CNY','rate'=>'0.999999999999','units'=>1]);
same('ambiguous', conversion('CNY','RUB',$day,[$direct,$inverse])['status'], 'Противоречие прямой и обратной пары за пределами точности float');
$eur = array_replace($row,['fromCurrency'=>'EUR','rate'=>'92','units'=>1]);
same(2, count(conversion('CNY','EUR',$day,[$row,$eur])['legs']), 'Пересчёт через рубль');
echo "Проверены приоритет и точность НКД, номинал, округление и валютные пары.\n";
