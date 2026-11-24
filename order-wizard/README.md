# PHP-бэкенд мастера поручений

## Запуск на Windows

В корне `P:\Kolosov\CRM_Design` откройте PowerShell. Для живых справочников используйте первую команду, для тестовых — вторую, в другом окне.

```powershell
.\order-wizard\serve.cmd
.\order-wizard\serve.cmd --mock
```

Адрес по умолчанию для QORT — [мастер на порту 4179](http://127.0.0.1:4179/static-uikit/pages/document-wizard.html?subject=c-006), для mock — [мастер на порту 4178](http://127.0.0.1:4178/static-uikit/pages/document-wizard.html?subject=c-006). Для другого свободного порта добавьте, например, `--port=4180`. Запуск выводит URL. Для остановки нажмите Ctrl+C в окне сервера.

`serve.cmd` сначала использует путь к `php.exe` из переменной `ORDER_WIZARD_PHP`, затем PHP из `PATH`, затем подготовленную на этом компьютере переносимую сборку в `%LOCALAPPDATA%\CRM-Orders\php-8.4.28-nts-x64`. Для прямого запуска подойдёт `php order-wizard/serve.php` или `php order-wizard/serve.php --mock`. Сервер, справочники и генерация PDF работают без Node.js и npm.

## Среда PHP и подключение

Проверены 64-битные PHP 8.4.28 NTS, PDO_SQLSRV 5.14.0 и Microsoft ODBC Driver 18 for SQL Server на Windows. Потребуются расширения PDO, `pdo_sqlsrv`, `mbstring` и `bcmath`. Расширения для SQL Server и BCMath используются в живом режиме. Разрядность, версия PHP и режим TS/NTS библиотеки драйвера должны соответствовать PHP. [Установка драйвера Microsoft](https://learn.microsoft.com/en-us/sql/connect/php/windows-install), [официальные сборки PHP для Windows](https://windows.php.net/download/).

В `php.ini` укажите абсолютный путь к `ext` и имя установленной DLL. Для используемой переносимой сборки включены `extension=php_pdo_sqlsrv.dll` и `extension=mbstring`. BCMath и PDO входят в эту сборку. Проверить фактический ini и загруженные расширения можно командами `php --ini` и `php -m`.

PHP использует существующий приватный `static-uikit/.env.qort.local`. На новом компьютере его можно создать из `static-uikit/.env.qort.example`. Значения переменных окружения процесса имеют приоритет.

| Параметр | Назначение |
| --- | --- |
| `QORT_SERVER` | Имя SQL Server, `SERVER\INSTANCE` или `SERVER,1433` |
| `QORT_DATABASE` | `BACK_QORT_DB` |
| `QORT_TRUSTED_CONNECTION` | `true`. Используется учётная запись Windows, запустившая PHP |
| `QORT_TRUST_SERVER_CERTIFICATE` | `false` по умолчанию. Сохраняется значение действующего конфига. TLS включён |
| `QORT_QUERY_TIMEOUT_MS` | От 1000 до 60000, по умолчанию 10000. Драйвер принимает целые секунды, используется округление вверх |
| `QORT_PORT` | Порт локального HTTP-мастера QORT, по умолчанию 4179. Аргумент `--port` имеет приоритет |

Для учётной записи процесса достаточно прав SELECT на объекты существующих запросов. Соединение открывается с `ApplicationIntent=ReadOnly`. Четыре исходных SQL-файла хранятся в `static-uikit/tools/qort`. Пользовательские значения передаются в подготовленные PDO-запросы. Предикат класса инструмента выбирается из закрытого списка. Полный текст ошибки драйвера доступен в серверном журнале.

## Публичный каталог

Корень сайта — **только `order-wizard/public`**. В нём находятся точка входа и правило маршрутизации. PHP отдаёт разрешённые страницы и ресурсы интерфейса из `static-uikit`. Справочник обслуживает `GET /api/order-reference/assets` и `GET /api/order-reference/assets/{id}`. Для Windows/IIS назначьте этому корню обработчик PHP FastCGI, установите IIS URL Rewrite и выдайте учётной записи пула доступ на чтение файлов приложения и SELECT в QORT. Для IIS настройте журнал PHP вне публичного каталога и `display_errors=Off`. По умолчанию используется QORT. Значение `ORDER_REFERENCE_MODE=mock` в окружении процесса включает тестовые данные.

Три PDF формируются в браузере существующим механизмом. Интерфейс получает НКД и номинал на дату расчётов, курс ЦБ — на дату сделки. Для расчёта передаётся полная десятичная точность и единица котировки. Действующие ручные правки, проверки и правила печати описаны в [сценариях мастера](../static-uikit/tools/qort/README.md).

## Сверка с предыдущей версией

Для повторной проверки при запущенных PHP-мастерах можно поднять исходный Node.js API в двух дополнительных окнах. Переменная порта ниже относится к процессу сравнения.

```powershell
$env:QORT_PORT = '4182'
node static-uikit/tools/order-reference-server.mjs --live
```

```powershell
node static-uikit/tools/order-reference-server.mjs 4183
```

В отдельной консоли из корня проекта выполните проверки. Скрипт сравнения учитывает статус HTTP, структуру, типы и значения всех полей. Живой регрессионный тест использует независимые контрольные SELECT и проверяет содержимое PDF.

```powershell
php order-wizard/tests/rules.php
python order-wizard/tests/parity.py --node http://127.0.0.1:4182 --php http://127.0.0.1:4179
python order-wizard/tests/parity.py --mock --node http://127.0.0.1:4183 --php http://127.0.0.1:4178
python order-wizard/tests/public_surface.py --url http://127.0.0.1:4179
python static-uikit/tools/qa/run_order_qort_live_tests.py --url http://127.0.0.1:4179 --keep "$env:TEMP\order-pdf-qort"
python static-uikit/tools/qa/run_order_reference_tests.py --url http://127.0.0.1:4178
python static-uikit/tools/qa/run_all_qa.py
```
