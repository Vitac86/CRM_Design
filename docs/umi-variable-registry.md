# Exact UMI variable registry

## What this is

One tracked registry of the **exact** UMI variable names, generated from the
authoritative workbook `Переменные UMI.xlsx`.

| | |
|---|---|
| Registry | [static-uikit/assets/js/document-engine/umi-registry.js](../static-uikit/assets/js/document-engine/umi-registry.js) |
| Adapter | [static-uikit/assets/js/document-engine/umi-adapter.js](../static-uikit/assets/js/document-engine/umi-adapter.js) |
| Generator | [static-uikit/tools/qa/build_umi_registry.py](../static-uikit/tools/qa/build_umi_registry.py) |
| Gate | [static-uikit/tools/qa/check_umi_registry.py](../static-uikit/tools/qa/check_umi_registry.py) |

Contents: **14 UMI structures, 259 exact fields, 89 registered aliases.**

The registry is a JavaScript module carrying one JSON literal between
`/* UMI-REGISTRY-JSON-BEGIN */` and `/* UMI-REGISTRY-JSON-END */`, so the
browser engine loads it with a plain `<script>` tag and the Python QA reads the
same bytes without starting a browser.

Rebuild it after the workbook changes:

```
python static-uikit/tools/qa/dump_field_maps.py --out static-uikit/tools/qa/maps.json
python static-uikit/tools/qa/build_umi_registry.py \
    --workbook "<path>/Переменные UMI.xlsx"
```

The workbook is read-only input. It is never edited and never committed — only
the generated registry is tracked, so the exact names survive in the repository
without copying a client-data-bearing spreadsheet into it.

## Naming rule

Identifiers come from the workbook's `Имя` column. The `Название` column is a
human-readable label; it is carried as `title` for reviewers and is **never**
used as an identifier.

Two source forms address a UMI field:

| Form | Meaning |
|---|---|
| `umi.<structureKey>.<name>` | one exact field, e.g. `umi.requisites.bank_name` |
| `umi.<name>` | subject-relative — resolves against `FrontClientCompany` for a company and `Front Client Phys` for an individual, e.g. `umi.bo_num`, `umi.datesign`, `umi.origname` |

The subject-relative form exists only for names the workbook really defines on
that structure. `umi.origname` resolves for a company and is absent for an
individual, because `origname` exists only on `FrontClientCompany`.

## Structures

| UMI ID | Системное имя | key | fields |
|---|---|---|---|
| 105 | FrontClientCompany | `company` | 65 |
| 109 | Front Client Phys | `phys` | 55 |
| 118 | Front Заявление о присоединении | `accession` | 33 |
| 120 | Front Тарифы в ЛК | `tariffs` | 2 |
| 122 | Текущий Номер Клиента Глобально | `clientNumberGlobal` | 1 |
| 128 | Front представители | `representative` | 9 |
| 133 | Front Отправленные файлы | `sentFiles` | 8 |
| 135 | Front Пользовательские действия | `userActions` | 5 |
| 136 | Front Реквизиты | `requisites` | 28 |
| 139 | Front Страны | `countries` | 9 |
| 141 | Front Страны редактировать | `countriesEdit` | 14 |
| 144 | Front логирование изменения клиента | `clientChangeLog` | 6 |
| 145 | front Уровень риска | `riskLevel` | 4 |
| 160 | Front - заявка на закрытие договора | `closureRequest` | 20 |

## Compatibility

Existing CRM payload names (`subject.*`, `field.*`, `extra.*`, `check.*`) still
resolve. They are **aliases**: the registry records what each one means in UMI
terms, and the adapter is the only code that reads the payload. No map was
renamed in the same commit that changed layout.

A payload may also carry UMI values directly under `payload.umi`, keyed by
structure (`payload.umi.company.origname`) or flat for the subject structure
(`payload.umi.origname`). An integration can start sending exact names without
the maps changing again.

### Alias kinds

