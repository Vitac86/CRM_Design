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

## 3) Прямые импорты из `src/data/*` внутри `src/pages` и `src/components`

Найдено большое количество прямых импортов mock/data-модулей из UI-слоя.

### Страницы (`src/pages`)
Ключевые страницы с прямыми импортами `../data/*`:
- `DashboardPage.tsx`
- `MiddleOfficeClientsPage.tsx`
- `DocumentsPage.tsx`
- `ComplianceCardPage.tsx`
- `AdministrationPage.tsx`
- `MiddleOfficeReportsPage.tsx`
- `MiddleOfficePage.tsx`
- `CompliancePage.tsx` (типы)
- `SubjectProfilePage.tsx`
- `ArchivesPage.tsx` (типы)
- `SubjectsPage.tsx` (типы)
- `TradingPage.tsx`
- `DepositoryPage.tsx`
- `TradingCardPage.tsx`
- `ClientRegistrationWizardPage.tsx` (типы)
- `BrokeragePage.tsx`
- `ContractWizardPage.tsx`
- `RequestsPage.tsx`
- `TrustManagementPage.tsx`

### Компоненты (`src/components`)
Ключевые компоненты с импортами `../../data/*` / `../../../data/*`:
- `components/layout/Topbar.tsx`
- `components/layout/Sidebar.tsx`
- `components/crm/SubjectContractsTab.tsx`
- `components/crm/SubjectHistoryTab.tsx`
- `components/crm/SubjectRelationsTab.tsx`
- `components/crm/SubjectDocumentsTab.tsx`
- `components/crm/ReportsPageTemplate.tsx`
- `components/crm/MetricCard.tsx`
- `components/crm/MiddleOfficeReportList.tsx` (типы)
- `components/crm/MiddleOfficeReportDetails.tsx` (типы)
- `components/crm/SubjectHeader.tsx` (типы)
- `components/crm/ClientProfileHeader.tsx` (типы)
- `components/crm/SubjectBankAccountsTab.tsx` (типы)
- `components/crm/registration/*` (типы)

### Вывод по пункту
Текущее состояние сильно связало страницу/компонент с конкретной mock-реализацией данных. Для безопасной передачи и будущего подключения API желательно ввести слой провайдера/репозитория (mock-provider по умолчанию) и постепенно убрать прямые импорты из `data` в UI-слое.

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

## Риски (prioritized)

### Высокий приоритет (критично до передачи)
1. **Нет 404 и router error boundary** — падения/невалидные URL не имеют централизованной деградации UX.
2. **Модульные side effects и mutable state в `data`** (`clientContracts`, `requests`) — высокий риск неочевидного поведения при интеграции API/кеша.
3. **Сильная связанность UI со `src/data/*`** — сложнее заменить mock на API без массовых правок.

### Средний приоритет
4. **Дублирование filter/sort/pagination логики** — риск расхождения поведения таблиц между экранами.
5. **Разрозненная ручная валидация** — повышает стоимость поддержки и риск регрессий.

### Низкий приоритет / можно позже
6. **Предупреждение npm про `http-proxy` env config** — не блокирует сборку, но лучше очистить конфигурацию окружения.

---

## Что критично сделать до передачи разработчикам

1. Добавить минимальный fallback для роутинга:
   - 404-маршрут (`*`),
   - router-level `errorElement`.
2. Зафиксировать контракт data-access слоя:
   - ввести mock-provider/repository abstraction,
   - убрать прямые импорты `data/*` из pages/components в пользу этого слоя (постепенно).
3. Изолировать mutable operations:
   - исключить неявные модульные side effects,
   - сделать явные операции через provider/service API.

---

## Что можно оставить на потом

1. Постепенная унификация table/query логики (фильтры/сортировки/пагинация).
2. Постепенная унификация ручной валидации (единые схемы/хелперы).
3. Косметическая cleanup-задача по предупреждению `http-proxy` в npm config.

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
  - `src/components/crm/SubjectContractsTab.tsx`
  - `src/components/crm/registration/RegistrationBankAccountsSection.tsx`

---

## Итог baseline
Проект находится в рабочем demo-состоянии и собирается без TypeScript-ошибок, но до безопасной передачи под API-интеграцию нужно закрыть архитектурные риски around routing resilience, data-access abstraction и управление mutable mock-state.
