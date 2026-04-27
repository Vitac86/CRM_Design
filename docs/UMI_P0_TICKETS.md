# UMI P0 Tickets

## 1. Назначение документа

Этот документ — рабочий backlog для P0-интеграции CRM в UMI.CMS. Он предназначен для постановки задач в трекер без дополнительной расшифровки со стороны аналитика.

Базовые эталоны реализации:
- **UI/верстка:** `static-uikit` (HTML5/UIkit-эталон);
- **Продуктовая логика и поведение:** текущая React/Vite-версия CRM.

Все задачи ниже упорядочены в **рекомендуемой последовательности** исполнения. Цель P0 — получить рабочую UMI-версию с:
- общим layout и навигацией;
- разделами субъектов;
- разделами поручений;
- разделами комплаенса;
- trading list;
- базовыми состояниями empty/error/loading и финальной приемкой.

---

## 2. Общие правила для всех тикетов

1. Не использовать CDN для стилей, скриптов, шрифтов и иконок.
2. Assets подключать только из локального хранилища UMI/проекта.
3. Не переносить React-код напрямую в UMI-шаблоны; переносить только структуру, поведение и UI-паттерны.
4. Sidebar/topbar реализовать через общие partials, без копипаста в каждую страницу.
5. Demo-data из static-шаблонов должна быть заменена на реальные данные UMI/backend.
6. Статусы, риски и аналогичные индикаторы рендерить через единый badge mapping.
7. Фильтры реализовывать через GET-параметры по умолчанию, если AJAX-подход не согласован отдельно.
8. Учитывать права доступа минимум на уровне видимости действий и переходов.
9. Сохранять visual parity со `static-uikit` (отступы, типографика, сетка, состояние элементов).
10. Не ломать существующую React/Vite сборку репозитория.

---

## 3. Ticket format

Каждый тикет в этом документе оформляется в одном и том же формате:

- **Цель**
- **Контекст**
- **Scope**
- **Out of scope**
- **Static reference**
- **UMI route/templates**
- **Required partials**
- **Required data**
- **User actions**
- **States**
- **Acceptance criteria**
- **Dependencies**
- **Notes / open questions**

---

## UMI-001 Assets and base layout

**Цель**
Подключить локальные assets и собрать базовый UMI layout shell для всех P0-страниц.

**Контекст**
Без базового shell нельзя унифицированно собирать контентные страницы, а также проверять визуальное соответствие эталону.

**Scope**
- Подключить UIkit CSS/JS из локальных файлов.
- Подключить `crm-static.css`.
- Подключить `crm-static.js`.
- Подключить локальные шрифты.
- Подключить логотип/бренд-ассеты.
- Создать общий `layout/base`.
- В layout выделить `main content area` для встраивания контента страниц.

**Out of scope**
- Реализация конкретных контентных страниц (dashboard, lists, forms).
- Бизнес-логика разделов.

**Static reference**
- `static-uikit/assets/`
- `static-uikit/pages/dashboard.html` (как референс shell-структуры)

**UMI route/templates**
- Базовый UMI-шаблон layout (имя уточняется по стандарту проекта).
- Тестовый маршрут/страница для проверки «пустого shell».

**Required partials**
- `layout/base`

**Required data**
- `currentUser` (placeholder)
- `currentRole` (placeholder)

**User actions**
- Открыть базовую страницу и убедиться, что shell рендерится.

**States**
- Normal state (пустой shell без контента).
- Asset error state (локальная диагностика отсутствующих ассетов в консоли/сети).

**Acceptance criteria**
- Все CSS/JS/fonts/logo загружаются локально.
- Внешние CDN отсутствуют.
- Shell отображается без встраиваемого контента.
- `body`/фон страницы соответствует `static-uikit`.
- Шрифты применяются корректно, без нежелательного fallback.
- Desktop layout корректен (основные брейкпоинты для P0).

**Dependencies**
- Нет.

**Notes / open questions**
- Уточнить конечный путь хранения ассетов в UMI (filesystem + URL mapping).

---

