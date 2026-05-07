# CSS Architecture Audit

**Проект:** Инвестика CRM — static-uikit  
**Дата аудита:** 2026-05-07  
**Источник истины:** `static-uikit/` (только эта директория)  
**Аудитор:** CSS Architecture Review  
**Версия:** 1.0

---

## A. Executive Summary (Краткое резюме)

### Общее состояние CSS

CSS-архитектура проекта **в целом здоровая и хорошо структурированная**. Используется многоуровневый подход (base → layout → components → pages → responsive → print), единая точка входа `crm-static.css`, CSS Custom Properties для дизайн-токенов и последовательное именование классов с префиксом `.crm-*`.

### Главные риски

| # | Риск | Серьёзность |
|---|------|-------------|
| 1 | `crm-static.css` содержит CSS-правила после `@import` (нарушение роли entrypoint) | P1 |
| 2 | Двойная загрузка CSS: `subject-register.html` и `subject-edit-individual.html` линкуют файлы, уже включённые в `crm-static.css` | P1 |
| 3 | Три страничных CSS-файла (`auth.css`, `agents.css`, `depository.css`) не импортированы в `crm-static.css` — несогласованность | P1 |
| 4 | `print.css` намеренно пустой — комментарий о незавершённом рефакторе | P2 |
| 5 | Повторяющийся паттерн «панель фильтров + таблица + футер» в 15+ файлах страниц — высокий потенциал консолидации компонентов | P2 |
| 6 | `subject-card.css` (50,823 байт) — самый крупный файл страницы, возможно содержит стили, которые должны быть компонентами | P3 |

### Главные безопасные выигрыши

1. Перенести CSS-правила из `crm-static.css` в `layout/sidebar.css` — 4 правила, нулевой риск
2. Исправить двойную загрузку CSS в `subject-register.html` и `subject-edit-individual.html`
3. Добавить `auth.css`, `agents.css`, `depository.css` в импорты `crm-static.css` ИЛИ задокументировать причину изолированного подключения

### Прямой ответ на вопрос «объединить в один pages.css / один components.css?»

**Нет. Ручное слияние сейчас — плохая идея.** Причины:

- 21 файл страниц (~230 КБ) содержит разные специфичности, scope-селекторы и цвета под каждую страницу. Ручное слияние создаст риск конфликтов каскада и регрессий.
- Модульная структура — это ценность при исправлении ошибок: разработчик точно знает, где искать.
- Для UMI.CMS лучше передать сгруппированные импорты или задокументированный bundle, а не один монолитный файл.

**Рекомендация: сохранить модульные исходники, задокументировать UMI-бандл.** Подробнее в разделах K, L, M.

---

## B. Scope (Область аудита)

### Инспектированные файлы и папки

- `static-uikit/assets/css/crm-static.css` — точка входа
- `static-uikit/assets/css/base/` — шрифты, токены, reset
- `static-uikit/assets/css/layout/` — app, sidebar, topbar, page
- `static-uikit/assets/css/components/` — badges, buttons, cards, filters, forms, modals, tables, tabs
- `static-uikit/assets/css/pages/` — 21 файл страниц
- `static-uikit/assets/css/document-templates/` — document-template-base, document-template-forms, zayavlenie-o-prisoedinenii-fl
- `static-uikit/assets/css/responsive.css`
- `static-uikit/assets/css/print.css`
- `static-uikit/assets/css/uikit.min.css` — внешний фреймворк (только наличие; содержимое не аудируется)
- `static-uikit/pages/*.html` — CSS-ссылки и body data-page атрибуты
- `static-uikit/assets/document-templates/*.html` — CSS-ссылки
- `static-uikit/assets/js/crm-static.js` — JS/CSS контракт
- `static-uikit/assets/js/pages/*.js` — JS/CSS контракт страниц
- `static-uikit/README.md` — только для контекста

### Исключённые из аудита

- `src/` — React/Vite приложение, не источник истины
- `public/` — сборочные артефакты
- `partials/` — старые шаблоны
- Старые пакеты UMI/P0/P1
- Старые манифесты и валидаторы
- `uikit.min.css` — сторонний фреймворк, не изменяется
- `.docx`-файлы в document-templates

---

## C. Current CSS Architecture Map (Карта архитектуры)

### Точки входа

| Файл | Роль | Примечание |
|------|------|-----------|
| `crm-static.css` | Главный entrypoint | Импортирует все слои. ⚠️ Содержит 4 CSS-правила после @import — нарушение роли |
| `pages/auth.css` | Entrypoint аутентификации | Линкуется напрямую login/register/forgot-password. **НЕ импортируется** в crm-static.css |
| `pages/agents.css` | Entrypoint страницы агентов | Линкуется напрямую agents.html. **НЕ импортируется** в crm-static.css |
| `pages/depository.css` | Entrypoint страницы депозитария | Линкуется напрямую depository.html. **НЕ импортируется** в crm-static.css |
| `document-templates/document-template-base.css` | Entrypoint печатных шаблонов | Все document templates; изолирован от app CSS |
| `document-templates/document-template-forms.css` | Стили форм шаблонов | 6 из 7 шаблонов |
| `document-templates/zayavlenie-o-prisoedinenii-fl.css` | Специфичный шаблон | Только zayavlenie-o-prisoedinenii-fl.html |

### Слои (cascade layers)

