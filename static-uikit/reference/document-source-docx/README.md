# Document source templates (DOCX)

Source / reference Word templates for Document Wizard documents.
**These files are NOT used at runtime.**

The active Document Wizard consumes *prepared, fillable PDF templates* from
`static-uikit/assets/document-pdf-templates/`. Client-side DOCX → PDF conversion
is intentionally **not** implemented: it is not reliable enough for final
financial/legal documents.

## Workflow (DOCX → active wizard item)

1. Put the source `.docx` here (`reference/document-source-docx/`).
2. Convert / prepare it into a **fillable PDF** with AcroForm fields
   (LibreOffice / Acrobat / a prep script). Use the field-naming convention
   below so the wizard can auto-fill from subject data.
3. Put the prepared PDF into `static-uikit/assets/document-pdf-templates/`.
4. Add a config entry in `static-uikit/assets/js/pages/document-wizard.js`
   (`DOCUMENTS[]`), filling only document-specific fields; common subject /
   representative fields are auto-filled.
5. The document then appears as an active wizard item.

A document stays **DOCX-only** (source/reference, not shown in the wizard) until
step 3 is done.

## PDF field-naming convention

Use stable AcroForm field names. The wizard resolves these namespaces:

```
subject.displayName  subject.inn  subject.code  subject.email  subject.phone

field.clientFullName        field.passportSeries     field.passportNumber
field.passportIssuedBy      field.passportIssueDate  field.registrationAddress
field.documentDateRu        (Russian date DD.MM.YYYY)

representative.fullName  representative.role  representative.authority

extra.<specific-field-id>   check.<specific-check-id>
```

If the prepared PDF uses different field names, map them in the document's
`pdfFieldMap` (template field name → payload path).

## Current source files

| DOCX | Intended document | Status |
| --- | --- | --- |
| `Анкета ФЛ.docx` | Анкета физического лица | DOCX source — not yet a PDF template |
| `Анкета ЮЛ.docx` | Анкета юридического лица | DOCX source — not yet a PDF template |
| `Заявление о признании ФЛ квал. инвестором.docx` | Заявление о признании ФЛ квалифицированным инвестором | DOCX source — not yet a PDF template |
| `ЗАЯВЛЕНИЕ о признании Юр. Лица квалифицированным инвестором.docx` | Заявление о признании ЮЛ квалифицированным инвестором | DOCX source — not yet a PDF template |
| `УВЕДОМЛЕНИЕ о признании лица квалифицированным инвестором.docx` | Уведомление о признании квалифицированным инвестором | DOCX source — not yet a PDF template |
| `ПРИЛОЖЕНИЕ 3 К РЕГЛАМЕНТУ. УВЕДОМЛЕНИЕ ОБ ОТКРЫТИИ БРОКЕРСКОГО-ДЕПОЗИТАРНОГО СЧЕТА.docx` | Уведомление об открытии брокерского-депозитарного счёта | DOCX source — not yet a PDF template |
| `ПРИЛОЖЕНИЕ 14 К РЕГЛАМЕНТУ. ЗАЯВЛЕНИЕ ОБ УСТАНОВЛЕНИИ-ИЗМЕНЕНИИ КОДОВОГО СЛОВА.docx` | Заявление об установлении/замене кодового слова | DOCX source — not yet a PDF template |

> The legacy HTML print templates in `assets/document-templates/` are kept for
> reference only and are **not** shown in the active wizard.
