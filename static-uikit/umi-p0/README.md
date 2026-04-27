# UMI P0 extraction pack

`static-uikit/umi-p0/` — это extraction pack для подготовки первого шаблонного набора под UMI.CMS, а не runtime-версия.

## Что находится в папке
- `layout/` — базовый layout-шаблон (`base.html`) для сборки страниц.
- `partials/` — переиспользуемые P0-фрагменты (sidebar, topbar, header, filters, table, badges, actions, empty-state).
- `pages/` — content-area шаблоны для P0-страниц без полного HTML shell.

## Важные ограничения
- `manifest.json` — machine-readable состав P0 pack (layout/partials/pages/constraints).
- `integration-inventory.json` — inventory маршрутов, сущностей, actions, forms, filters и statuses для UMI-интеграции.
- `HANDOFF_CHECKLIST.md` — короткий pre-handoff checklist перед передачей шаблонов в UMI-разработку.
- Standalone demo pages остаются в `static-uikit/pages/` и не заменяются.
- Source fragments в `static-uikit/partials/` остаются эталонными фрагментами.
- `umi-p0` не подключается автоматически и не требует build step.
- Плейсхолдеры вида `{{ ... }}` и комментарии `<!-- UMI TODO -->` демонстрационные: их нужно заменить на реальный синтаксис UMI.CMS проекта.
- Assets должны оставаться локальными; пути нужно адаптировать под web-root проекта.
- React/Vite код из `src/` и runtime-часть приложения не переносится в `umi-p0`.

## Рекомендованный порядок переноса в UMI.CMS
1. `layout/base.html`, затем `partials/sidebar.html` и `partials/topbar.html`.
2. `pages/dashboard.html`.
3. `pages/subjects.html`.
4. `pages/subject-card.html`.
5. `pages/requests.html`.
6. `pages/compliance.html` и `pages/compliance-card.html`.
7. `pages/trading.html`.
8. `pages/error.html`.