```
uikit.min.css          ← внешний фреймворк (284 KB)
    ↓
crm-static.css         ← entrypoint, импортирует:
  ├── base/fonts.css
  ├── base/tokens.css
  ├── base/reset.css
  ├── layout/app.css
  ├── layout/sidebar.css
  ├── layout/topbar.css
  ├── layout/page.css
  ├── components/cards.css
  ├── components/buttons.css
  ├── components/forms.css
  ├── components/badges.css
  ├── components/tables.css
  ├── components/tabs.css
  ├── components/filters.css
  ├── components/modals.css
  ├── pages/dashboard.css
  ├── pages/subjects.css
  ├── pages/subject-card.css
  ├── pages/contract-wizard.css
  ├── pages/contract-edit.css
  ├── pages/subject-register.css
  ├── pages/subject-edit.css
  ├── pages/brokerage.css
  ├── pages/trust-management.css
  ├── pages/requests.css
  ├── pages/back-office.css
  ├── pages/archive.css
  ├── pages/compliance.css
  ├── pages/middle-office.css
  ├── pages/trading.css
  ├── pages/document-wizard.css
  ├── pages/error.css
  ├── pages/search-results.css
  ├── responsive.css
  └── print.css
  + 4 CSS-правила (inline — должны быть в layout/sidebar.css)
```

### Прямые ссылки из HTML-страниц

| HTML-страница | Прямо линкует | Примечание |
|---------------|---------------|-----------|
| `login.html` | `pages/auth.css` | Правильно: auth-страница без app layout |
| `register.html` | `pages/auth.css` | Правильно |
| `forgot-password.html` | `pages/auth.css` | Правильно |
| `agents.html` | `pages/agents.css` | ⚠️ Не импортируется в crm-static.css |
| `depository.html` | `pages/depository.css` | ⚠️ Не импортируется в crm-static.css |
| `subject-register.html` | `pages/subject-register.css` | ❌ Двойная загрузка — файл уже в crm-static.css |
| `subject-edit-individual.html` | `pages/subject-edit.css` | ❌ Двойная загрузка — файл уже в crm-static.css |
| Все остальные (21 страница) | только `uikit.min.css` + `crm-static.css` | Правильно |

### Document template CSS (изолирован)

Все 7 HTML-шаблонов используют исключительно CSS из `document-templates/`. Связей с `crm-static.css` нет — **это правильно**.

---

## D. Findings by Priority (Находки по приоритету)

### P0 — Блокеры (нет: критических блокеров не выявлено)

Нет находок уровня P0.

---

### P1 — Исправить до передачи (handoff)

#### P1-01 — CSS-правила в crm-static.css после @import

`crm-static.css` должен быть чистым entrypoint (только @import). Однако строки 41–73 содержат CSS-правила:

```css
.crm-sidebar-brand-link { ... }
.crm-sidebar-brand-link:hover { ... }
.crm-sidebar-brand-link:focus-visible { ... }
.crm-sidebar .crm-nav-icon-img { ... }
.crm-sidebar .crm-nav-link:hover .crm-nav-icon-img, ... { ... }
```

Эти правила относятся к боковой панели навигации и должны быть в `layout/sidebar.css`.

**Риск:** При добавлении новых @import ниже этих правил порядок каскада может измениться непредсказуемо.

---

#### P1-02 — Двойная загрузка CSS

| Страница | Прямой линк | Уже в crm-static.css |
|----------|-------------|----------------------|
| `subject-register.html` | `pages/subject-register.css` | Да (строка 24) |
| `subject-edit-individual.html` | `pages/subject-edit.css` | Да (строка 26) |

CSS-файл загружается дважды: один раз через `crm-static.css` (со всеми остальными страницами) и второй раз — прямым `<link>`. Браузер применяет правила дважды. Это лишний сетевой запрос и потенциальные проблемы со специфичностью.

---

#### P1-03 — Три страничных CSS вне crm-static.css (несогласованность)

`agents.css` и `depository.css` линкуются страницами напрямую, но **не импортированы** в `crm-static.css`. Если эти страницы когда-либо окажутся загружены без явного `<link>` (например, через UMI include), стили не применятся.

`auth.css` — случай исключительный: страницы авторизации не имеют app layout, поэтому изоляция оправдана. Но это должно быть задокументировано.

---

### P2 — Безопасные улучшения

#### P2-01 — print.css намеренно пустой

Файл (77 байт) содержит только комментарий о незавершённом рефакторе. Print-стили, по всей видимости, рассредоточены по файлам страниц. Необходима ревизия и консолидация.

#### P2-02 — Повторяющийся паттерн фильтров/таблиц в страничных файлах

Практически каждый страничный CSS содержит вариации:
- `.crm-registry-shell` (или `.crm-mo-shell`, `.crm-dep-shell`)
- `.crm-registry-filters` (панель фильтров)
- `.crm-table` стилизация (фоны, отступы ячеек)
- Footer пагинации с `.crm-footer-chip`

Некоторые из этих вариаций — намеренные переопределения цветов и отступов для конкретной страницы. Другие могут быть кандидатами на вынесение в компонент (см. раздел G).

#### P2-03 — Токены дублируются в layout-файлах

Файлы `layout/sidebar.css` и `layout/topbar.css` переопределяют `:root` переменные (`--crm-sidebar-w`, `--crm-topbar-h`, `--crm-page-max-w` и др.). Эти значения уже определены в `base/tokens.css`. Переопределение создаёт вопрос: какое значение считать «истиной»?

#### P2-04 — Высокий вес subject-card.css

`pages/subject-card.css` (50,823 байт) — аномально крупный файл. Вероятно, содержит стили, которые могли бы стать компонентами (карточки профиля, секции вкладок, грид полей).

---

### P3 — Будущие задачи (пост-handoff)

#### P3-01 — Консолидация паттерна «страничный реестр»

Общий скелет страниц-реестров (subjects, agents, brokerage и др.) почти идентичен. Потенциально можно извлечь `.crm-registry-shell`, `.crm-registry-header`, `.crm-registry-footer-nav` в `components/`.

#### P3-02 — UMI handoff bundle

Создать документацию с группами CSS для передачи в UMI.CMS (см. раздел L).

#### P3-03 — Аудит responsive.css

