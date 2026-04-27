# CRM static partials

Готовые HTML-фрагменты, основанные на текущей вёрстке `static-uikit/pages/*.html`.

- Это **не include-система** и **не build step**.
- Эти partials не подключаются автоматически.
- Фрагменты подготовлены для безопасного переноса в UMI-шаблоны (`layout`, `partials`, `pages`).
- Включены UMI-ready `data-*` hooks (`data-page`, `data-entity`, `data-id`, `data-href`, `data-action`, `data-filter`, `data-form`, `data-status`).
