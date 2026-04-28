# PAGE_SCRIPT_AUDIT

Cross-page audit of standalone `static-uikit/pages/*.html` for global vs page-specific behavior ownership.

| Standalone page | data-page | Script mode | Page script | Reason | UMI pack note |
|---|---|---|---|---|---|
| dashboard.html | `dashboard` | Global-only | — | Uses shared sidebar/nav/data-href behavior only. | No extra note required. |
| subjects.html | `subjects` | Global-only | — | Uses shared filter/reset/form prevention behavior. | No extra note required. |
| subject-card.html | `subject-card` | Page-specific + global | `../assets/js/pages/subject-card.js` | Representative modal, expiry toggle, and addresses expand/collapse are card-only behaviors. | Keep page script include only for subject-card template when these interactions are needed. |
| subject-register.html | `subject-register` | Global-only | — | Static form actions only; no runtime data rendering. | No extra note required. |
| contract-wizard.html | `contract-wizard` | Global-only | — | Static wizard layout, no page-only runtime behavior. | No extra note required. |
| brokerage.html | `brokerage` | Global-only | — | Uses shared filter controls and reset behavior. | No extra note required. |
| trust-management.html | `trust-management` | Global-only | — | Uses shared registry/filter behavior only. | No extra note required. |
| agents.html | `agents` | Global-only | — | Uses shared registry/filter behavior only. | No extra note required. |
| requests.html | `requests` | Global-only | — | Uses shared registry/filter and row `data-href` navigation. | No extra note required. |
| compliance.html | `compliance` | Global-only | — | Uses shared registry/filter behavior only. | No extra note required. |
| compliance-card.html | `compliance-card` | Global-only | — | Static card/form controls only; no page-only runtime logic. | No extra note required. |
| middle-office-clients.html | `middle-office-clients` | Global-only | — | Uses shared registry/filter behavior only. | No extra note required. |
| middle-office-reports.html | `middle-office-reports` | Global-only | — | Uses shared registry/filter behavior only. | No extra note required. |
| depository.html | `depository` | Global-only | — | Uses shared registry/filter behavior only. | No extra note required. |
| back-office.html | `back-office` | Global-only | — | Uses shared registry/filter behavior only. | No extra note required. |
| trading.html | `trading` | Global-only | — | Uses shared registry/filter behavior only. | No extra note required. |
| trading-card.html | `trading-card` | Global-only | — | UIkit tabs + static content; no page-only runtime code needed. | No extra note required. |
| administration.html | `administration` | Global-only | — | Option-card selection is handled by global reusable option-grid logic. | No extra note required. |
| archive.html | `archive` | Global-only | — | Uses shared registry/filter behavior only. | No extra note required. |
| error.html | `error` | Global-only | — | Static fallback page with plain navigation action. | No extra note required. |

## Registry result
- Current standalone page-script registry: only `subject-card.html` owns `../assets/js/pages/subject-card.js`.
- No additional page scripts were required by this audit.
- Reusable form-control patterns (`.crm-option-card`, `.crm-binary-control`, `.crm-radio-tile`, `.crm-check-row`) are global behavior owned by `assets/js/crm-static.js`; they only synchronize `.is-selected`/`.is-active` with native checked inputs.
