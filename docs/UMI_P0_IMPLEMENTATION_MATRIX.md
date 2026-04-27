# UMI P0 Implementation Matrix

## 1. Назначение документа

Этот документ переводит общий план миграции в конкретный порядок реализации P0 для переноса CRM в UMI.CMS.

P0 в рамках данного документа — минимальный рабочий срез CRM, без которого система не считается операционно готовой:
- общий каркас и навигация;
- базовый мониторинг через dashboard;
- ключевой контур по субъектам;
- поручения;
- комплаенс;
- базовый trading list;
- единый шаблон ошибок.

Цель P0 — получить рабочую UMI-версию с корректной структурой шаблонов, данными из UMI/backend, основными действиями пользователей и предсказуемыми критериями приемки по каждой странице.

---

## 2. P0 scope

### 2.1 Layout / Shell
- **Зачем нужен:** единая оболочка CRM (layout/base, sidebar, topbar, page container).
- **Бизнес-ценность:** консистентная навигация и быстрый доступ к разделам.
- **Зависимости:** подключение локальных assets, данные пользователя и прав, active route.
- **Готовность:** sidebar/topbar не дублируются в страницах, active menu работает, нет CDN.

### 2.2 Dashboard
- **Зачем нужен:** стартовая страница с KPI и оперативной сводкой.
- **Бизнес-ценность:** быстрый обзор текущего состояния без перехода в разделы.
- **Зависимости:** метрики, последние изменения по субъектам, последние поручения.
- **Готовность:** реальные данные, корректная ссылка в `/requests`, визуальное соответствие static-uikit.

### 2.3 Subjects list
- **Зачем нужен:** основной реестр клиентов/субъектов.
- **Бизнес-ценность:** поиск, фильтрация и переход в карточки субъектов.
- **Зависимости:** список субъектов, словари фильтров, пагинация/сортировка.
- **Готовность:** таблица из UMI-данных, GET-фильтры, переход по строке в `/subjects/{id}`.

### 2.4 Subject card
- **Зачем нужен:** единая точка просмотра профиля и связанных сущностей.
- **Бизнес-ценность:** операционная работа с субъектом (контракты, документы, история).
- **Зависимости:** detail API/модуль, табы, права на действия.
- **Готовность:** реальные header/badges, рабочие табы, 404 при отсутствии субъекта.

### 2.5 Subject register
- **Зачем нужен:** регистрация нового субъекта в CRM.
- **Бизнес-ценность:** возможность первичного заведения клиентов.
- **Зависимости:** словари формы, валидация, проверка дубликатов, draft.
- **Готовность:** create/save draft/continue работают, ошибки отображаются, redirect в карточку.

### 2.6 Requests
- **Зачем нужен:** реестр поручений + базовое создание поручения.
- **Бизнес-ценность:** выполнение ключевого операционного сценария по поручениям.
- **Зависимости:** список, словари (клиенты/контракты/валюты/источники), печать/export.
- **Готовность:** форма создания и список работают, статусы реальные, print обработан (active либо disabled).

### 2.7 Compliance list
- **Зачем нужен:** очередь комплаенс-проверок.
- **Бизнес-ценность:** контроль рисков и регуляторного процесса.
- **Зависимости:** очередь кейсов, словари risk/KYC/AML, badge mapping.
- **Готовность:** переход в `/compliance/{id}`, статусы через единый partial badge, нет demo rows.

### 2.8 Compliance card
- **Зачем нужен:** принятие решений по комплаенс-кейсу.
- **Бизнес-ценность:** критичный регулируемый workflow (approve/rework/block).
- **Зависимости:** детальные данные кейса, валидация комментария, статусные переходы, audit.
- **Готовность:** решение сохраняется, обязательный комментарий для rework/block, создан audit event.

### 2.9 Trading list
- **Зачем нужен:** базовый список торговых профилей для операционного контроля.
- **Бизнес-ценность:** видимость торгового контура и статусов допуска.
- **Зависимости:** trading list, qualification/risk/AML статусы, detail route (опционально).
- **Готовность:** список реальный, row click ведет в detail при готовом route, иначе понятный disabled/placeholder.

### 2.10 Error template
- **Зачем нужен:** единая обработка пользовательских ошибок (404/500/permission).
- **Бизнес-ценность:** предсказуемый UX и снижение операционных инцидентов.
- **Зависимости:** шаблон error, проброс error code/message/request id.
- **Готовность:** единый UI ошибок, переход на dashboard, без stack trace пользователю.

---

## 3. Out of scope for P0

В P0 **не входят** (переносятся в P1/P2):
- глубокий CRUD администрирования;
- полноценная ролевая матрица прав (в P0 только базовые проверки видимости/действий);
- полноценный глобальный autocomplete search;
- advanced AJAX-фильтрация (достаточно GET-фильтров, если UX приемлем);
- сложный export pipeline;
- resend/download отчётов;
- contract-wizard full business flow;
- trading-card терминалы при неготовом backend.