## UMI-002 Sidebar/topbar partials

**Цель**
Вынести sidebar и topbar в единые переиспользуемые UMI partials.

**Контекст**
Повторяемость навигации критична для поддерживаемости и снижения расхождений между страницами.

**Scope**
- Реализовать `sidebar` partial.
- Реализовать `topbar` partial.
- Добавить active menu logic.
- Реализовать user block.
- Добавить avatar.
- Добавить global search form (рабочая отправка или placeholder action).
- Добавить placeholder-логику visibility по permissions.

**Out of scope**
- Полноценный backend ACL-модуль.
- Глубокая полнотекстовая поисковая логика.

**Static reference**
- Sidebar/topbar на всех страницах `static-uikit/pages/*.html`.

**UMI route/templates**
- Включение partials в `layout/base`.
- Общая схема активного роута в UMI.

**Required partials**
- `partials/sidebar`
- `partials/topbar`

**Required data**
- `currentRoute`
- `currentUserName`
- `currentUserRole`
- `menuPermissions`

**User actions**
- Навигация по разделам.
- Использование глобального поиска.
- Раскрытие группового пункта меню.

**States**
- Active item.
- Collapsed/expanded parent group.
- Permission-hidden menu item.

**Acceptance criteria**
- Sidebar/topbar не дублируются вручную в шаблонах страниц.
- Active item определяется корректно.
- Родительская группа меню раскрывается для активного дочернего пункта.
- User block берет данные текущего пользователя.
- Global search отправляется как форма или placeholder action.
- Визуально совпадает со `static-uikit`.

**Dependencies**
- UMI-001.

**Notes / open questions**
- Уточнить источник и формат `menuPermissions`.

---

## UMI-003 Shared UI partials

**Цель**
Создать набор общих UI partials для всех P0-страниц.

**Контекст**
Единый UI-слой снижает стоимость изменений и предотвращает расхождения в интерфейсе.

**Scope**
Создать и задокументировать partials:
- `page-header`
- `page-actions`
- `filter-panel`
- `table-wrapper`
- `badge`
- `card`
- `tabs`
- `form-grid`
- `action-row`
- `split-view`
- `empty-state`
- `error-state`

**Out of scope**
- Специфичные для одного раздела компоненты с бизнес-логикой.

**Static reference**
- `static-uikit/assets/css/crm-static.css`
- `static-uikit/pages/*.html`

**UMI route/templates**
- Каталог partials в UMI-темплейтах.
- Демонстрационные include-примеры на 1–2 тестовых страницах.

**Required partials**
- Список выше (обязательно).

**Required data**
- Унифицированные входные параметры для partials (title, actions, badges, empty messages и т.д.).

**User actions**
- Взаимодействие с кнопками действий, табами, фильтрами.

**States**
- Normal / empty / error для таблиц и карточек.
- Badge states: success/warning/danger/neutral (или согласованный набор).

**Acceptance criteria**
- Основные UI-блоки переиспользуются на страницах.
- Статусы рендерятся через общий `badge` partial.
- Таблицы обернуты в единый `table-wrapper`.
- Панели фильтров имеют единый стиль.
- Кнопки/actions визуально и семантически консистентны.

**Dependencies**
- UMI-001
- UMI-002

**Notes / open questions**
- Зафиксировать final badge mapping (какой статус в какой стиль).

---

## UMI-004 Dashboard read-only

**Цель**
Реализовать dashboard на реальных данных в режиме read-only.

**Контекст**
Dashboard — стартовая страница P0-потока, должна отражать операционную картину без редактирования.

**Scope**
- Собрать страницу `/dashboard` по эталону.
- Подключить реальные KPI.
- Показать последние изменения по субъектам.
- Показать последние поручения.
- Реализовать переход «Все поручения» → `/requests`.

**Out of scope**
- Редактирование сущностей с dashboard.
- Кастомный конструктор виджетов.

**Static reference**
- `static-uikit/pages/dashboard.html`

**UMI route/templates**
- Route: `/dashboard`
- Template: dashboard page template (UMI naming по проекту).

