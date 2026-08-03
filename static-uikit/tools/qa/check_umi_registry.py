"""Gate: every production source is explained by the exact UMI registry.

    python static-uikit/tools/qa/check_umi_registry.py
    python static-uikit/tools/qa/check_umi_registry.py --maps path/to/maps.json
    python static-uikit/tools/qa/check_umi_registry.py --self-test

What this protects
------------------
A map may only name a source the registry can account for. Three failures are
possible and all three are silent without this gate:

  unregistered   a source nobody can trace to a UMI field or declare as an
                 operator input — the map prints a value from a name we made up;
  dangling       an alias points at an exact UMI name the workbook does not
                 contain — a typo that only shows up in production;
  unresolved     a production-ready document binds a value whose business source
                 is still an open question.

The registry itself is generated (build_umi_registry.py). By default this
executes the live JavaScript maps through dump_field_maps; --maps remains
available for an explicit diagnostic snapshot. A stale registry therefore
fails here rather than being hidden by an old ignored maps.json.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
REGISTRY_JS = os.path.join(
    ROOT, "static-uikit", "assets", "js", "document-engine", "umi-registry.js")
BEGIN = "/* UMI-REGISTRY-JSON-BEGIN */"
END = "/* UMI-REGISTRY-JSON-END */"

# Namespaces that are legitimately not UMI-backed. `extra` and `check` are the
# wizard's own inputs: an operator types the withdrawal amount, and no UMI field
# holds it. They still have to be declared, which is what the registry's alias
# table and this list together do.
OPERATOR_NAMESPACES = ("extra.", "check.")

# Statuses that must not appear in a map the inventory calls production-ready.
BLOCKING_ALIAS_KINDS = {"unresolved-business"}

DEPOSITORY_USAGE = {
    "extra.extra-depository-contract": [
        "accession-application-fl/depositoryContractNumber",
        "accession-application-yul/depositoryContractNumber",
        "account-opening-notice/depositaryContractNumber",
        "account-opening-notice/transferBasisDepositoryNumber",
    ],
    "extra.extra-depository-contract-date": [
        "accession-application-fl/depositoryContractDate",
        "accession-application-yul/depositoryContractDate",
        "account-opening-notice/depositaryContractDate",
        "account-opening-notice/transferBasisDepositoryDate",
    ],
}

TRANSFER_BASIS_BLOCK = "account-opening-transfer-basis"
TRANSFER_BASIS_REFS = [
    "transferBasisDepositoryNumber",
    "transferBasisDepositoryDate",
]

BROKERAGE_PAIR_SOURCES = {
    "field.extra-contract-number",
    "field.extra-contract-date",
    "umi.bo_num",
    "umi.datesign",
}


def load_registry(path: str = REGISTRY_JS) -> dict:
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    try:
        start = text.index(BEGIN) + len(BEGIN)
        end = text.index(END)
    except ValueError as error:
        raise SystemExit(f"{path}: registry markers not found ({error})")
    return json.loads(text[start:end])


def load_maps(path: str | None = None) -> dict:
    if path:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    from dump_field_maps import dump
    return dump()


def sources_in(maps: dict) -> dict[str, list[str]]:
    used: dict[str, list[str]] = {}
    for map_id, template in sorted(maps.items()):
        for field in template.get("fields", []):
            for src in (field.get("source"),
                        (field.get("showWhen") or {}).get("source")):
                if src:
                    used.setdefault(src, []).append(
                        f"{map_id}/{field.get('id', '')}")
    return used


def check(registry: dict, maps: dict) -> tuple[int, list[str]]:
    failures: list[str] = []
    checks = 0

    canonical = {f["source"] for f in registry["fields"]}
    canonical |= {f["subjectSource"] for f in registry["fields"]
                  if f.get("subjectSource")}
    aliases = registry.get("aliases", {})

    # 1. Every alias target names a field the workbook really has.
    for path, alias in sorted(aliases.items()):
        targets = alias.get("umi")
        if not targets:
            continue
        if isinstance(targets, str):
            targets = [targets]
        elif isinstance(targets, dict):
            targets = list(targets.values())
        for target in targets:
            checks += 1
            if target.startswith("umi.address."):
                continue
            if target not in canonical:
                failures.append(
                    f"alias {path} -> {target}: no such exact UMI field")

    # 2. Every source a production map uses is registered.
    used = sources_in(maps)
    for source, where in sorted(used.items()):
        checks += 1
        if source in aliases or source in canonical:
            continue
        if source.startswith("umi.address."):
            continue
        if source.startswith(OPERATOR_NAMESPACES):
            continue
        failures.append(
            f"unregistered source {source} used by {', '.join(where[:3])}")

    # 3. No canonical `umi.*` source is used without existing.
    for source, where in sorted(used.items()):
        if not source.startswith("umi."):
            continue
        checks += 1
        if source.startswith("umi.address.") or source in canonical:
            continue
        failures.append(
            f"{source} is not in the registry (used by {', '.join(where[:3])})")

    # 4. Alias usage is generated bookkeeping, not documentation somebody may
    #    update approximately. Every list, including its order, must be exactly
    #    what the live maps produce.
    for path, alias in sorted(aliases.items()):
        checks += 1
        expected = used.get(path, [])
        actual = alias.get("usedBy")
        if actual != expected:
            failures.append(
                f"alias {path} usedBy is stale: registry={actual!r}, "
                f"live={expected!r}")

    # 5. Sources no alias explains are also generated bookkeeping. Operator
    #    namespaces may legitimately be on this list, but the registry may not
    #    omit, invent, or retain a stale entry.
    checks += 1
    expected_unregistered = sorted(source for source in used
                                   if source not in aliases)
    actual_unregistered = registry.get("unregisteredSources")
    if actual_unregistered != expected_unregistered:
        failures.append(
            "registry unregisteredSources is stale: "
            f"registry={actual_unregistered!r}, live={expected_unregistered!r}")

    # 6. The registry's own target bookkeeping agrees with its aliases.
    checks += 1
    if registry.get("danglingAliasTargets"):
        failures.append("registry records dangling alias targets: "
                        + ", ".join(registry["danglingAliasTargets"]))

    return checks, failures


def _alias_targets(value) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [item for item in value if isinstance(item, str)]
    if isinstance(value, dict):
        return [item for item in value.values() if isinstance(item, str)]
    return []


def _is_brokerage_pair_source(source: str | None) -> bool:
    if not source:
        return False
    return source in BROKERAGE_PAIR_SOURCES or source.endswith(
        (".bo_num", ".datesign"))


def check_depository_completeness(registry: dict,
                                  maps: dict) -> tuple[int, list[str]]:
    """Freeze the legal depository pair's source policy and all occurrences."""
    failures: list[str] = []
    checks = 0
    aliases = registry.get("aliases", {})
    live_usage = sources_in(maps)

    for source, expected_usage in DEPOSITORY_USAGE.items():
        alias = aliases.get(source)
        checks += 1
        if not alias:
            failures.append(f"depository alias {source} is missing")
            continue

        checks += 1
        if alias.get("kind") != "workflow" or alias.get("operatorInput") is not True:
            failures.append(
                f"depository alias {source} must be kind='workflow' and "
                f"operatorInput=true, got kind={alias.get('kind')!r}, "
                f"operatorInput={alias.get('operatorInput')!r}")

        checks += 1
        targets = _alias_targets(alias.get("umi"))
        if targets:
            failures.append(
                f"depository alias {source} must remain operator-entered, "
                f"not UMI-backed ({targets!r})")
        checks += 1
        if any(_is_brokerage_pair_source(target) for target in targets):
            failures.append(
                f"depository alias {source} substitutes brokerage "
                f"bo_num/datesign ({targets!r})")

        checks += 1
        if alias.get("usedBy") != expected_usage:
            failures.append(
                f"depository alias {source} usedBy must be exactly "
                f"{expected_usage!r}, got {alias.get('usedBy')!r}")

        checks += 1
        if live_usage.get(source, []) != expected_usage:
            failures.append(
                f"live depository usage for {source} must be exactly "
                f"{expected_usage!r}, got {live_usage.get(source, [])!r}")

        for occurrence in expected_usage:
            map_id, field_id = occurrence.split("/", 1)
            fields = (maps.get(map_id) or {}).get("fields", [])
            field = next((item for item in fields
                          if item.get("id") == field_id), None)
            checks += 1
            if not field:
                failures.append(f"depository occurrence {occurrence} is missing")
                continue
            checks += 1
            if field.get("source") != source:
                failures.append(
                    f"{occurrence}: source {field.get('source')!r} != {source!r}")
            checks += 1
            if field.get("required") is not True or field.get("optional") is True:
                failures.append(
                    f"{occurrence}: every printed depository value must be "
                    "required and non-optional")
            checks += 1
            if _is_brokerage_pair_source(field.get("source")):
                failures.append(
                    f"{occurrence}: brokerage bo_num/datesign cannot stand in "
                    "for the depository agreement")

    account = maps.get("account-opening-notice") or {}
    block = next((item for item in account.get("wordFlowBlocks", []) or []
                  if item.get("id") == TRANSFER_BASIS_BLOCK), None)
    checks += 1
    if not block:
        failures.append(
            f"account-opening-notice: {TRANSFER_BASIS_BLOCK} is missing")
    else:
        refs = [run.get("fieldId") for run in block.get("runs", [])
                if run.get("type") == "fieldRef"]
        checks += 1
        if refs != TRANSFER_BASIS_REFS:
            failures.append(
                f"{TRANSFER_BASIS_BLOCK}: field refs must be exactly "
                f"{TRANSFER_BASIS_REFS!r}, got {refs!r}")

    return checks, failures


