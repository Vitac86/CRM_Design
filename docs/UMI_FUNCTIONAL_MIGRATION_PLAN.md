# UMI Functional Migration Plan

## 1. Цель переноса

- React/Vite версия (`src/`) — функциональный и UX-эталон CRM: структура страниц, пользовательские сценарии, состояния, фильтрация, таблицы, формы, переходы.
- `static-uikit/` — целевая HTML5 + UIkit поставка для интеграции в UMI.CMS (без React, без SPA-механик).
- В UMI переносится **не React-код**, а:
  - структура экранов;
  - единая визуальная система;
  - шаблоны layout/content;
  - контракты данных;
  - действия и их пост-обработка;
  - легкое JS-поведение для UI.
- Прямое встраивание React-компонентов из `src/` в UMI не предполагается.

## 2. Общая архитектура переноса

### 2.1 UMI layout template (общий каркас)

Единый layout-шаблон для всех внутренних страниц CRM:

- `sidebar` (группы навигации, активный пункт, мобильный toggle);
- `topbar` (пользователь, быстрые действия, глобальный поиск);
- `main content wrapper` (контейнер страницы, bread/title/actions);
- `user block` (ФИО/роль/выход);
- `global search` (минимум: поле + submit; опционально autocomplete).

### 2.2 UMI content templates (контентные шаблоны)

Набор типовых шаблонов/partial-комбинаций:

- list pages (табличные реестры);
- detail cards;
- forms;
- wizards (пошаговые формы);
- split-view (список + детали);
- data tables;
- filter panels/toolbars.

### 2.3 Static assets

Подключать локально (без CDN):

- `static-uikit/assets/css/uikit.min.css`
- `static-uikit/assets/css/crm-static.css`
- `static-uikit/assets/js/uikit.min.js`
- `static-uikit/assets/js/uikit-icons.min.js`
- `static-uikit/assets/js/crm-static.js`
- `static-uikit/assets/fonts/**`
- `static-uikit/assets/brand/**`

### 2.4 Data layer

- Источник данных: UMI + БД (и/или внутренний API слой).
- Demo-данные/заглушки из static-uikit и mock-потока React-версии заменить на:
  - UMI variables/macros;
  - серверные циклы рендера таблиц;
  - реальные формы submit/update.
- Контракты данных фиксировать на уровне сущностей (см. раздел 6).

## 3. Общие UI partials / components для UMI

> Ниже блоки, которые нужно вынести в переиспользуемые UMI-шаблоны.

### 3.1 sidebar
- Где: все страницы CRM.
- Параметры: `activeRoute`, `menuGroups[]`, `collapsed`, `userRole`.
- Настраиваемое: видимость пунктов по ролям, aliases для active-state.

### 3.2 topbar
- Где: все страницы CRM.
- Параметры: `pageTitle`, `searchQuery`, `user`, `notificationsCount`.
- Настраиваемое: действия справа, слот для page-actions.

### 3.3 page header
- Где: list/detail/form pages.
- Параметры: `title`, `subtitle`, `breadcrumbs[]`.
- Настраиваемое: primary/secondary кнопки.

### 3.4 page actions
- Где: Subjects, Requests, Compliance, Trading, отчёты.
- Параметры: массив action-кнопок (`label`, `intent`, `href|onSubmit`, `permission`).
- Настраиваемое: disabled state, confirm modal.

### 3.5 filter panel / toolbar
- Где: все табличные страницы.
- Параметры: `search`, `filters[]`, `sort`, `pageSize`, `resetUrl`.
- Настраиваемое: GET/AJAX режим, фиксированные/динамические options.

### 3.6 table wrapper
- Где: Subjects, Requests, Compliance, Middle-office, Trading, Archive.
- Параметры: `columns[]`, `rows[]`, `sort`, `pagination`, `emptyState`.
- Настраиваемое: row-click, sticky header, responsive overflow.

### 3.7 status badge
- Где: таблицы, карточки, decision panels.
- Параметры: `statusCode`, `label`, `tone`.
- Настраиваемое: mapping кодов статусов на цвет/иконку.

