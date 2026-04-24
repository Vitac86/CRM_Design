# Integration Guide

## Текущий режим проекта

Проект работает в **demo/mock mode**: интерфейс и бизнес-сценарии демонстрируются на локальных mock-данных без интеграции с backend.

## Роль `src/data/*`

Каталог `src/data/*` остаётся источником seed/mock-данных для текущего прототипа.

- Эти данные используются для demo-режима.
- UI-слой не должен импортировать `src/data/*` напрямую в runtime.
- `src/data/requests.ts` теперь является **seed-only** файлом (без runtime-мутаций).
- `src/data/clientAccounts.ts` является **seed-only** файлом для счетов клиента.
- `src/data/clientContracts.ts` является **seed/pure-helper** файлом (seed + `createDefaultContractConfig`).
- `src/data/compliance.ts` теперь является **readonly seed-only** файлом для комплаенс-данных.
- `src/data/reports.ts` теперь является **readonly seed-only** файлом для отчётов (используется через ReportsRepository).
- `src/data/trading.ts`, `src/data/documents.ts`, `src/data/administration.ts`, `src/data/brokerage.ts`, `src/data/trustManagement.ts`, `src/data/clientHistory.ts`, `src/data/menu.ts` переведены в **readonly seed-only** режим для использования через mock-репозитории.

## Новый data-access слой

Добавлен базовый слой data-access как архитектурная граница для будущей интеграции с API:

- `src/app/dataAccess/*` — React Context провайдер и хук доступа;
- `src/features/*/api/*Repository.ts` — интерфейсы репозиториев с async-контрактом (`Promise<...>`);
- `src/features/*/mock/*Repository.ts` — mock-реализации, использующие `src/data/*` только внутри mock-слоя;
- `src/shared/api/*` — базовые общие типы для async/result-паттернов.

Сейчас `DataAccessProvider` создаёт mock-репозитории и предоставляет их через context. В следующих шагах реализации репозиториев могут быть заменены на реальные API без изменения контракта доступа в UI.


## Migration status

После завершения текущего шага миграции:

