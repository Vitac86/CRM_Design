# Отчёт о проверке Приложения 7

**20 ноября 2026 года.** В рабочей папке `P:\Kolosov\CRM_Design` пройдены 607 из 607 целевых проверок и 36 из 36 наборов общего QA. Выпуск трёх документов проверен через браузерный Document Wizard с извлечением текста из фактически скачанных PDF. Для каждого из десяти торговых сценариев проверено наличие векторной отметки о возможной непокрытой позиции на второй странице. Дополнительно проверены восемь комбинаций типа клиента и заполнения уровня риска при входной отметке «нет».

## Версия и воспроизводимость

Ветка `main`. Исходный коммит — `497acd06b78765b5dcc0126003e895f459f6b814`. Команда `git ls-remote origin refs/heads/main` вернула тот же SHA. В начале в рабочем дереве находились неотслеживаемые `.vscode/settings.json` и `for comparison with main`. Уже актуальный коммит экспортирован через `git archive` в отдельную рабочую копию. При переносе каждый существующий файл сверен с базовой версией. Контрольные суммы обоих пользовательских файлов и существующего корневого `maps.json` сохранились. Состав изменения и контрольные суммы указаны в ведомости файлов.

Полный контрольный прогон из рабочей папки на диске P занял 459.7 с. Установленный экстрактор повторно обработал полный официальный регламент. Все три извлечённых файла побайтно совпали с установленными шаблонами. Сверены извлечённый текст, декодированные потоки команд страницы, размер, поворот и растровая копия в 160 dpi для каждого из четырёх листов. [Редакция, исходные страницы и хеши](SOURCE_AUDIT.md).

Среда проверки — Windows, Python 3.14.6, PyMuPDF 1.28.0, pypdf 6.14.2, headless Chromium, Node.js 24.19.0, npm 11.17.0. Зависимости npm установлены по lock-файлу в изолированной копии. Команды сборки TypeScript и Vite завершились успешно. Vite сообщил о JS-файле размером 546,71 кБ и возрасте базы Browserslist. Команда `test` в scripts пакета отсутствует.

## Проверенные сценарии

| Область | Наблюдаемый результат |
| --- | --- |
| Выбор и реквизиты клиента | Три карточки, три имени загрузки, 2/1/1 страницы. ФЛ и ЮЛ получили свой INV-код и договор из карточки. Подмена read-only значения и отсутствие кода проверены отдельно. |
| Сделка | Проверены акция, облигация, валюта и масштабы 1/100, опцион, фьючерс и внебиржевая сделка с ценными бумагами. Премия, страйк, экспирация и НКД проверены независимо. Тесты охватывают неизвестный номинал и множитель, дату НКД, шаг цены и объёма, последний этап округления, большие значения и точный результат 0,1 × 0,2. |
| Ручная сумма сделки | Проверены отклонение от расчёта, основание, явное подтверждение и его сброс при изменении входных параметров. Для рыночной заявки с неизвестной ценой проверена пустая сумма. При переключении инструмента проверено удаление значений предыдущей ветки. |
| Межплощадочный перевод | Проверены одинаковые площадки через UI и непосредственно через данные генератора, смена источника, разрешённые разные направления, ноль, отрицательные, бесконечные, экспоненциальные и избыточно точные суммы. |
| Пропись и свободный остаток | Суммы для RUB, USD, EUR, CNY проверены с учётом склонения и минорных единиц. Ручной текст переживает возврат и повторную печать. После изменения числа или валюты требуется повторное подтверждение. Проверены отказы для разметки и слишком длинного текста. В режиме свободного остатка числовая сумма и пропись пусты. |
| Банковская запись | Выбор по ID проверен на двух RUB-записях одного клиента. Проверены смена валюты, ноль подходящих записей, чужая и архивная запись, недоступность вывода, подмена ID и полнота маршрута. Все строки печатаются из выбранной записи, отдельный лицевой счёт имеет собственный источник. |
| Геометрия | Для типового и предельного примеров просмотрены все страницы. Проверены код, договор, статический юридический текст, отметки, расположение длинной прописи и зона подписей. Динамическая кириллица встроена в PDF. Контроль минимального кегля — 9 pt. Переполнение разрешённой области останавливает выпуск. [Координаты полей и ручных зон](FIELD_MAPPING.md). |

Инвентаризация охватывает 24 шаблона, 77 страниц, 20 исполняемых карт, 659 полей (643 базовых и 16 добавленных) и 4 018 строк исходного текста. В трёх новых картах 48, 32 и 36 полей соответственно.

Общая матрица включает 260 сочетаний документов и клиентских профилей. Создано 214 PDF. Для 19 сочетаний тип клиента неприменим, для 2 не выбрана нужная разновидность. В 25 случаях размеры исходных полей ограничили печать. Неожиданных отказов — 0.

## Примеры из проверки мастера