`responsive.css` (20,022 байт) большой и содержит page-специфичные медиа-правила (`body[data-page="middle-office-reports"] .crm-mo-split`). Часть медиа-правил должна быть в страничных файлах.

---

## E. CSS Inventory Table (Инвентарь)

### Основные файлы

| Файл | Размер | Роль | Импортируется в crm-static.css | Примечание |
|------|--------|------|-------------------------------|-----------|
| `crm-static.css` | 2,120 Б | Entrypoint | — | ⚠️ Содержит правила |
| `responsive.css` | 20,022 Б | Медиа-запросы | Да (строка 38) | |
| `print.css` | 77 Б | Печать | Да (строка 39) | Намеренно пуст |
| `uikit.min.css` | 284,160 Б | UIkit фреймворк | Нет | Только прямой `<link>` |

### Слой Base

| Файл | Размер | Содержимое |
|------|--------|-----------|
| `base/fonts.css` | 2,474 Б | @font-face Inter, Inter Tight (400–700) |
| `base/tokens.css` | 2,900 Б | CSS Custom Properties, UMI-алиасы |
| `base/reset.css` | 591 Б | box-sizing, body базовые стили |

### Слой Layout

| Файл | Размер | Содержимое |
|------|--------|-----------|
| `layout/app.css` | 5,866 Б | App shell, sidebar, topbar базовые стили |
| `layout/sidebar.css` | 2,215 Б | Sidebar уточнения, `:root` overrides |
| `layout/topbar.css` | 6,480 Б | Topbar, поиск, user info, `:root` overrides |
| `layout/page.css` | 3,429 Б | Page container, grids, launcher, sticky actions |

### Слой Components

| Файл | Размер | Содержимое |
|------|--------|-----------|
| `components/badges.css` | 872 Б | `.crm-badge` + варианты |
| `components/buttons.css` | 1,578 Б | `.crm-button-*`, `.uk-button` override |
| `components/cards.css` | 7,765 Б | Cards, toolbar, option-grid, check-rows, radio-tiles |
| `components/filters.css` | 7,552 Б | Filter panel, dropdown, trigger, options |
| `components/forms.css` | 2,378 Б | Inputs, selects, labels, date fields, radio |
| `components/modals.css` | 140 Б | Modal dialog border/radius |
| `components/tables.css` | 5,803 Б | Table wrapper, head, body, col widths, empty state, sortable |
| `components/tabs.css` | 447 Б | `.crm-tabs`, `.crm-tab`, UIkit tab override |

### Слой Pages (импортированы через crm-static.css)

| Файл | Размер | Страница(ы) |
|------|--------|------------|
| `pages/dashboard.css` | 8,256 Б | dashboard.html |
| `pages/subjects.css` | 11,957 Б | subjects.html |
| `pages/subject-card.css` | 50,823 Б | subject-card.html, subject-card-individual.html |
| `pages/contract-wizard.css` | 3,546 Б | contract-wizard.html |
| `pages/contract-edit.css` | 1,098 Б | contract-edit.html |
| `pages/subject-register.css` | 21,450 Б | subject-register.html |
| `pages/subject-edit.css` | 14,831 Б | subject-edit.html, subject-edit-individual.html |
| `pages/brokerage.css` | 11,072 Б | brokerage.html |
| `pages/trust-management.css` | 9,142 Б | trust-management.html |
| `pages/requests.css` | 9,954 Б | requests.html |
| `pages/back-office.css` | 9,546 Б | back-office.html |
| `pages/archive.css` | 8,195 Б | archive.html |
| `pages/compliance.css` | 22,375 Б | compliance.html, compliance-card.html |
| `pages/middle-office.css` | 15,786 Б | middle-office-clients.html, middle-office-reports.html |
| `pages/trading.css` | 19,728 Б | trading.html, trading-card.html |
| `pages/document-wizard.css` | 4,002 Б | document-wizard.html |
| `pages/error.css` | 113 Б | error.html |
| `pages/search-results.css` | 7,897 Б | search-results.html |

### Слой Pages (НЕ импортированы в crm-static.css)

| Файл | Размер | Страница(ы) | Линкуется |
|------|--------|------------|----------|
| `pages/auth.css` | 4,129 Б | login, register, forgot-password | Прямой `<link>` ✓ оправдано |
| `pages/agents.css` | 11,004 Б | agents.html | Прямой `<link>` ⚠️ несогласованность |
| `pages/depository.css` | 11,524 Б | depository.html | Прямой `<link>` ⚠️ несогласованность |

### Document Template CSS (изолированы от app CSS)

| Файл | Размер | Используется |
|------|--------|-------------|
| `document-templates/document-template-base.css` | 1,532 Б | Все 7 HTML-шаблонов |
| `document-templates/document-template-forms.css` | 3,876 Б | 6 из 7 шаблонов |
| `document-templates/zayavlenie-o-prisoedinenii-fl.css` | 2,527 Б | Только zayavlenie |

---

## F. Page CSS Audit Table (Аудит страничных CSS)

