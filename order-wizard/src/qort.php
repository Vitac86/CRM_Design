<?php
declare(strict_types=1);

namespace Orders;

use PDO;
use PDOException;

const QORT_SQL = STATIC_ROOT . '/tools/qort/';
const SEARCH_FILTERS = ['security'=>'1 = 1','bond'=>'a.AssetClass_Const IN (6,7,9)',
    'share'=>'a.AssetClass_Const = 5 OR a.AssetSort_Const IN (24,78)','fund'=>'a.AssetClass_Const = 11'];

function qortSettings(): array
{
    $path = STATIC_ROOT . '/.env.qort.local';
    $settings = [];
    foreach (is_file($path) ? file($path, FILE_IGNORE_NEW_LINES) : [] as $line) {
        $line = preg_replace('/^\x{FEFF}/u', '', $line);
        if (preg_match('/^\s*(?:export\s+)?(QORT_[A-Z_]+)\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^#]*))/u', $line, $m, PREG_UNMATCHED_AS_NULL)) {
            $settings[$m[1]] = $m[2] ?? $m[3] ?? trim($m[4]);
        }
    }
    foreach (['QORT_SERVER','QORT_DATABASE','QORT_TRUSTED_CONNECTION','QORT_TRUST_SERVER_CERTIFICATE','QORT_QUERY_TIMEOUT_MS','QORT_PORT'] as $key) {
        $override = getenv($key);
        if ($override !== false) $settings[$key] = $override;
    }
    return array_filter($settings, static fn($value) => $value !== '') + [
        'QORT_SERVER'=>'', 'QORT_DATABASE'=>'BACK_QORT_DB', 'QORT_TRUSTED_CONNECTION'=>'true',
        'QORT_TRUST_SERVER_CERTIFICATE'=>'false', 'QORT_QUERY_TIMEOUT_MS'=>'10000', 'QORT_PORT'=>'4179',
    ];
}

function qortConnection(): PDO
{
    $settings = qortSettings();
    $server = $settings['QORT_SERVER'];
    $certificate = $settings['QORT_TRUST_SERVER_CERTIFICATE'];
    $timeout = (is_numeric($settings['QORT_QUERY_TIMEOUT_MS']) ? (float) $settings['QORT_QUERY_TIMEOUT_MS'] : NAN);
    if (!preg_match('/^[\w.-]+(?:\\\\[\w$-]+)?(?:,\d{1,5})?$/D', $server) ||
        $settings['QORT_DATABASE'] !== 'BACK_QORT_DB' ||
        $settings['QORT_TRUSTED_CONNECTION'] !== 'true' ||
        !in_array($certificate, ['true','false'], true) || !is_finite($timeout) || floor($timeout) !== $timeout || $timeout < 1000 || $timeout > 60000) {
        throw new HttpError('Проверьте настройки подключения справочника.', 503);
    }
    if (!extension_loaded('pdo_sqlsrv') || !extension_loaded('bcmath')) {
        throw new HttpError('Для справочника QORT требуются серверные расширения PHP.', 503);
    }
    $seconds = (int) ceil((int) $timeout / 1000);
    // При отсутствии UID и PWD PDO_SQLSRV использует Windows-учётную запись процесса.
    $dsn = 'sqlsrv:Server=' . $server . ';Database=BACK_QORT_DB;Driver={ODBC Driver 18 for SQL Server};Encrypt=Yes;'
        . 'ApplicationIntent=ReadOnly;TrustServerCertificate=' . ($certificate === 'true' ? 'Yes' : 'No') . ';LoginTimeout=' . $seconds;
    return new PDO($dsn, null, null, [
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
        PDO::SQLSRV_ATTR_ENCODING=>PDO::SQLSRV_ENCODING_UTF8, PDO::SQLSRV_ATTR_DIRECT_QUERY=>false,
        PDO::SQLSRV_ATTR_FETCHES_NUMERIC_TYPE=>true, PDO::SQLSRV_ATTR_QUERY_TIMEOUT=>$seconds,
    ]);
}