### 3.8 card
- Где: dashboard KPI, detail sections, admin widgets.
- Параметры: `title`, `body`, `meta`, `actions`.
- Настраиваемое: размеры, акцентная рамка, плотность.

### 3.9 detail header
- Где: subject-card, compliance-card, trading-card.
- Параметры: `entityName`, `code`, `badges[]`, `meta[]`.
- Настраиваемое: кнопки справа (edit/archive/approve).

### 3.10 tabs
- Где: subject-card, trading-card.
- Параметры: `tabs[]`, `activeTab`, `tabUrl`.
- Настраиваемое: server-driven табы или hash/query.

### 3.11 split view
- Где: depository, middle-office-reports.
- Параметры: `list`, `selectedId`, `detail`.
- Настраиваемое: ширины колонок, mobile fallback (stack).

### 3.12 form grid
- Где: register, contract wizard, requests create.
- Параметры: `fields[]`, `validation`, `readonly`.
- Настраиваемое: 1/2/3 колонки, обязательность.

### 3.13 action row
- Где: низ форм/мастеров/decision панелей.
- Параметры: `primary`, `secondary`, `tertiary`.
- Настраиваемое: состояния pending/success/error.

### 3.14 empty state
- Где: пустые таблицы/списки.
- Параметры: `title`, `description`, `action`.
- Настраиваемое: контекстный CTA (вернуться/создать/сбросить).

### 3.15 error state
- Где: любые страницы с загрузкой/submit.
- Параметры: `title`, `message`, `retryAction`.
- Настраиваемое: технический код ошибки для логов.

## 4. Карта страниц

