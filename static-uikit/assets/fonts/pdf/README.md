# PDF embedding font

`Inter-Regular.ttf` — Unicode/Cyrillic-capable font embedded into generated PDFs
by the Document Wizard (`assets/js/pages/document-wizard.js`) via pdf-lib +
fontkit, so filled AcroForm values render in every viewer.

- **Typeface:** Inter (the project UI font, SIL Open Font License).
- **Provenance:** merged from the project's own Inter web subsets
  `assets/fonts/inter/Inter-Cyrillic-Regular.woff2` (Cyrillic letters) +
  `Inter-Latin-Regular.woff2` (Latin letters, digits, punctuation) into a single
  static TTF with full coverage for Russian names, addresses and `DD.MM.YYYY`
  dates. No font is fetched from a CDN or external domain at build or runtime.

Keep this file local. Do not reference fonts from a CDN in the wizard.
