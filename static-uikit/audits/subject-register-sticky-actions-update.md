# subject-register sticky actions update

## Files changed

- `static-uikit/pages/subject-register.html`
- `static-uikit/assets/css/pages/subject-register.css`
- `static-uikit/assets/css/crm-static.bundle.css` (regenerated)

## Action blocks converted

| Step | Old container | New container |
|------|--------------|---------------|
| Step 1 — Выбор типа | `.crm-footer-actions.crm-register-actions` | `.crm-sticky-actions.crm-wizard-actions.reg-sticky-actions` |
| Step 2 — ИНН | `.reg-wizard-actions` | `.crm-sticky-actions.crm-wizard-actions.reg-sticky-actions` |
| Step 2 — ФЛ manual | `.reg-wizard-actions` | `.crm-sticky-actions.crm-wizard-actions.reg-sticky-actions` |
| Step 2 — ЮЛ manual | `.reg-wizard-actions` | `.crm-sticky-actions.crm-wizard-actions.reg-sticky-actions` |
| Step 3 — Результат | `.reg-wizard-actions` | `.crm-sticky-actions.crm-wizard-actions.reg-sticky-actions` |

## Final button layout per step

**Step 1**
- Left: _(empty)_
- Right: Далее (primary) — `data-action="reg-next-step1"`

**Step 2 — ИНН**
- Left: Назад — `data-action="reg-back-step2"`
- Right: Далее (primary) — `data-action="reg-resolve-inn"`

**Step 2 — ФЛ**
- Left: Назад — `data-action="reg-back-step2"`
- Right: Сохранить как черновик — `data-action="reg-save-draft"` | Отмена — `href="subjects.html"` | Сохранить (primary) — `data-action="reg-save-fl"`

**Step 2 — ЮЛ**
- Left: Назад — `data-action="reg-back-step2"`
- Right: Сохранить как черновик — `data-action="reg-save-draft"` | Отмена — `href="subjects.html"` | Сохранить (primary) — `data-action="reg-save-ul"`

**Step 3**
- Left: _(empty)_
- Right: Открыть карточку — `data-action="reg-open-card"` | Завершить (primary) — `data-action="reg-finish"`

## CSS ownership decision

Global sticky behavior is fully owned by:
- `.crm-sticky-actions` in `layout/page.css` — position sticky, background, border, radius, shadow, flex layout
- `.crm-wizard-actions` in `pages/contract-wizard.css` — margin-top and bottom offset override
- `.crm-page-actions` in `layout/page.css` — right-side button group flex layout
- `.crm-page-actions .uk-button` at 960px in `pages/contract-wizard.css` — full-width mobile buttons

Page-specific rules added to `pages/subject-register.css`:
- `.reg-sticky-actions > .reg-sticky-actions-main:only-child { margin-left: auto }` — right-aligns the action group when there is no back button (Step 1, Step 3)
- `@media (max-width: 640px)` — wraps the bar and resets the only-child margin so buttons stack cleanly on narrow screens

Removed old conflicting rules:
- `.reg-wizard-actions { margin-top: 18px }` — superseded by global `.crm-sticky-actions` margin-top
- `.reg-wizard-actions .reg-back { margin-left: auto }` — `.reg-back` class no longer used; "Назад" is structurally positioned on the left of the flex container

## JS compatibility result

No JS changes were made. All `data-action` attributes are preserved exactly:
`reg-next-step1`, `reg-resolve-inn`, `reg-save-fl`, `reg-save-ul`, `reg-save-draft`,
`reg-back-step2`, `reg-finish`, `reg-open-card`.

Event delegation in `subject-register.js` uses `target.closest('[data-action="..."]')` — unaffected by HTML structural changes.

## Manual QA result

Static HTML review confirms:
- All data-action buttons present and accounted for in each step panel
- "Назад" is structurally left-positioned in all steps that require it (INN, FL, UL)
- Primary buttons (Далее, Сохранить, Завершить) carry `.crm-button-primary`
- Step 1 and Step 3 (no back button) use `:only-child` margin-left rule to right-align actions
- `.crm-sticky-actions` provides `position: sticky; bottom: 0` — bar stays visible during scroll

## Bundle generation result

```
✓ Bundle written → static-uikit/assets/css/crm-static.bundle.css
  Sections inlined : 40 / 40
  Output size      : 243.3 KB
```

## Bundle check result

```
✓ Bundle is up to date (40 / 40 sections, 243.3 KB)
```

## Validation result

```
Errors   : 0
Warnings : 0
✓ Validation passed.
```

## Deferred items

- None. All five action blocks were converted in this update.

---

## Sticky Actions Class Ownership Follow-up

### Files changed

