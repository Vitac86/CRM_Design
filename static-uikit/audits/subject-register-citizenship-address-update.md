# Subject Register — Citizenship / Tax Residency / Manual Address Update

**Date:** 2026-05-16  
**Branch:** main  
**Status:** Complete

---

## Files Changed

| File | Change |
|------|--------|
| `static-uikit/pages/subject-register.html` | Remove cabinet card; add citizenship group; rename tax residency; remove duplicate; add FL foreign address block; replace UL single address with structured fields |
| `static-uikit/assets/js/pages/subject-register.js` | Full rewrite: citizenship state, address mode toggle, manual address helpers, INN demo field update |
| `static-uikit/assets/js/pages/fias-address.js` | `isAddressModuleRfResident`: read `fl-citizenship-status` instead of `fl-residency` |
| `static-uikit/assets/css/pages/subject-register.css` | `reg-method-grid` → 2 cols; add `reg-citizenship-grid` (2 cols); mobile responsive rule extended |
| `static-uikit/assets/css/components/address.css` | Add `.crm-address-mode-note`, `.crm-address-manual-fields`, `fieldset.crm-address-manual-block`, `.crm-address-full-preview` |
| `static-uikit/assets/css/crm-static.bundle.css` | Regenerated (40 sections, 242.9 KB) |

---

## Part 1 — "Загрузить из ЛК" Removed

- Removed the `value="cabinet"` card ("Загрузить из ЛК · Скоро будет доступно.") from step 1 method grid.
- `reg-method-grid` now shows exactly 2 cards: **Ручной ввод** and **Загрузить по ИНН**.
- Grid column count changed from `repeat(3, ...)` to `repeat(2, ...)`.
- No JS changes needed: `regMethod` was only ever set from what the user selects; cabinet was never explicitly checked in JS logic.

---

## Part 2 — Citizenship Selection for FL

- New `reg-group` with `id="reg-citizenship-group"` inserted between the type group and method group in step 1.
- Hidden by default; shown by JS when **Физическое лицо** is selected.
- Uses `crm-option-grid reg-citizenship-grid` (2-column) with the same `crm-option-card` style.
- Radio name: `fl-citizenship-status`; values: `rf` (default, checked) / `foreign`.
- Labels: **Гражданин РФ** / **Иностранный гражданин / не гражданин РФ**.
- `syncCitizenshipGroup()` in JS called on type card click and at init.

---

## Part 3 — Tax Residency Label / Logic

- In the FL "Идентификация клиента" block, the existing control (`name="fl-residency"`, values `rf` / `nonresident`) is now labelled:
  - Title: **Налоговое резидентство**
  - Option 1: **Налоговый резидент РФ**
  - Option 2: **Налоговый нерезидент РФ**
- Name kept as `fl-residency` for internal compatibility.
- The duplicate **Налоговый резидент** (yes/no) control in "Дополнительные данные" (`name="fl-tax-resident"`) was removed — it was redundant with the newly labelled control.
- Tax residency **does not control address mode** — that is now citizenship's responsibility.

---

## Part 4 — FL RF Citizen Address (Scenario A)

- When citizenship = `rf`: `fl-address-fias` block is shown; `fl-address-foreign` is hidden.
- The existing 3-row FIAS module (registration / actual / postal) remains unchanged.
- "Заполнить адрес" buttons remain functional; same-as-registration logic unchanged.
- `isAddressModuleRfResident` in `fias-address.js` now reads `fl-citizenship-status` (was `fl-residency`), so FIAS fill buttons correctly show only for RF citizens.
- Country defaults to "Россия" as set by the FIAS widget when a region is selected.

---

## Part 5 — FL Foreign Citizen Address (Scenario B)

- When citizenship = `foreign`: `fl-address-foreign` block shown; `fl-address-fias` block hidden; any open FIAS panels are closed.
- Three address rows: **Адрес регистрации**, **Адрес проживания / фактический адрес**, **Почтовый адрес / адрес для корреспонденции**.
- Each row uses structured `crm-address-parts-grid` fields:
  Страна (required), Индекс, Регион/область, Район, Город, Населённый пункт, Улица, Дом/строение, Корпус/литера, Квартира/помещение, Комментарий.
- Country is first; a readonly **Итоговый адрес** textarea (`data-manual-output`) is assembled from parts on every input event.
- Actual and postal rows have a same-as-registration checkbox (checked by default); unchecking reveals independent structured fields.
- Output names: `fl-registrationAddress`, `fl-actualAddress`, `fl-postalAddress` — same as the FIAS block so form data is consistent.
- Assembly order: postalCode, country, region, district, city, settlement, street, house, building, flat, comment.

---

## Part 6 — UL Manual Structured Address (Scenario C)

- The single `<input id="ul-address">` in "Контактные данные" replaced with a `<fieldset class="crm-address-manual-block">` containing structured fields:
  Страна (required), Индекс, Регион/область, Район, Город, Населённый пункт, Улица, Дом/строение, Корпус/литера, Офис/помещение, Комментарий.
- A readonly **Итоговый адрес** textarea with `id="ul-address-full"` and `name="ul-address"` is assembled from parts.
- `name="ul-address"` on the output textarea preserves compatibility with any existing form submission expectations.
- INN_FIELDS updated: `ul-address` key removed; replaced with `ul-address-country`, `ul-address-region`, `ul-address-street`, `ul-address-house`, `ul-address-building`. After INN fill, `rebuildManualAddress('ul-address')` assembles the full address.

---

## Part 7 — INN Scenario (Scenario D)

- INN lookup still works: demo fills individual address part fields and then calls `rebuildManualAddress('ul-address')` to populate the readonly full-address textarea.
- No JS errors expected.

---

## Part 8 — JS Architecture

- `flCitizenship` state variable tracks current citizenship selection.
- `applyFlCitizenship(value)` shows/hides the FIAS vs foreign address blocks and syncs fill button visibility.
- `syncCitizenshipGroup()` shows/hides citizenship group based on type selection.
- `buildManualAddressFull(parts)` assembles address from ordered parts (deduplicated).
- `rebuildManualAddress(kind)` reads parts from `[data-manual-kind]`, assembles, writes to `[data-manual-output]`.
- `updateManualSameAs(sourceKind, fullText)` mirrors to all same-as targets.
- `initManualSameAsCheckboxes()` wires same-as checkbox logic for foreign FL (actual, postal) and is safe to call even when those blocks are not yet visible.
- Old FL residency IIFE (which tied address mode to `fl-residency`) removed.

---

## Validation Results

```
npm run static:uikit:bundle        ✓ 40/40 sections, 242.9 KB
npm run static:uikit:bundle:check  ✓ Bundle is up to date
npm run static:uikit:validate      ✓ 0 errors, 0 warnings
```

---

## Deferred Items

- **INN for FL**: Загрузить по ИНН remains disabled for ФЛ (existing behaviour, unchanged).
- **Foreign address country defaulting**: Country field is empty by default for foreign citizen; user must type it. No pre-fill for foreign countries.
- **FIAS country hidden field**: When RF citizen uses FIAS, country is set to "Россия" by `buildAddressText` in fias-address.js. No visible "Страна" label in the FIAS row (FIAS assumes RF). This is acceptable — the block label/note in HTML makes it clear.
- **UL residency label**: The existing `ul-residency` binary control in "Налоговые данные" still uses "Резидент / Нерезидент" labels (UL residency is a different concept and not in scope for this update).
- **Backend integration**: All address parts are static prototype fields only; real persistence requires UMI.CMS / backend wiring.