| CSS файл | Страница(ы) | Качество scope | Утечка компонентов | Кандидат на консолидацию | Рекомендация |
|----------|-------------|---------------|-------------------|--------------------------|-------------|
| `dashboard.css` | dashboard | Хорошее — data-page scope | Умеренная (card grids) | Нет | Оставить |
| `subjects.css` | subjects | Хорошее | Умеренная (badge colors) | Частично | Оставить; badge-цвета → компонент |
| `subject-card.css` | subject-card, subject-card-individual | Хорошее | Высокая (profile header, tabs, form grids) | Частично | Крупный файл — P3 ревизия |
| `contract-wizard.css` | contract-wizard | Хорошее | Низкая | Нет | Оставить |
| `contract-edit.css` | contract-edit | Хорошее | Низкая | Нет | Оставить |
| `subject-register.css` | subject-register | Хорошее | Умеренная (wizard steps) | Нет | Убрать прямой `<link>` из HTML |
| `subject-edit.css` | subject-edit, subject-edit-individual | Хорошее | Умеренная | Нет | Убрать прямой `<link>` из HTML |
| `brokerage.css` | brokerage | Хорошее | Умеренная (table styles) | Частично | Оставить |
| `trust-management.css` | trust-management | Хорошее | Умеренная | Частично | Оставить |
| `requests.css` | requests | Хорошее | Умеренная | Нет | Оставить |
| `back-office.css` | back-office | Хорошее | Умеренная | Частично | Оставить |
| `archive.css` | archive | Хорошее | Умеренная | Частично | Оставить |
| `compliance.css` | compliance, compliance-card | Хорошее | Высокая (master-detail) | Нет | Крупный файл — P3 ревизия |
| `middle-office.css` | middle-office-clients, middle-office-reports | Хорошее | Умеренная | Нет | Оставить |
| `trading.css` | trading, trading-card | Хорошее | Умеренная (terminal UI) | Нет | Оставить |
| `document-wizard.css` | document-wizard | Хорошее | Низкая | Нет | Оставить |
| `error.css` | error | Хорошее | Минимальная | — | Оставить |
| `search-results.css` | search-results | Хорошее | Умеренная | Нет | Оставить |
| `auth.css` | login, register, forgot-password | Хорошее — изолированные страницы | Низкая | — | Задокументировать изоляцию |
| `agents.css` | agents | Хорошее | Умеренная | Частично | Добавить в crm-static.css или задокументировать |
| `depository.css` | depository | Хорошее | Умеренная | Частично | Добавить в crm-static.css или задокументировать |

**Примечания по scope:**
- Большинство страничных файлов не используют жёсткую scope-изоляцию через `body[data-page="…"]` или `[data-page="…"]` — они полагаются на уникальные имена классов (`.crm-<page>-*`). Это нормально для статического UI reference, но в UMI.CMS важно убедиться, что эти классы не конфликтуют.
- Утечка компонентов: многие страничные файлы стилизуют общие паттерны (таблицы, фильтры, пагинация) с минимальными отличиями. Это осознанный выбор (page-specific palette), не баг.

---

## G. Component CSS Audit Table (Аудит компонентных CSS)

| Компонент | Файл | Переиспользование | Переопределения из pages | Границы чёткие | Рекомендация |
|-----------|------|------------------|------------------------|----------------|-------------|
| Badges | `components/badges.css` | Высокое | Страничные файлы переопределяют цвета | Чёткие | Добавить варианты цветов для страниц в компонент |
| Buttons | `components/buttons.css` | Высокое | Минимальные | Чёткие | Ок |
| Cards | `components/cards.css` | Высокое | Умеренные | Чёткие | Ок |
| Filters | `components/filters.css` | Высокое | Умеренные (фоны, padding) | Чёткие | Ок — page-specific palette оправдана |
| Forms | `components/forms.css` | Высокое | Умеренные | Чёткие | Ок |
| Modals | `components/modals.css` | Среднее | Минимальные | ⚠️ Файл 140Б — очень мало | Расширить или убедиться что UIkit покрывает остальное |
| Tables | `components/tables.css` | Высокое | Высокие (фоны таблиц, отступы ячеек) | Чёткие | Ок — page palette оправдана |
| Tabs | `components/tabs.css` | Среднее | Минимальные | Чёткие | Ок |
| Registry shell | *нет компонента* | Высокое | — | ❌ Не выделен | P3: рассмотреть `.crm-registry-shell` как компонент |
| Footer pagination | *нет компонента* | Высокое | — | ❌ Не выделен | P3: рассмотреть `.crm-footer-chip` + nav как компонент |
| Master-detail | *нет компонента* | Среднее (compliance, middle-office) | — | ❌ Не выделен | P3: рассмотреть |
| Upload/dropzone | В subject-card.css | Низкое | — | ⚠️ Заперт в page CSS | P3: рассмотреть вынесение |
| FIAS-адрес | В subject-register/edit | Низкое | — | ⚠️ Заперт в page CSS | P3: рассмотреть |
| Profile hero | В subject-card.css | Низкое | — | ⚠️ Заперт в page CSS | P3: рассмотреть |

---

## H. Duplicate / Overlap Findings (Дубликаты и перекрытия)

### Методология

Аудит проведён статически через анализ структуры файлов и именования классов. Без автоматического парсинга CSS — находки основаны на высокой уверенности в паттернах, но не на инструментальном dedupe.

### Таблица находок

| Находка | Затронутые файлы | Признак | Риск | Действие |
|---------|-----------------|---------|------|---------|
| `.crm-registry-shell` — padding/border overrides | subjects, agents, back-office, archive, brokerage, trust-management, requests + другие | Каждый страничный файл содержит вариации стилей `.crm-*-shell` | Умеренный | Должен стать компонентом с модификаторами |
| `.crm-footer-chip.is-active` стили | Большинство страничных файлов | Чип пагинации стилизуется повторно в каждой странице | Умеренный | Кандидат на вынесение в `components/tables.css` или отдельный `components/pagination.css` |
| Badge-цвета (success/danger/warning/info) | `components/badges.css` + страничные файлы | Страничные файлы повторно объявляют цветовые варианты бейджей | Низкий | Намеренная page-specific palette; не трогать |
| `.crm-table .uk-table th/td` стили | `components/tables.css` + почти все страничные файлы | Фоны заголовков таблиц переопределяются для каждой страницы | Низкий | Оправдано как page palette; задокументировать |
| `:root` variables overrides | `layout/sidebar.css` + `layout/topbar.css` | Переопределяют `--crm-sidebar-w`, `--crm-topbar-h` из tokens | Средний | Возможно создаёт путаницу — какой файл «истина»? Уточнить или убрать дубли |
| Правила sidebar в crm-static.css | `crm-static.css` строки 41-73 + `layout/sidebar.css` | Sidebar-правила в двух местах | Средний | P1: перенести в sidebar.css |
| `.crm-nav-link.active` / `.is-active` | `layout/app.css` + `layout/sidebar.css` + JS | Потенциально две одинаковые state-классы | Низкий | Требует проверки — JS использует `.active`, CSS определяет оба |

