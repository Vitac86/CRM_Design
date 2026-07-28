# Browser-only document generation

How the Document Wizard turns a client card into a finished, printable PDF that
looks as if somebody opened the original Word form and typed the values onto
its blank lines.

See also: [document-digitization-inventory.md](document-digitization-inventory.md).

## 1. How it works

```
Word .docx  ──[ build time, once, on a developer PC ]──►  clean PDF base template
                                                                │  (committed)
                                                                ▼
 CRM subject data ─► normalised payload ─► field map ─► pdf-lib page.drawText()
                                                                │
                                                                ▼
                                                     finished static PDF (download)
```

At **runtime the browser only**:

1. `fetch()`es the committed PDF base template (a local static asset),
2. `fetch()`es the local Liberation Serif TTF,
3. draws text and checkbox marks onto the existing pages with **pdf-lib**,
4. hands the bytes to the user as a Blob download.

### Why nothing native is required at runtime

The expensive, fragile step — rendering a Word document's layout — is done
**once, at build time**, and its result (the PDF) is committed. What remains at
runtime is only "draw this string at this coordinate", which pdf-lib does in
pure JavaScript.

So the running CRM needs **no** backend PDF service, LibreOffice, Microsoft
Word, Java, Python, Node, Puppeteer, wkhtmltopdf, native executable, DLL,
Linux `.so`, browser extension, Adobe Acrobat, CDN or external conversion
service. There is **no runtime DOCX→PDF conversion**.

Everything loaded is a local static asset:

| Asset | Purpose |
| --- | --- |
| `assets/vendor/pdf-lib.min.js` | PDF read/write |
| `assets/vendor/fontkit.umd.min.js` | TTF embedding + subsetting |
| `assets/fonts/pdf/LiberationSerif-*.ttf` | Cyrillic-capable serif body font |
| `assets/document-pdf-templates/*.pdf` | Word-derived base templates |
| `assets/js/document-engine/*.js` | The renderer |
| `assets/js/document-field-maps/*.js` | Per-document coordinates |

### Supported browsers

Modern desktop **Chrome, Edge, Firefox, Safari**. JavaScript is required.
Internet Explorer is not supported. The engine is ES5-style and uses only
`fetch`, `Promise`, `Blob`, `URL` and `URLSearchParams`.

## 2. Module layout

| File | Responsibility |
| --- | --- |
| `document-engine/pdf-text-layout.js` | measuring, word wrapping, shrink-to-fit, alignment |
| `document-engine/pdf-checkbox-renderer.js` | vector marks inside existing checkboxes |
| `document-engine/pdf-overlay-renderer.js` | orchestration, coordinate conversion, formatters, validation, errors |
| `document-field-maps/<doc-id>.js` | one document's coordinates — **no rendering logic** |
| `pages/document-wizard.js` | wizard UI, payload normalisation, download/upload |

Document-specific coordinates never live in the renderer, and the renderer
never contains a per-document branch.

## 3. Converting a Word file into a base template

On a workstation with Microsoft Word:

```bash
powershell -ExecutionPolicy Bypass -File static-uikit/tools/docx-to-pdf.ps1 \
    -Src "C:\work\ПРИЛОЖЕНИЕ 1А ….docx" \
    -Dst "static-uikit/assets/document-pdf-templates/accession-application-fl.pdf"
```

* Opens the source **read-only**; source files are never modified.
* Exports content only — no markup, no comments, no PDF/A.
* Exports to a local temp file, then moves it into place (Word can block for a
  long time writing straight to a mapped network drive).
* **One document per invocation.** Driving several documents from one
  long-lived Word automation session proved unreliable — Word blocks inside
  `ExportAsFixedFormat` and never returns. A fresh process per file is slower
  but deterministic.

Then verify the result:

* page count matches the Word document,
* `AcroForm` field count is **0**,
* no extra page was appended.

