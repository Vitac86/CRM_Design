# STRUCTURE AUDIT — CRM_Design

Дата аудита: 26 апреля 2026
Формат: **audit-only** (без изменений прикладного кода)

## 1) Краткий вывод

Проект в рабочем состоянии: сборка проходит, роутинг базово целостный, data-access слой уже выделен в интерфейсы и mock-репозитории.

При этом структура **не полностью ровная**: в проекте одновременно сосуществуют две архитектурные линии UI:
1. token/theme-aware слой (`PageShell`, `DataTable`, `StatusBadge`, `--color-*`),
2. локальные page-specific решения со старым/ручным Tailwind (`text-slate-*`, `bg-white`, `border-slate-*`, локальные модалки/тосты/панели).

Критичных проблем уровня P0 (ломающих build/роуты/рендер) не найдено. Основной риск — накопление P1-долга: несогласованный layout, дубли статусной семантики, hardcoded-стили и «толстые» страницы.

**Итог:**
- к демонстрации проект готов;
- к масштабированию готов частично;
- перед активным расширением (новые темы, новые разделы, переход на real API) нужен пакет небольших структурных PR.

---

## 2) Карта проекта

### Текущая структура
- `src/app` — bootstrap, router, data-access provider.
- `src/pages` — page-level контейнеры (часть очень большие, часть стандартизированы через PageShell).
- `src/components`
  - `ui` — базовые переиспользуемые элементы;
  - `layout` — каркас приложения (AppShell, Sidebar, Topbar, shells);
  - `crm` — domain-компоненты.
- `src/features/*/{api,mock}` — интерфейсы репозиториев и mock-реализации.
- `src/data` — seed/mock данные и типы домена.
- `src/theme` — theme ids/types/provider/useTheme.
- `src/styles/globals.css` — дизайн-токены, theme variables, глобальные utility/fixes.
- `public` — локальные ассеты и шрифты.
- `docs` — документация и audit-артефакты.

### Слои
- UI слой: есть базовый компонентный фундамент.
- Data слой: есть отделение `api interface -> mock repo` + `DataAccessProvider`.
- Theme слой: централизован в `ThemeProvider` + CSS variables.

---

## 3) Сильные стороны

1. **Стабильная сборка**: `npm run build` успешно завершился.
2. **Чёткий data-access контракт** через интерфейсы репозиториев и единый provider.
3. **Theme foundation уже зрелый**: 5 тем, `ThemeId`, storage key, применение через `data-theme` + CSS variables.
4. **Базовые UI-кирпичи есть**: `Button`, `Badge`, `StatusBadge`, `DataTable`, `FormField`, `Pagination`, `SearchInput`, `SelectFilter`.
5. **Sidebar/router консистентны по основным разделам** (битых ссылок между меню и роутами не обнаружено).

---

## 4) Найденные проблемы

## P0 — критично

**Не найдено.**

---

## P1 — важно

1. **Несогласованный layout по страницам**
   - Часть страниц использует `PageShell`, часть рендерит собственные root-container/панели.
   - Это видно на крупных страницах профилей/кардов и wizard-страницах.
   - Риск: дрейф отступов/фонов/адаптива и рост «локальных» фиксов.

2. **Смешение theme-token стилей и hardcoded Tailwind палитры**
   - Во многих страницах/CRM-компонентах активно используются `text-slate-*`, `bg-white`, `border-slate-*`, `bg-slate-*`.
   - Это подрывает обещание «5 тем» и усложняет безопасное добавление 6-й темы.

3. **Дубли логики статусов/бейджей**
   - Есть общий `StatusBadge` + map в `statusBadge.ts`, но одновременно встречаются локальные `badgeVariant`-таблицы, локальные helpers и `Badge` напрямую для статусов.
   - Риск: один и тот же статус может визуально отличаться в разных разделах.

4. **Крупные page-файлы с высокой связностью**
   - `SubjectProfilePage.tsx` (~1388 строк), `RequestsPage.tsx` (~884), `ClientRegistrationWizardPage.tsx` (~704).
   - Внутри смешаны layout + state + data mapping + form-flow + side-effects.
   - Риск: сложность поддержки, regressions при точечных изменениях.

5. **Часть страниц не включена в актуальный router**
   - `DocumentsPage`, `MiddleOfficePage`, `RoutePlaceholderPage` присутствуют в `src/pages`, но не подключены в `routes.tsx`.
   - Это создаёт «мертвый» слой и неоднозначность целевой архитектуры.

6. **Локальные DOM/печать/модальные механики без единой abstraction**
   - Повторяемые pattern’ы: toast timers, overlay-модалки, `window.open + document.write`, `document.createElement('a')`.
   - Риск: различия поведения и а11y между страницами.

