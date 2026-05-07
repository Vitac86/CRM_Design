# UMI.CMS CSS Handoff Plan

**Проект:** Инвестика CRM — static-uikit  
**Дата:** 2026-05-07  
**Источник истины:** `static-uikit/` (только эта директория)  
**Версия:** 1.0  
**Статус документации UMI.CMS:** проверено по официальным источникам `dev.docs.umi-cms.ru`

---

## 1. Executive Summary (Краткое резюме)

### Рекомендуемый подход

**Передать модульную структуру CSS как есть. Не производить ручного слияния файлов.**

| Вопрос | Ответ |
|--------|-------|
| Сохранять ли модульные исходные CSS? | **Да** — источник истины остаётся в `static-uikit/assets/css/` |
| Генерировать ли единый бандл? | **Опционально** — `crm-static.bundle.css` как вспомогательный артефакт для UMI, если нужен один физический файл |
| Что подключить в UMI? | `uikit.min.css` + `crm-static.css` (вариант А) или `uikit.min.css` + `crm-static.bundle.css` (вариант Б) |
| Что остаётся источником истины? | Модульные файлы в `static-uikit/assets/css/` |

### Принципиальные ограничения

- **Нельзя** вручную сливать страничные CSS (`pages/*.css`) в один монолитный файл.
- **Нельзя** объединять `document-templates/*.css` с app CSS.
- **Нельзя** редактировать `crm-static.bundle.css` вручную — только пересборка из исходников.
- CSS шаблонов документов (`document-templates/`) должен оставаться изолированным.

---

## 2. Текущая CSS-архитектура

### Структура директории

```
static-uikit/assets/css/
├── crm-static.css              ← главный entrypoint (только @import, без CSS-правил)
├── uikit.min.css               ← внешний фреймворк UIkit (284 KB, не изменяется)
├── responsive.css              ← глобальные медиа-запросы (20 KB)
├── print.css                   ← app print rules (намеренно минимален)
├── base/
│   ├── fonts.css               ← @font-face Inter, Inter Tight (relative url() к ../fonts/)
│   ├── tokens.css              ← CSS Custom Properties + UMI-алиасы + deprecated c24-алиасы
│   └── reset.css               ← box-sizing, body базовые стили
├── layout/
│   ├── app.css                 ← app shell структура
│   ├── sidebar.css             ← sidebar навигация
│   ├── topbar.css              ← topbar, поиск, user info
│   └── page.css                ← page container, grids
├── components/
│   ├── badges.css
│   ├── buttons.css
│   ├── cards.css
│   ├── filters.css
│   ├── forms.css
│   ├── modals.css
│   ├── tables.css
│   └── tabs.css
├── pages/                      ← 20 страничных файлов (импортированы через crm-static.css)
│   ├── dashboard.css
│   ├── subjects.css
│   ├── subject-card.css
│   ├── subject-register.css
│   ├── subject-edit.css
│   ├── contract-wizard.css
│   ├── contract-edit.css
│   ├── brokerage.css
│   ├── trust-management.css
│   ├── requests.css
│   ├── back-office.css
│   ├── archive.css
│   ├── agents.css
│   ├── compliance.css
│   ├── middle-office.css
│   ├── trading.css
│   ├── depository.css
│   ├── document-wizard.css
│   ├── error.css
│   └── search-results.css
├── pages/auth.css              ← ОТДЕЛЬНЫЙ entrypoint (страницы авторизации без app layout)
└── document-templates/         ← ИЗОЛИРОВАН от app CSS
    ├── document-template-base.css
    ├── document-template-forms.css
    └── zayavlenie-o-prisoedinenii-fl.css
```

### Роли ключевых файлов

| Файл | Роль | Примечания |
|------|------|-----------|
| `crm-static.css` | App CSS entrypoint | Только `@import`, без CSS-правил |
| `uikit.min.css` | Vendor-зависимость | UIkit 3.x, не изменяется |
| `pages/auth.css` | Auth entrypoint | Изолирован — страницы авторизации без sidebar/topbar |
| `document-template-base.css` | Print entrypoint | Изолирован от app UI CSS, A4-размер, mm-единицы |
| `responsive.css` | Глобальные breakpoints | Подключён последним в crm-static.css перед print |
| `print.css` | App print rules | Минимален; print-стили документов — только в document-templates |