- `RequestsPage` использует `useDataAccess().clients`, `useDataAccess().requests` и `useDataAccess().contracts`.
- `DashboardPage` использует `useDataAccess().dashboard` и `useDataAccess().requests`.
- `SubjectsPage` (read/list) использует `useDataAccess().clients.listClients()`.
- `SubjectProfilePage` использует `useDataAccess().clients` для `getClientById/listClients/updateClient/archiveClient`.
- `SubjectProfilePage` больше не читает contract helpers напрямую из `src/data/clientContracts` в runtime.
- Contract read helpers (`getPrimaryContractByClientId`, `getContractConfigById` и связанные read-операции) доступны через `useDataAccess().contracts`.
- `ContractWizardPage` использует `useDataAccess().clients` (`getClientById/updateClient`) и `useDataAccess().contracts` (`createDefaultContractConfig/getContractById/getContractConfigById/createContract/updateContract/updateContractConfig`).
- `SubjectContractsTab` использует `useDataAccess().contracts.listContractsByClientId()` и `useDataAccess().accounts.listAccountsByClientId()/createAccount()`; runtime-импорты `src/data/clientAccounts` из компонента удалены.
- `ArchivesPage` использует `useDataAccess().clients` для `listClients/restoreClient`.
- `ClientRegistrationWizardPage` использует `useDataAccess().clients.createClient()` вместо `useClientsStore().addClient()`.
- Новый клиент после регистрации создаётся в `ClientsRepository` и сразу доступен в `SubjectsPage` (list) и `SubjectProfilePage` (open by id).
- `DashboardPage` больше не импортирует `src/data/*` напрямую в runtime.
- Создание поручений в demo-mode реализовано только в `src/features/requests/mock/mockRequestsRepository.ts`.
- `src/data/requests.ts` используется только как источник immutable seed для mock-репозитория.
- `src/data/dashboard` пока остаётся seed/mock-источником внутри `mockDashboardRepository`.
- `ClientsStore` больше не должен быть источником истины для уже мигрированных client-экранов (`SubjectsPage`, `SubjectProfilePage`, `ArchivesPage`).
- Client list/profile/archive теперь работают через единый `ClientsRepository` (`useDataAccess().clients`).
- `ClientsRepository` расширен методами `createClient` и `getClientByCode` для сценариев регистрации/поиска.
- `ContractsRepository` расширен create/update-методами; runtime-поведение создания/обновления договора и конфигурации договора перенесено в `src/features/contracts/mock/mockContractsRepository.ts`.
- `AccountsRepository` добавлен в `DataAccessProvider` и отвечает за счета клиента в demo-mode через `src/features/accounts/mock/mockAccountsRepository.ts`.
- Demo-инициализация active broker/depository договоров для активных клиентов выполняется внутри `src/features/contracts/mock/mockContractsRepository.ts` (а не в seed-файле).
- `src/data/clientContracts.ts` используется как seed/pure-helper источник без runtime mutations.
- `AgentsPage` использует `useDataAccess().agents` и `useDataAccess().clients` (без `useClientsStore`).
- `SubjectRelationsTab` использует `useDataAccess().relations`, `useDataAccess().agents` и `useDataAccess().clients`; runtime-импорты `src/data/clientRelations` удалены.
- `AgentsRepository` добавлен в `DataAccessProvider` и отвечает за агентов и связи агент-клиент в demo-mode.
- `RelationsRepository` добавлен в `DataAccessProvider` и отвечает за read-only связи клиента.
- `src/data/agents.ts` используется как seed-only файл.
- `src/data/clientRelations.ts` теперь является **seed-only** файлом; legacy helper `getRelationsByClientId` удалён.
- `CompliancePage` использует `useDataAccess().clients.listClients()` (без `useClientsStore`).
- `ComplianceCardPage` использует `useDataAccess().clients/compliance/documents/relations` для загрузки клиента, кейса, карточек, документов и связей.
- `ComplianceRepository` добавлен в `DataAccessProvider` и отвечает за compliance seed data в demo-mode.
- `DocumentsRepository` добавлен в `DataAccessProvider` и отвечает за документы клиента в demo-mode.
- `SubjectDocumentsTab` использует `useDataAccess().documents.listDocumentsByClientId()`.
- `src/data/clientDocuments.ts` теперь является **seed-only** файлом (legacy helper `getDocumentsByClientId` удалён).
- `MiddleOfficePage` использует `useDataAccess().clients/contracts/accounts/reports`; runtime-импорты `src/data/clientAccounts`, `src/data/clientContracts`, `src/data/reports` удалены.
- `MiddleOfficeClientsPage` использует `useDataAccess().clients/contracts/accounts`; runtime-импорты `src/data/clientAccounts`, `src/data/clientContracts` удалены.
- `MiddleOfficeReportsPage` использует `useDataAccess().reports.listReportsByDepartment('Мидл-офис')`.
- `DepositoryPage` использует `useDataAccess().reports.listReportsByDepartment('Депозитарий')`.
- `ReportsPageTemplate` не импортирует runtime-данные из `src/data/*`; шаблон получает отчёты через props (presentation-only).
- `ReportsRepository` добавлен в `DataAccessProvider` и отвечает за reports seed data в demo-mode.
- `TradingPage` и `TradingCardPage` используют `useDataAccess().trading` + `useDataAccess().clients`; runtime-импорты `src/data/trading` и `src/data/clients` удалены из UI.
- Добавлен `TradingRepository` (`src/features/trading/api/tradingRepository.ts`, `src/features/trading/mock/mockTradingRepository.ts`).
- `DocumentsRepository` расширен методом `listDocuments()`; `DocumentsPage` переведена на `useDataAccess().documents.listDocuments()`.
- `AdministrationPage` переведена на `useDataAccess().administration.listSections()`.
- Добавлен `AdministrationRepository` (`src/features/administration/api/administrationRepository.ts`, `src/features/administration/mock/mockAdministrationRepository.ts`).
- `BrokeragePage` и `TrustManagementPage` переведены на `useDataAccess().operations`.
- Добавлен `OperationsRepository` (`src/features/operations/api/operationsRepository.ts`, `src/features/operations/mock/mockOperationsRepository.ts`).
- `Sidebar` переведён на `useDataAccess().navigation.listSidebarItems()`; runtime-импорт `src/data/menu` удалён из layout-слоя.
- Добавлен `NavigationRepository` (`src/features/navigation/api/navigationRepository.ts`, `src/features/navigation/mock/mockNavigationRepository.ts`).
- `Topbar` использует `useDataAccess().clients.listClients()` для глобального поиска.
- `SubjectHistoryTab` переведён на `useDataAccess().history.listHistoryByClientId()`.
- Добавлен `HistoryRepository` (`src/features/history/api/historyRepository.ts`, `src/features/history/mock/mockHistoryRepository.ts`).
- Legacy read-helpers удалены из seed-файлов: `getTradingProfileByClientId`, `getDocumentsByClientId`, `getHistoryByClientId`.
- `DataAccessProvider` расширен новыми репозиториями: `trading`, `administration`, `operations`, `navigation`, `history`.
- `ClientsProvider` удалён из runtime (`src/main.tsx`), так как `useClientsStore` больше не используется.
- Contract-related screens, уже мигрированные на data-access: `RequestsPage`, `SubjectProfilePage`, `SubjectContractsTab`, `ContractWizardPage`, `MiddleOfficePage`, `MiddleOfficeClientsPage`.