**Required partials**
- `page-header`, `card`, `table-wrapper`, `badge` (по необходимости).

**Required data**
- KPI:
  - новые субъекты;
  - очередь комплаенса;
  - поручения за день;
  - просроченные задачи.
- Последние изменения по субъектам.
- Последние поручения.

**User actions**
- Переход по ссылке «Все поручения».

**States**
- Нормальное отображение данных.
- Empty state для блоков без записей.
- Error state при недоступности источника данных.

**Acceptance criteria**
- Demo-data заменена реальными данными.
- KPI отображаются корректно.
- Последние изменения и поручения выводятся из актуального источника.
- Ссылка «Все поручения» ведет на `/requests`.
- Визуально совпадает со `static-uikit`.

**Dependencies**
- UMI-001
- UMI-002
- UMI-003

**Notes / open questions**
- Уточнить SLA/частоту обновления KPI (на загрузке страницы, без realtime в P0).

---

## UMI-005 Subjects list read-only

**Цель**
Реализовать список субъектов без интерактивных изменений (кроме перехода в карточку и в регистрацию).

**Контекст**
Это базовая точка входа в работу с субъектами до включения полного CRUD.

**Scope**
- Реализовать страницу `/subjects` с таблицей из реальных данных.
- Настроить переход по строке в карточку `/subjects/{id}`.
- Кнопка «+ Добавить» ведет на `/subjects/register`.
- Вывести ключевые поля и статусы.

**Out of scope**
- Inline edit, bulk actions, массовые операции.

**Static reference**
- `static-uikit/pages/subjects.html`

**UMI route/templates**
- Route: `/subjects`
- Template: subjects list template.

**Required partials**
- `page-header`, `filter-panel` (если каркас уже нужен), `table-wrapper`, `badge`, `empty-state`.

**Required data**
- Список субъектов.
- Статусы.
- Тип клиента.
- Резидентство.
- Полный комплект.
- Комплаенс-статус.

**User actions**
- Row click → `/subjects/{id}`.
- «+ Добавить» → `/subjects/register`.

**States**
- Непустой список.
- Пустой список (`empty-state`).
- Ошибка загрузки данных (`error-state`).

**Acceptance criteria**
- Строки рендерятся из UMI-данных.
- Demo rows отсутствуют.
- Row click работает.
- Статусы выводятся через `badge` partial.
- В таблице отсутствует лишняя колонка «ДС/ЦБ».
- Для пустого списка показывается `empty-state`.

**Dependencies**
- UMI-003

**Notes / open questions**
- Подтвердить финальный набор колонок для P0.

---

## UMI-006 Subject detail read-only

**Цель**
Реализовать карточку субъекта `/subjects/{id}` в read-only режиме.

**Контекст**
Карточка должна обеспечить полноту просмотра данных и базовую навигацию по вкладкам.

**Scope**
- Открытие карточки по ID.
- Отображение профиля и связанных блоков.
- Вкладочная структура.
- Блок действий (видимость по правам), действия могут быть disabled/placeholder.

**Out of scope**
- Полное редактирование карточки.
- Реализация бизнес-процесса архивирования/оформления договора (если backend не готов).

**Static reference**
- `static-uikit/pages/subject-card.html`

**UMI route/templates**
- Route: `/subjects/{id}`
- Template: subject detail template.

**Required partials**
- `page-header`, `tabs`, `card`, `badge`, `action-row`, `error-state`.

**Required data**
- Профиль субъекта.
- Реквизиты.
- Документы.
- Связи.
- Договоры/счета.
- История.
- Badges/statuses.

**User actions**
- «В архив».
- «Редактировать».
- «Оформить договор».
- Переключение вкладок.

**States**
- Normal with data.
- Not found (404/error template).
- Permission-limited actions.

**Acceptance criteria**
- Карточка открывается по ID.
- Для несуществующего ID показывается 404/error template.
- Header и статусы берутся из реальных данных.
- Tabs работают, контент соответствует активной вкладке.
- Actions отображаются/скрываются по правам; недоступные — в disabled/placeholder состоянии.

