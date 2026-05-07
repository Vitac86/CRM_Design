# UMI.CMS PHP CSS Handoff Plan

**Проект:** Инвестика CRM — static-uikit  
**Дата:** 2026-05-07  
**Источник истины:** `static-uikit/` (только эта директория)  
**Версия:** 1.1  
**Целевой шаблонизатор:** UMI.CMS PHP (`.phtml`)  
**Статус документации UMI.CMS:** проверено по официальным источникам `dev.docs.umi-cms.ru`

---

## 1. Executive Summary (Краткое резюме)

### Целевой шаблонизатор

**Целевая интеграция: UMI.CMS PHP templater (`.phtml` файлы).**

- Это **не** TPL-шаблонизатор.
- Это **не** XSLT-шаблонизатор.
- Примеры TPL (`%template_resources%`) и XSLT (`$template-resources`) из предыдущей версии документа намеренно убраны как первичное решение.
- PHP-шаблоны подключают те же CSS-файлы во время выполнения, но способ формирования пути к ресурсам зависит от конфигурации проекта и должен быть подтверждён PHP-разработчиком UMI.

> **Примечание об `%template_resources%` в PHP-контексте:**  
> Согласно официальной документации UMI.CMS (`dev.docs.umi-cms.ru`), TPL-шаблонизатор применяется к ответу сервера на финальном этапе вне зависимости от основного шаблонизатора (*«TPL-шаблонизатор теперь всегда применяется к ответу сервера»*). Это означает, что макрос `%template_resources%` технически может обрабатываться и в PHP-шаблонах. Тем не менее это поведение зависит от версии и настройки конкретного UMI-проекта. PHP-разработчик должен подтвердить, работает ли `%template_resources%` в их конфигурации или следует использовать PHP-переменную.

### Рекомендуемый подход

**Передать модульную структуру CSS как есть. Не производить ручного слияния файлов.**

| Вопрос | Ответ |
|--------|-------|
| Сохранять ли модульные исходные CSS? | **Да** — источник истины остаётся в `static-uikit/assets/css/` |
| Генерировать ли единый бандл? | **Опционально** — `crm-static.bundle.css` как вспомогательный артефакт, если нужен один физический файл |
| Что подключить в UMI PHP? | `uikit.min.css` + `crm-static.css` (вариант А) или `uikit.min.css` + `crm-static.bundle.css` (вариант Б) |
| Как получить путь к ресурсам шаблона? | Уточнить у PHP-разработчика — стандартный PHP-хелпер UMI не задокументирован в открытых источниках |
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

## 4. Рекомендуемая структура в UMI.CMS (PHP)

### Официальная структура UMI.CMS (новый формат)

Согласно официальной документации UMI.CMS (`dev.docs.umi-cms.ru`), стандартная структура шаблона:

```
~/templates/{template_name}/
  php/           ← PHP-шаблоны (.phtml файлы)
  css/
  images/
  js/
  tpls/          ← только если используется TPL-шаблонизатор (не наш случай)
  xslt/          ← только если используется XSLT-шаблонизатор (не наш случай)
  classes/modules/
  umaps/
  usels/
```

Для PHP templater шаблонные файлы (`.phtml`) размещаются в папке `php/`.

### Предлагаемая структура для проекта Инвестика

```
templates/investika-crm/
├── php/                            ← PHP-шаблоны (.phtml)
│   ├── default.phtml               ← главный layout
│   └── includes/
│       ├── layout.phtml            ← общий layout с <head> и <body>
│       ├── sidebar.phtml           ← sidebar навигация
│       ├── topbar.phtml            ← topbar
│       └── pages/
│           ├── dashboard.phtml
│           ├── subjects.phtml
│           ├── subject-card.phtml
│           ├── subject-register.phtml
│           ├── middle-office-reports.phtml
│           └── depository.phtml
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
└── js/
    ├── uikit.min.js
    ├── uikit-icons.min.js
    ├── crm-static.js
    └── pages/
        ├── subject-card.js
        ├── subject-register.js
        ├── subject-edit.js
        ├── middle-office.js
        ├── trading-card.js
        ├── contract-edit.js
        ├── document-wizard.js
        └── fias-address.js
```

> **Важно:** Точная структура PHP-includes и layouts может отличаться в зависимости от проекта.  
> Это план CSS-handoff, а не готовый PHP template pack.  
> PHP-шаблоны, includes, UMI server bindings и UMI loops реализует PHP-разработчик UMI.

---

## 5. Порядок загрузки CSS