На действующем сервере localhost:8080 дополнительно пройдены 607 из 607 проверок мастера. Мастер сформировал вывод 13 316,44 ₽ со словами «Тринадцать тысяч триста шестнадцать рублей 44 копейки» на одной строке. Для 13 312 456,44 ₽ она занимает две смежные строки. В переводе 122 115,15 ₽ слова помещаются на одну строку, а у 122 054 562 115,15 ₽ число печатается целиком и пропись переносится на две строки. Отдельно проверена сумма 888 888 888 888 888,99 USD с добавочной строкой и полным комплектом реквизитов на одном листе. [Вывод 13 316,44 ₽](screenshots/withdrawal-typical-1.png) · [Перевод 122 054 562 115,15 ₽](screenshots/transfer-boundary-1.png).

Для всех трёх поручений тест сравнил дату в календаре браузера с тремя частями даты в PDF. В торговом поручении проверены валюта цены USD, обратный переход к RUB, ввод с точкой и с запятой, ручная сумма после возврата и изменения количества. Для 199 999 999 996 × 659,22 расчёт составил 131 843 999 997 363,12 RUB, ручная поправка на одну копейку напечаталась точно. Оба селектора площадок разрешают выбрать занятое значение и очищают другую сторону.

## Наборы общего QA

| Набор | Результат |
| --- | --- |
| UMI registry | PASS · UMI registry gate: 565/565 checks passed |
| UMI registry gates | PASS · UMI registry self-test: PASS · 6/6 registry negative gates + 6/6 depository negative gates + 2 false-positive guards |
| text layout | PASS · text-layout specs: 46/46 passed |
| Word flow | PASS · Word-flow renderer: 46/46 checks passed |
| page expansion | PASS · Page expansion: 76/76 checks passed |
| table-cell expansion | PASS · Table-cell expansion: 420/420 checks passed |
| accession market/tariff geometry | PASS · Accession market/tariff geometry: 663/663 checks passed |
| accession market/tariff geometry gates | PASS · Mutation gate: deliberately moving the separator through «Универсальный» is rejected |
| questionnaire table ownership | PASS · Questionnaire table ownership: 140/140 checks passed |
| passport issuing authority | PASS · Passport issuing authority: 629/629 checks passed |
| passport issuing authority gates | PASS · Passport authority self-test: 8/8 checks passed |
| legal-entity full name row | PASS · Legal-entity full name row: 261/261 checks passed |
| legal-entity full name row gates | PASS · Legal-name row self-test: 17/17 checks passed |
| visual geometry and cross-page flow | PASS · Visual geometry: 1286/1286 checks passed |
| visual reading flow | PASS · Visual reading flow: 896/896 checks passed |
| qualification notice layout | PASS · Qualification notice layout: 165/165 checks passed |
| transfer-basis paragraph | PASS · Transfer-basis paragraph: 124/124 checks passed |
| transfer-basis paragraph gates | PASS · Transfer-basis paragraph self-test: 5/5 checks passed |
| reviewed operator ranges | PASS · Reviewed operator ranges: 21/21 checks passed |
| preflight/render agreement | PASS · Preflight/render agreement: 356/356 checks passed |
| Document Wizard | PASS · Document Wizard: 57/57 checks passed |
| order forms | PASS · Order forms: 607/607 checks passed |
| Template Builder | PASS · Template Builder QA: 85/85 passed |
| identifier manifest | PASS · Identifier manifest: PASS · required 20 maps / 659 fields · current 20 maps / 659 fields |
| Word-flow static equivalence | PASS · Word-flow static equivalence: 28/28 blocks passed |
| expansion anchors | PASS · 0 anchor(s) need a different insertion point |
| structural PDF | PASS · Structural PDF: 1944/1944 checks passed |
| full template audit | PASS · 24 PDF, 77 страниц, 659 полей. Все 14 сценариев отказа пройдены. |
| production completeness | PASS · Production completeness: 235/235 checks passed |
| production completeness gates | PASS · Production completeness self-test: PASS · 6/6 negative gates (unbound date, unbound label, mixed group sizes, sub-floor group member, undeclared sample, map on a non-generated template) |
| document regression | PASS · 20 карт × 13 клиентских профилей |
| regression denominator | PASS · 260 сочетаний, 0 неожиданных отказов |
| accession row capacity | PASS · Accession row capacity: 13/13 checks passed |
| accession blocks | PASS · Manual-review blocks: 47/47 checks passed (2 accession forms: transcript, source date, internal page; plus the replaced account-opening notice) |
| accession blocks gates | PASS · Accession blocks self-test: PASS · 6/6 negative gates (transcript split below the signature line, date drawn at the generic client size, day/month/year set in different sizes, client data bound into the employee row, internal cell crossing a vertical rule, transcript silently shortened to the surname) |
| ordinary requested/rendered equality | PASS · release-blocking fields covered  : 10/10 |

## Команды воспроизведения