**Dependencies**
- UMI-005

**Notes / open questions**
- Подтвердить модель прав для каждого действия в карточке.

---

## UMI-007 Subjects filters/pagination/export

**Цель**
Добавить фильтрацию, сортировку, пагинацию и экспорт для `/subjects`.

**Контекст**
Read-only список без управления объемом данных непригоден для операционной работы.

**Scope**
- Реализовать фильтры:
  - search;
  - type;
  - residency;
  - subject status;
  - compliance status;
  - role;
  - qualification.
- Реализовать reset filters.
- Реализовать пагинацию.
- Реализовать сортировку (если предусмотрена в матрице/бэкенде).
- Реализовать export или explicit disabled state.

**Out of scope**
- Сложные пользовательские presets фильтров.
- Асинхронная фильтрация, если не согласована.

**Static reference**
- `static-uikit/pages/subjects.html` (фильтры/таблица как UX-референс)

**UMI route/templates**
- Route: `/subjects` (тот же template, расширение функционала).

**Required partials**
- `filter-panel`, `table-wrapper`, `empty-state`, `badge`, `page-actions`.

**Required data**
- Словари значений фильтров.
- Список субъектов с поддержкой параметров фильтрации/сортировки/страниц.

**User actions**
- Применить фильтры.
- Сбросить фильтры.
- Переключить страницу.
- Изменить сортировку.
- Запустить экспорт.

**States**
- Normal.
- Empty filter result.
- Export unavailable (disabled with reason).

**Acceptance criteria**
- Фильтры применяются через GET или согласованный AJAX.
- Reset очищает фильтры.
- Выбранные фильтры сохраняются после reload.
- Пагинация работает корректно.
- Сортировка работает при наличии поддержки.
- Export выгружает отфильтрованный набор или имеет явно обозначенный disabled state.

**Dependencies**
- UMI-005

**Notes / open questions**
- Определить единый контракт export (формат файла, лимиты, асинхронность).

---

## UMI-008 Subject register form

**Цель**
Реализовать мастер регистрации субъекта `/subjects/register`.

**Контекст**
P0 должен покрыть базовый путь создания субъекта с валидацией и сохранением черновика.

**Scope**
- Реализовать форму/мастер регистрации.
- Подключить словари и draft data.
- Реализовать действия:
  - сохранить черновик;
  - продолжить;
  - создать субъекта.
- Реализовать валидации:
  - обязательные поля;
  - ИНН;
  - дубликат ИНН;
  - email/phone;
  - дата.

**Out of scope**
- Продвинутые KYC/AML сценарии beyond P0.
- Мультистадийный approval workflow.

**Static reference**
- `static-uikit/pages/subject-register.html`

**UMI route/templates**
- Route: `/subjects/register`
- Template: subject register template.

**Required partials**
- `page-header`, `form-grid`, `action-row`, `error-state`/validation blocks.

**Required data**
- Dictionaries:
  - тип субъекта;
  - резидентство;
  - менеджеры.
- Draft data (если доступно).

**User actions**
- Сохранить черновик.
- Продолжить заполнение.
- Создать субъекта.

**States**
- Draft saved.
- Validation errors near fields.
- Submit success + redirect.

**Acceptance criteria**
- Форма отправляется.
- Ошибки отображаются рядом с соответствующими полями.
- Черновик сохраняется.
- После успешного создания выполняется redirect на `/subjects/{id}`.
- Option cards/radio states сохраняют выбранное значение.
- Demo-only поведение отсутствует.

**Dependencies**
- UMI-005
- UMI-006

**Notes / open questions**
- Уточнить серверный API/check для дубликатов ИНН (sync/async validation).

---

## UMI-009 Requests list and filters

**Цель**
Реализовать список поручений и фильтры на странице `/requests`.

**Контекст**
Раздел поручений должен быть операционно полезным уже в P0: просмотр, отбор, базовые действия.

**Scope**
- Реализовать таблицу поручений из реальных данных.
- Реализовать фильтры:
  - search;
  - client code;
  - date;
  - source;
  - status.
