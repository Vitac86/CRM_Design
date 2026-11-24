<?php
declare(strict_types=1);

namespace Orders;

function mockFixture(): array
{
    $script = file_get_contents(STATIC_ROOT . '/assets/js/document-wizard/instrument-securities-demo.js');
    if (!preg_match('~/\* ORDER-FIXTURE-JSON-BEGIN \*/(.*?)/\* ORDER-FIXTURE-JSON-END \*/~s', $script, $match)) {
        throw new \RuntimeException('Missing demo fixture');
    }
    return json_decode($match[1], true, 32, JSON_THROW_ON_ERROR);
}

function normalized(string $value): string
{
    return str_replace('ё', 'е', mb_strtolower(clean($value), 'UTF-8'));
}

function mockRank(array $asset, string $q): ?int
{
    $isin = normalized($asset['isin']);
    $codes = array_map(__NAMESPACE__ . '\normalized', array_column($asset['aliases'],'code'));
    if ($isin === $q) return 0;
    if (in_array($q,$codes,true)) return 1;
    foreach ([...$codes,$isin] as $code) {
        if (str_starts_with($code,$q)) return 2;
    }
    $name = normalized($asset['shortName']);
    if (str_starts_with($name,$q)) return 3;
    if (str_contains($name,$q) || str_contains(normalized($asset['displayName']),$q)) return 4;
    if (str_contains(normalized($asset['issuerName']),$q)) return 5;
    foreach ($codes as $code) {
        if (str_contains($code,$q)) return 4;
    }
    return null;
}

function mockSearch(array $params): array
{
    $q = normalized($params['q'] ?? '');
    $class = ($params['assetClass'] ?? '') === '' ? 'security' : $params['assetClass'];
    $offset = pageNumber($params['cursor'] ?? '0');
    $requested = pageNumber(($params['limit'] ?? '') === '' ? '20' : $params['limit']);
    $limit = is_nan($requested) ? NAN : min(20, $requested);
    if (!is_finite($offset) || floor($offset) !== $offset || $offset < 0 || $offset > 9007199254740991 ||
        !is_finite($limit) || floor($limit) != $limit || $limit < 1 || !in_array($class,['security','share','fund','bond'],true)) {
        throw new HttpError('Некорректный запрос', 400);
    }
    $hits = [];
    if (jsLength($q) >= 2) {
        foreach (mockFixture()['securities'] as $asset) {
            if ($class !== 'security' && explode('-', $asset['kind'], 2)[0] !== $class) continue;
            $rank = mockRank($asset, $q);
            if ($rank !== null) $hits[] = [$rank,$asset['assetId'],$asset];
        }
        usort($hits, static fn($a,$b) => ($a[0] <=> $b[0]) ?: strcmp($a[1],$b[1]));
    }
    $items = [];
    foreach (array_slice($hits, (int) $offset, (int) $limit) as [,,$asset]) {
        $items[] = array_intersect_key($asset, array_flip(['assetId','shortName','displayName','isin','issuerName','kind']))
            + ['primaryCode'=>$asset['aliases'][0]['code'] ?? ''];
    }
    return ['items'=>$items,'nextCursor'=>$offset + $limit < count($hits) ? (string) (int) ($offset + $limit) : null];
}

function mockDetail(string $id, string $date): ?array
{
    $fixture = mockFixture();
    $id = clean($id);
    foreach ($fixture['securities'] as $asset) {
        if ($asset['assetId'] !== $id) continue;
        $asset['calculation'] = $fixture['securityDefaults'] + ['formula'=>$asset['formula']];
        unset($asset['formula']);
        $asset['aliases'] = array_map(static fn($r) => ['code'=>$r['code'],'section'=>$r['section']], $asset['aliases']);
        $data = ['quotes'=>[],'terms'=>null];
        if ($date !== '' && str_starts_with($asset['kind'], 'bond-')) {
            $example = $fixture['example'];
            $levels = $id === $example['assetId'] ? ($example['dates'][$date] ?? null) : null;
            $section = isset($levels[0]) ? 1 : (isset($levels[1]) ? 101 : null);
            $data['quotes'][] = ['assetId'=>$id,'date'=>$date,'value'=>$levels[0] ?? $levels[1] ?? '0',
                'currency'=>$asset['calculation']['currency'],'unit'=>'per-security',
                'section'=>match ($section) {1=>'МБ ФР: T+',101=>'МБ ФР: OTC: Облигации с ЦК',default=>''},
                'sourceSectionId'=>$section,'sourceStatus'=>match ($section) {1=>'PRIMARY_TPLUS',101=>'FALLBACK_OTC_101',default=>'DEFAULT_ZERO'},
                'source'=>$example['source'] . ($section ? ' · секция ' . $section : ' · нет НКД в секциях 1 и 101')];
            if ($levels !== null) $data['terms'] = ['date'=>$date,'currency'=>'RUB','unit'=>'per-security','nominal'=>'1000',
                'formula'=>'bond-percent','amountBasis'=>'dirty','source'=>$example['source']];
        }
        return ['asset'=>$asset,'bondData'=>$data];
    }
    return null;
}
