# static-uikit

Отдельная статическая HTML5 + UIkit версия CRM для интеграции в UMI.CMS.

## Важно
- React/Vite версия в `src/` остается рабочим эталоном и не заменяется.
- `static-uikit` — независимый deliverable для шаблонной интеграции.
- Используется единый дизайн: **Investica Light Executive**.


## Review launcher
Если сервер запущен из корня репозитория:
- `cd CRM_Design`
- `python -m http.server 8080`
- launcher URL: `http://localhost:8080/static-uikit/index.html`

Если сервер запущен из папки `static-uikit`:
- `cd CRM_Design/static-uikit`
- `python -m http.server 8080`
- launcher URL: `http://localhost:8080/index.html`

Страница содержит быстрые ссылки на standalone pages (`static-uikit/pages/*.html`), UMI P0/P1 extraction packs и команды локальной проверки/сборки.

## Как открыть локально
1. Откройте любой файл из `static-uikit/pages/*.html` в браузере.
2. Для корректной работы путей используйте корень репозитория как base path.

## Страницы
- `dashboard.html`
- `subjects.html`
- `subject-card.html`
- `subject-register.html`
- `contract-wizard.html`
- `brokerage.html`
- `trust-management.html`
- `agents.html`
- `requests.html`
- `compliance.html`
- `compliance-card.html`
- `middle-office-clients.html`
- `middle-office-reports.html`
- `depository.html`
- `back-office.html`
- `trading.html`
- `trading-card.html`
- `administration.html`
- `archive.html`
- `error.html`

## Assets
- CSS: `static-uikit/assets/css/`
- JS: `static-uikit/assets/js/`
- Fonts: `static-uikit/assets/fonts/`
- Brand: `static-uikit/assets/brand/`

## UIkit локально (без CDN)
В этой среде добавлены placeholder-файлы UIkit. Для production-интеграции положите локальные UIkit 3.x файлы сюда:
- `static-uikit/assets/css/uikit.min.css`
- `static-uikit/assets/js/uikit.min.js`
- `static-uikit/assets/js/uikit-icons.min.js`

Подключения в HTML уже настроены только на локальные пути:
- `../assets/css/uikit.min.css`
- `../assets/js/uikit.min.js`
- `../assets/js/uikit-icons.min.js`

## Шрифты
- В `crm-static.css` используется системный fallback: `font-family: Inter, Arial, sans-serif;`.
- Бинарные файлы шрифтов (`.woff/.woff2`) в этот PR не включены.
- Для production вручную положите локальные `.woff2` в `static-uikit/assets/fonts/` и добавьте `@font-face` в `static-uikit/assets/css/crm-static.css`.

## Интеграция в UMI.CMS
1. Вынесите `sidebar` и `topbar` в общий layout-шаблон UMI.
2. Содержимое `pages/*.html` используйте как content-area шаблонов.
3. Demo-данные замените на UMI variables/macros.
4. Подключайте `assets` локально (без внешних CDN/API).
5. `pages/subject-card.html` теперь server-rendered/static-template-first: профиль, адреса и представители заданы в HTML и не заполняются через demo JSON в runtime.
6. `assets/js/crm-static.js` используется только для глобального/переиспользуемого UI-поведения (tabs/sidebar/nav/filters/data-href), без subject-card-specific логики и без data-rendering.
   - Включая переиспользуемые selectable-контролы: `.crm-option-card`, `.crm-binary-control`, `.crm-radio-tile`, `.crm-check-row`.
   - JS только синхронизирует визуальные классы `.is-selected` / `.is-active` из уже существующего `checked` состояния input и после пользовательского изменения.
7. `assets/js/pages/subject-card.js` подключается только на странице карточки субъекта и содержит только page-specific поведение (модалка представителя, toggle адресов, срок действия), без генерации данных из JS.
8. `assets/js/crm-static.js` не должен содержать `data-page` guards для конкретных страниц и не должен владеть page-only интеракциями.
9. Любой page-specific JS размещается только в `assets/js/pages/<page>.js`, оборачивается в IIFE и защищается page guard (`body[data-page=...]` / `.crm-page[data-page=...]`).
10. UMI templates должны подключать page script только для matching template (без глобального include на все страницы).


## Ограничения
- Без React внутри `static-uikit`.
- Без Vite-сборки для `static-uikit`.
- Без внешних API, аналитики, Google Fonts, CDN.

## Partials for UMI
- Папка `static-uikit/partials/` содержит готовые HTML-фрагменты (sidebar, topbar, headers, filters, tables, actions, формы и т.д.).
- `static-uikit/pages/*.html` остаются standalone demo pages и продолжают открываться отдельно.
- Partials не подключаются автоматически и не используются как include-механизм.
- Это не build step и не template-engine для текущей static-версии.
- UMI-разработчики могут переносить фрагменты из `partials/` в шаблоны UMI.CMS (`layout`, `partials`, `pages`).
- `data-*` атрибуты (`data-page`, `data-entity`, `data-id`, `data-href`, `data-action`, `data-filter`, `data-form`, `data-status`) добавлены как hooks для интеграции, навигации, форм, действий и будущей серверной логики.

