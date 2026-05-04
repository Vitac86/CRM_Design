# Static UIKit Handoff

## Scope
- `static-uikit/` is the final handoff package.
- `static-uikit/INDEX.html` is the launcher for the standalone prototype pages.
- This package is static HTML5 + UIkit page markup. It is **not** a ready-made UMI.CMS template pack.
- UMI.CMS developers will later split static pages into templates, includes, layouts, loops, and data bindings.
- React/Vite source files are **not** the source of truth for this handoff.
- `administration.html` is placeholder / developer-owned.

## Final handoff package
- `INDEX.html`
- `README.md`
- `pages/`
- `assets/`

## Not included in final handoff
- UMI/P0/P1 packs
- `partials/`
- `HANDOFF_MANIFEST.json`
- stale validation tools (`tools/validate-static-uikit.mjs`)
- React/Vite source files
- `src/`
- `public/`
- `package.json`
- `vite.config.*`

## How to open
From the repo root:

```bash
python -m http.server 8080
```

Open:

```
http://localhost:8080/static-uikit/INDEX.html
```

From `static-uikit/`:

```bash
python -m http.server 8080
```

Open:

```
http://localhost:8080/INDEX.html
```

Open via uppercase `INDEX.html`. Do not assume lowercase `index.html` works on case-sensitive servers.

No `npm run build` is required for the static handoff.

## Folder structure
- `INDEX.html` — launcher.
- `pages/` — standalone HTML prototype pages.
- `assets/css/` — UIkit, `crm-static.css`, components, pages, responsive, and print styles.
- `assets/js/` — UIkit, `crm-static.js`, and page scripts when explicitly linked.
- `assets/brand/`, `assets/icons/`, `assets/fonts/` — required static assets.

## Runtime scripts
Global scripts:

- `assets/js/uikit.min.js`
- `assets/js/uikit-icons.min.js`
- `assets/js/crm-static.js`

Page-specific scripts (active only when the matching HTML file explicitly links them):

- `contract-edit.html` → `assets/js/pages/contract-edit.js`
- `middle-office-clients.html` → `assets/js/pages/middle-office.js`
- `middle-office-reports.html` → `assets/js/pages/middle-office.js`
- `subject-card.html` → `assets/js/pages/subject-card.js`
- `subject-edit.html` → `assets/js/pages/subject-edit.js`
- `subject-edit-individual.html` → `assets/js/pages/subject-edit.js`
- `subject-register.html` → `assets/js/pages/subject-register.js`
- `trading-card.html` → `assets/js/pages/trading-card.js`

## Page inventory
Auth:

- `login.html`
- `register.html`
- `forgot-password.html`

Core:

- `dashboard.html`

Subjects / contracts:

- `subjects.html`
- `subject-card.html`
- `subject-card-individual.html`
- `subject-register.html`
- `subject-edit.html`
- `subject-edit-individual.html`
- `contract-wizard.html`
- `contract-edit.html`

Compliance:

- `compliance.html`
- `compliance-card.html`

Trading / brokerage / trust:

- `brokerage.html`
- `trading.html`
- `trading-card.html`
- `trust-management.html`

Operations:

- `agents.html`
- `requests.html`
- `middle-office-clients.html`
- `middle-office-reports.html`
- `depository.html`
- `back-office.html`
- `archive.html`

System:

- `administration.html` — placeholder / developer-owned.
- `search-results.html` — full-page global search results.
- `error.html` — static fallback/prototype page.

## Global search
- The header includes a live search preview (client-side, UIkit dropdown).
- `search-results.html` is the full search results page layout.
- UMI.CMS should replace client-side search with server-side search and route to this template.

## Static filters
All list-page filters (subjects, compliance, trading, etc.) are **client-side demo behavior only**. No server requests are made; JavaScript hides/shows table rows in the browser.

### Markup contract

| Element | Attribute | Purpose |
|---|---|---|
| Filter control (input, hidden) | `data-filter="<name>"` | Stable filter key; used to match against row attributes. |
| Custom dropdown option | `data-filter-option` + `data-filter-value="<value>"` | Selectable option inside a `.crm-filter-menu`. |
| Table row | `data-filter-<name>="<value>"` | The value the filter key is matched against. |
| Reset button | `data-action="reset-filters"` | Clears all filter controls and restores full row visibility. |

`data-filter` names and `data-filter-*` row attributes are the stable UI hooks that connect controls to data.

### UMI.CMS integration
Replace client-side filter logic with server-side filtering and pagination. The `data-filter` attribute names on controls and the `data-filter-*` attributes on rows can be preserved as semantic hints, but the JS row-hiding behavior should be superseded by server-rendered result sets.

## Known limitations
- Static sample data only.
- Prototype JavaScript only; not backend or business logic.
- Tables intentionally use horizontal scroll on mobile.
- Some pages may have explicit page CSS links in addition to `crm-static.css`; do not remove unless visually checked.
