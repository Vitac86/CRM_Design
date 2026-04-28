# UMI P1 extraction pack

`static-uikit/umi-p1/` — extraction pack для переноса P1/P2 operational pages в UMI.CMS.

## Что важно
- Pack зависит от `static-uikit/umi-p0` (layout + базовые partials).
- Это не runtime и не build step.
- Placeholder-значения и `{{ ... }}` нужно заменить на реальный синтаксис UMI.CMS проекта.
- Standalone страницы остаются в `static-uikit/pages/` и не заменяются этим паком.

## Рекомендуемый порядок переноса
1. `contract-wizard`.
2. `brokerage` / `trust-management` / `agents`.
3. `middle-office-reports` / `depository` / `back-office`.
4. `trading-card`.
5. `administration` / `archive`.