> Примечание по trading-card: при необходимости можно вести как **P0.5 dependency** для полноты перехода из `/trading`.

---

## 4. Implementation phases

### Phase 0 — Assets and base shell
- Подключить локальные CSS/JS/fonts/logo.
- Собрать `layout/base`.
- Вынести sidebar/topbar в общие partials.
- Настроить active menu.
- Подключить общий page container.

### Phase 1 — Read-only core pages
- Dashboard.
- Subjects list.
- Subject card.
- Compliance list.
- Trading list.

### Phase 2 — Filters and navigation
- GET-фильтры по спискам.
- Reset filters.
- Row click (табличная навигация).
- Pagination.
- Сортировка (если backend/UMI готов).

### Phase 3 — Forms and actions
- Subject register.
- Requests create form.
- Compliance decision panel.

### Phase 4 — Error/empty/loading states
- Empty table states.
- Validation errors.
- Permission denied.
- Not found.
- Common error template.

### Phase 5 — QA and acceptance
- Visual parity со static-uikit.
- Data correctness.
- Roles sanity.
- Проверка ссылок и переходов.
- Нет demo data в P0.
- Нет CDN.

---

## 5. P0 page matrix

| P0 item | UMI route | Static reference | Required partials | Required data | Required actions | Required filters | Required states | Dependencies | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|---|
| Layout / Shell | all CRM pages | static-uikit shared shell | `layout/base`, `sidebar`, `topbar`, `page-header` | current user, role, active route | global search submit | — | active menu, permission-based visibility | локальные assets, единая layout архитектура | sidebar/topbar не дублируются; active menu работает; assets локальные; шрифты грузятся; нет CDN |
| Dashboard | `/dashboard` | `static-uikit/pages/dashboard.html` | `dashboard-kpi`, `dashboard-recent-table`, `page-header` | KPI, recent subject changes, recent requests | перейти ко всем поручениям | — | empty KPI/recent blocks, loading/error | layout/shell, dashboard metrics | реальные данные вместо demo; ссылка ведёт на `/requests`; карточки/таблицы совпадают с static-uikit |
| Subjects | `/subjects` | `static-uikit/pages/subjects.html` | `filter-bar`, `table`, `badge`, `pagination` | subjects list, statuses, filter dictionaries | add subject, export, row click | search, type, residency, subject status, compliance status, role, qualification | empty list, loading, data error, permission-limited actions | словари статусов, subjects list endpoint/module | таблица рендерится из UMI-данных; filters в GET; row click в `/subjects/{id}`; нет demo rows |
| Subject card | `/subjects/{id}` | `static-uikit/pages/subject-card.html` | `subject-header`, `tabs`, `badge`, `action-panel` | subject profile, contracts, accounts, documents, history | archive, edit, create contract | tab/query filters (по необходимости) | not found (404), permission denied, loading/error | subjects list routing, detail endpoint/module, roles | header/badges реальные; tabs работают; actions по правам; 404 если subject не найден |
| Subject register | `/subjects/register` | `static-uikit/pages/subject-register.html` | `form-section`, `field`, `validation`, `form-actions` | dictionaries, draft data | save draft, continue, create subject | — | validation errors, duplicate INN, draft saved | словари формы, duplicate check, create endpoint/module | форма отправляется; ошибки видны; успешный redirect в subject card |
| Requests | `/requests` | `static-uikit/pages/requests.html` | `filter-bar`, `table`, `request-form-modal/page`, `badge` | requests list, clients, contracts, currencies, sources | create request, print, export | search, client code, date, source, status | empty list, create validation, print unavailable state | request dictionaries, request create/save endpoint/module | форма создания работает; таблица UMI-данные; статусы реальные; print либо работает, либо disabled с пояснением |
| Compliance | `/compliance` | `static-uikit/pages/compliance.html` | `filter-bar`, `table`, `badge`, `pagination` | compliance queue, risk levels, KYC/AML statuses | open compliance card, export registry | search, risk, status, KYC, residency | empty queue, loading/error, permission-limited export | status dictionary, compliance queue endpoint/module | row click в `/compliance/{id}`; статусы через badge partial; нет demo rows |
| Compliance card | `/compliance/{id}` | `static-uikit/pages/compliance-card.html` | `compliance-header`, `risk-signals`, `decision-panel`, `history-table` | subject, compliance case, documents, risk signals, decision history | approve, send to rework, block, submit final decision | — | comment required, permission denied, status conflict, loading/error | compliance detail endpoint/module, audit write, role checks | решение сохраняется; комментарий обязателен для rework/block; создается audit event; статус обновляется |
| Trading | `/trading` | `static-uikit/pages/trading.html` | `filter-bar`, `table`, `badge`, `pagination` | trading profiles, qualification, risk, AML status | row click, export | search, qualification, AML/risk status | empty list, disabled detail link, loading/error | trading list endpoint/module, optional trading detail route | список реальный; row click в detail при готовом route; иначе disabled/placeholder |
| Error template | `/error`, `404`, `500` templates | `static-uikit/pages/error.html` | `error-layout`, `error-actions` | error code, message, request id (if available) | go dashboard | — | 404, 500, permission denied | global error handling in UMI | единый вид ошибок; кнопка на dashboard; нет stack trace для пользователя |