## Static validation
Запустите локальную проверку standalone-версии:

```bash
node static-uikit/tools/validate-static-uikit.mjs
```

Скрипт проверяет отсутствие внешних зависимостей (CDN/analytics/API), валидность локальных `href`/`data-href`, корректность `form`/полей, наличие `body[data-page]` и `section.crm-page[data-page]`.
Validator также проверяет, что data-* hooks из UMI packs отражены в integration-inventory.json.
Partials и UMI P0/P1 templates синхронизированы с финальными standalone page patterns.
Дополнительно validator проверяет реестр page scripts (`standalone page -> assets/js/pages/*.js`), ownership/ordering относительно `crm-static.js`, а также behavior-only ограничения для page scripts.
Перед handoff обязательно запускайте validator для проверки целостности пакета.

## Page script audit map
- `static-uikit/PAGE_SCRIPT_AUDIT.md` содержит компактную карту по всем standalone pages: где global-only поведение, где page script и почему.


## Handoff manifest
- `static-uikit/HANDOFF_MANIFEST.json`
- `static-uikit/HANDOFF_NOTES.md`
- Validator (`node static-uikit/tools/validate-static-uikit.mjs`) проверяет оба файла перед handoff.

## Standalone QA checklist
- Checklist: `static-uikit/STANDALONE_QA_CHECKLIST.md`
- Перед handoff обязательно запустить:
  - `node static-uikit/tools/validate-static-uikit.mjs`
  - `npm run build`

## UMI P0 extraction pack
- Папка `static-uikit/umi-p0/` содержит layout/partials/pages заготовки для P0-переноса в UMI.CMS.
- Это не build step и не runtime для standalone-демо.
- Standalone pages остаются в `static-uikit/pages/`.
- Перед использованием в реальном UMI.CMS-проекте замените placeholders на синтаксис проекта.
- Дополнительно pack содержит manifest, integration inventory и handoff checklist.

## UMI P1 extraction pack
- `static-uikit/umi-p1/` содержит шаблонные заготовки для оставшихся operational pages.
- Пак зависит от `static-uikit/umi-p0`.
- Это не runtime и не build step.
- Пак проверяется тем же validator: `node static-uikit/tools/validate-static-uikit.mjs`.

## UMI Corporate static token layer
- Термин "Corporate" в этом репозитории означает **UMI.CMS Corporate edition**, а не отдельную UIkit theme/design system.
- Текущий ориентир: **UMI.CMS 24-compatible static templates** в составе static-uikit.
- Базовые дизайн-токены и UMI.CMS Corporate compatibility token layer находятся в `static-uikit/assets/css/base/tokens.css`.
- Для page-level CSS используйте только токены (`var(--crm-...)`, `var(--crm-umi-...)`; `var(--crm-c24-...)` оставлены как deprecated compatibility aliases) вместо raw hex/shadow значений.
- Минимальный UMI compatibility слой включает: primary/hover, border, surface/surface-muted, text/secondary/muted, radius, shadows, status colors.
- Для страницы subject-card цвета/тени нормализуются через token layer без изменения standalone-структуры страницы.


## UMI extraction pack contract (P0/P1)
- `umi-p0/` и `umi-p1/` — extraction packs, не runtime app и не build step (`runtime=false`, `buildStep=false`).
- Standalone `pages/*.html` — визуальный/source-of-truth reference для структуры и UX.
- UMI templates обязаны рендерить данные server-side (static-template-first), без JS demo data/render helpers.
- `assets/js/crm-static.js` — только global reusable behavior.
- Page scripts (`assets/js/pages/*.js`) подключаются только matching template (сейчас только `subject-card`).
- Для `.crm-option-card`, `.crm-binary-control`, `.crm-radio-tile`, `.crm-check-row` сервер должен рендерить `checked` + `.is-selected`/`.is-active` консистентно.

## Registry/list-page pattern (standalone + UMI)
- Registry pages are `server-rendered/static-template-first`: filters, table rows, badges/statuses, and empty states are rendered in HTML templates, not by runtime JS.
- Standard structure: `crm-page-header` + `data-entity="page-title"`, `form.crm-registry-filters.crm-filter-panel` (`data-form`, `data-action`, one `crm-filter-search-row`, one `crm-filter-fields-row`), `crm-table-wrapper > crm-table > table.uk-table`, and `.crm-empty-state[data-entity="empty-state"]`.
- Registry table shell is overflow-safe by contract: keep horizontal overflow handling on `.crm-table-wrapper`; table width/min-width must not create page-level horizontal scrolling outside wrapper.
- `.crm-empty-state[data-entity="empty-state"]` lives inside registry card/shell but outside `<table>/<thead>/<tbody>/<tr>` markup and is hidden in demo mode via native `hidden` (unless an explicit demo-visible exception is documented).
- Reset in filter forms uses `type="button"` + `data-action="reset-filters"`.
- `crm-static.js` remains global-only reusable behavior (row `data-href`, generic form/reset helpers, prevention helpers), while registry-specific rendering/logic is not allowed; UMI renders registry rows server-side.