Порядок загрузки CSS не зависит от выбора шаблонизатора и остаётся единым.

### App PHP-страницы (все CRM-страницы с sidebar и topbar)

**Вариант А — модульный:**

```php
<!-- В layout.phtml или includes/head.phtml -->
<link rel="stylesheet" href="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>css/uikit.min.css">
<link rel="stylesheet" href="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>css/crm-static.css">
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

```php
<link rel="stylesheet" href="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>css/uikit.min.css">
<link rel="stylesheet" href="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>css/crm-static.bundle.css">
```

### Auth PHP-страницы (login, register, forgot-password)

```php
<!-- Без uikit.min.css и crm-static.css — только auth CSS -->
<link rel="stylesheet" href="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>css/pages/auth.css">
```

Нельзя подключать `crm-static.css` на auth-страницах — они не имеют app shell.

### Страницы печатных шаблонов документов

```php
<link rel="stylesheet" href="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>css/document-templates/document-template-base.css">
<link rel="stylesheet" href="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>css/document-templates/document-template-forms.css">
<?php /* При необходимости: */ ?>
<link rel="stylesheet" href="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>css/document-templates/zayavlenie-o-prisoedinenii-fl.css">
```

Нельзя смешивать document-template CSS с app CSS на одной странице.

---

## 6. Маппинг путей: static-uikit → UMI PHP-проект

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

> **Примечание:** Если в UMI-проекте ресурсы хранятся по другому публичному пути, необходимо переписать все `url(...)` пути в `base/fonts.css` и HTML-пути к иконкам в PHP-шаблонах.

### Пример подключения в PHP layout-шаблоне

> **⚠️ Важно:** `$templateResources` ниже — иллюстративный placeholder.  
> Реальная переменная или хелпер зависит от настройки UMI PHP-проекта и должна быть подтверждена PHP-разработчиком.

```php
<?php
/**
 * @var umiTemplaterPHP $this
 * @var array $variables
 *
 * $templateResources — иллюстративный placeholder.
 * Замените на реальный хелпер или переменную проекта.
 * Возможные варианты (уточнить у разработчика):
 *   - '/templates/investika-crm/'  (жёсткий путь — только для dev/staging)
 *   - UMI-специфичный хелпер, если таковой задокументирован в проекте
 */
$templateResources = '/templates/investika-crm/';
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <!-- vendor -->
  <link rel="stylesheet" href="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>css/uikit.min.css">
  <!-- app entrypoint (вариант А — модульный) -->
  <link rel="stylesheet" href="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>css/crm-static.css">
  <!-- app entrypoint (вариант Б — бандл, если нужен) -->
  <!-- <link rel="stylesheet" href="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>css/crm-static.bundle.css"> -->
</head>
<body>
  <?php $this->render('includes/sidebar.phtml') ?>
  <?php $this->render('includes/topbar.phtml') ?>
  <!-- ... контент страницы ... -->

  <!-- JS в конце body -->
  <script src="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>js/uikit.min.js"></script>
  <script src="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>js/uikit-icons.min.js"></script>
  <script src="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>js/crm-static.js" defer></script>
</body>
</html>
```

### PHP layout для auth-страниц

```php
<?php
$templateResources = '/templates/investika-crm/'; // placeholder — уточнить
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <!-- Только auth CSS — без uikit.min.css и crm-static.css -->
  <link rel="stylesheet" href="<?= htmlspecialchars($templateResources, ENT_QUOTES) ?>css/pages/auth.css">
</head>
<body>
  <!-- Auth-страница без sidebar/topbar -->