---

## 6. Data readiness checklist

Для старта и завершения P0 должны быть готовы:

- [ ] current user
- [ ] menu permissions
- [ ] subjects list
- [ ] subject detail
- [ ] subject dictionaries
- [ ] requests list
- [ ] requests dictionaries
- [ ] compliance list
- [ ] compliance detail
- [ ] trading list
- [ ] dashboard metrics
- [ ] status dictionaries
- [ ] audit events

---

## 7. Form readiness checklist

### Subject register
- [ ] required fields фиксированы и документированы.
- [ ] валидация (обязательность, формат, длины) включена.
- [ ] duplicate checks (минимум INN) реализованы.
- [ ] save draft сохраняет промежуточные данные.
- [ ] final create создает субъекта и возвращает ID/redirect.

### Requests
- [ ] client lookup работает.
- [ ] contract lookup работает.
- [ ] amount/currency validation реализована.
- [ ] save создает поручение.
- [ ] print: либо рабочий поток, либо explicit disabled state.

### Compliance decision
- [ ] decision selection (approve/rework/block) работает.
- [ ] comment validation включена для rework/block.
- [ ] status transition валидируется на backend/UMI.
- [ ] audit write фиксирует действие, автора, дату, комментарий.

---

## 8. Status mapping for P0

Статусы в P0 не должны быть hardcoded в HTML. Используется единый словарь (`status code -> label -> badge tone`) и общий badge partial.

| status code | label | badge tone | used in pages |
|---|---|---|---|
| `active_client` | Активный клиент | green | subjects, subject card, trading |
| `compliance_pending` | На комплаенсе | blue | subjects, compliance |
| `review_pending` | На проверке | blue/yellow | requests, compliance |
| `rework` | На доработке | yellow | compliance card, requests |
| `blocked` | Заблокирован | red | subjects, compliance card, trading |
| `approved` | Пройден | green | compliance, compliance card |
| `request_waiting` | Ожидает | yellow | requests |
| `request_accepted` | Принято | blue | requests |
| `request_rejected` | Отклонено | red | requests |

---

## 9. Acceptance checklist for P0 release

- [ ] layout/base подключён
- [ ] sidebar общий
- [ ] topbar общий
- [ ] active menu работает
- [ ] assets локальные
- [ ] fonts грузятся
- [ ] dashboard реальные данные
- [ ] subjects реальные данные
- [ ] subject card реальные данные
- [ ] subject register создаёт запись
- [ ] requests создаёт поручение
- [ ] compliance decision работает
- [ ] filters работают через GET или AJAX
- [ ] empty states есть
- [ ] error states есть
- [ ] права хотя бы базово учитываются
- [ ] нет demo rows в P0
- [ ] нет внешних CDN/API
- [ ] visual parity проверен по static-uikit
- [ ] desktop sanity проверен
- [ ] tablet sanity проверен

---

## 10. Recommended order of tickets

### UMI-001 Assets and base layout
- **Цель:** подключить локальные assets и собрать базовый layout.
- **Touched templates/partials:** `layout/base`, assets include partial.
- **Required data:** глобальные настройки окружения, пути к локальным assets.
- **Acceptance criteria:** нет CDN, все базовые стили/шрифты грузятся, layout применим ко всем P0-страницам.

### UMI-002 Sidebar/topbar partials
- **Цель:** вынести и переиспользовать sidebar/topbar.
- **Touched templates/partials:** `partials/sidebar`, `partials/topbar`.
- **Required data:** current user, role, menu tree, active route.
- **Acceptance criteria:** единые partials подключены в layout, active menu корректен, видимость пунктов учитывает права.

### UMI-003 Shared page-header/filter/table/badge partials
- **Цель:** унифицировать повторяемые UI-элементы.
- **Touched templates/partials:** `page-header`, `filter-bar`, `table`, `badge`, `pagination`.
- **Required data:** status dictionary, общие параметры фильтрации/сортировки.
- **Acceptance criteria:** все P0-списки используют shared partials, статусные badge берутся из mapping.

