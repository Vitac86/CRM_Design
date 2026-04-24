# TRANSFER READINESS BASELINE

Дата аудита: 2026-04-24 (UTC)

## Цель baseline
Проверить текущее состояние frontend-прототипа CRM перед передачей внутренней команде разработки, которая позже подключит существующий production backend/БД.

---

## 1) Статус обязательных проверок

### Команды
- `npm install` — **PASSED**
- `npm run build` (включая `tsc -p tsconfig.app.json`) — **PASSED**

### Комментарии
- Установлены/проверены зависимости, проект собрался успешно.
- В процессе `npm install` и `npm run build` есть предупреждение npm про env-конфиг `http-proxy`, но сборку это не блокирует.
- По результату `npm run build` явных TypeScript-ошибок нет (проверка TypeScript выполняется внутри build-скрипта).

---

## 2) Структура `src`

Проверены директории:
- `src/app` — присутствует
- `src/components` — присутствует
- `src/pages` — присутствует
- `src/data` — присутствует
- `src/utils` — присутствует

Фактическая структура верхнего уровня `src`:
- `app`
- `components` (`crm`, `layout`, `ui`)
- `data`
- `pages`
- `styles`
- `utils`

---

## 3) Импорты из `src/data/*` внутри `src/pages` и `src/components`

Найдено большое количество прямых импортов mock/data-модулей из UI-слоя. Ниже разделение на группы.

### 3.1 Runtime/value imports

Файлы, где импортируются runtime-значения (включая смешанные `value + type` импорты):
- `src/pages/AdministrationPage.tsx`
- `src/pages/ComplianceCardPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/DepositoryPage.tsx`
- `src/pages/DocumentsPage.tsx`
- `src/pages/BrokeragePage.tsx`
- `src/pages/MiddleOfficeClientsPage.tsx`
- `src/pages/MiddleOfficePage.tsx`
- `src/pages/MiddleOfficeReportsPage.tsx`
- `src/pages/RequestsPage.tsx`
- `src/pages/SubjectProfilePage.tsx`
- `src/pages/TradingCardPage.tsx`
- `src/pages/TradingPage.tsx`
- `src/pages/TrustManagementPage.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Topbar.tsx`
- `src/components/crm/ReportsPageTemplate.tsx`
- `src/components/crm/SubjectContractsTab.tsx`
- `src/components/crm/SubjectDocumentsTab.tsx`
- `src/components/crm/SubjectHistoryTab.tsx`
- `src/components/crm/SubjectRelationsTab.tsx`

Краткий риск:
- Высокая связанность UI с текущим mock-хранилищем и конкретными runtime-структурами в `src/data/*`.
- Для API-перехода потребуется массовая замена источников данных в pages/components.
- Выше вероятность неявных регрессий при изменении контрактов data-модулей.

### 3.2 Type-only imports

Файлы, где из `src/data/*` импортируются только типы (`import type ...`):
- `src/pages/ArchivesPage.tsx`
- `src/pages/ClientRegistrationWizardPage.tsx`
- `src/pages/CompliancePage.tsx`
- `src/pages/ContractWizardPage.tsx`
- `src/pages/SubjectsPage.tsx`
- `src/components/crm/ClientProfileHeader.tsx`
- `src/components/crm/MetricCard.tsx`
- `src/components/crm/MiddleOfficeReportDetails.tsx`
- `src/components/crm/MiddleOfficeReportList.tsx`
- `src/components/crm/SubjectBankAccountsTab.tsx`
- `src/components/crm/SubjectHeader.tsx`
- `src/components/crm/registration/IndividualRegistrationForm.tsx`
- `src/components/crm/registration/LegalEntityRegistrationForm.tsx`
- `src/components/crm/registration/RegistrationBankAccountsSection.tsx`

Краткий риск:
- Runtime-связь ниже, но есть зависимость UI-слоя от доменных типов, размещённых в mock/data-дереве.
- При отделении production-модели от mock-данных потребуется реорганизация общих типов (желательно в отдельный `domain/types` слой).

### Вывод по пункту
Текущее состояние сильно связало страницу/компонент с конкретной mock-реализацией данных. Для безопасной передачи и будущего подключения API желательно ввести слой провайдера/репозитория (mock-provider по умолчанию) и постепенно убрать прямые value-импорты из `data` в UI-слое.

