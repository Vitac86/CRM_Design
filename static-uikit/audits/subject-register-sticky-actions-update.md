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