### Важные предупреждения

- Не рекомендуется автоматическая очистка дублей на основе только этого аудита
- Многие «дубликаты» — намеренные page-specific palette overrides
- Перед любой консолидацией требуется визуальное тестирование

---

## I. Dead CSS Candidate Table (Кандидаты на неиспользуемый CSS)

**Важно:** Отсутствие класса в статическом HTML не означает, что он не используется. Многие классы управляются через JS, генерируются динамически или являются хуками для UMI.CMS.

### Высокая уверенность в неиспользовании

| Класс / Правило | Файл | Основание | Риск удаления |
|----------------|------|----------|--------------|
| `print.css` (весь файл) | `print.css` | Намеренно пуст, только комментарий | Низкий — но нельзя удалять entrypoint |

### Возможно неиспользуемые (требуют ручной проверки)

| Класс | Файл | Основание | Риск |
|-------|------|----------|------|
| `.crm-launcher-*` классы | `layout/page.css` | Launcher page — есть ли соответствующая HTML-страница? | Средний |
| `.crm-split-view` | `layout/page.css` | Не обнаружен в просмотренных страницах | Средний |
| `.crm-c24-*` токены (deprecated) | `base/tokens.css` | Помечены как deprecated, алиасы C24 | Средний |

### JS/State/Generated — не удалять

| Класс | Причина |
|-------|---------|
| `.is-active` | JS-контракт: binary pills, check rows |
| `.is-selected` | JS-контракт: option cards, radio tiles, report items, filter options |
| `.is-invalid` | JS-контракт: form validation |
| `.is-disabled` | JS-контракт: pagination buttons |
| `.is-filter-hidden` | JS-контракт: фильтрация строк таблицы |
| `.is-page-hidden` | JS-контракт: пагинация строк таблицы |
| `.is-filter-menu-open` | JS-контракт: состояние панели фильтров |
| `.is-sorted-asc` / `.is-sorted-desc` | JS-контракт: сортировка таблицы |
| `.sidebar-open` | JS-контракт: mobile sidebar |
| `.active` (nav) | JS-контракт: активная ссылка навигации |
| `.expanded` (nav group) | JS-контракт: раскрытая группа навигации |
| `.crm-modal-open` (body) | JS-контракт: trading-card modal |
| `.is-visible` (toast) | JS-контракт: trading-card notification |

### UMI/Handoff hooks — не удалять

| Класс / Атрибут | Причина |
|----------------|---------|
| `body[data-page="*"]` | Хук для JS инициализации + CSS scope |
| `[data-sidebar-toggle]` | Хук мобильного тоггла |
| `[data-sortable-table]` | Хук сортировки таблицы |
| `[data-page-size-group]` | Хук пагинации |
| `[data-filter]` | Хук системы фильтров |
| `[data-filter-search]` | Хук поиска в фильтрах |
| `[data-auth-form]` | Хук аутентификации |
| `[data-auth-required]` | Хук обязательных полей |
| `[data-date-trigger]` | Хук date picker |
| `[data-action="*"]` | Хуки действий (reset-filters, toggle-request-create и др.) |
| `[data-role="*"]` | Хуки ролей (terminal-password-modal) |
| `.crm-umi-*` токены | UMI.CMS алиасы |

---

## J. JS/CSS Contract "Do Not Remove/Rename" List

Следующие CSS-классы и data-атрибуты используются в JavaScript и должны оставаться неизменными:

### Из crm-static.js