| Страница | Static page file | Suggested UMI route | Назначение | Основные данные | Фильтры | Таблицы/карточки | Действия | Переходы | Нужный JS | Demo/placeholder | Приоритет |
|---|---|---|---|---|---|---|---|---|---|---|---|
| dashboard | `static-uikit/pages/dashboard.html` | `/dashboard` | Операционный обзор | KPI, последние изменения субъектов, последние поручения | Нет/минимум | KPI cards, 2 таблицы | Переход к «Все поручения» | `/requests` | базовые таблицы, ссылки | mock KPI/rows | P0 |
| subjects | `static-uikit/pages/subjects.html` | `/subjects` | Реестр субъектов | список субъектов, статусы, менеджер | поиск, тип, резидентство, статус, комплаенс, роль | главная таблица | добавить, экспорт, reset filters | `/subjects/{id}`, `/subjects/register` | row click, sortable cols, pagination | часть значений/статусов демонстрационная | P0 |
| subject-card | `static-uikit/pages/subject-card.html` | `/subjects/{id}` | Карточка субъекта | профиль, реквизиты, документы, связи, договоры, история | внутри вкладок | detail header + tabs + таблицы | архивировать, редактировать, оформить договор | `/subjects/{id}/contract-wizard` | tabs, form validation, modal | часть вкладок/операций как mock | P0 |
| subject-register | `static-uikit/pages/subject-register.html` | `/subjects/register` | Регистрация субъекта (wizard) | данные ФЛ/ЮЛ, представитель, реквизиты | по шагам | wizard формы | сохранить черновик, продолжить, завершить | в subject-card результата | stepper, validation, conditional fields | INN/LK сценарий в demo-режиме | P0 |
| contract-wizard | `static-uikit/pages/contract-wizard.html` | `/subjects/{id}/contract-wizard` | Оформление договора | конфиг договора, тариф, отчётность | по секциям | form sections | сохранить настройки, экспорт заявления, оформить договор | назад в subject-card | checkboxes/selects/save toast | экспорт/часть флоу демо | P1 |
| brokerage | `static-uikit/pages/brokerage.html` | `/brokerage` | Реестр брокерских договоров | договор, клиент, менеджер, статус | поиск, статус | таблица договоров | экспорт | в subject-card/contract-wizard | сортировка, links | mock список | P1 |
| trust-management | `static-uikit/pages/trust-management.html` | `/trust-management` | ДУ-договоры | договор, стратегия, статус | поиск, статус | таблица | просмотр | (опц.) в subject-card | базовая фильтрация | mock список | P2 |
| agents | `static-uikit/pages/agents.html` | `/agents` | Агентские связи | агент, договор, комиссия, контакты | поиск | таблица + modal форма | добавить/обновить агента | в карточку субъекта | modal, validation | операции пока in-memory | P2 |
| requests | `static-uikit/pages/requests.html` | `/requests` | Реестр поручений + создание | поручения, клиент, договор, сумма, источник, статус | поиск, код клиента, дата, источник, статус | таблица + create form | создать, сохранить, печать, экспорт | из dashboard и обратно | modal/form logic, date, pagination | печать/часть полей demo | P0 |
| compliance | `static-uikit/pages/compliance.html` | `/compliance` | Очередь комплаенса | клиенты, KYC/AML статус, полнота документов | тип, резидентство, статус комплаенса | таблица | экспорт, открыть карточку | `/compliance/{id}` | row click, filters | mock данные статусов | P0 |
| compliance-card | `static-uikit/pages/compliance-card.html` | `/compliance/{id}` | Карточка проверки | клиент, кейс, документы, связи, решение | нет/локально | detail sections + decision panel | одобрить/доработка/блокировать, финальное решение | назад в список | tabs/sections, comment validation | часть сигналов риска демонстрационная | P0 |
| middle-office-clients | `static-uikit/pages/middle-office-clients.html` | `/middle-office/clients` | Журнал клиентов МО | клиенты + договоры + счета | поиск, тип клиента, вид договора, статус счёта | таблица журнала | экспорт, reset | в subject-card | sortable cols, row click | mock объединение данных | P1 |
| middle-office-reports | `static-uikit/pages/middle-office-reports.html` | `/middle-office/reports` | Отправленные отчёты МО | отчёты, канал, статус доставки | поиск, статус, канал | split view list/details | скачать, отправить повторно, экспорт | детализация в правой панели | split-view selection | resend/download заглушки | P1 |
| depository | `static-uikit/pages/depository.html` | `/depository` | Отчёты депозитария | отчёт, тип, канал, результат | поиск, код клиента, период, тип, канал, результат | split/list + detail | скачать, повторная отправка | выбор в detail | split-view, date filters | delivery override demo | P1 |
| back-office | `static-uikit/pages/back-office.html` | `/back-office` | Отчёты бэк-офиса | список отчётов | поиск, тип, статус, период (по шаблону) | таблица/лист | скачать, resend, экспорт | detail/report open | фильтры и split/table js | шаблонный mock | P1 |
| trading | `static-uikit/pages/trading.html` | `/trading` | Реестр trading-клиентов | trading profile + клиентские поля | поиск, квалификация, ПОД/ФТ | таблица | экспорт, reset | `/trading/{id}` | row click, sort, pagination | mock профили | P0 |
| trading-card | `static-uikit/pages/trading-card.html` | `/trading/{id}` | Детали трейдинга | параметры, ПОД/ФТ, распоряжения, терминалы | локальные табы | tab cards + terminals list | выдать терминал, обновить пароль | обратно в trading | tabs, confirm modal, toast | выдача терминала/пароль заглушки | P1 |
| administration | `static-uikit/pages/administration.html` | `/administration` | Админ-разделы | пользователи/роли/справочники/аудит (карточки-секции) | по подпроектам | cards | переход в подпункты | внутрь admin модулей | базовый JS | сейчас только summary cards | P2 |
| archive | `static-uikit/pages/archive.html` | `/archives` | Архивные записи | архив субъектов | поиск, тип | таблица | восстановить, просмотр | в `/subjects/{id}` | row/action JS | восстановление mock | P1 |
| error | `static-uikit/pages/error.html` | `/error` (и error-template роутера) | Ошибки приложения | код/сообщение | нет | empty/error card | возврат на dashboard | `/dashboard` | кнопка back/navigation | зависит от backend errors | P0 |

## 5. Детальная функциональная матрица страниц

