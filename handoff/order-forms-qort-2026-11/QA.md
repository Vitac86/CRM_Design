# Проверка трёх поручений и тестового справочника

20 ноября 2026 года. В мастере на локальном HTTP-стенде выбрана бумага, получена карточка по AssetID, введены параметры и скачан сформированный PDF. Использованы тестовые записи. Адрес предпросмотра на порту 4178 дополнительно проверен из браузера на фактически установленной рабочей копии. Сервер вернул AssetID A-100001 для SBER, а торговый PDF для учебной облигации содержал 9 973,40 RUB. Подтверждённые наблюдения и ограничения рабочего подключения перечислены отдельно. [QORT_FINDINGS.md](QORT_FINDINGS.md).

## Результаты

В рабочей папке CRM_Design по её полному сетевому пути прошли 37 из 37 наборов за 502.1 с. Независимый прогон той же версии в локальной копии прошёл 37 из 37 за 479.6 с. При первом запуске через букву диска P Windows потеряла рабочий каталог дочернего процесса. При повторе по UNC все сценарии этого набора, включая печать доверенности, завершились успешно.

| Проверка | Результат |
| --- | --- |
| Регрессия поручений, суммы, выбор площадки, коды INV и банковские записи | 622/622 |
| Локальный HTTP, выбор с клавиатуры, запоздалые ответы, НКД и три скачанных PDF | 59/59 |
| Конструктор шаблонов | 85/85 |
| Вёрстка строк таблиц | 420/420 |
| Сохранение исходного текста в переносимых блоках | 28/28 |
| Статические ресурсы и сборка | 32 страницы, 372 ресурса, 45 секций CSS, ошибок и предупреждений валидатора 0. TypeScript и Vite собраны. |

Vite сообщил о размере основного JS-блока 546,71 кБ и возрасте базы Browserslist. На генерацию статических PDF эти сообщения не повлияли.

## Сквозные проверки

- **Выбор бумаги.** От двух символов клиент обращается к HTTP-справочнику после 300 мс. Проверены точный ISIN, код, краткое имя, порядок результатов, дедупликация секций, лимит 20, пагинация, отмена и защита от запоздалого результата. Сбой запроса допускает повтор. Пустая выдача имеет своё состояние. Полный тестовый каталог в страницу HTTP-режима не загружен.
- **Срок расчётов.** T+0, T+1 и T+2 печатаются как код. Явная дата печатается один раз. При возврате между режимами календарь восстанавливает ввод, исходящий payload содержит только активное значение. Недопустимая дата и дата до заявки отклонены.
- **НКД и сумма.** В датированной фикстуре сумма 9 973,40 RUB. Проверены нулевое значение, пропуск, конфликт секций, будущая дата, другая валюта, неизвестная единица и устаревший номинал. Ручной НКД 13,01 RUB даёт предварительный итог 9 980,10 RUB. После подтверждения ручного итога 9 950,20 именно он найден в ячейке PDF. Смена даты сохраняет ввод и снимает подтверждение. Смена бумаги очищает цену, НКД и итог.
- **Печать и геометрия.** В торговом PDF на первой странице обнаружены 23.11.2026, 98,5 %, 12,34, RUB и 9 973,40 в назначенных ячейках. Неактивные ветви пусты. На второй странице торгового поручения обнаружены оба векторных штриха уведомления о возможной непокрытой позиции. PDF перевода содержит 122 054 562 115,15 и код INV-1011. PDF вывода содержит 13 316,44, тот же код и счёт выбранного комплекта банковских реквизитов.
- **Интерфейс.** Расчётная сумма выводится элементом output. Для select проверены высота 44 px, клавиатура и доступность клика под шевроном. Измерены ширины 1280 и 420 px.

## Скачанные PDF

| Документ | Страниц | SHA-256 |
| --- | ---: | --- |
| [Поручение на сделку](poruchenie-na-sdelku.pdf) | 2 | `28f2137ebcab22f429247aed0008e5ae4246b9628e5eeeb1869b7ecb60a1af12` |
| [Перевод между площадками](poruchenie-perevod-ploshchadki.pdf) | 1 | `9f5bb4d7ff3bf5448995ce476d73729aa666373fe0f6af95025ef9e17d5a4b2c` |
| [Вывод на банковский счёт](poruchenie-vyvod-na-bank.pdf) | 1 | `3b15d44057d0794ad836ecf9d508e3341381690df03110caa88981d7cc7f9a7b` |

## Снимки интерфейса

- [Срок расчётов и мобильный календарь](screenshots/settlement-mobile.png)
- [Расчётный НКД и сумма на рабочем экране](screenshots/trade-reference-desktop.png)
- [Тот же блок на телефоне](screenshots/trade-reference-mobile.png)
- [Ручной НКД, отклонение суммы и подтверждения](screenshots/trade-manual-desktop.png)

