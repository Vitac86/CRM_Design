<?php
declare(strict_types=1);

namespace Orders;

const STATIC_ROOT = __DIR__ . '/../static-uikit';
require_once __DIR__ . '/src/qort.php';

if (PHP_SAPI !== 'cli') exit(1);
$options = getopt('', ['mock','port:'], $last);
if ($last !== $argc) {
    fwrite(STDERR, "Использование: php serve.php [--mock] [--port=4179]\n");
    exit(1);
}
$mock = array_key_exists('mock', $options);
$port = $options['port'] ?? ($mock ? 4178 : (qortSettings()['QORT_PORT'] ?? 4179));
$port = filter_var($port, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>65535]]);
if ($port === false) {
    fwrite(STDERR, "Порт HTTP должен быть от 1 до 65535.\n");
    exit(1);
}
$address = "127.0.0.1:$port";
$root = __DIR__ . '/public';
echo "http://$address/static-uikit/pages/document-wizard.html?subject=c-006\n";
$command = [PHP_BINARY];
if ($ini = php_ini_loaded_file()) array_push($command, '-c', $ini);
array_push($command, '-S', $address, '-t', $root, $root . '/index.php');
$environment = getenv();
$environment['ORDER_REFERENCE_MODE'] = $mock ? 'mock' : 'qort';
$server = proc_open($command, [STDIN,STDOUT,STDERR], $pipes, __DIR__, $environment, ['bypass_shell'=>true]);
exit(is_resource($server) ? proc_close($server) : 1);