7. **Asset anomaly**
   - `public/brand/investica/eagle-glass.png` имеет размер 2 байта (placeholder/битый ассет).
   - Сейчас не используется, но это признак «грязного» asset-слоя.

---

## P2 — полировка

1. Несогласованность naming/наследия: `StatusBadgeComponent.tsx` + `statusBadge.ts` + экспорт `StatusBadge` из index.
2. Точечные `eslint-disable-next-line no-console` (в error page) — допустимо, но лучше документировать policy.
3. Barrel exports в `ui/index.ts` в целом корректны, но рядом много компонентов неравномерно используемых в pages.
4. `globals.css` очень крупный (~1734 строк) и содержит большой объём theme-specific override-блоков — поддержка усложняется.
5. Build warning по размеру chunk > 500 KB (не критично для демо, но сигнал к future split).

---

## 5) Костыли и технический долг

1. **Локальные цветовые классы в theme-aware приложении**
   - Почему костыль: обход token-системы.
   - Опасность: средняя/высокая (особенно при расширении тем).
   - Как исправлять: постепенно переводить page-specific классы на `--color-*`/компонентные пресеты.

2. **Локальные status maps по страницам**
   - Почему костыль: дублирование семантики статусов.
   - Опасность: средняя (UI-инконсистентность).
   - Как исправлять: централизовать mappings/labels в едином status catalog.

3. **Монолитные страницы**
   - Почему костыль: нарушение SRP на уровне page.
   - Опасность: высокая для velocity команды.
   - Как исправлять: дробить на feature-sections и hooks без массового big-bang рефакторинга.

4. **Неиспользуемые страницы и артефакты**
   - Почему костыль: исторический хвост / ambiguity.
   - Опасность: средняя (ошибки при навигации по коду).
   - Как исправлять: зафиксировать статус «deprecated» или вернуть в roadmap/роутинг.

---

## 6) Theme system audit

### Что хорошо
- Theme ids строго типизированы (`ThemeId`) и синхронизированы с реестром `themes`.
- Тема сохраняется в `localStorage` и применяется на `documentElement`/`#root`.
- В `globals.css` есть полноценные token-наборы для всех 5 тем, включая scrollbars, links, form-focus, date-picker индикаторы.

### Что плохо
- Много hardcoded цветов в pages/components обходят токены.
- Есть theme-specific override-блоки высокой сложности (длинные секции в `globals.css`).
- В отдельных местах используются inline-style превью (на `AdministrationPage`) — приемлемо для preview-карточек, но лучше держать это явно как «исключение». 

### Готовность к 6-й теме
- **Технически возможно** (тип + themes + css vars уже есть).
- **Операционно рискованно** без cleanup hardcoded классов: новая тема потребует ручных патчей в «локальных» страницах.

---

## 7) Component system audit

### Хорошая база
- `Button`, `DataTable`, `FormField`, `SearchInput`, `SelectFilter`, `Pagination`, `StatusBadge`.
- `TableControlPanel` уже задаёт полезный паттерн для search/filters/actions.

### Проблемы
- `StatusBadge` используется не везде, где есть статусная семантика (часто прямой `Badge`).
- Есть локальные status helper-функции на страницах.
- Часть domain-компонентов совмещают layout + data mapping + mutation/UI states.
- Casing-конфликтов файлов не обнаружено, но naming-слой неоднороден (`StatusBadgeComponent.tsx` vs `statusBadge.ts`).

---

## 8) Page layout audit

### Страницы, близкие к эталонному паттерну
- `/subjects`
- `/compliance`
- `/brokerage`
- `/trust-management`
- `/trading`
- `/depository`
- `/middle-office/clients`
- `/middle-office/reports`
- `/agents`
- `/archives`

(Объединяет: `PageShell`, единый table/filter подход, theme-aware классы в большем объёме.)

### Страницы, которые выбиваются
- `/dashboard` (ручной кастомный layout таблиц/секций)
- `/subjects/:id`
- `/subjects/register`
- `/subjects/:subjectId/contract-wizard`
- `/compliance/:id`
- `/requests`
- `/trading/:id`
- `/administration`

### Где риски будущих багов
- страницы с локальными модалками/тостами/печатью;
- страницы со смешением hardcoded palette + theme tokens;
- очень крупные файлы с множеством inline handlers и сложным local state.

---

## 9) Data/API readiness

### Текущее состояние
- DataAccessProvider собран корректно, репозитории отделены от UI по интерфейсам.
- Прямых внешних API-вызовов (`fetch/axios/WebSocket/EventSource`) в `src` не найдено.
- mock-данные централизованы, но местами присутствует page-level data orchestration большого объёма.