### Dashboard
- Данные:
  - KPI (метрики, тренды, delta);
  - последние изменения по субъектам;
  - последние поручения (top N, сортировка по дате/времени).
- UI:
  - 4 KPI-карточки;
  - таблица изменений;
  - таблица поручений с колонками номер/статус/дата.
- Действия:
  - ссылка «Все поручения».
- Backend needs:
  - `GET /dashboard/metrics`
  - `GET /dashboard/subject-changes`
  - `GET /requests?sort=date_desc&limit=N`

### Subjects
- Данные:
  - список субъектов (active, non-archived);
  - код, наименование, ИНН, тип, резидентство, subject/compliance статусы, fullDocumentSet, manager.
- Фильтры/сортировка:
  - поиск, тип, резидентство, статус субъекта, статус комплаенса, квалификация, роль;
  - сортировка по ключевым колонкам;
  - пагинация + page size.
- Действия:
  - `+ Добавить`;
  - экспорт CSV;
  - reset filters;
  - row click в карточку.

### Subject card
- Header:
  - имя/код/ИНН/типы/бейджи статусов.
- Tabs:
  - профиль;
  - банковские реквизиты/счета;
  - документы;
  - связи;
  - договоры/счета;
  - история изменений.
- Действия:
  - в архив;
  - редактировать профиль;
  - оформить договор;
  - отправка на комплаенс (при отдельных статусах).
- Требования:
  - поддержка read/edit режимов;
  - валидация обязательных полей;
  - фиксируемый audit trail по изменениям.

### Subject register
- Мастер регистрации:
  - шаг выбора типа субъекта;
  - шаг выбора метода регистрации;
  - шаг формы ФЛ/ЮЛ;
  - шаг результата.
- Поля:
  - базовые идентификаторы, контакты, адреса, реквизиты, представитель.
- Валидация:
  - обязательные поля по типу субъекта;
  - проверка формата телефона/ИНН/email.
- Действия:
  - сохранить черновик;
  - продолжить незавершенную регистрацию;
  - финальное создание субъекта.
- Future:
  - загрузка из ЛК/по ИНН как отдельный backend-сценарий (не hardcode demo).

### Requests
- Функционал:
  - создание поручения (вывод/перевод ДС);
  - выбор клиента/договора;
  - источник поручения;
  - сумма/валюта;
  - реквизиты банка (из клиента или вручную).
- Список:
  - таблица поручений + статусы;
  - фильтры: поиск, код клиента, дата, источник, статус;
  - пагинация.
- Действия:
  - создать/сохранить;
  - печать;
  - экспорт CSV.

### Compliance
- Список клиентов на комплаенсе:
  - код/клиент/ИНН/тип/резидентство/статус/полнота документов.
- Фильтры:
  - тип;
  - резидентство;
  - KYC/AML статус.
- Переход:
  - row click в карточку комплаенса.

### Compliance card
- Данные клиента:
  - профиль клиента;
  - compliance case;
  - документы и проблемные документы;
  - связанные лица.
- Decision panel:
  - решение: одобрить / на доработку / заблокировать;
  - комментарий (обязателен для «на доработку» и «заблокировать»).
- Действия:
  - принять финальное решение;
  - записать дату/офицера/комментарий;
  - аудитировать событие решения.

### Middle-office clients
- Журнал клиентов:
  - свод из клиентов + договоров + счетов.
- Фильтры:
  - поиск;
  - тип клиента;
  - вид договора;
  - статус счета.
- Действия:
  - сортировка;
  - экспорт;
  - переход в карточку субъекта.
- Отдельно:
  - отображение прав ДС/ЦБ через поля профиля/договора.

### Middle-office reports
- Функции:
  - список отправленных отчётов;
  - split-view: список + детали;
  - статусы доставки.
- Действия:
  - скачать;
  - отправить повторно;
  - экспорт выборки.

### Depository
- Функции:
  - отчеты депозитария;
  - split-view;
  - фильтры по периоду/каналу/типу/результату.
- Действия:
  - открыть детали;
  - скачать файл;
  - повторная отправка;
  - фиксация статуса доставки.