### Порядок @import в crm-static.css

```
base/fonts.css
base/tokens.css
base/reset.css
layout/app.css
layout/sidebar.css
layout/topbar.css
layout/page.css
components/cards.css
components/buttons.css
components/forms.css
components/badges.css
components/tables.css
components/tabs.css
components/filters.css
components/modals.css
pages/dashboard.css
pages/subjects.css
pages/subject-card.css
pages/contract-wizard.css
pages/contract-edit.css
pages/subject-register.css
pages/subject-edit.css
pages/brokerage.css
pages/trust-management.css
pages/requests.css
pages/back-office.css
pages/archive.css
pages/agents.css
pages/compliance.css
pages/middle-office.css
pages/trading.css
pages/depository.css
pages/document-wizard.css
pages/error.css
pages/search-results.css
responsive.css
print.css
```

---

## 3. Источник истины vs. генерируемый бандл

### Источник истины (редактировать только здесь)

```
static-uikit/assets/css/
  base/          ← токены, шрифты, reset
  layout/        ← app shell, sidebar, topbar, page
  components/    ← переиспользуемые компоненты
  pages/         ← page-specific стили
  responsive.css
  print.css
  crm-static.css ← порядок @import
  document-templates/  ← изолированный print CSS
```

### Генерируемый артефакт (не редактировать вручную)

```
static-uikit/assets/css/crm-static.bundle.css   ← будущий генерируемый файл
```

### Правило

> **Не редактировать `crm-static.bundle.css` вручную.**  
> Редактировать только модульные CSS-файлы, затем пересобирать бандл.

### Почему модульная структура лучше монолита

| Причина | Подробнее |
|---------|----------|
| Упрощённая поддержка | Разработчик точно знает, какой файл правит конкретную страницу |
| Безопасные диффы | Изменение `pages/dashboard.css` не затрагивает `pages/subjects.css` |
| Защита каскада | Ручное слияние 20+ файлов с разными специфичностями создаёт непредсказуемые конфликты |
| Владение страницей | Каждый страничный CSS принадлежит конкретной странице — удобно при исправлении ошибок |

---

## 4. Рекомендуемая структура в UMI.CMS

Согласно официальной документации UMI.CMS (`dev.docs.umi-cms.ru`), стандартная структура шаблона:

```
~/templates/{template_name}/
  css/
  images/
  js/
  tpls/          ← TPL-шаблоны
  xslt/          ← XSLT-шаблоны (переименовано из xsltTpls в новом формате)
  classes/modules/
  umaps/
  usels/
```

### Предлагаемая структура для проекта Инвестика

```
templates/investika-crm/
├── css/
│   ├── crm-static.css              ← app entrypoint
│   ├── crm-static.bundle.css       ← [опционально] генерируемый бандл
│   ├── uikit.min.css               ← vendor
│   ├── responsive.css
│   ├── print.css
│   ├── base/
│   │   ├── fonts.css
│   │   ├── tokens.css
│   │   └── reset.css
│   ├── layout/
│   │   ├── app.css
│   │   ├── sidebar.css
│   │   ├── topbar.css
│   │   └── page.css
│   ├── components/
│   │   ├── badges.css
│   │   ├── buttons.css
│   │   ├── cards.css
│   │   ├── filters.css
│   │   ├── forms.css
│   │   ├── modals.css
│   │   ├── tables.css
│   │   └── tabs.css
│   ├── pages/
│   │   ├── auth.css                ← только для auth-страниц
│   │   └── [20 страничных файлов]
│   └── document-templates/         ← изолированный print CSS
│       ├── document-template-base.css
│       ├── document-template-forms.css
│       └── zayavlenie-o-prisoedinenii-fl.css
├── fonts/                          ← шрифты (не в /images/, отдельная папка)
│   ├── inter/
│   └── inter-tight/
├── images/
│   ├── brand/                      ← логотипы (logo-full-ru-white.svg и др.)
│   └── icons/                      ← SVG-иконки навигации
├── js/
│   ├── uikit.min.js
│   ├── uikit-icons.min.js
│   ├── crm-static.js
│   └── pages/
│       ├── subject-card.js
│       ├── subject-register.js
│       ├── subject-edit.js
│       ├── middle-office.js
│       ├── trading-card.js
│       ├── contract-edit.js
│       ├── document-wizard.js
│       └── fias-address.js
├── tpls/                           ← TPL-шаблоны UMI (или xslt/)
└── [классы, umaps, usels при необходимости]
```