Rules for a base template: original static layout only; **no appended form
page**; no visible blue fields, borders, highlights, labels or helper text; no
example client data baked in; legal wording untouched. Anything that looks like
a typo or an outdated reference goes into the inventory's *Source document
defects* table — it is never silently corrected.

Use stable lowercase ASCII filenames.

## 4. Determining coordinates

**Never estimate coordinates from a font width table.** These forms are
justified, so Word stretches inter-word spacing; an estimated offset drifts by
tens of points across a line — enough to print a passport number on top of the
word beside it. (This exact bug was caught in visual QA and is why the probe
reads real glyph boxes.)

```bash
pip install pymupdf          # developer workstation only
python static-uikit/tools/probe-pdf-coords.py TEMPLATE.pdf --page 0
python static-uikit/tools/probe-pdf-coords.py TEMPLATE.pdf --find "Тарифный план"
```

It reports, with exact positions:

* `blank` — runs of underscores (the fill-in rules), with `left`, `width`, `top`;
* `checkbox` — every checkbox glyph;
* `anchor` — spans matching a search string, including where the span **ends**,
  for values that follow a printed label with no underline.

Copy `left`, `top` (→ `baselineTop`) and `width` straight into the field map.
Re-run the probe whenever a template is regenerated: if Word repaginates, every
coordinate must be re-measured.

### Coordinate system

Field maps are authored **top-left**, because that is how a template is read on
screen and how the probe reports:

| Key | Meaning |
| --- | --- |
| `left` | x of the left edge, in points |
| `baselineTop` | distance from the **top of the page** down to the text **baseline** |

The renderer converts internally: `pdfY = pageHeight - baselineTop`. Anchoring
to the baseline (not a box) is deliberate — it puts text exactly on the printed
rule, which is what "typed on the line" means.

## 5. Field definition schema

```js
{
  id: 'clientFullName',            // used in error messages; must be unique
  source: 'field.clientFullName',  // payload path
  type: 'text',                    // 'text' | 'check' | 'static'
  page: 0,                         // 0-based
  left: 114.0,
  baselineTop: 99.26,
  width: 203.9,
  font: 'legalSerif',
  fontSize: 8.52,
  minFontSize: 6.0,                // shrink-to-fit floor
  align: 'left',                   // 'left' | 'center' | 'right'
  multiline: false,
  lineHeight: 10,                  // multiline only
  maxLines: 2,                     // multiline only
  format: 'dateRu',                // optional formatter
  fallbacks: ['surname'],          // shorter renderings to try if too wide
  required: true,                  // fail if empty
  optional: true,                  // suppress "source missing" validation
  baselineShift: 0,                // fine vertical nudge
  showWhen: {                      // draw only when a condition holds
    source: 'extra.report-delivery',
    equals: 'email'
  }
}
```

### Conditional values (`showWhen`)

Some printed lines belong to one branch of a mutually exclusive choice. In
Appendix 1A the "По электронной почте ______" line must carry the address only
when e-mail delivery is chosen, and stay blank for офис / почта / ЭДО. Express
that with `showWhen`; `equals` may be an array, and omitting it means "draw
when the source is truthy".

Without such a condition the value would print under every option — a defect
that structural checks do not catch and only visual QA reveals.

### Field source paths

| Namespace | Resolves to | Example |
| --- | --- | --- |
| `subject.*` | the client card record | `subject.email` |
| `field.*` | normalised values from `buildFields()` | `field.passportSeries` |
| `extra.*` | wizard inputs, keyed by field `key` | `extra.report-delivery` |
| `check.*` | wizard checkboxes, keyed by `key` | `check.market-stock` |

An unknown namespace or missing key resolves to `undefined`, which validation
reports rather than silently drawing nothing.

### Built-in formatters

`dateRu` (DD.MM.YYYY) · `dateDay` · `monthOnly` · `dateMonthYear` ·
`dateMonthYearShort` (MM.YYYY) · `dateYear2` · `initials` ("Ковалёв Д.О.") ·
`surname` · `upper` · `trim`. A `format` may also be a function.

## 6. Text fitting