| Класс / Атрибут | Файл JS | Поведение | Риск изменения |
|----------------|---------|----------|---------------|
| `.crm-app` | crm-static.js | Корневой контейнер приложения | Критический |
| `[data-sidebar-toggle]` | crm-static.js | Кнопка мобильного меню | Критический |
| `.crm-sidebar` | crm-static.js | Sidebar DOM element | Критический |
| `.sidebar-open` | crm-static.js | Класс на `.crm-app` при открытом sidebar | Критический |
| `.crm-option-card.is-selected` | crm-static.js | Выбор карточки-опции | Критический |
| `.crm-binary-control label.is-active` | crm-static.js | Выбор бинарной кнопки | Критический |
| `.crm-radio-tile.is-selected` | crm-static.js | Выбор radio tile | Критический |
| `.crm-check-row.is-active` | crm-static.js | Состояние checkbox строки | Критический |
| `.is-invalid` | crm-static.js | Валидация формы | Критический |
| `.crm-filter-panel` | crm-static.js | Корень панели фильтров | Критический |
| `[data-filter]` | crm-static.js | Поле фильтра | Критический |
| `[data-filter-search]` | crm-static.js | Поле поиска в фильтрах | Критический |
| `[data-filter-option][data-filter-value]` | crm-static.js | Опция фильтра | Критический |
| `.crm-filter-menu` | crm-static.js | Контейнер выпадающего фильтра | Критический |
| `.crm-filter-menu[open]` | crm-static.js | Открытый dropdown фильтра | Критический |
| `.crm-filter-trigger-value` | crm-static.js | Отображение выбранного значения | Критический |
| `.crm-filter-option` | crm-static.js | Элемент dropdown-меню фильтра | Критический |
| `.is-filter-hidden` | crm-static.js | Скрытая строка (фильтрация) | Критический |
| `.is-page-hidden` | crm-static.js | Скрытая строка (пагинация) | Критический |
| `.crm-footer-chip.is-active[data-page-size-value]` | crm-static.js | Активный чип размера страницы | Критический |
| `[data-page-size-group]` | crm-static.js | Корень пагинации | Критический |
| `[data-pagination-nav]` | crm-static.js | Кнопки пагинации prev/next | Критический |
| `.is-disabled` | crm-static.js | Заблокированные кнопки пагинации | Критический |
| `[data-sortable-table]` | crm-static.js | Таблица с сортировкой | Критический |
| `.crm-registry-table` | crm-static.js | Обёртка реестра таблицы | Критический |
| `.crm-registry-empty`, `.crm-empty-state` | crm-static.js | Пустое состояние | Критический |
| `[data-entity="empty-state"]` | crm-static.js | Пустое состояние (alt) | Критический |
| `.crm-nav-link[href]` | crm-static.js | Ссылки навигации | Критический |
| `.crm-nav-link.active` | crm-static.js | Активная ссылка | Критический |
| `.crm-nav-group` | crm-static.js | Группа навигации | Критический |
| `.crm-nav-group.expanded` | crm-static.js | Раскрытая группа | Критический |
| `.crm-nav-group.active` | crm-static.js | Группа с активным дочерним | Критический |
| `.crm-nav-group-toggle` | crm-static.js | Кнопка раскрытия группы | Критический |
| `.crm-nav-submenu` | crm-static.js | Подменю | Критический |
| `[data-auth-form]` | crm-static.js | Форма аутентификации | Критический |
| `[data-auth-required]` | crm-static.js | Обязательное поле | Критический |
| `[data-auth-error-for]` | crm-static.js | Сообщение об ошибке поля | Критический |
| `[data-auth-alert]` | crm-static.js | Алерт формы | Критический |
| `[data-action="toggle-request-create"]` | crm-static.js | Тоггл панели создания заявки | Критический |
| `[data-action="close-request-create"]` | crm-static.js | Закрытие панели заявки | Критический |
| `[data-action="reset-filters"]` | crm-static.js | Сброс фильтров | Критический |
| `[data-date-trigger]`, `[data-date-picker-trigger]` | crm-static.js | Открытие date picker | Критический |
| `body[data-page="*"]` | crm-static.js + все page JS | Идентификатор страницы | Критический |

### Из страничных JS-файлов

| Класс / Атрибут | Файл JS | Поведение |
|----------------|---------|----------|
| `[data-role="terminal-password-modal"]` | trading-card.js | Модал пароля терминала |
| `.crm-modal-open` (на body) | trading-card.js | Блокировка прокрутки при модале |
| `.is-visible` (toast) | trading-card.js | Уведомление |
| `[data-action="issue-terminal"]` | trading-card.js | Кнопка выдачи терминала |
| `[data-action="edit-trading-params"]` | trading-card.js | Редактирование параметров |
| `[data-action="reset-terminal-password"]` | trading-card.js | Сброс пароля |
| `[data-action="confirm-terminal-password"]` | trading-card.js | Подтверждение пароля |
| `[data-page="middle-office-*"]` | middle-office.js | Scope middle office страниц |
| `[data-page="trading-card"]` | trading-card.js | Scope trading card страницы |
| Хуки в subject-card.js | subject-card.js | Загрузка документов, вкладки |
| Хуки в subject-register.js | subject-register.js | Wizard steps, FIAS |
| Хуки в fias-address.js | fias-address.js | Адресный модуль ФИАС |
| Хуки в document-wizard.js | document-wizard.js | Мастер создания документов |

---

## K. Document Template CSS Recommendation

### Текущее состояние

- Document template CSS **полностью изолирован** от app UI CSS — ни один шаблонный CSS не импортируется через `crm-static.css`
- Все 7 HTML-шаблонов линкуют только файлы из `document-templates/`
- Структура: `document-template-base.css` (база) + `document-template-forms.css` (типовые формы) + специфичный CSS для уникальных шаблонов
- CSS использует независимые `:root` переменные (`--text`, `--line`, `--muted`, `--page-width` и т.д.) — не связан с `crm-static` токенами

### Риски

| Риск | Серьёзность |
|------|-------------|
| Слияние document-template CSS с app CSS нарушит print layout | Критический |
| Разные системы токенов (document templates vs app) — намеренно | Принят |
| `print.css` в app пустой — document print styles только в document-templates | Нужно задокументировать |

### Рекомендация

**Оставить document template CSS полностью изолированным.** Это правильное архитектурное решение:

1. Печатные документы имеют A4-размер, mm-единицы и независимый typography
2. В UMI.CMS печатные шаблоны будут генерироваться на backend (PDF/Puppeteer/WeasyPrint) — им не нужен app CSS
3. Не объединять `document-templates/*.css` с `crm-static.css` ни при каких обстоятельствах

**Для UMI handoff:** передать `document-templates/` как отдельный bundle, независимый от основного CSS.

---

## L. UMI.CMS CSS Handoff Recommendation

### Анализ вариантов

#### Вариант A: Передать текущие модульные файлы как есть

| Аспект | Оценка |
|--------|--------|
| Преимущества | Полная прозрачность, легко обновлять отдельные компоненты |
| Риски | UMI-разработчик должен понимать зависимости между файлами |
| Сложность handoff | Средняя |
| Риск регрессий | Низкий |
| **Рекомендация** | ✅ Подходит как base, но нужна документация |

#### Вариант B: Ручное слияние в один pages.css / один components.css

| Аспект | Оценка |
|--------|--------|
| Преимущества | Меньше файлов для UMI |
| Риски | Ручное слияние 21 файла (~230 КБ) — высокий риск конфликтов каскада и специфичности |
| Сложность handoff | Высокая |
| Риск регрессий | **Высокий** |
| **Рекомендация** | ❌ Не рекомендуется |