### Вариант А — модульный (рекомендуется как основной)

```html
<link rel="stylesheet" href="%template_resources%css/uikit.min.css">
<link rel="stylesheet" href="%template_resources%css/crm-static.css">
```

Плюсы: прозрачность, удобное обновление отдельных компонентов.  
Требование: сервер UMI должен обслуживать все файлы из `css/` с поддержкой `@import`.

### Вариант Б — бандл (для сред без поддержки @import)

```html
<link rel="stylesheet" href="%template_resources%css/uikit.min.css">
<link rel="stylesheet" href="%template_resources%css/crm-static.bundle.css">
```

Плюсы: один HTTP-запрос, не требует поддержки `@import`.  
Требование: бандл должен быть предварительно сгенерирован и содержать корректно переписанные `url()` пути.

### Auth-страницы (логин, регистрация, восстановление пароля)

```html
<!-- Без uikit.min.css и crm-static.css — только auth CSS -->
<link rel="stylesheet" href="%template_resources%css/pages/auth.css">
```

### Источники по пути %template_resources%

Согласно официальной документации UMI.CMS:
- В TPL-шаблонах: макрос `%template_resources%` автоматически подставляет путь к папке шаблона.
- В XSLT-шаблонах: параметр `$template-resources` (объявляется глобально как `<xsl:param name="template-resources" />`), используется как `{$template-resources}css/crm-static.css`.

---

## 5. Порядок загрузки CSS

### App-страницы (все CRM-страницы с sidebar и topbar)

**Вариант А — модульный:**

```html
<link rel="stylesheet" href="%template_resources%css/uikit.min.css">
<link rel="stylesheet" href="%template_resources%css/crm-static.css">
```

`crm-static.css` самостоятельно загружает через `@import` в следующем порядке:

1. `base/fonts.css` — шрифты
2. `base/tokens.css` — CSS Custom Properties
3. `base/reset.css` — базовый reset
4. `layout/app.css` → `layout/sidebar.css` → `layout/topbar.css` → `layout/page.css`
5. `components/cards.css` → `buttons.css` → `forms.css` → `badges.css` → `tables.css` → `tabs.css` → `filters.css` → `modals.css`
6. `pages/[20 файлов]`
7. `responsive.css`
8. `print.css`

**Вариант Б — бандл:**

```html
<link rel="stylesheet" href="%template_resources%css/uikit.min.css">
<link rel="stylesheet" href="%template_resources%css/crm-static.bundle.css">
```

### Auth-страницы (login, register, forgot-password)

```html
<link rel="stylesheet" href="%template_resources%css/pages/auth.css">
```

Нельзя подключать `crm-static.css` на auth-страницах — они не имеют app shell.

### Страницы печатных шаблонов документов

```html
<link rel="stylesheet" href="%template_resources%css/document-templates/document-template-base.css">
<link rel="stylesheet" href="%template_resources%css/document-templates/document-template-forms.css">
<!-- При необходимости: -->
<link rel="stylesheet" href="%template_resources%css/document-templates/zayavlenie-o-prisoedinenii-fl.css">
```

Нельзя смешивать document-template CSS с app CSS на одной странице.

---

## 6. Маппинг путей: static-uikit → UMI