Базовые команды из корня рабочей копии. Вывод общего прогона можно сохранить в JSON параметром `--json`.

```powershell
git status --short --branch
git rev-parse HEAD
git ls-remote origin refs/heads/main
python static-uikit/tools/qa/dump_field_maps.py --out static-uikit/tools/qa/maps.json
python static-uikit/tools/qa/run_order_forms_tests.py
python static-uikit/tools/qa/run_all_qa.py
git diff --check
git apply --reverse --check --whitespace=nowarn -- handoff/order-forms-2026-11/CHANGES.diff
```

Сборка и статические проверки. Валидация проверила 32 HTML-страницы, 45 разделов CSS и 371 ссылку на локальные ресурсы. Ошибок и предупреждений этой проверки — 0.

```powershell
npm.cmd ci --no-audit --no-fund
npm.cmd run build
npm.cmd run static:uikit:bundle:check
npm.cmd run static:uikit:validate
```

Получение производных материалов. Для повторения укажите путь к полному регламенту, скачанному по ссылке из аудита источника. Команда с `--keep` сохраняет двенадцать примеров, включая суммы с предоставленных скриншотов. Аудитные JSON пересобирались с явным разрешением смены SHA ровно трёх новых PDF.

```powershell
python static-uikit/tools/qa/extract_order_forms.py regulation.pdf --out "$env:TEMP\appendix7-templates"
python static-uikit/tools/qa/run_order_forms_tests.py --keep "$env:TEMP\appendix7-samples"
python static-uikit/tools/qa/check_identifier_manifest.py --write
python static-uikit/tools/qa/check_full_template_audit.py --write --replace-source-pdf order-trade.pdf --replace-source-pdf order-venue-transfer.pdf --replace-source-pdf order-bank-withdrawal.pdf
```

## Контрольные суммы сборки и примеров

SHA-256 манифеста 29 файлов Vite dist — `618767c163338f0f8e3b72a9c37e771a2e41ee8a94ae16239c40b16bafc14f2d`. SHA-256 манифеста изменённых и добавленных файлов static-uikit/assets — `dffdf49f9e82e5fe8e0591140d368b5a923301c20c7e38bb5a6cadcc503ac051`. Хеши содержимого рассчитаны по байтам проверенной рабочей копии Windows. В обоих случаях сортировка по относительному пути, разделитель каталогов /, строка манифеста состоит из SHA-256 содержимого, двух пробелов, пути и символа LF в кодировке UTF-8.

| Заполненный образец с демоданными | Страниц | Байт | SHA-256 |
| --- | ---: | ---: | --- |
| [poruchenie-na-sdelku.pdf](poruchenie-na-sdelku.pdf) | 2 | 557734 | `cc2f7894d4da079a90c383cd2ed92cf677d9cde6cb63b758e9ca57082eef4216` |
| [poruchenie-perevod-ploshchadki.pdf](poruchenie-perevod-ploshchadki.pdf) | 1 | 605636 | `954bc5c66d38f1c9e8fd0acf868056d2aae206b18bbf9d28f3e32b0f447e79f0` |
| [poruchenie-vyvod-na-bank.pdf](poruchenie-vyvod-na-bank.pdf) | 1 | 577850 | `8dad476e7364f2de1df078c4f8ead44711518d7b968906a3b2fcd3395cbdcbd5` |

Изображения типовых и предельных примеров повторно сверены с соответствующими PDF по пикселям. Комплект включает четыре страницы источника, четыре листа с границами полей и восемь заполненных страниц. [16 изображений для визуальной проверки](screenshots/).

## Отклонения, обнаруженные при проверке

Перед публикацией тест табличной вёрстки ожидал 17 абзацев с расширением. После добавления перевода и вывода проверяется 19, в том числе оба точных ID новых абзацев. Промежуточные прогоны также выявили устаревшие ожидания количества карт в конструкторе, несогласованный порядок в производном реестре UMI и нехватку места для полного названия ЮЛ. После перевода отметки о непокрытой позиции в обязательные конструктор требовал привязки к полю ввода. Теперь источником служит выбранный торговый шаблон, все 20 карт открываются. Эти случаи исправлены и повторно проверены. Проверка контрольных сумм также обнаружила замену PDF после начала прогона. Заключительный прогон выполнен с зафиксированными SHA и включает исправления мастера и вёрстки денежных поручений. Для исходных денежных форм сохранены PDF-теги ActualText и группы прозрачности.

Валидатор CSS сравнивает содержимое после нормализации окончаний строк Windows. Проверены и исходные секции, и итоговый bundle. Интеграционные вопросы для рабочего подключения касаются боевых спецификаций инструментов, маршрутов банка и отдельного лицевого счёта. [Принятые решения и вопросы к владельцам данных](DECISIONS.md).

Набор изменений включает исполняемые файлы, тесты, карты, документы и просмотренные примеры. [Список файлов и текстовый diff](CHANGED_FILES.md).