#### Вариант C: Сохранить модульные исходники, определить UMI-группы

| Аспект | Оценка |
|--------|--------|
| Преимущества | Исходники остаются читаемыми; UMI получает чёткие группы для подключения |
| Риски | Требует однократного написания документации |
| Сложность handoff | Низкая |
| Риск регрессий | Низкий |
| **Рекомендация** | ✅ **Лучший вариант** |

#### Вариант D: Оставить как есть без дополнительной документации

| Аспект | Оценка |
|--------|--------|
| Преимущества | Нет работы сейчас |
| Риски | UMI-разработчик может подключить файлы в неправильном порядке |
| Сложность handoff | Высокая для UMI-интегратора |
| **Рекомендация** | ❌ Не рекомендуется |

---

### Рекомендуемая структура для UMI.CMS

**Передать как Вариант C:** сохранить модульные исходники в `static-uikit/assets/css/`, задокументировать порядок подключения.

#### Рекомендуемый порядок загрузки CSS в UMI

```html
<!-- 1. UIkit framework (CDN или локально) -->
<link rel="stylesheet" href="assets/css/uikit.min.css">

<!-- 2. CRM Static — главный entrypoint (все app стили) -->
<link rel="stylesheet" href="assets/css/crm-static.css">

<!-- 3. Page-specific CSS (только для страниц не в crm-static.css) -->
<!-- Только для auth-страниц (нет app layout): -->
<link rel="stylesheet" href="assets/css/pages/auth.css">
<!-- Только для agents и depository (до решения P1-03): -->
<link rel="stylesheet" href="assets/css/pages/agents.css">
<link rel="stylesheet" href="assets/css/pages/depository.css">
```

#### Для печатных шаблонов (отдельно):

```html
<!-- Только в document template pages — НЕ в app pages -->
<link rel="stylesheet" href="assets/css/document-templates/document-template-base.css">
<link rel="stylesheet" href="assets/css/document-templates/document-template-forms.css">
<!-- При необходимости: -->
<link rel="stylesheet" href="assets/css/document-templates/zayavlenie-o-prisoedinenii-fl.css">
```

### Миграционные заметки для UMI

1. `crm-static.css` использует `@import` — убедиться что UMI сервер подаёт все файлы из `assets/css/`
2. Если UMI собирает CSS в bundle — сохранить порядок файлов строго как в `crm-static.css`
3. Все `data-*` атрибуты в HTML-шаблонах обязательны — не удалять при переносе в UMI templates/loops
4. JS-файлы из `assets/js/` должны загружаться после DOM (defer или body конец)
5. `assets/fonts/` должны быть доступны по пути, указанному в `base/fonts.css`

### Do-not-merge предупреждения

- ❌ Никогда не объединять `document-templates/*.css` с `crm-static.css`
- ❌ Никогда не загружать `print.css` (app) и `document-template-base.css` на одной странице
- ❌ Не загружать `auth.css` на app-страницах с sidebar/topbar
- ❌ Не менять порядок слоёв (base → layout → components → pages → responsive → print)

---

## M. Safe Follow-up Task List (Список безопасных задач)

### Задача M-01 — Перенести CSS-правила из crm-static.css в layout/sidebar.css

| Поле | Значение |
|------|---------|
| **Цель** | Сделать `crm-static.css` чистым entrypoint только с @import |
| **Затронутые файлы** | `static-uikit/assets/css/crm-static.css`, `static-uikit/assets/css/layout/sidebar.css` |
| **Запрещено трогать** | Все HTML-файлы, JS-файлы, другие CSS-файлы |
| **Уровень риска** | Низкий |
| **Критерии приёмки** | После переноса 4 правил sidebar-brand-link и nav-icon-img в sidebar.css: визуальный тест navbar в браузере, sidebar отображается корректно |
| **Ручные проверки** | Открыть dashboard.html, проверить логотип и иконки меню; открыть subjects.html, проверить active state иконки |

### Задача M-02 — Убрать двойную загрузку CSS (subject-register.html, subject-edit-individual.html)

| Поле | Значение |
|------|---------|
| **Цель** | Устранить двойную загрузку `subject-register.css` и `subject-edit.css` |
| **Затронутые файлы** | `static-uikit/pages/subject-register.html`, `static-uikit/pages/subject-edit-individual.html` |
| **Запрещено трогать** | CSS-файлы, JS-файлы |
| **Уровень риска** | Низкий — CSS уже загружается через crm-static.css |
| **Критерии приёмки** | Каждая страница загружает каждый CSS-файл ровно один раз. DevTools Network не показывает дубли |
| **Ручные проверки** | Открыть страницы в браузере, проверить что стили применяются корректно, DevTools → Network → CSS |

### Задача M-03 — Задокументировать и нормализовать прямые CSS-ссылки (agents.css, depository.css)

| Поле | Значение |
|------|---------|
| **Цель** | Либо добавить `agents.css` и `depository.css` в `crm-static.css`, либо явно задокументировать почему они изолированы |
| **Затронутые файлы** | `static-uikit/assets/css/crm-static.css` (только если добавляем import) |
| **Запрещено трогать** | HTML-файлы страниц, CSS-файлы agents.css и depository.css |
| **Уровень риска** | Низкий при добавлении импортов |
| **Критерии приёмки** | Все страничные CSS либо импортированы через crm-static.css, либо причина изоляции явно задокументирована |
| **Ручные проверки** | Открыть agents.html и depository.html, проверить стили |

### Задача M-04 — Задокументировать UMI handoff bundle и порядок загрузки

