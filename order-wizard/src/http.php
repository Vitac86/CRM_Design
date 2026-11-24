<?php
declare(strict_types=1);

namespace Orders;

use DateTimeImmutable;
use RuntimeException;
use Throwable;

const STATIC_ROOT = __DIR__ . '/../../static-uikit';
const API = '/api/order-reference/assets';

final class HttpError extends RuntimeException {}

function jsonResponse(int $status, array $body): void
{
    $json = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo $json;
}

function calendarDate(string $date): bool
{
    if ($date === '') return true;
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/D', $date)) return false;
    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    return $parsed !== false && $parsed->format('Y-m-d') === $date;
}

function apiRequest(string $path, string $query, bool $live): array
{
    // URLSearchParams returns the first detail option; the search contract uses the last.
    $params = [];
    foreach (explode('&', $query) as $pair) {
        [$name, $value] = array_pad(explode('=', $pair, 2), 2, '');
        $name = urldecode($name);
        if ($path === API || !array_key_exists($name, $params)) {
            $params[$name] = urldecode($value);
        }
    }
    require_once __DIR__ . '/reference.php';
    require_once __DIR__ . ($live ? '/qort.php' : '/mock.php');

    if ($path === API) {
        return $live ? qortSearch($params) : mockSearch($params);
    }
    $id = substr($path, strlen(API) + 1);
    $settlement = $params['settlementDate'] ?? '';
    $trade = $params['tradeDate'] ?? '';
    $quotation = $params['quotation'] ?? '';
    $currency = $params['accruedCurrency'] ?? '';
    if (!calendarDate($settlement) || !calendarDate($trade)) {
        throw new HttpError('Некорректная дата', 400);
    }
    if (($quotation !== '' && !in_array($quotation, ['percent','cash'], true)) ||
        ($currency !== '' && !preg_match('/^[A-Z]{3}$/D', $currency))) {
        throw new HttpError('Некорректный способ котировки или валюта НКД', 400);
    }
    $card = $live ? qortDetail($id, $settlement, $trade, $quotation, $currency) : mockDetail($id, $settlement);
    return $card ?? throw new HttpError('Актив не найден', 404);
}

function staticFile(string $path, bool $live): void
{
    $prefix = '/static-uikit/';
    if (!str_starts_with($path, $prefix)) {
        throw new HttpError('Страница не найдена', 404);
    }
    $name = substr($path, strlen($prefix)) ?: 'INDEX.html';
    $parts = explode('/', $name);
    foreach ($parts as $part) {
        if ($part === '' || $part[0] === '.' || strpbrk($part, "\\:\0") !== false || preg_match('/[. ]$/D', $part)) {
            throw new HttpError('Файл не найден', 404);
        }
    }
    $mime = ['html'=>'text/html; charset=utf-8','js'=>'text/javascript; charset=utf-8','mjs'=>'text/javascript; charset=utf-8',
        'css'=>'text/css; charset=utf-8','svg'=>'image/svg+xml','ico'=>'image/x-icon','png'=>'image/png','jpg'=>'image/jpeg',
        'woff2'=>'font/woff2','woff'=>'font/woff','ttf'=>'font/ttf','pdf'=>'application/pdf'];
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $isPage = count($parts) === 2 && $parts[0] === 'pages' && $ext === 'html';
    $isAsset = $parts[0] === 'assets' && isset($mime[$ext]) && in_array($parts[1] ?? '',
        ['brand','css','icons','fonts','js','vendor','document-pdf-templates','document-templates','document-template-projects'], true);
    if (($name !== 'INDEX.html' && !$isPage && !$isAsset) ||
        strcasecmp(basename($name), 'instrument-securities-demo.js') === 0) {
        throw new HttpError('Файл не найден', 404);
    }
    $base = realpath(STATIC_ROOT);
    $allowed = $isAsset ? $base . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . $parts[1] :
        ($isPage ? $base . DIRECTORY_SEPARATOR . 'pages' : $base);
    $file = realpath($base . DIRECTORY_SEPARATOR . $name);
    if ($file === false || !str_starts_with($file, $allowed . DIRECTORY_SEPARATOR) || !is_file($file)) {
        throw new HttpError('Файл не найден', 404);
    }
    header('Content-Type: ' . $mime[$ext]);
    header('Cache-Control: no-cache');
    if (strcasecmp($name, 'pages/document-wizard.html') === 0) {
        $html = file_get_contents($file);
        $html = preg_replace('~<script src="[^"]*/instrument-securities-demo\.js"></script>~', '', $html);
        $meta = '<meta name="crm-order-reference-api" content="' . API . '" data-mode="' . ($live ? 'qort' : 'demo') . '">';
        echo str_replace('</head>', $meta . "\n</head>", $html);
    } else {
        readfile($file);
    }
}

header_remove('X-Powered-By');
header('X-Content-Type-Options: nosniff');
try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        header('Allow: GET');
        throw new HttpError('Метод не поддерживается', 405);
    }
    $mode = getenv('ORDER_REFERENCE_MODE');
    if ($mode === false || $mode === '') $mode = get_cfg_var('orders.mode');
    if ($mode === false || $mode === '') $mode = 'qort';
    if (!in_array($mode, ['qort','mock'], true)) {
        throw new HttpError('Справочник не настроен.', 503);
    }
    [$rawPath, $query] = array_pad(explode('?', $_SERVER['REQUEST_URI'], 2), 2, '');
    $path = rawurldecode($rawPath);
    if ($path === '/') {
        header('Location: /static-uikit/pages/document-wizard.html?' . ($query !== '' ? $query : 'subject=c-006'), true, 302);
    } elseif ($path === API || str_starts_with($path, API . '/')) {
        jsonResponse(200, apiRequest($path, $query, $mode === 'qort'));
    } else {
        staticFile($path, $mode === 'qort');
    }
} catch (HttpError $e) {
    jsonResponse($e->getCode(), ['error'=>$e->getMessage()]);
} catch (\PDOException $e) {
    error_log('QORT: ' . $e->getMessage());
    jsonResponse(503, ['error'=>'Не удалось прочитать QORT. Проверьте подключение Windows и повторите запрос.']);
} catch (Throwable $e) {
    error_log('Order reference: ' . $e->getMessage());
    jsonResponse(503, ['error'=>'Справочник временно недоступен. Повторите запрос.']);
}