---

## 4) Места, где данные мутируются напрямую на уровне модуля

Критичные точки с модульной мутацией в `src/data`:

1. `src/data/clientContracts.ts`
   - Вызов `ensureContractsForActiveClients();` на уровне модуля (side effect при импорте).
   - `ensureContractsForActiveClients` делает `clientContracts.push(...)`.
   - `createClientContract(...)` делает `clientContracts.unshift(...)`.
   - `updateClientContract(...)` делает `Object.assign(contract, patch)`.

2. `src/data/requests.ts`
   - `createRequest(...)` делает `requests.unshift(request)`.

### Вывод по пункту
Текущее поведение годится для demo/mock режима, но создаёт риски для передачи:
- неявные side effects при импорте модулей;
- shared mutable state между экранами;
- сложнее контролировать консистентность при будущем API-переходе.

---

## 5) Маршруты + проверка `404` / error boundary

Маршруты определены в `src/app/routes.tsx` через `createBrowserRouter`.

Обнаруженные пути:
- `/` (redirect на `/dashboard`)
- `/dashboard`
- `/subjects`
- `/subjects/register`
- `/subjects/:id`
- `/subjects/:subjectId/contract-wizard`
- `/brokerage`
- `/trust-management`
- `/agents`
- `/archives`
- `/requests`
- `/compliance`
- `/compliance/:id`
- `/middle-office` (redirect на `/middle-office/clients`)
- `/middle-office/clients`
- `/middle-office/reports`
- `/back-office`
- `/trading`
- `/trading/:id`
- `/depository`
- `/administration`

### Проверка защитных маршрутов
- Catch-all маршрут `*` для 404: **НЕ найден**.
- `errorElement`/ErrorBoundary на уровне роутера: **НЕ найден**.

---

## 6) Повторяющиеся паттерны фильтрации / сортировки / пагинации

Повторяемые паттерны (дублируемая логика в нескольких местах):

1. **Фильтрация + поиск по строке**
- `SubjectsPage.tsx`
- `TradingPage.tsx`
- `DocumentsPage.tsx`
- `RequestsPage.tsx`
- `DepositoryPage.tsx`
- `MiddleOfficeClientsPage.tsx`
- `MiddleOfficeReportsPage.tsx`
- `ReportsPageTemplate.tsx`

2. **Сортировка списков с локальными компараторами**
- `SubjectsPage.tsx`
- `TradingPage.tsx`
- `BrokeragePage.tsx`
- `MiddleOfficeClientsPage.tsx`

3. **Пагинация через `slice((page - 1) * pageSize, page * pageSize)`**
- `SubjectsPage.tsx`
- `TradingPage.tsx`
- `DocumentsPage.tsx`
- `RequestsPage.tsx`
- `ReportsPageTemplate.tsx`

### Вывод по пункту
Есть хороший потенциал для унификации (например, shared table-query helpers/hooks), чтобы снизить риск рассинхронизации поведения после подключения API.

---

## 7) Формы с ручной валидацией

Найдены формы/экраны с явной ручной проверкой полей через `if`/`trim`/локальные error-state:

- `src/pages/ClientRegistrationWizardPage.tsx`
- `src/pages/SubjectProfilePage.tsx`
- `src/pages/RequestsPage.tsx`
- `src/pages/AgentsPage.tsx`
- `src/components/crm/SubjectBankAccountsTab.tsx`
- `src/components/crm/SubjectDocumentsTab.tsx`
- `src/components/crm/SubjectContractsTab.tsx`
- `src/components/crm/registration/RegistrationBankAccountsSection.tsx`

### Вывод по пункту
Валидация распределена по компонентам и страницам, формат ошибок/правил неоднородный. Для передачи это допустимо, но при API-интеграции желательна унификация схем валидации и единый формат ошибок.

---

## 8) Quality gates

Проверка `package.json` показала, что сейчас определены только скрипты:
- `dev`
- `build`
- `preview`

Отдельные quality gates **отсутствуют**:
- `lint`
- отдельный `typecheck`
- `test`
- `test:run`