### Back-office
- Функции:
  - реестр отчётов бэк-офиса;
  - фильтрация и просмотр;
  - статусы доставки.
- Действия:
  - скачать;
  - повторная отправка;
  - экспорт.

### Trading
- Реестр торговых клиентов:
  - клиент, код, инвестор-статус, риск, договор, распорядитель, полномочия, статус.
- Фильтры:
  - поиск;
  - квалификация;
  - ПОД/ФТ.
- Действия:
  - сортировка;
  - пагинация;
  - экспорт;
  - переход в trading-card.

### Trading card
- Параметры:
  - квалификация/риск;
  - AML/заморозки;
  - контактные данные;
  - распоряжения и методы подачи поручений.
- Терминалы и подключения:
  - список терминалов;
  - статусы подключений;
  - выдать терминал;
  - обновить пароль (в т.ч. confirm modal).

### Administration
- Функциональные зоны:
  - пользователи;
  - роли;
  - справочники;
  - журнал действий;
  - права доступа.
- Текущее состояние:
  - экран-сводка секций.
- План:
  - развести на подмаршруты и CRUD-экраны.

### Archive
- Данные:
  - архивные сущности (минимум субъекты).
- Функции:
  - поиск и фильтры;
  - восстановление записи;
  - просмотр карточки (опционально read-only).

### Error
- Единый шаблон ошибки:
  - заголовок/описание/код;
  - CTA «На dashboard».
- Применение:
  - router-level error + локальные error states страниц.

## 6. Data contracts (черновик)

> Ниже минимальные поля (расширяются отдельно по backend-договоренностям).

### Subject
- `id`, `code`, `name`, `inn`, `type`, `residency`, `subjectStatus`, `complianceStatus`, `fullSet`, `manager`, `createdAt`, `updatedAt`, `isArchived`, `archivedAt`.

### Contract
- `id`, `subjectId`, `number`, `type`, `status`, `openDate`, `closeDate`, `tariff`, `reportDelivery`, `canUseMoney`, `canUseSecurities`.

### Account
- `id`, `subjectId`, `contractId`, `number`, `accountType`, `currency`, `status`, `openedAt`, `closedAt`.

### Request
- `id`, `subjectId`, `number`, `requestType`, `contractId`, `clientCode`, `status`, `source`, `amount`, `currency`, `createdAt`, `printedAt`.

### ComplianceCase
- `id`, `subjectId`, `reviewReason`, `riskLevel`, `pepFlag`, `sanctionsFlag`, `analyst`, `comment`, `lastCheckAt`, `nextCheckAt`, `status`.

### ComplianceDecision
- `id`, `complianceCaseId`, `decision`, `comment`, `decidedBy`, `decidedAt`, `requiresRework`, `blockingReason`.

### Agent
- `id`, `subjectId`, `contractNumber`, `commission`, `status`, `createdAt`, `updatedAt`.

### Report
- `id`, `department`, `subjectId`, `clientName`, `clientCode`, `reportTitle`, `reportType`, `period`, `fileName`, `fileSize`, `deliveryChannel`, `deliveryStatus`, `deliveryResult`, `sentAt`.

### DepositoryReport
- `id`, `reportId`, `depositoryType`, `deliveryResult`, `resendCount`, `lastResentAt`.

### BackOfficeReport
- `id`, `reportId`, `operationType`, `deliveryResult`, `resendCount`, `lastResentAt`.

### TradingProfile
- `id`, `subjectId`, `brokerContractNumber`, `investorStatus`, `riskLevel`, `riskAssignedAt`, `amlStatus`, `amlFreezeReason`, `qualifiedInvestor`, `allowCashUsage`, `allowSecuritiesUsage`, `tradingStatus`, `updatedAt`.

### TradingTerminal
- `id`, `tradingProfileId`, `type`, `login`, `uid`, `status`, `issuedAt`, `ip`, `certificateUntil`, `passwordUpdatedAt`.

### User
- `id`, `login`, `fullName`, `email`, `roleIds`, `status`, `lastLoginAt`, `createdAt`.

