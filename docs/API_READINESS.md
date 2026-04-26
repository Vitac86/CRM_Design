# API readiness: data/repository layer

## 1) Текущая архитектура data layer

Проект использует паттерн `UI -> DataAccessProvider -> repository interfaces -> mock implementations -> seed data`.

- **UI-слой (pages/components)** получает данные через `useDataAccess()` и не должен зависеть от конкретного mock-файла.
- **`DataAccessProvider`** — единая точка композиции репозиториев.
- **Repository interfaces** описывают контракт данных для фич.
- **Mock repositories** реализуют эти интерфейсы и работают с in-memory копиями seed-массивов.
- **Seed data (`src/data/*`)** содержит локальные статические данные прототипа.

## 2) Где находятся domain types

- Базовые доменные типы: `src/data/types.ts`.
- Фичеспецифичные типы рядом с seed-данными:
  - `src/data/dashboard.ts` (`DashboardMetric`, `SubjectChange`)
  - `src/data/agents.ts` (`AgentProfile`, `AgentClientLink`)
  - `src/data/administration.ts` (`AdministrationSection`)
  - `src/data/brokerage.ts` / `src/data/trustManagement.ts` (операционные контракты)

## 3) Где находятся repository interfaces

Интерфейсы расположены по фичам в `src/features/*/api/*Repository.ts`, например:

- `src/features/clients/api/clientsRepository.ts`
- `src/features/contracts/api/contractsRepository.ts`
- `src/features/requests/api/requestsRepository.ts`
- `src/features/operations/api/operationsRepository.ts`
- `src/features/navigation/api/navigationRepository.ts`

## 4) Где находятся mock implementations

Mock-реализации находятся в `src/features/*/mock/*Repository.ts` и создаются фабриками `createMock...Repository()`.

Ключевые принципы текущих mock-репозиториев:
- Большинство методов async (через `Promise`) — контракт уже совместим с реальным API.
- Seed-данные копируются в локальный store (in-memory).
- На выдаче обычно возвращаются клоны (`structuredClone`/поверхностные копии), чтобы UI не мутировал внутренний store.

## 5) Как DataAccessProvider подключает данные

`src/app/dataAccess/DataAccessProvider.tsx`:
- создаёт и связывает mock-репозитории в одном месте;
- предоставляет типизированный context (`DataAccessContextValue`);
- инжектит зависимости между репозиториями (например, `clientsRepository` используется в `agents` и `contracts` mock-репозиториях).

`src/app/dataAccess/useDataAccess.ts` гарантирует, что доступ к данным идёт только внутри провайдера.

## 6) Как заменить mock repositories на real API repositories в будущем

Рекомендуемый порядок миграции:

1. Для каждой фичи добавить API-реализацию того же интерфейса (`src/features/*/api/*`).
2. Сохранить сигнатуры интерфейсов (методы/типы возврата).
3. В `DataAccessProvider` заменить `createMock...Repository()` на `createApi...Repository()` точечно.
4. Для rollout использовать feature-flag/переключатель окружения **внутри provider composition root**, не в pages.
5. Постепенно удалить прямые зависимости mock-репозиториев от seed-данных после полного переключения.

## 7) Правило self-contained runtime

Обязательное правило для frontend:

- Никаких прямых запросов на внешний домен из UI-кода.
- Будущий backend доступен только:
  - через относительный путь (`/api/...`), **или**
  - через backend/proxy на том же origin.

Это сохраняет self-contained поведение окружения и упрощает деплой.

## 8) Future data debt (что оставить на будущий рефактор)

1. **Локальная фильтрация/сортировка в pages** (часто в `useMemo`) пока находится в UI. Для API это стоит переносить в query-параметры/селекторы постепенно.
2. **Часть форматирования статусов/лейблов в pages** дублируется между экранами — можно вынести в feature-level selectors/presenters.
3. **Границы DTO/domain моделей** пока не выделены отдельно. На этапе API-интеграции стоит добавить слой маппинга `ApiDto -> DomainModel`.

## 9) Страницы, где data logic всё ещё внутри UI

Выявленные страницы с заметной локальной data-логикой (фильтры, сортировки, агрегации, преобразования):

- `DashboardPage`
- `SubjectsPage`
- `SubjectProfilePage`
- `RequestsPage`
- `DocumentsPage`
- `CompliancePage`
- `ComplianceCardPage`
- `TradingPage`
- `TradingCardPage`
- `BrokeragePage`
- `TrustManagementPage`
- `DepositoryPage`
- `MiddleOfficeClientsPage`
- `MiddleOfficeReportsPage`
- `AgentsPage`
- `ArchivesPage`
- `AdministrationPage` (минимальная data logic)

Это допустимо для прототипа, но при переходе на API желательно выносить тяжёлые выборки/преобразования в repositories/selectors.