// Только четыре проверенных SELECT/CTE из каталога проекта. Все пользовательские значения передаются параметрами.
function selectRows(PDO $db, string $file, array $parameters, string $class = 'security'): array
{
    if (!in_array($file, ['search','card','accrued','cbr-rates'], true)) throw new \LogicException('Unknown reference query');
    $sql = file_get_contents(QORT_SQL . $file . '.sql');
    if ($file === 'search') $sql = str_replace('/*assetClass*/', SEARCH_FILTERS[$class], $sql);
    $statement = $db->prepare($sql);
    foreach ($parameters as $i => $value) {
        $statement->bindValue($i + 1, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $statement->execute();
    return $statement->fetchAll();
}

function qortSearch(array $parameters): array
{
    $query = clean($parameters['q'] ?? '');
    $class = ($parameters['assetClass'] ?? '') === '' ? 'security' : $parameters['assetClass'];
    $requested = pageNumber($parameters['limit'] ?? '20');
    $offset = pageNumber($parameters['cursor'] ?? '0');
    if (!isset(SEARCH_FILTERS[$class]) || !is_finite($requested) || floor($requested) !== $requested ||
        $requested < 1 || $requested > 9007199254740991 || !is_finite($offset) || floor($offset) !== $offset ||
        $offset < 0 || $offset > 2147483600 || !mb_check_encoding($parameters['q'] ?? '', 'UTF-8') || jsLength($query) > 128) {
        throw new HttpError('Некорректные параметры поиска.', 400);
    }
    if (jsLength($query) < 2) return ['items'=>[], 'nextCursor'=>null];
    $limit = (int) min(20, $requested);
    $escaped = strtr($query, ['~'=>'~~','%'=>'~%','_'=>'~_','['=>'~[']);
    $rows = selectRows(qortConnection(), 'search', [$query, $escaped . '%', '%' . $escaped . '%', (int) $offset, $limit + 1], $class);
    return ['items'=>array_map(__NAMESPACE__ . '\assetSummary', array_slice($rows, 0, $limit)),
        'nextCursor'=>count($rows) > $limit ? (string) ((int) $offset + $limit) : null];
}

function datedRates(PDO $db, string $date, string $asOf, array $sources, string $to): array
{
    $from = array_values(array_unique(array_filter($sources, static fn($s) => $s !== '' && $s !== $to)));
    if ($to === '' || !$from) return ['date'=>$date,'rates'=>[]];
    $codes = array_map(static fn($s) => $s === 'RUB' ? 'RUR' : $s, array_unique([...$from, $to, 'RUB']));
    $parameters = [(int) str_replace('-', '', $date), (int) str_replace('-', '', $asOf), 'MainCurBank', ...array_pad(array_values($codes), 4, '')];
    try {
        $rows = selectRows($db, 'cbr-rates', $parameters);
        $rates = array_map(static fn($s) => conversion($s, $to, $date, $rows), $from);
    } catch (PDOException $e) {
        // Сбой только валютного справочника оставляет доступными НКД и ручной курс.
        error_log('QORT FX: ' . $e->getMessage());
        $rates = array_map(static fn($s) => ['from'=>$s,'to'=>$to,'date'=>$date,'status'=>'error','legs'=>[]], $from);
    }
    return ['date'=>$date,'rates'=>$rates];
}

function qortDetail(string $id, string $date, string $tradeDate, string $quotation, string $accruedCurrency): ?array
{
    if (!preg_match('/^[1-9]\d{0,15}$/D', $id) || (int) $id > 9007199254740991) return null;
    $db = qortConnection();
    $rows = selectRows($db, 'card', [$id]);
    if (!$rows) return null;
    $asset = assetCard($rows);
    $data = ['quotes'=>[], 'terms'=>null];
    if ($date !== '' && str_starts_with($asset['kind'], 'bond-')) {
        $params = [$id, (int) str_replace('-', '', $date), (int) str_replace('-', '', $asset['asOfDate'])];
        $primary = selectRows($db, 'accrued', [...$params, 1])[0];
        $fallback = $primary['decimalValue'] === null ? selectRows($db, 'accrued', [...$params, 101])[0] : null;
        $data = bondData($asset, $date, $primary, $fallback, $quotation);
        if ($tradeDate !== '') {
            $terms = $asset['instrumentTerms'];
            $principal = ($quotation ?: $terms['quotation']) === 'percent' ? $terms['nominalCurrency'] : $terms['quoteCurrency'];
            $interest = $terms['quoteIncludesAccrued'] ? '' : ($accruedCurrency ?: $data['quotes'][0]['currency']);
            $data['exchange'] = datedRates($db, $tradeDate, $asset['asOfDate'], [$principal,$interest], $terms['settlementCurrency']);
        }
    }
    return ['asset'=>$asset, 'bondData'=>$data];
}