| File | Change |
|------|--------|
| `static-uikit/pages/subject-register.html` | Removed `crm-wizard-actions`, `reg-sticky-actions`, `reg-sticky-actions-main` from all 5 sticky action blocks |
| `static-uikit/assets/css/pages/subject-register.css` | Removed `reg-sticky-actions > reg-sticky-actions-main:only-child` rule and its 640px media query |
| `static-uikit/assets/css/layout/page.css` | Added `.crm-sticky-actions > .crm-page-actions:only-child { margin-left: auto }` and `@media (max-width: 640px)` flex-wrap rule |
| `static-uikit/assets/css/pages/contract-wizard.css` | Added scope comment on `.crm-wizard-actions` documenting its wizard-page ownership |
| `static-uikit/tools/validate-static-uikit.mjs` | Added G-extra 4 checks: fail if `subject-register.html` contains `reg-sticky-actions` or `reg-sticky-actions-main`; fail if `subject-register.css` contains `.reg-sticky-actions`; warn if `subject-register.html` contains `crm-wizard-actions` |
| `static-uikit/assets/css/crm-static.bundle.css` | Regenerated |

### Classes removed

- `reg-sticky-actions` — removed from all 5 sticky action divs in `subject-register.html`; CSS rules removed from `subject-register.css`
- `reg-sticky-actions-main` — removed from all 5 action group divs in `subject-register.html`; was only referenced via the parent `reg-sticky-actions` rule
- `crm-wizard-actions` — removed from all 5 sticky action divs in `subject-register.html`; CSS remains in `contract-wizard.css` for legitimate wizard pages

### Final subject-register sticky action structure

**Steps with no back button (Step 1, Step 3):**
```html
<div class="crm-sticky-actions">
  <div class="crm-page-actions crm-actions">
    <!-- buttons -->
  </div>
</div>
```
The `crm-page-actions:only-child` rule in `layout/page.css` automatically right-aligns the group when no back button is present.

**Steps with a back button (Step 2 INN, Step 2 FL, Step 2 UL):**
```html
<div class="crm-sticky-actions">
  <button ... data-action="reg-back-step2">Назад</button>
  <div class="crm-page-actions crm-actions">
    <!-- action buttons -->
  </div>
</div>
```

All `data-action` attributes preserved exactly: `reg-next-step1`, `reg-resolve-inn`, `reg-save-fl`, `reg-save-ul`, `reg-save-draft`, `reg-back-step2`, `reg-finish`, `reg-open-card`.

### Generic sticky action behavior ownership

The behavior previously encoded as `reg-sticky-actions` CSS is now owned correctly:

| Behavior | Owner |
|----------|-------|
| Position sticky, background, border, flex layout | `.crm-sticky-actions` in `layout/page.css` |
| Right-align action group when alone (no back button) | `.crm-sticky-actions > .crm-page-actions:only-child` in `layout/page.css` |
| Mobile flex-wrap at 640px | `@media (max-width: 640px)` in `layout/page.css` |
| Action group flex layout | `.crm-page-actions` in `layout/page.css` |

### crm-wizard-actions ownership

`crm-wizard-actions` is a shared wizard-bar tweak (`margin-top: 2px; bottom: 12px`) owned by `pages/contract-wizard.css`. It is legitimately used by `contract-wizard.html`, `contract-edit.html`, and `document-wizard.html`. Because subject-register is not a wizard page in this sense, it no longer uses `crm-wizard-actions`. A scope comment was added in `contract-wizard.css` to prevent future misuse on non-wizard pages.

Scoping to `data-page="contract-wizard"` was not done because the class is genuinely shared by three wizard pages; scoping would break `contract-edit` and `document-wizard`. The documented comment is the correct guard.

### Validator enhancement

G-extra 4 was added to `validate-static-uikit.mjs`:
- **Error** if `subject-register.html` contains `reg-sticky-actions`
- **Error** if `subject-register.html` contains `reg-sticky-actions-main`
- **Error** if `subject-register.css` contains `.reg-sticky-actions` selectors
- **Warning** if `subject-register.html` contains `crm-wizard-actions`

### Bundle generation result

```
✓ Bundle written → static-uikit/assets/css/crm-static.bundle.css
  Sections inlined : 40 / 40
  Output size      : 243.0 KB
```

### Bundle check result

```
✓ Bundle is up to date (40 / 40 sections, 243.0 KB)
```

### Validation result

```
Errors   : 0
Warnings : 0
✓ Validation passed.
```

New checks all passed:
- `✓ pages/subject-register.html does not contain removed class "reg-sticky-actions"`
- `✓ pages/subject-register.html does not contain removed class "reg-sticky-actions-main"`
- `✓ pages/subject-register.css contains no ".reg-sticky-actions" selectors`

### Remaining deferred items

None.
