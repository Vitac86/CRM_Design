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

## Page-specific CSS
`crm-static.css` already bundles most page CSS via `@import`. The files below are **not** included in `crm-static.css` and are loaded only when their matching page explicitly links them:

- `login.html`, `register.html`, `forgot-password.html` → `assets/css/pages/auth.css`
- `agents.html` → `assets/css/pages/agents.css`
- `depository.html` → `assets/css/pages/depository.css`

Avoid adding direct page CSS links when the file is already bundled by `crm-static.css`, unless a visual check confirms a deliberate cascade exception.

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
- `back-office.html` — counterparties registry (Бэк-офис module); inline INN lookup for adding new counterparties from an external source.
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

## Document templates

Print-ready HTML templates for client-facing documents live in `assets/document-templates/`.

| Template file | Document |
|---|---|
| `zayavlenie-o-prisoedinenii-fl.html` | Заявление о присоединении (для физических лиц) |

The "Выгрузить заявление" button is exposed in both `contract-wizard.html` and `contract-edit.html`.

In the static handoff, this action fetches the existing HTML template, fills it via `DOMParser`, and opens the filled print-ready document in a new tab for review or browser "Save as PDF". It does not automatically call print and does not download a fake `.pdf` from HTML.

Direct high-quality PDF download should be implemented by UMI.CMS/backend using a server-side renderer such as headless Chrome, Puppeteer, wkhtmltopdf, or an equivalent tool. `html2pdf` / `html2canvas` intentionally is not used for this legal statement because it rasterizes the document, producing heavier PDFs without a reliable selectable text layer. The `data-doc-field` and `data-doc-check` attributes on the template elements serve as stable data-binding hooks for the backend renderer.

## Client-side demo pagination
Registry list pages (subjects, requests, compliance, trading, agents, etc.) include client-side demo pagination driven by `crm-static.js`.

- Page-size chips (25 / 50 / 100) slice visible tbody rows to the selected window.
- Prev / Next buttons navigate between pages; the page indicator updates to show `N из M`.
- Filtering and search narrow the row set first; pagination then slices within that filtered result.
- Sorting reorders all non-filtered rows and resets to page 1.

**This is static preview only.** UMI.CMS integration must replace this with server-side pagination, filtering, and search for real datasets.

Stable HTML hooks used by the pagination engine:

| Element | Hook | Purpose |
|---|---|---|
| Page-size container | `data-page-size-group` | Groups the 25 / 50 / 100 chips |
| Page-size chip | `data-page-size-value="N"` + `.crm-footer-chip` | Chip value and active-state class |
| Page indicator span | text matching `N из N` | Updated by JS to reflect current/total pages |
| Prev button | `aria-label` containing "Предыдущая" | Tagged by JS with `data-pagination-nav="prev"` |
| Next button | `aria-label` containing "Следующая" | Tagged by JS with `data-pagination-nav="next"` |

CSS classes written by JS (safe to style or remove in UMI.CMS):

| Class | Applied to | Meaning |
|---|---|---|
| `.is-filter-hidden` | `<tr>` | Row hidden by an active filter/search |
| `.is-page-hidden` | `<tr>` | Row hidden because it falls outside the current page window |

## Known limitations
- Static sample data only.
- Prototype JavaScript only; not backend or business logic.
- Tables intentionally use horizontal scroll on mobile.
- No pages carry redundant direct page CSS links; all page-specific CSS is loaded via `crm-static.css` except for the intentional exceptions listed in "Page-specific CSS" above.