Вывод:
- Базовая сборка проходит, но нет формализованных автоматических «ворот качества» для статического анализа и тестов.

---

## 9) Visual/responsive verification

Текущий baseline **не подтверждает выполнение ручной визуальной проверки UI**.

Что нужно проверить отдельно перед передачей:
- desktop (широкий экран);
- 1024px;
- 768px;
- 390px;
- поведение sidebar (сворачивание/перекрытие/навигация);
- таблицы (переполнение, sticky/scroll, читаемость колонок);
- формы (валидация, состояния ошибок, доступность);
- модальные окна (позиционирование, скролл, закрытие, фокус).

---

## 10) Reproducible audit commands

Ниже набор команд, которыми можно повторить аудит ключевых зон.

### Импорты из `src/data/*` в pages/components
```bash
rg -n "^import( type)? .*from ['\"](\.\./)+data/" src/pages src/components
```

### Разделение runtime/value и type-only импортов
```bash
# runtime/value (включая смешанные импорты)
rg -n "^import (?!type).*from ['\"](\.\./)+data/" src/pages src/components

# строго type-only
rg -n "^import type .*from ['\"](\.\./)+data/" src/pages src/components
```

### Поиск модульных мутаций/side effects в `src/data`
```bash
rg -n "(^\s*[^/\n]*\b(push|unshift|splice|Object\.assign)\b|ensureContractsForActiveClients\(\);)" src/data
```

### Поиск маршрутов, 404 и error boundary
```bash
rg -n "createBrowserRouter|path:\s*['\"]|Navigate|errorElement|\*" src/app/routes.tsx
```

### Проверка scripts в `package.json`
```bash
cat package.json
```

### Быстрая инвентаризация структуры `src`
```bash
find src -maxdepth 2 -type d | sort
```

---

## 11) Что критично сделать до передачи разработчикам

1. Зафиксировать контракт data-access слоя:
   - ввести mock-provider/repository abstraction,
   - убрать прямые value-импорты `data/*` из pages/components в пользу этого слоя (постепенно).
2. Изолировать mutable operations:
   - исключить неявные модульные side effects,
   - сделать явные операции через provider/service API.
3. Добавить минимальный fallback для роутинга:
   - 404-маршрут (`*`),
   - router-level `errorElement`.
4. Ввести quality gates:
   - добавить `lint`,
   - добавить отдельный `typecheck`,
   - добавить `test`/`test:run`.

---

## 12) Что можно оставить на потом

1. Постепенная унификация table/query логики (фильтры/сортировки/пагинация).
2. Постепенная унификация ручной валидации (единые схемы/хелперы).
3. Косметическая cleanup-задача по предупреждению `http-proxy` в npm config.

---

## 13) Результат повторной проверки сборки после обновления baseline

Команда:
- `npm run build` — **PASSED** (2026-04-24, UTC)

Комментарий:
- После обновления `docs/TRANSFER_READINESS_BASELINE.md` runtime-код приложения не изменялся; сборка проходит успешно.

---

## Список ключевых файлов baseline-аудита

- Роутинг:
  - `src/app/routes.tsx`

- Данные и мутация состояния:
  - `src/data/clientContracts.ts`
  - `src/data/requests.ts`

- Страницы с фильтрацией/сортировкой/пагинацией:
  - `src/pages/SubjectsPage.tsx`
  - `src/pages/TradingPage.tsx`
  - `src/pages/DocumentsPage.tsx`
  - `src/pages/RequestsPage.tsx`
  - `src/pages/BrokeragePage.tsx`
  - `src/pages/MiddleOfficeClientsPage.tsx`
  - `src/pages/MiddleOfficeReportsPage.tsx`
  - `src/pages/DepositoryPage.tsx`

- Переиспользуемый шаблон отчётов/табличной логики:
  - `src/components/crm/ReportsPageTemplate.tsx`

- Формы с ручной валидацией:
  - `src/pages/ClientRegistrationWizardPage.tsx`
  - `src/pages/SubjectProfilePage.tsx`
  - `src/pages/RequestsPage.tsx`
  - `src/pages/AgentsPage.tsx`
  - `src/components/crm/SubjectBankAccountsTab.tsx`
  - `src/components/crm/SubjectDocumentsTab.tsx`