- Реализовать reset filters.
- Реализовать export.
- Реализовать print existing request (если доступно) или placeholder/disabled.

**Out of scope**
- Сложные batch-операции по поручениям.

**Static reference**
- `static-uikit/pages/requests.html`

**UMI route/templates**
- Route: `/requests`
- Template: requests list template.

**Required partials**
- `page-header`, `filter-panel`, `table-wrapper`, `badge`, `empty-state`, `page-actions`.

**Required data**
- Requests list.
- Clients.
- Statuses.
- Sources.
- Currencies.

**User actions**
- Применить/сбросить фильтры.
- Экспортировать.
- Распечатать существующее поручение (если доступно).

**States**
- Normal.
- Empty list.
- Empty filter result.
- Export/print unavailable.

**Acceptance criteria**
- Таблица заполняется реальными данными.
- Статусы рендерятся через общий `badge` partial.
- Фильтры работают корректно.
- Пустой список показывает `empty-state`.
- Экспорт работает или явно disabled.

**Dependencies**
- UMI-003

**Notes / open questions**
- Согласовать печатную форму и правила ее доступности.

---

## UMI-010 Request create form

**Цель**
Реализовать создание поручения (create flow) в рамках `/requests`.

**Контекст**
После появления списка должен быть доступен базовый сценарий создания нового поручения.

**Scope**
- Реализовать форму создания поручения.
- Поля:
  - тип поручения;
  - клиент;
  - договор;
  - статус;
  - источник;
  - сумма;
  - валюта.
- Действия:
  - «Отмена»;
  - «Распечатать поручение»;
  - «Сохранить поручение».
- Валидации:
  - клиент обязателен;
  - договор обязателен;
  - сумма валидная;
  - валюта обязательна;
  - статус/источник — только из справочника.

**Out of scope**
- Сложные сценарии редактирования после создания.

**Static reference**
- `static-uikit/pages/requests.html` (как визуальный ориентир раздела)

**UMI route/templates**
- Route: `/requests` (встроенная форма/модалка/отдельный template по проектному решению).

**Required partials**
- `form-grid`, `action-row`, `page-actions`, `error-state`/validation summary.

**Required data**
- Dictionaries для типов, статусов, источников, валют.
- Клиенты, договоры.

**User actions**
- Отмена создания.
- Печать поручения.
- Сохранение поручения.

**States**
- Create success.
- Validation error.
- Print unavailable.
- Permission denied.

**Acceptance criteria**
- Форма создает поручение.
- После сохранения список поручений обновляется.
- Print работает или имеет понятный disabled state.
- Ошибки отображаются пользователю в явном виде.
- Права доступа учитываются.

**Dependencies**
- UMI-009

**Notes / open questions**
- Уточнить UX для create: отдельная страница vs inline/modal.

---

## UMI-011 Compliance list

**Цель**
Реализовать очередь комплаенса `/compliance`.

**Контекст**
Раздел нужен для приоритизации кейсов и перехода к принятию решения.

**Scope**
- Реализовать список compliance cases.
- Реализовать фильтры:
  - search;
  - risk;
  - status;
  - KYC;
  - residency.
- Реализовать row click в карточку `/compliance/{id}`.
- Реализовать export registry или disabled state.

**Out of scope**
- Финальное решение в карточке (покрывается UMI-012).

**Static reference**
- `static-uikit/pages/compliance.html`

**UMI route/templates**
- Route: `/compliance`
- Template: compliance list template.

**Required partials**
- `page-header`, `filter-panel`, `table-wrapper`, `badge`, `empty-state`, `page-actions`.

**Required data**
- Compliance cases.
- Risk levels.
- KYC statuses.
- AML statuses.
- Compliance statuses.

**User actions**
- Открыть compliance card.
- Применить/сбросить фильтры.
- Экспортировать реестр.

**States**
- Normal.
- Empty.
- Empty filter result.
- Export unavailable.