| Поле | Значение |
|------|---------|
| **Цель** | Создать документацию для UMI-интегратора с порядком CSS, списком hooks и do-not-touch списком |
| **Затронутые файлы** | Только новый документ (например, `static-uikit/audits/UMI_CSS_HANDOFF.md`) |
| **Запрещено трогать** | Все CSS, HTML, JS файлы |
| **Уровень риска** | Нулевой — только документация |
| **Критерии приёмки** | Документ описывает порядок загрузки, hook-классы, do-not-merge правила |

### Задача M-05 — Ревизия print.css и print-стилей

| Поле | Значение |
|------|---------|
| **Цель** | Определить где сейчас print-стили (вероятно в page CSS), решить нужен ли app print.css |
| **Затронутые файлы** | Только `static-uikit/assets/css/print.css` (документирование / добавление базовых print rules) |
| **Запрещено трогать** | `document-templates/*.css`, страничные HTML |
| **Уровень риска** | Низкий |
| **Критерии приёмки** | `print.css` содержит базовые print rules для app UI ИЛИ файл задокументирован как намеренно пустой |

### Задача M-06 — Ревизия `--crm-c24-*` deprecated токенов

| Поле | Значение |
|------|---------|
| **Цель** | Проверить используются ли `--crm-c24-*` токены в CSS или JS; если нет — удалить из tokens.css |
| **Затронутые файлы** | `static-uikit/assets/css/base/tokens.css` |
| **Запрещено трогать** | Все остальные CSS, HTML, JS файлы |
| **Уровень риска** | Низкий при отсутствии использования |
| **Критерии приёмки** | grep не находит `--crm-c24-` в CSS/JS, затем токены удалены |

### Задача M-07 — P3: Извлечь `.crm-footer-chip` паттерн как компонент

| Поле | Значение |
|------|---------|
| **Цель** | Вынести повторяющийся паттерн чипов пагинации из 15+ страничных файлов в `components/` |
| **Затронутые файлы** | `components/tables.css` или новый `components/pagination.css`; страничные CSS |
| **Запрещено трогать** | HTML, JS |
| **Уровень риска** | Средний — требует тестирования на всех страницах с пагинацией |
| **Критерии приёмки** | Визуальный тест пагинации на 5+ страницах реестров |

---

## N. Do-Not-Touch List (Список запретов)

### CSS-классы — не переименовывать, не удалять

Все классы из раздела J (JS/CSS Contract). Дополнительно:

- `.crm-app`, `.crm-layout`, `.crm-sidebar`, `.crm-main`, `.crm-topbar`, `.crm-page` — структурные классы app shell
- `.crm-nav-link`, `.crm-nav-group`, `.crm-nav-submenu`, `.crm-nav-group-toggle` — навигация
- `.crm-filter-panel`, `.crm-filter-menu`, `.crm-filter-option`, `.crm-filter-trigger` — система фильтров
- `.crm-table-wrapper`, `.crm-table`, `.crm-table-card` — таблицы
- `.crm-registry-table`, `.crm-registry-shell` — реестры
- `.crm-footer-chip`, `.crm-empty-state` — пагинация и пустые состояния
- `.crm-badge.*` варианты — статусные бейджи
- Все `.crm-umi-*` токены — UMI.CMS алиасы

### Data-атрибуты — не удалять из HTML

- `body[data-page="*"]`
- `[data-sidebar-toggle]`
- `[data-sortable-table]`
- `[data-page-size-group]`, `[data-page-size-value]`
- `[data-pagination-nav]`
- `[data-filter]`, `[data-filter-search]`, `[data-filter-option]`, `[data-filter-value]`
- `[data-action="*"]`
- `[data-auth-form]`, `[data-auth-required]`, `[data-auth-error-for]`, `[data-auth-alert]`
- `[data-date-trigger]`, `[data-date-picker-trigger]`
- `[data-role="*"]`
- `[data-entity="*"]`

### Архитектурные запреты

- ❌ Не объединять document template CSS с app CSS
- ❌ Не менять порядок @import в crm-static.css (base → layout → components → pages → responsive → print)
- ❌ Не добавлять CSS-правила в crm-static.css — только @import
- ❌ Не загружать auth.css на app-страницах
- ❌ Не переименовывать `crm-static.css` без обновления всех HTML

---

## O. Final Verdict (Итоговый вердикт)

### Оценка

> **CSS в целом готов к handoff, требует точечных исправлений перед передачей.**

### Обоснование

Архитектура проекта:
- ✅ Чёткое разделение слоёв (base / layout / components / pages / responsive / print)
- ✅ Единая точка входа `crm-static.css`
- ✅ Последовательное именование `.crm-*`
- ✅ CSS Custom Properties для всех дизайн-токенов
- ✅ Document template CSS полностью изолирован
- ✅ JS/CSS контракт задокументирован (hook-комментарии в JS)
- ✅ Responsive breakpoints консистентны
- ⚠️ Три P1-проблемы, каждая устранима за ≤1 час

### Ответ на главный вопрос: объединять ли CSS в «один pages.css / один components.css»?

**Нет.** Это лишняя и рискованная работа. Текущая модульная структура — это преимущество, а не проблема.

Для UMI.CMS нужно не слияние файлов, а документация порядка подключения. `crm-static.css` уже является логическим «одним CSS» — он выступает точкой входа и включает всё необходимое через `@import`.

### Топ-3 безопасных задачи перед handoff

1. **M-01** — Перенести 4 sidebar-правила из `crm-static.css` в `layout/sidebar.css` (30 мин, нулевой риск)
2. **M-02** — Убрать двойную загрузку CSS в 2 HTML-файлах (15 мин, нулевой риск)
3. **M-03** — Нормализовать или задокументировать изоляцию `agents.css` и `depository.css` (20 мин, низкий риск)

---

*Аудит проведён статически. Ни один implementation-файл не изменён. Все находки требуют ручного подтверждения перед реализацией задач из списка M.*