def blocking_sources(registry: dict) -> set[str]:
    """Sources whose business origin is still an open question."""
    return {path for path, alias in registry.get("aliases", {}).items()
            if alias.get("kind") in BLOCKING_ALIAS_KINDS}


def _with_live_bookkeeping(registry: dict, maps: dict) -> dict:
    """Clone registry metadata so an isolated test map starts internally fresh."""
    cloned = json.loads(json.dumps(registry))
    usage = sources_in(maps)
    aliases = cloned.get("aliases", {})
    for path, alias in aliases.items():
        alias["usedBy"] = usage.get(path, [])
    cloned["unregisteredSources"] = sorted(
        source for source in usage if source not in aliases)
    return cloned


def self_test(live_maps: dict) -> int:
    """Negative gates: each mutation below must be caught."""
    registry = load_registry()
    base_maps = {"t": {"fields": [{"id": "a", "source": "field.client-code"}]}}
    base_registry = _with_live_bookkeeping(registry, base_maps)

    cases = []

    bad = json.loads(json.dumps(base_registry))
    bad["aliases"]["field.client-code"]["umi"] = "umi.company.no_such_field"
    cases.append(("dangling alias target", bad, base_maps))

    invented_maps = {
        "t": {"fields": [{"id": "a", "source": "field.invented"}]}}
    cases.append(("unregistered source",
                  _with_live_bookkeeping(registry, invented_maps), invented_maps))

    nonexistent_maps = {
        "t": {"fields": [{"id": "a", "source": "umi.company.not_real"}]}}
    cases.append(("non-existent umi source",
                  _with_live_bookkeeping(registry, nonexistent_maps),
                  nonexistent_maps))

    bad2 = json.loads(json.dumps(base_registry))
    bad2["danglingAliasTargets"] = ["umi.company.x"]
    cases.append(("registry reports dangling", bad2, base_maps))

    stale_usage = json.loads(json.dumps(base_registry))
    stale_usage["aliases"]["field.client-code"]["usedBy"] = ["stale/field"]
    cases.append(("stale alias usedBy", stale_usage, base_maps))

    operator_maps = {
        "t": {"fields": [{"id": "a", "source": "extra.qa-operator-value"}]}}
    stale_unregistered = _with_live_bookkeeping(registry, operator_maps)
    stale_unregistered["unregisteredSources"] = []
    cases.append(("stale unregisteredSources", stale_unregistered, operator_maps))

    valid = json.loads(json.dumps(base_registry))
    valid["aliases"]["field.client-code"]["umi"] = \
        "umi.clientNumberGlobal.nomer_klienta"
    _, valid_failures = check(valid, base_maps)
    general_guard_ok = not valid_failures
    if not general_guard_ok:
        print("  FALSE POSITIVE: a real UMI field was rejected")
        for failure in valid_failures:
            print(f"      {failure}")

    passed = 0
    for label, reg, maps in cases:
        _, failures = check(reg, maps)
        if failures:
            passed += 1
        else:
            print(f"  NOT CAUGHT: {label}")

    # The focused depository policy must reject coordinated registry/map
    # mutations that generic bookkeeping alone could consider internally
    # consistent.
    depository_cases = []

    wrong_policy = json.loads(json.dumps(registry))
    wrong_policy["aliases"]["extra.extra-depository-contract"][
        "operatorInput"] = False
    depository_cases.append(("depository alias loses operatorInput",
                             wrong_policy, live_maps))

    umi_substitution = json.loads(json.dumps(registry))
    umi_substitution["aliases"]["extra.extra-depository-contract"][
        "umi"] = "umi.bo_num"
    depository_cases.append(("depository alias substitutes bo_num",
                             umi_substitution, live_maps))

    optional = json.loads(json.dumps(live_maps))
    next(field for field in optional["accession-application-fl"]["fields"]
         if field["id"] == "depositoryContractNumber")["required"] = False
    depository_cases.append(("depository occurrence becomes optional",
                             registry, optional))

    broker_source = json.loads(json.dumps(live_maps))
    next(field for field in broker_source["accession-application-yul"]["fields"]
         if field["id"] == "depositoryContractDate")["source"] = \
        "field.extra-contract-date"
    depository_cases.append(("depository occurrence substitutes datesign",
                             registry, broker_source))

    extra_occurrence = json.loads(json.dumps(live_maps))
    extra_occurrence["account-opening-notice"]["fields"].append({
        "id": "unexpectedDepositoryNumber",
        "source": "extra.extra-depository-contract",
        "required": True,
    })
    depository_cases.append(("unexpected fifth depository occurrence",
                             registry, extra_occurrence))

    missing_ref = json.loads(json.dumps(live_maps))
    transfer = next((block for block in
                     missing_ref["account-opening-notice"].get(
                         "wordFlowBlocks", [])
                     if block["id"] == TRANSFER_BASIS_BLOCK), None)
    if transfer:
        transfer["runs"] = [run for run in transfer["runs"]
                            if run.get("fieldId") !=
                            "transferBasisDepositoryDate"]
        transfer_label = "transfer basis loses depository date ref"
    else:
        # An explicit old snapshot can itself be missing the entire block. It
        # is still a valid negative fixture; self-test should report the stale
        # baseline, never crash while trying to mutate it.
        transfer_label = "transfer basis block is missing"
    depository_cases.append((transfer_label, registry, missing_ref))

    _, baseline_depository_failures = check_depository_completeness(
        registry, live_maps)
    depository_guard_ok = not baseline_depository_failures
    if not depository_guard_ok:
        print("  FALSE POSITIVE: live depository policy failed its baseline")
        for failure in baseline_depository_failures:
            print(f"      {failure}")

    depository_passed = 0
    for label, reg, maps in depository_cases:
        _, failures = check_depository_completeness(reg, maps)
        if failures:
            depository_passed += 1
        else:
            print(f"  NOT CAUGHT: {label}")

    total = len(cases)
    depository_total = len(depository_cases)
    ok = (passed == total and general_guard_ok and
          depository_passed == depository_total and depository_guard_ok)
    print(f"UMI registry self-test: {'PASS' if ok else 'FAIL'} · "
          f"{passed}/{total} registry negative gates + "
          f"{depository_passed}/{depository_total} depository negative gates "
          "+ 2 false-positive guards")
    return 0 if ok else 1