| Static-uikit путь | UMI путь | Примечания |
|-------------------|----------|-----------|
| `static-uikit/assets/css/crm-static.css` | `templates/investika-crm/css/crm-static.css` | app entrypoint |
| `static-uikit/assets/css/uikit.min.css` | `templates/investika-crm/css/uikit.min.css` | vendor CSS |
| `static-uikit/assets/css/responsive.css` | `templates/investika-crm/css/responsive.css` | global breakpoints |
| `static-uikit/assets/css/print.css` | `templates/investika-crm/css/print.css` | app print rules |
| `static-uikit/assets/css/base/*` | `templates/investika-crm/css/base/*` | source modules |
| `static-uikit/assets/css/layout/*` | `templates/investika-crm/css/layout/*` | source modules |
| `static-uikit/assets/css/components/*` | `templates/investika-crm/css/components/*` | source modules |
| `static-uikit/assets/css/pages/*` | `templates/investika-crm/css/pages/*` | source modules |
| `static-uikit/assets/css/document-templates/*` | `templates/investika-crm/css/document-templates/*` | print docs, изолировано |
| `static-uikit/assets/fonts/*` | `templates/investika-crm/fonts/*` | шрифты Inter и Inter Tight |
| `static-uikit/assets/js/crm-static.js` | `templates/investika-crm/js/crm-static.js` | app JS, адаптировать |
| `static-uikit/assets/js/uikit.min.js` | `templates/investika-crm/js/uikit.min.js` | vendor JS |
| `static-uikit/assets/js/uikit-icons.min.js` | `templates/investika-crm/js/uikit-icons.min.js` | vendor JS |
| `static-uikit/assets/js/pages/*` | `templates/investika-crm/js/pages/*` | page JS, адаптировать |
| `static-uikit/assets/brand/*` | `templates/investika-crm/images/brand/*` | логотип SVG |
| `static-uikit/assets/icons/*` | `templates/investika-crm/images/icons/*` | SVG-иконки навигации |

### Пример подключения в TPL-шаблоне

```html
<!-- vendor -->
<link rel="stylesheet" href="%template_resources%css/uikit.min.css">

<!-- app entrypoint (вариант А — модульный) -->
<link rel="stylesheet" href="%template_resources%css/crm-static.css">

<!-- app entrypoint (вариант Б — бандл, если нужен) -->
<!-- <link rel="stylesheet" href="%template_resources%css/crm-static.bundle.css"> -->

<!-- JS в конце body -->
<script src="%template_resources%js/uikit.min.js"></script>
<script src="%template_resources%js/uikit-icons.min.js"></script>
<script src="%template_resources%js/crm-static.js" defer></script>
```

### Пример подключения в XSLT-шаблоне

```xsl
<!-- Объявить параметр глобально в начале main template -->
<xsl:param name="template-resources" />

<!-- Использование в head -->
<link rel="stylesheet" href="{$template-resources}css/uikit.min.css" />
<link rel="stylesheet" href="{$template-resources}css/crm-static.css" />
```

> **Примечание:** Синтаксис `%template_resources%` (TPL) и `$template-resources` (XSLT) подтверждён официальной документацией `dev.docs.umi-cms.ru`. Если версия UMI или конфигурация сервера отличается, уточнить у системного администратора.

---

## 7. Анализ относительных URL в CSS

### url() ссылки в проекте

Единственный CSS-файл, содержащий `url()` ссылки на ресурсы — `base/fonts.css`:

```css
/* fonts.css расположен в: css/base/fonts.css */
/* Путь ../../fonts/ означает: css/base/ → css/ → template_root/ → fonts/ */
@font-face {
  src: url("../../fonts/inter/Inter-Cyrillic-Regular.woff2") format("woff2");
}
```

### Анализ шрифтовых путей

| CSS-файл (UMI путь) | url() значение | Разрешается в |
|---------------------|----------------|--------------|
| `css/base/fonts.css` | `../../fonts/inter/...` | `templates/investika-crm/fonts/inter/...` |
| `css/base/fonts.css` | `../../fonts/inter-tight/...` | `templates/investika-crm/fonts/inter-tight/...` |