**Acceptance criteria**
- Список загружается из реальных данных.
- Row click ведет на `/compliance/{id}`.
- Статусы/риски рендерятся через `badge` partial.
- Фильтры работают корректно.
- Выгрузка реестра работает или явно disabled.

**Dependencies**
- UMI-003

**Notes / open questions**
- Уточнить перечень полей в экспортном реестре.

---

## UMI-012 Compliance card and decision

**Цель**
Реализовать карточку комплаенса и процесс принятия решения.

**Контекст**
Ключевой P0-сценарий комплаенса — вынесение решения с аудитом и проверкой прав.

**Scope**
- Реализовать `/compliance/{id}`.
- Показать данные кейса, документов, сигналов и истории.
- Реализовать decision panel:
  - «Одобрить»;
  - «На доработку»;
  - «Заблокировать»;
  - «Принять финальное решение».
- Реализовать валидации:
  - обязательный комментарий для «На доработку»/«Заблокировать»;
  - проверка актуального статуса (race/conflict);
  - проверка прав.

**Out of scope**
- Сложные многоэтапные маршруты комплаенса вне P0.

**Static reference**
- `static-uikit/pages/compliance-card.html`

**UMI route/templates**
- Route: `/compliance/{id}`
- Template: compliance card template.

**Required partials**
- `page-header`, `split-view`, `card`, `badge`, `action-row`, `error-state`.

**Required data**
- Subject.
- Compliance case.
- Documents.
- Risk signals.
- Decision history.

**User actions**
- Выполнить одно из решений.
- Ввести комментарий при обязательных сценариях.

**States**
- Decision success.
- Validation error.
- Conflict state.
- Permission denied.

**Acceptance criteria**
- Decision panel работает.
- Статус кейса обновляется.
- Создается audit event.
- Conflict state обработан и понятен пользователю.
- Permission denied обработан.
- После решения карточка показывает актуальный статус.

**Dependencies**
- UMI-011

**Notes / open questions**
- Зафиксировать формат audit event (обязательные поля, кто/когда/что).

---

## UMI-013 Trading list

**Цель**
Реализовать список trading clients/profiles на `/trading`.

**Контекст**
Раздел должен предоставить видимость торговых профилей и базовые фильтры в рамках P0.

**Scope**
- Реализовать таблицу trading profiles.
- Реализовать фильтры:
  - search;
  - qualification;
  - risk/status;
  - client code.
- Реализовать row click.
- Реализовать export (или disabled state).

**Out of scope**
- Полная карточка trading detail, если не включена в P0.

**Static reference**
- `static-uikit/pages/trading.html`

**UMI route/templates**
- Route: `/trading`
- Template: trading list template.

**Required partials**
- `page-header`, `filter-panel`, `table-wrapper`, `badge`, `empty-state`, `page-actions`.

**Required data**
- Trading profiles.
- Clients.
- Qualification.
- Risk.
- AML status.
- Terminal summary.

**User actions**
- Применить фильтры.
- Открыть строку (если detail route готов).
- Экспортировать.

**States**
- Normal.
- Empty/empty filtered.
- Detail unavailable (disabled/placeholder link).

**Acceptance criteria**
- Таблица заполняется реальными данными.
- Row click ведет в trading detail, если route доступен.
- Если detail route не входит в P0, ссылка явно disabled/placeholder.
- Статусы рендерятся через общий `badge` partial.

**Dependencies**
- UMI-003

**Notes / open questions**
- Уточнить, включается ли trading detail route в следующий этап или остается post-P0.

---

## UMI-014 Error/empty/loading states

**Цель**
Реализовать единые состояния ошибок, пустых списков и загрузки для P0.

**Контекст**
Состояния должны быть предсказуемыми и унифицированными на всех P0-страницах.

**Scope**
- Реализовать:
  - 404;
  - 500;
  - permission denied;
  - empty table;
  - empty filter result;
  - validation summary;
  - loading placeholder (если используется AJAX).

**Out of scope**
- Расширенные branded-иллюстрации beyond P0.

**Static reference**
- `static-uikit/pages/error.html`

