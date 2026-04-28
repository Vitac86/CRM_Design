# HANDOFF_READINESS_AUDIT

## Terminology and target
- **Target**: UMI.CMS Corporate edition / UMI.CMS 24-compatible static templates.
- **Clarification**: "Corporate" refers to UMI.CMS Corporate edition, not a separate UIkit Corporate theme or design system.
- UIkit remains the local static UI framework assets used by the handoff.

## Status summary
- **Ready for handoff**: static-uikit remains standalone static HTML5 + local UIkit assets with server-rendered/static-template-first contracts.
- `crm-static.js` is global-only reusable behavior; page-specific behavior remains isolated to `assets/js/pages/subject-card.js`.

## Validated page groups
- Standalone reference pages (`static-uikit/pages/*.html`) are the visual/source-of-truth baseline for UMI extraction.
- Registry/list pattern and non-registry card/detail/wizard/admin contracts are covered by audit files and validator checks.

## UMI pack status
- `umi-p0/` and `umi-p1/` remain extraction packs (not runtime apps, no build step).
- Template notes and inventories are aligned with page ownership and server-rendered/static-template-first expectations.

## Required commands
- `node static-uikit/tools/validate-static-uikit.mjs`
- `npm run build`

## Known non-blocking follow-ups
- Keep UMI project-specific template syntax replacement (`{{ ... }}` placeholders) in implementation repos, not in this static handoff bundle.
- If new page-specific interactions appear, add a dedicated `assets/js/pages/<page>.js` script with page guard and registry ownership update.

## Owner handoff notes
- Treat standalone pages as reference templates; do not introduce runtime data rendering helpers.
- Preserve global-only ownership in `assets/js/crm-static.js` and template-specific includes for page scripts.