**Вывод:** При сохранении относительной структуры папок (`css/base/fonts.css` и `fonts/inter/` на одном уровне внутри шаблона) пути шрифтов будут работать без изменений.

Расположение шрифтов в UMI: `templates/investika-crm/fonts/` (не стандартная папка UMI, но допустима — UMI разрешает произвольные подпапки в директории шаблона).

### Иконки и SVG в sidebar

Иконки навигации подключаются как `<img>` теги в HTML (class `crm-nav-icon-img`), а не через CSS `url()`. CSS лишь задаёт стили для `.crm-nav-icon-img`:

```css
.crm-sidebar .crm-nav-icon-img {
  filter: brightness(0) invert(1);
}
```

**Вывод:** Пути к иконкам (`assets/icons/*.svg`) задаются в HTML-разметке, не в CSS. При переносе в UMI пути иконок нужно обновить в HTML/шаблонах UMI (через `%template_resources%images/icons/...`).

### Что ещё проверить программисту

- [ ] **Шрифты загружаются** — открыть любую app-страницу, DevTools → Network → Font — убедиться, что Inter и Inter Tight загружаются с правильных путей
- [ ] **Логотип в sidebar отображается** — `brand/logo-full-ru-white.svg` доступен по пути из `<img>` в HTML
- [ ] **SVG-иконки навигации загружаются** — иконки в sidebar видны и не заменены broken-image placeholder
- [ ] **Относительные пути @import работают** — все CSS-файлы из `base/`, `layout/`, `components/`, `pages/` загружаются (DevTools → Network → CSS)
- [ ] **Document template CSS загружается** — открыть любой HTML-шаблон документа, убедиться что document-template-base.css применяется
- [ ] **Печать корректна** — Ctrl+P на страницах с document templates, проверить A4-форматирование

---

## 8. Что нельзя объединять

### Жёсткие запреты

| Что | Почему нельзя объединять |
|-----|--------------------------|
| `document-templates/*.css` + `crm-static.css` | Document CSS использует A4-размер, mm-единицы и независимые переменные — слияние сломает app layout и print layout одновременно |
| `pages/auth.css` + `crm-static.css` | Auth-страницы не имеют sidebar и topbar; подключение app CSS создаст конфликт стилей |
| `print.css` (app) + `document-template-base.css` | Разные системы печатных стилей: app print и document print |
| `uikit.min.css` + `crm-static.css` | Vendor CSS должен оставаться изолированным для обновляемости |
| `crm-static.bundle.css` → замена исходных модулей в репозитории | Бандл — только генерируемый артефакт; исходники должны оставаться |

### Что нельзя объединять в одном `<link>`

- Не загружать `auth.css` на app-страницах с sidebar/topbar.
- Не загружать `crm-static.css` на страницах печатных шаблонов документов.
- Не изменять порядок слоёв: `base → layout → components → pages → responsive → print`.

---

## 9. Стратегия генерации бандла (будущий шаг)

### Описание будущего артефакта

```
static-uikit/assets/css/crm-static.bundle.css
```

### Что должен содержать бандл

- Все файлы из `crm-static.css` в том же порядке, что и в `@import`;
- Нет `@import` директив в итоговом файле;
- Разделители с комментариями, указывающими границы исходных файлов (например, `/* === base/fonts.css === */`);
- `url()` пути, корректно переписанные относительно расположения бандла (или абсолютные);
- Нет `document-templates/*.css`;
- Нет `pages/auth.css` (если страницы авторизации остаются изолированными).

### Варианты генерации

| Способ | Описание | Рекомендация |
|--------|----------|-------------|
| Простой скрипт конкатенации | Читает `@import` из `crm-static.css`, конкатенирует файлы в правильном порядке | Достаточно для первого шага |
| PostCSS + postcss-import | Автоматически разворачивает `@import`, переписывает `url()` | Лучший вариант если добавляется инструментарий |
| Ручная конкатенация | Руками собирать 41 файл | Не рекомендуется |

### Критерии приёмки для будущего бандла