### Role
- `id`, `code`, `name`, `permissions[]`, `scope`, `isSystem`.

### AuditEvent
- `id`, `entityType`, `entityId`, `action`, `payload`, `actorUserId`, `createdAt`, `ip`.

### ArchiveRecord
- `id`, `entityType`, `entityId`, `reason`, `archivedBy`, `archivedAt`, `restoredBy`, `restoredAt`.

## 7. Actions and form submissions

| Действие | Где | Method/intent (условно) | Данные | Успех | Ошибки |
|---|---|---|---|---|---|
| Создать субъекта | subject-register | `POST /subjects` | payload регистрации ФЛ/ЮЛ | redirect в `/subjects/{id}`, toast | валидация полей, дубли ИНН |
| Сохранить черновик субъекта | subject-register | `POST /subjects/drafts` | промежуточные шаги формы | draftId + continue link | конфликт версии, неполные данные |
| Оформить договор | contract-wizard | `POST /contracts`/`PUT /contracts/{id}` | конфиг договора, subjectId | статус active/created + возврат в карточку | ошибки тарифа/валидации |
| Отправить поручение | requests | `POST /requests` | клиент, договор, тип, сумма, валюта, источник | новая строка в списке, статус «Ожидает» | недоступен договор, лимиты, валидация |
| Распечатать поручение | requests | `POST /requests/{id}/print` | `requestId`, шаблон печати | PDF/print-view готов | нет шаблона/прав |
| Принять решение комплаенса | compliance-card | `POST /compliance/{id}/decision` | решение, комментарий, аналитик | обновление статуса клиента | обяз. комментарий, конфликт статуса |
| Заблокировать клиента | compliance-card / subject-card | `POST /subjects/{id}/block` | основание, срок/тип блокировки | статус «ЗАБЛОКИРОВАН», аудит | нет прав, бизнес-ограничения |
| Отправить отчёт повторно | depository/back-office/middle-office-reports | `POST /reports/{id}/resend` | reportId, канал | статус доставки обновлён | транспортная ошибка |
| Скачать отчёт | report pages | `GET /reports/{id}/download` | reportId | скачан файл | файл недоступен |
| Выдать терминал | trading-card | `POST /trading/{id}/terminals` | тип терминала, пользователь, ограничения | новый terminal в списке | лимит лицензий, нет прав |
| Обновить пароль терминала | trading-card | `POST /trading/terminals/{id}/password-reset` | terminalId, confirm | отметка passwordUpdatedAt, уведомление | терминал offline/нет прав |
| Экспортировать таблицу | list pages | `GET /export?...` или `POST /export` | текущие фильтры/сортировка | CSV/XLSX файл | слишком большой объём, таймаут |
| Архивировать запись | subject-card | `POST /archive` | entityType/entityId/reason | исчезает из активного списка, запись в архиве | нет прав, зависимые сущности |

## 8. Filtering, sorting, pagination

Единый подход для UMI:

- Фильтры:
  - базово через GET query params (shareable URL);
  - опционально AJAX с синхронизацией query params.
- Сортировка:
  - `sortBy`, `sortDir` в query;
  - whitelist сортируемых колонок на backend.
- Пагинация:
  - `page`, `pageSize`, `total`, `totalPages`.
- Сохранение состояния:
  - фильтры/сортировка восстанавливаются при возврате на список.
- Reset filters:
  - отдельная action-кнопка, очищающая query.
- Empty state:
  - отдельный блок «Ничего не найдено» + CTA «Сбросить фильтры».

## 9. JavaScript behavior

Нужный JS (легкий, без SPA-перехода):

- sidebar collapse/mobile toggle;
- active menu state;
- tabs (карточки/детали);
- dropdown/select enhancement;
- modal windows (confirm/action forms);
- client-side form validation (до submit) + server-side error rendering;
- date fields (native/input mask);
- row click (табличная навигация);
- optional AJAX filtering (для heavy lists);
- optional global search autocomplete.

Ограничения:

- static-uikit не превращать в SPA;
- JS только для UX-улучшения и микроинтеракций;
- основной рендеринг таблиц/форм должен оставаться на стороне UMI.

