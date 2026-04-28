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
