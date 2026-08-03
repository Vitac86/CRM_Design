"""Build the exact UMI variable registry from the supplied workbook.

    python static-uikit/tools/qa/build_umi_registry.py \
        --workbook "D:/.../Переменные UMI.xlsx" \
        --maps static-uikit/tools/qa/maps.json

Why this exists
---------------
Field maps used to name their sources after the CRM payload (`field.client-code`,
`subject.phone`). Those names are ours, not UMI's, and nothing proved that a
name we invented corresponds to a variable that actually exists in the CMS. This
tool reads the authoritative workbook and writes one tracked registry that

  * records every UMI structure and every exact field name in it,
  * gives each field one normalized production source path,
  * records which document map currently uses it, and
  * gives every source a status a reviewer can act on.

The workbook is read-only input. It is never edited and never committed — only
the generated registry is tracked, so the exact names survive in the repository
without copying a client-data-bearing spreadsheet into it.

The registry is emitted as a JavaScript module carrying one JSON literal between
two markers, so the browser engine loads it with a plain <script> tag and the
Python QA reads the same bytes without a browser.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OUT_JS = os.path.join(
    ROOT, "static-uikit", "assets", "js", "document-engine", "umi-registry.js")

BEGIN = "/* UMI-REGISTRY-JSON-BEGIN */"
END = "/* UMI-REGISTRY-JSON-END */"

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
RNS = "http://schemas.openxmlformats.org/package/2006/relationships"

# ── Structure keys ─────────────────────────────────────────────────────────────
#
# The workbook identifies a structure by its Russian "Системное имя". A source
# path needs a stable ASCII key, so each structure is given one here. Adding a
# structure to the workbook without adding it here is a hard error, so the
# registry can never silently omit one.
STRUCTURE_KEYS = {
    "FrontClientCompany": "company",
    "Front Client Phys": "phys",
    "Front Заявление о присоединении": "accession",
    "Front Тарифы в ЛК": "tariffs",
    "Текущий Номер Клиента Глобально": "clientNumberGlobal",
    "Front представители": "representative",
    "Front логирование изменения клиента": "clientChangeLog",
    "Front Отправленные файлы": "sentFiles",
    "Front Пользовательские действия": "userActions",
    "Front Реквизиты": "requisites",
    "Front Страны": "countries",
    "Front Страны редактировать": "countriesEdit",
    "front Уровень риска": "riskLevel",
    "Front - заявка на закрытие договора": "closureRequest",
}

# The two structures that describe the document subject. A field present in both
# under the same exact name may be addressed subject-relatively as `umi.<name>`;
# the adapter picks the structure from the subject kind of the document.
SUBJECT_STRUCTURES = {"company": "company", "phys": "individual"}

# ── Curated alias table ────────────────────────────────────────────────────────
#
# The existing CRM payload names stay working; this is the single place that
# says what each one means in UMI terms. `umi` is the canonical exact name,
# `note` records why, and `composed` marks a payload value that is assembled
# from several UMI fields rather than being one of them.
#
# A source with no entry here is not a UMI-backed value. That is not an error by
# itself — an operator types the amount on a withdrawal order — but it must be
# stated, which is what `kind` does.
ALIASES = {
    # ── Subject identity ──────────────────────────────────────────────────────
    "subject.kind": {"kind": "internal", "note":
        "Discriminator chosen by the wizard, not stored in UMI. It selects "
        "which UMI structure a subject-relative source resolves against."},
    "subject.displayName": {"kind": "composed", "umi": [
        "umi.company.origname", "umi.phys.surname", "umi.phys.namecl",
        "umi.phys.patronymic"], "note":
        "Company: origname. Individual: surname + namecl + patronymic."},
    "subject.fullLegalName": {"kind": "umi", "umi": "umi.company.origname"},
    "subject.inn": {"kind": "umi", "umi": "umi.inn", "note":
        "Subject-relative: FrontClientCompany.inn / Front Client Phys.inn."},
    "subject.email": {"kind": "umi", "umi": "umi.contact_email"},
    "subject.phone": {"kind": "umi-subject-split", "umi": {
        "company": "umi.company.phones", "individual": "umi.phys.main_phone"},
        "note": "The two structures use different exact names for the phone."},
    "subject.citizenship": {"kind": "umi", "umi": "umi.phys.country", "note":
        "Прописка страна. `isrezident` carries the citizenship flag itself."},

    "field.client-full-name": {"kind": "composed", "umi": [
        "umi.company.origname", "umi.phys.surname", "umi.phys.namecl",
        "umi.phys.patronymic"], "note": "Same composition as subject.displayName."},
    "field.clientFullName": {"kind": "composed", "umi": [
        "umi.company.origname", "umi.phys.surname", "umi.phys.namecl",
        "umi.phys.patronymic"], "note": "Legacy spelling of field.client-full-name."},
    "field.client-full-legal-name": {"kind": "umi", "umi": "umi.company.origname"},
    "field.client-short-name": {"kind": "umi", "umi": "umi.company.basicname"},
    "field.client-english-name": {"kind": "umi", "umi": "umi.company.engname"},
    "field.client-inn": {"kind": "umi", "umi": "umi.inn"},
    "field.client-kpp": {"kind": "umi", "umi": "umi.company.kpp"},
    "field.client-ogrn": {"kind": "umi", "umi": "umi.company.ogrn"},
    "field.client-legal-form": {"kind": "unresolved", "note":
        "No dedicated UMI field. Currently derived from the name prefix."},
    "field.client-charter-capital": {"kind": "umi", "umi": "umi.company.statedcapital"},
    "field.client-website": {"kind": "unresolved", "note":
        "No website field in FrontClientCompany."},
    "field.client-registration-date": {"kind": "umi", "umi": "umi.company.data_registracii"},
    "field.client-registration-authority": {"kind": "umi", "umi": "umi.company.registrofficial"},

    # ── Client code — resolved in Phase 2, see docs/umi-variable-registry.md ──
    "field.client-code": {"kind": "umi", "umi": "umi.num_investika", "note":
        "Код клиента в системе внутреннего учета. The same exact name "
        "`num_investika` is titled «Код клиента» in Front - заявка на закрытие "
        "договора (field 635), and the CRM payload already carries it as the "
        "subject code (INV-1006 / INV-1011). `nomer_klienta` was rejected: it "
        "belongs to «Текущий Номер Клиента Глобально», a single global "
        "allocator object, not a per-client attribute."},

    # ── Identity document ─────────────────────────────────────────────────────
    "field.client-birth-date": {"kind": "umi", "umi": "umi.phys.birthday"},
    "field.client-birth-place": {"kind": "umi", "umi": "umi.phys.birth_place"},
    "field.client-snils": {"kind": "umi", "umi": "umi.phys.snils"},
    "field.client-citizenship": {"kind": "umi", "umi": "umi.phys.country"},
    "field.client-id-type": {"kind": "umi", "umi": "umi.phys.idoctype"},
    "field.client-passport-series": {"kind": "umi", "umi": "umi.phys.pass_series"},
    "field.passportSeries": {"kind": "umi", "umi": "umi.phys.pass_series"},
    "field.client-passport-number": {"kind": "umi", "umi": "umi.phys.pass_number"},
    "field.passportNumber": {"kind": "umi", "umi": "umi.phys.pass_number"},
    "field.passportSeriesNumber": {"kind": "composed", "umi": [
        "umi.phys.pass_series", "umi.phys.pass_number"], "note":
        "One printed cell «Серия (при наличии) и номер документа»."},
    "field.client-passport-issued-by": {"kind": "umi", "umi": "umi.phys.pass_issuer"},
    "field.passportIssuedBy": {"kind": "umi", "umi": "umi.phys.pass_issuer"},
    "field.client-passport-issue-date": {"kind": "umi", "umi": "umi.phys.pass_issue_date"},
    "field.passportIssueDate": {"kind": "umi", "umi": "umi.phys.pass_issue_date"},
    "field.client-passport-dept-code": {"kind": "umi", "umi": "umi.phys.pass_issuer_code"},
    "field.client-id-or-inn": {"kind": "composed", "umi": [
        "umi.phys.idoctype", "umi.phys.pass_series", "umi.phys.pass_number"]},

    # ── Addresses ─────────────────────────────────────────────────────────────
    # One formatted address per subject, assembled from the exact components by
    # the adapter. The components are never printed a second time alongside it.
    "field.client-registration-address": {"kind": "composed-address",
        "umi": "umi.address.registration"},
    "field.registrationAddress": {"kind": "composed-address",
        "umi": "umi.address.registration"},
    "field.client-legal-address": {"kind": "composed-address",
        "umi": "umi.address.legal"},
    "field.client-postal-address": {"kind": "unresolved", "note":
        "UMI stores one address per subject. A separate postal address has no "
        "exact field; the registration/legal address is reused."},

    # ── Agreements ────────────────────────────────────────────────────────────
    "field.extra-contract-number": {"kind": "umi", "umi": "umi.bo_num"},
    "field.extra-contract-date": {"kind": "umi", "umi": "umi.datesign"},
    "extra.extra-contract-number": {"kind": "umi", "umi": "umi.bo_num"},
    "extra.extra-contract-date": {"kind": "umi", "umi": "umi.datesign"},
    "extra.extra-brokerage-contract": {"kind": "umi", "umi": "umi.bo_num"},
    "extra.extra-brokerage-contract-date": {"kind": "umi", "umi": "umi.datesign"},
    "extra.extra-depository-contract": {"kind": "unresolved-business", "note":
        "No printable depository agreement number exists in the workbook. "
        "`id_depo_dogovora_lk` is an internal LK object ID and "
        "`depozitarnyj_dogovor` is a checkbox. Operator input until the "
        "business names the field."},
    "extra.extra-depository-contract-date": {"kind": "unresolved-business", "note":
        "No printable depository agreement date exists in the workbook."},
    # Internal-accounting account numbers. The workbook has no field for them —
    # FrontClientCompany/Front Client Phys carry the agreement, not the ledger
    # accounts opened under it — so they stay operator input.
    "field.extra-account-portfolio": {"kind": "unresolved", "note":
        "Счёт внутреннего учёта. No UMI field; typed in the wizard."},
    "field.extra-stock-portfolio": {"kind": "unresolved", "note":
        "Счёт внутреннего учёта, фондовый рынок. No UMI field."},
    "field.extra-derivatives-portfolio": {"kind": "unresolved", "note":
        "Счёт внутреннего учёта, срочный рынок. No UMI field."},
    "field.extra-currency-portfolio": {"kind": "unresolved", "note":
        "Счёт внутреннего учёта, валютный рынок. No UMI field."},

    "field.documentDateRu": {"kind": "workflow", "note":
        "The date the document is generated. A workflow value, not a stored "
        "UMI attribute; `datesign` is the brokerage agreement date instead."},

    # ── Representative ────────────────────────────────────────────────────────
    "field.client-rep-full-name": {"kind": "umi",
        "umi": "umi.representative.naimenovanie_predstavitelya"},
    "field.representativeFullName": {"kind": "umi",
        "umi": "umi.representative.naimenovanie_predstavitelya"},
    "field.client-rep-position": {"kind": "umi",
        "umi": "umi.representative.status_in_firm"},
    "field.representativeRole": {"kind": "umi",
        "umi": "umi.representative.status_in_firm"},
    "field.client-rep-authority": {"kind": "umi", "umi": "umi.company.heads_polnom",
        "note": "Основание полномочий of the company head."},
    "field.representativeAuthority": {"kind": "umi", "umi": "umi.company.heads_polnom"},
    "field.representativeSignerLine": {"kind": "composed", "umi": [
        "umi.representative.naimenovanie_predstavitelya",
        "umi.representative.status_in_firm"]},
    "extra.representative-name": {"kind": "umi",
        "umi": "umi.representative.naimenovanie_predstavitelya"},
    "extra.representative-authority-details": {"kind": "umi",
        "umi": "umi.representative.dejstvie_polnomochij_do"},

    # ── Bank requisites (Front Реквизиты) ─────────────────────────────────────
    "extra.bank-name": {"kind": "umi", "umi": "umi.requisites.bank_name"},
    "extra.extra-bank-name": {"kind": "umi", "umi": "umi.requisites.bank_name"},
    "extra.bank-address": {"kind": "umi", "umi": "umi.requisites.address"},
    "extra.extra-bank-address": {"kind": "umi", "umi": "umi.requisites.address"},
    "extra.bank-inn": {"kind": "umi", "umi": "umi.requisites.inn"},
    "extra.extra-bank-inn": {"kind": "umi", "umi": "umi.requisites.inn"},
    "extra.bank-bic-swift": {"kind": "umi-either", "umi": [
        "umi.requisites.bik_dlya_rublevyh_rekvizitov",
        "umi.requisites.swift_code"], "note":
        "BIK for rouble requisites, SWIFT for currency requisites."},
    "extra.extra-bank-bic": {"kind": "umi",
        "umi": "umi.requisites.bik_dlya_rublevyh_rekvizitov"},
    "extra.credit-organisation-bic": {"kind": "umi",
        "umi": "umi.requisites.bik_dlya_rublevyh_rekvizitov"},
    "extra.bank-correspondent-account": {"kind": "umi",
        "umi": "umi.requisites.corr_account"},
    "extra.extra-bank-corr-account": {"kind": "umi",
        "umi": "umi.requisites.corr_account"},
    "extra.bank-settlement-account": {"kind": "umi",
        "umi": "umi.requisites.account_number"},
    "extra.extra-bank-account": {"kind": "umi", "umi": "umi.requisites.payment_account"},
    "extra.extra-bank-personal-account": {"kind": "umi",
        "umi": "umi.requisites.payment_account"},
    "extra.extra-bank-recipient": {"kind": "umi", "umi": "umi.requisites.recipient"},
    "extra.extra-bank-corr-name": {"kind": "umi",
        "umi": "umi.requisites.inter_bank_name"},
    "extra.extra-bank-corr-swift": {"kind": "umi",
        "umi": "umi.requisites.inter_swift_code"},
    "extra.correspondent-bank-details": {"kind": "composed", "umi": [
        "umi.requisites.inter_bank_name", "umi.requisites.inter_address",
        "umi.requisites.inter_payment_account",
        "umi.requisites.inter_swift_code"]},
    "extra.bank-additional-details": {"kind": "umi", "umi": "umi.requisites.notation"},
    "extra.extra-bank-additional": {"kind": "umi", "umi": "umi.requisites.notation"},
    "extra.extra-bank-other": {"kind": "umi", "umi": "umi.requisites.notation"},

    # ── Company details available in UMI but currently typed by the operator ──
    "extra.extra-okved": {"kind": "unresolved", "note":
        "No OKVED field in FrontClientCompany; okpo/oktmo/okogu/okfs exist."},
    "extra.extra-okpo": {"kind": "umi", "umi": "umi.company.okpo"},
    "extra.extra-website": {"kind": "unresolved"},
    "extra.landline-phone": {"kind": "umi", "umi": "umi.company.phones"},
    "extra.extra-landline-phone": {"kind": "umi", "umi": "umi.company.phones"},
}


# ── Workbook parsing ───────────────────────────────────────────────────────────

def _col(ref: str) -> int:
    letters = re.match(r"([A-Z]+)", ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def _shared(zf: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return ["".join(t.text or "" for t in si.iter("{%s}t" % NS["m"]))
            for si in root.findall("m:si", NS)]


def _rows(path: str) -> list[list[str]]:
    with zipfile.ZipFile(path) as zf:
        sst = _shared(zf)
        wb = ET.fromstring(zf.read("xl/workbook.xml"))
        rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        target = {r.get("Id"): r.get("Target")
                  for r in rels.findall(f"{{{RNS}}}Relationship")}
        sheet = wb.find("m:sheets", NS)[0]
        sheet_path = target[sheet.get(f"{{{NS['r']}}}id")]
        if not sheet_path.startswith("xl/"):
            sheet_path = "xl/" + sheet_path.lstrip("/")
        root = ET.fromstring(zf.read(sheet_path))
        out = []
        for row in root.iter("{%s}row" % NS["m"]):
            cells: list[str] = []
            for c in row.findall("m:c", NS):
                i = _col(c.get("r", "A1"))
                while len(cells) < i:
                    cells.append("")
                t = c.get("t")
                if t == "inlineStr":
                    el = c.find("m:is", NS)
                    val = "".join(x.text or "" for x in el.iter("{%s}t" % NS["m"])) \
                        if el is not None else ""
                else:
                    v = c.find("m:v", NS)
                    val = v.text if v is not None and v.text else ""
                    if t == "s" and val:
                        val = sst[int(val)]
                cells.append((val or "").strip())
            out.append(cells)
        return out


def parse_workbook(path: str) -> list[dict]:
    """Read the workbook into a list of structures, preserving exact names."""
    structures: list[dict] = []
    current: dict | None = None
    pending_id: str | None = None
    for row in _rows(path):
        if not row:
            continue
        first = row[0] if row else ""
        m = re.match(r"^\(ID:\s*(\d+)\)$", first)
        if m:
            pending_id = m.group(1)
            continue
        m = re.match(r"^Системное имя:\s*(.+)$", first)
        if m:
            name = m.group(1).strip()
            if name not in STRUCTURE_KEYS:
                raise SystemExit(
                    f"Unknown UMI structure {name!r} (ID {pending_id}). Add a key "
                    "to STRUCTURE_KEYS in build_umi_registry.py before rebuilding.")
            current = {"umiId": pending_id, "systemName": name,
                       "key": STRUCTURE_KEYS[name], "fields": []}
            structures.append(current)
            continue
        if first == "ID" or first in ("Структура шаблонов UMI",) or \
                first.startswith("GUID"):
            continue
        if current is not None and re.match(r"^\d+$", first) and len(row) > 1:
            current["fields"].append({
                "umiId": first,
                "name": row[1],
                "title": row[2] if len(row) > 2 else "",
                "type": row[3] if len(row) > 3 else "",
                "required": (row[4] if len(row) > 4 else "") == "да",
                "visible": (row[5] if len(row) > 5 else "") == "да",
            })
    return structures


# ── Registry assembly ──────────────────────────────────────────────────────────

def build(structures: list[dict], maps: dict) -> dict:
    by_key = {s["key"]: s for s in structures}

    # Which exact names appear in both subject structures under one meaning —
    # these are the ones `umi.<name>` may address subject-relatively.
    company_names = {f["name"] for f in by_key["company"]["fields"]}
    phys_names = {f["name"] for f in by_key["phys"]["fields"]}
    subject_relative = company_names | phys_names

    # Current document-map usage, keyed by production source path.
    usage: dict[str, list[str]] = {}
    for map_id, template in sorted(maps.items()):
        for field in template.get("fields", []):
            for src in (field.get("source"),
                        (field.get("showWhen") or {}).get("source")):
                if src:
                    usage.setdefault(src, []).append(
                        f"{map_id}/{field.get('id', '')}")

    # Every canonical UMI entry.
    entries = []
    for s in structures:
        for f in s["fields"]:
            struct_path = f"umi.{s['key']}.{f['name']}"
            relative = None
            if s["key"] in SUBJECT_STRUCTURES and f["name"] in subject_relative:
                relative = f"umi.{f['name']}"
            subject_kind = SUBJECT_STRUCTURES.get(s["key"], "none")
            if relative and f["name"] in company_names and f["name"] in phys_names:
                subject_kind = "both"
            entries.append({
                "structure": s["systemName"],
                "structureKey": s["key"],
                "structureUmiId": s["umiId"],
                "umiId": f["umiId"],
                "name": f["name"],
                "title": f["title"],
                "sourceType": f["type"],
                "required": f["required"],
                "visible": f["visible"],
                "source": struct_path,
                "subjectSource": relative,
                "subjectKind": subject_kind,
            })

    # Which canonical entries an alias points at, so "mapped" can be computed.
    referenced: set[str] = set()

    def note_ref(value):
        if isinstance(value, str):
            referenced.add(value)
        elif isinstance(value, list):
            for v in value:
                referenced.add(v)
        elif isinstance(value, dict):
            for v in value.values():
                referenced.add(v)

    aliases = {}
    for path, meta in sorted(ALIASES.items()):
        entry = dict(meta)
        entry["path"] = path
        entry["usedBy"] = usage.get(path, [])
        if meta.get("umi") and meta["kind"] not in ("internal", "workflow",
                                                    "unresolved",
                                                    "unresolved-business"):
            note_ref(meta["umi"])
        aliases[path] = entry

    # Sources present in the maps that no alias explains.
    unregistered = sorted(p for p in usage if p not in ALIASES)

    # Status per canonical entry.
    valid_paths = {e["source"] for e in entries}
    valid_paths |= {e["subjectSource"] for e in entries if e["subjectSource"]}
    for e in entries:
        hit = e["source"] in referenced or (
            e["subjectSource"] and e["subjectSource"] in referenced)
        e["status"] = "mapped" if hit else "available-unused"

    # Alias targets that name something the workbook does not contain.
    dangling = sorted(r for r in referenced
                      if r not in valid_paths and not r.startswith("umi.address."))

    return {
        "generatedFrom": "Переменные UMI.xlsx",
        "structures": [
            {"umiId": s["umiId"], "systemName": s["systemName"],
             "key": s["key"], "fieldCount": len(s["fields"])}
            for s in structures],
        "fields": entries,
        "aliases": aliases,
        "unregisteredSources": unregistered,
        "danglingAliasTargets": dangling,
        "subjectStructures": SUBJECT_STRUCTURES,
    }


def emit_js(registry: dict) -> str:
    body = json.dumps(registry, ensure_ascii=False, indent=1, sort_keys=False)
    return f"""// Exact UMI variable registry — GENERATED, do not edit by hand.
