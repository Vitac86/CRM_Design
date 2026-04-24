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
- `ClientsProvider` удалён из runtime (`src/main.tsx`), так как `useClientsStore` больше не используется.
- Contract-related screens, уже мигрированные на data-access: `RequestsPage`, `SubjectProfilePage`, `SubjectContractsTab`, `ContractWizardPage`, `MiddleOfficePage`, `MiddleOfficeClientsPage`.

### Recommended next step

Продолжить миграцию остальных UI-экранов, которые ещё читают `src/data/*` напрямую в runtime (например, `TradingPage`, `TradingCardPage`, `DocumentsPage`, `Topbar`, `Sidebar`, `AdministrationPage`, `BrokeragePage`, `TrustManagementPage`, `SubjectHistoryTab`).

## Что будет сделано в следующих шагах

UI-страницы должны постепенно перестать импортировать `src/data/*` напрямую и использовать репозитории из `useDataAccess`.

## Что не входит в этот репозиторий

Backend, база данных и реальные сетевые интеграции **не реализуются** в рамках данного репозитория.

## Остаточные runtime imports `src/data/*` (после текущего шага)

В UI-слое (страницы/компоненты) всё ещё есть прямые runtime-импорты `src/data/*` вне текущего documents/reports/depository scope:

- `src/pages/TradingPage.tsx`
- `src/pages/TradingCardPage.tsx`
- `src/pages/DocumentsPage.tsx`
- `src/pages/AdministrationPage.tsx`
- `src/pages/BrokeragePage.tsx`
- `src/pages/TrustManagementPage.tsx`
- `src/components/layout/Topbar.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/crm/SubjectHistoryTab.tsx`

Примечание: runtime-импорты внутри `src/features/*/mock/*Repository.ts` остаются допустимыми, так как это mock data-access слой и seed-источник demo-режима.