### Готовность к real API
- Базовый каркас готов.
- Потенциальные сложности:
  1. большие страницы, где data+UI tightly coupled;
  2. локальные форматы статусов (понадобится нормализация контрактов);
  3. ручные side-effect сценарии (print/export/download) без единого сервиса.

---

## 10) Self-contained audit

### Положительно
- Локальные шрифты через `@font-face` (без Google Fonts/CDN runtime-зависимостей).
- В `src/public/docs` не обнаружено внешних runtime API-интеграций.
- `https://` упоминания в проекте — в основном SVG namespace (`w3.org`) и допустимые технические строки.

### Проблемы
- Найден 2-байтный файл `public/brand/investica/eagle-glass.png` (placeholder/битый asset).

### Что проверить перед релизом
- валидность/нужность всех brand-ассетов;
- исключить неиспользуемые placeholder-файлы;
- визуальный smoke по всем темам на страницах с hardcoded `slate/white`.

---

## 11) Рекомендованный план исправлений (малые безопасные PR)

### Этап 1 — P0
- Нет обязательных PR по P0.

### Этап 2 — P1

**PR-1: Theme cleanup baseline (без изменения UX)**
- Цель: убрать ключевые hardcoded `slate/white/gray` классы в наиболее критичных страницах (Requests/SubjectProfile/TradingCard/ComplianceCard).
- Результат: предсказуемая работа 5 тем, снижение theme-specific багов.

**PR-2: Status unification catalog**
- Цель: единый статусный реестр (label + variant + tone), перенос page-level mappings в централизованный модуль.
- Результат: одинаковая визуализация статусов в таблицах/карточках/поиске.

**PR-3: Layout shell convergence**
- Цель: унифицировать root layout страниц (PageShell/PageToolbar/SplitContentShell patterns), убрать локальные каркасные дубляжи.
- Результат: консистентные отступы/панели/адаптив и проще QA.

**PR-4: Large pages decomposition (по одной странице за PR)**
- Цель: выделение секций и hooks для `SubjectProfilePage`, затем `RequestsPage`, затем `ClientRegistrationWizardPage`.
- Результат: ниже когнитивная сложность и риск регрессий.

**PR-5: Router/pages hygiene**
- Цель: формально решить судьбу `DocumentsPage`, `MiddleOfficePage`, `RoutePlaceholderPage` (подключить или удалить/архивировать).
- Результат: прозрачная целевая карта страниц.

**PR-6: UI behavior primitives**
- Цель: стандартизовать toast/modal/export/print helpers.
- Результат: единое поведение, меньше локальных DOM-костылей.

### Этап 3 — P2

**PR-7: Naming/barrel cleanup**
- Цель: выровнять нейминг (`StatusBadgeComponent`/`statusBadge`) и публичные API barrel-файлов.
- Результат: проще навигация и onboarding.

**PR-8: Global CSS split**
- Цель: разделить `globals.css` на блоки (tokens/base/components/theme-overrides).
- Результат: выше сопровождаемость без функциональных изменений.

**PR-9: Asset hygiene**
- Цель: убрать/заменить битые и неиспользуемые ассеты (включая 2-byte placeholder).
- Результат: чистый self-contained пакет.

---

## 12) Команды, которые запускались

1. `npm run build`
   - Результат: **успех**.
   - Примечание: warning о размере чанка > 500KB.

2. Проверки по репозиторию (`rg`/python/find):
   - `rg -n "TODO|FIXME|HACK" src docs`
   - `rg -n "console\.log|debugger" src`
   - `rg -n "@ts-ignore|eslint-disable|\bany\b" src`
   - `rg -n "https?://" src public docs`
   - `rg -n "fetch\(|axios|XMLHttpRequest|WebSocket|EventSource" src`
   - `rg -n "localStorage|window\.|document\." src`
   - `rg -n "text-(slate|gray|blue|...)|bg-(white|slate|...)|border-(slate|gray|...)" src/pages src/components`
   - `python`-проверки на:
     - размер/длину файлов;
     - страницы вне router;
     - case-duplicate файлы;
     - соответствие menu links и routes.
   - `find public -type f -printf '%s %p\n' | sort -n`

3. Ключевые наблюдения по проверкам
   - внешние runtime API вызовы не найдены;
   - найден 2-byte asset в `public/brand/investica/eagle-glass.png`;
   - есть страницы в `src/pages`, не подключённые к router;
   - выявлено большое количество hardcoded цветовых классов в pages/components.
