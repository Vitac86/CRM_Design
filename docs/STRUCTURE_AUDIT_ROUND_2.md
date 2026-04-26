# STRUCTURE AUDIT ROUND 2 — CRM_Design

Дата аудита: 26 апреля 2026  
Формат: **audit-only** (без изменений прикладного кода, кроме этого отчёта)

---

## 1. Краткий вывод

После cleanup-серии структура **стала заметно ровнее**: базовые каркасные паттерны (PageShell/PageHeader/PageToolbar/PageSection), data-access композиция через provider и централизация status-каталога действительно работают как единая основа.

Проект остаётся **лёгким для CRM-прототипа**: без лишнего custom tooling, без внешних runtime API, без dependency-шумов и с минимальными npm scripts (`dev/build/preview`).

Тем не менее, архитектурный долг ещё есть:
- theme-aware слой не доведён до конца (локальные `slate/white/gray` всё ещё встречаются);
- часть статусной семантики по-прежнему локально дублируется вне StatusBadge catalog;
- остались «хвосты» предыдущей структуры (нероутируемые страницы и очень большие page-компоненты).

**Итог:**
- для демо и передачи в разработку — **да, готово**;
- структура в целом достаточно ровная, но не «закрыта под ключ»;
- cleanup стоит продолжить **короткой P1-серией**, затем перейти в P2-полировку.

---

## 2. Что улучшилось после первого аудита

### Theme
- Базовые layout primitives используют токены (`--color-*`) и общие контейнеры (`PageShell`, `PageHeader`, `PageSection`, `SplitContentShell`).
- Формы унифицированы через `app-form-input/app-form-select` и `FormField`.
- Для date-input есть централизованные стили и dark/command theme корректировки.

### Status
- Появился централизованный `statusBadge.ts` с единым catalog (`label/tone/group/aliases`) и resolver-логикой.
- В ключевых таблицах и карточках теперь массово используется `StatusBadge`.

### Routes/navigation
- Route catalog (`src/routes/paths.ts`) используется последовательно.
- Router закрывает основные бизнес-маршруты, включая `/documents`.
- Sidebar и route-catalog связаны через data navigation repository.

### Forms
- Базовый form-стек стал единообразнее: `FormField`, `SearchInput`, `SelectFilter`, `app-form-input`.
- Агрессивных phone-mask/сложных input-hacks не обнаружено; телефон нормализуется утилитами.

### Layout
- Большинство tabular/registry страниц уже на едином каркасе.
- Split-view теперь есть как отдельный layout primitive (`SplitContentShell`) и используется повторно.

### Data/API
- `DataAccessProvider` остаётся единым composition root для mock repositories.
- UI получает данные через `useDataAccess`, без прямых `fetch/axios/...` вызовов.

### Component responsibility
- Разделение `components/ui`, `components/layout`, `components/crm` в целом соблюдается.
- UI-примитивы переиспользуются чаще, чем в первом раунде.

---

## 3. Оставшиеся P0 / P1 / P2 проблемы

## P0

**Не найдено.**

## P1

1. **Theme cleanup не доведён до конца: локальные slate/white/gray ещё массово в page/crm-слое.**  
   Остатки особенно заметны в `SubjectBankAccountsTab`, `SubjectContractsTab`, `SubjectRelationsTab`, а также в отдельных страницах (`AppErrorPage`, `MiddleOfficePage` и др.). Это всё ещё подрывает предсказуемость 5 тем.

2. **Статусная семантика частично разошлась от централизованного catalog.**  
   Есть локальные status-like mapping таблицы и прямое использование `Badge`/`TableStatusText` для статусов доставки/состояний вместо единого статуса через `StatusBadge`+catalog (например, `ReportsPageTemplate`, `DepositoryPage`, `DashboardPage`).

3. **Остался архитектурный «хвост» в роутинге/страницах.**  
   `MiddleOfficePage.tsx` и `RoutePlaceholderPage.tsx` существуют, но не включены в router; при этом `/middle-office` работает через redirect на `/middle-office/clients`. Это не ломает UX, но создаёт ambiguity в кодовой карте.

4. **Крупные монолитные page-файлы всё ещё риск для дальнейшего развития.**  
   В первую очередь: `SubjectProfilePage` (~1389 строк), `RequestsPage` (~886), `ClientRegistrationWizardPage` (~705), `ComplianceCardPage` (~541).

## P2

1. **Дублирование token-блока `:root` и `:root[data-theme='current']` в `globals.css`** (почти зеркальные секции).
2. **Naming-хвост вокруг status-компонентов** (`StatusBadgeComponent.tsx` + `statusBadge.ts` + re-export `StatusBadge`).
3. **2-байтный asset (`public/brand/investica/eagle-glass.png`)** всё ещё лежит в репозитории.
4. **`globals.css` остаётся крупным и насыщенным theme-specific override-блоками** (сложность поддержки растёт).
5. **Build warning по chunk size > 500kB** (для демо не критично, но как техдолг фиксируем).