| kind | meaning |
|---|---|
| `umi` | one exact UMI field |
| `umi-subject-split` | different exact name per subject structure |
| `umi-either` | one of two fields depending on the requisite's currency |
| `composed` | assembled from several exact fields |
| `composed-address` | the one formatted address, see below |
| `workflow` | a value of the generation workflow, not a stored attribute |
| `internal` | an engine discriminator, not a UMI field |
| `unresolved` | no UMI field exists; operator input |
| `unresolved-business` | **blocked** — awaiting a business answer |

## Addresses

`umi.address.registration` and `umi.address.legal` are assembled by the adapter
from the exact components, in this order:

```
index, country, region, district, city, settlement, street, house, corps, flat
```

`district` exists only on `Front Client Phys`; `FrontClientCompany` has no
district component. A map prints **either** the formatted address **or**
individual components, never both, so no address part can appear twice on one
form.

## Resolved ambiguities

### Client code — `num_investika`

`Код клиента в системе внутреннего учета` binds to **`umi.num_investika`**
(`FrontClientCompany` field 442 / `Front Client Phys` field 440).

Evidence, not the label alone:

1. The same exact system name `num_investika` carries the title **«Код
   клиента»** in `Front - заявка на закрытие договора` (field 635). The workbook
   itself equates the name with the client code.
2. The CRM payload already carries it as the subject code (`INV-1006`,
   `INV-1011`) — the Investika numbering, matching «Номер договора Инвестики».
3. `nomer_klienta` was **rejected**: it is the only field of «Текущий Номер
   Клиента Глобально», a single global allocator object of type `Число`. It
   holds the next number to hand out, not a per-client attribute, and cannot be
   printed as one client's code.

### Brokerage agreement — `bo_num` / `datesign`

`Договор на брокерское обслуживание` binds number to **`umi.bo_num`**
(«Номер Брокерского договора») and date to **`umi.datesign`** («Дата
Договора»). Both exist on `company` and `phys` under the same exact names.

## Depository agreement — no printable UMI pair

Two exact workflow sources deliberately do **not** pretend to be UMI fields:

* `extra.extra-depository-contract`
* `extra.extra-depository-contract-date`

**No printable depository agreement number or date exists in the workbook.**

| candidate | what it actually is | verdict |
|---|---|---|
| `id_depo_dogovora_lk` | «ИД депо договора ЛК», `Строка`, on `company` and `phys` | internal LK object ID — printing it as the legal agreement number is not proven and is not done |
| `depozitarnyj_dogovor` | «Депозитарный договор», **`Кнопка-флажок`**, on `accession` | a checkbox: whether the depository agreement is part of the accession. Not a number and not a date |
| `id_broking_contracts` | «ИД брокерского договора ЛК», `Строка` | internal LK object ID for the *brokerage* agreement |
| `data_zaklyucheniya_dogovra` | «Дата заключения договра», `Дата`, on `accession` | the accession agreement's conclusion date, not the depository agreement's date |

Both aliases are therefore registered as `kind: "workflow"` with
`operatorInput: true`, not `unresolved-business`. They are required, empty by
default operator inputs in exactly three documents:

| Document | Printed occurrences |
|---|---|
| `accession-application-fl` | agreement number + date |
| `accession-application-yul` | agreement number + date |
| `account-opening-notice` | page-1 agreement pair and the same pair in page-2 transfer-basis item 2 |

The account-opening repetitions use separate field IDs but the same two source
paths, so one requested pair is printed consistently. No wizard control may
declare `default` or `defaultValue`; in particular the date is never silently
set to today. The Wizard keeps values while the operator goes Back or reselects
the same document, isolates them between documents, validates a real ISO
calendar date, and refuses generation when either half is absent.

`check_umi_registry.py` locks the alias kind, `operatorInput` flag, exact
`usedBy` occurrences and the absence of a guessed UMI target.

## Open question

The registration number and date of the accession application are in the same
position: `Front Заявление о присоединении` contains `mask` (`Строка`,
required — a generic mask) and `data_zaklyucheniya_dogovra`, neither of which is
proven to be the application's *registration* number or date.