</body>
</html>
```

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

**Вывод:** Пути к иконкам (`assets/icons/*.svg`) задаются в HTML-разметке, не в CSS. При переносе в PHP-шаблоны UMI пути иконок нужно обновить в `.phtml`-файлах с учётом реального пути к ресурсам шаблона.

### Что ещё проверить программисту

- [ ] **Шрифты загружаются** — открыть любую app-страницу, DevTools → Network → Font — убедиться, что Inter и Inter Tight загружаются с правильных путей
- [ ] **Логотип в sidebar отображается** — `brand/logo-full-ru-white.svg` доступен по пути из `<img>` в PHP-шаблоне
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

### Что нельзя объединять на одной странице

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

## 10. Чеклист интеграции в UMI (PHP)

### До интеграции

- [ ] Подтвердить у PHP-разработчика, что используется PHP-шаблонизатор UMI (`.phtml`)
- [ ] Подтвердить реальный хелпер или переменную для получения пути к ресурсам шаблона — заменить `$templateResources` в примерах на настоящее значение
- [ ] Скопировать структуру `static-uikit/assets/css/` в `templates/investika-crm/css/`
- [ ] Скопировать `assets/fonts/` в `templates/investika-crm/fonts/`
- [ ] Скопировать `assets/brand/` в `templates/investika-crm/images/brand/`
- [ ] Скопировать `assets/icons/` в `templates/investika-crm/images/icons/`
- [ ] Убедиться что сохранена относительная структура вложений (`css/base/`, `css/layout/` и т.д.)
- [ ] Выбрать вариант: модульный (А) или бандл (Б)
- [ ] Если бандл: сгенерировать `crm-static.bundle.css` до копирования

### Во время интеграции

- [ ] Подключить CSS в PHP layout-шаблоне (обычно `layout.phtml` или `default.phtml`) — **один раз, глобально, не в каждом include**
- [ ] Сохранить порядок загрузки: `uikit.min.css` → `crm-static.css` (или бандл)
- [ ] Разбить статический HTML на PHP-includes/layouts/pages согласно структуре UMI
- [ ] Заменить статические HTML-данные на UMI server data (loops, объекты, страницы)
- [ ] **Сохранить все CSS-классы** — особенно те, что перечислены в разделе JS/CSS Contract (см. `CSS_ARCHITECTURE_AUDIT.md`, раздел J)
- [ ] **Сохранить все `data-*` атрибуты** — они являются хуками для JavaScript
- [ ] Подключить `pages/auth.css` отдельно в auth PHP-шаблоне
- [ ] Подключить `document-templates/*.css` отдельно в PHP-шаблонах печатных документов
- [ ] JS-файлы загружать с `defer` или в конце `<body>`
- [ ] Обновить пути к иконкам (`<img src="...">`) и логотипу в PHP-шаблонах с учётом реального пути к ресурсам

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
| Неизвестный PHP resource path хелпер | Высокое | Уточнить у PHP-разработчика до начала интеграции; не хардкодить пути в production |
| Жёстко прописанные пути ломаются при смене окружения | Высокое | Использовать переменную или конфигурационный хелпер вместо `/templates/investika-crm/` напрямую |
| Ручное слияние CSS ломает каскад | Высокое | Использовать только генерируемый бандл; не сливать вручную |
| `url()` пути сломаны после перемещения папок ресурсов | Высокое | Сохранить относительную структуру папок; при изменении — переписать пути в `base/fonts.css` |
| `@import` не поддерживается или нежелателен в runtime UMI | Среднее | Сгенерировать бандл (вариант Б) |
| PHP includes разбивают layout, но забывают глобально подключить CSS | Среднее | Подключать `uikit.min.css` + `crm-static.css` только в главном layout-шаблоне, не в каждом include |
| CSS документов случайно попадает в app UI | Среднее | Держать `document-templates/*.css` отдельно, не включать в `crm-static.css` |
| JS-зависимые классы переименованы при интеграции | Высокое | Сохранить все классы из JS/CSS Contract (раздел J аудита) |
| Auth CSS попадает на app-страницы | Среднее | Подключать `auth.css` только в auth PHP-шаблоне |
| Шрифты не загружаются | Высокое | Убедиться что `fonts/` находится на два уровня выше `css/base/` (т.е. в корне шаблона) |
| Иконки навигации не загружаются | Среднее | Пути к SVG в PHP-шаблонах обновить через реальный resource path хелпер |
| UMI PHP-разработчик редактирует бандл вручную | Высокое | Чётко пометить `crm-static.bundle.css` как «не редактировать вручную» |
| Изменение порядка @import в бандле | Высокое | Бандл генерировать строго по порядку из `crm-static.css` |

---

## 12. Рекомендуемые следующие шаги

### Шаг 1 — Подтвердить PHP resource path хелпер

| Поле | Значение |
|------|---------|
| Разрешённые файлы | Только документация/конфигурация UMI-проекта |
| Запрещённые файлы | Все CSS, HTML, JS файлы |
| Риск | Нулевой — только исследование |
| Критерии приёмки | PHP-разработчик подтвердил реальную переменную/хелпер для пути к ресурсам шаблона; `$templateResources` в примерах заменён на реальное значение |

### Шаг 2 — Создать `crm-static.bundle.css`

| Поле | Значение |
|------|---------|
| Разрешённые файлы | Только `static-uikit/assets/css/crm-static.bundle.css` (новый файл) |
| Запрещённые файлы | Все CSS, HTML, JS файлы (не изменять) |
| Риск | Низкий — создание нового файла |
| Критерии приёмки | Бандл содержит все CSS из `crm-static.css` в правильном порядке; нет `@import`; помечен как сгенерированный; визуальный паритет проверен на 5+ страницах |

### Шаг 3 — Добавить заголовок сгенерированного файла в бандл

| Поле | Значение |
|------|---------|
| Разрешённые файлы | `static-uikit/assets/css/crm-static.bundle.css` |
| Запрещённые файлы | Все остальные |
| Риск | Нулевой |
| Критерии приёмки | Первые строки бандла содержат комментарий: дата генерации, источник, инструкция «не редактировать вручную» |

### Шаг 4 — Визуальная проверка паритета бандла

| Поле | Значение |
|------|---------|
| Разрешённые файлы | Нет изменений в файлах — только браузерное тестирование |
| Запрещённые файлы | Все |
| Риск | Нулевой |
| Критерии приёмки | Dashboard, subjects, subject-card, middle-office, depository, document-wizard, compliance — идентичный вид при модульном и bundle-подходах |

### Шаг 5 — Обновить пути к иконкам в PHP-шаблонах UMI

| Поле | Значение |
|------|---------|
| Разрешённые файлы | Только `.phtml` PHP-шаблоны UMI (не файлы static-uikit) |
| Запрещённые файлы | `static-uikit/` HTML и CSS файлы |
| Риск | Средний — требует проверки каждого шаблона с sidebar |
| Критерии приёмки | Иконки навигации и логотип загружаются через корректный resource path; нет broken image placeholder |

---

## 13. Итоговая рекомендация

### Принципы

1. **Целевой шаблонизатор — UMI.CMS PHP (.phtml).** Не TPL, не XSLT.
2. **Сохранить модульные исходные CSS** как источник истины в `static-uikit/assets/css/`.
3. **Использовать `crm-static.css` как source entrypoint** — он уже является корректным entrypoint-only файлом (только `@import`, без inline CSS-правил).
4. **PHP-шаблоны подключают либо `crm-static.css`, либо `crm-static.bundle.css` после `uikit.min.css`** — выбор за разработчиком исходя из среды.
5. **Реальный PHP resource path хелпер должен быть подтверждён PHP-разработчиком UMI** — `$templateResources` в примерах является иллюстративным placeholder'ом.
6. **Предоставить `crm-static.bundle.css` только как генерируемый артефакт** — не как замену исходникам.
7. **CSS шаблонов документов держать отдельно** — никогда не смешивать с app CSS.
8. **Не сливать вручную** файлы `pages/` или `components/` в монолит.
9. **Сохранить относительную структуру папок** для корректной работы путей шрифтов.

### Выбор варианта подключения

| | Вариант А (модульный) | Вариант Б (бандл) |
|--|----------------------|-------------------|
| Подходит для | PHP-серверов с поддержкой @import в CSS | Сред с ограничениями на @import или HTTP/1.1 |
| Поддерживаемость | Лучше | Требует пересборки при изменениях |
| Скорость загрузки | Множество HTTP-запросов (или HTTP/2 push) | Один запрос |
| Рекомендация | Использовать как основной | Использовать как fallback или при необходимости |

### Финальный вердикт

> **Mostly safe — нужны два уточняющих шага.**
>
> CSS-архитектура готова к handoff. До передачи PHP-разработчику UMI необходимо:  
> 1. Подтвердить реальный PHP resource path хелпер (шаг 1).  
> 2. Сгенерировать `crm-static.bundle.css` и подтвердить визуальный паритет (шаги 2–4).

---

## Приложение: TPL и XSLT (справочно, не используется в этом проекте)

> **Не применяется в данном проекте** — целевой шаблонизатор PHP.  
> Следующая информация сохранена только как справочник на случай изменения шаблонизатора.

Согласно официальной документации UMI.CMS:
- В TPL-шаблонах ресурсы подключаются через макрос `%template_resources%`: `<link href="%template_resources%css/crm-static.css">`.
- В XSLT-шаблонах: параметр `<xsl:param name="template-resources" />` используется как `{$template-resources}css/crm-static.css`.
- Папки шаблонных файлов: `tpls/` (TPL) и `xslt/` (XSLT).

---

*Документ создан на основе `static-uikit/audits/CSS_ARCHITECTURE_AUDIT.md` и официальной документации UMI.CMS PHP-шаблонизатора (`dev.docs.umi-cms.ru`). Ни один implementation-файл не изменён.*
