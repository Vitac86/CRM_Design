# Static UMI Kit Handoff Documentation

## A. Scope

**Target deliverable**: `static-uikit/` directory.

The **static UMI Kit is the handoff reference** for this phase. The React/Vite app (`src/`) is not the source of truth for this static prototype delivery.

- **static-uikit/INDEX.html** is the launcher and page directory
- **pages/*** are standalone static HTML prototypes for visual/behavioral reference
- Pages are **not production-ready app routes** — they contain sample data and prototype interactions only
- Static pages are designed for developer/designer review and hand-off validation
- UMI extraction packs (umi-p0/, umi-p1/) contain templated content ready for integration

---

## B. Directory Overview

### Root files
- **static-uikit/INDEX.html** — Launcher page listing all demo pages, UMI packs, and validation commands

### Pages directory
- **static-uikit/pages/*.html** — Individual standalone prototype pages (see Page Inventory below)

### Assets
- **static-uikit/assets/css/uikit.min.css** — Compiled UIKit CSS framework
- **static-uikit/assets/css/crm-static.css** — Main CRM static styles (app shell, layout, components)
- **static-uikit/assets/css/components/** — Modular component styles
- **static-uikit/assets/css/pages/** — Page-specific style overrides
- **static-uikit/assets/css/responsive.css** — Responsive media queries and breakpoints
- **static-uikit/assets/css/print.css** — Print stylesheet
- **static-uikit/assets/js/uikit.min.js** — Compiled UIKit JS framework
- **static-uikit/assets/js/crm-static.js** — CRM static prototype behaviors (see JS Inventory below)
- **static-uikit/assets/fonts/** — Inter, Inter Tight, Montserrat font files (Cyrillic + Latin)
- **static-uikit/assets/icons/** — SVG icon sprites
- **static-uikit/assets/brand/** — Logo and brand assets

### UMI Extraction Packs (reference only)
- **static-uikit/umi-p0/** — P0 priority extraction/reference pack; do not manually edit
- **static-uikit/umi-p1/** — P1 priority extraction/reference pack; do not manually edit

---

## C. Page Inventory

All pages listed are located in `static-uikit/pages/` unless otherwise noted.

### Core / Auth
| Page | Filename | Status |
|------|----------|--------|
| Dashboard | dashboard.html | Ready for developer reference |
| Login | login.html | Ready for developer reference |
| Register | register.html | Ready for developer reference |

### Front-office / Subjects
| Page | Filename | Status |
|------|----------|--------|
| Subjects (registry) | subjects.html | Ready for developer reference |
| Subject card (detail view) | subject-card.html | Ready for developer reference |
| Subject register (form) | subject-register.html | Ready for developer reference |
| Subject edit (individual) | subject-edit-individual.html | Ready for developer reference |
| Subject edit (general) | subject-edit.html | Ready for developer reference |
| Contract wizard | contract-wizard.html | Ready for developer reference |
| Contract edit | contract-edit.html | Ready for developer reference |

### Compliance
| Page | Filename | Status |
|------|----------|--------|
| Compliance (registry) | compliance.html | Ready for developer reference |
| Compliance card (detail view) | compliance-card.html | Ready for developer reference |

### Brokerage / Trading / Trust
| Page | Filename | Status |
|------|----------|--------|
| Brokerage (registry) | brokerage.html | Ready for developer reference |
| Trading (registry) | trading.html | Ready for developer reference |
| Trading card (detail view) | trading-card.html | Ready for developer reference |
| Trust management (registry) | trust-management.html | Ready for developer reference |

### Middle-office / Depository / Back-office
| Page | Filename | Status |
|------|----------|--------|
| Middle-office clients | middle-office-clients.html | Ready for developer reference |
| Middle-office reports | middle-office-reports.html | Ready for developer reference |
| Depository | depository.html | Ready for developer reference |
| Back-office | back-office.html | Ready for developer reference |

### Operations
| Page | Filename | Status |
|------|----------|--------|
| Agents (registry) | agents.html | Ready for developer reference |
| Archive | archive.html | Ready for developer reference |
| Requests (registry) | requests.html | Ready for developer reference |

### System
| Page | Filename | Status |
|------|----------|--------|
| Administration | administration.html | **Placeholder / developer-owned** |
| Error page | error.html | Static prototype only |

---

## D. Page Statuses

### Ready for developer reference
- All pages **except administration.html and error.html** are visually complete prototypes ready for:
  - Visual/interaction review
  - CSS/layout reference
  - UI pattern validation
  - Responsive behavior testing

### Static prototype only
- **error.html** — Sample error state page; not feature-complete

### Placeholder / developer-owned
- **administration.html** — Currently a minimal placeholder. Not designed for handoff visual completeness. Developers should treat as a starting point; visual design is not finalized and subject to change during development.

---

## E. UI Patterns

The static kit implements the following core UI patterns consistently:

### App Shell
- **Sidebar navigation** (collapsible on mobile)
  - Brand logo / Investika logo
  - Primary nav groups (Front-office, Compliance, Middle-office, Back-office, Trading, Depository, Administration)
  - Collapsible accordion groups
  - Active state indicators
  - Icons with labels
  - `data-match` attribute for active state inheritance across related pages

- **Top navigation bar**
  - Mobile sidebar toggle button
  - Global search input
  - User profile widget with role badge

- **Main content area**
  - Page title and breadcrumbs (on detail/card pages)
  - Header actions area (buttons, filters)
  - Content grid/layout
  - Page footer (when applicable)

### Registry / List Page Structure
- Page header with title and add/action buttons
- Filter panel (collapsible on mobile)
  - Search input
  - Filter dropdowns (type, status, date range, etc.)
  - Filter pills with visual indicators
- Data table wrapped in horizontal scroll container
- Pagination / page-size footer controls

### Filter Panel Structure
- `.crm-filter-panel` container
- Search row (`.crm-filter-search-row`)
- Filter fields grid (`.crm-filter-grid`)
- Filter controls with dropdown menus (`.crm-filter-control`)
- Dropdown options are `.crm-filter-option` buttons with checkmark visual

### Table & Card Structure
- Tables use `<table>` with `.crm-dashboard-table` or page-specific classes
- Table wrappers own horizontal scroll (`.crm-dashboard-table-wrap`, `.crm-registry-table-wrap`)
- Table card detail views use `.crm-card` containers
- Rows are clickable with `data-href` attribute
- Sorting indicators on header cells

### Table Wrapper Horizontal Scroll
- **Critical pattern**: Table wrappers (not page body) manage horizontal scroll
- Page body should never horizontally overflow
- Scrollbar gutter management: `scrollbar-gutter: stable both-edges` can cause header clipping if not overridden
- Page-specific table wrappers should override with `scrollbar-gutter: auto` when needed

### Table Footer (Page-size controls)
- Footer chip buttons use `.crm-footer-chip` class
- Each chip has `data-page-size-value="25"`, `data-page-size-value="50"`, or `data-page-size-value="100"`
- Chips are styled as muted/secondary buttons
- Active page size is indicated with selected state

### Table Sorting Pattern
- Sortable columns have `.crm-sortable` or `data-sortable` attribute
- Sort direction: ascending/descending indicated by icon or class
- Click behavior managed by crm-static.js

### Date Field Pattern
- Date input fields use `.crm-date-field` wrapper
- Input element: `.crm-date-input`
- Trigger button: `.crm-date-trigger` with calendar icon
- **Important**: Only one calendar icon, no select chevron
- Icon uses `<span uk-icon="calendar"></span>` or similar
- Date picker activated via `.showPicker()` or polyfill fallback

### Badge / Status Pattern
- Status badges use `.crm-badge` class
- Semantic variants: `.success`, `.warning`, `.danger`, `.info`, `.muted`
- Inline badges for status groups: `.crm-inline-badges`
- Subject profile badges: `.crm-subject-label` (data-status="type|residency|qualified|kyc|representative")

### Subject Card / Detail Pattern
- Hero section (`.crm-subject-hero` or `.crm-detail-hero`)
  - Avatar / icon
  - Title, ID, status badges
  - Action buttons
- Tabbed sections (`.crm-tabs` with `uk-tab`)
  - Profile
  - Bank details
  - Documents
  - Relations
  - Contracts/Accounts
  - History
- Tab switcher (`.crm-subject-switcher` or `.crm-detail-switcher`)
- Each tab has a `.crm-subject-tab-panel` or similar

### Report / Master-detail Pattern
- Master list (left side or top) with selectable rows
- Detail view (right side or expanded view)
- Detail section updates when row is selected
- Uses `data-entity` and `data-id` attributes for tracking

### Auth Page Pattern
- Center-aligned form layout (`.crm-auth-shell`)
- Brand section (logo + copy)
- Form card (`.crm-auth-card`)
- Input fields with labels and error states
- Submit button (`.crm-auth-submit`)
- Link to alternate auth page (register ↔ login)
- Password visibility toggle on password fields

### Responsive Behavior
- Sidebar collapses to mobile menu on small screens
- Filter panel can collapse or reflow
- Tables remain horizontally scrollable on mobile (pragmatic approach)
- Form layouts stack on narrow screens
- Grid layouts adapt to single column on mobile
- Icons scale appropriately

---

## F. Known Implementation Notes

### Table Scroll Management
- **Do**: Place `<table>` inside a wrapper that owns `overflow-x: auto`
- **Don't**: Set `overflow-x` on the page body
- **Critical**: Global `scrollbar-gutter: stable both-edges` can cause table header misalignment if wrapper doesn't override with `scrollbar-gutter: auto`
- Wrappers like `.crm-dashboard-table-wrap`, `.crm-registry-table-wrap` handle this; page-specific wrappers may need explicit override

### Date Field Conventions
- Wrapper: `.crm-date-field`
- Input: `.crm-date-input` with `type="date"` or `type="text"` (with JS polyfill)
- Trigger: `.crm-date-trigger` button with single calendar icon
- **Rule**: No select/dropdown chevron in date fields
- Polyfill uses native `.showPicker()` if available, otherwise fallback

### Footer Page-size Buttons
- Container: `.crm-footer-pagination` or `.crm-page-size-control`
- Button: `.crm-footer-chip` with `data-page-size-value="25"`, `data-page-size-value="50"`, or `data-page-size-value="100"`
- Styling: Muted/secondary button appearance by default
- Active state: `.is-active` or similar class

### Static JS Behavior
- `crm-static.js` manages prototype interactions, not business logic
- Behavior is **sample/visual only** and should not be treated as backend contract
- Real implementation should replace static handlers with actual API calls and state management

### CSS Architecture
- **Base**: UIKit framework + CSS resets
- **Utilities**: Spacing, typography, flexbox helpers (from UIKit)
- **Components**: Reusable component styles in `assets/css/components/`
- **Pages**: Page-specific overrides in `assets/css/pages/`
- **Responsive**: Media queries in `responsive.css`

### Vendor & Icons
- Fonts: Inter, Inter Tight, Montserrat (in `assets/fonts/`)
- Icons: SVG sprite in `assets/icons/crm-sidebar-icons.svg`
- UIKit framework: embedded in `uikit.min.css` / `uikit.min.js`

---

## G. JS Interaction Inventory

**crm-static.js** provides prototype behavior for the following interactions. This is **sample behavior only** and should be replaced with actual backend/state management logic.

### Sidebar & Navigation
- Sidebar accordion toggle (expand/collapse navigation groups)
- Active state management based on current page or `data-match` patterns
- Mobile sidebar toggle (hamburger menu)
- Mobile sidebar overlay dismiss

### Mobile Sidebar Behavior
- Collapse/expand on small screens
- Modal overlay on mobile
- Toggle button in top-right corner
- Sticky positioning

### Filter Dropdown Menus
- Open/close details menu (`.crm-filter-menu`)
- Option selection and checkmark toggle
- Update filter value in hidden input
- Dropdown dismissal on outside click

### Table Sorting
- Column header click to sort
- Ascending / descending indicator
- Sort state persistence across prototype interactions (sample only)

### Page-size Footer Chips
- Click to select page size
- Update active state
- Sample table row rendering (prototype only)

### Date Picker Trigger
- Click `.crm-date-trigger` to open date picker
- Uses native `.showPicker()` if available
- Fallback to browser's date input UI

### Password Show/Hide (Auth Pages)
- Toggle button (`.crm-auth-password-toggle`) reveals/masks password input
- Button label: "Показать" or "Скрыть" (Show / Hide in Russian)

### Auth Inline Validation
- Required field validation on form submission
- Error message display/hide based on field focus and input state
- Alert message shown for empty required fields
- Prototype behavior only; no backend validation

### Tabs / Section Switching
- Tab click switches active tab and corresponding panel
- UIKit tab component integration (`uk-tab`)
- Smooth transitions between panels

### Additional Prototype Interactions
- KPI card click navigation to filtered list views (dashboard)
- Subject card action button handlers (archive, edit, contract wizard)
- Filter form submission (sample filter state)

---

## H. Responsive Notes

### Design approach
- **Desktop is the source of truth** for design completeness
- **Responsive.css** provides pragmatic mobile/tablet support
- Mobile is treated as a **handoff layer**, not a full mobile product redesign

### Responsive breakpoints
- Typical UIKit breakpoints: 640px (s), 960px (m), 1200px (l), 1920px (xl)
- Media queries handle: sidebar collapse, filter panel reflow, grid to single-column

### Table behavior on mobile
- Tables remain **horizontally scrollable** on mobile (pragmatic choice)
- Wrappers own overflow; content doesn't break page layout

### Mobile improvements
- Touch-friendly button sizing
- Increased padding/spacing
- Simplified forms
- Collapsible sections
- Reduced sidebar width or full collapse

### What to manually test
- Mobile sidebar toggle and overlay
- Filter dropdown positioning on narrow screens
- Table horizontal scroll on mobile
- Date field behavior on touch devices
- Form field focus states
- Master-detail pages on tablet/mobile

---

## I. Developer Handoff Warnings

### ⚠️ Source of truth
- **Do not** use `src/` React/Vite app as the source of truth for static handoff unless explicitly instructed
- Reference `static-uikit/` for visual/HTML handoff
- React app may diverge; static kit is frozen for this phase

### ⚠️ File modifications
- **Do not** edit UIKit framework files (`uikit.min.css`, `uikit.min.js`) or font/icon assets in `assets/fonts/`, `assets/icons/`
- **Do not** manually edit UMI generated packs (`umi-p0/`, `umi-p1/`) unless approved
- Do not manually edit UMI extraction/reference packs (`umi-p0/`, `umi-p1/`) unless explicitly requested.
- static-uikit/pages/ is the primary editable reference; packs are generated/reference only
### ⚠️ Static HTML values
- All page data is **sample / placeholder only**
- Substitute with real data during backend integration
- Do not treat static HTML as data schema

### ⚠️ Static JS behavior
- `crm-static.js` is **prototype behavior only**
- Focus on visual/interaction patterns, not logic
- Replace with actual state management, API calls, and business logic during development

### ⚠️ CSS ownership
- Refer to component audits and CSS ownership matrix (in docs/) to understand style sources
- Do not assume all CRM styles are in `crm-static.css`; some may be in UIKit or component-specific files

---

## J. Known Limitations & Manual QA Checklist

Developers/designers should manually verify the following items as part of acceptance testing:

- [ ] **Mobile sidebar toggle** — Menu expands/collapses and overlay appears
- [ ] **Filter dropdown positioning** — Dropdowns don't clip on narrow screens; scroll if needed
- [ ] **Table horizontal scrolling** — Tables scroll without breaking page layout; headers remain visible
- [ ] **Date field behavior** — Calendar icon triggers date picker; works on mobile/touch
- [ ] **Subject card tabs** — Tabs switch content; no overflow on mobile; scroll available if needed
- [ ] **Auth validation** — Required fields show error state and empty submissions show prototype alerts.
- [ ] **Master-detail pages** — Detail panel selection and details layout remain usable on tablet/mobile.
- [ ] **Responsive grid layouts** — Layouts reflow from multi-column to single-column appropriately
- [ ] **Breadcrumbs** — Clickable breadcrumbs navigate to parent pages correctly
- [ ] **Link targets** — All navigation links point to existing pages (see LINK_INVENTORY.md)
- [ ] **Asset paths** — All image, font, and icon paths resolve correctly
- [ ] **Print stylesheet** — Print preview renders cleanly (if applicable)

---

## K. Running the Static Kit Locally

### From repository root
```bash
cd CRM_Design && python -m http.server 8080
# Access: http://localhost:8080/static-uikit/index.html
```

### From static-uikit folder
```bash
cd CRM_Design/static-uikit && python -m http.server 8080
# Access: http://localhost:8080/index.html
```

### Validation (optional)
```bash
node static-uikit/tools/validate-static-uikit.mjs
```

---

## L. Related Documentation

- **LINK_INVENTORY.md** — Detailed inventory of all launcher, sidebar, and key navigation links
- **docs/HANDOFF_READINESS_AUDIT.md** — Audit checklist for handoff readiness
- **docs/UMI_P0_IMPLEMENTATION_MATRIX.md** — P0 priority matrix
- **umi-p0/HANDOFF_CHECKLIST.md** — P0 extraction pack handoff checklist
- **umi-p1/HANDOFF_CHECKLIST.md** — P1 extraction pack handoff checklist

---

## M. Support & Questions

For questions or clarifications:
- Refer to the static kit audits in `docs/` for CSS ownership, page patterns, and readiness
- Check `static-uikit/tools/validate-static-uikit.mjs` for automated checks
- Review UMI extraction pack READMEs for integration guidance
- Consult **LINK_INVENTORY.md** for navigation and link reference

---

**Handoff Version**: static-uikit/  
**Last Updated**: May 2026  
**Status**: Ready for developer reference and hand-off validation
