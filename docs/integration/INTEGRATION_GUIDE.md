# Integration Guide

## Текущий режим проекта

Проект работает в **demo/mock mode**: интерфейс и бизнес-сценарии демонстрируются на локальных mock-данных без интеграции с backend.

## Роль `src/data/*`

Каталог `src/data/*` остаётся источником seed/mock-данных для текущего прототипа.

- Эти данные используются для demo-режима.
- UI-слой не должен импортировать `src/data/*` напрямую в runtime.
- `src/data/requests.ts` теперь является **seed-only** файлом (без runtime-мутаций).

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
- `ArchivesPage` использует `useDataAccess().clients` для `listClients/restoreClient`.
- `DashboardPage` больше не импортирует `src/data/*` напрямую в runtime.
- Создание поручений в demo-mode реализовано только в `src/features/requests/mock/mockRequestsRepository.ts`.
- `src/data/requests.ts` используется только как источник immutable seed для mock-репозитория.
- `src/data/dashboard` пока остаётся seed/mock-источником внутри `mockDashboardRepository`.
- `ClientsStore` больше не должен быть источником истины для уже мигрированных client-экранов (`SubjectsPage`, `SubjectProfilePage`, `ArchivesPage`).
- Client list/profile/archive теперь работают через единый `ClientsRepository` (`useDataAccess().clients`).
- `ContractsRepository` расширен read-only методами для profile/read-сценариев договоров; `SubjectProfilePage` использует их через data-access.
- Временный технический долг: часть экранов всё ещё использует `ClientsStore` (например, `AgentsPage`, `CompliancePage`, `ComplianceCardPage`, `MiddleOfficePage`, `MiddleOfficeClientsPage`, `ContractWizardPage`, `ClientRegistrationWizardPage`, `SubjectRelationsTab`), их миграция запланирована следующими шагами.
- Временный технический долг по договорам: `ContractWizardPage` и legacy runtime-mutations (`createClientContract`, `updateClientContract`, `updateContractConfig`) всё ещё живут в `src/data/clientContracts.ts` и должны быть перенесены в `ContractsRepository` отдельным шагом.
- Поэтому `src/data/clientContracts.ts` пока не является полностью seed-only файлом: он seed для mock-репозитория и источник legacy create/update helpers.

### Recommended next step

Перевести на `useDataAccess` следующие UI-экраны, которые ещё читают `src/data/*` напрямую.

## Что будет сделано в следующих шагах

UI-страницы должны постепенно перестать импортировать `src/data/*` напрямую и использовать репозитории из `useDataAccess`.

## Что не входит в этот репозиторий

Backend, база данных и реальные сетевые интеграции **не реализуются** в рамках данного репозитория.