//
// Rebuild with:
//   python static-uikit/tools/qa/build_umi_registry.py \\
//       --workbook "<path>/Переменные UMI.xlsx"
//
// The names below are the system names from the workbook's `Имя` column. The
// human-readable `Название` labels are carried as `title` and are never used as
// identifiers.
//
// `umi.<structureKey>.<name>` always addresses one exact field. `umi.<name>` is
// the subject-relative form: it resolves against FrontClientCompany for a
// company and Front Client Phys for an individual, and only exists for names
// the workbook really defines on that structure.

(function (global) {{
  'use strict';

  var REGISTRY =
{BEGIN}
{body}
{END};

  var ns = global.CRMDocumentEngine = global.CRMDocumentEngine || {{}};
  ns.umiRegistry = REGISTRY;

}}(typeof window !== 'undefined' ? window : this));
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--workbook", required=True)
    ap.add_argument("--maps", default=os.path.join(HERE, "maps.json"))
    ap.add_argument("--out", default=OUT_JS)
    args = ap.parse_args()

    structures = parse_workbook(args.workbook)
    with open(args.maps, encoding="utf-8") as fh:
        maps = json.load(fh)

    registry = build(structures, maps)
    with open(args.out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(emit_js(registry))

    total = len(registry["fields"])
    mapped = sum(1 for e in registry["fields"] if e["status"] == "mapped")
    print(f"{len(registry['structures'])} UMI structures, {total} exact fields")
    print(f"  mapped                : {mapped}")
    print(f"  available but unused  : {total - mapped}")
    print(f"  aliases registered    : {len(registry['aliases'])}")
    print(f"  unregistered sources  : {len(registry['unregisteredSources'])}")
    print(f"  dangling alias targets: {len(registry['danglingAliasTargets'])}")
    for d in registry["danglingAliasTargets"]:
        print(f"      !! {d}")
    print(f"-> {args.out}")
    return 1 if registry["danglingAliasTargets"] else 0


if __name__ == "__main__":
    sys.exit(main())