## 10. Access roles / permissions

### Менеджер
- Видит: dashboard, subjects, subject-card/register, requests, trading (read limited).
- Действия: создать субъекта, оформить договор, создать поручение, экспорт своих списков.
- Ограничения: нет финальных compliance-решений, нет admin.

### Комплаенс
- Видит: compliance, compliance-card, subject-card (read), archive (read).
- Действия: одобрить/доработка/блокировать, финальное решение.
- Ограничения: нет админ-управления пользователями.

### Мидл-офис
- Видит: middle-office-clients, middle-office-reports, часть subjects/trading read-only.
- Действия: resend/download reports, экспорт журналов.
- Ограничения: нет compliance final decision.

### Бэк-офис
- Видит: back-office, depository, requests (ограниченный доступ).
- Действия: обработка/повторная отправка отчетов, выгрузки.
- Ограничения: нет управления ролями/пользователями.

### Администратор
- Видит: все разделы + administration.
- Действия: управление users/roles/dictionaries/access policies/audit.
- Ограничения: по policy компании (например, без бизнес-операций клиентов).

## 11. UMI integration checklist

- [ ] Подключены локальные assets (`UIkit`, `crm-static.css/js`, шрифты, brand).
- [ ] `sidebar` вынесен в общий UMI layout.
- [ ] `topbar` вынесен в общий UMI layout.
- [ ] Active menu/группы меню работают корректно.
- [ ] Все страницы имеют реальные UMI routes.
- [ ] Demo data заменены на реальные UMI/DB данные.
- [ ] Формы отправляются в backend и возвращают ошибки/успех.
- [ ] Фильтры работают (query-параметры/restore).
- [ ] Таблицы имеют корректную пагинацию.
- [ ] Статусы и badge mapping совпадают со справочниками.
- [ ] Права доступа применяются на backend и в UI.
- [ ] На каждой странице есть empty/error states.
- [ ] Нет внешних CDN подключений.
- [ ] Шрифты грузятся локально.
- [ ] Responsive sanity check пройден (desktop/tablet/mobile).

## 12. Acceptance criteria

Интеграция считается принятой, если:

- визуально UMI-версия соответствует static-uikit и React/Vite эталону;
- все P0-страницы открываются по рабочим роутам;
- ключевые сценарии P0 работают end-to-end;
- в P0 нет demo-заглушек и hardcoded mock-блоков;
- формы валидируются (client + server) и корректно показывают ошибки;
- действия создают/изменяют реальные записи;
- ролевая модель и скрытие кнопок соблюдаются;
- React/Vite build и кодовая база не затронуты переносом;
- static assets подключены локально.

## 13. Recommended implementation phases

### Phase 1 — Layout and navigation
- Общий UMI layout: sidebar/topbar/main wrapper.
- Маршруты: dashboard, subjects, requests, compliance, trading, error.
- Active menu, mobile toggle, базовые partials.

### Phase 2 — Lists and read-only pages
- Реестры: subjects, compliance, trading, middle-office-clients.
- Отчеты: middle-office-reports, depository, back-office (read-only first).
- Фильтры/сортировка/пагинация/empty states.

### Phase 3 — Detail cards
- subject-card, compliance-card, trading-card.
- Tabs/split/detail partials.
- Связи между list → detail.

### Phase 4 — Forms and workflows
- subject-register wizard.
- contract-wizard.
- create request flow.
- Валидация, черновики, пост-редиректы.

### Phase 5 — Actions and exports
- Экспорты таблиц.
- Решения комплаенса.
- report resend/download.
- archive/restore.
- trading terminal actions.

### Phase 6 — Roles/audit/hardening
- RBAC на backend + UI.
- Audit events.
- Ограничение действий по ролям.
- Безопасность форм, rate limits, error observability.

### Phase 7 — QA and acceptance
- Функциональный чек-лист по P0/P1/P2.
- Визуальная проверка (desktop/tablet/mobile).
- Регрессия маршрутов/форм/действий.
- Финальное приёмочное демо.