- [ ] Визуальный паритет с вариантом А (modular): страницы выглядят идентично при обоих подходах
- [ ] Dashboard, subjects, subject-card, subject-register/edit, middle-office, depository, document-wizard — рендерятся корректно
- [ ] Шрифты и иконки не сломаны
- [ ] Бандл помечен как сгенерированный (комментарий в начале файла)
- [ ] Нет изменений в поведении JavaScript

---

## 10. Чеклист интеграции в UMI

### До интеграции

- [ ] Скопировать структуру `static-uikit/assets/css/` в `templates/investika-crm/css/`
- [ ] Скопировать `assets/fonts/` в `templates/investika-crm/fonts/`
- [ ] Скопировать `assets/brand/` в `templates/investika-crm/images/brand/`
- [ ] Скопировать `assets/icons/` в `templates/investika-crm/images/icons/`
- [ ] Убедиться что сохранена относительная структура вложений (`css/base/`, `css/layout/` и т.д.)
- [ ] Выбрать вариант: модульный (А) или бандл (Б)
- [ ] Если бандл: сгенерировать `crm-static.bundle.css` до копирования

### Во время интеграции

- [ ] Подключить CSS через макрос `%template_resources%` (TPL) или параметр `$template-resources` (XSLT)
- [ ] Сохранить порядок загрузки: `uikit.min.css` → `crm-static.css` (или бандл)
- [ ] Заменить статические HTML-данные на UMI loops/includes/server data
- [ ] **Сохранить все CSS-классы** — особенно те, что перечислены в разделе JS/CSS Contract (см. `CSS_ARCHITECTURE_AUDIT.md`, раздел J)
- [ ] **Сохранить все `data-*` атрибуты** — они являются хуками для JavaScript
- [ ] Подключить `pages/auth.css` отдельно на auth-страницах
- [ ] Подключить `document-templates/*.css` отдельно на страницах печатных документов
- [ ] JS-файлы загружать с `defer` или в конце `<body>`

### После интеграции — визуальная проверка

- [ ] Sidebar: логотип, иконки, активный пункт меню, раскрытие подменю
- [ ] Topbar: заголовок страницы, поиск, user info
- [ ] Формы: input, select, date picker, radio, checkbox
- [ ] Фильтры: dropdown-меню фильтров, reset filters
- [ ] Таблицы: сортировка колонок, пагинация, пустое состояние
- [ ] Карточка субъекта: вкладки, загрузка документов, грид полей
- [ ] Document wizard: печатный предпросмотр A4
- [ ] Модуль ФИАС: адресный ввод
- [ ] Responsive: мобильный sidebar (hamburger), таблицы на малых экранах
- [ ] Печать: Ctrl+P на страницах с document templates

---

## 11. Риски и меры снижения

| Риск | Воздействие | Мера снижения |
|------|-------------|--------------|
| Ручное слияние CSS ломает каскад | Высокое | Использовать только генерируемый бандл; не сливать вручную |
| `@import` не поддерживается или нежелателен в runtime UMI | Среднее | Сгенерировать бандл (вариант Б) |
| `url()` пути сломаны после переноса папок | Высокое | Сохранить относительную структуру папок; при изменении — переписать пути в `base/fonts.css` |
| CSS документов попадает в app UI | Среднее | Держать `document-templates/*.css` отдельно и не включать в `crm-static.css` |
| JS-зависимые классы переименованы при интеграции | Высокое | Сохранить все классы из JS/CSS Contract (раздел J аудита) |
| UMI templates разбивают страницы на includes | Среднее | Подключать `uikit.min.css` + `crm-static.css` глобально в layout, не в каждом include |
| Auth CSS попадает на app-страницы | Среднее | Подключать `auth.css` только в auth-шаблонах UMI |
| Шрифты не загружаются | Высокое | Убедиться что `fonts/` находится на два уровня выше `css/base/` (т.е. в корне шаблона) |
| Иконки навигации не загружаются | Среднее | Пути к SVG в HTML-разметке обновить на `%template_resources%images/icons/...` |
| Изменение порядка @import в бандле | Высокое | Бандл генерировать строго по порядку из `crm-static.css` |