---

## 4. Новые риски после cleanup

По результатам второго раунда **переусложнение не выглядит критичным**:
- не появилось тяжёлого custom tooling;
- не добавлены guardrail-скрипты/CI-слои, которые бы утяжеляли прототип;
- package scripts остаются минимальными.

Новый умеренный риск другой: cleanup дал много улучшений, но при этом в коде сохраняются «две реальности» — унифицированные primitives и локальные legacy-паттерны. Если оставить как есть надолго, начнётся новый дрейф.

---

## 5. Что НЕ нужно делать

1. **Не внедрять сейчас сложные automation/health-check pipelines.** Для стадии прототипа достаточно `npm run build` + ручной checklist.
2. **Не делать big-bang рефакторинг всех страниц сразу.** Это повысит риск регрессий сильнее, чем даст выгоды.
3. **Не усложнять phone/date inputs кастомными масками/виджетами.** Текущая лёгкая модель адекватна.
4. **Не плодить новые абстракции ради абстракций** (особенно над уже существующими ui/layout primitives).

---

## 6. Рекомендованный план следующих PR (3–5 маленьких)

1. **PR-A (P1): Theme остатки**  
   Точечно убрать `slate/white/gray` в 3–4 самых контрастных legacy-компонентах (`SubjectBankAccountsTab`, `SubjectContractsTab`, `SubjectRelationsTab`, `AppErrorPage`).

2. **PR-B (P1): Status final pass**  
   Перевести status-like места в reports/depository/dashboard на единый подход (через `statusBadge.ts` и/или расширение catalog).

3. **PR-C (P1): Router/pages hygiene**  
   Зафиксировать судьбу `MiddleOfficePage` и `RoutePlaceholderPage` (удалить/архивировать или явно подключить).

4. **PR-D (P2): CSS token dedupe**  
   Убрать дубли `:root` vs `:root[data-theme='current']` без изменения визуального поведения.

5. **PR-E (P2): Asset hygiene**  
   Удалить/заменить `eagle-glass.png` placeholder и обновить docs при необходимости.

---

## 7. Команды и результаты

### Build
- `npm run build` — **PASS**.  
  Есть предупреждение Vite про chunk size > 500kB (не блокирует сборку).

### Поисковые проверки
- `rg -n "fetch\(|axios|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon" src`  
  Совпадений нет (внешние сетевые вызовы из UI не обнаружены).

- `rg -n "http://|https://|fonts\.googleapis|fonts\.gstatic|cdn|unpkg|jsdelivr|cloudflare|analytics|gtag|tagmanager|maps|sentry|amplitude|mixpanel" src public index.html vite.config.ts package.json docs`  
  Релевантных runtime внешних зависимостей не обнаружено; `https://` встречается в SVG namespace и audit docs.

- `rg -n "badgeVariant|statusVariant|getStatusVariant|getBadgeVariant|getStatusTone|statusClass|statusColor" src`  
  Старых helper-неймингов по страницам не найдено; есть централизованный `statusVariantMap` в `statusBadge.ts`.

- `rg -n "bg-white|bg-slate-|bg-gray-|text-slate-|text-gray-|border-slate-|border-gray-" src/components src/pages`  
  Совпадения есть (остаточный hardcoded legacy-слой).

- `rg -n "'/(dashboard|subjects|compliance|requests|documents|trading|brokerage|trust-management|depository|back-office|middle-office|agents|archives|administration)" src`  
  Совпадения только в route catalog (`src/routes/paths.ts`) — это ожидаемо.

- `rg -n "TODO|FIXME|HACK|debugger|console\.log" src`  
  Совпадений нет по шаблону поиска.

---

## Сравнение с первым аудитом (сводка)

### Закрыто из прежних P1
- **Частично закрыт router/pages hygiene:** `DocumentsPage` теперь подключён в router.
- **Существенно закрыт status cleanup baseline:** централизованный status-catalog и `StatusBadge` в большинстве сценариев.
- **Сильно улучшен layout baseline:** page-layout primitives используются значительно шире.
- **Form system cleanup реализован частично/в основном:** единый form-style layer уже есть.

### Что осталось из прежних P1
- Hardcoded palette в части страниц/CRM-компонентов.
- Монолитные страницы большого объёма.
- Локальные status-like маппинги в отдельных местах.
- Нерешённый хвост неиспользуемых/нероутируемых страниц.

### Что стало неактуально
- Тезис «`DocumentsPage` не включена в router» более не актуален.