The renderer tries, in order:

1. the primary `format` at `fontSize`, shrinking in 0.25 pt steps to `minFontSize`;
2. each entry in `fallbacks`, same shrink range;
3. if nothing fits → **a visible error naming the document, the field, the
   required width and the available width.**

Long names, addresses, issuing authorities and contract numbers are **never
silently clipped**. Empty optional values simply leave the printed line blank.

## 7. Checkboxes

Marks are drawn **into the checkbox already present in the base PDF**; the
template's own `☐` is never redrawn, covered or replaced, and surrounding text
never shifts.

```js
check('marketStock', 'check.market-stock', true, 0, 62.1, 471.07)

// mutually exclusive: several definitions share one normalised value
check('depoOwner',   'extra.depo-account-type', 'owner',   0, 56.6, 249.5)
check('depoNominee', 'extra.depo-account-type', 'nominee', 0, 56.6, 260.3)
```

`equals` may be an array, and one CRM value may drive several marks by
repeating definitions. Styles: `check` (default), `cross`, `fill`.

Marks are **vector strokes, not glyphs** — Liberation Serif has no `✓`/`✗`, so a
glyph mark could fall back to a missing-glyph box in some viewers.

Mappings are driven by normalised business values, never by UI element IDs.

## 8. Adding a new document

1. Convert the `.docx` (§3) and commit the PDF under
   `assets/document-pdf-templates/`.
2. Probe coordinates (§4).
3. Create `assets/js/document-field-maps/<doc-id>.js`.
4. Add a `<script>` tag for it in `pages/document-wizard.html`.
5. Add a `DOCUMENTS[]` entry in `pages/document-wizard.js` with
   `overlayTemplateId: '<doc-id>'`, plus only the genuinely missing inputs.
6. Add fixtures and run visual QA (§9).
7. Update the inventory.

Only step 5 makes the document visible to users — do it last.

## 9. Visual QA

```bash
cd static-uikit && python -m http.server 8000
# http://localhost:8000/tools/document-qa-harness.html
```

The harness renders each fixture with the **production engine** and offers the
result for download. Fixtures cover: normal individual, long full name, long
issuing authority, long registration address, missing optional values, all
checkboxes on, all off. All fixture data is obviously fictional; **never commit
generated PDFs containing real personal data.**

For every page of every migrated document, confirm at 100 % zoom:

- [ ] dynamic text looks manually typed into the original form
- [ ] page count unchanged; no page added or lost
- [ ] all static legal text unchanged
- [ ] long values do not overlap other content
- [ ] Cyrillic renders correctly (including `ё`, `№`, `«»`)
- [ ] checkmarks are inside the intended boxes
- [ ] the original blank underline is still visible beneath inserted text
- [ ] no blue fields, borders, focus rectangles, labels or form styling
- [ ] no appended data/confirmation sheet

Test the output in the Chrome/Edge viewer, the Firefox viewer, and Adobe Reader
where available.

### Testing Cyrillic

Cyrillic failure is silent — a wrong font yields blanks or boxes. Check that
`ё`, `№`, `«` and `»` all render, and that extracted text still matches:

```bash
python -c "from pypdf import PdfReader; print(PdfReader('out.pdf').pages[0].extract_text()[:400])"
```

## 10. Validation and error reporting

Before drawing, every template is validated for: duplicate field ids, missing
template file, missing/unknown field sources, invalid page indexes, rectangles
outside the page, unsupported field types, unknown fonts, `minFontSize` greater
than `fontSize`, and an unexpected page count (`expectedPages`).

Problems are logged to the console in full and surfaced in the wizard as a
readable message. Required fields are never silently skipped.

## 11. Upload behaviour

Unchanged and still optional. With no `CRM_DOCUMENT_UPLOAD_ENDPOINT` (or
`data-document-upload-endpoint`) configured, generated documents **stay in the
browser** and are only offered as a download. When an internal endpoint is
configured, files are posted in one multipart request. Nothing is ever sent to
an external service.
