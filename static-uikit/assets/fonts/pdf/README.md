# PDF embedding fonts

Fonts embedded into generated PDFs by the Document Wizard
(`assets/js/document-engine/`) via pdf-lib + fontkit. All files are served
locally — **no font is ever fetched from a CDN or external domain**, at build
time or at runtime.

## `LiberationSerif-*.ttf` — legal document body font (`legalSerif`)

Used to draw dynamic values into the Word-derived PDF base templates in
`assets/document-pdf-templates/`.

- **Typeface:** Liberation Serif 2.1.5.
- **Licence:** SIL Open Font License 1.1 — see `LiberationSerif-LICENSE.txt`.
  Freely redistributable, so it is safe to commit to this repository.
- **Why this face:** the source Word documents are set in **Times New Roman**.
  Liberation Serif is *metric-compatible* with Times New Roman — verified
  advance widths (per 1000 upem): `A`=722, `a`=444, `M`=889, `i`=278, `0`=500,
  space=250, `.`=250, all identical to Times New Roman. Inserted values
  therefore occupy the same horizontal space as the surrounding static text and
  look manually typed into the original form.
- **Coverage:** full Latin + full Cyrillic (`А`–`я`, `Ё`, `ё`), plus `№ « » — –`.

| File | Face | Used for |
| --- | --- | --- |
| `LiberationSerif-Regular.ttf` | Regular | body values (names, passport, address, dates) |
| `LiberationSerif-Bold.ttf` | Bold | values on bold source lines |
| `LiberationSerif-Italic.ttf` | Italic | values on italic source lines |

> **Checkmarks are not glyphs.** Liberation Serif has no `☐ ✓ ✗`, so the
> checkbox renderer draws marks as **vector strokes** inside the checkbox
> already present in the base PDF. This is font-independent and cannot fall back
> to a missing-glyph box. The `☐` outline itself belongs to the template and is
> never redrawn.

## `Inter-Regular.ttf` — UI-font fallback

Retained for the legacy AcroForm-filling path only. New documents use
`legalSerif`; do not use Inter for Word-derived legal templates — it is a
sans-serif UI face and would not match the source typography.

- **Typeface:** Inter (SIL Open Font License), the project UI font.
- **Provenance:** merged from the project's own Inter web subsets
  `assets/fonts/inter/Inter-Cyrillic-Regular.woff2` + `Inter-Latin-Regular.woff2`.

## Refreshing the serif fonts

Fonts are committed, so a normal checkout needs no download. To re-fetch
upstream, see `static-uikit/tools/README.md`.
