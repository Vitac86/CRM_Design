"""Freeze and verify production document identifiers against the real runtime.

Usage:
    python static-uikit/tools/qa/check_identifier_manifest.py --write
    python static-uikit/tools/qa/check_identifier_manifest.py

The checked-in manifest is a compatibility floor, not a closed-world schema:
new maps, fields, wizard controls and formatters are allowed. Removing or
renaming anything in the manifest fails the check.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from headless_browser import Chrome, Server


QA_DIR = Path(__file__).resolve().parent
MANIFEST = QA_DIR / "document-identifier-manifest.json"


def load_runtime() -> dict:
    server, browser = Server(), Chrome()
    try:
        browser.goto(server.base + "/tools/document-template-builder.html?embeddedQa=1")
        browser.eval(
            "window.CRMDocumentBuilder.app.readyPromise.then(function () { return true; })",
            await_promise=True,
        )
        raw = browser.eval(
            "JSON.stringify({"
            " maps: window.CRMDocumentEngine.fieldMaps,"
            " catalog: window.CRMDocumentCatalog"
            "})"
        )
        return json.loads(raw)
    finally:
        browser.stop()
        server.stop()


def snapshot(runtime: dict) -> dict:
    maps = runtime.get("maps") or {}
    catalog = runtime.get("catalog") or {}
    map_rows: list[dict] = []
    formatter_names: set[str] = set()

    for map_id in sorted(maps):
        template = maps[map_id]
        fields = []
        for field in template.get("fields") or []:
            fields.append({
                "id": str(field.get("id") or ""),
                "source": None if field.get("source") is None else str(field["source"]),
            })
            formatter = field.get("format")
            if isinstance(formatter, str) and formatter:
                formatter_names.add(formatter)
            for fallback in field.get("fallbacks") or []:
                if isinstance(fallback, str) and fallback:
                    formatter_names.add(fallback)
        fields.sort(key=lambda item: (item["id"], item["source"] or ""))
        map_rows.append({"id": map_id, "fields": fields})

    document_ids: list[str] = []
    overlay_bindings: list[dict] = []
    wizard_keys: list[dict] = []
    check_keys: list[dict] = []

    def visit_document(document: dict) -> None:
        document_id = str(document.get("id") or "")
        document_ids.append(document_id)
        overlay_id = document.get("overlayTemplateId")
        if overlay_id:
            overlay_bindings.append({
                "documentId": document_id,
                "overlayTemplateId": str(overlay_id),
            })
        for group in ("fields", "companyFields"):
            for control in document.get(group) or []:
                wizard_keys.append({
                    "documentId": document_id,
                    "group": group,
                    "key": str(control.get("key") or ""),
                })
        for control in document.get("checkFields") or []:
            check_keys.append({
                "documentId": document_id,
                "key": str(control.get("key") or ""),
            })
        for child in document.get("packageDocuments") or []:
            visit_document(child)

    for document in catalog.get("documents") or []:
        visit_document(document)

    document_ids.sort()
    overlay_bindings.sort(key=lambda item: (item["documentId"], item["overlayTemplateId"]))
    wizard_keys.sort(key=lambda item: (item["documentId"], item["group"], item["key"]))
    check_keys.sort(key=lambda item: (item["documentId"], item["key"]))

    return {
        "schemaVersion": 1,
        "generatedBy": "static-uikit/tools/qa/check_identifier_manifest.py --write",
        "counts": {
            "maps": len(map_rows),
            "fields": sum(len(row["fields"]) for row in map_rows),
            "registryDocuments": len(document_ids),
            "overlayBindings": len(overlay_bindings),
            "wizardKeys": len(wizard_keys),
            "checkKeys": len(check_keys),
            "formatterNames": len(formatter_names),
        },
        "maps": map_rows,
        "registryDocumentIds": document_ids,
        "overlayBindings": overlay_bindings,
        "wizardKeys": wizard_keys,
        "checkKeys": check_keys,
        "formatterNames": sorted(formatter_names),
    }


def duplicates(values: list[tuple]) -> list[tuple]:
    seen: set[tuple] = set()
    repeated: list[tuple] = []
    for value in values:
        if value in seen and value not in repeated:
            repeated.append(value)
        seen.add(value)
    return repeated


def compare(required: dict, current: dict) -> list[str]:
    errors: list[str] = []
    current_maps = {entry["id"]: entry for entry in current.get("maps") or []}

    for map_entry in current.get("maps") or []:
        scoped = [(field["id"],) for field in map_entry.get("fields") or []]
        for repeated in duplicates(scoped):
            errors.append(f'duplicate field id in {map_entry["id"]}: {repeated[0]}')

    for expected_map in required.get("maps") or []:
        map_id = expected_map["id"]
        actual_map = current_maps.get(map_id)
        if not actual_map:
            errors.append(f"removed production map: {map_id}")
            continue
        actual_fields = {field["id"]: field for field in actual_map.get("fields") or []}
        for expected_field in expected_map.get("fields") or []:
            field_id = expected_field["id"]
            actual_field = actual_fields.get(field_id)
            if not actual_field:
                errors.append(f"removed/renamed field id: {map_id}/{field_id}")
            elif actual_field.get("source") != expected_field.get("source"):
                errors.append(
                    f"changed source: {map_id}/{field_id}: "
                    f"{expected_field.get('source')!r} -> {actual_field.get('source')!r}"
                )

    def required_subset(name: str, expected_rows: list, actual_rows: list, key) -> None:
        expected = {key(row) for row in expected_rows}
        actual_values = [key(row) for row in actual_rows]
        for repeated in duplicates(actual_values):
            errors.append(f"duplicate current {name}: {repeated!r}")
        actual = set(actual_values)
        for missing in sorted(expected - actual):
            errors.append(f"removed/renamed {name}: {missing!r}")

    required_subset(
        "registry document id",
        required.get("registryDocumentIds") or [],
        current.get("registryDocumentIds") or [],
        lambda value: (value,),
    )
    required_subset(
        "overlay binding",
        required.get("overlayBindings") or [],
        current.get("overlayBindings") or [],
        lambda row: (row["documentId"], row["overlayTemplateId"]),
    )
    required_subset(
        "wizard key",
        required.get("wizardKeys") or [],
        current.get("wizardKeys") or [],
        lambda row: (row["documentId"], row["group"], row["key"]),
    )
    required_subset(
        "check key",
        required.get("checkKeys") or [],
        current.get("checkKeys") or [],
        lambda row: (row["documentId"], row["key"]),
    )
    required_subset(
        "formatter name",
        required.get("formatterNames") or [],
        current.get("formatterNames") or [],
        lambda value: (value,),
    )
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--write",
        action="store_true",
        help="replace the compatibility floor with the current runtime snapshot",
    )
    args = parser.parse_args()

    current = snapshot(load_runtime())
    if args.write:
        MANIFEST.write_text(
            json.dumps(current, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(
            f"wrote {MANIFEST}: {current['counts']['maps']} maps, "
            f"{current['counts']['fields']} fields"
        )
        return 0

    if not MANIFEST.exists():
        print(f"identifier manifest is missing: {MANIFEST}")
        return 2
    required = json.loads(MANIFEST.read_text(encoding="utf-8"))
    errors = compare(required, current)
    if errors:
        for error in errors:
            print("FAIL ", error)
        print(f"\nIdentifier manifest: {len(errors)} compatibility failure(s)")
        return 1

    required_counts = required.get("counts") or {}
    print(
        "Identifier manifest: PASS · required "
        f"{required_counts.get('maps', 0)} maps / "
        f"{required_counts.get('fields', 0)} fields · current "
        f"{current['counts']['maps']} maps / {current['counts']['fields']} fields"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