### UMI-004 Dashboard read-only
- **Цель:** запустить dashboard в режиме чтения.
- **Touched templates/partials:** `pages/dashboard`, KPI/recent partials.
- **Required data:** dashboard metrics, recent changes, recent requests.
- **Acceptance criteria:** данные реальные, link-to-requests работает, визуальное соответствие static-uikit.

### UMI-005 Subjects list read-only
- **Цель:** вывести список субъектов без форм редактирования.
- **Touched templates/partials:** `pages/subjects`, table/filter partials.
- **Required data:** subjects list, statuses, filter dictionaries.
- **Acceptance criteria:** рендер без demo данных, row click в карточку, корректные badge статусов.

### UMI-006 Subject detail read-only
- **Цель:** показать карточку субъекта и табы в режиме чтения.
- **Touched templates/partials:** `pages/subject-card`, subject-header/tabs partials.
- **Required data:** profile, contracts, accounts, documents, history.
- **Acceptance criteria:** табы и данные корректны, 404 при невалидном ID, права на actions учитываются.

### UMI-007 Subjects filters/pagination/export
- **Цель:** добавить рабочие фильтры и навигацию списка субъектов.
- **Touched templates/partials:** `filter-bar`, `pagination`, `pages/subjects`.
- **Required data:** фильтруемые поля, total count, pagination metadata.
- **Acceptance criteria:** GET-фильтры и reset работают, pagination корректна, export реализован или disabled явно.

### UMI-008 Subject register form
- **Цель:** реализовать форму регистрации субъекта.
- **Touched templates/partials:** `pages/subject-register`, form partials.
- **Required data:** dictionaries, duplicate-check endpoint/module, draft storage.
- **Acceptance criteria:** required/format validation, save draft, успешный create + redirect.

### UMI-009 Requests list and filters
- **Цель:** запустить список поручений и фильтры.
- **Touched templates/partials:** `pages/requests`, table/filter partials.
- **Required data:** requests list, statuses, dictionaries.
- **Acceptance criteria:** список на реальных данных, фильтры работают, статусы корректно маппятся.

### UMI-010 Request create form
- **Цель:** реализовать создание поручения.
- **Touched templates/partials:** request create form partial/page.
- **Required data:** clients, contracts, currencies, sources.
- **Acceptance criteria:** валидации проходят, save создает запись, print поток определен (active/disabled).

### UMI-011 Compliance list
- **Цель:** вывести очередь комплаенса.
- **Touched templates/partials:** `pages/compliance`, filter/table/badge partials.
- **Required data:** compliance queue, risk levels, KYC/AML statuses.
- **Acceptance criteria:** фильтры и row click работают, нет demo rows, статусы единообразны.

### UMI-012 Compliance card and decision
- **Цель:** реализовать карточку комплаенса и решение.
- **Touched templates/partials:** `pages/compliance-card`, decision panel/history partials.
- **Required data:** case detail, documents, risk signals, decision history.
- **Acceptance criteria:** approve/rework/block работают, комментарий обязателен где нужно, audit event создается.

### UMI-013 Trading list
- **Цель:** запустить базовый trading list.
- **Touched templates/partials:** `pages/trading`, filter/table partials.
- **Required data:** trading profiles, qualification/risk/AML.
- **Acceptance criteria:** список без demo rows, переход в detail при готовом route, иначе disabled placeholder.

### UMI-014 Error/empty/loading states
- **Цель:** унифицировать состояние ошибок и пустых списков.
- **Touched templates/partials:** `error template`, empty/loading state partials.
- **Required data:** error code/message/request id.
- **Acceptance criteria:** 404/500/permission denied имеют единый вид, stack trace скрыт, возврат на dashboard работает.

### UMI-015 P0 QA and visual acceptance
- **Цель:** завершить P0 интеграционным и визуальным QA.
- **Touched templates/partials:** все P0 templates/partials.
- **Required data:** полный P0 data set, роли для sanity-check.
- **Acceptance criteria:** выполнен чеклист раздела 9, зафиксированы остатки P1/P2, подписан релиз P0.

---

## 11. Risks / open questions

- Точный синтаксис UMI-шаблонов и ограничения шаблонизатора.
- Финальное размещение assets (пути, версияция, cache-busting).
- Какие backend endpoints/UMI modules уже существуют, какие нужно сделать.
- Базовая стратегия фильтров: GET-first или частичный AJAX.
- Формат и канал export (sync/async, ограничения по объему).
- Реализация print для requests (PDF/HTML/интеграция с печатными формами).
- Единый источник статусных словарей и политика обновления mapping.
- Минимально достаточная модель ролей для P0 и ее проверка.
- Степень интеграции: реальные API или преимущественно UMI modules.
- Формат audit event (обязательные поля, хранение, трассировка request id).