## Изменённые файлы

22 файла реализации, тестов и документации перечислены ниже. Комплект приёмки добавляет этот протокол, QORT_FINDINGS.md, три PDF и четыре изображения по ссылкам выше.

| Файл проекта | Назначение |
| --- | --- |
| [docs/order-forms-mapping-gap.md](../../docs/order-forms-mapping-gap.md) | Действующие ключи и измеренные области печати. |
| [package.json](../../package.json) | Команда локального HTTP-стенда. |
| [static-uikit/README.md](../../static-uikit/README.md) | Запуск статического и HTTP-режимов. |
| [static-uikit/assets/css/crm-static.bundle.css](../../static-uikit/assets/css/crm-static.bundle.css) | Собранный CSS страницы. |
| [static-uikit/assets/css/pages/document-wizard.css](../../static-uikit/assets/css/pages/document-wizard.css) | Шевроны, календарь, сводка и подтверждения. |
| [static-uikit/assets/js/document-engine/pdf-overlay-renderer.js](../../static-uikit/assets/js/document-engine/pdf-overlay-renderer.js) | Получение выбранной карточки до предварительной проверки и печати. |
| [static-uikit/assets/js/document-field-maps/order-trade.js](../../static-uikit/assets/js/document-field-maps/order-trade.js) | Области срока расчётов и НКД на исходной странице 122. |
| [static-uikit/assets/js/document-wizard/instrument-catalog.js](../../static-uikit/assets/js/document-wizard/instrument-catalog.js) | Контракт поиска, пагинация, кеш и загрузка выбранной карточки. |
| [static-uikit/assets/js/document-wizard/instrument-securities-demo.js](../../static-uikit/assets/js/document-wizard/instrument-securities-demo.js) | Существующие восемь бумаг и явно датированные тестовые наблюдения. |
| [static-uikit/assets/js/document-wizard/order-controls.js](../../static-uikit/assets/js/document-wizard/order-controls.js) | Состояние выбранного актива, даты, ручного НКД, суммы и подтверждений. |
| [static-uikit/assets/js/document-wizard/order-forms-model.js](../../static-uikit/assets/js/document-wizard/order-forms-model.js) | Нормализация срока расчётов, выбор допустимого НКД, расчёт и печатное значение. |
| [static-uikit/assets/js/pages/document-wizard.js](../../static-uikit/assets/js/pages/document-wizard.js) | Поля формы, доступный поиск, обработка ошибок и календарь. |
| [static-uikit/pages/document-wizard.html](../../static-uikit/pages/document-wizard.html) | Подключение офлайн-фикстур в обычной статической форме. |
| [static-uikit/tools/document-map-audit.html](../../static-uikit/tools/document-map-audit.html) | Подключение тех же записей для аудита. |
| [static-uikit/tools/document-template-builder.html](../../static-uikit/tools/document-template-builder.html) | Подключение тех же записей для конструктора. |
| [static-uikit/tools/order-reference-server.mjs](../../static-uikit/tools/order-reference-server.mjs) | Автономный тестовый HTTP-адаптер на Node.js. |
| [static-uikit/tools/qa/document-full-template-audit.json](../../static-uikit/tools/qa/document-full-template-audit.json) | Обновлённые измерения полей. |
| [static-uikit/tools/qa/document-identifier-manifest.json](../../static-uikit/tools/qa/document-identifier-manifest.json) | Производный реестр актуальной карты. |
| [static-uikit/tools/qa/order_rules_cases.js](../../static-uikit/tools/qa/order_rules_cases.js) | Проверки дат, единиц, источников, нуля и серверного лимита. |
| [static-uikit/tools/qa/run_all_qa.py](../../static-uikit/tools/qa/run_all_qa.py) | Регистрация нового набора в общем QA. |
| [static-uikit/tools/qa/run_order_forms_tests.py](../../static-uikit/tools/qa/run_order_forms_tests.py) | Асинхронный выбор бумаги в существующих браузерных сценариях. |
| [static-uikit/tools/qa/run_order_reference_tests.py](../../static-uikit/tools/qa/run_order_reference_tests.py) | Проверка API, браузера, областей PDF и воспроизводимые снимки. |

## Воспроизведение

Из корня CRM_Design в окружении с Node.js, Python и установленными зависимостями проекта. Тест HTTP сам запускает и останавливает стенд на свободном порту. Для ручной работы запустите `npm run static:uikit:orders`.

```powershell
python static-uikit/tools/qa/run_order_reference_tests.py --keep "$env:TEMP/orders-reference-qa"
python static-uikit/tools/qa/run_order_forms_tests.py
python static-uikit/tools/qa/run_all_qa.py
npm.cmd run static:uikit:bundle:check
npm.cmd run static:uikit:validate
npm.cmd run build
```