**UMI route/templates**
- Общие error templates в UMI.
- Переиспользуемые partials для empty/loading/validation.

**Required partials**
- `error-state`, `empty-state`, `table-wrapper` (loading mode), validation summary block.

**Required data**
- Error codes/messages (без stack trace).
- Context-aware empty messages.

**User actions**
- «На дашборд» из error state.
- Повторная попытка (где уместно).

**States**
- 404 / 500 / permission denied.
- Empty list / empty filtered.
- Loading.

**Acceptance criteria**
- Error templates визуально соответствуют `static-uikit`.
- Кнопка «На дашборд» ведет на `/dashboard`.
- Пользователь не видит stack trace.
- Empty states присутствуют на всех P0-таблицах.
- Validation errors единообразны.

**Dependencies**
- UMI-001
- UMI-003

**Notes / open questions**
- Определить единый формат пользовательских error messages.

---

## UMI-015 P0 QA and visual acceptance

**Цель**
Провести финальную приемку P0 по функциональности и визуалу.

**Контекст**
Финальный gate перед завершением этапа и передачей в следующий контур.

**Scope**
- Пройти все P0 routes.
- Сверить визуал со `static-uikit`.
- Проверить links/actions.
- Проверить реальные данные.
- Проверить роли/видимость действий.
- Проверить отсутствие demo data.
- Проверить отсутствие CDN.
- Проверить desktop/tablet sanity.

**Out of scope**
- Полный cross-browser matrix beyond согласованного P0.

**Static reference**
- Все релевантные страницы `static-uikit/pages/*.html`.

**UMI route/templates**
- Все P0 route из UMI-001…UMI-014.

**Required partials**
- Все P0 partials (проверка интеграции и единообразия).

**Required data**
- Тестовые реальные данные по субъектам/поручениям/комплаенсу/trading.
- Минимум 2–3 пользовательские роли для проверки видимости.

**User actions**
- Навигация по меню.
- Работа с фильтрами.
- Создание сущностей.
- Принятие комплаенс-решения.

**States**
- Normal, empty, error, permission denied.

**Acceptance criteria**
- Все P0-страницы открываются.
- В P0 нет demo rows/demo-only данных.
- Фильтры работают.
- Формы работают.
- Compliance decision flow работает.
- Empty/error states присутствуют.
- Active menu корректен.
- Права базово учитываются.
- Визуальные отличия от `static-uikit` либо исправлены, либо зафиксированы в отдельном списке.

**Dependencies**
- UMI-001…UMI-014

**Notes / open questions**
- Уточнить финальный формат acceptance report (чеклист/таблица/дефект-лист).

---

## 4. Dependencies map

Краткая карта зависимостей:

- **UMI-001 → everything**
- **UMI-002 → all pages**
- **UMI-003 → all content pages**
- **UMI-005 → UMI-006, UMI-007, UMI-008**
- **UMI-009 → UMI-010**
- **UMI-011 → UMI-012**
- **UMI-014 → all P0 pages**
- **UMI-015 → final acceptance**

---

## 5. P0 delivery order

Рекомендуемый порядок выполнения:

1. UMI-001
2. UMI-002
3. UMI-003
4. UMI-004
5. UMI-005
6. UMI-006
7. UMI-007
8. UMI-008
9. UMI-009
10. UMI-010
11. UMI-011
12. UMI-012
13. UMI-013
14. UMI-014
15. UMI-015

---

## 6. Open questions before development

Перед стартом разработки подтвердить:

1. Где физически и логически (URL) будут храниться assets в UMI.
2. Какой точный синтаксис и conventions шаблонов используются в текущем UMI-проекте.
3. Фильтры реализуются через GET-параметры или AJAX.
4. Какой механизм export (sync/async, формат, лимиты, доступы).
5. Какой механизм print и когда он должен быть доступен.
6. Где единый источник справочников (статусы, типы, источники, валюты и т.д.).
7. Как устроены роли и минимальная permission-модель для P0.
8. Какой формат и место хранения audit event для compliance decision.
9. Какие из P0 actions уже поддержаны backend на момент старта.