### Recommended next step

Следующий безопасный шаг — вынести type-only импорты из `src/data/types` и `src/data/dashboard` в feature/shared типы (без изменения runtime-поведения).


## Layout/Responsive status

- `AppShell` поддерживает dual-mode layout: desktop sidebar (lg+) и mobile/tablet drawer navigation (< lg).
- Desktop-поведение сохранено: фиксированный sidebar слева, sticky topbar, контент с offset под sidebar.
- Для mobile/tablet включён drawer с overlay, закрытием по click outside, Escape и навигации по пункту меню.
- `DataTable` использует controlled horizontal scrolling внутри собственного wrapper (`overflow-x-auto`), чтобы не ломать ширину страницы.
- Для фильтров/controls добавлены базовые responsive guard-правила (wrap и max-width), без изменения бизнес-логики.
- Для модалок добавлены viewport-safe ограничения высоты и вертикальный scroll для длинного контента.
- Ручной визуальный проход остаётся обязательным: см. `docs/VISUAL_QA_CHECKLIST.md`.
- Финальная визуальная проверка должна выполняться вручную по наборам viewport sizes (390px / 768px / 1024px / 1280px / 1440px).

## Async UI foundation status

В проект добавлена базовая инфраструктура для единообразной обработки async-состояний:

- `src/shared/ui/async/AsyncContent.tsx`
- `src/shared/ui/async/PageSkeleton.tsx`
- `src/shared/ui/async/InlineError.tsx`
- `src/shared/ui/async/RetryAction.tsx`

### Уже переведены на `AsyncContent`

- `CompliancePage`
- `ComplianceCardPage` (loading/error ветки)
- `MiddleOfficePage`
- `MiddleOfficeClientsPage`
- `DepositoryPage`

### Где async-состояния пока локальные

- Есть локальный loading/error UI (следующий кандидат на миграцию):  
  `DashboardPage`, `SubjectsPage`, `ArchivesPage`, `BackOfficePage`, `MiddleOfficeReportsPage`, `SubjectProfilePage`, `ContractWizardPage`, `RequestsPage`.
- Имеют частичный async-контроль без общего `AsyncContent`:  
  `TradingPage`, `TradingCardPage`, `DocumentsPage`, `AdministrationPage`, `BrokeragePage`, `TrustManagementPage`, `AgentsPage`.

### Recommended next async batch

Рекомендуемый следующий batch без риска изменения бизнес-логики:

1. `DashboardPage`
2. `SubjectsPage`
3. `ArchivesPage`
4. `MiddleOfficeReportsPage`

Цель batch: перейти на `AsyncContent`, сохранить текущие тексты статусов/ошибок и текущую структуру фильтров/таблиц без изменения поведения.

## Что будет сделано в следующих шагах

UI-страницы должны постепенно перестать импортировать `src/data/*` напрямую и использовать репозитории из `useDataAccess`.

## Что не входит в этот репозиторий

Backend, база данных и реальные сетевые интеграции **не реализуются** в рамках данного репозитория.

## Остаточные runtime imports `src/data/*` (после текущего шага)

Прямые runtime-импорты `src/data/*` в UI-слое (`src/pages/*`, `src/components/layout/*`, `src/components/crm/*`) для перечисленных выше экранов устранены.

Допустимые остатки:
- type-only импорты из `src/data/types`/`src/data/dashboard`;
- runtime-импорты в `src/features/*/mock/*Repository.ts` как часть mock data-access слоя.
