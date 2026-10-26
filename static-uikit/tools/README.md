# static-uikit/tools

Developer-workstation tooling. **None of this runs in the browser or is needed
by the deployed CRM** — production users only need a modern browser.

| File | Purpose | Requires |
| --- | --- | --- |
| `build-css-bundle.mjs` | build the CSS bundle | Node |
| `validate-static-uikit.mjs` | static UI kit validation | Node |
| `docx-to-pdf.ps1` | export one source Word document to a clean PDF base template | Windows + Microsoft Word |
| `probe-pdf-coords.py` | measure overlay coordinates from a converted template | Python + `pymupdf` |
| `probe-pdf-table-cells.py` | measure value cells in table-shaped forms (анкеты) | Python + `pymupdf` |
| `document-qa-harness.html` | render document fixtures with the production engine for visual QA | a browser + a static server |
| `qa/run_order_forms_tests.py` | drive every branch of Приложение 7 through the real wizard and read the result back out of the PDF | Python + `pymupdf` + Chrome |

See [docs/document-pdf-generation.md](../../docs/document-pdf-generation.md) for
the full document workflow.

## Converting several documents

`docx-to-pdf.ps1` deliberately handles **one file per invocation**: a
long-lived Word automation session blocks inside `ExportAsFixedFormat` and
never returns. Loop over the files instead, one process each:

```bash
for f in /path/to/source/*.docx; do
  name=$(basename "$f" .docx)
  powershell -ExecutionPolicy Bypass -File static-uikit/tools/docx-to-pdf.ps1 \
      -Src "$f" \
      -Dst "static-uikit/assets/document-pdf-templates/$name.pdf"
done
```

## Probing table-shaped forms

`probe-pdf-coords.py` finds runs of underscores — the fill-in rules used by the
Regulation appendices. The анкеты have no underscores at all: their blanks are
empty **table cells**, so that probe reports nothing useful for them.

`probe-pdf-table-cells.py` rebuilds the cell grid from the drawn rules and
prints, for every row, the printed label and the coordinates of the empty cell
beside it — ready to paste into a field map:

```bash
python static-uikit/tools/probe-pdf-table-cells.py TEMPLATE.pdf --page 0
python static-uikit/tools/probe-pdf-table-cells.py TEMPLATE.pdf --page 0 --find "ИНН"
```

Only vertical rules running down at least `--min-span` (default 0.25) of the
table count as column boundaries. Without that filter a rule that splits a
single row — the three-way ПДЛ box column, for example — is mistaken for a
column edge and every value cell comes out a fraction of its real width.

## Refreshing the PDF fonts

`assets/fonts/pdf/LiberationSerif-*.ttf` are committed, so a normal checkout
needs no download. To re-fetch upstream (Liberation Fonts 2.1.5, SIL OFL 1.1),
take `LiberationSerif-Regular/Bold/Italic.ttf` and `LICENSE` from the official
release tarball at <https://github.com/liberationfonts/liberation-fonts> and
drop them into `assets/fonts/pdf/`. Verify afterwards that Cyrillic coverage is
complete and that advance widths still match Times New Roman
(`A`=722, `a`=444, `M`=889, `i`=278, `0`=500, space=250, `.`=250 per 1000 upem).