---

## 12. Рекомендуемые следующие шаги

### Шаг 1 — Создать `crm-static.bundle.css`

| Поле | Значение |
|------|---------|
| Разрешённые файлы | Только `static-uikit/assets/css/crm-static.bundle.css` (новый файл) |
| Запрещённые файлы | Все CSS, HTML, JS файлы (не изменять) |
| Риск | Низкий — создание нового файла |
| Критерии приёмки | Бандл содержит все CSS из `crm-static.css` в правильном порядке; нет `@import`; помечен как сгенерированный; визуальный паритет с модульным вариантом проверен на 5+ страницах |

### Шаг 2 — Добавить заголовок сгенерированного файла в бандл

| Поле | Значение |
|------|---------|
| Разрешённые файлы | `static-uikit/assets/css/crm-static.bundle.css` |
| Запрещённые файлы | Все остальные |
| Риск | Нулевой |
| Критерии приёмки | Первые строки бандла содержат комментарий: дата генерации, источник, инструкция «не редактировать вручную» |

### Шаг 3 — Визуальная проверка паритета бандла

| Поле | Значение |
|------|---------|
| Разрешённые файлы | Нет изменений в файлах — только браузерное тестирование |
| Запрещённые файлы | Все |
| Риск | Нулевой |
| Критерии приёмки | Dashboard, subjects, subject-card, middle-office, depository, document-wizard, compliance — идентичный вид при модульном и bundle-подходах |

### Шаг 4 — Добавить примеры UMI-путей в README

| Поле | Значение |
|------|---------|
| Разрешённые файлы | `static-uikit/README.md` |
| Запрещённые файлы | Все CSS, HTML, JS файлы |
| Риск | Нулевой |
| Критерии приёмки | README содержит раздел с примерами подключения CSS через `%template_resources%` |

### Шаг 5 — Обновить пути к иконкам в HTML-шаблонах UMI

| Поле | Значение |
|------|---------|
| Разрешённые файлы | Только TPL/XSLT-шаблоны UMI (не файлы static-uikit) |
| Запрещённые файлы | `static-uikit/` HTML и CSS файлы |
| Риск | Средний — требует проверки каждого шаблона с sidebar |
| Критерии приёмки | Иконки навигации и логотип загружаются через `%template_resources%images/icons/...` и `%template_resources%images/brand/...` |

---

## 13. Итоговая рекомендация

### Принципы

1. **Сохранить модульные исходные CSS** как источник истины в `static-uikit/assets/css/`.
2. **Использовать `crm-static.css` как source entrypoint** — он уже является корректным entrypoint-only файлом (только `@import`, без inline CSS-правил).
3. **Предоставить `crm-static.bundle.css` только как генерируемый артефакт** для UMI, если нужен один физический файл.
4. **CSS шаблонов документов держать отдельно** — никогда не смешивать с app CSS.
5. **Не сливать вручную** файлы `pages/` или `components/` в монолит.
6. **Сохранить относительную структуру папок** для корректной работы путей шрифтов.

### Выбор варианта подключения

| | Вариант А (модульный) | Вариант Б (бандл) |
|--|----------------------|-------------------|
| Подходит для | Серверов с поддержкой @import в CSS | Сред с ограничениями на @import или HTTP/1.1 |
| Поддерживаемость | Лучше | Требует пересборки при изменениях |
| Скорость загрузки | Множество HTTP-запросов (или HTTP/2 push) | Один запрос |
| Рекомендация | Использовать как основной | Использовать как fallback или при необходимости |

### Финальный вердикт

> **Mostly safe — нужен один уточняющий шаг.**
>
> CSS-архитектура готова к handoff. Единственное, что нужно сделать до передачи программисту UMI: сгенерировать `crm-static.bundle.css` и подтвердить визуальный паритет. Все остальные условия выполнены.

---

*Документ создан на основе `static-uikit/audits/CSS_ARCHITECTURE_AUDIT.md` и официальной документации UMI.CMS (`dev.docs.umi-cms.ru`). Ни один implementation-файл не изменён.*