ORDER_FORMS_GAP_DOC = os.path.join(
    ROOT, "docs", "order-forms-mapping-gap.md")


def check_incomplete_order_forms(registry: dict, maps: dict) -> tuple[int, list[str]]:
    """Order forms may not pass as production-ready while mostly unmapped.

    Manual review found the withdrawal/order form generating almost entirely
    blank. The map exists and is partly right, so nothing else in the suite
    objected: every field is `optional`, so an absent value is not a failure,
    and a form that prints nothing still passes a check that only asks whether
    what *was* printed is correct. This asks the other question.
    """
    failures: list[str] = []
    checks = 0

    checks += 1
    if not os.path.exists(ORDER_FORMS_GAP_DOC):
        failures.append("docs/order-forms-mapping-gap.md is missing")

    template = maps.get("order-forms")
    if not template:
        return checks, failures

    fields = template.get("fields", [])
    checks += 1
    operator = [f for f in fields
                if str(f.get("source", "")).startswith(("extra.", "check."))]
    # If this ever drops far enough that the form really does fill itself, the
    # threshold is what has to be revisited — deliberately, not by accident.
    share = len(operator) / len(fields) if fields else 0
    if share < 0.5:
        failures.append(
            f"order-forms: only {len(operator)}/{len(fields)} fields are still "
            "operator input. If the mapping is finished, change the production "
            "status and delete this gate rather than leaving it passing.")
    return checks, failures


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--maps",
        help="explicit JSON map snapshot; omitted executes the live JS maps")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    maps = load_maps(args.maps)
    if args.self_test:
        return self_test(maps)

    registry = load_registry()
    checks, failures = check(registry, maps)
    depository_checks, depository_failures = check_depository_completeness(
        registry, maps)
    checks += depository_checks
    failures.extend(depository_failures)
    order_checks, order_failures = check_incomplete_order_forms(registry, maps)
    checks += order_checks
    failures.extend(order_failures)

    for failure in failures:
        print(f"  FAIL {failure}")

    print("Depository source policy: "
          f"{depository_checks - len(depository_failures)}/"
          f"{depository_checks} checks passed")
    fields = registry["fields"]
    mapped = sum(1 for f in fields if f["status"] == "mapped")
    print(f"UMI registry: {len(registry['structures'])} structures, "
          f"{len(fields)} exact fields ({mapped} mapped, "
          f"{len(fields) - mapped} available but unused)")
    blocking = sorted(blocking_sources(registry))
    if blocking:
        print(f"sources awaiting a business answer: {len(blocking)}")
        for path in blocking:
            print(f"    {path}")
    print(f"UMI registry gate: {checks - len(failures)}/{checks} checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
