# static-uikit

Отдельная статическая HTML5 + UIkit версия CRM для интеграции в UMI.CMS.

## Важно
- React/Vite версия в `src/` остается рабочим эталоном и не заменяется.
- `static-uikit` — независимый deliverable для шаблонной интеграции.
- Используется единый дизайн: **Investica Light Executive**.

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
